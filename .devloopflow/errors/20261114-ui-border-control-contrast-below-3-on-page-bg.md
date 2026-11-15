---
id: 20261114-ui-border-control-contrast-below-3-on-page-bg
tags: [ui, css, accessibility, design-tokens, test]
found_by: ac-verifier
severity: Low
occurrences: 1
tasks: [20261114-sprint10-reports]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Viền điều khiển `--color-border-control` đo 2,72:1 trên nền trang, dưới ngưỡng 3:1 của DESIGN.md

## Triệu chứng
- verify-ac lần 4 (phát hiện mới, `report-4.md` mục Đề xuất 2): `POS_UI/src/index.css:14` `--color-border-control: #8a979d` trên nền trang `--color-bg: #f2f4f5` đo 2,72:1. `DESIGN.md:649`: "Viền ô nhập và nút phụ tối thiểu 3:1 so với nền (`--color-border-control`)." `DESIGN.md:77` chỉ ghi 3,0:1 trên trắng.
- Red nguyên văn của `tdd`: `not ok 1 - [C-1] viền điều khiển đạt tương phản >= 3:1 trên --color-bg  error: 'tương phản 2.721:1 < 3:1 trên --color-bg'`.

## Nguyên nhân gốc
- Token được chọn đạt 3:1 trên nền trắng, nhưng ô nhập nằm trên nền trang xám nhạt `#f2f4f5`; không có test đo tương phản token với nền thực tế.

## Cách fix
- Quyết định user 2026-11-14: sửa cho đúng `DESIGN.md:649`.
- File: `POS_UI/src/index.css:14` đổi `#8a979d` thành `#818d93` (3,088:1 trên `#f2f4f5`, 3,406:1 trên trắng, 2,891:1 trên `#e9edef`).
- Test tái hiện: `POS_UI/test/design-contrast.test.mjs` `[C-1]` (đọc token từ `index.css` thật, ngưỡng 3 cố định).
- Chưa làm: bảng token `DESIGN.md:77` chưa cập nhật (chờ user duyệt); `--color-surface-sunken` (2,891:1) chưa kiểm xem có điều khiển nằm trên nền đó.

## Quy tắc phòng tránh
- Tương phản của token viền/UI phải đo trên nền thực tế (`--color-bg`, `--color-surface`) bằng test đọc từ CSS, không chỉ trên nền trắng.

## Dấu hiệu nhận biết khi review
- Tài liệu thiết kế ghi tỷ lệ tương phản "trên trắng" trong khi control đặt trên nền khác.
