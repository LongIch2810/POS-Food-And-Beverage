// POS-F&B Authentication Login Screen per DESIGN.md §1, §4, §5.7 & Impeccable craft-floor
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Store,
  Boxes,
  Clock,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, error: authError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    const errors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      errors.username = 'Vui lòng nhập tên đăng nhập';
    }
    if (!password.trim()) {
      errors.password = 'Vui lòng nhập mật khẩu';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setGeneralError(err?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        padding: '24px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="login-stage-grid"
        style={{
          width: '100%',
          maxWidth: 1180,
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.15fr)',
          gap: 20,
          alignItems: 'stretch',
        }}
      >
        {/* ===================== CỘT TRÁI: THƯƠNG HIỆU & GIỚI THIỆU HỆ THỐNG ===================== */}
        <div className="login-brand-panel login-brand">
          <div className="login-brand-top">
            <div className="login-brand-logo">
              <div className="login-brand-mark">
                <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Logo Phin Cà Phê">
                  <circle cx="16" cy="5" r="1.8" fill="#f1e4d9" />
                  <path d="M9 8.5C9 7.8 10 7.2 16 7.2C22 7.2 23 7.8 23 8.5L22 10.5H10L9 8.5Z" fill="#f1e4d9" />
                  <path d="M10 11H22L20.8 19.5H11.2L10 11Z" fill="#f8f0e9" opacity="0.95" />
                  <rect x="7" y="19.5" width="18" height="2" rx="1" fill="#f1e4d9" />
                  <path d="M11.5 22.5H20.5L19.5 28C19.5 29 18.5 29.5 16 29.5C13.5 29.5 12.5 29 12.5 28L11.5 22.5Z" stroke="#f1e4d9" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="16" cy="25" r="1.2" fill="#e2cbbe" />
                </svg>
              </div>
              <div>
                <h1>POS & Quản lý Kho F&B</h1>
                <p className="login-brand-sub">Cà phê • Trà sữa • Quán ăn</p>
              </div>
            </div>
            <p className="login-brand-lead">Hệ thống bán hàng quầy cảm ứng và quản trị tồn kho đa chi nhánh theo thời gian thực.</p>
            <ul className="login-points">
              <li><Store size={22} /><div><strong>Bán hàng cảm ứng tại quầy</strong><span>Tối ưu tablet ngang, chọn món dưới 2 chạm, sơ đồ bàn trực quan.</span></div></li>
              <li><Clock size={22} /><div><strong>Đối soát ca đếm mù</strong><span>Mỗi chi nhánh 1 ca mở, bàn giao tiền mặt đếm mù chống thất thoát.</span></div></li>
              <li><Boxes size={22} /><div><strong>Định mức trừ kho tự động</strong><span>Trừ nguyên vật liệu theo công thức từng ly nước, cảnh báo tồn kho an toàn.</span></div></li>
            </ul>
          </div>
          <div className="login-brand-foot">
            <span>Bản quyền © Hệ thống F&B</span>
            <span>Múi giờ Asia/Ho_Chi_Minh</span>
          </div>
        </div>

        {/* ===================== CỘT GIỮA: FORM ĐĂNG NHẬP CHÍNH ===================== */}
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-sheet)',
            boxShadow: 'var(--shadow-overlay)',
            border: '1px solid var(--color-border)',
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Header biểu mẫu */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Đăng nhập tài khoản
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '6px 0 0 0' }}>
              Nhập tên đăng nhập và mật khẩu được cấp bởi cửa hàng
            </p>
          </div>

          {/* Thông báo lỗi chung */}
          {(generalError || authError) && (
            <div
              role="alert"
              style={{
                background: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-control)',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                marginBottom: 16,
                fontSize: 13,
                color: 'var(--color-danger)',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{generalError || authError}</span>
            </div>
          )}

          {/* Biểu mẫu */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                htmlFor="login-username"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Tên đăng nhập
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <UserIcon
                  size={18}
                  style={{
                    position: 'absolute',
                    left: 14,
                    color: fieldErrors.username ? 'var(--color-danger)' : 'var(--color-text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  aria-invalid={!!fieldErrors.username}
                  aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  placeholder="Nhập tên đăng nhập..."
                  style={{
                    height: 48,
                    width: '100%',
                    paddingLeft: 42,
                    paddingRight: 14,
                    borderRadius: 'var(--radius-control)',
                    border: `1px solid ${fieldErrors.username ? 'var(--color-danger)' : 'var(--color-border-control)'}`,
                    fontSize: 15,
                    color: 'var(--color-text)',
                    background: fieldErrors.username ? 'var(--color-danger-bg)' : 'var(--color-surface)',
                    outline: 'none',
                  }}
                />
              </div>
              {fieldErrors.username && (
                <div
                  id="username-error"
                  role="alert"
                  style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4, fontWeight: 500 }}
                >
                  {fieldErrors.username}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="login-password"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Mật khẩu
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: 14,
                    color: fieldErrors.password ? 'var(--color-danger)' : 'var(--color-text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="Nhập mật khẩu..."
                  style={{
                    height: 48,
                    width: '100%',
                    paddingLeft: 42,
                    paddingRight: 48,
                    borderRadius: 'var(--radius-control)',
                    border: `1px solid ${fieldErrors.password ? 'var(--color-danger)' : 'var(--color-border-control)'}`,
                    fontSize: 15,
                    color: 'var(--color-text)',
                    background: fieldErrors.password ? 'var(--color-danger-bg)' : 'var(--color-surface)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="touch-press"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 48,
                    height: 48,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '0 var(--radius-control) var(--radius-control) 0',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <div
                  id="password-error"
                  role="alert"
                  style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4, fontWeight: 500 }}
                >
                  {fieldErrors.password}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="touch-press"
              style={{
                height: 56,
                borderRadius: 'var(--radius-control)',
                background: 'var(--color-brand-600)',
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: 600,
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 6,
              }}
            >
              <span>{isLoading ? 'Đang xác thực...' : 'Đăng nhập hệ thống'}</span>
            </button>
          </form>

          {/* Chú thích bảo mật BR-02 */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 14,
              borderTop: '1px solid var(--color-border)',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              lineHeight: '18px',
            }}
          >
            Mật khẩu mã hóa an toàn. Tài khoản mới tạo bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.
          </div>
        </div>

      </div>

      {/* Embedded CSS for responsive layout */}
      <style>{`
        @media (max-width: 1023px) {
          .login-stage-grid {
            grid-template-columns: 1fr !important;
            max-width: 860px !important;
          }
          .login-brand-panel {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .login-stage-grid {
            grid-template-columns: 1fr !important;
            max-width: 440px !important;
          }
        }
      `}</style>
    </div>
  );
};
