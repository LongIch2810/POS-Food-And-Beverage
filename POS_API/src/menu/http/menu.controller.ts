import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiExtraModels, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AccessGuard, AuthenticatedRequest, RequirePermission } from '../../auth/security/access.guard';
import { dataResponse } from '../../http/api-response';
import { httpError } from '../../http/http-error';
import { ApiErrors, ApiListQuery, dataSchema, listSchema, PageMetaDto } from '../../http/response-docs';
import { JsonBodyGuard, noInput, requestValidationPipe, validId } from '../../http/request-validation';
import { menuPage } from '../menu.pagination';
import { MenuService } from '../menu.service';
import {
  CreateCategoryDto,
  CreateProductDto,
  CreateProductSizeDto,
  CreateSizeDto,
  CreateToppingDto,
  LinkToppingDto,
  PatchCategoryDto,
  PatchProductDto,
  PatchProductSizeDto,
  PatchSizeDto,
  PatchToppingDto,
} from './menu.dto';
import {
  CategoryOutputDto,
  CategoryToppingOutputDto,
  ImageUploadOutputDto,
  ProductDetailDto,
  ProductOutputDto,
  ProductSizeOutputDto,
  SizeOutputDto,
  ToppingOutputDto,
} from './menu.response';

// --- CATEGORIES ---

@Controller('api/v1/categories')
@UseGuards(AccessGuard, JsonBodyGuard)
@ApiExtraModels(CategoryOutputDto, PageMetaDto)
@ApiErrors()
export class CategoriesController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @RequirePermission('menu.read')
  @ApiListQuery()
  @ApiResponse({ status: 200, schema: listSchema(CategoryOutputDto) })
  async list(@Req() request: AuthenticatedRequest) {
    noInput(request, true);
    return this.menuService.listCategories(request.authUser!, menuPage(request.query, 'categories', request.authUser!));
  }

  @Post()
  @RequirePermission('menu.manage')
  @ApiResponse({ status: 201, schema: dataSchema(CategoryOutputDto) })
  async create(@Req() request: AuthenticatedRequest, @Body(requestValidationPipe) input: CreateCategoryDto) {
    return dataResponse(await this.menuService.createCategory(request.authUser!, input));
  }

  @Patch(':id')
  @RequirePermission('menu.manage')
  @ApiResponse({ status: 200, schema: dataSchema(CategoryOutputDto) })
  async patch(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body(requestValidationPipe) input: PatchCategoryDto,
  ) {
    return dataResponse(await this.menuService.patchCategory(request.authUser!, validId(id), input));
  }

  @Delete(':id')
  @RequirePermission('menu.manage')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    noInput(request);
    await this.menuService.deleteCategory(request.authUser!, validId(id));
  }

  @Get(':id/toppings')
  @RequirePermission('menu.read')
  @ApiResponse({ status: 200, schema: dataSchema(ToppingOutputDto) })
  async listToppings(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    noInput(request, true);
    return dataResponse(await this.menuService.listCategoryToppings(request.authUser!, validId(id)));
  }

  @Post(':id/toppings')
  @RequirePermission('menu.manage')
  @ApiResponse({ status: 201, schema: dataSchema(CategoryToppingOutputDto) })
  async linkTopping(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body(requestValidationPipe) input: LinkToppingDto,
  ) {
    return dataResponse(await this.menuService.linkTopping(request.authUser!, validId(id), input));
  }

  @Delete(':id/toppings/:toppingId')
  @RequirePermission('menu.manage')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async unlinkTopping(
    @Param('id') id: string,
    @Param('toppingId') toppingId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    noInput(request);
    await this.menuService.unlinkTopping(request.authUser!, validId(id), validId(toppingId));
  }
}

// --- SIZES ---

@Controller('api/v1/sizes')
@UseGuards(AccessGuard, JsonBodyGuard)
@ApiExtraModels(SizeOutputDto)
@ApiErrors()
export class SizesController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @RequirePermission('menu.read')
  @ApiResponse({ status: 200, schema: dataSchema(SizeOutputDto) })
  async list(@Req() request: AuthenticatedRequest) {
    noInput(request, true);
    return dataResponse(await this.menuService.listSizes(request.authUser!));
  }

  @Post()
  @RequirePermission('menu.manage')
  @ApiResponse({ status: 201, schema: dataSchema(SizeOutputDto) })
  async create(@Req() request: AuthenticatedRequest, @Body(requestValidationPipe) input: CreateSizeDto) {
    return dataResponse(await this.menuService.createSize(request.authUser!, input));
  }

  @Patch(':id')
  @RequirePermission('menu.manage')
  @ApiResponse({ status: 200, schema: dataSchema(SizeOutputDto) })
  async patch(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body(requestValidationPipe) input: PatchSizeDto,
  ) {
    return dataResponse(await this.menuService.patchSize(request.authUser!, validId(id), input));
  }

  @Delete(':id')
  @RequirePermission('menu.manage')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    noInput(request);
    await this.menuService.deleteSize(request.authUser!, validId(id));
  }
}

// --- PRODUCTS ---

@Controller('api/v1/products')
@UseGuards(AccessGuard, JsonBodyGuard)
@ApiExtraModels(ProductOutputDto, ProductDetailDto, ProductSizeOutputDto, PageMetaDto)
@ApiErrors()
export class ProductsController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @RequirePermission('menu.read')
  @ApiListQuery([
    { name: 'categoryId', required: false, type: String, format: 'uuid', description: 'Lọc theo danh mục' },
  ])
  @ApiResponse({ status: 200, schema: listSchema(ProductOutputDto) })
  async list(@Req() request: AuthenticatedRequest) {
    noInput(request, true);
    return this.menuService.listProducts(request.authUser!, menuPage(request.query, 'products', request.authUser!));
  }

  @Get(':id')
  @RequirePermission('menu.read')
  @ApiResponse({ status: 200, schema: dataSchema(ProductDetailDto) })
  async get(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    noInput(request, true);
    return dataResponse(await this.menuService.getProduct(request.authUser!, validId(id)));
  }

  @Post()
  @RequirePermission('menu.manage')
  @ApiResponse({ status: 201, schema: dataSchema(ProductOutputDto) })
  async create(@Req() request: AuthenticatedRequest, @Body(requestValidationPipe) input: CreateProductDto) {
    return dataResponse(await this.menuService.createProduct(request.authUser!, input));
  }

  @Patch(':id')
  @RequirePermission('menu.manage')
  @ApiResponse({ status: 200, schema: dataSchema(ProductOutputDto) })
  async patch(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body(requestValidationPipe) input: PatchProductDto,
  ) {
    return dataResponse(await this.menuService.patchProduct(request.authUser!, validId(id), input));
  }

  @Delete(':id')
  @RequirePermission('menu.manage')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    noInput(request);
    await this.menuService.deleteProduct(request.authUser!, validId(id));
  }

  @Post(':id/sizes')
  @RequirePermission('menu.manage')
  @ApiResponse({ status: 201, schema: dataSchema(ProductSizeOutputDto) })
  async createSize(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body(requestValidationPipe) input: CreateProductSizeDto,
  ) {
    return dataResponse(await this.menuService.createProductSize(request.authUser!, validId(id), input));
  }

  @Get(':id/image')
  @RequirePermission('menu.read')
  async getImage(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Res() response: Response) {
    noInput(request, true);
    const { buffer, mime } = await this.menuService.getProductImage(request.authUser!, validId(id));
    response.setHeader('Content-Type', mime);
    response.setHeader('Content-Length', buffer.length);
    response.send(buffer);
  }

  @Delete(':id/image')
  @RequirePermission('menu.manage')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async deleteImage(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    noInput(request);
    await this.menuService.deleteProductImage(request.authUser!, validId(id));
  }
}

export interface MulterUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// --- PRODUCT IMAGE UPLOAD CONTROLLER (Tách riêng để cho phép multipart/form-data) ---

@Controller('api/v1/products')
@UseGuards(AccessGuard)
@ApiExtraModels(ImageUploadOutputDto)
@ApiErrors()
export class ProductImageUploadController {
  constructor(private readonly menuService: MenuService) {}

  @Post(':id/image')
  @HttpCode(200)
  @RequirePermission('menu.manage')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 2000000 } }))
  @ApiResponse({ status: 200, schema: dataSchema(ImageUploadOutputDto) })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: MulterUploadedFile | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!file) {
      throw httpError(400, 'BAD_REQUEST', 'Vui lòng chọn file ảnh để tải lên.');
    }
    return dataResponse(
      await this.menuService.uploadProductImage(request.authUser!, validId(id), {
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      }),
    );
  }
}

// --- PRODUCT SIZES & PRICING ---

@Controller('api/v1/product-sizes')
@UseGuards(AccessGuard, JsonBodyGuard)
@ApiExtraModels(ProductSizeOutputDto)
@ApiErrors()
export class ProductSizesController {
  constructor(private readonly menuService: MenuService) {}

  @Patch(':id')
  @RequirePermission('menu.manage')
  @ApiResponse({ status: 200, schema: dataSchema(ProductSizeOutputDto) })
  async patch(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body(requestValidationPipe) input: PatchProductSizeDto,
  ) {
    return dataResponse(await this.menuService.patchProductSize(request.authUser!, validId(id), input));
  }

  @Delete(':id')
  @RequirePermission('menu.manage')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    noInput(request);
    await this.menuService.deleteProductSize(request.authUser!, validId(id));
  }
}

// --- TOPPINGS ---

@Controller('api/v1/toppings')
@UseGuards(AccessGuard, JsonBodyGuard)
@ApiExtraModels(ToppingOutputDto, PageMetaDto)
@ApiErrors()
export class ToppingsController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @RequirePermission('menu.read')
  @ApiListQuery()
  @ApiResponse({ status: 200, schema: listSchema(ToppingOutputDto) })
  async list(@Req() request: AuthenticatedRequest) {
    noInput(request, true);
    return this.menuService.listToppings(request.authUser!, menuPage(request.query, 'toppings', request.authUser!));
  }

  @Post()
  @RequirePermission('menu.manage')
  @ApiResponse({ status: 201, schema: dataSchema(ToppingOutputDto) })
  async create(@Req() request: AuthenticatedRequest, @Body(requestValidationPipe) input: CreateToppingDto) {
    return dataResponse(await this.menuService.createTopping(request.authUser!, input));
  }

  @Patch(':id')
  @RequirePermission('menu.manage')
  @ApiResponse({ status: 200, schema: dataSchema(ToppingOutputDto) })
  async patch(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body(requestValidationPipe) input: PatchToppingDto,
  ) {
    return dataResponse(await this.menuService.patchTopping(request.authUser!, validId(id), input));
  }

  @Delete(':id')
  @RequirePermission('menu.manage')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    noInput(request);
    await this.menuService.deleteTopping(request.authUser!, validId(id));
  }
}
