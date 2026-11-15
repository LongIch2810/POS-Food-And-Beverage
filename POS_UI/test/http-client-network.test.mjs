import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { request } from '../src/http/client.ts';
import { AuthError } from '../src/auth/client.ts';
import { rememberRequestIdentity } from '../src/auth/session-events.ts';

afterEach(() => {
  delete globalThis.document;
  delete globalThis.fetch;
  rememberRequestIdentity(null);
});

test('test_ST4_AC1_get_mat_mang_cau_doc', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new TypeError('Failed to fetch'); };
  await assert.rejects(
    request('stock-movements?limit=100', 'GET', undefined, true, true),
    error => error instanceof AuthError &&error.code === 'NETWORK_ERROR'
      && error.message === 'Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.',
  );
  assert.equal(calls, 1);
});

test('test_ST4_AC2_ghi_mat_mang_giu_cau_cu', async () => {
  globalThis.document = { cookie: '__Host-pos_csrf=t' };
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new TypeError('Failed to fetch'); };
    await assert.rejects(
      request('ingredients', method, { name: 'A', unit: 'g' }),
      error => error.code === 'NETWORK_ERROR'
        && error.message === 'Chưa xác nhận được kết quả. Kiểm tra kết nối và tải lại danh sách trước khi thử lại.',
      method,
    );
    assert.equal(calls, 1, method);
  }
});
