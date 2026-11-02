// Local-only QA transport for the browser tool VM (no filesystem/import access).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const load = createRequire(path.resolve(__dirname, '../../POS_API/package.json'));
const { Client } = load('pg');
const privateFile = path.join(process.env.USERPROFILE, '.codex/tmp/pb13-browser-fixture.json');
const fixture = JSON.parse(fs.readFileSync(privateFile));
if (!/^pos_pb13_browser_[a-f0-9]+$/.test(fixture.databaseName)) throw new Error('Not an isolated QA database');
const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + fixture.databaseName;
const db = new Client({ connectionString: url.toString() });
async function state() {
  const results = await Promise.all([
    db.query('SELECT id,store_id,code,name,address,phone,initial_cash,is_active FROM branches ORDER BY id'),
    db.query('SELECT id,branch_id,name,area,capacity,is_active FROM dining_tables ORDER BY id'),
    db.query('SELECT u.id,u.store_id,u.branch_id,u.username,u.full_name,r.name AS role,u.is_active,u.must_change_password FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id'),
    db.query('SELECT user_id,count(*)::int AS total,count(*) FILTER(WHERE revoked_at IS NULL)::int AS active FROM refresh_tokens GROUP BY user_id ORDER BY user_id'),
  ]); return Object.fromEntries(['branches','tables','users','sessions'].map((key, i) => [key, results[i].rows]));
}
async function main() {
  await db.connect(); await db.query('SET default_transaction_read_only=on');
  http.createServer(async (request, response) => {
    try {
      if (request.headers.origin !== fixture.origin) { response.writeHead(403); response.end(); return; }
      let raw = ''; for await (const chunk of request) { raw += chunk; if (raw.length > 2000000) throw new Error('QA payload too large'); }
      const body = raw ? JSON.parse(raw) : {};
      let result;
      if (request.url === '/fixture' && request.method === 'GET') result = fixture;
      else if (request.url === '/state' && request.method === 'GET') result = await state();
      else if (request.url === '/artifact' && request.method === 'POST') {
        if (!/^(?:B\d\d|browser)[a-zA-Z0-9_.-]*\.(?:json|jsonl|yml|log)$/.test(body.name)) throw new Error('QA artifact path rejected');
        const target = path.join(__dirname, body.name);
        if (body.append) fs.appendFileSync(target, body.text); else fs.writeFileSync(target, body.text);
        result = { saved: body.name };
      } else { response.writeHead(404); response.end(); return; }
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(result));
    } catch (error) { response.writeHead(500); response.end(JSON.stringify({ error: error.message })); }
  }).listen(3304, '127.0.0.1', () => console.log(JSON.stringify({ kind: 'QA_COMPANION_READY', port: 3304, readOnlyDatabase: fixture.databaseName })));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
