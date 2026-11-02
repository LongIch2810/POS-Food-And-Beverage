import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { Category } from './entities/category.entity';
import { CategoryTopping } from './entities/category-topping.entity';
import { Product } from './entities/product.entity';
import { ProductSize } from './entities/product-size.entity';
import { Size } from './entities/size.entity';
import { Topping } from './entities/topping.entity';
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
} from './http/menu.dto';
import {
  CategoryOutputDto,
  CategoryToppingOutputDto,
  ProductDetailDto,
  ProductOutputDto,
  ProductSizeOutputDto,
  SizeOutputDto,
  ToppingOutputDto,
} from './http/menu.response';
import { MenuPage, menuPageResponse } from './menu.pagination';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateImageMagicBytes(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;
  if (mime === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mime === 'image/webp') {
    const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
    const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
    return isRiff && isWebp;
  }
  return false;
}

@Injectable()
export class MenuService {
  private readonly categoryRepo: Repository<Category>;
  private readonly sizeRepo: Repository<Size>;
  private readonly productRepo: Repository<Product>;
  private readonly productSizeRepo: Repository<ProductSize>;
  private readonly toppingRepo: Repository<Topping>;
  private readonly categoryToppingRepo: Repository<CategoryTopping>;

  constructor(private readonly dataSource: DataSource) {
    this.categoryRepo = this.dataSource.getRepository(Category);
    this.sizeRepo = this.dataSource.getRepository(Size);
    this.productRepo = this.dataSource.getRepository(Product);
    this.productSizeRepo = this.dataSource.getRepository(ProductSize);
    this.toppingRepo = this.dataSource.getRepository(Topping);
    this.categoryToppingRepo = this.dataSource.getRepository(CategoryTopping);
  }

  private storeId(user: UserSummary): string {
    if (!user.storeId) throw httpError(403, 'PERMISSION_DENIED', 'Không có quyền truy cập dữ liệu cửa hàng.');
    return user.storeId;
  }

  private async withConstraintHandling<T>(
    operation: () => Promise<T>,
    duplicateMessage = 'Dữ liệu đã tồn tại trong hệ thống.',
    inUseMessage = 'Dữ liệu đang được sử dụng trong hệ thống, không thể thao tác.'
  ): Promise<T> {
    try {
      return await operation();
    } catch (err: any) {
      if (err?.code === '23505') {
        throw httpError(409, 'DUPLICATE_RESOURCE', duplicateMessage);
      }
      if (err?.code === '23503') {
        throw httpError(409, 'RESOURCE_IN_USE', inUseMessage);
      }
      throw err;
    }
  }

  // --- CATEGORIES ---

  async listCategories(user: UserSummary, page: MenuPage) {
    const storeId = this.storeId(user);
    const qb = this.categoryRepo
      .createQueryBuilder('c')
      .where('c.store_id = :storeId', { storeId });

    return menuPageResponse(qb, 'c', page, [
      'c.id AS id',
      'c.store_id AS "storeId"',
      'c.name AS name',
      'c.description AS description',
      'c.sort_order AS "sortOrder"',
      'c.is_active AS "isActive"',
      'c.created_at AS "createdAt"',
      'c.updated_at AS "updatedAt"',
    ]);
  }

  async createCategory(user: UserSummary, input: CreateCategoryDto): Promise<CategoryOutputDto> {
    const storeId = this.storeId(user);
    const existing = await this.categoryRepo.findOne({ where: { store_id: storeId, name: input.name } });
    if (existing) throw httpError(409, 'DUPLICATE_RESOURCE', 'Tên danh mục đã tồn tại trong cửa hàng.');

    const entity = this.categoryRepo.create({
      store_id: storeId,
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sortOrder ?? 0,
      is_active: true,
    });
    const saved = await this.withConstraintHandling(() => this.categoryRepo.save(entity), 'Tên danh mục đã tồn tại trong cửa hàng.');
    return {
      id: saved.id,
      storeId: saved.store_id,
      name: saved.name,
      description: saved.description,
      sortOrder: saved.sort_order,
      isActive: saved.is_active,
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
    };
  }

  async patchCategory(user: UserSummary, id: string, input: PatchCategoryDto): Promise<CategoryOutputDto> {
    const storeId = this.storeId(user);
    const category = await this.categoryRepo.findOne({ where: { id, store_id: storeId } });
    if (!category) throw httpError(404, 'NOT_FOUND', 'Danh mục không tồn tại.');

    if (input.name && input.name !== category.name) {
      const duplicate = await this.categoryRepo.findOne({ where: { store_id: storeId, name: input.name } });
      if (duplicate) throw httpError(409, 'DUPLICATE_RESOURCE', 'Tên danh mục đã tồn tại trong cửa hàng.');
      category.name = input.name;
    }
    if (input.description !== undefined) category.description = input.description;
    if (input.sortOrder !== undefined) category.sort_order = input.sortOrder;
    if (input.isActive !== undefined) category.is_active = input.isActive;

    const saved = await this.categoryRepo.save(category);
    return {
      id: saved.id,
      storeId: saved.store_id,
      name: saved.name,
      description: saved.description,
      sortOrder: saved.sort_order,
      isActive: saved.is_active,
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
    };
  }

  async deleteCategory(user: UserSummary, id: string): Promise<void> {
    const storeId = this.storeId(user);
    const category = await this.categoryRepo.findOne({ where: { id, store_id: storeId } });
    if (!category) throw httpError(404, 'NOT_FOUND', 'Danh mục không tồn tại.');

    const productCount = await this.productRepo.count({ where: { category_id: id } });
    if (productCount > 0) {
      throw httpError(409, 'RESOURCE_IN_USE', 'Danh mục đã có món ăn, không thể xóa.');
    }

    await this.withConstraintHandling(
      async () => {
        await this.dataSource.transaction(async (manager) => {
          await manager.getRepository(CategoryTopping).delete({ category_id: id });
          await manager.getRepository(Category).delete({ id, store_id: storeId });
        });
      },
      undefined,
      'Danh mục đã có món ăn hoặc dữ liệu liên kết, không thể xóa.'
    );
  }

  // --- SIZES ---

  async listSizes(user: UserSummary): Promise<SizeOutputDto[]> {
    const storeId = this.storeId(user);
    const sizes = await this.sizeRepo.find({
      where: { store_id: storeId },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
    return sizes.map((s) => ({
      id: s.id,
      storeId: s.store_id,
      name: s.name,
      sortOrder: s.sort_order,
      createdAt: s.created_at.toISOString(),
      updatedAt: s.updated_at.toISOString(),
    }));
  }

  async createSize(user: UserSummary, input: CreateSizeDto): Promise<SizeOutputDto> {
    const storeId = this.storeId(user);
    const existing = await this.sizeRepo.findOne({ where: { store_id: storeId, name: input.name } });
    if (existing) throw httpError(409, 'DUPLICATE_RESOURCE', 'Tên kích cỡ đã tồn tại trong cửa hàng.');

    const entity = this.sizeRepo.create({
      store_id: storeId,
      name: input.name,
      sort_order: input.sortOrder ?? 0,
    });
    const saved = await this.withConstraintHandling(() => this.sizeRepo.save(entity), 'Tên kích cỡ đã tồn tại trong cửa hàng.');
    return {
      id: saved.id,
      storeId: saved.store_id,
      name: saved.name,
      sortOrder: saved.sort_order,
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
    };
  }

  async patchSize(user: UserSummary, id: string, input: PatchSizeDto): Promise<SizeOutputDto> {
    const storeId = this.storeId(user);
    const size = await this.sizeRepo.findOne({ where: { id, store_id: storeId } });
    if (!size) throw httpError(404, 'NOT_FOUND', 'Kích cỡ không tồn tại.');

    if (input.name && input.name !== size.name) {
      const duplicate = await this.sizeRepo.findOne({ where: { store_id: storeId, name: input.name } });
      if (duplicate) throw httpError(409, 'DUPLICATE_RESOURCE', 'Tên kích cỡ đã tồn tại trong cửa hàng.');
      size.name = input.name;
    }
    if (input.sortOrder !== undefined) size.sort_order = input.sortOrder;

    const saved = await this.sizeRepo.save(size);
    return {
      id: saved.id,
      storeId: saved.store_id,
      name: saved.name,
      sortOrder: saved.sort_order,
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
    };
  }

  async deleteSize(user: UserSummary, id: string): Promise<void> {
    const storeId = this.storeId(user);
    const size = await this.sizeRepo.findOne({ where: { id, store_id: storeId } });
    if (!size) throw httpError(404, 'NOT_FOUND', 'Kích cỡ không tồn tại.');

    const usageCount = await this.productSizeRepo.count({ where: { size_id: id } });
    if (usageCount > 0) {
      throw httpError(409, 'RESOURCE_IN_USE', 'Kích cỡ đã được gán cho món ăn, không thể xóa.');
    }
    await this.sizeRepo.delete({ id });
  }

  // --- PRODUCTS ---

  async listProducts(user: UserSummary, page: MenuPage) {
    const storeId = this.storeId(user);
    const qb = this.productRepo
      .createQueryBuilder('p')
      .innerJoin('categories', 'c', 'c.id = p.category_id')
      .where('c.store_id = :storeId', { storeId });

    if (page.categoryId) {
      qb.andWhere('p.category_id = :catId', { catId: page.categoryId });
    }

    const pageResult = await menuPageResponse(qb, 'p', page, [
      'p.id AS id',
      'p.category_id AS "categoryId"',
      'c.name AS "categoryName"',
      'p.name AS name',
      'p.description AS description',
      'p.is_active AS "isActive"',
      'p.image_mime AS "imageMime"',
      'p.created_at AS "createdAt"',
      'p.updated_at AS "updatedAt"',
    ]);

    // Fetch product_sizes for returned products
    const productIds = pageResult.data.map((row: any) => row.id);
    let sizesByProduct: Record<string, any[]> = {};
    if (productIds.length > 0) {
      const psList = await this.productSizeRepo
        .createQueryBuilder('ps')
        .innerJoinAndSelect('ps.size', 's')
        .where('ps.product_id IN (:...productIds)', { productIds })
        .orderBy('s.sort_order', 'ASC')
        .addOrderBy('s.name', 'ASC')
        .getMany();

      for (const ps of psList) {
        if (!sizesByProduct[ps.product_id]) sizesByProduct[ps.product_id] = [];
        sizesByProduct[ps.product_id].push({
          id: ps.id,
          sizeId: ps.size_id,
          sizeName: ps.size ? ps.size.name : '',
          price: Number(ps.price),
          isActive: ps.is_active,
        });
      }
    }

    const enriched = pageResult.data.map((row: any) => ({
      id: row.id,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      name: row.name,
      description: row.description,
      imageUrl: row.imageMime ? `/api/v1/products/${row.id}/image` : null,
      isActive: row.isActive,
      sizes: sizesByProduct[row.id] ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return {
      data: enriched,
      meta: pageResult.meta,
    };
  }

  async getProduct(user: UserSummary, id: string): Promise<ProductDetailDto> {
    const storeId = this.storeId(user);
    const product = await this.productRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.category', 'c')
      .where('p.id = :id AND c.store_id = :storeId', { id, storeId })
      .getOne();

    if (!product) throw httpError(404, 'NOT_FOUND', 'Món ăn không tồn tại.');

    const psList = await this.productSizeRepo
      .createQueryBuilder('ps')
      .innerJoinAndSelect('ps.size', 's')
      .where('ps.product_id = :id', { id })
      .orderBy('s.sort_order', 'ASC')
      .getMany();

    return {
      id: product.id,
      categoryId: product.category_id,
      categoryName: product.category?.name ?? '',
      name: product.name,
      description: product.description,
      imageUrl: product.image_mime ? `/api/v1/products/${product.id}/image` : null,
      isActive: product.is_active,
      sizes: psList.map((ps) => ({
        id: ps.id,
        sizeId: ps.size_id,
        sizeName: ps.size?.name ?? '',
        price: Number(ps.price),
        isActive: ps.is_active,
      })),
      createdAt: product.created_at.toISOString(),
      updatedAt: product.updated_at.toISOString(),
    };
  }

  async createProduct(user: UserSummary, input: CreateProductDto): Promise<ProductOutputDto> {
    const storeId = this.storeId(user);
    const category = await this.categoryRepo.findOne({ where: { id: input.categoryId, store_id: storeId } });
    if (!category) throw httpError(404, 'NOT_FOUND', 'Danh mục không tồn tại.');

    const existing = await this.productRepo.findOne({ where: { category_id: input.categoryId, name: input.name } });
    if (existing) throw httpError(409, 'DUPLICATE_RESOURCE', 'Tên món đã tồn tại trong danh mục này.');

    const entity = this.productRepo.create({
      category_id: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      is_active: true,
    });
    const saved = await this.withConstraintHandling(() => this.productRepo.save(entity), 'Tên món đã tồn tại trong danh mục này.');

    return {
      id: saved.id,
      categoryId: saved.category_id,
      categoryName: category.name,
      name: saved.name,
      description: saved.description,
      imageUrl: null,
      isActive: saved.is_active,
      sizes: [],
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
    };
  }

  async patchProduct(user: UserSummary, id: string, input: PatchProductDto): Promise<ProductOutputDto> {
    const storeId = this.storeId(user);
    const product = await this.productRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.category', 'c')
      .where('p.id = :id AND c.store_id = :storeId', { id, storeId })
      .getOne();

    if (!product) throw httpError(404, 'NOT_FOUND', 'Món ăn không tồn tại.');

    let targetCategoryId = product.category_id;
    let targetCategoryName = product.category?.name ?? '';

    const categoryChanged = Boolean(input.categoryId && input.categoryId !== product.category_id);
    const nameChanged = Boolean(input.name && input.name !== product.name);

    if (categoryChanged) {
      const targetCat = await this.categoryRepo.findOne({ where: { id: input.categoryId, store_id: storeId } });
      if (!targetCat) throw httpError(404, 'NOT_FOUND', 'Danh mục chuyển đến không tồn tại.');
      targetCategoryId = targetCat.id;
      targetCategoryName = targetCat.name;
      product.category_id = targetCat.id;
    }

    const targetName = input.name ?? product.name;
    if (nameChanged || categoryChanged) {
      const duplicate = await this.productRepo.findOne({
        where: { category_id: targetCategoryId, name: targetName },
      });
      if (duplicate && duplicate.id !== product.id) {
        throw httpError(409, 'DUPLICATE_RESOURCE', 'Tên món đã tồn tại trong danh mục này.');
      }
      product.name = targetName;
    }

    if (input.description !== undefined) product.description = input.description;
    if (input.isActive !== undefined) product.is_active = input.isActive;

    const saved = await this.withConstraintHandling(() => this.productRepo.save(product), 'Tên món đã tồn tại trong danh mục này.');

    // Get sizes
    const psList = await this.productSizeRepo
      .createQueryBuilder('ps')
      .innerJoinAndSelect('ps.size', 's')
      .where('ps.product_id = :id', { id: saved.id })
      .getMany();

    return {
      id: saved.id,
      categoryId: saved.category_id,
      categoryName: targetCategoryName,
      name: saved.name,
      description: saved.description,
      imageUrl: saved.image_mime ? `/api/v1/products/${saved.id}/image` : null,
      isActive: saved.is_active,
      sizes: psList.map((ps) => ({
        id: ps.id,
        sizeId: ps.size_id,
        sizeName: ps.size?.name ?? '',
        price: Number(ps.price),
        isActive: ps.is_active,
      })),
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
    };
  }

  async deleteProduct(user: UserSummary, id: string): Promise<void> {
    const storeId = this.storeId(user);
    const product = await this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.category', 'c')
      .where('p.id = :id AND c.store_id = :storeId', { id, storeId })
      .getOne();

    if (!product) throw httpError(404, 'NOT_FOUND', 'Món ăn không tồn tại.');

    const sizeCount = await this.productSizeRepo.count({ where: { product_id: id } });
    if (sizeCount > 0) {
      throw httpError(409, 'RESOURCE_IN_USE', 'Món ăn đã được cấu hình kích cỡ và giá, không thể xóa.');
    }

    await this.withConstraintHandling(
      () => this.productRepo.delete({ id }),
      undefined,
      'Món ăn đang được sử dụng trong hệ thống, không thể xóa.'
    );
  }

  // --- PRODUCT IMAGE ---

  async uploadProductImage(
    user: UserSummary,
    productId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<{ imageUrl: string }> {
    const storeId = this.storeId(user);
    const product = await this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.category', 'c')
      .where('p.id = :id AND c.store_id = :storeId', { id: productId, storeId })
      .getOne();

    if (!product) throw httpError(404, 'NOT_FOUND', 'Món ăn không tồn tại.');

    if (file.size > 2000000) {
      throw httpError(413, 'FILE_TOO_LARGE', 'Ảnh vượt quá dung lượng tối đa 2 MB.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw httpError(400, 'BAD_REQUEST', 'Định dạng ảnh không được hỗ trợ. Chỉ nhận JPEG, PNG, WebP.');
    }

    if (!validateImageMagicBytes(file.buffer, file.mimetype)) {
      throw httpError(400, 'BAD_REQUEST', 'Nội dung file không khớp với định dạng ảnh.');
    }

    product.image_base64 = file.buffer.toString('base64');
    product.image_mime = file.mimetype;

    await this.productRepo.save(product);
    return { imageUrl: `/api/v1/products/${productId}/image` };
  }

  async getProductImage(user: UserSummary, productId: string): Promise<{ buffer: Buffer; mime: string }> {
    const storeId = this.storeId(user);
    const product = await this.productRepo
      .createQueryBuilder('p')
      .addSelect('p.image_base64')
      .innerJoin('p.category', 'c')
      .where('p.id = :id AND c.store_id = :storeId', { id: productId, storeId })
      .getOne();

    if (!product || !product.image_base64 || !product.image_mime) {
      throw httpError(404, 'NOT_FOUND', 'Ảnh món không tồn tại.');
    }

    const buffer = Buffer.from(product.image_base64, 'base64');
    return { buffer, mime: product.image_mime };
  }

  async deleteProductImage(user: UserSummary, productId: string): Promise<void> {
    const storeId = this.storeId(user);
    const product = await this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.category', 'c')
      .where('p.id = :id AND c.store_id = :storeId', { id: productId, storeId })
      .getOne();

    if (!product) throw httpError(404, 'NOT_FOUND', 'Món ăn không tồn tại.');

    product.image_base64 = null;
    product.image_mime = null;
    await this.productRepo.save(product);
  }

  // --- PRODUCT SIZES & PRICING ---

  async createProductSize(
    user: UserSummary,
    productId: string,
    input: CreateProductSizeDto,
  ): Promise<ProductSizeOutputDto> {
    const storeId = this.storeId(user);
    const product = await this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.category', 'c')
      .where('p.id = :id AND c.store_id = :storeId', { id: productId, storeId })
      .getOne();
    if (!product) throw httpError(404, 'NOT_FOUND', 'Món ăn không tồn tại.');

    const size = await this.sizeRepo.findOne({ where: { id: input.sizeId, store_id: storeId } });
    if (!size) throw httpError(404, 'NOT_FOUND', 'Kích cỡ không tồn tại.');

    const existing = await this.productSizeRepo.findOne({
      where: { product_id: productId, size_id: input.sizeId },
    });
    if (existing) throw httpError(409, 'DUPLICATE_RESOURCE', 'Kích cỡ này đã được cấu hình cho món ăn.');

    const entity = this.productSizeRepo.create({
      product_id: productId,
      size_id: input.sizeId,
      price: String(input.price),
      is_active: true,
    });
    const saved = await this.withConstraintHandling(() => this.productSizeRepo.save(entity), 'Kích cỡ này đã được thiết lập giá cho món ăn.');

    return {
      id: saved.id,
      productId: saved.product_id,
      sizeId: saved.size_id,
      price: Number(saved.price),
      isActive: saved.is_active,
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
    };
  }

  async patchProductSize(user: UserSummary, id: string, input: PatchProductSizeDto): Promise<ProductSizeOutputDto> {
    const storeId = this.storeId(user);
    const productSize = await this.productSizeRepo
      .createQueryBuilder('ps')
      .innerJoin('ps.product', 'p')
      .innerJoin('p.category', 'c')
      .where('ps.id = :id AND c.store_id = :storeId', { id, storeId })
      .getOne();

    if (!productSize) throw httpError(404, 'NOT_FOUND', 'Cấu hình giá theo kích cỡ không tồn tại.');

    if (input.price !== undefined) productSize.price = String(input.price);
    if (input.isActive !== undefined) productSize.is_active = input.isActive;

    const saved = await this.productSizeRepo.save(productSize);
    return {
      id: saved.id,
      productId: saved.product_id,
      sizeId: saved.size_id,
      price: Number(saved.price),
      isActive: saved.is_active,
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
    };
  }

  async deleteProductSize(user: UserSummary, id: string): Promise<void> {
    const storeId = this.storeId(user);
    const productSize = await this.productSizeRepo
      .createQueryBuilder('ps')
      .innerJoin('ps.product', 'p')
      .innerJoin('p.category', 'c')
      .where('ps.id = :id AND c.store_id = :storeId', { id, storeId })
      .getOne();

    if (!productSize) throw httpError(404, 'NOT_FOUND', 'Cấu hình kích cỡ không tồn tại.');

    try {
      await this.productSizeRepo.delete({ id });
    } catch {
      throw httpError(409, 'RESOURCE_IN_USE', 'Kích cỡ món này đã phát sinh dữ liệu, không thể xóa.');
    }
  }

  // --- TOPPINGS ---

  async listToppings(user: UserSummary, page: MenuPage) {
    const storeId = this.storeId(user);
    const qb = this.toppingRepo
      .createQueryBuilder('t')
      .where('t.store_id = :storeId', { storeId });

    const pageResult = await menuPageResponse(qb, 't', page, [
      't.id AS id',
      't.store_id AS "storeId"',
      't.name AS name',
      't.price AS price',
      't.is_active AS "isActive"',
      't.created_at AS "createdAt"',
      't.updated_at AS "updatedAt"',
    ]);

    return {
      data: pageResult.data.map((r: any) => ({
        ...r,
        price: Number(r.price),
      })),
      meta: pageResult.meta,
    };
  }

  async createTopping(user: UserSummary, input: CreateToppingDto): Promise<ToppingOutputDto> {
    const storeId = this.storeId(user);
    const existing = await this.toppingRepo.findOne({ where: { store_id: storeId, name: input.name } });
    if (existing) throw httpError(409, 'DUPLICATE_RESOURCE', 'Tên topping đã tồn tại trong cửa hàng.');

    const entity = this.toppingRepo.create({
      store_id: storeId,
      name: input.name,
      price: String(input.price),
      is_active: true,
    });
    const saved = await this.withConstraintHandling(() => this.toppingRepo.save(entity), 'Tên topping đã tồn tại trong cửa hàng.');
    return {
      id: saved.id,
      storeId: saved.store_id,
      name: saved.name,
      price: Number(saved.price),
      isActive: saved.is_active,
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
    };
  }

  async patchTopping(user: UserSummary, id: string, input: PatchToppingDto): Promise<ToppingOutputDto> {
    const storeId = this.storeId(user);
    const topping = await this.toppingRepo.findOne({ where: { id, store_id: storeId } });
    if (!topping) throw httpError(404, 'NOT_FOUND', 'Topping không tồn tại.');

    if (input.name && input.name !== topping.name) {
      const duplicate = await this.toppingRepo.findOne({ where: { store_id: storeId, name: input.name } });
      if (duplicate) throw httpError(409, 'DUPLICATE_RESOURCE', 'Tên topping đã tồn tại trong cửa hàng.');
      topping.name = input.name;
    }
    if (input.price !== undefined) topping.price = String(input.price);
    if (input.isActive !== undefined) topping.is_active = input.isActive;

    const saved = await this.toppingRepo.save(topping);
    return {
      id: saved.id,
      storeId: saved.store_id,
      name: saved.name,
      price: Number(saved.price),
      isActive: saved.is_active,
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
    };
  }

  async deleteTopping(user: UserSummary, id: string): Promise<void> {
    const storeId = this.storeId(user);
    const topping = await this.toppingRepo.findOne({ where: { id, store_id: storeId } });
    if (!topping) throw httpError(404, 'NOT_FOUND', 'Topping không tồn tại.');

    const usageCount = await this.categoryToppingRepo.count({ where: { topping_id: id } });
    if (usageCount > 0) {
      throw httpError(409, 'RESOURCE_IN_USE', 'Topping đã được gán vào danh mục món, không thể xóa.');
    }
    await this.toppingRepo.delete({ id });
  }

  // --- CATEGORY TOPPING LINKS ---

  async listCategoryToppings(user: UserSummary, categoryId: string): Promise<ToppingOutputDto[]> {
    const storeId = this.storeId(user);
    const category = await this.categoryRepo.findOne({ where: { id: categoryId, store_id: storeId } });
    if (!category) throw httpError(404, 'NOT_FOUND', 'Danh mục không tồn tại.');

    const links = await this.categoryToppingRepo
      .createQueryBuilder('ct')
      .innerJoinAndSelect('ct.topping', 't')
      .where('ct.category_id = :categoryId AND t.store_id = :storeId', { categoryId, storeId })
      .orderBy('t.name', 'ASC')
      .getMany();

    return links
      .filter((link) => link.topping != null)
      .map((link) => ({
        id: link.topping!.id,
        storeId: link.topping!.store_id,
        name: link.topping!.name,
        price: Number(link.topping!.price),
        isActive: link.topping!.is_active,
        createdAt: link.topping!.created_at.toISOString(),
        updatedAt: link.topping!.updated_at.toISOString(),
      }));
  }

  async linkTopping(user: UserSummary, categoryId: string, input: LinkToppingDto): Promise<CategoryToppingOutputDto> {
    const storeId = this.storeId(user);
    const category = await this.categoryRepo.findOne({ where: { id: categoryId, store_id: storeId } });
    if (!category) throw httpError(404, 'NOT_FOUND', 'Danh mục không tồn tại.');

    const topping = await this.toppingRepo.findOne({ where: { id: input.toppingId, store_id: storeId } });
    if (!topping) throw httpError(404, 'NOT_FOUND', 'Topping không tồn tại.');

    const existing = await this.categoryToppingRepo.findOne({
      where: { category_id: categoryId, topping_id: input.toppingId },
    });
    if (existing) throw httpError(409, 'DUPLICATE_RESOURCE', 'Topping đã được liên kết với danh mục này.');

    const entity = this.categoryToppingRepo.create({
      category_id: categoryId,
      topping_id: input.toppingId,
    });
    await this.categoryToppingRepo.save(entity);

    return { categoryId, toppingId: input.toppingId };
  }

  async unlinkTopping(user: UserSummary, categoryId: string, toppingId: string): Promise<void> {
    const storeId = this.storeId(user);
    const category = await this.categoryRepo.findOne({ where: { id: categoryId, store_id: storeId } });
    if (!category) throw httpError(404, 'NOT_FOUND', 'Danh mục không tồn tại.');

    const link = await this.categoryToppingRepo.findOne({
      where: { category_id: categoryId, topping_id: toppingId },
    });
    if (!link) throw httpError(404, 'NOT_FOUND', 'Liên kết topping không tồn tại.');

    await this.categoryToppingRepo.delete({ category_id: categoryId, topping_id: toppingId });
  }
}

