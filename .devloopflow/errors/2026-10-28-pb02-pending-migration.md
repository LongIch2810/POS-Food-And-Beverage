# Trạng thái: đã sửa

- Triệu chứng: API có thể khởi động và health trả 200 khi DB mới có schema PB-01, trong khi login lỗi vì thiếu bảng giới hạn thử.
- Tái hiện: database thử chỉ áp migration Foundation, gọi kiểm tra schema trước khi áp migration PB-02.
- Nguyên nhân: startup chỉ kiểm tra kết nối/bootstrap, không kiểm tra migration còn pending.
- Sửa: `assertSchemaCurrent` gọi `showMigrations()` trước khi tạo HTTP server; không tự chạy migration.
- Kiểm chứng: test DB chỉ có migration Foundation đỏ trước sửa, xanh sau sửa; QA local `qa-evidence/20261028-152045-cdcc096/run.md`.
- Task: `tasks/completed/2026-10-28-pb-02-auth.md`; commit: chưa commit.
