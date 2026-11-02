import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Role } from '../auth/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import { httpError } from '../http/http-error';
import { OrganizationPage, organizationPageResponse } from '../organization/organization.pagination';
import { OrganizationService } from '../organization/organization.service';
import { CreateStaffDto, PatchStaffDto } from './http/users.dto';

const roleLevels: Record<string, number> = { OWNER: 2, MANAGER: 1, CASHIER: 0 };

function assertLowerRole(actor: UserSummary, role: string): void {
  // BR-83 kiểm tra thứ bậc của việc gán role sau khi guard đã xác minh permission.
  if ((roleLevels[actor.role] ?? -1) <= (roleLevels[role] ?? -1)) {
    throw httpError(403, 'PERMISSION_DENIED', 'Chỉ được cấp vai trò thấp hơn vai trò của mình.');
  }
}

function staffView(user: User) {
  return { id: user.id, storeId: user.store_id, branchId: user.branch_id, username: user.username,
    fullName: user.full_name, role: user.role!.name, isActive: user.is_active,
    mustChangePassword: user.must_change_password, createdAt: user.created_at, updatedAt: user.updated_at };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger('Users');
  constructor(private readonly db: DataSource, private readonly organization: OrganizationService) {}

  private log(action: string, actor: UserSummary, id: string, requestId: string) {
    this.logger.log(`action=${action} actorId=${actor.id} targetId=${id} requestId=${requestId}`);
  }

  private async staff(manager: EntityManager, actor: UserSummary, id: string): Promise<User> {
    const query = manager.getRepository(User).createQueryBuilder('u').select('u.id')
      .where('u.id = :id AND u.store_id = :storeId', { id, storeId: actor.storeId });
    if (!actor.permissions.includes('branch.access_all')) query.andWhere('u.branch_id = :branchId', { branchId: actor.branchId });
    const identity = await query.setLock('pessimistic_write').getOne();
    // Đọc role sau khi lấy khóa để mutation đang chờ dùng quan hệ đã commit mới nhất.
    const user = identity ? await manager.getRepository(User).createQueryBuilder('u').innerJoinAndSelect('u.role', 'r')
      .where('u.id = :id AND r.name IN (:...roles)', { id: identity.id, roles: ['MANAGER', 'CASHIER'] }).getOne() : null;
    if (!user) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản nhân viên.');
    return user;
  }

  private async revoke(manager: EntityManager, id: string): Promise<void> {
    await manager.getRepository(RefreshToken).createQueryBuilder().update(RefreshToken)
      .set({ revoked_at: () => 'now()' }).where('user_id = :id AND revoked_at IS NULL', { id }).execute();
  }

  async listStaff(actor: UserSummary, page: OrganizationPage) {
    if (page.branchId) await this.organization.branchInScope(this.db.manager, page.branchId, actor);
    const query = this.db.getRepository(User).createQueryBuilder('u').innerJoin('u.role', 'r')
      .where('u.store_id = :storeId AND r.name IN (:...roles)', { storeId: actor.storeId, roles: ['MANAGER', 'CASHIER'] });
    if (page.branchId) query.andWhere('u.branch_id = :branchId', { branchId: page.branchId });
    if (page.role) query.andWhere('r.name = :role', { role: page.role });
    return organizationPageResponse(query, 'u', page, ['u.id AS id', 'u.store_id AS "storeId"', 'u.branch_id AS "branchId"',
      'u.username AS username', 'u.full_name AS "fullName"', 'r.name AS role', 'u.is_active AS "isActive"',
      'u.must_change_password AS "mustChangePassword"', 'u.created_at AS "createdAt"', 'u.updated_at AS "updatedAt"']);
  }

  async createStaff(actor: UserSummary, input: CreateStaffDto, requestId: string) {
    assertLowerRole(actor, input.role);
    let result;
    try {
      result = await this.db.transaction(async manager => {
        await this.organization.branchInScope(manager, input.branchId, actor, true);
        const role = await manager.getRepository(Role).findOneBy({ name: input.role });
        if (!role) throw httpError(503, 'SERVICE_UNAVAILABLE', 'Vai trò nhân viên chưa sẵn sàng.');
        const [{ username }] = await manager.query('SELECT lower(btrim($1::text)) AS username', [input.username]);
        const temporaryPassword = randomBytes(18).toString('base64url');
        const repo = manager.getRepository(User);
        const user = repo.create({ store_id: actor.storeId!, branch_id: input.branchId, role_id: role.id,
          username, full_name: input.fullName, password_hash: await bcrypt.hash(temporaryPassword, 12),
          must_change_password: true, is_active: true, phone: null, last_login_at: null });
        await repo.save(user);
        user.role = role;
        return { user: staffView(user), temporaryPassword };
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw httpError(409, 'USERNAME_EXISTS', 'Tên đăng nhập đã được sử dụng.');
      }
      throw error;
    }
    this.log('staff.create', actor, result.user.id, requestId);
    return result;
  }

  async patchStaff(actor: UserSummary, id: string, input: PatchStaffDto, requestId: string) {
    const result = await this.db.transaction(async manager => {
      const user = await this.staff(manager, actor, id);
      const roleChanged = input.role !== undefined && input.role !== user.role!.name;
      if (actor.id === user.id && (input.isActive === false
        || (roleChanged && roleLevels[input.role!] < roleLevels[user.role!.name]))) {
        throw httpError(403, 'PERMISSION_DENIED', 'Không được tự khóa hoặc tự hạ quyền tài khoản.');
      }
      const disabled = input.isActive === false && user.is_active;
      if (roleChanged) {
        assertLowerRole(actor, input.role!);
        const role = await manager.getRepository(Role).findOneBy({ name: input.role });
        if (!role) throw httpError(503, 'SERVICE_UNAVAILABLE', 'Vai trò nhân viên chưa sẵn sàng.');
        user.role_id = role.id;
        user.role = role;
      }
      if (input.isActive !== undefined) user.is_active = input.isActive;
      await manager.getRepository(User).save(user);
      if (roleChanged || disabled) await this.revoke(manager, id);
      return staffView(user);
    });
    this.log('staff.update', actor, id, requestId);
    return result;
  }

  async resetStaffPassword(actor: UserSummary, id: string, requestId: string) {
    const result = await this.db.transaction(async manager => {
      const user = await this.staff(manager, actor, id);
      const temporaryPassword = randomBytes(18).toString('base64url');
      user.password_hash = await bcrypt.hash(temporaryPassword, 12);
      user.must_change_password = true;
      await manager.getRepository(User).save(user);
      await this.revoke(manager, id);
      return { user: staffView(user), temporaryPassword };
    });
    this.log('staff.reset_password', actor, id, requestId);
    return result;
  }
}
