# API response/error envelope refactor

- Loại: **local do agent chạy**, chưa có CI/runner độc lập trên nhánh này.
- Thời gian: 2026-10-29 16:41–16:43 +07:00.
- Commit nền: `edbe31820fa00a25c0cf521a305aadfc80081fed`; working tree dirty với refactor response/error và test chưa commit.
- Môi trường: Windows, Node.js 22, PostgreSQL 17 trong container QA `pos-pb13-independent-qa` ở `127.0.0.1:55433`. Không dùng DB live. Test tự tạo/xóa database tạm.
- Chuẩn bị: `npm ci --prefix POS_API` (exit 0); `docker start pos-pb13-independent-qa` và `docker exec pos-pb13-independent-qa pg_isready -U pos_qa -d pos_qa` (đều exit 0). `DATABASE_URL` trỏ tới `pos_qa` trong container QA; `JWT_SECRET`/`CSRF_SECRET` là chuỗi giả 64 ký tự, `PUBLIC_ORIGIN=http://localhost:5173`. Không lưu password DB trong Git.
- Lệnh: `npm run build --prefix POS_API` (exit 0); `npm test --prefix POS_API` (exit 0; [stdout/stderr gốc](evidence/api-test.log)). Runner tự build rồi chạy 5 test: **5 pass, 0 fail**. Test PB-01 kiểm tra health 200 và 503, body `SERVICE_UNAVAILABLE` cùng `X-Request-Id`; test auth/Swagger còn lại qua.
- Sau test: `docker stop pos-pb13-independent-qa` (exit 0). Giới hạn: test 503 mô phỏng lỗi truy vấn trên DataSource trong ứng dụng; không ngắt kết nối PostgreSQL thật. Các test tích hợp khác dùng PostgreSQL QA thật.
