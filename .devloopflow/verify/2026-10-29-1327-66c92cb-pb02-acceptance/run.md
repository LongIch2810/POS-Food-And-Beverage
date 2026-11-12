# PB-02 — bổ sung bằng chứng nghiệm thu

- Nhãn: local do agent chạy; chưa có CI/runner độc lập.
- Thời gian: 2026-10-29 13:27:01–13:30:13 +07:00.
- Commit nền `66c92cbeb41b7b0f3d2dfaf53f9552474ce5310f`; working tree dirty, gồm thay đổi PB-13 và test PB-02 chưa commit.
- Môi trường: Windows, Node 22, PostgreSQL 17 container QA riêng `pos-pb13-independent-qa`, cổng 55433. Test tự tạo database ngẫu nhiên, chạy migration và xóa database đó khi kết thúc; container QA đã dừng.
- Lệnh: `npm test --prefix POS_API`, với `DATABASE_URL` trỏ đến PostgreSQL QA, `JWT_SECRET`, `CSRF_SECRET` và `PUBLIC_ORIGIN` thử. Build TypeScript và runner hoàn tất, exit 0, 5 test pass, 0 fail: [output gốc](evidence/api-test-complete.log).
- Hai lần trước chưa đạt: [build](evidence/api-test-initial.log) thiếu type annotation (exit 2); [test](evidence/api-test-second.log) cho thấy test rate limit phụ thuộc số request trước (exit 1); [test tiếp](evidence/api-test-final.log) gửi Content-Type JSON không body và nhận 422 trước CSRF (exit 1). Các test đã sửa thiết lập, không thay logic ứng dụng. [Lượt trung gian đạt](evidence/api-test-recheck.log).
- `git diff --check` exit 0, có cảnh báo LF/CRLF. Không ghi token hoặc thông tin kết nối vào log.

## Đối chiếu năm tiêu chí

1. Login: kiểm tra access cookie HttpOnly Max-Age 1800, JWT exp−iat 1800; refresh cookie HttpOnly Max-Age 604800 và thời hạn DB khoảng 7 ngày; refresh lưu hash, JSON không trả access token. So sánh code/message 401 của username không tồn tại, mật khẩu sai, user khóa và store tạm khóa; kiểm tra giới hạn thử. Assertion trong [test tích hợp](../../../POS_API/src/auth/tests/auth.integration.test.ts).
2. `/auth/me`: test token sai/phiên thu hồi, trạng thái user/store và quyền cập nhật từ DB; test `PLATFORM_ADMIN` bị từ chối `pos.sell` dù role được gán quyền đó. Bốn vai trò và token hết hạn được kiểm tra browser trong [E2E](../2026-10-29-1356-66c92cb-e2e/run.md).
3. Đổi mật khẩu bắt buộc: guard chặn nghiệp vụ; test hai phiên cùng tài khoản trước đổi, sau đổi cả access và refresh của phiên kia bị từ chối và DB không còn refresh hoạt động. Mật khẩu 11 ký tự bị từ chối, đúng 12 ký tự đổi và đăng nhập lại thành công. PLATFORM_ADMIN bootstrap là ngoại lệ được Product Owner chốt.
4. Khôi phục/refresh: test xoay, replay, đồng thời và transaction rollback; E2E trước kiểm tra access hết hạn trên hai tab. Test thêm cả thiếu/sai Origin và thiếu/sai CSRF cho từng route refresh, logout và change-password, xác nhận phiên còn hiệu lực sau các yêu cầu bị từ chối.
5. Logout: kiểm tra hai phiên A/B và giữ phiên B; POST `/api/v1/auth/register` và `/api/v1/register` trả 404, rà controller hiện có không có route đăng ký. Đây là bằng chứng cho các route hiện triển khai.

Các assertion tích hợp gộp trong một test runner; số 5 là số test runner, không phải số tình huống độc lập. HTTPS local ở E2E dùng self-signed và bỏ qua xác thực CA.
