import { randomUUID } from 'node:crypto';
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { WorkShift } from './work-shift.entity';

@Entity('cash_reconciliations')
export class CashReconciliation {
  @PrimaryColumn({ type: 'uuid' })
  id: string = randomUUID();

  @Column({ type: 'uuid', unique: true })
  work_shift_id!: string;

  @Column({ type: 'bigint' })
  opening_cash!: string;

  @Column({ type: 'bigint', nullable: true })
  cash_sales_amount!: string | null;

  @Column({ type: 'bigint', nullable: true })
  expense_amount!: string | null;

  @Column({ type: 'bigint', nullable: true })
  expected_cash!: string | null;

  @Column({ type: 'bigint', nullable: true })
  counted_cash!: string | null;

  @Column({ type: 'bigint', nullable: true })
  difference!: string | null;

  @Column({ type: 'varchar', length: 20 })
  status!: 'PENDING' | 'MATCHED' | 'SHORTAGE' | 'OVERAGE';

  @Column({ type: 'varchar', length: 255, nullable: true })
  note!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reconciled_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @OneToOne(() => WorkShift, (shift) => shift.reconciliation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'work_shift_id' })
  work_shift?: WorkShift;
}

