import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { Logger } from '@nestjs/common';
import { assertDateRange, isCalendarDate, toSafeMoney } from '../reports.service';

test('test_ST2_AC5_calendar_helper', () => {
  for (const day of ['2026-11-14', '2028-02-29', '2026-12-31', '2026-01-01']) assert.equal(isCalendarDate(day), true, day);
  for (const day of ['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '2026-11-31', '2026-1-1', '', ' 2026-11-14', '2026-11-14T00:00:00Z'])
    assert.equal(isCalendarDate(day), false, day);
  assert.equal(assertDateRange('2026-11-14', '2026-11-14'), 1);
  assert.equal(assertDateRange('2026-10-15', '2026-11-14'), 31);
  assert.equal(assertDateRange('2028-02-28', '2028-03-01'), 3);
  assert.equal(assertDateRange('2026-10-14', '2026-11-14'), null, '32 days');
  assert.equal(assertDateRange('2026-11-14', '2026-11-13'), null, 'reversed');
});

test('test_ST2_AC2_safe_money_unit', () => {
  const logs = mock.method(Logger, 'error', () => undefined);
  try {
    assert.equal(toSafeMoney('0', 'total'), 0);
    assert.equal(toSafeMoney('9007199254740991', 'total'), 9007199254740991);
    for (const bad of ['9007199254740992', '18014398509481984', '-1', '1.5', 'abc', '']) {
      logs.mock.resetCalls();
      assert.throws(() => toSafeMoney(bad, 'dailyRevenue'), (error: any) => error.getStatus() === 500 && error.getResponse().code === 'INTERNAL_ERROR'
        && error.getResponse().message === 'Hệ thống gặp lỗi. Vui lòng thử lại sau.', bad);
      assert.equal(logs.mock.callCount(), 1, `unsafe value ${bad} is logged once`);
      assert.match(String(logs.mock.calls[0].arguments[0]), /dailyRevenue/);
    }
  } finally { logs.mock.restore(); }
});
