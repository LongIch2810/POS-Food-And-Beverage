# POS F&B

POS và quản lý kho cho quán cà phê, trà sữa và quán ăn nhỏ. Sản phẩm hướng tới mô hình SaaS: mỗi cửa hàng (`store`) có nhiều chi nhánh (`branch`), với bàn, ca thu ngân và tồn kho riêng. Giao diện dùng tiếng Việt, tiền VND và giờ Việt Nam.

## Trạng thái hiện tại

| Thành phần | Đã có trong mã |
| --- | --- |
| `POS_API/` | API NestJS/PostgreSQL: xác thực, quản trị, tổ chức, thực đơn, ca, kho, khuyến mãi, bán hàng và thanh toán; Sprint 09 bổ sung chi phí ca, đối soát và hủy hóa đơn đã thanh toán. |
| `POS_UI/` | Giao diện React; đăng nhập, quản trị nền tảng, tổ chức, thực đơn, ca làm, bán hàng, thanh toán và Hóa đơn đã nối API thật. Các luồng Sprint 09 đã kiểm trên local; màn Báo cáo còn dữ liệu mô phỏng. Source tab Sổ kho gọi API thật; xem Sprint 10 để theo dõi việc kiểm lại trên ứng dụng. |
| `POS_INFRA/` | Docker Compose để chạy PostgreSQL, API và UI tại máy local. |

Báo cáo trong tài liệu là **phạm vi sản phẩm**, chưa phải chức năng backend đã triển khai. Mã Sprint 09 và thay đổi icon/tooltip đã được tích hợp vào `master`; [CI backend và frontend thành công trên commit `ba681e1`](https://github.com/LongIch2810/POS-Food-And-Beverage/actions/runs/43498164472). Không dùng dữ liệu demo để vận hành cửa hàng thật.

[Sprint 09](sprints/sprint-09/SPRINT.md) đã đóng với 6/6 tiêu chí đạt trong [QA local](.devloopflow/verify/sprint-09-ac/report-1.md): chi từ két, đối soát, hủy đơn `PAID` và giao diện Hóa đơn/Ca dùng API thật. Kết quả QA gắn với working tree đã kiểm tại thời điểm chạy; raw evidence chỉ có local. Báo cáo sprint giữ nguyên trạng thái tích hợp tại thời điểm đóng.

Đây là dự án cá nhân phục vụ học tập; theo quyết định của chủ dự án, SePay chỉ sử dụng **Test mode**, không đưa SePay Live vào phạm vi. SePay Test mode đã được kiểm trong phạm vi [tích hợp bên thứ ba](THIRD_PARTY_INTEGRATIONS.md); production chưa được kiểm. CI không thay thế kiểm tra trên môi trường vận hành.

## Chạy local với Docker Compose

Yêu cầu: Docker Desktop có Compose. Tại thư mục gốc repository:

```powershell
Copy-Item POS_INFRA/.env.example POS_INFRA/.env.local
```

Sửa `POS_INFRA/.env.local` trước khi chạy: đặt mật khẩu PostgreSQL, mật khẩu quản trị viên bootstrap (ít nhất 12 ký tự), `JWT_SECRET` và `CSRF_SECRET` riêng biệt (mỗi giá trị ít nhất 32 byte), và `SEPAY_WEBHOOK_SECRET` (ít nhất 32 byte; để trống thì webhook SePay trả 503). Các giá trị mẫu trong `.env.example` chỉ dành cho tham khảo; không dùng lại và không commit `.env.local`.

```powershell
docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait
```

Compose chạy migration trước khi khởi động API. Sau khi các container sẵn sàng:

- UI: <http://localhost:5173>
- Health check: <http://localhost:3000/api/v1/health>
- Swagger UI trong môi trường `development`: <http://localhost:3000/api/docs>

Đăng nhập UI bằng tài khoản `BOOTSTRAP_ADMIN_USERNAME` và `BOOTSTRAP_ADMIN_PASSWORD` đã đặt trong `.env.local`. Tài khoản này chỉ quản trị nền tảng; các màn vận hành cửa hàng còn một số mục dữ liệu mô phỏng; màn bán hàng và thanh toán đã nối API thật. Dừng môi trường local bằng:

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
| `POS_UI/` | `node --test test/icon-actions.browser.mjs`, `node --test test/shift-close-accessibility.browser.mjs` | Kiểm tra browser riêng cho icon/tooltip và trợ năng đóng ca; cần Chrome hoặc Chromium. Các file này không nằm trong `npm test`. |

## Quy trình phát triển

Dự án sử dụng các coding assistant **Codex** và **Claude Code** để hỗ trợ khảo sát, viết mã, kiểm thử, review và cập nhật tài liệu, nhằm nâng cao hiệu quả phát triển. Hướng dẫn dự án cho từng công cụ nằm trong [`AGENTS.md`](AGENTS.md) và [`CLAUDE.md`](CLAUDE.md).

Dự án dùng **devloopflow** cho spec, plan, task, TDD, review và verify AC; hồ sơ hiện hành nằm trong [`.devloopflow/`](.devloopflow/), cấu hình lệnh và nguồn ở [devloopflow.md](.devloopflow/devloopflow.md). Chọn đúng skill cho bước đang làm, không chạy cả flow khi chỉ sửa tài liệu hoặc việc nhỏ.

**Graphify** dùng để tìm symbol và quan hệ trước khi đọc source. AST code chạy cục bộ; chỉ trích xuất ngữ nghĩa tài liệu thay đổi khi cần, tránh quét lại bản lưu lịch sử. **Caveman** rút gọn lời đáp khi được gọi, giữ đủ dữ kiện. **Ponytail** ưu tiên thay đổi nhỏ nhất vẫn đủ yêu cầu và kiểm tra rủi ro. Các công cụ này giúp tránh đọc/làm thừa; không có số liệu tiết kiệm chi phí được đo cho repository.

Hồ sơ cũ nằm nguyên byte, tên gốc trong `.devloopflow/specs|plans|tasks|errors/`. [Chỉ mục QA/verify](.devloopflow/verify/EVIDENCE-INDEX.md) dẫn tới báo cáo Markdown và raw evidence chỉ có local. Bản lịch sử không phải kết quả nghiệm thu mới.

## Cấu trúc và tài liệu

- [`POS_API/`](POS_API/): mã API, entity và migration.
- [`POS_UI/`](POS_UI/): mã giao diện và dữ liệu mô phỏng cho các màn vận hành.
- [`POS_INFRA/`](POS_INFRA/): môi trường Docker local.
- [Tổng quan sản phẩm](docs/PRODUCT_OVERVIEW.md), [quy tắc nghiệp vụ](docs/BUSINESS_RULES.md), [thiết kế cơ sở dữ liệu](docs/DESIGN_DB_POS_SYSTEM.md).
- [Quy ước API](docs/api-spec.md), [spec hiện hành](.devloopflow/specs/), [kiến trúc mục tiêu](docs/architecture/ARCHITECTURE.md), [tech stack hiện dùng](docs/architecture/TECH_STACK.md).
- [Thiết kế giao diện](DESIGN.md), [các sprint](sprints/), [Sprint 09](sprints/sprint-09/SPRINT.md), [bằng chứng QA](.devloopflow/verify/EVIDENCE-INDEX.md).
