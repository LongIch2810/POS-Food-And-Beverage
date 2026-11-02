export interface CashReconciliationResponse {
  id: string;
  workShiftId: string;
  openingCash: number;
  cashSalesAmount: number | null;
  expenseAmount: number | null;
  expectedCash: number | null;
  countedCash: number | null;
  difference: number | null;
  status: 'PENDING' | 'MATCHED' | 'SHORTAGE' | 'OVERAGE';
  note: string | null;
  reconciledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkShiftResponse {
  id: string;
  branchId: string;
  branchName?: string;
  userId: string;
  userName?: string;
  shiftType: 'CASHIER' | 'STAFF';
  startedAt: string;
  endedAt: string | null;
  status: 'OPEN' | 'CLOSED';
  closedBy: string | null;
  closedByName?: string | null;
  note: string | null;
  reconciliation?: CashReconciliationResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftsListResponse {
  data: WorkShiftResponse[];
  meta: {
    limit: number;
    nextCursor: string | null;
    total: number;
  };
}

