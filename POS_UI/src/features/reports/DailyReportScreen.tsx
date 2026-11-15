// Báo cáo doanh thu ngày: dữ liệu thật từ GET /reports/revenue (BR-62..65, BR-77)

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GENERIC_ERROR_MESSAGE } from '../../http/client';
import { getRequestIdentity } from '../../auth/session-events';
import { reportService, type RevenueQuery, type RevenueReport } from './reportService';
import { shiftService, type WorkShiftDto } from '../../services/shiftService';
import { organizationService, type OrganizationBranch } from '../../services/organizationService';
import { formatDateTimeVN, formatVND } from '../../utils/formatters';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { reportScope } from '../../app/navigation';

const DAY_MS = 86400000;
const vnToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const shiftDay = (day: string, offset: number) => new Date(Date.parse(`${day}T00:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10);
const validDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`)) && shiftDay(day, 0) === day;
const displayDay = (day: string) => day.split('-').reverse().join('/');
const isoDay = (text: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(text) ? text.split('/').reverse().join('-') : '';
// Lỗi gắn theo field; khoảng biểu đồ 1..31 ngày, hai đầu đều tính.
function validateDays(date: string, from: string, to: string) {
  const errors: { date?: string; from?: string; to?: string } = {};
  if (!validDay(date)) errors.date = 'Ngày báo cáo không hợp lệ.';
  if (!validDay(from)) errors.from = 'Ngày bắt đầu biểu đồ không hợp lệ.';
  if (!validDay(to)) errors.to = 'Ngày kết thúc biểu đồ không hợp lệ.';
  if (!errors.from && !errors.to) {
    const days = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;
    if (days < 1) errors.to = 'Ngày bắt đầu không được sau ngày kết thúc.';
    else if (days > 31) errors.to = 'Khoảng biểu đồ tối đa 31 ngày.';
  }
  return errors;
}
const describe = (err: any, fallback: string) => `${err?.message && err.message !== GENERIC_ERROR_MESSAGE ? err.message : fallback}${err?.requestId ? ` (Mã yêu cầu: ${err.requestId})` : ''}`;

type BestSeller = RevenueReport['bestSellers'][number];
const bestSellerColumns: Column<BestSeller>[] = [
  { key: 'product', header: 'Món', render: row => row.productName },
  { key: 'size', header: 'Size', render: row => row.sizeName },
  { key: 'quantity', header: 'Số lượng', align: 'right', render: row => row.quantity },
  { key: 'revenue', header: 'Doanh thu món và topping trước giảm giá', align: 'right', render: row => <span className="money">{formatVND(row.revenue)}</span> },
];
const dayLabel = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

const ReportBody: React.FC<{ report: RevenueReport }> = ({ report }) => {
  const max = Math.max(0, ...report.dailyRevenue.map(row => row.revenue));
  return (
    <>
      <section className="panel" aria-labelledby="report-summary-title">
        <h2 className="panel-title" id="report-summary-title">Doanh thu ngày {dayLabel(report.date)}</h2>
        <dl className="sum-list">
          <div className="sum-row sum-total"><dt>Tổng doanh thu <span className="stat-note">{report.invoiceCount} hóa đơn hoàn tất</span></dt><dd className="money">{formatVND(report.totalRevenue)}</dd></div>
          <div className="sum-row"><dt>Tiền mặt</dt><dd className="money">{formatVND(report.cashRevenue)}</dd></div>
          <div className="sum-row"><dt>Chuyển khoản</dt><dd className="money">{formatVND(report.transferRevenue)}</dd></div>
        </dl>
      </section>
      <section className="panel" aria-labelledby="report-chart-title">
        <h2 className="panel-title" id="report-chart-title">Doanh thu theo ngày</h2>
        <div className="report-chart-wrap" role="group" aria-label="Doanh thu theo ngày" tabIndex={0}>
          <div className="report-chart-axis" aria-hidden="true"><span>{formatVND(max)}</span><span>{formatVND(0)}</span></div>
          <ol className="report-chart">
            {report.dailyRevenue.map(row => (
              <li key={row.date} className="report-bar">
                <span className="report-bar-value">{formatVND(row.revenue)}</span>
                <span className="report-bar-track"><span className="report-bar-fill" style={{ height: `${max > 0 ? (row.revenue * 100) / max : 0}%` }} /></span>
                <time dateTime={row.date}>{dayLabel(row.date)}</time>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="panel" aria-labelledby="report-items-title">
        <h2 className="panel-title" id="report-items-title">Món bán chạy theo size</h2>
        <p className="stat-note">Doanh thu món và topping trước giảm giá toàn hóa đơn, nên có thể khác tổng thu.</p>
        <DataTable columns={bestSellerColumns} data={report.bestSellers} keyExtractor={row => row.productSizeId} emptyMessage="Chưa có món bán trong ngày này" />
      </section>
    </>
  );
};

interface BranchState { key: string; list: OrganizationBranch[]; error?: string }
interface ShiftState { key: string; current: WorkShiftDto | null; list: WorkShiftDto[]; next: string | null; error?: string; moreError?: string; moreLoading?: boolean }

export const DailyReportScreen: React.FC = () => {
  const { session } = useAuth();
  const identity = getRequestIdentity();
  const key = JSON.stringify([identity.identity, identity.epoch, session.user.id, session.user.store_id, session.user.branch_id, [...session.permissions].sort()]);
  return <ReportView key={key} identityKey={key} />;
};

const ReportView: React.FC<{ identityKey: string }> = ({ identityKey }) => {
  const { session } = useAuth();
  const scope = reportScope(session);
  const [dateText, setDate] = useState(() => displayDay(vnToday()));
  const [fromText, setFromDate] = useState(() => displayDay(shiftDay(isoDay(dateText), -6)));
  const [toText, setToDate] = useState(dateText);
  const date = isoDay(dateText), fromDate = isoDay(fromText), toDate = isoDay(toText);
  const [branch, setBranch] = useState('');
  const [chosenShift, setChosenShift] = useState('');
  const [reload, setReload] = useState(0);
  const [shiftReload, setShiftReload] = useState(0);
  const [branchReload, setBranchReload] = useState(0);
  const [branches, setBranches] = useState<BranchState | null>(null);
  const [shifts, setShifts] = useState<ShiftState | null>(null);
  const [result, setResult] = useState<{ key: string; report?: RevenueReport; error?: string } | null>(null);
  const current = getRequestIdentity();
  const auxKey = JSON.stringify([identityKey, current.identity, current.epoch, 'shifts', shiftReload]);
  const shiftQuery = { limit: 100, shiftType: 'CASHIER' as const, userId: session.user.id };

  const branchKey = JSON.stringify([identityKey, current.identity, current.epoch, 'branches', branchReload]);
  const branchList = branches?.key === branchKey ? branches : null;
  const shiftList = shifts?.key === auxKey ? shifts : null;
  const mine = shiftList?.current;
  const shiftRows = shiftList
    ? (mine && mine.shiftType === 'CASHIER' && mine.status === 'OPEN' && mine.userId === session.user.id
      ? [mine, ...shiftList.list.filter(row => row.id !== mine.id)] : shiftList.list).filter(row => row.userId === session.user.id)
    : [];
  const shiftId = shiftRows.some(row => row.id === chosenShift) ? chosenShift : shiftRows[0]?.id ?? '';

  const query: RevenueQuery = { date, fromDate, toDate, ...(scope === 'all' && branch ? { branchId: branch } : {}), ...(scope === 'shift' ? { shiftId } : {}) };
  const errors = validateDays(date, fromDate, toDate);
  const key = JSON.stringify([identityKey, current.identity, current.epoch, query, reload]);
  const latest = useRef(key); latest.current = key;
  const latestAux = useRef(auxKey); latestAux.current = auxKey;
  const latestBranch = useRef(branchKey); latestBranch.current = branchKey;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []); // StrictMode chạy mount-cleanup-mount
  const sameIdentity = () => { const now = getRequestIdentity(); return now.identity === current.identity && now.epoch === current.epoch; };
  const ready = !!scope && !errors.date && !errors.from && !errors.to && (scope !== 'shift' || (!!shiftList && !shiftList.error && !!shiftId));

  useEffect(() => {
    if (scope !== 'shift') return;
    let active = true;
    const ok = () => active && latestAux.current === auxKey && sameIdentity();
    Promise.all([shiftService.getCurrentShift(), shiftService.getShifts(shiftQuery)])
      .then(([cur, page]) => { if (ok()) setShifts({ key: auxKey, current: cur, list: page.data, next: page.meta.nextCursor }); })
      .catch(err => { if (ok()) setShifts({ key: auxKey, current: null, list: [], next: null, error: describe(err, 'Không tải được danh sách ca.') }); });
    return () => { active = false; };
  }, [auxKey, scope]);

  useEffect(() => {
    if (scope !== 'all') return;
    let active = true;
    const ok = () => active && latestBranch.current === branchKey && sameIdentity();
    organizationService.getBranchChoices()
      .then(list => { if (ok()) setBranches({ key: branchKey, list }); })
      .catch(err => { if (ok()) setBranches({ key: branchKey, list: [], error: describe(err, 'Không tải được danh sách chi nhánh.') }); });
    return () => { active = false; };
  }, [branchKey, scope]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const ok = () => active && latest.current === key && sameIdentity();
    reportService.getRevenue(query)
      .then(report => { if (ok()) setResult({ key, report }); })
      .catch(err => { if (ok()) setResult({ key, error: describe(err, 'Không tải được báo cáo. Vui lòng thử lại.') }); });
    return () => { active = false; };
  }, [key, ready]);

  const loadMore = () => {
    if (!shiftList?.next || shiftList.moreLoading) return;
    const cursor = shiftList.next;
    const ok = () => mounted.current && latestAux.current === auxKey && sameIdentity();
    const patch = (change: (old: ShiftState) => ShiftState) => setShifts(old => old && old.key === auxKey ? change(old) : old);
    patch(old => ({ ...old, moreError: undefined, moreLoading: true }));
    shiftService.getShifts({ ...shiftQuery, cursor })
      .then(page => { if (ok()) patch(old => ({ ...old, list: [...old.list, ...page.data.filter(row => !old.list.some(known => known.id === row.id))], next: page.meta.nextCursor, moreLoading: false })); })
      .catch(err => { if (ok()) patch(old => ({ ...old, moreLoading: false, moreError: describe(err, 'Không tải thêm được ca.') })); });
  };

  if (!scope) {
    return (
      <div className="center-note" role="alert">
        <div>
          <h2>Không có quyền truy cập</h2>
          <p>Bạn không có quyền xem báo cáo doanh thu.</p>
        </div>
      </div>
    );
  }
  const report = result?.key === key ? result.report : undefined;
  const error = result?.key === key ? result.error : undefined;
  return (
    <div className="page">
      <h1 className="page-title">Báo cáo doanh thu ngày</h1>
      <div className="report-filters">
        <label className="field report-field"><span>Ngày báo cáo</span><input aria-label="Ngày báo cáo" type="text" placeholder="dd/MM/yyyy" className="input" value={dateText} onChange={e => setDate(e.target.value)} aria-invalid={!!errors.date} aria-describedby={errors.date ? 'report-date-error' : undefined} />{errors.date && <span id="report-date-error" className="report-field-error">{errors.date}</span>}</label>
        <label className="field report-field"><span>Biểu đồ từ ngày</span><input aria-label="Biểu đồ từ ngày" type="text" placeholder="dd/MM/yyyy" className="input" value={fromText} onChange={e => setFromDate(e.target.value)} aria-invalid={!!errors.from} aria-describedby={errors.from ? 'report-from-error' : undefined} />{errors.from && <span id="report-from-error" className="report-field-error">{errors.from}</span>}</label>
        <label className="field report-field"><span>Biểu đồ đến ngày</span><input aria-label="Biểu đồ đến ngày" type="text" placeholder="dd/MM/yyyy" className="input" value={toText} onChange={e => setToDate(e.target.value)} aria-invalid={!!errors.to} aria-describedby={errors.to ? 'report-to-error' : undefined} />{errors.to && <span id="report-to-error" className="report-field-error">{errors.to}</span>}</label>
        {scope === 'all' && (
          <label className="field report-field"><span>Chi nhánh</span>
            <select aria-label="Chi nhánh" className="select" value={branch} onChange={e => setBranch(e.target.value)}>
              <option value="">Tất cả chi nhánh</option>
              {(branchList?.list ?? []).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
        )}
        {scope === 'shift' && (
          <label className="field report-field"><span>Ca thu ngân</span>
            <select aria-label="Ca thu ngân" className="select" value={shiftId} onChange={e => setChosenShift(e.target.value)}>
              {shiftRows.map(row => <option key={row.id} value={row.id}>{formatDateTimeVN(row.startedAt)} - {row.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}</option>)}
            </select>
          </label>
        )}
      </div>
      {scope === 'shift' && shiftList?.next && <button type="button" className="btn btn-secondary" onClick={loadMore} disabled={shiftList.moreLoading}>Tải thêm ca</button>}
      {scope === 'shift' && shiftList && !shiftList.error && shiftRows.length === 0 && <p role="status">Chưa có ca thu ngân nào để xem báo cáo.</p>}
      {shiftList?.moreError && <div role="alert">{shiftList.moreError}</div>}
      {shiftList?.error && <div role="alert">{shiftList.error} <button type="button" className="btn btn-secondary" onClick={() => setShiftReload(n => n + 1)}>Tải lại ca</button></div>}
      {branchList?.error && <div role="alert">{branchList.error} <button type="button" className="btn btn-secondary" onClick={() => setBranchReload(n => n + 1)}>Tải lại chi nhánh</button></div>}
      {error && <div role="alert">{error} <button type="button" className="btn btn-secondary" onClick={() => setReload(n => n + 1)}>Thử lại</button></div>}
      {ready && !report && !error && <p role="status">Đang tải báo cáo…</p>}
      {report && <ReportBody report={report} />}
    </div>
  );
};
