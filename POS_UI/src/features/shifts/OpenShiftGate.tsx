// POS-F&B Open Shift Gatekeeper per DESIGN.md §5.5 & BR-16, BR-55

import React, { useState, useEffect } from 'react';
import { shiftService } from '../../services/shiftService';
import { formatVND } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { organizationService, OrganizationBranch } from '../../services/organizationService';
import { SelectField } from '../../components/ui/Field';
import { Lock } from 'lucide-react';

export interface OpenShiftGateProps {
  branchId: string;
  branchName: string;
  onShiftOpened: () => void;
}

export const OpenShiftGate: React.FC<OpenShiftGateProps> = ({
  branchId,
  branchName,
  onShiftOpened,
}) => {
  const { showToast } = useToast();
  const { session } = useAuth();
  const allBranches = session.permissions.includes('branch.access_all');
  const [branches, setBranches] = useState<OrganizationBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState(branchId);
  const [openingError, setOpeningError] = useState('');
  const [openingCash, setOpeningCash] = useState<number | null>(null);
  const [sourceText, setSourceText] = useState<string>('Đang tính tiền đầu ca...');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    if (!allBranches) { setSelectedBranchId(branchId); return; }
    let active = true;
    void organizationService.getBranchChoices().then(rows => { if (active) setBranches(rows.filter(row => row.isActive)); })
      .catch(err => { if (active) setOpeningError(err instanceof Error ? err.message : 'Không thể tải chi nhánh.'); });
    return () => { active = false; };
  }, [allBranches, branchId, session.user.id]);

  // Tải thông tin tiền đầu ca tự động từ API chuyên biệt (BR-55, BR-89)
  useEffect(() => {
    let cancelled = false;
    async function loadOpeningInfo() {
      try {
        setInitialLoading(true);
        const info = await shiftService.getOpeningCashInfo(selectedBranchId);
        if (cancelled) return;
        setOpeningError('');
        setOpeningCash(info.amount);
        setSourceText(info.sourceText);
      } catch (err) {
        if (!cancelled) {
          setOpeningCash(null);
          setOpeningError(err instanceof Error ? err.message : 'Không thể tải tiền đầu ca.');
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    if (selectedBranchId) {
      loadOpeningInfo();
    } else {
      setInitialLoading(false);
      setOpeningCash(null);
    }
    return () => {
      cancelled = true;
    };
  }, [selectedBranchId]);

  const handleOpenShift = async () => {
    setLoading(true);
    try {
      await shiftService.openShift({
        shiftType: 'CASHIER',
        branchId: selectedBranchId,
      });
      showToast({ type: 'success', message: 'Mở ca thu ngân thành công! Bắt đầu phiên bán hàng.' });
      onShiftOpened();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể mở ca thu ngân' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendReport = () => {
    if (!reportReason.trim()) return;
    showToast({
      type: 'info',
      message: 'Đã gửi biên bản báo lệch tiền giao ca đến Quản lý chi nhánh.',
    });
    setReportModalOpen(false);
    setReportReason('');
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-sheet)',
          boxShadow: 'var(--shadow-overlay)',
          border: '1px solid var(--color-border)',
          width: '100%',
          maxWidth: 460,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 'var(--radius-tile)',
            background: 'var(--color-brand-100)',
            color: 'var(--color-brand-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lock size={32} />
        </div>

        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>
            Mở ca thu ngân
          </h2>
          <div style={{ fontSize: 15, color: 'var(--color-text-muted)', marginTop: 4 }}>
            {branches.find(branch => branch.id === selectedBranchId)?.name || branchName}
          </div>
        </div>

        {allBranches && <SelectField label="Chi nhánh mở ca" value={selectedBranchId}
          onChange={event => setSelectedBranchId(event.target.value)}>
          <option value="">Chọn chi nhánh</option>
          {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </SelectField>}

        {/* Tiền đầu ca: CHỈ ĐỌC, KHÔNG PHẢI Ô NHẬP (BR-55) */}
        <div
          style={{
            width: '100%',
            background: 'var(--color-surface-sunken)',
            borderRadius: 'var(--radius-control)',
            padding: '16px 20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 4 }}>
            Tiền đầu ca trong két (Chỉ đọc)
          </div>
          <div
            className="money"
            style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-brand-800)' }}
          >
            {initialLoading ? '...' : openingCash == null ? '—' : formatVND(openingCash)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
            {sourceText}
          </div>
          {openingError && <p role="alert">{openingError}</p>}
        </div>

        {/* Nút Mở ca & Báo lệch tiền giao ca */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={loading || initialLoading}
            disabled={!selectedBranchId || openingCash == null || Boolean(openingError)}
            onClick={handleOpenShift}
          >
            Xác nhận mở ca thu ngân
          </Button>

          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-brand-600)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 44,
              padding: '10px 16px',
              borderRadius: 'var(--radius-control)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Báo lệch tiền giao ca cho Quản lý
          </button>
        </div>
      </div>

      {/* Dialog báo lệch tiền giao ca */}
      <Dialog
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Báo lệch tiền giao ca"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setReportModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSendReport} disabled={!reportReason.trim()}>
              Gửi biên bản
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            Nếu số tiền thực tế trong két khác với số tiền hệ thống tính (
            {formatVND(openingCash ?? 0)}), hãy nhập lý do để Quản lý nắm thông tin.
          </div>
          <textarea
            rows={3}
            placeholder="Mô tả lý do lệch (ví dụ: Thiếu 20.000đ tiền lẻ, két thực tế chỉ có 980.000đ)..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-border)',
              fontSize: 14,
            }}
          />
        </div>
      </Dialog>
    </div>
  );
};
