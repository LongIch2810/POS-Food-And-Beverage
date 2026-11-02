import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuthRateEvent } from '../auth/entities/auth-rate-event.entity';
import { Branch } from '../organization/entities/branch.entity';
import { DiningTable } from '../organization/entities/dining-table.entity';
import { Permission } from '../auth/entities/permission.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Role } from '../auth/entities/role.entity';
import { RolePermission } from '../auth/entities/role-permission.entity';
import { Store } from '../platform/entities/store.entity';
import { User } from '../auth/entities/user.entity';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

export const entities = [
  Store,
  Branch,
  DiningTable,
  Role,
  Permission,
  RolePermission,
  User,
  RefreshToken,
  AuthRateEvent,
];

export const dataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  connectTimeoutMS: 5000,
  extra: { query_timeout: 5000, statement_timeout: 5000 },
  synchronize: false,
  migrationsRun: false,
  entities,
  migrations: [__dirname + '/migrations/*.js'],
});

