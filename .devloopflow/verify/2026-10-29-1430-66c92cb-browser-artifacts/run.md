# PB-13 — bổ sung chứng cứ browser cho QA-F01 và QA-F02

- Loại: **local do agent chạy**, Playwright MCP trên UI demo cuối; chưa có CI/runner độc lập.
- Thời gian: 2026-10-29 14:13–14:25 +07:00.
- Commit nền: `66c92cbeb41b7b0f3d2dfaf53f9552474ce5310f`; working tree **dirty** với thay đổi PB-13 và hồ sơ QA chưa commit.
- Môi trường: Windows, PostgreSQL 17 trong container QA `pos-pb13-independent-qa`, DB riêng `pos_pb13_artifacts_1430` trên cổng 55433; API NestJS 3001; Vite 5174; TLS proxy self-signed `https://localhost:5443`. Playwright dùng `ignoreHTTPSErrors: true`, `viewport: 1024×768`, `hasTouch: true`. Không dùng DB live.
- Chuẩn bị: `docker start pos-pb13-independent-qa`; `npm run migration:run` với `DATABASE_URL` QA (exit 0; [output gốc](evidence/migration.log)); chạy `node dist/main.js` trong POS_API với `PORT=3001`, `PUBLIC_ORIGIN=https://localhost:5443` và secret QA; chạy `npm run dev -- --port 5174 --strictPort` trong POS_UI với `VITE_API_TARGET=http://127.0.0.1:3001`; chạy `node qa-evidence/2026-10-29-1356-66c92cb-e2e/qa-tls-proxy.cjs` với PFX QA. Không lưu secret, password, JWT hoặc giá trị cookie.

## QA-F01 — HTTPS cookie, storage, CSRF và refresh hai tab

- Dùng `mcp__playwright__browser_run_code_unsafe`: đăng nhập `qa_admin_artifacts` qua UI HTTPS, mở tab thứ hai cùng browser context. Browser trả về [metadata cookie, storage, snapshot và trạng thái hai tab](evidence/browser-cookie-storage.json). Access/refresh là `HttpOnly; Secure; SameSite=Strict; Path=/`; CSRF là `Secure; SameSite=Strict; Path=/` và là cookie duy nhất nhìn thấy trong `document.cookie`. LocalStorage chỉ có `pos_fb_mock_v1`; sessionStorage rỗng. [Kiểm tra nội dung storage và CSRF](evidence/browser-storage-csrf.json) không thấy JWT hoặc tên token trong key demo, URL không có token; refresh thiếu CSRF → 403 `CSRF_INVALID`, có CSRF → 200 với `data.expiresIn` và `data.user`, không có token trong JSON.
- Truy vấn DB chỉ đọc trước: `docker exec pos-pb13-independent-qa psql -U pos_qa -d pos_pb13_artifacts_1430 -Atc "SELECT u.username, count(r.id), count(r.id) FILTER (WHERE r.revoked_at IS NULL), count(r.id) FILTER (WHERE r.replaced_at IS NOT NULL) FROM users u LEFT JOIN refresh_tokens r ON r.user_id=u.id WHERE u.username='qa_admin_artifacts' GROUP BY u.username"` → [3 total, 2 active, 1 replaced](evidence/db-refresh-before.txt). Hai session active do lần đăng nhập QA trước đó; so sánh delta của cùng tài khoản.
- Trong Playwright, tạo JWT access đã hết hạn bằng secret QA, giữ chữ ký HMAC hợp lệ; ghi đè cookie access của context và phát `focus` đồng thời trên hai tab. [Output browser của các response](evidence/browser-refresh-two-tabs.json): cả hai tab nhận `/auth/me` 401, có đúng một `/auth/refresh` 200, rồi mỗi tab có `/auth/me` 200 và vẫn hiển thị quản trị. Cookie access thay đổi. Cùng truy vấn DB → [4 total, 2 active, 2 replaced](evidence/db-refresh-after.txt), tức đúng một refresh row mới và một row cũ bị thay thế.
- Lần thử CSRF đầu gửi body `{}` nên API trả 422 theo hợp đồng endpoint không nhận body. Đã chạy lại không có body để kiểm chứng 403/200 ở trên; không tính 422 là kết quả CSRF.
- JSON browser lưu metadata, mã trạng thái và snapshot đã loại giá trị cookie/JWT/password; đây là output Playwright đã che dữ liệu nhạy cảm. HTTPS dùng chứng chỉ self-signed QA, chưa chứng minh trust chain production.

## QA-F02 — UI demo cuối trên tablet ngang

- [Ảnh màn đăng nhập](evidence/tablet-login.png) và [snapshot text/viewport](evidence/browser-tablet-login.json) trên bản UI demo cuối qua HTTPS; đăng nhập bằng tài khoản QA bằng thao tác Playwright với `hasTouch=true`.
- [Ảnh màn quản trị sau đăng nhập](evidence/tablet-platform-admin.png) và [snapshot text/viewport](evidence/browser-cookie-storage.json). Cả hai ở 1024×768; `documentScrollWidth=1024`, không tràn ngang. Màn quản trị còn có banner nêu các chức năng nghiệp vụ dùng dữ liệu mẫu, xác nhận đúng nhánh UI demo đã khôi phục.
- Phạm vi ảnh mới là login và platform admin ở tablet ngang; các màn nghiệp vụ mock chưa được kiểm chứng lại trong lần chạy này.

## Kết thúc

- Playwright MCP trả kết quả thành công cho các bước cuối; lệnh migration, truy vấn DB và `dropdb` exit 0. API/UI/TLS QA đã dừng; đã xác minh tên DB rồi chạy `docker exec pos-pb13-independent-qa dropdb -U pos_qa pos_pb13_artifacts_1430` và `docker stop pos-pb13-independent-qa`. Container/DB live không bị thay đổi bởi lần QA này.
- Đây là bằng chứng local do agent tạo, không phải xác nhận độc lập của CI. Material QA tạm còn lại từ lần trước vẫn thuộc giới hạn cleanup đã ghi ở [báo cáo E2E](../2026-10-29-1356-66c92cb-e2e/run.md).
