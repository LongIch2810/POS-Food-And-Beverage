const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../../POS_UI/node_modules/puppeteer-core');
const here = __dirname;
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixture.local.json'), 'utf8'));
const events = [];
const snap = async (page, name) => {
  fs.writeFileSync(path.join(here, name + '.json'), JSON.stringify({ at: new Date().toISOString(),
    url: page.url(), viewport: page.viewport(), text: await page.evaluate(() => document.body.innerText) }, null, 2));
  await page.screenshot({ path: path.join(here, name + '.png') });
};
const click = (page, text) => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes(t));
  if (!b) throw new Error('Button missing: ' + t);
  b.click();
}, text);
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
    page.on('response', r => { try { const u = new URL(r.url()); if (u.pathname.startsWith('/api/v1/'))
      events.push({ at: new Date().toISOString(), method: r.request().method(), path: u.pathname + u.search, status: r.status() }); } catch {} });
    page.on('requestfailed', r => { try { const u = new URL(r.url()); if (u.pathname.startsWith('/api/v1/'))
      events.push({ at: new Date().toISOString(), method: r.method(), path: u.pathname + u.search, failure: r.failure()?.errorText }); } catch {} });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await page.type('#login-username', fixture.users.cashierB);
    await page.type('#login-password', fixture.password);
    await click(page, 'Đăng nhập hệ thống');
    await page.waitForFunction(() => document.body.innerText.includes('Đơn đang mở') && document.body.innerText.includes('Thu ngân B'), { timeout: 15000 });
    await click(page, 'Đơn đang mở');
    await snap(page, 'browser-s6-before-network-error');
    await page.setRequestInterception(true);
    let held = null;
    page.on('request', r => {
      const u = new URL(r.url());
      if (!held && r.method() === 'GET' && u.pathname === '/api/v1/invoices') {
        held = r;
        events.push({ at: new Date().toISOString(), method: r.method(), path: u.pathname + u.search, injected: 'delay-then-abort' });
      } else r.continue().catch(() => {});
    });
    await click(page, 'Tải lại đơn');
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.innerText.includes('Tải lại đơn') && b.disabled), { timeout: 15000 });
    assert.ok(held);
    await snap(page, 'browser-s6-reload-pending');
    await held.abort('failed');
    await page.waitForFunction(() => document.body.innerText.includes('Chưa xác nhận được kết quả.'), { timeout: 15000 });
    await snap(page, 'browser-s6-network-error');
    held = null;
    const nextInvoiceGet = page.waitForRequest(r => r.method() === 'GET' && new URL(r.url()).pathname === '/api/v1/invoices', { timeout: 15000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await nextInvoiceGet;
    await page.waitForFunction(() => document.body.innerText.includes('Đang tải dữ liệu...'), { timeout: 15000 });
    assert.ok(held);
    await snap(page, 'browser-s6-loading');
    await held.abort('failed');
    fs.writeFileSync(path.join(here, 'browser-s6-network-error-events.json'), JSON.stringify(events, null, 2));
    console.log(JSON.stringify({ scenario: 'S6-06', status: 'loading-and-error', requests: events.length,
      viewport: page.viewport() }));
  } finally { await browser.close(); }
})().catch(e => { console.error(JSON.stringify({ scenario: 'HARNESS', error: e.message })); process.exitCode = 1; });
