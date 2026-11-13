// POS-F&B Blind Cash Reconciliation Close Shift Modal per DESIGN.md §5.5 & BR-58, BR-60, BR-19

import React, { useState, useRef, useEffect } from 'react';
import { WorkShiftDto } from '../../services/shiftService';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatVND } from '../../utils/formatters';
import { shiftService } from '../../services/shiftService';
import { getRequestIdentity } from '../../auth/session-events';
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
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [directCountInput, setDirectCountInput] = useState<string>('');
  const [useDenominations, setUseDenominations] = useState<boolean>(true);
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const busy = useRef(false);
  const active = useRef(true);
  const epoch = getRequestIdentity().epoch;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [uncertain, setUncertain] = useState(false);
  const [closeResult, setCloseResult] = useState<WorkShiftDto | null>(null);

  const finish = () => {
    onClose();
    if ((closeResult || uncertain) && epoch === getRequestIdentity().epoch) onSuccess();
  };

  if (!isOpen) return null;

  // Tính tổng tiền đếm theo từng mệnh giá
  const denominationTotal = Object.entries(counts).reduce((sum, [denomStr, qty]) => {
    return sum + BigInt(denomStr) * (/^\d+$/.test(qty) ? BigInt(qty) : 0n);
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
    const current = Number(counts[key]) || 0;
    const next = Math.max(0, current + delta);
    setCounts((prev) => ({ ...prev, [key]: String(next) }));
  };

  // Xác nhận số tiền đếm để gửi lên server đối soát
  const handleSubmitCloseShift = async () => {
    if (busy.current || uncertain || epoch !== getRequestIdentity().epoch) return;
    if ((useDenominations && Object.values(counts).some(value => !/^\d+$/.test(value))) || (!useDenominations && !/^\d+$/.test(directCountInput)) || totalCounted > 1000000000000n) { setErrorMsg('Số tiền đếm không hợp lệ.'); return; }
    busy.current = true;
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const result = await shiftService.closeShiftBlind(shift.id, totalCounted, note.trim() || undefined);
      if (!active.current || epoch !== getRequestIdentity().epoch) return;
      if (result?.status !== 'CLOSED' || !result.reconciliation) { setUncertain(true); setErrorMsg('Chưa xác nhận được kết quả. Hãy tải lại ca.'); return; }
      setCloseResult(result);
      setStep(2);
      showToast({ type: 'success', message: 'Đóng ca thu ngân và đối soát thành công!' });
    } catch (err: any) {
      if (!active.current || epoch !== getRequestIdentity().epoch) return;
      if (['NETWORK_ERROR', 'UNKNOWN'].includes(err?.code) || err?.status >= 500) setUncertain(true);
      if (err?.code === 'RECONCILIATION_NOTE_REQUIRED') {
        setErrorMsg('Ca có chênh lệch tiền mặt so với kỳ vọng. Bắt buộc phải nhập ghi chú giải trình.');
      } else {
        setErrorMsg(`${err?.message || 'Có lỗi khi đóng ca làm việc'}${err?.requestId ? ` (Mã yêu cầu: ${err.requestId})` : ''}`);
      }
    } finally {
      busy.current = false;
      if (active.current && epoch === getRequestIdentity().epoch) setIsSubmitting(false);
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
              <Button variant="secondary" onClick={finish} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmitCloseShift}
                isLoading={isSubmitting}
                disabled={uncertain}
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

          {uncertain && <Button variant="secondary" disabled={isSubmitting} onClick={async () => {
            if (busy.current) return; busy.current = true; setIsSubmitting(true);
            try { const result = await shiftService.getShiftDetail(shift.id);
              if (!active.current || epoch !== getRequestIdentity().epoch) return;
              if (result.status === 'CLOSED' && result.reconciliation) { setCloseResult(result); setStep(2); }
              else setErrorMsg('Ca vẫn mở. Hãy đóng và mở lại hộp thoại để thử lại.');
            } catch (err: any) { if (active.current && epoch === getRequestIdentity().epoch) setErrorMsg(err?.message || 'Không thể tải lại ca.'); }
            finally { busy.current = false; if (active.current && epoch === getRequestIdentity().epoch) setIsSubmitting(false); }
          }}>Tải lại ca</Button>}
          {/* Chọn phương thức nhập: Từng mệnh giá hoặc Nhập thẳng */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant={useDenominations ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setUseDenominations(true)}
            >
              Đếm theo tờ tiền
            </Button>
            <Button
              variant={!useDenominations ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setUseDenominations(false)}
            >
              Nhập nhanh tổng tiền
            </Button>
          </div>

          {useDenominations ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
              {DENOMINATIONS.map((denom) => {
                const key = denom.toString();
                const qty = counts[key] ?? '0';
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
                    <span className="money" style={{ fontWeight: 600, width: 110 }}>{formatVND(denom)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" className="btn btn-secondary btn-step" style={{ width: 48, minHeight: 48, flexShrink: 0 }} aria-label={`Giảm ${formatVND(denom)}`} onClick={() => handleDenomChange(denom, -1)}>−</button>
                      <input
                        type="number"
                        min="0"
                        className="input input-qty"
                        style={{ minHeight: 48 }}
                        aria-label={`Số tờ ${formatVND(denom)}`}
                        value={qty}
                        onChange={(e) => {
                          setCounts((prev) => ({ ...prev, [key]: e.target.value }));
                        }}
                      />
                      <button type="button" className="btn btn-secondary btn-step" style={{ width: 48, minHeight: 48, flexShrink: 0 }} aria-label={`Tăng ${formatVND(denom)}`} onClick={() => handleDenomChange(denom, 1)}>+</button>
                    </div>
                    <span className="money" style={{ minWidth: 100, textAlign: 'right', fontWeight: 600 }}>
                      {formatVND(denom * (/^\d+$/.test(qty) ? BigInt(qty) : 0n))}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <label htmlFor="blind-close-counted" style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                Tổng tiền mặt thực tế trong két (VND)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="Ví dụ: 1000000"
                id="blind-close-counted"
                value={directCountInput}
                onChange={(e) => setDirectCountInput(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 48,
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
            <label htmlFor="blind-close-note" style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              Ghi chú đóng ca (Bắt buộc nếu tiền thực tế bị lệch)
            </label>
            <input
              type="text"
              placeholder="Nhập ghi chú nếu có chênh lệch tiền mặt..."
              id="blind-close-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                minHeight: 48,
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

            <dl
              style={{
                background: 'var(--color-surface-sunken)',
                borderRadius: 'var(--radius-control)',
                padding: 16,
                margin: 0,
              }}
            >
              {([
                ['Tiền đầu ca', closeResult.reconciliation.openingCash],
                ['Doanh thu tiền mặt', closeResult.reconciliation.cashSalesAmount],
                ['Chi phí từ két', closeResult.reconciliation.expenseAmount],
                ['Tiền kỳ vọng', closeResult.reconciliation.expectedCash],
                ['Tiền đã đếm', closeResult.reconciliation.countedCash],
              ] as const).map(([label, amount]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                <dt>{label}</dt>
                <dd style={{ margin: 0, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{amount == null ? '—' : formatVND(amount)}</dd>
              </div>)}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <dt style={{ fontWeight: 600 }}>Chênh lệch</dt>
                <dd style={{ margin: 0, textAlign: 'right', fontWeight: 700, fontSize: 40, lineHeight: '48px', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{closeResult.reconciliation.difference == null ? '—' : formatVND(closeResult.reconciliation.difference)}</dd>
                <div style={{ textAlign: 'right' }}>
                  <Badge variant={closeResult.reconciliation.status === 'MATCHED' ? 'success' : closeResult.reconciliation.status === 'SHORTAGE' ? 'danger' : 'warning'}>
                    {closeResult.reconciliation.status === 'MATCHED' ? 'Khớp' : closeResult.reconciliation.status === 'SHORTAGE' ? 'Thiếu' : 'Thừa'}
                  </Badge>
                </div>
              </div>
            </dl>
          </div>
        )
      )}
    </Dialog>
  );
};
