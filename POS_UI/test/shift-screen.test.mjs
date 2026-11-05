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
      'OrderPanel', 'PaymentDialog', 'OpenShiftGate', 'BlindCountCloseShiftModal',
      'ForceCloseShiftModal'].includes(name)) return name === 'Field'
      ? { SelectField: 'SelectField' } : { [name]: name };
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
  return { flush, find, text, root: () => tree,
    async click(label) {
      const button = find('Button', nodeProps => text(nodeProps.children).includes(label));
      assert.ok(button, `button exists: ${label}`);
      assert.ok(!button.props.disabled, `button enabled: ${label}`);
      await button.props.onClick(); await flush();
    },
  };
}

const owner = { user: { id: 'owner', branch_id: null }, permissions: ['branch.access_all', 'shift.read', 'shift.open'] };

test('BR-71 OWNER selects a real branch before opening a cashier shift', async () => {
  const opens = [];
  const screen = mount('shifts/OpenShiftGate.tsx', 'OpenShiftGate',
    { branchId: '', branchName: 'Chọn chi nhánh', onShiftOpened() {} }, {
      '/AuthContext': { useAuth: () => ({ session: owner }) },
      '/ToastContext': { useToast: () => ({ showToast() {} }) },
      '/organizationService': { organizationService: { getBranchChoices: async () => [
        { id: branchId, name: 'Chi nhánh thật', isActive: true },
      ] } },
      '/shiftService': { shiftService: {
        getOpeningCashInfo: async () => ({ amount: 100, sourceText: 'Tiền đầu ca' }),
        openShift: async input => { opens.push(input); return { id: 'shift' }; },
      } },
      '/formatters': { formatVND: String },
    });
  await screen.flush();
  assert.equal(screen.find('Button', props => screen.text(props.children).includes('Xác nhận mở ca')).props.disabled, true);
  screen.find('SelectField', props => props.label === 'Chi nhánh mở ca').props.onChange({ target: { value: branchId } });
  await screen.flush();
  await screen.click('Xác nhận mở ca thu ngân');
  assert.equal(opens[0].branchId, branchId);
});

test('BR-16 POS gate uses session branch and reloads the current API shift after opening', async () => {
  let current = null;
  const session = { user: { id: 'cashier', branch_id: branchId }, permissions: ['shift.read'] };
  const screen = mount('pos/PosScreen.tsx', 'PosScreen', {}, {
    '/AuthContext': { useAuth: () => ({ session, isOffline: false }) },
    '/ToastContext': { useToast: () => ({ showToast() {} }) },
    '/shiftService': { shiftService: { getCurrentShift: async () => current } },
    '/mockEngine': { MockEngine: { getCurrentUser: () => ({ store_id: 'demo-store' }), getEffectiveBranchId: () => 'branch-nl' } },
    '/mockStorage': { mockStorage: { subscribe: () => () => {}, getState: () => ({ invoices: [], tables: [] }) } },
    '/posService': { posService: { getMenuData: () => ({ categories: [], products: [], productSizes: [], toppings: [], categoryToppings: [] }), getTablesWithStatus: () => [] } },
    '/formatters': { formatVND: String },
  });
  await screen.flush();
  const gate = screen.find('OpenShiftGate');
  assert.equal(gate.props.branchId, branchId);
  current = { id: 'real-shift', status: 'OPEN', shiftType: 'CASHIER', startedAt: new Date().toISOString() };
  gate.props.onShiftOpened();
  await screen.flush();
  assert.equal(screen.find('OpenShiftGate'), undefined);
});

test('BR-71 OWNER check-in STAFF sends selected branch', async () => {
  const opens = [];
  const screen = mount('shifts/ShiftsScreen.tsx', 'ShiftsScreen', {}, {
    '/AuthContext': { useAuth: () => ({ session: { ...owner, user: { ...owner.user, full_name: 'Owner' } } }) },
    '/ToastContext': { useToast: () => ({ showToast() {} }) },
    '/organizationService': { organizationService: { getBranchChoices: async () => [{ id: branchId, name: 'Chi nhánh thật', isActive: true }] } },
    '/shiftService': { shiftService: {
      getCurrentShift: async () => null, getShifts: async () => ({ data: [], meta: { total: 0 } }),
      checkInStaffShift: async id => { opens.push(id); },
    } },
    '/formatters': { formatVND: String, formatDateTimeVN: String, formatDuration: String },
  });
  await screen.flush();
  screen.find('SelectField', props => props.label === 'Chi nhánh check-in').props.onChange({ target: { value: branchId } });
  await screen.flush();
  await screen.click('Check-in ca nhân viên');
  assert.deepEqual(opens, [branchId]);
});

test('BR-58 result remains visible until cashier finishes the reconciliation dialog', async () => {
  let refreshed = 0, closed = 0;
  const shift = { id: 'shift', shiftType: 'CASHIER', status: 'OPEN', reconciliation: { openingCash: 0 } };
  const screen = mount('shifts/BlindCountCloseShiftModal.tsx', 'BlindCountCloseShiftModal', {
    isOpen: true, shift, onSuccess: () => refreshed++, onClose: () => closed++,
  }, {
    '/ToastContext': { useToast: () => ({ showToast() {} }) },
    '/shiftService': { shiftService: { closeShiftBlind: async () => ({ ...shift, status: 'CLOSED', reconciliation: { openingCash: 0, countedCash: 0, difference: 0, status: 'MATCHED' } }) } },
    '/formatters': { formatVND: String },
  });
  await screen.flush();
  await screen.find('Button', props => props.size === 'lg' && props.isLoading !== undefined).props.onClick();
  await screen.flush();
  assert.equal(screen.find('Dialog').props.title, 'Kết quả đối soát ca thu ngân');
  assert.equal(refreshed, 0);
  await screen.click('Hoàn tất & Đóng');
  assert.equal(closed, 1);
  assert.equal(refreshed, 1);
});
