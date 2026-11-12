# PB-13 — tích hợp UI demo, kiểm tra local do agent chạy

- Commit nền 66c92cb; working tree dirty với thay đổi PB-13 chưa commit. Bắt đầu 2026-10-29T11:27:37.3621453+07:00; kết thúc 2026-10-29T11:27:43.5321497+07:00; Windows, Node v22.22.2.
- `npm test --prefix POS_UI`: exit 0; 4 test; [test.log](evidence/test.log).
- `npm run build --prefix POS_UI`: exit 0; [build.log](evidence/build.log).
- Chrome DevTools MCP: UI trên localhost:5174, API port 3001, PostgreSQL riêng. Đăng nhập tài khoản quản trị thử → giao diện admin demo hiển thị tên thật và nhãn dữ liệu mẫu; đăng xuất → UI login cũ. Đặt cờ bắt buộc đổi mật khẩu trên DB thử → login → chỉ modal đổi mật khẩu → đổi mật khẩu → quay lại login. Bằng chứng snapshot chỉ có trong phiên tool; chưa có CI độc lập.
- Chưa kiểm tra mọi vai trò, refresh đồng thời nhiều tab và HTTPS thật. Các thay đổi nghiệp vụ còn dùng mock.
