import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/features/products/ProductsScreen.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
} }).outputText;

function mount(props) {
  const slots = [];
  let index = 0, dirty = true, tree, effects = [];
  const React = {
    createElement: (type, nodeProps, ...children) => ({ type, props: { ...nodeProps, children } }),
    useRef(initial) { const key = index++; return (slots[key] ??= { current: initial }); },
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
  const session = { user: { id: 'owner', role_code: 'OWNER' }, permissions: ['inventory.view'] };
  const toast = { showToast() {} };
  const menuService = { getAllCategories: async () => [], getSizes: async () => [], getAllProducts: async () => props.products ?? [],
    getAllToppings: async () => props.toppings ?? [], getCategoryToppings: async () => [] };
  const exports = {};
  vm.runInNewContext(compiled, { exports, Error, require: path => {
    if (path === 'react') return React;
    if (path.endsWith('/AuthContext')) return { useAuth: () => ({ session }) };
    if (path.endsWith('/ToastContext')) return { useToast: () => toast };
    if (path.endsWith('/menuService')) return { menuService };
    if (path.endsWith('/formatters')) return { formatVND: String };
    if (path === 'lucide-react') return new Proxy({}, { get: (_, name) => name });
    const name = path.split('/').at(-1);
    if (['Button', 'IconButton', 'Badge', 'Dialog', 'Field', 'DataTable', 'RecipeModal'].includes(name)) return { [name]: name };
    throw new Error('Unexpected dependency: ' + path);
  } });
  function render() {
    for (let pass = 0; dirty; pass++) {
      assert.ok(pass < 30, 'render settles');
      dirty = false; index = 0; effects = [];
      tree = exports.ProductsScreen(props);
      effects.forEach(effect => effect());
    }
  }
  async function flush() { for (let i = 0; i < 20; i++) { render(); await Promise.resolve(); } render(); }
  const text = node => Array.isArray(node) ? node.map(text).join('')
    : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' ? node : '';
  function find(type, predicate, node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.map(child => find(type, predicate, child)).find(Boolean);
    if (node.type === type && predicate(node.props)) return node;
    return node.props?.children ? find(type, predicate, node.props.children) : undefined;
  }
  return { flush, find: (type, predicate) => find(type, predicate, tree), setProps(next) { props = { ...props, ...next }; dirty = true; },
    button: (label, node = tree) => find('Button', nodeProps => text(nodeProps.children).trim() === label, node),
    tab: label => find('button', nodeProps => text(nodeProps.children).includes(label), tree) };
}

for (const action of ['Thêm size', 'Đổi giá', 'Công thức']) {
  test(`[V1-2/B-66] đổi tab đóng dialog món ${action} và quay lại không mở lại`, async () => {
    const screen = mount({ tab: 'products', products: [{ id: 'p1', name: 'Cà phê', isActive: true,
      sizes: [{ id: 'ps1', sizeId: 's1', sizeName: 'M', price: '29000' }] }] });
    await screen.flush();
    const trigger = action === 'Đổi giá' ? screen.find('IconButton', props => props.label === action) : screen.button(action);
    trigger.props.onClick();
    await screen.flush();
    const open = () => Boolean(screen.find('Dialog', props => props.isOpen) || screen.find('RecipeModal', props => props.isOpen));
    assert.equal(open(), true);
    screen.setProps({ tab: 'sizes' });
    await screen.flush();
    assert.equal(open(), false, 'dialog món của tab cũ phải đóng');
    screen.setProps({ tab: 'products' });
    await screen.flush();
    assert.equal(open(), false, 'Forward không mở lại dialog món');
  });
}

for (const action of ['Gán danh mục', 'Công thức']) {
  test(`[V1-2/B-66] đổi tab đóng dialog topping ${action} và quay lại không mở lại`, async () => {
    const topping = { id: 't1', name: 'Trân châu', price: '5000', isActive: true };
    const screen = mount({ tab: 'toppings', toppings: [topping] });
    await screen.flush();
    const table = screen.find('DataTable', props => props.data?.[0]?.id === 't1');
    const actions = table.props.columns.find(column => column.key === 'actions').render(topping);
    screen.button(action, actions).props.onClick();
    await screen.flush();
    const open = () => Boolean(screen.find('Dialog', props => props.isOpen) || screen.find('RecipeModal', props => props.isOpen));
    assert.equal(open(), true);
    screen.setProps({ tab: 'sizes' });
    await screen.flush();
    assert.equal(open(), false, 'dialog topping của tab cũ phải đóng');
    screen.setProps({ tab: 'toppings' });
    await screen.flush();
    assert.equal(open(), false, 'Forward không mở lại dialog topping');
  });
}

test('test_ST7_AC4_products_tab', async () => {
  const changes = [];
  const controlled = mount({ tab: 'sizes', onTabChange: tab => changes.push(tab) });
  await controlled.flush();
  assert.equal(controlled.tab('Kích cỡ món').props.style.fontWeight, 700);
  for (const other of ['Món & Giá bán', 'Món thêm và áp dụng', 'Danh mục món']) assert.equal(controlled.tab(other).props.style.fontWeight, 500);
  controlled.tab('Danh mục món').props.onClick();
  await controlled.flush();
  assert.deepEqual(changes, ['categories']);

  const own = mount({});
  await own.flush();
  assert.equal(own.tab('Món & Giá bán').props.style.fontWeight, 700);
  own.tab('Món thêm và áp dụng').props.onClick();
  await own.flush();
  assert.equal(own.tab('Món thêm và áp dụng').props.style.fontWeight, 700);
  assert.equal(own.tab('Món & Giá bán').props.style.fontWeight, 500);
});

test('[B-61] tab Thực đơn công bố mục hiện hành cho công nghệ hỗ trợ', async () => {
  for (const [tab, label] of [['products', 'Món & Giá bán'], ['toppings', 'Món thêm và áp dụng'], ['categories', 'Danh mục món'], ['sizes', 'Kích cỡ món']]) {
    const screen = mount({ tab });
    await screen.flush();
    for (const name of ['Món & Giá bán', 'Món thêm và áp dụng', 'Danh mục món', 'Kích cỡ món']) {
      assert.equal(screen.tab(name).props['aria-current'], name === label ? 'true' : undefined, name);
    }
  }
});

for (const [tab, action, title, destination] of [
  ['categories', 'Thêm danh mục', 'Thêm danh mục mới', 'sizes'],
  ['sizes', 'Thêm kích cỡ', 'Thêm kích cỡ mới', 'categories'],
  ['products', 'Thêm món mới', 'Thêm món mới', 'sizes'],
  ['toppings', 'Thêm topping', 'Thêm topping mới', 'categories'],
]) {
  test(`[V1-2/B-66] đổi tab đóng ${title} và quay lại không mở lại`, async () => {
    const screen = mount({ tab });
    await screen.flush();
    screen.button(action).props.onClick();
    await screen.flush();
    const dialog = () => screen.find('Dialog', props => props.title === title);
    assert.equal(dialog().props.isOpen, true);
    screen.setProps({ tab: destination });
    await screen.flush();
    assert.equal(dialog().props.isOpen, false, 'dialog của tab cũ phải đóng');
    screen.setProps({ tab });
    await screen.flush();
    assert.equal(dialog().props.isOpen, false, 'Forward không mở lại dialog cũ');
  });
}
