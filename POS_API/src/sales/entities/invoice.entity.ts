import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('invoices')
export class Invoice {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid') branch_id!: string;
  @Column('uuid') work_shift_id!: string;
  @Column('uuid', { nullable: true }) table_id!: string | null;
  @Column('varchar', { length: 10 }) invoice_code!: string;
  @Column('uuid') created_by!: string;
  @Column('varchar', { length: 20 }) order_type!: 'DINE_IN' | 'TAKEAWAY';
  @Column('varchar', { length: 20 }) status!: 'OPEN' | 'PAID' | 'CANCELLED';
  @Column('bigint') subtotal!: string;
  @Column('bigint') discount_amount!: string;
  @Column('bigint') total_amount!: string;
  @Column('uuid', { nullable: true }) zero_completion_key!: string | null;
  @Column('text', { nullable: true }) note!: string | null;
  @Column('timestamptz', { nullable: true }) paid_at!: Date | null;
  @Column('timestamptz', { nullable: true }) cancelled_at!: Date | null;
  @Column('uuid', { nullable: true }) cancelled_by!: string | null;
  @Column('varchar', { length: 255, nullable: true }) cancel_reason!: string | null;
  @Column('timestamptz') created_at!: Date;
  @Column('timestamptz') updated_at!: Date;
}
