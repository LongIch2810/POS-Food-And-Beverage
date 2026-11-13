import { request } from '../http/client.ts';

export interface InvoiceTopping {
  id: string; toppingId: string; toppingName: string; unitPrice: number; quantity: number; lineTotal: number;
}
export interface InvoiceItem {
  id: string; productSizeId: string; productName: string; sizeName: string; unitPrice: number;
  quantity: number; lineTotal: number; note: string | null; toppings: InvoiceTopping[];
}
export interface InvoiceDetail {
  id: string; invoiceCode: string; branchId: string; workShiftId: string; tableId: string | null;
  orderType: 'DINE_IN' | 'TAKEAWAY'; status: 'OPEN' | 'CANCELLED' | 'PAID';
  subtotal: number; discountAmount: number; totalAmount: number; note: string | null;
  cancelReason: string | null; cancelledAt: string | null; createdAt: string; updatedAt: string;
  items: InvoiceItem[];
  paymentMethod: 'CASH' | 'TRANSFER' | null; workShiftStatus: 'OPEN' | 'CLOSED';
  cashierId: string; cashierName: string; tableName: string | null;
}
export interface InvoiceSummary {
  id: string; invoiceCode: string; branchId: string; workShiftId: string; tableId: string | null;
  orderType: 'DINE_IN' | 'TAKEAWAY'; status: 'OPEN' | 'PAID' | 'CANCELLED'; totalAmount: number;
  itemCount: number; createdAt: string; workShiftStatus: 'OPEN' | 'CLOSED'; cashierId: string;
  cashierName: string; tableName: string | null; paymentMethod: 'CASH' | 'TRANSFER' | null;
}
export interface OpenInvoice {
  id: string; invoiceCode: string; branchId: string; tableId: string | null;
  orderType: 'DINE_IN' | 'TAKEAWAY'; status: 'OPEN'; totalAmount: number;
  itemCount: number; createdAt: string;
}
interface InvoicePage { data: OpenInvoice[]; meta: { limit: number; nextCursor: string | null; total: number } }
export interface PaymentPreview { invoiceId:string;subtotal:number;discountAmount:number;totalAmount:number;
  promotion:{code:string;applicable:boolean;reason:string|null}|null;warnings:{type:'NEGATIVE_STOCK'|'MISSING_RECIPE';ingredientId?:string;itemId?:string}[] }
export interface TransferAttempt {id:string;invoiceId:string;status:'PENDING'|'CANCELLED'|'PAID';amount:number;bankBin:string;accountNumber:string;
  accountName:string;transferReference:string;qrImageUrl:string|null;createdAt:string}
export interface BankTransferException {id:string;reason:string;amount:number;receivedAt:string;invoiceId:string}
export interface ExceptionPage {data:BankTransferException[];meta:{limit:number;nextCursor:string|null;total:number}}
export interface ManualInput {transactionRef:string;actualReceivedAmount:number;reason:string}
const keyed=(key:string)=>({'Idempotency-Key':key});
const id = encodeURIComponent;

export const salesService = {
  listOpen: (branchId?: string, cursor?: string) => request<InvoicePage>(
    `invoices?${new URLSearchParams({ status: 'OPEN', limit: '100', ...(branchId ? { branchId } : {}), ...(cursor ? { cursor } : {}) })}`,
    'GET', undefined, true, true),
  get: (invoiceId: string) => request<InvoiceDetail>(`invoices/${id(invoiceId)}`),
  create: (input: { orderType: 'DINE_IN' | 'TAKEAWAY'; tableId?: string }) =>
    request<InvoiceDetail>('invoices', 'POST', input),
  addItem: (invoiceId: string, input: { productSizeId: string; quantity: number; toppings?: { toppingId: string; quantity: number }[]; note?: string }) =>
    request<InvoiceDetail>(`invoices/${id(invoiceId)}/items`, 'POST', input),
  updateItem: (itemId: string, input: { quantity?: number; note?: string | null }) =>
    request<InvoiceDetail>(`invoice-items/${id(itemId)}`, 'PATCH', input),
  removeItem: (itemId: string) => request<void>(`invoice-items/${id(itemId)}`, 'DELETE'),
  transfer: (invoiceId: string, tableId: string) =>
    request<InvoiceDetail>(`invoices/${id(invoiceId)}/transfer-table`, 'POST', { tableId }),
  cancel: (invoiceId: string, reason: string) =>
    request<InvoiceDetail>(`invoices/${id(invoiceId)}/cancel`, 'POST', { reason }),
  paymentPreview:(invoiceId:string)=>request<PaymentPreview>(`invoices/${id(invoiceId)}/payment-preview`),
  applyPromotion:(invoiceId:string,code:string)=>request<InvoiceDetail>(`invoices/${id(invoiceId)}/apply-promotion`,'POST',{code}),
  removePromotion:(invoiceId:string)=>request<InvoiceDetail>(`invoices/${id(invoiceId)}/remove-promotion`,'POST'),
  payCash:(invoiceId:string,input:{method:'CASH';amount:number;tenderedAmount:number},key:string)=>
    request<{status:'PAID'}>(`invoices/${id(invoiceId)}/payments`,'POST',input,true,false,keyed(key)),
  completeZero:(invoiceId:string,key:string)=>request<void>(`invoices/${id(invoiceId)}/complete-zero`,'POST',undefined,true,false,keyed(key)),
  createTransferAttempt:(invoiceId:string,amount:number,key:string)=>request<TransferAttempt>(`invoices/${id(invoiceId)}/transfer-attempts`,'POST',{amount},true,false,keyed(key)),
  getPendingTransferAttempt:(invoiceId:string)=>request<TransferAttempt|null>(`invoices/${id(invoiceId)}/transfer-attempts`),
  cancelTransferAttempt:(attemptId:string)=>request<void>(`transfer-attempts/${id(attemptId)}/cancel`,'POST'),
  confirmTransferManually:(attemptId:string,input:ManualInput,key:string)=>request<{status:'PAID'}>(`transfer-attempts/${id(attemptId)}/confirm-manual`,'POST',input,true,false,keyed(key)),
  listBankTransferExceptions:(cursor?:string)=>request<ExceptionPage>(`bank-transfer-exceptions${cursor?'?'+new URLSearchParams({cursor}):''}`,'GET',undefined,true,true),
};
