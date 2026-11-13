// POS-F&B Force Close Shift Modal (Đóng ca cưỡng chế bởi Quản lý) per BR-20, BR-88, BR-19

import React, { useState, useRef, useEffect } from 'react';
import { WorkShiftDto, shiftService } from '../../services/shiftService';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatDateTimeVN, formatVND } from '../../utils/formatters';
import { getRequestIdentity } from '../../auth/session-events';
import { useToast } from '../../context/ToastContext';
import { ShieldAlert } from 'lucide-react';

export interface ForceCloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: WorkShiftDto;
  onSuccess: () => void;
}

export const ForceCloseShiftModal: React.FC<ForceCloseShiftModalProps> = ({
  isOpen,
  onClose,
  shift,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [countedCashStr, setCountedCashStr] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const busy = useRef(false);
  const active = useRef(true);
  const epoch = getRequestIdentity().epoch;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [result, setResult] = useState<WorkShiftDto | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const finish = () => { onClose(); if ((result || uncertain) && epoch === getRequestIdentity().epoch) onSuccess(); };
  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (busy.current || uncertain || epoch !== getRequestIdentity().epoch) return;
    setErrorMsg('');
    if (!reason.trim()) {
      setErrorMsg('Bắt buộc phải nhập lý do khi đóng cưỡng chế ca làm việc.');
      return;
    }

    if (shift.shiftType === 'CASHIER' && !countedCashStr.trim()) {
      setErrorMsg('Đóng cưỡng chế ca thu ngân bắt buộc Quản lý phải đếm và nhập số tiền thực tế trong két (BR-88).');
      return;
    }

    const countedCash = Number(countedCashStr || 0);
    if ((shift.shiftType === 'CASHIER' && !/^\d+$/.test(countedCashStr)) || !Number.isSafeInteger(countedCash) || countedCash < 0 || countedCash > 1000000000000) {
      setErrorMsg('Số tiền trong két không được là số âm.');
      return;
    }

    busy.current = true; setIsSubmitting(true);
    try {
      const closed = await shiftService.forceCloseShift(shift.id, {
        countedCash,
        reason: reason.trim(),
        note: note.trim() || undefined,
      });
      if (!active.current || epoch !== getRequestIdentity().epoch) return;
      if (closed?.status !== 'CLOSED' || (shift.shiftType === 'CASHIER' && !closed.reconciliation)) { setUncertain(true); setErrorMsg('Chưa xác nhận được kết quả. Hãy tải lại ca.'); return; }
      setResult(closed);
      showToast({ type: 'success', message: 'Đã đóng ca cưỡng chế thành công' });
    } catch (err: any) {
      if (!active.current || epoch !== getRequestIdentity().epoch) return;
      if (['NETWORK_ERROR', 'UNKNOWN'].includes(err?.code) || err?.status >= 500) setUncertain(true);
      setErrorMsg(`${err?.message || 'Có lỗi xảy ra khi đóng ca cưỡng chế'}${err?.requestId ? ` (Mã yêu cầu: ${err.requestId})` : ''}`);
    } finally {
      busy.current = false; if (active.current && epoch === getRequestIdentity().epoch) setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={finish}
      title="Đóng cưỡng chế ca làm việc"
      maxWidth={480}
      disableClose={isSubmitting}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
          {result ? <Button variant="primary" onClick={finish}>Hoàn tất</Button> : <><Button variant="secondary" onClick={finish} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={uncertain}
            icon={<ShieldAlert size={16} />}
          >
            Xác nhận đóng cưỡng chế
          </Button></>}
        </div>
      }
    >
      {result ? <div>
        <p>Ca làm việc đã được đóng.</p>
        {result.shiftType === 'CASHIER' && result.reconciliation && <dl style={{ margin: 0, padding: 16, borderRadius: 'var(--radius-control)', background: 'var(--color-surface-sunken)' }}>
          {[
            ['Tiền đầu ca', result.reconciliation.openingCash],
            ['Doanh thu tiền mặt', result.reconciliation.cashSalesAmount],
            ['Chi phí từ két', result.reconciliation.expenseAmount],
            ['Tiền kỳ vọng', result.reconciliation.expectedCash],
            ['Tiền đã đếm', result.reconciliation.countedCash],
          ].map(([label, amount]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
            <dt>{label}</dt>
            <dd style={{ margin: 0, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{amount == null ? '—' : formatVND(amount as number)}</dd>
          </div>)}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <dt style={{ fontWeight: 600 }}>Chênh lệch</dt>
            <dd style={{ margin: 0, textAlign: 'right', fontWeight: 700, fontSize: 40, lineHeight: '48px', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{result.reconciliation.difference == null ? '—' : formatVND(result.reconciliation.difference)}</dd>
            <div style={{ textAlign: 'right' }}><Badge variant={result.reconciliation.status === 'MATCHED' ? 'success' : result.reconciliation.status === 'SHORTAGE' ? 'danger' : 'warning'}>{result.reconciliation.status === 'MATCHED' ? 'Khớp' : result.reconciliation.status === 'SHORTAGE' ? 'Thiếu' : 'Thừa'}</Badge></div>
          </div>
        </dl>}
      </div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            padding: 12,
            borderRadius: 'var(--radius-control)',
            background: 'var(--color-warning-100)',
            color: 'var(--color-warning-800)',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong>Cảnh báo (BR-20, BR-88):</strong> Thao tác này dành cho Quản lý khi thu ngân quên đóng ca hoặc có sự cố. Thao tác sẽ được lưu vết kèm tài khoản đóng và lý do.
        </div>

        {errorMsg && (
          <div
            style={{
              padding: 10,
              borderRadius: 'var(--radius-control)',
              background: 'var(--color-danger-100)',
              color: 'var(--color-danger-700)',
              fontSize: 13,
            }}
          >
            {errorMsg}
          </div>
        )}

        {uncertain && <Button variant="secondary" onClick={async () => {
          if (busy.current) return; busy.current = true; setIsSubmitting(true);
          try { const closed = await shiftService.getShiftDetail(shift.id);
            if (!active.current || epoch !== getRequestIdentity().epoch) return;
            if (closed.status === 'CLOSED' && (closed.shiftType === 'STAFF' || closed.reconciliation)) setResult(closed);
            else setErrorMsg('Ca vẫn mở. Hãy đóng và mở lại hộp thoại để thử lại.');
          } catch (err: any) { if (active.current && epoch === getRequestIdentity().epoch) setErrorMsg(err?.message || 'Không thể tải lại ca.'); }
          finally { busy.current = false; if (active.current && epoch === getRequestIdentity().epoch) setIsSubmitting(false); }
        }}>Tải lại ca</Button>}
        <div style={{ fontSize: 14 }}>
          <div><strong>Nhân viên:</strong> {shift.userName || shift.userId}</div>
          <div><strong>Loại ca:</strong> {shift.shiftType === 'CASHIER' ? 'Thu ngân' : 'Nhân viên'}</div>
          <div><strong>Bắt đầu:</strong> {formatDateTimeVN(shift.startedAt)}</div>
        </div>

        {shift.shiftType === 'CASHIER' && (
          <div>
            <label htmlFor="force-close-counted" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Số tiền đếm thực tế trong két (VND) <span style={{ color: 'var(--color-danger-600)' }}>*</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder="Quản lý kiểm đếm và nhập số tiền..."
              id="force-close-counted"
              value={countedCashStr}
              onChange={(e) => setCountedCashStr(e.target.value)}
              style={{
                width: '100%',
                minHeight: 48,
                padding: '10px 12px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-border-control)',
                fontSize: 16,
                fontWeight: 700,
              }}
            />
          </div>
        )}

        <div>
          <label htmlFor="force-close-reason" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Lý do đóng cưỡng chế <span style={{ color: 'var(--color-danger-600)' }}>*</span>
          </label>
          <textarea
            rows={2}
            id="force-close-reason"
            placeholder="Ví dụ: Thu ngân về quên đóng ca..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-border-control)',
              fontSize: 14,
            }}
          />
        </div>

        <div>
          <label htmlFor="force-close-note" style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            Ghi chú thêm (Tùy chọn)
          </label>
          <input
            type="text"
            placeholder="Ghi chú chi tiết nếu có..."
            id="force-close-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{
              width: '100%',
              minHeight: 48,
              padding: '8px 12px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-border-control)',
              fontSize: 14,
            }}
          />
        </div>
      </div>}
    </Dialog>
  );
};
