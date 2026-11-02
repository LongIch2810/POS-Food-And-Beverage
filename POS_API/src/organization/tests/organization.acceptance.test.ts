import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { request as nodeRequest } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import * as bcrypt from 'bcryptjs';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { LoggerService } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';

test('PB-04 acceptance evidence AUD-01..05 with PostgreSQL and captured app logs', { timeout: 240_000 }, async t => {
  const name = `pos_pb04_acceptance_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const queries: string[] = [];
  const db = new DataSource({ type: 'postgres', url: url.toString(),
    entities: dataSource.options.entities, migrations: dataSource.options.migrations,
    logging: ['query'], logger: {
      logQuery: query => { queries.push(query); }, logQueryError() {}, logQuerySlow() {},
      logSchemaBuild() {}, logMigration() {}, log() {},
    } });
  const secrets = new Set<string>();
  const secret = () => { const value = randomBytes(18).toString('base64url'); secrets.add(value); return value; };
  const bootstrapPassword = secret();
  process.env.PUBLIC_ORIGIN = 'http://localhost:5173';
  process.env.JWT_SECRET = secret() + secret();
  process.env.CSRF_SECRET = secret() + secret();
  secrets.add(process.env.JWT_SECRET); secrets.add(process.env.CSRF_SECRET);
  process.env.BOOTSTRAP_ADMIN_USERNAME = 'audit_admin';
  process.env.BOOTSTRAP_ADMIN_FULL_NAME = 'QA Admin';
  process.env.BOOTSTRAP_ADMIN_PASSWORD = bootstrapPassword;
  let currentCase = 'SETUP';
  const events: Array<{ case: string; level: string; message: string }> = [];
  const capture = (level: string, values: unknown[]) => events.push({ case: currentCase, level,
    message: values.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' ') });
  const logger: LoggerService = { log: (...values) => capture('log', values), error: (...values) => capture('error', values),
    warn: (...values) => capture('warn', values), debug: (...values) => capture('debug', values), verbose: (...values) => capture('verbose', values) };
  const redact = (value: unknown): unknown => {
    if (value === undefined) return undefined;
    let serialized = JSON.stringify(value);
    for (const sensitive of secrets) serialized = serialized.split(sensitive).join('[REDACTED_SECRET]');
    return JSON.parse(serialized);
  };
  await dataSource.initialize();
  let created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`); created = true;
    await db.initialize(); await db.runMigrations(); await bootstrapAdmin(db);
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DataSource).useValue(db).compile();
    const app = module.createNestApplication({ logger });
    try {
      await app.listen(0, '127.0.0.1');
      const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
      type Session = { cookie: string; csrf: string };
      type Options = { method?: string; body?: unknown; raw?: string; headers?: Record<string, string> };
      const view = async () => {
        const [stores, branches, tables, users, sessions] = await Promise.all([
          db.query('SELECT id,status FROM stores ORDER BY id'),
          db.query('SELECT id,store_id,code,name,address,phone,initial_cash,is_active,created_at,updated_at FROM branches ORDER BY id'),
          db.query('SELECT id,branch_id,name,area,capacity,is_active,created_at,updated_at FROM dining_tables ORDER BY id'),
          db.query(`SELECT u.id,u.store_id,u.branch_id,r.name AS role,u.username,u.full_name,u.phone,u.is_active,u.must_change_password,u.created_at,u.updated_at
            FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id`),
          db.query(`SELECT user_id,count(*)::int AS total,count(*) FILTER (WHERE revoked_at IS NULL AND expires_at>now())::int AS active
            FROM refresh_tokens GROUP BY user_id ORDER BY user_id`),
        ]);
        return { stores, branches, tables, users, sessions };
      };
      const cookieMetadata = (cookies: string[]) => cookies.map(cookie => {
        const [pair, ...attributes] = cookie.split(';').map(value => value.trim());
        return { name: pair.split('=')[0], attributes };
      });
      const fields = {
        branch: ['id', 'storeId', 'code', 'name', 'address', 'phone', 'initialCash', 'isActive', 'createdAt', 'updatedAt'],
        table: ['id', 'branchId', 'name', 'area', 'capacity', 'isActive', 'createdAt', 'updatedAt'],
        staff: ['id', 'storeId', 'branchId', 'username', 'fullName', 'role', 'isActive', 'mustChangePassword', 'createdAt', 'updatedAt'],
      };
      const publicEntity = (entity: Record<string, unknown>, kind: keyof typeof fields) => {
        assert.deepEqual(Object.keys(entity).sort(), [...fields[kind]].sort(), `${kind} response has only public DTO fields`);
        for (const key of ['createdAt', 'updatedAt']) {
          assert.equal(typeof entity[key], 'string'); assert.ok(String(entity[key]).endsWith('Z'));
          assert.ok(Number.isFinite(Date.parse(String(entity[key]))));
        }
        if (kind === 'branch') assert.ok(Number.isSafeInteger(entity.initialCash) && Number(entity.initialCash) >= 0);
      };
      const noSecretKeys = (value: unknown): void => {
        if (!value || typeof value !== 'object') return;
        for (const [key, child] of Object.entries(value)) {
          assert.equal(['passwordHash', 'password_hash', 'tokenHash', 'token_hash', 'accessToken', 'refreshToken', 'access', 'refresh'].includes(key), false,
            'response excludes token/password hash fields');
          noSecretKeys(child);
        }
      };
      const call = async (session: Session | undefined, path: string, options: Options = {}) => {
        const method = options.method ?? 'GET';
        const mutation = method !== 'GET' && method !== 'HEAD';
        const before = mutation ? await view() : undefined;
        const headers: Record<string, string> = { Origin: process.env.PUBLIC_ORIGIN!,
          ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
          ...(options.body !== undefined || options.raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
        const requestBody = options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
        const response = await fetch(`${base}${path}`, { method, headers,
          ...(requestBody === undefined ? {} : { body: requestBody }) });
        const body = response.status === 204 ? undefined : await response.json();
        noSecretKeys(body);
        if (body?.data?.temporaryPassword) secrets.add(body.data.temporaryPassword);
        const cookies = response.headers.getSetCookie();
        for (const cookie of cookies) {
          const pair = cookie.split(';')[0]; const value = pair.slice(pair.indexOf('=') + 1);
          if (value) secrets.add(value);
        }
        const cookieJar = new Map((session?.cookie ? session.cookie.split('; ') : []).map(pair =>
          [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)]));
        for (const cookie of cookies) {
          const pair = cookie.split(';')[0]; const key = pair.slice(0, pair.indexOf('=')); const value = pair.slice(pair.indexOf('=') + 1);
          if (value) cookieJar.set(key, value); else cookieJar.delete(key);
        }
        const issued = cookies.length ? { cookie: [...cookieJar].map(([key, value]) => `${key}=${value}`).join('; '),
          csrf: cookieJar.get('__Host-pos_csrf') ?? '' } : undefined;
        if (response.status >= 200 && response.status < 300 && body?.data) {
          const resource = path.split('?')[0];
          const kind = resource.startsWith('/branches') ? 'branch' : resource.startsWith('/dining-tables') ? 'table' : undefined;
          if (kind) for (const entity of Array.isArray(body.data) ? body.data : [body.data]) publicEntity(entity, kind);
          if (resource.startsWith('/users')) {
            for (const entity of Array.isArray(body.data) ? body.data : [body.data.user ?? body.data]) {
              if (entity.branchId) publicEntity(entity, 'staff');
            }
          }
        }
        const requestId = response.headers.get('X-Request-Id');
        assert.ok(requestId, 'HTTP response has request ID');
        if (body?.error) assert.equal(body.error.requestId, requestId);
        const after = mutation ? await view() : undefined;
        t.diagnostic(JSON.stringify(redact({ case: currentCase, kind: 'HTTP', request: { method, path,
          body: options.raw ?? options.body, headers: { ...headers, Cookie: session ? '[REDACTED]' : undefined,
            'X-CSRF-Token': session ? '[REDACTED]' : undefined } },
          response: { status: response.status, requestId, body, cookies: cookieMetadata(cookies) }, db: { before, after } })));
        return { status: response.status, body, issued, requestId, before, after };
      };
      const denied = async (session: Session, path: string, options: Options, status: number, code: string) => {
        const before = await view();
        const response = await call(session, path, options);
        assert.equal(response.status, status, `${options.method ?? 'GET'} ${path}`);
        assert.equal(response.body.error.code, code);
        const after = await view();
        assert.deepEqual(after, before, 'denied operation leaves all business rows/sessions unchanged');
        if (!response.before) t.diagnostic(JSON.stringify({ case: currentCase, kind: 'DENIAL_DB', path, before, after }));
      };
      const loginResult = async (username: string, password: string) => {
        secrets.add(password);
        return call(undefined, '/auth/login', { method: 'POST', body: { username, password } });
      };
      const login = async (username: string, password: string) => {
        const response = await loginResult(username, password);
        assert.equal(response.status, 200, 'QA fixture login'); assert.ok(response.issued); return response.issued;
      };
      const activeSessions = async (id: string) => (await db.query(`SELECT count(*)::int AS n FROM refresh_tokens
        WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now()`, [id]))[0].n as number;
      const run = async (id: string, action: () => Promise<void>) => {
        await t.test(id, async () => {
          currentCase = id;
          await db.query('DELETE FROM auth_rate_events'); // QA fixture reset; rate limiting itself is covered by PB-02.
          try { await action(); } finally { currentCase = 'SETUP'; }
        });
      };
      const changeFirstPassword = async (username: string, temporaryPassword: string) => {
        const first = await login(username, temporaryPassword); const password = secret();
        assert.equal((await call(first, '/auth/change-password', { method: 'POST', body: { newPassword: password } })).status, 204);
        assert.equal((await call(first, '/auth/me')).status, 401);
        return { session: await login(username, password), password };
      };
      const admin = await login('audit_admin', bootstrapPassword);
      const makeStore = async (suffix: string) => {
        const response = await call(admin, '/platform/stores', { method: 'POST', body: {
          name: `QA Store ${suffix}`, owner: { username: `qa_owner_${suffix}`, fullName: `QA Owner ${suffix}` },
        } });
        assert.equal(response.status, 201);
        return response.body.data;
      };
      const storeA = await makeStore('a'); const storeB = await makeStore('b');
      const firstOwner = await login('qa_owner_a', storeA.temporaryPassword);
      const placeholder = randomUUID();
      const operations = (branchId: string, tableId: string, userId: string): Array<[string, Options]> => [
        ['/branches', {}], ['/branches', { method: 'POST', body: { code: 'XX', name: 'Forbidden' } }],
        [`/branches/${branchId}`, { method: 'PATCH', body: { name: 'Forbidden' } }],
        ['/dining-tables', {}], ['/dining-tables', { method: 'POST', body: { branchId, name: 'Forbidden' } }],
        [`/dining-tables/${tableId}`, { method: 'PATCH', body: { name: 'Forbidden' } }],
        ['/users', {}], ['/users', { method: 'POST', body: { branchId, role: 'CASHIER', username: 'forbidden', fullName: 'QA' } }],
        [`/users/${userId}`, { method: 'PATCH', body: { isActive: false } }],
        [`/users/${userId}/reset-password`, { method: 'POST' }],
      ];
      await run('ACC-AUTH-01 BR-84 OWNER first-password gate on all 10 organization operations', async () => {
        for (const [path, options] of operations(placeholder, placeholder, placeholder)) {
          await denied(firstOwner, path, options, 403, 'PASSWORD_CHANGE_REQUIRED');
        }
      });
      const ownerCredentials = await changeFirstPassword('qa_owner_a', storeA.temporaryPassword);
      let owner = ownerCredentials.session;
      const otherCredentials = await changeFirstPassword('qa_owner_b', storeB.temporaryPassword);
      const other = otherCredentials.session;
      const makeBranch = async (session: Session, code: string) => {
        const response = await call(session, '/branches', { method: 'POST', body: { code, name: `QA Branch ${code}` } });
        assert.equal(response.status, 201); assert.equal(response.body.data.initialCash, 0); assert.equal(response.body.data.isActive, true);
        return response.body.data;
      };
      const a1 = await makeBranch(owner, 'A1'); const a2 = await makeBranch(owner, 'A2'); const b1 = await makeBranch(other, 'B1');
      const makeTable = async (session: Session, branchId: string, name: string) => {
        const response = await call(session, '/dining-tables', { method: 'POST', body: { branchId, name } });
        assert.equal(response.status, 201); assert.equal(response.body.data.isActive, true); return response.body.data;
      };
      const ta1 = await makeTable(owner, a1.id, 'A1 Table'); const ta2 = await makeTable(owner, a2.id, 'A2 Table');
      const tb1 = await makeTable(other, b1.id, 'B1 Table');
      let serial = 0;
      const makeStaff = async (session: Session, branchId: string, role: 'MANAGER' | 'CASHIER', prefix = 'staff') => {
        const username = `qa_${prefix}_${++serial}`;
        const response = await call(session, '/users', { method: 'POST', body: { branchId, username, fullName: 'QA Staff', role } });
        assert.equal(response.status, 201); assert.equal(response.body.data.user.isActive, true);
        assert.equal(response.body.data.user.mustChangePassword, true);
        return { ...response.body.data.user, temporaryPassword: response.body.data.temporaryPassword };
      };
      const managerA1 = await makeStaff(owner, a1.id, 'MANAGER');
      const staffA1 = await makeStaff(owner, a1.id, 'CASHIER');
      const staffA2 = await makeStaff(owner, a2.id, 'CASHIER');
      const staffB1 = await makeStaff(other, b1.id, 'CASHIER');
      const managerCredentials = await changeFirstPassword(managerA1.username, managerA1.temporaryPassword);
      let manager = managerCredentials.session;
      const cashierCredentials = await changeFirstPassword(staffA1.username, staffA1.temporaryPassword);
      const cashier = cashierCredentials.session;

      const permission = async (role: string, code: string, enabled: boolean) => {
        const sql = enabled
          ? `INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r,permissions p
              WHERE r.name=$1 AND p.code=$2 ON CONFLICT DO NOTHING`
          : `DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name=$1)
              AND permission_id=(SELECT id FROM permissions WHERE code=$2)`;
        await db.query(sql, [role, code]);
        const rows = await db.query(`SELECT p.code FROM role_permissions rp JOIN roles r ON r.id=rp.role_id
          JOIN permissions p ON p.id=rp.permission_id WHERE r.name=$1 ORDER BY p.code`, [role]);
        t.diagnostic(JSON.stringify({ case: currentCase, kind: 'QA_PERMISSION_FIXTURE', role, code, enabled, actual: rows }));
      };
      const ids = (response: { body: { data: Array<{ id: string }> } }) => response.body.data.map(row => row.id).sort();

      await run('ACC-SCOPE-01 BR-05/70/71/71b/80 same-store A1/A2 versus store B', async () => {
        assert.deepEqual(ids(await call(manager, '/branches')), [a1.id]);
        assert.deepEqual(ids(await call(manager, '/dining-tables')), [ta1.id]);
        assert.deepEqual(ids(await call(manager, `/dining-tables?branchId=${a2.id}`)), [ta1.id]);
        assert.deepEqual(ids(await call(manager, `/dining-tables?branchId=${b1.id}`)), [ta1.id]);
        for (const table of [ta2, tb1]) await denied(manager, `/dining-tables/${table.id}`,
          { method: 'PATCH', body: { name: 'Denied cross branch' } }, 404, 'NOT_FOUND');
        await denied(manager, '/dining-tables', { method: 'POST', body: { branchId: a2.id, name: 'Denied override' } }, 422, 'VALIDATION_ERROR');
        await denied(owner, '/dining-tables', { method: 'POST', body: { name: 'Missing branch' } }, 422, 'VALIDATION_ERROR');
        for (const table of [tb1]) await denied(owner, `/dining-tables/${table.id}`,
          { method: 'PATCH', body: { name: 'Denied store' } }, 404, 'NOT_FOUND');
        await denied(owner, `/dining-tables?branchId=${b1.id}`, {}, 404, 'NOT_FOUND');
        await denied(owner, `/users?branchId=${b1.id}`, {}, 404, 'NOT_FOUND');
        assert.deepEqual(ids(await call(owner, `/dining-tables?branchId=${a2.id}`)), [ta2.id]);
        assert.deepEqual(ids(await call(owner, `/users?branchId=${a2.id}`)), [staffA2.id]);
        assert.deepEqual(ids(await call(owner, '/branches')), [a1.id, a2.id].sort());
        assert.deepEqual(ids(await call(owner, '/dining-tables')), [ta1.id, ta2.id].sort());
        assert.deepEqual(ids(await call(owner, '/users')), [managerA1.id, staffA1.id, staffA2.id].sort());
        await permission('MANAGER', 'user.manage', true);
        try {
          assert.deepEqual(ids(await call(manager, `/users?branchId=${a2.id}`)), [managerA1.id, staffA1.id].sort());
          for (const staff of [staffA2, staffB1]) {
            await denied(manager, `/users/${staff.id}`, { method: 'PATCH', body: { isActive: false } }, 404, 'NOT_FOUND');
            await denied(manager, `/users/${staff.id}/reset-password`, { method: 'POST' }, 404, 'NOT_FOUND');
          }
          await denied(manager, '/users', { method: 'POST', body: {
            branchId: a2.id, username: 'wrong_branch', fullName: 'QA', role: 'CASHIER',
          } }, 404, 'NOT_FOUND');
          await denied(manager, '/users', { method: 'POST', body: {
            branchId: a1.id, username: 'peer_manager', fullName: 'QA', role: 'MANAGER',
          } }, 403, 'PERMISSION_DENIED');
          for (const id of [managerA1.id, managerA1.id.toUpperCase()]) {
            await denied(manager, `/users/${id}`, { method: 'PATCH', body: { isActive: false } }, 403, 'PERMISSION_DENIED');
            await denied(manager, `/users/${id}`, { method: 'PATCH', body: { role: 'CASHIER' } }, 403, 'PERMISSION_DENIED');
          }
        } finally { await permission('MANAGER', 'user.manage', false); }
        for (const target of [storeA.owner.id, storeB.owner.id, staffB1.id]) {
          await denied(owner, `/users/${target}`, { method: 'PATCH', body: { isActive: false } }, 404, 'NOT_FOUND');
          await denied(owner, `/users/${target}/reset-password`, { method: 'POST' }, 404, 'NOT_FOUND');
        }
        await denied(owner, `/users/${(await db.query("SELECT id FROM users WHERE username='audit_admin'"))[0].id}`,
          { method: 'PATCH', body: { isActive: false } }, 404, 'NOT_FOUND');
      });

      await run('ACC-AUTH-02 BR-05 current permissions and branch override stale JWT claims', async () => {
        for (const [code, paths] of [
          ['branch.read', operations(a1.id, ta1.id, staffA1.id).slice(0, 1)],
          ['branch.manage', operations(a1.id, ta1.id, staffA1.id).slice(1, 3)],
          ['table.manage', operations(a1.id, ta1.id, staffA1.id).slice(3, 6)],
          ['user.manage', operations(a1.id, ta1.id, staffA1.id).slice(6)],
        ] as Array<[string, Array<[string, Options]>]>) {
          await permission('OWNER', code, false);
          try { for (const [path, options] of paths) await denied(owner, path, options, 403, 'PERMISSION_DENIED'); }
          finally { await permission('OWNER', code, true); }
        }
        for (const [path, options] of operations(a1.id, ta1.id, staffA1.id)) {
          await denied(cashier, path, options, 403, 'PERMISSION_DENIED');
        }
        for (const [path, options] of [...operations(a1.id, ta1.id, staffA1.id).slice(1, 3),
          ...operations(a1.id, ta1.id, staffA1.id).slice(6)]) {
          await denied(manager, path, options, 403, 'PERMISSION_DENIED');
        }
        await permission('MANAGER', 'table.manage', false);
        try { await denied(manager, '/dining-tables', {}, 403, 'PERMISSION_DENIED'); }
        finally { await permission('MANAGER', 'table.manage', true); }
        await db.query('UPDATE users SET branch_id=$2 WHERE id=$1', [managerA1.id, a2.id]);
        try {
          assert.deepEqual(ids(await call(manager, '/branches')), [a2.id]);
          assert.deepEqual(ids(await call(manager, `/dining-tables?branchId=${a1.id}`)), [ta2.id]);
          await denied(manager, `/dining-tables/${ta1.id}`, { method: 'PATCH', body: { isActive: false } }, 404, 'NOT_FOUND');
          const result = await call(manager, '/dining-tables', { method: 'POST', body: { name: 'Current branch fixture' } });
          assert.equal(result.status, 201); assert.equal(result.body.data.branchId, a2.id);
        } finally { await db.query('UPDATE users SET branch_id=$2 WHERE id=$1', [managerA1.id, a1.id]); }
        for (const code of ['branch.read', 'branch.manage', 'table.manage', 'user.manage']) await permission('PLATFORM_ADMIN', code, true);
        try {
          for (const [path, options] of operations(a1.id, ta1.id, staffA1.id).slice(0, 6)) {
            await denied(admin, path, options, 403, 'PERMISSION_DENIED');
          }
          await denied(admin, `/users/${staffA1.id}`, { method: 'PATCH', body: { isActive: false } }, 403, 'PERMISSION_DENIED');
          await denied(admin, `/users/${staffA1.id}/reset-password`, { method: 'POST' }, 404, 'NOT_FOUND');
          await denied(admin, '/users', { method: 'POST', body: {
            branchId: a1.id, role: 'CASHIER', username: 'platform_staff', fullName: 'QA',
          } }, 422, 'VALIDATION_ERROR');
          const owners = await call(admin, '/users?role=OWNER');
          assert.equal(owners.status, 200); assert.deepEqual(ids(owners), [storeA.owner.id, storeB.owner.id].sort());
        } finally {
          for (const code of ['branch.read', 'branch.manage', 'table.manage', 'user.manage']) await permission('PLATFORM_ADMIN', code, false);
        }
      });

      await run('ACC-AUTH-03 BR-02/03/82 blocked user/store on all real organization operations', async () => {
        await db.query('UPDATE users SET is_active=false WHERE id=$1', [storeA.owner.id]);
        try {
          for (const [path, options] of operations(a1.id, ta1.id, staffA1.id)) await denied(owner, path, options, 403, 'ACCOUNT_DISABLED');
        } finally { await db.query('UPDATE users SET is_active=true WHERE id=$1', [storeA.owner.id]); }
        await db.query("UPDATE stores SET status='SUSPENDED' WHERE id=$1", [storeA.store.id]);
        try {
          for (const [path, options] of operations(a1.id, ta1.id, staffA1.id)) await denied(owner, path, options, 403, 'STORE_SUSPENDED');
        } finally { await db.query("UPDATE stores SET status='ACTIVE' WHERE id=$1", [storeA.store.id]); }
        const before = await view();
        const suspended = await call(admin, `/platform/stores/${storeA.store.id}/suspend`, { method: 'POST', body: { reason: 'QA evidence fixture' } });
        assert.equal(suspended.status, 200);
        const after = await view();
        assert.deepEqual(after.branches, before.branches); assert.deepEqual(after.tables, before.tables); assert.deepEqual(after.users, before.users);
        assert.equal(await activeSessions(storeA.owner.id), 0);
        for (const [path, options] of operations(a1.id, ta1.id, staffA1.id)) await denied(owner, path, options, 401, 'UNAUTHENTICATED');
        assert.equal((await loginResult('qa_owner_a', ownerCredentials.password)).status, 401);
        assert.equal((await call(admin, `/platform/stores/${storeA.store.id}/reactivate`, { method: 'POST' })).status, 200);
        await denied(owner, '/branches', {}, 401, 'UNAUTHENTICATED');
        owner = await login('qa_owner_a', ownerCredentials.password);
        manager = await login(managerA1.username, managerCredentials.password);
        assert.equal((await call(owner, `/users/${managerA1.id}`, { method: 'PATCH', body: { isActive: false } })).status, 200);
        for (const [path, options] of operations(a1.id, ta1.id, staffA1.id)) await denied(manager, path, options, 401, 'UNAUTHENTICATED');
        assert.equal(await activeSessions(managerA1.id), 0);
        assert.equal((await call(owner, `/users/${managerA1.id}`, { method: 'PATCH', body: { isActive: true } })).status, 200);
        await denied(manager, '/dining-tables', {}, 401, 'UNAUTHENTICATED');
        manager = await login(managerA1.username, managerCredentials.password);
        assert.equal((await call(other, '/branches')).status, 200, 'store B remains usable');
      });

      await run('ACC-RESET-01 BR-01/03/84 active reset revokes every device and old credentials', async () => {
        const staff = await makeStaff(owner, a1.id, 'CASHIER', 'multi');
        const credentials = await changeFirstPassword(staff.username, staff.temporaryPassword);
        const deviceA = credentials.session; const deviceB = await login(staff.username, credentials.password);
        assert.equal(await activeSessions(staff.id), 2);
        const reset = await call(owner, `/users/${staff.id}/reset-password`, { method: 'POST' });
        assert.equal(reset.status, 200); assert.equal(reset.body.data.user.mustChangePassword, true);
        assert.equal(reset.body.data.user.isActive, true); assert.equal(await activeSessions(staff.id), 0);
        const temporaryPassword = reset.body.data.temporaryPassword;
        assert.ok(temporaryPassword.length >= 12 && Buffer.byteLength(temporaryPassword, 'utf8') <= 72);
        assert.equal((await loginResult(staff.username, credentials.password)).status, 401);
        for (const device of [deviceA, deviceB]) {
          await denied(device, '/auth/me', {}, 401, 'UNAUTHENTICATED');
          await denied(device, '/auth/refresh', { method: 'POST' }, 401, 'UNAUTHENTICATED');
        }
        const [stored] = await db.query('SELECT row_to_json(u) AS row FROM users u WHERE id=$1', [staff.id]);
        const hash = stored.row.password_hash as string;
        const hashMatchesNew = await bcrypt.compare(temporaryPassword, hash);
        const hashMatchesOld = await bcrypt.compare(credentials.password, hash);
        const rawPresent = Object.values(stored.row).some(value => typeof value === 'string' && secrets.has(value));
        assert.equal(hashMatchesNew, true); assert.equal(hashMatchesOld, false); assert.equal(bcrypt.getRounds(hash), 12); assert.equal(rawPresent, false);
        t.diagnostic(JSON.stringify({ case: currentCase, kind: 'CREDENTIAL_DB', userId: staff.id,
          hashMatchesNew, hashMatchesOld, bcryptCost: bcrypt.getRounds(hash), rawCredentialPresent: rawPresent }));
        const fresh = await login(staff.username, temporaryPassword);
        assert.equal((await call(fresh, '/auth/me')).body.data.user.mustChangePassword, true);
        for (const [path, options] of operations(a1.id, ta1.id, staff.id)) await denied(fresh, path, options, 403, 'PASSWORD_CHANGE_REQUIRED');
        const list = await call(owner, '/users');
        assert.equal('temporaryPassword' in list.body.data.find((row: { id: string }) => row.id === staff.id), false);
      });

      await run('ACC-RESET-02 BR-02/03/84 repeat reset replaces credential; locked reset stays locked', async () => {
        const staff = await makeStaff(owner, a1.id, 'CASHIER', 'repeat');
        const credentials = await changeFirstPassword(staff.username, staff.temporaryPassword);
        const first = await call(owner, `/users/${staff.id}/reset-password`, { method: 'POST' });
        assert.equal(first.status, 200);
        const firstPassword = first.body.data.temporaryPassword;
        const firstSession = await login(staff.username, firstPassword);
        const second = await call(owner, `/users/${staff.id}/reset-password`, { method: 'POST' });
        assert.equal(second.status, 200);
        const secondPassword = second.body.data.temporaryPassword;
        assert.equal(firstPassword === secondPassword, false, 'each reset issues a fresh credential');
        assert.equal((await loginResult(staff.username, firstPassword)).status, 401);
        assert.equal((await loginResult(staff.username, credentials.password)).status, 401);
        await denied(firstSession, '/auth/refresh', { method: 'POST' }, 401, 'UNAUTHENTICATED');
        const secondSession = await login(staff.username, secondPassword);
        assert.equal((await call(owner, `/users/${staff.id}`, { method: 'PATCH', body: { isActive: false } })).status, 200);
        assert.equal(await activeSessions(staff.id), 0);
        const lockedReset = await call(owner, `/users/${staff.id}/reset-password`, { method: 'POST' });
        assert.equal(lockedReset.status, 200); assert.equal(lockedReset.body.data.user.isActive, false);
        assert.equal(lockedReset.body.data.user.mustChangePassword, true);
        assert.equal((await loginResult(staff.username, lockedReset.body.data.temporaryPassword)).status, 401);
        assert.equal((await call(owner, `/users/${staff.id}`, { method: 'PATCH', body: { isActive: true } })).status, 200);
        await denied(secondSession, '/auth/me', {}, 401, 'UNAUTHENTICATED');
        assert.equal(await activeSessions(staff.id), 0);
      });

      const commitGate = async (action: string, operation: () => ReturnType<typeof call>) => {
        let entered!: () => void; let release!: () => void;
        const atCommit = new Promise<void>(resolve => { entered = resolve; });
        const continueCommit = new Promise<void>(resolve => { release = resolve; });
        const originalMethod = db.transaction;
        const original = db.transaction.bind(db);
        const before = await view(); const logStart = events.length;
        db.transaction = (async (callback: (manager: EntityManager) => Promise<unknown>) => original(async manager => {
          const result = await callback(manager);
          entered(); await continueCommit; return result;
        })) as typeof db.transaction;
        const pending = operation();
        try {
          await Promise.race([atCommit, pending.then(() => { throw new Error('HTTP completed without reaching commit barrier'); })]);
          const during = await view();
          assert.deepEqual(during, before, 'other connection cannot see uncommitted write');
          assert.equal(events.slice(logStart).some(event => event.message.includes(`action=${action}`)), false,
            'application action must not be logged before transaction commit');
          t.diagnostic(JSON.stringify({ case: currentCase, kind: 'BEFORE_COMMIT_BARRIER', action, before, during,
            actionObserved: events.slice(logStart).some(event => event.message.includes(`action=${action}`)) }));
          release();
          const response = await pending;
          assert.ok([200, 201].includes(response.status));
          const targetId = response.body.data.user?.id ?? response.body.data.id;
          const expected = `action=${action} actorId=${storeA.owner.id} targetId=${targetId} requestId=${response.requestId}`;
          assert.equal(events.slice(logStart).filter(event => event.message.includes(expected)).length, 1);
          t.diagnostic(JSON.stringify({ case: currentCase, kind: 'AFTER_COMMIT_LOG', expected, db: await view() }));
          return response;
        } finally { release(); db.transaction = originalMethod; await pending; }
      };

      await run('ACC-LOG-01 BR-84 create/update/reset log only after actual commit, with actor and request ID', async () => {
        const created = await commitGate('staff.create', () => call(owner, '/users', { method: 'POST', body: {
          branchId: a1.id, username: 'qa_commit_log', fullName: 'QA Commit Log', role: 'CASHIER',
        } }));
        const id = created.body.data.user.id;
        await commitGate('staff.update', () => call(owner, `/users/${id}`, { method: 'PATCH', body: { role: 'MANAGER' } }));
        await commitGate('staff.reset_password', () => call(owner, `/users/${id}/reset-password`, { method: 'POST' }));
      });

      await run('ACC-LOG-02 BR-03 transaction rollback restores DB/hash/sessions and emits no success action', async () => {
        const staff = await makeStaff(owner, a1.id, 'CASHIER', 'rollback');
        const credentials = await changeFirstPassword(staff.username, staff.temporaryPassword);
        const deviceB = await login(staff.username, credentials.password);
        assert.equal(await activeSessions(staff.id), 2);
        await db.query(`CREATE FUNCTION reject_acceptance_revoke() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'QA forced rollback'; END $$`);
        await db.query('CREATE TRIGGER reject_acceptance_revoke BEFORE UPDATE ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION reject_acceptance_revoke()');
        try {
          for (const [path, options] of [
            [`/users/${staff.id}`, { method: 'PATCH', body: { role: 'MANAGER' } }],
            [`/users/${staff.id}`, { method: 'PATCH', body: { isActive: false } }],
            [`/users/${staff.id}/reset-password`, { method: 'POST' }],
          ] as Array<[string, Options]>) {
            const before = await view(); const [hashBefore] = await db.query('SELECT password_hash FROM users WHERE id=$1', [staff.id]);
            const logStart = events.length;
            await denied(owner, path, options, 500, 'INTERNAL_ERROR');
            const after = await view(); const [hashAfter] = await db.query('SELECT password_hash FROM users WHERE id=$1', [staff.id]);
            const hashSame = hashBefore.password_hash === hashAfter.password_hash;
            assert.equal(hashSame, true); assert.equal(await activeSessions(staff.id), 2);
            assert.equal(events.slice(logStart).some(event => event.message.includes('action=staff.')), false);
            t.diagnostic(JSON.stringify({ case: currentCase, kind: 'ROLLBACK_DB', path, before, after, hashUnchanged: hashSame }));
          }
        } finally {
          await db.query('DROP TRIGGER reject_acceptance_revoke ON refresh_tokens');
          await db.query('DROP FUNCTION reject_acceptance_revoke()');
        }
        assert.equal((await call(credentials.session, '/auth/me')).status, 200);
        assert.equal((await call(deviceB, '/auth/me')).status, 200);
        await db.query(`CREATE FUNCTION reject_acceptance_create() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'QA forced create rollback'; END $$`);
        await db.query('CREATE TRIGGER reject_acceptance_create BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION reject_acceptance_create()');
        try {
          const logStart = events.length;
          await denied(owner, '/users', { method: 'POST', body: {
            branchId: a1.id, username: 'qa_rollback_create', fullName: 'QA', role: 'CASHIER',
          } }, 500, 'INTERNAL_ERROR');
          assert.equal(events.slice(logStart).some(event => event.message.includes('action=staff.create')), false);
        } finally {
          await db.query('DROP TRIGGER reject_acceptance_create ON users');
          await db.query('DROP FUNCTION reject_acceptance_create()');
        }
      });

      const orderedRace = async (id: string, first: () => ReturnType<typeof call>, second: () => ReturnType<typeof call>) => {
        const holder = db.createQueryRunner(); await holder.connect(); await holder.startTransaction();
        await holder.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [id]);
        const blocked = async (excluded: number[] = []) => {
          const deadline = Date.now() + 5000;
          while (Date.now() < deadline) {
            const rows: Array<{ pid: number; wait_event: string; blockers: number[] }> = await db.query(`
              SELECT a.pid,a.wait_event,pg_blocking_pids(a.pid) AS blockers FROM pg_stat_activity a
              WHERE a.datname=$1 AND a.wait_event_type='Lock' AND EXISTS (
                SELECT 1 FROM pg_locks l WHERE l.pid=a.pid AND l.relation='users'::regclass AND l.mode='RowShareLock'
              )`, [name]);
            const waiter = rows.find(row => !excluded.includes(row.pid));
            if (waiter) return waiter;
            await delay(10); // Poll observable DB lock state; no fixed sleep to assume request order.
          }
          throw new Error('QA expected operation did not reach a PostgreSQL user-row lock');
        };
        let firstPending: ReturnType<typeof call> | undefined;
        let secondPending: ReturnType<typeof call> | undefined;
        try {
          firstPending = first(); const waiter1 = await blocked();
          secondPending = second(); const waiter2 = await blocked([waiter1.pid]);
          t.diagnostic(JSON.stringify({ case: currentCase, kind: 'PG_LOCK_ORDER', userId: id,
            queue: [waiter1, waiter2], holderStillActive: holder.isTransactionActive }));
          await holder.commitTransaction();
          return await Promise.all([firstPending, secondPending]);
        } finally {
          if (holder.isTransactionActive) await holder.rollbackTransaction();
          await holder.release();
          await Promise.allSettled([firstPending, secondPending].filter(Boolean));
        }
      };

      for (const mutation of ['reset', 'role', 'disable'] as const) {
        for (const auth of ['login', 'refresh'] as const) {
          for (const first of ['mutation', 'auth'] as const) {
            await run(`ACC-RACE BR-03 ${mutation} versus ${auth}, ${first} obtains user lock first`, async () => {
              const staff = await makeStaff(owner, a1.id, 'CASHIER', 'race');
              const credentials = await changeFirstPassword(staff.username, staff.temporaryPassword);
              const mutate = () => mutation === 'reset'
                ? call(owner, `/users/${staff.id}/reset-password`, { method: 'POST' })
                : call(owner, `/users/${staff.id}`, { method: 'PATCH', body: mutation === 'role' ? { role: 'MANAGER' } : { isActive: false } });
              const authenticate = () => auth === 'login' ? loginResult(staff.username, credentials.password)
                : call(credentials.session, '/auth/refresh', { method: 'POST' });
              const results = await orderedRace(staff.id, first === 'mutation' ? mutate : authenticate, first === 'mutation' ? authenticate : mutate);
              const changed = results[first === 'mutation' ? 0 : 1];
              const authenticated = results[first === 'auth' ? 0 : 1];
              assert.equal(changed.status, 200);
              const acceptsNewLogin = mutation === 'role' && auth === 'login' && first === 'mutation';
              assert.equal(authenticated.status, first === 'auth' || acceptsNewLogin ? 200 : 401);
              assert.equal(await activeSessions(staff.id), acceptsNewLogin ? 1 : 0);
              await denied(credentials.session, '/auth/me', {}, 401, 'UNAUTHENTICATED');
              if (authenticated.status === 200) {
                assert.ok(authenticated.issued);
                if (acceptsNewLogin) {
                  const identity = await call(authenticated.issued, '/auth/me');
                  assert.equal(identity.status, 200); assert.equal(identity.body.data.user.role, 'MANAGER');
                  assert.equal(authenticated.body.data.user.role, 'MANAGER');
                } else {
                  await denied(authenticated.issued, '/auth/me', {}, 401, 'UNAUTHENTICATED');
                  await denied(authenticated.issued, '/auth/refresh', { method: 'POST' }, 401, 'UNAUTHENTICATED');
                }
              }
              if (mutation === 'reset') {
                assert.equal((await loginResult(staff.username, credentials.password)).status, 401);
                const current = await login(staff.username, changed.body.data.temporaryPassword);
                assert.equal((await call(current, '/auth/me')).body.data.user.mustChangePassword, true);
              }
              t.diagnostic(JSON.stringify({ case: currentCase, kind: 'RACE_RESULT', mutation, auth, first,
                mutationStatus: changed.status, authenticationStatus: authenticated.status, db: await view() }));
            });
          }
        }
      }

      for (const second of ['reset', 'disable'] as const) {
        await run(`ACC-RACE-MUTATION role update precedes ${second} on the same staff`, async () => {
          const staff = await makeStaff(owner, a1.id, 'CASHIER', 'mutrace');
          const credentials = await changeFirstPassword(staff.username, staff.temporaryPassword);
          const results = await orderedRace(staff.id,
            () => call(owner, `/users/${staff.id}`, { method: 'PATCH', body: { role: 'MANAGER' } }),
            () => second === 'reset' ? call(owner, `/users/${staff.id}/reset-password`, { method: 'POST' })
              : call(owner, `/users/${staff.id}`, { method: 'PATCH', body: { isActive: false } }));
          assert.deepEqual(results.map(result => result.status), [200, 200]);
          assert.equal(results[1].body.data.user?.role ?? results[1].body.data.role, 'MANAGER');
          const [stored] = await db.query(`SELECT r.name AS role,u.is_active AS active,u.must_change_password AS must_change
            FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1`, [staff.id]);
          assert.deepEqual(stored, { role: 'MANAGER', active: second === 'reset', must_change: second === 'reset' });
          assert.equal(await activeSessions(staff.id), 0);
          await denied(credentials.session, '/auth/me', {}, 401, 'UNAUTHENTICATED');
          if (second === 'reset') {
            assert.equal((await loginResult(staff.username, credentials.password)).status, 401);
            const current = await login(staff.username, results[1].body.data.temporaryPassword);
            assert.equal((await call(current, '/auth/me')).body.data.user.role, 'MANAGER');
          }
          t.diagnostic(JSON.stringify({ case: currentCase, kind: 'MUTATION_RACE_RESULT', statuses: results.map(result => result.status), stored }));
        });
      }

      await run('ACC-CRUD BR-10/76/95/97/103 defaults, unique scopes, rollback, retention and nullable fields', async () => {
        for (const initialCash of [-1, 0.5, 1000000000001, '1', null]) await denied(owner, '/branches', {
          method: 'POST', body: { code: 'IC', name: 'Invalid money', initialCash },
        }, 422, 'VALIDATION_ERROR');
        const max = await call(owner, '/branches', { method: 'POST', body: {
          code: 'ABCDEFGHIJ', name: 'N'.repeat(150), address: 'A'.repeat(255), phone: '0'.repeat(20), initialCash: 1000000000000,
        } });
        assert.equal(max.status, 201); assert.equal(max.body.data.initialCash, 1000000000000);
        const min = await call(owner, '/branches', { method: 'POST', body: { code: 'VL', name: 'N', initialCash: 0 } });
        assert.equal(min.status, 201);
        await denied(owner, '/branches', { method: 'POST', body: { code: a1.code, name: 'Another name' } }, 409, 'CONFLICT');
        await denied(owner, '/branches', { method: 'POST', body: { code: 'DN', name: a1.name } }, 409, 'CONFLICT');
        await denied(owner, `/branches/${a2.id}`, { method: 'PATCH', body: { name: a1.name, phone: 'DO_NOT_PERSIST' } }, 409, 'CONFLICT');
        const lower = await call(owner, '/branches', { method: 'POST', body: { code: a1.code.toLowerCase(), name: a1.name.toLowerCase() } });
        assert.equal(lower.status, 201);
        assert.equal((await call(other, '/branches', { method: 'POST', body: { code: a1.code, name: a1.name } })).status, 201);
        const beforeRace = await view();
        const branchRace = await Promise.all([1, 2].map(() => call(owner, '/branches', { method: 'POST', body: { code: 'RC', name: 'QA Race Branch' } })));
        assert.deepEqual(branchRace.map(result => result.status).sort(), [201, 409]);
        const [branchCount] = await db.query('SELECT count(*)::int AS n FROM branches WHERE store_id=$1 AND code=$2', [storeA.store.id, 'RC']);
        assert.equal(branchCount.n, 1);
        t.diagnostic(JSON.stringify({ case: currentCase, kind: 'BRANCH_RACE_DB', before: beforeRace, after: await view(), exactCount: branchCount.n }));
        const sameName = await makeTable(owner, a2.id, ta1.name);
        const table = await makeTable(owner, a1.id, 'QA Nullable Table');
        for (const capacity of [1, 2147483647, null]) {
          const response = await call(owner, `/dining-tables/${table.id}`, { method: 'PATCH', body: { capacity } });
          assert.equal(response.status, 200); assert.equal(response.body.data.capacity, capacity);
          assert.equal((await db.query('SELECT capacity FROM dining_tables WHERE id=$1', [table.id]))[0].capacity, capacity);
        }
        assert.equal((await call(owner, `/dining-tables/${table.id}`, { method: 'PATCH', body: { area: ' Prior ', capacity: 2 } })).status, 200);
        const renamed = await call(owner, `/dining-tables/${table.id}`, { method: 'PATCH', body: { name: 'QA Renamed' } });
        assert.equal(renamed.status, 200); assert.equal(renamed.body.data.area, 'Prior'); assert.equal(renamed.body.data.capacity, 2);
        for (const area of [null, '', '   ']) {
          const response = await call(owner, `/dining-tables/${table.id}`, { method: 'PATCH', body: { area } });
          assert.equal(response.status, 200); assert.equal(response.body.data.area, null);
          assert.equal((await db.query('SELECT area FROM dining_tables WHERE id=$1', [table.id]))[0].area, null);
        }
        await denied(owner, `/dining-tables/${table.id}`, { method: 'PATCH', body: { name: ta1.name, capacity: 99 } }, 409, 'CONFLICT');
        const tableRace = await Promise.all([1, 2].map(() => call(owner, '/dining-tables', { method: 'POST', body: { branchId: a1.id, name: 'QA Race Table' } })));
        assert.deepEqual(tableRace.map(result => result.status).sort(), [201, 409]);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM dining_tables WHERE branch_id=$1 AND name=$2', [a1.id, 'QA Race Table']))[0].n, 1);
        for (const isActive of [false, true]) {
          const response = await call(owner, `/dining-tables/${table.id}`, { method: 'PATCH', body: { isActive } });
          assert.equal(response.status, 200); assert.equal(response.body.data.isActive, isActive);
          assert.equal((await db.query('SELECT is_active FROM dining_tables WHERE id=$1', [table.id]))[0].is_active, isActive);
        }
        for (const value of [null, '', '  ']) {
          const response = await call(owner, `/branches/${min.body.data.id}`, { method: 'PATCH', body: { address: value, phone: value } });
          assert.equal(response.status, 200); assert.equal(response.body.data.address, null); assert.equal(response.body.data.phone, null);
          const [stored] = await db.query('SELECT address,phone FROM branches WHERE id=$1', [min.body.data.id]);
          assert.deepEqual(stored, { address: null, phone: null });
        }
        const preDisable = await view();
        assert.equal((await call(owner, `/branches/${a1.id}`, { method: 'PATCH', body: { isActive: false } })).status, 200);
        const disabled = await view();
        assert.deepEqual(disabled.tables, preDisable.tables); assert.deepEqual(disabled.users, preDisable.users);
        const inactiveTable = await makeTable(owner, a1.id, 'QA Inactive Branch Table');
        const inactiveStaff = await makeStaff(owner, a1.id, 'CASHIER', 'inactive');
        assert.equal((await call(owner, `/branches/${a1.id}`, { method: 'PATCH', body: { isActive: true } })).status, 200);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM dining_tables WHERE id IN ($1,$2)', [inactiveTable.id, sameName.id]))[0].n, 2);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM users WHERE id=$1', [inactiveStaff.id]))[0].n, 1);
        await denied(other, '/users', { method: 'POST', body: {
          branchId: b1.id, username: ` ${staffA1.username.toUpperCase()} `, fullName: 'Global duplicate', role: 'CASHIER',
        } }, 409, 'USERNAME_EXISTS');
        await denied(owner, '/users', { method: 'POST', body: {
          branchId: a1.id, username: 'AUDIT_ADMIN', fullName: 'Platform duplicate', role: 'CASHIER',
        } }, 409, 'USERNAME_EXISTS');
        assert.equal((await db.query('SELECT count(*)::int AS n FROM users WHERE username=$1', [staffA1.username]))[0].n, 1);
        const noopStaff = await makeStaff(owner, a1.id, 'CASHIER', 'noop');
        const noopCredentials = await changeFirstPassword(noopStaff.username, noopStaff.temporaryPassword);
        for (const body of [{ role: 'CASHIER' }, { isActive: true }, { role: 'CASHIER', isActive: true }]) {
          const before = await view();
          assert.equal((await call(owner, `/users/${noopStaff.id}`, { method: 'PATCH', body })).status, 200);
          assert.deepEqual(await view(), before, 'no-op leaves user and sessions unchanged');
          assert.equal((await call(noopCredentials.session, '/auth/me')).status, 200);
        }
      });

      await run('ACC-VALIDATION typed boundary matrix, exact errors and no unintended DB writes', async () => {
        for (const patch of [{}, { username: 'wrong' }, { fullName: 'wrong' }, { phone: 'wrong' }, { branchId: a2.id },
          { storeId: storeB.store.id }, { role: null }, { role: 'OWNER' }, { role: ['CASHIER'] }, { isActive: null }, { isActive: 'false' }]) {
          await denied(owner, `/users/${staffA1.id}`, { method: 'PATCH', body: patch }, 422, 'VALIDATION_ERROR');
        }
        const validBranch = { code: 'VT', name: 'QA Validation' };
        for (const body of [{ ...validBranch, code: 'X' }, { ...validBranch, code: 'X'.repeat(11) },
          { ...validBranch, name: ' ' }, { ...validBranch, name: 'N'.repeat(151) },
          { ...validBranch, address: 'A'.repeat(256) }, { ...validBranch, phone: '0'.repeat(21) },
          { ...validBranch, isActive: false }, { ...validBranch, storeId: storeB.store.id }]) {
          await denied(owner, '/branches', { method: 'POST', body }, 422, 'VALIDATION_ERROR');
        }
        for (const body of [{ name: '' }, { name: 'N'.repeat(151) }, { address: 1 }, { phone: false },
          { initialCash: -1 }, { initialCash: 0.5 }, { initialCash: '1' }, { initialCash: null },
          { initialCash: 1000000000001 }, { isActive: null }, { isActive: 0 }, { code: 'NEW' }]) {
          await denied(owner, `/branches/${a1.id}`, { method: 'PATCH', body }, 422, 'VALIDATION_ERROR');
        }
        const validTable = { branchId: a1.id, name: 'QA Valid Table' };
        for (const body of [{ ...validTable, name: '' }, { ...validTable, name: 'N'.repeat(51) },
          { ...validTable, area: 'A'.repeat(51) }, { ...validTable, capacity: 0 }, { ...validTable, capacity: -1 },
          { ...validTable, capacity: 1.5 }, { ...validTable, capacity: '4' }, { ...validTable, capacity: 2147483648 },
          { ...validTable, branchId: null }, { ...validTable, isActive: false }]) {
          await denied(owner, '/dining-tables', { method: 'POST', body }, 422, 'VALIDATION_ERROR');
        }
        for (const body of [{}, { name: null }, { area: 1 }, { capacity: false }, { capacity: 0 }, { branchId: a2.id }, { isActive: null }]) {
          await denied(owner, `/dining-tables/${ta1.id}`, { method: 'PATCH', body }, 422, 'VALIDATION_ERROR');
        }
        const validStaff = { branchId: a1.id, username: 'qa_valid_new', fullName: 'QA', role: 'CASHIER' };
        for (const body of [{ ...validStaff, username: '' }, { ...validStaff, username: 'U'.repeat(51) },
          { ...validStaff, fullName: ' ' }, { ...validStaff, fullName: 'N'.repeat(151) },
          { ...validStaff, branchId: null }, { ...validStaff, branchId: 'bad' }, { ...validStaff, role: 'OWNER' },
          { ...validStaff, role: 'PLATFORM_ADMIN' }, { ...validStaff, role: null }, { ...validStaff, storeId: storeB.store.id }]) {
          await denied(owner, '/users', { method: 'POST', body }, 422, 'VALIDATION_ERROR');
        }
        const boundaryStaff = await call(owner, '/users', { method: 'POST', body: {
          branchId: a1.id, username: 'U'.repeat(50), fullName: 'N'.repeat(150), role: 'CASHIER',
        } });
        assert.equal(boundaryStaff.status, 201); assert.equal(boundaryStaff.body.data.user.username, 'u'.repeat(50));
        for (const path of ['/branches/bad', '/dining-tables/bad', '/users/bad']) {
          await denied(owner, path, { method: 'PATCH', body: { isActive: false } }, 422, 'VALIDATION_ERROR');
        }
        await denied(owner, '/users/bad/reset-password', { method: 'POST' }, 422, 'VALIDATION_ERROR');
        for (const path of [`/branches/${placeholder}`, `/dining-tables/${placeholder}`, `/users/${placeholder}`]) {
          await denied(owner, path, { method: 'PATCH', body: { isActive: false } }, 404, 'NOT_FOUND');
        }
        await denied(owner, `/users/${placeholder}/reset-password`, { method: 'POST' }, 404, 'NOT_FOUND');
        for (const path of ['/branches', '/dining-tables', '/users']) {
          await denied(owner, path, { method: 'POST', raw: '{' }, 400, 'BAD_REQUEST');
          await denied(owner, path, { method: 'POST', raw: '1' }, 400, 'BAD_REQUEST');
          await denied(owner, path, { method: 'POST', body: null }, 400, 'BAD_REQUEST');
          await denied(owner, path, { method: 'POST', body: [] }, 422, 'VALIDATION_ERROR');
        }
        for (const [path, options] of operations(a1.id, ta1.id, staffA1.id).filter(([, option]) => option.body !== undefined)) {
          await denied(owner, `${path}?unknown=1`, options, 422, 'VALIDATION_ERROR');
          await denied(owner, path, { ...options, headers: { 'Content-Type': 'text/plain' } }, 400, 'BAD_REQUEST');
          await denied(owner, path, { ...options, headers: { Origin: 'https://invalid.example' } }, 403, 'CSRF_INVALID');
          await denied(owner, path, { ...options, headers: { 'X-CSRF-Token': 'invalid' } }, 403, 'CSRF_INVALID');
        }
        await denied(owner, `/users/${staffA1.id}/reset-password`, { method: 'POST', body: {} }, 422, 'VALIDATION_ERROR');
        await denied(owner, `/users/${staffA1.id}/reset-password?unknown=1`, { method: 'POST' }, 422, 'VALIDATION_ERROR');
        for (const path of ['/branches', '/dining-tables', '/users']) {
          const before = await view();
          const response = await new Promise<{ status: number; body: { error: { code: string; requestId: string } } }>((resolve, reject) => {
            const raw = '{}'; const req = nodeRequest(`${base}${path}`, { method: 'GET', headers: {
              Cookie: owner.cookie, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw),
            } }, response => {
              let data = ''; response.setEncoding('utf8'); response.on('data', chunk => { data += chunk; });
              response.on('end', () => resolve({ status: response.statusCode!, body: JSON.parse(data) }));
            });
            req.on('error', reject); req.end(raw);
          });
          assert.equal(response.status, 422); assert.equal(response.body.error.code, 'VALIDATION_ERROR');
          const after = await view(); assert.deepEqual(after, before);
          t.diagnostic(JSON.stringify({ case: currentCase, kind: 'RAW_GET_BODY', path, response, before, after }));
        }
        await db.query("UPDATE roles SET name='QA_HIDDEN_MANAGER' WHERE name='MANAGER'");
        try {
          await denied(owner, '/users', { method: 'POST', body: { ...validStaff, role: 'MANAGER' } }, 503, 'SERVICE_UNAVAILABLE');
          await denied(owner, `/users/${staffA1.id}`, { method: 'PATCH', body: { role: 'MANAGER' } }, 503, 'SERVICE_UNAVAILABLE');
        } finally { await db.query("UPDATE roles SET name='MANAGER' WHERE name='QA_HIDDEN_MANAGER'"); }
      });

      await run('ACC-PAGE BR-71/103 complete SQL pages with microseconds, ties, filters, scopes and bounded queries', async () => {
        const fixture: Array<Record<string, unknown>> = [];
        const [hashSource] = await db.query('SELECT password_hash FROM users WHERE id=$1', [staffA1.id]);
        const [managerRole] = await db.query("SELECT id FROM roles WHERE name='MANAGER'");
        const [cashierRole] = await db.query("SELECT id FROM roles WHERE name='CASHIER'");
        const offsets = [3, 1, 2, 2, 3, 1, 3, 2, 1, 1, 2, 3];
        for (let i = 0; i < offsets.length; i++) {
          const stamp = `2026-10-30T12:00:00.12300${offsets[i]}Z`;
          const branchId = i % 2 === 0 ? a1.id : a2.id;
          const isActive = i % 3 !== 0;
          const role = i % 2 === 0 ? 'MANAGER' : 'CASHIER';
          const branchIdNew = randomUUID(); const tableId = randomUUID(); const userId = randomUUID();
          await db.query(`INSERT INTO branches(id,store_id,code,name,initial_cash,is_active,created_at,updated_at)
            VALUES($1,$2,$3,$4,0,$5,$6,$6)`, [branchIdNew, storeA.store.id, `P${i}`, `QA Page Branch ${i}`, isActive, stamp]);
          await db.query(`INSERT INTO dining_tables(id,branch_id,name,capacity,is_active,created_at,updated_at)
            VALUES($1,$2,$3,$4,$5,$6,$6)`, [tableId, branchId, `QA Page Table ${i}`, i + 1, isActive, stamp]);
          await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,username,full_name,password_hash,is_active,must_change_password,created_at,updated_at)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$9)`, [userId, storeA.store.id, branchId,
            role === 'MANAGER' ? managerRole.id : cashierRole.id, `qa_page_${i}`, `QA Page User ${i}`, hashSource.password_hash, isActive, stamp]);
          fixture.push({ stamp, isActive, role, branchId, branchIdNew, tableId, userId });
        }
        t.diagnostic(JSON.stringify({ case: currentCase, kind: 'SQL_PAGE_FIXTURE', actual: fixture }));
        type PageRow = { id: string; stamp: string; isActive: boolean; branchId?: string; role?: string };
        const stampSql = (alias: string) => `to_char(${alias}.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
        const expected: Record<string, PageRow[]> = {
          branches: await db.query(`SELECT b.id,${stampSql('b')} AS stamp,b.is_active AS "isActive" FROM branches b WHERE b.store_id=$1`, [storeA.store.id]),
          tables: await db.query(`SELECT t.id,${stampSql('t')} AS stamp,t.is_active AS "isActive",t.branch_id AS "branchId"
            FROM dining_tables t JOIN branches b ON b.id=t.branch_id WHERE b.store_id=$1`, [storeA.store.id]),
          staff: await db.query(`SELECT u.id,${stampSql('u')} AS stamp,u.is_active AS "isActive",u.branch_id AS "branchId",r.name AS role
            FROM users u JOIN roles r ON r.id=u.role_id WHERE u.store_id=$1 AND r.name IN ('MANAGER','CASHIER')`, [storeA.store.id]),
        };
        const endpoints = { branches: '/branches', tables: '/dining-tables', staff: '/users' };
        const cursors = new Map<string, string>();
        const checkPages = async (resource: keyof typeof endpoints, filters: Record<string, string> = {}) => {
          const rows = expected[resource].filter(row =>
            (filters.isActive === undefined || row.isActive === (filters.isActive === 'true'))
            && (filters.branchId === undefined || row.branchId === filters.branchId)
            && (filters.role === undefined || row.role === filters.role))
            .sort((left, right) => right.stamp.localeCompare(left.stamp) || right.id.localeCompare(left.id));
          const actual: string[] = []; const pages: unknown[] = []; let cursor: string | null = null;
          const seenCursors = new Set<string>();
          do {
            const query = new URLSearchParams({ ...filters, limit: '2', sort: '-createdAt', ...(cursor ? { cursor } : {}) });
            const response = await call(owner, `${endpoints[resource]}?${query}`);
            assert.equal(response.status, 200); assert.equal(response.body.meta.limit, 2); assert.equal(response.body.meta.total, rows.length);
            assert.ok(Array.isArray(response.body.data));
            actual.push(...response.body.data.map((row: { id: string }) => row.id));
            pages.push({ ids: response.body.data.map((row: { id: string }) => row.id), meta: response.body.meta });
            cursor = response.body.meta.nextCursor;
            if (cursor) {
              assert.equal(seenCursors.has(cursor), false, 'cursor must advance'); seenCursors.add(cursor);
              if (pages.length === 1) cursors.set(JSON.stringify([resource, filters]), cursor);
            }
            assert.ok(pages.length <= Math.ceil(rows.length / 2) + 1, 'pagination must terminate');
          } while (cursor);
          assert.deepEqual(actual, rows.map(row => row.id), 'all records appear exactly once in contractual order');
          assert.equal(new Set(actual).size, actual.length);
          t.diagnostic(JSON.stringify({ case: currentCase, kind: 'SQL_PAGE_RESULT', resource, filters,
            expected: rows, actualIds: actual, pages, endedWithCursor: cursor }));
        };
        for (const resource of ['branches', 'tables', 'staff'] as const) {
          await checkPages(resource); await checkPages(resource, { isActive: 'true' }); await checkPages(resource, { isActive: 'false' });
          for (const invalid of ['limit=0', 'limit=1.5', 'limit=1&limit=2', 'sort=name', 'isActive=1', 'cursor=', 'cursor=not-valid', 'page=1']) {
            await denied(owner, `${endpoints[resource]}?${invalid}`, {}, 422, 'VALIDATION_ERROR');
          }
          const defaultPage = await call(owner, endpoints[resource]);
          assert.equal(defaultPage.status, 200); assert.equal(defaultPage.body.meta.limit, 20);
          const capped = await call(owner, `${endpoints[resource]}?limit=101`);
          assert.equal(capped.status, 200); assert.equal(capped.body.meta.limit, 100);
          const startSmall = queries.length;
          const small = await call(owner, `${endpoints[resource]}?limit=1`);
          const countSmall = queries.length - startSmall;
          const startLarge = queries.length;
          const large = await call(owner, `${endpoints[resource]}?limit=100`);
          const countLarge = queries.length - startLarge;
          assert.equal(small.body.data.length, 1); assert.ok(large.body.data.length >= 12);
          assert.equal(countSmall, countLarge); assert.ok(countLarge <= 8, 'no query per returned entity');
          t.diagnostic(JSON.stringify({ case: currentCase, kind: 'QUERY_COUNT', resource,
            rowsSmall: small.body.data.length, rowsLarge: large.body.data.length, countSmall, countLarge }));
        }
        for (const resource of ['tables', 'staff'] as const) {
          for (const branchId of [a1.id, a2.id]) {
            await checkPages(resource, { branchId }); await checkPages(resource, { branchId, isActive: 'false' });
          }
          const branchCursor = cursors.get(JSON.stringify([resource, { branchId: a1.id }]));
          assert.ok(branchCursor);
          await denied(owner, `${endpoints[resource]}?branchId=${a2.id}&cursor=${branchCursor}`, {}, 422, 'VALIDATION_ERROR');
        }
        await checkPages('staff', { role: 'MANAGER' }); await checkPages('staff', { role: 'CASHIER' });
        await checkPages('staff', { role: 'MANAGER', isActive: 'false', branchId: a1.id });
        const roleCursor = cursors.get(JSON.stringify(['staff', { role: 'MANAGER' }])); assert.ok(roleCursor);
        await denied(owner, `/users?role=CASHIER&cursor=${roleCursor}`, {}, 422, 'VALIDATION_ERROR');
        const branchCursor = cursors.get(JSON.stringify(['branches', {}])); assert.ok(branchCursor);
        await denied(owner, `/dining-tables?cursor=${branchCursor}`, {}, 422, 'VALIDATION_ERROR');
        await denied(other, `/branches?cursor=${branchCursor}`, {}, 422, 'VALIDATION_ERROR');
        const emptyStore = await makeStore('empty');
        const emptyCredentials = await changeFirstPassword('qa_owner_empty', emptyStore.temporaryPassword);
        for (const path of ['/branches', '/dining-tables', '/users']) {
          const response = await call(emptyCredentials.session, path);
          assert.equal(response.status, 200); assert.deepEqual(response.body.data, []);
          assert.deepEqual(response.body.meta, { limit: 20, nextCursor: null, total: 0 });
        }
      });

      currentCase = 'ACC-LOG-FINAL';
      for (const event of events) {
        for (const sensitive of secrets) assert.equal(event.message.includes(sensitive), false, 'application log excludes secrets');
        assert.equal(/\$2[aby]\$\d{2}\$/.test(event.message), false, 'application log excludes bcrypt hashes');
        assert.equal(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(event.message), false, 'application log excludes JWTs');
        t.diagnostic(JSON.stringify({ kind: 'APPLICATION_LOG', ...event }));
      }
    } finally { await app.close(); }
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});
