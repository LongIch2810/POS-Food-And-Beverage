import { randomUUID } from 'node:crypto';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Store } from '../../platform/entities/store.entity';
import { ProductSize } from './product-size.entity';

@Entity('sizes')
export class Size {
  @PrimaryColumn({ type: 'uuid' })
  id: string = randomUUID();

  @Column({ type: 'uuid' })
  store_id!: string;

  @Column({ type: 'varchar', length: 20 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Store, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'store_id' })
  store?: Store;

  @OneToMany(() => ProductSize, (ps) => ps.size)
  product_sizes?: ProductSize[];
}

