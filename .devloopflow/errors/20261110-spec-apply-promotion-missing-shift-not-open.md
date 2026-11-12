---
id: 20261110-spec-apply-promotion-missing-shift-not-open
tags: [docs, spec, invoices, promotion, shift]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Spec apply-promotion thiếu `409 SHIFT_NOT_OPEN` (B-9, R6-5)

## Triệu chứng
- Nguồn: review vòng 6 (đọc bù) của task `20261109-sprint08-payment`, finding R6-5 (Low, lệch tài liệu, M-4), ghi backlog `B-9`. Đã sửa (10/11/2026).
- `specs/invoices.md:57`, mục lỗi của apply-promotion, không liệt kê `SHIFT_NOT_OPEN`, trong khi remove-promotion (dòng ~61) có mã này.
- Output thật: `POS_API/src/sales/sales.service.ts:38,166-167` (`writable()` trả `SHIFT_NOT_OPEN`).

## Nguyên nhân gốc
- Danh sách lỗi của apply-promotion không đồng bộ với code và với remove-promotion. Đã xác minh bằng đọc spec và code.

## Cách fix
- File và thay đổi: `specs/invoices.md:57` — thêm `SHIFT_NOT_OPEN` (409) vào danh sách lỗi.
- Test tái hiện: không áp dụng (tài liệu). Kiểm thay thế: `grep -n "SHIFT_NOT_OPEN" specs/invoices.md` cho dòng 57 có mã này.

## Quy tắc phòng tránh
- Khi một endpoint dùng chung một guard với endpoint khác (ví dụ `writable()`), danh sách lỗi của cả hai endpoint phải được đối chiếu với nhau.

## Dấu hiệu nhận biết khi review
- Mục lỗi của một endpoint thiếu mã mà endpoint cùng nhóm đã liệt kê.
