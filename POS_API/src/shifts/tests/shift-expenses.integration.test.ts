import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';

test('[S9-01/S9-02] shift expenses and reconciliation over HTTP with PostgreSQL', { timeout: 180_000 }, async (t) => {
  const name = `pos_s9_exp_${randomBytes(6).toString('hex')}`;
  const testUrl = new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost', '127.0.0.1'].includes(testUrl.hostname), 'Only a local sandbox is allowed');
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
  process.env.BOOTSTRAP_ADMIN_USERNAME = 'admin';
  process.env.BOOTSTRAP_ADMIN_FULL_NAME = 'QA Admin';
  const password = randomBytes(18).toString('base64url');
  process.env.BOOTSTRAP_ADMIN_PASSWORD = password;

  await dataSource.initialize();
  let created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    created = true;
    await db.initialize();
    await db.runMigrations();
    await bootstrapAdmin(db);

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource)
      .useValue(db)
      .compile();

    const app = module.createNestApplication({ logger: false });
    try {
      await app.listen(0, '127.0.0.1');
      const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
      type Session = { cookie: string; csrf: string };

      const request = async (session: Session, path: string, method = 'GET', body?: unknown) => {
        const response = await fetch(`${base}${path}`, {
          method,
          headers: {
            Cookie: session.cookie,
            Origin: process.env.PUBLIC_ORIGIN!,
            'X-CSRF-Token': session.csrf,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const json = response.status === 204 ? undefined : await response.json();
        return { status: response.status, json };
      };

      const login = async (username: string, pass: string): Promise<Session> => {
        const response = await fetch(`${base}/auth/login`, {
          method: 'POST',
          headers: { Origin: process.env.PUBLIC_ORIGIN!, 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password: pass }),
        });
        assert.equal(response.status, 200, 'fixture login');
        const cookies = response.headers.getSetCookie().map((v) => v.split(';')[0]);
        return {
          cookie: cookies.join('; '),
          csrf: cookies.find((v) => v.startsWith('__Host-pos_csrf='))!.slice(16),
        };
      };

      const admin = await login('admin', password);
      const storeA = await request(admin, '/platform/stores', 'POST', {
        name: 'S9 Store A',
        owner: { username: 'owner_a', fullName: 'Owner A' },
      });
      assert.equal(storeA.status, 201);
      const storeB = await request(admin, '/platform/stores', 'POST', {
        name: 'S9 Store B',
        owner: { username: 'owner_b', fullName: 'Owner B' },
      });
      assert.equal(storeB.status, 201);
      const ownerA = await login('owner_a', storeA.json.data.temporaryPassword);
      const ownerB = await login('owner_b', storeB.json.data.temporaryPassword);
      await db.query('UPDATE users SET must_change_password=false WHERE id IN ($1, $2)', [
        storeA.json.data.owner.id,
        storeB.json.data.owner.id,
      ]);

      let seq = 0;
      const newBranch = async () => {
        seq += 1;
        const branch = await request(ownerA, '/branches', 'POST', {
          code: `E${seq}`,
          name: `Chi nhanh E${seq}`,
          initialCash: 100000,
        });
        assert.equal(branch.status, 201, 'fixture branch');
        return branch.json.data.id as string;
      };
      const userIn = async (branchId: string, role: 'CASHIER' | 'MANAGER') => {
        seq += 1;
        const username = `exp_user_${seq}`;
        const user = await request(ownerA, '/users', 'POST', {
          branchId,
          username,
          fullName: `Nguoi dung ${seq}`,
          role,
        });
        assert.equal(user.status, 201, 'fixture user');
        const userId: string = user.json.data.user.id;
        await db.query('UPDATE users SET must_change_password=false WHERE id=$1', [userId]);
        return { userId, session: await login(username, user.json.data.temporaryPassword) };
      };
      // Fresh branch (initial cash 100000) + user of `role` + an OPEN CASHIER shift opened by that user.
      const freshCashierShift = async (role: 'CASHIER' | 'MANAGER' = 'CASHIER') => {
        const branchId = await newBranch();
        const { userId, session } = await userIn(branchId, role);
        const shift = await request(session, '/work-shifts', 'POST', { shiftType: 'CASHIER' });
        assert.equal(shift.status, 201, 'fixture shift');
        return { branchId, userId, session, shiftId: shift.json.data.id as string };
      };
      const addExpense = (session: Session, shiftId: string, body: object) =>
        request(session, `/work-shifts/${shiftId}/expenses`, 'POST', body);
      const countExpenses = async (shiftId: string) =>
        (await db.query('SELECT count(*)::int AS n FROM shift_expenses WHERE work_shift_id=$1', [shiftId]))[0].n as number;
      const seedCashSale = async (branchId: string, shiftId: string, userId: string, amount: number) => {
        const invoice = randomUUID();
        await db.query(
          `INSERT INTO invoices(id,branch_id,work_shift_id,invoice_code,created_by,order_type,status,subtotal,total_amount,paid_at)
           VALUES($1,$2,$3,$4,$5,'TAKEAWAY','PAID',$6,$6,now())`,
          [invoice, branchId, shiftId, `HD${randomBytes(4).toString('hex').toUpperCase()}`, userId, amount],
        );
        await db.query(
          `INSERT INTO payments(id,invoice_id,method,amount,idempotency_key,idempotency_request_hash,tendered_amount,change_amount,created_by)
           VALUES($1,$2,'CASH',$3,$4,$5,$3,0,$6)`,
          [randomUUID(), invoice, amount, randomUUID(), 'a'.repeat(64), userId],
        );
      };

      await t.test('[S9-01][ST-1.AC-1] migration creates shift_expenses columns and index', async () => {
        const cols = await db.query(
          `SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
           FROM information_schema.columns WHERE table_name='shift_expenses' ORDER BY ordinal_position`,
        );
        assert.deepEqual(
          cols.map((c: any) => [c.column_name, c.data_type, c.character_maximum_length, c.is_nullable]),
          [
            ['id', 'uuid', null, 'NO'],
            ['work_shift_id', 'uuid', null, 'NO'],
            ['amount', 'bigint', null, 'NO'],
            ['reason', 'character varying', 255, 'NO'],
            ['paid_from_drawer', 'boolean', null, 'NO'],
            ['created_by', 'uuid', null, 'NO'],
            ['created_at', 'timestamp with time zone', null, 'NO'],
            ['updated_at', 'timestamp with time zone', null, 'NO'],
          ],
        );
        assert.equal(cols.find((c: any) => c.column_name === 'paid_from_drawer').column_default, 'true');
        const indexes = await db.query(`SELECT indexname FROM pg_indexes WHERE tablename='shift_expenses'`);
        assert.ok(
          indexes.some((i: any) => i.indexname === 'idx_shift_expenses_shift_created'),
          'index idx_shift_expenses_shift_created',
        );
      });

      await t.test('[S9-01][ST-1.AC-2] shift_expenses constraints reject invalid rows', async () => {
        const { shiftId, userId } = await freshCashierShift();
        const insert = (amount: number, reason: string) =>
          db.query(
            `INSERT INTO shift_expenses (id, work_shift_id, amount, reason, created_by)
             VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
            [shiftId, amount, reason, userId],
          );
        for (const [amount, reason] of [
          [0, 'Mua đá'],
          [1000000000001, 'Mua đá'],
          [1, ''],
          [1, ' Mua đá'],
        ] as const) {
          await assert.rejects(
            () => insert(amount, reason),
            (e: any) => (e.code ?? e.driverError?.code) === '23514',
            `amount=${amount} reason='${reason}'`,
          );
        }
        await insert(1, 'Mua đá');
        const rows = await db.query(`SELECT paid_from_drawer FROM shift_expenses WHERE work_shift_id=$1`, [shiftId]);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].paid_from_drawer, true);
      });

      await t.test('[S9-01][ST-1.AC-3] new permissions granted to the decided roles', async () => {
        const roles = async (code: string) =>
          (
            await db.query(
              `SELECT r.name FROM role_permissions rp JOIN roles r ON r.id=rp.role_id
               JOIN permissions p ON p.id=rp.permission_id WHERE p.code=$1 ORDER BY r.name`,
              [code],
            )
          ).map((r: any) => r.name);
        assert.deepEqual(await roles('shift.expense'), ['CASHIER', 'MANAGER', 'OWNER']);
        assert.deepEqual(await roles('invoice.cancel_paid'), ['MANAGER', 'OWNER']);
      });

      await t.test('[S9-01][ST-2.AC-1] cashier records drawer expense on own open shift', async () => {
        const { session, shiftId, userId } = await freshCashierShift();
        const res = await addExpense(session, shiftId, { amount: 30000, reason: '  Mua đá  ' });
        assert.equal(res.status, 201);
        const d = res.json.data;
        assert.equal(d.workShiftId, shiftId);
        assert.equal(d.amount, 30000);
        assert.equal(d.reason, 'Mua đá');
        assert.equal(d.paidFromDrawer, true);
        assert.equal(d.createdBy, userId);
        assert.match(d.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        assert.equal(new Date(d.createdAt).toISOString(), d.createdAt);
        assert.equal(await countExpenses(shiftId), 1);
      });

      await t.test('[S9-01][ST-2.AC-2] non-drawer expense is stored without drawer check', async () => {
        const { session, shiftId } = await freshCashierShift();
        const res = await addExpense(session, shiftId, { amount: 200000, reason: 'Sửa quạt (chủ trả)', paidFromDrawer: false });
        assert.equal(res.status, 201);
        assert.equal(res.json.data.paidFromDrawer, false);
        const [row] = await db.query('SELECT paid_from_drawer FROM shift_expenses WHERE work_shift_id=$1', [shiftId]);
        assert.equal(row.paid_from_drawer, false);
      });

      await t.test('[S9-01][ST-2.AC-3] manager and owner record expense on own cashier shift', async () => {
        const mgr = await freshCashierShift('MANAGER');
        const m = await addExpense(mgr.session, mgr.shiftId, { amount: 10000, reason: 'Mua đá' });
        assert.equal(m.status, 201);
        const branchId = await newBranch();
        const opened = await request(ownerA, '/work-shifts', 'POST', { shiftType: 'CASHIER', branchId });
        assert.equal(opened.status, 201);
        const o = await addExpense(ownerA, opened.json.data.id, { amount: 10000, reason: 'Mua đá' });
        assert.equal(o.status, 201);
        const closed = await request(ownerA, `/work-shifts/${opened.json.data.id}/force-close`, 'POST', {
          countedCash: 90000,
          reason: 'Dọn fixture',
        });
        assert.equal(closed.status, 200);
      });

      await t.test('[S9-01][ST-2.AC-4] invalid expense bodies are rejected and nothing is stored', async () => {
        const { session, shiftId } = await freshCashierShift();
        const validation: object[] = [
          {},
          { amount: 0, reason: 'x' },
          { amount: -1, reason: 'x' },
          { amount: 1.5, reason: 'x' },
          { amount: '1000', reason: 'x' },
          { amount: 1000000000001, reason: 'x' },
          { amount: 1000, reason: 'a'.repeat(256) },
          { amount: 1000, reason: 123 },
          { amount: 1000, reason: 'x', paidFromDrawer: 'yes' },
          { amount: 1000, reason: 'x', branchId: randomUUID() },
        ];
        for (const body of validation) {
          const res = await addExpense(session, shiftId, body);
          assert.equal(res.status, 422, JSON.stringify(body));
          assert.equal(res.json.error.code, 'VALIDATION_ERROR', JSON.stringify(body));
        }
        for (const body of [{ amount: 1000 }, { amount: 1000, reason: '   ' }, { amount: 1000, reason: null }]) {
          const res = await addExpense(session, shiftId, body);
          assert.equal(res.status, 422, JSON.stringify(body));
          assert.equal(res.json.error.code, 'EXPENSE_REASON_REQUIRED', JSON.stringify(body));
        }
        const badPath = await addExpense(session, 'abc', { amount: 1000, reason: 'x' });
        assert.equal(badPath.status, 422);
        assert.equal(badPath.json.error.code, 'VALIDATION_ERROR');
        assert.equal(badPath.json.error.message, 'Mã tài nguyên không hợp lệ.');
        assert.equal(await countExpenses(shiftId), 0);
        const boundary = await addExpense(session, shiftId, { amount: 1000, reason: 'a'.repeat(255) });
        assert.equal(boundary.status, 201);
      });

      await t.test('[S9-01][ST-2.AC-5] drawer boundary rejects expense that makes expected cash negative', async () => {
        const { session, shiftId, branchId, userId } = await freshCashierShift();
        const over = await addExpense(session, shiftId, { amount: 100001, reason: 'Mua đá' });
        assert.equal(over.status, 422);
        assert.equal(over.json.error.code, 'EXPENSE_EXCEEDS_DRAWER');
        assert.deepEqual(over.json.error.details, []);
        assert.equal(over.json.error.message, 'Số tiền chi vượt quá tiền mặt hiện có trong két.');
        assert.ok(!/\d/.test(over.json.error.message));
        assert.equal((await addExpense(session, shiftId, { amount: 100000, reason: 'Mua đá' })).status, 201);
        const again = await addExpense(session, shiftId, { amount: 1, reason: 'Mua đá' });
        assert.equal(again.status, 422);
        assert.equal(again.json.error.code, 'EXPENSE_EXCEEDS_DRAWER');
        assert.equal((await addExpense(session, shiftId, { amount: 1, reason: 'Mua đá', paidFromDrawer: false })).status, 201);
        await seedCashSale(branchId, shiftId, userId, 50000);
        assert.equal((await addExpense(session, shiftId, { amount: 50000, reason: 'Mua đá' })).status, 201);
      });

      await t.test('[S9-01][ST-2.AC-6] expense scope and ownership checks over HTTP', async () => {
        const a1 = await freshCashierShift();
        const a2 = await freshCashierShift();
        const mgrA1 = await userIn(a1.branchId, 'MANAGER');
        const mgrNull = await userIn(a1.branchId, 'MANAGER');
        await db.query('UPDATE users SET branch_id=NULL WHERE id=$1', [mgrNull.userId]);
        const body = { amount: 1000, reason: 'Mua đá' };
        const notFound = [
          ['owner of store B', ownerB, a1.shiftId],
          ['cashier of branch A2', a2.session, a1.shiftId],
          ['manager without branch', mgrNull.session, a1.shiftId],
          ['unknown shift', a1.session, randomUUID()],
        ] as const;
        for (const [label, session, id] of notFound) {
          const res = await addExpense(session, id, body);
          assert.equal(res.status, 404, label);
          assert.equal(res.json.error.code, 'SHIFT_NOT_FOUND', label);
        }
        for (const [label, session] of [['manager of same branch', mgrA1.session], ['owner access_all', ownerA]] as const) {
          const res = await addExpense(session, a1.shiftId, body);
          assert.equal(res.status, 403, label);
          assert.equal(res.json.error.code, 'FORBIDDEN_NOT_SHIFT_OWNER', label);
        }
        assert.equal(await countExpenses(a1.shiftId), 0);
      });

      await t.test('[S9-01][ST-2.AC-7] staff shift and closed shift reject expenses', async () => {
        const branchId = await newBranch();
        const staff = await userIn(branchId, 'CASHIER');
        const staffShift = await request(staff.session, '/work-shifts', 'POST', { shiftType: 'STAFF' });
        assert.equal(staffShift.status, 201);
        const conflict = await addExpense(staff.session, staffShift.json.data.id, { amount: 1000, reason: 'Mua đá' });
        assert.equal(conflict.status, 409);
        assert.equal(conflict.json.error.code, 'CONFLICT');
        assert.equal(conflict.json.error.message, 'Ca này không có két');
        assert.equal(await countExpenses(staffShift.json.data.id), 0);

        const { session, shiftId } = await freshCashierShift();
        assert.equal((await request(session, `/work-shifts/${shiftId}/close`, 'POST', { countedCash: 100000 })).status, 200);
        const closed = await addExpense(session, shiftId, { amount: 1000, reason: 'Mua đá' });
        assert.equal(closed.status, 409);
        assert.equal(closed.json.error.code, 'SHIFT_CLOSED');
        assert.equal(closed.json.error.message, 'Ca làm việc đã được đóng từ trước');
        assert.equal(await countExpenses(shiftId), 0);
      });

      await t.test('[S9-01][ST-2.AC-8] platform admin and role without shift.expense get 403', async () => {
        const { session, shiftId } = await freshCashierShift();
        const body = { amount: 1000, reason: 'Mua đá' };
        const platform = await addExpense(admin, shiftId, body);
        assert.equal(platform.status, 403);
        assert.equal(platform.json.error.code, 'PERMISSION_DENIED');
        const revoke = `DELETE FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='CASHIER')
          AND permission_id=(SELECT id FROM permissions WHERE code='shift.expense')`;
        await db.query(revoke);
        try {
          const denied = await addExpense(session, shiftId, body);
          assert.equal(denied.status, 403);
          assert.equal(denied.json.error.code, 'PERMISSION_DENIED');
        } finally {
          await db.query(`INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id FROM roles r, permissions p WHERE r.name='CASHIER' AND p.code='shift.expense'
            ON CONFLICT DO NOTHING`);
        }
        assert.equal(await countExpenses(shiftId), 0);
      });

      await t.test('[S9-01][ST-2.AC-9] expense list paginates newest first with cursor', async () => {
        const { session, shiftId } = await freshCashierShift();
        for (const reason of ['E1', 'E2', 'E3']) {
          assert.equal((await addExpense(session, shiftId, { amount: 1000, reason })).status, 201);
        }
        const path = `/work-shifts/${shiftId}/expenses`;
        const first = await request(session, `${path}?limit=2`);
        assert.equal(first.status, 200);
        assert.deepEqual(first.json.data.map((e: any) => e.reason), ['E3', 'E2']);
        assert.equal(first.json.meta.limit, 2);
        assert.equal(first.json.meta.total, 3);
        assert.notEqual(first.json.meta.nextCursor, null);
        const second = await request(session, `${path}?limit=2&cursor=${first.json.meta.nextCursor}`);
        assert.equal(second.status, 200);
        assert.deepEqual(second.json.data.map((e: any) => e.reason), ['E1']);
        assert.equal(second.json.meta.nextCursor, null);
        assert.equal((await request(session, path)).json.meta.limit, 20);
        for (const query of ['?sort=createdAt', '?foo=1', '?limit=0']) {
          const res = await request(session, `${path}${query}`);
          assert.equal(res.status, 422, query);
          assert.equal(res.json.error.code, 'VALIDATION_ERROR', query);
          assert.equal(res.json.error.message, 'Tham số danh sách không hợp lệ.', query);
        }
        const big = await request(session, `${path}?limit=101`);
        assert.equal(big.status, 200);
        assert.equal(big.json.meta.limit, 100);
        const other = await freshCashierShift();
        const foreign = await request(other.session, `/work-shifts/${other.shiftId}/expenses?cursor=${first.json.meta.nextCursor}`);
        assert.equal(foreign.status, 422);
        assert.equal(foreign.json.error.code, 'VALIDATION_ERROR');
        const empty = await request(other.session, `/work-shifts/${other.shiftId}/expenses`);
        assert.deepEqual(empty.json, { data: [], meta: { limit: 20, nextCursor: null, total: 0 } });
      });

      await t.test('[B-45] expense list breaks created_at ties by id DESC, also across cursor pages', async () => {
        const { session, shiftId, userId } = await freshCashierShift();
        const lowId = '00000000-0000-4000-8000-000000000001';
        const highId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
        await db.query(
          `INSERT INTO shift_expenses(id,work_shift_id,amount,reason,paid_from_drawer,created_by,created_at)
           VALUES($1,$3,1000,'LOW',true,$4,'2026-01-01T00:00:00Z'),($2,$3,1000,'HIGH',true,$4,'2026-01-01T00:00:00Z')`,
          [lowId, highId, shiftId, userId],
        );
        const path = `/work-shifts/${shiftId}/expenses`;
        const all = await request(session, path);
        assert.deepEqual(all.json.data.map((e: any) => e.id), [highId, lowId]);
        const first = await request(session, `${path}?limit=1`);
        assert.deepEqual(first.json.data.map((e: any) => e.id), [highId]);
        const second = await request(session, `${path}?limit=1&cursor=${first.json.meta.nextCursor}`);
        assert.deepEqual(second.json.data.map((e: any) => e.id), [lowId]);
      });

      await t.test('[S9-01][ST-2.AC-10] expense list follows shift detail scope', async () => {
        const a = await freshCashierShift();
        const other = await freshCashierShift();
        assert.equal((await addExpense(a.session, a.shiftId, { amount: 1000, reason: 'Mua đá' })).status, 201);
        const mgrA = await userIn(a.branchId, 'MANAGER');
        const cashierA = await userIn(a.branchId, 'CASHIER');
        const mgrOther = await freshCashierShift('MANAGER');
        const path = `/work-shifts/${a.shiftId}/expenses`;
        const expectations = [
          ['owner cashier', a.session, 200, null],
          ['manager same branch', mgrA.session, 200, null],
          ['owner access_all', ownerA, 200, null],
          ['other cashier same branch', cashierA.session, 403, 'PERMISSION_DENIED'],
          ['manager of other branch', mgrOther.session, 403, 'PERMISSION_DENIED'],
          ['owner of store B', ownerB, 404, 'SHIFT_NOT_FOUND'],
          ['platform admin', admin, 403, 'PERMISSION_DENIED'],
          ['cashier of other branch', other.session, 403, 'PERMISSION_DENIED'],
        ] as const;
        for (const [label, session, status, code] of expectations) {
          const res = await request(session, path);
          assert.equal(res.status, status, label);
          if (code) assert.equal(res.json.error.code, code, label);
          else assert.equal(res.json.data.length, 1, label);
        }
      });

      await t.test('[S9-01][ST-2.AC-11] database failure rolls back expense insert', async () => {
        const { session, shiftId } = await freshCashierShift();
        await db.query(`CREATE FUNCTION s9_fail_expense() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'S9 expense rollback'; END $$`);
        await db.query('CREATE TRIGGER s9_fail_expense BEFORE INSERT ON shift_expenses FOR EACH ROW EXECUTE FUNCTION s9_fail_expense()');
        try {
          const res = await addExpense(session, shiftId, { amount: 1000, reason: 'Mua đá' });
          assert.equal(res.status, 500);
          assert.equal(res.json.error.code, 'INTERNAL_ERROR');
        } finally {
          await db.query('DROP TRIGGER s9_fail_expense ON shift_expenses');
          await db.query('DROP FUNCTION s9_fail_expense()');
        }
        assert.equal(await countExpenses(shiftId), 0);
      });

      await t.test('[S9-01][ST-2.AC-12] uppercase shift id in path records expense', async () => {
        const { session, shiftId } = await freshCashierShift();
        const res = await addExpense(session, shiftId.toUpperCase(), { amount: 1000, reason: 'Mua đá' });
        assert.equal(res.status, 201);
        assert.equal(res.json.data.workShiftId, shiftId);
      });

      // Opening 100000, CASH sale 50000, drawer expense 30000, non-drawer expense 20000.
      const shiftWithExpenses = async (role: 'CASHIER' | 'MANAGER' = 'CASHIER') => {
        const fixture = await freshCashierShift(role);
        await seedCashSale(fixture.branchId, fixture.shiftId, fixture.userId, 50000);
        assert.equal((await addExpense(fixture.session, fixture.shiftId, { amount: 30000, reason: 'Mua đá' })).status, 201);
        assert.equal(
          (await addExpense(fixture.session, fixture.shiftId, { amount: 20000, reason: 'Sửa quạt', paidFromDrawer: false })).status,
          201,
        );
        return fixture;
      };
      const reconciliationRow = async (shiftId: string) =>
        (
          await db.query(
            `SELECT cash_sales_amount, expense_amount, expected_cash, counted_cash, difference, status, note, reconciled_at, updated_at
             FROM cash_reconciliations WHERE work_shift_id=$1`,
            [shiftId],
          )
        )[0];
      const waitLock = async (expected: number) => {
        const deadline = Date.now() + 10000;
        while (Date.now() < deadline) {
          const [row] = await db.query(
            `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database()
             AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%FOR UPDATE%'`,
          );
          if (row.n >= expected) return;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        assert.fail(`expected ${expected} sessions waiting for the shift lock`);
      };

      await t.test('[S9-02][ST-3.AC-1] close subtracts only drawer expenses and keeps blind count', async () => {
        const { session, shiftId } = await shiftWithExpenses();
        const before = await request(session, `/work-shifts/${shiftId}`);
        assert.equal(before.json.data.reconciliation.expectedCash, null);
        assert.equal(before.json.data.reconciliation.expenseAmount, null);
        const closed = await request(session, `/work-shifts/${shiftId}/close`, 'POST', { countedCash: 120000 });
        assert.equal(closed.status, 200);
        const r = closed.json.data.reconciliation;
        assert.deepEqual(
          [r.cashSalesAmount, r.expenseAmount, r.expectedCash, r.countedCash, r.difference, r.status],
          [50000, 30000, 120000, 120000, 0, 'MATCHED'],
        );
        const row = await reconciliationRow(shiftId);
        assert.deepEqual(
          [row.cash_sales_amount, row.expense_amount, row.expected_cash, row.counted_cash, row.difference, row.status],
          ['50000', '30000', '120000', '120000', '0', 'MATCHED'],
        );
      });

      await t.test('[S9-02][ST-3.AC-2] close with difference still requires a note', async () => {
        const { session, shiftId } = await shiftWithExpenses();
        const noNote = await request(session, `/work-shifts/${shiftId}/close`, 'POST', { countedCash: 110000 });
        assert.equal(noNote.status, 422);
        assert.equal(noNote.json.error.code, 'RECONCILIATION_NOTE_REQUIRED');
        assert.equal((await db.query('SELECT status FROM work_shifts WHERE id=$1', [shiftId]))[0].status, 'OPEN');
        assert.equal((await reconciliationRow(shiftId)).expected_cash, null);
        const noted = await request(session, `/work-shifts/${shiftId}/close`, 'POST', { countedCash: 110000, note: 'Thiếu 10.000' });
        assert.equal(noted.status, 200);
        const r = noted.json.data.reconciliation;
        assert.deepEqual([r.expenseAmount, r.difference, r.status], [30000, -10000, 'SHORTAGE']);
      });

      await t.test('[S9-02][ST-3.AC-3] force close subtracts drawer expenses', async () => {
        const { branchId, shiftId } = await shiftWithExpenses();
        const manager = await userIn(branchId, 'MANAGER');
        const forced = await request(manager.session, `/work-shifts/${shiftId}/force-close`, 'POST', {
          countedCash: 125000,
          reason: 'Thu ngân về sớm',
        });
        assert.equal(forced.status, 200);
        const r = forced.json.data.reconciliation;
        assert.deepEqual(
          [r.expenseAmount, r.expectedCash, r.difference, r.status, r.note],
          [30000, 120000, 5000, 'OVERAGE', 'Thu ngân về sớm'],
        );
      });

      await t.test('[S9-02][ST-3.AC-4] close without expenses records zero expense', async () => {
        const { session, shiftId } = await freshCashierShift();
        const closed = await request(session, `/work-shifts/${shiftId}/close`, 'POST', { countedCash: 100000 });
        assert.equal(closed.status, 200);
        const r = closed.json.data.reconciliation;
        assert.deepEqual([r.expenseAmount, r.expectedCash, r.status], [0, 100000, 'MATCHED']);
      });

      await t.test('[S9-02][ST-3.AC-5] reconciliation snapshot does not change after close', async () => {
        const { session, shiftId } = await shiftWithExpenses();
        assert.equal((await request(session, `/work-shifts/${shiftId}/close`, 'POST', { countedCash: 120000 })).status, 200);
        const before = await reconciliationRow(shiftId);
        const rejected = await addExpense(session, shiftId, { amount: 1000, reason: 'Mua đá' });
        assert.equal(rejected.status, 409);
        assert.equal(rejected.json.error.code, 'SHIFT_CLOSED');
        assert.deepEqual(await reconciliationRow(shiftId), before);
        assert.equal(await countExpenses(shiftId), 2);
      });

      await t.test('[S9-02][ST-3.AC-6] expense and close serialize on the shift lock in both orders', async () => {
        const holdLock = async (shiftId: string) => {
          const gate = db.createQueryRunner();
          await gate.connect();
          await gate.startTransaction();
          await gate.query('SELECT id FROM work_shifts WHERE id=$1 FOR UPDATE', [shiftId]);
          return gate;
        };

        const a = await freshCashierShift();
        const gateA = await holdLock(a.shiftId);
        let expenseFirst, closeSecond;
        try {
          expenseFirst = addExpense(a.session, a.shiftId, { amount: 30000, reason: 'Mua đá' });
          await waitLock(1);
          closeSecond = request(a.session, `/work-shifts/${a.shiftId}/close`, 'POST', { countedCash: 70000 });
          await waitLock(2);
        } finally {
          await gateA.commitTransaction();
          await gateA.release();
        }
        assert.equal((await expenseFirst).status, 201);
        const closedA = await closeSecond;
        assert.equal(closedA.status, 200);
        assert.deepEqual(
          [closedA.json.data.reconciliation.expenseAmount, closedA.json.data.reconciliation.status],
          [30000, 'MATCHED'],
        );

        const b = await freshCashierShift();
        const gateB = await holdLock(b.shiftId);
        let closeFirst, expenseSecond;
        try {
          closeFirst = request(b.session, `/work-shifts/${b.shiftId}/close`, 'POST', { countedCash: 100000 });
          await waitLock(1);
          expenseSecond = addExpense(b.session, b.shiftId, { amount: 30000, reason: 'Mua đá' });
          await waitLock(2);
        } finally {
          await gateB.commitTransaction();
          await gateB.release();
        }
        const closedB = await closeFirst;
        assert.equal(closedB.status, 200);
        assert.equal(closedB.json.data.reconciliation.expenseAmount, 0);
        const lateExpense = await expenseSecond;
        assert.equal(lateExpense.status, 409);
        assert.equal(lateExpense.json.error.code, 'SHIFT_CLOSED');
        assert.equal(await countExpenses(b.shiftId), 0);
      });
    } finally {
      await app.close();
    }
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});
