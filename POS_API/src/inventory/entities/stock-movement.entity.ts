import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid') branch_id!: string;
  @Column('uuid') ingredient_id!: string;
  @Column('varchar', { length: 20 }) type!: 'IMPORT' | 'SALE' | 'SALE_REVERSAL' | 'WASTE' | 'ADJUST';
  @Column('numeric', { precision: 14, scale: 3 }) quantity!: string;
  @Column('numeric', { precision: 14, scale: 3 }) balance_after!: string;
  @Column('uuid', { nullable: true }) invoice_id!: string | null;
  @Column('varchar', { length: 255, nullable: true }) note!: string | null;
  @Column('uuid', { nullable: true }) created_by!: string | null;
  @Column('timestamptz') created_at!: Date;
  @Column('varchar', { length: 10 }) source!: 'USER' | 'SYSTEM';
}
