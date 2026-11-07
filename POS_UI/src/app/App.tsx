// POS-F&B Root Application Component

import React, { useState, useEffect } from 'react';
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
import { accessibleTabs, canOpenSettings } from './navigation';

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

  if (loading) return <div role="status">Đang kiểm tra phiên đăng nhập...</div>;

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (session.user.must_change_password) return <ForcePasswordModal />;

  return <AuthenticatedRouter error={error} />;
};

const AuthenticatedRouter: React.FC<{ error: string }> = ({ error }) => {
  const { session } = useAuth();
  const availableTabs = accessibleTabs(session);

  // Quản trị nền tảng chỉ vào tab platform
  const [currentTab, setCurrentTab] = useState<NavTab>(
    availableTabs[0] ?? 'settings'
  );
  const [targetInvoiceId, setTargetInvoiceId] = useState<string | null>(null);

  const handleNavigateToInvoice = (invoiceId: string) => {
    setTargetInvoiceId(invoiceId);
    setCurrentTab('pos');
  };

  useEffect(() => {
    if (!availableTabs.includes(currentTab)) setCurrentTab(availableTabs[0] ?? 'settings');
  }, [JSON.stringify(availableTabs), currentTab]);

  const perms = session?.permissions || [];
  const has = (p: string) => perms.includes(p as any);

  const renderContent = () => {
    switch (currentTab) {
      case 'pos':
        if (!has('pos.sell') && !has('invoice.read')) return <AccessDenied message="Yêu cầu quyền đọc đơn hoặc bán hàng." />;
        return (
          <LivePosScreen
            key={`${session.user.id}:${session.user.branch_id}:${session.permissions.join(',')}`}
            activeMode="pos"
            initialInvoiceId={targetInvoiceId}
            onSwitchToTables={() => setCurrentTab('tables')}
            onSwitchToPos={() => setCurrentTab('pos')}
          />
        );
      case 'tables':
        if (!has('pos.sell') && !has('table.read')) return <AccessDenied message="Yêu cầu quyền đọc bàn hoặc bán hàng." />;
        return (
          <LivePosScreen
            key={`${session.user.id}:${session.user.branch_id}:${session.permissions.join(',')}`}
            activeMode="tables"
            initialInvoiceId={targetInvoiceId}
            onSwitchToTables={() => setCurrentTab('tables')}
            onSwitchToPos={() => setCurrentTab('pos')}
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
        if (!has('menu.read') && !has('menu.manage') && !has('product.manage')) {
          return <AccessDenied message="Yêu cầu quyền xem hoặc quản lý thực đơn (menu.read hoặc menu.manage)." />;
        }
        return <ProductsScreen />;
      case 'inventory':
        if (!has('inventory.view')) return <AccessDenied message="Yêu cầu quyền xem kho hàng (inventory.view)." />;
        return <InventoryScreen />;
      case 'reports':
        if (!has('report.view_branch') && !has('report.view_all')) {
          return <AccessDenied message="Yêu cầu quyền xem báo cáo doanh thu (report.view_branch hoặc report.view_all)." />;
        }
        return <DailyReportScreen />;
      case 'settings':
        if (session.user.role_code === 'PLATFORM_ADMIN' || !canOpenSettings(perms)) {
          return <AccessDenied message="Bạn chưa có quyền quản lý chi nhánh, bàn hoặc tài khoản." />;
        }
        return <SettingsScreen />;
      case 'platform_stores':
        return (
          <PlatformAdminScreen
            activeTab="stores"
            onTabChange={(tab) => {
              if (tab === 'stores') setCurrentTab('platform_stores');
              else if (tab === 'owners') setCurrentTab('platform_owners');
            }}
          />
        );
      case 'platform_owners':
        return (
          <PlatformAdminScreen
            activeTab="owners"
            onTabChange={(tab) => {
              if (tab === 'stores') setCurrentTab('platform_stores');
              else if (tab === 'owners') setCurrentTab('platform_owners');
            }}
          />
        );
      default:
        return (
          <LivePosScreen
            activeMode="pos"
            onSwitchToTables={() => setCurrentTab('tables')}
            onSwitchToPos={() => setCurrentTab('pos')}
          />
        );
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {currentTab !== 'pos' && currentTab !== 'tables' && currentTab !== 'settings' && currentTab !== 'products' && currentTab !== 'shifts' && !currentTab.startsWith('platform_') && (
        <div role="status" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '8px 16px', textAlign: 'center' }}>
          Màn hình này dùng dữ liệu mẫu, chưa kết nối API.
        </div>
      )}
      {error && <div role="alert">{error}</div>}

      <AppShell currentTab={currentTab} onSelectTab={setCurrentTab}>
        {renderContent()}
      </AppShell>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainRouter />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
