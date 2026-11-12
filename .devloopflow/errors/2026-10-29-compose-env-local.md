# Compose local khởi động API sai mật khẩu DB

**Trạng thái:** đã giải quyết trong lượt QA local PB-03.

- Task: `tasks/active/2026-10-29-trien-khai-pb03.md`; nền `53d794b`, nhánh `feat/pb03-platform`.
- Triệu chứng: sau `docker compose -f POS_INFRA/compose.local.yml up -d --build api ui`, API thoát mã 1; migration báo PostgreSQL `28P01 password authentication failed for user "pos_local"`.
- Điều kiện tái hiện: volume PostgreSQL local đã tồn tại với mật khẩu cấu hình từ `POS_INFRA/.env.local`, nhưng lệnh Compose không truyền file này nên dùng default trong compose. Không in giá trị mật khẩu.
- Nguyên nhân đã xác minh: cùng image/volume chạy healthy khi thêm `--env-file POS_INFRA/.env.local`; migration và test API PostgreSQL chạy đạt.
- Cách xử lý: dùng `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build api ui`. Không xóa hoặc khởi tạo lại volume.
- Kiểm chứng: `qa-evidence/20261029-202132-53d794b/compose-build.log`, `api-test.log` (6/6), `run.md`.
