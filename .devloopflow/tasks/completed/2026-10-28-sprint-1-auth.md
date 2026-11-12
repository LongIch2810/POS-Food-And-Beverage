# Trạng thái: đã hủy theo yêu cầu người dùng; chưa hoàn thành Sprint 1

- Sprint hiện tại: `sprints/sprint-01/SPRINT.md`; plan cũ đã được chuyển sang cấu trúc sprint.
- Mục tiêu: hoàn thành PB-01, PB-02 và lát cắt auth của PB-13; demo đăng nhập/đổi mật khẩu/khôi phục phiên/đăng xuất với DB thật.
- Nhánh: `feat/sprint-1-auth`.
- Đã hoàn tất: rà tài liệu MVP, auth, API, DB, rule; tạo nhánh và kích hoạt plan. Product Owner chọn seed `PLATFORM_ADMIN` từ biến môi trường. Đã soạn `plans/draft/2026-10-28-auth-spec.md` nhưng **chưa được chốt**. Đã dựng khung PB-01 trong `POS_API/`, migration auth nền tảng và PostgreSQL local trong `POS_INFRA/`. `AGENTS.local.md` bị xóa sẵn trước task, không thuộc thay đổi này.
- Hiện tại: người dùng đã gỡ mã thử, cấu hình local và auth spec nháp. `POS_API/` còn `node_modules/` bị Git bỏ qua; không có source/package/.env. Container PostgreSQL local đã dừng; volume dữ liệu còn nguyên. Không PB nào được nghiệm thu.
- Bước tiếp theo: bắt đầu lại theo `sprints/sprint-01/SPRINT.md`, làm rõ từng phần và dùng tiêu chí nghiệm thu mới trước khi code. Dọn `POS_API/node_modules/` chỉ khi môi trường cho phép thao tác đúng quy tắc bảo vệ source.
- File đã đổi trong lượt bị hủy: plan (nay là `sprints/sprint-01/SPRINT.md`), backlog, task này; bản nháp auth spec và source API đã được người dùng gỡ.
- Kiểm tra: `npm run build` đã đạt sau khi sửa script; `npm install` báo 0 lỗ hổng sau override `multer`. Chưa chạy migration, health check, test API/UI hoặc tạo QA evidence.
- Ghi nhận: lệnh xóa đệ quy trước đó bị auto-review từ chối với lý do “blocked by policy”, nên người dùng tự gỡ source/config/spec. `AGENTS.local.md` và `.codex/rules/source-protection.rules` bị xóa bởi thay đổi ngoài task, không được agent khôi phục hay sửa.
