import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import puppeteer from 'puppeteer-core';

// Chạy: node --test test/stock-ledger-router.browser.mjs (cần Chrome/Chromium: CHROME_BIN hoặc đường dẫn mặc định).
// App, router, AuthContext, HTTP client và mọi màn là mã thật; chỉ window.fetch (biên mạng) được giả theo hợp đồng API.
let browser, server, origin, css, bundle;
const root = fileURLToPath(new URL('..', import.meta.url));
const evidenceDir = process.env.STOCK_LEDGER_EVIDENCE_DIR || fileURLToPath(new URL('../../.devloopflow/verify/20261115-sprint10-stock-ledger/evidence/st10/', import.meta.url));
const assetLoaders = { '.woff2': 'dataurl', '.woff': 'dataurl', '.ttf': 'dataurl', '.svg': 'dataurl', '.png': 'dataurl' };

before(async () => {
  const executablePath = process.env.CHROME_BIN || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].find(existsSync);
  assert.ok(executablePath, 'Set CHROME_BIN to run browser regression tests');
  mkdirSync(evidenceDir, { recursive: true });
  // CSS thật qua src/index.css (đúng thứ tự cascade của app, lỗi 20261114-css-cascade-input-min-height-44-beats-48)
  css = (await build({ entryPoints: [`${root}/src/index.css`], bundle: true, write: false, loader: assetLoaders })).outputFiles[0].text;
  bundle = (await build({
    stdin: { contents: `import React from 'react';
      import {createRoot} from 'react-dom/client';
      import App from './src/app/App';
      createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(App)));`,
    resolveDir: root, loader: 'jsx' },
    bundle: true, write: false, format: 'iife', loader: assetLoaders, define: { 'process.env.NODE_ENV': '"development"' },
  })).outputFiles[0].text;
  // Bundle/CSS phục vụ qua đường riêng vì bundle chứa chuỗi "</script>" không nhúng inline được.
  server = createServer((req, res) => {
    if (req.url === '/__bundle.js') return void res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }).end(bundle);
    if (req.url === '/__style.css') return void res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' }).end(css);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      .end('<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/__style.css"></head><body><div id="root"></div><script src="/__bundle.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await puppeteer.launch({ executablePath, headless: true });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve) ?? resolve()); });

const permissions = {
  owner: ['branch.read', 'branch.manage', 'branch.access_all', 'table.manage', 'user.manage', 'menu.read', 'menu.manage', 'shift.read', 'shift.open', 'shift.close', 'shift.force_close', 'pos.sell', 'invoice.cancel_open', 'invoice.read', 'table.read', 'inventory.view', 'inventory.manage', 'promotion.manage', 'store_bank_account.manage', 'transfer.confirm_manual', 'transfer.exception_read', 'shift.expense', 'invoice.cancel_paid', 'invoice.read_branch', 'report.view_all'],
  manager: ['branch.read', 'table.manage', 'menu.read', 'menu.manage', 'shift.read', 'shift.open', 'shift.close', 'shift.force_close', 'invoice.read', 'table.read', 'inventory.view', 'inventory.manage', 'promotion.manage', 'pos.sell', 'transfer.confirm_manual', 'transfer.exception_read', 'invoice.cancel_open', 'shift.expense', 'invoice.cancel_paid', 'invoice.read_branch', 'report.view_branch'],
  cashier: ['menu.read', 'shift.read', 'shift.open', 'shift.close', 'pos.sell', 'invoice.cancel_open', 'invoice.read', 'table.read', 'shift.expense', 'report.view_shift'],
};
const users = {
  owner: { id: 'owner-1', username: 'owner', fullName: 'Chủ A', role: 'OWNER', storeId: 's', branchId: null, branchName: null, permissions: permissions.owner, mustChangePassword: false },
  manager: { id: 'manager-1', username: 'manager', fullName: 'Quản lý B', role: 'MANAGER', storeId: 's', branchId: 'b1', branchName: 'Chi nhánh Bắc', permissions: permissions.manager, mustChangePassword: false },
  cashier: { id: 'cashier-1', username: 'cashier', fullName: 'Thu ngân C', role: 'CASHIER', storeId: 's', branchId: 'b1', branchName: 'Chi nhánh Bắc', permissions: permissions.cashier, mustChangePassword: false },
};

// Chạy trong trang trước mọi script của app; trạng thái giả nằm trong localStorage để sống qua reload.
// Màn Bán hàng (dữ liệu mô phỏng của app) có chi nhánh "Chi nhánh Nam Lý"; chỉ tên "Chi nhánh Nam" đứng riêng mới là dữ liệu Sổ kho của phiên trước.
const ledgerBranchLeak = /Chi nhánh Nam(?! Lý)/;

function installFakeApi(config) {
  const store = window.localStorage;
  if (!store.getItem('__qaInit')) { store.setItem('__qaInit', '1'); store.setItem('__qaUser', config.user); store.setItem('__qaData', config.data); store.setItem('__qaCalls', '[]'); store.setItem('__qaFail', ''); }
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const page = rows => json({ data: rows, meta: { limit: 100, nextCursor: null, total: rows.length } });
  const movement = (id, branchName, type, quantity, balanceAfter, invoiceCode, note, ingredientName = 'Sữa tươi') => ({
    id, branchId: branchName === 'Chi nhánh Bắc' ? 'b1' : 'b2', branchName, ingredientId: `i-${id}`, ingredientName, unit: 'ml', type, quantity, balanceAfter,
    invoiceId: invoiceCode ? `inv-${invoiceCode}` : null, invoiceCode, note, createdAt: '2026-11-15T03:00:00.000Z',
  });
  const rows = user => {
    if (config.data === 'big') {
      const long = 'Nguyên_liệu_rất_dài_'.repeat(4).slice(0, 60);
      return Array.from({ length: 40 }, (_, i) => movement(`m${i}`, 'Chi nhánh Trung tâm Thành phố Đồng Hới', i % 2 ? 'SALE' : 'IMPORT', i % 2 ? '-10.000' : '500.000', '1000.000', i % 2 ? `HDS10A${String(i).padStart(4, '0')}` : null, i % 2 ? null : 'Nhập hàng', long));
    }
    const all = [
      movement('m3', 'Chi nhánh Nam', 'SALE_REVERSAL', '10.000', '490.000', 'HDS10A0001', null),
      movement('m2', 'Chi nhánh Nam', 'SALE', '-10.000', '480.000', 'HDS10A0001', null),
      movement('m1', 'Chi nhánh Bắc', 'IMPORT', '500.000', '500.000', null, 'Nhập hàng đầu kỳ'),
    ];
    return user.role === 'OWNER' ? all : all.filter(row => row.branchName === user.branchName);
  };
  window.fetch = async (url, init = {}) => {
    const parsed = new URL(url, location.origin);
    const method = init.method || 'GET';
    const path = parsed.pathname;
    const key = store.getItem('__qaUser');
    const user = key ? config.users[key] : null;
    if (path.startsWith('/api/v1/') && method === 'GET') store.setItem('__qaCalls', JSON.stringify([...JSON.parse(store.getItem('__qaCalls')), path]));
    const unauthenticated = () => json({ error: { code: 'UNAUTHENTICATED', message: 'Chưa đăng nhập' } }, 401);
    if (path === '/api/v1/auth/me') return user ? json({ data: { user } }) : unauthenticated();
    if (path === '/api/v1/auth/csrf') return json({ data: {} });
    if (path === '/api/v1/auth/refresh') return unauthenticated();
    if (path === '/api/v1/auth/login') {
      const body = JSON.parse(init.body);
      store.setItem('__qaUser', body.username);
      return json({ data: { expiresIn: 1800, user: config.users[body.username] } });
    }
    if (path === '/api/v1/auth/logout') { store.removeItem('__qaUser'); return new Response(null, { status: 204 }); }
    if (!user) return unauthenticated();
    if (path === '/api/v1/stock-movements') {
      const fail = store.getItem('__qaFail');
      if (fail === 'network') throw new TypeError('Failed to fetch');
      if (fail === '500') return json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ test' } }, 500);
      return page(rows(user));
    }
    if (path === '/api/v1/branches') {
      const branch = (id, code, name) => ({ id, storeId: 's', code, name, address: null, phone: null, initialCash: 0, isActive: true, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' });
      return page([branch('b2', 'B2', 'Chi nhánh Nam'), branch('b1', 'B1', 'Chi nhánh Bắc')]);
    }
    if (path === '/api/v1/work-shifts/current') return json({ data: null });
    if (path === '/api/v1/store-bank-account') return json({ data: { bankBin: '970436', accountNumber: '0123456789', accountName: 'CHU A' } });
    return page([]);
  };
}

async function open(userName, path, { data = 'small', viewport = { width: 1024, height: 768 } } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console.error: ${message.text()}`); });
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(installFakeApi, { users, user: userName, data });
  await page.goto(`${origin}${path}`);
  return { page, context, errors };
}
const close = async ({ context, errors }) => { await context.close(); assert.deepEqual(errors, [], 'trang không được phát sinh lỗi JS/console'); };
const pathname = page => page.evaluate(() => location.pathname);
const waitPath = (page, expected) => page.waitForFunction(path => location.pathname === path, { timeout: 10000 }, expected)
  .catch(async () => { throw new Error(`pathname mong đợi ${expected}, thực tế ${await pathname(page)}`); });
const clickText = (page, selector, text) => page.evaluate((selector, text) => {
  const el = [...document.querySelectorAll(selector)].find(item => item.textContent.trim() === text);
  if (!el) throw new Error(`không có ${selector} "${text}"`);
  el.click();
}, selector, text);
const activeTexts = page => page.evaluate(() => ({
  rail: document.querySelector('.rail-btn[aria-current="page"]')?.textContent.trim() ?? null,
  tab: document.querySelector('button.tab[aria-current="true"]')?.textContent.trim() ?? null,
}));
const waitLedger = page => page.waitForSelector('table.table tbody tr');
const calls = page => page.evaluate(() => JSON.parse(localStorage.getItem('__qaCalls')));
const readTable = page => page.evaluate(() => {
  const headers = [...document.querySelectorAll('table.table thead th')].map(th => th.textContent.trim());
  const rows = [...document.querySelectorAll('table.table tbody tr')].map(tr => Object.fromEntries([...tr.children].map((td, i) => [headers[i], td.textContent.trim()])));
  return { headers, rows };
});

test('BR-1 owner so kho reload giu man (ST-10.AC-1)', async () => {
  const session = await open('owner', '/kho/so-kho');
  const { page } = session;
  try {
    await waitLedger(page);
    assert.deepEqual(await activeTexts(page), { rail: 'Kho hàng', tab: 'Sổ kho' });
    const { headers, rows } = await readTable(page);
    assert.ok(headers.includes('Chi nhánh'), `header bảng: ${headers}`);
    assert.equal(rows.find(row => row['Loại'] === 'Xuất bán')['Ghi chú'], 'HDS10A0001');
    assert.equal(rows.find(row => row['Loại'] === 'Hoàn trả kho')['Thay đổi'], '+10.000 ml');
    const paths = await calls(page);
    assert.ok(paths.includes('/api/v1/stock-movements'), 'gọi stock-movements');
    for (const forbidden of ['/api/v1/ingredient-stocks', '/api/v1/ingredients']) assert.ok(!paths.includes(forbidden), `không gọi ${forbidden}: ${paths}`);
    await page.screenshot({ path: `${evidenceDir}/br1-owner-so-kho.png` });

    await page.reload();
    await waitLedger(page);
    assert.equal(await pathname(page), '/kho/so-kho');
    assert.deepEqual(await activeTexts(page), { rail: 'Kho hàng', tab: 'Sổ kho' });
  } finally { await close(session); }
});

test('BR-2 doi tab con va back (ST-10.AC-2)', async () => {
  const session = await open('owner', '/kho/so-kho');
  const { page } = session;
  try {
    await waitLedger(page);
    await clickText(page, 'button.tab', 'Tồn kho');
    await waitPath(page, '/kho/ton-kho');
    assert.equal((await activeTexts(page)).tab, 'Tồn kho');
    await page.goBack();
    await waitPath(page, '/kho/so-kho');
    await waitLedger(page);
    assert.deepEqual(await activeTexts(page), { rail: 'Kho hàng', tab: 'Sổ kho' });
  } finally { await close(session); }
});

test('BR-3 cham 48 va khong cuon ngang (ST-10.AC-3)', async () => {
  const session = await open('owner', '/kho/so-kho', { data: 'big' });
  const { page } = session;
  try {
    await waitLedger(page);
    assert.equal((await readTable(page)).rows.length, 40);
    const m = await page.evaluate(() => {
      const height = el => el.getBoundingClientRect().height;
      return {
        scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
        // vùng cuộn của màn (main > div) cũng không được tràn ngang; bảng rộng chỉ cuộn trong .table-wrap
        mainScrollWidth: document.querySelector('main > div').scrollWidth, mainClientWidth: document.querySelector('main > div').clientWidth,
        tabs: [...document.querySelectorAll('button.tab')].map(el => ({ name: el.textContent.trim(), height: height(el) })),
        select: height(document.querySelector('select[aria-label="Chi nhánh kho"]')),
        reload: height([...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Tải lại')),
      };
    });
    await page.screenshot({ path: `${evidenceDir}/br3-1024x768-40-dong.png` });
    assert.ok(m.scrollWidth <= m.innerWidth, `tràn ngang ${m.scrollWidth} > ${m.innerWidth}`);
    assert.ok(m.mainScrollWidth <= m.mainClientWidth, `vùng nội dung tràn ngang ${m.mainScrollWidth} > ${m.mainClientWidth}`);
    assert.equal(m.tabs.length, 3);
    for (const tab of m.tabs) assert.ok(tab.height >= 48, `tab "${tab.name}" cao ${tab.height}px, cần >=48`);
    assert.ok(m.select >= 48, `ô Chi nhánh kho cao ${m.select}px, cần >=48`);
    assert.ok(m.reload >= 48, `nút Tải lại cao ${m.reload}px, cần >=48`);

    await page.evaluate(() => localStorage.setItem('__qaFail', '500'));
    await clickText(page, 'button', 'Tải lại');
    await page.waitForSelector('[role="alert"] button');
    const retry = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      const button = [...alert.querySelectorAll('button')].find(el => el.textContent.trim() === 'Thử lại');
      return { text: alert.textContent.trim(), height: button.getBoundingClientRect().height };
    });
    await page.screenshot({ path: `${evidenceDir}/br3-1024x768-loi-500.png` });
    assert.equal(retry.text, 'Lỗi máy chủ test' + 'Thử lại');
    assert.ok(retry.height >= 48, `nút Thử lại cao ${retry.height}px, cần >=48`);
  } finally { await close(session); }
});

test('BR-4 mat mang cau doc (ST-10.AC-4)', async () => {
  const session = await open('owner', '/kho/so-kho');
  const { page } = session;
  try {
    await page.evaluate(() => localStorage.setItem('__qaFail', 'network'));
    await page.reload();
    await page.waitForSelector('[role="alert"]');
    const alerts = await page.evaluate(() => [...document.querySelectorAll('[role="alert"]')].map(el => el.textContent.trim().replace(/Thử lại$/, '')));
    assert.deepEqual(alerts, ['Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.']);
  } finally { await close(session); }
});

async function loginAs(page, username) {
  await page.waitForSelector('#login-username');
  await page.type('#login-username', username);
  await page.type('#login-password', 'mat-khau-test');
  await page.click('button[type="submit"]');
}

// Cả hai ca: A đi qua Sổ kho rồi đăng xuất; B đăng nhập cùng tab và bấm Back tới mục lịch sử của A.
async function backAfterSwitch(second, secondFirstPath) {
  const session = await open('owner', '/kho/so-kho');
  const { page } = session;
  try {
    await page.emulateCPUThrottling(4);
    await waitLedger(page);
    await clickText(page, 'button.tab', 'Tồn kho');
    await page.waitForFunction(() => location.pathname === '/kho/ton-kho'
      && document.querySelector('button.tab[aria-current="true"]')?.textContent.trim() === 'Tồn kho',
    { timeout: 10000 });
    await clickText(page, 'button.tab', 'Sổ kho');
    await waitPath(page, '/kho/so-kho');
    await waitLedger(page);
    await clickText(page, 'button', 'Đăng xuất');
    await waitPath(page, '/dang-nhap');
    await loginAs(page, second);
    await waitPath(page, secondFirstPath);
    await page.waitForSelector('.rail-btn[aria-current="page"]');
    await page.goBack();
    // Back về mục của A phải bị thay bằng tab đầu của B, gồm cả nội dung màn đã render.
    await page.waitForFunction((path, rail, second) => location.pathname === path
      && document.querySelector('.rail-btn[aria-current="page"]')?.textContent.trim() === rail
      && (second === 'cashier'
        ? [...document.querySelectorAll('h1, h2')].some(heading => heading.textContent.trim() === 'Mở ca thu ngân')
        : document.querySelector('button[role="tab"][aria-selected="true"]')?.textContent.trim() === 'Bàn'),
    { timeout: 10000 }, secondFirstPath, second === 'cashier' ? 'Bán hàng' : 'Cài đặt', second);
    return { page, session, text: await page.evaluate(() => document.body.innerText) };
  } catch (error) { await close(session).catch(() => {}); throw error; }
}

test('BR-5 back sau doi phien (ST-10.AC-5, RF-1)', async () => {
  const { page, session, text } = await backAfterSwitch('cashier', '/ban-hang/thuc-don');
  try {
    assert.equal(await pathname(page), '/ban-hang/thuc-don');
    assert.ok(!text.includes('HDS10A0001'), 'lộ mã hóa đơn của phiên trước');
    assert.ok(!ledgerBranchLeak.test(text), 'lộ chi nhánh của phiên trước');
  } finally { await close(session); }
});

// RF-1 chặt hơn plan: MANAGER có quyền xem Sổ kho nên chỉ guard state.owner mới chặn được màn của A.
test('BR-5b back sau doi phien sang manager co quyen kho (RF-1)', async () => {
  const { page, session, text } = await backAfterSwitch('manager', '/cai-dat/ban');
  try {
    assert.equal(await pathname(page), '/cai-dat/ban');
    assert.ok(!text.includes('HDS10A0001'), 'lộ mã hóa đơn của phiên trước');
    assert.ok(!ledgerBranchLeak.test(text), 'lộ chi nhánh của phiên trước');
  } finally { await close(session); }
});

test('BR-6 manager tieu de va khong cot chi nhanh (ST-10.AC-6)', async () => {
  const session = await open('manager', '/kho/so-kho');
  const { page } = session;
  try {
    await waitLedger(page);
    const m = await page.evaluate(() => ({
      header: document.querySelector('header').textContent,
      headers: [...document.querySelectorAll('table.table thead th')].map(th => th.textContent.trim()),
      select: !!document.querySelector('select[aria-label="Chi nhánh kho"]'),
    }));
    await page.screenshot({ path: `${evidenceDir}/br6-manager.png` });
    assert.ok(m.header.includes('Chi nhánh Bắc'), m.header);
    assert.ok(!m.header.includes('Tất cả chi nhánh'), m.header);
    assert.ok(!m.headers.includes('Chi nhánh'), `header bảng: ${m.headers}`);
    assert.equal(m.select, false);
  } finally { await close(session); }
});

test('BR-7 dia chi la va reload tab con (ST-10.AC-7)', async () => {
  const session = await open('owner', '/kho/abc');
  const { page } = session;
  try {
    await page.emulateCPUThrottling(4);
    await waitPath(page, '/cai-dat/chi-nhanh');
    for (const [path, rail, tab] of [['/thuc-don/kich-co', 'Thực đơn', 'Kích cỡ món (0)'], ['/cai-dat/khuyen-mai', 'Cài đặt', 'Khuyến mãi']]) {
      await page.goto(`${origin}${path}`);
      await waitPath(page, path);
      await page.reload();
      await page.waitForFunction((path, rail, tab) => location.pathname === path
        && document.querySelector('.rail-btn[aria-current="page"]')?.textContent.trim() === rail
        && (path === '/cai-dat/khuyen-mai'
          ? [...document.querySelectorAll('h1, h2')].some(heading => heading.textContent.trim() === 'Mã giảm giá')
          : [...document.querySelectorAll('button[aria-current="true"]')].some(button => button.textContent.trim() === tab)),
      { timeout: 10000 }, path, rail, tab);
      assert.equal(await pathname(page), path);
    }
  } finally { await close(session); }
});

test('[V1-2/B-66] Products Back đóng dialog Danh mục và Forward không mở lại', async () => {
  const session = await open('owner', '/thuc-don/kich-co');
  const { page } = session;
  try {
    await page.waitForFunction(() => document.querySelector('button[aria-current="true"]')?.textContent.includes('Kích cỡ món'));
    await clickText(page, 'button', 'Danh mục món (0)');
    await page.waitForFunction(() => location.pathname === '/thuc-don/danh-muc'
      && document.querySelector('button[aria-current="true"]')?.textContent.includes('Danh mục món'));
    await clickText(page, 'button', 'Thêm danh mục');
    await page.waitForSelector('[role="dialog"]');
    await page.goBack();
    await page.waitForFunction(() => location.pathname === '/thuc-don/kich-co'
      && document.querySelector('button[aria-current="true"]')?.textContent.includes('Kích cỡ món')
      && !document.querySelector('[role="dialog"]'));
    await page.screenshot({ path: `${evidenceDir}/b66-dialog-after-back.png` });
    assert.equal(await page.$('[role="dialog"]'), null);
    await page.goForward();
    await page.waitForFunction(() => location.pathname === '/thuc-don/danh-muc'
      && document.querySelector('button[aria-current="true"]')?.textContent.includes('Danh mục món'));
    assert.equal(await page.$('[role="dialog"]'), null, 'Forward không mở lại dialog cũ');
  } finally { await close(session); }
});
