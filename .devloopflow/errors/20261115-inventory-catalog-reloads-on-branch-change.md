---
id: 20261115-inventory-catalog-reloads-on-branch-change
tags: [ui, inventory, state]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261115-sprint10-stock-ledger]
---

# B-62 Danh mục nguyên liệu tải lại khi đổi chi nhánh

## Triệu chứng
- Test `[B-62]` RED: số request nguyên liệu `2 !== 1` khi đổi branch ở catalog.

## Nguyên nhân gốc
- viewKey chứa branchId cho cả tab catalog dù dữ liệu nguyên liệu không theo chi nhánh.

## Cách fix
- File và thay đổi: `POS_UI/src/features/inventory/InventoryScreen.tsx`: bỏ branchId khỏi viewKey khi tab catalog.
- Test tái hiện: `POS_UI/test/inventory-screen.test.mjs::[B-62]`: đỏ trước, xanh sau; UI 219/219; build exit 0.

## Quy tắc phòng tránh
- Chỉ đưa bộ lọc vào khóa tải của tab có dùng bộ lọc đó.

## Dấu hiệu nhận biết khi review
- Catalog tải lại hoặc hiện skeleton sau đổi chi nhánh.
