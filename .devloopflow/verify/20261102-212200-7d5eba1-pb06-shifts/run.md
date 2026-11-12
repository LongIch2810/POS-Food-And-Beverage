# Báo cáo Kiểm thử Thực thi QA — Sprint 05: Quản lý Ca làm việc & Tiền đầu ca (PB-06 + PB-13 UI)

- **Ngày thực hiện:** 2026-11-02 21:22:00 (UTC+7) / 2026-11-02 14:22:00 (UTC)
- **Thời gian hoàn thành:** 2026-11-02 21:25:00 (UTC+7) / 2026-11-02 14:25:00 (UTC)
- **Người thực hiện:** Subagent QA (Kiểm thử thực thi hệ thống)
- **Commit SHA:** `7d5eba1`
- **Trạng thái Working Tree:** Dirty (bao gồm mã nguồn triển khai PB-06, PB-13 UI, migrations, specs và artifacts Sprint 5)
- **Nhánh Git:** `feat/pb06-shifts`
- **Môi trường thực thi:**
  - Hệ điều hành: Microsoft Windows 11 Pro (OS Build 22631)
  - Node.js: `v22.22.2` (npm `10.9.7`)
  - Cơ sở dữ liệu: **PostgreSQL 17.9 (Debian 17.9-1.pgdg13+1)** chạy trên Docker container `pos_infra-postgres-1` (`127.0.0.1:5432`), user: `pos_local`
  - Backend API: Docker container `pos_api` (`127.0.0.1:3000`)
  - Frontend UI: Docker container `pos_ui` (`127.0.0.1:5173`)
  - Nhãn xác thực: **local do agent chạy (Kiểm thử thực thi trên Docker PostgreSQL 17)**

---

## 1. Tổng quan Kết quả Thực thi

Toàn bộ các bộ kiểm thử backend (Shifts Integration, Menu, Foundation, Auth, Organization, Platform) cùng bộ Frontend Suite, Production Build và Kiểm thử tích hợp E2E thực tế trên Docker Containers đã được thực thi với **100% test case PASS (Exit code 0)**.

| Bộ kiểm thử / Runner | Lệnh chính xác đã chạy | Thời gian thực thi | Exit Code | Kết quả Pass/Fail | File Artifact Gốc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Shifts Integration Suite** | `node --env-file-if-exists="d:\saved\Project\POS-F&B\POS_API\.env" --test "d:\saved\Project\POS-F&B\POS_API\dist\shifts\tests\shifts.integration.test.js"` | ~6.03s | `0` | **8/8 Pass** (0 fail, 0 skip) | [`backend-shifts-test.log`](evidence/backend-shifts-test.log) |
| **All Backend Regression (15 suites)** | `npm --prefix POS_API test` (`tsc -p tsconfig.json && node --test --test-concurrency=1 "dist/**/*.test.js"`) | ~175.13s | `0` | **65/65 Pass** (0 fail, 0 skip) | Xem log run task-471 |
| **Frontend UI Suite** | `npm --prefix POS_UI test` (`node --experimental-strip-types --test test/*.test.mjs`) | ~1.83s | `0` | **32/32 Pass** (0 fail, 0 skip) | [`frontend-test.log`](evidence/frontend-test.log) |
| **Frontend Production Build** | `npm --prefix POS_UI run build` (`tsc --noEmit && vite build`) | ~2.29s | `0` | **Pass (0 error)** | Stdout clean |
| **Docker Full E2E Integration** | `node qa-evidence/20261102-212200-7d5eba1-pb06-shifts/test-e2e-docker-shifts.mjs` | ~4.85s | `0` | **12/12 Steps Pass** | [`docker-e2e-shifts.log`](evidence/docker-e2e-shifts.log) |

---

## 2. Bảng Đối chiếu Tiêu chí Nghiệm thu Sprint 05

| Tiêu chí nghiệm thu Sprint 5 | ID tình huống | Yêu cầu nghiệp vụ & Quy tắc đối chiếu | Artifact chứng minh | Kết quả |
| :--- | :--- | :--- | :--- | :---: |
| **STAFF Check-in / Check-out** | `SHIFT-01` | Nhân viên có `shift.open` vào ca (201), tan ca với `shift.close` (200). Không sinh bản ghi đối soát két tiền. Bất biến 1 người chỉ có tối đa 1 ca mở (BR-87) được bảo vệ bởi partial unique index `uq_work_shifts_user_open` -> trả về `409 DUPLICATE_OPEN_SHIFT`. | [`backend-shifts-test.log`](evidence/backend-shifts-test.log) (ok 1), [`docker-e2e-shifts.log`](evidence/docker-e2e-shifts.log) (bước 6) | **ĐẠT** |
| **CASHIER Mở ca & Tiền đầu ca tự động** | `SHIFT-02`, `SHIFT-03`, `SHIFT-05` | Ca thu ngân đầu tiên của chi nhánh tự động lấy `branches.initial_cash` làm `opening_cash` (BR-47), sinh bản ghi `cash_reconciliations` trạng thái `PENDING`. Ca thu ngân tiếp theo tự động kế thừa `counted_cash` của ca trước làm `opening_cash` (BR-48). Bất biến mỗi chi nhánh chỉ có duy nhất 1 ca CASHIER OPEN được bảo vệ bởi partial unique index `uq_work_shifts_branch_cashier_open` -> trả `409 BRANCH_HAS_OPEN_CASHIER_SHIFT`. | [`backend-shifts-test.log`](evidence/backend-shifts-test.log) (ok 2, 3, 5), [`docker-e2e-shifts.log`](evidence/docker-e2e-shifts.log) (bước 7, 10) | **ĐẠT** |
| **CASHIER Đóng ca Đếm mù (Blind Count)** | `SHIFT-04` | Thu ngân tự đóng ca phải nộp `counted_cash` (BR-49). Backend tính `expected_cash = opening_cash + cash_sales - expense` (BR-50). So khớp: lệch 0 -> `MATCHED`; lệch tiền bắt buộc ghi chú `note` (nếu thiếu note -> `422 NOTE_REQUIRED_FOR_DISCREPANCY`). Lệch âm -> `SHORTAGE`, lệch dương -> `OVERAGE`. Ca đã đóng cấm đóng lại (409). | [`backend-shifts-test.log`](evidence/backend-shifts-test.log) (ok 4), [`docker-e2e-shifts.log`](evidence/docker-e2e-shifts.log) (bước 9) | **ĐẠT** |
| **Khóa initial_cash Chi nhánh** | `SHIFT-06` | Sau khi chi nhánh đã phát sinh ít nhất 1 ca thu ngân (`CASHIER`), cấm chỉnh sửa `initial_cash` của chi nhánh (BR-47) -> API PATCH `branches/:id` trả về `409 INITIAL_CASH_LOCKED`. Các thông tin khác (`name`, `address`, `phone`) vẫn cho phép sửa bình thường. | [`backend-shifts-test.log`](evidence/backend-shifts-test.log) (ok 6), [`docker-e2e-shifts.log`](evidence/docker-e2e-shifts.log) (bước 8) | **ĐẠT** |
| **Đóng ca Cưỡng chế (Force Close)** | `SHIFT-07` | Quản lý / Chủ quán có quyền `shift.force_close` đóng ca thay thu ngân khi có sự cố (BR-88). Bắt buộc `countedCash` và `reason` (tối đa 255 ký tự). Ghi nhận `closed_by` = ID người thực hiện và `status = CLOSED`. Thu ngân không có quyền này bị chặn `403 FORBIDDEN`. | [`backend-shifts-test.log`](evidence/backend-shifts-test.log) (ok 7), [`docker-e2e-shifts.log`](evidence/docker-e2e-shifts.log) (bước 11) | **ĐẠT** |
| **Phân quyền, Phân trang & Multi-tenant** | `SHIFT-08` | Người có `shift.read` được xem danh sách ca; người chỉ có phạm vi chi nhánh không xem ca của chi nhánh khác; Store khác gọi chéo ca nhận `404 NOT_FOUND` (BR-80, BR-81). Phân trang theo cursor bảo toàn microsecond (`started_at`). | [`backend-shifts-test.log`](evidence/backend-shifts-test.log) (ok 8), [`docker-e2e-shifts.log`](evidence/docker-e2e-shifts.log) (bước 12) | **ĐẠT** |
| **UI Quản lý Ca PB-13** | `PB13-SHIFT` | `ShiftsScreen.tsx`, `OpenShiftGate.tsx`, `BlindCountCloseShiftModal.tsx`, `ForceCloseShiftModal.tsx` kết nối trực tiếp với backend qua `shiftService.ts` HTTP client. Tiền đầu ca hiển thị read-only kèm nguồn gốc (BR-47, BR-48). Đóng ca đếm mù hiển thị kết quả đối soát trực quan (MATCHED/SHORTAGE/OVERAGE). | [`frontend-test.log`](evidence/frontend-test.log) (ok 32) | **ĐẠT** |

---

## 3. Thẩm định Kỹ thuật Chi tiết trên PostgreSQL 17

### 3.1 Partial Unique Indexes & Bất biến Nghiệp vụ (BR-14, BR-87)
Migration `20261103000000-Shifts.ts` đã tạo:
- Index `uq_work_shifts_user_open`:
  ```sql
  CREATE UNIQUE INDEX uq_work_shifts_user_open ON work_shifts (user_id) WHERE status = 'OPEN';
  ```
  Ngăn chặn ở mức PostgreSQL engine mọi trường hợp một user mở đồng thời 2 ca làm việc.
- Index `uq_work_shifts_branch_cashier_open`:
  ```sql
  CREATE UNIQUE INDEX uq_work_shifts_branch_cashier_open ON work_shifts (branch_id) WHERE status = 'OPEN' AND shift_type = 'CASHIER';
  ```
  Bảo đảm mỗi chi nhánh tại bất kỳ thời điểm nào chỉ có tối đa 1 ca thu ngân đang mở.

### 3.2 Khóa Pessimistic Write và Ngăn ngừa Race Condition (BR-03, BR-49)
- Quá trình đóng ca (`closeShift`, `forceCloseShift`) sử dụng transaction với câu lệnh khóa base entity `WorkShift` kết hợp `innerJoin('s.branch')` bằng `setLock('pessimistic_write', undefined, ['s'])`.
- Không sử dụng lock trên các outer join (`leftJoin`), tuân thủ chặt chẽ quy tắc PostgreSQL và bài học ghi nhận trong `MEMORY.md`.
- Mọi quan hệ đối soát `cash_reconciliations` được load sau khi khóa hàng ca làm việc thành công, bảo đảm không có race condition giữa 2 request đóng ca đồng thời.

### 3.3 Đơn vị Tiền tệ & Định dạng VND (BR-08, BR-103)
- Cơ sở dữ liệu lưu trữ `opening_cash`, `counted_cash`, `expected_cash`, `difference` bằng kiểu `bigint`.
- Giao diện và API xử lý hiển thị chuẩn xác số tiền đồng, không làm tròn số thực, kiểm soát trần giá trị không âm và không vượt 1.000 tỷ VND.

