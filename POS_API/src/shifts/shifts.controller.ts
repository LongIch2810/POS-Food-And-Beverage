import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessGuard, AuthenticatedRequest, RequirePermission } from '../auth/security/access.guard';
import { dataResponse } from '../http/api-response';
import { JsonBodyGuard, noInput, requestValidationPipe, validId } from '../http/request-validation';
import { ShiftsService } from './shifts.service';
import { CloseShiftDto, ForceCloseShiftDto, OpenShiftDto } from './http/shifts.dto';

@Controller('api/v1/work-shifts')
@UseGuards(AccessGuard, JsonBodyGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('current')
  @RequirePermission('shift.read')
  async getCurrentShift(@Req() request: AuthenticatedRequest) {
    noInput(request, true);
    const shift = await this.shiftsService.getCurrentShift(request.authUser!);
    return dataResponse(shift);
  }

  @Get('opening-cash-info')
  @RequirePermission('shift.open')
  async getOpeningCashInfo(@Req() request: AuthenticatedRequest) {
    noInput(request, true);
    const branchId = typeof request.query.branchId === 'string' ? request.query.branchId : undefined;
    const info = await this.shiftsService.getExpectedOpeningCash(request.authUser!, branchId);
    return dataResponse(info);
  }

  @Get()
  @RequirePermission('shift.read')
  async listShifts(@Req() request: AuthenticatedRequest) {
    return this.shiftsService.listShifts(request.authUser!, request.query);
  }

  @Get(':id')
  @RequirePermission('shift.read')
  async getShiftDetail(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    noInput(request, true);
    const shift = await this.shiftsService.getShiftDetail(request.authUser!, validId(id));
    return dataResponse(shift);
  }

  @Post()
  @RequirePermission('shift.open')
  @HttpCode(201)
  async openShift(@Req() request: AuthenticatedRequest, @Body(requestValidationPipe) input: OpenShiftDto) {
    const shift = await this.shiftsService.openShift(request.authUser!, input);
    return dataResponse(shift);
  }

  @Post(':id/close')
  @RequirePermission('shift.close')
  @HttpCode(200)
  async closeShift(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body(requestValidationPipe) input: CloseShiftDto,
  ) {
    const shift = await this.shiftsService.closeShift(request.authUser!, validId(id), input);
    return dataResponse(shift);
  }

  @Post(':id/force-close')
  @RequirePermission('shift.force_close')
  @HttpCode(200)
  async forceCloseShift(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body(requestValidationPipe) input: ForceCloseShiftDto,
  ) {
    const shift = await this.shiftsService.forceCloseShift(request.authUser!, validId(id), input);
    return dataResponse(shift);
  }
}

