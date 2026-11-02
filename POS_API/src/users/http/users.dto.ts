import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ maxLength: 50 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(50)
  username!: string;

  @ApiProperty({ maxLength: 150 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(150)
  fullName!: string;

  @ApiProperty({ enum: ['MANAGER', 'CASHIER'] })
  @IsIn(['MANAGER', 'CASHIER'])
  role!: 'MANAGER' | 'CASHIER';

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId!: string;
}

export class PatchStaffDto {
  @ApiPropertyOptional({ enum: ['MANAGER', 'CASHIER'] })
  @ValidateIf((_, value) => value !== undefined) @IsIn(['MANAGER', 'CASHIER'])
  role?: 'MANAGER' | 'CASHIER';

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined) @IsBoolean()
  isActive?: boolean;
}
