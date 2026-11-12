# UI giữ phiên sau khi tài khoản hoặc store bị khóa

Trạng thái: đã sửa; kiểm chứng local bằng test và Chrome với phản hồi API mô phỏng.

- Triệu chứng: Khi `GET /auth/me` trả `403 ACCOUNT_DISABLED` hoặc `STORE_SUSPENDED` lúc người dùng đang ở màn nghiệp vụ, UI chỉ lưu thông báo lỗi và vẫn giữ `isAuthenticated=true`.
- Điều kiện tái hiện: Có phiên đang mở, backend thu hồi quyền vì khóa user/store, sau đó focus lại tab để chạy `restoreSession()`.
- Nguyên nhân: `AuthContext` catch lỗi khôi phục phiên mà không xóa session và trạng thái đăng nhập.
- Cách sửa: Xóa session trên hai mã lỗi, chuyển về login và phát sự kiện `revoked` để các tab khác cũng thoát; giữ thông báo lỗi trên tab phát hiện.
- Kiểm chứng: `qa-evidence/2026-10-29-1241-66c92cb-review-retest/run.md`; Chrome DevTools MCP mô phỏng cả hai mã lỗi và hai tab. API test với PostgreSQL QA riêng 5/5; UI test 7/7, build đạt.
- Giới hạn: Chrome dùng phản hồi 403 mô phỏng để kiểm tra UI, chưa thao tác khóa user/store trong DB thật ở lần chạy này. Không có CI độc lập.
- Task: `tasks/active/2026-10-29-pb13-auth-ui.md`. Commit nền `66c92cb`; thay đổi chưa commit.
