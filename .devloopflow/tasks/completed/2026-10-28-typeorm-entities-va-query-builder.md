# Task: Chuyển đổi mã nguồn sang TypeORM Entities và QueryBuilder

Plan: `plans/completed/2026-10-28-typeorm-entities-va-query-builder.md`
Nhánh: `feat/sprint-1-auth`
Trạng thái: COMPLETED

## Mục tiêu
- Định nghĩa các Entity classes trong `POS_API/src/entities/` cho 8 bảng hiện có.
- Cấu hình nạp entities vào `DataSource` trong `POS_API/src/data-source.ts`.
- Refactor `bootstrapAdmin` và `AuthService` chuyển từ raw SQL `manager.query(...)` sang TypeORM Repository và QueryBuilder (`createQueryBuilder`).
- Xác minh typecheck và toàn bộ test cases trên PostgreSQL thật.

## Việc đã hoàn tất
- [x] Lập kế hoạch và được Product Owner phê duyệt.
- [x] Kích hoạt plan trong `plans/active/`.
- [x] Định nghĩa 8 Entity classes tại `POS_API/src/entities/` (`store`, `branch`, `role`, `permission`, `role-permission`, `user`, `refresh-token`, `auth-rate-event`) cùng barrel export `index.ts`.
- [x] Đăng ký `entities` vào `dataSource` trong `POS_API/src/data-source.ts`.
- [x] Refactor `bootstrap-admin.ts` sang TypeORM Entity Repository & QueryBuilder.
- [x] Refactor toàn bộ `auth.service.ts` sang TypeORM Entity Repository & QueryBuilder (không còn raw SQL trừ PostgreSQL advisory lock).
- [x] Cập nhật DataSource options trong `foundation.test.ts` và `auth.integration.test.ts` để nạp `entities`.
- [x] `npm --prefix POS_API run build` thành công không có lỗi type.
- [x] Chạy full `npm test` với PostgreSQL local: 5/5 test PASS (TAP 5 pass, 0 fail).
- [x] Bằng chứng QA: `qa-evidence/20261028-163520-cdcc096/run.md`.

## Trạng thái hiện tại
Hoàn tất 100%.

## File đã đổi
- `POS_API/src/entities/store.entity.ts` [MỚI]
- `POS_API/src/entities/branch.entity.ts` [MỚI]
- `POS_API/src/entities/role.entity.ts` [MỚI]
- `POS_API/src/entities/permission.entity.ts` [MỚI]
- `POS_API/src/entities/role-permission.entity.ts` [MỚI]
- `POS_API/src/entities/user.entity.ts` [MỚI]
- `POS_API/src/entities/refresh-token.entity.ts` [MỚI]
- `POS_API/src/entities/auth-rate-event.entity.ts` [MỚI]
- `POS_API/src/entities/index.ts` [MỚI]
- `POS_API/src/data-source.ts`
- `POS_API/src/bootstrap-admin.ts`
- `POS_API/src/auth/auth.service.ts`
- `POS_API/src/foundation.test.ts`
- `POS_API/src/auth/tests/auth.integration.test.ts`

## Lệnh kiểm tra
- `npm --prefix POS_API run build` (PASS)
- `$env:DATABASE_URL="postgresql://pos_local:e04970d8f0a34ad264bb8807f883ec79fbd7ef322d77e1ab@localhost:5432/pos_local"; npm --prefix POS_API run test` (PASS 5/5)

