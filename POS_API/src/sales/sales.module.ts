import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { InvoiceItemsController, InvoicesController } from './sales.controller';
import { SalesService } from './sales.service';
import { StoreBankAccountController } from './store-bank-account.controller';
import { StoreBankAccountService } from './store-bank-account.service';
import { BankTransferExceptionsController, InvoiceTransferAttemptsController, TransferAttemptsController } from './transfer-attempts.controller';
import { TransferAttemptsService } from './transfer-attempts.service';
import { SePayWebhookController } from './sepay-webhook.controller';
import { SePayWebhookService } from './sepay-webhook.service';

@Module({ imports: [AuthModule, DatabaseModule], controllers: [InvoicesController, InvoiceItemsController, StoreBankAccountController,
  InvoiceTransferAttemptsController, TransferAttemptsController, BankTransferExceptionsController, SePayWebhookController], providers: [SalesService, StoreBankAccountService, TransferAttemptsService, SePayWebhookService] })
export class SalesModule {}
