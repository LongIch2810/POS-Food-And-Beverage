> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Kiểm AC report 20261112-sprint09-drawer-cancel-invoices — vòng 2

## Kết luận
PASS (mọi AC của Sprint 09). Ghi nhận môi trường: test cũ `[R14-1]` trong `payment.integration.test.ts` flaky khi đồng hồ container PostgreSQL lệch đồng hồ host; không phải FAIL của AC.

- Ngày: 2026-11-13
- Nhãn nguồn bằng chứng: **local do agent chạy** (không CI/runner độc lập, không SePay Live, không UI).
- Phạm vi: chạy lại TOÀN BỘ AC để bắt hồi quy sau vòng sửa R1-1 và fix-backlog B-41..B-48.
- Plan: `.devloopflow/approved/20261112-sprint09-drawer-cancel-invoices.md`; Spec: `.devloopflow/specs/20261112-sprint09-drawer-cancel-invoices.md`
- Ghi chú ghi chép: subagent `ac-verifier` (sonnet) lại không ghi được `report-2.md` (Write từ chối trong ngữ cảnh subagent); agent chính chép nội dung từ report của subagent sau khi tự đối chiếu bằng chứng thô (xem "Kiểm lại của agent chính").
- Phiên bản đã kiểm: HEAD `abc6bee5dceac7219ea8d569272009daa29719d3`, nhánh `feat/sprint-09-drawer-cancel`; mã task A chưa commit (`evidence/v2/head.txt`, `git-status.txt`, `git-diff-stat.txt`). SHA-256 gộp 122 file `dist/**/*.js` = `e2ee6faa264f9af430e9e7a857d52bf1409f4ddcd14d5c2f4e1ef670642e101b` (`evidence/v2/dist-sha256.txt`; cách tính có thể khác lần 1, không so với `368fd20c…`). Hash file nguồn: `evidence/v2/src-sha256.txt`.

## Tài liệu nguồn đã đối chiếu
- `docs/BUSINESS_RULES.md`: BR-17 `:107`, BR-51 `:117`, BR-52 `:118`, BR-53 `:119`, BR-58 `:132`, BR-60 `:134`, BR-61 `:135`, BR-29 `:150`, BR-39 `:175`, BR-47 `:188`; ma trận quyền `:229` "Hủy đơn đã thanh toán ... Không Có Có Không"; dòng mới `:230` "Ghi chi phí từ két trong ca thu ngân của mình | Không | Có | Có | Có"; công thức `:273-277`.
- `docs/DESIGN_DB_POS_SYSTEM.md:494-504,601,639,679`.
- `docs/api-spec.md` (đã cập nhật ở sync-docs): `:353` `INVOICE_NOT_OPEN` ("hủy đơn không còn `OPEN`/`PAID` (ví dụ đã `CANCELLED`)"); `:376` `SHIFT_NOT_FOUND` 404; `:377` `FORBIDDEN_NOT_SHIFT_OWNER` 403; `:378` `EXPENSE_EXCEEDS_DRAWER` 422; `:379` `CANCEL_EXCEEDS_DRAWER` 409; cùng `:349,361,362,375,456`.
- `sprints/sprint-09/SPRINT.md` S9-01..S9-05; `AGENTS.md`; spec; plan; `errors/INDEX.md`; `MEMORY.md` (M-1, M-4, M-10, M-14, M-15, M-19, M-20, M-21); `devloopflow.md` mục 3.

## Môi trường
- Sandbox DB `pos_verify_s9_v2_<hex>` (`evidence/v2/sandbox-db-name.txt`) trên PostgreSQL 17.9 Docker `pos_infra-postgres-1` cổng 15432. Migration: 11 migration (`migration-run.log`). API: `node dist/main.js`, `NODE_ENV=development`, cổng 13040; Swagger `/api/docs-json`.
- Secret tự sinh trong shell, không ghi file. Dọn: dừng API (pid 7788), `DROP DATABASE ... WITH (FORCE)`, truy vấn `pg_database` còn lại `[]` (`cleanup.txt`).
- Kịch bản: `evidence/v2/scripts/e2e.mjs`, `scripts/extra-part.mjs`.

## Kết quả test
- Lệnh: `npm test` trong `POS_API/`, `DATABASE_URL` dựng từ `POS_INFRA/.env.local` tại `127.0.0.1:15432`.
- Lần 1 (`npm-test.raw.log`): 204 test, pass 198, fail 6, exit 1. Lần 2 (`npm-test-run2.raw.log`): giống lần 1. Lần 3 (`npm-test-run3.raw.log`, chép sang `npm-test.log`): 204 test, pass 204, fail 0, exit 0. Chạy riêng `dist/sales/tests/payment.integration.test.js` (`payment-file-alone.log`): 72/72 pass.
- 6 fail ở lần 1 và 2 (cùng một nhóm): gốc là `not ok 1 - [R14-1] cash payment cannot make shift reconciliation exceed BR-103` (`payment.integration.test.ts:515`), lỗi `chk_work_shifts_ended_at` (`code '23514'`) ném khi đóng ca; bốn test sau trong cùng tệp (`test_ST4_cash_idempotent`, `test_ST4_promo_race_and_rollback`, `test_ST4_key_collision_and_parallel`, `test_ST4_http_cash_boundary_and_replay`) và suite cha fail theo.
- Nguyên nhân (đã đo, `clock-skew.txt`): CHECK `ended_at IS NULL OR ended_at > started_at` (`20261103000000-Shifts.ts:22`); test seed `started_at` bằng `now()` của PostgreSQL (`payment.integration.test.ts:501`), `closeShift` đặt `ended_at = new Date()` của Node. Đồng hồ container lệch host theo dạng răng cưa (12 mẫu từ -962 ms đến +467 ms rồi -998 ms). Khi DB đi trước host hơn khoảng thời gian từ lúc seed tới lúc đóng ca (~190 ms), `ended_at <= started_at`.
- Không phải hồi quy: `payment.integration.test.ts` không nằm trong `git status`; mã Sprint 09 không liên quan; `new Date()` trong `closeShift` có từ trước Sprint 09.
- Test mang mã AC (lần 3, `ac-test-ok-lines.txt`): 43 dòng `[S9-xx][ST-n.AC-k]`; `[R1-1]` (ok 21), `[B-41]` (ok 22), `[B-42]` (ok 23), `[B-47]` (ok 24), `[B-48]` (ok 25) trong `cancel-paid.integration.test.ts`; `[B-45]` (ok 13) trong `shift-expenses.integration.test.ts`. `[B-43]`, `[B-44]`, `[B-46]` không đổi hành vi; test bảo vệ `[ST-2.AC-1]`, `[ST-2.AC-4]` xanh.
- HTTP bằng app thật (`evidence/v2/e2e-http.log`, `e2e-http.results.json`): `SUMMARY total=48 pass=48 fail=0` (lần 1 là 42; thêm 6 check cho ST-5.AC-4 a/b, ST-5.AC-5 a/b, B-48 hai thứ tự).

## Coverage
- Không có lệnh coverage trong dự án (`.devloopflow/devloopflow.md` mục 2); không chạy.

## Đã đối chiếu errors
- `20261113-cancel-open-scope-order-untested.md` (R1-1); `20261113-sprint09-test-gaps-money-and-concurrency.md` (B-41, B-42, B-45, B-47, B-48); `20261113-sprint09-dto-docs-and-format-nits.md` (B-43, B-44, B-46; phần "chưa mở Swagger" nay đã kiểm, xem bảng).
- Mỗi lỗi cũ liên quan một case: `20261109-cash-close-shift-zero-cash-sales.md` — grep `expense_amount\s*=\s*'0'|expenseAmount\s*=\s*0n` rỗng (`grep.txt`), `E2E-AC-1.close_ok` có `expenseAmount 30000`; `20261111-cash-reconciliation-exceeds-money-limit.md` — `EXP.expense_then_close`, ST-5.AC-5, B-48; `20261111-manager-cancel-open-behavior-untested.md` — E2E-AC-3 vai trò thật, `EXP.cashier_cancel_open`; `20261109-owner-access-all-branch-scope.md` — `EXP.owner_cancel_paid` 200; `20261110-backlog-branch-scope-null-branchid-fail-open.md` — RF-5; `20261111-plan-spec-missing-manager-cancel-decision.md` — quyết định đã ghi plan, spec, task.
- MEMORY: M-1 (RF-5, `EXP`), M-4 (docs đã có mã lỗi), M-10 (vai trò thật qua HTTP), M-14/M-20 (grep không thấy `LEFT JOIN … FOR UPDATE`; `sales.service.ts:342` là truy vấn đọc không khóa có từ trước), M-15 (RF-1), M-19 (`randomUUID()`), M-21 (`EXP.used_count_zero_500`).

## Bảng đối chiếu (MỌI AC trong plan)
Ký hiệu: NT = dòng `ok` trong `evidence/v2/npm-test.log` (lần 3, 204/204); HTTP = check trong `evidence/v2/e2e-http.log` (48/48).

| AC | Cách kiểm | Kết quả thật | Tài liệu nguồn (nguyên văn, path:dòng) | Kết luận |
|---|---|---|---|---|
| E2E-AC-1 | HTTP + NT ST-2.AC-1,7,8,9 | `.post` 201 (`amount 30000`, `reason "Mua đá"`, `paidFromDrawer true`, `createdBy` = cashier); `.get` 1 phần tử `meta {20,null,1}`; `.platform_admin` 403 `PERMISSION_DENIED`; `.closed` 409 `SHIFT_CLOSED`; `close_ok` `expenseAmount 30000` | `BUSINESS_RULES.md:117` "Chỉ ghi chi phí khi ca còn `OPEN`."; `:118` "Mỗi khoản chi có `amount > 0` và `reason` bắt buộc." | Đúng |
| E2E-AC-2 | HTTP + NT ST-3.AC-1,3 | `blind_before` `expectedCash null`; đóng thường `cashSalesAmount 50000, expenseAmount 30000, expectedCash 120000, difference 0, MATCHED`; cưỡng chế `countedCash 125000, difference 5000, OVERAGE` | `:119` "Chỉ khoản có `paid_from_drawer = true` mới trừ vào tiền kỳ vọng của két."; `:132` đếm mù; `:273-277` | Đúng |
| E2E-AC-3 | HTTP + NT ST-4.AC-1,3,5 | MANAGER 200 `CANCELLED`; CASHIER 403; `PLATFORM_ADMIN` 403; MANAGER chi nhánh khác 404 `NOT_FOUND`; OWNER store khác 404; ca đóng 409 `CANCEL_NOT_ALLOWED`; snapshot không đổi | `:150` BR-29; `:229` | Đúng |
| E2E-AC-4 | HTTP + NT ST-4.AC-1,10, ST-5.AC-1 | `payments` không đổi; 2 `SALE_REVERSAL` +200.000 và +40.000 `source USER`; tồn 1000.000/1000.000; `used_count` 1→0; trigger lỗi → 500 snapshot không đổi; hủy đồng thời `waiting=2`, `statuses=200,409`, đúng 2 `SALE_REVERSAL`, `used_count 0` | `:175`; `:188`; `DESIGN_DB:639` | Đúng |
| E2E-AC-5 | HTTP + NT ST-5.AC-2,3 | `.cash` `cashSalesAmount 0, expectedCash 100000, MATCHED`; `.transfer` `cashSalesAmount 50000, expectedCash 150000, MATCHED`, `cancel_reason` nguyên văn | `:135`; `:273-277` | Đúng |
| ST-1.AC-1 | NT; `migration-run.log` 11 migration | xanh | `DESIGN_DB:494-504` | Đúng |
| ST-1.AC-2 | NT | xanh | `BUSINESS_RULES.md:118` | Đúng |
| ST-1.AC-3 | NT | xanh | plan `:228` | Đúng |
| ST-2.AC-1..4 | NT | xanh | `:118` | Đúng |
| ST-2.AC-5 | NT + HTTP `RF-2.expense_details` | 422 `EXPENSE_EXCEEDS_DRAWER`, `details []`, message không chữ số | `api-spec.md:378` | Đúng |
| ST-2.AC-6 | NT + HTTP RF-5 | xanh; `RF-5.null_branch_expense_404` PASS | `api-spec.md:376,377` | Đúng |
| ST-2.AC-7..12 | NT + HTTP `RF-1.expense_uppercase` | xanh; PASS | `BUSINESS_RULES.md:107` | Đúng |
| ST-3.AC-1..5 | NT | xanh | `:134-135` | Đúng |
| ST-3.AC-6 | NT + HTTP `EXP.expense_then_close` | `w1=1 w2=2`, chi 201, đóng 200 `expenseAmount 30000`, `MATCHED`; thứ tự (b) do NT | `:107` | Đúng |
| ST-4.AC-1..6 | NT + HTTP E2E-AC-3/4 | xanh | `:150,175,188` | Đúng |
| ST-4.AC-7 | NT + HTTP `RF-2.cancel_details` | 409 `CANCEL_EXCEEDS_DRAWER`, `details []`, message không chữ số | `api-spec.md:379` | Đúng |
| ST-4.AC-8..15 | NT + HTTP `RF-1.cancel_uppercase`, `RF-3`, `RF-4`, `EXP.used_count_zero_500`, `EXP.cashier_cancel_open` | xanh; PASS | `:175` | Đúng |
| ST-5.AC-1..3 | NT + HTTP | xanh; PASS | `:273-277` | Đúng |
| ST-5.AC-4 (a) hủy rồi đóng | NT ok 19 + HTTP thật | `w1=1 w2=2`; hủy 200, đóng 200 `cashSalesAmount 0`, `expectedCash 100000`, `MATCHED`; đơn `CANCELLED` | `:150` "chỉ khi **ca của đơn đó còn mở**" | Đúng (HTTP thật) |
| ST-5.AC-4 (b) đóng rồi hủy | HTTP thật | `w1=1 w2=2`; đóng 200 `cashSalesAmount 50000`, `MATCHED`; hủy 409 `CANCEL_NOT_ALLOWED`; đơn vẫn `PAID`, 0 `SALE_REVERSAL` | `:150`; `api-spec.md:362` | Đúng (HTTP thật) |
| ST-5.AC-5 (a) hủy rồi chi | NT ok 20 + HTTP thật | `w1=1 w2=2`; hủy 200; chi 120000 → 422 `EXPENSE_EXCEEDS_DRAWER`; đóng `countedCash 100000` `MATCHED`, `expected 100000`, `exp 0` | `:119`; `api-spec.md:378` | Đúng (HTTP thật) |
| ST-5.AC-5 (b) chi rồi hủy | HTTP thật | `w1=1 w2=2`; chi 201; hủy 409 `CANCEL_EXCEEDS_DRAWER`, đơn vẫn `PAID`; đóng `countedCash 30000` `MATCHED`, `expected 30000`, `exp 120000` | `api-spec.md:379` | Đúng (HTTP thật) |
| RF-1 | HTTP | PASS: path HOA chạy, `workShiftId` chữ thường | M-15 | Đúng |
| RF-2 | HTTP | PASS: `details []`, message không chữ số | `:132` BR-58 | Đúng |
| RF-3 | HTTP | PASS: `SALE_REVERSAL` sữa +200.000 sau khi đổi công thức 100→150 | `:188`; `DESIGN_DB:639` | Đúng |
| RF-4 | HTTP | PASS: hủy 200, `used_count 0` với mã đã ngưng | `:175` | Đúng |
| RF-5 | HTTP | PASS: 404 `SHIFT_NOT_FOUND` và 404 `NOT_FOUND`, không ghi chi | `20261110-backlog-branch-scope-null-branchid-fail-open.md` | Đúng |
| B-48 (ngoài plan: `payCash` + `cancelPaid` cùng ca) | NT ok 25 + HTTP thật | Pay trước: pay 201, hủy 200, đóng `expected 30000` `MATCHED`. Hủy trước: hủy 409 `CANCEL_EXCEEDS_DRAWER`, pay 201, đóng `expected 80000` `MATCHED`. `w1=1 w2=2`; `api.log` không có `deadlock`/`40P01` | `errors/20261113-sprint09-test-gaps-money-and-concurrency.md` | Đúng |
| Swagger `CreateShiftExpenseDto` (B-43) | `GET /api/docs-json` (`swagger.json`) | `required: ["amount"]`; `reason` và `paidFromDrawer` không bắt buộc (`paidFromDrawer` `default: true`) | `errors/20261113-sprint09-dto-docs-and-format-nits.md` | Đúng |

## Đối chiếu spec
| Mục của spec | Loại | Bằng chứng | Kết luận |
|---|---|---|---|
| G1 bảng và API ghi/xem chi từ két (S9-01) | mục tiêu | E2E-AC-1, ST-2 | Đúng |
| G2 đóng ca/đóng cưỡng chế dùng tổng chi, đếm mù, lệch cần ghi chú (S9-02) | mục tiêu | E2E-AC-2, ST-3; `expectedCash null` trước đóng | Đúng |
| G3 hủy `PAID` theo BR-29 (S9-03) | mục tiêu | E2E-AC-3, ST-4, ST-5.AC-4 | Đúng |
| G4 hủy `PAID` một transaction, hoàn kho, trả lượt mã, rollback, đồng thời (S9-04) | mục tiêu | E2E-AC-4, ST-4, ST-5 | Đúng |
| G5 đơn CASH hủy rời `cash_sales_amount`; TRANSFER không ảnh hưởng két (S9-05) | mục tiêu | E2E-AC-5, ST-5 | Đúng |
| UI task B, sửa/xóa khoản chi, hủy ca đã đóng, hoàn tiền một phần, `IMPORT`/`WASTE`/`ADJUST`, báo cáo | phi mục tiêu | Swagger chỉ có `POST`/`GET` cho `expenses`; không `PUT`/`DELETE`; ca đóng 409 `CANCEL_NOT_ALLOWED`; `git status` không có `POS_UI/` | Đúng |
| Trả `expected_cash` trước `counted_cash`; snapshot đổi sau đóng; sửa/xóa `payments`/`SALE`; ghi dở; trừ hai lần lượt mã; PLATFORM_ADMIN hoặc khác phạm vi chạm dữ liệu | phản mục tiêu | `expectedCash null`; ST-3.AC-5; ST-4.AC-1/10/11; ST-5.AC-1; 403/404 | Đúng |
| Tiền `bigint` có trần; migration chỉ thêm mới; khóa dòng gốc, không `LEFT JOIN … FOR UPDATE`; UUID chuẩn; quyền qua HTTP | ràng buộc | CHECK migration; `down()` ném lỗi; `grep.txt`; RF-1 | Đúng |

## FAIL / bug
- Không có FAIL của AC Sprint 09. Ghi nhận `[R14-1]` (xem "Đề xuất"); không lập mục FAIL vì không thuộc AC của plan, xanh ở lần 3 và khi chạy riêng, và không do mã Sprint 09.

## Lệch tài liệu
- Không có lệch bị đánh FAIL. Đã khắc phục so với lần 1: `docs/api-spec.md:353,376-379`; `docs/BUSINESS_RULES.md:230`.
- Ghi nhận còn lại (tài liệu không quy định): (1) tên permission `shift.expense` và `invoice.cancel_paid` chưa có trong `docs/` (chỉ có tên vai trò ở `BUSINESS_RULES.md:229-230`); (2) `sprints/sprint-09/SPRINT.md:33` (S9-01) "Người có quyền ghi khoản chi cho ca `CASHIER` đang `OPEN` cùng store/branch" rộng hơn spec đã duyệt (chỉ ca của chính người gọi, 403 `FORBIDDEN_NOT_SHIFT_OWNER` cho người khác); (3) BR-58: hai mã vượt két cho phép dò ngưỡng tiền kỳ vọng bằng thử nhiều số (rủi ro mềm đã được user duyệt; `details []` và message không số giảm rủi ro, RF-2 đạt).

## Đánh giá test
- Test tích hợp PostgreSQL thật qua HTTP, assert giá trị cụ thể; B-41, B-42, B-45, B-47, B-48 có đột biến chứng minh (`evidence/fix-backlog/mutant-*.log`). Lần 3 ổn định 204/204; hai lần đầu đỏ do `[R14-1]` (test cũ, không phải test Sprint 09). Test đồng thời quan sát phiên chờ khóa qua `pg_stat_activity`. Script HTTP nằm ở `evidence/v2/scripts/` (không lên git); chưa có CI.

## Exploratory
- Đóng ca không còn hằng 0: chỉ còn `shifts.service.ts:324,334,413,419` gán từ `drawerExpenses` (`grep.txt`).
- Trần tiền đối soát: chi và hủy kiểm két dưới khóa ca; `EXP.expense_then_close` ra `expenseAmount 30000`; ST-5.AC-5 a/b giữ `expected_cash >= 0`.
- `branch_id NULL` (M-1): RF-5 PASS. Hủy `OPEN` sau đổi ưu tiên lỗi (R1-1): `[R1-1]` ok, `EXP.cashier_cancel_open` 200. OWNER hủy `PAID`: `EXP.owner_cancel_paid` 200. `used_count` hỏng về 0: `EXP.used_count_zero_500` 500, snapshot không đổi.
- Chưa thử: UI (task B), SePay Live, CI.

## B-49 (ghi nhận lần 1 nay có chứng cứ)
- ST-5.AC-4 và ST-5.AC-5 (mỗi cái hai thứ tự) và cặp `payCash` + `cancelPaid` (B-48) nay có chứng cứ HTTP thật bằng app chạy riêng: gate giữ `SELECT … FOR UPDATE` trên `work_shifts`, quan sát 1 rồi 2 phiên chờ khóa (`w1=1 w2=2`); xem `evidence/v2/e2e-http.log`, mục "V2 EXTRA".

## Kiểm lại của agent chính
- Mở `evidence/v2/`: `e2e-http.results.json` 48 mục, 0 mục `pass:false`; `npm-test.raw.log`/`npm-test-run2.raw.log` `# tests 204 / # pass 198 / # fail 6`, `npm-test-run3.raw.log` `# pass 204 / # fail 0` (nhóm 6 fail đúng như mô tả, gốc `[R14-1]` ở dòng 2612); `clock-skew.txt` 12 mẫu từ -962 đến +467 rồi -998 ms; `swagger.json`: `CreateShiftExpenseDto.required = ["amount"]`, properties `amount, reason, paidFromDrawer`; `cleanup.txt`: sandbox đã drop, `remaining verify dbs []`.
- Agent chính chạy `npm test` riêng sau fix-backlog: 204/204, exit 0 (trước khi giao verifier).

## Đề xuất
- Mở finding Low cho `[R14-1]` (`POS_API/src/sales/tests/payment.integration.test.ts:501-543`): seed `started_at` bằng `now()` của DB trong khi `closeShift` dùng `new Date()` của Node; khi đồng hồ container Postgres đi trước host, CHECK `ended_at > started_at` ném `23514` và kéo theo 4 test sau. Test tái hiện đề xuất: `[R14-1]` seed `started_at = now() - interval '1 minute'` (hoặc `closeShift` dùng đồng hồ DB); mong đợi pass bất kể lệch đồng hồ. Không sửa trong lần verify.
- Dọn 2 DB do test cũ để lại (`pos_s9_cancel_e279a82803c6`, `pos_s9_cancel_da73aac86fb8`) khi user cho phép; không thuộc task.
- CI GitHub Actions chưa chạy cho mã này (chưa commit/push).
