---
id: 20261114-ui-report-tab-shown-without-access-all
tags: [ui, permission, reports, nav]
found_by: tdd
severity: Low
occurrences: 1
tasks: [20261114-sprint10-reports]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Tab Báo cáo vẫn hiện cho người có report.view_all thiếu branch.access_all

## Triệu chứng
- B-59: `POS_UI/src/app/navigation.ts:20`, `POS_UI/src/app/App.tsx:115`, `POS_UI/src/components/common/AppShell.tsx:120` chỉ kiểm có một trong ba quyền `report.*`, không xét `branch.access_all`. Người có `report.view_all` thiếu `branch.access_all` vẫn thấy tab và vào màn, rồi gặp "Không có quyền" (màn đã đúng từ B-55).
- Red nguyên văn của `tdd`: `not ok 4 - [B-59] navigation: ... error: chỉ view_all  true !== false`; `not ok 5 - [B-59] AppShell: ...`; `not ok 6 - [B-59] App: ...`.

## Nguyên nhân gốc
- Sau B-55 chỉ sửa `reportScope` ở màn; ba nơi suy quyền khác của UI không được sửa cùng (xem M-41).

## Cách fix
- Quyết định user 2026-11-14 ("2"): tab Báo cáo chỉ hiện khi có `report.view_shift`, `report.view_branch`, hoặc `report.view_all` kèm `branch.access_all`. Plan ST-3.AC-1 được đổi lời và ghi Changelog.
- File: `navigation.ts:20` (điều kiện mới); `App.tsx` dùng `availableTabs.includes('reports')`; `AppShell.tsx:120` cùng điều kiện inline; `DailyReportScreen.tsx` không đổi.
- Test: `POS_UI/test/app-invoices-shell.test.mjs` ba test `[B-59]` (navigation, AppShell, App; bảng 6 ca) và một dòng của test cũ `test_ST3_AC1_service_shell_permissions shell` đổi theo quyết định (`view_all` đi kèm `branch.access_all`).

## Quy tắc phòng tránh
- Khi sửa quy tắc quyền ở một nơi UI, grep mọi nơi suy quyền cùng loại (`report.view_`) và sửa cùng lúc (M-41, M-45).

## Dấu hiệu nhận biết khi review
- Điều kiện quyền báo cáo từng lặp ở ba nơi; đã gom về một hàm `reportScope` ở `POS_UI/src/app/navigation.ts:10-18` (tab, AppShell và màn Báo cáo cùng dùng). Còn lại: `DailyReportScreen` (tầng feature) import từ `app/navigation`; tách sang `src/auth/` cần sửa thêm mock nhiều test.
