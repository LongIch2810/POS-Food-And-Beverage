import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AuthSession } from '../types/auth';
import { authService, DEMO_ACCOUNTS } from '../services/authService';
import * as api from '../auth/client';
import { toUiSession } from '../auth/session';
import { notifySessionChange, rememberRequestIdentity } from '../auth/session-events';

interface AuthContextType {
  session: AuthSession;
  isAuthenticated: boolean;
  loading: boolean;
  error: string;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  forceChangePassword: (newPass: string) => Promise<void>;
  isOffline: boolean;
  toggleOffline: () => void;
  resetAllData: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession>(null!);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOffline, setOffline] = useState(false);
  const generation = useRef(0);
  const applyUser = (user: api.AuthUser) => {
    rememberRequestIdentity(user);
    const demo = DEMO_ACCOUNTS.find(account => account.role_code === user.role);
    if (demo) void authService.switchDemoUser(demo.id);
    setSession(toUiSession(user)); setAuthenticated(true);
  };
  useEffect(() => {
    let active = true;
    const refresh = () => {
      const version = ++generation.current;
      void api.restoreSession().then(user => {
        if (!active || version !== generation.current) return;
        if (user) applyUser(user); else { rememberRequestIdentity(null); setSession(null!); setAuthenticated(false); }
        setError('');
      }).catch(e => {
        if (!active || version !== generation.current) return;
        if (e instanceof api.AuthError && (e.code === 'ACCOUNT_DISABLED' || e.code === 'STORE_SUSPENDED')) {
          setSession(null!);
          setAuthenticated(false);
          notifySessionChange('revoked');
        }
        setError(e instanceof Error ? e.message : 'Không thể khôi phục phiên.');
      }).finally(() => { if (active && version === generation.current) setLoading(false); });
    };
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('pos-session');
    if (channel) channel.onmessage = (event) => {
      if (event.data === 'logout' || event.data === 'revoked') {
        rememberRequestIdentity(null);
        generation.current++; setSession(null!); setAuthenticated(false); setLoading(false);
        if (event.data === 'logout') setError('');
      }
      else if (event.data === 'login') refresh();
    };
    window.addEventListener('focus', refresh);
    refresh();
    return () => { active = false; window.removeEventListener('focus', refresh); channel?.close(); };
  }, []);
  const login = async (username: string, password = '') => {
    const user = await api.login(username, password);
    generation.current++; applyUser(user); setError(''); notifySessionChange('login');
  };
  const logout = () => {
    void api.logout().then(() => { generation.current++; setAuthenticated(false); setError(''); notifySessionChange('logout'); })
      .catch(e => setError(e instanceof Error ? e.message : 'Không thể đăng xuất.'));
  };
  const forceChangePassword = async (newPass: string) => {
    const user = await api.restoreSession();
    if (!user) { setAuthenticated(false); throw new Error('Phiên đã hết hiệu lực. Vui lòng đăng nhập lại.'); }
    await api.changePassword(newPass); generation.current++; setAuthenticated(false); notifySessionChange('logout');
  };
  const switchUser = async (_userId: string) => { throw new Error('Không thể đổi tài khoản demo trong phiên thật.'); };
  const toggleOffline = () => setOffline(authService.toggleOfflineMode());
  const resetAllData = () => { authService.resetAllData(); };
  return <AuthContext.Provider value={{ session, isAuthenticated, loading, error, login, logout, switchUser,
    forceChangePassword, isOffline, toggleOffline, resetAllData }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return context;
};
