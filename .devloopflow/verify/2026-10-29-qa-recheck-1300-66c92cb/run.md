# QA PB-13 chạy lại — local do agent chạy

- Commit nền `66c92cbeb41b7b0f3d2dfaf53f9552474ce5310f`, working tree dirty chứa PB-13 chưa commit. Windows, Node 22, PostgreSQL 17 container thử riêng `pos-pb13-independent-qa` cổng 55433. Không dùng DB live. Không có CI độc lập.
- Backend: `npm test --prefix POS_API`, môi trường `DATABASE_URL` tới DB thử, `JWT_SECRET`, `CSRF_SECRET`, `PUBLIC_ORIGIN` giả. 12:51:32–12:52:08 +07, exit 0, 5 test; [api-test.log](evidence/api-test.log). Test gồm cấu hình, login/phiên, thiếu Origin, Swagger và bootstrap/migration. Test integration dùng PostgreSQL thật kiểm tra `ACCOUNT_DISABLED` và `STORE_SUSPENDED` sau khi cập nhật user/store và gọi `/auth/me`; test bootstrap xác nhận admin tạo cờ false. Các xác nhận này ở ranh giới API, không phải browser thật.
- UI: `npm test --prefix POS_UI`, 12:52:08–12:52:09 +07, exit 0, 7 test; [ui-test.log](evidence/ui-test.log). Test gồm 500 không JSON, hai mã khóa trả từ fetch giả, login, refresh/CSRF, đổi mật khẩu, ánh xạ danh tính và phát sự kiện logout. Test sự kiện không xác nhận hai tab thực.
- Build: `npm run build --prefix POS_UI`, 12:52:09–12:52:25 +07, exit 0; [ui-build.log](evidence/ui-build.log). Thời điểm và mã kết thúc gốc trong [metadata](evidence/metadata.txt).

## QA-01 — proxy lỗi 500 body rỗng

- Điều kiện: Vite riêng cổng 5176, `VITE_API_TARGET=http://127.0.0.1:3002` không có server, không dùng dữ liệu người dùng; Playwright MCP. Lệnh: `npm run dev --prefix POS_UI -- --port 5176 --strictPort`.
- Thao tác: mở trang, chờ khôi phục phiên; quan sát network và accessibility snapshot.
- Mong đợi: thông báo lỗi tiếng Việt. Thực tế: GET `/api/v1/auth/me` hai lần trả 500, giao diện hiển thị “Có lỗi xảy ra. Vui lòng thử lại.”; [output Playwright](evidence/qa-empty-proxy.json). PASS, đây là kết quả UI/proxy và không chứng minh API thật. Không ghi DB.
- Chrome DevTools MCP không mở được do profile Chrome đang được sử dụng; dùng Playwright MCP để xác nhận hành vi.

## Chưa xác minh

- Hai mã `ACCOUNT_DISABLED`/`STORE_SUSPENDED` khi browser thật đang đăng nhập và DB thật đổi trạng thái: test backend đã xác nhận API, test UI chỉ dùng fetch giả. Cần kiểm chứng toàn luồng browser + DB QA.
- Lệnh khởi động API thử riêng của QA trước bị auto-review từ chối; không nêu lý do chi tiết. Không thử lách qua cách viết hay công cụ khác.
- Logout đa tab, token access hết hạn và refresh đồng thời đa tab, HTTPS thật, mọi vai trò chưa chạy lại trong lượt QA này. Evidence trước là của agent triển khai, không phải xác nhận lại bởi QA. POS nghiệp vụ vẫn là demo; không dùng giao diện mock chứng minh thanh toán, tiền hoặc kho backend.
