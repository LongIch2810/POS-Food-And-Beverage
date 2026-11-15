import type { AuthUser } from './client';
import type { AuthSession, PermissionCode, RoleCode } from '../types/auth';

export function toUiSession(user: AuthUser): AuthSession {
  return { user: { id: user.id, username: user.username, full_name: user.fullName,
    role_code: user.role as RoleCode, store_id: user.storeId, branch_id: user.branchId,
    must_change_password: user.mustChangePassword, is_active: true, created_at: '' },
    permissions: user.permissions as PermissionCode[], branch_name: user.branchName ?? undefined };
}
