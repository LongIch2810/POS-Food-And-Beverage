const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../../POS_UI/node_modules/puppeteer-core');
const here = __dirname;
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixture.local.json'), 'utf8'));
const events = [];
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, args: ['--no-first-run'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
    page.on('response', r => { try { const u = new URL(r.url()); if (u.pathname.startsWith('/api/v1/'))
      events.push({ at: new Date().toISOString(), method: r.request().method(), path: u.pathname + u.search, status: r.status() }); } catch {} });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    fs.writeFileSync(path.join(here, 'browser-before-login-retry.txt'), await page.evaluate(() => document.body.innerText));
    await page.screenshot({ path: path.join(here, 'browser-before-login-retry.png') });
    await page.type('#login-username', fixture.users.cashierA);
    await page.type('#login-password', fixture.password);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(x => x.innerText.includes('Đăng nhập hệ thống'))?.click());
    await page.waitForFunction(() => document.body.innerText.includes('Đăng xuất'), { timeout: 15000 });
    await page.waitForFunction(() => !document.body.innerText.includes('Đang tải ca hiện tại...'), { timeout: 15000 });
    fs.writeFileSync(path.join(here, 'browser-after-login-settled.txt'), await page.evaluate(() => document.body.innerText));
    await page.screenshot({ path: path.join(here, 'browser-after-login-settled.png') });
    fs.writeFileSync(path.join(here, 'browser-probe-network-settled.json'), JSON.stringify(events, null, 2));
    console.log(JSON.stringify({ status: 'login-complete', url: page.url(), viewport: { width: 1024, height: 768 },
      textLength: (await page.evaluate(() => document.body.innerText)).length, requests: events.length }));
  } finally { await browser.close(); }
})().catch(e => { console.error(JSON.stringify({ status: 'harness-error', message: e.message })); process.exitCode = 1; });
