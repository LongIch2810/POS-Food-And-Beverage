// POS-F&B Invoice Detail Drawer per DESIGN.md §5.6

import React from 'react';
import { Invoice } from '../../types/entities';
import { Drawer } from '../../components/ui/Drawer';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatVND, formatDateTimeVN } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { mockStorage } from '../../mock/mockStorage';
import { Ban } from 'lucide-react';

export interface InvoiceDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onOpenCancelModal: () => void;
}

export const InvoiceDetailDrawer: React.FC<InvoiceDetailDrawerProps> = ({
  isOpen,
  onClose,
  invoice,
  onOpenCancelModal,
}) => {
  const { session } = useAuth();

  if (!invoice) return null;

  const isPaid = invoice.status === 'PAID';
  const isOpenStatus = invoice.status === 'OPEN';
  const isCancelled = invoice.status === 'CANCELLED';

  // Kiểm tra quyền hủy đơn động (BR-05, BR-28, BR-29)
  const canCancelPaid = session.permissions.includes('invoice.cancel_paid');
  const canCancelOpen = session.permissions.includes('invoice.cancel_open');
  const state = mockStorage.getState();
  const shift = state.workShifts.find((s) => s.id === invoice.work_shift_id);
  const isShiftOpen = shift && shift.status === 'OPEN';

  let canCancel = false;
  let cancelDisabledReason = '';

  if (isOpenStatus) {
    if (canCancelOpen) {
      canCancel = true;
    } else {
      cancelDisabledReason = 'Bạn không có quyền hủy hóa đơn chưa thanh toán (invoice.cancel_open)';
    }
  } else if (isPaid) {
    if (!canCancelPaid) {
      cancelDisabledReason = 'Cần quyền hủy hóa đơn đã thanh toán (invoice.cancel_paid)';
    } else if (!isShiftOpen) {
      cancelDisabledReason = 'Ca của hóa đơn này đã đóng, không thể hủy đơn (BR-29)';
    } else {
      canCancel = true;
    }
  }

  const tableName = invoice.dining_table_id
    ? state.tables.find((t) => t.id === invoice.dining_table_id)?.name
    : 'Mang đi (Takeaway)';

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Chi tiết đơn ${invoice.invoice_code}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Trạng thái & Thông tin chung */}
        <div
          style={{
            padding: 16,
            background: 'var(--color-surface-sunken)',
            borderRadius: 'var(--radius-control)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
              {tableName}
            </span>
            <Badge
              variant={isPaid ? 'success' : isOpenStatus ? 'info' : 'danger'}
              size="md"
            >
              {isPaid ? 'Đã thanh toán' : isOpenStatus ? 'Đang mở' : 'Đã hủy'}
            </Badge>
          </div>

          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Mã hóa đơn: <strong style={{ color: 'var(--color-text)' }}>{invoice.invoice_code}</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Thời gian tạo: {formatDateTimeVN(invoice.created_at)}
          </div>
          {invoice.paid_at && (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Thanh toán lúc: {formatDateTimeVN(invoice.paid_at)}
            </div>
          )}
          {isCancelled && (
            <div style={{ padding: '8px 12px', background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-control)', fontSize: 13, color: 'var(--color-danger)' }}>
              <strong>Lý do hủy:</strong> {invoice.cancel_reason}
              <div style={{ fontSize: 11, marginTop: 2 }}>
                Hủy lúc: {invoice.cancelled_at ? formatDateTimeVN(invoice.cancelled_at) : ''}
              </div>
            </div>
          )}
        </div>

        {/* Danh sách món (Snapshot tên và giá lúc bán per BR-26) */}
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Món đã bán (giữ tên và giá lúc bán)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invoice.items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-control)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {item.product_name_snapshot}{' '}
                    <span style={{ fontSize: 13, color: 'var(--color-brand-600)' }}>
                      ({item.size_name_snapshot})
                    </span>{' '}
                    x {item.quantity}
                  </div>
                  {item.toppings.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Món thêm: {item.toppings.map((t) => t.topping_name_snapshot).join(', ')}
                    </div>
                  )}
                  <div className="money" style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Đơn giá: {formatVND(item.unit_price_snapshot)}
                  </div>
                </div>

                <div className="money" style={{ fontWeight: 700, fontSize: 15 }}>
                  {formatVND(item.line_total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chi tiết thanh toán & Tổng tiền */}
        <div
          style={{
            padding: 16,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-control)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span>Tạm tính</span>
            <span className="money">{formatVND(invoice.subtotal)}</span>
          </div>

          {invoice.discount_amount > 0n && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
              <span>Giảm giá ({invoice.applied_promotion?.code_snapshot})</span>
              <span className="money">&minus;{formatVND(invoice.discount_amount)}</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 8,
              borderTop: '1px solid var(--color-border)',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <span>Tổng thanh toán</span>
            <span className="money" style={{ color: 'var(--color-brand-600)', fontSize: 18 }}>
              {formatVND(invoice.total_amount)}
            </span>
          </div>

          {invoice.payments.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--color-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                Phương thức thanh toán
              </div>
              {invoice.payments.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>
                    {p.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                    {p.transaction_ref ? ` (${p.transaction_ref})` : ''}
                  </span>
                  <span className="money" style={{ fontWeight: 600 }}>
                    {formatVND(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nút hủy hóa đơn */}
        {!isCancelled && (
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <Button
              variant="danger"
              size="lg"
              fullWidth
              icon={<Ban size={18} />}
              disabled={!canCancel}
              disabledReason={cancelDisabledReason}
              onClick={onOpenCancelModal}
            >
              Hủy hóa đơn này
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
};
