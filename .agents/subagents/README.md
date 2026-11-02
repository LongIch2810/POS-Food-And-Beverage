# Antigravity Subagents for POS-F&B

Thư mục này chứa đặc tả và cấu hình của các subagent chuyên trách cho môi trường **Google Antigravity** trong dự án POS-F&B.

## Danh sách Subagent

| Tên Subagent | Tệp định nghĩa | Vai trò | Quyền hạn công cụ (Capabilities) | Model khuyến nghị | Tương đương trong Codex |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`explorer`** | [explorer.md](explorer.md) | Khám phá cấu trúc, công nghệ và kiến trúc dự án; định vị code khi có task | `MCP: true`, `Write: false` (Chỉ đọc) | `flash` | `.codex/agents/explorer.toml` |
| **`code-reviewer`** | [code-reviewer.md](code-reviewer.md) | Thẩm định code, review tính đúng, an toàn tenant, transaction | `MCP: true`, `Write: false` (Chỉ đọc) | `pro` / `inherit` | `.codex/agents/code-reviewer.toml` |
| **`qa`** | [qa.md](qa.md) | Chạy kiểm thử, tái hiện bug, ghi bằng chứng vào `qa-evidence/` | `MCP: true`, `Write: true` (Không sửa code) | `inherit` / `pro` | `.codex/agents/qa.toml` |

## Cơ chế hoạt động trong Antigravity

Trong một phiên làm việc của Antigravity:
1. **Đăng ký subagent**: Agent chính sử dụng công cụ `define_subagent` để nạp các subagent này vào runtime của phiên hội thoại.
2. **Khởi chạy subagent**: Sử dụng công cụ `invoke_subagent` với `TypeName` tương ứng:
   ```typescript
   invoke_subagent({
     TypeName: "explorer" | "code-reviewer" | "qa",
     Role: "<Mô tả vai trò 2-5 từ>",
     Prompt: "<Yêu cầu cụ thể, chi tiết cho subagent>",
     Model: "inherit" | "flash" | "pro",
     Workspace: "inherit"
   });
   ```
3. **Phản hồi tự động**: Khi subagent hoàn thành, hệ thống sẽ tự động gửi thông báo kết quả về cho agent chính (Reactive Wakeup) mà không cần polling.
