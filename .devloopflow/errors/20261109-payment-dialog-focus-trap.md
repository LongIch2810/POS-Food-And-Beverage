---
id: 20261109-payment-dialog-focus-trap
tags: [ui, dialog, a11y, payment]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261109-sprint08-payment]
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
