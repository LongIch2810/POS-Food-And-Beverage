import { request } from '../http/client.ts';
import { getRequestIdentity } from '../auth/session-events.ts';

export interface ShiftExpenseDto {
  id: string;
  workShiftId: string;
  amount: number;
  reason: string;
  paidFromDrawer: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ShiftExpensesResponse {
  data: ShiftExpenseDto[];
  meta: { limit: number; nextCursor: string | null; total: number };
}

const notifyShiftChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('pos-shift-changed'));
};

export interface ShiftReconciliationDto {
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

export interface WorkShiftDto {
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
  reconciliation?: ShiftReconciliationDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftsListResponse {
  data: WorkShiftDto[];
  meta: {
    limit: number;
    nextCursor: string | null;
    total: number;
  };
}

export interface ShiftQuery {
  limit?: number;
  cursor?: string;
  branchId?: string;
  userId?: string;
  status?: 'OPEN' | 'CLOSED';
  shiftType?: 'CASHIER' | 'STAFF';
}

export const shiftService = {
  // Lấy ca đang OPEN của người dùng hiện tại từ API
  async getCurrentShift(): Promise<WorkShiftDto | null> {
    return request<WorkShiftDto | null>('work-shifts/current');
  },

  // Lấy thông tin tiền đầu ca tự động cho chi nhánh (BR-55, BR-89)
  async getOpeningCashInfo(branchId?: string): Promise<{
    amount: number;
    source: string;
    sourceText: string;
  }> {
    const params = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return request(`work-shifts/opening-cash-info${params}`);
  },

  // Mở ca làm việc (STAFF hoặc CASHIER)
  async openShift(input: {
    shiftType: 'CASHIER' | 'STAFF';
    branchId?: string;
    note?: string;
  }): Promise<WorkShiftDto> {
    const shift = await request<WorkShiftDto>('work-shifts', 'POST', input);
    notifyShiftChanged();
    return shift;
  },

  // Đóng ca tự thân
  async closeShift(
    shiftId: string,
    input: { countedCash?: number; note?: string }
  ): Promise<WorkShiftDto> {
    const epoch = getRequestIdentity().epoch;
    const shift = await request<WorkShiftDto>(`work-shifts/${encodeURIComponent(shiftId)}/close`, 'POST', input);
    if (epoch === getRequestIdentity().epoch) notifyShiftChanged();
    return shift;
  },

  // Đóng cưỡng chế (Quản lý / Chủ quán)
  async forceCloseShift(
    shiftId: string,
    input: { countedCash: number; reason: string; note?: string }
  ): Promise<WorkShiftDto> {
    const epoch = getRequestIdentity().epoch;
    const shift = await request<WorkShiftDto>(`work-shifts/${encodeURIComponent(shiftId)}/force-close`, 'POST', input);
    if (epoch === getRequestIdentity().epoch) notifyShiftChanged();
    return shift;
  },

  // Lấy chi tiết ca
  async getShiftDetail(shiftId: string): Promise<WorkShiftDto> {
    return request<WorkShiftDto>(`work-shifts/${encodeURIComponent(shiftId)}`);
  },

  // Lấy danh sách ca phân trang
  async getShifts(query: ShiftQuery = {}): Promise<ShiftsListResponse> {
    const params = new URLSearchParams({ limit: String(query.limit ?? 20) });
    for (const [key, value] of Object.entries(query)) {
      if (key !== 'limit' && value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    }
    return request<ShiftsListResponse>(`work-shifts?${params}`, 'GET', undefined, true, true);
  },

  // Helper cho nhân viên điểm danh vào ca
  async checkInStaffShift(branchId?: string): Promise<WorkShiftDto> {
    return this.openShift({ shiftType: 'STAFF', branchId });
  },

  // Helper cho nhân viên tan ca
  async checkOutStaffShift(shiftId: string): Promise<WorkShiftDto> {
    return this.closeShift(shiftId, {});
  },

  // Helper cho thu ngân đóng ca đếm mù
  async closeShiftBlind(shiftId: string, countedCash: number | bigint, note?: string): Promise<WorkShiftDto> {
    return this.closeShift(shiftId, { countedCash: Number(countedCash), note });
  },

  addExpense(shiftId: string, amount: number, reason: string, paidFromDrawer: boolean): Promise<ShiftExpenseDto> {
    return request(`work-shifts/${encodeURIComponent(shiftId)}/expenses`, 'POST', { amount, reason, paidFromDrawer }, false);
  },

  getExpenses(shiftId: string, query: { limit?: number; cursor?: string } = {}): Promise<ShiftExpensesResponse> {
    const params = new URLSearchParams({ limit: String(query.limit ?? 20), sort: '-createdAt' });
    if (query.cursor !== undefined) params.set('cursor', query.cursor);
    return request(`work-shifts/${encodeURIComponent(shiftId)}/expenses?${params}`, 'GET', undefined, true, true);
  },
};
