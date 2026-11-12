# QA TypeORM Entities & QueryBuilder — local run

- Nhãn: local do agent chạy; chưa có CI/runner độc lập.
- Commit trước run: cdcc096. Working tree dirty: True.
- Môi trường: Windows PowerShell, Node.js 22, PostgreSQL 17 local qua Docker Compose.
- Bắt đầu: 2026-10-28T16:35:00+07:00. Kết thúc: 2026-10-28T16:35:20+07:00.
- Lệnh trong POS_API: `npm test`; output gốc: [test.log](evidence/test.log).
- Exit code npm test: 0. TAP: 5 test, 5 pass, 0 fail.
- Database: PostgreSQL local từ container pos_infra-postgres-1; các test tích hợp tự tạo và dọn dẹp database thử riêng `pos_pb01_test_*` và `pos_pb02_test_*`.
- Toàn bộ thao tác CRUD dữ liệu bảng, row lock pessimistic write trên PostgreSQL thật đã chạy qua các TypeORM Entity classes và QueryBuilder thành công 100%.

