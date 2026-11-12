import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { DataSource } from 'typeorm';
import { sePayWebhookSecret } from '../auth/auth-config';
import { httpError } from '../http/http-error';
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
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['sepay:'+eventId]);
      const prior=await manager.query('SELECT id FROM bank_transfer_events WHERE provider_event_id=$1',[eventId]);
      if(prior.length)return;
      const reference=tokens.length===1?tokens[0]:null;
      const [attempt]=reference?await manager.query(`SELECT a.*,i.work_shift_id,i.branch_id FROM transfer_attempts a
        JOIN invoices i ON i.id=a.invoice_id WHERE a.transfer_reference=$1`,[reference]):[];
      if(attempt&&attempt.account_number===payload.accountNumber&&payload.transferType==='in'){
        const [shift]=await manager.query('SELECT status FROM work_shifts WHERE id=$1 FOR UPDATE',[attempt.work_shift_id]);
        const [invoice]=await manager.query('SELECT status FROM invoices WHERE id=$1 FOR UPDATE',[attempt.invoice_id]);
        const [locked]=await manager.query('SELECT status FROM transfer_attempts WHERE id=$1 FOR UPDATE',[attempt.id]);
        let disposition:'PAID'|'UNDERPAID'|'ATTEMPT_CANCELLED'|'INVOICE_NOT_OPEN'|'PROMOTION_INVALID'|'DUPLICATE';
        if(invoice.status!=='OPEN'||shift.status!=='OPEN')disposition='INVOICE_NOT_OPEN';
        else if(locked.status!=='PENDING')disposition=locked.status==='CANCELLED'?'ATTEMPT_CANCELLED':'INVOICE_NOT_OPEN';
        else{
          await manager.query(`SELECT p.id FROM promotion_codes p JOIN invoice_promotion_codes ip ON ip.promotion_code_id=p.id
            WHERE ip.invoice_id=$1 FOR UPDATE OF p`,[attempt.invoice_id]);
          const pricing=await this.sales.evaluateInvoicePricing(manager,attempt.invoice_id);
          if(!pricing.promotionApplicable)disposition='PROMOTION_INVALID';
          else if(BigInt(payload.transferAmount)<pricing.totalAmount)disposition='UNDERPAID';
          else{
            const bankReference=payload.referenceCode.trim();
            const transactionRef=bankReference||`SEPAY:${eventId}`;
            const inserted=await manager.query(`INSERT INTO payments(id,invoice_id,method,amount,actual_received_amount,excess_amount,
              transfer_attempt_id,receiving_account_number,transaction_ref,transaction_ref_kind,confirmation_source,idempotency_key,idempotency_request_hash)
              VALUES($1,$2,'TRANSFER',$3,$4,$5,$6,$7,$8,$11,'WEBHOOK',$9,$10)
              ON CONFLICT (receiving_account_number,transaction_ref_kind,transaction_ref)
                WHERE method='TRANSFER' AND transaction_ref IS NOT NULL DO NOTHING RETURNING id`,
              [randomUUID(),attempt.invoice_id,Number(pricing.totalAmount),payload.transferAmount,
                payload.transferAmount-Number(pricing.totalAmount),attempt.id,attempt.account_number,
                transactionRef,attempt.idempotency_key,attempt.idempotency_request_hash,bankReference?'BANK':'SEPAY_EVENT']);
            if(inserted.length===0)disposition='DUPLICATE';
            else{
              await this.sales.finalizeInvoice(manager,attempt.invoice_id,null);
              await manager.query(`UPDATE transfer_attempts SET status='PAID',updated_at=now() WHERE id=$1`,[attempt.id]);
              disposition='PAID';
            }
          }
        }
        await manager.query(`INSERT INTO bank_transfer_events(id,provider_event_id,provider_reference,account_number,
          transfer_reference,transfer_amount,content,disposition,store_id,branch_id,invoice_id,attempt_id)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [randomUUID(),eventId,payload.referenceCode.trim()||null,payload.accountNumber,reference,payload.transferAmount,
            payload.content,disposition,attempt.store_id,attempt.branch_id,attempt.invoice_id,attempt.id]);
        return;
      }
      // Exact QR token but a different receiving account: keep the tenant link so managers see it as WRONG_ACCOUNT.
      const wrongAccount=Boolean(attempt)&&payload.transferType==='in';
      await manager.query(`INSERT INTO bank_transfer_events(id,provider_event_id,provider_reference,account_number,
        transfer_reference,transfer_amount,content,disposition,store_id,branch_id,invoice_id,attempt_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,'QUARANTINED',$8,$9,$10,$11)`,
        [randomUUID(),eventId,payload.referenceCode.trim()||null,payload.accountNumber,reference,
          payload.transferAmount,payload.content,wrongAccount?attempt.store_id:null,wrongAccount?attempt.branch_id:null,
          wrongAccount?attempt.invoice_id:null,wrongAccount?attempt.id:null]);
    });
  }
}
