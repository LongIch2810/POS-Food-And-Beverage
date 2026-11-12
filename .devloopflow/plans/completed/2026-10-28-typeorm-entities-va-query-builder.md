# Kế hoạch: Chuyển đổi mã nguồn sang TypeORM Entities và QueryBuilder

Trạng thái: completed
Ngày tạo: 2026-10-28
Kế hoạch chi tiết được duyệt: artifact `use_orm_entities_and_query_builder_plan.md`

## 1. Mục tiêu và bối cảnh

`POS_API` đã tích hợp TypeORM 0.3 trong tech stack, nhưng trước đó toàn bộ mã khởi tạo (`bootstrapAdmin`) và xác thực (`AuthService`) đang dùng chuỗi SQL thô (`manager.query(...)`), chưa khai báo các Entity classes và bỏ trống cấu hình `entities: []` trong `DataSource`.

Mục tiêu đã đạt được:
- Định nghĩa đầy đủ các TypeORM Entity classes cho 8 bảng hiện có (`stores`, `branches`, `roles`, `permissions`, `role_permissions`, `users`, `refresh_tokens`, `auth_rate_events`).
- Đăng ký danh sách entities vào `DataSource` trong `POS_API/src/data-source.ts`.
- Refactor toàn bộ mã truy vấn DB trong `bootstrap-admin.ts` và `auth.service.ts` sang sử dụng TypeORM Repository và TypeORM QueryBuilder (`createQueryBuilder`), đảm bảo type-safe và clean code.
- 100% test cases PB-01 và PB-02 đã vượt qua trên database PostgreSQL thật (5/5 tests pass).
- Bằng chứng QA: `qa-evidence/20261028-163520-cdcc096/run.md`.

