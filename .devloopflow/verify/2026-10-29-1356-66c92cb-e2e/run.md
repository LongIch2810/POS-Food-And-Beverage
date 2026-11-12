# PB-13 — E2E browser, API và PostgreSQL QA

- Loại: **local do agent chạy**, Chrome DevTools MCP và Playwright MCP; chưa có CI/runner độc lập.
- Thời gian: 2026-10-29 12:56:35–13:14:14 +07:00.
- Commit nền: `66c92cbeb41b7b0f3d2dfaf53f9552474ce5310f`; working tree dirty, gồm PB-13 và bằng chứng chưa commit.
- Môi trường: Windows/Node 22; PostgreSQL 17 container `pos-pb13-independent-qa` trên `127.0.0.1:55433`; database thử mới `pos_pb13_e2e_1356`; API 3001; Vite 5174; TLS proxy thử 5443. Không đụng DB/container live `pos_api`, `pos_ui`.
- Chuẩn bị: `docker start pos-pb13-independent-qa`; `docker exec ... createdb ... pos_pb13_e2e_1356`; `npm run migration:run` trong `POS_API` (exit 0, [log](evidence/migration.log)); `node dist/main.js` với DATABASE_URL, secret QA và PUBLIC_ORIGIN phù hợp; `npm run dev -- --port 5174 --strictPort` trong `POS_UI`; `node qa-tls-proxy.cjs` trên 5443. API/UI/TLS đều trả HTTP 200 qua health hoặc trang gốc. [API HTTP log](evidence/api-server.log), [API HTTPS log](evidence/api-https-server.log), [UI log](evidence/ui-server.log), [TLS log](evidence/tls-proxy.log).
- Fixture: [script seed và truy vấn DB](evidence/qa-db.cjs) nhận mật khẩu/URL từ biến môi trường, tạo tài khoản giả cho OWNER/MANAGER/CASHIER ở trạng thái sau lần đổi mật khẩu đầu tiên; PLATFORM_ADMIN được API bootstrap với `must_change_password=false`. [ID fixture](evidence/db-seed.json). Không lưu password, JWT, cookie hoặc khóa ký trong Git/log.
- Chứng chỉ TLS: self-signed cho `localhost`, Playwright dùng `ignoreHTTPSErrors=true`; HTTPS/TLS có thật nhưng không kiểm chứng chuỗi tin cậy của CA sản xuất. [Metadata không chứa khóa](evidence/tls-metadata.txt). Lần tạo material đầu bị lỗi do PowerShell/.NET thiếu static `RandomNumberGenerator.GetBytes`; đã tạo lại bằng `RandomNumberGenerator.Create().GetBytes`, xuất PFX thành công trước khi chạy TLS.

## E2E-01 — tài khoản bị khóa

- Trước: đăng nhập `qa_cashier` trên Chrome page 7 qua API thật; UI hiển thị CASHIER QA, `/auth/me` 200. [DB trước](evidence/db-before-lock.json): `is_active=true`, active refresh 1.
- Thao tác: trên DB QA riêng đặt `is_active=false`, [trạng thái sau cập nhật](evidence/db-disabled.json); phát sự kiện focus trên browser để chạy `/auth/me`.
- Mong đợi: API 403 `ACCOUNT_DISABLED`; UI xóa trạng thái đăng nhập, về login và hiển thị lỗi tiếng Việt.
- Thực tế: request ID 81 `GET /auth/me` 403, login có alert “Tài khoản đã bị khóa.”; không còn màn POS. [Network Chrome](evidence/chrome-network-page-7.txt), [DB sau](evidence/db-after-account-lock.json). Sau test khôi phục `is_active=true`.
- Việc đổi DB trực tiếp là thao tác fixture, không chạy endpoint khóa tài khoản tương lai. Refresh row vẫn tồn tại trong DB; test này chứng minh guard + UI, không chứng minh transaction thu hồi khi dùng endpoint khóa.

## E2E-02 — store bị tạm khóa

- Trước: đăng nhập `qa_owner` trên Chrome page 8; UI hiện OWNER QA, `/auth/me` 200. [DB trước](evidence/db-before-store-lock.json): store ACTIVE, active refresh 1.
- Thao tác: đặt store QA `status=SUSPENDED` bằng fixture script, [DB sau cập nhật](evidence/db-store-suspended.json), rồi focus lại trang.
- Mong đợi: API 403 `STORE_SUSPENDED`, UI về login.
- Thực tế: request ID 83 `GET /auth/me` 403; login hiện “Cửa hàng đang tạm khóa.”, không còn màn nghiệp vụ. [Network Chrome](evidence/chrome-network-page-8.txt), [DB sau](evidence/db-after-store-lock.json). Sau test khôi phục ACTIVE.

## E2E-03 — vai trò và phạm vi danh tính

- Login và gọi `/auth/me` từ browser với bốn vai trò. PLATFORM_ADMIN bootstrap: store/branch null, `mustChangePassword=false`, chỉ màn quản trị nền tảng. OWNER: store có giá trị, branch null, quyền `branch.access_all` và `pos.sell`. MANAGER/CASHIER: store và branch có giá trị, quyền `pos.sell`, màn nghiệp vụ có nhãn dữ liệu mẫu. Mọi `/me` đều 200.
- Mong đợi: UI hiển thị vai trò và phạm vi thật; tài khoản nền tảng không thấy tab vận hành. Thực tế đúng trong lượt kiểm tra. Các chức năng POS/kho trong màn này vẫn là demo, không được coi là API nghiệp vụ đã chạy.

## E2E-04 — logout hai tab

- Trước: MANAGER đăng nhập trên Chrome page 9; page 10 cùng browser context tự khôi phục phiên. [DB trước](evidence/db-before-manager-logout.json): active refresh 1.
- Thao tác: nhấn Đăng xuất ở page 9.
- Mong đợi: API 204, hai tab về login, phiên trong DB bị thu hồi.
- Thực tế: request ID 84 `POST /auth/logout` 204; hai tab hiện login. [Network Chrome](evidence/chrome-network-page-9.txt), [DB sau](evidence/db-after-manager-logout.json): active refresh 0.

## E2E-05 — HTTPS, cookie và CSRF

- Playwright mở `https://localhost:5443/` trên TLS proxy, đăng nhập PLATFORM_ADMIN qua API thật.
- Mong đợi: access/refresh `Secure; HttpOnly; SameSite=Strict; Path=/`; CSRF `Secure; SameSite=Strict; Path=/` và JavaScript đọc được CSRF; không có token auth trong JS storage/URL/JSON hay header Bearer. Refresh thiếu CSRF bị từ chối, có CSRF thành công.
- Thực tế: metadata của cả ba cookie đúng; `document.cookie` chỉ liệt kê `__Host-pos_csrf`. LocalStorage có key demo `pos_fb_mock_v1`, không chứa token auth; sessionStorage không có key. `POST /auth/refresh` không gửi CSRF → 403 `CSRF_INVALID`; gửi CSRF header đọc từ cookie → 200, `/me` sau đó 200. Login response 200 không chứa token auth; không có token trong JSON/storage/URL và không có auth request mang Bearer (0/8 request được quan sát).

## E2E-06 — access JWT hết hạn, refresh đồng thời hai tab

- Trước: hai tab Playwright cùng browser context HTTPS đăng nhập MANAGER và đều hiển thị danh tính. [DB trước](evidence/db-before-expiry.json): active refresh 1, total refresh 2, replaced refresh 0.
- Thao tác: tạo JWT access hợp lệ về chữ ký bằng secret QA nhưng `exp` đã qua, ghi đè cookie access bằng Playwright với `HttpOnly; Secure`; phát focus đồng thời trên cả hai tab.
- Mong đợi: `/me` báo token hết hạn; chỉ một tab xoay refresh, tab còn lại dùng access mới; cả hai giữ phiên; DB chỉ thêm một refresh row.
- Thực tế: hai tab nhận `/me` 401; tổng cộng ba phản hồi `/me` 401 trong quá trình khóa, đúng một `/refresh` 200, sau đó mỗi tab có `/me` 200. Cả hai vẫn hiển thị MANAGER QA; access cookie đổi. [DB sau](evidence/db-after-expiry.json): active 1, total 3, replaced 1. Sau đó logout từ một tab trên HTTPS: cả hai về login, ba cookie auth biến mất, [DB sau logout](evidence/db-after-https-logout.json) active refresh 0.

## Kết thúc và giới hạn

- [DB cuối trước dọn](evidence/db-final.json): user được mở lại, store ACTIVE. API/UI/TLS QA đã dừng; database thử `pos_pb13_e2e_1356` đã được xóa sau khi xác minh đúng tên; container PostgreSQL QA đã dừng. Container live `pos_api` và `pos_ui` vẫn chạy.
- **Dọn material QA còn chặn:** lệnh xóa từng file tạm trong `C:\Users\Admin\AppData\Local\Temp\pos-pb13-qa-20261029-1356` và chứng chỉ `Cert:\CurrentUser\My\1F0AAF51781F3F87B637A3F0951708FD65A4D24E` bị automatic approval review từ chối với lý do duy nhất “blocked by policy”. Không thử lách bằng cách khác; các file/chứng chỉ này còn cần người dùng dọn. Chúng chỉ thuộc QA local, DB và service dùng chúng đã dừng/xóa.
- Chưa kiểm chứng trust chain của chứng chỉ production, deployment HTTPS ngoài local hay các API POS/kho chưa triển khai. Không có CI độc lập. Test UI/API tự động đã được QA chạy trước đó tại [run QA độc lập](../2026-10-29-qa-recheck-1300-66c92cb/run.md).
