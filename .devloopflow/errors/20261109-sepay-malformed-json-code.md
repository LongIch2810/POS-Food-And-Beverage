---
id: 20261109-sepay-malformed-json-code
tags: [sales, api, sepay, webhook, error-handling]
found_by: ac-verifier
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Webhook SePay JSON hỏng trả BAD_REQUEST thay vì INVALID_WEBHOOK_PAYLOAD (V1-1)

## Triệu chứng
- Webhook có body không phải JSON (`not-json`) đã ký HMAC hợp lệ trả 400 `BAD_REQUEST` ("Yêu cầu không đọc được."); plan :136 và `specs/invoices.md:122` yêu cầu 400 `INVALID_WEBHOOK_PAYLOAD`. Không có mutation DB. RED: `qa-evidence/20261109-fix-v1-1/red.log` (`actual 'BAD_REQUEST'`, `expected 'INVALID_WEBHOOK_PAYLOAD'`).

## Nguyên nhân gốc
- Trình parse JSON của framework từ chối body hỏng trước khi handler/service webhook chạy, nên lỗi đi thẳng qua `ApiErrorFilter` với mã chung 400. Đã xác minh bằng RED.

## Cách fix
- `POS_API/src/http/api-error.filter.ts` — với POST `/api/v1/payments/sepay/webhook` lỗi 400 chưa có mã riêng: kiểm chữ ký/timestamp trên raw body (`verifySePayWebhookRequest`); sai chữ ký trả lỗi chữ ký (401); hợp lệ trả 400 `INVALID_WEBHOOK_PAYLOAD`.
- Test tái hiện: `POS_API/src/sales/tests/payment.integration.test.ts::test_ST6_malformed_json_returns_invalid_webhook_payload [V1-1]` (gồm chữ ký sai vẫn 401 và DB không đổi). Full API 125/125 exit 0 (`qa-evidence/20261109-fix-v1-1/main-api-full.log`, local).

## Quy tắc phòng tránh
- Mã lỗi riêng của một route phải đi qua cả lỗi tầng parser; kiểm thứ tự xác thực trước phân loại lỗi payload.

## Dấu hiệu nhận biết khi review
- Route dùng `rawBody` + HMAC mà lỗi parse JSON vẫn ra mã chung. Lưu ý thiết kế: filter ở lớp `http/` import từ `sales/` (phụ thuộc ngược lớp); cân nhắc đưa hook vào module sales nếu thêm webhook khác.
