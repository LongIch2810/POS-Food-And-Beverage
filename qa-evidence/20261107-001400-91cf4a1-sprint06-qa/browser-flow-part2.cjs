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
const created = JSON.parse(fs.readFileSync(path.join(here, 'browser-s6-create-response.json'), 'utf8')).response.data;
const db = new Client({ connectionString: process.env.PB07_TEST_DB_BASE_URL + fixture.database });
const events = [];
const snap = async (page, name) => {
  fs.writeFileSync(path.join(here, name + '.json'), JSON.stringify({ at: new Date().toISOString(),
    url: page.url(), viewport: page.viewport(), text: await page.evaluate(() => document.body.innerText) }, null, 2));
  await page.screenshot({ path: path.join(here, name + '.png') });
};
const click = (page, text) => page.evaluate(t => {
  const matches = [...document.querySelectorAll('button')].filter(x => x.innerText.includes(t));
  const button = t === 'Thực đơn' ? matches.at(-1) : matches[0];
  if (!button) throw new Error('Button missing: ' + t);
  button.click();
}, text);
(async () => {
  await db.connect();
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, args: ['--no-first-run'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
    page.on('response', async r => { try { const u = new URL(r.url()); if (!u.pathname.startsWith('/api/v1/')) return;
      const e = { at: new Date().toISOString(), method: r.request().method(), path: u.pathname + u.search, status: r.status() };
      if (e.method !== 'GET' && !u.pathname.startsWith('/api/v1/auth/')) {
        e.request = r.request().postData(); e.response = await r.text();
      }
      events.push(e);
    } catch {} });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await page.type('#login-username', fixture.users.cashierA);
    await page.type('#login-password', fixture.password);
    await click(page, 'Đăng nhập hệ thống');
    await page.waitForFunction(() => document.body.innerText.includes('Ca thu ngân') && document.body.innerText.includes('Đơn đang mở'), { timeout: 15000 });
    await click(page, 'Đơn đang mở');
    await page.waitForFunction(code => document.body.innerText.includes(code), { timeout: 15000 }, created.invoiceCode);
    await snap(page, 'browser-s6-open-list');
    await click(page, created.invoiceCode);
    await page.waitForFunction(code => document.body.innerText.includes(code) && document.body.innerText.includes('Tổng: 0đ'), { timeout: 15000 }, created.invoiceCode);
    await snap(page, 'browser-s6-open-detail-before-add');
    await click(page, 'Thực đơn');
    await click(page, 'Trà thử');
    await snap(page, 'browser-s6-add-modal');
    const before = (await db.query('SELECT subtotal,total_amount FROM invoices WHERE id=$1', [created.id])).rows;
    fs.writeFileSync(path.join(here, 'browser-s6-db-before-add.json'), JSON.stringify({ query: 'SELECT subtotal,total_amount FROM invoices WHERE id=$1', rows: before }, null, 2));
    const added = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/items'), { timeout: 15000 });
    await click(page, 'Thêm vào đơn');
    const response = await added;
    assert.equal(response.status(), 201);
    fs.writeFileSync(path.join(here, 'browser-s6-add-response.json'), JSON.stringify({ status: response.status(),
      method: response.request().method(), path: new URL(response.url()).pathname,
      request: response.request().postData(), response: await response.json() }, null, 2));
    await page.waitForFunction(() => document.body.innerText.includes('Tổng: 10.000đ'), { timeout: 15000 });
    await snap(page, 'browser-s6-after-add');
    const after = (await db.query('SELECT subtotal,total_amount FROM invoices WHERE id=$1', [created.id])).rows;
    fs.writeFileSync(path.join(here, 'browser-s6-db-after-add.json'), JSON.stringify({ query: 'SELECT subtotal,total_amount FROM invoices WHERE id=$1', rows: after }, null, 2));
    assert.equal(after[0].subtotal, '10000');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('Đơn đang mở'), { timeout: 15000 });
    await click(page, 'Đơn đang mở');
    await page.waitForFunction(code => document.body.innerText.includes(code), { timeout: 15000 }, created.invoiceCode);
    await snap(page, 'browser-s6-after-reload-list');
    await click(page, created.invoiceCode);
    await page.waitForFunction(() => document.body.innerText.includes('Tổng: 10.000đ'), { timeout: 15000 });
    await snap(page, 'browser-s6-after-reload-detail');
    fs.writeFileSync(path.join(here, 'browser-s6-network-part2.json'), JSON.stringify(events, null, 2));
    console.log(JSON.stringify({ scenario: 'S6-06', status: 'add-and-reload', invoiceCode: created.invoiceCode,
      requests: events.length }));
  } finally { await browser.close(); await db.end(); }
})().catch(e => { console.error(JSON.stringify({ scenario: 'HARNESS', error: e.message })); process.exitCode = 1; });
