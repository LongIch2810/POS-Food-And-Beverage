import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('promotion_codes')
export class PromotionCode {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid') store_id!: string;
  @Column('varchar', { length: 50 }) code!: string;
  @Column('varchar', { length: 150, nullable: true }) name!: string | null;
  @Column('varchar', { length: 20 }) discount_type!: 'PERCENT' | 'FIXED';
  @Column('bigint') discount_value!: string;
  @Column('bigint', { nullable: true }) max_discount_amount!: string | null;
  @Column('bigint', { nullable: true }) min_order_amount!: string | null;
  @Column('timestamptz') start_at!: Date;
  @Column('timestamptz') end_at!: Date;
  @Column('int', { nullable: true }) usage_limit!: number | null;
  @Column('int') used_count!: number;
  @Column('boolean') is_active!: boolean;
  @Column('timestamptz') created_at!: Date;
  @Column('timestamptz') updated_at!: Date;
}
