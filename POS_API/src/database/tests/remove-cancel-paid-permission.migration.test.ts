import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { dataSource } from '../data-source';

const MIGRATION = 'RemoveCancelPaidPermission20261118000001';

async function withSandbox(fn: (db: DataSource) => Promise<void>) {
  const name = `pos_pb16_migration_${randomBytes(6).toString('hex')}`, url = new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Only a local sandbox is allowed');
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), synchronize: false, migrationsRun: false, entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  await dataSource.initialize();
  let created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`); created = true;
    await db.initialize(); await db.runMigrations();
    await fn(db);
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
}

const links = (db: DataSource) => db.query(
  `SELECT r.name AS role, p.code FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id ORDER BY r.name, p.code`);
const cancelCodes = (db: DataSource) => db.query(`SELECT code FROM permissions WHERE code LIKE 'invoice.cancel%' ORDER BY code`);

test('test_PB16_ST2_AC2_only_cancel_open_remains', { timeout: 120_000 }, async () => {
  await withSandbox(async db => {
    assert.deepEqual(await cancelCodes(db), [{ code: 'invoice.cancel_open' }]);
    const open = await db.query(`SELECT r.name FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id
      WHERE p.code='invoice.cancel_open' ORDER BY r.name`);
    assert.deepEqual(open.map((r: any) => r.name), ['CASHIER', 'MANAGER', 'OWNER']);
    const admin = await db.query(`SELECT 1 FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id
      WHERE r.name='PLATFORM_ADMIN' AND p.code LIKE 'invoice.cancel%'`);
    assert.equal(admin.length, 0);
  });
});

test('test_PB16_ST2_AC3_down_restores_grants_and_up_removes_them', { timeout: 120_000 }, async () => {
  await withSandbox(async db => {
    const migration = (db.migrations as any[]).find(m => m.name === MIGRATION);
    assert.ok(migration, 'migration must be registered');
    const A = await links(db);
    const runner = db.createQueryRunner();
    try {
      await migration.down(runner);
      const B = await links(db);
      const key = (r: any) => `${r.role}|${r.code}`, inA = new Set(A.map(key));
      const added = B.filter((r: any) => !inA.has(key(r)));
      assert.equal(B.length, A.length + 2);
      assert.deepEqual(added.map((r: any) => r.role).sort(), ['MANAGER', 'OWNER']);
      const [X] = [...new Set(added.map((r: any) => r.code))] as string[];
      assert.equal(new Set(added.map((r: any) => r.code)).size, 1);
      assert.ok(X.startsWith('invoice.cancel_') && X !== 'invoice.cancel_open');
      const desc = await db.query('SELECT description FROM permissions WHERE code=$1', [X]);
      assert.equal(desc[0].description, 'Hủy đơn đã thanh toán khi ca của đơn còn mở');

      await migration.up(runner);
      assert.deepEqual(await links(db), A);
      await migration.up(runner);
      assert.deepEqual(await links(db), A);
    } finally { await runner.release(); }
  });
});
