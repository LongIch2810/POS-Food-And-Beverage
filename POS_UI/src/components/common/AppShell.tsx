// POS-F&B AppShell per DESIGN.md §5.1, ui-ux-pro-max & taste-skill app screens

import React, { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MockEngine } from '../../mock/mockEngine';
import { shiftService, WorkShiftDto } from '../../services/shiftService';
import { formatDuration } from '../../utils/formatters';
import { Badge } from '../ui/Badge';
import { canOpenSettings } from '../../app/navigation';
import {
  ShoppingBag,
  LayoutGrid,
  Receipt,
  Clock,
  Boxes,
  BarChart3,
  Settings,
  Building2,
  ShieldCheck,
  ChevronDown,
  UtensilsCrossed,
  UserCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export type NavTab =
  | 'pos'
  | 'tables'
  | 'invoices'
  | 'shifts'
  | 'inventory'
  | 'reports'
  | 'products'
  | 'settings'
  | 'platform_stores'
  | 'platform_owners';

interface AppShellProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ currentTab, onSelectTab, children }) => {
  const { session, logout } = useAuth();
  const user = session.user;
  const perms = session.permissions || [];
  const has = (p: string) => perms.includes(p as any);
  const isPlatformAdmin = user.role_code === 'PLATFORM_ADMIN';
  const isDemo = !isPlatformAdmin && !['settings', 'products', 'shifts'].includes(currentTab);
  const canSwitchBranch = has('branch.access_all');

  const [activeShiftDuration, setActiveShiftDuration] = useState<string>('');
  const [currentShift, setCurrentShift] = useState<WorkShiftDto | null>(null);
  const [accessibleBranches, setAccessibleBranches] = useState(() => isDemo ? MockEngine.getAccessibleBranches() : []);
  const [selectedBranchId, setSelectedBranchId] = useState(() => isDemo ? MockEngine.getEffectiveBranchId() : '');
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cập nhật thông tin ca làm việc
  useEffect(() => {
    if (!isDemo) setBranchDropdownOpen(false);
    const updateShiftTime = () => {
      if (currentShift?.status === 'OPEN') {
        setActiveShiftDuration(formatDuration(currentShift.startedAt));
      } else {
        setActiveShiftDuration('');
      }
      if (isDemo) {
        setAccessibleBranches(MockEngine.getAccessibleBranches());
        setSelectedBranchId(MockEngine.getEffectiveBranchId());
      }
    };

    updateShiftTime();
    const timer = setInterval(updateShiftTime, 30000); // 30s update
    return () => clearInterval(timer);
  }, [user, isDemo, currentShift]);

  useEffect(() => {
    if (isPlatformAdmin) return;
    let active = true;
    const refresh = () => {
      void shiftService.getCurrentShift().then(shift => { if (active) setCurrentShift(shift); })
        .catch(() => { if (active) setCurrentShift(null); });
    };
    refresh();
    window.addEventListener('pos-shift-changed', refresh);
    return () => { active = false; window.removeEventListener('pos-shift-changed', refresh); };
  }, [user.id, isPlatformAdmin]);

  const hasOpenShift = currentShift?.status === 'OPEN';

  // Danh sách Navigation Items theo quyền động (BR-05)
  const allNavItems: { id: NavTab; label: string; icon: React.ReactNode; visible: boolean }[] = [
    // Quản trị nền tảng
    { id: 'platform_stores', label: 'Cửa hàng', icon: <Building2 size={24} />, visible: isPlatformAdmin && has('store.read') },
    { id: 'platform_owners', label: 'Chủ quán', icon: <UserCheck size={24} />, visible: isPlatformAdmin && has('user.read_owner') },

    // Nghiệp vụ bán hàng & vận hành cửa hàng
    { id: 'pos', label: 'Bán hàng', icon: <ShoppingBag size={24} />, visible: !isPlatformAdmin && has('pos.sell') },
    { id: 'tables', label: 'Sơ đồ bàn', icon: <LayoutGrid size={24} />, visible: !isPlatformAdmin && (has('pos.sell') || has('table.manage')) },
    { id: 'invoices', label: 'Hóa đơn', icon: <Receipt size={24} />, visible: !isPlatformAdmin && (has('pos.sell') || has('invoice.cancel_open') || has('invoice.cancel_paid')) },
    { id: 'shifts', label: 'Ca làm', icon: <Clock size={24} />, visible: !isPlatformAdmin && (has('shift.read') || has('shift.open') || has('shift.close') || has('shift.force_close')) },
    { id: 'inventory', label: 'Kho hàng', icon: <Boxes size={24} />, visible: !isPlatformAdmin && has('inventory.view') },
    { id: 'reports', label: 'Báo cáo', icon: <BarChart3 size={24} />, visible: !isPlatformAdmin && (has('report.view_branch') || has('report.view_all')) },
    { id: 'products', label: 'Thực đơn', icon: <UtensilsCrossed size={24} />, visible: !isPlatformAdmin && (has('menu.read') || has('menu.manage') || has('product.manage')) },
    { id: 'settings', label: 'Cài đặt', icon: <Settings size={24} />, visible: !isPlatformAdmin && canOpenSettings(perms) },
  ];

  const navItems = allNavItems.filter((item) => item.visible);

  const currentBranchName =
    accessibleBranches.find((b) => b.id === selectedBranchId)?.name || session.branch_name || 'Chi nhánh';

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
      {/* ===================== RAIL BÊN TRÁI (>= 768px: Desktop & Tablet) ===================== */}
      {!isMobile && (
        <nav
          aria-label="Điều hướng chính"
          style={{
            width: 80,
            background: 'var(--color-brand-800)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px 0',
            gap: 8,
            flexShrink: 0,
            userSelect: 'none',
            overflowY: 'auto',
          }}
          className="no-scrollbar"
        >
          {/* Logo Phin Cà Phê Việt Nam */}
          <div
            title={isPlatformAdmin ? 'Quản trị Nền tảng' : 'Hệ thống Cà phê F&B'}
            style={{
              height: 52,
              width: 52,
              borderRadius: 'var(--radius-tile)',
              background: 'var(--color-brand-700)',
              border: '1px solid var(--color-brand-500)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              flexShrink: 0,
            }}
          >
            {isPlatformAdmin ? (
              <ShieldCheck size={28} color="#f8f0e9" />
            ) : (
              <svg
                width="30"
                height="30"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Logo Phin Cà Phê"
              >
                <circle cx="16" cy="5" r="1.8" fill="#f1e4d9" />
                <path d="M9 8.5C9 7.8 10 7.2 16 7.2C22 7.2 23 7.8 23 8.5L22 10.5H10L9 8.5Z" fill="#f1e4d9" />
                <path d="M10 11H22L20.8 19.5H11.2L10 11Z" fill="#f8f0e9" opacity="0.95" />
                <rect x="7" y="19.5" width="18" height="2" rx="1" fill="#f1e4d9" />
                <path d="M11.5 22.5H20.5L19.5 28C19.5 29 18.5 29.5 16 29.5C13.5 29.5 12.5 29 12.5 28L11.5 22.5Z" stroke="#f1e4d9" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="16" cy="25" r="1.2" fill="#e2cbbe" />
              </svg>
            )}
          </div>

          {/* Các nút điều hướng */}
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className="touch-press"
                style={{
                  width: 68,
                  height: 64,
                  borderRadius: 'var(--radius-control)',
                  background: isActive ? 'var(--color-brand-600)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--color-brand-100)',
                  border: isActive ? '1px solid var(--color-brand-500)' : '1px solid transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <div>{item.icon}</div>
                <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 500, letterSpacing: '0.2px' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ===================== MOBILE NAVIGATION DRAWER (< 768px) ===================== */}
      {isMobile && mobileNavOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            display: 'flex',
          }}
        >
          {/* Backdrop tối mờ */}
          <div
            onClick={() => setMobileNavOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(26, 34, 38, 0.55)',
            }}
          />

          {/* Drawer Menu trượt từ trái */}
          <div
            className="animate-mobile-nav"
            style={{
              position: 'relative',
              width: 280,
              maxWidth: '85vw',
              height: '100%',
              background: 'var(--color-brand-800)',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 9001,
              boxShadow: 'var(--shadow-overlay)',
              userSelect: 'none',
            }}
          >
            {/* Header của Drawer */}
            <div
              style={{
                height: 64,
                padding: '0 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-control)',
                    background: 'var(--color-brand-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShoppingBag size={20} color="#f1e4d9" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>POS & Kho F&B</div>
                  <div style={{ fontSize: 11, color: 'var(--color-brand-100)' }}>{currentBranchName}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Đóng bảng điều hướng"
                className="touch-press"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-control)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-brand-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Thông tin nhân viên */}
            <div
              style={{
                padding: '14px 18px',
                background: 'rgba(0, 0, 0, 0.15)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>{user.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-brand-100)', marginTop: 2 }}>
                {user.role_code === 'PLATFORM_ADMIN'
                  ? 'Quản trị nền tảng'
                  : user.role_code === 'OWNER'
                  ? 'Chủ cửa hàng'
                  : user.role_code === 'MANAGER'
                  ? 'Quản lý chi nhánh'
                  : 'Thu ngân'}
              </div>
            </div>

            {/* Danh sách mục điều hướng cuộn mượt */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
              className="scroll-touch"
            >
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    className="touch-press"
                    style={{
                      height: 48,
                      width: '100%',
                      borderRadius: 'var(--radius-control)',
                      background: isActive ? 'var(--color-brand-600)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--color-brand-100)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '0 14px',
                      fontSize: 15,
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>{item.icon}</div>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Nút đăng xuất ở đáy drawer */}
            <div
              style={{
                padding: '14px 16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={logout}
                className="touch-press"
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 'var(--radius-control)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MAIN CONTENT AREA ===================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar per DESIGN.md §5.1 (thích ứng kích thước trên mobile & desktop) */}
        <header
          style={{
            height: 56,
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '0 12px' : '0 20px',
            flexShrink: 0,
            zIndex: 10,
            gap: 8,
          }}
        >
          {/* Bên trái: Nút Menu (nếu Mobile) + Tên Chi nhánh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexShrink: 1, overflow: 'hidden' }}>
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Mở danh mục điều hướng"
                className="touch-press"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Menu size={22} />
              </button>
            )}

            {isPlatformAdmin || currentTab === 'settings' ? (
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isPlatformAdmin ? 'Quản trị nền tảng' : 'Cài đặt cửa hàng'}
              </span>
            ) : canSwitchBranch ? (
              /* Người có quyền branch.access_all có dropdown đổi chi nhánh (BR-71b) */
              <div style={{ position: 'relative', minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                  style={{
                    height: 44,
                    padding: '0 10px',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--color-border-control)',
                    background: 'var(--color-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    maxWidth: isMobile ? 150 : 220,
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentBranchName}</span>
                  <ChevronDown size={16} style={{ flexShrink: 0 }} />
                </button>

                {branchDropdownOpen && (
                  <>
                    <div
                      onClick={() => setBranchDropdownOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 48,
                        left: 0,
                        width: 240,
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-control)',
                        boxShadow: 'var(--shadow-overlay)',
                        border: '1px solid var(--color-border)',
                        padding: '6px 0',
                        zIndex: 101,
                      }}
                    >
                      <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Chọn chi nhánh làm việc
                      </div>
                      {accessibleBranches.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            MockEngine.setSelectedBranch(b.id);
                            setSelectedBranchId(b.id);
                            setBranchDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: b.id === selectedBranchId ? 600 : 400,
                            color: b.id === selectedBranchId ? 'var(--color-brand-600)' : 'var(--color-text)',
                            background: b.id === selectedBranchId ? 'var(--color-brand-50)' : 'transparent',
                          }}
                        >
                          {b.name}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Nhân viên/Quản lý chỉ xem tên chi nhánh của mình */
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentBranchName}
              </span>
            )}

            {session.store_name && !isPlatformAdmin && !isMobile && (
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                &bull; {session.store_name}
              </span>
            )}
          </div>

          {/* Ở giữa: Chip trạng thái ca làm việc (tự thu gọn trên mobile) */}
          {!isPlatformAdmin && (
            <div style={{ flexShrink: 0 }}>
              {hasOpenShift ? (
                <Badge variant="success" size="sm">
                  <span
                    className="pulse-dot"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--color-success)',
                      display: 'inline-block',
                      marginRight: isMobile ? 0 : 6,
                    }}
                  />
                  {!isMobile && `${currentShift?.shiftType === 'STAFF' ? 'Ca nhân viên' : 'Ca thu ngân'} (${activeShiftDuration})`}
                </Badge>
              ) : (
                <Badge variant="warning" size="sm">
                  {isMobile ? 'Chưa ca' : 'Chưa có ca đang mở'}
                </Badge>
              )}
            </div>
          )}

          {/* Bên phải: Tên người dùng & Đăng xuất */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {!isMobile && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {user.role_code === 'PLATFORM_ADMIN'
                    ? 'Quản trị'
                    : user.role_code === 'OWNER'
                    ? 'Chủ cửa hàng'
                    : user.role_code === 'MANAGER'
                    ? 'Quản lý'
                    : 'Thu ngân'}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              title="Đăng xuất khỏi tài khoản"
              className="touch-press"
              style={{
                height: 48,
                padding: isMobile ? '0 10px' : '0 14px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
              {!isMobile && <span>Đăng xuất</span>}
            </button>
          </div>
        </header>

        {/* Nội dung trang */}
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
};
