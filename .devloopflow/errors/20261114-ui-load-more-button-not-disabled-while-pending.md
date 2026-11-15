---
id: 20261114-ui-load-more-button-not-disabled-while-pending
tags: [ui, reports, test]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261114-sprint10-reports]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Nút "Tải thêm ca" không có trạng thái chờ, bấm đôi tạo hai request cùng cursor

## Triệu chứng
- B-58 (R1-8): `DailyReportScreen.tsx` nút "Tải thêm ca" không `disabled` khi đang tải. Red nguyên văn: `not ok 15 - [B-58] ... + actual - expected  + undefined  - true`.
- Cùng finding: thụt lề lệch ở dòng 195-197 (đã sửa, refactor dưới test xanh) và `MockEngine.getDailyReport` không còn caller (đã xóa sau khi grep `src` và `test`). `down()` của migration `20261114000001-ReportsPermissions.ts` giữ nguyên theo quy tắc không sửa migration.

## Nguyên nhân gốc
- Không có cờ pending cho thao tác tải thêm.

## Cách fix
- File: `POS_UI/src/features/reports/DailyReportScreen.tsx` (`moreLoading`, guard trong `loadMore`, `disabled`); `POS_UI/src/mock/mockEngine.ts` (xóa hàm thừa).
- Test tái hiện: `POS_UI/test/reports-screen.test.mjs` `[B-58] test_ST3_AC2_load_more_pending_disabled`.

## Quy tắc phòng tránh
- Nút kích hoạt request phải disabled hoặc có guard khi đang chờ; xóa code chết khi bỏ caller cuối cùng.

## Dấu hiệu nhận biết khi review
- Handler `onClick` gọi API không có cờ chờ.
