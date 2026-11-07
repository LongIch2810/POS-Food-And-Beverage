import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessGuard, AuthenticatedRequest, RequirePermission } from '../auth/security/access.guard';
import { dataResponse } from '../http/api-response';
import { JsonBodyGuard, noInput, requestValidationPipe, validId } from '../http/request-validation';
import { SalesService } from './sales.service';
import { AddInvoiceItemDto, CancelInvoiceDto, CreateInvoiceDto, PatchInvoiceItemDto, TransferTableDto } from './http/sales.dto';

@Controller('api/v1/invoices')
@UseGuards(AccessGuard, JsonBodyGuard)
export class InvoicesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @RequirePermission('invoice.read')
  async list(@Req() request: AuthenticatedRequest) {
    noInput(request, true);
    return this.sales.list(request.authUser!, request.query);
  }

  @Get(':id')
  @RequirePermission('invoice.read')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    noInput(request);
    return dataResponse(await this.sales.get(request.authUser!, validId(id)));
  }

  @Post()
  @RequirePermission('pos.sell')
  async create(@Req() request: AuthenticatedRequest, @Body(requestValidationPipe) input: CreateInvoiceDto) {
    return dataResponse(await this.sales.create(request.authUser!, input));
  }

  @Post(':id/items')
  @RequirePermission('pos.sell')
  async addItem(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body(requestValidationPipe) input: AddInvoiceItemDto) {
    return dataResponse(await this.sales.addItem(request.authUser!, validId(id), input));
  }

  @Post(':id/transfer-table')
  @RequirePermission('pos.sell')
  @HttpCode(200)
  async transfer(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body(requestValidationPipe) input: TransferTableDto) {
    return dataResponse(await this.sales.transfer(request.authUser!, validId(id), input.tableId));
  }

  @Post(':id/cancel')
  @RequirePermission('invoice.cancel_open')
  @HttpCode(200)
  async cancel(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body(requestValidationPipe) input: CancelInvoiceDto) {
    return dataResponse(await this.sales.cancel(request.authUser!, validId(id), input.reason));
  }
}

@Controller('api/v1/invoice-items')
@UseGuards(AccessGuard, JsonBodyGuard)
export class InvoiceItemsController {
  constructor(private readonly sales: SalesService) {}

  @Patch(':id')
  @RequirePermission('pos.sell')
  async patch(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body(requestValidationPipe) input: PatchInvoiceItemDto) {
    return dataResponse(await this.sales.patchItem(request.authUser!, validId(id), input));
  }

  @Delete(':id')
  @RequirePermission('pos.sell')
  @HttpCode(204)
  async remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    noInput(request);
    await this.sales.removeItem(request.authUser!, validId(id));
  }
}
