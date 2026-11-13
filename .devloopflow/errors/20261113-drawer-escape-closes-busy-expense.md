---
id: 20261113-drawer-escape-closes-busy-expense
tags: [ui, shifts, drawer, dialog, keyboard]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261113-sprint09-ui]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Escape đóng ngăn chi tiết khi dialog ghi chi đang gửi POST (R1-2)

## Triệu chứng
- Nguồn: finding review vòng 1 ghi tại `.devloopflow/tasks/active/20261113-sprint09-ui.md`: `Drawer vẫn nghe Escape khi modal ghi chi busy, đóng cả drawer, unmount form trong lúc POST, bỏ qua Dialog.disableClose; khi chưa busy cũng đóng luôn ngăn thay vì chỉ form.` Finding dẫn ST-7.AC-4/E2E-AC-6, UI-6.
- Output harness do reviewer báo, nguyên văn: `{drawerClosed:1,dialogClosed:0}`. Không có artifact RED riêng được cung cấp cho lượt ghi hồ sơ này.

## Nguyên nhân gốc
- `Drawer` đăng ký listener `keydown` trên `window` khi đang mở. `Dialog.disableClose` chỉ chặn đóng dialog; nó không vô hiệu hóa listener của drawer bên dưới. `ShiftDetailDrawer` mở `AddExpenseModal` nhưng drawer vẫn xử lý cùng phím Escape nên callback đóng drawer có thể unmount form đang POST.
- Test `[R1-2] Escape only closes the active expense dialog, and cannot close it while busy` gắn listener của cả hai component, giữ POST đang chờ và kiểm drawer không đóng, dialog vẫn `disableClose`.

## Cách fix
- File và thay đổi: `POS_UI/src/components/ui/Drawer.tsx` — thêm `suspended`; không gắn listener bàn phím khi bị tạm ngưng, đặt `inert` và `aria-hidden` cho nền drawer khi dialog phía trên hoạt động.
- File và thay đổi: `POS_UI/src/features/shifts/ShiftDetailDrawer.tsx` — truyền `suspended={adding}` khi mở form ghi chi. `POS_UI/src/features/shifts/AddExpenseModal.tsx` tiếp tục truyền `disableClose={loading}` cho dialog.
- Test tái hiện: `POS_UI/test/shift-expense.test.mjs::[R1-2] Escape only closes the active expense dialog, and cannot close it while busy`.
- Kiểm chứng local do agent ghi hồ sơ chạy ngày 2026-11-13, trong `POS_UI/`: `node --experimental-strip-types --test test/dialog-focus.test.mjs test/shift-expense.test.mjs`, exit 0. Output đầy đủ: `.devloopflow/verify/20261113-sprint09-ui/evidence/record-error-r1-1-3-focused.log`.
  ```text
  ok 10 - [R1-2] Escape only closes the active expense dialog, and cannot close it while busy
  # tests 20
  # suites 0
  # pass 20
  # fail 0
  # cancelled 0
  # skipped 0
  # todo 0
  ```
- Lượt ghi hồ sơ không chạy lại browser hoặc CI; kết quả này là test harness local.

## Quy tắc phòng tránh
- Khi mở dialog trên drawer, tạm ngưng listener bàn phím và tương tác nền của drawer trong toàn bộ thời gian dialog tồn tại.
- Test phím Escape với cả listener cha và con cùng tồn tại, bao gồm lúc mutation đang chờ; kiểm callback đóng từng lớp.

## Dấu hiệu nhận biết khi review
- Drawer và dialog cùng đăng ký `window.keydown` nhưng không truyền trạng thái lớp đang hoạt động.
- `disableClose` của dialog được dùng làm bảo vệ duy nhất cho mutation, trong khi component cha vẫn nhận Escape.
