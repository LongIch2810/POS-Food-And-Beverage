# QA-PB01-01 — npm test khi biến bootstrap hợp lệ có sẵn

**Nhãn:** local do agent QA chạy; không phải CI độc lập.

- Commit: `842ba1ef3e8a35173d76445baea0adce8576f6af`.
- Working tree: dirty trước và sau lần chạy; PB-01 chưa commit cùng các thay đổi có sẵn.
- Môi trường: Windows PowerShell 5.1, Node.js 22.22.2, Docker Desktop với PostgreSQL 17 local.
- Bắt đầu: 2026-10-28 13:02:30 +07:00. Kết thúc: 2026-10-28 13:02:33 +07:00.
- Điều kiện: `DATABASE_URL` nạp từ `POS_INFRA/.env.local` (không ghi giá trị); cả ba `BOOTSTRAP_ADMIN_*` được đặt hợp lệ trong tiến trình, mật khẩu giả sinh ngẫu nhiên 32 ký tự và không ghi log. DB local chính có 1 migration, 0 user trước/sau.
- Lệnh kiểm thử chính xác trong `POS_API/`: `npm test`. Exit code: **1**. Output gốc: [test.log](evidence/test.log). Danh sách test và kết quả nằm trong output: `PB-01 migration, bootstrap and database constraints` thất bại, 0 pass, 1 fail.
- Truy vấn DB chỉ đọc trước/sau: `docker exec pos_infra-postgres-1 psql -U pos_local -d pos_local -t -A -c "SELECT (SELECT count(*) FROM migrations), (SELECT count(*) FROM users)"`; output [db-before.log](evidence/db-before.log) và [db-after.log](evidence/db-after.log).

**Expected:** `npm test` chạy độc lập với biến bootstrap hợp lệ mà README yêu cầu để chạy API; test tự chuẩn bị trạng thái đầu vào và xác nhận hành vi thiếu biến. **Actual:** test fail `Missing expected rejection.` tại `foundation.test.js:72` vì `bootstrapAdmin(db)` đọc biến bootstrap hợp lệ từ môi trường trước khi test xóa chúng. Database thử do test tạo đã được dọn trong `finally`; DB local chính không đổi. Đây là lỗi test isolation, chưa chứng minh lỗi bootstrap của API.

Lệnh tái chạy: nạp `DATABASE_URL` từ DB local, đặt ba `BOOTSTRAP_ADMIN_*` hợp lệ trong môi trường shell, chạy `npm test` ở `POS_API/`. Không đưa giá trị secret vào command history hoặc log.
