import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('shift_expenses')
export class ShiftExpense {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid') work_shift_id!: string;
  @Column('bigint') amount!: string;
  @Column('varchar', { length: 255 }) reason!: string;
  @Column('boolean') paid_from_drawer!: boolean;
  @Column('uuid') created_by!: string;
  @Column('timestamptz') created_at!: Date;
  @Column('timestamptz') updated_at!: Date;
}
