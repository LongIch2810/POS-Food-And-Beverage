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
    await page.type('#login-username', fixture.users.cashierA);
    await page.type('#login-password', fixture.password);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(x => x.innerText.includes('Đăng nhập hệ thống'))?.click());
    await page.waitForFunction(() => document.body.innerText.includes('Ca thu ngân') && document.body.innerText.includes('Sơ đồ bàn'), { timeout: 15000 });
    await page.evaluate(() => [...document.querySelectorAll('button')].filter(x => x.innerText.includes('Sơ đồ bàn')).at(-1)?.click());
    await page.waitForFunction(() => document.body.innerText.includes('Bàn'), { timeout: 15000 });
    fs.writeFileSync(path.join(here, 'browser-s6-table-probe.json'), JSON.stringify({ at: new Date().toISOString(),
      text: await page.evaluate(() => document.body.innerText),
      buttons: await page.evaluate(() => [...document.querySelectorAll('button')].map(x => x.innerText)) }, null, 2));
    await page.screenshot({ path: path.join(here, 'browser-s6-table-probe.png') });
    console.log(JSON.stringify({ scenario: 'S6-02/07', status: 'table-probe', viewport: page.viewport() }));
  } finally { await browser.close(); }
})().catch(e => { console.error(JSON.stringify({ scenario: 'HARNESS', error: e.message })); process.exitCode = 1; });
