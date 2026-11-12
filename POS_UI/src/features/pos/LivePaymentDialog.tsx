import React, {useEffect, useRef, useState} from 'react';
import {AuthError} from '../../auth/client';
import {salesService, type InvoiceDetail, type ManualInput, type PaymentPreview, type TransferAttempt, type BankTransferException} from '../../services/salesService';
import {formatVND} from '../../utils/formatters';
import {Dialog} from '../../components/ui/Dialog';

const control:React.CSSProperties={minHeight:44,padding:'9px 12px',border:'1px solid var(--color-border-control)',borderRadius:8,background:'var(--color-surface)',color:'var(--color-text)'};
type Props={invoice:InvoiceDetail;permissions:string[];canSell:boolean;onClose:()=>void;onPaid:()=>void;onChanged:()=>void};
type PendingRequest={kind:'cash'|'zero'|'qr'|'manual';key:string;body?:unknown};
const message=(error:unknown)=>error instanceof Error?error.message:'Không thể thực hiện. Vui lòng thử lại.';

export function LivePaymentDialog({invoice,permissions,canSell,onClose,onPaid,onChanged}:Props) {
  const [preview,setPreview]=useState<PaymentPreview|null>(null),[attempt,setAttempt]=useState<TransferAttempt|null>(null);
  const [mode,setMode]=useState<'cash'|'qr'>('cash'),[tendered,setTendered]=useState(''),[code,setCode]=useState('');
  const [ref,setRef]=useState(''),[received,setReceived]=useState(''),[reason,setReason]=useState(''),[manual,setManual]=useState(false);
  const [exceptions,setExceptions]=useState<BankTransferException[]>([]),[nextCursor,setNextCursor]=useState<string|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[imageError,setImageError]=useState(false);
  const [uncertain,setUncertain]=useState(false);const pending=useRef<PendingRequest|null>(null),live=useRef(true),sending=useRef(false),paid=useRef(false);
  const canManual=permissions.includes('transfer.confirm_manual'),canExceptions=permissions.includes('transfer.exception_read');
  const markPaid=()=>{if(!paid.current&&live.current){paid.current=true;onPaid();}};
  const load=async()=>{
    const [pricing,current]=await Promise.all([salesService.paymentPreview(invoice.id),salesService.getPendingTransferAttempt(invoice.id)]);
    if(live.current){setPreview(pricing);setAttempt(current?.status==='PENDING'?current:null);setImageError(false);}
  };
  const loadExceptions=async(cursor?:string)=>{
    const page=await salesService.listBankTransferExceptions(cursor);
    if(live.current){setExceptions(previous=>cursor?[...previous,...page.data]:page.data);setNextCursor(page.meta.nextCursor);}
  };
  useEffect(()=>{
    live.current=true;setLoading(true);setError('');
    void Promise.all([load(),...(canExceptions?[loadExceptions()]:[])]).catch(e=>{if(live.current)setError(message(e));}).finally(()=>{if(live.current)setLoading(false);});
    return ()=>{live.current=false;};
  },[invoice.id]);
  const release=()=>{setAttempt(null);setUncertain(false);pending.current=null;};
  useEffect(()=>{
    if(!attempt)return;
    let active=true;
    const interval=setInterval(()=>{void salesService.get(invoice.id).then(detail=>{if(!active||!live.current)return;
      if(detail.status==='PAID'){markPaid();return;}if(detail.status!=='OPEN'){release();return;}
      return salesService.getPendingTransferAttempt(invoice.id).then(current=>{if(!active||!live.current)return;if(current?.status==='PENDING'){if(current.id!==attempt.id){release();void load().catch(e=>{if(live.current)setError(message(e));});}setAttempt(current);return;}
        return salesService.get(invoice.id).then(latest=>{if(!active||!live.current)return;if(latest.status==='PAID')markPaid();else release();});});
    }).catch(e=>{if(active&&live.current)setError(message(e));});},3000);
    return ()=>{active=false;clearInterval(interval);};
  },[invoice.id,attempt?.id]);
  const action=async(kind:PendingRequest['kind'],body?:unknown)=>{
    if(sending.current)return;
    const current=pending.current;
    if(current&&current.kind!==kind){setError('Hãy thử lại yêu cầu trước để xác nhận kết quả.');return;}
    const entry=current??{kind,key:crypto.randomUUID(),body};pending.current=entry;sending.current=true;setBusy(true);setError('');
    try{
      if(kind==='cash')await salesService.payCash(invoice.id,entry.body as {method:'CASH';amount:number;tenderedAmount:number},entry.key);
      if(kind==='zero')await salesService.completeZero(invoice.id,entry.key);
      if(kind==='qr'){
        const result=await salesService.createTransferAttempt(invoice.id,entry.body as number,entry.key);
        if(live.current){setAttempt(result.status==='PENDING'?result:null);setImageError(false);}
        if(result.status==='PAID')markPaid();
      }
      if(kind==='manual'&&attempt)await salesService.confirmTransferManually(attempt.id,entry.body as ManualInput,entry.key);
      pending.current=null;if(live.current)setUncertain(false);
      if(kind==='cash'||kind==='zero'||kind==='manual')markPaid();else if(live.current)onChanged();
    }catch(e){
      const uncertainResult=!(e instanceof AuthError)||e.code==='NETWORK_ERROR'||e.code==='UNKNOWN'||(e.status!==undefined&&e.status>=500);
      if(!uncertainResult)pending.current=null;
      if(live.current){setUncertain(uncertainResult);setError(message(e));}
    }finally{sending.current=false;if(live.current)setBusy(false);}
  };
  const mutate=async(fn:()=>Promise<unknown>)=>{
    if(sending.current||uncertain)return;sending.current=true;setBusy(true);setError('');
    try{await fn();await load();if(live.current)onChanged();}
    catch(e){if(live.current)setError(message(e));}
    finally{sending.current=false;if(live.current)setBusy(false);}
  };
  const integer=(value:string)=>/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))&&Number(value)<=1_000_000_000_000;
  const locked=busy||uncertain;
  return <Dialog isOpen onClose={onClose} disableClose={locked} title={`Thanh toán · ${invoice.invoiceCode}`} maxWidth={560}>
      {loading&&<p role="status">Đang tải thông tin thanh toán...</p>}
      {error&&<p role="alert">{error}</p>}
      {uncertain&&<p role="status">Kết quả chưa rõ. Hãy thử lại cùng yêu cầu để đối chiếu.</p>}
      {preview&&<>
        <p>Tạm tính: {formatVND(preview.subtotal)} · Giảm giá: {formatVND(preview.discountAmount)}</p>
        <h3>Cần thanh toán: {formatVND(preview.totalAmount)}</h3>
        {preview.promotion&&<p>Mã {preview.promotion.code}: {preview.promotion.applicable?'Đủ điều kiện':'Không còn đủ điều kiện'} {preview.promotion.reason??''}</p>}
        {preview.warnings.map((warning,index)=><p role="alert" key={index}>{warning.type==='MISSING_RECIPE'?'Món chưa có công thức; vẫn có thể bán.':'Tồn kho sẽ âm; vẫn có thể bán.'}</p>)}
        {!attempt&&canSell&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <label>Mã giảm giá <input aria-label="Mã giảm giá" style={control} value={code} disabled={locked} onChange={e=>setCode(e.target.value)} /></label>
          <button type="button" style={control} disabled={locked||!code.trim()} onClick={()=>void mutate(()=>salesService.applyPromotion(invoice.id,code.trim()))}>Áp dụng mã</button>
          {preview.promotion&&<button type="button" style={control} disabled={locked} onClick={()=>void mutate(()=>salesService.removePromotion(invoice.id))}>Bỏ mã</button>}
        </div>}
        {attempt?<>
          <h3>Đang chờ chuyển khoản</h3>
          {attempt.qrImageUrl&&!imageError&&<img src={attempt.qrImageUrl} onError={()=>setImageError(true)} alt="Mã QR chuyển khoản" style={{width:'min(260px,100%)'}} />}
          {imageError&&<p>Không tải được QR. Khách có thể tự nhập thông tin sau.</p>}
          <p>Ngân hàng: {attempt.bankBin} · Người nhận: {attempt.accountName}</p><p>Số tài khoản: {attempt.accountNumber}</p>
          <p>Số tiền: {formatVND(attempt.amount)} · Nội dung: {attempt.transferReference}</p>
          {canSell&&<button type="button" style={control} disabled={locked} onClick={()=>void mutate(()=>salesService.cancelTransferAttempt(attempt.id))}>Hủy chờ</button>}
          {canManual&&<button type="button" style={control} disabled={locked} onClick={()=>setManual(!manual)}>Xác nhận thủ công</button>}
          {manual&&canManual&&<div style={{display:'grid',gap:8,marginTop:12}}>
            <label>Mã giao dịch <input aria-label="Mã giao dịch" style={control} value={ref} disabled={locked} onChange={e=>setRef(e.target.value)} /></label>
            <label>Số tiền thực nhận <input aria-label="Số tiền thực nhận" inputMode="numeric" style={control} value={received} disabled={locked} onChange={e=>setReceived(e.target.value)} /></label>
            <label>Lý do <input aria-label="Lý do xác nhận" style={control} value={reason} disabled={locked} onChange={e=>setReason(e.target.value)} /></label>
            <button type="button" style={control} disabled={busy||(!uncertain&&(!ref.trim()||!reason.trim()||!integer(received)||Number(received)<preview.totalAmount))}
              onClick={()=>void action('manual',{transactionRef:ref.trim(),actualReceivedAmount:Number(received),reason:reason.trim()})}>Xác nhận đã nhận tiền</button>
          </div>}
        </>:canSell&&<>
          {preview.totalAmount===0?<button type="button" style={control} disabled={busy||!preview.promotion?.applicable&&Boolean(preview.promotion)} onClick={()=>void action('zero')}>Hoàn tất đơn 0đ</button>:<>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button type="button" style={control} disabled={locked} onClick={()=>setMode('cash')}>Tiền mặt</button>
              <button type="button" style={control} disabled={locked} onClick={()=>setMode('qr')}>Chuyển khoản</button>
            </div>
            {mode==='cash'?<div style={{display:'grid',gap:8,marginTop:12}}>
              <label>Tiền khách đưa <input aria-label="Tiền khách đưa" inputMode="numeric" style={control} value={tendered} disabled={locked} onChange={e=>setTendered(e.target.value)} /></label>
              {integer(tendered)&&Number(tendered)>=preview.totalAmount&&<p>Tiền thối: {formatVND(Number(tendered)-preview.totalAmount)}</p>}
              <button type="button" style={control} disabled={busy||(!uncertain&&(!integer(tendered)||Number(tendered)<preview.totalAmount||Boolean(preview.promotion&&!preview.promotion.applicable)))}
                onClick={()=>void action('cash',{method:'CASH',amount:preview.totalAmount,tenderedAmount:Number(tendered)})}>Xác nhận thanh toán</button>
            </div>:<button type="button" style={{...control,marginTop:12}} disabled={busy||Boolean(preview.promotion&&!preview.promotion.applicable)}
              onClick={()=>void action('qr',preview.totalAmount)}>Tạo mã QR</button>}
          </>}
        </>}
      </>}
      {canExceptions&&<div><h3>Giao dịch cần đối soát</h3>{exceptions.length===0?<p>Chưa có giao dịch cần xử lý.</p>:exceptions.map(item=><p key={item.id}>{({UNDERPAID:'Chuyển thiếu tiền',ATTEMPT_CANCELLED:'Chuyển sau khi hủy chờ',INVOICE_NOT_OPEN:'Đơn không còn mở',PROMOTION_INVALID:'Mã giảm giá không còn hiệu lực',DUPLICATE:'Mã giao dịch đã dùng',WRONG_ACCOUNT:'Sai tài khoản nhận'} as Record<string,string>)[item.reason] ?? 'Giao dịch cần kiểm tra'} · {formatVND(item.amount)} · Đơn {item.invoiceId}</p>)}
        {nextCursor&&<button type="button" style={control} disabled={busy} onClick={()=>void loadExceptions(nextCursor).catch(e=>setError(message(e)))}>Xem thêm</button>}</div>}
      <button type="button" style={{...control,marginTop:16}} disabled={busy||uncertain} onClick={onClose}>Đóng</button>
  </Dialog>;
}
