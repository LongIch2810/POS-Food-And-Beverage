# QA Evidence: Full Responsive Cross-Device Optimization

- **Thời điểm:** 2026-10-28 17:25:00 (Asia/Ho_Chi_Minh)
- **Commit SHA:** cdcc096 (dirty)
- **Môi trường:** Local Windows x64 (local do agent chạy)
- **Lệnh 1:** `& ".agent/skills/impeccable/scripts/impeccable.cmd" detect POS_UI`
  - **Exit Code:** 0
  - **Kết quả:** 53 files scanned, 0 anti-patterns, 0 advisory notes.
- **Lệnh 2:** `npm --prefix POS_UI run build`
  - **Exit Code:** 0
  - **Kết quả:**
    - `dist/index.html` 0.93 kB
    - `dist/assets/index-C5HvmAWt.css` 4.28 kB
    - `dist/assets/index-Dpu9g1da.js` 445.67 kB
    - Thời gian build: 1.90s (0 errors, 0 warnings)

## Danh mục tối ưu Responsive đa thiết bị

1. **`POS_UI/index.html`:**
   - Xóa bỏ `user-scalable=no, maximum-scale=1.0` vi phạm WCAG 1.4.4 (Resize Text).
   - Thiết lập chuẩn: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`.

2. **`POS_UI/src/index.css`:**
   - Bổ sung responsive utilities: `.page-container`, `.scroll-touch`, `.no-scrollbar`.
   - Media queries `@media (max-width: 767px)` và `@media (max-width: 640px)` hỗ trợ ẩn/hiện thành phần linh hoạt.
   - Hiệu ứng slide-in mượt mà `@keyframes mobileNavSlideIn` cho Mobile Navigation Drawer.

3. **`POS_UI/src/components/common/AppShell.tsx`:**
   - **Màn hình lớn $\ge 768$px (Desktop & Tablet):** Giữ nguyên thanh Rail 80px nền nâu phin `--color-brand-800` chuẩn `DESIGN.md`.
   - **Màn hình nhỏ $< 768$px (Điện thoại):**
     - Ẩn rail 80px để nhường 100% diện tích chiều ngang cho giao diện làm việc.
     - Header bổ sung nút Menu Hamburger 44px bên trái.
     - Mở Mobile Navigation Drawer (rộng 280px) trượt từ trái ra khi chạm Menu: đầy đủ logo, thông tin nhân sự, danh sách toàn bộ tab theo quyền và nút đăng xuất.
     - Chip trạng thái ca và thông tin user tự động thu gọn thông minh.

4. **`POS_UI/src/components/common/DemoSwitcher.tsx`:**
   - Thêm class `.demo-text-medium` để trên màn hình mobile ($< 640$px) chỉ hiển thị badge `DEMO` và nút chuyển vai trò, chống tràn layout.

5. **`POS_UI/src/components/ui/Dialog.tsx`:**
   - Padding responsive `min(16px, 3vw)` và maxHeight `min(92vh, calc(100vh - 20px))`.
   - Content có `WebkitOverflowScrolling: 'touch'`.

6. **`POS_UI/src/features/pos/PaymentDialog.tsx`:**
   - Sử dụng CSS Grid tự động thích ứng `gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'`: tự động chuyển từ 2 cột sang 1 cột trên điện thoại (tiền ở trên, numpad ở dưới).
   - Nút hành động Footer co giãn `flex: 1` với `minWidth: 160px` tránh tràn viền mobile 375px.

7. **`POS_UI/src/features/pos/ProductGrid.tsx` & `TableMap.tsx`:**
   - Padding container co giãn `clamp(12px, 2.5vw, 16px)`.
   - Thanh Tab danh mục và khu vực cuộn ngang cảm ứng quán tính `overflowX: 'auto', WebkitOverflowScrolling: 'touch'`, các nút không bị co rúm (`flexShrink: 0`).

8. **Các màn hình Quản trị (`DailyReportScreen`, `InventoryScreen`, `InvoicesScreen`, `SettingsScreen`, `ProductsScreen`):**
   - Padding thích ứng `clamp(14px, 2.5vw, 24px)`.
   - Bảng dữ liệu tự động cho phép vuốt ngang an toàn mà không làm bung trang.

