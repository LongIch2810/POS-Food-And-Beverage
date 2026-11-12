# PB-01 — nền API và PostgreSQL

**Trạng thái:** completed — triển khai và kiểm tra kỹ thuật đã xong; Product Owner đã nghiệm thu PB-01 ngày 2026-10-28 trong Sprint.

- Plan: `plans/completed/2026-10-28-pb-01-api-postgresql.md`.
- Mục tiêu: triển khai PB-01 theo Sprint 1, chưa gồm PB-02/PB-13.
- Nhánh: `feat/sprint-1-auth`; giữ nguyên thay đổi chưa commit có sẵn.
- Đã hoàn tất: chốt `specs/foundation.md`; thêm quy ước 503; tạo nền NestJS, migration, bootstrap và PostgreSQL local; chạy test tích hợp trên DB thật; kiểm tra health HTTP 200/503, restart DB; audit dependency 0 lỗ hổng. Đã xóa tài khoản admin thử do chính task tạo khỏi DB local sau khi kiểm tra không có refresh token tham chiếu. Sau review, sửa test phụ thuộc env, giới hạn bcrypt 72 byte, envelope/request ID và timeout DB; xem ba file lỗi ngày 2026-10-28 trong `errors/`.
- Kết quả: đã sửa findings; reviewer không còn finding và QA local chạy lại bản cuối đạt với biến bootstrap có sẵn.
- Kết quả nghiệm thu: Product Owner chấp nhận PB-01; xem `sprints/sprint-01/SPRINT.md` mục Review.
- File đã đổi: `specs/foundation.md`, `docs/api-spec.md`, `POS_API/`, `POS_INFRA/`, `errors/2026-10-28-argon2-install-path.md`, `qa-evidence/20261028-125139-842ba1e/`, `qa-evidence/20261028-125327-842ba1e/`, plan và task này.
- Kiểm tra: `npm run migration:run`, `npm audit --audit-level=high` exit 0; HTTP 200/503 có artifact. `npm test` từng fail khi env bootstrap hợp lệ (QA), sau sửa QA chạy bản cuối exit 0 với cùng điều kiện; xem `qa-evidence/20261028-130230-842ba1e/` và `qa-evidence/20261028-131159-842ba1e/`.
- Giới hạn xác minh: chưa có CI/runner độc lập; nghiệm thu dựa trên bằng chứng QA local.
