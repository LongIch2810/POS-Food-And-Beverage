import { AuthError, restoreSession } from '../auth/client.ts';
import { getRequestIdentity, notifySessionChange, requestIdentityKey } from '../auth/session-events.ts';

export async function request<T>(path: string, method = 'GET', body?: object | FormData, retry = true, list = false): Promise<T> {
  const context = getRequestIdentity();
  const changedSession = () => new AuthError('SESSION_CHANGED', 'Tài khoản hoặc phạm vi đã thay đổi. Hãy mở lại chức năng trước khi thao tác.');
  const headers: Record<string, string> = {};
  if (method !== 'GET') {
    if (!document.cookie.split('; ').some(item => item.startsWith('__Host-pos_csrf='))) await request('auth/csrf');
    const csrf = document.cookie.split('; ').find(item => item.startsWith('__Host-pos_csrf='))?.slice('__Host-pos_csrf='.length);
    if (csrf) headers['X-CSRF-Token'] = decodeURIComponent(csrf);
  }
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body && !isFormData) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && context.epoch !== getRequestIdentity().epoch) throw changedSession();
  let response: Response;
  try {
    response = await fetch(`/api/v1/${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
    });
  } catch { throw new AuthError('NETWORK_ERROR', 'Chưa xác nhận được kết quả. Kiểm tra kết nối và tải lại danh sách trước khi thử lại.'); }
  if (response.status === 401 && retry) {
    try {
      const user = await restoreSession();
      if (user) {
        notifySessionChange('login');
        if ((context.identity !== null || method !== 'GET') &&
          (context.identity !== requestIdentityKey(user) || context.epoch !== getRequestIdentity().epoch)) throw changedSession();
        return request<T>(path, method, body, false, list);
      }
    } catch (error) {
      if (error instanceof AuthError && ['ACCOUNT_DISABLED', 'STORE_SUSPENDED'].includes(error.code)) notifySessionChange('revoked');
      throw error;
    }
    notifySessionChange('revoked');
    throw new AuthError('UNAUTHENTICATED', 'Phiên đã hết hiệu lực. Vui lòng đăng nhập lại.');
  }
  if (response.status === 204) return undefined as T;
  let json;
  try { json = await response.json(); } catch { throw new AuthError('UNKNOWN', 'Chưa đọc được kết quả. Tải lại danh sách trước khi thử lại.'); }
  if (!response.ok) {
    const error = new AuthError(json.error?.code ?? 'UNKNOWN', json.error?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.', {
      status: response.status, requestId: json.error?.requestId ?? response.headers.get('X-Request-Id') ?? undefined,
      details: Array.isArray(json.error?.details) ? json.error.details : [],
    });
    if (response.status === 401 || ['ACCOUNT_DISABLED', 'STORE_SUSPENDED'].includes(error.code)) notifySessionChange('revoked');
    else if (['PASSWORD_CHANGE_REQUIRED', 'PERMISSION_DENIED'].includes(error.code)) notifySessionChange('login');
    throw error;
  }
  return (list ? json : json.data) as T;
}
