import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, SelectField } from '../../components/ui/Field';
import type { OrganizationBranch } from '../../services/organizationService';
import { formatVND } from '../../utils/formatters';
import { validateOrganizationForm } from './organizationForm';
import type { EditorKind, FormValues } from './organizationForm';

interface Props {
  kind: EditorKind; initial: FormValues; editing: boolean; branches: OrganizationBranch[];
  restrictedBranch: boolean; allowedRoles: string[]; busy: boolean; blocked: boolean;
  initialCashLocked?: boolean;
  serverErrors: Record<string, string>; onSubmit: (values: FormValues) => void; onCancel: () => void;
}
export function OrganizationEditor(props: Props) {
  const [values, setValues] = useState(props.initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const change = (field: string, value: string) => {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: '' }));
  };
  const field = (key: string, label: string, maxLength?: number) => <Field key={key} label={label}
    value={values[key] ?? ''} maxLength={maxLength} disabled={props.busy}
    error={errors[key] || props.serverErrors[key]} onChange={event => change(key, event.target.value)} />;
  return <form noValidate onSubmit={event => {
    event.preventDefault();
    const validation = validateOrganizationForm(props.kind, values, props.editing);
    if (Object.keys(validation).length) { setErrors(validation); return; }
    props.onSubmit(values);
  }} style={{ display: 'grid', gap: 16 }}>
    {props.kind === 'branches' && <>
      {props.editing ? <p>Mã chi nhánh: <strong>{values.code}</strong> (không đổi sau khi tạo)</p> : field('code', 'Mã chi nhánh', 10)}
      {field('name', 'Tên chi nhánh', 150)}{field('address', 'Địa chỉ', 255)}{field('phone', 'Điện thoại', 20)}
      <Field label="Quỹ tiền ban đầu" value={values.initialCash} inputMode="numeric" suffix="đ" disabled={props.busy || props.initialCashLocked}
        error={errors.initialCash || props.serverErrors.initialCash} onChange={event => change('initialCash', event.target.value)}
        hint={props.initialCashLocked ? 'Đã khóa sau ca thu ngân đầu tiên.' : 'Là tiền đầu ca của ca thu ngân đầu tiên. Từ ca sau, hệ thống lấy từ tiền đã đếm của ca trước.'} />
      {/^\d+$/.test(values.initialCash) && Number(values.initialCash) <= 1000000000000 && <span className="money">{formatVND(BigInt(values.initialCash))}</span>}
    </>}
    {((props.kind === 'tables' && !props.editing && values.requireBranch === 'true') || props.kind === 'staff') && <SelectField
      label="Chi nhánh" value={values.branchId} disabled={props.busy || props.restrictedBranch}
      error={errors.branchId || props.serverErrors.branchId} onChange={event => change('branchId', event.target.value)}>
      <option value="">Chọn chi nhánh</option>
      {props.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}{branch.isActive ? '' : ' (Ngưng hoạt động)'}</option>)}
      {props.restrictedBranch && !props.branches.some(branch => branch.id === values.branchId) && <option value={values.branchId}>Chi nhánh của bạn</option>}
    </SelectField>}
    {props.kind === 'tables' && <>
      {field('name', 'Tên bàn', 50)}{field('area', 'Khu vực (không bắt buộc)', 50)}
      <Field label="Số chỗ (không bắt buộc)" inputMode="numeric" value={values.capacity} disabled={props.busy}
        error={errors.capacity || props.serverErrors.capacity} onChange={event => change('capacity', event.target.value)} hint="Để trống nếu chưa xác định số chỗ." />
    </>}
    {props.kind === 'staff' && <>{field('username', 'Tên đăng nhập', 50)}{field('fullName', 'Họ và tên', 150)}</>}
    {(props.kind === 'staff' || props.kind === 'role') && <SelectField label="Vai trò" value={values.role}
      error={errors.role || props.serverErrors.role} disabled={props.busy} onChange={event => change('role', event.target.value)}>
      <option value="">Chọn vai trò</option>
      {props.allowedRoles.map(role => <option key={role} value={role}>{role === 'MANAGER' ? 'Quản lý' : 'Thu ngân'}</option>)}
    </SelectField>}
    {props.kind === 'role' && <p>Đổi vai trò sẽ thu hồi mọi phiên đăng nhập của tài khoản này.</p>}
    <div className="form-actions">
      <Button type="button" variant="secondary" disabled={props.busy} onClick={props.onCancel}>Hủy</Button>
      <Button type="submit" isLoading={props.busy} disabled={props.blocked || props.busy} style={{ minHeight: 56 }}>
        {props.editing || props.kind === 'role' ? 'Lưu thay đổi' : props.kind === 'staff' ? 'Cấp tài khoản' : 'Tạo mới'}
      </Button>
    </div>
  </form>;
}
