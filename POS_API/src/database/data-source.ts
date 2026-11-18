import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Branch } from '../organization/entities/branch.entity';
import { DiningTable } from '../organization/entities/dining-table.entity';
import { Permission } from '../auth/entities/permission.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Role } from '../auth/entities/role.entity';
import { RolePermission } from '../auth/entities/role-permission.entity';
import { Store } from '../platform/entities/store.entity';
import { Category } from '../menu/entities/category.entity';
import { CategoryTopping } from '../menu/entities/category-topping.entity';
import { Product } from '../menu/entities/product.entity';
import { ProductSize } from '../menu/entities/product-size.entity';
import { Size } from '../menu/entities/size.entity';
import { Topping } from '../menu/entities/topping.entity';
import { User } from '../auth/entities/user.entity';
import { WorkShift } from '../shifts/entities/work-shift.entity';
import { CashReconciliation } from '../shifts/entities/cash-reconciliation.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { InvoiceItem } from '../sales/entities/invoice-item.entity';
import { InvoiceItemTopping } from '../sales/entities/invoice-item-topping.entity';

import { Ingredient } from '../inventory/entities/ingredient.entity';
import { ProductSizeIngredient } from '../inventory/entities/product-size-ingredient.entity';
import { ToppingIngredient } from '../inventory/entities/topping-ingredient.entity';
import { BranchIngredientStock } from '../inventory/entities/branch-ingredient-stock.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { PromotionCode } from '../promotions/entities/promotion-code.entity';
import { InvoicePromotionCode } from '../sales/entities/invoice-promotion-code.entity';
import { Payment } from '../sales/entities/payment.entity';
import { TransferAttempt } from '../sales/entities/transfer-attempt.entity';
import { BankTransferEvent } from '../sales/entities/bank-transfer-event.entity';
import { StoreBankAccount } from '../sales/entities/store-bank-account.entity';
import { ShiftExpense } from '../shifts/entities/shift-expense.entity';

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
  Category,
  Size,
  Product,
  ProductSize,
  Topping,
  CategoryTopping,
  WorkShift,
  CashReconciliation,
  Invoice,
  InvoiceItem,
  InvoiceItemTopping,
  Ingredient,
  ProductSizeIngredient,
  ToppingIngredient,
  BranchIngredientStock,
  StockMovement,
  PromotionCode,
  InvoicePromotionCode,
  Payment,
  TransferAttempt,
  BankTransferEvent,
  StoreBankAccount,
  ShiftExpense,
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
