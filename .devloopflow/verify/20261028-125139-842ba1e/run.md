# PB-01 local QA

**Nhãn:** local do agent chạy.
**Bắt đầu:** 2026-10-28 12:51:39 +07:00
**Kết thúc lệnh tự động:** 2026-10-28 12:51:45 +07:00
**Kết thúc kiểm tra HTTP:** 2026-10-28 khoảng 12:52:42 +07:00 (header `Date` trong hai artifact là UTC).
**Commit:** 842ba1ef3e8a35173d76445baea0adce8576f6af
**Working tree:** dirty
**Môi trường:** Windows PowerShell 5.1, Node.js 22.22.2, Docker Desktop PostgreSQL 17.

## Lệnh và artifact

| Lệnh (chạy trong POS_API, với DATABASE_URL nạp từ POS_INFRA/.env.local) | Exit code | Output |
| --- | ---: | --- |
| `npm run migration:run` | 0 | [migration-rerun.log](evidence/migration-rerun.log) |
| `npm test` | 0 | [test.log](evidence/test.log) |
| `npm audit --audit-level=high` | 0 | [audit.log](evidence/audit.log) |

**Số test theo output:** 1 pass, 0 fail. Bài test dùng database thử riêng tạo/xóa trong lần chạy; kiểm tra migration từ DB trống và chạy lặp, bootstrap, hash và constraint. Không có xác nhận CI độc lập.

**Kiểm tra HTTP thủ công sau run:** API chạy bằng `npm run start` trên port 39141 với DB local; `curl.exe -sS -i http://127.0.0.1:39141/api/v1/health` ghi [health-ready.http](evidence/health-ready.http) (200). Sau `docker compose --env-file ../POS_INFRA/.env.local -f ../POS_INFRA/compose.local.yml stop postgres`, cùng lệnh curl ghi [health-unavailable.http](evidence/health-unavailable.http) (503 `SERVICE_UNAVAILABLE`); đã chạy `docker compose --env-file ../POS_INFRA/.env.local -f ../POS_INFRA/compose.local.yml start postgres` và dừng API thử. Đây là bằng chứng local, không phải CI độc lập.
