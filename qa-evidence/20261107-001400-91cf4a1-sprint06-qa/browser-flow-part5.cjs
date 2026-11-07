const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const puppeteer = require('../../POS_UI/node_modules/puppeteer-core');
const { Client } = require('../../POS_API/node_modules/pg');
const here = __dirname;
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixture.local.json'), 'utf8'));
assert.match(fixture.database, /^pos_pb07_browser_[a-f0-9]+$/);
assert.match(execFileSync('docker', ['ps', '--filter', 'name=^/pos_pb07_test_pg$', '--format', '{{.Names}} {{.Ports}}'], { encoding: 'utf8' }),
  /^pos_pb07_test_pg 127\.0\.0\.1:5433->5432\/tcp\s*$/);
const invoice = JSON.parse(fs.readFileSync(path.join(here, 'browser-s6-table-create-response.json'), 'utf8')).response.data;
const db = new Client({ connectionString: process.env.PB07_TEST_DB_BASE_URL + fixture.database });
const events = [];
const snap = async (page, name) => {
  fs.writeFileSync(path.join(here, name + '.json'), JSON.stringify({ at: new Date().toISOString(),
    url: page.url(), viewport: page.viewport(), text: await page.evaluate(() => document.body.innerText) }, null, 2));
  await page.screenshot({ path: path.join(here, name + '.png') });
};
const click = (page, text) => page.evaluate(t => {
  const matches = [...document.querySelectorAll('button')].filter(x => x.innerText.includes(t));
  const b = t === 'Sơ đồ bàn' ? matches.at(-1) : matches[0];
  if (!b) throw new Error('Button missing: ' + t);
  b.click();
}, text);
const login = async (page, role) => {
  await page.type('#login-username', fixture.users[role]);
  await page.type('#login-password', fixture.password);
  await click(page, 'Đăng nhập hệ thống');
  await page.waitForFunction(() => document.body.innerText.includes('Đăng xuất'), { timeout: 15000 });
};
(async () => {
  await db.connect();
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
    page.on('dialog', d => d.type() === 'prompt' ? d.accept('QA Sprint 6 browser') : d.accept());
    page.on('response', async r => { try { const u = new URL(r.url()); if (!u.pathname.startsWith('/api/v1/')) return;
      const e = { at: new Date().toISOString(), method: r.request().method(), path: u.pathname + u.search, status: r.status() };
      if (e.method !== 'GET' && !u.pathname.startsWith('/api/v1/auth/')) {
        e.request = r.request().postData(); e.response = await r.text();
      }
      events.push(e);
    } catch {} });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await login(page, 'cashierA');
    await page.waitForFunction(() => document.body.innerText.includes('Đơn đang mở') && document.body.innerText.includes('Ca thu ngân'), { timeout: 15000 });
    await click(page, 'Đơn đang mở');
    await page.waitForFunction(code => document.body.innerText.includes(code), { timeout: 15000 }, invoice.invoiceCode);
    await click(page, invoice.invoiceCode);
    await page.waitForFunction(() => document.body.innerText.includes('Tổng: 10.000đ'), { timeout: 15000 });
    await snap(page, 'browser-s6-before-cancel');
    const before = await db.query('SELECT id,status,table_id,subtotal,cancel_reason FROM invoices WHERE id=$1', [invoice.id]);
    fs.writeFileSync(path.join(here, 'browser-s6-db-before-cancel.json'), JSON.stringify({ query: 'SELECT id,status,table_id,subtotal,cancel_reason FROM invoices WHERE id=$1', rows: before.rows }, null, 2));
    const cancelled = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/cancel'), { timeout: 15000 });
    await click(page, 'Hủy đơn');
    const response = await cancelled;
    assert.equal(response.status(), 200);
    fs.writeFileSync(path.join(here, 'browser-s6-cancel-response.json'), JSON.stringify({ method: response.request().method(),
      path: new URL(response.url()).pathname, request: response.request().postData(), status: response.status(), response: await response.json() }, null, 2));
    await page.waitForFunction(() => !document.body.innerText.includes('Bàn B · OPEN'), { timeout: 15000 });
    await snap(page, 'browser-s6-after-cancel');
    const after = await db.query('SELECT id,status,table_id,subtotal,cancel_reason FROM invoices WHERE id=$1', [invoice.id]);
    fs.writeFileSync(path.join(here, 'browser-s6-db-after-cancel.json'), JSON.stringify({ query: 'SELECT id,status,table_id,subtotal,cancel_reason FROM invoices WHERE id=$1', rows: after.rows }, null, 2));
    assert.equal(after.rows[0].status, 'CANCELLED');
    await click(page, 'Sơ đồ bàn');
    await page.waitForFunction(() => document.body.innerText.includes('Bàn B') && document.body.innerText.includes('Trống'), { timeout: 15000 });
    await snap(page, 'browser-s6-table-after-cancel');
    const beforeLogout = await page.cookies();
    fs.writeFileSync(path.join(here, 'browser-s6-cookie-before-logout.json'), JSON.stringify(beforeLogout.map(c => ({ name: c.name, secure: c.secure, sameSite: c.sameSite })), null, 2));
    await click(page, 'Đăng xuất');
    await page.waitForFunction(() => document.body.innerText.includes('Đăng nhập tài khoản'), { timeout: 15000 });
    await snap(page, 'browser-s6-after-logout');
    const afterLogout = await page.cookies();
    fs.writeFileSync(path.join(here, 'browser-s6-cookie-after-logout.json'), JSON.stringify(afterLogout.map(c => ({ name: c.name, secure: c.secure, sameSite: c.sameSite })), null, 2));
    await login(page, 'cashierB');
    await page.waitForFunction(() => document.body.innerText.includes('Đơn đang mở') && document.body.innerText.includes('Thu ngân B'), { timeout: 15000 });
    await click(page, 'Đơn đang mở');
    await snap(page, 'browser-s6-cashier-b-open-list');
    fs.writeFileSync(path.join(here, 'browser-s6-network-part5.json'), JSON.stringify(events, null, 2));
    console.log(JSON.stringify({ scenario: 'S6-06/08', status: 'cancel-and-session-switch',
      invoiceCode: invoice.invoiceCode, requests: events.length }));
  } finally { await browser.close(); await db.end(); }
})().catch(e => { console.error(JSON.stringify({ scenario: 'HARNESS', error: e.message })); process.exitCode = 1; });
