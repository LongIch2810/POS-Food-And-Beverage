import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid') invoice_id!: string;
  @Column('uuid') product_size_id!: string;
  @Column('varchar', { length: 150 }) product_name!: string;
  @Column('varchar', { length: 20 }) size_name!: string;
  @Column('bigint') unit_price!: string;
  @Column('int') quantity!: number;
  @Column('bigint') line_total!: string;
  @Column('varchar', { length: 255, nullable: true }) note!: string | null;
  @Column('timestamptz') created_at!: Date;
  @Column('timestamptz') updated_at!: Date;
}
