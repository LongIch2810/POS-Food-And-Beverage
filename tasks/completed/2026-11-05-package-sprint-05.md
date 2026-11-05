# Task: Đóng gói hồ sơ Sprint 05

**Trạng thái:** Hoàn thành, chuyển `tasks/completed/`. **Nhánh:** `feat/pb06-shifts`. **HEAD nền:** `1132f12a447058e6ace8cb8fb87dc6877763ee5d`. **Plan liên quan:** `plans/completed/2026-11-03-sprint-05-shifts.md`. **Nguồn yêu cầu:** người dùng yêu cầu hoàn tất đóng gói Sprint 05 sau khi chấp nhận đủ điều kiện thu hoạch nghiệm thu local.

## Mục tiêu và phạm vi

Đối chiếu hồ sơ QA cuối với tiêu chí Sprint, ghi quyết định kết thúc Sprint 05 ở mức local, cập nhật các tài liệu chỉ trạng thái dự án, lập gói bàn giao có danh mục file và giới hạn kiểm chứng. Không thay đổi source hay raw QA artifact trong lượt đóng gói. Không tự gộp các thay đổi ngoài phạm vi vào commit, không push/merge.

## Baseline bảo vệ working tree

`git status --short` khi bắt đầu: `.agents/subagents/{README,code-reviewer,explorer,qa}.md` bị xóa; `.codex/agents/qa.toml`, `AGENTS.md`, `MEMORY.md`, nhiều file `POS_API/src/shifts/`, `POS_UI/src/` và `sprints/sprint-05/SPRINT.md` đã modified; `.agents/skills/implement/`, test UI, errors/, qa-evidence/ và các task completed là untracked. Các thay đổi này có sẵn trước lượt đóng gói; chỉ sửa `sprints/sprint-05/SPRINT.md`, `docs/PRODUCT_BACKLOG.md`, `README.md` và file task này sau khi đối chiếu. Không reset/stash/clean.

## Tiêu chí hoàn thành và bằng chứng

| AC | Nguồn | Nội dung | Cách chứng minh | Trạng thái |
| --- | --- | --- | --- | --- |
| PKG-1 | `sprints/sprint-05/SPRINT.md`; QA Sprint 05 | 19/19 tiêu chí Sprint có kết luận QA local và artifact đọc được | `qa-evidence/20261105-212738-1132f12-sprint05-qa-independent/sprint05-criteria.md`; browser cuối và log test | PASS: 19 dòng QA và 19 ô Sprint; 0 link gãy trong hồ sơ kiểm |
| PKG-2 | `AGENTS.md`, mẫu Sprint 03 | Sprint 05 ghi ngày kết thúc, quyết định nghiệm thu, review, retrospective và deferred đúng phạm vi | Nội dung Sprint 05 sau cập nhật | PASS: `sprints/sprint-05/SPRINT.md` mục Kết luận đóng Sprint 05 |
| PKG-3 | `docs/PRODUCT_BACKLOG.md`, `README.md` | Trạng thái dự án không còn nói Sprint 05 chỉ sẵn sàng nghiệm thu hoặc màn Ca làm còn mock | Diff tài liệu | PASS: hai tài liệu cập nhật trạng thái nghiệm thu local và ranh giới POS mock |
| PKG-4 | `rules/git.md`, `AGENTS.md` | Hồ sơ Sprint nêu bằng chứng, baseline dirty, giới hạn CI/production và không lẫn việc ngoài scope | `SPRINT.md`, QA matrix và `git diff --check` | PASS: nội dung kết luận/retrospective trong Sprint, QA matrix 19 tiêu chí, `git diff --check` exit 0 |

## Các bước

1. [Hoàn tất] Đọc QA matrix 19 tiêu chí, các run cuối và Git để xác nhận trạng thái; xác nhận metadata của backend/frontend/browser exit 0, HEAD nền và dirty tree, DB thử khác DB base.
2. [Hoàn tất] Ghi kết luận Sprint, ngày kết thúc 05/11, review, retrospective và việc chuyển tiếp vào `SPRINT.md`.
3. [Hoàn tất] Đồng bộ product backlog, README và lập kết luận/retrospective ngay trong `sprints/sprint-05/SPRINT.md`. File `CLOSURE.md` và `source-manifest.sha256` từng được tạo trong lượt đóng gói, sau đó đã gỡ theo yêu cầu người dùng trước khi commit.
4. [Hoàn tất] Kiểm 19 dòng QA, 19 ô Sprint, 0 link gãy trong tài liệu hiện hành, `git diff --check` exit 0. Không chạy lại test vì chỉ sửa tài liệu; giữ nguyên raw evidence và source đã QA.

**File còn trong gói:** `sprints/sprint-05/SPRINT.md`, `docs/PRODUCT_BACKLOG.md`, `README.md`, file task này. **Lệnh kiểm tra đã chạy:** `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git diff --check` (exit 0), script đọc link Markdown (0 gãy), đếm dòng QA/Sprint (19/19). Script SHA-256 từng kiểm 16/16 source/test trước khi người dùng yêu cầu bỏ file manifest. **Bước tiếp theo cụ thể:** khi tích hợp, xem diff, stage đúng phạm vi, review trước merge và chạy CI trên SHA đã commit. **Blocker/câu hỏi:** không có blocker nghiệm thu local; CI/production chưa xác minh và không nằm trong quyết định đóng sprint.
