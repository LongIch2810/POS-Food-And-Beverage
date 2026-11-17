import { HttpException, Inject, Injectable } from '@nestjs/common';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { DataSource, EntityManager, IsNull, Raw } from 'typeorm';
import { httpError } from '../http/http-error';
import { AuthRateEvent } from './entities/auth-rate-event.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Store } from '../platform/entities/store.entity';
import { Branch } from '../organization/entities/branch.entity';
import { User } from './entities/user.entity';

export interface UserSummary {
  id: string;
  username: string;
  fullName: string;
  role: string;
  storeId: string | null;
  branchId: string | null;
  permissions: string[];
  mustChangePassword: boolean;
}

export interface SessionUser extends UserSummary { branchName: string | null; }

// Same rule as PostgreSQL btrim(): strips spaces only, never TAB (trim() would break stored usernames).
// shortcut: JS toLowerCase differs from PostgreSQL lower() for dotted capital I and Greek final sigma (test_ST3b_AC2b); upgrade to SQL lower(btrim()) if such usernames must log in with pre-refactor rows.
export function normalizeUsername(value: string): string {
  return value.replace(/^ +| +$/g, '').toLowerCase();
}

export type AccessPermission = string | { platform: string; store: string };

type AccessClaims = jwt.JwtPayload & { sub: string; sid: string };

export const tokenHash = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}

  private async userById(id: string): Promise<User | null> {
    return this.db.getRepository(User).findOne({ where: { id }, relations: { role: true, store: true } });
  }

  private async sessionUser(user: User): Promise<SessionUser> {
    const summary = await this.summary(user);
    if (!user.branch_id) return { ...summary, branchName: null };
    const row = await this.db.getRepository(Branch).findOne({ where: { id: user.branch_id }, select: { id: true, name: true } });
    return { ...summary, branchName: row?.name ?? null };
  }

  private async summary(user: User): Promise<UserSummary> {
    const rolePermissions = await this.db.getRepository(RolePermission).find({
      where: { role_id: user.role_id },
      relations: { permission: true },
      order: { permission: { code: 'ASC' } },
    });

    return {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role?.name ?? '',
      storeId: user.store_id,
      branchId: user.branch_id,
      permissions: rolePermissions.map((rp) => rp.permission!.code),
      mustChangePassword: user.must_change_password,
    };
  }

  private rateKey(scope: string, value: string): string {
    return createHmac('sha256', process.env.CSRF_SECRET!).update(`${scope}:${value}`).digest('hex');
  }

  private async checkRate(manager: EntityManager, scope: string, key: string, limit: number, seconds: number): Promise<void> {
    const repo = manager.getRepository(AuthRateEvent);
    const where = {
      scope,
      key_hash: key,
      occurred_at: Raw((a) => `${a} > now() - (:seconds * interval '1 second')`, { seconds }),
    };
    const count = await repo.count({ where });

    if (count >= limit) {
      const oldest = await repo.findOne({ where, select: { id: true, occurred_at: true }, order: { occurred_at: 'ASC' } });
      const retryAfter = oldest ? Math.max(1, Math.ceil((oldest.occurred_at.getTime() + seconds * 1000 - Date.now()) / 1000)) : 1; // oldest expired between the two reads
      throw new HttpException({ code: 'TOO_MANY_REQUESTS', message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.', retryAfter }, 429);
    }
  }

  private async recordRate(manager: EntityManager, scope: string, key: string): Promise<void> {
    const repo = manager.getRepository(AuthRateEvent);
    await repo.save(repo.create({ scope, key_hash: key }));
  }

  async recordRefreshAttempt(ip: string): Promise<void> {
    const key = this.rateKey('refresh_ip', ip);
    await this.db.transaction(async (manager) => {
      await manager.getRepository(AuthRateEvent).delete({ occurred_at: Raw((a) => `${a} < now() - interval '15 minutes'`) });
      // QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it
      await manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))', 'locked').fromDummy().setParameter('lockKey', key).getRawOne();
      await this.checkRate(manager, 'refresh_ip', key, 30, 60);
      await this.recordRate(manager, 'refresh_ip', key);
    });
  }

  async login(username: string, password: string, ip: string, userAgent?: string): Promise<{ user: SessionUser; access: string; refresh: string; csrf: string }> {
    const normalized = normalizeUsername(username);
    const keys = [this.rateKey('login_ip', ip), this.rateKey('login_username', normalized)];
    const sessionId = randomUUID();
    const refresh = randomBytes(32).toString('base64url');
    const outcome = await this.db.transaction(async (manager) => {
      await manager.getRepository(AuthRateEvent).delete({ occurred_at: Raw((a) => `${a} < now() - interval '15 minutes'`) });
      // QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it
      for (const key of [...keys].sort()) await manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))', 'locked').fromDummy().setParameter('lockKey', key).getRawOne();
      await this.checkRate(manager, 'login_ip', keys[0], 5, 900);
      await this.checkRate(manager, 'login_username', keys[1], 5, 900);

      const identity = await manager.getRepository(User).findOne({
        where: { username: normalized }, select: { id: true }, lock: { mode: 'pessimistic_write' },
      });
      // Đọc quan hệ sau khi lấy khóa để role đổi trong lúc chờ không làm JOIN dùng snapshot cũ.
      const user = identity ? await manager.getRepository(User).findOne({
        where: { id: identity.id }, relations: { role: true, store: true },
      }) : null;

      const matches = !bcrypt.truncates(password) && await bcrypt.compare(
        password,
        user?.password_hash ?? '$2b$12$u4II0P7LcnkphS2i0FfA7uN9lNZhpF.pQZwQlJS9GGWZrFYW7L5kK',
      );
      const store = user?.store_id ? await manager.getRepository(Store).findOne({
        where: { id: user.store_id }, lock: { mode: 'pessimistic_read' },
      }) : null;
      if (!matches || !user?.is_active || store?.status === 'SUSPENDED') {
        await this.recordRate(manager, 'login_ip', keys[0]);
        await this.recordRate(manager, 'login_username', keys[1]);
        return undefined;
      }

      const tokenRepo = manager.getRepository(RefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await tokenRepo.save(tokenRepo.create({
        user_id: user.id,
        session_id: sessionId,
        token_hash: tokenHash(refresh),
        expires_at: expiresAt,
        user_agent: userAgent?.slice(0, 255) ?? null,
      }));
      await manager.getRepository(User).update(user.id, { last_login_at: new Date() });
      return user;
    });

    if (!outcome) throw httpError(401, 'UNAUTHENTICATED', 'Tài khoản hoặc mật khẩu không chính xác.');
    const access = jwt.sign(
      { sid: sessionId, role: outcome.role!.name, storeId: outcome.store_id, branchId: outcome.branch_id },
      this.jwtSecret(),
      { algorithm: 'HS256', expiresIn: 1800, subject: outcome.id },
    );
    const csrf = this.csrf(sessionId);
    return { user: await this.sessionUser(outcome), access, refresh, csrf };
  }

  async authenticateAccess(token?: string): Promise<{ user: User; claims: AccessClaims }> {
    if (!token) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    let claims: AccessClaims;
    try {
      const verified = jwt.verify(token, this.jwtSecret(), { algorithms: ['HS256'] });
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (typeof verified === 'string' || typeof verified.sub !== 'string' || typeof verified.sid !== 'string'
        || !uuid.test(verified.sub) || !uuid.test(verified.sid) || typeof verified.role !== 'string'
        || !('storeId' in verified) || !('branchId' in verified) || typeof verified.iat !== 'number'
        || typeof verified.exp !== 'number') throw new Error('Invalid claims');
      claims = verified as AccessClaims;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) throw httpError(401, 'TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn.');
      throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    }

    const active = await this.db.getRepository(RefreshToken).findOne({
      where: { user_id: claims.sub, session_id: claims.sid, revoked_at: IsNull(), expires_at: Raw((a) => `${a} > now()`) },
      select: { id: true },
    });

    if (!active) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    const user = await this.userById(claims.sub);
    if (!user) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    if (!user.is_active) throw httpError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị khóa.');
    if (user.store?.status === 'SUSPENDED') throw httpError(403, 'STORE_SUSPENDED', 'Cửa hàng đang tạm khóa.');
    return { user, claims };
  }

  async me(token?: string): Promise<SessionUser> {
    const { user } = await this.authenticateAccess(token);
    return this.sessionUser(user);
  }

  async authorizeAccess(token: string | undefined, permission: AccessPermission, csrfHeader?: string, csrfCookie?: string): Promise<UserSummary> {
    const { user, claims } = await this.authenticateAccess(token);
    if (csrfHeader !== undefined || csrfCookie !== undefined) this.checkCsrf(claims.sid, csrfHeader, csrfCookie);
    if (user.must_change_password) throw httpError(403, 'PASSWORD_CHANGE_REQUIRED', 'Bạn cần đổi mật khẩu trước khi tiếp tục.');
    const summary = await this.summary(user);
    const required = typeof permission === 'string' ? permission
      : summary.storeId === null ? permission.platform : permission.store;
    const platformPermissions = new Set(['store.read', 'store.create', 'store.suspend',
      'user.read_owner', 'user.create_owner', 'user.reset_owner_password']);
    if ((summary.storeId === null && !platformPermissions.has(required))
      || (summary.storeId !== null && platformPermissions.has(required))
      || !summary.permissions.includes(required)) {
      throw httpError(403, 'PERMISSION_DENIED', 'Bạn không có quyền thực hiện thao tác này.');
    }
    return summary;
  }

  private checkCsrf(sessionId: string, header?: string, cookie?: string): void {
    if (!header || !cookie || header !== cookie) throw httpError(403, 'CSRF_INVALID', 'Phiên yêu cầu không hợp lệ. Vui lòng tải lại trang.');
    const [nonce, mac] = cookie.split('.');
    if (!nonce || !mac || !/^[A-Za-z0-9_-]+$/.test(nonce)) throw httpError(403, 'CSRF_INVALID', 'Phiên yêu cầu không hợp lệ. Vui lòng tải lại trang.');
    const secret = process.env.CSRF_SECRET!;
    const expected = createHmac('sha256', secret).update(`${sessionId}.${nonce}`).digest('base64url');
    const actualBytes = Buffer.from(mac);
    const expectedBytes = Buffer.from(expected);
    if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
      throw httpError(403, 'CSRF_INVALID', 'Phiên yêu cầu không hợp lệ. Vui lòng tải lại trang.');
    }
  }

  async refresh(token: string | undefined, csrfHeader: string | undefined, csrfCookie: string | undefined): Promise<{ user: SessionUser; access: string; refresh: string }> {
    if (!token) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    const nextToken = randomBytes(32).toString('base64url');
    const hash = tokenHash(token);

    const result = await this.db.transaction(async (manager) => {
      const rtRepo = manager.getRepository(RefreshToken);
      const userRepo = manager.getRepository(User);

      const metadata = await rtRepo.findOne({
        where: { token_hash: hash },
        select: ['id', 'user_id', 'session_id'],
      });
      if (!metadata) return { kind: 'invalid' as const };

      await userRepo.findOne({ where: { id: metadata.user_id }, select: { id: true }, lock: { mode: 'pessimistic_write' } });

      const userForStore = await userRepo.findOne({ where: { id: metadata.user_id }, select: ['store_id'] });
      const store = userForStore?.store_id ? await manager.getRepository(Store).findOne({
        where: { id: userForStore.store_id }, lock: { mode: 'pessimistic_read' },
      }) : null;

      // QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it
      await manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))', 'locked').fromDummy().setParameter('lockKey', metadata.session_id).getRawOne();

      // find()[0], not findOne(): findOne + relations adds a DISTINCT/LIMIT pre-query that cannot carry FOR UPDATE.
      const row = (await rtRepo.find({
        where: { token_hash: hash },
        relations: { user: { role: true, store: true } },
        lock: { mode: 'pessimistic_write', tables: ['refresh_tokens'] },
      }))[0] ?? null;

      if (!row) return { kind: 'invalid' as const };
      this.checkCsrf(row.session_id, csrfHeader, csrfCookie);

      if (row.replaced_at) {
        await rtRepo.update({ session_id: row.session_id }, { revoked_at: () => 'COALESCE(revoked_at, now())' });
        return { kind: 'replay' as const };
      }

      if (row.revoked_at || row.expires_at <= new Date()) return { kind: 'invalid' as const };
      if (!row.user!.is_active) return { kind: 'disabled' as const };
      if (store?.status === 'SUSPENDED') return { kind: 'suspended' as const };

      const now = new Date();
      await rtRepo.update(row.id, { revoked_at: now, replaced_at: now });

      const nextExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await rtRepo.save(rtRepo.create({
        user_id: row.user_id,
        session_id: row.session_id,
        token_hash: tokenHash(nextToken),
        expires_at: nextExpiresAt,
        user_agent: row.user_agent,
      }));

      return { kind: 'ok' as const, user: row.user!, sessionId: row.session_id };
    });

    if (result.kind !== 'ok') {
      if (result.kind === 'disabled') throw httpError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị khóa.');
      if (result.kind === 'suspended') throw httpError(403, 'STORE_SUSPENDED', 'Cửa hàng đang tạm khóa.');
      throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    }

    const access = jwt.sign(
      { sid: result.sessionId, role: result.user.role!.name, storeId: result.user.store_id, branchId: result.user.branch_id },
      this.jwtSecret(),
      { algorithm: 'HS256', expiresIn: 1800, subject: result.user.id },
    );
    return { user: await this.sessionUser(result.user), access, refresh: nextToken };
  }

  async getCsrf(token?: string): Promise<string> {
    if (!token) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    const hash = tokenHash(token);
    const row = await this.db.getRepository(RefreshToken).findOne({
      where: { token_hash: hash, revoked_at: IsNull(), expires_at: Raw((a) => `${a} > now()`) },
      relations: { user: { store: true } },
    });

    if (!row) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    if (!row.user!.is_active) throw httpError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị khóa.');
    if (row.user!.store?.status === 'SUSPENDED') throw httpError(403, 'STORE_SUSPENDED', 'Cửa hàng đang tạm khóa.');
    return this.csrf(row.session_id);
  }

  async logout(token?: string, csrfHeader?: string, csrfCookie?: string): Promise<void> {
    if (!token) return;
    const hash = tokenHash(token);
    await this.db.transaction(async (manager) => {
      const rtRepo = manager.getRepository(RefreshToken);
      const userRepo = manager.getRepository(User);

      const metadata = await rtRepo.findOne({
        where: { token_hash: hash },
        select: ['id', 'user_id', 'session_id'],
      });
      if (!metadata) return;

      await userRepo.findOne({ where: { id: metadata.user_id }, select: { id: true }, lock: { mode: 'pessimistic_write' } });

      // QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it
      await manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))', 'locked').fromDummy().setParameter('lockKey', metadata.session_id).getRawOne();

      const row = await rtRepo.findOne({ where: { token_hash: hash }, lock: { mode: 'pessimistic_write' } });

      if (!row || row.expires_at <= new Date() || (row.revoked_at && !row.replaced_at)) return;
      if (row.replaced_at && !await rtRepo.exists({
        where: { session_id: row.session_id, revoked_at: IsNull(), expires_at: Raw((a) => `${a} > now()`) },
      })) return;
      this.checkCsrf(row.session_id, csrfHeader, csrfCookie);

      await rtRepo.update({ session_id: row.session_id, revoked_at: IsNull() }, { revoked_at: new Date() });
    });
  }

  async changePassword(accessToken: string | undefined, csrfHeader: string | undefined, csrfCookie: string | undefined,
    newPassword: string, currentPassword?: string): Promise<void> {
    const { user, claims } = await this.authenticateAccess(accessToken);
    this.checkCsrf(claims.sid, csrfHeader, csrfCookie);
    if (newPassword.length < 12 || bcrypt.truncates(newPassword)) {
      throw httpError(422, 'VALIDATION_ERROR', 'Mật khẩu mới không hợp lệ.');
    }

    await this.db.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const rtRepo = manager.getRepository(RefreshToken);

      // find()[0] for the same reason as in refresh; the comment is what the race test looks for in pg_stat_activity.
      const current = (await userRepo.find({
        where: { id: user.id },
        relations: { store: true },
        comment: 'SELECT u.password_hash',
        lock: { mode: 'pessimistic_write', tables: ['users'] },
      }))[0] ?? null;

      if (!current) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');

      const session = await rtRepo.findOne({
        where: { user_id: user.id, session_id: claims.sid, revoked_at: IsNull(), expires_at: Raw((a) => `${a} > now()`) },
        select: { id: true },
      });

      if (!session) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
      if (!current.is_active) throw httpError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị khóa.');
      if (current.store?.status === 'SUSPENDED') throw httpError(403, 'STORE_SUSPENDED', 'Cửa hàng đang tạm khóa.');

      if (!current.must_change_password) {
        if (!currentPassword) throw httpError(422, 'VALIDATION_ERROR', 'Cần nhập mật khẩu hiện tại.');
        if (!await bcrypt.compare(currentPassword, current.password_hash)) {
          throw httpError(401, 'CURRENT_PASSWORD_INVALID', 'Mật khẩu hiện tại không chính xác.');
        }
      }
      const hash = await bcrypt.hash(newPassword, 12);
      await userRepo.update(user.id, {
        password_hash: hash,
        must_change_password: false,
      });
      await rtRepo.update({ user_id: user.id, revoked_at: IsNull() }, { revoked_at: new Date() });
    });
  }

  private jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET is missing or invalid');
    return secret;
  }

  private csrf(sessionId: string): string {
    const secret = process.env.CSRF_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) throw new Error('CSRF_SECRET is missing or invalid');
    const nonce = randomBytes(32).toString('base64url');
    return `${nonce}.${createHmac('sha256', secret).update(`${sessionId}.${nonce}`).digest('base64url')}`;
  }
}
