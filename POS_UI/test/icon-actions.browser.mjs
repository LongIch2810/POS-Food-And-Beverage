import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('..', import.meta.url));
const css = ['index.css', 'styles/ui.css', 'styles/pos.css', 'styles/components.css'].map(file => readFileSync(`${root}/src/${file}`, 'utf8').replace(/@import[^;]+;/g, '')).join('\n');
let browser, bundle;
before(async () => {
  const executablePath = process.env.CHROME_BIN || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
  assert.ok(executablePath, 'Set CHROME_BIN to run browser regression tests');
  browser = await puppeteer.launch({ executablePath, headless: true });
  if (!existsSync(`${root}/src/components/ui/IconButton.tsx`)) return;
  const result = await build({ stdin: { contents: `import React from 'react';
    import {createRoot} from 'react-dom/client';
    import {Edit2} from 'lucide-react';
    import {IconButton} from './src/components/ui/IconButton';
    import {Dialog} from './src/components/ui/Dialog';
    import {Button} from './src/components/ui/Button';
    let root = createRoot(document.getElementById('root'));
    window.count = 0; window.parentCount = 0;
    document.addEventListener('keydown', e => {if(e.key === 'Escape') window.parentCount++});
    window.dialogCount = 0;
    window.mount = (options = {}) => { const content = React.createElement('div', {id:'container', style:options.container},
      React.createElement(IconButton, {label:options.label || 'Sửa thông tin', icon:React.createElement(Edit2), disabled:options.disabled,
        onClick:() => window.count++, onDoubleClick:() => window.count += 100}));
      root.render(options.dialog ? React.createElement(Dialog, {isOpen:true, title:'Kiểm tra', onClose:() => window.dialogCount++}, content) : content); };
    window.mountTraversal = () => root.render(React.createElement('div', null,
      ...['Trước','Không khả dụng','Sau'].map((label, i) => React.createElement(IconButton, {key:label, label, icon:React.createElement(Edit2), disabled:i===1, onClick:() => window.count++}))));
    window.mountButtons = () => root.render(React.createElement('div', null,
      React.createElement(Button, {onClick:() => window.count++}, 'Lưu'),
      React.createElement(Button, {disabledReason:'Không có quyền', onClick:() => window.count++}, 'Xóa')));
    window.unmount = () => root.unmount();`, resolveDir: root, loader: 'jsx' }, bundle: true, write: false, format: 'iife' });
  bundle = result.outputFiles[0].text;
});
after(async () => { await browser?.close(); });
async function open(options = {}, viewport = { width: 1024, height: 768 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.setContent('<div id="root"></div>');
  await page.addStyleTag({ content: css });
  if (bundle) { await page.addScriptTag({ content: bundle }); await page.evaluate(options => window.mount(options), options); }
  return page;
}

test('[ICON-NAME-SIZE] button exposes its name, size and linked tooltip', async () => {
  for (const viewport of [{width:1024,height:768},{width:768,height:1024}]) {
    const page = await open({}, viewport);
    try {
      const button = await page.$('button[aria-label="Sửa thông tin"]');
      assert.ok(button, 'Named icon button must be present');
      const box = await button.boundingBox();
      assert.ok(box.width >= 48 && box.height >= 48, `${box.width}×${box.height}`);
      const svg = await button.$eval('svg', e => ({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height, hidden:e.getAttribute('aria-hidden')}));
      assert.deepEqual(svg, {width:20,height:20,hidden:'true'});
      assert.equal(await button.evaluate(e => e.hasAttribute('title')), false);
      await button.hover();
      await page.waitForSelector('[role=tooltip]');
      assert.equal(await button.evaluate(e => e.getAttribute('aria-describedby')), await page.$eval('[role=tooltip]', e => e.id));
      assert.equal(await page.$eval('[role=tooltip]', e => e.textContent), 'Sửa thông tin');
    } finally { await page.close(); }
  }
});

test('[ICON-PORTAL-BOUNDS] tooltip stays inside all viewport edges without changing layout', async () => {
  const label = 'Chú thích tiếng Việt '.repeat(12);
  for (const [top, left] of [[0,0],[0,976],[720,0],[720,976]]) {
    const page = await open({label, container:{position:'fixed',top,left,width:48,height:48,overflow:'hidden'}});
    try {
      const button = await page.$('button');
      const before = await page.$eval('#container', e => e.getBoundingClientRect().toJSON());
      await button.hover();
      await page.waitForSelector('[role=tooltip]');
      const box = await page.$eval('[role=tooltip]', e => e.getBoundingClientRect().toJSON());
      assert.ok(box.left >= 8 && box.top >= 8 && box.right <= 1016 && box.bottom <= 760, JSON.stringify(box));
      assert.ok(box.width <= 240);
      assert.deepEqual(await page.$eval('#container', e => e.getBoundingClientRect().toJSON()), before);
    } finally { await page.close(); }
  }
});

test('[ICON-INPUT-MODES] click, keyboard and touch activate once, long press and disabled never activate', async () => {
  const page = await open();
  try {
    const button = await page.$('button');
    await button.click();
    await button.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => window.count), 3);
    const box = await button.boundingBox();
    const touch = await page.createCDPSession();
    await touch.send('Emulation.setTouchEmulationEnabled', {enabled:true});
    const points = [{x:box.x + 24, y:box.y + 24}];
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:points});
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    assert.equal(await page.evaluate(() => window.count), 4);
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:points});
    await page.waitForSelector('[role=tooltip]');
    await new Promise(resolve => setTimeout(resolve, 550));
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    assert.equal(await page.evaluate(() => window.count), 4);
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:points});
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    assert.equal(await page.evaluate(() => window.count), 5);
    await page.evaluate(() => window.mount({disabled:true}));
    await page.waitForSelector('button:disabled');
    await page.focus('[role=group]');
    await page.waitForSelector('[role=tooltip]');
    assert.equal(await page.evaluate(() => window.count), 5);
  } finally { await page.close(); }
});

test('[R1-1] canceled touch preserves the next keyboard or mouse action', async () => {
  for (const action of ['Enter', 'Space', 'mouse']) {
    const page = await open();
    try {
      const button = await page.$('button');
      await button.focus();
      const box = await button.boundingBox();
      const touch = await page.createCDPSession();
      await touch.send('Emulation.setTouchEmulationEnabled', {enabled:true});
      await touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:box.x + 24, y:box.y + 24}]});
      await touch.send('Input.dispatchTouchEvent', {type:'touchCancel', touchPoints:[]});
      assert.equal(await page.evaluate(() => window.count), 0, `${action}: cancel`);
      if (action === 'mouse') await button.click();
      else await page.keyboard.press(action);
      assert.equal(await page.evaluate(() => window.count), 1, `${action}: first action`);
    } finally { await page.close(); }
  }
});

test('[R1-2] Tab traverses enabled and disabled icon controls once in display order', async () => {
  const page = await open();
  try {
    await page.evaluate(() => window.mountTraversal());
    await page.waitForSelector('button[aria-label="Sau"]');
    const inspect = async (name, role) => {
      const active = await page.evaluate(() => ({name:document.activeElement.getAttribute('aria-label'), role:document.activeElement.getAttribute('role'), description:document.getElementById(document.activeElement.getAttribute('aria-describedby'))?.textContent}));
      assert.deepEqual(active, {name, role, description:name});
    };
    await page.keyboard.press('Tab'); await inspect('Trước', null);
    await page.keyboard.press('Tab'); await inspect('Không khả dụng', 'group');
    await page.keyboard.press('Enter'); await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => window.count), 0);
    await page.keyboard.press('Tab'); await inspect('Sau', null);
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await inspect('Không khả dụng', 'group');
    await page.keyboard.press('Tab'); await inspect('Trước', null); await page.keyboard.up('Shift');
  } finally { await page.close(); }
});

test('[R1-3] default Button and disabledReason retain their behavior', async () => {
  const page = await open();
  try {
    await page.evaluate(() => window.mountButtons());
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Xóa'));
    const buttons = await page.$$('button');
    assert.equal(await buttons[0].evaluate(b => b.textContent), 'Lưu');
    assert.equal(await buttons[0].evaluate(b => b.disabled), false);
    await buttons[0].click();
    assert.equal(await page.evaluate(() => window.count), 1);
    assert.equal(await buttons[1].evaluate(b => b.textContent), 'Xóa');
    assert.equal(await buttons[1].evaluate(b => b.disabled), true);
    assert.equal(await buttons[1].evaluate(b => b.title), 'Không có quyền');
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('div')].some(e => e.textContent === 'Không có quyền' && e.getBoundingClientRect().height > 0)), true);
    await buttons[1].click();
    assert.equal(await page.evaluate(() => window.count), 1);
  } finally { await page.close(); }
});

test('[ICON-ESC-PARENT] Escape closes tooltip before parent receives next Escape', async () => {
  const page = await open({dialog:true});
  try {
    await page.waitForSelector('[role=dialog] button[aria-label="Sửa thông tin"]');
    await page.waitForFunction(() => document.activeElement === document.querySelector('[role=dialog] button'));
    await page.focus('button[aria-label="Sửa thông tin"]');
    await page.waitForSelector('[role=tooltip]');
    await page.keyboard.press('Escape');
    assert.equal(await page.$('[role=tooltip]'), null);
    assert.equal(await page.evaluate(() => window.parentCount), 0);
    assert.equal(await page.evaluate(() => window.dialogCount), 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => window.parentCount), 1);
    assert.equal(await page.evaluate(() => window.dialogCount), 1);
  } finally { await page.close(); }
});

test('[ICON-POINTER-CANCEL] cancel, movement, scroll and unmount prevent a pending hold', async () => {
  for (const action of ['cancel', 'move', 'scroll', 'unmount']) {
    const page = await open();
    try {
      await page.evaluate(action => {
        const button = document.querySelector('button');
        const event = (type, x = 20) => new PointerEvent(type, {bubbles:true,pointerType:'touch',clientX:x,clientY:20});
        button.dispatchEvent(event('pointerdown'));
        if (action === 'cancel') button.dispatchEvent(event('pointercancel'));
        if (action === 'move') button.dispatchEvent(event('pointermove', 29));
        if (action === 'scroll') window.dispatchEvent(new Event('scroll'));
        if (action === 'unmount') window.unmount();
      }, action);
      await new Promise(resolve => setTimeout(resolve, 550));
      assert.equal(await page.$('[role=tooltip]'), null, action);
      assert.equal(await page.evaluate(() => window.count), 0, action);
    } finally { await page.close(); }
  }
});

test('[ICON-INPUT-DISABLED-HOLD] disabled control shows tooltip on touch hold without activating', async () => {
  const page = await open({disabled:true});
  try {
    const button = await page.$('button');
    const box = await button.boundingBox();
    const touch = await page.createCDPSession();
    await touch.send('Emulation.setTouchEmulationEnabled', {enabled:true});
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:box.x + 24,y:box.y + 24}]});
    await page.waitForSelector('[role=tooltip]', {timeout:1500});
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    assert.equal(await page.evaluate(() => window.count), 0);
  } finally { await page.close(); }
});

test('[ICON-HOLD-TIMING] touch hold opens after 500ms from closed', async () => {
  const page = await open();
  try {
    const box = await (await page.$('button')).boundingBox();
    const touch = await page.createCDPSession();
    await touch.send('Emulation.setTouchEmulationEnabled', {enabled:true});
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:box.x + 24,y:box.y + 24}]});
    await new Promise(resolve => setTimeout(resolve, 400));
    assert.equal(await page.$('[role=tooltip]'), null);
    await page.waitForSelector('[role=tooltip]', {timeout:1000});
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    assert.equal(await page.evaluate(() => window.count), 0);
  } finally { await page.close(); }
});

test('[ICON-HOVER-TRANSFER] moving pointer from trigger to tooltip keeps it open', async () => {
  const page = await open({container:{position:'fixed',top:200,left:200}});
  try {
    await page.hover('button');
    await page.waitForSelector('[role=tooltip]');
    await page.hover('[role=tooltip]');
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.ok(await page.$('[role=tooltip]'));
    await page.mouse.move(600, 600);
    await page.waitForSelector('[role=tooltip]', {hidden:true});
  } finally { await page.close(); }
});

test('[ICON-OUTSIDE] touch outside dismisses tooltip and preserves outside action', async () => {
  const page = await open();
  try {
    await page.evaluate(() => { const b = document.createElement('button'); b.id = 'outside'; b.textContent = 'Khác'; b.style.cssText = 'position:fixed;top:200px;left:200px'; b.onclick = () => window.outsideCount = (window.outsideCount || 0) + 1; document.body.append(b); });
    const box = await (await page.$('button')).boundingBox();
    const touch = await page.createCDPSession();
    await touch.send('Emulation.setTouchEmulationEnabled', {enabled:true});
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:box.x + 24,y:box.y + 24}]});
    await page.waitForSelector('[role=tooltip]');
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    const outside = await (await page.$('#outside')).boundingBox();
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:outside.x + outside.width/2,y:outside.y + outside.height/2}]});
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    assert.equal(await page.$('[role=tooltip]'), null);
    assert.equal(await page.evaluate(() => window.outsideCount), 1);
    assert.equal(await page.evaluate(() => window.count), 0);
  } finally { await page.close(); }
});

test('[ICON-LABEL-UPDATE] tooltip and accessible name follow label changes', async () => {
  const page = await open();
  try {
    await page.focus('button');
    await page.waitForSelector('[role=tooltip]');
    await page.evaluate(() => window.mount({label:'Mở bán lại'}));
    await page.waitForFunction(() => document.querySelector('[role=tooltip]')?.textContent === 'Mở bán lại');
    assert.equal(await page.$eval('button', e => e.getAttribute('aria-label')), 'Mở bán lại');
  } finally { await page.close(); }
});

test('[ICON-CONTRAST] tooltip text has at least 4.5:1 contrast', async () => {
  const page = await open();
  try {
    await page.focus('button');
    await page.waitForSelector('[role=tooltip]');
    const ratio = await page.$eval('[role=tooltip]', e => {
      const luminance = color => color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a,v,i) => a + v * [.2126,.7152,.0722][i],0);
      const s = getComputedStyle(e), a = luminance(s.color), b = luminance(s.backgroundColor);
      return (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
    });
    assert.ok(ratio >= 4.5, `contrast ${ratio}`);
  } finally { await page.close(); }
});

test('[ICON-CANCEL-CLICK] canceled move or scroll suppresses the synthetic click', async () => {
  for (const action of ['move','scroll']) {
    const page = await open();
    try {
      await page.evaluate(action => {
        const button = document.querySelector('button');
        const event = (type, x = 20) => new PointerEvent(type,{bubbles:true,pointerType:'touch',clientX:x,clientY:20});
        button.dispatchEvent(event('pointerdown'));
        if (action === 'move') button.dispatchEvent(event('pointermove',29));
        else window.dispatchEvent(new Event('scroll'));
        button.dispatchEvent(event('pointerup'));
        button.click();
      }, action);
      assert.equal(await page.evaluate(() => window.count), 0, action);
    } finally { await page.close(); }
  }
});

test('[ICON-DOUBLE-AFTER-HOLD] a later real double click remains available', async () => {
  const page = await open();
  try {
    const button = await page.$('button'), box = await button.boundingBox();
    const touch = await page.createCDPSession();
    await touch.send('Emulation.setTouchEmulationEnabled', {enabled:true});
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:box.x+24,y:box.y+24}]});
    await page.waitForSelector('[role=tooltip]');
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    await new Promise(resolve => setTimeout(resolve, 700));
    await button.evaluate(e => e.dispatchEvent(new MouseEvent('dblclick', {bubbles:true, detail:2})));
    assert.equal(await page.evaluate(() => window.count), 100);
  } finally { await page.close(); }
});

test('[ICON-DOUBLE-MOUSE] a mouse double click immediately after hold is preserved', async () => {
  const page = await open();
  try {
    const button = await page.$('button'), box = await button.boundingBox();
    const touch = await page.createCDPSession();
    await touch.send('Emulation.setTouchEmulationEnabled', {enabled:true});
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:box.x+24,y:box.y+24}]});
    await page.waitForSelector('[role=tooltip]');
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    await button.evaluate(e => { e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'mouse'})); e.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,detail:2})); });
    assert.equal(await page.evaluate(() => window.count), 100);
  } finally { await page.close(); }
});

const menuFixture = {
  cats:[{id:'c1',name:'Cà phê',description:null,sortOrder:1,isActive:true}],
  sizes:[{id:'s1',name:'M',sortOrder:1}],
  tops:[{id:'t1',name:'Thêm sữa đặc',price:5000,isActive:true}],
  products:[{id:'p0',name:'Cà phê sữa đá',categoryId:'c1',categoryName:'Cà phê',description:null,imageUrl:null,isActive:true,sizes:[{id:'ps0',sizeId:'s1',sizeName:'M',price:29000,isActive:true}]},
    {id:'p1',name:'Cà phê đen đá',categoryId:'c1',categoryName:'Cà phê',description:null,imageUrl:null,isActive:true,sizes:[{id:'ps1',sizeId:'s1',sizeName:'M',price:25000,isActive:true}]}]
};
let menuBundle;
before(async () => {
  const mocks = {
    AuthContext:`const auth={session:{user:{id:'qa-owner',full_name:'Chủ quán QA',role_code:'OWNER',store_id:'qa-store',branch_id:null},permissions:['pos.sell','table.manage','invoice.read','invoice.cancel_open','shift.read','shift.open','inventory.view','report.view_all','menu.manage','product.manage','branch.access_all','branch.manage','user.manage']},logout(){},isOffline:false}; export const useAuth=()=>auth; window.auth=auth;`,
    ToastContext:`const toast={showToast(value){window.toasts.push(value)}}; export const useToast=()=>toast;`,
    shiftService:`export const shiftService={getCurrentShift:async()=>null};`,
    menuService:`window.fixture=${JSON.stringify(menuFixture)}; window.calls=[]; window.toasts=[]; window.mode=window.initialMode;
      const get=(key)=>async()=>{if(window.mode==='delay') return new Promise(()=>{}); if(window.mode==='error') throw new Error('Lỗi thử nghiệm'); return window.mode==='empty'?[]:window.fixture[key]};
      const call=(name)=>async(...args)=>{window.calls.push([name,...args]); if(name==='patchProduct' && 'isActive' in args[1]) window.fixture.products.find(p=>p.id===args[0]).isActive=args[1].isActive;};
      export const menuService={getAllCategories:get('cats'),getSizes:get('sizes'),getAllProducts:get('products'),getAllToppings:get('tops'),getCategoryToppings:get('tops'),patchProduct:call('patchProduct'),deleteProduct:call('deleteProduct'),patchProductSize:call('patchProductSize'),deleteProductSize:call('deleteProductSize')};`
  };
  const result = await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {AppShell} from './src/components/common/AppShell'; import {ProductsScreen} from './src/features/products/ProductsScreen'; createRoot(document.getElementById('root')).render(<AppShell currentTab="products" onSelectTab={()=>{}}><ProductsScreen/></AppShell>);`,resolveDir:root,loader:'jsx'},bundle:true,write:false,format:'iife',plugins:[{name:'fixture',setup(b){b.onResolve({filter:/\/(AuthContext|ToastContext|menuService|shiftService)$/},args=>({path:args.path.split('/').pop(),namespace:'fixture'})); b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'js'}));}}]});
  menuBundle=result.outputFiles[0].text;
});
async function openMenu(viewport={width:1024,height:768}, mode='normal') {
  const page=await browser.newPage();
  await page.setViewport({...viewport,hasTouch:viewport.width<1440});
  await page.setContent('<html lang="vi"><meta charset="utf-8"><div id="root"></div></html>');
  const menuCss=['styles/ui.css','styles/pos.css','styles/components.css','index.css'].map(file=>readFileSync(`${root}/src/${file}`,'utf8').replace(/@import[^;]+;/g,'')).join('\n');
  await page.addStyleTag({content:menuCss});
  await page.evaluate(mode=>window.initialMode=mode,mode);
  await page.addScriptTag({content:menuBundle});
  if(mode==='normal') await page.waitForSelector('h3');
  return page;
}
test('[MENU-ACTION-LAYOUT] all five actions meet touch targets at desktop and tablet sizes',async()=>{
  for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024}]){
    const page=await openMenu(viewport);
    try {
      const data=await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>['Sửa thông tin','Ngưng bán','Xóa món','Đổi giá','Gỡ size này'].includes(b.getAttribute('aria-label'))).map(b=>({name:b.getAttribute('aria-label'),rect:b.getBoundingClientRect().toJSON(),svg:b.querySelector('svg')?.getBoundingClientRect().toJSON()})));
      assert.equal(data.length,10,JSON.stringify(data));
      for(const {name,rect,svg} of data){assert.ok(rect.width>=48&&rect.height>=48,`${name}: ${rect.width}×${rect.height}`);assert.equal(svg.width,20);assert.equal(svg.height,20);}
      for(let i=0;i<data.length;i++) for(let j=i+1;j<data.length;j++){const a=data[i].rect,b=data[j].rect;assert.ok(a.right+8<=b.left||b.right+8<=a.left||a.bottom+8<=b.top||b.bottom+8<=a.top,`${data[i].name} overlaps ${data[j].name}`);}
      const geometry=await page.evaluate(()=>[...document.querySelectorAll('button[aria-label="Đổi giá"]')].map(button=>{
        let card=button.parentElement; while(card && !card.querySelector('h3')) card=card.parentElement;
        const row=button.closest('.menu-size-actions');
        return {card:card.getBoundingClientRect().toJSON(), controls:[...card.querySelectorAll('button[aria-label]')].map(b=>b.getBoundingClientRect().toJSON()), texts:[...row.querySelectorAll(':scope > span:not(.icon-action-wrap)')].map(e=>e.getBoundingClientRect().toJSON())};
      }));
      for(const {card,controls,texts} of geometry) {
        for(const box of controls) assert.ok(box.left>=card.left&&box.right<=card.right&&box.top>=card.top&&box.bottom<=card.bottom,'action clipped by card');
        for(const a of controls) for(const b of texts) assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,'action overlaps label or price');
      }
      const ids=[];
      for(const button of await page.$$('button[aria-label="Sửa thông tin"],button[aria-label="Ngưng bán"],button[aria-label="Xóa món"],button[aria-label="Đổi giá"],button[aria-label="Gỡ size này"]')) {
        await button.focus();
        const id=await button.evaluate(e=>e.getAttribute('aria-describedby'));
        assert.ok(id && await page.$(`[id="${id}"][role="tooltip"]`));
        ids.push(id);
      }
      assert.equal(new Set(ids).size,10,'tooltip IDs must be unique');
      if(process.env.MENU_SCREENSHOTS) {
        const baseline=JSON.parse(readFileSync(process.env.MENU_BASELINE,'utf8'));
        const compare=async name=>{
          const expected=baseline.screens.find(s=>s.file===`${viewport.width}x${viewport.height}-${name}-before.png`);
          const actual=await page.evaluate(()=>({rail:[...document.querySelectorAll('.rail-btn')].map(e=>({name:e.innerText,rect:e.getBoundingClientRect().toJSON()})), table:document.querySelector('table')?.getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('table button')].map(e=>({name:e.innerText,rect:e.getBoundingClientRect().toJSON()}))}));
          const near=(a,b,label)=>{for(const k of ['x','y','width','height']) assert.ok(Math.abs(a[k]-b[k])<=1,`${name} ${label} ${k}: ${a[k]} vs ${b[k]}`)};
          const rail=expected.controls.filter(c=>c.className==='rail-btn');
          assert.deepEqual(actual.rail.map(c=>c.name),rail.map(c=>c.name));
          rail.forEach((c,i)=>near(actual.rail[i].rect,c.rect,`rail ${c.name}`));
          if(expected.table){
            near(actual.table,expected.table,'table');
            const buttons=expected.controls.filter(c=>c.className.includes('btn ') && c.rect.top>=expected.table.top && c.rect.bottom<=expected.table.bottom);
            assert.deepEqual(actual.buttons.map(c=>c.name),buttons.map(c=>c.name));
            buttons.forEach((c,i)=>near(actual.buttons[i].rect,c.rect,`button ${c.name}`));
          }
        };
        await page.evaluate(()=>{document.activeElement.blur(); document.querySelectorAll('*').forEach(e=>{e.scrollTop=0}); window.scrollTo(0,0)});
        await compare('products');
        await page.screenshot({path:`${process.env.MENU_SCREENSHOTS}/${viewport.width}x${viewport.height}-products-after.png`});
        for(const [tab,name] of [['Món thêm và áp dụng','toppings'],['Danh mục món','categories'],['Kích cỡ món','sizes']]) {
          await page.evaluate(tab=>[...document.querySelectorAll('button')].find(b=>b.innerText.includes(tab)).click(),tab);
          await page.waitForSelector('table');
          await compare(name);
          await page.screenshot({path:`${process.env.MENU_SCREENSHOTS}/${viewport.width}x${viewport.height}-${name}-after.png`});
        }
      }
    } finally {await page.close();}
  }
});
test('[MENU-ACTION-IDENTITY] actions address the intended product and size',async()=>{
  const page=await openMenu();
  try {
    const buttons=label=>page.$$(`button[aria-label="${label}"]`);
    await (await buttons('Ngưng bán'))[1].click();
    assert.deepEqual(await page.evaluate(()=>window.calls[0]),['patchProduct','p1',{isActive:false}]);
    await page.waitForFunction(()=>document.querySelector('button[aria-label="Mở bán lại"]'));
    await (await buttons('Đổi giá'))[1].click();
    assert.match(await page.$eval('[role=dialog]',e=>e.innerText),/Cà phê đen đá/);
    await page.keyboard.press('Escape');
    if (await page.$('[role=dialog]')) await page.keyboard.press('Escape');
    await page.waitForSelector('[role=dialog]',{hidden:true});
    page.once('dialog',dialog=>dialog.accept());
    await (await buttons('Gỡ size này'))[1].click();
    await page.waitForFunction(()=>window.calls.some(c=>c[0]==='deleteProductSize'));
    assert.deepEqual(await page.evaluate(()=>window.calls.find(c=>c[0]==='deleteProductSize')),['deleteProductSize','ps1']);
    await page.evaluate(()=>{window.fixture.products.reverse(); [...document.querySelectorAll('button')].find(b=>b.innerText.includes('Làm mới')).click()});
    await page.waitForFunction(()=>document.querySelector('button[aria-label="Mở bán lại"]'));
    await (await buttons('Sửa thông tin'))[0].click();
    assert.equal(await page.$eval('[role=dialog] input',e=>e.value),'Cà phê đen đá');
    await page.$eval('[role=dialog] form',form=>form.requestSubmit());
    await page.waitForFunction(()=>window.calls.some(c=>c[0]==='patchProduct' && 'name' in c[2]));
    assert.equal(await page.evaluate(()=>window.calls.find(c=>c[0]==='patchProduct' && 'name' in c[2])[1]),'p1');
    await (await buttons('Đổi giá'))[0].click();
    await page.$eval('[role=dialog] form',form=>form.requestSubmit());
    await page.waitForFunction(()=>window.calls.some(c=>c[0]==='patchProductSize'));
    assert.deepEqual(await page.evaluate(()=>window.calls.find(c=>c[0]==='patchProductSize')),['patchProductSize','ps1',{price:25000}]);
    let confirmation='';
    page.once('dialog',dialog=>{confirmation=dialog.message();return dialog.dismiss()});
    await (await buttons('Xóa món'))[0].click();
    assert.match(confirmation,/Cà phê đen đá/);
    assert.equal(await page.evaluate(()=>window.calls.some(c=>c[0]==='deleteProduct')),false);
    page.once('dialog',dialog=>dialog.accept());
    await (await buttons('Xóa món'))[0].click();
    await page.waitForFunction(()=>window.calls.some(c=>c[0]==='deleteProduct'));
    assert.deepEqual(await page.evaluate(()=>window.calls.find(c=>c[0]==='deleteProduct')),['deleteProduct','p1']);
  } finally {await page.close();}
});

test('[MENU-DATA-STATES] loading, empty and errors do not retain actions or mutate data',async()=>{
  for (const mode of ['delay','empty','error']) {
    const page=await openMenu({width:1024,height:768},mode);
    try {
      if(mode==='delay') await page.waitForFunction(()=>document.body.innerText.includes('Đang tải dữ liệu thực đơn'));
      else if(mode==='error') await page.waitForFunction(()=>window.toasts.some(t=>t.message==='Lỗi thử nghiệm'));
      else await page.waitForFunction(()=>!document.body.innerText.includes('Đang tải dữ liệu thực đơn'));
      assert.equal(await page.$('button[aria-label="Đổi giá"]'),null,mode);
      assert.equal(await page.$('[role=tooltip]'),null,mode);
      assert.deepEqual(await page.evaluate(()=>window.calls),[],mode);
    } finally {await page.close();}
  }
  const page=await openMenu();
  try {
    await page.focus('button[aria-label="Đổi giá"]');
    await page.waitForSelector('[role=tooltip]');
    await page.evaluate(()=>{window.mode='delay'; [...document.querySelectorAll('button')].find(b=>b.innerText.includes('Làm mới')).click()});
    await page.waitForFunction(()=>document.body.innerText.includes('Đang tải dữ liệu thực đơn'));
    assert.equal(await page.$('[role=tooltip]'),null);
    assert.deepEqual(await page.evaluate(()=>window.calls),[]);
  } finally {await page.close();}
});

test('[MENU-PERMISSIONS] recipe and management controls respect existing permission checks',async()=>{
  for(const scenario of ['no-inventory','no-manage']) {
    const page=await openMenu();
    try {
      await page.evaluate(scenario=>{
        window.auth.session.permissions=scenario==='no-inventory'?['menu.manage']:[];
        window.auth.session.user.role_code='CASHIER';
        [...document.querySelectorAll('button')].find(b=>b.innerText.includes('Làm mới')).click();
      },scenario);
      if(scenario==='no-inventory') {
        await page.waitForFunction(()=>!document.body.innerText.includes('Đang tải dữ liệu thực đơn'));
        assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>b.innerText==='Công thức')),false);
        assert.ok(await page.$('button[aria-label="Đổi giá"]'));
      } else {
        await page.waitForFunction(()=>document.body.innerText.includes('Không có quyền truy cập'));
        assert.equal(await page.$('button[aria-label="Đổi giá"]'),null);
      }
    } finally {await page.close();}
  }
});

test('[MENU-CALLER-REGRESSION] other menu tables keep their text actions and navigation',async()=>{
  const page=await openMenu();
  try {
    for(const [tab,labels] of [['Món thêm và áp dụng',['Gán danh mục','Công thức','Sửa','Ngưng','Xóa']],['Danh mục món',['Sửa','Xóa']],['Kích cỡ món',['Sửa','Xóa']]]) {
      await page.evaluate(tab=>[...document.querySelectorAll('button')].find(b=>b.innerText.includes(tab)).click(),tab);
      await page.waitForSelector('table');
      const text=await page.$eval('table',e=>e.innerText);
      for(const label of labels) assert.ok(text.includes(label),`${tab}: ${label}`);
    }
  } finally {await page.close();}
});
