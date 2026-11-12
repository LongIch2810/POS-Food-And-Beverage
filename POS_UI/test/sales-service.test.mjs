import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { salesService } from '../src/services/salesService.ts';
import { bankAccountService } from '../src/services/bankAccountService.ts';

afterEach(() => { delete globalThis.document; delete globalThis.fetch; });

test('PB-07 BR-16/22/28/92 sales client uses real routes, CSRF and server amounts', async () => {
  globalThis.document = { cookie: '__Host-pos_csrf=test' };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    if (url.includes('?')) return Response.json({ data: [], meta: { total: 0, limit: 100, nextCursor: null } });
    return Response.json({ data: { id: 'invoice-1', status: 'OPEN' } });
  };
  await salesService.listOpen('branch-1');
  await salesService.get('invoice-1');
  await salesService.create({ orderType: 'DINE_IN', tableId: 'table-1' });
  await salesService.addItem('invoice-1', { productSizeId: 'size-1', quantity: 2, toppings: [{ toppingId: 'topping-1', quantity: 1 }] });
  await salesService.updateItem('item-1', { quantity: 3 });
  await salesService.removeItem('item-1');
  await salesService.transfer('invoice-1', 'table-2');
  await salesService.cancel('invoice-1', 'Khách đổi ý');
  assert.deepEqual(calls.map(c => [c.method, c.url]), [
    ['GET', '/api/v1/invoices?status=OPEN&limit=100&branchId=branch-1'],
    ['GET', '/api/v1/invoices/invoice-1'],
    ['POST', '/api/v1/invoices'],
    ['POST', '/api/v1/invoices/invoice-1/items'],
    ['PATCH', '/api/v1/invoice-items/item-1'],
    ['DELETE', '/api/v1/invoice-items/item-1'],
    ['POST', '/api/v1/invoices/invoice-1/transfer-table'],
    ['POST', '/api/v1/invoices/invoice-1/cancel'],
  ]);
  assert.deepEqual(JSON.parse(calls[3].body), { productSizeId: 'size-1', quantity: 2, toppings: [{ toppingId: 'topping-1', quantity: 1 }] });
  assert.equal(calls[7].headers['X-CSRF-Token'], 'test');
});

test('ST8 payment service sends real routes and preserves idempotency keys',async()=>{
  assert.equal(typeof salesService.paymentPreview,'function','Payment preview service must exist');
  globalThis.document={cookie:'__Host-pos_csrf=test'};
  const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,...options});
    if(url.includes('exceptions'))return Response.json({data:[],meta:{limit:20,nextCursor:null,total:0}});
    if(url.includes('complete-zero')||url.endsWith('/cancel'))return new Response(null,{status:204});
    return Response.json({data:{id:'i1',totalAmount:50000}});};
  await salesService.paymentPreview('i1');await salesService.applyPromotion('i1','SAVE');await salesService.removePromotion('i1');
  await salesService.payCash('i1',{method:'CASH',amount:50000,tenderedAmount:60000},'key-cash');
  await salesService.completeZero('i1','key-zero');await salesService.createTransferAttempt('i1',50000,'key-qr');
  await salesService.getPendingTransferAttempt('i1');await salesService.cancelTransferAttempt('a1');
  await salesService.confirmTransferManually('a1',{transactionRef:'FT1',actualReceivedAmount:50000,reason:'Đã đối chiếu'},'key-manual');
  await salesService.listBankTransferExceptions();
  assert.deepEqual(calls.map(c=>[c.method,c.url]),[
    ['GET','/api/v1/invoices/i1/payment-preview'],['POST','/api/v1/invoices/i1/apply-promotion'],['POST','/api/v1/invoices/i1/remove-promotion'],
    ['POST','/api/v1/invoices/i1/payments'],['POST','/api/v1/invoices/i1/complete-zero'],['POST','/api/v1/invoices/i1/transfer-attempts'],
    ['GET','/api/v1/invoices/i1/transfer-attempts'],['POST','/api/v1/transfer-attempts/a1/cancel'],['POST','/api/v1/transfer-attempts/a1/confirm-manual'],
    ['GET','/api/v1/bank-transfer-exceptions']]);
  assert.equal(calls[3].headers['Idempotency-Key'],'key-cash');assert.equal(calls[4].headers['Idempotency-Key'],'key-zero');
  assert.equal(calls[5].headers['Idempotency-Key'],'key-qr');assert.equal(calls[8].headers['Idempotency-Key'],'key-manual');
  assert.deepEqual(JSON.parse(calls[5].body),{amount:50000});
});

test('ST8 bank service preserves the complete account number and uses live routes',async()=>{
  globalThis.document={cookie:'__Host-pos_csrf=test'};const calls=[];
  globalThis.fetch=async(url,options)=>{calls.push({url,...options});return Response.json({data:options.body?JSON.parse(options.body):null});};
  await bankAccountService.get();const input={bankBin:'970422',accountNumber:'1234567890123456789',accountName:'STORE'};
  assert.deepEqual(await bankAccountService.update(input),input);assert.deepEqual(calls.map(c=>[c.method,c.url]),[
    ['GET','/api/v1/store-bank-account'],['PATCH','/api/v1/store-bank-account']]);
  assert.equal(JSON.parse(calls[1].body).accountNumber,'1234567890123456789');
});
