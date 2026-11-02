import { ApiProperty } from '@nestjs/swagger';

export class BranchOutputDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) storeId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) address!: string | null;
  @ApiProperty({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ minimum: 0, maximum: 1000000000000, type: 'integer' }) initialCash!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class TableOutputDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) branchId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) area!: string | null;
  @ApiProperty({ type: 'integer', nullable: true, minimum: 1, maximum: 2147483647 }) capacity!: number | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
