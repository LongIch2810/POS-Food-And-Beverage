---
id: 20261114-api-validation-before-permission-check
tags: [api, reports, permissions, validation]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261114-sprint10-reports]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Validation query chạy trước kiểm quyền, người không có quyền nhận 422 thay vì 403

## Triệu chứng
- B-56 (R1-6): `reportsQueryPipe.transform` trong `reports.controller.ts` ném 422 trước khi service kiểm quyền; plan ST-2 xếp quyền trước validation.
- Red nguyên văn: `not ok 1 - [B-56] test_ST2_AC3_permission_before_validation ... 422 !== 403`.

## Nguyên nhân gốc
- Controller validate query rồi mới gọi service, kiểm quyền nằm trong service.

## Cách fix
- File: `POS_API/src/reports/reports.service.ts` thêm `reportLevel(user)` (kiểm `storeId`, `report.view_*`, `view_all` kèm `branch.access_all`, ném 403), `getRevenue` dùng lại; `POS_API/src/reports/reports.controller.ts` gọi `reportLevel(user)` trước pipe.
- Test tái hiện: `reports.integration.test.ts` `[B-56] test_ST2_AC3_permission_before_validation`.

## Quy tắc phòng tránh
- Endpoint có quyền: kiểm quyền trước validation đầu vào và có test người không quyền gửi input sai phải nhận 403.

## Dấu hiệu nhận biết khi review
- Pipe hoặc DTO validation chạy trong controller trước khi quyền được kiểm.
