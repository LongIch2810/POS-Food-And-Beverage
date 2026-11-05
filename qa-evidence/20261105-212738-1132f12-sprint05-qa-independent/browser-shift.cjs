const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const uiRequire = createRequire(path.resolve(__dirname, '../../POS_UI/package.json'));
const apiRequire = createRequire(path.resolve(__dirname, '../../POS_API/package.json'));
const puppeteer = uiRequire('puppeteer-core');
const { Client } = apiRequire('pg');
const out = __dirname;
const base = 'http://127.0.0.1:3000/api/v1';
const origin = 'http://localhost:5173';
const dbName = 'pos_sprint05_browser_20261105';
const dbUrl = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(dbUrl.hostname));
dbUrl.pathname = '/' + dbName;
const jar = () => ({ cookies: new Map(), get header() { return [...this.cookies].map(([k,v]) => `${k}=${v}`).join('; ') }, get csrf() { return this.cookies.get('__Host-pos_csrf') || '' } });
async function api(j, route, method='GET', body) {
  const r = await fetch(`${base}/${route}`, { method, headers: { Origin: origin, ...(j.header ? { Cookie: j.header } : {}), ...(j.csrf && method !== 'GET' ? { 'X-CSRF-Token': j.csrf } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  for (const c of r.headers.getSetCookie()) { const [k,v] = c.split(';')[0].split('='); if(v) j.cookies.set(k,v); else j.cookies.delete(k) }
  return { status:r.status, data:r.status===204 ? null : await r.json() };
}
async function click(page, label) {
  const ok = await page.evaluate(label => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes(label)); if(!b) return false; b.click(); return true }, label);
  assert.ok(ok, `button: ${label}`);
}
async function run() {
  const db = new Client({ connectionString: dbUrl.toString() }); await db.connect();
  let browser;
  try {
    const admin=jar(), owner=jar();
    let r=await api(admin,'auth/login','POST',{ username:process.env.BOOTSTRAP_ADMIN_USERNAME, password:process.env.BOOTSTRAP_ADMIN_PASSWORD }); assert.equal(r.status,200,'admin login');
    const suffix=crypto.randomBytes(4).toString('hex'); const username=`qa_${suffix}`; const cashier=`cash_${suffix}`;
    r=await api(admin,'platform/stores','POST',{ name:`QA Sprint05 ${suffix}`, owner:{username,fullName:'QA Owner'} }); assert.equal(r.status,201,'create store');
    const storeId=r.data.data.store.id;
    r=await api(owner,'auth/login','POST',{username,password:r.data.data.temporaryPassword}); assert.equal(r.status,200,'owner login');
    const ownerPassword='QaOwner!'+crypto.randomBytes(16).toString('hex');
    r=await api(owner,'auth/change-password','POST',{newPassword:ownerPassword}); assert.equal(r.status,204,'owner change password');
    r=await api(owner,'auth/login','POST',{username,password:ownerPassword}); assert.equal(r.status,200,'owner relogin');
    r=await api(owner,'branches','POST',{code:`B${suffix.slice(0,5)}`,name:'QA Branch',initialCash:100000}); assert.equal(r.status,201,'create branch');
    const branchId=r.data.data.id;
    r=await api(owner,'users','POST',{username:cashier,fullName:'QA Cashier',role:'CASHIER',branchId}); assert.equal(r.status,201,'create cashier');
    const cashierSession=jar(); const temporary=r.data.data.temporaryPassword;
    r=await api(cashierSession,'auth/login','POST',{username:cashier,password:temporary}); assert.equal(r.status,200,'cashier login');
    const cashierPassword='QaCashier!'+crypto.randomBytes(16).toString('hex');
    r=await api(cashierSession,'auth/change-password','POST',{newPassword:cashierPassword}); assert.equal(r.status,204,'cashier change password');
    const before=await db.query('SELECT status,shift_type FROM work_shifts WHERE branch_id=$1',[branchId]);
    fs.writeFileSync(path.join(out,'browser-db-before.json'),JSON.stringify({storeId,branchId,shifts:before.rows},null,2));
    browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
    const page=await browser.newPage(); await page.setViewport({width:1280,height:800});
    const network=[]; page.on('response', r=>{const u=new URL(r.url()); if(u.pathname.startsWith('/api/')) network.push({method:r.request().method(),path:u.pathname,status:r.status()})});
    await page.goto(origin,{waitUntil:'networkidle2'});
    await page.screenshot({path:path.join(out,'browser-login.png')});
    await page.type('input[placeholder="Nhập tên đăng nhập..."]',cashier);
    await page.type('input[placeholder="Nhập mật khẩu..."]',cashierPassword);
    await click(page,'Đăng nhập hệ thống');
    await page.waitForFunction(()=>!document.querySelector('input[placeholder="Nhập tên đăng nhập..."]'),{timeout:15000});
    await page.screenshot({path:path.join(out,'browser-after-login.png')});
    await click(page,'Mở ca thu ngân');
    await page.waitForFunction(()=>document.body.innerText.includes('Xác nhận mở ca thu ngân'),{timeout:15000});
    await page.screenshot({path:path.join(out,'browser-gate-before.png')});
    await click(page,'Xác nhận mở ca thu ngân');
    await page.waitForFunction(()=>document.body.innerText.includes('Đóng ca (Đếm mù)'),{timeout:15000});
    await page.screenshot({path:path.join(out,'browser-shift-open.png')});
    const opened=await db.query('SELECT status,shift_type FROM work_shifts WHERE branch_id=$1',[branchId]); assert.equal(opened.rows.filter(x=>x.status==='OPEN').length,1);
    await click(page,'Đóng ca (Đếm mù)');
    await page.screenshot({path:path.join(out,'browser-blind-before.png')});
    await click(page,'Nhập nhanh tổng tiền');
    const field=await page.$('input[placeholder="Ví dụ: 1000000"]');
    if(!field) throw Error('count field missing');
    await field.type('100000');
    await click(page,'Xác nhận đóng ca');
    await page.waitForFunction(()=>document.body.innerText.includes('Kết quả đối soát'),{timeout:15000});
    await page.screenshot({path:path.join(out,'browser-reconciliation.png')});
    const after=await db.query('SELECT s.status,s.shift_type,r.counted_cash,r.expected_cash,r.status AS reconciliation_status FROM work_shifts s JOIN cash_reconciliations r ON r.work_shift_id=s.id WHERE s.branch_id=$1',[branchId]);
    fs.writeFileSync(path.join(out,'browser-db-after.json'),JSON.stringify({storeId,branchId,shifts:after.rows},null,2));
    fs.writeFileSync(path.join(out,'browser-network.json'),JSON.stringify(network,null,2));
    assert.equal(after.rows[0].status,'CLOSED'); assert.equal(after.rows[0].reconciliation_status,'MATCHED');
    await click(page,'Hoàn tất & Đóng');
    await page.waitForFunction(()=>!document.body.innerText.includes('Kết quả đối soát ca thu ngân'),{timeout:15000});
    await page.screenshot({path:path.join(out,'browser-after-finish.png')});
    console.log('Browser shift open/close and DB reconciliation verified');
  } finally { if(browser) await browser.close(); await db.end() }
}
run().catch(e=>{console.error(e.stack);process.exitCode=1});
