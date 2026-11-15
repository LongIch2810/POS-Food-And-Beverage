import { HttpException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import type { RevenueQueryDto, RevenueReportDto } from './http/reports.dto';

const MAX_RANGE_DAYS = 31;

export function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Inclusive number of days, or null when the range is reversed or longer than 31 days. */
export function assertDateRange(from: string, to: string): number | null {
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
  return days >= 1 && days <= MAX_RANGE_DAYS ? days : null;
}

export function toSafeMoney(value: string, label: string): number {
  if (!/^\d+$/.test(value) || BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER)) {
    Logger.error(`Revenue report ${label} is not a safe integer`, undefined, 'ReportsService');
    throw httpError(500, 'INTERNAL_ERROR', 'Hệ thống gặp lỗi. Vui lòng thử lại sau.');
  }
  return Number(value);
}

const invalid = (field: string) => new HttpException({
  code: 'VALIDATION_ERROR', message: 'Dữ liệu gửi lên không hợp lệ.',
  details: [{ location: 'query', field, message: 'Giá trị không hợp lệ.' }],
}, 422);
const forbidden = () => httpError(403, 'PERMISSION_DENIED', 'Bạn không có quyền thực hiện thao tác này.');
const notFound = () => httpError(404, 'NOT_FOUND', 'Không tìm thấy tài nguyên.');

// One statement = one snapshot: totals, chart points and best sellers cannot disagree.
const REVENUE_SQL = `
WITH bounds AS (
  SELECT LEAST($4::date, $5::date)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AS lo,
         (GREATEST($4::date, $6::date) + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AS hi
), scoped AS (
  SELECT i.id, i.paid_at, (i.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day, p.method, p.amount
  FROM invoices i
  JOIN branches b ON b.id = i.branch_id
  CROSS JOIN bounds
  LEFT JOIN payments p ON p.invoice_id = i.id
  WHERE b.store_id = $1 AND i.status = 'PAID' AND i.paid_at >= bounds.lo AND i.paid_at < bounds.hi
    AND ($2::uuid IS NULL OR i.branch_id = $2::uuid) AND ($3::uuid IS NULL OR i.work_shift_id = $3::uuid)
), totals AS (
  SELECT count(*) AS cnt,
    COALESCE(SUM(amount) FILTER (WHERE method = 'CASH'), 0) AS cash,
    COALESCE(SUM(amount) FILTER (WHERE method = 'TRANSFER'), 0) AS transfer
  FROM scoped WHERE day = $4::date
), daily AS (
  SELECT d.day, COALESCE(SUM(s.amount), 0) AS revenue
  FROM (SELECT ($5::date + g)::date AS day FROM generate_series(0, $6::date - $5::date) g) d
  LEFT JOIN scoped s ON s.day = d.day GROUP BY d.day
), sizes AS (
  SELECT ii.product_size_id, SUM(ii.quantity) AS quantity, SUM(ii.line_total) AS revenue,
    (ARRAY_AGG(ii.product_name ORDER BY s.paid_at DESC, ii.id DESC))[1] AS product_name,
    (ARRAY_AGG(ii.size_name ORDER BY s.paid_at DESC, ii.id DESC))[1] AS size_name
  FROM scoped s JOIN invoice_items ii ON ii.invoice_id = s.id
  WHERE s.day = $4::date GROUP BY ii.product_size_id
), top AS (
  SELECT * FROM sizes ORDER BY quantity DESC, product_name ASC, size_name ASC, product_size_id ASC LIMIT 10
)
SELECT (SELECT cnt::text FROM totals) AS cnt, (SELECT cash::text FROM totals) AS cash, (SELECT transfer::text FROM totals) AS transfer,
  (SELECT COALESCE(json_agg(json_build_object('date', to_char(day, 'YYYY-MM-DD'), 'revenue', revenue::text) ORDER BY day), '[]'::json) FROM daily) AS daily,
  (SELECT COALESCE(json_agg(json_build_object('productSizeId', product_size_id, 'productName', product_name, 'sizeName', size_name,
    'quantity', quantity::text, 'revenue', revenue::text) ORDER BY quantity DESC, product_name ASC, size_name ASC, product_size_id ASC), '[]'::json) FROM top) AS best`;

type Level = 'all' | 'branch' | 'shift';

/** Store identity and report permission, decided before any query validation. */
export function reportLevel(user: UserSummary): Level {
  if (!user.storeId) throw forbidden();
  const level: Level | null = user.permissions.includes('report.view_all') ? 'all'
    : user.permissions.includes('report.view_branch') ? 'branch'
      : user.permissions.includes('report.view_shift') ? 'shift' : null;
  if (!level || (level === 'all' && !user.permissions.includes('branch.access_all'))) throw forbidden();
  return level;
}

@Injectable()
export class ReportsService {
  constructor(private readonly db: DataSource) {}

  async getRevenue(user: UserSummary, query: RevenueQueryDto): Promise<RevenueReportDto> {
    const storeId = user.storeId!;
    const level = reportLevel(user);
    if (assertDateRange(query.fromDate, query.toDate) === null) throw invalid('toDate');

    // Scope comes from identity and permission; a missing branch without access_all is never widened.
    let branchId: string | null;
    if (level === 'all') {
      branchId = query.branchId ?? null;
      if (branchId && !(await this.db.query('SELECT 1 FROM branches WHERE id = $1::uuid AND store_id = $2', [branchId, storeId])).length) throw notFound();
    } else {
      if (!user.branchId) throw forbidden();
      branchId = user.branchId;
    }
    if (level === 'shift' && !query.shiftId) throw invalid('shiftId');
    if (query.shiftId) {
      const [shift] = await this.db.query(`SELECT w.user_id FROM work_shifts w JOIN branches b ON b.id = w.branch_id
        WHERE w.id = $1::uuid AND b.store_id = $2 AND ($3::uuid IS NULL OR w.branch_id = $3::uuid)`, [query.shiftId, storeId, branchId]);
      if (!shift) throw notFound();
      if (level === 'shift' && shift.user_id !== user.id) throw forbidden();
    }

    const [row] = await this.db.query(REVENUE_SQL, [storeId, branchId, query.shiftId ?? null, query.date, query.fromDate, query.toDate]);
    const cash = toSafeMoney(row.cash, 'cashRevenue'), transfer = toSafeMoney(row.transfer, 'transferRevenue');
    return {
      date: query.date,
      invoiceCount: toSafeMoney(row.cnt, 'invoiceCount'),
      totalRevenue: toSafeMoney(String(BigInt(row.cash) + BigInt(row.transfer)), 'totalRevenue'),
      cashRevenue: cash,
      transferRevenue: transfer,
      dailyRevenue: row.daily.map((d: { date: string; revenue: string }) => ({ date: d.date, revenue: toSafeMoney(d.revenue, 'dailyRevenue') })),
      bestSellers: row.best.map((b: { productSizeId: string; productName: string; sizeName: string; quantity: string; revenue: string }) => ({
        productSizeId: b.productSizeId, productName: b.productName, sizeName: b.sizeName,
        quantity: toSafeMoney(b.quantity, 'bestSeller.quantity'), revenue: toSafeMoney(b.revenue, 'bestSeller.revenue'),
      })),
    };
  }
}
