---
id: 20261110-backlog-manual-confirm-replay-uppercase-uuid
tags: [sales, api, idempotency, transfer, uuid]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Replay xác nhận thủ công với UUID viết hoa bị coi là dùng lại key (B-7, R6-3)

## Triệu chứng
- Nguồn: review vòng 6 (đọc bù) của task `20261109-sprint08-payment`, finding R6-3 (Low), ghi trong backlog `B-7` ngày 2026-11-10.
- POST `/transfer-attempts/<UUID viết hoa>/confirm-manual` lần 1 trả 201. Lần 2 cùng `Idempotency-Key`, cùng body, cùng path viết hoa trả 409 `IDEMPOTENCY_KEY_REUSED` thay vì replay 201 với header `Idempotent-Replay: true`.
- Output RED lúc tái hiện (`tdd`, `POS_API/src/sales/tests/payment.integration.test.ts::[B-7]`):
  ```
  replay with uppercase UUID must not be treated as key reuse
  409 !== 201 (expected: 201, actual: 409)
  ```

## Nguyên nhân gốc
- `validId()` chấp nhận UUID viết hoa nhưng không chuẩn hóa. Hash băm và phép so sánh `previous.transfer_attempt_id !== attemptId` dùng chuỗi gốc, còn PostgreSQL trả UUID chữ thường nên hai giá trị không khớp. Đã xác minh bằng RED ở trên.

## Cách fix
- File và thay đổi: `POS_API/src/sales/transfer-attempts.service.ts` (hàm `confirmTransferManually`, dòng ~122) — tham số đổi thành `rawAttemptId`, thêm `const attemptId=rawAttemptId.toLowerCase();` trước khi băm và so sánh.
- Test tái hiện: `POS_API/src/sales/tests/payment.integration.test.ts::[B-7] manual confirm replay with uppercase attempt id` (lần 1 201, lần 2 201 replay, chỉ 1 payment).
- Kiểm chứng: API `npm run build` exit 0; `npm test` 137/137 pass, exit 0 (lượt này, sandbox PostgreSQL `pos_sprint08_test_pg`). Chưa có CI độc lập.

## Quy tắc phòng tránh
- Mọi khóa idempotency gắn với định danh (UUID, mã) phải chuẩn hóa về một dạng trước khi băm hoặc so sánh, vì DB và client có thể khác dạng hoa/thường.
- Luồng CASH đã có test tương tự (`payment.integration.test.ts`, ~dòng 421); luồng manual cần test riêng.

## Dấu hiệu nhận biết khi review
- Hàm nhận ID từ path đưa thẳng vào hash hoặc so sánh mà không chuẩn hóa.
