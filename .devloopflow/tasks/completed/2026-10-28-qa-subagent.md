# Tạo QA subagent

- Trạng thái: completed
- Mục tiêu: thêm QA agent để kiểm thử hành vi và báo lỗi theo rule dự án.
- Plan liên quan: không có.
- Nhánh: `docs/architecture-and-rules`.

## Đã làm

- Đối chiếu cấu hình hai custom agent hiện có, trạng thái Git và `rules/testing.md`.
- Chốt mặc định: QA kế thừa model/effort từ phiên gọi vì người dùng chưa chọn riêng.
- Tạo `.codex/agents/qa.toml`, cập nhật bản đồ agent trong `AGENTS.md`.
- Python `tomllib` xác minh tên, mô tả, chỉ dẫn và việc không đặt model/effort: đạt.
- `git diff --check -- AGENTS.md`: đạt.

## Đang làm

- Không còn phần dở dang.

## Tiếp theo

- Không có.

## Lỗi hoặc điểm chặn

- Chưa thử spawn agent trong phiên Codex mới. `codex doctor` đã có lỗi sandbox môi trường, ghi ở `errors/2026-10-28-codex-doctor-sandbox.md`.
