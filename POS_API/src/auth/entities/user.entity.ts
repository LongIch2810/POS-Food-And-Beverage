import { randomUUID } from 'node:crypto';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Branch } from '../../organization/entities/branch.entity';
import { RefreshToken } from './refresh-token.entity';
import { Role } from './role.entity';
import { Store } from '../../platform/entities/store.entity';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'uuid' })
  id: string = randomUUID();

  @Column({ type: 'uuid', nullable: true })
  store_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  branch_id!: string | null;

  @Column({ type: 'uuid' })
  role_id!: string;

  @Column({ type: 'varchar', length: 150 })
  full_name!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ type: 'boolean', default: false })
  must_change_password!: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Role, (role) => role.users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @ManyToOne(() => Store, (store) => store.users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'store_id' })
  store?: Store;

  @ManyToOne(() => Branch, (branch) => branch.users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refresh_tokens?: RefreshToken[];
}
