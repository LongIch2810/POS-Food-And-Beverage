# Đối soát nghiệm thu Sprint 05 — QA độc lập

**Nguồn:** `sprints/sprint-05/SPRINT.md:34-64` (19 bullet chưa có mã riêng; S05-01..19 là mã QA gán theo thứ tự), `specs/shifts.md:222-235` (SHIFT-01..08), `docs/BUSINESS_RULES.md`. Chỉ xét tầng Sprint vì lượt này được giao QA Sprint. SHA nền `1132f12a447058e6ace8cb8fb87dc6877763ee5d`, working tree dirty. Bằng chứng local do QA tự chạy, không có CI cho tree này.

**Lệnh đã tự chạy:** `POS_API/npm test` trước và sau SHIFT-09 (66/66 và 67/67, exit 0), `POS_UI/npm test` (37/37, exit 0), Chrome headless trên DB sandbox ở hai lượt. Xem `qa-evidence/20261105-212738-1132f12-sprint05-qa-independent/` và `qa-evidence/20261105-213606-1132f12-sprint05-qa-browser-extended/`; mỗi thư mục có `*-meta.txt`, output gốc, ảnh/network/DB. Tên test và assertion đã đối chiếu với `POS_API/src/shifts/tests/shifts.integration.test.ts`, `POS_UI/test/shift-screen.test.mjs`.

| Mã, nguồn | Điều kiện + thao tác; expected → actual và artifact | Trạng thái |
| --- | --- | --- |
| S05-01, Sprint:36, SHIFT-01 | STAFF chưa có ca, POST mở; cần OPEN + startedAt → assertion SHIFT-01 và log backend sau SHIFT-09 `ok`. | PASS |
| S05-02, Sprint:37, SHIFT-01, BR-18 | STAFF OPEN, POST close; cần CLOSED + endedAt > startedAt → assertion SHIFT-01 `ok`. | PASS |
| S05-03, Sprint:38, SHIFT-01, BR-14 | Đã OPEN rồi mở lần nữa và OWNER mở đồng thời 2 branch; cần 409 SHIFT_ALREADY_OPEN + unique index → SHIFT-01/BR-14 concurrency `ok`, `db-shift-indexes.txt`. | PASS |
| S05-04, Sprint:41, BR-71/71b | CASHIER/OWNER chọn branch; cần CASHIER chỉ branch mình, OWNER branch cùng store → assertion mới trong SHIFT-08: CASHIER gửi branchId khác vẫn tạo ở branch mình; OWNER store B chọn branch A nhận 404. Full backend QA final `ok`. | PASS |
| S05-05, Sprint:42, SHIFT-03, BR-87 | Branch có CASHIER OPEN, mở ca thứ hai; cần 409 BRANCH_CASHIER_SHIFT_OPEN + index → SHIFT-03 `ok`, `db-shift-indexes.txt`. | PASS |
| S05-06, Sprint:43-45, SHIFT-02/05, BR-55/89/102 | Ca đầu/sau mở; cần initialCash/countedCash cũ và client không sửa openingCash → SHIFT-02/05 `ok`, request gài `openingCash: 999` bị 422; ảnh gate chỉ đọc. | PASS |
| S05-07, Sprint:46, SHIFT-02 | Branch mới mở CASHIER; cần một reconciliation PENDING cùng openingCash → SHIFT-02 `ok`, `browser-before-count-response.json` PENDING, DB sau có một row. | PASS |
| S05-08, Sprint:47, SHIFT-06 | Branch đã có ca, PATCH initialCash; cần 409 INITIAL_CASH_LOCKED → SHIFT-06 `ok`. | PASS |
| S05-09, Sprint:50 | Trước/sau mở ca, GET current; cần null hoặc đầy đủ type/time/openingCash → SHIFT-01 assert null, browser response đang OPEN có shiftType, startedAt, openingCash đúng. | PASS |
| S05-10, Sprint:51, SHIFT-04, BR-58 | CASHIER OPEN, đóng khớp/thiếu/thừa; cần MATCHED/SHORTAGE/OVERAGE, difference đúng, đếm mù → SHIFT-04/09 `ok`, browser response trước đếm expectedCash=null, DB sau MATCHED. | PASS |
| S05-11, Sprint:52, SHIFT-07 | MANAGER force-close ca CASHIER khác với countedCash/reason; cần closedBy + reason → SHIFT-07 `ok` kể cả ranh giới 255 ký tự. | PASS |
| S05-12, Sprint:53, BR-17 | Ca CLOSED, thử đóng lại/mở lại/sửa trực tiếp; cần chặn mọi sửa → SHIFT-04 chứng minh re-close 409 và PATCH status OPEN 404; backend QA final `ok`. | PASS |
| S05-13, Sprint:56, SHIFT-08, BR-81 | PLATFORM_ADMIN GET shifts; cần 403 PERMISSION_DENIED → SHIFT-08 `ok`. | PASS |
| S05-14, Sprint:57, SHIFT-08 | Tài khoản disabled/store SUSPENDED GET current; cần 403 code đúng → SHIFT-08 `ok` cho hai trường hợp. | PASS |
| S05-15, Sprint:58, SHIFT-08, BR-65/77/80 | CASHIER/MANAGER/OWNER list/detail ở 2 branch/2 store; cần scope và cross-store 404 → SHIFT-08 `ok`, browser owner store B không thấy ca A. | PASS |
| S05-16, Sprint:61, UI/E2E spec | CASHIER chưa ca → mở/đóng qua UI; cần API thật và trạng thái trước/OPEN/CLOSED → ảnh, network POST 201/200, DB trước/sau ở browser run. | PASS |
| S05-17, Sprint:62, BR-55 | Form mở CASHIER; cần openingCash chỉ đọc không input sửa → `browser-gate-before.png` hiển thị Chỉ đọc và số từ API. | PASS |
| S05-18, Sprint:63, BR-16 | CASHIER sandbox có fixture pos.sell, chưa có ca → vào Bán hàng thấy gate; mở ca qua API 201/current OPEN thì gate cho qua → QA browser cuối có ảnh POS trước/sau, network và DB. POS content là mock, không kết luận bán hàng backend. | PASS |
| S05-19, Sprint:64, BR-80 | Tải/lỗi mạng, chuyển Ca làm→Thực đơn→Ca làm, logout CASHIER store A/login OWNER store B → browser cuối có spinner/lỗi tiếng Việt, tab Thực đơn không có ca, quay lại đúng ca CLOSED, store B trống/không toast cũ. | PASS |

**Lỗi S05-19/B09:** mức độ cao, xem `qa-evidence/20261105-213606-1132f12-sprint05-qa-browser-extended/run.md` với setup, thao tác, ảnh và network trước fix. Agent chính ghi `errors/2026-11-05-toast-leak-between-sessions.md`; QA đã tự chạy lại B09 và B05-B08 tại `qa-evidence/20261105-213954-1132f12-sprint05-qa-b09-retest/run.md`, B09 PASS. Lượt đầu exit 0 dù B09 FAIL vì script chưa assert toast isolation; lượt retest có assert.

**Kết luận Sprint:** PASS theo bằng chứng local do QA tự chạy cho 19 tiêu chí; artifact bổ sung S05-18/S05-19 nằm tại `qa-evidence/20261105-214648-1132f12-sprint05-qa-pos-tab-final/run.md`. Quyền `pos.sell` chỉ được cấp bằng fixture trong DB sandbox để vào cổng POS; màn POS phía sau dùng dữ liệu mẫu và không chứng minh backend bán hàng. Chưa có CI/runner độc lập cho working tree dirty, nên đây không phải xác nhận CI hay production.
