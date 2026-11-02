import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCategoryDto {
  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 })
  @Transform(trim)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ type: 'integer', minimum: 0, default: 0 })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class PatchCategoryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 })
  @Transform(trim)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ type: 'integer', minimum: 0 })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSizeDto {
  @ApiProperty({ maxLength: 20 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  name!: string;

  @ApiPropertyOptional({ type: 'integer', minimum: 0, default: 0 })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class PatchSizeDto {
  @ApiPropertyOptional({ maxLength: 20 })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  name?: string;

  @ApiPropertyOptional({ type: 'integer', minimum: 0 })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 1000 })
  @Transform(trim)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class PatchProductDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 1000 })
  @Transform(trim)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProductSizeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sizeId!: string;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: 1000000000000 })
  @IsInt()
  @Min(0)
  @Max(1000000000000)
  price!: number;
}

export class PatchProductSizeDto {
  @ApiPropertyOptional({ type: 'integer', minimum: 0, maximum: 1000000000000 })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000000000000)
  price?: number;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}

export class CreateToppingDto {
  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: 1000000000000 })
  @IsInt()
  @Min(0)
  @Max(1000000000000)
  price!: number;
}

export class PatchToppingDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ type: 'integer', minimum: 0, maximum: 1000000000000 })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000000000000)
  price?: number;

  @ApiPropertyOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}

export class LinkToppingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toppingId!: string;
}

