const fs = require('node:fs');
const path = require('node:path');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.local.json'), 'utf8'));
const log = fs.readFileSync(path.join(__dirname, 'manual-scope.log'), 'utf16le').split(/\r?\n/).filter(x => x.startsWith('{')).map(JSON.parse);
const created = log.find(x => x.scenario === 'PB07-03/04/05/07' && x.phase === 'http' && x.status === 201);
const item = log.find(x => x.scenario === 'PB07-04/05' && x.phase === 'http' && x.status === 201);
const invoiceId = created.response.data.id, itemId = item.response.data.items[0].id;
const out = (method, status, response, requestId) => console.log(JSON.stringify({ at: new Date().toISOString(), scenario: 'PB07-04-POSTCANCEL',
  method, path: `/invoice-items/${itemId}`, status, response, requestId, invoiceId }));
async function main() {
  const r = await fetch('http://127.0.0.1:3001/api/v1/auth/login', { method: 'POST',
    headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: fixture.users.cashierA, password: fixture.password }) });
  const cookies = r.headers.getSetCookie();
  const cookie = cookies.map(c => c.split(';')[0]).join('; '), csrf = cookies.find(c => c.startsWith('__Host-pos_csrf='))?.split(';')[0].split('=')[1];
  for (const [method, body] of [['PATCH', { quantity: 2 }], ['DELETE', undefined]]) {
    const headers = { Cookie: cookie, Origin: 'http://localhost:5173', 'X-CSRF-Token': csrf };
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(`http://127.0.0.1:3001/api/v1/invoice-items/${itemId}`, { method, headers,
      body: body ? JSON.stringify(body) : undefined });
    out(method, response.status, await response.json(), response.headers.get('x-request-id'));
  }
}
main().catch(e => { console.log(JSON.stringify({ scenario: 'HARNESS', error: e.message })); process.exitCode = 1; });
