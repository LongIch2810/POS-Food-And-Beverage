import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateBranchDto {
  @ApiProperty({ minLength: 2, maxLength: 10 })
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(10)
  code!: string;

  @ApiProperty({ maxLength: 150 })
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255 })
  @Transform(trim) @ValidateIf((_, value) => value != null) @IsString() @MaxLength(255)
  address?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 20 })
  @Transform(trim) @ValidateIf((_, value) => value != null) @IsString() @MaxLength(20)
  phone?: string | null;

  @ApiPropertyOptional({ type: 'integer', minimum: 0, maximum: 1000000000000, default: 0 })
  @ValidateIf((_, value) => value !== undefined) @IsInt() @Min(0) @Max(1000000000000)
  initialCash?: number;
}

export class PatchBranchDto extends PartialType(OmitType(CreateBranchDto, ['code'] as const), { skipNullProperties: false }) {
  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined) @IsBoolean()
  isActive?: boolean;
}

export class CreateTableDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Bắt buộc với OWNER; MANAGER không gửi.' })
  @ValidateIf((_, value) => value !== undefined) @IsUUID()
  branchId?: string;

  @ApiProperty({ maxLength: 50 })
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 50 })
  @Transform(trim) @ValidateIf((_, value) => value != null) @IsString() @MaxLength(50)
  area?: string | null;

  @ApiPropertyOptional({ type: 'integer', nullable: true, minimum: 1, maximum: 2147483647 })
  @ValidateIf((_, value) => value != null) @IsInt() @Min(1) @Max(2147483647)
  capacity?: number | null;
}

export class PatchTableDto extends PartialType(OmitType(CreateTableDto, ['branchId'] as const), { skipNullProperties: false }) {
  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined) @IsBoolean()
  isActive?: boolean;
}
