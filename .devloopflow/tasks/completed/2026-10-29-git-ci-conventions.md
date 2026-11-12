# Hoàn thành: Quy ước Git và CI

- Mục tiêu: bổ sung cách đặt nhánh/commit trong `rules/git.md`; xử lý ba finding của `.github/workflows/ci.yml`.
- Nhánh: `refactor/backend-frontend-structure`.
- Plan liên quan: không có.
- Trạng thái: đã sửa và kiểm tra local.
- Đã làm: quy định tên nhánh/commit; CI push mọi nhánh; CI chạy migration CLI; test tự tìm file `.test.js` trong `dist/`.
- File đã đổi: `rules/git.md`, `.github/workflows/ci.yml`, `POS_API/package.json`.
- Kiểm tra: parse YAML bằng `js-yaml` thành công; `git diff --check` thành công; `npm run migration:run` exit 0, `npm test` exit 0 (5 pass, 0 fail) trên PostgreSQL 17 thử riêng.
- Bằng chứng local: `qa-evidence/2026-10-29-101138-fc2b07d/run.md`; lần đầu thử chạy bị dừng do container thử thiếu healthcheck, ghi tại `qa-evidence/2026-10-29-101045-fc2b07d/run.md`.
- Giới hạn: chưa có GitHub Actions run cho thay đổi chưa commit.
