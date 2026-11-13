import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
test('T4-date: ngày Việt Nam không phụ thuộc múi giờ máy',()=>{const source=readFileSync(new URL('../src/features/invoices/InvoicesScreen.tsx',import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;const exports={};vm.runInNewContext(js,{exports,require:()=>({})});const range=exports.invoiceDateRange('2026-11-13');assert.equal(range.from,'2026-11-12T17:00:00.000Z');assert.equal(range.to,'2026-11-13T17:00:00.000Z')});

test('T4-list and T4-race: cột nhận row thật và response cũ không hiện sau đổi lọc',async()=>{
 const src=readFileSync(new URL('../src/features/invoices/InvoicesScreen.tsx',import.meta.url),'utf8');const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 let slots=[],i=0,dirty=true,effects=[],tree,requests=[],details=[];const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState(v){let k=i++;if(!slots[k])slots[k]={v:typeof v==='function'?v():v};return [slots[k].v,x=>{x=typeof x==='function'?x(slots[k].v):x;if(!Object.is(x,slots[k].v)){slots[k].v=x;dirty=true}}]},useRef(v){let k=i++;return slots[k]??={current:v}},useEffect(fn,deps){let k=i++,old=slots[k];if(!old||deps.some((x,j)=>!Object.is(x,old.deps[j])))effects.push(()=>{old?.cleanup?.();slots[k]={deps,cleanup:fn()}})}};
 const session={user:{id:'u',store_id:'s',branch_id:'b'},permissions:['invoice.read','branch.access_all']};const identity={identity:'u',epoch:1};let exports={};vm.runInNewContext(js,{exports,Date,JSON,require:path=>{if(path==='react')return React;if(path.endsWith('invoiceService'))return {invoiceService:{getInvoices:f=>new Promise((resolve,reject)=>requests.push({f,resolve,reject})),getInvoiceById:id=>new Promise(resolve=>details.push({id,resolve}))}};if(path.endsWith('AuthContext'))return {useAuth:()=>({session})};if(path.endsWith('session-events'))return {getRequestIdentity:()=>identity};if(path.endsWith('formatters'))return {formatVND:String,formatDateTimeVN:String};if(path.endsWith('organizationService'))return {organizationService:{getBranchChoices:async()=>[{id:'branch',name:'Chi nhánh'}]}};let n=path.split('/').at(-1);return {[n]:n}}});
 const render=()=>{for(let n=0;dirty;n++){assert.ok(n<20);dirty=false;i=0;effects=[];const wrapper=exports.InvoicesScreen();tree=wrapper.type(wrapper.props);effects.forEach(f=>f())}};const find=(type,p=()=>true,node=tree)=>{if(Array.isArray(node))return node.map(x=>find(type,p,x ?? null)).find(Boolean);if(!node||typeof node!=='object')return;if(node.type===type&&p(node.props))return node;return node.props?.children ? find(type,p,node.props.children) : undefined};const flush=async()=>{for(let n=0;n<5;n++){render();await Promise.resolve()}render()};
 await flush();assert.equal(requests[0].f.status,'ALL');const status=find('select');status.props.onChange({target:{value:'PAID'}});await flush();assert.equal(requests[1].f.status,'PAID');requests[0].resolve({data:[{id:'old'}],meta:{}});await flush();assert.equal(find('DataTable'),undefined);const row={id:'i',invoiceCode:'HD1',createdAt:'2026',orderType:'TAKEAWAY',itemCount:2,status:'PAID',paymentMethod:'CASH',totalAmount:95,cashierName:'An'};requests[1].resolve({data:[row],meta:{total:1,nextCursor:'next',filterOptions:{tables:[{id:'t',name:'Bàn 1'}],cashiers:[{id:'c',name:'An'}]}}});await flush();const table=find('DataTable');assert.equal(table.props.data[0].id,'i');for(const col of table.props.columns)col.render(row,0);
 table.props.onRowClick(row);await flush();table.props.onRowClick({...row,id:'j'});await flush();details[0].resolve({id:'i'});await flush();assert.equal(find('InvoiceDetailDrawer').props.invoice,null);details[1].resolve({id:'j'});await flush();assert.equal(find('InvoiceDetailDrawer').props.invoice.id,'j');
 const buttons=[];const collect=node=>{if(Array.isArray(node))return node.forEach(collect);if(!node||typeof node!=='object')return;if(node.type==='button')buttons.push(node);collect(node.props?.children)};collect(tree);buttons.find(b=>b.props.children.includes('Trang sau')).props.onClick();await flush();assert.equal(requests[2].f.cursor,'next');requests[2].reject(new Error('network'));await flush();assert.ok(find('div',p=>p.role==='alert'));const retry=find('button',p=>p.children.includes('Tải lại'));retry.props.onClick();await flush();assert.equal(requests[3].f.cursor,undefined);requests[3].resolve({data:[row],meta:{total:1,nextCursor:null,filterOptions:{tables:[{id:'t',name:'Bàn 1'}],cashiers:[{id:'c',name:'An'}]}}});await flush();
 for(const [label,value,field] of [['Bàn','t','tableId'],['Thu ngân','c','cashierId'],['Chi nhánh','branch','branchId']]){find('select',p=>p['aria-label']===label).props.onChange({target:{value}});await flush();assert.equal(requests.at(-1).f[field],value);assert.equal(requests.at(-1).f.cursor,undefined);requests.at(-1).resolve({data:[row],meta:{total:1,nextCursor:null,filterOptions:{tables:[{id:'t',name:'Bàn 1'}],cashiers:[{id:'c',name:'An'}]}}});await flush()}
 find('DataTable').props.onRowClick({...row,id:'k'});await flush();identity.identity='v';identity.epoch++;session.user.id='v';details[2].resolve({id:'k'});dirty=true;render();await flush();assert.equal(find('InvoiceDetailDrawer').props.invoice,null);assert.equal(find('DataTable'),undefined);assert.equal(find('DataTable'),undefined);session.permissions=[];dirty=true;render();assert.equal(find('DataTable'),undefined);

});





test('T4-keyboard: hàng có thể chọn nhận Enter và Space',()=>{const src=readFileSync(new URL('../src/components/ui/DataTable.tsx',import.meta.url),'utf8');const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;const React={createElement:(type,props,...children)=>({type,props:{...props,children}})};const exports={};vm.runInNewContext(js,{exports,React,require:path=>path==='react'?React:{Inbox:'Inbox'}});let count=0;const tree=exports.DataTable({columns:[],data:[{id:'i'}],keyExtractor:r=>r.id,onRowClick:()=>count++});const row=tree.props.children[0].props.children[1].props.children[0][0];assert.equal(row.props.tabIndex,0);const target={};for(const key of ['Enter',' '])row.props.onKeyDown({key,target,currentTarget:target,preventDefault(){}});assert.equal(count,2)});

test('[B-51] T4-list/T4-race: lỗi tải giữ message/requestId và cho phép tải lại', async () => {
  const source = readFileSync(new URL('../src/features/invoices/InvoicesScreen.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const slots = [], requests = [], details = [];
  let index = 0, dirty = true, effects = [], tree;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(value) {
      const key = index++;
      slots[key] ??= { value: typeof value === 'function' ? value() : value };
      return [slots[key].value, next => { slots[key].value = typeof next === 'function' ? next(slots[key].value) : next; dirty = true; }];
    },
    useRef(value) { return slots[index++] ??= { current: value }; },
    useEffect(fn, deps) {
      const key = index++, old = slots[key];
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) effects.push(() => { old?.cleanup?.(); slots[key] = { deps, cleanup: fn() }; });
    },
  };
  const session = { user: { id: 'u', store_id: 's', branch_id: 'b' }, permissions: ['invoice.read'] };
  const identity = { identity: 'u', epoch: 1 };
  const exports = {};
  vm.runInNewContext(js, { exports, Date, JSON, require: path => {
    if (path === 'react') return React;
    if (path.endsWith('invoiceService')) return { invoiceService: {
      getInvoices: filters => new Promise((resolve, reject) => requests.push({ filters, resolve, reject })),
      getInvoiceById: id => new Promise((resolve, reject) => details.push({ id, resolve, reject })),
    } };
    if (path.endsWith('AuthContext')) return { useAuth: () => ({ session }) };
    if (path.endsWith('session-events')) return { getRequestIdentity: () => identity };
    if (path.endsWith('formatters')) return { formatVND: String, formatDateTimeVN: String };
    const name = path.split('/').at(-1); return { [name]: name };
  } });
  const render = () => {
    for (let n = 0; dirty; n++) {
      assert.ok(n < 20); dirty = false; index = 0; effects = [];
      const wrapper = exports.InvoicesScreen(); tree = wrapper.type(wrapper.props); effects.forEach(fn => fn());
    }
  };
  const flush = async () => { for (let n = 0; n < 5; n++) { render(); await Promise.resolve(); } render(); };
  const find = (type, predicate = () => true, node = tree) => {
    if (Array.isArray(node)) return node.map(child => find(type, predicate, child ?? null)).find(Boolean);
    if (!node || typeof node !== 'object') return;
    if (node.type === type && predicate(node.props)) return node;
    return node.props?.children ? find(type, predicate, node.props.children) : undefined;
  };
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' ? node : '';
  const retry = () => find('button', props => props.children.includes('Tải lại')).props.onClick();
  const summary = { id: 'i', invoiceCode: 'HD1', branchId: 'b', workShiftId: 'shift', tableId: null, orderType: 'TAKEAWAY', status: 'OPEN', totalAmount: 0, itemCount: 0, createdAt: '2026-11-13T10:00:00.000Z', workShiftStatus: 'OPEN', cashierId: 'u', cashierName: 'An', tableName: null, paymentMethod: null };
  const invoice = { ...summary, subtotal: 0, discountAmount: 0, note: null, cancelReason: null, cancelledAt: null, updatedAt: '2026-11-13T10:00:00.000Z', items: [] };
  const page = { data: [summary], meta: { limit: 20, total: 1, nextCursor: null, filterOptions: { tables: [], cashiers: [] } } };
  const serverError = (message, requestId) => Object.assign(new Error(message), { code: 'INTERNAL_ERROR', status: 500, requestId, details: [] });

  await flush();
  requests[0].reject(serverError('Máy chủ chưa tải được danh sách.', 'req-list-51'));
  await flush();
  assert.match(text(find('div', props => props.role === 'alert')), /Máy chủ chưa tải được danh sách\./);
  assert.match(text(find('div', props => props.role === 'alert')), /req-list-51/);
  retry(); await flush(); requests.at(-1).resolve(page); await flush();
  assert.equal(find('DataTable').props.data[0].id, 'i');

  find('DataTable').props.onRowClick({ id: 'i' }); await flush();
  details[0].reject(serverError('Máy chủ chưa tải được chi tiết.', 'req-detail-51')); await flush();
  assert.match(text(find('div', props => props.role === 'alert')), /Máy chủ chưa tải được chi tiết\./);
  assert.match(text(find('div', props => props.role === 'alert')), /req-detail-51/);
  retry(); await flush(); details.at(-1).resolve(invoice); await flush();
  assert.equal(find('InvoiceDetailDrawer').props.invoice.id, 'i');

  for (const [status, failure] of [['PAID', new Error('Mất kết nối.')], ['OPEN', null]]) {
    find('select', props => props['aria-label'] === 'Trạng thái').props.onChange({ target: { value: status } }); await flush();
    requests.at(-1).reject(failure); await flush();
    const listAlert = text(find('div', props => props.role === 'alert'));
    assert.match(listAlert, failure ? /Mất kết nối\./ : /Không tải được hóa đơn/);
    assert.doesNotMatch(listAlert, /undefined|null|Mã yêu cầu/);
    retry(); await flush(); requests.at(-1).resolve(page); await flush();
    find('DataTable').props.onRowClick({ id: 'i' }); await flush();
    details.at(-1).reject(failure); await flush();
    const detailAlert = text(find('div', props => props.role === 'alert'));
    assert.match(detailAlert, failure ? /Mất kết nối\./ : /Không tải được chi tiết hóa đơn/);
    assert.doesNotMatch(detailAlert, /undefined|null|Mã yêu cầu/);
    retry(); await flush(); details.at(-1).resolve(invoice); await flush();
    assert.equal(find('InvoiceDetailDrawer').props.invoice.id, 'i');
  }

  find('DataTable').props.onRowClick({ id: 'old' }); await flush();
  const staleDetail = details.at(-1);
  find('DataTable').props.onRowClick({ id: 'new' }); await flush();
  staleDetail.reject(serverError('Lỗi chi tiết cũ.', 'req-old-detail')); await flush();
  assert.equal(find('div', props => props.role === 'alert'), undefined);
  details.at(-1).resolve({ ...invoice, id: 'new' }); await flush();
  assert.equal(find('InvoiceDetailDrawer').props.invoice.id, 'new');
  const requestCount = requests.length;
  find('select', props => props['aria-label'] === 'Trạng thái').props.onChange({ target: { value: 'PAID' } }); await flush();
  assert.equal(requests.length, requestCount + 1);
  const staleList = requests.at(-1);
  assert.equal(staleList.filters.status, 'PAID');
  find('select', props => props['aria-label'] === 'Trạng thái').props.onChange({ target: { value: 'CANCELLED' } }); await flush();
  assert.equal(requests.length, requestCount + 2);
  assert.equal(requests.at(-1).filters.status, 'CANCELLED');
  staleList.reject(serverError('Lỗi danh sách cũ.', 'req-old-list')); await flush();
  assert.equal(find('div', props => props.role === 'alert'), undefined);
  const cancelledPage = { ...page, data: [{ ...summary, id: 'cancelled', status: 'CANCELLED' }] };
  requests.at(-1).resolve(cancelledPage); await flush();
  assert.equal(find('DataTable').props.data[0].id, 'cancelled');
  assert.equal(find('DataTable').props.data[0].status, 'CANCELLED');
  find('DataTable').props.onRowClick({ id: 'i' }); await flush();
  identity.epoch++;
  details.at(-1).reject(serverError('Lỗi phiên cũ.', 'req-old-session')); await flush();
  assert.equal(find('div', props => props.role === 'alert'), undefined);
});
