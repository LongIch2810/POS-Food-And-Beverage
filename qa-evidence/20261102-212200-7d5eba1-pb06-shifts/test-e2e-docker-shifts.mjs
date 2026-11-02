import assert from 'node:assert/strict';

const API_BASE = 'http://127.0.0.1:3000/api/v1';

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  update(res) {
    const setCookies = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
    for (const sc of setCookies) {
      const parts = sc.split(';')[0].trim().split('=');
      const name = parts[0];
      const val = parts.slice(1).join('=');
      if (val === '' || sc.includes('Max-Age=0') || sc.includes('Expires=Thu, 01 Jan 1970')) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, val);
      }
    }
  }
  get header() {
    return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }
  get csrf() {
    return this.cookies.get('__Host-pos_csrf') || '';
  }
}

async function api(jar, endpoint, options = {}) {
  const headers = {
    'Origin': 'http://localhost:5173',
    'Content-Type': 'application/json',
    ...(jar.header ? { 'Cookie': jar.header } : {}),
    ...(jar.csrf && options.method && options.method !== 'GET' ? { 'x-csrf-token': jar.csrf } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}/${endpoint}`, {
    ...options,
    headers,
  });

  jar.update(res);

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return { status: res.status, data: json, headers: res.headers };
}

async function run() {
  console.log('--- STARTING DOCKER E2E SHIFTS TEST ---');

  const adminJar = new CookieJar();

  // 1. Login bootstrap admin
  console.log('1. Login Admin...');
  let res = await api(adminJar, 'auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'Admin@Local2026!' }),
  });

  if (res.status === 200 && res.data?.data?.mustChangePassword) {
    console.log('Changing admin initial password...');
    res = await api(adminJar, 'auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword: 'Admin@NewPassword2026!' }),
    });
    // Re-login after change password
    res = await api(adminJar, 'auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin@NewPassword2026!' }),
    });
  } else if (res.status !== 200) {
    // Retry with new password
    res = await api(adminJar, 'auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin@NewPassword2026!' }),
    });
  }
  assert.equal(res.status, 200, 'Admin login succeeded');

  // 2. Create Store
  const storeSuffix = `${Date.now() % 10000}`;
  const ownerUsername = `owner_${storeSuffix}`;
  console.log(`2. Creating store with owner ${ownerUsername}...`);
  const storeRes = await api(adminJar, 'platform/stores', {
    method: 'POST',
    body: JSON.stringify({
      name: `Cà Phê Test E2E ${storeSuffix}`,
      owner: {
        username: ownerUsername,
        fullName: 'Chủ Quán Test',
      },
    }),
  });
  if (storeRes.status !== 201) {
    console.error('Store creation error:', JSON.stringify(storeRes.data));
  }
  assert.equal(storeRes.status, 201, 'Store created');
  const storeId = storeRes.data.data.store.id;
  const ownerInitialPassword = storeRes.data.data.temporaryPassword;

  // 3. Login Owner and change password
  console.log('3. Login Owner & change password...');
  const ownerJar = new CookieJar();
  let ownerLogin = await api(ownerJar, 'auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: ownerUsername, password: ownerInitialPassword }),
  });
  assert.equal(ownerLogin.status, 200, 'Owner login succeeded');

  const ownerChange = await api(ownerJar, 'auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword: 'Owner@StrongPassword2026!' }),
  });
  assert.equal(ownerChange.status, 204, 'Owner password changed');

  // Re-login Owner with new password
  ownerLogin = await api(ownerJar, 'auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: ownerUsername, password: 'Owner@StrongPassword2026!' }),
  });
  assert.equal(ownerLogin.status, 200, 'Owner re-login succeeded');

  // Verify Owner identity
  const meRes = await api(ownerJar, 'auth/me');
  assert.equal(meRes.status, 200, 'Owner session active after password change');
  assert.equal(meRes.data.data.user.role, 'OWNER');

  // 4. Create Branch with initialCash = 1500000
  console.log('4. Create Branch with initialCash = 1,500,000 VND...');
  const branchRes = await api(ownerJar, 'branches', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Chi Nhánh Quận 1',
      code: `CN${storeSuffix.slice(0, 2)}`,
      initialCash: 1500000,
    }),
  });
  assert.equal(branchRes.status, 201, 'Branch created');
  const branchId = branchRes.data.data.id;
  assert.equal(branchRes.data.data.initialCash, 1500000);

  // 5. Create Manager user & Cashier user
  console.log('5. Create Manager & Cashier users...');
  const managerRes = await api(ownerJar, 'users', {
    method: 'POST',
    body: JSON.stringify({
      username: `mgr_${storeSuffix}`,
      fullName: 'Quản Lý Cửa Hàng',
      role: 'MANAGER',
      branchId: branchId,
    }),
  });
  assert.equal(managerRes.status, 201);
  const managerUsername = managerRes.data.data.user.username;
  const managerInitialPassword = managerRes.data.data.temporaryPassword;

  const cashierRes = await api(ownerJar, 'users', {
    method: 'POST',
    body: JSON.stringify({
      username: `csh_${storeSuffix}`,
      fullName: 'Thu Ngân Chính',
      role: 'CASHIER',
      branchId: branchId,
    }),
  });
  assert.equal(cashierRes.status, 201);
  const cashierUsername = cashierRes.data.data.user.username;
  const cashierInitialPassword = cashierRes.data.data.temporaryPassword;

  // 6. Login Manager and change password
  console.log('6. Manager setup and STAFF Shift Check-in/Check-out...');
  const managerJar = new CookieJar();
  let managerLogin = await api(managerJar, 'auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: managerUsername, password: managerInitialPassword }),
  });
  assert.equal(managerLogin.status, 200);

  const managerChange = await api(managerJar, 'auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword: 'Manager@StrongPass2026!' }),
  });
  assert.equal(managerChange.status, 204);

  managerLogin = await api(managerJar, 'auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: managerUsername, password: 'Manager@StrongPass2026!' }),
  });
  assert.equal(managerLogin.status, 200);

  // Manager check current shift (should be null)
  let curShift = await api(managerJar, 'work-shifts/current');
  assert.equal(curShift.status, 200);
  assert.equal(curShift.data.data, null);

  // Manager check-in (STAFF shift)
  const staffShiftRes = await api(managerJar, 'work-shifts', {
    method: 'POST',
    body: JSON.stringify({ shiftType: 'STAFF' }),
  });
  assert.equal(staffShiftRes.status, 201);
  const staffShiftId = staffShiftRes.data.data.id;
  assert.equal(staffShiftRes.data.data.shiftType, 'STAFF');
  assert.equal(staffShiftRes.data.data.status, 'OPEN');

  // Try to check in again (should fail with 409 DUPLICATE_OPEN_SHIFT)
  const staffDup = await api(managerJar, 'work-shifts', {
    method: 'POST',
    body: JSON.stringify({ shiftType: 'STAFF' }),
  });
  assert.equal(staffDup.status, 409, 'Duplicate open shift blocked');

  // Manager tan ca (STAFF shift close)
  const staffClose = await api(managerJar, `work-shifts/${staffShiftId}/close`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert.equal(staffClose.status, 200);
  assert.equal(staffClose.data.data.status, 'CLOSED');
  assert.equal(staffClose.data.data.reconciliation, null, 'STAFF shift has no reconciliation');
  console.log('✓ STAFF check-in & check-out verified!');

  // 7. Login Cashier and change password
  console.log('7. Cashier setup and Cashier Shift Operations...');
  const cashierJar = new CookieJar();
  let cashierLogin = await api(cashierJar, 'auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: cashierUsername, password: cashierInitialPassword }),
  });
  assert.equal(cashierLogin.status, 200);

  const cashierChange = await api(cashierJar, 'auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword: 'Cashier@StrongPass2026!' }),
  });
  assert.equal(cashierChange.status, 204);

  cashierLogin = await api(cashierJar, 'auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: cashierUsername, password: 'Cashier@StrongPass2026!' }),
  });
  assert.equal(cashierLogin.status, 200);

  // Cashier opens shift 1
  const cashierShift1 = await api(cashierJar, 'work-shifts', {
    method: 'POST',
    body: JSON.stringify({ shiftType: 'CASHIER' }),
  });
  assert.equal(cashierShift1.status, 201);
  const cShift1Id = cashierShift1.data.data.id;
  assert.equal(cashierShift1.data.data.shiftType, 'CASHIER');
  assert.equal(cashierShift1.data.data.status, 'OPEN');
  assert.equal(cashierShift1.data.data.reconciliation.openingCash, 1500000, 'Takes branch initialCash');
  assert.equal(cashierShift1.data.data.reconciliation.status, 'PENDING');
  console.log('✓ Cashier shift 1 opened with 1,500,000 opening cash!');

  // Owner tries to modify initialCash on branch (should be locked with 409)
  console.log('8. Verify initialCash lock on branch...');
  const lockCheck = await api(ownerJar, `branches/${branchId}`, {
    method: 'PATCH',
    body: JSON.stringify({ initialCash: 2000000 }),
  });
  assert.equal(lockCheck.status, 409, 'Locked initial cash returns 409');
  assert.equal(lockCheck.data.error.code, 'INITIAL_CASH_LOCKED');
  console.log('✓ Branch initialCash lock verified (409 INITIAL_CASH_LOCKED)!');

  // Cashier closes shift 1 with blind count (difference: 0)
  console.log('9. Cashier closes shift 1 with blind count...');
  const cShift1Close = await api(cashierJar, `work-shifts/${cShift1Id}/close`, {
    method: 'POST',
    body: JSON.stringify({ countedCash: 1500000 }),
  });
  assert.equal(cShift1Close.status, 200);
  assert.equal(cShift1Close.data.data.status, 'CLOSED');
  assert.equal(cShift1Close.data.data.reconciliation.countedCash, 1500000);
  assert.equal(cShift1Close.data.data.reconciliation.difference, 0);
  assert.equal(cShift1Close.data.data.reconciliation.status, 'MATCHED');
  console.log('✓ Cashier shift 1 closed, status MATCHED!');

  // Cashier opens shift 2 (should automatically take 1,500,000 from shift 1 countedCash)
  console.log('10. Cashier opens shift 2 (inherits previous counted cash)...');
  const cashierShift2 = await api(cashierJar, 'work-shifts', {
    method: 'POST',
    body: JSON.stringify({ shiftType: 'CASHIER' }),
  });
  assert.equal(cashierShift2.status, 201);
  const cShift2Id = cashierShift2.data.data.id;
  assert.equal(cashierShift2.data.data.reconciliation.openingCash, 1500000);
  console.log('✓ Cashier shift 2 opened with inherited opening cash!');

  // Manager forces close shift 2 with shortage (-50,000)
  console.log('11. Manager forces close shift 2 with shortage (-50,000)...');
  const forceCloseRes = await api(managerJar, `work-shifts/${cShift2Id}/force-close`, {
    method: 'POST',
    body: JSON.stringify({
      countedCash: 1450000,
      reason: 'Thu ngân nghỉ đột xuất, quản lý kiểm đếm thiếu 50.000đ',
      note: 'Đã lập biên bản',
    }),
  });
  assert.equal(forceCloseRes.status, 200);
  assert.equal(forceCloseRes.data.data.status, 'CLOSED');
  assert.notEqual(forceCloseRes.data.data.closedBy, null);
  assert.equal(forceCloseRes.data.data.reconciliation.countedCash, 1450000);
  assert.equal(forceCloseRes.data.data.reconciliation.difference, -50000);
  assert.equal(forceCloseRes.data.data.reconciliation.status, 'SHORTAGE');
  console.log('✓ Shift 2 force closed with SHORTAGE and manager audit recorded!');

  // 12. Query shifts list
  console.log('12. Query work shifts list pagination...');
  const listRes = await api(ownerJar, 'work-shifts?limit=10');
  assert.equal(listRes.status, 200);
  assert.ok(listRes.data.data.length >= 3, 'Found at least 3 shifts');
  console.log(`✓ List returned ${listRes.data.data.length} shifts with metadata!`);

  console.log('\n=== ALL DOCKER E2E SHIFTS TESTS PASSED SUCCESSFULLY! ===\n');
}

run().catch((err) => {
  console.error('E2E TEST FAILED:', err);
  process.exit(1);
});
