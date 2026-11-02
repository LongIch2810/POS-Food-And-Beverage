import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { dataSource } from '../../database/data-source';
import { Foundation20261028000000 } from '../../database/migrations/20261028000000-Foundation';
import { AuthRateEvents20261028000001 } from '../../database/migrations/20261028000001-AuthRateEvents';
import { PlatformPermissions20261029000000 } from '../../database/migrations/20261029000000-PlatformPermissions';

test('MIG-01 PB-04 upgrade preserves organization, permissions, users/sessions and replays safely', async (t) => {
  const name = `pos_pb04_migration_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const previous = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities,
    migrations: [Foundation20261028000000, AuthRateEvents20261028000001, PlatformPermissions20261029000000] });
  const current = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities,
    migrations: dataSource.options.migrations });
  await dataSource.initialize();
  let created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    created = true;
    await previous.initialize();
    await previous.runMigrations();
    const storeId = randomUUID();
    const branchId = randomUUID();
    await previous.query('INSERT INTO stores(id,name) VALUES ($1,$2)', [storeId, 'QA Old Store']);
    await previous.query('INSERT INTO branches(id,store_id,code,name,initial_cash) VALUES ($1,$2,$3,$4,100)',
      [branchId, storeId, 'OLD', 'QA Old Branch']);
    await previous.query("INSERT INTO permissions(id,code) VALUES (gen_random_uuid(),'qa.custom')");
    await previous.query(`INSERT INTO role_permissions(role_id,permission_id)
      SELECT r.id,p.id FROM roles r,permissions p WHERE r.name='OWNER' AND p.code='qa.custom'`);
    const legacyManagerRoleId = randomUUID();
    await previous.query("INSERT INTO roles(id,name) VALUES($1,'MANAGER')", [legacyManagerRoleId]);
    await previous.query(`INSERT INTO role_permissions(role_id,permission_id)
      SELECT $1,p.id FROM permissions p WHERE p.code='qa.custom'`, [legacyManagerRoleId]);
    const legacyUserId = randomUUID(); const legacySessionId = randomUUID();
    const hash = await bcrypt.hash(randomBytes(18).toString('base64url'), 12);
    const tokenHash = createHash('sha256').update(randomBytes(32)).digest('hex');
    await previous.query(`INSERT INTO users(id,store_id,branch_id,role_id,username,full_name,password_hash,is_active,must_change_password)
      VALUES($1,$2,$3,$4,'qa_legacy_manager','QA Legacy Manager',$5,true,false)`, [legacyUserId, storeId, branchId, legacyManagerRoleId, hash]);
    await previous.query(`INSERT INTO refresh_tokens(id,user_id,session_id,token_hash,expires_at)
      VALUES($1,$2,$3,$4,now()+interval '7 days')`, [randomUUID(), legacyUserId, legacySessionId, tokenHash]);
    const legacyBefore = {
      users: await previous.query('SELECT id,store_id,branch_id,role_id,username,is_active,must_change_password FROM users ORDER BY id'),
      sessions: await previous.query('SELECT id,user_id,session_id,expires_at,revoked_at,replaced_at FROM refresh_tokens ORDER BY id'),
    };
    await previous.destroy();
    await current.initialize();
    const applied = await current.runMigrations();
    assert.ok(applied.length >= 1);
    assert.ok(applied.some((migration) => migration.name === 'Organization20261030000000'));
    const legacyAfter = {
      users: await current.query('SELECT id,store_id,branch_id,role_id,username,is_active,must_change_password FROM users ORDER BY id'),
      sessions: await current.query('SELECT id,user_id,session_id,expires_at,revoked_at,replaced_at FROM refresh_tokens ORDER BY id'),
    };
    assert.deepEqual(legacyAfter, legacyBefore);
    const [preserved] = await current.query(`SELECT u.password_hash=$2 AS "passwordHashUnchanged",rt.token_hash=$3 AS "tokenHashUnchanged"
      FROM users u JOIN refresh_tokens rt ON rt.user_id=u.id WHERE u.id=$1`, [legacyUserId, hash, tokenHash]);
    assert.deepEqual(preserved, { passwordHashUnchanged: true, tokenHashUnchanged: true });
    t.diagnostic(JSON.stringify({ case: 'MIG-01', db: 'legacy organization/user/session upgrade', before: legacyBefore, after: legacyAfter,
      passwordHashUnchanged: preserved.passwordHashUnchanged, tokenHashUnchanged: preserved.tokenHashUnchanged }));
    const [branch] = await current.query('SELECT store_id,code,name,initial_cash FROM branches WHERE id=$1', [branchId]);
    assert.deepEqual(branch, { store_id: storeId, code: 'OLD', name: 'QA Old Branch', initial_cash: '100' });
    assert.equal((await current.query(`SELECT count(*)::int AS n FROM role_permissions rp
      JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id
      WHERE r.name='OWNER' AND p.code='qa.custom'`))[0].n, 1);
    assert.equal((await current.query(`SELECT count(*)::int AS n FROM role_permissions rp
      JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=$1 AND p.code='qa.custom'`, [legacyManagerRoleId]))[0].n, 1);
    for (const [role, count] of [['OWNER', 5], ['MANAGER', 2], ['CASHIER', 0]] as const) {
      assert.equal((await current.query(`SELECT count(*)::int AS n FROM role_permissions rp
        JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id
        WHERE r.name=$1 AND p.code IN ('branch.read','branch.manage','branch.access_all','table.manage','user.manage')`, [role]))[0].n, count);
    }
    await assert.rejects(current.query('INSERT INTO dining_tables(id,branch_id,name,capacity) VALUES ($1,$2,$3,0)',
      [randomUUID(), branchId, 'Bad']), (error: { code?: string }) => error.code === '23514');
    await assert.rejects(current.query('INSERT INTO dining_tables(id,branch_id,name) VALUES ($1,$2,$3)',
      [randomUUID(), randomUUID(), 'Orphan']), (error: { code?: string }) => error.code === '23503');
    await current.query('INSERT INTO dining_tables(id,branch_id,name) VALUES ($1,$2,$3)', [randomUUID(), branchId, 'QA Table']);
    assert.equal((await current.runMigrations()).length, 0);
    assert.equal((await current.query('SELECT count(*)::int AS n FROM dining_tables'))[0].n, 1);
    t.diagnostic(JSON.stringify({ case: 'MIG-01', db: 'branch/custom permissions/table retained', branch,
      legacyManagerRoleId, savedTableCount: (await current.query('SELECT count(*)::int AS n FROM dining_tables'))[0].n }));
  } finally {
    if (previous.isInitialized) await previous.destroy();
    if (current.isInitialized) await current.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});
