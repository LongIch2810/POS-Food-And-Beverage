import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  menuService,
  MenuCategory,
  MenuProduct,
  MenuSize,
  MenuTopping,
} from '../../services/menuService';
import { formatVND } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { DataTable, Column } from '../../components/ui/DataTable';
import {
  UtensilsCrossed,
  Layers,
  Sparkles,
  Plus,
  Edit2,
  Power,
  Check,
  Trash2,
  Upload,
  Image as ImageIcon,
  Ruler,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { RecipeModal } from './RecipeModal';

export const ProductsScreen: React.FC = () => {
  const { session } = useAuth();
  const { showToast } = useToast();
  const canManageMenu =
    session.permissions.includes('menu.manage') ||
    session.permissions.includes('product.manage') ||
    session?.user?.role_code === 'OWNER' ||
    session?.user?.role_code === 'MANAGER';

  const [activeMainTab, setActiveMainTab] = useState<'products' | 'toppings' | 'categories' | 'sizes' | 'promotions'>('products');

  // Real data state
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [sizes, setSizes] = useState<MenuSize[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [toppings, setToppings] = useState<MenuTopping[]>([]);
  const [categoryToppingsMap, setCategoryToppingsMap] = useState<Record<string, string[]>>({});
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);

  // Modals state
  // 1. Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categorySortOrder, setCategorySortOrder] = useState('1');

  // 2. Size Modal
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<MenuSize | null>(null);
  const [sizeName, setSizeName] = useState('');
  const [sizeSortOrder, setSizeSortOrder] = useState('1');

  // 3. Product Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuProduct | null>(null);
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');

  // 4. Product Add Size & Price Modal
  const [addSizeModalOpen, setAddSizeModalOpen] = useState(false);
  const [targetProductForSize, setTargetProductForSize] = useState<MenuProduct | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [newSizePrice, setNewSizePrice] = useState('29000');

  // 5. Price Edit Modal
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [editingProductSize, setEditingProductSize] = useState<{ id: string; name: string; size: string; price: string } | null>(null);

  // 6. Topping Modal
  const [toppingModalOpen, setToppingModalOpen] = useState(false);
  const [editingTopping, setEditingTopping] = useState<MenuTopping | null>(null);
  const [toppingName, setToppingName] = useState('');
  const [toppingPrice, setToppingPrice] = useState('5000');

  // 7. Category-Topping Mapping Modal
  const [mappingTopping, setMappingTopping] = useState<MenuTopping | null>(null);
  const [recipeTarget, setRecipeTarget] = useState<{ productName?: string; sizeName?: string; productSizeId?: string;
    toppingName?: string; toppingId?: string } | null>(null);

  // Load data from real API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catList, sizeList, prodList, topList] = await Promise.all([
        menuService.getAllCategories(),
        menuService.getSizes(),
        menuService.getAllProducts(),
        menuService.getAllToppings(),
      ]);

      setCategories(catList);
      setSizes(sizeList);
      setProducts(prodList);
      setToppings(topList);

      // Load category-topping relationships only for active category or toppings tab
      if (activeMainTab === 'toppings' || activeCategoryFilter !== 'ALL') {
        const targetCats = activeCategoryFilter !== 'ALL'
          ? catList.filter((c) => c.id === activeCategoryFilter)
          : catList;
        const mapping: Record<string, string[]> = { ...categoryToppingsMap };
        await Promise.all(
          targetCats.map(async (cat) => {
            try {
              const tops = await menuService.getCategoryToppings(cat.id);
              mapping[cat.id] = tops.map((t) => t.id);
            } catch {
              mapping[cat.id] = [];
            }
          }),
        );
        setCategoryToppingsMap(mapping);
      }
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể tải dữ liệu thực đơn.' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- CATEGORY ACTIONS ---
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setCategorySortOrder((categories.length + 1).toString());
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: MenuCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDescription(cat.description || '');
    setCategorySortOrder(cat.sortOrder.toString());
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const order = parseInt(categorySortOrder, 10) || 0;
      if (editingCategory) {
        await menuService.patchCategory(editingCategory.id, {
          name: categoryName,
          description: categoryDescription || null,
          sortOrder: order,
        });
        showToast({ type: 'success', message: 'Cập nhật danh mục thành công' });
      } else {
        await menuService.createCategory({
          name: categoryName,
          description: categoryDescription || null,
          sortOrder: order,
        });
        showToast({ type: 'success', message: 'Tạo danh mục mới thành công' });
      }
      setCategoryModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Lỗi lưu danh mục' });
    }
  };

  const handleToggleCategoryActive = async (cat: MenuCategory) => {
    try {
      await menuService.patchCategory(cat.id, { isActive: !cat.isActive });
      showToast({ type: 'info', message: `Đã ${cat.isActive ? 'ngưng dùng' : 'kích hoạt lại'} danh mục ${cat.name}` });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể đổi trạng thái danh mục' });
    }
  };

  const handleDeleteCategory = async (cat: MenuCategory) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat.name}"?`)) return;
    try {
      await menuService.deleteCategory(cat.id);
      showToast({ type: 'success', message: `Đã xóa danh mục ${cat.name}` });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể xóa danh mục đang có món.' });
    }
  };

  // --- SIZE ACTIONS ---
  const handleOpenCreateSize = () => {
    setEditingSize(null);
    setSizeName('');
    setSizeSortOrder((sizes.length + 1).toString());
    setSizeModalOpen(true);
  };

  const handleOpenEditSize = (s: MenuSize) => {
    setEditingSize(s);
    setSizeName(s.name);
    setSizeSortOrder(s.sortOrder.toString());
    setSizeModalOpen(true);
  };

  const handleSaveSize = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const order = parseInt(sizeSortOrder, 10) || 0;
      if (editingSize) {
        await menuService.patchSize(editingSize.id, { name: sizeName, sortOrder: order });
        showToast({ type: 'success', message: 'Cập nhật kích cỡ thành công' });
      } else {
        await menuService.createSize({ name: sizeName, sortOrder: order });
        showToast({ type: 'success', message: 'Tạo kích cỡ mới thành công' });
      }
      setSizeModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Lỗi lưu kích cỡ' });
    }
  };

  const handleDeleteSize = async (s: MenuSize) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa kích cỡ "${s.name}"?`)) return;
    try {
      await menuService.deleteSize(s.id);
      showToast({ type: 'success', message: `Đã xóa kích cỡ ${s.name}` });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể xóa kích cỡ đang được sử dụng.' });
    }
  };

  // --- PRODUCT ACTIONS ---
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProductCategoryId(categories[0]?.id || '');
    setProductName('');
    setProductDescription('');
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: MenuProduct) => {
    setEditingProduct(prod);
    setProductCategoryId(prod.categoryId);
    setProductName(prod.name);
    setProductDescription(prod.description || '');
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await menuService.patchProduct(editingProduct.id, {
          categoryId: productCategoryId,
          name: productName,
          description: productDescription || null,
        });
        showToast({ type: 'success', message: 'Cập nhật thông tin món thành công' });
      } else {
        await menuService.createProduct({
          categoryId: productCategoryId,
          name: productName,
          description: productDescription || null,
        });
        showToast({ type: 'success', message: 'Thêm món mới thành công' });
      }
      setProductModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Lỗi lưu món' });
    }
  };

  const handleToggleProductActive = async (prod: MenuProduct) => {
    try {
      await menuService.patchProduct(prod.id, { isActive: !prod.isActive });
      showToast({ type: 'info', message: `Đã ${prod.isActive ? 'ngưng bán' : 'mở bán lại'} món ${prod.name}` });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể đổi trạng thái món' });
    }
  };

  const handleDeleteProduct = async (prod: MenuProduct) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa món "${prod.name}"?`)) return;
    try {
      await menuService.deleteProduct(prod.id);
      showToast({ type: 'success', message: `Đã xóa món ${prod.name}` });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể xóa món đã cấu hình giá hoặc có hóa đơn.' });
    }
  };

  // --- IMAGE ACTIONS ---
  const handleTriggerUpload = (productId: string) => {
    setUploadingProductId(productId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingProductId) return;

    if (file.size > 2000000) {
      showToast({ type: 'error', message: 'Dung lượng ảnh tối đa 2 MB.' });
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast({ type: 'error', message: 'Chỉ chấp nhận định dạng JPEG, PNG hoặc WebP.' });
      return;
    }

    try {
      await menuService.uploadProductImage(uploadingProductId, file);
      showToast({ type: 'success', message: 'Tải ảnh món lên thành công!' });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Lỗi tải ảnh món.' });
    } finally {
      setUploadingProductId(null);
    }
  };

  const handleDeleteImage = async (productId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn gỡ ảnh đại diện của món này?')) return;
    try {
      await menuService.deleteProductImage(productId);
      showToast({ type: 'info', message: 'Đã gỡ ảnh món.' });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Lỗi gỡ ảnh món.' });
    }
  };

  // --- PRODUCT SIZE & PRICE ACTIONS ---
  const handleOpenAddSize = (prod: MenuProduct) => {
    setTargetProductForSize(prod);
    const existingSizeIds = prod.sizes.map((s) => s.sizeId);
    const availableSizes = sizes.filter((s) => !existingSizeIds.includes(s.id));
    setSelectedSizeId(availableSizes[0]?.id || '');
    setNewSizePrice('29000');
    setAddSizeModalOpen(true);
  };

  const handleSaveNewProductSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductForSize || !selectedSizeId) return;
    try {
      const price = parseInt(newSizePrice.replace(/\D/g, ''), 10) || 0;
      await menuService.createProductSize(targetProductForSize.id, {
        sizeId: selectedSizeId,
        price,
      });
      showToast({ type: 'success', message: 'Thêm kích cỡ và giá bán thành công!' });
      setAddSizeModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Lỗi gán kích cỡ cho món' });
    }
  };

  const handleOpenPriceModal = (prodName: string, sizeName: string, productSizeId: string, currentPrice: number) => {
    setEditingProductSize({
      id: productSizeId,
      name: prodName,
      size: sizeName,
      price: currentPrice.toString(),
    });
    setPriceModalOpen(true);
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductSize) return;
    try {
      const price = parseInt(editingProductSize.price.replace(/\D/g, ''), 10) || 0;
      await menuService.patchProductSize(editingProductSize.id, { price });
      showToast({
        type: 'success',
        message: 'Đã cập nhật giá bán mới. Hóa đơn cũ vẫn giữ nguyên snapshot.',
      });
      setPriceModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Lỗi cập nhật giá bán' });
    }
  };

  const handleDeleteProductSize = async (productSizeId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn gỡ kích cỡ này khỏi món?')) return;
    try {
      await menuService.deleteProductSize(productSizeId);
      showToast({ type: 'success', message: 'Đã gỡ kích cỡ khỏi món.' });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể gỡ kích cỡ đã có trong hóa đơn.' });
    }
  };

  // --- TOPPING ACTIONS ---
  const handleOpenCreateTopping = () => {
    setEditingTopping(null);
    setToppingName('');
    setToppingPrice('5000');
    setToppingModalOpen(true);
  };

  const handleOpenEditTopping = (top: MenuTopping) => {
    setEditingTopping(top);
    setToppingName(top.name);
    setToppingPrice(top.price.toString());
    setToppingModalOpen(true);
  };

  const handleSaveTopping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const price = parseInt(toppingPrice.replace(/\D/g, ''), 10) || 0;
      if (editingTopping) {
        await menuService.patchTopping(editingTopping.id, { name: toppingName, price });
        showToast({ type: 'success', message: 'Cập nhật topping thành công' });
      } else {
        await menuService.createTopping({ name: toppingName, price });
        showToast({ type: 'success', message: 'Tạo topping mới thành công' });
      }
      setToppingModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Lỗi lưu topping' });
    }
  };

  const handleToggleToppingActive = async (top: MenuTopping) => {
    try {
      await menuService.patchTopping(top.id, { isActive: !top.isActive });
      showToast({ type: 'info', message: `Đã ${top.isActive ? 'ngưng bán' : 'mở bán lại'} topping ${top.name}` });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể đổi trạng thái topping' });
    }
  };

  const handleDeleteTopping = async (top: MenuTopping) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa topping "${top.name}"?`)) return;
    try {
      await menuService.deleteTopping(top.id);
      showToast({ type: 'success', message: `Đã xóa topping ${top.name}` });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.message || 'Không thể xóa topping đang được gán danh mục.' });
    }
  };

  // Filter products by selected category
  const filteredProducts = products.filter((p) => {
    if (activeCategoryFilter === 'ALL') return true;
    return p.categoryId === activeCategoryFilter;
  });

  // Table Columns
  const categoryColumns: Column<MenuCategory>[] = [
    { key: 'name', header: 'Tên danh mục', render: (c) => <strong>{c.name}</strong> },
    { key: 'sort', header: 'Thứ tự', align: 'center', render: (c) => <span>{c.sortOrder}</span> },
    {
      key: 'count',
      header: 'Số món trong nhóm',
      align: 'center',
      render: (c) => {
        const count = products.filter((p) => p.categoryId === c.id).length;
        return <span>{count} món</span>;
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (c) => (
        <Badge variant={c.isActive ? 'success' : 'neutral'} size="sm">
          {c.isActive ? 'Hiển thị' : 'Ẩn'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (c) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <Button
            variant="text"
            size="sm"
            style={{ height: 44, padding: '0 10px' }}
            icon={<Edit2 size={14} />}
            onClick={() => handleOpenEditCategory(c)}
          >
            Sửa
          </Button>
          <Button
            variant="text"
            size="sm"
            style={{ height: 44, padding: '0 10px', color: c.isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
            icon={<Power size={14} />}
            onClick={() => handleToggleCategoryActive(c)}
          >
            {c.isActive ? 'Ẩn' : 'Hiện'}
          </Button>
          <Button
            variant="text"
            size="sm"
            style={{ height: 44, padding: '0 10px', color: 'var(--color-danger)' }}
            icon={<Trash2 size={14} />}
            onClick={() => handleDeleteCategory(c)}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  const sizeColumns: Column<MenuSize>[] = [
    { key: 'name', header: 'Tên kích cỡ', render: (s) => <strong>{s.name}</strong> },
    { key: 'sort', header: 'Thứ tự hiển thị', align: 'center', render: (s) => <span>{s.sortOrder}</span> },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (s) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <Button
            variant="text"
            size="sm"
            style={{ height: 44, padding: '0 10px' }}
            icon={<Edit2 size={14} />}
            onClick={() => handleOpenEditSize(s)}
          >
            Sửa
          </Button>
          <Button
            variant="text"
            size="sm"
            style={{ height: 44, padding: '0 10px', color: 'var(--color-danger)' }}
            icon={<Trash2 size={14} />}
            onClick={() => handleDeleteSize(s)}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  const toppingColumns: Column<MenuTopping>[] = [
    { key: 'name', header: 'Tên món thêm', render: (t) => <strong>{t.name}</strong> },
    { key: 'price', header: 'Giá bán', align: 'right', render: (t) => <span className="money">{formatVND(BigInt(t.price))}</span> },
    {
      key: 'categories',
      header: 'Áp dụng cho Danh mục',
      render: (t) => {
        const linkedCatNames = Object.entries(categoryToppingsMap)
          .filter(([_, topIds]) => topIds.includes(t.id))
          .map(([catId]) => categories.find((c) => c.id === catId)?.name)
          .filter(Boolean);

        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {linkedCatNames.length > 0 ? (
              linkedCatNames.map((name) => (
                <Badge key={name} variant="neutral" size="sm">
                  {name}
                </Badge>
              ))
            ) : (
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Chưa gán</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (t) => (
        <Badge variant={t.isActive ? 'success' : 'neutral'} size="sm">
          {t.isActive ? 'Đang bán' : 'Ngưng bán'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (t) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <Button
            variant="text"
            size="sm"
            style={{ height: 44, padding: '0 10px' }}
            icon={<Layers size={14} />}
            onClick={() => setMappingTopping(t)}
          >
            Gán danh mục
          </Button>
          {session.permissions.includes('inventory.view') && <Button variant="text" size="sm"
            onClick={() => setRecipeTarget({ toppingName: t.name, toppingId: t.id })}>Công thức</Button>}
          <Button
            variant="text"
            size="sm"
            style={{ height: 44, padding: '0 10px' }}
            icon={<Edit2 size={14} />}
            onClick={() => handleOpenEditTopping(t)}
          >
            Sửa
          </Button>
          <Button
            variant="text"
            size="sm"
            style={{ height: 44, padding: '0 10px', color: t.isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
            icon={<Power size={14} />}
            onClick={() => handleToggleToppingActive(t)}
          >
            {t.isActive ? 'Ngưng' : 'Bán lại'}
          </Button>
          <Button
            variant="text"
            size="sm"
            style={{ height: 44, padding: '0 10px', color: 'var(--color-danger)' }}
            icon={<Trash2 size={14} />}
            onClick={() => handleDeleteTopping(t)}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  if (!canManageMenu) {
    return (
      <div style={{ flex: 1, padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 8 }}>
            Không có quyền truy cập
          </div>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            Bạn không có quyền quản lý thực đơn (yêu cầu quyền menu.manage).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: 'clamp(14px, 2.5vw, 24px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {recipeTarget && <RecipeModal isOpen={true} onClose={() => setRecipeTarget(null)}
        {...recipeTarget} onSuccess={loadData} />}
      {/* Hidden file input for uploading product image */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>
            Quản lý Thực đơn
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Danh mục, món ăn, kích cỡ, giá bán và topping dùng chung toàn cửa hàng
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={loadData} disabled={loading}>
            Làm mới
          </Button>
          {activeMainTab === 'products' && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenCreateProduct}>
              Thêm món mới
            </Button>
          )}
          {activeMainTab === 'toppings' && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenCreateTopping}>
              Thêm topping
            </Button>
          )}
          {activeMainTab === 'categories' && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenCreateCategory}>
              Thêm danh mục
            </Button>
          )}
          {activeMainTab === 'sizes' && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenCreateSize}>
              Thêm kích cỡ
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--color-border)', paddingBottom: 4, overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => setActiveMainTab('products')}
          style={{
            height: 40,
            padding: '0 16px',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            background: activeMainTab === 'products' ? 'var(--color-brand-100)' : 'transparent',
            color: activeMainTab === 'products' ? 'var(--color-brand-800)' : 'var(--color-text-muted)',
            fontWeight: activeMainTab === 'products' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <UtensilsCrossed size={16} />
          <span>Món & Giá bán ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('toppings')}
          style={{
            height: 40,
            padding: '0 16px',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            background: activeMainTab === 'toppings' ? 'var(--color-brand-100)' : 'transparent',
            color: activeMainTab === 'toppings' ? 'var(--color-brand-800)' : 'var(--color-text-muted)',
            fontWeight: activeMainTab === 'toppings' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Sparkles size={16} />
          <span>Món thêm và áp dụng ({toppings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('categories')}
          style={{
            height: 40,
            padding: '0 16px',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            background: activeMainTab === 'categories' ? 'var(--color-brand-100)' : 'transparent',
            color: activeMainTab === 'categories' ? 'var(--color-brand-800)' : 'var(--color-text-muted)',
            fontWeight: activeMainTab === 'categories' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Layers size={16} />
          <span>Danh mục món ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('sizes')}
          style={{
            height: 40,
            padding: '0 16px',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            background: activeMainTab === 'sizes' ? 'var(--color-brand-100)' : 'transparent',
            color: activeMainTab === 'sizes' ? 'var(--color-brand-800)' : 'var(--color-text-muted)',
            fontWeight: activeMainTab === 'sizes' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Ruler size={16} />
          <span>Kích cỡ món ({sizes.length})</span>
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)' }}>
          Đang tải dữ liệu thực đơn...
        </div>
      )}

      {/* --- TAB 1: MÓN & GIÁ BÁN --- */}
      {!loading && activeMainTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Lọc theo danh mục */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('ALL')}
              style={{
                height: 40,
                padding: '0 14px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                background: activeCategoryFilter === 'ALL' ? 'var(--color-brand-100)' : 'var(--color-surface)',
                color: activeCategoryFilter === 'ALL' ? 'var(--color-brand-800)' : 'var(--color-text-muted)',
                fontWeight: activeCategoryFilter === 'ALL' ? 700 : 500,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              Tất cả ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryFilter(cat.id)}
                style={{
                  height: 40,
                  padding: '0 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  background: activeCategoryFilter === cat.id ? 'var(--color-brand-100)' : 'var(--color-surface)',
                  color: activeCategoryFilter === cat.id ? 'var(--color-brand-800)' : 'var(--color-text-muted)',
                  fontWeight: activeCategoryFilter === cat.id ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grid món */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filteredProducts.map((product) => {
              return (
                <div
                  key={product.id}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-tile)',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {/* Image container */}
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 8,
                          background: 'var(--color-neutral-100)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {product.imageUrl ? (
                          <img
                            src={`${product.imageUrl}?v=${encodeURIComponent(product.updatedAt)}`}
                            alt={product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <ImageIcon size={24} style={{ color: 'var(--color-text-muted)' }} />
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
                            {product.name}
                          </h3>
                          <Badge variant={product.isActive ? 'success' : 'neutral'} size="sm">
                            {product.isActive ? 'Đang bán' : 'Ngưng bán'}
                          </Badge>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          Nhóm: {product.categoryName}
                        </div>
                        {product.description && (
                          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Image buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                      <Button
                        variant="text"
                        size="sm"
                        style={{ height: 26, padding: '0 6px', fontSize: 11 }}
                        icon={<Upload size={12} />}
                        onClick={() => handleTriggerUpload(product.id)}
                      >
                        {product.imageUrl ? 'Đổi ảnh' : 'Tải ảnh'}
                      </Button>
                      {product.imageUrl && (
                        <Button
                          variant="text"
                          size="sm"
                          style={{ height: 26, padding: '0 6px', fontSize: 11, color: 'var(--color-danger)' }}
                          onClick={() => handleDeleteImage(product.id)}
                        >
                          Gỡ ảnh
                        </Button>
                      )}
                      <div style={{ flex: 1 }} />
                      <Button
                        variant="text"
                        size="sm"
                        style={{ height: 26, padding: '0 6px' }}
                        onClick={() => handleOpenEditProduct(product)}
                        title="Sửa thông tin"
                      >
                        <Edit2 size={13} />
                      </Button>
                      <Button
                        variant="text"
                        size="sm"
                        style={{ height: 26, padding: '0 6px', color: product.isActive ? 'var(--color-text-muted)' : 'var(--color-danger)' }}
                        onClick={() => handleToggleProductActive(product)}
                        title={product.isActive ? 'Ngưng bán' : 'Mở bán lại'}
                      >
                        <Power size={13} />
                      </Button>
                      <Button
                        variant="text"
                        size="sm"
                        style={{ height: 26, padding: '0 6px', color: 'var(--color-danger)' }}
                        onClick={() => handleDeleteProduct(product)}
                        title="Xóa món"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>

                  {/* Kích cỡ & Giá bán */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        Kích cỡ và giá
                      </span>
                      <Button
                        variant="text"
                        size="sm"
                        style={{ height: 24, padding: '0 6px', fontSize: 12 }}
                        icon={<Plus size={12} />}
                        onClick={() => handleOpenAddSize(product)}
                      >
                        Thêm size
                      </Button>
                    </div>

                    {product.sizes.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--color-warning)', fontStyle: 'italic' }}>
                        Chưa có kích cỡ và giá (món chưa thể bán tại quầy).
                      </div>
                    ) : (
                      product.sizes.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 13,
                            padding: '3px 0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600 }}>Kích cỡ {s.sizeName}:</span>
                            <span className="money" style={{ color: 'var(--color-brand-600)', fontWeight: 700 }}>
                              {formatVND(BigInt(s.price))}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenPriceModal(product.name, s.sizeName, s.id, s.price)}
                              title="Đổi giá"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                padding: 2,
                                display: 'inline-flex',
                              }}
                            >
                              <Edit2 size={12} />
                            </button>
                            {session.permissions.includes('inventory.view') && <Button variant="text" size="sm"
                              onClick={() => setRecipeTarget({ productName: product.name, sizeName: s.sizeName, productSizeId: s.id })}>
                              Công thức</Button>}
                          </div>

                          <Button
                            variant="text"
                            size="sm"
                            style={{ height: 24, padding: '0 4px', color: 'var(--color-text-muted)' }}
                            onClick={() => handleDeleteProductSize(s.id)}
                            title="Gỡ size này"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 2: TOPPING & ÁP DỤNG --- */}
      {!loading && activeMainTab === 'toppings' && (
        <DataTable columns={toppingColumns} data={toppings} keyExtractor={(t) => t.id} />
      )}

      {/* --- TAB 3: DANH MỤC MÓN --- */}
      {!loading && activeMainTab === 'categories' && (
        <DataTable columns={categoryColumns} data={categories} keyExtractor={(c) => c.id} />
      )}

      {/* --- TAB 4: KÍCH CỠ MÓN --- */}
      {!loading && activeMainTab === 'sizes' && (
        <DataTable columns={sizeColumns} data={sizes} keyExtractor={(s) => s.id} />
      )}

      {/* Dialog Thêm/Sửa Món */}
      <Dialog
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? 'Chỉnh sửa món' : 'Thêm món mới'}
        maxWidth={460}
      >
        <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              htmlFor="product-category-select"
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6, cursor: 'pointer' }}
            >
              Danh mục
            </label>
            <select
              id="product-category-select"
              value={productCategoryId}
              onChange={(e) => setProductCategoryId(e.target.value)}
              style={{
                height: 44,
                width: '100%',
                padding: '0 12px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-border-control)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: 14,
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Field
            label="Tên món"
            placeholder="VD: Cà phê sữa tươi"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
          />

          <Field
            label="Mô tả món (tùy chọn)"
            placeholder="VD: Cà phê Robusta thơm béo sữa tươi..."
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <Button variant="secondary" onClick={() => setProductModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              {editingProduct ? 'Lưu thay đổi' : 'Tạo món'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog Thêm Size & Giá cho món */}
      <Dialog
        isOpen={addSizeModalOpen}
        onClose={() => setAddSizeModalOpen(false)}
        title={`Thêm kích cỡ cho món: ${targetProductForSize?.name}`}
        maxWidth={420}
      >
        <form onSubmit={handleSaveNewProductSize} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              htmlFor="add-size-select"
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}
            >
              Kích cỡ
            </label>
            <select
              id="add-size-select"
              value={selectedSizeId}
              onChange={(e) => setSelectedSizeId(e.target.value)}
              style={{
                height: 44,
                width: '100%',
                padding: '0 12px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-border-control)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: 14,
              }}
            >
              {sizes
                .filter((s) => !targetProductForSize?.sizes.some((ps) => ps.sizeId === s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    Kích cỡ {s.name}
                  </option>
                ))}
            </select>
          </div>

          <Field
            label="Giá bán (VND)"
            placeholder="29000"
            value={newSizePrice}
            onChange={(e) => setNewSizePrice(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => setAddSizeModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={!selectedSizeId}>
              Xác nhận thêm
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog Sửa Giá Bán (BR-12) */}
      <Dialog
        isOpen={priceModalOpen}
        onClose={() => setPriceModalOpen(false)}
        title={`Cập nhật giá bán: ${editingProductSize?.name} (${editingProductSize?.size})`}
        maxWidth={420}
      >
        <form onSubmit={handleSavePrice} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Lưu ý: Thay đổi giá tại đây chỉ áp dụng cho những đơn hàng được thêm sau thời điểm đổi. Đơn cũ giữ nguyên giá snapshot (BR-12).
          </p>
          <Field
            label="Giá bán mới (VND)"
            placeholder="35000"
            value={editingProductSize?.price || ''}
            onChange={(e) =>
              setEditingProductSize((prev) => (prev ? { ...prev, price: e.target.value } : null))
            }
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => setPriceModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Xác nhận đổi giá
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog Thêm/Sửa Kích cỡ */}
      <Dialog
        isOpen={sizeModalOpen}
        onClose={() => setSizeModalOpen(false)}
        title={editingSize ? 'Chỉnh sửa kích cỡ' : 'Thêm kích cỡ mới'}
        maxWidth={420}
      >
        <form onSubmit={handleSaveSize} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field
            label="Tên kích cỡ (VD: M, L, XL)"
            placeholder="M"
            value={sizeName}
            onChange={(e) => setSizeName(e.target.value)}
            required
          />
          <Field
            label="Thứ tự hiển thị"
            type="number"
            value={sizeSortOrder}
            onChange={(e) => setSizeSortOrder(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => setSizeModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              {editingSize ? 'Lưu thay đổi' : 'Tạo kích cỡ'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog Thêm/Sửa Topping */}
      <Dialog
        isOpen={toppingModalOpen}
        onClose={() => setToppingModalOpen(false)}
        title={editingTopping ? 'Chỉnh sửa topping' : 'Thêm topping mới'}
        maxWidth={420}
      >
        <form onSubmit={handleSaveTopping} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field
            label="Tên topping"
            placeholder="VD: Trân châu đường đen"
            value={toppingName}
            onChange={(e) => setToppingName(e.target.value)}
            required
          />
          <Field
            label="Giá bán cộng thêm (VND)"
            placeholder="7000"
            value={toppingPrice}
            onChange={(e) => setToppingPrice(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => setToppingModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              {editingTopping ? 'Lưu thay đổi' : 'Tạo topping'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog Gán Topping vào Danh mục (BR-11) */}
      <Dialog
        isOpen={!!mappingTopping}
        onClose={() => setMappingTopping(null)}
        title={`Áp dụng món thêm "${mappingTopping?.name}" cho Danh mục`}
        maxWidth={460}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Chọn những danh mục đồ uống có thể gọi thêm topping này tại màn hình POS (BR-11):
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.map((cat) => {
              const isLinked = (categoryToppingsMap[cat.id] || []).includes(mappingTopping?.id || '');
              return (
                <div
                  key={cat.id}
                  role="checkbox"
                  aria-checked={isLinked}
                  tabIndex={0}
                  onClick={async () => {
                    if (!mappingTopping) return;
                    try {
                      if (isLinked) {
                        await menuService.unlinkToppingFromCategory(cat.id, mappingTopping.id);
                        setCategoryToppingsMap((prev) => ({
                          ...prev,
                          [cat.id]: (prev[cat.id] || []).filter((id) => id !== mappingTopping.id),
                        }));
                      } else {
                        await menuService.linkToppingToCategory(cat.id, mappingTopping.id);
                        setCategoryToppingsMap((prev) => ({
                          ...prev,
                          [cat.id]: [...(prev[cat.id] || []), mappingTopping.id],
                        }));
                      }
                    } catch (err: any) {
                      showToast({ type: 'error', message: err?.message || 'Lỗi cập nhật liên kết' });
                    }
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      if (!mappingTopping) return;
                      try {
                        if (isLinked) {
                          await menuService.unlinkToppingFromCategory(cat.id, mappingTopping.id);
                          setCategoryToppingsMap((prev) => ({
                            ...prev,
                            [cat.id]: (prev[cat.id] || []).filter((id) => id !== mappingTopping.id),
                          }));
                        } else {
                          await menuService.linkToppingToCategory(cat.id, mappingTopping.id);
                          setCategoryToppingsMap((prev) => ({
                            ...prev,
                            [cat.id]: [...(prev[cat.id] || []), mappingTopping.id],
                          }));
                        }
                      } catch (err: any) {
                        showToast({ type: 'error', message: err?.message || 'Lỗi cập nhật liên kết' });
                      }
                    }
                  }}
                  style={{
                    height: 48,
                    padding: '0 14px',
                    borderRadius: 'var(--radius-control)',
                    border: isLinked ? '1.5px solid var(--color-brand-600)' : '1px solid var(--color-border)',
                    background: isLinked ? 'var(--color-brand-50)' : 'var(--color-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: isLinked ? 600 : 400, color: isLinked ? 'var(--color-brand-800)' : 'var(--color-text)' }}>
                    {cat.name}
                  </span>
                  {isLinked && <Check size={18} style={{ color: 'var(--color-brand-600)' }} />}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="primary" onClick={() => setMappingTopping(null)}>
              Xong
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog Thêm/Sửa Danh mục */}
      <Dialog
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
        maxWidth={420}
      >
        <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field
            label="Tên danh mục"
            placeholder="VD: Cà phê phin"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
          />
          <Field
            label="Mô tả danh mục (tùy chọn)"
            placeholder="VD: Cà phê truyền thống Việt Nam..."
            value={categoryDescription}
            onChange={(e) => setCategoryDescription(e.target.value)}
          />
          <Field
            label="Thứ tự hiển thị"
            type="number"
            value={categorySortOrder}
            onChange={(e) => setCategorySortOrder(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => setCategoryModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              {editingCategory ? 'Lưu thay đổi' : 'Tạo danh mục'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
