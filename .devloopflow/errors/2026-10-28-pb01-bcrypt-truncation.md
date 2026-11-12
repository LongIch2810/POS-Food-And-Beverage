# PB-01 bcrypt cắt mật khẩu bootstrap quá 72 byte

**Trạng thái:** đã sửa, QA local xác nhận.

- Task: `tasks/completed/2026-10-28-pb-01-api-postgresql.md`.
- Triệu chứng: hai mật khẩu có cùng 72 byte đầu và khác phần sau vẫn khớp cùng một hash bcrypt.
- Tái hiện: reviewer so sánh hash với `bcryptjs` đã cài; thư viện xác nhận giới hạn 72 byte trong README.
- Nguyên nhân: bootstrap chỉ kiểm tra độ dài tối thiểu, không chặn mật khẩu bị bcrypt cắt ngầm.
- Sửa: từ chối `bcrypt.truncates(password)` trước khi hash; ghi giới hạn byte trong `specs/foundation.md`.
- Kiểm chứng: test từ chối chuỗi 73 byte ASCII và 74 byte UTF-8, xem `qa-evidence/20261028-131159-842ba1e/run.md`.
