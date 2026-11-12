// POS-F&B Cancel Invoice Modal per BR-28, BR-29, BR-47

import React, { useState } from 'react';
import { Invoice } from '../../types/entities';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { invoiceService } from './invoiceService';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle } from 'lucide-react';

export interface CancelInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSuccess: () => void;
}

export const CancelInvoiceModal: React.FC<CancelInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const isPaid = invoice.status === 'PAID';

  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do hủy đơn');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await invoiceService.cancelInvoice(invoice.id, reason);
      showToast({
        type: 'success',
        message: isPaid
          ? `Đã hủy hóa đơn ${invoice.invoice_code} thành công và hoàn trả nguyên liệu vào kho!`
          : `Đã hủy đơn ${invoice.invoice_code}.`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể hủy hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isPaid ? `Hủy hóa đơn đã thanh toán: ${invoice.invoice_code}` : `Hủy đơn: ${invoice.invoice_code}`}
      maxWidth={480}
      disableClose={loading}
      footer={
        <div className="form-actions" style={{ position: 'static', width: '100%', padding: 0, border: 0, background: 'transparent' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Không hủy
          </Button>
          <Button variant="danger" size="lg" onClick={handleCancel} isLoading={loading}>
            Xác nhận hủy đơn
          </Button>
        </div>
      }
    >
      <form onSubmit={handleCancel} className="stack">
        <div className="notice notice-danger">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            {isPaid ? (
              <span>
                <strong>Lưu ý:</strong> Hủy hóa đơn đã thanh toán yêu cầu quyền Quản lý. Toàn bộ nguyên vật liệu
                đã xuất theo công thức sẽ được tự động hoàn lại vào kho chi nhánh.
              </span>
            ) : (
              <span>Đơn hàng đang mở sẽ được chuyển sang trạng thái đã hủy.</span>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="cancel-invoice-reason" className="field-label">Lý do hủy đơn (bắt buộc)</label>
          <textarea
            id="cancel-invoice-reason"
            rows={3}
            className="input"
            aria-invalid={error ? 'true' : undefined}
            placeholder="Khách đổi ý, pha nhầm món, sự cố thanh toán..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
            required
          />
        </div>

        {error && <div role="alert" className="notice notice-danger">{error}</div>}
      </form>
    </Dialog>
  );
};
