# Kế hoạch triển khai Sprint 05 — Quản lý Ca làm việc & Ca thu ngân (PB-06 + PB-13 UI)

**Trạng thái:** Hoàn thành (Completed)
**Ngày bắt đầu:** 03/11/2026
**Ngày hoàn thành:** 03/11/2026
**Nhánh Git:** `feat/pb06-shifts`
**Kế hoạch Sprint liên quan:** [sprints/sprint-05/SPRINT.md](../../sprints/sprint-05/SPRINT.md)
**Task đã hoàn tất:** [tasks/completed/2026-11-03-sprint-05-shifts.md](../../tasks/completed/2026-11-03-sprint-05-shifts.md)
**Bằng chứng QA:** [qa-evidence/20261102-212200-7d5eba1-pb06-shifts/run.md](../../qa-evidence/20261102-212200-7d5eba1-pb06-shifts/run.md)

## 1. Mục tiêu tổng quan

Triển khai toàn diện **Sprint 5** theo cam kết tại [sprints/sprint-05/SPRINT.md](../../sprints/sprint-05/SPRINT.md):
1. **Refinement & Đặc tả chức năng:** Soạn thảo và hoàn thiện [specs/shifts.md](../../specs/shifts.md) bằng skill `create-pos-spec`, đối chiếu toàn diện các quy tắc `BR-14–20`, `BR-55`, `BR-87–89`, `BR-102` và ma trận phân quyền.
2. **Cơ sở dữ liệu (Migration & Entities):** Thêm bảng `work_shifts`, `cash_reconciliations`, partial unique indexes bảo đảm mỗi người tối đa một ca mở (`BR-14`) và mỗi chi nhánh tối đa một ca thu ngân mở (`BR-87`); bổ sung permissions và role_permissions cho ca làm việc.
3. **Backend API (`POS_API`):** Xây dựng module `shifts` gồm mở/đóng ca nhân viên (`STAFF`), mở ca thu ngân (`CASHIER`) với cơ chế tự động tính tiền đầu ca (`opening_cash`), đóng ca thu ngân cơ bản với đối soát đếm mù (`counted_cash`), đóng cưỡng chế (`force_close`), và khóa chỉnh sửa `initial_cash` của chi nhánh sau khi đã phát sinh ca thu ngân đầu tiên.
4. **Frontend UI Slice (`POS_UI`):** Chuyển đổi `shiftService.ts` từ mock sang gọi API HTTP thật; kết nối `ShiftsScreen.tsx`, `OpenShiftGate.tsx`, `BlindCountCloseShiftModal.tsx`, và `ForceCloseShiftModal.tsx` với API; đảm bảo tiền đầu ca luôn hiển thị dạng read-only (`BR-55`).
5. **Kiểm thử & Bằng chứng QA:** Viết bộ test tích hợp backend (8 kịch bản test trên PostgreSQL 17 Docker), unit test frontend, và kịch bản E2E Docker lưu vết tại `qa-evidence/20261102-212200-7d5eba1-pb06-shifts/`.

## 2. Phạm vi và Quyết định đã chốt

- **Ranh giới PB-06 vs PB-10:** PB-06 hỗ trợ mở ca và đóng ca cơ bản (thu ngân đếm két nhập `counted_cash`, hệ thống tính `expected_cash = opening_cash` và ghi nhận chênh lệch) để kiểm chứng chuỗi nối ca tiếp theo (`counted_cash` ca 1 thành `opening_cash` ca 2). PB-10 sẽ tiếp tục tích hợp kiểm tra hóa đơn OPEN, trừ chi phí két (`shift_expenses`) và doanh thu thanh toán tiền mặt.
- **Quyền hạn & Tenant Isolation:**
  - `PLATFORM_ADMIN` bị chặn tuyệt đối (403).
  - CASHIER/MANAGER mở ca tại chi nhánh gắn trên token; OWNER mở ca với `branchId` thuộc store.
  - Sau ca CASHIER đầu tiên, API `PATCH /branches/:id` chặn sửa `initialCash` (409 INITIAL_CASH_LOCKED).
- **Quy ước API:**
  - `POST /api/v1/work-shifts`
  - `GET /api/v1/work-shifts/current`
  - `GET /api/v1/work-shifts`
  - `GET /api/v1/work-shifts/:id`
  - `POST /api/v1/work-shifts/:id/close`
  - `POST /api/v1/work-shifts/:id/force-close`

## 3. Các bước thực hiện và Kết quả

1. [x] Lập kế hoạch Sprint 5 và được Product Owner phê duyệt.
2. [x] Refinement và biên soạn đặc tả [specs/shifts.md](../../specs/shifts.md) bằng skill `create-pos-spec`.
3. [x] Tạo migration `20261103000000-Shifts.ts` và TypeORM entities (`work-shift.entity.ts`, `cash-reconciliation.entity.ts`).
4. [x] Xây dựng backend module `shifts` (DTO, service, controller, patchBranch chặn initialCash).
5. [x] Viết test tích hợp `shifts.integration.test.ts` (8 kịch bản SHIFT-01..08) trên PostgreSQL 17 và chạy test (8/8 PASS).
6. [x] Cập nhật frontend `shiftService.ts` và các màn hình `ShiftsScreen`, `OpenShiftGate`, modals để kết nối API thật.
7. [x] Viết test UI frontend và chạy kiểm thử hồi quy toàn bộ dự án (32/32 PASS UI test, 65/65 PASS Backend test trên 15 suites).
8. [x] Chạy kiểm thử E2E Docker thực tế và thu thập bằng chứng QA tại `qa-evidence/20261102-212200-7d5eba1-pb06-shifts/`.

