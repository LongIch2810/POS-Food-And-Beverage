import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import {
  CategoriesController,
  ProductImageUploadController,
  ProductsController,
  ProductSizesController,
  SizesController,
  ToppingsController,
} from './http/menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [
    CategoriesController,
    SizesController,
    ProductsController,
    ProductImageUploadController,
    ProductSizesController,
    ToppingsController,
  ],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}

