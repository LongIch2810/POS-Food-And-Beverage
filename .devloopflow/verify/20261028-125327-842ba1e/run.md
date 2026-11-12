# PB-01 local QA sau sửa chuẩn hóa username

**Nhãn:** local do agent chạy.
**Bắt đầu:** 2026-10-28 12:53:27 +07:00.
**Kết thúc:** 2026-10-28 12:53:34 +07:00.
**Commit:** 842ba1ef3e8a35173d76445baea0adce8576f6af.
**Working tree:** dirty.
**Môi trường:** Windows PowerShell 5.1, Node.js 22.22.2, Docker Desktop PostgreSQL 17.

Trong `POS_API/`, nạp `DATABASE_URL` từ file local bị Git bỏ qua `../POS_INFRA/.env.local` (giá trị secret không ghi vào log), rồi chạy lần lượt:

| Lệnh | Exit code | Output do công cụ tạo |
| --- | ---: | --- |
| `npm run migration:run` | 0 | [migration.log](evidence/migration.log) |
| `npm test` | 0 | [test.log](evidence/test.log) |
| `npm audit --audit-level=high` | 0 | [audit.log](evidence/audit.log) |

Output test ghi 1 pass, 0 fail. Test tạo database thử riêng với tên ngẫu nhiên, xác minh migration từ DB trống và chạy lại, bootstrap thiếu/hợp lệ/lặp, hash bcrypt, unique/check constraint và partial unique index, rồi xóa database thử. Không có lần chạy CI độc lập. Kiểm tra HTTP 200/503 có request/response trong [run trước](../20261028-125139-842ba1e/run.md); phần health không đổi sau lần đó.
