// POS-F&B Drawer Component per DESIGN.md §6.6

import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number | string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = 440,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-root">
      <div className="dialog-backdrop" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="drawer-panel animate-drawer-slide" style={{ width }}>
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
