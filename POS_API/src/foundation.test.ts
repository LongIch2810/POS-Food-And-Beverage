import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import * as bcrypt from 'bcryptjs';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { bootstrapAdmin } from './bootstrap-admin';
import { dataSource } from './database/data-source';

test('PB-01 migration, bootstrap and database constraints', async () => {
  const databaseName = `pos_pb01_test_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  const testUrl = new URL(url);
  testUrl.pathname = `/${databaseName}`;
  const db = new DataSource({
    type: 'postgres',
    url: testUrl.toString(),
    synchronize: false,
    migrationsRun: false,
    entities: dataSource.options.entities,
    migrations: dataSource.options.migrations,
  });
  const original = {
    username: process.env.BOOTSTRAP_ADMIN_USERNAME,
    fullName: process.env.BOOTSTRAP_ADMIN_FULL_NAME,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  };

  await dataSource.initialize();
  let created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    await db.initialize();
    assert.equal((await db.runMigrations()).length, 8);
    assert.equal((await db.runMigrations()).length, 0);

    delete process.env.BOOTSTRAP_ADMIN_USERNAME;
    delete process.env.BOOTSTRAP_ADMIN_FULL_NAME;
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
    await assert.rejects(bootstrapAdmin(db), /configuration is missing or invalid/);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM users'))[0].count, 0);
    const childEnv: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: testUrl.toString() };
    delete childEnv.BOOTSTRAP_ADMIN_USERNAME;
    delete childEnv.BOOTSTRAP_ADMIN_FULL_NAME;
    delete childEnv.BOOTSTRAP_ADMIN_PASSWORD;
    const startup = spawnSync(process.execPath, [__dirname + '/main.js'], { env: childEnv, encoding: 'utf8' });
    assert.equal(startup.status, 1);
    assert.match(startup.stderr, /API startup failed/);

    process.env.BOOTSTRAP_ADMIN_USERNAME = '  \tADMIN  ';
    process.env.BOOTSTRAP_ADMIN_FULL_NAME = '  Quản trị  ';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'a'.repeat(73);
    await assert.rejects(bootstrapAdmin(db), /configuration is missing or invalid/);
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'é'.repeat(37);
    await assert.rejects(bootstrapAdmin(db), /configuration is missing or invalid/);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM users'))[0].count, 0);
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'temporary-password-12';
    await bootstrapAdmin(db);
    const [admin] = await db.query(`
      SELECT u.*, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id
    `);
    assert.equal(admin.username, '\tadmin');
    assert.equal(admin.full_name, 'Quản trị');
    assert.equal(admin.role_name, 'PLATFORM_ADMIN');
    assert.equal(admin.store_id, null);
    assert.equal(admin.branch_id, null);
    assert.equal(admin.must_change_password, false);
    assert.notEqual(admin.password_hash, process.env.BOOTSTRAP_ADMIN_PASSWORD);
    assert.equal(await bcrypt.compare(process.env.BOOTSTRAP_ADMIN_PASSWORD, admin.password_hash), true);

    delete process.env.BOOTSTRAP_ADMIN_USERNAME;
    delete process.env.BOOTSTRAP_ADMIN_FULL_NAME;
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
    await bootstrapAdmin(db);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM users'))[0].count, 1);

    await assert.rejects(db.query(`
      INSERT INTO users (id, role_id, full_name, username, password_hash)
      VALUES (gen_random_uuid(), $1, 'Test', E'\\tADMIN', $2)
    `, [admin.role_id, admin.password_hash]), /check constraint/);
    await assert.rejects(db.query(`
      INSERT INTO users (id, role_id, full_name, username, password_hash)
      VALUES (gen_random_uuid(), $1, 'Test', E'\\tadmin', $2)
    `, [admin.role_id, admin.password_hash]), /unique constraint/);

    const sessionId = randomUUID();
    const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
    await db.query(`
      INSERT INTO refresh_tokens (id, user_id, session_id, token_hash, expires_at)
      VALUES (gen_random_uuid(), $1, $2, $3, now() + interval '7 days')
    `, [admin.id, sessionId, tokenHash('first')]);
    await assert.rejects(db.query(`
      INSERT INTO refresh_tokens (id, user_id, session_id, token_hash, expires_at)
      VALUES (gen_random_uuid(), $1, $2, $3, now() + interval '7 days')
    `, [admin.id, sessionId, tokenHash('second')]), /unique constraint/);
    await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE session_id = $1', [sessionId]);
    await db.query(`
      INSERT INTO refresh_tokens (id, user_id, session_id, token_hash, expires_at)
      VALUES (gen_random_uuid(), $1, $2, $3, now() + interval '7 days')
    `, [admin.id, sessionId, tokenHash('second')]);

    const app = await NestFactory.create(AppModule, { logger: false });
    try {
      await app.listen(0, '127.0.0.1');
      const address = app.getHttpServer().address();
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const health = await fetch(`${baseUrl}/api/v1/health`);
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), { data: { status: 'ok' } });
      assert.match(health.headers.get('X-Request-Id') ?? '', /^[0-9a-f-]{36}$/);
      const query = dataSource.query;
      dataSource.query = async () => { throw new Error('database unavailable'); };
      try {
        const unavailable = await fetch(`${baseUrl}/api/v1/health`, { headers: { 'X-Request-Id': 'pb01-health-down' } });
        assert.equal(unavailable.status, 503);
        assert.equal(unavailable.headers.get('X-Request-Id'), 'pb01-health-down');
        assert.deepEqual(await unavailable.json(), {
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
            details: [], requestId: 'pb01-health-down' },
        });
      } finally {
        dataSource.query = query;
      }
      const missing = await fetch(`${baseUrl}/api/v1/does-not-exist`, { headers: { 'X-Request-Id': 'pb01-test' } });
      assert.equal(missing.status, 404);
      assert.equal(missing.headers.get('X-Request-Id'), 'pb01-test');
      assert.deepEqual(await missing.json(), {
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy tài nguyên.', details: [], requestId: 'pb01-test' },
      });
      const invalidId = await fetch(`${baseUrl}/api/v1/does-not-exist`, { headers: { 'X-Request-Id': 'invalid id' } });
      assert.match(invalidId.headers.get('X-Request-Id') ?? '', /^[0-9a-f-]{36}$/);
      const badJson = await fetch(`${baseUrl}/api/v1/does-not-exist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'pb01-bad-json' },
        body: '{',
      });
      assert.equal(badJson.status, 400);
      assert.equal(badJson.headers.get('X-Request-Id'), 'pb01-bad-json');
      assert.deepEqual(await badJson.json(), {
        error: { code: 'BAD_REQUEST', message: 'Yêu cầu không đọc được.', details: [], requestId: 'pb01-bad-json' },
      });
    } finally {
      await app.close();
    }

    const started = Date.now();
    await assert.rejects(dataSource.query('SELECT pg_sleep(10)'));
    assert.ok(Date.now() - started < 8000, 'DB query must time out within eight seconds');
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    await dataSource.destroy();
    for (const [key, value] of Object.entries(original)) {
      const name = `BOOTSTRAP_ADMIN_${key === 'fullName' ? 'FULL_NAME' : key.toUpperCase()}`;
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
