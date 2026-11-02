import type { AuthSession } from '../types/auth';
import type { NavTab } from '../components/common/AppShell';

export const canOpenSettings = (permissions: readonly string[]) =>
  ['branch.manage', 'table.manage', 'user.manage'].some(permission => permissions.includes(permission));

export function accessibleTabs(session: AuthSession): NavTab[] {
  const has = (permission: string) => session.permissions.includes(permission as typeof session.permissions[number]);
  if (session.user.role_code === 'PLATFORM_ADMIN') {
    return [...(has('store.read') ? ['platform_stores' as const] : []), ...(has('user.read_owner') ? ['platform_owners' as const] : [])];
  }
  const tabs: NavTab[] = [];
  if (session.user.role_code === 'OWNER' && canOpenSettings(session.permissions)) tabs.push('settings');
  if (has('pos.sell')) tabs.push('pos');
  if (has('pos.sell') || has('table.manage')) tabs.push('tables');
  if (has('pos.sell') || has('invoice.cancel_open') || has('invoice.cancel_paid')) tabs.push('invoices');
  if (has('shift.open_close') || has('shift.force_close')) tabs.push('shifts');
  if (has('menu.read') || has('menu.manage') || has('product.manage')) tabs.push('products');
  if (has('inventory.view')) tabs.push('inventory');
  if (has('report.view_branch') || has('report.view_all')) tabs.push('reports');
  if (canOpenSettings(session.permissions) && !tabs.includes('settings')) tabs.unshift('settings');
  return tabs;
}
