---
id: 20261112-legacy-record-migration
status: completed
owner: Codex
started_at: 2026-11-12
completed_at: 2026-11-12
---

# Hợp nhất hồ sơ lịch sử vào devloopflow

## Mục tiêu và quyết định
- Người dùng chọn phương án 3 ngày 2026-11-12: đối chiếu và chuyển từng hồ sơ cũ sang cấu trúc plugin, giữ bản gốc để truy vết.
- Phạm vi: `specs/`, `plans/`, `tasks/`, `errors/`, `MEMORY.md`; giữ `qa-evidence/` tại chỗ vì các hồ sơ đang dẫn tới đó.
- Không đổi trạng thái nghiệm thu hay coi hồ sơ lịch sử là bằng chứng mới. `specs/` gốc vẫn là hợp đồng endpoint đã chốt; bản nhập vào plugin được ghi rõ là lịch sử.

## Trạng thái
- Đã kiểm kê: 12 spec, 20 plan hoàn tất, 68 task hoàn tất, 34 error gốc; root `MEMORY.md` có 11 bài học. Các thư mục active cũ chỉ có `.gitkeep`. Số đếm ban đầu gồm `.gitkeep` đã được sửa ở đây.
- Đã đọc `devloopflow:conventions`, skill migration và quy ước Graphify; đã kiểm tra `git status`, hiện có thay đổi chưa commit từ Sprint 08 và các hồ sơ plugin chưa được Git theo dõi.
- Đã nhập: 134 bản sao `legacy-*` (12 spec, 20 plan, 68 task, 34 error) vào cấu trúc plugin, giữ nguyên file gốc. `.devloopflow/LEGACY-MIGRATION.md` chứa 134 cặp đường dẫn và SHA-256 nguồn. Thêm 34 dòng vào `.devloopflow/errors/INDEX.md`; nhập 11 bài học cũ thành M-11..M-21 trong `.devloopflow/MEMORY.md`.
- Đã đổi hướng dẫn trong `AGENTS.md`, `CLAUDE.md`, `.devloopflow/devloopflow.md`, `README.md`, `docs/api-spec.md`, `.agents/skills/create-pos-spec/SKILL.md`: hồ sơ mới dùng plugin; hợp đồng endpoint cũ trong `specs/` vẫn là nguồn khi sửa chức năng cũ; QA gốc ở `qa-evidence/`.
- Đã xác minh 134 bản nhập khớp nội dung gốc sau khi đổi link tương đối và SHA-256, 34 lỗi có index, 11 bài học có cả dòng chỉ mục và khối chi tiết. 89 link được đổi đường dẫn, 2 link trỏ sai `active/` cũ đã được chuyển tới `completed/` trong bản nhập; không còn link tương đối thiếu đích trong bản nhập.
- Đã cập nhật Graphify có giới hạn cho 9 tài liệu chỉ dẫn/index, không trích xuất lại 134 bản sao vì nguồn gốc đã có trong graph. `graphify detect_incremental` thấy 220 tài liệu mới/thay đổi toàn repo, gồm nhiều file ngoài task, nên không chạy semantic extraction toàn bộ. Bản trích xuất nằm ở `graphify-out/semantic-legacy-20261112/extraction.json`; bản graph trước và audit ở thư mục cùng tên. Bản merge giữ các nút cũ của 9 nguồn, thêm 10 nút/14 cạnh, bỏ 36 nút chỉ dẫn cũ; sau `graphify cluster-only .`, graph chính có 8686 nút/17031 cạnh. `graphify query 'Legacy Migration Policy'` tìm thấy chính sách và bảng đối chiếu; marker `needs_update` đã gỡ sau xác minh.
- Bước tiếp theo: không có trong phạm vi chuyển hồ sơ. Khi sửa chức năng cũ, kiểm spec gốc và bản hiện hành; khi nghiệm thu, mở chứng cứ QA gốc trên máy local.

## Quy tắc bảo toàn và quay lại
- Không di chuyển hoặc xóa file gốc; không ghi đè file plugin hiện có.
- Bản nhập mới mang tiền tố `legacy-`, có đường dẫn nguồn và checksum; liên kết Markdown tương đối được đổi để trỏ đúng nguồn cũ. Hai link tới `active/` đã hết tồn tại được chuyển sang file `completed/` cùng tên trong bản nhập, ghi ở manifest.
- Có thể quay lại bằng cách ngừng sử dụng bản nhập và quy tắc điều hướng mới; chỉ xóa file được tạo bởi đợt này sau khi xác nhận đường dẫn cụ thể.

## File thay đổi
- 134 file `.devloopflow/**/legacy-*.md`; `.devloopflow/LEGACY-MIGRATION.md`; `.devloopflow/errors/INDEX.md`; `.devloopflow/MEMORY.md`.
- `AGENTS.md`, `CLAUDE.md`, `.devloopflow/devloopflow.md`, `README.md`, `docs/api-spec.md`, `.agents/skills/create-pos-spec/SKILL.md`.
- Không thay đổi file gốc trong `plans/`, `tasks/`, `errors/`, `MEMORY.md`, `qa-evidence/`; hai file `specs/sales.md`, `specs/shifts.md` đã dirty từ trước task này.

## Lệnh và kết quả
- Kiểm kê bằng `Get-ChildItem -Recurse -File`: `specs/` 12, `plans/` 22 gồm hai `.gitkeep`, `tasks/` 70 gồm hai `.gitkeep`, `errors/` 35 gồm một `.gitkeep`, `qa-evidence/` 3468.
- `git status --short`: repository dirty; `AGENTS.md` và hai spec gốc đã sửa, `.devloopflow/` và `CLAUDE.md` chưa được theo dõi.
- Python đối chiếu bản nhập với source và SHA-256: `PASS: 134 copies match source content, hashes and intended link redirects`; `PASS: 34 error index entries; 11 memory index/detail pairs`; `Relative links rebased: 89 redirected: 2 missing: 0`.
- `git diff --check` exit 0 (có cảnh báo LF→CRLF với file dirty cũ).
- Graphify `detect_incremental(Path('.'))`: 220 document mới/thay đổi; không chạy semantic extraction trên toàn bộ 220 vì có bản sao lịch sử và hồ sơ ngoài task.
- `graphify cluster-only .`: exit 0, xuất lại `GRAPH_REPORT.md`, `graph.json`, `graph.html`; bản JSON cuối có 8686 nút/17031 cạnh. `graphify query 'Legacy Migration Policy' --budget 350 --depth 1`: exit 0, thấy `Legacy Migration Policy` và `Legacy Migration Map` từ `.devloopflow/LEGACY-MIGRATION.md`.
- `graphify-out/needs_update`: đã gỡ sau khi graph JSON và query mới xác nhận nội dung nhập.

## Blocker
- Không có blocker đã biết. Kiểm tra nội dung trùng và liên kết trước khi kết luận.
