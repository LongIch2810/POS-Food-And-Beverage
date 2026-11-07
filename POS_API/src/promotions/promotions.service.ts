import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { uuidPattern } from '../http/request-validation';
import { evaluatePromotion } from './promotion-calculation';

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
    const params: unknown[] = [store];
    let where = 'store_id=$1';
    if (query.isActive !== undefined) { params.push(query.isActive === 'true'); where += ` AND is_active=$${params.length}`; }
    if (query.q !== undefined) { params.push(`%${query.q}%`); where += ` AND (code ILIKE $${params.length} OR name ILIKE $${params.length})`; }
    const [{ count }] = await this.db.query(`SELECT count(*)::int AS count FROM promotion_codes WHERE ${where}`, params);
    if (after) { params.push(after.createdAt, after.id); where += ` AND (created_at,id)<($${params.length - 1}::timestamptz,$${params.length}::uuid)`; }
    params.push(limit + 1);
    const rows = await this.db.query(`SELECT *,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time
      FROM promotion_codes WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT $${params.length}`, params);
    const selected = rows.slice(0, limit);
    const last = selected.at(-1);
    const nextCursor = rows.length > limit && last ? Buffer.from(JSON.stringify({ scope, createdAt: last.cursor_time, id: last.id })).toString('base64url') : null;
    return { data: selected.map((row: any) => this.view(row)), meta: { limit, nextCursor, total: count } };
  }

  async create(user: UserSummary, input: Input) {
    const store = this.store(user);
    const x = this.validate(input);
    try {
      const [row] = await this.db.query(`INSERT INTO promotion_codes
        (id,store_id,code,name,discount_type,discount_value,max_discount_amount,min_order_amount,start_at,end_at,usage_limit,is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [randomUUID(), store, x.code, x.name, x.kind, x.discount.toString(), x.cap?.toString() ?? null,
        x.minimum?.toString() ?? null, x.start, x.end, x.usage, x.active]);
      return this.view(row);
    } catch (error: any) {
      if (error.code === '23505') throw httpError(409, 'DUPLICATE_PROMOTION_CODE', 'Mã giảm giá đã tồn tại.');
      throw error;
    }
  }

  async patch(user: UserSummary, id: string, input: Input) {
    const store = this.store(user);
    return this.db.transaction(async manager => {
      const [previous] = await manager.query('SELECT * FROM promotion_codes WHERE id=$1 AND store_id=$2 FOR UPDATE', [id, store]);
      if (!previous) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy mã giảm giá.');
      const x = this.validate(input, previous);
      try {
        const [rows] = await manager.query(`UPDATE promotion_codes SET code=$3,name=$4,discount_type=$5,discount_value=$6,
          max_discount_amount=$7,min_order_amount=$8,start_at=$9,end_at=$10,usage_limit=$11,is_active=$12,updated_at=now()
          WHERE id=$1 AND store_id=$2 RETURNING *`, [id, store, x.code, x.name, x.kind, x.discount.toString(),
            x.cap?.toString() ?? null, x.minimum?.toString() ?? null, x.start, x.end, x.usage, x.active]);
        return this.view(rows[0]);
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
