import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('bank_transfer_events')
export class BankTransferEvent {
  @PrimaryColumn('uuid') id!: string;
  @Column('varchar', { length: 100 }) provider_event_id!: string;
  @Column('varchar', { length: 100, nullable: true }) provider_reference!: string | null;
  @Column('varchar', { length: 34 }) account_number!: string;
  @Column('char', { length: 18, nullable: true }) transfer_reference!: string | null;
  @Column('bigint') transfer_amount!: string;
  @Column('varchar', { length: 500, nullable: true }) content!: string | null;
  @Column('timestamptz') received_at!: Date;
  @Column('varchar', { length: 30 }) disposition!: 'PAID' | 'UNDERPAID' | 'ATTEMPT_CANCELLED' | 'INVOICE_NOT_OPEN' | 'PROMOTION_INVALID' | 'QUARANTINED' | 'DUPLICATE';
  @Column('uuid', { nullable: true }) store_id!: string | null;
  @Column('uuid', { nullable: true }) branch_id!: string | null;
  @Column('uuid', { nullable: true }) invoice_id!: string | null;
  @Column('uuid', { nullable: true }) attempt_id!: string | null;
}
