import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid') invoice_id!: string;
  @Column('varchar', { length: 10 }) method!: 'CASH' | 'TRANSFER';
  @Column('bigint') amount!: string;
  @Column('uuid') idempotency_key!: string;
  @Column('char', { length: 64 }) idempotency_request_hash!: string;
  @Column('bigint', { nullable: true }) tendered_amount!: string | null;
  @Column('bigint', { nullable: true }) change_amount!: string | null;
  @Column('bigint', { nullable: true }) actual_received_amount!: string | null;
  @Column('bigint', { nullable: true }) excess_amount!: string | null;
  @Column('uuid', { nullable: true }) transfer_attempt_id!: string | null;
  @Column('varchar', { length: 34, nullable: true }) receiving_account_number!: string | null;
  @Column('varchar', { length: 100, nullable: true }) transaction_ref!: string | null;
  @Column('varchar', { length: 12, nullable: true }) transaction_ref_kind!: 'BANK' | 'SEPAY_EVENT' | null;
  @Column('varchar', { length: 10, nullable: true }) confirmation_source!: 'WEBHOOK' | 'MANUAL' | null;
  @Column('uuid', { nullable: true }) confirmed_by!: string | null;
  @Column('varchar', { length: 255, nullable: true }) confirmation_reason!: string | null;
  @Column('uuid', { nullable: true }) created_by!: string | null;
  @Column('timestamptz') paid_at!: Date;
}
