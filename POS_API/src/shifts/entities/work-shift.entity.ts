import { randomUUID } from 'node:crypto';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Branch } from '../../organization/entities/branch.entity';
import { User } from '../../auth/entities/user.entity';
import { CashReconciliation } from './cash-reconciliation.entity';

@Entity('work_shifts')
export class WorkShift {
  @PrimaryColumn({ type: 'uuid' })
  id: string = randomUUID();

  @Column({ type: 'uuid' })
  branch_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 20 })
  shift_type!: 'CASHIER' | 'STAFF';

  @Column({ type: 'timestamptz' })
  started_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at!: Date | null;

  @Column({ type: 'varchar', length: 20 })
  status!: 'OPEN' | 'CLOSED';

  @Column({ type: 'uuid', nullable: true })
  closed_by!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'closed_by' })
  closed_by_user?: User;

  @OneToOne(() => CashReconciliation, (reconciliation) => reconciliation.work_shift)
  reconciliation?: CashReconciliation;
}

