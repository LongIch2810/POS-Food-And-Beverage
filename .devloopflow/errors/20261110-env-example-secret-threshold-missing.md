---
id: 20261110-env-example-secret-threshold-missing
tags: [config, docs, sepay, secret, env-example]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Mẫu cấu hình không nêu ngưỡng 32 byte của `SEPAY_WEBHOOK_SECRET` (R5-2)

## Triệu chứng
- Nguồn: review vòng 5 của task `20261109-sprint08-payment`, finding R5-2 (Low). User duyệt sửa ngay (10/11/2026).
- `POS_API/.env.example:11` và `POS_INFRA/.env.example:12` ghi `SEPAY_WEBHOOK_SECRET=<separate-secret-for-test-mode-webhook>` mà không nói secret phải dài tối thiểu 32 byte. Secret ngắn khiến mọi webhook SePay trả 503.
- Không có output lỗi thật vì đây là lỗi tài liệu; kịch bản đã đối chiếu: secret 31 byte → `sePayWebhookSecret()` trả null (`POS_API/src/auth/auth-config.ts`) → `sepay-webhook.service.ts` trả 503 (test `[R5-2]` xanh ngay vì hành vi đã có).

## Nguyên nhân gốc
- Mẫu cấu hình không được cập nhật khi thêm ngưỡng 32 byte cho `SEPAY_WEBHOOK_SECRET` (B-4). Đã xác minh bằng việc đọc hai file mẫu trước khi sửa.

## Cách fix
- File và thay đổi: `POS_API/.env.example` và `POS_INFRA/.env.example` — để trống `SEPAY_WEBHOOK_SECRET` và thêm chú thích tối thiểu 32 byte, không dùng giá trị mẫu (sau đó R6-1 đổi thành giá trị trống; xem `20261110-sepay-placeholder-secret-fail-open.md`).
- Test tái hiện: không áp dụng (tài liệu). Kiểm thay thế: `grep -n "32 byte" POS_API/.env.example POS_INFRA/.env.example` cho kết quả ở cả hai file.
- Test hồi quy biên: `POS_API/src/sales/tests/payment.integration.test.ts::[R5-2] test_ST6_webhook_secret_shorter_than_32_bytes_fails_closed` (xanh, giữ lại).

## Quy tắc phòng tránh
- Khi siết một ràng buộc cấu hình, cập nhật ngay file mẫu và tài liệu chạy cài đặt cùng lúc.

## Dấu hiệu nhận biết khi review
- Biến bí mật mới hoặc đổi ngưỡng nhưng `.env.example` không có chú thích tương ứng.
