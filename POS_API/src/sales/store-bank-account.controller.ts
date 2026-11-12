import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AccessGuard, AuthenticatedRequest, RequirePermission } from '../auth/security/access.guard';
import { dataResponse } from '../http/api-response';
import { JsonBodyGuard, noInput, requestValidationPipe } from '../http/request-validation';
import { StoreBankAccountDto } from './http/payment.dto';
import { StoreBankAccountService } from './store-bank-account.service';

@Controller('api/v1/store-bank-account')
@UseGuards(AccessGuard)
export class StoreBankAccountController {
  constructor(private readonly accounts:StoreBankAccountService){}

  @Get()
  @RequirePermission('invoice.read')
  async get(@Req() request:AuthenticatedRequest) {
    noInput(request);
    return dataResponse(await this.accounts.get(request.authUser!));
  }

  @Patch()
  @UseGuards(JsonBodyGuard)
  @RequirePermission('store_bank_account.manage')
  async update(@Req() request:AuthenticatedRequest,@Body(requestValidationPipe) input:StoreBankAccountDto) {
    return dataResponse(await this.accounts.update(request.authUser!,input));
  }
}
