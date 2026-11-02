const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const load = createRequire(path.resolve(__dirname, '../../POS_API/package.json'));
const { Client } = load('pg');
const fixture = JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE, '.codex/tmp/pb13-browser-fixture.json')));
async function main() {
  if (!/^pos_pb13_browser_[a-f0-9]+$/.test(fixture.databaseName)) throw new Error('Not a QA database');
  const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + fixture.databaseName;
  const db = new Client({ connectionString: url.toString() }); await db.connect();
  const before = { branches: (await db.query('SELECT id,store_id,code,name FROM branches ORDER BY id')).rows,
    users: (await db.query('SELECT id,username,branch_id FROM users ORDER BY id')).rows };
  const store = fixture.owners[0].storeId;
  const branch = (await db.query('SELECT id FROM branches WHERE store_id=$1 AND code=$2', [store, 'aA'])).rows[0].id;
  const hash = await load('bcryptjs').hash(randomBytes(24).toString('base64url'), 12);
  const role = (await db.query("SELECT id FROM roles WHERE name='CASHIER'")).rows[0].id;
  await db.query('BEGIN');
  try {
    await db.query("INSERT INTO branches(id,store_id,code,name) SELECT gen_random_uuid(),$1,'Q'||lpad(n::text,3,'0'),'QA Pagination Branch '||n FROM generate_series(1,103)n", [store]);
    await db.query("INSERT INTO dining_tables(id,branch_id,name) SELECT gen_random_uuid(),$1,'QA Pagination Table '||n FROM generate_series(1,25)n", [branch]);
    await db.query("INSERT INTO users(id,store_id,branch_id,role_id,username,full_name,password_hash,must_change_password,is_active) SELECT gen_random_uuid(),$1,$2,$3,'pb13_page_'||n,'QA Pagination Staff '||n,$4,true,true FROM generate_series(1,25)n", [store, branch, role, hash]);
    await db.query("INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r,permissions p WHERE r.name='MANAGER' AND p.code='user.manage' ON CONFLICT DO NOTHING");
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  const after = { branches: (await db.query('SELECT id,store_id,code,name FROM branches ORDER BY id')).rows,
    tables: (await db.query('SELECT id,branch_id,name FROM dining_tables ORDER BY id')).rows,
    users: (await db.query('SELECT id,username,branch_id FROM users ORDER BY id')).rows,
    managerGrants: (await db.query("SELECT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id JOIN roles r ON r.id=rp.role_id WHERE r.name='MANAGER' ORDER BY p.code")).rows };
  fs.writeFileSync(path.join(__dirname, 'pagination-fixture.json'), JSON.stringify({ kind: 'DIRECT_QA_FIXTURE_ONLY',
    databaseName: fixture.databaseName, time: new Date().toISOString(), before, after,
    note: '103 branches,25 tables,25 staff; custom MANAGER user.manage only in isolated QA DB for self-reset coverage; not an API or default-role change' }, null, 2));
  console.log(JSON.stringify({ fixtureSeeded: true, branchCount: after.branches.length, tableCount: after.tables.length, userCount: after.users.length }));
  await db.end();
}
main().catch(error => { console.error(error.message); process.exit(1); });
