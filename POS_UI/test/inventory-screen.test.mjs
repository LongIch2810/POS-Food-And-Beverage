import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/features/inventory/InventoryScreen.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
const owner = { user: { id: 'o1', store_id: 'S', branch_id: null, role_code: 'OWNER', must_change_password: false },
  permissions: ['branch.access_all', 'inventory.manage'] };
const manager = { user: { id: 'm1', store_id: 'S', branch_id: 'b1', role_code: 'MANAGER', must_change_password: false },
  permissions: ['inventory.manage'] };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const stock = (n, branchId = 'b1') => ({ branchId, ingredientId: 'i' + n, ingredientName: 'NL' + n, unit: 'g', currentStock: '5.000', minStock: '1.000' });
const move = (n, extra = {}) => ({ id: 'mv' + n, branchId: 'b1', branchName: 'Chi nhánh Bắc', ingredientId: 'i1', ingredientName: 'NL1', unit: 'ml',
  type: 'IMPORT', quantity: '100.000', balanceAfter: '100.000', invoiceId: null, invoiceCode: null, note: null, createdAt: '2026-11-15T00:00:00Z', ...extra });

function mount(initialProps, { session = owner, stocks = async () => [stock(1)], movements = async () => [move(1)],
  ingredients = async () => [{ id: 'g1', name: 'Đường', unit: 'g', isActive: true }], getBranchChoices = async () => [] } = {}) {
  const calls = { stocks: [], movements: [], ingredients: [], branches: 0 };
  const slots = []; let index = 0, dirty = true, tree, effects = [], props = initialProps;
  const service = {
    stocks: scope => { calls.stocks.push(scope); return stocks(scope); },
    movements: scope => { calls.movements.push(scope); return movements(scope); },
    ingredients: () => { calls.ingredients.push(1); return ingredients(); },
  };
  const React = {
    createElement: (type, p, ...children) => typeof type === 'function' ? type({ ...p, children }) : { type, props: { ...p, children } },
    useState(initial) {
      const key = index++;
      if (!slots[key]) slots[key] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[key].value, update => {
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
  vm.runInNewContext(compiled, { exports, Error, Number, JSON, Array, require: path => {
    if (path === 'react') return React;
    if (path.endsWith('/AuthContext')) return { useAuth: () => ({ session }) };
    if (path.endsWith('/ToastContext')) return { useToast: () => ({ showToast() {} }) };
    if (path.endsWith('/organizationService')) return { organizationService: { getBranchChoices: () => { calls.branches++; return getBranchChoices(); } } };
    if (path.endsWith('/inventoryService')) return { inventoryService: service };
    if (path.endsWith('/formatters')) return { formatDateTimeVN: String };
    if (path === 'lucide-react') return new Proxy({}, { get: (_, key) => String(key) });
    const name = path.split('/').at(-1);
    if (['Button', 'Badge', 'DataTable', 'Dialog', 'Field'].includes(name)) return { [name]: name };
    throw new Error('Unexpected dependency: ' + path);
  } });
  function render() {
    for (let pass = 0; dirty; pass++) {
      assert.ok(pass < 30, 'render settles'); dirty = false; index = 0; effects = [];
      tree = exports.InventoryScreen(props);
      const table = findAll('DataTable')[0];
      if (table) for (const row of table.props.data) for (const column of table.props.columns) column.render(row);
      effects.forEach(effect => effect());
    }
  }
  async function flush() { for (let i = 0; i < 20; i++) { render(); await Promise.resolve(); } render(); }
  function findAll(type, predicate = () => true, node, out = []) {
    if (arguments.length < 3) node = tree;
    if (!node || typeof node !== 'object') return out;
    if (Array.isArray(node)) { node.forEach(child => findAll(type, predicate, child, out)); return out; }
    if (node.type === type && predicate(node.props)) out.push(node);
    findAll(type, predicate, node.props?.children ?? null, out);
    return out;
  }
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' ? node : '';
  const button = label => { const node = findAll('button', p => text(p.children).endsWith(label))[0]; assert.ok(node, 'button exists: ' + label); return node; };
  return { calls, flush, findAll, text, button,
    table: () => findAll('DataTable')[0]?.props,
    alerts: () => findAll('div', p => p.role === 'alert').map(node => text(node)),
    column: header => findAll('DataTable')[0].props.columns.find(column => column.header === header),
    headers: () => findAll('DataTable')[0].props.columns.map(column => column.header),
    select: () => findAll('select', p => p['aria-label'] === 'Chi nhánh kho')[0],
    async click(label) { button(label).props.onClick(); await flush(); },
    async setProps(next) { props = next; dirty = true; await flush(); },
  };
}

test('test_ST6_AC1_mo_man_chi_tai_ton_kho', async () => {
  const h = mount({}); await h.flush();
  assert.deepEqual(h.calls.stocks, [undefined]);
  assert.equal(h.calls.movements.length, 0); assert.equal(h.calls.ingredients.length, 0);
});

test('test_ST6_AC2_chuyen_so_kho_tai_movements', async () => {
  const h = mount({}); await h.flush();
  await h.click('Sổ kho');
  assert.deepEqual(h.calls.movements, [undefined]); assert.equal(h.calls.stocks.length, 1);
});

test('test_ST6_AC3_cot_chi_nhanh_owner_tat_ca', async () => {
  const rows = [move(1, { branchName: 'Chi nhánh Bắc' }), move(2, { branchName: 'Chi nhánh Nam' })];
  const h = mount({ tab: 'movements' }, { movements: async () => rows, getBranchChoices: async () => [{ id: 'b1', name: 'Chi nhánh Bắc' }] });
  await h.flush();
  assert.equal(h.headers()[1], 'Nguyên liệu'); assert.equal(h.headers()[2], 'Chi nhánh');
  assert.deepEqual(rows.map(row => h.column('Chi nhánh').render(row)), ['Chi nhánh Bắc', 'Chi nhánh Nam']);
  h.select().props.onChange({ target: { value: 'b1' } }); await h.flush();
  assert.deepEqual(h.calls.movements, [undefined, 'b1']);
  assert.ok(!h.headers().includes('Chi nhánh'));
});

test('test_ST6_AC4_manager_khong_cot_khong_o_chon', async () => {
  const h = mount({ tab: 'movements' }, { session: manager }); await h.flush();
  assert.equal(h.calls.branches, 0); assert.equal(h.select(), undefined);
  assert.ok(!h.headers().includes('Chi nhánh')); assert.deepEqual(h.calls.movements, [undefined]);
});

test('test_ST6_AC5_ghi_chu_ma_hoa_don', async () => {
  const h = mount({ tab: 'movements' }); await h.flush();
  const note = h.column('Ghi chú').render;
  assert.equal(note(move(1, { note: null, invoiceCode: 'HDS10A0001', invoiceId: 'uuid-1' })), 'HDS10A0001');
  assert.equal(note(move(1, { note: 'Nhập đầu kỳ', invoiceCode: null })), 'Nhập đầu kỳ');
  assert.equal(note(move(1, { note: 'Ghi tay', invoiceCode: 'HDS10A0001' })), 'Ghi tay');
  assert.equal(note(move(1, { note: null, invoiceCode: null, invoiceId: null })), '—');
});

test('test_ST6_AC6_dau_cong_so_duong', async () => {
  const h = mount({ tab: 'movements' }); await h.flush();
  const change = h.column('Thay đổi').render;
  assert.equal(change(move(1, { quantity: '100.000', unit: 'ml' })), '+100.000 ml');
  assert.equal(change(move(1, { quantity: '-10.000', unit: 'ml' })), '-10.000 ml');
  assert.equal(change(move(1, { quantity: '0.500', unit: 'g' })), '+0.500 g');
});

test('test_ST6_AC7_loi_tab_doc_lap_va_thu_lai', async () => {
  const h = mount({}, { stocks: async () => [stock(1), stock(2)], movements: async () => { throw new Error('Lỗi máy chủ test'); } });
  await h.flush(); assert.equal(h.table().data.length, 2);
  await h.click('Sổ kho');
  assert.ok(h.alerts()[0].includes('Lỗi máy chủ test')); assert.equal(h.table(), undefined);
  const retry = h.button('Thử lại');
  assert.deepEqual({ ...retry.props.style }, { marginLeft: 'auto' }); assert.equal(retry.props.className, 'btn btn-text');
  await h.click('Tồn kho');
  assert.equal(h.calls.stocks.length, 2); assert.deepEqual(h.alerts(), []); assert.equal(h.table().data.length, 2);
});

test('test_ST6_AC8_o_chon_theo_ten', async () => {
  const names = ['Chi nhánh Nam', 'Chi nhánh Đông', 'Chi nhánh 2', 'Chi nhánh Bắc', 'An Phú', 'Chi nhánh 10', 'Chi nhánh Dương'];
  const h = mount({}, { getBranchChoices: async () => names.map((name, i) => ({ id: 'b' + i, name })) }); await h.flush();
  const options = h.findAll('option', () => true, h.select()).map(node => h.text(node));
  assert.deepEqual(options, ['Tất cả chi nhánh', 'An Phú', 'Chi nhánh 10', 'Chi nhánh 2', 'Chi nhánh Bắc', 'Chi nhánh Dương', 'Chi nhánh Đông', 'Chi nhánh Nam']);
});

test('test_ST6_AC9_loi_chi_nhanh_khong_xoa_bang', async () => {
  const h = mount({}, { getBranchChoices: async () => { throw new Error('Không tải được chi nhánh'); } }); await h.flush();
  assert.ok(h.alerts().some(text => text.includes('Không tải được chi nhánh'))); assert.equal(h.table().data.length, 1);
});

test('test_ST6_AC10_response_cu_khong_ghi_de', async () => {
  const first = deferred(), second = deferred(); let n = 0;
  const h = mount({ tab: 'movements' }, { movements: () => (n++ === 0 ? first : second).promise }); await h.flush();
  h.select().props.onChange({ target: { value: 'b1' } }); await h.flush();
  assert.deepEqual(h.calls.movements, [undefined, 'b1']);
  first.resolve([move(1, { branchName: 'Chi nhánh Nam' })]); await h.flush();
  assert.equal(h.table(), undefined, 'still loading');
  second.resolve([move(2, { branchName: 'Chi nhánh Bắc' })]); await h.flush();
  assert.deepEqual(h.table().data.map(row => row.branchName), ['Chi nhánh Bắc']);
});

test('test_ST6_AC11_tab_dieu_khien_tu_props', async () => {
  const seen = [];
  const h = mount({ tab: 'movements', onTabChange: tab => seen.push(tab) }); await h.flush();
  await h.click('Nguyên liệu'); assert.deepEqual(seen, ['catalog']);
  await h.setProps({ tab: 'catalog', onTabChange: tab => seen.push(tab) });
  assert.equal(h.calls.ingredients.length, 1);
});

test('test_ST6_AC12_tai_lai_chi_tab_dang_mo', async () => {
  const h = mount({ tab: 'movements' }); await h.flush();
  await h.click('Tải lại');
  assert.equal(h.calls.movements.length, 2); assert.equal(h.calls.stocks.length, 0); assert.equal(h.calls.ingredients.length, 0);
});

test('test_ST6_AC13_rong', async () => {
  const h = mount({ tab: 'movements' }, { movements: async () => [] }); await h.flush();
  assert.deepEqual(h.table().data, []); assert.equal(h.table().emptyMessage, 'Chưa có bút toán kho');
});

test('test_ST6_AC10b_chuyen_tab_khong_hien_dong_tab_cu', async () => {
  const pending = deferred();
  const h = mount({}, { movements: () => pending.promise }); await h.flush();
  assert.equal(h.table().data.length, 1);
  await h.click('Sổ kho');
  assert.equal(h.table(), undefined, 'rows của tab cũ không được render khi tab mới đang tải');
});

test('test_ST6_AC10c_response_cu_den_sau_khong_ghi_de', async () => {
  const first = deferred(), second = deferred(); let n = 0;
  const h = mount({ tab: 'movements' }, { movements: () => (n++ === 0 ? first : second).promise }); await h.flush();
  h.select().props.onChange({ target: { value: 'b1' } }); await h.flush();
  second.resolve([move(2, { branchName: 'Chi nhánh Bắc' })]); await h.flush();
  first.resolve([move(1, { branchName: 'Chi nhánh Nam' })]); await h.flush();
  assert.deepEqual(h.table().data.map(row => row.branchName), ['Chi nhánh Bắc']);
});

test('[B-62] đổi chi nhánh trên danh mục giữ dữ liệu và không tải lại nguyên liệu', async () => {
  const pending = deferred(); let loads = 0;
  const h = mount({ tab: 'catalog' }, { ingredients: () => ++loads === 1
    ? Promise.resolve([{ id: 'g1', name: 'Đường', unit: 'g', isActive: true }]) : pending.promise });
  await h.flush();
  assert.equal(h.table().data[0].name, 'Đường');
  h.select().props.onChange({ target: { value: 'b1' } }); await h.flush();
  assert.equal(h.calls.ingredients.length, 1, 'danh mục nguyên liệu không phụ thuộc chi nhánh');
  assert.equal(h.table().data[0].name, 'Đường', 'không thay bảng bằng skeleton');
  await h.setProps({ tab: 'stocks' });
  assert.deepEqual(h.calls.stocks, ['b1'], 'tab tồn kho vẫn dùng chi nhánh đã chọn');
});

for (const [from, to, title] of [
  ['catalog', 'movements', 'Thêm nguyên liệu'],
  ['stocks', 'catalog', 'Đặt ngưỡng tồn'],
]) {
  test(`[B-65] đổi prop tab ${from} sang ${to} đóng dialog ${title}`, async () => {
    const h = mount({ tab: from }); await h.flush();
    if (from === 'catalog') {
      h.findAll('Button', p => h.text(p.children) === 'Thêm nguyên liệu')[0].props.onClick();
    } else {
      h.column('Thao tác').render(h.table().data[0]).props.onClick();
    }
    await h.flush();
    assert.equal(h.findAll('Dialog', p => p.isOpen && p.title === title).length, 1);

    await h.setProps({ tab: to });
    assert.equal(h.findAll('Dialog', p => p.isOpen).length, 0, 'dialog của tab cũ phải đóng');
    assert.equal(h.findAll('button', p => p['aria-current'] === 'true').length, 1);
    assert.equal(h.text(h.findAll('button', p => p['aria-current'] === 'true')[0]), to === 'movements' ? 'Sổ kho' : 'Nguyên liệu');

    await h.setProps({ tab: from });
    assert.equal(h.findAll('Dialog', p => p.isOpen).length, 0, 'quay về tab cũ không mở lại dialog');
  });
}
