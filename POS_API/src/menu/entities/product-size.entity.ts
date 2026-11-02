import { randomUUID } from 'node:crypto';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Product } from './product.entity';
import { Size } from './size.entity';

@Entity('product_sizes')
export class ProductSize {
  @PrimaryColumn({ type: 'uuid' })
  id: string = randomUUID();

  @Column({ type: 'uuid' })
  product_id!: string;

  @Column({ type: 'uuid' })
  size_id!: string;

  @Column({ type: 'bigint' })
  price!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Product, (product) => product.product_sizes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => Size, (size) => size.product_sizes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'size_id' })
  size?: Size;
}

