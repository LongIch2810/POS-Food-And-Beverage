const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('../../POS_API/node_modules/pg');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.local.json'), 'utf8'));
const transfer = fs.readFileSync(path.join(__dirname, 'manual-transfer.log'), 'utf16le').split(/\r?\n/).map(x => x.replace(/^\uFEFF/, '')).filter(x => x.startsWith('{')).map(JSON.parse);
const scope = fs.readFileSync(path.join(__dirname, 'manual-scope.log'), 'utf16le').split(/\r?\n/).map(x => x.replace(/^\uFEFF/, '')).filter(x => x.startsWith('{')).map(JSON.parse);
const transferSetup = transfer.find(x => x.scenario === 'PB07-07-RACE' && x.phase === 'http' && x.path === '/dining-tables');
const inactiveTable = transfer.find(x => x.scenario === 'PB07-07-INACTIVE' && x.phase === 'http' && x.path === '/dining-tables').response.data.id;
const cross = scope.find(x => x.scenario === 'SETUP').ids;
const db = new Client({ connectionString: process.env.DATABASE_URL });
const base = 'http://127.0.0.1:3001/api/v1';
const out = (scenario, phase, data) => console.log(JSON.stringify({ at: new Date().toISOString(), scenario, phase, ...data }));
async function login(username) {
  const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: fixture.password }) });
  const cookies = r.headers.getSetCookie();
  out('AUTH', 'login', { username, status: r.status, cookieNames: cookies.map(c => c.split('=')[0]), requestId: r.headers.get('x-request-id') });
  return { cookie: cookies.map(c => c.split(';')[0]).join('; '), csrf: cookies.find(c => c.startsWith('__Host-pos_csrf='))?.split(';')[0].split('=')[1] };
}
async function req(scenario, actor, method, url, body) {
  const headers = { Origin: 'http://localhost:5173', Cookie: actor.cookie };
  if (method !== 'GET') headers['X-CSRF-Token'] = actor.csrf;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${base}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const raw = await r.text(); let response; try { response = raw ? JSON.parse(raw) : null; } catch { response = raw; }
  out(scenario, 'http', { method, path: url, request: body ?? null, status: r.status, requestId: r.headers.get('x-request-id'), response });
  return { status: r.status, data: response };
}
async function count(scenario, label) {
  const q = `SELECT branch_id,order_type,status,count(*)::int AS count FROM invoices WHERE branch_id=ANY($1::uuid[]) GROUP BY branch_id,order_type,status ORDER BY branch_id,order_type,status`;
  out(scenario, 'db-select', { label, query: q, params: [[fixture.ids.branchA, cross.branch2]], rows: (await db.query(q, [[fixture.ids.branchA, cross.branch2]])).rows });
}
async function main() {
  const u = new URL(process.env.DATABASE_URL || '');
  if (u.hostname !== '127.0.0.1' || u.port !== '5433' || u.pathname !== `/${fixture.database}` || !/^pos_pb07_browser_/.test(fixture.database)) throw Error('Sandbox gate failed');
  await db.connect();
  try {
    const owner = await login(fixture.users.ownerA), cashier = await login(fixture.users.cashierA);
    await count('PB07-02', 'before invalid table creates');
    await req('PB07-02', cashier, 'POST', '/invoices', { orderType: 'DINE_IN', tableId: inactiveTable });
    await req('PB07-02', cashier, 'POST', '/invoices', { orderType: 'DINE_IN', tableId: cross.table2 });
    await req('PB07-02', cashier, 'POST', '/invoices', { orderType: 'DINE_IN', tableId: cross.tableForeign });
    await count('PB07-02', 'after invalid table creates');
    const topping = await req('PB07-05', cashier, 'POST', '/invoices', { orderType: 'TAKEAWAY' });
    const toppingId = topping.data?.data?.id;
    await req('PB07-05', cashier, 'POST', `/invoices/${toppingId}/items`, { productSizeId: fixture.ids.productSize, quantity: 1,
      toppings: [{ toppingId: fixture.ids.topping, quantity: 0 }] });
    await req('PB07-05', cashier, 'POST', `/invoices/${toppingId}/cancel`, { reason: 'QA extra cleanup' });
    await req('PB07-01', owner, 'PATCH', `/branches/${fixture.ids.branchA}`, { isActive: false });
    await count('PB07-01', 'before inactive branch create');
    await req('PB07-01', cashier, 'POST', '/invoices', { orderType: 'TAKEAWAY' });
    await count('PB07-01', 'after inactive branch create');
    await req('PB07-01', owner, 'PATCH', `/branches/${fixture.ids.branchA}`, { isActive: true });
    const userId = randomUUID(), shiftId = randomUUID(), reconciliationId = randomUUID(), username = 'pb07_cashier_a2';
    await db.query(`INSERT INTO users (id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
      SELECT $1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),'QA Cashier A2',$4,password_hash,false FROM users WHERE id=$5`,
      [userId, fixture.ids.storeA, cross.branch2, username, fixture.ids.cashierA]);
    await db.query("INSERT INTO work_shifts (id,branch_id,user_id,shift_type,started_at,status) VALUES ($1,$2,$3,'CASHIER',now(),'OPEN')", [shiftId, cross.branch2, userId]);
    await db.query("INSERT INTO cash_reconciliations (id,work_shift_id,opening_cash,status) VALUES ($1,$2,0,'PENDING')", [reconciliationId, shiftId]);
    out('SETUP', 'sandbox-insert', { statement: 'INSERT fixture-only cashier A2, OPEN shift, pending reconciliation in branch A2', ids: { userId, shiftId, reconciliationId, branchId: cross.branch2 } });
    const cashierA2 = await login(username);
    const other = await req('PB07-03', cashierA2, 'POST', '/invoices', { orderType: 'TAKEAWAY' });
    const otherId = other.data?.data?.id;
    await req('PB07-03', cashier, 'GET', `/invoices/${otherId}`);
    await req('PB07-03', cashier, 'GET', '/invoices?status=OPEN&limit=100');
    await req('PB07-03', owner, 'GET', `/invoices/${otherId}`);
    await count('PB07-03', 'after branch scope read');
    await req('PB07-03', cashierA2, 'POST', `/invoices/${otherId}/cancel`, { reason: 'QA branch cleanup' });
    const indexes = await db.query("SELECT indexname,indexdef FROM pg_indexes WHERE tablename='invoices' AND indexname IN ('uq_invoices_invoice_code','uq_invoices_table_open') ORDER BY indexname");
    out('PB07-02/03', 'db-select', { query: 'pg_indexes: invoice_code and open table unique indexes', rows: indexes.rows });
  } finally { await db.end(); }
}
main().catch(e => { out('HARNESS', 'error', { message: e.message }); process.exitCode = 1; });
