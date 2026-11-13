---
id: 20261113-force-close-field-contrast
tags: [ui, shifts, accessibility, contrast]
found_by: ac-verifier
severity: Medium
occurrences: 1
tasks: [20261113-sprint09-ui]
---

# Viền trường đóng cưỡng chế không đủ tương phản (V1-3)

## Triệu chứng
- RED: `Quản lý kiểm đếm và nhập số tiền...: 1.398450586061828:1`. Nguồn `.devloopflow/verify/20261113-sprint09-ui/evidence/fix-verify/red.log`.
- Nghiệm thu lần 1: `.devloopflow/verify/20261113-sprint09-ui/fails.md`.

## Nguyên nhân gốc
- Ba trường dùng --color-border thay cho --color-border-control trên nền trắng.

## Cách fix
- File: `POS_UI/src/features/shifts/ForceCloseShiftModal.tsx — dùng --color-border-control cho ba trường.`
- Test: `POS_UI/test/shift-close-accessibility.browser.mjs::[V1-3] force close field borders have at least 3:1 surface contrast`.
- GREEN: `.devloopflow/verify/20261113-sprint09-ui/evidence/fix-verify/green.log`; agent chính chạy lại 3/3, UI 142/142 và build exit 0. Chưa nghiệm thu lại.

## Quy tắc phòng tránh
- Đo tương phản viền trường trên nền thực tế, đạt tối thiểu 3:1.

## Dấu hiệu nhận biết khi review
- Trường tương tác dùng token viền trang trí thay token viền điều khiển.
