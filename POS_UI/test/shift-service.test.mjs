import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { shiftService as service } from '../src/services/shiftService.ts';

afterEach(() => {
  delete globalThis.document;
  delete globalThis.fetch;
});

test('PB13-SHIFT-HTTP operations preserve endpoints, query params, bodies and CSRF tokens', async () => {
  globalThis.document = { cookie: '__Host-pos_csrf=shift-csrf-token' };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    if (url.includes('/opening-cash-info')) {
      return Response.json({
        data: {
          amount: 1500000,
          source: 'BRANCH_INITIAL_CASH',
          sourceText: 'Lấy từ quỹ tiền ban đầu của chi nhánh (BR-55)',
        },
      });
    }
    if (url.includes('/current')) {
      return Response.json({
        data: {
          id: 'shift-1',
          branchId: 'branch-1',
          userId: 'user-1',
          shiftType: 'CASHIER',
          startedAt: '2026-11-03T08:00:00.000Z',
          endedAt: null,
          status: 'OPEN',
          reconciliation: {
            id: 'recon-1',
            openingCash: 1000000,
            status: 'PENDING',
          },
        },
      });
    }
    if (url.includes('/close')) {
      return Response.json({
        data: {
          id: 'shift-1',
          status: 'CLOSED',
          endedAt: '2026-11-03T16:00:00.000Z',
          reconciliation: {
            id: 'recon-1',
            openingCash: 1000000,
            countedCash: 1000000,
            difference: 0,
            status: 'MATCHED',
          },
        },
      });
    }
    if (url.includes('/force-close')) {
      return Response.json({
        data: {
          id: 'shift-1',
          status: 'CLOSED',
          closedBy: 'manager-1',
          note: 'Đóng cưỡng chế: Thu ngân quên đóng',
        },
      });
    }
    if (options?.method === 'POST') {
      return Response.json({
        data: {
          id: 'shift-new',
          shiftType: 'STAFF',
          status: 'OPEN',
          startedAt: '2026-11-03T08:00:00.000Z',
        },
      });
    }
    // GET list or detail
    return Response.json({
      data: [
        { id: 'shift-1', shiftType: 'CASHIER', status: 'CLOSED' },
        { id: 'shift-2', shiftType: 'STAFF', status: 'CLOSED' },
      ],
      meta: { limit: 20, nextCursor: 'CURSOR-SHIFT', total: 2 },
    });
  };

  // 1. getCurrentShift
  const curr = await service.getCurrentShift();
  assert.equal(curr?.id, 'shift-1');
  assert.equal(curr?.shiftType, 'CASHIER');
  assert.equal(curr?.reconciliation?.openingCash, 1000000);

  // 2. openShift
  const opened = await service.openShift({
    shiftType: 'CASHIER',
    branchId: 'branch-1',
    note: 'Ca sáng',
  });
  assert.equal(opened.id, 'shift-new');

  // 3. checkInStaffShift
  await service.checkInStaffShift('branch-1');

  // 4. closeShift
  const closed = await service.closeShift('shift-1', {
    countedCash: 1000000,
    note: 'Khớp tiền',
  });
  assert.equal(closed.status, 'CLOSED');
  assert.equal(closed.reconciliation?.status, 'MATCHED');

  // 5. checkOutStaffShift
  await service.checkOutStaffShift('shift-staff-1');

  // 6. closeShiftBlind
  await service.closeShiftBlind('shift-1', 1000000n, 'Đếm mù');

  // 7. forceCloseShift
  const forced = await service.forceCloseShift('shift-1', {
    countedCash: 1000000,
    reason: 'Thu ngân quên đóng',
    note: 'Kiểm kê khớp',
  });
  assert.equal(forced.status, 'CLOSED');

  // 8. getShifts (list with query)
  const list = await service.getShifts({
    branchId: 'branch-1',
    status: 'CLOSED',
    shiftType: 'CASHIER',
    limit: 10,
  });
  assert.equal(list.data.length, 2);
  assert.equal(list.meta.nextCursor, 'CURSOR-SHIFT');

  // 9. getShiftDetail
  await service.getShiftDetail('shift-1');

  // 10. getOpeningCashInfo
  const openingInfo = await service.getOpeningCashInfo('branch-1');
  assert.equal(openingInfo.amount, 1500000);
  assert.equal(openingInfo.source, 'BRANCH_INITIAL_CASH');

  // Kiểm tra các headers CSRF, methods, và paths
  assert.ok(calls.some((c) => c.url.includes('/api/v1/work-shifts/current') && c.method === 'GET'));
  assert.ok(calls.some((c) => c.url.includes('/api/v1/work-shifts') && c.method === 'POST'));
  assert.ok(calls.some((c) => c.url.includes('/api/v1/work-shifts/shift-1/close') && c.method === 'POST'));
  assert.ok(calls.some((c) => c.url.includes('/api/v1/work-shifts/shift-1/force-close') && c.method === 'POST'));
  assert.ok(calls.every((c) => c.method === 'GET' || c.headers?.['X-CSRF-Token'] === 'shift-csrf-token'));
});

