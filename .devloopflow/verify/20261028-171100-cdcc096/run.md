# QA Evidence: Impeccable Refinement for POS_UI

- **Thời điểm:** 2026-10-28 17:11:00 (Asia/Ho_Chi_Minh)
- **Commit SHA:** cdcc096 (dirty)
- **Môi trường:** Local Windows x64 (local do agent chạy)
- **Lệnh 1:** `& ".agent/skills/impeccable/scripts/impeccable.cmd" detect POS_UI`
  - **Exit Code:** 0
  - **Kết quả:** 53 files scanned, 0 anti-patterns found, 0 advisory notes.
- **Lệnh 2:** `npm --prefix POS_UI run build`
  - **Exit Code:** 0
  - **Kết quả:** `tsc --noEmit` thành công, Vite build thành công:
    - `dist/index.html` 0.94 kB
    - `dist/assets/index-CSRO8YTH.css` 3.66 kB
    - `dist/assets/index-CHL5ekai.js` 440.65 kB
    - Time: 16.17s

## Chi tiết rà soát và khắc phục

1. **`POS_UI/src/index.css`:**
   - Đổi easing token `--ease-out-spring` thành `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` per Impeccable craft-floor quy tắc `[bounce-easing]`.
   - Cập nhật toàn bộ các animations (`modalPop`, `drawerSlide`, `touch-press`) sang `--ease-out-expo` mượt mà, loại bỏ cảm giác rung nảy giật (bounce/elastic).

2. **`POS_UI/src/features/auth/LoginScreen.tsx`:**
   - Loại bỏ hoàn toàn AI Slop: dark gaming gradient (`#2E1A11 -> #170C07`), vòng khói cà phê giả lập, `backdropFilter: blur`, màu cam neon sai chuẩn (`#C76B22`).
   - Thiết kế lại chuẩn tinh thần "Quầy pha chế sạch và sáng" theo `DESIGN.md`: nền đá xám lạnh `var(--color-bg)` (`#F2F4F5`), thẻ làm việc trắng phẳng `var(--color-surface)` (`#FFFFFF`), màu thương hiệu nâu phin `var(--color-brand-800)` (`#43291A`) và `var(--color-brand-600)` (`#7A4A2B`).
   - Nút đăng nhập chính đạt kích thước chuẩn tablet 56px per `DESIGN.md` §4.3.

3. **Loại bỏ Kicker Text / ALL-CAPS Labels:**
   - `AppShell.tsx`: Đổi `CHỌN CHI NHÁNH LÀM VIỆC` thành `Chọn chi nhánh làm việc`.
   - `DemoSwitcher.tsx`: Đổi `CHỌN TÀI KHOẢN ĐỂ KIỂM TRA PHÂN QUYỀN` thành `Chọn tài khoản kiểm tra phân quyền`.
   - `DailyReportScreen.tsx`: Đổi `TỔNG DOANH THU` -> `Tổng doanh thu`, `TIỀN MẶT (CASH)` -> `Tiền mặt`, `CHUYỂN KHOẢN (TRANSFER)` -> `Chuyển khoản`.

4. **Nâng cấp Touch Targets cho quầy Tablet ($\ge 44-48$px):**
   - `OrderPanel.tsx`: Ô nhập mã giảm giá và nút "Áp mã" tăng từ 40px lên 48px; nút đóng mobile drawer tăng từ 36px lên 44px.
   - `PaymentDialog.tsx`: Nút gợi ý tiền nhanh tăng từ 38px lên 44px; điểm nhấn tiền thối tăng lên 56px với cỡ chữ 30px to rõ.
   - `AppShell.tsx`: Nút Đăng xuất tăng từ 38px lên 44px, nút chọn chi nhánh tăng lên 44px.
   - `TableMap.tsx`: Chip khu vực tăng từ 40px lên 44px.
   - `InvoicesScreen.tsx`: Chip lọc trạng thái tăng từ 36px lên 44px.
   - `InventoryScreen.tsx`: Nút lọc tồn âm tăng từ 36px lên 44px.
   - `ProductsScreen.tsx`: Chip lọc danh mục tăng từ 36px lên 44px.

