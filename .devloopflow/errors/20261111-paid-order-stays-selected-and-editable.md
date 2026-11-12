---
id: 20261111-paid-order-stays-selected-and-editable
tags: [ui, pos, order, payment, state]
found_by: user
severity: Medium
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Màn POS vẫn coi đơn đã thanh toán là đơn đang chọn và cho bấm thêm món

## Triệu chứng
- Nguồn: yêu cầu của user ngày 11/11/2026, nguyên văn: "khi đã thanh toán ấy thì đơn đó coi như xong đòng tạo đơn mới cho khách mới khi nào chưa thanh toán thì mới thêm item vào đây là yêu cầu nên sửa này". User không mô tả bước tái hiện cụ thể; agent chính hiểu là: đơn không còn OPEN không được là đơn đang thao tác, chỉ đơn OPEN chưa có QR chờ mới được thêm món.
- Test đỏ do subagent `tdd` chạy trước khi sửa (`node --test --test-name-pattern="PAID-DONE" test/live-payment.test.mjs`): `pass 3, fail 2`:
  - `[PAID-DONE-1]` đơn đang chọn chuyển sang PAID rồi chọn lại: `error: menu must be locked for a PAID order (false !== true)`.
  - `[PAID-DONE-2]` "Tải lại đơn" khi server trả PAID: `error: 'PAID order must not stay selected'`, màn vẫn hiện `HD00000001Mang đi · PAIDTổng: 0đ`.

## Nguyên nhân gốc
- (Đã xác minh bằng test đỏ ở trên.) `POS_UI/src/features/pos/LivePosScreen.tsx`: `canModify` không kiểm `selected.status==='OPEN'`; `pendingStatus` còn giá trị `'none'` của cùng id từ lúc đơn còn OPEN nên `canModify` vẫn đúng với chi tiết đơn đã PAID. `refreshOrders(wantedId)` luôn `setSelected(detail)` kể cả khi chi tiết đơn đã PAID, nên đơn đã thanh toán trở lại làm đơn đang chọn và thực đơn bấm được (server vẫn chặn bằng `INVOICE_NOT_OPEN`, nên dữ liệu không bị ghi sai).

## Cách fix
- File và thay đổi: `POS_UI/src/features/pos/LivePosScreen.tsx` — `canModify=canWrite&&(!selected||(selected.status==='OPEN'&&pendingState==='none'))`; `refreshOrders` chỉ giữ đơn khi `detail.status === 'OPEN'` (và đúng chi nhánh), ngược lại `setSelected(null)`; các điều khiển sửa/xóa món, chuyển bàn, hủy đơn dùng `canModify`. Đường `onPaid` và thông báo "Thanh toán thành công." giữ nguyên.
- Test tái hiện: `POS_UI/test/live-payment.test.mjs::[PAID-DONE-1]`, `[PAID-DONE-2]` (đỏ trước, xanh sau); đối chứng `[PAID-DONE-3]` (đơn OPEN không QR vẫn thêm món; đơn OPEN có QR chờ vẫn khóa), `[PAID-DONE-4]` (đơn PAID mở bằng `initialInvoiceId` chỉ để xem, xanh ngay vì `pendingState` còn `loading`).
- Kiểm: agent chính chạy lại `npm test` (POS_UI) 70/70 pass, `npm run typecheck` exit 0, `npm run build` exit 0 (local). Đột biến: bỏ điều kiện `status==='OPEN'` trong `canModify` làm `[PAID-DONE-1]` đỏ; bỏ nhánh `status==='OPEN'` trong `refreshOrders` làm `[PAID-DONE-2]` đỏ.

## Quy tắc phòng tránh
- Mọi điều kiện cho phép sửa đơn trên UI phải kiểm trạng thái đơn (`status==='OPEN'`) cùng với quyền, ca và trạng thái QR chờ; trạng thái phụ lưu theo id (`pendingStatus`) không được thay cho kiểm trạng thái đơn mới nhất.
- Khi làm mới chi tiết đơn từ server, đơn đã sang trạng thái cuối (PAID/CANCELLED) không được trở lại làm đơn đang thao tác.

## Dấu hiệu nhận biết khi review
- Biểu thức `canModify`/`canWrite` dùng để bật nút sửa mà không có điều kiện `status`; hàm làm mới gọi `setSelected(detail)` không kiểm `detail.status`.
- (Đã xử lý ở đợt mở rộng bên dưới, 11/11/2026) `perform()` từng `setSelected(detail)` cho đơn vừa hủy nên đơn CANCELLED hiện cho tới lần "Tải lại đơn" kế tiếp.

## Cập nhật (11/11/2026, đợt mở rộng theo "fix hết")
- Cùng gốc lỗi còn ở ba đường khác, đã tái hiện bằng test đỏ (`node --test --test-name-pattern="PAID-DONE" test/live-payment.test.mjs`: `pass 9, fail 3`): `[PAID-DONE-5]` `CANCELLED order must not stay selected` (`perform()` luôn `setSelected(detail)` kể cả đơn vừa hủy); `[PAID-DONE-6]` `new DINE_IN order must be created` (`openTable` chọn đơn lưu cũ của bàn dù server báo đã PAID); `[PAID-DONE-7]` `PAID order must not be selected` (bấm đơn trong "Đơn đang mở" mà đơn đã đóng).
- Cách fix thêm trong `POS_UI/src/features/pos/LivePosScreen.tsx`: `perform` chỉ giữ đơn `OPEN`, đơn không `OPEN` thì bỏ chọn, hiện "Đã hủy đơn." hoặc "Đơn đã đóng." và làm mới danh sách; `openTable` coi bàn có đơn cũ không còn `OPEN` là trống (làm mới danh sách rồi tạo `DINE_IN` mới); click danh sách chỉ chọn đơn `OPEN`, ngược lại hiện "Đơn đã thanh toán hoặc đã đóng. Danh sách đã được làm mới." và làm mới.
- Test thêm: `[PAID-DONE-5]`..`[PAID-DONE-8]` (7 test); `[PAID-DONE-1]` được viết lại (dựng đơn PAID bằng `initialInvoiceId`) vì đường chọn đơn PAID qua tab "Đơn đang mở" đã bị đóng. `[PAID-DONE-8]` (xóa món rồi đọc lại trả PAID) xanh ngay vì `refreshOrders()` sau đó bỏ chọn; không sửa code.
- Kiểm: agent chính chạy lại `npm test` (POS_UI) 77/77, `npm run typecheck` exit 0, `npm run build` exit 0 (local). Đột biến bắt được: bỏ `setSelected(null)` trong `perform`, bỏ kiểm trạng thái trong `openTable`, bỏ kiểm trạng thái ở click danh sách.
- Chưa được bảo vệ bằng test: điều kiện `selected.status==='OPEN'` trong `canModify` (không còn đường công khai tạo trạng thái cũ nên bỏ nó không làm test nào đỏ); giữ như lớp phòng thủ.
- Chưa làm: browser QA trên UI cuối; màn Hóa đơn (dữ liệu mô phỏng) không đụng.
