# Auth proxy fix — local do agent chạy

- Commit nền 66c92cbeb41b7b0f3d2dfaf53f9552474ce5310f; working tree dirty. Windows, Node v22.22.2.
- Bắt đầu 2026-10-29T12:27:58.5647776+07:00; kết thúc 2026-10-29T12:28:03.9331839+07:00.
- `npm test --prefix POS_UI`: exit 0, 6 test; [test.log](evidence/test.log).
- `npm run build --prefix POS_UI`: exit 0; [build.log](evidence/build.log).
- Chưa xác nhận CI độc lập.

- Thử mở Chrome DevTools với UI Vite port 5175 và proxy tới API không chạy: không kiểm chứng được vì profile Chrome DevTools đang được sử dụng. Vite thử đã dừng.

- QA-01, 2026-10-29 khoảng 12:32 +07: Playwright MCP mở UI tại localhost:5175, VITE_API_TARGET trỏ port 3002 không có API. GET /auth/me trả 500; màn login hiện 'Có lỗi xảy ra. Vui lòng thử lại.'; không thay đổi DB. [Snapshot và network do MCP trả](evidence/browser-mcp.json). Chrome DevTools MCP không kết nối được vì profile đang được sử dụng; không phải CI độc lập.

- QA-02: Chrome DevTools MCP tại localhost:5175, 2026-10-29 khoảng 12:34 +07. GET /auth/me trả HTTP 500 body rỗng; alert hiển thị tiếng Việt. [Kết quả Chrome](evidence/chrome-devtools-retest.txt). Không ghi request headers hoặc cookie.
