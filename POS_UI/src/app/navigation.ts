import type { AuthSession } from '../types/auth';
import type { NavTab } from '../components/common/AppShell';

export const canOpenSettings = (permissions: readonly string[]) =>
  ['branch.manage', 'table.manage', 'user.manage', 'promotion.manage'].some(permission => permissions.includes(permission));

// Nguồn duy nhất cho tab Thực đơn (route, rail và App). CASHIER chỉ có menu.read nên không mở màn quản lý.
export const canOpenProducts = (permissions: readonly string[]) =>
  ['menu.manage', 'product.manage'].some(permission => permissions.includes(permission));

export type ReportScope = 'all' | 'branch' | 'shift';

// Mức báo cáo rộng nhất được cấp; nguồn duy nhất cho tab, nav và màn Báo cáo. PLATFORM_ADMIN không đọc dữ liệu vận hành. Server vẫn kiểm lại.
export function reportScope(session: AuthSession): ReportScope | null {
  const has = (permission: string) => session.permissions.includes(permission as typeof session.permissions[number]);
  if (session.user.role_code === 'PLATFORM_ADMIN') return null;
  if (has('report.view_all')) return has('branch.access_all') ? 'all' : null; // server không hạ mức: thiếu access_all thì 403
  if (has('report.view_branch')) return 'branch';
  if (has('report.view_shift')) return 'shift';
  return null;
}

export function accessibleTabs(session: AuthSession): NavTab[] {
  const has = (permission: string) => session.permissions.includes(permission as typeof session.permissions[number]);
  if (session.user.role_code === 'PLATFORM_ADMIN') {
    return [...(has('store.read') ? ['platform_stores' as const] : []), ...(has('user.read_owner') ? ['platform_owners' as const] : [])];
  }
  const tabs: NavTab[] = [];
  if (session.user.role_code === 'OWNER' && canOpenSettings(session.permissions)) tabs.push('settings');
  if (has('pos.sell') || has('invoice.read')) tabs.push('pos');
  if (has('pos.sell') || has('table.read')) tabs.push('tables');
  if (has('invoice.read') || has('invoice.cancel_open')) tabs.push('invoices');
  if (has('shift.read') || has('shift.open') || has('shift.close') || has('shift.force_close')) tabs.push('shifts');
  if (canOpenProducts(session.permissions)) tabs.push('products');
  if (has('inventory.view')) tabs.push('inventory');
  if (reportScope(session)) tabs.push('reports');
  if (canOpenSettings(session.permissions) && !tabs.includes('settings')) tabs.unshift('settings');
  return tabs;
}
