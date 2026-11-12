# Lỗi UI auth khi proxy trả response rỗng

Trạng thái: đã sửa và kiểm chứng local — P2

- Triệu chứng: màn đăng nhập hiển thị lỗi phân tích JSON bằng tiếng Anh khi API không chạy và Vite proxy trả HTTP 500 body rỗng.
- Tái hiện: mở UI với VITE_API_TARGET trỏ tới API không chạy; GET `/api/v1/auth/me` nhận 500, response `text/plain` rỗng. Xem [QA local](../qa-evidence/2026-10-29-qa-independent-66c92cb/run.md).
- Nguyên nhân đã xác minh: `POS_UI/src/auth/client.ts` gọi `response.json()` mà không xử lý body rỗng hoặc không phải JSON.
- Cách sửa: chuyển lỗi phân tích response không hợp lệ thành `AuthError` với thông báo tiếng Việt; test tái hiện HTTP 500 body rỗng.
- Kiểm chứng: test, build và kiểm tra browser local đạt tại [run.md](../qa-evidence/2026-10-29-auth-proxy-fix-local/run.md); dùng Playwright MCP vì profile Chrome DevTools đang được sử dụng.
- Task liên quan: [PB-13](../tasks/active/2026-10-29-pb13-auth-ui.md). Chưa có CI xác nhận.
