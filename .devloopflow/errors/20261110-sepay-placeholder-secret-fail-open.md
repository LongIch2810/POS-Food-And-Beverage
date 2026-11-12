---
id: 20261110-sepay-placeholder-secret-fail-open
tags: [sales, webhook, sepay, auth, secret, config]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Chuỗi placeholder trong `.env.example` vượt ngưỡng 32 byte, webhook SePay chấp nhận chữ ký công khai (R6-1, R7-1)

## Triệu chứng
- Nguồn: review vòng 6 (đọc bù) của task `20261109-sprint08-payment`, finding R6-1 [Medium]; review vòng 7 nêu thiếu file lỗi (R7-1).
- Người dùng chép `POS_API/.env.example` hoặc `POS_INFRA/.env.example` mà không đổi `SEPAY_WEBHOOK_SECRET`, chạy với `SEPAY_ENV=test` và mở endpoint ra ngoài. Kẻ tấn công ký HMAC bằng chuỗi placeholder (công khai trong repo), gửi đúng mã lượt QR và số tiền, và webhook trả 200 thay vì 503. Đơn có thể chuyển PAID mà không có tiền thật.
- Output RED lúc tái hiện (`tdd`, khi bỏ guard): `200 !== 503` (`expected: 503`, `actual: 200`) ở test `[R6-1] webhook refuses placeholder secret`.

## Nguyên nhân gốc
- Chuỗi placeholder mới `<separate-random-secret-at-least-32-bytes>` dài 42 byte, vượt ngưỡng 32 byte của `sePayWebhookSecret()`. Ngưỡng đó đúng nhưng không chặn giá trị mẫu. Lỗi do chính thay đổi R5-2 (đổi mẫu cho đúng quy tắc 32 byte) gây ra.
- Đã xác minh bằng RED ở trên.

## Cách fix
- File và thay đổi:
  - `POS_API/src/auth/auth-config.ts` (hàm `sePayWebhookSecret`, dòng ~17-19): trả `null` khi giá trị khớp `^<.*>$` sau khi trim; giữ điều kiện `SEPAY_ENV==='test'` và ≥ 32 byte.
  - `POS_API/.env.example` và `POS_INFRA/.env.example`: để trống `SEPAY_WEBHOOK_SECRET` kèm chú thích tối thiểu 32 byte và không dùng giá trị mẫu.
  - `README.md:29` và `THIRD_PARTY_INTEGRATIONS.md:10` (sync-docs D-8, D-9, đã duyệt 10/11/2026): nêu yêu cầu này.
- Test tái hiện:
  - Unit: `POS_API/src/auth/tests/auth-config.test.ts::[R6-1] SePay webhook secret rejects the <placeholder> template from .env.example`.
  - HTTP: `POS_API/src/sales/tests/payment.integration.test.ts::[R6-1] webhook refuses placeholder secret` (ký đúng bằng chuỗi mẫu, nhận 503 `SERVICE_UNAVAILABLE`, DB trước/sau không đổi).
- Kiểm chứng: API `npm run build` exit 0; `npm test` 137/137 pass, exit 0 (sandbox PostgreSQL local, lượt sau khi sửa). Chưa có CI độc lập.

## Quy tắc phòng tránh
- Một ngưỡng độ dài không đủ để chặn giá trị mẫu công khai: secret cấu hình phải kiểm cả dạng placeholder.
- Khi đổi giá trị mẫu trong `.env.example`, kiểm đường fail-closed của code (thiếu/ sai → 503) và kiểm giá trị mẫu có vượt qua kiểm tra không.

## Dấu hiệu nhận biết khi review
- Mẫu `.env.example` có giá trị đủ dài nhưng vẫn công khai trong repo.
- Hàm đọc secret chỉ kiểm độ dài, không kiểm nội dung.
