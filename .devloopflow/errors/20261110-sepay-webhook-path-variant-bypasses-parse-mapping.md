---
id: 20261110-sepay-webhook-path-variant-bypasses-parse-mapping
tags: [sales, webhook, sepay, http, error-filter]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Biến thể đường dẫn webhook không được ánh xạ lỗi đúng (R7-3)

## Triệu chứng
- Nguồn: review vòng 7 của task `20261109-sprint08-payment`, finding R7-3 (Very Low). User duyệt sửa ngay (10/11/2026).
- `POST /api/v1/payments/sepay/webhook/` (có `/` cuối) hoặc `/api/v1/payments/SePay/Webhook` với JSON hỏng và không có chữ ký trả 400 `BAD_REQUEST`, thay vì 401 `INVALID_WEBHOOK_SIGNATURE`. Không có tác dụng phụ trong DB.
- Output RED lúc tái hiện (`tdd`, `POS_API/src/sales/tests/payment.integration.test.ts::[R7-3]`): `Unsigned malformed request on /api/v1/payments/sepay/webhook/ must be unauthenticated`, `400 !== 401`; `# pass 58  # fail 2`.

## Nguyên nhân gốc
- `sePayParseFailure` trong `POS_API/src/http/api-error.filter.ts` so sánh `request.path` thô với `/api/v1/payments/sepay/webhook`. Express mặc định không phân biệt hoa thường và chấp nhận `/` cuối, nên biến thể đường dẫn vẫn tới route webhook nhưng không được ánh xạ lỗi. Đã xác minh bằng RED ở trên.

## Cách fix
- File và thay đổi: `POS_API/src/http/api-error.filter.ts` (dòng ~51) — so sánh `request.path.replace(/\/+$/, '').toLowerCase()`.
- Test tái hiện: `POS_API/src/sales/tests/payment.integration.test.ts::[R7-3] malformed JSON on trailing-slash webhook path` (không chữ ký → 401; chữ ký đúng → 400 `INVALID_WEBHOOK_PAYLOAD`; số dòng `bank_transfer_events` không đổi).
- Kiểm chứng: API `npm run build` exit 0; `npm test` 138/138 pass, exit 0 (sandbox PostgreSQL local, lượt sau sửa). Chưa có CI độc lập.

## Quy tắc phòng tránh
- So sánh đường dẫn route nhạy cảm (đặc biệt webhook xác thực bằng chữ ký) phải chuẩn hóa như Express đã chuẩn hóa khi khớp route.

## Dấu hiệu nhận biết khi review
- Điều kiện lọc theo `request.path` so sánh chuỗi cố định mà không chuẩn hóa `/` cuối hoặc hoa thường.
