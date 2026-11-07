import { request } from '../http/client';

export interface Promotion {
  id: string; code: string; name: string | null; discountType: 'PERCENT'|'FIXED'; discountValue: number;
  maxDiscountAmount: number | null; minOrderAmount: number | null; startAt: string; endAt: string;
  usageLimit: number | null; usedCount: number; isActive: boolean;
}
export type PromotionInput = Omit<Promotion,'id'|'usedCount'>;
type Page = { data: Promotion[]; meta: { nextCursor: string | null } };

export const promotionService = {
  async list(): Promise<Promotion[]> {
    const rows: Promotion[] = [];
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({ limit:'100' });
      if (cursor) query.set('cursor',cursor);
      const page = await request<Page>(`promotion-codes?${query}`,'GET',undefined,true,true);
      rows.push(...page.data); cursor = page.meta.nextCursor;
    } while (cursor);
    return rows;
  },
  create: (input: PromotionInput) => request<Promotion>('promotion-codes','POST',input),
  patch: (id: string, input: Partial<PromotionInput>) => request<Promotion>(`promotion-codes/${encodeURIComponent(id)}`,'PATCH',input),
};
