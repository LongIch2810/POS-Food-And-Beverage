# Sổ FAIL của task 20261109-sprint08-payment

## Bằng chứng bổ sung do user kiểm ngày 10/11/2026
- User gửi ảnh dashboard SePay, đã lưu nguyên bản local `qa-evidence/20261110-175849-48ed476-v1-4-user-test/sepay-dashboard-user.png`: mã chuyển khoản khớp event/DB và giao diện báo một webhook thành công. Ảnh không hiển thị nhãn Test mode/số tiền; không thấy secret. V1-4 vẫn mở vì các ca khác và chứng cứ còn thiếu như `run.md`.
- V1-4 vẫn `mở`: user báo đã thanh toán, agent thu thập sau giao dịch tại `qa-evidence/20261110-175849-48ed476-v1-4-user-test/run.md`. Ngrok ghi POST webhook HTTP 200 và event ID trùng DB; hóa đơn `HD0DWAKVIL` PAID 25.000đ, một payment WEBHOOK và hai movement SALE. Chưa có dashboard SePay xác nhận provider Test mode, DB trước giao dịch, UI trước/sau hoặc các ca thiếu/dư/muộn/promo; không dùng chứng cứ này để tick PASS hoặc thay verify-ac.

- Task: 20261109-sprint08-payment
- Cập nhật lần cuối: 2026-11-11 (sau lần verify-ac thứ 15; chỉ chạy lại V14-1 và V14-2)
- Điều kiện đóng task: không còn mục `mở` và kết quả mới nhất của mọi AC là PASS.

## Tổng hợp
| Id | AC | Loại | Trạng thái | Phát hiện ở lần | PASS ở lần | Report | Bằng chứng |
|---|---|---|---|---|---|---|---|
| V1-1 | ST-6.AC-1 | Sai (Low) | đã PASS | 1 | 2 | report-1.md, report-2.md | evidence/api-run/http-log.jsonl (lần 1); evidence/r2-api-run/ (R2-C1, C2, C3, C4, C5) |
| V1-2 | E2E-AC-4, E2E-AC-6 | Lệch tài liệu | đã PASS | 1 | 3 | report-1.md, report-3.md | evidence/r3-api-run/ (r3run, r3extra, r3d9, r3-env-*), docs/BUSINESS_RULES.md:162, THIRD_PARTY_INTEGRATIONS.md:3,10,12,23-28, AGENTS.md:29 = CLAUDE.md:29 |
| V1-3 | ST-6/ST-5 (plan :129,:136) | Lệch tài liệu | đã PASS | 1 | 3 | report-1.md, report-3.md | evidence/r3-api-run/r3extra*.stdout.txt, r3-db-schema.txt; docs/api-spec.md:368-374,412,483-484; DESIGN_DB:61-73,354-428,449,549-562,664-667; specs/invoices.md:118,121 |
| V1-4 | SePay Test mode (plan :275,:286) | Không có chứng cứ mới / Môi trường | đã PASS | 1 | 13 | report-1.md, report-7.md, report-8.md, report-9.md, report-10.md | R10 xác nhận dashboard Test mode/account/webhook; 5 giao dịch provider exact/under/over/late/promo với ngrok ACK200, authenticated GET, SQL trước/sau và UI. evidence/r10-final-assertions.json, r10-final-ngrok.json, r10-qa-r10-*-v2.png; run R10 |
| V2-1 | ST-6 (plan :136, specs/invoices.md:122) | Lệch tài liệu (Low) | đã PASS | 2 | 3 | report-2.md, report-3.md | evidence/r3-api-run/r3-error-messages.txt |
| V2-2 | ST-6 (specs/invoices.md:122) | Lệch tài liệu (Low) | đã PASS | 2 | 3 | report-2.md, report-3.md | evidence/r3-api-run/r3unsigned.stdout.txt (U1..U13), r3run.stdout.txt, r3-env-*.txt |
| V3-1 | plan :136 / specs/invoices.md:122 | Lệch tài liệu (Low) | đã PASS | 3 | 7 | report-3.md, report-7.md | evidence/r7-run-live/http.jsonl, db.jsonl, assertions.jsonl (R7-M1a..g, M2a/b, M3, M4, M5) |
| V11-1 | S8-07 / spec mục tiêu UI | Không có chứng cứ đầy đủ | đã PASS | 11 | 13 | report-11.md | qa-evidence/20261111-002226-48ed476-s8-verify-ac-r11/run.md |
| V12-1 | task "Lịch sử review/kiểm AC" (finding đã sửa) | errors/ thiếu | đã PASS (user chọn ghi bù; agent chính kiểm grep) | 12 | 13 | report-12.md | .devloopflow/review/backlog.md:30-41; .devloopflow/errors/INDEX.md; agent chính chạy grep: B-22, B-23, B-24, B-25, B-26, B-27, B-32, B-33 đều 0 file errors/ |
| V3-2 | BR-33 / plan :323 vs schema specs/invoices.md:120, DESIGN_DB:423 | Lệch tài liệu (Low-Medium) | đã PASS | 3 | 8 | report-3.md, report-7.md, report-8.md | R8 nguồn 120/423 đã khớp; HTTP/SQL IN/scope/replay/OUT và UI mới đạt. evidence/r8-source-compare.txt, r8-run-live/, r8-ui-before.*, r8-ui-reopened.*, r8-ui-reload-settled.* |
| V14-1 | ST-8.AC-3(b),(d) | Không có chứng cứ đầy đủ | đã PASS | 14 | 15 | report-14.md, report-15.md | qa-evidence/20261111-185503-48ed476-s8-verify-ac-r15/run.md; browser-network.json; audit.json |
| V14-2 | E2E-AC-8 (hủy → đơn mới) | Không có chứng cứ đầy đủ | đã PASS | 14 | 15 | report-14.md, report-15.md | qa-evidence/20261111-185503-48ed476-s8-verify-ac-r15/run.md; browser-network.json; audit.json |

## Chi tiết
### V14-1 — refresh và bàn cũ với đơn CANCELLED
- Phát hiện: vòng 14; loại Không có chứng cứ đầy đủ; trạng thái: đã PASS (vòng 15).
- Kỳ vọng: plan approved dòng 46 yêu cầu khi refresh trả CANCELLED thì bỏ chọn; danh sách bàn cũ trỏ tới đơn CANCELLED thì tạo đơn tại bàn mới.
- Thực tế: browser và test đã đối chiếu chứng minh các nhánh tương ứng với PAID; ca CANCELLED hiện có đi qua perform hủy, chưa chứng minh hai nhánh trên. Không kết luận có lỗi sản phẩm.
- Bước tiếp: trên sandbox, giữ đơn đang chọn và danh sách bàn cũ, hủy đơn từ phiên khác; kiểm riêng refresh và chạm bàn cũ, lưu UI/network và DB trước/sau. Xem report-14.md V14-1.
- Lịch sử: 2026-11-11 — vòng 14 — FAIL do thiếu chứng cứ — report-14.md; evidence/r14-verify/; qa-evidence/20261111-184300-48ed476-s8-verify-ac-r14-audit/run.md.
- Lịch sử: 2026-11-11 — vòng 15 — PASS, local do agent chạy — report-15.md; qa-evidence/20261111-185503-48ed476-s8-verify-ac-r15/. R1 refresh GET A trả CANCELLED → bỏ chọn/menu disabled; R2 stale-table CANCELLED → tạo HDMIISQZN1 DINE_IN mới đúng bàn. Browser PNG/snapshot/network và DB read-only trước/sau đầy đủ; audit.json so A giữ nguyên sau đóng. Không chạy lại AC khác.
- Tài liệu nguồn: spec task `.devloopflow/specs/20261109-sprint08-payment.md:26`: “UI không chọn đơn đó, làm mới danh sách và coi bàn là trống”; `specs/sales.md:23`: “Chọn bàn trống → tạo đơn DINE_IN”.
- Test tái hiện đề xuất (giữ để tham khảo, không yêu cầu sửa source): `[PAID-DONE-CANCELLED-refresh-table]` | input: selection/danh sách lưu OPEN, server đã CANCELLED | expected: refresh bỏ chọn; chạm bàn cũ tạo DINE_IN mới, không ghi vào đơn CANCELLED.

### V14-2 — hủy A rồi tạo B và thêm món
- Phát hiện: vòng 14; loại Không có chứng cứ đầy đủ; trạng thái: đã PASS (vòng 15).
- Kỳ vọng: E2E-AC-8 plan approved dòng 164 yêu cầu sau hủy A tạo B, thêm món chỉ vào B và A không đổi.
- Thực tế: browser đã chứng minh hủy A và chọn đơn khác, test component bao phủ tạo đơn mới; chưa có browser/network và DB riêng cho chuỗi hủy A → tạo B → thêm món B. Không kết luận có lỗi sản phẩm.
- Bước tiếp: chạy chuỗi trên sandbox, lưu ảnh/snapshot, request/response và DB trước/sau cho A và B; xem report-14.md V14-2.
- Lịch sử: 2026-11-11 — vòng 14 — FAIL do thiếu chứng cứ — report-14.md; evidence/r14-verify/; qa-evidence/20261111-184300-48ed476-s8-verify-ac-r14-audit/run.md.
- Lịch sử: 2026-11-11 — vòng 15 — PASS, local do agent chạy — report-15.md; qa-evidence/20261111-185503-48ed476-s8-verify-ac-r15/. R3 UI hủy A HD7ZEUB3KI → bỏ chọn/menu disabled; tạo B HDGXF6H7HL → POST items chỉ nhắm B, B OPEN có 1 món/25.000đ. DB A giữ CANCELLED, 1 dòng/qty1/25.000đ/updated_at sau hủy không đổi; ảnh/snapshot/network/DB và audit.json đầy đủ. Không dùng nhánh thanh toán thay hủy.
- Tài liệu nguồn: spec task `.devloopflow/specs/20261109-sprint08-payment.md:26`: “Sau khi thanh toán hoặc hủy thành công đơn bị bỏ chọn; nhân viên tạo/mở đơn mới cho khách mới”; `specs/sales.md:25`: “Hai hành vi không thay đổi item snapshot/tổng.”
- Test tái hiện đề xuất (giữ để tham khảo): `[E2E8-cancel-then-next-customer]` | input: A OPEN có món hủy qua UI, tạo mới B rồi thêm món | expected: A CANCELLED giữ món/tổng, request items chỉ nhắm B, B OPEN có món mới; notice hủy không theo B.

### V1-1 — ST-6.AC-1
- Kỳ vọng: webhook JSON hỏng đã ký HMAC → 400 `INVALID_WEBHOOK_PAYLOAD` (plan :136; `specs/invoices.md:122`).
- Thực tế: 400 `BAD_REQUEST` ("Yêu cầu không đọc được."); không có mutation.
- Test tái hiện đề xuất: `test_ST6_malformed_json_returns_invalid_webhook_payload` | input: body thô `not-json` đã ký đúng | mong đợi 400 `INVALID_WEBHOOK_PAYLOAD` (hoặc spec chốt chấp nhận `BAD_REQUEST`).
- Lịch sử: 2026-11-09 — lần 1 — FAIL — evidence/api-run.

### V1-2 — E2E-AC-4, E2E-AC-6 (Lệch tài liệu)
- Plan :93: webhook HMAC hợp lệ tự hoàn tất; MANAGER/OWNER xác nhận thủ công. Hành vi code/test đúng plan.
- `docs/BUSINESS_RULES.md:162`: "BR-33 | TRANSFER: thu ngân xác nhận đã nhận tiền, ghi transaction_ref nếu có. Tự xác nhận qua webhook ngân hàng là phần mở rộng" (trong khi :3 nói BR-33 đã cập nhật). `THIRD_PARTY_INTEGRATIONS.md:3` "chưa triển khai"; :12 "Chưa có script giả lập webhook"; :23 nội dung chuyển khoản dùng `invoice_code` (thực tế mã lượt 18 ký tự).
- Không chọn bên đúng; cần đồng bộ tài liệu (bước 10b sync-docs, chờ user duyệt) rồi chạy lại AC liên quan.

### V1-3 — tài liệu chưa đồng bộ hợp đồng mới
- Plan :129, :136 yêu cầu chép hợp đồng/mã lỗi vào tài liệu. `docs/api-spec.md` có 0 lần các mã `TRANSFER_PENDING`, `TRANSFER_NOT_PENDING`, `BANK_ACCOUNT_REQUIRED`, `BANK_TRANSACTION_REUSED`, `TRANSFER_AMOUNT_INSUFFICIENT`, `INVALID_WEBHOOK_SIGNATURE`, `INVALID_WEBHOOK_PAYLOAD`; `docs/DESIGN_DB_POS_SYSTEM.md` không có `transfer_attempts`/`transaction_ref_kind`; `specs/invoices.md:121` còn "accountNumber 6..34 chữ số", mâu thuẫn :12 ("6–19").

### V1-4 — SePay Test mode thật
- Ghi nhận gốc lần 1: chỉ có webhook ký HMAC cục bộ (chứng minh parser và HMAC), chưa chứng minh nhận tiền tự động đầu cuối trên SePay Test mode.
- Kỳ vọng theo plan nguyên văn (`.devloopflow/approved/20261109-sprint08-payment.md:286`): “(6) lưu artifact dashboard SePay, request webhook đến API, response, GET invoice và DB trước/sau; (7) chạy thêm underpay/overpay/late/promo invalid. Nếu không có tài khoản hoặc dashboard Test mode, đánh dấu tự xác nhận **chưa xác minh end-to-end** dù test HTTP ký local xanh.”
- Nguồn nguyên văn (`THIRD_PARTY_INTEGRATIONS.md:12`): “trong Dashboard SePay bật Test mode, tạo tài khoản và webhook Test mode, sau đó dùng **Mô phỏng giao dịch** với số tiền và nội dung chuyển khoản thử; kiểm tra webhook đến URL đã cấu hình và kết quả đối chiếu.”
- Thực tế lần 9: ảnh user có mã `HD0DWAKVIL1Z7FA1SJ`, một webhook thành công và xác nhận hệ thống; **không thấy nhãn Test mode/số tiền/account/event ID**. Fresh ngrok GET ghi event47447, IN25.000, POST webhook200 success; SQL READ ONLY có invoice/attempt/event PAID, một payment WEBHOOK25.000 actual25.000 excess0, hai SALE SYSTEM. Thiếu mode/account/settings provider, DB trước, authenticated GET invoice, UI trước/sau và bốn ca bổ sung. Chi tiết từng vế trong `report-9.md`.
- Bước tái hiện: audit ảnh/input user run và R9-P1..P9, đối chiếu yêu cầu :286 với artifact từng ca; không tạo giao dịch hoặc giả webhook. Run `qa-evidence/20261110-110834-48ed476-s8-verify-ac-r9/run.md`; raw chỉ local.
- Test tái hiện đề xuất: `test_SePay_provider_test_mode_e2e` | input provider Test mode exact/underpay/overpay/late/promo invalid | expected dashboard event/webhook ACK/authenticated GET invoice/SQL trước-sau/UI nhất quán từng nhánh; không dùng tiền thật hoặc HMAC local thay provider.
- Trạng thái hiện tại: `mở` — vòng 11 thiếu phiên provider đã xác nhận và chưa chạy lại 5 ca. Lịch sử lần 10 đã PASS với đủ 5 ca provider Test mode; giữ lịch sử thiếu chứng cứ lần 1..9, không hủy hoặc giảm AC.
- Lịch sử trạng thái: 2026-11-10 — lần 9 — FAIL — `evidence/r9-final-ngrok-redacted.json`, `r9-final-db-readonly.stdout.txt`, `r9-final-user-artifact-manifest.json`, `r9-artifact-audit.json`; ảnh user gốc theo report. Không huỷ do đổi plan/spec.
- Lịch sử trạng thái: 2026-11-10 — lần 10 — **PASS** — `report-10.md`; `evidence/r10-provider-gate.*`, `r10-final-ngrok.json`, `r10-final.json`, `r10-final-assertions.json`, authenticated GET và ảnh UI v2. Run `qa-evidence/20261110-121158-48ed476-s8-verify-ac-r10/run.md`. Local do agent chạy, không CI độc lập; UI exact/over sau là danh sách OPEN đã reload, không ảnh toast PAID; promo GET/panel tính lại 25k nhưng attempt/DB 24k, giữ link promo và chặn PAID như report.

## Cập nhật sau fix-verify (09/11/2026)
- V1-1: đã sửa, **trạng thái vẫn `mở` cho tới khi verify-ac chạy lại có bằng chứng**. Test tái hiện `POS_API/src/sales/tests/payment.integration.test.ts::test_ST6_malformed_json_returns_invalid_webhook_payload [V1-1]`; file đã sửa `POS_API/src/http/api-error.filter.ts`; RED/GREEN `qa-evidence/20261109-fix-v1-1/` (full API 125/125, exit 0, local do agent chạy); lỗi ghi tại `.devloopflow/errors/20261109-sepay-malformed-json-code.md`.
- V1-2, V1-3 (Lệch tài liệu), V1-4 (Không có chứng cứ): không sửa theo quy tắc fix-verify; chờ user quyết / sync-docs / SePay Test mode.

## Lịch sử lần 2 (09/11/2026, report-2.md)
- V1-1: 2026-11-09 — lần 1 — FAIL — evidence/api-run (tag payload:garbage). 2026-11-09 — lần 2 — **PASS** — evidence/r2-api-run/http-log.jsonl (R2-C1: 400 INVALID_WEBHOOK_PAYLOAD; R2-C2: 401 INVALID_WEBHOOK_SIGNATURE; R2-C3: 400 timestamp cũ), db-snapshots.txt (DB trước=sau), `npm test` 125/125 exit 0 (qa-evidence/20261109-173135-48ed476-s8-verify-ac-r2/). Local do agent chạy.
- V1-2, V1-3: 2026-11-09 — lần 2 — không chạy lại; đọc file thấy tài liệu chưa sửa (BUSINESS_RULES.md:162, THIRD_PARTY_INTEGRATIONS.md:3, api-spec.md 0 mã mới, DESIGN_DB 0 transfer_attempts, specs/invoices.md:121 vẫn 6..34).
- V1-4: 2026-11-09 — lần 2 — không chạy lại: không có tài khoản/secret SePay Test mode.

### V2-1 — message webhook khác plan (Lệch tài liệu, Low)
- Plan :136 / specs/invoices.md:122: 401 “Không xác thực được thông báo ngân hàng.”, 400 “Không đọc được thông báo ngân hàng.”. Thực tế: “Chữ ký webhook không hợp lệ.”, “Nội dung webhook không hợp lệ.”, “Thời gian webhook không hợp lệ.”. Mã lỗi và HTTP status đúng; có trước fix V1-1. Cần user quyết sửa code hay tài liệu. Trạng thái: mở.

### V2-2 — webhook thiếu cả hai header trả 400, tài liệu ghi 401 (Lệch tài liệu, Low)
- specs/invoices.md:122: "request unsigned khi đã cấu hình trả 401 INVALID_WEBHOOK_SIGNATURE". Thực tế thiếu cả hai header → 400 INVALID_WEBHOOK_PAYLOAD (timestamp kiểm trước chữ ký, `sepay-webhook.service.ts:13-22`); không mutation.
- Test tái hiện đề xuất: `test_ST6_unsigned_without_headers_returns_401` | input: body hợp lệ không có header SePay | mong đợi 401 INVALID_WEBHOOK_SIGNATURE, hoặc user chốt chấp nhận 400. Trạng thái: mở.

## Cập nhật sau fix-verify lần 2 (09/11/2026)
- V2-1: user quyết "sửa chữ trong plan và spec theo code". Đã đổi message `INVALID_WEBHOOK_SIGNATURE`/`INVALID_WEBHOOK_PAYLOAD` ở `.devloopflow/plans/active/20261109-sprint08-payment.md:136`, `.devloopflow/approved/20261109-sprint08-payment.md:136` (kèm mục Changelog ghi quyết định của user) và `specs/invoices.md:122`. Trạng thái vẫn `mở` cho tới khi `verify-ac` chạy lại. Không có file `errors/` (không phải lỗi code).
- V2-2: user quyết sửa code để trả 401 khi thiếu chữ ký. Đã sửa bằng TDD: test `POS_API/src/sales/tests/payment.integration.test.ts::test_ST6_unsigned_without_headers_returns_401 [V2-2]` (RED 400!==401), file đã sửa `POS_API/src/sales/sepay-webhook.service.ts`, `npm test` 126/126 exit 0 (`qa-evidence/20261109-fix-v2-2/`, agent chính chạy lại `main-api-full.log`); lỗi ghi tại `.devloopflow/errors/20261109-sepay-unsigned-webhook-status.md`. Trạng thái vẫn `mở` cho tới khi `verify-ac` chạy lại.
- V1-2, V1-3: user duyệt D-1..D-18 và đã sửa tài liệu (xem task, `sync-docs-proposals-1.md`). Trạng thái vẫn `mở` cho tới khi `verify-ac` chạy lại.

## Lịch sử lần 3 (09/11/2026, report-3.md; local do agent chạy)
- V2-2: 2026-11-09 — lần 3 — PASS — evidence/r3-api-run/r3unsigned.stdout.txt (U1..U7, U11..U13 → 401 INVALID_WEBHOOK_SIGNATURE; DB không đổi), r3run.stdout.txt (R3-C1..C10), r3-env-*.txt (503 khi thiếu secret / SEPAY_ENV=live / thiếu SEPAY_ENV); npm test API 126/126 (qa-evidence/20261109-180900-48ed476-s8-verify-ac-r3/). U8..U10 (có chữ ký, timestamp thiếu/rỗng/rác → 400): Tài liệu không quy định.
- V2-1: 2026-11-09 — lần 3 — PASS — message INVALID_WEBHOOK_SIGNATURE/PAYLOAD/timestamp trong plan active, approved, specs/invoices.md:122 khớp từng ký tự response thật (evidence/r3-api-run/r3-error-messages.txt).
- V1-2: 2026-11-09 — lần 3 — PASS (các lệch gốc: BR-33:162, TPI:3/12/23) — đối chiếu D-1..D-10 với tài liệu, API, DB. Văn bản mới có một vế sai ("sai tài khoản") → V3-2.
- V1-3: 2026-11-09 — lần 3 — PASS — D-11..D-18: 7 mã lỗi gây ra thật, route mục 11, idempotency mục 7, schema 6 bảng, 6..19 chữ số.
- V1-4: 2026-11-09 — lần 3 — không chạy lại (không có tài khoản/secret SePay Test mode); giữ `mở`.

### V3-1 — message của 5 mã lỗi mới không khớp plan/spec (Lệch tài liệu, Low)
- Phát hiện ở lần: 3 (report-3.md).
- Kỳ vọng nguyên văn (plan :136, approved :136, specs/invoices.md:122): TRANSFER_PENDING “Đơn đang chờ chuyển khoản. Hủy chờ trước khi sửa hoặc thanh toán.”; TRANSFER_NOT_PENDING “Lượt chuyển khoản không còn chờ xác nhận.”; BANK_ACCOUNT_REQUIRED “Cửa hàng chưa cài tài khoản nhận chuyển khoản.”; BANK_TRANSACTION_REUSED “Giao dịch ngân hàng đã được dùng để xác nhận đơn khác.”; TRANSFER_AMOUNT_INSUFFICIENT “Số tiền thực nhận chưa đủ để thanh toán đơn.”
- Thực tế: TRANSFER_PENDING có 3 biến thể (“…Hủy chờ trước khi sửa hoặc thanh toán.” khớp khi thêm món/áp mã/tiền mặt; “Đơn đang chờ chuyển khoản.” khi tạo QR thứ 2; “Cửa hàng còn mã QR đang chờ thanh toán.” khi đổi tài khoản nhận); TRANSFER_NOT_PENDING “Lượt chuyển khoản không còn chờ.”; BANK_ACCOUNT_REQUIRED “Cửa hàng chưa cấu hình tài khoản nhận tiền.”; BANK_TRANSACTION_REUSED “Giao dịch ngân hàng đã được dùng cho đơn khác.”; TRANSFER_AMOUNT_INSUFFICIENT “Số tiền thực nhận chưa đủ.”. Mã lỗi và HTTP đúng.
- Bằng chứng: evidence/r3-api-run/r3-error-messages.txt, http-log.jsonl; kịch bản R3-E1..E6 (evidence/r3-scripts/r3extra.mjs).
- Test tái hiện đề xuất: test_ST5_ST7_error_messages_match_contract | input: tình huống R3-E1..E6 | mong đợi: error.message đúng chuỗi trong spec (hoặc user chốt sửa chữ tài liệu theo code như V2-1).
- Trạng thái: đã PASS (lần 7; giữ lịch sử FAIL ở dưới)
- Lịch sử trạng thái: 2026-11-09 — lần 3 — FAIL — evidence/r3-api-run/r3-error-messages.txt
- Lịch sử trạng thái: 2026-11-09 — lần 7 — PASS — `evidence/r7-run-live/http.jsonl`, `db.jsonl`, `assertions.jsonl`: 12 kiểm tra response HTTP/code/message/requestId và DB không mutation; có cả TRANSFER_PENDING ở thêm/bỏ mã/CASH/zero/QR thứ hai và message riêng đổi tài khoản.

### V3-2 — "sai tài khoản" trong BR-33/TPI nói báo quản lý, spec và code quarantine nội bộ (Lệch tài liệu, Low-Medium)
- Phát hiện ở lần: 3 (report-3.md).
- Tài liệu A: docs/BUSINESS_RULES.md:162 "Thiếu tiền, sai tài khoản, QR đã hủy, đơn không còn mở hoặc mã giảm hết hiệu lực: giữ đơn chưa PAID và ghi ngoại lệ cho MANAGER/OWNER."; THIRD_PARTY_INTEGRATIONS.md:28 "thiếu/trùng/sai tài khoản hoặc đến muộn thì giữ đơn chưa thanh toán và báo quản lý".
- Tài liệu B: specs/invoices.md:101 "MANAGER/OWNER xem các giao dịch SePay đúng tài khoản nhận của attempt nhưng chưa tự hoàn tất … sự kiện quarantine không bao giờ trả qua route này."
- Thực tế (R3-P2): webhook ký đúng, đúng mã lượt, sai accountNumber → 200 {"success":true}; đơn OPEN, lượt PENDING, không payment; event QUARANTINED, store_id NULL (sepay-webhook.service.ts:95-99); GET /bank-transfer-exceptions chỉ lọc UNDERPAID/ATTEMPT_CANCELLED/INVOICE_NOT_OPEN/PROMOTION_INVALID/DUPLICATE (transfer-attempts.service.ts:186) nên quản lý không thấy. Hành vi khớp B, lệch A. Không chọn bên đúng.
- Bằng chứng: evidence/r3-api-run/r3d9.stdout.txt, results.jsonl; kịch bản evidence/r3-scripts/r3d9.mjs.
- Test tái hiện đề xuất: test_BR33_wrong_account_is_quarantined_not_listed_for_manager | input: webhook ký đúng, đúng mã lượt, sai accountNumber | mong đợi: theo quyết định của user (sửa BR-33/TPI:28 bỏ vế "sai tài khoản", hoặc đổi code/spec để hiện cho MANAGER/OWNER).
- Trạng thái: đã PASS (lần 8; giữ lịch sử FAIL ở dưới)
- Lịch sử trạng thái: 2026-11-09 — lần 3 — FAIL — evidence/r3-api-run/r3d9.stdout.txt
- Lịch sử trạng thái: 2026-11-09 — lần 7 — FAIL / Lệch tài liệu còn lại — hành vi code đã đúng quyết định mới, nhưng `specs/invoices.md:120` và `docs/DESIGN_DB_POS_SYSTEM.md:423` vẫn yêu cầu account khớp mới gắn tenant; chi tiết ở lịch sử lần 7 và report-7.md. Giữ mở, không tự chọn nguồn.
- Lịch sử trạng thái: 2026-11-09 — lần 8 — PASS — hai schema đã có ngoại lệ IN sai account theo quyết định user; `evidence/r8-source-compare.txt`, `r8-run-live/http.jsonl`, `db.jsonl`, `assertions.jsonl` (10/10), UI trước/sau mở lại/reload với snapshot/network/ảnh mới. Không dùng artifact R7 thay chạy mới.

## Cập nhật sau fix-verify lần 3 (09/11/2026)
- V3-1 và V3-2: user quyết "sửa lại code cho cả 2" (và duyệt: sửa đúng 2 assertion cũ ST-6; mã lý do `WRONG_ACCOUNT` chỉ áp dụng tiền vào). Đã sửa bằng TDD: test `[V3-1]`, `[V3-2]`, `[V3-2-out]` (API) và `[V3-2]` (UI); file đã sửa `POS_API/src/sales/sepay-webhook.service.ts`, `transfer-attempts.service.ts`, `POS_UI/src/features/pos/LivePaymentDialog.tsx`; API 129/129 và UI 54/54 exit 0 (`qa-evidence/20261109-fix-v3/`, agent chính chạy lại `main-api-full.log`, `main-ui-full.log`); lỗi ghi tại `.devloopflow/errors/20261109-sepay-wrong-account-hidden.md`. `specs/invoices.md` mục webhook/ngoại lệ đã sửa theo hành vi mới, Changelog ở plan active và approved. Message `TRANSFER_PENDING` khi đổi tài khoản nhận giữ chuỗi riêng. Trạng thái V3-1, V3-2 vẫn `mở` cho tới khi `verify-ac` chạy lại.


## Lịch sử lần 4 (09/11/2026, report-4.md; chưa xác minh)
- V1-4: không có Test mode provider được xác nhận; giữ `mở`.
- V3-1, V3-2: lệnh chuẩn bị sandbox và app bị hệ thống từ chối trước khi chạy (`blocked by policy`); chưa có HTTP/DB/browser mới. Giữ `mở`; xem report-4.md và ma trận `qa-evidence/20261109-verify-r4-ac-verifier/matrix.md`. Test local trước đó không đủ artifact để đóng.

## Lịch sử lần 5 (09/11/2026, report-5.md; chưa xác minh)
- V1-4: chưa có SePay Test mode provider được xác nhận; không chạy; giữ `mở`.
- V3-1, V3-2: tạo DB sandbox riêng thành công, `migration:run` exit 0. Lệnh khởi động API bị auto-review từ chối trước khi chạy (`blocked by policy`); không có HTTP/DB trước-sau/browser mới. Giữ `mở`; xem report-5.md. DB sandbox còn nguyên.

## Lịch sử lần 6 (09/11/2026, report-6.md; chưa xác minh)
- V1-4: không có SePay Webhooks Test mode provider được xác nhận; không gọi provider, giữ `mở`. Không dùng webhook ký HMAC local để thay provider.
- V3-1: startup API sandbox bằng `Start-Process` Node `dist/main.js`, `-WindowStyle Hidden` lại bị automatic approval review từ chối trước khi chạy: `blocked by policy`. Không có HTTP/status/code/message/DB trước-sau mới; giữ `mở`. Bằng chứng `evidence/r6-startup-rejection.txt`, ma trận `evidence/r6-matrix.md`, run `qa-evidence/20261109-verify-ac-r6/run.md`.
- V3-2: cùng blocker startup, chưa có IN/scope/replay/OUT, DB tác dụng phụ hoặc browser UI/network mới; giữ `mở`. Bằng chứng `evidence/r6-startup-rejection.txt`. SQL chỉ đọc `evidence/r6-db-readonly.log` exit 0 có users=0, invoices=0, migrations=9, chỉ chứng minh trạng thái chuẩn bị, không chứng minh hành vi V3.
- Dừng sau lần startup bị chặn, không thử cú pháp/tool khởi động khác; không có process mới, không sửa source/test/config/plan/task, không xóa sandbox hoặc dữ liệu khác. Không chạy test/build/coverage mới, không dùng log test cũ đóng FAIL. Raw artifact chỉ local, không đối chiếu được từ remote.

## Lịch sử lần 7 (09/11/2026, report-7.md; local do agent chạy)

- V1-4: giữ `mở`. Container có `SEPAY_ENV=test` và webhook secret nhưng không có dashboard/provider Test mode được xác nhận hoặc mô phỏng giao dịch từ provider. `evidence/r7-run-live/environment.json`; HMAC local không thay chứng cứ đầu cuối.
- V3-1: **đã PASS**. R7-M1a..g, M2a/b, M3, M4, M5 gây đủ 5 code và các ngữ cảnh đang lệch trước đây: HTTP 409/422, code/message đúng từng ký tự theo contract, requestId khớp header, SQL business state trước=sau từng request. Artifact: `evidence/r7-run-live/http.jsonl`, `db.jsonl`, `assertions.jsonl`; log `evidence/r7-run-live-console.log`. Riêng PATCH bank giữ message “Cửa hàng còn mã QR đang chờ thanh toán.” theo Changelog approved :323.
- V3-2: hành vi mới **đạt** qua R7-W1..4: IN đúng một mã lượt/sai account ACK 200, scoped QUARANTINED; invoice OPEN, attempt PENDING, không payment/stock/movement/promo delta; OWNER/MANAGER đúng branch thấy WRONG_ACCOUNT, branch/store khác không thấy, CASHIER 403; replay không nhân đôi, OUT nội bộ scope NULL. UI MANAGER trước IN chưa có dòng; sau mở lại/reload hiện “Sai tài khoản nhận”, vẫn chờ, có screenshot/snapshot/network trên UI cuối. Artifact `evidence/r7-run-live/`, `r7-ui-before.*`, `r7-ui-reopened.*`, `r7-ui-reload.*`.
- V3-2 vẫn **`mở` / Lệch tài liệu**: approved :323 nói “giao dịch tiền vào có đúng một mã lượt nhưng sai tài khoản nhận được gắn store/branch theo lượt và hiện cho MANAGER/OWNER với lý do `WRONG_ACCOUNT`”, khớp spec :36,:101/BR-33 và thực tế. Nhưng `specs/invoices.md:120` còn “chỉ set tenant/branch sau khi ref duy nhất **và** account snapshot khớp”; `docs/DESIGN_DB_POS_SYSTEM.md:423` cột store_id còn “Chỉ gán khi mã lượt duy nhất và tài khoản khớp snapshot”. Nguồn trích nguyên văn: `evidence/r7-source-compare.txt`. Verifier không sửa hay tự chọn phía đúng. Test tái hiện đề xuất `test_BR33_wrong_account_contract_is_consistent` | input R7-W1 và đối chiếu schema sau quyết định user | expected code/plan/spec/DB docs cùng quy tắc IN sai account.
- Lượt chạy hoàn chỉnh có 22/22 assertion HTTP/DB, harness exit 0; UI suite mới 54/54 exit 0; build API/UI mới exit 0. Không chạy API integration suite do giới hạn không xóa DB/data, không chạy coverage (không có script), không chạy lại AC đã đóng. Run `qa-evidence/20261109-verify-ac-r7/run.md`. Checksum container/local khớp hai API service và hai UI component; sau build dist API vẫn khớp. Không sửa source/test/config/plan/task, không đổi container, không xóa dữ liệu. Hai lỗi chuẩn bị harness được giữ log và không tính là lỗi product; artifact thô chỉ local, không thể kiểm từ remote.

## Lịch sử lần 8 (09/11/2026, report-8.md; local do agent chạy)

- Chỉ kiểm lại V1-4 và V3-2. V3-1 và các AC đã đóng không được kiểm lại hoặc đổi kết quả lịch sử. Không sửa source/test/config/plan/task, không xóa DB/container/data, không dùng chứng cứ R7 thay lần chạy mới.
- V3-2: **đã PASS**. Hai câu schema `specs/invoices.md:120`, `docs/DESIGN_DB_POS_SYSTEM.md:423` hiện có ngoại lệ cho IN một ref sai account, khớp approved :323/BR-33/contract :36,:101. Nguồn mới và SHA256 ở `evidence/r8-source-compare.txt`, `r8-source-hashes.json`. Không hủy finding do đổi scope; yêu cầu vẫn được chạy lại.
- R8-W1..4: 10/10 assertion HTTP/SQL, harness exit 0. IN sai account ACK 200, đúng một scoped QUARANTINED, invoice OPEN, attempt PENDING; payment/stock/movement/promo không đổi. OWNER/MANAGER đúng branch thấy WRONG_ACCOUNT, branch khác/store khác không thấy, CASHIER 403; DTO đúng 5 field. Replay không mutation, OUT QUARANTINED có cả 4 scope ID NULL và không thêm dòng ngoại lệ store. Artifact `evidence/r8-run-live/http.jsonl`, `db.jsonl`, `assertions.jsonl`, `finished.json`; output `r8-run-console.log`.
- UI mới R8-U1..3: trước IN chưa ngoại lệ; sau mở lại và reload hiện “Sai tài khoản nhận · 39.000đ”, vẫn chờ, nền OPEN. Có ảnh/snapshot/network response mới tại `r8-ui-before.*`, `r8-ui-reopened.*`, `r8-ui-reload.*`; ảnh bổ sung rõ sau animation ở `r8-ui-reload-settled.*`. Playwright MCP bị khóa, dùng Playwright local/Chromium hiện có bằng context riêng, không chạm browser người khác. Browser và bridge riêng đã đóng; dữ liệu test giữ nguyên.
- V1-4: **giữ mở**. Có SEPAY_ENV=test và secret ở container nhưng không có dashboard/provider Test mode được xác nhận hay artifact mô phỏng provider mới. `evidence/r8-run-live/environment.json`; không suy từ HMAC local.
- UI suite mới 54/54, build API/UI mới exit 0 (`r8-ui-test.log`, `r8-api-build.log`, `r8-ui-build.log`, các `.result.json`). Không chạy API integration suite vì có cleanup DB, không coverage, không race/load toàn sprint. Artifact audit đã parse/mở lại HTTP/SQL/network/snapshot và xem ảnh; checksum API dist sau build vẫn trùng container. Run `qa-evidence/20261109-211627-48ed476-s8-verify-ac-r8/run.md`; raw chỉ local, không thể kiểm từ remote, không phải CI/runner độc lập. Kết luận vòng 8: FAIL vì còn V1-4; V3-2 đã PASS.

## Lịch sử lần 9 (10/11/2026, report-9.md; local do agent chạy)

- Chỉ kiểm lại **V1-4**, giữ `mở` / Không có chứng cứ đầy đủ. Không đổi trạng thái AC đã đóng, không sửa source/test/config/plan/task hoặc xóa DB/container/data. User tự test provider; verifier không thao tác dashboard, tạo giao dịch, gửi/replay webhook.
- Đã tự mở ảnh user nguyên bản và đọc SQL/ngrok input; ảnh khớp mã/regex, hiện một webhook thành công/hệ thống xác nhận, không hiện Test mode/số tiền/account/event ID. Không suy mode từ `SEPAY_ENV=test` hoặc amount từ ảnh.
- Thu mới health/UI root200, ngrok event47447/IN25.000/code18/POST200 success, SQL READ ONLY exit0: invoice/attempt/event PAID, 1 payment WEBHOOK25.000 actual25.000 excess0, 2 SALE SYSTEM; 8 cờ account/ref/scope/amount/actor/timestamps true; invoice không promo link; toàn DB manual hiện 1 event PAID/1 attempt PAID. Không có DB-before, authenticated GET invoice/UI trước-sau, provider mode/settings hoặc underpay/overpay/late/promo artifact.
- Ma trận mới lập trước lượt đọc nhưng sau giao dịch user. Harness SQL lần đầu lỗi cột `i.store_id`, không mutation; log giữ nguyên `evidence/r9-db-readonly.*` và run `qa-evidence/20261110-110814-48ed476-s8-verify-ac-r9/`. Sửa riêng harness sang `t.store_id`, chụp mới thành công tại `r9-final-*`; không coi lỗi chuẩn bị là lỗi product.
- Audit exit0: SHA256 ảnh khớp input, ngrok input/fresh khớp, 18 bản sao raw khớp, bốn file deployed/local hash khớp, scan secret/account đạt. `evidence/r9-artifact-audit.json`, `r9-provenance.json`; run `qa-evidence/20261110-110834-48ed476-s8-verify-ac-r9/run.md`. Project tests0; không test/build/coverage mới; raw chỉ local, không phải CI/runner độc lập. Bước tiếp: user tự thu các vế thiếu, rồi gọi verify-ac retry; không dựng hồi tố before-state.

## Lịch sử lần 10 (10/11/2026, report-10.md; local do agent chạy)

- Chỉ kiểm lại V1-4, **đã PASS**. User cho phép hoàn tất kiểm mô phỏng; verifier xác nhận trực quan URL/banner/sidebar Test mode và so account POS/provider trong RAM; webhook sandbox/filter/HD16 đúng. Không Live, không đổi settings hoặc sửa dữ liệu cũ.
- Root tạo 5 fixture mới qua API OWNER và hủy riêng QR LATE qua UI. Sau restart lưu DB READ ONLY trước mới; provider gửi 5 event 47546/47549/47552/47555/47557, tất cả ACK200 success. EXACT25k PAID; UNDER24k OPEN/PENDING/UNDERPAID; OVER30k PAID/payment25k/excess5k; LATE25k OPEN/CANCELLED/ATTEMPT_CANCELLED; PROMO24k sau hết hạn OPEN/PENDING/PROMOTION_INVALID, used_count0 và liên kết mã giữ nguyên.
- Mỗi ca có authenticated GET, UI trước/sau và SQL trước/sau; OWNER thấy đủ 3 ngoại lệ. Verifier mở lại ảnh/log, phát hiện ảnh v1 UNDER/PROMO sai locator/dải QR, yêu cầu chụp lại v2 đã che rồi mới PASS; 2 original và 2 bản sao v1 tự tạo đã xóa đúng file, không dùng làm chứng cứ.
- Harness audit exit0: 5 case đúng, 2 payment/4 SALE, doanh thu50k/thực nhận55k/dư5k, delta cà phê−40g/sữa−200ml; 4 file deployed/local hash khớp. Không test runner/build/coverage hoặc regression toàn sprint. Dữ liệu test và app giữ nguyên, không cleanup dữ liệu cũ. Artifact chỉ local, không thể đối chiếu remote; không CI độc lập.
- UI exact/over sau chỉ reload danh sách OPEN không còn đơn; GET và DB PAID, không suy toast/màn PAID. Promo UI/GET tính lại25k trong khi QR/DBsnapshot24k; code link vẫn giữ, event bị chặn. Chi tiết giới hạn trong report. Không có finding code mới hoặc lệch tài liệu bắt buộc mới trong V1-4.


## Lịch sử lần 11 (11/11/2026, report-11.md; local do agent tự chạy)

- User/agent chính giao nghiệm thu lại toàn bộST/E2E/R2/RF sauR14-1; không dựa chứng cứR10 đểPASSR11. API150/UI65,buildAPI/UI/typecheck đềuexit0; danh sáchtest,rawoutput,HTTP/SQL/browser trong `qa-evidence/20261111-002226-48ed476-s8-verify-ac-r11/run.md`.
- V1-4 **mở lại**: R11-PROVIDER BLOCKED vì không có phiên/dashboard/CDP/Testmodeproviderđượcxácnhận; chưa chạy5giao dịchprovider trên phiênbảncuối. Giữ nguyên lịch sử PASSR10, không khẳng định providerhỏng. Gate FAIL vì thiếuproofmới. Bằng chứng: `qa-evidence/20261111-002226-48ed476-s8-verify-ac-r11/provider-browser-tool-output.json`, environment-live.json; expected và testđềxuất giữ theo V1-4 gốc.
- Lịch sử trạng thái V1-4: 2026-11-11 — lần11 — BLOCKED / mở — `qa-evidence/20261111-002226-48ed476-s8-verify-ac-r11/run.md`; không hủyAC/đổispec.
- R14-1 BR103 PASS local: capHTTP/SQL422noMutation/exactcap201/race[201,422]/closeexpected1e12MATCHED; so REDcũ “Missing expected rejection.”. Không lỗi sản phẩm mới đã xác minh trong các ca thực chạy.
- V1-1/V2-2/V3-1/V3-2 được runner mới kiểm; không sửa/xóa lịch sử.

### V11-1 — S8-07/spec mục tiêu UI (Không có chứng cứ đầy đủ)
- Phát hiện ở lần11: report-11.md.
- Nguồn/kỳ vọng: sprints/sprint-08/SPRINT.md bảngS8-07 và spec hành vi Mục tiêuUI: hiển thị kết quả server thật; planST8/E2E4/E2E6 và QA browser yêu cầu cácchuyểntrạngtháitrên UIcuối.
- Thực tế: đã có CASH/zero/retry/QRpending/fallback/reload/crossstoreUI; **chưa chạy lại browser manualconfirm và auto-PAID do provider**. API/manual trả201 và DB đúng nhưng không thay proofUItransition. Tình huống: NOT VERIFIED; không phải bugcode đã táihiện.
- Bước tái hiện/kiểm tiếp: QRpending→MANAGER/OWNER formref/actual/reason→201→UIsuccess, sauđó providerexact/over→pollPAID; lưu before/after/network/DB.
- Bằng chứng đã có và thiếu: `qa-evidence/20261111-002226-48ed476-s8-verify-ac-r11/browser-network.jsonl`, ui-*.json/png,db.jsonl; không có rawbrowserhai transition nêu trên.
- Test tái hiện đềxuất: test_S8_07_browser_manual_and_provider_paid_transitions; input cácnhánhtrên; expected success sau backend xácnhận,khôngpayment/stocklặp.
- Trạng thái: mở.
- Lịch sử trạng thái: 2026-11-11 — lần11 — NOT VERIFIED — `qa-evidence/20261111-002226-48ed476-s8-verify-ac-r11/run.md`.


## Lịch sử lần 12 (11/11/2026, report-12.md; local do agent chạy)

- Kết luận lần 12: **FAIL** (V1-4 BLOCKED, V11-1 NOT VERIFIED một phần, V12-1 mới). Subagent `ac-verifier` bị ngắt nhiều lần và không ghi được file; agent chính ghi `report-12.md` và mục này từ báo cáo trả về, sau khi tự mở lại `evidence/r12-api-test.stdout.txt` (API 150/150), `evidence/r12-ui-test.stdout.txt` (UI 65/65), `evidence/r12-live/assertions.jsonl` (70/70 PASS) và danh sách `evidence/r12-ui-interrupted-run/`. Ảnh PNG, `http.jsonl`, `db.jsonl` chưa được agent chính đọc lại. Bằng chứng thô chỉ có local.
- V1-4: giữ `mở`. Lịch sử trạng thái: 2026-11-11 — lần 12 — BLOCKED — không có phiên dashboard SePay Test mode; 5 ca provider chưa chạy lại trên mã cuối; PASS vòng 10 giữ nguyên lịch sử, không dùng làm PASS vòng 12.
- V11-1: giữ `mở`. Lịch sử trạng thái: 2026-11-11 — lần 12 — NOT VERIFIED một phần — CASH/zero/retry UI có ảnh và network trong `evidence/r12-ui-interrupted-run/` (r12-ui-cash-*, r12-ui-zero-*); chưa có chuyển trạng thái UI cho xác nhận thủ công và auto-PAID do webhook.
- V1-1, V2-2, V3-1, V3-2: không đổi trạng thái `đã PASS`. Lịch sử trạng thái bổ sung: 2026-11-11 — lần 12 — PASS (runner mới) — evidence/r12-live/assertions.jsonl: X-V1-1, X-V2-2, X-V31-*, X-V32-* (theo subagent; agent chính chỉ đếm 70/70 PASS, chưa đối chiếu từng ID).
- R14-1, R2-1: PASS trong runner mới (R14-*, R21-*), không có FAIL.

### V12-1 — finding đã sửa nhưng không có file errors/ (errors/ thiếu)
- Phát hiện ở lần 12: report-12.md.
- Kỳ vọng theo plan/quy trình: mỗi finding đã sửa trong task file có file `.devloopflow/errors/` đủ mục hoặc lý do hợp lệ không ghi (`ac-verifier.md` bước 10).
- Tài liệu nguồn: `ac-verifier.md` bước 10; `.devloopflow/review/backlog.md` dòng 30–41 (mục backlog trạng thái `đã sửa`).
- Thực tế: B-22, B-23 (một phần), B-24, B-25, B-26, B-27, B-32, B-33 là finding Low/Very Low đã sửa qua fix-backlog (test hoặc tài liệu), có dòng ở `review/backlog.md`, **không có file `errors/`** (agent chính chạy `grep -l`, 0 file mỗi id). Các id khác (B-13..B-16, B-18, B-20, R3-2, R4-2, R4-4, R6-2, R8-2, R8-4, R9-2..R9-5, R10-1..R10-3, R11-1/2, R12-1..R12-4, R13-1) subagent báo là chờ xử lý, không sửa hoặc đã gộp; chưa xác minh từng id.
- Bước tái hiện: `grep -oE "(B|R)[0-9]+(-[0-9]+)?"` trên task file mục "Lịch sử review", "Lịch sử kiểm AC", rồi `grep -l "<id>\b" .devloopflow/errors/*.md`.
- Test tái hiện đề xuất: errors_cover_fixed_findings | input: danh sách id đã sửa trong task | kết quả mong đợi: mỗi id có file `errors/` hoặc lý do được user chấp nhận.
- Trạng thái: mở. Tài liệu không quy định backlog Low có được miễn file `errors/` hay không; chờ user quyết, không tự coi là hợp lệ.
- Lịch sử trạng thái (chỉ thêm): 2026-11-11 — lần 12 — FAIL — report-12.md; .devloopflow/review/backlog.md:30-41.
- Xử lý V12-1 (2026-11-11, agent chính theo yêu cầu user "fix v12-1"; verify-ac chưa chạy lại nên CHƯA đổi sang `đã PASS`): đã ghi errors/ cho B-22 (`20261110-webhook-timestamp-boundary-flaky.md`), B-23+B-27 (`20261110-cancel-qr-forbidden-cases-missing.md`), B-26 (`20261110-test-order-dependency-b16-user.md`), bổ sung B-24 vào `20261110-payment-test-event-id-collision.md`; INDEX đã thêm 4 dòng. B-25, B-32, B-33 là sửa tài liệu: không tạo errors/ theo tiền lệ B-28, lý do ghi ở `review/backlog.md` (dòng cuối); cần user xác nhận. Ai sửa: agent chính. Kiểm bằng `grep -l "<id>" .devloopflow/errors/*.md`: B-22/B-24/B-26/B-27 = 1 file, B-23 = 2 file.

### Cập nhật lần 12b (11/11/2026 16:48–17:00 UTC+7, agent chính, local do agent chạy; chi tiết ở `report-12.md` mục "Phụ lục 12b")
- V1-4 (vẫn `mở`): đã thu thập bằng chứng provider SePay Test mode trên mã cuối: 5 giao dịch từ màn mô phỏng của user (#48010 EXACT 25.000, #48011 UNDER 24.000, #48012 OVER 30.000, #48013 LATE mã lượt A đã hủy, #48014 PROMO mã giảm hết hạn lúc QR chờ) → webhook HMAC qua ngrok tới API sandbox, tất cả HTTP 200 `{"success":true}`; DB trước/sau cho PAID/UNDERPAID/PAID(dư 5.000)/ATTEMPT_CANCELLED/PROMOTION_INVALID; dashboard xác nhận Test mode, giao dịch và lịch sử gửi #69557–#69561 `200 OK`. Bằng chứng: `evidence/r12-provider/{ngrok-webhooks.redacted.json,sepay-dashboard-after.txt,audit-*.json}`, `evidence/r12-sepay-dashboard-capture.txt`. Chưa đổi sang `đã PASS`: cần `ac-verifier` chạy lại để đối chiếu và kết luận; chưa kiểm replay cùng event id từ provider và GET invoice qua curl có xác thực.
  - Lịch sử trạng thái: 2026-11-11 — lần 12b — bằng chứng provider mới đã thu thập, chờ ac-verifier kết luận — `evidence/r12-provider/`.
- V11-1 (vẫn `mở`): đã có UI auto-PAID do webhook (ảnh trước/sau + DB), xác nhận thủ công của MANAGER trên UI (2 lần: ảnh trước/sau + DB; lần 2 có network `POST …/confirm-manual` → 201), danh sách ngoại lệ hiển thị cho MANAGER (3 ngoại lệ từ provider). Còn thiếu: network browser của ca auto-PAID, viewport tablet ngang đúng thiết kế (thực đo 1407×731), kết luận của ac-verifier. Bằng chứng: `evidence/r12-provider/ui/*.png`, `evidence/r12-provider/ui-network-manual-confirm.redacted.txt`.
  - Lịch sử trạng thái: 2026-11-11 — lần 12b — bằng chứng UI bổ sung đã thu thập, chờ ac-verifier kết luận — `evidence/r12-provider/ui/`.
- Quan sát ngoài AC: danh sách "Đơn đang mở" của thu ngân không tự làm mới khi đơn khác được thanh toán qua webhook (đơn OVER còn hiện cho tới khi bấm "Tải lại đơn"); tài liệu không quy định, chưa tính là FAIL.

## Lịch sử lần 13 (11/11/2026, report-13.md; local do agent chạy)
- Kết luận lần 13: **FAIL** (cổng chưa đóng vì V12-1). Chạy lại chỉ V1-4, V11-1, V12-1 (AC khác không chạy lại). Mã chạy provider là mã cuối: `git status` hiện tại khớp `evidence/r12-git-status-before.txt`, không file `POS_API/src`/`POS_UI/src` đổi sau 09:48Z (agent chính đã chạy lại kiểm này). Subagent ac-verifier trả nội dung dạng văn bản; agent chính ghi file.
- V1-4: lịch sử trạng thái: 2026-11-11 — lần 13 — PASS đề xuất — `evidence/r12-provider/` (ngrok, audit-*, dashboard, API log), `evidence/r13-local-api.json`, `evidence/r13-local-db-readonly.json`. 5 ca đúng kỳ vọng plan :286; provider_event_id, số tiền, ref khớp giữa DB, ngrok, dashboard; payment/movement chỉ ở các ca PAID; header `SePay-Testmode-Webhook/1.0`. Giới hạn: dashboard là văn bản chép, thiếu ảnh/output thô; chưa replay cùng id từ provider; promo hết hạn bằng SQL; webhook muộn sau xác nhận thủ công chưa qua provider. Trạng thái vẫn `mở` cho tới khi user chấp nhận giới hạn. Ai sửa: để trống.
- V11-1: lịch sử trạng thái: 2026-11-11 — lần 13 — PASS đề xuất cho auto-PAID và xác nhận thủ công. Ảnh `ui/*.png` kèm log API (webhook 200 rồi GET invoice 200; confirm-manual 201 lúc 16:55:28 và 16:56:53), DB MANUAL có `confirmed_by` manager và movement USER, giữ ca gốc. Bù `evidence/r13-ui-1024-*.png` (1024x768, QR PENDING, reload cùng mã, 3 ngoại lệ cho MANAGER qua DOM). Chưa phủ: network browser của ca auto-PAID và xác nhận thủ công lần 1; ảnh QR lỗi/hủy chờ/bank settings/đổi session trên UI cuối; ảnh r12 chụp viewport 1407 (băng máy tính theo `DESIGN.md:56-57`). Vẫn `mở`. Ai sửa: để trống.
- V12-1: lịch sử trạng thái: 2026-11-11 — lần 13 — chưa đóng, Tài liệu không quy định. Bốn file errors/ mới đủ mục template, có nguồn, có dòng INDEX. Thiếu file riêng hoặc lý do miễn: B-13, B-15, B-16 (chỉ bị nhắc trong file khác), B-18, B-20 (không có lý do miễn ghi), B-25, B-28, B-32, B-33 (miễn theo tiền lệ B-28); ngoài backlog: R4-2, R4-4, V1-2, V1-3, V2-1. Chờ user quyết. Ai sửa: để trống.

## Quyết định của user sau lần 13 (11/11/2026)
- V1-4 và V11-1: user trả lời "1 chấp nhận để PASS" cho câu hỏi chấp nhận các giới hạn của report-13 (dashboard dạng văn bản, chưa replay cùng event id từ provider, promo hết hạn bằng SQL, chưa có network browser của ca auto-PAID, ảnh r12 chụp viewport 1407px). Hai mục chuyển `đã PASS` theo quyết định này của user; **đây là chấp nhận có điều kiện của user, không phải kết luận độc lập của ac-verifier** (ac-verifier chỉ đề xuất PASS ở `report-13.md`).
  - Lịch sử trạng thái V1-4: 2026-11-11 — lần 13 — PASS (user chấp nhận giới hạn) — `report-13.md`, `evidence/r12-provider/`.
  - Lịch sử trạng thái V11-1: 2026-11-11 — lần 13 — PASS (user chấp nhận giới hạn) — `report-13.md`, `evidence/r12-provider/ui/`, `evidence/r13-ui-1024-*.png`.
- V12-1: user trả lời "2 ghi vào". Agent chính ghi 6 file errors/ mới cho B-13, B-15, B-16, B-18+B-25, B-20, B-28+B-32+B-33 (`20261110-webhook-negative-cases-test-missing.md`, `20261110-promo-last-use-two-pending-qr-test-missing.md`, `20261110-branch-scope-http-test-missing.md`, `20261110-third-party-doc-stale-status-wording.md`, `20261110-spec-missing-409-conflict-transfer-attempt.md`, `20261110-readme-status-stale.md`) cùng 6 dòng INDEX; trước đó đã có B-22, B-23+B-27, B-26, B-24. Kiểm bằng grep: mỗi id trong 9 id thiếu có đúng một file riêng và một dòng INDEX; các file tham chiếu trong nội dung đều tồn tại. Nội dung lấy từ `review/backlog.md` và task, không thêm thông tin ngoài nguồn. R4-2 và R4-4 (ghi chú review đã sửa tại chỗ) và V1-2, V1-3, V2-1 (đã có bản ghi chi tiết ngay trong sổ này) không tạo file riêng. Chưa chạy lại ac-verifier cho bước này.
  - Lịch sử trạng thái V12-1: 2026-11-11 — sau lần 13 — PASS (user chọn ghi bù; agent chính kiểm grep, chưa có ac-verifier chạy lại).
- Phạm vi của "đã PASS" ở trên: chỉ ba mục của sổ này. Task CHƯA đủ điều kiện đóng: theo `report-12.md`/`report-13.md` các vế ST-8.AC-1/AC-2 (QR lỗi fallback, hủy chờ, bank settings 19/20 chữ số, đổi session trên UI cuối), E2E-AC-5/7 vế UI và từng dòng ma trận AC ↔ test chưa có kết luận PASS ở vòng 12/13, và chưa có `run.md` theo `AGENTS.md`.

## Lịch sử lần 17 — nghiệm thu mọi AC của plan (11/11/2026)
- Report: `report-17.md`. Kết luận **PASS cho 29 AC của plan trong phạm vi local**, giữ V1-4/V11-1 là PASS theo user chấp nhận có điều kiện; không gọi là CI độc lập, không kiểm Live. Không có FAIL mới, không xóa/đổi lịch sử cũ hoặc yêu cầu user chấp nhận lại.
- Full checks mới trên PostgreSQL sandbox riêng: API155/155, UI85/85, API build/UI typecheck/UI build exit0. Command/start/end/exit và raw output ở `qa-evidence/20261111-194533-48ed476-s8-verify-ac-r17/process-results.json`, `run.md`, các `*.stdout.txt`/`*.stderr.txt`.
- Bổ sung ST1 role/promo trước/sau migration thật; browser UI cuối ba ca PAID stale-table, PAID stale-list, thanh toán A → tạo B → chỉ thêm món B. Có ảnh/ARIA/network và SQL read-only trước/sau; `r17b-browser-results.json` ghi3/3PASS; `roles-result.json` ghiPASS. Không dùng hash mới thay hash R14 bị thiếu.
- Đã đối chiếu Q15 bốn hash và Q16 toàn187 hash với hiện tại (đều trùng); Q11 API source liên quan trùng, foundation test đã đổi và được full suite R17 chạy lại. `test-map.md/json` nối95 tên test thật với source và output `ok`, gồm ST1 alias, R2-1 hai thứ tự lock, PAID-DONE/MGR-CANCEL.
- V12-1 giữ kết quả ghi bù: các hồ sơ user yêu cầu trong INDEX hiện tồn tại; các ngoại lệ ghi tại chỗ giữ lý do trước đó. Không có mục `mở` mới. `initialInvoiceId` PAID được xác minh component, không tuyên bố màn Hóa đơn demo đã nối API.
- Cleanup: `cleanup-final.json` container `pos_s8_r12_pg` về exited, không listener13217/15327/15432, browser đóng, fixture passwords invalidated, không xóaDB/volume/source. Raw chỉ cólocal, không đối chiếu được từremote. Verifier không sửa plan/task hoặc đóngtask/sprint.
