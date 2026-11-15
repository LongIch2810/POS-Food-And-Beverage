import { request } from '../../http/client.ts';

export interface RevenueQuery {
  date: string;
  fromDate: string;
  toDate: string;
  branchId?: string;
  shiftId?: string;
}

export interface RevenueReport {
  date: string;
  invoiceCount: number;
  totalRevenue: number;
  cashRevenue: number;
  transferRevenue: number;
  dailyRevenue: { date: string; revenue: number }[];
  bestSellers: { productSizeId: string; productName: string; sizeName: string; quantity: number; revenue: number }[];
}

export const reportService = {
  getRevenue(query: RevenueQuery): Promise<RevenueReport> {
    const params = new URLSearchParams({ date: query.date, fromDate: query.fromDate, toDate: query.toDate });
    if (query.branchId) params.set('branchId', query.branchId);
    if (query.shiftId) params.set('shiftId', query.shiftId);
    return request<RevenueReport>(`reports/revenue?${params}`);
  },
};
