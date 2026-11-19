---
id: 20261119-backlog-mock-cancel-paid-test-gap
tags: [ui, mock, invoices, test]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261118-sprint11-pb16-remove-cancel-paid]
---

# B-74 — Chú thích mock cũ và thiếu test không cho hủy đơn PAID

## Triệu chứng
- R1-2: tiêu đề `mockEngine.ts:759` vẫn nói hoàn kho sau khi đã bỏ hành vi đó; không có test `MockEngine.cancelInvoice` kiểm đơn PAID bị từ chối và state không đổi.

## Nguyên nhân gốc
- Khi bỏ nhánh hủy PAID, tiêu đề cũ chưa được cập nhật và hành vi từ chối chưa có test đặc tả.

## Cách fix
- File và thay đổi: `POS_UI/src/mock/mockEngine.ts` — sửa tiêu đề thành `CANCEL OPEN INVOICE (BR-28, BR-110)`; giữ nguyên hàm và `return invoice` cuối hàm.
- Test tái hiện: không áp dụng vì không đổi hành vi. Test đặc tả `POS_UI/test/mock-cancel-invoice.test.mjs::[B-74][PB16-mock][BR-110] PAID cancellation throws and preserves all state` kiểm lỗi và state; chạy cùng test modal trước và sau sửa đều 15/15, exit 0: `.devloopflow/verify/20261119-fix-backlog-b73-b75/evidence/tdd-before.log`, `tdd-after.log`.

## Quy tắc phòng tránh
- Khi bỏ một hành vi mock, cập nhật chú thích liên quan và kiểm trạng thái từ chối cùng dữ liệu không đổi.

## Dấu hiệu nhận biết khi review
- Chú thích mô tả hoàn kho dù hàm không còn hoàn kho; nhánh từ chối PAID không có test state.
