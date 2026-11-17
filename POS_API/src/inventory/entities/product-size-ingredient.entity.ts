import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('product_size_ingredients')
export class ProductSizeIngredient {
  @PrimaryColumn('uuid') product_size_id!: string;
  @PrimaryColumn('uuid') ingredient_id!: string;
  @Column('numeric', { precision: 14, scale: 3 }) quantity!: string;
}
