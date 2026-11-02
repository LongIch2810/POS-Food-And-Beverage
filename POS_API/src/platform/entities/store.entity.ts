import { randomUUID } from 'node:crypto';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Branch } from '../../organization/entities/branch.entity';
import { User } from '../../auth/entities/user.entity';

export type StoreStatus = 'ACTIVE' | 'SUSPENDED';

@Entity('stores')
export class Store {
  @PrimaryColumn({ type: 'uuid' })
  id: string = randomUUID();

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: StoreStatus;

  @Column({ type: 'timestamptz', nullable: true })
  suspended_at!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  suspended_reason!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @OneToMany(() => Branch, (branch) => branch.store)
  branches?: Branch[];

  @OneToMany(() => User, (user) => user.store)
  users?: User[];
}
