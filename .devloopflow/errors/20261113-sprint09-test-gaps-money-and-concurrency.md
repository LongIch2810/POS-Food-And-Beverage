---
id: 20261113-sprint09-test-gaps-money-and-concurrency
tags: [sales, shifts, test, cash, concurrency, fixture]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261112-sprint09-drawer-cancel-invoices]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Khoảng trống test sau Sprint 09: fixture sai dạng dữ liệu thật, thiếu ca biên và ca đồng thời (B-41, B-42, B-45, B-47, B-48)

## Triệu chứng
- Không có lỗi runtime. Đột biến không bị test nào bắt (đã chứng minh trong lúc làm `20261112-sprint09-drawer-cancel-invoices`):
  - Bỏ `AND p.method='CASH'` trong `cashSales` (`POS_API/src/shifts/shifts.service.ts:83`) không làm test nào đỏ (tính cả TRANSFER vào tiền mặt).
  - Đổi `e.id DESC` thành `e.id ASC` trong `listExpenses` không làm test nào đỏ.
  - Fixture TRANSFER (`seedPaidTransfer`) ghi dòng `SALE` dạng USER, khác dữ liệu thật do webhook ghi (`created_by NULL`, `source 'SYSTEM'`).
  - Chưa có test MANAGER `branch_id=NULL` hủy đơn `PAID`; chưa có test `payCash` và hủy `PAID` đồng thời trong một ca.

## Nguyên nhân gốc
- Test của sub-task được viết theo AC của plan; plan không có ca biên (đơn TRANSFER còn nguyên khi đóng ca, tiebreak sort, fixture khác nguồn dữ liệu thật, hai thao tác khác loại cùng khóa ca), nên mã hóa được hành vi đúng nhưng không chống được đột biến lân cận.

## Cách fix
- File và thay đổi: `POS_API/src/sales/tests/cancel-paid.integration.test.ts` (fixture `seedPaidTransfer` dạng webhook; thêm `[B-41]`, `[B-42]`, `[B-47]`, `[B-48]`); `POS_API/src/shifts/tests/shift-expenses.integration.test.ts` (thêm `[B-45]`). Không sửa production.
- Test tái hiện: `cancel-paid.integration.test.ts::[B-41] reversal of SYSTEM-sourced SALE is attributed to the canceller`; `::[B-42] manager with NULL branch cannot cancel PAID`; `::[B-47] close shift counts only CASH payments in cash_sales_amount`; `::[B-48] concurrent payCash and PAID cancel in one shift do not deadlock`; `shift-expenses.integration.test.ts::[B-45] expense list breaks created_at ties by id DESC, also across cursor pages`. Đột biến đỏ: `.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/evidence/fix-backlog/mutant-*.log`.

## Quy tắc phòng tránh
- Với mỗi query tính tiền có điều kiện lọc (`method`, `status`), thêm test có dữ liệu "gần đúng" bị loại (TRANSFER còn `PAID`) để điều kiện lọc có đột biến đỏ.
- Fixture dữ liệu do job/webhook ghi phải dùng đúng nguồn thật (`created_by NULL`, `source 'SYSTEM'`), không dùng USER cho tiện.
- Mỗi cặp thao tác cùng khóa dòng gốc (ca) cần một test đồng thời, không chỉ cặp mới thêm.

## Dấu hiệu nhận biết khi review
- Test sort chỉ có `created_at` khác nhau; fixture TRANSFER/webhook ghi `source 'USER'`; không có test đồng thời cho thao tác mới cùng khóa với `payCash`.
