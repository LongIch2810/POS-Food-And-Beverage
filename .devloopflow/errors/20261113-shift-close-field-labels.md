---
id: 20261113-shift-close-field-labels
tags: [ui, shifts, accessibility, labels]
found_by: ac-verifier
severity: Medium
occurrences: 1
tasks: [20261113-sprint09-ui]
---

# Nhãn trường đóng ca không liên kết điều khiển (V1-2)

## Triệu chứng
- RED: `Label has no control: Tổng tiền mặt thực tế trong két (VND)`. Nguồn `.devloopflow/verify/20261113-sprint09-ui/evidence/fix-verify/red.log`.
- Nghiệm thu lần 1: `.devloopflow/verify/20261113-sprint09-ui/fails.md`.

## Nguyên nhân gốc
- Các label đứng cạnh trường nhưng thiếu liên kết htmlFor/id.

## Cách fix
- File: `POS_UI/src/features/shifts/BlindCountCloseShiftModal.tsx và ForceCloseShiftModal.tsx — nối nhãn vào trường bằng htmlFor/id.`
- Test: `POS_UI/test/shift-close-accessibility.browser.mjs::[V1-2] visible close field labels identify their controls`.
- GREEN: `.devloopflow/verify/20261113-sprint09-ui/evidence/fix-verify/green.log`; agent chính chạy lại 3/3, UI 142/142 và build exit 0. Chưa nghiệm thu lại.

## Quy tắc phòng tránh
- Đảm bảo mỗi nhãn nhìn thấy được liên kết với đúng input hoặc textarea.

## Dấu hiệu nhận biết khi review
- label.control rỗng hoặc tìm trường theo nhãn không tìm được.
