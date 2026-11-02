const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const load = createRequire(path.resolve(__dirname, '../../POS_API/package.json'));
const { Client } = load('pg');
const { chromium } = require('C:/Users/Admin/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright');
const output = path.join(__dirname, process.env.PB13_ATTEMPT || 'browser-1');
fs.mkdirSync(output, { recursive: true });
const fixture = JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE, '.codex/tmp/pb13-browser-fixture.json')));
const secrets = [fixture.admin.password, ...fixture.owners.flatMap(user => [user.password, user.newPassword])];
const secret = () => { const value = randomBytes(24).toString('base64url'); secrets.push(value); return value; };
const safe = value => JSON.parse(JSON.stringify(value, (key, item) =>
  typeof item === 'string' && /password|token|csrf|cookie|secret/i.test(key) ? '[REDACTED]' : item));
const safeText = value => secrets.reduce((text, value) => text.split(value).join('[REDACTED]'), value)
  .replace(/value="[^"]*"/g, 'value="[REDACTED]"');
const write = (name, value) => fs.writeFileSync(path.join(output, name), safeText(typeof value === 'string' ? value : JSON.stringify(value, null, 2)));
const events = [];
let db, writer, browser;
const state = async () => {
  const [stores, branches, tables, users, sessions] = await Promise.all([
    db.query('SELECT id,name,status FROM stores ORDER BY id'),
    db.query('SELECT id,store_id,code,name,address,phone,initial_cash,is_active FROM branches ORDER BY id'),
    db.query('SELECT id,branch_id,name,area,capacity,is_active FROM dining_tables ORDER BY id'),
    db.query('SELECT u.id,u.store_id,u.branch_id,u.username,r.name AS role,u.is_active,u.must_change_password FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id'),
    db.query('SELECT user_id,count(*) FILTER(WHERE revoked_at IS NULL)::int AS active FROM refresh_tokens GROUP BY user_id ORDER BY user_id'),
  ]); return { stores: stores.rows, branches: branches.rows, tables: tables.rows, users: users.rows, sessions: sessions.rows };
};
function track(page) {
  page.on('response', async response => {
    const request = response.request(); if (!request.url().includes('/api/')) return;
    let responseBody = null, requestBody = null;
    try { responseBody = await response.json(); } catch {}
    try { requestBody = request.postDataJSON(); } catch {}
    const row = { time: new Date().toISOString(), method: request.method(), url: request.url(), status: response.status(),
      requestId: response.headers()['x-request-id'], request: safe(requestBody), response: safe(responseBody),
      csrfPresent: Boolean(request.headers()['x-csrf-token']) };
    events.push(row); fs.appendFileSync(path.join(output, 'browser-network.jsonl'), safeText(JSON.stringify(row)) + '\n');
  });
  page.on('requestfailed', request => fs.appendFileSync(path.join(output, 'browser-failures.jsonl'),
    JSON.stringify({ time: new Date().toISOString(), method: request.method(), url: request.url(), failure: request.failure()?.errorText }) + '\n'));
  page.on('pageerror', error => write('browser-error.log', safeText(error.stack || error.message)));
}
async function capture(page, name, expected) {
  await page.locator('[role=dialog]').evaluateAll(async elements => {
    await Promise.all(elements.flatMap(el => el.getAnimations({ subtree: true })).map(animation => animation.finished.catch(() => {})));
  });
  write(name + '.snapshot.yml', await page.locator('body').ariaSnapshot());
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true, animations: 'disabled',
    mask: [page.locator('input[type=password]'), page.locator('input[aria-label="Mật khẩu tạm"]')] });
  fs.appendFileSync(path.join(output, 'browser-cases.jsonl'), JSON.stringify({ case: name, time: new Date().toISOString(),
    expected, url: page.url(), viewport: page.viewportSize() }) + '\n');
}
async function context() {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage(); track(page); return page;
}
async function login(page, user) {
  await page.goto('http://localhost:5175');
  await page.getByRole('button', { name: 'Đăng nhập hệ thống', exact: true }).waitFor();
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill(user.username);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Đăng nhập hệ thống', exact: true }).click();
}
async function changedLogin(page, user, name) {
  await login(page, user);
  await page.getByRole('heading', { name: 'Đổi mật khẩu lần đầu', exact: true }).waitFor();
  await capture(page, name + '-force-change', 'New temporary password requires change');
  const next = secret();
  await page.getByLabel('Mật khẩu mới (tối thiểu 12 ký tự)', { exact: true }).fill(next);
  await page.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill(next);
  await page.getByRole('button', { name: 'Xác nhận đổi mật khẩu', exact: true }).click();
  await page.getByRole('button', { name: 'Đăng nhập hệ thống', exact: true }).waitFor();
  user.password = next; await login(page, user);
}
async function resetStaff(owner, username, name) {
  await owner.getByRole('tab', { name: 'Tài khoản', exact: true }).click();
  await owner.getByLabel('Vai trò', { exact: true }).selectOption('MANAGER');
  const row = owner.getByRole('row').filter({ has: owner.getByRole('cell', { name: username, exact: true }) });
  await row.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
  const before = await state(); await capture(owner, name + '-before', 'Reset existing staff for resumed isolated QA session');
  await owner.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await owner.getByRole('dialog', { name: 'Mật khẩu tạm', exact: true }).waitFor();
  const password = await owner.locator('input[aria-label="Mật khẩu tạm"]').inputValue(); secrets.push(password);
  await capture(owner, name + '-password', 'One-time credential masked; acknowledgement required');
  await owner.getByRole('dialog').getByRole('checkbox', { name: 'Tôi đã lưu mật khẩu', exact: true }).check();
  await owner.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click();
  write(name + '-db.json', { before, after: await state() }); return { username, password };
}
async function main() {
  assert.match(fixture.databaseName, /^pos_pb13_browser_[a-f0-9]+$/);
  const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + fixture.databaseName;
  db = new Client({ connectionString: url.toString() }); writer = new Client({ connectionString: url.toString() });
  await db.connect(); await db.query('SET default_transaction_read_only=on'); await writer.connect();
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ownerA = await context(), ownerB = await context(), admin = await context();
  await login(ownerA, { username: fixture.owners[0].username, password: fixture.owners[0].newPassword });
  await ownerA.getByRole('heading', { name: 'Cài đặt cửa hàng', exact: true }).waitFor();
  const beforeSetup = await state();
  const a1 = beforeSetup.branches.find(branch => branch.store_id === fixture.owners[0].storeId && branch.code === 'aA').id;
  const a2 = beforeSetup.branches.find(branch => branch.store_id === fixture.owners[0].storeId && branch.code === 'bB').id;
  await writer.query("UPDATE users SET branch_id=$1 WHERE username='pb13_qa_manager' AND store_id=$2", [a1, fixture.owners[0].storeId]);
  write('N01-setup.json', { label: 'DIRECT_QA_FIXTURE_ONLY_NOT_PRODUCT_API', before: beforeSetup, after: await state() });
  const managerUser = await resetStaff(ownerA, 'pb13_qa_manager', 'N02-manager-reset');
  const manager = await context(); await changedLogin(manager, managerUser, 'N03-manager');
  await manager.getByRole('table').waitFor();
  assert.deepEqual(await manager.getByRole('tab').allTextContents(), ['Bàn']);
  await capture(manager, 'N03-manager-A1', 'Default MANAGER sees only own branch A1 tables');
  const beforeMove = await state();
  await writer.query("UPDATE users SET branch_id=$1 WHERE username='pb13_qa_manager' AND store_id=$2", [a2, fixture.owners[0].storeId]);
  await manager.evaluate(() => window.dispatchEvent(new Event('focus')));
  await manager.getByRole('cell', { name: 'QA Bàn', exact: true }).waitFor();
  const expectedA2 = (await state()).tables.filter(row => row.branch_id === a2).map(row => row.name).sort();
  assert.deepEqual((await manager.locator('tbody tr td:first-child').allTextContents()).sort(), expectedA2);
  await capture(manager, 'N04-current-branch-A2', 'Same session revalidates branch and drops A1 rows');
  write('N04-current-branch-db.json', { before: beforeMove, after: await state(), expectedA2,
    note: 'Only fixture can reassign branch; no product branch-move feature added' });
  const permissionsBefore = await state();
  await writer.query("INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r,permissions p WHERE r.name='MANAGER' AND p.code='user.manage' ON CONFLICT DO NOTHING");
  await manager.evaluate(() => window.dispatchEvent(new Event('focus')));
  await manager.getByRole('tab', { name: 'Tài khoản', exact: true }).click();
  await manager.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await capture(manager, 'N05-current-permission-before', 'Temporary QA grant allows form; no data submitted');
  await writer.query("DELETE FROM role_permissions rp USING roles r,permissions p WHERE rp.role_id=r.id AND rp.permission_id=p.id AND r.name='MANAGER' AND p.code='user.manage'");
  await manager.evaluate(() => window.dispatchEvent(new Event('focus')));
  await manager.getByRole('dialog').waitFor({ state: 'hidden' });
  await manager.getByRole('tab', { name: 'Tài khoản', exact: true }).waitFor({ state: 'hidden' });
  assert.deepEqual(await manager.getByRole('tab').allTextContents(), ['Bàn']);
  await capture(manager, 'N05-current-permission-after', 'Revalidation removes old form and disallowed account tab');
  write('N05-permissions-db.json', { label: 'DIRECT_QA_FIXTURE_ONLY', before: permissionsBefore, after: await state(), formCleared: true });

  await ownerA.getByRole('tab', { name: 'Chi nhánh', exact: true }).click();
  await ownerA.getByRole('table').waitFor();
  const actualCodes = []; let pages = 0;
  do {
    actualCodes.push(...await ownerA.locator('tbody tr td:first-child').allTextContents()); pages++;
    if (await ownerA.getByRole('button', { name: 'Trang sau', exact: true }).isDisabled()) break;
    const previous = await ownerA.locator('tbody tr td:first-child').first().textContent();
    await ownerA.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await ownerA.waitForFunction(old => document.querySelector('tbody tr td') && document.querySelector('tbody tr td').textContent !== old, previous);
  } while (pages < 10);
  const expectedCodes = (await state()).branches.filter(branch => branch.store_id === fixture.owners[0].storeId).map(branch => branch.code);
  assert.deepEqual([...actualCodes].sort(), expectedCodes.sort()); assert.equal(new Set(actualCodes).size, actualCodes.length);
  await capture(ownerA, 'N06-branch-pages', '105 branches across six pages; exact set and final cursor');
  await ownerA.getByRole('tab', { name: 'Bàn', exact: true }).click();
  await ownerA.getByLabel('Chi nhánh', { exact: true }).selectOption(a2);
  await ownerA.getByRole('cell', { name: 'QA Bàn', exact: true }).waitFor();
  assert.equal(await ownerA.getByLabel('Chi nhánh', { exact: true }).locator('option').count(), expectedCodes.length + 1);
  write('N06-pagination.json', { pages, actualCodes, expectedCodes, choiceCount: expectedCodes.length });
  let release, ready; const gate = new Promise(resolve => { release = resolve; }); const observed = new Promise(resolve => { ready = resolve; }); let held = false;
  const pattern = '**/api/v1/dining-tables?*';
  await ownerA.route(pattern, async route => {
    if (new URL(route.request().url()).searchParams.get('branchId') === a1 && !held) {
      held = true; const response = await route.fetch(); ready(); await gate; await route.fulfill({ response });
    } else await route.continue();
  });
  try {
    await ownerA.getByLabel('Chi nhánh', { exact: true }).selectOption(a1); await observed;
    await capture(ownerA, 'N07-query-held', 'Actual A1 SQL response delayed; query shows skeleton');
    await ownerA.getByLabel('Chi nhánh', { exact: true }).selectOption(a2);
    await ownerA.getByRole('cell', { name: 'QA Bàn', exact: true }).waitFor();
    await capture(ownerA, 'N07-A2-before-release', 'A2 completed before old A1 response');
    const old = ownerA.waitForResponse(response => response.url().includes('/dining-tables?') && new URL(response.url()).searchParams.get('branchId') === a1);
    release(); await old;
    await ownerA.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.deepEqual((await ownerA.locator('tbody tr td:first-child').allTextContents()).sort(), expectedA2);
    assert.equal(await ownerA.getByRole('button', { name: 'Trang sau', exact: true }).isDisabled(), true);
    await capture(ownerA, 'N07-stale-rejected', 'Old SQL rows and cursor cannot replace selected A2');
  } finally { release(); await ownerA.unroute(pattern); }
  await ownerA.context().setOffline(true);
  await ownerA.getByText('Mất kết nối. Thao tác mới sẽ không được lưu cho đến khi có mạng.', { exact: true }).waitFor();
  assert.equal(await ownerA.getByRole('button', { name: 'Thêm bàn', exact: true }).isDisabled(), true);
  await capture(ownerA, 'N08-offline', 'Offline disables writes'); await ownerA.context().setOffline(false);
  let aborted = false; const usersPattern = '**/api/v1/users?*';
  await ownerA.route(usersPattern, route => { if (!aborted) { aborted = true; return route.abort('failed'); } return route.continue(); });
  await ownerA.getByRole('tab', { name: 'Tài khoản', exact: true }).click();
  await ownerA.getByRole('button', { name: 'Thử lại', exact: true }).waitFor(); await capture(ownerA, 'N08-list-error', 'Read error offers explicit retry');
  await ownerA.getByRole('button', { name: 'Thử lại', exact: true }).click(); await ownerA.getByRole('table').waitFor();
  await capture(ownerA, 'N08-list-retry', 'Retry recovers actual staff list'); await ownerA.unroute(usersPattern);

  await login(ownerB, { username: fixture.owners[1].username, password: fixture.owners[1].newPassword });
  await ownerB.getByRole('heading', { name: 'Cài đặt cửa hàng', exact: true }).waitFor();
  await ownerB.getByRole('table').waitFor();
  const oldRefreshes = events.filter(row => row.url.endsWith('/auth/refresh')).length;
  await ownerB.context().clearCookies({ name: '__Host-pos_access' });
  await capture(ownerB, 'N09-access-expired-before', 'Only access cookie removed; refresh remains');
  await ownerB.getByRole('tab', { name: 'Bàn', exact: true }).click(); await ownerB.getByRole('table').waitFor();
  assert.equal(events.filter(row => row.url.endsWith('/auth/refresh')).length - oldRefreshes, 1);
  await capture(ownerB, 'N09-access-restored', 'One refresh restores same actor and retries GET');
  write('N09-cookies.json', { cookies: (await ownerB.context().cookies()).map(({ name, httpOnly, secure, sameSite, expires }) => ({ name, httpOnly, secure, sameSite, expires })), refreshCount: 1 });
  await login(admin, { ...fixture.admin });
  await admin.getByRole('heading', { name: 'Quản trị nền tảng', exact: true }).waitFor();
  await capture(admin, 'N10-platform', 'Platform store/owner area has no organization tables or selector');
  const card = admin.getByText('PB13 QA Store b', { exact: true }).locator('..').locator('..');
  await card.getByRole('button', { name: 'Tạm khóa', exact: true }).click();
  const reason = admin.getByRole('dialog').locator('input,textarea'); await reason.first().fill('QA final suspension');
  const beforeSuspend = await state(); await capture(admin, 'N10-suspend-before', 'Platform explicitly confirms suspend store B');
  await admin.getByRole('dialog').getByRole('button', { name: 'Xác nhận tạm khóa', exact: true }).click();
  await card.getByRole('button', { name: 'Mở lại', exact: true }).waitFor();
  await ownerB.evaluate(() => window.dispatchEvent(new Event('focus')));
  await ownerB.getByRole('button', { name: 'Đăng nhập hệ thống', exact: true }).waitFor();
  const afterSuspend = await state(); assert.equal(afterSuspend.stores.find(store => store.id === fixture.owners[1].storeId).status, 'SUSPENDED');
  assert.deepEqual(afterSuspend.branches, beforeSuspend.branches); assert.deepEqual(afterSuspend.tables, beforeSuspend.tables);
  await capture(ownerB, 'N10-suspended-owner', 'Old store B session revoked, operational data retained');
  write('N10-suspend-db.json', { before: beforeSuspend, after: afterSuspend });
  await card.getByRole('button', { name: 'Mở lại', exact: true }).click();
  await card.getByRole('button', { name: 'Tạm khóa', exact: true }).waitFor();
  await ownerB.reload(); await ownerB.getByRole('button', { name: 'Đăng nhập hệ thống', exact: true }).waitFor();
  await capture(ownerB, 'N10-reactivate-old-denied', 'Reactivation does not resurrect revoked cookies');
  await login(ownerB, { username: fixture.owners[1].username, password: fixture.owners[1].newPassword });
  await ownerB.getByRole('table').waitFor(); await capture(ownerB, 'N10-reactivate-new-login', 'Explicit new login required after reactivation');
  for (const width of [1024, 768]) {
    await ownerB.setViewportSize({ width, height: 768 }); await ownerB.getByRole('tab', { name: 'Tài khoản', exact: true }).click();
    await ownerB.getByRole('table').waitFor();
    const metrics = await ownerB.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.organization-settings button,header button')].filter(el => el.getBoundingClientRect().height > 0)
        .map(el => ({ text: el.textContent.trim(), height: el.getBoundingClientRect().height })) }));
    assert.ok(metrics.documentWidth <= width); assert.ok(metrics.controls.every(control => control.height >= 48));
    write('N11-layout-' + width + '.json', metrics); await capture(ownerB, 'N11-layout-' + width, 'No viewport overflow, touch targets >=48px');
  }
  await ownerB.getByRole('tab', { name: 'Chi nhánh', exact: true }).click(); const opener = ownerB.getByRole('button', { name: 'Thêm chi nhánh', exact: true });
  await opener.focus(); await ownerB.keyboard.press('Enter'); await ownerB.getByRole('dialog').waitFor();
  await ownerB.waitForFunction(() => document.querySelector('[role=dialog]')?.contains(document.activeElement));
  for (let i = 0; i < 12; i++) await ownerB.keyboard.press('Tab');
  assert.equal(await ownerB.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)), true);
  await capture(ownerB, 'N12-keyboard-trap', 'Keyboard opens form and focus stays in dialog');
  await ownerB.keyboard.press('Escape'); await ownerB.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await opener.evaluate(el => el === document.activeElement), true);
  await capture(ownerB, 'N12-keyboard-return', 'Escape restores opener focus');
  write('browser-result.json', { time: new Date().toISOString(), passed: true, databaseName: fixture.databaseName,
    networkRecords: events.length, branchPages: pages, branchChoices: expectedCodes.length,
    version: browser.version(), sourceHash: createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../../POS_UI/src/features/settings/SettingsScreen.tsx'))).digest('hex') });
  console.log(JSON.stringify({ passed: true, networkRecords: events.length, branchPages: pages, branchChoices: expectedCodes.length }));
}
main().catch(error => { write('browser-run-error.log', safeText(error.stack || error.message)); console.error(safeText(error.message)); process.exitCode = 1; })
  .finally(async () => { await browser?.close(); await db?.end(); await writer?.end(); });
