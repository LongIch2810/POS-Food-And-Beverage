import { Body, Controller, Get, HttpCode, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AccessGuard, AuthenticatedRequest, RequirePermission } from '../auth/security/access.guard';
import { dataResponse } from '../http/api-response';
import { JsonBodyGuard, noInput, requestValidationPipe, validId } from '../http/request-validation';
import { CreateTransferAttemptDto, ManualConfirmationDto } from './http/payment.dto';
import { TransferAttemptsService } from './transfer-attempts.service';

@Controller('api/v1/invoices')
@UseGuards(AccessGuard)
export class InvoiceTransferAttemptsController {
  constructor(private readonly attempts:TransferAttemptsService){}

  @Get(':id/transfer-attempts')
  @RequirePermission('invoice.read')
  async get(@Req() request:AuthenticatedRequest,@Param('id') id:string) {
    noInput(request);
    const value=await this.attempts.getPendingTransferAttempt(request.authUser!,validId(id));
    if(value){const {replayed,...attempt}=value;return dataResponse(attempt);}
    return dataResponse(null);
  }

  @Post(':id/transfer-attempts')
  @UseGuards(JsonBodyGuard)
  @RequirePermission('pos.sell')
  async create(@Req() request:AuthenticatedRequest,@Param('id') id:string,
    @Body(requestValidationPipe) input:CreateTransferAttemptDto,@Res({passthrough:true}) response:Response) {
    const {replayed,...attempt}=await this.attempts.createTransferAttempt(request.authUser!,validId(id),input.amount,request.header('Idempotency-Key')??'');
    if(replayed)response.setHeader('Idempotent-Replay','true');
    return dataResponse(attempt);
  }
}

@Controller('api/v1/transfer-attempts')
@UseGuards(AccessGuard)
export class TransferAttemptsController {
  constructor(private readonly attempts:TransferAttemptsService){}

  @Post(':attemptId/confirm-manual')
  @UseGuards(JsonBodyGuard)
  @RequirePermission('transfer.confirm_manual')
  async confirm(@Req() request:AuthenticatedRequest,@Param('attemptId') attemptId:string,
    @Body(requestValidationPipe) input:ManualConfirmationDto,@Res({passthrough:true}) response:Response) {
    const {replayed,...payment}=await this.attempts.confirmTransferManually(request.authUser!,validId(attemptId),input,request.header('Idempotency-Key')??'');
    if(replayed)response.setHeader('Idempotent-Replay','true');
    return dataResponse(payment);
  }

  @Post(':attemptId/cancel')
  @RequirePermission('pos.sell')
  @HttpCode(204)
  async cancel(@Req() request:AuthenticatedRequest,@Param('attemptId') attemptId:string) {
    noInput(request);
    await this.attempts.cancelTransferAttempt(request.authUser!,validId(attemptId));
  }
}

@Controller('api/v1/bank-transfer-exceptions')
@UseGuards(AccessGuard)
export class BankTransferExceptionsController {
  constructor(private readonly attempts:TransferAttemptsService){}

  @Get()
  @RequirePermission('transfer.exception_read')
  async list(@Req() request:AuthenticatedRequest) {
    noInput(request,true);
    return this.attempts.listBankTransferExceptions(request.authUser!,request.query);
  }
}
