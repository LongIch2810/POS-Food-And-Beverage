import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { menuService as service } from '../src/services/menuService.ts';

beforeEach(() => {
  if (typeof globalThis.FormData === 'undefined') {
    globalThis.FormData = class FormData {
      constructor() {
        this.entries = {};
      }
      append(key, value) {
        this.entries[key] = value;
      }
    };
  }
});

afterEach(() => {
  delete globalThis.document;
  delete globalThis.fetch;
});

test('PB13-MENU-HTTP operations preserve endpoints, query params, bodies and CSRF tokens', async () => {
  globalThis.document = { cookie: '__Host-pos_csrf=menu-csrf-token' };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    if (options?.method === 'DELETE') {
      return new Response(null, { status: 204 });
    }
    return Response.json({
      data: [{ id: 'menu-1', name: 'Trà Sữa Oolong' }],
      meta: { limit: 20, nextCursor: 'CURSOR-A', total: 1 },
    });
  };

  // Categories (4)
  const catList = await service.getCategories({ isActive: true, cursor: 'cat-cur' });
  assert.equal(catList.meta.nextCursor, 'CURSOR-A');
  await service.createCategory({ name: 'Trà Sữa', sortOrder: 1 });
  await service.patchCategory('cat-1', { name: 'Trà Sữa Cập Nhật', isActive: false });
  await service.deleteCategory('cat-1');

  // Sizes (4)
  await service.getSizes();
  await service.createSize({ name: 'Lớn (L)', sortOrder: 2 });
  await service.patchSize('size-1', { sortOrder: 3 });
  await service.deleteSize('size-1');

  // Products (5)
  await service.getProducts({ categoryId: 'cat-1', isActive: true });
  await service.getProduct('prod-1');
  await service.createProduct({
    categoryId: 'cat-1',
    name: 'Oolong Nướng',
  });
  await service.patchProduct('prod-1', { isActive: false });
  await service.deleteProduct('prod-1');

  // Product Sizes (3)
  await service.createProductSize('prod-1', { sizeId: 'size-1', price: 35000 });
  await service.patchProductSize('ps-1', { price: 38000 });
  await service.deleteProductSize('ps-1');

  // Toppings (4)
  await service.getToppings({ isActive: true });
  await service.createTopping({ name: 'Trân Châu Đen', price: 8000 });
  await service.patchTopping('top-1', { price: 9000 });
  await service.deleteTopping('top-1');

  // Category Toppings Link (3)
  await service.getCategoryToppings('cat-1');
  await service.linkToppingToCategory('cat-1', 'top-1');
  await service.unlinkToppingFromCategory('cat-1', 'top-1');

  // Total calls = 4 + 4 + 5 + 3 + 4 + 3 = 23
  assert.equal(calls.length, 23);

  // Check Category URLs
  assert.equal(calls[0].url, '/api/v1/categories?limit=20&isActive=true&cursor=cat-cur');
  assert.equal(calls[1].url, '/api/v1/categories');
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[2].url, '/api/v1/categories/cat-1');
  assert.equal(calls[2].method, 'PATCH');
  assert.equal(calls[3].url, '/api/v1/categories/cat-1');
  assert.equal(calls[3].method, 'DELETE');

  // Sizes
  assert.equal(calls[4].url, '/api/v1/sizes');
  assert.equal(calls[5].url, '/api/v1/sizes');
  assert.equal(calls[5].method, 'POST');
  assert.equal(calls[6].url, '/api/v1/sizes/size-1');
  assert.equal(calls[7].url, '/api/v1/sizes/size-1');
  assert.equal(calls[7].method, 'DELETE');

  // Products
  assert.equal(calls[8].url, '/api/v1/products?limit=20&categoryId=cat-1&isActive=true');
  assert.equal(calls[9].url, '/api/v1/products/prod-1');
  assert.equal(calls[10].url, '/api/v1/products');
  assert.equal(calls[10].method, 'POST');
  assert.equal(calls[11].url, '/api/v1/products/prod-1');
  assert.equal(calls[12].url, '/api/v1/products/prod-1');
  assert.equal(calls[12].method, 'DELETE');

  // Product Sizes
  assert.equal(calls[13].url, '/api/v1/products/prod-1/sizes');
  assert.equal(calls[13].method, 'POST');
  assert.equal(calls[14].url, '/api/v1/product-sizes/ps-1');
  assert.equal(calls[14].method, 'PATCH');
  assert.equal(calls[15].url, '/api/v1/product-sizes/ps-1');
  assert.equal(calls[15].method, 'DELETE');

  // Toppings
  assert.equal(calls[16].url, '/api/v1/toppings?limit=20&isActive=true');
  assert.equal(calls[17].url, '/api/v1/toppings');
  assert.equal(calls[18].url, '/api/v1/toppings/top-1');
  assert.equal(calls[19].url, '/api/v1/toppings/top-1');
  assert.equal(calls[19].method, 'DELETE');

  // Category Toppings Link
  assert.equal(calls[20].url, '/api/v1/categories/cat-1/toppings');
  assert.equal(calls[21].url, '/api/v1/categories/cat-1/toppings');
  assert.equal(calls[21].method, 'POST');
  assert.equal(calls[22].url, '/api/v1/categories/cat-1/toppings/top-1');
  assert.equal(calls[22].method, 'DELETE');

  // Verify credentials and CSRF
  for (const call of calls) {
    assert.equal(call.credentials, 'same-origin');
    if (call.method !== 'GET') {
      assert.equal(call.headers['X-CSRF-Token'], 'menu-csrf-token');
    }
  }

  // Verify payloads
  assert.deepEqual(JSON.parse(calls[1].body), { name: 'Trà Sữa', sortOrder: 1 });
  assert.deepEqual(JSON.parse(calls[2].body), { name: 'Trà Sữa Cập Nhật', isActive: false });
  assert.deepEqual(JSON.parse(calls[10].body), {
    categoryId: 'cat-1',
    name: 'Oolong Nướng',
  });
  assert.deepEqual(JSON.parse(calls[13].body), { sizeId: 'size-1', price: 35000 });
  assert.deepEqual(JSON.parse(calls[21].body), { toppingId: 'top-1' });
});

test('PB13-MENU-IMAGE upload uses multipart/form-data and includes CSRF token', async () => {
  globalThis.document = { cookie: '__Host-pos_csrf=image-csrf' };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    return Response.json({
      data: { id: 'prod-1', imageUrl: '/api/v1/products/prod-1/image' },
    });
  };

  const fakeFile = { name: 'test.png', size: 1024, type: 'image/png' };
  const result = await service.uploadProductImage('prod-1', fakeFile);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/v1/products/prod-1/image');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].credentials, 'same-origin');
  assert.equal(calls[0].headers['X-CSRF-Token'], 'image-csrf');
  // Content-Type should NOT be set explicitly so the browser sets boundary
  assert.equal(calls[0].headers['Content-Type'], undefined);
  assert.equal(result.imageUrl, '/api/v1/products/prod-1/image');
});

test('PB13-MENU-ERROR parses backend error response correctly', async () => {
  globalThis.document = { cookie: '__Host-pos_csrf=csrf-token' };
  globalThis.fetch = async () => {
    return Response.json(
      {
        error: {
          code: 'RESOURCE_IN_USE',
          message: 'Không thể xóa danh mục đang có sản phẩm. Hãy chuyển sang ngưng dùng.',
          requestId: 'req-err-409',
        },
      },
      { status: 409 }
    );
  };

  await assert.rejects(
    service.deleteCategory('cat-in-use'),
    (err) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'RESOURCE_IN_USE');
      assert.equal(err.requestId, 'req-err-409');
      assert.ok(err.message.includes('Không thể xóa'));
      return true;
    }
  );
});
