> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Kiểm AC report 20261112-sprint09-drawer-cancel-invoices — vòng 3

## Kết luận
PASS (mọi AC của Sprint 09; không hồi quy sau vòng 2 và sau B-50). `[R14-1]` ổn định: xanh cả 3 lần `npm test`.

- Ngày: 2026-11-13
- Nhãn nguồn bằng chứng: **local do agent chạy** (không CI/runner độc lập, không SePay Live, không UI).
- Phạm vi: chạy lại TOÀN BỘ AC (E2E-AC-1..5, ST-1..5, RF-1..5) để bắt hồi quy sau vòng 2 (PASS) và sau B-50 (9 chỗ seed `started_at` trong `POS_API/src/sales/tests/payment.integration.test.ts` đổi `now()` thành `now() - interval '1 minute'`, chỉ test).
- Plan: `.devloopflow/approved/20261112-sprint09-drawer-cancel-invoices.md`; Spec: `.devloopflow/specs/20261112-sprint09-drawer-cancel-invoices.md`
- Phiên bản đã kiểm: HEAD `abc6bee5dceac7219ea8d569272009daa29719d3`, nhánh `feat/sprint-09-drawer-cancel`; mã task A chưa commit (`evidence/v3/head.txt`, `git-status.txt`, `git-diff-stat.txt`). SHA-256 gộp 122 file `dist/**/*.js` = `5003ee13971602b70a19503a1e5e18c039c23f6c5b755d0cacc38816d70a6d78` (`evidence/v3/dist-sha256.txt`; khác `e2ee6faa…` của v2 vì `payment.integration.test.js` đã đổi sau B-50 và cách tính gộp có thể khác). Hash 10 file nguồn đã đổi/mới: `evidence/v3/src-sha256.txt` (`payment.integration.test.ts` = `ec8369c3475c8c3d4a9eb03c14e5683051f0b0692c91553e2ca8003372b60b88`; 9 file còn lại trùng v2).
- Ghi chú ghi chép: subagent `ac-verifier` (sonnet) lại không ghi được `report-3.md` (Write từ chối); agent chính chép nội dung từ report của subagent sau khi tự đối chiếu bằng chứng thô (xem "Kiểm lại của agent chính").

## Tài liệu nguồn đã đối chiếu
- `docs/BUSINESS_RULES.md`: BR-17 `:107`, BR-51 `:117`, BR-52 `:118`, BR-53 `:119`, BR-58 `:132`, BR-60 `:134`, BR-61 `:135`, BR-29 `:150`, BR-39 `:175`, BR-47 `:188`; ma trận quyền `:229` "Hủy đơn đã thanh toán ... Không Có Có Không", `:230` "Ghi chi phí từ két trong ca thu ngân của mình | Không | Có | Có | Có"; công thức `:273-277`.
- `docs/DESIGN_DB_POS_SYSTEM.md:494-504` (bảng `shift_expenses`), `:601,639,679`.
- `docs/api-spec.md`: `:353` `INVOICE_NOT_OPEN` ("hủy đơn không còn `OPEN`/`PAID` (ví dụ đã `CANCELLED`)"); `:376` `SHIFT_NOT_FOUND` 404; `:377` `FORBIDDEN_NOT_SHIFT_OWNER` 403; `:378` `EXPENSE_EXCEEDS_DRAWER` 422; `:379` `CANCEL_EXCEEDS_DRAWER` 409.
- `sprints/sprint-09/SPRINT.md` S9-01..S9-05; `AGENTS.md`; spec; plan; `errors/INDEX.md`; `MEMORY.md`; `devloopflow.md` mục 3.

## Môi trường
- PostgreSQL 17 Docker `pos_infra-postgres-1` cổng 15432 (healthy). Sandbox DB `pos_verify_s9_v3_<hex>` (`evidence/v3/sandbox-db-name.txt`); `npm run migration:run` 11 migration (`migration-run.log`). API: `node dist/main.js`, `NODE_ENV=development`, cổng 13040; `GET /api/v1/health` `{"data":{"status":"ok"}}`; Swagger `/api/docs-json` (`swagger.json`).
- Secret (JWT, CSRF, SePay, mật khẩu admin) tự sinh trong shell, không ghi file. Dọn: dừng API (cổng 13040 không còn lắng nghe), `DROP DATABASE ... WITH (FORCE)`, truy vấn `pg_database like 'pos_verify%'` rỗng (`cleanup.txt`).
- Kịch bản: `evidence/v3/scripts/e2e.mjs` (chép từ v2, gồm phần V2 EXTRA), `extra-part.mjs`, `run-tests.sh`, `skew.sh`, `e2e-run.sh`.

## Kết quả test
- Lệnh: `npm test` trong `POS_API/` (build rồi `node --test --test-concurrency=1 "dist/**/*.test.js"`), `DATABASE_URL` dựng từ `POS_INFRA/.env.local` tại `127.0.0.1:15432`; chạy 3 lần liên tiếp.
- Lần 1 (`npm-test-run1.raw.log`): `# tests 204 / # pass 204 / # fail 0 / # cancelled 0 / # skipped 0`, `duration_ms 150808`, exit 0. Lần 2 (`npm-test-run2.raw.log`): 204/204/0, `duration_ms 153119`, exit 0. Lần 3 (`npm-test-run3.raw.log`, chép sang `npm-test.log`): 204/204/0, `duration_ms 159309`, exit 0. Không dòng `not ok` nào ở cả ba lần.
- `[R14-1] cash payment cannot make shift reconciliation exceed BR-103` `ok 1` cả ba lần (vòng 2 đỏ 2/3 lần). Bốn test sau (`test_ST4_cash_idempotent`, `test_ST4_promo_race_and_rollback`, `test_ST4_key_collision_and_parallel`, `test_ST4_http_cash_boundary_and_replay`) xanh cả ba lần.
- Độ lệch đồng hồ DB–host (`clock-skew.txt`, 10 mẫu, đo bằng `docker exec … clock_timestamp()` so với `date`, gồm trễ docker exec): -16, 154, 326, 514, 694, rồi -917, -757, -585, -412, -228 ms; vẫn dạng răng cưa ~±1 s như vòng 2, tức điều kiện gây lỗi `[R14-1]` vẫn tồn tại mà test xanh 3/3: B-50 hiệu quả. Hai seed `started_at ... now()` còn lại (`payment.integration.test.ts:33-34` kiểm migration baseline, `:1124-1125` webhook) không đóng ca bằng `new Date()` của Node nên không chịu cùng rủi ro (kết luận từ đọc mã, không có bằng chứng chạy riêng).
- Test mang mã AC (`ac-test-ok-lines.txt`): 43 dòng `ok` `[S9-xx]…`; `[R1-1]`, `[B-41]` (ok 22), `[B-42]` (ok 23), `[B-47]` (ok 24), `[B-48]` (ok 25) trong `cancel-paid.integration.test.ts`; `[B-45]` (ok 13) trong `shift-expenses.integration.test.ts`. `[B-43]`, `[B-44]`, `[B-46]` không đổi hành vi.
- HTTP bằng app thật (`e2e-http.log`, `e2e-http.results.json`): `SUMMARY total=48 pass=48 fail=0`, 0 dòng `CHECK FAIL`.

## Coverage
- Không có lệnh coverage trong dự án (`.devloopflow/devloopflow.md` mục 2); không chạy. Build (tsc) chạy trong `npm test`, không lỗi.

## Đã đối chiếu errors
- `20261113-cancel-open-scope-order-untested.md` (R1-1): `[R1-1]` ok, `EXP.cashier_cancel_open` PASS.
- `20261113-sprint09-test-gaps-money-and-concurrency.md` (B-41, B-42, B-45, B-47, B-48): ok 22, 23, 13, 24, 25; HTTP `B-48.pay_then_cancel`, `B-48.cancel_then_pay` PASS.
- `20261113-sprint09-dto-docs-and-format-nits.md` (B-43, B-44, B-46): Swagger `CreateShiftExpenseDto.required = ["amount"]`.
- `20261113-payment-test-seed-db-clock-flaky.md` (B-50): `grep` thấy đúng 9 dòng `now() - interval '1 minute'` ở `payment.integration.test.ts` (113, 157, 359, 466, 501, 650, 762, 896, 1258); `[R14-1]` và 4 test sau xanh 3/3 khi đồng hồ vẫn lệch ±1 s; không còn seed `now()` nào đi kèm đóng ca bằng API.
- Lỗi cũ, mỗi lỗi một case: `20261109-cash-close-shift-zero-cash-sales.md` — grep literal `expense_amount = '0'`/`expenseAmount = 0n` rỗng (`grep.txt`), `E2E-AC-1.close_ok` `expenseAmount 30000`; `20261111-cash-reconciliation-exceeds-money-limit.md` — `EXP.expense_then_close`, ST-5.AC-5 a/b, B-48 đều `MATCHED`, `expected >= 0`; `20261111-manager-cancel-open-behavior-untested.md` — E2E-AC-3 vai trò thật, `EXP.cashier_cancel_open`; `20261109-owner-access-all-branch-scope.md` — `EXP.owner_cancel_paid`; `20261110-backlog-branch-scope-null-branchid-fail-open.md` — RF-5; `20261111-plan-spec-missing-manager-cancel-decision.md` — quyết định đã ghi plan, spec, task.
- MEMORY: M-1 (RF-5, `EXP`), M-4 (docs đã có mã lỗi), M-10 (vai trò thật qua HTTP), M-14/M-20 (grep `LEFT JOIN.*FOR UPDATE` rỗng), M-15 (RF-1), M-19 (`randomUUID()`), M-21 (`EXP.used_count_zero_500`).

## Bảng đối chiếu (MỌI AC trong plan)
Ký hiệu: NT = dòng `ok` trong `evidence/v3/npm-test-run1..3.raw.log` (204/204 cả ba lần); HTTP = check trong `evidence/v3/e2e-http.log` (48/48).

| AC | Cách kiểm | Kết quả thật | Tài liệu nguồn (nguyên văn, path:dòng) | Kết luận |
|---|---|---|---|---|
| E2E-AC-1 | HTTP + NT ST-2.AC-1,7,8,9 | `.post`, `.get`, `.platform_admin`, `.close_ok`, `.closed` PASS (chi 30000 "Mua đá" 201, list 1 phần tử, PLATFORM_ADMIN 403, đóng ca `expenseAmount 30000`, ca đóng 409 `SHIFT_CLOSED`) | `BUSINESS_RULES.md:117` "Chỉ ghi chi phí khi ca còn `OPEN`."; `:118` "Mỗi khoản chi có `amount > 0` và `reason` bắt buộc." | Đúng |
| E2E-AC-2 | HTTP + NT ST-3.AC-1,3 | `normal.blind_before` `expectedCash null`; `normal`: `cashSalesAmount 50000, expenseAmount 30000, expectedCash 120000, countedCash 120000, difference 0, MATCHED`; `force`: `countedCash 125000, difference 5000, OVERAGE`, note "Thu ngân về sớm" | `:119` "Chỉ khoản có `paid_from_drawer = true` mới trừ vào tiền kỳ vọng của két."; `:132` BR-58 đếm mù; `:273-277` | Đúng |
| E2E-AC-3 | HTTP + NT ST-4.AC-1,3,5 | `manager_200` `CANCELLED`; `cashier_403`; `platform_admin_403`; `manager_other_branch_404`; `owner_other_store_404`; `reason_required`; `closed_shift` + `closed_shift_unchanged`; `recancel_409` PASS | `:150` BR-29 "chỉ khi **ca của đơn đó còn mở**"; `:229` | Đúng |
| E2E-AC-4 | HTTP + NT ST-4.AC-1,10, ST-5.AC-1 | `payments_unchanged`, `two_reversals`, `stock_back_1000`, `used_count_0`, `still_two_reversals`, `midway_500` + `midway_unchanged`, `race waiting=2 statuses=200,409` PASS | `:175` BR-39; `:188` BR-47; `DESIGN_DB:639` | Đúng |
| E2E-AC-5 | HTTP + NT ST-5.AC-2,3 | `.cash`: `cashSalesAmount 0, expenseAmount 0, expectedCash 100000, MATCHED`; `.transfer`: `cashSalesAmount 50000, expectedCash 150000, MATCHED` | `:135` BR-61; `:273-277` | Đúng |
| ST-1.AC-1 | NT; `migration-run.log` 11 migration | xanh | `DESIGN_DB:494-504` | Đúng |
| ST-1.AC-2 | NT | xanh | `BUSINESS_RULES.md:118` | Đúng |
| ST-1.AC-3 | NT | xanh | plan `:228` | Đúng |
| ST-2.AC-1..4 | NT | xanh | `:118` | Đúng |
| ST-2.AC-5 | NT + HTTP `RF-2.expense_details` | 422 `EXPENSE_EXCEEDS_DRAWER`; message không chữ số, `details []` | `api-spec.md:378` | Đúng |
| ST-2.AC-6 | NT + HTTP RF-5 | xanh; `RF-5.null_branch_expense_404` PASS | `api-spec.md:376,377` | Đúng |
| ST-2.AC-7..12 | NT + HTTP `RF-1.expense_uppercase` | xanh; PASS | `BUSINESS_RULES.md:107` | Đúng |
| ST-3.AC-1..5 | NT | xanh | `:134-135` | Đúng |
| ST-3.AC-6 | NT + HTTP `EXP.expense_then_close` | `w1=1 w2=2`; PASS; thứ tự (b) do NT | `:107` | Đúng |
| ST-4.AC-1..6 | NT + HTTP E2E-AC-3/4 | xanh; PASS | `:150,175,188` | Đúng |
| ST-4.AC-7 | NT + HTTP `RF-2.cancel_details` | 409 `CANCEL_EXCEEDS_DRAWER`; message không chữ số, `details []` | `api-spec.md:379` | Đúng |
| ST-4.AC-8..15 | NT + HTTP `RF-1.cancel_uppercase`, `RF-3`, `RF-4`, `EXP.used_count_zero_500`, `EXP.cashier_cancel_open` | xanh; PASS | `:175` | Đúng |
| ST-5.AC-1..3 | NT + HTTP | xanh; PASS | `:273-277` | Đúng |
| ST-5.AC-4 (a) hủy rồi đóng | NT + HTTP thật | `w1=1 w2=2`; `rc {"cash":"0","exp":"0","expected":"100000","counted":"100000","diff":"0","status":"MATCHED"}` | `:150` | Đúng (HTTP thật) |
| ST-5.AC-4 (b) đóng rồi hủy | HTTP thật | `w1=1 w2=2`; `rc {"cash":"50000","exp":"0","expected":"150000","counted":"150000","diff":"0","status":"MATCHED"}`; hủy bị chặn, đơn vẫn `PAID` | `:150`; `api-spec.md:362` | Đúng (HTTP thật) |
| ST-5.AC-5 (a) hủy rồi chi | NT + HTTP thật | `w1=1 w2=2`; `rc {"cash":"0","exp":"0","expected":"100000",...,"status":"MATCHED"}` (chi 120000 bị 422 `EXPENSE_EXCEEDS_DRAWER`) | `:119`; `api-spec.md:378` | Đúng (HTTP thật) |
| ST-5.AC-5 (b) chi rồi hủy | HTTP thật | `w1=1 w2=2`; `rc {"cash":"50000","exp":"120000","expected":"30000","counted":"30000","diff":"0","status":"MATCHED"}` (hủy 409 `CANCEL_EXCEEDS_DRAWER`, đơn vẫn `PAID`) | `api-spec.md:379` | Đúng (HTTP thật) |
| RF-1 | HTTP | `RF-1.expense_uppercase`, `RF-1.cancel_uppercase` PASS | M-15 | Đúng |
| RF-2 | HTTP | `RF-2.expense_details`, `RF-2.cancel_details` PASS | `:132` BR-58 | Đúng |
| RF-3 | HTTP | `RF-3.recipe_change` PASS (`SALE_REVERSAL` +200 theo dòng `SALE`) | `:188`; `DESIGN_DB:639` | Đúng |
| RF-4 | HTTP | `RF-4.inactive_promo` PASS | `:175` | Đúng |
| RF-5 | HTTP | `RF-5.null_branch_expense_404`, `RF-5.null_branch_cancel_404` (404 `NOT_FOUND`) PASS | `errors/20261110-backlog-branch-scope-null-branchid-fail-open.md` | Đúng |
| B-48 (ngoài plan: `payCash` + `cancelPaid` cùng ca) | NT ok 25 + HTTP thật | Pay trước: `expected 30000 MATCHED`; hủy trước: `expected 80000 MATCHED`; `w1=1 w2=2`; `api.log` 0 lần `deadlock`/`40P01` | `errors/20261113-sprint09-test-gaps-money-and-concurrency.md` | Đúng |
| Swagger `CreateShiftExpenseDto` (B-43) | `GET /api/docs-json` | `required: ["amount"]`; properties `amount, reason, paidFromDrawer` | `errors/20261113-sprint09-dto-docs-and-format-nits.md` | Đúng |

## Đối chiếu spec
| Mục của spec | Loại | Bằng chứng | Kết luận |
|---|---|---|---|
| G1 bảng và API ghi/xem chi từ két (S9-01) | mục tiêu | E2E-AC-1, ST-2 | Đúng |
| G2 đóng ca/đóng cưỡng chế dùng tổng chi, đếm mù, lệch cần ghi chú (S9-02) | mục tiêu | E2E-AC-2, ST-3; `expectedCash null` trước đóng | Đúng |
| G3 hủy `PAID` theo BR-29 (S9-03) | mục tiêu | E2E-AC-3, ST-4, ST-5.AC-4 | Đúng |
| G4 hủy `PAID` một transaction, hoàn kho, trả lượt mã, rollback, đồng thời (S9-04) | mục tiêu | E2E-AC-4, ST-4, ST-5 | Đúng |
| G5 đơn CASH hủy rời `cash_sales_amount`; TRANSFER không ảnh hưởng két (S9-05) | mục tiêu | E2E-AC-5, ST-5 | Đúng |
| UI task B, sửa/xóa khoản chi, hủy ca đã đóng, hoàn tiền một phần, `IMPORT`/`WASTE`/`ADJUST`, báo cáo | phi mục tiêu | `git status` không có `POS_UI/`; ca đóng bị chặn (`E2E-AC-3.closed_shift`); không route sửa/xóa chi (xác nhận vòng 2 từ Swagger; vòng này không đổi mã) | Đúng |
| Trả `expected_cash` trước `counted_cash`; snapshot đổi sau đóng; sửa/xóa `payments`/`SALE`; ghi dở; trừ hai lần lượt mã; PLATFORM_ADMIN hoặc khác phạm vi chạm dữ liệu | phản mục tiêu | `blind_before expectedCash null`; ST-3.AC-5; `payments_unchanged`; `midway_unchanged`; 403/404 | Đúng |
| Tiền `bigint` có trần; migration chỉ thêm mới; khóa dòng gốc, không `LEFT JOIN … FOR UPDATE`; UUID chuẩn; quyền qua HTTP | ràng buộc | CHECK migration (ST-1.AC-2); grep rỗng; RF-1; E2E-AC-3 vai trò thật | Đúng |

## FAIL / bug
- Không có.

## Lệch tài liệu
- Không có lệch bị đánh FAIL.
- Ghi nhận còn lại (tài liệu không quy định, không phải FAIL): (1) tên permission `shift.expense` và `invoice.cancel_paid` chưa có trong `docs/` (chỉ có tên vai trò ở `BUSINESS_RULES.md:229-230`); (2) `sprints/sprint-09/SPRINT.md:33` (S9-01) "Người có quyền ghi khoản chi cho ca `CASHIER` đang `OPEN` cùng store/branch" rộng hơn spec đã duyệt (chỉ ca của chính người gọi, 403 `FORBIDDEN_NOT_SHIFT_OWNER` cho người khác); (3) BR-58: hai mã vượt két cho phép dò ngưỡng bằng thử nhiều số (rủi ro mềm đã được user duyệt; `details []` và message không số giảm rủi ro, RF-2 đạt).

## Đánh giá test
- Test tích hợp PostgreSQL thật qua HTTP, assert giá trị cụ thể; B-41, B-42, B-45, B-47, B-48 có đột biến chứng minh ở vòng fix-backlog. Ổn định: 204/204 ba lần liên tiếp (150-159 s mỗi lần), không skip, không cancelled. B-50 hiệu quả.
- Hạn chế: 2 seed `now()` DB còn lại không đóng ca (an toàn theo đọc mã); chưa có CI chạy cho mã này (chưa commit/push); script HTTP ở `evidence/v3/scripts/` không lên git.

## Exploratory
- Đóng ca không còn hằng 0 (`shifts.service.ts:324,413` gán từ `drawerExpenses`, `grep.txt`); grep literal cũ rỗng.
- Trần tiền đối soát: `EXP.expense_then_close` `w1=1 w2=2`; ST-5.AC-5 a/b và B-48 hai thứ tự đều `MATCHED`, `expected >= 0`.
- `branch_id NULL` (M-1): RF-5 PASS. Hủy `OPEN` sau đổi ưu tiên lỗi (R1-1): `[R1-1]` ok, `EXP.cashier_cancel_open`. OWNER hủy `PAID`: `EXP.owner_cancel_paid`. `used_count` hỏng về 0: `EXP.used_count_zero_500`, snapshot không đổi.
- Chưa thử: UI (task B), SePay Live, CI.

## Kiểm lại của agent chính
- Mở `evidence/v3/`: `npm-test-run1..3.raw.log` đều `# tests 204 / # pass 204 / # fail 0` và 0 dòng `not ok`; `e2e-http.results.json` 48 mục, 0 mục `pass:false`; `swagger.json` `CreateShiftExpenseDto.required = ["amount"]`; `cleanup.txt` `DROP DATABASE`, `remaining pos_verify*:` rỗng; `grep -c "now() - interval '1 minute'"` trong `payment.integration.test.ts` = 9.

## Đề xuất
- Dọn 2 DB do test cũ để lại (`pos_s9_cancel_e279a82803c6`, `pos_s9_cancel_da73aac86fb8`, có từ trước vòng này) khi user cho phép; không thuộc task.
- Đẩy nhánh để CI GitHub Actions chạy cho mã này (chưa chạy).
