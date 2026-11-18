> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Kiểm AC report 20261118-sprint11-pb16-remove-cancel-paid — vòng 1

## Kết luận
PASS (phạm vi lượt 1: mọi AC trừ E2E-AC-9, ST-5.AC-1, ST-5.AC-2 là "không chạy lượt này: chờ bước 10b", không tính FAIL)

- Ngày: 2026-11-19
- Plan đối chiếu: `.devloopflow/approved/20261118-sprint11-pb16-remove-cancel-paid.md`
- Spec đối chiếu: `.devloopflow/specs/20261118-sprint11-pb16-remove-cancel-paid.md`

## Tài liệu nguồn đã đối chiếu
- `.devloopflow/approved/20261118-sprint11-pb16-remove-cancel-paid.md`
- `.devloopflow/specs/20261118-sprint11-pb16-remove-cancel-paid.md`
- `docs/BUSINESS_RULES.md:308` (BR-110): "**Bãi bỏ hủy đơn `PAID`.** Chỉ đơn `OPEN` hủy được. ... Mã và test chưa đổi; ... Đơn đã thanh toán là bất biến: thu nhầm hoặc nhập sai thì xử lý ngoài hệ thống, hệ thống không có điều chỉnh hay sửa hóa đơn `PAID`."
- `DESIGN.md:874`: "bỏ nút hủy đơn đã thanh toán ở ngăn chi tiết Hóa đơn (mục 5, mục 8, mục 9) khi BR-110 được triển khai. Đơn `OPEN` vẫn hủy được."
- `sprints/sprint-11/SPRINT.md:36-37` (S11-01, S11-02)
- `.devloopflow/devloopflow.md` mục 2-3, `.devloopflow/MEMORY.md` (M-6, M-7, M-10, M-29, M-30, M-33, M-34, M-39, M-47, M-50, M-51), `.devloopflow/errors/INDEX.md`

## Môi trường
- Lệnh chạy app (sandbox riêng, không đụng `pos_local`): DB `pos_pb16_verify_<hex>` tạo bằng quyền CREATEDB; migration bằng `node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js`; API `node dist/main.js` (NODE_ENV=development, PORT=3100, REDIS db 14); UI `vite --port 5183` với VITE_API_TARGET=http://127.0.0.1:3100.
- URL/port: API http://127.0.0.1:3100, UI http://localhost:5183, viewport 1024x768 (Playwright MCP). Test API: PostgreSQL 127.0.0.1:5432 (DATABASE_URL của POS_API/.env, không in), REDIS_URL=redis://127.0.0.1:6379/15.
- Đã dọn: dừng API/Vite, drop DB sandbox (chỉ tên khớp `pos_pb16_verify_[0-9a-f]{8}`), flush Redis db 14, không còn DB `pos_pb16_*` (evidence/r1-cleanup.log).

## Kết quả test
- API: `cd POS_API && REDIS_URL=redis://127.0.0.1:6379/15 npm test` → `# tests 347 / # pass 347 / # fail 0 / # skipped 0`, EXIT=0 (evidence/r1-st4ac1-api-test.log, ~428 s; gồm build).
- UI: `npm run typecheck` EXIT=0; `npm run build` EXIT=0; `npm test` → `# tests 230 / # pass 230 / # fail 0 / # skipped 0`, EXIT=0 (evidence/r1-st4ac2-ui.log).
- Browser test: `node --test test/stock-ledger-router.browser.mjs` → 9/9 pass, EXIT=0 (evidence/r1-st3ac8-browser.log).

## Coverage
- Không có script/ngưỡng coverage trong manifest/CI (`.devloopflow/devloopflow.md` mục 2). Không áp dụng.

## Đã đối chiếu errors
- `.devloopflow/errors/20261111-manager-cancel-open-behavior-untested.md`: case MANAGER thật qua HTTP (PAID → 409; OPEN của ca mình → 200; MANAGER bị thu hồi `invoice.cancel_open` → 403; MANAGER chi nhánh khác/`branch_id` NULL → 404).
- `.devloopflow/errors/20261113-cancel-open-scope-order-untested.md`: case người gọi không có ca / `branch_id` NULL trên đơn OPEN → 404 (R1-1), đột biến đảo thứ tự làm test đỏ (ST-1.AC-14).
- Task file: "Lịch sử review" vòng 1 chỉ có finding Low/Very Low B-73, B-74, B-75 ghi vào `.devloopflow/review/backlog.md`, chưa sửa → không cần file `errors/`. Không có finding đã sửa nào thiếu file errors. "Lịch sử kiểm AC" chưa có mục sửa.
- MEMORY "Hay quên" áp dụng: M-10 (quyền theo vai trò qua HTTP thật) → case ST-1.AC-2/6, E2E-AC-6; M-29 (số migration) → foundation.test.ts + entity-schema.integration.test.ts đều 15, test xanh; M-30 (đảo thứ tự) → đột biến ST-1.AC-14; M-39 (browser thật, kích thước/nhãn) → E2E-AC-7 ở 1024x768; M-47 (fixture tên chi nhánh) → dùng mã/ID chi nhánh trong SQL, không dựa tên hiển thị.

## Bảng đối chiếu
(Tất cả "Cách kiểm" dùng chứng cứ do ac-verifier tự chạy; path evidence tính từ `.devloopflow/verify/20261118-sprint11-pb16-remove-cancel-paid/evidence/`.)

| AC | Cách kiểm | Lệnh/bước đã chạy | Kết quả thật | Mong đợi theo plan | Tài liệu (nguyên văn + path:dòng) | Kết luận | Ghi chú |
|----|-----------|-------------------|--------------|--------------------|-----------------------------------|----------|---------|
| E2E-AC-1 | HTTP live + SQL | `scripts/r1-http.mjs` check "E2E-AC-1": MANAGER hủy đơn PAID 45000 `S9PROMO` | 409 `INVOICE_PAID_IMMUTABLE`, message "Đơn đã thanh toán không thể hủy.", `details` `[]`; DB: status PAID, `cancel_reason`/`cancelled_by`/`cancelled_at` null, 0 `SALE_REVERSAL`, sữa 800.000, đường 960.000, `used_count` 1, payments giữ nguyên (r1-http-run.log) + test `[PB16-1]` ok (r1-st4ac1-api-test.log:2982) | như plan | BR-110 (BUSINESS_RULES.md:308) "Chỉ đơn `OPEN` hủy được"; SPRINT.md:36 "Hủy đơn `PAID` bị từ chối ở API" | Đúng | |
| E2E-AC-2 | HTTP live | check "E2E-AC-2": OWNER (không ca) và CASHIER chủ ca hủy PAID | cả hai 409 `INVOICE_PAID_IMMUTABLE`, snapshot không đổi (r1-http-run.log) | như plan | spec:34 "Còn đường nào hủy được đơn `PAID` (kể cả khi tự gọi API, thiếu hoặc đủ quyền)" là thất bại | Đúng | |
| E2E-AC-3 | HTTP live | check "ST-1.AC-7" + "E2E-AC-3": CASHIER hủy OPEN; MANAGER chủ ca hủy OPEN của mình; OWNER mở ca chi nhánh mới rồi hủy; test `[MGR-CANCEL-1]` trong full suite | CASHIER 200 `CANCELLED`; MANAGER 200 `CANCELLED`; OWNER có ca 200, `cancelled_by` = id OWNER; OWNER không ca 409 `SHIFT_NOT_OPEN`, đơn vẫn OPEN | như plan | spec:30 "Không đổi hành vi hủy đơn `OPEN`"; SPRINT.md:36 "hủy đơn `OPEN` vẫn hoạt động" | Đúng | |
| E2E-AC-4 | HTTP live + SQL | check "E2E-AC-4/ST-1.AC-9": đơn PAID 50000 đưa về CANCELLED bằng SQL (+2 `SALE_REVERSAL`), GET, hủy lần nữa, đóng ca `countedCash` 100000 | GET 200 status `CANCELLED`, `cancelReason` "Khách trả hàng (cũ)", `cancelledAt` khác null; hủy lại 409 `INVOICE_NOT_OPEN` "Đơn không còn mở.", snapshot không đổi (2 reversal); đối soát `[0,0,100000,"MATCHED"]` | như plan | spec:29 "Không xóa hay sửa dữ liệu `CANCELLED` cũ"; SPRINT.md:36 "hóa đơn `CANCELLED` cũ không đổi và vẫn xem được" | Đúng | |
| E2E-AC-5 | HTTP live | `scripts/r1-report.mjs`: seed 3 PAID ngày 2026-11-14 (cash 35000, transfer 50000, 0đ), MANAGER hủy đơn cash | báo cáo trước/sau `[3,35000,50000,85000]`; hủy → 409 `INVOICE_PAID_IMMUTABLE`; đơn còn PAID (r1-e2eac5-report.log) + `test_ST2_AC1_paid_zero_cancelled` ok | như plan | spec:35 "đổi số ... báo cáo" là thất bại | Đúng | |
| E2E-AC-6 | SQL + HTTP + migration | `SELECT code FROM permissions WHERE code LIKE 'invoice.cancel%'`; `/auth/me` OWNER/MANAGER/CASHIER; migrate 2 lần | chỉ `invoice.cancel_open`; permissions cancel của owner, manager, cashier = `["invoice.cancel_open"]`; chạy migration lần đầu 15 migration, lần hai "No migrations are pending" (0) (r1-st2-migration-updown.log, r1-st2ac1-migrate-run1/2.log, r1-http-run.log) | như plan | spec:21 "Gỡ quyền `invoice.cancel_paid` khỏi DB" | Đúng | |
| E2E-AC-7 | UI unit + browser thật | `npm test` UI; Playwright 1024x768 trên UI sandbox: đăng nhập CASHIER, mở Hóa đơn: drawer PAID, drawer OPEN, dialog hủy; mô phỏng thanh toán ở máy khác | drawer PAID (HDD4APF9LQ "Đã thanh toán"): không nút "Hủy hóa đơn này", không chữ hoàn tiền (r1-e2eac7-paid-drawer.png); drawer OPEN: có nút, enabled, dialog hủy "Đơn hàng sẽ chuyển sang trạng thái đã hủy." (…open-drawer.png, …cancel-dialog-open.png); đơn thanh toán ở "máy khác" (201) rồi POST: server thật 409 `INVOICE_PAID_IMMUTABLE`, dialog hiện "Đơn đã thanh toán không thể hủy. (Mã yêu cầu: <uuid>)", GET đọc lại sau lỗi, không toast thành công, đơn cuối PAID (…paid-immutable-error.png, r1-e2eac7-console.log). Unit: test `PB16: PAID invoice cannot be confirmed...` và `T5-stale: server error triggers reload` ok | như plan | DESIGN.md:874; spec:16 "UI hiện thông báo từ server, tải lại đơn và không báo thành công" | Đúng | Ở bước mô phỏng, lần GET đơn trước POST được phát lại bằng bản OPEN cũ (page.route) để tái hiện race; POST và lỗi là của server thật |
| E2E-AC-8 | rg | `rg -n "invoice\.cancel_paid\|CANCEL_NOT_ALLOWED\|CANCEL_EXCEEDS_DRAWER" POS_API/src POS_UI/src POS_UI/test -g "!**/database/migrations/**"` từ gốc repo | không in dòng nào, `rg EXIT=1` (r1-ac-rg-and-dist.log); các khớp chỉ còn trong 2 file migration (ShiftExpenses cũ, RemoveCancelPaidPermission mới) | exit 1 | spec:17 (tìm không còn kết quả) + user duyệt loại trừ thư mục migrations | Đúng | |
| E2E-AC-9 | — | không chạy lượt này: chờ bước 10b | — | — | — | Không chạy | không tính FAIL |
| E2E-AC-10 | build+test | API `npm test` (gồm build), UI typecheck/build/test | API 347/347 EXIT=0; UI typecheck, build EXIT=0, test 230/230 EXIT=0 | exit 0, fail 0 | — | Đúng | `npm run build` API chạy trong `npm test`, tsc không lỗi |
| ST-1.AC-1 | HTTP live + test | như E2E-AC-1 | 409 + snapshot không đổi; `[PB16-1]` ok | như plan | BR-110 | Đúng | |
| ST-1.AC-2 | HTTP live + test | như E2E-AC-2 | 409 cả hai; `[PB16-2]` ok | như plan | BR-110 | Đúng | |
| ST-1.AC-3 | HTTP live + test | check "ST-1.AC-3": PAID chuyển khoản 30000 (seed), PAID 0đ `S9ZERO` `complete-zero` 204 | cả hai 409 `INVOICE_PAID_IMMUTABLE`; payments/transfer_attempts không đổi; `used_count` S9ZERO 1; 0 reversal; `[PB16-3]` ok | như plan | BR-110 | Đúng | |
| ST-1.AC-4 | HTTP live + test | check "ST-1.AC-4": đóng ca `countedCash` 125000, MANAGER hủy | 409 `INVOICE_PAID_IMMUTABLE` (không `CANCEL_NOT_ALLOWED`); snapshot và `cash_reconciliations` không đổi; `[PB16-4]` ok | như plan | spec:28 "không hủy đơn của ca đã đóng" | Đúng | |
| ST-1.AC-5 | HTTP live + test | check "ST-1.AC-5": `{}`, `{"reason":"   "}`, 256 ký tự | 422 `CANCEL_REASON_REQUIRED` "Cần nhập lý do hủy đơn." x2, 422 `VALIDATION_ERROR` x1, snapshot không đổi; `[PB16-5]` ok | như plan | spec:63 thứ tự 422 trước | Đúng | |
| ST-1.AC-6 | HTTP live + test | check "ST-1.AC-6": MANAGER chi nhánh B, OWNER store khác, MANAGER `branch_id` NULL, PLATFORM_ADMIN, MANAGER bị thu hồi `invoice.cancel_open` (DELETE rồi khôi phục trong finally, kiểm lại 1 dòng) | 404 `NOT_FOUND` "Không tìm thấy hóa đơn." x3; admin 403 `PERMISSION_DENIED`; MANAGER bị thu hồi 403; snapshot không đổi; `[PB16-6]` ok | như plan | spec:63 | Đúng | |
| ST-1.AC-7 | HTTP live + test | check "ST-1.AC-7" | CASHIER 200 CANCELLED; OWNER mở ca `POST /work-shifts` 201 và hủy 200, `cancelled_by` = OWNER; OWNER không ca hủy đơn của CASHIER 409 `SHIFT_NOT_OPEN`, đơn vẫn OPEN; `[PB16-7]` ok | như plan | spec:30 | Đúng | |
| ST-1.AC-8 | HTTP live + ls | check "ST-1.AC-8" + `ls POS_API/dist/sales/tests` | MANAGER chi nhánh B và `branch_id` NULL không ca → 404 "Không tìm thấy hóa đơn.", đơn `{status:'OPEN', cancelled_by:null}`; dist/sales/tests chỉ có invoices-read, manager-cancel, paid-immutable, payment, sales; không `cancel-paid` (r1-ac-rg-and-dist.log); `[R1-1]` ok | như plan | errors/20261113-cancel-open-scope-order-untested.md | Đúng | |
| ST-1.AC-9 | HTTP live + test | như E2E-AC-4 | như E2E-AC-4; `[PB16-9]` ok | như plan | spec:29 | Đúng | |
| ST-1.AC-10 | HTTP live + test | như E2E-AC-5 | như E2E-AC-5; `test_ST2_AC1_paid_zero_cancelled` ok | như plan | — | Đúng | |
| ST-1.AC-11 | HTTP live + test | `[PB16-RF2]` (serialized) + 6 vòng đồng thời thật trên API live | `[PB16-RF2]` ok: pay 201, cancel 409 `INVOICE_NOT_OPEN` "Đơn không còn mở.", PAID, `cancel_reason` null, 0 reversal. Live 6 vòng: thua/thắng đều nhất quán (pay thắng: pay 201, cancel 409 `INVOICE_NOT_OPEN`; cancel thắng: cancel 200, pay 409), không vòng nào hai bên cùng thắng, 0 reversal | như plan | G-2 (user đã xác nhận) | Đúng | |
| ST-1.AC-12 | integration test | `[PB16-RF5]` ok trong full suite (r1-st4ac1-api-test.log:3054) và chạy riêng file (r1-st1ac14-mutation.log baseline) | `lockSequence` `[]`, không INSERT/UPDATE/DELETE | như plan | — | Đúng | không tự bắt SQL ở live; dùng test có sẵn |
| ST-1.AC-13 | HTTP live + test | check "ST-1.AC-13": id viết HOA | 409 `INVOICE_PAID_IMMUTABLE`, snapshot không đổi; `[PB16-8]` ok | như plan | M-15 | Đúng | |
| ST-1.AC-14 | đột biến | trên `dist/sales/sales.service.js`: đặt SELECT status + throw 409 trước `this.invoice()`; chạy `paid-immutable.integration.test.js` | baseline 15 pass; đột biến: `not ok 6 [PB16-6]` (`409 !== 404`) → 13 pass, 2 fail (test con + test cha); hoàn tác `cmp` giống hệt gốc, sha256 trùng; chạy lại 15 pass / 0 fail (r1-st1ac14-mutation.log) | ≥1 test đỏ | errors/20261113-... "đột biến đảo thứ tự" | Đúng | |
| ST-2.AC-1 | migration + test | migrate DB sandbox; `foundation.test.ts` trong full suite | 15 migration chạy (đếm "executed successfully" = 15), lần hai 0; `foundation.test.ts:38` = 15 và `:39` = 0, `entity-schema.integration.test.ts:27` = 15, test xanh | 15 rồi 0 | M-29 | Đúng | |
| ST-2.AC-2 | SQL + test | `SELECT code FROM permissions WHERE code LIKE 'invoice.cancel%'` + test `test_PB16_ST2_AC2_only_cancel_open_remains` | `[invoice.cancel_open]`; vai trò CASHIER, MANAGER, OWNER; PLATFORM_ADMIN 0 dòng; test ok (r1-st4ac1-api-test.log:140) | như plan | — | Đúng | |
| ST-2.AC-3 | migration up/down/up | `migration:revert` rồi `migration:run` hai lần (SQL đếm role_permissions) | A: 60 liên kết; sau down 62 (+MANAGER, OWNER cùng `invoice.cancel_paid`, description "Hủy đơn đã thanh toán khi ca của đơn còn mở"); sau up 60 = A; up thêm lần nữa "No migrations are pending"; test `test_PB16_ST2_AC3_...` ok | như plan | `20261113000000-ShiftExpenses.ts:19-27` | Đúng | |
| ST-2.AC-4 | HTTP live | check "E2E-AC-6/ST-2.AC-4" | `/auth/me` OWNER/MANAGER (và CASHIER) = `["invoice.cancel_open"]`; MANAGER hủy PAID 409 `INVOICE_PAID_IMMUTABLE`; `[PB16-ST2]` ok | như plan | M-10 | Đúng | |
| ST-2.AC-5 | integration test | `[S9-01][ST-1.AC-3] new permissions granted...` ok (r1-st4ac1-api-test.log:3737); `git diff` `shift-expenses.integration.test.ts` = 0 thêm, 1 xóa (dòng `invoice.cancel_paid`) | còn assert `shift.expense` = CASHIER, MANAGER, OWNER (SQL sandbox cũng cho kết quả này) | như plan | — | Đúng | |
| ST-3.AC-1 | UI unit | test `T5-open-shift: drawer enables OPEN only for own current cashier shift; PAID has no cancel button` ok (r1-st4ac2-ui.log:459); diff drawer: `{isOpenStatus && canCancelOpen && (` | PAID không có Button; OPEN ca mình enabled, không ca disabled | như plan | DESIGN.md:874 | Đúng | Browser xác nhận cùng hành vi (E2E-AC-7) |
| ST-3.AC-2 | UI unit | test `PB16: PAID invoice cannot be confirmed and shows no refund guide` ok (…:393); diff modal: không còn `isPaid`/`formatVND`/chữ hoàn tiền | nút danger disabled, 0 GET, 0 POST, không chữ "Hoàn lại"... | như plan | — | Đúng | |
| ST-3.AC-3 | UI unit | test `T5-stale: server rejection codes show server message and reload without success` ok (…:453) | 5 mã (INVOICE_PAID_IMMUTABLE, INVOICE_NOT_OPEN, TRANSFER_PENDING, PERMISSION_DENIED, NOT_FOUND): chữ hiện code + req, 2 lần GET, không success | như plan | — | Đúng | |
| ST-3.AC-4 | UI unit | test `T5-stale: server error triggers reload` ok (…:429) + browser thật (E2E-AC-7) | "Đơn đã thanh toán không thể hủy. (Mã yêu cầu: ...)", 2 GET, không success | như plan | — | Đúng | |
| ST-3.AC-5 | UI unit | `[B-63] rail dùng cùng quyền với route...` ok (…:177), `test_ST5_AC2_ma_tran_route_vai_tro` ok, `test_ST8_AC8_main_router_dang_nhap` ok; diff `App.tsx:109`, `navigation.ts:32` chỉ còn `invoice.read`/`invoice.cancel_open` | rail có "Hóa đơn" với `invoice.read` hoặc `invoice.cancel_open`; route invoices render; trong browser CASHIER vào `/hoa-don` thấy danh sách | như plan | — | Đúng | |
| ST-3.AC-6 | typecheck | `npm run typecheck` | EXIT=0 (r1-st4ac2-ui.log) | exit 0 | — | Đúng | |
| ST-3.AC-7 | rg | như E2E-AC-8 | exit 1, không dòng | exit 1 | — | Đúng | lưu ở r1-ac-rg-and-dist.log (không phải evidence/ST-3/rg.log của tdd) |
| ST-3.AC-8 | browser test | `node --test test/stock-ledger-router.browser.mjs` | 9 tests, 9 pass, 0 fail, EXIT=0 | 0 fail | — | Đúng | |
| ST-4.AC-1 | npm test | như E2E-AC-10 | 347/347, `# fail 0`, EXIT=0 | exit 0, fail 0 | — | Đúng | Postgres dùng 127.0.0.1:5432 (DATABASE_URL của POS_API/.env) thay vì 15432 theo chỉ dẫn môi trường lượt này |
| ST-4.AC-2 | UI | như E2E-AC-10 | 3 lệnh exit 0, 230/230 | exit 0 | — | Đúng | |
| ST-4.AC-3 | rg | như E2E-AC-8 | exit 1 | exit 1 | — | Đúng | |
| ST-5.AC-1 | — | không chạy lượt này: chờ bước 10b | — | — | — | Không chạy | không tính FAIL |
| ST-5.AC-2 | — | không chạy lượt này: chờ bước 10b | — | — | — | Không chạy | không tính FAIL |

## Đối chiếu spec
| Mục của spec (nguyên văn) | Loại | AC hoặc bước đã chạy | Kết quả thật | Kết luận |
|---|---|---|---|---|
| "Không còn cách nào, qua API hay UI, để hủy một đơn đã thanh toán; gọi API hủy đơn `PAID` trả lỗi rõ ràng." | mục tiêu | E2E-AC-1..2, E2E-AC-7, ST-1.AC-1..6, 13 | API 409 `INVOICE_PAID_IMMUTABLE` mọi vai trò; UI không nút | Đúng |
| "Hủy đơn `OPEN` hoạt động y như trước (kể cả `MANAGER`)." | mục tiêu | E2E-AC-3, ST-1.AC-7 | CASHIER/MANAGER/OWNER 200; ngoài phạm vi 404; không ca 409 | Đúng |
| "Mọi hóa đơn `CANCELLED` đã có vẫn xem được và không thay đổi; báo cáo, đối soát, sổ kho cũ không đổi số." | mục tiêu | E2E-AC-4, E2E-AC-5 | GET 200, đối soát `[0,0,100000,MATCHED]`, báo cáo không đổi | Đúng |
| "Khi người dùng bấm hủy một đơn vừa được thanh toán ... UI hiện thông báo từ server, tải lại đơn và không báo thành công." | mục tiêu | E2E-AC-7, ST-3.AC-3/4 | browser thật + unit | Đúng |
| "Tìm `invoice.cancel_paid`, `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER` trong mã, test, UI và tài liệu hiện hành ... không còn kết quả." | mục tiêu | E2E-AC-8 (mã, test, UI); phần tài liệu thuộc E2E-AC-9 | mã/test/UI exit 1; tài liệu chưa kiểm | Đúng cho mã/UI; phần tài liệu: không chạy lượt này (chờ bước 10b) |
| "Gỡ quyền `invoice.cancel_paid` khỏi DB ... bằng migration mới." | mục tiêu | E2E-AC-6, ST-2.* | quyền gỡ, down khôi phục | Đúng |
| "Gỡ mã lỗi `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER` và toàn bộ logic hủy `PAID` ... khỏi API." | mục tiêu | E2E-AC-8; diff `sales.service.ts` (`cancelPaid()` bị xóa, `git diff` 5 thêm/39 xóa) | không còn dấu vết trong src | Đúng |
| "UI không còn thao tác hủy đơn đã thanh toán ...; mock UI khớp." | mục tiêu | ST-3.*; diff `mockEngine.ts` (1 thêm/72 xóa) | typecheck, test xanh | Đúng |
| "Đồng bộ tài liệu: BR, `docs/api-spec.md` ..." | mục tiêu | ST-5 | không chạy lượt này: chờ bước 10b | Không chạy |
| "Không hoàn tiền một phần, không hủy đơn của ca đã đóng, không sửa hay điều chỉnh hóa đơn `PAID`." | phi mục tiêu | ST-1.AC-4; xem diff | không có hành vi làm thừa (không endpoint mới, không điều chỉnh) | Đúng |
| "Không xóa hay sửa dữ liệu `CANCELLED` cũ ... không đổi enum `SALE_REVERSAL` và trạng thái `CANCELLED`." | phi mục tiêu | ST-1.AC-9; SQL | dữ liệu cũ nguyên vẹn; CHECK/enum không đổi (không migration nào ngoài quyền) | Đúng |
| "Không đổi hành vi hủy đơn `OPEN` hay quyền `invoice.cancel_open`." | phi mục tiêu | ST-1.AC-7, ST-2.AC-2 | `invoice.cancel_open` vẫn CASHIER, MANAGER, OWNER | Đúng |
| "Không sửa migration đã chạy; không sửa spec lịch sử." | phi mục tiêu | `git status` | chỉ thêm 1 migration mới, không sửa migration cũ; spec lịch sử không bị sửa | Đúng |
| Phản mục tiêu: "Còn đường nào hủy được đơn `PAID`" | phản mục tiêu | live API, mọi vai trò, mọi phương thức, ca đóng | không còn đường | Đúng |
| Phản mục tiêu: "Làm mất, đổi số hoặc ẩn hóa đơn `CANCELLED` cũ" | phản mục tiêu | E2E-AC-4/5 | không | Đúng |
| Phản mục tiêu: "Hỏng hủy đơn `OPEN` hoặc thanh toán hiện có." | phản mục tiêu | full suite 347 pass + RF-2 live | không hỏng | Đúng |
| Ràng buộc: "Chỉ thay schema bằng migration TypeORM mới; ... cập nhật số migration gắn cứng" | ràng buộc | ST-2.AC-1 | 15 ở `foundation.test.ts:38` và `entity-schema.integration.test.ts:27` | Đúng |
| Ràng buộc: "Khi đổi mã lỗi, cập nhật danh sách lỗi của spec và `docs/api-spec.md` cùng lúc với code (M-4)." | ràng buộc | ST-5 | docs chưa sửa, chờ bước 10b | Không chạy lượt này |
| Ràng buộc: "Thay đổi quyền kiểm bằng HTTP với vai trò thật (M-10)." | ràng buộc | ST-1.AC-2/6, ST-2.AC-4 | đã kiểm | Đúng |

Ghi chú tài liệu: `docs/BUSINESS_RULES.md:308` (BR-110) còn câu "Mã và test chưa đổi" và `sprints/sprint-11/SPRINT.md:36-37` còn ☐; đây là phần tài liệu thuộc ST-5/bước 10b, không phải lệch hành vi (BR-110, S11-01, S11-02 khớp hành vi thực tế). Không coi là FAIL lượt này.

## FAIL / bug (mỗi FAIL cũng được lưu vào sổ `fails.md`)
- Không có.

## Lệch tài liệu
- Không có. (BR-110 `:308` "Mã và test chưa đổi" là câu lỗi thời chờ bước 10b, không mâu thuẫn quy tắc.)

## Đánh giá test
- `paid-immutable.integration.test.ts` kiểm hành vi thật qua HTTP với PostgreSQL thật, snapshot trước/sau, khóa dòng (`lockSequence` rỗng), đua đồng thời tuần tự hóa; đột biến đảo thứ tự bắt được (PB16-6 đỏ). Không thấy skip hay assert rỗng (`# skipped 0`).
- Test migration so sánh khác biệt tập `role_permissions` mà không gõ chuỗi mã quyền, đúng ý plan.
- Test UI nạp qua `node:vm` có đủ case PAID, stale, mã lỗi.
- Khoảng trống nhỏ: RF-5 (không khóa/không ghi) chỉ kiểm bằng test có sẵn, không tự bắt SQL trên API live.

## Exploratory
- Không có body → 422 `CANCEL_REASON_REQUIRED`; uuid sai → 422 `VALIDATION_ERROR`; không đăng nhập → 401 `UNAUTHENTICATED`; thiếu CSRF → 403 `CSRF_INVALID`; gọi hủy PAID hai lần → 409, 409, đơn vẫn PAID.
- Case của lỗi cũ `manager-cancel-open-behavior-untested`: MANAGER thật hủy PAID (409), hủy OPEN của ca mình (200), bị thu hồi quyền (403).
- Case lỗi cũ `cancel-open-scope-order-untested`: MANAGER chi nhánh khác/`branch_id` NULL không ca hủy OPEN → 404; đột biến đảo thứ tự → test đỏ.
- M-39: kiểm browser 1024x768, nút "Hủy hóa đơn này" hiển thị và enabled với đơn OPEN của ca mình; screenshot lưu evidence. Không đo tương phản/kích thước chạm riêng (không thuộc phạm vi thay đổi).
- DB seed cho UI dùng mật khẩu tạm của sandbox; DB đã drop.

## Đề xuất
- Bước 10b: sửa tài liệu theo ST-5 (BR-110 bỏ "Mã và test chưa đổi", `api-spec.md` thêm `INVOICE_PAID_IMMUTABLE`, README, SPRINT S11-01/S11-02) rồi chạy lại E2E-AC-9, ST-5.AC-1, ST-5.AC-2.
- Cập nhật mục "Ảnh hưởng tới code hiện có" của plan để ghi `entity-schema.integration.test.ts:27` (đã sửa đúng theo M-29).
