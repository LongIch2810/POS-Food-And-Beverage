export type EditorKind = 'branches' | 'tables' | 'staff' | 'role';
export type FormValues = Record<string, string>;

export function validateOrganizationForm(kind: EditorKind, values: FormValues, editing = false): Record<string, string> {
  const errors: Record<string, string> = {};
  const text = (field: string, label: string, max: number, min = 0) => {
    const length = (values[field] ?? '').trim().length;
    if (length < min || length > max) errors[field] = `${label} cần từ ${min} đến ${max} ký tự.`;
  };
  const integer = (field: string, label: string, min: number, max: number, optional = false) => {
    const raw = (values[field] ?? '').trim();
    if (optional && raw === '') return;
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
      errors[field] = `${label} phải là số nguyên từ ${min.toLocaleString('vi-VN')} đến ${max.toLocaleString('vi-VN')}.`;
    }
  };
  if (kind === 'branches') {
    if (!editing) text('code', 'Mã chi nhánh', 10, 2);
    text('name', 'Tên chi nhánh', 150, 1); text('address', 'Địa chỉ', 255); text('phone', 'Điện thoại', 20);
    integer('initialCash', 'Quỹ tiền ban đầu', 0, 1000000000000);
  } else if (kind === 'tables') {
    text('name', 'Tên bàn', 50, 1); text('area', 'Khu vực', 50);
    integer('capacity', 'Số chỗ', 1, 2147483647, true);
  } else if (kind === 'staff') {
    text('username', 'Tên đăng nhập', 50, 1); text('fullName', 'Họ tên', 150, 1);
  }
  if ((kind === 'staff' || (kind === 'tables' && !editing && values.requireBranch === 'true')) && !values.branchId) {
    errors.branchId = 'Chọn chi nhánh cho bản ghi mới.';
  }
  if ((kind === 'staff' || kind === 'role') && !['MANAGER', 'CASHIER'].includes(values.role)) errors.role = 'Chọn vai trò hợp lệ.';
  return errors;
}
