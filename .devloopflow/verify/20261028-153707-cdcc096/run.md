# QA PB-02 DTO/Passport — local run

- Nhãn: local do agent chạy; chưa có CI/runner độc lập.
- Commit trước run: cdcc0963037c636f6d0f8712ffb3dad8fbad2014. Working tree dirty: True.
- Môi trường: Windows PowerShell, Node.js 22, PostgreSQL 17 local qua Docker Compose.
- Bắt đầu: 2026-10-28T15:37:07.2627801+07:00. Kết thúc: 2026-10-28T15:37:26.4047177+07:00.
- Lệnh trong POS_API: `npm test`; output gốc: [test.log](evidence/test.log).
- Exit code npm test: 0. TAP: 5 test, 5 pass, 0 fail.
- Lệnh: `npm audit --audit-level=moderate`; output gốc: [audit.log](evidence/audit.log).
- Exit code npm audit: 0.
- DATABASE_URL nạp từ POS_INFRA/.env.local bị Git bỏ qua; JWT_SECRET/CSRF_SECRET là giá trị giả trong tiến trình, không ghi vào log.
- Test tích hợp tự tạo/xóa database riêng. Chưa kiểm thử browser HTTPS hoặc UI PB-13.
