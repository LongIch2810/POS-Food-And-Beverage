**Trạng thái:** đã sửa, local verified.

Triệu chứng: logout bằng refresh token cũ đã xoay của phiên đã chết, khi mất CSRF, trả 403 thay vì 204 và không xóa cookie.
Tái hiện: login, refresh, replay để thu hồi session, rồi logout bằng refresh cookie gốc không có CSRF.
Nguyên nhân: service cho token lịch sử đã xoay đi vào kiểm tra CSRF dù session không còn token hiệu lực.
Cách sửa: dưới khóa session hiện có, kiểm tra token hiện hành trước khi yêu cầu CSRF; giữ CSRF khi session còn sống.
Kiểm chứng: test integration PostgreSQL trong `qa-evidence/2026-10-29-091545-fc2b07d/run.md`.
Task: `tasks/completed/2026-10-29-pb02-review-fixes.md`; commit gốc `fc2b07d`.
