# Nhiệm vụ: E2E Browser Testing 4 Sprint trên Docker (Chrome)

- **Mục tiêu**: Khởi động toàn bộ hệ thống bằng Docker Compose (PostgreSQL, POS_API, POS_UI), mở Google Chrome và thực hiện kiểm thử E2E tự động toàn diện các tính năng đã phát triển qua 4 sprint (Sprint 1: Nền tảng DB; Sprint 2: Auth/Phân quyền/Đổi MK; Sprint 3: Chi nhánh/Bàn/Nhân viên; Sprint 4: Thực đơn/Món/Topping/Size/Upload ảnh).
- **Nhánh**: `master` (commit `ad61f6c`)
- **Môi trường**:
  - Docker Compose: PostgreSQL 17 (`pos_infra-postgres-1` :5432), API NestJS (`pos_api` :3000), UI Vite (`pos_ui` :5173).
  - Trình duyệt: Google Chrome thật (`C:\Program Files\Google\Chrome\Application\chrome.exe`) với DevTools Protocol (CDP).
- **Thư mục bằng chứng**: `qa-evidence/20261102-e2e-chrome-docker-sprints-1-4/`
- **Kế hoạch các bước**:
  1. Build và khởi động Docker Compose (`docker compose -f POS_INFRA/compose.local.yml up -d --build`).
  2. Xác minh container healthy (postgres, api, ui).
  3. Chuẩn bị script điều khiển Chrome tự động qua WebSocket/CDP, chụp ảnh màn hình và lưu log request/response.
  4. Thực hiện các ca test:
     - TC-01 (Sprint 1): Health check API `/api/v1/health` và kết nối DB.
     - TC-02 (Sprint 2): Đăng nhập Platform Admin, bắt buộc đổi mật khẩu (nếu có tài khoản mới), refresh token, logout.
     - TC-03 (Sprint 3): Đăng nhập Owner/Manager, xem chi nhánh, tạo/sửa chi nhánh, quản lý bàn ăn, tạo nhân viên.
     - TC-04 (Sprint 4): Quản lý Thực đơn - tạo danh mục, kích cỡ, topping, tạo món ăn gán kích cỡ và topping, upload ảnh món ăn thật và kiểm tra binary image rendering trên UI.
  5. Đối chiếu dữ liệu DB trước/sau bằng SQL read-only.
  6. Tổng hợp báo cáo QA `run.md` kèm đầy đủ ảnh chụp và artifacts.

