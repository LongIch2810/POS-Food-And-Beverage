import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';

test('[S9-03/S9-04/S9-05] cancel PAID invoices over HTTP with PostgreSQL', { timeout: 180_000 }, async (t) => {
  const name = `pos_s9_cancel_${randomBytes(6).toString('hex')}`;
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

    await t.test('[S9-03][ST-4.AC-1] manager without own shift cancels PAID cash invoice and everything is reversed', async () => {
      const { cashier, manager, managerId, branchId } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 2, promoCode: 'S9PROMO', tendered: 50000 });
      assert.equal(sold.total, 45000);
      const before = await snapshot(sold.id);
      assert.equal(before.usedCount, 1);
      assert.equal(stockOf(before, milk), '800.000');
      assert.equal(stockOf(before, sugar), '960.000');
      const response = await cancel(manager, sold.id, { reason: 'Khách trả hàng' });
      assert.equal(response.status, 200, await response.clone().text());
      const data = (await json(response)).data;
      assert.equal(data.status, 'CANCELLED');
      assert.equal(data.cancelReason, 'Khách trả hàng');
      assert.notEqual(data.cancelledAt, null);
      const after = await snapshot(sold.id);
      assert.equal(after.invoice.status, 'CANCELLED');
      assert.equal(after.invoice.cancelled_by, managerId);
      assert.deepEqual(after.payments, before.payments);
      assert.deepEqual(after.movements.filter((m: any) => m.type === 'SALE'), before.movements.filter((m: any) => m.type === 'SALE'));
      const reversed = reversals(after);
      assert.equal(reversed.length, 2);
      const byIngredient = (id: string) => reversed.find((m: any) => m.ingredient_id === id);
      assert.equal(byIngredient(milk).quantity, '200.000');
      assert.equal(byIngredient(sugar).quantity, '40.000');
      for (const m of reversed) {
        assert.equal(m.branch_id, branchId);
        assert.equal(m.created_by, managerId);
        assert.equal(m.source, 'USER');
      }
      assert.equal(stockOf(after, milk), '1000.000');
      assert.equal(stockOf(after, sugar), '1000.000');
      assert.equal(after.usedCount, 0);
    });

    await t.test('[S9-03][ST-4.AC-2] owner with branch.access_all cancels PAID invoice without a shift', async () => {
      const { cashier } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 1 });
      const response = await cancel(sessions.ownerS, sold.id, { reason: 'Bán nhầm' });
      assert.equal(response.status, 200, await response.clone().text());
      assert.equal((await json(response)).data.status, 'CANCELLED');
      assert.equal((await snapshot(sold.id)).invoice.cancelled_by, ownerS);
    });

    await t.test('[S9-03][ST-4.AC-3] cashier, platform admin, other branch, other store and revoked manager cannot cancel PAID', async () => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 1 });
      const before = await snapshot(sold.id);
      await expectError(await cancel(cashier, sold.id), 403, 'PERMISSION_DENIED');
      await expectError(await cancel(sessions.admin, sold.id), 403, 'PERMISSION_DENIED');
      await expectError(await cancel(sessions.managerB, sold.id), 404, 'NOT_FOUND');
      await expectError(await cancel(sessions.ownerX, sold.id), 404, 'NOT_FOUND');
      const [revoked] = await db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='MANAGER')
        AND permission_id=(SELECT id FROM permissions WHERE code='invoice.cancel_paid') RETURNING role_id,permission_id`);
      assert.equal(revoked.length, 1, 'precondition: MANAGER had invoice.cancel_paid');
      try {
        await expectError(await cancel(manager, sold.id), 403, 'PERMISSION_DENIED');
      } finally {
        await db.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2)', [revoked[0].role_id, revoked[0].permission_id]);
      }
      assert.deepEqual(await snapshot(sold.id), before);
    });

    await t.test('[S9-03][ST-4.AC-4] PAID cancel requires a reason', async () => {
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

    await t.test('[S9-03][ST-4.AC-5] PAID invoice of a closed shift returns CANCEL_NOT_ALLOWED', async () => {
      const { cashier, manager, shiftId } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 1 });
      const closed = await post(`/work-shifts/${shiftId}/close`, cashier, { countedCash: 125000 });
      assert.equal(closed.status, 200, await closed.clone().text());
      const before = await snapshot(sold.id);
      const reconciliation = () =>
        db.query('SELECT * FROM cash_reconciliations WHERE work_shift_id=$1', [shiftId]);
      const reconciliationBefore = await reconciliation();
      const error = await expectError(await cancel(manager, sold.id), 409, 'CANCEL_NOT_ALLOWED');
      assert.equal(error.error.message, 'Chỉ hủy được đơn đã thanh toán khi ca của đơn còn mở.');
      assert.deepEqual(await snapshot(sold.id), before);
      assert.deepEqual(await reconciliation(), reconciliationBefore);
    });

    await t.test('[S9-03][ST-4.AC-6] cancelling a CANCELLED invoice returns INVOICE_NOT_OPEN', async () => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 2, promoCode: 'S9PROMO' });
      assert.equal((await cancel(manager, sold.id)).status, 200);
      const before = await snapshot(sold.id);
      const error = await expectError(await cancel(manager, sold.id), 409, 'INVOICE_NOT_OPEN');
      assert.equal(error.error.message, 'Đơn không còn mở.');
      const after = await snapshot(sold.id);
      assert.deepEqual(after, before);
      assert.equal(reversals(after).length, 2);
      assert.equal(after.usedCount, 0);
    });

    await t.test('[S9-05][ST-4.AC-7] CASH cancel rejected when drawer cannot refund', async () => {
      const tight = await freshShift();
      const soldTight = await paidCashInvoice(tight.cashier, { quantity: 2 });
      assert.equal(soldTight.total, 50000);
      assert.equal((await post(`/work-shifts/${tight.shiftId}/expenses`, tight.cashier, { amount: 120000, reason: 'Mua đá' })).status, 201);
      const before = await snapshot(soldTight.id);
      const error = await expectError(await cancel(tight.manager, soldTight.id), 409, 'CANCEL_EXCEEDS_DRAWER');
      assert.deepEqual(error.error.details, []);
      assert.equal(error.error.message, 'Tiền mặt trong két không đủ để hoàn cho khách.');
      assert.ok(!/\d/.test(error.error.message));
      assert.deepEqual(await snapshot(soldTight.id), before);

      const exact = await freshShift();
      const soldExact = await paidCashInvoice(exact.cashier, { quantity: 2 });
      assert.equal((await post(`/work-shifts/${exact.shiftId}/expenses`, exact.cashier, { amount: 100000, reason: 'Mua đá' })).status, 201);
      assert.equal((await cancel(exact.manager, soldExact.id)).status, 200);
    });

    await t.test('[S9-05][ST-4.AC-8] TRANSFER PAID invoice cancels without drawer check', async () => {
      const { cashier, cashierId, manager, shiftId, branchId } = await freshShift();
      assert.equal((await post(`/work-shifts/${shiftId}/expenses`, cashier, { amount: 100000, reason: 'Mua đá' })).status, 201);
      const invoice = await seedPaidTransfer(branchId, shiftId, cashierId, 30000);
      const attemptBefore = await db.query('SELECT * FROM transfer_attempts WHERE invoice_id=$1', [invoice]);
      const before = await snapshot(invoice);
      const reason = 'Khách trả hàng, đã hoàn 30.000đ chuyển khoản';
      const response = await cancel(manager, invoice, { reason });
      assert.equal(response.status, 200, await response.clone().text());
      const after = await snapshot(invoice);
      assert.equal(after.invoice.cancel_reason, reason);
      assert.deepEqual(after.payments, before.payments);
      assert.deepEqual(await db.query('SELECT * FROM transfer_attempts WHERE invoice_id=$1', [invoice]), attemptBefore);
      const reversed = reversals(after);
      assert.equal(reversed.length, 1);
      assert.equal(reversed[0].quantity, '100.000');
    });

    await t.test('[S9-04][ST-4.AC-9] zero-total PAID invoice cancels and returns promotion use', async () => {
      const { cashier, manager } = await freshShift();
      const { id, total } = await sellOrder(cashier, { quantity: 1, promoCode: 'S9ZERO' });
      assert.equal(total, 0);
      const { 'Content-Type': _json, ...bodiless } = cashier;
      const zero = await fetch(`${base}/invoices/${id}/complete-zero`, { method: 'POST', headers: { ...bodiless, 'Idempotency-Key': randomUUID() } });
      assert.equal(zero.status, 204, await zero.clone().text());
      const before = await snapshot(id);
      assert.equal(before.usedCount, 1);
      assert.equal(before.payments.length, 0);
      const response = await cancel(manager, id, { reason: 'Tặng nhầm' });
      assert.equal(response.status, 200, await response.clone().text());
      const after = await snapshot(id);
      assert.equal(after.payments.length, 0);
      assert.equal(reversals(after).length, 2);
      assert.equal(after.usedCount, 0);
    });

    await t.test('[S9-04][ST-4.AC-10] failure during PAID cancel rolls back everything', async () => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 2, promoCode: 'S9ROLL' });
      const before = await snapshot(sold.id);
      assert.equal(before.usedCount, 1);
      await db.query(`CREATE FUNCTION s9_fail_cancel() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.status='CANCELLED' THEN RAISE EXCEPTION 'S9 cancel rollback'; END IF; RETURN NEW; END $$`);
      await db.query('CREATE TRIGGER s9_fail_cancel BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION s9_fail_cancel()');
      try {
        await expectError(await cancel(manager, sold.id), 500, 'INTERNAL_ERROR');
      } finally {
        await db.query('DROP TRIGGER s9_fail_cancel ON invoices');
        await db.query('DROP FUNCTION s9_fail_cancel()');
      }
      const after = await snapshot(sold.id);
      assert.deepEqual(after, before);
      assert.equal(after.invoice.status, 'PAID');
      assert.equal(reversals(after).length, 0);
    });

    await t.test('[S9-04][ST-4.AC-11] used_count already zero aborts PAID cancel with 500', async () => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 2, promoCode: 'S9BROKEN' });
      await db.query('UPDATE promotion_codes SET used_count=0 WHERE id=$1', [promoIds.S9BROKEN]);
      const before = await snapshot(sold.id);
      await expectError(await cancel(manager, sold.id), 500, 'INTERNAL_ERROR');
      const after = await snapshot(sold.id);
      assert.deepEqual(after, before);
      assert.equal(after.invoice.status, 'PAID');
      assert.equal(reversals(after).length, 0);
      assert.equal(after.usedCount, 0);
    });

    await t.test('[S9-03][ST-4.AC-12] OPEN cancel keeps its behaviour', async () => {
      const { cashier } = await freshShift();
      const created = await post('/invoices', cashier, { orderType: 'TAKEAWAY' });
      const id = (await json(created)).data.id as string;
      const response = await cancel(cashier, id, { reason: 'Khách đổi ý' });
      assert.equal(response.status, 200, await response.clone().text());
      assert.equal((await json(response)).data.status, 'CANCELLED');
    });

    await t.test('[S9-03][ST-4.AC-13] uppercase invoice id cancels PAID invoice', async () => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 1 });
      const response = await cancel(manager, sold.id.toUpperCase());
      assert.equal(response.status, 200, await response.clone().text());
      const data = (await json(response)).data;
      assert.equal(data.status, 'CANCELLED');
      assert.equal(data.id, sold.id);
    });

    await t.test('[S9-04][ST-4.AC-14] reversal follows recorded SALE rows after recipe change', async () => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 2 });
      await db.query('UPDATE product_size_ingredients SET quantity=150 WHERE product_size_id=$1 AND ingredient_id=$2', [productSize, milk]);
      try {
        assert.equal((await cancel(manager, sold.id)).status, 200);
      } finally {
        await db.query('UPDATE product_size_ingredients SET quantity=100 WHERE product_size_id=$1 AND ingredient_id=$2', [productSize, milk]);
      }
      const milkReversal = reversals(await snapshot(sold.id)).find((m: any) => m.ingredient_id === milk);
      assert.equal(milkReversal.quantity, '200.000');
    });

    await t.test('[S9-04][ST-4.AC-15] inactive promotion still gets its use returned', async () => {
      const { cashier, manager } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 1, promoCode: 'S9OFF' });
      assert.equal((await snapshot(sold.id)).usedCount, 1);
      await db.query('UPDATE promotion_codes SET is_active=false, end_at=now() WHERE id=$1', [promoIds.S9OFF]);
      assert.equal((await cancel(manager, sold.id)).status, 200);
      assert.equal((await snapshot(sold.id)).usedCount, 0);
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
    const reconciliationOf = async (shiftId: string) =>
      (await db.query('SELECT cash_sales_amount::int AS cash_sales, expense_amount::int AS expense, expected_cash::int AS expected, status FROM cash_reconciliations WHERE work_shift_id=$1', [shiftId]))[0];

    await t.test('[S9-04][ST-5.AC-1] two concurrent PAID cancels write once', async () => {
      const { cashier, manager, shiftId } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 2, promoCode: 'S9RACE', tendered: 50000 });
      assert.equal(sold.total, 45000);
      const before = await snapshot(sold.id);
      assert.equal(before.usedCount, 1);
      const [a, b] = await serialized(shiftId, () => cancel(manager, sold.id), () => cancel(manager, sold.id));
      assert.deepEqual([a.status, b.status].sort(), [200, 409]);
      const rejected = await json(a.status === 409 ? a : b);
      assert.equal(rejected.error.code, 'INVOICE_NOT_OPEN');
      const after = await snapshot(sold.id);
      assert.equal(reversals(after).length, 2);
      assert.equal(after.usedCount, 0);
      assert.equal(stockOf(after, milk), '1000.000');
      assert.equal(stockOf(after, sugar), '1000.000');
    });

    await t.test('[S9-05][ST-5.AC-2] cancelled CASH invoice leaves cash sales', async () => {
      const { cashier, manager, shiftId } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 2 });
      assert.equal(sold.total, 50000);
      assert.equal((await cancel(manager, sold.id)).status, 200);
      const closed = await post(`/work-shifts/${shiftId}/close`, cashier, { countedCash: 100000 });
      assert.equal(closed.status, 200, await closed.clone().text());
      const r = (await json(closed)).data.reconciliation;
      assert.deepEqual([r.cashSalesAmount, r.expenseAmount, r.expectedCash, r.status], [0, 0, 100000, 'MATCHED']);
    });

    await t.test('[S9-05][ST-5.AC-3] cancelled TRANSFER invoice does not touch the drawer', async () => {
      const { cashier, cashierId, manager, shiftId, branchId } = await freshShift();
      await paidCashInvoice(cashier, { quantity: 2 });
      const transfer = await seedPaidTransfer(branchId, shiftId, cashierId, 30000);
      const reason = 'Hoàn 30.000đ chuyển khoản cho khách';
      assert.equal((await cancel(manager, transfer, { reason })).status, 200);
      const closed = await post(`/work-shifts/${shiftId}/close`, cashier, { countedCash: 150000 });
      assert.equal(closed.status, 200, await closed.clone().text());
      const r = (await json(closed)).data.reconciliation;
      assert.deepEqual([r.cashSalesAmount, r.expectedCash, r.status], [50000, 150000, 'MATCHED']);
      assert.equal((await snapshot(transfer)).invoice.cancel_reason, reason);
    });

    await t.test('[S9-05][ST-5.AC-4] PAID cancel and close serialize in both orders', async () => {
      const a = await freshShift();
      const soldA = await paidCashInvoice(a.cashier, { quantity: 2 });
      const [cancelA, closeA] = await serialized(
        a.shiftId,
        () => cancel(a.manager, soldA.id),
        () => post(`/work-shifts/${a.shiftId}/close`, a.cashier, { countedCash: 100000 }),
      );
      assert.equal(cancelA.status, 200);
      assert.equal(closeA.status, 200);
      const rA = (await json(closeA)).data.reconciliation;
      assert.deepEqual([rA.cashSalesAmount, rA.status], [0, 'MATCHED']);

      const b = await freshShift();
      const soldB = await paidCashInvoice(b.cashier, { quantity: 2 });
      const [closeB, cancelB] = await serialized(
        b.shiftId,
        () => post(`/work-shifts/${b.shiftId}/close`, b.cashier, { countedCash: 150000 }),
        () => cancel(b.manager, soldB.id),
      );
      assert.equal(closeB.status, 200);
      assert.equal((await json(closeB)).data.reconciliation.cashSalesAmount, 50000);
      await expectError(cancelB, 409, 'CANCEL_NOT_ALLOWED');
      assert.equal((await snapshot(soldB.id)).invoice.status, 'PAID');
    });

    await t.test('[S9-05][ST-5.AC-5] PAID cancel and drawer expense serialize and keep expected cash non-negative', async () => {
      const a = await freshShift();
      const soldA = await paidCashInvoice(a.cashier, { quantity: 2 });
      const [cancelA, expenseA] = await serialized(
        a.shiftId,
        () => cancel(a.manager, soldA.id),
        () => post(`/work-shifts/${a.shiftId}/expenses`, a.cashier, { amount: 120000, reason: 'Mua đá' }),
      );
      assert.equal(cancelA.status, 200);
      await expectError(expenseA, 422, 'EXPENSE_EXCEEDS_DRAWER');
      const closeA = await post(`/work-shifts/${a.shiftId}/close`, a.cashier, { countedCash: 100000 });
      assert.equal(closeA.status, 200, await closeA.clone().text());
      assert.equal((await json(closeA)).data.reconciliation.status, 'MATCHED');
      assert.ok((await reconciliationOf(a.shiftId)).expected >= 0);

      const b = await freshShift();
      const soldB = await paidCashInvoice(b.cashier, { quantity: 2 });
      const [expenseB, cancelB] = await serialized(
        b.shiftId,
        () => post(`/work-shifts/${b.shiftId}/expenses`, b.cashier, { amount: 120000, reason: 'Mua đá' }),
        () => cancel(b.manager, soldB.id),
      );
      assert.equal(expenseB.status, 201);
      await expectError(cancelB, 409, 'CANCEL_EXCEEDS_DRAWER');
      const closeB = await post(`/work-shifts/${b.shiftId}/close`, b.cashier, { countedCash: 30000 });
      assert.equal(closeB.status, 200, await closeB.clone().text());
      assert.equal((await json(closeB)).data.reconciliation.status, 'MATCHED');
      assert.ok((await reconciliationOf(b.shiftId)).expected >= 0);
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

    await t.test('[B-41] reversal of SYSTEM-sourced SALE is attributed to the canceller', async () => {
      const { cashierId, manager, managerId, shiftId, branchId } = await freshShift();
      const invoice = await seedPaidTransfer(branchId, shiftId, cashierId, 30000);
      const [sale] = await db.query(`SELECT created_by,source FROM stock_movements WHERE invoice_id=$1 AND type='SALE'`, [invoice]);
      assert.deepEqual(sale, { created_by: null, source: 'SYSTEM' }, 'precondition: webhook-shaped SALE row');
      const response = await cancel(manager, invoice);
      assert.equal(response.status, 200, await response.clone().text());
      const reversed = reversals(await snapshot(invoice));
      assert.equal(reversed.length, 1);
      assert.equal(reversed[0].quantity, '100.000');
      assert.equal(reversed[0].created_by, managerId);
      assert.equal(reversed[0].source, 'USER');
    });

    await t.test('[B-42] manager with NULL branch cannot cancel PAID', async () => {
      const { cashier } = await freshShift();
      const sold = await paidCashInvoice(cashier, { quantity: 1 });
      const before = await snapshot(sold.id);
      await insertUser(randomUUID(), storeS, null, 'MANAGER', 's9c_manager_null_paid');
      const error = await expectError(await cancel(await login('s9c_manager_null_paid'), sold.id), 404, 'NOT_FOUND');
      assert.equal(error.error.message, 'Không tìm thấy hóa đơn.');
      assert.deepEqual(await snapshot(sold.id), before);
    });

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

    await t.test('[B-48] concurrent payCash and PAID cancel in one shift do not deadlock', async () => {
      const pay = (cashier: Record<string, string>, id: string, total: number) =>
        post(`/invoices/${id}/payments`, cashier, { method: 'CASH', amount: total, tenderedAmount: total }, randomUUID());
      for (const order of ['pay first', 'cancel first'] as const) {
        const { cashier, manager, shiftId } = await freshShift();
        const paidB = await paidCashInvoice(cashier, { quantity: 2 });
        const openA = await sellOrder(cashier, { quantity: 1 });
        const payA = () => pay(cashier, openA.id, openA.total);
        const cancelB = () => cancel(manager, paidB.id);
        const [first, second] = order === 'pay first'
          ? await serialized(shiftId, payA, cancelB)
          : await serialized(shiftId, cancelB, payA);
        const [payResponse, cancelResponse] = order === 'pay first' ? [first, second] : [second, first];
        assert.equal(payResponse.status, 201, `${order}: ${await payResponse.clone().text()}`);
        assert.equal(cancelResponse.status, 200, `${order}: ${await cancelResponse.clone().text()}`);
        const afterA = await snapshot(openA.id);
        const afterB = await snapshot(paidB.id);
        assert.equal(afterA.invoice.status, 'PAID', order);
        assert.equal(afterB.invoice.status, 'CANCELLED', order);
        assert.equal(reversals(afterB).length, 2, order);
        assert.equal(stockOf(afterB, milk), '900.000', order);
        assert.equal(stockOf(afterB, sugar), '980.000', order);
      }
    });
  } finally {
    if (app) await app.close();
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});
