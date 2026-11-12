// POS-F&B Dialog Component per DESIGN.md §6.6 & WCAG 2.1 AA Focus Management

import React, { ReactNode, useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number | string;
  disableClose?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 520,
  disableClose = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Lưu trữ active element trước khi mở và tự động focus vào modal khi mở
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;

      // Chuyển focus vào modal sau khi render
      const timer = setTimeout(() => {
        if (!dialogRef.current) return;
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        // Ưu tiên phần tử có autoFocus, hoặc phần tử form đầu tiên, hoặc nút đóng
        const autoFocusEl = dialogRef.current.querySelector<HTMLElement>('[autofocus]');
        if (autoFocusEl) {
          autoFocusEl.focus();
        } else if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }, 30);

      return () => {
        clearTimeout(timer);
        previousActiveElementRef.current?.focus();
      };
    }
  }, [isOpen]);

  // Bắt phím Escape và bẫy focus Tab / Shift+Tab trong modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!disableClose) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        if (!dialogRef.current) return;

        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]):not([aria-disabled="true"]), [href], input:not([disabled]):not([aria-disabled="true"]), select:not([disabled]):not([aria-disabled="true"]), textarea:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null); // Chỉ lấy phần tử hiển thị

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, disableClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !disableClose) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'min(16px, 3vw)',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26, 34, 38, 0.48)',
          animation: 'fadeIn 180ms ease-out',
        }}
      />

      {/* Sheet Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-modal-pop"
        style={{
          position: 'relative',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-sheet)',
          boxShadow: 'var(--shadow-overlay)',
          width: '100%',
          maxWidth,
          maxHeight: 'min(92vh, calc(100vh - 20px))',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 5001,
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        {/* Header - Sticky */}
        <div
          style={{
            height: 64,
            padding: '0 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h2 id={titleId} style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={disableClose ? undefined : onClose}
            disabled={disableClose}
            aria-disabled={disableClose}
            aria-label="Đóng hộp thoại"
            className="touch-press"
            style={{
              height: 48,
              width: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-control)',
              cursor: disableClose ? 'not-allowed' : 'pointer',
              color: disableClose ? 'var(--color-border)' : 'var(--color-text-muted)',
              opacity: disableClose ? 0.5 : 1,
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div
          style={{
            padding: 'min(20px, 4vw)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Footer - Sticky */}
        {footer && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              background: 'var(--color-surface)',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

