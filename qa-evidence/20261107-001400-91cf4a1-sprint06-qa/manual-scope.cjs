const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
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
async function state(scenario, label, invoiceId) {
  const q = `SELECT v.id,v.invoice_code,v.table_id,v.status,v.subtotal,i.id AS item_id,i.product_name,i.unit_price,i.quantity,i.line_total
    FROM invoices v LEFT JOIN invoice_items i ON i.invoice_id=v.id WHERE v.id=$1 ORDER BY i.created_at,i.id`;
  out(scenario, 'db-select', { label, query: q, params: [invoiceId], rows: (await db.query(q, [invoiceId])).rows });
}
async function main() {
  const u = new URL(process.env.DATABASE_URL || '');
  if (u.hostname !== '127.0.0.1' || u.port !== '5433' || u.pathname !== `/${fixture.database}` || !/^pos_pb07_browser_/.test(fixture.database)) throw Error('Sandbox gate failed');
  await db.connect();
  try {
    const branch2 = randomUUID(), table2 = randomUUID(), tableForeign = randomUUID();
    const categoryB = randomUUID(), sizeB = randomUUID(), productB = randomUUID(), productSizeB = randomUUID();
    await db.query('INSERT INTO branches (id,store_id,code,name) VALUES ($1,$2,$3,$4)', [branch2, fixture.ids.storeA, 'QA2', 'QA branch 2']);
    await db.query('INSERT INTO dining_tables (id,branch_id,name) VALUES ($1,$2,$3),($4,$5,$6)',
      [table2, branch2, 'QA other branch', tableForeign, fixture.ids.branchB, 'QA other store']);
    await db.query('INSERT INTO categories (id,store_id,name) VALUES ($1,$2,$3)', [categoryB, fixture.ids.storeB, 'QA foreign category']);
    await db.query('INSERT INTO sizes (id,store_id,name) VALUES ($1,$2,$3)', [sizeB, fixture.ids.storeB, 'QA foreign size']);
    await db.query('INSERT INTO products (id,category_id,name) VALUES ($1,$2,$3)', [productB, categoryB, 'QA foreign product']);
    await db.query('INSERT INTO product_sizes (id,product_id,size_id,price) VALUES ($1,$2,$3,12345)', [productSizeB, productB, sizeB]);
    out('SETUP', 'sandbox-insert', { statement: 'INSERT fixture-only branch/table/category/size/product/product_size in existing sandbox DB',
      ids: { branch2, table2, tableForeign, categoryB, sizeB, productB, productSizeB } });
    const owner = await login('ownerA'), cashier = await login('cashierA');
    const created = await req('PB07-03/04/05/07', cashier, 'POST', '/invoices', { orderType: 'DINE_IN', tableId: fixture.ids.tableA });
    const id = created.data?.data?.id;
    if (!id) throw Error('Invoice setup failed');
    await state('PB07-04/05', 'before add', id);
    await req('PB07-04', cashier, 'POST', `/invoices/${id}/items`, { productSizeId: productSizeB, quantity: 1 });
    await req('PB07-04/05', cashier, 'POST', `/invoices/${id}/items`, { productSizeId: fixture.ids.productSize, quantity: 1 });
    await state('PB07-04/05', 'after first add', id);
    await req('PB07-04', owner, 'PATCH', `/products/${fixture.ids.product}`, { isActive: false });
    await req('PB07-04', cashier, 'POST', `/invoices/${id}/items`, { productSizeId: fixture.ids.productSize, quantity: 1 });
    await req('PB07-04', owner, 'PATCH', `/products/${fixture.ids.product}`, { isActive: true });
    await req('PB07-05', owner, 'PATCH', `/product-sizes/${fixture.ids.productSize}`, { price: 15000 });
    await state('PB07-05', 'after price change before new add', id);
    await req('PB07-05', cashier, 'POST', `/invoices/${id}/items`, { productSizeId: fixture.ids.productSize, quantity: 1 });
    await state('PB07-05', 'after price change and new add', id);
    await req('PB07-05', owner, 'PATCH', `/product-sizes/${fixture.ids.productSize}`, { price: 10000 });
    await req('PB07-07', cashier, 'POST', `/invoices/${id}/transfer-table`, { tableId: table2 });
    await req('PB07-07', cashier, 'POST', `/invoices/${id}/transfer-table`, { tableId: tableForeign });
    await state('PB07-07', 'after rejected foreign targets', id);
    await req('PB07-07', cashier, 'POST', `/invoices/${id}/cancel`, { reason: 'QA scope cleanup' });
  } finally { await db.end(); }
}
main().catch(e => { out('HARNESS', 'error', { message: e.message }); process.exitCode = 1; });
