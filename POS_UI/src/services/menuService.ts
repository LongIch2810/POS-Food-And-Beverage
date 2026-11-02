import { request } from '../http/client.ts';

export interface MenuCategory {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuSize {
  id: string;
  storeId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuProductSize {
  id: string;
  sizeId: string;
  sizeName: string;
  price: number;
  isActive: boolean;
}

export interface MenuProduct {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sizes: MenuProductSize[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuTopping {
  id: string;
  storeId: string;
  name: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  limit: number;
  nextCursor: string | null;
  total: number;
}

export interface MenuListResponse<T> {
  data: T[];
  meta: PageMeta;
}

export interface MenuQuery {
  limit?: number;
  cursor?: string;
  isActive?: boolean;
  categoryId?: string;
}

function list<T>(resource: string, query: MenuQuery = {}): Promise<MenuListResponse<T>> {
  const params = new URLSearchParams({ limit: String(query.limit ?? 20) });
  for (const [key, value] of Object.entries(query)) {
    if (key !== 'limit' && value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return request(`${resource}?${params}`, 'GET', undefined, true, true);
}

export const menuService = {
  // Categories
  getCategories: (query?: MenuQuery) => list<MenuCategory>('categories', query),
  async getAllCategories(): Promise<MenuCategory[]> {
    const rows: MenuCategory[] = [];
    let cursor: string | undefined;
    do {
      const page = await list<MenuCategory>('categories', { limit: 100, cursor });
      rows.push(...page.data);
      cursor = page.meta.nextCursor ?? undefined;
    } while (cursor);
    return rows;
  },
  createCategory: (input: { name: string; description?: string | null; sortOrder?: number }) =>
    request<MenuCategory>('categories', 'POST', input),
  patchCategory: (id: string, input: { name?: string; description?: string | null; sortOrder?: number; isActive?: boolean }) =>
    request<MenuCategory>(`categories/${encodeURIComponent(id)}`, 'PATCH', input),
  deleteCategory: (id: string) =>
    request<void>(`categories/${encodeURIComponent(id)}`, 'DELETE'),

  // Category Toppings Link
  getCategoryToppings: (categoryId: string) =>
    request<MenuTopping[]>(`categories/${encodeURIComponent(categoryId)}/toppings`),
  linkToppingToCategory: (categoryId: string, toppingId: string) =>
    request<{ categoryId: string; toppingId: string }>(`categories/${encodeURIComponent(categoryId)}/toppings`, 'POST', { toppingId }),
  unlinkToppingFromCategory: (categoryId: string, toppingId: string) =>
    request<void>(`categories/${encodeURIComponent(categoryId)}/toppings/${encodeURIComponent(toppingId)}`, 'DELETE'),

  // Sizes
  getSizes: () => request<MenuSize[]>('sizes'),
  createSize: (input: { name: string; sortOrder?: number }) =>
    request<MenuSize>('sizes', 'POST', input),
  patchSize: (id: string, input: { name?: string; sortOrder?: number }) =>
    request<MenuSize>(`sizes/${encodeURIComponent(id)}`, 'PATCH', input),
  deleteSize: (id: string) =>
    request<void>(`sizes/${encodeURIComponent(id)}`, 'DELETE'),

  // Products
  getProducts: (query?: MenuQuery) => list<MenuProduct>('products', query),
  async getAllProducts(categoryId?: string): Promise<MenuProduct[]> {
    const rows: MenuProduct[] = [];
    let cursor: string | undefined;
    do {
      const page = await list<MenuProduct>('products', { limit: 100, cursor, categoryId });
      rows.push(...page.data);
      cursor = page.meta.nextCursor ?? undefined;
    } while (cursor);
    return rows;
  },
  getProduct: (id: string) => request<MenuProduct>(`products/${encodeURIComponent(id)}`),
  createProduct: (input: { categoryId: string; name: string; description?: string | null }) =>
    request<MenuProduct>('products', 'POST', input),
  patchProduct: (id: string, input: { categoryId?: string; name?: string; description?: string | null; isActive?: boolean }) =>
    request<MenuProduct>(`products/${encodeURIComponent(id)}`, 'PATCH', input),
  deleteProduct: (id: string) =>
    request<void>(`products/${encodeURIComponent(id)}`, 'DELETE'),

  // Product Sizes & Pricing
  createProductSize: (productId: string, input: { sizeId: string; price: number }) =>
    request<MenuProductSize>(`products/${encodeURIComponent(productId)}/sizes`, 'POST', input),
  patchProductSize: (productSizeId: string, input: { price?: number; isActive?: boolean }) =>
    request<MenuProductSize>(`product-sizes/${encodeURIComponent(productSizeId)}`, 'PATCH', input),
  deleteProductSize: (productSizeId: string) =>
    request<void>(`product-sizes/${encodeURIComponent(productSizeId)}`, 'DELETE'),

  // Product Images
  uploadProductImage: (productId: string, file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    return request<{ imageUrl: string }>(`products/${encodeURIComponent(productId)}/image`, 'POST', formData);
  },
  deleteProductImage: (productId: string) =>
    request<void>(`products/${encodeURIComponent(productId)}/image`, 'DELETE'),

  // Toppings
  getToppings: (query?: MenuQuery) => list<MenuTopping>('toppings', query),
  async getAllToppings(): Promise<MenuTopping[]> {
    const rows: MenuTopping[] = [];
    let cursor: string | undefined;
    do {
      const page = await list<MenuTopping>('toppings', { limit: 100, cursor });
      rows.push(...page.data);
      cursor = page.meta.nextCursor ?? undefined;
    } while (cursor);
    return rows;
  },
  createTopping: (input: { name: string; price: number }) =>
    request<MenuTopping>('toppings', 'POST', input),
  patchTopping: (id: string, input: { name?: string; price?: number; isActive?: boolean }) =>
    request<MenuTopping>(`toppings/${encodeURIComponent(id)}`, 'PATCH', input),
  deleteTopping: (id: string) =>
    request<void>(`toppings/${encodeURIComponent(id)}`, 'DELETE'),
};
