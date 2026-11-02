// POS-F&B Shifts Management Screen per DESIGN.md §5.5, BR-15, BR-18, BR-19, BR-20, BR-58..60, BR-88

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { WorkShiftDto, shiftService } from '../../services/shiftService';
import { formatVND, formatDateTimeVN, formatDuration } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';
import { BlindCountCloseShiftModal } from './BlindCountCloseShiftModal';
import { ForceCloseShiftModal } from './ForceCloseShiftModal';
import { Clock, LogOut, UserCheck, ShieldAlert, LogIn, RefreshCw } from 'lucide-react';

export interface ShiftsScreenProps {
  onNavigateToInvoice?: (invoiceId: string) => void;
}

export const ShiftsScreen: React.FC<ShiftsScreenProps> = () => {
  const { session } = useAuth();
  const { showToast } = useToast();

  const [shiftsHistory, setShiftsHistory] = useState<WorkShiftDto[]>([]);
  const [currentShift, setCurrentShift] = useState<WorkShiftDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [forceCloseTargetShift, setForceCloseTargetShift] = useState<WorkShiftDto | null>(null);
  const [isStaffChecking, setIsStaffChecking] = useState(false);

  const canForceClose = session.permissions.includes('shift.force_close');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [curr, history] = await Promise.all([
        shiftService.getCurrentShift(),
        shiftService.getShifts({ limit: 50 }),
      ]);
      setCurrentShift(curr);
      setShiftsHistory(history.data);
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể tải dữ liệu ca làm việc' });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasOpenShift = !!currentShift && currentShift.status === 'OPEN';
  const isCashierShift = hasOpenShift && currentShift.shiftType === 'CASHIER';
  const isStaffShift = hasOpenShift && currentShift.shiftType === 'STAFF';

  // Check-in ca nhân viên
  const handleCheckInStaff = async () => {
    setIsStaffChecking(true);
    try {
      await shiftService.checkInStaffShift();
      showToast({ type: 'success', message: 'Đã check-in bắt đầu ca làm việc nhân viên' });
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể check-in' });
    } finally {
      setIsStaffChecking(false);
    }
  };

  // Check-out ca nhân viên
  const handleCheckOutStaff = async () => {
    if (!currentShift) return;
    setIsStaffChecking(true);
    try {
      await shiftService.checkOutStaffShift(currentShift.id);
      showToast({ type: 'success', message: 'Đã check-out kết thúc ca làm việc nhân viên' });
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể check-out' });
    } finally {
      setIsStaffChecking(false);
    }
  };

  const columns: Column<WorkShiftDto>[] = [
    {
      key: 'time',
      header: 'Thời gian & Loại ca',
      render: (shift) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600 }}>{formatDateTimeVN(shift.startedAt)}</span>
            <Badge variant={shift.shiftType === 'CASHIER' ? 'info' : 'neutral'} size="sm">
              {shift.shiftType === 'CASHIER' ? 'Thu ngân' : 'Nhân viên'}
            </Badge>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {shift.endedAt ? `Đóng lúc ${formatDateTimeVN(shift.endedAt)}` : 'Đang mở'} &bull;{' '}
            {formatDuration(shift.startedAt, shift.endedAt ?? undefined)}
          </div>
          {shift.userName && (
            <div style={{ fontSize: 12, color: 'var(--color-brand-700)', marginTop: 2 }}>
              Người làm: {shift.userName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (shift) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Badge variant={shift.status === 'OPEN' ? 'info' : 'neutral'} size="sm">
            {shift.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
          </Badge>
          {shift.closedBy && shift.closedBy !== shift.userId && (
            <Badge variant="warning" size="sm">
              Đóng cưỡng chế{shift.closedByName ? ` bởi ${shift.closedByName}` : ''}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'opening',
      header: 'Tiền đầu ca',
      align: 'right',
      render: (shift) => (
        <span className="money">
          {shift.shiftType === 'CASHIER' && shift.reconciliation
            ? formatVND(shift.reconciliation.openingCash)
            : '-'}
        </span>
      ),
    },
    {
      key: 'expected',
      header: 'Tiền kỳ vọng',
      align: 'right',
      render: (shift) => (
        <span className="money">
          {shift.shiftType === 'CASHIER' && shift.reconciliation?.expectedCash != null
            ? formatVND(shift.reconciliation.expectedCash)
            : '-'}
        </span>
      ),
    },
    {
      key: 'counted',
      header: 'Tiền thực đếm',
      align: 'right',
      render: (shift) => (
        <span className="money" style={{ fontWeight: 700 }}>
          {shift.shiftType === 'CASHIER' && shift.reconciliation?.countedCash != null
            ? formatVND(shift.reconciliation.countedCash)
            : '-'}
        </span>
      ),
    },
    {
      key: 'diff',
      header: 'Chênh lệch',
      align: 'center',
      render: (shift) => {
        if (shift.shiftType !== 'CASHIER' || !shift.reconciliation || shift.reconciliation.difference == null) {
          return <span>-</span>;
        }
        const status = shift.reconciliation.status;
        return (
          <Badge
            variant={status === 'MATCHED' ? 'success' : status === 'SHORTAGE' ? 'danger' : 'warning'}
            size="sm"
          >
            {formatVND(shift.reconciliation.difference)}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (shift) => {
        if (shift.status === 'OPEN' && canForceClose && shift.id !== currentShift?.id) {
          return (
            <Button
              variant="danger"
              size="sm"
              icon={<ShieldAlert size={14} />}
              onClick={() => setForceCloseTargetShift(shift)}
            >
              Đóng cưỡng chế
            </Button>
          );
        }
        return <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>-</span>;
      },
    },
  ];

  return (
    <div style={{ flex: 1, padding: 'clamp(14px, 2.5vw, 24px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tiêu đề & Thông tin ca hiện tại */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>
            Quản lý Ca làm việc & Đối soát tiền mặt
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Theo dõi ca thu ngân, điểm danh nhân viên và đối soát đếm mù
          </p>
        </div>

        {/* Nút thao tác nhanh trên Header */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="md"
            icon={<RefreshCw size={16} />}
            onClick={loadData}
            isLoading={isLoading}
          >
            Làm mới
          </Button>

          {!hasOpenShift && (
            <Button
              variant="secondary"
              size="md"
              icon={<LogIn size={18} />}
              onClick={handleCheckInStaff}
              isLoading={isStaffChecking}
            >
              Check-in ca nhân viên
            </Button>
          )}

          {isCashierShift && (
            <Button
              variant="primary"
              size="md"
              icon={<LogOut size={18} />}
              onClick={() => setIsCloseModalOpen(true)}
            >
              Đóng ca (Đếm mù)
            </Button>
          )}

          {isStaffShift && (
            <Button
              variant="primary"
              size="md"
              icon={<LogOut size={18} />}
              onClick={handleCheckOutStaff}
              isLoading={isStaffChecking}
            >
              Check-out kết thúc ca
            </Button>
          )}
        </div>
      </div>

      {/* Thẻ ca thu ngân hiện tại nếu đang mở */}
      {isCashierShift && currentShift && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '2px solid var(--color-brand-600)',
            borderRadius: 'var(--radius-tile)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={20} color="var(--color-brand-600)" />
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
                Ca thu ngân (Gắn két tiền) đang mở
              </span>
              <Badge variant="success" size="sm">
                Bắt đầu lúc {formatDateTimeVN(currentShift.startedAt)}
              </Badge>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-brand-800)' }}>
              Đã làm: {formatDuration(currentShift.startedAt)}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              paddingTop: 8,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Tiền đầu ca (Chỉ đọc)</div>
              <div className="money" style={{ fontSize: 18, fontWeight: 700 }}>
                {formatVND(currentShift.reconciliation?.openingCash ?? 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Thu ngân</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{session.user.full_name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Chi nhánh</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{currentShift.branchName || session.branch_name}</div>
            </div>
          </div>
        </div>
      )}

      {/* Thẻ ca làm việc nhân viên nếu đang mở */}
      {isStaffShift && currentShift && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '2px solid var(--color-info)',
            borderRadius: 'var(--radius-tile)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserCheck size={20} color="var(--color-info)" />
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
                Ca làm việc nhân viên (Pha chế / Phục vụ) đang mở
              </span>
              <Badge variant="info" size="sm">
                Bắt đầu lúc {formatDateTimeVN(currentShift.startedAt)}
              </Badge>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-info)' }}>
              Đã làm: {formatDuration(currentShift.startedAt)}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              paddingTop: 8,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Nhân viên điểm danh</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{session.user.full_name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Chi nhánh</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{currentShift.branchName || session.branch_name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Két tiền</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Không gắn két (Ca phục vụ)</div>
            </div>
          </div>
        </div>
      )}

      {/* Lịch sử các ca làm việc */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: 'var(--color-text)' }}>
          Lịch sử các ca làm việc
        </h2>
        <DataTable
          columns={columns}
          data={shiftsHistory}
          keyExtractor={(item) => item.id}
          emptyMessage={isLoading ? 'Đang tải dữ liệu...' : 'Chưa có dữ liệu ca làm việc nào'}
        />
      </div>

      {/* Modal Đóng ca đếm mù */}
      {isCashierShift && currentShift && (
        <BlindCountCloseShiftModal
          isOpen={isCloseModalOpen}
          onClose={() => setIsCloseModalOpen(false)}
          shift={currentShift}
          onSuccess={loadData}
        />
      )}

      {/* Modal Đóng ca cưỡng chế (Quản lý) */}
      {forceCloseTargetShift && (
        <ForceCloseShiftModal
          isOpen={!!forceCloseTargetShift}
          onClose={() => setForceCloseTargetShift(null)}
          shift={forceCloseTargetShift}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
