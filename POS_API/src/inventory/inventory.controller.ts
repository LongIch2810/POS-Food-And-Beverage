import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AccessGuard, AuthenticatedRequest, RequirePermission } from '../auth/security/access.guard';
import { dataResponse } from '../http/api-response';
import { JsonBodyGuard, noInput, validId } from '../http/request-validation';
import { InventoryService } from './inventory.service';

@Controller('api/v1/ingredients')
@UseGuards(AccessGuard, JsonBodyGuard)
export class IngredientsController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @RequirePermission('inventory.view')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    noInput(request,true);
    return this.inventory.listIngredients(request.authUser!,query);
  }

  @Post()
  @RequirePermission('inventory.manage')
  async create(@Req() request: AuthenticatedRequest, @Body() body: Record<string, unknown>) {
    return dataResponse(await this.inventory.createIngredient(request.authUser!,body));
  }

  @Patch(':id')
  @RequirePermission('inventory.manage')
  async patch(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return dataResponse(await this.inventory.patchIngredient(request.authUser!,validId(id),body));
  }
}

@Controller('api/v1/product-sizes')
@UseGuards(AccessGuard, JsonBodyGuard)
export class ProductRecipeController {
  constructor(private readonly inventory: InventoryService) {}
  @Get(':id/recipe') @RequirePermission('inventory.view')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    noInput(request);
    return dataResponse(await this.inventory.getRecipe(request.authUser!,'product',validId(id)));
  }
  @Put(':id/recipe') @RequirePermission('menu.manage')
  async put(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return dataResponse(await this.inventory.putRecipe(request.authUser!,'product',validId(id),body));
  }
}

@Controller('api/v1/toppings')
@UseGuards(AccessGuard, JsonBodyGuard)
export class ToppingRecipeController {
  constructor(private readonly inventory: InventoryService) {}
  @Get(':id/recipe') @RequirePermission('inventory.view')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    noInput(request);
    return dataResponse(await this.inventory.getRecipe(request.authUser!,'topping',validId(id)));
  }
  @Put(':id/recipe') @RequirePermission('menu.manage')
  async put(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return dataResponse(await this.inventory.putRecipe(request.authUser!,'topping',validId(id),body));
  }
}

@Controller('api/v1/ingredient-stocks')
@UseGuards(AccessGuard, JsonBodyGuard)
export class StocksController {
  constructor(private readonly inventory: InventoryService) {}
  @Get() @RequirePermission('inventory.view')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    noInput(request,true);
    return this.inventory.listStocks(request.authUser!,query);
  }
  @Patch(':ingredientId/min-stock') @RequirePermission('inventory.manage')
  async setMin(@Req() request: AuthenticatedRequest, @Param('ingredientId') id: string, @Body() body: Record<string, unknown>) {
    return dataResponse(await this.inventory.setMin(request.authUser!,validId(id),body));
  }
}

@Controller('api/v1/stock-movements')
@UseGuards(AccessGuard, JsonBodyGuard)
export class StockMovementsController {
  constructor(private readonly inventory: InventoryService) {}
  @Get() @RequirePermission('inventory.view')
  list(@Req() request: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    noInput(request,true);
    return this.inventory.listMovements(request.authUser!,query);
  }
}
