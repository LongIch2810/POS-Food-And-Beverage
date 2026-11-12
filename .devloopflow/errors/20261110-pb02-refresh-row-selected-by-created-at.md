---
id: 20261110-pb02-refresh-row-selected-by-created-at
tags: [auth, test, refresh-token, flaky]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Test PB-02 chọn dòng refresh theo `created_at` toàn bảng (B-10, R6-6)

## Triệu chứng
- Nguồn: review vòng 6 (đọc bù) của task `20261109-sprint08-payment`, finding R6-6 (Low), ghi backlog `B-10`. Đã sửa (10/11/2026).
- Assertion PB-02 lấy dòng `refresh_tokens` sớm nhất toàn bảng theo `created_at`. Khi bảng có dòng của phiên khác có `created_at` nhỏ hơn, assertion đọc nhầm dòng.
- Output RED lúc tái hiện (`tdd`, khi thêm dòng mồi cũ hơn): `ok(oldRows[0].revoked_at && oldRows[0].replaced_at)` báo falsy, vì đã chọn nhầm dòng mồi.
- Lưu ý: lần chạy đầu sau khi Docker tắt có PB-02 fail ở cùng assertion; các lần chạy sau khi sandbox DB hoạt động đều pass. Chưa xác minh được nguyên nhân của lần fail đó; không ghi là đã biết.

## Nguyên nhân gốc
- Test chọn dòng theo thứ tự thời gian toàn bảng thay vì theo token của phiên vừa refresh. Đã xác minh bằng RED ở trên.

## Cách fix
- File và thay đổi: `POS_API/src/auth/tests/auth.integration.test.ts` (quanh dòng 185-197) — chọn dòng theo `token_hash` của cookie refresh cũ (băm SHA-256, khớp `tokenHash` trong `auth.service.ts`) và kiểm `oldRows.length === 1`. Assertion `revoked_at && replaced_at` giữ nguyên.
- Test tái hiện: thêm dòng mồi trong luồng PB-02 (không tạo test mới riêng).
- Kiểm chứng: API `npm test` 138/138 pass, exit 0 (sandbox PostgreSQL local, lượt sau sửa). Chưa có CI độc lập.

## Quy tắc phòng tránh
- Trong test lấy bản ghi theo trạng thái của một phiên, lọc theo khóa định danh của phiên đó, không chọn theo thứ tự toàn bảng.

## Dấu hiệu nhận biết khi review
- `ORDER BY created_at LIMIT 1` trong test không có điều kiện lọc theo phiên hoặc token.
