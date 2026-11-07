import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { test } from 'node:test';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { assertSchemaCurrent } from '../auth-config';
import { AuthService } from '../auth.service';
import { dataSource } from '../../database/data-source';
import { Foundation20261028000000 } from '../../database/migrations/20261028000000-Foundation';

test('PB-02 login creates a hashed refresh session and cookie-only tokens', { timeout: 90_000 }, async () => {
  const name = `pos_pb02_test_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  const testUrl = new URL(url);
  testUrl.pathname = `/${name}`;
  const db = new DataSource({
    type: 'postgres',
    url: testUrl.toString(),
    entities: dataSource.options.entities,
    migrations: dataSource.options.migrations,
  });
  process.env.PUBLIC_ORIGIN = 'http://localhost:5173';
  process.env.JWT_SECRET = 'j'.repeat(32);
  process.env.CSRF_SECRET = 'c'.repeat(32);
  await dataSource.initialize();
  let created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    created = true;
    const foundationDb = new DataSource({ type: 'postgres', url: testUrl.toString(), migrations: [Foundation20261028000000] });
    await foundationDb.initialize();
    try { await foundationDb.runMigrations(); } finally { await foundationDb.destroy(); }
    await db.initialize();
    await assert.rejects(assertSchemaCurrent(db), /pending migrations/);
    await db.runMigrations();
    await assert.doesNotReject(assertSchemaCurrent(db));
    await db.query(`INSERT INTO roles (id, name) VALUES (gen_random_uuid(), 'PLATFORM_ADMIN') ON CONFLICT (name) DO NOTHING`);
    const passwordHash = await bcrypt.hash('temporary-password-12', 12);
    await db.query(`INSERT INTO users (id, role_id, full_name, username, password_hash, must_change_password)
      SELECT gen_random_uuid(), id, 'Quản trị', 'admin', $1, true FROM roles WHERE name = 'PLATFORM_ADMIN'`, [passwordHash]);
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DataSource).useValue(db).compile();
    const app = module.createNestApplication();
    try {
      await app.listen(0, '127.0.0.1');
      const port = app.getHttpServer().address().port;
      const raceOldHash = await bcrypt.hash('race-old-password-123', 12);
      await db.query(`INSERT INTO users (id, role_id, full_name, username, password_hash)
        SELECT gen_random_uuid(), id, 'Race', 'raceuser', $1 FROM roles WHERE name = 'PLATFORM_ADMIN'`, [raceOldHash]);
      const raceLock = db.createQueryRunner();
      await raceLock.connect();
      await raceLock.startTransaction();
      try {
        await raceLock.query("SELECT id FROM users WHERE username = 'raceuser' FOR UPDATE");
        const oldPasswordLogin = app.get(AuthService).login('raceuser', 'race-old-password-123', 'race-ip');
        let waiting = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const rows = await db.query(`SELECT 1 FROM pg_stat_activity WHERE datname = current_database()
            AND wait_event_type = 'Lock' AND query LIKE '%users%'`);
          if (rows.length) { waiting = true; break; }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        assert.equal(waiting, true, 'login must wait for the current user row');
        await raceLock.query("UPDATE users SET password_hash = $1 WHERE username = 'raceuser'", [await bcrypt.hash('race-new-password-123', 12)]);
        await raceLock.commitTransaction();
        await assert.rejects(oldPasswordLogin, (error: any) => error.getStatus() === 401);
      } finally {
        if (raceLock.isTransactionActive) await raceLock.rollbackTransaction();
        await raceLock.release();
      }
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN },
        body: JSON.stringify({ username: ' ADMIN ', password: 'temporary-password-12' }),
      });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.data.user.username, 'admin');
      assert.equal(body.data.user.mustChangePassword, true);
      assert.equal('accessToken' in body.data, false);
      const cookies = response.headers.getSetCookie();
      assert.equal(cookies.length, 3);
      assert.ok(cookies.every((cookie) => cookie.includes('Secure') && cookie.includes('SameSite=Strict')));
      const accessCookie = cookies.find((cookie) => cookie.startsWith('__Host-pos_access='))!;
      const refreshCookie = cookies.find((cookie) => cookie.startsWith('__Host-pos_refresh='))!;
      assert.match(accessCookie, /\bHttpOnly\b/i);
      assert.match(accessCookie, /\bMax-Age=1800\b/i);
      assert.match(refreshCookie, /\bHttpOnly\b/i);
      assert.match(refreshCookie, /\bMax-Age=604800\b/i);
      assert.equal(body.data.expiresIn, 1800);
      const accessClaims = jwt.verify(accessCookie.split(';')[0].split('=')[1], process.env.JWT_SECRET!) as jwt.JwtPayload;
      assert.equal(accessClaims.exp! - accessClaims.iat!, 1800);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM refresh_tokens'))[0].count, 1);
      assert.match((await db.query('SELECT token_hash FROM refresh_tokens'))[0].token_hash, /^[a-f0-9]{64}$/);
      const expiry = (await db.query('SELECT expires_at FROM refresh_tokens LIMIT 1'))[0].expires_at as Date;
      assert.ok(Math.abs(expiry.getTime() - Date.now() - 604800000) < 30000);
      await db.query(`INSERT INTO users (id, role_id, full_name, username, password_hash)
        SELECT gen_random_uuid(), id, 'Legacy', E'\\tlegacy', $1 FROM roles WHERE name = 'PLATFORM_ADMIN'`, [passwordHash]);
      const legacyLogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: '\tlegacy', password: 'temporary-password-12' }),
      });
      assert.equal(legacyLogin.status, 200);
      assert.equal((await legacyLogin.json()).data.user.username, '\tlegacy');
      await db.query(`INSERT INTO users (id, role_id, full_name, username, password_hash)
        SELECT gen_random_uuid(), id, 'Tab only', E'\\t', $1 FROM roles WHERE name = 'PLATFORM_ADMIN'`, [passwordHash]);
      const tabLogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: '\t', password: 'temporary-password-12' }),
      });
      assert.equal(tabLogin.status, 200);
      assert.equal((await tabLogin.json()).data.user.username, '\t');
      const cookieHeader = cookies.map((cookie) => cookie.split(';')[0]).join('; ');
      const firstAccess = cookies.find((cookie) => cookie.startsWith('__Host-pos_access='))!.split(';')[0].split('=')[1];
      await assert.rejects(app.get(AuthService).authorizeAccess(firstAccess, 'platform.store.create'),
        (error: any) => error.getResponse().code === 'PASSWORD_CHANGE_REQUIRED');
      const me = await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: { Cookie: cookieHeader } });
      assert.equal(me.status, 200);
      assert.equal((await me.json()).data.user.username, 'admin');
      await db.query("UPDATE users SET is_active = false WHERE username = 'admin'");
      const disabled = await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: { Cookie: cookieHeader } });
      assert.equal(disabled.status, 403);
      assert.equal((await disabled.json()).error.code, 'ACCOUNT_DISABLED');
      await db.query("UPDATE users SET is_active = true WHERE username = 'admin'");
      const [{ id: storeId }] = await db.query("INSERT INTO stores (id, name) VALUES (gen_random_uuid(), 'Test Store') RETURNING id");
      await db.query("INSERT INTO roles (id, name) VALUES (gen_random_uuid(), 'OWNER') ON CONFLICT (name) DO NOTHING");
      const ownerHash = await bcrypt.hash('owner-password-123', 12);
      await db.query(`INSERT INTO users (id, role_id, store_id, full_name, username, password_hash)
        SELECT gen_random_uuid(), id, $1, 'Chủ cửa hàng', 'owner', $2 FROM roles WHERE name = 'OWNER'`, [storeId, ownerHash]);
      const ownerLogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'owner', password: 'owner-password-123' }),
      });
      assert.equal(ownerLogin.status, 200);
      const ownerHeader = ownerLogin.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
      await db.query("UPDATE stores SET status = 'SUSPENDED' WHERE id = $1", [storeId]);
      const suspended = await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: { Cookie: ownerHeader } });
      assert.equal(suspended.status, 403);
      assert.equal((await suspended.json()).error.code, 'STORE_SUSPENDED');
      await assert.rejects(app.get(AuthService).login('owner', 'owner-password-123', 'owner-ip'),
        (error: any) => error.getResponse().code === 'UNAUTHENTICATED');
      await db.query("UPDATE users SET is_active = false WHERE username = 'admin'");
      const loginErrors = [];
      for (const [username, password] of [
        ['missing-comparison', 'wrong-password-123'],
        ['raceuser', 'wrong-password-123'],
        ['admin', 'temporary-password-12'],
        ['owner', 'owner-password-123'],
      ]) {
        const denied: Response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
          body: JSON.stringify({ username, password }),
        });
        assert.equal(denied.status, 401);
        const error = (await denied.json()).error;
        loginErrors.push({ code: error.code, message: error.message });
      }
      for (const error of loginErrors.slice(1)) assert.deepEqual(error, loginErrors[0]);
      await db.query("UPDATE users SET is_active = true WHERE username = 'admin'");
      await db.query('DELETE FROM auth_rate_events');
      await db.query("UPDATE stores SET status = 'ACTIVE' WHERE id = $1", [storeId]);
      const malformedAccess = jwt.sign({ sid: '-'.repeat(36), role: 'PLATFORM_ADMIN', storeId: null, branchId: null }, process.env.JWT_SECRET!, {
        algorithm: 'HS256', expiresIn: 1800, subject: body.data.user.id,
      });
      const malformedMe = await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, {
        headers: { Cookie: `__Host-pos_access=${malformedAccess}` },
      });
      assert.equal(malformedMe.status, 401);
      const csrf = cookies.find((cookie) => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1];
      const csrfResponse = await fetch(`http://127.0.0.1:${port}/api/v1/auth/csrf`, { headers: { Cookie: cookieHeader } });
      assert.equal(csrfResponse.status, 200);
      assert.equal(csrfResponse.headers.getSetCookie().length, 1);
      const unexpectedRefreshBody = await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
        method: 'POST', headers: { Cookie: cookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
        body: JSON.stringify({ unused: true }),
      });
      assert.equal(unexpectedRefreshBody.status, 422);
      const plainRefreshBody = await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
        method: 'POST', headers: { Cookie: cookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': csrf, 'Content-Type': 'text/plain' },
        body: 'unexpected',
      });
      assert.equal(plainRefreshBody.status, 422);
      const refreshed = await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
        method: 'POST', headers: { Cookie: cookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': csrf },
      });
      assert.equal(refreshed.status, 200);
      assert.equal(refreshed.headers.getSetCookie().length, 2);
      const oldRows = await db.query('SELECT revoked_at, replaced_at FROM refresh_tokens ORDER BY created_at LIMIT 1');
      assert.ok(oldRows[0].revoked_at && oldRows[0].replaced_at);
      const liveSessionLogout = await fetch(`http://127.0.0.1:${port}/api/v1/auth/logout`, {
        method: 'POST', headers: { Cookie: cookieHeader, Origin: process.env.PUBLIC_ORIGIN! },
      });
      assert.equal(liveSessionLogout.status, 403);
      assert.equal((await liveSessionLogout.json()).error.code, 'CSRF_INVALID');
      const replay = await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
        method: 'POST', headers: { Cookie: cookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': csrf },
      });
      assert.equal(replay.status, 401);
      assert.equal(replay.headers.getSetCookie().length, 3);
      const deadSessionLogout = await fetch(`http://127.0.0.1:${port}/api/v1/auth/logout`, {
        method: 'POST', headers: { Cookie: cookieHeader, Origin: process.env.PUBLIC_ORIGIN! },
      });
      assert.equal(deadSessionLogout.status, 204);
      assert.equal(deadSessionLogout.headers.getSetCookie().length, 3);
      const revokedMe = await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: { Cookie: cookieHeader } });
      assert.equal(revokedMe.status, 401);
      const logout = await fetch(`http://127.0.0.1:${port}/api/v1/auth/logout`, {
        method: 'POST', headers: { Origin: process.env.PUBLIC_ORIGIN! },
      });
      assert.equal(logout.status, 204);
      assert.equal(logout.headers.getSetCookie().length, 3);
      const concurrentLogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'admin', password: 'temporary-password-12' }),
      });
      const concurrentCookies = concurrentLogin.headers.getSetCookie();
      const concurrentCookieHeader = concurrentCookies.map((cookie) => cookie.split(';')[0]).join('; ');
      const concurrentCsrf = concurrentCookies.find((cookie) => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1];
      const refreshHeaders = { Cookie: concurrentCookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': concurrentCsrf };
      const concurrent = await Promise.all([0, 1].map(() => fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
        method: 'POST', headers: refreshHeaders,
      })));
      assert.deepEqual(concurrent.map((item) => item.status).sort(), [200, 401]);
      assert.equal((await db.query(`SELECT count(*)::int AS count FROM refresh_tokens
        WHERE session_id = (SELECT session_id FROM refresh_tokens WHERE token_hash = $1) AND revoked_at IS NULL`,
      [createHash('sha256').update(concurrentCookies.find((cookie) => cookie.startsWith('__Host-pos_refresh='))!.split(';')[0].split('=')[1]).digest('hex')]))[0].count, 0);
      const logoutLogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'admin', password: 'temporary-password-12' }),
      });
      const logoutCookies = logoutLogin.headers.getSetCookie();
      const logoutCookieHeader = logoutCookies.map((cookie) => cookie.split(';')[0]).join('; ');
      const logoutCsrf = logoutCookies.find((cookie) => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1];
      const validLogout = await fetch(`http://127.0.0.1:${port}/api/v1/auth/logout`, {
        method: 'POST', headers: { Cookie: logoutCookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': logoutCsrf },
      });
      assert.equal(validLogout.status, 204);
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: { Cookie: logoutCookieHeader } })).status, 401);
      const raceLogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'admin', password: 'temporary-password-12' }),
      });
      const raceCookies = raceLogin.headers.getSetCookie();
      const raceCookieHeader = raceCookies.map((cookie) => cookie.split(';')[0]).join('; ');
      const raceCsrf = raceCookies.find((cookie) => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1];
      const firstRaceRefresh = await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
        method: 'POST', headers: { Cookie: raceCookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': raceCsrf },
      });
      assert.equal(firstRaceRefresh.status, 200);
      const raceNextCookies = firstRaceRefresh.headers.getSetCookie();
      const raceNextHeader = [
        ...raceNextCookies.map((cookie) => cookie.split(';')[0]),
        raceCookies.find((cookie) => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0],
      ].join('; ');
      const [nextRefresh, oldLogout] = await Promise.all([
        fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
          method: 'POST', headers: { Cookie: raceNextHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': raceCsrf },
        }),
        fetch(`http://127.0.0.1:${port}/api/v1/auth/logout`, {
          method: 'POST', headers: { Cookie: raceCookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': raceCsrf },
        }),
      ]);
      assert.ok([200, 401].includes(nextRefresh.status));
      assert.equal(oldLogout.status, 204);
      const raceHash = createHash('sha256').update(raceCookies.find((cookie) => cookie.startsWith('__Host-pos_refresh='))!.split(';')[0].split('=')[1]).digest('hex');
      assert.equal((await db.query(`SELECT count(*)::int AS count FROM refresh_tokens WHERE revoked_at IS NULL
        AND session_id = (SELECT session_id FROM refresh_tokens WHERE token_hash = $1)`, [raceHash]))[0].count, 0);
      const secondLogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'admin', password: 'temporary-password-12' }),
      });
      const secondCookies = secondLogin.headers.getSetCookie();
      const secondCookieHeader = secondCookies.map((cookie) => cookie.split(';')[0]).join('; ');
      const secondCsrf = secondCookies.find((cookie) => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1];
      const otherFirstLogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'admin', password: 'temporary-password-12' }),
      });
      assert.equal(otherFirstLogin.status, 200);
      const otherFirstCookies = otherFirstLogin.headers.getSetCookie();
      const otherFirstHeader = otherFirstCookies.map((cookie) => cookie.split(';')[0]).join('; ');
      const otherFirstCsrf = otherFirstCookies.find((cookie) => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1];
      const badCsrf = await fetch(`http://127.0.0.1:${port}/api/v1/auth/change-password`, {
        method: 'POST', headers: { Cookie: secondCookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': 'wrong', 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: 'new-password-12345' }),
      });
      assert.equal(badCsrf.status, 403);
      const shortPassword = await fetch(`http://127.0.0.1:${port}/api/v1/auth/change-password`, {
        method: 'POST', headers: { Cookie: secondCookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': secondCsrf, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: '12345678901' }),
      });
      assert.equal(shortPassword.status, 422);
      const changed = await fetch(`http://127.0.0.1:${port}/api/v1/auth/change-password`, {
        method: 'POST', headers: { Cookie: secondCookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': secondCsrf, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: 'new-password-12345' }),
      });
      assert.equal(changed.status, 204);
      const userAfter = (await db.query('SELECT password_hash, must_change_password FROM users WHERE username = $1', ['admin']))[0];
      assert.equal(userAfter.must_change_password, false);
      assert.equal(await bcrypt.compare('new-password-12345', userAfter.password_hash), true);
      const revokedAfterChange = await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: { Cookie: secondCookieHeader } });
      assert.equal(revokedAfterChange.status, 401);
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: { Cookie: otherFirstHeader } })).status, 401);
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
        method: 'POST', headers: { Cookie: otherFirstHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': otherFirstCsrf },
      })).status, 401);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL', [body.data.user.id]))[0].count, 0);
      await db.query(`INSERT INTO users (id, role_id, full_name, username, password_hash, must_change_password)
        SELECT gen_random_uuid(), id, 'Boundary', 'boundary-test', $1, true FROM roles WHERE name = 'PLATFORM_ADMIN'`, [passwordHash]);
      const boundaryLogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'boundary-test', password: 'temporary-password-12' }),
      });
      assert.equal(boundaryLogin.status, 200);
      const boundaryCookies = boundaryLogin.headers.getSetCookie();
      const boundaryHeader = boundaryCookies.map((cookie) => cookie.split(';')[0]).join('; ');
      const boundaryCsrf = boundaryCookies.find((cookie) => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1];
      const boundaryChange = await fetch(`http://127.0.0.1:${port}/api/v1/auth/change-password`, {
        method: 'POST', headers: { Cookie: boundaryHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': boundaryCsrf, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: '123456789012' }),
      });
      assert.equal(boundaryChange.status, 204);
      const boundaryRelogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'boundary-test', password: '123456789012' }),
      });
      assert.equal(boundaryRelogin.status, 200);
      const thirdLogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'admin', password: 'new-password-12345' }),
      });
      assert.equal(thirdLogin.status, 200);
      const thirdCookies = thirdLogin.headers.getSetCookie();
      const thirdCookieHeader = thirdCookies.map((cookie) => cookie.split(';')[0]).join('; ');
      const thirdCsrf = thirdCookies.find((cookie) => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1];
      const access = thirdCookies.find((cookie) => cookie.startsWith('__Host-pos_access='))!.split(';')[0].split('=')[1];
      const auth = app.get(AuthService);
      const racePasswordLogin = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'admin', password: 'new-password-12345' }),
      });
      const racePasswordCookies = racePasswordLogin.headers.getSetCookie();
      const racePasswordHeader = racePasswordCookies.map((cookie) => cookie.split(';')[0]).join('; ');
      const racePasswordCsrf = racePasswordCookies.find((cookie) => cookie.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1];
      const racePasswordAccess = racePasswordCookies.find((cookie) => cookie.startsWith('__Host-pos_access='))!.split(';')[0].split('=')[1];
      const raceSessionId = (jwt.verify(racePasswordAccess, process.env.JWT_SECRET!) as jwt.JwtPayload).sid;
      const lock = db.createQueryRunner();
      await lock.connect();
      await lock.startTransaction();
      try {
        await lock.query("SELECT id FROM users WHERE username = 'admin' FOR UPDATE");
        const pendingChange = fetch(`http://127.0.0.1:${port}/api/v1/auth/change-password`, {
          method: 'POST', headers: { Cookie: racePasswordHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': racePasswordCsrf, 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: 'race-password-12345', currentPassword: 'new-password-12345' }),
        });
        let waiting = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const rows = await db.query(`SELECT 1 FROM pg_stat_activity WHERE datname = current_database()
            AND wait_event_type = 'Lock' AND (query LIKE '%SELECT u.password_hash%' OR query LIKE '%users%')`);
          if (rows.length) { waiting = true; break; }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        assert.equal(waiting, true, 'change-password must wait on the user lock');
        await lock.query('UPDATE refresh_tokens SET revoked_at = now() WHERE session_id = $1 AND revoked_at IS NULL', [raceSessionId]);
        await lock.commitTransaction();
        assert.equal((await pendingChange).status, 401);
        assert.equal(await bcrypt.compare('new-password-12345', (await db.query("SELECT password_hash FROM users WHERE username = 'admin'"))[0].password_hash), true);
      } finally {
        if (lock.isTransactionActive) await lock.rollbackTransaction();
        await lock.release();
      }
      await db.query(`DELETE FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'PLATFORM_ADMIN')
        AND permission_id = (SELECT id FROM permissions WHERE code = 'store.create')`);
      await assert.rejects(auth.authorizeAccess(access, 'store.create'), (error: any) => error.getResponse().code === 'PERMISSION_DENIED');
      await db.query(`INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'PLATFORM_ADMIN' AND p.code = 'store.create'`);
      assert.equal((await auth.authorizeAccess(access, 'store.create')).username, 'admin');
      const updatedMe = await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: { Cookie: thirdCookieHeader } });
      assert.equal(updatedMe.status, 200);
      assert.ok((await updatedMe.json()).data.user.permissions.includes('store.create'));
      await db.query("INSERT INTO permissions (id, code) VALUES (gen_random_uuid(), 'pos.sell') ON CONFLICT (code) DO NOTHING");
      await db.query(`INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'PLATFORM_ADMIN' AND p.code = 'pos.sell'`);
      await assert.rejects(auth.authorizeAccess(access, 'pos.sell'), (error: any) => error.getResponse().code === 'PERMISSION_DENIED');
      const wrongCurrent = await fetch(`http://127.0.0.1:${port}/api/v1/auth/change-password`, {
        method: 'POST', headers: { Cookie: thirdCookieHeader, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': thirdCsrf, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: 'another-password-123', currentPassword: 'wrong-password' }),
      });
      assert.equal(wrongCurrent.status, 401);
      assert.equal((await wrongCurrent.json()).error.code, 'CURRENT_PASSWORD_INVALID');
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: { Cookie: thirdCookieHeader } })).status, 200);
      const missingUser = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'unknown', password: 'wrong-password' }),
      });
      assert.equal(missingUser.status, 401);
      for (let attempt = 0; attempt < 4; attempt++) {
        const failed: Response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
          body: JSON.stringify({ username: 'admin', password: 'wrong-password' }),
        });
        assert.equal(failed.status, 401);
      }
      const limited = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
        body: JSON.stringify({ username: 'admin', password: 'new-password-12345' }),
      });
      assert.equal(limited.status, 429);
      assert.ok(Number(limited.headers.get('Retry-After')) > 0);
      await assert.rejects(auth.login('admin', 'wrong-password', 'other-ip'), (error: any) => error.getStatus() === 401);
      await assert.rejects(auth.login('admin', 'new-password-12345', 'third-ip'), (error: any) => error.getStatus() === 429);
      await db.query("DELETE FROM auth_rate_events WHERE scope = 'refresh_ip'");
      for (let attempt = 0; attempt < 30; attempt++) {
        const invalidRefresh: Response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
          method: 'POST', headers: { Origin: process.env.PUBLIC_ORIGIN! },
        });
        assert.equal(invalidRefresh.status, 401);
      }
      const limitedRefresh = await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
        method: 'POST', headers: { Origin: process.env.PUBLIC_ORIGIN! },
      });
      assert.equal(limitedRefresh.status, 429);

      // BR-03/04: two independent sessions; logout must only revoke the caller.
      await db.query('DELETE FROM auth_rate_events');
      const loginDevice = async () => {
        const result = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.PUBLIC_ORIGIN! },
          body: JSON.stringify({ username: 'admin', password: 'new-password-12345' }),
        });
        assert.equal(result.status, 200);
        const values = result.headers.getSetCookie();
        return {
          cookie: values.map((value) => value.split(';')[0]).join('; '),
          csrf: values.find((value) => value.startsWith('__Host-pos_csrf='))!.split(';')[0].split('=')[1],
        };
      };
      const deviceA = await loginDevice();
      const deviceB = await loginDevice();
      const headersA = { Cookie: deviceA.cookie, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': deviceA.csrf };
      const headersB = { Cookie: deviceB.cookie, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': deviceB.csrf };
      for (const route of ['refresh', 'logout', 'change-password']) {
        for (const variant of ['missing-origin', 'wrong-origin', 'missing-csrf', 'wrong-csrf']) {
          const headers: Record<string, string> = { Cookie: deviceA.cookie };
          if (route === 'change-password') headers['Content-Type'] = 'application/json';
          if (variant !== 'missing-origin') headers.Origin = variant === 'wrong-origin' ? 'http://untrusted.invalid' : process.env.PUBLIC_ORIGIN!;
          if (variant !== 'missing-csrf') headers['X-CSRF-Token'] = variant === 'wrong-csrf' ? 'wrong' : deviceA.csrf;
          const denied: Response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/${route}`, {
            method: 'POST', headers,
            ...(route === 'change-password' ? { body: JSON.stringify({ currentPassword: 'new-password-12345', newPassword: 'another-password-123' }) } : {}),
          });
          assert.equal(denied.status, 403, `${route}: ${variant}`);
          assert.equal((await denied.json()).error.code, 'CSRF_INVALID', `${route}: ${variant}`);
        }
      }
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: headersA })).status, 200);
      const logoutA = await fetch(`http://127.0.0.1:${port}/api/v1/auth/logout`, { method: 'POST', headers: headersA });
      assert.equal(logoutA.status, 204);
      assert.equal(logoutA.headers.getSetCookie().length, 3);
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: headersA })).status, 401);
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, { method: 'POST', headers: headersA })).status, 401);
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: headersB })).status, 200);
      const refreshedB = await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, { method: 'POST', headers: headersB });
      assert.equal(refreshedB.status, 200);
      const refreshedBHeader = [
        ...refreshedB.headers.getSetCookie().map((value) => value.split(';')[0]),
        `__Host-pos_csrf=${deviceB.csrf}`,
      ].join('; ');

      // BR-03: a failed token insert must roll back rotation of the old token.
      await db.query(`CREATE FUNCTION test_fail_token_insert() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'injected token insert failure'; END $$`);
      await db.query(`CREATE TRIGGER test_fail_token_insert BEFORE INSERT ON refresh_tokens
        FOR EACH ROW EXECUTE FUNCTION test_fail_token_insert()`);
      try {
        const failedRefresh = await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
          method: 'POST', headers: { ...headersB, Cookie: refreshedBHeader },
        });
        assert.equal(failedRefresh.status, 500);
        assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: { Cookie: refreshedBHeader } })).status, 200);
      } finally {
        await db.query('DROP TRIGGER test_fail_token_insert ON refresh_tokens');
        await db.query('DROP FUNCTION test_fail_token_insert()');
      }
      const retriedRefresh = await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
        method: 'POST', headers: { ...headersB, Cookie: refreshedBHeader },
      });
      assert.equal(retriedRefresh.status, 200);

      const deviceC = await loginDevice();
      const headersC = { Cookie: deviceC.cookie, Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': deviceC.csrf, 'Content-Type': 'application/json' };
      // BR-01/03: a failed revocation must roll back the password update too.
      await db.query(`CREATE FUNCTION test_fail_token_update() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'injected token update failure'; END $$`);
      await db.query(`CREATE TRIGGER test_fail_token_update BEFORE UPDATE ON refresh_tokens
        FOR EACH ROW EXECUTE FUNCTION test_fail_token_update()`);
      try {
        const failedChange = await fetch(`http://127.0.0.1:${port}/api/v1/auth/change-password`, {
          method: 'POST', headers: headersC,
          body: JSON.stringify({ currentPassword: 'new-password-12345', newPassword: 'voluntary-password-123' }),
        });
        assert.equal(failedChange.status, 500);
        const stored = (await db.query("SELECT password_hash FROM users WHERE username = 'admin'"))[0];
        assert.equal(await bcrypt.compare('new-password-12345', stored.password_hash), true);
        assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: headersC })).status, 200);
      } finally {
        await db.query('DROP TRIGGER test_fail_token_update ON refresh_tokens');
        await db.query('DROP FUNCTION test_fail_token_update()');
      }
      const voluntaryChange = await fetch(`http://127.0.0.1:${port}/api/v1/auth/change-password`, {
        method: 'POST', headers: headersC,
        body: JSON.stringify({ currentPassword: 'new-password-12345', newPassword: 'voluntary-password-123' }),
      });
      assert.equal(voluntaryChange.status, 204);
      assert.equal(voluntaryChange.headers.getSetCookie().length, 3);
      assert.equal(await bcrypt.compare('voluntary-password-123', (await db.query("SELECT password_hash FROM users WHERE username = 'admin'"))[0].password_hash), true);
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: headersC })).status, 401);
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`, { headers: headersB })).status, 401);
      const retriedBHeader = [...retriedRefresh.headers.getSetCookie().map((value) => value.split(';')[0]), `__Host-pos_csrf=${deviceB.csrf}`].join('; ');
      assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/refresh`, {
        method: 'POST', headers: { ...headersB, Cookie: retriedBHeader },
      })).status, 401);
    } finally {
      await app.close();
    }
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});
