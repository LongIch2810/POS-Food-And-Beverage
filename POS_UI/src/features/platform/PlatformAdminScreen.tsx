import React, { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { useToast } from '../../context/ToastContext';
import { platformService, PlatformOwner, PlatformStore } from '../../services/platformService';
import { formatDateTimeVN } from '../../utils/formatters';
import { XCircle } from 'lucide-react';

interface Props {
  activeTab?: 'stores' | 'owners';
  onTabChange?: (tab: 'stores' | 'owners') => void;
}

const message = (error: unknown): string => error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';

// Tab gạch chân cho nút Button (DESIGN.md §5.2), giữ nguyên Button để test và hành vi không đổi
const tabStyle = (active: boolean): React.CSSProperties => ({ height: 56, padding: '0 16px', borderRadius: 0, background: 'transparent', border: 'none',
  borderBottom: `3px solid ${active ? 'var(--color-brand-600)' : 'transparent'}`, color: active ? 'var(--color-brand-600)' : 'var(--color-text-muted)' });

export const PlatformAdminScreen: React.FC<Props> = ({ activeTab = 'stores', onTabChange }) => {
  const { showToast } = useToast();
  const [stores, setStores] = useState<PlatformStore[]>([]);
  const [owners, setOwners] = useState<PlatformOwner[]>([]);
  const [histories, setHistories] = useState<{ stores: (string | undefined)[]; owners: (string | undefined)[] }>({ stores: [undefined], owners: [undefined] });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [storeChoices, setStoreChoices] = useState<PlatformStore[]>([]);
  const [choiceCursor, setChoiceCursor] = useState<string | null>(null);
  const [choicesLoading, setChoicesLoading] = useState(false);
  const [choicesError, setChoicesError] = useState('');
  const [savedPassword, setSavedPassword] = useState(false);
  const history = histories[activeTab];
  const cursor = history.at(-1);
  useEffect(() => {
    setHistories(current => ({ ...current, [activeTab]: [undefined] }));
  }, [activeTab]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [createStoreOpen, setCreateStoreOpen] = useState(false);
  const [createOwnerOpen, setCreateOwnerOpen] = useState(false);
  const [suspendStore, setSuspendStore] = useState<PlatformStore | null>(null);
  const [resetOwner, setResetOwner] = useState<PlatformOwner | null>(null);
  const [temporary, setTemporary] = useState<{ username: string; password: string } | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [storeId, setStoreId] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [reason, setReason] = useState('');

  const reload = () => setReloadVersion(current => current + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = activeTab === 'stores' ? platformService.getStores(cursor) : platformService.getOwners(cursor);
    load.then(result => {
      if (!active) return;
      if (activeTab === 'stores') setStores(result.data as PlatformStore[]);
      else setOwners(result.data as PlatformOwner[]);
      setNextCursor(result.meta.nextCursor); setError('');
    }).catch(err => { if (active) setError(message(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeTab, cursor, reloadVersion]);

  useEffect(() => {
    if (!createOwnerOpen) return;
    let active = true;
    setChoicesLoading(true); setChoicesError('');
    platformService.getStores().then(result => {
      if (!active) return;
      setStoreChoices(result.data); setChoiceCursor(result.meta.nextCursor);
      setStoreId(current => current || result.data[0]?.id || '');
    }).catch(err => { if (active) setChoicesError(message(err)); })
      .finally(() => { if (active) setChoicesLoading(false); });
    return () => { active = false; };
  }, [createOwnerOpen]);

  const loadMoreStores = async () => {
    if (!choiceCursor || choicesLoading) return;
    setChoicesLoading(true); setChoicesError('');
    try {
      const result = await platformService.getStores(choiceCursor);
      setStoreChoices(current => [...current, ...result.data.filter(store => !current.some(item => item.id === store.id))]);
      setChoiceCursor(result.meta.nextCursor);
    } catch (err) { setChoicesError(message(err)); }
    finally { setChoicesLoading(false); }
  };

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      setHistories(current => ({ ...current, [activeTab]: [undefined] }));
      reload();
    }
    catch (err) { showToast({ type: 'error', message: message(err) }); }
    finally { setBusy(false); }
  };

  const clearOwnerForm = () => { setUsername(''); setFullName(''); };
  const selectTab = (tab: 'stores' | 'owners') => {
    setHistories(current => ({ ...current, [tab]: [undefined] }));
    onTabChange?.(tab);
  };

  const handleCreateStore = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await platformService.createStore({ name, phone, email, address, owner: { username, fullName } });
      setCreateStoreOpen(false);
      setName(''); setPhone(''); setEmail(''); setAddress(''); clearOwnerForm();
      setSavedPassword(false);
      setTemporary({ username: result.owner.username, password: result.temporaryPassword });
      showToast({ type: 'success', message: 'Đã tạo cửa hàng và tài khoản chủ.' });
    });
  };

  const handleCreateOwner = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await platformService.addOwner({ storeId, username, fullName });
      setCreateOwnerOpen(false); clearOwnerForm();
      setSavedPassword(false);
      setTemporary({ username: result.owner.username, password: result.temporaryPassword });
      showToast({ type: 'success', message: 'Đã cấp tài khoản chủ.' });
    });
  };

  return (
    <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Quản trị nền tảng</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Quản lý cửa hàng và tài khoản chủ. Dữ liệu vận hành thuộc riêng từng cửa hàng.</p>
      </div>
      <div className="page-bar">
        <Button variant="text" style={tabStyle(activeTab === 'stores')} onClick={() => selectTab('stores')}>Cửa hàng</Button>
        <Button variant="text" style={tabStyle(activeTab === 'owners')} onClick={() => selectTab('owners')}>Chủ cửa hàng</Button>
      </div>
      {loading && <p role="status">Đang tải dữ liệu...</p>}
      {error && <div role="alert" className="notice notice-danger"><XCircle size={18} /><p style={{ flex: 1, margin: 0 }}>{error}</p><Button variant="secondary" onClick={reload}>Thử lại</Button></div>}
      {!loading && !error && activeTab === 'stores' && <>
        <div><Button onClick={() => setCreateStoreOpen(true)}>Tạo cửa hàng và OWNER</Button></div>
        {stores.length === 0 ? <p>Chưa có cửa hàng.</p> : stores.map(store => (
          <div key={store.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', padding: 16,
            background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <strong>{store.name}</strong> <Badge variant={store.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                {store.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
              </Badge>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 6 }}>
                {store.phone || 'Chưa có số điện thoại'} · {store.address || 'Chưa có địa chỉ'} · Tạo {formatDateTimeVN(store.createdAt)}
              </div>
              {store.suspendedReason && <div style={{ fontSize: 13 }}>Lý do khóa: {store.suspendedReason}</div>}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {store.status === 'ACTIVE'
              ? <Button variant="danger" disabled={busy} onClick={() => { setSuspendStore(store); setReason(''); }}>Tạm khóa</Button>
              : <Button disabled={busy} onClick={() => void run(async () => {
                await platformService.reactivateStore(store.id);
                showToast({ type: 'success', message: 'Đã mở lại cửa hàng. Người dùng cần đăng nhập lại.' });
              })}>Mở lại</Button>}
            <Button variant="secondary" disabled={busy} onClick={() => {
              setStoreId(store.id); setCreateOwnerOpen(true);
            }}>Cấp OWNER</Button>
            </div>
          </div>
        ))}
      </>}
      {!loading && !error && activeTab === 'owners' && <>
        <div><Button onClick={() => { setStoreId(''); setCreateOwnerOpen(true); }}>Cấp thêm OWNER</Button></div>
        {owners.length === 0 ? <p>Chưa có tài khoản chủ.</p> : owners.map(owner => (
          <div key={owner.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-control)', padding: 16,
            background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div><strong>{owner.fullName}</strong> ({owner.username})
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{owner.storeName || stores.find(store => store.id === owner.storeId)?.name}</div>
            </div>
            <Button variant="secondary" disabled={busy} onClick={() => setResetOwner(owner)}>Đặt lại mật khẩu</Button>
          </div>
        ))}
      </>}
      {!loading && !error && <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button variant="secondary" disabled={history.length === 1 || busy} onClick={() => setHistories(current => ({ ...current, [activeTab]: history.slice(0, -1) }))}>Trang trước</Button>
        <span>Trang {history.length}</span>
        <Button variant="secondary" disabled={!nextCursor || busy}
          onClick={() => { if (nextCursor) setHistories(current => ({ ...current, [activeTab]: [...history, nextCursor] })); }}>Trang sau</Button>
      </div>}

      <Dialog isOpen={createStoreOpen} onClose={() => setCreateStoreOpen(false)} title="Tạo cửa hàng và OWNER đầu tiên">
        <form onSubmit={handleCreateStore} style={{ display: 'grid', gap: 12 }}>
          <Field label="Tên cửa hàng" value={name} onChange={e => setName(e.target.value)} required maxLength={150} />
          <Field label="Số điện thoại" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} />
          <Field label="Email" value={email} onChange={e => setEmail(e.target.value)} maxLength={150} />
          <Field label="Địa chỉ" value={address} onChange={e => setAddress(e.target.value)} maxLength={255} />
          <Field label="Tên đăng nhập OWNER" value={username} onChange={e => setUsername(e.target.value)} required maxLength={50} />
          <Field label="Họ tên OWNER" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={150} />
          <Button type="submit" isLoading={busy}>Tạo cửa hàng</Button>
        </form>
      </Dialog>

      <Dialog isOpen={createOwnerOpen} onClose={() => setCreateOwnerOpen(false)} title="Cấp thêm OWNER">
        <form onSubmit={handleCreateOwner} style={{ display: 'grid', gap: 12 }}>
          <label className="field">Cửa hàng
            <select className="select" value={storeId} onChange={e => setStoreId(e.target.value)} required>
              {storeId && !storeChoices.some(store => store.id === storeId) && <option value={storeId}>{stores.find(store => store.id === storeId)?.name || 'Cửa hàng đã chọn'}</option>}
              {storeChoices.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
          {choicesLoading && <p role="status">Đang tải cửa hàng...</p>}
          {choicesError && <p role="alert">{choicesError}</p>}
          {choiceCursor && <Button variant="secondary" disabled={choicesLoading} onClick={() => void loadMoreStores()}>Tải thêm cửa hàng</Button>}
          <Field label="Tên đăng nhập" value={username} onChange={e => setUsername(e.target.value)} required maxLength={50} />
          <Field label="Họ tên" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={150} />
          <Button type="submit" isLoading={busy} disabled={!storeId || choicesLoading}>Cấp tài khoản</Button>
        </form>
      </Dialog>

      <Dialog isOpen={!!suspendStore} onClose={() => setSuspendStore(null)} title={`Tạm khóa ${suspendStore?.name || ''}`}>
        <form onSubmit={event => { event.preventDefault(); if (!suspendStore) return; void run(async () => {
          await platformService.suspendStore(suspendStore.id, reason); setSuspendStore(null);
          showToast({ type: 'success', message: 'Đã tạm khóa cửa hàng và thu hồi phiên người dùng.' });
        }); }} style={{ display: 'grid', gap: 12 }}>
          <p>Mọi người dùng của cửa hàng sẽ bị đăng xuất và không đăng nhập được. Dữ liệu được giữ nguyên.</p>
          <Field label="Lý do tạm khóa" value={reason} onChange={e => setReason(e.target.value)} required maxLength={255} />
          <Button type="submit" variant="danger" isLoading={busy}>Xác nhận tạm khóa</Button>
        </form>
      </Dialog>

      <Dialog isOpen={!!resetOwner} onClose={() => setResetOwner(null)} title="Đặt lại mật khẩu OWNER">
        <p>Mọi phiên của {resetOwner?.username} sẽ bị thu hồi. Mật khẩu mới chỉ hiển thị một lần.</p>
        <Button variant="danger" isLoading={busy} onClick={() => { if (!resetOwner) return; void run(async () => {
          const result = await platformService.resetOwnerPassword(resetOwner.id);
          setResetOwner(null);
          setSavedPassword(false);
          setTemporary({ username: result.owner.username, password: result.temporaryPassword });
        }); }}>Xác nhận đặt lại</Button>
      </Dialog>

      <Dialog isOpen={!!temporary} disableClose={!savedPassword} onClose={() => setTemporary(null)} title="Mật khẩu tạm — chỉ hiển thị lần này">
        <p>Tên đăng nhập: <strong>{temporary?.username}</strong></p>
        <p>Mật khẩu tạm: <strong style={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{temporary?.password}</strong></p>
        <p>Hãy lưu mật khẩu trước khi đóng. Nếu thất lạc, dùng chức năng đặt lại mật khẩu.</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48 }}>
          <input type="checkbox" checked={savedPassword} onChange={event => setSavedPassword(event.target.checked)} />Tôi đã lưu mật khẩu
        </label>
        <Button disabled={!savedPassword} onClick={() => setTemporary(null)}>Đóng</Button>
      </Dialog>
    </div>
  );
};
