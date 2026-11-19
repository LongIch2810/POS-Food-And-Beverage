---
id: 20261119-backlog-cancel-modal-redundant-open-check
tags: [ui, invoices, refactor]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261118-sprint11-pb16-remove-cancel-paid]
---

# B-73 — Điều kiện OPEN dư trong xác nhận hủy đơn

## Triệu chứng
- R1-1: `CancelInvoiceModal.tsx` kiểm `latest.status === 'OPEN'` sau khi `canConfirm` đã yêu cầu `invoice.status === 'OPEN'` và nhánh kiểm thay đổi đã thoát nếu hai trạng thái khác nhau.

## Nguyên nhân gốc
- Điều kiện dành cho hai đường hủy OPEN và PAID vẫn còn sau khi bỏ đường PAID.

## Cách fix
- File và thay đổi: `POS_UI/src/features/invoices/CancelInvoiceModal.tsx` — bỏ điều kiện dư, giữ kiểm ca và identity.
- Test tái hiện: không áp dụng vì không đổi hành vi. Test bảo vệ `POS_UI/test/invoice-cancel.test.mjs`; chạy cùng test B-74 trước và sau sửa đều 15/15, exit 0: `.devloopflow/verify/20261119-fix-backlog-b73-b75/evidence/tdd-before.log`, `tdd-after.log`.

## Quy tắc phòng tránh
- Khi gỡ một nhánh trạng thái, soát điều kiện còn lại và kiểm hành vi hiện có trước và sau refactor.

## Dấu hiệu nhận biết khi review
- Kiểm lại cùng trạng thái ngay sau guard đã loại trừ mọi trạng thái khác.
