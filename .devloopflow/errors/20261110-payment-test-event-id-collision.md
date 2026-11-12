---
id: 20261110-payment-test-event-id-collision
tags: [test, sepay, webhook, fixture]
found_by: code-reviewer
severity: Very Low
occurrences: 2
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Test `[R5-2]` dùng lại event id 6201 của test khác (B-11, R6-7)

## Triệu chứng
- Nguồn: review vòng 6 (đọc bù) của task `20261109-sprint08-payment`, finding R6-7 (Very Low), ghi backlog `B-11`. Đã sửa (10/11/2026).
- `payment.integration.test.ts` dùng `payload(6201)` trong `[R5-2]` (dòng ~1161) và `test_ST6_transfer_amounts` dùng `[6201,49999]` (dòng ~1240). Hai test độc lập nhờ `[R5-2]` trả 503 trước khi xử lý id, nhưng phụ thuộc ngầm vào nhau.
- Không có output lỗi; đây là rủi ro cấu trúc test.

## Nguyên nhân gốc
- Event id của test mới được chọn trùng với id đã có, không kiểm tra trước. Đã xác minh bằng `grep` trong file test.

## Cách fix
- File và thay đổi: `POS_API/src/sales/tests/payment.integration.test.ts` (dòng ~1180) — đổi `payload(6201)` của `[R5-2]` sang `payload(6299)`; `grep` xác nhận 6299 chưa dùng.
- Test tái hiện: không áp dụng (đổi id fixture, không đổi hành vi). Kiểm: API `npm test` 138/138 pass, exit 0 (lượt sau sửa).

## Quy tắc phòng tránh
- Khi thêm test dùng id fixture cố định, `grep` id đó trong toàn bộ file test trước khi chọn.

## Dấu hiệu nhận biết khi review
- Cùng một id fixture xuất hiện ở hai test không liên quan.

## Cập nhật (B-24, R9-4 — review vòng 9, 10/11/2026)
- Cùng loại lỗi, lần xuất hiện thứ hai (occurrences 2): `payment.integration.test.ts:229,232,237` (ca B-15) dùng event id `7501` trùng test `[V3-2]` (~dòng 377); `test_ST7_exception_visibility` (~dòng 317, 321) cũng liên quan. Finding R9-4 (Low), backlog `B-24`.
- Cách fix (theo ghi chú fix-backlog B-21..B-25, 10/11/2026): ca B-15 đổi sang id `7551`/`7552`; vẫn giữ `DELETE` dữ liệu vì `test_ST7_exception_visibility` đếm mọi exception của chi nhánh (lý do ghi trong comment của test). API `npm test` 148/148 pass, exit 0 (local).
- Quy tắc phòng tránh giữ nguyên: `grep` id fixture trong toàn bộ file test trước khi chọn.
