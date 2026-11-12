# Hướng dẫn cho Claude Code

@AGENTS.md

Toàn bộ quy tắc dự án nằm ở `AGENTS.md` (nhập ở trên) và dùng chung với Codex. File này chỉ ghi phần riêng của Claude Code; không chép lại nội dung chung. Sửa quy tắc chung ở `AGENTS.md`.

## Cấu hình riêng của Claude Code (phạm vi project)

- `.claude/settings.json`:
  - Hook Graphify: `PreToolUse` cho `Bash|Grep` và `Read|Glob` (nhắc chạy `graphify query` trước khi grep/đọc source) và `SessionStart` `compact` (đặt lại ngân sách nhắc). Hook chỉ nhắc, không tự rebuild graph.
  - Hook Impeccable: `PostToolUse` cho `Edit|Write|MultiEdit` và `Stop` (kiểm lỗi giao diện sau khi sửa file UI), tương ứng `.codex/hooks.json` của Codex.
  - `enabledPlugins`: `caveman@caveman` (trả lời ngắn) và `ponytail@ponytail` (thay đổi nhỏ nhất). Tắt bằng cách bỏ khỏi `enabledPlugins`.
- `.claude/skills/`: `graphify`, `impeccable`, `ui-ux-pro-max`, `frontend-design`, `design-taste-frontend`; là bản sao của `.codex/skills/` và `.agents/skills/`, giữ đồng bộ theo mục "Đồng bộ Claude Code và Codex" trong `AGENTS.md`.
- Plugin `devloopflow` và `superpowers` bật ở cấp user (không nằm trong `.claude/settings.json`); skill `devloopflow:*` là quy trình chính, xem `.devloopflow/devloopflow.md`.
- Cấu hình thay đổi chỉ có hiệu lực từ phiên mới. Hook và plugin của project có thể cần user duyệt lần đầu.

## Lưu ý khi dùng

- Ponytail mặc định ghi một dòng số liệu mỗi lượt (chi phí, số lượt, token) vào `~/.config/ponytail/band/<project>.csv` trên máy user; không gửi ra ngoài trừ khi user đặt `webhookUrl`.
- Lệnh xóa đệ quy bị kiểm tra an toàn của Claude Code chặn khi chưa được user duyệt: dừng, nêu đường dẫn tuyệt đối và tác động, để user duyệt hoặc tự chạy; không chia nhỏ lệnh hay đổi công cụ để lách.
- Trên Windows, viết script Python có ký tự `\` bằng công cụ Write rồi chạy file, không nhúng vào heredoc của Bash (xem `.devloopflow/MEMORY.md` M-24).
