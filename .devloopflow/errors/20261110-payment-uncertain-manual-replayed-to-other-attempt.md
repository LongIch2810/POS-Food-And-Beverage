---
id: 20261110-payment-uncertain-manual-replayed-to-other-attempt
tags: [ui, dialog, payment, transfer, idempotency]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Xác nhận thủ công chưa rõ kết quả bị thử lại sang lượt QR khác (R7-2)

## Triệu chứng
- Nguồn: review vòng 7 của task `20261109-sprint08-payment`, finding R7-2 (Low). User duyệt sửa ngay (10/11/2026).
- Quản lý xác nhận thủ công lượt a1 gặp lỗi mạng (dialog ở trạng thái chưa rõ kết quả). Thu ngân hủy a1 và tạo a2. Poll chuyển sang a2. Khi bấm thử lại, request gửi `confirm-manual(a2, key cũ, mã giao dịch đã đối chiếu cho a1)`. Server có thể trả 201 và gắn giao dịch vào a2. Tiền của a1 về sau thành ngoại lệ. Không mất tiền, nhưng lệch đối soát.
- Output RED lúc tái hiện (`tdd`, `POS_UI/test/live-payment.test.mjs::[R7-2]`): `expected: false  actual: true` ở `disableClose`; `# pass 14  # fail 1`.

## Nguyên nhân gốc
- Nhánh poll gán lượt PENDING mới (`setAttempt(current)`) mà không dọn cờ `uncertain` và `pending.current` của yêu cầu cũ. Đã xác minh bằng RED ở trên.

## Cách fix
- File và thay đổi: `POS_UI/src/features/pos/LivePaymentDialog.tsx` (dòng ~40) — thêm `if(current.id!==attempt.id)release();` ngay trước `setAttempt(current)`.
- Test tái hiện: `POS_UI/test/live-payment.test.mjs::[R7-2] uncertain manual is not replayed onto a different attempt`.
- Kiểm chứng: UI `npm test` 60/60 pass (gồm `[B-1]` và `[R5-1]`), `npm run typecheck` exit 0, `npm run build` exit 0 (lượt sau sửa). Chưa có CI độc lập.

## Quy tắc phòng tránh
- Khi lượt đang theo dõi thay đổi sang lượt khác, dọn mọi yêu cầu đang chờ của lượt cũ trước khi gán lượt mới.
- Liên quan M-3 và B-1.

## Dấu hiệu nhận biết khi review
- Nhánh cập nhật đối tượng đang theo dõi không xóa trạng thái chờ hoặc key của đối tượng cũ.
