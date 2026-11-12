// POS-F&B Demo Switcher Header Bar

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DEMO_ACCOUNTS } from '../../services/authService';
import { RotateCcw, Wifi, WifiOff, Users, ChevronDown, Check } from 'lucide-react';

export const DemoSwitcher: React.FC = () => {
  const { session, switchUser, isOffline, toggleOffline, resetAllData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const currentUser = session.user;
  const currentDemo = DEMO_ACCOUNTS.find((d) => d.id === currentUser.id);

  return (
    <div
      style={{
        height: 38,
        background: '#2B1A10', // Đậm hơn brand-800 một chút để tách biệt
        color: '#E9EDEF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: 12,
        fontWeight: 500,
        zIndex: 10000,
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexShrink: 1, overflow: 'hidden' }}>
        <span
          style={{
            background: 'var(--color-warning)',
            color: '#FFFFFF',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.3px',
            flexShrink: 0,
          }}
        >
          DEMO
        </span>
        <span style={{ color: '#D5DBDE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span className="demo-text-medium">Môi trường kiểm tra Frontend MVP</span>
          <span className="demo-text-long"> &bull; Dữ liệu lưu trong bộ nhớ</span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Chọn tài khoản Demo */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            style={{
              height: 28,
              padding: '0 10px',
              borderRadius: 'var(--radius-control)',
              background: 'rgba(255,255,255,0.12)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <Users size={14} />
            <span>Đổi vai trò: {currentDemo?.role_title || currentUser.username}</span>
            <ChevronDown size={14} />
          </button>

          {isOpen && (
            <>
              <div
                onClick={() => setIsOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 10001 }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 34,
                  right: 0,
                  width: 320,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  borderRadius: 'var(--radius-control)',
                  boxShadow: 'var(--shadow-overlay)',
                  border: '1px solid var(--color-border)',
                  zIndex: 10002,
                  padding: '8px 0',
                }}
              >
                <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                  Chọn tài khoản kiểm tra phân quyền
                </div>
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = acc.id === currentUser.id;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => {
                        switchUser(acc.id);
                        setIsOpen(false);
                      }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--color-brand-50)' : 'transparent',
                        transition: 'background-color 100ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--color-surface-sunken)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>
                          {acc.full_name}
                        </span>
                        {isSelected && <Check size={16} color="var(--color-brand-600)" />}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {acc.role_title} {acc.branch_name ? `(${acc.branch_name})` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-brand-700)', marginTop: 4 }}>
                        {acc.note}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Nút giả lập mất kết nối mạng */}
        <button
          type="button"
          onClick={toggleOffline}
          title="Giả lập trạng thái mất kết nối mạng để kiểm tra giao diện"
          style={{
            height: 28,
            padding: '0 8px',
            borderRadius: 'var(--radius-control)',
            background: isOffline ? 'var(--color-danger)' : 'rgba(255,255,255,0.12)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
        >
          {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
          <span>{isOffline ? 'Đang Offline' : 'Mạng bình thường'}</span>
        </button>

        {/* Nút khôi phục dữ liệu ban đầu */}
        <button
          type="button"
          onClick={() => {
            if (confirm('Khôi phục toàn bộ mock data về trạng thái ban đầu?')) {
              resetAllData();
            }
          }}
          title="Đặt lại toàn bộ hóa đơn, ca làm, kho về trạng thái ban đầu"
          style={{
            height: 28,
            padding: '0 8px',
            borderRadius: 'var(--radius-control)',
            background: 'rgba(255,255,255,0.12)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
          <span>Khôi phục dữ liệu</span>
        </button>
      </div>
    </div>
  );
};
