# Kiểm tra PB-13 bằng Chrome DevTools MCP — local do agent chạy

- Thời gian: 2026-10-29 khoảng 11:21–11:23, giờ máy; commit nền 66c92cb, working tree dirty với mã PB-13 chưa commit.
- Môi trường: Chrome DevTools MCP, UI Vite tại localhost:5174, API tại 3001, PostgreSQL container pos-pb13-qa-db riêng; tài khoản và mật khẩu giả. Chrome context riêng; giả lập tablet ngang 1024×768, touch.
- Lệnh khởi động UI: `npm run dev --prefix POS_UI -- --port 5174 --strictPort` với `VITE_API_TARGET=http://127.0.0.1:3001`. API: `node POS_API/dist/main.js` với DB kiểm thử riêng và `PUBLIC_ORIGIN=http://localhost:5174`.
- B-01: login tài khoản thử yêu cầu đổi mật khẩu → màn đổi mật khẩu; tải lại → vẫn màn đổi mật khẩu. Quan sát qua snapshot DevTools.
- B-02: đổi mật khẩu thử → thông báo thành công và màn đăng nhập; login mật khẩu mới → màn chờ, không thấy nút đổi tài khoản demo. Quan sát qua snapshot; request change-password 204, login 200 trong [output Chrome](evidence/chrome-output.json).
- B-03: tải lại màn chờ → giữ phiên; đăng xuất → màn đăng nhập, request logout 204. Truy vấn DB sau thao tác: [db-after.txt](evidence/db-after.txt), cờ đổi mật khẩu false và không còn refresh session hoạt động.
- B-04: tablet 1024×768: không tràn ngang; nút đăng xuất cao 48px. JavaScript chỉ đọc được tên cookie CSRF; localStorage và sessionStorage không có key trong context thử. Ảnh chưa lưu được do Chrome MCP từ chối đường dẫn ngoài workspace được cấu hình.
- Giới hạn: các snapshot trước thao tác chỉ có trong output phiên tool, file output lưu snapshot cuối và request còn lưu qua các lần chuyển trang; không có CI độc lập. Chưa giả lập access hết hạn, refresh đồng thời nhiều tab, HTTPS thật hoặc kiểm tra toàn bộ lỗi.
