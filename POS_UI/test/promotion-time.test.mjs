import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fromShopLocal, toShopLocal } from '../src/features/settings/promotionTime.ts';
import { formatDateTimeVN } from '../src/utils/formatters.ts';

test('BR-36 promotion editor uses Vietnam time regardless of device timezone', () => {
  assert.equal(toShopLocal('2026-11-13T02:00:01Z'),'2026-11-13T09:00');
  assert.equal(fromShopLocal('2026-11-13T09:00'),'2026-11-13T02:00:00.000Z');
  assert.equal(toShopLocal('2026-11-13T16:30:00Z'),'2026-11-13T23:30');
  assert.equal(formatDateTimeVN('2026-11-13T02:00:01Z'),'13/11/2026 09:00');
});
