# POS API local — PB-01/PB-02/PB-03/PB-04

Yêu cầu: Node.js 22, Docker Desktop và Docker Compose. UI xác thực, quản trị nền tảng và Cài đặt tổ chức đã nối API; POS/ca/thực đơn/kho/báo cáo còn dùng dữ liệu mô phỏng.

1. Tạo `POS_INFRA/.env.local` từ `.env.example` và đặt username, mật khẩu ngẫu nhiên, tên DB. Không commit file này.
2. Ở gốc repo chạy `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --wait`.
3. Trong `POS_API/`, chạy `npm ci`, rồi `Copy-Item .env.example .env` nếu chưa có `.env`. Sửa `DATABASE_URL` trỏ đến DB local, cùng ba biến `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_FULL_NAME`, `BOOTSTRAP_ADMIN_PASSWORD` (mật khẩu tối thiểu 12 ký tự). Đặt thêm `PUBLIC_ORIGIN` là origin của web và hai secret riêng `JWT_SECRET`, `CSRF_SECRET` (mỗi secret tối thiểu 32 byte). Giá trị phải là secret riêng của môi trường, không dùng ví dụ cố định. Các lệnh start/migration/test tự nạp `.env` bằng Node22; biến môi trường do shell/Compose cấp được ưu tiên. `.env` đã được Git/Docker bỏ qua.
4. Chạy `npm run migration:run`, sau đó `npm run start`. Gọi `GET http://localhost:3000/api/v1/health` để kiểm tra. Sau khi admin đầu tiên được tạo, có thể bỏ ba biến bootstrap ở lần chạy sau.
5. Chạy `npm test` với `DATABASE_URL` của DB local. Test tạo và xóa **database thử riêng** có tên `pos_pb01_test_<ngẫu nhiên>`, `pos_pb02_test_<ngẫu nhiên>` hoặc `pos_pb03_test_<ngẫu nhiên>`; tài khoản DB local cần quyền `CREATE DATABASE`.

PB-02 cung cấp `/api/v1/auth/login`, `/me`, `/csrf`, `/refresh`, `/logout`, `/change-password`. Cookie `Secure` cần HTTPS khi thử trên browser; test HTTP tự động kiểm tra header và tác dụng phụ DB. Giới hạn thử dùng bảng `auth_rate_events` từ migration PB-02.

Đặt `NODE_ENV=development` để mở Swagger UI tại `/api/docs` và OpenAPI JSON tại `/api/docs-json`. Hai route này không được đăng ký ở môi trường khác. Login dùng Passport local, request Cookie được đọc qua `cookie-parser`; request DTO được xác thực bằng NestJS `ValidationPipe`.

Mã PB-02 nằm trong `src/auth/`, PB-03 trong `src/platform/`. Hai module là mẫu tổ chức cho nghiệp vụ tiếp theo:

```text
src/<module>/
  <module>.module.ts      # đăng ký controller/provider, export provider cần dùng
  <module>.service.ts     # nghiệp vụ và ranh giới transaction
  http/                   # controller, DTO, validation request
  entities/               # entity thuộc module sở hữu
  tests/                  # unit/integration test
  security/               # chỉ tạo khi có guard/strategy riêng
```

Controller gọi service; service không nhận Express Request/Response. Không tạo thư mục rỗng hoặc thêm lớp trung gian chỉ để khớp mẫu. Auth có thêm cấu hình/cookie/Passport; platform giữ pagination tại gốc module vì controller và service cùng dùng. Không bắt buộc tách mỗi DTO thành một file.

`auth/entities/` chứa User, Role, Permission, RolePermission, RefreshToken và AuthRateEvent; `platform/entities/` chứa Store; `organization/entities/` chứa Branch và DiningTable. Import entity trực tiếp, giữ callback TypeORM cho relation và đăng ký đầy đủ trong `database/data-source.ts`; không gom entity liên module qua barrel. `database/` giữ DataSource, DatabaseModule và migration; không sửa migration lịch sử khi chỉ di chuyển source.

PB-04 cung cấp GET/POST/PATCH `/api/v1/branches`, `/api/v1/dining-tables`, và luồng staff GET/POST/PATCH/reset trong `/api/v1/users`; luồng OWNER của platform giữ hợp đồng cũ. Xem [spec tổ chức](../.devloopflow/specs/organization.md), [spec nhân viên](../.devloopflow/specs/users.md), [UI tổ chức](../.devloopflow/specs/organization-ui.md). PB-13 đã nối Cài đặt với API; kiểm tra khóa sửa quỹ sau ca đầu tiên thuộc PB-06. Test bổ sung tạo/xóa DB thử riêng prefix `pos_pb04_test_` và `pos_pb04_migration_`.

`src/http/` giữ response envelope, helper/filter lỗi và health controller dùng chung. `src/main.ts`, `src/app.module.ts`, bootstrap admin và Swagger setup ở cấp ứng dụng. Chi tiết ranh giới xem [ARCHITECTURE.md](../docs/architecture/ARCHITECTURE.md#51-backend-một-modular-monolith).

API không tự chạy migration. Đừng dùng `schema:sync`; thay đổi schema phải có migration. Docker Compose này chỉ phục vụ phát triển local, chưa phải cấu hình production.
