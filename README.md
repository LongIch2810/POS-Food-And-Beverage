# POS F&B

POS và quản lý kho cho quán cà phê, trà sữa và quán ăn nhỏ. Sản phẩm hướng tới mô hình SaaS: mỗi cửa hàng (`store`) có nhiều chi nhánh (`branch`), với bàn, ca thu ngân và tồn kho riêng. Giao diện dùng tiếng Việt, tiền VND và giờ Việt Nam.

## Trạng thái hiện tại

| Thành phần | Đã có trong mã |
| --- | --- |
| `POS_API/` | Nền API NestJS, PostgreSQL, migration, bootstrap quản trị viên, health check, API xác thực/phiên, quản trị nền tảng PB-03 và API tổ chức/nhân viên PB-04. |
| `POS_UI/` | Giao diện React; đăng nhập, đổi mật khẩu, phiên, quản trị nền tảng và Cài đặt chi nhánh/bàn/tài khoản đã nối API thật. Các màn POS, hóa đơn, ca, kho, báo cáo và thực đơn vẫn dùng dữ liệu mô phỏng. |
| `POS_INFRA/` | Docker Compose để chạy PostgreSQL, API và UI tại máy local. |

Các luồng bán hàng và quản lý kho trong tài liệu là **phạm vi sản phẩm**, chưa phải chức năng backend đã triển khai. Không dùng dữ liệu demo để vận hành cửa hàng thật.

[Sprint 2 đã kết thúc ngày 30/10/2026](sprints/sprint-02/SPRINT.md#kết-luận-sprint-2--2026-10-30): PB-03 và lát cắt PB-13 quản trị nền tảng được nghiệm thu local; CI backend/frontend thành công trên master `9cc3299`. Browser E2E vẫn là bằng chứng local, chưa xác nhận production.

[Sprint 3 đã kết thúc ngày 01/11/2026](sprints/sprint-03/SPRINT.md#kết-luận-sprint-3--2026-11-01): PB-04 và PB-13 tổ chức được Product Owner nghiệm thu local sau [đối chiếu QA](qa-evidence/20261101-203100-9ce75dd-pb13-final/acceptance-readiness.md). Ngày02/11 đã tách commit và push lên nhánh `feat/pb13-organization-ui`; [CI backend/frontend thành công tại dafd0b5](https://github.com/LongIch2810/POS-Food-And-Beverage/actions/runs/41379713471). Chưa merge hoặc xác nhận production. Quy tắc khóa sửa quỹ sau ca đầu tiên được tích hợp ở PB-06 trước khi bật API mở ca.

## Chạy local với Docker Compose

Yêu cầu: Docker Desktop có Compose. Tại thư mục gốc repository:

```powershell
Copy-Item POS_INFRA/.env.example POS_INFRA/.env.local
```

Sửa `POS_INFRA/.env.local` trước khi chạy: đặt mật khẩu PostgreSQL, mật khẩu quản trị viên bootstrap (ít nhất 12 ký tự), `JWT_SECRET` và `CSRF_SECRET` riêng biệt (mỗi giá trị ít nhất 32 byte). Các giá trị mẫu trong `.env.example` chỉ dành cho tham khảo; không dùng lại và không commit `.env.local`.

```powershell
docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait
```

Compose chạy migration trước khi khởi động API. Sau khi các container sẵn sàng:

- UI: <http://localhost:5173>
- Health check: <http://localhost:3000/api/v1/health>
- Swagger UI trong môi trường `development`: <http://localhost:3000/api/docs>

Đăng nhập UI bằng tài khoản `BOOTSTRAP_ADMIN_USERNAME` và `BOOTSTRAP_ADMIN_PASSWORD` đã đặt trong `.env.local`. Tài khoản này chỉ quản trị nền tảng; các màn vận hành cửa hàng hiện vẫn là demo. Dừng môi trường local bằng:

```powershell
docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml down
```

## Phát triển và kiểm tra

Yêu cầu khi chạy ngoài Docker: Node.js 22, npm và PostgreSQL 17. Xem [hướng dẫn API](POS_API/README.md) để cấu hình `DATABASE_URL`, bootstrap admin, chạy migration và test với database thử riêng. Các lệnh có sẵn:

Mỗi ứng dụng có file môi trường riêng khi chạy ngoài Docker. Nếu chưa có file, tạo từ mẫu:

```powershell
Copy-Item POS_API/.env.example POS_API/.env
Copy-Item POS_UI/.env.example POS_UI/.env
```

Sửa `POS_API/.env` với cấu hình DB/auth và `PUBLIC_ORIGIN`; backend tự nạp file qua lệnh npm. Sửa `VITE_API_TARGET` trong `POS_UI/.env` theo URL backend thực tế; Vite đọc file theo mode, không có URL fallback trong source. Biến do shell hoặc Docker Compose cấp được ưu tiên. Frontend tiếp tục gọi `/api` cùng origin qua proxy để gửi cookie/CSRF đúng thiết kế. Không đặt secret backend trong biến `VITE_*` vì các biến này có thể được đưa vào bundle browser. Các file `.env` thật được Git/Docker bỏ qua.

| Thư mục | Lệnh | Tác dụng |
| --- | --- | --- |
| `POS_API/` | `npm ci`, `npm run migration:run`, `npm run start` | Cài dependency, cập nhật schema, chạy API. |
| `POS_API/` | `npm test` | Build và chạy test API; test tích hợp cần PostgreSQL và quyền tạo database thử. |
| `POS_UI/` | `npm ci`, `npm run dev` | Cài dependency và chạy Vite trên cổng 5173; API cần chạy để đăng nhập. |
| `POS_UI/` | `npm run build`, `npm test` | Kiểm tra TypeScript/build và chạy test UI. |

## Cấu trúc và tài liệu

- [`POS_API/`](POS_API/): mã API, entity và migration.
- [`POS_UI/`](POS_UI/): mã giao diện và dữ liệu mô phỏng cho các màn vận hành.
- [`POS_INFRA/`](POS_INFRA/): môi trường Docker local.
- [Tổng quan sản phẩm](docs/PRODUCT_OVERVIEW.md), [quy tắc nghiệp vụ](docs/BUSINESS_RULES.md), [thiết kế cơ sở dữ liệu](docs/DESIGN_DB_POS_SYSTEM.md).
- [Quy ước API](docs/api-spec.md), [đặc tả đã chốt](specs/), [kiến trúc mục tiêu](docs/architecture/ARCHITECTURE.md), [tech stack hiện dùng](docs/architecture/TECH_STACK.md).
- [Thiết kế giao diện](DESIGN.md), [Sprint 1](sprints/sprint-01/SPRINT.md), [Sprint 2](sprints/sprint-02/SPRINT.md), [Sprint 3](sprints/sprint-03/SPRINT.md), [bằng chứng QA](qa-evidence/).
