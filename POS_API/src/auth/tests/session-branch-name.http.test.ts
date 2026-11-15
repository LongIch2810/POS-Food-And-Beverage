import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';

test('S10-11 L3 session branchName', { timeout: 180_000 }, async (t) => {
  const name = `pos_s10_session_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities,
    migrations: dataSource.options.migrations });
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
    await dataSource.query(`CREATE DATABASE "${name}"`); created = true;
    await db.initialize(); await db.runMigrations(); await bootstrapAdmin(db);
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DataSource).useValue(db).compile();
    const app = module.createNestApplication({ logger: false });
    try {
      await app.listen(0, '127.0.0.1');
      const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
      type Session = { cookie: string; csrf: string; user: Record<string, unknown> };
      const origin = process.env.PUBLIC_ORIGIN!;
      const request = async (session: Session, path: string, method = 'GET', body?: unknown) => {
        const response = await fetch(`${base}${path}`, { method, headers: { Cookie: session.cookie, Origin: origin,
          'X-CSRF-Token': session.csrf, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        return { status: response.status, json: await response.json() };
      };
      const login = async (username: string, pass: string): Promise<Session> => {
        const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: origin,
          'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: pass }) });
        assert.equal(response.status, 200);
        const cookies = response.headers.getSetCookie().map((value) => value.split(';')[0]);
        const json = await response.json();
        return { cookie: cookies.join('; '), csrf: cookies.find((value) => value.startsWith('__Host-pos_csrf='))!.slice(16),
          user: json.data.user };
      };
      const admin = await login('admin', password);
      const store = await request(admin, '/platform/stores', 'POST', { name: 'S10 A', owner: { username: 'owner_s', fullName: 'Owner S' } });
      assert.equal(store.status, 201);
      await db.query('UPDATE users SET must_change_password=false WHERE id=$1', [store.json.data.owner.id]);
      const owner = await login('owner_s', store.json.data.temporaryPassword);
      const branch = await request(owner, '/branches', 'POST', { code: 'BAC', name: 'Chi nhánh Bắc' });
      assert.equal(branch.status, 201);
      const staff = async (username: string, role: string) => {
        const res = await request(owner, '/users', 'POST', { username, fullName: username, role, branchId: branch.json.data.id });
        assert.equal(res.status, 201);
        await db.query('UPDATE users SET must_change_password=false WHERE id=$1', [res.json.data.user.id]);
        return login(username, res.json.data.temporaryPassword);
      };
      const manager = await staff('mgr_s', 'MANAGER');
      const cashier = await staff('cash_s', 'CASHIER');

      await t.test('ST2-AC1 login manager co branchName va 9 khoa', () => {
        assert.equal(manager.user.branchName, 'Chi nhánh Bắc');
        assert.deepEqual(Object.keys(manager.user).sort(),
          ['branchId', 'branchName', 'fullName', 'id', 'mustChangePassword', 'permissions', 'role', 'storeId', 'username']);
      });

      await t.test('ST2-AC2 me va refresh tra branchName', async () => {
        assert.equal((await request(manager, '/auth/me')).json.data.user.branchName, 'Chi nhánh Bắc');
        assert.equal((await request(cashier, '/auth/me')).json.data.user.branchName, 'Chi nhánh Bắc');
        const refreshed = await fetch(`${base}/auth/refresh`, { method: 'POST',
          headers: { Cookie: manager.cookie, Origin: origin, 'X-CSRF-Token': manager.csrf } });
        assert.equal(refreshed.status, 200);
        assert.equal((await refreshed.json()).data.user.branchName, 'Chi nhánh Bắc');
      });

      await t.test('ST2-AC3 owner va admin branchName null', async () => {
        assert.equal(owner.user.branchName, null);
        assert.equal(admin.user.branchName, null);
        assert.equal((await request(owner, '/auth/me')).json.data.user.branchName, null);
        assert.equal((await request(admin, '/auth/me')).json.data.user.branchName, null);
      });

      await t.test('ST2-AC4 doi ten chi nhanh me tra ten moi', async () => {
        await db.query('UPDATE branches SET name=$1 WHERE id=$2', ['Chi nhánh Bắc mới', branch.json.data.id]);
        assert.equal((await request(manager, '/auth/me')).json.data.user.branchName, 'Chi nhánh Bắc mới');
      });

      await t.test('ST2-AC5 api nghiep vu khong doi', async () => {
        assert.equal((await request(manager, '/ingredient-stocks')).status, 200);
      });
    } finally { await app.close(); }
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    if (dataSource.isInitialized) await dataSource.destroy();
  }
});
