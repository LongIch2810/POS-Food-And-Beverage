---
id: 20261110-backlog-sepay-secret-minimum-length
tags: [auth, config, sepay, webhook, secret]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Secret webhook SePay không có ngưỡng độ dài tối thiểu (B-4, R4-1)

## Triệu chứng
- Nguồn: review vòng 4 của task `20261109-sprint08-payment`, finding R4-1 (Low), ghi trong backlog `B-4` ngày 2026-11-10.
- `sePayWebhookSecret()` trong `POS_API/src/auth/auth-config.ts` chỉ kiểm có giá trị. `JWT_SECRET` và `CSRF_SECRET` trong `validateAuthConfig()` yêu cầu tối thiểu 32 byte.
- Output RED lúc tái hiện (`tdd`): `not ok 1 - [B-4] ... actual: 'sssssssssssssssssssssssssssssss'  expected: null`.

## Nguyên nhân gốc
- Thiếu ngưỡng độ dài tối thiểu cho secret HMAC của webhook, không đồng nhất với secret JWT/CSRF. Đã xác minh bằng RED ở trên.

## Cách fix
- File và thay đổi:
  - `POS_API/src/auth/auth-config.ts` (hàm `sePayWebhookSecret`) — trả `null` khi `Buffer.byteLength(secret) < 32`; không ghi giá trị secret ra log hay lỗi.
  - `POS_API/src/auth/tests/auth-config.test.ts` — thêm test `[B-4] SePay webhook secret needs at least 32 bytes and SEPAY_ENV=test` (31 byte → null; 32 byte → đúng chuỗi; 16 ký tự 2-byte = 32 byte → đúng chuỗi; `SEPAY_ENV='production'` → null).
  - `POS_API/src/sales/tests/payment.integration.test.ts` (dòng ~95) — đổi fixture `SEPAY_WEBHOOK_SECRET` từ `st7-fake-secret-for-local-tests` (31 byte) thành `st7-fake-secret-for-local-tests-x` (33 byte). Đây là đổi dữ liệu fixture, không đổi assertion; user đã đồng ý ngày 2026-11-10. Không sửa test nào khác.
- Kiểm chứng: API `npm run build` exit 0; `npm test` 132/132 pass. Output lưu tại scratchpad của phiên `tdd`, chưa có CI độc lập.
- Tác động vận hành: secret SePay phải dài tối thiểu 32 byte; secret ngắn hơn khiến webhook trả 503 (cấu hình được coi là thiếu). Không ghi giá trị secret vào tài liệu.

## Quy tắc phòng tránh
- Mọi secret dùng để ký HMAC hoặc xác thực phải có cùng ngưỡng độ dài tối thiểu như các secret đã có trong `auth-config.ts`.
- Khi siết ngưỡng secret, kiểm fixture test đang dùng secret ngắn trước khi chạy, và chỉ đổi dữ liệu fixture khi user đã đồng ý.

## Dấu hiệu nhận biết khi review
- Hàm đọc secret chỉ kiểm `if (process.env.X)` mà không kiểm độ dài.
