# Task: Khắc phục các findings thẩm định mã nguồn Sprint 4 (PB-05 & PB-13)

**Trạng thái:** COMPLETED
**Nhánh:** `feat/pb05-menu`
**Mục tiêu:** Xử lý triệt để tất cả các findings (1 CRITICAL, 2 HIGH, 3 MEDIUM, 2 LOW) do subagent `code-reviewer` phát hiện.

## Việc đã hoàn tất
1. **CRITICAL #1 (Đồng bộ mã quyền truy cập màn hình):**
   - Sửa [`POS_UI/src/app/navigation.ts`](file:///d:/saved/Project/POS-F&B/POS_UI/src/app/navigation.ts#L18) và [`POS_UI/src/app/App.tsx`](file:///d:/saved/Project/POS-F&B/POS_UI/src/app/App.tsx#L103) bổ sung quyền `menu.read` và `menu.manage`. OWNER và MANAGER sau khi đăng nhập thật với API hiện tab "Thực đơn" và truy cập bình thường.
   - Bỏ banner cảnh báo "dùng dữ liệu mẫu" trên tab `products` trong `App.tsx` vì tab này đã nối API thật.
2. **HIGH #2 (Logic kiểm tra trùng tên khi chuyển danh mục):**
   - Sửa [`POS_API/src/menu/menu.service.ts`](file:///d:/saved/Project/POS-F&B/POS_API/src/menu/menu.service.ts): tính `categoryChanged` và `nameChanged` trước khi mutate `product.category_id`.
   - Khi chuyển danh mục mà không truyền `name`, hệ thống kiểm tra `product.name` hiện tại có trùng với món nào trong danh mục đích không. Nếu trùng -> trả đúng `409 DUPLICATE_RESOURCE` thay vì sập lỗi 500.
3. **HIGH #3 (Transaction trong `deleteCategory`):**
   - Bọc toàn bộ thao tác xóa `CategoryTopping` và `Category` vào trong `dataSource.transaction(async manager => { ... })`. Đảm bảo nếu xóa danh mục thất bại, liên kết topping không bị xóa mất.
4. **MEDIUM #4 (Helper bắt lỗi DB constraints chống race condition):**
   - Triển khai `withConstraintHandling` trong `menu.service.ts` bao bọc các thao tác ghi (create/patch/delete của category, size, product, product_size, topping), chuyển đổi lỗi PostgreSQL `23505` thành `409 DUPLICATE_RESOURCE` và `23503` thành `409 RESOURCE_IN_USE`.
5. **MEDIUM #5 (Mã HTTP 413 trong `ApiErrorFilter`):**
   - Thêm `413: { code: 'FILE_TOO_LARGE', message: 'Dung lượng file tải lên vượt quá giới hạn cho phép (tối đa 2 MB).' }` vào [`api-error.filter.ts`](file:///d:/saved/Project/POS-F&B/POS_API/src/http/api-error.filter.ts).
6. **MEDIUM #6 (Hỗ trợ `FormData` trong client HTTP của UI):**
   - Sửa [`POS_UI/src/http/client.ts`](file:///d:/saved/Project/POS-F&B/POS_UI/src/http/client.ts) để nhận `FormData`, tự động bỏ header JSON Content-Type (để trình duyệt sinh boundary), đồng thời tự động áp dụng cơ chế xác thực HttpOnly cookie, CSRF token, session epoch guard và tự refresh token khi nhận 401.
   - Đơn giản hóa `uploadProductImage` trong `menuService.ts` chỉ cần gọi qua `request()`.
7. **LOW #7 (Tránh N+1 call khi tải Topping danh mục):**
   - Tối ưu `ProductsScreen.tsx`: chỉ fetch mapping topping danh mục cho danh mục đang lọc hoặc khi ở tab `toppings`, không lặp 25 request song song mỗi lần reload dữ liệu.
8. **LOW #8 (Cache-busting cho ảnh món ăn):**
   - Thêm query string timestamp `?v=${encodeURIComponent(product.updatedAt)}` vào thẻ `<img src={...} />` trong `ProductsScreen.tsx`.
9. **Kiểm thử hồi quy:**
   - Bổ sung 2 test cases mới vào `menu.integration.test.ts` (test chuyển category trùng tên không truyền name -> 409; test upload ảnh > 2MB -> 413 FILE_TOO_LARGE).
   - Chạy lại toàn bộ test: Menu Integration Test (8/8 pass), Foundation Test (1/1 pass), Frontend Tests (31/31 pass).

## Kết quả nghiệm thu
- Toàn bộ 8 findings review đã được fix triệt để.
- Backend và Frontend build sạch sẽ không lỗi.
- Đã sẵn sàng nghiệm thu Sprint 4.

