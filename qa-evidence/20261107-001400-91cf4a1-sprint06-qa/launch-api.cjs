const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');

const here = __dirname;
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixture.local.json'), 'utf8'));
assert.match(fixture.database, /^pos_pb07_browser_[a-f0-9]+$/);
const rows = execFileSync('docker', ['ps', '--filter', 'name=^/pos_pb07_test_pg$', '--format', '{{.Names}} {{.Ports}}'], { encoding: 'utf8' });
assert.match(rows, /^pos_pb07_test_pg 127\.0\.0\.1:5433->5432\/tcp\s*$/);
const ready = execFileSync('docker', ['exec', 'pos_pb07_test_pg', 'psql', '-X', '-U', 'postgres', '-d', fixture.database, '-tAc', 'SELECT 1'], { encoding: 'utf8' });
assert.equal(ready.trim(), '1');

const env = { ...process.env, DATABASE_URL: process.env.PB07_TEST_DB_BASE_URL + fixture.database,
  PUBLIC_ORIGIN: 'http://localhost:5173', JWT_SECRET: randomBytes(48).toString('base64url'),
  CSRF_SECRET: randomBytes(48).toString('base64url'), NODE_ENV: 'test', PORT: '3001' };
fs.writeFileSync(path.join(here, 'api-start.txt'), new Date().toISOString());
const log = fs.createWriteStream(path.join(here, 'api-server.log'));
const child = spawn(process.execPath, ['--env-file-if-exists=.env', 'dist/main.js'],
  { cwd: path.resolve(here, '../../POS_API'), env, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log);
child.stderr.pipe(log);
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', (code, signal) => {
  fs.writeFileSync(path.join(here, 'api-end.txt'), new Date().toISOString());
  fs.writeFileSync(path.join(here, 'api-exit.txt'), String(code ?? signal));
  log.end();
  process.exitCode = code ?? 0;
});
