---
id: 20261112-retire-legacy-root-records
status: completed
owner: Codex
started_at: 2026-11-12
completed_at: 2026-11-12
---

# Chuyển hướng dẫn và ngừng dùng các thư mục hồ sơ cũ ở root

## Yêu cầu
- User ngày 2026-11-12: AGENTS.md và CLAUDE.md dùng đường dẫn devloopflow; mô tả rõ vai trò của devloopflow, Graphify, Caveman, Ponytail và mục tiêu giảm chi phí; cập nhật README.md; xóa các thư mục cũ khi đã cũ và không còn sử dụng.
- Thư mục cũ đang xét: specs/, plans/, tasks/, errors/, qa-evidence/ và file MEMORY.md. Không gồm .devloopflow/verify/ vì đó là vị trí plugin đang dùng.
- Quy tắc bảo vệ source ở AGENTS.md yêu cầu liệt kê đường dẫn tuyệt đối, kiểm phạm vi, nêu tác động và được user phê duyệt cụ thể trước khi xóa đệ quy. Chưa xóa gì.

## Baseline đã kiểm
- specs/: 12 file, 11 theo dõi Git, 1 chưa theo dõi; plans/: 22 file; tasks/: 70 file, có 1 file chưa theo dõi; errors/: 35 file.
- qa-evidence/: 3.468 file, 1.462.566.771 byte; 116 báo cáo Markdown được Git theo dõi, phần còn lại chủ yếu raw artifact local.
- Các bản nhập lịch sử đã có trong .devloopflow/: 12 spec, 20 plan, 68 task, 34 error; 11 bài học trong .devloopflow/MEMORY.md. QA raw 3.468 file đã sao chép vào .devloopflow/verify/legacy-qa-evidence/evidence/ và so SHA-256 ở task trước.
- Quét Markdown ngoài thư mục cũ và bản sao legacy: 278 liên kết đang trỏ về nhóm cũ (33 specs, 30 plans, 91 tasks, 53 errors, 71 qa-evidence); 134 trong đó thuộc bảng đối chiếu lịch sử.
- Git worktree đang dirty từ Sprint 08; không khôi phục hay ghi đè thay đổi khác.

## Kế hoạch và cổng xóa
1. Cập nhật AGENTS.md, CLAUDE.md, README.md để chỉ đường dẫn plugin, mô tả 4 công cụ và giới hạn tiết kiệm chi phí.
2. Chuyển bản gốc hồ sơ nhỏ vào kho lưu trữ trong plugin và báo cáo Markdown QA đang theo dõi Git sang vị trí versioned ngoài evidence/; giữ raw local trong evidence/ đã có.
3. Đổi liên kết điều hướng còn dùng tới vị trí mới, kiểm link và checksum. Giữ văn bản lịch sử khi có thể; đường dẫn gốc trong báo cáo cũ được giải thích bằng bảng ánh xạ.
4. Chuẩn bị danh sách đường dẫn tuyệt đối và tác động xóa; chỉ xóa đệ quy sau phê duyệt cụ thể của user. Không coi yêu cầu chung là phê duyệt cho lệnh xóa nguy hiểm.
5. Sau khi xóa được duyệt: kiểm lại tập file, link, Git ignore, Graphify; đóng task. Nếu chưa được duyệt, để task active với bước chờ rõ ràng.

## Trạng thái
- Đã cập nhật AGENTS.md, CLAUDE.md và README.md: đường dẫn làm việc mới dùng `.devloopflow/`; nêu vai trò Devloopflow, Graphify, Caveman, Ponytail và giới hạn của tuyên bố giảm chi phí. AGENTS.md và CLAUDE.md bằng nhau theo byte.
- Đã chuyển nguyên byte 140 file thuộc `specs/`, `plans/`, `tasks/`, `errors/`, `MEMORY.md` vào `.devloopflow/legacy-originals/`; `SOURCE-MANIFEST.json` ghi SHA-256. Kiểm lại 2026-11-12: 140/140 source và archive bằng nhau theo byte, 0 sai khác. Bản nhập `legacy-*` trong plugin vẫn giữ riêng để tra cứu.
- Đã sao 116 báo cáo Markdown QA được Git theo dõi vào `.devloopflow/verify/legacy-qa-evidence/reports/` và chuyển 836 liên kết tương đối; kiểm tra 0 liên kết hỏng trong báo cáo. Raw QA 3.468 file và manifest nằm trong `.devloopflow/verify/legacy-qa-evidence/evidence/qa-evidence/`, chỉ local; lần đối chiếu SHA-256 trước đó không có sai khác. Tạo `REPORTS-INDEX.md`, cập nhật `INDEX.md` và `EVIDENCE-INDEX.md`.
- Đã chuyển 181 liên kết trong 134 bản nhập `legacy-*`, 134 liên kết trong bảng `.devloopflow/LEGACY-MIGRATION.md`, và 131 liên kết lịch sử ở các file sạch về bản lưu mới. Đã cập nhật `.devloopflow/devloopflow.md`, `.devloopflow/QA-EVIDENCE.md`, `docs/api-spec.md` và skill create-pos-spec để công việc mới dùng plugin. `git diff --check` exit 0; chỉ có cảnh báo line ending CRLF.
- Còn 9 liên kết Markdown tới folder gốc trong 6 file đang dirty hoặc untracked từ Sprint 08: `DESIGN.md` (1), `docs/BUSINESS_RULES.md` (1), `docs/DESIGN_DB_POS_SYSTEM.md` (1), `docs/PRODUCT_BACKLOG.md` (3), `docs/PRODUCT_OVERVIEW.md` (1), `sprints/sprint-08/SPRINT.md` (2). Quy tắc bảo vệ source ở AGENTS.md yêu cầu dừng sửa các file đích có thay đổi khác; cần user cho phép sửa đúng 9 liên kết, giữ nguyên mọi nội dung khác.
- Đích xóa sau khi được duyệt cụ thể và kiểm lại checksum/link: `D:\saved\Project\POS-F&B\specs`, `D:\saved\Project\POS-F&B\plans`, `D:\saved\Project\POS-F&B\tasks`, `D:\saved\Project\POS-F&B\errors`, `D:\saved\Project\POS-F&B\qa-evidence`, `D:\saved\Project\POS-F&B\MEMORY.md`. Tất cả đã Resolve-Path nằm trong workspace; 5 thư mục không phải reparse point. Xóa `qa-evidence/` bỏ bản local gốc khoảng 1,46 GB nhưng bản sao raw ở plugin còn; 116 báo cáo versioned đã sao; các file root chưa commit giữ bản chính xác trong plugin.
- Chưa xóa source hoặc artifact. Phạm vi và bước tiếp theo đã được user điều chỉnh; xem cập nhật bên dưới.

## Cập nhật sau chỉ đạo mới của user
- User chỉ yêu cầu xóa bốn thư mục root `errors/`, `plans/`, `tasks/`, `qa-evidence/` và dùng bản trong `.devloopflow/`. Không xóa `specs/` hoặc `MEMORY.md`.
- Đã kiểm lại trước xóa: 127 file errors/plans/tasks khớp SHA-256 với `.devloopflow/legacy-originals/`; 3.468 file QA khớp SHA-256 cả bản nguồn lẫn bản sao `.devloopflow/verify/legacy-qa-evidence/evidence/qa-evidence/`; không có file thiếu/thừa, không có reparse point trong bốn thư mục.
- Đã chuyển các liên kết Markdown còn trỏ tới bốn thư mục trong `docs/PRODUCT_BACKLOG.md`, `sprints/sprint-08/SPRINT.md`, `specs/inventory.md`, `specs/promotions.md`, `specs/shifts.md`; quét lại không còn liên kết Markdown tới bốn root path ngoài bản lưu. `git diff --check` cho các file này exit 0.
- Lệnh PowerShell `Remove-Item -LiteralPath $target -Recurse -Force` với kiểm tra absolute path trong workspace bị lớp chặn lệnh tự động từ chối trước khi chạy (`rejected: blocked by policy`). Kiểm tra lại: cả bốn thư mục vẫn tồn tại, chưa file nào bị xóa. Không thử cú pháp hay công cụ khác để lách lớp chặn.
- Trạng thái: blocked ở bước xóa bốn thư mục. `.gitignore` vẫn giữ rule root QA vì folder còn tồn tại. Graphify có `needs_update` do Markdown đã đổi; semantic update chưa làm trong lúc chờ quyết định về xóa. Bước tiếp theo: user tự xóa bốn thư mục bằng thao tác ngoài agent hoặc thay đổi chính sách chặn hợp lệ; sau đó kiểm lại link, Git status, `.gitignore`, cập nhật Graphify và đóng task.

## Cập nhật Graphify theo yêu cầu user
- Ngày 2026-11-12, `graphify update .` exit 0: AST quét incremental, không thấy thay đổi topology code cần ghi; CLI nêu tài liệu vẫn cần semantic update.
- Semantic extraction có kiểm đủ dòng cho 10 tài liệu workflow/verify hiện hành; loại bản sao `legacy-*` và raw QA để tránh trùng nội dung. Bản graph staging có 8.745 node, 17.121 cạnh, 0 cạnh thiếu đầu mút; 9 node chỉ dẫn QA root cũ được bỏ. Query staging thấy các node Devloopflow, Graphify, Caveman, Ponytail mới.
- Graph chính, report, HTML và manifest đã được thay bằng bản staging sau khi đối chiếu SHA-256 của 10 nguồn; query graph chính exit 0 và kiểm node/edge xác nhận 8.746 node, 17.122 cạnh, 0 cạnh thiếu đầu mút, 10/10 nguồn được stamp semantic. Xóa đúng marker `needs_update` sau kiểm chứng này. Bốn folder root vẫn tồn tại do lệnh xóa bị policy chặn; graph ghi rõ sự thật này. Khi chúng được xóa thực tế, cần update graph lần nữa để phản ánh trạng thái mới.

## Hoàn tất xóa (2026-11-12, user duyệt cụ thể)
- User duyệt xóa bốn thư mục: `D:\saved\Project\POS-F&B\errors`, `plans`, `tasks`, `qa-evidence` ("không dùng nữa"). `specs/` và `MEMORY.md` giữ nguyên.
- Kiểm ngay trước xóa (script so SHA-256, local do agent chạy): plans 22/22, tasks 70/70, errors 35/35 khớp `.devloopflow/legacy-originals/`; qa-evidence 3.468/3.468 khớp `.devloopflow/verify/legacy-qa-evidence/evidence/qa-evidence/`, 0 thiếu, 0 lệch.
- Đã xóa bằng `rm -r` từng đường dẫn tuyệt đối; kiểm lại 4 thư mục không còn, kho lưu còn 3.468 file QA và 142 file legacy-originals.
- Đã gỡ rule `/qa-evidence/**` khỏi `.gitignore` gốc vì thư mục không còn.

## Cập nhật sau chỉ đạo của user (2026-11-12): bỏ legacy-originals
- User không muốn lưu bản gốc trong `legacy-originals/` mà đặt vào thư mục cùng tên với thư mục gốc cũ.
- Đã chuyển nguyên byte 134 file (12 spec, 20 plan, 68 task, 34 error) vào `.devloopflow/specs|plans|tasks|errors/` giữ nguyên tên, xóa 134 bản `legacy-*` mà chúng thay thế. SHA-256 từng file khớp `.devloopflow/LEGACY-SOURCE-MANIFEST.json` (135 mục gồm MEMORY, 0 lệch; bỏ 5 mục `.gitkeep`).
- MEMORY.md gốc ở `.devloopflow/LEGACY-MEMORY.md`. Thư mục `.devloopflow/legacy-originals/` đã xóa (rỗng sau khi chuyển).
- Đã đổi tham chiếu ở 21 file tài liệu (AGENTS.md, CLAUDE.md, README.md, docs, sprints, LEGACY-MIGRATION.md, errors/INDEX.md).
- Hạn chế đã biết: link tương đối trong các file gốc đúng byte (68 link, vd `../qa-evidence/`, `../sprints/`, `docs/`) không còn trỏ đúng vì file đã đổi vị trí; không sửa để giữ nguyên byte. Cần tra qua `LEGACY-MIGRATION.md` và `verify/legacy-qa-evidence/`.
- Lệnh kiểm: script so SHA-256 theo manifest và quét link (local do agent chạy, chưa có CI độc lập).

## Đổi tên theo quy ước plugin (2026-11-12, theo yêu cầu user)
- Quy ước plugin: `<id>.md` với id `YYYYMMDD-slug` (`.devloopflow/` conventions). Đã đổi 122 file ở `plans/completed/`, `tasks/completed/`, `errors/` từ `YYYY-MM-DD-slug.md` sang `YYYYMMDD-slug.md`; nội dung không đổi, SHA-256 khớp `LEGACY-SOURCE-MANIFEST.json` (135 mục, 0 lệch; cột `source` giữ tên cũ, `archive` là tên mới).
- Đã đổi tham chiếu tên file ở 34 file tài liệu không thuộc nhóm đúng byte. Link nội bộ giữa các file gốc đúng byte (80 link tương đối hỏng, gồm 68 do đổi vị trí và 12 do đổi tên) không sửa để giữ nguyên byte.
- 12 spec (`auth.md`, `foundation.md`, ...) giữ tên vì không có ngày trong tên, chưa đổi sang id có ngày.

## Hoàn tác hai bước trên (2026-11-12, user: "đổi hết lại t thấy ko hợp lí rồi đó")
- Hai mục trước ("bỏ legacy-originals" và "đổi tên theo quy ước plugin") đã bị hoàn tác theo lựa chọn của user "Hoàn tác cả đổi tên và việc bỏ legacy-originals". Trạng thái hiện hành là trạng thái trước hai mục đó.
- Hiện hành: 135 file đúng byte trong `.devloopflow/legacy-originals/` (kèm `SOURCE-MANIFEST.json`, `README.md`, `MEMORY.md` gốc), tên dạng `YYYY-MM-DD-ten.md`; 134 bản nhập `legacy-*` trong `.devloopflow/specs|plans/completed|tasks/completed|errors/`.
- Hạn chế: các bản nhập `legacy-*` cũ đã bị xóa ở bước "bỏ legacy-originals" và không có sao lưu, nên 134 bản hiện tại là bản SINH LẠI bằng script từ bản gốc (sửa link tương đối, thêm đoạn chú thích cuối file theo mẫu cũ), không phải bản cũ đúng từng byte. Kiểm chứng: số link đã sửa của từng file khớp cột "Relative links rebased" trong `.devloopflow/LEGACY-MIGRATION.md` (134/134), 0 link không tìm được đích. Chưa so được từng byte với bản cũ vì bản cũ không còn.
- Kiểm tra sau hoàn tác (script local do agent chạy): SHA-256 135/135 khớp manifest; không còn file gốc không tiền tố ngoài `legacy-originals/`; 3 link tương đối hỏng còn lại đều ở `.devloopflow/verify/20261109-sprint08-payment/sync-docs-proposals-1.md` (đã có từ trước).
- Bài học đã ghi vào `.devloopflow/MEMORY.md` (M-22 đến M-25).

## Bỏ kiểu đặt legacy (2026-11-12, user: "xóa bỏ kiểu đặt legacy"; chọn "Bản đúng byte, tên gốc, không tiền tố")
- Trạng thái hiện hành thay cho hai mục "Hoàn tác" và "bỏ legacy-originals" ở trên: 134 file đúng byte (12 spec, 20 plan, 68 task, 34 error) nằm trong `.devloopflow/specs|plans/completed|tasks/completed|errors/`, giữ tên gốc `YYYY-MM-DD-ten.md`, không tiền tố. Đã xóa 134 bản nhập `legacy-*` (sinh lại ở bước hoàn tác) và thư mục `.devloopflow/legacy-originals/`.
- MEMORY.md gốc ở `.devloopflow/LEGACY-MEMORY.md`; manifest ở `.devloopflow/LEGACY-SOURCE-MANIFEST.json` (135 mục, `archive` là vị trí mới). Không đổi tên sang `YYYYMMDD-`.
- Kiểm (script local do agent chạy): SHA-256 135/135 khớp manifest; 0 tham chiếu còn tới `legacy-originals` hay `legacy-<tên hồ sơ>` ngoài file task này; link tương đối hỏng: 68 trong chính các file đúng byte (đổi vị trí, không sửa để giữ byte) và 3 sẵn có ở `.devloopflow/verify/20261109-sprint08-payment/sync-docs-proposals-1.md`.
- Còn tên chứa legacy ngoài phạm vi lựa chọn này: `LEGACY-MIGRATION.md`, `LEGACY-MEMORY.md`, `LEGACY-SOURCE-MANIFEST.json`, `verify/legacy-qa-evidence/`, ba task `20261112-legacy-*`/`retire-legacy-*`.

## Gộp legacy-qa-evidence vào cấu trúc plugin (2026-11-12, user: "đã nói là tuân theo plugin ko tự đặt tên giữ tên gốc legacy-qa-evidence bỏ folder này")
- 133 lần chạy QA cũ chuyển thành `.devloopflow/verify/<tên lần chạy gốc>/`: báo cáo Markdown đã theo dõi Git ở thư mục chính (115 báo cáo, link tương đối sửa lại, 759 link, 0 link không tìm được đích), toàn bộ file raw (kể cả bản đúng byte của báo cáo) trong `.devloopflow/verify/<tên>/evidence/` (bị `.devloopflow/.gitignore` chặn) kèm `SHA256SUMS`. `qa-evidence/README.md` thành `.devloopflow/verify/README.md`; `.s7-sprint-qa-path` vào `evidence/` của lần chạy `20261107-204250-5ada010f-s7-sprint-qa`; `.gitkeep` bỏ.
- Kiểm (script local do agent chạy): SHA-256 3.468/3.468 khớp manifest trước khi di chuyển; sau di chuyển kiểm lại 3.466/3.466 file theo `SHA256SUMS` (không tính README.md và `.gitkeep`), 0 lệch. `EVIDENCE-INDEX.md` được viết lại thành bảng 133 lần chạy.
- Tham chiếu: 11 tài liệu có đường dẫn `legacy-qa-evidence/...` đã đổi sang `verify/<tên>/...`; câu mô tả trong AGENTS.md, CLAUDE.md, devloopflow.md, QA-EVIDENCE.md, LEGACY-MIGRATION.md đã sửa. Hai task lịch sử `20261112-legacy-evidence-migration.md` và file này còn nhắc tên cũ vì là ghi chép của thời điểm đó.
- CHƯA XÓA `.devloopflow/verify/legacy-qa-evidence/`: lệnh `rm -r` bị lớp an toàn của Claude Code chặn và user chưa duyệt. Thư mục chỉ còn file đã được thay thế: `INDEX.md`, `REPORTS-INDEX.md`, `reports/` (116 bản báo cáo link cũ), `evidence/manifest.json` (đã có bản sao ở thư mục tạm của phiên và `SHA256SUMS` trong từng lần chạy), cùng các thư mục rỗng. Bước tiếp: user tự xóa hoặc duyệt xóa đúng đường dẫn `D:\saved\Project\POS-F&B\.devloopflow\verify\legacy-qa-evidence`.

## Xóa các file LEGACY và thư mục legacy-qa-evidence (2026-11-12, user: "xóa hết đi bởi vì có cần nữa đâu")
- Đã xóa `.devloopflow/LEGACY-MIGRATION.md`, `.devloopflow/LEGACY-MEMORY.md`, `.devloopflow/LEGACY-SOURCE-MANIFEST.json` (bản sao nằm trong thư mục tạm của phiên, ngoài repo) và thư mục `.devloopflow/verify/legacy-qa-evidence/` (chỉ còn `INDEX.md`, `REPORTS-INDEX.md`, `reports/`, `evidence/manifest.json`, đều đã được thay thế).
- Tham chiếu trong AGENTS.md, CLAUDE.md, README.md, `.devloopflow/devloopflow.md`, `.devloopflow/MEMORY.md` đã gỡ. Các mục cũ ở trên nhắc tới những file này là ghi chép lịch sử. Từ giờ không còn bảng ánh xạ hay manifest SHA-256 của hồ sơ cũ; SHA-256 QA cũ còn trong `verify/<tên>/evidence/SHA256SUMS`.
