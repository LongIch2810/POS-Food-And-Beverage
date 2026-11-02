import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { httpError } from '../../http/http-error';
import { AccessPermission, AuthService, UserSummary } from '../auth.service';
import { authCookie } from '../http/auth-cookie';

export type AuthenticatedRequest = Request & { authUser?: UserSummary };

export const RequirePermission = (code: AccessPermission) => SetMetadata('authPermission', code);

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = authCookie(request, '__Host-pos_access');
    const permission = this.reflector.getAllAndOverride<AccessPermission>('authPermission', [context.getHandler(), context.getClass()]);
    const isMutation = request.method !== 'GET' && request.method !== 'HEAD';
    if (isMutation && (!process.env.PUBLIC_ORIGIN || request.header('Origin') !== process.env.PUBLIC_ORIGIN)) {
      throw httpError(403, 'CSRF_INVALID', 'Phiên yêu cầu không hợp lệ. Vui lòng tải lại trang.');
    }
    request.authUser = permission
      ? await this.auth.authorizeAccess(token, permission,
        isMutation ? request.header('X-CSRF-Token') ?? '' : undefined,
        isMutation ? authCookie(request, '__Host-pos_csrf') ?? '' : undefined)
      : await this.auth.me(token);
    return true;
  }
}
