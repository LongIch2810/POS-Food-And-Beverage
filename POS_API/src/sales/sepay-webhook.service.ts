import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { DataSource } from 'typeorm';
import { sePayWebhookSecret } from '../auth/auth-config';
import { httpError } from '../http/http-error';
import { PromotionCode } from '../promotions/entities/promotion-code.entity';
import { WorkShift } from '../shifts/entities/work-shift.entity';
import { BankTransferEvent } from './entities/bank-transfer-event.entity';
import { InvoicePromotionCode } from './entities/invoice-promotion-code.entity';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';
import { TransferAttempt } from './entities/transfer-attempt.entity';
import { SalesService } from './sales.service';

type EventPayload={
  id:number;accountNumber:string;code:string|null;content:string;transferType:'in'|'out';
  transferAmount:number;referenceCode:string;
};

export function verifySePayWebhookRequest(rawBody:Buffer,signature:string,timestamp:string):void {
    const secret=sePayWebhookSecret();
    if(!secret)throw httpError(503,'SERVICE_UNAVAILABLE','Webhook chưa được cấu hình an toàn.');
    if(!signature)throw httpError(401,'INVALID_WEBHOOK_SIGNATURE','Chữ ký webhook không hợp lệ.');
    if(!/^\d{1,12}$/.test(timestamp)||!Number.isSafeInteger(Number(timestamp))
      ||Math.abs(Math.floor(Date.now()/1000)-Number(timestamp))>300)
      throw httpError(400,'INVALID_WEBHOOK_PAYLOAD','Thời gian webhook không hợp lệ.');
    const expected=createHmac('sha256',secret).update(timestamp+'.').update(rawBody).digest();
    if(!/^sha256=[0-9a-fA-F]{64}$/.test(signature)
      ||!timingSafeEqual(expected,Buffer.from(signature.slice(7),'hex')))
      throw httpError(401,'INVALID_WEBHOOK_SIGNATURE','Chữ ký webhook không hợp lệ.');
}

@Injectable()
export class SePayWebhookService {
  constructor(private readonly db:DataSource,private readonly sales:SalesService){}

  async processSePayWebhook(rawBody:Buffer,signature:string,timestamp:string):Promise<void> {
    verifySePayWebhookRequest(rawBody,signature,timestamp);
    let input:unknown;
    try{input=JSON.parse(rawBody.toString('utf8'));}catch{throw httpError(400,'INVALID_WEBHOOK_PAYLOAD','Nội dung webhook không hợp lệ.');}
    if(!input||typeof input!=='object'||Array.isArray(input))throw httpError(400,'INVALID_WEBHOOK_PAYLOAD','Nội dung webhook không hợp lệ.');
    const data=input as Record<string,unknown>;
    if(typeof data.id!=='number'||!Number.isSafeInteger(data.id)||data.id<1
      ||typeof data.accountNumber!=='string'||data.accountNumber.length<1||data.accountNumber.length>34
      ||!(data.code===null||(typeof data.code==='string'&&data.code.length<=100))
      ||typeof data.content!=='string'||data.content.length>500
      ||!['in','out'].includes(String(data.transferType))
      ||typeof data.transferAmount!=='number'||!Number.isSafeInteger(data.transferAmount)
      ||data.transferAmount<1||data.transferAmount>1_000_000_000_000
      ||typeof data.referenceCode!=='string'||data.referenceCode.length>100)
      throw httpError(400,'INVALID_WEBHOOK_PAYLOAD','Nội dung webhook không hợp lệ.');
    const payload=data as EventPayload;
    const tokens=[...new Set([...([payload.code??'',payload.content].join(' '))
      .matchAll(/(?<![A-Za-z0-9])HD[A-Z0-9]{16}(?![A-Za-z0-9])/g)].map(match=>match[0]))];
    await this.db.transaction(async manager=>{
      const eventId=String(payload.id);
      // QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it
      await manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))','locked').fromDummy().setParameter('lockKey','sepay:'+eventId).getRawOne();
      if(await manager.getRepository(BankTransferEvent).existsBy({provider_event_id:eventId}))return;
      const reference=tokens.length===1?tokens[0]:null;
      const found=reference?await manager.getRepository(TransferAttempt).findOne({where:{transfer_reference:reference},
        select:{id:true,invoice_id:true,store_id:true,account_number:true,idempotency_key:true,idempotency_request_hash:true}}):null;
      const scoped=found?await manager.getRepository(Invoice).findOne({where:{id:found.invoice_id},select:{id:true,work_shift_id:true,branch_id:true}}):null;
      const attempt=found&&scoped&&{...found,work_shift_id:scoped.work_shift_id,branch_id:scoped.branch_id};
      if(attempt&&attempt.account_number===payload.accountNumber&&payload.transferType==='in'){
        const shift=(await manager.getRepository(WorkShift).findOne({where:{id:attempt.work_shift_id},select:{id:true,status:true},lock:{mode:'pessimistic_write'}}))!;
        const invoice=(await manager.getRepository(Invoice).findOne({where:{id:attempt.invoice_id},select:{id:true,status:true},lock:{mode:'pessimistic_write'}}))!;
        const locked=(await manager.getRepository(TransferAttempt).findOne({where:{id:attempt.id},select:{id:true,status:true},lock:{mode:'pessimistic_write'}}))!;
        let disposition:'PAID'|'UNDERPAID'|'ATTEMPT_CANCELLED'|'INVOICE_NOT_OPEN'|'PROMOTION_INVALID'|'DUPLICATE';
        if(invoice.status!=='OPEN'||shift.status!=='OPEN')disposition='INVOICE_NOT_OPEN';
        else if(locked.status!=='PENDING')disposition=locked.status==='CANCELLED'?'ATTEMPT_CANCELLED':'INVOICE_NOT_OPEN';
        else{
          const linked=await manager.getRepository(InvoicePromotionCode).findOneBy({invoice_id:attempt.invoice_id});
          if(linked)await manager.getRepository(PromotionCode).findOne({where:{id:linked.promotion_code_id},select:{id:true},lock:{mode:'pessimistic_write'}});
          const pricing=await this.sales.evaluateInvoicePricing(manager,attempt.invoice_id);
          if(!pricing.promotionApplicable)disposition='PROMOTION_INVALID';
          else if(BigInt(payload.transferAmount)<pricing.totalAmount)disposition='UNDERPAID';
          else{
            const bankReference=payload.referenceCode.trim();
            const transactionRef=bankReference||`SEPAY:${eventId}`;
            // QueryBuilder: ON CONFLICT (target) DO NOTHING; upsert() only does DO UPDATE and orIgnore() drops the target
            const inserted=await manager.createQueryBuilder().insert().into(Payment).values({id:randomUUID(),invoice_id:attempt.invoice_id,method:'TRANSFER',
              amount:String(pricing.totalAmount),actual_received_amount:String(payload.transferAmount),excess_amount:String(payload.transferAmount-Number(pricing.totalAmount)),
              transfer_attempt_id:attempt.id,receiving_account_number:attempt.account_number,transaction_ref:transactionRef,transaction_ref_kind:bankReference?'BANK':'SEPAY_EVENT',
              confirmation_source:'WEBHOOK',idempotency_key:attempt.idempotency_key,idempotency_request_hash:attempt.idempotency_request_hash})
              .onConflict("(receiving_account_number,transaction_ref_kind,transaction_ref) WHERE method='TRANSFER' AND transaction_ref IS NOT NULL DO NOTHING").returning(['id']).updateEntity(false).execute();
            if(inserted.raw.length===0)disposition='DUPLICATE';
            else{
              await this.sales.finalizeInvoice(manager,attempt.invoice_id,null);
              await manager.getRepository(TransferAttempt).update({id:attempt.id},{status:'PAID',updated_at:()=>'now()'});
              disposition='PAID';
            }
          }
        }
        await manager.getRepository(BankTransferEvent).insert({id:randomUUID(),provider_event_id:eventId,provider_reference:payload.referenceCode.trim()||null,
          account_number:payload.accountNumber,transfer_reference:reference,transfer_amount:String(payload.transferAmount),content:payload.content,disposition,
          store_id:attempt.store_id,branch_id:attempt.branch_id,invoice_id:attempt.invoice_id,attempt_id:attempt.id});
        return;
      }
      // Exact QR token but a different receiving account: keep the tenant link so managers see it as WRONG_ACCOUNT.
      const wrongAccount=payload.transferType==='in'?attempt:null;
      await manager.getRepository(BankTransferEvent).insert({id:randomUUID(),provider_event_id:eventId,provider_reference:payload.referenceCode.trim()||null,
        account_number:payload.accountNumber,transfer_reference:reference,transfer_amount:String(payload.transferAmount),content:payload.content,disposition:'QUARANTINED',
        store_id:wrongAccount?.store_id??null,branch_id:wrongAccount?.branch_id??null,invoice_id:wrongAccount?.invoice_id??null,attempt_id:wrongAccount?.id??null});
    });
  }
}
