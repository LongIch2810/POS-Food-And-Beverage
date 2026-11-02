const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const load = createRequire(path.resolve(__dirname, '../../POS_API/package.json'));
const { Client } = load('pg');
const fixture = JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE, '.codex/tmp/pb13-browser-fixture.json')));
async function main() {
  if (!/^pos_pb13_browser_[a-f0-9]+$/.test(fixture.databaseName)) throw new Error('Not QA database');
  const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + fixture.databaseName;
  const db = new Client({ connectionString: url.toString() }); await db.connect();
  try {
    await db.query('SET default_transaction_read_only=on');
    const stores = (await db.query('SELECT id,name,status FROM stores ORDER BY id')).rows;
    const users = (await db.query('SELECT id,username,branch_id,is_active,must_change_password FROM users ORDER BY id')).rows;
    const sessions = (await db.query('SELECT user_id,count(*) FILTER(WHERE revoked_at IS NULL)::int AS active FROM refresh_tokens GROUP BY user_id ORDER BY user_id')).rows;
    fs.writeFileSync(path.join(__dirname, 'final-db.json'), JSON.stringify({ time: new Date().toISOString(),
      databaseName: fixture.databaseName, readOnly: true, stores, users, sessions }, null, 2));
    console.log(JSON.stringify({ readOnly: true, stores: stores.length, allStoresActive: stores.every(store => store.status === 'ACTIVE') }));
  } finally { await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
