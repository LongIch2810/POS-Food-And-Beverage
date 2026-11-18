import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../database/database.module';
import { AccessGuard } from './security/access.guard';
import { AuthController } from './http/auth.controller';
import { AuthService } from './auth.service';
import { AuthBodyGuard, LocalAuthGuard } from './security/local-auth.guard';
import { LocalStrategy } from './security/local.strategy';
import { AuthThrottlerGuard } from '../redis/auth-throttler.guard';
import { throttlerStorage } from '../redis/throttler-storage';
import { normalizeUsername } from './auth.service';

// Limits can be tuned per environment; tests raise them so one machine can log in many times.
const limit = (name: string, fallback: number): number => Number(process.env[name]) || fallback;

@Module({
  imports: [DatabaseModule, PassportModule.register({ session: false }), ThrottlerModule.forRootAsync({
    imports: [DatabaseModule],
    inject: [DataSource],
    useFactory: (db: DataSource) => ({
      storage: throttlerStorage(),
      // Fixed-window counters; each route skips the throttlers it does not use with @SkipThrottle.
      throttlers: [
        { name: 'login_ip', ttl: 15 * 60 * 1000, limit: limit('THROTTLE_LOGIN_IP_LIMIT', 20) },
        { name: 'login_user', ttl: 15 * 60 * 1000, limit: limit('THROTTLE_LOGIN_USER_LIMIT', 10),
          getTracker: async (req) => typeof req.body?.username === 'string' ? normalizeUsername(db, req.body.username) : '' },
        { name: 'refresh_ip', ttl: 60 * 1000, limit: limit('THROTTLE_REFRESH_IP_LIMIT', 30) },
      ],
    }),
  })],
  controllers: [AuthController],
  providers: [AuthService, AuthThrottlerGuard, AccessGuard, AuthBodyGuard, LocalAuthGuard, LocalStrategy],
  exports: [AuthService, AccessGuard],
})
export class AuthModule {}
