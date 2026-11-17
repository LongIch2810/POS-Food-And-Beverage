import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, EntityManager, In, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { User } from '../auth/entities/user.entity';
import { httpError } from '../http/http-error';
import { uuidPattern } from '../http/request-validation';
import { CategoryTopping } from '../menu/entities/category-topping.entity';
import { ProductSize } from '../menu/entities/product-size.entity';
import { Topping } from '../menu/entities/topping.entity';
import { Branch } from '../organization/entities/branch.entity';
import { DiningTable } from '../organization/entities/dining-table.entity';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { BranchIngredientStock } from '../inventory/entities/branch-ingredient-stock.entity';
import { ProductSizeIngredient } from '../inventory/entities/product-size-ingredient.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { ToppingIngredient } from '../inventory/entities/topping-ingredient.entity';
import { PromotionCode } from '../promotions/entities/promotion-code.entity';
import { CashReconciliation } from '../shifts/entities/cash-reconciliation.entity';
import { WorkShift } from '../shifts/entities/work-shift.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { InvoiceItemTopping } from './entities/invoice-item-topping.entity';
import { InvoicePromotionCode } from './entities/invoice-promotion-code.entity';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';
import { TransferAttempt } from './entities/transfer-attempt.entity';
import { AddInvoiceItemDto, CreateInvoiceDto, PatchInvoiceItemDto } from './http/sales.dto';
import { CashPaymentDto, InvoicePricing, PaymentDto, PaymentPreviewDto } from './http/payment.dto';
import { evaluatePromotion } from '../promotions/promotion-calculation';

const MAX_MONEY = 1_000_000_000_000n;
type Row = Record<string, any>;
export type InvoiceReadScope = { storeId: string; branchId: string | null; cashierId: string | null };

function money(value: string | number | bigint): number {
  const amount = BigInt(value);
  if (amount < 0n || amount > MAX_MONEY) throw httpError(422, 'VALIDATION_ERROR', 'Số tiền vượt giới hạn cho phép.');
  return Number(amount);
}

function scope(user: UserSummary): string {
  if (!user.storeId) throw httpError(403, 'PERMISSION_DENIED', 'Không có quyền truy cập dữ liệu vận hành.');
  return user.storeId;
}

function invoiceCode(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return 'HD' + Array.from(randomBytes(8), byte => alphabet[byte % alphabet.length]).join('');
}

@Injectable()
export class SalesService {
  constructor(private readonly db: DataSource) {}

  readScope(user: UserSummary, requestedBranchId?: string): InvoiceReadScope {
    const storeId = scope(user);
    if (user.permissions.includes('branch.access_all')) return { storeId, branchId: requestedBranchId ?? null, cashierId: null };
    if (!user.branchId) throw httpError(403, 'PERMISSION_DENIED', 'Tài khoản chưa được gán chi nhánh.');
    return { storeId, branchId: user.branchId, cashierId: user.permissions.includes('invoice.read_branch') ? null : user.id };
  }

  private async shift(manager: EntityManager, user: UserSummary): Promise<Row> {
    // Shift first, then branch: same lock order as the old FOR UPDATE OF s,b (PB-07), held until commit.
    const shift = await manager.getRepository(WorkShift).findOne({ where: { user_id: user.id, status: 'OPEN', shift_type: 'CASHIER' },
      select: { id: true, branch_id: true }, lock: { mode: 'pessimistic_write' } });
    const branch = shift ? await manager.getRepository(Branch).findOne({ where: { id: shift.branch_id },
      select: { id: true, store_id: true, is_active: true }, lock: { mode: 'pessimistic_write' } }) : null;
    if (!shift || !branch || branch.store_id !== scope(user)) throw httpError(409, 'SHIFT_NOT_OPEN', 'Bạn cần mở ca thu ngân để bán hàng.');
    return { id: shift.id, branch_id: shift.branch_id, store_id: branch.store_id, is_active: branch.is_active };
  }

  private async invoice(manager: EntityManager, user: UserSummary, id: string, lock = false): Promise<Row> {
    const invoice = await manager.getRepository(Invoice).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) });
    const branch = invoice ? await manager.getRepository(Branch).findOne({ where: { id: invoice.branch_id }, select: { id: true, store_id: true } }) : null;
    const row: Row | null = invoice && branch ? { ...invoice, store_id: branch.store_id } : null;
    if (!row || row.store_id !== scope(user) || (!user.permissions.includes('branch.access_all') && row.branch_id !== user.branchId))
      throw httpError(404, 'NOT_FOUND', 'Không tìm thấy hóa đơn.');
    return row;
  }

  private async detail(manager: EntityManager, row: Row) {
    const pricing = row.status === 'OPEN' ? await this.evaluateInvoicePricing(manager, row.id) : null;
    const shift = (await manager.getRepository(WorkShift).findOne({ where: { id: row.work_shift_id }, relations: { user: true },
      select: { id: true, status: true, user_id: true, user: { id: true, full_name: true } } }))!;
    const table = row.table_id ? await manager.getRepository(DiningTable).findOne({ where: { id: row.table_id }, select: { id: true, name: true } }) : null;
    const payment = await manager.getRepository(Payment).findOne({ where: { invoice_id: row.id }, select: { id: true, method: true } });
    const promotions: Row[] = await manager.getRepository(InvoicePromotionCode).find({ where: { invoice_id: row.id },
      select: { invoice_id: true, code: true, discount_amount: true } });
    const items: Row[] = await manager.getRepository(InvoiceItem).find({ where: { invoice_id: row.id }, order: { created_at: 'ASC', id: 'ASC' } });
    const toppings: Row[] = items.length ? await manager.getRepository(InvoiceItemTopping).find({
      where: { invoice_item_id: In(items.map(i => i.id)) }, order: { created_at: 'ASC', id: 'ASC' } }) : [];
    return {
      id: row.id, invoiceCode: row.invoice_code, branchId: row.branch_id, workShiftId: row.work_shift_id,
      workShiftStatus: shift.status, cashierId: shift.user_id, cashierName: shift.user!.full_name,
      tableName: table?.name ?? null, paymentMethod: payment?.method ?? null,
      tableId: row.table_id, orderType: row.order_type, status: row.status,
      subtotal: money(pricing?.subtotal ?? row.subtotal), discountAmount: money(pricing?.discountAmount ?? row.discount_amount), totalAmount: money(pricing?.totalAmount ?? row.total_amount),
      promotionCode: promotions[0] ? {code:promotions[0].code, applicable:pricing?.promotionApplicable ?? true} : null,
      note: row.note, cancelReason: row.cancel_reason, cancelledAt: row.cancelled_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
      items: items.map(item => ({
        id: item.id, productSizeId: item.product_size_id, productName: item.product_name,
        sizeName: item.size_name, unitPrice: money(item.unit_price), quantity: item.quantity,
        lineTotal: money(item.line_total), note: item.note,
        toppings: toppings.filter(t => t.invoice_item_id === item.id).map(t => ({
          id: t.id, toppingId: t.topping_id, toppingName: t.topping_name, unitPrice: money(t.unit_price),
          quantity: t.quantity, lineTotal: money(t.line_total),
        })),
      })),
    };
  }

  async get(user: UserSummary, id: string) {
    const row = await this.invoice(this.db.manager, user, id);
    const cashierId = this.readScope(user).cashierId;
    if (cashierId) {
      const shift = await this.db.getRepository(WorkShift).findOne({ where: { id: row.work_shift_id }, select: { id: true, user_id: true } });
      if (shift?.user_id !== cashierId) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy hóa đơn.');
    }
    return this.detail(this.db.manager, row);
  }

  async list(user: UserSummary, query: Record<string, unknown>) {
    const allowed = ['status', 'limit', 'cursor', 'branchId', 'cashierId', 'tableId', 'from', 'to', 'sort'];
    if (Object.keys(query).some(key => !allowed.includes(key)) || (query.status !== undefined && !['OPEN', 'PAID', 'CANCELLED', 'ALL'].includes(query.status as string))
      || (query.sort !== undefined && query.sort !== '-createdAt')
      || [query.cashierId, query.tableId].some(id => id !== undefined && (typeof id !== 'string' || !uuidPattern.test(id))))
      throw httpError(422, 'VALIDATION_ERROR', 'Bộ lọc hóa đơn không hợp lệ.');
    const rawLimit = query.limit ?? '20';
    if (typeof rawLimit !== 'string' || !/^[1-9]\d{0,2}$/.test(rawLimit)) throw httpError(422, 'VALIDATION_ERROR', 'Giới hạn danh sách không hợp lệ.');
    const limit = Math.min(Number(rawLimit), 100);
    const allBranches = user.permissions.includes('branch.access_all');
    if (query.branchId !== undefined && (typeof query.branchId !== 'string' || !uuidPattern.test(query.branchId)))
      throw httpError(422, 'VALIDATION_ERROR', 'Chi nhánh không hợp lệ.');
    const branchId = allBranches ? (typeof query.branchId === 'string' ? query.branchId.toLowerCase() : undefined) : user.branchId;
    if (!allBranches && !branchId) throw httpError(403, 'PERMISSION_DENIED', 'Tài khoản chưa được gán chi nhánh.');
    if (branchId !== undefined && (typeof branchId !== 'string' || !uuidPattern.test(branchId)))
      throw httpError(422, 'VALIDATION_ERROR', 'Chi nhánh không hợp lệ.');
    const { storeId, cashierId } = this.readScope(user, branchId ?? undefined);
    const parseDate = (value: unknown): string | null => {
      if (value === undefined) return null;
      if (typeof value !== 'string') throw httpError(422, 'VALIDATION_ERROR', 'Bộ lọc hóa đơn không hợp lệ.');
      const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?Z$/.exec(value);
      const date = new Date(value);
      if (!match || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== match[1])
        throw httpError(422, 'VALIDATION_ERROR', 'Bộ lọc hóa đơn không hợp lệ.');
      return `${match[1]}.${(match[2] ?? '').replace(/0+$/, '').padEnd(6, '0')}Z`;
    };
    const from = parseDate(query.from), to = parseDate(query.to);
    if (from && to && from.slice(0, -1).padEnd(Math.max(from.length, to.length), '0') >= to.slice(0, -1).padEnd(Math.max(from.length, to.length), '0')) throw httpError(422, 'VALIDATION_ERROR', 'Bộ lọc hóa đơn không hợp lệ.');
    const sqlDate = (value: string | null): string | null => {
      if (!value) return null;
      const [whole, fraction] = value.slice(0, -1).split('.');
      const micros = Number(fraction.slice(0, 6)) + (/[1-9]/.test(fraction.slice(6)) ? 1 : 0);
      if (micros === 1_000_000) return `${new Date(Date.parse(`${whole}Z`) + 1000).toISOString().slice(0, 19)}.000000Z`;
      return `${whole}.${String(micros).padStart(6, '0')}Z`;
    };
    const tableId = typeof query.tableId === 'string' ? query.tableId.toLowerCase() : null;
    const status = query.status ?? 'OPEN';
    const cashierFilter = typeof query.cashierId === 'string' ? query.cashierId.toLowerCase() : null;
    const cursorScope = JSON.stringify([1, user.id, storeId, branchId ?? null, cashierId, status, from, to, tableId, cashierFilter, '-createdAt']);
    let after: { createdAt: string; id: string } | null = null;
    if (query.cursor !== undefined) {
      if (typeof query.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,1024}$/.test(query.cursor))
        throw httpError(422, 'VALIDATION_ERROR', 'Cursor không hợp lệ.');
      try {
        const parsed = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
        if (parsed.scope !== cursorScope || typeof parsed.createdAt !== 'string' || parseDate(parsed.createdAt) !== parsed.createdAt
          || typeof parsed.id !== 'string' || !uuidPattern.test(parsed.id)) throw new Error();
        after = parsed;
      } catch { throw httpError(422, 'VALIDATION_ERROR', 'Cursor không hợp lệ.'); }
    }
    const filter = <T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, withCursor: boolean) => {
      qb.where('b.store_id = :storeId', { storeId });
      if (status !== 'ALL') qb.andWhere('i.status = :status', { status });
      if (tableId) qb.andWhere('i.table_id = :tableId', { tableId });
      if (from) qb.andWhere('i.created_at >= CAST(:fromAt AS timestamptz)', { fromAt: sqlDate(from) });
      if (to) qb.andWhere('i.created_at < CAST(:toAt AS timestamptz)', { toAt: sqlDate(to) });
      if (cashierFilter) qb.andWhere('EXISTS (SELECT 1 FROM work_shifts s2 WHERE s2.id = i.work_shift_id AND s2.user_id = :cashierFilter)', { cashierFilter });
      if (branchId) qb.andWhere('i.branch_id = :branchId', { branchId });
      if (withCursor && after) qb.andWhere('(i.created_at, i.id) < (CAST(:afterCreatedAt AS timestamptz), CAST(:afterId AS uuid))', { afterCreatedAt: after.createdAt, afterId: after.id });
      if (cashierId) qb.andWhere('EXISTS (SELECT 1 FROM work_shifts s3 WHERE s3.id = i.work_shift_id AND s3.user_id = :cashierId)', { cashierId });
      return qb;
    };
    // QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()
    const rows: Row[] = await filter(this.db.createQueryBuilder().from(Invoice, 'i').innerJoin(Branch, 'b', 'b.id = i.branch_id')
      .innerJoin(WorkShift, 's', 's.id = i.work_shift_id').innerJoin(User, 'u', 'u.id = s.user_id')
      .leftJoin(DiningTable, 't', 't.id = i.table_id').leftJoin(Payment, 'p', 'p.invoice_id = i.id')
      .select('i.id', 'id').addSelect('i.invoice_code', 'invoice_code').addSelect('i.branch_id', 'branch_id').addSelect('i.table_id', 'table_id')
      .addSelect('i.order_type', 'order_type').addSelect('i.status', 'status').addSelect('i.total_amount', 'total_amount')
      .addSelect('i.created_at', 'created_at').addSelect('i.work_shift_id', 'work_shift_id')
      .addSelect('s.status', 'shift_status').addSelect('s.user_id', 'cashier_id').addSelect('u.full_name', 'cashier_name')
      .addSelect('t.name', 'table_name').addSelect('p.method', 'payment_method')
      .addSelect('(SELECT COALESCE(SUM(quantity),0)::int FROM invoice_items WHERE invoice_id = i.id)', 'item_count')
      .addSelect(`to_char(i.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`, 'cursor_created_at'), true)
      .orderBy('i.created_at', 'DESC').addOrderBy('i.id', 'DESC').limit(limit + 1).getRawMany();
    // QueryBuilder: joins and DISTINCT over many rows; separate find() calls would load every row
    const total = await filter(this.db.createQueryBuilder().from(Invoice, 'i').innerJoin(Branch, 'b', 'b.id = i.branch_id'), false).getCount();
    // QueryBuilder: joins and DISTINCT over many rows; separate find() calls would load every row
    const tablesQuery = this.db.createQueryBuilder().from(DiningTable, 't').innerJoin(Invoice, 'i', 'i.table_id = t.id')
      .innerJoin(Branch, 'b', 'b.id = i.branch_id').innerJoin(WorkShift, 's', 's.id = i.work_shift_id')
      .select('t.id', 'id').addSelect('t.name', 'name').distinct(true).where('b.store_id = :storeId', { storeId });
    // QueryBuilder: joins and DISTINCT over many rows; separate find() calls would load every row
    const cashiersQuery = this.db.createQueryBuilder().from(User, 'u').innerJoin(WorkShift, 's', 's.user_id = u.id')
      .innerJoin(Invoice, 'i', 'i.work_shift_id = s.id').innerJoin(Branch, 'b', 'b.id = i.branch_id')
      .select('u.id', 'id').addSelect('u.full_name', 'name').distinct(true).where('b.store_id = :storeId', { storeId });
    if (branchId) { tablesQuery.andWhere('i.branch_id = :branchId', { branchId }); cashiersQuery.andWhere('i.branch_id = :branchId', { branchId }); }
    if (cashierId) { tablesQuery.andWhere('s.user_id = :cashierId', { cashierId }); cashiersQuery.andWhere('s.user_id = :cashierId', { cashierId }); }
    const tables: Row[] = await tablesQuery.orderBy('t.name').addOrderBy('t.id').getRawMany();
    const cashiers: Row[] = await cashiersQuery.orderBy('u.full_name').addOrderBy('u.id').getRawMany();
    const selected = rows.slice(0, limit);
    const last = selected.at(-1);
    return {
      data: selected.map(row => ({ id: row.id, invoiceCode: row.invoice_code, branchId: row.branch_id,
        tableId: row.table_id, orderType: row.order_type, status: row.status, totalAmount: money(row.total_amount),
        itemCount: row.item_count, createdAt: row.created_at.toISOString(), workShiftId: row.work_shift_id,
        workShiftStatus: row.shift_status, cashierId: row.cashier_id, cashierName: row.cashier_name,
        tableName: row.table_name, paymentMethod: row.payment_method })),
      meta: { limit, nextCursor: rows.length > limit && last ? Buffer.from(JSON.stringify({ scope: cursorScope,
        createdAt: last.cursor_created_at, id: last.id })).toString('base64url') : null, total,
        filterOptions: { tables, cashiers } },
    };
  }

  async create(user: UserSummary, input: CreateInvoiceDto) {
    if ((input.orderType === 'DINE_IN' && !input.tableId) || (input.orderType === 'TAKEAWAY' && input.tableId))
      throw httpError(422, input.orderType === 'DINE_IN' ? 'TABLE_REQUIRED' : 'VALIDATION_ERROR', 'Thông tin bàn không hợp lệ.');
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.db.transaction(async manager => {
          const shift = await this.shift(manager, user);
          if (!shift.is_active) throw httpError(409, 'BRANCH_INACTIVE', 'Chi nhánh đã ngưng hoạt động.');
          if (input.tableId) await this.table(manager, user, input.tableId, shift.branch_id);
          const id = randomUUID();
          await manager.getRepository(Invoice).insert({ id, branch_id: shift.branch_id, work_shift_id: shift.id, table_id: input.tableId ?? null,
            invoice_code: invoiceCode(), created_by: user.id, order_type: input.orderType, status: 'OPEN', subtotal: '0', discount_amount: '0',
            total_amount: '0', note: input.note ?? null });
          return this.detail(manager, await manager.getRepository(Invoice).findOneByOrFail({ id }));
        });
      } catch (error: any) {
        if (error?.code === '23505' && error?.constraint === 'invoices_invoice_code_key') continue;
        if (error?.code === '23505' && error?.constraint === 'uq_invoices_table_open') {
          // uq_invoices_table_open only fires for a non-null table_id, so input.tableId is set here.
          const existing = await this.db.getRepository(Invoice).findOne({ where: { table_id: input.tableId!, status: 'OPEN' }, select: { id: true } });
          throw new HttpException({ code: 'TABLE_HAS_OPEN_INVOICE', message: 'Bàn đang có đơn mở.',
            details: existing ? [{ field: 'invoiceId', value: existing.id }] : [] }, 409);
        }
        throw error;
      }
    }
    throw httpError(409, 'CONFLICT', 'Không tạo được mã hóa đơn duy nhất. Vui lòng thử lại.');
  }

  private async table(manager: EntityManager, user: UserSummary, tableId: string, branchId: string) {
    // find()[0] keeps one statement and locks only dining_tables (FOR SHARE OF), not the LEFT JOIN side (M-20).
    const table = (await manager.getRepository(DiningTable).find({ where: { id: tableId }, relations: { branch: true },
      select: { id: true, branch_id: true, is_active: true, branch: { id: true, store_id: true } },
      lock: { mode: 'pessimistic_read', tables: ['dining_tables'] } }))[0];
    if (!table || table.branch?.store_id !== scope(user)) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy bàn.');
    if (table.branch_id !== branchId) throw httpError(422, 'INVOICE_BRANCH_MISMATCH', 'Bàn không thuộc chi nhánh của ca.');
    if (!table.is_active) throw httpError(409, 'TABLE_INACTIVE', 'Bàn đã ngưng dùng.');
  }

  private async writable(manager: EntityManager, user: UserSummary, id: string) {
    const shift = await this.shift(manager, user);
    const row = await this.invoice(manager, user, id, true);
    if (row.status !== 'OPEN') throw httpError(409, 'INVOICE_NOT_OPEN', 'Đơn không còn mở.');
    if (row.branch_id !== shift.branch_id || row.work_shift_id !== shift.id)
      throw httpError(409, 'SHIFT_NOT_OPEN', 'Đơn không thuộc ca thu ngân hiện tại.');
    if(await manager.getRepository(TransferAttempt).existsBy({invoice_id:id,status:'PENDING'}))throw httpError(409,'TRANSFER_PENDING','Đơn đang chờ chuyển khoản. Hủy chờ trước khi sửa hoặc thanh toán.');
    return row;
  }

  private async recalculate(manager: EntityManager, id: string) {
    const pricing=await this.evaluateInvoicePricing(manager,id);
    await manager.getRepository(Invoice).update({ id }, { subtotal: String(money(pricing.subtotal)), discount_amount: String(money(pricing.discountAmount)),
      total_amount: String(money(pricing.totalAmount)), updated_at: () => 'now()' });
    await manager.getRepository(InvoicePromotionCode).update({ invoice_id: id }, { discount_amount: String(money(pricing.discountAmount)) });
  }

  async evaluateInvoicePricing(manager: EntityManager, invoiceId: string): Promise<InvoicePricing> {
    // QueryBuilder: SUM of money read as text; Repository.sum() returns a float
    const sum=await manager.getRepository(InvoiceItem).createQueryBuilder('i').select('COALESCE(SUM(i.line_total),0)::bigint','subtotal')
      .where('i.invoice_id = :invoiceId',{invoiceId}).getRawOne();
    const subtotal=BigInt(sum.subtotal); money(subtotal);
    const applied=await manager.getRepository(InvoicePromotionCode).findOneBy({invoice_id:invoiceId});
    const promo=applied?await manager.getRepository(PromotionCode).findOneBy({id:applied.promotion_code_id}):null;
    const result=promo ? evaluatePromotion({isActive:promo.is_active,startAt:promo.start_at,endAt:promo.end_at,
      discountType:promo.discount_type,discountValue:BigInt(promo.discount_value),
      maxDiscountAmount:promo.max_discount_amount===null?null:BigInt(promo.max_discount_amount),
      minOrderAmount:BigInt(promo.min_order_amount??0),usageLimit:promo.usage_limit,usedCount:promo.used_count},subtotal,new Date())
      : {eligible:true,discount:0n};
    return {subtotal,discountAmount:result.discount,totalAmount:subtotal-result.discount,promotionCodeId:promo?.id??null,promotionApplicable:result.eligible};
  }

  async applyPromotion(user:UserSummary,invoiceId:string,code:string) {
    if(typeof code!=='string'||!code.trim()||code.trim().length>50)
      throw httpError(422,'VALIDATION_ERROR','Mã giảm giá không hợp lệ.');
    return this.db.transaction(async manager=>{
      const invoice=await this.writable(manager,user,invoiceId);
      if(await manager.getRepository(InvoicePromotionCode).existsBy({invoice_id:invoiceId}))
        throw httpError(409,'PROMOTION_ALREADY_APPLIED','Đơn đã có mã giảm giá. Bỏ mã cũ trước khi áp mã khác.');
      const promo=await manager.getRepository(PromotionCode).findOne({where:{store_id:scope(user),code:code.trim().toUpperCase()},lock:{mode:'pessimistic_write'}});
      if(!promo)throw httpError(404,'NOT_FOUND','Không tìm thấy mã giảm giá.');
      await manager.getRepository(InvoicePromotionCode).insert({invoice_id:invoiceId,promotion_code_id:promo.id,code:promo.code});
      const pricing=await this.evaluateInvoicePricing(manager,invoiceId);
      if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
      await this.recalculate(manager,invoiceId);
      return this.detail(manager,await this.invoice(manager,user,invoice.id));
    });
  }

  async removePromotion(user:UserSummary,invoiceId:string) {
    return this.db.transaction(async manager=>{
      await this.writable(manager,user,invoiceId);
      await manager.getRepository(InvoicePromotionCode).delete({invoice_id:invoiceId});
      await this.recalculate(manager,invoiceId);
      return this.detail(manager,await this.invoice(manager,user,invoiceId));
    });
  }

  async completeZero(user:UserSummary,invoiceId:string,key:string):Promise<boolean> {
    if(typeof key!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))
      throw new HttpException({code:'VALIDATION_ERROR',message:'Mã yêu cầu không hợp lệ.',details:[{location:'header',field:'Idempotency-Key',message:'Cần UUID v4 hợp lệ.'}]},422);
    const normalized=key.toLowerCase();
    return this.db.transaction(async manager=>{
      const row=await this.invoice(manager,user,invoiceId);
      // Serialize a key across the zero/payment/QR tables, which have separate unique indexes.
      // QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it
      await manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))','locked').fromDummy().setParameter('lockKey',normalized).getRawOne();
      const completed=await manager.getRepository(Invoice).find({where:{zero_completion_key:normalized},select:{id:true}});
      if(completed.length){
        if(completed[0].id===row.id)return true;
        throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
      }
      if(await manager.getRepository(Payment).existsBy({idempotency_key:normalized})||await manager.getRepository(TransferAttempt).existsBy({idempotency_key:normalized}))
        throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
      await this.writable(manager,user,invoiceId);
      if(!await manager.getRepository(InvoiceItem).existsBy({invoice_id:invoiceId}))throw httpError(422,'INVOICE_EMPTY','Đơn chưa có món để thanh toán.');
      const linked=await manager.getRepository(InvoicePromotionCode).findOneBy({invoice_id:invoiceId});
      if(linked)await manager.getRepository(PromotionCode).findOne({where:{id:linked.promotion_code_id},select:{id:true},lock:{mode:'pessimistic_write'}});
      const pricing=await this.evaluateInvoicePricing(manager,invoiceId);
      if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
      if(pricing.totalAmount!==0n)throw httpError(422,'ZERO_TOTAL_REQUIRED','Chỉ hoàn tất đơn có tổng tiền 0đ.');
      await manager.getRepository(Invoice).update({id:invoiceId},{zero_completion_key:normalized});
      await this.finalizeInvoice(manager,invoiceId,user.id);
      return false;
    });
  }

  async payCash(user:UserSummary,invoiceId:string,input:CashPaymentDto,key:string):Promise<PaymentDto> {
    if(!input||input.method!=='CASH'||Object.keys(input).some(field=>!['method','amount','tenderedAmount'].includes(field))
      ||![input.amount,input.tenderedAmount].every(value=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0&&value<=Number(MAX_MONEY)))
      throw httpError(422,'VALIDATION_ERROR','Dữ liệu thanh toán không hợp lệ.');
    if(typeof key!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))
      throw new HttpException({code:'VALIDATION_ERROR',message:'Mã yêu cầu không hợp lệ.',details:[{location:'header',field:'Idempotency-Key',message:'Cần UUID v4 hợp lệ.'}]},422);
    const normalized=key.toLowerCase();
    return this.db.transaction(async manager=>{
      const invoice=await this.invoice(manager,user,invoiceId);
      const hash=createHash('sha256').update(JSON.stringify({invoiceId:invoice.id,method:'CASH',amount:input.amount,
        tenderedAmount:input.tenderedAmount,transactionRef:null})).digest('hex');
      // QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it
      await manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))','locked').fromDummy().setParameter('lockKey',normalized).getRawOne();
      const previous=await manager.getRepository(Payment).findOneBy({idempotency_key:normalized});
      if(previous){
        if(previous.invoice_id!==invoice.id||previous.idempotency_request_hash!==hash)
          throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
        return this.cashPaymentView(previous,true);
      }
      if(await manager.getRepository(Invoice).existsBy({zero_completion_key:normalized})||await manager.getRepository(TransferAttempt).existsBy({idempotency_key:normalized}))
        throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
      await this.writable(manager,user,invoiceId);
      if(!await manager.getRepository(InvoiceItem).existsBy({invoice_id:invoiceId}))throw httpError(422,'INVOICE_EMPTY','Đơn chưa có món để thanh toán.');
      const linked=await manager.getRepository(InvoicePromotionCode).findOneBy({invoice_id:invoiceId});
      if(linked)await manager.getRepository(PromotionCode).findOne({where:{id:linked.promotion_code_id},select:{id:true},lock:{mode:'pessimistic_write'}});
      const pricing=await this.evaluateInvoicePricing(manager,invoiceId);
      if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
      if(pricing.totalAmount!==BigInt(input.amount))throw httpError(422,'PAYMENT_AMOUNT_MISMATCH','Khoản thanh toán không bằng tổng hóa đơn.');
      if(input.tenderedAmount<input.amount)throw httpError(422,'TENDERED_INSUFFICIENT','Tiền khách đưa chưa đủ để thanh toán.');
      // QueryBuilder: SUM of money read as text; Repository.sum() returns a float
      const reconciliation=await manager.getRepository(CashReconciliation).createQueryBuilder('r').select('r.opening_cash','opening_cash')
        .addSelect("COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE i.work_shift_id=r.work_shift_id AND i.status='PAID' AND p.method='CASH'),0)",'cash_sales')
        .where('r.work_shift_id = :shiftId',{shiftId:invoice.work_shift_id}).getRawOne();
      if(!reconciliation)throw httpError(500,'INTERNAL_ERROR','Không tìm thấy bản ghi đối soát của ca thu ngân.');
      if(BigInt(reconciliation.opening_cash)+BigInt(reconciliation.cash_sales)+BigInt(input.amount)>MAX_MONEY)
        throw httpError(422,'VALIDATION_ERROR','Số tiền vượt giới hạn cho phép.');
      const paymentId=randomUUID();
      await manager.getRepository(Payment).insert({id:paymentId,invoice_id:invoice.id,method:'CASH',amount:String(input.amount),tendered_amount:String(input.tenderedAmount),
        change_amount:String(input.tenderedAmount-input.amount),idempotency_key:normalized,idempotency_request_hash:hash,created_by:user.id});
      const payment=await manager.getRepository(Payment).findOneByOrFail({id:paymentId});
      await this.finalizeInvoice(manager,invoice.id,user.id);
      return this.cashPaymentView(payment,false);
    });
  }

  private cashPaymentView(row:Row,replayed:boolean):PaymentDto {
    return {paymentId:row.id,invoiceId:row.invoice_id,status:'PAID',method:'CASH',amount:money(row.amount),
      tenderedAmount:money(row.tendered_amount),changeAmount:money(row.change_amount),paidAt:row.paid_at.toISOString(),replayed};
  }

  async finalizeInvoice(manager:EntityManager,invoiceId:string,actorId:string|null):Promise<void> {
    const invoice=await manager.getRepository(Invoice).findOne({where:{id:invoiceId},lock:{mode:'pessimistic_write'}});
    if(!invoice||invoice.status!=='OPEN')throw httpError(409,'INVOICE_NOT_OPEN','Đơn không còn mở.');
    if(!await manager.getRepository(InvoiceItem).existsBy({invoice_id:invoiceId}))throw httpError(422,'INVOICE_EMPTY','Đơn chưa có món để thanh toán.');
    const linked=await manager.getRepository(InvoicePromotionCode).findOneBy({invoice_id:invoiceId});
    if(linked)await manager.getRepository(PromotionCode).findOne({where:{id:linked.promotion_code_id},select:{id:true},lock:{mode:'pessimistic_write'}});
    const pricing=await this.evaluateInvoicePricing(manager,invoiceId);
    if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
    // QueryBuilder: CTE or sub-query in one statement; find() cannot express it
    // Two grouped sub-queries replace UNION ALL; the sum stays in PostgreSQL numeric
    const requirements:Row[]=await manager.createQueryBuilder().select('g.id','ingredient_id').addSelect('COALESCE(pr.quantity, 0) + COALESCE(tr.quantity, 0)','quantity')
      .from(Ingredient,'g')
      .leftJoin(qb=>qb.select('r.ingredient_id','ingredient_id').addSelect('SUM(r.quantity * i.quantity)','quantity').from(InvoiceItem,'i')
        .innerJoin(ProductSizeIngredient,'r','r.product_size_id = i.product_size_id').where('i.invoice_id = :invoiceId').groupBy('r.ingredient_id'),'pr','pr.ingredient_id = g.id')
      .leftJoin(qb=>qb.select('r.ingredient_id','ingredient_id').addSelect('SUM(r.quantity * t.quantity * i.quantity)','quantity').from(InvoiceItem,'i')
        .innerJoin(InvoiceItemTopping,'t','t.invoice_item_id = i.id').innerJoin(ToppingIngredient,'r','r.topping_id = t.topping_id')
        .where('i.invoice_id = :invoiceId').groupBy('r.ingredient_id'),'tr','tr.ingredient_id = g.id')
      .where('(pr.ingredient_id IS NOT NULL OR tr.ingredient_id IS NOT NULL)').orderBy('g.id').setParameter('invoiceId',invoiceId).getRawMany();
    if(pricing.promotionCodeId){
      await manager.getRepository(PromotionCode).update({id:pricing.promotionCodeId},{used_count:()=>'used_count + 1',updated_at:()=>'now()'});
      await manager.getRepository(InvoicePromotionCode).update({invoice_id:invoiceId},{discount_amount:String(money(pricing.discountAmount))});
    }
    for(const requirement of requirements){
      await manager.getRepository(StockMovement).insert({id:randomUUID(),branch_id:invoice.branch_id,ingredient_id:requirement.ingredient_id,type:'SALE',
        quantity:requirement.quantity.startsWith('-')?requirement.quantity.slice(1):`-${requirement.quantity}`,balance_after:'0',invoice_id:invoiceId,
        created_by:actorId,source:actorId===null?'SYSTEM':'USER'});
    }
    await manager.getRepository(Invoice).update({id:invoiceId},{status:'PAID',subtotal:String(money(pricing.subtotal)),discount_amount:String(money(pricing.discountAmount)),
      total_amount:String(money(pricing.totalAmount)),paid_at:()=>'now()',updated_at:()=>'now()'});
  }

  async paymentPreview(user:UserSummary,invoiceId:string):Promise<PaymentPreviewDto> {
    const invoice=await this.invoice(this.db.manager,user,invoiceId);
    if(invoice.status!=='OPEN')throw httpError(409,'INVOICE_NOT_OPEN','Đơn không còn mở.');
    const pricing=await this.evaluateInvoicePricing(this.db.manager,invoiceId);
    const promo=await this.db.getRepository(InvoicePromotionCode).findOne({where:{invoice_id:invoiceId},select:{invoice_id:true,code:true}});
    const items=await this.db.getRepository(InvoiceItem).find({where:{invoice_id:invoiceId},select:{id:true,product_size_id:true},order:{id:'ASC'}});
    const sized=new Set((items.length?await this.db.getRepository(ProductSizeIngredient).find({where:{product_size_id:In(items.map(i=>i.product_size_id))},
      select:{product_size_id:true,ingredient_id:true}}):[]).map(r=>r.product_size_id));
    const tops=items.length?await this.db.getRepository(InvoiceItemTopping).find({where:{invoice_item_id:In(items.map(i=>i.id))},
      select:{id:true,invoice_item_id:true,topping_id:true}}):[];
    const topped=new Set((tops.length?await this.db.getRepository(ToppingIngredient).find({where:{topping_id:In(tops.map(t=>t.topping_id))},
      select:{topping_id:true,ingredient_id:true}}):[]).map(r=>r.topping_id));
    const missing=items.filter(i=>!sized.has(i.product_size_id)||tops.some(t=>t.invoice_item_id===i.id&&!topped.has(t.topping_id)));
    // QueryBuilder: CTE or sub-query in one statement; find() cannot express it
    // Two grouped sub-queries replace UNION ALL; the sum stays in PostgreSQL numeric
    const negative:Row[]=await this.db.createQueryBuilder().select('g.id','ingredient_id').from(Ingredient,'g')
      .leftJoin(qb=>qb.select('r.ingredient_id','ingredient_id').addSelect('SUM(r.quantity * i.quantity)','quantity').from(InvoiceItem,'i')
        .innerJoin(ProductSizeIngredient,'r','r.product_size_id = i.product_size_id').where('i.invoice_id = :invoiceId').groupBy('r.ingredient_id'),'pr','pr.ingredient_id = g.id')
      .leftJoin(qb=>qb.select('r.ingredient_id','ingredient_id').addSelect('SUM(r.quantity * t.quantity * i.quantity)','quantity').from(InvoiceItem,'i')
        .innerJoin(InvoiceItemTopping,'t','t.invoice_item_id = i.id').innerJoin(ToppingIngredient,'r','r.topping_id = t.topping_id')
        .where('i.invoice_id = :invoiceId').groupBy('r.ingredient_id'),'tr','tr.ingredient_id = g.id')
      .leftJoin(BranchIngredientStock,'s','s.ingredient_id = g.id AND s.branch_id = :branchId')
      .where('(pr.ingredient_id IS NOT NULL OR tr.ingredient_id IS NOT NULL)')
      .andWhere('COALESCE(s.current_stock, 0) - (COALESCE(pr.quantity, 0) + COALESCE(tr.quantity, 0)) < 0')
      .orderBy('g.id').setParameters({invoiceId,branchId:invoice.branch_id}).getRawMany();
    return {invoiceId,subtotal:money(pricing.subtotal),discountAmount:money(pricing.discountAmount),totalAmount:money(pricing.totalAmount),
      promotion:promo?{code:promo.code,applicable:pricing.promotionApplicable,reason:pricing.promotionApplicable?null:'PROMOTION_NOT_APPLICABLE'}:null,
      warnings:[...missing.map(item=>({type:'MISSING_RECIPE' as const,itemId:item.id})),...negative.map(row=>({type:'NEGATIVE_STOCK' as const,ingredientId:row.ingredient_id}))]};
  }

  async addItem(user: UserSummary, id: string, input: AddInvoiceItemDto) {
    return this.db.transaction(async manager => {
      const invoice = await this.writable(manager, user, id);
      const ps = await manager.getRepository(ProductSize).findOne({ where: { id: input.productSizeId },
        relations: { product: { category: true }, size: true } });
      const p = ps && { id: ps.id, price: ps.price, size_active: ps.is_active, product_name: ps.product!.name, product_active: ps.product!.is_active,
        category_id: ps.product!.category_id, store_id: ps.product!.category!.store_id, category_active: ps.product!.category!.is_active, size_name: ps.size!.name };
      if (!p || p.store_id !== scope(user)) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy món trong cửa hàng.');
      if (!p.size_active || !p.product_active || !p.category_active) throw httpError(409, 'ITEM_NOT_AVAILABLE', 'Món hoặc size đã ngưng bán.');
      const requested = (input.toppings ?? []).map(t => ({ ...t, toppingId: t.toppingId.toLowerCase() }));
      if (new Set(requested.map(t => t.toppingId)).size !== requested.length)
        throw httpError(422, 'VALIDATION_ERROR', 'Topping bị lặp.');
      let toppingRows: Row[] = [];
      if (requested.length) {
        const toppings = await manager.getRepository(Topping).find({ where: { id: In(requested.map(t => t.toppingId)) },
          select: { id: true, name: true, price: true, is_active: true, store_id: true } });
        const allowed = new Set((await manager.getRepository(CategoryTopping).find({
          where: { category_id: p.category_id, topping_id: In(toppings.map(t => t.id)) }, select: { category_id: true, topping_id: true } })).map(ct => ct.topping_id));
        toppingRows = toppings.map(t => ({ ...t, allowed: allowed.has(t.id) }));
      }
      if (toppingRows.length !== requested.length || toppingRows.some(t => t.store_id !== scope(user)))
        throw httpError(404, 'NOT_FOUND', 'Không tìm thấy topping trong cửa hàng.');
      if (toppingRows.some(t => !t.is_active)) throw httpError(409, 'ITEM_NOT_AVAILABLE', 'Topping đã ngưng bán.');
      if (toppingRows.some(t => !t.allowed)) throw httpError(422, 'TOPPING_NOT_ALLOWED', 'Topping không thuộc danh mục món.');
      const toppingPrice = toppingRows.reduce((sum, t) => sum + BigInt(t.price) * BigInt(requested.find(x => x.toppingId === t.id)!.quantity), 0n);
      const lineTotal = money((BigInt(p.price) + toppingPrice) * BigInt(input.quantity));
      const itemId = randomUUID();
      await manager.getRepository(InvoiceItem).insert({ id: itemId, invoice_id: id, product_size_id: p.id, product_name: p.product_name,
        size_name: p.size_name, unit_price: p.price, quantity: input.quantity, line_total: String(lineTotal), note: input.note ?? null });
      for (const topping of toppingRows) {
        const quantity = requested.find(x => x.toppingId === topping.id)!.quantity;
        await manager.getRepository(InvoiceItemTopping).insert({ id: randomUUID(), invoice_item_id: itemId, topping_id: topping.id,
          topping_name: topping.name, unit_price: topping.price, quantity,
          line_total: String(money(BigInt(topping.price) * BigInt(quantity) * BigInt(input.quantity))) });
      }
      await this.recalculate(manager, id);
      const updated = await this.invoice(manager, user, invoice.id);
      return this.detail(manager, updated);
    });
  }

  private async itemInvoice(manager: EntityManager, itemId: string): Promise<string> {
    const item = await manager.getRepository(InvoiceItem).findOne({ where: { id: itemId }, select: { id: true, invoice_id: true } });
    if (!item) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy dòng món.');
    return item.invoice_id;
  }

  async patchItem(user: UserSummary, itemId: string, input: PatchInvoiceItemDto) {
    if (input.quantity === undefined && input.note === undefined) throw httpError(422, 'VALIDATION_ERROR', 'Thiếu nội dung cập nhật.');
    return this.db.transaction(async manager => {
      const id = await this.itemInvoice(manager, itemId);
      await this.writable(manager, user, id);
      const item = await manager.getRepository(InvoiceItem).findOneBy({ id: itemId });
      if (!item) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy dòng món.');
      const quantity = input.quantity ?? item.quantity;
      const toppingRows = await manager.getRepository(InvoiceItemTopping).findBy({ invoice_item_id: itemId });
      const perItem = BigInt(item.unit_price) + toppingRows.reduce((sum, t) => sum + BigInt(t.unit_price) * BigInt(t.quantity), 0n);
      const lineTotal = money(perItem * BigInt(quantity));
      await manager.getRepository(InvoiceItem).update({ id: itemId }, { quantity, note: input.note === undefined ? item.note : input.note,
        line_total: String(lineTotal), updated_at: () => 'now()' });
      for (const topping of toppingRows) await manager.getRepository(InvoiceItemTopping).update({ id: topping.id },
        { line_total: String(money(BigInt(topping.unit_price) * BigInt(topping.quantity) * BigInt(quantity))) });
      await this.recalculate(manager, id);
      return this.detail(manager, await this.invoice(manager, user, id));
    });
  }

  async removeItem(user: UserSummary, itemId: string) {
    await this.db.transaction(async manager => {
      const id = await this.itemInvoice(manager, itemId);
      await this.writable(manager, user, id);
      await manager.getRepository(InvoiceItem).delete({ id: itemId });
      await this.recalculate(manager, id);
    });
  }

  async transfer(user: UserSummary, id: string, tableId: string) {
    try {
      return await this.db.transaction(async manager => {
        const row = await this.writable(manager, user, id);
        if (row.order_type !== 'DINE_IN') throw httpError(409, 'CONFLICT', 'Chỉ đơn tại bàn mới chuyển bàn được.');
        await this.table(manager, user, tableId, row.branch_id);
        if (row.table_id !== tableId) await manager.getRepository(Invoice).update({ id }, { table_id: tableId, updated_at: () => 'now()' });
        return this.detail(manager, await this.invoice(manager, user, id));
      });
    } catch (error: any) {
      if (error?.code === '23505' && error?.constraint === 'uq_invoices_table_open')
        throw httpError(409, 'TABLE_HAS_OPEN_INVOICE', 'Bàn đích đang có đơn mở.');
      throw error;
    }
  }

  async cancel(user: UserSummary, id: string, reason: string) {
    if (!reason?.trim()) throw httpError(422, 'CANCEL_REASON_REQUIRED', 'Cần nhập lý do hủy đơn.');
    return this.db.transaction(async manager => {
      const row = await this.invoice(manager, user, id);
      if (row.status === 'PAID') await this.cancelPaid(manager, user, row, reason.trim());
      else if (row.status === 'OPEN') {
        await this.writable(manager, user, id);
        await manager.getRepository(Invoice).update({ id }, { status: 'CANCELLED', cancel_reason: reason.trim(), cancelled_by: user.id, cancelled_at: () => 'now()', updated_at: () => 'now()' });
      } else throw httpError(409, 'INVOICE_NOT_OPEN', 'Đơn không còn mở.');
      return this.detail(manager, await this.invoice(manager, user, id));
    });
  }

  // Lock order: shift -> invoice -> promotion codes -> stock (same as payCash).
  private async cancelPaid(manager: EntityManager, user: UserSummary, row: Row, reason: string): Promise<void> {
    if (!user.permissions.includes('invoice.cancel_paid')) throw httpError(403, 'PERMISSION_DENIED', 'Bạn không có quyền thực hiện thao tác này.');
    const shift = await manager.getRepository(WorkShift).findOne({ where: { id: row.work_shift_id }, select: { id: true, status: true }, lock: { mode: 'pessimistic_write' } });
    if (shift!.status !== 'OPEN') throw httpError(409, 'CANCEL_NOT_ALLOWED', 'Chỉ hủy được đơn đã thanh toán khi ca của đơn còn mở.');
    const locked = await this.invoice(manager, user, row.id, true);
    if (locked.status !== 'PAID') throw httpError(409, 'INVOICE_NOT_OPEN', 'Đơn không còn mở.');

    const payment = await manager.getRepository(Payment).findOne({ where: { invoice_id: row.id }, select: { id: true, method: true, amount: true } });
    if (payment?.method === 'CASH') {
      // QueryBuilder: SUM of money read as text; Repository.sum() returns a float
      const cash = await manager.getRepository(CashReconciliation).createQueryBuilder('r').select('r.opening_cash::text', 'opening_cash')
        .addSelect("COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE i.work_shift_id=r.work_shift_id AND i.status='PAID' AND p.method='CASH'),0)::text", 'cash_sales')
        .addSelect("COALESCE((SELECT SUM(e.amount) FROM shift_expenses e WHERE e.work_shift_id=r.work_shift_id AND e.paid_from_drawer=true),0)::text", 'expenses')
        .where('r.work_shift_id = :shiftId', { shiftId: row.work_shift_id }).getRawOne();
      if (!cash) throw httpError(500, 'INTERNAL_ERROR', 'Không tìm thấy bản ghi đối soát của ca thu ngân.');
      if (BigInt(cash.opening_cash) + BigInt(cash.cash_sales) - BigInt(cash.expenses) - BigInt(payment.amount) < 0n)
        throw httpError(409, 'CANCEL_EXCEEDS_DRAWER', 'Tiền mặt trong két không đủ để hoàn cho khách.');
    }

    const linked = await manager.getRepository(InvoicePromotionCode).findOneBy({ invoice_id: row.id });
    const promos = linked ? [await manager.getRepository(PromotionCode).findOne({ where: { id: linked.promotion_code_id }, select: { id: true }, lock: { mode: 'pessimistic_write' } })] : [];
    // CHECK used_count >= 0 aborts the transaction (500) if the counter is already 0.
    for (const promo of promos) await manager.getRepository(PromotionCode).update({ id: promo!.id }, { used_count: () => 'used_count - 1', updated_at: () => 'now()' });

    const sales = await manager.getRepository(StockMovement).find({ where: { invoice_id: row.id, type: 'SALE' },
      select: { id: true, branch_id: true, ingredient_id: true, quantity: true }, order: { ingredient_id: 'ASC', id: 'ASC' } });
    for (const sale of sales) {
      await manager.getRepository(StockMovement).insert({ id: randomUUID(), branch_id: sale.branch_id, ingredient_id: sale.ingredient_id, type: 'SALE_REVERSAL',
        quantity: sale.quantity.startsWith('-') ? sale.quantity.slice(1) : `-${sale.quantity}`, balance_after: '0', invoice_id: row.id, created_by: user.id, source: 'USER' });
    }
    await manager.getRepository(Invoice).update({ id: row.id }, { status: 'CANCELLED', cancel_reason: reason, cancelled_by: user.id, cancelled_at: () => 'now()', updated_at: () => 'now()' });
  }
}
