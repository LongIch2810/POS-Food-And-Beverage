import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import * as bcrypt from 'bcryptjs';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';

test('PB-04 organization and staff HTTP with PostgreSQL', { timeout: 180_000 }, async (t) => {
  const name = `pos_pb04_test_${randomBytes(6).toString('hex')}`;
  const testUrl = new URL(process.env.DATABASE_URL!);
  testUrl.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: testUrl.toString(),
    entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  process.env.PUBLIC_ORIGIN = 'http://localhost:5173';
  process.env.JWT_SECRET = 'j'.repeat(32);
  process.env.CSRF_SECRET = 'c'.repeat(32);
  process.env.BOOTSTRAP_ADMIN_USERNAME = 'admin';
  process.env.BOOTSTRAP_ADMIN_FULL_NAME = 'QA Admin';
  const password = randomBytes(18).toString('base64url');
  process.env.BOOTSTRAP_ADMIN_PASSWORD = password;
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
      type Session = { cookie: string; csrf: string };
      const request = async (session: Session, path: string, method = 'GET', body?: unknown) => {
        const response = await fetch(`${base}${path}`, { method, headers: {
          Cookie: session.cookie, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': session.csrf,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        const json = response.status === 204 ? undefined : await response.json();
        t.diagnostic(JSON.stringify({ kind: 'HTTP', method, path, status: response.status,
          requestId: response.headers.get('X-Request-Id'), errorCode: json?.error?.code,
          resourceId: json?.data?.id ?? json?.data?.user?.id, role: json?.data?.role ?? json?.data?.user?.role,
          branchId: json?.data?.branchId ?? json?.data?.user?.branchId, isActive: json?.data?.isActive ?? json?.data?.user?.isActive,
          mustChangePassword: json?.data?.mustChangePassword ?? json?.data?.user?.mustChangePassword,
          ...(Array.isArray(json?.data) ? { count: json.data.length, meta: json.meta } : {}) }));
        return { status: response.status, json };
      };
      const login = async (username: string, pass: string): Promise<Session> => {
        const response = await fetch(`${base}/auth/login`, { method: 'POST',
          headers: { Origin: process.env.PUBLIC_ORIGIN!, 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password: pass }) });
        assert.equal(response.status, 200, 'fixture login');
        const cookies = response.headers.getSetCookie().map(value => value.split(';')[0]);
        return { cookie: cookies.join('; '), csrf: cookies.find(value => value.startsWith('__Host-pos_csrf='))!.slice(16) };
      };
      const admin = await login('admin', password);
      const first = await request(admin, '/platform/stores', 'POST', {
        name: 'PB04 QA A', owner: { username: 'owner_a', fullName: 'QA Owner A' },
      });
      assert.equal(first.status, 201);
      const second = await request(admin, '/platform/stores', 'POST', {
        name: 'PB04 QA B', owner: { username: 'owner_b', fullName: 'QA Owner B' },
      });
      assert.equal(second.status, 201);
      const owner = await login('owner_a', first.json.data.temporaryPassword);
      const other = await login('owner_b', second.json.data.temporaryPassword);
      await db.query('UPDATE users SET must_change_password=false WHERE id IN ($1,$2)',
        [first.json.data.owner.id, second.json.data.owner.id]);
      let branchId = '';
      let otherBranchId = '';
      let tableId = '';
      let staffId = '';
      let staffPassword = '';
      let manager: Session;
      const snapshots = async (id: string) => (await db.query(`SELECT u.role_id,u.is_active,u.must_change_password,
        (SELECT count(*)::int FROM refresh_tokens rt WHERE rt.user_id=u.id AND rt.revoked_at IS NULL) AS sessions
        FROM users u WHERE u.id=$1`, [id]))[0];

      await t.test('ORG-01 BR-55/76/103 create branches, money and immutable code', async () => {
        const before = (await db.query('SELECT count(*)::int AS n FROM branches'))[0].n;
        const result = await request(owner, '/branches', 'POST', { code: ' NL ', name: ' Nam Ly ', initialCash: 0 });
        assert.equal(result.status, 201);
        branchId = result.json.data.id;
        assert.equal(result.json.data.storeId, first.json.data.store.id);
        assert.equal(result.json.data.code, 'NL');
        assert.equal(result.json.data.name, 'Nam Ly');
        assert.equal(result.json.data.initialCash, 0);
        const afterCreate = (await db.query('SELECT count(*)::int AS n FROM branches'))[0].n;
        assert.equal(afterCreate, before + 1);
        t.diagnostic(JSON.stringify({ case: 'ORG-01', db: 'branches count before/after create', before, after: afterCreate }));
        const otherResult = await request(other, '/branches', 'POST', { code: 'NL', name: 'Nam Ly' });
        assert.equal(otherResult.status, 201);
        otherBranchId = otherResult.json.data.id;
        for (const initialCash of [-1, 0.1, 1000000000001, '100', null]) {
          assert.equal((await request(owner, `/branches/${branchId}`, 'PATCH', { initialCash })).status, 422);
        }
        const cashBefore = (await db.query('SELECT initial_cash FROM branches WHERE id=$1', [branchId]))[0].initial_cash;
        assert.equal((await request(owner, `/branches/${branchId}`, 'PATCH', { initialCash: 1000000000000 })).status, 200);
        const cashAfter = (await db.query('SELECT initial_cash FROM branches WHERE id=$1', [branchId]))[0].initial_cash;
        assert.equal(cashAfter, '1000000000000');
        t.diagnostic(JSON.stringify({ case: 'ORG-01', db: 'initial_cash before/after patch', before: cashBefore, after: cashAfter }));
        for (const patch of [{}, { code: 'DH' }, { storeId: second.json.data.store.id }, { name: null }, { isActive: 'false' }]) {
          assert.equal((await request(owner, `/branches/${branchId}`, 'PATCH', patch)).status, 422);
        }
        assert.equal((await request(owner, `/branches/${otherBranchId}`, 'PATCH', { name: 'Cross' })).status, 404);
        const updates = await Promise.all([
          request(owner, `/branches/${branchId}`, 'PATCH', { phone: '0900' }),
          request(owner, `/branches/${branchId}`, 'PATCH', { address: 'QA' }),
        ]);
        assert.deepEqual(updates.map(value => value.status), [200, 200]);
        const stored = (await db.query('SELECT phone,address FROM branches WHERE id=$1', [branchId]))[0];
        assert.deepEqual(stored, { phone: '0900', address: 'QA' });
        const duplicate = await Promise.all([1, 2].map(() => request(owner, '/branches', 'POST', { code: 'DH', name: 'Dong Hoi' })));
        assert.deepEqual(duplicate.map(value => value.status).sort(), [201, 409]);
        assert.equal((await request(owner, '/branches', 'POST', { code: 'nl', name: 'nam ly' })).status, 201);
      });

      await t.test('ORG-02 BR-70/71/95/99 table schema, scope and nullable fields', async () => {
        assert.ok(branchId, 'ORG-01 fixture');
        assert.equal((await request(owner, `/branches/${branchId}`, 'PATCH', { isActive: false })).status, 200);
        const result = await request(owner, '/dining-tables', 'POST', { branchId, name: ' Ban 1 ', capacity: null });
        assert.equal(result.status, 201);
        tableId = result.json.data.id;
        assert.equal(result.json.data.name, 'Ban 1');
        assert.equal(result.json.data.capacity, null);
        assert.equal('occupied' in result.json.data, false);
        const columns = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='dining_tables'");
        assert.equal(columns.some((row: { column_name: string }) => ['status', 'occupied'].includes(row.column_name)), false);
        t.diagnostic(JSON.stringify({ case: 'ORG-02', db: 'dining_tables columns', columns }));
        for (const capacity of [0, -1, 1.5, '4', 2147483648]) {
          assert.equal((await request(owner, `/dining-tables/${tableId}`, 'PATCH', { capacity })).status, 422);
        }
        assert.equal((await request(owner, `/dining-tables/${tableId}`, 'PATCH', { capacity: 4, area: 'Tang 1' })).status, 200);
        const cleared = await request(owner, `/dining-tables/${tableId}`, 'PATCH', { capacity: null, area: '' });
        assert.equal(cleared.json.data.area, null);
        assert.equal(cleared.json.data.capacity, null);
        assert.equal((await request(owner, `/dining-tables/${tableId}`, 'PATCH', { branchId: otherBranchId })).status, 422);
        assert.equal((await request(owner, '/dining-tables', 'POST', { branchId: otherBranchId, name: 'Cross' })).status, 404);
        assert.equal((await request(other, `/dining-tables/${tableId}`, 'PATCH', { name: 'Cross' })).status, 404);
        assert.equal((await request(owner, '/dining-tables', 'POST', { branchId, name: 'Ban 1' })).status, 409);
        const duplicate = await Promise.all([1, 2].map(() => request(owner, '/dining-tables', 'POST', { branchId, name: 'Ban 2' })));
        assert.deepEqual(duplicate.map(value => value.status).sort(), [201, 409]);
      });

      await t.test('USR-01 BR-01/70/83/84/97 create staff and change password first', async () => {
        const result = await request(owner, '/users', 'POST', { branchId, role: 'MANAGER', username: ' STAFF ', fullName: 'QA Staff' });
        assert.equal(result.status, 201);
        staffId = result.json.data.user.id;
        staffPassword = result.json.data.temporaryPassword;
        assert.equal(result.json.data.user.username, 'staff');
        assert.equal(result.json.data.user.branchId, branchId);
        assert.equal(result.json.data.user.mustChangePassword, true);
        assert.ok(staffPassword.length >= 12);
        const [row] = await db.query('SELECT password_hash FROM users WHERE id=$1', [staffId]);
        assert.equal(await bcrypt.compare(staffPassword, row.password_hash), true);
        t.diagnostic(JSON.stringify({ case: 'USR-01', passwordStoredAsHash: row.password_hash !== staffPassword,
          temporaryPasswordMatchesHash: await bcrypt.compare(staffPassword, row.password_hash) }));
        assert.equal('passwordHash' in result.json.data.user, false);
        const session = await login('staff', staffPassword);
        const denied = await request(session, '/dining-tables');
        assert.equal(denied.status, 403);
        assert.equal(denied.json.error.code, 'PASSWORD_CHANGE_REQUIRED');
        const nextPassword = randomBytes(18).toString('base64url');
        assert.equal((await request(session, '/auth/change-password', 'POST', { newPassword: nextPassword })).status, 204);
        assert.equal((await request(session, '/auth/me')).status, 401);
        staffPassword = nextPassword;
        manager = await login('staff', staffPassword);
        for (const input of [
          { branchId, role: 'OWNER', username: 'bad1', fullName: 'QA' },
          { branchId, role: 'CASHIER', username: 'bad2', fullName: 'QA', storeId: first.json.data.store.id },
          { branchId: otherBranchId, role: 'CASHIER', username: 'bad3', fullName: 'QA' },
        ]) assert.ok([404, 422].includes((await request(owner, '/users', 'POST', input)).status));
        const duplicate = await Promise.all([' DUPE ', 'dupe'].map(username => request(owner, '/users', 'POST', {
          branchId, role: 'CASHIER', username, fullName: 'QA Duplicate',
        })));
        assert.deepEqual(duplicate.map(value => value.status).sort(), [201, 409]);
      });

      await t.test('ORG-03 BR-05/71/81 real endpoint permissions and manager branch boundary', async () => {
        assert.ok(manager, 'USR-01 fixture');
        const branches = await request(manager, '/branches');
        assert.equal(branches.status, 200);
        assert.deepEqual(branches.json.data.map((row: { id: string }) => row.id), [branchId]);
        const ignored = await request(manager, '/dining-tables?branchId=invalid');
        assert.equal(ignored.status, 200);
        assert.equal(ignored.json.data.every((row: { branchId: string }) => row.branchId === branchId), true);
        assert.equal((await request(manager, '/dining-tables', 'POST', { name: 'Manager Table' })).status, 201);
        assert.equal((await request(manager, '/dining-tables', 'POST', { branchId, name: 'Bad' })).status, 422);
        const otherTable = await request(other, '/dining-tables', 'POST', { branchId: otherBranchId, name: 'Other' });
        assert.equal((await request(manager, `/dining-tables/${otherTable.json.data.id}`, 'PATCH', { name: 'Bad' })).status, 404);
        assert.equal((await request(manager, '/users')).status, 403);
        await db.query(`INSERT INTO role_permissions(role_id,permission_id)
          SELECT r.id,p.id FROM roles r,permissions p WHERE r.name='PLATFORM_ADMIN'
          AND p.code IN ('table.manage','branch.manage','branch.read','user.manage') ON CONFLICT DO NOTHING`);
        for (const path of ['/branches', '/dining-tables']) assert.equal((await request(admin, path)).status, 403);
        assert.equal((await request(admin, `/users/${staffId}/reset-password`, 'POST')).status, 404);
        assert.equal((await request(owner, `/users/${second.json.data.owner.id}`, 'PATCH', { isActive: false })).status, 404);
        assert.equal((await request(owner, '/users?role=OWNER')).status, 422);
        const csrf = await fetch(`${base}/branches`, { method: 'POST', headers: {
          Cookie: owner.cookie, Origin: process.env.PUBLIC_ORIGIN!, 'Content-Type': 'application/json',
        }, body: JSON.stringify({ code: 'XX', name: 'Bad CSRF' }) });
        assert.equal(csrf.status, 403);
      });

      await t.test('USR-HIER BR-06/83 misplaced permission cannot grant peer role or disable/demote self', async () => {
        await db.query(`INSERT INTO role_permissions(role_id,permission_id)
          SELECT r.id,p.id FROM roles r,permissions p WHERE r.name='MANAGER' AND p.code='user.manage' ON CONFLICT DO NOTHING`);
        try {
          const granted = await request(manager, '/users', 'POST', { branchId, role: 'MANAGER', username: 'peer_bad', fullName: 'QA Peer' });
          assert.equal(granted.status, 403, 'MANAGER cannot grant MANAGER even with user.manage');
          assert.equal((await request(manager, `/users/${staffId}`, 'PATCH', { isActive: false })).status, 403);
          assert.equal((await request(manager, `/users/${staffId}`, 'PATCH', { role: 'CASHIER' })).status, 403);
          assert.equal((await request(manager, `/users/${staffId.toUpperCase()}`, 'PATCH', { isActive: false })).status, 403);
          assert.equal((await request(manager, `/users/${staffId.toUpperCase()}`, 'PATCH', { role: 'CASHIER' })).status, 403);
          const [cashier] = await db.query("SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE u.store_id=$1 AND r.name='CASHIER' LIMIT 1", [first.json.data.store.id]);
          assert.equal((await request(manager, `/users/${cashier.id}`, 'PATCH', { role: 'MANAGER' })).status, 403);
          assert.equal((await snapshots(staffId)).is_active, true);
          assert.equal((await db.query("SELECT count(*)::int AS n FROM users WHERE username='peer_bad'"))[0].n, 0);
        } finally {
          await db.query("UPDATE users SET is_active=true,role_id=(SELECT id FROM roles WHERE name='MANAGER') WHERE id=$1", [staffId]);
          manager = await login('staff', staffPassword);
          await db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='MANAGER')
            AND permission_id=(SELECT id FROM permissions WHERE code='user.manage')`);
        }
      });

      await t.test('USR-02 BR-02/03/06 role change and lock revoke all sessions; reset retains lock', async () => {
        const deviceA = await login('staff', staffPassword);
        const deviceB = await login('staff', staffPassword);
        const beforeRoleChange = await snapshots(staffId);
        assert.equal((await request(owner, `/users/${staffId}`, 'PATCH', { role: 'CASHIER' })).status, 200);
        assert.equal((await snapshots(staffId)).sessions, 0);
        t.diagnostic(JSON.stringify({ case: 'USR-02', db: 'before/after role change', before: beforeRoleChange, after: await snapshots(staffId) }));
        for (const session of [deviceA, deviceB]) assert.equal((await request(session, '/auth/me')).status, 401);
        const cashier = await login('staff', staffPassword);
        assert.equal((await request(cashier, '/dining-tables')).status, 200, 'CASHIER can read tables without table.manage');
        assert.equal((await request(owner, `/users/${staffId}`, 'PATCH', { role: 'CASHIER' })).status, 200);
        assert.equal((await request(cashier, '/auth/me')).status, 200, 'no-op preserves session');
        assert.equal((await request(owner, `/users/${staffId}`, 'PATCH', { isActive: false })).status, 200);
        assert.equal((await request(cashier, '/auth/me')).status, 401);
        const reset = await request(owner, `/users/${staffId}/reset-password`, 'POST');
        assert.equal(reset.status, 200);
        assert.equal(reset.json.data.user.isActive, false);
        assert.equal(reset.json.data.user.mustChangePassword, true);
        const oldHashValid = await bcrypt.compare(staffPassword,
          (await db.query('SELECT password_hash FROM users WHERE id=$1', [staffId]))[0].password_hash);
        assert.equal(oldHashValid, false);
        assert.equal((await request(owner, `/users/${staffId}`, 'PATCH', { isActive: true })).status, 200);
        assert.equal((await request(cashier, '/auth/me')).status, 401);
        const fresh = await login('staff', reset.json.data.temporaryPassword);
        staffPassword = reset.json.data.temporaryPassword;
        assert.equal((await request(fresh, '/dining-tables')).json.error.code, 'PASSWORD_CHANGE_REQUIRED');
        assert.equal((await request(other, '/auth/me')).status, 200, 'other store session preserved');
      });

      await t.test('USR-03 transaction rollback keeps user and sessions unchanged', async () => {
        const before = await snapshots(staffId);
        await db.query(`CREATE FUNCTION reject_pb04_revoke() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'PB04 injected rollback'; END $$`);
        await db.query('CREATE TRIGGER reject_pb04_revoke BEFORE UPDATE ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION reject_pb04_revoke()');
        try {
          assert.equal((await request(owner, `/users/${staffId}`, 'PATCH', { role: 'MANAGER' })).status, 500);
          assert.deepEqual(await snapshots(staffId), before);
          t.diagnostic(JSON.stringify({ case: 'USR-03', db: 'rollback preserves user/sessions', before, after: await snapshots(staffId) }));
          const [hashBefore] = await db.query('SELECT password_hash FROM users WHERE id=$1', [staffId]);
          assert.equal((await request(owner, `/users/${staffId}/reset-password`, 'POST')).status, 500);
          assert.equal((await db.query('SELECT password_hash=$2 AS same FROM users WHERE id=$1',
            [staffId, hashBefore.password_hash]))[0].same, true);
          assert.deepEqual(await snapshots(staffId), before);
        } finally {
          await db.query('DROP TRIGGER reject_pb04_revoke ON refresh_tokens');
          await db.query('DROP FUNCTION reject_pb04_revoke()');
        }
      });

      await t.test('ORG-04 stable cursor, filters, malformed input and schema replay', async () => {
        const list = await request(owner, '/branches?limit=1');
        assert.equal(list.status, 200);
        assert.ok(list.json.meta.nextCursor);
        const next = await request(owner, `/branches?limit=1&cursor=${list.json.meta.nextCursor}`);
        assert.equal(next.status, 200);
        assert.notEqual(next.json.data[0].id, list.json.data[0].id);
        assert.equal(next.json.meta.total, list.json.meta.total);
        assert.equal((await request(other, `/branches?cursor=${list.json.meta.nextCursor}`)).status, 422);
        assert.equal((await request(owner, `/branches?isActive=true&cursor=${list.json.meta.nextCursor}`)).status, 422);
        for (const query of ['limit=0', 'cursor=', 'sort=name', 'page=1', 'isActive=1']) {
          assert.equal((await request(owner, `/branches?${query}`)).status, 422);
        }
        assert.equal((await request(owner, '/dining-tables?branchId=' + otherBranchId)).status, 404);
        assert.equal((await request(owner, '/branches', 'POST', null)).status, 400, 'Express strict JSON rejects scalar before DTO');
        for (const body of [[], {}, { name: 'Bad' }]) assert.equal((await request(owner, '/branches', 'POST', body)).status, 422);
        assert.equal((await request(owner, '/branches/bad', 'PATCH', { name: 'Bad' })).status, 422);
        assert.equal((await request(owner, '/users')).json.data.every((row: { role: string }) => ['MANAGER', 'CASHIER'].includes(row.role)), true);
        assert.equal((await db.runMigrations()).length, 0);
      });

      await t.test('USR-04 login/refresh racing role change cannot retain old privileges', async () => {
        await db.query('UPDATE users SET must_change_password=false WHERE id=$1', [staffId]);
        const session = await login('staff', staffPassword);
        const [refresh, changed] = await Promise.all([
          request(session, '/auth/refresh', 'POST'),
          request(owner, `/users/${staffId}`, 'PATCH', { role: 'MANAGER' }),
        ]);
        assert.ok([200, 401].includes(refresh.status));
        assert.equal(changed.status, 200);
        assert.equal((await snapshots(staffId)).sessions, 0);
        assert.equal((await request(session, '/auth/me')).status, 401);
        t.diagnostic(JSON.stringify({ case: 'USR-04', race: 'refresh/role change', refreshStatus: refresh.status,
          rolePatchStatus: changed.status, db: await snapshots(staffId) }));
        const [newSession, locked] = await Promise.all([
          fetch(`${base}/auth/login`, { method: 'POST', headers: {
            Origin: process.env.PUBLIC_ORIGIN!, 'Content-Type': 'application/json',
          }, body: JSON.stringify({ username: 'staff', password: staffPassword }) }),
          request(owner, `/users/${staffId}`, 'PATCH', { isActive: false }),
        ]);
        assert.ok([200, 401].includes(newSession.status));
        assert.equal(locked.status, 200);
        assert.equal((await snapshots(staffId)).sessions, 0);
      });

      await t.test('ORG-05 unsupported JSON Content-Type returns 400 before DTO validation', async () => {
        for (const [path, method, body] of [
          ['/branches', 'POST', { code: 'CT', name: 'Wrong Content Type' }],
          [`/branches/${branchId}`, 'PATCH', { name: 'Wrong Content Type' }],
          ['/dining-tables', 'POST', { branchId, name: 'Wrong Content Type' }],
          [`/dining-tables/${tableId}`, 'PATCH', { name: 'Wrong Content Type' }],
          ['/users', 'POST', { branchId, username: 'wrong_content', fullName: 'QA', role: 'CASHIER' }],
          [`/users/${staffId}`, 'PATCH', { role: 'CASHIER' }],
        ] as const) {
          const response = await fetch(`${base}${path}`, { method, headers: {
            Cookie: owner.cookie, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': owner.csrf,
            'Content-Type': 'text/plain',
          }, body: JSON.stringify(body) });
          assert.equal(response.status, 400, `${method} ${path}`);
          const error = (await response.json()).error;
          assert.equal(error.code, 'BAD_REQUEST');
          t.diagnostic(JSON.stringify({ case: 'ORG-05', method, path, status: response.status,
            errorCode: error.code, requestId: response.headers.get('X-Request-Id') }));
        }
      });
    } finally { await app.close(); }
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});
