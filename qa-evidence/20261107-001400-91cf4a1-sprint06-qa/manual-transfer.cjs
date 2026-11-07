const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('../../POS_API/node_modules/pg');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.local.json'), 'utf8'));
const db = new Client({ connectionString: process.env.DATABASE_URL });
const base = 'http://127.0.0.1:3001/api/v1';
const out = (scenario, phase, data) => console.log(JSON.stringify({ at: new Date().toISOString(), scenario, phase, ...data }));
async function login(role) {
  const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: fixture.users[role], password: fixture.password }) });
  const cookies = r.headers.getSetCookie();
  out('AUTH', 'login', { role, status: r.status, cookieNames: cookies.map(c => c.split('=')[0]), requestId: r.headers.get('x-request-id') });
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
async function state(scenario, label, c) {
  const query = `SELECT id,invoice_code,status,table_id,subtotal,total_amount FROM invoices WHERE id=ANY($1::uuid[]) ORDER BY id`;
  const invoices = (await db.query(query, [c.invoiceIds])).rows;
  const tables = (await db.query('SELECT id,branch_id,is_active FROM dining_tables WHERE id=ANY($1::uuid[]) ORDER BY id', [c.tableIds])).rows;
  out(scenario, 'db-select', { label, query, params: c, invoices, tables });
}
async function main() {
  const u = new URL(process.env.DATABASE_URL || '');
  if (u.hostname !== '127.0.0.1' || u.port !== '5433' || u.pathname !== `/${fixture.database}` || !/^pos_pb07_browser_/.test(fixture.database)) throw Error('Sandbox gate failed');
  await db.connect();
  try {
    const owner = await login('ownerA'), cashier = await login('cashierA');
    const tableC = await req('PB07-07-RACE', owner, 'POST', '/dining-tables', { branchId: fixture.ids.branchA, name: 'QA Table C' });
    const tableD = await req('PB07-07-INACTIVE', owner, 'POST', '/dining-tables', { branchId: fixture.ids.branchA, name: 'QA Table D' });
    const cId = tableC.data?.data?.id, dId = tableD.data?.data?.id;
    if (!cId || !dId) throw Error('Table setup failed');
    await req('PB07-07-INACTIVE', owner, 'PATCH', `/dining-tables/${dId}`, { isActive: false });
    const a = await req('PB07-07-RACE', cashier, 'POST', '/invoices', { orderType: 'DINE_IN', tableId: fixture.ids.tableA });
    const b = await req('PB07-07-RACE', cashier, 'POST', '/invoices', { orderType: 'DINE_IN', tableId: fixture.ids.tableB });
    const aId = a.data?.data?.id, bId = b.data?.data?.id;
    if (!aId || !bId) throw Error('Invoice setup failed');
    await req('PB07-07-RACE', cashier, 'POST', `/invoices/${aId}/items`, { productSizeId: fixture.ids.productSize, quantity: 1 });
    await req('PB07-07-RACE', cashier, 'POST', `/invoices/${bId}/items`, { productSizeId: fixture.ids.productSize, quantity: 2 });
    const context = { invoiceIds: [aId, bId], tableIds: [fixture.ids.tableA, fixture.ids.tableB, cId, dId] };
    await state('PB07-07-RACE', 'before', context);
    await Promise.all([aId, bId].map(id => req('PB07-07-RACE', cashier, 'POST', `/invoices/${id}/transfer-table`, { tableId: cId })));
    await state('PB07-07-RACE', 'after', context);
    const stillAtOriginal = (await db.query('SELECT id FROM invoices WHERE id=ANY($1::uuid[]) AND table_id<>$2', [[aId, bId], cId])).rows[0]?.id;
    if (stillAtOriginal) await req('PB07-07-INACTIVE', cashier, 'POST', `/invoices/${stillAtOriginal}/transfer-table`, { tableId: dId });
    await state('PB07-07-INACTIVE', 'after rejection', context);
    await req('PB07-07-RACE', cashier, 'POST', `/invoices/${aId}/cancel`, { reason: 'QA transfer cleanup' });
    await req('PB07-07-RACE', cashier, 'POST', `/invoices/${bId}/cancel`, { reason: 'QA transfer cleanup' });
  } finally { await db.end(); }
}
main().catch(e => { out('HARNESS', 'error', { message: e.message }); process.exitCode = 1; });
