# PB-01 — Nền API và PostgreSQL local

**Trạng thái:** đã chốt cho PB-01 ngày 2026-10-28. Không bao gồm login, phiên, UI hoặc triển khai production.

## Chạy local và migration

- `POS_INFRA/compose.local.yml` chạy duy nhất PostgreSQL. Username, password và tên DB lấy từ biến môi trường bắt buộc; không có secret mặc định. API lấy chuỗi kết nối từ `DATABASE_URL`.
- Trong `POS_API/`, `npm run build` biên dịch ứng dụng, `npm run migration:run` áp migration riêng, `npm run start` chạy bản đã build. API không tự áp migration hay đồng bộ schema. Chưa migration thì khởi động thất bại.
- Migration đầu tạo `stores`, `branches`, `roles`, `permissions`, `role_permissions`, `users`, `refresh_tokens` theo `docs/DESIGN_DB_POS_SYSTEM.md` và `docs/architecture/auth.md`. Chạy migration lặp không thay đổi schema/dữ liệu đã áp.

## Bootstrap quản trị đầu tiên

- Khi DB chưa có user mang vai trò `PLATFORM_ADMIN`, API yêu cầu `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_FULL_NAME`, `BOOTSTRAP_ADMIN_PASSWORD`. Username được lưu dưới dạng `lower(btrim(username))`, dài 1–50 ký tự; họ tên sau khi trim dài 1–150 ký tự; mật khẩu tối thiểu 12 ký tự và không vượt 72 byte UTF-8 (giới hạn đầu vào của bcrypt). Giá trị không hợp lệ làm API dừng.
- Tạo role `PLATFORM_ADMIN` nếu chưa có và user đầu tiên trong một transaction; mật khẩu chỉ ghi dạng băm bcrypt với cost 12, `store_id` và `branch_id` là `NULL`, `must_change_password = false`. Không in giá trị bootstrap hoặc hash ra log.
- Nếu đã có ít nhất một `PLATFORM_ADMIN`, bỏ qua cả ba biến, không tạo hoặc cập nhật user. Lỗi DB, schema thiếu, biến thiếu hoặc không hợp lệ ở lần đầu khiến API không phục vụ request. Không có tên đăng nhập/mật khẩu mặc định.

## Health check

`GET /api/v1/health` không yêu cầu xác thực và truy vấn `SELECT 1` qua kết nối DB hiện hành. Thành công trả `200` với `{"data":{"status":"ok"}}`. DB không truy vấn được trả `503` với `error.code = SERVICE_UNAVAILABLE`, thông báo tiếng Việt, `details: []` và `requestId` theo quy ước chung. Kết nối/truy vấn DB có timeout 5 giây. Mọi lỗi HTTP, kể cả route không tồn tại, trả envelope lỗi và `X-Request-Id`; log request chỉ ghi phương thức, path, status và request ID. Response và log không chứa chuỗi kết nối hay secret.

## Điều kiện nghiệm thu

- Từ PostgreSQL trống, `npm run migration:run` tạo các bảng và ràng buộc nêu trên; chạy lại không nhân đôi cấu trúc hoặc dữ liệu. API không tự chạy migration và không phục vụ khi schema còn thiếu.
- PostgreSQL từ chối username trùng/chưa chuẩn hóa, `token_hash` trùng và hai refresh token chưa thu hồi cùng `session_id`. Mật khẩu chỉ lưu hash bcrypt; refresh token chỉ có cột hash, không lưu token thô.
- Bootstrap hợp lệ tạo đúng một `PLATFORM_ADMIN` với `store_id`/`branch_id` là `NULL` và `must_change_password = false`. Thiếu/sai biến ở lần đầu làm startup thất bại; sau khi đã có admin, khởi động lại không cần biến và không sửa user cũ. Không có tài khoản hoặc secret mặc định trong source/log.
- `GET /api/v1/health` trả `200` khi DB truy vấn được, `503` với `SERVICE_UNAVAILABLE` khi mất kết nối; truy vấn có timeout 5 giây. Response lỗi có envelope và `X-Request-Id`, kể cả JSON hỏng hoặc route không tồn tại, và không lộ thông tin kết nối.
- Build/test đạt với PostgreSQL thật; bằng chứng chạy và artifact được lưu trong `qa-evidence/`. Quyết định chấp nhận PB-01 của Product Owner được ghi riêng trong Sprint Review.
