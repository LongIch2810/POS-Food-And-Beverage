# Tech stack hiện dùng

File này ghi **công nghệ đã có trong mã hoặc cấu hình repository**; phiên bản chuẩn nằm trong manifest/lockfile. Kiến trúc mục tiêu và thành phần dự kiến xem [ARCHITECTURE.md](ARCHITECTURE.md). Cập nhật file này cùng thay đổi thêm, bỏ hoặc thay framework, thư viện trực tiếp hay công nghệ hạ tầng; không ghi công nghệ mới chỉ vì đang cân nhắc.

## Backend — `POS_API/`

| Công nghệ | Vai trò hiện tại |
| --- | --- |
| Node.js 22, TypeScript 5 | Runtime và ngôn ngữ; build bằng `tsc` |
| NestJS 11, Express | API HTTP, module/controller/guard/exception filter |
| PostgreSQL 17, `pg`, TypeORM 0.3 | Dữ liệu, truy vấn, transaction và migration |
| `bcryptjs` | Hash và kiểm tra mật khẩu |
| `jsonwebtoken` | Ký và xác minh access JWT |
| `@nestjs/passport`, `passport`, `passport-local` | Passport local strategy cho đăng nhập |
| `cookie-parser`, `cookie` | Đọc Cookie request và tạo Set-Cookie response |
| `class-validator`, `class-transformer` | Xác thực DTO request với NestJS `ValidationPipe` |
| `@nestjs/swagger` | Sinh OpenAPI và Swagger UI chỉ trong development |

## Frontend — `POS_UI/`

| Công nghệ | Vai trò hiện tại |
| --- | --- |
| React 18, React DOM 18, TypeScript 5 | UI xác thực, quản trị nền tảng, tổ chức, thực đơn, ca, POS/thanh toán và Hóa đơn dùng API thật; màn Báo cáo còn mô phỏng, Kho còn mô phỏng tab lịch sử biến động. |
| Vite 6, plugin React | Dev server và build UI |
| `lucide-react` | Icon giao diện |
| `puppeteer-core` | Thư viện dev điều khiển Chrome/CDP phục vụ kiểm thử E2E trực quan |

PB-13 đã nối xác thực PB-02, quản trị nền tảng PB-03 và Cài đặt tổ chức PB-04 với API. Cài đặt dùng branch/table/staff DTO riêng, shared HTTP cookie/CSRF/refresh và bộ lọc chi nhánh thật riêng; không dùng dữ liệu demo cho lát cắt này. Không thêm dependency frontend cho PB-13 tổ chức.

## Infrastructure — `POS_INFRA/`

| Công nghệ | Vai trò hiện tại |
| --- | --- |
| Docker Compose | Khởi chạy cụm local full-stack gồm database, backend API và frontend UI từ `compose.local.yml` |
| PostgreSQL 17 container | Database phát triển và kiểm thử local |
| Node.js 22 Alpine Dockerfile | Image môi trường chạy cho `POS_API` (biên dịch TypeScript, chạy TypeORM migration và khởi động API NestJS) và `POS_UI` (Vite dev server) |

Reverse proxy, TLS, image production, backup và Redis/BullMQ chưa có cấu hình triển khai trong repository. Chúng là kiến trúc dự kiến hoặc chỉ thêm khi có nhu cầu được chốt.

## Kiểm thử và công cụ

Backend dùng `node:test`, `@nestjs/testing`, TypeScript build, test HTTP qua `fetch` và database PostgreSQL riêng cho test tích hợp. Frontend dùng `node:test` cho service và regression màn hình với request/thứ tự promise được điều khiển, Vite build và TypeScript typecheck (`tsc --noEmit`); kiểm tra browser bổ sung được lưu riêng trong qa-evidence. CI tự động hóa bằng GitHub Actions (`.github/workflows/ci.yml`) có cấu hình backend/frontend kèm PostgreSQL; bằng chứng local PB-13 không đồng nghĩa đã có CI cho thay đổi chưa commit. Dependency được khóa trong `POS_API/package-lock.json` và `POS_UI/package-lock.json`.
