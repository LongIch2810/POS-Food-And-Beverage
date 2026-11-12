# Kiểm AC report 20261109-sprint08-payment — vòng 2 (chạy lại V1-1)

## Kết luận
PASS cho phạm vi chạy lại (V1-1 / ST-6.AC-1 phần JSON hỏng + hồi quy webhook). Tổng thể task chưa đóng vì V1-2, V1-3 (Lệch tài liệu) và V1-4 (Không có chứng cứ) còn mở, ngoài phạm vi lần này.
- Ngày: 2026-11-09. Nhãn: **local do agent chạy** (ac-verifier), không phải CI/QA độc lập. Report do agent chính ghi lại từ report của subagent (subagent bị chặn ghi file report); agent chính chưa mở lại từng artifact thô.
- Commit 48ed476, working tree dirty (68 mục).
- Plan: .devloopflow/plans/active/20261109-sprint08-payment.md. Spec: .devloopflow/specs/20261109-sprint08-payment.md, 20261109-sprint08-payment-api.md, specs/invoices.md.

## Tài liệu nguồn đã đối chiếu
plan (:125, :136, :210, :258), specs/invoices.md (:105, :112-125), THIRD_PARTY_INTEGRATIONS.md, docs/api-spec.md, docs/DESIGN_DB_POS_SYSTEM.md, docs/BUSINESS_RULES.md:162, AGENTS.md (mục QA), .devloopflow/errors/20261109-sepay-malformed-json-code.md, qa-evidence/20261109-fix-v1-1/run.md, report-1.md, fails.md, POS_API/src/http/api-error.filter.ts, POS_API/src/sales/sepay-webhook.service.ts:13-34.

## Môi trường
- `npm run migration:run` rồi `node dist/main.js` (POS_API), DATABASE_URL trỏ DB riêng `pos_s8_verify2` trong container sandbox `pos_sprint08_test_pg` (127.0.0.1:55432); secret tạm (không ghi). Lần hai khởi động lại không có SEPAY_WEBHOOK_SECRET để kiểm 503. API http://localhost:3000/api/v1. Không chạy UI.
- Đã dọn: dừng API theo PID, DROP DATABASE pos_s8_verify2 WITH (FORCE); không down -v, không xóa volume, không động pos_local.

## Kết quả test
- `npm test` POS_API: exit 0; 125 test, 125 pass, 0 fail, 0 cancelled, 0 skipped (qa-evidence/20261109-173135-48ed476-s8-verify-ac-r2/api-test.stdout.log, api-test.exit). Có `ok 6 - test_ST6_malformed_json_returns_invalid_webhook_payload [V1-1]`. Lần 1: 124.
- Coverage: dự án không có lệnh coverage.

## Đã đối chiếu errors
.devloopflow/errors/20261109-sepay-malformed-json-code.md: kịch bản (R2-C1, C7, C10) và quy tắc phòng tránh (R2-C2, C3, U*) đều chạy. Đạt.

## Bảng đối chiếu
Bằng chứng: `.devloopflow/verify/20261109-sprint08-payment/evidence/r2-api-run/` (http-log.jsonl tag R2-*, db-snapshots.txt BEFORE/AFTER).

| AC/ca | Kết quả thật | Mong đợi | Tài liệu | Kết luận |
|---|---|---|---|---|
| ST-6.AC-1 R2-C1 `not-json` ký đúng | 400 INVALID_WEBHOOK_PAYLOAD "Nội dung webhook không hợp lệ."; DB trước=sau | 400 INVALID_WEBHOOK_PAYLOAD | plan :125, :136; specs/invoices.md:105 mục 7 | Đúng |
| R2-C2 `not-json` chữ ký sai | 401 INVALID_WEBHOOK_SIGNATURE; DB không đổi | 401 | specs/invoices.md:105 mục 7 | Đúng |
| R2-C3 `not-json` timestamp cũ 1h, ký đúng | 400 INVALID_WEBHOOK_PAYLOAD "Thời gian webhook không hợp lệ."; DB không đổi | từ chối | specs/invoices.md:105 mục 7; plan :135 ±5 phút | Đúng |
| R2-C3b JSON hợp lệ timestamp cũ | 400 INVALID_WEBHOOK_PAYLOAD; DB không đổi | từ chối | như trên | Đúng |
| R2-C3c JSON hợp lệ chữ ký sai | 401; DB không đổi | 401 | như trên | Đúng |
| R2-C6 body rỗng ký đúng | 400 INVALID_WEBHOOK_PAYLOAD; DB không đổi | quy tắc chung | specs/invoices.md:105 mục 7 | Đúng |
| R2-C6b `[1]`; R2-C10 JSON cụt | 400 INVALID_WEBHOOK_PAYLOAD; DB không đổi | như trên | như trên | Đúng |
| R2-C4 JSON hợp lệ ký đúng, QR PENDING | 200 {"success":true}; đơn PAID, 1 payment 40.000 WEBHOOK, event 880001:PAID | PAID | plan :210; specs mục 6, 9 | Đúng |
| R2-C5/C5b/C5c replay | 200; DB không đổi | không đổi dữ liệu | plan :210; specs mục 6 | Đúng |
| R2-C7 `not-json` ký đúng sau PAID | 400 INVALID_WEBHOOK_PAYLOAD, có requestId; DB không đổi | như C1 | envelope plan :136 | Đúng |
| R2-S1/S2/S3 thiếu secret | 503 SERVICE_UNAVAILABLE kể cả JSON hỏng; DB không đổi | 503 | specs/invoices.md:122 | Đúng |
| R2-U3/U4 có timestamp, thiếu signature | 401 INVALID_WEBHOOK_SIGNATURE; DB không đổi | 401 | specs/invoices.md:122 | Đúng |
| R2-C9 text/plain + `not-json` ký đúng | 401 (rawBody không giữ); DB không đổi | không quy định | — | Tài liệu không quy định |
| R2-C2b/U1/U2 không header nào | 400 INVALID_WEBHOOK_PAYLOAD "Thời gian webhook không hợp lệ."; DB không đổi | specs/invoices.md:122: "request unsigned khi đã cấu hình trả 401 INVALID_WEBHOOK_SIGNATURE" | | Lệch tài liệu (Low) |
| npm test POS_API | 125/125, exit 0 | | | Đúng |
| Không chạy lại | E2E-AC-1..7, ST-1..5, ST-7, ST-8, R2-1, RF-1..5, phần còn lại ST-6; V1-4 (không có tài khoản/secret SePay Test) | | | Không chạy lại |
| V1-2, V1-3 | chỉ đọc file, lệch còn nguyên | | | Lệch tài liệu |

## Đối chiếu spec
specs/invoices.md:105 mục 6 (401/400 không mutation), mục 7 (mã), mục 8 (HMAC trước parse; webhook trùng không lặp): Đúng bằng R2-C1..C10. specs/invoices.md:122: 503 thiếu secret Đúng; unsigned không header Lệch.

## FAIL / bug
Không còn FAIL trong phạm vi chạy lại. **V1-1 = PASS.**

## Lệch tài liệu
- **V2-1 (message):** plan :136 và specs/invoices.md:122 ghi INVALID_WEBHOOK_SIGNATURE 401 “Không xác thực được thông báo ngân hàng.”, INVALID_WEBHOOK_PAYLOAD 400 “Không đọc được thông báo ngân hàng.”; thực tế “Chữ ký webhook không hợp lệ.”, “Nội dung webhook không hợp lệ.”, “Thời gian webhook không hợp lệ.”. Mã/HTTP đúng. Có trước fix. Cần user quyết.
- **V2-2 (không header):** specs/invoices.md:122 "request unsigned khi đã cấu hình trả 401 INVALID_WEBHOOK_SIGNATURE"; thực tế thiếu cả hai header → 400 INVALID_WEBHOOK_PAYLOAD (timestamp kiểm trước chữ ký, sepay-webhook.service.ts:13-22). Không mutation. Cần user quyết.
- V1-2 còn nguyên: docs/BUSINESS_RULES.md:162, THIRD_PARTY_INTEGRATIONS.md:3, :12.
- V1-3 còn nguyên: docs/api-spec.md 0 lần 7 mã mới; docs/DESIGN_DB_POS_SYSTEM.md 0 lần transfer_attempts; specs/invoices.md:121 "6..34".

## Đánh giá test
Test V1-1 xanh; HTTP thật xác nhận thêm các biến thể (timestamp cũ, rỗng, mảng, cụt, đã PAID). Ca không header và text/plain chưa thấy trong test tự động (verifier chưa đọc test).

## Sai sót của verifier
Khi dọn lỡ chạy `taskkill //F //FI "IMAGENAME eq node.exe"`; `tasklist` sau đó vẫn thấy 7 tiến trình node khác và API còn nghe cổng 3000 nên có vẻ không tác dụng; sau đó chỉ dừng theo PID. Chưa chứng minh tuyệt đối không có tiến trình nào bị dừng.

## Đề xuất
Đóng V1-1; xử lý V1-2, V1-3 (sync-docs, user duyệt), V1-4 (SePay Test mode), quyết V2-1/V2-2, rồi chạy lại verify-ac toàn bộ.
