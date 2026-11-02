# Báo cáo Kiểm thử Độc lập Đối chứng — Sprint 4 (Menu Catalog & UI)

- **Ngày thực hiện:** 2026-11-02 18:45:00 (UTC+7) / 2026-11-02 11:45:00 (UTC)
- **Người thực hiện:** Subagent QA (Kiểm thử độc lập)
- **Commit SHA:** `31f479986a12e1031afd9a42b2483a20a4193b68` (`31f4799`)
- **Trạng thái Working Tree:** Dirty (bao gồm các thay đổi triển khai PB-05, PB-13, migrations, tests và artifacts Sprint 4)
- **Môi trường thực thi:**
  - Hệ điều hành: Windows 11 Pro (OS Build 22631)
  - Node.js: `v22.22.2` (npm `10.9.7`)
  - Cơ sở dữ liệu: PostgreSQL 16.6 trên WSL2 Ubuntu-24.04 (`172.26.237.52:5432`), user: `pos_local`
  - Nhãn xác thực: **Local do agent chạy (Subagent QA độc lập)**

---

## 1. Tổng quan Kết quả Thực thi

Toàn bộ các test suite (Menu Integration, hồi quy Backend, Frontend UI suite và Production Build) đều đã được Subagent QA kích hoạt và giám sát trực tiếp. 100% test case vượt qua thành công với Exit Code `0`.

| Bộ kiểm thử / Runner | Lệnh chính xác đã chạy | Thời gian thực thi | Exit Code | Kết quả Pass/Fail | File Artifact Gốc |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Menu Integration** | `node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\menu\tests\menu.integration.test.js"` | ~91.16s | `0` | **8/8 Pass** (0 fail, 0 skip) | [`backend-menu-test.log`](backend-menu-test.log) |
| **Foundation Regression** | `node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\foundation.test.js"` | ~11.02s | `0` | **1/1 Pass** (0 fail, 0 skip) | [`backend-regression-foundation.log`](backend-regression-foundation.log) |
| **Auth Regression** | `node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\auth\tests\auth.integration.test.js"` | ~39.13s | `0` | **1/1 Pass** (0 fail, 0 skip) | [`backend-regression-auth.log`](backend-regression-auth.log) |
| **Organization Regression** | `node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\organization\tests\organization.integration.test.js"` | ~21.78s | `0` | **11/11 Pass** (0 fail, 0 skip) | [`backend-regression-org.log`](backend-regression-org.log) |
| **Platform Regression** | `node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\platform\tests\platform.integration.test.js"` | ~10.56s | `0` | **1/1 Pass** (0 fail, 0 skip) | [`backend-regression-platform.log`](backend-regression-platform.log) |
| **Frontend UI Suite** | `npm --prefix "d:\saved\Project\POS-F&B\POS_UI" test` | ~2.34s | `0` | **31/31 Pass** (0 fail, 0 skip) | [`frontend-test.log`](frontend-test.log) |
| **Backend Build** | `npm --prefix "d:\saved\Project\POS-F&B\POS_API" run build` | ~8.9s | `0` | **Pass (tsc clean)** | [`backend-build.log`](backend-build.log) |
| **Frontend Build** | `npm --prefix "d:\saved\Project\POS-F&B\POS_UI" run build` | ~19.67s | `0` | **Pass (vite build clean)** | [`frontend-build.log`](frontend-build.log) |

---

## 2. Bảng Đối chiếu Nghiệm thu Chi tiết (Verification Matrix)

Bảng đối chiếu kiểm tra từng vế yêu cầu nghiệp vụ theo `sprints/sprint-04/SPRINT.md`, `specs/menu.md` và `docs/BUSINESS_RULES.md`:

| Tiêu chí nghiệm thu | ID tình huống | Yêu cầu nghiệp vụ & Quy tắc đối chiếu | Artifact chứng minh | Kết quả đối chứng |
| :--- | :--- | :--- | :--- | :---: |
| **CRUD Danh mục (Categories)** | `MENU-01` | Tạo danh mục trim khoảng trắng, sắp xếp `sortOrder`. Trùng tên cùng store báo `409 DUPLICATE_RESOURCE` (BR-13). Trùng tên khác store cho phép 201 (BR-80). Danh mục rỗng xóa được (204). Danh mục có món cấm xóa cứng, trả `409 RESOURCE_IN_USE` (BR-10). | `backend-menu-test.log` (L3-L8), `menu.service.ts` (L105-L170), Migration check | **ĐẠT** |
| **CRUD Kích cỡ (Sizes)** | `MENU-02` | CRUD size theo cửa hàng. Trùng tên cùng store báo `409` (BR-13). Cập nhật `sortOrder`. Xóa kích cỡ chưa dùng trả `204`. Kích cỡ đã gán vào món ăn cấm xóa, trả `409 RESOURCE_IN_USE` (BR-10). | `backend-menu-test.log` (L9-L14), `menu.service.ts` (L190-L245) | **ĐẠT** |
| **CRUD Món (Products)** | `MENU-03` | Tạo món trong danh mục. Trùng tên cùng category báo `409`; trùng tên khác category cho phép 201 (BR-13). Xóa món chưa gán size trả `204`. Danh mục chứa món không thể xóa cứng (409) (BR-10). | `backend-menu-test.log` (L15-L20), `menu.service.ts` (L351-L462) | **ĐẠT** |
| **Giá theo Size & Ràng buộc BigInt** | `MENU-04` | Giá nằm ở `product_sizes.price` (BR-08). Chặn giá âm (< 0) và vượt trần 1.000 tỷ VND (> 10^12) với mã `422 VALIDATION_ERROR` (BR-103) và CHECK constraint DB. Cấm trùng size trên cùng một món (409). Cấm xóa size/món đã có cấu hình size (409). Hỗ trợ đổi giá (BR-12). | `backend-menu-test.log` (L21-L26), `20261102000000-MenuCatalog.ts` (L57), `menu.service.ts` (L532-L596) | **ĐẠT** |
| **Topping & Liên kết Danh mục** | `MENU-05` | CRUD Topping độc lập. Trùng tên cùng store báo `409` (BR-13). Gán topping vào danh mục (`category_toppings`) theo BR-11. Chặn gán trùng (409). Cấm xóa topping khi đang được liên kết trong danh mục (409) (BR-10). Gỡ liên kết (204) cho phép xóa topping rỗng. | `backend-menu-test.log` (L27-L32), `menu.service.ts` (L618-L764) | **ĐẠT** |
| **Upload & Phục vụ Ảnh nhị phân** | `MENU-06` | File <= 2MB, validate magic bytes nhị phân JPEG/PNG/WebP (BR-105). Lưu Base64 ngầm trong DB (`select: false` tránh phình RAM/CPU). `GET /products/:id/image` trả raw binary bytes với đúng Content-Type. Danh sách món chỉ trả `imageUrl`, không trả Base64. Xóa ảnh trả 204 và sau đó trả 404. | `backend-menu-test.log` (L33-L38), `product.entity.ts` (L20), `menu.service.ts` (L37-L60, L465-L528) | **ĐẠT** |
| **Phân quyền & Ranh giới Bảo mật** | `MENU-07` | `PLATFORM_ADMIN` bị chặn tuyệt đối `403 PERMISSION_DENIED` trên toàn bộ API menu (BR-81). `CASHIER` có quyền `menu.read` xem được danh mục/món nhưng bị chặn `403` khi thao tác tạo/sửa/xóa (chỉ `OWNER`/`MANAGER` có `menu.manage`). Cô lập tenant đa cửa hàng: store khác gọi ID chéo nhận `404 NOT_FOUND` (BR-80). | `backend-menu-test.log` (L39-L44), `menu.service.ts` (L80-L83, L144-L147), `menu.controller.ts` | **ĐẠT** |
| **UI Quản lý Thực đơn PB-13** | `PB13-MENU` | Giao diện Quản lý Thực đơn (`ProductsScreen.tsx`) kết nối trực tiếp với backend qua `menuService`. Hỗ trợ 23 thao tác HTTP chuẩn REST, xử lý CSRF, multipart upload, format tiền tệ VND, không nuốt lỗi và xử lý 204 No Content an toàn. | `frontend-test.log` (L35-L48), `menu-service.test.mjs`, `ProductsScreen.tsx`, `client.ts` | **ĐẠT** |
| **Hồi quy Hệ thống (Regression)** | `REG-ALL` | Toàn bộ các module đã nghiệm thu trước đây (PB-01 Foundation DB, PB-02 Auth Session, PB-03 Platform Multi-tenant, PB-04 Organization Staff & Branches) hoạt động hoàn hảo, không bị ảnh hưởng phụ bởi migration hay module mới. | `backend-regression-foundation.log`, `backend-regression-auth.log`, `backend-regression-org.log`, `backend-regression-platform.log` | **ĐẠT** |

---

## 3. Thẩm định Kỹ thuật Chi tiết (In-depth Technical Audit)

### 3.1 Ràng buộc Cơ sở Dữ liệu & Tính toàn vẹn Dữ liệu (BR-10, BR-13, BR-103)
- Migration `20261102000000-MenuCatalog.ts` thiết lập đầy đủ khóa ngoại với `ON DELETE RESTRICT` trên tất cả các quan hệ:
  - `categories.store_id -> stores(id)`
  - `sizes.store_id -> stores(id)`
  - `products.category_id -> categories(id)`
  - `product_sizes.product_id -> products(id)`, `product_sizes.size_id -> sizes(id)`
  - `toppings.store_id -> stores(id)`
  - `category_toppings.category_id -> categories(id)`, `category_toppings.topping_id -> toppings(id)`
- Ràng buộc giá tiền: `CHECK (price >= 0 AND price <= 1000000000000)` trên cả `product_sizes` và `toppings`. Đã đối chứng subtest `MENU-04` thử nghiệm giá âm (`-1`) và vượt trần (`1000000000001`) đều bị `ValidationPipe` từ chối `422 VALIDATION_ERROR` trước khi chạm DB, và DB có ràng buộc CHECK bảo vệ tầng cuối cùng.
- Ràng buộc duy nhất: `UNIQUE (store_id, name)` trên `categories`, `sizes`, `toppings`; `UNIQUE (category_id, name)` trên `products`; `UNIQUE (product_id, size_id)` trên `product_sizes`. Mọi hành vi cố tình tạo trùng đều trả về `409 DUPLICATE_RESOURCE` có cấu trúc lỗi rõ ràng.

### 3.2 Tối ưu Hiệu năng Lưu trữ Ảnh (BR-105)
- Cột `products.image_base64` được cấu hình `@Column({ type: 'text', nullable: true, select: false })`.
- Truy vấn danh sách món `listProducts` chỉ lấy `image_mime` để tạo chuỗi URL `/api/v1/products/:id/image`, tuyệt đối không load chuỗi Base64 lên bộ nhớ RAM.
- Hàm `validateImageMagicBytes` kiểm tra byte đầu của buffer (SOI `FF D8 FF` cho JPEG, `89 50 4E 47` cho PNG, `RIFF...WEBP` cho WebP), ngăn chặn triệt để tấn công giả mạo đuôi file / mime type.

### 3.3 Phân quyền và Bảo vệ Biên giới Cửa hàng (BR-80, BR-81)
- `storeId` luôn trích xuất từ JWT Access Cookie thông qua `AccessGuard` và `ReqUser`. Hệ thống không bao giờ tin cậy `storeId` từ Client.
- Khi truy cập tài nguyên của Store B bằng token của Store A, API trả về `404 NOT_FOUND` thay vì `403 FORBIDDEN` để bảo mật, không làm lộ sự tồn tại của dữ liệu cửa hàng khác.
- `PLATFORM_ADMIN` không sở hữu `storeId` và không được phân quyền `menu.read` / `menu.manage`. Khi gửi request tới bất kỳ endpoint menu nào, hệ thống lập tức từ chối với `403 PERMISSION_DENIED`.

---

## 4. Kết luận Nghiệm thu của Subagent QA

- **Đánh giá tổng thể:** Toàn bộ tiêu chí nghiệm thu của Sprint 4 (bao gồm PB-05 Menu API và PB-13 UI lát cắt quản lý thực đơn) đã được kiểm thử độc lập đối chứng thành công 100%.
- **Lỗi / Sai lệch nghiệp vụ:** Không phát hiện bất kỳ lỗi (Bug) hoặc sai lệch nào so với các quy tắc nghiệp vụ BR-08, BR-09, BR-10, BR-11, BR-13, BR-81, BR-100, BR-103, BR-105.
- **Khuyến nghị cho Product Owner:** Hệ thống đã hoàn toàn sẵn sàng để Product Owner tiến hành review và chính thức nghiệm thu Sprint 4.
