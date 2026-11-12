---
id: 20261109-sepay-unsigned-webhook-status
tags: [sales, api, sepay, webhook, auth]
found_by: ac-verifier
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Webhook SePay không có header chữ ký trả 400 thay vì 401 (V2-2)

## Triệu chứng
- Webhook thiếu cả `X-SePay-Signature` và `X-SePay-Timestamp` trả 400 `INVALID_WEBHOOK_PAYLOAD` ("Thời gian webhook không hợp lệ."), trong khi `specs/invoices.md:122` yêu cầu "request unsigned khi đã cấu hình trả 401 INVALID_WEBHOOK_SIGNATURE". Không có mutation DB. RED: `qa-evidence/20261109-fix-v2-2/red.log` (`400 !== 401`). Bằng chứng phát hiện: `.devloopflow/verify/20261109-sprint08-payment/evidence/r2-api-run/r2-unsigned.txt`.

## Nguyên nhân gốc
- `verifySePayWebhookRequest` kiểm timestamp trước chữ ký, nên request không có header nào bị loại ở nhánh timestamp (400). Đã xác minh bằng RED.

## Cách fix
- `POS_API/src/sales/sepay-webhook.service.ts` — thêm một dòng sau kiểm secret (503) và trước kiểm timestamp: chữ ký thiếu/rỗng → 401 `INVALID_WEBHOOK_SIGNATURE`. Quyết định của Product Owner 09/11/2026: sửa code để 401 theo spec.
- Test tái hiện: `POS_API/src/sales/tests/payment.integration.test.ts::test_ST6_unsigned_without_headers_returns_401 [V2-2]` (không header và hai header rỗng; DB không đổi). Full API 126/126 exit 0 (`qa-evidence/20261109-fix-v2-2/main-api-full.log`, local do agent chạy).

## Quy tắc phòng tránh
- Xác thực (có chữ ký hay không) phải được kiểm trước tham số định dạng của payload; request chưa xác thực nhận 401, không nhận lỗi payload.
- Ca chưa quy định: có chữ ký nhưng thiếu/rác timestamp vẫn trả 400 `INVALID_WEBHOOK_PAYLOAD`; chưa có test bảo vệ, chờ Product Owner chốt.

## Dấu hiệu nhận biết khi review
- Thứ tự kiểm tra webhook: secret → chữ ký có mặt → timestamp → HMAC.
