import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { Logger } from '@nestjs/common';
import { defaultQuery, getWithBody, InvoiceSeed, withWorld, World } from './reports.fixture';

const D14 = '2026-11-14';
const vn = (day: string, time: string) => `${day}T${time}+07:00`;
const ownerGet = async (w: World, query: Record<string, string> = defaultQuery(), who = 'owner_a') => w.get(query, await w.login(who));
// Any statement reading invoices counts as a report statement, so splitting the aggregate into several queries is detected.
const isReportSql = (sql: unknown) => typeof sql === 'string' && /\binvoices\b/.test(sql);

test('test_ST2_AC1_paid_zero_cancelled', { timeout: 120_000 }, async () => {
  await withWorld(async w => {
    const shift = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const base = { branch: w.id.a1, shift, user: 'cash_a1' };
    const cash = await w.invoice({ ...base, method: 'CASH', amount: 35000, paidAt: vn(D14, '10:00:00') });
    await w.invoice({ ...base, method: 'TRANSFER', amount: 50000, paidAt: vn(D14, '11:00:00') });
    await w.invoice({ ...base, amount: 0, paidAt: vn(D14, '12:00:00') });
    await w.invoice({ ...base, status: 'OPEN', total: 99000 });
    await w.invoice({ ...base, status: 'CANCELLED', method: 'CASH', amount: 99000, paidAt: vn(D14, '13:00:00') });

    let r = await ownerGet(w);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual({ ...r.body.data, dailyRevenue: undefined, bestSellers: undefined },
      { date: D14, invoiceCount: 3, totalRevenue: 85000, cashRevenue: 35000, transferRevenue: 50000, dailyRevenue: undefined, bestSellers: undefined });

    const manager = await w.login('mgr_a1');
    const cancelled = await w.post(`/invoices/${cash}/cancel`, manager, { reason: 'Khách đổi ý' });
    assert.equal(cancelled.status, 200, await cancelled.clone().text());
    r = await ownerGet(w);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.body.data.invoiceCount, r.body.data.cashRevenue, r.body.data.transferRevenue, r.body.data.totalRevenue], [2, 0, 50000, 50000]);

    r = await ownerGet(w, defaultQuery({ date: '2026-11-20', fromDate: '2026-11-20', toDate: '2026-11-20' }));
    assert.deepEqual(r.body.data, { date: '2026-11-20', invoiceCount: 0, totalRevenue: 0, cashRevenue: 0, transferRevenue: 0,
      dailyRevenue: [{ date: '2026-11-20', revenue: 0 }], bestSellers: [] });
  });
});

test('test_ST2_AC1_vietnam_midnight', { timeout: 120_000 }, async () => {
  await withWorld(async w => {
    const shift = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const base = { branch: w.id.a1, shift, user: 'cash_a1', method: 'CASH' as const };
    await w.invoice({ ...base, amount: 10000, paidAt: '2026-11-13T16:59:59.999Z' });
    await w.invoice({ ...base, amount: 20000, paidAt: '2026-11-13T17:00:00.000Z' });
    await w.invoice({ ...base, amount: 30000, paidAt: '2026-11-14T16:59:59.999Z' });
    await w.invoice({ ...base, amount: 40000, paidAt: '2026-11-14T17:00:00.000Z' });
    const r = await ownerGet(w, { date: D14, fromDate: '2026-11-13', toDate: '2026-11-15' });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.body.data.invoiceCount, 2);
    assert.equal(r.body.data.totalRevenue, 50000);
    assert.deepEqual(r.body.data.dailyRevenue, [
      { date: '2026-11-13', revenue: 10000 }, { date: D14, revenue: 50000 }, { date: '2026-11-15', revenue: 40000 }]);
    // Chart range of exactly the report day: rows at the first and last instant of that VN day are inside it.
    const single = await ownerGet(w, { date: D14, fromDate: D14, toDate: D14 });
    assert.equal(single.status, 200, single.text);
    assert.deepEqual([single.body.data.invoiceCount, single.body.data.totalRevenue], [2, 50000]);
    assert.deepEqual(single.body.data.dailyRevenue, [{ date: D14, revenue: 50000 }]);
  });
});

test('test_ST2_AC2_payment_amount_not_received', { timeout: 120_000 }, async () => {
  await withWorld(async w => {
    const shift = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const base = { branch: w.id.a1, shift, user: 'cash_a1' };
    await w.invoice({ ...base, method: 'CASH', amount: 35000, extra: 15000 });
    await w.invoice({ ...base, method: 'TRANSFER', amount: 50000, extra: 10000 });
    const r = await ownerGet(w);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.body.data.cashRevenue, r.body.data.transferRevenue, r.body.data.totalRevenue], [35000, 50000, 85000]);
    assert.equal(r.body.data.dailyRevenue.at(-1).revenue, 85000);
  });
});

// Bulk seed: n invoices of `amount` paid at `paidAt`, optionally with a payment and/or one item each.
async function bulk(w: World, o: { shift: string; from: number; count: number; amount: (g: number) => number; paidAt: string; payment: boolean; ps?: string }) {
  await w.db.query(`
    WITH inv AS (
      INSERT INTO invoices(id,branch_id,work_shift_id,invoice_code,created_by,order_type,status,subtotal,total_amount,paid_at)
      SELECT gen_random_uuid(),$1,$2,'HDZ'||lpad(g::text,7,'0'),$3,'TAKEAWAY','PAID',a,a,$4::timestamptz
      FROM (SELECT g, (CASE WHEN g<=9007 THEN 1000000000000 ELSE 199254740991 END)::bigint AS a FROM generate_series($5::int,$6::int) g) s
      RETURNING id, total_amount, subtotal
    ), pay AS (
      INSERT INTO payments(id,invoice_id,method,amount,idempotency_key,idempotency_request_hash,tendered_amount,change_amount,created_by)
      SELECT gen_random_uuid(),id,'CASH',total_amount,gen_random_uuid(),repeat('a',64),total_amount,0,$3 FROM inv WHERE $7::boolean
      RETURNING 1
    )
    INSERT INTO invoice_items(id,invoice_id,product_size_id,product_name,size_name,unit_price,quantity,line_total)
    SELECT gen_random_uuid(),id,$8::uuid,'Bulk','M',1000000000000,1,1000000000000 FROM inv WHERE $8::uuid IS NOT NULL`,
  [w.id.a1, o.shift, w.id.cash_a1, o.paidAt, o.from, o.from + o.count - 1, o.payment, o.ps ?? null]);
}

test('test_ST2_AC2_safe_money', { timeout: 300_000 }, async () => {
  await withWorld(async w => {
    const shift = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const logs = mock.method(Logger, 'error', () => undefined);
    try {
      // (a) aggregate exactly Number.MAX_SAFE_INTEGER = 9007 * 1e12 + 199254740991 is returned exactly.
      await bulk(w, { shift, from: 1, count: 9008, amount: () => 0, paidAt: vn(D14, '10:00:00'), payment: true });
      let r = await ownerGet(w);
      assert.equal(r.status, 200, r.text);
      assert.equal(r.body.data.totalRevenue, 9007199254740991);
      assert.equal(r.body.data.cashRevenue, 9007199254740991);
      assert.equal(r.body.data.dailyRevenue.at(-1).revenue, 9007199254740991);
      assert.equal(logs.mock.callCount(), 0);

      // (b) one more dong -> 9007199254740992 total: 500, no data, logged.
      await w.invoice({ branch: w.id.a1, shift, user: 'cash_a1', method: 'CASH', amount: 1 });
      r = await ownerGet(w);
      assert.equal(r.status, 500);
      assert.equal(r.body.data, undefined);
      assert.equal(r.body.error.code, 'INTERNAL_ERROR');
      assert.equal(r.body.error.message, 'Hệ thống gặp lỗi. Vui lòng thử lại sau.');
      assert.ok(logs.mock.callCount() >= 1, 'unsafe total must be logged');

      // (c) unsafe only on a chart day (13th) while the report date total (14th) is safe.
      await w.db.query(`UPDATE invoices SET paid_at = paid_at - interval '1 day'`);
      logs.mock.resetCalls();
      r = await ownerGet(w);
      assert.equal(r.status, 500, 'unsafe daily point must fail');
      assert.equal(r.body.data, undefined);
      assert.ok(logs.mock.callCount() >= 1);
      r = await ownerGet(w, defaultQuery({ fromDate: D14, toDate: D14 }));
      assert.equal(r.status, 200, 'chart range excluding the unsafe day is fine');
      assert.equal(r.body.data.totalRevenue, 0);

      // (d) unsafe only in a best seller: zero-value invoices (no payment) whose item lines sum above the limit.
      await w.db.query('DELETE FROM payments'); await w.db.query('DELETE FROM invoices');
      const ps = await w.productSize(w.id.storeA, 'Bulk', 'M');
      await bulk(w, { shift, from: 1, count: 9008, amount: () => 0, paidAt: vn(D14, '10:00:00'), payment: false, ps });
      logs.mock.resetCalls();
      r = await ownerGet(w);
      assert.equal(r.status, 500, 'unsafe best seller revenue must fail');
      assert.equal(r.body.data, undefined);
      assert.ok(logs.mock.callCount() >= 1);
    } finally { logs.mock.restore(); }
  });
});

test('test_ST2_AC3_scope_permissions_http', { timeout: 180_000 }, async () => {
  await withWorld(async w => {
    const sA1 = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const sA2 = await w.shift({ user: 'cash_a2', branch: w.id.a2 });
    const sB = await w.shift({ user: 'cash_b', branch: w.id.b1 });
    await w.invoice({ branch: w.id.a1, shift: sA1, user: 'cash_a1', method: 'CASH', amount: 10000 });
    await w.invoice({ branch: w.id.a2, shift: sA2, user: 'cash_a2', method: 'CASH', amount: 20000 });
    await w.invoice({ branch: w.id.b1, shift: sB, user: 'cash_b', method: 'CASH', amount: 40000 });
    const total = async (who: string, extra: Record<string, string> = {}) => {
      const r = await ownerGet(w, defaultQuery(extra), who);
      return r.status === 200 ? r.body.data.totalRevenue : r.status;
    };

    assert.equal((await w.get(defaultQuery())).status, 401);
    assert.equal((await w.get(defaultQuery(), { Cookie: '__Host-pos_access=bad' })).status, 401);
    // OWNER: whole store, chosen branch (also upper-case UUID), foreign branch is 404, other store isolated.
    assert.equal(await total('owner_a'), 30000);
    assert.equal(await total('owner_a', { branchId: w.id.a1 }), 10000);
    assert.equal(await total('owner_a', { branchId: w.id.a2 }), 20000);
    assert.equal(await total('owner_a', { branchId: w.id.a1.toUpperCase() }), 10000);
    assert.equal(await total('owner_a', { branchId: w.id.b1 }), 404);
    assert.equal(await total('owner_b'), 40000);
    // Restricted branch users: client branchId (other branch, foreign branch, garbage) is ignored.
    assert.equal(await total('mgr_a1'), 10000);
    assert.equal(await total('mgr_a1', { branchId: w.id.a2 }), 10000);
    assert.equal(await total('mgr_a1', { branchId: w.id.b1 }), 10000);
    assert.equal(await total('mgr_a1', { branchId: 'not-a-uuid' }), 10000);
    assert.equal(await total('mgr_a2'), 20000);
    // CASHIER: own shift only.
    assert.equal(await total('cash_a1', { shiftId: sA1 }), 10000);
    assert.equal(await total('cash_a1', { shiftId: sA1, branchId: w.id.a2 }), 10000);
    // Missing branch identity and no access_all must not fail open.
    assert.equal(await total('mgr_nobranch'), 403);
    // PLATFORM_ADMIN is blocked, even if report permissions were added to the role in the fixture.
    assert.equal(await total('admin'), 403);
    await w.db.query(`INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r,permissions p WHERE r.name='PLATFORM_ADMIN' AND (p.code LIKE 'report.%' OR p.code='branch.access_all')`);
    assert.equal(await total('admin'), 403);
    // view_all without branch.access_all must not aggregate the whole store.
    await w.db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='OWNER') AND permission_id=(SELECT id FROM permissions WHERE code='branch.access_all')`);
    assert.equal(await total('owner_a'), 403);
    await w.db.query(`INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r,permissions p WHERE r.name='OWNER' AND p.code='branch.access_all'`);
    assert.equal(await total('owner_a'), 30000);
    // Missing report permission.
    await w.db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='MANAGER') AND permission_id=(SELECT id FROM permissions WHERE code='report.view_branch')`);
    assert.equal(await total('mgr_a1'), 403);
    await w.db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='CASHIER') AND permission_id=(SELECT id FROM permissions WHERE code='report.view_shift')`);
    assert.equal(await total('cash_a1', { shiftId: sA1 }), 403);
  });
});

test('test_ST2_AC4_own_open_closed_shift', { timeout: 180_000 }, async () => {
  await withWorld(async w => {
    const open = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const closed = await w.shift({ user: 'cash_a1', branch: w.id.a1, status: 'CLOSED', startedAt: '2026-11-10T01:00:00Z', endedAt: '2026-11-10T05:00:00Z' });
    const other = await w.shift({ user: 'cash_a1b', branch: w.id.a1, status: 'CLOSED', startedAt: '2026-11-10T01:00:00Z', endedAt: '2026-11-10T05:00:00Z' });
    const foreign = await w.shift({ user: 'cash_b', branch: w.id.b1 });
    const sameStoreOtherBranch = await w.shift({ user: 'cash_a2', branch: w.id.a2 });
    const own = { branch: w.id.a1, user: 'cash_a1', method: 'CASH' as const };
    const psA = await w.productSize(w.id.storeA, 'Cafe', 'M');
    const item = (qty: number, line: number) => [{ ps: psA, name: 'Cafe', size: 'M', qty, line }];
    await w.invoice({ ...own, shift: open, amount: 10000, items: item(1, 10000) });
    await w.invoice({ ...own, shift: closed, amount: 7000, paidAt: vn(D14, '09:00:00'), items: item(7, 7000) });
    await w.invoice({ branch: w.id.a1, user: 'cash_a1b', method: 'CASH', shift: other, amount: 500000, items: item(50, 500000) });
    await w.invoice({ branch: w.id.b1, user: 'cash_b', method: 'CASH', shift: foreign, amount: 900000 });
    const headers = await w.login('cash_a1');
    const q = (shiftId?: string) => w.get(defaultQuery(shiftId ? { shiftId } : {}), headers);

    let r = await q(open);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.body.data.invoiceCount, 1);
    assert.equal(r.body.data.totalRevenue, 10000);
    assert.equal(r.body.data.dailyRevenue.at(-1).revenue, 10000);
    assert.deepEqual(r.body.data.bestSellers.map((b: any) => [b.quantity, b.revenue]), [[1, 10000]]);
    r = await q(closed);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.body.data.invoiceCount, r.body.data.totalRevenue], [1, 7000]);
    assert.deepEqual(r.body.data.bestSellers.map((b: any) => [b.quantity, b.revenue]), [[7, 7000]]);
    r = await q(open.toUpperCase());
    assert.equal(r.status, 200, 'upper-case UUID is the same shift');
    assert.equal(r.body.data.totalRevenue, 10000);
    r = await q();
    assert.equal(r.status, 422);
    assert.equal(r.body.error.details[0].location, 'query');
    assert.equal(r.body.error.details[0].field, 'shiftId');
    assert.equal((await q(other)).status, 403);
    assert.equal((await q(foreign)).status, 404);
    assert.equal((await q('00000000-0000-4000-8000-000000000000')).status, 404);
    assert.equal((await q('not-a-uuid')).status, 422);
    // A manager may use the same shift id as a branch-wide filter; foreign store shift is still 404.
    const manager = await w.login('mgr_a1');
    r = await w.get(defaultQuery({ shiftId: other }), manager);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.body.data.totalRevenue, 500000);
    assert.equal((await w.get(defaultQuery({ shiftId: foreign }), manager)).status, 404);
    // [B-54] Shift of another branch in the same store is 404 for restricted branch users (branch condition on the shift lookup).
    assert.equal((await q(sameStoreOtherBranch)).status, 404, 'cashier a1 must not see a2 shift');
    assert.equal((await w.get(defaultQuery({ shiftId: sameStoreOtherBranch }), manager)).status, 404, 'manager a1 must not see a2 shift');
  });
});

test('test_ST2_AC4_shift_crosses_midnight', { timeout: 120_000 }, async () => {
  await withWorld(async w => {
    const shift = await w.shift({ user: 'cash_a1', branch: w.id.a1, startedAt: '2026-11-14T15:00:00Z' });
    const base = { branch: w.id.a1, user: 'cash_a1', method: 'CASH' as const };
    await w.invoice({ ...base, shift, amount: 20000, paidAt: vn(D14, '23:30:00') });
    await w.invoice({ ...base, shift, amount: 30000, paidAt: vn('2026-11-15', '00:30:00') });
    const headers = await w.login('cash_a1');
    const day = async (date: string) => { const r = await w.get({ date, fromDate: D14, toDate: '2026-11-15', shiftId: shift }, headers); assert.equal(r.status, 200, r.text); return r.body.data; };
    const d14 = await day(D14), d15 = await day('2026-11-15');
    assert.deepEqual([d14.invoiceCount, d14.totalRevenue], [1, 20000]);
    assert.deepEqual([d15.invoiceCount, d15.totalRevenue], [1, 30000]);
    assert.deepEqual(d14.dailyRevenue, [{ date: D14, revenue: 20000 }, { date: '2026-11-15', revenue: 30000 }]);
  });
});

test('test_ST2_AC5_days_range_validation', { timeout: 180_000 }, async () => {
  await withWorld(async w => {
    const shift = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const base = { branch: w.id.a1, shift, user: 'cash_a1', method: 'CASH' as const };
    await w.invoice({ ...base, amount: 1000, paidAt: vn('2026-11-01', '10:00:00') });
    await w.invoice({ ...base, amount: 3000, paidAt: vn('2026-11-03', '10:00:00') });
    await w.invoice({ ...base, amount: 5000, paidAt: vn(D14, '10:00:00') });
    const headers = await w.login('owner_a');
    const ok = async (query: Record<string, string>) => { const r = await w.get(query, headers); assert.equal(r.status, 200, r.text); return r.body.data; };

    const week = await ok({ date: D14, fromDate: '2026-11-01', toDate: '2026-11-07' });
    assert.deepEqual(week.dailyRevenue, [1000, 0, 3000, 0, 0, 0, 0].map((revenue, i) => ({ date: `2026-11-0${i + 1}`, revenue })));
    assert.deepEqual([week.invoiceCount, week.totalRevenue], [1, 5000]);
    assert.equal((await ok({ date: D14, fromDate: D14, toDate: D14 })).dailyRevenue.length, 1);
    assert.equal((await ok({ date: D14, fromDate: '2026-10-15', toDate: '2026-11-14' })).dailyRevenue.length, 31);
    assert.equal((await ok({ date: '2028-02-29', fromDate: '2028-02-28', toDate: '2028-02-29' })).dailyRevenue.length, 2);

    const invalid: [string, string | Record<string, string>][] = [
      ['32 days', { date: D14, fromDate: '2026-10-14', toDate: D14 }],
      ['reversed', { date: D14, fromDate: D14, toDate: '2026-11-13' }],
      ['not a calendar day', { date: '2026-02-30', fromDate: '2026-02-28', toDate: '2026-02-28' }],
      ['not a leap year', { date: '2027-02-29', fromDate: '2027-02-28', toDate: '2027-02-28' }],
      ['missing date', { fromDate: D14, toDate: D14 }],
      ['missing fromDate', { date: D14, toDate: D14 }],
      ['missing toDate', { date: D14, fromDate: D14 }],
      ['empty date', { date: '', fromDate: D14, toDate: D14 }],
      ['bad format', { date: '14/11/2026', fromDate: D14, toDate: D14 }],
      ['unknown field', { ...defaultQuery(), foo: '1' }],
      ['bad branchId for all-store user', { ...defaultQuery(), branchId: 'zzz' }],
      ['array date', `date=${D14}&date=${D14}&fromDate=${D14}&toDate=${D14}`],
      ['array bracket', `date[]=${D14}&fromDate=${D14}&toDate=${D14}`],
      ['object date', `date[a]=1&fromDate=${D14}&toDate=${D14}`],
    ];
    for (const [label, query] of invalid) {
      const r = await w.get(query, headers);
      assert.equal(r.status, 422, `${label}: ${r.text}`);
      assert.equal(r.body.error.code, 'VALIDATION_ERROR', label);
      assert.equal(r.body.error.message, 'Dữ liệu gửi lên không hợp lệ.', label);
      assert.ok(Array.isArray(r.body.error.details), label);
      assert.ok(r.body.error.requestId, label);
    }
    const detail = (await w.get({ date: '2026-02-30', fromDate: D14, toDate: D14 }, headers)).body.error.details;
    assert.deepEqual(detail, [{ location: 'query', field: 'date', message: 'Giá trị không hợp lệ.' }]);
    const body = await getWithBody(`${w.base}/reports/revenue?${new URLSearchParams(defaultQuery())}`, { Cookie: headers.Cookie }, '{"a":1}');
    assert.equal(body.status, 422);
    assert.equal(body.body.error.code, 'VALIDATION_ERROR');
  });
});

test('test_ST2_AC6_sizes_snapshots_toppings', { timeout: 180_000 }, async () => {
  await withWorld(async w => {
    const shift = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const shiftOther = await w.shift({ user: 'cash_a2', branch: w.id.a2 });
    const shiftB = await w.shift({ user: 'cash_b', branch: w.id.b1 });
    const A = w.id.storeA;
    const p1 = await w.productSize(A, 'P1', 'M'), p2 = await w.productSize(A, 'P2', 'M'), p3 = await w.productSize(A, 'P3', 'M');
    const p4 = await w.productSize(A, 'P4', 'M'), p5 = await w.productSize(A, 'P5', 'M');
    const rename = await w.productSize(A, 'Rename', 'M');
    const dup1 = await w.productSize(A, 'Dup', 'M', 'CatX'), dup2 = await w.productSize(A, 'Dup', 'M', 'CatY');
    const tieL = await w.productSize(A, 'Tie', 'L'), tieM = await w.productSize(A, 'Tie', 'M');
    const low1 = await w.productSize(A, 'Low1', 'M'), low2 = await w.productSize(A, 'Low2', 'M');
    const bProduct = await w.productSize(w.id.storeB, 'P1', 'M');
    const base = { branch: w.id.a1, shift, user: 'cash_a1', method: 'CASH' as const };
    const one = (ps: string, name: string, size: string, qty: number, price = 20000) => ({ ps, name, size, qty, line: qty * price });
    const sell = (items: NonNullable<InvoiceSeed['items']>, at = '10:00:00', o: object = {}) =>
      w.invoice({ ...base, amount: items.reduce((s, i) => s + i.line, 0), paidAt: vn(D14, at), items, ...o });

    // P1: 30000 + topping 5000 in one line (35000), then price changed to 28000 with an order-level discount.
    await sell([{ ps: p1, name: 'P1', size: 'M', qty: 1, line: 35000, unit: 30000, topping: 5000 }]);
    await sell([{ ps: p1, name: 'P1', size: 'M', qty: 11, line: 308000, unit: 28000 }], '10:30:00', { discount: 3000 });
    await sell([one(p2, 'P2', 'M', 11)]); await sell([one(p3, 'P3', 'M', 10)]); await sell([one(p4, 'P4', 'M', 9)]); await sell([one(p5, 'P5', 'M', 8)]);
    // Rename: same size under two names; the most recently paid snapshot wins.
    await sell([one(rename, 'Old', 'M', 4)], '08:00:00'); await sell([one(rename, 'New', 'M', 3)], '09:00:00');
    await sell([one(dup1, 'Dup', 'M', 6)]); await sell([one(dup2, 'Dup', 'M', 6)]);
    await sell([one(tieL, 'Tie', 'L', 5)]); await sell([one(tieM, 'Tie', 'M', 5)]);
    await sell([one(low1, 'Low1', 'M', 2)]); await sell([one(low2, 'Low2', 'M', 1)]);
    // Noise that must not change anything for MANAGER A1: OPEN, CANCELLED, other branch/shift, other store, other day.
    await w.invoice({ ...base, method: null, status: 'OPEN', total: 1, items: [one(p1, 'P1', 'M', 100)] });
    await w.invoice({ ...base, status: 'CANCELLED', method: 'CASH', amount: 1, paidAt: vn(D14, '11:00:00'), items: [one(p1, 'P1', 'M', 100)] });
    await w.invoice({ branch: w.id.a2, shift: shiftOther, user: 'cash_a2', amount: 0, paidAt: vn(D14, '11:00:00'), items: [one(p1, 'P1', 'M', 50)] });
    await w.invoice({ branch: w.id.b1, shift: shiftB, user: 'cash_b', amount: 0, paidAt: vn(D14, '11:00:00'), items: [one(bProduct, 'P1', 'M', 50)] });
    await sell([one(p1, 'P1', 'M', 70)], '10:00:00', { paidAt: vn('2026-11-13', '10:00:00') });

    const r = await ownerGet(w, defaultQuery(), 'mgr_a1');
    assert.equal(r.status, 200, r.text);
    const dups = [dup1, dup2].sort();
    const expected = [
      [p1, 'P1', 'M', 12, 343000], [p2, 'P2', 'M', 11, 220000], [p3, 'P3', 'M', 10, 200000], [p4, 'P4', 'M', 9, 180000],
      [p5, 'P5', 'M', 8, 160000], [rename, 'New', 'M', 7, 140000], [dups[0], 'Dup', 'M', 6, 120000], [dups[1], 'Dup', 'M', 6, 120000],
      [tieL, 'Tie', 'L', 5, 100000], [tieM, 'Tie', 'M', 5, 100000],
    ];
    assert.deepEqual(r.body.data.bestSellers.map((b: any) => [b.productSizeId, b.productName, b.sizeName, b.quantity, b.revenue]), expected);
    const ownerView = await ownerGet(w, defaultQuery(), 'owner_a');
    assert.equal(ownerView.body.data.bestSellers[0].quantity, 62, 'owner sees both branches of store A: P1 12 + 50');
  });
});

test('test_ST2_AC7_consistent_statement', { timeout: 180_000 }, async () => {
  await withWorld(async w => {
    const shift = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const ids: string[] = [];
    for (let i = 0; i < 24; i++) ids.push(await w.invoice({ branch: w.id.a1, shift, user: 'cash_a1', method: 'CASH', amount: 1000 }));
    const headers = await w.login('owner_a');
    const original = w.db.query.bind(w.db) as (...args: any[]) => Promise<any>;
    let reportStatements = 0, beforeStatement: (() => Promise<void>) | undefined;
    const spy = mock.method(w.db, 'query', async (sql: string, params?: unknown[]) => {
      if (isReportSql(sql)) { reportStatements++; await beforeStatement?.(); }
      return original(sql, params);
    });
    try {
      // Barrier: a cancel commits after the request is accepted but before the single statement runs.
      beforeStatement = async () => { beforeStatement = undefined; await original(`UPDATE invoices SET status='CANCELLED',cancelled_at=now(),cancelled_by=$2,cancel_reason='x' WHERE id=$1`, [ids[0], w.id.cash_a1]); };
      let r = await w.get(defaultQuery(), headers);
      assert.equal(r.status, 200, r.text);
      assert.equal(reportStatements, 1, 'one aggregate statement per request');
      assert.equal(r.body.data.invoiceCount, 23);
      assert.equal(r.body.data.totalRevenue, 23000);
      assert.equal(r.body.data.dailyRevenue.at(-1).revenue, 23000);
      // Concurrent cancels while many reads run: every response is internally consistent.
      reportStatements = 0;
      const canceller = (async () => { for (const id of ids.slice(1, 20)) await original(`UPDATE invoices SET status='CANCELLED',cancelled_at=now(),cancelled_by=$2,cancel_reason='x' WHERE id=$1`, [id, w.id.cash_a1]); })();
      const responses = await Promise.all(Array.from({ length: 30 }, () => w.get(defaultQuery(), headers)));
      await canceller;
      for (const response of responses) {
        assert.equal(response.status, 200, response.text);
        const data = response.body.data;
        assert.equal(data.totalRevenue, data.invoiceCount * 1000);
        assert.equal(data.totalRevenue, data.dailyRevenue.at(-1).revenue, 'total and chart point come from one snapshot');
      }
      assert.equal(reportStatements, 30);
    } finally { spy.mock.restore(); }
  });
});

test('test_ST2_AC7_failure_readonly', { timeout: 180_000 }, async () => {
  await withWorld(async w => {
    const shift = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const ps = await w.productSize(w.id.storeA, 'Cafe', 'M');
    await w.invoice({ branch: w.id.a1, shift, user: 'cash_a1', method: 'CASH', amount: 20000, items: [{ ps, name: 'Cafe', size: 'M', qty: 1, line: 20000 }] });
    const headers = await w.login('owner_a');
    const tables = ['invoices', 'invoice_items', 'payments', 'work_shifts', 'cash_reconciliations', 'permissions', 'role_permissions', 'users', 'stock_movements'];
    const digest = async () => Object.fromEntries(await Promise.all(tables.map(async t =>
      [t, (await w.db.query(`SELECT count(*)::int AS n, md5(COALESCE(string_agg(x::text,'' ORDER BY x::text),'')) AS h FROM ${t} x`))[0]])));
    const before = await digest();

    const original = w.db.query.bind(w.db) as (...args: any[]) => Promise<any>;
    const spy = mock.method(w.db, 'query', async (sql: string, params?: unknown[]) => {
      if (isReportSql(sql)) throw new Error('relation "secret_ledger" does not exist; SELECT password_hash FROM users');
      return original(sql, params);
    });
    try {
      const response = await fetch(`${w.base}/reports/revenue?${new URLSearchParams(defaultQuery())}`, { headers: { Cookie: headers.Cookie, 'X-Request-Id': 'req-reports-500' } });
      const text = await response.text();
      assert.equal(response.status, 500);
      const body = JSON.parse(text);
      assert.equal(body.error.code, 'INTERNAL_ERROR');
      assert.equal(body.error.message, 'Hệ thống gặp lỗi. Vui lòng thử lại sau.');
      assert.equal(body.error.requestId, 'req-reports-500');
      assert.equal(body.data, undefined);
      assert.ok(!/secret_ledger|password_hash|SELECT/i.test(text), 'SQL must not leak');
    } finally { spy.mock.restore(); }
    const ok = await w.get(defaultQuery(), headers);
    assert.equal(ok.status, 200, ok.text);
    assert.equal(ok.body.data.totalRevenue, 20000);
    assert.deepEqual(await digest(), before, 'GET must not change business data');
  });
});

// [R1-3] date nằm TRƯỚC khoảng biểu đồ: chỉ số/món vẫn theo date, chart chỉ theo khoảng.
test('test_ST2_AC5_date_before_chart_range', { timeout: 180_000 }, async () => {
  await withWorld(async w => {
    const shift = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const base = { branch: w.id.a1, shift, user: 'cash_a1', method: 'CASH' as const };
    const early = await w.productSize(w.id.storeA, 'Early', 'M'), late = await w.productSize(w.id.storeA, 'Late', 'M');
    await w.invoice({ ...base, amount: 5000, paidAt: vn(D14, '10:00:00'), items: [{ ps: early, name: 'Early', size: 'M', qty: 1, line: 5000 }] });
    await w.invoice({ ...base, amount: 1000, paidAt: vn('2026-11-16', '10:00:00'), items: [{ ps: late, name: 'Late', size: 'M', qty: 1, line: 1000 }] });
    const r = await w.get({ date: D14, fromDate: '2026-11-15', toDate: '2026-11-17' }, await w.login('owner_a'));
    assert.equal(r.status, 200, r.text);
    const data = r.body.data;
    assert.deepEqual([data.invoiceCount, data.totalRevenue], [1, 5000]);
    assert.deepEqual(data.bestSellers.map((b: { productName: string }) => b.productName), ['Early']);
    assert.deepEqual(data.dailyRevenue, [{ date: '2026-11-15', revenue: 0 }, { date: '2026-11-16', revenue: 1000 }, { date: '2026-11-17', revenue: 0 }]);
  });
});

// [B-57] Revenue day comes from invoices.paid_at; payments.paid_at is ignored.
test('[B-57] test_ST2_AC1_invoice_paid_at_not_payment_paid_at', { timeout: 120_000 }, async () => {
  await withWorld(async w => {
    const shift = await w.shift({ user: 'cash_a1', branch: w.id.a1 });
    const base = { branch: w.id.a1, shift, user: 'cash_a1', paidAt: vn(D14, '10:00:00'), paymentPaidAt: vn('2026-11-13', '10:00:00') };
    await w.invoice({ ...base, method: 'CASH', amount: 35000 });
    await w.invoice({ ...base, method: 'TRANSFER', amount: 50000 });
    const r = await ownerGet(w, { date: D14, fromDate: '2026-11-13', toDate: D14 });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.body.data.invoiceCount, r.body.data.cashRevenue, r.body.data.transferRevenue, r.body.data.totalRevenue], [2, 35000, 50000, 85000]);
    assert.deepEqual(r.body.data.dailyRevenue, [{ date: '2026-11-13', revenue: 0 }, { date: D14, revenue: 85000 }]);
  });
});

// [B-56] Permission (store identity + report.view_*) is decided before query validation: no permission -> 403, with permission -> 422.
test('[B-56] test_ST2_AC3_permission_before_validation', { timeout: 180_000 }, async () => {
  await withWorld(async w => {
    const bad = { date: 'bad', fromDate: D14, toDate: D14 };
    const status = async (who: string) => (await ownerGet(w, bad, who)).status;
    assert.equal(await status('owner_a'), 422);
    assert.equal(await status('mgr_a1'), 422);
    assert.equal(await status('cash_a1'), 422);
    assert.equal(await status('admin'), 403);
    await w.db.query(`INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r,permissions p WHERE r.name='PLATFORM_ADMIN' AND (p.code LIKE 'report.%' OR p.code='branch.access_all')`);
    assert.equal(await status('admin'), 403, 'platform admin has no store even with report permissions');
    await w.db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='OWNER') AND permission_id=(SELECT id FROM permissions WHERE code='branch.access_all')`);
    assert.equal(await status('owner_a'), 403, 'view_all without access_all');
    await w.db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='MANAGER') AND permission_id=(SELECT id FROM permissions WHERE code='report.view_branch')`);
    assert.equal(await status('mgr_a1'), 403, 'manager without report permission');
    await w.db.query(`DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='CASHIER') AND permission_id=(SELECT id FROM permissions WHERE code='report.view_shift')`);
    assert.equal(await status('cash_a1'), 403, 'cashier without report permission');
  });
});
