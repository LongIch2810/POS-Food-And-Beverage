import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('branch_ingredient_stocks')
export class BranchIngredientStock {
  @PrimaryColumn('uuid') branch_id!: string;
  @PrimaryColumn('uuid') ingredient_id!: string;
  @Column('numeric', { precision: 14, scale: 3 }) current_stock!: string;
  @Column('numeric', { precision: 14, scale: 3 }) min_stock!: string;
  @Column('timestamptz') updated_at!: Date;
}
