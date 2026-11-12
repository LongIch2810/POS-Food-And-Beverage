import { Controller, HttpCode, Post, Req } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { SePayWebhookService } from './sepay-webhook.service';

@Controller('api/v1/payments/sepay')
export class SePayWebhookController {
  constructor(private readonly webhooks:SePayWebhookService){}

  @Post('webhook')
  @HttpCode(200)
  async receive(@Req() request:RawBodyRequest<Request>) {
    await this.webhooks.processSePayWebhook(request.rawBody??Buffer.alloc(0),
      request.header('X-SePay-Signature')??'',request.header('X-SePay-Timestamp')??'');
    return {success:true};
  }
}
