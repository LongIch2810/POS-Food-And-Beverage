import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { menuService, MenuCategory, MenuProduct, MenuTopping } from '../../services/menuService';
import { organizationService, OrganizationBranch, OrganizationTable } from '../../services/organizationService';
import { shiftService, WorkShiftDto } from '../../services/shiftService';
import { InvoiceDetail, OpenInvoice, salesService } from '../../services/salesService';
import { OpenShiftGate } from '../shifts/OpenShiftGate';
import { formatVND } from '../../utils/formatters';

type Tab = 'menu' | 'tables' | 'orders';
type Choice = { product: MenuProduct; sizeId: string; quantity: number; toppingIds: string[]; allowedToppings: MenuTopping[] };
const control: React.CSSProperties = { minHeight: 44, padding: '9px 12px', border: '1px solid var(--color-border-control)', borderRadius: 8, background: 'var(--color-surface)', color: 'var(--color-text)' };

export const LivePosScreen: React.FC<{ activeMode?: 'pos' | 'tables'; initialInvoiceId?: string | null;
  onSwitchToPos?: () => void; onSwitchToTables?: () => void }> = ({ activeMode = 'pos', initialInvoiceId, onSwitchToPos }) => {
  const { session, isOffline } = useAuth();
  const [tab, setTab] = useState<Tab>(activeMode === 'tables' ? 'tables' : 'menu');
  const [branchId, setBranchId] = useState(session.user.branch_id ?? '');
  const [branches, setBranches] = useState<OrganizationBranch[]>([]);
  const [shift, setShift] = useState<WorkShiftDto | null | undefined>();
  const [shiftRevision, setShiftRevision] = useState(0);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [toppings, setToppings] = useState<MenuTopping[]>([]);
  const [tables, setTables] = useState<OrganizationTable[]>([]);
  const [orders, setOrders] = useState<OpenInvoice[]>([]);
  const [selected, setSelected] = useState<InvoiceDetail | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recoveryBlocked, setRecoveryBlocked] = useState(false);
  const [error, setError] = useState('');
  const canSell = session.permissions.includes('pos.sell');
  const canCancel = session.permissions.includes('invoice.cancel_open');
  const ownShift = shift?.status === 'OPEN' && shift.shiftType === 'CASHIER';
  const canWrite = canSell && ownShift && shift.branchId === branchId && !isOffline && !recoveryBlocked;

  useEffect(() => { setTab(activeMode === 'tables' ? 'tables' : 'menu'); }, [activeMode]);
  useEffect(() => { setBranchId(session.user.branch_id ?? ''); setSelected(null); }, [session.user.id, session.user.branch_id]);
  useEffect(() => {
    let live = true;
    if (session.user.branch_id) return;
    void organizationService.getBranchChoices().then(rows => {
      if (live) { setBranches(rows); setBranchId(current => current || rows.find(row => row.isActive)?.id || rows[0]?.id || ''); }
    }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Không tải được chi nhánh.'); });
    return () => { live = false; };
  }, [session.user.id, session.user.branch_id]);
  useEffect(() => {
    let live = true;
    setShift(undefined);
    void shiftService.getCurrentShift().then(value => { if (live) { setShift(value); if (value?.shiftType === 'CASHIER' && !session.user.branch_id) setBranchId(value.branchId); } })
      .catch(e => { if (live) { setShift(null); setError(e instanceof Error ? e.message : 'Không tải được ca hiện tại.'); } });
    return () => { live = false; };
  }, [session.user.id, shiftRevision]);

  const refreshOrders = async (wantedId?: string | null) => {
    const rows: OpenInvoice[] = [];
    let cursor: string | undefined;
    do {
      const page = await salesService.listOpen(branchId || undefined, cursor);
      rows.push(...page.data); cursor = page.meta.nextCursor ?? undefined;
    } while (cursor);
    setOrders(rows);
    if (wantedId) {
      const detail = await salesService.get(wantedId);
      setSelected(detail.branchId === branchId || !branchId ? detail : null);
    } else if (selected && !rows.some(order => order.id === selected.id)) setSelected(null);
    setRecoveryBlocked(false);
  };

  useEffect(() => {
    if (!branchId) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError(''); setSelected(null); setOrders([]); setTables([]);
    const allTables = async () => { const rows: OrganizationTable[] = []; let cursor: string | undefined;
      do { const page = await organizationService.getTables({ branchId, limit: 100, cursor }); rows.push(...page.data); cursor = page.meta.nextCursor ?? undefined; } while (cursor);
      return rows; };
    const allOrders = async () => { const rows: OpenInvoice[] = []; let cursor: string | undefined;
      do { const page = await salesService.listOpen(branchId, cursor); rows.push(...page.data); cursor = page.meta.nextCursor ?? undefined; } while (cursor);
      return rows; };
    void Promise.all([menuService.getAllCategories(), menuService.getAllProducts(), menuService.getAllToppings(),
      allTables(), allOrders()]).then(
      ([cats, prods, tops, tableRows, orderRows]) => {
        if (!live) return;
        setCategories(cats.filter(c => c.isActive)); setProducts(prods.filter(p => p.isActive));
        setToppings(tops.filter(t => t.isActive)); setTables(tableRows.filter(t => t.isActive));
        setOrders(orderRows); setCategoryId(cats.find(c => c.isActive)?.id || ''); setRecoveryBlocked(false);
        if (initialInvoiceId) void salesService.get(initialInvoiceId).then(detail => {
          if (live && detail.branchId === branchId) setSelected(detail);
        }).catch(() => {});
      }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Không tải được POS.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [session.user.id, branchId]);

  const perform = async (action: () => Promise<InvoiceDetail>, success?: string) => {
    if (busy || !canWrite) return;
    setBusy(true); setError('');
    try {
      const detail = await action(); setSelected(detail); await refreshOrders();
      if (success) setError(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa xác nhận được kết quả. Tải lại danh sách trước khi thử lại.');
      try { await refreshOrders(selected?.id); } catch { setRecoveryBlocked(true); }
    } finally { setBusy(false); }
  };
  const openTable = async (table: OrganizationTable) => {
    if (busy) return;
    const current = orders.find(order => order.tableId === table.id);
    if (current) {
      setLoading(true);
      try { setSelected(await salesService.get(current.id)); setTab('menu'); onSwitchToPos?.(); }
      catch (e) { setError(e instanceof Error ? e.message : 'Không tải được đơn.'); }
      finally { setLoading(false); }
    } else await perform(() => salesService.create({ orderType: 'DINE_IN', tableId: table.id }));
  };
  const addChoice = async () => {
    if (!choice || !selected || !canWrite) return;
    const picked = choice;
    setChoice(null);
    await perform(() => salesService.addItem(selected.id, { productSizeId: picked.sizeId, quantity: picked.quantity,
      toppings: picked.toppingIds.map(toppingId => ({ toppingId, quantity: 1 })) }));
  };
  const openProduct = async (product: MenuProduct) => {
    setError('');
    try {
      const linked = await menuService.getCategoryToppings(product.categoryId);
      const linkedIds = new Set(linked.map(topping => topping.id));
      setChoice({ product, sizeId: product.sizes.find(size => size.isActive)?.id || '', quantity: 1, toppingIds: [],
        allowedToppings: toppings.filter(topping => linkedIds.has(topping.id)) });
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được topping của món.'); }
  };
  const remove = async (itemId: string) => {
    if (!selected || busy || !canWrite) return;
    setBusy(true); setError('');
    try { await salesService.removeItem(itemId); setSelected(await salesService.get(selected.id)); await refreshOrders(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không xóa được món.');
      try { await refreshOrders(selected.id); } catch { setRecoveryBlocked(true); } }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!selected || !canCancel) return;
    const reason = window.prompt('Lý do hủy đơn (bắt buộc):');
    if (reason === null) return;
    if (!reason.trim()) { setError('Cần nhập lý do hủy đơn.'); return; }
    await perform(() => salesService.cancel(selected.id, reason.trim()));
  };

  if (shift === undefined) return <div role="status" style={{ padding: 24 }}>Đang tải ca hiện tại...</div>;
  if (canSell && !ownShift) return <OpenShiftGate branchId={branchId} branchName={branches.find(b => b.id === branchId)?.name || session.branch_name || 'Chi nhánh'}
    onShiftOpened={() => setShiftRevision(value => value + 1)} />;

  return <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden' }}>
    <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 16 }}>
      {session.user.branch_id === null && <label>Chi nhánh <select aria-label="Chi nhánh bán hàng" style={control} value={branchId} disabled={busy || loading}
        onChange={e => setBranchId(e.target.value)}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}{branch.isActive ? '' : ' (ngưng hoạt động)'}</option>)}</select></label>}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
        {(['menu', 'tables', 'orders'] as const).map(value => <button key={value} type="button" style={{ ...control, fontWeight: tab === value ? 700 : 400 }}
          onClick={() => setTab(value)}>{value === 'menu' ? 'Thực đơn' : value === 'tables' ? 'Sơ đồ bàn' : 'Đơn đang mở'}</button>)}
        <button type="button" style={control} disabled={busy || loading} onClick={() => { setBusy(true);
          void refreshOrders(selected?.id).catch(e => { setRecoveryBlocked(true); setError(e instanceof Error ? e.message : 'Không tải lại được đơn.'); }).finally(() => setBusy(false)); }}>Tải lại đơn</button>
      </div>
      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {recoveryBlocked && <p role="alert">Chưa đối chiếu được kết quả trên server. Hãy tải lại đơn trước khi thao tác tiếp.</p>}
      {loading && <p role="status">Đang tải dữ liệu...</p>}
      {isOffline && <p role="status">Mất kết nối. Không thể sửa đơn lúc này.</p>}
      {!loading && tab === 'tables' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
        {tables.map(table => { const occupied = orders.find(order => order.tableId === table.id);
          return <button type="button" key={table.id} style={control} disabled={busy || (!occupied && !canWrite)} onClick={() => void openTable(table)}>
            <strong>{table.name}</strong><br />{occupied ? `Đang phục vụ · ${occupied.invoiceCode}` : 'Trống'}
          </button>; })}
      </div>}
      {!loading && tab === 'orders' && <div style={{ display: 'grid', gap: 8 }}>
        {canWrite && <button type="button" style={control} disabled={busy} onClick={() => void perform(() => salesService.create({ orderType: 'TAKEAWAY' }))}>+ Đơn mang đi</button>}
        {orders.length === 0 && <p>Chưa có đơn đang mở.</p>}
        {orders.map(order => <button type="button" key={order.id} style={{ ...control, textAlign: 'left' }} onClick={() => {
          setLoading(true); void salesService.get(order.id).then(setSelected).catch(e => setError(e.message)).finally(() => setLoading(false));
        }}>{order.invoiceCode} · {order.orderType === 'TAKEAWAY' ? 'Mang đi' : tables.find(t => t.id === order.tableId)?.name || 'Tại bàn'} · {formatVND(order.totalAmount)}</button>)}
      </div>}
      {!loading && tab === 'menu' && <>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12 }}>{categories.map(category => <button key={category.id} type="button"
          style={{ ...control, fontWeight: categoryId === category.id ? 700 : 400 }} onClick={() => setCategoryId(category.id)}>{category.name}</button>)}</div>
        {!selected && <p>Chọn bàn hoặc mở đơn mang đi trước khi thêm món. <button type="button" style={control} disabled={!canWrite || busy}
          onClick={() => void perform(() => salesService.create({ orderType: 'TAKEAWAY' }))}>Tạo đơn mang đi</button></p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          {products.filter(product => product.categoryId === categoryId).map(product => <button key={product.id} type="button" style={{ ...control, textAlign: 'left' }}
            disabled={!selected || !canWrite || busy || !product.sizes.some(size => size.isActive)}
            onClick={() => void openProduct(product)}>
            <strong>{product.name}</strong><br />{product.sizes.filter(size => size.isActive).map(size => formatVND(size.price)).join(' · ')}
          </button>)}
        </div>
      </>}
    </main>
    <aside style={{ width: 'min(400px,42vw)', minWidth: 280, overflowY: 'auto', padding: 16, borderLeft: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
      {selected ? <>
        <h2>{selected.invoiceCode}</h2>
        <p>{selected.orderType === 'TAKEAWAY' ? 'Mang đi' : tables.find(t => t.id === selected.tableId)?.name || 'Tại bàn'} · {selected.status}</p>
        {selected.items.map(item => <div key={item.id} style={{ borderTop: '1px solid var(--color-border)', padding: '12px 0' }}>
          <strong>{item.productName} · {item.sizeName}</strong><div>{item.toppings.map(t => `${t.toppingName} × ${t.quantity}`).join(', ')}</div>
          <div>{formatVND(item.lineTotal)}</div>
          {selected.status === 'OPEN' && canWrite && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" style={control} disabled={busy || item.quantity <= 1} onClick={() => void perform(() => salesService.updateItem(item.id, { quantity: item.quantity - 1 }))}>−</button>
            <span>{item.quantity}</span>
            <button type="button" style={control} disabled={busy} onClick={() => void perform(() => salesService.updateItem(item.id, { quantity: item.quantity + 1 }))}>+</button>
            <button type="button" style={control} disabled={busy} onClick={() => void remove(item.id)}>Xóa</button>
          </div>}
        </div>)}
        <h3>Tổng: {formatVND(selected.totalAmount)}</h3>
        {selected.status === 'OPEN' && canWrite && selected.orderType === 'DINE_IN' && <label>Chuyển bàn <select aria-label="Bàn đích" style={control} defaultValue=""
          onChange={e => { if (e.target.value && selected && window.confirm('Chuyển đơn sang bàn đã chọn?')) void perform(() => salesService.transfer(selected.id, e.target.value)); e.target.value = ''; }}>
          <option value="">Chọn bàn trống</option>{tables.filter(t => t.id !== selected.tableId && !orders.some(o => o.tableId === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select></label>}
        {selected.status === 'OPEN' && canWrite && canCancel && <button type="button" style={{ ...control, marginTop: 12 }} disabled={busy} onClick={() => void cancel()}>Hủy đơn</button>}
        <p>Thanh toán và khuyến mãi sẽ được triển khai ở sprint sau.</p>
      </> : <p>Chưa chọn đơn. Mở sơ đồ bàn hoặc danh sách đơn đang mở.</p>}
    </aside>
    {choice && <div role="dialog" aria-modal="true" aria-label="Chọn món" style={{ position: 'fixed', inset: 0, background: '#0008', display: 'grid', placeItems: 'center', zIndex: 100 }}>
      <div style={{ background: 'var(--color-surface)', color: 'var(--color-text)', padding: 24, borderRadius: 12, width: 'min(400px,90vw)', maxHeight: '85vh', overflowY: 'auto' }}>
        <h2>{choice.product.name}</h2>
        <label>Size <select style={control} value={choice.sizeId} onChange={e => setChoice({ ...choice, sizeId: e.target.value })}>
          {choice.product.sizes.filter(size => size.isActive).map(size => <option key={size.id} value={size.id}>{size.sizeName} · {formatVND(size.price)}</option>)}
        </select></label>
        <label style={{ display: 'block', marginTop: 12 }}>Số lượng <input style={control} type="number" min="1" max="1000" value={choice.quantity}
          onChange={e => setChoice({ ...choice, quantity: Number(e.target.value) })} /></label>
        <p>Topping</p>{choice.allowedToppings.map(topping => <label key={topping.id} style={{ display: 'block', padding: 6 }}><input type="checkbox"
          checked={choice.toppingIds.includes(topping.id)} onChange={e => setChoice({ ...choice,
            toppingIds: e.target.checked ? [...choice.toppingIds, topping.id] : choice.toppingIds.filter(id => id !== topping.id) })} /> {topping.name} · {formatVND(topping.price)}</label>)}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button type="button" style={control} onClick={() => setChoice(null)}>Đóng</button>
          <button type="button" style={control} disabled={!choice.sizeId || !Number.isInteger(choice.quantity) || choice.quantity < 1 || choice.quantity > 1000 || busy}
            onClick={() => void addChoice()}>Thêm vào đơn</button></div>
      </div>
    </div>}
  </div>;
};
