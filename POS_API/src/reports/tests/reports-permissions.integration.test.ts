import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { dataSource } from '../../database/data-source';

const MIGRATION = 'ReportsPermissions20261114000001';
const REPORT_CODES = ['report.view_shift', 'report.view_branch', 'report.view_all'];

async function withSandbox(fn: (db: DataSource) => Promise<void>) {
  const name = `pos_reports_perm_${randomBytes(6).toString('hex')}`, url = new URL(process.env.DATABASE_URL!);
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

const reportLinks = (db: DataSource) => db.query(
  `SELECT r.name AS role, p.code, p.id AS permission_id FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id
   WHERE p.code LIKE 'report.%' ORDER BY r.name, p.code`);
const otherLinks = (db: DataSource) => db.query(
  `SELECT r.name AS role, p.code FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id
   WHERE p.code NOT LIKE 'report.%' ORDER BY r.name, p.code`);
// Sandbox-only: put the DB back to the state before the reports migration ran.
const rewindMigration = async (db: DataSource) => {
  await db.query(`DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code LIKE 'report.%')`);
  await db.query(`DELETE FROM permissions WHERE code LIKE 'report.%'`);
  await db.query('DELETE FROM migrations WHERE name=$1', [MIGRATION]);
};
const seedExistingShiftPermission = async (db: DataSource, id: string) => {
  await db.query(`INSERT INTO permissions(id,code,description) VALUES($1,'report.view_shift','pre-existing')`, [id]);
  await db.query(`INSERT INTO role_permissions(role_id,permission_id) SELECT id,$1 FROM roles WHERE name='CASHIER'`, [id]);
};

test('test_ST1_AC1_permissions_seeded', { timeout: 120_000 }, async () => {
  await withSandbox(async db => {
    await rewindMigration(db);
    const before = await otherLinks(db);
    assert.ok(before.length > 0);
    assert.equal((await db.runMigrations()).length, 1);
    assert.deepEqual((await reportLinks(db)).map((r: any) => [r.role, r.code]), [
      ['CASHIER', 'report.view_shift'], ['MANAGER', 'report.view_branch'], ['OWNER', 'report.view_all'],
    ]);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM permissions WHERE code = ANY($1)', [REPORT_CODES]))[0].n, 3);
    assert.deepEqual(await otherLinks(db), before);
    const admin = await db.query(`SELECT 1 FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id
      WHERE r.name='PLATFORM_ADMIN' AND p.code LIKE 'report.%'`);
    assert.equal(admin.length, 0);
  });
});

test('test_ST1_AC2_permissions_rollback', { timeout: 120_000 }, async () => {
  await withSandbox(async db => {
    await rewindMigration(db);
    const existingId = randomUUID();
    await seedExistingShiftPermission(db, existingId);
    // History: a PAID invoice with a payment.
    const store = randomUUID(), branch = randomUUID(), user = randomUUID(), shift = randomUUID(), invoice = randomUUID(), payment = randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2)', [store, 'Reports perm store']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)', [branch, store, 'RP', 'Branch']);
    await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash) VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),'C','rp_cashier','x')`, [user, store, branch]);
    await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,started_at,status) VALUES($1,$2,$3,'CASHIER',now() - interval '1 hour','OPEN')`, [shift, branch, user]);
    await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,invoice_code,created_by,order_type,status,subtotal,total_amount,paid_at) VALUES($1,$2,$3,'HDRP000001',$4,'TAKEAWAY','PAID',35000,35000,now())`, [invoice, branch, shift, user]);
    await db.query(`INSERT INTO payments(id,invoice_id,method,amount,idempotency_key,idempotency_request_hash,tendered_amount,change_amount,created_by)
      VALUES($1,$2,'CASH',35000,$3,repeat('a',64),35000,0,$4)`, [payment, invoice, randomUUID(), user]);

    assert.equal((await db.runMigrations()).length, 1);
    const afterUp = await reportLinks(db);
    assert.equal(afterUp.length, 3);
    assert.equal(afterUp.find((r: any) => r.code === 'report.view_shift').permission_id, existingId);
    const snapshot = async () => ({
      perms: await db.query('SELECT id,code FROM permissions ORDER BY code'),
      links: await db.query('SELECT role_id,permission_id FROM role_permissions ORDER BY role_id,permission_id'),
      invoices: await db.query('SELECT id,status,total_amount FROM invoices'),
      payments: await db.query('SELECT id,amount FROM payments'),
    });
    const before = await snapshot();
    assert.equal(before.invoices.length, 1);
    assert.equal(before.payments.length, 1);

    const migration = (db.migrations as any[]).find(m => m.name === MIGRATION);
    assert.ok(migration, 'migration must be registered');
    const runner = db.createQueryRunner();
    try {
      await assert.rejects(migration.down(runner), {
        message: 'Reports permissions migration cannot be reversed automatically without removing permission assignments',
      });
    } finally { await runner.release(); }
    assert.deepEqual(await snapshot(), before);

    // Up again on an already seeded DB adds nothing.
    const again = db.createQueryRunner();
    try { await migration.up(again); } finally { await again.release(); }
    assert.deepEqual(await snapshot(), before);
  });
});
