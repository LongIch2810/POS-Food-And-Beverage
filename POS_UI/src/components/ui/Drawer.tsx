// POS-F&B Drawer Component per DESIGN.md §6.6

import React, { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number | string;
  suspended?: boolean;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = 440,
  suspended = false,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasSuspended = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      const drawer = drawerRef.current;
      if (drawer?.parentElement?.hasAttribute('inert')) return;
      const first = drawer?.querySelector<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      (first || drawer)?.focus();
    }, 30);
    return () => { clearTimeout(timer); previous?.focus(); };
  }, [isOpen]);

  useEffect(() => {
    if (suspended) { wasSuspended.current = true; return; }
    if (!isOpen || !wasSuspended.current) return;
    wasSuspended.current = false;
    const timer = setTimeout(() => {
      const drawer = drawerRef.current;
      if (drawer && !drawer.contains(document.activeElement)) {
        (drawer.querySelector<HTMLElement>('button:not([disabled])') || drawer).focus();
      }
    }, 30);
    return () => clearTimeout(timer);
  }, [isOpen, suspended]);

  useEffect(() => {
    if (!isOpen || suspended) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && drawerRef.current) {
        const drawer = drawerRef.current;
        const focusables = Array.from(drawer.querySelectorAll<HTMLElement>('button:not([disabled]):not([aria-disabled="true"]), [href], input:not([disabled]):not([aria-disabled="true"]), select:not([disabled]):not([aria-disabled="true"]), textarea:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
        if (!focusables.length) { e.preventDefault(); return; }
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
          e.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, suspended]);

  if (!isOpen) return null;

  return (
    <div className="drawer-root" aria-hidden={suspended || undefined} {...(suspended ? { inert: '' } : {})}>
      <div className="dialog-backdrop" onClick={onClose} />
      <div ref={drawerRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="drawer-panel animate-drawer-slide" style={{ width }}>
        <div className="drawer-head">
          <h2 className="drawer-title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng ngăn kéo" className="icon-btn">
            <X size={22} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
};
