---
id: 20261110-backlog-branch-scope-null-branchid-fail-open
tags: [sales, api, branch-scope, permission]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Phạm vi chi nhánh bỏ qua khi `branchId` rỗng (B-2, R3-4)

## Triệu chứng
- Nguồn: review vòng 3 của task `20261109-sprint08-payment`, finding R3-4 (Low), ghi trong backlog `B-2` ngày 2026-11-10.
- Người không có `branch.access_all` và `branchId = null` đọc được hóa đơn của mọi chi nhánh trong store. `list()` cùng module đã trả 403 trong trường hợp này.
- Output RED lúc tái hiện (`tdd`):
  ```
  not ok 3 - [B-2] ... error: 'Missing expected rejection (notFound): sales.get must not fail open'
  ```

## Nguyên nhân gốc
- Điều kiện kiểm phạm vi `(!user.permissions.includes('branch.access_all') && user.branchId && row.branch_id !== user.branchId)` có vế `user.branchId &&`, nên khi `branchId` rỗng thì điều kiện bằng false và bỏ qua kiểm tra. Đã xác minh bằng RED ở trên.
- Căn cứ nghiệp vụ: `docs/BUSINESS_RULES.md` BR-70 (CASHIER/MANAGER bắt buộc có `branch_id`; chỉ `branch.access_all` được để trống) và BR-71 (người không có `branch.access_all` chỉ xem dữ liệu chi nhánh của mình).

## Cách fix
- File và thay đổi:
  - `POS_API/src/sales/transfer-attempts.service.ts` (hàm `invoice`, dòng ~24) — bỏ vế `&& user.branchId`.
  - `POS_API/src/sales/sales.service.ts` (hàm `invoice`, dòng ~46) — bỏ vế `&& user.branchId`.
- Test tái hiện: `POS_API/src/sales/tests/payment.integration.test.ts::[B-2] user without branch.access_all and without branchId cannot read another branch invoice (BR-70/BR-71)`.
- Kiểm chứng: `POS_API` `npm run build` exit 0; `npm test` 132/132 pass (sau khi đổi fixture của B-4, xem errors liên quan). Output lưu tại thư mục scratchpad của phiên `tdd`, chưa có CI độc lập.

## Quy tắc phòng tránh
- Mọi kiểm tra phạm vi chi nhánh phải chặn khi thiếu `branchId` và không có `branch.access_all`; không dùng điều kiện "chỉ kiểm khi có giá trị" cho thông tin phạm vi.
- Các helper `invoice()` lặp lại ở nhiều service: khi sửa một chỗ, kiểm các chỗ còn lại (đã kiểm: `transfer-attempts.service.ts:104-105, 127-128, 142, 173-174` và `sales.service.ts:90-91` đều kiểm `access_all` hoặc trả 403).

## Dấu hiệu nhận biết khi review
- Điều kiện scope dạng `... && user.branchId && row.branch_id !== user.branchId` không có vế kiểm `branchId` thiếu.
