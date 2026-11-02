// POS-F&B Force Close Shift Modal (Đóng ca cưỡng chế bởi Quản lý) per BR-20, BR-88, BR-19

import React, { useState } from 'react';
import { WorkShiftDto, shiftService } from '../../services/shiftService';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { formatDateTimeVN } from '../../utils/formatters';
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

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!reason.trim()) {
      setErrorMsg('Bắt buộc phải nhập lý do khi đóng cưỡng chế ca làm việc.');
      return;
    }

    if (shift.shiftType === 'CASHIER' && !countedCashStr.trim()) {
      setErrorMsg('Đóng cưỡng chế ca thu ngân bắt buộc Quản lý phải đếm và nhập số tiền thực tế trong két (BR-88).');
      return;
    }

    const countedCash = parseInt(countedCashStr, 10) || 0;
    if (countedCash < 0) {
      setErrorMsg('Số tiền trong két không được là số âm.');
      return;
    }

    setIsSubmitting(true);
    try {
      await shiftService.forceCloseShift(shift.id, {
        countedCash,
        reason: reason.trim(),
        note: note.trim() || undefined,
      });
      showToast({ type: 'success', message: 'Đã đóng ca cưỡng chế thành công' });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi đóng ca cưỡng chế');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Đóng cưỡng chế ca làm việc"
      maxWidth={480}
      disableClose={isSubmitting}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            icon={<ShieldAlert size={16} />}
          >
            Xác nhận đóng cưỡng chế
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

        <div style={{ fontSize: 14 }}>
          <div><strong>Nhân viên:</strong> {shift.userName || shift.userId}</div>
          <div><strong>Loại ca:</strong> {shift.shiftType === 'CASHIER' ? 'Thu ngân' : 'Nhân viên'}</div>
          <div><strong>Bắt đầu:</strong> {formatDateTimeVN(shift.startedAt)}</div>
        </div>

        {shift.shiftType === 'CASHIER' && (
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Số tiền đếm thực tế trong két (VND) <span style={{ color: 'var(--color-danger-600)' }}>*</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder="Quản lý kiểm đếm và nhập số tiền..."
              value={countedCashStr}
              onChange={(e) => setCountedCashStr(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-border)',
                fontSize: 16,
                fontWeight: 700,
              }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Lý do đóng cưỡng chế <span style={{ color: 'var(--color-danger-600)' }}>*</span>
          </label>
          <textarea
            rows={2}
            placeholder="Ví dụ: Thu ngân về quên đóng ca..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-border)',
              fontSize: 14,
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            Ghi chú thêm (Tùy chọn)
          </label>
          <input
            type="text"
            placeholder="Ghi chú chi tiết nếu có..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-border)',
              fontSize: 14,
            }}
          />
        </div>
      </div>
    </Dialog>
  );
};
