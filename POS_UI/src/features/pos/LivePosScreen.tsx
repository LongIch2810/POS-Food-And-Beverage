import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { menuService, MenuCategory, MenuProduct, MenuTopping } from '../../services/menuService';
import { organizationService, OrganizationBranch, OrganizationTable } from '../../services/organizationService';
import { shiftService, WorkShiftDto } from '../../services/shiftService';
import { InvoiceDetail, OpenInvoice, salesService } from '../../services/salesService';
import { OpenShiftGate } from '../shifts/OpenShiftGate';
import { formatVND } from '../../utils/formatters';
import { LivePaymentDialog } from './LivePaymentDialog';
import { Dialog } from '../../components/ui/Dialog';
import { AlertTriangle, Armchair, Ban, CircleCheck, ClipboardList, Clock, CreditCard, Info, LayoutGrid, Minus, Plus, RefreshCw,
  ShoppingBag, Trash2, UtensilsCrossed, WifiOff, XCircle } from 'lucide-react';

type Tab = 'menu' | 'tables' | 'orders';
type Choice = { product: MenuProduct; sizeId: string; quantity: number; toppingIds: string[]; allowedToppings: MenuTopping[] };

// Nhãn trạng thái hóa đơn theo DESIGN.md §6.4 (luôn có biểu tượng và chữ)
const orderStatus = (value: string) => value === 'PAID' ? { label: 'Đã thanh toán', tone: 'success', icon: <CircleCheck size={14} /> }
  : value === 'CANCELLED' ? { label: 'Đã hủy', tone: 'danger', icon: <XCircle size={14} /> }
  : { label: 'Đang mở', tone: 'info', icon: <Info size={14} /> };

// Thời lượng bằng chữ (DESIGN.md §10): "25 phút", "3 giờ 12 phút"
const elapsed = (iso?: string) => {
  const ms = Date.now() - new Date(iso ?? '').getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const minutes = Math.floor(ms / 60000);
  return minutes < 60 ? `${minutes} phút` : `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
};

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
  const [payment, setPayment] = useState<{invoiceId:string;identity:string}|null>(null);
  const [pendingStatus, setPendingStatus] = useState<{invoiceId:string;identity:string;status:'loading'|'pending'|'none'}|null>(null);
  const [pendingRevision, setPendingRevision] = useState(0);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recoveryBlocked, setRecoveryBlocked] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState('');
  const [transferTo, setTransferTo] = useState<string | null>(null);
  const canSell = session.permissions.includes('pos.sell');
  const canCancel = session.permissions.includes('invoice.cancel_open');
  const canManual = session.permissions.includes('transfer.confirm_manual');
  const canChooseBranch = session.permissions.includes('branch.access_all');
  const paymentIdentity=JSON.stringify([session.user.id,session.user.store_id,session.user.branch_id,branchId,[...session.permissions].sort()]);
  const ownShift = shift?.status === 'OPEN' && shift.shiftType === 'CASHIER';
  const canWrite = canSell && ownShift && shift.branchId === branchId && !isOffline && !recoveryBlocked;
  const pendingState=selected&&pendingStatus?.invoiceId===selected.id&&pendingStatus.identity===paymentIdentity?pendingStatus.status:'loading';
  const canModify=canWrite&&(!selected||(selected.status==='OPEN'&&pendingState==='none'));

  useEffect(()=>{
    let live=true;
    if(!selected||selected.status!=='OPEN')return;
    const target={invoiceId:selected.id,identity:paymentIdentity};setPendingStatus({...target,status:'loading'});
    void salesService.getPendingTransferAttempt(selected.id).then(value=>{if(live)setPendingStatus({...target,status:value?.status==='PENDING'?'pending':'none'});})
      .catch(e=>{if(live)setError(e instanceof Error?e.message:'Không xác minh được trạng thái chuyển khoản.');});
    return ()=>{live=false;};
  },[selected?.id,selected?.status,paymentIdentity,pendingRevision]);

  useEffect(() => { setTab(activeMode === 'tables' ? 'tables' : 'menu'); }, [activeMode]);
  useEffect(() => { setBranchId(session.user.branch_id ?? ''); setSelected(null); setNotice(''); }, [session.user.id, session.user.branch_id, session.user.store_id]);
  useEffect(() => {
    let live = true;
    if (!canChooseBranch) return;
    void organizationService.getBranchChoices().then(rows => {
      if (live) { setBranches(rows); setBranchId(current => current || rows.find(row => row.isActive)?.id || rows[0]?.id || ''); }
    }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Không tải được chi nhánh.'); });
    return () => { live = false; };
  }, [session.user.id, session.user.branch_id, canChooseBranch]);
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
      setSelected((detail.branchId === branchId || !branchId) && detail.status === 'OPEN' ? detail : null);
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
      const detail = await action();
      if (detail.status === 'OPEN') { setSelected(detail); setNotice(''); }
      else { setSelected(null); setNotice(detail.status === 'CANCELLED' ? 'Đã hủy đơn.' : 'Đơn đã đóng.'); }
      await refreshOrders();
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
      try {
        const detail = await salesService.get(current.id);
        if (detail.status === 'OPEN') { setSelected(detail); setNotice(''); setTab('menu'); onSwitchToPos?.(); return; }
        await refreshOrders();
      } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được đơn.'); return; }
      finally { setLoading(false); }
    }
    await perform(() => salesService.create({ orderType: 'DINE_IN', tableId: table.id }));
  };
  const addChoice = async () => {
    if (!choice || !selected || !canModify) return;
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
    if (!selected || busy || !canModify) return;
    setBusy(true); setError('');
    try { await salesService.removeItem(itemId); setSelected(await salesService.get(selected.id)); await refreshOrders(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không xóa được món.');
      try { await refreshOrders(selected.id); } catch { setRecoveryBlocked(true); } }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!selected || !canCancel) return;
    setCancelError(''); setCancelReason('');
  };
  const confirmCancel = async () => {
    if (!selected || !canCancel || cancelReason === null) return;
    const reason = cancelReason.trim();
    if (!reason) { setCancelError('Cần nhập lý do hủy đơn.'); return; }
    setCancelReason(null); setCancelError('');
    await perform(() => salesService.cancel(selected.id, reason));
  };

  if (shift === undefined) return <div role="status" className="pos-empty">Đang tải ca hiện tại...</div>;
  if (canSell && !ownShift && !canManual) return <OpenShiftGate branchId={branchId} branchName={branches.find(b => b.id === branchId)?.name || session.branch_name || 'Chi nhánh'}
    onShiftOpened={() => setShiftRevision(value => value + 1)} />;

  const typeLabel = (invoice: { orderType: string; tableId: string | null }) =>
    invoice.orderType === 'TAKEAWAY' ? 'Mang đi' : tables.find(t => t.id === invoice.tableId)?.name || 'Tại bàn';
  const status = selected ? orderStatus(selected.status) : null;
  const bumpQty = (delta: number) => {
    if (!choice) return;
    const current = Number.isInteger(choice.quantity) ? choice.quantity : 0;
    setChoice({ ...choice, quantity: Math.min(1000, Math.max(1, current + delta)) });
  };
  const noteTone = notice === 'Thanh toán thành công.' ? 'success' : 'info';
  const sizesOf = (product: MenuProduct) => product.sizes.filter(size => size.isActive);
  const shownProducts = products.filter(product => product.categoryId === categoryId);

  return <div className="pos">
    <div className="pos-main">
      <div className="pos-bar">
        <div className="pos-tabs">
          {(['menu', 'tables', 'orders'] as const).map(value => <button key={value} type="button" className="tab"
            aria-current={tab === value ? 'true' : undefined} onClick={() => setTab(value)}>
            {value === 'menu' ? <UtensilsCrossed size={20} /> : value === 'tables' ? <LayoutGrid size={20} /> : <ClipboardList size={20} />}
            {value === 'menu' ? 'Thực đơn' : value === 'tables' ? 'Sơ đồ bàn' : 'Đơn đang mở'}</button>)}
        </div>
        <div className="pos-bar-end">
          {canChooseBranch && <label className="field pos-branch">Chi nhánh <select aria-label="Chi nhánh bán hàng" className="select" value={branchId} disabled={busy || loading}
            onChange={e => setBranchId(e.target.value)}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}{branch.isActive ? '' : ' (ngưng hoạt động)'}</option>)}</select></label>}
          <button type="button" className="btn btn-secondary" title="Tải lại đơn" disabled={busy || loading} onClick={() => { setBusy(true);
            void refreshOrders(selected?.id).catch(e => { setRecoveryBlocked(true); setError(e instanceof Error ? e.message : 'Không tải lại được đơn.'); }).finally(() => setBusy(false)); }}><RefreshCw size={18} /><span className="btn-label">Tải lại đơn</span></button>
        </div>
      </div>
      {!loading && tab === 'menu' && categories.length > 0 && <div className="pos-cats">{categories.map(category => <button key={category.id} type="button" className="tab"
        aria-current={categoryId === category.id ? 'true' : undefined} onClick={() => setCategoryId(category.id)}>{category.name}</button>)}</div>}
      <div className="pos-body">
        {canSell && !ownShift && canManual && <OpenShiftGate branchId={branchId} branchName={branches.find(b => b.id === branchId)?.name || session.branch_name || 'Chi nhánh'} onShiftOpened={() => setShiftRevision(value => value + 1)} />}
        {error && <div role="alert" className="notice notice-danger"><XCircle size={18} /><span>{error}</span></div>}
        {notice && <div role="status" className={`notice notice-${noteTone}`}>{noteTone === 'success' ? <CircleCheck size={18} /> : <Info size={18} />}<span>{notice}</span></div>}
        {recoveryBlocked && <div role="alert" className="notice notice-warning"><AlertTriangle size={18} /><span>Chưa đối chiếu được kết quả trên server. Hãy tải lại đơn trước khi thao tác tiếp.</span></div>}
        {isOffline && <div role="status" className="notice notice-warning"><WifiOff size={18} /><span>Mất kết nối. Không thể sửa đơn lúc này.</span></div>}
        {loading && <div role="status"><span className="sr-only">Đang tải dữ liệu...</span>
          <div className="tiles" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map(n => <div key={n} className="skeleton" style={{ minHeight: 96 }} />)}</div></div>}
        {!loading && tab === 'tables' && (tables.length === 0
          ? <div className="pos-empty"><LayoutGrid size={40} /><p>Chi nhánh chưa có bàn. Thêm bàn trong Cài đặt, hoặc bán đơn mang đi.</p></div>
          : <div className="tiles">
            {tables.map(table => { const occupied = orders.find(order => order.tableId === table.id);
              return <button type="button" key={table.id} className={`table-card${occupied ? ' is-serving' : ''}${selected && selected.tableId === table.id ? ' is-selected' : ''}`}
                disabled={busy || (!occupied && !canWrite)} onClick={() => void openTable(table)}>
                <span className="table-name">{table.name}</span>
                {occupied ? <>
                  <span className="table-state"><Clock size={14} />Đang phục vụ</span>
                  <span className="table-money">{formatVND(occupied.totalAmount)}</span>
                  <span className="table-meta">{[occupied.invoiceCode, elapsed(occupied.createdAt)].filter(Boolean).join(' · ')}</span>
                </> : <span className="table-state"><Armchair size={14} />Trống</span>}
              </button>; })}
          </div>)}
        {!loading && tab === 'orders' && <div className="order-list">
          {canWrite && <button type="button" className="btn btn-primary" style={{ justifySelf: 'start' }} disabled={busy} onClick={() => void perform(() => salesService.create({ orderType: 'TAKEAWAY' }))}><Plus size={18} />Đơn mang đi</button>}
          {orders.length === 0 && <div className="pos-empty"><ClipboardList size={40} /><p>Chưa có đơn đang mở.</p></div>}
          {orders.map(order => <button type="button" key={order.id} className="order-row" aria-current={selected?.id === order.id ? 'true' : undefined} onClick={() => {
            setLoading(true);
            void salesService.get(order.id).then(async detail => {
              if (detail.status === 'OPEN') { setSelected(detail); setNotice(''); return; }
              setNotice('Đơn đã thanh toán hoặc đã đóng. Danh sách đã được làm mới.'); await refreshOrders();
            }).catch(e => setError(e instanceof Error ? e.message : 'Không tải được đơn.')).finally(() => setLoading(false));
          }}>
            <span className="order-row-code">{order.invoiceCode}</span>
            <span className="order-row-sub">{[typeLabel(order), elapsed(order.createdAt)].filter(Boolean).join(' · ')}</span>
            <span className="order-row-money">{formatVND(order.totalAmount)}</span>
          </button>)}
        </div>}
        {!loading && tab === 'menu' && <>
          {!selected && <div className="pos-callout"><ShoppingBag size={20} /><span>Chọn bàn hoặc mở đơn mang đi trước khi thêm món.</span>
            <button type="button" className="btn btn-primary" disabled={!canWrite || busy}
              onClick={() => void perform(() => salesService.create({ orderType: 'TAKEAWAY' }))}>Tạo đơn mang đi</button></div>}
          {products.length === 0
            ? <div className="pos-empty"><UtensilsCrossed size={40} /><p>Chưa có món nào. Nhờ quản lý hoặc chủ cửa hàng tạo thực đơn.</p></div>
            : shownProducts.length === 0
              ? <div className="pos-empty"><UtensilsCrossed size={40} /><p>Danh mục này chưa có món.</p></div>
              : <div className="tiles">
                {shownProducts.map(product => { const sizes = sizesOf(product);
                  return <button key={product.id} type="button" className="tile"
                    disabled={!selected || !canModify || busy || sizes.length === 0}
                    onClick={() => void openProduct(product)}>
                    <span className="tile-name">{product.name}</span>
                    <span className="tile-price">{sizes.length === 0 ? 'Chưa có size' : `${sizes.length > 1 ? 'Từ ' : ''}${formatVND(Math.min(...sizes.map(size => size.price)))}`}</span>
                  </button>; })}
              </div>}
        </>}
      </div>
    </div>
    <aside className="order" aria-label="Đơn hiện tại">
      {selected && status ? <>
        <div className="order-head">
          <div className="order-head-row">
            <h2 className="order-code">{selected.invoiceCode}</h2>
            {selected.status === 'OPEN' && canModify && canCancel && <button type="button" className="btn btn-danger-outline" disabled={busy} onClick={() => void cancel()}><Ban size={18} />Hủy đơn</button>}
          </div>
          <div className="order-meta">
            <span className="badge">{selected.orderType === 'TAKEAWAY' ? <ShoppingBag size={14} /> : <Armchair size={14} />}{typeLabel(selected)}</span>
            <span className={`badge badge-${status.tone}`}>{status.icon}{status.label}</span>
          </div>
        </div>
        <div className="order-items">
          {selected.items.length === 0 && <div className="pos-empty"><ShoppingBag size={40} /><p>Đơn chưa có món. Chọn món ở bên trái để thêm vào đơn.</p></div>}
          {selected.items.map(item => { const editable = selected.status === 'OPEN' && canModify;
            return <div key={item.id} className="line">
              <strong className="line-name">{item.productName} · {item.sizeName}</strong>
              <span className="line-total">{formatVND(item.lineTotal)}</span>
              {item.toppings.length > 0 && <span className="line-sub">{item.toppings.map(t => `${t.toppingName} × ${t.quantity}`).join(', ')}</span>}
              {!editable && <span className="line-sub">Số lượng {item.quantity}</span>}
              {editable && <div className="line-controls">
                <button type="button" className="btn btn-secondary btn-step" aria-label="Giảm số lượng" disabled={busy || item.quantity <= 1} onClick={() => void perform(() => salesService.updateItem(item.id, { quantity: item.quantity - 1 }))}>−</button>
                <span className="line-qty">{item.quantity}</span>
                <button type="button" className="btn btn-secondary btn-step" aria-label="Tăng số lượng" disabled={busy} onClick={() => void perform(() => salesService.updateItem(item.id, { quantity: item.quantity + 1 }))}>+</button>
                <button type="button" className="btn btn-text line-remove" disabled={busy} onClick={() => void remove(item.id)}><Trash2 size={18} />Xóa</button>
              </div>}
            </div>; })}
        </div>
        <div className="order-foot">
          {pendingState === 'pending' && <div role="status" className="notice notice-warning"><Clock size={18} /><span>Đơn đang chờ chuyển khoản. Hủy chờ trước khi sửa đơn.</span></div>}
          <h3 className="order-total">Tổng: <span className="money">{formatVND(selected.totalAmount)}</span></h3>
          {selected.status === 'OPEN' && canModify && selected.orderType === 'DINE_IN' && <label className="field">Chuyển bàn <select aria-label="Bàn đích" className="select" defaultValue=""
            onChange={e => { if (e.target.value) setTransferTo(e.target.value); e.target.value = ''; }}>
            <option value="">Chọn bàn trống</option>{tables.filter(t => t.id !== selected.tableId && !orders.some(o => o.tableId === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></label>}
          {selected.status === 'OPEN' && (canWrite || canManual) && <button type="button" className="btn btn-primary btn-lg btn-block" disabled={busy || isOffline}
            onClick={() => { setNotice(''); setPayment({ invoiceId: selected.id, identity: paymentIdentity }); }}><CreditCard size={20} />Thanh toán</button>}
        </div>
      </> : <div className="pos-empty"><ClipboardList size={40} /><p>Chưa chọn đơn. Mở sơ đồ bàn hoặc danh sách đơn đang mở.</p></div>}
    </aside>
    {payment && selected && payment.invoiceId === selected.id && payment.identity === paymentIdentity && <LivePaymentDialog key={`${payment.identity}:${payment.invoiceId}`}
      invoice={selected} permissions={session.permissions} canSell={canWrite} onClose={() => setPayment(null)}
      onChanged={() => { setPendingRevision(value => value + 1); void refreshOrders(selected.id).catch(e => setError(e instanceof Error ? e.message : 'Không tải lại được đơn.')); }}
      onPaid={() => { setPayment(null); setSelected(null); setNotice('Thanh toán thành công.'); void refreshOrders().catch(e => setError(e instanceof Error ? e.message : 'Không tải lại được đơn.')); }} />}
    {cancelReason !== null && selected && <Dialog isOpen onClose={() => setCancelReason(null)} title={`Hủy đơn ${selected.invoiceCode}`} maxWidth={480}>
      <p>Đơn đang mở sẽ bị hủy và không thể mở lại. Lý do được lưu cùng đơn.</p>
      <label className="field">Lý do hủy đơn (bắt buộc)
        <textarea aria-label="Lý do hủy đơn" className="input" aria-invalid={cancelError ? 'true' : undefined} value={cancelReason}
          onChange={e => { setCancelReason(e.target.value); setCancelError(''); }} />
      </label>
      {cancelError && <div role="alert" className="notice notice-danger"><XCircle size={18} /><span>{cancelError}</span></div>}
      <div className="sheet-actions"><button type="button" className="btn btn-secondary" onClick={() => setCancelReason(null)}>Quay lại</button>
        <button type="button" className="btn btn-danger btn-lg" disabled={busy} onClick={() => void confirmCancel()}>Xác nhận hủy đơn</button></div>
    </Dialog>}
    {transferTo !== null && selected && <Dialog isOpen onClose={() => setTransferTo(null)} title="Chuyển bàn" maxWidth={440}>
      <p>Chuyển đơn {selected.invoiceCode} sang {tables.find(t => t.id === transferTo)?.name || 'bàn đã chọn'}?</p>
      <div className="sheet-actions"><button type="button" className="btn btn-secondary" onClick={() => setTransferTo(null)}>Quay lại</button>
        <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => { const target = transferTo; setTransferTo(null); void perform(() => salesService.transfer(selected.id, target)); }}>Xác nhận chuyển bàn</button></div>
    </Dialog>}
    {choice && <Dialog isOpen onClose={() => setChoice(null)} title={choice.product.name} maxWidth={480}>
      <div className="sheet-section"><span className="sheet-label">Size</span>
        <div className="chips" role="group" aria-label="Size">{sizesOf(choice.product).map(size => <button key={size.id} type="button" className="chip"
          aria-pressed={choice.sizeId === size.id} onClick={() => setChoice({ ...choice, sizeId: size.id })}>{size.sizeName} · {formatVND(size.price)}</button>)}</div></div>
      <div className="sheet-section"><span className="sheet-label">Số lượng</span>
        <div className="stepper">
          <button type="button" className="btn btn-secondary btn-step" aria-label="Giảm số lượng" disabled={!(choice.quantity > 1)} onClick={() => bumpQty(-1)}><Minus size={20} /></button>
          <input aria-label="Số lượng" className="input input-qty" type="number" min="1" max="1000" value={choice.quantity}
            onChange={e => setChoice({ ...choice, quantity: Number(e.target.value) })} />
          <button type="button" className="btn btn-secondary btn-step" aria-label="Tăng số lượng" disabled={choice.quantity >= 1000} onClick={() => bumpQty(1)}><Plus size={20} /></button>
        </div></div>
      {choice.allowedToppings.length > 0 && <div className="sheet-section"><span className="sheet-label">Topping</span>
        {choice.allowedToppings.map(topping => <label key={topping.id} className="check-row"><input type="checkbox"
          checked={choice.toppingIds.includes(topping.id)} onChange={e => setChoice({ ...choice,
            toppingIds: e.target.checked ? [...choice.toppingIds, topping.id] : choice.toppingIds.filter(id => id !== topping.id) })} />
          <span>{topping.name}</span><span className="money">{formatVND(topping.price)}</span></label>)}</div>}
      <div className="sheet-actions"><button type="button" className="btn btn-secondary" onClick={() => setChoice(null)}>Đóng</button>
        <button type="button" className="btn btn-primary btn-lg" disabled={!choice.sizeId || !Number.isInteger(choice.quantity) || choice.quantity < 1 || choice.quantity > 1000 || busy}
          onClick={() => void addChoice()}>Thêm vào đơn</button></div>
    </Dialog>}
  </div>;
};
