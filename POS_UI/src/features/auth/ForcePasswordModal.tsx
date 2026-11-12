// POS-F&B Mandatory Password Change Modal per WCAG 2.1 AA & Product Overview

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { Lock, LogOut } from 'lucide-react';

export const ForcePasswordModal: React.FC = () => {
  const { session, forceChangePassword, logout, error: authError } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap bên trong modal
  useEffect(() => {
    if (!session.user.must_change_password) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session.user.must_change_password]);

  // Chỉ hiện khi must_change_password là true
  if (!session.user.must_change_password) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
      setError('Mật khẩu mới phải có ít nhất 12 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    setLoading(true);
    try {
      await forceChangePassword(password);
      showToast({
        type: 'success',
        message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
      });
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="force-overlay">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-password-title"
        tabIndex={-1}
        className="force-card animate-modal-pop"
      >
        <div className="force-head">
          <div className="icon-badge"><Lock size={26} aria-hidden="true" /></div>
          <div>
            <h2 id="force-password-title">Đổi mật khẩu lần đầu</h2>
            <p>Vì lý do an toàn bảo mật, tài khoản mới khởi tạo cần thiết lập mật khẩu cá nhân trước khi bắt đầu làm việc.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="stack">
          <Field
            label="Mật khẩu mới (tối thiểu 12 ký tự)"
            type="password"
            autoComplete="new-password"
            placeholder="Nhập mật khẩu mới..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />

          <Field
            label="Xác nhận mật khẩu mới"
            type="password"
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới..."
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {(error || authError) && <div role="alert" className="notice notice-danger">{error || authError}</div>}

          <div className="stack-actions">
            <Button type="button" variant="secondary" size="lg" onClick={logout} disabled={loading} icon={<LogOut size={16} />}>
              Đăng xuất
            </Button>
            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={loading} disabled={loading}>
              Xác nhận đổi mật khẩu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

