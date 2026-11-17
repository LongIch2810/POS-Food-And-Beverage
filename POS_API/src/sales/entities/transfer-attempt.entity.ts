import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transfer_attempts')
export class TransferAttempt {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid') invoice_id!: string;
  @Column('uuid') store_id!: string;
  @Column('char', { length: 6 }) bank_bin!: string;
  @Column('varchar', { length: 34 }) account_number!: string;
  @Column('varchar', { length: 150 }) account_name!: string;
  @Column('bigint') amount!: string;
  @Column('char', { length: 18 }) transfer_reference!: string;
  @Column('uuid') idempotency_key!: string;
  @Column('char', { length: 64 }) idempotency_request_hash!: string;
  @Column('varchar', { length: 10 }) status!: 'PENDING' | 'CANCELLED' | 'PAID';
  @Column('timestamptz') created_at!: Date;
  @Column('timestamptz') updated_at!: Date;
}
