// POS-F&B Blind Cash Reconciliation Close Shift Modal per DESIGN.md §5.5 & BR-58, BR-60, BR-19

import React, { useState } from 'react';
import { WorkShiftDto } from '../../services/shiftService';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatVND } from '../../utils/formatters';
import { shiftService } from '../../services/shiftService';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface BlindCountCloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: WorkShiftDto;
  onSuccess: () => void;
}

const DENOMINATIONS = [500000n, 200000n, 100000n, 50000n, 20000n, 10000n, 5000n, 2000n, 1000n];

export const BlindCountCloseShiftModal: React.FC<BlindCountCloseShiftModalProps> = ({
  isOpen,
  onClose,
  shift,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [directCountInput, setDirectCountInput] = useState<string>('');
  const [useDenominations, setUseDenominations] = useState<boolean>(true);
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [closeResult, setCloseResult] = useState<WorkShiftDto | null>(null);

  const finish = () => {
    onClose();
    if (closeResult) onSuccess();
  };

  if (!isOpen) return null;

  // Tính tổng tiền đếm theo từng mệnh giá
  const denominationTotal = Object.entries(counts).reduce((sum, [denomStr, qty]) => {
    return sum + BigInt(denomStr) * BigInt(qty);
  }, 0n);

  const totalCounted = useDenominations
    ? denominationTotal
    : directCountInput
    ? (() => {
        const sanitized = directCountInput.replace(/[,.\s]/g, '');
        return /^\d+$/.test(sanitized) ? BigInt(sanitized) : 0n;
      })()
    : 0n;

  const handleDenomChange = (denom: bigint, delta: number) => {
    const key = denom.toString();
    const current = counts[key] || 0;
    const next = Math.max(0, current + delta);
    setCounts((prev) => ({ ...prev, [key]: next }));
  };

  // Xác nhận số tiền đếm để gửi lên server đối soát
  const handleSubmitCloseShift = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const result = await shiftService.closeShiftBlind(shift.id, totalCounted, note.trim() || undefined);
      setCloseResult(result);
      setStep(2);
      showToast({ type: 'success', message: 'Đóng ca thu ngân và đối soát thành công!' });
    } catch (err: any) {
      if (err?.code === 'RECONCILIATION_NOTE_REQUIRED') {
        setErrorMsg('Ca có chênh lệch tiền mặt so với kỳ vọng. Bắt buộc phải nhập ghi chú giải trình.');
      } else {
        setErrorMsg(err?.message || 'Có lỗi khi đóng ca làm việc');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={finish}
      title={
        step === 1
          ? 'Đóng ca: Đếm tiền trong két (Đếm mù)'
          : 'Kết quả đối soát ca thu ngân'
      }
      maxWidth={540}
      disableClose={isSubmitting}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {step === 1 ? (
            <>
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmitCloseShift}
                isLoading={isSubmitting}
              >
                Xác nhận đóng ca &bull; {formatVND(totalCounted)}
              </Button>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button
                variant="primary"
                size="md"
                onClick={finish}
              >
                Hoàn tất & Đóng
              </Button>
            </div>
          )}
        </div>
      }
    >
      {step === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: 12,
              background: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-control)',
              fontSize: 13,
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
            }}
          >
            <strong>Quy tắc đếm mù (BR-58):</strong> Thu ngân kiểm đếm toàn bộ tiền mặt thực tế đang có trong két và nhập vào hệ thống. Hệ thống sẽ đối soát tự động với tiền đầu ca và doanh thu.
          </div>

          {errorMsg && (
            <div
              style={{
                padding: 12,
                borderRadius: 'var(--radius-control)',
                background: 'var(--color-danger-100)',
                color: 'var(--color-danger-700)',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Chọn phương thức nhập: Từng mệnh giá hoặc Nhập thẳng */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant={useDenominations ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setUseDenominations(true)}
            >
              Đếm theo tờ tiền
            </Button>
            <Button
              variant={!useDenominations ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setUseDenominations(false)}
            >
              Nhập nhanh tổng tiền
            </Button>
          </div>

          {useDenominations ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
              {DENOMINATIONS.map((denom) => {
                const key = denom.toString();
                const qty = counts[key] || 0;
                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-control)',
                    }}
                  >
                    <span style={{ fontWeight: 600, width: 100 }}>{formatVND(denom)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleDenomChange(denom, -1)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setCounts((prev) => ({ ...prev, [key]: val }));
                        }}
                        style={{
                          width: 60,
                          textAlign: 'center',
                          padding: '4px 6px',
                          borderRadius: 6,
                          border: '1px solid var(--color-border)',
                          fontWeight: 600,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDenomChange(denom, 1)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        +
                      </button>
                    </div>
                    <span style={{ minWidth: 90, textAlign: 'right', fontWeight: 600 }}>
                      {formatVND(denom * BigInt(qty))}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                Tổng tiền mặt thực tế trong két (VND)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="Ví dụ: 1000000"
                value={directCountInput}
                onChange={(e) => setDirectCountInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--color-border)',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              />
            </div>
          )}

          {/* Ghi chú khi đóng ca */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              Ghi chú đóng ca (Bắt buộc nếu tiền thực tế bị lệch)
            </label>
            <input
              type="text"
              placeholder="Nhập ghi chú nếu có chênh lệch tiền mặt..."
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
      ) : (
        /* Bước 2: Hiển thị kết quả đối soát */
        closeResult && closeResult.reconciliation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                borderRadius: 'var(--radius-control)',
                background:
                  closeResult.reconciliation.status === 'MATCHED'
                    ? 'var(--color-success-100)'
                    : 'var(--color-warning-100)',
                color:
                  closeResult.reconciliation.status === 'MATCHED'
                    ? 'var(--color-success-800)'
                    : 'var(--color-warning-800)',
              }}
            >
              <CheckCircle2 size={24} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {closeResult.reconciliation.status === 'MATCHED'
                    ? 'Đối soát tiền mặt khớp hoàn hảo!'
                    : closeResult.reconciliation.status === 'SHORTAGE'
                    ? 'Phát hiện thiếu tiền mặt trong két'
                    : 'Phát hiện thừa tiền mặt trong két'}
                </div>
                <div style={{ fontSize: 13 }}>
                  Ca làm việc đã được đóng thành công.
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-surface-sunken)',
                borderRadius: 'var(--radius-control)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Tiền đầu ca:</span>
                <span style={{ fontWeight: 600 }}>{formatVND(closeResult.reconciliation.openingCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Tiền hệ thống tính (Kỳ vọng):</span>
                <span style={{ fontWeight: 600 }}>{formatVND(closeResult.reconciliation.expectedCash ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Tiền thực tế đã đếm:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-brand-800)' }}>
                  {formatVND(closeResult.reconciliation.countedCash ?? 0)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontWeight: 600 }}>Chênh lệch:</span>
                <Badge
                  variant={
                    closeResult.reconciliation.status === 'MATCHED'
                      ? 'success'
                      : closeResult.reconciliation.status === 'SHORTAGE'
                      ? 'danger'
                      : 'warning'
                  }
                  size="md"
                >
                  {formatVND(closeResult.reconciliation.difference ?? 0)}
                </Badge>
              </div>
            </div>
          </div>
        )
      )}
    </Dialog>
  );
};
