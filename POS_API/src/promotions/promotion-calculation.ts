export interface PromotionTerms {
  isActive: boolean;
  startAt: Date;
  endAt: Date;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: bigint;
  maxDiscountAmount: bigint | null;
  minOrderAmount: bigint;
  usageLimit: number | null;
  usedCount: number;
}

export function evaluatePromotion(terms: PromotionTerms, subtotal: bigint, now: Date):
  { eligible: boolean; discount: bigint } {
  if (!terms.isActive || subtotal < 0n || now < terms.startAt || now > terms.endAt || subtotal < terms.minOrderAmount ||
      (terms.usageLimit !== null && terms.usedCount >= terms.usageLimit)) {
    return { eligible: false, discount: 0n };
  }
  const raw = terms.discountType === 'PERCENT'
    ? subtotal * terms.discountValue / 100n
    : terms.discountValue;
  const capped = terms.discountType === 'PERCENT' && terms.maxDiscountAmount !== null && raw > terms.maxDiscountAmount
    ? terms.maxDiscountAmount : raw;
  return { eligible: true, discount: capped > subtotal ? subtotal : capped };
}
