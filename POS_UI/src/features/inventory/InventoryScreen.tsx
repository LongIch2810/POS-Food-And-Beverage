import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { organizationService, OrganizationBranch } from '../../services/organizationService';
import { inventoryService, Ingredient, Stock, Movement } from './inventoryService';
import { formatDateTimeVN } from '../../utils/formatters';
import { RefreshCw, XCircle } from 'lucide-react';

import type { InventoryTab } from '../../app/routes';
type InventoryProps = { tab?: InventoryTab; onTabChange?: (tab: InventoryTab) => void };
// Nhãn loại bút toán kho theo từ vựng DESIGN.md §9.2
const movementKinds: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral' }> = {
  IMPORT: { label: 'Nhập kho', variant: 'success' }, SALE: { label: 'Xuất bán', variant: 'info' },
  SALE_REVERSAL: { label: 'Hoàn trả kho', variant: 'neutral' }, WASTE: { label: 'Hao hụt', variant: 'danger' },
  ADJUST: { label: 'Kiểm kê', variant: 'warning' },
};
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Không tải được dữ liệu kho. Vui lòng thử lại.';

export const InventoryScreen: React.FC<InventoryProps> = ({ tab, onTabChange } = {}) => {
  const { session } = useAuth();
  const identity = JSON.stringify([session.user.id,session.user.store_id,session.user.branch_id,
    session.user.role_code,session.user.must_change_password,[...session.permissions].sort()]);
  return <InventoryContent key={identity} tab={tab} onTabChange={onTabChange} />;
};

const InventoryContent: React.FC<InventoryProps> = props => {
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const { session } = useAuth();
  const { showToast } = useToast();
  const canManage = session.permissions.includes('inventory.manage');
  const allBranches = session.permissions.includes('branch.access_all');
  const [branchId, setBranchId] = useState(session.user.branch_id ?? '');
  const [branches, setBranches] = useState<OrganizationBranch[]>([]);
  const [ownTab, setOwnTab] = useState<InventoryTab>('stocks');
  const tab = props.tab ?? ownTab;
  const selectTab = (next: InventoryTab) => { setOwnTab(next); props.onTabChange?.(next); };
  const [result, setResult] = useState<{ key: string; rows?: unknown[]; error?: string } | null>(null);
  const [branchError, setBranchError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Ingredient | null | undefined>();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<Ingredient['unit']>('g');
  const [minEditor, setMinEditor] = useState<Stock | null>(null);
  const [minStock, setMinStock] = useState('0');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setEditing(undefined); setMinEditor(null); }, [tab]);
  // Chỉ nhận dòng thuộc đúng tab, chi nhánh và lần tải hiện hành (M-11)
  const viewKey = JSON.stringify([tab, allBranches && tab !== 'catalog' ? branchId : '', revision]);
  const loading = result?.key !== viewKey;
  const error = !loading ? result?.error ?? '' : '';
  const rows = !loading && !result?.error ? result?.rows ?? [] : [];

  useEffect(() => {
    if (!allBranches) return;
    let live = true;
    organizationService.getBranchChoices().then(rows => { if (live) setBranches([...rows].sort((a, b) => a.name.localeCompare(b.name, 'vi'))); })
      .catch(err => { if (live) setBranchError(errorText(err)); });
    return () => { live = false; };
  }, [allBranches]);

  useEffect(() => {
    let live = true;
    const scope = allBranches ? branchId || undefined : undefined;
    const load: Promise<unknown[]> = tab === 'stocks' ? inventoryService.stocks(scope) : tab === 'movements' ? inventoryService.movements(scope) : inventoryService.ingredients();
    load.then(data => { if (live) setResult({ key: viewKey, rows: data }); })
      .catch(err => { if (live) setResult({ key: viewKey, error: errorText(err) }); });
    return () => { live = false; };
  }, [viewKey]);

  const refresh = () => setRevision(value => value + 1);
  const saveIngredient = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      if (editing) await inventoryService.patchIngredient(editing.id, { name, unit });
      else await inventoryService.createIngredient(name, unit);
      if (mounted.current) { setEditing(undefined); refresh(); showToast({ type: 'success', message: 'Đã lưu nguyên liệu.' }); }
    } catch (err) { if (mounted.current) showToast({ type: 'error', message: errorText(err) }); }
    finally { if (mounted.current) setBusy(false); }
  };
  const toggle = async (item: Ingredient) => {
    try { await inventoryService.patchIngredient(item.id, { isActive: !item.isActive }); if (mounted.current) refresh(); }
    catch (err) { if (mounted.current) showToast({ type: 'error', message: errorText(err) }); }
  };
  const saveMin = async (event: React.FormEvent) => {
    event.preventDefault(); if (!minEditor) return;
    setBusy(true);
    try {
      await inventoryService.setMin(minEditor.ingredientId, minStock, allBranches ? minEditor.branchId : undefined);
      if (mounted.current) { setMinEditor(null); refresh(); showToast({ type: 'success', message: 'Đã cập nhật ngưỡng tồn.' }); }
    } catch (err) { if (mounted.current) showToast({ type: 'error', message: errorText(err) }); }
    finally { if (mounted.current) setBusy(false); }
  };

  const stockColumns: Column<Stock>[] = [
    { key: 'ingredient', header: 'Nguyên liệu', render: row => <strong>{row.ingredientName}</strong> },
    ...(allBranches && !branchId ? [{ key: 'branch', header: 'Chi nhánh', render: (row: Stock) =>
      branches.find(branch => branch.id === row.branchId)?.name ?? row.branchId }] : []),
    { key: 'stock', header: 'Tồn hiện tại', align: 'right', render: row => <span className="num">{row.currentStock} {row.unit}</span> },
    { key: 'min', header: 'Ngưỡng tối thiểu', align: 'right', render: row => <span className="num">{row.minStock} {row.unit}</span> },
    { key: 'status', header: 'Trạng thái', render: row => Number(row.currentStock) < Number(row.minStock)
      ? <Badge variant="danger" size="sm">Dưới ngưỡng</Badge> : <Badge variant="success" size="sm">Đủ tồn</Badge> },
    ...(canManage ? [{ key: 'action', header: 'Thao tác', render: (row: Stock) =>
      <Button variant="text" size="sm" onClick={() => { setMinEditor(row); setMinStock(row.minStock); }}>Đặt ngưỡng</Button> }] : []),
  ];
  const ingredientColumns: Column<Ingredient>[] = [
    { key: 'name', header: 'Nguyên liệu', render: row => <strong>{row.name}</strong> },
    { key: 'unit', header: 'Đơn vị', render: row => row.unit },
    { key: 'status', header: 'Trạng thái', render: row => <Badge variant={row.isActive ? 'success' : 'neutral'} size="sm">
      {row.isActive ? 'Đang dùng' : 'Ngưng dùng'}</Badge> },
    ...(canManage ? [{ key: 'action', header: 'Thao tác', render: (row: Ingredient) => <div style={{ display: 'flex', gap: 8 }}>
      <Button variant="text" size="sm" onClick={() => { setEditing(row); setName(row.name); setUnit(row.unit); }}>Sửa</Button>
      <Button variant="text" size="sm" onClick={() => toggle(row)}>{row.isActive ? 'Ngưng dùng' : 'Dùng lại'}</Button>
    </div> }] : []),
  ];
  const movementColumns: Column<Movement>[] = [
    { key: 'time', header: 'Thời gian', render: row => formatDateTimeVN(row.createdAt) },
    { key: 'ingredient', header: 'Nguyên liệu', render: row => row.ingredientName },
    ...(allBranches && !branchId ? [{ key: 'branch', header: 'Chi nhánh', render: (row: Movement) => row.branchName }] : []),
    { key: 'type', header: 'Loại', render: row => { const kind = movementKinds[row.type];
      return kind ? <Badge variant={kind.variant} size="sm">{kind.label}</Badge> : row.type; } },
    { key: 'quantity', header: 'Thay đổi', align: 'right', render: row => `${Number(row.quantity) > 0 ? '+' : ''}${row.quantity} ${row.unit}` },
    { key: 'balance', header: 'Tồn sau', align: 'right', render: row => `${row.balanceAfter} ${row.unit}` },
    { key: 'note', header: 'Ghi chú', render: row => row.note || row.invoiceCode || '—' },
  ];

  return <div style={{ flex: 1, padding: 'clamp(14px, 2.5vw, 24px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div><h1 style={{ fontSize: 22, lineHeight: '30px', fontWeight: 600 }}>Kho & nguyên liệu</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Tồn và sổ kho theo chi nhánh; các bút toán được ghi khi nghiệp vụ phát sinh.</p></div>
      {canManage && tab === 'catalog' && <Button variant="primary" onClick={() => { setEditing(null); setName(''); setUnit('g'); }}>Thêm nguyên liệu</Button>}
    </header>
    <div className="page-bar">
      <nav aria-label="Mục kho" className="page-tabs">
        {([['stocks','Tồn kho'],['movements','Sổ kho'],['catalog','Nguyên liệu']] as const).map(([key,title]) =>
          <button key={key} type="button" className="tab" aria-current={tab === key ? 'true' : undefined} onClick={() => selectTab(key)}>{title}</button>)}
      </nav>
      <div className="page-bar-end">
        {allBranches && <label className="field page-inline-field">Chi nhánh
          <select aria-label="Chi nhánh kho" className="select" value={branchId} onChange={event => setBranchId(event.target.value)}>
            <option value="">Tất cả chi nhánh</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select></label>}
        <button type="button" className="btn btn-secondary" onClick={refresh}><RefreshCw size={18} />Tải lại</button>
      </div>
    </div>
    {branchError && <div role="alert" className="notice notice-danger"><XCircle size={18} /><span>{branchError}</span></div>}
    {error && <div role="alert" className="notice notice-danger"><XCircle size={18} /><span>{error}</span>
      <button type="button" className="btn btn-text" style={{ marginLeft: 'auto' }} onClick={refresh}>Thử lại</button></div>}
    {loading ? <div role="status"><span className="sr-only">Đang tải dữ liệu kho…</span>
      <div className="page-skeleton" aria-hidden="true"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div></div> : !error && (tab === 'stocks'
      ? <DataTable columns={stockColumns} data={rows as Stock[]} keyExtractor={row => `${row.branchId}:${row.ingredientId}`} emptyMessage="Chưa có nguyên liệu trong kho" />
      : tab === 'movements' ? <DataTable columns={movementColumns} data={rows as Movement[]} keyExtractor={row => row.id} emptyMessage="Chưa có bút toán kho" />
      : <DataTable columns={ingredientColumns} data={rows as Ingredient[]} keyExtractor={row => row.id} emptyMessage="Chưa có nguyên liệu" />)}
    <Dialog isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu'} maxWidth={420}>
      <form onSubmit={saveIngredient} style={{ display: 'grid', gap: 16 }}>
        <Field label="Tên nguyên liệu" value={name} onChange={event => setName(event.target.value)} required />
        <label className="field">Đơn vị gốc <select className="select" value={unit} onChange={event => setUnit(event.target.value as Ingredient['unit'])}>
          <option value="g">Gram (g)</option><option value="ml">Mililít (ml)</option><option value="piece">Cái (piece)</option>
        </select></label>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu nguyên liệu'}</Button>
      </form>
    </Dialog>
    <Dialog isOpen={!!minEditor} onClose={() => setMinEditor(null)} title="Đặt ngưỡng tồn" maxWidth={420}>
      <form onSubmit={saveMin} style={{ display: 'grid', gap: 16 }}>
        <p>{minEditor?.ingredientName} · {minEditor?.unit}</p>
        <Field label="Ngưỡng tối thiểu" type="number" min="0" step="0.001" value={minStock} onChange={event => setMinStock(event.target.value)} required />
        <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu ngưỡng'}</Button>
      </form>
    </Dialog>
  </div>;
};
