import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Category } from './category.entity';
import { Topping } from './topping.entity';

@Entity('category_toppings')
export class CategoryTopping {
  @PrimaryColumn({ type: 'uuid' })
  category_id!: string;

  @PrimaryColumn({ type: 'uuid' })
  topping_id!: string;

  @ManyToOne(() => Category, (category) => category.category_toppings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @ManyToOne(() => Topping, (topping) => topping.category_toppings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'topping_id' })
  topping?: Topping;
}

