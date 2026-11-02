import { ApiProperty } from '@nestjs/swagger';

export class StaffOutputDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) storeId!: string;
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty() username!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ enum: ['MANAGER', 'CASHIER'] }) role!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() mustChangePassword!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
