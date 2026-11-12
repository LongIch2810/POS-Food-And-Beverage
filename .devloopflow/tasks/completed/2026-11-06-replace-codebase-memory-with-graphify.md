# Thay codebase-memory bằng Graphify

Trạng thái: HOÀN TẤT

## Mục tiêu và bối cảnh

Thay quy trình khám phá mã nguồn dựa trên `codebase-memory-mcp` bằng Graphify từ `https://github.com/Graphify-Labs/graphify` trong repository POS-F&B. Cần cài công cụ phục vụ agent, thiết lập skill Codex trong phạm vi project, và cập nhật các chỉ dẫn hiện có để không còn yêu cầu codebase-memory.

## Phạm vi

- Bao gồm: hướng dẫn gốc `AGENTS.md`, cấu hình explorer `.codex/agents/explorer.toml`, Graphify CLI cài bằng `uv tool`, skill Codex và graph output của repository nếu công cụ hỗ trợ.
- Không bao gồm: thay đổi source ứng dụng POS, dependency runtime, DB, test, commit hoặc push.
- Working tree ban đầu đã có thay đổi không thuộc task; giữ nguyên chúng và chỉ chỉnh đúng các file được liệt kê trong phạm vi.

## Căn cứ và quyết định

- Graphify upstream README: package chính thức `graphifyy`, lệnh CLI `graphify`, yêu cầu Python 3.10+, project-scoped skill qua `graphify install --project --platform codex`.
- Môi trường hiện tại có Python 3.13 và uv 0.11.21.
- Quyết định: cài bằng `uv tool install graphifyy` để cô lập khỏi dependency dự án; cài skill project scoped để hướng dẫn được lưu cùng repo.

## Kế hoạch từng bước

1. Ghi baseline Git, đọc chỉ dẫn và xác định mọi tham chiếu codebase-memory/Graphify.
2. Cài Graphify CLI trong uv tool environment.
3. Cài Graphify skill Codex ở phạm vi repository. Hoàn tất: `.codex/skills/graphify/SKILL.md` và thư mục `references/` được tạo.
4. Cập nhật `AGENTS.md` và `.codex/agents/explorer.toml`: Graphify dùng để khám phá symbol, quan hệ/caller, truy vấn graph và kiến trúc; dùng `rg`/đọc file cho literal, cấu hình, tài liệu, và fallback khi graph thiếu hoặc cũ. Hoàn tất; không còn chỉ dẫn codebase-memory trong các file agent.
5. Build graph code-only vì repo có tài liệu/ảnh riêng tư và không cấu hình backend LLM. Hoàn tất: `graphify-out/graph.json` có 4.168 nodes, 11.420 edges, 153 communities; `graphify query` đọc được graph.
6. Rà soát diff, xác nhận không còn tham chiếu codebase-memory trong cấu hình/hướng dẫn và ghi kết quả. Hoàn tất; hook `graphify hook-check` no-op do installer thêm đã được bỏ, hook JSON hiện có được giữ nguyên.

## Tiêu chí hoàn thành

- [x] Graphify CLI cài được; `uv tool install graphifyy` thành công, CLI chạy lệnh build và query.
- [x] Skill Codex project-scoped tồn tại tại `.codex/skills/graphify/SKILL.md` cùng `references/`.
- [x] AGENTS.md và explorer dùng Graphify, không nhắc codebase-memory-mcp.
- [x] Graph repo tồn tại tại `graphify-out/graph.json`; generated graph và cache đang untracked, chưa commit.
- [x] Diff task chỉ chạm hướng dẫn agent/explorer, skill Graphify và task log; các thay đổi working tree đã tồn tại từ trước được giữ nguyên. Không chạy test ứng dụng.

## Trạng thái và bằng chứng

- Baseline branch: `feat/pb06-shifts`.
- Baseline HEAD: `6154856f7939909ea2ebfa4f24c59d88fed3c8e8`.
- Baseline working tree đã dirty trước task. Các đường dẫn baseline: `D .agents/subagents/README.md`, `D .agents/subagents/code-reviewer.md`, `D .agents/subagents/explorer.md`, `D .agents/subagents/qa.md`, `M .codex/agents/qa.toml`, `M AGENTS.md`, `M MEMORY.md`, `?? .agents/skills/implement/`, `?? qa-evidence/20261105-212738-1132f12-sprint05-qa-independent/backend-test-after-overage.log`, `?? qa-evidence/20261105-212738-1132f12-sprint05-qa-independent/backend-test.log`, `?? qa-evidence/20261105-213954-1132f12-sprint05-qa-b09-retest/backend-test-final.log`, `?? tasks/completed/2026-11-05-create-implement-skill.md`. Không đụng các đường dẫn này.
- `uv tool install graphifyy` → exit code 0, cài `graphifyy==0.9.103` và lệnh `graphify`, `graphify-mcp`.

## File dự kiến thay đổi

- `AGENTS.md`
- `.codex/agents/explorer.toml`
- `.codex/skills/graphify/`, `graphify-out/` (output Graphify).
- File task này.

## Lệnh đã chạy

- `uv --version` → `0.11.21`.
- `python --version` → `3.13.15`.
- Trước cài đặt, `Get-Command uv, graphify, python` tìm thấy uv và python; graphify chưa có trong PATH.
- `uv tool install graphifyy` → exit code 0; Graphify CLI và graphify-mcp executables được cài trong uv tool environment.
- `graphify --version` → `graphify 0.9.103`.
- `graphify install --project --platform codex` → cài skill trong `.codex/skills/graphify/`; installer thêm no-op hook `PreToolUse` và backup hooks config, sau đó task bỏ chính xác hook và backup vừa sinh.
- `graphify . --no-viz` → exit code 1 do 782 tài liệu/ảnh cần LLM key; không cấu hình key.
- `graphify . --code-only --no-viz` → exit code 0, build code graph: 4.168 nodes, 11.420 edges, 153 communities.
- `graphify . --cluster-only --no-viz` → exit code 1 do chế độ này vẫn quét 782 tài liệu/ảnh mà không có LLM key.
- `graphify . --cluster-only --code-only --no-viz` → exit code 0, duy trì graph JSON/analysis; không sinh `GRAPH_REPORT.md`, CLI báo cần chạy cluster-only riêng.
- `graphify . --update --code-only --no-viz` → exit code 0; cập nhật graph sau khi chỉnh AGENTS/explorer/task.
- `graphify query "authentication module callers and database dependencies"` → query thành công, 132 nodes, kết quả bị giới hạn theo ngân sách mặc định.
- `graphify query "AuthService callers" --budget 1200` → đọc graph thành công; kết quả tìm node `authService` trong `POS_UI/src/services/authService.ts`.
- Kiểm tra JSON `.codex/hooks.json` → hợp lệ. `git diff --check` → không có lỗi whitespace; cảnh báo line-ending chỉ xuất hiện ở file `MEMORY.md` đã dirty từ trước.

## Rủi ro / chưa xác minh

- Graph này không gồm 514 tài liệu và 268 ảnh do chạy `--code-only`; Graphify báo 454 file không có extractor và một file SQL thiếu dependency `tree_sitter_sql`.
- Quá trình build cảnh báo 8 file có thể nhạy cảm bị bỏ qua; các file `.env` bị ignore. Không in nội dung nhạy cảm.
- Không tạo `GRAPH_REPORT.md`; chỉ cần graph JSON cho query hiện tại.
- Không chạy test ứng dụng vì task chỉ đổi tooling/hướng dẫn agent.

## Bước tiếp theo

Task hoàn tất. Dùng `graphify query` cho truy vấn code; dùng `graphify . --update --code-only --no-viz` sau khi source đổi. Nếu muốn Graphify lập chỉ mục docs/PDF/ảnh, cần quyết định backend LLM phù hợp và rà soát dữ liệu sẽ gửi trước khi cấu hình.
