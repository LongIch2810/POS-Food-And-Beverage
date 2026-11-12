---
id: 20261110-payment-preview-stale-after-attempt-switch
tags: [ui, dialog, payment, transfer, preview]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Số tiền cần thanh toán không được tải lại khi lượt QR đổi (B-17, R8-1)

## Triệu chứng
- Nguồn: review vòng 8 của task `20261109-sprint08-payment`, finding R8-1 (Low), ghi backlog `B-17`. User chọn phương án chỉ tải lại số tiền và giữ form xác nhận thủ công (10/11/2026).
- Khi poll chuyển từ lượt a1 sang a2, dialog hiện tên khách và mã mới nhưng "Cần thanh toán" vẫn là tổng của đơn lúc mở dialog, nếu đơn đã đổi. Server vẫn chặn đúng khi xác nhận (422 `TRANSFER_AMOUNT_INSUFFICIENT`), không sai tiền.
- Output RED lúc tái hiện (`tdd`, test `[B-17] attempt switch reloads preview and keeps the manual confirmation form`): `preview must be reloaded for the new attempt`; text vẫn `Cần thanh toán: 50000đ` sau khi lượt đã là HD87654321ZYXWVUTS.

## Nguyên nhân gốc
- Lưu ý (cập nhật sau review vòng 9, R9-1 / B-21): trước đây đường lỗi của lần tải lại preview chưa hiện thông báo vì `.catch` bị chặn bởi `active`. Đã sửa ở B-21 (`20261110-payment-preview-reload-error-swallowed.md`).
- Nhánh poll khi lượt đổi (`POS_UI/src/features/pos/LivePaymentDialog.tsx` dòng ~40) gọi `release()` và `setAttempt(current)` nhưng không tải lại preview. Đã xác minh bằng RED ở trên.

## Cách fix
- File và thay đổi: `POS_UI/src/features/pos/LivePaymentDialog.tsx` dòng 40 — thêm `void load().catch(...)` ngay sau `release()` trong nhánh lượt khác; lỗi tải lại hiện qua `setError`. Không reset form (theo quyết định của user).
- Test tái hiện: `POS_UI/test/live-payment.test.mjs::[B-17] attempt switch reloads preview and keeps the manual confirmation form`.
- Kiểm chứng: UI `npm test` 61/61 pass, exit 0; `npm run typecheck` exit 0; `npm run build` exit 0 (lượt sau sửa). Chưa có CI độc lập.
- Đột biến chưa kiểm: thêm reset form (sẽ làm assert giữ giá trị fail); `load()` cũng chạy ở nhánh cùng lượt (chưa có test riêng).

## Quy tắc phòng tránh
- Khi đối tượng đang theo dõi đổi, tải lại mọi dữ liệu phụ thuộc vào đối tượng đó (số tiền, preview), không chỉ trạng thái chờ.
- Liên quan M-3, B-1, R7-2.

## Dấu hiệu nhận biết khi review
- Nhánh đổi đối tượng cập nhật ID nhưng giữ số liệu hiển thị của đối tượng cũ.
