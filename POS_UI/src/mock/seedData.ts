// POS-F&B Seed Dataset per BR & DESIGN_DB_POS_SYSTEM.md

import {
  Store,
  Branch,
  DiningTable,
  Category,
  Product,
  Size,
  ProductSize,
  Topping,
  CategoryTopping,
  Ingredient,
  ProductSizeIngredient,
  ToppingIngredient,
  BranchIngredientStock,
  StockMovement,
  WorkShift,
  CashReconciliation,
  ShiftExpense,
  Invoice,
  PromotionCode,
} from '../types/entities';
import { User, PermissionCode } from '../types/auth';

export const INITIAL_STORES: Store[] = [
  {
    id: 'store-1',
    name: 'Cà phê Ông Long',
    phone: '0905123456',
    email: 'onglong@caphe.vn',
    address: '123 Lý Thường Kiệt, TP. Đồng Hới, Quảng Bình',
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'store-2',
    name: 'Trà sữa Nhà Mộc',
    phone: '0912345678',
    email: 'moc@trasua.vn',
    address: '88 Trần Hưng Đạo, TP. Đồng Hới, Quảng Bình',
    status: 'SUSPENDED',
    suspended_reason: 'Chưa thanh toán phí dịch vụ định kỳ',
    suspended_at: '2026-10-25T08:00:00Z',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-10-25T08:00:00Z',
  },
];

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'branch-nl',
    store_id: 'store-1',
    name: 'Chi nhánh Nam Lý',
    code: 'NL',
    initial_cash: 1500000n,
    is_active: true,
    address: '123 Lý Thường Kiệt, Đồng Hới',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'branch-dh',
    store_id: 'store-1',
    name: 'Chi nhánh Đồng Hới',
    code: 'DH',
    initial_cash: 2000000n,
    is_active: true,
    address: '45 Quang Trung, Đồng Hới',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
];

export const INITIAL_TABLES: DiningTable[] = [
  // Nam Lý - Tầng 1
  { id: 'tb-1', branch_id: 'branch-nl', name: 'Bàn 1', area: 'Tầng 1', seat_count: 4, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'tb-2', branch_id: 'branch-nl', name: 'Bàn 2', area: 'Tầng 1', seat_count: 4, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'tb-3', branch_id: 'branch-nl', name: 'Bàn 3', area: 'Tầng 1', seat_count: 2, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'tb-4', branch_id: 'branch-nl', name: 'Bàn 4', area: 'Tầng 1', seat_count: 6, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'tb-5', branch_id: 'branch-nl', name: 'Bàn 5', area: 'Tầng 1', seat_count: 4, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'tb-6', branch_id: 'branch-nl', name: 'Bàn 6', area: 'Tầng 1', seat_count: 2, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  // Nam Lý - Sân vườn
  { id: 'tb-7', branch_id: 'branch-nl', name: 'Bàn 7', area: 'Sân vườn', seat_count: 4, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'tb-8', branch_id: 'branch-nl', name: 'Bàn 8', area: 'Sân vườn', seat_count: 4, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'tb-9', branch_id: 'branch-nl', name: 'Bàn 9', area: 'Sân vườn', seat_count: 6, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'tb-10', branch_id: 'branch-nl', name: 'Bàn 10', area: 'Sân vườn', seat_count: 8, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'tb-11', branch_id: 'branch-nl', name: 'Bàn 11', area: 'Sân vườn', seat_count: 2, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'tb-12', branch_id: 'branch-nl', name: 'Bàn 12', area: 'Sân vườn', seat_count: 4, is_active: false, created_at: '2026-01-01T00:00:00Z' }, // Ngưng dùng
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', store_id: 'store-1', name: 'Cà phê', sort_order: 1, is_active: true },
  { id: 'cat-2', store_id: 'store-1', name: 'Trà sữa', sort_order: 2, is_active: true },
  { id: 'cat-3', store_id: 'store-1', name: 'Nước ép', sort_order: 3, is_active: true },
  { id: 'cat-4', store_id: 'store-1', name: 'Bánh ngọt', sort_order: 4, is_active: true },
];

export const INITIAL_SIZES: Size[] = [
  { id: 'sz-m', store_id: 'store-1', name: 'M', sort_order: 1 },
  { id: 'sz-l', store_id: 'store-1', name: 'L', sort_order: 2 },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'prod-1', category_id: 'cat-1', name: 'Cà phê đen', is_active: true, description: 'Đậm vị truyền thống' },
  { id: 'prod-2', category_id: 'cat-1', name: 'Cà phê sữa', is_active: true, description: 'Cà phê phối sữa đặc béo ngậy' },
  { id: 'prod-3', category_id: 'cat-1', name: 'Bạc xỉu', is_active: true, description: 'Nhiều sữa tươi, ít cà phê' },
  { id: 'prod-4', category_id: 'cat-2', name: 'Trà sữa truyền thống', is_active: true, description: 'Hương trà đen thơm lừng' },
  { id: 'prod-5', category_id: 'cat-2', name: 'Trà đào cam sả', is_active: true, description: 'Thanh mát sảng khoái' },
  { id: 'prod-6', category_id: 'cat-3', name: 'Nước ép cam', is_active: true, description: '100% cam tươi nguyên chất' },
  { id: 'prod-7', category_id: 'cat-4', name: 'Bánh sừng bò', is_active: true, description: 'Bánh tươi mỗi ngày' },
  { id: 'prod-8', category_id: 'cat-4', name: 'Bánh tiramisu', is_active: true, description: 'Chưa có công thức (test cảnh báo)' },
];

export const INITIAL_PRODUCT_SIZES: ProductSize[] = [
  { id: 'ps-1-m', product_id: 'prod-1', size_id: 'sz-m', price: 25000n },
  { id: 'ps-1-l', product_id: 'prod-1', size_id: 'sz-l', price: 29000n },
  { id: 'ps-2-m', product_id: 'prod-2', size_id: 'sz-m', price: 29000n },
  { id: 'ps-2-l', product_id: 'prod-2', size_id: 'sz-l', price: 35000n },
  { id: 'ps-3-m', product_id: 'prod-3', size_id: 'sz-m', price: 32000n },
  { id: 'ps-3-l', product_id: 'prod-3', size_id: 'sz-l', price: 38000n },
  { id: 'ps-4-m', product_id: 'prod-4', size_id: 'sz-m', price: 35000n },
  { id: 'ps-4-l', product_id: 'prod-4', size_id: 'sz-l', price: 42000n },
  { id: 'ps-5-m', product_id: 'prod-5', size_id: 'sz-m', price: 39000n },
  { id: 'ps-5-l', product_id: 'prod-5', size_id: 'sz-l', price: 45000n },
  { id: 'ps-6-m', product_id: 'prod-6', size_id: 'sz-m', price: 35000n },
  { id: 'ps-6-l', product_id: 'prod-6', size_id: 'sz-l', price: 40000n },
  { id: 'ps-7-m', product_id: 'prod-7', size_id: 'sz-m', price: 30000n },
  { id: 'ps-8-m', product_id: 'prod-8', size_id: 'sz-m', price: 45000n },
];

export const INITIAL_TOPPINGS: Topping[] = [
  { id: 'top-1', store_id: 'store-1', name: 'Trân châu đen', price: 5000n, is_active: true },
  { id: 'top-2', store_id: 'store-1', name: 'Trân châu trắng', price: 7000n, is_active: true },
  { id: 'top-3', store_id: 'store-1', name: 'Thạch cà phê', price: 6000n, is_active: true },
  { id: 'top-4', store_id: 'store-1', name: 'Thạch nha đam', price: 6000n, is_active: true },
];

export const INITIAL_CATEGORY_TOPPINGS: CategoryTopping[] = [
  { category_id: 'cat-1', topping_id: 'top-3' }, // Cà phê có thể thêm Thạch cà phê
  { category_id: 'cat-2', topping_id: 'top-1' }, // Trà sữa có thể thêm các loại trân châu & thạch
  { category_id: 'cat-2', topping_id: 'top-2' },
  { category_id: 'cat-2', topping_id: 'top-3' },
  { category_id: 'cat-2', topping_id: 'top-4' },
  { category_id: 'cat-3', topping_id: 'top-4' }, // Nước ép có thể thêm thạch nha đam
];

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: 'ing-1', store_id: 'store-1', name: 'Hạt cà phê Robusta', unit: 'g', is_active: true },
  { id: 'ing-2', store_id: 'store-1', name: 'Sữa đặc Ông Thọ', unit: 'g', is_active: true },
  { id: 'ing-3', store_id: 'store-1', name: 'Sữa tươi DalatMilk', unit: 'ml', is_active: true },
  { id: 'ing-4', store_id: 'store-1', name: 'Trà đen Phúc Long', unit: 'g', is_active: true },
  { id: 'ing-5', store_id: 'store-1', name: 'Đường cát Biên Hòa', unit: 'g', is_active: true },
  { id: 'ing-6', store_id: 'store-1', name: 'Cam tươi Sành', unit: 'quả', is_active: true },
  { id: 'ing-7', store_id: 'store-1', name: 'Trân châu thô', unit: 'g', is_active: true },
];

export const INITIAL_RECIPES: ProductSizeIngredient[] = [
  // Cà phê đen
  { product_size_id: 'ps-1-m', ingredient_id: 'ing-1', quantity: 20 },
  { product_size_id: 'ps-1-m', ingredient_id: 'ing-5', quantity: 15 },
  { product_size_id: 'ps-1-l', ingredient_id: 'ing-1', quantity: 25 },
  { product_size_id: 'ps-1-l', ingredient_id: 'ing-5', quantity: 20 },
  // Cà phê sữa
  { product_size_id: 'ps-2-m', ingredient_id: 'ing-1', quantity: 20 },
  { product_size_id: 'ps-2-m', ingredient_id: 'ing-2', quantity: 30 },
  { product_size_id: 'ps-2-l', ingredient_id: 'ing-1', quantity: 25 },
  { product_size_id: 'ps-2-l', ingredient_id: 'ing-2', quantity: 40 },
  // Bạc xỉu
  { product_size_id: 'ps-3-m', ingredient_id: 'ing-1', quantity: 15 },
  { product_size_id: 'ps-3-m', ingredient_id: 'ing-2', quantity: 40 },
  { product_size_id: 'ps-3-m', ingredient_id: 'ing-3', quantity: 60 },
  { product_size_id: 'ps-3-l', ingredient_id: 'ing-1', quantity: 20 },
  { product_size_id: 'ps-3-l', ingredient_id: 'ing-2', quantity: 50 },
  { product_size_id: 'ps-3-l', ingredient_id: 'ing-3', quantity: 80 },
  // Trà sữa truyền thống
  { product_size_id: 'ps-4-m', ingredient_id: 'ing-4', quantity: 15 },
  { product_size_id: 'ps-4-m', ingredient_id: 'ing-2', quantity: 35 },
  { product_size_id: 'ps-4-m', ingredient_id: 'ing-5', quantity: 20 },
  { product_size_id: 'ps-4-l', ingredient_id: 'ing-4', quantity: 20 },
  { product_size_id: 'ps-4-l', ingredient_id: 'ing-2', quantity: 50 },
  { product_size_id: 'ps-4-l', ingredient_id: 'ing-5', quantity: 30 },
  // Nước ép cam
  { product_size_id: 'ps-6-m', ingredient_id: 'ing-6', quantity: 2 },
  { product_size_id: 'ps-6-m', ingredient_id: 'ing-5', quantity: 20 },
  { product_size_id: 'ps-6-l', ingredient_id: 'ing-6', quantity: 3 },
  { product_size_id: 'ps-6-l', ingredient_id: 'ing-5', quantity: 25 },
  // prod-8 Bánh tiramisu không có công thức (để test BR-49)
];

export const INITIAL_TOPPING_RECIPES: ToppingIngredient[] = [
  { topping_id: 'top-1', ingredient_id: 'ing-7', quantity: 30 },
  { topping_id: 'top-3', ingredient_id: 'ing-1', quantity: 5 },
  { topping_id: 'top-3', ingredient_id: 'ing-5', quantity: 10 },
];

export const INITIAL_BRANCH_STOCKS: BranchIngredientStock[] = [
  // Nam Lý
  { branch_id: 'branch-nl', ingredient_id: 'ing-1', current_stock: 4500, min_stock: 1000 },
  { branch_id: 'branch-nl', ingredient_id: 'ing-2', current_stock: 3200, min_stock: 800 },
  { branch_id: 'branch-nl', ingredient_id: 'ing-3', current_stock: 5000, min_stock: 1500 },
  { branch_id: 'branch-nl', ingredient_id: 'ing-4', current_stock: 1800, min_stock: 500 },
  { branch_id: 'branch-nl', ingredient_id: 'ing-5', current_stock: 8000, min_stock: 2000 },
  // ing-6 Cam tươi: tồn âm (-3 quả) để test cảnh báo tồn âm!
  { branch_id: 'branch-nl', ingredient_id: 'ing-6', current_stock: -3, min_stock: 10 },
  { branch_id: 'branch-nl', ingredient_id: 'ing-7', current_stock: 1200, min_stock: 400 },
  // Đồng Hới
  { branch_id: 'branch-dh', ingredient_id: 'ing-1', current_stock: 6000, min_stock: 1000 },
  { branch_id: 'branch-dh', ingredient_id: 'ing-2', current_stock: 4000, min_stock: 800 },
  { branch_id: 'branch-dh', ingredient_id: 'ing-3', current_stock: 4000, min_stock: 1500 },
  { branch_id: 'branch-dh', ingredient_id: 'ing-4', current_stock: 2500, min_stock: 500 },
  { branch_id: 'branch-dh', ingredient_id: 'ing-5', current_stock: 9000, min_stock: 2000 },
  { branch_id: 'branch-dh', ingredient_id: 'ing-6', current_stock: 15, min_stock: 10 },
  { branch_id: 'branch-dh', ingredient_id: 'ing-7', current_stock: 2000, min_stock: 400 },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    store_id: null,
    branch_id: null,
    role_code: 'PLATFORM_ADMIN',
    username: 'admin',
    full_name: 'Quản trị Nền tảng',
    must_change_password: false,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user-owner',
    store_id: 'store-1',
    branch_id: null,
    role_code: 'OWNER',
    username: 'long_owner',
    full_name: 'Ông Long (Chủ cửa hàng)',
    must_change_password: false,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user-mgr-nl',
    store_id: 'store-1',
    branch_id: 'branch-nl',
    role_code: 'MANAGER',
    username: 'thao_mgr',
    full_name: 'Nguyễn Văn Thảo (Quản lý Nam Lý)',
    must_change_password: false,
    is_active: true,
    created_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'user-cashier-nl',
    store_id: 'store-1',
    branch_id: 'branch-nl',
    role_code: 'CASHIER',
    username: 'an_cashier',
    full_name: 'Lê Thúy An (Thu ngân Nam Lý)',
    must_change_password: false,
    is_active: true,
    created_at: '2026-01-03T00:00:00Z',
  },
  {
    id: 'user-cashier-dh',
    store_id: 'store-1',
    branch_id: 'branch-dh',
    role_code: 'CASHIER',
    username: 'binh_cashier',
    full_name: 'Trần Thanh Bình (Thu ngân Đồng Hới)',
    must_change_password: false,
    is_active: true,
    created_at: '2026-01-03T00:00:00Z',
  },
  {
    id: 'user-new-cashier',
    store_id: 'store-1',
    branch_id: 'branch-nl',
    role_code: 'CASHIER',
    username: 'new_cashier',
    full_name: 'Phạm Minh Tuấn (Mới nhận việc)',
    must_change_password: true, // test BR-84: buộc đổi mật khẩu lần đầu
    is_active: true,
    created_at: '2026-10-27T00:00:00Z',
  },
  {
    id: 'user-staff-nl',
    store_id: 'store-1',
    branch_id: 'branch-nl',
    role_code: 'CASHIER',
    username: 'hoa_barista',
    full_name: 'Trần Thị Hoa (Pha chế)',
    must_change_password: false,
    is_active: true,
    created_at: '2026-01-05T00:00:00Z',
  },
];

// Ca làm việc:
// 1. Ca hôm qua đã đóng của An: tiền đầu ca 1.500.000đ, tiền đã đếm 1.850.000đ.
// 2. Ca hôm nay đang mở của An (bắt đầu lúc 07:30): tiền đầu ca là 1.850.000đ (lấy từ counted_cash ca trước).
export const INITIAL_WORK_SHIFTS: WorkShift[] = [
  {
    id: 'shift-yesterday',
    store_id: 'store-1',
    branch_id: 'branch-nl',
    user_id: 'user-cashier-nl',
    shift_type: 'CASHIER',
    status: 'CLOSED',
    started_at: '2026-10-26T07:30:00Z',
    ended_at: '2026-10-26T15:30:00Z',
  },
  {
    id: 'shift-current-nl',
    store_id: 'store-1',
    branch_id: 'branch-nl',
    user_id: 'user-cashier-nl',
    shift_type: 'CASHIER',
    status: 'OPEN',
    started_at: '2026-10-27T07:30:00Z',
  },
];

export const INITIAL_CASH_RECONCILIATIONS: CashReconciliation[] = [
  {
    id: 'recon-yesterday',
    work_shift_id: 'shift-yesterday',
    opening_cash: 1500000n,
    cash_sales_amount: 450000n,
    expense_amount: 100000n,
    expected_cash: 1850000n,
    counted_cash: 1850000n,
    difference: 0n,
    status: 'MATCHED',
    note: 'Khớp tiền cuối ca',
    created_at: '2026-10-26T15:30:00Z',
  },
];

export const INITIAL_SHIFT_EXPENSES: ShiftExpense[] = [
  {
    id: 'exp-1',
    work_shift_id: 'shift-current-nl',
    amount: 50000n,
    reason: 'Mua thêm đá viên tinh khiết',
    paid_from_drawer: true,
    created_at: '2026-10-27T09:15:00Z',
  },
];

export const INITIAL_PROMOTIONS: PromotionCode[] = [
  {
    id: 'promo-1',
    store_id: 'store-1',
    code: 'CHAO2026',
    discount_type: 'PERCENT',
    discount_value: 10n, // 10%
    max_discount_amount: 30000n,
    min_order_amount: 50000n,
    start_at: '2026-01-01T00:00:00Z',
    end_at: '2026-12-31T23:59:59Z',
    usage_limit: 100,
    used_count: 5,
    is_active: true,
  },
  {
    id: 'promo-2',
    store_id: 'store-1',
    code: 'GIAM20K',
    discount_type: 'FIXED',
    discount_value: 20000n,
    max_discount_amount: 20000n,
    min_order_amount: 80000n,
    start_at: '2026-01-01T00:00:00Z',
    end_at: '2026-12-31T23:59:59Z',
    usage_limit: 50,
    used_count: 2,
    is_active: true,
  },
  {
    id: 'promo-3',
    store_id: 'store-1',
    code: 'HETHAN',
    discount_type: 'FIXED',
    discount_value: 15000n,
    max_discount_amount: 15000n,
    min_order_amount: 30000n,
    start_at: '2025-01-01T00:00:00Z',
    end_at: '2025-12-31T23:59:59Z',
    usage_limit: 10,
    used_count: 10,
    is_active: true,
  },
];

// Hóa đơn mẫu:
// 1. Đơn OPEN trên Bàn 2 (DINE_IN)
// 2. Đơn PAID (tiền mặt) 95.000đ
// 3. Đơn PAID (chuyển khoản) 120.000đ
export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-open-tb2',
    store_id: 'store-1',
    branch_id: 'branch-nl',
    work_shift_id: 'shift-current-nl',
    dining_table_id: 'tb-2',
    order_type: 'DINE_IN',
    user_id: 'user-cashier-nl',
    invoice_code: 'NL-20261027-0001',
    status: 'OPEN',
    items: [
      {
        id: 'item-1',
        invoice_id: 'inv-open-tb2',
        product_size_id: 'ps-2-l',
        product_name_snapshot: 'Cà phê sữa',
        size_name_snapshot: 'L',
        unit_price_snapshot: 35000n,
        quantity: 2,
        toppings: [
          {
            id: 'item-top-1',
            invoice_item_id: 'item-1',
            topping_id: 'top-3',
            topping_name_snapshot: 'Thạch cà phê',
            unit_price_snapshot: 6000n,
            quantity: 1,
            line_total: 12000n,
          },
        ],
        line_total: 82000n, // (35000 + 6000) * 2 = 82000
      },
      {
        id: 'item-2',
        invoice_id: 'inv-open-tb2',
        product_size_id: 'ps-4-m',
        product_name_snapshot: 'Trà sữa truyền thống',
        size_name_snapshot: 'M',
        unit_price_snapshot: 35000n,
        quantity: 1,
        toppings: [],
        line_total: 35000n,
      },
    ],
    subtotal: 117000n,
    discount_amount: 0n,
    total_amount: 117000n,
    payments: [],
    created_at: '2026-10-27T08:15:00Z',
  },
  {
    id: 'inv-paid-1',
    store_id: 'store-1',
    branch_id: 'branch-nl',
    work_shift_id: 'shift-current-nl',
    dining_table_id: 'tb-1',
    order_type: 'DINE_IN',
    user_id: 'user-cashier-nl',
    invoice_code: 'NL-20261027-0002',
    status: 'PAID',
    items: [
      {
        id: 'item-3',
        invoice_id: 'inv-paid-1',
        product_size_id: 'ps-1-m',
        product_name_snapshot: 'Cà phê đen',
        size_name_snapshot: 'M',
        unit_price_snapshot: 25000n,
        quantity: 2,
        toppings: [],
        line_total: 50000n,
      },
      {
        id: 'item-4',
        invoice_id: 'inv-paid-1',
        product_size_id: 'ps-7-m',
        product_name_snapshot: 'Bánh sừng bò',
        size_name_snapshot: 'M',
        unit_price_snapshot: 30000n,
        quantity: 1,
        toppings: [],
        line_total: 30000n,
      },
    ],
    subtotal: 80000n,
    discount_amount: 0n,
    total_amount: 80000n,
    payments: [
      {
        id: 'pay-1',
        invoice_id: 'inv-paid-1',
        amount: 80000n,
        method: 'CASH',
        tendered_amount: 100000n,
        change_amount: 20000n,
        idempotency_key: 'idem-pay-1',
        created_at: '2026-10-27T08:45:00Z',
      },
    ],
    created_at: '2026-10-27T08:30:00Z',
    paid_at: '2026-10-27T08:45:00Z',
  },
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  // Tồn ban đầu chi nhánh Nam Lý (BR-45: tồn kho phải khớp tổng biến động)
  { id: 'sm-nl-init-1', branch_id: 'branch-nl', ingredient_id: 'ing-1', movement_type: 'IMPORT', quantity: 4540, balance_after: 4540, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  { id: 'sm-nl-init-2', branch_id: 'branch-nl', ingredient_id: 'ing-2', movement_type: 'IMPORT', quantity: 3200, balance_after: 3200, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  { id: 'sm-nl-init-3', branch_id: 'branch-nl', ingredient_id: 'ing-3', movement_type: 'IMPORT', quantity: 5000, balance_after: 5000, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  { id: 'sm-nl-init-4', branch_id: 'branch-nl', ingredient_id: 'ing-4', movement_type: 'IMPORT', quantity: 1800, balance_after: 1800, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  { id: 'sm-nl-init-5', branch_id: 'branch-nl', ingredient_id: 'ing-5', movement_type: 'IMPORT', quantity: 8030, balance_after: 8030, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  { id: 'sm-nl-init-7', branch_id: 'branch-nl', ingredient_id: 'ing-7', movement_type: 'IMPORT', quantity: 1200, balance_after: 1200, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  // Biến động xuất bán chi nhánh Nam Lý
  {
    id: 'sm-1',
    branch_id: 'branch-nl',
    ingredient_id: 'ing-1',
    movement_type: 'SALE',
    quantity: -40, // 2 ly Cà phê đen M * 20g
    balance_after: 4500,
    invoice_id: 'inv-paid-1',
    note: 'Xuất kho theo hóa đơn NL-20261027-0002',
    created_at: '2026-10-27T08:45:00Z',
  },
  {
    id: 'sm-2',
    branch_id: 'branch-nl',
    ingredient_id: 'ing-5',
    movement_type: 'SALE',
    quantity: -30, // 2 ly Cà phê đen M * 15g
    balance_after: 8000,
    invoice_id: 'inv-paid-1',
    note: 'Xuất kho theo hóa đơn NL-20261027-0002',
    created_at: '2026-10-27T08:45:00Z',
  },
  {
    id: 'sm-nl-sale-cam',
    branch_id: 'branch-nl',
    ingredient_id: 'ing-6',
    movement_type: 'SALE',
    quantity: -3, // Xuất âm khi chưa kịp nhập kho để kiểm tra cảnh báo tồn âm
    balance_after: -3,
    note: 'Xuất bán pha chế trực tiếp (tồn kho âm)',
    created_at: '2026-10-27T08:50:00Z',
  },
  // Tồn ban đầu chi nhánh Đồng Hới
  { id: 'sm-dh-init-1', branch_id: 'branch-dh', ingredient_id: 'ing-1', movement_type: 'IMPORT', quantity: 6000, balance_after: 6000, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  { id: 'sm-dh-init-2', branch_id: 'branch-dh', ingredient_id: 'ing-2', movement_type: 'IMPORT', quantity: 4000, balance_after: 4000, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  { id: 'sm-dh-init-3', branch_id: 'branch-dh', ingredient_id: 'ing-3', movement_type: 'IMPORT', quantity: 4000, balance_after: 4000, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  { id: 'sm-dh-init-4', branch_id: 'branch-dh', ingredient_id: 'ing-4', movement_type: 'IMPORT', quantity: 2500, balance_after: 2500, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  { id: 'sm-dh-init-5', branch_id: 'branch-dh', ingredient_id: 'ing-5', movement_type: 'IMPORT', quantity: 9000, balance_after: 9000, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  { id: 'sm-dh-init-6', branch_id: 'branch-dh', ingredient_id: 'ing-6', movement_type: 'IMPORT', quantity: 15, balance_after: 15, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
  { id: 'sm-dh-init-7', branch_id: 'branch-dh', ingredient_id: 'ing-7', movement_type: 'IMPORT', quantity: 2000, balance_after: 2000, note: 'Nhập kho ban đầu', created_at: '2026-10-26T00:00:00Z' },
];

// Ma trận quyền mặc định theo vai trò (BR Mục 15)
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  PLATFORM_ADMIN: ['store.manage', 'role.manage_permissions'],
  OWNER: [
    'branch.access_all',
    'branch.manage',
    'table.manage',
    'product.manage',
    'shift.open_close',
    'shift.force_close',
    'pos.sell',
    'invoice.cancel_open',
    'inventory.view',
    'report.view_shift',
    'report.view_branch',
    'report.view_all',
  ],
  MANAGER: [
    'table.manage',
    'product.manage',
    'shift.open_close',
    'shift.force_close',
    'pos.sell',
    'invoice.cancel_open',
    'inventory.view',
    'report.view_shift',
    'report.view_branch',
  ],
  CASHIER: [
    'shift.open_close',
    'pos.sell',
    'invoice.cancel_open',
    'report.view_shift',
  ],
};
