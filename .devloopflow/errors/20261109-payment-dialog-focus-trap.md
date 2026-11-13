---
id: 20261109-payment-dialog-focus-trap
tags: [ui, dialog, a11y, payment]
found_by: code-reviewer
severity: Medium
occurrences: 2
tasks: [20261109-sprint08-payment, 20261113-sprint09-ui]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Modal thanh toán không bẫy focus / Escape / khôi phục focus (R1-2)

## Triệu chứng
- `POS_UI/src/features/pos/LivePaymentDialog.tsx` dùng `aria-modal` nhưng không đưa/bẫy focus, bàn phím còn tương tác nền; chưa tái hiện trong browser thật (nguồn: reviewer vòng 1, đối chiếu source và `DESIGN.md`). RED harness: `qa-evidence/20261109-review-r1-2/red-payment.log`, `red-restore.log`.

## Nguyên nhân gốc
- Component `Dialog` chưa lưu/khôi phục focus, không bẫy Tab và không chặn Escape khi đang xử lý. Mức xác minh: qua test harness `vm` + DOM giả; CHƯA XÁC MINH trên browser thật (chờ QA browser).

## Cách fix
- `POS_UI/src/components/ui/Dialog.tsx` (lưu/khôi phục focus, bẫy Tab/Shift+Tab, `disableClose` chặn Escape) và `LivePaymentDialog.tsx` đặt `locked=busy||uncertain` và truyền `disableClose={locked}`.
- Test: `POS_UI/test/dialog-focus.test.mjs`, `POS_UI/test/live-payment.test.mjs`. GREEN: `qa-evidence/20261109-review-r1-2/green-payment.log`, `green-restore.log`, UI 53/53.

## Quy tắc phòng tránh
- Dialog chặn thao tác phải có đường thoát khi trạng thái chờ kết thúc bất thường (R3-3, Low, hoãn: manual uncertain rồi attempt bị xóa → dialog kẹt).

## Dấu hiệu nhận biết khi review
- `aria-modal` mà không có focus trap/khôi phục focus; `disableClose` không gắn với điều kiện hết hạn.

## Lần phát hiện 2 — Task B, R1-3 (2026-11-13)

### Triệu chứng
- Reviewer vòng 1 báo: `POS_UI/src/components/ui/Drawer.tsx:21-29 — hai ngăn chi tiết không quản lý focus. Drawer aria-modal=true chỉ nghe Escape, không chuyển focus vào ngăn, không trap Tab/Shift+Tab và không khôi phục focus; ảnh hưởng InvoiceDetailDrawer và ShiftDetailDrawer; trái ST-4.AC-3, E2E-AC-6, UI-7.` Nguồn: nguyên văn finding được agent chính chuyển trong lượt ghi hồ sơ.
- RED harness do worker báo: `drawer should focus its first control`. Log RED chỉ có terminal, không có artifact lưu file được cung cấp; không coi đây là log RED đã lưu trong evidence.

### Nguyên nhân gốc
- Cùng nguyên nhân component khai báo `aria-modal` nhưng chưa triển khai vòng đời focus: `Drawer` chỉ nghe Escape, chưa chuyển focus khi mở, bẫy Tab/Shift+Tab hoặc khôi phục focus khi đóng. Lần này nằm ở `Drawer`, độc lập với bản sửa `Dialog` của task 20261109-sprint08-payment.
- Đã đối chiếu source hiện tại và test harness trên `Drawer`; không suy diễn kết quả browser từ harness.

### Cách fix
- File và thay đổi: `POS_UI/src/components/ui/Drawer.tsx` — lưu phần tử mở ngăn, đưa focus vào điều khiển đầu tiên, bẫy Tab/Shift+Tab trong ngăn, khôi phục focus khi đóng/unmount. Khi trở về từ dialog, đưa focus về drawer nếu phần tử mở dialog đã biến mất.
- Test tái hiện: `POS_UI/test/dialog-focus.test.mjs::[R1-3] Drawer focuses, traps Tab in both directions and restores the opener`.
- Test tái hiện: `POS_UI/test/dialog-focus.test.mjs::[R1-3] returning from a dialog focuses the drawer if its opener disappeared`.
- Kiểm chứng local do agent ghi hồ sơ chạy ngày 2026-11-13, trong `POS_UI/`: `node --experimental-strip-types --test test/dialog-focus.test.mjs test/shift-expense.test.mjs`, exit 0. Output đầy đủ: `.devloopflow/verify/20261113-sprint09-ui/evidence/record-error-r1-1-3-focused.log`.
  ```text
  ok 3 - [R1-3] Drawer focuses, traps Tab in both directions and restores the opener
  ok 4 - [R1-3] returning from a dialog focuses the drawer if its opener disappeared
  # tests 20
  # suites 0
  # pass 20
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
  ```
- Agent chính báo đã kiểm browser Tab trong ngăn và Escape trả focus nút `Chi tiết`; lượt ghi hồ sơ không tự chạy lại browser và chưa có đường dẫn artifact cho lần kiểm đó. Chưa có CI độc lập cho bản sửa này trong nguồn được cung cấp.

### Quy tắc phòng tránh
- Áp dụng cùng vòng đời focus cho mọi component modal, gồm cả drawer. Giữ kiểm tra focus khi quay lại từ dialog vì phần tử mở dialog có thể đã bị thay sau reload.

### Dấu hiệu nhận biết khi review
- `role="dialog" aria-modal="true"` chỉ có listener Escape, thiếu ref chứa nội dung và xử lý focus/Tab/cleanup.
- Sau mutation, phần tử mở dialog biến mất nhưng drawer không có chỗ nhận focus thay thế.
