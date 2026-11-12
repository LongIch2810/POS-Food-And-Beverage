# PB-13 — kiểm tra local do agent chạy

- Commit: 66c92cb; working tree dirty (chứa thay đổi PB-13 chưa commit).
- Môi trường: Windows, Node v22.22.2; test dùng API giả lập.
- Bắt đầu: 2026-10-29T11:12:07.2235075+07:00; kết thúc: 2026-10-29T11:12:11.9560011+07:00.
- `npm test --prefix POS_UI`: exit 0; 3 test. Output: [test.log](evidence/test.log).
- `npm run build --prefix POS_UI`: exit 0. Output: [build.log](evidence/build.log).
- Chưa kiểm tra browser với API và PostgreSQL thật; không phải CI độc lập.
- Kiểm tra HTTP local qua Vite proxy, API NestJS và PostgreSQL container riêng: `node %TEMP%/pb13-integration.mjs`; bắt đầu 2026-10-29T11:14:12.8685958+07:00; kết thúc 2026-10-29T11:14:13.3687329+07:00; exit 1; 1 kịch bản. Output: [integration.log](evidence/integration.log). Script tạm dùng thông tin kiểm thử trong biến môi trường và không được lưu trong Git. Chưa chứng minh hành vi cookie trong browser.

- Chạy lại sau khi đặt cờ đổi mật khẩu cho tài khoản kiểm thử trong DB riêng: từ 2026-10-29T11:14:22.2560500+07:00 đến 2026-10-29T11:14:23.2247839+07:00; exit 0; output [integration-retry.log](evidence/integration-retry.log). Lần trước thất bại vì tài khoản đã hoàn tất đổi mật khẩu trong lần thử ban đầu.
