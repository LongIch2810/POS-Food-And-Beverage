# Cập nhật hướng dẫn agent và bộ nhớ công việc bằng file

- Trạng thái: completed
- Mục tiêu: agent tìm đúng tài liệu/rule và tiếp tục được plan, task sau khi mất ngữ cảnh.
- Nhánh: `docs/architecture-and-rules`
- Plan liên quan: không có; đây là thay đổi tài liệu độc lập.

## Đã làm

- Kiểm tra `AGENTS.md`, các thư mục/tài liệu hiện có và trạng thái Git.
- Xác nhận `plans/`, `tasks/`, `errors/` đang trống.
- Thêm bản đồ tài liệu/rule và quy trình checkpoint trong `AGENTS.md`.
- Tạo các thư mục trạng thái được Git theo dõi. Ban đầu có ba README hướng dẫn; sau phản hồi của người dùng đã gộp quy trình vào `AGENTS.md` và xóa README để chỉ còn một nguồn hướng dẫn.

## Đang làm

- Không còn phần dở dang.

## Tiếp theo

- Không có; task đã hoàn thành.

## Kiểm tra

- `git diff --check -- AGENTS.md`: đạt.
- Kiểm tra các file/thư mục cần có và khoảng trắng cuối dòng: đạt.
- Chưa chạy test ứng dụng vì chỉ đổi tài liệu/quy trình.

## Lỗi hoặc điểm chặn

- Chưa có.
