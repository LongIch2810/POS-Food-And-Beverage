import { HttpException, ValidationPipe } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { uuidPattern } from '../../http/request-validation';
import { isCalendarDate } from '../reports.service';

@ValidatorConstraint({ name: 'calendarDate' })
class CalendarDate implements ValidatorConstraintInterface {
  validate(value: unknown): boolean { return typeof value === 'string' && isCalendarDate(value); }
  defaultMessage(args: ValidationArguments): string { return `${args.property} must be a calendar date`; }
}

const dateField = { description: 'Ngày lịch YYYY-MM-DD (giờ Việt Nam)', example: '2026-11-14', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };

export class RevenueQueryDto {
  @ApiProperty(dateField) @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) @Validate(CalendarDate) date!: string;
  @ApiProperty({ ...dateField, description: 'Ngày đầu biểu đồ; khoảng fromDate..toDate 1-31 ngày' }) @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) @Validate(CalendarDate) fromDate!: string;
  @ApiProperty({ ...dateField, description: 'Ngày cuối biểu đồ' }) @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) @Validate(CalendarDate) toDate!: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Chi nhánh cần xem; chỉ có tác dụng với người có branch.access_all' })
  @IsOptional() @IsString() @Matches(uuidPattern) branchId?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Bắt buộc ở phạm vi ca (report.view_shift)' })
  @IsOptional() @IsString() @Matches(uuidPattern) shiftId?: string;
}

export class DailyRevenueDto {
  @ApiProperty({ example: '2026-11-14' }) date!: string;
  @ApiProperty({ type: 'integer' }) revenue!: number;
}

export class BestSellerDto {
  @ApiProperty({ format: 'uuid' }) productSizeId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() sizeName!: string;
  @ApiProperty({ type: 'integer' }) quantity!: number;
  @ApiProperty({ type: 'integer', description: 'Doanh thu món và topping trước giảm giá' }) revenue!: number;
}

export class RevenueReportDto {
  @ApiProperty({ example: '2026-11-14' }) date!: string;
  @ApiProperty({ type: 'integer' }) invoiceCount!: number;
  @ApiProperty({ type: 'integer' }) totalRevenue!: number;
  @ApiProperty({ type: 'integer' }) cashRevenue!: number;
  @ApiProperty({ type: 'integer' }) transferRevenue!: number;
  @ApiProperty({ type: [DailyRevenueDto] }) dailyRevenue!: DailyRevenueDto[];
  @ApiProperty({ type: [BestSellerDto] }) bestSellers!: BestSellerDto[];
}

export const reportsQueryPipe = new ValidationPipe({
  whitelist: true, forbidNonWhitelisted: true, transform: true,
  exceptionFactory: errors => new HttpException({
    code: 'VALIDATION_ERROR', message: 'Dữ liệu gửi lên không hợp lệ.',
    details: errors.map(error => ({ location: 'query', field: error.property, message: 'Giá trị không hợp lệ.' })),
  }, 422),
});
