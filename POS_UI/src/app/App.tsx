// POS-F&B Root Application Component

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { AppShell, NavTab } from '../components/common/AppShell';
import { ForcePasswordModal } from '../features/auth/ForcePasswordModal';
import { LoginScreen } from '../features/auth/LoginScreen';

// Features
import { LivePosScreen } from '../features/pos/LivePosScreen';
import { InvoicesScreen } from '../features/invoices/InvoicesScreen';
import { ShiftsScreen } from '../features/shifts/ShiftsScreen';
import { ProductsScreen } from '../features/products/ProductsScreen';
import { InventoryScreen } from '../features/inventory/InventoryScreen';
import { DailyReportScreen } from '../features/reports/DailyReportScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { PlatformAdminScreen } from '../features/platform/PlatformAdminScreen';
import { accessibleTabs, canOpenProducts, canOpenSettings } from './navigation';
import { LOGIN_PATH, pathFor, resolveRoute } from './routes';
import type { InventoryTab, PosTab, ProductsTab, SettingsTab, SubTab } from './routes';

const AccessDenied: React.FC<{ message?: string }> = ({ message }) => (
  <div style={{ flex: 1, padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ textAlign: 'center', maxWidth: 420 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 8 }}>
        Không có quyền truy cập
      </div>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
        {message || 'Tài khoản của bạn không có quyền truy cập chức năng này.'}
      </p>
    </div>
  </div>
);

const MainRouter: React.FC = () => {
  const { session, isAuthenticated, loading, error } = useAuth();
  const location = useLocation();

  if (loading) return <div role="status">Đang kiểm tra phiên đăng nhập...</div>;

  // Không giữ địa chỉ cũ để quay lại sau đăng nhập: vào tab đầu tiên được phép.
  if (!isAuthenticated) {
    return location.pathname === LOGIN_PATH ? <LoginScreen /> : <Navigate to={LOGIN_PATH} replace />;
  }

  if (session.user.must_change_password) return <ForcePasswordModal />;

  // key theo người dùng: đổi tài khoản thì bỏ state của người trước (targetInvoiceId).
  return <AuthenticatedRouter key={session.user.id} error={error} />;
};

const AuthenticatedRouter: React.FC<{ error: string }> = ({ error }) => {
  const { session } = useAuth();
  const availableTabs = accessibleTabs(session);

  const location = useLocation();
  const navigate = useNavigate();
  const owner = session.user.id;
  // history.state.owner: mục lịch sử của người khác (Back sau khi đổi tài khoản) không được dựng lại màn của họ.
  const stateOwner = (location.state as { owner?: string } | null)?.owner;
  const route = resolveRoute(stateOwner !== undefined && stateOwner !== owner ? '/' : location.pathname, session);
  const currentTab = route.tab;
  const [targetInvoiceId, setTargetInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (route.path !== location.pathname || stateOwner !== owner) navigate(route.path, { replace: true, state: { owner } });
  }, [route.path, location.pathname, stateOwner, owner]);

  const go = (tab: NavTab, subTab: SubTab | null = null) => {
    const path = pathFor(tab, subTab, session);
    if (path !== location.pathname) navigate(path, { state: { owner } });
  };

  const handleNavigateToInvoice = (invoiceId: string) => {
    setTargetInvoiceId(invoiceId);
    go('pos', 'menu');
  };

  const perms = session?.permissions || [];
  const identityKey = JSON.stringify([session.user.id,session.user.store_id,session.user.branch_id,
    session.user.role_code,session.user.must_change_password,[...perms].sort()]);
  const has = (p: string) => perms.includes(p as any);

  const renderContent = () => {
    switch (currentTab) {
      case 'pos':
        if (!has('pos.sell') && !has('invoice.read')) return <AccessDenied message="Yêu cầu quyền đọc đơn hoặc bán hàng." />;
        return (
          <LivePosScreen
            key={`${session.user.id}:${session.user.branch_id}:${session.permissions.join(',')}`}
            activeTab={route.sub as PosTab}
            onTabChange={posTab => go(posTab === 'tables' ? 'tables' : 'pos', posTab)}
            initialInvoiceId={targetInvoiceId}
          />
        );
      case 'tables':
        if (!has('pos.sell') && !has('table.read')) return <AccessDenied message="Yêu cầu quyền đọc bàn hoặc bán hàng." />;
        return (
          <LivePosScreen
            key={`${session.user.id}:${session.user.branch_id}:${session.permissions.join(',')}`}
            activeTab={route.sub as PosTab}
            onTabChange={posTab => go(posTab === 'tables' ? 'tables' : 'pos', posTab)}
            initialInvoiceId={targetInvoiceId}
          />
        );
      case 'invoices':
        if (!has('invoice.read') && !has('invoice.cancel_open') && !has('invoice.cancel_paid')) {
          return <AccessDenied message="Yêu cầu quyền xem hoặc xử lý hóa đơn." />;
        }
        return <InvoicesScreen />;
      case 'shifts':
        if (!has('shift.read') && !has('shift.open') && !has('shift.close') && !has('shift.force_close')) {
          return <AccessDenied message="Yêu cầu quyền xem hoặc quản lý ca làm việc." />;
        }
        return <ShiftsScreen onNavigateToInvoice={handleNavigateToInvoice} />;
      case 'products':
        if (!canOpenProducts(perms)) {
          return <AccessDenied message="Yêu cầu quyền quản lý thực đơn (menu.manage hoặc product.manage)." />;
        }
        return <ProductsScreen key={identityKey} tab={route.sub as ProductsTab} onTabChange={next => go('products', next)} />;
      case 'inventory':
        if (!has('inventory.view')) return <AccessDenied message="Yêu cầu quyền xem kho hàng (inventory.view)." />;
        return <InventoryScreen key={identityKey} tab={route.sub as InventoryTab} onTabChange={next => go('inventory', next)} />;
      case 'reports':
        if (!availableTabs.includes('reports')) {
          return <AccessDenied message="Yêu cầu quyền xem báo cáo doanh thu (report.view_shift, report.view_branch, hoặc report.view_all kèm branch.access_all)." />;
        }
        return <DailyReportScreen key={identityKey} />;
      case 'settings':
        if (session.user.role_code === 'PLATFORM_ADMIN' || !canOpenSettings(perms)) {
          return <AccessDenied message="Bạn chưa có quyền quản lý chi nhánh, bàn hoặc tài khoản." />;
        }
        return <SettingsScreen tab={route.sub as SettingsTab} onTabChange={next => go('settings', next)} />;
      case 'platform_stores':
      case 'platform_owners':
        return (
          <PlatformAdminScreen
            activeTab={currentTab === 'platform_stores' ? 'stores' : 'owners'}
            onTabChange={(tab) => go(tab === 'stores' ? 'platform_stores' : 'platform_owners')}
          />
        );
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {currentTab !== 'pos' && currentTab !== 'tables' && currentTab !== 'settings' && currentTab !== 'products' && currentTab !== 'shifts' && currentTab !== 'invoices' && currentTab !== 'inventory' && currentTab !== 'reports' && !currentTab.startsWith('platform_') && (
        <div role="status" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '8px 16px', textAlign: 'center' }}>
          Màn hình này dùng dữ liệu mẫu, chưa kết nối API.
        </div>
      )}
      {error && <div role="alert">{error}</div>}

      <AppShell currentTab={currentTab} onSelectTab={tab => go(tab)}>
        {renderContent()}
      </AppShell>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <MainRouter />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
