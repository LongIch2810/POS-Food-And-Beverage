# Cấu hình agent khám phá code và review

- Trạng thái: completed
- Mục tiêu: tạo project agents `explorer` (GPT-6 Luna medium) và `code-reviewer` (GPT-6.1 Sol high).
- Plan liên quan: không có.
- Nhánh: `docs/architecture-and-rules`.

## Đã làm

- Đọc OpenAI Docs về custom agents: file riêng trong `.codex/agents/`, các trường bắt buộc và ưu tiên model/effort.
- Kiểm tra `.codex/` hiện chỉ có command rules; working tree sạch.
- Tạo `.codex/agents/explorer.toml` và `.codex/agents/code-reviewer.toml` với model/effort đúng yêu cầu và chỉ dẫn chỉ đọc.
- Thêm đường dẫn hai agent vào bản đồ repository trong `AGENTS.md`.
- Python `tomllib` parse cả hai file, xác minh `name`, `model`, `model_reasoning_effort` và các trường bắt buộc: đạt.
- Kiểm tra khoảng trắng cuối dòng và trạng thái Git: đạt.
- `codex doctor --summary --ascii` báo config loaded; exit 1 vì lỗi Windows sandbox/cảnh báo môi trường, ghi ở `errors/2026-10-28-codex-doctor-sandbox.md`.

## Đang làm

- Không còn phần dở dang.

## Tiếp theo

- Không có.

## Lỗi hoặc điểm chặn

- Custom agent chỉ dẫn không sửa file nhưng không tạo sandbox chỉ đọc riêng; nó kế thừa quyền của agent cha. Chưa chạy agent thực tế trong phiên Codex mới để kiểm tra auto-discovery. `codex doctor` có lỗi sandbox môi trường không liên quan cú pháp hai file agent.
