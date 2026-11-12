// POS-F&B Toast Notification Context per DESIGN.md §6.6

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
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
      <div aria-live="polite" className="toast-stack">
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';
          return (
            <div key={toast.id} role={isError ? 'alert' : 'status'} className={`toast toast-${toast.type}`}>
              <div className="toast-icon">
                {isError && <AlertCircle size={20} />}
                {isSuccess && <CheckCircle2 size={20} />}
                {isWarning && <AlertTriangle size={20} />}
                {!isError && !isSuccess && !isWarning && <Info size={20} />}
              </div>
              <div className="toast-message">{toast.message}</div>
              {toast.onUndo && (
                <button
                  type="button"
                  className="btn btn-text"
                  onClick={() => {
                    toast.onUndo?.();
                    removeToast(toast.id);
                  }}
                >
                  {toast.undoLabel || 'Hoàn tác'}
                </button>
              )}
              <button type="button" className="icon-btn" onClick={() => removeToast(toast.id)} aria-label="Đóng thông báo">
                <X size={18} />
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
