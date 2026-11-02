# QA Evidence: PB-05 Menu Catalog API & PB-13 Menu Management UI

- **Ngày chạy:** 2026-11-02 11:30:00 (UTC+7)
- **Commit SHA:** `31f4799` (dirty: working tree có các file triển khai của PB-05 & PB-13)
- **Nhánh:** `feat/pb05-menu`
- **Môi trường:**
  - OS: Windows 11
  - Node.js: `v22.22.2`
  - Database: PostgreSQL 16 on WSL Ubuntu-24.04 (`172.26.237.52:5432`), user: `pos_local`
  - Nhãn: **local do agent chạy**

---

## 1. Kết quả kiểm thử thực tế

### 1.1 Backend (`POS_API`) — Menu Integration Test
- **Lệnh thực thi:**
  ```powershell
  node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\menu\tests\menu.integration.test.js"
  ```
- **Exit code:** `0`
- **Thời gian chạy:** ~4.85s
- **Kết quả:** 1 test suite, 7/7 subtests PASS (0 fail, 0 skipped)
- **Log artifact:** [`backend-menu-test.log`](file:///d:/saved/Project/POS-F&B/qa-evidence/20261102-113000-31f4799-pb05-menu/backend-menu-test.log)

### 1.2 Frontend (`POS_UI`) — Unit & Integration Test
- **Lệnh thực thi:**
  ```powershell
  npm --prefix "d:\saved\Project\POS-F&B\POS_UI" test
  ```
- **Exit code:** `0`
- **Thời gian chạy:** ~1.51s
- **Kết quả:** 31/31 tests PASS (0 fail, 0 skipped), bao gồm các test mới về menuService HTTP, upload multipart và xử lý lỗi.
- **Log artifact:** [`frontend-test.log`](file:///d:/saved/Project/POS-F&B/qa-evidence/20261102-113000-31f4799-pb05-menu/frontend-test.log)

### 1.3 TypeScript & Production Build
- **Backend build:** `npm --prefix "d:\saved\Project\POS-F&B\POS_API" run build` -> Exit code: `0`
- **Frontend build:** `npm --prefix "d:\saved\Project\POS-F&B\POS_UI" run build` -> Exit code: `0` (`tsc --noEmit && vite build` hoàn tất không lỗi)

---

## 2. Bảng đối chiếu tiêu chí nghiệm thu Sprint 4

| Mã tiêu chí | Nội dung tiêu chí nghiệm thu | Kịch bản / Tình huống kiểm thử | Artifact chứng minh | Kết quả |
| :--- | :--- | :--- | :--- | :---: |
| **PB-05.1** | Danh mục: Tên duy nhất trong store, ngưng dùng khi có món, xoá khi chưa có món | MENU-01 (`menu.integration.test.ts`), `PB13-MENU-ERROR` (`menu-service.test.mjs`) | `backend-menu-test.log#L3-L8`, `frontend-test.log#L53-L58` | **ĐẠT** |
| **PB-05.2** | Kích cỡ món: CRUD size toàn store, sort_order | MENU-02 (`menu.integration.test.ts`), `PB13-MENU-HTTP` (`menu-service.test.mjs`) | `backend-menu-test.log#L9-L14` | **ĐẠT** |
| **PB-05.3** | Món & Giá theo kích cỡ: Tên duy nhất trong category, giá nguyên đồng <= 10^12 VND | MENU-03, MENU-04 (`menu.integration.test.ts`), Check constraint DB | `backend-menu-test.log#L15-L26` | **ĐẠT** |
| **PB-05.4** | Topping & Liên kết danh mục: Quản lý topping, link/unlink với category | MENU-05 (`menu.integration.test.ts`), `PB13-MENU-HTTP` (`menu-service.test.mjs`) | `backend-menu-test.log#L27-L32` | **ĐẠT** |
| **PB-05.5** | Ảnh món: Upload file <= 2MB, validate magic bytes, lưu Base64 ngầm, phục vụ raw bytes | MENU-06 (`menu.integration.test.ts`), `PB13-MENU-IMAGE` (`menu-service.test.mjs`) | `backend-menu-test.log#L33-L38`, `frontend-test.log#L48-L52` | **ĐẠT** |
| **PB-05.6** | Phân quyền & Cách ly: `menu.manage` cho OWNER/MANAGER; `menu.read` cho CASHIER; chặn PLATFORM_ADMIN | MENU-07 (`menu.integration.test.ts`) | `backend-menu-test.log#L39-L44` | **ĐẠT** |
| **PB-13.1** | UI Thực đơn kết nối API thật: CRUD Danh mục, Kích cỡ, Món, Topping qua `menuService` | `ProductsScreen.tsx`, `menuService.ts`, `menu-service.test.mjs` | `POS_UI` tests (31/31 pass), Vite build pass | **ĐẠT** |
| **PB-13.2** | Không phá vỡ chức năng cũ: Auth, Foundation, Organization, Platform regression | `foundation.test.js`, `auth.integration.test.js`, `organization.integration.test.js`, `platform.integration.test.js` | Từng suite test chạy thành công 100% | **ĐẠT** |

