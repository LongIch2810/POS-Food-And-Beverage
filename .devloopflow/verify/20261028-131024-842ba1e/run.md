# QA-PB01-02 — Retest sau sửa test isolation

**Nhãn:** local do agent QA chạy; không phải CI/runner độc lập.

- Commit: `842ba1ef3e8a35173d76445baea0adce8576f6af`.
- Working tree: dirty trước và sau lần chạy; source PB-01 chưa commit.
- Môi trường: Windows PowerShell 5.1, Node.js 22.22.2, Docker Desktop, PostgreSQL 17 local.
- Bắt đầu: 2026-10-28 13:10:24 +07:00. Kết thúc: 2026-10-28 13:10:33 +07:00.
- Điều kiện: `DATABASE_URL` nạp từ `POS_INFRA/.env.local` bị Git bỏ qua; cả ba `BOOTSTRAP_ADMIN_*` hợp lệ được đặt trong tiến trình. Mật khẩu giả sinh ngẫu nhiên 32 ký tự và không ghi vào log. DB local chính có 1 migration, 0 user trước/sau.
- Lệnh kiểm thử chính xác trong `POS_API/`: `npm test`. Exit code **0**. Output gốc và danh sách test: [test.log](evidence/test.log). Test `PB-01 migration, bootstrap and database constraints` đạt.
- Truy vấn DB chính chỉ đọc trước/sau: `docker exec pos_infra-postgres-1 psql -U pos_local -d pos_local -t -A -c "SELECT (SELECT count(*) FROM migrations), (SELECT count(*) FROM users)"`; output [db-before.log](evidence/db-before.log), [db-after.log](evidence/db-after.log). Database thử riêng được test tạo và dọn trong `finally`.

## Tình huống đối chiếu

| ID | Điều kiện, thao tác | Expected | Actual |
| --- | --- | --- | --- |
| QA-PB01-02A | Biến bootstrap hợp lệ có sẵn theo README; chạy `npm test`. | Test tự cô lập trạng thái và đạt. | Đạt; không còn `Missing expected rejection`. |
| QA-PB01-02B | Test trên DB thử riêng: migration từ trống rồi chạy lại, bootstrap thiếu/sai/hợp lệ/lặp, username và refresh-token constraints. | Hành vi theo `specs/foundation.md`. | Test tổng hợp đạt; chi tiết từng assertion xem `POS_API/src/foundation.test.ts`. |
| QA-PB01-02C | Test gửi `GET /api/v1/health`, route không tồn tại với `X-Request-Id` hợp lệ và không hợp lệ; chạy `pg_sleep(10)` với timeout. | Health 200; 404 có error envelope/request ID; truy vấn timeout trước 8 giây. | Test tổng hợp đạt, output TAP ở `test.log`; không lưu response HTTP riêng. |

Giới hạn: run này không tự ngắt DB để đo health `503` và không thử các route auth/POS thuộc PB-02 trở đi. Output TAP chỉ cho một test tổng hợp; các assertion con không có dòng kết quả riêng. Người dùng có thể tái chạy `npm test` với `DATABASE_URL` và ba biến bootstrap hợp lệ theo README.
