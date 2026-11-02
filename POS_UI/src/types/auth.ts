// POS-F&B Authentication & Authorization Types per BR-01 to BR-06, BR-70 to BR-85

export type RoleCode = 'PLATFORM_ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER';

export type PermissionCode =
  | 'store.read'
  | 'store.create'
  | 'store.suspend'
  | 'user.read_owner'
  | 'user.create_owner'
  | 'user.reset_owner_password'
  | 'store.manage' // Quản lý tạo/khóa store (chỉ PLATFORM_ADMIN)
  | 'role.manage_permissions' // Chỉnh sửa quyền dùng chung (chỉ PLATFORM_ADMIN)
  | 'branch.access_all' // Xem toàn bộ chi nhánh của store (chỉ OWNER)
  | 'branch.read'
  | 'user.manage'
  | 'branch.manage' // Quản lý chi nhánh & nhân viên
  | 'table.manage' // Quản lý bàn
  | 'product.manage' // Quản lý menu, size, topping, công thức, mã giảm giá
  | 'shift.open_close' // Mở và đóng ca của mình
  | 'shift.force_close' // Đóng cưỡng chế ca của người khác (MANAGER, OWNER)
  | 'pos.sell' // Bán hàng, tạo đơn, thanh toán
  | 'invoice.cancel_open' // Hủy đơn OPEN
  | 'invoice.cancel_paid' // Hủy đơn PAID (cần quyền quản lý & ca còn mở)
  | 'inventory.view' // Xem tồn kho và sổ kho
  | 'report.view_shift' // Xem báo cáo ca của mình
  | 'report.view_branch' // Xem báo cáo chi nhánh của mình
  | 'report.view_all'; // Xem báo cáo toàn cửa hàng

export interface User {
  id: string;
  store_id: string | null; // NULL đối với PLATFORM_ADMIN
  branch_id: string | null; // NULL đối với OWNER và PLATFORM_ADMIN
  role_code: RoleCode;
  username: string;
  full_name: string;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DemoAccount {
  id: string;
  username: string;
  full_name: string;
  role_code: RoleCode;
  role_title: string;
  store_id: string | null;
  store_name?: string;
  branch_id: string | null;
  branch_name?: string;
  note: string;
}

export interface AuthSession {
  user: User;
  permissions: PermissionCode[];
  store_name?: string;
  branch_name?: string;
}
