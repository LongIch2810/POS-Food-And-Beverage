---
id: 20261115-rail-and-routes-disagree-on-permissions
tags: [ui, navigation, permission]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261115-sprint10-stock-ledger]
---

# B-63 Rail và route dùng điều kiện quyền khác nhau

## Triệu chứng
- Test `[B-63]` RED: quyền `invoice.read` không hiện rail Hóa đơn, `false !== true`.

## Nguyên nhân gốc
- AppShell tự tính visible khác danh sách accessibleTabs dùng bởi router.

## Cách fix
- File và thay đổi: `POS_UI/src/components/common/AppShell.tsx`: lọc rail theo accessibleTabs(session); cập nhật mock navigation của test liên quan.
- Test tái hiện: `POS_UI/test/app-shell-products.test.mjs::[B-63]`: đỏ trước, xanh sau; UI 219/219; build exit 0.

## Quy tắc phòng tránh
- Rail và route phải dùng cùng một danh sách tab truy cập.

## Dấu hiệu nhận biết khi review
- Mục rail hiện nhưng route chuyển đi, hoặc route cho phép nhưng rail ẩn.
