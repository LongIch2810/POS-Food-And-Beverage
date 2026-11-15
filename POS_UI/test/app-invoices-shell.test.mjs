import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const session={user:{id:'u',store_id:'s',branch_id:null,role_code:'OWNER'},permissions:['branch.access_all','invoice.read'],branch_name:null};
const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:value=>[typeof value==='function'?value():value,()=>{}],useEffect:()=>{}};
function load(path,mocks,append=''){const source=readFileSync(new URL(path,import.meta.url),'utf8')+append;const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;const exports={};vm.runInNewContext(js,{exports,window:{innerWidth:1024},require:mocks});return exports}
const navMock={...load('../src/app/navigation.ts',()=>({})),canOpenSettings:()=>false};
const routerMocks=(session,navigation,location,screens={})=>name=>name==='react'?react:name==='react-router-dom'?{useLocation:()=>location,useNavigate:()=>()=>{},Navigate:'Navigate',BrowserRouter:'BrowserRouter'}:name.endsWith('AuthContext')?{useAuth:()=>({session})}:name.endsWith('routes')?load('../src/app/routes.ts',n=>n.endsWith('navigation.ts')?navigation:{}):name.endsWith('navigation')?navigation:screens;
function find(node,p){if(Array.isArray(node))return node.map(x=>find(x,p)).find(Boolean);if(!node||typeof node!=='object')return;return p(node)?node:find(node.props?.children,p)}
test('[S9-06 banner] Hóa đơn và Báo cáo không hiện cảnh báo demo',()=>{const location={pathname:'/hoa-don',state:{owner:'u'}};const {AuthenticatedRouter}=load('../src/app/App.tsx',routerMocks(session,{accessibleTabs:()=>['invoices','reports'],canOpenProducts:()=>false},location),'\nexport { AuthenticatedRouter };');const banner=()=>find(AuthenticatedRouter({error:''}),x=>x.props?.role==='status');assert.equal(banner(),undefined);location.pathname='/bao-cao';assert.equal(banner(),undefined)});
test('[S9-06 branch] Hóa đơn của owner không hiển thị hoặc chọn chi nhánh mẫu',()=>{const {AppShell}=load('../src/components/common/AppShell.tsx',name=>name==='react'?react:name.endsWith('AuthContext')?{useAuth:()=>({session,logout(){}})}:name.endsWith('mockEngine')?{MockEngine:{getAccessibleBranches:()=>[{id:'demo',name:'Chi nhánh Nam Lý'}],getEffectiveBranchId:()=> 'demo'}}:name.endsWith('navigation')?navMock:{});const tree=AppShell({currentTab:'invoices',onSelectTab(){},children:null});assert.equal(find(tree,x=>x.props?.['aria-haspopup']==='menu'),undefined);assert.ok(find(tree,x=>x.props?.children?.includes('Tất cả chi nhánh')))});

const shellMocks=(perms,tab)=>({session:{...session,user:{...session.user,role_code:'CASHIER',branch_id:'b'},permissions:perms,branch_name:'Chi nhánh B'},tab});
test('test_ST3_AC1_service_shell_permissions shell: App, navigation và AppShell cùng mở Báo cáo theo ba quyền, không banner demo',()=>{
  for(const permission of ['report.view_shift','report.view_branch','report.view_all']){
    const {session:s2}=shellMocks(permission==='report.view_all'?[permission,'branch.access_all']:[permission]);
    const {accessibleTabs}=load('../src/app/navigation.ts',()=>({}));
    assert.ok(accessibleTabs(s2).includes('reports'),permission+' navigation');
    const {AppShell}=load('../src/components/common/AppShell.tsx',name=>name==='react'?react:name.endsWith('AuthContext')?{useAuth:()=>({session:s2,logout(){}})}:name.endsWith('mockEngine')?{MockEngine:{getAccessibleBranches:()=>[{id:'demo',name:'Chi nhánh Nam Lý'}],getEffectiveBranchId:()=>'demo'}}:name.endsWith('navigation')?navMock:{});
    const tree=AppShell({currentTab:'reports',onSelectTab(){},children:null});
    assert.ok(find(tree,x=>x.type==='span'&&x.props.children?.includes?.('Báo cáo')),permission+' AppShell nav item');
    assert.equal(find(tree,x=>x.props?.['aria-haspopup']==='menu'),undefined,permission+' chọn chi nhánh demo');
    assert.ok(find(tree,x=>x.props?.children?.includes?.('Chi nhánh B')),permission+' tên chi nhánh thật của phiên');
    assert.equal(find(tree,x=>x.props?.children?.includes?.('Chi nhánh Nam Lý')),undefined,permission+' tên chi nhánh demo');
    const {AuthenticatedRouter}=load('../src/app/App.tsx',routerMocks(s2,{accessibleTabs:()=>['reports'],canOpenSettings:()=>false,canOpenProducts:()=>false},{pathname:'/bao-cao',state:{owner:s2.user.id}},{DailyReportScreen:'DailyReportScreen'}),'\nexport { AuthenticatedRouter };');
    const app=AuthenticatedRouter({error:''});
    assert.ok(find(app,x=>x.props?.currentTab==='reports'),permission+' shell tab');
    assert.ok(find(app,x=>x.type?.name==='DailyReportScreen'||x.type==='DailyReportScreen'||typeof x.type==='function'&&x.type.name==='DailyReportScreen'),permission+' App hiện màn Báo cáo thay vì AccessDenied');
    assert.equal(find(app,x=>x.props?.role==='status'),undefined,permission+' banner demo');
    assert.ok(find(app,x=>x.type==='DailyReportScreen').props.key,permission+' DailyReportScreen có key identity');
  }
  const {accessibleTabs}=load('../src/app/navigation.ts',()=>({}));
  assert.equal(accessibleTabs({...session,user:{...session.user,role_code:'PLATFORM_ADMIN'},permissions:['store.read','report.view_all']}).includes('reports'),false,'admin bị chặn');
  assert.equal(accessibleTabs({...session,user:{...session.user,role_code:'CASHIER'},permissions:['pos.sell']}).includes('reports'),false,'không quyền');
});

const reportPerms=[
  [['report.view_all'],false,'chỉ view_all'],
  [['report.view_all','report.view_branch'],false,'view_all + view_branch thiếu access_all'],
  [['report.view_all','report.view_shift'],false,'view_all + view_shift thiếu access_all'],
  [['report.view_all','branch.access_all'],true,'view_all + access_all'],
  [['report.view_branch'],true,'chỉ view_branch'],
  [['report.view_shift'],true,'chỉ view_shift'],
];
const shellFor=s2=>load('../src/components/common/AppShell.tsx',name=>name==='react'?react:name.endsWith('AuthContext')?{useAuth:()=>({session:s2,logout(){}})}:name.endsWith('mockEngine')?{MockEngine:{getAccessibleBranches:()=>[],getEffectiveBranchId:()=>''}}:name.endsWith('navigation')?navMock:{}).AppShell;
test('[B-59] navigation: tab Báo cáo theo quyền, view_all cần branch.access_all',()=>{
  const {accessibleTabs}=load('../src/app/navigation.ts',()=>({}));
  for(const [perms,expected,label] of reportPerms)assert.equal(accessibleTabs(shellMocks(perms).session).includes('reports'),expected,label);
  assert.equal(accessibleTabs({...session,user:{...session.user,role_code:'PLATFORM_ADMIN'},permissions:['store.read','report.view_all','branch.access_all']}).includes('reports'),false,'PLATFORM_ADMIN');
});
test('[B-59] AppShell: mục nav Báo cáo theo quyền, view_all cần branch.access_all',()=>{
  for(const [perms,expected,label] of reportPerms){
    const tree=shellFor(shellMocks(perms).session)({currentTab:'pos',onSelectTab(){},children:null});
    assert.equal(!!find(tree,x=>x.type==='span'&&x.props.children?.includes?.('Báo cáo')),expected,label);
  }
});
test('[B-59] App: tab reports với quyền không đủ hiện AccessDenied, không render DailyReportScreen',()=>{
  const {accessibleTabs}=load('../src/app/navigation.ts',()=>({}));
  for(const [perms,expected,label] of reportPerms){
    const {session:s2}=shellMocks(perms);
    const router=load('../src/app/App.tsx',routerMocks(s2,{accessibleTabs,canOpenSettings:()=>false,canOpenProducts:()=>false},{pathname:'/bao-cao',state:{owner:s2.user.id}},{DailyReportScreen:'DailyReportScreen'}),'\nexport { AuthenticatedRouter };').AuthenticatedRouter;
    const app=router({error:''});
    assert.equal(!!find(app,x=>x.type==='DailyReportScreen'),expected,label);
  }
});
