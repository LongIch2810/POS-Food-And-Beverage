import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { Branch } from './entities/branch.entity';
import { DiningTable } from './entities/dining-table.entity';
import { WorkShift } from '../shifts/entities/work-shift.entity';
import { CreateBranchDto, CreateTableDto, PatchBranchDto, PatchTableDto } from './http/organization.dto';
import { OrganizationPage, organizationPageResponse } from './organization.pagination';

const missing = () => httpError(404, 'NOT_FOUND', 'Không tìm thấy tài nguyên.');

function money(value: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0 || result > 1000000000000) {
    throw httpError(500, 'INTERNAL_ERROR', 'Dữ liệu tiền không hợp lệ.');
  }
  return result;
}

function branchView(branch: Branch) {
  return { id: branch.id, storeId: branch.store_id, code: branch.code, name: branch.name,
    address: branch.address, phone: branch.phone, initialCash: money(branch.initial_cash),
    isActive: branch.is_active, createdAt: branch.created_at, updatedAt: branch.updated_at };
}

function tableView(table: DiningTable) {
  return { id: table.id, branchId: table.branch_id, name: table.name, area: table.area,
    capacity: table.capacity, isActive: table.is_active, createdAt: table.created_at, updatedAt: table.updated_at };
}

@Injectable()
export class OrganizationService {
  constructor(private readonly db: DataSource) {}

  private async unique<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw httpError(409, 'CONFLICT', 'Mã hoặc tên đã được sử dụng trong phạm vi này.');
      }
      throw error;
    }
  }

  async branchInScope(manager: EntityManager, id: string, user: UserSummary, lock = false): Promise<Branch> {
    const query = manager.getRepository(Branch).createQueryBuilder('b')
      .where('b.id = :id AND b.store_id = :storeId', { id, storeId: user.storeId });
    if (!user.permissions.includes('branch.access_all')) query.andWhere('b.id = :branchId', { branchId: user.branchId });
    if (lock) query.setLock('pessimistic_read');
    const branch = await query.getOne();
    if (!branch) throw missing();
    return branch;
  }

  async listBranches(user: UserSummary, page: OrganizationPage) {
    const query = this.db.getRepository(Branch).createQueryBuilder('b').where('b.store_id = :storeId', { storeId: user.storeId });
    if (page.branchId) query.andWhere('b.id = :branchId', { branchId: page.branchId });
    const result = await organizationPageResponse(query, 'b', page, ['b.id AS id', 'b.store_id AS "storeId"',
      'b.code AS code', 'b.name AS name', 'b.address AS address', 'b.phone AS phone', 'b.initial_cash AS "initialCash"',
      'b.is_active AS "isActive"', 'b.created_at AS "createdAt"', 'b.updated_at AS "updatedAt"']);
    return { ...result, data: result.data.map(row => ({ ...row, initialCash: money(row.initialCash) })) };
  }

  async createBranch(user: UserSummary, input: CreateBranchDto) {
    return this.unique(async () => {
      const repo = this.db.getRepository(Branch);
      const branch = await repo.save(repo.create({ store_id: user.storeId!, code: input.code, name: input.name,
        address: input.address || null, phone: input.phone || null, initial_cash: String(input.initialCash ?? 0), is_active: true }));
      return branchView(branch);
    });
  }

  async patchBranch(user: UserSummary, id: string, input: PatchBranchDto) {
    return this.unique(() => this.db.transaction(async manager => {
      const repo = manager.getRepository(Branch);
      const query = repo.createQueryBuilder('b').where('b.id = :id AND b.store_id = :storeId', { id, storeId: user.storeId });
      if (!user.permissions.includes('branch.access_all')) query.andWhere('b.id = :branchId', { branchId: user.branchId });
      const branch = await query.setLock('pessimistic_write').getOne();
      if (!branch) throw missing();
      if (input.name !== undefined) branch.name = input.name;
      if (input.address !== undefined) branch.address = input.address || null;
      if (input.phone !== undefined) branch.phone = input.phone || null;
      // shortcut: chưa có ca trong PB-04; PB-06 phải kiểm tra lịch sử CASHIER dưới khóa Branch trước khi bật mở ca.
      if (input.initialCash !== undefined) {
        const hasCashierShift = await manager.getRepository(WorkShift).exist({
          where: { branch_id: branch.id, shift_type: 'CASHIER' },
        });
        if (hasCashierShift) {
          throw httpError(409, 'INITIAL_CASH_LOCKED', 'Không thể sửa quỹ ban đầu khi chi nhánh đã phát sinh ca thu ngân');
        }
        branch.initial_cash = String(input.initialCash);
      }
      if (input.isActive !== undefined) branch.is_active = input.isActive;
      return branchView(await repo.save(branch));
    }));
  }

  async listTables(user: UserSummary, page: OrganizationPage) {
    if (page.branchId) await this.branchInScope(this.db.manager, page.branchId, user);
    const query = this.db.getRepository(DiningTable).createQueryBuilder('t').innerJoin('t.branch', 'b')
      .where('b.store_id = :storeId', { storeId: user.storeId });
    if (page.branchId) query.andWhere('t.branch_id = :branchId', { branchId: page.branchId });
    return organizationPageResponse(query, 't', page, ['t.id AS id', 't.branch_id AS "branchId"', 't.name AS name',
      't.area AS area', 't.capacity AS capacity', 't.is_active AS "isActive"',
      't.created_at AS "createdAt"', 't.updated_at AS "updatedAt"']);
  }

  async createTable(user: UserSummary, input: CreateTableDto) {
    const allBranches = user.permissions.includes('branch.access_all');
    if ((allBranches && !input.branchId) || (!allBranches && input.branchId !== undefined) || (!allBranches && !user.branchId)) {
      throw httpError(422, 'VALIDATION_ERROR', 'Chi nhánh gửi lên không hợp lệ.');
    }
    return this.unique(() => this.db.transaction(async manager => {
      const branch = await this.branchInScope(manager, allBranches ? input.branchId! : user.branchId!, user, true);
      const repo = manager.getRepository(DiningTable);
      return tableView(await repo.save(repo.create({ branch_id: branch.id, name: input.name,
        area: input.area || null, capacity: input.capacity ?? null, is_active: true })));
    }));
  }

  async patchTable(user: UserSummary, id: string, input: PatchTableDto) {
    return this.unique(() => this.db.transaction(async manager => {
      const repo = manager.getRepository(DiningTable);
      const query = repo.createQueryBuilder('t').innerJoin('t.branch', 'b')
        .where('t.id = :id AND b.store_id = :storeId', { id, storeId: user.storeId });
      if (!user.permissions.includes('branch.access_all')) query.andWhere('t.branch_id = :branchId', { branchId: user.branchId });
      const table = await query.setLock('pessimistic_write', undefined, ['t']).getOne();
      if (!table) throw missing();
      if (input.name !== undefined) table.name = input.name;
      if (input.area !== undefined) table.area = input.area || null;
      if (input.capacity !== undefined) table.capacity = input.capacity;
      if (input.isActive !== undefined) table.is_active = input.isActive;
      return tableView(await repo.save(table));
    }));
  }
}
