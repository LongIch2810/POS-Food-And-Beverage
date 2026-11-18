# Kiểm AC report 20261119-sprint11-pb16-recheck — vòng 2

## Kết luận

PASS

- Ngày: 2026-11-19, giờ local UTC+07.
- Phạm vi kiểm lại: duy nhất S11-02 / V1-1.
- S11-01 không nghiệm thu lại trong vòng này. Kết quả PASS lần 1 được giữ nguyên.
- S11-03..S11-09 và các AC riêng khác của plan PB-16 không được nghiệm thu lại.
- Full test suite được chạy để cung cấp bằng chứng build/test cho S11-02; việc đó không tạo kết luận nghiệm thu mới cho các AC ngoài phạm vi.
- Plan đối chiếu: `.devloopflow/approved/20261118-sprint11-pb16-remove-cancel-paid.md`.
- Spec đối chiếu: `.devloopflow/specs/20261118-sprint11-pb16-remove-cancel-paid.md`.
- Tiêu chí cấp sprint: `sprints/sprint-11/SPRINT.md:37`.
- V1-1: đã PASS. Không phát sinh FAIL mới.
- Đây là kết quả local do agent chạy, không phải CI hoặc runner độc lập.

## Tài liệu nguồn đã đối chiếu

- `sprints/sprint-11/SPRINT.md`, đặc biệt S11-02.
- `.devloopflow/approved/20261118-sprint11-pb16-remove-cancel-paid.md`: quyết định loại trừ toàn thư mục migration khỏi tìm kiếm, E2E-AC-8/9/10, ST-2, ST-4, ST-5 và RF-1..RF-5.
- `.devloopflow/specs/20261118-sprint11-pb16-remove-cancel-paid.md`: mục Thành công trông như thế nào, Mục tiêu, Phi mục tiêu và Ràng buộc.
- `docs/BUSINESS_RULES.md`: BR-21, BR-29, BR-39, BR-47, bảng quyền, sơ đồ vòng đời và BR-110.
- `docs/api-spec.md`: bảng mã lỗi tại dòng 353–354 và quy định hóa đơn bất biến tại dòng 459, 523.
- `README.md:9`: trạng thái PB-16.
- `.devloopflow/devloopflow.md`: lệnh kiểm tra, PostgreSQL/Redis local, sandbox và quy tắc chứng cứ.
- `.devloopflow/MEMORY.md`: M-4, M-10, M-29, M-32, M-34, M-39, M-53, M-54.
- `.devloopflow/errors/INDEX.md`.
- `.devloopflow/errors/20261119-pb16-business-rules-matrix-diagram-stale.md`.
- `.devloopflow/errors/20261111-manager-cancel-open-behavior-untested.md`.
- `.devloopflow/errors/20261113-cancel-open-scope-order-untested.md`.
- `.devloopflow/errors/20261119-backlog-mock-cancel-paid-test-gap.md`.
- `.devloopflow/errors/20261119-backlog-cancel-modal-redundant-open-check.md`.
- `.devloopflow/tasks/completed/20261118-sprint11-pb16-remove-cancel-paid.md`, phần lịch sử review và kiểm AC.
- Sổ FAIL hiện tại: `.devloopflow/verify/20261119-sprint11-pb16-recheck/fails.md`.

## Môi trường

- Node.js `v22.22.2`, npm `10.9.7`.
- PostgreSQL: container `pos_infra-postgres-1`, bind `127.0.0.1:5432`; `pg_isready` trả `accepting connections`.
- Redis: container `pos_infra-redis-1`, bind `127.0.0.1:6379`.
- API test dùng `DATABASE_URL` local từ `POS_API/.env`, không in giá trị; `REDIS_URL=redis://127.0.0.1:6379/15` theo cấu hình test của dự án.
- HEAD: `1120c29e357ab7da95522c84279471a8616da659`; kiểm trên working tree có thay đổi PB-16.
- `graphify-out/needs_update` tồn tại khi kiểm. Không dùng graph cũ.
- Lệnh chạy app, từ `POS_API/`:
  `node --env-file-if-exists=.env "D:/saved/Project/POS-F&B/.devloopflow/verify/20261119-sprint11-pb16-recheck/evidence/scripts/r2-S11-02-live-permissions.cjs"`.
- App là NestJS `AppModule` thật, dùng PostgreSQL sandbox riêng và cổng ngẫu nhiên, không dùng mock API.
- URL app đã kiểm: `http://127.0.0.1:50295/api/v1`.
- Curl health trả `200`, body `{ "data": { "status": "ok" } }`.
- OWNER và MANAGER đăng nhập thật; curl `/auth/me` trả `200`, quyền hủy hóa đơn chỉ còn `invoice.cancel_open`.
- Sandbox: `pos_pb16_r2_5ecac63706a9`, được tạo riêng cho lượt này. App đã đóng; SQL xác nhận số database còn lại với tên đó bằng `0`.
- Không sửa source, test, docs hoặc config. Chỉ ghi evidence mới với prefix `r2`.
- SHA256 source được ghi trước và kiểm lại sau test; các file kiểm đều không đổi.

Bằng chứng môi trường và app:

- `evidence/r2-S11-02-environment.log`
- `evidence/scripts/r2-S11-02-live-permissions.cjs`
- `evidence/r2-S11-02-live-app.log`
- `evidence/r2-S11-02-live-permissions.json`
- `evidence/r2-S11-02-source-hashes.log`
- `evidence/r2-S11-02-source-stability.log`
- `evidence/r2-S11-02-SHA256SUMS.txt`

## Kết quả test

| Phần | Lệnh đã chạy | Kết quả thật | Log đầy đủ |
|---|---|---|---|
| API | Trong `POS_API/`: `npm test`, với `REDIS_URL=redis://127.0.0.1:6379/15` | Tự chạy `npm run build`; `# tests 347`, `# pass 347`, `# fail 0`, `# cancelled 0`, `# skipped 0`, `# todo 0`, `EXIT_CODE=0`; thời gian `392852.0547 ms` | `evidence/r2-S11-02-api-test.log` |
| UI typecheck | Trong `POS_UI/`: `npm run typecheck` | `EXIT_CODE=0` | `evidence/r2-S11-02-ui-typecheck.log` |
| UI build | Trong `POS_UI/`: `npm run build` | Typecheck và Vite build thành công; `EXIT_CODE=0` | `evidence/r2-S11-02-ui-build.log` |
| UI tests | Trong `POS_UI/`: `npm test` | `# tests 231`, `# pass 231`, `# fail 0`, `# skipped 0`, `EXIT_CODE=0` | `evidence/r2-S11-02-ui-test.log` |
| Browser router | Trong `POS_UI/`: `node --test test/stock-ledger-router.browser.mjs` | `# tests 9`, `# pass 9`, `# fail 0`, `# skipped 0`, `EXIT_CODE=0` | `evidence/r2-S11-02-router-browser-test.log` |

- Các log được đọc toàn bộ bằng script tổng hợp; script kiểm có `EXIT_CODE=0`, `# fail 0` và không có dòng `not ok`.
- Tên test và tổng kết liên quan được trích tại `evidence/r2-S11-02-focused-results.log`.
- Script tổng hợp: `evidence/scripts/r2-S11-02-summarize.cjs`.
- Không dùng log lần 1 để làm bằng chứng kết quả mới.

## Coverage

- Không chạy: manifest API/UI và CI không cấu hình script hoặc ngưỡng coverage.
- Không suy tỷ lệ coverage từ số test.
- Nguồn cấu hình đã đối chiếu: `POS_API/package.json`, `POS_UI/package.json`, `.devloopflow/devloopflow.md`.
- Bằng chứng: `evidence/r2-S11-02-environment.log`.

## Đã đối chiếu errors

- `20261119-pb16-business-rules-matrix-diagram-stale.md`: đã chạy lại đúng tình huống V1-1. Bảng quyền tại `docs/BUSINESS_RULES.md:230` có bốn giá trị Không; sơ đồ tại dòng 249–252 không còn cạnh PAID→CANCELLED. Đối chiếu BR-110, API contract và source hiện tại đều khớp. Bằng chứng mới: `evidence/r2-S11-02-numbered-source-excerpts.log`, `evidence/r2-S11-02-doc-diff.log`, `evidence/r2-S11-02-code-test-check.log`.
- `20261111-manager-cancel-open-behavior-untested.md`: suite mới thực chạy `[MGR-CANCEL-1..4]`, gồm thành công, thiếu ca, khác chi nhánh và thiếu quyền; đều PASS.
- `20261113-cancel-open-scope-order-untested.md`: test `[R1-1] out-of-scope caller without a shift gets 404 when cancelling an OPEN invoice` vẫn được thực chạy và PASS trong suite mới.
- `20261119-backlog-mock-cancel-paid-test-gap.md`: `[B-74][PB16-mock][BR-110] PAID cancellation throws and preserves all state` thực chạy và PASS.
- `20261119-backlog-cancel-modal-redundant-open-check.md`: các test modal/ca hiện có thực chạy trong UI suite và PASS.
- Bằng chứng các case trên: `evidence/r2-S11-02-focused-results.log`, cùng log API/UI đầy đủ.
- Finding đang kiểm lại V1-1 có hồ sơ lỗi chứa triệu chứng, nguyên nhân gốc, cách fix, phương thức kiểm, quy tắc phòng tránh và dấu hiệu review.
- Không phát sinh finding sửa source trong vòng này. Không nghiệm thu lại toàn bộ hồ sơ task PB-16 ngoài phạm vi S11-02.

## Bảng đối chiếu (MỌI AC được yêu cầu kiểm lại)

Phạm vi lần này chỉ có S11-02. Các hàng dưới tách từng vế của cùng AC để không bỏ sót.

| AC | Cách kiểm | Lệnh/bước đã chạy | Kết quả thật (nguyên văn hoặc path bằng chứng) | Mong đợi theo plan | Quy định trong tài liệu (nguyên văn + path:dòng) | Kết luận | Ghi chú chỗ lệch |
|---|---|---|---|---|---|---|---|
| S11-02 — endpoint/logic, mã lỗi và test cũ | Tìm kiếm source/test; đọc controller/service; chạy build/test | Hai lệnh `rg` của E2E-AC-8/9; tìm `cancelPaid`; kiểm file nguồn và dist cũ; API/UI suite | Hai lệnh tìm mã/quyền/lỗi cũ đều không có dòng và exit 1; `cancelPaid` không có kết quả. Test nguồn `cancel-paid.integration.test.ts` và `.js/.js.map/.d.ts` tương ứng trong dist không tồn tại. Source hiện tại từ chối PAID ở `sales.service.ts:559`. Bằng chứng: `evidence/r2-S11-02-removed-symbols.log`, `evidence/r2-S11-02-code-test-check.log`, `evidence/r2-S11-02-dist-tests.log`, log test mới | Gỡ đường xử lý hủy PAID, mã lỗi/quyền/test cũ; giữ route dùng cho hủy OPEN và thêm test bất biến | Spec `:22`: “Gỡ mã lỗi `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER` và toàn bộ logic hủy `PAID` (hoàn kho `SALE_REVERSAL`, trả lượt mã, kiểm két) khỏi API.” Spec `:24`: “Gỡ hoặc sửa các test liên quan; test mới bảo vệ hành vi bất biến.” | Đúng | Route chung `POST /invoices/{id}/cancel` được giữ theo hợp đồng OPEN; không phải endpoint riêng còn cho hủy PAID. Toàn thư mục migration được loại trừ theo quyết định user trong plan. |
| S11-02 — permission | Migration trên DB mới; SQL thật; app và curl với vai trò thật | Chạy migration lần đầu/lần hai; SQL `SELECT code FROM permissions WHERE code LIKE 'invoice.cancel%' ORDER BY code`; curl `/auth/me` cho OWNER/MANAGER | Migration `15`, lần hai `0`; SQL chỉ `invoice.cancel_open`; OWNER và MANAGER HTTP 200, quyền hủy chỉ `["invoice.cancel_open"]`. `evidence/r2-S11-02-live-permissions.json`; test migration up/down và test `[PB16-ST2]` đều PASS trong API suite | Quyền PAID và dòng cấp quyền được gỡ bằng migration mới; OPEN giữ nguyên | Spec `:21`: “Gỡ quyền `invoice.cancel_paid` khỏi DB (quyền và dòng cấp quyền cho `OWNER`/`MANAGER`) bằng migration mới.” | Đúng | Không chỉnh dữ liệu local của người khác; toàn bộ seed trong sandbox mới. |
| S11-02 — build/test | Chạy lệnh dự án trên mã cuối | API `npm test`; UI `npm run typecheck`, `npm run build`, `npm test`; browser router | API 347/347, UI 231/231, browser 9/9; mọi lệnh exit 0. `evidence/r2-S11-02-focused-results.log` và log đầy đủ | Build/test không lỗi, test mới bảo vệ bất biến; không chạy test dist cũ còn sót | `sprints/sprint-11/SPRINT.md:37`: “Endpoint, mã lỗi, permission và test của hủy đơn `PAID` đã gỡ; `docs/api-spec.md`, BR và README khớp mã.” Bằng chứng cần thu: “`rg` kết quả, build/test, diff tài liệu.” | Đúng | Không có skip trong các suite đã chạy. |
| S11-02 — docs/API/README và V1-1 | Đọc nguyên văn, theo sơ đồ và ma trận; đối chiếu source và diff | Kiểm BR dòng 230, 249–252, 308; API spec dòng 353–354, 459, 523; README dòng 9; `git diff -- docs/BUSINESS_RULES.md docs/api-spec.md README.md` | Ma trận có bốn Không; sơ đồ chỉ OPEN→PAID hoặc OPEN→CANCELLED; BR/API/README cùng nói PAID không hủy được. Mã mới `INVOICE_PAID_IMMUTABLE` có trong API spec và source. `evidence/r2-S11-02-numbered-source-excerpts.log`, `evidence/r2-S11-02-document-quotes.log`, `evidence/r2-S11-02-doc-diff.log` | Docs hiện hành khớp hành vi PB-16; không cấp quyền hoặc vẽ chuyển PAID→CANCELLED | BR `:308`: “**Bãi bỏ hủy đơn `PAID`.** Chỉ đơn `OPEN` hủy được.” API spec `:354`: “Hủy đơn `PAID`: đơn đã thanh toán bất biến, "Đơn đã thanh toán không thể hủy."” README `:9`: “hủy hóa đơn đã thanh toán đã bị bãi bỏ ở PB-16.” | Đúng | Lệch tài liệu V1-1 đã hết trên bản hiện tại. |

- S11-01: không kiểm lại ở vòng 2.
- S11-03..S11-09: không kiểm ở vòng 2.
- Không tick lại hoặc tạo kết luận mới cho các AC riêng khác trong plan PB-16.

## Đối chiếu spec (cấp tính năng trong phạm vi S11-02)

| Mục của spec (nguyên văn) | Loại | AC hoặc bước đã chạy | Kết quả thật (nguyên văn hoặc path bằng chứng) | Kết luận |
|---|---|---|---|---|
| “Tìm `invoice.cancel_paid`, `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER` trong mã, test, UI và tài liệu hiện hành ngoài migration cũ, spec/hồ sơ lịch sử và hồ sơ sprint cũ không còn kết quả.” (`:17`) | Mục tiêu | S11-02, lệnh tìm kiếm theo phạm vi đã được user duyệt trong plan | Không có kết quả, exit 1. `evidence/r2-S11-02-removed-symbols.log` | Đúng; áp dụng quyết định user loại trừ toàn thư mục migration, gồm migration gỡ quyền. |
| “Gỡ quyền `invoice.cancel_paid` khỏi DB (quyền và dòng cấp quyền cho `OWNER`/`MANAGER`) bằng migration mới.” (`:21`) | Mục tiêu | Migration thật, SQL và curl `/auth/me` | DB mới và hai phiên thật chỉ còn `invoice.cancel_open`; `evidence/r2-S11-02-live-permissions.json` | Đúng |
| “Gỡ hoặc sửa các test liên quan; test mới bảo vệ hành vi bất biến.” (`:24`) | Mục tiêu | Đọc test mới, kiểm dist cũ, chạy full suite | Test hủy PAID cũ đã xóa; test bất biến và mock bảo toàn state thực chạy PASS. `evidence/r2-S11-02-code-test-check.log`, `evidence/r2-S11-02-focused-results.log` | Đúng |
| “Đồng bộ tài liệu: BR, `docs/api-spec.md`, thiết kế DB, README, backlog, sprint.” (`:25`) | Mục tiêu | Trong phạm vi S11-02 kiểm BR/API/README; tìm mã cũ trên phạm vi tài liệu hiện hành theo plan | Không còn mã lỗi/quyền cũ; BR/API/README cùng hợp đồng PAID bất biến. `evidence/r2-S11-02-removed-symbols.log`, `evidence/r2-S11-02-numbered-source-excerpts.log` | Đúng trong phạm vi S11-02 |
| “Không sửa migration đã chạy; không sửa spec lịch sử trong `.devloopflow/specs/` (giữ nguyên byte).” (`:31`) | Phi mục tiêu/ràng buộc | Vòng kiểm chỉ ghi evidence, đọc migration mới và chạy trên sandbox | Không sửa source/docs/config. Source hash kiểm lại không đổi. `evidence/r2-S11-02-source-stability.log` | Đúng đối với thao tác của vòng kiểm này |
| “Khi đổi mã lỗi, cập nhật danh sách lỗi của spec và `docs/api-spec.md` cùng lúc với code (M-4).” | Ràng buộc | Đối chiếu spec, API spec và source `sales.service.ts:559` | Cùng mã `INVOICE_PAID_IMMUTABLE`, HTTP 409, message “Đơn đã thanh toán không thể hủy.” | Đúng |

- Các mục tiêu về thao tác UI cuối, legacy CANCELLED và toàn bộ bất biến dữ liệu thuộc phạm vi S11-01/toàn plan không được nghiệm thu lại trong vòng này.
- Không dùng report này để kết luận hoàn thành toàn feature hoặc toàn Sprint 11.

## FAIL / bug (mỗi FAIL cũng được lưu vào sổ `fails.md`)

- Không phát sinh FAIL mới.
- V1-1 — S11-02:
  - Kỳ vọng: ma trận không cấp quyền hủy PAID cho vai trò nào; sơ đồ không có cạnh PAID→CANCELLED.
  - Thực tế mới: dòng 230 có bốn Không; dòng 249–252 chỉ có hai nhánh từ OPEN, chú thích PAID không hủy được.
  - Source/API spec/README cùng hợp đồng PB-16; test HTTP bất biến mới thực chạy PASS.
  - Bằng chứng: `evidence/r2-S11-02-numbered-source-excerpts.log`, `evidence/r2-S11-02-doc-diff.log`, `evidence/r2-S11-02-focused-results.log`.
  - Trạng thái: đã PASS; giữ nguyên lịch sử lần 1 trong `fails.md`.

## Lệch tài liệu

- Không còn lệch tài liệu trong S11-02.
- Cách loại trừ toàn thư mục migration khi tìm chuỗi cũ đã được user duyệt trong plan; không coi migration mới chứa tên quyền để gỡ/rollback là mã nghiệp vụ còn sót.

## Đánh giá test

- API integration dùng PostgreSQL thật, HTTP thật và database sandbox riêng; không suy PASS từ static search.
- Test migration kiểm up/down/up, khôi phục hai dòng cấp cho OWNER/MANAGER rồi gỡ lại; đã thực chạy.
- Test `[PB16-ST2]` kiểm quyền từ phiên thật qua `/auth/me`; lượt này có thêm app/curl độc lập trong sandbox mới.
- Test bất biến kiểm lỗi và trạng thái trước/sau, thay cho test từng cho phép hủy PAID.
- UI mock test kiểm toàn bộ state giữ nguyên và không lưu thay đổi sau từ chối PAID.
- Các tổng kết suite mới có fail/skipped/cancelled bằng 0.
- Không chạy coverage vì dự án không cấu hình.
- Không tạo test production chỉ so chuỗi Markdown; V1-1 được đối chiếu tài liệu trực tiếp và kiểm hợp đồng mã thật.

## Exploratory

- V1-1: đọc đủ cột vai trò và lần theo các cạnh sơ đồ, không chỉ đọc chú thích. Kết quả: bốn Không; không còn cạnh PAID→CANCELLED. `evidence/r2-S11-02-numbered-source-excerpts.log`.
- M-4: tìm mã mới trong API spec và so với service/spec. Cùng `INVOICE_PAID_IMMUTABLE`, 409, message tiếng Việt. `evidence/r2-S11-02-code-test-check.log`.
- M-10: app thật, OWNER/MANAGER thật, curl `/auth/me`; hai phản hồi 200 và chỉ có `invoice.cancel_open` trong nhóm quyền hủy. `evidence/r2-S11-02-live-permissions.json`.
- M-29: migration lần đầu 15, lần hai 0; full API suite bao gồm foundation/entity-schema và đạt 347/347. `evidence/r2-S11-02-live-permissions.json`, `evidence/r2-S11-02-api-test.log`.
- M-53 / RF-4: file test nguồn cũ và ba artifact dist tương ứng đều không tồn tại sau build; full API test không chạy lại test cũ. `evidence/r2-S11-02-dist-tests.log`.
- M-39: ghi hash source/docs và kiểm lại sau suite, tất cả không đổi. `evidence/r2-S11-02-source-hashes.log`, `evidence/r2-S11-02-source-stability.log`.
- RF-1: test `T5-stale: thay OPEN thành PAID cần xác nhận mới` thực chạy PASS trong UI suite mới.
- RF-2: `[PB16-RF2] pay wins a concurrent cancel of the same OPEN invoice` thực chạy PASS trong API suite mới.
- RF-3: `[PB16-8] uppercase id of a PAID invoice returns INVOICE_PAID_IMMUTABLE` thực chạy PASS.
- RF-5: `[PB16-RF5] PAID cancel takes no row lock and writes nothing` thực chạy PASS.
- Hai lỗi cũ về MANAGER và thứ tự scope có các test `[MGR-CANCEL-1..4]`, `[R1-1]` thực chạy PASS.
- B-74: test mock từ chối PAID và bảo toàn state thực chạy PASS.
- Bằng chứng các test exploratory tự động: `evidence/r2-S11-02-focused-results.log`, log API/UI đầy đủ.
- RF và các case trên được chạy trong bước chứng minh test cho S11-02; không mở thêm lượt nghiệm thu S11-01.

## Đề xuất

- Chuyển V1-1 sang `đã PASS`, ghi lịch sử vòng 2 và liên kết artifact mới.
- Giữ kết quả S11-01 lần 1; không ghi là đã kiểm lại.
- Bằng chứng raw nằm local trong `evidence/`; report và fails không chứa cookie, token, mật khẩu hoặc giá trị kết nối DB.
- Không còn đề xuất sửa code hoặc tài liệu cho S11-02.
- Chưa xác minh CI hoặc các AC Sprint 11 ngoài phạm vi được giao.
