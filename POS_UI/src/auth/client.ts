import { rememberRequestIdentity } from './session-events.ts';

export interface AuthUser {
  id: string; username: string; fullName: string; role: string;
  storeId: string | null; branchId: string | null; permissions: string[]; mustChangePassword: boolean;
}

export class AuthError extends Error {
  code: string;
  status?: number;
  requestId?: string;
  details: { location?: string; field?: string; message?: string }[];
  constructor(code: string, message: string, metadata: { status?: number; requestId?: string;
    details?: { location?: string; field?: string; message?: string }[] } = {}) {
    super(message); this.code = code; this.status = metadata.status;
    this.requestId = metadata.requestId; this.details = metadata.details ?? [];
  }
}

async function request<T>(path: string, method = 'GET', body?: object, csrf = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (csrf) {
    const token = document.cookie.split('; ').find(item => item.startsWith('__Host-pos_csrf='))?.slice('__Host-pos_csrf='.length);
    if (token) headers['X-CSRF-Token'] = decodeURIComponent(token);
  }
  let response: Response;
  try {
    response = await fetch(`/api/v1/auth/${path}`, { method, headers, credentials: 'same-origin', ...(body ? { body: JSON.stringify(body) } : {}) });
  } catch {
    throw new AuthError('NETWORK_ERROR', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
  if (response.status === 204) return undefined as T;
  let json;
  try {
    json = await response.json();
  } catch {
    throw new AuthError('UNKNOWN', 'Có lỗi xảy ra. Vui lòng thử lại.');
  }
  if (!response.ok) throw new AuthError(json.error?.code ?? 'UNKNOWN', json.error?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.');
  return json.data as T;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const user = (await request<{ user: AuthUser }>('login', 'POST', { username, password })).user;
  rememberRequestIdentity(user); return user;
}
async function me(): Promise<AuthUser> {
  return (await request<{ user: AuthUser }>('me')).user;
}
function canRefresh(error: unknown): boolean {
  return error instanceof AuthError && (error.code === 'UNAUTHENTICATED' || error.code === 'TOKEN_EXPIRED');
}
export async function restoreSession(): Promise<AuthUser | null> {
  try { return await me(); } catch (error) { if (!canRefresh(error)) throw error; }
  if (!navigator.locks) throw new AuthError('UNSUPPORTED', 'Trình duyệt không hỗ trợ khôi phục phiên an toàn.');
  return navigator.locks.request('pos-auth-refresh', async () => {
    try { return await me(); } catch (error) { if (!canRefresh(error)) throw error; }
    try {
      if (!document.cookie.split('; ').some(item => item.startsWith('__Host-pos_csrf='))) await request('csrf');
      await request('refresh', 'POST', undefined, true);
      return await me();
    } catch (error) { if (canRefresh(error)) return null; throw error; }
  });
}
export async function logout(): Promise<void> {
  if (!document.cookie.split('; ').some(item => item.startsWith('__Host-pos_csrf='))) {
    try { await request('csrf'); } catch (error) { if (!canRefresh(error)) throw error; }
  }
  await request('logout', 'POST', undefined, true);
  rememberRequestIdentity(null);
}
export async function changePassword(newPassword: string): Promise<void> {
  if (!document.cookie.split('; ').some(item => item.startsWith('__Host-pos_csrf='))) await request('csrf');
  await request('change-password', 'POST', { newPassword }, true);
  rememberRequestIdentity(null);
}
