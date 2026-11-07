const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('../../POS_API/node_modules/pg');

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.local.json'), 'utf8'));
const base = 'http://127.0.0.1:3001/api/v1';
const origin = 'http://localhost:5173';
const ids = fixture.ids;
const sessions = {};
const db = new Client({ connectionString: process.env.DATABASE_URL });
const record = (kind, value) => console.log(JSON.stringify({ at: new Date().toISOString(), kind, ...value }));
const scrub = (value) => {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) =>
    [k, /password|token|secret|cookie|hash/i.test(k) ? '[REDACTED]' : scrub(v)]));
  return value;
};
async function login(role) {
  const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: fixture.users[role] || 'pb07_admin', password: fixture.password }) });
  const cookies = response.headers.getSetCookie();
  const names = cookies.map(c => c.split('=')[0]);
  const cookie = cookies.map(c => c.split(';')[0]).join('; ');
  const csrf = cookies.find(c => c.startsWith('__Host-pos_csrf='))?.split(';')[0].split('=')[1];
  sessions[role] = { cookie, csrf };
  record('http', { scenario: 'AUTH', actor: role, method: 'POST', path: '/auth/login', request: { username: fixture.users[role] || 'pb07_admin', password: '[REDACTED]' },
    status: response.status, requestId: response.headers.get('x-request-id'), cookieMetadata: names,
    response: scrub(await response.json()) });
}
async function request(scenario, actor, method, url, body) {
  const session = sessions[actor];
  const headers = { Cookie: session.cookie, Origin: origin };
  if (method !== 'GET') headers['X-CSRF-Token'] = session.csrf;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const raw = await response.text();
  let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  record('http', { scenario, actor, method, path: url, request: scrub(body ?? null), status: response.status,
    requestId: response.headers.get('x-request-id'), response: scrub(data) });
  return { status: response.status, data };
}
async function snapshot(scenario, label) {
  const inv = await db.query(`SELECT id,invoice_code,branch_id,work_shift_id,table_id,order_type,status,subtotal,total_amount,cancel_reason
    FROM invoices WHERE branch_id=$1 ORDER BY created_at,id`, [ids.branchA]);
  const items = await db.query(`SELECT i.id,i.invoice_id,i.product_name,i.size_name,i.unit_price,i.quantity,i.line_total,
    (SELECT count(*) FROM invoice_item_toppings t WHERE t.invoice_item_id=i.id) AS toppings FROM invoice_items i
    JOIN invoices v ON v.id=i.invoice_id WHERE v.branch_id=$1 ORDER BY i.created_at,i.id`, [ids.branchA]);
  const shifts = await db.query(`SELECT s.id,s.status,r.status AS reconciliation_status,r.counted_cash FROM work_shifts s
    JOIN cash_reconciliations r ON r.work_shift_id=s.id WHERE s.id=$1`, [ids.shiftA]);
  record('db-select', { scenario, label, query: 'invoices + invoice_items + work_shifts/cash_reconciliations by fixture branch/shift',
    invoices: inv.rows, items: items.rows, shifts: shifts.rows });
}
async function main() {
  if (!/^postgresql?:\/\/[^@]+@127\.0\.0\.1:5433\/pos_pb07_browser_[a-f0-9]+$/.test(process.env.DATABASE_URL || '')) throw Error('Sandbox URL gate failed');
  if (new URL(process.env.DATABASE_URL).pathname !== `/${fixture.database}`) throw Error('Fixture DB mismatch');
  await db.connect();
  try {
    await snapshot('PB07-BASE', 'before');
    for (const role of ['cashierA', 'managerA', 'cashierB', 'ownerA', 'admin']) await login(role);
    await request('PB07-01', 'managerA', 'POST', '/invoices', { orderType: 'TAKEAWAY' });
    await request('PB07-01', 'ownerA', 'POST', '/invoices', { orderType: 'TAKEAWAY' });
    await request('PB07-02', 'cashierA', 'POST', '/invoices', { orderType: 'DINE_IN' });
    const created = await request('PB07-01/02/03', 'cashierA', 'POST', '/invoices', { orderType: 'DINE_IN', tableId: ids.tableA });
    const invoiceId = created.data?.data?.id;
    if (!invoiceId) throw Error('DINE_IN create failed');
    await snapshot('PB07-01/02/03', 'after create');
    await request('PB07-02', 'cashierA', 'POST', '/invoices', { orderType: 'DINE_IN', tableId: ids.tableA });
    await request('PB07-03', 'cashierB', 'GET', `/invoices/${invoiceId}`);
    await request('PB07-03', 'admin', 'GET', `/invoices/${invoiceId}`);
    await request('PB07-03', 'cashierB', 'GET', '/invoices?status=OPEN&limit=20');
    await request('PB07-02', 'cashierA', 'POST', '/invoices', { orderType: 'TAKEAWAY', tableId: ids.tableB });
    const takeaway = await request('PB07-02', 'cashierA', 'POST', '/invoices', { orderType: 'TAKEAWAY' });
    await request('PB07-04/05', 'cashierA', 'POST', `/invoices/${invoiceId}/items`, { productSizeId: ids.productSize, quantity: 0 });
    const added = await request('PB07-04/05', 'cashierA', 'POST', `/invoices/${invoiceId}/items`, { productSizeId: ids.productSize, quantity: 2,
      toppings: [{ toppingId: ids.topping.toUpperCase(), quantity: 1 }] });
    const itemId = added.data?.data?.items?.[0]?.id;
    if (!itemId) throw Error('Add item failed');
    await snapshot('PB07-04/05', 'after first add');
    await request('PB07-04/05', 'cashierA', 'POST', `/invoices/${invoiceId}/items`, { productSizeId: ids.productSize, quantity: 1,
      unitPrice: 1, totalAmount: 1 });
    await request('PB07-04/05', 'cashierA', 'POST', `/invoices/${invoiceId}/items`, { productSizeId: ids.productSize, quantity: 1 });
    await snapshot('PB07-04/05', 'after second add');
    await request('PB07-04/05', 'cashierA', 'PATCH', `/invoice-items/${itemId}`, { quantity: 3 });
    await request('PB07-07', 'cashierA', 'POST', `/invoices/${invoiceId}/transfer-table`, { tableId: ids.tableA });
    await snapshot('PB07-07', 'before transfer');
    await request('PB07-07', 'cashierA', 'POST', `/invoices/${invoiceId}/transfer-table`, { tableId: ids.tableB });
    await snapshot('PB07-07', 'after transfer');
    await request('PB07-09', 'cashierA', 'POST', `/work-shifts/${ids.shiftA}/close`, { countedCash: 0 });
    await request('PB07-09', 'managerA', 'POST', `/work-shifts/${ids.shiftA}/force-close`, { countedCash: 0, reason: 'QA test' });
    await snapshot('PB07-09', 'after rejected closes');
    await request('PB07-08', 'cashierA', 'POST', `/invoices/${invoiceId}/cancel`, { reason: '' });
    await request('PB07-08', 'cashierA', 'POST', `/invoices/${invoiceId}/cancel`, { reason: 'QA test' });
    await snapshot('PB07-08', 'after cancel');
    await request('PB07-08', 'cashierA', 'POST', `/invoices/${invoiceId}/items`, { productSizeId: ids.productSize, quantity: 1 });
    const replacement = await request('PB07-08', 'cashierA', 'POST', '/invoices', { orderType: 'DINE_IN', tableId: ids.tableB });
    if (replacement.data?.data?.id) await request('PB07-08', 'cashierA', 'POST', `/invoices/${replacement.data.data.id}/cancel`, { reason: 'QA cleanup' });
    if (takeaway.data?.data?.id) await request('PB07-08', 'cashierA', 'POST', `/invoices/${takeaway.data.data.id}/cancel`, { reason: 'QA cleanup' });
    await snapshot('PB07-09', 'before successful close');
    await request('PB07-09', 'cashierA', 'POST', `/work-shifts/${ids.shiftA}/close`, { countedCash: 0 });
    await snapshot('PB07-09', 'after successful close');
  } finally { await db.end(); }
}
main().catch(error => { record('harness-error', { message: error.message }); process.exitCode = 1; });
