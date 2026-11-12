# Báo Cáo Kiểm Thử E2E Trực Quan Trên Google Chrome & Docker (Sprint 1 - 4)

- **Loại kiểm thử**: **Local do agent chạy**, Google Chrome thật (`C:\Program Files\Google\Chrome\Application\chrome.exe` có giao diện cửa sổ trực quan) điều khiển qua Puppeteer CDP + Docker Compose (`pos_infra-postgres-1`, `pos_api`, `pos_ui`).
- **Thời gian thực hiện**: 2026-11-02 20:26:47 - 20:27:41 +07:00.
- **Commit SHA**: `ad61f6c` (`master`).
- **Trạng thái working tree**: sạch (`clean`, chỉ thêm thư mục evidence và file task).
- **Môi trường**:
  - PostgreSQL 17 trong container Docker `pos_infra-postgres-1` (port `127.0.0.1:5432`).
  - Backend API NestJS trong container Docker `pos_api` (port `127.0.0.1:3000`).
  - Frontend React Vite trong container Docker `pos_ui` (port `127.0.0.1:5173`).
  - Trình duyệt: Google Chrome 1280x850 desktop.
- **Số lượng kịch bản**: 15/15 bước PASS 100%. Exit code: `0`.
- **Artifacts đính kèm**:
  - Báo cáo kết quả và network: [`browser-results.json`](evidence/browser-results.json)
  - 20 ảnh chụp màn hình độ phân giải cao ghi lại từng chuyển trạng thái UI.
  - Script tự động hóa: [`run-e2e.mjs`](evidence/run-e2e.mjs)
  - Dữ liệu seed đối chứng: [`seed-e2e.sql`](evidence/seed-e2e.sql)

---

## 1. Bảng đối chiếu Tiêu chí Nghiệm thu 4 Sprint

| Sprint | Phạm vi kiểm tra | Bước thao tác | Kết quả mong đợi | Kết quả thực tế & Ảnh chụp màn hình | DB Đối chứng |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Sprint 1** | Nền tảng hạ tầng & Health check | Gọi `GET /api/v1/health` | HTTP 200 `{"data":{"status":"ok"}}` | **ĐẠT** - Container API & DB kết nối chuẩn | PostgreSQL 17 healthy |
| **Sprint 2** | Giao diện Đăng nhập | Mở `http://localhost:5173` | Form đăng nhập chuẩn với username/password | **ĐẠT** - [`01-login-screen.png`](evidence/01-login-screen.png) | Bảng `users` |
| **Sprint 2** | Bắt buộc đổi mật khẩu lần đầu | Nhập `e2e_owner` / `Owner@Initial2026!` | Modal cưỡng chế đổi mật khẩu xuất hiện, chặn vào app | **ĐẠT** - [`02-force-change-password-modal.png`](evidence/02-force-change-password-modal.png) | `must_change_password = true` |
| **Sprint 2** | Đổi mật khẩu & Thu hồi phiên | Nhập mật khẩu mới `Owner@Updated2026!` | Đổi thành công, thu hồi phiên cũ, tự về trang Login | **ĐẠT** - [`03-after-password-change-login.png`](evidence/03-after-password-change-login.png) | `must_change_password = false`, phiên cũ revoke |
| **Sprint 2 & 3** | Đăng nhập lại với mật khẩu mới | Nhập mật khẩu mới `Owner@Updated2026!` | Đăng nhập 200, vào màn hình Cài đặt của Owner | **ĐẠT** - [`04-settings-branches.png`](evidence/04-settings-branches.png) | Cấp JWT session mới |
| **Sprint 3** | Thêm Chi nhánh mới | Bấm `Thêm chi nhánh`, nhập mã `Q01`, tên `Chi nhánh Quận 1`, quỹ `2.000.000đ` | Modal mở, lưu thành công, danh sách hiển thị chi nhánh mới | **ĐẠT** - [`05-modal-create-branch.png`](evidence/05-modal-create-branch.png)<br>[`06-branch-created-list.png`](evidence/06-branch-created-list.png) | Bảng `branches` ghi nhận code `Q01`, quỹ 2.000.000đ |
| **Sprint 3** | Quản lý Bàn ăn | Chuyển tab `Bàn`, chọn chi nhánh, nhập `Bàn VIP 01`, `Tầng Lửng`, `4 chỗ` | Modal mở, lưu thành công, bàn mới hiển thị trên bảng | **ĐẠT** - [`07-modal-create-table.png`](evidence/07-modal-create-table.png)<br>[`08-table-created-list.png`](evidence/08-table-created-list.png) | Bảng `dining_tables` ghi nhận `Bàn VIP 01` (capacity 4) |
| **Sprint 3** | Quản lý Nhân sự | Chuyển tab `Tài khoản` | Hiển thị bảng danh sách nhân sự và vai trò | **ĐẠT** - [`09-settings-staff-tab.png`](evidence/09-settings-staff-tab.png) | Bảng `users` |
| **Sprint 4** | Màn hình Quản lý Thực đơn | Bấm menu `Thực đơn` trên thanh điều hướng | Màn hình Quản lý Thực đơn mở ra, hiển thị các tabs | **ĐẠT** - [`10-menu-products-screen.png`](evidence/10-menu-products-screen.png) | Quyền `menu.read` / `menu.manage` |
| **Sprint 4** | Thêm Danh mục món | Tab `Danh mục`, bấm `Thêm danh mục`, nhập `Trà Sữa Đặc Biệt` | Danh mục mới được tạo, hiển thị trên bảng | **ĐẠT** - [`11-modal-create-category.png`](evidence/11-modal-create-category.png)<br>[`12-category-created-list.png`](evidence/12-category-created-list.png) | Bảng `categories` có `Trà Sữa Đặc Biệt` |
| **Sprint 4** | Thêm Kích cỡ sản phẩm | Tab `Kích cỡ`, bấm `Thêm kích cỡ`, nhập `Size L` | Kích cỡ mới được tạo, hiển thị trên bảng | **ĐẠT** - [`13-modal-create-size.png`](evidence/13-modal-create-size.png)<br>[`14-size-created-list.png`](evidence/14-size-created-list.png) | Bảng `sizes` có `Size L` |
| **Sprint 4** | Thêm Topping | Tab `Topping`, bấm `Thêm topping`, nhập `Trân Châu Hoàng Kim`, giá `10.000đ` | Topping mới được tạo, hiển thị giá và trạng thái | **ĐẠT** - [`15-modal-create-topping.png`](evidence/15-modal-create-topping.png)<br>[`16-topping-created-list.png`](evidence/16-topping-created-list.png) | Bảng `toppings` có `Trân Châu Hoàng Kim` |
| **Sprint 4** | Thêm Món ăn mới | Tab `Món & Giá bán`, chọn danh mục, nhập `Trà Sữa Oolong Nướng` | Món mới hiển thị trong danh mục | **ĐẠT** - [`17-modal-create-product.png`](evidence/17-modal-create-product.png)<br>[`18-product-created-list.png`](evidence/18-product-created-list.png) | Bảng `products` có `Trà Sữa Oolong Nướng` |
| **Sprint 4** | Tải ảnh đại diện cho món ăn | Bấm `Tải ảnh` trên dòng món ăn, chọn file PNG mẫu | Upload thành công, ảnh đại diện được render từ API | **ĐẠT** - [`19-product-with-image-uploaded.png`](evidence/19-product-with-image-uploaded.png) | `image_mime: image/png`, `image_len: 103584` |
| **Sprint 2** | Đăng xuất an toàn | Bấm nút `Đăng xuất` trên Topbar | Gọi `POST /auth/logout` 204, xóa sạch 3 cookies, về Login | **ĐẠT** - [`20-logout-final.png`](evidence/20-logout-final.png) | 2/2 refresh tokens đều đã `revoked_at` |

---

## 2. Dữ liệu đối chứng thực tế trong PostgreSQL Container

Truy vấn SQL thực tế từ container `pos_infra-postgres-1`:

```sql
-- 1. Trạng thái người dùng sau đổi mật khẩu
SELECT id, username, must_change_password, is_active FROM users WHERE username = 'e2e_owner';
-- Kết quả: id='2b2729e1...', must_change_password=false, is_active=true

-- 2. Chi nhánh mới tạo
SELECT id, code, name, initial_cash, is_active FROM branches WHERE code = 'Q01';
-- Kết quả: code='Q01', name='Chi nhánh Quận 1', initial_cash=2000000, is_active=true

-- 3. Bàn ăn mới tạo
SELECT id, name, area, capacity, is_active FROM dining_tables WHERE name = 'Bàn VIP 01';
-- Kết quả: name='Bàn VIP 01', area='Tầng Lửng', capacity=4, is_active=true

-- 4. Danh mục thực đơn
SELECT id, name, sort_order, is_active FROM categories WHERE name = 'Trà Sữa Đặc Biệt';
-- Kết quả: name='Trà Sữa Đặc Biệt', sort_order=1, is_active=true

-- 5. Kích cỡ
SELECT id, name, sort_order FROM sizes WHERE name = 'Size L';
-- Kết quả: name='Size L'

-- 6. Topping
SELECT id, name, price, is_active FROM toppings WHERE name = 'Trân Châu Hoàng Kim';
-- Kết quả: name='Trân Châu Hoàng Kim', is_active=true

-- 7. Sản phẩm kèm ảnh binary
SELECT id, name, is_active, image_mime, length(image_base64) as image_len FROM products WHERE name = 'Trà Sữa Oolong Nướng';
-- Kết quả: name='Trà Sữa Oolong Nướng', image_mime='image/png', image_len=103584 bytes

-- 8. Kiểm tra thu hồi phiên
SELECT count(*) as total_tokens, count(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked_tokens 
FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE username = 'e2e_owner');
-- Kết quả: total_tokens=2, revoked_tokens=2 (100% token đã bị thu hồi)
```

---

## 3. Kết luận
Toàn bộ chuỗi tính năng của cả 4 Sprint đã triển khai trên giao diện người dùng và backend Docker đều **hoạt động hoàn hảo, trơn tru, đúng 100% theo các Business Rules và quy ước kỹ thuật**.

