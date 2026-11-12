# Bảo vệ source code và command rules

- Trạng thái: completed
- Mục tiêu: thêm hướng dẫn không làm mất source/thay đổi chưa commit và command rules Codex cho lệnh phá hủy.
- Plan liên quan: không có.
- Nhánh: `docs/architecture-and-rules`.

## Đã làm

- Đọc AGENTS.md và rules/git.md, kiểm tra Git sạch và thư mục `.codex/` chưa có rules.
- Tra OpenAI Docs về cú pháp `.rules`, thứ tự `forbidden > prompt > allow` và `codex execpolicy check`.
- Thêm mục bảo vệ source vào `AGENTS.md` và `.codex/rules/source-protection.rules`.
- `codex execpolicy check`: `git reset --hard` và `git clean -fdx` là `forbidden`; `rm -rf` và `Remove-Item -Recurse` là `prompt`; `rm one-file.txt`, `npm run build`, `npm test` không khớp rule.
- `git diff --check -- AGENTS.md` và kiểm tra khoảng trắng cuối dòng: đạt.

## Đang làm

- Không còn phần dở dang.

## Tiếp theo

- Không có.

## Lỗi hoặc điểm chặn

- Đã xác minh: `powershell.exe -Command 'git reset --hard'` không khớp rule trực tiếp vì toàn bộ script là một token. `AGENTS.md` yêu cầu tuân thủ chính sách cả với PowerShell/script/tool khác. Project-local rules chỉ tự nạp khi lớp `.codex` được tin cậy và Codex khởi động lại.
