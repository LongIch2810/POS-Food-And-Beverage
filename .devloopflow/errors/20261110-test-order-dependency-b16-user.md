---
id: 20261110-test-order-dependency-b16-user
tags: [test, sales, fixture, order-dependency]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Test `[B-23]` phụ thuộc user do test `[B-16]` tạo, chạy riêng sẽ lỗi (B-26, R10-1)

## Triệu chứng
- Nguồn: review vòng 10 của task `20261109-sprint08-payment`, finding R10-1 (Low), ghi backlog `B-26`. Đã sửa (10/11/2026).
- `payment.integration.test.ts:203-204`: test `[B-23]` dùng user `b16_nobranch` do test `[B-16]` tạo; chạy riêng `[B-23]` không có user đó.
- Output lỗi thật khi tái hiện (ghi trong task file, fix-backlog B-26): test `[B-23]` chạy riêng đỏ với status `401` vì user chưa tồn tại.

## Nguyên nhân gốc
- Fixture user được tạo bên trong một test thay vì khối khởi tạo chung, nên test sau phụ thuộc thứ tự chạy. Đã xác minh bằng chạy riêng `--test-name-pattern "B-23"` (đỏ trước fix, xanh sau).

## Cách fix
- File và thay đổi: `POS_API/src/sales/tests/payment.integration.test.ts` (~dòng 111) — chuyển việc tạo `b16_nobranch` lên khối khởi tạo chung.
- Test tái hiện: chạy riêng `[B-23]` bằng `--test-name-pattern "B-23"`: đỏ (401) trước, xanh sau. API `npm test` 149/149 pass, exit 0 (local, sandbox PostgreSQL).

## Quy tắc phòng tránh
- Fixture dùng bởi nhiều test tạo trong khối khởi tạo chung; kiểm mỗi test mới bằng chạy riêng với `--test-name-pattern`.

## Dấu hiệu nhận biết khi review
- Test dùng tên user/dữ liệu do test khác tạo mà không tạo lại.
