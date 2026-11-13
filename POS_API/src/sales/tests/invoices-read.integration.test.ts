import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../app.module';
import { dataSource } from '../../database/data-source';
import { InvoiceReadScope20261114000000 } from '../../database/migrations/20261114000000-InvoiceReadScope';

test('Invoice read scope over HTTP', { timeout: 180_000 }, async (t) => {
  const database = `pos_invoice_read_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  url.pathname = `/${database}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  const origin = 'http://localhost:5173';
  process.env.PUBLIC_ORIGIN = origin;
  process.env.JWT_SECRET = 'j'.repeat(32);
  process.env.CSRF_SECRET = 'c'.repeat(32);
  const password = randomBytes(18).toString('base64url');
  await dataSource.initialize();
  let app: any;
  let created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${database}"`);
    created = true;
    await db.initialize();
    await db.runMigrations();
    const store = randomUUID(), otherStore = randomUUID(), branch = randomUUID(), branch2 = randomUUID(), otherBranch = randomUUID(), a = randomUUID(), b = randomUUID();
    const manager = randomUUID(), owner = randomUUID(), noBranch = randomUUID(), admin = randomUUID(), otherCashier = randomUUID();
    const shiftA = randomUUID(), oldA = randomUUID(), oldB = randomUUID(), shift2 = randomUUID(), shiftOther = randomUUID();
    const invoiceA = randomUUID(), invoiceOldA = randomUUID(), invoiceB = randomUUID(), invoice2 = randomUUID(), invoiceOther = randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2),($3,$4)', [store, 'Read scope', otherStore, 'Other store']);
    await db.query('INSERT INTO branches(id,store_id,code,name,initial_cash) VALUES($1,$2,$3,$4,0),($5,$2,$6,$7,0),($8,$9,$10,$11,0)', [branch, store, 'READ', 'Read branch', branch2, 'READ2', 'Read branch 2', otherBranch, otherStore, 'OTHER', 'Other branch']);
    const hash = await bcrypt.hash(password, 4);
    for (const [id, username] of [[a, 'read_cashier_a'], [b, 'read_cashier_b']]) {
      await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
        VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),$4,$4,$5,false)`, [id, store, branch, username, hash]);
    }
    for (const [id, userStore, userBranch, role, username] of [[manager, store, branch, 'MANAGER', 'read_manager'], [owner, store, branch, 'OWNER', 'read_owner'], [noBranch, store, null, 'CASHIER', 'read_no_branch'], [admin, null, null, 'PLATFORM_ADMIN', 'read_admin'], [otherCashier, otherStore, otherBranch, 'CASHIER', 'read_other_cashier']]) {
      await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
        VALUES($1,$2,$3,(SELECT id FROM roles WHERE name=$4),$5,$5,$6,false)`, [id, userStore, userBranch, role, username, hash]);
    }
    // M-31: leave a margin between database and Node clocks.
    for (const [id, user, status, shiftBranch] of [[shiftA, a, 'OPEN', branch], [oldA, a, 'CLOSED', branch], [oldB, b, 'CLOSED', branch], [shift2, owner, 'CLOSED', branch2], [shiftOther, otherCashier, 'CLOSED', otherBranch]]) {
      await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,started_at,ended_at,status)
        VALUES($1,$2,$3,'CASHIER',now()-interval '1 minute',CASE WHEN $4='CLOSED' THEN now() ELSE NULL END,$4)`, [id, shiftBranch, user, status]);
    }
    for (const [id, shift, user, code, status, invoiceBranch] of [[invoiceA, shiftA, a, 'HDREAD0001', 'OPEN', branch], [invoiceOldA, oldA, a, 'HDREAD0002', 'PAID', branch], [invoiceB, oldB, b, 'HDREAD0003', 'OPEN', branch], [invoice2, shift2, owner, 'HDREAD0004', 'OPEN', branch2], [invoiceOther, shiftOther, otherCashier, 'HDREAD0005', 'OPEN', otherBranch]]) {
      await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,invoice_code,created_by,order_type,status)
        VALUES($1,$2,$3,$4,$5,'TAKEAWAY',$6)`, [id, invoiceBranch, shift, code, user, status]);
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DataSource).useValue(db).compile();
    app = module.createNestApplication({ logger: false, rawBody: true });
    await app.listen(0, '127.0.0.1');
    const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
    const login = async (username: string) => {
      const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      assert.equal(response.status, 200);
      return { Cookie: response.headers.getSetCookie().map(v => v.split(';')[0]).join('; ') };
    };
    await t.test('[T1-own] cashier reads only invoices from their own open and closed shifts', async () => {
      const headers = await login('read_cashier_a');
      const list = await fetch(`${base}/invoices`, { headers });
      assert.equal(list.status, 200);
      const body: any = await list.json();
      assert.deepEqual(body.data.map((row: any) => row.id), [invoiceA]);
      assert.equal(body.meta.total, 1);
      assert.equal((await fetch(`${base}/invoices/${invoiceB}`, { headers })).status, 404);
      assert.equal((await fetch(`${base}/invoices/${invoiceOldA}`, { headers })).status, 200);
    });
    // M-1, M-10, M-30: exercise scoped endpoints and error order through real authentication.
    await t.test('[T1-scope] manager branch, owner store, missing branch and permission are enforced', async () => {
      const managerHeaders = await login('read_manager');
      const managerList = await fetch(`${base}/invoices?branchId=${branch2}`, { headers: managerHeaders });
      assert.equal(managerList.status, 200);
      const managerBody: any = await managerList.json();
      assert.deepEqual(managerBody.data.map((row: any) => row.id).sort(), [invoiceA, invoiceB].sort());
      assert.equal((await fetch(`${base}/invoices/${invoiceB}`, { headers: managerHeaders })).status, 200);
      assert.equal((await fetch(`${base}/invoices/${invoice2}`, { headers: managerHeaders })).status, 404);
      const ownerHeaders = await login('read_owner');
      const ownerList = await fetch(`${base}/invoices`, { headers: ownerHeaders });
      assert.equal(ownerList.status, 200);
      const ownerBody: any = await ownerList.json();
      assert.deepEqual(ownerBody.data.map((row: any) => row.id).sort(), [invoiceA, invoiceB, invoice2].sort());
      const selectedBranch = await fetch(`${base}/invoices?branchId=${branch2.toUpperCase()}`, { headers: ownerHeaders });
      const selectedBody: any = await selectedBranch.json();
      assert.equal(selectedBranch.status, 200);
      assert.deepEqual(selectedBody.data.map((row: any) => row.id), [invoice2]);
      assert.equal((await fetch(`${base}/invoices/${invoice2.toUpperCase()}`, { headers: ownerHeaders })).status, 200);
      assert.equal((await fetch(`${base}/invoices/${invoiceOther}`, { headers: ownerHeaders })).status, 404);
      const noBranchHeaders = await login('read_no_branch');
      assert.equal((await fetch(`${base}/invoices`, { headers: noBranchHeaders })).status, 403);
      assert.equal((await fetch(`${base}/invoices/${invoiceB}`, { headers: noBranchHeaders })).status, 404);
      const adminHeaders = await login('read_admin');
      assert.equal((await fetch(`${base}/invoices`, { headers: adminHeaders })).status, 403);
      assert.equal((await fetch(`${base}/invoices/${invoiceA}`, { headers: adminHeaders })).status, 403);
    });
    await t.test('[ST-2.AC-1] filters all invoices by status and shift cashier', async () => {
      for (let n = 0; n < 25; n++) {
        await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,invoice_code,created_by,order_type,status)
          VALUES($1,$2,$3,$4,$5,'TAKEAWAY',$6)`,
          [randomUUID(), branch2, shift2, `HDFILT${String(n).padStart(4, '0')}`, a, ['PAID', 'CANCELLED', 'OPEN'][n % 3]]);
      }
      const headers = await login('read_owner');
      const response = await fetch(`${base}/invoices?branchId=${branch2}&status=PAID&cashierId=${owner}`, { headers });
      assert.equal(response.status, 200);
      const body: any = await response.json();
      assert.equal(body.meta.total, 9);
      assert.equal(body.data.length, 9);
      assert.ok(body.data.every((row: any) => row.status === 'PAID'));
      for (const row of body.data) {
        assert.equal(row.workShiftId, shift2);
        assert.equal(row.workShiftStatus, 'CLOSED');
        assert.equal(row.cashierId, owner);
        assert.equal(row.cashierName, 'read_owner');
        assert.equal(row.tableName, null);
        assert.equal(row.paymentMethod, null);
      }
      for (const [status, total] of [['OPEN', 9], ['PAID', 9], ['CANCELLED', 8], ['ALL', 26]] as const) {
        const res = await fetch(`${base}/invoices?branchId=${branch2}&status=${status}`, { headers });
        assert.equal(res.status, 200);
        assert.equal((await res.json() as any).meta.total, total);
      }
      const defaultList = await fetch(`${base}/invoices?branchId=${branch2}`, { headers });
      assert.equal((await defaultList.json() as any).meta.total, 9);
      const otherCashierList = await fetch(`${base}/invoices?branchId=${branch2}&status=ALL&cashierId=${a}`, { headers });
      assert.equal((await otherCashierList.json() as any).meta.total, 0);
    });
    await t.test('[ST-2.AC-2] date bounds are inclusive/exclusive and invalid dates rejected', async () => {
      await db.query(`UPDATE invoices SET created_at=CASE invoice_code
        WHEN 'HDFILT0000' THEN '2026-11-12T17:00:00Z'::timestamptz
        WHEN 'HDFILT0001' THEN '2026-11-12T16:59:59Z'::timestamptz
        ELSE '2026-11-13T17:00:00Z'::timestamptz END WHERE invoice_code LIKE 'HDFILT%' OR invoice_code='HDREAD0004'`);
      const headers = await login('read_owner');
      const response = await fetch(`${base}/invoices?status=ALL&branchId=${branch2}&from=2026-11-12T17%3A00%3A00Z&to=2026-11-13T17%3A00%3A00Z`, { headers });
      assert.equal(response.status, 200);
      const body: any = await response.json();
      assert.deepEqual(body.data.map((row: any) => row.invoiceCode), ['HDFILT0000']);
      const precise = await fetch(`${base}/invoices?status=ALL&branchId=${branch2}&from=2026-11-12T17:00:00.0000000Z&to=2026-11-12T17:00:01Z`, { headers });
      assert.equal(precise.status, 200);
      assert.deepEqual((await precise.json() as any).data.map((row: any) => row.invoiceCode), ['HDFILT0000']);
      const subMicrosecond = await fetch(`${base}/invoices?status=ALL&branchId=${branch2}&from=2026-11-12T17:00:00.0000001Z&to=2026-11-12T17:00:01Z`, { headers });
      assert.equal(subMicrosecond.status, 200);
      assert.deepEqual((await subMicrosecond.json() as any).data, []);
      const invalid = await fetch(`${base}/invoices?from=2026-02-30T00%3A00%3A00Z`, { headers });
      assert.equal(invalid.status, 422);
      const invalidBody: any = await invalid.json();
      assert.equal(invalidBody.error.code, 'VALIDATION_ERROR');
      assert.equal(invalidBody.error.message, 'Bộ lọc hóa đơn không hợp lệ.');
      for (const [query, message] of [
        ...['from=2026-13-01T00:00:00Z', 'from=2026-11-13T00:00:00Z&to=2026-11-12T00:00:00Z', 'status=OPEN&status=PAID', 'unknown=x', 'status=BAD', 'tableId=bad', 'cashierId=bad', 'sort=createdAt'].map(query => [query, 'Bộ lọc hóa đơn không hợp lệ.']),
        ['limit=0', 'Giới hạn danh sách không hợp lệ.'],
        ['branchId=bad', 'Chi nhánh không hợp lệ.'],
      ]) {
        const res = await fetch(`${base}/invoices?${query}`, { headers });
        assert.equal(res.status, 422, query);
        const result: any = await res.json();
        assert.equal(result.error.code, 'VALIDATION_ERROR', query);
        assert.equal(result.error.message, message, query);
      }
    });
    await t.test('[ST-2.AC-3] cursor cannot be reused by another owner in the same scope', async () => {
      await db.query(`UPDATE invoices SET created_at=CASE invoice_code
        WHEN 'HDFILT0000' THEN '2026-11-14T00:00:00.000001Z'::timestamptz
        WHEN 'HDFILT0001' THEN '2026-11-14T00:00:00.000002Z'::timestamptz
        ELSE '2026-11-14T00:00:00.000002Z'::timestamptz END
        WHERE invoice_code IN ('HDFILT0000','HDFILT0001','HDFILT0002')`);
      const otherOwner = randomUUID();
      await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
        VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='OWNER'),'read_owner_b','read_owner_b',$4,false)`, [otherOwner, store, branch, hash]);
      const headers = await login('read_owner');
      const response = await fetch(`${base}/invoices?branchId=${branch2}&status=ALL&limit=2`, { headers });
      assert.equal(response.status, 200);
      const body: any = await response.json();
      assert.ok(body.meta.nextCursor);
      const ids: string[] = [];
      let cursor: string | null = null;
      do {
        const res: Response = await fetch(`${base}/invoices?branchId=${branch2}&status=ALL&limit=2${cursor ? `&cursor=${cursor}` : ''}`, { headers });
        assert.equal(res.status, 200);
        const page: any = await res.json();
        assert.equal(page.meta.total, 26);
        ids.push(...page.data.map((row: any) => row.id));
        cursor = page.meta.nextCursor;
      } while (cursor);
      assert.equal(ids.length, 26);
      assert.equal(new Set(ids).size, 26);
      const index1 = ids.indexOf((await db.query("SELECT id FROM invoices WHERE invoice_code='HDFILT0001'"))[0].id);
      const index0 = ids.indexOf((await db.query("SELECT id FROM invoices WHERE invoice_code='HDFILT0000'"))[0].id);
      assert.ok(index1 < index0);
      const changedFilter = await fetch(`${base}/invoices?branchId=${branch2}&status=PAID&limit=2&cursor=${body.meta.nextCursor}`, { headers });
      assert.equal(changedFilter.status, 422);
      const otherHeaders = await login('read_owner_b');
      const reused = await fetch(`${base}/invoices?branchId=${branch2}&status=ALL&limit=2&cursor=${body.meta.nextCursor}`, { headers: otherHeaders });
      assert.equal(reused.status, 422);
      assert.equal((await reused.json() as any).error.message, 'Cursor không hợp lệ.');
    });
    await t.test('[ST-2.AC-3] cursor with a rollover date returns validation error', async () => {
      const headers = await login('read_owner');
      const first = await fetch(`${base}/invoices?branchId=${branch2}&status=ALL&limit=2`, { headers });
      const page: any = await first.json();
      const cursor = JSON.parse(Buffer.from(page.meta.nextCursor, 'base64url').toString('utf8'));
      cursor.createdAt = '2026-02-30T00:00:00.000000Z';
      const malformed = Buffer.from(JSON.stringify(cursor)).toString('base64url');
      const res = await fetch(`${base}/invoices?branchId=${branch2}&status=ALL&limit=2&cursor=${malformed}`, { headers });
      assert.equal(res.status, 422);
      const body: any = await res.json();
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.equal(body.error.message, 'Cursor không hợp lệ.');
      const invalidCursor = await fetch(`${base}/invoices?cursor=not-json`, { headers });
      assert.equal(invalidCursor.status, 422);
      const invalidBody: any = await invalidCursor.json();
      assert.equal(invalidBody.error.code, 'VALIDATION_ERROR');
      assert.equal(invalidBody.error.message, 'Cursor không hợp lệ.');
    });
    await t.test('[ST-2.AC-4] options include inactive historical tables and cashiers outside the filtered page', async () => {
      const table = randomUUID(), otherStoreTable = randomUUID();
      await db.query('INSERT INTO dining_tables(id,branch_id,name,is_active) VALUES($1,$2,$3,false)', [table, branch2, 'Old table']);
      await db.query('INSERT INTO dining_tables(id,branch_id,name) VALUES($1,$2,$3)', [otherStoreTable, otherBranch, 'Other store table']);
      await db.query("UPDATE invoices SET table_id=$1,order_type='DINE_IN' WHERE id=$2", [otherStoreTable, invoiceOther]);
      await db.query("UPDATE invoices SET table_id=$1,order_type='DINE_IN' WHERE invoice_code='HDFILT0000'", [table]);
      const headers = await login('read_owner');
      const firstPage = await fetch(`${base}/invoices?branchId=${branch2}&status=ALL&limit=2`, { headers });
      const firstBody: any = await firstPage.json();
      assert.ok(!firstBody.data.some((row: any) => row.tableId === table));
      assert.ok(firstBody.meta.filterOptions.tables.some((option: any) => option.id === table));
      const secondPage = await fetch(`${base}/invoices?branchId=${branch2}&status=ALL&limit=2&cursor=${firstBody.meta.nextCursor}`, { headers });
      assert.ok((await secondPage.json() as any).data.some((row: any) => row.tableId === table));
      const response = await fetch(`${base}/invoices?branchId=${branch2}&status=PAID&tableId=${randomUUID()}`, { headers });
      assert.equal(response.status, 200);
      const body: any = await response.json();
      assert.deepEqual(body.data, []);
      assert.deepEqual(body.meta.filterOptions.tables, [{ id: table, name: 'Old table' }]);
      assert.deepEqual(body.meta.filterOptions.cashiers, [{ id: owner, name: 'read_owner' }]);
      const otherDate = await fetch(`${base}/invoices?status=ALL&from=2030-01-01T00:00:00Z`, { headers });
      const otherDateBody: any = await otherDate.json();
      assert.deepEqual(otherDateBody.data, []);
      assert.ok(otherDateBody.meta.filterOptions.tables.some((option: any) => option.id === table));
      assert.ok(!otherDateBody.meta.filterOptions.tables.some((option: any) => option.id === otherStoreTable || option.name === 'Other store table'));
      const cashierHeaders = await login('read_cashier_a');
      const scoped = await fetch(`${base}/invoices?status=ALL&tableId=${table}`, { headers: cashierHeaders });
      const scopedBody: any = await scoped.json();
      assert.deepEqual(scopedBody.data, []);
      assert.ok(!scopedBody.meta.filterOptions.tables.some((option: any) => option.id === table));
      assert.ok(!scopedBody.meta.filterOptions.cashiers.some((option: any) => option.id === owner));
      const originalQuery = db.query.bind(db);
      let queries = 0;
      db.query = (async (...args: Parameters<typeof db.query>) => { queries++; return originalQuery(...args); }) as typeof db.query;
      try {
        await fetch(`${base}/invoices?branchId=${branch2}&status=ALL&limit=1`, { headers });
        const one = queries;
        queries = 0;
        await fetch(`${base}/invoices?branchId=${branch2}&status=ALL&limit=100`, { headers });
        assert.equal(queries, one);
      } finally {
        db.query = originalQuery;
      }
    });
    await t.test('[ST-2.AC-1] combines date, table and shift cashier on the full filtered set', async () => {
      const [table] = await db.query("SELECT id FROM dining_tables WHERE branch_id=$1 AND name='Old table'", [branch2]);
      const otherTable = randomUUID(), otherShift = randomUUID();
      await db.query('INSERT INTO dining_tables(id,branch_id,name) VALUES($1,$2,$3)', [otherTable, branch2, 'Other table']);
      await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,started_at,ended_at,status)
        VALUES($1,$2,$3,'CASHIER',now()-interval '1 minute',now(),'CLOSED')`, [otherShift, branch2, a]);
      for (const [code, tableId, shiftId, createdAt] of [
        ['HDCOMB0001', table.id, shift2, '2026-11-15T00:00:00Z'],
        ['HDCOMB0002', otherTable, shift2, '2026-11-14T00:00:00Z'],
        ['HDCOMB0003', table.id, otherShift, '2026-11-14T00:00:00Z'],
      ]) {
        await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,table_id,invoice_code,created_by,order_type,status,created_at)
          VALUES($1,$2,$3,$4,$5,$6,'DINE_IN','PAID',$7)`, [randomUUID(), branch2, shiftId, tableId, code, a, createdAt]);
      }
      const headers = await login('read_owner');
      const res = await fetch(`${base}/invoices?status=PAID&branchId=${branch2}&tableId=${table.id}&cashierId=${owner}&from=2026-11-14T00:00:00Z&to=2026-11-15T00:00:00Z&limit=1`, { headers });
      assert.equal(res.status, 200);
      const body: any = await res.json();
      assert.equal(body.meta.total, 1);
      assert.deepEqual(body.data.map((row: any) => row.invoiceCode), ['HDFILT0000']);
      assert.equal(body.meta.nextCursor, null);
    });
    for (const [field, value] of [
      ['status', 'PAID'], ['branchId', branch], ['from', '2026-11-13T00:00:00Z'],
      ['to', '2026-11-17T00:00:00Z'], ['tableId', randomUUID()], ['cashierId', owner],
    ]) {
      await t.test(`[ST-2.AC-3] cursor rejects changed ${field}`, async () => {
        const headers = await login('read_owner');
        const params = new URLSearchParams({ status: 'ALL', branchId: branch2,
          from: '2026-11-12T00:00:00Z', to: '2026-11-16T00:00:00Z', limit: '1' });
        const first = await fetch(`${base}/invoices?${params}`, { headers });
        assert.equal(first.status, 200);
        const page: any = await first.json();
        assert.ok(page.meta.nextCursor);
        params.set(field, value);
        params.set('cursor', page.meta.nextCursor);
        const res = await fetch(`${base}/invoices?${params}`, { headers });
        assert.equal(res.status, 422);
        const body: any = await res.json();
        assert.equal(body.error.code, 'VALIDATION_ERROR');
        assert.equal(body.error.message, 'Cursor kh\u00f4ng h\u1ee3p l\u1ec7.');
      });
    }
    // RF-2: method is based on the payment, including cancelled and zero-value invoices.
    await t.test('[T1-payment] detail reports actual payment and shift data without inferring zero payments', async () => {
      const cash = randomUUID(), transfer = randomUUID(), cancelled = randomUUID(), attempt = randomUUID();
      for (const [id, code, status] of [[cash, 'HDCASH0001', 'PAID'], [transfer, 'HDTRAN0001', 'PAID'], [cancelled, 'HDCANC0001', 'CANCELLED']]) {
        await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,invoice_code,created_by,order_type,status,subtotal,total_amount)
          VALUES($1,$2,$3,$4,$5,'TAKEAWAY',$6,25000,25000)`, [id, branch, oldA, code, a, status]);
      }
      const category = randomUUID(), size = randomUUID(), product = randomUUID(), productSize = randomUUID(), item = randomUUID(), table = randomUUID();
      await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)', [category, store, 'Read catalog']);
      await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)', [size, store, 'Current size']);
      await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)', [product, category, 'Current name']);
      await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,99999)', [productSize, product, size]);
      await db.query(`INSERT INTO invoice_items(id,invoice_id,product_size_id,product_name,size_name,unit_price,quantity,line_total)
        VALUES($1,$2,$3,'Original name','Original size',25000,1,25000)`, [item, cash, productSize]);
      await db.query('INSERT INTO dining_tables(id,branch_id,name) VALUES($1,$2,$3)', [table, branch, 'Bàn cũ']);
      await db.query("UPDATE invoices SET order_type='DINE_IN',table_id=$2 WHERE id=$1", [cash, table]);
      for (const id of [cash, cancelled]) {
        await db.query(`INSERT INTO payments(id,invoice_id,method,amount,idempotency_key,idempotency_request_hash,tendered_amount,change_amount,created_by)
          VALUES($1,$2,'CASH',25000,$3,$4,25000,0,$5)`, [randomUUID(), id, randomUUID(), 'a'.repeat(64), a]);
      }
      await db.query(`INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,amount,transfer_reference,idempotency_key,idempotency_request_hash,status)
        VALUES($1,$2,$3,'970422','123456789','STORE',25000,'HD1234567890ABCDEF',$4,$5,'PAID')`, [attempt, transfer, store, randomUUID(), 'b'.repeat(64)]);
      await db.query(`INSERT INTO payments(id,invoice_id,method,amount,idempotency_key,idempotency_request_hash,actual_received_amount,excess_amount,transfer_attempt_id,receiving_account_number,transaction_ref,transaction_ref_kind,confirmation_source)
        VALUES($1,$2,'TRANSFER',25000,$3,$4,25000,0,$5,'123456789',$6,'BANK','WEBHOOK')`, [randomUUID(), transfer, randomUUID(), 'c'.repeat(64), attempt, randomUUID()]);
      const headers = await login('read_cashier_a');
      for (const [id, method, total] of [[cash, 'CASH', 25000], [transfer, 'TRANSFER', 25000], [cancelled, 'CASH', 25000], [invoiceOldA, null, 0]] as const) {
        const response = await fetch(`${base}/invoices/${id}`, { headers });
        assert.equal(response.status, 200);
        const { data }: any = await response.json();
        assert.equal(data.paymentMethod, method);
        assert.equal(data.workShiftStatus, 'CLOSED');
        assert.equal(data.cashierId, a);
        assert.equal(data.cashierName, 'read_cashier_a');
        assert.equal(data.tableName, id === cash ? 'Bàn cũ' : null);
        assert.equal(data.totalAmount, total);
        if (id === cash) assert.deepEqual(data.items.map((row: any) => [row.productName, row.sizeName, row.unitPrice, row.lineTotal]), [['Original name', 'Original size', 25000, 25000]]);
      }
    });
    await t.test('[ST-2.AC-3] same-branch managers cannot share cursors', async () => {
      const managerB = randomUUID();
      await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
        VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='MANAGER'),'read_manager_b','read_manager_b',$4,false)`, [managerB, store, branch, hash]);
      const getCursor = async (headers: Record<string, string>) => {
        const res = await fetch(`${base}/invoices?status=ALL&limit=1`, { headers });
        assert.equal(res.status, 200);
        const body: any = await res.json();
        assert.ok(body.meta.nextCursor);
        return body.meta.nextCursor as string;
      };
      const managerHeaders = await login('read_manager');
      const secondManagerHeaders = await login('read_manager_b');
      const managerCursor = await getCursor(managerHeaders);
      const managerReuse = await fetch(`${base}/invoices?status=ALL&limit=1&cursor=${managerCursor}`, { headers: secondManagerHeaders });
      assert.equal(managerReuse.status, 422);
      const managerError: any = await managerReuse.json();
      assert.equal(managerError.error.code, 'VALIDATION_ERROR');
      assert.equal(managerError.error.message, 'Cursor không hợp lệ.');
    });
    await t.test('[ST-2.AC-3] same-branch cashiers cannot share cursors', async () => {
      const cashierHeaders = await login('read_cashier_a');
      const secondCashierHeaders = await login('read_cashier_b');
      const first = await fetch(`${base}/invoices?status=ALL&limit=1`, { headers: cashierHeaders });
      assert.equal(first.status, 200);
      const body: any = await first.json();
      assert.ok(body.meta.nextCursor);
      const cashierReuse = await fetch(`${base}/invoices?status=ALL&limit=1&cursor=${body.meta.nextCursor}`, { headers: secondCashierHeaders });
      assert.equal(cashierReuse.status, 422);
      const cashierError: any = await cashierReuse.json();
      assert.equal(cashierError.error.code, 'VALIDATION_ERROR');
      assert.equal(cashierError.error.message, 'Cursor không hợp lệ.');
    });
    await t.test('[ST-2.AC-4] inactive cashier remains in scoped historical options while other store is excluded', async () => {
      await db.query('UPDATE users SET is_active=false WHERE id=$1', [b]);
      const headers = await login('read_manager');
      const res = await fetch(`${base}/invoices?status=PAID&tableId=${randomUUID()}`, { headers });
      assert.equal(res.status, 200);
      const body: any = await res.json();
      assert.deepEqual(body.data, []);
      assert.ok(body.meta.filterOptions.cashiers?.some((entry: any) => entry.id === b && entry.name === 'read_cashier_b'));
      assert.ok(!body.meta.filterOptions.cashiers.some((entry: any) => entry.id === otherCashier));
    });
    // RF-3: permissions, not role names, determine the readable scope.
    await t.test('[T1-permission] grant, revoke and migration rollback preserve business history', async () => {
      const managerHeaders = await login('read_manager');
      const ownerHeaders = await login('read_owner');
      await db.query("INSERT INTO shift_expenses(id,work_shift_id,amount,reason,paid_from_drawer,created_by) VALUES($1,$2,5000,'Chi thử',true,$3)", [randomUUID(), oldA, a]);
      const history = async () => ({
        invoices: await db.query('SELECT id,status,total_amount FROM invoices ORDER BY id'),
        shifts: await db.query('SELECT id,status,user_id FROM work_shifts ORDER BY id'),
        expenses: await db.query('SELECT id,work_shift_id,amount FROM shift_expenses ORDER BY id'),
        payments: await db.query('SELECT id,invoice_id,method,amount FROM payments ORDER BY id'),
      });
      const before = await history();
      const migration = new InvoiceReadScope20261114000000();
      const runner = db.createQueryRunner();
      try {
        assert.equal((await fetch(`${base}/invoices/${invoiceB}`, { headers: managerHeaders })).status, 200);
        const beforeRevoke = await fetch(`${base}/invoices?status=ALL&limit=1`, { headers: managerHeaders });
        const beforeRevokeBody: any = await beforeRevoke.json();
        assert.ok(beforeRevokeBody.meta.nextCursor);
        await migration.down(runner);
        const revokedCursor = await fetch(`${base}/invoices?status=ALL&limit=1&cursor=${beforeRevokeBody.meta.nextCursor}`, { headers: managerHeaders });
        assert.equal(revokedCursor.status, 422);
        const revokedBody: any = await revokedCursor.json();
        assert.equal(revokedBody.error.code, 'VALIDATION_ERROR');
        assert.equal(revokedBody.error.message, 'Cursor không hợp lệ.');
        assert.equal((await fetch(`${base}/invoices/${invoiceB}`, { headers: managerHeaders })).status, 404);
        assert.equal((await fetch(`${base}/invoices/${invoice2}`, { headers: ownerHeaders })).status, 200);
        assert.equal((await db.query("SELECT count(*)::int AS count FROM permissions WHERE code='invoice.read_branch'"))[0].count, 0);
        assert.deepEqual(await history(), before);
        await migration.up(runner);
        assert.equal((await fetch(`${base}/invoices/${invoiceB}`, { headers: managerHeaders })).status, 200);
        assert.deepEqual(await history(), before);
        await db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='OWNER')
          AND permission_id=(SELECT id FROM permissions WHERE code='branch.access_all')`);
        await db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='OWNER')
          AND permission_id=(SELECT id FROM permissions WHERE code='invoice.read_branch')`);
        assert.equal((await fetch(`${base}/invoices/${invoiceB}`, { headers: ownerHeaders })).status, 404);
        const cashierHeaders = await login('read_cashier_a');
        await db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='CASHIER')
          AND permission_id=(SELECT id FROM permissions WHERE code='invoice.read')`);
        assert.equal((await fetch(`${base}/invoices`, { headers: cashierHeaders })).status, 403);
        assert.equal((await fetch(`${base}/invoices/${invoiceA}`, { headers: cashierHeaders })).status, 403);
      } finally {
        await runner.release();
      }
    });
  } finally {
    if (app) await app.close();
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});
