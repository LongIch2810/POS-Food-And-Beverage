import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';

test('PB-06 shifts and cash reconciliation HTTP with PostgreSQL', { timeout: 180_000 }, async (t) => {
  const name = `pos_pb06_test_${randomBytes(6).toString('hex')}`;
  const testUrl = new URL(process.env.DATABASE_URL!);
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
        return { status: response.status, json, headers: response.headers };
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

      // Create Store A and Store B
      const storeResA = await request(admin, '/platform/stores', 'POST', {
        name: 'PB06 Store A',
        owner: { username: 'owner_a', fullName: 'Owner A' },
      });
      assert.equal(storeResA.status, 201);
      const storeResB = await request(admin, '/platform/stores', 'POST', {
        name: 'PB06 Store B',
        owner: { username: 'owner_b', fullName: 'Owner B' },
      });
      assert.equal(storeResB.status, 201);

      const ownerA = await login('owner_a', storeResA.json.data.temporaryPassword);
      const ownerB = await login('owner_b', storeResB.json.data.temporaryPassword);
      await db.query('UPDATE users SET must_change_password=false WHERE id IN ($1, $2)', [
        storeResA.json.data.owner.id,
        storeResB.json.data.owner.id,
      ]);

      // Create Branch in Store A with initialCash = 1,000,000
      const branchResA1 = await request(ownerA, '/branches', 'POST', {
        code: 'A1',
        name: 'Chi nhanh A1',
        initialCash: 1000000,
      });
      assert.equal(branchResA1.status, 201);
      const branchA1Id = branchResA1.json.data.id;
      assert.equal(branchResA1.json.data.initialCash, 1000000);

      // Create Staff and Cashier in Branch A1
      const staffRes = await request(ownerA, '/users', 'POST', {
        branchId: branchA1Id,
        username: 'staff_a1',
        fullName: 'Nhan Vien A1',
        role: 'CASHIER', // dùng tài khoản có branch
      });
      assert.equal(staffRes.status, 201);
      const staffA1 = await login('staff_a1', staffRes.json.data.temporaryPassword);

      const cashier1Res = await request(ownerA, '/users', 'POST', {
        branchId: branchA1Id,
        username: 'cashier_a1',
        fullName: 'Thu Ngan A1',
        role: 'CASHIER',
      });
      assert.equal(cashier1Res.status, 201);
      const cashierA1 = await login('cashier_a1', cashier1Res.json.data.temporaryPassword);

      const cashier2Res = await request(ownerA, '/users', 'POST', {
        branchId: branchA1Id,
        username: 'cashier_a2',
        fullName: 'Thu Ngan A2',
        role: 'CASHIER',
      });
      assert.equal(cashier2Res.status, 201);
      const cashierA2 = await login('cashier_a2', cashier2Res.json.data.temporaryPassword);

      const managerRes = await request(ownerA, '/users', 'POST', {
        branchId: branchA1Id,
        username: 'manager_a1',
        fullName: 'Quan Ly A1',
        role: 'MANAGER',
      });
      assert.equal(managerRes.status, 201);
      const managerA1 = await login('manager_a1', managerRes.json.data.temporaryPassword);

      await db.query('UPDATE users SET must_change_password=false WHERE id IN ($1, $2, $3, $4)', [
        staffRes.json.data.user.id,
        cashier1Res.json.data.user.id,
        cashier2Res.json.data.user.id,
        managerRes.json.data.user.id,
      ]);

      // --- SHIFT-01: Ca nhân viên STAFF vào ca và tan ca ---
      await t.test('SHIFT-01: Ca nhân viên STAFF vào ca, tan ca, chặn 2 ca mở cùng lúc', async () => {
        // 1. Kiểm tra ban đầu chưa có ca mở
        const curr1 = await request(staffA1, '/work-shifts/current');
        assert.equal(curr1.status, 200);
        assert.equal(curr1.json.data, null);

        // 2. Vào ca STAFF
        const openRes = await request(staffA1, '/work-shifts', 'POST', {
          shiftType: 'STAFF',
          note: 'Vào ca ca sáng',
        });
        assert.equal(openRes.status, 201);
        const shiftId = openRes.json.data.id;
        assert.equal(openRes.json.data.shiftType, 'STAFF');
        assert.equal(openRes.json.data.status, 'OPEN');
        assert.equal(openRes.json.data.reconciliation, null);

        // 3. Current shift trả về ca này
        const curr2 = await request(staffA1, '/work-shifts/current');
        assert.equal(curr2.status, 200);
        assert.equal(curr2.json.data.id, shiftId);

        // 4. Chặn mở ca thứ hai khi ca cũ chưa đóng -> 409 SHIFT_ALREADY_OPEN (BR-14)
        const dupRes = await request(staffA1, '/work-shifts', 'POST', { shiftType: 'STAFF' });
        assert.equal(dupRes.status, 409);
        assert.equal(dupRes.json.error.code, 'SHIFT_ALREADY_OPEN');

        // 5. Tan ca
        const closeRes = await request(staffA1, `/work-shifts/${shiftId}/close`, 'POST', {});
        assert.equal(closeRes.status, 200);
        assert.equal(closeRes.json.data.status, 'CLOSED');
        assert.ok(closeRes.json.data.endedAt);
        assert.ok(new Date(closeRes.json.data.endedAt) > new Date(closeRes.json.data.startedAt));

        // 6. Current shift sau khi đóng lại về null
        const curr3 = await request(staffA1, '/work-shifts/current');
        assert.equal(curr3.status, 200);
        assert.equal(curr3.json.data, null);
      });

      let cashierShift1Id = '';

      // --- SHIFT-02: Ca thu ngân CASHIER đầu tiên tự động lấy initial_cash ---
      await t.test('SHIFT-02: Ca CASHIER đầu tiên tự lấy initial_cash, sinh đối soát PENDING', async () => {
        const tampered = await request(cashierA1, '/work-shifts', 'POST', {
          shiftType: 'CASHIER', openingCash: 999,
        });
        assert.equal(tampered.status, 422);
        const openRes = await request(cashierA1, '/work-shifts', 'POST', {
          shiftType: 'CASHIER',
        });
        assert.equal(openRes.status, 201);
        cashierShift1Id = openRes.json.data.id;
        assert.equal(openRes.json.data.shiftType, 'CASHIER');
        assert.equal(openRes.json.data.status, 'OPEN');

        // Đối soát tự sinh và lấy initialCash của chi nhánh
        assert.ok(openRes.json.data.reconciliation);
        assert.equal(openRes.json.data.reconciliation.openingCash, 1000000);
        assert.equal(openRes.json.data.reconciliation.status, 'PENDING');
        const current = await request(cashierA1, '/work-shifts/current');
        assert.equal(current.status, 200);
        assert.equal(current.json.data.shiftType, 'CASHIER');
        assert.ok(current.json.data.startedAt);
        assert.equal(current.json.data.reconciliation.openingCash, 1000000);
        assert.equal(current.json.data.reconciliation.expectedCash, null);
      });

      // --- SHIFT-03: Chặn 2 ca CASHIER cùng mở trong một chi nhánh ---
      await t.test('SHIFT-03: Chi nhánh đã có ca thu ngân OPEN thì ca CASHIER thứ 2 bị chặn', async () => {
        // Thu ngân A2 cố mở ca CASHIER trong cùng chi nhánh A1
        const dupBranchRes = await request(cashierA2, '/work-shifts', 'POST', {
          shiftType: 'CASHIER',
        });
        assert.equal(dupBranchRes.status, 409);
        assert.equal(dupBranchRes.json.error.code, 'BRANCH_CASHIER_SHIFT_OPEN');
      });

      // --- SHIFT-04: Đóng ca CASHIER 1 và kiểm tra đối soát đếm mù ---
      await t.test('SHIFT-04: Đóng ca CASHIER, đếm mù, kiểm tra note khi lệch tiền', async () => {
        // 1. Đóng ca CASHIER mà không nhập countedCash -> 400
        const noCountRes = await request(cashierA1, `/work-shifts/${cashierShift1Id}/close`, 'POST', {});
        assert.equal(noCountRes.status, 400);
        assert.equal(noCountRes.json.error.code, 'COUNTED_CASH_REQUIRED');

        // 2. Đếm lệch thiếu (1.000.000 vs 950.000) nhưng không có note -> 422 RECONCILIATION_NOTE_REQUIRED (BR-60)
        const noNoteRes = await request(cashierA1, `/work-shifts/${cashierShift1Id}/close`, 'POST', {
          countedCash: 950000,
        });
        assert.equal(noNoteRes.status, 422);
        assert.equal(noNoteRes.json.error.code, 'RECONCILIATION_NOTE_REQUIRED');

        // 3. Đếm lệch thiếu có note -> Thành công, status = SHORTAGE, difference = -50000
        const closeRes = await request(cashierA1, `/work-shifts/${cashierShift1Id}/close`, 'POST', {
          countedCash: 950000,
          note: 'Thiếu 50k tiền thối',
        });
        assert.equal(closeRes.status, 200);
        assert.equal(closeRes.json.data.status, 'CLOSED');
        assert.ok(closeRes.json.data.reconciliation);
        assert.equal(closeRes.json.data.reconciliation.expectedCash, 1000000);
        assert.equal(closeRes.json.data.reconciliation.countedCash, 950000);
        assert.equal(closeRes.json.data.reconciliation.difference, -50000);
        assert.equal(closeRes.json.data.reconciliation.status, 'SHORTAGE');

        // 4. Cố đóng lại ca đã CLOSED -> 409 SHIFT_CLOSED
        const alreadyClosed = await request(cashierA1, `/work-shifts/${cashierShift1Id}/close`, 'POST', {
          countedCash: 950000,
          note: 'Đóng lại',
        });
        assert.equal(alreadyClosed.status, 409);
        assert.equal(alreadyClosed.json.error.code, 'SHIFT_CLOSED');
        const editClosed = await request(cashierA1, `/work-shifts/${cashierShift1Id}`, 'PATCH', { status: 'OPEN' });
        assert.equal(editClosed.status, 404);
      });

      let cashierShift2Id = '';

      // --- SHIFT-05: Mở ca CASHIER 2 -> Tự động kế thừa counted_cash của ca 1 ---
      await t.test('SHIFT-05: Ca CASHIER tiếp theo tự động lấy counted_cash của ca trước làm opening_cash', async () => {
        // Thu ngân A2 mở ca sau khi ca 1 đã đóng với counted_cash = 950.000
        const open2Res = await request(cashierA2, '/work-shifts', 'POST', {
          shiftType: 'CASHIER',
        });
        assert.equal(open2Res.status, 201);
        cashierShift2Id = open2Res.json.data.id;
        assert.ok(open2Res.json.data.reconciliation);
        // opening_cash phải tự động bằng 950.000 (BR-55, BR-89)
        assert.equal(open2Res.json.data.reconciliation.openingCash, 950000);
        assert.equal(open2Res.json.data.reconciliation.status, 'PENDING');
      });

      // --- SHIFT-06: Khóa sửa initialCash của chi nhánh sau khi có ca CASHIER ---
      await t.test('SHIFT-06: Chặn sửa initialCash của chi nhánh sau khi đã phát sinh ca thu ngân', async () => {
        const patchRes = await request(ownerA, `/branches/${branchA1Id}`, 'PATCH', {
          initialCash: 2000000,
        });
        assert.equal(patchRes.status, 409);
        assert.equal(patchRes.json.error.code, 'INITIAL_CASH_LOCKED');

        // Nhưng sửa thông tin khác như tên hoặc phone vẫn thành công
        const patchNameRes = await request(ownerA, `/branches/${branchA1Id}`, 'PATCH', {
          name: 'Chi nhanh A1 Da Sua Ten',
        });
        assert.equal(patchNameRes.status, 200);
        assert.equal(patchNameRes.json.data.name, 'Chi nhanh A1 Da Sua Ten');
      });

      // --- SHIFT-07: Quản lý đóng cưỡng chế ca của thu ngân (force_close) ---
      await t.test('SHIFT-07: Quản lý đóng cưỡng chế ca (force_close) ghi nhận closed_by và reason', async () => {
        // Thu ngân A2 đang mở ca cashierShift2Id, Quản lý đóng cưỡng chế
        const forceRes = await request(managerA1, `/work-shifts/${cashierShift2Id}/force-close`, 'POST', {
          countedCash: 950000,
          reason: 'Thu ngân ra ngoài quên đóng ca',
          note: 'Khớp tiền',
        });
        assert.equal(forceRes.status, 200);
        assert.equal(forceRes.json.data.status, 'CLOSED');
        assert.ok(forceRes.json.data.reconciliation);
        assert.equal(forceRes.json.data.reconciliation.difference, 0);
        assert.equal(forceRes.json.data.reconciliation.status, 'MATCHED');
        assert.equal(forceRes.json.data.closedBy, managerRes.json.data.user.id);
        assert.ok(forceRes.json.data.note.includes('Thu ngân ra ngoài'));

        const reopened = await request(cashierA2, '/work-shifts', 'POST', { shiftType: 'CASHIER' });
        assert.equal(reopened.status, 201);
        const reason = 'R'.repeat(255);
        const note = 'N'.repeat(255);
        const boundary = await request(managerA1, `/work-shifts/${reopened.json.data.id}/force-close`, 'POST', {
          countedCash: 950000, reason, note,
        });
        assert.equal(boundary.status, 200, '255-character reason and note must fit the persisted columns');
        assert.equal(boundary.json.data.note, reason);
        assert.equal(boundary.json.data.reconciliation.note, note);
      });

      let branchA2Id = '';
      await t.test('BR-14: cùng OWNER mở STAFF đồng thời ở hai chi nhánh chỉ tạo một ca', async () => {
        const branchB = await request(ownerA, '/branches', 'POST', { code: 'A2', name: 'Chi nhanh A2', initialCash: 0 });
        assert.equal(branchB.status, 201);
        branchA2Id = branchB.json.data.id;
        const attempts = await Promise.all([branchA1Id, branchB.json.data.id].map(branchId =>
          request(ownerA, '/work-shifts', 'POST', { shiftType: 'STAFF', branchId })));
        assert.deepEqual(attempts.map(result => result.status).sort(), [201, 409]);
        assert.equal(attempts.find(result => result.status === 409)?.json.error.code, 'SHIFT_ALREADY_OPEN');
        const opened = attempts.find(result => result.status === 201)!;
        const closed = await request(ownerA, `/work-shifts/${opened.json.data.id}/close`, 'POST', {});
        assert.equal(closed.status, 200);
      });

      await t.test('SHIFT-09: Đếm thừa tiền ghi OVERAGE và chênh lệch dương', async () => {
        const opened = await request(cashierA1, '/work-shifts', 'POST', { shiftType: 'CASHIER' });
        assert.equal(opened.status, 201);
        const expected = opened.json.data.reconciliation.openingCash;
        const closed = await request(cashierA1, `/work-shifts/${opened.json.data.id}/close`, 'POST', {
          countedCash: expected + 1000, note: 'Thừa tiền mặt',
        });
        assert.equal(closed.status, 200);
        assert.equal(closed.json.data.reconciliation.status, 'OVERAGE');
        assert.equal(closed.json.data.reconciliation.difference, 1000);
      });

      // --- SHIFT-08: Phân quyền, Danh sách ca và Cô lập Multi-tenant ---
      await t.test('SHIFT-08: Phân quyền, Danh sách ca phân trang và Cô lập Multi-tenant', async () => {
        // 1. PLATFORM_ADMIN không có quyền truy cập ca làm việc (BR-81)
        const adminShift = await request(admin, '/work-shifts');
        assert.equal(adminShift.status, 403);
        assert.equal(adminShift.json.error.code, 'PERMISSION_DENIED');

        // 2. Thu ngân cố đóng ca của người khác -> 403 FORBIDDEN_NOT_SHIFT_OWNER
        // Mở 1 ca cho staffA1
        const staffShift = await request(staffA1, '/work-shifts', 'POST', { shiftType: 'STAFF' });
        assert.equal(staffShift.status, 201);
        const otherClose = await request(cashierA1, `/work-shifts/${staffShift.json.data.id}/close`, 'POST', {});
        assert.equal(otherClose.status, 403);
        assert.equal(otherClose.json.error.code, 'FORBIDDEN_NOT_SHIFT_OWNER');
        // Dọn ca staff
        await request(staffA1, `/work-shifts/${staffShift.json.data.id}/close`, 'POST', {});

        // 3. OWNER Store B không xem được ca của Store A
        const ownerBView = await request(ownerB, `/work-shifts/${cashierShift1Id}`);
        assert.equal(ownerBView.status, 404);

        // 4. Danh sách ca của OWNER A xem được toàn bộ ca trong store và phân trang cursor
        const listRes = await request(ownerA, '/work-shifts?limit=2');
        assert.equal(listRes.status, 200);
        assert.ok(Array.isArray(listRes.json.data));
        assert.equal(listRes.json.data.length, 2);
        assert.ok(listRes.json.meta.total >= 3);
        assert.ok(listRes.json.meta.nextCursor, 'Has nextCursor for pagination');

        // Gọi trang tiếp theo bằng nextCursor
        const page2Res = await request(ownerA, `/work-shifts?limit=2&cursor=${listRes.json.meta.nextCursor}`);
        assert.equal(page2Res.status, 200, 'Next page with cursor succeeds');
        assert.ok(Array.isArray(page2Res.json.data));
        assert.ok(page2Res.json.data.length >= 1);
        assert.notEqual(page2Res.json.data[0].id, listRes.json.data[0].id, 'Page 2 rows are distinct from Page 1');

        // 5. Chi tiết ca lấy được kèm thông tin branch, user và reconciliation
        const detailRes = await request(ownerA, `/work-shifts/${cashierShift1Id}`);
        assert.equal(detailRes.status, 200);
        assert.equal(detailRes.json.data.id, cashierShift1Id);
        assert.equal(detailRes.json.data.shiftType, 'CASHIER');
        assert.ok(detailRes.json.data.reconciliation);

        // 6. Phạm vi branch và ca của CASHIER trên cả danh sách lẫn chi tiết
        const a2Shift = await request(ownerA, '/work-shifts', 'POST', {
          shiftType: 'STAFF', branchId: branchA2Id,
        });
        assert.equal(a2Shift.status, 201);
        const cashierWrongBranch = await request(cashierA1, '/work-shifts', 'POST', {
          shiftType: 'CASHIER', branchId: branchA2Id,
        });
        assert.equal(cashierWrongBranch.status, 201);
        assert.equal(cashierWrongBranch.json.data.branchId, branchA1Id);
        const closeOwnBranch = await request(cashierA1, `/work-shifts/${cashierWrongBranch.json.data.id}/close`, 'POST', {
          countedCash: cashierWrongBranch.json.data.reconciliation.openingCash,
        });
        assert.equal(closeOwnBranch.status, 200);
        const ownerWrongStore = await request(ownerB, '/work-shifts', 'POST', {
          shiftType: 'CASHIER', branchId: branchA1Id,
        });
        assert.equal(ownerWrongStore.status, 404);
        assert.equal(ownerWrongStore.json.error.code, 'BRANCH_NOT_FOUND');
        const managerList = await request(managerA1, '/work-shifts');
        assert.equal(managerList.status, 200);
        assert.ok(managerList.json.data.every((shift: { branchId: string }) => shift.branchId === branchA1Id));
        const managerA2 = await request(managerA1, `/work-shifts/${a2Shift.json.data.id}`);
        assert.equal(managerA2.status, 403);
        const cashierList = await request(cashierA1, '/work-shifts');
        assert.equal(cashierList.status, 200);
        assert.ok(cashierList.json.data.every((shift: { userId: string }) => shift.userId === cashier1Res.json.data.user.id));
        const cashierOther = await request(cashierA1, `/work-shifts/${a2Shift.json.data.id}`);
        assert.equal(cashierOther.status, 403);

        // 7. Phiên cũ bị chặn khi tài khoản/cửa hàng ngưng hoạt động
        await db.query('UPDATE users SET is_active=false WHERE id=$1', [cashier1Res.json.data.user.id]);
        const disabled = await request(cashierA1, '/work-shifts/current');
        assert.equal(disabled.status, 403);
        assert.equal(disabled.json.error.code, 'ACCOUNT_DISABLED');
        await db.query('UPDATE users SET is_active=true WHERE id=$1', [cashier1Res.json.data.user.id]);
        await db.query("UPDATE stores SET status='SUSPENDED' WHERE id=$1", [storeResA.json.data.store.id]);
        const suspended = await request(ownerA, '/work-shifts/current');
        assert.equal(suspended.status, 403);
        assert.equal(suspended.json.error.code, 'STORE_SUSPENDED');
      });
    } finally {
      await app.close();
    }
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) {
      await dataSource.query(`
        SELECT pg_terminate_backend(pid) FROM pg_stat_activity
        WHERE datname = '${name}' AND pid <> pg_backend_pid();
      `);
      await dataSource.query(`DROP DATABASE IF EXISTS "${name}"`);
    }
    if (dataSource.isInitialized) await dataSource.destroy();
  }
});

