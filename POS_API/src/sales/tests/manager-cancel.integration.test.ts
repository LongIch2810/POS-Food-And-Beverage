import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { dataSource } from '../../database/data-source';
import { AppModule } from '../../app.module';

// Permissions come only from role_permissions seeded by migrations (no manual grants for MANAGER).
test('[MGR-CANCEL] MANAGER cancels OPEN orders over HTTP within shift and branch scope', { timeout: 120_000 }, async t => {
  const name = `pos_mgr_cancel_${randomBytes(6).toString('hex')}`, url = new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Only a local sandbox is allowed');
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  await dataSource.initialize(); let app: any;
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`); await db.initialize(); await db.runMigrations();
    const store = randomUUID(), branchA = randomUUID(), branchB = randomUUID();
    const manager = randomUUID(), managerNoShift = randomUUID(), managerB = randomUUID(), cashierB = randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2)', [store, 'MGR cancel store']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4),($5,$2,$6,$7)', [branchA, store, 'MA', 'Branch A', branchB, 'MB', 'Branch B']);
    const password = 'Mgr-cancel-password-123', hash = await bcrypt.hash(password, 4);
    for (const [id, branch, role, username] of [[manager, branchA, 'MANAGER', 'mc_manager'], [managerNoShift, branchA, 'MANAGER', 'mc_manager_noshift'],
      [managerB, branchB, 'MANAGER', 'mc_manager_b'], [cashierB, branchB, 'CASHIER', 'mc_cashier_b']] as const)
      await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
        VALUES($1,$2,$3,(SELECT id FROM roles WHERE name=$4),$5,$5,$6,false)`, [id, store, branch, role, username, hash]);
    const origin = 'http://localhost:5173'; process.env.PUBLIC_ORIGIN = origin; process.env.JWT_SECRET = 'j'.repeat(32); process.env.CSRF_SECRET = 'c'.repeat(32);
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DataSource).useValue(db).compile();
    app = module.createNestApplication({ logger: false, rawBody: true }); await app.listen(0, '127.0.0.1');
    const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
    const login = async (username: string) => {
      const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      assert.equal(response.status, 200); const cookies = response.headers.getSetCookie().map(v => v.split(';')[0]);
      return { Cookie: cookies.join('; '), Origin: origin, 'X-CSRF-Token': cookies.find(v => v.startsWith('__Host-pos_csrf='))!.slice(16), 'Content-Type': 'application/json' };
    };
    const post = (path: string, headers: Record<string, string>, body: object) => fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) });
    const openShift = async (headers: Record<string, string>) => {
      const response = await post('/work-shifts', headers, { shiftType: 'CASHIER' });
      assert.equal(response.status, 201, `open CASHIER shift: ${await response.clone().text()}`);
    };
    const createOrder = async (headers: Record<string, string>) => {
      const response = await post('/invoices', headers, { orderType: 'TAKEAWAY' });
      assert.equal(response.status, 201, `create TAKEAWAY: ${await response.clone().text()}`);
      return ((await response.json()) as any).data.id as string;
    };
    const invoiceRow = async (id: string) => (await db.query('SELECT status,cancelled_by,cancel_reason FROM invoices WHERE id=$1', [id]))[0];
    const mh = await login('mc_manager');
    await openShift(mh);

    await t.test('[MGR-CANCEL-1] MANAGER with own CASHIER shift cancels own TAKEAWAY order', async () => {
      const id = await createOrder(mh);
      const response = await post(`/invoices/${id}/cancel`, mh, { reason: 'Khách đổi ý' });
      assert.equal(response.status, 200, await response.clone().text());
      assert.equal(((await response.json()) as any).data.status, 'CANCELLED');
      assert.deepEqual(await invoiceRow(id), { status: 'CANCELLED', cancelled_by: manager, cancel_reason: 'Khách đổi ý' });
    });

    await t.test('[MGR-CANCEL-2] MANAGER without an OPEN CASHIER shift gets 409 SHIFT_NOT_OPEN and nothing changes', async () => {
      const id = await createOrder(mh);
      const response = await post(`/invoices/${id}/cancel`, await login('mc_manager_noshift'), { reason: 'Thử hủy' });
      assert.equal(response.status, 409);
      assert.equal(((await response.json()) as any).error.code, 'SHIFT_NOT_OPEN');
      assert.deepEqual(await invoiceRow(id), { status: 'OPEN', cancelled_by: null, cancel_reason: null });
    });

    await t.test('[MGR-CANCEL-3] MANAGER of another branch (own shift there, no branch.access_all) gets 404 and nothing changes', async () => {
      const id = await createOrder(mh);
      const bh = await login('mc_manager_b'); await openShift(bh);
      const response = await post(`/invoices/${id}/cancel`, bh, { reason: 'Thử hủy' });
      assert.equal(response.status, 404);
      assert.equal(((await response.json()) as any).error.code, 'NOT_FOUND');
      assert.deepEqual(await invoiceRow(id), { status: 'OPEN', cancelled_by: null, cancel_reason: null });
    });

    await t.test('[MGR-CANCEL-4] role without invoice.cancel_open gets 403 and nothing changes', async () => {
      // Isolated test DB: revoke the CASHIER grant to model a role without the permission, then restore it.
      const ch = await login('mc_cashier_b');
      const id = await createOrder(mh);
      // TypeORM's postgres driver returns [rows, affectedCount] for DELETE ... RETURNING.
      const [revoked] = await db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='CASHIER')
        AND permission_id=(SELECT id FROM permissions WHERE code='invoice.cancel_open') RETURNING role_id,permission_id`);
      assert.equal(revoked.length, 1, 'precondition: CASHIER had invoice.cancel_open');
      try {
        const response = await post(`/invoices/${id}/cancel`, ch, { reason: 'Thử hủy' });
        assert.equal(response.status, 403);
        assert.deepEqual(await invoiceRow(id), { status: 'OPEN', cancelled_by: null, cancel_reason: null });
      } finally {
        await db.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2)', [revoked[0].role_id, revoked[0].permission_id]);
      }
    });
  } finally {
    if (app) await app.close();
    if (db.isInitialized) await db.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`); await dataSource.destroy();
  }
});
