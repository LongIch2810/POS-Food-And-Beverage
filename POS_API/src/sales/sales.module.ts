import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { InvoiceItemsController, InvoicesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({ imports: [AuthModule, DatabaseModule], controllers: [InvoicesController, InvoiceItemsController], providers: [SalesService] })
export class SalesModule {}
