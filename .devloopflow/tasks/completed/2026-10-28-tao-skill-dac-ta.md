# Trạng thái: Hoàn tất

- Mục tiêu: Đóng gói quy trình phỏng vấn, viết, rà soát và chốt đặc tả chức năng POS thành một skill dùng chung.
- Nhánh: `docs/architecture-and-rules`.
- Phạm vi: `.agents/skills/create-pos-spec/SKILL.md`; không tạo đặc tả chức năng cụ thể.
- Đã kiểm tra: `specs/` ở gốc đang trống; `AGENTS.md` và `docs/api-spec.md` đã chỉ đến đây cho spec đã chốt.
- Đã hoàn tất: Tạo `.agents/skills/create-pos-spec/SKILL.md` với quy trình phỏng vấn, soạn nháp, rà soát và lưu bản đã chốt trong `specs/`.
- Bước tiếp theo: Dùng skill khi có yêu cầu đặc tả chức năng cụ thể.
- File đã đổi cho task: `.agents/skills/create-pos-spec/SKILL.md`, file task này.
- Kiểm tra: `git diff --check` và kiểm tra cấu trúc skill bằng Python chuẩn đều đạt. `quick_validate.py` chưa chạy được do Python thiếu `PyYAML`.
- Blocker: không có.
