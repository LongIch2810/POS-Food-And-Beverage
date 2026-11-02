import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { OrganizationModule } from '../organization/organization.module';
import { PlatformModule } from '../platform/platform.module';
import { UsersController } from './http/users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, DatabaseModule, OrganizationModule, PlatformModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
