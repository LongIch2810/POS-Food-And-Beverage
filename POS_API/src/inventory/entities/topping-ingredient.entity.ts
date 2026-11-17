import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('topping_ingredients')
export class ToppingIngredient {
  @PrimaryColumn('uuid') topping_id!: string;
  @PrimaryColumn('uuid') ingredient_id!: string;
  @Column('numeric', { precision: 14, scale: 3 }) quantity!: string;
}
