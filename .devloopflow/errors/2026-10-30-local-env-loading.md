# Trạng thái: Đã sửa và kiểm chứng local

- Task: tasks/completed/2026-10-30-local-env-configuration.md.
- Nhánh: fix/local-env-configuration; nền64441b2, dirty.
- Triệu chứng: Backend chỉ có env.example nhưng npm script không nạp .env; Vite bỏ qua file env cấu hình backend và dùng URL fallback cứng trong vite.config.ts.
- Tái hiện: regression test nạp config Vite với .env target43210, nhận target3000 trước sửa. red-test.log ghi assertion expected/actual.
- Nguyên nhân: npm scripts dùng node trực tiếp; Vite config đọc process.env thay vì loadEnv theo mode. Frontend thiếu .env.example và ignore cho .env thật.
- Sửa: Node22 --env-file-if-exists=.env cho start/migration/test; Vite loadEnv và bỏ fallback, báo lỗi dev thiếu target; bổ sung frontend example/gitignore/dockerignore, hướng dẫn chạy local. Tạo env local từ cấu hình local hiện có, không lưu secret trong source/log.
- Kiểm chứng: API7/7, UI11/11 và build đạt; backend startup từ .env health200 sau khi xóa biến DB/auth trong shell; kiểm tra file env ignored. Artifact và giờ/exit code tại qa-evidence/2026-10-30-112626-64441b2-env/run.md. Chưa CI/browser/image Docker cho diff mới.
