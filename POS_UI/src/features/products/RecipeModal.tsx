import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { inventoryService, Ingredient, RecipeLine } from '../inventory/inventoryService';

export interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
  sizeName?: string;
  productSizeId?: string;
  toppingName?: string;
  toppingId?: string;
  onSuccess: () => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ isOpen, onClose, productName, sizeName,
  productSizeId, toppingName, toppingId, onSuccess }) => {
  const { showToast } = useToast();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const { session } = useAuth();
  const canEdit = session.permissions.includes('menu.manage');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipe, setRecipe] = useState<RecipeLine[]>([]);
  const [selected, setSelected] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const kind = productSizeId ? 'product-sizes' : 'toppings';
  const id = productSizeId ?? toppingId;

  useEffect(() => {
    if (!isOpen || !id) return;
    let live = true;
    setLoading(true); setError(''); setRecipe([]); setIngredients([]);
    Promise.all([inventoryService.ingredients(), inventoryService.getRecipe(kind,id)])
      .then(([items,lines]) => { if (live) { setIngredients(items); setRecipe(lines); setSelected(items.find(item => item.isActive)?.id ?? ''); } })
      .catch(err => { if (live) setError(err instanceof Error ? err.message : 'Không tải được công thức.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [isOpen, id, kind]);

  const save = async (lines: RecipeLine[]) => {
    if (!id) return;
    setSaving(true);
    try {
      const next = await inventoryService.putRecipe(kind,id,lines.map(line => ({ ingredientId:line.ingredientId, quantity:line.quantity })));
      if (mounted.current) { setRecipe(next); onSuccess(); showToast({ type:'success', message:'Đã lưu công thức.' }); }
    } catch (err) { if (mounted.current) showToast({ type:'error', message:err instanceof Error ? err.message : 'Không lưu được công thức.' }); }
    finally { if (mounted.current) setSaving(false); }
  };
  const add = () => {
    const item = ingredients.find(row => row.id === selected);
    if (!item || !item.isActive || !/^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/.test(quantity) || Number(quantity) <= 0) {
      showToast({ type:'error', message:'Chọn nguyên liệu đang dùng và nhập lượng dương tối đa 3 số lẻ.' }); return;
    }
    save([...recipe.filter(line => line.ingredientId !== selected),
      { ingredientId:item.id, ingredientName:item.name, unit:item.unit, quantity }]);
  };

  return <Dialog isOpen={isOpen} onClose={onClose}
    title={productSizeId ? `Công thức: ${productName} (${sizeName})` : `Công thức: ${toppingName}`}
    maxWidth={520}>
    {loading ? <p role="status">Đang tải công thức…</p> : error ? <p role="alert">{error}</p> : <div style={{ display:'grid', gap:16 }}>
      <p style={{ color:'var(--color-text-muted)' }}>Định lượng cho một phần; có thể để công thức rỗng.</p>
      {recipe.length ? <ul style={{ display:'grid', gap:8, padding:0, listStyle:'none' }}>
        {recipe.map(line => <li key={line.ingredientId} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
          <span>{line.ingredientName} · {line.quantity} {line.unit}</span>
          {canEdit && <Button variant="text" size="sm" disabled={saving} onClick={() => save(recipe.filter(item => item.ingredientId !== line.ingredientId))}>
            Bỏ</Button>}
        </li>)}
      </ul> : <p>Chưa có nguyên liệu trong công thức.</p>}
      {canEdit && <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        <select aria-label="Nguyên liệu" value={selected} onChange={event => setSelected(event.target.value)}>
          {ingredients.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
        </select>
        <input aria-label="Định lượng" type="number" min="0.001" step="0.001" value={quantity} onChange={event => setQuantity(event.target.value)} />
        <Button variant="primary" disabled={saving || !selected} onClick={add}>{saving ? 'Đang lưu…' : 'Thêm / cập nhật'}</Button>
      </div>}
    </div>}
  </Dialog>;
};
