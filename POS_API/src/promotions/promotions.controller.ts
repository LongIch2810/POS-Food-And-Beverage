import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessGuard, AuthenticatedRequest, RequirePermission } from '../auth/security/access.guard';
import { JsonBodyGuard, noInput, validId } from '../http/request-validation';
import { dataResponse } from '../http/api-response';
import { PromotionsService } from './promotions.service';

@Controller('api/v1/promotion-codes')
@UseGuards(AccessGuard, JsonBodyGuard)
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  @RequirePermission('promotion.manage')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    noInput(request, true);
    return this.promotions.list(request.authUser!, query);
  }

  @Post()
  @RequirePermission('promotion.manage')
  async create(@Req() request: AuthenticatedRequest, @Body() body: Record<string, unknown>) {
    return dataResponse(await this.promotions.create(request.authUser!, body));
  }

  @Patch(':id')
  @RequirePermission('promotion.manage')
  async patch(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return dataResponse(await this.promotions.patch(request.authUser!, validId(id), body));
  }
}
