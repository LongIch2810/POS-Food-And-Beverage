import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';

test('PB-05 menu and catalog HTTP with PostgreSQL', { timeout: 180_000 }, async (t) => {
  const name = `pos_pb05_test_${randomBytes(6).toString('hex')}`;
  const testUrl = new URL(process.env.DATABASE_URL!);
  testUrl.pathname = `/${name}`;
  const db = new DataSource({
    type: 'postgres',
    url: testUrl.toString(),
    entities: dataSource.options.entities,
    migrations: dataSource.options.migrations,
  });

  process.env.PUBLIC_ORIGIN = 'http://localhost:5173';
  process.env.JWT_SECRET = 'j'.repeat(32);
  process.env.CSRF_SECRET = 'c'.repeat(32);
  process.env.BOOTSTRAP_ADMIN_USERNAME = 'admin';
  process.env.BOOTSTRAP_ADMIN_FULL_NAME = 'QA Admin';
  const password = randomBytes(18).toString('base64url');
  process.env.BOOTSTRAP_ADMIN_PASSWORD = password;

  await dataSource.initialize();
  let created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    created = true;
    await db.initialize();
    await db.runMigrations();
    await bootstrapAdmin(db);

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource)
      .useValue(db)
      .compile();

    const app = module.createNestApplication({ logger: false });
    try {
      await app.listen(0, '127.0.0.1');
      const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
      type Session = { cookie: string; csrf: string };

      const request = async (session: Session, path: string, method = 'GET', body?: unknown) => {
        const response = await fetch(`${base}${path}`, {
          method,
          headers: {
            Cookie: session.cookie,
            Origin: process.env.PUBLIC_ORIGIN!,
            'X-CSRF-Token': session.csrf,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const json = response.status === 204 ? undefined : await response.json();
        return { status: response.status, json, headers: response.headers };
      };

      const login = async (username: string, pass: string): Promise<Session> => {
        const response = await fetch(`${base}/auth/login`, {
          method: 'POST',
          headers: { Origin: process.env.PUBLIC_ORIGIN!, 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password: pass }),
        });
        assert.equal(response.status, 200, 'fixture login');
        const cookies = response.headers.getSetCookie().map((v) => v.split(';')[0]);
        return {
          cookie: cookies.join('; '),
          csrf: cookies.find((v) => v.startsWith('__Host-pos_csrf='))!.slice(16),
        };
      };

      const admin = await login('admin', password);

      // Create Store A and Store B
      const storeResA = await request(admin, '/platform/stores', 'POST', {
        name: 'PB05 Store A',
        owner: { username: 'owner_a', fullName: 'Owner A' },
      });
      assert.equal(storeResA.status, 201);
      const storeResB = await request(admin, '/platform/stores', 'POST', {
        name: 'PB05 Store B',
        owner: { username: 'owner_b', fullName: 'Owner B' },
      });
      assert.equal(storeResB.status, 201);

      const ownerA = await login('owner_a', storeResA.json.data.temporaryPassword);
      const ownerB = await login('owner_b', storeResB.json.data.temporaryPassword);
      await db.query('UPDATE users SET must_change_password=false WHERE id IN ($1, $2)', [
        storeResA.json.data.owner.id,
        storeResB.json.data.owner.id,
      ]);

      // Create Branch in Store A to create Cashier
      const branchRes = await request(ownerA, '/branches', 'POST', { code: 'A1', name: 'Chi nhanh A1' });
      assert.equal(branchRes.status, 201);
      const branchAId = branchRes.json.data.id;

      const cashierRes = await request(ownerA, '/users', 'POST', {
        branchId: branchAId,
        username: 'cashier_a',
        fullName: 'Thu Ngan A',
        role: 'CASHIER',
      });
      assert.equal(cashierRes.status, 201);
      const cashierA = await login('cashier_a', cashierRes.json.data.temporaryPassword);
      await db.query('UPDATE users SET must_change_password=false WHERE id = $1', [cashierRes.json.data.user.id]);

      let catCoffeeId = '';
      let catTeaId = '';
      let sizeMId = '';
      let sizeLId = '';
      let productCoffeeId = '';
      let productSizeMId = '';
      let toppingPearlId = '';

      // --- MENU-01: Categories CRUD & Constraints ---
      await t.test('MENU-01: Categories CRUD, uniqueness, tenant isolation, delete constraint', async () => {
        // Create category
        const catRes = await request(ownerA, '/categories', 'POST', {
          name: '  Cà phê  ',
          description: 'Cà phê nguyên chất',
          sortOrder: 1,
        });
        assert.equal(catRes.status, 201);
        catCoffeeId = catRes.json.data.id;
        assert.equal(catRes.json.data.name, 'Cà phê');
        assert.equal(catRes.json.data.sortOrder, 1);
        assert.equal(catRes.json.data.isActive, true);

        // Duplicate name in same store -> 409
        const dupRes = await request(ownerA, '/categories', 'POST', { name: 'Cà phê' });
        assert.equal(dupRes.status, 409);

        // Same name in different store B -> 201 succeeds
        const storeBCat = await request(ownerB, '/categories', 'POST', { name: 'Cà phê' });
        assert.equal(storeBCat.status, 201);

        // Store B cannot patch Store A's category -> 404
        const crossPatch = await request(ownerB, `/categories/${catCoffeeId}`, 'PATCH', { name: 'Hack' });
        assert.equal(crossPatch.status, 404);

        // Create second category for delete testing
        const catTemp = await request(ownerA, '/categories', 'POST', { name: 'Danh mục tạm' });
        assert.equal(catTemp.status, 201);
        const tempId = catTemp.json.data.id;

        // Delete empty category succeeds -> 204
        const delEmpty = await request(ownerA, `/categories/${tempId}`, 'DELETE');
        assert.equal(delEmpty.status, 204);

        // Create Cat Tea
        const catTeaRes = await request(ownerA, '/categories', 'POST', { name: 'Trà sữa', sortOrder: 2 });
        assert.equal(catTeaRes.status, 201);
        catTeaId = catTeaRes.json.data.id;

        // List categories
        const listCat = await request(ownerA, '/categories');
        assert.equal(listCat.status, 200);
        assert.equal(listCat.json.data.length, 2);
      });

      // --- MENU-02: Sizes CRUD & Constraints ---
      await t.test('MENU-02: Sizes CRUD, uniqueness, delete', async () => {
        const sizeRes = await request(ownerA, '/sizes', 'POST', { name: ' M ', sortOrder: 1 });
        assert.equal(sizeRes.status, 201);
        sizeMId = sizeRes.json.data.id;
        assert.equal(sizeRes.json.data.name, 'M');

        // Duplicate name in store -> 409
        const dupSize = await request(ownerA, '/sizes', 'POST', { name: 'M' });
        assert.equal(dupSize.status, 409);

        const sizeLRes = await request(ownerA, '/sizes', 'POST', { name: 'L', sortOrder: 2 });
        assert.equal(sizeLRes.status, 201);
        sizeLId = sizeLRes.json.data.id;

        // Patch size
        const patchSize = await request(ownerA, `/sizes/${sizeMId}`, 'PATCH', { sortOrder: 10 });
        assert.equal(patchSize.status, 200);
        assert.equal(patchSize.json.data.sortOrder, 10);

        // List sizes
        const listSizes = await request(ownerA, '/sizes');
        assert.equal(listSizes.status, 200);
        assert.equal(listSizes.json.data.length, 2);
      });

      // --- MENU-03: Products CRUD & Constraints ---
      await t.test('MENU-03: Products CRUD, uniqueness in category, delete constraint', async () => {
        const prodRes = await request(ownerA, '/products', 'POST', {
          categoryId: catCoffeeId,
          name: '  Cà phê sữa đá  ',
          description: 'Cà phê pha phin',
        });
        assert.equal(prodRes.status, 201);
        productCoffeeId = prodRes.json.data.id;
        assert.equal(prodRes.json.data.name, 'Cà phê sữa đá');
        assert.equal(prodRes.json.data.categoryId, catCoffeeId);

        // Duplicate name in same category -> 409
        const dupProd = await request(ownerA, '/products', 'POST', {
          categoryId: catCoffeeId,
          name: 'Cà phê sữa đá',
        });
        assert.equal(dupProd.status, 409);

        // Same name in different category -> 201 succeeds
        const diffCatProd = await request(ownerA, '/products', 'POST', {
          categoryId: catTeaId,
          name: 'Cà phê sữa đá',
        });
        assert.equal(diffCatProd.status, 201);

        // Delete temporary product without sizes -> 204
        const delTempProd = await request(ownerA, `/products/${diffCatProd.json.data.id}`, 'DELETE');
        assert.equal(delTempProd.status, 204);

        // Category with products cannot be deleted -> 409
        const delCatWithProd = await request(ownerA, `/categories/${catCoffeeId}`, 'DELETE');
        assert.equal(delCatWithProd.status, 409);
        assert.equal(delCatWithProd.json.error.code, 'RESOURCE_IN_USE');

        // Test finding #2: Move category without passing name to a category where name already exists -> 409
        const teaProd = await request(ownerA, '/products', 'POST', {
          categoryId: catTeaId,
          name: 'Trà sen vàng',
        });
        assert.equal(teaProd.status, 201);

        const coffeeSenProd = await request(ownerA, '/products', 'POST', {
          categoryId: catCoffeeId,
          name: 'Trà sen vàng',
        });
        assert.equal(coffeeSenProd.status, 201);

        const moveDupCat = await request(ownerA, `/products/${coffeeSenProd.json.data.id}`, 'PATCH', {
          categoryId: catTeaId,
        });
        assert.equal(moveDupCat.status, 409);
        assert.equal(moveDupCat.json.error.code, 'DUPLICATE_RESOURCE');

        await request(ownerA, `/products/${teaProd.json.data.id}`, 'DELETE');
        await request(ownerA, `/products/${coffeeSenProd.json.data.id}`, 'DELETE');
      });

      // --- MENU-04: Product Sizes & Pricing ---
      await t.test('MENU-04: Product sizes and pricing (BR-08, BR-13, BR-103)', async () => {
        // Invalid prices
        for (const price of [-1, 1000000000001]) {
          const invalidPrice = await request(ownerA, `/products/${productCoffeeId}/sizes`, 'POST', {
            sizeId: sizeMId,
            price,
          });
          assert.equal(invalidPrice.status, 422);
        }

        // Add Size M to product with price 29.000
        const psRes = await request(ownerA, `/products/${productCoffeeId}/sizes`, 'POST', {
          sizeId: sizeMId,
          price: 29000,
        });
        assert.equal(psRes.status, 201);
        productSizeMId = psRes.json.data.id;
        assert.equal(psRes.json.data.price, 29000);
        assert.equal(psRes.json.data.isActive, true);

        // Duplicate size on same product -> 409
        const dupSizeOnProd = await request(ownerA, `/products/${productCoffeeId}/sizes`, 'POST', {
          sizeId: sizeMId,
          price: 30000,
        });
        assert.equal(dupSizeOnProd.status, 409);

        // Add Size L with price 39.000
        const psLRes = await request(ownerA, `/products/${productCoffeeId}/sizes`, 'POST', {
          sizeId: sizeLId,
          price: 39000,
        });
        assert.equal(psLRes.status, 201);

        // Size with product_sizes cannot be deleted -> 409
        const delSizeWithPs = await request(ownerA, `/sizes/${sizeMId}`, 'DELETE');
        assert.equal(delSizeWithPs.status, 409);
        assert.equal(delSizeWithPs.json.error.code, 'RESOURCE_IN_USE');

        // Product with sizes cannot be deleted -> 409
        const delProdWithPs = await request(ownerA, `/products/${productCoffeeId}`, 'DELETE');
        assert.equal(delProdWithPs.status, 409);
        assert.equal(delProdWithPs.json.error.code, 'RESOURCE_IN_USE');

        // Patch price (BR-12)
        const patchPs = await request(ownerA, `/product-sizes/${productSizeMId}`, 'PATCH', {
          price: 32000,
        });
        assert.equal(patchPs.status, 200);
        assert.equal(patchPs.json.data.price, 32000);

        // Detail product includes sizes
        const getProd = await request(ownerA, `/products/${productCoffeeId}`);
        assert.equal(getProd.status, 200);
        assert.equal(getProd.json.data.sizes.length, 2);
        const sizeM = getProd.json.data.sizes.find((s: any) => s.sizeId === sizeMId);
        assert.equal(sizeM?.price, 32000);
        const sizeL = getProd.json.data.sizes.find((s: any) => s.sizeId === sizeLId);
        assert.equal(sizeL?.price, 39000);
      });

      // --- MENU-05: Toppings & Category Links ---
      await t.test('MENU-05: Toppings CRUD and category link/unlink (BR-11, BR-13, BR-103)', async () => {
        const topRes = await request(ownerA, '/toppings', 'POST', {
          name: '  Trân châu đen  ',
          price: 5000,
        });
        assert.equal(topRes.status, 201);
        toppingPearlId = topRes.json.data.id;
        assert.equal(topRes.json.data.name, 'Trân châu đen');
        assert.equal(topRes.json.data.price, 5000);

        // Duplicate name -> 409
        const dupTop = await request(ownerA, '/toppings', 'POST', { name: 'Trân châu đen', price: 6000 });
        assert.equal(dupTop.status, 409);

        // Link topping to Category
        const linkRes = await request(ownerA, `/categories/${catCoffeeId}/toppings`, 'POST', {
          toppingId: toppingPearlId,
        });
        assert.equal(linkRes.status, 201);

        // Duplicate link -> 409
        const dupLink = await request(ownerA, `/categories/${catCoffeeId}/toppings`, 'POST', {
          toppingId: toppingPearlId,
        });
        assert.equal(dupLink.status, 409);

        // List category toppings
        const listCatTops = await request(ownerA, `/categories/${catCoffeeId}/toppings`);
        assert.equal(listCatTops.status, 200);
        assert.equal(listCatTops.json.data.length, 1);
        assert.equal(listCatTops.json.data[0].id, toppingPearlId);

        // Topping linked to category cannot be deleted -> 409
        const delTop = await request(ownerA, `/toppings/${toppingPearlId}`, 'DELETE');
        assert.equal(delTop.status, 409);
        assert.equal(delTop.json.error.code, 'RESOURCE_IN_USE');

        // Unlink topping -> 204
        const unlink = await request(ownerA, `/categories/${catCoffeeId}/toppings/${toppingPearlId}`, 'DELETE');
        assert.equal(unlink.status, 204);

        // After unlink, topping can be deleted if no other links
        const topTemp = await request(ownerA, '/toppings', 'POST', { name: 'Thạch dừa', price: 7000 });
        assert.equal(topTemp.status, 201);
        const delTempTop = await request(ownerA, `/toppings/${topTemp.json.data.id}`, 'DELETE');
        assert.equal(delTempTop.status, 204);
      });

      // --- MENU-06: Image Upload & Serving ---
      await t.test('MENU-06: Product image upload, serve binary, delete (BR-105)', async () => {
        // Construct a valid minimal JPEG (SOI FF D8, App0 FF E0 ... EOI FF D9)
        const validJpeg = Buffer.from([
          0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
          0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9,
        ]);

        const boundary = '----WebKitFormBoundary' + randomBytes(8).toString('hex');
        const multipartBody = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="coffee.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
          validJpeg,
          Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        // Upload image
        const uploadRes = await fetch(`${base}/products/${productCoffeeId}/image`, {
          method: 'POST',
          headers: {
            Cookie: ownerA.cookie,
            Origin: process.env.PUBLIC_ORIGIN!,
            'X-CSRF-Token': ownerA.csrf,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body: multipartBody,
        });
        assert.equal(uploadRes.status, 200);
        const uploadJson = await uploadRes.json();
        assert.equal(uploadJson.data.imageUrl, `/api/v1/products/${productCoffeeId}/image`);

        // Read image binary
        const imageRes = await fetch(`${base}/products/${productCoffeeId}/image`, {
          method: 'GET',
          headers: {
            Cookie: ownerA.cookie,
          },
        });
        assert.equal(imageRes.status, 200);
        assert.equal(imageRes.headers.get('Content-Type'), 'image/jpeg');
        const imageBytes = Buffer.from(await imageRes.arrayBuffer());
        assert.equal(imageBytes.length, validJpeg.length);
        assert.equal(imageBytes[0], 0xff);
        assert.equal(imageBytes[1], 0xd8);

        // List products must have imageUrl and NOT Base64
        const listProd = await request(ownerA, '/products');
        assert.equal(listProd.status, 200);
        const coffeeItem = listProd.json.data.find((p: any) => p.id === productCoffeeId);
        assert.equal(coffeeItem.imageUrl, `/api/v1/products/${productCoffeeId}/image`);
        assert.equal(coffeeItem.image_base64, undefined);

        // Delete image
        const delImg = await request(ownerA, `/products/${productCoffeeId}/image`, 'DELETE');
        assert.equal(delImg.status, 204);

        // Image endpoint now returns 404
        const image404 = await fetch(`${base}/products/${productCoffeeId}/image`, {
          headers: { Cookie: ownerA.cookie },
        });
        assert.equal(image404.status, 404);

        // Test finding #5: Upload image > 2MB returns 413 FILE_TOO_LARGE
        const bigBuffer = Buffer.alloc(2000001);
        const bigForm = new FormData();
        bigForm.append('image', new Blob([bigBuffer], { type: 'image/jpeg' }), 'big.jpg');
        const bigRes = await fetch(`${base}/products/${productCoffeeId}/image`, {
          method: 'POST',
          headers: {
            Cookie: ownerA.cookie,
            Origin: process.env.PUBLIC_ORIGIN!,
            'X-CSRF-Token': ownerA.csrf,
          },
          body: bigForm,
        });
        assert.equal(bigRes.status, 413);
        const bigJson = await bigRes.json();
        assert.equal(bigJson.error.code, 'FILE_TOO_LARGE');
      });

      // --- MENU-07: Permissions & Security ---
      await t.test('MENU-07: Permissions, Cashier read-only, Platform Admin blocked (BR-81)', async () => {
        // Platform Admin calling menu route gets 403
        const adminTryMenu = await request(admin, '/categories');
        assert.equal(adminTryMenu.status, 403);
        assert.equal(adminTryMenu.json.error.code, 'PERMISSION_DENIED');

        // Cashier can read categories
        const cashierListCat = await request(cashierA, '/categories');
        assert.equal(cashierListCat.status, 200);

        // Cashier can read products
        const cashierListProd = await request(cashierA, '/products');
        assert.equal(cashierListProd.status, 200);

        // Cashier cannot create category -> 403
        const cashierCreateCat = await request(cashierA, '/categories', 'POST', { name: 'Món cấm' });
        assert.equal(cashierCreateCat.status, 403);
        assert.equal(cashierCreateCat.json.error.code, 'PERMISSION_DENIED');

        // Cashier cannot patch product size price -> 403
        const cashierPatchPrice = await request(cashierA, `/product-sizes/${productSizeMId}`, 'PATCH', { price: 1000 });
        assert.equal(cashierPatchPrice.status, 403);
        assert.equal(cashierPatchPrice.json.error.code, 'PERMISSION_DENIED');
      });

      await app.close();
    } finally {
      await db.destroy();
    }
  } finally {
    if (created) {
      await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    }
    await dataSource.destroy();
  }
});
