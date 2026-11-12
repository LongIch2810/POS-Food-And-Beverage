# Lỗi cài Argon2 trên đường dẫn có `&`

**Trạng thái:** đã xử lý cho PB-01.

- Task: `tasks/completed/2026-10-28-pb-01-api-postgresql.md`.
- Triệu chứng: `npm install` trong `POS_API/` lỗi ở script cài `argon2`; Windows `cmd.exe` tách đường dẫn `POS-F&B`, dẫn đến không tìm thấy `cross-env`.
- Tái hiện: chạy `npm install` khi project nằm ở `D:\saved\Project\POS-F&B` với Node v22.22.2 trên Windows.
- Nguyên nhân đã xác minh: output npm cho thấy đường dẫn bị tách tại ký tự `&` trong script của dependency native.
- Cách sửa: dùng `bcryptjs` với cost 12 theo lựa chọn bcrypt được phép ở `docs/architecture/auth.md`; không cần script cài native. Script npm trong project gọi CLI bằng `node` và đường dẫn tương đối để tránh `cmd.exe` tách đường dẫn workspace có `&`.
- Kiểm chứng: `npm install`, `npm run build`, `npm test` đều thành công; xem `qa-evidence/20261028-125327-842ba1e/run.md` cho lần kiểm tra cuối.
