import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, mocks, append = '') { const source = readFileSync(new URL(path, import.meta.url), 'utf8') + append; const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText; const exports = {}; vm.runInNewContext(js, { exports, window: { innerWidth: 1024 }, require: mocks }); return exports; }
function find(node, p) { if (Array.isArray(node)) return node.map(x => find(x, p)).find(Boolean); if (!node || typeof node !== 'object') return; return p(node) ? node : find(node.props?.children, p); }
// Đường chỉ số từ gốc tới phần tử khớp: để chứng minh "cùng vị trí trong cây" (không remount).
function pathTo(node, p, trail = []) { if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) { const r = pathTo(node[i], p, [...trail, i]); if (r) return r; } return; } if (!node || typeof node !== 'object') return; return p(node) ? trail : pathTo(node.props?.children, p, trail); }

// React giả có state qua các lần render và gom effect để chạy sau mỗi lần render (deps bị bỏ qua: effect của router tự kiểm điều kiện).
function makeRuntime() {
  const slots = []; let index = 0; let effects = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => { const k = index++; if (!(k in slots)) slots[k] = typeof initial === 'function' ? initial() : initial; return [slots[k], next => { slots[k] = typeof next === 'function' ? next(slots[k]) : next; }]; },
    useEffect: fn => { effects.push(fn); },
    useRef: initial => { const k = index++; if (!(k in slots)) slots[k] = { current: initial }; return slots[k]; },
  };
  return { React, render(component, props) { index = 0; effects = []; const tree = component(props); effects.forEach(fn => fn()); return tree; } };
}

const realNav = load('../src/app/navigation.ts', () => ({}));
const realRoutes = load('../src/app/routes.ts', name => name.endsWith('navigation.ts') ? realNav : {});
const sess = (id, role, permissions) => ({ user: { id, store_id: role === 'PLATFORM_ADMIN' ? null : 's', branch_id: role === 'OWNER' || role === 'PLATFORM_ADMIN' ? null : 'b', role_code: role, must_change_password: false }, permissions, branch_name: null });
const owner = sess('owner-1', 'OWNER', ['branch.read', 'branch.manage', 'branch.access_all', 'table.manage', 'user.manage', 'menu.read', 'menu.manage', 'shift.read', 'shift.open', 'shift.close', 'shift.force_close', 'pos.sell', 'invoice.cancel_open', 'invoice.read', 'table.read', 'inventory.view', 'inventory.manage', 'promotion.manage', 'store_bank_account.manage', 'transfer.confirm_manual', 'transfer.exception_read', 'shift.expense', 'invoice.cancel_paid', 'invoice.read_branch', 'report.view_all']);
const cashier = sess('cashier-1', 'CASHIER', ['menu.read', 'shift.read', 'shift.open', 'shift.close', 'pos.sell', 'invoice.cancel_open', 'invoice.read', 'table.read', 'shift.expense', 'report.view_shift']);
const admin = sess('admin-1', 'PLATFORM_ADMIN', ['store.read', 'store.create', 'store.suspend', 'user.read_owner', 'user.create_owner', 'user.reset_owner_password']);

const SCREENS = { AppShell: 'AppShell', LoginScreen: 'LoginScreen', ForcePasswordModal: 'ForcePasswordModal', AuthProvider: 'AuthProvider', ToastProvider: 'ToastProvider', LivePosScreen: 'LivePosScreen', InvoicesScreen: 'InvoicesScreen', ShiftsScreen: 'ShiftsScreen', ProductsScreen: 'ProductsScreen', InventoryScreen: 'InventoryScreen', DailyReportScreen: 'DailyReportScreen', SettingsScreen: 'SettingsScreen', PlatformAdminScreen: 'PlatformAdminScreen' };

// Dựng App với router giả: location đọc từ `env.location`, mọi navigate được ghi vào `env.calls`.
function setup(session, location, auth = {}) {
  const runtime = makeRuntime();
  const env = { location, calls: [] };
  const navigate = (path, options) => { env.calls.push(JSON.parse(JSON.stringify([path, options]))); };  // qua JSON: đối tượng từ vm khác prototype với deepStrictEqual
  const mocks = name => name === 'react' ? runtime.React
    : name === 'react-router-dom' ? { useLocation: () => env.location, useNavigate: () => navigate, Navigate: 'Navigate', BrowserRouter: 'BrowserRouter' }
    : name.endsWith('AuthContext') ? { AuthProvider: 'AuthProvider', useAuth: () => ({ session, isAuthenticated: true, loading: false, error: '', ...auth }) }
    : name.endsWith('navigation') ? realNav
    : name.endsWith('routes') ? realRoutes
    : SCREENS;
  const { AuthenticatedRouter, MainRouter } = load('../src/app/App.tsx', mocks, '\nexport { AuthenticatedRouter, MainRouter };');
  return { env, AuthenticatedRouter, MainRouter, render: () => runtime.render(AuthenticatedRouter, { error: '' }), renderMain: () => runtime.render(MainRouter, {}) };
}
const at = (pathname, ownerId) => ({ pathname, state: ownerId === undefined ? null : { owner: ownerId } });
const byType = type => x => x.type === type;

test('test_ST8_AC1_owner_so_kho_khong_dieu_huong', () => {
  const app = setup(owner, at('/kho/so-kho', 'owner-1'));
  const tree = app.render();
  assert.equal(find(tree, byType('InventoryScreen')).props.tab, 'movements');
  assert.equal(find(tree, byType('AppShell')).props.currentTab, 'inventory');
  assert.deepEqual(app.env.calls, []);
});

test('test_ST8_AC2_cashier_link_kho_thay_the', () => {
  const app = setup(cashier, at('/kho/so-kho'));
  const tree = app.render();
  assert.equal(find(tree, byType('InventoryScreen')), undefined);
  assert.equal(find(tree, byType('LivePosScreen')).props.activeTab, 'menu');
  assert.deepEqual(app.env.calls, [['/ban-hang/thuc-don', { replace: true, state: { owner: 'cashier-1' } }]]);
});

test('test_ST8_AC2b_cashier_thuc_don_bi_chan_ve_ban_hang', () => {
  // Quyết định user Q2: CASHIER mở /thuc-don/* bị thay thế tới Bán hàng, không thấy màn quản lý Thực đơn.
  const app = setup(cashier, at('/thuc-don/mon', 'cashier-1'));
  const tree = app.render();
  assert.equal(find(tree, byType('ProductsScreen')), undefined);
  assert.deepEqual(app.env.calls, [['/ban-hang/thuc-don', { replace: true, state: { owner: 'cashier-1' } }]]);
});

test('test_ST8_AC3_state_owner_khac_thay_the_ve_tab_dau', () => {
  const app = setup(owner, at('/kho/so-kho', 'other-user'));
  const tree = app.render();
  assert.equal(find(tree, byType('InventoryScreen')), undefined, 'không giữ màn của người trước');
  assert.equal(find(tree, byType('SettingsScreen')).props.tab, 'branches');
  assert.deepEqual(app.env.calls, [['/cai-dat/chi-nhanh', { replace: true, state: { owner: 'owner-1' } }]]);
});

test('test_ST8_AC4_dong_dau_va_dia_chi_goc', () => {
  const stamped = setup(owner, at('/kho/so-kho'));
  assert.equal(find(stamped.render(), byType('InventoryScreen')).props.tab, 'movements');
  assert.deepEqual(stamped.env.calls, [['/kho/so-kho', { replace: true, state: { owner: 'owner-1' } }]]);

  const bare = setup(owner, at('/kho', 'owner-1'));
  assert.equal(find(bare.render(), byType('InventoryScreen')).props.tab, 'stocks');
  assert.deepEqual(bare.env.calls, [['/kho/ton-kho', { replace: true, state: { owner: 'owner-1' } }]]);
});

test('test_ST8_AC5_thao_tac_day_lich_su', () => {
  const state = { state: { owner: 'owner-1' } };
  const act = (session, pathname, pick, ...args) => { const app = setup(session, at(pathname, session.user.id)); pick(app.render()).props[args[0]](args[1]); return app.env.calls; };
  assert.deepEqual(act(owner, '/kho/so-kho', t => find(t, byType('AppShell')), 'onSelectTab', 'reports'), [['/bao-cao', state]]);
  assert.deepEqual(act(owner, '/kho/so-kho', t => find(t, byType('AppShell')), 'onSelectTab', 'inventory'), [['/kho/ton-kho', state]]);
  assert.deepEqual(act(owner, '/bao-cao', t => find(t, byType('AppShell')), 'onSelectTab', 'reports'), [], 'đúng địa chỉ hiện tại thì không thêm mục lịch sử');
  assert.deepEqual(act(owner, '/kho/so-kho', t => find(t, byType('InventoryScreen')), 'onTabChange', 'catalog'), [['/kho/nguyen-lieu', state]]);
  assert.deepEqual(act(owner, '/ban-hang/thuc-don', t => find(t, byType('LivePosScreen')), 'onTabChange', 'tables'), [['/so-do-ban', state]]);
  assert.deepEqual(act(owner, '/ban-hang/thuc-don', t => find(t, byType('LivePosScreen')), 'onTabChange', 'orders'), [['/ban-hang/don-dang-mo', state]]);
  assert.deepEqual(act(owner, '/thuc-don/mon', t => find(t, byType('ProductsScreen')), 'onTabChange', 'sizes'), [['/thuc-don/kich-co', state]]);
  assert.deepEqual(act(owner, '/cai-dat/chi-nhanh', t => find(t, byType('SettingsScreen')), 'onTabChange', 'promotions'), [['/cai-dat/khuyen-mai', state]]);
  assert.deepEqual(act(admin, '/cua-hang', t => find(t, byType('PlatformAdminScreen')), 'onTabChange', 'owners'), [['/chu-quan', { state: { owner: 'admin-1' } }]]);
  assert.deepEqual(act(admin, '/chu-quan', t => find(t, byType('PlatformAdminScreen')), 'onTabChange', 'stores'), [['/cua-hang', { state: { owner: 'admin-1' } }]]);
});

test('test_ST8_AC6_mo_hoa_don_tu_ca', () => {
  const app = setup(owner, at('/ca-lam', 'owner-1'));
  find(app.render(), byType('ShiftsScreen')).props.onNavigateToInvoice('inv-1');
  assert.deepEqual(app.env.calls, [['/ban-hang/thuc-don', { state: { owner: 'owner-1' } }]]);
  app.env.location = at('/ban-hang/thuc-don', 'owner-1');
  assert.equal(find(app.render(), byType('LivePosScreen')).props.initialInvoiceId, 'inv-1');
});

test('test_ST8_AC7_livepos_khong_remount', () => {
  const app = setup(owner, at('/ban-hang/thuc-don', 'owner-1'));
  const isPos = byType('LivePosScreen');
  const first = app.render();
  app.env.location = at('/so-do-ban', 'owner-1');
  const second = app.render();
  assert.equal(find(second, isPos).props.activeTab, 'tables');
  assert.equal(find(first, isPos).props.key, find(second, isPos).props.key);
  assert.ok(find(first, isPos).props.key, 'key không rỗng');
  assert.deepEqual(pathTo(first, isPos), pathTo(second, isPos));
});

test('test_ST8_AC8_main_router_dang_nhap', () => {
  const loading = setup(owner, at('/kho/so-kho'), { loading: true, isAuthenticated: false }).renderMain();
  assert.equal(loading.type, 'div');
  assert.equal(loading.props.role, 'status');
  assert.deepEqual([loading.props.children].flat(), ['Đang kiểm tra phiên đăng nhập...']);

  const out = setup(owner, at('/kho/so-kho'), { isAuthenticated: false }).renderMain();
  assert.equal(out.type, 'Navigate');
  assert.equal(out.props.to, '/dang-nhap');
  assert.equal(out.props.replace, true);

  assert.equal(setup(owner, at('/dang-nhap'), { isAuthenticated: false }).renderMain().type, 'LoginScreen');

  const inn = setup(owner, at('/kho/so-kho', 'owner-1')).renderMain();
  assert.equal(inn.type.name, 'AuthenticatedRouter');
  assert.equal(inn.props.key, 'owner-1');

  const forced = setup({ ...owner, user: { ...owner.user, must_change_password: true } }, at('/kho/so-kho', 'owner-1'));
  assert.equal(forced.renderMain().type, 'ForcePasswordModal');
  assert.deepEqual(forced.env.calls, []);
});

test('test_ST8_AC9_dependency_ghim', () => {
  const root = new URL('../', import.meta.url);
  const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  assert.equal(pkg.dependencies['react-router-dom'], '7.18.5');
  const lock = JSON.parse(readFileSync(new URL('package-lock.json', root), 'utf8'));
  assert.equal(lock.packages['node_modules/react-router-dom'].version, '7.18.5');
  const importers = [];
  const walk = dir => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const p = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir); if (entry.isDirectory()) walk(p); else if (/\.tsx?$/.test(entry.name) && readFileSync(p, 'utf8').includes('react-router-dom')) importers.push(entry.name); } };
  walk(new URL('src/', root));
  assert.deepEqual(importers, ['App.tsx']);
});
