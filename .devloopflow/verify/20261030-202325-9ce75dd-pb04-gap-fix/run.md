# PB-04 — bổ sung kiểm chứng AUD-01..05

**Trạng thái:** hoàn tất sửa và kiểm chứng API/DB; QA đóng AUD-01..05, code review không còn finding trong scope. Local do agent chạy, không CI độc lập, chưa nghiệm thu Product Owner.

- Nhánh feat/pb04-organization-api; full HEAD/base9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18; working tree dirty, mã PB-04 chưa commit.
- Môi trường: Windows PowerShell, Node22, PostgreSQL17 Docker; dùng .env riêng hiện có, không ghi giá trị secret. Test tạo DB QA ngẫu nhiên riêng, không áp migration hoặc ghi vào DB ứng dụng của người dùng.
- Giữ nguyên run cũ và audit làm lịch sử; artifact mới phải do runner thực sinh, không viết lại response/log từ trí nhớ.

## Ma trận trước khi chạy

| Gap | Tình huống cần chạy | Artifact sẽ lưu |
| --- | --- | --- |
| AUD-01 | cùng-store A1/A2 + storeB, đủ route/permission, branch/permission hiện hành, force-change, user/store disabled/suspended | acceptance runner stdout chứa HTTP method/path/requestId/status + response che secret và DB readonly before/after; các case ACC-SCOPE/AUTH |
| AUD-02 | reset active hai thiết bị, old/new HTTP login+refresh, reset lặp/rollback, ép hai lịch user-row lock cho reset↔login/refresh | ACC-RESET/ACC-RACE; stdout HTTP, DB sessions/flags/boolean hash, pg_stat_activity wait metadata và lịch lock thực tế |
| AUD-03 | timestamp cùng millisecond/khác microsecond + tie, duyệt hết3 resources/exact ID set/order/endcursor, filter/empty/scope/cost queries | ACC-PAGE stdout fixture, expected/actual IDs/meta, query counts; không chỉ unit cursor |
| AUD-04 | log thật create/update/reset sau commit; không log mutation khi rollback; DB effects/denial mọi route và safe exact response | ACC-LOG/CRUD/VALIDATION; stdout logger gốc đã che, commit barrier observation, DB before/after; không in mật khẩu/hash/token |
| AUD-05 | quyền PATCH chỉ store, bảng lỗi theo route, ví dụ JSON hợp lệ và Swagger contract | spec diff + DOC test/OpenAPI runner output bản cuối; QA so lại spec/code/artifact |
| Hồi quy/migration | toàn npm test, nâng cấp dữ liệu cũ và CLI repeat | full runner stdout/stderr, migration CLI raw output, commands/start/end/exit; source/runtime manifests cuối |

Các lệnh/giờ/exit code ghi commands.log khi thực chạy. Không ghi số pass hoặc đánh dấu đạt trước khi runner và QA đối chiếu. Không chạy browser: UI PB-13 ngoài scope sửa API/DB, quỹ sau ca PB-06 vẫn deferred đã chốt.

## Kết quả thực thi bản cuối

- `npm test` tại POS_API (script gồm build + Node test runner), bắt đầu **21:23:58.0263934+07:00**, kết thúc **21:25:11.8251211+07:00**, ngày30/10/2026, exit0. [Output gốc nén](evidence/full-2.log.gz): **48 TAP nodes pass,0 fail/skip/cancel**, gồm13 top-level+35 nested; không gọi48 tiêu chí hoặc kịch bản độc lập. Run cuối chứa cả DOC-02 kiểm10 ví dụ DTO/spec và DOC-01 OpenAPI.
- CLI: `node --env-file-if-exists=.env ../qa-evidence/20261030-193116-9ce75dd-pb04/migration-check.cjs` tại POS_API; wrapper chạy TypeORM CLI đúng manifest trên DB ngẫu nhiên mới hai lần. [migration-cli-2.log](evidence/migration-cli-2.log), bắt đầu21:23:24.7229986+07:00, kết thúc21:23:27.4664341+07:00, exit0; lần đầu áp4 migration, lần sau No migrations are pending. Lần thử trước Docker daemon chưa chạy bị ECONNREFUSED, giữ tại migration-cli.log; không tính là pass. Một lần chạy console sau khởi động Docker không lưu artifact không được dùng làm bằng chứng.
- Môi trường/version/HEAD/dirty do lệnh thực thu tại [environment.log](evidence/environment.log): Node22.22.2, npm10.9.7, PostgreSQL17.9 Docker, Windows PowerShell. Không xuất giá trị .env. Docker PostgreSQL local được khởi động lại; chỉ tạo/xóa DB QA riêng.
- Nhận diện bản cuối: [source-manifest.json](evidence/source-manifest.json) gồm66 source/config, [runtime-manifest.json](evidence/runtime-manifest.json) gồm64 JavaScript runtime, [contract-manifest.json](evidence/contract-manifest.json) gồm9 tài liệu hợp đồng. Source/config/runtime không đổi sau full-2 build. HEAD là base, không phải commit chứa PB-04; phải dùng manifests để đối chiếu working tree.

## Ma trận kết quả và artifact

| Finding | Case/assertion trên bản cuối | Artifact cụ thể |
| --- | --- | --- |
| AUD-01 | ACC-SCOPE-01, AUTH-01..03: A1/A2/B, quyền/branch hiện hành, platform misgrant, force change, account/store block trên10 operations | full-2.log.gz: HTTP request/response/requestId; DENIAL_DB và snapshots trước/sau |
| AUD-02 | RESET-01..02, LOG-02;12 lịch reset/role/disable × login/refresh ×2 thứ tự; thêm2 lịch role→reset/disable | full-2.log.gz: PG_LOCK_ORDER, RACE_RESULT, MUTATION_RACE_RESULT, HTTP.db.sessions/CREDENTIAL_DB và HTTP/DB; acceptance-3.log.gz/acceptance-6.log.gz là red trước sửa |
| AUD-03 | PAGE: fixture SQL6 chữ số microsecond/ties, duyệt hết3 resources/filter/scope/empty, exact ID set/order/endcursor và query counts | full-2.log.gz: fixture, SQL_PAGE_RESULT và query count; không dùng chỉ unit decoder |
| AUD-04 | LOG-01 commit gate độc lập connection; LOG-02 rollback trigger; CRUD/VALIDATION; exact public DTO/no secret | full-2.log.gz: BEFORE_COMMIT_BARRIER, AFTER_COMMIT_LOG, ROLLBACK_DB, APPLICATION_LOG thực, HTTP và DB snapshots; rollback hash bằng boolean, không lưu hash |
| AUD-05 |10 ví dụ request/response, bảng lỗi riêng endpoint, PATCH users store-only; dọn câu PATCH thừa ở POST | specs organization/users bản contract-manifest; full-2.log.gz DOC-02/DOC-01. Ví dụ spec là dữ liệu minh họa, không phải HTTP runtime |
| Migration/hồi quy | giữ legacy user/session/credential và permission cũ; auth/platform/foundation/regression | full-2.log.gz migration diagnostics và các suite; migration-cli-2.log first/repeat |

QA đối chiếu chi tiết từng AC/E/P/M/D và giới hạn ở [audit.md](audit.md); code review ở [review.md](review.md). Không suy số pass thành bao phủ mọi lịch đồng thời hoặc mọi hành vi tương lai.

## Lỗi thật và lịch sử red/green

1. acceptance-3.log.gz: role đổi khi login chờ khóa làm JOIN cũ không trả user, login401 sai. AuthService.login khóa ID trước rồi đọc user/role/store; acceptance-4.log.gz24/24 và full-2 xanh.
2. Reviewer tìm mẫu tương tự UsersService.staff. acceptance-6.log.gz tái hiện role→reset/disable:200 rồi404 sai. Sửa khóa ID theo store/branch trước, JOIN role sau trong cùng transaction. Hai ACC-RACE-MUTATION full-2 cùng[200,200], giữ role mới, flags và thu hồi phiên đúng.
3. acceptance-2 có lỗi harness envelope/SQL bị cắt1kB; acceptance-5 build lỗi type Session của harness. Giữ log, không dùng làm bằng chứng lỗi runtime. spec-red chứng minh bảng lỗi GET sai trước sửa; spec-green và full-2 xác minh sau sửa. full-1.log.gz46/46 là lịch sử trước lỗi staff được phát hiện, không thay full-2.

## Đọc artifact và tái chạy

Log `.gz` là stdout/stderr gốc UTF-16LE từ PowerShell, nén lossless để tránh đưa log lớn vào Git. [artifact-manifest.json](evidence/artifact-manifest.json) lưu SHA256 raw/gzip, kích thước và vị trí bản raw ngoài repo. Đã giải nén đối chiếu byte identity trước khi dọn từng raw do task tạo. Dùng Python `gzip.decompress(Path(file).read_bytes()).decode('utf-16')` để đọc; số dòng audit tính sau giải nén. File nhỏ giữ nguyên. commands.log giữ lệnh/thời gian/exit thực, không viết lại theo kết luận.

Tái chạy: chuẩn bị PostgreSQL local theo POS_INFRA, tại POS_API chạy `npm test`; chạy wrapper CLI nêu trên nếu cần kiểm tra first/repeat. Test dùng DATABASE_URL để tạo DB QA riêng. Không chạy trên tài khoản DB thiếu quyền CREATE DATABASE.

Giới hạn: bằng chứng local do agent chạy và QA đọc lại, chưa có CI/runner độc lập; chưa kiểm UI/PB-13, production hoặc khóa quỹ sau ca PB-06. Không merge/push/commit hay tick nghiệm thu Sprint3 thay Product Owner.
