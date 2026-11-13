import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test, afterEach } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { request } from '../src/http/client.ts';
import { salesService } from '../src/services/salesService.ts';

const source = readFileSync(new URL('../src/features/invoices/invoiceService.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {
  exports, URLSearchParams,
  require(name) {
    if (name.includes('mockStorage')) return {mockStorage:{getState:()=>({invoices:[]})}};
    if (name.includes('mockEngine')) return {MockEngine:{getEffectiveBranchId:()=>undefined}};
    if (name.includes('client')) return {request};
    if (name.includes('salesService')) return {salesService};
    throw Error(name);
  },
});
const { invoiceService } = exports;
afterEach(()=>{delete globalThis.fetch; delete globalThis.document;});

test('T3-http ST-3.AC-1 sends filters and preserves empty list metadata', async()=>{
  let observed;
  const envelope={data:[],meta:{limit:20,nextCursor:null,total:0,filterOptions:{tables:[],cashiers:[]}}};
  globalThis.fetch=async(url,options)=>{observed={url,method:options.method};return Response.json(envelope);};
  const result=await invoiceService.getInvoices({status:'ALL',from:'2026-11-12T17:00:00Z',to:'2026-11-13T17:00:00Z',tableId:'table 1',cashierId:'cashier',cursor:'a+/=',limit:20});
  assert.deepEqual(result,envelope);
  assert.deepEqual(observed,{method:'GET',url:'/api/v1/invoices?status=ALL&from=2026-11-12T17%3A00%3A00Z&to=2026-11-13T17%3A00%3A00Z&tableId=table+1&cashierId=cashier&cursor=a%2B%2F%3D&limit=20'});
});

test('T3-http ST-3.AC-1 detail and cancellation use encoded paths, body and server result',async()=>{
  globalThis.document={cookie:'__Host-pos_csrf=test'};
  const calls=[]; const detail={id:'id/1',status:'PAID',totalAmount:0,paymentMethod:null,items:[]};
  globalThis.fetch=async(url,options)=>{calls.push({url,method:options.method,body:options.body});return Response.json({data:detail});};
  assert.deepEqual(await invoiceService.getInvoiceById('id/1'),detail);
  assert.deepEqual(await invoiceService.cancelInvoice('id/1','reason'),detail);
  assert.deepEqual(calls,[{url:'/api/v1/invoices/id%2F1',method:'GET',body:undefined},{url:'/api/v1/invoices/id%2F1/cancel',method:'POST',body:'{"reason":"reason"}'}]);
});

test('T3-http ST-3.AC-1 propagates server error',async()=>{
  globalThis.fetch=async()=>Response.json({error:{code:'NOT_FOUND',message:'Missing'}},{status:404});
  await assert.rejects(invoiceService.getInvoices(), error=>error.code==='NOT_FOUND' && error.message==='Missing');
});

test('T3-pos ST-3.AC-2 keeps OPEN route and additional fields',async()=>{
  let url; const row={id:'i1',invoiceCode:'HD1',branchId:'b',workShiftId:'s',tableId:null,orderType:'TAKEAWAY',status:'OPEN',totalAmount:0,itemCount:1,createdAt:'2026-11-13T00:00:00Z',workShiftStatus:'OPEN',cashierId:'c',cashierName:'Cashier',tableName:null,paymentMethod:null};
  globalThis.fetch=async(input)=>{url=input;return Response.json({data:[row],meta:{limit:100,nextCursor:null,total:1}});};
  const page=await salesService.listOpen('b','a+/=');
  assert.equal(url,'/api/v1/invoices?status=OPEN&limit=100&branchId=b&cursor=a%2B%2F%3D');
  assert.deepEqual(page.data,[row]);
});
