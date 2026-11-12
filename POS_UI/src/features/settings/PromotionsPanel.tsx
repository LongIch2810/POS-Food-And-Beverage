import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { useToast } from '../../context/ToastContext';
import { promotionService, Promotion, PromotionInput } from '../../services/promotionService';
import { formatDateTimeVN, formatVND } from '../../utils/formatters';
import { fromShopLocal, toShopLocal } from './promotionTime';

const initial = () => ({ code:'', name:'', discountType:'PERCENT' as 'PERCENT'|'FIXED', discountValue:'10',
  maxDiscountAmount:'', minOrderAmount:'', startAt:toShopLocal(new Date().toISOString()),
  endAt:toShopLocal(new Date(Date.now() + 7 * 86_400_000).toISOString()), usageLimit:'', isActive:true });
type Form = ReturnType<typeof initial>;
const errorText = (err: unknown) => err instanceof Error ? err.message : 'Không xử lý được mã giảm giá.';

export const PromotionsPanel: React.FC = () => {
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const { showToast } = useToast();
  const [rows, setRows] = useState<Promotion[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Promotion | null | undefined>();
  const [form, setForm] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const field = (key: keyof Form, value: string | boolean) => setForm(current => ({ ...current, [key]:value }));
  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    promotionService.list().then(data => { if (live) setRows(data); })
      .catch(err => { if (live) { setError(errorText(err)); setRows([]); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [revision]);
  const refresh = () => setRevision(value => value + 1);
  const open = (row?: Promotion) => {
    setEditing(row ?? null);
    setForm(row ? { code:row.code, name:row.name ?? '', discountType:row.discountType,
      discountValue:String(row.discountValue), maxDiscountAmount:row.maxDiscountAmount?.toString() ?? '',
      minOrderAmount:row.minOrderAmount?.toString() ?? '', startAt:toShopLocal(row.startAt), endAt:toShopLocal(row.endAt),
      usageLimit:row.usageLimit?.toString() ?? '', isActive:row.isActive } : initial());
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      if (editing?.usedCount) await promotionService.patch(editing.id,{name:form.name.trim() || null,isActive:form.isActive});
      else {
        const input: PromotionInput = { code:form.code, name:form.name.trim() || null,
          discountType:form.discountType, discountValue:Number(form.discountValue),
          maxDiscountAmount:form.discountType === 'PERCENT' && form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
          minOrderAmount:form.minOrderAmount ? Number(form.minOrderAmount) : null,
          startAt:editing && form.startAt === toShopLocal(editing.startAt) ? editing.startAt : fromShopLocal(form.startAt),
          endAt:editing && form.endAt === toShopLocal(editing.endAt) ? editing.endAt : fromShopLocal(form.endAt),
          usageLimit:form.usageLimit ? Number(form.usageLimit) : null, isActive:form.isActive };
        if (editing) await promotionService.patch(editing.id,input);
        else await promotionService.create(input);
      }
      if (mounted.current) { setEditing(undefined); refresh(); showToast({ type:'success',message:'Đã lưu mã giảm giá.' }); }
    } catch (err) { if (mounted.current) showToast({ type:'error',message:errorText(err) }); }
    finally { if (mounted.current) setBusy(false); }
  };
  const toggle = async (row: Promotion) => {
    try { await promotionService.patch(row.id,{isActive:!row.isActive}); if (mounted.current) refresh(); }
    catch (err) { if (mounted.current) showToast({ type:'error',message:errorText(err) }); }
  };
  const columns: Column<Promotion>[] = [
    { key:'code',header:'Mã',render:row => <strong>{row.code}</strong> },
    { key:'name',header:'Tên',render:row => row.name || '—' },
    { key:'discount',header:'Giảm',render:row => row.discountType === 'PERCENT' ? `${row.discountValue}%` : formatVND(BigInt(row.discountValue)) },
    { key:'period',header:'Hiệu lực',render:row => `${formatDateTimeVN(row.startAt)} – ${formatDateTimeVN(row.endAt)}` },
    { key:'status',header:'Trạng thái',render:row => <Badge variant={row.isActive ? 'success' : 'neutral'} size="sm">{row.isActive ? 'Đang bật' : 'Đã tắt'}</Badge> },
    { key:'action',header:'Thao tác',render:row => <div style={{ display:'flex',gap:8 }}>
      <Button variant="text" size="sm" onClick={() => open(row)}>Sửa</Button>
      <Button variant="text" size="sm" onClick={() => toggle(row)}>{row.isActive ? 'Tắt' : 'Bật'}</Button>
    </div> },
  ];
  return <section className="page">
    <header className="page-head">
      <div><h2 className="page-title">Mã giảm giá</h2>
        <p className="page-sub">Cấu hình mã dùng khi thanh toán ở giai đoạn tiếp theo.</p></div>
      <div className="page-actions">
        <Button variant="secondary" onClick={refresh}>Tải lại</Button>
        <Button variant="primary" onClick={() => open()}>Thêm mã</Button>
      </div>
    </header>
    {error && <p role="alert" className="notice notice-danger"><span style={{ flex: 1 }}>{error}</span> <Button variant="secondary" onClick={refresh}>Thử lại</Button></p>}
    {loading ? <div role="status"><span className="sr-only">Đang tải mã giảm giá…</span>
      <div className="page-skeleton" aria-hidden="true"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div></div> : !error &&
      <DataTable columns={columns} data={rows} keyExtractor={row => row.id} emptyMessage="Chưa có mã giảm giá" />}
    <Dialog isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Sửa mã giảm giá' : 'Thêm mã giảm giá'} maxWidth={520}>
      <form onSubmit={save} style={{ display:'grid',gap:12 }}>
        {!editing?.usedCount && <>
          <Field label="Mã" value={form.code} onChange={event => field('code',event.target.value)} required maxLength={50} />
          <label className="field">Loại giảm <select className="select" value={form.discountType} onChange={event => field('discountType',event.target.value)}>
            <option value="PERCENT">Phần trăm</option><option value="FIXED">Số tiền</option></select></label>
          <Field label={form.discountType === 'PERCENT' ? 'Phần trăm (1–100)' : 'Số tiền giảm (VND)'} type="number" min="1"
            max={form.discountType === 'PERCENT' ? '100' : undefined} step="1" value={form.discountValue}
            onChange={event => field('discountValue',event.target.value)} required />
          {form.discountType === 'PERCENT' && <Field label="Trần giảm (VND, để trống nếu không giới hạn)" type="number" min="1" step="1"
            value={form.maxDiscountAmount} onChange={event => field('maxDiscountAmount',event.target.value)} />}
          <Field label="Đơn tối thiểu (VND, có thể để trống)" type="number" min="0" step="1" value={form.minOrderAmount}
            onChange={event => field('minOrderAmount',event.target.value)} />
          <Field label="Bắt đầu" type="datetime-local" value={form.startAt} onChange={event => field('startAt',event.target.value)} required />
          <Field label="Kết thúc" type="datetime-local" value={form.endAt} onChange={event => field('endAt',event.target.value)} required />
          <Field label="Giới hạn lượt dùng (có thể để trống)" type="number" min="1" max="2147483647" step="1" value={form.usageLimit}
            onChange={event => field('usageLimit',event.target.value)} />
        </>}
        <Field label="Tên hiển thị (có thể để trống)" value={form.name} onChange={event => field('name',event.target.value)} />
        <label className="check-row"><input type="checkbox" checked={form.isActive} onChange={event => field('isActive',event.target.checked)} /> Đang bật</label>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => setEditing(undefined)}>Hủy</Button>
          <Button type="submit" variant="primary" size="lg" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu mã'}</Button>
        </div>
      </form>
    </Dialog>
  </section>;
};
