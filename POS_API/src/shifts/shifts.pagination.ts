import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { uuidPattern } from '../http/request-validation';

export interface ShiftsPage {
  limit: number;
  scope: string;
  branchId?: string;
  userId?: string;
  status?: 'OPEN' | 'CLOSED';
  shiftType?: 'CASHIER' | 'STAFF';
  after?: { createdAt: string; id: string };
}

const invalid = () => httpError(422, 'VALIDATION_ERROR', 'Tham số danh sách không hợp lệ.');

export function shiftsPage(query: Record<string, unknown>, user: UserSummary): ShiftsPage {
  const allowed = ['limit', 'cursor', 'sort', 'branchId', 'status', 'shiftType', 'userId'];
  if (Object.keys(query).some((key) => !allowed.includes(key)) || (query.sort !== undefined && query.sort !== '-createdAt')) {
    throw invalid();
  }

  const rawLimit = query.limit ?? '20';
  if (typeof rawLimit !== 'string' || !/^[1-9][0-9]{0,8}$/.test(rawLimit)) throw invalid();

  if (query.status !== undefined && query.status !== 'OPEN' && query.status !== 'CLOSED') {
    throw invalid();
  }

  if (query.shiftType !== undefined && query.shiftType !== 'CASHIER' && query.shiftType !== 'STAFF') {
    throw invalid();
  }

  const allBranches = user.permissions.includes('branch.access_all');
  const isManager = user.role === 'MANAGER';
  const isCashier = user.role === 'CASHIER';

  let effectiveBranchId: string | undefined;
  let effectiveUserId: string | undefined;

  if (isCashier) {
    // CASHIER chỉ xem ca của mình
    effectiveUserId = user.id;
    effectiveBranchId = user.branchId ?? undefined;
  } else if (isManager) {
    // MANAGER xem ca trong branch của mình
    effectiveBranchId = user.branchId ?? undefined;
    if (query.userId !== undefined) {
      if (typeof query.userId !== 'string' || !uuidPattern.test(query.userId)) throw invalid();
      effectiveUserId = query.userId;
    }
  } else if (allBranches) {
    // OWNER xem toàn store hoặc lọc theo branch
    if (query.branchId !== undefined) {
      if (typeof query.branchId !== 'string' || !uuidPattern.test(query.branchId)) throw invalid();
      effectiveBranchId = query.branchId;
    }
    if (query.userId !== undefined) {
      if (typeof query.userId !== 'string' || !uuidPattern.test(query.userId)) throw invalid();
      effectiveUserId = query.userId;
    }
  }

  const page: ShiftsPage = {
    limit: Math.min(Number(rawLimit), 100),
    scope: JSON.stringify([
      'work-shifts',
      user.storeId,
      effectiveBranchId ?? null,
      effectiveUserId ?? null,
      query.status ?? null,
      query.shiftType ?? null,
    ]),
    branchId: effectiveBranchId,
    userId: effectiveUserId,
    status: query.status as ShiftsPage['status'],
    shiftType: query.shiftType as ShiftsPage['shiftType'],
  };

  if (query.cursor === undefined) return page;
  if (typeof query.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,1024}$/.test(query.cursor)) throw invalid();

  try {
    const value = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
    if (
      value.scope !== page.scope ||
      typeof value.createdAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3,6}Z$/.test(value.createdAt) ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      new Date(value.createdAt).toISOString().slice(0, 19) !== value.createdAt.slice(0, 19) ||
      typeof value.id !== 'string' ||
      !uuidPattern.test(value.id)
    ) {
      throw invalid();
    }
    page.after = { createdAt: value.createdAt, id: value.id };
    return page;
  } catch {
    throw invalid();
  }
}
