**Trạng thái:** hoàn tất triển khai và kiểm chứng local ngày01/11/2026; code review không còn finding, QA C01..C20 không còn gap trọng yếu trong scope.

# PB-13 — Cài đặt tổ chức

**Đối soát kết thúc 01/11/2026:** sau báo cáo QA readiness, Product Owner đã nghiệm thu local PB-04 + PB-13 tổ chức và [kết thúc Sprint 3](../../sprints/sprint-03/SPRINT.md#kết-luận-sprint-3--2026-11-01). Bước trình PO và câu “chưa nghiệm thu” bên dưới ghi trạng thái trước quyết định này; không còn task triển khai mở. Giới hạn CI/production/PB-06 giữ nguyên.

- Plan: `plans/completed/2026-10-30-pb13-organization-ui.md`; spec đã chốt `specs/organization-ui.md`.
- Nhánh: `feat/pb13-organization-ui`, HEAD/base `9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18`; dirty PB04 và PB13 được giữ nguyên, chưa có commit riêng. Không commit/push/merge.
- Đã hoàn tất: service/DTO10routes PB04 và shared HTTP cookie/CSRF/refresh/identity guard; Cài đặt3tab/API thật, validation và nullable fields, cursor/filter/branch choices đầy đủ, pending/error/offline/retry; role/status/reset/secret lifecycle; OWNER landing/routing/header thật riêng khỏi demo.
- Chức năng giữ scope: không đổi API/schema hoặc thêm dependency; chi nhánh inactive vẫn cấu hình theo API; không occupancy mock; không sửa profile/username/branch staff; quỹ sau ca PB06 deferred, các màn POS/ca/thực đơn/kho/báo cáo vẫn ghi dữ liệu mẫu.
- Ba lỗi triển khai đã red/green và có error records: active-tab invalidation gây kẹt loading, retry401 qua identity/store mới, render rows tab cũ với columns mới gây BigInt(undefined). Harness đã chạy callback cột thật để bắt lỗi cuối.
- UI bản cuối: `npm test`28/28 top-level TAP tests, typecheck/build exit0; có tests409/404/503 giữform/chỉ404reload, create/reset networkfail không replay, current identity, scopes, secret/self-reset và deferred responses.
- API bản cuối: `npm test` rerun48/48 TAP nodes (13top+35nested),0fail/skip/cancel,01/11/2026 20:40:44.7453429→20:43:07.4939125+07. Lần đầu47/48 do timeout khi DROP DB thử foundation; giữ raw/servercontext và errorrecord, không nới/bỏassert hoặc kết luận nguyên nhân sâu.
- Browser local: run30/10 có B32/B40..51 DB/mutations/2devices/selfreset/storage/copy; finalrun01/11 có N01..12,129networkrecords,105choices/6pages, currentbranch/perms/formclear, actualSQLreadrace, offline/error/retry, expiry1refresh, store suspend/reactivate/oldcookie và layout1024/768 keyboard. Phân biệt rõ lịch sử UI trước rowsKey và phần size-only được kiểm lại.
- Evidence cuối: `qa-evidence/20261101-203100-9ce75dd-pb13-final/run.md`, `audit.md`, `review.md`, commands/environment, UI logs28/API gzip48, browser-1/, readonly final-db.json và6manifests221entries. Gzip lossless raw/gzip/archive bytes được so khớp; privatecredentials ngoài repo, không lưu token/password thật trong artifact.
- Review: subagent code-reviewer đã rà mã/callers/spec/test và rehash; QA độc lập đọc ảnh/network/DB/rawlogs và đối chiếu C01..C20. Đây là đối chiếu bằng chứng local do agent chính chạy, chưa phải CI/runner độc lập.
- File đổi: POS_UI settings/form/validation, organizationService/sharedHTTP/authcontext/identity, navigation/AppShell/types/CSS, service/screen tests; spec/UI/design/README/architecture/techstack/Sprint/backlog, plan/task/errors/evidence. Mã và tài liệu PB04 có sẵn được giữ nguyên khi tích hợp; không stage chúng tự động.
- Kiểm tra: UI test/typecheck/build, API npmtest, browser CLI Chrome local (Playwright npmcache, không thêm package), SHA256/source/runtime/contract/tooling/artifact checks, image review, git diff --check và local link check cuối.
- Môi trường QA API3303/Vite5175 do task tạo đã dừng theo PID/command xác minh; sharedPostgreSQL/DB QA riêng giữ để tái hiện. Browser MCP không còn ở phiên mới nên dùng CLI, không dựng lại artifact.
- Blocker: không còn trong scope triển khai. Giới hạn: chưa CI/production, chưa quỹ sau ca PB06 và các lát cắt UI khác; chưa nghiệm thu Sprint3. Lần cleanup timeout đầu vẫn được ghi như giới hạn QA local, không gọi là lỗi production đã sửa.
- Bước tiếp theo cụ thể: trình Product Owner review/nghiệm thu Sprint3 dựa run/audit/spec; chỉ tích hợp/commit/push khi user yêu cầu. Không mở lại task này nếu không có finding mới.
