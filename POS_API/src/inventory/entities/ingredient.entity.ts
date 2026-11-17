import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('ingredients')
export class Ingredient {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid') store_id!: string;
  @Column('varchar', { length: 100 }) name!: string;
  @Column('varchar', { length: 20 }) unit!: 'g' | 'ml' | 'piece';
  @Column('boolean') is_active!: boolean;
  @Column('timestamptz') created_at!: Date;
  @Column('timestamptz') updated_at!: Date;
}
