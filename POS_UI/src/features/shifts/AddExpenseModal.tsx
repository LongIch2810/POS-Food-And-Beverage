// POS-F&B Add Shift Expense Modal per BR-51, BR-52, BR-53

import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { shiftService } from '../../services/shiftService';
import { useToast } from '../../context/ToastContext';

export interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  onSuccess: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  shiftId,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');
  const [paidFromDrawer, setPaidFromDrawer] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = amountStr ? BigInt(amountStr) : 0n;
    if (amount <= 0n) {
      setError('Số tiền chi phải lớn hơn 0');
      return;
    }

    if (!reason.trim()) {
      setError('Bắt buộc phải nhập lý do chi');
      return;
    }

    setLoading(true);
    try {
      await shiftService.addExpense(shiftId, amount, reason, paidFromDrawer);
      showToast({ type: 'success', message: 'Đã ghi nhận khoản chi trong ca!' });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể ghi chi phí');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Ghi nhận chi phí trong ca"
      maxWidth={460}
      disableClose={loading}
      footer={
        <div className="form-actions" style={{ position: 'static', width: '100%', padding: 0, border: 0, background: 'transparent' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button variant="primary" size="lg" onClick={handleSubmit} isLoading={loading}>
            Lưu khoản chi
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="stack">
        <Field
          id="expense-amount"
          label="Số tiền chi"
          type="number"
          placeholder="50000"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          isNumericMoney
          suffix="đ"
          autoFocus
          required
        />

        <div className="field">
          <label htmlFor="expense-reason" className="field-label">Lý do chi (bắt buộc)</label>
          <input
            id="expense-reason"
            type="text"
            className="input"
            placeholder="VD: Mua thêm đá viên, mua giấy in bill..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <label className="check-row">
          <input type="checkbox" checked={paidFromDrawer} onChange={(e) => setPaidFromDrawer(e.target.checked)} />
          <span>
            <strong style={{ display: 'block', fontSize: 14 }}>Lấy tiền trực tiếp từ két tiền mặt</strong>
            <span className="stat-note">Khoản này sẽ được trừ vào số tiền kỳ vọng khi đối soát ca</span>
          </span>
        </label>

        {error && <div role="alert" className="notice notice-danger">{error}</div>}
      </form>
    </Dialog>
  );
};
