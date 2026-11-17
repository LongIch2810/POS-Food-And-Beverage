import { HttpException, Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, EntityManager, In, IsNull, Not } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { uuidPattern } from '../http/request-validation';
import { Branch } from '../organization/entities/branch.entity';
import { Store } from '../platform/entities/store.entity';
import { PromotionCode } from '../promotions/entities/promotion-code.entity';
import { WorkShift } from '../shifts/entities/work-shift.entity';
import { BankTransferEvent } from './entities/bank-transfer-event.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { InvoicePromotionCode } from './entities/invoice-promotion-code.entity';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';
import { StoreBankAccount } from './entities/store-bank-account.entity';
import { TransferAttempt } from './entities/transfer-attempt.entity';
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
    const invoice=await manager.getRepository(Invoice).findOne({where:{id},...(lock?{lock:{mode:'pessimistic_write'}}:{})});
    const branch=invoice?await manager.getRepository(Branch).findOne({where:{id:invoice.branch_id},select:{id:true,store_id:true}}):null;
    const row:Row|null=invoice&&branch?{...invoice,store_id:branch.store_id}:null;
    if(!row||row.store_id!==this.store(user)||(!user.permissions.includes('branch.access_all')&&row.branch_id!==user.branchId))
      throw httpError(404,'NOT_FOUND','Không tìm thấy hóa đơn.');
    return row;
  }

  private async shift(manager:EntityManager,user:UserSummary):Promise<Row> {
    const row=(await manager.getRepository(WorkShift).find({where:{user_id:user.id,status:'OPEN',shift_type:'CASHIER',branch:{store_id:this.store(user)}},
      select:{id:true,branch_id:true},lock:{mode:'pessimistic_write',tables:['work_shifts']}}))[0];
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
    const row=await this.db.getRepository(TransferAttempt).findOneBy({invoice_id:invoiceId,status:'PENDING'});
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
      // QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it
      await manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))','locked').fromDummy().setParameter('lockKey',normalized).getRawOne();
      const prior=await manager.getRepository(TransferAttempt).findOneBy({idempotency_key:normalized});
      if(prior){
        if(prior.invoice_id!==visible.id||prior.idempotency_request_hash!==hash)
          throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
        return this.view(prior,true);
      }
      if(await manager.getRepository(Payment).existsBy({idempotency_key:normalized})||await manager.getRepository(Invoice).existsBy({zero_completion_key:normalized}))
        throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
      await manager.getRepository(Store).findOne({where:{id:this.store(user)},select:{id:true},lock:{mode:'pessimistic_write'}});
      const shift=await this.shift(manager,user);
      const invoice=await this.invoice(manager,user,invoiceId,true);
      if(invoice.status!=='OPEN')throw httpError(409,'INVOICE_NOT_OPEN','Đơn không còn mở.');
      if(invoice.branch_id!==shift.branch_id||invoice.work_shift_id!==shift.id)
        throw httpError(409,'SHIFT_NOT_OPEN','Đơn không thuộc ca thu ngân hiện tại.');
      if(await manager.getRepository(TransferAttempt).existsBy({invoice_id:invoiceId,status:'PENDING'}))
        throw httpError(409,'TRANSFER_PENDING','Đơn đang chờ chuyển khoản. Hủy chờ trước khi sửa hoặc thanh toán.');
      const account=await manager.getRepository(StoreBankAccount).findOneBy({store_id:this.store(user)});
      if(!account)throw httpError(409,'BANK_ACCOUNT_REQUIRED','Cửa hàng chưa cài tài khoản nhận chuyển khoản.');
      if(!await manager.getRepository(InvoiceItem).existsBy({invoice_id:invoiceId}))throw httpError(422,'INVOICE_EMPTY','Đơn chưa có món để thanh toán.');
      const linked=await manager.getRepository(InvoicePromotionCode).findOneBy({invoice_id:invoiceId});
      if(linked)await manager.getRepository(PromotionCode).findOne({where:{id:linked.promotion_code_id},select:{id:true},lock:{mode:'pessimistic_write'}});
      const pricing=await this.sales.evaluateInvoicePricing(manager,invoiceId);
      if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
      if(pricing.totalAmount===0n)throw httpError(422,'ZERO_TOTAL_REQUIRED','Đơn 0đ cần hoàn tất bằng thao tác riêng.');
      if(pricing.totalAmount!==BigInt(amount))throw httpError(422,'PAYMENT_AMOUNT_MISMATCH','Số tiền không khớp tổng đơn.');
      const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for(let attempt=0;attempt<5;attempt++){
        const reference=invoice.invoice_code+Array.from(randomBytes(8),byte=>alphabet[byte%alphabet.length]).join('');
        // QueryBuilder: ON CONFLICT (target) DO NOTHING; upsert() only does DO UPDATE and orIgnore() drops the target
        const result=await manager.createQueryBuilder().insert().into(TransferAttempt).values({id:randomUUID(),invoice_id:invoiceId,store_id:this.store(user),
          bank_bin:account.bank_bin,account_number:account.account_number,account_name:account.account_name,amount:String(amount),transfer_reference:reference,
          idempotency_key:normalized,idempotency_request_hash:hash,status:'PENDING'}).onConflict('(transfer_reference) DO NOTHING').returning('*').updateEntity(false).execute();
        const row=result.raw[0];
        if(row)return this.view(row);
      }
      throw httpError(409,'CONFLICT','Không tạo được mã chuyển khoản duy nhất. Vui lòng thử lại.');
    });
  }

  async cancelTransferAttempt(user:UserSummary,attemptId:string):Promise<void> {
    await this.db.transaction(async manager=>{
      const branchId=user.permissions.includes('branch.access_all')?null:user.branchId;
      if(!user.permissions.includes('branch.access_all')&&!branchId)throw httpError(403,'PERMISSION_DENIED','Tài khoản chưa được gán chi nhánh.');
      const storeId=this.store(user);
      const found=await manager.getRepository(TransferAttempt).findOne({where:{id:attemptId},select:{id:true,invoice_id:true}});
      const scoped=found?await manager.getRepository(Invoice).findOne({where:{id:found.invoice_id,...(branchId!==null?{branch_id:branchId}:{})},select:{id:true,branch_id:true}}):null;
      const visible=scoped&&await manager.getRepository(Branch).existsBy({id:scoped.branch_id,store_id:storeId})?scoped:null;
      if(!visible)throw httpError(404,'NOT_FOUND','Không tìm thấy lượt chuyển khoản.');
      const shift=await this.shift(manager,user);
      const invoice=await this.invoice(manager,user,visible.id,true);
      const attempt=(await manager.getRepository(TransferAttempt).findOne({where:{id:attemptId},lock:{mode:'pessimistic_write'}}))!;
      if(invoice.status!=='OPEN')throw httpError(409,'INVOICE_NOT_OPEN','Đơn không còn mở.');
      if(invoice.branch_id!==shift.branch_id||invoice.work_shift_id!==shift.id)
        throw httpError(409,'SHIFT_NOT_OPEN','Đơn không thuộc ca thu ngân hiện tại.');
      if(attempt.status!=='PENDING')throw httpError(409,'TRANSFER_NOT_PENDING','Lượt chuyển khoản không còn chờ xác nhận.');
      await manager.getRepository(TransferAttempt).update({id:attemptId},{status:'CANCELLED',updated_at:()=>'now()'});
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
      const storeId=this.store(user);
      const found=await manager.getRepository(TransferAttempt).findOne({where:{id:attemptId},select:{id:true,invoice_id:true}});
      const scoped=found?await manager.getRepository(Invoice).findOne({where:{id:found.invoice_id,...(branchId!==null?{branch_id:branchId}:{})},select:{id:true,branch_id:true,work_shift_id:true}}):null;
      const visible=scoped&&await manager.getRepository(Branch).existsBy({id:scoped.branch_id,store_id:storeId})?scoped:null;
      if(!visible)throw httpError(404,'NOT_FOUND','Không tìm thấy lượt chuyển khoản.');
      // QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it
      await manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))','locked').fromDummy().setParameter('lockKey',normalized).getRawOne();
      const previous=await manager.getRepository(Payment).findOneBy({idempotency_key:normalized});
      if(previous){
        if(previous.transfer_attempt_id!==attemptId||previous.idempotency_request_hash!==hash)
          throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
        return this.manualView(previous,true);
      }
      if(await manager.getRepository(Invoice).existsBy({zero_completion_key:normalized})||await manager.getRepository(TransferAttempt).existsBy({idempotency_key:normalized}))
        throw httpError(409,'IDEMPOTENCY_KEY_REUSED','Mã yêu cầu đã được dùng cho nội dung khác.');
      const shift=await manager.getRepository(WorkShift).findOne({where:{id:visible.work_shift_id},select:{id:true,status:true},lock:{mode:'pessimistic_write'}});
      const invoice=await this.invoice(manager,{...user,branchId},visible.id,true);
      const attempt=(await manager.getRepository(TransferAttempt).findOne({where:{id:attemptId},lock:{mode:'pessimistic_write'}}))!;
      if(!shift||shift.status!=='OPEN')throw httpError(409,'SHIFT_CLOSED','Ca thu ngân đã đóng.');
      if(invoice.status!=='OPEN')throw httpError(409,'INVOICE_NOT_OPEN','Đơn không còn mở.');
      if(attempt.status!=='PENDING')throw httpError(409,'TRANSFER_NOT_PENDING','Lượt chuyển khoản không còn chờ xác nhận.');
      const linked=await manager.getRepository(InvoicePromotionCode).findOneBy({invoice_id:invoice.id});
      if(linked)await manager.getRepository(PromotionCode).findOne({where:{id:linked.promotion_code_id},select:{id:true},lock:{mode:'pessimistic_write'}});
      const pricing=await this.sales.evaluateInvoicePricing(manager,invoice.id);
      if(!pricing.promotionApplicable)throw httpError(422,'PROMOTION_NOT_APPLICABLE','Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
      if(BigInt(input.actualReceivedAmount)<pricing.totalAmount)throw httpError(422,'TRANSFER_AMOUNT_INSUFFICIENT','Số tiền thực nhận chưa đủ để thanh toán đơn.');
      // QueryBuilder: ON CONFLICT (target) DO NOTHING; upsert() only does DO UPDATE and orIgnore() drops the target
      const result=await manager.createQueryBuilder().insert().into(Payment).values({id:randomUUID(),invoice_id:invoice.id,method:'TRANSFER',amount:String(pricing.totalAmount),
        actual_received_amount:String(input.actualReceivedAmount),excess_amount:String(BigInt(input.actualReceivedAmount)-pricing.totalAmount),transfer_attempt_id:attempt.id,
        receiving_account_number:attempt.account_number,transaction_ref:input.transactionRef,transaction_ref_kind:'BANK',confirmation_source:'MANUAL',confirmed_by:user.id,
        confirmation_reason:input.reason,created_by:user.id,idempotency_key:normalized,idempotency_request_hash:hash})
        .onConflict("(receiving_account_number,transaction_ref_kind,transaction_ref) WHERE method='TRANSFER' AND transaction_ref IS NOT NULL DO NOTHING").returning('*').updateEntity(false).execute();
      const payment=result.raw[0];
      if(!payment)throw httpError(409,'BANK_TRANSACTION_REUSED','Giao dịch ngân hàng đã được dùng để xác nhận đơn khác.');
      await this.sales.finalizeInvoice(manager,invoice.id,user.id);
      await manager.getRepository(TransferAttempt).update({id:attempt.id},{status:'PAID',updated_at:()=>'now()'});
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
    const base={store_id:storeId,...(branchId!==null?{branch_id:branchId}:{})};
    const total=await this.db.getRepository(BankTransferEvent).count({where:[
      {...base,disposition:In(['UNDERPAID','ATTEMPT_CANCELLED','INVOICE_NOT_OPEN','PROMOTION_INVALID','DUPLICATE'])},
      {...base,disposition:'QUARANTINED',attempt_id:Not(IsNull())}]});
    // QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()
    const builder=this.db.getRepository(BankTransferEvent).createQueryBuilder('e').select('e.id','id').addSelect('e.disposition','disposition')
      .addSelect('e.transfer_amount','transfer_amount').addSelect('e.received_at','received_at').addSelect('e.invoice_id','invoice_id')
      .addSelect(`to_char(e.received_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,'cursor_received_at').where('e.store_id = :storeId',{storeId})
      .andWhere(`(e.disposition IN ('UNDERPAID','ATTEMPT_CANCELLED','INVOICE_NOT_OPEN','PROMOTION_INVALID','DUPLICATE') OR (e.disposition = 'QUARANTINED' AND e.attempt_id IS NOT NULL))`);
    if(branchId!==null)builder.andWhere('e.branch_id = :branchId',{branchId});
    if(after)builder.andWhere('(e.received_at, e.id) < (CAST(:receivedAt AS timestamptz), CAST(:id AS uuid))',{receivedAt:after.receivedAt,id:after.id});
    const rows:Row[]=await builder.orderBy('e.received_at','DESC').addOrderBy('e.id','DESC').limit(limit+1).getRawMany();
    const selected=rows.slice(0,limit),last=selected.at(-1);
    return {data:selected.map(row=>({id:row.id,reason:row.disposition==='QUARANTINED'?'WRONG_ACCOUNT':row.disposition,amount:Number(row.transfer_amount),receivedAt:row.received_at.toISOString(),invoiceId:row.invoice_id})),
      meta:{limit,nextCursor:rows.length>limit&&last?Buffer.from(JSON.stringify({scope,receivedAt:last.cursor_received_at,id:last.id})).toString('base64url'):null,total}};
  }
}
