---
id: 20261113-cancel-open-scope-order-untested
tags: [sales, api, permission, cancel, test]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261112-sprint09-drawer-cancel-invoices]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Đổi ưu tiên lỗi của `cancel()` (404 `NOT_FOUND` trước 409 `SHIFT_NOT_OPEN`) không có test (R1-1)

## Triệu chứng
- Không có lỗi runtime. Khi `SalesService.cancel()` đọc đơn theo phạm vi (`invoice()`) trước `writable()`, người gọi ngoài phạm vi và không có ca nhận `404 NOT_FOUND` thay vì `409 SHIFT_NOT_OPEN`. Không test nào ghi lại hợp đồng này: `[MGR-CANCEL-3]` dùng MANAGER chi nhánh khác có ca riêng nên trả 404 cả trước và sau thay đổi.
- Đột biến chứng minh khoảng trống (agent `tdd`, sau khi thêm test): đảo `cancel()` về thứ tự cũ thì `[R1-1]` đỏ với `409 !== 404` và `{"error":{"code":"SHIFT_NOT_OPEN",...}}`; trước khi có test, đột biến này không làm test nào đỏ.

## Nguyên nhân gốc
- Plan Sprint 09 ghi đúng rằng đổi ưu tiên lỗi là quyết định của user nhưng không đặt AC/test cho nhánh `OPEN` ngoài phạm vi (plan dòng "Ảnh hưởng tới code hiện có" của ST-4 nói "không test hiện có nào kiểm trường hợp này" và dừng ở đó).

## Cách fix
- File và thay đổi: `POS_API/src/sales/tests/cancel-paid.integration.test.ts` — thêm test; không sửa production.
- Test tái hiện: `POS_API/src/sales/tests/cancel-paid.integration.test.ts::[R1-1] out-of-scope caller without a shift gets 404 when cancelling an OPEN invoice`. RED (đột biến) và GREEN: `.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/evidence/r1-fix1/red-mutant.log`, `green.log`.

## Quy tắc phòng tránh
- Khi plan ghi một thay đổi hợp đồng lỗi/thứ tự kiểm tra đã được user duyệt ("ảnh hưởng tới code hiện có"), thêm AC và test cho chính thay đổi đó, kèm trường hợp mà test cũ không phủ (người gọi không có ca, `branch_id` NULL), không chỉ ghi chú.
- Với mỗi thay đổi thứ tự kiểm tra, dùng đột biến "đảo thứ tự" để xác nhận có test đỏ.

## Dấu hiệu nhận biết khi review
- Diff đổi thứ tự các lệnh kiểm tra (scope/quyền/trạng thái) trong service nhưng không có test mới nào gọi bằng người gọi thiếu điều kiện.
