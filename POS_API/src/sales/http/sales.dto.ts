import { Type, Transform } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateInvoiceDto {
  @IsIn(['DINE_IN', 'TAKEAWAY'])
  orderType!: 'DINE_IN' | 'TAKEAWAY';

  @IsOptional() @IsUUID()
  tableId?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000)
  note?: string;
}

export class ToppingInputDto {
  @IsUUID()
  toppingId!: string;

  @IsInt() @Min(1) @Max(1000)
  quantity!: number;
}

export class AddInvoiceItemDto {
  @IsUUID()
  productSizeId!: string;

  @IsInt() @Min(1) @Max(1000)
  quantity!: number;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ToppingInputDto)
  toppings?: ToppingInputDto[];

  @IsOptional() @Transform(trim) @IsString() @MaxLength(255)
  note?: string;
}

export class PatchInvoiceItemDto {
  @IsOptional() @IsInt() @Min(1) @Max(1000)
  quantity?: number;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Transform(trim) @IsString() @MaxLength(255)
  note?: string | null;
}

export class TransferTableDto {
  @IsUUID()
  tableId!: string;
}

export class CancelInvoiceDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(255)
  reason!: string;
}
