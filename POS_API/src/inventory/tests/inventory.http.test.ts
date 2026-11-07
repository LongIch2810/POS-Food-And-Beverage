import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { bootstrapAdmin } from '../../bootstrap-admin';
import { dataSource } from '../../database/data-source';

test('S7 BR-13/36/44/72/80 inventory and promotion HTTP tenant isolation', { timeout: 180_000 }, async () => {
  const name = `pos_s7_http_${randomBytes(6).toString('hex')}`;
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
      const request = async (session:Session, path:string, method='GET', body?:unknown) => {
        const response = await fetch(`${base}${path}`,{ method,headers:{ Cookie:session.cookie,
          Origin:process.env.PUBLIC_ORIGIN!, 'X-CSRF-Token':session.csrf,
          ...(body === undefined ? {} : {'Content-Type':'application/json'}) },
          ...(body === undefined ? {} : {body:JSON.stringify(body)}) });
        return {status:response.status,json:await response.json()};
      };
      const login = async (username:string, pass:string):Promise<Session> => {
        const response = await fetch(`${base}/auth/login`,{method:'POST',headers:{Origin:process.env.PUBLIC_ORIGIN!,
          'Content-Type':'application/json'},body:JSON.stringify({username,password:pass})});
        assert.equal(response.status,200);
        const cookies = response.headers.getSetCookie().map(value => value.split(';')[0]);
        return {cookie:cookies.join('; '),csrf:cookies.find(value => value.startsWith('__Host-pos_csrf='))!.slice(16)};
      };
      const admin = await login('admin',password);
      const a = await request(admin,'/platform/stores','POST',{name:'S7 A',owner:{username:'owner_a',fullName:'Owner A'}});
      const b = await request(admin,'/platform/stores','POST',{name:'S7 B',owner:{username:'owner_b',fullName:'Owner B'}});
      assert.equal(a.status,201); assert.equal(b.status,201);
      await db.query('UPDATE users SET must_change_password=false WHERE id IN ($1,$2)',[a.json.data.owner.id,b.json.data.owner.id]);
      const ownerA = await login('owner_a',a.json.data.temporaryPassword);
      const ownerB = await login('owner_b',b.json.data.temporaryPassword);
      const branch = await request(ownerA,'/branches','POST',{code:'S7',name:'S7 branch'});
      assert.equal(branch.status,201);
      const ingredient = await request(ownerA,'/ingredients','POST',{name:'Sugar',unit:'g'});
      assert.equal(ingredient.status,201);
      assert.equal((await request(ownerB,'/ingredients','POST',{name:'Sugar',unit:'g'})).status,201,
        'BR-80 name uniqueness is per store');
      assert.equal((await request(ownerA,'/ingredients','POST',{name:'sugar',unit:'g'})).status,409);
      const renamed = await request(ownerA,`/ingredients/${ingredient.json.data.id}`,'PATCH',{name:'Sugar A'});
      assert.equal(renamed.status,200); assert.equal(renamed.json.data.name,'Sugar A');
      assert.equal((await request(ownerB,`/ingredients/${ingredient.json.data.id}`,'PATCH',{name:'Other'})).status,404);
      const stock = await request(ownerA,`/ingredient-stocks/${ingredient.json.data.id}/min-stock`,'PATCH',
        {branchId:branch.json.data.id,minStock:'5.000'});
      assert.equal(stock.status,200); assert.equal(stock.json.data.currentStock,'0.000');
      const stocks = await request(ownerA,`/ingredient-stocks?branchId=${branch.json.data.id}`);
      assert.equal(stocks.status,200); assert.equal(stocks.json.data[0].minStock,'5.000');
      assert.equal((await request(ownerB,`/ingredient-stocks?branchId=${branch.json.data.id}`)).status,404);
      assert.equal((await request(ownerA,'/stock-movements','POST',{quantity:'1.000'})).status,404);
      const promotion = await request(ownerA,'/promotion-codes','POST',{code:' save10 ',discountType:'PERCENT',discountValue:10,
        startAt:'2026-11-13T00:00:00Z',endAt:'2026-11-20T00:00:00Z'});
      assert.equal(promotion.status,201); assert.equal(promotion.json.data.code,'SAVE10');
      const edited = await request(ownerA,`/promotion-codes/${promotion.json.data.id}`,'PATCH',{name:'Weekend'});
      assert.equal(edited.status,200); assert.equal(edited.json.data.name,'Weekend');
      assert.equal((await request(ownerB,`/promotion-codes/${promotion.json.data.id}`,'PATCH',{isActive:false})).status,404);
      assert.equal((await request(ownerA,'/promotion-codes')).json.data.length,1);
    } finally { await app.close(); }
  } finally {
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    if (dataSource.isInitialized) await dataSource.destroy();
  }
});
