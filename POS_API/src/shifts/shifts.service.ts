import { randomUUID } from 'node:crypto';
import { HttpException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, IsNull, Not } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { uuidPattern } from '../http/request-validation';
import { Branch } from '../organization/entities/branch.entity';
import { User } from '../auth/entities/user.entity';
import { WorkShift } from './entities/work-shift.entity';
import { CashReconciliation } from './entities/cash-reconciliation.entity';
import { ShiftExpense } from './entities/shift-expense.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { Payment } from '../sales/entities/payment.entity';
import { CloseShiftDto, CreateShiftExpenseDto, ForceCloseShiftDto, OpenShiftDto } from './http/shifts.dto';
import {
  CashReconciliationResponse,
  ShiftExpenseResponse,
  ShiftExpensesListResponse,
  ShiftsListResponse,
  WorkShiftResponse,
} from './http/shifts.response';
import { shiftsPage } from './shifts.pagination';

function toInt(value: string | number | null | undefined): number {
  return value != null ? Number(value) : 0;
}

function reconciliationView(r?: CashReconciliation | null): CashReconciliationResponse | null {
  if (!r) return null;
  return {
    id: r.id,
    workShiftId: r.work_shift_id,
    openingCash: toInt(r.opening_cash),
    cashSalesAmount: r.cash_sales_amount != null ? toInt(r.cash_sales_amount) : null,
    expenseAmount: r.expense_amount != null ? toInt(r.expense_amount) : null,
    expectedCash: r.expected_cash != null ? toInt(r.expected_cash) : null,
    countedCash: r.counted_cash != null ? toInt(r.counted_cash) : null,
    difference: r.difference != null ? toInt(r.difference) : null,
    status: r.status,
    note: r.note,
    reconciledAt: r.reconciled_at ? r.reconciled_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function expenseView(row: ShiftExpense): ShiftExpenseResponse {
  return {
    id: row.id,
    workShiftId: row.work_shift_id,
    amount: Number(row.amount),
    reason: row.reason,
    paidFromDrawer: row.paid_from_drawer,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

function shiftView(shift: WorkShift, reconciliation?: CashReconciliation | null): WorkShiftResponse {
  return {
    id: shift.id,
    branchId: shift.branch_id,
    branchName: shift.branch?.name,
    userId: shift.user_id,
    userName: shift.user?.full_name,
    shiftType: shift.shift_type,
    startedAt: shift.started_at.toISOString(),
    endedAt: shift.ended_at ? shift.ended_at.toISOString() : null,
    status: shift.status,
    closedBy: shift.closed_by,
    closedByName: shift.closed_by_user?.full_name ?? null,
    note: shift.note,
    reconciliation: reconciliationView(reconciliation ?? shift.reconciliation),
    createdAt: shift.created_at.toISOString(),
    updatedAt: shift.updated_at.toISOString(),
  };
}

@Injectable()
export class ShiftsService {
  constructor(private readonly db: DataSource) {}

  private async cashSales(manager: EntityManager, shiftId: string): Promise<bigint> {
    // QueryBuilder: SUM of money read as text; Repository.sum() returns a float
    const row = await manager.getRepository(Payment).createQueryBuilder('p')
      .innerJoin(Invoice, 'i', 'i.id = p.invoice_id')
      .select('COALESCE(SUM(p.amount), 0)::text', 'total')
      .where("i.work_shift_id = :shiftId AND i.status = 'PAID' AND p.method = 'CASH'", { shiftId })
      .getRawOne();
    return BigInt(row.total);
  }

  private async drawerExpenses(manager: EntityManager, shiftId: string): Promise<bigint> {
    // QueryBuilder: SUM of money read as text; Repository.sum() returns a float
    const row = await manager.getRepository(ShiftExpense).createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount), 0)::text', 'total')
      .where('e.work_shift_id = :shiftId AND e.paid_from_drawer = true', { shiftId })
      .getRawOne();
    return BigInt(row.total);
  }

  private async assertNoOpenInvoices(manager: EntityManager, shiftId: string): Promise<void> {
    const rows = await manager.getRepository(Invoice).find({
      where: { work_shift_id: shiftId, status: 'OPEN' },
      select: { id: true, invoice_code: true },
      order: { created_at: 'ASC', id: 'ASC' },
    });
    if (rows.length) throw new HttpException({ code: 'SHIFT_HAS_OPEN_INVOICES',
      message: 'Cần thanh toán hoặc hủy mọi đơn đang mở trước khi đóng ca.',
      details: rows.map(row => ({ invoiceCode: row.invoice_code })) }, 409);
  }

  private checkTenant(user: UserSummary) {
    if (!user.storeId) {
      throw httpError(403, 'PERMISSION_DENIED', 'PLATFORM_ADMIN không có quyền thao tác ca làm việc của cửa hàng');
    }
  }

  async getCurrentShift(user: UserSummary): Promise<WorkShiftResponse | null> {
    this.checkTenant(user);

    const shift = await this.db.getRepository(WorkShift).findOne({
      where: { user_id: user.id, status: 'OPEN' },
      relations: ['branch', 'user', 'reconciliation'],
    });

    if (!shift) return null;
    return shiftView(shift, shift.reconciliation);
  }

  // Xem trước tiền đầu ca tự động cho chi nhánh (BR-55, BR-89)
  async getExpectedOpeningCash(user: UserSummary, branchIdQuery?: string) {
    this.checkTenant(user);

    let branchId = user.branchId;
    if (user.permissions.includes('branch.access_all') && branchIdQuery) {
      branchId = branchIdQuery;
    }

    if (!branchId) {
      throw httpError(403, 'PERMISSION_DENIED', 'Tài khoản chưa được gán chi nhánh làm việc');
    }

    const branch = await this.db.getRepository(Branch).findOne({
      where: { id: branchId, store_id: user.storeId! },
    });

    if (!branch) {
      throw httpError(404, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại trong cửa hàng');
    }

    const lastShift = await this.db.getRepository(WorkShift).findOne({
      where: { branch_id: branch.id, shift_type: 'CASHIER', status: 'CLOSED' },
      relations: { reconciliation: true },
      order: { ended_at: 'DESC', created_at: 'DESC' },
    });

    if (lastShift?.reconciliation?.counted_cash != null) {
      return {
        amount: Number(lastShift.reconciliation.counted_cash),
        source: 'PREVIOUS_SHIFT',
        sourceText: 'Kế thừa từ tiền thực đếm của ca thu ngân trước (BR-89)',
      };
    }

    return {
      amount: Number(branch.initial_cash || 0),
      source: 'BRANCH_INITIAL_CASH',
      sourceText: 'Lấy từ quỹ tiền ban đầu của chi nhánh (BR-55)',
    };
  }

  async openShift(user: UserSummary, input: OpenShiftDto): Promise<WorkShiftResponse> {
    this.checkTenant(user);

    const allBranches = user.permissions.includes('branch.access_all');
    let branchId = user.branchId;

    if (allBranches) {
      if (!input.branchId) {
        throw httpError(400, 'BRANCH_ID_REQUIRED', 'Chủ cửa hàng (OWNER) phải chỉ định branchId khi mở ca');
      }
      branchId = input.branchId;
    } else if (!branchId) {
      throw httpError(403, 'PERMISSION_DENIED', 'Tài khoản chưa được gán chi nhánh làm việc');
    }

    return this.db.transaction(async (manager) => {
      // Tuần tự hóa mở ca của cùng người dùng ở các chi nhánh khác nhau.
      await manager.getRepository(User).findOneOrFail({
        where: { id: user.id, store_id: user.storeId! }, // checkTenant rejects an empty storeId
        lock: { mode: 'pessimistic_write' },
      });
      // 1. Khóa và kiểm tra chi nhánh
      const branch = await manager.getRepository(Branch).findOne({
        where: { id: branchId!, store_id: user.storeId! }, // branchId is set or rejected above
        lock: { mode: 'pessimistic_write' },
      });

      if (!branch) {
        throw httpError(404, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại trong cửa hàng');
      }
      if (!branch.is_active) {
        throw httpError(409, 'BRANCH_INACTIVE', 'Chi nhánh đang ngưng hoạt động');
      }

      // 2. Kiểm tra người dùng đã có ca mở nào chưa (BR-14)
      const userHasOpenShift = await manager.getRepository(WorkShift).exist({
        where: { user_id: user.id, status: 'OPEN' },
      });
      if (userHasOpenShift) {
        throw httpError(409, 'SHIFT_ALREADY_OPEN', 'Bạn đang có một ca làm việc chưa đóng');
      }

      let openingCash = '0';
      if (input.shiftType === 'CASHIER') {
        // 3. Kiểm tra chi nhánh đã có ca thu ngân đang mở chưa (BR-87)
        const branchHasOpenCashier = await manager.getRepository(WorkShift).exist({
          where: { branch_id: branch.id, status: 'OPEN', shift_type: 'CASHIER' },
        });
        if (branchHasOpenCashier) {
          throw httpError(409, 'BRANCH_CASHIER_SHIFT_OPEN', 'Chi nhánh hiện đang có một ca thu ngân khác đang mở');
        }

        // 4. Tính tiền đầu ca (BR-55, BR-89)
        const lastClosedShift = await manager.getRepository(WorkShift).findOne({
          where: { branch_id: branch.id, shift_type: 'CASHIER', status: 'CLOSED', reconciliation: { id: Not(IsNull()) } },
          relations: { reconciliation: true },
          order: { ended_at: 'DESC', created_at: 'DESC' },
        });

        if (lastClosedShift?.reconciliation?.counted_cash != null) {
          openingCash = lastClosedShift.reconciliation.counted_cash;
        } else {
          openingCash = branch.initial_cash;
        }
      }

      // 5. Tạo ca làm việc
      const shiftRepo = manager.getRepository(WorkShift);
      const shift = shiftRepo.create({
        branch_id: branch.id,
        user_id: user.id,
        shift_type: input.shiftType,
        started_at: new Date(),
        status: 'OPEN',
        note: input.note?.trim() || null,
      });

      const savedShift = await shiftRepo.save(shift);

      let savedReconciliation: CashReconciliation | null = null;
      if (input.shiftType === 'CASHIER') {
        const reconRepo = manager.getRepository(CashReconciliation);
        const reconciliation = reconRepo.create({
          work_shift_id: savedShift.id,
          opening_cash: openingCash,
          status: 'PENDING',
        });
        savedReconciliation = await reconRepo.save(reconciliation);
      }

      savedShift.branch = branch;
      return shiftView(savedShift, savedReconciliation);
    });
  }

  async closeShift(user: UserSummary, shiftId: string, input: CloseShiftDto): Promise<WorkShiftResponse> {
    this.checkTenant(user);

    return this.db.transaction(async (manager) => {
      const shiftLock = (await manager.getRepository(WorkShift).find({
        where: { id: shiftId, branch: { store_id: user.storeId! } }, // checkTenant rejects an empty storeId
        lock: { mode: 'pessimistic_write', tables: ['work_shifts'] }, // lock only work_shifts, not the joined branch
      }))[0] ?? null;

      if (!shiftLock) {
        throw httpError(404, 'SHIFT_NOT_FOUND', 'Ca làm việc không tồn tại');
      }

      const shift = await manager
        .getRepository(WorkShift)
        .findOne({
          where: { id: shiftId },
          relations: ['branch', 'reconciliation'],
        });

      if (!shift) {
        throw httpError(404, 'SHIFT_NOT_FOUND', 'Ca làm việc không tồn tại');
      }

      if (shift.status === 'CLOSED') {
        throw httpError(409, 'SHIFT_CLOSED', 'Ca làm việc đã được đóng từ trước');
      }

      if (shift.user_id !== user.id) {
        throw httpError(403, 'FORBIDDEN_NOT_SHIFT_OWNER', 'Chỉ người trực tiếp làm ca mới có quyền đóng ca của mình');
      }

      await this.assertNoOpenInvoices(manager, shift.id);

      const now = new Date();

      if (shift.shift_type === 'CASHIER') {
        if (input.countedCash == null || input.countedCash < 0) {
          throw httpError(400, 'COUNTED_CASH_REQUIRED', 'Ca thu ngân bắt buộc phải nhập số tiền thực tế trong két');
        }

        const reconciliation = shift.reconciliation;
        if (!reconciliation) {
          throw httpError(500, 'INTERNAL_ERROR', 'Không tìm thấy bản ghi đối soát của ca thu ngân');
        }

        const openingCash = BigInt(reconciliation.opening_cash);
        const cashSalesAmount = await this.cashSales(manager, shift.id);
        const expenseAmount = await this.drawerExpenses(manager, shift.id);
        const expectedCash = openingCash + cashSalesAmount - expenseAmount;
        const countedCash = BigInt(input.countedCash);
        const difference = countedCash - expectedCash;

        if (difference !== 0n && (!input.note || !input.note.trim())) {
          throw httpError(422, 'RECONCILIATION_NOTE_REQUIRED', 'Bắt buộc nhập ghi chú khi có chênh lệch tiền mặt lúc đóng ca');
        }

        reconciliation.cash_sales_amount = String(cashSalesAmount);
        reconciliation.expense_amount = String(expenseAmount);
        reconciliation.expected_cash = String(expectedCash);
        reconciliation.counted_cash = String(countedCash);
        reconciliation.difference = String(difference);
        reconciliation.status = difference === 0n ? 'MATCHED' : difference < 0n ? 'SHORTAGE' : 'OVERAGE';
        reconciliation.note = input.note?.trim() || null;
        reconciliation.reconciled_at = now;

        await manager.getRepository(CashReconciliation).save(reconciliation);
      }

      shift.status = 'CLOSED';
      shift.ended_at = now;
      shift.closed_by = user.id;
      if (input.note?.trim() && !shift.note) {
        shift.note = input.note.trim();
      }

      const updatedShift = await manager.getRepository(WorkShift).save(shift);
      return shiftView(updatedShift, shift.reconciliation);
    });
  }

  async forceCloseShift(user: UserSummary, shiftId: string, input: ForceCloseShiftDto): Promise<WorkShiftResponse> {
    this.checkTenant(user);

    if (!user.permissions.includes('shift.force_close')) {
      throw httpError(403, 'PERMISSION_DENIED', 'Bạn không có quyền đóng cưỡng chế ca làm việc');
    }

    return this.db.transaction(async (manager) => {
      const shiftLock = (await manager.getRepository(WorkShift).find({
        where: { id: shiftId, branch: { store_id: user.storeId! } }, // checkTenant rejects an empty storeId
        lock: { mode: 'pessimistic_write', tables: ['work_shifts'] }, // lock only work_shifts, not the joined branch
      }))[0] ?? null;

      if (!shiftLock) {
        throw httpError(404, 'SHIFT_NOT_FOUND', 'Ca làm việc không tồn tại');
      }

      const shift = await manager
        .getRepository(WorkShift)
        .findOne({
          where: { id: shiftId },
          relations: ['branch', 'reconciliation'],
        });

      if (!shift) {
        throw httpError(404, 'SHIFT_NOT_FOUND', 'Ca làm việc không tồn tại');
      }

      if (shift.status === 'CLOSED') {
        throw httpError(409, 'SHIFT_CLOSED', 'Ca làm việc đã được đóng từ trước');
      }

      const allBranches = user.permissions.includes('branch.access_all');
      if (!allBranches && shift.branch_id !== user.branchId) {
        throw httpError(403, 'PERMISSION_DENIED', 'Quản lý chỉ được đóng cưỡng chế ca trong chi nhánh của mình');
      }

      await this.assertNoOpenInvoices(manager, shift.id);

      if (input.countedCash == null || input.countedCash < 0) {
        throw httpError(400, 'COUNTED_CASH_REQUIRED', 'Đóng cưỡng chế bắt buộc quản lý phải đếm và nhập số tiền thực tế trong két');
      }

      const now = new Date();

      if (shift.shift_type === 'CASHIER') {
        const reconciliation = shift.reconciliation;
        if (!reconciliation) {
          throw httpError(500, 'INTERNAL_ERROR', 'Không tìm thấy bản ghi đối soát của ca thu ngân');
        }

        const openingCash = BigInt(reconciliation.opening_cash);
        const cashSalesAmount = await this.cashSales(manager, shift.id);
        const expenseAmount = await this.drawerExpenses(manager, shift.id);
        const expectedCash = openingCash + cashSalesAmount - expenseAmount;
        const countedCash = BigInt(input.countedCash);
        const difference = countedCash - expectedCash;

        reconciliation.cash_sales_amount = String(cashSalesAmount);
        reconciliation.expense_amount = String(expenseAmount);
        reconciliation.expected_cash = String(expectedCash);
        reconciliation.counted_cash = String(countedCash);
        reconciliation.difference = String(difference);
        reconciliation.status = difference === 0n ? 'MATCHED' : difference < 0n ? 'SHORTAGE' : 'OVERAGE';
        reconciliation.note = input.note?.trim() || input.reason.trim();
        reconciliation.reconciled_at = now;

        await manager.getRepository(CashReconciliation).save(reconciliation);
      }

      shift.status = 'CLOSED';
      shift.ended_at = now;
      shift.closed_by = user.id;
      shift.note = input.reason.trim();

      const updatedShift = await manager.getRepository(WorkShift).save(shift);
      return shiftView(updatedShift, shift.reconciliation);
    });
  }

  async addExpense(user: UserSummary, shiftId: string, input: CreateShiftExpenseDto): Promise<ShiftExpenseResponse> {
    this.checkTenant(user);
    const reason = input.reason;
    if (!reason) throw httpError(422, 'EXPENSE_REASON_REQUIRED', 'Cần nhập lý do chi.');

    return this.db.transaction(async (manager) => {
      const shift = (await manager.getRepository(WorkShift).find({
        where: { id: shiftId, branch: { store_id: user.storeId! } },
        select: { id: true, branch_id: true, user_id: true, shift_type: true, status: true },
        lock: { mode: 'pessimistic_write', tables: ['work_shifts'] },
      }))[0] ?? null;
      if (!shift || (!user.permissions.includes('branch.access_all') && shift.branch_id !== user.branchId)) {
        throw httpError(404, 'SHIFT_NOT_FOUND', 'Ca làm việc không tồn tại');
      }
      if (shift.status === 'CLOSED') throw httpError(409, 'SHIFT_CLOSED', 'Ca làm việc đã được đóng từ trước');
      if (shift.user_id !== user.id) {
        throw httpError(403, 'FORBIDDEN_NOT_SHIFT_OWNER', 'Chỉ người trực tiếp làm ca mới được ghi chi phí của ca.');
      }
      if (shift.shift_type !== 'CASHIER') throw httpError(409, 'CONFLICT', 'Ca này không có két');

      const paidFromDrawer = input.paidFromDrawer ?? true;
      if (paidFromDrawer) {
        const rec = await manager.getRepository(CashReconciliation).findOne({
          where: { work_shift_id: shift.id },
          select: { id: true, opening_cash: true },
        });
        if (!rec) throw httpError(500, 'INTERNAL_ERROR', 'Không tìm thấy bản ghi đối soát của ca thu ngân');
        const expected = BigInt(rec.opening_cash) + await this.cashSales(manager, shift.id)
          - await this.drawerExpenses(manager, shift.id) - BigInt(input.amount);
        if (expected < 0n) throw httpError(422, 'EXPENSE_EXCEEDS_DRAWER', 'Số tiền chi vượt quá tiền mặt hiện có trong két.');
      }

      const id = randomUUID();
      await manager.getRepository(ShiftExpense).insert({
        id, work_shift_id: shift.id, amount: String(input.amount), reason, paid_from_drawer: paidFromDrawer, created_by: user.id,
      });
      return expenseView(await manager.getRepository(ShiftExpense).findOneByOrFail({ id }));
    });
  }

  async listExpenses(user: UserSummary, shiftId: string, rawQuery: Record<string, unknown>): Promise<ShiftExpensesListResponse> {
    const invalid = () => httpError(422, 'VALIDATION_ERROR', 'Tham số danh sách không hợp lệ.');
    if (Object.keys(rawQuery).some((key) => !['limit', 'cursor', 'sort'].includes(key))
      || (rawQuery.sort !== undefined && rawQuery.sort !== '-createdAt')) throw invalid();
    const rawLimit = rawQuery.limit ?? '20';
    if (typeof rawLimit !== 'string' || !/^[1-9]\d{0,2}$/.test(rawLimit)) throw invalid();
    const limit = Math.min(Number(rawLimit), 100);
    if (rawQuery.cursor !== undefined && (typeof rawQuery.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,1024}$/.test(rawQuery.cursor))) {
      throw invalid();
    }

    const shift = await this.getShiftDetail(user, shiftId);
    let after: { createdAt: string; id: string } | null = null;
    if (typeof rawQuery.cursor === 'string') {
      try {
        const parsed = JSON.parse(Buffer.from(rawQuery.cursor, 'base64url').toString('utf8'));
        if (parsed.scope !== shift.id || typeof parsed.createdAt !== 'string' || !Number.isFinite(Date.parse(parsed.createdAt))
          || typeof parsed.id !== 'string' || !uuidPattern.test(parsed.id)) throw new Error();
        after = parsed;
      } catch { throw invalid(); }
    }

    // QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()
    const builder = this.db.getRepository(ShiftExpense).createQueryBuilder('e').where('e.work_shift_id = :shiftId', { shiftId: shift.id });
    if (after) builder.andWhere('(e.created_at, e.id) < (CAST(:createdAt AS timestamptz), CAST(:id AS uuid))', after);
    const { raw, entities } = await builder
      .addSelect(`to_char(e.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`, 'cursor_created_at')
      .orderBy('e.created_at', 'DESC').addOrderBy('e.id', 'DESC').limit(limit + 1).getRawAndEntities();
    const total = await this.db.getRepository(ShiftExpense).countBy({ work_shift_id: shift.id });
    const page = entities.slice(0, limit);
    const last = page[page.length - 1];
    return {
      data: page.map(expenseView),
      meta: {
        limit,
        nextCursor: entities.length > limit
          ? Buffer.from(JSON.stringify({ scope: shift.id, createdAt: raw[page.length - 1].cursor_created_at, id: last.id })).toString('base64url')
          : null,
        total,
      },
    };
  }

  async getShiftDetail(user: UserSummary, shiftId: string): Promise<WorkShiftResponse> {
    this.checkTenant(user);

    const shift = await this.db.getRepository(WorkShift).findOne({
      where: { id: shiftId, branch: { store_id: user.storeId! } },
      relations: { branch: true, user: true, closed_by_user: true, reconciliation: true },
    });

    if (!shift) {
      throw httpError(404, 'SHIFT_NOT_FOUND', 'Ca làm việc không tồn tại');
    }

    const allBranches = user.permissions.includes('branch.access_all');
    if (user.role === 'CASHIER' && shift.user_id !== user.id) {
      throw httpError(403, 'PERMISSION_DENIED', 'Thu ngân chỉ được xem ca làm của chính mình');
    }
    if (user.role === 'MANAGER' && !allBranches && shift.branch_id !== user.branchId) {
      throw httpError(403, 'PERMISSION_DENIED', 'Quản lý chỉ được xem ca trong chi nhánh của mình');
    }

    return shiftView(shift, shift.reconciliation);
  }

  async listShifts(user: UserSummary, rawQuery: Record<string, unknown>): Promise<ShiftsListResponse> {
    this.checkTenant(user);

    const page = shiftsPage(rawQuery, user);

    // QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()
    const query = this.db
      .getRepository(WorkShift)
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.branch', 'b')
      .leftJoinAndSelect('s.user', 'u')
      .leftJoinAndSelect('s.closed_by_user', 'cbu')
      .leftJoinAndSelect('s.reconciliation', 'r')
      .where('b.store_id = :storeId', { storeId: user.storeId });

    if (page.branchId) {
      query.andWhere('s.branch_id = :branchId', { branchId: page.branchId });
    }
    if (page.userId) {
      query.andWhere('s.user_id = :userId', { userId: page.userId });
    }
    if (page.status) {
      query.andWhere('s.status = :status', { status: page.status });
    }
    if (page.shiftType) {
      query.andWhere('s.shift_type = :shiftType', { shiftType: page.shiftType });
    }

    const total = await this.db.getRepository(WorkShift).count({
      where: {
        branch: { store_id: user.storeId! },
        ...(page.branchId ? { branch_id: page.branchId } : {}),
        ...(page.userId ? { user_id: page.userId } : {}),
        ...(page.status ? { status: page.status } : {}),
        ...(page.shiftType ? { shift_type: page.shiftType } : {}),
      },
    });

    if (page.after) {
      query.andWhere('(s.created_at, s.id) < (:createdAt::timestamptz, :id::uuid)', page.after);
    }

    const { entities, raw } = await query
      .addSelect(`to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`, 'cursorCreatedAt')
      .orderBy('s.created_at', 'DESC')
      .addOrderBy('s.id', 'DESC')
      .limit(page.limit + 1)
      .getRawAndEntities();

    const selected = entities.slice(0, page.limit);
    const last = selected.at(-1);

    let nextCursor: string | null = null;
    if (entities.length > page.limit && last) {
      const lastRaw = raw[selected.length - 1] as Record<string, unknown> | undefined;
      const cursorCreatedAt =
        typeof lastRaw?.cursorCreatedAt === 'string'
          ? (lastRaw.cursorCreatedAt as string)
          : typeof lastRaw?.s_cursorCreatedAt === 'string'
          ? (lastRaw.s_cursorCreatedAt as string)
          : last.created_at.toISOString();

      nextCursor = Buffer.from(
        JSON.stringify({ scope: page.scope, createdAt: cursorCreatedAt, id: last.id })
      ).toString('base64url');
    }

    return {
      data: selected.map((s) => shiftView(s, s.reconciliation)),
      meta: { limit: page.limit, nextCursor, total },
    };
  }
}
