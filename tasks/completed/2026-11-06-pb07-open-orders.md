# Task: Triển khai PB-07 và lát cắt UI Sprint 6

**Trạng thái:** Hoàn tất triển khai và QA task; AC-1..9 PASS trên sandbox local. QA cấp sprint sau đó S6-01..09 PASS và Sprint 6 đã nghiệm thu/đóng local ngày 07/11/2026. **Plan:** [plans/completed/2026-11-06-sprint-06-open-orders.md](../../plans/completed/2026-11-06-sprint-06-open-orders.md). **Sprint:** [sprints/sprint-06/SPRINT.md](../../sprints/sprint-06/SPRINT.md). **Nhánh:** `feat/pb07-open-orders`. **HEAD nền:** `91cf4a1`; working tree chưa commit.

## Baseline

Sau khi tạo nhánh từ `origin/master`, `git status --short`: ` M docs/PRODUCT_BACKLOG.md`, `?? sprints/sprint-06/`, `?? tasks/completed/2026-11-06-create-sprint-06.md`. Đây là tài liệu chưa commit từ lượt trước; giữ nguyên. Không có spec PB-07 trong `specs/`; chưa có invoice entities/API. POS hiện dùng mock, ca làm và menu có API thật. Không có code/test mới của PB-07 tại baseline.

## Mục tiêu và phạm vi

Thực hiện đầy đủ plan PB-07: DB/API/UI đơn OPEN, item snapshot, chuyển bàn, hủy đơn OPEN, chặn đóng ca khi còn đơn mở. Không làm payment, promotion hoặc inventory deduction. Nguồn quyết định: plan đã duyệt và Sprint 6, các BR liên quan.

## Bảng AC chốt trước khi code

| AC | Nội dung | Nguồn | BR | Tiêu chí sprint (mã + nguồn) | Cách chứng minh |
| --- | --- | --- | --- | --- | --- |
| AC-1 | Chỉ tạo đơn với ca CASHIER của chính người gọi đang OPEN; branch/shift/table khớp, branch active | Plan và Sprint 6 | BR-16, BR-69, BR-76 | S6-01, Sprint 6 | Integration API/DB thành công và từ chối |
| AC-2 | DINE_IN có bàn, TAKEAWAY không bàn; một OPEN/bàn kể cả đồng thời; bàn có khách tính từ đơn | Sprint 6 | BR-69, BR-74, BR-95, BR-99 | S6-02, Sprint 6 | Migration constraint, test concurrency, DB trước/sau |
| AC-3 | Mã HD+8 ký tự duy nhất/bất biến; cô lập store/branch, chặn PLATFORM_ADMIN | Sprint 6 | BR-75, BR-80, BR-81 | S6-03, Sprint 6 | Test API/DB/mã và quyền |
| AC-4 | Thêm món tạo dòng mới, chỉ sửa/xóa ở OPEN, menu đúng store và còn bán | Sprint 6 | BR-09, BR-22, BR-90 | S6-04, Sprint 6 | Test tích hợp từng trạng thái |
| AC-5 | Số lượng dương, giá server, snapshot; đổi menu không đổi dòng cũ; subtotal từ SUM trong transaction | Sprint 6 | BR-12, BR-23–26, BR-90 | S6-05, Sprint 6 | Test DB snapshot, tổng, đồng thời |
| AC-6 | UI API thật cho bàn/mang đi/đơn OPEN; reload, lỗi/tải và đổi phiên đúng | Sprint 6 và plan | PB-13 | S6-06, Sprint 6 | UI test + browser/network/DB |
| AC-7 | Chuyển đơn OPEN sang bàn trống cùng chi nhánh, từ chối đích sai/bận, giữ món/tổng | Sprint 6 | BR-92, BR-95, BR-69, BR-80 | S6-07, Sprint 6 | Test API concurrency + browser/DB |
| AC-8 | Hủy đơn OPEN có lý do, chuyển CANCELLED, bàn trống, không thêm món | Sprint 6 | BR-21, BR-22, BR-28, BR-99 | S6-08, Sprint 6 | Test API + browser/DB |
| AC-9 | Không đóng ca thường hoặc cưỡng chế khi còn đơn OPEN của ca; lỗi nêu mã đơn, ca/đối soát không đổi; xử lý hết đơn rồi đóng được | `specs/sales.md` mục Tích hợp đóng ca; plan bước 4; quyết định Product Owner 06/11/2026 | BR-19 | S6-09, `sprints/sprint-06/SPRINT.md` | API close/force-close và DB trước/sau, test integration |

**Lịch sử thay đổi bảng AC:** Ngày 06/11/2026, Product Owner chọn thêm S6-09 riêng sau khi agent chính phát hiện plan/spec đã yêu cầu chặn đóng ca còn đơn OPEN nhưng bảng Sprint 6 ban đầu chỉ có S6-01..08. Agent chính bổ sung AC-9 và S6-09 để QA có nguồn/mã tiêu chí rõ ràng; AC-1..8 giữ nguyên. Nguồn quyết định: câu trả lời trong phiên “Thêm S6-09 riêng (Recommended)”.

## Tiến độ và bước tiếp theo

1. [x] Đọc Sprint, backlog, BR, schema, API conventions, code/menu/shift/POS liên quan; xác định missing spec và UI mock.
2. [x] Chuyển sang nhánh riêng, ghi baseline Git, plan và bảng AC trước khi code.
3. [x] Product Owner chốt bản nháp PB-07; chuyển thành `specs/sales.md`, bổ sung `table.read` cho GET bàn vì CASHIER cần đọc bàn nhưng không có `table.manage`.
4. [x] TDD backend migration/API/shift guard: migration, service/route invoice, item, transfer, cancel, permission `table.read`, chặn đóng ca khi còn OPEN invoice. TDD đỏ trên PostgreSQL sandbox rồi sửa. `npm test` backend cuối đạt 68/68; xem `qa-evidence/20261106-164601-91cf4a1-pb07-tdd-red-sandbox/backend-test.log` và `qa-evidence/20261106-170041-91cf4a1-pb07-backend-regression/backend-retest.log`.
5. [x] TDD UI và nối API: test sales client đỏ khi chưa có service, rồi thêm salesService và LivePosScreen, đổi App dùng màn POS thật cho bán hàng/bàn. Menu, bàn, OPEN orders, item, chuyển bàn, hủy đơn gọi API; POS thật không hiển thị payment/promotion mock. `npm test` UI cuối đạt 39/39, `npm run build` đạt. Browser/network/DB trên UI cuối tại `qa-evidence/20261106-175111-91cf4a1-pb07-qa/`.
6. [x] Review code 3 vòng: vòng 1 có 4 finding (branch ngưng làm kẹt cancel, khóa branch/table, UUID topping viết hoa, FK topping làm menu DELETE trả 500); đã thêm test và sửa. Vòng 2 có 1 finding UI mất phản hồi sau khi server commit; đã thêm test đỏ, sửa tải lại chi tiết/khóa ghi nếu recovery thất bại. Vòng 3 reviewer không thấy finding mới trong diff cuối. Backend `npm test` cuối 68/68 trên sandbox, log `qa-evidence/20261106-174110-91cf4a1-pb07-review1-green/backend-test.log.gz`; UI `npm test` cuối 39/39 và build đạt, log `qa-evidence/20261106-174949-91cf4a1-pb07-ui-review2/`. Các kết quả này là local.
7. [x] QA task độc lập hoàn tất: ma trận [AC → tình huống → artifact](../../qa-evidence/20261106-175111-91cf4a1-pb07-qa/matrix.md), [báo cáo từng AC](../../qa-evidence/20261106-175111-91cf4a1-pb07-qa/report.md), [lệnh và log](../../qa-evidence/20261106-175111-91cf4a1-pb07-qa/run.md). Agent chính đã mở lại báo cáo, xác minh mọi liên kết local tồn tại, giải nén log backend và đối chiếu 68/68, UI 39/39, build exit 0, kiểm tra request/response, DB và ảnh loading. Không phát hiện FAIL mới; QA sprint được thực hiện riêng sau mốc này.

**AC-1..9 cuối:** `PASS` ở tầng task, lần lượt ánh xạ S6-01..S6-09; chi tiết điều kiện, actual và artifact gốc theo từng mã tại [report.md](../../qa-evidence/20261106-175111-91cf4a1-pb07-qa/report.md). Không gán PASS cho tiêu chí sprint. **Hậu kiểm sau task:** QA cấp sprint riêng đã kết luận S6-01..09 PASS local theo `qa-evidence/20261107-001400-91cf4a1-sprint06-qa/report.md`; Product Owner đã yêu cầu đóng Sprint 6 ngày 07/11/2026. Bước tiếp theo còn lại là quyết định commit/push/CI riêng. **DB:** PostgreSQL 17 sandbox riêng trên loopback cổng 5433; Docker Desktop từng dừng giữa lượt test, log `review1-green.log` thất bại `ECONNREFUSED`; đã khởi động lại đúng container rồi chạy lại xanh, không dùng log thất bại môi trường để kết luận hành vi. **Lệnh đã chạy:** `git fetch origin`, `git status -sb`, `git switch -c feat/pb07-open-orders origin/master`, `npm test` tại `POS_API/` (TDD đỏ; sau review và QA 68 pass), `npm run build` tại `POS_API/` (đạt), `npm test` tại `POS_UI/` (TDD đỏ; sau review và QA 39 pass), `npm run build` tại `POS_UI/` (đạt), API/UI sandbox và các script manual liệt kê trong QA `run.md`, `git diff --check` (exit 0), `graphify update .` (AST graph; chạy lại sau artifact mới). **File đổi:** migration/entity/service/controller/test API, menu service, salesService/LivePosScreen/App/navigation/types/test UI, spec, sprint, plan/task, errors và qa-evidence; xem `git status --short` để có danh sách chính xác của working tree chưa commit.

## Finding review và bằng chứng sửa

- `errors/2026-11-06-pb07-inactive-branch-cancel.md`: AC-8; backend test và QA API/DB tại `manual-api.log`.
- `errors/2026-11-06-pb07-active-resource-race.md`: AC-1/2/7; integration lock test và QA race tại `manual-edge.log`, `manual-transfer.log`.
- `errors/2026-11-06-pb07-uppercase-topping.md`: AC-5; integration và QA tại `manual-api.log`.
- `errors/2026-11-06-pb07-sold-topping-delete.md`: AC-4/5; integration tại `backend-test.log.gz`.
- `errors/2026-11-06-pb07-lost-mutation-response.md`: AC-6; UI test và QA browser network error/loading.

Các tên log ngắn trong mục này đều thuộc `qa-evidence/20261106-175111-91cf4a1-pb07-qa/`, trừ log review được dẫn riêng ở tiến độ. Mọi bằng chứng là local do agent chạy trên working tree dirty, chưa có CI độc lập. Không commit/push trong task này.

## Danh sách file triển khai và kiểm tra cuối

- Backend thay đổi: `POS_API/src/app.module.ts`, `POS_API/src/auth/tests/auth.integration.test.ts`, `POS_API/src/database/data-source.ts`, `POS_API/src/foundation.test.ts`, `POS_API/src/menu/menu.service.ts`, `POS_API/src/organization/http/organization.controller.ts`, `POS_API/src/organization/tests/organization.acceptance.test.ts`, `POS_API/src/organization/tests/organization.integration.test.ts`, `POS_API/src/shifts/shifts.service.ts`.
- Backend thêm: `POS_API/src/database/migrations/20261106000000-Sales.ts`; `POS_API/src/sales/entities/invoice.entity.ts`, `invoice-item.entity.ts`, `invoice-item-topping.entity.ts`; `POS_API/src/sales/http/sales.dto.ts`, `POS_API/src/sales/sales.controller.ts`, `sales.module.ts`, `sales.service.ts`, `tests/sales.integration.test.ts`.
- Frontend thay đổi: `POS_UI/src/app/App.tsx`, `POS_UI/src/app/navigation.ts`, `POS_UI/src/types/auth.ts`, `POS_UI/test/shift-screen.test.mjs`; thêm `POS_UI/src/features/pos/LivePosScreen.tsx`, `POS_UI/src/services/salesService.ts`, `POS_UI/test/sales-service.test.mjs`.
- Hồ sơ: `.gitignore`, `specs/sales.md`, `sprints/sprint-06/SPRINT.md`, plan/task này, năm file `errors/2026-11-06-pb07-*.md`, và các run gốc dưới `qa-evidence/20261106-*-pb07-*/`. `docs/PRODUCT_BACKLOG.md` cùng `tasks/completed/2026-11-06-create-sprint-06.md` là thay đổi chưa commit có từ baseline trước task; không gộp là code PB-07.
- Kiểm tra cuối: `git diff --check` exit 0; `graphify update .` sau code mới thành công; semantic update giới hạn Markdown thay đổi thuộc task và backlog liên quan, merge và `graphify cluster-only .` thành công, query `S6-09` tìm thấy task/Sprint mới, `graphify-out/needs_update` không tồn tại. Graphify output được Git ignore. Không chạy lại test sau bước này vì chỉ thay Markdown và graph output; test QA đã chạy trên mã/UI cuối.
