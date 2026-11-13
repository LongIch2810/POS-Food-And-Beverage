import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import puppeteer from 'puppeteer-core';

let browser, bundle;
const root = fileURLToPath(new URL('..', import.meta.url));
const css = ['index.css', 'styles/ui.css', 'styles/pos.css', 'styles/components.css']
  .map(file => readFileSync(`${root}/src/${file}`, 'utf8').replace(/@import[^;]+;/g, '')).join('\n');

before(async () => {
  const executablePath = process.env.CHROME_BIN || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].find(existsSync);
  assert.ok(executablePath, 'Set CHROME_BIN to run browser regression tests');
  browser = await puppeteer.launch({ executablePath, headless: true });
  const result = await build({
    stdin: { contents: `import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {BlindCountCloseShiftModal} from './src/features/shifts/BlindCountCloseShiftModal';
      import {ForceCloseShiftModal} from './src/features/shifts/ForceCloseShiftModal';
      window.mount = force => createRoot(document.getElementById('root')).render(React.createElement(
        force ? ForceCloseShiftModal : BlindCountCloseShiftModal,
        {isOpen:true, shift:{id:'s1',shiftType:'CASHIER',status:'OPEN',startedAt:'2026-11-13T00:00:00Z'},onClose(){},onSuccess(){}}));`,
      resolveDir: root, loader: 'jsx' },
    bundle: true, write: false, format: 'iife',
    plugins: [{ name: 'toast-boundary', setup(builder) {
      builder.onResolve({ filter: /\/ToastContext$/ }, () => ({ path: 'toast', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const useToast = () => ({showToast(){}})' }));
    } }],
  });
  bundle = result.outputFiles[0].text;
});
after(async () => { await browser?.close(); });

async function open(force, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.setContent('<div id="root"></div>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle });
  await page.evaluate(force => window.mount(force), force);
  await page.waitForSelector('[role=dialog] input');
  await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
  return page;
}

test('[V1-1] close controls meet tablet touch targets in both orientations', async () => {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }]) {
    for (const force of [false, true]) {
      const page = await open(force, viewport);
      try {
        for (const direct of force ? [false] : [false, true]) {
          if (direct) await page.evaluate(() => [...document.querySelectorAll('button')].find(e => e.textContent.includes('Nhập nhanh tổng tiền')).click());
          const controls = await page.$$eval('[role=dialog] button,[role=dialog] input,[role=dialog] textarea', es => es.map(e => ({
            name: e.textContent || e.getAttribute('aria-label') || e.placeholder,
            width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height,
          })));
          for (const control of controls) {
            const minimum = control.name.includes('Xác nhận đóng') ? 56 : 48;
            assert.ok(control.height >= minimum && control.width >= 48, `${control.name}: ${control.width}×${control.height}, expected >=48×${minimum}`);
          }
        }
      } finally { await page.close(); }
    }
  }
});

test('[V1-2] visible close field labels identify their controls', async () => {
  for (const force of [false, true]) {
    const page = await open(force, { width: 768, height: 1024 });
    try {
      if (!force) await page.evaluate(() => [...document.querySelectorAll('button')].find(e => e.textContent.includes('Nhập nhanh tổng tiền')).click());
      const labels = await page.$$eval('[role=dialog] label', es => es.map(e => ({ text: e.textContent.trim(), target: e.control?.tagName })));
      assert.equal(labels.length, force ? 3 : 2);
      for (const label of labels) assert.ok(['INPUT', 'TEXTAREA'].includes(label.target), `Label has no control: ${label.text}`);
    } finally { await page.close(); }
  }
});

test('[V1-3] force close field borders have at least 3:1 surface contrast', async () => {
  const page = await open(true, { width: 1024, height: 768 });
  try {
    const ratios = await page.$$eval('[role=dialog] input,[role=dialog] textarea', es => {
      const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255)
        .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      return es.map(e => {
        const s = getComputedStyle(e), a = luminance(s.borderTopColor), b = luminance(s.backgroundColor);
        return { name: e.placeholder, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
      });
    });
    assert.equal(ratios.length, 3);
    for (const field of ratios) assert.ok(field.ratio >= 3, `${field.name}: ${field.ratio}:1`);
  } finally { await page.close(); }
});
