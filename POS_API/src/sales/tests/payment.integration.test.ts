import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { dataSource } from '../../database/data-source';
import { SalesService } from '../sales.service';
import { ShiftsService } from '../../shifts/shifts.service';
import { TransferAttemptsService } from '../transfer-attempts.service';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import * as bcrypt from 'bcryptjs';

test('ST-1.AC-1 BR-31/34/44 payment migration preserves data and enforces payment constraints', { timeout: 120_000 }, async () => {
  const name = `pos_pb09_test_${randomBytes(6).toString('hex')}`;
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Only a local sandbox is allowed');
  url.pathname = `/${name}`;
  const baseline = new DataSource({ type: 'postgres', url: url.toString(), entities: dataSource.options.entities,
    migrations: (dataSource.options.migrations as string[]).map(pattern => pattern) });
  await dataSource.initialize();
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);
    await baseline.initialize();
    // Apply historical migrations first so existing business rows prove upgrade safety.
    const migrations = [...baseline.migrations];
    baseline.migrations.splice(0, baseline.migrations.length, ...migrations.filter(m => m.name !== 'Payments20261109000000'));
    await baseline.runMigrations();
    const store=randomUUID(), branch=randomUUID(), actor=randomUUID(), shift=randomUUID(), invoice=randomUUID();
    await baseline.query('INSERT INTO stores(id,name) VALUES($1,$2)',[store,'Payment migration store']);
    await baseline.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)',[branch,store,'B1','Branch']);
    await baseline.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash)
      VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),'Cashier','st1_cashier','test-hash')`,[actor,store,branch]);
    await baseline.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,status,started_at)
      VALUES($1,$2,$3,'CASHIER','OPEN',now())`,[shift,branch,actor]);
    await baseline.query(`INSERT INTO invoices(id,branch_id,work_shift_id,created_by,invoice_code,order_type,status,subtotal,total_amount)
      VALUES($1,$2,$3,$4,'HD12345678','TAKEAWAY','OPEN',50000,50000)`,[invoice,branch,shift,actor]);
    const ingredient=randomUUID(), movement=randomUUID();
    await baseline.query('INSERT INTO ingredients(id,store_id,name,unit) VALUES($1,$2,$3,$4)',[ingredient,store,'Sugar','g']);
    await baseline.query(`INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,created_by)
      VALUES($1,$2,$3,'IMPORT',10,0,$4)`,[movement,branch,ingredient,actor]);
    baseline.migrations.splice(0, baseline.migrations.length, ...migrations);
    await baseline.runMigrations();
    const [preserved] = await baseline.query('SELECT total_amount FROM invoices WHERE id=$1',[invoice]);
    assert.equal(preserved.total_amount,'50000','ST-1 existing invoice total survives upgrade');
    const [stock] = await baseline.query('SELECT current_stock FROM branch_ingredient_stocks WHERE branch_id=$1 AND ingredient_id=$2',[branch,ingredient]);
    assert.equal(stock.current_stock,'10.000','ST-1 existing stock survives upgrade');
    const [entry] = await baseline.query('SELECT source,created_by FROM stock_movements WHERE id=$1',[movement]);
    assert.equal(entry.source,'USER'); assert.equal(entry.created_by,actor);
    await baseline.query(`INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,created_by,source,invoice_id)
      VALUES($1,$2,$3,'SALE',-1,0,NULL,'SYSTEM',$4)`,[randomUUID(),branch,ingredient,invoice]);
    await assert.rejects(baseline.query(`INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,created_by,source)
      VALUES($1,$2,$3,'SALE',-1,0,NULL,'USER')`,[randomUUID(),branch,ingredient]),(e:any)=>e.code==='23514');
    const managerPermissions = await baseline.query(`SELECT p.code FROM role_permissions rp JOIN roles r ON r.id=rp.role_id
      JOIN permissions p ON p.id=rp.permission_id WHERE r.name='MANAGER' AND p.code='pos.sell'`);
    assert.equal(managerPermissions.length, 1, 'MANAGER must receive pos.sell after Sprint 08 migration');
    for (const [permission, roles] of [
      ['store_bank_account.manage', ['OWNER']],
      ['transfer.confirm_manual', ['MANAGER', 'OWNER']],
      ['transfer.exception_read', ['MANAGER', 'OWNER']],
    ] as const) {
      const rows = await baseline.query(`SELECT r.name FROM role_permissions rp JOIN roles r ON r.id=rp.role_id
        JOIN permissions p ON p.id=rp.permission_id WHERE p.code=$1 ORDER BY r.name`, [permission]);
      assert.deepEqual(rows.map((r: any) => r.name), roles);
    }
    const cash = async (key:string, target=invoice, amount=50000, tendered=100000, change=50000) => baseline.query(`INSERT INTO payments
      (id,invoice_id,method,amount,tendered_amount,change_amount,idempotency_key,idempotency_request_hash,created_by)
      VALUES($1,$2,'CASH',$3,$4,$5,$6,$7,$8)`,[randomUUID(),target,amount,tendered,change,key,'a'.repeat(64),actor]);
    await assert.rejects(cash(randomUUID(),invoice,0), (e:any)=>e.code==='23514', 'BR-31 zero payment forbidden');
    await assert.rejects(cash(randomUUID(),invoice,50000,49999,-1), (e:any)=>e.code==='23514');
    await assert.rejects(cash(randomUUID(),invoice,50000,100000,1), (e:any)=>e.code==='23514');
    await cash(randomUUID());
    await assert.rejects(cash(randomUUID()), (e:any)=>e.code==='23505', 'BR-31 one payment per invoice');
    await baseline.query(`INSERT INTO store_bank_accounts(store_id,bank_bin,account_number,account_name) VALUES($1,'970422','123456789','STORE')`,[store]);
    await assert.rejects(baseline.query(`UPDATE store_bank_accounts SET bank_bin='ABCDEF' WHERE store_id=$1`,[store]),(e:any)=>e.code==='23514');
    const attempt=async(ref:string)=>baseline.query(`INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,
      amount,transfer_reference,idempotency_key,idempotency_request_hash,status) VALUES($1,$2,$3,'970422','123456789','STORE',50000,$4,$5,$6,'PENDING')`,
      [randomUUID(),invoice,store,ref,randomUUID(),'b'.repeat(64)]);
    await attempt('HD12345678ABCDEFGH');
    await assert.rejects(attempt('HD12345678IJKLMNOP'),(e:any)=>e.code==='23505','Only one pending QR per invoice');
    await baseline.query(`INSERT INTO bank_transfer_events(id,provider_event_id,account_number,transfer_amount,received_at,disposition)
      VALUES($1,'event-1','123456789',50000,now(),'QUARANTINED')`,[randomUUID()]);
    await assert.rejects(baseline.query(`INSERT INTO bank_transfer_events(id,provider_event_id,account_number,transfer_amount,received_at,disposition)
      VALUES($1,'event-1','123456789',50000,now(),'QUARANTINED')`,[randomUUID()]),(e:any)=>e.code==='23505');
  } finally {
    if (baseline.isInitialized) await baseline.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
});

test('ST-7 manual bank confirmation and exception scope', {timeout:120_000},async t=>{
  const name=`pos_pb09_manual_${randomBytes(6).toString('hex')}`,url=new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname));url.pathname=`/${name}`;
  const db=new DataSource({type:'postgres',url:url.toString(),entities:dataSource.options.entities,migrations:dataSource.options.migrations});
  const previousEnv=process.env.SEPAY_ENV,previousSecret=process.env.SEPAY_WEBHOOK_SECRET;
  process.env.SEPAY_ENV='test';process.env.SEPAY_WEBHOOK_SECRET='st7-fake-secret-for-local-tests-x';
  await dataSource.initialize();let app:any;
  try{
    await dataSource.query(`CREATE DATABASE "${name}"`);await db.initialize();await db.runMigrations();
    const store=randomUUID(),otherStore=randomUUID(),branch=randomUUID(),branch2=randomUUID(),shift=randomUUID();
    const cashier=randomUUID(),owner=randomUUID(),branchOwner=randomUUID(),manager=randomUUID(),otherManager=randomUUID(),otherOwner=randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2),($3,$4)',[store,'ST7 Store',otherStore,'Other Store']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4),($5,$2,$6,$7)',[branch,store,'M1','Main',branch2,'M2','Other']);
    const password='St7-test-password-123',hash=await bcrypt.hash(password,4);
    for(const [id,storeId,branchId,role,username] of [[cashier,store,branch,'CASHIER','st7_cashier'],[owner,store,null,'OWNER','st7_owner'],
      [manager,store,branch,'MANAGER','st7_manager'],[otherManager,store,branch2,'MANAGER','st7_other_manager'],[branchOwner,store,branch2,'OWNER','st7_branch_owner'],
      [otherOwner,otherStore,null,'OWNER','st7_other_owner']] as const)
      await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
        VALUES($1,$2,$3,(SELECT id FROM roles WHERE name=$4),$5,$5,$6,false)`,[id,storeId,branchId,role,username,hash]);
    // Shared by [B-16] and [B-23]: a CASHIER without branch assignment and without branch.access_all.
    await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
      VALUES($1,$2,NULL,(SELECT id FROM roles WHERE name='CASHIER'),'b16_nobranch','b16_nobranch',$3,false)`,[randomUUID(),store,hash]);
    await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,status,started_at) VALUES($1,$2,$3,'CASHIER','OPEN',now())`,[shift,branch,cashier]);
    const category=randomUUID(),size=randomUUID(),product=randomUUID(),ps=randomUUID(),ingredient=randomUUID();
    await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)',[category,store,'Manual drinks']);
    await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)',[size,store,'M']);
    await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)',[product,category,'Manual tea']);
    await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,25000)',[ps,product,size]);
    await db.query('INSERT INTO ingredients(id,store_id,name,unit) VALUES($1,$2,$3,$4)',[ingredient,store,'Sugar','g']);
    await db.query('INSERT INTO product_size_ingredients(product_size_id,ingredient_id,quantity) VALUES($1,$2,1.000)',[ps,ingredient]);
    let sequence=0;
    const pending=async(scope={branch,shift,cashier})=>{
      const invoiceId=randomUUID(),attemptId=randomUUID(),key=randomUUID(),code='HD'+String(++sequence).padStart(8,'0'),reference=code+'ABCDEFGH';
      await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,created_by,invoice_code,order_type,status,subtotal,total_amount)
        VALUES($1,$2,$3,$4,$5,'TAKEAWAY','OPEN',50000,50000)`,[invoiceId,scope.branch,scope.shift,scope.cashier,code]);
      await db.query(`INSERT INTO invoice_items(id,invoice_id,product_size_id,product_name,size_name,unit_price,quantity,line_total)
        VALUES($1,$2,$3,'Manual tea','M',25000,2,50000)`,[randomUUID(),invoiceId,ps]);
      await db.query(`INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,amount,
        transfer_reference,idempotency_key,idempotency_request_hash,status)
        VALUES($1,$2,$3,'970422','123456789','STORE',50000,$4,$5,$6,'PENDING')`,[attemptId,invoiceId,store,reference,key,'a'.repeat(64)]);
      return {invoiceId,attemptId,key,reference};
    };
    const origin='http://localhost:5173';process.env.PUBLIC_ORIGIN=origin;process.env.JWT_SECRET='j'.repeat(32);process.env.CSRF_SECRET='c'.repeat(32);
    const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(DataSource).useValue(db).compile();
    app=module.createNestApplication({logger:false,rawBody:true});await app.listen(0,'127.0.0.1');
    const base=`http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
    const login=async(username:string)=>{
      const response=await fetch(`${base}/auth/login`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username,password})});
      assert.equal(response.status,200);const cookies=response.headers.getSetCookie().map(v=>v.split(';')[0]);
      return {Cookie:cookies.join('; '),Origin:origin,'X-CSRF-Token':cookies.find(v=>v.startsWith('__Host-pos_csrf='))!.slice(16),'Content-Type':'application/json'};
    };
    const mh=await login('st7_manager'),oh=await login('st7_owner'),ownerBranchHeaders=await login('st7_branch_owner'),ch=await login('st7_cashier'),bh=await login('st7_other_manager'),xh=await login('st7_other_owner');
    const confirm=(qr:any,headers:Record<string,string>,body:object,key=randomUUID())=>fetch(`${base}/transfer-attempts/${qr.attemptId}/confirm-manual`,{
      method:'POST',headers:{...headers,'Idempotency-Key':key},body:JSON.stringify(body)});
    const body={transactionRef:'FT-ST7-1',actualReceivedAmount:60000,reason:'Đã đối chiếu sao kê'};
    await t.test('[R1-1] OWNER access_all reads payment state across branches without exposing other tenants',async()=>{
      const qr=await pending();
      for(const path of [`/invoices/${qr.invoiceId}/transfer-attempts`,`/invoices/${qr.invoiceId}/payment-preview`,`/invoices/${qr.invoiceId}`]){
        assert.equal((await fetch(base+path,{headers:ownerBranchHeaders})).status,200,`OWNER access_all must read ${path}`);
        assert.equal((await fetch(base+path,{headers:bh})).status,404,`MANAGER other branch must not read ${path}`);
        assert.equal((await fetch(base+path,{headers:xh})).status,404,`OWNER other store must not read ${path}`);
      }
    });
    await t.test('[R1-1] OWNER access_all cancels QR of another branch while holding a cashier shift there',async()=>{
      const branch3=randomUUID(),shift3=randomUUID();
      await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)',[branch3,store,'M3','Third']);
      await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,status,started_at) VALUES($1,$2,$3,'CASHIER','OPEN',now())`,[shift3,branch3,branchOwner]);
      const qr=await pending({branch:branch3,shift:shift3,cashier:branchOwner});
      const cancel=(headers:Record<string,string>)=>{const {'Content-Type':_type,...bodyless}=headers;return fetch(`${base}/transfer-attempts/${qr.attemptId}/cancel`,{method:'POST',headers:bodyless});};
      assert.equal((await cancel(bh)).status,404,'MANAGER other branch must not cancel');
      assert.equal((await cancel(xh)).status,404,'OWNER other store must not cancel');
      assert.equal((await db.query('SELECT status FROM transfer_attempts WHERE id=$1',[qr.attemptId]))[0].status,'PENDING');
      assert.equal((await cancel(ownerBranchHeaders)).status,204,'OWNER access_all must cancel QR on the branch of own cashier shift');
      assert.equal((await db.query('SELECT status FROM transfer_attempts WHERE id=$1',[qr.attemptId]))[0].status,'CANCELLED');
    });
    const attemptCancel=(qr:any,headers:Record<string,string>)=>{const {'Content-Type':_type,...bodyless}=headers;return fetch(`${base}/transfer-attempts/${qr.attemptId}/cancel`,{method:'POST',headers:bodyless});};
    const qrState=async(qr:any)=>({
      attempt:(await db.query('SELECT status FROM transfer_attempts WHERE id=$1',[qr.attemptId]))[0].status,
      invoice:(await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status});
    await t.test('[B-14] cashier of another branch cannot cancel a QR attempt (404, nothing changes)',async()=>{
      const otherCashier=randomUUID();
      await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
        VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),'b14_cashier2','b14_cashier2',$4,false)`,[otherCashier,store,branch2,hash]);
      const qr=await pending(),foreign=await login('b14_cashier2');
      const response=await attemptCancel(qr,foreign);
      assert.equal(response.status,404,'Cashier of another branch must not see the attempt');
      assert.equal((await response.json() as any).error.code,'NOT_FOUND');
      assert.deepEqual(await qrState(qr),{attempt:'PENDING',invoice:'OPEN'});
    });
    await t.test('[B-14] cancelling a QR attempt after the cashier shift closed returns SHIFT_NOT_OPEN and changes nothing',async()=>{
      const qr=await pending();
      await db.query(`UPDATE work_shifts SET status='CLOSED' WHERE id=$1`,[shift]);
      try{
        const response=await attemptCancel(qr,ch);
        assert.equal(response.status,409);
        assert.equal((await response.json() as any).error.code,'SHIFT_NOT_OPEN');
        assert.deepEqual(await qrState(qr),{attempt:'PENDING',invoice:'OPEN'});
      }finally{await db.query(`UPDATE work_shifts SET status='OPEN' WHERE id=$1`,[shift]);}
    });
    await t.test('[B-16] user without branch.access_all and without branchId gets 404 on payment-preview of another branch invoice',async()=>{
      const qr=await pending(),headers=await login('b16_nobranch');
      const response=await fetch(`${base}/invoices/${qr.invoiceId}/payment-preview`,{headers});
      assert.equal(response.status,404);
      assert.equal((await response.json() as any).error.code,'NOT_FOUND');
    });
    await t.test('[B-16] user without branch.access_all and without branchId gets 404 on creating a transfer attempt for another branch invoice',async()=>{
      const qr=await pending(),headers=await login('b16_nobranch');
      const before=(await db.query('SELECT count(*)::int AS n FROM transfer_attempts WHERE invoice_id=$1',[qr.invoiceId]))[0].n;
      const response=await fetch(`${base}/invoices/${qr.invoiceId}/transfer-attempts`,{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID()},body:JSON.stringify({amount:50000})});
      assert.equal(response.status,404);
      assert.equal((await response.json() as any).error.code,'NOT_FOUND');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM transfer_attempts WHERE invoice_id=$1',[qr.invoiceId]))[0].n,before);
    });
    await t.test('[B-23] cancel QR without branch assignment returns 403',async()=>{
      const qr=await pending(),headers=await login('b16_nobranch');
      assert.deepEqual(await qrState(qr),{attempt:'PENDING',invoice:'OPEN'});
      const response=await attemptCancel(qr,headers);
      assert.equal(response.status,403);
      assert.equal((await response.json() as any).error.code,'PERMISSION_DENIED');
      assert.deepEqual(await qrState(qr),{attempt:'PENDING',invoice:'OPEN'});
    });
    await t.test('[B-27] cancel QR without pos.sell returns 403',async()=>{
      const qr=await pending();
      const grant=`FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE name='CASHIER') AND permission_id=(SELECT id FROM permissions WHERE code='pos.sell')`;
      assert.equal((await db.query(`SELECT count(*)::int AS n ${grant}`))[0].n,1,'CASHIER starts with pos.sell');
      assert.deepEqual(await qrState(qr),{attempt:'PENDING',invoice:'OPEN'});
      await db.query(`DELETE ${grant}`);
      try{
        const response=await attemptCancel(qr,ch);
        assert.equal(response.status,403);
        assert.equal((await response.json() as any).error.code,'PERMISSION_DENIED');
        assert.deepEqual(await qrState(qr),{attempt:'PENDING',invoice:'OPEN'});
      }finally{
        await db.query(`INSERT INTO role_permissions(role_id,permission_id) VALUES((SELECT id FROM roles WHERE name='CASHIER'),(SELECT id FROM permissions WHERE code='pos.sell'))`);
      }
      assert.equal((await db.query(`SELECT count(*)::int AS n ${grant}`))[0].n,1,'pos.sell restored');
    });
    await t.test('[B-2] user without branch.access_all and without branchId cannot read another branch invoice (BR-70/BR-71)',async()=>{
      const qr=await pending();
      const sales=new SalesService(db),attempts=new TransferAttemptsService(db,sales);
      const user=(permissions:string[],branchId:string|null)=>({id:cashier,username:'b2',fullName:'B2',role:'CASHIER',storeId:store,branchId,permissions,mustChangePassword:false});
      const notFound=(e:any)=>e.getStatus?.()===404&&e.getResponse().code==='NOT_FOUND';
      await assert.rejects(sales.get(user(['pos.sell'],null),qr.invoiceId),notFound,'sales.get must not fail open');
      await assert.rejects(attempts.getPendingTransferAttempt(user(['pos.sell'],null),qr.invoiceId),notFound,'transfer attempts must not fail open');
      assert.equal((await sales.get(user(['pos.sell','branch.access_all'],null),qr.invoiceId)).id,qr.invoiceId,'access_all without branch still reads');
      assert.equal((await sales.get(user(['pos.sell'],branch),qr.invoiceId)).id,qr.invoiceId,'own branch still reads');
      assert.equal((await attempts.getPendingTransferAttempt(user(['pos.sell','branch.access_all'],null),qr.invoiceId))?.invoiceId,qr.invoiceId);
      assert.equal((await attempts.getPendingTransferAttempt(user(['pos.sell'],branch),qr.invoiceId))?.invoiceId,qr.invoiceId);
      await assert.rejects(sales.get(user(['pos.sell'],branch2),qr.invoiceId),notFound,'other branch still 404');
    });
    const webhook=async(qr:any,id:number,bankRef:string)=>{
      const payload=JSON.stringify({id,accountNumber:'123456789',code:qr.reference,content:qr.reference,transferType:'in',transferAmount:50000,referenceCode:bankRef});
      const timestamp=String(Math.floor(Date.now()/1000)),signature='sha256='+createHmac('sha256',process.env.SEPAY_WEBHOOK_SECRET!).update(timestamp+'.').update(payload).digest('hex');
      return fetch(`${base}/payments/sepay/webhook`,{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Signature':signature,'X-SePay-Timestamp':timestamp},body:payload});
    };
    await t.test('[B-15] promotion with one remaining use is consumed by the first confirmed QR; the second order stays OPEN with PROMOTION_INVALID',async()=>{
      const promo=randomUUID(),first=await pending(),second=await pending();
      await db.query(`INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,start_at,end_at,usage_limit,used_count)
        VALUES($1,$2,'B15PROMO','FIXED',10000,now()-interval '1 day',now()+interval '1 day',3,2)`,[promo,store]);
      for(const qr of [first,second])
        await db.query(`INSERT INTO invoice_promotion_codes(invoice_id,promotion_code_id,code,discount_amount) VALUES($1,$2,'B15PROMO',10000)`,[qr.invoiceId,promo]);
      const used=async()=>(await db.query('SELECT used_count FROM promotion_codes WHERE id=$1',[promo]))[0].used_count;
      assert.equal(await used(),2);
      assert.equal((await webhook(first,7551,'FT-B15-1')).status,200);
      assert.deepEqual(await qrState(first),{attempt:'PAID',invoice:'PAID'});
      assert.equal(await used(),3,'first confirmation consumes the last use');
      assert.equal((await webhook(second,7552,'FT-B15-2')).status,200);
      assert.equal((await db.query(`SELECT disposition FROM bank_transfer_events WHERE provider_event_id='7552'`))[0].disposition,'PROMOTION_INVALID');
      assert.deepEqual(await qrState(second),{attempt:'PENDING',invoice:'OPEN'});
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[second.invoiceId]))[0].n,0);
      assert.equal(await used(),3,'second order must not consume another use');
      // Still needed: test_ST7_exception_visibility counts every exception of this branch, so B-15's PROMOTION_INVALID event must not leak into it.
      await db.query("DELETE FROM bank_transfer_events WHERE provider_event_id IN ('7551','7552')");
    });
    await t.test('test_ST7_manual_confirm_replay',async()=>{
      const qr=await pending(),key=randomUUID(),response=await confirm(qr,mh,body,key);
      assert.equal(response.status,201,'MANAGER without cashier shift must confirm transfer');const original=(await response.json() as any).data;
      assert.equal(original.invoiceId,qr.invoiceId);assert.equal(original.amount,50000);assert.equal(original.actualReceivedAmount,60000);assert.equal(original.excessAmount,10000);
      assert.equal(original.method,'TRANSFER');assert.equal(original.confirmationSource,'MANUAL');
      const [payment]=await db.query('SELECT transaction_ref,transaction_ref_kind,confirmed_by,confirmation_reason,created_by FROM payments WHERE invoice_id=$1',[qr.invoiceId]);
      assert.deepEqual(payment,{transaction_ref:'FT-ST7-1',transaction_ref_kind:'BANK',confirmed_by:manager,confirmation_reason:body.reason,created_by:manager});
      const [invoice]=await db.query('SELECT status,work_shift_id FROM invoices WHERE id=$1',[qr.invoiceId]);assert.deepEqual(invoice,{status:'PAID',work_shift_id:shift});
      const replay=await confirm(qr,mh,body,key);assert.equal(replay.status,201);assert.equal(replay.headers.get('Idempotent-Replay'),'true');assert.deepEqual((await replay.json() as any).data,original);
      const mismatch=await confirm(qr,mh,{...body,reason:'Lý do khác'},key);assert.equal(mismatch.status,409);
      assert.equal((await mismatch.json() as any).error.code,'IDEMPOTENCY_KEY_REUSED');
      assert.equal((await webhook(qr,7401,body.transactionRef)).status,200);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,1);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[qr.invoiceId]))[0].n,1);
    });
    await t.test('[B-7] manual confirm replay with uppercase attempt id',async()=>{
      const qr=await pending(),key=randomUUID(),upper={...qr,attemptId:qr.attemptId.toUpperCase()};
      const first=await confirm(upper,mh,{...body,transactionRef:'FT-B7-UPPER'},key);assert.equal(first.status,201);
      const original=(await first.json() as any).data;
      const replay=await confirm(upper,mh,{...body,transactionRef:'FT-B7-UPPER'},key);
      assert.equal(replay.status,201,'replay with uppercase UUID must not be treated as key reuse');
      assert.equal(replay.headers.get('Idempotent-Replay'),'true');assert.deepEqual((await replay.json() as any).data,original);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,1);
    });
    await t.test('test_ST7_manager_scope',async()=>{
      const qr=await pending();assert.equal((await confirm(qr,ch,body)).status,403);
      assert.equal((await confirm(qr,bh,body)).status,404);assert.equal((await confirm(qr,xh,body)).status,404);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      const response=await confirm(qr,oh,{...body,transactionRef:'FT-ST7-OWNER'});assert.equal(response.status,201);
      assert.equal((await db.query('SELECT confirmed_by FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].confirmed_by,owner);
      const crossBranch=await pending(),cross=await confirm(crossBranch,ownerBranchHeaders,{...body,transactionRef:'FT-OWNER-BRANCH'});
      assert.equal(cross.status,201,'OWNER with branch assignment can confirm other branches in own store');
    });
    await t.test('test_ST7_invalid_ref_amount_reason',async()=>{
      const qr=await pending(),key=randomUUID();
      for(const invalid of [{...body,transactionRef:''},{...body,reason:'   '},{...body,actualReceivedAmount:0},{...body,extra:'x'}])
        assert.equal((await confirm(qr,mh,invalid)).status,422);
      const less=await confirm(qr,mh,{...body,actualReceivedAmount:49999});assert.equal(less.status,422);
      assert.equal((await less.json() as any).error.code,'TRANSFER_AMOUNT_INSUFFICIENT');
      const sameKey=await confirm(qr,mh,{...body,transactionRef:'FT-NEW'},qr.key);assert.equal(sameKey.status,409);
      assert.equal((await sameKey.json() as any).error.code,'IDEMPOTENCY_KEY_REUSED');
      const reused=await confirm(qr,mh,body,key);assert.equal(reused.status,409);
      assert.equal((await reused.json() as any).error.code,'BANK_TRANSACTION_REUSED');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      const closed=await pending();await db.query(`UPDATE work_shifts SET status='CLOSED' WHERE id=$1`,[shift]);
      try{const result=await confirm(closed,mh,{...body,transactionRef:'FT-CLOSED'});assert.equal(result.status,409);assert.equal((await result.json() as any).error.code,'SHIFT_CLOSED');}
      finally{await db.query(`UPDATE work_shifts SET status='OPEN' WHERE id=$1`,[shift]);}
      const promo=randomUUID(),promoQr=await pending();
      await db.query(`INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,start_at,end_at,usage_limit,used_count)
        VALUES($1,$2,'ST7PROMO','FIXED',10000,now()-interval '1 day',now()+interval '1 day',1,1)`,[promo,store]);
      await db.query(`INSERT INTO invoice_promotion_codes(invoice_id,promotion_code_id,code,discount_amount) VALUES($1,$2,'ST7PROMO',10000)`,[promoQr.invoiceId,promo]);
      const invalidPromo=await confirm(promoQr,mh,{...body,transactionRef:'FT-INVALID-PROMO'});assert.equal(invalidPromo.status,422);
      assert.equal((await invalidPromo.json() as any).error.code,'PROMOTION_NOT_APPLICABLE');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[promoQr.invoiceId]))[0].n,0);
      assert.equal((await db.query('SELECT used_count FROM promotion_codes WHERE id=$1',[promo]))[0].used_count,1);
    });
    await t.test('[B-12] manual confirm PROMOTION_NOT_APPLICABLE uses the standard message',async()=>{
      const promo=randomUUID(),qr=await pending();
      await db.query(`INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,start_at,end_at,usage_limit,used_count)
        VALUES($1,$2,'B12PROMO','FIXED',10000,now()-interval '1 day',now()+interval '1 day',1,1)`,[promo,store]);
      await db.query(`INSERT INTO invoice_promotion_codes(invoice_id,promotion_code_id,code,discount_amount) VALUES($1,$2,'B12PROMO',10000)`,[qr.invoiceId,promo]);
      const response=await confirm(qr,mh,{...body,transactionRef:'FT-B12'});assert.equal(response.status,422);
      const error=(await response.json() as any).error;
      assert.equal(error.code,'PROMOTION_NOT_APPLICABLE');
      assert.equal(error.message,'Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.');
    });
    await t.test('test_ST7_exception_visibility',async()=>{
      const qr=await pending();
      const add=async(id:string,disposition:string,storeId:string|null,branchId:string|null)=>db.query(`INSERT INTO bank_transfer_events
        (id,provider_event_id,account_number,transfer_amount,disposition,store_id,branch_id,invoice_id,attempt_id)
        VALUES($1,$2,'123456789',30000,$3,$4,$5,$6,$7)`,[randomUUID(),id,disposition,storeId,branchId,storeId?qr.invoiceId:null,storeId?qr.attemptId:null]);
      await add('st7-under','UNDERPAID',store,branch);await add('st7-late','ATTEMPT_CANCELLED',store,branch);
      await add('st7-promo','PROMOTION_INVALID',store,branch);await add('st7-duplicate','DUPLICATE',store,branch);
      await add('st7-other-branch','UNDERPAID',store,branch2);await add('st7-quarantine','QUARANTINED',null,null);
      const get=(headers:Record<string,string>,query='')=>fetch(`${base}/bank-transfer-exceptions${query}`,{headers});
      const managerResponse=await get(mh);assert.equal(managerResponse.status,200,'MANAGER must see scoped exceptions');
      const managerData=(await managerResponse.json() as any).data;
      assert.deepEqual(managerData.map((v:any)=>v.reason).sort(),['ATTEMPT_CANCELLED','DUPLICATE','INVOICE_NOT_OPEN','PROMOTION_INVALID','UNDERPAID']);
      assert.equal(managerData.filter((v:any)=>v.invoiceId===qr.invoiceId).length,4);
      assert.equal((await get(ch)).status,403);const other=(await (await get(bh)).json() as any).data;assert.equal(other.length,1);
      assert.equal((await (await get(xh)).json() as any).data.length,0);
      const all=(await (await get(oh)).json() as any).data;assert.equal(all.length,6);
      assert.equal((await (await get(ownerBranchHeaders)).json() as any).data.length,6);
      const page=await get(mh,'?limit=2');assert.equal(page.status,200);const firstPage=await page.json() as any;
      assert.equal(firstPage.data.length,2);assert.equal(firstPage.meta.total,5);assert.ok(firstPage.meta.nextCursor);
      const secondPage=await (await get(mh,`?limit=2&cursor=${firstPage.meta.nextCursor}`)).json() as any;
      assert.equal(secondPage.data.length,2);assert.notEqual(secondPage.data[0].id,firstPage.data[0].id);
      assert.equal((await get(bh,`?cursor=${firstPage.meta.nextCursor}`)).status,422);
    });
    await t.test('test_ST7_manual_webhook_reference_race',async()=>{
      const actor2=randomUUID(),shift2=randomUUID();
      await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash)
        VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),'Cashier','st7_race_cashier','hash')`,[actor2,store,branch2]);
      await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,status,started_at) VALUES($1,$2,$3,'CASHIER','OPEN',now())`,[shift2,branch2,actor2]);
      const manual=await pending(),auto=await pending({branch:branch2,shift:shift2,cashier:actor2}),ref='FT-MANUAL-RACE';
      const [manualResponse,webhookResponse]=await Promise.all([confirm(manual,oh,{...body,transactionRef:ref}),webhook(auto,7402,ref)]);
      assert.equal(webhookResponse.status,200);assert.ok([201,409].includes(manualResponse.status));
      const payments=await db.query('SELECT invoice_id,confirmation_source FROM payments WHERE invoice_id=ANY($1::uuid[])',[[manual.invoiceId,auto.invoiceId]]);
      assert.equal(payments.length,1);
      const [event]=await db.query(`SELECT disposition,store_id,branch_id,invoice_id FROM bank_transfer_events WHERE provider_event_id='7402'`);
      if(manualResponse.status===201){assert.deepEqual(event,{disposition:'DUPLICATE',store_id:store,branch_id:branch2,invoice_id:auto.invoiceId});}
      else{assert.equal((await manualResponse.json() as any).error.code,'BANK_TRANSACTION_REUSED');assert.equal(event.disposition,'PAID');}
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=ANY($1::uuid[])`,[[manual.invoiceId,auto.invoiceId]]))[0].n,1);
      const duplicateResponse=await (await fetch(`${base}/bank-transfer-exceptions`,{headers:bh})).json() as any;
      if(manualResponse.status===201)assert.ok(duplicateResponse.data.some((v:any)=>v.reason==='DUPLICATE'&&v.invoiceId===auto.invoiceId));
      const manualFirst=await pending(),autoSecond=await pending({branch:branch2,shift:shift2,cashier:actor2}),ref2='FT-MANUAL-FIRST';
      assert.equal((await confirm(manualFirst,oh,{...body,transactionRef:ref2})).status,201);
      assert.equal((await webhook(autoSecond,7403,ref2)).status,200);
      assert.equal((await db.query(`SELECT disposition FROM bank_transfer_events WHERE provider_event_id='7403'`))[0].disposition,'DUPLICATE');
      const autoFirst=await pending({branch:branch2,shift:shift2,cashier:actor2}),manualSecond=await pending(),ref3='FT-WEBHOOK-FIRST';
      assert.equal((await webhook(autoFirst,7404,ref3)).status,200);
      const denied=await confirm(manualSecond,oh,{...body,transactionRef:ref3});assert.equal(denied.status,409);
      assert.equal((await denied.json() as any).error.code,'BANK_TRANSACTION_REUSED');
      const fallback=await pending({branch:branch2,shift:shift2,cashier:actor2}),bank=await pending();
      assert.equal((await webhook(fallback,7405,'')).status,200);
      assert.equal((await confirm(bank,oh,{...body,transactionRef:'SEPAY:7405'})).status,201,'BANK and SEPAY_EVENT namespaces are distinct');
    });
    await t.test('test_ST7_manual_rollback',async()=>{
      const qr=await pending(),key=randomUUID();
      await db.query(`CREATE FUNCTION st7_fail_paid() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='PAID' THEN RAISE EXCEPTION 'ST7 rollback'; END IF; RETURN NEW; END $$`);
      await db.query('CREATE TRIGGER st7_fail_paid BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION st7_fail_paid()');
      try{assert.equal((await confirm(qr,mh,{...body,transactionRef:'FT-ROLLBACK'},key)).status,500);}
      finally{await db.query('DROP TRIGGER st7_fail_paid ON invoices');await db.query('DROP FUNCTION st7_fail_paid()');}
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status,'OPEN');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      assert.equal((await confirm(qr,mh,{...body,transactionRef:'FT-ROLLBACK'},key)).status,201);
    });
    await t.test('test_ST7_wrong_account_reaches_managers [V3-2]',async()=>{
      const send=async(id:number,changes:Record<string,unknown>)=>{
        const payload=JSON.stringify({id,accountNumber:'123456789',code:null,content:'',transferType:'in',transferAmount:50000,referenceCode:'FT-V32-'+id,...changes});
        const timestamp=String(Math.floor(Date.now()/1000)),signature='sha256='+createHmac('sha256',process.env.SEPAY_WEBHOOK_SECRET!).update(timestamp+'.').update(payload).digest('hex');
        return fetch(`${base}/payments/sepay/webhook`,{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Signature':signature,'X-SePay-Timestamp':timestamp},body:payload});
      };
      const list=async(headers:Record<string,string>)=>(await (await fetch(`${base}/bank-transfer-exceptions?limit=100`,{headers})).json() as any);
      const qr=await pending(),rows=async(id:string)=>db.query('SELECT disposition,store_id,branch_id,invoice_id,attempt_id FROM bank_transfer_events WHERE provider_event_id=$1',[id]);
      const totalBefore=(await list(oh)).meta.total;
      const wrong=await send(7501,{accountNumber:'999999999',code:qr.reference,content:qr.reference});
      assert.equal(wrong.status,200);assert.deepEqual(await wrong.json(),{success:true});
      assert.deepEqual(await rows('7501'),[{disposition:'QUARANTINED',store_id:store,branch_id:branch,invoice_id:qr.invoiceId,attempt_id:qr.attemptId}]);
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status,'OPEN');
      assert.equal((await db.query('SELECT status FROM transfer_attempts WHERE id=$1',[qr.attemptId]))[0].status,'PENDING');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      for(const headers of [mh,oh,ownerBranchHeaders]){
        const mine=(await list(headers)).data.filter((v:any)=>v.invoiceId===qr.invoiceId);
        assert.equal(mine.length,1);assert.equal(mine[0].reason,'WRONG_ACCOUNT');assert.equal(mine[0].amount,50000);
        assert.deepEqual(Object.keys(mine[0]).sort(),['amount','id','invoiceId','reason','receivedAt']);
      }
      assert.equal((await fetch(`${base}/bank-transfer-exceptions`,{headers:ch})).status,403);
      assert.equal((await list(bh)).data.filter((v:any)=>v.invoiceId===qr.invoiceId).length,0);
      assert.equal((await list(xh)).data.filter((v:any)=>v.invoiceId===qr.invoiceId).length,0);
      assert.equal((await send(7501,{accountNumber:'999999999',code:qr.reference,content:qr.reference})).status,200);
      assert.equal((await rows('7501')).length,1);
      assert.equal((await list(oh)).meta.total,totalBefore+1);
      const internal=[[7502,{accountNumber:'999999999',content:'no token'}],
        [7503,{accountNumber:'999999999',content:`${qr.reference} HDZZZZZZZZABCDEFGH`}],
        [7504,{accountNumber:'999999999',content:'HDZZZZZZZZABCDEFGH'}]] as const;
      for(const [id,changes] of internal){
        assert.equal((await send(id,changes)).status,200);
        assert.deepEqual(await rows(String(id)),[{disposition:'QUARANTINED',store_id:null,branch_id:null,invoice_id:null,attempt_id:null}]);
      }
      assert.equal((await list(oh)).meta.total,totalBefore+1,'internal quarantine stays hidden');
    });
    await t.test('test_ST7_outgoing_wrong_account_stays_internal [V3-2-out]',async()=>{
      const list=async(headers:Record<string,string>)=>(await (await fetch(`${base}/bank-transfer-exceptions?limit=100`,{headers})).json() as any);
      const qr=await pending();
      const before=[(await list(mh)).meta.total,(await list(oh)).meta.total,(await list(ownerBranchHeaders)).meta.total];
      const payload=JSON.stringify({id:7601,accountNumber:'999999999',code:qr.reference,content:qr.reference,transferType:'out',transferAmount:50000,referenceCode:'FT-V32-OUT-7601'});
      const timestamp=String(Math.floor(Date.now()/1000)),signature='sha256='+createHmac('sha256',process.env.SEPAY_WEBHOOK_SECRET!).update(timestamp+'.').update(payload).digest('hex');
      const response=await fetch(`${base}/payments/sepay/webhook`,{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Signature':signature,'X-SePay-Timestamp':timestamp},body:payload});
      assert.equal(response.status,200);assert.deepEqual(await response.json(),{success:true});
      assert.deepEqual(await db.query('SELECT disposition,store_id,branch_id,invoice_id,attempt_id FROM bank_transfer_events WHERE provider_event_id=$1',['7601']),
        [{disposition:'QUARANTINED',store_id:null,branch_id:null,invoice_id:null,attempt_id:null}]);
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status,'OPEN');
      assert.equal((await db.query('SELECT status FROM transfer_attempts WHERE id=$1',[qr.attemptId]))[0].status,'PENDING');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      const after=[await list(mh),await list(oh),await list(ownerBranchHeaders)];
      assert.deepEqual(after.map(v=>v.meta.total),before,'outgoing wrong-account money must not reach managers');
      for(const v of after)assert.equal(v.data.filter((x:any)=>x.invoiceId===qr.invoiceId).length,0);
    });
  }finally{
    if(app)await app.close();if(db.isInitialized)await db.destroy();await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await dataSource.destroy();
    if(previousEnv===undefined)delete process.env.SEPAY_ENV;else process.env.SEPAY_ENV=previousEnv;
    if(previousSecret===undefined)delete process.env.SEPAY_WEBHOOK_SECRET;else process.env.SEPAY_WEBHOOK_SECRET=previousSecret;
  }
});

test('ST-1.AC-2 E2E-AC-7 bank account and QR snapshot accept 19 digits and reject 20', {timeout:120_000},async t=>{
  const name=`pos_pb09_bank_limit_${randomBytes(6).toString('hex')}`;
  const url=new URL(process.env.DATABASE_URL!);url.pathname=`/${name}`;
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
  const db=new DataSource({type:'postgres',url:url.toString(),entities:dataSource.options.entities,migrations:dataSource.options.migrations});
  await dataSource.initialize();
  try{
    await dataSource.query(`CREATE DATABASE "${name}"`);await db.initialize();await db.runMigrations();
    const store=randomUUID(),branch=randomUUID(),actor=randomUUID(),shift=randomUUID(),invoice=randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2)',[store,'Account boundary store']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)',[branch,store,'LIMIT','Branch']);
    await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash) VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),'Cashier','limit_cashier','hash')`,[actor,store,branch]);
    await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,status,started_at) VALUES($1,$2,$3,'CASHIER','OPEN',now())`,[shift,branch,actor]);
    await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,created_by,invoice_code,order_type,status,subtotal,total_amount)
      VALUES($1,$2,$3,$4,'HD12345678','TAKEAWAY','OPEN',50000,50000)`,[invoice,branch,shift,actor]);
    await t.test('test_ST1_bank_account_19_limit',async()=>{
      await db.query(`INSERT INTO store_bank_accounts(store_id,bank_bin,account_number,account_name) VALUES($1,'970422',$2,'STORE')`,[store,'1'.repeat(19)]);
      assert.equal((await db.query('SELECT account_number FROM store_bank_accounts WHERE store_id=$1',[store]))[0].account_number,'1'.repeat(19));
      await assert.rejects(db.query('UPDATE store_bank_accounts SET account_number=$2 WHERE store_id=$1',[store,'2'.repeat(20)]),(e:any)=>e.code==='23514','20-digit account must fail CHECK');
      assert.equal((await db.query('SELECT account_number FROM store_bank_accounts WHERE store_id=$1',[store]))[0].account_number,'1'.repeat(19));
    });
    await t.test('test_ST1_bank_snapshot_19_limit',async()=>{
      const insert=async(account:string,ref:string)=>db.query(`INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,
        amount,transfer_reference,idempotency_key,idempotency_request_hash,status) VALUES($1,$2,$3,'970422',$4,'STORE',50000,$5,$6,$7,'CANCELLED')`,
        [randomUUID(),invoice,store,account,ref,randomUUID(),'a'.repeat(64)]);
      await insert('1'.repeat(19),'HD12345678ABCDEFGH');
      await assert.rejects(insert('2'.repeat(20),'HD12345678IJKLMNOP'),(e:any)=>e.code==='23514','20-digit QR snapshot must fail CHECK');
      assert.equal((await db.query('SELECT account_number FROM transfer_attempts WHERE invoice_id=$1',[invoice]))[0].account_number,'1'.repeat(19));
      const columns=await db.query(`SELECT table_name,character_maximum_length FROM information_schema.columns
        WHERE table_name IN ('store_bank_accounts','transfer_attempts') AND column_name='account_number' ORDER BY table_name`);
      assert.deepEqual(columns,[{table_name:'store_bank_accounts',character_maximum_length:34},{table_name:'transfer_attempts',character_maximum_length:34}]);
    });
  }finally{if(db.isInitialized)await db.destroy();await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await dataSource.destroy();}
});

test('ST-4.AC-1 BR-31/32/34/35 CASH payment is atomic and replay safe', {timeout:120_000},async t=>{
  const name=`pos_pb09_cash_${randomBytes(6).toString('hex')}`;
  const url=new URL(process.env.DATABASE_URL!);url.pathname=`/${name}`;
  const db=new DataSource({type:'postgres',url:url.toString(),entities:dataSource.options.entities,migrations:dataSource.options.migrations});
  await dataSource.initialize();
  try{
    await dataSource.query(`CREATE DATABASE "${name}"`);await db.initialize();await db.runMigrations();
    const store=randomUUID(),branch=randomUUID(),actor=randomUUID(),shift=randomUUID(),category=randomUUID(),size=randomUUID(),product=randomUUID(),ps=randomUUID(),ingredient=randomUUID(),promo=randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2)',[store,'ST4 Store']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)',[branch,store,'ST4','Branch']);
    await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash) VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),'Cashier','st4_cashier','hash')`,[actor,store,branch]);
    const password=randomBytes(18).toString('base64url');await db.query('UPDATE users SET password_hash=$2,must_change_password=false WHERE id=$1',[actor,await bcrypt.hash(password,4)]);
    await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,status,started_at) VALUES($1,$2,$3,'CASHIER','OPEN',now())`,[shift,branch,actor]);
    await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)',[category,store,'Drinks']);
    await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)',[size,store,'M']);
    await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)',[product,category,'Tea']);
    await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,20000)',[ps,product,size]);
    await db.query('INSERT INTO ingredients(id,store_id,name,unit) VALUES($1,$2,$3,$4)',[ingredient,store,'Sugar','g']);
    await db.query('INSERT INTO product_size_ingredients(product_size_id,ingredient_id,quantity) VALUES($1,$2,1.000)',[ps,ingredient]);
    await db.query(`INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,start_at,end_at,usage_limit)
      VALUES($1,$2,'SAVE10','FIXED',10000,now()-interval '1 day',now()+interval '1 day',10)`,[promo,store]);
    const user={id:actor,storeId:store,branchId:branch,username:'st4_cashier',fullName:'Cashier',role:'CASHIER',permissions:['pos.sell','invoice.read'],mustChangePassword:false};
    const sales:any=new SalesService(db);
    const cashInput={method:'CASH',amount:50000,tenderedAmount:100000};
    const order=async()=>{const invoice=await sales.create(user,{orderType:'TAKEAWAY'});await sales.addItem(user,invoice.id,{productSizeId:ps,quantity:3});await sales.applyPromotion(user,invoice.id,'SAVE10');return invoice.id;};
    let paidId:string,key:string,payment:any;
    await t.test('[R14-1] cash payment cannot make shift reconciliation exceed BR-103',async()=>{
      await db.query(`INSERT INTO cash_reconciliations(id,work_shift_id,opening_cash,status) VALUES($1,$2,999999950001,'PENDING')`,[randomUUID(),shift]);
      const id=await order();
      await assert.rejects(sales.payCash(user,id,cashInput,randomUUID()),(e:any)=>e.getStatus?.()===422);
      const [state]=await db.query(`SELECT status,(SELECT count(*)::int FROM payments WHERE invoice_id=$1) AS payments,
        (SELECT count(*)::int FROM stock_movements WHERE invoice_id=$1) AS movements FROM invoices WHERE id=$1`,[id]);
      assert.deepEqual(state,{status:'OPEN',payments:0,movements:0});
      await db.query('UPDATE cash_reconciliations SET opening_cash=999999950000 WHERE work_shift_id=$1',[shift]);
      assert.equal((await sales.payCash(user,id,cashInput,randomUUID())).status,'PAID');
      await db.query('UPDATE promotion_codes SET used_count=0 WHERE id=$1',[promo]);
      await db.query('UPDATE cash_reconciliations SET opening_cash=999999930000 WHERE work_shift_id=$1',[shift]);
      const first=await sales.create(user,{orderType:'TAKEAWAY'}),second=await sales.create(user,{orderType:'TAKEAWAY'});
      await sales.addItem(user,first.id,{productSizeId:ps,quantity:1});
      await sales.addItem(user,second.id,{productSizeId:ps,quantity:1});
      const attempts=await Promise.allSettled([first,second].map(invoice=>sales.payCash(user,invoice.id,
        {method:'CASH',amount:20000,tenderedAmount:20000},randomUUID())));
      assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);
      assert.equal((attempts.find(result=>result.status==='rejected') as PromiseRejectedResult).reason.getStatus(),422);
      const loser=attempts[0].status==='rejected'?first:second;
      await sales.cancel(user,loser.id,'Không thanh toán');
      const shifts=new ShiftsService(db);
      const closed=await shifts.closeShift(user,shift,{countedCash:1000000000000});
      assert.equal(closed.reconciliation?.expectedCash,1000000000000);
      await db.query("UPDATE work_shifts SET status='OPEN',ended_at=NULL,closed_by=NULL WHERE id=$1",[shift]);
      const forced=await shifts.forceCloseShift({...user,permissions:[...user.permissions,'shift.force_close']},shift,
        {countedCash:1000000000000,reason:'Kiểm tra'});
      assert.equal(forced.reconciliation?.expectedCash,1000000000000);
      await db.query("UPDATE work_shifts SET status='OPEN',ended_at=NULL,closed_by=NULL WHERE id=$1",[shift]);
      await db.query('UPDATE cash_reconciliations SET opening_cash=0 WHERE work_shift_id=$1',[shift]);
    });
    await t.test('test_ST4_cash_idempotent',async()=>{
      assert.equal(typeof sales.payCash,'function','Missing CASH payment operation');
      paidId=await order();key=randomUUID();
      const results=await Promise.all([sales.payCash(user,paidId,cashInput,key),sales.payCash(user,paidId,cashInput,key)]);
      payment=results[0];assert.equal(results[0].paymentId,results[1].paymentId);
      assert.equal(payment.amount,50000);assert.equal(payment.changeAmount,50000);assert.equal(payment.tenderedAmount,100000);assert.equal(payment.status,'PAID');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[paidId]))[0].n,1);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[paidId]))[0].n,1);
      assert.equal((await db.query('SELECT used_count FROM promotion_codes WHERE id=$1',[promo]))[0].used_count,1);
      await db.query("UPDATE work_shifts SET status='CLOSED' WHERE id=$1",[shift]);
      assert.equal((await sales.payCash(user,paidId.toUpperCase(),cashInput,key.toUpperCase())).paymentId,payment.paymentId);
      await db.query("UPDATE work_shifts SET status='OPEN' WHERE id=$1",[shift]);
      await assert.rejects(sales.payCash(user,paidId,{...cashInput,tenderedAmount:90000},key),(e:any)=>e.getResponse?.().code==='IDEMPOTENCY_KEY_REUSED');
      await assert.rejects(sales.payCash({...user,storeId:randomUUID()},paidId,cashInput,key),(e:any)=>e.getResponse?.().code==='NOT_FOUND');
    });
    await t.test('test_ST4_invalid_amount_and_shift',async()=>{
      assert.equal(typeof sales.payCash,'function','Missing CASH payment operation');
      const id=await order();
      for(const [input,code] of [[{...cashInput,amount:49999},'PAYMENT_AMOUNT_MISMATCH'],[{...cashInput,tenderedAmount:49999},'TENDERED_INSUFFICIENT'],[{...cashInput,amount:0},'VALIDATION_ERROR'],[{...cashInput,amount:1.5},'VALIDATION_ERROR'],[{...cashInput,method:'TRANSFER'},'VALIDATION_ERROR']] as const){
        await assert.rejects(sales.payCash(user,id,input,randomUUID()),(e:any)=>e.getResponse?.().code===code);
      }
      await db.query("UPDATE work_shifts SET status='CLOSED' WHERE id=$1",[shift]);
      await assert.rejects(sales.payCash(user,id,cashInput,randomUUID()),(e:any)=>e.getResponse?.().code==='SHIFT_NOT_OPEN');
      await db.query("UPDATE work_shifts SET status='OPEN' WHERE id=$1",[shift]);
      await assert.rejects(sales.payCash({...user,branchId:randomUUID()},id,cashInput,randomUUID()),(e:any)=>e.getResponse?.().code==='NOT_FOUND');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[id]))[0].n,0);
    });
    await t.test('test_ST4_promo_race_and_rollback',async()=>{
      assert.equal(typeof sales.payCash,'function','Missing CASH payment operation');
      const id=await order(),rollbackKey=randomUUID();
      await db.query('UPDATE promotion_codes SET used_count=usage_limit WHERE id=$1',[promo]);
      await assert.rejects(sales.payCash(user,id,cashInput,randomUUID()),(e:any)=>e.getResponse?.().code==='PROMOTION_NOT_APPLICABLE');
      await db.query('UPDATE promotion_codes SET used_count=1 WHERE id=$1',[promo]);
      await db.query(`CREATE FUNCTION fail_cash_paid() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='PAID' THEN RAISE EXCEPTION 'ST4 rollback'; END IF; RETURN NEW; END $$`);
      await db.query('CREATE TRIGGER fail_cash_paid BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION fail_cash_paid()');
      await assert.rejects(sales.payCash(user,id,cashInput,rollbackKey),/ST4 rollback/);
      await db.query('DROP TRIGGER fail_cash_paid ON invoices');await db.query('DROP FUNCTION fail_cash_paid()');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[id]))[0].n,0);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[id]))[0].n,0);
      assert.equal((await db.query('SELECT used_count FROM promotion_codes WHERE id=$1',[promo]))[0].used_count,1);
      assert.equal((await sales.payCash(user,id,cashInput,rollbackKey)).status,'PAID');
    });
    await t.test('test_ST4_key_collision_and_parallel',async()=>{
      assert.equal(typeof sales.payCash,'function','Missing CASH payment operation');
      const cashId=await order(),zero=await sales.create(user,{orderType:'TAKEAWAY'}),zeroProduct=randomUUID(),zeroSize=randomUUID();
      await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)',[zeroProduct,category,'Zero']);
      await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,0)',[zeroSize,zeroProduct,size]);
      await sales.addItem(user,zero.id,{productSizeId:zeroSize,quantity:1});
      const collisionKey=randomUUID();
      const results=await Promise.allSettled([sales.payCash(user,cashId,cashInput,collisionKey),sales.completeZero(user,zero.id,collisionKey)]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      const loser=results.find(r=>r.status==='rejected') as PromiseRejectedResult;
      assert.equal(loser.reason.getResponse().code,'IDEMPOTENCY_KEY_REUSED');
      await assert.rejects(sales.payCash(user,await order(),cashInput,key),(e:any)=>e.getResponse?.().code==='IDEMPOTENCY_KEY_REUSED');
    });
    await t.test('test_ST4_http_cash_boundary_and_replay',async()=>{
      process.env.PUBLIC_ORIGIN='http://localhost:5173';process.env.JWT_SECRET='j'.repeat(32);process.env.CSRF_SECRET='c'.repeat(32);
      const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(DataSource).useValue(db).compile();
      const app=module.createNestApplication({logger:false});
      try{
        await app.listen(0,'127.0.0.1');const base=`http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
        const login=await fetch(`${base}/auth/login`,{method:'POST',headers:{Origin:process.env.PUBLIC_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({username:'st4_cashier',password})});
        assert.equal(login.status,200);const cookies=login.headers.getSetCookie().map(v=>v.split(';')[0]);
        const headers={Cookie:cookies.join('; '),Origin:process.env.PUBLIC_ORIGIN,'X-CSRF-Token':cookies.find(v=>v.startsWith('__Host-pos_csrf='))!.slice(16),'Content-Type':'application/json'};
        const id=await order(),httpKey=randomUUID();
        const missing=await fetch(`${base}/invoices/${id}/payments`,{method:'POST',headers,body:JSON.stringify(cashInput)});
        assert.equal(missing.status,422,'CASH route must validate idempotency header');
        assert.equal((await missing.json() as any).error.details[0].location,'header');
        const paid=await fetch(`${base}/invoices/${id}/payments`,{method:'POST',headers:{...headers,'Idempotency-Key':httpKey},body:JSON.stringify(cashInput)});
        assert.equal(paid.status,201);const original=await paid.json() as any;
        assert.deepEqual(Object.keys(original.data).sort(),['amount','changeAmount','invoiceId','method','paidAt','paymentId','status','tenderedAmount'].sort());
        assert.equal(original.data.changeAmount,50000);
        const replay=await fetch(`${base}/invoices/${id}/payments`,{method:'POST',headers:{...headers,'Idempotency-Key':httpKey},body:JSON.stringify(cashInput)});
        assert.equal(replay.status,201);assert.equal(replay.headers.get('Idempotent-Replay'),'true');assert.deepEqual(await replay.json(),original);
        const malformed=await fetch(`${base}/invoices/${id}/payments`,{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID()},body:JSON.stringify({...cashInput,totalAmount:1})});
        assert.equal(malformed.status,422);
        const noCsrf=await fetch(`${base}/invoices/${id}/payments`,{method:'POST',headers:{...headers,'X-CSRF-Token':'','Idempotency-Key':randomUUID()},body:JSON.stringify(cashInput)});
        assert.equal(noCsrf.status,403);
        const empty=await sales.create(user,{orderType:'TAKEAWAY'});
        await assert.rejects(sales.payCash(user,empty.id,cashInput,randomUUID()),(e:any)=>e.getResponse?.().code==='INVOICE_EMPTY');
        const pending=await order();
        await db.query(`INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,amount,transfer_reference,idempotency_key,idempotency_request_hash,status)
          VALUES($1,$2,$3,'970422','123456789','STORE',50000,'HD12345678ABCDEFGH',$4,$5,'PENDING')`,[randomUUID(),pending,store,randomUUID(),'a'.repeat(64)]);
        await assert.rejects(sales.payCash(user,pending,cashInput,randomUUID()),(e:any)=>e.getResponse?.().code==='TRANSFER_PENDING');
        const parallel=await order();const attempts=await Promise.allSettled([sales.payCash(user,parallel,cashInput,randomUUID()),sales.payCash(user,parallel,cashInput,randomUUID())]);
        assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
        assert.equal((attempts.find(r=>r.status==='rejected') as PromiseRejectedResult).reason.getResponse().code,'INVOICE_NOT_OPEN');
      }finally{await app.close();}
    });
  }finally{if(db.isInitialized)await db.destroy();await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await dataSource.destroy();}
});

test('ST-3.AC-1 BR-35/39/42/43/72/104 zero completion is atomic and idempotent', {timeout:120_000},async t=>{
  const name=`pos_pb09_zero_${randomBytes(6).toString('hex')}`;
  const url=new URL(process.env.DATABASE_URL!);url.pathname=`/${name}`;
  const db=new DataSource({type:'postgres',url:url.toString(),entities:dataSource.options.entities,migrations:dataSource.options.migrations});
  await dataSource.initialize();
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`);await db.initialize();await db.runMigrations();
    const store=randomUUID(),branch=randomUUID(),actor=randomUUID(),shift=randomUUID(),category=randomUUID(),size=randomUUID(),product=randomUUID(),ps=randomUUID(),topping=randomUUID(),ingredient=randomUUID(),promo=randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2)',[store,'ST3 Store']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)',[branch,store,'ST3','Branch']);
    await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash) VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),'Cashier','st3_cashier','hash')`,[actor,store,branch]);
    const password=randomBytes(18).toString('base64url');
    await db.query('UPDATE users SET password_hash=$2,must_change_password=false WHERE id=$1',[actor,await bcrypt.hash(password,4)]);
    await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,status,started_at) VALUES($1,$2,$3,'CASHIER','OPEN',now())`,[shift,branch,actor]);
    await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)',[category,store,'Drinks']);
    await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)',[size,store,'M']);
    await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)',[product,category,'Tea']);
    await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,10000)',[ps,product,size]);
    await db.query('INSERT INTO toppings(id,store_id,name,price) VALUES($1,$2,$3,1000)',[topping,store,'Pearls']);
    await db.query('INSERT INTO category_toppings(category_id,topping_id) VALUES($1,$2)',[category,topping]);
    await db.query('INSERT INTO ingredients(id,store_id,name,unit) VALUES($1,$2,$3,$4)',[ingredient,store,'Sugar','g']);
    await db.query('INSERT INTO product_size_ingredients(product_size_id,ingredient_id,quantity) VALUES($1,$2,1.250)',[ps,ingredient]);
    await db.query('INSERT INTO topping_ingredients(topping_id,ingredient_id,quantity) VALUES($1,$2,0.500)',[topping,ingredient]);
    await db.query(`INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,start_at,end_at,usage_limit)
      VALUES($1,$2,'FREE','FIXED',100000,now()-interval '1 day',now()+interval '1 day',10)`,[promo,store]);
    const user={id:actor,storeId:store,branchId:branch,username:'st3_cashier',fullName:'Cashier',role:'CASHIER',permissions:['pos.sell','invoice.read'],mustChangePassword:false};
    const sales:any=new SalesService(db);
    const freeOrder=async()=>{
      const invoice=await sales.create(user,{orderType:'TAKEAWAY'});
      await sales.addItem(user,invoice.id,{productSizeId:ps,quantity:2,toppings:[{toppingId:topping,quantity:2}]});
      await sales.addItem(user,invoice.id,{productSizeId:ps,quantity:2});
      await sales.applyPromotion(user,invoice.id,'FREE');return invoice.id;
    };
    await t.test('test_ST3_zero_stock_atomic',async()=>{
      const id=await freeOrder(),key=randomUUID();
      assert.equal(typeof sales.completeZero,'function','Missing complete-zero operation');
      const results=await Promise.all([sales.completeZero(user,id,key),sales.completeZero(user,id,key)]);
      assert.deepEqual(results.sort(),[false,true]);
      const [invoice]=await db.query('SELECT status,total_amount,zero_completion_key FROM invoices WHERE id=$1',[id]);
      assert.deepEqual(invoice,{status:'PAID',total_amount:'0',zero_completion_key:key});
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[id]))[0].n,0);
      const movements=await db.query('SELECT quantity,source,created_by FROM stock_movements WHERE invoice_id=$1',[id]);
      assert.deepEqual(movements,[{quantity:'-7.000',source:'USER',created_by:actor}]);
      assert.equal((await db.query('SELECT current_stock FROM branch_ingredient_stocks WHERE branch_id=$1 AND ingredient_id=$2',[branch,ingredient]))[0].current_stock,'-7.000');
      assert.equal((await db.query('SELECT used_count FROM promotion_codes WHERE id=$1',[promo]))[0].used_count,1);
      await db.query("UPDATE work_shifts SET status='CLOSED' WHERE id=$1",[shift]);
      assert.equal(await sales.completeZero(user,id,key),true,'Replay survives closed shift');
      await db.query("UPDATE work_shifts SET status='OPEN' WHERE id=$1",[shift]);
      const other=await freeOrder();
      await assert.rejects(sales.completeZero(user,other,key),(e:any)=>e.getResponse?.().code==='IDEMPOTENCY_KEY_REUSED');
      await assert.rejects(sales.completeZero({...user,storeId:randomUUID()},id,key),(e:any)=>e.getResponse?.().code==='NOT_FOUND');
    });
    await t.test('test_ST3_zero_rollback_and_scope',async()=>{
      assert.equal(typeof sales.completeZero,'function','Missing complete-zero operation');
      const id=await freeOrder(),key=randomUUID();
      const before=(await db.query('SELECT used_count FROM promotion_codes WHERE id=$1',[promo]))[0].used_count;
      await db.query(`CREATE FUNCTION fail_zero_paid() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.status='PAID' THEN RAISE EXCEPTION 'ST3 rollback injection'; END IF; RETURN NEW; END $$`);
      await db.query('CREATE TRIGGER fail_zero_paid BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION fail_zero_paid()');
      await assert.rejects(sales.completeZero(user,id,key),/ST3 rollback injection/);
      await db.query('DROP TRIGGER fail_zero_paid ON invoices');await db.query('DROP FUNCTION fail_zero_paid()');
      const [invoice]=await db.query('SELECT status,zero_completion_key FROM invoices WHERE id=$1',[id]);
      assert.deepEqual(invoice,{status:'OPEN',zero_completion_key:null});
      assert.equal((await db.query('SELECT used_count FROM promotion_codes WHERE id=$1',[promo]))[0].used_count,before);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[id]))[0].n,0);
      assert.equal(await sales.completeZero(user,id,key),false,'Rolled-back key can be retried');
      const empty=await sales.create(user,{orderType:'TAKEAWAY'});
      await assert.rejects(sales.completeZero(user,empty.id,randomUUID()),(e:any)=>e.getResponse?.().code==='INVOICE_EMPTY');
      await sales.addItem(user,empty.id,{productSizeId:ps,quantity:1});
      await assert.rejects(sales.completeZero(user,empty.id,randomUUID()),(e:any)=>e.getResponse?.().code==='ZERO_TOTAL_REQUIRED');
      await assert.rejects(sales.completeZero(user,empty.id,'bad-key'),(e:any)=>e.getResponse?.().code==='VALIDATION_ERROR');
    });
    await t.test('test_ST3_zero_http_replay_and_boundaries',async()=>{
      process.env.PUBLIC_ORIGIN='http://localhost:5173';process.env.JWT_SECRET='j'.repeat(32);process.env.CSRF_SECRET='c'.repeat(32);
      const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(DataSource).useValue(db).compile();
      const app=module.createNestApplication({logger:false});
      try {
        await app.listen(0,'127.0.0.1');const base=`http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
        const login=await fetch(`${base}/auth/login`,{method:'POST',headers:{Origin:process.env.PUBLIC_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({username:'st3_cashier',password})});
        assert.equal(login.status,200);const cookies=login.headers.getSetCookie().map(v=>v.split(';')[0]);
        const headers={Cookie:cookies.join('; '),Origin:process.env.PUBLIC_ORIGIN,'X-CSRF-Token':cookies.find(v=>v.startsWith('__Host-pos_csrf='))!.slice(16)};
        const id=await freeOrder(),key=randomUUID();
        const missing=await fetch(`${base}/invoices/${id}/complete-zero`,{method:'POST',headers});
        assert.equal(missing.status,422,'Missing idempotency header must be a validation error');
        const invalid=await missing.json() as any;
        assert.equal(invalid.error.details[0].location,'header');
        const paid=await fetch(`${base}/invoices/${id}/complete-zero`,{method:'POST',headers:{...headers,'Idempotency-Key':key}});
        assert.equal(paid.status,204);assert.equal(await paid.text(),'');
        await db.query("UPDATE invoices SET status='CANCELLED' WHERE id=$1",[id]);
        const replay=await fetch(`${base}/invoices/${id}/complete-zero`,{method:'POST',headers:{...headers,'Idempotency-Key':key}});
        assert.equal(replay.status,204);assert.equal(replay.headers.get('Idempotent-Replay'),'true');
        const pendingId=await freeOrder();
        await db.query(`INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,amount,transfer_reference,idempotency_key,idempotency_request_hash,status)
          VALUES($1,$2,$3,'970422','123456789','STORE',1,'HD12345678ABCDEFGH',$4,$5,'PENDING')`,[randomUUID(),pendingId,store,randomUUID(),'a'.repeat(64)]);
        await assert.rejects(sales.completeZero(user,pendingId,randomUUID()),(e:any)=>e.getResponse?.().code==='TRANSFER_PENDING');
        const noRecipeId=await sales.create(user,{orderType:'TAKEAWAY'});
        const product2=randomUUID(),size2=randomUUID();
        await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)',[product2,category,'Free item']);
        await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,0)',[size2,product2,size]);
        await sales.addItem(user,noRecipeId.id,{productSizeId:size2,quantity:1});
        await sales.completeZero(user,noRecipeId.id,randomUUID());
        assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[noRecipeId.id]))[0].n,0);
        const closedId=await freeOrder();await db.query("UPDATE work_shifts SET status='CLOSED' WHERE id=$1",[shift]);
        await assert.rejects(sales.completeZero(user,closedId,randomUUID()),(e:any)=>e.getResponse?.().code==='SHIFT_NOT_OPEN');
        await db.query("UPDATE work_shifts SET status='OPEN' WHERE id=$1",[shift]);
        const promoId=await freeOrder();await db.query('UPDATE promotion_codes SET used_count=usage_limit WHERE id=$1',[promo]);
        await assert.rejects(sales.completeZero(user,promoId,randomUUID()),(e:any)=>e.getResponse?.().code==='PROMOTION_NOT_APPLICABLE');
      }finally{await app.close();}
    });
  }finally{if(db.isInitialized)await db.destroy();await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await dataSource.destroy();}
});

test('ST-2.AC-1 BR-24/36/39/40 promo on OPEN invoices and readonly preview', { timeout:120_000 }, async t => {
  const name=`pos_pb09_promo_${randomBytes(6).toString('hex')}`;
  const url=new URL(process.env.DATABASE_URL!); url.pathname=`/${name}`;
  const db=new DataSource({type:'postgres',url:url.toString(),entities:dataSource.options.entities,migrations:dataSource.options.migrations});
  await dataSource.initialize();
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`); await db.initialize(); await db.runMigrations();
    const store=randomUUID(),branch=randomUUID(),actor=randomUUID(),shift=randomUUID(),category=randomUUID(),size=randomUUID(),product=randomUUID(),productSize=randomUUID(),promo=randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2)',[store,'ST2 Store']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)',[branch,store,'ST2','ST2 Branch']);
    await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash) VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),'Cashier','st2_cashier','hash')`,[actor,store,branch]);
    const password=randomBytes(18).toString('base64url');
    await db.query('UPDATE users SET password_hash=$2,must_change_password=false WHERE id=$1',[actor,await bcrypt.hash(password,4)]);
    await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,status,started_at) VALUES($1,$2,$3,'CASHIER','OPEN',now())`,[shift,branch,actor]);
    await db.query(`INSERT INTO cash_reconciliations(id,work_shift_id,opening_cash,status) VALUES($1,$2,0,'PENDING')`,[randomUUID(),shift]);
    await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)',[category,store,'Drinks']);
    await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)',[size,store,'M']);
    await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)',[product,category,'Tea']);
    await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,20000)',[productSize,product,size]);
    await db.query(`INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,min_order_amount,start_at,end_at,usage_limit)
      VALUES($1,$2,'SAVE10','FIXED',10000,50000,now()-interval '1 day',now()+interval '1 day',1)`,[promo,store]);
    const user={id:actor,storeId:store,branchId:branch,username:'st2_cashier',fullName:'Cashier',role:'CASHIER',permissions:['pos.sell','invoice.read'],mustChangePassword:false};
    const sales:any=new SalesService(db);
    const invoice=await sales.create(user,{orderType:'TAKEAWAY'});
    await sales.addItem(user,invoice.id,{productSizeId:productSize,quantity:3});
    await t.test('test_ST2_preview_promo_scope',async()=>{
      assert.equal(typeof sales.applyPromotion,'function','Missing invoice promotion operation');
      const detail=await sales.applyPromotion(user,invoice.id,' save10 ');
      assert.equal(detail.subtotal,60000); assert.equal(detail.discountAmount,10000); assert.equal(detail.totalAmount,50000);
      assert.equal(detail.promotionCode.code,'SAVE10');
      assert.equal((await db.query('SELECT used_count FROM promotion_codes WHERE id=$1',[promo]))[0].used_count,0);
      await assert.rejects(sales.applyPromotion(user,invoice.id,'SAVE10'),(e:any)=>e.getResponse?.().code==='PROMOTION_ALREADY_APPLIED');
      await assert.rejects(sales.paymentPreview({...user,storeId:randomUUID()},invoice.id),(e:any)=>e.getResponse?.().code==='NOT_FOUND');
      await assert.rejects(sales.paymentPreview({...user,branchId:randomUUID()},invoice.id),(e:any)=>e.getResponse?.().code==='NOT_FOUND');
    });
    await t.test('test_ST2_invalid_promo_retained',async()=>{
      assert.equal(typeof sales.paymentPreview,'function','Missing payment preview operation');
      const detail=await sales.get(user,invoice.id);
      await sales.patchItem(user,detail.items[0].id,{quantity:1});
      let preview=await sales.paymentPreview(user,invoice.id);
      assert.equal(preview.promotion.code,'SAVE10'); assert.equal(preview.promotion.applicable,false);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM invoice_promotion_codes WHERE invoice_id=$1',[invoice.id]))[0].n,1);
      await sales.patchItem(user,detail.items[0].id,{quantity:3});
      await db.query('UPDATE promotion_codes SET used_count=usage_limit WHERE id=$1',[promo]);
      preview=await sales.paymentPreview(user,invoice.id); assert.equal(preview.promotion.applicable,false);
      await sales.removePromotion(user,invoice.id);
      assert.equal((await sales.get(user,invoice.id)).promotionCode,null);
      assert.equal((await sales.paymentPreview(user,invoice.id)).totalAmount,60000);
      await assert.rejects(sales.applyPromotion(user,invoice.id,'SAVE10'),(e:any)=>e.getResponse?.().code==='PROMOTION_NOT_APPLICABLE');
    });
    await t.test('test_ST2_stock_warnings_readonly',async()=>{
      const ingredient=randomUUID();
      await db.query('INSERT INTO ingredients(id,store_id,name,unit) VALUES($1,$2,$3,$4)',[ingredient,store,'Sugar','g']);
      await db.query('INSERT INTO product_size_ingredients(product_size_id,ingredient_id,quantity) VALUES($1,$2,2.500)',[productSize,ingredient]);
      const secondProduct=randomUUID(),secondSize=randomUUID();
      await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)',[secondProduct,category,'Coffee']);
      await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,10000)',[secondSize,secondProduct,size]);
      const detail=await sales.addItem(user,invoice.id,{productSizeId:secondSize,quantity:1});
      const missing=detail.items.find((item:any)=>item.productSizeId===secondSize).id;
      const before=await db.query('SELECT count(*)::int AS n FROM stock_movements');
      const preview=await sales.paymentPreview(user,invoice.id);
      assert.deepEqual(preview.warnings,[{type:'MISSING_RECIPE',itemId:missing},{type:'NEGATIVE_STOCK',ingredientId:ingredient}]);
      assert.deepEqual(await db.query('SELECT count(*)::int AS n FROM stock_movements'),before);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM branch_ingredient_stocks WHERE branch_id=$1',[branch]))[0].n,0);
    });
    await t.test('test_ST2_pending_qr_blocks_edits',async()=>{
      const id=randomUUID();
      await db.query(`INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,amount,transfer_reference,idempotency_key,idempotency_request_hash,status)
        VALUES($1,$2,$3,'970422','123456789','STORE',70000,'HD12345678ABCDEFGH',$4,$5,'PENDING')`,[id,invoice.id,store,randomUUID(),'a'.repeat(64)]);
      await assert.rejects(sales.removePromotion(user,invoice.id),(e:any)=>e.getResponse?.().code==='TRANSFER_PENDING');
      const detail=await sales.get(user,invoice.id);
      await assert.rejects(sales.patchItem(user,detail.items[0].id,{quantity:4}),(e:any)=>e.getResponse?.().code==='TRANSFER_PENDING');
      await assert.rejects(sales.cancel(user,invoice.id,'Cancel'),(e:any)=>e.getResponse?.().code==='TRANSFER_PENDING');
      await db.query("UPDATE transfer_attempts SET status='CANCELLED' WHERE id=$1",[id]);
    });
    await t.test('test_ST2_http_promo_boundary',async()=>{
      process.env.PUBLIC_ORIGIN='http://localhost:5173';process.env.JWT_SECRET='j'.repeat(32);process.env.CSRF_SECRET='c'.repeat(32);
      const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(DataSource).useValue(db).compile();
      const app=module.createNestApplication({logger:false});
      try {
        await app.listen(0,'127.0.0.1');
        const base=`http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
        const login=await fetch(`${base}/auth/login`,{method:'POST',headers:{Origin:process.env.PUBLIC_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({username:'st2_cashier',password})});
        assert.equal(login.status,200);
        const cookies=login.headers.getSetCookie().map(v=>v.split(';')[0]);
        const headers={Cookie:cookies.join('; '),Origin:process.env.PUBLIC_ORIGIN,'X-CSRF-Token':cookies.find(v=>v.startsWith('__Host-pos_csrf='))!.slice(16)};
        const preview=await fetch(`${base}/invoices/${invoice.id}/payment-preview`,{headers});
        assert.equal(preview.status,200,'payment-preview route must expose server totals');
        assert.equal((await preview.json() as any).data.totalAmount,70000);
        const remove=await fetch(`${base}/invoices/${invoice.id}/remove-promotion`,{method:'POST',headers});
        assert.equal(remove.status,200,'remove-promotion must accept no body');
        const invalid=await fetch(`${base}/invoices/${invoice.id}/apply-promotion`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({code:'SAVE10',discount:1})});
        assert.equal(invalid.status,422);
        await db.query('UPDATE promotion_codes SET used_count=0 WHERE id=$1',[promo]);
        const applied=await fetch(`${base}/invoices/${invoice.id}/apply-promotion`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({code:'save10'})});
        assert.equal(applied.status,200); assert.equal((await applied.json() as any).data.totalAmount,60000);
        const unauthenticated=await fetch(`${base}/invoices/${invoice.id}/payment-preview`);
        assert.equal(unauthenticated.status,401);
      } finally {await app.close();}
    });
    await t.test('[B-3] payment preview rejects non-OPEN invoices with 409 INVOICE_NOT_OPEN and stays readonly',async()=>{
      const openOrder=await sales.create(user,{orderType:'TAKEAWAY'});
      await sales.addItem(user,openOrder.id,{productSizeId:productSize,quantity:1});
      assert.equal((await sales.paymentPreview(user,openOrder.id)).totalAmount,20000);
      const paidOrder=await sales.create(user,{orderType:'TAKEAWAY'});
      await sales.addItem(user,paidOrder.id,{productSizeId:productSize,quantity:1});
      await sales.payCash(user,paidOrder.id,{method:'CASH',amount:20000,tenderedAmount:20000},randomUUID());
      const cancelledOrder=await sales.create(user,{orderType:'TAKEAWAY'});
      await sales.addItem(user,cancelledOrder.id,{productSizeId:productSize,quantity:1});
      await sales.cancel(user,cancelledOrder.id,'Cancel');
      const snapshot=async()=>({
        invoices:await db.query('SELECT id,status,subtotal,discount_amount,total_amount,updated_at FROM invoices ORDER BY id'),
        payments:await db.query('SELECT id,amount FROM payments ORDER BY id'),
        movements:await db.query('SELECT id FROM stock_movements ORDER BY id'),
        promos:await db.query('SELECT id,used_count FROM promotion_codes ORDER BY id')});
      const before=await snapshot();
      for(const id of [paidOrder.id,cancelledOrder.id]){
        await assert.rejects(sales.paymentPreview(user,id),(e:any)=>e.getStatus?.()===409&&e.getResponse?.().code==='INVOICE_NOT_OPEN');
      }
      await assert.rejects(sales.paymentPreview({...user,storeId:randomUUID()},paidOrder.id),(e:any)=>e.getResponse?.().code==='NOT_FOUND');
      assert.deepEqual(await snapshot(),before);
    });
  } finally {
    if(db.isInitialized)await db.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`); await dataSource.destroy();
  }
});

test('ST-5.AC-1/2 bank account and QR attempts use live HTTP and isolated PostgreSQL', {timeout:120_000},async t=>{
  const name=`pos_pb09_qr_${randomBytes(6).toString('hex')}`;
  const url=new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
  url.pathname=`/${name}`;
  const db=new DataSource({type:'postgres',url:url.toString(),entities:dataSource.options.entities,migrations:dataSource.options.migrations});
  await dataSource.initialize();
  let app: any;
  try{
    await dataSource.query(`CREATE DATABASE "${name}"`);await db.initialize();await db.runMigrations();
    const store=randomUUID(),otherStore=randomUUID(),branch=randomUUID(),shift=randomUUID(),cashier=randomUUID(),owner=randomUUID(),manager=randomUUID(),otherOwner=randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2),($3,$4)',[store,'QR store',otherStore,'Other store']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)',[branch,store,'QR','QR branch']);
    const password='St5-test-password-123',hash=await bcrypt.hash(password,4);
    for(const [id,storeId,branchId,role,username] of [
      [cashier,store,branch,'CASHIER','st5_cashier'],[owner,store,null,'OWNER','st5_owner'],
      [manager,store,branch,'MANAGER','st5_manager'],[otherOwner,otherStore,null,'OWNER','st5_other_owner'],
    ] as const)await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
      VALUES($1,$2,$3,(SELECT id FROM roles WHERE name=$4),$5,$5,$6,false)`,[id,storeId,branchId,role,username,hash]);
    await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,status,started_at) VALUES($1,$2,$3,'CASHIER','OPEN',now())`,[shift,branch,cashier]);
    await db.query(`INSERT INTO cash_reconciliations(id,work_shift_id,opening_cash,status) VALUES($1,$2,0,'PENDING')`,[randomUUID(),shift]);
    const category=randomUUID(),size=randomUUID(),product=randomUUID(),ps=randomUUID();
    await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)',[category,store,'QR drinks']);
    await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)',[size,store,'M']);
    await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)',[product,category,'QR tea']);
    await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,25000)',[ps,product,size]);
    const user={id:cashier,storeId:store,branchId:branch,username:'st5_cashier',fullName:'Cashier',role:'CASHIER',permissions:['pos.sell','invoice.read'],mustChangePassword:false};
    const sales=new SalesService(db);
    const order=async()=>{const invoice=await sales.create(user,{orderType:'TAKEAWAY'});await sales.addItem(user,invoice.id,{productSizeId:ps,quantity:2});return invoice.id as string;};
    const origin='http://localhost:5173';process.env.PUBLIC_ORIGIN=origin;process.env.JWT_SECRET='j'.repeat(32);process.env.CSRF_SECRET='c'.repeat(32);
    const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(DataSource).useValue(db).compile();
    app=module.createNestApplication({logger:false});
    await app.listen(0,'127.0.0.1');
    const base=`http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
    const login=async(username:string)=>{
      const response=await fetch(`${base}/auth/login`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username,password})});
      assert.equal(response.status,200);
      const cookies=response.headers.getSetCookie().map(value=>value.split(';')[0]);
      return {Cookie:cookies.join('; '),Origin:origin,'X-CSRF-Token':cookies.find(value=>value.startsWith('__Host-pos_csrf='))!.slice(16),'Content-Type':'application/json'};
    };
    const ownerHeaders=await login('st5_owner'),cashierHeaders=await login('st5_cashier'),managerHeaders=await login('st5_manager'),otherHeaders=await login('st5_other_owner');
    const {'Content-Type':_jsonType,...cancelHeaders}=cashierHeaders;
    const account={bankBin:'970422',accountNumber:'1234567890123456789',accountName:'CUA HANG TEST'};
    await t.test('test_ST5_bank_account_boundary',async()=>{
      const empty=await fetch(`${base}/store-bank-account`,{headers:ownerHeaders});
      assert.equal(empty.status,200,'GET bank account route must exist');assert.equal((await empty.json() as any).data,null);
      const saved=await fetch(`${base}/store-bank-account`,{method:'PATCH',headers:ownerHeaders,body:JSON.stringify(account)});
      assert.equal(saved.status,200);assert.deepEqual((await saved.json() as any).data,account);
      const read=await fetch(`${base}/store-bank-account`,{headers:cashierHeaders});
      assert.equal(read.status,200);assert.deepEqual((await read.json() as any).data,account);
      const invalid=await fetch(`${base}/store-bank-account`,{method:'PATCH',headers:ownerHeaders,body:JSON.stringify({...account,accountNumber:'1'.repeat(20)})});
      assert.equal(invalid.status,422);const error=(await invalid.json() as any).error;
      assert.equal(error.code,'VALIDATION_ERROR');assert.ok(error.details.some((detail:any)=>detail.location==='body'&&detail.field==='accountNumber'));
      assert.equal((await db.query('SELECT account_number FROM store_bank_accounts WHERE store_id=$1',[store]))[0].account_number,account.accountNumber);
      const other=await fetch(`${base}/store-bank-account`,{headers:otherHeaders});
      assert.equal(other.status,200);assert.equal((await other.json() as any).data,null);
      const forbidden=await fetch(`${base}/store-bank-account`,{method:'PATCH',headers:managerHeaders,body:JSON.stringify(account)});
      assert.equal(forbidden.status,403);
    });
    await t.test('test_ST5_qr_validation_and_scope',async()=>{
      const id=await order();
      const post=(headers:Record<string,string>,body:object)=>fetch(`${base}/invoices/${id}/transfer-attempts`,{method:'POST',headers,body:JSON.stringify(body)});
      const fresh={...cashierHeaders,'Idempotency-Key':randomUUID()};
      await db.query('DELETE FROM store_bank_accounts WHERE store_id=$1',[store]);
      const noAccount=await post(fresh,{amount:50000});assert.equal(noAccount.status,409);
      assert.equal((await noAccount.json() as any).error.code,'BANK_ACCOUNT_REQUIRED');
      const restore=await fetch(`${base}/store-bank-account`,{method:'PATCH',headers:ownerHeaders,body:JSON.stringify(account)});
      assert.equal(restore.status,200);
      const noKey=await post(cashierHeaders,{amount:50000});assert.equal(noKey.status,422);
      assert.equal((await noKey.json() as any).error.details[0].field,'Idempotency-Key');
      const wrong=await post(fresh,{amount:49999});assert.equal(wrong.status,422);
      assert.equal((await wrong.json() as any).error.code,'PAYMENT_AMOUNT_MISMATCH');
      const zero=await post(fresh,{amount:0});assert.equal(zero.status,422);
      const injected=await post(fresh,{amount:50000,accountNumber:'999999999'});
      assert.equal(injected.status,422);
      const usedKey=randomUUID(),paidId=await order();
      await sales.payCash(user,paidId,{method:'CASH',amount:50000,tenderedAmount:50000},usedKey);
      const collided=await post({...cashierHeaders,'Idempotency-Key':usedKey},{amount:50000});
      assert.equal(collided.status,409);assert.equal((await collided.json() as any).error.code,'IDEMPOTENCY_KEY_REUSED');
      const afterPaid=await fetch(`${base}/invoices/${paidId}/transfer-attempts`,{method:'POST',
        headers:{...cashierHeaders,'Idempotency-Key':randomUUID()},body:JSON.stringify({amount:50000})});
      assert.equal(afterPaid.status,409);assert.equal((await afterPaid.json() as any).error.code,'INVOICE_NOT_OPEN');
      const promo=randomUUID(),promoInvoice=await order();
      await db.query(`INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,start_at,end_at,usage_limit)
        VALUES($1,$2,'QR5','FIXED',5000,now()-interval '1 day',now()+interval '1 day',1)`,[promo,store]);
      await sales.applyPromotion(user,promoInvoice,'QR5');
      await db.query('UPDATE promotion_codes SET used_count=usage_limit WHERE id=$1',[promo]);
      const expired=await fetch(`${base}/invoices/${promoInvoice}/transfer-attempts`,{method:'POST',
        headers:{...cashierHeaders,'Idempotency-Key':randomUUID()},body:JSON.stringify({amount:50000})});
      assert.equal(expired.status,422);assert.equal((await expired.json() as any).error.code,'PROMOTION_NOT_APPLICABLE');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM transfer_attempts WHERE invoice_id=$1',[promoInvoice]))[0].n,0);
      const outside=await post({...otherHeaders,'Idempotency-Key':randomUUID()},{amount:50000});
      assert.equal(outside.status,404);
      const empty=await sales.create(user,{orderType:'TAKEAWAY'});
      const emptyResponse=await fetch(`${base}/invoices/${empty.id}/transfer-attempts`,{method:'POST',
        headers:{...cashierHeaders,'Idempotency-Key':randomUUID()},body:JSON.stringify({amount:50000})});
      assert.equal(emptyResponse.status,422);assert.equal((await emptyResponse.json() as any).error.code,'INVOICE_EMPTY');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM transfer_attempts WHERE invoice_id=$1',[id]))[0].n,0);
    });
    await t.test('test_ST5_qr_attempt_lifecycle',async()=>{
      const invoiceId=await order(),keyA=randomUUID();
      const create=async(key:string,amount=50000)=>fetch(`${base}/invoices/${invoiceId}/transfer-attempts`,{
        method:'POST',headers:{...cashierHeaders,'Idempotency-Key':key},body:JSON.stringify({amount})});
      const first=await create(keyA);
      assert.equal(first.status,201,'QR creation route must exist');
      const a=(await first.json() as any).data;
      assert.equal(a.invoiceId,invoiceId);assert.equal(a.amount,50000);assert.equal(a.status,'PENDING');
      assert.match(a.transferReference,/^HD[A-Z0-9]{16}$/);assert.equal(a.accountNumber,account.accountNumber);
      assert.ok(a.qrImageUrl.includes(account.accountNumber));
      assert.ok(a.qrImageUrl.includes('50000'));assert.ok(a.qrImageUrl.includes(a.transferReference));
      const reload=await fetch(`${base}/invoices/${invoiceId}/transfer-attempts`,{headers:cashierHeaders});
      assert.equal(reload.status,200);assert.deepEqual((await reload.json() as any).data,a);
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[invoiceId]))[0].status,'OPEN');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[invoiceId]))[0].n,0);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[invoiceId]))[0].n,0);
      await assert.rejects(sales.addItem(user,invoiceId,{productSizeId:ps,quantity:1}),(e:any)=>e.getResponse?.().code==='TRANSFER_PENDING');
      const second=await create(randomUUID());assert.equal(second.status,409);
      assert.equal((await second.json() as any).error.code,'TRANSFER_PENDING');
      const blockedAccount=await fetch(`${base}/store-bank-account`,{method:'PATCH',headers:ownerHeaders,body:JSON.stringify({...account,accountName:'NEW NAME'})});
      assert.equal(blockedAccount.status,409);assert.equal((await blockedAccount.json() as any).error.code,'TRANSFER_PENDING');
      const cancelled=await fetch(`${base}/transfer-attempts/${a.id}/cancel`,{method:'POST',headers:cancelHeaders});
      assert.equal(cancelled.status,204);
      const afterCancel=await fetch(`${base}/invoices/${invoiceId}/transfer-attempts`,{headers:cashierHeaders});
      assert.equal(afterCancel.status,200);assert.equal((await afterCancel.json() as any).data,null);
      const newAttempt=await create(randomUUID());assert.equal(newAttempt.status,201);
      const b=(await newAttempt.json() as any).data;assert.notEqual(b.transferReference,a.transferReference);
      assert.notEqual(b.id,a.id);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM transfer_attempts WHERE invoice_id=$1',[invoiceId]))[0].n,2);
      const cancelB=await fetch(`${base}/transfer-attempts/${b.id}/cancel`,{method:'POST',headers:cancelHeaders});assert.equal(cancelB.status,204);
      await sales.addItem(user,invoiceId,{productSizeId:ps,quantity:1});
    });
    await t.test('test_ST5_payment_error_messages_match_spec [V3-1]',async()=>{
      const message=async(response:Response,status:number,code:string)=>{
        assert.equal(response.status,status);const error=(await response.json() as any).error;
        assert.equal(error.code,code);return error.message as string;
      };
      const qrPost=(invoiceId:string)=>fetch(`${base}/invoices/${invoiceId}/transfer-attempts`,{method:'POST',
        headers:{...cashierHeaders,'Idempotency-Key':randomUUID()},body:JSON.stringify({amount:50000})});
      const manual=(attemptId:string,ref:string,received=50000)=>fetch(`${base}/transfer-attempts/${attemptId}/confirm-manual`,{method:'POST',
        headers:{...ownerHeaders,'Idempotency-Key':randomUUID()},body:JSON.stringify({transactionRef:ref,actualReceivedAmount:received,reason:'Đã đối chiếu'})});
      const invoiceId=await order();
      await db.query('DELETE FROM store_bank_accounts WHERE store_id=$1',[store]);
      assert.equal(await message(await qrPost(invoiceId),409,'BANK_ACCOUNT_REQUIRED'),'Cửa hàng chưa cài tài khoản nhận chuyển khoản.');
      assert.equal((await fetch(`${base}/store-bank-account`,{method:'PATCH',headers:ownerHeaders,body:JSON.stringify(account)})).status,200);
      const created=await qrPost(invoiceId);assert.equal(created.status,201);const first=(await created.json() as any).data;
      assert.equal(await message(await qrPost(invoiceId),409,'TRANSFER_PENDING'),'Đơn đang chờ chuyển khoản. Hủy chờ trước khi sửa hoặc thanh toán.');
      const addItem=await fetch(`${base}/invoices/${invoiceId}/items`,{method:'POST',headers:cashierHeaders,body:JSON.stringify({productSizeId:ps,quantity:1})});
      assert.equal(await message(addItem,409,'TRANSFER_PENDING'),'Đơn đang chờ chuyển khoản. Hủy chờ trước khi sửa hoặc thanh toán.');
      const cash=await fetch(`${base}/invoices/${invoiceId}/payments`,{method:'POST',headers:{...cashierHeaders,'Idempotency-Key':randomUUID()},
        body:JSON.stringify({method:'CASH',amount:50000,tenderedAmount:50000})});
      assert.equal(await message(cash,409,'TRANSFER_PENDING'),'Đơn đang chờ chuyển khoản. Hủy chờ trước khi sửa hoặc thanh toán.');
      assert.equal(await message(await manual(first.id,'FT-V31-SHORT',49999),422,'TRANSFER_AMOUNT_INSUFFICIENT'),'Số tiền thực nhận chưa đủ để thanh toán đơn.');
      assert.equal((await manual(first.id,'FT-V31-REUSED')).status,201);
      const second=await order();assert.equal((await qrPost(second)).status,201);
      const [secondAttempt]=await db.query(`SELECT id FROM transfer_attempts WHERE invoice_id=$1`,[second]);
      assert.equal(await message(await manual(secondAttempt.id,'FT-V31-REUSED'),409,'BANK_TRANSACTION_REUSED'),'Giao dịch ngân hàng đã được dùng để xác nhận đơn khác.');
      const cancel=()=>fetch(`${base}/transfer-attempts/${secondAttempt.id}/cancel`,{method:'POST',headers:cancelHeaders});
      assert.equal((await cancel()).status,204);
      assert.equal(await message(await cancel(),409,'TRANSFER_NOT_PENDING'),'Lượt chuyển khoản không còn chờ xác nhận.');
      assert.equal(await message(await manual(secondAttempt.id,'FT-V31-LATE'),409,'TRANSFER_NOT_PENDING'),'Lượt chuyển khoản không còn chờ xác nhận.');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[second]))[0].n,0);
    });
    await t.test('test_ST5_qr_replay_after_terminal',async()=>{
      const invoiceId=await order(),key=randomUUID();
      const post=(amount:number)=>fetch(`${base}/invoices/${invoiceId}/transfer-attempts`,{
        method:'POST',headers:{...cashierHeaders,'Idempotency-Key':key},body:JSON.stringify({amount})});
      const created=await post(50000);assert.equal(created.status,201);
      const a=(await created.json() as any).data;
      const cancel=await fetch(`${base}/transfer-attempts/${a.id}/cancel`,{method:'POST',headers:cancelHeaders});
      assert.equal(cancel.status,204);
      const replay=await post(50000);assert.equal(replay.status,201,'same key must replay old cancelled attempt');
      assert.equal(replay.headers.get('Idempotent-Replay'),'true');
      const cancelled=(await replay.json() as any).data;
      assert.equal(cancelled.id,a.id);assert.equal(cancelled.transferReference,a.transferReference);
      assert.equal(cancelled.status,'CANCELLED');assert.equal(cancelled.qrImageUrl,null);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM transfer_attempts WHERE invoice_id=$1',[invoiceId]))[0].n,1);
      const changed=await post(49999);assert.equal(changed.status,409);
      assert.equal((await changed.json() as any).error.code,'IDEMPOTENCY_KEY_REUSED');
      await db.query(`UPDATE transfer_attempts SET status='PAID' WHERE id=$1`,[a.id]);
      const paidReplay=await post(50000);assert.equal(paidReplay.status,201);
      const paid=(await paidReplay.json() as any).data;
      assert.equal(paid.id,a.id);assert.equal(paid.status,'PAID');assert.equal(paid.qrImageUrl,null);
      const pending=await fetch(`${base}/invoices/${invoiceId}/transfer-attempts`,{headers:cashierHeaders});
      assert.equal((await pending.json() as any).data,null);
    });
    await t.test('test_ST5_account_permission_race',async()=>{
      const invoiceId=await order();
      const gate=db.createQueryRunner();await gate.connect();
      await db.query(`CREATE FUNCTION st5_pause_qr() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN PERFORM pg_advisory_xact_lock(97531); RETURN NEW; END $$`);
      await db.query('CREATE TRIGGER st5_pause_qr BEFORE INSERT ON transfer_attempts FOR EACH ROW EXECUTE FUNCTION st5_pause_qr()');
      await gate.query('SELECT pg_advisory_lock(97531)');
      let create:Promise<Response>|undefined,patch:Promise<Response>|undefined;
      const waiting=async(pattern:string)=>{
        const until=Date.now()+10000;
        while(Date.now()<until){
          const [row]=await db.query(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database()
            AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE $1`,[`%${pattern}%`]);
          if(row.n>0)return true;
          await new Promise(resolve=>setTimeout(resolve,20));
        }
        return false;
      };
      try{
        create=fetch(`${base}/invoices/${invoiceId}/transfer-attempts`,{method:'POST',
          headers:{...cashierHeaders,'Idempotency-Key':randomUUID()},body:JSON.stringify({amount:50000})});
        assert.equal(await waiting('INSERT INTO transfer_attempts'),true,'QR insert reached held advisory gate');
        patch=fetch(`${base}/store-bank-account`,{method:'PATCH',headers:ownerHeaders,
          body:JSON.stringify({...account,accountName:'RACE UPDATED'})});
        assert.equal(await waiting('SELECT id FROM stores'),true,'bank change must wait for QR store lock');
      }finally{
        await gate.query('SELECT pg_advisory_unlock(97531)');await gate.release();
      }
      const qr=await create!;assert.equal(qr.status,201);
      const accountChange=await patch!;assert.equal(accountChange.status,409);
      assert.equal((await accountChange.json() as any).error.code,'TRANSFER_PENDING');
      const attempt=(await qr.json() as any).data;
      assert.equal(attempt.accountName,account.accountName);
      assert.equal((await db.query('SELECT account_name FROM store_bank_accounts WHERE store_id=$1',[store]))[0].account_name,account.accountName);
      const cancelled=await fetch(`${base}/transfer-attempts/${attempt.id}/cancel`,{method:'POST',headers:cancelHeaders});
      assert.equal(cancelled.status,204);
      await db.query('DROP TRIGGER st5_pause_qr ON transfer_attempts');await db.query('DROP FUNCTION st5_pause_qr()');
    });
  }finally{
    if(app)await app.close();
    if(db.isInitialized)await db.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await dataSource.destroy();
  }
});

test('ST-6.AC-1 SePay authentication, quarantine and deduplication on PostgreSQL', {timeout:120_000},async t=>{
  const name=`pos_pb09_webhook_${randomBytes(6).toString('hex')}`,url=new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
  url.pathname=`/${name}`;
  const db=new DataSource({type:'postgres',url:url.toString(),entities:dataSource.options.entities,migrations:dataSource.options.migrations});
  const previousEnv=process.env.SEPAY_ENV,previousSecret=process.env.SEPAY_WEBHOOK_SECRET;
  process.env.SEPAY_ENV='test';process.env.SEPAY_WEBHOOK_SECRET='st6-fake-signing-secret-for-local-test';
  await dataSource.initialize();
  let app:any;
  try{
    await dataSource.query(`CREATE DATABASE "${name}"`);await db.initialize();await db.runMigrations();
    const store=randomUUID(),branch=randomUUID(),actor=randomUUID(),shift=randomUUID(),invoice=randomUUID(),attempt=randomUUID();
    const reference='HD12345678ABCDEFGH',accountNumber='1234567890123456789';
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2)',[store,'Webhook store']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)',[branch,store,'WEB','Webhook branch']);
    await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash)
      VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),'Cashier','st6_cashier','hash')`,[actor,store,branch]);
    await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,status,started_at)
      VALUES($1,$2,$3,'CASHIER','OPEN',now())`,[shift,branch,actor]);
    await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,created_by,invoice_code,order_type,status,subtotal,total_amount)
      VALUES($1,$2,$3,$4,'HD12345678','TAKEAWAY','OPEN',50000,50000)`,[invoice,branch,shift,actor]);
    const category=randomUUID(),size=randomUUID(),product=randomUUID(),ps=randomUUID(),ingredient=randomUUID();
    await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)',[category,store,'Webhook drinks']);
    await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)',[size,store,'M']);
    await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)',[product,category,'Webhook tea']);
    await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,25000)',[ps,product,size]);
    await db.query('INSERT INTO ingredients(id,store_id,name,unit) VALUES($1,$2,$3,$4)',[ingredient,store,'Sugar','g']);
    await db.query('INSERT INTO product_size_ingredients(product_size_id,ingredient_id,quantity) VALUES($1,$2,1.000)',[ps,ingredient]);
    await db.query(`INSERT INTO invoice_items(id,invoice_id,product_size_id,product_name,size_name,unit_price,quantity,line_total)
      VALUES($1,$2,$3,'Webhook tea','M',25000,2,50000)`,[randomUUID(),invoice,ps]);
    await db.query(`INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,amount,
      transfer_reference,idempotency_key,idempotency_request_hash,status)
      VALUES($1,$2,$3,'970422',$4,'WEBHOOK STORE',50000,$5,$6,$7,'PENDING')`,
      [attempt,invoice,store,accountNumber,reference,randomUUID(),'a'.repeat(64)]);
    const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(DataSource).useValue(db).compile();
    app=module.createNestApplication({logger:false,rawBody:true});
    await app.listen(0,'127.0.0.1');
    const endpoint=`http://127.0.0.1:${app.getHttpServer().address().port}/api/v1/payments/sepay/webhook`;
    const payload=(id:number,changes:Record<string,unknown>={})=>({
      id,gateway:'TEST',transactionDate:'2026-11-09 10:00:00',accountNumber,subAccount:'',code:null,
      content:`Transfer ${reference}`,transferType:'in',description:'Local synthetic test',transferAmount:50000,
      accumulated:0,referenceCode:`FT-ST6-${id}`,...changes,
    });
    const post=async(body:string,timestamp=String(Math.floor(Date.now()/1000)),signature?:string)=>{
      const digest=signature??'sha256='+createHmac('sha256',process.env.SEPAY_WEBHOOK_SECRET!).update(timestamp+'.').update(body).digest('hex');
      return fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Signature':digest,'X-SePay-Timestamp':timestamp},body});
    };
    let sequence=0;
    const makePending=async(amount=50000,promotionId?:string,scope={branch,shift,actor})=>{
      const invoiceId=randomUUID(),attemptId=randomUUID(),key=randomUUID();
      const code='HD'+String(++sequence).padStart(8,'0'),transferReference=code+'ABCDEFGH';
      await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,created_by,invoice_code,order_type,status,subtotal,discount_amount,total_amount)
        VALUES($1,$2,$3,$4,$5,'TAKEAWAY','OPEN',50000,$6,$7)`,
        [invoiceId,scope.branch,scope.shift,scope.actor,code,50000-amount,amount]);
      await db.query(`INSERT INTO invoice_items(id,invoice_id,product_size_id,product_name,size_name,unit_price,quantity,line_total)
        VALUES($1,$2,$3,'Webhook tea','M',25000,2,50000)`,[randomUUID(),invoiceId,ps]);
      if(promotionId)await db.query(`INSERT INTO invoice_promotion_codes(invoice_id,promotion_code_id,code,discount_amount)
        VALUES($1,$2,'SAVE10',10000)`,[invoiceId,promotionId]);
      await db.query(`INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,amount,
        transfer_reference,idempotency_key,idempotency_request_hash,status)
        VALUES($1,$2,$3,'970422',$4,'WEBHOOK STORE',$5,$6,$7,$8,'PENDING')`,
        [attemptId,invoiceId,store,accountNumber,amount,transferReference,key,'b'.repeat(64)]);
      return {invoiceId,attemptId,transferReference,key};
    };
    await t.test('test_ST6_delta_schema_namespace',async()=>{
      const columns=await db.query(`SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='payments' AND column_name='transaction_ref_kind'`);
      assert.equal(columns.length,1,'Payments must distinguish bank and SePay-generated references');
      const first=await makePending(),second=await makePending(),third=await makePending();
      const insert=async(qr:any,kind:string|null,ref:string,source='WEBHOOK')=>db.query(`INSERT INTO payments
        (id,invoice_id,method,amount,actual_received_amount,excess_amount,transfer_attempt_id,receiving_account_number,
        transaction_ref,transaction_ref_kind,confirmation_source,idempotency_key,idempotency_request_hash,created_by,confirmed_by,confirmation_reason)
        VALUES($1,$2,'TRANSFER',50000,50000,0,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11)`,
        [randomUUID(),qr.invoiceId,qr.attemptId,accountNumber,ref,kind,source,randomUUID(),'a'.repeat(64),source==='MANUAL'?actor:null,source==='MANUAL'?'Verified':null]);
      await insert(first,'BANK','SEPAY:601');
      await insert(second,'SEPAY_EVENT','SEPAY:601');
      await assert.rejects(insert(third,'BANK','SEPAY:601','MANUAL'),(e:any)=>e.code==='23505');
      await assert.rejects(insert(third,null,'FT-NULL'),(e:any)=>e.code==='23514');
      await assert.rejects(insert(third,'SEPAY_EVENT','SEPAY:602','MANUAL'),(e:any)=>e.code==='23514');
      await assert.rejects(insert(third,'OTHER','FT-BAD'),(e:any)=>e.code==='23514');
    });
    await t.test('test_ST6_missing_reference_paid_replay',async()=>{
      for(const [id,referenceCode,amount,expectedExcess] of [[9601,'',50000,'0'],[9602,'  ',60000,'10000']] as const){
        const qr=await makePending(),body=JSON.stringify(payload(id,{code:qr.transferReference,content:qr.transferReference,referenceCode,transferAmount:amount}));
        const response=await post(body);assert.equal(response.status,200,'Missing bank reference must not block payment');
        assert.deepEqual(await response.json(),{success:true});
        const [payment]=await db.query(`SELECT transaction_ref,transaction_ref_kind,amount,actual_received_amount,excess_amount
          FROM payments WHERE invoice_id=$1`,[qr.invoiceId]);
        assert.deepEqual(payment,{transaction_ref:`SEPAY:${id}`,transaction_ref_kind:'SEPAY_EVENT',amount:'50000',actual_received_amount:String(amount),excess_amount:expectedExcess});
        const [event]=await db.query('SELECT disposition,provider_reference FROM bank_transfer_events WHERE provider_event_id=$1',[String(id)]);
        assert.deepEqual(event,{disposition:'PAID',provider_reference:null});
        const replay=await post(body);assert.equal(replay.status,200);assert.deepEqual(await replay.json(),{success:true});
        assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,1);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[qr.invoiceId]))[0].n,1);
      }
      const bank=await makePending();
      const response=await post(JSON.stringify(payload(9603,{code:bank.transferReference,content:bank.transferReference,referenceCode:'SEPAY:9601'})));
      assert.equal(response.status,200,'A real bank reference must not collide with a generated SePay reference');
      assert.equal((await db.query('SELECT transaction_ref_kind FROM payments WHERE invoice_id=$1',[bank.invoiceId]))[0].transaction_ref_kind,'BANK');
      const promo=randomUUID();
      await db.query(`INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,start_at,end_at,usage_limit)
        VALUES($1,$2,'FALLBACK10','FIXED',10000,now()-interval '1 day',now()+interval '1 day',10)`,[promo,store]);
      const discounted=await makePending(40000,promo),discountBody=JSON.stringify(payload(9604,{code:discounted.transferReference,content:discounted.transferReference,referenceCode:'',transferAmount:40000}));
      assert.equal((await post(discountBody)).status,200);assert.equal((await post(discountBody)).status,200);
      assert.equal((await db.query('SELECT used_count FROM promotion_codes WHERE id=$1',[promo]))[0].used_count,1);
      const underpaid=await makePending(),under=await post(JSON.stringify(payload(9605,{code:underpaid.transferReference,content:underpaid.transferReference,referenceCode:'',transferAmount:49999})));
      assert.equal(under.status,200);assert.equal((await db.query(`SELECT disposition FROM bank_transfer_events WHERE provider_event_id='9605'`))[0].disposition,'UNDERPAID');
      const wrong=await makePending();assert.equal((await post(JSON.stringify(payload(9606,{code:wrong.transferReference,content:wrong.transferReference,referenceCode:'',accountNumber:'99999999'})))).status,200);
      assert.deepEqual((await db.query(`SELECT disposition,store_id,branch_id,attempt_id FROM bank_transfer_events WHERE provider_event_id='9606'`))[0],{disposition:'QUARANTINED',store_id:store,branch_id:branch,attempt_id:wrong.attemptId});
      const cancelled=await makePending();await db.query(`UPDATE transfer_attempts SET status='CANCELLED' WHERE id=$1`,[cancelled.attemptId]);
      assert.equal((await post(JSON.stringify(payload(9607,{code:cancelled.transferReference,content:cancelled.transferReference,referenceCode:''})))).status,200);
      assert.equal((await db.query(`SELECT disposition FROM bank_transfer_events WHERE provider_event_id='9607'`))[0].disposition,'ATTEMPT_CANCELLED');
      await db.query('UPDATE promotion_codes SET used_count=usage_limit WHERE id=$1',[promo]);
      const invalid=await makePending(40000,promo);
      assert.equal((await post(JSON.stringify(payload(9608,{code:invalid.transferReference,content:invalid.transferReference,referenceCode:'',transferAmount:40000})))).status,200);
      assert.equal((await db.query(`SELECT disposition FROM bank_transfer_events WHERE provider_event_id='9608'`))[0].disposition,'PROMOTION_INVALID');
      const unpaid=[underpaid.invoiceId,wrong.invoiceId,cancelled.invoiceId,invalid.invoiceId];
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=ANY($1::uuid[])',[unpaid]))[0].n,0);
    });
    await t.test('test_ST6_duplicate_bank_reference_event',async()=>{
      const first=await makePending(),second=await makePending(),ref='FT-REUSED-ST6';
      const event=(id:number,qr:any)=>JSON.stringify(payload(id,{code:qr.transferReference,content:qr.transferReference,referenceCode:ref}));
      assert.equal((await post(event(9701,first))).status,200);
      const body=event(9702,second),response=await post(body);
      assert.equal(response.status,200,'Reused bank reference must be recorded and acknowledged');
      assert.deepEqual(await response.json(),{success:true});
      const [record]=await db.query(`SELECT disposition,store_id,branch_id,invoice_id,attempt_id FROM bank_transfer_events WHERE provider_event_id='9702'`);
      assert.deepEqual(record,{disposition:'DUPLICATE',store_id:store,branch_id:branch,invoice_id:second.invoiceId,attempt_id:second.attemptId});
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[second.invoiceId]))[0].status,'OPEN');
      assert.equal((await db.query('SELECT status FROM transfer_attempts WHERE id=$1',[second.attemptId]))[0].status,'PENDING');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[second.invoiceId]))[0].n,0);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[second.invoiceId]))[0].n,0);
      assert.equal((await post(body)).status,200);
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM bank_transfer_events WHERE provider_event_id='9702'`))[0].n,1);
      const rollback=await makePending(),rollbackBody=event(9703,rollback);
      await db.query(`CREATE FUNCTION st6_delta_fail_event() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.disposition='DUPLICATE' THEN RAISE EXCEPTION 'ST6 duplicate event rollback'; END IF; RETURN NEW; END $$`);
      await db.query('CREATE TRIGGER st6_delta_fail_event BEFORE INSERT ON bank_transfer_events FOR EACH ROW EXECUTE FUNCTION st6_delta_fail_event()');
      try{assert.equal((await post(rollbackBody)).status,500);}finally{
        await db.query('DROP TRIGGER st6_delta_fail_event ON bank_transfer_events');await db.query('DROP FUNCTION st6_delta_fail_event()');
      }
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM bank_transfer_events WHERE provider_event_id='9703'`))[0].n,0);
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[rollback.invoiceId]))[0].status,'OPEN');
      assert.equal((await post(rollbackBody)).status,200);
      assert.equal((await db.query(`SELECT disposition FROM bank_transfer_events WHERE provider_event_id='9703'`))[0].disposition,'DUPLICATE');
    });
    await t.test('test_ST6_duplicate_bank_reference_race',async()=>{
      const branch2=randomUUID(),actor2=randomUUID(),shift2=randomUUID();
      await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4)',[branch2,store,'WEB2','Second branch']);
      await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash)
        VALUES($1,$2,$3,(SELECT id FROM roles WHERE name='CASHIER'),'Cashier','st6_cashier2','hash')`,[actor2,store,branch2]);
      await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,status,started_at) VALUES($1,$2,$3,'CASHIER','OPEN',now())`,[shift2,branch2,actor2]);
      const first=await makePending(),second=await makePending(50000,undefined,{branch:branch2,shift:shift2,actor:actor2});
      const event=(id:number,qr:any)=>JSON.stringify(payload(id,{code:qr.transferReference,content:qr.transferReference,referenceCode:'FT-RACE-ST6'}));
      const bodies=[event(9711,first),event(9712,second)],responses=await Promise.all(bodies.map(body=>post(body)));
      assert.deepEqual(responses.map(response=>response.status),[200,200]);
      const states=await db.query('SELECT status FROM invoices WHERE id=ANY($1::uuid[]) ORDER BY status',[[first.invoiceId,second.invoiceId]]);
      assert.deepEqual(states.map((row:any)=>row.status),['OPEN','PAID']);
      const events=await db.query(`SELECT disposition,store_id,branch_id,invoice_id FROM bank_transfer_events WHERE provider_event_id IN ('9711','9712') ORDER BY disposition`);
      assert.deepEqual(events.map((row:any)=>row.disposition),['DUPLICATE','PAID']);
      assert.equal(events[0].store_id,store);assert.ok([branch,branch2].includes(events[0].branch_id));
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=ANY($1::uuid[])',[[first.invoiceId,second.invoiceId]]))[0].n,1);
      for(const body of bodies)assert.equal((await post(body)).status,200);
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM bank_transfer_events WHERE provider_event_id IN ('9711','9712')`))[0].n,2);
    });
    await t.test('test_ST6_signature_and_payload',async()=>{
      const body=JSON.stringify(payload(6101,{content:'Unmatched test code'}),null,2);
      const forged=await post(body,undefined,'sha256='+'0'.repeat(64));
      assert.equal(forged.status,401,'Webhook route must reject invalid signature');
      assert.equal((await forged.json() as any).error.code,'INVALID_WEBHOOK_SIGNATURE');
      const staleTime=String(Math.floor(Date.now()/1000)-301);
      const stale=await post(body,staleTime);assert.equal(stale.status,400);
      assert.equal((await stale.json() as any).error.code,'INVALID_WEBHOOK_PAYLOAD');
      const malformed=await post('{');assert.equal(malformed.status,400);
      const accepted=await post(body);assert.equal(accepted.status,200);
      assert.deepEqual(await accepted.json(),{success:true});
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bank_transfer_events WHERE provider_event_id=$1',['6101']))[0].n,1);
      const configured=process.env.SEPAY_WEBHOOK_SECRET!;
      delete process.env.SEPAY_WEBHOOK_SECRET;
      try{
        const missingSecret=await post(body,undefined,'sha256='+'0'.repeat(64));
        assert.equal(missingSecret.status,503,'Webhook must fail closed if secret is missing');
      }finally{process.env.SEPAY_WEBHOOK_SECRET=configured;}
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bank_transfer_events WHERE provider_event_id=$1',['6101']))[0].n,1);
    });
    await t.test('[R5-2] test_ST6_webhook_secret_shorter_than_32_bytes_fails_closed',async()=>{
      const configured=process.env.SEPAY_WEBHOOK_SECRET!;
      process.env.SEPAY_WEBHOOK_SECRET='x'.repeat(31);
      try{
        const eventsBefore=(await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n;
        const response=await post(JSON.stringify(payload(6299)));
        assert.equal(response.status,503,'A correctly signed request with a 31-byte secret must be refused');
        assert.equal((await response.json() as any).error.code,'SERVICE_UNAVAILABLE');
        assert.equal((await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n,eventsBefore);
      }finally{process.env.SEPAY_WEBHOOK_SECRET=configured;}
    });
    await t.test('[R6-1] webhook refuses placeholder secret',async()=>{
      const configured=process.env.SEPAY_WEBHOOK_SECRET!;
      process.env.SEPAY_WEBHOOK_SECRET='<separate-random-secret-at-least-32-bytes>';
      try{
        const qr=await makePending();
        const snapshot=async()=>({
          events:(await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n,
          payments:(await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,
          invoice:(await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status,
          attempt:(await db.query('SELECT status FROM transfer_attempts WHERE id=$1',[qr.attemptId]))[0].status,
        });
        const before=await snapshot();
        assert.deepEqual([before.invoice,before.attempt],['OPEN','PENDING']);
        const response=await post(JSON.stringify(payload(6301,{code:qr.transferReference,content:qr.transferReference})));
        assert.equal(response.status,503,'A correctly signed request with a placeholder secret must be refused');
        assert.equal((await response.json() as any).error.code,'SERVICE_UNAVAILABLE');
        assert.deepEqual(await snapshot(),before);
      }finally{process.env.SEPAY_WEBHOOK_SECRET=configured;}
    });
    await t.test('test_ST6_malformed_json_returns_invalid_webhook_payload [V1-1]',async()=>{
      const eventsBefore=(await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n;
      const paymentsBefore=(await db.query('SELECT count(*)::int AS n FROM payments'))[0].n;
      const signed=await post('not-json');
      assert.equal(signed.status,400);
      assert.equal((await signed.json() as any).error.code,'INVALID_WEBHOOK_PAYLOAD');
      const forged=await post('not-json',undefined,'sha256='+'0'.repeat(64));
      assert.equal(forged.status,401,'Bad signature must still win over malformed JSON');
      assert.equal((await forged.json() as any).error.code,'INVALID_WEBHOOK_SIGNATURE');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n,eventsBefore);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments'))[0].n,paymentsBefore);
    });
    await t.test('[R7-3] malformed JSON on trailing-slash webhook path',async()=>{
      const eventsBefore=(await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n;
      const timestamp=String(Math.floor(Date.now()/1000));
      const signature='sha256='+createHmac('sha256',process.env.SEPAY_WEBHOOK_SECRET!).update(timestamp+'.').update('not-json').digest('hex');
      for(const variant of [endpoint+'/',endpoint.replace('/sepay/webhook','/SePay/Webhook')]){
        const unsigned=await fetch(variant,{method:'POST',headers:{'Content-Type':'application/json'},body:'not-json'});
        assert.equal(unsigned.status,401,`Unsigned malformed request on ${variant.slice(variant.indexOf('/api'))} must be unauthenticated`);
        assert.equal((await unsigned.json() as any).error.code,'INVALID_WEBHOOK_SIGNATURE');
        const signed=await fetch(variant,{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Signature':signature,'X-SePay-Timestamp':timestamp},body:'not-json'});
        assert.equal(signed.status,400);
        assert.equal((await signed.json() as any).error.code,'INVALID_WEBHOOK_PAYLOAD');
      }
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n,eventsBefore);
    });
    await t.test('test_ST6_unsigned_without_headers_returns_401 [V2-2]',async()=>{
      const eventsBefore=(await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n;
      const paymentsBefore=(await db.query('SELECT count(*)::int AS n FROM payments'))[0].n;
      const body=JSON.stringify(payload(6190));
      for(const headers of [{'Content-Type':'application/json'} as Record<string,string>,
        {'Content-Type':'application/json','X-SePay-Signature':'','X-SePay-Timestamp':''}]){
        const unsigned=await fetch(endpoint,{method:'POST',headers,body});
        assert.equal(unsigned.status,401,'Unsigned request must be unauthenticated, not a payload error');
        assert.equal((await unsigned.json() as any).error.code,'INVALID_WEBHOOK_SIGNATURE');
      }
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n,eventsBefore);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments'))[0].n,paymentsBefore);
    });
    await t.test('test_ST6_signature_and_account_scope',async()=>{
      const wrongAccount=await post(JSON.stringify(payload(6102,{accountNumber:'9999999999999999999'})));
      assert.equal(wrongAccount.status,200);assert.deepEqual(await wrongAccount.json(),{success:true});
      const [wrong]=await db.query('SELECT disposition,store_id,branch_id,attempt_id FROM bank_transfer_events WHERE provider_event_id=$1',['6102']);
      assert.deepEqual([wrong.disposition,wrong.store_id,wrong.branch_id,wrong.attempt_id],['QUARANTINED',store,branch,attempt]);
      const embedded=await post(JSON.stringify(payload(6105,{code:null,content:`prefixx${reference}suffixy`})));
      assert.equal(embedded.status,200);
      const [hidden]=await db.query('SELECT disposition,store_id FROM bank_transfer_events WHERE provider_event_id=$1',['6105']);
      assert.deepEqual([hidden.disposition,hidden.store_id],['QUARANTINED',null],
        'A reference embedded in letters is not an exact transfer token');
      const multiple=await post(JSON.stringify(payload(6103,{content:`${reference} HDZZZZZZZZABCDEFGH`})));
      assert.equal(multiple.status,200);
      const [many]=await db.query('SELECT disposition,store_id,attempt_id FROM bank_transfer_events WHERE provider_event_id=$1',['6103']);
      assert.deepEqual([many.disposition,many.store_id,many.attempt_id],['QUARANTINED',null,null]);
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[invoice]))[0].status,'OPEN');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[invoice]))[0].n,0);
    });
    await t.test('test_ST6_webhook_duplicate_quarantine',async()=>{
      const body=JSON.stringify(payload(6104,{code:null,content:'No payment token'}));
      const responses=await Promise.all([post(body),post(body)]);
      for(const response of responses){assert.equal(response.status,200);assert.deepEqual(await response.json(),{success:true});}
      const rows=await db.query('SELECT disposition,store_id FROM bank_transfer_events WHERE provider_event_id=$1',['6104']);
      assert.equal(rows.length,1);assert.equal(rows[0].disposition,'QUARANTINED');assert.equal(rows[0].store_id,null);
    });
    await t.test('test_ST6_transfer_amounts',async()=>{
      const qr=await makePending();
      const event=(id:number,amount:number)=>post(JSON.stringify(payload(id,{
        content:`Transfer ${qr.transferReference}`,code:qr.transferReference,transferAmount:amount,
      })));
      for(const [id,amount] of [[6201,49999],[6202,1]] as const){
        const response=await event(id,amount);assert.equal(response.status,200);
        assert.deepEqual(await response.json(),{success:true});
        const [record]=await db.query('SELECT disposition,store_id,branch_id FROM bank_transfer_events WHERE provider_event_id=$1',[String(id)]);
        assert.deepEqual([record.disposition,record.store_id,record.branch_id],['UNDERPAID',store,branch]);
      }
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status,'OPEN');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      const exact=await event(6203,50000);assert.equal(exact.status,200);
      assert.deepEqual(await exact.json(),{success:true});
      const [payment]=await db.query(`SELECT amount,actual_received_amount,excess_amount,confirmation_source,created_by,
        idempotency_key,idempotency_request_hash FROM payments WHERE invoice_id=$1`,[qr.invoiceId]);
      assert.deepEqual([payment.amount,payment.actual_received_amount,payment.excess_amount,
        payment.confirmation_source,payment.created_by,payment.idempotency_key,payment.idempotency_request_hash],
        ['50000','50000','0','WEBHOOK',null,qr.key,'b'.repeat(64)]);
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status,'PAID');
      const [movement]=await db.query('SELECT source,created_by,quantity FROM stock_movements WHERE invoice_id=$1',[qr.invoiceId]);
      assert.deepEqual([movement.source,movement.created_by,movement.quantity],['SYSTEM',null,'-2.000']);
      const over=await makePending();
      const extra=await post(JSON.stringify(payload(6204,{code:null,content:over.transferReference,transferAmount:60000})));
      assert.equal(extra.status,200);
      assert.equal((await db.query('SELECT disposition FROM bank_transfer_events WHERE provider_event_id=$1',['6204']))[0].disposition,'PAID');
      const [overPayment]=await db.query('SELECT amount,actual_received_amount,excess_amount FROM payments WHERE invoice_id=$1',[over.invoiceId]);
      assert.deepEqual([overPayment.amount,overPayment.actual_received_amount,overPayment.excess_amount],['50000','60000','10000']);
    });
    await t.test('test_ST6_late_attempt',async()=>{
      const qr=await makePending();
      await db.query(`UPDATE transfer_attempts SET status='CANCELLED' WHERE id=$1`,[qr.attemptId]);
      const freshReference=qr.transferReference.slice(0,10)+'IJKLMNOP';
      await db.query(`INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,amount,
        transfer_reference,idempotency_key,idempotency_request_hash,status)
        VALUES($1,$2,$3,'970422',$4,'WEBHOOK STORE',50000,$5,$6,$7,'PENDING')`,
        [randomUUID(),qr.invoiceId,store,accountNumber,freshReference,randomUUID(),'c'.repeat(64)]);
      const late=await post(JSON.stringify(payload(6205,{code:qr.transferReference,content:qr.transferReference})));
      assert.equal(late.status,200);
      const [record]=await db.query('SELECT disposition,store_id,branch_id,attempt_id FROM bank_transfer_events WHERE provider_event_id=$1',['6205']);
      assert.deepEqual([record.disposition,record.store_id,record.branch_id,record.attempt_id],
        ['ATTEMPT_CANCELLED',store,branch,qr.attemptId]);
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status,'OPEN');
      assert.equal((await db.query('SELECT status FROM transfer_attempts WHERE transfer_reference=$1',[freshReference]))[0].status,'PENDING');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      await db.query(`UPDATE transfer_attempts SET status='CANCELLED' WHERE invoice_id=$1 AND status='PENDING'`,[qr.invoiceId]);
      await db.query(`UPDATE invoices SET status='CANCELLED',cancel_reason='Test',cancelled_at=now() WHERE id=$1`,[qr.invoiceId]);
      const cancelledInvoice=await post(JSON.stringify(payload(6206,{code:freshReference,content:freshReference})));
      assert.equal(cancelledInvoice.status,200);
      assert.equal((await db.query('SELECT disposition FROM bank_transfer_events WHERE provider_event_id=$1',['6206']))[0].disposition,'INVOICE_NOT_OPEN');
    });
    await t.test('test_ST6_webhook_duplicate',async()=>{
      const qr=await makePending(),body=JSON.stringify(payload(6207,{code:qr.transferReference,content:qr.transferReference}));
      const responses=await Promise.all([post(body),post(body)]);
      for(const response of responses){assert.equal(response.status,200);assert.deepEqual(await response.json(),{success:true});}
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bank_transfer_events WHERE provider_event_id=$1',['6207']))[0].n,1);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,1);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[qr.invoiceId]))[0].n,1);
    });
    await t.test('test_ST6_promo_invalid_on_arrival',async()=>{
      const promotion=randomUUID();
      await db.query(`INSERT INTO promotion_codes(id,store_id,code,discount_type,discount_value,start_at,end_at,usage_limit)
        VALUES($1,$2,'SAVE10','FIXED',10000,now()-interval '1 day',now()+interval '1 day',1)`,[promotion,store]);
      const qr=await makePending(40000,promotion);
      await db.query('UPDATE promotion_codes SET used_count=usage_limit WHERE id=$1',[promotion]);
      const response=await post(JSON.stringify(payload(6208,{code:qr.transferReference,content:qr.transferReference,transferAmount:40000})));
      assert.equal(response.status,200);
      const [record]=await db.query('SELECT disposition,store_id,branch_id FROM bank_transfer_events WHERE provider_event_id=$1',['6208']);
      assert.deepEqual([record.disposition,record.store_id,record.branch_id],['PROMOTION_INVALID',store,branch]);
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status,'OPEN');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      assert.equal((await db.query('SELECT used_count FROM promotion_codes WHERE id=$1',[promotion]))[0].used_count,1);
    });
    await t.test('test_ST6_atomic_rollback',async()=>{
      const qr=await makePending(),body=JSON.stringify(payload(6209,{code:qr.transferReference,content:qr.transferReference}));
      await db.query(`CREATE FUNCTION st6_fail_paid() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.status='PAID' THEN RAISE EXCEPTION 'ST6 rollback'; END IF; RETURN NEW; END $$`);
      await db.query('CREATE TRIGGER st6_fail_paid BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION st6_fail_paid()');
      const failed=await post(body);assert.equal(failed.status,500);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bank_transfer_events WHERE provider_event_id=$1',['6209']))[0].n,0);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_movements WHERE invoice_id=$1',[qr.invoiceId]))[0].n,0);
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status,'OPEN');
      await db.query('DROP TRIGGER st6_fail_paid ON invoices');await db.query('DROP FUNCTION st6_fail_paid()');
      const retried=await post(body);assert.equal(retried.status,200);
      assert.equal((await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status,'PAID');
    });
    const rejectedWithoutChange=async(send:(body:string)=>Promise<Response>,status:number,code:string)=>{
      const qr=await makePending();
      const body=JSON.stringify(payload(6400+(++sequence),{code:qr.transferReference,content:qr.transferReference}));
      const snapshot=async()=>({
        events:(await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n,
        payments:(await db.query('SELECT count(*)::int AS n FROM payments WHERE invoice_id=$1',[qr.invoiceId]))[0].n,
        invoice:(await db.query('SELECT status FROM invoices WHERE id=$1',[qr.invoiceId]))[0].status,
        attempt:(await db.query('SELECT status FROM transfer_attempts WHERE id=$1',[qr.attemptId]))[0].status,
      });
      const before=await snapshot();
      assert.deepEqual([before.invoice,before.attempt],['OPEN','PENDING']);
      const response=await send(body);
      assert.equal(response.status,status);
      assert.equal((await response.json() as any).error.code,code);
      assert.deepEqual(await snapshot(),before);
    };
    await t.test('[B-13] timestamp 302 seconds in the future is rejected',async()=>{
      // 302, not 301: the skew must still exceed the 300-second window when the request reaches the server a second late.
      await rejectedWithoutChange(body=>post(body,String(Math.floor(Date.now()/1000)+302)),400,'INVALID_WEBHOOK_PAYLOAD');
    });
    await t.test('[B-13] body changed after signing is rejected',async()=>{
      await rejectedWithoutChange(async body=>{
        const timestamp=String(Math.floor(Date.now()/1000));
        const signature='sha256='+createHmac('sha256',process.env.SEPAY_WEBHOOK_SECRET!).update(timestamp+'.').update(body).digest('hex');
        return fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-SePay-Signature':signature,'X-SePay-Timestamp':timestamp},
          body:body.replace('"transferAmount":50000','"transferAmount":50001')});
      },401,'INVALID_WEBHOOK_SIGNATURE');
    });
    await t.test('[B-13] malformed signature (non-hex, wrong length, no prefix) is rejected',async()=>{
      for(const malformed of ['sha256='+'z'.repeat(64),'sha256='+'a'.repeat(63),'sha256='+'a'.repeat(65),'a'.repeat(64)])
        await rejectedWithoutChange(body=>post(body,undefined,malformed),401,'INVALID_WEBHOOK_SIGNATURE');
    });
    await t.test('[B-19] double trailing slash is not treated as webhook',async()=>{
      const eventsBefore=(await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n;
      const paymentsBefore=(await db.query('SELECT count(*)::int AS n FROM payments'))[0].n;
      const response=await fetch(endpoint+'//',{method:'POST',headers:{'Content-Type':'application/json'},body:'not-json'});
      assert.equal(response.status,400,'Only a single trailing slash is normalised to the webhook route');
      assert.equal((await response.json() as any).error.code,'BAD_REQUEST');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bank_transfer_events'))[0].n,eventsBefore);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM payments'))[0].n,paymentsBefore);
    });
  }finally{
    if(app)await app.close();
    if(db.isInitialized)await db.destroy();
    await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await dataSource.destroy();
    if(previousEnv===undefined)delete process.env.SEPAY_ENV;else process.env.SEPAY_ENV=previousEnv;
    if(previousSecret===undefined)delete process.env.SEPAY_WEBHOOK_SECRET;else process.env.SEPAY_WEBHOOK_SECRET=previousSecret;
  }
});
