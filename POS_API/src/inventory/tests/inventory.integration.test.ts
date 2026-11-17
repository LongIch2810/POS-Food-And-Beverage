import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';
import { captureSql, lockSequence } from '../../database/tests/sql-capture';
import { InventoryService } from '../inventory.service';
import { PromotionsService } from '../../promotions/promotions.service';

test('PB-08 BR-13/44/45/48/72 inventory schema and append-only ledger on PostgreSQL', { timeout: 120_000 }, async () => {
  const name = `pos_pb08_test_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  await dataSource.initialize();
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    await db.initialize();
    await db.runMigrations();
    const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('ingredients','product_size_ingredients','topping_ingredients','branch_ingredient_stocks','stock_movements')");
    assert.deepEqual(tables.map((row: { table_name: string }) => row.table_name).sort(), [
      'branch_ingredient_stocks', 'ingredients', 'product_size_ingredients', 'stock_movements', 'topping_ingredients',
    ]);
    const permissions = await db.query("SELECT code FROM permissions WHERE code IN ('inventory.view','inventory.manage')");
    assert.equal(permissions.length, 2);
    const trigger = await db.query("SELECT tgname FROM pg_trigger WHERE tgrelid='stock_movements'::regclass AND NOT tgisinternal");
    assert.ok(trigger.some((row: { tgname: string }) => row.tgname === 'stock_movements_append_only'));
    assert.ok(trigger.some((row: { tgname: string }) => row.tgname === 'stock_movements_apply'));
    const store = randomUUID(), branch = randomUUID(), ingredient = randomUUID(), actor = randomUUID(), movement = randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2)',[store,'PB08 store']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)',[branch,store,'B1','PB08 branch']);
    await db.query("INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash) VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='MANAGER'),$4,$5,$6)",
      [actor,store,branch,'PB08 Manager','pb08_manager','test-hash']);
    await db.query('INSERT INTO ingredients(id,store_id,name,unit) VALUES($1,$2,$3,$4)',[ingredient,store,'Sugar','g']);
    await db.query("INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,created_by,created_at) VALUES($1,$2,$3,'IMPORT','1.500',0,$4,'2026-11-07T12:00:00.123456Z')",
      [movement,branch,ingredient,actor]);
    const [stock] = await db.query('SELECT current_stock FROM branch_ingredient_stocks WHERE branch_id=$1 AND ingredient_id=$2',[branch,ingredient]);
    const [entry] = await db.query('SELECT balance_after FROM stock_movements WHERE id=$1',[movement]);
    assert.equal(stock.current_stock,'1.500','BR-45 atomic balance equals sum of movements');
    assert.equal(entry.balance_after,'1.500');
    await assert.rejects(db.query('UPDATE stock_movements SET quantity=2 WHERE id=$1',[movement]),
      (error: any) => error.code === '23514','BR-44 ledger cannot be updated');
    await assert.rejects(db.query('DELETE FROM stock_movements WHERE id=$1',[movement]),
      (error: any) => error.code === '23514','BR-44 ledger cannot be deleted');
    const user = { id:actor,username:'pb08_manager',fullName:'PB08 Manager',role:'MANAGER',storeId:store,
      branchId:branch,permissions:['inventory.view','inventory.manage','menu.manage','promotion.manage'],mustChangePassword:false };
    const inventory = new InventoryService(db);
    await db.query("INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,created_by,created_at) VALUES($1,$2,$3,'IMPORT','0.500',0,$4,'2026-11-07T12:00:00.123455Z')",
      [randomUUID(),branch,ingredient,actor]);
    const firstMovementPage = await inventory.listMovements(user,{limit:'1'});
    const secondMovementPage = await inventory.listMovements(user,{limit:'1',cursor:firstMovementPage.meta.nextCursor});
    assert.equal(firstMovementPage.data[0].id,movement);
    assert.equal(secondMovementPage.data.length,1,'BR-44 microsecond cursor cannot skip neighboring movement');
    const created = await inventory.createIngredient(user,{name:'Milk',unit:'ml'});
    await assert.rejects(inventory.createIngredient(user,{name:'Bad unit',unit:['g']}),
      (error:any) => error.getResponse?.().code === 'VALIDATION_ERROR','BR-13 malformed unit is a client error');
    await assert.rejects(inventory.listStocks(user,{ingredientId:'-'.repeat(36)}),
      (error:any) => error.getResponse?.().code === 'VALIDATION_ERROR','BR-80 malformed UUID is a client error');
    await assert.rejects(inventory.createIngredient(user,{name:'milk',unit:'ml'}),
      (error:any) => error.getResponse?.().code === 'DUPLICATE_INGREDIENT_NAME','BR-13 name unique without case');
    const stockView = await inventory.setMin(user,created.id,{minStock:'10.000'});
    assert.equal(stockView.currentStock,'0.000');
    await assert.rejects(inventory.patchIngredient(user,created.id,{unit:'g'}),
      (error:any) => error.getResponse?.().code === 'RESOURCE_IN_USE','BR-48 unit cannot change after stock exists');
    const visible = await inventory.listStocks(user,{});
    assert.ok(visible.data.some((row:any) => row.ingredientId === created.id && row.minStock === '10.000'));
    const firstStockPage = await inventory.listStocks(user,{limit:'1'});
    const nextStockPage = await inventory.listStocks(user,{limit:'1',cursor:firstStockPage.meta.nextCursor});
    assert.equal(firstStockPage.data.length,1); assert.equal(nextStockPage.data.length,1);
    assert.notEqual(firstStockPage.data[0].ingredientId,nextStockPage.data[0].ingredientId,'BR-72 cursor must advance');
    await assert.rejects(inventory.listStocks(user,{cursor:Buffer.from(JSON.stringify({
      scope:JSON.stringify(['stocks',store,branch,null]),key:'-'.repeat(36),id:ingredient})).toString('base64url')}),
      (error:any) => error.getResponse?.().code === 'VALIDATION_ERROR','BR-80 malformed cursor is a client error');
    const category=randomUUID(),size=randomUUID(),product=randomUUID(),productSize=randomUUID(),topping=randomUUID();
    await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)',[category,store,'Drinks']);
    await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)',[size,store,'M']);
    await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)',[product,category,'Tea']);
    await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,10000)',[productSize,product,size]);
    await db.query('INSERT INTO toppings(id,store_id,name,price) VALUES($1,$2,$3,1000)',[topping,store,'Pearls']);
    assert.equal((await inventory.putRecipe(user,'product',productSize,{ingredients:[{ingredientId:created.id,quantity:'1.500'}]})).length,1);
    await inventory.patchIngredient(user,created.id,{isActive:false});
    assert.equal((await inventory.putRecipe(user,'product',productSize,{ingredients:[{ingredientId:created.id,quantity:'1.500'}]})).length,1,
      'BR-48 existing inactive line may remain');
    const inactive = await inventory.createIngredient(user,{name:'Inactive',unit:'g'});
    await inventory.patchIngredient(user,inactive.id,{isActive:false});
    await assert.rejects(inventory.putRecipe(user,'product',productSize,{ingredients:[{ingredientId:inactive.id,quantity:'1.000'}]}),
      (error:any) => error.getResponse?.().code === 'INGREDIENT_INACTIVE');
    const foreignStore=randomUUID(),foreignIngredient=randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2)',[foreignStore,'Foreign']);
    await db.query('INSERT INTO ingredients(id,store_id,name,unit) VALUES($1,$2,$3,$4)',[foreignIngredient,foreignStore,'Foreign sugar','g']);
    await assert.rejects(inventory.putRecipe(user,'product',productSize,{ingredients:[{ingredientId:foreignIngredient,quantity:'1.000'}]}),
      (error:any) => error.getResponse?.().code === 'NOT_FOUND');
    assert.equal((await inventory.getRecipe(user,'product',productSize))[0].ingredientId,created.id,'BR-48 rejected replacement rolls back');
    assert.equal((await inventory.putRecipe(user,'topping',topping,{ingredients:[{ingredientId:ingredient,quantity:'2.000'}]})).length,1);
    assert.deepEqual(await inventory.putRecipe(user,'topping',topping,{ingredients:[]}),[],'BR-49 empty topping recipe');
    const owner = { ...user, branchId: null, role: 'OWNER' };
    await assert.rejects(inventory.listStocks(owner,{branchId:randomUUID()}),
      (error:any) => error.getResponse?.().code === 'NOT_FOUND','BR-80 unknown branch must not look like empty stock');
    await assert.rejects(inventory.listMovements(owner,{ingredientId:randomUUID()}),
      (error:any) => error.getResponse?.().code === 'NOT_FOUND','BR-80 unknown ingredient must not look like empty ledger');
    const promo = new PromotionsService(db);
    const terms = {code:' save10 ',discountType:'PERCENT',discountValue:10,startAt:'2026-11-13T00:00:00Z',
      endAt:'2026-11-20T00:00:00Z'};
    const saved = await promo.create(user,terms);
    assert.equal(saved.code,'SAVE10');
    await db.query('UPDATE promotion_codes SET used_count=1 WHERE id=$1',[saved.id]);
    await assert.rejects(promo.patch(user,saved.id,{discountValue:20}),
      (error:any) => error.getResponse?.().code === 'PROMOTION_ALREADY_USED','BR-36 used promotion terms locked');
    assert.equal((await promo.patch(user,saved.id,{name:'After use'})).name,'After use');
    await assert.rejects(promo.create(user,{...terms,code:'SAVE10'}),
      (error:any) => error.getResponse?.().code === 'DUPLICATE_PROMOTION_CODE');
    assert.equal(promo.calculate({is_active:true,start_at:terms.startAt,end_at:terms.endAt,discount_type:'PERCENT',
      discount_value:'10',max_discount_amount:null,min_order_amount:null,usage_limit:null,used_count:0},101n,
      new Date('2026-11-14T00:00:00Z')).discount,10n);
  } finally {
    if (db.isInitialized) await db.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});

 test('ST-4 promotions behavior', { timeout: 120_000 }, async (t) => {
  const name = `pos_st4_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  await dataSource.initialize();
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    await db.initialize();
    await db.runMigrations();
    const store = randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2)', [store, 'ST4']);
    const user = { id: randomUUID(), username: 'st4', fullName: 'ST4', role: 'OWNER', storeId: store,
      branchId: null, permissions: ['promotion.manage'], mustChangePassword: false };
    const service = new PromotionsService(db);
    const promo = await service.create(user, { code: 'SALE10', discountType: 'PERCENT', discountValue: 10,
      startAt: '2026-11-01T00:00:00Z', endAt: '2026-12-01T00:00:00Z' });
    await t.test('test_ST4_AC1_patch_lock_sequence', async (t) => {
      const sql = captureSql(t);
      await service.patch(user, promo.id, { name: 'Locked' });
      assert.deepEqual(lockSequence(sql), ['UPDATE:promotion_codes']);
    });
    await t.test('test_ST4_AC2_patch_returns_updated_row', async () => {
      const result = await service.patch(user, promo.id, { name: 'Updated' });
      assert.equal(Array.isArray(result), false);
      assert.equal(result.id, promo.id);
      assert.equal(result.code, 'SALE10');
      assert.equal(result.name, 'Updated');
      assert.equal(result.discountValue, 10);
      assert.equal(typeof result.discountValue, 'number');
    });
    await t.test('test_ST4_AC3_promotions_cursor_keeps_microseconds', async () => {
      const older = randomUUID();
      await db.query("UPDATE promotion_codes SET created_at='2026-11-16T01:00:00.000002Z' WHERE id=$1", [promo.id]);
      await db.query("INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,start_at,end_at,created_at) VALUES($1,$2,'OLDER','PERCENT',10,'2026-11-01','2026-12-01','2026-11-16T01:00:00.000001Z')", [older, store]);
      const first = await service.list(user, { limit: '1' });
      assert.equal(first.data[0].id, promo.id);
      assert.equal(first.meta.total, 2);
      assert.ok(first.meta.nextCursor);
      const second = await service.list(user, { limit: '1', cursor: first.meta.nextCursor });
      assert.equal(second.data[0].id, older);
      assert.equal(second.meta.total, 2);
    });
    await t.test('test_ST4_list_filters_and_store_scope', async () => {
      const foreignStore = randomUUID();
      await db.query('INSERT INTO stores(id,name) VALUES($1,$2)', [foreignStore, 'Foreign ST4']);
      const terms = { discountType: 'PERCENT', discountValue: 10,
        startAt: '2026-11-01T00:00:00Z', endAt: '2026-12-01T00:00:00Z' };
      await service.create(user, { ...terms, code: 'SALEINACTIVE', isActive: false });
      await service.create({ ...user, storeId: foreignStore }, { ...terms, code: 'SALEFOREIGN' });
      const result = await service.list(user, { q: 'SALE%', isActive: 'true' });
      assert.deepEqual(result.data.map(row => row.id), [promo.id]);
      assert.equal(result.meta.total, 1);
    });
  } finally {
    if (db.isInitialized) await db.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});

test('ST-4 promotions HTTP contract', { timeout: 120_000 }, async (t) => {
  const name = `pos_st4_http_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities, migrations: dataSource.options.migrations });
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
    await dataSource.query(`CREATE DATABASE "${name}"`); created = true;
    await db.initialize(); await db.runMigrations(); await bootstrapAdmin(db);
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DataSource).useValue(db).compile();
    const app = module.createNestApplication({ logger: false });
    try {
      await app.listen(0, '127.0.0.1');
      const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
      type Session = { cookie: string; csrf: string };
      const request = async (session: Session, path: string, method = 'GET', body?: unknown) => {
        const response = await fetch(`${base}${path}`, { method, headers: { Cookie: session.cookie,
          Origin: process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token': session.csrf,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        return { status: response.status, json: await response.json() };
      };
      const login = async (username: string, pass: string): Promise<Session> => {
        const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: process.env.PUBLIC_ORIGIN!,
          'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: pass }) });
        assert.equal(response.status, 200);
        const cookies = response.headers.getSetCookie().map(value => value.split(';')[0]);
        return { cookie: cookies.join('; '), csrf: cookies.find(value => value.startsWith('__Host-pos_csrf='))!.slice(16) };
      };
      const admin = await login('admin', password);
      const store = await request(admin, '/platform/stores', 'POST', { name: 'ST4 HTTP', owner: { username: 'st4_owner', fullName: 'ST4 Owner' } });
      assert.equal(store.status, 201);
      await db.query('UPDATE users SET must_change_password=false WHERE id=$1', [store.json.data.owner.id]);
      const owner = await login('st4_owner', store.json.data.temporaryPassword);
      const terms = { code: 'SALE10', discountType: 'PERCENT', discountValue: 10,
        startAt: '2026-11-01T00:00:00Z', endAt: '2026-12-01T00:00:00Z' };
      const sale = await request(owner, '/promotion-codes', 'POST', terms);
      assert.equal(sale.status, 201);
      const duplicate = await request(owner, '/promotion-codes', 'POST', terms);
      assert.equal(duplicate.status, 409);
      assert.equal(duplicate.json.error.code, 'DUPLICATE_PROMOTION_CODE');
      assert.equal(duplicate.json.error.message, 'Mã giảm giá đã tồn tại.');
      const patched = await request(owner, `/promotion-codes/${sale.json.data.id}`, 'PATCH', { name: 'Updated' });
      assert.equal(patched.status, 200);
      assert.equal(Array.isArray(patched.json.data), false);
      assert.equal(patched.json.data.id, sale.json.data.id);
      assert.equal(patched.json.data.code, 'SALE10');
      assert.equal(patched.json.data.discountValue, 10);
      assert.equal(typeof patched.json.data.discountValue, 'number');
      const older = await request(owner, '/promotion-codes', 'POST', { ...terms, code: 'OLDER' });
      assert.equal(older.status, 201);
      await db.query("UPDATE promotion_codes SET created_at='2026-11-16T01:00:00.000002Z' WHERE id=$1", [sale.json.data.id]);
      await db.query("UPDATE promotion_codes SET created_at='2026-11-16T01:00:00.000001Z' WHERE id=$1", [older.json.data.id]);
      const first = await request(owner, '/promotion-codes?limit=1');
      assert.equal(first.status, 200);
      assert.equal(first.json.data[0].id, sale.json.data.id);
      assert.equal(first.json.meta.total, 2);
      assert.ok(first.json.meta.nextCursor);
      const second = await request(owner, `/promotion-codes?limit=1&cursor=${encodeURIComponent(first.json.meta.nextCursor)}`);
      assert.equal(second.status, 200);
      assert.equal(second.json.data[0].id, older.json.data.id);
      assert.equal(second.json.meta.total, 2);
      const filterStore = await request(admin, '/platform/stores', 'POST', { name: 'ST4B HTTP', owner: { username: 'st4b_owner', fullName: 'ST4B Owner' } });
      assert.equal(filterStore.status, 201);
      await db.query('UPDATE users SET must_change_password=false WHERE id=$1', [filterStore.json.data.owner.id]);
      const filterOwner = await login('st4b_owner', filterStore.json.data.temporaryPassword);
      for (const body of [{ code: 'SALE10', name: 'Giảm 10' }, { code: 'VIP20', name: 'Khách VIP', isActive: false }, { code: 'TET', name: null }]) {
        assert.equal((await request(filterOwner, '/promotion-codes', 'POST', { ...terms, ...body })).status, 201);
      }
      const total = async (query: string) => {
        const result = await request(filterOwner, `/promotion-codes?${query}`);
        const all = await request(filterOwner, `/promotion-codes?${query}&limit=100`);
        assert.equal(result.status, 200);
        assert.equal(all.json.meta.total, all.json.data.length);
        return result.json.meta.total;
      };
      await t.test('test_ST4b_AC3_total_matches_filters', async () => {
        assert.equal(await total('q=vip'), 1);
        assert.equal(await total('isActive=true'), 2);
        assert.equal(await total('q=sale&isActive=false'), 0);
      });
    } finally { await app.close(); }
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    if (dataSource.isInitialized) await dataSource.destroy();
  }
});

test('ST-8 inventory scope, ingredients and recipes', { timeout: 180_000 }, async (t) => {
  const name = `pos_st8_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  await dataSource.initialize();
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    await db.initialize();
    await db.runMigrations();
    const store = randomUUID(), branch = randomUUID(), actor = randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2)', [store, 'ST8']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)', [branch, store, 'B1', 'ST8 branch']);
    await db.query("INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash) VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='MANAGER'),$4,$5,$6)",
      [actor, store, branch, 'ST8 Manager', 'st8_manager', 'test-hash']);
    const user = { id: actor, username: 'st8_manager', fullName: 'ST8 Manager', role: 'MANAGER', storeId: store,
      branchId: branch, permissions: ['inventory.view', 'inventory.manage'], mustChangePassword: false };
    const owner = { ...user, branchId: null, role: 'OWNER' };
    const service = new InventoryService(db);
    const category = randomUUID(), size = randomUUID(), product = randomUUID(), productSize = randomUUID(), topping = randomUUID();
    await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)', [category, store, 'Drinks']);
    await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)', [size, store, 'M']);
    await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)', [product, category, 'Tea']);
    await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,10000)', [productSize, product, size]);
    await db.query('INSERT INTO toppings(id,store_id,name,price) VALUES($1,$2,$3,1000)', [topping, store, 'Pearls']);
    const sua = await service.createIngredient(user, { name: 'Sữa', unit: 'ml' });
    const duong = await service.createIngredient(user, { name: 'đường', unit: 'g' });

    await t.test('test_ST8_AC1_inventory_lock_sequences', async (t) => {
      const sql = captureSql(t);
      await service.patchIngredient(user, sua.id, { name: 'Sữa tươi' });
      assert.deepEqual(lockSequence(sql), ['UPDATE:ingredients']);
      sql.length = 0;
      await service.putRecipe(user, 'product', productSize, { ingredients: [
        { ingredientId: sua.id, quantity: '1.500' }, { ingredientId: duong.id, quantity: '2.000' }] });
      assert.deepEqual(lockSequence(sql), ['UPDATE:product_sizes', 'UPDATE:ingredients', 'UPDATE:ingredients']);
      sql.length = 0;
      await service.getRecipe(user, 'topping', topping);
      assert.deepEqual(lockSequence(sql), ['UPDATE:toppings']);
    });

    await t.test('test_ST8_AC2_unit_change_blocked_by_movement', async () => {
      const movementOnly = await service.createIngredient(user, { name: 'Ledger only', unit: 'g' });
      await db.query("INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,created_by) VALUES($1,$2,$3,'IMPORT','1.000',0,$4)",
        [randomUUID(), branch, movementOnly.id, actor]);
      await db.query('ALTER TABLE branch_ingredient_stocks DISABLE TRIGGER USER');
      await db.query('DELETE FROM branch_ingredient_stocks WHERE ingredient_id=$1', [movementOnly.id]);
      await db.query('ALTER TABLE branch_ingredient_stocks ENABLE TRIGGER USER');
      await assert.rejects(service.patchIngredient(user, movementOnly.id, { unit: 'ml' }), (error: any) =>
        error.getResponse?.().code === 'RESOURCE_IN_USE' && error.getResponse().message === 'Đơn vị gốc đã được dùng, không thể thay đổi.');
      const unused = await service.createIngredient(user, { name: 'Unused', unit: 'g' });
      assert.equal((await service.patchIngredient(user, unused.id, { unit: 'ml' })).unit, 'ml');
    });

    await t.test('test_ST8_AC2_recipe_blocks_unit_change', async () => {
      await assert.rejects(service.patchIngredient(user, sua.id, { unit: 'g' }), (error: any) =>
        error.getResponse?.().code === 'RESOURCE_IN_USE');
      const toppingOnly = await service.createIngredient(user, { name: 'Topping only', unit: 'g' });
      await service.putRecipe(user, 'topping', topping, { ingredients: [{ ingredientId: toppingOnly.id, quantity: '1.000' }] });
      await assert.rejects(service.patchIngredient(user, toppingOnly.id, { unit: 'ml' }), (error: any) =>
        error.getResponse?.().code === 'RESOURCE_IN_USE');
    });

    await t.test('test_ST8_AC3_patch_ingredient_returns_row', async () => {
      const row = await service.createIngredient(user, { name: 'Sữa đặc', unit: 'ml' });
      const patched = await service.patchIngredient(user, row.id, { isActive: false });
      assert.equal(Array.isArray(patched), false);
      assert.deepEqual({ id: patched.id, name: patched.name, unit: patched.unit, isActive: patched.isActive },
        { id: row.id, name: 'Sữa đặc', unit: 'ml', isActive: false });
      for (const value of [patched.createdAt, patched.updatedAt]) {
        assert.match(value, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
        assert.equal(new Date(value).toISOString(), value);
      }
      assert.equal(patched.createdAt, row.createdAt);
      assert.ok(patched.updatedAt >= row.updatedAt);
    });

    await t.test('test_ST8_create_duplicate_and_scope_errors', async () => {
      const created = await service.createIngredient(user, { name: ' Bột ', unit: 'piece' });
      assert.equal(created.name, 'Bột');
      assert.match(created.createdAt, /^\d{4}-\d\d-\d\dT/);
      await assert.rejects(service.createIngredient(user, { name: 'BỘT', unit: 'g' }), (error: any) =>
        error.getResponse?.().code === 'DUPLICATE_INGREDIENT_NAME');
      await assert.rejects(service.patchIngredient(user, created.id, { name: 'sữa tươi' }), (error: any) =>
        error.getResponse?.().code === 'DUPLICATE_INGREDIENT_NAME');
      await assert.rejects(service.patchIngredient(user, randomUUID(), { name: 'X' }), (error: any) =>
        error.getResponse?.().code === 'NOT_FOUND' && error.getResponse().message === 'Không tìm thấy nguyên liệu.');
      const otherStore = randomUUID(), otherIngredient = randomUUID(), otherTopping = randomUUID();
      await db.query('INSERT INTO stores(id,name) VALUES($1,$2)', [otherStore, 'ST8 other']);
      await db.query('INSERT INTO ingredients(id,store_id,name,unit) VALUES($1,$2,$3,$4)', [otherIngredient, otherStore, 'Other', 'g']);
      await db.query('INSERT INTO toppings(id,store_id,name,price) VALUES($1,$2,$3,1000)', [otherTopping, otherStore, 'Other topping']);
      await assert.rejects(service.patchIngredient(user, otherIngredient, { name: 'Taken' }), (error: any) =>
        error.getResponse?.().code === 'NOT_FOUND');
      await assert.rejects(service.getRecipe(user, 'topping', otherTopping), (error: any) =>
        error.getResponse?.().code === 'NOT_FOUND' && error.getResponse().message === 'Không tìm thấy món hoặc topping.');
      const otherProductSize = randomUUID(), otherCategory = randomUUID(), otherSize = randomUUID(), otherProduct = randomUUID();
      await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)', [otherCategory, otherStore, 'Other']);
      await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)', [otherSize, otherStore, 'L']);
      await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)', [otherProduct, otherCategory, 'Other tea']);
      await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,10000)', [otherProductSize, otherProduct, otherSize]);
      await assert.rejects(service.getRecipe(user, 'product', otherProductSize), (error: any) =>
        error.getResponse?.().code === 'NOT_FOUND' && error.getResponse().message === 'Không tìm thấy món hoặc topping.');
      await assert.rejects(service.listStocks(owner, { branchId: branch, ingredientId: otherIngredient }), (error: any) =>
        error.getResponse?.().code === 'NOT_FOUND' && error.getResponse().message === 'Không tìm thấy nguyên liệu.');
      await assert.rejects(service.listStocks(owner, { branchId: randomUUID() }), (error: any) =>
        error.getResponse?.().code === 'NOT_FOUND' && error.getResponse().message === 'Không tìm thấy chi nhánh.');
    });

    await t.test('test_ST8_list_ingredients_filter_total_and_cursor', async () => {
      const alpha = await service.createIngredient(user, { name: 'Alpha%', unit: 'g' });
      await service.createIngredient(user, { name: 'beta', unit: 'g' });
      await service.createIngredient(user, { name: 'Gamma', unit: 'g' });
      await service.patchIngredient(user, alpha.id, { isActive: false });
      const inactive = await service.listIngredients(user, { isActive: 'false', q: 'ALPHA' });
      assert.deepEqual(inactive.data.map((row: any) => row.name), ['Alpha%']);
      assert.equal(inactive.meta.total, 1);
      const active = await service.listIngredients(user, { isActive: 'true', q: 'a' });
      assert.ok(active.data.length > 0 && active.data.every((row: any) => /a/i.test(row.name) && row.isActive));
      assert.equal(active.meta.total, active.data.length);
      const names: string[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 40; i++) {
        const page: any = await service.listIngredients(user, { limit: '2', ...(cursor ? { cursor } : {}) });
        names.push(...page.data.map((row: any) => row.name));
        if (!page.meta.nextCursor) break;
        cursor = page.meta.nextCursor;
      }
      const expected = await db.query('SELECT name FROM ingredients WHERE store_id=$1 ORDER BY lower(name),id', [store]);
      assert.deepEqual(names, expected.map((row: any) => row.name), 'pages follow PostgreSQL lower(name), id order');
      assert.ok(names.includes('Alpha%') && names.includes('beta') && names.includes('Gamma'));
      assert.equal(names.length, (await service.listIngredients(user, { limit: '100' })).meta.total);
    });

    await t.test('test_ST8_recipe_order_numeric_and_replace', async () => {
      const apple = await service.createIngredient(user, { name: 'Apple', unit: 'g' });
      const banana = await service.createIngredient(user, { name: 'banana', unit: 'g' });
      const cherry = await service.createIngredient(user, { name: 'Cherry', unit: 'g' });
      const put = await service.putRecipe(user, 'product', productSize, { ingredients: [
        { ingredientId: cherry.id, quantity: '3' }, { ingredientId: apple.id, quantity: '1.250' }, { ingredientId: banana.id, quantity: '0.5' }] });
      assert.deepEqual(put, [
        { ingredientId: apple.id, ingredientName: 'Apple', unit: 'g', quantity: '1.250' },
        { ingredientId: banana.id, ingredientName: 'banana', unit: 'g', quantity: '0.500' },
        { ingredientId: cherry.id, ingredientName: 'Cherry', unit: 'g', quantity: '3.000' }]);
      assert.deepEqual(await service.getRecipe(user, 'product', productSize), put);
      await service.patchIngredient(user, banana.id, { isActive: false });
      const same = await service.putRecipe(user, 'product', productSize, { ingredients: [{ ingredientId: banana.id, quantity: '0.50' }] });
      assert.deepEqual(same.map((row: any) => [row.ingredientId, row.quantity]), [[banana.id, '0.500']]);
      await assert.rejects(service.putRecipe(user, 'product', productSize, { ingredients: [{ ingredientId: banana.id, quantity: '0.6' }] }),
        (error: any) => error.getResponse?.().code === 'INGREDIENT_INACTIVE' && error.getResponse().message === 'Nguyên liệu đã ngưng dùng.');
      assert.deepEqual((await service.getRecipe(user, 'product', productSize)).map((row: any) => row.quantity), ['0.500']);
      assert.deepEqual(await service.putRecipe(user, 'product', productSize, { ingredients: [] }), []);
    });
  } finally {
    if (db.isInitialized) await db.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});

test('ST-9 inventory stocks, minimum levels and ledger', { timeout: 180_000 }, async (t) => {
  const name = `pos_st9_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  await dataSource.initialize();
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    await db.initialize();
    await db.runMigrations();
    const service = new InventoryService(db);
    const actor = randomUUID();
    const seedStore = async (label: string, branches: number) => {
      const store = randomUUID();
      await db.query('INSERT INTO stores(id,name) VALUES($1,$2)', [store, label]);
      const ids: string[] = [];
      for (let i = 0; i < branches; i++) {
        ids.push(randomUUID());
        await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)', [ids[i], store, `B${i}`, `${label} branch ${i}`]);
      }
      const owner = { id: actor, username: 'st9_owner', fullName: 'ST9', role: 'OWNER', storeId: store, branchId: null,
        permissions: ['inventory.view', 'inventory.manage'], mustChangePassword: false };
      return { store, ids, owner };
    };
    const stocks = await seedStore('ST9 stocks', 2);
    const [branchA, branchB] = stocks.ids;
    const manager = { ...stocks.owner, role: 'MANAGER', branchId: branchA };
    const x = await service.createIngredient(stocks.owner, { name: 'X sugar', unit: 'g' });
    const y = await service.createIngredient(stocks.owner, { name: 'Y milk', unit: 'ml' });
    const other = await seedStore('ST9 other store', 1);
    await service.createIngredient(other.owner, { name: 'Other store ingredient', unit: 'g' });
    await db.query('INSERT INTO branch_ingredient_stocks(branch_id,ingredient_id,current_stock,min_stock) VALUES($1,$2,5,1)', [branchA, x.id]);

    await t.test('test_ST9_AC2_stocks_include_missing_stock_rows', async () => {
      const result = await service.listStocks(stocks.owner, { limit: '100' });
      assert.equal(result.meta.total, 4);
      const pairs = [branchA, branchB].sort().flatMap(branch => [x.id, y.id].sort().map(ingredient => [branch, ingredient]));
      assert.deepEqual(result.data.map((row: any) => [row.branchId, row.ingredientId]), pairs);
      const byPair = (branch: string, ingredient: string) => result.data.find((row: any) => row.branchId === branch && row.ingredientId === ingredient);
      assert.deepEqual([byPair(branchA, x.id).currentStock, byPair(branchA, x.id).minStock], ['5.000', '1.000']);
      for (const [branch, ingredient] of [[branchA, y.id], [branchB, x.id], [branchB, y.id]])
        assert.deepEqual([byPair(branch, ingredient).currentStock, byPair(branch, ingredient).minStock], ['0', '0']);
      assert.deepEqual({ ...byPair(branchA, x.id) }, { branchId: branchA, ingredientId: x.id, ingredientName: 'X sugar', unit: 'g',
        currentStock: '5.000', minStock: '1.000' });
    });

    await t.test('test_ST9_stocks_filters_total_and_cursor', async () => {
      assert.equal((await service.listStocks(stocks.owner, { branchId: branchB, limit: '100' })).meta.total, 2);
      const byIngredient = await service.listStocks(stocks.owner, { ingredientId: y.id, limit: '100' });
      assert.equal(byIngredient.meta.total, 2);
      assert.deepEqual(byIngredient.data.map((row: any) => row.ingredientId), [y.id, y.id]);
      const one = await service.listStocks(stocks.owner, { branchId: branchA, ingredientId: x.id });
      assert.equal(one.meta.total, 1);
      assert.equal(one.data[0].currentStock, '5.000');
      const seen: string[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 6; i++) {
        const page: any = await service.listStocks(stocks.owner, { limit: '1', ...(cursor ? { cursor } : {}) });
        seen.push(...page.data.map((row: any) => `${row.branchId}/${row.ingredientId}`));
        if (!page.meta.nextCursor) break;
        cursor = page.meta.nextCursor;
      }
      const all = await service.listStocks(stocks.owner, { limit: '100' });
      assert.deepEqual(seen, all.data.map((row: any) => `${row.branchId}/${row.ingredientId}`));
      assert.equal(seen.length, 4);
      const scoped = await service.listStocks(manager, { limit: '100' });
      assert.equal(scoped.meta.total, 2);
      assert.ok(scoped.data.every((row: any) => row.branchId === branchA));
    });

    await t.test('test_ST9_AC1_set_min_lock_sequence', async (t) => {
      const sql = captureSql(t);
      await service.setMin(manager, y.id, { minStock: '0.500' });
      assert.deepEqual(lockSequence(sql), ['UPDATE:branches', 'UPDATE:ingredients']);
    });

    await t.test('test_ST9_set_min_not_found_and_scope', async () => {
      const foreign = await seedStore('ST9 foreign', 1);
      const foreignIngredient = await service.createIngredient(foreign.owner, { name: 'Foreign', unit: 'g' });
      for (const [user, ingredient, input] of [
        [stocks.owner, foreignIngredient.id, { branchId: branchA, minStock: '1' }],
        [stocks.owner, x.id, { branchId: foreign.ids[0], minStock: '1' }],
        [stocks.owner, randomUUID(), { branchId: branchA, minStock: '1' }]] as const)
        await assert.rejects(service.setMin(user, ingredient, input), (error: any) =>
          error.getResponse?.().code === 'NOT_FOUND' && error.getResponse().message === 'Không tìm thấy chi nhánh hoặc nguyên liệu.');
    });

    await t.test('test_ST9_AC3_set_min_upsert_values', async () => {
      const first = await service.setMin(stocks.owner, x.id, { branchId: branchB, minStock: '2.500' });
      assert.deepEqual(first, { branchId: branchB, ingredientId: x.id, ingredientName: 'X sugar', unit: 'g',
        currentStock: '0.000', minStock: '2.500' });
      const second = await service.setMin(stocks.owner, x.id, { branchId: branchB, minStock: '3.000' });
      assert.deepEqual([second.currentStock, second.minStock], ['0.000', '3.000']);
      await db.query("INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,created_by,source) VALUES($1,$2,$3,'IMPORT','4.000',0,NULL,'SYSTEM')",
        [randomUUID(), branchB, x.id]);
      const third = await service.setMin(stocks.owner, x.id, { branchId: branchB, minStock: '3.500' });
      assert.deepEqual([third.currentStock, third.minStock], ['4.000', '3.500']);
      const [row] = await db.query('SELECT current_stock,min_stock FROM branch_ingredient_stocks WHERE branch_id=$1 AND ingredient_id=$2', [branchB, x.id]);
      assert.deepEqual([row.current_stock, row.min_stock], ['4.000', '3.500']);
    });

    await t.test('test_ST9_movements_filters_total_and_empty_store', async () => {
      const ledger = await seedStore('ST9 ledger', 2);
      const [a, b] = ledger.ids;
      const p = await service.createIngredient(ledger.owner, { name: 'P', unit: 'g' });
      const q = await service.createIngredient(ledger.owner, { name: 'Q', unit: 'g' });
      const move = (branch: string, ingredient: string, type: string, quantity: string) =>
        db.query("INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,created_by,source) VALUES($1,$2,$3,$4,$5,0,NULL,'SYSTEM')",
          [randomUUID(), branch, ingredient, type, quantity]);
      await move(a, p.id, 'IMPORT', '5.000'); await move(b, p.id, 'IMPORT', '5.000'); await move(b, q.id, 'WASTE', '-1.000');
      for (const [query, total] of [[{}, 3], [{ ingredientId: p.id }, 2], [{ type: 'WASTE' }, 1], [{ branchId: a }, 1],
        [{ ingredientId: p.id, type: 'WASTE' }, 0], [{ branchId: b, ingredientId: q.id, type: 'WASTE' }, 1]] as const) {
        const page = await service.listMovements(ledger.owner, { limit: '100', ...query });
        assert.equal(page.meta.total, total, JSON.stringify(query));
        assert.equal(page.data.length, total);
      }
      const empty = await seedStore('ST9 no branches', 0);
      const none = await service.listMovements(empty.owner, {});
      assert.deepEqual([none.data, none.meta.total], [[], 0]);
    });
  } finally {
    if (db.isInitialized) await db.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});

