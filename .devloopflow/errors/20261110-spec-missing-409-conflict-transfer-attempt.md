---
id: 20261110-spec-missing-409-conflict-transfer-attempt
tags: [docs, spec, transfer-attempt, error-code]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Spec thiếu `409 CONFLICT` của POST transfer-attempts khi không tạo được mã duy nhất (B-20)

## Triệu chứng
- Nguồn: review vòng 8 của task `20261109-sprint08-payment`, finding R8-4 (Very Low), ghi backlog `B-20`, `đã sửa` (10/11/2026).
- `specs/invoices.md:85` không liệt kê `409 CONFLICT` của POST transfer-attempts, trong khi `POS_API/src/sales/transfer-attempts.service.ts:98` trả lỗi này khi không tạo được mã lượt duy nhất.

## Nguyên nhân gốc
- Đường lỗi hiếm (va chạm mã ngẫu nhiên) được thêm vào code nhưng không được đồng bộ vào bảng lỗi của spec. Đã xác minh theo review vòng 8.

## Cách fix
- File và thay đổi: `specs/invoices.md` — thêm `409 CONFLICT` vào danh sách lỗi của POST transfer-attempts (theo ghi chú fix-backlog B-13..B-20, 10/11/2026).
- Test tái hiện: không áp dụng (tài liệu). Kiểm: `grep -n "CONFLICT" specs/invoices.md`.

## Quy tắc phòng tránh
- Khi service trả mã lỗi mới, đối chiếu bảng lỗi trong spec của endpoint trong cùng thay đổi (xem `20261110-promotion-not-applicable-message-inconsistent.md` cho họ lỗi tương tự).

## Dấu hiệu nhận biết khi review
- `throw`/mã lỗi trong service không xuất hiện trong bảng lỗi của spec endpoint.
