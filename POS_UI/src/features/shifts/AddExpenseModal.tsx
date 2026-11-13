// POS-F&B Add Shift Expense Modal per BR-51, BR-52, BR-53

import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { shiftService } from '../../services/shiftService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getRequestIdentity } from '../../auth/session-events';

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
  const { session } = useAuth();
  const busy = useRef(false);
  const active = useRef(true);
  const [uncertain, setUncertain] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');
  const [paidFromDrawer, setPaidFromDrawer] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [reasonError, setReasonError] = useState('');
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current || uncertain) return;
    setError('');
    setAmountError(''); setReasonError('');

    const amount = Number(amountStr);
    if (!/^\d+$/.test(amountStr) || !Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000_000_000) {
      setAmountError('Số tiền chi phải là số nguyên từ 1 đến 1.000.000.000.000');
      return;
    }

    if (!reason.trim() || reason.trim().length > 255) {
      setReasonError('Lý do chi phải từ 1 đến 255 ký tự');
      return;
    }

    busy.current = true;
    setLoading(true);
    const epoch = getRequestIdentity().epoch;
    let posted = false;
    try {
      const current = await shiftService.getCurrentShift();
      if (!active.current || epoch !== getRequestIdentity().epoch) return;
      if (!session.permissions.includes('shift.expense') || !current || current.id !== shiftId ||
          current.userId !== session.user.id || current.shiftType !== 'CASHIER' || current.status !== 'OPEN') {
        throw new Error('Ca không còn đủ điều kiện ghi chi. Hãy tải lại ca.');
      }
      posted = true;
      await shiftService.addExpense(shiftId, amount, reason.trim(), paidFromDrawer);
      if (!active.current || epoch !== getRequestIdentity().epoch) return;
      showToast({ type: 'success', message: 'Đã ghi nhận khoản chi trong ca!' });
      onSuccess();
      onClose();
    } catch (err: any) {
      if (!active.current || epoch !== getRequestIdentity().epoch) return;
      if (posted && (['NETWORK_ERROR', 'UNKNOWN'].includes(err?.code) || err?.status >= 500)) setUncertain(true);
      setError(`${err?.message || 'Không thể ghi chi phí'}${err?.requestId ? ` (Mã yêu cầu: ${err.requestId})` : ''}`);
      if (err?.code === 'SHIFT_CLOSED') {
        setUncertain(true);
        try {
          await Promise.all([shiftService.getCurrentShift(), shiftService.getExpenses(shiftId)]);
        } catch {
          // Keep the reload action available if the refresh fails.
        }
      }
    } finally {
      busy.current = false;
      if (active.current && epoch === getRequestIdentity().epoch) setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => { if (uncertain) onSuccess(); onClose(); }}
      title="Ghi nhận chi phí trong ca"
      maxWidth={460}
      disableClose={loading}
      footer={
        <div className="form-actions" style={{ position: 'static', width: '100%', padding: 0, border: 0, background: 'transparent' }}>
          <Button variant="secondary" onClick={() => { if (uncertain) onSuccess(); onClose(); }} disabled={loading}>
            Hủy
          </Button>
          <Button variant="primary" size="lg" onClick={handleSubmit} isLoading={loading} disabled={uncertain}>
            Lưu khoản chi
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="stack">
        <Field
          id="expense-amount"
          label="Số tiền chi"
          type="text"
          inputMode="numeric"
          placeholder="50000"
          value={amountStr}
          error={amountError}
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
            aria-invalid={Boolean(reasonError)}
            aria-describedby={reasonError ? 'expense-reason-error' : undefined}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          {reasonError && <span id="expense-reason-error" role="alert" className="field-error">{reasonError}</span>}
        </div>

        <label className="check-row">
          <input type="checkbox" checked={paidFromDrawer} onChange={(e) => setPaidFromDrawer(e.target.checked)} />
          <span>
            <strong style={{ display: 'block', fontSize: 14 }}>Lấy tiền trực tiếp từ két tiền mặt</strong>
            <span className="stat-note">Khoản này sẽ được trừ vào số tiền kỳ vọng khi đối soát ca</span>
          </span>
        </label>

        {uncertain && <Button variant="secondary" disabled={loading} onClick={async () => {
          if (busy.current) return;
          busy.current = true; setLoading(true);
          const epoch = getRequestIdentity().epoch;
          try {
            await Promise.all([shiftService.getCurrentShift(), shiftService.getExpenses(shiftId)]);
            if (epoch === getRequestIdentity().epoch) { setUncertain(false); setError(''); onSuccess(); }
          } catch (err: any) { if (epoch === getRequestIdentity().epoch) setError(err?.message || 'Không thể tải lại ca.'); }
          finally { busy.current = false; if (epoch === getRequestIdentity().epoch) setLoading(false); }
        }}>Tải lại ca và danh sách</Button>}
        {error && <div role="alert" className="notice notice-danger">{error}</div>}
      </form>
    </Dialog>
  );
};
