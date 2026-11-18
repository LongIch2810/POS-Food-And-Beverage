import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';
import { captureSql, lockSequence } from '../../database/tests/sql-capture';

test('[PB-16] PAID invoices are immutable over HTTP with PostgreSQL', { timeout: 180_000 }, async (t) => {
  const name = `pos_pb16_cancel_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Only a local sandbox is allowed');
  url.pathname = `/${name}`;
  const db = new DataSource({
    type: 'postgres',
    url: url.toString(),
    entities: dataSource.options.entities,
    migrations: dataSource.options.migrations,
  });

  const origin = 'http://localhost:5173';
  process.env.PUBLIC_ORIGIN = origin;
  process.env.JWT_SECRET = 'j'.repeat(32);
  process.env.CSRF_SECRET = 'c'.repeat(32);
  const password = randomBytes(18).toString('base64url');
  process.env.BOOTSTRAP_ADMIN_USERNAME = 'admin';
  process.env.BOOTSTRAP_ADMIN_FULL_NAME = 'QA Admin';
  process.env.BOOTSTRAP_ADMIN_PASSWORD = password;

  await dataSource.initialize();
  let app: any;
  let created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    created = true;
    await db.initialize();
    await db.runMigrations();
    await bootstrapAdmin(db);

    // Permissions come only from role_permissions seeded by migrations (M-19: ids from randomUUID()).
    const hash = await bcrypt.hash(password, 4);
    const storeS = randomUUID();
    const storeX = randomUUID();
    const branchB = randomUUID();
    const ownerS = randomUUID();
    const ownerX = randomUUID();
    const managerB = randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2),($3,$4)', [storeS, 'S9 store S', storeX, 'S9 store X']);
    await db.query('INSERT INTO branches(id,store_id,code,name,initial_cash) VALUES($1,$2,$3,$4,100000)', [branchB, storeS, 'BB', 'Branch B']);
    const insertUser = (id: string, store: string, branch: string | null, role: string, username: string) =>
      db.query(
        `INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
         VALUES($1,$2,$3,(SELECT id FROM roles WHERE name=$4),$5,$5,$6,false)`,
        [id, store, branch, role, username, hash],
      );
    await insertUser(ownerS, storeS, null, 'OWNER', 's9c_owner_s');
    await insertUser(ownerX, storeX, null, 'OWNER', 's9c_owner_x');
    await insertUser(managerB, storeS, branchB, 'MANAGER', 's9c_manager_b');

    // Catalog of store S: product 25000 = milk 100.000 ml + sugar 20.000 g.
    const milk = randomUUID();
    const sugar = randomUUID();
    const category = randomUUID();
    const size = randomUUID();
    const product = randomUUID();
    const productSize = randomUUID();
    await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)', [category, storeS, 'S9 drinks']);
    await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)', [size, storeS, 'M']);
    await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)', [product, category, 'S9 tea']);
    await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,25000)', [productSize, product, size]);
    await db.query(`INSERT INTO ingredients(id,store_id,name,unit) VALUES($1,$2,'S9 milk','ml'),($3,$2,'S9 sugar','g')`, [milk, storeS, sugar]);
    await db.query(
      `INSERT INTO product_size_ingredients(product_size_id,ingredient_id,quantity) VALUES($1,$2,100.000),($1,$3,20.000)`,
      [productSize, milk, sugar],
    );
    const promoIds: Record<string, string> = {};
    for (const code of ['S9PROMO', 'S9ROLL', 'S9BROKEN', 'S9OFF', 'S9RACE']) {
      promoIds[code] = randomUUID();
      await db.query(
        `INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,start_at,end_at,usage_limit)
         VALUES($1,$2,$3,'FIXED',5000,now()-interval '1 day',now()+interval '1 day',10)`,
        [promoIds[code], storeS, code],
      );
    }
    promoIds.S9ZERO = randomUUID();
    await db.query(
      `INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,start_at,end_at,usage_limit)
       VALUES($1,$2,'S9ZERO','FIXED',1000000,now()-interval '1 day',now()+interval '1 day',10)`,
      [promoIds.S9ZERO, storeS],
    );

    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DataSource).useValue(db).compile();
    app = module.createNestApplication({ logger: false, rawBody: true });
    await app.listen(0, '127.0.0.1');
    const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;

    const login = async (username: string): Promise<Record<string, string>> => {
      const response = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      assert.equal(response.status, 200, 'fixture login');
      const cookies = response.headers.getSetCookie().map((v) => v.split(';')[0]);
      return {
        Cookie: cookies.join('; '),
        Origin: origin,
        'X-CSRF-Token': cookies.find((v) => v.startsWith('__Host-pos_csrf='))!.slice(16),
        'Content-Type': 'application/json',
      };
    };
    const post = (path: string, headers: Record<string, string>, body: object, key?: string) =>
      fetch(base + path, { method: 'POST', headers: { ...headers, ...(key ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body) });
    const json = async (response: Response) => (await response.json()) as any;

    const sessions = {
      ownerS: await login('s9c_owner_s'),
      ownerX: await login('s9c_owner_x'),
      managerB: await login('s9c_manager_b'),
      admin: await login('admin'),
    };

    let seq = 0;
    const freshShift = async () => {
      seq += 1;
      const branchId = randomUUID();
      const cashierId = randomUUID();
      const managerId = randomUUID();
      await db.query('INSERT INTO branches(id,store_id,code,name,initial_cash) VALUES($1,$2,$3,$4,100000)', [branchId, storeS, `C${seq}`, `Branch C${seq}`]);
      await insertUser(cashierId, storeS, branchId, 'CASHIER', `s9c_cashier_${seq}`);
      await insertUser(managerId, storeS, branchId, 'MANAGER', `s9c_manager_${seq}`);
      for (const ingredient of [milk, sugar]) {
        await db.query(
          `INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,created_by)
           VALUES($1,$2,$3,'IMPORT',1000,0,$4)`,
          [randomUUID(), branchId, ingredient, cashierId],
        );
      }
      const cashier = await login(`s9c_cashier_${seq}`);
      const manager = await login(`s9c_manager_${seq}`);
      const opened = await post('/work-shifts', cashier, { shiftType: 'CASHIER' });
      assert.equal(opened.status, 201, 'fixture shift');
      return { branchId, cashierId, cashier, shiftId: (await json(opened)).data.id as string, managerId, manager };
    };

    const sellOrder = async (cashier: Record<string, string>, opts: { quantity: number; promoCode?: string }) => {
      const created = await post('/invoices', cashier, { orderType: 'TAKEAWAY' });
      assert.equal(created.status, 201, 'fixture invoice');
      const id = (await json(created)).data.id as string;
      const item = await post(`/invoices/${id}/items`, cashier, { productSizeId: productSize, quantity: opts.quantity });
      assert.equal(item.status, 201, 'fixture item');
      let total: number = (await json(item)).data.totalAmount;
      if (opts.promoCode) {
        const promo = await post(`/invoices/${id}/apply-promotion`, cashier, { code: opts.promoCode });
        assert.equal(promo.status, 200, 'fixture promotion');
        total = (await json(promo)).data.totalAmount;
      }
      return { id, total };
    };
    const paidCashInvoice = async (cashier: Record<string, string>, opts: { quantity: number; promoCode?: string; tendered?: number }) => {
      const { id, total } = await sellOrder(cashier, opts);
      const paid = await post(`/invoices/${id}/payments`, cashier, { method: 'CASH', amount: total, tenderedAmount: opts.tendered ?? total }, randomUUID());
      assert.equal(paid.status, 201, `fixture payment: ${await paid.clone().text()}`);
      return { id, total };
    };

    const seedPaidTransfer = async (branchId: string, shiftId: string, cashierId: string, amount: number) => {
      const invoice = randomUUID();
      const attempt = randomUUID();
      const code = `HD${randomBytes(4).toString('hex').toUpperCase()}`;
      await db.query(
        `INSERT INTO invoices(id,branch_id,work_shift_id,invoice_code,created_by,order_type,status,subtotal,total_amount,paid_at)
         VALUES($1,$2,$3,$4,$5,'TAKEAWAY','PAID',${amount},${amount},now())`,
        [invoice, branchId, shiftId, code, cashierId],
      );
      await db.query(
        `INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,amount,transfer_reference,idempotency_key,idempotency_request_hash,status)
         VALUES($1,$2,$3,'970422','123456789','STORE',${amount},$4,$5,$6,'PAID')`,
        [attempt, invoice, storeS, `${code}ABCDEFGH`, randomUUID(), 'c'.repeat(64)],
      );
      await db.query(
        `INSERT INTO payments(id,invoice_id,method,amount,idempotency_key,idempotency_request_hash,actual_received_amount,excess_amount,transfer_attempt_id,receiving_account_number,transaction_ref,transaction_ref_kind,confirmation_source)
         VALUES($1,$2,'TRANSFER',${amount},$3,$4,${amount},0,$5,'123456789',$6,'BANK','WEBHOOK')`,
        [randomUUID(), invoice, randomUUID(), 'd'.repeat(64), attempt, randomUUID()],
      );
      // Like a webhook-completed order: the SALE row is written by the system, not by a user.
      await db.query(
        `INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,invoice_id,created_by,source)
         VALUES($1,$2,$3,'SALE',-100,0,$4,NULL,'SYSTEM')`,
        [randomUUID(), branchId, milk, invoice],
      );
      return invoice;
    };

    const snapshot = async (invoiceId: string) => {
      const [invoice] = await db.query(
        'SELECT status,cancel_reason,cancelled_by,cancelled_at,branch_id FROM invoices WHERE id=$1',
        [invoiceId],
      );
      const payments = await db.query(
        'SELECT method,amount::text AS amount,created_by FROM payments WHERE invoice_id=$1 ORDER BY method',
        [invoiceId],
      );
      const movements = await db.query(
        `SELECT type,ingredient_id,branch_id,quantity::text AS quantity,balance_after::text AS balance_after,created_by,source
         FROM stock_movements WHERE invoice_id=$1 ORDER BY type,ingredient_id,created_at,id`,
        [invoiceId],
      );
      const stocks = await db.query(
        'SELECT ingredient_id,current_stock::text AS current_stock FROM branch_ingredient_stocks WHERE branch_id=$1 ORDER BY ingredient_id',
        [invoice.branch_id],
      );
      const [promo] = await db.query(
        `SELECT p.used_count FROM promotion_codes p JOIN invoice_promotion_codes ip ON ip.promotion_code_id=p.id WHERE ip.invoice_id=$1`,
        [invoiceId],
      );
      return { invoice, payments, movements, stocks, usedCount: (promo?.used_count ?? null) as number | null };
    };
    const stockOf = (snap: Awaited<ReturnType<typeof snapshot>>, ingredient: string) =>
      snap.stocks.find((s: any) => s.ingredient_id === ingredient).current_stock as string;
    const reversals = (snap: Awaited<ReturnType<typeof snapshot>>) => snap.movements.filter((m: any) => m.type === 'SALE_REVERSAL');
    const cancel = (headers: Record<string, string>, id: string, body: object = { reason: 'Khách trả hàng' }) =>
      post(`/invoices/${id}/cancel`, headers, body);
    const expectError = async (response: Response, status: number, code: string) => {
      const body = await json(response);
      assert.equal(response.status, status, JSON.stringify(body));
      assert.equal(body.error.code, code);
      return body;
    };

    await t.test('[PB16-1] manager cancelling a PAID cash invoice gets INVOICE_PAID_IMMUTABLE and nothing changes', async () => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 2, promoCode: 'S9PROMO', tendered: 50000 });
      assert.equal(sold.total, 45000);
      const before = await snapshot(sold.id);
      assert.equal(before.usedCount, 1);
      assert.equal(stockOf(before, milk), '800.000');
      assert.equal(stockOf(before, sugar), '960.000');
      const error = await expectError(await cancel(manager, sold.id, { reason: 'Khách trả hàng' }), 409, 'INVOICE_PAID_IMMUTABLE');
      assert.equal(error.error.message, 'Đơn đã thanh toán không thể hủy.');
      assert.deepEqual(error.error.details, []);
      const after = await snapshot(sold.id);
      assert.deepEqual(after, before);
      assert.equal(after.invoice.status, 'PAID');
      assert.equal(after.invoice.cancel_reason, null);
      assert.equal(after.invoice.cancelled_by, null);
      assert.equal(after.invoice.cancelled_at, null);
      assert.equal(reversals(after).length, 0);
      assert.equal(stockOf(after, milk), '800.000');
      assert.equal(stockOf(after, sugar), '960.000');
      assert.equal(after.usedCount, 1);
    });

    await t.test('[PB16-2] owner without a shift and cashier owning the shift get INVOICE_PAID_IMMUTABLE', async () => {
      const { cashier } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 1 });
      const before = await snapshot(sold.id);
      for (const session of [sessions.ownerS, cashier]) {
        await expectError(await cancel(session, sold.id), 409, 'INVOICE_PAID_IMMUTABLE');
      }
      assert.deepEqual(await snapshot(sold.id), before);
    });

    await t.test('[PB16-3] PAID transfer and zero-total invoices stay unchanged', async () => {
      const { cashier, cashierId, manager, shiftId, branchId } = await freshShift();
      const transfer = await seedPaidTransfer(branchId, shiftId, cashierId, 30000);
      const attemptsOf = () => db.query('SELECT * FROM transfer_attempts WHERE invoice_id=$1', [transfer]);
      const transferBefore = await snapshot(transfer);
      const attemptsBefore = await attemptsOf();
      await expectError(await cancel(manager, transfer), 409, 'INVOICE_PAID_IMMUTABLE');
      assert.deepEqual(await snapshot(transfer), transferBefore);
      assert.deepEqual(await attemptsOf(), attemptsBefore);

      const { id, total } = await sellOrder(cashier, { quantity: 1, promoCode: 'S9ZERO' });
      assert.equal(total, 0);
      const { 'Content-Type': _json, ...bodiless } = cashier;
      const zero = await fetch(`${base}/invoices/${id}/complete-zero`, { method: 'POST', headers: { ...bodiless, 'Idempotency-Key': randomUUID() } });
      assert.equal(zero.status, 204, await zero.clone().text());
      const zeroBefore = await snapshot(id);
      assert.equal(zeroBefore.usedCount, 1);
      assert.equal(zeroBefore.payments.length, 0);
      await expectError(await cancel(manager, id), 409, 'INVOICE_PAID_IMMUTABLE');
      const zeroAfter = await snapshot(id);
      assert.deepEqual(zeroAfter, zeroBefore);
      assert.equal(zeroAfter.usedCount, 1);
      assert.equal(reversals(zeroAfter).length, 0);
    });

    await t.test('[PB16-4] PAID invoice of a closed shift returns INVOICE_PAID_IMMUTABLE', async () => {
      const { cashier, manager, shiftId } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 1 });
      const closed = await post(`/work-shifts/${shiftId}/close`, cashier, { countedCash: 125000 });
      assert.equal(closed.status, 200, await closed.clone().text());
      const before = await snapshot(sold.id);
      const reconciliation = () => db.query('SELECT * FROM cash_reconciliations WHERE work_shift_id=$1', [shiftId]);
      const reconciliationBefore = await reconciliation();
      await expectError(await cancel(manager, sold.id), 409, 'INVOICE_PAID_IMMUTABLE');
      assert.deepEqual(await snapshot(sold.id), before);
      assert.deepEqual(await reconciliation(), reconciliationBefore);
    });

    await t.test('[PB16-5] reason is validated before the PAID check', async () => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 1 });
      const before = await snapshot(sold.id);
      for (const body of [{}, { reason: '   ' }]) {
        const error = await expectError(await cancel(manager, sold.id, body), 422, 'CANCEL_REASON_REQUIRED');
        assert.equal(error.error.message, 'Cần nhập lý do hủy đơn.');
      }
      await expectError(await cancel(manager, sold.id, { reason: 'a'.repeat(256) }), 422, 'VALIDATION_ERROR');
      assert.deepEqual(await snapshot(sold.id), before);
    });

    await t.test('[PB16-6] scope and permission are checked before the PAID check', async () => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 1 });
      const before = await snapshot(sold.id);
      await insertUser(randomUUID(), storeS, null, 'MANAGER', 's9c_manager_null_paid');
      for (const session of [sessions.managerB, sessions.ownerX, await login('s9c_manager_null_paid')]) {
        const error = await expectError(await cancel(session, sold.id), 404, 'NOT_FOUND');
        assert.equal(error.error.message, 'Không tìm thấy hóa đơn.');
      }
      await expectError(await cancel(sessions.admin, sold.id), 403, 'PERMISSION_DENIED');
      const [revoked] = await db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='MANAGER')
        AND permission_id=(SELECT id FROM permissions WHERE code='invoice.cancel_open') RETURNING role_id,permission_id`);
      assert.equal(revoked.length, 1, 'precondition: MANAGER had invoice.cancel_open');
      try {
        await expectError(await cancel(manager, sold.id), 403, 'PERMISSION_DENIED');
      } finally {
        await db.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2)', [revoked[0].role_id, revoked[0].permission_id]);
      }
      assert.deepEqual(await snapshot(sold.id), before);
    });

    await t.test('[PB16-7] OPEN cancel keeps its behaviour for CASHIER and OWNER', async () => {
      const { cashier } = await freshShift();
      const created = await post('/invoices', cashier, { orderType: 'TAKEAWAY' });
      const id = (await json(created)).data.id as string;
      const response = await cancel(cashier, id, { reason: 'Khách đổi ý' });
      assert.equal(response.status, 200, await response.clone().text());
      assert.equal((await json(response)).data.status, 'CANCELLED');

      // OWNER without a shift cannot cancel a cashier's OPEN invoice.
      const other = await freshShift();
      const openId = (await json(await post('/invoices', other.cashier, { orderType: 'TAKEAWAY' }))).data.id as string;
      await expectError(await cancel(sessions.ownerS, openId, { reason: 'Thử' }), 409, 'SHIFT_NOT_OPEN');
      assert.equal((await snapshot(openId)).invoice.status, 'OPEN');

      // OWNER opens a cashier shift in a fresh branch and cancels an OPEN invoice of that shift.
      const branchId = randomUUID();
      await db.query('INSERT INTO branches(id,store_id,code,name,initial_cash) VALUES($1,$2,$3,$4,100000)', [branchId, storeS, 'OW1', 'Branch OW1']);
      const opened = await post('/work-shifts', sessions.ownerS, { shiftType: 'CASHIER', branchId });
      assert.equal(opened.status, 201, await opened.clone().text());
      const ownerOrder = await post('/invoices', sessions.ownerS, { orderType: 'TAKEAWAY' });
      assert.equal(ownerOrder.status, 201, await ownerOrder.clone().text());
      const ownerOrderId = (await json(ownerOrder)).data.id as string;
      const ownerCancel = await cancel(sessions.ownerS, ownerOrderId, { reason: 'Chủ hủy' });
      assert.equal(ownerCancel.status, 200, await ownerCancel.clone().text());
      assert.equal((await json(ownerCancel)).data.status, 'CANCELLED');
      assert.equal((await snapshot(ownerOrderId)).invoice.cancelled_by, ownerS);
    });

    await t.test('[R1-1] out-of-scope caller without a shift gets 404 when cancelling an OPEN invoice', async () => {
      const { cashier } = await freshShift();
      const created = await post('/invoices', cashier, { orderType: 'TAKEAWAY' });
      const id = (await json(created)).data.id as string;
      const managerNull = randomUUID();
      await insertUser(managerNull, storeS, null, 'MANAGER', 's9c_manager_null');
      const callers = [
        ['manager of branch B without a shift', sessions.managerB],
        ['manager without branch_id and without a shift', await login('s9c_manager_null')],
      ] as const;
      for (const [label, session] of callers) {
        const error = await expectError(await cancel(session, id, { reason: 'Thử' }), 404, 'NOT_FOUND');
        assert.equal(error.error.message, 'Không tìm thấy hóa đơn.', label);
      }
      const [row] = await db.query('SELECT status,cancelled_by FROM invoices WHERE id=$1', [id]);
      assert.deepEqual(row, { status: 'OPEN', cancelled_by: null });
    });

    await t.test('[PB16-8] uppercase id of a PAID invoice returns INVOICE_PAID_IMMUTABLE', async () => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 1 });
      const before = await snapshot(sold.id);
      await expectError(await cancel(manager, sold.id.toUpperCase()), 409, 'INVOICE_PAID_IMMUTABLE');
      assert.deepEqual(await snapshot(sold.id), before);
    });

    await t.test('[PB16-9] legacy CANCELLED invoice stays readable and unchanged', async () => {
      const { cashier, manager, managerId, shiftId, branchId } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 2 });
      assert.equal(sold.total, 50000);
      // Data shaped like a PB-11 cancellation: status, reason and two SALE_REVERSAL rows.
      await db.query(
        `UPDATE invoices SET status='CANCELLED', cancel_reason='Khách trả hàng (cũ)', cancelled_by=$2, cancelled_at=now(), updated_at=now() WHERE id=$1`,
        [sold.id, managerId],
      );
      for (const [ingredient, quantity] of [[milk, 200], [sugar, 40]] as const) {
        await db.query(
          `INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,invoice_id,created_by,source)
           VALUES($1,$2,$3,'SALE_REVERSAL',$4,0,$5,$6,'USER')`,
          [randomUUID(), branchId, ingredient, quantity, sold.id, managerId],
        );
      }
      const read = await fetch(`${base}/invoices/${sold.id}`, { headers: manager });
      assert.equal(read.status, 200, await read.clone().text());
      const data = (await json(read)).data;
      assert.equal(data.status, 'CANCELLED');
      assert.equal(data.cancelReason, 'Khách trả hàng (cũ)');
      assert.notEqual(data.cancelledAt, null);
      const before = await snapshot(sold.id);
      const error = await expectError(await cancel(manager, sold.id), 409, 'INVOICE_NOT_OPEN');
      assert.equal(error.error.message, 'Đơn không còn mở.');
      const after = await snapshot(sold.id);
      assert.deepEqual(after, before);
      assert.equal(reversals(after).length, 2);
      const closed = await post(`/work-shifts/${shiftId}/close`, cashier, { countedCash: 100000 });
      assert.equal(closed.status, 200, await closed.clone().text());
      const r = (await json(closed)).data.reconciliation;
      assert.deepEqual([r.cashSalesAmount, r.expenseAmount, r.expectedCash, r.status], [0, 0, 100000, 'MATCHED']);
    });

    const waitLock = async (expected: number) => {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const [row] = await db.query(
          `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database()
           AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%FOR UPDATE%'`,
        );
        if (row.n >= expected) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.fail(`expected ${expected} sessions waiting for the shift lock`);
    };
    // Holds the shift row lock, sends `first` then `second` so they queue in that order, then releases the lock.
    const serialized = async <A, B>(shiftId: string, first: () => Promise<A>, second: () => Promise<B>) => {
      const gate = db.createQueryRunner();
      await gate.connect();
      await gate.startTransaction();
      await gate.query('SELECT id FROM work_shifts WHERE id=$1 FOR UPDATE', [shiftId]);
      let firstResult: Promise<A>;
      let secondResult: Promise<B>;
      try {
        firstResult = first();
        await waitLock(1);
        secondResult = second();
        await waitLock(2);
      } finally {
        await gate.commitTransaction();
        await gate.release();
      }
      return [await firstResult, await secondResult] as const;
    };

    await t.test('[B-47] close shift counts only CASH payments in cash_sales_amount', async () => {
      const { cashier, cashierId, shiftId, branchId } = await freshShift();
      await paidCashInvoice(cashier, { quantity: 2 });
      const transfer = await seedPaidTransfer(branchId, shiftId, cashierId, 30000);
      const closed = await post(`/work-shifts/${shiftId}/close`, cashier, { countedCash: 150000 });
      assert.equal(closed.status, 200, await closed.clone().text());
      const r = (await json(closed)).data.reconciliation;
      assert.deepEqual([r.cashSalesAmount, r.expenseAmount, r.expectedCash, r.status], [50000, 0, 150000, 'MATCHED']);
      assert.equal((await snapshot(transfer)).invoice.status, 'PAID');
    });

    await t.test('[PB16-RF2] pay wins a concurrent cancel of the same OPEN invoice', async () => {
      const { cashier, shiftId } = await freshShift();
      const open = await sellOrder(cashier, { quantity: 1 });
      const [paid, cancelled] = await serialized(
        shiftId,
        () => post(`/invoices/${open.id}/payments`, cashier, { method: 'CASH', amount: open.total, tenderedAmount: open.total }, randomUUID()),
        () => cancel(cashier, open.id),
      );
      assert.equal(paid.status, 201, await paid.clone().text());
      const error = await expectError(cancelled, 409, 'INVOICE_NOT_OPEN');
      assert.equal(error.error.message, 'Đơn không còn mở.');
      const after = await snapshot(open.id);
      assert.equal(after.invoice.status, 'PAID');
      assert.equal(after.invoice.cancel_reason, null);
      assert.equal(reversals(after).length, 0);
    });

    await t.test('[PB16-RF5] PAID cancel takes no row lock and writes nothing', async (t) => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 2, promoCode: 'S9PROMO', tendered: 50000 });
      const sql = captureSql(t);
      await expectError(await cancel(manager, sold.id), 409, 'INVOICE_PAID_IMMUTABLE');
      assert.deepEqual(lockSequence(sql), []);
      assert.deepEqual(sql.filter((q) => /^\s*(INSERT|UPDATE|DELETE)\b/i.test(q)), []);
    });

    await t.test('[PB16-ST2] OWNER and MANAGER sessions only carry the OPEN cancel permission', async () => {
      const { cashier, manager } = await freshShift();
      for (const session of [sessions.ownerS, manager]) {
        const me = await fetch(`${base}/auth/me`, { headers: session });
        assert.equal(me.status, 200);
        const permissions: string[] = (await json(me)).data.user.permissions;
        assert.deepEqual(permissions.filter((p) => p.startsWith('invoice.cancel')), ['invoice.cancel_open']);
      }
      const sold = await paidCashInvoice(cashier, { quantity: 1 });
      await expectError(await cancel(manager, sold.id), 409, 'INVOICE_PAID_IMMUTABLE');
    });
  } finally {
    if (app) await app.close();
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});
