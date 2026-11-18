import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { dataSource } from '../data-source';
import { Payment } from '../../sales/entities/payment.entity';

const tables = ['ingredients', 'product_size_ingredients', 'topping_ingredients', 'branch_ingredient_stocks',
  'stock_movements', 'promotion_codes', 'invoice_promotion_codes', 'store_bank_accounts',
  'transfer_attempts', 'payments', 'bank_transfer_events', 'shift_expenses'];
const types: Record<string, string> = { uuid: 'uuid', varchar: 'character varying', char: 'character',
  bigint: 'bigint', numeric: 'numeric', int: 'integer', boolean: 'boolean',
  timestamptz: 'timestamp with time zone', text: 'text' };

async function withDatabase(run: (db: DataSource) => Promise<void>) {
  const name = `pos_orm_entity_test_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), synchronize: false,
    entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  await dataSource.initialize();
  let created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    created = true;
    await db.initialize();
    assert.equal((await db.runMigrations()).length, 14);
    await run(db);
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
}

test('test_ST1_AC1_entity_metadata_matches_schema', async () => {
  await withDatabase(async (db) => {
    for (const table of tables) {
      const metadata = db.entityMetadatas.find((entry) => entry.tableName === table);
      assert.ok(metadata, `missing metadata for ${table}`);
      const columns: { column_name: string; data_type: string; is_nullable: string }[] = await db.query(
        'SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2', ['public', table]);
      const primary: { name: string }[] = await db.query(`SELECT a.attname AS name FROM pg_index i
        JOIN pg_class t ON t.oid = i.indrelid JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
        WHERE n.nspname = $1 AND t.relname = $2 AND i.indisprimary`, ['public', table]);
      assert.deepEqual(metadata.columns.map((c) => c.databaseName).sort(), columns.map((c) => c.column_name).sort(), table);
      for (const column of metadata.columns) {
        const actual = columns.find((c) => c.column_name === column.databaseName)!;
        assert.equal(types[String(column.type)], actual.data_type, `${table}.${column.databaseName} type`);
        assert.equal(column.isNullable, actual.is_nullable === 'YES', `${table}.${column.databaseName} nullable`);
      }
      assert.deepEqual(metadata.primaryColumns.map((c) => c.databaseName).sort(), primary.map((c) => c.name).sort(), `${table} primary key`);
    }
  });
});

test('ST-1.AC-3 new payment repository query runs', async () => {
  await withDatabase(async (db) => {
    assert.equal(await db.getRepository(Payment).findOneBy({ id: '00000000-0000-4000-8000-000000000000' }), null);
  });
});
