const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.local.json'), 'utf8'));
const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.port, '5433');
assert.equal(url.pathname, '/' + fixture.database);
assert.match(fixture.database, /^pos_pb07_browser_[a-f0-9]+$/);
const base = 'http://127.0.0.1:3001/api/v1';
const origin = 'http://localhost:5173';
(async () => {
  const login = await fetch(base + '/auth/login', { method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: fixture.users.cashierA, password: fixture.password }) });
  const cookies = login.headers.getSetCookie();
  const cookie = cookies.map(c => c.split(';')[0]).join('; ');
  const csrf = cookies.find(c => c.startsWith('__Host-pos_csrf='))?.split(';')[0].split('=')[1];
  console.log(JSON.stringify({ scenario: 'S6-01', phase: 'login', status: login.status,
    requestId: login.headers.get('x-request-id'), cookieNames: cookies.map(c => c.split('=')[0]) }));
  assert.equal(login.status, 200);
  const opened = await fetch(base + '/work-shifts', { method: 'POST',
    headers: { Origin: origin, Cookie: cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ shiftType: 'CASHIER' }) });
  const response = await opened.json();
  console.log(JSON.stringify({ scenario: 'S6-01', phase: 'open-shift', method: 'POST',
    path: '/work-shifts', request: { shiftType: 'CASHIER' }, status: opened.status,
    requestId: opened.headers.get('x-request-id'), response }));
  assert.equal(opened.status, 201);
})().catch(e => { console.log(JSON.stringify({ scenario: 'HARNESS', error: e.message })); process.exitCode = 1; });
