// POS-F&B Pure Domain Logic & Transaction Engine per BR-xx

import { mockStorage } from './mockStorage';
import {
  Invoice,
  InvoiceItem,
  InvoiceItemTopping,
  Payment,
  PaymentMethod,
  WorkShift,
  DiningTable,
  Branch,
  Store,
  PromotionCode,
  StockMovement,
  CashReconciliation,
  ShiftExpense,
  Category,
  Product,
  ProductSize,
  Topping,
  Ingredient,
  ProductSizeIngredient,
  ToppingIngredient,
} from '../types/entities';
import { User, PermissionCode, AuthSession, RoleCode } from '../types/auth';

export class MockEngine {
  // --- AUTH & CONTEXT ---
  public static getCurrentUser(): User {
    const state = mockStorage.getState();
    const user = state.users.find((u) => u.id === state.currentUserId);
    if (!user) {
      throw new Error('Không tìm thấy thông tin người dùng hiện tại');
    }
    return user;
  }

  public static getCurrentPermissions(): PermissionCode[] {
    const user = this.getCurrentUser();
    const state = mockStorage.getState();
    return state.rolePermissions[user.role_code] || [];
  }

  public static hasPermission(perm: PermissionCode): boolean {
    return this.getCurrentPermissions().includes(perm);
  }

  public static getAuthSession(): AuthSession {
    const user = this.getCurrentUser();
    const state = mockStorage.getState();
    const store = state.stores.find((s) => s.id === user.store_id);
    const branch = state.branches.find((b) => b.id === (user.branch_id || state.selectedBranchId));
    return {
      user,
      permissions: this.getCurrentPermissions(),
      store_name: store?.name,
      branch_name: branch?.name,
    };
  }

  // --- BRANCH & STORE SCOPE (BR-70, BR-71, BR-80, BR-81) ---
  public static getEffectiveBranchId(): string {
    const user = this.getCurrentUser();
    const state = mockStorage.getState();
    if (user.role_code === 'PLATFORM_ADMIN') {
      return '';
    }
    if (user.role_code === 'OWNER') {
      return state.selectedBranchId || state.branches.find((b) => b.store_id === user.store_id)?.id || '';
    }
    return user.branch_id || '';
  }

  public static getAccessibleBranches(): Branch[] {
    const user = this.getCurrentUser();
    const state = mockStorage.getState();
    if (user.role_code === 'PLATFORM_ADMIN') {
      return []; // Không xem dữ liệu vận hành (BR-81)
    }
    if (user.role_code === 'OWNER') {
      return state.branches.filter((b) => b.store_id === user.store_id);
    }
    return state.branches.filter((b) => b.id === user.branch_id);
  }

  public static setSelectedBranch(branchId: string) {
    const user = this.getCurrentUser();
    if (user.role_code !== 'OWNER') {
      throw new Error('Chỉ Chủ cửa hàng mới có quyền đổi chi nhánh làm việc');
    }
    mockStorage.setState(() => ({ selectedBranchId: branchId }));
  }

  // --- CALCULATION FORMULAS (BR-24, BR-25, BR-37) ---
  public static calculateTotals(
    items: InvoiceItem[],
    promo?: PromotionCode
  ): { subtotal: bigint; discount_amount: bigint; total_amount: bigint } {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0n);
    let discount_amount = 0n;

    if (promo && promo.is_active && subtotal >= promo.min_order_amount) {
      if (promo.discount_type === 'PERCENT') {
        const rawDiscount = (subtotal * promo.discount_value) / 100n;
        discount_amount = rawDiscount > promo.max_discount_amount ? promo.max_discount_amount : rawDiscount;
      } else {
        discount_amount = promo.discount_value > subtotal ? subtotal : promo.discount_value;
      }
    }

    const total_amount = subtotal > discount_amount ? subtotal - discount_amount : 0n;
    return { subtotal, discount_amount, total_amount };
  }

  // --- SHIFTS & GATES (BR-14, BR-16, BR-19, BR-55, BR-58, BR-87, BR-89) ---
  public static getActiveCashierShift(branchId: string): WorkShift | undefined {
    const state = mockStorage.getState();
    return state.workShifts.find(
      (s) => s.branch_id === branchId && s.shift_type === 'CASHIER' && s.status === 'OPEN'
    );
  }

  public static getMyActiveShift(): WorkShift | undefined {
    const user = this.getCurrentUser();
    const state = mockStorage.getState();
    return state.workShifts.find((s) => s.user_id === user.id && s.status === 'OPEN');
  }

  public static getExpectedOpeningCash(branchId: string): { amount: bigint; sourceText: string } {
    const state = mockStorage.getState();
    const branch = state.branches.find((b) => b.id === branchId);
    if (!branch) throw new Error('Chi nhánh không tồn tại');

    // Tìm ca CASHIER CLOSED gần nhất cùng chi nhánh (BR-89)
    const closedShifts = state.workShifts
      .filter((s) => s.branch_id === branchId && s.shift_type === 'CASHIER' && s.status === 'CLOSED' && s.ended_at)
      .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime());

    if (closedShifts.length > 0) {
      const lastShift = closedShifts[0];
      const recon = state.cashReconciliations.find((r) => r.work_shift_id === lastShift.id);
      const prevUser = state.users.find((u) => u.id === lastShift.user_id);
      if (recon) {
        return {
          amount: recon.counted_cash,
          sourceText: `Lấy từ ca của ${prevUser?.full_name || 'nhân viên trước'}, kết thúc lúc ${new Date(
            lastShift.ended_at!
          ).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
        };
      }
    }

    return {
      amount: branch.initial_cash,
      sourceText: 'Quỹ tiền mặt ban đầu do Chủ cửa hàng cài đặt cho chi nhánh',
    };
  }

  public static openCashierShift(branchId: string): WorkShift {
    const user = this.getCurrentUser();
    const state = mockStorage.getState();

    // BR-14: Mỗi người chỉ có một ca đang mở
    const myOpen = state.workShifts.find((s) => s.user_id === user.id && s.status === 'OPEN');
    if (myOpen) {
      throw new Error('Bạn đang có một ca làm việc chưa đóng (BR-14)');
    }

    // BR-87: Mỗi chi nhánh chỉ có một ca thu ngân đang mở
    const branchCashierOpen = state.workShifts.find(
      (s) => s.branch_id === branchId && s.shift_type === 'CASHIER' && s.status === 'OPEN'
    );
    if (branchCashierOpen) {
      const currentCashier = state.users.find((u) => u.id === branchCashierOpen.user_id);
      throw new Error(`Chi nhánh này đang có ca thu ngân của ${currentCashier?.full_name || 'người khác'} chưa đóng (BR-87)`);
    }

    const newShift: WorkShift = {
      id: `shift-${Date.now()}`,
      store_id: user.store_id || 'store-1',
      branch_id: branchId,
      user_id: user.id,
      shift_type: 'CASHIER',
      status: 'OPEN',
      started_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      workShifts: [newShift, ...prev.workShifts],
    }));

    return newShift;
  }

  public static addShiftExpense(shiftId: string, amount: bigint, reason: string, paidFromDrawer: boolean): ShiftExpense {
    if (amount <= 0n) throw new Error('Số tiền chi phải lớn hơn 0 (BR-52)');
    if (!reason.trim()) throw new Error('Bắt buộc nhập lý do chi (BR-52)');

    const state = mockStorage.getState();
    const shift = state.workShifts.find((s) => s.id === shiftId);
    if (!shift || shift.status !== 'OPEN') {
      throw new Error('Chỉ được ghi chi phí khi ca còn mở (BR-51)');
    }

    const expense: ShiftExpense = {
      id: `exp-${Date.now()}`,
      work_shift_id: shiftId,
      amount,
      reason: reason.trim(),
      paid_from_drawer: paidFromDrawer,
      created_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      shiftExpenses: [expense, ...prev.shiftExpenses],
    }));

    return expense;
  }

  public static closeShiftBlind(
    shiftId: string,
    countedCash: bigint,
    note?: string
  ): { reconciliation: CashReconciliation; shift: WorkShift } {
    const state = mockStorage.getState();
    const shift = state.workShifts.find((s) => s.id === shiftId);
    if (!shift || shift.status !== 'OPEN') {
      throw new Error('Ca làm việc này đã đóng hoặc không tồn tại (BR-17)');
    }

    // BR-19: Không đóng được ca khi còn hóa đơn OPEN thuộc ca đó
    const openInvoices = state.invoices.filter((inv) => inv.work_shift_id === shiftId && inv.status === 'OPEN');
    if (openInvoices.length > 0) {
      throw new Error(`Còn ${openInvoices.length} đơn chưa thanh toán thuộc ca này. Phải thanh toán hoặc hủy trước khi đóng ca (BR-19)`);
    }

    // Tính tiền đầu ca
    const openingInfo = this.getExpectedOpeningCash(shift.branch_id);
    const opening_cash = openingInfo.amount;

    // Doanh thu tiền mặt từ hóa đơn PAID thuộc ca (BR-56)
    const paidInvoices = state.invoices.filter((inv) => inv.work_shift_id === shiftId && inv.status === 'PAID');
    let cash_sales_amount = 0n;
    paidInvoices.forEach((inv) => {
      inv.payments.forEach((p) => {
        if (p.method === 'CASH') {
          cash_sales_amount += p.amount;
        }
      });
    });

    // Chi từ két (BR-53, BR-56)
    const expenses = state.shiftExpenses.filter((e) => e.work_shift_id === shiftId && e.paid_from_drawer);
    const expense_amount = expenses.reduce((sum, e) => sum + e.amount, 0n);

    // Tiền kỳ vọng
    const expected_cash = opening_cash + cash_sales_amount - expense_amount;
    const difference = countedCash - expected_cash;

    let reconStatus: CashReconciliation['status'] = 'MATCHED';
    if (difference < 0n) reconStatus = 'SHORTAGE';
    else if (difference > 0n) reconStatus = 'OVERAGE';

    // BR-60: Ca lệch bắt buộc có note
    if (difference !== 0n && (!note || !note.trim())) {
      throw new Error('Ca có chênh lệch tiền mặt, bắt buộc phải nhập ghi chú giải trình (BR-60)');
    }

    const reconciliation: CashReconciliation = {
      id: `recon-${Date.now()}`,
      work_shift_id: shiftId,
      opening_cash,
      cash_sales_amount,
      expense_amount,
      expected_cash,
      counted_cash: countedCash,
      difference,
      status: reconStatus,
      note: note?.trim(),
      created_at: new Date().toISOString(),
    };

    const updatedShift: WorkShift = {
      ...shift,
      status: 'CLOSED',
      ended_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      workShifts: prev.workShifts.map((s) => (s.id === shiftId ? updatedShift : s)),
      cashReconciliations: [reconciliation, ...prev.cashReconciliations],
    }));

    return { reconciliation, shift: updatedShift };
  }

  // --- TABLES & POS ORDERS (BR-21 to BR-29, BR-69, BR-74, BR-90, BR-91) ---
  public static getTablesWithStatus(branchId: string): { table: DiningTable; activeInvoice?: Invoice }[] {
    const state = mockStorage.getState();
    const tables = state.tables.filter((t) => t.branch_id === branchId);

    return tables.map((table) => {
      // BR-99: Trạng thái bàn tính từ dữ liệu có hóa đơn OPEN hay không
      const activeInvoice = state.invoices.find(
        (inv) => inv.dining_table_id === table.id && inv.status === 'OPEN'
      );
      return { table, activeInvoice };
    });
  }

  public static getOrCreateTableInvoice(tableId: string): Invoice {
    const state = mockStorage.getState();
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) throw new Error('Bàn không tồn tại');
    if (!table.is_active) throw new Error('Bàn này đang ngưng sử dụng (BR-95)');

    // BR-74: Mỗi bàn chỉ có một đơn OPEN
    const existing = state.invoices.find((inv) => inv.dining_table_id === tableId && inv.status === 'OPEN');
    if (existing) {
      return existing; // Mở lại đơn của bàn đó (BR-91)
    }

    // BR-16: Phải có ca thu ngân đang mở của chính mình mới tạo được đơn
    const myShift = this.getMyActiveShift();
    if (!myShift || myShift.shift_type !== 'CASHIER') {
      throw new Error('Chưa mở ca. Mở ca thu ngân của bạn để bắt đầu bán hàng (BR-16)');
    }
    if (myShift.branch_id !== table.branch_id) {
      throw new Error('Ca thu ngân của bạn không thuộc chi nhánh của bàn này (BR-69)');
    }

    const branch = state.branches.find((b) => b.id === table.branch_id);
    const codePrefix = branch ? branch.code : 'HD';
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const seq = String(state.invoices.length + 1).padStart(4, '0');
    const invoice_code = `${codePrefix}-${dateStr}-${seq}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      store_id: branch?.store_id || 'store-1',
      branch_id: table.branch_id,
      work_shift_id: myShift.id,
      dining_table_id: tableId,
      order_type: 'DINE_IN',
      user_id: myShift.user_id,
      invoice_code,
      status: 'OPEN',
      items: [],
      subtotal: 0n,
      discount_amount: 0n,
      total_amount: 0n,
      payments: [],
      created_at: now.toISOString(),
    };

    mockStorage.setState((prev) => ({
      invoices: [newInvoice, ...prev.invoices],
    }));

    return newInvoice;
  }

  public static createTakeawayInvoice(branchId: string): Invoice {
    const state = mockStorage.getState();
    const myShift = this.getMyActiveShift();
    if (!myShift || myShift.shift_type !== 'CASHIER') {
      throw new Error('Chưa mở ca. Mở ca thu ngân để tạo đơn mang đi (BR-16)');
    }

    const branch = state.branches.find((b) => b.id === branchId);
    const codePrefix = branch ? branch.code : 'HD';
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const seq = String(state.invoices.length + 1).padStart(4, '0');
    const invoice_code = `${codePrefix}-${dateStr}-${seq}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      store_id: branch?.store_id || 'store-1',
      branch_id: branchId,
      work_shift_id: myShift.id,
      dining_table_id: undefined,
      order_type: 'TAKEAWAY',
      user_id: myShift.user_id,
      invoice_code,
      status: 'OPEN',
      items: [],
      subtotal: 0n,
      discount_amount: 0n,
      total_amount: 0n,
      payments: [],
      created_at: now.toISOString(),
    };

    mockStorage.setState((prev) => ({
      invoices: [newInvoice, ...prev.invoices],
    }));

    return newInvoice;
  }

  public static addItemToInvoice(
    invoiceId: string,
    productSizeId: string,
    quantity: number,
    selectedToppingIds: string[] = [],
    notes?: string
  ): Invoice {
    if (quantity <= 0) throw new Error('Số lượng món phải lớn hơn 0 (BR-23)');

    const state = mockStorage.getState();
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice || invoice.status !== 'OPEN') {
      throw new Error('Hóa đơn đã thanh toán hoặc đã hủy, không thể thêm món (BR-22)');
    }

    const prodSize = state.productSizes.find((ps) => ps.id === productSizeId);
    if (!prodSize) throw new Error('Món hoặc size không tồn tại');
    const product = state.products.find((p) => p.id === prodSize.product_id);
    const size = state.sizes.find((s) => s.id === prodSize.size_id);
    if (!product || !size) throw new Error('Thông tin sản phẩm không đầy đủ');

    // Toppings snapshot
    const itemToppings: InvoiceItemTopping[] = [];
    let toppingsLineTotalPerUnit = 0n;

    selectedToppingIds.forEach((topId) => {
      const top = state.toppings.find((t) => t.id === topId && t.is_active);
      if (top) {
        toppingsLineTotalPerUnit += top.price;
        itemToppings.push({
          id: `top-line-${Date.now()}-${Math.random()}`,
          invoice_item_id: '',
          topping_id: top.id,
          topping_name_snapshot: top.name,
          unit_price_snapshot: top.price,
          quantity: 1,
          line_total: top.price * BigInt(quantity),
        });
      }
    });

    const unitPrice = prodSize.price;
    const line_total = (unitPrice + toppingsLineTotalPerUnit) * BigInt(quantity);

    // BR-90: Mỗi lần thêm món luôn TẠO DÒNG MỚI, lưu snapshot tên và giá
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      invoice_id: invoiceId,
      product_size_id: productSizeId,
      product_name_snapshot: product.name,
      size_name_snapshot: size.name,
      unit_price_snapshot: unitPrice,
      quantity,
      toppings: itemToppings,
      line_total,
      notes,
    };

    const nextItems = [...invoice.items, newItem];
    const promo = invoice.applied_promotion
      ? state.promotions.find((p) => p.id === invoice.applied_promotion?.promotion_code_id)
      : undefined;
    const totals = this.calculateTotals(nextItems, promo);

    const updatedInvoice: Invoice = {
      ...invoice,
      items: nextItems,
      ...totals,
    };

    mockStorage.setState((prev) => ({
      invoices: prev.invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)),
    }));

    return updatedInvoice;
  }

  public static updateItemQuantity(invoiceId: string, itemId: string, newQuantity: number): Invoice {
    const state = mockStorage.getState();
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice || invoice.status !== 'OPEN') {
      throw new Error('Chỉ được chỉnh sửa khi hóa đơn đang mở (BR-22)');
    }

    if (newQuantity <= 0) {
      return this.removeItemFromInvoice(invoiceId, itemId);
    }

    const nextItems = invoice.items.map((item) => {
      if (item.id === itemId) {
        const toppingsUnitSum = item.toppings.reduce((s, t) => s + t.unit_price_snapshot, 0n);
        const line_total = (item.unit_price_snapshot + toppingsUnitSum) * BigInt(newQuantity);
        const updatedToppings = item.toppings.map((t) => ({
          ...t,
          line_total: t.unit_price_snapshot * BigInt(newQuantity),
        }));
        return {
          ...item,
          quantity: newQuantity,
          toppings: updatedToppings,
          line_total,
        };
      }
      return item;
    });

    const promo = invoice.applied_promotion
      ? state.promotions.find((p) => p.id === invoice.applied_promotion?.promotion_code_id)
      : undefined;
    const totals = this.calculateTotals(nextItems, promo);

    const updatedInvoice: Invoice = {
      ...invoice,
      items: nextItems,
      ...totals,
    };

    mockStorage.setState((prev) => ({
      invoices: prev.invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)),
    }));

    return updatedInvoice;
  }

  public static removeItemFromInvoice(invoiceId: string, itemId: string): Invoice {
    const state = mockStorage.getState();
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice || invoice.status !== 'OPEN') {
      throw new Error('Hóa đơn không ở trạng thái mở');
    }

    const nextItems = invoice.items.filter((item) => item.id !== itemId);
    const promo = invoice.applied_promotion
      ? state.promotions.find((p) => p.id === invoice.applied_promotion?.promotion_code_id)
      : undefined;
    const totals = this.calculateTotals(nextItems, promo);

    const updatedInvoice: Invoice = {
      ...invoice,
      items: nextItems,
      ...totals,
    };

    mockStorage.setState((prev) => ({
      invoices: prev.invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)),
    }));

    return updatedInvoice;
  }

  public static applyPromotion(invoiceId: string, code: string): Invoice {
    const state = mockStorage.getState();
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice || invoice.status !== 'OPEN') throw new Error('Hóa đơn không ở trạng thái mở');

    const promo = state.promotions.find(
      (p) => p.code.toUpperCase() === code.trim().toUpperCase() && p.store_id === invoice.store_id
    );

    if (!promo || !promo.is_active) {
      throw new Error('Mã giảm giá không tồn tại hoặc đã ngưng áp dụng (BR-36)');
    }

    const now = new Date();
    if (now < new Date(promo.start_at) || now > new Date(promo.end_at)) {
      throw new Error('Mã giảm giá đã hết hạn sử dụng (BR-36)');
    }

    if (promo.used_count >= promo.usage_limit) {
      throw new Error('Mã giảm giá đã hết lượt sử dụng (BR-36)');
    }

    if (invoice.subtotal < promo.min_order_amount) {
      throw new Error(`Đơn hàng chưa đạt mức tối thiểu ${promo.min_order_amount}đ để áp dụng mã này (BR-36)`);
    }

    const totals = this.calculateTotals(invoice.items, promo);

    const updatedInvoice: Invoice = {
      ...invoice,
      applied_promotion: {
        invoice_id: invoiceId,
        promotion_code_id: promo.id,
        code_snapshot: promo.code,
        discount_amount: totals.discount_amount,
      },
      ...totals,
    };

    mockStorage.setState((prev) => ({
      invoices: prev.invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)),
    }));

    return updatedInvoice;
  }

  public static removePromotion(invoiceId: string): Invoice {
    const state = mockStorage.getState();
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice || invoice.status !== 'OPEN') throw new Error('Hóa đơn không ở trạng thái mở');

    const totals = this.calculateTotals(invoice.items, undefined);
    const updatedInvoice: Invoice = {
      ...invoice,
      applied_promotion: undefined,
      ...totals,
    };

    mockStorage.setState((prev) => ({
      invoices: prev.invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)),
    }));

    return updatedInvoice;
  }

  // --- PAYMENT & ATOMIC STOCK DEDUCTION (BR-30 to BR-35, BR-42, BR-43, BR-45) ---
  public static processPayment(
    invoiceId: string,
    method: PaymentMethod,
    tenderedAmount: bigint,
    transactionRef?: string,
    idempotencyKey?: string
  ): { payment: Payment; invoice: Invoice } {
    const state = mockStorage.getState();
    const key = idempotencyKey || `idem-${invoiceId}-${Date.now()}`;

    // BR-34: Chống lặp thanh toán
    const existingPayment = state.invoices.flatMap((inv) => inv.payments).find((p) => p.idempotency_key === key);
    if (existingPayment) {
      const inv = state.invoices.find((i) => i.id === existingPayment.invoice_id)!;
      return { payment: existingPayment, invoice: inv };
    }

    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice || invoice.status !== 'OPEN') {
      throw new Error('Hóa đơn không ở trạng thái mở để thanh toán (BR-21)');
    }

    if (invoice.items.length === 0) {
      throw new Error('Hóa đơn phải có ít nhất một món mới được thanh toán (BR-27)');
    }

    // BR-16: Phải có ca thu ngân đang mở
    const shift = state.workShifts.find((s) => s.id === invoice.work_shift_id && s.status === 'OPEN');
    if (!shift) {
      throw new Error('Ca thu ngân của hóa đơn này đã đóng, không thể thanh toán (BR-16)');
    }

    const total = invoice.total_amount;
    let change_amount = 0n;

    if (method === 'CASH') {
      if (tenderedAmount < total) {
        throw new Error('Khách đưa chưa đủ tiền (BR-32)');
      }
      change_amount = tenderedAmount - total;
    }

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      invoice_id: invoiceId,
      amount: total,
      method,
      tendered_amount: method === 'CASH' ? tenderedAmount : total,
      change_amount,
      transaction_ref: transactionRef?.trim(),
      idempotency_key: key,
      created_at: new Date().toISOString(),
    };

    // --- NGUYÊN TỬ: TRỪ KHO THEO CÔNG THỨC (BR-42, BR-43, BR-72) ---
    // Gom lượng dùng theo từng ingredient_id
    const ingredientDeductions: Record<string, number> = {};

    invoice.items.forEach((item) => {
      // 1. Công thức món theo size
      const itemRecipes = state.recipes.filter((r) => r.product_size_id === item.product_size_id);
      itemRecipes.forEach((r) => {
        const needed = r.quantity * item.quantity;
        ingredientDeductions[r.ingredient_id] = (ingredientDeductions[r.ingredient_id] || 0) + needed;
      });

      // 2. Công thức topping
      item.toppings.forEach((top) => {
        const topRecipes = state.toppingRecipes.filter((tr) => tr.topping_id === top.topping_id);
        topRecipes.forEach((tr) => {
          const needed = tr.quantity * top.quantity * item.quantity;
          ingredientDeductions[tr.ingredient_id] = (ingredientDeductions[tr.ingredient_id] || 0) + needed;
        });
      });
    });

    const newStockMovements: StockMovement[] = [];
    const nextBranchStocks = [...state.branchStocks];

    Object.entries(ingredientDeductions).forEach(([ingId, usedQty]) => {
      const stockIdx = nextBranchStocks.findIndex(
        (bs) => bs.branch_id === invoice.branch_id && bs.ingredient_id === ingId
      );

      let current = 0;
      if (stockIdx >= 0) {
        current = nextBranchStocks[stockIdx].current_stock;
        nextBranchStocks[stockIdx] = {
          ...nextBranchStocks[stockIdx],
          current_stock: current - usedQty,
        };
      } else {
        nextBranchStocks.push({
          branch_id: invoice.branch_id,
          ingredient_id: ingId,
          current_stock: -usedQty,
          min_stock: 0,
        });
      }

      newStockMovements.push({
        id: `sm-${Date.now()}-${Math.random()}`,
        branch_id: invoice.branch_id,
        ingredient_id: ingId,
        movement_type: 'SALE',
        quantity: -usedQty,
        balance_after: current - usedQty,
        invoice_id: invoiceId,
        note: `Xuất bán theo hóa đơn ${invoice.invoice_code}`,
        created_at: new Date().toISOString(),
      });
    });

    // Cập nhật used_count của mã giảm giá (BR-39)
    const nextPromos = state.promotions.map((p) => {
      if (p.id === invoice.applied_promotion?.promotion_code_id) {
        return { ...p, used_count: p.used_count + 1 };
      }
      return p;
    });

    const updatedInvoice: Invoice = {
      ...invoice,
      status: 'PAID',
      payments: [payment],
      paid_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      invoices: prev.invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)),
      branchStocks: nextBranchStocks,
      stockMovements: [...newStockMovements, ...prev.stockMovements],
      promotions: nextPromos,
    }));

    return { payment, invoice: updatedInvoice };
  }

  // --- CANCEL INVOICE & STOCK REVERSAL (BR-28, BR-29, BR-47) ---
  public static cancelInvoice(invoiceId: string, reason: string): Invoice {
    if (!reason.trim()) throw new Error('Bắt buộc phải nhập lý do hủy đơn (BR-28, BR-29)');

    const state = mockStorage.getState();
    const invoice = state.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) throw new Error('Hóa đơn không tồn tại');
    if (invoice.status === 'CANCELLED') throw new Error('Hóa đơn đã bị hủy trước đó');

    const user = this.getCurrentUser();

    if (invoice.status === 'OPEN') {
      // BR-28: Thu ngân được hủy đơn OPEN
      const updatedInvoice: Invoice = {
        ...invoice,
        status: 'CANCELLED',
        cancel_reason: reason.trim(),
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
      };
      mockStorage.setState((prev) => ({
        invoices: prev.invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)),
      }));
      return updatedInvoice;
    }

    if (invoice.status === 'PAID') {
      // BR-29: Hủy đơn PAID cần quyền quản lý và ca của đơn đó còn mở
      if (user.role_code !== 'OWNER' && user.role_code !== 'MANAGER') {
        throw new Error('Cần quyền quản lý để hủy hóa đơn đã thanh toán (BR-29)');
      }

      const shift = state.workShifts.find((s) => s.id === invoice.work_shift_id);
      if (!shift || shift.status !== 'OPEN') {
        throw new Error('Chỉ được hủy đơn đã thanh toán khi ca của đơn đó còn đang mở (BR-29)');
      }

      // BR-47: Hoàn kho nguyên liệu qua bút toán SALE_REVERSAL đối dấu
      const originalMovements = state.stockMovements.filter(
        (sm) => sm.invoice_id === invoiceId && sm.movement_type === 'SALE'
      );

      const reversalMovements: StockMovement[] = [];
      const nextStocks = [...state.branchStocks];

      originalMovements.forEach((orig) => {
        const returnQty = Math.abs(orig.quantity);
        const idx = nextStocks.findIndex(
          (bs) => bs.branch_id === invoice.branch_id && bs.ingredient_id === orig.ingredient_id
        );
        let balanceAfter = returnQty;
        if (idx >= 0) {
          nextStocks[idx] = {
            ...nextStocks[idx],
            current_stock: nextStocks[idx].current_stock + returnQty,
          };
          balanceAfter = nextStocks[idx].current_stock;
        }

        reversalMovements.push({
          id: `sm-rev-${Date.now()}-${Math.random()}`,
          branch_id: invoice.branch_id,
          ingredient_id: orig.ingredient_id,
          movement_type: 'SALE_REVERSAL',
          quantity: returnQty,
          balance_after: balanceAfter,
          invoice_id: invoiceId,
          note: `Hoàn kho do hủy hóa đơn ${invoice.invoice_code}`,
          created_at: new Date().toISOString(),
        });
      });

      // Trả lại 1 lượt dùng mã giảm giá nếu có (BR-39)
      const nextPromos = state.promotions.map((p) => {
        if (p.id === invoice.applied_promotion?.promotion_code_id && p.used_count > 0) {
          return { ...p, used_count: p.used_count - 1 };
        }
        return p;
      });

      const updatedInvoice: Invoice = {
        ...invoice,
        status: 'CANCELLED',
        cancel_reason: reason.trim(),
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
      };

      mockStorage.setState((prev) => ({
        invoices: prev.invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)),
        branchStocks: nextStocks,
        stockMovements: [...reversalMovements, ...prev.stockMovements],
        promotions: nextPromos,
      }));

      return updatedInvoice;
    }

    return invoice;
  }

  // --- PLATFORM ADMIN ACTIONS (BR-78, BR-81, BR-82, BR-83, BR-84, BR-96, BR-103) ---
  // --- PLATFORM ADMIN ACTIONS (BR-78, BR-81, BR-82, BR-83, BR-84, BR-96, BR-103) ---
  public static createStore(name: string, phone?: string, address?: string, email?: string): Store {
    const user = this.getCurrentUser();
    if (user.role_code !== 'PLATFORM_ADMIN') throw new Error('Chỉ Quản trị nền tảng mới được tạo cửa hàng');

    const newStore: Store = {
      id: `store-${Date.now()}`,
      name: name.trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      email: email?.trim(),
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      stores: [...prev.stores, newStore],
    }));

    return newStore;
  }

  public static setStoreStatus(storeId: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string): Store {
    const user = this.getCurrentUser();
    if (user.role_code !== 'PLATFORM_ADMIN') throw new Error('Chỉ Quản trị nền tảng mới được đổi trạng thái cửa hàng');
    if (status === 'SUSPENDED' && (!reason || !reason.trim())) {
      throw new Error('Bắt buộc phải nhập lý do khi tạm khóa cửa hàng (BR-96)');
    }

    const state = mockStorage.getState();
    const store = state.stores.find((s) => s.id === storeId);
    if (!store) throw new Error('Cửa hàng không tồn tại');

    const updatedStore: Store = {
      ...store,
      status,
      suspended_reason: status === 'SUSPENDED' ? reason?.trim() : undefined,
      suspended_at: status === 'SUSPENDED' ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      stores: prev.stores.map((s) => (s.id === storeId ? updatedStore : s)),
    }));

    return updatedStore;
  }

  public static createOwnerAccount(storeId: string, username: string, fullName: string): { user: User; tempPassword: string } {
    const user = this.getCurrentUser();
    if (user.role_code !== 'PLATFORM_ADMIN') throw new Error('Chỉ Quản trị nền tảng mới được cấp tài khoản Chủ (BR-83)');

    const state = mockStorage.getState();
    if (state.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
      throw new Error('Tên đăng nhập đã tồn tại trong hệ thống (BR-97)');
    }

    const tempPassword = `Pass@${Math.floor(100000 + Math.random() * 900000)}`;

    const newOwner: User = {
      id: `user-${Date.now()}`,
      store_id: storeId,
      branch_id: null,
      role_code: 'OWNER',
      username: username.trim(),
      full_name: fullName.trim(),
      must_change_password: true, // BR-84: Phải đổi mật khẩu ở lần đăng nhập đầu
      is_active: true,
      created_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      users: [...prev.users, newOwner],
    }));

    return { user: newOwner, tempPassword };
  }

  public static updateRolePermissions(roleCode: string, permissions: PermissionCode[]) {
    const user = this.getCurrentUser();
    if (user.role_code !== 'PLATFORM_ADMIN') {
      throw new Error('Chỉ Quản trị nền tảng mới được chỉnh sửa ma trận quyền dùng chung (BR-103)');
    }

    // BR-103: Không được cấp quyền xem dữ liệu vận hành cho PLATFORM_ADMIN
    if (roleCode === 'PLATFORM_ADMIN') {
      const operationalPerms: PermissionCode[] = [
        'pos.sell',
        'shift.open_close',
        'shift.force_close',
        'invoice.cancel_open',
        'invoice.cancel_paid',
        'inventory.view',
        'report.view_shift',
        'report.view_branch',
        'report.view_all',
      ];
      const hasOp = permissions.some((p) => operationalPerms.includes(p));
      if (hasOp) {
        throw new Error('Không được cấp quyền xem hoặc can thiệp dữ liệu vận hành cho PLATFORM_ADMIN (BR-81, BR-103)');
      }
    }

    // BR-103: Không được cấp branch.access_all cho vai trò khác OWNER
    if (roleCode !== 'OWNER' && permissions.includes('branch.access_all')) {
      throw new Error('Quyền xem toàn cửa hàng chỉ áp dụng cho vai trò Chủ cửa hàng');
    }

    mockStorage.setState((prev) => ({
      rolePermissions: {
        ...prev.rolePermissions,
        [roleCode]: permissions,
      },
    }));
  }

  // --- BRANCH & TABLE MANAGEMENT (BR-07, BR-08, BR-09, BR-10, BR-70, BR-95, BR-99) ---
  public static createBranch(name: string, code: string, address?: string, initialCash: bigint = 1500000n): Branch {
    const user = this.getCurrentUser();
    if (!this.hasPermission('branch.manage')) {
      throw new Error('Bạn không có quyền quản lý chi nhánh');
    }
    const state = mockStorage.getState();
    const cleanCode = code.trim().toUpperCase();
    if (state.branches.some((b) => b.store_id === user.store_id && b.code === cleanCode)) {
      throw new Error(`Mã chi nhánh "${cleanCode}" đã tồn tại trong cửa hàng`);
    }

    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      store_id: user.store_id || '',
      name: name.trim(),
      code: cleanCode,
      initial_cash: initialCash,
      is_active: true,
      address: address?.trim() || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      branches: [...prev.branches, newBranch],
    }));

    return newBranch;
  }

  public static updateBranch(branchId: string, updates: { name?: string; address?: string; initial_cash?: bigint }): Branch {
    if (!this.hasPermission('branch.manage')) {
      throw new Error('Bạn không có quyền quản lý chi nhánh');
    }
    const state = mockStorage.getState();
    const branch = state.branches.find((b) => b.id === branchId);
    if (!branch) throw new Error('Chi nhánh không tồn tại');

    const updated: Branch = {
      ...branch,
      name: updates.name !== undefined ? updates.name.trim() : branch.name,
      address: updates.address !== undefined ? updates.address.trim() : branch.address,
      initial_cash: updates.initial_cash !== undefined ? updates.initial_cash : branch.initial_cash,
      updated_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      branches: prev.branches.map((b) => (b.id === branchId ? updated : b)),
    }));

    return updated;
  }

  public static toggleBranchActive(branchId: string): Branch {
    if (!this.hasPermission('branch.manage')) {
      throw new Error('Bạn không có quyền quản lý chi nhánh');
    }
    const state = mockStorage.getState();
    const branch = state.branches.find((b) => b.id === branchId);
    if (!branch) throw new Error('Chi nhánh không tồn tại');

    // Nếu đang hoạt động mà muốn ngưng, kiểm tra xem có ca đang mở không
    if (branch.is_active) {
      const hasOpenShift = state.workShifts.some((s) => s.branch_id === branchId && s.status === 'OPEN');
      if (hasOpenShift) {
        throw new Error('Không thể ngưng hoạt động chi nhánh đang có ca làm việc mở (BR-10)');
      }
    }

    const updated: Branch = {
      ...branch,
      is_active: !branch.is_active,
      updated_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      branches: prev.branches.map((b) => (b.id === branchId ? updated : b)),
    }));

    return updated;
  }

  public static isTableOccupied(tableId: string): boolean {
    const state = mockStorage.getState();
    return state.invoices.some((inv) => inv.dining_table_id === tableId && inv.status === 'OPEN');
  }

  public static createTable(branchId: string, name: string, area: string, seatCount: number = 4): DiningTable {
    if (!this.hasPermission('table.manage')) {
      throw new Error('Bạn không có quyền quản lý bàn');
    }
    const newTable: DiningTable = {
      id: `tb-${Date.now()}`,
      branch_id: branchId,
      name: name.trim(),
      area: area.trim(),
      seat_count: seatCount,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      tables: [...prev.tables, newTable],
    }));

    return newTable;
  }

  public static updateTable(tableId: string, updates: { name?: string; area?: string; seat_count?: number }): DiningTable {
    if (!this.hasPermission('table.manage')) {
      throw new Error('Bạn không có quyền quản lý bàn');
    }
    const state = mockStorage.getState();
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) throw new Error('Bàn không tồn tại');

    const updated: DiningTable = {
      ...table,
      name: updates.name !== undefined ? updates.name.trim() : table.name,
      area: updates.area !== undefined ? updates.area.trim() : table.area,
      seat_count: updates.seat_count !== undefined ? updates.seat_count : table.seat_count,
    };

    mockStorage.setState((prev) => ({
      tables: prev.tables.map((t) => (t.id === tableId ? updated : t)),
    }));

    return updated;
  }

  public static toggleTableActive(tableId: string): DiningTable {
    if (!this.hasPermission('table.manage')) {
      throw new Error('Bạn không có quyền quản lý bàn');
    }
    const state = mockStorage.getState();
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) throw new Error('Bàn không tồn tại');

    if (table.is_active && this.isTableOccupied(tableId)) {
      throw new Error('Không thể ngưng dùng bàn đang có khách ngồi / có đơn chưa thanh toán (BR-95)');
    }

    const updated: DiningTable = {
      ...table,
      is_active: !table.is_active,
    };

    mockStorage.setState((prev) => ({
      tables: prev.tables.map((t) => (t.id === tableId ? updated : t)),
    }));

    return updated;
  }

  // --- STAFF USER MANAGEMENT (BR-06, BR-70, BR-84, BR-85, BR-97) ---
  public static createStaffUser(
    branchId: string,
    username: string,
    fullName: string,
    roleCode: 'MANAGER' | 'CASHIER'
  ): { user: User; tempPassword: string } {
    const currentUser = this.getCurrentUser();
    if (!this.hasPermission('branch.manage')) {
      throw new Error('Bạn không có quyền quản lý nhân viên');
    }
    const state = mockStorage.getState();
    if (state.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
      throw new Error('Tên đăng nhập đã tồn tại trong hệ thống (BR-97)');
    }

    const tempPassword = `Pass@${Math.floor(100000 + Math.random() * 900000)}`;

    const newUser: User = {
      id: `user-${Date.now()}`,
      store_id: currentUser.store_id,
      branch_id: branchId,
      role_code: roleCode,
      username: username.trim(),
      full_name: fullName.trim(),
      must_change_password: true, // BR-84: Phải đổi mật khẩu ở lần đăng nhập đầu
      is_active: true,
      created_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      users: [...prev.users, newUser],
    }));

    return { user: newUser, tempPassword };
  }

  public static toggleUserActive(userId: string): User {
    const currentUser = this.getCurrentUser();
    if (!this.hasPermission('branch.manage') && currentUser.role_code !== 'PLATFORM_ADMIN') {
      throw new Error('Bạn không có quyền quản lý nhân viên');
    }
    if (currentUser.id === userId) {
      throw new Error('Bạn không được tự khóa tài khoản của chính mình (BR-06)');
    }

    const state = mockStorage.getState();
    const targetUser = state.users.find((u) => u.id === userId);
    if (!targetUser) throw new Error('Không tìm thấy tài khoản người dùng');

    // BR-85: Không được khóa OWNER cuối cùng của store
    if (targetUser.role_code === 'OWNER' && targetUser.is_active) {
      const activeOwners = state.users.filter((u) => u.store_id === targetUser.store_id && u.role_code === 'OWNER' && u.is_active);
      if (activeOwners.length <= 1) {
        throw new Error('Không được khóa tài khoản Chủ cửa hàng cuối cùng đang hoạt động');
      }
    }

    const updatedUser: User = {
      ...targetUser,
      is_active: !targetUser.is_active,
    };

    mockStorage.setState((prev) => ({
      users: prev.users.map((u) => (u.id === userId ? updatedUser : u)),
    }));

    return updatedUser;
  }

  public static updateUserRole(userId: string, newRole: RoleCode): User {
    const currentUser = this.getCurrentUser();
    if (!this.hasPermission('branch.manage') && currentUser.role_code !== 'PLATFORM_ADMIN') {
      throw new Error('Bạn không có quyền thay đổi vai trò nhân viên');
    }
    const state = mockStorage.getState();
    const targetUser = state.users.find((u) => u.id === userId);
    if (!targetUser) throw new Error('Không tìm thấy tài khoản người dùng');

    // BR-85: Không được giáng chức OWNER cuối cùng
    if (targetUser.role_code === 'OWNER' && newRole !== 'OWNER' && targetUser.is_active) {
      const activeOwners = state.users.filter((u) => u.store_id === targetUser.store_id && u.role_code === 'OWNER' && u.is_active);
      if (activeOwners.length <= 1) {
        throw new Error('Không được giáng chức tài khoản Chủ cửa hàng cuối cùng đang hoạt động');
      }
    }

    const updatedUser: User = {
      ...targetUser,
      role_code: newRole,
    };

    mockStorage.setState((prev) => ({
      users: prev.users.map((u) => (u.id === userId ? updatedUser : u)),
    }));

    return updatedUser;
  }

  public static resetUserPassword(userId: string): { user: User; tempPassword: string } {
    const currentUser = this.getCurrentUser();
    if (!this.hasPermission('branch.manage') && currentUser.role_code !== 'PLATFORM_ADMIN') {
      throw new Error('Bạn không có quyền đặt lại mật khẩu nhân viên');
    }
    const state = mockStorage.getState();
    const targetUser = state.users.find((u) => u.id === userId);
    if (!targetUser) throw new Error('Không tìm thấy tài khoản người dùng');

    const tempPassword = `Pass@${Math.floor(100000 + Math.random() * 900000)}`;
    const updatedUser: User = {
      ...targetUser,
      must_change_password: true, // BR-84: Buộc đổi mật khẩu ở lần đăng nhập tiếp theo
    };

    mockStorage.setState((prev) => ({
      users: prev.users.map((u) => (u.id === userId ? updatedUser : u)),
    }));

    return { user: updatedUser, tempPassword };
  }

  // --- MENU & PRODUCTS & TOPPINGS & PROMOTIONS (BR-11, BR-12, BR-36..BR-41, BR-48) ---
  public static createCategory(name: string, sortOrder: number = 1): Category {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý thực đơn');
    const user = this.getCurrentUser();
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      store_id: user.store_id || '',
      name: name.trim(),
      sort_order: sortOrder,
      is_active: true,
    };
    mockStorage.setState((prev) => ({ categories: [...prev.categories, newCat] }));
    return newCat;
  }

  public static updateCategory(categoryId: string, updates: Partial<Category>): Category {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý thực đơn');
    const state = mockStorage.getState();
    const cat = state.categories.find((c) => c.id === categoryId);
    if (!cat) throw new Error('Nhóm món không tồn tại');
    const updated = { ...cat, ...updates };
    mockStorage.setState((prev) => ({
      categories: prev.categories.map((c) => (c.id === categoryId ? updated : c)),
    }));
    return updated;
  }

  public static toggleCategoryActive(categoryId: string): Category {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý thực đơn');
    const state = mockStorage.getState();
    const cat = state.categories.find((c) => c.id === categoryId);
    if (!cat) throw new Error('Nhóm món không tồn tại');
    const updated = { ...cat, is_active: !cat.is_active };
    mockStorage.setState((prev) => ({
      categories: prev.categories.map((c) => (c.id === categoryId ? updated : c)),
    }));
    return updated;
  }

  public static createProduct(categoryId: string, name: string, description?: string): Product {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý thực đơn');
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      category_id: categoryId,
      name: name.trim(),
      description: description?.trim(),
      is_active: true,
    };
    mockStorage.setState((prev) => ({ products: [...prev.products, newProd] }));
    return newProd;
  }

  public static updateProduct(productId: string, updates: Partial<Product>): Product {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý thực đơn');
    const state = mockStorage.getState();
    const prod = state.products.find((p) => p.id === productId);
    if (!prod) throw new Error('Món không tồn tại');
    const updated = { ...prod, ...updates };
    mockStorage.setState((prev) => ({
      products: prev.products.map((p) => (p.id === productId ? updated : p)),
    }));
    return updated;
  }

  public static toggleProductActive(productId: string): Product {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý thực đơn');
    const state = mockStorage.getState();
    const prod = state.products.find((p) => p.id === productId);
    if (!prod) throw new Error('Món không tồn tại');
    const updated = { ...prod, is_active: !prod.is_active };
    mockStorage.setState((prev) => ({
      products: prev.products.map((p) => (p.id === productId ? updated : p)),
    }));
    return updated;
  }

  public static updateProductSizePrice(productSizeId: string, price: bigint): ProductSize {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý giá món');
    const state = mockStorage.getState();
    const ps = state.productSizes.find((p) => p.id === productSizeId);
    if (!ps) throw new Error('Kích cỡ món không tồn tại');
    const updated = { ...ps, price };
    mockStorage.setState((prev) => ({
      productSizes: prev.productSizes.map((p) => (p.id === productSizeId ? updated : p)),
    }));
    return updated;
  }

  public static createTopping(name: string, price: bigint): Topping {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý thực đơn');
    const user = this.getCurrentUser();
    const newTop: Topping = {
      id: `top-${Date.now()}`,
      store_id: user.store_id || '',
      name: name.trim(),
      price,
      is_active: true,
    };
    mockStorage.setState((prev) => ({ toppings: [...prev.toppings, newTop] }));
    return newTop;
  }

  public static updateTopping(toppingId: string, updates: Partial<Topping>): Topping {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý thực đơn');
    const state = mockStorage.getState();
    const top = state.toppings.find((t) => t.id === toppingId);
    if (!top) throw new Error('Topping không tồn tại');
    const updated = { ...top, ...updates };
    mockStorage.setState((prev) => ({
      toppings: prev.toppings.map((t) => (t.id === toppingId ? updated : t)),
    }));
    return updated;
  }

  public static toggleToppingActive(toppingId: string): Topping {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý thực đơn');
    const state = mockStorage.getState();
    const top = state.toppings.find((t) => t.id === toppingId);
    if (!top) throw new Error('Topping không tồn tại');
    const updated = { ...top, is_active: !top.is_active };
    mockStorage.setState((prev) => ({
      toppings: prev.toppings.map((t) => (t.id === toppingId ? updated : t)),
    }));
    return updated;
  }

  public static linkToppingToCategory(categoryId: string, toppingId: string): void {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý thực đơn');
    const state = mockStorage.getState();
    const exists = state.categoryToppings.some((ct) => ct.category_id === categoryId && ct.topping_id === toppingId);
    if (!exists) {
      mockStorage.setState((prev) => ({
        categoryToppings: [...prev.categoryToppings, { category_id: categoryId, topping_id: toppingId }],
      }));
    }
  }

  public static unlinkToppingFromCategory(categoryId: string, toppingId: string): void {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý thực đơn');
    mockStorage.setState((prev) => ({
      categoryToppings: prev.categoryToppings.filter(
        (ct) => !(ct.category_id === categoryId && ct.topping_id === toppingId)
      ),
    }));
  }

  public static createPromotion(promo: Omit<PromotionCode, 'id' | 'used_count'>): PromotionCode {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý khuyến mãi');
    const newPromo: PromotionCode = {
      ...promo,
      id: `promo-${Date.now()}`,
      code: promo.code.trim().toUpperCase(),
      used_count: 0,
    };
    mockStorage.setState((prev) => ({
      promotions: [...prev.promotions, newPromo],
    }));
    return newPromo;
  }

  public static updatePromotion(promoId: string, updates: Partial<PromotionCode>): PromotionCode {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý khuyến mãi');
    const state = mockStorage.getState();
    const promo = state.promotions.find((p) => p.id === promoId);
    if (!promo) throw new Error('Khuyến mãi không tồn tại');
    const updated = { ...promo, ...updates };
    mockStorage.setState((prev) => ({
      promotions: prev.promotions.map((p) => (p.id === promoId ? updated : p)),
    }));
    return updated;
  }

  public static togglePromotionActive(promoId: string): PromotionCode {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý khuyến mãi');
    const state = mockStorage.getState();
    const promo = state.promotions.find((p) => p.id === promoId);
    if (!promo) throw new Error('Khuyến mãi không tồn tại');
    const updated = { ...promo, is_active: !promo.is_active };
    mockStorage.setState((prev) => ({
      promotions: prev.promotions.map((p) => (p.id === promoId ? updated : p)),
    }));
    return updated;
  }

  // --- INGREDIENTS & RECIPES (BR-48, BR-49) ---
  public static createIngredient(name: string, unit: string): Ingredient {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý nguyên liệu');
    const user = this.getCurrentUser();
    const newIng: Ingredient = {
      id: `ing-${Date.now()}`,
      store_id: user.store_id || '',
      name: name.trim(),
      unit: unit.trim(),
      is_active: true,
    };
    mockStorage.setState((prev) => ({
      ingredients: [...prev.ingredients, newIng],
    }));
    return newIng;
  }

  public static updateIngredient(ingredientId: string, updates: Partial<Ingredient>): Ingredient {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý nguyên liệu');
    const state = mockStorage.getState();
    const ing = state.ingredients.find((i) => i.id === ingredientId);
    if (!ing) throw new Error('Nguyên liệu không tồn tại');
    const updated = { ...ing, ...updates };
    mockStorage.setState((prev) => ({
      ingredients: prev.ingredients.map((i) => (i.id === ingredientId ? updated : i)),
    }));
    return updated;
  }

  public static toggleIngredientActive(ingredientId: string): Ingredient {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý nguyên liệu');
    const state = mockStorage.getState();
    const ing = state.ingredients.find((i) => i.id === ingredientId);
    if (!ing) throw new Error('Nguyên liệu không tồn tại');
    const updated = { ...ing, is_active: !ing.is_active };
    mockStorage.setState((prev) => ({
      ingredients: prev.ingredients.map((i) => (i.id === ingredientId ? updated : i)),
    }));
    return updated;
  }

  public static saveProductSizeRecipe(
    productSizeId: string,
    ingredients: { ingredient_id: string; quantity: number }[]
  ): void {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý công thức');
    mockStorage.setState((prev) => {
      const remaining = prev.recipes.filter((r) => r.product_size_id !== productSizeId);
      const newItems: ProductSizeIngredient[] = ingredients.map((item) => ({
        product_size_id: productSizeId,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
      }));
      return { recipes: [...remaining, ...newItems] };
    });
  }

  public static saveToppingRecipe(
    toppingId: string,
    ingredients: { ingredient_id: string; quantity: number }[]
  ): void {
    if (!this.hasPermission('product.manage')) throw new Error('Bạn không có quyền quản lý công thức');
    mockStorage.setState((prev) => {
      const remaining = prev.toppingRecipes.filter((r) => r.topping_id !== toppingId);
      const newItems: ToppingIngredient[] = ingredients.map((item) => ({
        topping_id: toppingId,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
      }));
      return { toppingRecipes: [...remaining, ...newItems] };
    });
  }

  // --- STAFF SHIFTS & FORCE CLOSE (BR-15, BR-18, BR-19, BR-20, BR-88) ---
  public static checkInStaffShift(userId: string, branchId: string): WorkShift {
    const user = this.getCurrentUser();
    const state = mockStorage.getState();
    const activeShift = state.workShifts.find((s) => s.user_id === userId && s.status === 'OPEN');
    if (activeShift) {
      throw new Error('Nhân viên này đã có một ca làm việc đang mở (BR-18)');
    }

    const newShift: WorkShift = {
      id: `shift-staff-${Date.now()}`,
      store_id: user.store_id || '',
      branch_id: branchId,
      user_id: userId,
      shift_type: 'STAFF', // BR-15: ca phục vụ/pha chế không gắn với két tiền
      status: 'OPEN',
      started_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      workShifts: [newShift, ...prev.workShifts],
    }));

    return newShift;
  }

  public static checkOutStaffShift(shiftId: string): WorkShift {
    const state = mockStorage.getState();
    const shift = state.workShifts.find((s) => s.id === shiftId);
    if (!shift || shift.status !== 'OPEN') {
      throw new Error('Ca làm việc này đã kết thúc hoặc không tồn tại');
    }

    const updatedShift: WorkShift = {
      ...shift,
      status: 'CLOSED',
      ended_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      workShifts: prev.workShifts.map((s) => (s.id === shiftId ? updatedShift : s)),
    }));

    return updatedShift;
  }

  public static getOpenInvoicesForShift(shiftId: string): (Invoice & { tableName?: string })[] {
    const state = mockStorage.getState();
    return state.invoices
      .filter((inv) => inv.work_shift_id === shiftId && inv.status === 'OPEN')
      .map((inv) => {
        const table = state.tables.find((t) => t.id === inv.dining_table_id);
        return {
          ...inv,
          tableName: table ? `${table.name} (${table.area})` : 'Mang đi',
        };
      });
  }

  public static forceCloseShift(
    shiftId: string,
    managerId: string,
    countedCash: bigint,
    reason: string
  ): { reconciliation: CashReconciliation; shift: WorkShift } {
    if (!this.hasPermission('shift.force_close')) {
      throw new Error('Bạn không có quyền đóng cưỡng chế ca của người khác (BR-20)');
    }
    if (!reason || !reason.trim()) {
      throw new Error('Bắt buộc phải nhập lý do khi đóng cưỡng chế ca (BR-20, BR-88)');
    }

    const state = mockStorage.getState();
    const shift = state.workShifts.find((s) => s.id === shiftId);
    if (!shift || shift.status !== 'OPEN') {
      throw new Error('Ca làm việc này đã đóng hoặc không tồn tại');
    }

    // BR-19: Phải kiểm tra đơn OPEN
    const openInvoices = this.getOpenInvoicesForShift(shiftId);
    if (openInvoices.length > 0) {
      throw new Error(`Còn ${openInvoices.length} đơn chưa thanh toán thuộc ca này. Phải giải quyết xong các đơn này trước khi đóng ca (BR-19)`);
    }

    // Tính toán đối soát két tiền
    const openingInfo = this.getExpectedOpeningCash(shift.branch_id);
    const opening_cash = openingInfo.amount;

    const paidInvoices = state.invoices.filter((inv) => inv.work_shift_id === shiftId && inv.status === 'PAID');
    let cash_sales_amount = 0n;
    paidInvoices.forEach((inv) => {
      inv.payments.forEach((p) => {
        if (p.method === 'CASH') cash_sales_amount += p.amount;
      });
    });

    const expenses = state.shiftExpenses.filter((e) => e.work_shift_id === shiftId && e.paid_from_drawer);
    const expense_amount = expenses.reduce((sum, e) => sum + e.amount, 0n);

    const expected_cash = opening_cash + cash_sales_amount - expense_amount;
    const difference = countedCash - expected_cash;

    let reconStatus: CashReconciliation['status'] = 'MATCHED';
    if (difference < 0n) reconStatus = 'SHORTAGE';
    else if (difference > 0n) reconStatus = 'OVERAGE';

    const reconciliation: CashReconciliation = {
      id: `recon-${Date.now()}`,
      work_shift_id: shiftId,
      opening_cash,
      cash_sales_amount,
      expense_amount,
      expected_cash,
      counted_cash: countedCash,
      difference,
      status: reconStatus,
      note: `[Đóng cưỡng chế bởi Quản lý ${managerId}]: ${reason.trim()}`,
      created_at: new Date().toISOString(),
    };

    const updatedShift: WorkShift = {
      ...shift,
      status: 'CLOSED',
      ended_at: new Date().toISOString(),
    };

    mockStorage.setState((prev) => ({
      workShifts: prev.workShifts.map((s) => (s.id === shiftId ? updatedShift : s)),
      cashReconciliations: [reconciliation, ...prev.cashReconciliations],
    }));

    return { reconciliation, shift: updatedShift };
  }

  // Helper chuyển đổi múi giờ sang Asia/Ho_Chi_Minh (UTC+7)
  public static toVnDateString(isoDateStr: string): string {
    const d = new Date(isoDateStr);
    const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    return vnTime.toISOString().slice(0, 10);
  }

  // Định dạng ngày Việt Nam dd/MM/yyyy
  public static formatVnDate(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  // --- DAILY REPORT (BR-62, BR-63, BR-64, BR-65, BR-77, BR-81) ---
  public static getDailyReport(branchId?: string, dateStr?: string, customUser?: User) {
    const user = customUser || this.getCurrentUser();
    const state = mockStorage.getState();

    // BR-81: Quản trị nền tảng không được xem dữ liệu vận hành
    if (user.role_code === 'PLATFORM_ADMIN') {
      throw new Error('Quản trị viên nền tảng không có quyền xem dữ liệu vận hành (BR-81)');
    }

    // Phân quyền theo quyền động (BR-05, BR-65, BR-77)
    const canViewAll = this.hasPermission('report.view_all');
    const canViewBranch = this.hasPermission('report.view_branch');

    if (!canViewAll && !canViewBranch) {
      throw new Error('Bạn không có quyền xem báo cáo doanh thu ngày (BR-65)');
    }

    let effectiveBranch = branchId;
    if (canViewAll) {
      if (!effectiveBranch || effectiveBranch === 'ALL') {
        effectiveBranch = 'ALL';
      }
    } else {
      effectiveBranch = user.branch_id || '';
    }

    const targetDate = dateStr || this.toVnDateString(new Date().toISOString());

    // BR-62: Chỉ tính hóa đơn PAID
    // BR-63: Gom theo paid_at ở múi giờ Việt Nam Asia/Ho_Chi_Minh
    let paidInvoices = state.invoices.filter((inv) => {
      if (inv.status !== 'PAID' || !inv.paid_at) return false;
      if (inv.store_id !== user.store_id) return false;
      const invDate = this.toVnDateString(inv.paid_at);
      return invDate === targetDate;
    });

    if (effectiveBranch && effectiveBranch !== 'ALL') {
      paidInvoices = paidInvoices.filter((inv) => inv.branch_id === effectiveBranch);
    }

    let cashRevenue = 0n;
    let transferRevenue = 0n;

    paidInvoices.forEach((inv) => {
      inv.payments.forEach((p) => {
        if (p.method === 'CASH') cashRevenue += p.amount;
        else if (p.method === 'TRANSFER') transferRevenue += p.amount;
      });
    });

    const totalRevenue = cashRevenue + transferRevenue;

    return {
      date: targetDate,
      dateFormatted: this.formatVnDate(targetDate),
      totalRevenue,
      cashRevenue,
      transferRevenue,
      invoiceCount: paidInvoices.length,
      invoices: paidInvoices,
      branch_id: effectiveBranch,
      role_scope: user.role_code,
    };
  }
}
