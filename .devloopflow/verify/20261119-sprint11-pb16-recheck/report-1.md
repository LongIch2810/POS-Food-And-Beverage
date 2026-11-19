# Kiểm AC report 20261119-sprint11-pb16-recheck — vòng 1

## Kết luận
FAIL

- Ngày: 2026-11-19, múi giờ UTC+7.
- Loại chứng cứ: local do agent chạy.
- Phạm vi được yêu cầu: chỉ S11-01 và S11-02, nguyên văn tại `sprints/sprint-11/SPRINT.md:46-47`.
- Kết quả: S11-01 PASS; S11-02 FAIL.
- Không nghiệm thu lại toàn bộ Sprint 11, không đánh giá S11-03 trở đi và không cấp lại trạng thái cho toàn bộ AC của plan PB-16.
- Plan đối chiếu: `.devloopflow/approved/20261118-sprint11-pb16-remove-cancel-paid.md`.
- Spec đối chiếu: `.devloopflow/specs/20261118-sprint11-pb16-remove-cancel-paid.md`.
- Finding mở: V1-1 — tài liệu BR vẫn thể hiện quyền và đường chuyển trạng thái hủy PAID.
- Không sửa source, test, config hoặc tài liệu sản phẩm trong lượt kiểm.
- Các artifact dùng để kết luận là artifact mới chạy trong lượt này; không dùng kết quả QA cũ làm bằng chứng PASS.

## Tài liệu nguồn đã đối chiếu

- `sprints/sprint-11/SPRINT.md`, phần tiêu chí nghiệm thu cấp sprint.
- `.devloopflow/approved/20261118-sprint11-pb16-remove-cancel-paid.md`, phần quyết định, phạm vi, Review Focus và lệnh kiểm tra.
- `.devloopflow/specs/20261118-sprint11-pb16-remove-cancel-paid.md`.
- `docs/PRODUCT_OVERVIEW.md`, phạm vi và quy tắc sản phẩm.
- `docs/BUSINESS_RULES.md`, BR-21, BR-28, BR-29, BR-39, BR-47, BR-110, bảng quyền và sơ đồ trạng thái.
- `docs/api-spec.md`, lỗi, bất biến hóa đơn, thanh toán và hủy đơn.
- `README.md`, trạng thái triển khai hiện tại và đoạn lịch sử Sprint 09.
- `DESIGN.md`, hành vi Hóa đơn và bỏ thao tác hủy PAID.
- `.devloopflow/devloopflow.md`, lệnh và môi trường kiểm.
- `.devloopflow/MEMORY.md`.
- `.devloopflow/errors/INDEX.md` và các hồ sơ liên quan bên dưới.
- `.devloopflow/tasks/completed/20261118-sprint11-pb16-remove-cancel-paid.md`.

Graphify: marker `needs_update` tồn tại theo bàn giao; không dùng graph cũ. Đối chiếu trực tiếp source, test và tài liệu.

## Môi trường

- Windows, PowerShell, Node.js v22.22.2.
- PostgreSQL thật: container `pos_infra-postgres-1`, bind local cổng 5432.
- Redis thật: container `pos_infra-redis-1`, cổng 6379.
- `DATABASE_URL` được nạp từ `POS_API/.env`; không in giá trị.
- Full API test dùng Redis database 15; app QA riêng dùng database 14.
- App QA dùng database PostgreSQL riêng có prefix `pos_pb16_verify_`, không chạy migration lên database vận hành.
- App được dựng từ bản build source hiện tại, gồm sửa B-73/B-74.
- Lệnh chạy app QA:
  - Trong `POS_API/`: `node --env-file=.env ../.devloopflow/verify/20261119-sprint11-pb16-recheck/evidence/scripts/r1-harness.mjs`.
  - Harness chạy 15 migration trên DB thử riêng, chạy `dist/main.js`, rồi chạy Vite với proxy vào API thử.
- URL/port:
  - API: `http://127.0.0.1:3100/api/v1`.
  - UI: `http://localhost:5183`.
  - Browser MCP Playwright: viewport 1024×768.
- Harness cấp phiên QA trên localhost bằng tài khoản thử; không lưu mật khẩu, cookie hoặc token vào artifact.
- Dừng app qua `/qa-stop`; kiểm DB thử sau dọn cho kết quả `remaining: []`, `allRemoved: true`.
- Bốn DB do các lần khởi tạo harness trong lượt này tạo đều đã được xóa:
  - `pos_pb16_verify_6f204478`
  - `pos_pb16_verify_8b040830`
  - `pos_pb16_verify_edb8b993`
  - `pos_pb16_verify_976ad4c8`
- Bằng chứng môi trường/dọn:
  - `evidence/r1-S11-01-harness.log`
  - `evidence/r1-S11-01-cleanup.json`
- Các lần khởi tạo harness có sửa script bằng chứng để xử lý đường dẫn ESM Windows và bỏ ca báo cáo ngoài phạm vi có fixture TRANSFER không hợp lệ; không sửa mã ứng dụng. Lần chạy dùng để kết luận có 14 tình huống HTTP, 0 tình huống thất bại.

## Kết quả test

- API:
  - Lệnh: trong `POS_API/`, đặt `REDIS_URL=redis://127.0.0.1:6379/15`, chạy `npm test`.
  - Lệnh tự build TypeScript trước khi chạy.
  - Kết quả thật: `# tests 347`, `# pass 347`, `# fail 0`, `# skipped 0`, `# todo 0`; exit 0.
  - Log đầy đủ: `evidence/r1-S11-02-api-test.log`.
- UI typecheck:
  - Lệnh: trong `POS_UI/`, `npm run typecheck`.
  - Kết quả: exit 0.
  - Log: `evidence/r1-S11-02-ui-typecheck.log`.
- UI build:
  - Lệnh: trong `POS_UI/`, `npm run build`.
  - Kết quả thật: `✓ 2015 modules transformed.`, `✓ built in 2.10s`; exit 0.
  - Log: `evidence/r1-S11-02-ui-build.log`.
- UI test:
  - Lệnh: trong `POS_UI/`, `npm test`.
  - Kết quả thật: `# tests 231`, `# pass 231`, `# fail 0`, `# skipped 0`, `# todo 0`; exit 0.
  - Log: `evidence/r1-S11-02-ui-test.log`.
- Browser router hồi quy:
  - Lệnh: trong `POS_UI/`, `node --test test/stock-ledger-router.browser.mjs`.
  - Kết quả thật: 9 test, 9 pass, 0 fail, 0 skip; exit 0.
  - Log: `evidence/r1-S11-02-router-browser-test.log`.
- HTTP/app riêng:
  - Script: `evidence/scripts/r1-http.mjs`, được harness chạy lại với phiên và DB thử mới.
  - Kết quả: 14 tình huống, 0 thất bại.
  - Log và kết quả: `evidence/r1-http.mjs.log`, `evidence/r1-S11-01-http-results.json`.
- Curl thật và SQL trước/sau:
  - Script: `evidence/scripts/r1-curl-probe.mjs`.
  - Kết quả: PAID 409 và bản ghi không đổi; OPEN 200 và thành CANCELLED; legacy CANCELLED GET 200.
  - Log: `evidence/r1-S11-01-curl-db.json`, `evidence/r1-S11-01-curl-paid.log`.
  - Cookie/CSRF trong lệnh lưu bằng chứng đã được thay bằng `[REDACTED]`.

## Coverage

- Không chạy coverage.
- Dự án không có script hoặc ngưỡng coverage trong manifest/CI, theo `.devloopflow/devloopflow.md`.
- Không suy tỷ lệ coverage từ số test PASS.

## Đã đối chiếu errors

- `.devloopflow/errors/20261111-manager-cancel-open-behavior-untested.md`:
  - Đã chạy MANAGER thật có ca riêng hủy OPEN → 200.
  - Full suite chạy `[MGR-CANCEL-1..4]`: có ca, thiếu ca, khác chi nhánh, thiếu quyền.
- `.devloopflow/errors/20261113-cancel-open-scope-order-untested.md`:
  - MANAGER ngoài phạm vi hoặc không có chi nhánh, không có ca → 404 trên OPEN; đơn không đổi.
  - Full suite chạy `[R1-1] out-of-scope caller without a shift gets 404 when cancelling an OPEN invoice`.
- `.devloopflow/errors/20261119-backlog-cancel-modal-redundant-open-check.md`:
  - Kiểm bản modal sau B-73 bằng UI test và browser hủy OPEN thật.
  - POST thành công 200; UI thông báo đã hủy.
- `.devloopflow/errors/20261119-backlog-mock-cancel-paid-test-gap.md`:
  - Full UI suite gồm test B-74 về PAID bị từ chối và giữ nguyên state.
- Task PB-16 không ghi finding Critical/High/Medium đã sửa mà thiếu hồ sơ lỗi.
- B-73/B-74 có hồ sơ lỗi; B-75 là finding được để lại, không coi là finding đã sửa.
- Memory liên quan:
  - M-10: kiểm quyền bằng HTTP với OWNER/MANAGER/CASHIER/PLATFORM_ADMIN và quyền bị thu hồi.
  - M-15: UUID PAID viết hoa vẫn nhận 409 đúng mã.
  - M-29: 15 migration được áp dụng; full API suite gồm các kiểm số migration và migration quyền.
  - M-30: giữ ưu tiên 404 cho OPEN ngoài phạm vi, kể cả không có ca.
  - M-34/M-50: kiểm container và kết nối DB local thực tế trước khi chạy.
  - M-39: nối từng vế AC với artifact, lưu hash source liên quan và browser 1024×768.
  - M-53: danh sách dist xác nhận không còn test `cancel-paid.integration.test` đã biên dịch.
  - M-4/M-54: đã kiểm tài liệu sau cập nhật; không suy PASS tài liệu từ test mã.

Bằng chứng tập trung: `evidence/r1-S11-02-focused-results.log`.

## Bảng đối chiếu

Chỉ gồm hai AC được yêu cầu chạy lại. Các hàng con tách từng vế để không suy PASS toàn AC từ một tình huống.

| AC | Cách kiểm | Lệnh/bước đã chạy | Kết quả thật | Mong đợi theo sprint/plan | Quy định trong tài liệu | Kết luận | Ghi chú chỗ lệch |
|---|---|---|---|---|---|---|---|
| S11-01 — API PAID | Curl, HTTP thật, SQL | Đăng nhập OWNER/MANAGER/CASHIER; POST hủy PAID; snapshot trước/sau | 409 `INVOICE_PAID_IMMUTABLE`, message “Đơn đã thanh toán không thể hủy.”; PAID, thanh toán, tồn, lượt mã và movements không đổi | “Hủy đơn `PAID` bị từ chối ở API” | `docs/api-spec.md:354`: “Hủy đơn `PAID`: đơn đã thanh toán bất biến, "Đơn đã thanh toán không thể hủy."” | Đúng | `evidence/r1-S11-01-http-results.json`, `evidence/r1-S11-01-curl-db.json` |
| S11-01 — UI PAID | Browser MCP 1024×768 | OWNER mở chi tiết PAID tại `/hoa-don`; đếm nút hủy và chụp ảnh | `cancelButtonCount: 0`; chi tiết vẫn có món, tổng tiền, phương thức | “UI không còn thao tác này” | `DESIGN.md:359`: “Đơn đã thanh toán không có nút hủy (BR-110)” | Đúng | `evidence/r1-S11-01-paid-browser.log`, `evidence/r1-S11-01-owner-paid-settled.png` |
| S11-01 — OPEN | HTTP, curl, browser | CASHIER/OWNER/MANAGER có ca riêng hủy OPEN; browser nhập lý do và xác nhận | 200, `CANCELLED`; browser hiện “Đã hủy hóa đơn HDWOFDSLHC.”; curl có SQL trước OPEN/sau CANCELLED | “hủy đơn `OPEN` vẫn hoạt động” | `docs/BUSINESS_RULES.md:150`: “Hủy đơn `OPEN`: thu ngân và MANAGER được hủy; MANAGER cần ca CASHIER `OPEN` của chính mình và đơn cùng chi nhánh. Bắt buộc ghi `cancel_reason`.” | Đúng | `evidence/r1-S11-01-open-browser-success.log`, `evidence/r1-S11-01-open-confirm.png`, `evidence/r1-S11-01-open-cancelled.png`, `evidence/r1-S11-01-curl-db.json` |
| S11-01 — CANCELLED cũ | SQL, migration down/up, GET, browser | Tạo fixture lịch sử đã hủy có khoản thanh toán và hai SALE_REVERSAL; chụp dữ liệu trước/sau migration; GET và xem bằng OWNER | Dữ liệu invoice/items/payments/movements bằng nhau; GET 200; browser thấy lý do “Khách trả hàng (cũ)”, 2 món, 50.000đ, tiền mặt; không có nút hủy | “hóa đơn `CANCELLED` cũ không đổi và vẫn xem được” | `docs/BUSINESS_RULES.md:151`: “Hóa đơn `CANCELLED` và các khoản `payments` đã ghi từ MVP giữ nguyên, không sửa, không xóa.” | Đúng | `evidence/r1-S11-01-legacy-migration.json`, `evidence/r1-S11-01-legacy-browser.log`, `evidence/r1-S11-01-legacy-browser.png`, `evidence/r1-S11-01-curl-db.json` |
| S11-02 — mã/permission/test | rg, full build/test, DB và auth/me | Tìm symbol cũ ngoài migration; kiểm dist; full suites; kiểm permissions và phiên thật | rg exit 1, không kết quả cho symbol/logic cũ; chỉ còn `invoice.cancel_open`; API 347/347, UI 231/231, router 9/9 | “Endpoint, mã lỗi, permission và test của hủy đơn `PAID` đã gỡ” | Spec: “Gỡ mã lỗi `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER` và toàn bộ logic hủy `PAID`…”; plan giữ `POST /invoices/{id}/cancel` cho OPEN và từ chối PAID | Đúng | Gỡ đường hủy thành công PAID; route chung `/cancel` vẫn phục vụ OPEN theo spec. `evidence/r1-S11-02-removed-symbols.log`, `evidence/r1-S11-02-dist-tests.log`, log suites, HTTP permission |
| S11-02 — tài liệu | Đọc, rg, diff docs và đối chiếu HTTP | Đọc BR bảng quyền/sơ đồ, mã lỗi API và README; so với 409 thực tế | API spec và README đã mô tả PB-16; BR-110 đúng nhưng bảng quyền vẫn OWNER/MANAGER “Có”, sơ đồ vẫn nối PAID→CANCELLED | “`docs/api-spec.md`, BR và README khớp mã.” | `docs/BUSINESS_RULES.md:308`: “**Bãi bỏ hủy đơn `PAID`.** Chỉ đơn `OPEN` hủy được.”; đối chiếu `:230` và `:249-251` | Lệch tài liệu | V1-1. `evidence/r1-S11-02-document-quotes.log`, `evidence/r1-S11-02-doc-diff.log` |

Kết quả toàn AC: **S11-01 PASS**, **S11-02 FAIL**.

## Đối chiếu spec

Phạm vi dưới đây chỉ bao phủ mục spec liên quan hai AC sprint được yêu cầu; không thay thế nghiệm thu toàn bộ plan PB-16.

| Mục của spec (nguyên văn) | Loại | AC hoặc bước đã chạy | Kết quả thật | Kết luận |
|---|---|---|---|---|
| “API từ chối hủy đơn `PAID` bằng mã lỗi riêng.” | Mục tiêu | S11-01, curl/HTTP | 409 INVOICE_PAID_IMMUTABLE | Đúng |
| “Gỡ quyền `invoice.cancel_paid` khỏi DB…” | Mục tiêu | S11-02, migration/DB/auth/me | Chỉ còn invoice.cancel_open; OWNER/MANAGER/CASHIER nhận quyền tương ứng; full migration tests PASS | Đúng |
| “Gỡ mã lỗi `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER` và toàn bộ logic hủy `PAID`…” | Mục tiêu | S11-02, rg/build/test | Không còn symbol/logic cũ ngoài migration được loại trừ theo quyết định user | Đúng |
| “UI không còn thao tác hủy đơn đã thanh toán…” | Mục tiêu | S11-01 browser; UI suite gồm B-73/B-74 | OWNER không thấy nút hủy PAID; OPEN còn hủy; mock có regression test | Đúng |
| “Gỡ hoặc sửa các test liên quan; test mới bảo vệ hành vi bất biến.” | Mục tiêu | S11-02 full suites và dist | Không còn file test cũ trong dist; test bất biến/khóa/đua thời gian PASS | Đúng |
| “Đồng bộ tài liệu: BR, `docs/api-spec.md`, thiết kế DB, README, backlog, sprint.” | Mục tiêu | Phần BR/API/README của S11-02 | BR bảng quyền/sơ đồ chưa nhất quán với BR-110 và code | Lệch tài liệu |
| “Không xóa hay sửa dữ liệu `CANCELLED` cũ, dòng `SALE_REVERSAL` cũ…” | Phi mục tiêu | S11-01, dữ liệu trước/sau migration và HTTP | Dữ liệu fixture lịch sử không đổi; vẫn đọc bằng HTTP/browser | Đúng |
| “Không đổi hành vi hủy đơn `OPEN` hay quyền `invoice.cancel_open`.” | Phi mục tiêu | S11-01 và hồi quy MGR-CANCEL | Có ca đúng thì 200; thiếu ca 409; khác phạm vi 404; thiếu quyền 403 | Đúng |
| “Còn đường nào hủy được đơn `PAID`…” | Phản mục tiêu | Các vai trò, quyền thu hồi, PAID tiền mặt/chuyển khoản/0đ/ca đóng/UUID hoa, đua thời gian | Không tình huống đã chạy nào hủy được PAID | Đúng |
| “Chỉ thay schema bằng migration TypeORM mới; không sửa migration đã chạy…” | Ràng buộc | Đọc migration mới và chạy migration tests | Migration mới áp dụng; down/up khôi phục/gỡ quyền; dữ liệu legacy giữ nguyên | Đúng |
| “Thay đổi quyền kiểm bằng HTTP với vai trò thật (M-10).” | Ràng buộc | S11-01/S11-02 HTTP | OWNER/MANAGER/CASHIER/PLATFORM_ADMIN và thu hồi quyền đã kiểm | Đúng |

Các yêu cầu báo cáo/đối soát/sổ kho rộng hơn hai AC không được cấp trạng thái nghiệm thu riêng trong lượt này. Có chạy hồi quy toàn suite; không dùng số suite PASS để tuyên bố nghiệm thu toàn tính năng.

## FAIL / bug

- V1-1 — S11-02 — Lệch tài liệu:
  - Bước tái hiện:
    1. Đọc `docs/BUSINESS_RULES.md:230`.
    2. Đối chiếu cột OWNER/MANAGER còn ghi “Có” cho “Hủy đơn đã thanh toán”.
    3. Đọc sơ đồ `docs/BUSINESS_RULES.md:249-251`; cột dọc từ PAID nối vào mũi tên `CANCELLED ◀───┘`.
    4. Đối chiếu BR-110 tại `:308`, và curl hủy PAID bằng OWNER trả 409.
  - Kỳ vọng:
    - S11-02: “Endpoint, mã lỗi, permission và test của hủy đơn `PAID` đã gỡ; `docs/api-spec.md`, BR và README khớp mã.”
    - BR-110: “**Bãi bỏ hủy đơn `PAID`.** Chỉ đơn `OPEN` hủy được.”
  - Thực tế:
    - Bảng vẫn ghi: `| Hủy đơn đã thanh toán (đã bãi bỏ ở PB-16, BR-110) | Không | Có | Có | Không |`.
    - Sơ đồ vẫn có cạnh từ PAID sang CANCELLED, dù chú thích nói PAID không hủy được.
    - HTTP thực tế từ chối đúng bằng 409 INVOICE_PAID_IMMUTABLE.
  - Path bằng chứng:
    - `evidence/r1-S11-02-document-quotes.log`
    - `evidence/r1-S11-02-doc-diff.log`
    - `evidence/r1-S11-01-curl-db.json`
  - Test tái hiện đề xuất:
    - `S11-02 BR permission matrix and lifecycle agree with BR-110`
    - Input: bảng quyền và sơ đồ trạng thái hiện hành; OWNER/MANAGER gọi hủy một PAID thật.
    - Kết quả mong đợi: tài liệu không cấp quyền hủy PAID cho bất kỳ vai trò nào và không có cạnh PAID→CANCELLED; HTTP vẫn 409 INVOICE_PAID_IMMUTABLE.
    - Kiểm tài liệu bằng đối chiếu trực tiếp; không cần tạo test tự động chỉ để so chuỗi Markdown.

## Lệch tài liệu

- V1-1 / S11-02:
  - Sprint yêu cầu nguyên văn: “`docs/api-spec.md`, BR và README khớp mã.”
  - BR-110 `docs/BUSINESS_RULES.md:308`: “**Bãi bỏ hủy đơn `PAID`.** Chỉ đơn `OPEN` hủy được.”
  - Bảng tại `docs/BUSINESS_RULES.md:230` vẫn ghi OWNER “Có”, MANAGER “Có”.
  - Sơ đồ tại `docs/BUSINESS_RULES.md:249-251` vẫn nối PAID sang CANCELLED.
  - Không sửa tài liệu trong lượt kiểm; chuyển finding cho agent chính.

## Đánh giá test

- Full suites không có test skip hoặc todo.
- Kiểm bất biến API dùng PostgreSQL thật, HTTP thật, snapshot tiền/tồn/promotion/movements và kiểm permission.
- `[PB16-RF2]` kiểm khóa/đua thời gian; `[PB16-RF5]` kiểm không có khóa/câu ghi.
- UI suite có test stale, server rejection, identity, ca hiện tại và B-74 bảo toàn state mock.
- Browser MCP bổ sung đường người dùng thật cho OPEN, PAID và legacy CANCELLED.
- Test xanh không phát hiện hết mâu thuẫn tài liệu: bảng quyền và sơ đồ BR vẫn sai dù rg symbol cũ không còn kết quả.
- Fixture legacy là dữ liệu thử dựng theo trạng thái lịch sử, không phải dữ liệu thật của người dùng.
- Source hash liên quan: `evidence/r1-S11-02-source-hashes.log`.
- HEAD: `evidence/r1-S11-02-head.txt`.
- Hash artifact: `evidence/SHA256SUMS.txt`.

## Exploratory

- RF-1: OPEN đổi thành PAID trước xác nhận:
  - Full UI suite chạy `T5-stale: thay OPEN thành PAID cần xác nhận mới`, PASS.
  - Kiểm không POST và không thông báo thành công.
- RF-2: thanh toán thắng đua với hủy:
  - Full API suite chạy `[PB16-RF2] pay wins a concurrent cancel of the same OPEN invoice`, PASS.
  - App riêng chạy sáu lần đua; chỉ một bên thắng, không tạo SALE_REVERSAL.
- RF-3: UUID PAID viết hoa:
  - HTTP app riêng trả 409 INVOICE_PAID_IMMUTABLE; DB không đổi.
- RF-4: test dist cũ:
  - `evidence/r1-S11-02-dist-tests.log` không có cancel-paid.integration.test; full API test PASS.
- RF-5: PAID không khóa/ghi:
  - Full API suite chạy `[PB16-RF5] PAID cancel takes no row lock and writes nothing`, PASS.
- Lỗi cũ MANAGER:
  - MANAGER có ca riêng hủy OPEN 200; các trường hợp thiếu ca/phạm vi/quyền được kiểm qua HTTP.
- Lỗi cũ ưu tiên scope:
  - MANAGER khác chi nhánh hoặc branch NULL, không có ca, gọi OPEN → 404; đơn vẫn OPEN.
- B-73:
  - Browser xác nhận hủy OPEN sau khi bỏ kiểm OPEN dư → 200, thông báo thành công.
- B-74:
  - Full UI suite chạy test PAID cancellation throws and preserves all state, PASS.
- Input lạ và bảo vệ:
  - Thiếu body: 422 CANCEL_REASON_REQUIRED.
  - UUID sai: 422 VALIDATION_ERROR.
  - Không đăng nhập: 401 UNAUTHENTICATED.
  - Thiếu CSRF: 403 CSRF_INVALID.
  - Hủy PAID lặp: 409, 409.
  - Reason trống/blank: 422 CANCEL_REASON_REQUIRED; quá 255 ký tự: 422 VALIDATION_ERROR.
- Browser:
  - OWNER PAID không có nút hủy.
  - CASHIER OPEN hủy thật qua POST 200.
  - OWNER legacy CANCELLED xem được lý do, thời điểm, món và thanh toán.
  - Network: `evidence/r1-S11-01-browser-network.log`.
  - Console: `evidence/r1-S11-01-browser-console.log`; có favicon 404 và thông báo kết nối của các lần khởi động/dừng harness. Không ghi nhận exception nghiệp vụ qua các thao tác đã kiểm.
  - Screenshot `owner-paid-settled` được chụp sau khi drawer ổn định; ảnh legacy đi kèm DOM text/log để đối chiếu nội dung.

## Đề xuất

- Sửa bảng quyền và sơ đồ BR theo quyết định PAID bất biến đã duyệt, rồi chạy lại riêng S11-02.
- Làm rõ câu về replay tại `docs/api-spec.md:412-413` nếu câu này nhằm bảo vệ hóa đơn CANCELLED lịch sử. Không ghi thành finding độc lập: replay lịch sử có thể vẫn hợp lệ; lượt này không tự quyết thay đổi hợp đồng đó.
- Giữ nguyên đoạn README về kết quả Sprint 09 lịch sử theo phạm vi đã duyệt.
- Không bỏ tick hoặc kết luận S11-03 trở đi từ lượt kiểm này; các AC đó nằm ngoài phạm vi.
- Chưa kiểm CI/runner độc lập, production, SePay Live hoặc các phần PB-17/chọn ngân hàng.
