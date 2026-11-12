---
id: 20261110-payment-dialog-poll-paid-race
tags: [ui, dialog, payment, transfer, poll]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Poll thấy lượt QR null khi đơn vừa chuyển PAID làm dialog hiện lại nút thanh toán (R5-1)

## Triệu chứng
- Nguồn: review vòng 5 của task `20261109-sprint08-payment`, finding R5-1 (Low), ghi trong mục "Finding hoãn" của task. User duyệt sửa ngay (10/11/2026).
- Poll trong `POS_UI/src/features/pos/LivePaymentDialog.tsx` đọc đơn (thấy OPEN), rồi đọc lượt QR. Nếu server vừa commit PAID giữa hai lần đọc, lượt QR trả null và `release()` được gọi. Dialog hiện lại nút Tiền mặt/QR cho đơn đã PAID. Server trả 409 `INVOICE_NOT_OPEN` nên không mất tiền.
- Output RED lúc tái hiện (`tdd`, `POS_UI/test/live-payment.test.mjs`):
  ```
  not ok 1 - [R5-1] order paid between the two poll requests calls onPaid instead of showing payment buttons again
    error: 'onPaid must be called once the order is PAID'
    expected: true
    actual: false
  # pass 1 # fail 1
  ```

## Nguyên nhân gốc
- Nhánh lượt QR trả null trong vòng poll gọi `release()` mà không đọc lại trạng thái đơn. Đã xác minh bằng RED ở trên.

## Cách fix
- File và thay đổi: `POS_UI/src/features/pos/LivePaymentDialog.tsx` — khi lượt QR không còn PENDING, đọc lại đơn: nếu PAID thì gọi `markPaid()`, nếu còn OPEN thì `release()` như cũ; có kiểm `active`/`live` ở mỗi bước.
- Test tái hiện: `POS_UI/test/live-payment.test.mjs::[R5-1] order paid between the two poll requests calls onPaid instead of showing payment buttons again`; ca đối chứng `[R5-1] pending QR gone while the order is still OPEN releases the dialog to payment buttons`.
- Kiểm chứng: UI `npm test` 59/59 pass, `npm run typecheck` exit 0, `npm run build` exit 0 (lượt này). Output lưu tại scratchpad của phiên `tdd`. Chưa có CI độc lập.

## Quy tắc phòng tránh
- Khi một trạng thái chờ kết thúc, đọc lại nguồn chân lý (đơn) trước khi kết luận, vì hai lần đọc không nguyên tử.
- Liên quan M-3 và B-1 (`20261110-backlog-payment-dialog-stuck-uncertain.md`).

## Dấu hiệu nhận biết khi review
- Nhánh kết thúc trạng thái chờ gọi thao tác dọn dẹp mà không đọc lại trạng thái đơn.
