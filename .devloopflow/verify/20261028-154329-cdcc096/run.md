# QA PB-02 auth folder — local run

- Nhãn: local do agent chạy; chưa có CI/runner độc lập.
- Commit trước run: cdcc0963037c636f6d0f8712ffb3dad8fbad2014. Working tree dirty: True.
- Môi trường: Windows PowerShell, Node.js 22, PostgreSQL 17 local qua Docker Compose.
- Bắt đầu: 2026-10-28T15:43:29.9051164+07:00. Kết thúc: 2026-10-28T15:43:48.3882572+07:00.
- Lệnh trong POS_API: `npm test`; output gốc: [test.log](evidence/test.log).
- Exit code npm test: 0. TAP: 5 test, 5 pass, 0 fail.
- DATABASE_URL nạp từ POS_INFRA/.env.local bị Git bỏ qua; JWT_SECRET/CSRF_SECRET là giá trị giả trong tiến trình, không ghi vào log.
- Test tích hợp tự tạo/xóa database riêng; không chạy browser HTTPS hoặc UI PB-13.
