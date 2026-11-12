// POS-F&B Badge Component per DESIGN.md §6.4: viên thuốc, nền nhạt, luôn có biểu tượng đi trước

import React, { ReactNode } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  CircleDot,
} from 'lucide-react';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  icon?: ReactNode;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, icon, size = 'md' }) => {
  const px = size === 'sm' ? 12 : 14;
  const defaultIcon = variant === 'success' ? <CheckCircle2 size={px} />
    : variant === 'danger' ? <XCircle size={px} />
    : variant === 'warning' ? <AlertTriangle size={px} />
    : variant === 'info' ? <Info size={px} />
    : <CircleDot size={px} />;

  return (
    <span className={`badge badge-${variant}${size === 'sm' ? ' badge-sm' : ''}`}>
      {icon || defaultIcon}
      <span>{children}</span>
    </span>
  );
};
