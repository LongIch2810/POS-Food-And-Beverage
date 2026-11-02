const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const load = createRequire(path.resolve(__dirname, '../../POS_API/package.json'));
const { Client } = load('pg');
const fixture = JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE, '.codex/tmp/pb13-browser-fixture.json')));
async function main() {
  if (!/^pos_pb13_browser_[a-f0-9]+$/.test(fixture.databaseName)) throw new Error('Not QA');
  const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + fixture.databaseName;
  const db = new Client({ connectionString: url.toString() }); await db.connect();
  const snapshot = async () => ({
    stores: (await db.query('SELECT id,name,status FROM stores ORDER BY id')).rows,
    users: (await db.query('SELECT id,username,store_id,branch_id,is_active,must_change_password FROM users ORDER BY id')).rows,
    managerPermissions: (await db.query("SELECT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id JOIN roles r ON r.id=rp.role_id WHERE r.name='MANAGER' ORDER BY p.code")).rows,
    counts: (await db.query('SELECT (SELECT count(*)::int FROM branches) AS branches,(SELECT count(*)::int FROM dining_tables) AS tables,(SELECT count(*)::int FROM users) AS users')).rows[0],
    sessions: (await db.query('SELECT user_id,count(*) FILTER(WHERE revoked_at IS NULL)::int AS active FROM refresh_tokens GROUP BY user_id ORDER BY user_id')).rows,
  });
  try {
    const operation = process.argv[2]; const filename = process.argv[3];
    if (!/^B\d\d[a-zA-Z0-9_.-]*\.json$/.test(filename)) throw new Error('Invalid QA artifact');
    if (operation === 'snapshot') await db.query('SET default_transaction_read_only=on');
    const before = await snapshot();
    if (operation === 'restore-manager') await db.query("DELETE FROM role_permissions rp USING roles r,permissions p WHERE rp.role_id=r.id AND rp.permission_id=p.id AND r.name='MANAGER' AND p.code='user.manage'");
    else if (operation === 'move-manager') await db.query("UPDATE users SET branch_id=(SELECT id FROM branches WHERE store_id=$1 AND code='bB') WHERE username='pb13_qa_manager' AND store_id=$1", [fixture.owners[0].storeId]);
    else if (operation !== 'snapshot') throw new Error('Unknown QA operation');
    const result = { operation, databaseName: fixture.databaseName, time: new Date().toISOString(),
      label: operation === 'snapshot' ? 'READONLY_DB' : 'DIRECT_QA_FIXTURE_ONLY_NOT_PRODUCT_API', before, after: await snapshot() };
    fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ operation, saved: filename, counts: result.after.counts }));
  } finally { await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
