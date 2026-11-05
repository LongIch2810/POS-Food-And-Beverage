// POS-F&B Main POS Screen per DESIGN.md §5.2, §5.3

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { posService } from './posService';
import { shiftService, WorkShiftDto } from '../../services/shiftService';
import { MockEngine } from '../../mock/mockEngine';
import { mockStorage } from '../../mock/mockStorage';
import { Invoice, DiningTable, PaymentMethod } from '../../types/entities';
import { formatVND } from '../../utils/formatters';
import { ProductGrid } from './ProductGrid';
import { TableMap } from './TableMap';
import { OrderPanel } from './OrderPanel';
import { PaymentDialog } from './PaymentDialog';
import { OpenShiftGate } from '../shifts/OpenShiftGate';
import { ShoppingBag, ChevronRight } from 'lucide-react';

export interface PosScreenProps {
  activeMode?: 'pos' | 'tables';
  onSwitchToTables?: () => void;
  onSwitchToPos?: () => void;
  initialInvoiceId?: string | null;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  activeMode = 'pos',
  onSwitchToTables,
  onSwitchToPos,
  initialInvoiceId,
}) => {
  const { session, isOffline } = useAuth();
  const { showToast } = useToast();
  const storeId = MockEngine.getCurrentUser().store_id || 'store-1';
  const effectiveBranchId = MockEngine.getEffectiveBranchId();

  const [activeTab, setActiveTab] = useState<'menu' | 'tables'>(
    activeMode === 'tables' ? 'tables' : 'menu'
  );
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<WorkShiftDto | null | undefined>();
  const [shiftError, setShiftError] = useState('');
  const [shiftRevision, setShiftRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setCurrentShift(undefined);
    setShiftError('');
    void shiftService.getCurrentShift().then(shift => { if (active) setCurrentShift(shift); })
      .catch(err => { if (active) setShiftError(err instanceof Error ? err.message : 'Không thể tải ca hiện tại.'); });
    return () => { active = false; };
  }, [session.user.id, shiftRevision]);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tự động nạp đơn nếu truyền initialInvoiceId từ ngoài (ví dụ từ Đóng ca hoặc Danh sách hóa đơn)
  useEffect(() => {
    if (initialInvoiceId) {
      const inv = mockStorage.getState().invoices.find((i) => i.id === initialInvoiceId);
      if (inv) {
        setSelectedInvoice(inv);
        if (inv.dining_table_id) {
          const tbl = mockStorage.getState().tables.find((t) => t.id === inv.dining_table_id);
          setSelectedTable(tbl || null);
        } else {
          setSelectedTable(null);
        }
      }
    }
  }, [initialInvoiceId]);

  // Đồng bộ khi prop activeMode thay đổi từ Sidebar
  useEffect(() => {
    setActiveTab(activeMode === 'tables' ? 'tables' : 'menu');
  }, [activeMode]);

  // Dữ liệu menu & bàn
  const [menuData, setMenuData] = useState(() => posService.getMenuData(storeId));
  const [tablesWithInvoices, setTablesWithInvoices] = useState(() =>
    posService.getTablesWithStatus(effectiveBranchId)
  );

  // Kiểm tra ca làm việc của chính mình (BR-16)
  const hasOpenCashierShift = currentShift?.status === 'OPEN' && currentShift.shiftType === 'CASHIER';

  useEffect(() => {
    const unsubscribe = mockStorage.subscribe(() => {
      setMenuData(posService.getMenuData(storeId));
      setTablesWithInvoices(posService.getTablesWithStatus(effectiveBranchId));

      // Cập nhật lại invoice đang chọn nếu có thay đổi
      if (selectedInvoice) {
        const updated = mockStorage.getState().invoices.find((inv) => inv.id === selectedInvoice.id);
        setSelectedInvoice(updated || null);
      }
    });
    return () => unsubscribe();
  }, [storeId, effectiveBranchId, selectedInvoice?.id]);

  // Nếu chưa mở ca thu ngân -> Chặn và thay bằng màn hình Mở ca (BR-16)
  if (currentShift === undefined || shiftError) {
    return <div role={shiftError ? 'alert' : 'status'} style={{ padding: 24 }}>
      {shiftError || 'Đang tải ca hiện tại...'}
      {shiftError && <button type="button" onClick={() => setShiftRevision(value => value + 1)}>Thử lại</button>}
    </div>;
  }
  if (!hasOpenCashierShift) {
    return (
      <OpenShiftGate
        branchId={session.user.branch_id ?? ''}
        branchName={session.branch_name || 'Chi nhánh'}
        onShiftOpened={() => {
          setShiftRevision(value => value + 1);
        }}
      />
    );
  }

  // Thao tác chọn bàn từ sơ đồ
  const handleSelectTable = async (table: DiningTable, invoice?: Invoice) => {
    setSelectedTable(table);
    if (invoice) {
      setSelectedInvoice(invoice);
    } else {
      try {
        const newInv = await posService.getOrCreateTableInvoice(table.id);
        setSelectedInvoice(newInv);
        showToast({ type: 'info', message: `Đã mở ${table.name}` });
      } catch (err: any) {
        showToast({ type: 'error', message: err?.message || 'Không thể tạo đơn cho bàn này' });
        return;
      }
    }
    // Chuyển sang màn hình bán hàng để chọn món
    if (onSwitchToPos) {
      onSwitchToPos();
    } else {
      setActiveTab('menu');
    }
  };

  // Thao tác tạo đơn mang đi
  const handleCreateTakeaway = async () => {
    setSelectedTable(null);
    try {
      const newInv = await posService.createTakeawayInvoice(effectiveBranchId);
      setSelectedInvoice(newInv);
      showToast({ type: 'info', message: 'Đã tạo đơn mang đi mới' });
      if (onSwitchToPos) {
        onSwitchToPos();
      } else {
        setActiveTab('menu');
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể tạo đơn mang đi' });
    }
  };

  // Thao tác thêm món vào đơn
  const handleAddItem = async (productSizeId: string, quantity: number, selectedToppingIds: string[]) => {
    if (isOffline) {
      showToast({ type: 'error', message: 'Mất kết nối mạng. Không thể thêm món lúc này.' });
      return;
    }

    let targetInvoice = selectedInvoice;
    // Nếu chưa có đơn nào được chọn, tự động tạo đơn mang đi
    if (!targetInvoice || targetInvoice.status !== 'OPEN') {
      try {
        targetInvoice = await posService.createTakeawayInvoice(effectiveBranchId);
        setSelectedInvoice(targetInvoice);
        setSelectedTable(null);
      } catch (err: any) {
        showToast({ type: 'error', message: err?.message || 'Không thể tạo đơn' });
        return;
      }
    }

    try {
      const updated = await posService.addItemToInvoice(targetInvoice.id, productSizeId, quantity, selectedToppingIds);
      setSelectedInvoice(updated);
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Lỗi thêm món' });
    }
  };

  // Tăng giảm số lượng dòng món
  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (!selectedInvoice) return;
    try {
      const updated = await posService.updateItemQuantity(selectedInvoice.id, itemId, newQty);
      setSelectedInvoice(updated);
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Lỗi cập nhật số lượng' });
    }
  };

  // Xóa dòng món
  const handleRemoveItem = async (itemId: string) => {
    if (!selectedInvoice) return;
    try {
      const updated = await posService.removeItem(selectedInvoice.id, itemId);
      setSelectedInvoice(updated);
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Lỗi xóa món' });
    }
  };

  // Áp mã giảm giá
  const handleApplyPromotion = async (code: string) => {
    if (!selectedInvoice) return;
    const updated = await posService.applyPromotion(selectedInvoice.id, code);
    setSelectedInvoice(updated);
  };

  // Bỏ mã giảm giá
  const handleRemovePromotion = async () => {
    if (!selectedInvoice) return;
    const updated = await posService.removePromotion(selectedInvoice.id);
    setSelectedInvoice(updated);
  };

  // Xác nhận thanh toán
  const handleConfirmPayment = async (
    method: PaymentMethod,
    tenderedAmount: bigint,
    transactionRef?: string,
    idempotencyKey?: string
  ) => {
    if (!selectedInvoice) return;
    await posService.processPayment(
      selectedInvoice.id,
      method,
      tenderedAmount,
      transactionRef,
      idempotencyKey
    );
    setSelectedInvoice(null);
    setSelectedTable(null);
    showToast({
      type: 'success',
      message: `Đã thanh toán ${selectedInvoice.invoice_code} thành công! Kho đã tự động trừ nguyên liệu.`,
    });
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
      {/* Vùng trái: Thực đơn chọn món (pos) hoặc Sơ đồ bàn (tables) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'menu' ? (
          <ProductGrid
            categories={menuData.categories}
            products={menuData.products}
            productSizes={menuData.productSizes}
            toppings={menuData.toppings}
            categoryToppings={menuData.categoryToppings}
            onAddItem={handleAddItem}
          />
        ) : (
          <TableMap
            tablesWithInvoices={tablesWithInvoices}
            selectedTableId={selectedTable?.id}
            onSelectTable={handleSelectTable}
            onCreateTakeaway={handleCreateTakeaway}
          />
        )}
      </div>

      {/* Vùng phải: Panel đơn hàng cố định 400px (DESIGN.md §5.2) nếu ở màn hình ngang >= 1024px */}
      {!isPortrait && (
        <OrderPanel
          invoice={selectedInvoice}
          tableName={selectedTable?.name}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onApplyPromotion={handleApplyPromotion}
          onRemovePromotion={handleRemovePromotion}
          onOpenPayment={() => setIsPaymentOpen(true)}
          onChangeTable={onSwitchToTables || (() => setActiveTab('tables'))}
          onAddMoreItems={onSwitchToPos || (() => setActiveTab('menu'))}
          isTablesMode={activeTab === 'tables'}
          onCreateTakeaway={handleCreateTakeaway}
        />
      )}

      {/* Màn hình dọc < 1024px: Thanh giỏ hàng nổi phía dưới */}
      {isPortrait && (
        <div
          onClick={() => setIsCartDrawerOpen(true)}
          className="touch-press"
          style={{
            position: 'absolute',
            bottom: 12,
            left: 16,
            right: 16,
            height: 56,
            background: 'var(--color-brand-800)',
            color: '#ffffff',
            borderRadius: 'var(--radius-control)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            boxShadow: 'var(--shadow-overlay)',
            cursor: 'pointer',
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={20} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {selectedInvoice
                ? `${selectedInvoice.items.reduce((s, i) => s + i.quantity, 0)} món`
                : 'Chưa chọn đơn'}
            </span>
            {selectedInvoice && (
              <span className="money" style={{ fontWeight: 700, fontSize: 16 }}>
                &bull; {formatVND(selectedInvoice.total_amount)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600 }}>
            <span>{selectedInvoice ? 'Xem đơn & Thanh toán' : 'Mở đơn'}</span>
            <ChevronRight size={18} />
          </div>
        </div>
      )}

      {/* Màn hình dọc: Slide-in Drawer chứa OrderPanel */}
      {isPortrait && isCartDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26, 34, 38, 0.45)',
            zIndex: 50,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsCartDrawerOpen(false)}
        >
          <div
            style={{
              width: '85%',
              maxWidth: 420,
              height: '100%',
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-overlay)',
            }}
            className="animate-drawer-slide"
            onClick={(e) => e.stopPropagation()}
          >
            <OrderPanel
              invoice={selectedInvoice}
              tableName={selectedTable?.name}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onApplyPromotion={handleApplyPromotion}
              onRemovePromotion={handleRemovePromotion}
              onOpenPayment={() => {
                setIsCartDrawerOpen(false);
                setIsPaymentOpen(true);
              }}
              onChangeTable={() => {
                setIsCartDrawerOpen(false);
                if (onSwitchToTables) onSwitchToTables();
                else setActiveTab('tables');
              }}
              onAddMoreItems={() => {
                setIsCartDrawerOpen(false);
                if (onSwitchToPos) onSwitchToPos();
                else setActiveTab('menu');
              }}
              isTablesMode={activeTab === 'tables'}
              onCreateTakeaway={handleCreateTakeaway}
              onCloseMobileDrawer={() => setIsCartDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Hộp thoại thanh toán (PaymentDialog) */}
      {isPaymentOpen && selectedInvoice && (
        <PaymentDialog
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          invoice={selectedInvoice}
          onSuccess={() => setIsPaymentOpen(false)}
          onConfirmPayment={handleConfirmPayment}
        />
      )}
    </div>
  );
};
