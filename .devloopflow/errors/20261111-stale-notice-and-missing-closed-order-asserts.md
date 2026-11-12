---
id: 20261111-stale-notice-and-missing-closed-order-asserts
tags: [ui, pos, notice, test]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Thông báo của đơn cũ còn hiện khi làm đơn mới; thiếu assert phụ cho đơn đã đóng (B-39, B-40)

## Triệu chứng
- Nguồn: review vòng 16 (11/11/2026), R16-4 (B-39) và R16-5 (B-40), cả hai Low, đã vào backlog rồi sửa bằng `fix-backlog`.
- B-39: `POS_UI/src/features/pos/LivePosScreen.tsx` — `notice` ("Thanh toán thành công.", "Đã hủy đơn.", "Đơn đã thanh toán hoặc đã đóng. ...") chỉ bị xóa khi đổi session và khi bấm Thanh toán; không bị xóa khi tạo/chọn đơn mới qua `perform`, `openTable`, click danh sách. Test đỏ trước khi sửa (subagent `tdd`): `old paid notice must not follow the new order`, `old cancel notice must not follow the new order`, `old cancel notice must not follow the chosen order`, `old cancel notice must not follow the opened table order`.
- B-40: `POS_UI/test/live-payment.test.mjs` chưa assert "Chuyển bàn" ẩn với đơn DINE_IN không OPEN và nhánh `perform()` trả PAID hiện "Đơn đã đóng.".

## Nguyên nhân gốc
- (Đã xác minh bằng test đỏ) B-39: không có chỗ nào gọi `setNotice('')` khi một đơn `OPEN` mới được chọn/tạo; thông báo là state toàn màn, không gắn với đơn.
- B-40: test của delta ST-8 dùng đơn TAKEAWAY và chỉ phủ nhánh CANCELLED của `perform`.

## Cách fix
- Test tái hiện: `POS_UI/test/live-payment.test.mjs::[B-39]` ×4 (sau thanh toán + đơn mới; sau hủy; chọn từ danh sách; mở bàn có đơn OPEN) — đỏ trước, xanh sau; `::[B-40]` ×2 (DINE_IN OPEN có select chuyển bàn, PAID không có; `perform` trả PAID → "Đơn đã đóng." + "Chưa chọn đơn") — xanh ngay vì code đã đúng.
- Code: `POS_UI/src/features/pos/LivePosScreen.tsx` thêm `setNotice('')` ở ba chỗ, chỉ khi đơn trả về là `OPEN` (`perform`, `openTable`, click danh sách); nhánh không OPEN giữ nguyên nên "Đã hủy đơn." vẫn hiện ngay sau hủy.
- Kiểm: đột biến B-40 (bỏ kiểm `status==='OPEN'` ở "Chuyển bàn"; bỏ chữ "Đơn đã đóng.") làm test đỏ, đã khôi phục. Agent chính chạy lại (local): POS_UI `npm test` 85/85, `npm run typecheck` exit 0, `npm run build` exit 0.

## Quy tắc phòng tránh
- Thông báo kết quả của một đơn phải được xóa khi người dùng chuyển sang đơn khác; mỗi nơi chọn/tạo đơn là một điểm cần test.
- Test cho trạng thái "đơn đã đóng" nên phủ cả loại đơn mang đi lẫn tại bàn, và cả hai trạng thái cuối PAID/CANCELLED.

## Dấu hiệu nhận biết khi review
- State thông báo chung không bị xóa ở các đường chọn/tạo đơn; test chỉ dùng một loại đơn hoặc một trạng thái cuối.
