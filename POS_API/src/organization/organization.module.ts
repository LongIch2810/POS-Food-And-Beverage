import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { BranchesController, DiningTablesController } from './http/organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [BranchesController, DiningTablesController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
