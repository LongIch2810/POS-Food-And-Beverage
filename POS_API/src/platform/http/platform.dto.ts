import { HttpException, ValidationPipe } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsObject, IsString, MaxLength, ValidateIf, ValidateNested } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value;

export class OwnerInputDto {
  @ApiProperty({ maxLength: 50 })
  @Transform(trim)
  @IsString() @IsNotEmpty() @MaxLength(50)
  username!: string;

  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString() @IsNotEmpty() @MaxLength(150)
  fullName!: string;
}

export class CreateStoreDto {
  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString() @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString() @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString() @MaxLength(255)
  address?: string;

  @ApiProperty({ type: OwnerInputDto })
  @Type(() => OwnerInputDto)
  @IsDefined()
  @IsObject()
  @ValidateNested()
  owner!: OwnerInputDto;
}

export class CreateOwnerDto extends OwnerInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsString() @IsNotEmpty()
  storeId!: string;
}

export class SuspendStoreDto {
  @ApiProperty({ maxLength: 255 })
  @Transform(trim)
  @IsString() @IsNotEmpty() @MaxLength(255)
  reason!: string;
}

export class OwnerOutputDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) storeId!: string;
  @ApiProperty() username!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() mustChangePassword!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class OwnerListItemDto extends OwnerOutputDto {
  @ApiProperty() storeName!: string;
}

export const platformValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => new HttpException({
    code: 'VALIDATION_ERROR', message: 'Dữ liệu gửi lên không hợp lệ.',
    details: errors.map((error) => ({ location: 'body', field: error.property, message: 'Giá trị không hợp lệ.' })),
  }, 422),
});
