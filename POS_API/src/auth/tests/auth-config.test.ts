import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sePayWebhookSecret, validateAuthConfig } from '../auth-config';

test('[B-4] SePay webhook secret needs at least 32 bytes and SEPAY_ENV=test', () => {
  const original = { ...process.env };
  try {
    process.env.SEPAY_ENV = 'test';
    process.env.SEPAY_WEBHOOK_SECRET = 's'.repeat(31);
    assert.equal(sePayWebhookSecret(), null);
    process.env.SEPAY_WEBHOOK_SECRET = 's'.repeat(32);
    assert.equal(sePayWebhookSecret(), 's'.repeat(32));
    process.env.SEPAY_WEBHOOK_SECRET = 'é'.repeat(16);
    assert.equal(sePayWebhookSecret(), 'é'.repeat(16), '16 two-byte characters are 32 bytes');
    process.env.SEPAY_ENV = 'production';
    assert.equal(sePayWebhookSecret(), null);
  } finally {
    process.env = original;
  }
});

test('[R6-1] SePay webhook secret rejects the <placeholder> template from .env.example', () => {
  const original = { ...process.env };
  try {
    process.env.SEPAY_ENV = 'test';
    process.env.SEPAY_WEBHOOK_SECRET = '<separate-random-secret-at-least-32-bytes>';
    assert.equal(sePayWebhookSecret(), null);
    process.env.SEPAY_WEBHOOK_SECRET = '  <separate-random-secret-at-least-32-bytes>  ';
    assert.equal(sePayWebhookSecret(), null, 'surrounding whitespace is trimmed before the placeholder check');
    process.env.SEPAY_WEBHOOK_SECRET = 'r'.repeat(32);
    assert.equal(sePayWebhookSecret(), 'r'.repeat(32), 'a real 32-byte secret is still accepted');
  } finally {
    process.env = original;
  }
});

test('PB-02 startup rejects absent or weak authentication configuration', () => {
  const original = { ...process.env };
  try {
    delete process.env.JWT_SECRET;
    process.env.CSRF_SECRET = 'c'.repeat(32);
    process.env.PUBLIC_ORIGIN = 'http://localhost:5173';
    assert.throws(validateAuthConfig);
    process.env.JWT_SECRET = 'short';
    assert.throws(validateAuthConfig);
    process.env.JWT_SECRET = 'j'.repeat(32);
    process.env.PUBLIC_ORIGIN = 'http://localhost:5173/path';
    assert.throws(validateAuthConfig);
    process.env.PUBLIC_ORIGIN = 'http://localhost:5173';
    assert.doesNotThrow(validateAuthConfig);
  } finally {
    process.env = original;
  }
});
