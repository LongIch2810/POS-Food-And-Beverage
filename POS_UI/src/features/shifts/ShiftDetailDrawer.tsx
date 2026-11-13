import React, { useEffect, useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { getRequestIdentity } from '../../auth/session-events';
import { shiftService, ShiftExpensesResponse, WorkShiftDto } from '../../services/shiftService';
import { formatDateTimeVN, formatVND } from '../../utils/formatters';
import { AddExpenseModal } from './AddExpenseModal';

export interface ShiftDetailDrawerProps { isOpen: boolean; onClose: () => void; shiftId: string }

export const ShiftDetailDrawer: React.FC<ShiftDetailDrawerProps> = ({ isOpen, onClose, shiftId }) => {
  const { session } = useAuth();
  const epoch = getRequestIdentity().epoch;
  const key = `${epoch}:${shiftId}:${isOpen}`;
  const [page, setPage] = useState<{ key: string; shift: WorkShiftDto; expenses: ShiftExpensesResponse } | null>(null);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const cursor = cursors[cursors.length - 1];
  const pageKey = `${key}:${cursor ?? ''}:${revision}`;

  useEffect(() => { setCursors([undefined]); setAdding(false); }, [key]);
  useEffect(() => {
    if (!isOpen || !session.permissions.includes('shift.read')) return;
    let active = true;
    setLoading(true); setError(''); setPage(null);
    void Promise.all([shiftService.getShiftDetail(shiftId), shiftService.getExpenses(shiftId, { cursor })])
      .then(([shift, expenses]) => { if (active && epoch === getRequestIdentity().epoch) setPage({ key: pageKey, shift, expenses }); })
      .catch((err: any) => { if (active && epoch === getRequestIdentity().epoch) setError(err?.message || 'Không thể tải chi tiết ca.'); })
      .finally(() => { if (active && epoch === getRequestIdentity().epoch) setLoading(false); });
    return () => { active = false; };
  }, [key, cursor, revision, session.permissions.includes('shift.read')]);

  const data = page?.key === pageKey ? page : null;
  const refresh = () => { setPage(null); setCursors([undefined]); setRevision(value => value + 1); };
  const canAdd = data && session.permissions.includes('shift.expense') && data.shift.userId === session.user.id &&
    data.shift.shiftType === 'CASHIER' && data.shift.status === 'OPEN';
  return <><Drawer isOpen={isOpen} onClose={onClose} title="Chi tiết ca" width={560} suspended={adding}>
    {loading && <p>Đang tải chi tiết ca...</p>}
    {error && <div role="alert">{error} <Button variant="secondary" onClick={refresh}>Tải lại</Button></div>}
    {data && <>
      <p>{data.shift.shiftType === 'CASHIER' ? 'Ca thu ngân' : 'Ca nhân viên'} · {data.shift.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}</p>
      <p>Bắt đầu: {formatDateTimeVN(data.shift.startedAt)}</p>
      {data.shift.status === 'CLOSED' && data.shift.shiftType === 'CASHIER' && data.shift.reconciliation && <section>
        <h3>Đối soát tiền mặt</h3>
        <dl style={{ margin: 0, padding: 16, borderRadius: 'var(--radius-control)', background: 'var(--color-surface-sunken)' }}>
          {([
            ['Tiền đầu ca', data.shift.reconciliation.openingCash],
            ['Doanh thu tiền mặt', data.shift.reconciliation.cashSalesAmount],
            ['Chi phí từ két', data.shift.reconciliation.expenseAmount],
            ['Tiền kỳ vọng', data.shift.reconciliation.expectedCash],
            ['Tiền đã đếm', data.shift.reconciliation.countedCash],
          ] as const).map(([label, amount]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
            <dt>{label}</dt>
            <dd style={{ margin: 0, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{amount == null ? '—' : formatVND(amount)}</dd>
          </div>)}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <dt style={{ fontWeight: 600 }}>Chênh lệch</dt>
            <dd style={{ margin: 0, textAlign: 'right', fontWeight: 700, fontSize: 40, lineHeight: '48px', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{data.shift.reconciliation.difference == null ? '—' : formatVND(data.shift.reconciliation.difference)}</dd>
            <div style={{ textAlign: 'right' }}><Badge variant={data.shift.reconciliation.status === 'MATCHED' ? 'success' : data.shift.reconciliation.status === 'SHORTAGE' ? 'danger' : 'warning'}>{data.shift.reconciliation.status === 'MATCHED' ? 'Khớp' : data.shift.reconciliation.status === 'SHORTAGE' ? 'Thiếu' : 'Thừa'}</Badge></div>
          </div>
        </dl>
      </section>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h3>Chi phí trong ca</h3>
        {canAdd && <Button variant="primary" onClick={() => setAdding(true)}>Ghi khoản chi</Button>}
      </div>
      {data.expenses.data.length === 0 ? <p>Chưa có khoản chi nào.</p> :
        <div style={{ overflow: 'auto', maxHeight: '45vh' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th>Thời gian</th><th>Lý do</th><th>Nguồn</th><th style={{ textAlign: 'right' }}>Số tiền</th></tr></thead>
          <tbody>{data.expenses.data.map(item => <tr key={item.id} style={{ height: 48 }}>
            <td>{formatDateTimeVN(item.createdAt)}</td><td style={{ overflowWrap: 'anywhere' }}>{item.reason}</td>
            <td>{item.paidFromDrawer ? 'Lấy từ két' : 'Ngoài két'}</td>
            <td className="money" style={{ textAlign: 'right' }}>{formatVND(item.amount)}</td>
          </tr>)}</tbody>
        </table></div>}
      <div className="form-actions">
        <Button variant="secondary" disabled={cursors.length === 1 || loading} onClick={() => setCursors(value => value.slice(0, -1))}>Trang trước</Button>
        <Button variant="secondary" disabled={!data.expenses.meta.nextCursor || loading} onClick={() => setCursors(value => [...value, data.expenses.meta.nextCursor!])}>Trang sau</Button>
      </div>
    </>}
  </Drawer>
    {adding && <AddExpenseModal key={key} isOpen onClose={() => setAdding(false)} shiftId={shiftId} onSuccess={refresh} />}
  </>;
};
