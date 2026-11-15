import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { toUiSession } from '../src/auth/session.ts';

const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), useState: value => [typeof value === 'function' ? value() : value, () => {}], useEffect: () => {} };
function load(path, mocks) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, window: { innerWidth: 1024 }, require: mocks });
  return exports;
}
const navigation = load('../src/app/navigation.ts', () => ({}));
const navMock = navigation;
function find(node, p) {
  if (Array.isArray(node)) return node.map(x => find(x, p)).find(Boolean);
  if (!node || typeof node !== 'object') return;
  return p(node) ? node : find(node.props?.children, p);
}
const text = node => [node.props.children].flat().join('');
const spanWithText = (tree, value) => find(tree, x => x.type === 'span' && text(x) === value);

function shell(user, permissions, branchName, currentTab) {
  const session = { user: { id: 'u', store_id: 's', ...user }, permissions, ...(branchName === undefined ? {} : { branch_name: branchName }) };
  const { AppShell } = load('../src/components/common/AppShell.tsx', name => name === 'react' ? react
    : name.endsWith('AuthContext') ? { useAuth: () => ({ session, logout() {} }) }
      : name.endsWith('mockEngine') ? { MockEngine: { getAccessibleBranches: () => [{ id: 'demo', name: 'Chi nhánh Nam Lý' }], getEffectiveBranchId: () => 'demo' } }
        : name.endsWith('navigation') ? navMock : {});
  return AppShell({ currentTab, onSelectTab() {}, children: null });
}
const manager = { role_code: 'MANAGER', branch_id: 'b1' };
const cashier = { role_code: 'CASHIER', branch_id: 'b1' };

test('test_ST3_AC1_toUiSession_branch_name', () => {
  const base = { id: 'u', username: 'x', fullName: 'X', role: 'MANAGER', storeId: 's', branchId: 'b1', permissions: [], mustChangePassword: false };
  assert.equal(toUiSession({ ...base, branchName: 'Chi nhánh Bắc' }).branch_name, 'Chi nhánh Bắc');
  assert.equal(toUiSession({ ...base, branchName: null }).branch_name, undefined);
  assert.equal(toUiSession(base).branch_name, undefined);
});

test('test_ST3_AC2_manager_title_ten_chi_nhanh', () => {
  const tree = shell(manager, ['inventory.view'], 'Chi nhánh Bắc', 'inventory');
  assert.ok(spanWithText(tree, 'Chi nhánh Bắc'));
  assert.equal(spanWithText(tree, 'Tất cả chi nhánh'), undefined);
});

test('test_ST3_AC3_manager_thieu_ten_hien_Chi_nhanh', () => {
  const tree = shell(manager, ['inventory.view'], undefined, 'inventory');
  assert.ok(spanWithText(tree, 'Chi nhánh'));
  assert.equal(spanWithText(tree, 'Tất cả chi nhánh'), undefined);
});

test('test_ST3_AC4_owner_tat_ca_chi_nhanh', () => {
  const tree = shell({ role_code: 'OWNER', branch_id: null }, ['branch.access_all', 'invoice.read'], undefined, 'invoices');
  assert.ok(spanWithText(tree, 'Tất cả chi nhánh'));
});

test('test_ST3_AC5_cashier_title', () => {
  const tree = shell(cashier, ['shift.read'], 'Chi nhánh Bắc', 'shifts');
  assert.ok(spanWithText(tree, 'Chi nhánh Bắc'));
});
