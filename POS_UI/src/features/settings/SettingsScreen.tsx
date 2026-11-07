import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthError } from '../../auth/client';
import { notifySessionChange } from '../../auth/session-events';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { SelectField } from '../../components/ui/Field';
import { organizationService as service } from '../../services/organizationService';
import { shiftService } from '../../services/shiftService';
import type { OrganizationBranch, OrganizationTable, OrganizationStaff, StaffPassword } from '../../services/organizationService';
import type { AuthSession } from '../../types/auth';
import { formatVND } from '../../utils/formatters';
import { OrganizationEditor } from './OrganizationEditor';
import { PromotionsPanel } from './PromotionsPanel';
import type { EditorKind, FormValues } from './organizationForm';

type Tab = 'branches' | 'tables' | 'staff';
type Row = OrganizationBranch | OrganizationTable | OrganizationStaff;
type View = { tab: Tab; branch: string; status: string; role: string; cursors: (string | undefined)[] };
type Editor = { kind: EditorKind; row?: Row };
type Confirmation = { action: 'toggle' | 'reset'; tab: Tab; row: Row };
const titles = { branches: 'Chi nhánh', tables: 'Bàn', staff: 'Tài khoản' };
const permissions = { branches: 'branch.manage', tables: 'table.manage', staff: 'user.manage' } as const;
const label = (row: Row) => 'fullName' in row ? row.fullName : row.name;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Chưa thực hiện được. Vui lòng thử lại.';
const nullable = (value: string) => value.trim() || null;

export const SettingsScreen: React.FC = () => {
  const { session } = useAuth();
  const [section, setSection] = useState<'organization'|'promotions'>('organization');
  const identity = JSON.stringify([session.user.id, session.user.store_id, session.user.branch_id,
    session.user.role_code, session.user.must_change_password, [...session.permissions].sort()]);
  return <div key={identity} style={{ flex:1, display:'flex', flexDirection:'column', overflow:'auto' }}>
    {session.permissions.includes('promotion.manage') && <nav aria-label="Mục cài đặt" style={{ display:'flex', gap:8, padding:'12px 24px' }}>
      <Button variant={section === 'organization' ? 'primary' : 'secondary'} onClick={() => setSection('organization')}>Tổ chức</Button>
      <Button variant={section === 'promotions' ? 'primary' : 'secondary'} onClick={() => setSection('promotions')}>Khuyến mãi</Button>
    </nav>}
    {section === 'promotions' && session.permissions.includes('promotion.manage')
      ? <PromotionsPanel key={identity} /> : <SettingsContent key={identity} session={session} />}
  </div>;
};

export function SettingsContent({ session }: { session: AuthSession }) {
  const { showToast } = useToast();
  const allowed = (Object.keys(permissions) as Tab[]).filter(tab => session.permissions.includes(permissions[tab]));
  const allBranches = session.permissions.includes('branch.access_all');
  const roles = session.user.role_code === 'OWNER' ? ['MANAGER', 'CASHIER'] : session.user.role_code === 'MANAGER' ? ['CASHIER'] : [];
  const [view, setView] = useState<View>({ tab: allowed[0] ?? 'tables', branch: '', status: '', role: '', cursors: [undefined] });
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsKey, setRowsKey] = useState('');
  const [meta, setMeta] = useState({ nextCursor: null as string | null, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState({ branches: 0, tables: 0, staff: 0 });
  const [branches, setBranches] = useState<OrganizationBranch[]>([]);
  const [cashLockedByBranch, setCashLockedByBranch] = useState<Record<string, boolean>>({});
  const [choicesLoading, setChoicesLoading] = useState(true);
  const [choicesError, setChoicesError] = useState('');
  const [choicesRevision, setChoicesRevision] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [temporary, setTemporary] = useState<{ username: string; password: string; self: boolean } | null>(null);
  const [savedPassword, setSavedPassword] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(() => navigator.onLine === false);
  const live = useRef(true);
  const pending = useRef(false);
  const generation = useRef(0);
  const viewKey = JSON.stringify(view);
  const currentView = useRef(viewKey);
  currentView.current = viewKey;
  const cursor = view.cursors.at(-1);
  const listPending = loading || rowsKey !== viewKey;

  useEffect(() => {
    live.current = true;
    const update = () => setOffline(navigator.onLine === false);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { live.current = false; window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    let active = true;
    setChoicesLoading(true); setChoicesError('');
    if (!session.permissions.includes('branch.read')) {
      setChoicesLoading(false); setChoicesError('Bạn chưa có quyền tải danh mục chi nhánh.'); return;
    }
    service.getBranchChoices().then(result => { if (active) setBranches(result); })
      .catch(err => { if (active) setChoicesError(errorMessage(err)); })
      .finally(() => { if (active) setChoicesLoading(false); });
    return () => { active = false; };
  }, [choicesRevision, session.permissions]);

  useEffect(() => {
    if (!allowed.includes(view.tab)) { setLoading(false); return; }
    const version = ++generation.current;
    const valid = () => live.current && version === generation.current;
    setLoading(true); setError(''); setRows([]); setRowsKey(viewKey); setMeta({ total: 0, nextCursor: null });
    const query = { cursor, ...(view.status ? { isActive: view.status === 'true' } : {}),
      ...(view.tab !== 'branches' && allBranches && view.branch ? { branchId: view.branch } : {}),
      ...(view.tab === 'staff' && view.role ? { role: view.role } : {}) };
    const load = view.tab === 'branches' ? service.getBranches(query) : view.tab === 'tables' ? service.getTables(query) : service.getStaff(query);
    load.then(result => { if (valid()) { setRows(result.data); setMeta(result.meta); } })
      .catch(err => { if (valid()) setError(errorMessage(err)); })
      .finally(() => { if (valid()) setLoading(false); });
    return () => { generation.current++; };
  }, [viewKey, revision[view.tab]]);

  const navigate = (update: Partial<View>) => {
    const next = { ...view, ...update };
    const key = JSON.stringify(next);
    if (key === currentView.current) return;
    generation.current++;
    currentView.current = key;
    setView(next);
  };
  const refresh = () => setRevision(current => ({ ...current, [view.tab]: current[view.tab] + 1 }));
  const openEditor = (kind: EditorKind, row?: Row) => {
    setFieldErrors({}); setFormError(''); setEditor({ kind, row });
    if (kind === 'branches' && row) {
      void shiftService.getShifts({ branchId: row.id, limit: 1 }).then(page => {
        if (live.current) setCashLockedByBranch(current => ({ ...current, [row.id]: page.meta.total > 0 }));
      }).catch(() => { /* API vẫn kiểm tra khóa khi lưu. */ });
    }
  };
  const branchName = (id: string) => branches.find(branch => branch.id === id)?.name || (id === session.user.branch_id ? 'Chi nhánh của bạn' : 'Chi nhánh chưa tải');
  const run = async (tab: Tab, action: () => Promise<unknown>, password = false) => {
    if (pending.current || offline) return;
    pending.current = true; setBusy(true); setFormError(''); setFieldErrors({});
    const origin = currentView.current;
    try {
      const result = await action();
      if (!live.current) return;
      setEditor(null); setConfirmation(null);
      if (password) {
        const issued = result as StaffPassword;
        setSavedPassword(false); setCopyError('');
        const self = issued.user.id === session.user.id;
        setTemporary({ username: issued.user.username, password: issued.temporaryPassword, self });
        // Self-reset has revoked this session; a list reload would discard the one-time password.
        if (self) return;
      }
      if (currentView.current === origin) setView(current => ({ ...current, cursors: [undefined] }));
      setRevision(current => ({ ...current, [tab]: current[tab] + 1 }));
      if (tab === 'branches') setChoicesRevision(current => current + 1);
      showToast({ type: 'success', message: 'Đã lưu thay đổi.' });
    } catch (err) {
      if (!live.current) return;
      setFormError(errorMessage(err));
      if (err instanceof AuthError) {
        const fields: Record<string, string> = {};
        for (const detail of err.details) if (detail.location === 'body' && detail.field) fields[detail.field] = detail.message || 'Giá trị không hợp lệ.';
        setFieldErrors(fields);
        if (err.status === 404) setRevision(current => ({ ...current, [tab]: current[tab] + 1 }));
      }
    } finally {
      pending.current = false;
      if (live.current) setBusy(false);
    }
  };

  const submit = (values: FormValues) => {
    if (!editor) return;
    const row = editor.row;
    if (editor.kind === 'branches') {
      const body = { name: values.name.trim(), address: nullable(values.address), phone: nullable(values.phone),
        ...(!row || Number(values.initialCash.trim()) !== (row as OrganizationBranch).initialCash
          ? { initialCash: Number(values.initialCash.trim()) } : {}) };
      void run('branches', () => row ? service.patchBranch(row.id, body) : service.createBranch({ ...body, code: values.code.trim() }));
    } else if (editor.kind === 'tables') {
      const body = { name: values.name.trim(), area: nullable(values.area), capacity: values.capacity.trim() ? Number(values.capacity) : null };
      void run('tables', () => row ? service.patchTable(row.id, body) : service.createTable({ ...body, ...(allBranches ? { branchId: values.branchId } : {}) }));
    } else if (editor.kind === 'staff') {
      void run('staff', () => service.createStaff({ branchId: allBranches ? values.branchId : session.user.branch_id!,
        username: values.username.trim(), fullName: values.fullName.trim(), role: values.role as 'MANAGER' | 'CASHIER' }), true);
    } else if (row) {
      void run('staff', () => service.patchStaff(row.id, { role: values.role as 'MANAGER' | 'CASHIER' }));
    }
  };
  const confirm = () => {
    if (!confirmation) return;
    const { tab, row, action } = confirmation;
    if (action === 'reset') void run('staff', () => service.resetStaffPassword(row.id), true);
    else void run(tab, () => tab === 'branches' ? service.patchBranch(row.id, { isActive: !row.isActive })
      : tab === 'tables' ? service.patchTable(row.id, { isActive: !row.isActive }) : service.patchStaff(row.id, { isActive: !row.isActive }));
  };
  const confirmAction = (action: 'toggle' | 'reset', row: Row) => {
    setFormError(''); setConfirmation({ action, tab: view.tab, row });
  };
  const closeTemporary = () => {
    if (!savedPassword) return;
    const self = temporary?.self;
    setTemporary(null); setSavedPassword(false); setCopyError('');
    if (self) notifySessionChange('revoked');
  };
  const columns: Column<Row>[] = [
    ...(view.tab === 'branches' ? [{ key: 'code', header: 'Mã', render: (row: Row) => (row as OrganizationBranch).code }] : []),
    { key: 'name', header: view.tab === 'staff' ? 'Họ và tên' : 'Tên', render: row => <strong>{label(row)}</strong> },
    ...(view.tab === 'branches' ? [
      { key: 'address', header: 'Địa chỉ', render: (row: Row) => (row as OrganizationBranch).address || '—' },
      { key: 'phone', header: 'Điện thoại', render: (row: Row) => (row as OrganizationBranch).phone || '—' },
      { key: 'cash', header: 'Quỹ tiền ban đầu', align: 'right' as const, render: (row: Row) => <span className="money">{formatVND(BigInt((row as OrganizationBranch).initialCash))}</span> },
    ] : [
      { key: 'branch', header: 'Chi nhánh', render: (row: Row) => branchName((row as OrganizationTable).branchId) },
    ]),
    ...(view.tab === 'tables' ? [
      { key: 'area', header: 'Khu vực', render: (row: Row) => (row as OrganizationTable).area || '—' },
      { key: 'capacity', header: 'Số chỗ', render: (row: Row) => (row as OrganizationTable).capacity ?? 'Chưa xác định' },
    ] : []),
    ...(view.tab === 'staff' ? [
      { key: 'username', header: 'Tên đăng nhập', render: (row: Row) => (row as OrganizationStaff).username },
      { key: 'role', header: 'Vai trò', render: (row: Row) => (row as OrganizationStaff).role === 'MANAGER' ? 'Quản lý' : 'Thu ngân' },
      { key: 'password', header: 'Mật khẩu', render: (row: Row) => (row as OrganizationStaff).mustChangePassword ? <Badge variant="warning">Chờ đổi mật khẩu</Badge> : 'Đã đổi' },
    ] : []),
    { key: 'status', header: 'Trạng thái', render: row => <Badge variant={row.isActive ? 'success' : 'neutral'}>
      {row.isActive ? 'Hoạt động' : view.tab === 'staff' ? 'Đã khóa' : 'Ngưng hoạt động'}</Badge> },
    { key: 'actions', header: 'Thao tác', render: row => <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {view.tab !== 'staff' && <Button variant="secondary" disabled={busy || offline} onClick={() => openEditor(view.tab, row)}>Sửa</Button>}
      {view.tab === 'staff' && <>
        {roles.length > 0 && row.id !== session.user.id && <Button variant="secondary" disabled={busy || offline} onClick={() => openEditor('role', row)}>Đổi vai trò</Button>}
        <Button variant="secondary" disabled={busy || offline} onClick={() => confirmAction('reset', row)}>Đặt lại mật khẩu</Button>
      </>}
      <Button variant={row.isActive ? 'danger' : 'secondary'} disabled={busy || offline || (view.tab === 'staff' && row.id === session.user.id)}
        onClick={() => confirmAction('toggle', row)}>{row.isActive ? view.tab === 'staff' ? 'Khóa' : 'Ngưng dùng' : 'Mở lại'}</Button>
    </div> },
  ];
  const needsChoices = editor?.kind === 'staff' || (editor?.kind === 'tables' && !editor.row && allBranches);
  const choicesBlocked = Boolean(needsChoices && (choicesLoading || choicesError || !branches.length));
  const initial: FormValues = editor ? {
    code: (editor.row as OrganizationBranch)?.code ?? '', name: editor.row && 'name' in editor.row ? editor.row.name : '',
    address: (editor.row as OrganizationBranch)?.address ?? '', phone: (editor.row as OrganizationBranch)?.phone ?? '',
    initialCash: String((editor.row as OrganizationBranch)?.initialCash ?? 0),
    area: (editor.row as OrganizationTable)?.area ?? '', capacity: String((editor.row as OrganizationTable)?.capacity ?? ''),
    username: '', fullName: '', role: (editor.row as OrganizationStaff)?.role ?? (roles.includes('CASHIER') ? 'CASHIER' : ''),
    branchId: allBranches ? view.branch : session.user.branch_id ?? '', requireBranch: String(allBranches),
  } : {};
  if (!allowed.length) return <p role="alert">Bạn không có quyền truy cập Cài đặt.</p>;

  return <section className="organization-settings" aria-label="Cài đặt tổ chức">
    <div><h1>Cài đặt cửa hàng</h1><p>Quản lý chi nhánh, bàn và tài khoản nhân viên.</p></div>
    {offline && <div role="alert">Mất kết nối. Thao tác mới sẽ không được lưu cho đến khi có mạng.</div>}
    <div role="tablist" aria-label="Cài đặt" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {allowed.map(tab => <Button key={tab} role="tab" aria-selected={view.tab === tab} disabled={busy}
        variant={view.tab === tab ? 'primary' : 'secondary'} onClick={() => navigate({ tab, status: '', role: '', branch: '', cursors: [undefined] })}>{titles[tab]}</Button>)}
    </div>
    <div className="organization-filters">
      {allBranches && view.tab !== 'branches' && <SelectField label="Chi nhánh" value={view.branch} disabled={busy || choicesLoading}
        onChange={event => navigate({ branch: event.target.value, cursors: [undefined] })}>
        <option value="">Tất cả chi nhánh</option>
        {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}{branch.isActive ? '' : ' (Ngưng hoạt động)'}</option>)}
      </SelectField>}
      {!allBranches && view.tab !== 'branches' && <p>{branchName(session.user.branch_id ?? '')}</p>}
      <SelectField label="Trạng thái" value={view.status} disabled={busy} onChange={event => navigate({ status: event.target.value, cursors: [undefined] })}>
        <option value="">Tất cả trạng thái</option><option value="true">Hoạt động</option><option value="false">{view.tab === 'staff' ? 'Đã khóa' : 'Ngưng hoạt động'}</option>
      </SelectField>
      {view.tab === 'staff' && <SelectField label="Vai trò" value={view.role} disabled={busy} onChange={event => navigate({ role: event.target.value, cursors: [undefined] })}>
        <option value="">Tất cả vai trò</option><option value="MANAGER">Quản lý</option><option value="CASHIER">Thu ngân</option>
      </SelectField>}
      <Button style={{ minHeight: 56 }} disabled={busy || offline || (view.tab === 'staff' && !roles.length)} onClick={() => openEditor(view.tab)}>
        {view.tab === 'branches' ? 'Thêm chi nhánh' : view.tab === 'tables' ? 'Thêm bàn' : 'Cấp tài khoản'}
      </Button>
    </div>
    {choicesLoading && <p role="status">Đang tải danh mục chi nhánh...</p>}
    {choicesError && <div role="alert"><p>{choicesError}</p><Button variant="secondary" disabled={choicesLoading} onClick={() => setChoicesRevision(value => value + 1)}>Tải lại chi nhánh</Button></div>}
    {!choicesLoading && !choicesError && !branches.length && view.tab !== 'branches' && <p>Chưa có chi nhánh. Tạo chi nhánh trước khi thêm bàn hoặc cấp tài khoản.</p>}
    {listPending && <div role="status" aria-label="Đang tải danh sách" className="organization-skeleton"><span /><span /><span /></div>}
    {rowsKey === viewKey && error && <div role="alert"><p>{error}</p><Button variant="secondary" onClick={refresh}>Thử lại</Button></div>}
    {!listPending && !error && <>
      <DataTable columns={columns} data={rows} keyExtractor={row => row.id}
        emptyMessage={'Chưa có ' + (view.tab === 'branches' ? 'chi nhánh' : view.tab === 'tables' ? 'bàn' : 'tài khoản') + ' phù hợp.'} />
      <div className="organization-pagination">
        <Button variant="secondary" disabled={view.cursors.length === 1 || busy} onClick={() => navigate({ cursors: view.cursors.slice(0, -1) })}>Trang trước</Button>
        <span>Trang {view.cursors.length} · {meta.total} bản ghi</span>
        <Button variant="secondary" disabled={!meta.nextCursor || busy} onClick={() => { if (meta.nextCursor) navigate({ cursors: [...view.cursors, meta.nextCursor] }); }}>Trang sau</Button>
      </div>
    </>}
    <Dialog isOpen={Boolean(editor)} disableClose={busy} onClose={() => setEditor(null)}
      title={editor?.kind === 'role' ? 'Đổi vai trò' : (editor?.row ? 'Sửa ' : 'Thêm ') + (editor?.kind ? titles[editor.kind] : '')}>
      {editor && <>
        {formError && <div role="alert"><p>{formError}</p><Button variant="secondary" onClick={refresh}>Tải lại danh sách</Button></div>}
        {choicesBlocked && <p role="alert">Chưa chọn được chi nhánh. Tải lại danh mục hoặc tạo chi nhánh trước.</p>}
        <OrganizationEditor key={editor.kind + (editor.row?.id ?? 'new')} kind={editor.kind} initial={initial}
          editing={Boolean(editor.row)} branches={branches} restrictedBranch={!allBranches} allowedRoles={roles}
          initialCashLocked={editor.kind === 'branches' && Boolean(editor.row && cashLockedByBranch[editor.row.id])}
          busy={busy} blocked={offline || choicesBlocked} serverErrors={fieldErrors} onSubmit={submit} onCancel={() => setEditor(null)} />
      </>}
    </Dialog>
    <Dialog isOpen={Boolean(confirmation)} disableClose={busy} onClose={() => setConfirmation(null)} title="Xác nhận thay đổi">
      {confirmation && <>
        <p>{confirmation.action === 'reset' ? 'Đặt lại mật khẩu cho ' : confirmation.row.isActive ? 'Ngưng sử dụng / khóa ' : 'Mở lại '}{label(confirmation.row)}?</p>
        {confirmation.tab === 'staff' && <p>{confirmation.action === 'reset' ? 'Mật khẩu hiện tại sẽ hết hiệu lực. Mọi phiên bị thu hồi; tài khoản đang khóa vẫn giữ khóa.'
          : confirmation.row.isActive ? 'Mọi phiên đăng nhập của tài khoản sẽ bị thu hồi.' : 'Các phiên cũ không được khôi phục. Người dùng cần đăng nhập lại.'}</p>}
        {confirmation.tab === 'branches' && <p>Dữ liệu được giữ nguyên. Chi nhánh ngưng hoạt động không mở ca hoặc tạo đơn mới.</p>}
        {formError && <p role="alert">{formError}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>Hủy</Button>
          <Button variant="danger" size="lg" isLoading={busy} disabled={busy || offline} onClick={confirm}>Xác nhận</Button>
        </div>
      </>}
    </Dialog>
    <Dialog isOpen={Boolean(temporary)} disableClose={!savedPassword} title="Mật khẩu tạm"
      onClose={closeTemporary}>
      {temporary && <div style={{ display: 'grid', gap: 16 }}>
        <p>Tài khoản: <strong>{temporary.username}</strong></p>
        <FieldPassword password={temporary.password} />
        <Button variant="secondary" onClick={() => {
          void navigator.clipboard?.writeText(temporary.password).then(() => { if (live.current) setCopyError('Đã sao chép.'); }).catch(() => { if (live.current) setCopyError('Chưa sao chép được. Chọn mật khẩu và sao chép thủ công.'); });
          if (!navigator.clipboard) setCopyError('Chọn mật khẩu và sao chép thủ công.');
        }}>Sao chép mật khẩu</Button>
        {copyError && <p role="status">{copyError}</p>}
        <p>Mật khẩu này chỉ hiển thị một lần. Sao chép và gửi cho người dùng trước khi đóng.</p>
        <label style={{ minHeight: 48, display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="checkbox" checked={savedPassword} onChange={event => setSavedPassword(event.target.checked)} /> Tôi đã lưu mật khẩu
        </label>
        {temporary.self && <p>Phiên hiện tại đã bị thu hồi. Sau khi lưu mật khẩu, bạn cần đăng nhập lại.</p>}
        <Button size="lg" disabled={!savedPassword} onClick={closeTemporary}>Đóng</Button>
      </div>}
    </Dialog>
  </section>;
}

function FieldPassword({ password }: { password: string }) {
  return <label style={{ display: 'grid', gap: 8 }}>Mật khẩu tạm
    <input aria-label="Mật khẩu tạm" readOnly value={password} autoComplete="off" spellCheck={false}
      style={{ width: '100%', height: 48, fontSize: 18, padding: 12, border: '1px solid var(--color-border-control)', borderRadius: 'var(--radius-control)' }} />
  </label>;
}
