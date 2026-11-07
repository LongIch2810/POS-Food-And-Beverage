import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { dataSource } from '../../database/data-source';
import { MenuService } from '../../menu/menu.service';
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
    assert.match(dineIn.invoiceCode, /^HD[A-Z0-9]{8}$/);
    await assert.rejects(sales.create(actor, { orderType: 'DINE_IN', tableId: tableA }), (error: any) => error.getResponse().code === 'TABLE_HAS_OPEN_INVOICE');
    const withItem = await sales.addItem(actor, dineIn.id, { productSizeId: productSize, quantity: 2, toppings: [{ toppingId: topping, quantity: 1 }] });
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
