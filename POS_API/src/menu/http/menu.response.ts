import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryOutputDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  storeId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class SizeOutputDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  storeId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ProductSizeItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  sizeId!: string;

  @ApiProperty()
  sizeName!: string;

  @ApiProperty({ type: 'integer' })
  price!: number;

  @ApiProperty()
  isActive!: boolean;
}

export class ProductOutputDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  imageUrl!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: () => [ProductSizeItemDto] })
  sizes!: ProductSizeItemDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ProductDetailDto extends ProductOutputDto {}

export class ProductSizeOutputDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ format: 'uuid' })
  sizeId!: string;

  @ApiProperty({ type: 'integer' })
  price!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ToppingOutputDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  storeId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: 'integer' })
  price!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CategoryToppingOutputDto {
  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ format: 'uuid' })
  toppingId!: string;
}

export class ImageUploadOutputDto {
  @ApiProperty()
  imageUrl!: string;
}

