import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { uuidPattern } from '../http/request-validation';
import { ManualConfirmationDto, TransferAttemptDto } from './http/payment.dto';
import { SalesService } from './sales.service';

type Row=Record<string,any>;

@Injectable()
export class TransferAttemptsService {
  constructor(private readonly db:DataSource,private readonly sales:SalesService){}

  private store(user:UserSummary):string {
    if(!user.storeId)throw httpError(403,'PERMISSION_DENIED','Không có quyền truy cập dữ liệu vận hành.');
    return user.storeId;
  }

  private async invoice(manager:EntityManager,user:UserSummary,id:string,lock=false):Promise<Row> {
    const [row]=await manager.query(`SELECT i.*,b.store_id FROM invoices i JOIN branches b ON b.id=i.branch_id
      WHERE i.id=$1 ${lock?'FOR UPDATE OF i':''}`,[id]);
    if(!row||row.store_id!==this.store(user)||(!user.permissions.includes('branch.access_all')&&row.branch_id!==user.branchId))
      throw httpError(404,'NOT_FOUND','Không tìm thấy hóa đơn.');
    return row;
  }

  private async shift(manager:EntityManager,user:UserSummary):Promise<Row> {
    const [row]=await manager.query(`SELECT s.id,s.branch_id FROM work_shifts s JOIN branches b ON b.id=s.branch_id
      WHERE s.user_id=$1 AND s.status='OPEN' AND s.shift_type='CASHIER' AND b.store_id=$2 FOR UPDATE OF s`,[user.id,this.store(user)]);
    if(!row)throw httpError(409,'SHIFT_NOT_OPEN','Bạn cần mở ca thu ngân để bán hàng.');
    return row;
  }

  private view(row:Row,replayed=false):TransferAttemptDto {
    const url=row.status==='PENDING'
      ?`https://img.vietqr.io/image/${row.bank_bin.trim()}-${row.account_number}-compact2.svg?amount=${row.amount}&addInfo=${encodeURIComponent(row.transfer_reference.trim())}&accountName=${encodeURIComponent(row.account_name)}`
      :null;
    return {id:row.id,invoiceId:row.invoice_id,status:row.status,amount:Number(row.amount),bankBin:row.bank_bin.trim(),
      accountNumber:row.account_number,accountName:row.account_name,transferReference:row.transfer_reference.trim(),
      qrImageUrl:url,createdAt:row.created_at.toISOString(),replayed};
  }

  async getPendingTransferAttempt(user:UserSummary,invoiceId:string):Promise<TransferAttemptDto|null> {
    await this.invoice(this.db.manager,user,invoiceId);
    const [row]=await this.db.query(`SELECT * FROM transfer_attempts WHERE invoice_id=$1 AND status='PENDING'`,[invoiceId]);
    return row?this.view(row):null;
  }

  async createTransferAttempt(user:UserSummary,invoiceId:string,amount:number,key:string):Promise<TransferAttemptDto> {
    if(typeof key!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))
      throw new HttpException({code:'VALIDATION_ERROR',message:'Mã yêu cầu không hợp lệ.',details:[{location:'header',field:'Idempotency-Key',message:'Cần UUID v4 hợp lệ.'}]},422);
    if(typeof amount!=='number'||!Number.isSafeInteger(amount)||amount<1||amount>1_000_000_000_000)
      throw httpError(422,'VALIDATION_ERROR','Số tiền chuyển khoản không hợp lệ.');
    const normalized=key.toLowerCase();
    return this.db.transaction(async manager=>{
      const visible=await this.invoice(manager,user,invoiceId);
      const hash=createHash('sha256').update(JSON.stringify({invoiceId:visible.id,amount})).digest('hex');
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[normalized]);
      const [prior]=await manager.query('SELECT * FROM transfer_attempts WHERE idempotency_key=$1',[normalized]);
      if(prior){
        if(prior.invoice_id!==visible.id||prior.idempotency_request_hash!==hash)
          throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
        return this.view(prior,true);
      }
      const used=await manager.query(`SELECT id FROM payments WHERE idempotency_key=$1 UNION ALL
        SELECT id FROM invoices WHERE zero_completion_key=$1`,[normalized]);
      if(used.length)throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
      await manager.query('SELECT id FROM stores WHERE id=$1 FOR UPDATE',[this.store(user)]);
      const shift=await this.shift(manager,user);
      const invoice=await this.invoice(manager,user,invoiceId,true);
      if(invoice.status!=='OPEN')throw httpError(409,'INVOICE_NOT_OPEN','Đơn không còn mở.');
      if(invoice.branch_id!==shift.branch_id||invoice.work_shift_id!==shift.id)
        throw httpError(409,'SHIFT_NOT_OPEN','Đơn không thuộc ca thu ngân hiện tại.');
      const pending=await manager.query(`SELECT id FROM transfer_attempts WHERE invoice_id=$1 AND status='PENDING'`,[invoiceId]);
      if(pending.length)throw httpError(409,'TRANSFER_PENDING','Đơn đang chờ chuyển khoản. Hủy chờ trước khi sửa hoặc thanh toán.');
      const [account]=await manager.query('SELECT * FROM store_bank_accounts WHERE store_id=$1',[this.store(user)]);
      if(!account)throw httpError(409,'BANK_ACCOUNT_REQUIRED','Cửa hàng chưa cài tài khoản nhận chuyển khoản.');
      const items=await manager.query('SELECT id FROM invoice_items WHERE invoice_id=$1 LIMIT 1',[invoiceId]);
      if(!items.length)throw httpError(422,'INVOICE_EMPTY','Đơn chưa có món để thanh toán.');
      await manager.query(`SELECT p.id FROM promotion_codes p JOIN invoice_promotion_codes ip ON ip.promotion_code_id=p.id
        WHERE ip.invoice_id=$1 FOR UPDATE OF p`,[invoiceId]);
      const pricing=await this.sales.evaluateInvoicePricing(manager,invoiceId);
      if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
      if(pricing.totalAmount===0n)throw httpError(422,'ZERO_TOTAL_REQUIRED','Đơn 0đ cần hoàn tất bằng thao tác riêng.');
      if(pricing.totalAmount!==BigInt(amount))throw httpError(422,'PAYMENT_AMOUNT_MISMATCH','Số tiền không khớp tổng đơn.');
      const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for(let attempt=0;attempt<5;attempt++){
        const reference=invoice.invoice_code+Array.from(randomBytes(8),byte=>alphabet[byte%alphabet.length]).join('');
        const [row]=await manager.query(`INSERT INTO transfer_attempts
          (id,invoice_id,store_id,bank_bin,account_number,account_name,amount,transfer_reference,idempotency_key,idempotency_request_hash,status)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING') ON CONFLICT (transfer_reference) DO NOTHING RETURNING *`,
          [randomUUID(),invoiceId,this.store(user),account.bank_bin,account.account_number,account.account_name,
            amount,reference,normalized,hash]);
        if(row)return this.view(row);
      }
      throw httpError(409,'CONFLICT','Không tạo được mã chuyển khoản duy nhất. Vui lòng thử lại.');
    });
  }

  async cancelTransferAttempt(user:UserSummary,attemptId:string):Promise<void> {
    await this.db.transaction(async manager=>{
      const branchId=user.permissions.includes('branch.access_all')?null:user.branchId;
      if(!user.permissions.includes('branch.access_all')&&!branchId)throw httpError(403,'PERMISSION_DENIED','Tài khoản chưa được gán chi nhánh.');
      const [visible]=await manager.query(`SELECT a.invoice_id FROM transfer_attempts a JOIN invoices i ON i.id=a.invoice_id
        JOIN branches b ON b.id=i.branch_id WHERE a.id=$1 AND b.store_id=$2 AND ($3::uuid IS NULL OR i.branch_id=$3)`,
        [attemptId,this.store(user),branchId]);
      if(!visible)throw httpError(404,'NOT_FOUND','Không tìm thấy lượt chuyển khoản.');
      const shift=await this.shift(manager,user);
      const invoice=await this.invoice(manager,user,visible.invoice_id,true);
      const [attempt]=await manager.query('SELECT * FROM transfer_attempts WHERE id=$1 FOR UPDATE',[attemptId]);
      if(invoice.status!=='OPEN')throw httpError(409,'INVOICE_NOT_OPEN','Đơn không còn mở.');
      if(invoice.branch_id!==shift.branch_id||invoice.work_shift_id!==shift.id)
        throw httpError(409,'SHIFT_NOT_OPEN','Đơn không thuộc ca thu ngân hiện tại.');
      if(attempt.status!=='PENDING')throw httpError(409,'TRANSFER_NOT_PENDING','Lượt chuyển khoản không còn chờ xác nhận.');
      await manager.query(`UPDATE transfer_attempts SET status='CANCELLED',updated_at=now() WHERE id=$1`,[attemptId]);
    });
  }

  async confirmTransferManually(user:UserSummary,rawAttemptId:string,input:ManualConfirmationDto,key:string) {
    const attemptId=rawAttemptId.toLowerCase();
    if(typeof key!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))
      throw new HttpException({code:'VALIDATION_ERROR',message:'Mã yêu cầu không hợp lệ.',details:[{location:'header',field:'Idempotency-Key',message:'Cần UUID v4 hợp lệ.'}]},422);
    const normalized=key.toLowerCase();
    const hash=createHash('sha256').update(JSON.stringify({attemptId,transactionRef:input.transactionRef,actualReceivedAmount:input.actualReceivedAmount,reason:input.reason})).digest('hex');
    return this.db.transaction(async manager=>{
      const branchId=user.permissions.includes('branch.access_all')?null:user.branchId;
      if(!user.permissions.includes('branch.access_all')&&!branchId)throw httpError(403,'PERMISSION_DENIED','Tài khoản chưa được gán chi nhánh.');
      const [visible]=await manager.query(`SELECT a.invoice_id,i.work_shift_id FROM transfer_attempts a JOIN invoices i ON i.id=a.invoice_id
        JOIN branches b ON b.id=i.branch_id WHERE a.id=$1 AND b.store_id=$2 AND ($3::uuid IS NULL OR i.branch_id=$3)`,[attemptId,this.store(user),branchId]);
      if(!visible)throw httpError(404,'NOT_FOUND','Không tìm thấy lượt chuyển khoản.');
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[normalized]);
      const [previous]=await manager.query('SELECT * FROM payments WHERE idempotency_key=$1',[normalized]);
      if(previous){
        if(previous.transfer_attempt_id!==attemptId||previous.idempotency_request_hash!==hash)
          throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
        return this.manualView(previous,true);
      }
      const used=await manager.query(`SELECT id FROM invoices WHERE zero_completion_key=$1 UNION ALL SELECT id FROM transfer_attempts WHERE idempotency_key=$1`,[normalized]);
      if(used.length)throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
      const [shift]=await manager.query('SELECT status FROM work_shifts WHERE id=$1 FOR UPDATE',[visible.work_shift_id]);
      const invoice=await this.invoice(manager,{...user,branchId},visible.invoice_id,true);
      const [attempt]=await manager.query('SELECT * FROM transfer_attempts WHERE id=$1 FOR UPDATE',[attemptId]);
      if(!shift||shift.status!=='OPEN')throw httpError(409,'SHIFT_CLOSED','Ca thu ngân đã đóng.');
      if(invoice.status!=='OPEN')throw httpError(409,'INVOICE_NOT_OPEN','Đơn không còn mở.');
      if(attempt.status!=='PENDING')throw httpError(409,'TRANSFER_NOT_PENDING','Lượt chuyển khoản không còn chờ xác nhận.');
      await manager.query(`SELECT p.id FROM promotion_codes p JOIN invoice_promotion_codes ip ON ip.promotion_code_id=p.id WHERE ip.invoice_id=$1 FOR UPDATE OF p`,[invoice.id]);
      const pricing=await this.sales.evaluateInvoicePricing(manager,invoice.id);
      if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
      if(BigInt(input.actualReceivedAmount)<pricing.totalAmount)throw httpError(422,'TRANSFER_AMOUNT_INSUFFICIENT','Số tiền thực nhận chưa đủ để thanh toán đơn.');
      const [payment]=await manager.query(`INSERT INTO payments(id,invoice_id,method,amount,actual_received_amount,excess_amount,
        transfer_attempt_id,receiving_account_number,transaction_ref,transaction_ref_kind,confirmation_source,confirmed_by,confirmation_reason,created_by,idempotency_key,idempotency_request_hash)
        VALUES($1,$2,'TRANSFER',$3,$4,$5,$6,$7,$8,'BANK','MANUAL',$9,$10,$9,$11,$12)
        ON CONFLICT (receiving_account_number,transaction_ref_kind,transaction_ref) WHERE method='TRANSFER' AND transaction_ref IS NOT NULL DO NOTHING RETURNING *`,
        [randomUUID(),invoice.id,Number(pricing.totalAmount),input.actualReceivedAmount,input.actualReceivedAmount-Number(pricing.totalAmount),attempt.id,attempt.account_number,input.transactionRef,user.id,input.reason,normalized,hash]);
      if(!payment)throw httpError(409,'BANK_TRANSACTION_REUSED','Giao dịch ngân hàng đã được dùng để xác nhận đơn khác.');
      await this.sales.finalizeInvoice(manager,invoice.id,user.id);
      await manager.query(`UPDATE transfer_attempts SET status='PAID',updated_at=now() WHERE id=$1`,[attempt.id]);
      return this.manualView(payment,false);
    });
  }

  private manualView(row:Row,replayed:boolean) {
    return {paymentId:row.id,invoiceId:row.invoice_id,status:'PAID',method:'TRANSFER',amount:Number(row.amount),
      actualReceivedAmount:Number(row.actual_received_amount),excessAmount:Number(row.excess_amount),transactionRef:row.transaction_ref,
      confirmationSource:'MANUAL',confirmedBy:row.confirmed_by,reason:row.confirmation_reason,paidAt:row.paid_at.toISOString(),replayed};
  }

  async listBankTransferExceptions(user:UserSummary,query:Record<string,unknown>) {
    if(Object.keys(query).some(key=>!['limit','cursor'].includes(key)))throw httpError(422,'VALIDATION_ERROR','Bộ lọc không hợp lệ.');
    const rawLimit=query.limit??'20';
    if(typeof rawLimit!=='string'||! /^(?:[1-9]|[1-9][0-9]|100)$/.test(rawLimit))throw httpError(422,'VALIDATION_ERROR','Giới hạn không hợp lệ.');
    const limit=Number(rawLimit),storeId=this.store(user),branchId=user.permissions.includes('branch.access_all')?null:user.branchId;
    if(!user.permissions.includes('branch.access_all')&&!branchId)throw httpError(403,'PERMISSION_DENIED','Tài khoản chưa được gán chi nhánh.');
    const scope=JSON.stringify([storeId,branchId]);let after:{receivedAt:string;id:string}|null=null;
    if(query.cursor!==undefined){
      if(typeof query.cursor!=='string'||! /^[A-Za-z0-9_-]{1,1024}$/.test(query.cursor))throw httpError(422,'VALIDATION_ERROR','Cursor không hợp lệ.');
      try{
        const parsed=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8'));
        if(parsed.scope!==scope||typeof parsed.receivedAt!=='string'||!Number.isFinite(Date.parse(parsed.receivedAt))
          ||typeof parsed.id!=='string'||!uuidPattern.test(parsed.id))throw new Error();
        after=parsed;
      }catch{throw httpError(422,'VALIDATION_ERROR','Cursor không hợp lệ.');}
    }
    const where=`WHERE store_id=$1 AND ($2::uuid IS NULL OR branch_id=$2)
      AND (disposition IN ('UNDERPAID','ATTEMPT_CANCELLED','INVOICE_NOT_OPEN','PROMOTION_INVALID','DUPLICATE')
        OR (disposition='QUARANTINED' AND attempt_id IS NOT NULL))`;
    const params=[storeId,branchId,after?.receivedAt??null,after?.id??null,limit+1];
    const rows:Row[]=await this.db.query(`SELECT id,disposition,transfer_amount,received_at,invoice_id,
      to_char(received_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_received_at
      FROM bank_transfer_events ${where} AND ($3::timestamptz IS NULL OR (received_at,id)<($3::timestamptz,$4::uuid))
      ORDER BY received_at DESC,id DESC LIMIT $5`,params);
    const [count]=await this.db.query(`SELECT COUNT(*)::int AS total FROM bank_transfer_events ${where}`,params.slice(0,2));
    const selected=rows.slice(0,limit),last=selected.at(-1);
    return {data:selected.map(row=>({id:row.id,reason:row.disposition==='QUARANTINED'?'WRONG_ACCOUNT':row.disposition,amount:Number(row.transfer_amount),receivedAt:row.received_at.toISOString(),invoiceId:row.invoice_id})),
      meta:{limit,nextCursor:rows.length>limit&&last?Buffer.from(JSON.stringify({scope,receivedAt:last.cursor_received_at,id:last.id})).toString('base64url'):null,total:count.total}};
  }
}
