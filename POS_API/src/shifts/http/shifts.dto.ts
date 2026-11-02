import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class OpenShiftDto {
  @ApiProperty({ enum: ['CASHIER', 'STAFF'], description: 'Loại ca: CASHIER (có đối soát két) hoặc STAFF (chỉ ghi giờ)' })
  @Transform(trim)
  @IsString()
  @IsIn(['CASHIER', 'STAFF'])
  shiftType!: 'CASHIER' | 'STAFF';

  @ApiPropertyOptional({ format: 'uuid', description: 'Bắt buộc với OWNER (có branch.access_all); CASHIER/MANAGER tự lấy từ token' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ maxLength: 255, description: 'Ghi chú ca làm việc' })
  @Transform(trim)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(255)
  note?: string | null;
}

export class CloseShiftDto {
  @ApiPropertyOptional({ type: 'integer', minimum: 0, maximum: 1000000000000, description: 'Tiền đếm thực tế trong két (bắt buộc với ca CASHIER)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000000000)
  countedCash?: number;

  @ApiPropertyOptional({ maxLength: 255, description: 'Ghi chú đóng ca (bắt buộc nếu có chênh lệch tiền mặt)' })
  @Transform(trim)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(255)
  note?: string | null;
}

export class ForceCloseShiftDto {
  @ApiProperty({ type: 'integer', minimum: 0, maximum: 1000000000000, description: 'Tiền đếm thực tế trong két do quản lý kiểm kê' })
  @IsInt()
  @Min(0)
  @Max(1000000000000)
  countedCash!: number;

  @ApiProperty({ maxLength: 255, description: 'Lý do đóng cưỡng chế ca' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  @ApiPropertyOptional({ maxLength: 255, description: 'Ghi chú đóng ca' })
  @Transform(trim)
  @ValidateIf((_, value) => value != null)
  @IsString()
  @MaxLength(255)
  note?: string | null;
}

