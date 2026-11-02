import { request } from '../http/client.ts';
import type { WorkShift, ShiftExpense } from '../types/entities.ts';

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
    return request<WorkShiftDto>('work-shifts', 'POST', input);
  },

  // Đóng ca tự thân
  async closeShift(
    shiftId: string,
    input: { countedCash?: number; note?: string }
  ): Promise<WorkShiftDto> {
    return request<WorkShiftDto>(`work-shifts/${encodeURIComponent(shiftId)}/close`, 'POST', input);
  },

  // Đóng cưỡng chế (Quản lý / Chủ quán)
  async forceCloseShift(
    shiftId: string,
    input: { countedCash: number; reason: string; note?: string }
  ): Promise<WorkShiftDto> {
    return request<WorkShiftDto>(`work-shifts/${encodeURIComponent(shiftId)}/force-close`, 'POST', input);
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

  // Tương thích ngược với UI demo / các màn chưa nối API
  getMyActiveShift(): WorkShift | undefined {
    return undefined;
  },

  addExpense(_shiftId: string, _amount: bigint, _reason: string, _paidFromDrawer: boolean): Promise<ShiftExpense> {
    return Promise.resolve({} as ShiftExpense);
  },
};
