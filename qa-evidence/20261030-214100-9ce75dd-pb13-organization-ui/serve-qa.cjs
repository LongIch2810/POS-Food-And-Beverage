// Isolated local QA fixture; never connects the application to its normal database.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const api = path.resolve(__dirname, '../../POS_API');
const load = createRequire(path.join(api, 'package.json'));
const { Client } = load('pg');
const privateFile = path.join(process.env.USERPROFILE, '.codex/tmp/pb13-browser-fixture.json');
const publicFile = path.join(__dirname, 'fixture.json');
const rawFile = path.join(__dirname, 'fixture-requests.jsonl');
const secret = () => randomBytes(24).toString('base64url');
const redact = value => JSON.parse(JSON.stringify(value, (key, item) =>
  typeof item === 'string' && /password|token|cookie|csrf|secret/i.test(key) ? '[REDACTED]' : item));

async function main() {
  const databaseName = 'pos_pb13_browser_' + randomBytes(6).toString('hex');
  const admin = new Client({ connectionString: process.env.DATABASE_URL }); await admin.connect();
  await admin.query('CREATE DATABASE "' + databaseName + '"'); await admin.end();
  const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + databaseName;
  process.env.DATABASE_URL = url.toString(); process.env.PORT = '3303';
  process.env.PUBLIC_ORIGIN = 'http://localhost:5175';
  process.env.JWT_SECRET = secret() + secret(); process.env.CSRF_SECRET = secret() + secret();
  process.env.BOOTSTRAP_ADMIN_USERNAME = 'pb13_qa_admin';
  process.env.BOOTSTRAP_ADMIN_FULL_NAME = 'QA Platform'; process.env.BOOTSTRAP_ADMIN_PASSWORD = secret();
  load('reflect-metadata');
  const { dataSource: db } = require(path.join(api, 'dist/database/data-source.js'));
  await db.initialize(); await db.runMigrations();
  await require(path.join(api, 'dist/bootstrap-admin.js')).bootstrapAdmin(db);
  const { NestFactory } = load('@nestjs/core');
  const { AppModule } = require(path.join(api, 'dist/app.module.js'));
  const app = await NestFactory.create(AppModule);
  await app.listen(3303, '127.0.0.1');
  const snapshot = async () => {
    const [stores, branches, tables, users, sessions] = await Promise.all([
      db.query('SELECT id,name,status FROM stores ORDER BY id'),
      db.query('SELECT id,store_id,code,name,initial_cash,is_active FROM branches ORDER BY id'),
      db.query('SELECT id,branch_id,name,area,capacity,is_active FROM dining_tables ORDER BY id'),
      db.query('SELECT u.id,u.store_id,u.branch_id,u.username,r.name AS role,u.must_change_password,u.is_active FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id'),
      db.query('SELECT user_id,count(*)::int AS total,count(*) FILTER(WHERE revoked_at IS NULL)::int AS active FROM refresh_tokens GROUP BY user_id ORDER BY user_id'),
    ]); return { stores, branches, tables, users, sessions };
  };
  const jar = new Map();
  const request = async (route, method = 'GET', body) => {
    const before = await snapshot(); const headers = { Origin: process.env.PUBLIC_ORIGIN };
    if (jar.size) headers.Cookie = [...jar].map(([key, value]) => key + '=' + value).join('; ');
    if (jar.has('__Host-pos_csrf')) headers['X-CSRF-Token'] = decodeURIComponent(jar.get('__Host-pos_csrf'));
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch('http://127.0.0.1:3303/api/v1/' + route, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0]; const at = pair.indexOf('='); jar.set(pair.slice(0, at), pair.slice(at + 1)); }
    const result = response.status === 204 ? null : await response.json();
    fs.appendFileSync(rawFile, JSON.stringify({ time: new Date().toISOString(), kind: 'FIXTURE_HTTP', route, method,
      request: redact(body ?? null), status: response.status, requestId: response.headers.get('x-request-id'), response: redact(result), before, after: await snapshot() }) + '\n');
    assert.ok(response.ok, route + ' status ' + response.status); return result?.data;
  };
  await request('auth/login', 'POST', { username: process.env.BOOTSTRAP_ADMIN_USERNAME, password: process.env.BOOTSTRAP_ADMIN_PASSWORD });
  await request('auth/csrf');
  const stores = [];
  for (const suffix of ['a', 'b']) stores.push(await request('platform/stores', 'POST', { name: 'PB13 QA Store ' + suffix,
    owner: { username: 'pb13_qa_owner_' + suffix, fullName: 'QA Owner ' + suffix } }));
  const fixture = { databaseName, pid: process.pid, origin: process.env.PUBLIC_ORIGIN, api: 'http://127.0.0.1:3303',
    admin: { username: process.env.BOOTSTRAP_ADMIN_USERNAME, password: process.env.BOOTSTRAP_ADMIN_PASSWORD },
    owners: stores.map(value => ({ id: value.owner.id, storeId: value.store.id, username: value.owner.username,
      password: value.temporaryPassword, newPassword: secret(), mustChange: true })) };
  fs.mkdirSync(path.dirname(privateFile), { recursive: true }); fs.writeFileSync(privateFile, JSON.stringify(fixture));
  fs.writeFileSync(publicFile, JSON.stringify({ databaseName, pid: process.pid, origin: fixture.origin,
    stores: stores.map(value => ({ id: value.store.id, ownerId: value.owner.id, username: value.owner.username })),
    created: new Date().toISOString(), snapshot: await snapshot() }, null, 2));
  console.log(JSON.stringify({ kind: 'QA_READY', databaseName, port: 3303, stores: stores.length, credentials: 'private file outside repository' }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
