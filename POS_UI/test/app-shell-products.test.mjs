import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), useState: value => [typeof value === 'function' ? value() : value, () => {}], useEffect: () => {} };
function load(path, mocks, append = '') { const source = readFileSync(new URL(path, import.meta.url), 'utf8') + append; const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText; const exports = {}; vm.runInNewContext(js, { exports, window: { innerWidth: 1024 }, require: mocks }); return exports; }
function find(node, p) { if (Array.isArray(node)) return node.map(x => find(x, p)).find(Boolean); if (!node || typeof node !== 'object') return; return p(node) ? node : find(node.props?.children, p); }

// navigation THẬT: quyền tab Thực đơn đi qua cùng một hàm ở rail và App (M-41).
const realNav = load('../src/app/navigation.ts', () => ({}));
const sess = (role, permissions) => ({ user: { id: 'u', store_id: 's', branch_id: 'b', role_code: role }, permissions, branch_name: 'Chi nhánh B' });
const cashier = sess('CASHIER', ['menu.read', 'shift.read', 'shift.open', 'shift.close', 'pos.sell', 'invoice.cancel_open', 'invoice.read', 'table.read', 'shift.expense', 'report.view_shift']);
const manager = sess('MANAGER', ['branch.read', 'table.manage', 'menu.read', 'menu.manage', 'shift.read', 'invoice.read', 'table.read', 'pos.sell', 'report.view_branch']);

const shellFor = s => load('../src/components/common/AppShell.tsx', name => name === 'react' ? react : name.endsWith('AuthContext') ? { useAuth: () => ({ session: s, logout() {} }) } : name.endsWith('mockEngine') ? { MockEngine: { getAccessibleBranches: () => [], getEffectiveBranchId: () => '' } } : name.endsWith('navigation') ? realNav : {}).AppShell;
const realRoutes = load('../src/app/routes.ts', name => name.endsWith('navigation.ts') ? realNav : {});
const appRoutes = { ...realRoutes, resolveRoute: () => ({ path: '/thuc-don/mon', tab: 'products', sub: 'products' }) };
const appFor = s => load('../src/app/App.tsx', name => name === 'react' ? react : name === 'react-router-dom' ? { useLocation: () => ({ pathname: '/thuc-don/mon', state: { owner: s.user.id } }), useNavigate: () => () => {}, Navigate: 'Navigate', BrowserRouter: 'BrowserRouter' } : name.endsWith('AuthContext') ? { useAuth: () => ({ session: s }) } : name.endsWith('routes') ? appRoutes : name.endsWith('navigation') ? realNav : { ProductsScreen: 'ProductsScreen' }, '\nexport { AuthenticatedRouter };').AuthenticatedRouter({ error: '' });
const railHas = (s, label) => !!find(shellFor(s)({ currentTab: 'pos', onSelectTab() {}, children: null }), x => x.type === 'span' && x.props.children?.includes?.(label));

test('test_ST5_AC8_rail_va_app_dung_canOpenProducts', () => {
  assert.equal(railHas(cashier, 'Thực đơn'), false, 'CASHIER không có mục rail Thực đơn');
  assert.equal(railHas(manager, 'Thực đơn'), true, 'MANAGER có mục rail Thực đơn');

  const denied = appFor(cashier);
  assert.equal(find(denied, x => x.type === 'ProductsScreen'), undefined, 'CASHIER không render ProductsScreen');
  assert.ok(find(denied, x => x.props?.message === 'Yêu cầu quyền quản lý thực đơn (menu.manage hoặc product.manage).'), 'CASHIER thấy AccessDenied đúng thông báo');

  const allowed = appFor(manager);
  assert.ok(find(allowed, x => x.type === 'ProductsScreen'), 'MANAGER render ProductsScreen');
});

test('[B-63] rail dùng cùng quyền với route cho người chỉ được đọc đơn hoặc đọc bàn', () => {
  for (const [permission, label, expected] of [
    ['invoice.read', 'Hóa đơn', true], ['invoice.read', 'Bán hàng', true],
    ['table.read', 'Sơ đồ bàn', true], ['table.manage', 'Sơ đồ bàn', false],
    ['pos.sell', 'Hóa đơn', false], ['invoice.cancel_open', 'Hóa đơn', true],
  ]) {
    assert.equal(railHas(sess('MANAGER', [permission]), label), expected, `${permission}: ${label}`);
  }
  assert.equal(railHas(sess('PLATFORM_ADMIN', ['invoice.read', 'pos.sell', 'table.read']), 'Hóa đơn'), false);
});
