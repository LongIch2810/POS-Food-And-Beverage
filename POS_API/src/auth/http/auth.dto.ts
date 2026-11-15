import { HttpException, ValidationPipe } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: 'admin', maxLength: 50 })
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/^ +| +$/g, '') : value)
  @MinLength(1)
  @MaxLength(50)
  username!: string;

  @ApiProperty({ format: 'password', writeOnly: true })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ChangePasswordRequestDto {
  @ApiProperty({ format: 'password', minLength: 12, writeOnly: true,
    description: 'Ít nhất 12 ký tự và tối đa 72 byte UTF-8.' })
  @IsString()
  @MinLength(12)
  newPassword!: string;

  @ApiPropertyOptional({ format: 'password', writeOnly: true,
    description: 'Bắt buộc nếu tài khoản đã hoàn tất lần đổi mật khẩu đầu tiên.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  currentPassword?: string;
}

export class UserSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() role!: string;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) storeId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) branchId!: string | null;
  @ApiProperty({ type: [String] }) permissions!: string[];
  @ApiProperty() mustChangePassword!: boolean;
  @ApiProperty({ type: String, nullable: true }) branchName!: string | null;
}

export class UserDataDto {
  @ApiProperty({ type: UserSummaryDto }) user!: UserSummaryDto;
}

export class UserResponseDto {
  @ApiProperty({ type: UserDataDto }) data!: UserDataDto;
}

export class SessionDataDto extends UserDataDto {
  @ApiProperty({ example: 1800 }) expiresIn!: number;
}

export class SessionResponseDto {
  @ApiProperty({ type: SessionDataDto }) data!: SessionDataDto;
}

export const authValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => new HttpException({
    code: 'VALIDATION_ERROR',
    message: 'Dữ liệu gửi lên không hợp lệ.',
    details: errors.map((error) => ({ location: 'body', field: error.property,
      message: 'Giá trị không hợp lệ.' })),
  }, 422),
});
