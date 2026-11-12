---
id: 20261110-payment-preview-reload-error-swallowed
tags: [ui, dialog, payment, transfer, error-handling]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Lỗi tải lại số tiền khi đổi lượt QR bị nuốt im lặng (B-21, R9-1)

## Triệu chứng
- Nguồn: review vòng 9 của task `20261109-sprint08-payment`, finding R9-1 (Low), ghi backlog `B-21`. Đã sửa (10/11/2026).
- Khi poll chuyển sang lượt QR khác và `paymentPreview` lỗi mạng, dialog vẫn hiện số tiền của lượt cũ và không hiện thông báo lỗi.
- Output RED lúc tái hiện (`tdd`, test `[B-21] reload error on attempt switch is shown`): `reload failure must be announced`; `# pass 16 # fail 1`.

## Nguyên nhân gốc
- Trong `POS_UI/src/features/pos/LivePaymentDialog.tsx` (dòng ~40), `.catch` của `load()` chỉ gọi `setError` khi `active && live.current`. Effect cleanup đặt `active=false` khi `attempt?.id` đổi, nên điều kiện `active` làm mất lỗi. Đã xác minh bằng RED ở trên.

## Cách fix
- File và thay đổi: `POS_UI/src/features/pos/LivePaymentDialog.tsx:40` — trong `catch` chỉ kiểm `live.current`, bỏ `active`.
- Test tái hiện: `POS_UI/test/live-payment.test.mjs::[B-21] reload error on attempt switch is shown`.
- Kiểm chứng: `node --test test/live-payment.test.mjs` 17/17 pass, exit 0; UI `npm test` 62/62 pass, exit 0; `npm run typecheck` exit 0; `npm run build` exit 0 (lượt sau sửa). Chưa có CI độc lập.

## Quy tắc phòng tránh
- Cleanup của effect không được làm mất lỗi của một yêu cầu đã phát ra trước đó. Khi cờ `active` chặn cập nhật state, lỗi phải vẫn được ghi cho các cập nhật còn hợp lệ (`live.current`).
- Liên quan B-17 (`20261110-payment-preview-stale-after-attempt-switch.md`), M-3.

## Dấu hiệu nhận biết khi review
- `catch` của một request trong effect có cờ `active` dùng để bỏ qua kết quả nhưng vẫn chặn cả thông báo lỗi.
