import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

function token(name) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  assert.ok(match, `thiếu token ${name} trong index.css`);
  return match[1];
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// DESIGN.md:649 - viền ô nhập và nút phụ tối thiểu 3:1 so với nền.
for (const bg of ['--color-bg', '--color-surface']) {
  test(`[C-1] viền điều khiển đạt tương phản >= 3:1 trên ${bg}`, () => {
    const ratio = contrast(token('--color-border-control'), token(bg));
    assert.ok(ratio >= 3, `tương phản ${ratio.toFixed(3)}:1 < 3:1 trên ${bg}`);
  });
}
