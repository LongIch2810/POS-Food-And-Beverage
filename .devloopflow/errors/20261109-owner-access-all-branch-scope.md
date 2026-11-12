---
id: 20261109-owner-access-all-branch-scope
tags: [sales, api, branch-scope, permission]
found_by: code-reviewer
severity: Medium
occurrences: 2
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Truy vấn phạm vi chi nhánh bỏ qua `branch.access_all` (R1-1, R3-1)

## Triệu chứng
- R1-1 (vòng 1): OWNER gán branch A, có `branch.access_all`, GET invoice/payment-preview/transfer-attempts của đơn branch B nhận 404 dù `confirm-manual` cho phép (nguồn: `qa-evidence/20261109-review-r1-1/red.log`, `red-pending.log`).
- R3-1 (vòng 3): cùng lỗi còn sót ở `cancelTransferAttempt`: OWNER gán branch A giữ ca CASHIER ở branch B tạo được QR nhưng "Hủy chờ" nhận 404; đơn bị khóa vì `writable()` còn lượt PENDING. RED: `qa-evidence/20261109-review-r3-1/red.log` (test `[R1-1] OWNER access_all cancels QR of another branch...` đỏ ở assertion "OWNER access_all must cancel QR").

## Nguyên nhân gốc
- Helper/truy vấn lọc `i.branch_id=$3` bằng `user.branchId` mà không kiểm `permissions.includes('branch.access_all')`. Đã xác minh bằng RED hai lần (R1-1 ở `transfer-attempts.service.ts:24`/`sales.service.ts:46`; R3-1 ở `cancelTransferAttempt`). Mỗi điểm vào cần tự xử lý scope nên sót một chỗ.

## Cách fix
- `POS_API/src/sales/transfer-attempts.service.ts` — `cancelTransferAttempt` dùng `branchId = access_all ? null : user.branchId`, 403 nếu thiếu cả hai (giống `confirmTransferManually`). R1-1 sửa ở helper đọc cùng file và `sales.service.ts`.
- Test tái hiện: `POS_API/src/sales/tests/payment.integration.test.ts::[R1-1] OWNER access_all reads payment state across branches...` và `::[R1-1] OWNER access_all cancels QR of another branch while holding a cashier shift there`. GREEN: `qa-evidence/20261109-review-r3-1/green.log`, API đầy đủ 124/124 `api-full.log` (local do agent chạy).

## Quy tắc phòng tránh
- Mọi truy vấn scope theo chi nhánh phải qua một quy tắc: `access_all` → không lọc; ngược lại bắt buộc `branchId` hoặc 403. Khi sửa một điểm vào, grep mọi truy vấn cùng mẫu `branch_id=$` trong module.

## Dấu hiệu nhận biết khi review
- `user.branchId ?? null` đưa thẳng vào điều kiện branch mà không có `access_all`.
- Finding R3-4 (Low, hoãn): helper `transfer-attempts.service.ts:24`/`sales.service.ts:46` còn fail-open khi `branchId=null`.
