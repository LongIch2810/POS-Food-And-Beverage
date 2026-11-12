# Trạng thái: đã sửa

- Triệu chứng: login đang chờ khóa user vẫn có thể tạo phiên bằng mật khẩu cũ sau khi mật khẩu được đổi.
- Tái hiện: giữ khóa dòng user, bắt đầu login bằng mật khẩu cũ, cập nhật hash rồi nhả khóa; test tích hợp từng nhận login thành công.
- Nguyên nhân: đọc hash và so bcrypt trước khi khóa dòng user; sau khóa chỉ kiểm tra trạng thái.
- Sửa: nạp user hiện hành bằng `FOR UPDATE OF u` trước khi so mật khẩu và tạo phiên.
- Kiểm chứng: test race trong `POS_API/src/auth/tests/auth.integration.test.ts` đỏ trước sửa, xanh sau sửa; QA local `qa-evidence/20261028-152045-cdcc096/run.md`.
- Task: `tasks/completed/2026-10-28-pb-02-auth.md`; commit: chưa commit.
