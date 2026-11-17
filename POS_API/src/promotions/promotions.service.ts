import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, ILike } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { uuidPattern } from '../http/request-validation';
import { evaluatePromotion } from './promotion-calculation';
import { PromotionCode } from './entities/promotion-code.entity';

const invalid = () => httpError(422, 'VALIDATION_ERROR', 'Dữ liệu mã giảm giá không hợp lệ.');
const money = (value: unknown, nullable = false): bigint | null => {
  if (value == null && nullable) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000_000) throw invalid();
  return BigInt(value);
};
const isoDate = (value: unknown): Date => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)) throw invalid();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,19) !== value.slice(0,19)) throw invalid();
  return date;
};
type Input = Record<string, unknown>;

@Injectable()
export class PromotionsService {
  constructor(private readonly db: DataSource) {}

  private store(user: UserSummary): string {
    if (!user.storeId) throw httpError(403, 'PERMISSION_DENIED', 'Không có quyền truy cập mã giảm giá.');
    return user.storeId;
  }

  private view(row: any) {
    return { id: row.id, code: row.code, name: row.name, discountType: row.discount_type,
      discountValue: Number(row.discount_value), maxDiscountAmount: row.max_discount_amount == null ? null : Number(row.max_discount_amount),
      minOrderAmount: row.min_order_amount == null ? null : Number(row.min_order_amount),
      startAt: new Date(row.start_at).toISOString(), endAt: new Date(row.end_at).toISOString(),
      usageLimit: row.usage_limit, usedCount: row.used_count, isActive: row.is_active,
      createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
  }

  private validate(input: Input, previous?: any) {
    const allowed = ['code', 'name', 'discountType', 'discountValue', 'maxDiscountAmount', 'minOrderAmount',
      'startAt', 'endAt', 'usageLimit', 'isActive'];
    if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.keys(input).length ||
        Object.keys(input).some(key => !allowed.includes(key))) throw invalid();
    if (previous?.used_count > 0 && Object.keys(input).some(key => key !== 'name' && key !== 'isActive')) {
      throw httpError(409, 'PROMOTION_ALREADY_USED', 'Mã đã dùng chỉ được đổi tên hoặc trạng thái.');
    }
    const code = input.code === undefined ? previous?.code : typeof input.code === 'string' ? input.code.trim().toUpperCase() : null;
    const name = input.name === undefined ? previous?.name ?? null : input.name === null ? null : typeof input.name === 'string' ? input.name.trim() : false;
    const kind = input.discountType ?? previous?.discount_type;
    const discount = input.discountValue === undefined ? (previous ? BigInt(previous.discount_value) : null) : money(input.discountValue);
    const cap = input.maxDiscountAmount === undefined ? previous?.max_discount_amount == null ? null : BigInt(previous.max_discount_amount) : money(input.maxDiscountAmount, true);
    const minimum = input.minOrderAmount === undefined ? previous?.min_order_amount == null ? null : BigInt(previous.min_order_amount) : money(input.minOrderAmount, true);
    const start = input.startAt === undefined ? previous?.start_at ? new Date(previous.start_at) : null : isoDate(input.startAt);
    const end = input.endAt === undefined ? previous?.end_at ? new Date(previous.end_at) : null : isoDate(input.endAt);
    const usage = input.usageLimit === undefined ? previous?.usage_limit ?? null : input.usageLimit;
    const active = input.isActive === undefined ? previous?.is_active ?? true : input.isActive;
    if (!code || code.length > 50 || name === false || (typeof name === 'string' && name.length > 150) ||
        (kind !== 'PERCENT' && kind !== 'FIXED') || discount == null || discount <= 0n ||
        (kind === 'PERCENT' && discount > 100n) || (kind === 'FIXED' && cap !== null) ||
        (cap !== null && cap <= 0n) || start == null || end == null || end <= start ||
        (usage !== null && (!Number.isInteger(usage) || (usage as number) <= 0 || (usage as number) > 2147483647)) || typeof active !== 'boolean') throw invalid();
    return { code, name, kind, discount, cap, minimum, start, end, usage, active };
  }

  async list(user: UserSummary, query: Record<string, unknown>) {
    const store = this.store(user);
    if (Object.keys(query).some(k => !['limit','cursor','isActive','q'].includes(k))) throw invalid();
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw invalid();
    if (query.isActive !== undefined && query.isActive !== 'true' && query.isActive !== 'false') throw invalid();
    if (query.q !== undefined && (typeof query.q !== 'string' || query.q.length > 100)) throw invalid();
    const scope = JSON.stringify([store, query.isActive ?? null, query.q ?? null]);
    let after: { createdAt: string; id: string } | null = null;
    if (query.cursor !== undefined) {
      try {
        if (typeof query.cursor !== 'string' || query.cursor.length > 1024) throw invalid();
        const value = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
        if (value.scope !== scope || typeof value.createdAt !== 'string' || typeof value.id !== 'string' ||
            !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(value.createdAt) ||
            !Number.isFinite(new Date(value.createdAt).getTime()) ||
            new Date(value.createdAt).toISOString().slice(0,19) !== value.createdAt.slice(0,19) ||
            !uuidPattern.test(value.id)) throw invalid();
        after = value;
      } catch { throw invalid(); }
    }
    const base = { store_id: store, ...(query.isActive !== undefined ? { is_active: query.isActive === 'true' } : {}) };
    const where = query.q !== undefined ? [{ ...base, code: ILike(`%${query.q}%`) }, { ...base, name: ILike(`%${query.q}%`) }] : base;
    const count = await this.db.getRepository(PromotionCode).count({ where });
    // QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()
    const builder = this.db.getRepository(PromotionCode).createQueryBuilder('p').where('p.store_id = :store', { store });
    if (query.isActive !== undefined) builder.andWhere('p.is_active = :active', { active: query.isActive === 'true' });
    if (query.q !== undefined) builder.andWhere('(p.code ILIKE :q OR p.name ILIKE :q)', { q: `%${query.q}%` });
    if (after) builder.andWhere('(p.created_at, p.id) < (CAST(:createdAt AS timestamptz), CAST(:id AS uuid))', after);
    const { raw, entities } = await builder
      .addSelect(`to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`, 'cursor_time')
      .orderBy('p.created_at', 'DESC').addOrderBy('p.id', 'DESC').limit(limit + 1).getRawAndEntities();
    const selected = entities.slice(0, limit);
    const last = selected.at(-1);
    const nextCursor = entities.length > limit && last ? Buffer.from(JSON.stringify({ scope, createdAt: raw[selected.length - 1].cursor_time, id: last.id })).toString('base64url') : null;
    return { data: selected.map(row => this.view(row)), meta: { limit, nextCursor, total: count } };
  }

  async create(user: UserSummary, input: Input) {
    const store = this.store(user);
    const x = this.validate(input);
    try {
      const repo = this.db.getRepository(PromotionCode);
      const id = randomUUID();
      await repo.insert({
        id, store_id: store, code: x.code, name: x.name as string | null, discount_type: x.kind,
        discount_value: x.discount.toString(), max_discount_amount: x.cap?.toString() ?? null,
        min_order_amount: x.minimum?.toString() ?? null, start_at: x.start, end_at: x.end,
        usage_limit: x.usage as number | null, is_active: x.active,
      });
      return this.view(await repo.findOneByOrFail({ id }));
    } catch (error: any) {
      if (error.code === '23505') throw httpError(409, 'DUPLICATE_PROMOTION_CODE', 'Mã giảm giá đã tồn tại.');
      throw error;
    }
  }

  async patch(user: UserSummary, id: string, input: Input) {
    const store = this.store(user);
    return this.db.transaction(async manager => {
      const previous = await manager.getRepository(PromotionCode).findOne({ where: { id, store_id: store }, lock: { mode: 'pessimistic_write' } });
      if (!previous) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy mã giảm giá.');
      const x = this.validate(input, previous);
      try {
        const result = await manager.getRepository(PromotionCode).update({ id, store_id: store }, {
          code: x.code, name: x.name as string | null, discount_type: x.kind, discount_value: x.discount.toString(),
          max_discount_amount: x.cap?.toString() ?? null, min_order_amount: x.minimum?.toString() ?? null,
          start_at: x.start, end_at: x.end, usage_limit: x.usage as number | null, is_active: x.active,
          updated_at: () => 'now()',
        }, { returning: '*' });
        return this.view(result.raw[0]);
      } catch (error: any) {
        if (error.code === '23505') throw httpError(409, 'DUPLICATE_PROMOTION_CODE', 'Mã giảm giá đã tồn tại.');
        throw error;
      }
    });
  }

  calculate(row: any, subtotal: bigint, now: Date) {
    return evaluatePromotion({ isActive: row.is_active, startAt: new Date(row.start_at), endAt: new Date(row.end_at),
      discountType: row.discount_type, discountValue: BigInt(row.discount_value),
      maxDiscountAmount: row.max_discount_amount == null ? null : BigInt(row.max_discount_amount),
      minOrderAmount: row.min_order_amount == null ? 0n : BigInt(row.min_order_amount),
      usageLimit: row.usage_limit, usedCount: row.used_count }, subtotal, now);
  }
}
