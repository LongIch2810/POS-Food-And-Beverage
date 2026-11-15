> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Kiểm AC report 20261114-sprint10-reports — vòng 1

> Ghi chú nguồn gốc: subagent `ac-verifier` chạy kiểm và tạo bằng chứng thô nhưng công cụ Write từ chối ghi file này, nên agent chính chép lại từ báo cáo trả về của subagent. Agent chính tự kiểm lại hai điểm: V1-1 (`POS_UI/src/http/client.ts:45` và `DailyReportScreen.tsx:164`) và V1-2 (`docs/BUSINESS_RULES.md:202` BR-66, `docs/PRODUCT_OVERVIEW.md:75`). Các AC còn lại là kết quả do subagent báo, chưa được agent chính chạy lại từng cái, ngoài `npm test` API 240/240 và UI 156/156 do agent chính chạy trước đó. Bảng dưới không có trích dẫn tài liệu đầy đủ như template cho từng dòng: subagent chỉ trả path:dòng (ghi ở cột "Quy định trong tài liệu"); nguyên văn đầy đủ còn thiếu ở các dòng không có dấu ngoặc kép (CHƯA CÓ NGUỒN trích nguyên văn).

## Kết luận
FAIL

- Ngày: 2026-11-14
- Plan đối chiếu: `.devloopflow/approved/20261114-sprint10-reports.md`
- Spec đối chiếu: `.devloopflow/specs/20261114-sprint10-reports.md`
- Tổng: 21 AC (ST-1: 2, ST-2: 7, ST-3: 6, E2E: 6). Kết quả: 18 Đúng, 1 Sai (ST-3.AC-5), 2 Lệch tài liệu (ST-2.AC-6, E2E-AC-4).
- Nhãn bằng chứng: "local do agent chạy"; không có CI độc lập. Hash nguồn trước và sau lượt QA giống nhau (`992142bc…faaf20`), HEAD `19ef547` (`evidence/pre-qa-hash.txt`, `evidence/post-qa-hash.txt`); mã nguồn không đổi trong lượt QA.

## Tài liệu nguồn đã đối chiếu
- `docs/BUSINESS_RULES.md` (BR-29 dòng 150; BR-62..64 dòng 198-200; BR-65 dòng 201; BR-66 dòng 202; BR-77 dòng 203)
- `docs/api-spec.md` (dòng 135, 137, 165, 246, 253, 491)
- `docs/DESIGN_DB_POS_SYSTEM.md`, `docs/PRODUCT_OVERVIEW.md` (dòng 75), `docs/PRODUCT_BACKLOG.md` (dòng 7)
- `DESIGN.md` (33, 141, 355-363, 508, 839)
- `sprints/sprint-10/SPRINT.md` (dòng 10)
- `POS_API/src/database/migrations/20261109000000-Payments.ts`, `20261106000000-Sales.ts`, `POS_API/src/sales/sales.service.ts`
- Spec `.devloopflow/specs/20261114-sprint10-reports.md`, `.devloopflow/MEMORY.md`, `.devloopflow/errors/INDEX.md`

## Môi trường
- Lệnh chạy app: `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait` làm `pos_api` thoát `28P01`; agent chính chạy lại `up -d --wait api ui` với `POSTGRES_PASSWORD` lấy từ `POS_API/.env` (không ghi vào file). `pos_api` healthy, `pos_ui` up.
- URL/port: API `http://localhost:3000`, UI `http://localhost:5173`, PostgreSQL `127.0.0.1:5432` (DB `pos_local`). `NODE_ENV=development`.
- Sandbox của subagent (đã dọn): DB thử `ac_s10_sbx_*`, API cổng 3100, Vite 5174.

## Kết quả test
- `POS_API`: `npm run build` exit 0; `npm test` 240/240 (`evidence/api-full.log`, `evidence/api-build.log`); test báo cáo riêng 16/16 (`evidence/reports-api.log`).
- `POS_UI`: `npm run typecheck` exit 0; `npm test` 156/156; `npm run build` exit 0; `node --test test/reports-accessibility.browser.mjs` 1/1 (`evidence/ui-full.log`, `evidence/ui-browser-test.log`, `evidence/ui-typecheck.log`, `evidence/ui-build.log`).

## Coverage
- Lệnh: Không có. Repo không có script coverage (theo `CLAUDE.md` và manifest); không có số coverage.

## Đã đối chiếu errors
- `.devloopflow/errors/INDEX.md` và 3 file mới `20261114-react-strictmode-mounted-ref-stuck-false.md`, `20261114-css-cascade-input-min-height-44-beats-48.md`, `20261114-reports-date-before-chart-range-untested.md` (đủ mục, đủ dòng INDEX).
- Lỗi cũ trong mục "Lỗi cũ cần tránh" của plan: owner-access-all, null-branch fail-open, invoice-load-error-details-lost, backlog-stale-list-test-settled-request, cash-close-shift-zero-cash-sales, payment-test-seed-db-clock-flaky, pb13-session-retry-scope.

## Bảng đối chiếu (MỌI AC trong plan, không bỏ AC nào)
| AC | Cách kiểm | Lệnh/bước đã chạy | Kết quả thật (path bằng chứng trong `evidence/`) | Mong đợi theo plan | Quy định trong tài liệu (path:dòng) | Kết luận | Ghi chú |
|----|-----------|-------------------|---------------------------------------------------|--------------------|--------------------------------------|----------|---------|
| ST-1.AC-1 | DB thử riêng, chạy migration, SQL role_permissions | Test integration + SQL | `migration-before-after.json`, `reports-permissions.log` | CASHIER view_shift, MANAGER view_branch, OWNER view_all, admin không có, quyền cũ giữ | `docs/api-spec.md:137` (admin 403) | Đúng | |
| ST-1.AC-2 | DB thử có sẵn quyền/link + hóa đơn/payment; up, down, up | Test integration | `migration-before-after.json`: UUID có sẵn giữ nguyên, `down` ném đúng Error, dữ liệu nguyên vẹn, up lại không thêm dòng | Như plan | pattern từ chối rollback ở `20261106000000-Sales.ts` | Đúng | |
| ST-2.AC-1 | HTTP + SQL độc lập | Dựng CASH/TRANSFER/0đ/OPEN/CANCELLED, hủy CASH qua API hiện hành | `totals-before-after.json`, `totals-sql.json`: trước hủy 3/35000/50000/85000; sau hủy 2/0/50000/50000; khớp SQL | Như E2E-AC-1 | `docs/BUSINESS_RULES.md:198-200`, `:150` | Đúng | |
| ST-2.AC-2 | HTTP + sandbox | Nhận thừa; MAX_SAFE; MAX_SAFE+1 | `overflow-log.txt`, `sandbox-http-results.json`: không tính phần nhận thừa; MAX_SAFE chính xác; MAX_SAFE+1 trả 500, không `data`, có log | Như plan | `docs/api-spec.md:246` | Đúng | Nhánh chỉ riêng chart vượt an toàn: chỉ có chứng cứ từ test dự án, lượt QA chạy HTTP cho cash/total và bestSeller |
| ST-2.AC-3 | HTTP login thật ma trận vai trò/ID | 33 ca, đối chiếu SQL | `scope-http.json`, `scope-db.json`: 33/33 khớp (401, 403, 404, cross-store, admin) | Như E2E-AC-3 | `docs/api-spec.md:135,137,165`; `docs/BUSINESS_RULES.md:201,203` | Đúng | Ca cùng store khác chi nhánh trả 404 (khớp api-spec, plan không nêu mã; B-54) |
| ST-2.AC-4 | HTTP ca mở/đóng/người khác/qua nửa đêm | | `midnight-http.json`: ca mình mở/đóng 200; ca người khác 403; ca qua nửa đêm đúng ngày | Như plan | `docs/BUSINESS_RULES.md:201` | Đúng | |
| ST-2.AC-5 | HTTP range/validation | 1/7/31/32 ngày, đảo, ngày sai lịch, mảng, field lạ, body | `ranges-http.json`: 1/7/31 nhận; còn lại 422 envelope + details | Như plan | `docs/api-spec.md:253` | Đúng | |
| ST-2.AC-6 | HTTP + SQL, 12 size, đổi tên, topping, tie | | `bestseller-http.json`, `bestseller-db.json`, `ui-topping-35000.json`: top 10, topping tính một lần, tên snapshot mới nhất, tie theo tên/size/UUID | Như plan | BR-66 `docs/BUSINESS_RULES.md:202` | Lệch tài liệu | Xem V1-2; hành vi đúng plan |
| ST-2.AC-7 | Đồng thời + lỗi nội bộ | 960 GET song song với ghi đồng thời; lỗi DB ép | `consistency-trace.json` (0 response lai), `readonly-requestid.json` | Như plan | `docs/api-spec.md:253` (lỗi/requestId) | Đúng | |
| ST-3.AC-1 | UI thật + API thật, các quyền | | `ui-live-1.json`: tab/request theo quyền, không banner demo, admin bị chặn | Như plan | `DESIGN.md:508,839` | Đúng | |
| ST-3.AC-2 | UI thật, đồng hồ 13/11 18:00Z, >100 ca | | `clock-defaults.json`; 106 ca, "Tải thêm ca" chạy dưới StrictMode (`ui-sbx.json`); `ui-staff-shift.json` | Ngày 14/11, chart 08..14, current ưu tiên, tải thêm | `.devloopflow/specs/shifts.md` (theo spec) | Đúng | |
| ST-3.AC-3 | UI thật, lọc | | `ui-live-2.json`, `ui-range-edge.json`: khoảng 32 ngày lỗi gắn ô, không gửi request | Như plan | | Đúng | |
| ST-3.AC-4 | Đo thật 1024×768 và 1280×800 | | `accessibility-measurements.json`, `touch-measurements.json`, `touch-scroll-check.json`, `contrast-gaps.json`, `tablet-1024.png`, `tablet-1280.png`: control 48px, không tràn, bàn phím/cảm ứng cuộn được chart, tương phản đạt | Như plan | `DESIGN.md:33,141,839` | Đúng | Ô ngày hiển thị theo locale trình duyệt (`11/14/2026` ở Chrome headless en-US), tài liệu không quy định; bố cục chỉ số là danh sách dọc, không phải "hàng chỉ số nhỏ" như `DESIGN.md:363` (plan không đặt AC) |
| ST-3.AC-5 | UI thật, lỗi có/không message | Bước 11 trong `ui-live-2.json`, `scripts/ui-live-2.mjs` | UI hiện `Có lỗi xảy ra. Vui lòng thử lại. (Mã yêu cầu: req-reports-2)` khi body thiếu `message` | Fallback `Không tải được báo cáo. Vui lòng thử lại.` khi thiếu message | Plan ST-3.AC-5; `POS_UI/src/http/client.ts:45` | Sai | Xem V1-1 |
| ST-3.AC-6 | UI thật hai phiên, request A pending trả muộn | | `pending-race.log`, `identity-network.json`, `session-transition-before-after.png`, `auxiliary-before-after.png`: leakLog rỗng | Như plan | `.devloopflow/errors/20261114-backlog-stale-list-test-settled-request.md` | Đúng | |
| E2E-AC-1 | = ST-2.AC-1 | | `totals-before-after.json`, `totals-sql.json` | | | Đúng | |
| E2E-AC-2 | Bốn mốc nửa đêm | DB thử + HTTP (chỉ dựng được trên DB thử vì `paid_at` do server ghi `now()`) | `midnight-http.json`, `midnight-db.json`: ngày 14 = 50000, count 2 | Như plan | `docs/BUSINESS_RULES.md:199` (BR-63) | Đúng | Nhãn: test tích hợp, DB thử |
| E2E-AC-3 | = ST-2.AC-3 + ST-2.AC-4 | | `scope-http.json`, `scope-db.json` | | | Đúng | |
| E2E-AC-4 | 12 size, range không chứa date, topping 35000 | | `bestseller-http.json`, `chart-values.json`, `chart-bestsellers.png` | Như plan | BR-66 `docs/BUSINESS_RULES.md:202` | Lệch tài liệu | Xem V1-2; hành vi đúng plan |
| E2E-AC-5 | UI thật tablet | | `network-redacted.json`, `tablet-1024.png`, `tablet-1280.png`, `ui-states-before-after.png` | Như plan | | Đúng | Lỗi mạng khi đọc báo cáo hiện thông báo của HTTP client dùng chung (viết cho thao tác ghi: "Chưa xác nhận được kết quả…") |
| E2E-AC-6 | = ST-3.AC-6, hai tab, reload, truy cập trực tiếp khi không quyền | | `pending-race.log`, `identity-network.json` | | | Đúng | |

## Đối chiếu spec (cấp tính năng)
| Mục của spec | Loại | AC hoặc bước đã chạy | Kết quả thật | Kết luận |
|---|---|---|---|---|
| Chỉ tính hóa đơn `PAID` theo `invoices.paid_at` ở `Asia/Ho_Chi_Minh`; OPEN/CANCELLED không tính | mục tiêu | ST-2.AC-1, E2E-AC-1, E2E-AC-2 | `totals-before-after.json`, `midnight-http.json` | Đúng |
| Tổng doanh thu = tiền mặt + chuyển khoản; số hóa đơn gồm 0đ | mục tiêu | ST-2.AC-1, ST-2.AC-2 | `totals-before-after.json`, `overflow-log.txt` | Đúng |
| Giới hạn theo permission và danh tính; chặn PLATFORM_ADMIN và ngoài store | mục tiêu / ràng buộc | ST-2.AC-3, E2E-AC-3 | `scope-http.json` 33/33 | Đúng |
| CASHIER xem ca của mình (mở và đóng) | mục tiêu | ST-2.AC-4, ST-3.AC-2 | `midnight-http.json`, `ui-sbx.json` | Đúng |
| Biểu đồ khoảng riêng, mặc định 7 ngày, tối đa 31 | mục tiêu | ST-2.AC-5, ST-3.AC-3 | `ranges-http.json`, `ui-range-edge.json` | Đúng |
| Top 10 dòng món/size; gộp cùng size; doanh thu gồm topping trước giảm giá | mục tiêu | ST-2.AC-6, E2E-AC-4 | `bestseller-http.json`, `ui-topping-35000.json` | Lệch tài liệu (BR-66, xem V1-2) |
| UI dùng API thật, không dữ liệu cũ khi đổi phiên/bộ lọc | mục tiêu | ST-3.AC-1, ST-3.AC-6 | `ui-live-1.json`, `pending-race.log` | Đúng |
| Giữ message và requestId, fallback khi thiếu | ràng buộc | ST-3.AC-5 | `ui-live-2.json` bước 11 | Sai (V1-1) |
| Phi mục tiêu: PB-15, tab Sổ kho, PB-14, SePay Live, lợi nhuận, giờ cao điểm, tuần/tháng | phi mục tiêu | Rà diff `git status` | Không có thay đổi ngoài phạm vi trong danh sách file | Đúng (không làm thừa) |
| Phản mục tiêu: mock trình bày như thật; tổng sai/tràn; lộ dữ liệu ca/chi nhánh/store/phiên khác; đơn hủy vẫn tính | phản mục tiêu | ST-2.AC-1..4, ST-3.AC-6 | `totals-before-after.json`, `scope-http.json`, `pending-race.log` | Đúng (không rơi vào) |

## FAIL / bug
- V1-1: ST-3.AC-5 — Sai.
  - Bước tái hiện: đăng nhập UI thật, mở Báo cáo, ép API trả lỗi 500 không có `message` (`{error:{code,requestId}}`); xem bước 11 trong `evidence/ui-live-2.json` hoặc chạy `evidence/scripts/ui-live-2.mjs`.
  - Kỳ vọng (plan ST-3.AC-5): thiếu message thì hiện `Không tải được báo cáo. Vui lòng thử lại.` và giữ requestId.
  - Thực tế: UI hiện `Có lỗi xảy ra. Vui lòng thử lại. (Mã yêu cầu: req-reports-2)`. Chuỗi do `POS_UI/src/http/client.ts:45` gán khi body thiếu `message`, nên fallback ở `DailyReportScreen.tsx:164` không bao giờ chạy trên luồng thật. Danh sách ca thiếu message cũng hiện chuỗi chung này.
  - Vì sao test dự án xanh: `reports-screen.test.mjs:260` giả `reportService` ném lỗi không có `message`, bỏ qua HTTP client thật.
  - Path bằng chứng: `evidence/ui-live-2.json`, `evidence/scripts/ui-live-2.mjs`.
  - Test tái hiện đề xuất: `test_ST3_AC5_fallback_through_real_client` | input: render `DailyReportScreen` với HTTP client thật, `fetch` trả 500 `{error:{code:'INTERNAL_ERROR',requestId:'req-reports-2'}}` | mong đợi: alert chứa `Không tải được báo cáo. Vui lòng thử lại. (Mã yêu cầu: req-reports-2)`.
  - Hướng xử lý (user hoặc agent chính quyết): sửa AC cho khớp hành vi chung của client, hoặc cho màn báo cáo phân biệt lỗi thiếu message của máy chủ (client chung đặt chuỗi mặc định, nên cần nhận biết).
- V1-2 và V1-3 là "Lệch tài liệu", xem bên dưới.

## Lệch tài liệu
- ST-2.AC-6 và E2E-AC-4 (V1-2): Plan nói (nguyên văn, mục "Mục tiêu và bối cảnh"/Phạm vi): triển khai PB-12 và lát cắt PB-13 Báo cáo gồm món bán chạy | Tài liệu nói (nguyên văn): `docs/BUSINESS_RULES.md:202` "| BR-66 | Lợi nhuận gộp, món bán chạy, giờ cao điểm, báo cáo tuần và tháng. | GĐ2 |" và `docs/PRODUCT_OVERVIEW.md:75` "- Báo cáo tuần và tháng, món bán chạy, giờ cao điểm, lợi nhuận gộp." (mục ngoài MVP). Sprint 10 lấy món bán chạy theo quyết định Product Owner ngày 14/11 (`docs/PRODUCT_BACKLOG.md:7`, `sprints/sprint-10/SPRINT.md:10`). Không chọn bên nào; cần user xác nhận rồi sửa tài liệu qua sync-docs.
- Spec/tài liệu (V1-3): `docs/api-spec.md:491` vẫn ghi `/reports` và trỏ `.devloopflow/specs/legacy-reports.md` (không tồn tại). Plan đã hẹn sửa bằng sync-docs (bước 10b).

## Đánh giá test
- Test dự án xanh nhưng không bắt V1-1 vì giả `reportService`; cần test đi qua HTTP client thật.
- Nhánh chart vượt an toàn (daily) chỉ có chứng cứ từ test dự án.
- Browser test của TDD dùng AuthContext và `fetch` giả; lượt QA đã bù bằng UI thật + API thật (`ui-live-*.json`).

## Exploratory
- Lỗ ca người khác/cross-store/admin/field lạ/mảng/body: `exploratory-http.json`.
- Tương phản màu: `contrast-gaps.json`.
- Ca nhân viên (STAFF) không được chọn làm ca doanh thu CASHIER: `ui-staff-shift.json`.
- Ngày rỗng, topping 35000: `ui-empty-day.json`, `ui-topping-35000.json`.
- Mỗi lỗi cũ liên quan được phủ bằng một case: scope chi nhánh (`scope-http.json`), message/requestId (`ui-live-2.json`), request cũ pending thật (`pending-race.log`), nhiều ca (`ui-sbx.json`), clock (`clock-defaults.json`, `midnight-db.json`).

## Đề xuất
- Quyết định V1-1: sửa AC hoặc sửa mã (cần user quyết).
- Quyết định V1-2: xác nhận món bán chạy thuộc MVP/Sprint 10, rồi sửa BR-66 và `PRODUCT_OVERVIEW.md:75` qua sync-docs.
- Sửa V1-3 trong sync-docs (bước 10b).
- Dữ liệu thử còn lại trong `pos_local` (tiền tố `ac-s10-`): 2 store `ac-s10-storeA/B`, 9 user `ac-s10-*`; hóa đơn 10 PAID, 2 CANCELLED, 1 OPEN; 3 ca thu ngân còn mở (`ac-s10-cashA1`, `cashA2`, `cashB`; ca `cashA1` có hóa đơn OPEN nên không đóng được). Chưa dọn vì giới hạn an toàn cấm UPDATE/DELETE.
- Evidence thô: `.devloopflow/verify/20261114-sprint10-reports/evidence/` (`run-manifest.json`, `SHA256SUMS`, 140 dòng).
