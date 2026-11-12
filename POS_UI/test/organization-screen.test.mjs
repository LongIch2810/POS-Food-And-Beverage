import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';
import { AuthError } from '../src/auth/client.ts';
import { validateOrganizationForm } from '../src/features/settings/organizationForm.ts';
import { accessibleTabs, canOpenSettings } from '../src/app/navigation.ts';

const require = createRequire(import.meta.url);
const owner = { user: { id: 'owner', store_id: 'A', branch_id: null, role_code: 'OWNER' },
  permissions: ['branch.read','branch.manage','branch.access_all','table.manage','user.manage'] };
const branches = [{ id: 'A1', name: 'A1', isActive: true }, { id: 'A2', name: 'A2', isActive: false }];
const page = (data, nextCursor = null, total = data.length) => ({ data, meta: { limit: 20, nextCursor, total } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const source = readFileSync(new URL('../src/features/settings/SettingsScreen.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;

function mount(overrides = {}, session = owner, shiftsTotal = 0, bankService = {}) {
  const calls = [], toasts = [], slots = [], listeners = new Map(), sessionEvents = [];
  let index = 0, dirty = true, tree, effects = [], mounted = true, lateWrites = 0;
  const service = {
    getBranchChoices: async () => branches,
    getBranches: async query => { calls.push(['branches', query]); return page([{ id: 'branch', code: 'QA', name: 'Branch', initialCash: 0, isActive: true }]); },
    getTables: async query => { calls.push(['tables', query]); return page([{ id: 'table', name: 'Table', branchId: 'A1', capacity: null, isActive: true }]); },
    getStaff: async query => { calls.push(['staff', query]); return page([{ id: 'staff', username: 'staff', fullName: 'QA', branchId: 'A1', role: 'CASHIER', isActive: true }]); },
    ...overrides,
  };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const key = index++;
      if (!slots[key]) slots[key] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[key].value, update => {
        if (!mounted) lateWrites++;
        const next = typeof update === 'function' ? update(slots[key].value) : update;
        if (!Object.is(next, slots[key].value)) { slots[key].value = next; dirty = true; }
      }];
    },
    useRef(initial) { const key = index++; return (slots[key] ??= { current: initial }); },
    useEffect(effect, deps) {
      const key = index++, previous = slots[key];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        effects.push(() => { previous?.cleanup?.(); slots[key] = { deps, cleanup: effect() }; });
      }
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, Error, navigator: { onLine: true },
    window: { addEventListener: (event, action) => listeners.set(event, action), removeEventListener: event => listeners.delete(event) },
    require: path => {
      if (path === 'react') return React;
      if (path.endsWith('/organizationService')) return { organizationService: service };
      if (path.endsWith('/shiftService')) return { shiftService: { getShifts: async () => ({ meta: { total: shiftsTotal } }) } };
      if (path.endsWith('/bankAccountService')) return { bankAccountService: bankService };
      if (path.endsWith('/AuthContext')) return { useAuth: () => ({ session }) };
      if (path.endsWith('/ToastContext')) return { useToast: () => ({ showToast: value => toasts.push(value) }) };
      if (path.endsWith('/auth/client')) return { AuthError };
      if (path.endsWith('/auth/session-events')) return { notifySessionChange: event => sessionEvents.push(event) };
      if (path.endsWith('/formatters')) return { formatVND: String };
      if (path.endsWith('/Field')) return { SelectField: 'SelectField' };
      if (path === './PromotionsPanel') return { PromotionsPanel: 'PromotionsPanel' };
      if (path === 'lucide-react') return new Proxy({}, { get: (_, key) => String(key) });
      const name = path.split('/').at(-1);
      if (['Button','Badge','DataTable','Dialog','OrganizationEditor'].includes(name)) return { [name]: name };
      throw new Error('Unexpected dependency: ' + path);
    } });
  function render() {
    for (let pass = 0; dirty; pass++) {
      assert.ok(pass < 30, 'render settles'); dirty = false; index = 0; effects = [];
      tree = exports.SettingsContent({ session });
      const table = find('DataTable');
      if (table) for (const row of table.props.data) for (const column of table.props.columns) column.render(row);
      effects.forEach(effect => effect());
    }
  }
  async function flush() { for (let i = 0; i < 20; i++) { render(); await Promise.resolve(); } render(); }
  function find(type, predicate = () => true, node = tree) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.map(child => find(type, predicate, child)).find(Boolean);
    if (node.type === type && predicate(node.props)) return node;
    return find(type, predicate, node.props?.children);
  }
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' ? node : '';
  async function click(label, node = tree) {
    const button = find('Button', props => text(props.children) === label, node);
    assert.ok(button, 'button exists: ' + label); assert.ok(!button.props.disabled, 'button enabled: ' + label);
    button.props.onClick(); await flush();
  }
  return { calls, toasts, sessionEvents, flush, find, click,
    data: () => find('DataTable')?.props.data,
    editor: () => find('OrganizationEditor')?.props,
    async select(label, value) { const node = find('SelectField', props => props.label === label); assert.ok(node); node.props.onChange({ target: { value } }); await flush(); },
    async submit(values) { const form = find('OrganizationEditor'); assert.ok(form); form.props.onSubmit(values); await flush(); },
    async rowAction(label) { const table = find('DataTable'); const row = table.props.data[0]; const actions = table.props.columns.find(column => column.key === 'actions').render(row); await click(label, actions); },
    async unmount() { slots.forEach(slot => slot?.cleanup?.()); mounted = false; },
    lateWrites: () => lateWrites,
    text: () => text(tree),
    key: () => exports.SettingsScreen().props.key,
  };
}

test('ST8 owner bank settings accept 19 digits and reject 20 before PATCH',async()=>{
  const saved=[],session={...owner,permissions:[...owner.permissions,'store_bank_account.manage']};
  const bank={get:async()=>null,update:async input=>{saved.push(input);return input;}};
  const screen=mount({},session,0,bank);await screen.flush();
  const bankBin=screen.find('input',p=>p['aria-label']==='Mã BIN ngân hàng');assert.ok(bankBin,'Bank account settings visible to OWNER');
  bankBin.props.onChange({target:{value:'970422'}});await screen.flush();
  screen.find('input',p=>p['aria-label']==='Tên chủ tài khoản').props.onChange({target:{value:'CUA HANG'}});await screen.flush();
  screen.find('input',p=>p['aria-label']==='Số tài khoản').props.onChange({target:{value:'1234567890123456789'}});await screen.flush();
  await screen.click('Lưu tài khoản');assert.equal(saved[0].accountNumber,'1234567890123456789');
  screen.find('input',p=>p['aria-label']==='Số tài khoản').props.onChange({target:{value:'12345678901234567890'}});await screen.flush();
  await screen.click('Lưu tài khoản');assert.equal(saved.length,1);assert.match(screen.text(),/6 đến 19 chữ số/);await screen.unmount();
});

test('[B-29][B-31] account number error is attached to its field and shown once',async()=>{
  const session={...owner,permissions:[...owner.permissions,'store_bank_account.manage']};
  const bank={get:async()=>null,update:async()=>{throw new AuthError('VALIDATION_ERROR','Dữ liệu không hợp lệ.',{status:422,
    details:[{location:'body',field:'accountNumber',message:'Số tài khoản bị ngân hàng từ chối.'}]});}};
  const screen=mount({},session,0,bank);await screen.flush();
  const input=()=>screen.find('input',p=>p['aria-label']==='Số tài khoản');
  assert.equal(input().props['aria-invalid'],undefined,'no error before saving');
  screen.find('input',p=>p['aria-label']==='Mã BIN ngân hàng').props.onChange({target:{value:'970422'}});await screen.flush();
  screen.find('input',p=>p['aria-label']==='Tên chủ tài khoản').props.onChange({target:{value:'CUA HANG'}});await screen.flush();
  input().props.onChange({target:{value:'1234567890123456789'}});await screen.flush();
  await screen.click('Lưu tài khoản');
  assert.equal(input().props['aria-invalid'],'true');
  const id=input().props['aria-describedby'];assert.ok(id,'aria-describedby set');
  const error=screen.find('p',p=>p.id===id);assert.ok(error,'described element exists');
  assert.equal(error.props.role,'alert');
  assert.equal(error.props.children.join(''),'Số tài khoản bị ngân hàng từ chối.');
  assert.ok(!screen.text().includes('Dữ liệu không hợp lệ.'));
  assert.equal(id,'bank-account-error');
  assert.equal(screen.text().split('Số tài khoản bị ngân hàng từ chối.').length-1,1,'message appears once');
  await screen.unmount();
});

test('[B-30] client-side account number error is attached to its field',async()=>{
  const session={...owner,permissions:[...owner.permissions,'store_bank_account.manage']};
  let updates=0,fail=false;
  const bank={get:async()=>null,update:async input=>{updates++;if(fail)throw new AuthError('VALIDATION_ERROR','Dữ liệu không hợp lệ.',{status:422,
    details:[{location:'body',field:'accountNumber',message:'Số tài khoản bị ngân hàng từ chối.'}]});return input;}};
  const screen=mount({},session,0,bank);await screen.flush();
  const input=()=>screen.find('input',p=>p['aria-label']==='Số tài khoản');
  screen.find('input',p=>p['aria-label']==='Mã BIN ngân hàng').props.onChange({target:{value:'970422'}});await screen.flush();
  screen.find('input',p=>p['aria-label']==='Tên chủ tài khoản').props.onChange({target:{value:'CUA HANG'}});await screen.flush();
  input().props.onChange({target:{value:'12345678901234567890'}});await screen.flush();
  await screen.click('Lưu tài khoản');
  assert.equal(updates,0,'no PATCH for 20 digits');
  assert.equal(input().props['aria-invalid'],'true');
  assert.equal(input().props['aria-describedby'],'bank-account-error');
  const error=screen.find('p',p=>p.id==='bank-account-error');assert.ok(error);
  assert.match(error.props.children.join(''),/6 đến 19 chữ số/);
  assert.equal(screen.text().split('6 đến 19 chữ số').length-1,1,'no duplicate generic alert');
  // server 422 then client-side error replaces it
  input().props.onChange({target:{value:'1234567890123456789'}});await screen.flush();
  fail=true;await screen.click('Lưu tài khoản');assert.equal(updates,1);
  assert.ok(screen.text().includes('Số tài khoản bị ngân hàng từ chối.'));
  input().props.onChange({target:{value:'123'}});await screen.flush();
  await screen.click('Lưu tài khoản');
  assert.equal(updates,1);
  assert.ok(!screen.text().includes('Số tài khoản bị ngân hàng từ chối.'),'stale server message cleared');
  assert.equal(screen.text().split('6 đến 19 chữ số').length-1,1);
  assert.equal(screen.find('p',p=>p.id==='bank-account-error').props.children.join('').includes('6 đến 19'),true);
  await screen.unmount();
});

test('[B-34] stale bank errors cleared on client-side validation',async()=>{
  const session={...owner,permissions:[...owner.permissions,'store_bank_account.manage']};
  const fill=async(screen,values)=>{
    for(const [label,value] of values){screen.find('input',p=>p['aria-label']===label).props.onChange({target:{value}});await screen.flush();}
  };
  // (1) server 422 accountNumber, then empty BIN: field error must go, BIN alert must show, no extra PATCH
  {
    let updates=0;
    const bank={get:async()=>null,update:async()=>{updates++;throw new AuthError('VALIDATION_ERROR','Dữ liệu không hợp lệ.',{status:422,
      details:[{location:'body',field:'accountNumber',message:'Số tài khoản bị ngân hàng từ chối.'}]});}};
    const screen=mount({},session,0,bank);await screen.flush();
    await fill(screen,[['Mã BIN ngân hàng','970422'],['Tên chủ tài khoản','CUA HANG'],['Số tài khoản','1234567890123456789']]);
    await screen.click('Lưu tài khoản');
    assert.equal(updates,1);
    assert.ok(screen.find('p',p=>p.id==='bank-account-error'),'server field error shown first');
    await fill(screen,[['Mã BIN ngân hàng','']]);
    await screen.click('Lưu tài khoản');
    assert.equal(updates,1,'no PATCH when BIN empty');
    assert.equal(screen.find('p',p=>p.id==='bank-account-error'),undefined,'stale account error cleared');
    assert.ok(screen.find('p',p=>p.role==='alert'&&String(p.children.join('')).includes('Nhập mã BIN')),'BIN alert shown');
    await screen.unmount();
  }
  // (2) generic error, then 20-digit account: generic text must go, account error shown
  {
    const bank={get:async()=>null,update:async()=>{throw new Error('QA 500');}};
    const screen=mount({},session,0,bank);await screen.flush();
    await fill(screen,[['Mã BIN ngân hàng','970422'],['Tên chủ tài khoản','CUA HANG'],['Số tài khoản','1234567890123456789']]);
    await screen.click('Lưu tài khoản');
    assert.ok(screen.text().includes('QA 500'),'generic error shown first');
    await fill(screen,[['Số tài khoản','12345678901234567890']]);
    await screen.click('Lưu tài khoản');
    assert.ok(!screen.text().includes('QA 500'),'stale generic error cleared');
    assert.ok(screen.find('p',p=>p.id==='bank-account-error'),'account error shown');
    await screen.unmount();
  }
});

test('PB13-NAV OWNER opens settings, permission-only staff entry and platform isolation', () => {
  assert.equal(accessibleTabs(owner)[0], 'settings');
  assert.equal(canOpenSettings(['user.manage']), true);
  assert.deepEqual(accessibleTabs({ ...owner, user: { ...owner.user, role_code: 'PLATFORM_ADMIN' }, permissions: ['store.read','user.manage'] }), ['platform_stores']);
  assert.equal(canOpenSettings(['pos.sell']), false);
  const cashier = { ...owner, user: { ...owner.user, role_code: 'CASHIER' }, permissions: ['shift.read', 'shift.open', 'shift.close'] };
  assert.ok(accessibleTabs(cashier).includes('shifts'), 'CASHIER with API permissions can open Ca làm');
});

test('PB13-BR55 editing branch details omits unchanged initialCash', async () => {
  const payloads = [];
  const screen = mount({ patchBranch: async (_id, body) => { payloads.push(body); return { id: 'branch', ...body }; } }, owner, 1);
  await screen.flush();
  await screen.rowAction('Sửa');
  assert.equal(screen.editor().initialCashLocked, true);
  await screen.submit({ name: 'Tên mới', address: '', phone: '', initialCash: '0' });
  assert.equal(Object.hasOwn(payloads[0], 'initialCash'), false);
  await screen.rowAction('Sửa');
  await screen.submit({ name: 'Tên mới', address: '', phone: '', initialCash: '1' });
  assert.equal(payloads[1].initialCash, 1);
  await screen.unmount();
});

test('PB13-FORM money/capacity boundaries preserve zero/null and reject coercion', () => {
  const values = { code: 'Aa', name: 'QA', initialCash: '0', address: '', phone: '' };
  assert.deepEqual(validateOrganizationForm('branches', values), {});
  assert.deepEqual(validateOrganizationForm('branches', { ...values, initialCash: '1000000000000' }), {});
  for (const raw of ['-1','1.2','1,2','1.000','','1e3','1000000000001']) assert.ok(validateOrganizationForm('branches', { ...values, initialCash: raw }).initialCash);
  for (const capacity of ['', '1', '2147483647']) assert.deepEqual(validateOrganizationForm('tables', { name: 'QA', area: '', capacity }, true), {});
  for (const capacity of ['0','-1','2.5','2147483648']) assert.ok(validateOrganizationForm('tables', { name: 'QA', capacity }, true).capacity);
  assert.ok(validateOrganizationForm('tables', { name: 'QA', capacity: '', requireBranch: 'true', branchId: '' }).branchId);
});

test('PB13-RACE old tab success/failure cannot overwrite new rows/cursor/error', async () => {
  for (const reject of [false, true]) {
    const old = deferred(), queries = [];
    const screen = mount({ getBranches: () => old.promise, getTables: async query => { queries.push(query); return page([{ id: 'table', name: 'Table' }], 'TABLE_NEXT', 21); } });
    await screen.flush(); await screen.click('Bàn');
    if (reject) old.reject(new Error('OLD_ERROR')); else old.resolve(page([{ id: 'old' }], 'BRANCH_NEXT'));
    await screen.flush(); assert.equal(screen.data()[0].id, 'table'); assert.ok(!screen.text().includes('OLD_ERROR'));
    await screen.click('Trang sau'); assert.equal(queries.at(-1).cursor, 'TABLE_NEXT');
    await screen.unmount();
  }
});

test('PB13-RACE clicking the active tab while loading must not strand the request', async () => {
  const pending = deferred();
  const screen = mount({ getBranches: () => pending.promise });
  await screen.flush(); await screen.click('Chi nhánh');
  pending.resolve(page([{ id: 'branch', name: 'QA', initialCash: 0 }])); await screen.flush();
  assert.equal(screen.data()?.[0].id, 'branch');
  assert.ok(!screen.find('div', props => props['aria-label'] === 'Đang tải danh sách'));
});

test('PB13-RACE branch/status/role/page changes bind cursors to current query', async () => {
  const oldBranch = deferred(), queries = [];
  const screen = mount({ getStaff: async query => {
    queries.push(query);
    if (query.branchId === 'A1') return oldBranch.promise;
    return page([{ id: query.branchId ?? 'all', username: 'QA' }], 'CURRENT_NEXT', 40);
  } });
  await screen.flush(); await screen.click('Tài khoản'); await screen.click('Trang sau');
  assert.equal(queries.at(-1).cursor, 'CURRENT_NEXT');
  await screen.select('Chi nhánh', 'A1'); assert.equal(queries.at(-1).cursor, undefined);
  await screen.select('Chi nhánh', 'A2'); oldBranch.resolve(page([{ id: 'old-A1' }], 'OLD_NEXT')); await screen.flush();
  assert.equal(screen.data()[0].id, 'A2');
  await screen.select('Trạng thái', 'false'); assert.equal(queries.at(-1).isActive, false); assert.equal(queries.at(-1).cursor, undefined);
  await screen.select('Vai trò', 'CASHIER'); assert.equal(queries.at(-1).role, 'CASHIER');
  await screen.click('Trang sau'); assert.equal(queries.at(-1).cursor, 'CURRENT_NEXT');
});

test('PB13-RACE tab changes never render old staff rows using branch columns', async () => {
  const screen = mount(); await screen.flush();
  await screen.click('Tài khoản'); assert.equal(screen.data()[0].id, 'staff');
  await screen.click('Chi nhánh'); assert.equal(screen.data()[0].id, 'branch');
});

test('PB13-SCOPE MANAGER table creation omits branchId and has no staff/branch tabs', async () => {
  let input;
  const session = { user: { ...owner.user, id: 'manager', role_code: 'MANAGER', branch_id: 'A1' }, permissions: ['branch.read','table.manage'] };
  const screen = mount({ createTable: async body => { input = body; return {}; } }, session);
  await screen.flush(); assert.ok(!screen.find('Button', props => props.role === 'tab' && props.children.includes('Tài khoản')));
  await screen.click('Thêm bàn'); await screen.submit({ name: 'QA', area: '', capacity: '' });
  assert.deepEqual(Object.keys(input).sort(), ['area','capacity','name']); assert.equal(input.capacity, null);
});

test('PB13-SECRET issued password survives list refresh failure and requires saved acknowledgement', async () => {
  let reads = 0;
  const screen = mount({ getStaff: async () => { if (++reads > 1) throw new Error('QA reload failed'); return page([]); },
    createStaff: async () => ({ user: { username: 'qa' }, temporaryPassword: 'QA_FIXTURE_ONLY' }) });
  await screen.flush(); await screen.click('Tài khoản'); await screen.click('Cấp tài khoản');
  await screen.submit({ branchId: 'A1', username: 'qa', fullName: 'QA', role: 'CASHIER' });
  assert.ok(screen.find('Dialog', props => props.title === 'Mật khẩu tạm' && props.isOpen && props.disableClose));
  assert.ok(!screen.find('OrganizationEditor')); assert.ok(screen.text().includes('QA reload failed'));
  const ack = screen.find('input', props => props.type === 'checkbox'); ack.props.onChange({ target: { checked: true } }); await screen.flush();
  await screen.click('Đóng'); assert.ok(!screen.find('Dialog', props => props.title === 'Mật khẩu tạm' && props.isOpen));
  assert.ok(!JSON.stringify(screen.toasts).includes('QA_FIXTURE_ONLY'));
});

test('PB13-MUTATION duplicate submissions are blocked, errors retain editor and map fields', async () => {
  const pending = deferred(); let writes = 0;
  const screen = mount({ createBranch: () => { writes++; return pending.promise; } });
  await screen.flush(); await screen.click('Thêm chi nhánh');
  const input = { code: 'Aa', name: 'QA', address: '', phone: '', initialCash: '0' };
  await screen.submit(input); await screen.submit(input); assert.equal(writes, 1);
  pending.reject(new AuthError('VALIDATION_ERROR','QA invalid', { status: 422, details: [{ location: 'body', field: 'name', message: 'Tên không hợp lệ.' }] }));
  await screen.flush(); assert.ok(screen.editor()); assert.equal(screen.editor().serverErrors.name, 'Tên không hợp lệ.');
});

test('PB13-RACE unmounted mutation cannot show a password or update next session', async () => {
  const pending = deferred();
  const screen = mount({ createStaff: () => pending.promise });
  await screen.flush(); await screen.click('Tài khoản'); await screen.click('Cấp tài khoản');
  await screen.submit({ username: 'qa', fullName: 'QA', branchId: 'A1', role: 'CASHIER' });
  await screen.unmount(); pending.resolve({ user: { username: 'qa' }, temporaryPassword: 'QA_NOT_LOGGED' });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(screen.toasts.length, 0); assert.equal(screen.lateWrites(), 0);
});

test('PB13-IDENTITY settings key includes current tenant/branch/permissions', async () => {
  const screen = mount(); await screen.flush(); const initial = screen.key();
  const other = mount({}, { ...owner, user: { ...owner.user, store_id: 'B' } }); await other.flush();
  assert.notEqual(other.key(), initial);
  const changed = mount({}, { ...owner, permissions: ['user.manage'] }); await changed.flush();
  assert.notEqual(changed.key(), initial);
});

test('PB13-ERROR conflict/missing-target/role-unavailable retain editor; only404 reloads list', async t => {
  for (const status of [409, 404, 503]) {
    const failure = new AuthError(status === 503 ? 'SERVICE_UNAVAILABLE' : status === 404 ? 'NOT_FOUND' : 'CONFLICT', 'QA failure ' + status, { status });
    const screen = mount(status === 503 ? { patchStaff: async () => { throw failure; } } : { patchBranch: async () => { throw failure; } });
    await screen.flush();
    if (status === 503) { await screen.click('Tài khoản'); await screen.rowAction('Đổi vai trò'); }
    else await screen.rowAction('Sửa');
    const resource = status === 503 ? 'staff' : 'branches';
    const beforeReads = screen.calls.filter(call => call[0] === resource).length;
    await screen.submit(status === 503 ? { role: 'MANAGER' } : { name: 'QA', address: '', phone: '', initialCash: '0' });
    assert.ok(screen.editor(), 'failed mutation retains editor');
    assert.ok(screen.text().includes('QA failure ' + status));
    assert.equal(screen.calls.filter(call => call[0] === resource).length, beforeReads + (status === 404 ? 1 : 0));
    t.diagnostic(JSON.stringify({ status, editorRetained: true, reload: status === 404 }));
    await screen.unmount();
  }
});

test('PB13-SECRET self-reset does not reload revoked session before password acknowledgement', async () => {
  let reads = 0;
  const manager = { user: { ...owner.user, id: 'manager', role_code: 'MANAGER', branch_id: 'A1' }, permissions: ['branch.read','user.manage'] };
  const screen = mount({ getStaff: async () => { reads++; return page([{ id: 'manager', username: 'manager', fullName: 'QA', branchId: 'A1', role: 'MANAGER', isActive: true }]); },
    resetStaffPassword: async () => ({ user: { id: 'manager', username: 'manager' }, temporaryPassword: 'QA_SELF_FIXTURE' }) }, manager);
  await screen.flush(); await screen.rowAction('Đặt lại mật khẩu'); await screen.click('Xác nhận');
  assert.equal(reads, 1);
  assert.ok(screen.find('Dialog', props => props.title === 'Mật khẩu tạm' && props.isOpen));
  assert.equal(screen.sessionEvents.length, 0);
  screen.find('input', props => props.type === 'checkbox').props.onChange({ target: { checked: true } }); await screen.flush();
  await screen.click('Đóng'); assert.deepEqual(screen.sessionEvents, ['revoked']);
});
