import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse } from '@nestjs/swagger';
import { AccessGuard, AuthenticatedRequest } from '../auth/security/access.guard';
import { dataResponse } from '../http/api-response';
import { noInput } from '../http/request-validation';
import { ApiErrors, dataSchema } from '../http/response-docs';
import { RevenueQueryDto, RevenueReportDto, reportsQueryPipe } from './http/reports.dto';
import { ReportsService, reportLevel } from './reports.service';

@Controller('api/v1/reports')
@UseGuards(AccessGuard)
@ApiExtraModels(RevenueReportDto)
@ApiErrors()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // Permission is checked before query validation (reportLevel); scope is decided in the service from the identity.
  @Get('revenue')
  @ApiOkResponse({ schema: dataSchema(RevenueReportDto) })
  async getRevenue(@Req() request: AuthenticatedRequest) {
    noInput(request, true);
    const user = request.authUser!;
    reportLevel(user);
    const raw = { ...request.query };
    // Clients without branch.access_all cannot pick a branch; the value is dropped before validation.
    if (!user.permissions.includes('branch.access_all')) delete raw.branchId;
    const query = await reportsQueryPipe.transform(raw, { type: 'query', metatype: RevenueQueryDto }) as RevenueQueryDto;
    return dataResponse(await this.reports.getRevenue(user, query));
  }
}
