# Kiểm tra và hoàn thiện Graphify cho Codex

Trạng thái: HOÀN TẤT

## Mục tiêu

Kiểm tra cài đặt Graphify hiện có, hoàn thiện hướng dẫn Graphify trong `AGENTS.md` cho Codex, xác minh watch/needs_update/semantic-update từ hành vi thực tế, và thử cập nhật graph bằng một file code cùng một file Markdown tạm. Cần báo cáo rõ phần nào chạy tự động nhờ Graphify và phần nào cần Codex làm theo hướng dẫn.

## Phạm vi và giới hạn

- Chỉ thay hướng dẫn liên quan Graphify trong `AGENTS.md`; không xóa hoặc ghi đè hướng dẫn không liên quan.
- Chỉ sửa hướng dẫn Graphify trong `AGENTS.md`, file task này, Graphify output cần cập nhật, và các file probe được liệt kê bên dưới; không thay đổi source POS.
- Không chạy test ứng dụng, migration, seed hoặc ghi DB. Không commit/push.
- Giữ nguyên tất cả thay đổi working tree có trước task.

## Baseline

- Branch: `feat/pb06-shifts`.
- HEAD: `6154856f7939909ea2ebfa4f24c59d88fed3c8e8`.
- Working tree trước task: đã dirty: bốn file `.agents/subagents/*.md` bị xóa; `.codex/agents/explorer.toml`, `.codex/agents/qa.toml`, `AGENTS.md`, `MEMORY.md` bị sửa; `.agents/skills/implement/`, `.codex/skills/`, `graphify-out/`, ba log QA, và hai task hoàn thành là untracked. Không sửa các nội dung unrelated này.
- Graphify CLI `0.9.103` và project-scoped skill `.codex/skills/graphify/SKILL.md` đã có từ task trước; `graphify-out/graph.json` cũng đã tồn tại.
- `graphify-out/needs_update` chưa tồn tại tại thời điểm kiểm tra ban đầu.

## Các bước và tiêu chí

1. HOÀN TẤT: xác nhận CLI `0.9.103`, graph JSON hiện hữu, project-scoped skill và Graphify section trong AGENTS. CLI help có `codex install`, nhưng không cần cài lại vì tích hợp đã có.
2. HOÀN TẤT: đọc source package `graphify.watch`; code rebuild và doc marker xác nhận trong watcher; handler bỏ qua `_GRAPHIFY_OUT`.
3. HOÀN TẤT: chỉ sửa phần Tìm hiểu code và mục Graphify trong `AGENTS.md` để nêu điều kiện `needs_update`, semantic update, code update, watch, output filter và giới hạn tự động.
4. HOÀN TẤT: watcher nhận probe TypeScript + Markdown; code symbol được đưa vào graph; Markdown marker xuất hiện; semantic extraction thêm probe Markdown và `AGENTS.md` vào graph qua Graphify `build_merge`/`cluster`/`to_json`; query xác nhận cả ba nội dung.
5. HOÀN TẤT: dừng watcher; xóa chính xác probe files và chunk artifacts; lệnh `graphify update .` prune source code probe; xác minh test nodes biến mất và semantic nodes của AGENTS còn.
6. HOÀN TẤT: kiểm tra diff, marker và working tree; chuyển task sang `tasks/completed/`; semantic-index nội dung task cuối ở đường dẫn completed với coverage đủ 83 dòng. `graphify explain "Automatic Code Graph Rebuild by Watcher"` và `graphify explain "Semantic Update Marker"` đều truy về đúng file task. Không chỉnh nội dung Markdown sau semantic index cuối.

## Kế hoạch kiểm tra artifacts

| Tiêu chí | Artifact cần có |
| --- | --- |
| Graph hiện tại | Đạt: `graphify-out/graph.json` có trước task; checkpoint sau khi dọn probes có 4.181 nodes, 11.425 edges, 164 communities; semantic nodes từ AGENTS và task được thêm sau checkpoint đó. |
| Theo dõi code | Đạt: watcher rebuilt từ 4.168 lên 4.171 nodes; query trả `graphifyCodexWatchProbe()` từ file TypeScript tạm. |
| Markdown semantic | Đạt: watcher tạo `graphify-out/needs_update`; `graphify check-update .` báo pending; sau semantic merge, `graphify explain "Graphify Codex Semantic Probe Concept"` trả đúng node từ Markdown tạm. |
| AGENTS semantic | Đạt: sau semantic merge, `graphify explain "Graphify Codex Integration"` trả node trong `AGENTS.md` và hai quan hệ references. |
| Không loop output | Đạt: source `watch.py:3591` bỏ qua `_GRAPHIFY_OUT`; khi watcher đang chạy, tạo `graphify-out/watch-loop-probe.md` trong 5 giây không phát event/rebuild. |
| Dọn thử nghiệm | Đạt: hai probe source, file output-loop probe và hai chunk JSON đều đã xóa; code update prune code test; query không tìm thấy code/Markdown test nodes; AGENTS semantic node còn. |

## File tạm đã dùng

- `graphify-probe-codex.ts` (ở gốc repo).
- `graphify-probe-codex.md` (ở gốc repo).
- `graphify-out/watch-loop-probe.md` (đã tạo để test filter; xóa sau khi watcher dừng).
- `graphify-out/.graphify_chunk_01.json` và `.graphify_chunk_02.json` (JSON semantic worker; xóa sau merge).

Không xóa hoặc ghi đè nếu file tồn tại từ trước; cần chọn tên khác và ghi vào đây trước khi tạo.

## Bằng chứng/lệnh ban đầu

- `graphify --version` → `graphify 0.9.103`.
- `Test-Path graphify-out/needs_update` → false.
- `.codex/skills/graphify/SKILL.md` và mục `## Graphify` trong AGENTS.md đã tồn tại; `graphify --help` xác nhận lệnh `codex install` cập nhật AGENTS.md, do đó không chạy lại installer.
- `uv tool install --force --with watchdog graphifyy==0.9.103` → exit code 0; cài `watchdog==7.1.0` trong tool env, không thêm dependency vào app/repo.
- Lệnh watcher hợp lệ theo CLI source là `graphify watch .`; `graphify watch --help` trước đó chỉ in generic help.
- `graphify check-update .` khi marker tồn tại báo pending non-code changes và yêu cầu semantic update.
- `detect_incremental` thấy 792 file chưa có trong manifest code-only; semantic update task được giới hạn vào hai Markdown thay đổi (probe và AGENTS.md), không chạy trên corpus còn lại.
- `graphify watch .` chạy trong PowerShell với `watchdog==7.1.0`. Khi tạo probe code + Markdown, watcher gom 2 file, rebuild code graph thành 4.171 nodes / 11.421 edges / 155 communities và tạo `graphify-out/needs_update`.
- Khi marker tồn tại, `graphify check-update .` in pending non-code changes và hướng dẫn `/graphify --update`. Semantic worker đọc đủ 5 dòng probe Markdown; Graphify `build_merge` + `cluster` + `to_json` ghi thành công node semantic. `graphify explain "Graphify Codex Semantic Probe Concept"` xác nhận source Markdown.
- Sau sửa `AGENTS.md`, `graphify check-update .` xác nhận không có marker (watcher đã dừng). Semantic worker đọc đủ 108 dòng; Graphify merge ghi 12 node và 5 cạnh. `graphify explain "Graphify Codex Integration"` xác nhận node `AGENTS.md` và hai cạnh references.
- Để tránh chạy 792 tài liệu chưa index, semantic update chỉ xử lý probe Markdown và AGENTS.md đã thay đổi; đây là hai nguồn duy nhất của task.
- Tạo `graphify-out/watch-loop-probe.md` trong khi watcher chạy; sau 5 giây không có event/rebuild. File test được xóa.
- Xóa hai probe source, chạy `graphify update .` → exit code 0; graph còn 4.181 nodes, 11.425 edges, 164 communities. Graphify giữ 12 node từ `AGENTS.md` vì đây là non-code file còn trong scan.
- Sau code update, `graphify check-update .` → marker vắng; `graphify explain "Graphify Codex Integration"` còn kết quả; query code probe và explain Markdown probe đều báo không có node. Xác nhận hai probe source, output probe và chunk files không tồn tại.
- Semantic-index task hoàn chỉnh sau khi chuyển file sang completed (coverage đủ 84 dòng); Graphify merge thành công, một node trùng label được deduplicate; hai query `graphify explain` xác nhận đường dẫn task completed.
- Source evidence: `graphify/watch.py:3401` (`check_update`), `:3416` (`_notify_only` ghi `needs_update`), `:3521` (`watch`), `:3591` (loại `_GRAPHIFY_OUT`), `:3625` (gọi marker cho batch non-code). `cli.py:2817-2826` dispatch `graphify watch <path>`.
- Không có Graphify hook trong `.codex/hooks.json`; cài Codex hiện thực hiện bằng skill + hướng dẫn `AGENTS.md`. Watcher là process riêng và chỉ tự hoạt động khi Codex/user chạy `graphify watch .`.
- `git diff --check` không có lỗi whitespace; có warning line ending từ `MEMORY.md` đã dirty trước task. Không chạy test POS, migration, seed hoặc thao tác DB.

## Giới hạn và kết quả thực tế

- Tự động khi watcher đang chạy: AST rebuild với code changes; với Markdown, ghi marker `graphify-out/needs_update` và thông báo. Graphify watcher bỏ qua các đường dẫn nằm dưới `_GRAPHIFY_OUT`, đã xác minh bằng source và thử tạo file trong output.
- Không tự động: Codex config không khởi chạy watcher; sau Markdown watcher không semantic-extract. Codex cần kiểm tra marker, chạy semantic workflow, verify graph, rồi xóa marker.
- Graphify skill cleanup ở phiên bản cài đặt tham chiếu `.needs_update`, trong khi watcher tạo `needs_update` (không có dấu chấm); mục AGENTS mới chỉ rõ xử lý đúng tên marker.
- Graph ban đầu là code-only. Detector thấy 792 file chưa có trong manifest; chỉ xử lý Markdown thay đổi trong task. Các tài liệu/ảnh khác vẫn chưa được semantic-index.
- Graphify cảnh báo 454 file không có extractor và 1 file SQL thiếu `tree_sitter_sql`; không ảnh hưởng các probe đã kiểm tra.

## Bước tiếp theo

Không còn bước tiếp theo. Nội dung task đã semantic-index sau lần sửa cuối và không có thay đổi Markdown nào khác sau đó.
