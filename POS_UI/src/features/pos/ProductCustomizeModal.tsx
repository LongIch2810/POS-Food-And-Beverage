// POS-F&B Product Customization Modal (Size & Topping) per DESIGN.md §5.2

import React, { useState } from 'react';
import { Product, ProductSize, Topping } from '../../types/entities';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { formatVND } from '../../utils/formatters';
import { Check } from 'lucide-react';

export interface ProductCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  availableSizes: (ProductSize & { sizeName: string })[];
  availableToppings: Topping[];
  onConfirm: (productSizeId: string, quantity: number, selectedToppingIds: string[]) => void;
}

export const ProductCustomizeModal: React.FC<ProductCustomizeModalProps> = ({
  isOpen,
  onClose,
  product,
  availableSizes,
  availableToppings,
  onConfirm,
}) => {
  const [selectedSizeId, setSelectedSizeId] = useState<string>(
    availableSizes[0]?.id || ''
  );
  const [selectedToppingIds, setSelectedToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);

  if (!isOpen) return null;

  const currentSize = availableSizes.find((s) => s.id === selectedSizeId) || availableSizes[0];
  const toppingsPrice = selectedToppingIds.reduce((sum, topId) => {
    const top = availableToppings.find((t) => t.id === topId);
    return sum + (top ? top.price : 0n);
  }, 0n);

  const unitTotal = (currentSize ? currentSize.price : 0n) + toppingsPrice;
  const grandTotal = unitTotal * BigInt(quantity);

  const toggleTopping = (topId: string) => {
    setSelectedToppingIds((prev) =>
      prev.includes(topId) ? prev.filter((id) => id !== topId) : [...prev, topId]
    );
  };

  const handleAdd = () => {
    if (!currentSize) return;
    onConfirm(currentSize.id, quantity, selectedToppingIds);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      maxWidth={480}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Tổng cộng</div>
            <div className="money" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-brand-600)' }}>
              {formatVND(grandTotal)}
            </div>
          </div>
          <Button variant="primary" size="lg" onClick={handleAdd}>
            Thêm vào đơn &bull; {formatVND(grandTotal)}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Chọn Size */}
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 8 }}>
            Kích cỡ
          </label>
          <div
            role="radiogroup"
            aria-label="Chọn kích cỡ món"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${availableSizes.length}, 1fr)`, gap: 10 }}
          >
            {availableSizes.map((s) => {
              const isSelected = s.id === currentSize?.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Kích cỡ ${s.sizeName}, giá ${formatVND(s.price)}`}
                  onClick={() => setSelectedSizeId(s.id)}
                  style={{
                    height: 52,
                    borderRadius: 'var(--radius-control)',
                    border: `2px solid ${isSelected ? 'var(--color-brand-600)' : 'var(--color-border)'}`,
                    background: isSelected ? 'var(--color-brand-100)' : 'var(--color-surface)',
                    color: isSelected ? 'var(--color-brand-800)' : 'var(--color-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Kích cỡ {s.sizeName}</span>
                  <span className="money" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {formatVND(s.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chọn Topping (nếu danh mục cho phép) */}
        {availableToppings.length > 0 && (
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 8 }}>
              Món thêm kèm theo
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availableToppings.map((top) => {
                const isChecked = selectedToppingIds.includes(top.id);
                return (
                  <div
                    key={top.id}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    aria-label={`Món thêm ${top.name}, cộng ${formatVND(top.price)}`}
                    onClick={() => toggleTopping(top.id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggleTopping(top.id);
                      }
                    }}
                    style={{
                      height: 48,
                      borderRadius: 'var(--radius-control)',
                      border: `1px solid ${isChecked ? 'var(--color-brand-600)' : 'var(--color-border)'}`,
                      background: isChecked ? 'var(--color-brand-50)' : 'var(--color-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 16px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          border: `1px solid ${isChecked ? 'var(--color-brand-600)' : 'var(--color-border-control)'}`,
                          background: isChecked ? 'var(--color-brand-600)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                        }}
                      >
                        {isChecked && <Check size={14} />}
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 500 }}>{top.name}</span>
                    </div>
                    <span className="money" style={{ fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      +{formatVND(top.price)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Số lượng */}
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 8 }}>
            Số lượng
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              disabled={quantity <= 1}
              aria-label="Giảm số lượng"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{
                height: 48,
                width: 48,
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-border-control)',
                background: 'var(--color-surface)',
                fontSize: 20,
                fontWeight: 600,
                cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              &minus;
            </button>
            <span aria-live="polite" style={{ fontSize: 18, fontWeight: 700, width: 40, textAlign: 'center' }}>
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Tăng số lượng"
              onClick={() => setQuantity(quantity + 1)}
              style={{
                height: 48,
                width: 48,
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-border-control)',
                background: 'var(--color-surface)',
                fontSize: 20,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
