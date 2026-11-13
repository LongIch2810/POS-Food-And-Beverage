---
id: 20261112-sprint09-drawer-cancel-invoices
spec: .devloopflow/specs/20261112-sprint09-drawer-cancel-invoices.md   # approved 2026-11-13
plan: .devloopflow/approved/20261112-sprint09-drawer-cancel-invoices.md
status: completed
owner: Claude Code
started_at: 2026-11-12
completed_at: 2026-11-13
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Task 20261112-sprint09-drawer-cancel-invoices

Yêu cầu của user (nguyên văn): `/devloopflow:run @sprints/sprint-09/SPRINT.md`

Nguồn phạm vi: `sprints/sprint-09/SPRINT.md` (dự thảo: PB-10 chi từ két, PB-11 hủy đơn `PAID`, lát cắt PB-13 màn Hóa đơn + chi phí trong màn Ca; S9-01..06; 5 điểm cần giải quyết ở mục "Điểm cần giải quyết trong refinement trước code").
Baseline: nhánh `master`, HEAD `abc6bee`, working tree sạch lúc bắt đầu (git status rỗng).

## Kết quả khám phá (bước 1; agent chính đã tự kiểm lại)
- `POS_API/src/shifts/shifts.service.ts:298,308,387,393` — `const expenseAmount = 0n;` và `reconciliation.expense_amount = '0';` (đóng ca và đóng cưỡng chế). Đã đọc.
- `POS_API/src/sales/sales.service.ts:438-446` — `cancel()` gọi `writable()` (đơn không `OPEN` bị chặn), chưa có nhánh hủy `PAID`. Route `sales.controller.ts:51-56` dùng `@RequirePermission('invoice.cancel_open')`.
- `POS_API/src/sales/sales.service.ts:299-324` — `finalizeInvoice`: tăng `promotion_codes.used_count`, ghi `stock_movements` loại `SALE` (`-quantity`), `UPDATE invoices SET status='PAID'`. `SALE_REVERSAL` chỉ có trong CHECK ở `20261107000000-InventoryPromotions.ts:49`, chưa có nơi ghi.
- `shift_expenses`: chỉ có trong `docs/DESIGN_DB_POS_SYSTEM.md:494-504` và `.devloopflow/specs/shifts.md`; chưa có migration/entity/DTO/route trong `POS_API/src`.
- Permission đang có: `shift.read/open/close/force_close` (`20261103000000-Shifts.ts:51-60`), `pos.sell`, `invoice.read`, `invoice.cancel_open` (`20261106000000-Sales.ts:64-72`; MANAGER thêm ở `20261111000000-ManagerCancelOpen.ts`), `branch.access_all` chỉ OWNER. Chưa có permission cho chi từ két hay hủy `PAID`.
- `docs/BUSINESS_RULES.md`: BR-17 (ca CLOSED không thêm chi phí), BR-51..53, BR-54..61, BR-21, BR-28, BR-29 (dòng 150), BR-39, BR-47, ma trận quyền dòng 225-233 ("Hủy đơn đã thanh toán": OWNER Có, MANAGER Có, CASHIER Không), mục 17 dòng 274-276.
- `docs/api-spec.md`: `CANCEL_NOT_ALLOWED` 409 (dòng 362), `EXPENSE_REASON_REQUIRED` 422 (dòng 375), route lồng `/work-shifts/{id}/expenses` (dòng 47, 159, 485).
- UI: `POS_UI/src/features/invoices/invoiceService.ts` còn `MockEngine`/`mockStorage`; `POS_UI/src/services/shiftService.ts:138-140` `addExpense` là stub; `InvoiceDetailDrawer.tsx:35` dùng permission `invoice.cancel_paid` (chỉ có trong mock, không có ở API). Test UI ở `POS_UI/test/*.test.mjs` (13 file, gồm `shift-screen.test.mjs`, `shift-service.test.mjs`).
- Sửa lỗi explorer: explorer báo "không có test UI"; sai, `POS_UI/test/` có 13 file test.
- Chưa có: spec hủy `PAID`, spec chi từ két (cả `specs/shifts.md` lẫn `specs/invoices.md`), mã lỗi riêng cho chi phí ngoài `EXPENSE_REASON_REQUIRED`.
- `.devloopflow/errors/` liên quan: `20261109-cash-close-shift-zero-cash-sales.md`, `20261111-cash-reconciliation-exceeds-money-limit.md`, `20261111-manager-cancel-open-behavior-untested.md`, `20261109-owner-access-all-branch-scope.md`.
- `.devloopflow/MEMORY.md` liên quan: M-1, M-10, M-14, M-15, M-17, M-18, M-19, M-20, M-21, M-28.

## Trạng thái
- Bước hiện tại (số bước trong flow): 10 — ĐÃ ĐÓNG 2026-11-13 (kiểm AC lần 1 PASS; finding hoãn đã vào backlog B-41..B-49; 10b sync-docs xong; kiểm AC lần 3 PASS; tiếp 10c reflect rồi đóng). Lịch sử: vòng review 1 CHANGES_REQUIRED (R1-1 Medium), vòng sửa 1/5 xong (plan được user duyệt 2026-11-13, đã kích hoạt: `plans/active/` + `approved/`; ST-1..ST-5 xong; bước 7 xong (npm test gồm build, exit 0), `graphify update .` chạy; tiếp bước 8 review. Ghi chú trước đó: 3→4 (spec đã duyệt 2026-11-13; planner (opus) viết xong `.devloopflow/plans/draft/20261112-sprint09-drawer-cancel-invoices.md` 674 dòng; agent chính đã đọc toàn bộ và kiểm path nguồn mẫu: access.guard.ts:22, sales.service.ts:283, shifts.service.ts:293, request-validation.ts:5-10,40, shifts.integration.test.ts:248; còn Câu hỏi mở 1 về message lỗi, chờ user)
- Đã xong: ST-5 (5 AC test-only; `npm test` 198/198 exit 0 chạy 2 lần liên tiếp; không có Red thật vì hành vi sẵn có, thay bằng đột biến đỏ; 1 đột biến chưa bảo vệ: `cashSales` bỏ `p.method='CASH'`). ST-4 (15 AC; `npm test` 193/193 exit 0 agent chính chạy lại 2026-11-13; đã đọc diff `sales.service.ts`, khớp plan, không dư đột biến; đột biến 12 bị bắt, 1 chưa bảo vệ: kiểm lại `locked.status` sau khóa đơn, thuộc ST-5; không test cũ đỏ do ưu tiên lỗi 404). ST-3 (6 AC; `npm test` 177/177 exit 0 agent chính chạy lại 2026-11-13; grep `expense_amount = '0'`/`expenseAmount = 0n` rỗng; đột biến 5/5 bị bắt). ST-2 (12 AC; agent chính chạy lại `npm test` 171/171 exit 0 ngày 2026-11-13; đột biến: 10/12 bị bắt, 2 chưa bảo vệ: tiebreak `e.id` của sort và `.trim()` thừa ở service — ghi chú, Low). ST-1 (Red/Green/refactor, agent chính chạy lại `npm test` 159/159 exit 0 ngày 2026-11-13; đột biến 5/5 bị bắt). Bước 0, bước 1, bước 2 (user đã chốt: "đồng ý hết", giải thích lại 9 điểm, rồi "ok duyệt" cho 4 điểm bổ sung từ spec-reviewer), spec viết xong và spec-reviewer đọc thử một lần. Lưu ý M-17: `.agents/skills/create-pos-spec/SKILL.md` không tồn tại trên đĩa, không áp dụng được.
- Đang làm: Chờ user nói rõ duyệt spec.
- Sắp làm: Bước 3 (planner), bước 4 (duyệt plan).

## File đã thay đổi
| Path | Thay đổi gì | Sub-task |
|------|-------------|----------|
| `.devloopflow/tasks/active/20261112-sprint09-drawer-cancel-invoices.md` | Tạo task | - |
| `POS_API/src/database/migrations/20261113000000-ShiftExpenses.ts` | Tạo: bảng `shift_expenses`, 2 permission | ST-1 |
| `POS_API/src/shifts/tests/shift-expenses.integration.test.ts` | Tạo: test ST-1.AC-1..3 + helper | ST-1 |
| `POS_API/src/shifts/http/shifts.dto.ts`, `shifts.response.ts`, `shifts.service.ts`, `shifts.controller.ts` | `CreateShiftExpenseDto`, response types, `addExpense`/`listExpenses`/`drawerExpenses`, 2 route | ST-2 |
| `POS_API/src/shifts/tests/shift-expenses.integration.test.ts` | Thêm ST-2.AC-1..12 | ST-2 |
| `POS_API/src/shifts/shifts.service.ts` | `closeShift`/`forceCloseShift` dùng `drawerExpenses` (4 chỗ) | ST-3 |
| `POS_API/src/shifts/tests/shift-expenses.integration.test.ts` | Thêm ST-3.AC-1..6 | ST-3 |
| `POS_API/src/sales/sales.service.ts` | `cancel()` rẽ nhánh theo trạng thái; thêm `cancelPaid()` | ST-4 |
| `POS_API/src/sales/tests/cancel-paid.integration.test.ts` | Tạo: ST-4.AC-1..15 + helper | ST-4 |
| `POS_API/src/sales/tests/cancel-paid.integration.test.ts` | Thêm ST-5.AC-1..5, helper `waitLock`, `serialized`, `seedPaidTransfer` (không sửa source) | ST-5 |
| `POS_API/src/foundation.test.ts` | Dòng 37: số migration 10 → 11 (delta plan, user duyệt) | ST-1 |

## Đã đọc errors
- ST-1: Đã đọc errors: INDEX.md, 20261111-manager-cancel-open-behavior-untested.md (theo report `tdd`).
- ST-5: 20261111-cash-reconciliation-exceeds-money-limit.md; MEMORY M-14, M-20 (theo report `tdd`).
- ST-4: INDEX.md, 20261111-manager-cancel-open-behavior-untested.md, 20261109-owner-access-all-branch-scope.md, 20261111-cash-reconciliation-exceeds-money-limit.md, 20261110-backlog-branch-scope-null-branchid-fail-open.md; MEMORY M-14, M-20, M-21 (theo report `tdd`).
- ST-3: INDEX.md, 20261109-cash-close-shift-zero-cash-sales.md, 20261111-cash-reconciliation-exceeds-money-limit.md (theo report `tdd`).
- ST-2: INDEX.md, 20261109-owner-access-all-branch-scope.md, 20261110-backlog-branch-scope-null-branchid-fail-open.md, 20261111-cash-reconciliation-exceeds-money-limit.md, 20261111-manager-cancel-open-behavior-untested.md (theo report `tdd`).

## Lịch sử review (chỉ thêm, không xoá)
- Vòng 1 — ngày: 2026-11-13 — model `code-reviewer`: opus — kết luận: CHANGES_REQUIRED (1 Medium, 3 Low, 1 Very Low). Reviewer không chạy `npm test`/`graphify`; đã đối chiếu errors, M-1, M-4, M-10, M-14, M-15, M-19, M-20, M-21; AC chưa phủ: không có.
  - R1-1 [Medium] `POS_API/src/sales/sales.service.ts:441-447` → finding (nguyên văn): chưa có test nào kiểm việc đổi ưu tiên lỗi của `cancel()` ở nhánh `OPEN`. Code mới gọi `this.invoice(manager, user, id)` trước `writable()`; người ngoài phạm vi và không có ca nay nhận `404 NOT_FOUND`, trước đây `409 SHIFT_NOT_OPEN` (quyết định user đã duyệt, spec dòng 65). `[MGR-CANCEL-3]` (`manager-cancel.integration.test.ts:67-74`) dùng MANAGER chi nhánh khác có ca riêng nên trả 404 cả trước và sau; `[ST-4.AC-12]` (`cancel-paid.integration.test.ts:421-428`) chỉ chạy đường chính. Kịch bản: khôi phục thứ tự cũ (gọi `writable()` trước) thì hợp đồng lỗi đã duyệt bị phá mà không test nào đỏ. Đề xuất: thêm test HTTP trong `cancel-paid.integration.test.ts`. Test tái hiện đề xuất: `[R1-1] out-of-scope caller without a shift gets 404 when cancelling an OPEN invoice` — input: CASHIER chi nhánh A tạo đơn `OPEN`; (a) `managerB` (chi nhánh B, không mở ca) `POST /invoices/{id}/cancel {"reason":"Thử"}`; (b) MANAGER `branch_id=NULL` (SQL), không ca, gọi giống (a); mong đợi cả hai `404 NOT_FOUND` "Không tìm thấy hóa đơn.", đơn vẫn `OPEN`, `cancelled_by NULL`.
    - Test tái hiện (tên test + file): `[R1-1] out-of-scope caller without a shift gets 404 when cancelling an OPEN invoice` — `POS_API/src/sales/tests/cancel-paid.integration.test.ts`
    - File đã sửa: `POS_API/src/sales/tests/cancel-paid.integration.test.ts` (chỉ test)
    - File .devloopflow/errors/ đã ghi/cập nhật: `.devloopflow/errors/20261113-cancel-open-scope-order-untested.md` (+ dòng INDEX)
  - Vòng sửa 1/5 (sau vòng 1) — model của `tdd`: sonnet — leo thang: không — dấu hiệu thiết kế sai: không — report sửa của `tdd` (nguyên văn): "Finding R1-1 đã có test. `npm test` toàn bộ 199/199 xanh... Xanh: `ok 21 - [R1-1] ...`, `# pass 22 / # fail 0`. Đỏ khi đột biến (đổi cancel() sang thứ tự cũ): `not ok 21 - [R1-1] ...` `409 !== 404`, `{"error":{"code":"SHIFT_NOT_OPEN",...}}`, `# fail 2` (test R1-1 và test cha). Khôi phục: `cmp` báo `restored`, `grep -c peek` = 0, build sạch. Log: evidence/r1-fix1/green.log, red-mutant.log, full-test.log." Agent chính chạy lại: `npm test` 199/199 exit 0; grep `peek` trong sales.service.ts = 0.
    - Ghi chú agent chính: đây là khoảng trống test (code đã đúng) nên test mới xanh ngay là dự kiến; bằng chứng đỏ thay thế = đột biến đảo thứ tự (gọi `writable()` trước `invoice()`).
- Vòng 2 — ngày: 2026-11-13 — model `code-reviewer`: opus — kết luận: PASS. (a) R1-1 đã sửa đúng (test `cancel-paid.integration.test.ts:593-609`, bắt đột biến đảo thứ tự); (b) quét lại toàn bộ file đã đổi: không finding mới, không AC chưa phủ. Ghi chú reviewer (chưa kiểm chứng, không phải finding): chưa có test cho cặp `payCash` cùng `cancelPaid` chạy đồng thời; reviewer không chạy lại `npm test`/`graphify`. Các mục hoãn (R1-2..R1-5 và 3 đột biến) giữ nguyên "chờ quyết".

## Lịch sử kiểm AC (chỉ thêm, không xoá)
- Sổ FAIL (để làm việc sau): `.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/fails.md`
- Lần 1 (toàn bộ AC) — ngày: 2026-11-13 — kết luận: PASS — report: `.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/report-1.md` (subagent `ac-verifier` model sonnet; nhãn nguồn: local do agent chạy; `npm test` 199/199; HTTP thật 42/42 check; không FAIL; không Lệch tài liệu; ghi chú sync-docs trong report)
  - Kết quả mới nhất của từng AC (điều kiện đóng task: tất cả PASS): E2E-AC-1..5 PASS | ST-1.AC-1..3 PASS | ST-2.AC-1..12 PASS | ST-3.AC-1..6 PASS | ST-4.AC-1..15 PASS | ST-5.AC-1..5 PASS | RF-1..5 PASS
- Lần 2 (chạy lại TOÀN BỘ AC sau vòng sửa R1-1 và fix-backlog B-41..B-48) — ngày: 2026-11-13 — kết luận: PASS — report: `.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/report-2.md` (subagent `ac-verifier` model sonnet; nhãn nguồn: local do agent chạy; `npm test` lần 3 204/204, hai lần đầu 198/204 do test cũ `[R14-1]` flaky lệch đồng hồ DB–host, không phải AC; HTTP thật 48/48 check, gồm ST-5.AC-4/5 hai thứ tự và cặp `payCash`+`cancelPaid`; Swagger `reason` không bắt buộc đã xác nhận; không FAIL)
  - Kết quả mới nhất của từng AC (điều kiện đóng task: tất cả PASS): E2E-AC-1..5 PASS | ST-1.AC-1..3 PASS | ST-2.AC-1..12 PASS | ST-3.AC-1..6 PASS | ST-4.AC-1..15 PASS | ST-5.AC-1..5 PASS | RF-1..5 PASS
- Lần 3 (chạy lại TOÀN BỘ AC sau lần 2 và B-50; người dùng gõ id sai chính tả `spirnt09`, đã dùng id đúng) — ngày: 2026-11-13 — kết luận: PASS — report: `.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/report-3.md` (subagent `ac-verifier` model sonnet; nhãn nguồn: local do agent chạy; `npm test` 3 lần liên tiếp 204/204, `[R14-1]` ổn định dù đồng hồ DB vẫn lệch ±1 s; HTTP thật 48/48; Swagger OK; không FAIL)
  - Kết quả mới nhất của từng AC (điều kiện đóng task: tất cả PASS): E2E-AC-1..5 PASS | ST-1.AC-1..3 PASS | ST-2.AC-1..12 PASS | ST-3.AC-1..6 PASS | ST-4.AC-1..15 PASS | ST-5.AC-1..5 PASS | RF-1..5 PASS

## Finding hoãn (Low, Very Low) — quyết ở bước 10 (chỉ thêm, không xoá)
- R1-2 [Low] `POS_API/src/sales/tests/cancel-paid.integration.test.ts:188-192` — finding (nguyên văn): fixture TRANSFER (`seedPaidTransfer`) ghi dòng `SALE` với `created_by = cashierId, source 'USER'`; đơn TRANSFER thật do webhook hoàn tất ghi `SALE` với `actorId=null`, tức `created_by NULL, source 'SYSTEM'` (`sales.service.ts:320-321`, `sepay-webhook.service.ts:82`). ST-4.AC-8 và ST-5.AC-3 chưa phủ đúng dạng dữ liệu thật; code vẫn đúng vì `SALE_REVERSAL` luôn lấy `user.id` và `'USER'`. Đề xuất: seed `SALE` dạng SYSTEM rồi assert `SALE_REVERSAL` có `created_by = managerId, source 'USER'`. Test tái hiện đề xuất: `[R1-2] reversal of SYSTEM-sourced SALE is attributed to the canceller` (như ST-4.AC-8, `SALE` dạng SYSTEM; mong đợi 200, 1 dòng `SALE_REVERSAL` `+100.000`, `created_by=managerId`, `source='USER'`) — vòng review: 1 — trạng thái: đã đưa vào backlog B-41 (2026-11-13)
- R1-3 [Low] `POS_API/src/sales/sales.service.ts:446` và `:457` — finding (nguyên văn): plan có dòng edge case "Người không có `branchId`, không `access_all` → 404 `NOT_FOUND` từ `invoice()`" cho nhánh `PAID`, nhưng chưa có test. `invoice()` đã chặn khi thiếu `branchId` từ lỗi B-2, nên rủi ro thấp. Test tái hiện đề xuất: `[R1-3] manager with NULL branch cannot cancel PAID` (MANAGER `branch_id=NULL` hủy đơn `PAID` chi nhánh A; mong đợi 404 `NOT_FOUND`, `snapshot` không đổi) — vòng review: 1 — trạng thái: đã đưa vào backlog B-42 (2026-11-13)
- R1-4 [Low] `POS_API/src/shifts/http/shifts.dto.ts:72` — finding (nguyên văn): `@ApiProperty` của `reason` khai báo trường bắt buộc, nhưng validator dùng `@IsOptional()`. Swagger nói khác hành vi thật (thiếu `reason` trả `EXPENSE_REASON_REQUIRED`, không phải `VALIDATION_ERROR`). Mẫu `CancelInvoiceDto` cũng vậy. Đề xuất: đổi sang `@ApiPropertyOptional`, giữ mô tả; không cần test — vòng review: 1 — trạng thái: đã đưa vào backlog B-43 (2026-11-13)
- R1-5 [Very Low] `POS_API/src/sales/tests/cancel-paid.integration.test.ts:193`, `POS_API/src/shifts/http/shifts.response.ts:43-44` — finding (nguyên văn): `return invoice;` thụt lề sai (8 khoảng thay vì 6); `shifts.response.ts:43-44` có hai dòng trống liên tiếp — vòng review: 1 — trạng thái: đã đưa vào backlog B-44 (2026-11-13)
- Từ bước 6 (agent chính ghi): hai đột biến chưa test nào bắt: tiebreak `e.id DESC` trong sort danh sách chi phí và `.trim()` thừa ở `addExpense` (ST-2); `cashSales` bỏ `p.method='CASH'` (ST-5, một lần chạy riêng exit 1 chưa rõ nguyên nhân, chạy lại xanh) — trạng thái: đã đưa vào backlog: tiebreak `e.id` B-45, `.trim()` thừa B-46, `cashSales` bỏ `p.method='CASH'` B-47 (2026-11-13)
- Ghi chú review vòng 2 (reviewer): chưa có test cho cặp `payCash`/`cancelPaid` đồng thời — trạng thái: đã đưa vào backlog B-48 (2026-11-13)
- Ghi chú kiểm AC lần 1 (verifier): ST-5.AC-4/5 chỉ có chứng cứ từ `npm test`, chưa chạy HTTP thật — trạng thái: đã đưa vào backlog B-49 (2026-11-13)
- Quyết định của user ngày 2026-11-13 (nguyên văn lựa chọn): "Đưa hết vào backlog".
- Sau đó user chạy `/devloopflow:fix-backlog tất cả` (2026-11-13): B-41..B-48 đã sửa bằng một lượt `tdd` (sonnet), chưa qua code-reviewer; `npm test` 204/204 (agent chính chạy lại); file errors `20261113-sprint09-test-gaps-money-and-concurrency.md`, `20261113-sprint09-dto-docs-and-format-nits.md`. B-49 (chạy HTTP thật cho ST-5.AC-4/5) sau đó được đóng bằng verify-ac lần 2 (`report-2.md`).
- Sau verify-ac lần 2 (2026-11-13): test cũ `[R14-1]` flaky do lệch đồng hồ DB–host → user chọn "đưa vào backlog fix luôn": B-50 đã sửa bằng một lượt `tdd` (sonnet), chưa qua code-reviewer; `npm test` 204/204; file errors `20261113-payment-test-seed-db-clock-flaky.md`.

## Cập nhật tài liệu (sync-docs, bước 10b; chỉ thêm, không xoá)
- D-A1 `.devloopflow/devloopflow.md:23` (nhóm A, tự cập nhật): "exit 0, 155/155 pass" (2026-11-11) → "Đã chạy thử 2026-11-13 (local, ... cổng 15432, không phải DB production): exit 0, 199/199 pass."; dòng 4 "Cập nhật lần cuối" → 2026-11-13; thêm dòng lịch sử dòng 107 — đã sửa — 2026-11-13.
- D-1 `docs/api-spec.md:375` (thêm 4 mã lỗi `SHIFT_NOT_FOUND`, `FORBIDDEN_NOT_SHIFT_OWNER`, `EXPENSE_EXCEEDS_DRAWER`, `CANCEL_EXCEEDS_DRAWER`) — đã sửa (`docs/api-spec.md:376-379`) — user duyệt "Duyệt hết" 2026-11-13
- D-2 `docs/api-spec.md:353` (`INVOICE_NOT_OPEN` thêm trường hợp hủy đơn không còn `OPEN`/`PAID`) — đã sửa (`docs/api-spec.md:353`) — user duyệt 2026-11-13
- D-3 `docs/BUSINESS_RULES.md:229` (ma trận quyền thêm dòng "Ghi chi phí từ két trong ca thu ngân của mình": Không | Có | Có | Có) — đã sửa (`docs/BUSINESS_RULES.md:230`) — user duyệt 2026-11-13
- `docs/api-spec.md:485` đã đúng, không sửa; `AGENTS.md`, `CLAUDE.md`, `README.md` không có câu lỗi thời vì task; câu "chưa commit" trong `sprints/sprint-08/SPRINT.md:43,83` là bản ghi QA lịch sử, không đề xuất sửa.

## Kinh nghiệm đã ghi (reflect, bước 10c; chỉ thêm, không xoá)
- M-29 (thêm) [Hay quên] thêm migration thì sửa số migration gắn cứng ở `foundation.test.ts:37` — 2026-11-13
- M-30 (thêm) [Hay quên] thay đổi thứ tự kiểm tra/hợp đồng lỗi đã duyệt phải có AC + test HTTP + đột biến đảo thứ tự — 2026-11-13
- M-31 (thêm) [Hay quên] seed mốc thời gian bằng đồng hồ DB rồi API ghi bằng đồng hồ Node → flaky; seed lùi 1 phút — 2026-11-13
- M-32 (thêm) [Đã học được] `--test-name-pattern` theo tên test cha khi test lồng subtest — 2026-11-13
- M-33 (thêm) [Quy trình] subagent không ghi được report; agent chính kiểm bằng chứng rồi chép — 2026-11-13
- M-34 (thêm) [Đã học được] `DATABASE_URL` trong `POS_API/.env` không dùng được; dùng Docker 15432 + `.env.local`; `docker start` sau restart — 2026-11-13
- M-35 (thêm) [Quy trình] kiểm đột biến phải có timeout, `cmp`, không đột biến gây treo; kiểm `git diff` — 2026-11-13
- M-36 (thêm) [Ý của user] giải thích từng điểm bằng lời thường trước khi xin duyệt — 2026-11-13
- M-17 (cập nhật ghi chú) [Quy trình] `.agents/skills/create-pos-spec/SKILL.md` không tồn tại trên đĩa; cần user xác nhận — 2026-11-13
- Ghi chú: `MEMORY.md` hiện ~499 dòng, vượt khoảng 150 dòng khuyến nghị; chưa dọn, chờ user đồng ý nếu muốn gộp/hết hiệu lực.

## Blocked
- Lý do: Không có
- Lỗi còn lại: Không có
- Đề xuất: Không có
