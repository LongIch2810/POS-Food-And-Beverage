---
id: 20261115-products-tabs-missing-aria-current
tags: [ui, products, accessibility]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261115-sprint10-stock-ledger]
---

# B-61 Tab Thực đơn thiếu trạng thái truy cập

## Triệu chứng
- Bốn nút tab chỉ dùng style; test `[B-61]` RED: actual `undefined`, expected `'true'`.

## Nguyên nhân gốc
- Nút tab không xuất aria-current dù tab đang chọn.

## Cách fix
- File và thay đổi: `POS_UI/src/features/products/ProductsScreen.tsx`: thêm aria-current cho bốn nút; giữ style và assertion cũ.
- Test tái hiện: `POS_UI/test/products-tabs.test.mjs::[B-61]`: đỏ trước, xanh sau; UI 219/219; build exit 0.

## Quy tắc phòng tránh
- Tab hiện hành cần có thuộc tính trạng thái truy cập, không chỉ style.

## Dấu hiệu nhận biết khi review
- Tab đổi màu/độ đậm nhưng không có aria-current hoặc aria-selected.
