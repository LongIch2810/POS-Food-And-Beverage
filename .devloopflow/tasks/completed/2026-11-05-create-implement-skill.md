# Task: Tạo skill implement POS

**Trạng thái:** Hoàn tất; chuyển sang `tasks/completed/`. **Nhánh:** `feat/pb06-shifts`. **HEAD nền:** `1132f12`. **Plan:** Không có; task được yêu cầu trực tiếp bằng nội dung skill đã cung cấp trong hội thoại.

## Mục tiêu và phạm vi

Tạo `.agents/skills/implement/SKILL.md` để điều phối triển khai task POS sau khi plan đã duyệt theo vòng TDD → code-reviewer → QA. Giữ đúng nội dung người dùng đã chốt: xác nhận plan/spec; baseline Git; trích AC theo plan → spec → task; yêu cầu liên kết sprint; xác nhận DB test; TDD; review tối đa 3 vòng; QA hai tầng trạng thái; agent chính tái hiện FAIL trước khi ghi errors; phân biệt lỗi hành vi, thiếu bằng chứng và blocker; điều kiện hoàn tất/dừng.

Không sửa spec, plan, agent config hoặc skill khác. Không chạy test sản phẩm, migration, seed hoặc DB. Giữ nguyên các thay đổi bẩn/đã xóa trước task.

## Tiêu chí nghiệm thu

| AC | Nội dung | Nguồn | BR | Tiêu chí sprint | Cách chứng minh |
| --- | --- | --- | --- | --- | --- |
| AC-1 | Skill tồn tại tại `.agents/skills/implement/SKILL.md` với frontmatter `name`/`description` hợp lệ và đúng phạm vi sau khi plan được duyệt | Nội dung skill người dùng cung cấp; quy ước `skill-creator` | Không áp dụng | Skill được gọi cho task đã duyệt, không thay thế create-spec/plan | Đọc file và chạy validator cấu trúc skill |
| AC-2 | Hướng dẫn gồm chuẩn bị, TDD, review, QA, xử lý FAIL/NOT VERIFIED/BLOCKED, dừng và hoàn tất; ghi rõ mọi quy tắc đã chốt | Nội dung skill người dùng cung cấp trong hội thoại | Theo task cụ thể | Không tự kết luận PASS sprint; tiêu chí sprint phải được liên kết, mâu thuẫn/thiếu báo agent chính | Đối chiếu toàn file với nội dung yêu cầu |
| AC-3 | FAIL phải do agent chính tái hiện; chỉ lỗi tái hiện được mới ghi errors; nguyên nhân chỉ ghi khi xác minh; lỗi không tái hiện thì yêu cầu QA thêm bằng chứng | Chỉ dẫn bổ sung trực tiếp của người dùng | Theo task cụ thể | Chỉ QA sprint khi được giao | Đọc nhánh FAIL trong skill |

## Baseline

- `git status --short` ban đầu có nhiều thay đổi và xóa không thuộc task, gồm `.agents/subagents/*` đã bị xóa, `AGENTS.md`, `.codex/agents/qa.toml`, mã Sprint 05 và evidence chưa commit. Không chạm hoặc khôi phục các file đó.
- Đích `.agents/skills/implement/` chưa tồn tại theo khảo sát trước task; cần xác nhận lại trước khi tạo.
- Quy tắc liên quan: `AGENTS.md`, `rules/testing.md`; hướng dẫn tạo skill: skill hệ thống `skill-creator`.

## Tiến độ và kiểm tra

1. [x] Đọc skill-creator, kiểm tra repository và baseline.
2. [x] Tạo `.agents/skills/implement/SKILL.md` theo nội dung đã chốt, bổ sung yêu cầu agent chính tái hiện FAIL và chỉ ghi nguyên nhân đã xác minh.
3. [x] Đọc lại toàn file; kiểm tra frontmatter/UTF-8/mục bắt buộc bằng assertion chỉ đọc; `git diff --check` đạt. Validator `quick_validate.py` không chạy được vì môi trường thiếu module Python `yaml` (`ModuleNotFoundError`); không cài dependency.

**Bằng chứng/giới hạn:** file skill mới đã đọc lại; `quick_validate.py` bị chặn do thiếu PyYAML. Không chạy test ứng dụng, migration, seed hoặc DB. Các thay đổi dirty ngoài phạm vi được giữ nguyên.
