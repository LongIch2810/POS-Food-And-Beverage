# PB-01 — kiểm tra trung gian sau sửa findings

**Nhãn:** local do agent chạy; chưa có CI độc lập.

- Commit: `842ba1ef3e8a35173d76445baea0adce8576f6af`; working tree dirty.
- Môi trường: Windows PowerShell 5.1, Node.js 22.22.2, Docker Desktop/PostgreSQL 17 local.
- Bắt đầu: 2026-10-28 13:07:44 +07:00; kết thúc: 2026-10-28 13:07:53 +07:00.
- Điều kiện: `DATABASE_URL` nạp từ file local bị Git bỏ qua `POS_INFRA/.env.local`; ba biến `BOOTSTRAP_ADMIN_*` hợp lệ được đặt trong tiến trình, mật khẩu giả ngẫu nhiên không ghi log.
- Lệnh chính xác trong `POS_API/`: `npm test`. Exit code **0**. Output do công cụ tạo: [test.log](evidence/test.log), **1 pass, 0 fail**.
- Test dùng database thử riêng, xác minh migration, bootstrap, mật khẩu quá 72 byte, constraint, lỗi HTTP 404 và timeout DB. Test health 200 được thêm sau lần này; xem [run cuối](../20261028-130846-842ba1e/run.md).
