# Task: Triển khai Docker Compose Local khởi động toàn bộ POS_API và POS_UI

- **Trạng thái:** COMPLETED
- **Nhánh:** `feat/compose-local-full-stack`
- **Plan liên quan:** [`plans/completed/2026-10-28-compose-local-full-stack.md`](../../plans/completed/2026-10-28-compose-local-full-stack.md)
- **Mục tiêu:** Cấu hình Dockerfiles và `POS_INFRA/compose.local.yml` để khởi động đồng thời cả cơ sở dữ liệu PostgreSQL, Backend API và Frontend UI trong môi trường local bằng một lệnh `docker compose up`.

## Các bước đã thực hiện
1. Tạo branch `feat/compose-local-full-stack` từ `master`.
2. Tạo `POS_API/Dockerfile` và `POS_API/.dockerignore`: Node 22 alpine, tự động chạy migration trước khi khởi động NestJS API trên cổng 3000, lắng nghe `0.0.0.0`.
3. Tạo `POS_UI/Dockerfile` và `POS_UI/.dockerignore`: Node 22 alpine, chạy Vite dev server trên port 5173.
4. Cập nhật `POS_INFRA/compose.local.yml`:
   - Định nghĩa 3 service: `postgres`, `api`, `ui`.
   - Cấu hình thứ tự phụ thuộc: `api` đợi `postgres` healthy, `ui` đợi `api` started.
   - Thêm healthcheck cho `api` dùng `node -e fetch(...)`.
   - Cung cấp các biến môi trường mặc định (`NODE_ENV: development`, `PORT: 3000`, `DATABASE_URL`, v.v.).
5. Cập nhật `POS_INFRA/.env.example` và `docs/architecture/TECH_STACK.md`.
6. Thực nghiệm khởi động `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d`:
   - Cả 3 container chạy ổn định và healthy.
   - Endpoint `/api/v1/health` trả về `200 OK`.
   - Swagger `/api/docs` hiển thị đầy đủ tài liệu API.
   - Kiểm tra `POST /api/v1/auth/login` đăng nhập thành công với tài khoản bootstrap admin.
   - Frontend UI tại `http://127.0.0.1:5173` phản hồi `200 OK`.
