import React, { useRef, useState } from 'react';
import type { InvoiceDetail } from '../../services/salesService';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { invoiceService } from './invoiceService';
import { useToast } from '../../context/ToastContext';
import { getRequestIdentity } from '../../auth/session-events';
import { useAuth } from '../../context/AuthContext';
import { shiftService } from '../../services/shiftService';
import { formatVND } from '../../utils/formatters';

export interface CancelInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceDetail;
  onSuccess: (invoice: InvoiceDetail) => void;
  onUpdate: (invoice: InvoiceDetail) => void;
  isCurrent: () => boolean;
}

export const CancelInvoiceModal: React.FC<CancelInvoiceModalProps> = ({ isOpen, onClose, invoice, onSuccess, onUpdate, isCurrent }) => {
  const { showToast } = useToast();
  const { session } = useAuth();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const identity = getRequestIdentity();
  const current = () => { const now = getRequestIdentity(); return isCurrent() && now.identity === identity.identity && now.epoch === identity.epoch; };
  const isPaid = invoice.status === 'PAID';
  const canConfirm = invoice.workShiftStatus === 'OPEN' && (isPaid ? session.permissions.includes('invoice.cancel_paid') : invoice.status === 'OPEN' && session.permissions.includes('invoice.cancel_open') && session.permissions.includes('shift.read'));
  if (!isOpen) return null;

  const reload = async () => {
    if (busy.current) return;
    busy.current = true; setLoading(true);
    try {
      const latest = await invoiceService.getInvoiceById(invoice.id);
      if (current()) { onUpdate(latest); setUncertain(false); setError('Đã tải lại hóa đơn. Vui lòng kiểm tra trước khi thao tác tiếp.'); }
    } catch (err: any) {
      if (current()) setError(err?.message || 'Không tải được hóa đơn. Vui lòng thử lại.');
    } finally { busy.current = false; if (current()) setLoading(false); }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current || uncertain || !canConfirm) return;
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length > 255) {
      setError(!trimmed ? 'Vui lòng nhập lý do hủy đơn.' : 'Lý do hủy tối đa 255 ký tự.');
      reasonRef.current?.focus(); return;
    }
    busy.current = true; setLoading(true); setError('');
    let posted = false;
    try {
      const latest = await invoiceService.getInvoiceById(invoice.id);
      if (!current()) return;
      if (latest.status !== invoice.status || latest.paymentMethod !== invoice.paymentMethod || latest.totalAmount !== invoice.totalAmount || latest.workShiftStatus !== invoice.workShiftStatus || latest.status === 'CANCELLED' || latest.workShiftStatus !== 'OPEN') {
        onUpdate(latest); setError('Hóa đơn hoặc ca đã thay đổi. Vui lòng kiểm tra lại trước khi xác nhận.'); return;
      }
      if (latest.status === 'OPEN') {
        const shift = await shiftService.getCurrentShift();
        if (!current()) return;
        if (!shift || shift.id !== latest.workShiftId || shift.userId !== session.user.id || shift.status !== 'OPEN' || shift.shiftType !== 'CASHIER') {
          setError('Chỉ hủy được đơn mở thuộc ca thu ngân đang mở của bạn.'); return;
        }
      }
      posted = true;
      const result = await invoiceService.cancelInvoice(invoice.id, trimmed);
      if (!current()) return;
      if (result.status !== 'CANCELLED') { setUncertain(true); setError('Chưa xác nhận được kết quả. Vui lòng tải lại hóa đơn.'); return; }
      onSuccess(result);
      showToast({ type: 'success', message: `Đã hủy hóa đơn ${invoice.invoiceCode}.` });
      onClose();
    } catch (err: any) {
      if (!current()) return;
      const message = `${err?.message || 'Không thể hủy hóa đơn.'}${err?.requestId ? ` (Mã yêu cầu: ${err.requestId})` : ''}`;
      if (posted && (!err?.status || err.status >= 500)) { setUncertain(true); setError(`${message} Vui lòng tải lại hóa đơn trước khi thử lại.`); }
      else {
        setError(message);
        try { const latest = await invoiceService.getInvoiceById(invoice.id); if (current()) onUpdate(latest); }
        catch { if (current()) setUncertain(true); }
      }
    } finally { busy.current = false; if (current()) setLoading(false); }
  };

  return <Dialog isOpen={isOpen} onClose={onClose} title={`Hủy hóa đơn ${invoice.invoiceCode}`} maxWidth={480} disableClose={loading} footer={
    <div className="form-actions" style={{ position: 'static', width: '100%', margin: 0, padding: 0, border: 0, background: 'transparent' }}>
      <Button variant="secondary" onClick={onClose} disabled={loading}>Không hủy</Button>
      {uncertain ? <Button variant="secondary" onClick={reload} isLoading={loading}>Tải lại hóa đơn</Button> : <Button variant="danger" size="lg" onClick={handleCancel} isLoading={loading} disabled={!canConfirm}>Xác nhận hủy đơn</Button>}
    </div>
  }>
    <form onSubmit={handleCancel} className="stack">
      <p>{isPaid ? invoice.paymentMethod === 'CASH' ? `Hoàn lại ${formatVND(invoice.totalAmount)} cho khách từ két` : invoice.paymentMethod === 'TRANSFER' ? 'Hoàn tiền chuyển khoản ngoài hệ thống' : 'Không có khoản thanh toán' : 'Đơn hàng sẽ chuyển sang trạng thái đã hủy.'}</p>
      <div className="field">
        <label htmlFor="cancel-invoice-reason" className="field-label">Lý do hủy đơn (bắt buộc)</label>
        <textarea ref={reasonRef} id="cancel-invoice-reason" rows={3} className="input" aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'cancel-invoice-error' : undefined} value={reason} onChange={e => setReason(e.target.value)} autoFocus />
        {error && <div id="cancel-invoice-error" role="alert" className="notice notice-danger">{error}</div>}
      </div>
    </form>
  </Dialog>;
};
