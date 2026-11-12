---
id: 20261110-backlog-payment-dialog-stuck-uncertain
tags: [ui, dialog, payment, transfer]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Dialog thanh toán kẹt khi xác nhận thủ công rơi vào trạng thái không chắc chắn (B-1, R3-3)

## Triệu chứng
- Nguồn: review vòng 3 của task `20261109-sprint08-payment`, finding R3-3 (Low), ghi trong backlog `B-1` ngày 2026-11-10.
- Khi xác nhận thủ công (`action('manual', ...)`) gặp lỗi không rõ kết quả, `uncertain` = true và dialog khóa nút Đóng (`disableClose`). Nếu attempt sau đó bị poll thấy không còn PENDING hoặc đơn không còn OPEN, dialog vẫn khóa và người dùng phải reload.
- Không mất tiền (theo finding R3-3).
- Ảnh hưởng thêm: `pending.current` còn sót kind `manual` làm mọi thao tác sau đó báo `Hãy thử lại yêu cầu trước để xác nhận kết quả.`.
- Output RED lúc tái hiện (`tdd`, `--test-name-pattern` trên `POS_UI/test/live-payment.test.mjs`):
  ```
  not ok 10 - [B-1] ... order is no longer OPEN
    Dialog must be closable again
    true !== false
  not ok 11 - [B-1] ... pending QR vanished while order is still OPEN
    Dialog must be closable again
    true !== false
  not ok 12 - [B-1] stale manual request ...
    error: 'Tiền mặt enabled'   (expected: true, actual: false)
  # pass 9  # fail 3
  ```

## Nguyên nhân gốc
- Vòng poll trong `POS_UI/src/features/pos/LivePaymentDialog.tsx` gọi `setAttempt(null)` khi đơn không còn OPEN hoặc không còn PENDING, nhưng không reset `uncertain` và `pending.current`. Hai cờ này là trạng thái của yêu cầu đã hết hiệu lực nên phải được xóa cùng lúc.
- Đã xác minh bằng RED ở trên (ba test đỏ đúng lý do).

## Cách fix
- File và thay đổi: `POS_UI/src/features/pos/LivePaymentDialog.tsx` — thêm hàm `release()` (gồm `setAttempt(null)`, `setUncertain(false)`, `pending.current=null`); vòng poll gọi `release()` khi đơn không còn OPEN hoặc attempt không còn PENDING. Nhánh PAID vẫn gọi `markPaid()` như cũ.
- Test tái hiện: `POS_UI/test/live-payment.test.mjs::[B-1] ...` (3 test: đơn không còn OPEN; QR biến mất khi đơn vẫn OPEN; thao tác tiền mặt sau đó không bị chặn).
- Kiểm chứng: `POS_UI` `npm test` 57/57 pass, `npm run typecheck` exit 0, `npm run build` exit 0 (output lưu tại thư mục scratchpad của phiên `tdd`, chưa có CI độc lập).

## Quy tắc phòng tránh
- Khi một trạng thái chờ (attempt, yêu cầu đang chờ) biến mất do poll, reset đồng bộ mọi cờ liên quan (`uncertain`, `pending`) trong cùng một bước, không để sót.
- Mỗi nhánh thoát khỏi trạng thái chờ phải có test đỏ trước khi sửa.

## Dấu hiệu nhận biết khi review
- `setAttempt(null)` ở vòng poll mà không đi kèm reset cờ `uncertain` hoặc `pending.current`.
- Nút Đóng dùng `disableClose={locked}` mà `locked` phụ thuộc vào cờ không tự xóa.
