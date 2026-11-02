**Trạng thái:** hoàn tất triển khai và sửa gap API/DB, đã kiểm chứng local và QA đối chiếu ngày30/10/2026.

# PB-04 API/DB

**Đối soát kết thúc 01/11/2026:** UI PB-13 tổ chức, review và nghiệm thu local đã hoàn tất sau task API/DB này; [Sprint 3 đã kết thúc](../../sprints/sprint-03/SPRINT.md#kết-luận-sprint-3--2026-11-01). Các câu chờ UI/nghiệm thu bên dưới giữ mốc lịch sử30/10; không còn blocker API/DB mở. PB-06, CI/production vẫn chưa nằm trong nghiệm thu.

- Plan: `plans/completed/2026-10-30-pb04-organization-api.md`.
- Mục tiêu: API/DB chi nhánh, bàn, nhân viên theo kế hoạch đã chốt; không triển khai UI/ca/bán hàng.
- Nhánh: `feat/pb04-organization-api`; HEAD/base `9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18`, working tree dirty, chưa có commit PB-04 riêng.
- Đã hoàn tất: migration/entity/permission, API branches/dining-tables/users và dispatch hợp đồng platform; tenant/branch/current permission, validation/cursor, thu hồi phiên atomic; docs/spec/Swagger.
- Lịch sử kiểm tra: run cũ21/21 TAP nodes và CLI migration qua; audit sâu phát hiện AUD-01..05, mở lại plan/task. Theo yêu cầu “fix/tiếp tục”, bổ sung acceptance PostgreSQL thật, logger/commit/rollback, DB before-after,14 lịch khóa và SQL pagination/full traversal; sửa spec endpoint-specific. Giữ nguyên raw log lịch sử.
- Lỗi thật đã sửa: JOIN role trước khi chờ khóa user làm login401 sai hoặc reset/disable404 sai sau role update. Khóa ID theo scope trước, đọc quan hệ ở statement sau trong transaction; regression red/green được giữ.
- Kết quả cuối: `npm test` ngày30/10/2026 21:23:58.0263934→21:25:11.8251211+07, exit0,48 TAP nodes pass0fail/skip/cancel (13 top-level+35 nested). CLI wrapper first/repeat exit0; lần thử Docker chưa chạy thất bại được giữ, không tính là pass.
- Bằng chứng: `qa-evidence/20261030-202325-9ce75dd-pb04-gap-fix/run.md`, `full-2.log.gz`, `commands.log`, `migration-cli-2.log`, `audit.md`, `review.md`. Source66/runtime64/contract9 và7 log gzip SHA256 được rehash khớp; nén lossless raw bytes, bản raw lớn ngoài repo.
- Review/QA: code-reviewer không còn finding trong phạm vi rà; QA đối chiếu từng AC/E/P/M/D và đóng AUD-01..05 trong scope API/DB. Đây là đọc lại bằng chứng local do agent chính chạy, chưa phải CI/runner độc lập.
- File đã đổi: auth.service login; organization/users modules và tests; migration/data-source/entities, guard/platform dispatch, helper validation/docs; specs organization/users/platform, tài liệu/API/schema/architecture; plan/task/errors/evidence/Sprint3. Git status là danh sách đầy đủ; giữ tài liệu Sprint3/backlog chưa commit từ task trước.
- Kiểm tra cuối: build trong npm test, migration first/repeat, manifest rehash, gzip decompression/hash và `git diff --check`. Không tự commit/push/merge.
- Blocker: không còn trong phạm vi sửa đã thống nhất. UI/PB-13, khóa quỹ sau ca/PB-06, production và CI chưa xác minh; không tick nghiệm thu Product Owner/Sprint3.
- Bước tiếp theo cụ thể: triển khai UI PB-13 tổ chức theo Sprint3, kiểm UI/browser trên bản cuối rồi trình review/nghiệm thu; không cần mở lại task API/DB này nếu không có finding mới.
