---
id: 20261115-pos-open-table-stale-navigation-callback
tags: [ui, pos, async, navigation]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261115-sprint10-stock-ledger]
---

# B-64 Mở bàn dùng callback điều hướng cũ

## Triệu chứng
- Test `[B-64]` RED: actual `[['old','menu']]`, expected `[['current','menu']]`.

## Nguyên nhân gốc
- openTable tiếp tục sau await với selectTab từ render trước, giữ onTabChange cũ.

## Cách fix
- File và thay đổi: `POS_UI/src/features/pos/LivePosScreen.tsx`: giữ callback mới nhất trong ref và gọi từ selectTab.
- Test tái hiện: `POS_UI/test/shift-screen.test.mjs::[B-64]`: đỏ trước, xanh sau; UI 219/219; build exit 0.

## Quy tắc phòng tránh
- Callback chạy sau await phải dùng prop hiện hành khi điều hướng phụ thuộc route.

## Dấu hiệu nhận biết khi review
- Callback cũ được gọi sau khi prop đổi trong lúc request đang chờ.
