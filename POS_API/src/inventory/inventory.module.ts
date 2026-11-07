import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { InventoryService } from './inventory.service';
import { IngredientsController, ProductRecipeController, ToppingRecipeController, StocksController, StockMovementsController } from './inventory.controller';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [IngredientsController, ProductRecipeController, ToppingRecipeController, StocksController, StockMovementsController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
