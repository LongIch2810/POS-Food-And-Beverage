# Task: Thiết lập CI GitHub Actions cho dự án

- **Trạng thái:** COMPLETED
- **Nhánh:** `feat/ci-github-actions`
- **Mục tiêu:** Thiết lập workflow GitHub Actions CI tự động kiểm tra mã nguồn backend (`POS_API`) và frontend (`POS_UI`) khi push hoặc tạo pull request.

## Việc đã hoàn tất
1. Khởi tạo `.github/workflows/ci.yml`:
   - Trigger: `push` (`master`, `feat/**`, `fix/**`), `pull_request` (`master`), `workflow_dispatch`.
   - Concurrency: Hủy bỏ tự động các run cũ khi có commit mới (`cancel-in-progress: true`).
   - Job `backend`:
     - Container service PostgreSQL 17 (`postgres:17-alpine`) với healthcheck `pg_isready`.
     - Cài đặt Node.js 22, cache npm theo `POS_API/package-lock.json`.
     - Chạy `npm ci`, biên dịch TypeScript `npm run build`.
     - Chạy toàn bộ unit test & integration test (`npm test`) với các biến môi trường cấu hình: `DATABASE_URL`, `JWT_SECRET`, `CSRF_SECRET`, `PUBLIC_ORIGIN`.
     - Kiểm tra bảo mật gói phụ thuộc `npm audit --audit-level=high`.
   - Job `frontend`:
     - Cài đặt Node.js 22, cache npm theo `POS_UI/package-lock.json`.
     - Chạy `npm ci`.
     - Chạy TypeCheck (`tsc --noEmit`) và Vite production build (`npm run build`).
     - Kiểm tra bảo mật gói phụ thuộc `npm audit --audit-level=high`.
2. Cập nhật `docs/architecture/TECH_STACK.md` phản ánh cấu hình CI GitHub Actions và runner.
3. Đã chạy thử nghiệm local:
   - Backend `POS_API`: `npm run build` thành công, `npm test` pass 5/5, `npm audit` 0 vulnerability.
   - Frontend `POS_UI`: `npm run build` thành công, `npm audit` 0 vulnerability.
