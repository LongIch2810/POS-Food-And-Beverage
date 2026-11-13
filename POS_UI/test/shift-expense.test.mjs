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
      'ForceCloseShiftModal', 'Drawer', 'AddExpenseModal'].includes(name)) return name === 'Field'
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

const identity = { identity: 'cashier', epoch: 1 };
const session = { user: { id: 'cashier', branch_id: 'branch' }, permissions: ['shift.read', 'shift.expense'] };
const shift = { id: 's1', userId: 'cashier', status: 'OPEN', shiftType: 'CASHIER' };
const deps = service => ({
  '/AuthContext': { useAuth: () => ({ session }) },
  '/ToastContext': { useToast: () => ({ showToast() {} }) },
  '/session-events': { getRequestIdentity: () => ({ ...identity }) },
  '/shiftService': { shiftService: service },
});

test('ST-7 validates and submits expense with current own cashier shift', async () => {
  const posts = [];
  const screen = mount('shifts/AddExpenseModal.tsx', 'AddExpenseModal', { isOpen: true, shiftId: 's1', onClose() {}, onSuccess() {} },
    deps({ getCurrentShift: async () => shift, addExpense: async (...args) => posts.push(args) }));
  await screen.flush();
  const change = async (id, value) => { screen.find('Field', p => p.id === id).props.onChange({ target: { value } }); await screen.flush(); };
  await change('expense-amount', '1.5');
  await screen.find('form').props.onSubmit({ preventDefault() {} }); await screen.flush();
  assert.equal(posts.length, 0);
  assert.ok(screen.find('Field', p => p.id === 'expense-amount').props.error);
  await change('expense-amount', '20000');
  screen.find('input', p => p.id === 'expense-reason').props.onChange({ target: { value: 'Đá' } }); await screen.flush();
  await screen.find('form').props.onSubmit({ preventDefault() {} }); await screen.flush();
  assert.deepEqual(posts[0], ['s1', 20000, 'Đá', true]);
});

test('ST-7 hides stale drawer data while reload is pending or fails', async () => {
  let calls = 0, rejectReload;
  const pending = new Promise((_, reject) => { rejectReload = reject; });
  const data = { data: [], meta: { nextCursor: null } };
  const screen = mount('shifts/ShiftDetailDrawer.tsx', 'ShiftDetailDrawer', { isOpen: true, shiftId: 's1', onClose() {} }, {
    ...deps({ getShiftDetail: async () => shift, getExpenses: () => ++calls === 2 ? pending : Promise.resolve(data) }),
    '/formatters': { formatVND: String, formatDateTimeVN: String },
  });
  await screen.flush();
  await screen.click('Ghi khoản chi');
  screen.find('AddExpenseModal').props.onSuccess();
  await screen.flush();
  assert.equal(screen.find('Button', p => screen.text(p.children).includes('Ghi khoản chi')), undefined);
  rejectReload(new Error('Lỗi tải')); await screen.flush();
  assert.equal(screen.find('Button', p => screen.text(p.children).includes('Ghi khoản chi')), undefined);
  await screen.click('Tải lại');
  assert.ok(screen.find('Button', p => screen.text(p.children).includes('Ghi khoản chi')));
});

test('ST-7 does not post when identity changes during current shift check', async () => {
  let resolve; const pending = new Promise(r => { resolve = r; }); let posts = 0;
  const screen = mount('shifts/AddExpenseModal.tsx', 'AddExpenseModal', { isOpen: true, shiftId: 's1', onClose() {}, onSuccess() {} },
    deps({ getCurrentShift: () => pending, addExpense: async () => { posts++; } }));
  await screen.flush();
  screen.find('Field', p => p.id === 'expense-amount').props.onChange({ target: { value: '1' } });
  screen.find('input', p => p.id === 'expense-reason').props.onChange({ target: { value: 'Đá' } }); await screen.flush();
  const submission = screen.find('form').props.onSubmit({ preventDefault() {} });
  identity.epoch++; resolve(shift); await submission; await screen.flush();
  assert.equal(posts, 0);
});

test('ST-7 blocks duplicate submit and requires reload after an uncertain response', async () => {
  let rejectPost, posts = 0, reads = 0;
  const pending = new Promise((_, reject) => { rejectPost = reject; });
  const screen = mount('shifts/AddExpenseModal.tsx', 'AddExpenseModal', { isOpen: true, shiftId: 's1', onClose() {}, onSuccess() {} },
    deps({ getCurrentShift: async () => { reads++; return shift; }, getExpenses: async () => ({}),
      addExpense: () => { posts++; return pending; } }));
  await screen.flush();
  screen.find('Field', p => p.id === 'expense-amount').props.onChange({ target: { value: '1' } });
  screen.find('input', p => p.id === 'expense-reason').props.onChange({ target: { value: 'Đá' } }); await screen.flush();
  const first = screen.find('form').props.onSubmit({ preventDefault() {} });
  await Promise.resolve();
  await screen.find('form').props.onSubmit({ preventDefault() {} });
  assert.equal(posts, 1);
  rejectPost(Object.assign(new Error('Chưa xác nhận'), { code: 'NETWORK_ERROR' }));
  await first; await screen.flush();
  await screen.find('form').props.onSubmit({ preventDefault() {} });
  assert.equal(posts, 1);
  await screen.click('Tải lại ca và danh sách');
  assert.equal(reads, 2);
});

test('[R1-1] HTTP 500 after expense POST blocks another POST until both reads finish', async () => {
  let posts = 0, reads = 0, lists = 0, successes = 0, toasts = 0;
  const screen = mount('shifts/AddExpenseModal.tsx', 'AddExpenseModal', { isOpen: true, shiftId: 's1', onClose() {}, onSuccess() { successes++; } }, {
    ...deps({ getCurrentShift: async () => { reads++; return shift; }, getExpenses: async () => { lists++; },
      addExpense: async () => { posts++; throw Object.assign(new Error('Lỗi máy chủ'), { code: 'INTERNAL_ERROR', status: 500 }); } }),
    '/ToastContext': { useToast: () => ({ showToast() { toasts++; } }) },
  });
  await screen.flush();
  screen.find('Field', p => p.id === 'expense-amount').props.onChange({ target: { value: '1' } });
  screen.find('input', p => p.id === 'expense-reason').props.onChange({ target: { value: 'Đá' } }); await screen.flush();
  const submit = async () => { await screen.find('form').props.onSubmit({ preventDefault() {} }); await screen.flush(); };
  await submit(); await submit();
  assert.equal(posts, 1, 'a second POST must be blocked after HTTP 500');
  assert.equal(successes, 0); assert.equal(toasts, 0);
  assert.equal(screen.find('Button', p => screen.text(p.children).includes('Lưu khoản chi')).props.disabled, true);
  await screen.click('Tải lại ca và danh sách');
  assert.equal(reads, 2); assert.equal(lists, 1);
  await submit(); assert.equal(posts, 2);
});

test('[R1-2] Escape only closes the active expense dialog, and cannot close it while busy', async () => {
  let drawerClosed = 0;
  const screen = mount('shifts/ShiftDetailDrawer.tsx', 'ShiftDetailDrawer', { isOpen: true, shiftId: 's1', onClose() { drawerClosed++; } }, {
    ...deps({ getShiftDetail: async () => shift, getExpenses: async () => ({ data: [], meta: { nextCursor: null } }) }),
    '/formatters': { formatVND: String, formatDateTimeVN: String },
  });
  await screen.flush(); await screen.click('Ghi khoản chi');
  const drawerProps = screen.find('Drawer').props;
  const code = ts.transpileModule(readFileSync(new URL('../src/components/ui/Drawer.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const effects = [], handlers = [];
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), useEffect: fn => effects.push(fn), useRef: value => ({ current: value }), useId: () => 'dialog-title' };
  const exports = {};
  const context = { exports, document: { activeElement: null }, setTimeout: () => 1, clearTimeout() {}, window: { addEventListener: (_, fn) => handlers.push(fn), removeEventListener() {} }, require: name => name === 'react' ? React : { X: 'X' } };
  vm.runInNewContext(code, context);
  exports.Drawer(drawerProps); const cleanups = effects.map(fn => fn());
  let resolvePost;
  const pending = new Promise(resolve => { resolvePost = resolve; });
  const modal = mount('shifts/AddExpenseModal.tsx', 'AddExpenseModal', screen.find('AddExpenseModal').props,
    deps({ getCurrentShift: async () => shift, addExpense: () => pending }));
  await modal.flush();
  modal.find('Field', p => p.id === 'expense-amount').props.onChange({ target: { value: '1' } });
  modal.find('input', p => p.id === 'expense-reason').props.onChange({ target: { value: 'Đá' } }); await modal.flush();
  const submission = modal.find('form').props.onSubmit({ preventDefault() {} }); await modal.flush();
  const dialogCode = ts.transpileModule(readFileSync(new URL('../src/components/ui/Dialog.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  vm.runInNewContext(dialogCode, context);
  effects.length = 0; exports.Dialog(modal.find('Dialog').props); const dialogCleanups = effects.map(fn => fn());
  for (const handler of handlers) handler({ key: 'Escape', preventDefault() {} });
  assert.equal(drawerClosed, 0, 'drawer must not close while the expense dialog is active');
  assert.ok(screen.find('AddExpenseModal'));
  assert.equal(modal.find('Dialog').props.disableClose, true);
  dialogCleanups.forEach(fn => fn?.());
  resolvePost(); await submission; await screen.flush();
  cleanups.forEach(fn => fn?.());
  assert.equal(screen.find('AddExpenseModal'), undefined);
  assert.equal(drawerClosed, 0);
});

test('ST-7 rejects invalid amounts and reasons and accepts both money boundaries', async () => {
  const posts = [];
  const screen = mount('shifts/AddExpenseModal.tsx', 'AddExpenseModal', { isOpen: true, shiftId: 's1', onClose() {}, onSuccess() {} },
    deps({ getCurrentShift: async () => shift, addExpense: async (...args) => posts.push(args) }));
  await screen.flush();
  const setAmount = value => screen.find('Field', p => p.id === 'expense-amount').props.onChange({ target: { value } });
  const setReason = value => screen.find('input', p => p.id === 'expense-reason').props.onChange({ target: { value } });
  const submit = async () => { await screen.flush(); await screen.find('form').props.onSubmit({ preventDefault() {} }); await screen.flush(); };
  setReason('Đá');
  for (const value of ['', '0', '-1', '1.5', '10000000000000', 'abc']) { setAmount(value); await submit(); }
  setAmount('1'); setReason(' '); await submit();
  setReason('x'.repeat(256)); await submit();
  assert.equal(posts.length, 0);
  setReason('Đá'); await submit();
  setAmount('1000000000000'); await submit();
  assert.deepEqual(posts.map(row => row[1]), [1, 1000000000000]);
});

test('ST-7 shows expense sources and pages from the server', async () => {
  const calls = [];
  const screen = mount('shifts/ShiftDetailDrawer.tsx', 'ShiftDetailDrawer', { isOpen: true, shiftId: 's1', onClose() {} }, {
    ...deps({ getShiftDetail: async () => shift, getExpenses: async (_, query) => {
      calls.push(query.cursor);
      return { data: [{ id: 'e', reason: 'Đá', amount: 20, paidFromDrawer: !query.cursor, createdAt: 'now' }],
        meta: { nextCursor: query.cursor ? null : 'next' } };
    } }),
    '/formatters': { formatVND: String, formatDateTimeVN: String },
  });
  await screen.flush();
  assert.match(screen.text(screen.root()), /Lấy từ két/);
  await screen.click('Trang sau');
  assert.match(screen.text(screen.root()), /Ngoài két/);
  assert.deepEqual(calls, [undefined, 'next']);
});

test('ST-7 ignores a late response after switching shifts', async () => {
  let resolveA;
  const pendingA = new Promise(resolve => { resolveA = resolve; });
  const props = { isOpen: true, shiftId: 'a', onClose() {} };
  const expenses = reason => ({ data: [{ id: reason, reason, amount: 1, paidFromDrawer: true, createdAt: 'now' }], meta: { nextCursor: null } });
  const screen = mount('shifts/ShiftDetailDrawer.tsx', 'ShiftDetailDrawer', props, {
    ...deps({ getShiftDetail: async id => ({ ...shift, id, status: id === 'b' ? 'CLOSED' : 'OPEN' }), getExpenses: id => id === 'a' ? pendingA : Promise.resolve(expenses('B')) }),
    '/formatters': { formatVND: String, formatDateTimeVN: String },
  });
  await screen.flush();
  props.shiftId = 'b'; screen.rerender(); await screen.flush();
  assert.match(screen.text(screen.root()), /B/);
  assert.match(screen.text(screen.root()), /Đã đóng/);
  assert.equal(screen.find('Button', p => screen.text(p.children).includes('Ghi khoản chi')), undefined);
  resolveA(expenses('A')); await screen.flush();
  assert.match(screen.text(screen.root()), /B/);
  assert.doesNotMatch(screen.text(screen.root()), /A/);
});

test('ST-7 reloads closed shift and displays the server request ID', async () => {
  let reads = 0, expenses = 0;
  const screen = mount('shifts/AddExpenseModal.tsx', 'AddExpenseModal', { isOpen: true, shiftId: 's1', onClose() {}, onSuccess() {} },
    deps({ getCurrentShift: async () => { reads++; return shift; }, getExpenses: async () => { expenses++; },
      addExpense: async () => { throw Object.assign(new Error('Ca đã đóng'), { code: 'SHIFT_CLOSED', requestId: 'req-123' }); } }));
  await screen.flush();
  screen.find('Field', p => p.id === 'expense-amount').props.onChange({ target: { value: '1' } });
  screen.find('input', p => p.id === 'expense-reason').props.onChange({ target: { value: 'Đá' } }); await screen.flush();
  await screen.find('form').props.onSubmit({ preventDefault() {} }); await screen.flush();
  assert.match(screen.text(screen.root()), /req-123/);
  assert.equal(reads, 2);
  assert.equal(expenses, 1);
});


test('ST-8 normal close shows server expense after close', async () => {
  const closed = { ...shift, status: 'CLOSED', reconciliation: { openingCash: 100000, cashSalesAmount: 95000, expenseAmount: 20000, expectedCash: 175000, countedCash: 175000, difference: 0, status: 'MATCHED' } };
  const screen = mount('shifts/BlindCountCloseShiftModal.tsx', 'BlindCountCloseShiftModal', { isOpen: true, shift, onClose() {}, onSuccess() {} }, { ...deps({ closeShiftBlind: async () => closed }), '/formatters': { formatVND: String } });
  await screen.flush(); assert.doesNotMatch(screen.text(screen.root()), /175000/);
  await screen.click('Xác nhận đóng ca');
  assert.match(screen.text(screen.root()), /95000/); assert.match(screen.text(screen.root()), /20000/); assert.match(screen.text(screen.root()), /175000/);
  assert.ok(screen.find('dl'), 'cash amounts are grouped with their labels');
  for (const value of ['95000', '20000']) {
    const amount = screen.find('dd', p => screen.text(p.children) === value);
    assert.equal(amount?.props.style.textAlign, 'right');
    assert.equal(amount?.props.style.fontVariantNumeric, 'tabular-nums');
  }
  const difference = screen.find('dd', p => screen.text(p.children) === '0');
  assert.equal(difference?.props.style.fontSize, 40);
  assert.equal(difference?.props.style.lineHeight, '48px');
  assert.ok(screen.find('Badge', p => screen.text(p.children) === 'Khớp' && p.variant === 'success'));
});
test('ST-8 force close retains server result until finished', async () => {
  let finished = 0;
  const closed = { ...shift, status: 'CLOSED', reconciliation: { openingCash: 100000, cashSalesAmount: 95000, expenseAmount: 20000, expectedCash: 175000, countedCash: 175000, difference: 0, status: 'MATCHED' } };
  const screen = mount('shifts/ForceCloseShiftModal.tsx', 'ForceCloseShiftModal', { isOpen: true, shift, onClose() {}, onSuccess() { finished++; } }, { ...deps({ forceCloseShift: async () => closed }), '/formatters': { formatVND: String, formatDateTimeVN: String } });
  await screen.flush(); screen.find('input', p => p.type === 'number').props.onChange({ target: { value: '175000' } }); screen.find('textarea').props.onChange({ target: { value: 'Lý do' } }); await screen.flush();
  await screen.click('Xác nhận đóng cưỡng chế'); assert.equal(finished, 0); assert.match(screen.text(screen.root()), /20000/); assert.match(screen.text(screen.root()), /175000/);
  const summary = screen.find('dl');
  assert.ok(summary, 'cash amounts are grouped with their labels');
  const amount = screen.find('dd', p => screen.text(p.children) === '20000');
  assert.equal(amount?.props.style.textAlign, 'right');
  assert.equal(amount?.props.style.fontVariantNumeric, 'tabular-nums');
  const difference = screen.find('dd', p => screen.text(p.children) === '0');
  assert.equal(difference?.props.style.fontSize, 40);
  assert.equal(difference?.props.style.lineHeight, '48px');
  await screen.click('Hoàn tất'); assert.equal(finished, 1);
});
test('ST-8 closed shift detail shows server reconciliation', async () => {
  const screen = mount('shifts/ShiftDetailDrawer.tsx', 'ShiftDetailDrawer', { isOpen: true, shiftId: 's1', onClose() {} }, { ...deps({ getShiftDetail: async () => ({ ...shift, status: 'CLOSED', reconciliation: { openingCash: 100000, cashSalesAmount: 95000, expenseAmount: 20000, expectedCash: 175000, countedCash: 175000, difference: 0, status: 'MATCHED' } }), getExpenses: async () => ({ data: [], meta: { nextCursor: null } }) }), '/formatters': { formatVND: String, formatDateTimeVN: String } });
  await screen.flush(); assert.match(screen.text(screen.root()), /20000/); assert.match(screen.text(screen.root()), /175000/);
  assert.ok(screen.find('dl'), 'cash amounts are grouped with their labels');
  const amount = screen.find('dd', p => screen.text(p.children) === '20000');
  assert.equal(amount?.props.style.textAlign, 'right');
  assert.equal(amount?.props.style.fontVariantNumeric, 'tabular-nums');
  const difference = screen.find('dd', p => screen.text(p.children) === '0');
  assert.equal(difference?.props.style.fontSize, 40);
  assert.equal(difference?.props.style.lineHeight, '48px');
  assert.ok(screen.find('Badge', p => screen.text(p.children) === 'Khớp' && p.variant === 'success'));
});

test('ST-8 pending close blocks duplicate and ignores late result after identity change', async () => {
  let resolve, posts = 0, toasts = 0, completed = 0;
  const pending = new Promise(r => { resolve = r; });
  const screen = mount('shifts/BlindCountCloseShiftModal.tsx', 'BlindCountCloseShiftModal', { isOpen: true, shift, onClose() {}, onSuccess() { completed++; } }, {
    ...deps({ closeShiftBlind: () => { posts++; return pending; } }),
    '/ToastContext': { useToast: () => ({ showToast() { toasts++; } }) }, '/formatters': { formatVND: String },
  });
  await screen.flush();
  const button = screen.find('Button', p => screen.text(p.children).includes('Xác nhận đóng ca'));
  const first = button.props.onClick(); await button.props.onClick(); assert.equal(posts, 1);
  identity.epoch++; resolve({ ...shift, status: 'CLOSED', reconciliation: { expectedCash: 175000 } }); await first; await screen.flush();
  assert.equal(toasts, 0); assert.equal(completed, 0); assert.doesNotMatch(screen.text(screen.root()), /175000/);
});

test('ST-8 uncertain force close blocks retry and reloads via GET', async () => {
  let posts = 0, reads = 0;
  const screen = mount('shifts/ForceCloseShiftModal.tsx', 'ForceCloseShiftModal', { isOpen: true, shift, onClose() {}, onSuccess() {} }, {
    ...deps({ forceCloseShift: async () => { posts++; throw Object.assign(new Error('Mất kết nối'), { code: 'NETWORK_ERROR' }); },
      getShiftDetail: async () => { reads++; return shift; } }), '/formatters': { formatVND: String, formatDateTimeVN: String },
  });
  await screen.flush(); screen.find('input', p => p.type === 'number').props.onChange({ target: { value: '0' } });
  screen.find('textarea').props.onChange({ target: { value: 'Lý do' } }); await screen.flush();
  const submit = screen.find('Button', p => screen.text(p.children).includes('Xác nhận đóng cưỡng chế'));
  await submit.props.onClick(); await screen.flush();
  await screen.find('Button', p => screen.text(p.children).includes('Xác nhận đóng cưỡng chế')).props.onClick(); assert.equal(posts, 1);
  await screen.click('Tải lại ca'); assert.equal(reads, 1); assert.equal(posts, 1);
});

test('ST-8 denomination count rejects fractional input', async () => {
  let posts = 0;
  const screen = mount('shifts/BlindCountCloseShiftModal.tsx', 'BlindCountCloseShiftModal', { isOpen: true, shift, onClose() {}, onSuccess() {} }, {
    ...deps({ closeShiftBlind: async () => { posts++; } }), '/formatters': { formatVND: String },
  });
  await screen.flush();
  screen.find('input', p => p['aria-label'] === 'Số tờ 500000').props.onChange({ target: { value: '1.5' } });
  await screen.flush(); await screen.click('Xác nhận đóng ca'); assert.equal(posts, 0);
});
