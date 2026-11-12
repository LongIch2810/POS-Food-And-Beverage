# QA PB-02

- Nhãn: local do agent chạy; chưa có CI độc lập.
- Commit trước run: cdcc0963037c636f6d0f8712ffb3dad8fbad2014. Working tree: dirty.
- Môi trường: Windows PowerShell, Node.js v22.22.2, PostgreSQL 17 local qua Docker Compose.
- Bắt đầu: 2026-10-28T15:04:59.8450124+07:00. Kết thúc: 2026-10-28T15:05:10.6145758+07:00.
- Lệnh chính trong POS_API: `npm test`.
- Exit code: 0. Output gốc: [test.log](evidence/test.log).
- DATABASE_URL từ POS_INFRA/.env.local bị Git bỏ qua; JWT_SECRET/CSRF_SECRET là giá trị giả riêng trong tiến trình, không ghi log.
- Test tích hợp tự tạo/xóa database riêng. Không chạy browser HTTPS hoặc PB-13.
