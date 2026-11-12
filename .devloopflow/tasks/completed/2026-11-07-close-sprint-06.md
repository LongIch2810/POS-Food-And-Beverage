# Task: Đóng Sprint 6 và bàn giao sang sprint tiếp theo

**Trạng thái:** Hoàn tất nghiệm thu/đóng Sprint 6 trong phạm vi local theo yêu cầu Product Owner ngày 07/11/2026. **Sprint:** `sprints/sprint-06/SPRINT.md`. **Plan triển khai:** `plans/completed/2026-11-06-sprint-06-open-orders.md`. **Nhánh:** `feat/pb07-open-orders`. **HEAD nền:** `91cf4a11d41a0d7e53bd6759e6e08260219376d5`; working tree dirty, chưa commit/push.

## Mục tiêu, phạm vi và nguồn

Đọc các hồ sơ `errors/`, `plans/`, `tasks/` liên quan Sprint 6, đối chiếu trạng thái lỗi/plan/task với QA cấp task và cấp sprint, rồi ghi kết luận nghiệm thu local, Sprint Review và retrospective có căn cứ. Cập nhật Product Backlog và hồ sơ liên quan để không còn mô tả Sprint 6 chưa QA/đang chờ triển khai. Tách rõ hoàn tất local với CI, merge và production. Không sửa source, không chạy DB/test vì chỉ đóng hồ sơ sau QA trên mã/UI cuối, không commit/push khi chưa được yêu cầu.

Nguồn: `sprints/sprint-06/SPRINT.md` S6-01..09; `qa-evidence/20261107-001400-91cf4a1-sprint06-qa/report.md` và `run.md`; `tasks/completed/2026-11-06-pb07-open-orders.md`, `tasks/completed/2026-11-07-sprint-06-qa.md`, `tasks/completed/2026-11-06-create-sprint-06.md`; `plans/completed/2026-11-06-sprint-06-open-orders.md`; năm file `errors/2026-11-06-pb07-*.md`; quy trình đối chiếu Sprint 5 tại `sprints/sprint-05/SPRINT.md`.

## Baseline Git trước khi sửa hồ sơ

```text
   M .gitignore
   M POS_API/src/app.module.ts
   M POS_API/src/auth/tests/auth.integration.test.ts
   M POS_API/src/database/data-source.ts
   M POS_API/src/foundation.test.ts
   M POS_API/src/menu/menu.service.ts
   M POS_API/src/organization/http/organization.controller.ts
   M POS_API/src/organization/tests/organization.acceptance.test.ts
   M POS_API/src/organization/tests/organization.integration.test.ts
   M POS_API/src/shifts/shifts.service.ts
   M POS_UI/src/app/App.tsx
   M POS_UI/src/app/navigation.ts
   M POS_UI/src/types/auth.ts
   M POS_UI/test/shift-screen.test.mjs
   M docs/PRODUCT_BACKLOG.md
  ?? POS_API/src/database/migrations/20261106000000-Sales.ts
  ?? POS_API/src/sales/
  ?? POS_UI/src/features/pos/LivePosScreen.tsx
  ?? POS_UI/src/services/salesService.ts
  ?? POS_UI/test/sales-service.test.mjs
  ?? errors/2026-11-06-pb07-active-resource-race.md
  ?? errors/2026-11-06-pb07-inactive-branch-cancel.md
  ?? errors/2026-11-06-pb07-lost-mutation-response.md
  ?? errors/2026-11-06-pb07-sold-topping-delete.md
  ?? errors/2026-11-06-pb07-uppercase-topping.md
  ?? plans/completed/2026-11-06-sprint-06-open-orders.md
  ?? qa-evidence/20261106-164335-91cf4a1-pb07-tdd-red/
  ?? qa-evidence/20261106-164601-91cf4a1-pb07-tdd-red-sandbox/
  ?? qa-evidence/20261106-165414-91cf4a1-pb07-backend-green-check/
  ?? qa-evidence/20261106-170041-91cf4a1-pb07-backend-regression/
  ?? qa-evidence/20261106-174110-91cf4a1-pb07-review1-green/
  ?? qa-evidence/20261106-174949-91cf4a1-pb07-ui-review2/
  ?? qa-evidence/20261106-175111-91cf4a1-pb07-qa/
  ?? qa-evidence/20261107-001400-91cf4a1-sprint06-qa/
  ?? specs/sales.md
  ?? sprints/sprint-06/
  ?? tasks/completed/2026-11-06-create-sprint-06.md
  ?? tasks/completed/2026-11-06-pb07-open-orders.md
  ?? tasks/completed/2026-11-07-sprint-06-qa.md
```

Toàn bộ source PB-07, hồ sơ và evidence đang uncommitted từ lượt trước; giữ nguyên thay đổi đó. `plans/active/` và `tasks/active/` chỉ có `.gitkeep` trước khi tạo task này.

## Đối chiếu trước khi đóng

- [x] Năm lỗi PB-07 đều có trạng thái đã sửa và test/QA task PASS; không có error PB-07 mở trong `errors/`. Lỗi race, inactive branch, uppercase topping, sold topping delete và mất phản hồi mutation đã có test/log tương ứng.
- [x] Plan PB-07 đã ở `plans/completed/`; task lập Sprint 6, triển khai PB-07, QA cấp sprint đều ở `tasks/completed/`.
- [x] QA task kết luận AC-1..9 PASS; QA cấp sprint riêng kết luận S6-01..09 PASS trên PostgreSQL/UI sandbox local. Backend 68/68, UI 39/39, build 0. Agent chính đã mở lại report/link/log ở lượt trước; hiện HEAD và danh sách source dirty không đổi.
- [x] Product Owner yêu cầu trong phiên ngày 07/11/2026: “đọc errors,plans,tasks đi để hoàn tất sprint để qua sprint khác”; đây là quyết định đóng Sprint 6 theo phạm vi local đã được QA đối chiếu. Không suy ra production/CI.

## Bước thực hiện

1. [x] Ghi kết luận Sprint Review và retrospective vào `sprints/sprint-06/SPRINT.md`: goal đạt local, S6-01..09 PASS, phiên bản dirty đã kiểm, năm finding đã sửa, bài học từ thiếu S6-09/harness và phạm vi hoãn. Nêu rõ kết thúc sớm 07/11/2026 theo yêu cầu Product Owner; không dựng cuộc họp hay phản hồi chưa có.
2. [x] Cập nhật `docs/PRODUCT_BACKLOG.md`: PB-07/lát cắt PB-13 bán hàng đã nghiệm thu local; sửa mô tả phần POS bán hàng/bàn hiện dùng API thật, phân biệt payment/kho/báo cáo còn ngoài phạm vi. Thêm mục theo dõi sau Sprint 6 cho PB-08, PB-08a, PB-09 và phần còn lại; chưa tự chốt Sprint 7.
3. [x] Cập nhật plan PB-07, ba task completed và năm error PB-07: giải thích mốc lịch sử, kết quả QA sprint riêng và quyết định đóng để không còn chỉ dẫn “chờ QA cấp sprint” cũ. Không sửa source.
4. [x] Đối chiếu mọi link tương đối trong các Markdown chính: đều tồn tại; `git diff --check` exit 0 (chỉ cảnh báo chuyển LF/CRLF); Graphify semantic update giới hạn Markdown thay đổi và `graphify cluster-only .` thành công, query xác nhận Sprint 6 hiện trong graph, `graphify-out/needs_update` không tồn tại. Task được chuyển sang `tasks/completed/` sau khi ghi kết quả này.

## Kết quả, file đổi và lệnh đã chạy

- Kết luận: Sprint Goal và 9/9 tiêu chí S6 đã PASS ở tầng sprint theo [QA sprint](../../qa-evidence/20261107-001400-91cf4a1-sprint06-qa/report.md); AC-1..9 task PB-07 PASS ở tầng task riêng. [Sprint 6](../../sprints/sprint-06/SPRINT.md) ghi nghiệm thu local/đóng ngày 07/11/2026. Không có error PB-07 mở; năm finding review đã sửa và giữ hồ sơ/test.
- File đổi trong lượt đóng: `sprints/sprint-06/SPRINT.md`, `docs/PRODUCT_BACKLOG.md`, `plans/completed/2026-11-06-sprint-06-open-orders.md`, `tasks/completed/2026-11-06-create-sprint-06.md`, `tasks/completed/2026-11-06-pb07-open-orders.md`, `tasks/completed/2026-11-07-sprint-06-qa.md`, năm file `errors/2026-11-06-pb07-*.md` và task đóng sprint này. Source API/UI không đổi; toàn bộ working tree dirty từ sprint trước được giữ nguyên.
- Lệnh/kiểm tra: `rg --files errors plans tasks` liệt kê hồ sơ; `Get-Content` đọc plan/task/error Sprint 6, Sprint 5 closure, Sprint 6 và Product Backlog; `git branch --show-current`, `git rev-parse HEAD`, `git status --short` xác nhận nhánh/HEAD/dirty; kiểm link Markdown bằng `Test-Path` từng target (đều tồn tại); `git diff --check` exit 0; semantic merge bằng Python Graphify giới hạn tài liệu đổi, `graphify cluster-only .` exit 0, `graphify query` thấy Sprint 6 mới, marker `needs_update` vắng. Không chạy test/DB trong lượt chỉ sửa Markdown; dùng log gốc của QA độc lập trên cùng source.
- Giới hạn: chưa có CI cho snapshot đã commit, chưa commit/push/merge hoặc xác nhận production; HEAD nền không đại diện đầy đủ source dirty đã QA. Việc chọn sprint tiếp theo là planning mới, chưa được Product Owner chốt.

**Bước tiếp theo cụ thể:** khi lập sprint tiếp theo, chọn phạm vi từ Product Backlog (PB-08/PB-08a là dependency trước PB-09), refinement/spec và plan riêng; trước khi triển khai trên nhánh mới, xử lý việc tích hợp/commit Sprint 6 theo yêu cầu Git của dự án. Không tự commit/push trong lượt này. Không có blocker cho kết luận đóng Sprint 6 local.
