import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluatePromotion } from '../promotion-calculation';
import { PromotionsService } from '../promotions.service';

const code = {
  isActive: true,
  startAt: new Date('2026-11-13T00:00:00Z'),
  endAt: new Date('2026-11-20T00:00:00Z'),
  discountType: 'PERCENT' as const,
  discountValue: 15n,
  maxDiscountAmount: null,
  minOrderAmount: 0n,
  usageLimit: null,
  usedCount: 0,
};

test('PB-08a BR-36/37/38 percent discount rounds down and checks boundaries', () => {
  assert.deepEqual(evaluatePromotion(code, 101n, new Date('2026-11-13T00:00:00Z')), { eligible: true, discount: 15n });
  assert.deepEqual(evaluatePromotion({ ...code, maxDiscountAmount: 10n }, 101n, new Date('2026-11-20T00:00:00Z')), { eligible: true, discount: 10n });
  assert.equal(evaluatePromotion(code, 101n, new Date('2026-11-12T23:59:59Z')).eligible, false);
  assert.equal(evaluatePromotion({ ...code, usedCount: 1, usageLimit: 1 }, 101n, new Date('2026-11-14T00:00:00Z')).eligible, false);
  assert.deepEqual(evaluatePromotion({ ...code, minOrderAmount:101n },101n,new Date('2026-11-14T00:00:00Z')),
    {eligible:true,discount:15n},'BR-36 subtotal equal to minimum is valid');
  assert.equal(evaluatePromotion({ ...code, minOrderAmount:102n },101n,new Date('2026-11-14T00:00:00Z')).eligible,false);
  assert.equal(evaluatePromotion({ ...code, isActive:false },101n,new Date('2026-11-14T00:00:00Z')).eligible,false);
  assert.equal(evaluatePromotion(code,101n,new Date('2026-11-20T00:00:01Z')).eligible,false);
});

test('PB-08a BR-38 fixed discount never exceeds subtotal', () => {
  assert.deepEqual(evaluatePromotion({ ...code, discountType: 'FIXED', discountValue: 500n }, 100n,
    new Date('2026-11-14T00:00:00Z')), { eligible: true, discount: 100n });
});

test('PB-08a BR-37 negative subtotal never yields a negative discount', () => {
  assert.deepEqual(evaluatePromotion(code,-1n,new Date('2026-11-14T00:00:00Z')),
    {eligible:false,discount:0n});
});

test('PB-08a BR-36 invalid calendar date and out-of-range usage limit return validation errors', () => {
  const service = new PromotionsService({} as never);
  const input = { code:'SAVE', discountType:'PERCENT', discountValue:10,
    startAt:'2026-11-13T00:00:00Z', endAt:'2026-11-20T00:00:00Z' };
  for (const bad of [{usageLimit:2147483648},{startAt:'2026-02-30T00:00:00Z'}]) {
    assert.throws(() => (service as any).validate({...input,...bad}),
      (error:any) => error.getResponse?.().code === 'VALIDATION_ERROR');
  }
});
