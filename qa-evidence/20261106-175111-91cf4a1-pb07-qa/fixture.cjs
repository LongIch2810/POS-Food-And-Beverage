const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { writeFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const { DataSource } = require('../../POS_API/node_modules/typeorm');
const bcrypt = require('../../POS_API/node_modules/bcryptjs');

async function main() {
  const baseUrl = new URL(process.env.DATABASE_URL || '');
  assert.ok(['postgres:', 'postgresql:'].includes(baseUrl.protocol));
  assert.ok(['127.0.0.1', 'localhost'].includes(baseUrl.hostname));
  assert.equal(baseUrl.port, '5433');
  assert.equal(baseUrl.pathname, '/postgres');
  const output = path.join(__dirname, 'fixture.local.json');
  assert.equal(existsSync(output), false, 'Refuse to overwrite an existing sandbox fixture');

  const { dataSource } = require('../../POS_API/dist/database/data-source.js');
  const name = `pos_pb07_browser_${randomBytes(6).toString('hex')}`;
  const testUrl = new URL(baseUrl);
  testUrl.pathname = `/${name}`;
  const fixture = new DataSource({ type: 'postgres', url: testUrl.toString(),
    entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  const password = randomBytes(18).toString('base64url');
  const passwordHash = await bcrypt.hash(password, 12);
  const ids = { storeA: randomUUID(), storeB: randomUUID(), branchA: randomUUID(), branchB: randomUUID(),
    tableA: randomUUID(), tableB: randomUUID(), category: randomUUID(), size: randomUUID(),
    product: randomUUID(), productSize: randomUUID(), topping: randomUUID(), cashierA: randomUUID(),
    managerA: randomUUID(), ownerA: randomUUID(), cashierB: randomUUID(), shiftA: randomUUID(), shiftB: randomUUID() };
  await dataSource.initialize();
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    await fixture.initialize();
    await fixture.runMigrations();
    await fixture.transaction(async manager => {
      await manager.query('INSERT INTO stores (id,name) VALUES ($1,$2),($3,$4)',
        [ids.storeA, 'PB07 Sandbox A', ids.storeB, 'PB07 Sandbox B']);
      await manager.query('INSERT INTO branches (id,store_id,code,name) VALUES ($1,$2,$3,$4),($5,$6,$7,$8)',
        [ids.branchA, ids.storeA, 'A1', 'Chi nhánh thử A', ids.branchB, ids.storeB, 'B1', 'Chi nhánh thử B']);
      const users = [
        [ids.ownerA, ids.storeA, null, 'OWNER', 'pb07_owner_a', 'Chủ cửa hàng A'],
        [ids.cashierA, ids.storeA, ids.branchA, 'CASHIER', 'pb07_cashier_a', 'Thu ngân A'],
        [ids.managerA, ids.storeA, ids.branchA, 'MANAGER', 'pb07_manager_a', 'Quản lý A'],
        [ids.cashierB, ids.storeB, ids.branchB, 'CASHIER', 'pb07_cashier_b', 'Thu ngân B'],
      ];
      for (const [id, storeId, branchId, role, username, fullName] of users) {
        await manager.query(`INSERT INTO users (id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
          VALUES ($1,$2,$3,(SELECT id FROM roles WHERE name=$4),$5,$6,$7,false)`,
        [id, storeId, branchId, role, fullName, username, passwordHash]);
      }
      await manager.query(`INSERT INTO work_shifts (id,branch_id,user_id,shift_type,started_at,status)
        VALUES ($1,$2,$3,'CASHIER',now(),'OPEN'),($4,$5,$6,'CASHIER',now(),'OPEN')`,
      [ids.shiftA, ids.branchA, ids.cashierA, ids.shiftB, ids.branchB, ids.cashierB]);
      await manager.query("INSERT INTO cash_reconciliations (id,work_shift_id,opening_cash,status) VALUES ($1,$2,0,'PENDING'),($3,$4,0,'PENDING')",
        [randomUUID(), ids.shiftA, randomUUID(), ids.shiftB]);
      await manager.query('INSERT INTO dining_tables (id,branch_id,name) VALUES ($1,$2,$3),($4,$2,$5)',
        [ids.tableA, ids.branchA, 'Bàn A', ids.tableB, 'Bàn B']);
      await manager.query('INSERT INTO categories (id,store_id,name) VALUES ($1,$2,$3)', [ids.category, ids.storeA, 'Đồ uống']);
      await manager.query('INSERT INTO sizes (id,store_id,name) VALUES ($1,$2,$3)', [ids.size, ids.storeA, 'M']);
      await manager.query('INSERT INTO products (id,category_id,name) VALUES ($1,$2,$3)', [ids.product, ids.category, 'Trà thử']);
      await manager.query('INSERT INTO product_sizes (id,product_id,size_id,price) VALUES ($1,$2,$3,10000)',
        [ids.productSize, ids.product, ids.size]);
      await manager.query('INSERT INTO toppings (id,store_id,name,price) VALUES ($1,$2,$3,2000)',
        [ids.topping, ids.storeA, 'Trân châu']);
      await manager.query('INSERT INTO category_toppings (category_id,topping_id) VALUES ($1,$2)', [ids.category, ids.topping]);
    });
    writeFileSync(output, JSON.stringify({ database: name, users: {
      cashierA: 'pb07_cashier_a', managerA: 'pb07_manager_a', ownerA: 'pb07_owner_a', cashierB: 'pb07_cashier_b',
    }, password, ids }, null, 2), { encoding: 'utf8', flag: 'wx' });
    console.log('Sandbox fixture created; credentials and IDs are in ignored fixture.local.json.');
  } finally {
    if (fixture.isInitialized) await fixture.destroy();
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
