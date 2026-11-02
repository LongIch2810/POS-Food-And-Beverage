# Báo cáo Kiểm thử Độc lập Đối chứng — Hệ thống POS F&B trên Môi trường Docker PostgreSQL 17

- **Ngày thực hiện:** 2026-11-02 19:07:53 (UTC+7) / 2026-11-02 12:07:53 (UTC)
- **Thời gian hoàn thành:** 2026-11-02 19:12:00 (UTC+7) / 2026-11-02 12:12:00 (UTC)
- **Người thực hiện:** Subagent QA (Kiểm thử độc lập)
- **Commit SHA:** `31f479986a12e1031afd9a42b2483a20a4193b68` (`31f4799`)
- **Trạng thái Working Tree:** Dirty (bao gồm các triển khai PB-05, PB-13, migrations, tests và artifacts Sprint 4)
- **Môi trường thực thi:**
  - Hệ điều hành: Microsoft Windows 11 Pro (OS Build 22631)
  - Node.js: `v22.22.2` (npm `10.9.7`)
  - Cơ sở dữ liệu: **PostgreSQL 17.9 (Debian 17.9-1.pgdg13+1)** chạy trên Docker container `pos_infra-postgres-1` (ánh xạ `127.0.0.1:5432->5432/tcp`), user: `pos_local`
  - Nhãn xác thực: **Local do agent chạy (Subagent QA độc lập trên Docker PostgreSQL 17)**

---

## 1. Tổng quan Kết quả Thực thi

Toàn bộ các bộ kiểm thử backend (Menu Integration, Foundation, Auth, Organization, Platform) cùng bộ Frontend Suite và Production Build đã được chạy độc lập trên môi trường Docker PostgreSQL 17. 100% test case vượt qua thành công với Exit Code `0`.

| Bộ kiểm thử / Runner | Lệnh chính xác đã chạy | Thời gian thực thi | Exit Code | Kết quả Pass/Fail | File Artifact Gốc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Menu Integration Test** | `node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\menu\tests\menu.integration.test.js"` | ~5.39s | `0` | **8/8 Pass** (0 fail, 0 skip) | [`backend-menu-test.log`](backend-menu-test.log) |
| **Foundation Regression** | `node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\foundation.test.js"` | ~7.78s | `0` | **1/1 Pass** (0 fail, 0 skip) | [`backend-regression-foundation.log`](backend-regression-foundation.log) |
| **Auth Regression** | `node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\auth\tests\auth.integration.test.js"` | ~22.66s | `0` | **1/1 Pass** (0 fail, 0 skip) | [`backend-regression-auth.log`](backend-regression-auth.log) |
| **Organization Regression** | `node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\organization\tests\organization.integration.test.js"` | ~56.60s | `0` | **11/11 Pass** (0 fail, 0 skip) | [`backend-regression-org.log`](backend-regression-org.log) |
| **Platform Regression** | `node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\platform\tests\platform.integration.test.js"` | ~10.97s | `0` | **1/1 Pass** (0 fail, 0 skip) | [`backend-regression-platform.log`](backend-regression-platform.log) |
| **Frontend UI Suite** | `npm --prefix "d:\saved\Project\POS-F&B\POS_UI" test` | ~1.96s | `0` | **31/31 Pass** (0 fail, 0 skip) | [`frontend-test.log`](frontend-test.log) |
| **Backend Build** | `npm --prefix "d:\saved\Project\POS-F&B\POS_API" run build` | ~2.95s | `0` | **Pass (tsc clean)** | [`backend-build.log`](backend-build.log) |
| **Frontend Build** | `npm --prefix "d:\saved\Project\POS-F&B\POS_UI" run build` | ~5.28s | `0` | **Pass (vite build clean)** | [`frontend-build.log`](frontend-build.log) |

---

## 2. Bảng Đối chiếu Nghiệm thu Sprint 4 (Verification Matrix)

Đối chiếu từng tiêu chí nghiệm thu Sprint 4 (`sprints/sprint-04/SPRINT.md`), `specs/menu.md` và `docs/BUSINESS_RULES.md` với các ID tình huống và log kiểm thử đối chứng trên Docker PostgreSQL 17:

| Tiêu chí nghiệm thu Sprint 4 | ID tình huống | Yêu cầu nghiệp vụ & Quy tắc đối chiếu | Artifact chứng minh | Kết quả |
| :--- | :--- | :--- | :--- | :---: |
| **CRUD Danh mục (Categories)** | `MENU-01` | Tạo danh mục trim khoảng trắng, sắp xếp `sortOrder`. Trùng tên cùng store báo `409 DUPLICATE_RESOURCE` (BR-13). Trùng tên khác store cho phép 201 (BR-80). Danh mục rỗng xóa được (204). Danh mục có món cấm xóa cứng, trả `409 RESOURCE_IN_USE` (BR-10). | [`backend-menu-test.log`](backend-menu-test.log) (ok 1), `menu.service.ts` | **ĐẠT** |
| **CRUD Kích cỡ (Sizes)** | `MENU-02` | CRUD size theo cửa hàng. Trùng tên cùng store báo `409` (BR-13). Cập nhật `sortOrder`. Xóa kích cỡ chưa dùng trả `204`. Kích cỡ đã gán vào món ăn cấm xóa cứng, trả `409 RESOURCE_IN_USE` (BR-10). | [`backend-menu-test.log`](backend-menu-test.log) (ok 2), `menu.service.ts` | **ĐẠT** |
| **CRUD Món (Products)** | `MENU-03` | Tạo món trong danh mục. Trùng tên cùng category báo `409`; trùng tên khác category cho phép 201 (BR-13). Xóa món chưa gán size trả `204`. Danh mục chứa món không thể xóa cứng (409) (BR-10). | [`backend-menu-test.log`](backend-menu-test.log) (ok 3), `menu.service.ts` | **ĐẠT** |
| **Giá theo Size & Ràng buộc BigInt** | `MENU-04` | Giá nằm ở `product_sizes.price` (BR-08). Chặn giá âm (< 0) và vượt trần 1.000 tỷ VND (> 10^12) với mã `422 VALIDATION_ERROR` (BR-103) và CHECK constraint DB PostgreSQL 17. Cấm trùng size trên cùng một món (409). Cấm xóa size/món đã có cấu hình size (409). Hỗ trợ đổi giá (BR-12). | [`backend-menu-test.log`](backend-menu-test.log) (ok 4), Migration `20261102000000-MenuCatalog.ts` | **ĐẠT** |
| **Topping & Liên kết Danh mục** | `MENU-05` | CRUD Topping độc lập. Trùng tên cùng store báo `409` (BR-13). Gán topping vào danh mục (`category_toppings`) theo BR-11. Chặn gán trùng (409). Cấm xóa topping khi đang được liên kết trong danh mục (409) (BR-10). Gỡ liên kết (204) cho phép xóa topping rỗng. | [`backend-menu-test.log`](backend-menu-test.log) (ok 5), `menu.service.ts` | **ĐẠT** |
| **Upload & Phục vụ Ảnh nhị phân** | `MENU-06` | File <= 2MB, validate magic bytes nhị phân JPEG/PNG/WebP (BR-105). Lưu Base64 ngầm trong DB (`select: false` tránh phình RAM/CPU). `GET /products/:id/image` trả raw binary bytes với đúng Content-Type. Danh sách món chỉ trả `imageUrl`, không trả Base64. Xóa ảnh trả 204 và sau đó trả 404. | [`backend-menu-test.log`](backend-menu-test.log) (ok 6), `product.entity.ts`, `menu.service.ts` | **ĐẠT** |
| **Phân quyền & Ranh giới Bảo mật** | `MENU-07` | `PLATFORM_ADMIN` bị chặn tuyệt đối `403 PERMISSION_DENIED` trên toàn bộ API menu (BR-81). `CASHIER` có quyền `menu.read` xem được danh mục/món nhưng bị chặn `403` khi thao tác tạo/sửa/xóa (chỉ `OWNER`/`MANAGER` có `menu.manage`). Cô lập tenant đa cửa hàng: store khác gọi ID chéo nhận `404 NOT_FOUND` (BR-80). | [`backend-menu-test.log`](backend-menu-test.log) (ok 7), `menu.controller.ts` | **ĐẠT** |
| **UI Quản lý Thực đơn PB-13** | `PB13-MENU` | Giao diện Quản lý Thực đơn (`ProductsScreen.tsx`) kết nối trực tiếp với backend qua `menuService`. Hỗ trợ 23 thao tác HTTP chuẩn REST, xử lý CSRF, multipart upload, format tiền tệ VND, không nuốt lỗi và xử lý 204 No Content an toàn. | [`frontend-test.log`](frontend-test.log) (ok 9, 10, 11), `ProductsScreen.tsx` | **ĐẠT** |
| **Hồi quy Hệ thống (Regression)** | `REG-ALL` | Toàn bộ các module đã nghiệm thu trước đây (PB-01 Foundation DB, PB-02 Auth Session, PB-03 Platform Multi-tenant, PB-04 Organization Staff & Branches) hoạt động ổn định trên Docker PostgreSQL 17, không bị ảnh hưởng phụ bởi migration hay module mới. | [`backend-regression-foundation.log`](backend-regression-foundation.log), [`backend-regression-auth.log`](backend-regression-auth.log), [`backend-regression-org.log`](backend-regression-org.log), [`backend-regression-platform.log`](backend-regression-platform.log) | **ĐẠT** |

---

## 3. Thẩm định Kỹ thuật Chi tiết trên Môi trường Docker PostgreSQL 17

### 3.1 Tính toàn vẹn Dữ liệu & Ràng buộc Khóa ngoại (BR-10, BR-13, BR-103)
- Migration `20261102000000-MenuCatalog.ts` thực thi trơn tru trên PostgreSQL 17, tạo 6 bảng nghiệp vụ: `categories`, `sizes`, `products`, `product_sizes`, `toppings`, `category_toppings`.
- Toàn bộ khóa ngoại thiết lập `ON DELETE RESTRICT`, ngăn ngừa xóa cascade gây mất dấu vết dữ liệu.
- Ràng buộc giá tiền `CHECK (price >= 0 AND price <= 1000000000000)` bảo vệ ở mức engine cơ sở dữ liệu cho cả `product_sizes` và `toppings`.
- Ràng buộc tính duy nhất `UNIQUE (store_id, name)` và `UNIQUE (category_id, name)` hoạt động chính xác với collation UTF-8 của PostgreSQL 17.

### 3.2 Tối ưu Lưu trữ Ảnh & Bảo vệ Bộ nhớ (BR-105)
- Cột `products.image_base64` được định nghĩa `@Column({ type: 'text', nullable: true, select: false })`. Khi truy vấn danh sách món ăn, TypeORM sinh câu lệnh `SELECT` bỏ qua cột này, giữ dung lượng payload API tối thiểu và tránh tiêu tốn RAM khi có hàng ngàn món ăn.
- Endpoint binary `/products/:id/image` phục vụ file nhị phân với HTTP caching header phù hợp.

### 3.3 Phân quyền Tenant & Ranh giới Bảo mật (BR-80, BR-81)
- `storeId` luôn lấy từ identity trong Access Token đã được xác thực, không thể bị giả mạo từ request body hoặc query.
- Truy vấn chéo store lập tức trả về `404 NOT_FOUND` thay vì tiết lộ sự tồn tại của tài nguyên (`403`).
- `PLATFORM_ADMIN` hoàn toàn bị cấm truy cập dữ liệu menu (`403 PERMISSION_DENIED`), đảm bảo nguyên tắc bảo mật và tách bạch dữ liệu nền tảng với dữ liệu nghiệp vụ của khách hàng.

---

## 4. Kết luận Nghiệm thu

- Toàn bộ hệ thống POS F&B đã được kiểm thử độc lập đối chứng thành công 100% trên container **Docker PostgreSQL 17 (`pos_infra-postgres-1`)**.
- Không có bất kỳ lỗi hồi quy hay vi phạm quy tắc nghiệp vụ nào.
- Hệ thống hoàn toàn sẵn sàng cho Product Owner đánh giá và nghiệm thu Sprint 4.
