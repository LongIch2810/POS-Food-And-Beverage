# Codex doctor báo lỗi cấp phát Windows sandbox

- Trạng thái: chưa giải quyết; không chặn việc parse/cấu hình custom agents.
- Ngày/môi trường: 2026-10-28, Windows, Codex CLI v0.165.0.
- Task liên quan: `tasks/completed/2026-10-28-custom-agents.md`.

## Triệu chứng và cách tái hiện

Chạy `codex doctor --summary --ascii`: mục `config` báo loaded, nhưng tổng thể exit 1 và mục `sandbox` báo “elevated Windows sandbox provisioning recorded a structured failure”. Có thêm cảnh báo MCP, thread state và app-server socket.

## Nguyên nhân đã xác minh

Chưa xác minh nguyên nhân sandbox; thông báo doctor không chỉ ra lỗi trong hai file `.codex/agents/*.toml`.

## Cách sửa hoặc hướng xử lý

Chưa sửa vì nằm ngoài phạm vi tạo custom agents. Nếu cần chạy agent với sandbox Windows, xem chi tiết `codex doctor` và trạng thái sandbox/app-server trước khi sửa cấu hình.

## Kiểm chứng kết quả

Python `tomllib` parse hai file agent và xác minh các trường bắt buộc, model, effort: đạt. `codex doctor` vẫn exit 1 do kiểm tra môi trường nói trên; chưa thử spawn agent trong phiên mới.
