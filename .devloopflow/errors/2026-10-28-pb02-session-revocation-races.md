# Trạng thái: đã sửa

- Triệu chứng: logout bằng token vừa xoay không thu hồi token mới; đổi mật khẩu đang chờ khóa user có thể tiếp tục sau khi phiên bị thu hồi.
- Tái hiện: refresh rồi logout bằng cookie cũ từng để lại một token hiện hành; test giữ khóa user, thu hồi session trong lúc request đổi mật khẩu chờ khóa từng nhận `204` thay vì `401`.
- Nguyên nhân: logout chỉ tìm token chưa thu hồi; refresh/logout khóa các dòng token khác nhau; đổi mật khẩu xác minh phiên trước transaction mà không kiểm tra lại sau khi chờ khóa.
- Sửa: refresh/logout khóa user rồi session theo cùng thứ tự, logout nhận diện token lịch sử, đổi mật khẩu kiểm tra lại phiên và trạng thái dưới khóa user.
- Kiểm chứng: test tuần tự/nhiều thế hệ và test race đổi mật khẩu đỏ trước sửa, xanh sau sửa; QA local `qa-evidence/20261028-152045-cdcc096/run.md`.
- Task: `tasks/completed/2026-10-28-pb-02-auth.md`; commit: chưa commit.
