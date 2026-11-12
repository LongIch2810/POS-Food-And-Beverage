// POS-F&B Daily Report Screen per DESIGN.md §5.6 & BR-62 to BR-65, BR-77

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportService } from './reportService';
import { MockEngine } from '../../mock/mockEngine';
import { mockStorage } from '../../mock/mockStorage';
import { formatVND } from '../../utils/formatters';
import { Banknote, QrCode, Calendar } from 'lucide-react';

export const DailyReportScreen: React.FC = () => {
  const { session } = useAuth();
  const canViewAll = session.permissions.includes('report.view_all');
  const canViewBranch = session.permissions.includes('report.view_branch');

  const accessibleBranches = MockEngine.getAccessibleBranches();
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    canViewAll ? '' : MockEngine.getEffectiveBranchId()
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const [reportDate, setReportDate] = useState<string>(todayStr);

  const [report, setReport] = useState(() =>
    reportService.getDailyReport(selectedBranchId || undefined, reportDate)
  );

  useEffect(() => {
    const update = () => {
      setReport(reportService.getDailyReport(selectedBranchId || undefined, reportDate));
    };
    update();
    const unsubscribe = mockStorage.subscribe(update);
    return () => unsubscribe();
  }, [selectedBranchId, reportDate]);

  const cashPercent =
    report.totalRevenue > 0n
      ? Number((report.cashRevenue * 100n) / report.totalRevenue)
      : 0;
  const transferPercent =
    report.totalRevenue > 0n
      ? Number((report.transferRevenue * 100n) / report.totalRevenue)
      : 0;

  if (!canViewBranch && !canViewAll) {
    return (
      <div className="center-note">
        <div>
          <h2>Không có quyền truy cập</h2>
          <p>Bạn không có quyền xem báo cáo doanh thu ngày (cần được cấp quyền xem báo cáo).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Báo cáo doanh thu ngày</h1>
          <p className="page-sub">Chỉ tính các đơn đã thanh toán, gom theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)</p>
        </div>

        <div className="page-actions">
          {/* Lọc chi nhánh cho người có quyền report.view_all (BR-77) */}
          {canViewAll && (
            <select
              className="select"
              aria-label="Chi nhánh"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              <option value="">Tất cả chi nhánh (Tổng hợp)</option>
              {accessibleBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          <label className="filter-box">
            <Calendar size={16} aria-hidden="true" />
            <input type="date" aria-label="Ngày báo cáo" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel-title">Doanh thu trong ngày</h2>
        <dl className="sum-list">
          <div className="sum-row sum-total">
            <dt>Tổng doanh thu <span className="stat-note">{report.invoiceCount} hóa đơn hoàn tất</span></dt>
            <dd className="money">{formatVND(report.totalRevenue)}</dd>
          </div>
          <div className="sum-row">
            <dt><Banknote size={16} aria-hidden="true" />Tiền mặt <span className="stat-note">{cashPercent}% tổng doanh thu</span></dt>
            <dd className="money">{formatVND(report.cashRevenue)}</dd>
          </div>
          <div className="sum-row">
            <dt><QrCode size={16} aria-hidden="true" />Chuyển khoản <span className="stat-note">{transferPercent}% tổng doanh thu</span></dt>
            <dd className="money">{formatVND(report.transferRevenue)}</dd>
          </div>
        </dl>
      </div>

      <div className="panel">
        <h2 className="panel-title">Cơ cấu hình thức thanh toán</h2>

        {report.totalRevenue === 0n ? (
          <p className="stat-note" style={{ fontSize: 14 }}>Chưa có doanh thu trong ngày {reportDate}.</p>
        ) : (
          <div>
            <div className="split-bar">
              <span className="split-cash" style={{ width: `${cashPercent}%` }} title={`Tiền mặt: ${cashPercent}%`} />
              <span className="split-transfer" style={{ width: `${transferPercent}%` }} title={`Chuyển khoản: ${transferPercent}%`} />
            </div>
            <div className="legend">
              <div><i className="split-cash" /><span>Tiền mặt: <strong>{cashPercent}%</strong> ({formatVND(report.cashRevenue)})</span></div>
              <div><i className="split-transfer" /><span>Chuyển khoản: <strong>{transferPercent}%</strong> ({formatVND(report.transferRevenue)})</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
