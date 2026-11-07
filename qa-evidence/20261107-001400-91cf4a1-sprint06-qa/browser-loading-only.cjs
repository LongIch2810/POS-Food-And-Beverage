const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../../POS_UI/node_modules/puppeteer-core');
const here = __dirname;
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixture.local.json'), 'utf8'));
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await page.setRequestInterception(true);
    let held = null;
    const events = [];
    page.on('request', r => {
      const u = new URL(r.url());
      if (!held && r.method() === 'GET' && u.pathname === '/api/v1/invoices') {
        held = r;
        events.push({ at: new Date().toISOString(), method: 'GET', path: u.pathname + u.search, injected: 'delay' });
      } else r.continue().catch(() => {});
    });
    await page.type('#login-username', fixture.users.cashierA);
    await page.type('#login-password', fixture.password);
    const target = page.waitForRequest(r => r.method() === 'GET' && new URL(r.url()).pathname === '/api/v1/invoices', { timeout: 15000 });
    await page.evaluate(() => [...document.querySelectorAll('button')].find(x => x.innerText.includes('Đăng nhập hệ thống'))?.click());
    await target;
    assert.ok(held);
    const state = { at: new Date().toISOString(), url: page.url(), viewport: page.viewport(),
      text: await page.evaluate(() => document.body.innerText), heldRequest: events[0] };
    fs.writeFileSync(path.join(here, 'browser-s6-initial-loading.json'), JSON.stringify(state, null, 2));
    await page.screenshot({ path: path.join(here, 'browser-s6-initial-loading.png') });
    await held.abort('failed');
    fs.writeFileSync(path.join(here, 'browser-s6-initial-loading-network.json'), JSON.stringify(events, null, 2));
    console.log(JSON.stringify({ scenario: 'S6-06', status: 'initial-loading-captured',
      visibleText: state.text.includes('Đang tải dữ liệu...') || state.text.includes('Đang tải ca hiện tại...') }));
  } finally { await browser.close(); }
})().catch(e => { console.error(JSON.stringify({ scenario: 'HARNESS', error: e.message })); process.exitCode = 1; });
