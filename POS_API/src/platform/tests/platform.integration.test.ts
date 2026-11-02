import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import * as bcrypt from 'bcryptjs';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';

test('PB-03 store, OWNER, suspension, reset and access boundaries', { timeout: 120_000 }, async () => {
  const name = `pos_pb03_test_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  const testUrl = new URL(url);
  testUrl.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: testUrl.toString(),
    entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  process.env.PUBLIC_ORIGIN = 'http://localhost:5173';
  process.env.JWT_SECRET = 'j'.repeat(32);
  process.env.CSRF_SECRET = 'c'.repeat(32);
  process.env.BOOTSTRAP_ADMIN_USERNAME = 'admin';
  process.env.BOOTSTRAP_ADMIN_FULL_NAME = 'Quản trị';
  process.env.BOOTSTRAP_ADMIN_PASSWORD = 'test-admin-password-123';
  await dataSource.initialize();
  let created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    created = true;
    await db.initialize();
    await db.runMigrations();
    await bootstrapAdmin(db);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource).useValue(db).compile();
    const app = module.createNestApplication({ logger: false });
    try {
      await app.listen(0, '127.0.0.1');
      const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
      const login = async (username: string, password: string) => fetch(`${base}/auth/login`, {
        method: 'POST', headers: { Origin: process.env.PUBLIC_ORIGIN!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const adminLogin = await login('admin', process.env.BOOTSTRAP_ADMIN_PASSWORD!);
      assert.equal(adminLogin.status, 200);
      const adminCookies = adminLogin.headers.getSetCookie();
      const adminCookie = adminCookies.map(cookie => cookie.split(';')[0]).join('; ');
      const csrf = adminCookies.find(cookie => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1];
      const adminHeaders = { Cookie: adminCookie, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': csrf,
        'Content-Type': 'application/json' };
      const adminNoBodyHeaders = { Cookie: adminCookie, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': csrf };
      const createBody = { name: 'Cửa hàng thử', phone: '', owner: { username: ' OWNER1 ', fullName: 'Chủ thử' } };
      const badOrigin = await fetch(`${base}/platform/stores`, { method: 'POST',
        headers: { ...adminHeaders, Origin: 'https://invalid.example' }, body: JSON.stringify(createBody) });
      assert.equal(badOrigin.status, 403);
      const createdStore = await fetch(`${base}/platform/stores`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify(createBody) });
      assert.equal(createdStore.status, 201);
      const first = (await createdStore.json()).data;
      assert.equal(first.owner.username, 'owner1');
      assert.equal(first.owner.storeId, first.store.id);
      assert.equal(first.owner.mustChangePassword, true);
      assert.ok(first.temporaryPassword.length >= 12);
      assert.equal('passwordHash' in first.owner, false);
      assert.equal(first.store.phone, null);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM stores'))[0].count, 1);
      const invalid = await fetch(`${base}/platform/stores`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ ...createBody, owner: { ...createBody.owner, role: 'PLATFORM_ADMIN' } }) });
      assert.equal(invalid.status, 422);
      const invalidOwnerArray = await fetch(`${base}/platform/stores`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ ...createBody, owner: [] }) });
      assert.equal(invalidOwnerArray.status, 422);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM stores'))[0].count, 1);
      const badCsrf = await fetch(`${base}/platform/stores`, { method: 'POST',
        headers: { ...adminHeaders, 'X-CSRF-Token': 'invalid' }, body: JSON.stringify(createBody) });
      assert.equal(badCsrf.status, 403);
      const duplicate = await fetch(`${base}/platform/stores`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ ...createBody, owner: { ...createBody.owner, username: 'owner1' } }) });
      assert.equal(duplicate.status, 409);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM stores'))[0].count, 1);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM users WHERE store_id = $1', [first.store.id]))[0].count, 1);
      const ownerLogin = await login('owner1', first.temporaryPassword);
      assert.equal(ownerLogin.status, 200);
      const ownerCookies = ownerLogin.headers.getSetCookie();
      const ownerCookie = ownerCookies.map(cookie => cookie.split(';')[0]).join('; ');
      const ownerCsrf = ownerCookies.find(cookie => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1];
      const ownerSecondLogin = await login('owner1', first.temporaryPassword);
      assert.equal(ownerSecondLogin.status, 200);
      const ownerSecondCookie = ownerSecondLogin.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
      await db.query('UPDATE users SET must_change_password = false WHERE id = $1', [first.owner.id]);
      const denied = await fetch(`${base}/platform/stores`, { headers: { Cookie: ownerCookie } });
      assert.equal(denied.status, 403);
      assert.equal((await denied.json()).error.code, 'PERMISSION_DENIED');
      const addOwner = await fetch(`${base}/users`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ storeId: first.store.id, username: 'owner2', fullName: 'Chủ thứ hai' }) });
      assert.equal(addOwner.status, 201);
      const second = (await addOwner.json()).data;
      assert.equal((await db.query('SELECT count(*)::int AS count FROM users WHERE store_id = $1', [first.store.id]))[0].count, 2);
      const [testBranch] = await db.query(`INSERT INTO branches (id,store_id,code,name)
        VALUES (gen_random_uuid(),$1,'QA','QA') RETURNING id`, [first.store.id]);
      for (const role of ['MANAGER', 'CASHIER']) {
        await db.query('INSERT INTO roles (id,name) VALUES (gen_random_uuid(),$1) ON CONFLICT (name) DO NOTHING', [role]);
        await db.query(`INSERT INTO role_permissions (role_id,permission_id)
          SELECT r.id,p.id FROM roles r,permissions p WHERE r.name=$1 AND p.code='store.read' ON CONFLICT DO NOTHING`, [role]);
        await db.query(`INSERT INTO users (id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
          SELECT gen_random_uuid(),$1,$2,r.id,$3::text,$4,u.password_hash,false FROM roles r,users u
          WHERE r.name=$3::text AND u.id=$5`, [first.store.id,testBranch.id,role,role.toLowerCase(),first.owner.id]);
        const roleLogin = await login(role.toLowerCase(), first.temporaryPassword);
        assert.equal(roleLogin.status, 200);
        const roleCookie = roleLogin.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
        const roleDenied = await fetch(`${base}/platform/stores`, { headers: { Cookie: roleCookie } });
        assert.equal(roleDenied.status, 403);
        assert.equal((await roleDenied.json()).error.code, 'PERMISSION_DENIED');
      }
      const missingStoreId = randomUUID();
      const missingStore = await fetch(`${base}/users`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ storeId: missingStoreId, username: 'missing_owner', fullName: 'Chủ thiếu' }) });
      assert.equal(missingStore.status, 404);
      const invalidStore = await fetch(`${base}/users`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ storeId: 'invalid-id', username: 'invalid_owner', fullName: 'Chủ sai' }) });
      assert.equal(invalidStore.status, 422);
      const missingReset = await fetch(`${base}/users/${randomUUID()}/reset-password`, { method: 'POST', headers: adminNoBodyHeaders });
      assert.equal(missingReset.status, 404);
      const adminId = (await db.query("SELECT id FROM users WHERE username = 'admin'"))[0].id;
      const nonOwnerReset = await fetch(`${base}/users/${adminId}/reset-password`, { method: 'POST', headers: adminNoBodyHeaders });
      assert.equal(nonOwnerReset.status, 404);
      const anotherStoreResponse = await fetch(`${base}/platform/stores`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ name: 'Cửa hàng thứ hai', owner: { username: 'owner3', fullName: 'Chủ thứ ba' } }) });
      assert.equal(anotherStoreResponse.status, 201);
      const anotherStore = (await anotherStoreResponse.json()).data;
      const otherOwner = await fetch(`${base}/users`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ storeId: anotherStore.store.id, username: 'owner4', fullName: 'Chủ thứ tư' }) });
      assert.equal(otherOwner.status, 201);
      const otherOwnerData = (await otherOwner.json()).data;
      assert.equal(otherOwnerData.owner.storeId, anotherStore.store.id);
      assert.equal((await db.query('SELECT store_id FROM users WHERE id = $1', [otherOwnerData.owner.id]))[0].store_id,
        anotherStore.store.id);
      await db.query(`INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p WHERE r.name='OWNER' AND p.code='user.create_owner'
        ON CONFLICT DO NOTHING`);
      const ownerCrossStore = await fetch(`${base}/users`, { method: 'POST',
        headers: { ...adminHeaders, Cookie: ownerCookie, 'X-CSRF-Token': ownerCsrf },
        body: JSON.stringify({ storeId: anotherStore.store.id, username: 'cross_owner', fullName: 'Chủ sai quyền' }) });
      assert.equal(ownerCrossStore.status, 422);
      assert.equal((await ownerCrossStore.json()).error.code, 'VALIDATION_ERROR');
      assert.equal((await db.query("SELECT count(*)::int AS count FROM users WHERE username = 'cross_owner'"))[0].count, 0);
      const suspended = await fetch(`${base}/platform/stores/${first.store.id}/suspend`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ reason: 'Kiểm thử' }) });
      assert.equal(suspended.status, 200);
      assert.equal((await suspended.json()).data.store.status, 'SUSPENDED');
      assert.equal((await db.query(`SELECT count(*)::int AS count FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
        WHERE u.store_id = $1 AND rt.revoked_at IS NULL`, [first.store.id]))[0].count, 0);
      assert.equal((await login('owner1', first.temporaryPassword)).status, 401);
      assert.equal((await fetch(`${base}/auth/me`, { headers: { Cookie: ownerCookie } })).status, 401);
      assert.equal((await fetch(`${base}/auth/me`, { headers: { Cookie: ownerSecondCookie } })).status, 401);
      assert.equal((await fetch(`${base}/platform/stores/${first.store.id}/suspend`, { method: 'POST',
        headers: adminHeaders, body: JSON.stringify({ reason: 'Lặp' }) })).status, 409);
      const reset = await fetch(`${base}/users/${first.owner.id}/reset-password`, { method: 'POST', headers: adminNoBodyHeaders });
      assert.equal(reset.status, 200);
      const newPassword = (await reset.json()).data.temporaryPassword;
      assert.notEqual(newPassword, first.temporaryPassword);
      assert.equal(await bcrypt.compare(newPassword,
        (await db.query('SELECT password_hash FROM users WHERE id = $1', [first.owner.id]))[0].password_hash), true);
      const listed = await fetch(`${base}/users?role=OWNER`, { headers: { Cookie: adminCookie } });
      assert.equal(listed.status, 200);
      assert.equal((await listed.json()).data.length, 4);
      const firstPage = await fetch(`${base}/users?role=OWNER&limit=1`, { headers: { Cookie: adminCookie } });
      const firstPageBody = await firstPage.json();
      assert.equal(firstPageBody.data.length, 1);
      assert.equal(firstPageBody.meta.total, 4);
      const nextPage = await fetch(`${base}/users?role=OWNER&limit=1&cursor=${firstPageBody.meta.nextCursor}`, { headers: { Cookie: adminCookie } });
      assert.equal(nextPage.status, 200);
      const nextPageBody = await nextPage.json();
      assert.equal(nextPageBody.data.length, 1);
      assert.notEqual(nextPageBody.data[0].id, firstPageBody.data[0].id);
      assert.equal((await fetch(`${base}/platform/stores?cursor=${firstPageBody.meta.nextCursor}`,
        { headers: { Cookie: adminCookie } })).status, 422);
      for (const query of ['page=1', 'limit=0', 'limit=x', 'cursor=', 'cursor=invalid', 'sort=name']) {
        assert.equal((await fetch(`${base}/platform/stores?${query}`, { headers: { Cookie: adminCookie } })).status, 422);
      }
      const capped = await fetch(`${base}/platform/stores?limit=101`, { headers: { Cookie: adminCookie } });
      assert.equal((await capped.json()).meta.limit, 100);
      await db.query("UPDATE stores SET created_at = '2026-10-30T01:00:00.123456Z'");
      const storePageOne = await (await fetch(`${base}/platform/stores?limit=1`, { headers: { Cookie: adminCookie } })).json();
      assert.equal(storePageOne.meta.total, 2);
      const insertedBetweenPages = await fetch(`${base}/platform/stores`, { method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ name: 'Inserted later', owner: { username: 'later_owner', fullName: 'Later' } }) });
      assert.equal(insertedBetweenPages.status, 201);
      const storePageTwo = await (await fetch(`${base}/platform/stores?limit=1&cursor=${storePageOne.meta.nextCursor}`,
        { headers: { Cookie: adminCookie } })).json();
      assert.equal(storePageTwo.data.length, 1);
      assert.notEqual(storePageTwo.data[0].id, storePageOne.data[0].id);
      assert.equal(storePageTwo.meta.nextCursor, null);
      assert.equal(storePageTwo.meta.total, 3);
      const originalIds = [first.store.id, anotherStore.store.id].sort();
      assert.deepEqual([storePageOne.data[0].id, storePageTwo.data[0].id].sort(), originalIds);
      const simultaneous = await Promise.all([1, 2].map(() => fetch(`${base}/platform/stores`, {
        method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ name: 'Concurrent QA store', owner: { username: 'concurrent_owner', fullName: 'Concurrent' } }),
      })));
      assert.deepEqual(simultaneous.map(response => response.status).sort(), [201, 409]);
      assert.equal((await db.query("SELECT count(*)::int AS count FROM stores WHERE name='Concurrent QA store'"))[0].count, 1);
      const reopened = await fetch(`${base}/platform/stores/${first.store.id}/reactivate`, { method: 'POST', headers: adminNoBodyHeaders });
      assert.equal(reopened.status, 200);
      assert.equal((await fetch(`${base}/platform/stores/${first.store.id}/reactivate`, { method: 'POST',
        headers: adminNoBodyHeaders })).status, 409);
      assert.equal((await login('owner1', first.temporaryPassword)).status, 401);
      assert.equal((await login('owner1', newPassword)).status, 200);
      assert.equal((await fetch(`${base}/platform/stores`, { headers: { Cookie: adminCookie } })).status, 200);
      assert.equal((await fetch(`${base}/users?role=OWNER&extra=1`, { headers: { Cookie: adminCookie } })).status, 422);
      assert.equal((await fetch(`${base}/platform/stores?page=0`, { headers: { Cookie: adminCookie } })).status, 422);
      const secondLogin = await login('owner2', second.temporaryPassword);
      assert.equal(secondLogin.status, 200);
      const secondCookie = secondLogin.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
      assert.equal((await fetch(`${base}/users/${second.owner.id}/reset-password`, { method: 'POST', headers: adminNoBodyHeaders })).status, 200);
      assert.equal((await fetch(`${base}/auth/me`, { headers: { Cookie: secondCookie } })).status, 401);
      assert.equal((await db.query(`SELECT count(*)::int AS count FROM refresh_tokens
        WHERE user_id = $1 AND revoked_at IS NULL`, [second.owner.id]))[0].count, 0);
    } finally { await app.close(); }
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    if (dataSource.isInitialized) await dataSource.destroy();
  }
});
