import { HttpException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import type { RevenueQueryDto, RevenueReportDto } from './http/reports.dto';
import { Branch } from '../organization/entities/branch.entity';
import { WorkShift } from '../shifts/entities/work-shift.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { InvoiceItem } from '../sales/entities/invoice-item.entity';
import { Payment } from '../sales/entities/payment.entity';

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
      if (branchId && !(await this.db.getRepository(Branch).existsBy({ id: branchId, store_id: storeId }))) throw notFound();
    } else {
      if (!user.branchId) throw forbidden();
      branchId = user.branchId;
    }
    if (level === 'shift' && !query.shiftId) throw invalid('shiftId');
    if (query.shiftId) {
      const shift = await this.db.getRepository(WorkShift).findOne({
        where: { id: query.shiftId, branch: { store_id: storeId }, ...(branchId !== null ? { branch_id: branchId } : {}) },
        select: { id: true, user_id: true },
      });
      if (!shift) throw notFound();
      if (level === 'shift' && shift.user_id !== user.id) throw forbidden();
    }

    // One statement = one snapshot: totals, chart points and best sellers cannot disagree.
    // QueryBuilder: CTE or sub-query in one statement; find() cannot express it
    const bounds = this.db.createQueryBuilder()
      .select("LEAST(CAST(:reportDate AS date), CAST(:fromDate AS date))::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'", 'lo')
      .addSelect("(GREATEST(CAST(:reportDate AS date), CAST(:toDate AS date)) + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'", 'hi').fromDummy();
    const scoped = this.db.createQueryBuilder().select('i.id', 'id').addSelect('i.paid_at', 'paid_at')
      .addSelect("(i.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date", 'day').addSelect('p.method', 'method').addSelect('p.amount', 'amount')
      .from(Invoice, 'i').innerJoin(Branch, 'b', 'b.id = i.branch_id').innerJoin('bounds', 'bounds', 'true')
      .leftJoin(Payment, 'p', 'p.invoice_id = i.id')
      .where("b.store_id = :storeId AND i.status = 'PAID' AND i.paid_at >= bounds.lo AND i.paid_at < bounds.hi")
      .andWhere('(CAST(:branchId AS uuid) IS NULL OR i.branch_id = CAST(:branchId AS uuid))')
      .andWhere('(CAST(:shiftId AS uuid) IS NULL OR i.work_shift_id = CAST(:shiftId AS uuid))');
    const totals = this.db.createQueryBuilder().select('count(*)', 'cnt')
      .addSelect("COALESCE(SUM(amount) FILTER (WHERE method = 'CASH'), 0)", 'cash')
      .addSelect("COALESCE(SUM(amount) FILTER (WHERE method = 'TRANSFER'), 0)", 'transfer')
      .from('scoped', 'scoped').where('day = CAST(:reportDate AS date)');
    const daily = this.db.createQueryBuilder().select('d.day', 'day').addSelect('COALESCE(SUM(s.amount), 0)', 'revenue')
      .from(qb => qb.select('(CAST(:fromDate AS date) + g)::date', 'day')
        .from(qb2 => qb2.select('generate_series(0, CAST(:toDate AS date) - CAST(:fromDate AS date))', 'g').fromDummy(), 'gs'), 'd')
      .leftJoin('scoped', 's', 's.day = d.day').groupBy('d.day');
    const sizes = this.db.createQueryBuilder().select('ii.product_size_id', 'product_size_id')
      .addSelect('SUM(ii.quantity)', 'quantity').addSelect('SUM(ii.line_total)', 'revenue')
      .addSelect('(ARRAY_AGG(ii.product_name ORDER BY s.paid_at DESC, ii.id DESC))[1]', 'product_name')
      .addSelect('(ARRAY_AGG(ii.size_name ORDER BY s.paid_at DESC, ii.id DESC))[1]', 'size_name')
      .from('scoped', 's').innerJoin(InvoiceItem, 'ii', 'ii.invoice_id = s.id')
      .where('s.day = CAST(:reportDate AS date)').groupBy('ii.product_size_id');
    const top = this.db.createQueryBuilder().select('*').from('sizes', 'sizes').orderBy('quantity', 'DESC')
      .addOrderBy('product_name', 'ASC').addOrderBy('size_name', 'ASC').addOrderBy('product_size_id', 'ASC').limit(10);
    const row = await this.db.createQueryBuilder().fromDummy()
      .addCommonTableExpression(bounds, 'bounds').addCommonTableExpression(scoped, 'scoped')
      .addCommonTableExpression(totals, 'totals').addCommonTableExpression(daily, 'daily')
      .addCommonTableExpression(sizes, 'sizes').addCommonTableExpression(top, 'top')
      .select(qb => qb.select('cnt::text').from('totals', 'totals'), 'cnt')
      .addSelect(qb => qb.select('cash::text').from('totals', 'totals'), 'cash')
      .addSelect(qb => qb.select('transfer::text').from('totals', 'totals'), 'transfer')
      .addSelect(qb => qb.select("COALESCE(json_agg(json_build_object('date', to_char(day, 'YYYY-MM-DD'), 'revenue', revenue::text) ORDER BY day), '[]'::json)").from('daily', 'daily'), 'daily')
      .addSelect(qb => qb.select("COALESCE(json_agg(json_build_object('productSizeId', product_size_id, 'productName', product_name, 'sizeName', size_name, 'quantity', quantity::text, 'revenue', revenue::text) ORDER BY quantity DESC, product_name ASC, size_name ASC, product_size_id ASC), '[]'::json)").from('top', 'top'), 'best')
      .setParameters({ storeId, branchId, shiftId: query.shiftId ?? null, reportDate: query.date, fromDate: query.fromDate, toDate: query.toDate }).getRawOne();
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
