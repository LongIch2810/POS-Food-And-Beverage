# PB-01 — kiểm tra sau khi sửa findings

**Nhãn:** local do agent chạy; chưa có CI độc lập.

- Commit: `842ba1ef3e8a35173d76445baea0adce8576f6af`; working tree dirty.
- Môi trường: Windows PowerShell 5.1, Node.js 22.22.2, Docker Desktop/PostgreSQL 17 local.
- Bắt đầu: 2026-10-28 13:08:46 +07:00; kết thúc: 2026-10-28 13:08:55 +07:00.
- Điều kiện: `DATABASE_URL` nạp từ file local bị Git bỏ qua `POS_INFRA/.env.local`; ba biến `BOOTSTRAP_ADMIN_*` hợp lệ được đặt trong tiến trình, mật khẩu giả ngẫu nhiên không ghi log.
- Lệnh chính xác trong `POS_API/`: `npm test`. Exit code **0**. Output do công cụ tạo: [test.log](evidence/test.log), **1 pass, 0 fail**.
- Test tạo database thử riêng, kiểm tra migration từ DB trống/chạy lặp, bootstrap khi biến thiếu và hợp lệ, từ chối mật khẩu quá 72 byte (ASCII và Unicode), hash/constraint, health 200, lỗi 404 kèm request ID, timeout truy vấn DB, rồi dọn database thử. Đây là bằng chứng local, không phải xác nhận độc lập.
