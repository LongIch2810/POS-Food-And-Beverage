// POS-F&B Toast Notification Context per DESIGN.md §6.6

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from './AuthContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  onUndo?: () => void;
  undoLabel?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (msg: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { session, isAuthenticated } = useAuth();
  useEffect(() => { setToasts([]); }, [isAuthenticated, session?.user.id]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (msg: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = { ...msg, id };

      setToasts((prev) => [...prev, newToast]);

      // Thông báo lỗi KHÔNG tự động biến mất (DESIGN.md §6.6)
      if (msg.type !== 'error') {
        const timeout = msg.duration || 5000;
        setTimeout(() => {
          removeToast(id);
        }, timeout);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Container góc dưới bên trái */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 420,
        }}
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';

          let bg = 'var(--color-surface)';
          let border = 'var(--color-border)';
          let iconColor = 'var(--color-info)';

          if (isError) {
            bg = 'var(--color-danger-bg)';
            border = 'var(--color-danger)';
            iconColor = 'var(--color-danger)';
          } else if (isSuccess) {
            bg = 'var(--color-success-bg)';
            border = 'var(--color-success)';
            iconColor = 'var(--color-success)';
          } else if (isWarning) {
            bg = 'var(--color-warning-bg)';
            border = 'var(--color-warning)';
            iconColor = 'var(--color-warning)';
          }

          return (
            <div
              key={toast.id}
              role={isError ? 'alert' : 'status'}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 'var(--radius-control)',
                padding: '12px 16px',
                boxShadow: 'var(--shadow-overlay)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 14,
                lineHeight: '20px',
                color: 'var(--color-text)',
              }}
            >
              <div style={{ color: iconColor, flexShrink: 0, display: 'flex' }}>
                {isError && <AlertCircle size={20} />}
                {isSuccess && <CheckCircle2 size={20} />}
                {!isError && !isSuccess && <Info size={20} />}
              </div>
              <div style={{ flex: 1 }}>{toast.message}</div>
              {toast.onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onUndo?.();
                    removeToast(toast.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-brand-600)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 4,
                  }}
                >
                  {toast.undoLabel || 'Hoàn tác'}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Đóng thông báo"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: 2,
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast phải được dùng bên trong ToastProvider');
  }
  return context;
};
