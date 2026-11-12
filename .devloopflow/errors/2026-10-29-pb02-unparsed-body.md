**Trạng thái:** đã sửa, local verified.

Triệu chứng: route không khai báo body nhận payload `text/plain` và tiếp tục xử lý.
Tái hiện: POST /auth/refresh với Origin, cookie/CSRF hợp lệ và body `text/plain`; trước sửa trả 200.
Nguyên nhân: kiểm tra chỉ nhìn `request.body`, trong khi Express không parse loại body đó.
Cách sửa: kiểm tra thêm Content-Length và Transfer-Encoding trước khi xử lý.
Kiểm chứng: test HTTP integration trong `qa-evidence/2026-10-29-091545-fc2b07d/run.md`.
Task: `tasks/completed/2026-10-29-pb02-review-fixes.md`; commit gốc `fc2b07d`.
