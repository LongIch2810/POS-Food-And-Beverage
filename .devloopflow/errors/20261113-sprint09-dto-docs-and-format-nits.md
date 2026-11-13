---
id: 20261113-sprint09-dto-docs-and-format-nits
tags: [shifts, api, swagger, format]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261112-sprint09-drawer-cancel-invoices]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Swagger, định dạng và `.trim()` thừa trong code Sprint 09 (B-43, B-44, B-46)

## Triệu chứng
- `POS_API/src/shifts/http/shifts.dto.ts:72`: `@ApiProperty` của `reason` khai báo trường bắt buộc nhưng validator dùng `@IsOptional()` (thiếu `reason` trả `EXPENSE_REASON_REQUIRED`, không phải `VALIDATION_ERROR`), nên Swagger lệch hành vi thật.
- `cancel-paid.integration.test.ts:193` thụt lề 8 khoảng thay vì 6; `shifts.response.ts:43-44` có hai dòng trống liên tiếp.
- `shifts.service.ts:442` có `input.reason?.trim()` thừa vì DTO `@Transform(trim)` đã trim và `addExpense` chỉ có caller `shifts.controller.ts`.

## Nguyên nhân gốc
- Sao chép mẫu `CancelInvoiceDto` (cũng dùng `@ApiProperty` với `@IsOptional`) và viết phòng thủ thừa khi code chạy sau test; không có kiểm tra định dạng/lint trong dự án.

## Cách fix
- File và thay đổi: `POS_API/src/shifts/http/shifts.dto.ts` (`@ApiPropertyOptional`), `POS_API/src/shifts/http/shifts.response.ts` (bỏ dòng trống), `POS_API/src/sales/tests/cancel-paid.integration.test.ts` (thụt lề), `POS_API/src/shifts/shifts.service.ts:442` (`const reason = input.reason;`).
- Test tái hiện: không áp dụng (không đổi hành vi). Test bảo vệ: `shift-expenses.integration.test.ts::[S9-01][ST-2.AC-1]` và `[S9-01][ST-2.AC-4]`, xanh trước và sau; log `.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/evidence/fix-backlog/`. Kiểm thay thế còn lại: mở Swagger development ở `http://localhost:3000/api/docs` (chưa mở).

## Quy tắc phòng tránh
- Khi DTO dùng `@IsOptional()` mà service tự báo lỗi riêng, dùng `@ApiPropertyOptional` và nêu mã lỗi trong mô tả.
- Không thêm `.trim()` ở service khi DTO đã `@Transform(trim)` và chỉ controller gọi.

## Dấu hiệu nhận biết khi review
- `@ApiProperty` (bắt buộc) đi cùng `@IsOptional()`; `?.trim()` ngay sau DTO đã có `@Transform(trim)`.
