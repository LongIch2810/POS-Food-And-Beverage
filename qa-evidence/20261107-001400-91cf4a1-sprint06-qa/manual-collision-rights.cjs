const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DataSource } = require('../../POS_API/node_modules/typeorm');

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.local.json'), 'utf8'));
const parsed = new URL(process.env.DATABASE_URL || '');
assert.equal(parsed.hostname, '127.0.0.1');
assert.equal(parsed.port, '5433');
assert.equal(parsed.pathname, '/' + fixture.database);
assert.match(fixture.database, /^pos_pb07_browser_[a-f0-9]+$/);
const out = (scenario, phase, value) => console.log(JSON.stringify({ at: new Date().toISOString(), scenario, phase, ...value }));
const base = 'http://127.0.0.1:3001/api/v1';
const origin = 'http://localhost:5173';

async function login(role) {
  const response = await fetch(base + '/auth/login', { method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: fixture.users[role], password: fixture.password }) });
  const cookies = response.headers.getSetCookie();
  out('S6-08', 'login', { role, status: response.status, requestId: response.headers.get('x-request-id'),
    cookieNames: cookies.map(c => c.split('=')[0]) });
  assert.equal(response.status, 200);
  return { cookie: cookies.map(c => c.split(';')[0]).join('; '),
    csrf: cookies.find(c => c.startsWith('__Host-pos_csrf='))?.split(';')[0].split('=')[1] };
}
async function cancel(role, session, id) {
  const response = await fetch(base + '/invoices/' + id + '/cancel', { method: 'POST',
    headers: { Origin: origin, Cookie: session.cookie, 'X-CSRF-Token': session.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'QA Sprint 6 quyền hủy' }) });
  const body = await response.json();
  out('S6-08', 'http', { role, method: 'POST', path: '/invoices/' + id + '/cancel',
    request: { reason: 'QA Sprint 6 quyền hủy' }, status: response.status,
    requestId: response.headers.get('x-request-id'), response: body });
  return response.status;
}
(async () => {
  const original = require('../../POS_API/dist/database/data-source.js').dataSource;
  const db = new DataSource({ ...original.options, url: process.env.DATABASE_URL });
  await db.initialize();
  try {
    const user = { id: fixture.ids.cashierA, storeId: fixture.ids.storeA,
      branchId: fixture.ids.branchA, role: 'CASHIER', permissions: ['pos.sell', 'invoice.cancel_open'] };
    const before = (await db.query("SELECT id,invoice_code,status FROM invoices WHERE invoice_code IN ('HDAAAAAAAA','HDBBBBBBBB') ORDER BY invoice_code"));
    out('S6-03', 'db-before', { query: 'SELECT id,invoice_code,status FROM invoices WHERE invoice_code IN two forced codes', rows: before });
    assert.equal(before.length, 0);
    const sequence = [Buffer.alloc(8, 0), Buffer.alloc(8, 0), Buffer.alloc(8, 1)];
    const randomBytes = crypto.randomBytes;
    crypto.randomBytes = n => n === 8 ? sequence.shift() : randomBytes(n);
    const { SalesService } = require('../../POS_API/dist/sales/sales.service.js');
    const service = new SalesService(db);
    const first = await service.create(user, { orderType: 'TAKEAWAY' });
    const second = await service.create(user, { orderType: 'TAKEAWAY' });
    crypto.randomBytes = randomBytes;
    assert.equal(first.invoiceCode, 'HDAAAAAAAA');
    assert.equal(second.invoiceCode, 'HDBBBBBBBB');
    assert.equal(sequence.length, 0);
    const after = await db.query("SELECT id,invoice_code,status FROM invoices WHERE invoice_code IN ('HDAAAAAAAA','HDBBBBBBBB') ORDER BY invoice_code");
    out('S6-03', 'db-after', { query: 'SELECT id,invoice_code,status FROM invoices WHERE invoice_code IN two forced codes',
      rows: after, forcedCodes: [first.invoiceCode, second.invoiceCode], collisionAttempts: 1 });
    assert.equal(after.length, 2);
    const manager = await login('managerA');
    const cashier = await login('cashierA');
    const denied = await cancel('managerA', manager, second.id);
    const deniedDb = await db.query('SELECT status FROM invoices WHERE id=$1', [second.id]);
    out('S6-08', 'db-after-denied', { query: 'SELECT status FROM invoices WHERE id=$1', invoiceId: second.id, rows: deniedDb });
    assert.equal(denied, 403);
    assert.equal(deniedDb[0].status, 'OPEN');
    const allowed = await cancel('cashierA', cashier, second.id);
    const allowedDb = await db.query('SELECT status,cancel_reason FROM invoices WHERE id=$1', [second.id]);
    out('S6-08', 'db-after-allowed', { query: 'SELECT status,cancel_reason FROM invoices WHERE id=$1', invoiceId: second.id, rows: allowedDb });
    assert.equal(allowed, 200);
    assert.equal(allowedDb[0].status, 'CANCELLED');
    assert.equal(await cancel('cashierA', cashier, first.id), 200);
  } finally { await db.destroy(); }
})().catch(e => { out('HARNESS', 'error', { message: e.message }); process.exitCode = 1; });
