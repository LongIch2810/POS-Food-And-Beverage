import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {AuthError} from '../src/auth/client.ts';

// Icon components are presentational only; the mocked React never renders them.
const lucide=new Proxy({},{get:(_,key)=>String(key)});

const path=new URL('../src/features/pos/LivePaymentDialog.tsx',import.meta.url);
function mount(overrides={},permissions=['pos.sell']) {
  assert.ok(existsSync(path),'Live payment dialog must exist');
  const compiled=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const slots=[],calls=[];let index=0,dirty=true,effects=[],tree,mounted=true,late=0;
  const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),
    useState(initial){const key=index++;if(!slots[key])slots[key]={value:typeof initial==='function'?initial():initial};return [slots[key].value,next=>{if(!mounted)late++;const value=typeof next==='function'?next(slots[key].value):next;if(!Object.is(value,slots[key].value)){slots[key].value=value;dirty=true;}}];},
    useRef(initial){const key=index++;return slots[key]??=( {current:initial} );},
    useEffect(effect,deps){const key=index++,previous=slots[key];if(!previous||deps.some((v,i)=>!Object.is(v,previous.deps[i])))effects.push(()=>{previous?.cleanup?.();slots[key]={deps,cleanup:effect()};});}};
  const pending={id:'a1',invoiceId:'i1',status:'PENDING',amount:50000,bankBin:'970422',accountNumber:'1234567890123456789',accountName:'STORE',transferReference:'HD12345678ABCDEFGH',qrImageUrl:'https://qr.test/a',createdAt:'2026-11-09T00:00:00Z'};
  const service={paymentPreview:async()=>({invoiceId:'i1',subtotal:60000,discountAmount:10000,totalAmount:50000,promotion:{code:'SAVE',applicable:true,reason:null},warnings:[{type:'MISSING_RECIPE'}]}),
    getPendingTransferAttempt:async()=>null,get:async()=>({id:'i1',status:'OPEN'}),createTransferAttempt:async(invoice,amount,key)=>{calls.push(['qr',invoice,amount,key]);return pending;},
    cancelTransferAttempt:async(id)=>{calls.push(['cancel',id]);},payCash:async(invoice,input,key)=>{calls.push(['cash',invoice,input,key]);return {status:'PAID'};},
    completeZero:async()=>{},applyPromotion:async()=>{},removePromotion:async()=>{},listBankTransferExceptions:async()=>({data:[],meta:{nextCursor:null}}),
    confirmTransferManually:async()=>({status:'PAID'}),...overrides};
  const exports={},intervals=new Map();let timer=0;
  vm.runInNewContext(compiled,{exports,Error,AuthError,crypto:{randomUUID:()=>`key-${++timer}`},setInterval:fn=>{intervals.set(++timer,fn);return timer;},clearInterval:id=>intervals.delete(id),
    require:name=>{if(name==='react')return React;if(name.endsWith('/Dialog'))return {Dialog:'Dialog'};if(name.endsWith('/salesService'))return {salesService:service};if(name.endsWith('/auth/client'))return {AuthError};if(name.endsWith('/formatters'))return {formatVND:n=>`${n}đ`};if(name==='lucide-react')return lucide;throw Error('Unexpected dependency: '+name);}});
  const props={invoice:{id:'i1',status:'OPEN',invoiceCode:'HD00000001'},permissions,canSell:permissions.includes('pos.sell'),onClose:()=>calls.push(['close']),onPaid:()=>calls.push(['paid']),onChanged:()=>calls.push(['changed'])};
  function render(){for(let count=0;dirty;count++){assert.ok(count<40);dirty=false;index=0;effects=[];tree=exports.LivePaymentDialog(props);effects.forEach(f=>f());}}
  async function flush(){for(let n=0;n<20;n++){render();await Promise.resolve();}render();}
  function find(type,predicate=()=>true){function walk(node){if(!node||typeof node!=='object')return;if(Array.isArray(node))return node.map(walk).find(Boolean);if(node.type===type&&predicate(node.props))return node;return walk(node.props?.children);}return walk(tree);}
  const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):['string','number'].includes(typeof node)?String(node):'';
  async function click(label){const node=find('button',p=>text(p.children)===label);assert.ok(node,`Button ${label} exists`);assert.ok(!node.props.disabled,`${label} enabled`);await node.props.onClick();await flush();}
  return {calls,pending,props,flush,find,click,text:()=>text(tree),intervals,async unmount(){slots.forEach(s=>s?.cleanup?.());mounted=false;},late:()=>late};
}

test('R1-2 payment dialog delegates focus and prevents closing during an uncertain payment',async()=>{
  const screen=mount({payCash:async()=>{throw new AuthError('NETWORK_ERROR','Mất mạng');}});
  await screen.flush();let dialog=screen.find('Dialog');assert.ok(dialog,'Payment must use accessible Dialog');
  assert.equal(dialog.props.isOpen,true);assert.equal(dialog.props.disableClose,false);
  screen.find('input',p=>p['aria-label']==='Tiền khách đưa').props.onChange({target:{value:'60000'}});await screen.flush();
  await screen.click('Xác nhận thanh toán');dialog=screen.find('Dialog');assert.equal(dialog.props.disableClose,true);
  await screen.unmount();
});

test('ST8 transfer shows server total, warnings, pending QR, fallback and cancellation',async()=>{
  const screen=mount();await screen.flush();assert.match(screen.text(),/50000đ/);assert.match(screen.text(),/công thức/i);
  await screen.click('Chuyển khoản');await screen.click('Tạo mã QR');assert.match(screen.text(),/Đang chờ/i);assert.doesNotMatch(screen.text(),/Đã thanh toán/i);
  assert.match(screen.text(),/1234567890123456789/);const img=screen.find('img');assert.ok(img);img.props.onError();await screen.flush();
  assert.match(screen.text(),/1234567890123456789/);assert.match(screen.text(),/HD12345678ABCDEFGH/);
  await screen.click('Hủy chờ');assert.deepEqual(screen.calls.find(v=>v[0]==='cancel'),['cancel','a1']);await screen.unmount();
});

test('ST8 network retry keeps key and cash body',async()=>{
  const observed=[];const screen=mount({payCash:async(invoice,body,key)=>{observed.push({invoice,body,key});if(observed.length===1)throw new AuthError('NETWORK_ERROR','Mất mạng');return {status:'PAID'};}});
  await screen.flush();await screen.click('Tiền mặt');const input=screen.find('input',p=>p['aria-label']==='Tiền khách đưa');assert.ok(input);
  input.props.onChange({target:{value:'60000'}});await screen.flush();await screen.click('Xác nhận thanh toán');assert.match(screen.text(),/Mất mạng/);
  await screen.click('Xác nhận thanh toán');assert.equal(observed.length,2);assert.deepEqual(observed[0],observed[1]);assert.ok(screen.calls.some(v=>v[0]==='paid'));
  await screen.unmount();
});

test('ST8 reload keeps pending QR and controls manual permissions',async()=>{
  const attempt={id:'a1',invoiceId:'i1',status:'PENDING',amount:50000,bankBin:'970422',accountNumber:'1234567890123456789',accountName:'STORE',transferReference:'HD12345678ABCDEFGH',qrImageUrl:'https://qr.test/a',createdAt:'2026-11-09T00:00:00Z'};
  const cashier=mount({getPendingTransferAttempt:async()=>attempt});await cashier.flush();assert.match(cashier.text(),/HD12345678ABCDEFGH/);assert.doesNotMatch(cashier.text(),/Xác nhận thủ công/);await cashier.unmount();
  const manager=mount({getPendingTransferAttempt:async()=>attempt},['pos.sell','transfer.confirm_manual','transfer.exception_read']);await manager.flush();assert.match(manager.text(),/Xác nhận thủ công/);await manager.unmount();
});

test('ST8 zero completion and promo actions wait for server response',async()=>{
  const actions=[];let resolvePayment;const completion=new Promise(resolve=>{resolvePayment=resolve;});
  const screen=mount({paymentPreview:async()=>({invoiceId:'i1',subtotal:50000,discountAmount:50000,totalAmount:0,promotion:{code:'FREE',applicable:true,reason:null},warnings:[]}),
    applyPromotion:async(_id,code)=>actions.push(['apply',code]),removePromotion:async()=>actions.push(['remove']),completeZero:async(_id,key)=>{actions.push(['zero',key]);await completion;}});
  await screen.flush();const code=screen.find('input',p=>p['aria-label']==='Mã giảm giá');code.props.onChange({target:{value:' FREE '}});await screen.flush();
  await screen.click('Áp dụng mã');await screen.click('Bỏ mã');assert.deepEqual(actions.slice(0,2),[['apply','FREE'],['remove']]);
  const button=screen.find('button',p=>p.children?.includes('Hoàn tất đơn 0đ'));assert.ok(button);button.props.onClick();await screen.flush();
  assert.ok(!screen.calls.some(v=>v[0]==='paid'),'Must wait for server response');resolvePayment();await screen.flush();assert.ok(screen.calls.some(v=>v[0]==='paid'));
  await screen.unmount();
});

test('ST8 manager confirms transfer with audited details and receives exceptions',async()=>{
  const attempt={id:'a1',invoiceId:'i1',status:'PENDING',amount:50000,bankBin:'970422',accountNumber:'1234567890123456789',accountName:'STORE',transferReference:'HD12345678ABCDEFGH',qrImageUrl:null,createdAt:'2026-11-09T00:00:00Z'};
  const sent=[];const screen=mount({getPendingTransferAttempt:async()=>attempt,listBankTransferExceptions:async()=>({data:[{id:'e1',reason:'DUPLICATE',amount:50000,invoiceId:'i1'}],meta:{nextCursor:null}}),
    confirmTransferManually:async(id,body,key)=>{sent.push({id,body,key});return {status:'PAID'};}},['transfer.confirm_manual','transfer.exception_read']);
  await screen.flush();assert.match(screen.text(),/Mã giao dịch đã dùng/);await screen.click('Xác nhận thủ công');
  for(const [label,value] of [['Mã giao dịch','FT123'],['Số tiền thực nhận','60000'],['Lý do xác nhận','Đã đối chiếu']]){
    screen.find('input',p=>p['aria-label']===label).props.onChange({target:{value}});await screen.flush();
  }
  await screen.click('Xác nhận đã nhận tiền');assert.equal(sent.length,1);assert.equal(sent[0].id,'a1');
  assert.equal(sent[0].body.transactionRef,'FT123');assert.equal(sent[0].body.actualReceivedAmount,60000);assert.equal(sent[0].body.reason,'Đã đối chiếu');
  assert.ok(sent[0].key);assert.ok(screen.calls.some(v=>v[0]==='paid'));await screen.unmount();
});

test('[R1-1] OWNER assigned to branch may select another branch and open its payment',async()=>{
  const source=readFileSync(new URL('../src/features/pos/LivePosScreen.tsx',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const slots=[];let index=0,dirty=true,effects=[],tree;
  const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState(initial){const k=index++;if(!slots[k])slots[k]={value:typeof initial==='function'?initial():initial};return [slots[k].value,next=>{const v=typeof next==='function'?next(slots[k].value):next;if(!Object.is(v,slots[k].value)){slots[k].value=v;dirty=true;}}];},useEffect(effect,deps){const k=index++,old=slots[k];if(!old||deps.some((v,i)=>!Object.is(v,old.deps[i])))effects.push(()=>{old?.cleanup?.();slots[k]={deps,cleanup:effect()};});}};
  const invoice={id:'i2',branchId:'b2',invoiceCode:'HD00000002',status:'OPEN',orderType:'TAKEAWAY',totalAmount:50000,items:[]};
  const session={user:{id:'owner',branch_id:'b1',store_id:'store'},permissions:['branch.access_all','pos.sell','transfer.confirm_manual']},exports={};let listed=[];
  vm.runInNewContext(compiled,{exports,Error,window:{prompt:()=>null},require:name=>{
    if(name==='react')return React;if(name.endsWith('/AuthContext'))return {useAuth:()=>({session,isOffline:false})};
    if(name.endsWith('/menuService'))return {menuService:{getAllCategories:async()=>[],getAllProducts:async()=>[],getAllToppings:async()=>[]}};
    if(name.endsWith('/organizationService'))return {organizationService:{getBranchChoices:async()=>[{id:'b1',name:'A',isActive:true},{id:'b2',name:'B',isActive:true}],getTables:async()=>({data:[],meta:{nextCursor:null}})}};
    if(name.endsWith('/shiftService'))return {shiftService:{getCurrentShift:async()=>null}};
    if(name.endsWith('/salesService'))return {salesService:{listOpen:async id=>{listed.push(id);return {data:id==='b2'?[invoice]:[],meta:{nextCursor:null}};},get:async()=>invoice,getPendingTransferAttempt:async()=>({id:'a2',status:'PENDING'})}};
    if(name.endsWith('/OpenShiftGate'))return {OpenShiftGate:'OpenShiftGate'};if(name.endsWith('/LivePaymentDialog'))return {LivePaymentDialog:'LivePaymentDialog'};if(name.endsWith('/formatters'))return {formatVND:n=>`${n}đ`};if(name.endsWith('/ui/Dialog'))return {Dialog:'Dialog'};if(name==='lucide-react')return lucide;throw Error(name);
  }});
  function render(){for(let n=0;dirty;n++){assert.ok(n<40);dirty=false;index=0;effects=[];tree=exports.LivePosScreen({});effects.forEach(f=>f());}}
  async function settle(){for(let n=0;n<30;n++){render();await Promise.resolve();}render();}
  function walk(node,p){if(!node||typeof node!=='object')return;if(Array.isArray(node))return node.map(v=>walk(v,p)).find(Boolean);if(p(node))return node;return walk(node.props?.children,p);}
  const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):typeof node==='string'?node:'';
  await settle();const selector=walk(tree,n=>n.type==='select'&&n.props['aria-label']==='Chi nhánh bán hàng');assert.ok(selector,'OWNER access_all must select a branch');
  selector.props.onChange({target:{value:'b2'}});await settle();assert.ok(listed.includes('b2'));
  walk(tree,n=>n.type==='button'&&text(n.props.children)==='Đơn đang mở').props.onClick();await settle();
  walk(tree,n=>n.type==='button'&&text(n.props.children).includes('HD00000002')).props.onClick();await settle();
  walk(tree,n=>n.type==='button'&&text(n.props.children)==='Thanh toán').props.onClick();await settle();
  assert.equal(walk(tree,n=>n.type==='LivePaymentDialog').props.invoice.id,'i2');
});

test('ST8 live POS exposes payment for selected order and permits manager to inspect without a shift',async()=>{
  const source=readFileSync(new URL('../src/features/pos/LivePosScreen.tsx',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const slots=[];let index=0,dirty=true,effects=[],tree;
  const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),
    useState(initial){const key=index++;if(!slots[key])slots[key]={value:typeof initial==='function'?initial():initial};return [slots[key].value,next=>{const value=typeof next==='function'?next(slots[key].value):next;if(!Object.is(value,slots[key].value)){slots[key].value=value;dirty=true;}}];},
    useEffect(effect,deps){const key=index++,previous=slots[key];if(!previous||deps.some((v,i)=>!Object.is(v,previous.deps[i])))effects.push(()=>{previous?.cleanup?.();slots[key]={deps,cleanup:effect()};});}};
  const invoice={id:'i1',branchId:'b1',workShiftId:'s1',invoiceCode:'HD00000001',status:'OPEN',orderType:'TAKEAWAY',totalAmount:50000,items:[]};
  const exports={},session={user:{id:'manager',branch_id:'b1',store_id:'store'},permissions:['pos.sell','transfer.confirm_manual','transfer.exception_read']};let currentShift=null;
  vm.runInNewContext(compiled,{exports,Error,window:{prompt:()=>null},require:name=>{
    if(name==='react')return React;if(name.endsWith('/AuthContext'))return {useAuth:()=>({session,isOffline:false})};
    if(name.endsWith('/menuService'))return {menuService:{getAllCategories:async()=>[],getAllProducts:async()=>[],getAllToppings:async()=>[]}};
    if(name.endsWith('/organizationService'))return {organizationService:{getTables:async()=>({data:[],meta:{nextCursor:null}})}};
    if(name.endsWith('/shiftService'))return {shiftService:{getCurrentShift:async()=>currentShift}};
    if(name.endsWith('/salesService'))return {salesService:{listOpen:async()=>({data:[invoice],meta:{nextCursor:null}}),get:async()=>invoice,getPendingTransferAttempt:async()=>({id:'a1',status:'PENDING'})}};
    if(name.endsWith('/OpenShiftGate'))return {OpenShiftGate:'OpenShiftGate'};if(name.endsWith('/LivePaymentDialog'))return {LivePaymentDialog:'LivePaymentDialog'};
    if(name.endsWith('/formatters'))return {formatVND:n=>`${n}đ`};if(name.endsWith('/ui/Dialog'))return {Dialog:'Dialog'};if(name==='lucide-react')return lucide;throw Error('Unexpected dependency '+name);
  }});
  function render(){for(let n=0;dirty;n++){assert.ok(n<40);dirty=false;index=0;effects=[];tree=exports.LivePosScreen({initialInvoiceId:'i1'});effects.forEach(f=>f());}}
  for(let n=0;n<30;n++){render();await Promise.resolve();}render();
  function walk(node,predicate){if(!node||typeof node!=='object')return;if(Array.isArray(node))return node.map(v=>walk(v,predicate)).find(Boolean);if(predicate(node))return node;return walk(node.props?.children,predicate);}
  const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):typeof node==='string'?node:'';
  const button=walk(tree,node=>node.type==='button'&&text(node.props.children)==='Thanh toán');assert.ok(button,'MANAGER without shift can open existing order payment');
  button.props.onClick();for(let n=0;n<10;n++){render();await Promise.resolve();}render();
  const dialog=walk(tree,node=>node.type==='LivePaymentDialog');assert.ok(dialog);assert.equal(dialog.props.canSell,false);
  session.user.id='cashier';session.permissions=['pos.sell','invoice.cancel_open'];currentShift={status:'OPEN',shiftType:'CASHIER',branchId:'b1'};
  invoice.items=[{id:'item',productName:'Trà',sizeName:'M',quantity:1,lineTotal:50000,toppings:[]}];dirty=true;render();
  assert.equal(walk(tree,node=>node.type==='LivePaymentDialog'),undefined,'A session change hides the old payment dialog immediately');
  for(let n=0;n<30;n++){render();await Promise.resolve();}render();
  assert.equal(walk(tree,node=>node.type==='button'&&['+','−','Xóa','Hủy đơn'].includes(text(node.props.children))),undefined,'Pending QR must lock order edits');
  assert.ok(walk(tree,node=>node.type==='button'&&text(node.props.children)==='Thanh toán'),'Payment dialog remains available while waiting');
});

test('[V3-2] exception list shows a Vietnamese label for transfers to the wrong receiving account',async()=>{
  const screen=mount({listBankTransferExceptions:async()=>({data:[{id:'e2',reason:'WRONG_ACCOUNT',amount:50000,invoiceId:'i1'}],meta:{nextCursor:null}})},['transfer.exception_read']);
  await screen.flush();assert.match(screen.text(),/Sai tài khoản nhận/);assert.doesNotMatch(screen.text(),/WRONG_ACCOUNT|Giao dịch cần kiểm tra/);await screen.unmount();
});

async function manualUncertainThenAttemptGone(endState) {
  const attempt={id:'a1',invoiceId:'i1',status:'PENDING',amount:50000,bankBin:'970422',accountNumber:'1234567890123456789',accountName:'STORE',transferReference:'HD12345678ABCDEFGH',qrImageUrl:null,createdAt:'2026-11-09T00:00:00Z'};
  const state={pending:attempt,detail:{id:'i1',status:'OPEN'}},cashCalls=[];
  const screen=mount({getPendingTransferAttempt:async()=>state.pending,get:async()=>state.detail,
    confirmTransferManually:async()=>{throw new AuthError('NETWORK_ERROR','Mất mạng');},payCash:async(invoice,body,key)=>{cashCalls.push([invoice,body,key]);return {status:'PAID'};}},
    ['pos.sell','transfer.confirm_manual']);
  await screen.flush();await screen.click('Xác nhận thủ công');
  for(const [label,value] of [['Mã giao dịch','FT123'],['Số tiền thực nhận','60000'],['Lý do xác nhận','Đã đối chiếu']]){
    screen.find('input',p=>p['aria-label']===label).props.onChange({target:{value}});await screen.flush();
  }
  await screen.click('Xác nhận đã nhận tiền');
  assert.equal(screen.find('Dialog').props.disableClose,true,'precondition: uncertain manual result locks the dialog');
  state.pending=endState.pending;state.detail=endState.detail;
  for(const poll of [...screen.intervals.values()])poll();
  await screen.flush();
  return {screen,cashCalls};
}

for(const [label,endState] of [['order is no longer OPEN',{pending:null,detail:{id:'i1',status:'CANCELLED'}}],['pending QR vanished while order is still OPEN',{pending:null,detail:{id:'i1',status:'OPEN'}}]]) {
  test(`[B-1] dialog is released after an uncertain manual confirmation when the ${label}`,async()=>{
    const {screen}=await manualUncertainThenAttemptGone(endState);
    assert.equal(screen.find('Dialog').props.disableClose,false,'Dialog must be closable again');
    const close=screen.find('button',p=>[p.children].flat().join('')==='Đóng');assert.ok(close,'Đóng exists');assert.ok(!close.props.disabled,'Đóng must be enabled');
    await screen.unmount();
  });
}

test('[B-1] stale manual request does not block later actions after the attempt is gone',async()=>{
  const {screen,cashCalls}=await manualUncertainThenAttemptGone({pending:null,detail:{id:'i1',status:'OPEN'}});
  await screen.click('Tiền mặt');
  screen.find('input',p=>p['aria-label']==='Tiền khách đưa').props.onChange({target:{value:'60000'}});await screen.flush();
  await screen.click('Xác nhận thanh toán');
  assert.equal(cashCalls.length,1,'cash payment must be sent, not rejected by a stale pending manual request');
  assert.doesNotMatch(screen.text(),/Hãy thử lại yêu cầu trước/);
  await screen.unmount();
});

function pollRaceScreen(detailsInOrder) {
  const attempt={id:'a1',invoiceId:'i1',status:'PENDING',amount:50000,bankBin:'970422',accountNumber:'1234567890123456789',accountName:'STORE',transferReference:'HD12345678ABCDEFGH',qrImageUrl:null,createdAt:'2026-11-09T00:00:00Z'};
  let pendingCalls=0,getCalls=0;
  const screen=mount({getPendingTransferAttempt:async()=>(pendingCalls++===0?attempt:null),get:async()=>detailsInOrder[Math.min(getCalls++,detailsInOrder.length-1)]});
  return screen;
}

test('[R5-1] order paid between the two poll requests calls onPaid instead of showing payment buttons again',async()=>{
  const screen=pollRaceScreen([{id:'i1',status:'OPEN'},{id:'i1',status:'PAID'}]);
  await screen.flush();assert.match(screen.text(),/Đang chờ chuyển khoản/);
  for(const poll of [...screen.intervals.values()])poll();
  await screen.flush();
  assert.ok(screen.calls.some(v=>v[0]==='paid'),'onPaid must be called once the order is PAID');
  assert.equal(screen.find('button',p=>text(p.children)==='Tiền mặt'),undefined,'cash/QR buttons must not reappear for a PAID order');
  await screen.unmount();
  function text(node){return Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):['string','number'].includes(typeof node)?String(node):'';}
});

test('[R5-1] pending QR gone while the order is still OPEN releases the dialog to payment buttons',async()=>{
  const screen=pollRaceScreen([{id:'i1',status:'OPEN'}]);
  await screen.flush();
  for(const poll of [...screen.intervals.values()])poll();
  await screen.flush();
  assert.ok(!screen.calls.some(v=>v[0]==='paid'));
  assert.ok(screen.find('button',p=>[p.children].flat().join('')==='Tiền mặt'),'Tiền mặt shown again');
  await screen.unmount();
});

test('[R7-2] uncertain manual is not replayed onto a different attempt',async()=>{
  const a1={id:'a1',invoiceId:'i1',status:'PENDING',amount:50000,bankBin:'970422',accountNumber:'1234567890123456789',accountName:'STORE',transferReference:'HD12345678ABCDEFGH',qrImageUrl:null,createdAt:'2026-11-09T00:00:00Z'};
  const a2={...a1,id:'a2',transferReference:'HD87654321ZYXWVUTS'};
  const state={pending:a1},manualCalls=[];
  const screen=mount({getPendingTransferAttempt:async()=>state.pending,get:async()=>({id:'i1',status:'OPEN'}),
    confirmTransferManually:async(id,body,key)=>{manualCalls.push({id,body,key});if(manualCalls.length===1)throw new AuthError('NETWORK_ERROR','Mất mạng');return {status:'PAID'};}},
    ['pos.sell','transfer.confirm_manual']);
  await screen.flush();await screen.click('Xác nhận thủ công');
  for(const [label,value] of [['Mã giao dịch','FT123'],['Số tiền thực nhận','60000'],['Lý do xác nhận','Đã đối chiếu']]){
    screen.find('input',p=>p['aria-label']===label).props.onChange({target:{value}});await screen.flush();
  }
  await screen.click('Xác nhận đã nhận tiền');
  assert.equal(screen.find('Dialog').props.disableClose,true,'precondition: uncertain manual result locks the dialog');
  state.pending=a2;
  for(const poll of [...screen.intervals.values()])poll();
  await screen.flush();
  assert.match(screen.text(),/HD87654321ZYXWVUTS/,'precondition: dialog now tracks attempt a2');
  assert.equal(screen.find('Dialog').props.disableClose,false,'uncertain flag from a1 must be cleared');
  assert.doesNotMatch(screen.text(),/Kết quả chưa rõ/);
  await screen.click('Xác nhận đã nhận tiền');
  assert.equal(manualCalls.length,2);
  assert.equal(manualCalls[1].id,'a2');
  assert.notEqual(manualCalls[1].key,manualCalls[0].key,'a2 must not reuse the idempotency key of a1');
  await screen.unmount();
});

test('[B-17] attempt switch reloads preview and keeps the manual confirmation form',async()=>{
  const a1={id:'a1',invoiceId:'i1',status:'PENDING',amount:50000,bankBin:'970422',accountNumber:'1234567890123456789',accountName:'STORE',transferReference:'HD12345678ABCDEFGH',qrImageUrl:null,createdAt:'2026-11-09T00:00:00Z'};
  const a2={...a1,id:'a2',amount:80000,transferReference:'HD87654321ZYXWVUTS'};
  const state={pending:a1,total:50000};
  const screen=mount({getPendingTransferAttempt:async()=>state.pending,get:async()=>({id:'i1',status:'OPEN'}),
    paymentPreview:async()=>({invoiceId:'i1',subtotal:state.total,discountAmount:0,totalAmount:state.total,promotion:null,warnings:[]})},
    ['pos.sell','transfer.confirm_manual']);
  await screen.flush();assert.match(screen.text(),/Cần thanh toán: 50000đ/);await screen.click('Xác nhận thủ công');
  for(const [label,value] of [['Mã giao dịch','FT123'],['Số tiền thực nhận','60000'],['Lý do xác nhận','Đã đối chiếu']]){
    screen.find('input',p=>p['aria-label']===label).props.onChange({target:{value}});await screen.flush();
  }
  state.pending=a2;state.total=80000;
  for(const poll of [...screen.intervals.values()])poll();
  await screen.flush();
  assert.match(screen.text(),/HD87654321ZYXWVUTS/,'precondition: dialog now tracks attempt a2');
  assert.match(screen.text(),/Cần thanh toán: 80000đ/,'preview must be reloaded for the new attempt');
  assert.doesNotMatch(screen.text(),/Cần thanh toán: 50000đ/);
  for(const [label,value] of [['Mã giao dịch','FT123'],['Số tiền thực nhận','60000'],['Lý do xác nhận','Đã đối chiếu']])
    assert.equal(screen.find('input',p=>p['aria-label']===label)?.props.value,value,`${label} must keep the entered value`);
  await screen.unmount();
});

test('[B-21] reload error on attempt switch is shown',async()=>{
  const a1={id:'a1',invoiceId:'i1',status:'PENDING',amount:50000,bankBin:'970422',accountNumber:'1234567890123456789',accountName:'STORE',transferReference:'HD12345678ABCDEFGH',qrImageUrl:null,createdAt:'2026-11-09T00:00:00Z'};
  const a2={...a1,id:'a2',amount:80000,transferReference:'HD87654321ZYXWVUTS'};
  const state={pending:a1,failPreview:false};
  const screen=mount({getPendingTransferAttempt:async()=>state.pending,get:async()=>({id:'i1',status:'OPEN'}),
    paymentPreview:async()=>{if(state.failPreview)throw new AuthError('NETWORK_ERROR','Mất mạng khi tải lại');return {invoiceId:'i1',subtotal:50000,discountAmount:0,totalAmount:50000,promotion:null,warnings:[]};}});
  await screen.flush();assert.match(screen.text(),/HD12345678ABCDEFGH/);
  state.pending=a2;state.failPreview=true;
  for(const poll of [...screen.intervals.values()])poll();
  await screen.flush();
  const alert=screen.find('p',p=>p.role==='alert');
  assert.ok(alert,'reload failure must be announced');
  assert.match(screen.text(),/Mất mạng khi tải lại/);
  await screen.unmount();
});

async function mountPos({initialInvoiceId='i1',status='OPEN',pending=null,tables,orders,details,created}={}) {
  const source=readFileSync(new URL('../src/features/pos/LivePosScreen.tsx',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const slots=[];let index=0,dirty=true,effects=[],tree;
  const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),
    useState(initial){const k=index++;if(!slots[k])slots[k]={value:typeof initial==='function'?initial():initial};return [slots[k].value,next=>{const v=typeof next==='function'?next(slots[k].value):next;if(!Object.is(v,slots[k].value)){slots[k].value=v;dirty=true;}}];},
    useEffect(effect,deps){const k=index++,old=slots[k];if(!old||deps.some((v,i)=>!Object.is(v,old.deps[i])))effects.push(()=>{old?.cleanup?.();slots[k]={deps,cleanup:effect()};});}};
  const state={detail:{id:'i1',branchId:'b1',workShiftId:'s1',invoiceCode:'HD00000001',status,orderType:'TAKEAWAY',totalAmount:0,items:[]},pending,orders:[{id:'i1',invoiceCode:'HD00000001',orderType:'TAKEAWAY',totalAmount:0}],tables:[],listCalls:0};
  if(tables)state.tables=tables;if(orders)state.orders=orders;if(details)state.details=details;if(created)state.created=created;
  const calls=[],exports={};
  const session={user:{id:'cashier',branch_id:'b1',store_id:'store'},permissions:['pos.sell','invoice.cancel_open']};
  const product={id:'p1',categoryId:'c1',name:'Trà đào',isActive:true,sizes:[{id:'sz1',sizeName:'M',price:30000,isActive:true}]};
  vm.runInNewContext(compiled,{exports,Error,window:{prompt:()=>'Khách đổi ý',confirm:()=>true},require:name=>{
    if(name==='react')return React;if(name.endsWith('/AuthContext'))return {useAuth:()=>({session,isOffline:false})};
    if(name.endsWith('/menuService'))return {menuService:{getAllCategories:async()=>[{id:'c1',name:'Trà',isActive:true}],getAllProducts:async()=>[product],getAllToppings:async()=>[],getCategoryToppings:async()=>[]}};
    if(name.endsWith('/organizationService'))return {organizationService:{getTables:async()=>({data:state.tables,meta:{nextCursor:null}})}};
    if(name.endsWith('/shiftService'))return {shiftService:{getCurrentShift:async()=>({status:'OPEN',shiftType:'CASHIER',branchId:'b1'})}};
    if(name.endsWith('/salesService'))return {salesService:{listOpen:async()=>{state.listCalls++;return {data:state.orders,meta:{nextCursor:null}};},
      get:async id=>{const d=state.details?.[id]??state.detail;if(d.status!=='OPEN')state.orders=state.orders.filter(o=>o.id!==d.id);return d;},getPendingTransferAttempt:async()=>state.pending,
      addItem:async(id,body)=>{calls.push(['addItem',id,body]);return state.detail;},create:async body=>{calls.push(['create',body]);return state.created??state.detail;},
      cancel:async(id,reason)=>{calls.push(['cancel',id,reason]);if(!state.keepListed)state.orders=state.orders.filter(o=>o.id!==id);return {...state.detail,status:'CANCELLED'};},
      updateItem:async(id,body)=>{calls.push(['updateItem',id,body]);return state.updated??state.detail;},removeItem:async id=>{calls.push(['removeItem',id]);state.detail=state.afterRemove??state.detail;}}};
    if(name.endsWith('/OpenShiftGate'))return {OpenShiftGate:'OpenShiftGate'};if(name.endsWith('/LivePaymentDialog'))return {LivePaymentDialog:'LivePaymentDialog'};
    if(name.endsWith('/formatters'))return {formatVND:n=>`${n}đ`};if(name.endsWith('/ui/Dialog'))return {Dialog:'Dialog'};if(name==='lucide-react')return lucide;throw Error('Unexpected dependency '+name);
  }});
  function render(){for(let n=0;dirty;n++){assert.ok(n<40);dirty=false;index=0;effects=[];tree=exports.LivePosScreen({initialInvoiceId});effects.forEach(f=>f());}}
  async function settle(){for(let n=0;n<40;n++){render();await Promise.resolve();}render();}
  const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):['string','number'].includes(typeof node)?String(node):'';
  function walk(node,p){if(!node||typeof node!=='object')return;if(Array.isArray(node))return node.map(v=>walk(v,p)).find(Boolean);if(p(node))return node;return walk(node.props?.children,p);}
  const button=label=>walk(tree,n=>n.type==='button'&&text(n.props.children).includes(label));
  await settle();
  return {state,calls,settle,button,text:()=>text(tree),has:label=>Boolean(button(label)),find:type=>walk(tree,n=>n.type===type),
    async click(label){const b=button(label);assert.ok(b,`Button ${label} exists`);await b.props.onClick();await settle();}};
}

test('[PAID-DONE-3] OPEN order without pending QR still accepts items',async()=>{
  const screen=await mountPos();
  assert.equal(screen.button('Trà đào').props.disabled,false,'product enabled for OPEN order');
  await screen.click('Trà đào');await screen.click('Thêm vào đơn');
  assert.equal(screen.calls.filter(c=>c[0]==='addItem').length,1);
});

test('[PAID-DONE-3] OPEN order with pending QR keeps the lock',async()=>{
  const screen=await mountPos({pending:{id:'a1',status:'PENDING'}});
  assert.match(screen.text(),/Đơn đang chờ chuyển khoản/);
  assert.equal(screen.button('Trà đào').props.disabled,true);
});

test('[PAID-DONE-1] a selected order that is no longer OPEN cannot receive items or edits',async()=>{
  // Every in-app path now deselects non-OPEN orders (AC-5..AC-8); only the view-only initialInvoiceId path can show one.
  const screen=await mountPos({details:{i1:{id:'i1',branchId:'b1',invoiceCode:'HD00000001',status:'PAID',orderType:'TAKEAWAY',totalAmount:30000,items:[{id:'it',productName:'Trà',sizeName:'M',quantity:1,lineTotal:30000,toppings:[]}]}}});
  assert.match(screen.text(),/Đã thanh toán/,'precondition: PAID order is shown');
  const product=screen.button('Trà đào');assert.ok(product);
  assert.equal(product.props.disabled,true,'menu must be locked for a PAID order');
  await product.props.onClick();await screen.settle();
  if(screen.has('Thêm vào đơn'))await screen.click('Thêm vào đơn');
  assert.equal(screen.calls.filter(c=>c[0]==='addItem').length,0,'addItem must not be called');
  for(const label of ['+','−','Xóa','Hủy đơn','Thanh toán'])assert.ok(!screen.button(label),`${label} hidden`);
});

test('[PAID-DONE-2] reload that returns a PAID order deselects it so a new order can be started',async()=>{
  const screen=await mountPos();
  assert.match(screen.text(),/HD00000001/,'precondition: order selected');
  screen.state.detail={...screen.state.detail,status:'PAID'};
  await screen.click('Tải lại đơn');
  assert.doesNotMatch(screen.text(),/HD00000001 ·|Đã thanh toán/,'PAID order must not stay selected');
  assert.match(screen.text(),/Chọn bàn hoặc mở đơn mang đi trước khi thêm món/);
  assert.equal(screen.button('Trà đào').props.disabled,true);
  assert.match(screen.text(),/Chưa chọn đơn/);
});

test('[PAID-DONE-4] an already PAID order opened by initialInvoiceId is view-only',async()=>{
  const screen=await mountPos({status:'PAID'});
  assert.equal(screen.button('Trà đào').props.disabled,true,'menu locked');
  await screen.button('Trà đào').props.onClick();await screen.settle();
  assert.equal(screen.calls.filter(c=>c[0]==='addItem').length,0);
  for(const label of ['+','−','Xóa','Hủy đơn','Thanh toán'])assert.ok(!screen.button(label),`${label} hidden`);
});

async function cancelOrder(screen,reason='Khách đổi ý'){
  await screen.click('Hủy đơn');
  screen.find('textarea').props.onChange({target:{value:reason}});await screen.settle();
  await screen.click('Xác nhận hủy đơn');
}

const lineItem={id:'it',productName:'Trà',sizeName:'M',quantity:1,lineTotal:30000,toppings:[]};
const dineIn={tables:[{id:'t1',name:'Bàn 1',isActive:true}],orders:[{id:'i1',invoiceCode:'HD00000001',orderType:'DINE_IN',tableId:'t1',totalAmount:0}]};

test('[PAID-DONE-5] cancelling an order deselects it at once, refreshes the list and keeps a result notice',async()=>{
  const screen=await mountPos();const before=screen.state.listCalls;
  screen.state.keepListed=true; // stale list: deselection must not depend on the refreshed list
  await cancelOrder(screen);
  assert.deepEqual(screen.calls.find(c=>c[0]==='cancel'),['cancel','i1','Khách đổi ý'],'precondition: cancel was sent');
  assert.match(screen.text(),/Chưa chọn đơn/,'CANCELLED order must not stay selected');
  assert.ok(screen.state.listCalls>before,'open orders must be refreshed');
  assert.match(screen.text(),/Đã hủy đơn/,'result notice must be shown');
  assert.equal(screen.button('Trà đào').props.disabled,true);
});

test('[PAID-DONE-5] an OPEN result of perform (edit item) stays selected',async()=>{
  const screen=await mountPos();
  screen.state.detail={...screen.state.detail,items:[lineItem]};await screen.click('Tải lại đơn');
  screen.state.updated={...screen.state.detail,items:[{...lineItem,quantity:2}],totalAmount:60000};
  await screen.click('+');
  assert.ok(screen.calls.some(c=>c[0]==='updateItem'),'precondition: updateItem called');
  assert.match(screen.text(),/HD00000001/);assert.match(screen.text(),/Tổng: 60000đ/);assert.doesNotMatch(screen.text(),/Chưa chọn đơn/);
});

test('[PAID-DONE-6] a table whose stored order is already PAID is treated as free and gets a new order',async()=>{
  const screen=await mountPos({initialInvoiceId:null,...dineIn,
    details:{i1:{id:'i1',branchId:'b1',invoiceCode:'HD00000001',status:'PAID',orderType:'DINE_IN',tableId:'t1',totalAmount:0,items:[]}},
    created:{id:'i9',branchId:'b1',invoiceCode:'HD00000009',status:'OPEN',orderType:'DINE_IN',tableId:'t1',totalAmount:0,items:[]}});
  const before=screen.state.listCalls;
  await screen.click('Sơ đồ bàn');await screen.click('Bàn 1');
  assert.equal(JSON.stringify(screen.calls.find(c=>c[0]==='create')),JSON.stringify(['create',{orderType:'DINE_IN',tableId:'t1'}]),'new DINE_IN order must be created');
  assert.ok(screen.state.listCalls>before,'open orders must be refreshed');
  assert.match(screen.text(),/HD00000009/);assert.doesNotMatch(screen.text(),/Đã thanh toán/);
});

test('[PAID-DONE-6] a table with a really OPEN order still opens that order',async()=>{
  const screen=await mountPos({initialInvoiceId:null,...dineIn});
  await screen.click('Sơ đồ bàn');await screen.click('Bàn 1');
  assert.equal(screen.calls.filter(c=>c[0]==='create').length,0);assert.match(screen.text(),/HD00000001/);assert.match(screen.text(),/Đang mở/);
});

test('[PAID-DONE-7] clicking a listed order that is no longer OPEN does not select it, refreshes and explains',async()=>{
  const screen=await mountPos({initialInvoiceId:null,status:'PAID'});const before=screen.state.listCalls;
  await screen.click('Đơn đang mở');await screen.click('HD00000001');
  assert.match(screen.text(),/Chưa chọn đơn/,'PAID order must not be selected');
  assert.ok(screen.state.listCalls>before,'list must be refreshed');
  assert.match(screen.text(),/Chưa có đơn đang mở/,'stale order disappears from the list');
  assert.match(screen.text(),/đã thanh toán hoặc đã đóng/i);
});

test('[PAID-DONE-7] clicking a listed OPEN order still selects it',async()=>{
  const screen=await mountPos({initialInvoiceId:null});
  await screen.click('Đơn đang mở');await screen.click('HD00000001');
  assert.match(screen.text(),/Đang mở/);
});

test('[PAID-DONE-8] item removal whose follow-up read returns a PAID order deselects it',async()=>{
  const screen=await mountPos();
  screen.state.detail={...screen.state.detail,items:[lineItem]};await screen.click('Tải lại đơn');
  screen.state.afterRemove={...screen.state.detail,status:'PAID'};
  await screen.click('Xóa');
  assert.ok(screen.calls.some(c=>c[0]==='removeItem'),'precondition: removeItem called');
  assert.match(screen.text(),/Chưa chọn đơn/,'PAID order must not stay selected after removal');
});

async function payThenNextCustomer({keepPaidListed}){
  const created={id:'i9',branchId:'b1',workShiftId:'s1',invoiceCode:'HD00000009',status:'OPEN',orderType:'TAKEAWAY',totalAmount:0,items:[]};
  const screen=await mountPos({created});
  assert.match(screen.text(),/HD00000001/,'precondition: order i1 selected');
  await screen.click('Thanh toán');
  const dialog=screen.find('LivePaymentDialog');assert.ok(dialog,'precondition: payment dialog open');
  screen.state.detail={...screen.state.detail,status:'PAID'};
  if(!keepPaidListed)screen.state.orders=[];
  dialog.props.onPaid();await screen.settle();
  assert.ok(!screen.find('LivePaymentDialog'),'payment dialog closed');
  assert.match(screen.text(),/Chưa chọn đơn/,'paid order must be deselected');
  assert.match(screen.text(),/Thanh toán thành công\./);
  assert.equal(screen.button('Trà đào').props.disabled,true,'menu locked until a new order is opened');
  await screen.click('Tạo đơn mang đi');
  assert.equal(JSON.stringify(screen.calls.find(c=>c[0]==='create')),JSON.stringify(['create',{orderType:'TAKEAWAY'}]));
  assert.match(screen.text(),/HD00000009/,'new order i9 selected');
  screen.state.detail=created;
  assert.equal(screen.button('Trà đào').props.disabled,false,'menu enabled for the new OPEN order');
  await screen.click('Trà đào');await screen.click('Thêm vào đơn');
  const adds=screen.calls.filter(c=>c[0]==='addItem');
  assert.ok(adds.some(c=>c[1]==='i9'),'item must go to the new order i9');
  assert.ok(!adds.some(c=>c[1]==='i1'),'no item may go to the paid order i1');
}

test('[PAID-DONE-9] successful payment deselects the order and the next customer\'s items go to a new order',async()=>{
  await payThenNextCustomer({keepPaidListed:false});
});

test('[PAID-DONE-9b] deselection after payment does not depend on the refreshed open-order list',async()=>{
  // Stale list still contains i1: only onPaid's own setSelected(null) can deselect it.
  await payThenNextCustomer({keepPaidListed:true});
});

test('[B-39] the "Thanh toán thành công." notice of a paid order disappears when a new takeaway order is created',async()=>{
  const created={id:'i9',branchId:'b1',workShiftId:'s1',invoiceCode:'HD00000009',status:'OPEN',orderType:'TAKEAWAY',totalAmount:0,items:[]};
  const screen=await mountPos({created});
  await screen.click('Thanh toán');
  const dialog=screen.find('LivePaymentDialog');assert.ok(dialog,'precondition: payment dialog open');
  screen.state.detail={...screen.state.detail,status:'PAID'};screen.state.orders=[];
  dialog.props.onPaid();await screen.settle();
  assert.match(screen.text(),/Thanh toán thành công\./,'precondition: paid notice shown right after payment');
  await screen.click('Tạo đơn mang đi');
  assert.match(screen.text(),/HD00000009/,'precondition: new order selected');
  assert.doesNotMatch(screen.text(),/Thanh toán thành công\./,'old paid notice must not follow the new order');
});

test('[B-39] "Đã hủy đơn." shows right after cancelling and disappears once another order is created',async()=>{
  const created={id:'i9',branchId:'b1',workShiftId:'s1',invoiceCode:'HD00000009',status:'OPEN',orderType:'TAKEAWAY',totalAmount:0,items:[]};
  const screen=await mountPos({created});
  await cancelOrder(screen);
  assert.match(screen.text(),/Đã hủy đơn\./,'cancel notice must stay visible right after cancelling');
  await screen.click('Tạo đơn mang đi');
  assert.match(screen.text(),/HD00000009/,'precondition: new order selected');
  assert.doesNotMatch(screen.text(),/Đã hủy đơn\./,'old cancel notice must not follow the new order');
});

test('[B-39] "Đã hủy đơn." disappears when an OPEN order is chosen from the open-order list',async()=>{
  const screen=await mountPos();screen.state.keepListed=true;
  await cancelOrder(screen);assert.match(screen.text(),/Đã hủy đơn\./,'precondition: cancel notice shown');
  await screen.click('Đơn đang mở');await screen.click('HD00000001');
  assert.match(screen.text(),/Đang mở/,'precondition: OPEN order selected');
  assert.doesNotMatch(screen.text(),/Đã hủy đơn\./,'old cancel notice must not follow the chosen order');
});

test('[B-39] "Đã hủy đơn." disappears when an occupied table is opened from the table map',async()=>{
  const screen=await mountPos({initialInvoiceId:null,...dineIn});screen.state.keepListed=true;
  await screen.click('Sơ đồ bàn');await screen.click('Bàn 1');
  await cancelOrder(screen);assert.match(screen.text(),/Đã hủy đơn\./,'precondition: cancel notice shown');
  await screen.click('Sơ đồ bàn');await screen.click('Bàn 1');
  assert.match(screen.text(),/Đang mở/,'precondition: OPEN order selected');
  assert.doesNotMatch(screen.text(),/Đã hủy đơn\./,'old cancel notice must not follow the opened table order');
});

test('[B-40] a DINE_IN order that is no longer OPEN has no table-transfer control, while an OPEN one has',async()=>{
  const paidDineIn={id:'i1',branchId:'b1',invoiceCode:'HD00000001',status:'PAID',orderType:'DINE_IN',tableId:'t1',totalAmount:30000,items:[lineItem]};
  const tables=[{id:'t1',name:'Bàn 1',isActive:true},{id:'t2',name:'Bàn 2',isActive:true}];
  const open=await mountPos({tables,orders:[],details:{i1:{...paidDineIn,status:'OPEN'}}});
  assert.ok(open.find('select'),'control: transfer select exists for an OPEN DINE_IN order');
  const paid=await mountPos({tables,orders:[],details:{i1:paidDineIn}});
  assert.match(paid.text(),/Đã thanh toán/,'precondition: PAID DINE_IN order is shown');
  assert.equal(paid.find('select'),undefined,'transfer select must be hidden for a PAID DINE_IN order');
});

test('[B-40] perform() returning a PAID order deselects it and says "Đơn đã đóng."',async()=>{
  const screen=await mountPos();
  screen.state.detail={...screen.state.detail,items:[lineItem]};await screen.click('Tải lại đơn');
  screen.state.updated={...screen.state.detail,status:'PAID'};
  await screen.click('+');
  assert.ok(screen.calls.some(c=>c[0]==='updateItem'),'precondition: updateItem called');
  assert.match(screen.text(),/Đơn đã đóng\./);
  assert.match(screen.text(),/Chưa chọn đơn/);
});
