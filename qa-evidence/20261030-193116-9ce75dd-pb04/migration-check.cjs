const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client } = require('../../POS_API/node_modules/pg');

async function main() {
  const name = `pos_pb04_cli_${randomBytes(6).toString('hex')}`;
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  const testUrl = new URL(process.env.DATABASE_URL);
  testUrl.pathname = `/${name}`;
  let created = false;
  await client.connect();
  try {
    await client.query(`CREATE DATABASE "${name}"`);
    created = true;
    for (let run = 1; run <= 2; run++) {
      console.log(JSON.stringify({ run, start: new Date().toISOString(),
        command: 'node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js', isolatedDatabase: name }));
      const result = spawnSync(process.execPath, ['./node_modules/typeorm/cli.js', 'migration:run', '-d', 'dist/database/data-source.js'], {
        cwd: path.resolve(__dirname, '../../POS_API'), encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: testUrl.toString() },
      });
      process.stdout.write(result.stdout || '');
      process.stderr.write(result.stderr || '');
      console.log(JSON.stringify({ run, end: new Date().toISOString(), exitCode: result.status }));
      assert.equal(result.status, 0);
      assert.match(result.stdout, run === 1 ? /Organization20261030000000.*executed successfully/ : /No migrations are pending/);
    }
  } finally {
    if (created) await client.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await client.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
