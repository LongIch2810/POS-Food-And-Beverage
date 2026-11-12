---
id: 20261111-manager-cancel-open-behavior-untested
tags: [api, permission, sales, test]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Cấp invoice.cancel_open cho MANAGER chỉ kiểm bảng quyền, không kiểm hành vi (R16-2)

## Triệu chứng
- Nguồn: review vòng 16 (11/11/2026), finding R16-2 (Medium), `POS_API/src/sales/tests/sales.integration.test.ts:26-27`. User quyết MANAGER được hủy đơn OPEN, giữ điều kiện ca CASHIER OPEN của chính người gọi và cùng chi nhánh (`specs/sales.md:17,125`). Chỉ có assert truy vấn `role_permissions`; không có test hủy với MANAGER thật.

## Nguyên nhân gốc
- (Đã xác minh) Thay đổi chỉ thêm migration quyền; kiểm thử dừng ở dữ liệu, không đi qua `writable()`/`shift()`/phạm vi chi nhánh.

## Cách fix
- Test tái hiện: POS_API/src/sales/tests/manager-cancel.integration.test.ts::[MGR-CANCEL-1], [MGR-CANCEL-2], [MGR-CANCEL-3], [MGR-CANCEL-4] (xanh ngay vì code đúng; đột biến đổi tên vai trò trong migration làm [MGR-CANCEL-1..3] đỏ).
- Thêm `POS_API/src/sales/tests/manager-cancel.integration.test.ts` (HTTP, DB tạm, đăng nhập thật): `[MGR-CANCEL-1]` MANAGER có ca CASHIER hủy đơn của ca đó → 200, `CANCELLED`, `cancelled_by` = MANAGER; `[MGR-CANCEL-2]` MANAGER không có ca → 409 `SHIFT_NOT_OPEN`, đơn vẫn `OPEN`; `[MGR-CANCEL-3]` MANAGER chi nhánh B (có ca ở B) → 404 `NOT_FOUND`, DB không đổi; `[MGR-CANCEL-4]` vai trò thiếu quyền → 403, DB không đổi.
- Kiểm (subagent `tdd`, local): test xanh ngay. Đột biến đổi `'MANAGER'` thành `'MANAGER_MUTATION'` trong migration làm `-1`, `-2`, `-3` đỏ (403 `PERMISSION_DENIED`); khôi phục, 5/5. POS_API `npm test` 155/155, build exit 0.

## Quy tắc phòng tránh
- Mỗi lần đổi quyền theo vai trò phải có test hành vi qua HTTP với vai trò thật (đường chính, thiếu điều kiện, khác phạm vi, thiếu quyền), không chỉ kiểm bảng cấp quyền.

## Dấu hiệu nhận biết khi review
- Diff chỉ chạm migration/seed quyền kèm assert đếm hàng trong `role_permissions`.
