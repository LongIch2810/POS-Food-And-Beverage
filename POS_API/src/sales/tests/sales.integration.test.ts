import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { dataSource } from '../../database/data-source';
import { MenuService } from '../../menu/menu.service';
import { captureSql, lockSequence } from '../../database/tests/sql-capture';
import { SalesService } from '../sales.service';

test('PB-07 BR-16/22/24/26/74/75/90/92 invoices on PostgreSQL', { timeout: 120_000 }, async () => {
  const name = `pos_pb07_test_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  await dataSource.initialize();
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    await db.initialize();
    await db.runMigrations();
    const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('invoices','invoice_items','invoice_item_toppings')");
    assert.deepEqual(tables.map((row: { table_name: string }) => row.table_name).sort(), ['invoice_item_toppings', 'invoice_items', 'invoices']);
    const indexes = await db.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename='invoices'");
    assert.ok(indexes.some((row: { indexname: string; indexdef: string }) => row.indexname === 'uq_invoices_table_open' && row.indexdef.includes('UNIQUE') && row.indexdef.includes('table_id') && row.indexdef.includes('WHERE')));
    const permissions = await db.query("SELECT code FROM permissions WHERE code IN ('pos.sell','invoice.read','invoice.cancel_open','table.read')");
    assert.equal(permissions.length, 4);

    const managerCancel = await db.query("SELECT r.name FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id WHERE p.code='invoice.cancel_open' ORDER BY r.name");
    assert.deepEqual(managerCancel.map((row: { name: string }) => row.name), ['CASHIER', 'MANAGER', 'OWNER'], 'invoice.cancel_open granted to OWNER/MANAGER/CASHIER');

    const store = randomUUID(), branch = randomUUID(), cashier = randomUUID(), shift = randomUUID();
    const tableA = randomUUID(), tableB = randomUUID(), category = randomUUID(), size = randomUUID();
    const product = randomUUID(), productSize = randomUUID(), topping = randomUUID();
    await db.query('INSERT INTO stores (id,name) VALUES ($1,$2)', [store, 'PB07 test store']);
    await db.query('INSERT INTO branches (id,store_id,code,name) VALUES ($1,$2,$3,$4)', [branch, store, 'A1', 'PB07 branch']);
    await db.query(`INSERT INTO users (id,store_id,branch_id,role_id,full_name,username,password_hash)
      VALUES ($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),$4,$5,$6)`, [cashier, store, branch, 'QA Cashier', 'pb07_cashier', 'test-hash']);
    await db.query("INSERT INTO work_shifts (id,branch_id,user_id,shift_type,started_at,status) VALUES ($1,$2,$3,'CASHIER',now() - interval '1 minute','OPEN')", [shift, branch, cashier]);
    await db.query("INSERT INTO cash_reconciliations (id,work_shift_id,opening_cash,status) VALUES ($1,$2,0,'PENDING')", [randomUUID(), shift]);
    await db.query('INSERT INTO dining_tables (id,branch_id,name) VALUES ($1,$2,$3),($4,$2,$5)', [tableA, branch, 'A', tableB, 'B']);
    await db.query('INSERT INTO categories (id,store_id,name) VALUES ($1,$2,$3)', [category, store, 'Drinks']);
    await db.query('INSERT INTO sizes (id,store_id,name) VALUES ($1,$2,$3)', [size, store, 'M']);
    await db.query('INSERT INTO products (id,category_id,name) VALUES ($1,$2,$3)', [product, category, 'Tea']);
    await db.query('INSERT INTO product_sizes (id,product_id,size_id,price) VALUES ($1,$2,$3,10000)', [productSize, product, size]);
    await db.query('INSERT INTO toppings (id,store_id,name,price) VALUES ($1,$2,$3,2000)', [topping, store, 'Pearls']);
    await db.query('INSERT INTO category_toppings (category_id,topping_id) VALUES ($1,$2)', [category, topping]);
    const actor = { id: cashier, username: 'pb07_cashier', fullName: 'QA Cashier', role: 'CASHIER', storeId: store,
      branchId: branch, permissions: ['pos.sell', 'invoice.read', 'invoice.cancel_open', 'table.read'], mustChangePassword: false };
    const sales = new SalesService(db);
    const dineIn = await sales.create(actor, { orderType: 'DINE_IN', tableId: tableA });
    assert.equal(Number((await db.query('SELECT count(*)::int AS count FROM stock_movements WHERE branch_id=$1',[branch]))[0].count),0,
      'BR-42 OPEN order must not create a stock movement');
    assert.match(dineIn.invoiceCode, /^HD[A-Z0-9]{8}$/);
    await assert.rejects(sales.create(actor, { orderType: 'DINE_IN', tableId: tableA }), (error: any) => error.getResponse().code === 'TABLE_HAS_OPEN_INVOICE');
    const withItem = await sales.addItem(actor, dineIn.id, { productSizeId: productSize, quantity: 2, toppings: [{ toppingId: topping, quantity: 1 }] });
    assert.equal(Number((await db.query('SELECT count(*)::int AS count FROM stock_movements WHERE branch_id=$1',[branch]))[0].count),0,
      'BR-42 editing OPEN order must not deduct stock');
    assert.equal(withItem.subtotal, 24000, 'BR-24 server price and topping');
    assert.equal(withItem.items.length, 1);
    await db.query('UPDATE product_sizes SET price=15000 WHERE id=$1', [productSize]);
    const updated = await sales.patchItem(actor, withItem.items[0].id, { quantity: 3 });
    assert.equal(updated.subtotal, 36000, 'BR-12 old snapshot survives quantity change');
    const added = await sales.addItem(actor, dineIn.id, { productSizeId: productSize, quantity: 1, toppings: [] });
    assert.equal(added.items.length, 2, 'BR-90 each add creates a row');
    assert.equal(added.subtotal, 51000, 'new item gets new menu price');
    const moved = await sales.transfer(actor, dineIn.id, tableB);
    assert.equal(moved.tableId, tableB);
    assert.equal(moved.subtotal, 51000);
    const cancelled = await sales.cancel(actor, dineIn.id, 'Khách đổi ý');
    assert.equal(cancelled.status, 'CANCELLED');
    await assert.rejects(sales.addItem(actor, dineIn.id, { productSizeId: productSize, quantity: 1 }), (error: any) => error.getResponse().code === 'INVOICE_NOT_OPEN');
    const replacement = await sales.create(actor, { orderType: 'DINE_IN', tableId: tableB });
    assert.equal(replacement.status, 'OPEN', 'BR-99 cancelled order releases table');
    const upper = await sales.addItem(actor, replacement.id, { productSizeId: productSize, quantity: 1,
      toppings: [{ toppingId: topping.toUpperCase(), quantity: 1 }] });
    assert.equal(upper.totalAmount, 17000, 'valid uppercase UUID identifies the same topping');
    await db.query('DELETE FROM category_toppings WHERE category_id=$1 AND topping_id=$2', [category, topping]);
    await assert.rejects(new MenuService(db).deleteTopping(actor, topping),
      (error: any) => error.getResponse?.().code === 'RESOURCE_IN_USE');
    await db.query(`CREATE FUNCTION pb07_pause_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN PERFORM pg_sleep(2); RETURN NEW; END $$`);
    await db.query('CREATE TRIGGER pb07_pause BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION pb07_pause_insert()');
    const creating = sales.create(actor, { orderType: 'DINE_IN', tableId: tableA });
    await new Promise(resolve => setTimeout(resolve, 250));
    for (const [resource, id] of [['branches', branch], ['dining_tables', tableA]]) {
      const runner = db.createQueryRunner();
      await runner.connect(); await runner.startTransaction();
      try {
        await runner.query("SET LOCAL lock_timeout='200ms'");
        await assert.rejects(runner.query(`UPDATE ${resource} SET is_active=false WHERE id=$1`, [id]),
          (error: any) => error.code === '55P03', `${resource} must stay active until create commits`);
      } finally { await runner.rollbackTransaction(); await runner.release(); }
    }
    const concurrent = await creating;
    assert.equal(concurrent.tableId, tableA);
    await db.query('DROP TRIGGER pb07_pause ON invoices');
    await db.query('DROP FUNCTION pb07_pause_insert()');
    await db.query('UPDATE branches SET is_active=false WHERE id=$1', [branch]);
    const cancelledInactive = await sales.cancel(actor, replacement.id, 'Đóng chi nhánh');
    assert.equal(cancelledInactive.status, 'CANCELLED', 'BR-76 preserves old data and BR-28 can resolve open orders');
    await assert.rejects(sales.create(actor, { orderType: 'TAKEAWAY' }),
      (error: any) => error.getResponse?.().code === 'BRANCH_INACTIVE');
  } finally {
    if (db.isInitialized) await db.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});

test('ST-12 sales lock helpers and invoice detail on PostgreSQL', { timeout: 120_000 }, async (t) => {
  const name = `pos_st12_test_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  await dataSource.initialize();
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    await db.initialize();
    await db.runMigrations();
    const store = randomUUID(), otherStore = randomUUID(), branch = randomUUID(), branch2 = randomUUID(), otherBranch = randomUUID();
    const cashier = randomUUID(), colleague = randomUUID(), shift = randomUUID(), colleagueShift = randomUUID();
    const table = randomUUID(), tableBranch2 = randomUUID(), tableInactive = randomUUID(), tableForeign = randomUUID();
    const category = randomUUID(), size = randomUUID(), product = randomUUID(), productSize = randomUUID(), promotion = randomUUID();
    const item = randomUUID(), ownInvoice = randomUUID(), colleagueInvoice = randomUUID();
    const toppingIds = ['00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c'];
    await db.query('INSERT INTO stores (id,name) VALUES ($1,$2),($3,$4)', [store, 'ST12 store', otherStore, 'ST12 other store']);
    await db.query('INSERT INTO branches (id,store_id,code,name) VALUES ($1,$2,$3,$4),($5,$2,$6,$7),($8,$9,$10,$11)',
      [branch, store, 'S1', 'ST12 branch', branch2, 'S2', 'ST12 branch 2', otherBranch, otherStore, 'S3', 'ST12 foreign branch']);
    for (const [id, username, shiftId] of [[cashier, 'st12_cashier', shift], [colleague, 'st12_colleague', colleagueShift]]) {
      await db.query(`INSERT INTO users (id,store_id,branch_id,role_id,full_name,username,password_hash)
        VALUES ($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),$4,$5,$6)`, [id, store, branch, `Full ${username}`, username, 'test-hash']);
      // One open cashier shift per branch: the colleague shift is closed but still owns an invoice.
      await db.query(`INSERT INTO work_shifts (id,branch_id,user_id,shift_type,started_at,ended_at,status)
        VALUES ($1,$2,$3,'CASHIER',now() - interval '1 minute',$4,$5)`, [shiftId, branch, id, id === cashier ? null : new Date(), id === cashier ? 'OPEN' : 'CLOSED']);
    }
    await db.query('INSERT INTO dining_tables (id,branch_id,name,is_active) VALUES ($1,$2,$3,true),($4,$5,$6,true),($7,$2,$8,false),($9,$10,$11,true)',
      [table, branch, 'T1', tableBranch2, branch2, 'T2', tableInactive, 'T3', tableForeign, otherBranch, 'T4']);
    await db.query('INSERT INTO categories (id,store_id,name) VALUES ($1,$2,$3)', [category, store, 'Drinks']);
    await db.query('INSERT INTO sizes (id,store_id,name) VALUES ($1,$2,$3)', [size, store, 'M']);
    await db.query('INSERT INTO products (id,category_id,name) VALUES ($1,$2,$3)', [product, category, 'Tea']);
    await db.query('INSERT INTO product_sizes (id,product_id,size_id,price) VALUES ($1,$2,$3,10000)', [productSize, product, size]);
    for (const id of toppingIds) await db.query('INSERT INTO toppings (id,store_id,name,price) VALUES ($1,$2,$3,2000)', [id, store, `Topping ${id.slice(-1)}`]);
    await db.query("INSERT INTO promotion_codes (id,store_id,code,discount_type,discount_value,start_at,end_at) VALUES ($1,$2,'SAVE10','FIXED',1000,now() - interval '1 day',now() + interval '1 day')", [promotion, store]);
    await db.query(`INSERT INTO invoices (id,branch_id,work_shift_id,invoice_code,created_by,order_type,status,subtotal,discount_amount,total_amount,paid_at)
      VALUES ($1,$2,$3,'HDST120001',$4,'TAKEAWAY','PAID',24000,1000,23000,now()),($5,$2,$6,'HDST120002',$7,'TAKEAWAY','OPEN',0,0,0,NULL)`,
      [ownInvoice, branch, shift, cashier, colleagueInvoice, colleagueShift, colleague]);
    await db.query("INSERT INTO invoice_items (id,invoice_id,product_size_id,product_name,size_name,unit_price,quantity,line_total) VALUES ($1,$2,$3,'Tea','M',10000,2,20000)", [item, ownInvoice, productSize]);
    // Hand-computed order by (created_at, id): c (older), then a before b (same time, smaller id first).
    for (const [id, createdAt] of [[toppingIds[1], '2026-01-01T00:00:01Z'], [toppingIds[0], '2026-01-01T00:00:01Z'], [toppingIds[2], '2026-01-01T00:00:00Z']])
      await db.query('INSERT INTO invoice_item_toppings (id,invoice_item_id,topping_id,topping_name,unit_price,quantity,line_total,created_at) VALUES ($1,$2,$1,$3,2000,1,2000,$4)',
        [id, item, `Topping ${id.slice(-1)}`, createdAt]);
    await db.query('INSERT INTO invoice_promotion_codes (invoice_id,promotion_code_id,code,discount_amount) VALUES ($1,$2,$3,1000)', [ownInvoice, promotion, 'SAVE10']);
    await db.query("INSERT INTO payments (id,invoice_id,method,amount,idempotency_key,idempotency_request_hash,tendered_amount,change_amount,created_by) VALUES ($1,$2,'CASH',23000,$3,$4,25000,2000,$5)",
      [randomUUID(), ownInvoice, randomUUID(), 'a'.repeat(64), cashier]);
    const actor = { id: cashier, username: 'st12_cashier', fullName: 'QA Cashier', role: 'CASHIER', storeId: store,
      branchId: branch, permissions: ['pos.sell', 'invoice.read', 'invoice.cancel_open', 'table.read'], mustChangePassword: false };
    const sales = new SalesService(db);
    const rejection = (status: number, code: string, message: string) => (error: any) =>
      error.getStatus() === status && error.getResponse().code === code && error.getResponse().message === message;

    await t.test('test_ST12_AC1_create_lock_sequence', async (t) => {
      const sql = captureSql(t);
      const created = await sales.create(actor, { orderType: 'DINE_IN', tableId: table });
      assert.equal(created.tableId, table);
      assert.deepEqual(lockSequence(sql), ['UPDATE:work_shifts', 'UPDATE:branches', 'SHARE:dining_tables']);
      await db.query("UPDATE invoices SET status='CANCELLED' WHERE id=$1", [created.id]);
    });

    await t.test('test_ST12_AC2_detail_toppings_payment_promotion', async () => {
      const detail = await sales.get(actor, ownInvoice);
      assert.equal(detail.paymentMethod, 'CASH');
      assert.equal(detail.promotionCode?.code, 'SAVE10');
      assert.equal(detail.workShiftStatus, 'OPEN');
      assert.equal(detail.cashierName, 'Full st12_cashier');
      assert.equal(detail.tableName, null);
      assert.deepEqual(detail.items[0].toppings.map(row => row.toppingId), [toppingIds[2], toppingIds[0], toppingIds[1]]);
    });

    await t.test('test_ST12_AC3_table_errors_unchanged', async () => {
      await assert.rejects(sales.create(actor, { orderType: 'DINE_IN', tableId: tableBranch2 }),
        rejection(422, 'INVOICE_BRANCH_MISMATCH', 'Bàn không thuộc chi nhánh của ca.'));
      await assert.rejects(sales.create(actor, { orderType: 'DINE_IN', tableId: tableInactive }),
        rejection(409, 'TABLE_INACTIVE', 'Bàn đã ngưng dùng.'));
      await assert.rejects(sales.create(actor, { orderType: 'DINE_IN', tableId: tableForeign }),
        rejection(404, 'NOT_FOUND', 'Không tìm thấy bàn.'));
    });

    await t.test('test_ST12_AC4_cashier_other_shift_404', async () => {
      await assert.rejects(sales.get(actor, colleagueInvoice), rejection(404, 'NOT_FOUND', 'Không tìm thấy hóa đơn.'));
    });
  } finally {
    if (db.isInitialized) await db.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});

test('ST-14 sales create, items and transfer on PostgreSQL', { timeout: 120_000 }, async (t) => {
  const name = `pos_st14_test_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  await dataSource.initialize();
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    await db.initialize();
    await db.runMigrations();
    const store = randomUUID(), otherStore = randomUUID(), branch = randomUUID(), cashier = randomUUID(), shift = randomUUID();
    const tableA = randomUUID(), tableB = randomUUID(), tableC = randomUUID();
    const category = randomUUID(), otherCategory = randomUUID(), inactiveCategory = randomUUID(), foreignCategory = randomUUID(), size = randomUUID(), foreignSize = randomUUID(), sizeL = randomUUID();
    const product = randomUUID(), inactiveProduct = randomUUID(), inactiveCategoryProduct = randomUUID(), foreignProduct = randomUUID();
    const goodSize = randomUUID(), inactiveSize = randomUUID(), inactiveProductSize = randomUUID(), inactiveCategorySize = randomUUID(), foreignProductSize = randomUUID();
    const pearls = randomUUID(), crossTopping = randomUUID(), inactiveTopping = randomUUID(), unlinkedTopping = randomUUID(), foreignTopping = randomUUID();
    await db.query('INSERT INTO stores (id,name) VALUES ($1,$2),($3,$4)', [store, 'ST14 store', otherStore, 'ST14 other store']);
    await db.query('INSERT INTO branches (id,store_id,code,name) VALUES ($1,$2,$3,$4)', [branch, store, 'S1', 'ST14 branch']);
    await db.query(`INSERT INTO users (id,store_id,branch_id,role_id,full_name,username,password_hash)
      VALUES ($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),$4,$5,$6)`, [cashier, store, branch, 'QA Cashier', 'st14_cashier', 'test-hash']);
    await db.query("INSERT INTO work_shifts (id,branch_id,user_id,shift_type,started_at,status) VALUES ($1,$2,$3,'CASHIER',now() - interval '1 minute','OPEN')", [shift, branch, cashier]);
    await db.query('INSERT INTO dining_tables (id,branch_id,name) VALUES ($1,$2,$3),($4,$2,$5),($6,$2,$7)', [tableA, branch, 'A', tableB, 'B', tableC, 'C']);
    await db.query('INSERT INTO categories (id,store_id,name,is_active) VALUES ($1,$2,$3,true),($4,$2,$5,false),($6,$7,$8,true),($9,$2,$10,true)',
      [category, store, 'Drinks', inactiveCategory, 'Retired', foreignCategory, otherStore, 'Foreign', otherCategory, 'Cakes']);
    await db.query('INSERT INTO sizes (id,store_id,name) VALUES ($1,$2,$3),($4,$5,$6),($7,$2,$8)', [size, store, 'M', foreignSize, otherStore, 'M', sizeL, 'L']);
    await db.query(`INSERT INTO products (id,category_id,name,is_active) VALUES ($1,$2,'Tea',true),($3,$2,'Retired tea',false),($4,$5,'Retired cat tea',true),($6,$7,'Foreign tea',true)`,
      [product, category, inactiveProduct, inactiveCategoryProduct, inactiveCategory, foreignProduct, foreignCategory]);
    await db.query(`INSERT INTO product_sizes (id,product_id,size_id,price,is_active) VALUES ($1,$2,$3,30000,true),($4,$2,$12,30000,false),($5,$6,$3,30000,true),($7,$8,$3,30000,true),($9,$10,$11,30000,true)`,
      [goodSize, product, size, inactiveSize, inactiveProductSize, inactiveProduct, inactiveCategorySize, inactiveCategoryProduct, foreignProductSize, foreignProduct, foreignSize, sizeL]);
    await db.query(`INSERT INTO toppings (id,store_id,name,price,is_active) VALUES ($1,$2,'Pearls',5000,true),($3,$2,'Retired topping',1000,false),($4,$2,'Unlinked topping',1000,true),($5,$6,'Foreign topping',1000,true),($7,$2,'Cross topping',1000,true)`,
      [pearls, store, inactiveTopping, unlinkedTopping, foreignTopping, otherStore, crossTopping]);
    await db.query('INSERT INTO category_toppings (category_id,topping_id) VALUES ($1,$2),($3,$4)', [category, pearls, otherCategory, crossTopping]);
    const actor = { id: cashier, username: 'st14_cashier', fullName: 'QA Cashier', role: 'CASHIER', storeId: store,
      branchId: branch, permissions: ['pos.sell', 'invoice.read', 'invoice.cancel_open', 'table.read'], mustChangePassword: false };
    const sales = new SalesService(db);
    const rejection = (status: number, code: string, message: string) => (error: any) =>
      error.getStatus() === status && error.getResponse().code === code && error.getResponse().message === message;

    await t.test('test_ST14_AC1_create_invoice_and_table_conflict', async () => {
      const takeaway = await sales.create(actor, { orderType: 'TAKEAWAY', note: 'mang đi' });
      assert.equal(takeaway.tableId, null);
      assert.equal(takeaway.status, 'OPEN');
      assert.equal(takeaway.note, 'mang đi');
      assert.equal(takeaway.totalAmount, 0);
      const dineIn = await sales.create(actor, { orderType: 'DINE_IN', tableId: tableC });
      assert.equal(dineIn.tableId, tableC);
      await assert.rejects(sales.create(actor, { orderType: 'DINE_IN', tableId: tableC }), (error: any) => error.getStatus() === 409
        && error.getResponse().code === 'TABLE_HAS_OPEN_INVOICE' && error.getResponse().message === 'Bàn đang có đơn mở.'
        && JSON.stringify(error.getResponse().details) === JSON.stringify([{ field: 'invoiceId', value: dineIn.id }]));
      await sales.cancel(actor, takeaway.id, 'test');
      await sales.cancel(actor, dineIn.id, 'test');
    });

    await t.test('test_ST14_AC2_add_item_errors_unchanged', async () => {
      const order = await sales.create(actor, { orderType: 'TAKEAWAY' });
      for (const inactive of [inactiveSize, inactiveProductSize, inactiveCategorySize])
        await assert.rejects(sales.addItem(actor, order.id, { productSizeId: inactive, quantity: 1 }),
          rejection(409, 'ITEM_NOT_AVAILABLE', 'Món hoặc size đã ngưng bán.'));
      await assert.rejects(sales.addItem(actor, order.id, { productSizeId: foreignProductSize, quantity: 1 }),
        rejection(404, 'NOT_FOUND', 'Không tìm thấy món trong cửa hàng.'));
      await assert.rejects(sales.addItem(actor, order.id, { productSizeId: randomUUID(), quantity: 1 }),
        rejection(404, 'NOT_FOUND', 'Không tìm thấy món trong cửa hàng.'));
      // The retired topping is also unlinked from the category: 409 must win over 422.
      await assert.rejects(sales.addItem(actor, order.id, { productSizeId: goodSize, quantity: 1, toppings: [{ toppingId: inactiveTopping, quantity: 1 }] }),
        rejection(409, 'ITEM_NOT_AVAILABLE', 'Topping đã ngưng bán.'));
      await assert.rejects(sales.addItem(actor, order.id, { productSizeId: goodSize, quantity: 1, toppings: [{ toppingId: unlinkedTopping, quantity: 1 }] }),
        rejection(422, 'TOPPING_NOT_ALLOWED', 'Topping không thuộc danh mục món.'));
      await assert.rejects(sales.addItem(actor, order.id, { productSizeId: goodSize, quantity: 1, toppings: [{ toppingId: crossTopping, quantity: 1 }] }),
        rejection(422, 'TOPPING_NOT_ALLOWED', 'Topping không thuộc danh mục món.'));
      await assert.rejects(sales.addItem(actor, order.id, { productSizeId: goodSize, quantity: 1, toppings: [{ toppingId: foreignTopping, quantity: 1 }] }),
        rejection(404, 'NOT_FOUND', 'Không tìm thấy topping trong cửa hàng.'));
      await assert.rejects(sales.addItem(actor, order.id, { productSizeId: goodSize, quantity: 1, toppings: [{ toppingId: randomUUID(), quantity: 1 }] }),
        rejection(404, 'NOT_FOUND', 'Không tìm thấy topping trong cửa hàng.'));
      await assert.rejects(sales.addItem(actor, order.id, { productSizeId: goodSize, quantity: 1,
        toppings: [{ toppingId: pearls, quantity: 1 }, { toppingId: pearls.toUpperCase(), quantity: 1 }] }),
        rejection(422, 'VALIDATION_ERROR', 'Topping bị lặp.'));
      assert.equal(Number((await db.query('SELECT count(*)::int AS count FROM invoice_items WHERE invoice_id=$1', [order.id]))[0].count), 0);
      await sales.cancel(actor, order.id, 'test');
    });

    await t.test('test_ST14_AC3_line_total_snapshot', async () => {
      const order = await sales.create(actor, { orderType: 'TAKEAWAY' });
      const added = await sales.addItem(actor, order.id, { productSizeId: goodSize, quantity: 3, note: 'ít đá', toppings: [{ toppingId: pearls, quantity: 2 }] });
      assert.equal(added.items[0].lineTotal, 120000);
      assert.equal(added.totalAmount, 120000);
      assert.equal(added.subtotal, 120000);
      assert.deepEqual([added.items[0].productName, added.items[0].sizeName, added.items[0].unitPrice, added.items[0].note], ['Tea', 'M', 30000, 'ít đá']);
      assert.deepEqual([added.items[0].toppings[0].toppingName, added.items[0].toppings[0].unitPrice, added.items[0].toppings[0].quantity, added.items[0].toppings[0].lineTotal],
        ['Pearls', 5000, 2, 30000]);
      const itemId = added.items[0].id;
      const patched = await sales.patchItem(actor, itemId, { quantity: 1 });
      assert.equal(patched.items[0].lineTotal, 40000);
      assert.equal(patched.items[0].toppings[0].lineTotal, 10000);
      assert.equal(patched.totalAmount, 40000);
      assert.equal(patched.items[0].note, 'ít đá', 'omitted note keeps the old note');
      const cleared = await sales.patchItem(actor, itemId, { note: null });
      assert.equal(cleared.items[0].note, null);
      assert.equal(cleared.items[0].lineTotal, 40000, 'note-only patch keeps quantity');
      const renoted = await sales.patchItem(actor, itemId, { note: 'nhiều đá' });
      assert.equal(renoted.items[0].note, 'nhiều đá');
      await assert.rejects(sales.patchItem(actor, randomUUID(), { quantity: 1 }), rejection(404, 'NOT_FOUND', 'Không tìm thấy dòng món.'));
      await sales.cancel(actor, order.id, 'test');
    });

    await t.test('test_ST14_AC4_remove_item_recalculates', async () => {
      const order = await sales.create(actor, { orderType: 'TAKEAWAY' });
      const first = await sales.addItem(actor, order.id, { productSizeId: goodSize, quantity: 1, toppings: [{ toppingId: pearls, quantity: 1 }] });
      const second = await sales.addItem(actor, order.id, { productSizeId: goodSize, quantity: 2 });
      assert.equal(second.totalAmount, 35000 + 60000);
      const removedId = first.items[0].id;
      await sales.removeItem(actor, removedId);
      const after = await sales.get(actor, order.id);
      assert.equal(after.items.length, 1);
      assert.equal(after.totalAmount, 60000);
      assert.equal(Number((await db.query('SELECT count(*)::int AS count FROM invoice_item_toppings WHERE invoice_item_id=$1', [removedId]))[0].count), 0);
      await assert.rejects(sales.removeItem(actor, removedId), rejection(404, 'NOT_FOUND', 'Không tìm thấy dòng món.'));
      await sales.cancel(actor, order.id, 'test');
    });

    await t.test('test_ST14_AC5_transfer_table', async () => {
      const order = await sales.create(actor, { orderType: 'DINE_IN', tableId: tableA });
      const occupied = await sales.create(actor, { orderType: 'DINE_IN', tableId: tableC });
      const moved = await sales.transfer(actor, order.id, tableB);
      assert.equal(moved.tableId, tableB);
      assert.equal(moved.tableName, 'B');
      assert.equal((await sales.transfer(actor, order.id, tableB)).tableId, tableB, 'same table is a no-op');
      await assert.rejects(sales.transfer(actor, order.id, tableC), rejection(409, 'TABLE_HAS_OPEN_INVOICE', 'Bàn đích đang có đơn mở.'));
      assert.equal((await sales.get(actor, order.id)).tableId, tableB);
      const takeaway = await sales.create(actor, { orderType: 'TAKEAWAY' });
      await assert.rejects(sales.transfer(actor, takeaway.id, tableA), rejection(409, 'CONFLICT', 'Chỉ đơn tại bàn mới chuyển bàn được.'));
      await sales.cancel(actor, order.id, 'test');
      await sales.cancel(actor, occupied.id, 'test');
      await sales.cancel(actor, takeaway.id, 'test');
    });
  } finally {
    if (db.isInitialized) await db.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});
