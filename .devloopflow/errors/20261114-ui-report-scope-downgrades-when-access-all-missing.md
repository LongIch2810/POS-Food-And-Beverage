---
id: 20261114-ui-report-scope-downgrades-when-access-all-missing
tags: [ui, api, reports, permissions]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261114-sprint10-reports]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# UI hạ mức báo cáo khi thiếu branch.access_all còn server từ chối, người dùng thấy 403 và "Thử lại" mãi

## Triệu chứng
- B-55 (R1-5): người có `report.view_all` thiếu `branch.access_all` (và có thêm `view_branch` hoặc `view_shift`): `reportScope` ở UI trả `branch` hoặc `shift`, server chọn mức `all` và trả 403.
- Red nguyên văn của `tdd`: `not ok 14 - [B-55] ... expected: 0  actual: 1` (màn vẫn gọi API).

## Nguyên nhân gốc
- UI và server tự chọn mức báo cáo bằng hai logic riêng, không khớp nhau ở tổ hợp quyền hiếm.

## Cách fix
- Quyết định user 2026-11-14: chỉ OWNER xem toàn cửa hàng, bắt buộc có cả `report.view_all` và `branch.access_all`, không hạ mức.
- File: `POS_UI/src/features/reports/DailyReportScreen.tsx` (`reportScope` trả `null` khi có `view_all` mà thiếu `access_all`). Server không đổi.
- Test tái hiện: `POS_UI/test/reports-screen.test.mjs` `[B-55] test_ST3_AC1_view_all_without_access_all_is_not_downgraded`.

## Quy tắc phòng tránh
- Khi UI chọn phạm vi từ quyền, dùng cùng quy tắc với server và có test cho mọi tổ hợp quyền ở biên.

## Dấu hiệu nhận biết khi review
- Hai nơi cùng suy mức báo cáo từ danh sách quyền. Còn lại chưa xử lý: `navigation.ts:20`, `App.tsx:115`, `AppShell.tsx:120` vẫn hiện tab Báo cáo cho tổ hợp này (ghi vào backlog B-59).
