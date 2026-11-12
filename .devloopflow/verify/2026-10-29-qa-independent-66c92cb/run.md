# PB-13 QA — local do agent chạy

- Commit SHA `66c92cbeb41b7b0f3d2dfaf53f9552474ce5310f`; working tree dirty, bao gồm thay đổi PB-13 chưa commit. Môi trường Windows, Node 22, PostgreSQL 17 container QA riêng `pos-pb13-independent-qa` port 55433, database giả lập riêng.
- Lệnh `npm test --prefix POS_API`, với `DATABASE_URL` tới PostgreSQL QA, `JWT_SECRET`, `CSRF_SECRET`, `PUBLIC_ORIGIN` thử: 12:15:59–12:17:21 +07, exit 0, 5 test. [API output](evidence/api-test.log). Các test: cấu hình auth; login/phiên cookie; login thiếu Origin; Swagger development; migration/bootstrap/ràng buộc.
- Lệnh `npm test --prefix POS_UI`: 12:18:29–12:18:30 +07, exit 0, 5 test. [UI output](evidence/ui-recheck.log). Các test: login; refresh và CSRF; đổi mật khẩu; chuyển UserSummary sang session UI; gửi thông báo logout. Đây là test giả lập, không chứng minh đồng bộ nhiều tab thực tế.
- Lệnh `npm run build --prefix POS_UI`: 12:18:30–12:18:35 +07, exit 0. [Build output](evidence/build-recheck.log). Thời gian chi tiết trong [metadata](evidence/metadata.txt). Log UI lần đầu có xung đột ghi song song, nên chỉ dùng các file recheck này làm bằng chứng.

## Tình huống QA-01 — API không thể kết nối qua proxy

- Điều kiện: Chrome context riêng, UI Vite localhost:5175 trỏ tới API localhost:3002 không chạy. Không có session hoặc dữ liệu thật. Agent chạy `npm run dev --prefix POS_UI -- --port 5175 --strictPort` với VITE_API_TARGET=http://127.0.0.1:3002.
- Thao tác: mở UI, đợi khôi phục phiên; DevTools đọc trạng thái GET `/api/v1/auth/me` và snapshot.
- Mong đợi: UI hiển thị lỗi kết nối bằng tiếng Việt, không lộ lỗi kỹ thuật. Thực tế: GET trả HTTP 500 body rỗng, thông báo lỗi tiếng Anh của `response.json()`. [Chrome snapshot, network, response](evidence/chrome-api-down.json); mã request DevTools 66/67; không có request ID vì lỗi do proxy Vite. Không có thay đổi DB trong tình huống này.
- Kết quả: FAIL, P2; tiêu chí PB-13 lỗi tiếng Việt, BR-03/04 về luồng phiên. API thật không chạy trong tình huống này, chỉ kết luận về xử lý lỗi UI/proxy.

## Chưa xác minh

- Chrome với API + PostgreSQL QA thật, multi-tab logout, dữ liệu demo dùng ID đúng, đổi mật khẩu và cảnh báo lỗi khi logout: chưa tái kiểm độc lập. Lệnh khởi động API thử riêng bị automatic approval review từ chối; không có lý do chi tiết. Không thử lách qua công cụ hoặc cách viết khác.
- Không kiểm tra HTTPS thật, thanh toán hay tác động kho; POS còn là demo. Chưa có CI/runner độc lập. Tái chạy các lệnh trên với DB PostgreSQL thử được cấu hình theo project.
