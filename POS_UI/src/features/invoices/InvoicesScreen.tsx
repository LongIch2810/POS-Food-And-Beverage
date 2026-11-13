import React, { useState, useEffect, useRef } from 'react';
import { invoiceService, type InvoiceFilters, type InvoiceListResponse } from './invoiceService';
import type { InvoiceDetail, InvoiceSummary } from '../../services/salesService';
import { formatVND, formatDateTimeVN } from '../../utils/formatters';
import { Badge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';
import { InvoiceDetailDrawer } from './InvoiceDetailDrawer';
import { CancelInvoiceModal } from './CancelInvoiceModal';
import { useAuth } from '../../context/AuthContext';
import { getRequestIdentity } from '../../auth/session-events';
import { shiftService, type WorkShiftDto } from '../../services/shiftService';
import { organizationService, type OrganizationBranch } from '../../services/organizationService';

export function invoiceDateRange(day: string): { from?: string; to?: string } {
  if (!day) return {};
  const start = new Date(`${day}T00:00:00+07:00`).getTime();
  return { from: new Date(start).toISOString(), to: new Date(start + 86400000).toISOString() };
}

export const InvoicesScreen: React.FC = () => {
  const { session } = useAuth();
  const identity = getRequestIdentity();
  const key = JSON.stringify([identity.identity, identity.epoch, session.user.id, session.user.store_id, session.user.branch_id, [...session.permissions].sort()]);
  return <InvoiceList key={key} identityKey={key} />;
};

const InvoiceList: React.FC<{ identityKey: string }> = ({ identityKey }) => {
  const { session } = useAuth();
  const allowed = session.permissions.includes('invoice.read');
  const accessAll = session.permissions.includes('branch.access_all');
  const [statusFilter, setStatusFilter] = useState<NonNullable<InvoiceFilters['status']>>('ALL');
  const [day, setDay] = useState('');
  const [branch, setBranch] = useState('');
  const [table, setTable] = useState('');
  const [cashier, setCashier] = useState('');
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; page?: InvoiceListResponse; error?: string } | null>(null);
  const [selected, setSelected] = useState<{ key: string; id: string; invoice?: InvoiceDetail; error?: string } | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<WorkShiftDto | null>(null);
  const [branches, setBranches] = useState<OrganizationBranch[]>([]);
  const [branchError, setBranchError] = useState('');
  const current = getRequestIdentity();
  const key = JSON.stringify([identityKey, current.identity, current.epoch, statusFilter, day, branch, table, cashier, cursors.at(-1), reload]);
  const latest = useRef(key); latest.current = key;
  const isCurrent = () => { const now = getRequestIdentity(); return latest.current === key && now.identity === current.identity && now.epoch === current.epoch; };
  const detailSequence = useRef(0);
  const cancelSequence = useRef(0);
  useEffect(() => {
    if (!allowed || !session.permissions.includes('shift.read')) return;
    let active = true;
    shiftService.getCurrentShift().then(shift => {
      const now = getRequestIdentity();
      if (active && now.identity === current.identity && now.epoch === current.epoch) setCurrentShift(shift);
    }).catch(() => { const now = getRequestIdentity(); if (active && now.identity === current.identity && now.epoch === current.epoch) setCurrentShift(null); });
    return () => { active = false; };
  }, [identityKey, allowed]);
  useEffect(() => {
    if (!allowed || !accessAll) return;
    let active = true;
    const sameIdentity = () => { const now = getRequestIdentity(); return active && now.identity === current.identity && now.epoch === current.epoch; };
    organizationService.getBranchChoices().then(rows => { if (sameIdentity()) setBranches(rows); }).catch(() => { if (sameIdentity()) setBranchError('Không tải được chi nhánh.'); });
    return () => { active = false; };
  }, [identityKey, allowed, accessAll]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    const filters: InvoiceFilters = { status: statusFilter, ...invoiceDateRange(day), ...(branch ? { branchId: branch } : {}), ...(table ? { tableId: table } : {}), ...(cashier ? { cashierId: cashier } : {}), ...(cursors.at(-1) ? { cursor: cursors.at(-1) } : {}) };
    invoiceService.getInvoices(filters).then(page => { if (active && isCurrent()) setResult({ key, page }); }).catch((err: any) => { if (active && isCurrent()) setResult({ key, error: `${err?.message || 'Không tải được hóa đơn. Vui lòng thử lại.'}${err?.requestId ? ` (Mã yêu cầu: ${err.requestId})` : ''}` }); });
    return () => { active = false; };
  }, [key, allowed]);
  const page = result?.key === key ? result.page : undefined;
  const error = result?.key === key ? result.error : undefined;
  const detail = selected?.key === key ? selected : null;
  const reset = () => { setCursors([undefined]); setSelected(null); setIsCancelModalOpen(false); detailSequence.current++; };
  const open = (id: string) => {
    const version = ++detailSequence.current;
    setIsCancelModalOpen(false); setSelected({ key, id });
    invoiceService.getInvoiceById(id).then(invoice => { if (isCurrent() && detailSequence.current === version) setSelected({ key, id, invoice }); }).catch((err: any) => { if (isCurrent() && detailSequence.current === version) setSelected({ key, id, error: `${err?.message || 'Không tải được chi tiết hóa đơn.'}${err?.requestId ? ` (Mã yêu cầu: ${err.requestId})` : ''}` }); });
  };
  const columns: Column<InvoiceSummary>[] = [
    {
      key: 'code',
      header: 'Mã hóa đơn',
      render: (inv) => (
        <span style={{ fontWeight: 700, color: 'var(--color-brand-800)' }}>
          {inv.invoiceCode}
        </span>
      ),
    },
    {
      key: 'time',
      header: 'Thời gian',
      render: (inv) => (
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          {formatDateTimeVN(inv.createdAt)}
        </span>
      ),
    },
    {
      key: 'table',
      header: 'Loại / Bàn',
      render: (inv) => {
        return (
          <span style={{ fontWeight: 600 }}>
            {inv.orderType === 'DINE_IN' ? (inv.tableName || 'Bàn') : 'Mang đi'}
          </span>
        );
      },
    },
    { key: 'cashier', header: 'Thu ngân', render: inv => <span>{inv.cashierName}</span> },
    {
      key: 'items_count',
      header: 'Số món',
      align: 'center',
      render: (inv) => {
        const totalItems = inv.itemCount;
        return <span>{totalItems}</span>;
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (inv) => (
        <Badge
          variant={inv.status === 'PAID' ? 'success' : inv.status === 'OPEN' ? 'info' : 'danger'}
          size="sm"
        >
          {inv.status === 'PAID' ? 'Đã thanh toán' : inv.status === 'OPEN' ? 'Đang mở' : 'Đã hủy'}
        </Badge>
      ),
    },
    {
      key: 'payment_method',
      header: 'Phương thức',
      render: (inv) => {
        const method = inv.paymentMethod;
        if (!method) return <span style={{ color: 'var(--color-text-disabled)' }}>-</span>;
        return <span>{method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</span>;
      },
    },
    {
      key: 'total',
      header: 'Tổng tiền',
      align: 'right',
      render: (inv) => (
        <span className="money" style={{ fontWeight: 700, color: 'var(--color-brand-600)', fontSize: 15 }}>
          {formatVND(inv.totalAmount)}
        </span>
      ),
    },
  ];

  if (!allowed) return <div role="alert">Bạn không có quyền xem hóa đơn.</div>;
  const selectStyle: React.CSSProperties = { minHeight: 48, minWidth: 150 };
  return <div style={{ flex: 1, minWidth: 0, padding: 'clamp(14px, 2.5vw, 24px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
    <h1>Danh sách Hóa đơn</h1>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
      <label>Ngày<br/><input aria-label="Ngày" type="date" style={selectStyle} value={day} onChange={e => { reset(); setDay(e.target.value); }}/></label>
      <label>Trạng thái<br/><select aria-label="Trạng thái" style={selectStyle} value={statusFilter} onChange={e => { reset(); setStatusFilter(e.target.value as NonNullable<InvoiceFilters['status']>); }}><option value="ALL">Tất cả</option><option value="OPEN">Đang mở</option><option value="PAID">Đã thanh toán</option><option value="CANCELLED">Đã hủy</option></select></label>
      {accessAll && <label>Chi nhánh<br/><select aria-label="Chi nhánh" style={selectStyle} value={branch} onChange={e => { reset(); setBranch(e.target.value); setTable(''); setCashier(''); }}><option value="">Tất cả</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
      <label>Bàn<br/><select aria-label="Bàn" style={selectStyle} value={table} onChange={e => { reset(); setTable(e.target.value); }}><option value="">Tất cả</option>{(page?.meta.filterOptions.tables ?? []).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Thu ngân<br/><select aria-label="Thu ngân" style={selectStyle} value={cashier} onChange={e => { reset(); setCashier(e.target.value); }}><option value="">Tất cả</option>{(page?.meta.filterOptions.cashiers ?? []).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    </div>
    {branchError && <div role="alert">{branchError}</div>}
    {error ? <div role="alert">{error} <button type="button" onClick={() => { reset(); setReload(n => n + 1); }}>Tải lại</button></div> : !page ? <p role="status">Đang tải hóa đơn…</p> : <><DataTable columns={columns} data={page.data} keyExtractor={inv => inv.id} onRowClick={inv => open(inv.id)} emptyMessage="Không có hóa đơn nào phù hợp với bộ lọc"/><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span>{page.meta.total} hóa đơn</span><button type="button" style={{ minHeight: 48 }} disabled={cursors.length === 1} onClick={() => { setSelected(null); setCursors(cursors.slice(0, -1)); }}>Trang trước</button><button type="button" style={{ minHeight: 48 }} disabled={!page.meta.nextCursor} onClick={() => { setSelected(null); setCursors([...cursors, page.meta.nextCursor!]); }}>Trang sau</button></div></>}
    {detail && !detail.invoice && <div role={detail.error ? 'alert' : 'status'}>{detail.error ?? 'Đang tải chi tiết…'} {detail.error && <button type="button" onClick={() => open(detail.id)}>Tải lại</button>} <button type="button" onClick={() => { detailSequence.current++; setSelected(null); }}>Đóng</button></div>}
    <InvoiceDetailDrawer currentShift={currentShift} isOpen={!!detail?.invoice && !isCancelModalOpen} onClose={() => { detailSequence.current++; setSelected(null); }} invoice={detail?.invoice ?? null} onOpenCancelModal={() => { cancelSequence.current = detailSequence.current; setIsCancelModalOpen(true); }} />
    {isCancelModalOpen && detail?.invoice && <CancelInvoiceModal key={`${identityKey}:${detail.id}`} isOpen onClose={() => { setIsCancelModalOpen(false); if (detailSequence.current === cancelSequence.current) open(detail.id); }} invoice={detail.invoice} isCurrent={() => isCurrent() && detailSequence.current === cancelSequence.current} onUpdate={invoice => setSelected({ key, id: detail.id, invoice })} onSuccess={invoice => {
      if (!isCurrent()) return;
      detailSequence.current++;
      const nextKey = JSON.stringify([identityKey, current.identity, current.epoch, statusFilter, day, branch, table, cashier, undefined, reload + 1]);
      setCursors([undefined]); setReload(reload + 1); setSelected({ key: nextKey, id: detail.id, invoice });
    }} />}
  </div>;
};
