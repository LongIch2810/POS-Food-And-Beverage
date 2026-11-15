import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';

test('S10-11 GET /stock-movements HTTP quyen pham vi branchName invoiceCode', { timeout: 180_000 }, async (t) => {
  const name = `pos_s10_ledger_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  const db = new DataSource({ type:'postgres',url:url.toString(),entities:dataSource.options.entities,
    migrations:dataSource.options.migrations });
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
    const module = await Test.createTestingModule({ imports:[AppModule] }).overrideProvider(DataSource).useValue(db).compile();
    const app = module.createNestApplication({ logger:false });
    try {
      await app.listen(0,'127.0.0.1');
      const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
      type Session = { cookie:string; csrf:string };
      const request = async (session:Session|null, path:string, method='GET', body?:unknown) => {
        const response = await fetch(`${base}${path}`,{ method,headers:{ ...(session ? { Cookie:session.cookie,'X-CSRF-Token':session.csrf } : {}),
          Origin:process.env.PUBLIC_ORIGIN!,
          ...(body === undefined ? {} : {'Content-Type':'application/json'}) },
          ...(body === undefined ? {} : {body:JSON.stringify(body)}) });
        const text = await response.text();
        return {status:response.status,text,json:JSON.parse(text)};
      };
      const login = async (username:string, pass:string):Promise<Session> => {
        const response = await fetch(`${base}/auth/login`,{method:'POST',headers:{Origin:process.env.PUBLIC_ORIGIN!,
          'Content-Type':'application/json'},body:JSON.stringify({username,password:pass})});
        assert.equal(response.status,200);
        const cookies = response.headers.getSetCookie().map(value => value.split(';')[0]);
        return {cookie:cookies.join('; '),csrf:cookies.find(value => value.startsWith('__Host-pos_csrf='))!.slice(16)};
      };
      const admin = await login('admin',password);
      const a = await request(admin,'/platform/stores','POST',{name:'S10 A',owner:{username:'s10_owner_a',fullName:'Owner A'}});
      const b = await request(admin,'/platform/stores','POST',{name:'S10 B',owner:{username:'s10_owner_b',fullName:'Owner B'}});
      assert.equal(a.status,201); assert.equal(b.status,201);
      await db.query('UPDATE users SET must_change_password=false WHERE id IN ($1,$2)',[a.json.data.owner.id,b.json.data.owner.id]);
      const ownerA = await login('s10_owner_a',a.json.data.temporaryPassword);
      const ownerB = await login('s10_owner_b',b.json.data.temporaryPassword);
      const a1 = (await request(ownerA,'/branches','POST',{code:'A1',name:'Chi nhánh Bắc'})).json.data.id as string;
      const a2 = (await request(ownerA,'/branches','POST',{code:'A2',name:'Chi nhánh Nam'})).json.data.id as string;
      const b1 = (await request(ownerB,'/branches','POST',{code:'B1',name:'Chi nhánh B'})).json.data.id as string;
      const staff = async (username:string, role:string) => {
        const r = await request(ownerA,'/users','POST',{branchId:a1,username,fullName:username,role});
        assert.equal(r.status,201);
        const session = await login(username,r.json.data.temporaryPassword);
        await db.query('UPDATE users SET must_change_password=false WHERE id=$1',[r.json.data.user.id]);
        return session;
      };
      const manager = await staff('s10_manager_a1','MANAGER');
      const cashier = await staff('s10_cashier_a1','CASHIER');
      const ingA = (await request(ownerA,'/ingredients','POST',{name:'Sữa',unit:'ml'})).json.data.id as string;
      const ingB = (await request(ownerB,'/ingredients','POST',{name:'Sữa B',unit:'ml'})).json.data.id as string;
      const userId = async (username:string) => (await db.query('SELECT id FROM users WHERE username=$1',[username]))[0].id as string;
      const storeA = (await db.query(`SELECT store_id FROM users WHERE username='s10_owner_a'`))[0].store_id as string;
      const [ownerAId, ownerBId, cashierId] = [await userId('s10_owner_a'), await userId('s10_owner_b'), await userId('s10_cashier_a1')];
      const shiftA = randomUUID(), shiftB = randomUUID(), invA = randomUUID(), invB = randomUUID();
      await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,started_at,status) VALUES($1,$2,$3,'CASHIER',now() - interval '1 hour','OPEN')`,[shiftA,a1,cashierId]);
      await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,started_at,status) VALUES($1,$2,$3,'CASHIER',now() - interval '1 hour','OPEN')`,[shiftB,b1,ownerBId]);
      await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,invoice_code,created_by,order_type,status,subtotal,total_amount,paid_at) VALUES($1,$2,$3,'HDS10A0001',$4,'TAKEAWAY','PAID',35000,35000,now())`,[invA,a1,shiftA,cashierId]);
      await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,invoice_code,created_by,order_type,status,subtotal,total_amount,paid_at) VALUES($1,$2,$3,'HDS10B0001',$4,'TAKEAWAY','PAID',35000,35000,now())`,[invB,b1,shiftB,ownerBId]);
      // m1/m2 cùng created_at: id cố định để thứ tự id DESC là m2 rồi m1.
      const m = { m1:'00000000-0000-4000-8000-000000000001', m2:'00000000-0000-4000-8000-000000000002',
        m3:randomUUID(), m4:randomUUID(), m5:randomUUID(), m6:randomUUID() };
      const move = (id:string, branch:string, ing:string, type:string, qty:string, invoice:string|null, at:string, by:string) =>
        db.query(`INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,invoice_id,created_by,created_at)
          VALUES($1,$2,$3,$4,$5,0,$6,$7,$8)`,[id,branch,ing,type,qty,invoice,by,at]);
      await move(m.m1,a1,ingA,'IMPORT','100.000',null,'2026-11-15T01:00:00.000001Z',ownerAId);
      await move(m.m2,a2,ingA,'IMPORT','100.000',null,'2026-11-15T01:00:00.000001Z',ownerAId);
      await move(m.m3,a1,ingA,'SALE','-10.000',invA,'2026-11-15T02:00:00.000001Z',ownerAId);
      await move(m.m4,a1,ingA,'SALE_REVERSAL','10.000',invA,'2026-11-15T03:00:00.000001Z',ownerAId);
      await move(m.m5,a2,ingA,'SALE','-5.000',invB,'2026-11-15T04:00:00.000001Z',ownerAId);
      await move(m.m6,b1,ingB,'IMPORT','50.000',null,'2026-11-15T01:00:00.000001Z',ownerBId);
      const ids = (r:{json:any}) => r.json.data.map((x:any) => x.id);
      const byId = (r:{json:any}, id:string) => r.json.data.find((x:any) => x.id === id);
      const oracle = (await db.query(`SELECT m.id FROM stock_movements m JOIN branches b ON b.id=m.branch_id WHERE b.store_id=$1 ORDER BY m.created_at DESC, m.id DESC`,[storeA])).map((r:any) => r.id);
      const all = await request(ownerA,'/stock-movements');

      await t.test('ST1-AC1 thu tu total va 13 khoa', () => {
        assert.equal(all.status,200);
        assert.deepEqual(ids(all),[m.m5,m.m4,m.m3,m.m2,m.m1]);
        assert.deepEqual(ids(all),oracle);
        assert.equal(all.json.meta.total,5);
        assert.equal(byId(all,m.m1).branchName,'Chi nhánh Bắc');
        assert.equal(byId(all,m.m2).branchName,'Chi nhánh Nam');
        for (const row of all.json.data) assert.deepEqual(Object.keys(row).sort(),
          ['balanceAfter','branchId','branchName','createdAt','id','ingredientId','ingredientName','invoiceCode','invoiceId','note','quantity','type','unit']);
      });

      await t.test('ST1-AC2 invoiceCode cua SALE va SALE_REVERSAL', () => {
        assert.equal(byId(all,m.m3).invoiceCode,'HDS10A0001');
        assert.equal(byId(all,m.m4).invoiceCode,'HDS10A0001');
        assert.equal(byId(all,m.m1).invoiceCode,null);
        assert.equal(byId(all,m.m3).invoiceId,invA);
        assert.equal(byId(all,m.m3).note,null);
      });

      await t.test('ST1-AC3 phan trang cursor khong doi', async () => {
        const p1 = await request(ownerA,'/stock-movements?limit=2');
        assert.deepEqual(ids(p1),oracle.slice(0,2));
        assert.equal(p1.json.meta.limit,2); assert.equal(p1.json.meta.total,5);
        assert.equal(typeof p1.json.meta.nextCursor,'string');
        assert.deepEqual(JSON.parse(Buffer.from(p1.json.meta.nextCursor,'base64url').toString()),
          { scope:JSON.stringify(['movements',storeA,null,null,null]), key:'2026-11-15T03:00:00.000001Z', id:m.m4 });
        const p2 = await request(ownerA,`/stock-movements?limit=2&cursor=${p1.json.meta.nextCursor}`);
        assert.deepEqual(ids(p2),oracle.slice(2,4));
        const p3 = await request(ownerA,`/stock-movements?limit=2&cursor=${p2.json.meta.nextCursor}`);
        assert.deepEqual(ids(p3),oracle.slice(4));
        assert.equal(p3.json.meta.nextCursor,null);
      });

      await t.test('ST1-AC4 manager chi chi nhanh minh va 422 khi gui branchId', async () => {
        const own = await request(manager,'/stock-movements');
        assert.equal(own.status,200);
        assert.deepEqual(ids(own),[m.m4,m.m3,m.m1]);
        assert.equal(own.json.meta.total,3);
        for (const row of own.json.data) assert.equal(row.branchName,'Chi nhánh Bắc');
        const sent = await request(manager,`/stock-movements?branchId=${a1}`);
        assert.equal(sent.status,422);
        assert.equal(sent.json.error.code,'VALIDATION_ERROR');
        assert.equal(sent.json.error.message,'Dữ liệu kho không hợp lệ.');
      });

      await t.test('ST1-AC5 quyen va cross-store', async () => {
        const denied = await request(cashier,'/stock-movements');
        assert.equal(denied.status,403); assert.equal(denied.json.error.code,'PERMISSION_DENIED');
        assert.equal(denied.json.error.message,'Bạn không có quyền thực hiện thao tác này.');
        const platform = await request(admin,'/stock-movements');
        assert.equal(platform.status,403); assert.equal(platform.json.error.code,'PERMISSION_DENIED');
        const anon = await request(null,'/stock-movements');
        assert.equal(anon.status,401); assert.equal(anon.json.error.code,'UNAUTHENTICATED');
        assert.equal(anon.json.error.message,'Vui lòng đăng nhập để tiếp tục.');
        const foreign = await request(ownerA,`/stock-movements?branchId=${b1}`);
        assert.equal(foreign.status,404); assert.equal(foreign.json.error.code,'NOT_FOUND');
        assert.equal(foreign.json.error.message,'Không tìm thấy chi nhánh.');
        const other = await request(ownerB,'/stock-movements');
        assert.equal(other.status,200);
        assert.deepEqual(ids(other),[m.m6]);
        assert.equal(other.json.data[0].branchName,'Chi nhánh B');
        for (const text of ['Chi nhánh Bắc','Chi nhánh Nam','HDS10A0001']) assert.equal(other.text.includes(text),false);
      });

      await t.test('ST1-AC6 invoice khac chi nhanh tra invoiceCode null', () => {
        const row = byId(all,m.m5);
        assert.equal(row.invoiceCode,null);
        assert.equal(row.invoiceId,invB);
        assert.equal(all.text.includes('HDS10B0001'),false);
      });

      await t.test('ST1-AC7 loc branchId type', async () => {
        const branch = await request(ownerA,`/stock-movements?branchId=${a1}`);
        assert.deepEqual(ids(branch),[m.m4,m.m3,m.m1]); assert.equal(branch.json.meta.total,3);
        assert.deepEqual(ids(await request(ownerA,'/stock-movements?type=SALE_REVERSAL')),[m.m4]);
        assert.deepEqual(ids(await request(ownerA,`/stock-movements?type=IMPORT&branchId=${a2}`)),[m.m2]);
      });
    } finally { await app.close(); }
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    if (dataSource.isInitialized) await dataSource.destroy();
  }
});
