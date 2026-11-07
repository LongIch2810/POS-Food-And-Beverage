import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('invoice_item_toppings')
export class InvoiceItemTopping {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid') invoice_item_id!: string;
  @Column('uuid') topping_id!: string;
  @Column('varchar', { length: 100 }) topping_name!: string;
  @Column('bigint') unit_price!: string;
  @Column('int') quantity!: number;
  @Column('bigint') line_total!: string;
  @Column('timestamptz') created_at!: Date;
}
