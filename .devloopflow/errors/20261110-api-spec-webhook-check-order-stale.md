---
id: 20261110-api-spec-webhook-check-order-stale
tags: [docs, api-spec, sepay, webhook, validation-order]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Tài liệu mô tả sai thứ tự kiểm webhook SePay (B-8, R6-4)

## Triệu chứng
- Nguồn: review vòng 6 (đọc bù) của task `20261109-sprint08-payment`, finding R6-4 (Low, lệch tài liệu), ghi backlog `B-8`. Đã sửa (10/11/2026).
- `docs/api-spec.md:374` ghi `INVALID_WEBHOOK_PAYLOAD` cho "chữ ký đúng nhưng timestamp không hợp lệ", trong khi code kiểm timestamp trước HMAC. Chữ ký giả kèm timestamp cũ hơn 301 giây trả 400, không phải 401.
- Output thật: `sepay-webhook.service.ts:14-24` (thứ tự: thiếu secret 503 → thiếu chữ ký 401 → timestamp 400 → HMAC 401).

## Nguyên nhân gốc
- Mô tả tài liệu không theo đúng thứ tự kiểm của code. Đã xác minh bằng đọc `sepay-webhook.service.ts`.

## Cách fix
- File và thay đổi: `docs/api-spec.md:374` — mô tả theo thứ tự: timestamp thiếu, sai định dạng hoặc lệch quá ±300 giây bị 400 và kiểm trước HMAC; chữ ký sai bị 401.
- Test tái hiện: không áp dụng (tài liệu). Kiểm thay thế: `grep -n "INVALID_WEBHOOK_PAYLOAD" docs/api-spec.md` (dòng 374 có nội dung mới) và đọc `sepay-webhook.service.ts:14-24`.

## Quy tắc phòng tránh
- Khi mô tả thứ tự kiểm (validate, xác thực, parse) trong tài liệu, lấy đúng thứ tự từ code, không suy ra từ tên lỗi.

## Dấu hiệu nhận biết khi review
- Bảng mã lỗi ghi điều kiện xác thực không khớp thứ tự kiểm thực tế của handler.
