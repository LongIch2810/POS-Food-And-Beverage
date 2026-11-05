# Task: Commit và push gói Sprint 05

**Trạng thái:** Hoàn thành sau push các commit Sprint 05 và CI thành công; chuyển `tasks/completed/`. **Nhánh:** `feat/pb06-shifts`. **HEAD nền:** `1132f12a447058e6ace8cb8fb87dc6877763ee5d`. **Upstream:** `origin/feat/pb06-shifts`, trước khi commit đã `git fetch` và chênh lệch 0/0. **Nguồn yêu cầu:** người dùng yêu cầu “commit push” ngay sau khi đóng gói Sprint 05.

## Mục tiêu và phạm vi

Đưa thay đổi source/test Sprint 05 sau code review, QA và hồ sơ đóng Sprint lên đúng nhánh hiện tại. Stage từng đường dẫn thuộc Sprint 05 sau khi kiểm diff, kiểm bí mật/artifact và test đã chạy. Giữ nguyên các thay đổi về AGENTS, cấu hình subagent/skill và các file ngoài Sprint 05. Không merge hay force-push.

## Baseline working tree

`git status --short` trước khi stage có 4 file `.agents/subagents/*.md` bị xóa; `.codex/agents/qa.toml`, `AGENTS.md`, `MEMORY.md` modified; `.agents/skills/implement/` và `tasks/completed/2026-11-05-create-implement-skill.md` untracked. Đây là thay đổi ngoài commit Sprint 05. Source Sprint 05 trong `POS_API/src/shifts/`, `POS_UI/src/` và test UI đang modified/untracked; hồ sơ Sprint 05, errors, qa-evidence, README/backlog và task completed liên quan cũng dirty/untracked. Không reset, clean hoặc stash.

## Tiêu chí và bằng chứng

| AC | Điều kiện hoàn thành | Bằng chứng | Trạng thái |
| --- | --- | --- | --- |
| PUB-1 | Chỉ stage thay đổi Sprint 05, không stage file ngoài scope | `git diff --cached --name-status`, danh sách file thực tế | PASS: code/test 16 file; tài liệu 7 file và evidence 201 file, 0 đường dẫn ngoài scope; AGENTS/cấu hình agent/skill giữ nguyên |
| PUB-2 | Artifact được chọn không có secret/log lớn, đủ link QA | scan file, kiểm link và kích thước; không đưa manifest riêng theo yêu cầu mới | PASS: 0 marker secret trong artifact text/log/nén được chọn; 0 link Markdown gãy; bốn log backend thô ~23 MB mỗi file không stage, bản `.gz` nguyên vẹn có trong commit |
| PUB-3 | Commit hợp lệ trên nhánh hiện tại, remote fast-forward, không force | SHA commit và `git push origin feat/pb06-shifts` exit 0 | PASS: `3d3c152` code/test và `43021ea` tài liệu/evidence đã push; remote khớp `43021ea6d2d155a017eafc1062e5b944189cdc0f` |
| PUB-4 | Báo lại CI nếu workflow chạy hoặc nêu rõ chưa xác minh | URL/ID CI hoặc trạng thái quan sát được | PASS: [GitHub Actions 42054066654](https://github.com/LongIch2810/POS-Food-And-Beverage/actions/runs/42054066654) trên `43021ea` completed success; backend và frontend đều success |

## Các bước

1. [Hoàn tất] Kiểm nhánh, upstream, working tree; `git fetch origin feat/pb06-shifts` exit 0, chênh HEAD/upstream 0/0.
2. [Hoàn tất] Đọc diff source/test, 8 thư mục evidence, kích thước và dấu hiệu secret; loại bốn log thô lớn, dùng bản `.gz` đã có trong run. Kiểm các link trong 16 file Markdown được stage: 0 thiếu, 0 trỏ tới file không có trong index. Hai file người dùng yêu cầu gỡ không còn trên đĩa hay trong commit.
3. [Hoàn tất] Stage 16 file code/test để commit `3d3c152` (`fix(shifts): address review and acceptance findings`); stage 7 tài liệu và 201 artifact để commit `43021ea` (`docs(sprint): publish Sprint 05 local QA evidence`). Cached diff code và tài liệu không lỗi whitespace; raw browser text có tab/khoảng trắng gốc nên `git diff --cached --check` toàn bộ báo trailing whitespace ở artifact, giữ nguyên raw.
4. [Hoàn tất] `git push origin feat/pb06-shifts` exit 0, remote xác nhận SHA `43021ea6d2d155a017eafc1062e5b944189cdc0f`. GitHub Actions run `42054066654` completed success trên SHA này, hai job backend/frontend success. Sprint ghi lại link CI. Không merge.

**File đã đổi trong lượt publish:** `sprints/sprint-05/SPRINT.md` (ghi commit/CI), file task này; các file code/test/docs/evidence được stage theo hai commit nêu trên. **Lệnh đã chạy:** `git status`, `git fetch`, `git diff`/`git diff --cached`, kiểm link và marker secret bằng script đọc file, `git commit` hai lần, `git push`, `git ls-remote`, `gh run watch/view`. **Bước tiếp theo sau task:** đưa nhánh ra review trước khi merge; nếu cần xác nhận production thì thực hiện quy trình riêng. Không còn bước code/QA Sprint 05 đang chờ trong task này. **Blocker:** không có cho commit/push; chưa merge và chưa kiểm production.

**Điều chỉnh phạm vi theo yêu cầu người dùng:** gỡ `sprints/sprint-05/CLOSURE.md` và `sprints/sprint-05/source-manifest.sha256` khỏi workspace trước commit; không stage hai file này. Đồng thời bỏ liên kết trỏ tới chúng trong README và Sprint, cập nhật task đóng gói để phản ánh trạng thái sau khi gỡ.
