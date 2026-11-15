import type { NavTab } from '../components/common/AppShell';
import type { AuthSession } from '../types/auth';
import { accessibleTabs } from './navigation.ts';

export type InventoryTab = 'stocks' | 'movements' | 'catalog';
export type PosTab = 'menu' | 'tables' | 'orders';
export type ProductsTab = 'products' | 'toppings' | 'categories' | 'sizes';
export type SettingsTab = 'branches' | 'tables' | 'staff' | 'promotions';
export type SubTab = InventoryTab | PosTab | ProductsTab | SettingsTab;
export interface AppRoute { path: string; tab: NavTab; sub: SubTab | null }

export const LOGIN_PATH = '/dang-nhap';

export const ROUTES: readonly AppRoute[] = [
  { path: '/cua-hang', tab: 'platform_stores', sub: null },
  { path: '/chu-quan', tab: 'platform_owners', sub: null },
  { path: '/ban-hang/thuc-don', tab: 'pos', sub: 'menu' },
  { path: '/ban-hang/don-dang-mo', tab: 'pos', sub: 'orders' },
  { path: '/so-do-ban', tab: 'tables', sub: 'tables' },
  { path: '/hoa-don', tab: 'invoices', sub: null },
  { path: '/ca-lam', tab: 'shifts', sub: null },
  { path: '/kho/ton-kho', tab: 'inventory', sub: 'stocks' },
  { path: '/kho/so-kho', tab: 'inventory', sub: 'movements' },
  { path: '/kho/nguyen-lieu', tab: 'inventory', sub: 'catalog' },
  { path: '/bao-cao', tab: 'reports', sub: null },
  { path: '/thuc-don/mon', tab: 'products', sub: 'products' },
  { path: '/thuc-don/mon-them', tab: 'products', sub: 'toppings' },
  { path: '/thuc-don/danh-muc', tab: 'products', sub: 'categories' },
  { path: '/thuc-don/kich-co', tab: 'products', sub: 'sizes' },
  { path: '/cai-dat/chi-nhanh', tab: 'settings', sub: 'branches' },
  { path: '/cai-dat/ban', tab: 'settings', sub: 'tables' },
  { path: '/cai-dat/tai-khoan', tab: 'settings', sub: 'staff' },
  { path: '/cai-dat/khuyen-mai', tab: 'settings', sub: 'promotions' },
];

// Thứ tự và quyền của tab con Cài đặt (đúng SettingsScreen và navigation.ts).
const SETTINGS_SUBS: readonly [SettingsTab, string][] = [['branches', 'branch.manage'], ['tables', 'table.manage'], ['staff', 'user.manage'], ['promotions', 'promotion.manage']];
const BARE: Record<string, NavTab> = { '/ban-hang': 'pos', '/kho': 'inventory', '/thuc-don': 'products', '/cai-dat': 'settings' };
const FIXED_DEFAULT: Partial<Record<NavTab, SubTab>> = { pos: 'menu', tables: 'tables', inventory: 'stocks', products: 'products' };

function defaultSub(tab: NavTab, session: AuthSession): SubTab | null {
  if (tab === 'settings') return SETTINGS_SUBS.find(([, permission]) => session.permissions.includes(permission as never))?.[0] ?? 'branches';
  return FIXED_DEFAULT[tab] ?? null;
}

export function pathFor(tab: NavTab, sub: SubTab | null, session: AuthSession): string {
  const fallback = defaultSub(tab, session);
  return (ROUTES.find(r => r.tab === tab && r.sub === (sub ?? fallback)) ?? ROUTES.find(r => r.tab === tab && r.sub === fallback))!.path;
}

function allowed(route: AppRoute, session: AuthSession): boolean {
  if (!accessibleTabs(session).includes(route.tab)) return false;
  if (route.tab !== 'settings') return true;
  return session.permissions.includes(SETTINGS_SUBS.find(([sub]) => sub === route.sub)![1] as never);
}

export function resolveRoute(pathname: string, session: AuthSession): AppRoute {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const bare = BARE[path];
  const found = ROUTES.find(r => r.path === path) ?? (bare ? ROUTES.find(r => r.path === pathFor(bare, null, session)) : undefined);
  if (found && allowed(found, session)) return found;
  const first = accessibleTabs(session)[0] ?? 'settings';
  return ROUTES.find(r => r.path === pathFor(first, null, session))!;
}
