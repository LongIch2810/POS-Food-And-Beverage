import { HttpException, Inject, Injectable } from '@nestjs/common';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { DataSource, EntityManager } from 'typeorm';
import { httpError } from '../http/http-error';
import { AuthRateEvent } from './entities/auth-rate-event.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Store } from '../platform/entities/store.entity';
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

export type AccessPermission = string | { platform: string; store: string };

type AccessClaims = jwt.JwtPayload & { sub: string; sid: string };

export const tokenHash = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}

  private async userById(id: string): Promise<User | null> {
    return this.db.getRepository(User).createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'r')
      .leftJoinAndSelect('u.store', 's')
      .where('u.id = :id', { id })
      .getOne();
  }

  private async summary(user: User): Promise<UserSummary> {
    const rolePermissions = await this.db.getRepository(RolePermission).createQueryBuilder('rp')
      .innerJoinAndSelect('rp.permission', 'p')
      .where('rp.role_id = :roleId', { roleId: user.role_id })
      .orderBy('p.code', 'ASC')
      .getMany();

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
    const row = await manager.getRepository(AuthRateEvent).createQueryBuilder('e')
      .select('count(*)::int', 'count')
      .addSelect('min(e.occurred_at)', 'oldest')
      .where('e.scope = :scope AND e.key_hash = :key AND e.occurred_at > now() - (:seconds * interval \'1 second\')', {
        scope,
        key,
        seconds,
      })
      .getRawOne<{ count: number; oldest: string | null }>();

    if (row && row.count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((new Date(row.oldest!).getTime() + seconds * 1000 - Date.now()) / 1000));
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
      await manager.getRepository(AuthRateEvent).createQueryBuilder()
        .delete()
        .where("occurred_at < now() - interval '15 minutes'")
        .execute();
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
      await this.checkRate(manager, 'refresh_ip', key, 30, 60);
      await this.recordRate(manager, 'refresh_ip', key);
    });
  }

  async login(username: string, password: string, ip: string, userAgent?: string): Promise<{ user: UserSummary; access: string; refresh: string; csrf: string }> {
    const [{ username: normalized }] = await this.db.query('SELECT lower(btrim($1::text)) AS username', [username]);
    const keys = [this.rateKey('login_ip', ip), this.rateKey('login_username', normalized)];
    const sessionId = randomUUID();
    const refresh = randomBytes(32).toString('base64url');
    const outcome = await this.db.transaction(async (manager) => {
      await manager.getRepository(AuthRateEvent).createQueryBuilder()
        .delete()
        .where("occurred_at < now() - interval '15 minutes'")
        .execute();
      for (const key of [...keys].sort()) await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
      await this.checkRate(manager, 'login_ip', keys[0], 5, 900);
      await this.checkRate(manager, 'login_username', keys[1], 5, 900);

      const identity = await manager.getRepository(User).createQueryBuilder('u')
        .select('u.id')
        .where('u.username = :username', { username: normalized })
        .setLock('pessimistic_write')
        .getOne();
      // Đọc quan hệ sau khi lấy khóa để role đổi trong lúc chờ không làm JOIN dùng snapshot cũ.
      const user = identity ? await manager.getRepository(User).createQueryBuilder('u')
        .innerJoinAndSelect('u.role', 'r')
        .leftJoinAndSelect('u.store', 's')
        .where('u.id = :id', { id: identity.id })
        .getOne() : null;

      const matches = !bcrypt.truncates(password) && await bcrypt.compare(
        password,
        user?.password_hash ?? '$2b$12$u4II0P7LcnkphS2i0FfA7uN9lNZhpF.pQZwQlJS9GGWZrFYW7L5kK',
      );
      const store = user?.store_id ? await manager.getRepository(Store).createQueryBuilder('s')
        .where('s.id = :id', { id: user.store_id }).setLock('pessimistic_read').getOne() : null;
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
    return { user: await this.summary(outcome), access, refresh, csrf };
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

    const active = await this.db.getRepository(RefreshToken).createQueryBuilder('rt')
      .where('rt.user_id = :userId AND rt.session_id = :sessionId AND rt.revoked_at IS NULL AND rt.expires_at > now()', {
        userId: claims.sub,
        sessionId: claims.sid,
      })
      .select('rt.id')
      .getOne();

    if (!active) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    const user = await this.userById(claims.sub);
    if (!user) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    if (!user.is_active) throw httpError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị khóa.');
    if (user.store?.status === 'SUSPENDED') throw httpError(403, 'STORE_SUSPENDED', 'Cửa hàng đang tạm khóa.');
    return { user, claims };
  }

  async me(token?: string): Promise<UserSummary> {
    const { user } = await this.authenticateAccess(token);
    return this.summary(user);
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

  async refresh(token: string | undefined, csrfHeader: string | undefined, csrfCookie: string | undefined): Promise<{ user: UserSummary; access: string; refresh: string }> {
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

      await userRepo.createQueryBuilder('u')
        .where('u.id = :id', { id: metadata.user_id })
        .setLock('pessimistic_write')
        .select('u.id')
        .getOne();

      const userForStore = await userRepo.findOne({ where: { id: metadata.user_id }, select: ['store_id'] });
      const store = userForStore?.store_id ? await manager.getRepository(Store).createQueryBuilder('s')
        .where('s.id = :id', { id: userForStore.store_id }).setLock('pessimistic_read').getOne() : null;

      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [metadata.session_id]);

      const row = await rtRepo.createQueryBuilder('rt')
        .innerJoinAndSelect('rt.user', 'u')
        .innerJoinAndSelect('u.role', 'r')
        .leftJoinAndSelect('u.store', 's')
        .where('rt.token_hash = :tokenHash', { tokenHash: hash })
        .setLock('pessimistic_write', undefined, ['rt'])
        .getOne();

      if (!row) return { kind: 'invalid' as const };
      this.checkCsrf(row.session_id, csrfHeader, csrfCookie);

      if (row.replaced_at) {
        await rtRepo.createQueryBuilder()
          .update(RefreshToken)
          .set({ revoked_at: () => 'COALESCE(revoked_at, now())' })
          .where('session_id = :sessionId', { sessionId: row.session_id })
          .execute();
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
    return { user: await this.summary(result.user), access, refresh: nextToken };
  }

  async getCsrf(token?: string): Promise<string> {
    if (!token) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
    const hash = tokenHash(token);
    const row = await this.db.getRepository(RefreshToken).createQueryBuilder('rt')
      .innerJoinAndSelect('rt.user', 'u')
      .leftJoinAndSelect('u.store', 's')
      .where('rt.token_hash = :hash AND rt.revoked_at IS NULL AND rt.expires_at > now()', { hash })
      .getOne();

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

      await userRepo.createQueryBuilder('u')
        .where('u.id = :id', { id: metadata.user_id })
        .setLock('pessimistic_write')
        .select('u.id')
        .getOne();

      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [metadata.session_id]);

      const row = await rtRepo.createQueryBuilder('rt')
        .where('rt.token_hash = :hash', { hash })
        .setLock('pessimistic_write')
        .getOne();

      if (!row || row.expires_at <= new Date() || (row.revoked_at && !row.replaced_at)) return;
      if (row.replaced_at && !await rtRepo.createQueryBuilder('rt')
        .where('rt.session_id = :sessionId AND rt.revoked_at IS NULL AND rt.expires_at > now()', { sessionId: row.session_id })
        .getExists()) return;
      this.checkCsrf(row.session_id, csrfHeader, csrfCookie);

      await rtRepo.createQueryBuilder()
        .update(RefreshToken)
        .set({ revoked_at: new Date() })
        .where('session_id = :sessionId AND revoked_at IS NULL', { sessionId: row.session_id })
        .execute();
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

      const current = await userRepo.createQueryBuilder('u')
        .comment('SELECT u.password_hash')
        .leftJoinAndSelect('u.store', 's')
        .where('u.id = :id', { id: user.id })
        .setLock('pessimistic_write', undefined, ['u'])
        .getOne();

      if (!current) throw httpError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');

      const session = await rtRepo.createQueryBuilder('rt')
        .where('rt.user_id = :userId AND rt.session_id = :sessionId AND rt.revoked_at IS NULL AND rt.expires_at > now()', {
          userId: user.id,
          sessionId: claims.sid,
        })
        .select('rt.id')
        .getOne();

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
      await rtRepo.createQueryBuilder()
        .update(RefreshToken)
        .set({ revoked_at: new Date() })
        .where('user_id = :userId AND revoked_at IS NULL', { userId: user.id })
        .execute();
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
