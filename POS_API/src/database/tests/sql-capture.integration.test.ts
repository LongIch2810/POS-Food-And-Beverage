import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { dataSource } from '../data-source';
import { Store } from '../../platform/entities/store.entity';
import { captureSql } from './sql-capture';

test('test_ST2_AC4_capture_sees_raw_and_builder', async (t) => {
  const name = `pos_orm_capture_test_${randomBytes(6).toString('hex')}`;
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
    await db.runMigrations();
    const sql = captureSql(t);
    await db.query('SELECT 1');
    await db.getRepository(Store).createQueryBuilder('s').where('1=0').getMany();
    assert.equal(sql.length, 2);
    assert.match(sql[1], /FROM "stores" "s"/);
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});
