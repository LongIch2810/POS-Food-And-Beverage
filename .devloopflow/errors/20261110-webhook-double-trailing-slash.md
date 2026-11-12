---
id: 20261110-webhook-double-trailing-slash
tags: [sales, webhook, sepay, http, error-filter]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Regex chuẩn hóa đường dẫn webhook bỏ mọi dấu `/` cuối (B-19, R8-3)

## Triệu chứng
- Nguồn: review vòng 8 của task `20261109-sprint08-payment`, finding R8-3 (Very Low), ghi backlog `B-19`. Đã sửa (10/11/2026).
- `POST /api/v1/payments/sepay/webhook//` với body không phải JSON và không có chữ ký trả 401 `INVALID_WEBHOOK_SIGNATURE`, trong khi `POST .../webhook/` cho 400 `BAD_REQUEST`. Hai path cùng khớp một route nhưng không cùng cách trả lỗi.
- Output RED lúc tái hiện (`tdd`, test `[B-19] double trailing slash is not treated as webhook`): `Only a single trailing slash is normalised to the webhook route: 401 !== 400`.

## Nguyên nhân gốc
- Regex `/\/+$/` trong `POS_API/src/http/api-error.filter.ts:51` bỏ mọi dấu `/` cuối, trong khi router Express chỉ chấp nhận đúng một dấu `/` cuối. Đã xác minh bằng RED ở trên.

## Cách fix
- File và thay đổi: `POS_API/src/http/api-error.filter.ts:51` — `replace(/\/$/, '')` (chỉ bỏ đúng một dấu `/`), giữ `toLowerCase()`.
- Test tái hiện: `POS_API/src/sales/tests/payment.integration.test.ts::[B-19] double trailing slash is not treated as webhook`.
- Kiểm chứng: API `npm run build` exit 0; `npm test` 147/147 pass, exit 0 (sandbox PostgreSQL local, lượt sau sửa). Chưa có CI độc lập.

## Quy tắc phòng tránh
- Khi chuẩn hóa đường dẫn để so khớp, chỉ làm đúng những gì router đã làm, không bỏ thêm ký tự.

## Dấu hiệu nhận biết khi review
- Regex chuẩn hóa dùng `+` hoặc `*` cho ký tự mà router chỉ chấp nhận một lần.
