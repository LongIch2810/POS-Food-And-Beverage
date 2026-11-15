import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { reportService } from '../src/features/reports/reportService.ts';
import { rememberRequestIdentity } from '../src/auth/session-events.ts';

afterEach(() => {
  delete globalThis.document;
  delete globalThis.fetch;
  rememberRequestIdentity(null);
});

const report = { date: '2026-11-14', invoiceCount: 3, totalRevenue: 85000, cashRevenue: 35000, transferRevenue: 50000, dailyRevenue: [], bestSellers: [] };

test('test_ST3_AC1_service_shell_permissions service: GET đúng query, unwrap data, không gửi storeId', async () => {
  globalThis.document = { cookie: '' };
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, ...options }); return Response.json({ data: report }); };
  const full = await reportService.getRevenue({ date: '2026-11-14', fromDate: '2026-11-08', toDate: '2026-11-14', branchId: 'b-1', shiftId: 's-1' });
  assert.deepEqual(full, report);
  const url = new URL(calls[0].url, 'http://localhost');
  assert.equal(url.pathname, '/api/v1/reports/revenue');
  assert.equal(calls[0].method, 'GET');
  assert.deepEqual(Object.fromEntries(url.searchParams), { date: '2026-11-14', fromDate: '2026-11-08', toDate: '2026-11-14', branchId: 'b-1', shiftId: 's-1' });
  await reportService.getRevenue({ date: '2026-11-14', fromDate: '2026-11-14', toDate: '2026-11-14' });
  const bare = new URL(calls[1].url, 'http://localhost');
  assert.deepEqual([...bare.searchParams.keys()].sort(), ['date', 'fromDate', 'toDate']);
});

test('test_ST3_AC1_service_shell_permissions service: lỗi API giữ message và requestId', async () => {
  globalThis.document = { cookie: '' };
  globalThis.fetch = async () => Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Máy chủ chưa tải được báo cáo.', requestId: 'req-reports-1' } }, { status: 500 });
  await assert.rejects(reportService.getRevenue({ date: '2026-11-14', fromDate: '2026-11-14', toDate: '2026-11-14' }),
    err => err.message === 'Máy chủ chưa tải được báo cáo.' && err.requestId === 'req-reports-1');
});
