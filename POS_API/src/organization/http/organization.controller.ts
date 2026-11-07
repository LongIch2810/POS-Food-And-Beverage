import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiExtraModels, ApiResponse } from '@nestjs/swagger';
import { AccessGuard, AuthenticatedRequest, RequirePermission } from '../../auth/security/access.guard';
import { dataResponse } from '../../http/api-response';
import { ApiErrors, ApiListQuery, dataSchema, listSchema, PageMetaDto } from '../../http/response-docs';
import { JsonBodyGuard, noInput, requestValidationPipe, validId } from '../../http/request-validation';
import { OrganizationService } from '../organization.service';
import { organizationPage } from '../organization.pagination';
import { CreateBranchDto, CreateTableDto, PatchBranchDto, PatchTableDto } from './organization.dto';
import { BranchOutputDto, TableOutputDto } from './organization.response';

@Controller('api/v1/branches')
@UseGuards(AccessGuard, JsonBodyGuard)
@ApiExtraModels(BranchOutputDto, PageMetaDto)
@ApiErrors()
export class BranchesController {
  constructor(private readonly organization: OrganizationService) {}

  @Get()
  @RequirePermission('branch.read')
  @ApiListQuery()
  @ApiResponse({ status: 200, schema: listSchema(BranchOutputDto) })
  async list(@Req() request: AuthenticatedRequest) {
    noInput(request, true);
    return this.organization.listBranches(request.authUser!, organizationPage(request.query, 'branches', request.authUser!));
  }

  @Post()
  @RequirePermission('branch.manage')
  @ApiResponse({ status: 201, schema: dataSchema(BranchOutputDto) })
  async create(@Req() request: AuthenticatedRequest, @Body(requestValidationPipe) input: CreateBranchDto) {
    return dataResponse(await this.organization.createBranch(request.authUser!, input));
  }

  @Patch(':id')
  @RequirePermission('branch.manage')
  @ApiResponse({ status: 200, schema: dataSchema(BranchOutputDto) })
  async patch(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body(requestValidationPipe) input: PatchBranchDto) {
    return dataResponse(await this.organization.patchBranch(request.authUser!, validId(id), input));
  }
}

@Controller('api/v1/dining-tables')
@UseGuards(AccessGuard, JsonBodyGuard)
@ApiExtraModels(TableOutputDto, PageMetaDto)
@ApiErrors()
export class DiningTablesController {
  constructor(private readonly organization: OrganizationService) {}

  @Get()
  @RequirePermission('table.read')
  @ApiListQuery([{ name: 'branchId', required: false, type: String, format: 'uuid', description: 'OWNER lọc; MANAGER bị ép về chi nhánh mình.' }])
  @ApiResponse({ status: 200, schema: listSchema(TableOutputDto) })
  async list(@Req() request: AuthenticatedRequest) {
    noInput(request, true);
    return this.organization.listTables(request.authUser!, organizationPage(request.query, 'tables', request.authUser!));
  }

  @Post()
  @RequirePermission('table.manage')
  @ApiResponse({ status: 201, schema: dataSchema(TableOutputDto) })
  async create(@Req() request: AuthenticatedRequest, @Body(requestValidationPipe) input: CreateTableDto) {
    return dataResponse(await this.organization.createTable(request.authUser!, input));
  }

  @Patch(':id')
  @RequirePermission('table.manage')
  @ApiResponse({ status: 200, schema: dataSchema(TableOutputDto) })
  async patch(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body(requestValidationPipe) input: PatchTableDto) {
    return dataResponse(await this.organization.patchTable(request.authUser!, validId(id), input));
  }
}
