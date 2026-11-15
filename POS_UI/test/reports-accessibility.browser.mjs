import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import puppeteer from 'puppeteer-core';

// Chạy: node --test test/reports-accessibility.browser.mjs (cần Chrome/Chromium: CHROME_BIN hoặc đường dẫn mặc định).
// Component, reportService, shiftService, organizationService và HTTP client là mã thật; chỉ fetch (biên mạng) và AuthContext (phiên) được giả.
let browser, bundle;
const root = fileURLToPath(new URL('..', import.meta.url));
const evidenceDir = process.env.REPORT_EVIDENCE_DIR || fileURLToPath(new URL('../../.devloopflow/verify/20261114-sprint10-reports/evidence/st3/', import.meta.url));
// bundle thật của src/index.css: @import ui/pos/components đứng TRƯỚC quy tắc chung, đúng cascade của app
let css;

before(async () => {
  const executablePath = process.env.CHROME_BIN || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].find(existsSync);
  assert.ok(executablePath, 'Set CHROME_BIN to run browser regression tests');
  browser = await puppeteer.launch({ executablePath, headless: true });
  mkdirSync(evidenceDir, { recursive: true });
  const cssBundle = await build({ entryPoints: [`${root}/src/index.css`], bundle: true, write: false, loader: { '.woff2': 'dataurl', '.woff': 'dataurl', '.ttf': 'dataurl', '.svg': 'dataurl', '.png': 'dataurl' } });
  css = cssBundle.outputFiles[0].text;
  const result = await build({
    stdin: { contents: `import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {DailyReportScreen} from './src/features/reports/DailyReportScreen';
      window.mount = () => createRoot(document.getElementById('main')).render(React.createElement(DailyReportScreen));`,
    resolveDir: root, loader: 'jsx' },
    bundle: true, write: false, format: 'iife',
    plugins: [{ name: 'session-boundary', setup(builder) {
      builder.onResolve({ filter: /\/context\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const useAuth = () => ({ session: window.__session })' }));
    } }],
  });
  bundle = result.outputFiles[0].text;
});
after(async () => { await browser?.close(); });

const sessions = {
  owner: { user: { id: 'owner-1', store_id: 's', branch_id: null, role_code: 'OWNER' }, permissions: ['report.view_all', 'branch.access_all'], branch_name: null },
  manager: { user: { id: 'manager-1', store_id: 's', branch_id: 'b1', role_code: 'MANAGER' }, permissions: ['report.view_branch'], branch_name: 'Chi nhánh 1' },
  cashier: { user: { id: 'cashier-1', store_id: 's', branch_id: 'b1', role_code: 'CASHIER' }, permissions: ['report.view_shift'], branch_name: 'Chi nhánh 1' },
};

async function open(sessionName, viewport, locale) {
  const page = await browser.newPage();
  if (locale) await (await page.createCDPSession()).send('Emulation.setLocaleOverride', { locale });
  await page.setViewport(viewport);
  await page.setContent('<div class="shell" style="height:100vh"><nav class="rail" aria-label="Điều hướng chính"></nav><main id="main" style="flex:1;overflow:auto;display:flex;flex-direction:column;min-width:0"></main></div>');
  await page.addStyleTag({ content: css });
  await page.evaluate(session => {
    window.__session = session;
    window.__calls = [];
    const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const days = (from, to) => { const out = []; for (let t = Date.parse(from); t <= Date.parse(to); t += 86400000) out.push(new Date(t).toISOString().slice(0, 10)); return out; };
    window.fetch = async url => {
      const parsed = new URL(url, 'http://localhost');
      window.__calls.push(parsed.pathname + parsed.search);
      if (parsed.pathname.endsWith('/reports/revenue')) {
        const q = parsed.searchParams;
        return json({ data: {
          date: q.get('date'), invoiceCount: 3, totalRevenue: 85000, cashRevenue: 35000, transferRevenue: 50000,
          dailyRevenue: days(q.get('fromDate'), q.get('toDate')).map((date, i) => ({ date, revenue: i % 5 === 2 ? 120000 + i * 1000 : i % 3 === 0 ? 0 : 35000 + i * 500 })),
          bestSellers: Array.from({ length: 10 }, (_, i) => ({ productSizeId: `ps-${i}`, productName: i === 0 ? 'Trà sữa trân châu đường đen kèm thạch dừa và kem cheese' : `Món số ${i + 1}`, sizeName: i % 2 ? 'M' : 'L', quantity: 20 - i, revenue: 350000 - i * 20000 })),
        } });
      }
      if (parsed.pathname.endsWith('/work-shifts/current')) return json({ data: null });
      if (parsed.pathname.endsWith('/work-shifts')) return json({ data: [{ id: 'sh-1', branchId: 'b1', userId: 'cashier-1', shiftType: 'CASHIER', startedAt: '2026-11-13T01:00:00.000Z', endedAt: null, status: 'OPEN' }], meta: { limit: 100, nextCursor: null, total: 1 } });
      if (parsed.pathname.endsWith('/branches')) return json({ data: [{ id: 'b1', name: 'Chi nhánh 1' }, { id: 'b2', name: 'Chi nhánh 2' }], meta: { limit: 100, nextCursor: null, total: 2 } });
      return new Response('{}', { status: 404 });
    };
  }, sessions[sessionName]);
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => window.mount());
  await page.waitForSelector('.report-chart');
  await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
  return page;
}

for (const locale of ['en-US', 'vi-VN']) {
  test(`[V1-1] ba ô ngày hiển thị dd/MM/yyyy với locale ${locale}, query ISO và chặn ngày sai`, async () => {
    const page = await open('owner', { width: 1024, height: 768 }, locale);
    try {
      for (const [label, value] of [['Ngày báo cáo', '14/11/2026'], ['Biểu đồ từ ngày', '01/11/2026'], ['Biểu đồ đến ngày', '07/11/2026']]) {
        await page.evaluate((label, value) => {
          const input = document.querySelector(`input[aria-label="${label}"]`);
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }, label, value);
        assert.equal(await page.$eval(`input[aria-label="${label}"]`, input => input.value), value, 'ngày người dùng nhìn thấy phải theo dd/MM/yyyy');
      }
      await page.waitForFunction(() => window.__calls.some(call => {
        const q = new URL(call, 'http://localhost').searchParams;
        return q.get('date') === '2026-11-14' && q.get('fromDate') === '2026-11-01' && q.get('toDate') === '2026-11-07';
      }));
      const fields = await page.$$eval('.report-filters input', inputs => inputs.map(input => ({ type: input.type, value: input.value })));
      assert.deepEqual(fields, [{ type: 'text', value: '14/11/2026' }, { type: 'text', value: '01/11/2026' }, { type: 'text', value: '07/11/2026' }]);
      await page.screenshot({ path: `${evidenceDir}/v1-1-dates-${locale}.png` });
      const before = await page.evaluate(() => window.__calls.length);
      const dateInput = await page.$('input[aria-label="Ngày báo cáo"]');
      for (const invalid of ['1', '14/11/202', '30/02/2026', '']) {
        await dateInput.focus();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        if (invalid) await page.keyboard.type(invalid);
        assert.equal(await dateInput.evaluate(input => input.value), invalid, 'giữ nguyên ngày đang gõ hoặc sai');
        await page.waitForSelector('#report-date-error');
        assert.equal(await page.evaluate(() => window.__calls.length), before, 'ngày chưa hợp lệ không phát request');
      }
      await page.keyboard.type('15/11/2026');
      await page.waitForFunction(() => window.__calls.some(call => new URL(call, 'http://localhost').searchParams.get('date') === '2026-11-15'));
    } finally { await page.close(); }
  });
}

// React theo dõi giá trị input qua setter gốc; đặt giá trị như người dùng nhập.
const setDate = (page, label, value) => page.evaluate((label, value) => {
  const input = document.querySelector(`input[aria-label="${label}"]`);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value.split('-').reverse().join('/'));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}, label, value);

const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255)
  .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);

async function measure(page, viewport) {
  return page.evaluate(viewport => {
    const rect = el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, top: r.top, left: r.left, right: r.right, bottom: r.bottom }; };
    const name = el => (el.getAttribute('aria-label') || el.textContent || el.id || el.tagName).trim().slice(0, 40);
    const main = document.querySelector('#main');
    const wrap = document.querySelector('.report-chart-wrap');
    const bars = [...document.querySelectorAll('.report-bar')];
    const fills = bars.map(bar => rect(bar.querySelector('.report-bar-fill')).height);
    return {
      viewport,
      labels: [...document.querySelectorAll('label')].map(label => ({ text: label.querySelector('span')?.textContent ?? label.textContent.trim(), control: label.control?.tagName ?? null, labelAboveControl: label.control ? rect(label.querySelector('span')).bottom <= rect(label.control).top + 1 : false })),
      targets: [...document.querySelectorAll('button, input, select')].map(el => ({ name: name(el), ...rect(el) })),
      overflow: { documentScrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, mainScrollWidth: main.scrollWidth, mainClientWidth: main.clientWidth, tableWrapOverflow: [...document.querySelectorAll('.table-wrap')].map(el => el.scrollWidth - el.clientWidth) },
      chart: {
        days: bars.length, focusable: wrap.tabIndex === 0, label: wrap.getAttribute('aria-label'), scrollWidth: wrap.scrollWidth, clientWidth: wrap.clientWidth,
        barMinWidth: Math.min(...bars.map(bar => rect(bar).width)), fillHeights: fills, maxFill: Math.max(...fills), minFill: Math.min(...fills),
        axis: [...document.querySelectorAll('.report-chart-axis span')].map(el => el.textContent),
        valueFontPx: parseFloat(getComputedStyle(document.querySelector('.report-bar-value')).fontSize),
        dateFontPx: parseFloat(getComputedStyle(document.querySelector('.report-bar time')).fontSize),
        valueColor: getComputedStyle(document.querySelector('.report-bar-value')).color,
        surfaceColor: getComputedStyle(document.querySelector('.panel')).backgroundColor,
        valueTexts: bars.map(bar => bar.querySelector('.report-bar-value').textContent),
        hoverOnly: bars.some(bar => getComputedStyle(bar.querySelector('.report-bar-value')).visibility === 'hidden' || getComputedStyle(bar.querySelector('.report-bar-value')).display === 'none' || getComputedStyle(bar.querySelector('.report-bar-value')).opacity === '0'),
      },
      text: document.body.innerText,
    };
  }, viewport);
}

test('test_ST3_AC4_browser_tablet: nhãn, mục tiêu chạm, chart và tràn ngang đạt DESIGN ở 1024x768 và 1280x800', async () => {
  const results = [];
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
    for (const [sessionName, expectLabels] of [['owner', ['Ngày báo cáo', 'Biểu đồ từ ngày', 'Biểu đồ đến ngày', 'Chi nhánh']], ['cashier', ['Ngày báo cáo', 'Biểu đồ từ ngày', 'Biểu đồ đến ngày', 'Ca thu ngân']]]) {
      const page = await open(sessionName, viewport);
      try {
        // 31 ngày là trường hợp chật nhất của chart
        await setDate(page, 'Biểu đồ từ ngày', await page.evaluate(() => { const to = document.querySelector('input[aria-label="Biểu đồ đến ngày"]').value.split('/').reverse().join('-'); return new Date(Date.parse(to) - 30 * 86400000).toISOString().slice(0, 10); }));
        await page.waitForFunction(() => document.querySelectorAll('.report-bar').length === 31);
        await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
        const m = await measure(page, { ...viewport, session: sessionName });
        await page.screenshot({ path: `${evidenceDir}/tablet-${viewport.width}-${sessionName}.png`, fullPage: false });
        if (sessionName === 'owner') await page.screenshot({ path: `${evidenceDir}/tablet-${viewport.width}.png`, fullPage: false });

        assert.deepEqual(m.labels.map(l => l.text), expectLabels, `${sessionName} đủ label field`);
        for (const label of m.labels) { assert.ok(['INPUT', 'SELECT'].includes(label.control), `Label không gắn control: ${label.text}`); assert.ok(label.labelAboveControl, `Nhãn phải nằm trên ô: ${label.text}`); }
        const dateTarget = m.targets.find(t => t.name === 'Ngày báo cáo');
        assert.ok(dateTarget.height >= 48, `[R1-2] ô Ngày báo cáo cao ${dateTarget.height}px trong cascade thật, cần >=48`);
        assert.ok(m.targets.length >= 4);
        for (const target of m.targets) assert.ok(target.height >= 48 && target.width >= 48, `${target.name}: ${target.width}×${target.height}, cần >=48×48`);
        assert.ok(m.overflow.documentScrollWidth <= m.overflow.innerWidth, `tràn ngang trang ${m.overflow.documentScrollWidth}>${m.overflow.innerWidth}`);
        assert.ok(m.overflow.mainScrollWidth <= m.overflow.mainClientWidth, `tràn ngang vùng nội dung ${m.overflow.mainScrollWidth}>${m.overflow.mainClientWidth}`);
        assert.ok(m.overflow.tableWrapOverflow.every(x => x <= 0), 'bảng món không tràn ngang');
        assert.equal(m.chart.days, 31);
        assert.ok(m.chart.focusable && m.chart.label === 'Doanh thu theo ngày');
        assert.ok(m.chart.scrollWidth > m.chart.clientWidth, '31 ngày cuộn trong chart, không đẩy toàn trang');
        assert.ok(m.chart.barMinWidth >= 48, `cột chart hẹp ${m.chart.barMinWidth}`);
        assert.ok(m.chart.maxFill >= 100, `cột lớn nhất cao ${m.chart.maxFill}`);
        assert.ok(m.chart.minFill >= 0 && m.chart.minFill < m.chart.maxFill);
        assert.ok(m.chart.valueFontPx >= 12 && m.chart.dateFontPx >= 12, 'chữ chart >=12px');
        assert.equal(m.chart.hoverOnly, false, 'giá trị không phụ thuộc hover');
        assert.equal(m.chart.axis.length, 2);
        assert.ok(m.chart.valueTexts.every(t => /₫|đ/.test(t)), 'giá trị tiền VND');
        const ratio = (Math.max(luminance(m.chart.valueColor), luminance(m.chart.surfaceColor)) + 0.05) / (Math.min(luminance(m.chart.valueColor), luminance(m.chart.surfaceColor)) + 0.05);
        assert.ok(ratio >= 4.5, `tương phản chữ chart ${ratio}`);
        for (const expected of ['Doanh thu món và topping trước giảm giá', '3 hóa đơn hoàn tất', 'Tiền mặt', 'Chuyển khoản']) assert.ok(m.text.includes(expected), `thiếu ${expected}`);

        // bàn phím: Tab tới được vùng chart, mũi tên cuộn nội dung chart
        let focused = false;
        for (let i = 0; i < 20 && !focused; i++) { await page.keyboard.press('Tab'); focused = await page.evaluate(() => document.activeElement?.classList.contains('report-chart-wrap')); }
        assert.ok(focused, 'Tab tới được chart');
        const before = await page.$eval('.report-chart-wrap', el => el.scrollLeft);
        for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const after = await page.$eval('.report-chart-wrap', el => el.scrollLeft);
        assert.ok(after > before, 'mũi tên cuộn chart');
        const outline = await page.$eval('.report-chart-wrap', el => getComputedStyle(el).outlineStyle !== 'none' || getComputedStyle(el).boxShadow !== 'none');
        assert.ok(outline, 'chart có chỉ báo focus');
        // cảm ứng: cuộn bằng vuốt không bị chặn bởi touch-action
        const touchAction = await page.$eval('.report-chart-wrap', el => getComputedStyle(el).touchAction);
        assert.ok(['auto', 'pan-x', 'manipulation', 'pan-x pan-y'].includes(touchAction), `touch-action ${touchAction}`);

        const calls = await page.evaluate(() => window.__calls);
        assert.ok(calls.some(call => call.startsWith('/api/v1/reports/revenue?')), 'gọi API báo cáo thật');
        m.sessionName = sessionName; m.calls = calls; m.keyboard = { focusedChart: focused, scrollLeftBefore: before, scrollLeftAfter: after }; m.contrastRatio = ratio; m.touchAction = touchAction;
        const { text, ...rest } = m; results.push(rest);
      } finally { await page.close(); }
    }
  }
  writeFileSync(`${evidenceDir}/accessibility-measurements.json`, JSON.stringify(results, null, 2));
});
