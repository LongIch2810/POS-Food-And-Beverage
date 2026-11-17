import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { DataSource, EntityManager, In, IsNull, Not } from 'typeorm';
import { normalizeUsername } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Role } from '../auth/entities/role.entity';
import { Store } from './entities/store.entity';
import { User } from '../auth/entities/user.entity';
import { CreateOwnerDto, CreateStoreDto } from './http/platform.dto';
import { PlatformPage, platformPageResponse } from './platform.pagination';

function storeView(store: Store) {
  return { id: store.id, name: store.name, phone: store.phone, email: store.email, address: store.address,
    status: store.status, suspendedAt: store.suspended_at, suspendedReason: store.suspended_reason,
    createdAt: store.created_at, updatedAt: store.updated_at };
}

function ownerView(user: User) {
  return { id: user.id, storeId: user.store_id, username: user.username, fullName: user.full_name,
    isActive: user.is_active, mustChangePassword: user.must_change_password, createdAt: user.created_at };
}

@Injectable()
export class PlatformService {
  private readonly logger = new Logger('Platform');
  constructor(private readonly db: DataSource) {}

  private log(action: string, actorId: string, targetId: string, requestId: string): void {
    this.logger.log(`action=${action} actorId=${actorId} targetId=${targetId} requestId=${requestId}`);
  }

  private async createOwner(manager: EntityManager, input: { storeId: string; username: string; fullName: string }) {
    const role = await manager.getRepository(Role).findOneBy({ name: 'OWNER' });
    if (!role) throw httpError(503, 'SERVICE_UNAVAILABLE', 'Vai trò chủ cửa hàng chưa sẵn sàng.');
    const username = await normalizeUsername(manager, input.username);
    const temporaryPassword = randomBytes(18).toString('base64url');
    const owner = manager.getRepository(User).create({
      store_id: input.storeId, branch_id: null, role_id: role.id, username,
      full_name: input.fullName, password_hash: await bcrypt.hash(temporaryPassword, 12),
      must_change_password: true, is_active: true,
    });
    try {
      return { owner: await manager.getRepository(User).save(owner), temporaryPassword };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw httpError(409, 'USERNAME_EXISTS', 'Tên đăng nhập đã được sử dụng.');
      }
      throw error;
    }
  }

  async listStores(page: PlatformPage) {
    const total = await this.db.getRepository(Store).count();
    // QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()
    const query = this.db.getRepository(Store).createQueryBuilder('s');
    if (page.after) query.where('(s.created_at, s.id) < (:createdAt::timestamptz, :id::uuid)', page.after);
    const rows = await query.select(['s.id AS id', 's.name AS name', 's.phone AS phone', 's.email AS email',
      's.address AS address', 's.status AS status', 's.suspended_at AS "suspendedAt"',
      's.suspended_reason AS "suspendedReason"', 's.created_at AS "createdAt"', 's.updated_at AS "updatedAt"'])
      .addSelect("to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"')", 'cursorCreatedAt')
      .orderBy('s.created_at', 'DESC').addOrderBy('s.id', 'DESC').limit(page.limit + 1).getRawMany();
    return platformPageResponse(rows, page, 'stores', total);
  }

  async createStore(input: CreateStoreDto, actorId: string, requestId: string) {
    const result = await this.db.transaction(async (manager) => {
      const store = await manager.getRepository(Store).save(manager.getRepository(Store).create({
        name: input.name, phone: input.phone || null, email: input.email || null, address: input.address || null,
        status: 'ACTIVE', suspended_at: null, suspended_reason: null,
      }));
      const created = await this.createOwner(manager, { storeId: store.id, ...input.owner });
      return { store: storeView(store), owner: ownerView(created.owner), temporaryPassword: created.temporaryPassword };
    });
    this.log('store.create', actorId, result.store.id, requestId);
    this.log('owner.create', actorId, result.owner.id, requestId);
    return result;
  }

  async setStoreStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', reason: string | undefined,
    actorId: string, requestId: string) {
    const store = await this.db.transaction(async (manager) => {
      const repo = manager.getRepository(Store);
      const current = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!current) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy cửa hàng.');
      if (current.status === status) throw httpError(409, status === 'ACTIVE' ? 'STORE_ALREADY_ACTIVE' : 'STORE_ALREADY_SUSPENDED',
        'Cửa hàng đã ở trạng thái này.');
      current.status = status;
      current.suspended_at = status === 'SUSPENDED' ? new Date() : null;
      current.suspended_reason = status === 'SUSPENDED' ? reason! : null;
      const updated = await repo.save(current);
      if (status === 'SUSPENDED') {
        const userIds = (await manager.getRepository(User).find({ where: { store_id: id }, select: { id: true } })).map(u => u.id);
        await manager.getRepository(RefreshToken).update({ user_id: In(userIds), revoked_at: IsNull() }, { revoked_at: () => 'now()' });
      }
      return storeView(updated);
    });
    this.log(status === 'SUSPENDED' ? 'store.suspend' : 'store.reactivate', actorId, id, requestId);
    return store;
  }

  async listOwners(page: PlatformPage) {
    const total = await this.db.getRepository(User).count({ where: { role: { name: 'OWNER' }, store_id: Not(IsNull()) } });
    // QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()
    const query = this.db.getRepository(User).createQueryBuilder('u')
      .innerJoin('u.role', 'r', 'r.name = :role', { role: 'OWNER' })
      .innerJoin('u.store', 's');
    if (page.after) query.andWhere('(u.created_at, u.id) < (:createdAt::timestamptz, :id::uuid)', page.after);
    const rows = await query.select(['u.id AS id', 'u.store_id AS "storeId"', 'u.username AS username',
        'u.full_name AS "fullName"', 'u.is_active AS "isActive"',
        'u.must_change_password AS "mustChangePassword"', 'u.created_at AS "createdAt"',
        's.name AS "storeName"'])
      .addSelect("to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"')", 'cursorCreatedAt')
      .orderBy('u.created_at', 'DESC').addOrderBy('u.id', 'DESC')
      .limit(page.limit + 1).getRawMany();
    return platformPageResponse(rows, page, 'owners', total);
  }

  async addOwner(input: CreateOwnerDto, actorId: string, requestId: string) {
    const created = await this.db.transaction(async (manager) => {
      const store = await manager.getRepository(Store).findOneBy({ id: input.storeId });
      if (!store) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy cửa hàng.');
      return this.createOwner(manager, input);
    });
    this.log('owner.create', actorId, created.owner.id, requestId);
    return { owner: ownerView(created.owner), temporaryPassword: created.temporaryPassword };
  }

  async resetOwnerPassword(id: string, actorId: string, requestId: string) {
    const result = await this.db.transaction(async (manager) => {
      const user = (await manager.getRepository(User).find({ where: { id, role: { name: 'OWNER' } },
        relations: { role: true }, lock: { mode: 'pessimistic_write', tables: ['users'] } }))[0] ?? null;
      if (!user) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản chủ cửa hàng.');
      const temporaryPassword = randomBytes(18).toString('base64url');
      user.password_hash = await bcrypt.hash(temporaryPassword, 12);
      user.must_change_password = true;
      const owner = await manager.getRepository(User).save(user);
      await manager.getRepository(RefreshToken).update({ user_id: id, revoked_at: IsNull() }, { revoked_at: () => 'now()' });
      return { owner: ownerView(owner), temporaryPassword };
    });
    this.log('owner.reset_password', actorId, id, requestId);
    return result;
  }
}
