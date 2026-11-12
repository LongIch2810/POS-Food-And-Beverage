# Plan: Thiết lập các subagent cho Antigravity từ .codex/agents/

**Trạng thái:** COMPLETED
**Ngày hoàn tất:** 2026-11-02
**Nhánh:** feat/pb13-organization-ui

## Mục tiêu
Chuyển đổi 3 subagent từ cấu hình Codex (`.codex/agents/*.toml`) sang Antigravity:
1. `explorer`: Khám phá source, định vị symbol/code qua codebase-memory-mcp (chỉ đọc).
2. `code-reviewer`: Review thay đổi code theo tính đúng, phân quyền, transaction, idempotency (chỉ đọc).
3. `qa`: Kiểm thử hành vi POS, tái hiện lỗi, thu thập bằng chứng vào `qa-evidence/` (không sửa source).

## Phạm vi
- Tạo hồ sơ đặc tả subagent chuẩn hóa tại `.agents/subagents/`:
  - `explorer.md`
  - `code-reviewer.md`
  - `qa.md`
  - `README.md`
- Cập nhật bản đồ repository trong `AGENTS.md`.
- Đăng ký runtime 3 subagent vào Antigravity bằng `define_subagent`.
- Kiểm thử chạy thử nghiệm (`invoke_subagent`) để xác nhận hoạt động.

## Kết quả thực hiện
- [x] 3 file `.agents/subagents/*.md` và `README.md` tồn tại, phản ánh đúng chỉ dẫn từ `.codex/agents/*.toml` và bổ sung quy chuẩn Antigravity.
- [x] `AGENTS.md` ghi nhận thư mục `.agents/subagents/`.
- [x] 3 subagent được đăng ký thành công trong phiên Antigravity (`explorer`, `code-reviewer`, `qa`).
- [x] Subagent `explorer` chạy thử nghiệm thành công (conversationId: `198a8196-9dc3-4117-ac4c-22c26be4425e`), định vị chính xác Entity `Store` tại `POS_API/src/platform/entities/store.entity.ts#L8-L45` kèm dẫn chứng cụ thể.

