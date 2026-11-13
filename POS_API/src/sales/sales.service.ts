import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { uuidPattern } from '../http/request-validation';
import { AddInvoiceItemDto, CreateInvoiceDto, PatchInvoiceItemDto } from './http/sales.dto';
import { CashPaymentDto, InvoicePricing, PaymentDto, PaymentPreviewDto } from './http/payment.dto';
import { evaluatePromotion } from '../promotions/promotion-calculation';

const MAX_MONEY = 1_000_000_000_000n;
type Row = Record<string, any>;

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

  private async shift(manager: EntityManager, user: UserSummary): Promise<Row> {
    const rows = await manager.query(`SELECT s.id, s.branch_id, b.store_id, b.is_active FROM work_shifts s
      JOIN branches b ON b.id=s.branch_id WHERE s.user_id=$1 AND s.status='OPEN' AND s.shift_type='CASHIER' FOR UPDATE OF s,b`, [user.id]);
    const shift = rows[0];
    if (!shift || shift.store_id !== scope(user)) throw httpError(409, 'SHIFT_NOT_OPEN', 'Bạn cần mở ca thu ngân để bán hàng.');
    return shift;
  }

  private async invoice(manager: EntityManager, user: UserSummary, id: string, lock = false): Promise<Row> {
    const rows = await manager.query(`SELECT i.*, b.store_id FROM invoices i JOIN branches b ON b.id=i.branch_id
      WHERE i.id=$1 ${lock ? 'FOR UPDATE OF i' : ''}`, [id]);
    const row = rows[0];
    if (!row || row.store_id !== scope(user) || (!user.permissions.includes('branch.access_all') && row.branch_id !== user.branchId))
      throw httpError(404, 'NOT_FOUND', 'Không tìm thấy hóa đơn.');
    return row;
  }

  private async detail(manager: EntityManager, row: Row) {
    const pricing = row.status === 'OPEN' ? await this.evaluateInvoicePricing(manager, row.id) : null;
    const promotions: Row[] = await manager.query('SELECT code,discount_amount FROM invoice_promotion_codes WHERE invoice_id=$1',[row.id]);
    const items: Row[] = await manager.query(`SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY created_at,id`, [row.id]);
    const toppings: Row[] = items.length ? await manager.query(`SELECT t.* FROM invoice_item_toppings t
      JOIN invoice_items i ON i.id=t.invoice_item_id WHERE i.invoice_id=$1 ORDER BY t.created_at,t.id`, [row.id]) : [];
    return {
      id: row.id, invoiceCode: row.invoice_code, branchId: row.branch_id, workShiftId: row.work_shift_id,
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
    return this.detail(this.db.manager, row);
  }

  async list(user: UserSummary, query: Record<string, unknown>) {
    const allowed = ['status', 'limit', 'cursor', 'branchId'];
    if (Object.keys(query).some(key => !allowed.includes(key)) || (query.status !== undefined && query.status !== 'OPEN'))
      throw httpError(422, 'VALIDATION_ERROR', 'Bộ lọc hóa đơn không hợp lệ.');
    const rawLimit = query.limit ?? '20';
    if (typeof rawLimit !== 'string' || !/^[1-9]\d{0,2}$/.test(rawLimit)) throw httpError(422, 'VALIDATION_ERROR', 'Giới hạn danh sách không hợp lệ.');
    const limit = Math.min(Number(rawLimit), 100);
    const storeId = scope(user);
    const allBranches = user.permissions.includes('branch.access_all');
    const branchId = allBranches ? query.branchId : user.branchId;
    if (!allBranches && !branchId) throw httpError(403, 'PERMISSION_DENIED', 'Tài khoản chưa được gán chi nhánh.');
    if (branchId !== undefined && (typeof branchId !== 'string' || !uuidPattern.test(branchId)))
      throw httpError(422, 'VALIDATION_ERROR', 'Chi nhánh không hợp lệ.');
    const cursorScope = JSON.stringify([storeId, branchId ?? null, 'OPEN']);
    let after: { createdAt: string; id: string } | null = null;
    if (query.cursor !== undefined) {
      if (typeof query.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,1024}$/.test(query.cursor))
        throw httpError(422, 'VALIDATION_ERROR', 'Cursor không hợp lệ.');
      try {
        const parsed = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
        if (parsed.scope !== cursorScope || typeof parsed.createdAt !== 'string' || !Number.isFinite(Date.parse(parsed.createdAt))
          || typeof parsed.id !== 'string' || !uuidPattern.test(parsed.id)) throw new Error();
        after = parsed;
      } catch { throw httpError(422, 'VALIDATION_ERROR', 'Cursor không hợp lệ.'); }
    }
    const params: unknown[] = [storeId, branchId ?? null, after?.createdAt ?? null, after?.id ?? null, limit + 1];
    const where = `JOIN branches b ON b.id=i.branch_id WHERE b.store_id=$1 AND i.status='OPEN'
      AND ($2::uuid IS NULL OR i.branch_id=$2) AND ($3::timestamptz IS NULL OR (i.created_at,i.id)<($3::timestamptz,$4::uuid))`;
    const rows: Row[] = await this.db.query(`SELECT i.*, (SELECT COALESCE(SUM(quantity),0)::int FROM invoice_items WHERE invoice_id=i.id) AS item_count,
      to_char(i.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at
      FROM invoices i ${where} ORDER BY i.created_at DESC,i.id DESC LIMIT $5`, params);
    const count: Row[] = await this.db.query(`SELECT COUNT(*)::int AS total FROM invoices i JOIN branches b ON b.id=i.branch_id
      WHERE b.store_id=$1 AND i.status='OPEN' AND ($2::uuid IS NULL OR i.branch_id=$2)`, params.slice(0, 2));
    const selected = rows.slice(0, limit);
    const last = selected.at(-1);
    return {
      data: selected.map(row => ({ id: row.id, invoiceCode: row.invoice_code, branchId: row.branch_id,
        tableId: row.table_id, orderType: row.order_type, status: row.status, totalAmount: money(row.total_amount),
        itemCount: row.item_count, createdAt: row.created_at.toISOString() })),
      meta: { limit, nextCursor: rows.length > limit && last ? Buffer.from(JSON.stringify({ scope: cursorScope,
        createdAt: last.cursor_created_at, id: last.id })).toString('base64url') : null, total: count[0].total },
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
          const rows = await manager.query(`INSERT INTO invoices (id,branch_id,work_shift_id,table_id,invoice_code,created_by,order_type,status,subtotal,discount_amount,total_amount,note)
            VALUES ($1,$2,$3,$4,$5,$6,$7,'OPEN',0,0,0,$8) RETURNING *`,
            [id, shift.branch_id, shift.id, input.tableId ?? null, invoiceCode(), user.id, input.orderType, input.note ?? null]);
          return this.detail(manager, rows[0]);
        });
      } catch (error: any) {
        if (error?.code === '23505' && error?.constraint === 'invoices_invoice_code_key') continue;
        if (error?.code === '23505' && error?.constraint === 'uq_invoices_table_open') {
          const existing: Row[] = await this.db.query("SELECT id FROM invoices WHERE table_id=$1 AND status='OPEN'", [input.tableId]);
          throw new HttpException({ code: 'TABLE_HAS_OPEN_INVOICE', message: 'Bàn đang có đơn mở.',
            details: existing[0] ? [{ field: 'invoiceId', value: existing[0].id }] : [] }, 409);
        }
        throw error;
      }
    }
    throw httpError(409, 'CONFLICT', 'Không tạo được mã hóa đơn duy nhất. Vui lòng thử lại.');
  }

  private async table(manager: EntityManager, user: UserSummary, tableId: string, branchId: string) {
    const rows: Row[] = await manager.query(`SELECT t.id,t.branch_id,t.is_active,b.store_id FROM dining_tables t
      JOIN branches b ON b.id=t.branch_id WHERE t.id=$1 FOR SHARE OF t`, [tableId]);
    const table = rows[0];
    if (!table || table.store_id !== scope(user)) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy bàn.');
    if (table.branch_id !== branchId) throw httpError(422, 'INVOICE_BRANCH_MISMATCH', 'Bàn không thuộc chi nhánh của ca.');
    if (!table.is_active) throw httpError(409, 'TABLE_INACTIVE', 'Bàn đã ngưng dùng.');
  }

  private async writable(manager: EntityManager, user: UserSummary, id: string) {
    const shift = await this.shift(manager, user);
    const row = await this.invoice(manager, user, id, true);
    if (row.status !== 'OPEN') throw httpError(409, 'INVOICE_NOT_OPEN', 'Đơn không còn mở.');
    if (row.branch_id !== shift.branch_id || row.work_shift_id !== shift.id)
      throw httpError(409, 'SHIFT_NOT_OPEN', 'Đơn không thuộc ca thu ngân hiện tại.');
    const pending=await manager.query("SELECT id FROM transfer_attempts WHERE invoice_id=$1 AND status='PENDING'",[id]);
    if(pending.length)throw httpError(409,'TRANSFER_PENDING','Đơn đang chờ chuyển khoản. Hủy chờ trước khi sửa hoặc thanh toán.');
    return row;
  }

  private async recalculate(manager: EntityManager, id: string) {
    const pricing=await this.evaluateInvoicePricing(manager,id);
    await manager.query('UPDATE invoices SET subtotal=$2,discount_amount=$3,total_amount=$4,updated_at=now() WHERE id=$1',
      [id,money(pricing.subtotal),money(pricing.discountAmount),money(pricing.totalAmount)]);
    await manager.query('UPDATE invoice_promotion_codes SET discount_amount=$2 WHERE invoice_id=$1',[id,money(pricing.discountAmount)]);
  }

  async evaluateInvoicePricing(manager: EntityManager, invoiceId: string): Promise<InvoicePricing> {
    const [sum]=await manager.query('SELECT COALESCE(SUM(line_total),0)::bigint AS subtotal FROM invoice_items WHERE invoice_id=$1',[invoiceId]);
    const subtotal=BigInt(sum.subtotal); money(subtotal);
    const promotions:Row[]=await manager.query(`SELECT p.* FROM invoice_promotion_codes ip
      JOIN promotion_codes p ON p.id=ip.promotion_code_id WHERE ip.invoice_id=$1`,[invoiceId]);
    const promo=promotions[0];
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
      const existing=await manager.query('SELECT invoice_id FROM invoice_promotion_codes WHERE invoice_id=$1',[invoiceId]);
      if(existing.length)throw httpError(409,'PROMOTION_ALREADY_APPLIED','Đơn đã có mã giảm giá. Bỏ mã cũ trước khi áp mã khác.');
      const [promo]=await manager.query('SELECT * FROM promotion_codes WHERE store_id=$1 AND code=$2 FOR UPDATE',[scope(user),code.trim().toUpperCase()]);
      if(!promo)throw httpError(404,'NOT_FOUND','Không tìm thấy mã giảm giá.');
      await manager.query('INSERT INTO invoice_promotion_codes(invoice_id,promotion_code_id,code) VALUES($1,$2,$3)',[invoiceId,promo.id,promo.code]);
      const pricing=await this.evaluateInvoicePricing(manager,invoiceId);
      if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
      await this.recalculate(manager,invoiceId);
      return this.detail(manager,await this.invoice(manager,user,invoice.id));
    });
  }

  async removePromotion(user:UserSummary,invoiceId:string) {
    return this.db.transaction(async manager=>{
      await this.writable(manager,user,invoiceId);
      await manager.query('DELETE FROM invoice_promotion_codes WHERE invoice_id=$1',[invoiceId]);
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
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[normalized]);
      const completed:Row[]=await manager.query('SELECT id FROM invoices WHERE zero_completion_key=$1',[normalized]);
      if(completed.length){
        if(completed[0].id===row.id)return true;
        throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
      }
      const used=await manager.query(`SELECT id FROM payments WHERE idempotency_key=$1 UNION ALL
        SELECT id FROM transfer_attempts WHERE idempotency_key=$1`,[normalized]);
      if(used.length)throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
      await this.writable(manager,user,invoiceId);
      const items=await manager.query('SELECT id FROM invoice_items WHERE invoice_id=$1 LIMIT 1',[invoiceId]);
      if(!items.length)throw httpError(422,'INVOICE_EMPTY','Đơn chưa có món để thanh toán.');
      await manager.query(`SELECT p.id FROM promotion_codes p JOIN invoice_promotion_codes ip ON ip.promotion_code_id=p.id
        WHERE ip.invoice_id=$1 FOR UPDATE OF p`,[invoiceId]);
      const pricing=await this.evaluateInvoicePricing(manager,invoiceId);
      if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
      if(pricing.totalAmount!==0n)throw httpError(422,'ZERO_TOTAL_REQUIRED','Chỉ hoàn tất đơn có tổng tiền 0đ.');
      await manager.query('UPDATE invoices SET zero_completion_key=$2 WHERE id=$1',[invoiceId,normalized]);
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
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[normalized]);
      const [previous]=await manager.query('SELECT * FROM payments WHERE idempotency_key=$1',[normalized]);
      if(previous){
        if(previous.invoice_id!==invoice.id||previous.idempotency_request_hash!==hash)
          throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
        return this.cashPaymentView(previous,true);
      }
      const used=await manager.query(`SELECT id FROM invoices WHERE zero_completion_key=$1 UNION ALL
        SELECT id FROM transfer_attempts WHERE idempotency_key=$1`,[normalized]);
      if(used.length)throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
      await this.writable(manager,user,invoiceId);
      const items=await manager.query('SELECT id FROM invoice_items WHERE invoice_id=$1 LIMIT 1',[invoiceId]);
      if(!items.length)throw httpError(422,'INVOICE_EMPTY','Đơn chưa có món để thanh toán.');
      await manager.query(`SELECT p.id FROM promotion_codes p JOIN invoice_promotion_codes ip ON ip.promotion_code_id=p.id
        WHERE ip.invoice_id=$1 FOR UPDATE OF p`,[invoiceId]);
      const pricing=await this.evaluateInvoicePricing(manager,invoiceId);
      if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
      if(pricing.totalAmount!==BigInt(input.amount))throw httpError(422,'PAYMENT_AMOUNT_MISMATCH','Khoản thanh toán không bằng tổng hóa đơn.');
      if(input.tenderedAmount<input.amount)throw httpError(422,'TENDERED_INSUFFICIENT','Tiền khách đưa chưa đủ để thanh toán.');
      const [reconciliation]=await manager.query(`SELECT r.opening_cash,COALESCE((SELECT SUM(p.amount) FROM payments p
        JOIN invoices i ON i.id=p.invoice_id WHERE i.work_shift_id=r.work_shift_id AND i.status='PAID' AND p.method='CASH'),0) AS cash_sales
        FROM cash_reconciliations r WHERE r.work_shift_id=$1`,[invoice.work_shift_id]);
      if(!reconciliation)throw httpError(500,'INTERNAL_ERROR','Không tìm thấy bản ghi đối soát của ca thu ngân.');
      if(BigInt(reconciliation.opening_cash)+BigInt(reconciliation.cash_sales)+BigInt(input.amount)>MAX_MONEY)
        throw httpError(422,'VALIDATION_ERROR','Số tiền vượt giới hạn cho phép.');
      const [payment]=await manager.query(`INSERT INTO payments(id,invoice_id,method,amount,tendered_amount,change_amount,
        idempotency_key,idempotency_request_hash,created_by) VALUES($1,$2,'CASH',$3,$4,$5,$6,$7,$8) RETURNING *`,
        [randomUUID(),invoice.id,input.amount,input.tenderedAmount,input.tenderedAmount-input.amount,normalized,hash,user.id]);
      await this.finalizeInvoice(manager,invoice.id,user.id);
      return this.cashPaymentView(payment,false);
    });
  }

  private cashPaymentView(row:Row,replayed:boolean):PaymentDto {
    return {paymentId:row.id,invoiceId:row.invoice_id,status:'PAID',method:'CASH',amount:money(row.amount),
      tenderedAmount:money(row.tendered_amount),changeAmount:money(row.change_amount),paidAt:row.paid_at.toISOString(),replayed};
  }

  async finalizeInvoice(manager:EntityManager,invoiceId:string,actorId:string|null):Promise<void> {
    const [invoice]=await manager.query('SELECT * FROM invoices WHERE id=$1 FOR UPDATE',[invoiceId]);
    if(!invoice||invoice.status!=='OPEN')throw httpError(409,'INVOICE_NOT_OPEN','Đơn không còn mở.');
    const items=await manager.query('SELECT id FROM invoice_items WHERE invoice_id=$1 LIMIT 1',[invoiceId]);
    if(!items.length)throw httpError(422,'INVOICE_EMPTY','Đơn chưa có món để thanh toán.');
    await manager.query(`SELECT p.id FROM promotion_codes p JOIN invoice_promotion_codes ip ON ip.promotion_code_id=p.id
      WHERE ip.invoice_id=$1 FOR UPDATE OF p`,[invoiceId]);
    const pricing=await this.evaluateInvoicePricing(manager,invoiceId);
    if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
    const requirements:Row[]=await manager.query(`WITH requirements AS (
      SELECT r.ingredient_id,r.quantity*i.quantity AS quantity FROM invoice_items i
      JOIN product_size_ingredients r ON r.product_size_id=i.product_size_id WHERE i.invoice_id=$1
      UNION ALL SELECT r.ingredient_id,r.quantity*t.quantity*i.quantity FROM invoice_items i
      JOIN invoice_item_toppings t ON t.invoice_item_id=i.id JOIN topping_ingredients r ON r.topping_id=t.topping_id WHERE i.invoice_id=$1
    ) SELECT ingredient_id,SUM(quantity) AS quantity FROM requirements GROUP BY ingredient_id ORDER BY ingredient_id`,[invoiceId]);
    if(pricing.promotionCodeId){
      await manager.query('UPDATE promotion_codes SET used_count=used_count+1,updated_at=now() WHERE id=$1',[pricing.promotionCodeId]);
      await manager.query('UPDATE invoice_promotion_codes SET discount_amount=$2 WHERE invoice_id=$1',[invoiceId,money(pricing.discountAmount)]);
    }
    for(const requirement of requirements){
      await manager.query(`INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,invoice_id,created_by,source)
        VALUES($1,$2,$3,'SALE',-$4::numeric,0,$5,$6,$7)`,[randomUUID(),invoice.branch_id,requirement.ingredient_id,
        requirement.quantity,invoiceId,actorId,actorId===null?'SYSTEM':'USER']);
    }
    await manager.query(`UPDATE invoices SET status='PAID',subtotal=$2,discount_amount=$3,total_amount=$4,paid_at=now(),updated_at=now() WHERE id=$1`,
      [invoiceId,money(pricing.subtotal),money(pricing.discountAmount),money(pricing.totalAmount)]);
  }

  async paymentPreview(user:UserSummary,invoiceId:string):Promise<PaymentPreviewDto> {
    const invoice=await this.invoice(this.db.manager,user,invoiceId);
    if(invoice.status!=='OPEN')throw httpError(409,'INVOICE_NOT_OPEN','Đơn không còn mở.');
    const pricing=await this.evaluateInvoicePricing(this.db.manager,invoiceId);
    const [promo]=await this.db.query('SELECT code FROM invoice_promotion_codes WHERE invoice_id=$1',[invoiceId]);
    const missing:Row[]=await this.db.query(`SELECT i.id FROM invoice_items i WHERE i.invoice_id=$1 AND
      (NOT EXISTS(SELECT 1 FROM product_size_ingredients r WHERE r.product_size_id=i.product_size_id)
       OR EXISTS(SELECT 1 FROM invoice_item_toppings t WHERE t.invoice_item_id=i.id
         AND NOT EXISTS(SELECT 1 FROM topping_ingredients r WHERE r.topping_id=t.topping_id))) ORDER BY i.id`,[invoiceId]);
    const negative:Row[]=await this.db.query(`WITH requirements AS (
      SELECT r.ingredient_id,r.quantity*i.quantity AS quantity FROM invoice_items i
      JOIN product_size_ingredients r ON r.product_size_id=i.product_size_id WHERE i.invoice_id=$1
      UNION ALL SELECT r.ingredient_id,r.quantity*t.quantity*i.quantity FROM invoice_items i
      JOIN invoice_item_toppings t ON t.invoice_item_id=i.id JOIN topping_ingredients r ON r.topping_id=t.topping_id WHERE i.invoice_id=$1
    ) SELECT r.ingredient_id FROM requirements r
      LEFT JOIN branch_ingredient_stocks s ON s.ingredient_id=r.ingredient_id AND s.branch_id=$2
      GROUP BY r.ingredient_id,s.current_stock HAVING COALESCE(s.current_stock,0)-SUM(r.quantity)<0 ORDER BY r.ingredient_id`,[invoiceId,invoice.branch_id]);
    return {invoiceId,subtotal:money(pricing.subtotal),discountAmount:money(pricing.discountAmount),totalAmount:money(pricing.totalAmount),
      promotion:promo?{code:promo.code,applicable:pricing.promotionApplicable,reason:pricing.promotionApplicable?null:'PROMOTION_NOT_APPLICABLE'}:null,
      warnings:[...missing.map(item=>({type:'MISSING_RECIPE' as const,itemId:item.id})),...negative.map(row=>({type:'NEGATIVE_STOCK' as const,ingredientId:row.ingredient_id}))]};
  }

  async addItem(user: UserSummary, id: string, input: AddInvoiceItemDto) {
    return this.db.transaction(async manager => {
      const invoice = await this.writable(manager, user, id);
      const product: Row[] = await manager.query(`SELECT ps.id,ps.price,ps.is_active AS size_active,p.name AS product_name,p.is_active AS product_active,
        p.category_id,c.store_id,c.is_active AS category_active,s.name AS size_name
        FROM product_sizes ps JOIN products p ON p.id=ps.product_id JOIN categories c ON c.id=p.category_id
        JOIN sizes s ON s.id=ps.size_id WHERE ps.id=$1`, [input.productSizeId]);
      const p = product[0];
      if (!p || p.store_id !== scope(user)) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy món trong cửa hàng.');
      if (!p.size_active || !p.product_active || !p.category_active) throw httpError(409, 'ITEM_NOT_AVAILABLE', 'Món hoặc size đã ngưng bán.');
      const requested = (input.toppings ?? []).map(t => ({ ...t, toppingId: t.toppingId.toLowerCase() }));
      if (new Set(requested.map(t => t.toppingId)).size !== requested.length)
        throw httpError(422, 'VALIDATION_ERROR', 'Topping bị lặp.');
      const toppingRows: Row[] = requested.length ? await manager.query(`SELECT t.id,t.name,t.price,t.is_active,t.store_id,
        EXISTS(SELECT 1 FROM category_toppings ct WHERE ct.topping_id=t.id AND ct.category_id=$2) AS allowed
        FROM toppings t WHERE t.id=ANY($1::uuid[])`, [requested.map(t => t.toppingId), p.category_id]) : [];
      if (toppingRows.length !== requested.length || toppingRows.some(t => t.store_id !== scope(user)))
        throw httpError(404, 'NOT_FOUND', 'Không tìm thấy topping trong cửa hàng.');
      if (toppingRows.some(t => !t.is_active)) throw httpError(409, 'ITEM_NOT_AVAILABLE', 'Topping đã ngưng bán.');
      if (toppingRows.some(t => !t.allowed)) throw httpError(422, 'TOPPING_NOT_ALLOWED', 'Topping không thuộc danh mục món.');
      const toppingPrice = toppingRows.reduce((sum, t) => sum + BigInt(t.price) * BigInt(requested.find(x => x.toppingId === t.id)!.quantity), 0n);
      const lineTotal = money((BigInt(p.price) + toppingPrice) * BigInt(input.quantity));
      const itemId = randomUUID();
      await manager.query(`INSERT INTO invoice_items (id,invoice_id,product_size_id,product_name,size_name,unit_price,quantity,line_total,note)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [itemId, id, p.id, p.product_name, p.size_name, p.price, input.quantity, lineTotal, input.note ?? null]);
      for (const topping of toppingRows) {
        const quantity = requested.find(x => x.toppingId === topping.id)!.quantity;
        await manager.query(`INSERT INTO invoice_item_toppings (id,invoice_item_id,topping_id,topping_name,unit_price,quantity,line_total)
          VALUES ($1,$2,$3,$4,$5,$6,$7)`, [randomUUID(), itemId, topping.id, topping.name, topping.price, quantity,
          money(BigInt(topping.price) * BigInt(quantity) * BigInt(input.quantity))]);
      }
      await this.recalculate(manager, id);
      const updated = await this.invoice(manager, user, invoice.id);
      return this.detail(manager, updated);
    });
  }

  private async itemInvoice(manager: EntityManager, itemId: string): Promise<string> {
    const rows: Row[] = await manager.query('SELECT invoice_id FROM invoice_items WHERE id=$1', [itemId]);
    if (!rows[0]) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy dòng món.');
    return rows[0].invoice_id;
  }

  async patchItem(user: UserSummary, itemId: string, input: PatchInvoiceItemDto) {
    if (input.quantity === undefined && input.note === undefined) throw httpError(422, 'VALIDATION_ERROR', 'Thiếu nội dung cập nhật.');
    return this.db.transaction(async manager => {
      const id = await this.itemInvoice(manager, itemId);
      await this.writable(manager, user, id);
      const rows: Row[] = await manager.query('SELECT * FROM invoice_items WHERE id=$1', [itemId]);
      const item = rows[0];
      if (!item) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy dòng món.');
      const quantity = input.quantity ?? item.quantity;
      const toppingRows: Row[] = await manager.query('SELECT * FROM invoice_item_toppings WHERE invoice_item_id=$1', [itemId]);
      const perItem = BigInt(item.unit_price) + toppingRows.reduce((sum, t) => sum + BigInt(t.unit_price) * BigInt(t.quantity), 0n);
      const lineTotal = money(perItem * BigInt(quantity));
      await manager.query('UPDATE invoice_items SET quantity=$2,note=$3,line_total=$4,updated_at=now() WHERE id=$1',
        [itemId, quantity, input.note === undefined ? item.note : input.note, lineTotal]);
      for (const topping of toppingRows) await manager.query('UPDATE invoice_item_toppings SET line_total=$2 WHERE id=$1',
        [topping.id, money(BigInt(topping.unit_price) * BigInt(topping.quantity) * BigInt(quantity))]);
      await this.recalculate(manager, id);
      return this.detail(manager, await this.invoice(manager, user, id));
    });
  }

  async removeItem(user: UserSummary, itemId: string) {
    await this.db.transaction(async manager => {
      const id = await this.itemInvoice(manager, itemId);
      await this.writable(manager, user, id);
      await manager.query('DELETE FROM invoice_items WHERE id=$1', [itemId]);
      await this.recalculate(manager, id);
    });
  }

  async transfer(user: UserSummary, id: string, tableId: string) {
    try {
      return await this.db.transaction(async manager => {
        const row = await this.writable(manager, user, id);
        if (row.order_type !== 'DINE_IN') throw httpError(409, 'CONFLICT', 'Chỉ đơn tại bàn mới chuyển bàn được.');
        await this.table(manager, user, tableId, row.branch_id);
        if (row.table_id !== tableId) await manager.query('UPDATE invoices SET table_id=$2,updated_at=now() WHERE id=$1', [id, tableId]);
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
        await manager.query(`UPDATE invoices SET status='CANCELLED',cancel_reason=$2,cancelled_by=$3,
          cancelled_at=now(),updated_at=now() WHERE id=$1`, [id, reason.trim(), user.id]);
      } else throw httpError(409, 'INVOICE_NOT_OPEN', 'Đơn không còn mở.');
      return this.detail(manager, await this.invoice(manager, user, id));
    });
  }

  // Lock order: shift -> invoice -> promotion codes -> stock (same as payCash).
  private async cancelPaid(manager: EntityManager, user: UserSummary, row: Row, reason: string): Promise<void> {
    if (!user.permissions.includes('invoice.cancel_paid')) throw httpError(403, 'PERMISSION_DENIED', 'Bạn không có quyền thực hiện thao tác này.');
    const [shift] = await manager.query('SELECT id, status FROM work_shifts WHERE id=$1 FOR UPDATE', [row.work_shift_id]);
    if (shift.status !== 'OPEN') throw httpError(409, 'CANCEL_NOT_ALLOWED', 'Chỉ hủy được đơn đã thanh toán khi ca của đơn còn mở.');
    const locked = await this.invoice(manager, user, row.id, true);
    if (locked.status !== 'PAID') throw httpError(409, 'INVOICE_NOT_OPEN', 'Đơn không còn mở.');

    const [payment] = await manager.query('SELECT method, amount::text AS amount FROM payments WHERE invoice_id=$1', [row.id]);
    if (payment?.method === 'CASH') {
      const [cash] = await manager.query(`SELECT r.opening_cash::text AS opening_cash,
        COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices i ON i.id=p.invoice_id
          WHERE i.work_shift_id=r.work_shift_id AND i.status='PAID' AND p.method='CASH'),0)::text AS cash_sales,
        COALESCE((SELECT SUM(e.amount) FROM shift_expenses e
          WHERE e.work_shift_id=r.work_shift_id AND e.paid_from_drawer=true),0)::text AS expenses
        FROM cash_reconciliations r WHERE r.work_shift_id=$1`, [row.work_shift_id]);
      if (!cash) throw httpError(500, 'INTERNAL_ERROR', 'Không tìm thấy bản ghi đối soát của ca thu ngân.');
      if (BigInt(cash.opening_cash) + BigInt(cash.cash_sales) - BigInt(cash.expenses) - BigInt(payment.amount) < 0n)
        throw httpError(409, 'CANCEL_EXCEEDS_DRAWER', 'Tiền mặt trong két không đủ để hoàn cho khách.');
    }

    const promos: Row[] = await manager.query(`SELECT p.id FROM promotion_codes p
      JOIN invoice_promotion_codes ip ON ip.promotion_code_id=p.id WHERE ip.invoice_id=$1 FOR UPDATE OF p`, [row.id]);
    // CHECK used_count >= 0 aborts the transaction (500) if the counter is already 0.
    for (const promo of promos) await manager.query('UPDATE promotion_codes SET used_count=used_count-1,updated_at=now() WHERE id=$1', [promo.id]);

    const sales: Row[] = await manager.query(`SELECT branch_id, ingredient_id, quantity FROM stock_movements
      WHERE invoice_id=$1 AND type='SALE' ORDER BY ingredient_id, id`, [row.id]);
    for (const sale of sales) {
      await manager.query(`INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,invoice_id,created_by,source)
        VALUES($1,$2,$3,'SALE_REVERSAL',-$4::numeric,0,$5,$6,'USER')`,
        [randomUUID(), sale.branch_id, sale.ingredient_id, sale.quantity, row.id, user.id]);
    }
    await manager.query(`UPDATE invoices SET status='CANCELLED',cancel_reason=$2,cancelled_by=$3,
      cancelled_at=now(),updated_at=now() WHERE id=$1`, [row.id, reason, user.id]);
  }
}
