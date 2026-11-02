import { Body, Controller, Get, HttpCode, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { httpError } from '../../http/http-error';
import { AccessGuard, AuthenticatedRequest, RequirePermission } from '../../auth/security/access.guard';
import { dataResponse } from '../../http/api-response';
import { CreateStoreDto, platformValidationPipe, SuspendStoreDto } from './platform.dto';
import { PlatformService } from '../platform.service';
import { platformPage } from '../platform.pagination';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validId(id: string): string {
  if (!uuid.test(id)) throw httpError(422, 'VALIDATION_ERROR', 'Mã tài nguyên không hợp lệ.');
  return id;
}
function noInput(request: Request, query: boolean): void {
  if ((!query && Object.keys(request.query).length) || request.body !== undefined
    || Number(request.header('Content-Length')) > 0 || request.header('Transfer-Encoding')) {
    throw httpError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ.');
  }
}

function jsonInput(request: Request): void {
  if (Object.keys(request.query).length) throw httpError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ.');
  if (request.header('Content-Type')?.split(';')[0] !== 'application/json') {
    throw httpError(400, 'BAD_REQUEST', 'Yêu cầu không đọc được.');
  }
}

function requestId(response: Response): string { return String(response.getHeader('X-Request-Id') ?? ''); }

@Controller('api/v1/platform/stores')
@UseGuards(AccessGuard)
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermission('store.read')
  async list(@Req() request: Request) {
    noInput(request, true);
    return this.platform.listStores(platformPage(request.query, 'stores'));
  }

  @Post()
  @RequirePermission('store.create')
  @ApiBody({ type: CreateStoreDto })
  @ApiResponse({ status: 201 })
  async create(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response,
    @Body(platformValidationPipe) input: CreateStoreDto) {
    jsonInput(request);
    return dataResponse(await this.platform.createStore(input, request.authUser!.id, requestId(response)));
  }

  @Post(':id/suspend')
  @HttpCode(200)
  @RequirePermission('store.suspend')
  @ApiBody({ type: SuspendStoreDto })
  async suspend(@Param('id') id: string, @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response, @Body(platformValidationPipe) input: SuspendStoreDto) {
    jsonInput(request);
    return dataResponse({ store: await this.platform.setStoreStatus(validId(id), 'SUSPENDED', input.reason,
      request.authUser!.id, requestId(response)) });
  }

  @Post(':id/reactivate')
  @HttpCode(200)
  @RequirePermission('store.suspend')
  async reactivate(@Param('id') id: string, @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response) {
    noInput(request, false);
    return dataResponse({ store: await this.platform.setStoreStatus(validId(id), 'ACTIVE', undefined,
      request.authUser!.id, requestId(response)) });
  }
}
