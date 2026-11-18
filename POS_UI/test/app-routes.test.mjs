import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as routes from '../src/app/routes.ts';
import * as nav from '../src/app/navigation.ts';

const sess = (role, permissions) => ({ user: { id: 'u', store_id: role === 'PLATFORM_ADMIN' ? null : 's', branch_id: role === 'OWNER' || role === 'PLATFORM_ADMIN' ? null : 'b', role_code: role }, permissions });
const owner = sess('OWNER', ['branch.read', 'branch.manage', 'branch.access_all', 'table.manage', 'user.manage', 'menu.read', 'menu.manage', 'shift.read', 'shift.open', 'shift.close', 'shift.force_close', 'pos.sell', 'invoice.cancel_open', 'invoice.read', 'table.read', 'inventory.view', 'inventory.manage', 'promotion.manage', 'store_bank_account.manage', 'transfer.confirm_manual', 'transfer.exception_read', 'shift.expense', 'invoice.read_branch', 'report.view_all']);
const manager = sess('MANAGER', ['branch.read', 'table.manage', 'menu.read', 'menu.manage', 'shift.read', 'shift.open', 'shift.close', 'shift.force_close', 'invoice.read', 'table.read', 'inventory.view', 'inventory.manage', 'promotion.manage', 'pos.sell', 'transfer.confirm_manual', 'transfer.exception_read', 'invoice.cancel_open', 'shift.expense', 'invoice.read_branch', 'report.view_branch']);
const cashier = sess('CASHIER', ['menu.read', 'shift.read', 'shift.open', 'shift.close', 'pos.sell', 'invoice.cancel_open', 'invoice.read', 'table.read', 'shift.expense', 'report.view_shift']);
const admin = sess('PLATFORM_ADMIN', ['store.read', 'store.create', 'store.suspend', 'user.read_owner', 'user.create_owner', 'user.reset_owner_password']);

test('test_ST5_AC1_bang_19_dia_chi', () => {
  assert.deepEqual(routes.ROUTES.map(r => [r.path, r.tab, r.sub]), [
    ['/cua-hang', 'platform_stores', null],
    ['/chu-quan', 'platform_owners', null],
    ['/ban-hang/thuc-don', 'pos', 'menu'],
    ['/ban-hang/don-dang-mo', 'pos', 'orders'],
    ['/so-do-ban', 'tables', 'tables'],
    ['/hoa-don', 'invoices', null],
    ['/ca-lam', 'shifts', null],
    ['/kho/ton-kho', 'inventory', 'stocks'],
    ['/kho/so-kho', 'inventory', 'movements'],
    ['/kho/nguyen-lieu', 'inventory', 'catalog'],
    ['/bao-cao', 'reports', null],
    ['/thuc-don/mon', 'products', 'products'],
    ['/thuc-don/mon-them', 'products', 'toppings'],
    ['/thuc-don/danh-muc', 'products', 'categories'],
    ['/thuc-don/kich-co', 'products', 'sizes'],
    ['/cai-dat/chi-nhanh', 'settings', 'branches'],
    ['/cai-dat/ban', 'settings', 'tables'],
    ['/cai-dat/tai-khoan', 'settings', 'staff'],
    ['/cai-dat/khuyen-mai', 'settings', 'promotions'],
  ]);
  assert.equal(new Set(routes.ROUTES.map(r => r.path)).size, 19);
  assert.equal(routes.LOGIN_PATH, '/dang-nhap');
});

// "=" nghĩa là giữ nguyên path. Cột: OWNER, MANAGER, CASHIER, PLATFORM_ADMIN (bảng "Ma trận route × vai trò" của plan).
const matrix = [
  ['/cua-hang', '/cai-dat/chi-nhanh', '/cai-dat/ban', '/ban-hang/thuc-don', '='],
  ['/chu-quan', '/cai-dat/chi-nhanh', '/cai-dat/ban', '/ban-hang/thuc-don', '='],
  ['/ban-hang/thuc-don', '=', '=', '=', '/cua-hang'],
  ['/ban-hang/don-dang-mo', '=', '=', '=', '/cua-hang'],
  ['/so-do-ban', '=', '=', '=', '/cua-hang'],
  ['/hoa-don', '=', '=', '=', '/cua-hang'],
  ['/ca-lam', '=', '=', '=', '/cua-hang'],
  ['/kho/ton-kho', '=', '=', '/ban-hang/thuc-don', '/cua-hang'],
  ['/kho/so-kho', '=', '=', '/ban-hang/thuc-don', '/cua-hang'],
  ['/kho/nguyen-lieu', '=', '=', '/ban-hang/thuc-don', '/cua-hang'],
  ['/bao-cao', '=', '=', '=', '/cua-hang'],
  ['/thuc-don/mon', '=', '=', '/ban-hang/thuc-don', '/cua-hang'],
  ['/thuc-don/mon-them', '=', '=', '/ban-hang/thuc-don', '/cua-hang'],
  ['/thuc-don/danh-muc', '=', '=', '/ban-hang/thuc-don', '/cua-hang'],
  ['/thuc-don/kich-co', '=', '=', '/ban-hang/thuc-don', '/cua-hang'],
  ['/cai-dat/chi-nhanh', '=', '/cai-dat/ban', '/ban-hang/thuc-don', '/cua-hang'],
  ['/cai-dat/ban', '=', '=', '/ban-hang/thuc-don', '/cua-hang'],
  ['/cai-dat/tai-khoan', '=', '/cai-dat/ban', '/ban-hang/thuc-don', '/cua-hang'],
  ['/cai-dat/khuyen-mai', '=', '=', '/ban-hang/thuc-don', '/cua-hang'],
];

test('test_ST5_AC2_ma_tran_route_vai_tro', () => {
  const roles = [['OWNER', owner], ['MANAGER', manager], ['CASHIER', cashier], ['PLATFORM_ADMIN', admin]];
  assert.equal(matrix.length * roles.length, 76);
  for (const [path, ...wanted] of matrix) {
    roles.forEach(([name, session], i) => {
      assert.equal(routes.resolveRoute(path, session).path, wanted[i] === '=' ? path : wanted[i], `${name} ${path}`);
    });
  }
});

test('test_ST5_AC3_dia_chi_goc_va_mac_dinh', () => {
  const paths = ['/kho', '/ban-hang', '/thuc-don', '/cai-dat', '/', '/dang-nhap'];
  assert.deepEqual(paths.map(p => routes.resolveRoute(p, owner).path), ['/kho/ton-kho', '/ban-hang/thuc-don', '/thuc-don/mon', '/cai-dat/chi-nhanh', '/cai-dat/chi-nhanh', '/cai-dat/chi-nhanh']);
  assert.equal(routes.resolveRoute('/cai-dat', manager).path, '/cai-dat/ban');
  assert.equal(routes.resolveRoute('/cai-dat', sess('MANAGER', ['promotion.manage'])).path, '/cai-dat/khuyen-mai');
});

test('test_ST5_AC4_chuan_hoa_va_dia_chi_la', () => {
  assert.deepEqual(routes.resolveRoute('/kho/so-kho/', owner), { path: '/kho/so-kho', tab: 'inventory', sub: 'movements' });
  for (const p of ['/Kho/So-Kho', '/kho/abc', '/api/v1/health']) assert.equal(routes.resolveRoute(p, owner).path, '/cai-dat/chi-nhanh', p);
});

test('test_ST5_AC5_pathFor', () => {
  assert.equal(routes.pathFor('tables', 'tables', owner), '/so-do-ban');
  assert.equal(routes.pathFor('pos', 'orders', owner), '/ban-hang/don-dang-mo');
  assert.equal(routes.pathFor('inventory', null, owner), '/kho/ton-kho');
  assert.equal(routes.pathFor('reports', null, owner), '/bao-cao');
  assert.equal(routes.pathFor('settings', null, manager), '/cai-dat/ban');
  assert.equal(routes.pathFor('platform_owners', null, admin), '/chu-quan');
});

test('test_ST5_AC5_pathFor_sub_khong_thuoc_tab_ve_mac_dinh', () => {
  assert.equal(routes.pathFor('inventory', 'orders', owner), '/kho/ton-kho');
  assert.equal(routes.pathFor('settings', 'menu', manager), '/cai-dat/ban');
});

test('test_ST5_AC6_khong_tab_khong_vong_lap', () => {
  const none = sess('PLATFORM_ADMIN', []);
  const first = routes.resolveRoute('/cua-hang', none);
  assert.equal(first.path, '/cai-dat/chi-nhanh');
  assert.equal(first.tab, 'settings');
  assert.equal(routes.resolveRoute('/cai-dat/chi-nhanh', none).path, '/cai-dat/chi-nhanh');
});

test('test_ST5_AC7_canOpenProducts_va_accessibleTabs', () => {
  assert.equal(nav.canOpenProducts(['menu.read']), false);
  assert.equal(nav.canOpenProducts(['menu.manage']), true);
  assert.equal(nav.canOpenProducts(['product.manage']), true);
  assert.equal(nav.canOpenProducts([]), false);
  assert.deepEqual(nav.accessibleTabs(cashier), ['pos', 'tables', 'invoices', 'shifts', 'reports']);
  assert.ok(nav.accessibleTabs(manager).includes('products'));
  assert.ok(nav.accessibleTabs(owner).includes('products'));
});
