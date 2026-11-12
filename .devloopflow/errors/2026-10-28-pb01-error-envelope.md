# PB-01 lỗi HTTP ngoài health sai hợp đồng API

**Trạng thái:** đã sửa, reviewer và QA local xác nhận.

- Task: `tasks/completed/2026-10-28-pb-01-api-postgresql.md`.
- Triệu chứng: route không tồn tại trả 404 mặc định của Nest, không có `X-Request-Id` và thiếu envelope `{error:{code,message,details,requestId}}`.
- Tái hiện: reviewer gọi `GET /api/v1/does-not-exist` trên AppModule trước sửa.
- Nguyên nhân: chưa có middleware request ID và exception filter dùng chung.
- Sửa: gắn request ID cho route qua middleware và bổ sung fallback trong exception filter cho lỗi parser xảy ra trước middleware; log method/path/status/request ID, trả lỗi theo mã HTTP. Health dùng cùng request ID; giới hạn kết nối/truy vấn DB 5 giây để tránh health treo khi DB không phản hồi.
- Kiểm chứng: QA chạy test HTTP 404, JSON hỏng 400 và health 200, kiểm tra `X-Request-Id`; query `pg_sleep(10)` bị timeout trước 8 giây, xem `qa-evidence/20261028-131159-842ba1e/run.md`. Reviewer kiểm tra runtime JSON hỏng với ID hợp lệ, sai và thiếu, đều đúng. Kiểm tra health 503 khi DB dừng đã có ở `qa-evidence/20261028-125139-842ba1e/run.md` trước thay đổi timeout.
