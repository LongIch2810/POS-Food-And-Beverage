# Task: Triển khai Sprint 05 — Quản lý Ca làm việc & Ca thu ngân (PB-06 + PB-13 UI)

**Trạng thái:** Hoàn thành (Completed)
**Kế hoạch liên quan:** [plans/completed/2026-11-03-sprint-05-shifts.md](../../plans/completed/2026-11-03-sprint-05-shifts.md)
**Sprint:** [sprints/sprint-05/SPRINT.md](../../sprints/sprint-05/SPRINT.md)
**Nhánh Git:** `feat/pb06-shifts`

## 1. Mục tiêu
Triển khai toàn bộ backend và UI lát cắt ca làm việc:
- Migration bảng `work_shifts`, `cash_reconciliations` và partial unique indexes (BR-14, BR-87).
- Module `shifts` trong NestJS API xử lý mở ca, đóng ca, tự động kế thừa tiền đầu ca và khóa `initial_cash` chi nhánh sau ca đầu.
- UI `ShiftsScreen`, `OpenShiftGate`, `BlindCountCloseShiftModal`, `ForceCloseShiftModal` nối API thật.
- Kiểm thử tích hợp 100% PASS và bằng chứng QA.

## 2. Tiến độ thực hiện

- [x] Lập kế hoạch Sprint 5, PO duyệt plan.
- [x] Tạo nhánh `feat/pb06-shifts`.
- [x] Soạn thảo đặc tả [specs/shifts.md](../../specs/shifts.md) theo chuẩn `create-pos-spec`.
- [x] Tạo Migration `20261103000000-Shifts.ts` và entities (`work-shift.entity.ts`, `cash-reconciliation.entity.ts`).
- [x] Triển khai `POS_API/src/shifts` (DTO, service, controller) và cập nhật `organization.service.ts` chặn sửa `initial_cash`.
- [x] Viết và chạy `shifts.integration.test.ts` (8/8 PASS).
- [x] Chuyển đổi `shiftService.ts` sang HTTP client và cập nhật UI components (`ShiftsScreen.tsx`, `OpenShiftGate.tsx`, `BlindCountCloseShiftModal.tsx`, `ForceCloseShiftModal.tsx`).
- [x] Chạy frontend unit test (32/32 PASS) & production build check (`npm --prefix POS_UI run build` pass).
- [x] Hoàn thành chạy toàn bộ suite test backend serially (`npm --prefix POS_API test` 65/65 PASS trên 15 suites).
- [x] Chạy E2E Docker integration test thực tế (`node qa-evidence/.../test-e2e-docker-shifts.mjs` 12/12 steps PASS) và lưu chứng cứ vào `qa-evidence/20261102-212200-7d5eba1-pb06-shifts/`.
- [x] Gọi subagent `code-reviewer` và `qa` review và kiểm định độc lập.
- [x] Đã xử lý triệt để 100% các findings từ code review (Sửa cursor microsecond TypeORM raw column, thêm endpoint `opening-cash-info` trên backend, dùng `manager` trong transaction, sanitize số tiền đếm `BlindCountCloseShiftModal`, bổ sung test phân trang cursor).
- [x] Build lại Docker containers và xác nhận toàn bộ test cases + E2E integration test PASS sạch sẽ.

## 3. Danh sách file thay đổi
- `plans/completed/2026-11-03-sprint-05-shifts.md`
- `tasks/completed/2026-11-03-sprint-05-shifts.md`
- `sprints/sprint-05/SPRINT.md`
- `specs/shifts.md`
- `POS_API/src/database/migrations/20261103000000-Shifts.ts`
- `POS_API/src/database/data-source.ts`
- `POS_API/src/shifts/entities/work-shift.entity.ts`
- `POS_API/src/shifts/entities/cash-reconciliation.entity.ts`
- `POS_API/src/shifts/shifts.dto.ts`
- `POS_API/src/shifts/shifts.response.ts`
- `POS_API/src/shifts/shifts.pagination.ts`
- `POS_API/src/shifts/shifts.service.ts`
- `POS_API/src/shifts/shifts.controller.ts`
- `POS_API/src/shifts/shifts.module.ts`
- `POS_API/src/shifts/tests/shifts.integration.test.ts`
- `POS_API/src/organization/organization.service.ts`
- `POS_API/src/app.module.ts`
- `POS_API/src/foundation.test.ts`
- `POS_API/package.json`
- `POS_UI/src/services/shiftService.ts`
- `POS_UI/src/features/shifts/ShiftsScreen.tsx`
- `POS_UI/src/features/shifts/OpenShiftGate.tsx`
- `POS_UI/src/features/shifts/BlindCountCloseShiftModal.tsx`
- `POS_UI/src/features/shifts/ForceCloseShiftModal.tsx`
- `POS_UI/src/utils/formatters.ts`
- `POS_UI/test/shift-service.test.mjs`
- `docs/PRODUCT_BACKLOG.md`
- `qa-evidence/20261102-212200-7d5eba1-pb06-shifts/run.md`
- `qa-evidence/20261102-212200-7d5eba1-pb06-shifts/backend-shifts-test.log`
- `qa-evidence/20261102-212200-7d5eba1-pb06-shifts/frontend-test.log`
- `qa-evidence/20261102-212200-7d5eba1-pb06-shifts/docker-e2e-shifts.log`
- `qa-evidence/20261102-212200-7d5eba1-pb06-shifts/test-e2e-docker-shifts.mjs`

