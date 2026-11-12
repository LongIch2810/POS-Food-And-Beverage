# Kế hoạch: Tích hợp POS_API và POS_UI vào Docker Compose Local

- **Trạng thái:** COMPLETED
- **Mục tiêu:** Tích hợp khởi động toàn bộ hệ sinh thái ứng dụng (`postgres`, `api`, `ui`) trong file `POS_INFRA/compose.local.yml`, giúp khởi động toàn bộ hệ thống bằng một lệnh duy nhất.

## Phạm vi thực hiện
1. Tạo `POS_API/Dockerfile`: Node.js 22 alpine, tự động chạy TypeORM migration và khởi chạy API NestJS trên port 3000.
2. Tạo `POS_UI/Dockerfile`: Node.js 22 alpine, chạy Vite dev server trên port 5173.
3. Cập nhật `POS_INFRA/compose.local.yml`:
   - Thêm service `api` phụ thuộc `postgres` (healthy check).
   - Thêm service `ui` phụ thuộc `api`.
   - Cung cấp biến môi trường mặc định cho local development.
4. Cập nhật `POS_INFRA/.env.example` và `docs/architecture/TECH_STACK.md`.

## Kết quả nghiệm thu
- `docker compose -f POS_INFRA/compose.local.yml up -d` khởi động thành công cả 3 service `postgres`, `api`, `ui`.
- TypeORM migrations tự động chạy khi container API khởi động (`Foundation20261028000000`, `AuthRateEvents20261028000001`).
- Endpoint Health `/api/v1/health` phản hồi `200 OK` (`{"data":{"status":"ok"}}`).
- Swagger documentation sẵn sàng tại `/api/docs` (phản hồi `200 OK`).
- Đăng nhập thử nghiệm thành công với tài khoản bootstrap admin (`POST /api/v1/auth/login`).
- Frontend UI Vite dev server khởi động và phản hồi `200 OK` tại `http://127.0.0.1:5173`.
