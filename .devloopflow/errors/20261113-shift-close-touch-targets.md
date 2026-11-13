---
id: 20261113-shift-close-touch-targets
tags: [ui, shifts, accessibility, tablet]
found_by: ac-verifier
severity: Medium
occurrences: 1
tasks: [20261113-sprint09-ui]
---

# Điều khiển đóng ca nhỏ hơn mục tiêu chạm (V1-1)

## Triệu chứng
- RED: `Đếm theo tờ tiền: 138.390625×40, expected >=48×48`. Nguồn `.devloopflow/verify/20261113-sprint09-ui/evidence/fix-verify/red.log`.
- Nghiệm thu lần 1: `.devloopflow/verify/20261113-sprint09-ui/fails.md`.

## Nguyên nhân gốc
- Hai modal dùng kích thước điều khiển 40–45,33px và nút đóng cưỡng chế 48px, thấp hơn chuẩn 48/56px.

## Cách fix
- File: `POS_UI/src/features/shifts/BlindCountCloseShiftModal.tsx và ForceCloseShiftModal.tsx — tăng vùng chạm theo token và kích thước hiện có.`
- Test: `POS_UI/test/shift-close-accessibility.browser.mjs::[V1-1] close controls meet tablet touch targets in both orientations`.
- GREEN: `.devloopflow/verify/20261113-sprint09-ui/evidence/fix-verify/green.log`; agent chính chạy lại 3/3, UI 142/142 và build exit 0. Chưa nghiệm thu lại.

## Quy tắc phòng tránh
- Kiểm kích thước thực của mọi điều khiển ở hai hướng tablet.

## Dấu hiệu nhận biết khi review
- Nút chế độ, nút cộng/trừ, input hoặc nút chính có chiều cao thấp hơn chuẩn.
