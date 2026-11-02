import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { Response } from 'express';
import { AccessGuard, AuthenticatedRequest, RequirePermission } from '../../auth/security/access.guard';
import { dataResponse } from '../../http/api-response';
import { ApiErrors, ApiListQuery, dataSchema, listSchema, passwordSchema, PageMetaDto } from '../../http/response-docs';
import { JsonBodyGuard, noInput, requestValidationPipe, validId } from '../../http/request-validation';
import { organizationPage } from '../../organization/organization.pagination';
import { CreateOwnerDto, OwnerListItemDto, OwnerOutputDto } from '../../platform/http/platform.dto';
import { platformPage } from '../../platform/platform.pagination';
import { PlatformService } from '../../platform/platform.service';
import { UsersService } from '../users.service';
import { CreateStaffDto, PatchStaffDto } from './users.dto';
import { StaffOutputDto } from './users.response';

@Controller('api/v1/users')
@UseGuards(AccessGuard)
@ApiExtraModels(CreateOwnerDto, CreateStaffDto, StaffOutputDto, OwnerOutputDto, OwnerListItemDto, PageMetaDto)
@ApiErrors()
export class UsersController {
  constructor(private readonly users: UsersService, private readonly platform: PlatformService) {}

  @Get()
  @RequirePermission({ platform: 'user.read_owner', store: 'user.manage' })
  @ApiListQuery([
    { name: 'branchId', required: false, type: String, format: 'uuid', description: 'Chỉ context store.' },
    { name: 'role', required: false, enum: ['OWNER', 'MANAGER', 'CASHIER'], description: 'Platform bắt buộc OWNER; store chỉ MANAGER/CASHIER hoặc bỏ trống.' },
  ])
  @ApiResponse({ status: 200, schema: { anyOf: [listSchema(OwnerListItemDto), listSchema(StaffOutputDto)] } })
  async list(@Req() request: AuthenticatedRequest) {
    noInput(request, true);
    return request.authUser!.storeId === null
      ? this.platform.listOwners(platformPage(request.query, 'owners'))
      : this.users.listStaff(request.authUser!, organizationPage(request.query, 'staff', request.authUser!));
  }

  @Post()
  @RequirePermission({ platform: 'user.create_owner', store: 'user.manage' })
  @UseGuards(JsonBodyGuard)
  @ApiBody({ schema: { oneOf: [{ $ref: getSchemaPath(CreateOwnerDto) }, { $ref: getSchemaPath(CreateStaffDto) }] } })
  @ApiResponse({ status: 201, schema: { oneOf: [passwordSchema(OwnerOutputDto, 'owner'), passwordSchema(StaffOutputDto, 'user')] } })
  async create(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response, @Body() body: unknown) {
    const requestId = String(response.getHeader('X-Request-Id') ?? '');
    if (request.authUser!.storeId === null) {
      const input: CreateOwnerDto = await requestValidationPipe.transform(body, { type: 'body', metatype: CreateOwnerDto });
      validId(input.storeId);
      return dataResponse(await this.platform.addOwner(input, request.authUser!.id, requestId));
    }
    const input: CreateStaffDto = await requestValidationPipe.transform(body, { type: 'body', metatype: CreateStaffDto });
    return dataResponse(await this.users.createStaff(request.authUser!, input, requestId));
  }

  @Patch(':id')
  @RequirePermission('user.manage')
  @UseGuards(JsonBodyGuard)
  @ApiResponse({ status: 200, schema: dataSchema(StaffOutputDto) })
  async patch(@Param('id') id: string, @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response, @Body(requestValidationPipe) input: PatchStaffDto) {
    return dataResponse(await this.users.patchStaff(request.authUser!, validId(id), input, String(response.getHeader('X-Request-Id') ?? '')));
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @RequirePermission({ platform: 'user.reset_owner_password', store: 'user.manage' })
  @ApiResponse({ status: 200, schema: { oneOf: [passwordSchema(OwnerOutputDto, 'owner'), passwordSchema(StaffOutputDto, 'user')] } })
  async reset(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    noInput(request);
    const targetId = validId(id);
    const requestId = String(response.getHeader('X-Request-Id') ?? '');
    return dataResponse(request.authUser!.storeId === null
      ? await this.platform.resetOwnerPassword(targetId, request.authUser!.id, requestId)
      : await this.users.resetStaffPassword(request.authUser!, targetId, requestId));
  }
}
