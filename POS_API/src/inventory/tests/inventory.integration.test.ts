import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { dataSource } from '../../database/data-source';
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
