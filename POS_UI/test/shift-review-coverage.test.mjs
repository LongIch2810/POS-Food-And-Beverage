import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const branchId = '11111111-1111-4111-8111-111111111111';

function mount(file, exportName, props, dependencies) {
  const source = readFileSync(new URL(`../src/features/${file}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  const slots = [];
  let index = 0, dirty = true, tree, effects = [];
  const React = {
    Fragment: 'Fragment',
    createElement: (type, nodeProps, ...children) => ({ type, props: { ...nodeProps, children } }),
    useRef(initial) { const key = index++; if (!slots[key]) slots[key] = { current: initial }; return slots[key]; },
    useState(initial) {
      const key = index++;
      if (!slots[key]) slots[key] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[key].value, update => {
        const next = typeof update === 'function' ? update(slots[key].value) : update;
        if (!Object.is(next, slots[key].value)) { slots[key].value = next; dirty = true; }
      }];
    },
    useEffect(effect, deps) {
      const key = index++, previous = slots[key];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        effects.push(() => { previous?.cleanup?.(); slots[key] = { deps, cleanup: effect() }; });
      }
    },
    useCallback(callback, deps) {
      const key = index++, previous = slots[key];
      if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return previous.value;
      slots[key] = { deps, value: callback };
      return callback;
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, Error, BigInt, window: {
    innerWidth: 1200, addEventListener() {}, removeEventListener() {},
  }, require: path => {
    if (path === 'react') return React;
    if (path === 'lucide-react') return new Proxy({}, { get: (_, name) => name });
    for (const [suffix, value] of Object.entries(dependencies)) if (path.endsWith(suffix)) return value;
    const name = path.split('/').at(-1);
    if (['Button', 'Dialog', 'Field', 'Badge', 'DataTable', 'ProductGrid', 'TableMap',
      'OrderPanel', 'PaymentDialog', 'LivePaymentDialog', 'OpenShiftGate', 'BlindCountCloseShiftModal',
      'ForceCloseShiftModal', 'Drawer', 'AddExpenseModal', 'ShiftDetailDrawer'].includes(name)) return name === 'Field'
      ? { Field: 'Field', SelectField: 'SelectField' } : { [name]: name };
    throw new Error('Unexpected dependency: ' + path);
  } });
  function find(type, predicate = () => true, node) {
    if (arguments.length < 3) node = tree;
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.map(child => find(type, predicate, child)).find(Boolean);
    if (node.type === type && predicate(node.props)) return node;
    return find(type, predicate, node.props?.children) || find(type, predicate, node.props?.footer);
  }
  const text = node => Array.isArray(node) ? node.map(text).join('')
    : node && typeof node === 'object' ? text(node.props?.children)
    : typeof node === 'string' ? node : '';
  function render() {
    for (let pass = 0; dirty; pass++) {
      assert.ok(pass < 30, 'render settles');
      dirty = false; index = 0; effects = [];
      tree = exports[exportName](props);
      effects.forEach(effect => effect());
    }
  }
  async function flush() { for (let i = 0; i < 20; i++) { render(); await Promise.resolve(); } render(); }
  return { flush, find, text, root: () => tree, rerender: () => { dirty = true; },
    async click(label) {
      const button = find('Button', nodeProps => text(nodeProps.children).includes(label));
      assert.ok(button, `button exists: ${label}`);
      assert.ok(!button.props.disabled, `button enabled: ${label}`);
      await button.props.onClick(); await flush();
    },
  };
}

const identity = { epoch: 1 };
const session = { user: { id: 'cashier', branch_id: 'branch', full_name: 'Cashier' }, permissions: ['shift.read', 'shift.expense'] };
const shift = { id: 's1', userId: 'cashier', status: 'OPEN', shiftType: 'CASHIER', startedAt: 'now' };
const empty = { data: [], meta: { nextCursor: null, total: 0 } };
const showToast = () => {};
const deps = service => ({ '/AuthContext': { useAuth: () => ({ session }) }, '/ToastContext': { useToast: () => ({ showToast }) },
  '/session-events': { getRequestIdentity: () => ({ ...identity }) }, '/shiftService': { shiftService: service }, '/organizationService': { organizationService: {} },
  '/formatters': { formatVND: String, formatDateTimeVN: String, formatDuration: String } });
const button = (screen, label) => screen.find('Button', p => screen.text(p.children).includes(label));

test('[R1-4] expense button and submit reject STAFF, another owner, closed and missing permission', async () => {
  for (const scenario of ['STAFF', 'other', 'closed', 'permission']) {
    const candidate = { ...shift, ...(scenario === 'STAFF' ? { shiftType: 'STAFF' } : {}),
      ...(scenario === 'other' ? { userId: 'other' } : {}), ...(scenario === 'closed' ? { status: 'CLOSED' } : {}) };
    session.permissions = scenario === 'permission' ? ['shift.read'] : ['shift.read', 'shift.expense'];
    let posts = 0;
    const service = { getShiftDetail: async () => candidate, getExpenses: async () => empty,
      getCurrentShift: async () => candidate, addExpense: async () => { posts++; } };
    const drawer = mount('shifts/ShiftDetailDrawer.tsx', 'ShiftDetailDrawer', { isOpen: true, shiftId: 's1', onClose() {} }, deps(service));
    await drawer.flush(); assert.equal(button(drawer, 'Ghi khoản chi'), undefined, scenario);
    const modal = mount('shifts/AddExpenseModal.tsx', 'AddExpenseModal', { isOpen: true, shiftId: 's1', onClose() {}, onSuccess() {} }, deps(service));
    await modal.flush();
    modal.find('Field', p => p.id === 'expense-amount').props.onChange({ target: { value: '1' } });
    modal.find('input', p => p.id === 'expense-reason').props.onChange({ target: { value: 'Đá' } }); await modal.flush();
    await modal.find('form').props.onSubmit({ preventDefault() {} }); await modal.flush();
    assert.equal(posts, 0, scenario); assert.match(modal.text(modal.root()), /không còn đủ điều kiện/);
  }
  session.permissions = ['shift.read', 'shift.expense'];
});

test('[R1-4] drawer ignores pending old identity and permission responses', async () => {
  for (const change of ['identity', 'permission']) {
    let resolveOld; const pending = new Promise(resolve => { resolveOld = resolve; }); let reads = 0;
    session.permissions = ['shift.read', 'shift.expense'];
    const screen = mount('shifts/ShiftDetailDrawer.tsx', 'ShiftDetailDrawer', { isOpen: true, shiftId: 's1', onClose() {} },
      deps({ getShiftDetail: async () => shift, getExpenses: () => ++reads === 1 ? pending : Promise.resolve(empty) }));
    await screen.flush();
    if (change === 'identity') identity.epoch++; else session.permissions = [];
    screen.rerender(); await screen.flush();
    resolveOld({ data: [{ id: 'old', reason: 'SECRET_OLD', amount: 1, paidFromDrawer: true }], meta: { nextCursor: null } });
    await screen.flush(); assert.doesNotMatch(screen.text(screen.root()), /SECRET_OLD/, change);
  }
  session.permissions = ['shift.read', 'shift.expense'];
});

test('[R1-5] force close STAFF has no cash input or reconciliation result', async () => {
  const staff = { ...shift, shiftType: 'STAFF' }; let sent;
  const screen = mount('shifts/ForceCloseShiftModal.tsx', 'ForceCloseShiftModal', { isOpen: true, shift: staff, onClose() {}, onSuccess() {} },
    deps({ forceCloseShift: async (...args) => { sent = args; return { ...staff, status: 'CLOSED', reconciliation: null }; } }));
  await screen.flush(); assert.equal(screen.find('input', p => p.type === 'number'), undefined);
  screen.find('textarea').props.onChange({ target: { value: 'Lý do' } }); await screen.flush();
  await screen.click('Xác nhận đóng cưỡng chế');
  assert.equal(sent[0], 's1'); assert.equal(sent[1].reason, 'Lý do');
  assert.match(screen.text(screen.root()), /đã được đóng/); assert.equal(screen.find('dl'), undefined);
});

test('[R1-5] force close validates counted cash and preserves server errors', async () => {
  let calls = 0; let error;
  const screen = mount('shifts/ForceCloseShiftModal.tsx', 'ForceCloseShiftModal', { isOpen: true, shift, onClose() {}, onSuccess() {} },
    deps({ forceCloseShift: async () => { calls++; throw error; } }));
  await screen.flush(); screen.find('textarea').props.onChange({ target: { value: 'Lý do' } });
  for (const value of ['', '-1', '1.5', '1000000000001', 'abc']) {
    screen.find('input', p => p.type === 'number').props.onChange({ target: { value } }); await screen.flush();
    await screen.click('Xác nhận đóng cưỡng chế'); assert.equal(calls, 0, value); assert.equal(screen.find('dl'), undefined);
  }
  screen.find('input', p => p.type === 'number').props.onChange({ target: { value: '1' } }); await screen.flush();
  for (const [code, message] of [['RECONCILIATION_NOTE_REQUIRED', 'Cần ghi chú lệch'], ['SHIFT_HAS_OPEN_INVOICES', 'Còn hóa đơn mở']]) {
    error = Object.assign(new Error(message), { code, requestId: 'req-1', status: 400 });
    await screen.click('Xác nhận đóng cưỡng chế'); assert.match(screen.text(screen.root()), new RegExp(message));
    assert.match(screen.text(screen.root()), /req-1/); assert.equal(screen.find('dl'), undefined);
  }
  assert.equal(calls, 2);
});

test('[R1-5] force HTTP 500 and unreadable response block retry until GET', async () => {
  for (const mode of ['500', 'parse']) {
    let posts = 0, reads = 0;
    const screen = mount('shifts/ForceCloseShiftModal.tsx', 'ForceCloseShiftModal', { isOpen: true, shift, onClose() {}, onSuccess() {} },
      deps({ forceCloseShift: async () => { posts++; if (mode === '500') throw Object.assign(new Error('Lỗi máy chủ'), { status: 500 }); return undefined; },
        getShiftDetail: async () => { reads++; return { ...shift, status: 'CLOSED', reconciliation: { expectedCash: 175000 } }; } }));
    await screen.flush(); screen.find('input', p => p.type === 'number').props.onChange({ target: { value: '0' } });
    screen.find('textarea').props.onChange({ target: { value: 'Lý do' } }); await screen.flush();
    await screen.click('Xác nhận đóng cưỡng chế');
    const submit = button(screen, 'Xác nhận đóng cưỡng chế'); assert.equal(submit.props.disabled, true, mode);
    await submit.props.onClick(); assert.equal(posts, 1); assert.equal(screen.find('dl'), undefined);
    await screen.click('Tải lại ca'); assert.equal(reads, 1); assert.match(screen.text(screen.root()), /175000/);
  }
});

test('[R1-5] force close ignores response after identity change', async () => {
  let resolve, toasts = 0, finished = 0; const pending = new Promise(r => { resolve = r; });
  const screen = mount('shifts/ForceCloseShiftModal.tsx', 'ForceCloseShiftModal', { isOpen: true, shift, onClose() {}, onSuccess() { finished++; } }, {
    ...deps({ forceCloseShift: () => pending }), '/ToastContext': { useToast: () => ({ showToast() { toasts++; } }) },
  });
  await screen.flush(); screen.find('input', p => p.type === 'number').props.onChange({ target: { value: '0' } });
  screen.find('textarea').props.onChange({ target: { value: 'Lý do' } }); await screen.flush();
  const request = button(screen, 'Xác nhận đóng cưỡng chế').props.onClick();
  identity.epoch++; resolve({ ...shift, status: 'CLOSED', reconciliation: { expectedCash: 175000 } });
  await request; await screen.flush(); assert.equal(toasts, 0); assert.equal(finished, 0); assert.doesNotMatch(screen.text(screen.root()), /175000/);
});

test('[R1-4] current and history clear and ignore old responses after identity or permission changes', async () => {
  for (const change of ['identity', 'permission']) {
    session.permissions = ['shift.read', 'shift.expense'];
    let resolveCurrent, resolveHistory; let calls = 0;
    const pendingCurrent = new Promise(r => { resolveCurrent = r; });
    const pendingHistory = new Promise(r => { resolveHistory = r; });
    const service = { getCurrentShift: () => ++calls === 1 ? Promise.resolve({ ...shift, startedAt: 'CURRENT_OLD' }) : pendingCurrent,
      getShifts: () => calls === 1 ? Promise.resolve({ ...empty, data: [{ ...shift, id: 'HISTORY_OLD' }] }) : pendingHistory };
    const screen = mount('shifts/ShiftsScreen.tsx', 'ShiftsScreen', {}, deps(service));
    await screen.flush();
    assert.equal(screen.find('DataTable').props.data[0].id, 'HISTORY_OLD');
    assert.match(screen.text(screen.root()), /CURRENT_OLD/);
    if (change === 'identity') { identity.epoch++; session.user = { ...session.user, id: 'new-user' }; }
    else session.permissions = ['shift.read'];
    screen.rerender(); await screen.flush();
    assert.equal(screen.find('DataTable').props.data.length, 0, change);
    assert.doesNotMatch(screen.text(screen.root()), /CURRENT_OLD/, change);
    resolveCurrent(null); resolveHistory(empty); await screen.flush();
    assert.equal(screen.find('DataTable').props.data.length, 0, change);
  }
  session.user = { ...session.user, id: 'cashier' }; session.permissions = ['shift.read', 'shift.expense'];
});

test('[R1-4] late current and history reads cannot replace new identity results', async () => {
  let resolveCurrent, resolveHistory, calls = 0;
  const oldCurrent = new Promise(r => { resolveCurrent = r; });
  const oldHistory = new Promise(r => { resolveHistory = r; });
  const service = { getCurrentShift: () => ++calls === 1 ? oldCurrent : Promise.resolve({ ...shift, startedAt: 'CURRENT_NEW' }),
    getShifts: () => calls === 1 ? oldHistory : Promise.resolve({ ...empty, data: [{ ...shift, id: 'HISTORY_NEW' }] }) };
  const screen = mount('shifts/ShiftsScreen.tsx', 'ShiftsScreen', {}, deps(service));
  await screen.flush(); identity.epoch++; screen.rerender(); await screen.flush();
  assert.match(screen.text(screen.root()), /CURRENT_NEW/);
  assert.equal(screen.find('DataTable').props.data[0].id, 'HISTORY_NEW');
  resolveCurrent({ ...shift, startedAt: 'CURRENT_OLD' }); resolveHistory({ ...empty, data: [{ ...shift, id: 'HISTORY_OLD' }] });
  await screen.flush(); assert.doesNotMatch(screen.text(screen.root()), /CURRENT_OLD/);
  assert.equal(screen.find('DataTable').props.data[0].id, 'HISTORY_NEW');
});

test('[R2-1] normal close shows note-required and open-invoice errors without reconciliation', async () => {
  let calls = 0;
  const errors = [Object.assign(new Error('Server note'), { code: 'RECONCILIATION_NOTE_REQUIRED' }),
    Object.assign(new Error('Còn hóa đơn mở'), { code: 'SHIFT_HAS_OPEN_INVOICES', requestId: 'req-open' })];
  const screen = mount('shifts/BlindCountCloseShiftModal.tsx', 'BlindCountCloseShiftModal',
    { isOpen: true, shift, onClose() {}, onSuccess() {} }, deps({ closeShiftBlind: async () => { throw errors[calls++]; } }));
  await screen.flush();
  assert.equal(screen.find('dl'), undefined);
  await screen.click('Xác nhận đóng ca');
  assert.match(screen.text(screen.root()), /Bắt buộc phải nhập ghi chú giải trình/);
  assert.equal(screen.find('dl'), undefined);
  screen.find('input', p => p.type === 'text').props.onChange({ target: { value: 'Giải trình' } }); await screen.flush();
  await screen.click('Xác nhận đóng ca');
  assert.match(screen.text(screen.root()), /Còn hóa đơn mở/); assert.match(screen.text(screen.root()), /req-open/);
  assert.equal(screen.find('dl'), undefined); assert.equal(calls, 2);
});

test('[R2-1] normal close 500 and unreadable response require GET and offer exit without another POST', async () => {
  for (const mode of ['500', 'parse']) {
    let posts = 0, reads = 0, closed = 0, refreshed = 0, toasts = 0;
    const screen = mount('shifts/BlindCountCloseShiftModal.tsx', 'BlindCountCloseShiftModal',
      { isOpen: true, shift, onClose() { closed++; }, onSuccess() { refreshed++; } }, {
        ...deps({ closeShiftBlind: async () => { posts++; throw mode === '500'
          ? Object.assign(new Error('Lỗi máy chủ'), { status: 500 })
          : Object.assign(new Error('Chưa đọc được kết quả'), { code: 'UNKNOWN' }); },
        getShiftDetail: async () => { reads++; return reads === 1 ? shift : { ...shift, status: 'CLOSED', reconciliation: {
          openingCash: 100000, cashSalesAmount: 95000, expenseAmount: 20000, expectedCash: 175000,
          countedCash: 175000, difference: 0, status: 'MATCHED' } }; } }),
        '/ToastContext': { useToast: () => ({ showToast() { toasts++; } }) },
      });
    await screen.flush(); assert.equal(screen.find('dl'), undefined);
    await screen.click('Xác nhận đóng ca');
    const submit = button(screen, 'Xác nhận đóng ca'); assert.equal(submit.props.disabled, true, mode);
    await submit.props.onClick(); assert.equal(posts, 1); assert.equal(toasts, 0); assert.equal(screen.find('dl'), undefined);
    await screen.click('Tải lại ca'); assert.equal(reads, 1); assert.match(screen.text(screen.root()), /Ca vẫn mở/);
    assert.equal(screen.find('dl'), undefined); assert.equal(button(screen, 'Xác nhận đóng ca').props.disabled, true);
    await screen.click('Tải lại ca'); assert.equal(reads, 2); assert.equal(posts, 1);
    assert.match(screen.text(screen.root()), /175000/); assert.ok(screen.find('dl'));
    await screen.click('Hoàn tất & Đóng'); assert.equal(closed, 1); assert.equal(refreshed, 1);
  }
});

test('[R2-1] uncertain normal close can exit and refresh without retry', async () => {
  let posts = 0, closed = 0, refreshed = 0;
  const screen = mount('shifts/BlindCountCloseShiftModal.tsx', 'BlindCountCloseShiftModal',
    { isOpen: true, shift, onClose() { closed++; }, onSuccess() { refreshed++; } },
    deps({ closeShiftBlind: async () => { posts++; throw Object.assign(new Error('Không đọc được'), { code: 'UNKNOWN' }); } }));
  await screen.flush(); await screen.click('Xác nhận đóng ca'); await screen.click('Hủy');
  assert.equal(posts, 1); assert.equal(closed, 1); assert.equal(refreshed, 1); assert.equal(screen.find('dl'), undefined);
});

test('[R2-1] unconfirmed normal close and failed reload keep retry blocked and permit exit', async () => {
  for (const response of [undefined, { ...shift, status: 'OPEN', reconciliation: { expectedCash: 175000 } }]) {
    let posts = 0, reads = 0, closed = 0, refreshed = 0;
    const screen = mount('shifts/BlindCountCloseShiftModal.tsx', 'BlindCountCloseShiftModal',
      { isOpen: true, shift, onClose() { closed++; }, onSuccess() { refreshed++; } },
      deps({ closeShiftBlind: async () => { posts++; return response; },
        getShiftDetail: async () => { reads++; throw new Error('Không tải được ca'); } }));
    await screen.flush(); await screen.click('Xác nhận đóng ca');
    assert.match(screen.text(screen.root()), /Chưa xác nhận được kết quả/);
    assert.equal(screen.find('dl'), undefined);
    assert.equal(button(screen, 'Xác nhận đóng ca').props.disabled, true);
    await screen.click('Tải lại ca');
    assert.equal(reads, 1); assert.match(screen.text(screen.root()), /Không tải được ca/);
    assert.equal(screen.find('dl'), undefined);
    const submit = button(screen, 'Xác nhận đóng ca'); assert.equal(submit.props.disabled, true);
    await submit.props.onClick(); assert.equal(posts, 1);
    await screen.click('Hủy'); assert.equal(closed, 1); assert.equal(refreshed, 1);
  }
});
