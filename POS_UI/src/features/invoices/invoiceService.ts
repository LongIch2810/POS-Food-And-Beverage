import { request } from '../../http/client.ts';
import { salesService, type InvoiceDetail, type InvoiceSummary } from '../../services/salesService.ts';

export interface InvoiceFilters {
  status?: 'OPEN' | 'PAID' | 'CANCELLED' | 'ALL';
  branchId?: string; from?: string; to?: string; tableId?: string; cashierId?: string; cursor?: string; limit?: number;
}
export interface InvoiceListResponse {
  data: InvoiceSummary[];
  meta: { limit: number; nextCursor: string | null; total: number; filterOptions: { tables: { id: string; name: string }[]; cashiers: { id: string; name: string }[] } };
}
export const invoiceService = {
  getInvoices(filters: InvoiceFilters = {}): Promise<InvoiceListResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined) params.set(key, String(value));
    const query = params.toString();
    return request<InvoiceListResponse>(`invoices${query ? `?${query}` : ''}`, 'GET', undefined, true, true);
  },
  getInvoiceById: (invoiceId: string): Promise<InvoiceDetail> => salesService.get(invoiceId),
  cancelInvoice: (invoiceId: string, reason: string): Promise<InvoiceDetail> => salesService.cancel(invoiceId, reason),
};
