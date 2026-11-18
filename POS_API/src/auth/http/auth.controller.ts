import { Body, Controller, Get, HttpException, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiNoContentResponse, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { serialize } from 'cookie';
import { httpError } from '../../http/http-error';
import { AuthService } from '../auth.service';
import { dataResponse, EmptyResponseDto, ErrorResponseDto } from '../../http/api-response';
import { AccessGuard, AuthenticatedRequest } from '../security/access.guard';
import { authValidationPipe, ChangePasswordRequestDto, LoginRequestDto, SessionResponseDto, UserResponseDto } from './auth.dto';
import { AuthBodyGuard, LocalAuthGuard } from '../security/local-auth.guard';
import { authCookie } from './auth-cookie';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthThrottlerGuard } from '../../redis/auth-throttler.guard';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @UseGuards(AccessGuard)
  @ApiOkResponse({ type: UserResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 422, type: ErrorResponseDto })
  async me(@Req() request: AuthenticatedRequest): Promise<{ data: { user: NonNullable<AuthenticatedRequest['authUser']> } }> {
    this.noInput(request);
    return dataResponse({ user: request.authUser! });
  }

  @Get('csrf')
  @ApiOkResponse({ type: EmptyResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 422, type: ErrorResponseDto })
  async csrf(@Req() request: Request, @Res() response: Response): Promise<void> {
    this.noInput(request);
    const csrf = await this.auth.getCsrf(authCookie(request, '__Host-pos_refresh'));
    response.setHeader('Set-Cookie', serialize('__Host-pos_csrf', csrf, { secure: true, sameSite: 'strict', path: '/', maxAge: 604800 }));
    response.status(200).json(dataResponse({}));
  }

  @Post('logout')
  @ApiNoContentResponse()
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 422, type: ErrorResponseDto })
  async logout(@Req() request: Request, @Res() response: Response): Promise<void> {
    this.checkOrigin(request);
    this.noInput(request);
    await this.auth.logout(authCookie(request, '__Host-pos_refresh'), request.header('X-CSRF-Token'), authCookie(request, '__Host-pos_csrf'));
    response.setHeader('Set-Cookie', this.clearCookies());
    response.status(204).send();
  }

  @Post('change-password')
  @UseGuards(AuthBodyGuard)
  @ApiBody({ type: ChangePasswordRequestDto })
  @ApiNoContentResponse()
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 422, type: ErrorResponseDto })
  async changePassword(@Req() request: Request, @Res() response: Response,
    @Body(authValidationPipe) input: ChangePasswordRequestDto): Promise<void> {
    await this.auth.changePassword(authCookie(request, '__Host-pos_access'), request.header('X-CSRF-Token'), authCookie(request, '__Host-pos_csrf'),
      input.newPassword, input.currentPassword);
    response.setHeader('Set-Cookie', this.clearCookies());
    response.status(204).send();
  }

  private clearCookies(): string[] {
    return [
      serialize('__Host-pos_access', '', { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 0 }),
      serialize('__Host-pos_refresh', '', { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 0 }),
      serialize('__Host-pos_csrf', '', { secure: true, sameSite: 'strict', path: '/', maxAge: 0 }),
    ];
  }

  @Post('refresh')
  @UseGuards(AuthThrottlerGuard)
  @SkipThrottle({ login_ip: true, login_user: true })
  @ApiOkResponse({ type: SessionResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 422, type: ErrorResponseDto })
  @ApiResponse({ status: 429, type: ErrorResponseDto })
  async refresh(@Req() request: Request, @Res() response: Response): Promise<void> {
    this.checkOrigin(request);
    this.noInput(request);
    let session: Awaited<ReturnType<AuthService['refresh']>>;
    try {
      session = await this.auth.refresh(authCookie(request, '__Host-pos_refresh'), request.header('X-CSRF-Token'), authCookie(request, '__Host-pos_csrf'));
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 401) response.setHeader('Set-Cookie', this.clearCookies());
      throw error;
    }
    response.setHeader('Set-Cookie', [
      serialize('__Host-pos_access', session.access, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 1800 }),
      serialize('__Host-pos_refresh', session.refresh, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 604800 }),
    ]);
    response.status(200).json(dataResponse({ expiresIn: 1800, user: session.user }));
  }

  private checkOrigin(request: Request): void {
    if (!process.env.PUBLIC_ORIGIN || request.header('Origin') !== process.env.PUBLIC_ORIGIN) {
      throw new HttpException({ code: 'CSRF_INVALID', message: 'Phiên yêu cầu không hợp lệ. Vui lòng tải lại trang.' }, 403);
    }
  }

  private noInput(request: Request): void {
    if (Object.keys(request.query).length || request.body !== undefined
      || Number(request.header('Content-Length')) > 0 || request.header('Transfer-Encoding')) {
      throw httpError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ.');
    }
  }

  @Post('login')
  @UseGuards(AuthThrottlerGuard, LocalAuthGuard)
  @SkipThrottle({ refresh_ip: true })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: SessionResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 422, type: ErrorResponseDto })
  @ApiResponse({ status: 429, type: ErrorResponseDto })
  async login(@Req() request: Request & { user: Awaited<ReturnType<AuthService['login']>> }, @Res() response: Response): Promise<void> {
    const session = request.user;
    response.setHeader('Set-Cookie', [
      serialize('__Host-pos_access', session.access, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 1800 }),
      serialize('__Host-pos_refresh', session.refresh, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 604800 }),
      serialize('__Host-pos_csrf', session.csrf, { secure: true, sameSite: 'strict', path: '/', maxAge: 604800 }),
    ]);
    response.status(200).json(dataResponse({ expiresIn: 1800, user: session.user }));
  }
}
