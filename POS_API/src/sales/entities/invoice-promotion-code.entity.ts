import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('invoice_promotion_codes')
export class InvoicePromotionCode {
  @PrimaryColumn('uuid') invoice_id!: string;
  @Column('uuid') promotion_code_id!: string;
  @Column('varchar', { length: 50 }) code!: string;
  @Column('bigint') discount_amount!: string;
}
