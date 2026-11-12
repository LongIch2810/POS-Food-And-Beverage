# PB-13 — chạy lại test và Chrome

- Nhãn: local do agent chạy; chưa có CI/runner độc lập.
- Thời gian: 2026-10-29 12:41:45–12:48:54 +07:00.
- Commit nền: `66c92cbeb41b7b0f3d2dfaf53f9552474ce5310f`; working tree dirty (PB-13 chưa commit).
- Môi trường: Windows, Node 22, UI/API Docker đang chạy; API test dùng PostgreSQL QA riêng `pos-pb13-independent-qa` tại `127.0.0.1:55433`, đã dừng sau test.
- `npm test` trong `POS_UI`: exit 0, 6 pass, 0 fail. [Log gốc](evidence/ui-test.log).
- `npm run build` trong `POS_UI`: exit 0; TypeScript và Vite build thành công. [Log gốc](evidence/ui-build.log).
- `npm test` trong `POS_API` chưa đặt `DATABASE_URL`: exit 1, 1 pass, 3 fail lúc nạp module vì `DATABASE_URL is required`; đây là lần chạy sai cấu hình, không phải kết luận test nghiệp vụ. [Log gốc](evidence/api-test.log).
- `npm test` trong `POS_API` với `DATABASE_URL` trỏ tới PostgreSQL QA riêng, `JWT_SECRET`, `CSRF_SECRET` và `PUBLIC_ORIGIN` thử: exit 0, 5 pass, 0 fail. Các biến thử không được ghi vào log. [Log gốc](evidence/api-test-db.log).
- `git diff --check`: exit 0; chỉ có cảnh báo LF/CRLF.

## UI-01 — đăng nhập sai trên Chrome DevTools MCP

- Điều kiện: tab isolated context `pb13-live-recheck`, page ID 3, `http://localhost:5173/`, không có phiên đăng nhập. Backend và UI container đang chạy.
- Thao tác: nhập username giả `qa_unknown_user_20261029` và mật khẩu thử, nhấn “Đăng nhập hệ thống”.
- Mong đợi: không đăng nhập; hiển thị lỗi tiếng Việt, không lộ dữ liệu vận hành.
- Thực tế: POST `/api/v1/auth/login` reqid 79 trả 401; form hiển thị alert “Tài khoản hoặc mật khẩu không chính xác.”, vẫn ở trang đăng nhập. Không ghi mật khẩu thử vào bằng chứng. Không có ghi dữ liệu vận hành; không kiểm tra DB trước/sau cho lần thử xác thực thất bại.

## Review và sửa finding

- Subagent `code-reviewer` chỉ đọc diff PB-13, báo một finding P2: `AuthContext` giữ giao diện đã đăng nhập khi `/auth/me` trả `ACCOUNT_DISABLED` hoặc `STORE_SUSPENDED`. Các fix cũ về ID mock, logout đa tab, lỗi response rỗng và bootstrap admin không có finding mới. Xem [bản ghi lỗi](../../errors/2026-10-29-auth-revoked-session-ui.md).
- Sửa `AuthContext`: xóa session/authenticated trên hai mã 403, phát `revoked` qua BroadcastChannel; tab khác về login và tab hiện tại giữ thông báo lỗi.
- Sau sửa, `npm test` trong `POS_UI`: exit 0, 7 pass, 0 fail. [Log gốc](evidence/ui-test-final.log). `npm run build`: exit 0. [Log gốc](evidence/ui-build-final.log). API không đổi sau lần chạy 5/5 phía trên.
- Build lại container `pos_ui` bằng cùng lệnh Docker Compose ở [lần trước](../2026-10-29-1238-66c92cb-ui-rebuild/run.md): exit 0; HTTP UI 200, API health qua proxy 200.

## UI-02 — thu hồi phiên trong Chrome DevTools MCP

- Điều kiện: Chrome isolated context `pb13-locked-review`, page 4; dùng `initScript` chặn riêng `GET /api/v1/auth/me` và trả user QA giả, các request khác vẫn qua `fetch` gốc. Không thay đổi DB/cookie thật.
- Hành động: Sau khi thấy màn quản trị đăng nhập, cho `GET /auth/me` tiếp theo trả `403 ACCOUNT_DISABLED`, rồi phát sự kiện focus. Mong đợi: về login và hiện lỗi. Thực tế: về login, không còn màn quản trị, alert “Phiên đã bị khóa.”; `__qaCalls` ghi 2 lần OK và 1 lần ACCOUNT_DISABLED.
- Lặp lại từ trang tải mới với `403 STORE_SUSPENDED`: kết quả tương tự, `__qaCalls` ghi 2 lần OK và 1 lần STORE_SUSPENDED.
- Đa tab: mở thêm page 5 cùng isolated context; cả page 4 và 5 ban đầu ở màn quản trị. Cho page 4 nhận `403 ACCOUNT_DISABLED` khi focus; cả hai page chuyển về login. Page 4 giữ alert; page 5 thoát vì sự kiện `revoked`.
- Kết quả trên xác nhận luồng UI với phản hồi API mô phỏng. Chưa xác nhận backend thực sự phát hai mã trong môi trường live bằng thay đổi trạng thái DB của tài khoản đang đăng nhập.

Subagent `code-reviewer` rà lại diff sửa finding trong `AuthContext.tsx`, `session-events.ts` và test sau khi hoàn tất: không còn finding mới. Agent review chỉ đọc; lần chạy test là local của agent chính.
