# QA-PB01-03 — Retest sau sửa lỗi JSON trước middleware

**Nhãn:** local do agent QA chạy; không phải CI/runner độc lập.

- Commit: `842ba1ef3e8a35173d76445baea0adce8576f6af`.
- Working tree: dirty trước và sau lần chạy; source PB-01 chưa commit.
- Môi trường: Windows PowerShell 5.1, Node.js 22.22.2, Docker Desktop, PostgreSQL 17 local.
- Bắt đầu: 2026-10-28 13:11:59 +07:00. Kết thúc: 2026-10-28 13:12:08 +07:00.
- Điều kiện: `DATABASE_URL` nạp từ `POS_INFRA/.env.local` bị Git bỏ qua; cả ba `BOOTSTRAP_ADMIN_*` hợp lệ được đặt trong tiến trình, mật khẩu giả ngẫu nhiên 32 ký tự không ghi log. DB local chính có 1 migration, 0 user trước/sau.
- Lệnh chính xác trong `POS_API/`: `npm test`. Exit code **0**. Output gốc và danh sách test: [test.log](evidence/test.log). Test `PB-01 migration, bootstrap and database constraints` đạt.
- Truy vấn DB chính chỉ đọc trước/sau: `docker exec pos_infra-postgres-1 psql -U pos_local -d pos_local -t -A -c "SELECT (SELECT count(*) FROM migrations), (SELECT count(*) FROM users)"`; output [db-before.log](evidence/db-before.log), [db-after.log](evidence/db-after.log). Database thử riêng do test tạo và dọn trong `finally`.

## Tình huống đối chiếu

| ID | Điều kiện và thao tác | Expected | Actual |
| --- | --- | --- | --- |
| QA-PB01-03A | Biến bootstrap hợp lệ có sẵn; chạy `npm test`. | Test cô lập biến môi trường và đạt. | Đạt; không còn lỗi `Missing expected rejection`. |
| QA-PB01-03B | Test gửi POST với JSON hỏng `{` và header `X-Request-Id: pb01-bad-json`. | HTTP 400, envelope `BAD_REQUEST`, request ID trong header và body khớp. | Assertion tích hợp đạt; output TAP trong `test.log`. |
| QA-PB01-03C | Test kiểm tra migration, bootstrap, mật khẩu trên 72 byte, constraints, health 200, 404 envelope và timeout DB. | Hành vi theo `specs/foundation.md` và `docs/api-spec.md`. | Test tổng hợp đạt; assertion cụ thể trong `POS_API/src/foundation.test.ts`. |

Giới hạn: output TAP chỉ có một test tổng hợp, không in response HTTP cho từng assertion. Lần chạy này không tự ngắt PostgreSQL để xác nhận health `503`; artifact cũ nằm trong `qa-evidence/20261028-125139-842ba1e/`. Không kiểm tra PB-02 hoặc luồng POS mock. Có thể tái chạy `npm test` với `DATABASE_URL` và ba biến bootstrap hợp lệ theo README.
