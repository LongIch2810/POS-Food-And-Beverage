---
id: 20261116-products-dialog-persists-after-tab-change
tags: [ui, products, router, state]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261115-sprint10-stock-ledger, 20261116-sprint10-qa]
---

# B-66/V1-2 Dialog Thực đơn còn mở sau Back

## Triệu chứng
- Mở “Thêm danh mục mới” ở `/thuc-don/danh-muc`, bấm Back về `/thuc-don/kich-co`: tab Kích cỡ active nhưng dialog Danh mục vẫn phủ bảng. Nguồn: `.devloopflow/verify/20261116-sprint10-qa/fails.md`, V1-2, và `.devloopflow/review/backlog.md`, B-66.
- Chín test `[V1-2/B-66]` đỏ trước sửa với `true !== false` khi đổi tab rồi kiểm dialog; log `C:/Users/Admin/AppData/Local/Temp/sprint10-products-all-red.log`.

## Nguyên nhân gốc
- `ProductsScreen` nhận `activeMainTab` mới từ router, còn tám state điều khiển dialog vẫn giữ giá trị cũ. State tồn tại độc lập với nội dung tab và mở lại cả khi Forward quay về.

## Cách fix
- `POS_UI/src/features/products/ProductsScreen.tsx`: effect theo `activeMainTab` đóng sáu modal, state gán danh mục topping và công thức.
- Test tái hiện: `POS_UI/test/products-tabs.test.mjs::[V1-2/B-66]` (9 ca dialog) và `POS_UI/test/stock-ledger-router.browser.mjs::[V1-2/B-66] Products Back đóng dialog Danh mục và Forward không mở lại`. Agent chính chạy lại 2026-11-16: UI 230/230, browser 34/34, typecheck và build exit 0, API 256/256.

## Quy tắc phòng tránh
- Khi router thay tab từ Back/Forward, đóng state dialog thuộc tab cũ ở component nhận tab, kể cả state hiện bị ẩn và có thể mở lại.

## Dấu hiệu nhận biết khi review
- Dialog điều khiển bởi state riêng nhưng không được reset khi prop tab đổi; chỉ ẩn theo tab không dọn state.
