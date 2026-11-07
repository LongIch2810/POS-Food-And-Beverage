import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { ApiErrorFilter } from './http/api-error.filter';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './http/health.controller';
import { PlatformModule } from './platform/platform.module';
import { OrganizationModule } from './organization/organization.module';
import { UsersModule } from './users/users.module';
import { MenuModule } from './menu/menu.module';
import { ShiftsModule } from './shifts/shifts.module';
import { SalesModule } from './sales/sales.module';

@Module({
  imports: [DatabaseModule, AuthModule, PlatformModule, OrganizationModule, UsersModule, MenuModule, ShiftsModule, SalesModule],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: ApiErrorFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(cookieParser(), (request: Request, response: Response, next: NextFunction) => {
      const suppliedId = request.header('X-Request-Id');
      const requestId = suppliedId && /^[a-zA-Z0-9-]{1,80}$/.test(suppliedId) ? suppliedId : randomUUID();
      response.setHeader('X-Request-Id', requestId);
      response.on('finish', () => Logger.log(`${request.method} ${request.path} ${response.statusCode} requestId=${requestId}`, 'HTTP'));
      next();
    }).forRoutes('*');
  }
}
