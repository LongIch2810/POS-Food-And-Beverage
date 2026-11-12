---
id: 20261111-pay-then-next-order-path-untested
tags: [ui, pos, test, payment]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Đường chính "thanh toán xong → khách mới" của màn POS không có test (R16-1)

## Triệu chứng
- Nguồn: review vòng 16 (11/11/2026), finding R16-1 (Medium), `POS_UI/src/features/pos/LivePosScreen.tsx:255`, `POS_UI/test/live-payment.test.mjs`. E2E-AC-8 yêu cầu: thanh toán đơn A → panel bỏ chọn A; tạo đơn B → món chỉ vào B, A không đổi. Không test nào gọi `onPaid` của `LivePosScreen`; đột biến bỏ `setSelected(null)` trong `onPaid` bị che vì `refreshOrders()` cũng bỏ chọn khi danh sách không còn A.

## Nguyên nhân gốc
- (Đã xác minh) Các test `[PAID-DONE-1..8]` chỉ phủ hủy đơn, tải lại, bàn và danh sách đơn mở; đường `onPaid` chưa bao giờ được chạy trong test.

## Cách fix
- Test tái hiện: POS_UI/test/live-payment.test.mjs::[PAID-DONE-9], [PAID-DONE-9b] (xanh ngay vì code đúng; đột biến bỏ setSelected(null) trong onPaid làm [PAID-DONE-9b] đỏ).
- Thêm `[PAID-DONE-9]` (danh sách sau thanh toán không còn đơn cũ) và `[PAID-DONE-9b]` (danh sách vẫn còn đơn cũ) trong `POS_UI/test/live-payment.test.mjs` dựa trên helper `payThenNextCustomer` và `find` của `mountPos`: sau `onPaid` có "Chưa chọn đơn", "Thanh toán thành công.", nút món bị khóa; tạo đơn mang đi mới thì `addItem` nhận id đơn mới, không có `addItem` nào với id đơn cũ.
- Kiểm (subagent `tdd`, local): test xanh ngay (code đúng). Đột biến bỏ `setSelected(null);` trong `onPaid`: `[PAID-DONE-9b]` đỏ (`paid order must be deselected`), `[PAID-DONE-9]` vẫn xanh (đúng dự đoán, do nhánh `selected && !rows.some(...)` của `refreshOrders`); khôi phục dòng, pass 2/2. POS_UI `npm test` 79/79, typecheck và build exit 0.

## Quy tắc phòng tránh
- Mỗi hành vi người dùng yêu cầu có đường chính phải có test chạy đúng đường đó; đột biến phải được ít nhất một test bắt, không để closure/cơ chế khác che.

## Dấu hiệu nhận biết khi review
- Handler `onPaid`/callback thành công không được test nào gọi; test chỉ phủ đường lỗi hoặc đường phụ.
