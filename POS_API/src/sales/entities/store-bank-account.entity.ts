import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('store_bank_accounts')
export class StoreBankAccount {
  @PrimaryColumn('uuid') store_id!: string;
  @Column('char', { length: 6 }) bank_bin!: string;
  @Column('varchar', { length: 34 }) account_number!: string;
  @Column('varchar', { length: 150 }) account_name!: string;
  @Column('timestamptz') updated_at!: Date;
}
