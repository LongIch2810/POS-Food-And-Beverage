const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('../../POS_API/node_modules/pg');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.local.json'), 'utf8'));
const ids = fixture.ids;
const db = new Client({ connectionString: process.env.DATABASE_URL });
const base = 'http://127.0.0.1:3001/api/v1';
const out = (scenario, phase, data) => console.log(JSON.stringify({ at: new Date().toISOString(), scenario, phase, ...data }));
async function login() {
  const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: fixture.users.cashierA, password: fixture.password }) });
  const cookies = r.headers.getSetCookie();
  out('AUTH', 'login', { status: r.status, cookieNames: cookies.map(c => c.split('=')[0]), requestId: r.headers.get('x-request-id') });
  return { cookie: cookies.map(c => c.split(';')[0]).join('; '), csrf: cookies.find(c => c.startsWith('__Host-pos_csrf='))?.split(';')[0].split('=')[1] };
}
async function req(scenario, session, method, url, body) {
  const headers = { Origin: 'http://localhost:5173', Cookie: session.cookie };
  if (method !== 'GET') headers['X-CSRF-Token'] = session.csrf;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${base}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let response; try { response = text ? JSON.parse(text) : null; } catch { response = text; }
  out(scenario, 'http', { method, path: url, request: body ?? null, status: r.status, requestId: r.headers.get('x-request-id'), response });
  return { status: r.status, data: response };
}
async function state(scenario, label) {
  const q = `SELECT v.id,v.invoice_code,v.status,v.order_type,v.table_id,v.subtotal,count(i.id)::int AS items
    FROM invoices v LEFT JOIN invoice_items i ON i.invoice_id=v.id WHERE v.branch_id=$1
    GROUP BY v.id ORDER BY v.created_at,v.id`;
  const rows = (await db.query(q, [ids.branchA])).rows;
  out(scenario, 'db-select', { label, query: q, params: [ids.branchA], rows });
}
async function main() {
  const parsed = new URL(process.env.DATABASE_URL || '');
  if (parsed.hostname !== '127.0.0.1' || parsed.port !== '5433' || parsed.pathname !== `/${fixture.database}` || !/^pos_pb07_browser_/.test(fixture.database)) throw Error('Sandbox gate failed');
  await db.connect();
  try {
    const s = await login();
    await state('PB07-02-RACE', 'before');
    const creates = await Promise.all([1, 2].map(() => req('PB07-02-RACE', s, 'POST', '/invoices', { orderType: 'DINE_IN', tableId: ids.tableA })));
    await state('PB07-02-RACE', 'after');
    const winner = creates.find(x => x.status === 201)?.data?.data?.id;
    if (!winner) throw Error('Race produced no invoice');
    await req('PB07-07-BUSY', s, 'POST', `/invoices/${winner}/transfer-table`, { tableId: ids.tableB });
    const busy = await req('PB07-07-BUSY', s, 'POST', '/invoices', { orderType: 'DINE_IN', tableId: ids.tableA });
    await req('PB07-07-BUSY', s, 'POST', `/invoices/${winner}/transfer-table`, { tableId: ids.tableA });
    await state('PB07-07-BUSY', 'after');
    const second = await req('PB07-05-RACE', s, 'POST', '/invoices', { orderType: 'TAKEAWAY' });
    const id = second.data?.data?.id;
    if (!id) throw Error('Takeaway create failed');
    await state('PB07-05-RACE', 'before');
    await Promise.all([1, 2].map(() => req('PB07-05-RACE', s, 'POST', `/invoices/${id}/items`, { productSizeId: ids.productSize, quantity: 1 })));
    await state('PB07-05-RACE', 'after');
    const detail = await req('PB07-04-DELETE', s, 'GET', `/invoices/${id}`);
    const itemId = detail.data?.data?.items?.[0]?.id;
    if (itemId) { await state('PB07-04-DELETE', 'before'); await req('PB07-04-DELETE', s, 'DELETE', `/invoice-items/${itemId}`); await state('PB07-04-DELETE', 'after'); }
    await req('PB07-04-DELETE', s, 'POST', `/invoices/${id}/cancel`, { reason: 'QA edge cleanup' });
    if (busy.data?.data?.id) await req('PB07-07-BUSY', s, 'POST', `/invoices/${busy.data.data.id}/cancel`, { reason: 'QA edge cleanup' });
    await req('PB07-07-BUSY', s, 'POST', `/invoices/${winner}/cancel`, { reason: 'QA edge cleanup' });
  } finally { await db.end(); }
}
main().catch(e => { out('HARNESS', 'error', { message: e.message }); process.exitCode = 1; });
