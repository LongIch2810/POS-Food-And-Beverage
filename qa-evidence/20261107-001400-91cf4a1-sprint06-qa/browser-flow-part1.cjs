const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const puppeteer = require('../../POS_UI/node_modules/puppeteer-core');
const { Client } = require('../../POS_API/node_modules/pg');
const here = __dirname;
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixture.local.json'), 'utf8'));
assert.match(fixture.database, /^pos_pb07_browser_[a-f0-9]+$/);
const rows = execFileSync('docker', ['ps', '--filter', 'name=^/pos_pb07_test_pg$', '--format', '{{.Names}} {{.Ports}}'], { encoding: 'utf8' });
assert.match(rows, /^pos_pb07_test_pg 127\.0\.0\.1:5433->5432\/tcp\s*$/);
const db = new Client({ connectionString: process.env.PB07_TEST_DB_BASE_URL + fixture.database });
const events = [];
const shot = async (page, label) => {
  const data = { at: new Date().toISOString(), url: page.url(), viewport: page.viewport(),
    text: await page.evaluate(() => document.body.innerText) };
  fs.writeFileSync(path.join(here, label + '.json'), JSON.stringify(data, null, 2));
  await page.screenshot({ path: path.join(here, label + '.png') });
};
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
        e.request = r.request().postData();
        e.response = await r.text();
      }
      events.push(e);
    } catch {} });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await shot(page, 'browser-s6-before-login');
    await page.type('#login-username', fixture.users.cashierA);
    await page.type('#login-password', fixture.password);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(x => x.innerText.includes('Đăng nhập hệ thống'))?.click());
    await page.waitForFunction(() => document.body.innerText.includes('Ca thu ngân') && document.body.innerText.includes('Tạo đơn mang đi'), { timeout: 15000 });
    await shot(page, 'browser-s6-after-login');
    const before = (await db.query('SELECT count(*)::int AS count FROM invoices WHERE branch_id=$1', [fixture.ids.branchA])).rows;
    fs.writeFileSync(path.join(here, 'browser-s6-db-before-create.json'), JSON.stringify({ query: 'SELECT count(*) FROM invoices WHERE branch_id=$1', rows: before }, null, 2));
    const created = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/invoices', { timeout: 15000 });
    await page.evaluate(() => [...document.querySelectorAll('button')].find(x => x.innerText.includes('Tạo đơn mang đi'))?.click());
    const response = await created;
    const body = await response.json();
    assert.equal(response.status(), 201);
    fs.writeFileSync(path.join(here, 'browser-s6-create-response.json'), JSON.stringify({ status: response.status(),
      method: response.request().method(), path: new URL(response.url()).pathname, request: response.request().postData(), response: body }, null, 2));
    await page.waitForFunction(id => document.body.innerText.includes(id), { timeout: 15000 }, body.data.invoiceCode);
    await shot(page, 'browser-s6-takeaway-created');
    const after = (await db.query('SELECT id,invoice_code,order_type,status,table_id,subtotal FROM invoices WHERE id=$1', [body.data.id])).rows;
    fs.writeFileSync(path.join(here, 'browser-s6-db-after-create.json'), JSON.stringify({ query: 'SELECT id,invoice_code,order_type,status,table_id,subtotal FROM invoices WHERE id=$1', rows: after }, null, 2));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(x => x.innerText.includes('Trà thử'))?.click());
    await shot(page, 'browser-s6-item-modal');
    fs.writeFileSync(path.join(here, 'browser-s6-network.json'), JSON.stringify(events, null, 2));
    console.log(JSON.stringify({ scenario: 'S6-06', status: 'takeaway-created-and-item-modal', invoiceCode: body.data.invoiceCode,
      requestCount: events.length, viewport: page.viewport() }));
  } finally { await browser.close(); await db.end(); }
})().catch(e => { console.error(JSON.stringify({ scenario: 'HARNESS', error: e.message })); process.exitCode = 1; });
