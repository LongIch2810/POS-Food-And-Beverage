**Trạng thái:** đã sửa, local verified.

Triệu chứng: username PB-01 có TAB đầu hoặc chỉ có TAB bị login PB-02 trả 401/422.
Tái hiện: tạo user có username `\tlegacy` hoặc `\t` theo constraint PB-01 rồi gọi POST /auth/login.
Nguyên nhân: DTO và service dùng JavaScript trim, DTO còn yêu cầu ký tự không phải whitespace; PB-01 dùng PostgreSQL `lower(btrim(...))`.
Cách sửa: DTO chỉ bỏ dấu cách ASCII ở hai đầu, kiểm tra không rỗng; bootstrap và login chuẩn hóa bằng cùng biểu thức PostgreSQL.
Kiểm chứng: test integration PostgreSQL và foundation trong `qa-evidence/2026-10-29-091545-fc2b07d/run.md`.
Task: `tasks/completed/2026-10-29-pb02-review-fixes.md`; commit gốc `fc2b07d`.
