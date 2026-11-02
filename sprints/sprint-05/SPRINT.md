# Sprint 5 — Hoàn thành

**Trạng thái:** Hoàn thành ngày 03/11/2026 trên nhánh `feat/pb06-shifts`. Kế hoạch triển khai: [plans/completed/2026-11-03-sprint-05-shifts.md](../../plans/completed/2026-11-03-sprint-05-shifts.md). Tiến độ theo dõi tại [tasks/completed/2026-11-03-sprint-05-shifts.md](../../tasks/completed/2026-11-03-sprint-05-shifts.md). Bằng chứng QA: [qa-evidence/20261102-212200-7d5eba1-pb06-shifts/run.md](../../qa-evidence/20261102-212200-7d5eba1-pb06-shifts/run.md).

## Cơ sở lập kế hoạch

- [Product Backlog](../../docs/PRODUCT_BACKLOG.md) xác định **PB-06 (Ca làm)** là hạng mục ưu tiên kế tiếp sau PB-05 (Thực đơn).
- [Sprint 4](../sprint-04/SPRINT.md) đã hoàn tất triển khai PB-05 (API/DB Thực đơn) và PB-13 (Lát cắt UI Thực đơn), kiểm thử 100% PASS trên Docker PostgreSQL 17 và WSL PostgreSQL 16 ngày 02/11/2026 ([bằng chứng QA](../../qa-evidence/20261102-190753-31f4799-docker-qa/run.md)).
- Khóa sửa quỹ ban đầu của chi nhánh sau ca đầu tiên là việc còn theo dõi từ Sprint 3 (PB-04), được quy định tích hợp cùng kiểm tra lịch sử ca trong PB-06.
- Nhóm thực hiện gồm Product Owner và Codex/Antigravity; nhịp sprint chuẩn là 1 tuần.

## Sprint Goal

Nhân viên (`STAFF`) và Thu ngân (`CASHIER`) quản lý được ca làm việc của mình qua API và UI thật:
1. Ghi nhận thời gian vào ca và tan ca đối với nhân viên (`shift_type = STAFF`).
2. Mở ca thu ngân (`shift_type = CASHIER`) tại chi nhánh với tiền đầu ca tự động tính từ hệ thống (ca đầu tiên lấy từ quỹ chi nhánh `branches.initial_cash`, các ca tiếp theo lấy từ số tiền thực đếm `counted_cash` của ca thu ngân đã đóng gần nhất trong cùng chi nhánh).
3. Đảm bảo toàn vẹn dữ liệu: mỗi người chỉ có tối đa một ca đang mở (`BR-14`), mỗi chi nhánh chỉ có tối đa một ca thu ngân đang mở (`BR-87`), và khóa chỉnh sửa `initial_cash` của chi nhánh sau khi ca thu ngân đầu tiên được mở.
4. Chuẩn bị nền tảng ca làm (`work_shift_id`) bắt buộc cho luồng bán hàng tại quầy (PB-07) và đối soát két đóng ca (PB-10).

## Sprint Backlog

| Thứ tự | Item | Kết quả cần đạt | Điều kiện trước khi triển khai | Trạng thái |
| --- | --- | --- | --- | :---: |
| 1 | Refinement PB-06 và UI ca làm | Phỏng vấn, rà soát các quy tắc BR-14–20, BR-55, BR-87, BR-88, BR-89, BR-102; làm rõ quyền hạn (`shift.open`, `shift.close`, `shift.force_close`, `shift.read`), cấu trúc bảng `work_shifts`, `cash_reconciliations` (khởi tạo ở trạng thái `PENDING`), hợp đồng API và ma trận tiêu chí → tình huống → artifact. | Product Owner chốt các quyết định; hoàn tất đặc tả tại [specs/shifts.md](../../specs/shifts.md). | **Hoàn thành** |
| 2 | PB-06 — API & DB Ca làm | Migration và API quản lý ca: mở ca, tan ca cho STAFF; mở ca CASHIER (tính `opening_cash`, tạo bản ghi `cash_reconciliations` trạng thái `PENDING`); đóng ca cơ bản; partial unique indexes bảo đảm mỗi người 1 ca mở (`BR-14`) và mỗi chi nhánh 1 ca thu ngân mở (`BR-87`); khóa sửa `branches.initial_cash` khi đã có ca. | Spec PB-06 đã chốt trong `specs/shifts.md`. | **Hoàn thành** |
| 3 | PB-13 — Lát cắt UI Ca làm | Nối màn hình Ca làm (`POS_UI/src/features/shifts/`): `ShiftsScreen.tsx`, `OpenShiftGate.tsx`, `BlindCountCloseShiftModal.tsx`, `ForceCloseShiftModal.tsx` với API thật qua `shiftService.ts`. Hiển thị thông tin ca đang mở, form mở ca với tiền đầu ca tự động (read-only), nút vào ca/tan ca, và danh sách ca phân trang. | API tương ứng đã sẵn sàng và được kiểm thử; không dùng dữ liệu mock cho lát cắt này. | **Hoàn thành** |
| 4 | Review và nghiệm thu | Kiểm thử tự động trên PostgreSQL thật (8/8 backend test PASS, 65/65 hồi quy toàn hệ thống PASS, 32/32 UI test PASS, build clean), kiểm thử Docker E2E (12/12 steps PASS), đối chiếu toàn bộ tiêu chí nghiệm thu với artifact gốc theo chuẩn `AGENTS.md`. | Bằng chứng QA đầy đủ tại [qa-evidence/20261102-212200-7d5eba1-pb06-shifts/run.md](../../qa-evidence/20261102-212200-7d5eba1-pb06-shifts/run.md). | **Hoàn thành** |

*Lưu ý phạm vi:*
- Quản lý chi phí két trong ca (`shift_expenses`), đối soát tiền mặt đếm mù khi có doanh thu bán hàng và đóng cưỡng chế ca khi có hóa đơn sẽ hoàn thiện ở **PB-10**.
- Tạo đơn bán hàng và gắn hóa đơn với ca thuộc phạm vi **PB-07**.

## Tiêu chí nghiệm thu đã đạt

### 1. Ca nhân viên (`shift_type = STAFF`)
- [x] Nhân viên có thể ghi nhận giờ vào ca (`started_at`); hệ thống tạo bản ghi `work_shifts` với `status = 'OPEN'`.
- [x] Nhân viên có thể tan ca; hệ thống cập nhật `ended_at = now()`, chuyển trạng thái `status = 'CLOSED'`. Kiểm tra ràng buộc `ended_at > started_at` (BR-18).
- [x] Mỗi nhân viên tại một thời điểm chỉ có tối đa một ca đang mở; nếu cố mở ca thứ hai khi ca cũ chưa đóng thì bị từ chối bằng lỗi `409 DUPLICATE_OPEN_SHIFT` (BR-14, chặn bởi partial unique index `(user_id) WHERE status = 'OPEN'`).

### 2. Ca thu ngân (`shift_type = CASHIER`) & Tiền đầu ca
- [x] Thu ngân chỉ mở ca tại chi nhánh mình được phân công (`branch_id` khớp với user context). Người có quyền `branch.access_all` (`OWNER`) có thể chỉ định `branch_id` hợp lệ cùng store.
- [x] Mỗi chi nhánh tại một thời điểm chỉ có tối đa một ca thu ngân đang mở; nếu chi nhánh đã có ca thu ngân đang `OPEN`, yêu cầu mở ca mới bị từ chối `409 BRANCH_HAS_OPEN_CASHIER_SHIFT` (BR-87, chặn bởi partial unique index `(branch_id) WHERE status = 'OPEN' AND shift_type = 'CASHIER'`).
- [x] Tiền đầu ca (`opening_cash`) do hệ thống tự tính và điền, thu ngân không được sửa (BR-55, BR-102):
  - Với ca thu ngân đầu tiên của chi nhánh: `opening_cash = branches.initial_cash`.
  - Với các ca thu ngân tiếp theo: `opening_cash` lấy từ `counted_cash` của ca `CASHIER` đã `CLOSED` gần nhất theo `ended_at` trong cùng chi nhánh (BR-89).
- [x] Khi mở ca thu ngân thành công, hệ thống tự động tạo 1 bản ghi `cash_reconciliations` tương ứng với `work_shift_id`, `opening_cash`, trạng thái `PENDING` (DESIGN_DB Phần 5).
- [x] Ngay sau khi chi nhánh phát sinh ca thu ngân đầu tiên, API cập nhật chi nhánh (`PATCH /branches/:id`) chặn sửa trường `initial_cash` (trả về lỗi `409 INITIAL_CASH_LOCKED`).

### 3. Đóng ca thu ngân cơ bản & Truy vấn ca
- [x] API lấy ca hiện tại của người dùng (`GET /api/v1/work-shifts/current`): trả về thông tin ca đang mở, loại ca, thời gian bắt đầu, tiền đầu ca (nếu là CASHIER) hoặc `null` nếu chưa vào ca.
- [x] Thu ngân có thể đóng ca thu ngân của mình: nhập `counted_cash` thực tế trong két để hoàn tất đối soát và đóng ca (tính `expected_cash`, chênh lệch `difference`, cập nhật trạng thái `MATCHED`/`SHORTAGE`/`OVERAGE` và chuyển ca sang `CLOSED`).
- [x] Quản lý / Chủ quán có thể đóng ca cưỡng chế (`POST /api/v1/work-shifts/:id/force-close`) với `countedCash` và `reason`, ghi nhận `closed_by = manager_id`.
- [x] Ca đã `CLOSED` không thể mở lại hoặc sửa đổi trực tiếp (BR-17, BR-242).

### 4. Phân quyền & Cô lập dữ liệu (Multi-tenant)
- [x] `PLATFORM_ADMIN` bị chặn tuyệt đối không được truy cập API ca làm việc (`403 PERMISSION_DENIED` theo BR-81).
- [x] Tài khoản bị khóa (`is_active = false`) hoặc thuộc cửa hàng bị tạm khóa (`SUSPENDED`) bị chặn thao tác ca.
- [x] Nhân viên chỉ xem được ca của mình; Quản lý (`MANAGER`) xem được danh sách ca trong chi nhánh mình; Chủ quán (`OWNER`) xem được ca toàn cửa hàng (BR-65, BR-77). Không thể truy cập ca của cửa hàng khác (404 NOT_FOUND theo BR-80).

### 5. Giao diện người dùng (PB-13 UI ca làm)
- [x] UI màn hình Ca làm nối với API thật, hiển thị trạng thái ca hiện tại của người dùng (chưa vào ca, đang trong ca, chi tiết ca).
- [x] Form mở ca thu ngân hiển thị số tiền đầu ca từ hệ thống dưới dạng chỉ đọc (read-only), không có ô input cho sửa `opening_cash`.
- [x] Cổng bảo vệ ca `OpenShiftGate` nhận diện chính xác trạng thái ca mở trước khi cho phép vào khu vực bán hàng.
- [x] Xử lý tải trang, lỗi mạng và phản hồi tiếng Việt chuẩn hóa; không hiển thị hoặc trộn lẫn dữ liệu giữa các tab hay phiên đăng nhập.

---

## Sprint Review & Kết quả Nghiệm thu

- **Backend Tests:** 15 test suites, 65/65 subtests PASS trên PostgreSQL 17 (bao gồm 8 subtests kiểm thử chi tiết nghiệp vụ ca SHIFT-01..08).
- **Frontend Tests:** 32/32 tests PASS (bao gồm HTTP client tests cho ca làm việc `PB13-SHIFT-HTTP`).
- **Production Builds:** Cả backend (`tsc`) và frontend (`tsc && vite build`) hoàn tất sạch sẽ 0 lỗi.
- **Docker E2E:** 12/12 bước kiểm thử luồng thực tế (Admin tạo store, Owner tạo branch 1.5M, Staff check-in/out, Cashier mở ca lấy 1.5M, lock branch initialCash, đóng ca đếm mù MATCHED, mở ca 2 kế thừa tiền, Manager force close ghi nhận SHORTAGE) đều thành công trên Docker containers `pos_api` và `pos_ui`.
- **Hồ sơ nghiệm thu QA:** [qa-evidence/20261102-212200-7d5eba1-pb06-shifts/run.md](../../qa-evidence/20261102-212200-7d5eba1-pb06-shifts/run.md).
