// POS-F&B Offline Bar per DESIGN.md §7

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { WifiOff } from 'lucide-react';

export const OfflineBar: React.FC = () => {
  const { isOffline } = useAuth();

  if (!isOffline) return null;

  return (
    <div role="alert" className="offline-bar">
      <WifiOff size={18} />
      <span>Mất kết nối. Thao tác mới sẽ không được lưu cho đến khi có mạng.</span>
    </div>
  );
};
