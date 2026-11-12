# Trạng thái: hoàn tất

- Sprint liên quan: `sprints/sprint-01/SPRINT.md`.
- Mục tiêu: cập nhật thiết kế access token sang cookie HttpOnly và đồng bộ API, kiến trúc, tiêu chí nghiệm thu.
- Nhánh: `feat/sprint-1-auth`.
- Đã hoàn tất: Product Owner chọn cookie HttpOnly do browser gửi tự động và API đọc. Đã cập nhật tên/thuộc tính access cookie, response login/refresh, guard, CSRF cho mọi request ghi, luồng tải lại trang, endpoint ảnh món và tiêu chí Sprint 1; thêm `CSRF_INVALID` vào quy ước lỗi API.
- Hiện tại: hoàn tất cập nhật thiết kế; không triển khai code.
- Bước tiếp theo: khi làm refinement từng endpoint, chốt request/response và tình huống biên trong `specs/` theo thiết kế mới.
- File đã đổi: `docs/architecture/auth.md`, `docs/api-spec.md`, `docs/architecture/ARCHITECTURE.md`, `sprints/sprint-01/SPRINT.md`, task này.
- Kiểm tra: `git diff --check` exit 0; tìm lại tham chiếu Bearer/accessToken/bộ nhớ trong tài liệu, chỉ còn các câu mô tả cách cũ không còn được dùng; xác nhận không có whitespace cuối dòng. Không chạy test ứng dụng vì chỉ sửa tài liệu.
- Blocker/câu hỏi: không có cho thay đổi cơ chế cookie; chi tiết endpoint vẫn chốt khi refinement.
