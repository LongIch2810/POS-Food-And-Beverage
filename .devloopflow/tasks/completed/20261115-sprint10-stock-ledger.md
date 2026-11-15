---
id: 20261115-sprint10-stock-ledger
spec: .devloopflow/specs/20261115-sprint10-stock-ledger.md
plan: .devloopflow/approved/20261115-sprint10-stock-ledger.md
status: completed   # planning | in_progress | blocked | completed
owner: Claude Code
started_at: 2026-11-15
completed_at: 2026-11-16
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Task 20261115-sprint10-stock-ledger

Yêu cầu của user (nguyên văn, lệnh `/devloopflow:run`): "Tab Sổ kho (item 4, S10-11): chưa có spec, plan hay task. Cần kiểm trên app thật trước (API, DB, browser theo quyền và chi nhánh), rồi sửa phần thiếu nếu có."

Phạm vi: item 4 và tiêu chí S10-11 của `sprints/sprint-10/SPRINT.md` (:27, :42). PB-15 đã hủy (xem `sprints/sprint-10/SPRINT.md:56`), không thuộc task này. QA cấp sprint (item 5) là việc riêng sau task này.

## Trạng thái
- Bước hiện tại (số bước trong flow): 10 — đã đóng task sau review vòng 3 và verify-ac vòng 3.
- Đã xong: Bước 1 khám phá (explorer `haiku`; agent chính mở lại và xác nhận các điểm then chốt, xem mục Khám phá).
- Đang làm: Không có; task đã hoàn thành.
- Sắp làm: QA cấp Sprint 10 là việc riêng theo `sprints/sprint-10/SPRINT.md:28,42`; B-66/B-67 ở backlog chờ xử lý riêng.

## Khám phá (bước 1; nguồn kèm path:dòng)
Agent chính tự mở lại và xác nhận (không chỉ tin explorer):
- `POS_API/src/inventory/inventory.controller.ts:77-86`: `@Controller('api/v1/stock-movements')`, `@Get() @RequirePermission('inventory.view')`, gọi `noInput(request,true)` rồi `listMovements`.
- `POS_API/src/inventory/inventory.service.ts:29-37` (`branch()`): user có `branchId` thì dùng và từ chối `branchId` trong query (422); không có `branchId` thì nhận `branchId` query hoặc `null` (mọi chi nhánh của store). KHÔNG kiểm `branch.access_all`. `:234-260` `listMovements`: where theo `b.store_id` (+ branch/ingredient/type), `ORDER BY m.created_at DESC, m.id DESC`, DTO gồm id, branchId, ingredientId, ingredientName, unit, type, quantity, balanceAfter, invoiceId, note, createdAt (không có tên người tạo, không có `source`).
- `POS_UI/src/features/inventory/InventoryScreen.tsx:25-27` (identity key remount khi đổi phiên), `:61-70` (một `Promise.all` cho ingredients, stocks, movements; lỗi xóa cả ba), `:117-125` (cột Thời gian, Nguyên liệu, Loại, Thay đổi, Tồn sau, Ghi chú = `note || invoiceId || '—'`), `:151` (`emptyMessage="Chưa có bút toán kho"`), `:16-20` nhãn loại.
- `POS_UI/src/features/inventory/inventoryService.ts:10-21` `all()` lặp mọi trang `limit=100` không giới hạn trên; `:26` `movements(branchId?)`.
- `POS_UI/src/features/inventory/StockMovementsTab.tsx` (dùng mock, không được import ở đâu: `grep` chỉ thấy tự khai báo) — code chết.
- Ghi sổ: `POS_API/src/sales/sales.service.ts:374-389` (SALE), `:519-553` (`cancelPaid`, SALE_REVERSAL). Migration `POS_API/src/database/migrations/20261107000000-InventoryPromotions.ts:45-76` (bảng, index, trigger `apply_stock_movement`, trigger append-only). `inventory.view`/`inventory.manage` cấp cho OWNER và MANAGER (`:99-107`); `branch.access_all` chỉ OWNER (`20261030000000-Organization.ts:23,27`).
- Phần còn lại là trích của explorer, chưa mở lại từng dòng: `docs/BUSINESS_RULES.md` BR-42..47, BR-72 (:183-192); `docs/DESIGN_DB_POS_SYSTEM.md:549-565,639,680`; `docs/api-spec.md:459-461,490`; `.devloopflow/specs/inventory.md:16-25,58-60` (có chỗ lỗi thời: :19 "Sổ kho chỉ đọc trong Sprint 07", :60 "mảng rỗng trước PB-09", :68 trỏ `qa-evidence/` không tồn tại); `DESIGN.md:362,807`.
- Test hiện có: `POS_API/src/inventory/tests/inventory.integration.test.ts` (trigger, atomic balance, append-only, phân trang cursor), `inventory.http.test.ts:71` (chỉ POST `/stock-movements` 404), `POS_API/src/sales/tests/cancel-paid.integration.test.ts`, `payment.integration.test.ts` (mức DB). KHÔNG có test HTTP `GET /stock-movements` (quyền, cross-store, lọc, hiển thị SALE/SALE_REVERSAL) và KHÔNG có test UI cho tab Sổ kho.
- Không có: spec/plan/task riêng cho Sổ kho; bằng chứng browser/DB chạy thật; `qa-evidence/`.
- Errors liên quan (explorer đọc INDEX, agent chính đã đọc quy tắc của 3 file): `20261110-backlog-branch-scope-null-branchid-fail-open.md` (quy tắc: "Mọi kiểm tra phạm vi chi nhánh phải chặn khi thiếu `branchId` và không có `branch.access_all`"), `20261110-branch-scope-http-test-missing.md` ("Phạm vi store/branch phải được kiểm qua HTTP ở từng endpoint"), `2026-10-30-pb13-tab-row-shape.md` (gắn rows với view khi đổi tab); còn `20261109-owner-access-all-branch-scope.md`, `2026-10-29-auth-revoked-session-ui.md`, `20261114-react-strictmode-mounted-ref-stuck-false.md`, `20261114-backlog-stale-list-test-settled-request.md` chưa mở.
- MEMORY liên quan (id): M-1 (kiểm phạm vi chi nhánh ở mọi điểm vào), M-11 (UI đổi tab/filter, state danh sách), M-12/M-13 (đổi phiên/identity), M-34 (môi trường docker/DB), M-36 (giải thích bằng lời thường), M-37 (tái dùng hành vi có sẵn; kiểm xác nhận hành vi hiện tại, báo kết quả thật), M-39 (nghiệm thu tablet/ma trận AC–chứng cứ), M-41 (UI và API dùng cùng điều kiện quyền), M-46 (gọi skill caveman/ponytail, đưa quy tắc vào prompt subagent).
- Môi trường: lúc khám phá Docker daemon không chạy (`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`), `curl http://localhost:3000/api/v1/health` không có phản hồi. Chưa kiểm app thật.

## File đã thay đổi
| Path | Thay đổi gì | Sub-task |
|------|-------------|----------|
| (chưa có) | | |

## Đã đọc errors
- Chưa đọc cho sub-task nào (chưa có plan).

## Lịch sử review (chỉ thêm, không xoá)
- Chưa review.
- 2026-11-15, vòng 1, `code-reviewer` `gpt-6.1-sol`: PASS; không có finding Critical/High/Medium, không có AC triển khai ST-1..ST-10 hoặc RF-1..RF-5 thiếu code/test. E2E-AC-1..14 cần nghiệm thu riêng. Một finding Low đã ghi nguyên văn tại `.devloopflow/review/backlog.md` B-60. Reviewer báo API `npm test` 256 pass, 0 fail, 0 skip; UI typecheck, build, 213 test, browser 8 test và audit thành công. Các kết quả này do reviewer chạy, agent chính chưa chạy lại trong phiên resume.
- 2026-11-15, vòng 1 (lượt thứ hai, `code-reviewer` Claude `sonnet`, context sạch): CHANGES_REQUIRED. Chạy lại: API 256 pass; UI typecheck sạch, 213 pass, browser 8 pass; audit 0 lỗ hổng. Finding Medium R1-1 (nguyên văn): `POS_UI/src/features/settings/SettingsScreen.tsx:162` (+ :164, :181, :235, :335) — Back trong lúc editor hoặc confirmation đang mở không đóng chúng. Effect `[tab]` chỉ gọi `navigate({tab,...})` và đổi `view.tab`; `setEditor(null)` và `setConfirmation(null)` không được gọi. Dialog sửa "Bàn" vẫn hiện trên danh sách "Chi nhánh"; lưu xong thì `refresh()` (:164) tăng revision của `view.tab` hiện tại, không phải danh sách đang sửa; `confirmation.tab` (:235) mang tab cũ nên thao tác xác nhận chạy trên dòng của tab khác. Đề xuất fix: trong effect `[tab]` gọi `setEditor(null); setConfirmation(null); setFieldErrors({}); setFormError('')`. Test tái hiện đề xuất: `test_ST7_AC7_back_dong_editor_khi_doi_tab` trong organization-screen.test.mjs (mount `SettingsContent` tab `tables`, mở editor, `setProps({tab:'branches'})`; mong đợi `editor()` undefined, Dialog `isOpen` false). Finding Low R1-2..R1-5 đã ghi `.devloopflow/review/backlog.md` B-61..B-64. Lưu ý: lượt review `gpt-6.1-sol` ở trên PASS không thấy R1-1; R1-1 cần sửa qua TDD trước khi đóng task.
- 2026-11-15, vòng sửa 1 (`tdd` sonnet) cho R1-1: test Red `[R1-1]` x2 (`test_ST7_AC7_back_dong_editor_khi_doi_tab`, `test_ST7_AC7_back_dong_confirmation_khi_doi_tab`) fail đúng lý do (editor/confirmation còn mở sau `setProps({tab:'branches'})`); fix trong effect `[tab]` của `SettingsScreen.tsx`: `setEditor(null); setConfirmation(null); setFieldErrors({}); setFormError('')`. Agent chính chạy lại: UI typecheck sạch, `npm test` 215 pass 0 fail; `tdd` báo build OK, browser 8/8. errors: `.devloopflow/errors/20261115-settings-back-leaves-editor-open.md`. Chưa gọi review vòng 2.

- 2026-11-16, vòng review 2, `code-reviewer` `gpt-6.1-sol`: PASS; R1-1 đã sửa đúng (`SettingsScreen.tsx:161`, hai test `[R1-1]` xanh), hồ sơ `errors/20261115-settings-back-leaves-editor-open.md` đủ nội dung; B-60..B-64 đã đối chiếu sửa, test và hồ sơ. Quét lại diff source/test, file mới, dependency và tài liệu trong phạm vi task; không có finding Critical/High/Medium. UI typecheck, build, 219/219 test, browser Sổ kho/router 8/8, audit 0 lỗ hổng. API `npm test` build và hai file mới (`session-branch-name.http.test.ts` 5 subtest, `stock-movements.http.test.ts` 7 subtest) đạt; reviewer chưa có tổng kết full suite trong lượt này. AC chưa phủ bắt buộc: không phát hiện; không nghiệm thu lại app thật. Finding Low R2-1 ghi nguyên văn ở `.devloopflow/review/backlog.md` B-65: `POS_UI/src/features/inventory/InventoryScreen.tsx:46` — dialog của tab cũ vẫn mở sau Back sang tab kho khác; phạm vi sửa Hẹp. Đã đối chiếu errors: `20261115-settings-back-leaves-editor-open.md`, `20261115-browser-router-fixed-wait.md`, `20261115-inventory-catalog-reloads-on-branch-change.md`, `20261115-pos-open-table-stale-navigation-callback.md`, `20261115-products-tabs-missing-aria-current.md`, `20261115-rail-and-routes-disagree-on-permissions.md`, `20261110-backlog-branch-scope-null-branchid-fail-open.md`, `20261110-branch-scope-http-test-missing.md`, `20261109-owner-access-all-branch-scope.md`, `2026-10-30-pb13-tab-row-shape.md`, `2026-10-30-pb13-active-tab-loading.md`, `2026-10-29-auth-revoked-session-ui.md`, `20261114-react-strictmode-mounted-ref-stuck-false.md`.

- 2026-11-16, vòng review 3, `code-reviewer` `gpt-6.1-sol`: PASS, không có Critical/High/Medium. R2-1/B-65 đã sửa đúng tại `InventoryScreen.tsx:52`, hai test `[B-65]` và hồ sơ `errors/20261116-inventory-dialog-persists-after-tab-change.md` đủ; R1-1/B-61..B-64 vẫn có code/test/hồ sơ. Quét lại toàn bộ file thay đổi trong phạm vi task, đối chiếu 14 file errors liên quan. Reviewer tự chạy UI typecheck/build, `npm test` 221/221, audit 0 lỗ hổng; API build và hai file HTTP mới 14/14. Browser toàn bộ 7/8 do BR-5 lệch pathname trước đăng xuất, chạy riêng BR-5 1/1; không có bằng chứng lỗi sản phẩm về quyền/đổi phiên. Hai finding Low đã ghi nguyên văn tại `.devloopflow/review/backlog.md` B-66 (R3-1 dialog Thực đơn cũ còn mở khi đổi tab), B-67 (R3-2 helper browser còn race). Reviewer chưa nghiệm thu lại E2E trên app Docker thật và chưa chạy lại toàn bộ API; agent chính đã chạy API 256/256 và UI 221/221, browser 8/8 sau B-65 ở lượt fix-backlog 2026-11-16. Không có AC triển khai ST-1..ST-10/RF-1..RF-5 bị phát hiện thiếu code/test.

## Lịch sử kiểm AC (chỉ thêm, không xoá)
- Sổ FAIL (để làm việc sau): `.devloopflow/verify/20261115-sprint10-stock-ledger/fails.md`
- Chưa kiểm AC.
- 2026-11-15: verify-ac vòng 1 FAIL; báo cáo `.devloopflow/verify/20261115-sprint10-stock-ledger/report-1.md`, hai mục mở V1-1 (fixture) và V1-2 (tài liệu), chi tiết và chứng cứ trong sổ FAIL. Verifier ghi 66 ST AC đạt, 11/14 E2E đạt, không tái hiện lỗi production; API 256, UI 213, browser 8 pass theo log evidence. Hash bốn tài khoản thử được khôi phục và xác minh theo `evidence/r1-cleanup.json`. Hai chi nhánh thử ZA10/ZĐ1 được tạo theo E2E-AC-11, giữ lại.
- 2026-11-15: user chọn V1-1 `ZA1,ZA2,ZA3`, V1-2 "cập nhật tài liệu theo nội dung đã nêu trong sổ FAIL". Đã đổi tên đúng ba chi nhánh của store thử trong một transaction, đối chiếu code, id, store và tên cũ; truy vấn sau COMMIT xác nhận code/name `ZA1/ZA1`, `ZA2/ZA2`, `ZA3/ZA3`. Đã cập nhật `.devloopflow/specs/auth.md`, `docs/architecture/auth.md`, `docs/architecture/TECH_STACK.md` theo V1-2; chưa chạy verify-ac lại và không tự đổi trạng thái FAIL.
- 2026-11-15: verify-ac lần 2 PASS V1-1 và V1-2; E2E-AC-1, E2E-AC-6, E2E-AC-11 đạt; không chạy lại 77 AC còn lại. Báo cáo `.devloopflow/verify/20261115-sprint10-stock-ledger/report-2.md`; sổ FAIL không còn mục mở. Hash và cờ của hai tài khoản thử đã được khôi phục, xác minh trong evidence.
- 2026-11-16: verify-ac vòng 3 PASS trong phạm vi ST-6.AC-11, ST-10.AC-2, ST-10.AC-5 và exploratory B-65 sau sửa; báo cáo `.devloopflow/verify/20261115-sprint10-stock-ledger/report-3.md`, raw evidence `evidence/r3-*`. UI container đã rebuild và hash `InventoryScreen.tsx` khớp working tree; unit 3/3, browser 2/2, build exit 0; dialog Kho đóng sau Back và không tự mở lại khi Forward trên app thật. 77 AC khác không chạy lại, giữ kết quả mới nhất từ report-1/report-2; đổi phiên API/DB thật không chạy lại do không có mật khẩu fixture, ST-10.AC-5 dùng fetch giả theo plan. Sổ FAIL không có mục `mở`.
- 2026-11-16: sau QA cấp sprint, V1-2/B-66 (dialog Thực đơn còn mở sau Back) đã được subagent `tdd` sửa ở `ProductsScreen.tsx`; chín test `[V1-2/B-66]` trong `products-tabs.test.mjs` đỏ trước/xanh sau, browser Back/Forward trong `stock-ledger-router.browser.mjs` xanh. Hồ sơ `.devloopflow/errors/20261116-products-dialog-persists-after-tab-change.md`. B-67: helper `backAfterSwitch` chờ thêm tab Tồn kho render; BR-5/BR-5b xanh 2/2 trước/sau, hồ sơ `.devloopflow/errors/20261115-browser-router-fixed-wait.md`. Agent chính tự chạy UI 230/230, browser 34/34, typecheck/build exit 0, API 256/256. QA cấp sprint V1-2 vẫn `mở` trong `.devloopflow/verify/20261116-sprint10-qa/fails.md` tới khi verifier kiểm lại; không thay kết quả QA lịch sử của task này.

## Cập nhật tài liệu (sync-docs, bước 10b; chỉ thêm, không xoá)
- Chưa đến bước 10b.
- 2026-11-15: xử lý V1-2 theo yêu cầu user: `.devloopflow/specs/auth.md` bổ sung `SessionUser.branchName` và ví dụ login/me; `docs/architecture/auth.md` bổ sung `branchName` cho response phiên; `docs/architecture/TECH_STACK.md` bổ sung `react-router-dom` 7.18.5 và trạng thái API Báo cáo/Sổ kho. Đã đối chiếu source; còn cần soát các tài liệu khác ở bước 10b.
- 2026-11-15: sync-docs D-1..D-3 đã sửa `.devloopflow/devloopflow.md`: API test 224/224 → 256/256, UI test 143/143 → 219/219, thêm browser Sổ kho/router 8/8; nguồn là lệnh local đã chạy trong phiên. D-4..D-8 (README, AGENTS/CLAUDE, spec Kho) đã lập đề xuất, chờ user duyệt từng chỗ; chưa ghi các tài liệu đó.
- 2026-11-16: user nói nguyên văn "duyệt" để duyệt các đề xuất D-4..D-7 đã trình ở lượt sync-docs trước. Đã sửa D-4 `README.md:10` (Báo cáo/Sổ kho dùng API, link report-2), D-5 `README.md:13` (backend Báo cáo có trong working tree, chưa tích hợp master), D-6 `AGENTS.md:29` và `CLAUDE.md:29` (router `react-router-dom`, `routes.ts`), D-7 `AGENTS.md:30` và `CLAUDE.md:30` (bỏ mô tả mock của Báo cáo/Sổ kho). Kiểm `git diff --check -- README.md AGENTS.md CLAUDE.md` exit 0; hai dòng chung của AGENTS/CLAUDE khớp nguyên văn. D-8 `.devloopflow/specs/inventory.md` vẫn chưa sửa: là spec đã duyệt, cần quy trình duyệt thay đổi spec riêng; không suy từ lời duyệt D-4..D-7.

- 2026-11-16: sync-docs sau B-65 — D-9 đã sửa `.devloopflow/devloopflow.md:24` (UI `npm test` 219/219 ngày 15/11 → 221/221 ngày 16/11; lệnh, exit 0 từ lượt kiểm của agent chính), cập nhật ngày ở dòng 4 và lịch sử ở dòng 100. D-10 `docs/PRODUCT_BACKLOG.md:7` và D-11..D-15 `sprints/sprint-10/SPRINT.md:3,24-27` là đề xuất sửa trạng thái tài liệu dự án, chưa sửa, chờ user duyệt đúng từng chỗ theo skill sync-docs. D-8 `.devloopflow/specs/inventory.md` vẫn chưa sửa vì là spec đã duyệt, cần quy trình duyệt thay đổi spec riêng.
- D-10 (chờ duyệt), `docs/PRODUCT_BACKLOG.md:7`: thay câu `Đã có spec và plan cho lát cắt PB-12/PB-13 (`.devloopflow/specs/20261114-sprint10-reports.md`); chưa có spec/plan hoặc QA cho tab Sổ kho; tab Sổ kho hiện đã gọi API theo source.` bằng `Đã có spec, plan và kiểm AC local cho Báo cáo (`.devloopflow/specs/20261114-sprint10-reports.md`) và Sổ kho (`.devloopflow/specs/20261115-sprint10-stock-ledger.md`); task Sổ kho còn mở sau B-65, chờ QA cấp sprint.` Nguồn: task Báo cáo completed, task Sổ kho active, verify Sổ kho report-1/report-2 và code `InventoryScreen.tsx`.
- D-11 (chờ duyệt), `sprints/sprint-10/SPRINT.md:3`: thay câu `Chưa có spec/plan triển khai, code hoặc QA cho Sprint 10.` bằng `Đã có spec/plan và code cho Báo cáo, Sổ kho; task Báo cáo đã đóng, task Sổ kho còn mở; QA cấp sprint chưa thực hiện.` Nguồn: hai task, hai spec, hai approved plan; các ô S10 vẫn ☐ theo cổng QA cấp sprint ở dòng 32.
- D-12 (chờ duyệt), `sprints/sprint-10/SPRINT.md:24`: trạng thái item 1 `Chưa bắt đầu` → `Đã có spec/plan; chờ QA cấp sprint`. Nguồn: `.devloopflow/specs/20261114-sprint10-reports.md`, `.devloopflow/approved/20261114-sprint10-reports.md`.
- D-13 (chờ duyệt), `sprints/sprint-10/SPRINT.md:25`: trạng thái item 2 `Chưa bắt đầu` → `Đã triển khai, task Báo cáo đã đóng; chờ QA cấp sprint`. Nguồn: `.devloopflow/tasks/completed/20261114-sprint10-reports.md`, `POS_API/src/reports/`.
- D-14 (chờ duyệt), `sprints/sprint-10/SPRINT.md:26`: trạng thái item 3 `Chưa bắt đầu` → `Đã triển khai, task Báo cáo đã đóng; chờ QA cấp sprint`. Nguồn: `.devloopflow/tasks/completed/20261114-sprint10-reports.md`, `POS_UI/src/features/reports/DailyReportScreen.tsx`.
- D-15 (chờ duyệt), `sprints/sprint-10/SPRINT.md:27`: trạng thái item 4 `Chưa bắt đầu` → `Đã triển khai và kiểm AC local; task Sổ kho còn mở; chờ QA cấp sprint`. Nguồn: `.devloopflow/verify/20261115-sprint10-stock-ledger/report-1.md`, `report-2.md`, `.devloopflow/tasks/active/20261115-sprint10-stock-ledger.md`.
- 2026-11-16: user nói nguyên văn “duyệt” sau khi nhận đề xuất D-10..D-15. Đã sửa đúng câu thay thế đã trình và mở lại từng dòng để xác nhận:
  - D-10: đã sửa `docs/PRODUCT_BACKLOG.md:7` — Sprint 10 có spec, plan và kiểm AC local cho Báo cáo/Sổ kho; task Sổ kho còn mở.
  - D-11: đã sửa `sprints/sprint-10/SPRINT.md:3` — trạng thái Sprint 10 phản ánh task Báo cáo đã đóng, task Sổ kho còn mở, QA cấp sprint chưa thực hiện.
  - D-12: đã sửa `sprints/sprint-10/SPRINT.md:24` — item 1 đã có spec/plan, chờ QA cấp sprint.
  - D-13: đã sửa `sprints/sprint-10/SPRINT.md:25` — item 2 đã triển khai, task Báo cáo đã đóng, chờ QA cấp sprint.
  - D-14: đã sửa `sprints/sprint-10/SPRINT.md:26` — item 3 đã triển khai, task Báo cáo đã đóng, chờ QA cấp sprint.
  - D-15: đã sửa `sprints/sprint-10/SPRINT.md:27` — item 4 đã triển khai và kiểm AC local, task Sổ kho còn mở, chờ QA cấp sprint.
  - Item 5 vẫn `Chưa bắt đầu`, các ô nghiệm thu S10 vẫn ☐ vì chưa có QA cấp sprint. `git diff --check -- docs/PRODUCT_BACKLOG.md sprints/sprint-10/SPRINT.md` exit 0. D-8 spec Kho vẫn chưa sửa.
- 2026-11-16: kiểm lại D-8 sau câu hỏi của user “giờ làm sao”: bỏ qua D-8, không sửa `.devloopflow/specs/inventory.md`. Đây là hợp đồng lịch sử Sprint 07, ghi rõ “trong Sprint 07” và “trước PB-09” tại dòng 19, 60; `AGENTS.md:135` yêu cầu hồ sơ lịch sử giữ nguyên byte. Hành vi Sprint 10 có spec hiện hành `.devloopflow/specs/20261115-sprint10-stock-ledger.md`. Nhận định trước đó “cần quy trình duyệt thay đổi spec riêng” không còn áp dụng cho D-8; không chờ duyệt sửa file lịch sử này.
- 2026-11-16: sync-docs đã xong: D-1..D-7 và D-9..D-15 đã sửa theo lịch sử và duyệt của user; D-8 bỏ qua vì spec Sprint 07 là hợp đồng lịch sử. Các ô QA cấp sprint giữ nguyên ☐.

## Kinh nghiệm đã ghi (reflect, bước 10c; chỉ thêm, không xoá)
- Chưa đến bước 10c.
- 2026-11-15: reflect cập nhật M-38 (bảng Tổng hợp và Chi tiết backlog phải khớp; B-60..B-64 từng thiếu dòng bảng), M-41 (rail và route phải dùng cùng điều kiện quyền; B-63), thêm M-47 (đối chiếu tên fixture với AC trước browser; V1-1). Nguồn chi tiết trong `.devloopflow/MEMORY.md`.

## Blocked
- Lý do: Không còn blocked sau verify-ac lần 2.
- Lỗi còn lại: Không có mục mở trong sổ FAIL.
- Đề xuất: Tiếp tục các bước đóng task theo flow.

## Quyết định của user và môi trường (2026-11-15)
- User chọn (AskUserQuestion): "Tôi chạy lệnh bật, bạn chỉ cho Docker Desktop" và "Cửa hàng thử mới trong DB local (Recommended)".
- Đã làm: khởi động `Docker Desktop.exe` bằng lệnh; `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait` làm `pos_api` thoát (1): `password authentication failed for user "pos_local"` khi chạy migration, vì `POSTGRES_PASSWORD` trong `POS_INFRA/.env.local` (tạo 2026-10-28) khác mật khẩu DB thật (khớp `DATABASE_URL` trong `POS_API/.env`, 2026-11-10; so sánh bằng hash, không in giá trị). Cách xử lý: chạy lại compose với biến môi trường `POSTGRES_PASSWORD` lấy từ `POS_API/.env` trong shell (không ghi ra file). Kết quả: `GET http://localhost:3000/api/v1/health` → `{"data":{"status":"ok"}}`, `pos_api` healthy, `pos_ui` healthy, `pos_infra-postgres-1` healthy.
- Cần ghi nhớ: `POS_INFRA/.env.local` lệch mật khẩu với DB local (chưa sửa; ngoài phạm vi, báo user cuối task).
- Image `pos_api` build lúc 2026-11-15 sau khi gỡ PB-15, từ working tree có thay đổi báo cáo chưa commit.

## Kết quả kiểm app thật và quyết định (2026-11-15)
- Subagent sonnet kiểm hiện trạng trên app thật (store thử `ZZ-TEST-SOKHO-20261115` và `...-B`): báo cáo `.devloopflow/verify/20261115-sprint10-stock-ledger/current-state.md`, bằng chứng thô ở `evidence/`. Kết luận của báo cáo: 5 vế S10-11 đạt về hành vi; Medium M1 (không có cột chi nhánh khi xem "Tất cả chi nhánh"), M2 (Ghi chú hiện UUID hóa đơn); Low L1..L5; Very Low V1..V3; không có Critical/High. Agent chính đã tự đối chiếu M1, M2 với code (`inventory.service.ts:256-259`, `InventoryScreen.tsx:134`) và dữ liệu DB (`invoice_code` dạng `HD...`).
- User (2026-11-15), nguyên văn: "sửa" — trả lời câu "Có sửa 2 chỗ trên không? ... hay giữ nguyên và coi như Sổ kho đã xong?". Phạm vi sửa: M1 và M2 (L1..L5, V1..V3 vào backlog).
- Spec viết `.devloopflow/specs/20261115-sprint10-stock-ledger.md`; `spec-reviewer` (sonnet) đọc thử một lần: CẦN SỬA (nhẹ); đã sửa theo nhận xét, ghi changelog trong spec.
- User chưa nói bỏ qua spec (agent đã đề xuất bỏ, user chỉ trả lời "sửa") nên giữ bước spec.

## Mở rộng phạm vi theo user (2026-11-15)
- User nguyên văn: "Không làm: nút "Thử lại" 36px, câu báo lỗi mất mạng, tiêu đề của quản lý, F5 về Cài đặt, tải ba API khi mở Kho, thứ tự dòng cùng giao dịch, dấu "+", và xóa file mock chết. Các mục này vào backlog. / làm luôn".
- Hai quyết định thêm (AskUserQuestion): F5 → "Đặt tên màn lên địa chỉ web"; thứ tự dòng cùng thời điểm → "Giữ cách xếp, chỉ sửa thứ tự chi nhánh trong ô chọn (Recommended)".
- Spec được viết lại với phạm vi M1, M2, L1..L5, V1 (phần ô chọn), V2 (dấu "+"), V3 (xóa `StockMovementsTab.tsx`); chưa cho `spec-reviewer` đọc lại (quy trình: một lần). Chờ user "duyệt spec". Chưa viết plan, chưa viết code, chưa xóa file.
- Hệ quả: không còn mục Low/Very Low nào của khảo sát đưa vào backlog, ngoại trừ phần "thứ tự dòng cùng thời điểm" và "thông điệp 422 / `details: []`" (nằm trong Phi mục tiêu).

## Đổi hướng L4: router thật (2026-11-15)
- User nguyên văn: "Dùng router cho từng tab phải dùng router". Hai câu hỏi (AskUserQuestion): phạm vi → "Tab chính và mọi tab con (Recommended)"; kiểu địa chỉ → "Địa chỉ sạch /kho/so-kho (Recommended)".
- Bối cảnh đã kiểm: `POS_UI/package.json` chưa có router (chỉ react, react-dom, lucide-react); UI chạy Vite dev server trong Docker (`POS_UI/Dockerfile`: `npm run dev`; `POS_UI/vite.config.ts` proxy `/api`); các nơi dùng state tab: `POS_UI/src/app/App.tsx:53`, `InventoryScreen.tsx:39`, `LivePosScreen.tsx:33`, `PosScreen.tsx:37`, `SettingsScreen.tsx:56` (và state `section` ở `SettingsScreen.tsx:40`).
- Spec đã cập nhật (changelog cùng ngày): dùng `react-router-dom` BrowserRouter; dependency mới + cập nhật `docs/architecture/TECH_STACK.md`; harness test `node:vm` cần cập nhật. Chưa qua `spec-reviewer` lần nữa. Chờ user "duyệt spec".

## Plan nháp (2026-11-15)
- `planner` (opus) viết `.devloopflow/plans/draft/20261115-sprint10-stock-ledger.md` (10 sub-task ST-1..ST-10, 14 E2E-AC). Hai câu hỏi của planner, user trả lời (AskUserQuestion, nguyên văn): ô chọn chi nhánh → "Xếp theo chữ thuần"; thu ngân và `/thuc-don/*` → "Chặn, chuyển về Bán hàng". Planner cập nhật plan; Kiểm tra sẵn sàng 14/14 đạt.
- Agent chính đã kiểm: đọc mục Khám phá, Quyết định, Giả định, Phạm vi, Thiết kế, bảng 19 địa chỉ, API contract, AC tổng, Review Focus, Rủi ro, Lệnh, Tài liệu cần cập nhật, Câu hỏi mở và Kiểm tra sẵn sàng; chưa đọc từng dòng phần chi tiết sub-task ST-1..ST-10 và ma trận AC ↔ test. Đã đối chiếu code: `navigation.ts:30` (tab `products` hiện cho `menu.read`), `AppShell.tsx:121` (rail chỉ `menu.manage||product.manage`), `App.tsx:107` (chốt chặn), `AuthContext.tsx:54-62`, `auth.service.ts:43-59`; `npm view react-router-dom@7.18.5` → phát hành 2026-10-27.
- User duyệt plan ("duyệt plan", 2026-11-15); plan chuyển `plans/active/`, bản duyệt `approved/`.

## ST-5: xong (2026-11-15, tdd sonnet; agent chính tự kiểm lại)
- File: `POS_UI/src/app/routes.ts` (mới, module thuần 19 địa chỉ + `LOGIN_PATH`, `pathFor`, `resolveRoute`), `navigation.ts` (+`canOpenProducts`, tab `products` dùng hàm này), `AppShell.tsx` và `App.tsx` (dùng `canOpenProducts`; AccessDenied đổi câu theo plan), `test/app-routes.test.mjs` (8 test, mới), `test/app-shell-products.test.mjs` (1 test, mới), `test/app-invoices-shell.test.mjs` (chỉ thêm mock `canOpenProducts`, không đổi assert).
- Red nguyên văn: `# tests 8 # pass 0 # fail 8` (khung `routes.ts` rỗng); AC-8 đỏ `CASHIER không render ProductsScreen` (actual `type: 'ProductsScreen'`); phần rail của AC-8 xanh ngay (rail đã dùng cùng điều kiện, ST-5 chỉ đổi nguồn). Đột biến 15, 14 bắt ngay; 1 sống sót → thêm `test_ST5_AC5_pathFor_sub_khong_thuoc_tab_ve_mac_dinh`.
- Agent chính chạy lại: `npm run typecheck` sạch; UI `npm test` 175 pass 0 fail (trước 166). Sửa lại 1 ký tự khoảng trắng tdd lỡ đổi ở `navigation.ts:11` (`ReportScope ='all'` về `ReportScope = 'all'`).
- Đã đọc errors: INDEX, `20261114-ui-report-tab-shown-without-access-all.md`; MEMORY M-11,12,13,41 (M-28, M-37, M-46 chỉ dòng chỉ mục). tdd không dùng `graphify query`, không gọi skill caveman/ponytail bằng công cụ Skill (nạp qua hook).

## ST-1: xong (2026-11-15, tdd sonnet; agent chính tự kiểm lại)
- File: `POS_API/src/inventory/inventory.service.ts` (`listMovements`: +`b.name AS branch_name`, +`LEFT JOIN invoices inv ON inv.id=m.invoice_id AND inv.branch_id=m.branch_id`, DTO +`branchName`, +`invoiceCode ?? null`), `POS_API/src/inventory/tests/stock-movements.http.test.ts` (mới: 1 test cha, 7 subtest ST1-AC1..AC7).
- Red nguyên văn: AC1,2,4,5,6 đỏ `+ undefined - 'Chi nhánh Bắc'` / `'HDS10A0001'` / `null`; AC3 (phân trang) và AC7 (lọc) xanh ngay (khóa hành vi hiện có, plan ghi không đổi). Agent chính chạy lại: build + `npm test` API 250 pass 0 fail (trước 242). Đột biến 4/4 bắt (bỏ `inv.branch_id=m.branch_id` → AC6 đỏ, LEFT JOIN→JOIN → 7 đỏ...).
- Đã đọc errors: INDEX + 3 file branch-scope; MEMORY M-1,4,10,34,37 (chỉ dòng); không mở spec/task.

## ST-4: xong (2026-11-15, tdd sonnet; agent chính tự kiểm lại)
- File: `POS_UI/src/http/client.ts` (catch `fetch`: GET → "Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại."; method khác giữ câu cũ), `POS_UI/test/http-client-network.test.mjs` (mới, 2 test). Lưu ý: `client.ts` còn `GENERIC_ERROR_MESSAGE` do task Báo cáo thêm trước đó (không phải của ST-4).
- Red: `Caught error: Error: Chưa xác nhận được kết quả...` (AC-1); AC-2 xanh ngay (bảo vệ giữ câu cũ cho ghi; đột biến M2 chứng minh). Agent chính chạy lại: `npm run typecheck` sạch, UI `npm test` 177 pass 0 fail (trước 175). Đột biến 4/4 bắt.
- Test cũ kiểm câu lỗi mạng (`shift-service.test.mjs:205`, `shift-expense.test.mjs:156`) là POST nên giữ nguyên, xanh.
- tdd đã chạy `graphify update .` (báo cập nhật xong).

## ST-2: xong (2026-11-15, tdd sonnet; agent chính tự kiểm lại)
- File: `POS_API/src/auth/auth.service.ts` (+`SessionUser extends UserSummary { branchName }`, `sessionUser()`; `login`/`me`/`refresh` trả `SessionUser`; `summary()` và `authorizeAccess()` giữ nguyên), `POS_API/src/auth/http/auth.dto.ts` (`UserSummaryDto.branchName`), `POS_API/src/auth/tests/session-branch-name.http.test.ts` (mới: test cha + ST2-AC1..AC5). Không phải sửa literal `UserSummary` trong test cũ.
- Red nguyên văn: AC1..4 đỏ `+ undefined - 'Chi nhánh Bắc'`/`null`/`'Chi nhánh Bắc mới'`; AC5 xanh ngay (hồi quy). Agent chính chạy lại: build + `npm test` API 256 pass 0 fail (trước 250). Đột biến 4/5 bắt; M4 (bỏ nhánh `!branch_id`) tương đương hành vi (`WHERE id=NULL` → null).
- Đã đọc: plan ST-2, INDEX, `2026-10-29-auth-revoked-session-ui.md`, MEMORY M-1,4,10,12,19,34,37,46, tdd.md, writing-good-tests.md; có chạy `graphify query`.

## ST-3, ST-6, ST-7, ST-9: xong (2026-11-15; agent chính tự kiểm lại)
- ST-3 (tdd sonnet): `POS_UI/src/auth/client.ts` (`AuthUser.branchName?`), `auth/session.ts` (`toUiSession` → `branch_name`), `components/common/AppShell.tsx` (`session.branch_name || (canSwitchBranch ? 'Tất cả chi nhánh' : 'Chi nhánh')`), `test/session-branch-title.test.mjs` (5 test). Red: AC-1 `+ undefined - 'Chi nhánh Bắc'`, AC-3 falsy; AC-2/4/5 xanh ngay (hành vi có sẵn; đột biến chứng minh bắt được). Đột biến 4/4.
- ST-6 (tdd sonnet): `features/inventory/InventoryScreen.tsx`, `inventoryService.ts` (`Movement` +`branchName`, +`invoiceCode`), `test/inventory-screen.test.mjs` (15 test). Red 2 pass 11 fail (AC-2, AC-4 xanh ngay do mã cũ tải cả ba tab); đột biến 10/10 sau khi thêm 2 test (AC-10b, AC-10c). Ô chọn chi nhánh `localeCompare(b.name,'vi')` không numeric. Không đụng `ui.css`: nút "Thử lại" không còn `minHeight: 36`; đo 48px ở ST-10. tdd không mở `tdd.md`/`writing-good-tests.md`/spec (ghi nhận).
- ST-7 (tdd sonnet): `LivePosScreen.tsx` (props `activeTab`, `onTabChange`, `initialInvoiceId`; `activeTab ?? ownTab`), `ProductsScreen.tsx` (`tab`, `onTabChange`), `SettingsScreen.tsx` (`SettingsScreen({tab,onTabChange}={})`, `SettingsContent`), `App.tsx` (bỏ prop cũ của `LivePosScreen` ở 3 chỗ; thêm state tạm `posTab` 'menu'|'orders' để "Đơn đang mở" không bị ép về menu — lệch plan, ST-8 thay bằng router), test `shift-screen.test.mjs` (+AC-1..3), `organization-screen.test.mjs` (`mount` thêm tham số mặc định; +AC-5, AC-6), `products-tabs.test.mjs` (mới, AC-4). Red: 5 fail, AC-3 xanh ngay (hành vi cũ). Đột biến 11, 2 sống sót ban đầu được bổ sung assert rồi bắt. Test cũ không đổi assert (`live-payment.test.mjs`, `SettingsScreen()` không props).
- ST-9 (agent chính, user đã yêu cầu xóa): `grep -rn "StockMovementsTab" POS_UI/src POS_UI/test` trước xóa = chỉ chính file; `git status` file không có thay đổi chưa commit, file được Git theo dõi (khôi phục được); đã xóa `POS_UI/src/features/inventory/StockMovementsTab.tsx`; sau xóa grep = 0 dòng.
- Agent chính chạy lại sau ST-7 + ST-9: `npm run typecheck` sạch; UI `npm test` 203 pass 0 fail (trước 177); `npm run build` OK.

## ST-8: xong (2026-11-15, tdd sonnet; agent chính tự kiểm lại)
- File: `POS_UI/package.json` (`"react-router-dom": "7.18.5"` ghim), `package-lock.json` (+react-router-dom, react-router 7.18.5, cookie 1.1.1, set-cookie-parser 2.7.3), `src/app/App.tsx` (BrowserRouter; `go()`; effect `navigate(route.path, {replace:true, state:{owner}})`; key theo `session.user.id`; xóa state tạm `posTab`/`posProps`), `test/app-router.test.mjs` (mới, 10 test), `test/app-invoices-shell.test.mjs` (helper `routerMocks`, 3 test đổi cách chọn tab bằng `useLocation` giả), `test/app-shell-products.test.mjs` (đổi harness, giữ assert; thêm `test_ST8_AC2b_cashier_thuc_don_bi_chan_ve_ban_hang`). Chỉ `App.tsx` import `react-router-dom`.
- Red: 11 fail/17 test (AC-1,4,6,7: màn không dựng; AC-2/2b: `navigate` không được gọi; AC-9 `expected '7.18.5'`; AC-8 `LoginScreen` vs `Navigate`). Agent chính chạy lại: typecheck sạch; UI `npm test` 213 pass 0 fail (trước 203); build OK; `npm audit --audit-level=high` found 0 vulnerabilities. Đột biến 14/14 bắt.
- Lệch plan/ghi nhận: tdd đổi thêm harness `app-shell-products.test.mjs` (plan không liệt kê); `[B-59] App` vẫn xanh nhưng quyền thiếu giờ chuyển hướng thay vì AccessDenied (assert "không render DailyReportScreen" giữ nguyên); `docs/architecture/TECH_STACK.md` chưa sửa (làm ở sync-docs theo plan). Bấm "Bán hàng" trên rail khi đang ở `/ban-hang/don-dang-mo` về `/ban-hang/thuc-don` theo `go(tab)` của plan.
- Chưa kiểm: F5/Back thật, hành vi deps của effect (ST-10), `icon-actions.browser.mjs`.

## ST-10: xong (2026-11-15, tdd sonnet; agent chính tự kiểm lại)
- File: `POS_UI/test/stock-ledger-router.browser.mjs` (mới, 8 test BR-1..BR-7 + BR-5b); ảnh ở `.devloopflow/verify/20261115-sprint10-stock-ledger/evidence/st10/`. Không đụng code production. Dùng `App` thật, router thật, AuthContext và HTTP client thật, chỉ `window.fetch` giả; máy chủ tĩnh `node:http`; StrictMode; mỗi test một browser context; assert không có `pageerror`/`console.error`.
- Red = đột biến production (ST-1..9 đã làm trước nên test xanh ngay): 15 đột biến bắt (M1..M15); M14 ban đầu sống sót rồi thêm assert `main > div`. Không phát hiện lỗi thật ở ST-1..ST-9.
- Lệch plan (có lý do): bundle/CSS phục vụ qua `/__bundle.js`, `/__style.css`; mock `branches` đủ trường DTO và `GET /store-bank-account`; BR-5 dùng regex `/Chi nhánh Nam(?! Lý)/` (màn Bán hàng của CASHIER hiện chi nhánh mock "Chi nhánh Nam Lý", dữ liệu `src/mock`); thêm BR-5b; BR-3 thêm assert `main > div`.
- Ghi nhận: ở 1024×768 với 40 dòng bảng Sổ kho cuộn ngang trong `.table-wrap` (cột Tồn sau/Ghi chú bị cắt trong khung), không tràn trang (DESIGN.md §6.7). E2E-AC-11 (thứ tự option ZA10, ZĐ1) và vế POST mất mạng của E2E-AC-5 chưa có browser test; thuộc verify-ac trên app thật.

## Bước 7 (agent chính, 2026-11-15)
- `cd POS_UI`: `npm run typecheck` sạch; `npm test` 213 pass 0 fail; `npm run build` OK; `node --test test/stock-ledger-router.browser.mjs` 8 pass 0 fail; `npm audit --audit-level=high` 0 lỗ hổng (ở ST-8). `cd POS_API`: `npm run build` sạch; `npm test` 256 pass 0 fail 0 skip. Không có lệnh lint/format/coverage (`.devloopflow/devloopflow.md`). `graphify update .` đã chạy.
