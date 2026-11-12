import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';

export class ApplyPromotionDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString() @Length(1, 50)
  code!: string;
}

export interface InvoicePricing {
  subtotal: bigint;
  discountAmount: bigint;
  totalAmount: bigint;
  promotionCodeId: string | null;
  promotionApplicable: boolean;
}

export interface PaymentPreviewDto {
  invoiceId: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  promotion: { code: string; applicable: boolean; reason: string | null } | null;
  warnings: { type: 'NEGATIVE_STOCK' | 'MISSING_RECIPE'; ingredientId?: string; itemId?: string }[];
}

export class CashPaymentDto {
  @IsIn(['CASH']) method!: 'CASH';
  @IsInt() @Min(1) @Max(1_000_000_000_000) amount!: number;
  @IsInt() @Min(1) @Max(1_000_000_000_000) tenderedAmount!: number;
}

export class StoreBankAccountDto {
  @IsString() @Matches(/^[0-9]{6}$/) bankBin!: string;
  @IsString() @Matches(/^[0-9]{6,19}$/) accountNumber!: string;
  @Transform(({value}:{value:unknown})=>typeof value==='string'?value.trim():value)
  @IsString() @Length(1,150) accountName!: string;
}

export class CreateTransferAttemptDto {
  @IsInt() @Min(1) @Max(1_000_000_000_000) amount!: number;
}

export class ManualConfirmationDto {
  @Transform(({value}:{value:unknown})=>typeof value==='string'?value.trim():value)
  @IsString() @Length(1,100) transactionRef!:string;
  @IsInt() @Min(1) @Max(1_000_000_000_000) actualReceivedAmount!:number;
  @Transform(({value}:{value:unknown})=>typeof value==='string'?value.trim():value)
  @IsString() @Length(1,255) reason!:string;
}

export interface TransferAttemptDto {
  id:string;
  invoiceId:string;
  status:'PENDING'|'CANCELLED'|'PAID';
  amount:number;
  bankBin:string;
  accountNumber:string;
  accountName:string;
  transferReference:string;
  qrImageUrl:string|null;
  createdAt:string;
  replayed:boolean;
}

export interface PaymentDto {
  paymentId: string;
  invoiceId: string;
  status: 'PAID';
  method: 'CASH';
  amount: number;
  tenderedAmount: number;
  changeAmount: number;
  paidAt: string;
  // Controller consumes this metadata before returning the public DTO.
  replayed: boolean;
}
