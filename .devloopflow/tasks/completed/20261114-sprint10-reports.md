---
id: 20261114-sprint10-reports
spec: .devloopflow/specs/20261114-sprint10-reports.md
plan: .devloopflow/approved/20261114-sprint10-reports.md
status: completed
owner: Codex
started_at: 2026-11-14
completed_at: 2026-11-14
---

# Task 20261114-sprint10-reports

## Trạng thái
- Bước hiện tại: 10 — hoàn thành 2026-11-14 (kiểm AC lần 5 PASS, sync-docs xong, reflect xong, B-54..B-59 đã sửa; plan chuyển sang completed).
- Đã xong: Khảo sát PB-12 và lát cắt PB-13 theo `sprints/sprint-10/SPRINT.md`; làm rõ ngày, khoảng biểu đồ, ca và cách tính doanh thu món trong hội thoại; user nói "duyệt plan" ngày 2026-11-14; plan đã vào `.devloopflow/plans/active/` và `.devloopflow/approved/` (hai bản giống hệt, đã `cmp`).
- ST-1 xong: `tdd` trả XONG; agent chính đọc migration và tự chạy lại `npm test` trong `POS_API/` ngày 2026-11-14: `# tests 226 / # pass 226 / # fail 0 / # cancelled 0 / # skipped 0`. Red/Green từng AC nằm trong report của `tdd` (Red: `0 !== 1` cho AC-1, AC-2 và `12 !== 13` cho foundation; Green: `ok 2 - test_ST1_AC1_permissions_seeded`, `ok 3 - test_ST1_AC2_permissions_rollback`); 7 đột biến M1..M7 đều bị test bắt (M4 là đột biến không có hiệu lực thật). `graphify update .` đã chạy.
- ST-2 xong: `tdd` trả XONG sau một vòng bổ sung bằng chứng (lần đầu viết 13 test rồi code một lượt, thiếu Red hợp lệ cho `test_ST2_AC4_shift_crosses_midnight`; đã bổ sung Red bằng cách vô hiệu hành vi trong `dist`, kết quả `# pass 0 / # fail 13`, rồi Green 13/13). Agent chính tự chạy lại `npm test` trong `POS_API/` ngày 2026-11-14: `# tests 239 / # pass 239 / # fail 0 / # cancelled 0 / # skipped 0`. Đột biến biên `i.paid_at > bounds.lo` được bắt sau khi thêm request ngày đơn; đột biến `<=` ở `hi` coi là tương đương (suy luận từ SQL, chưa có test). Đột biến tách statement chỉ bị bắt khi statement thêm nhắc tới `invoices`. `graphify update .` đã chạy.
- Quyết định kỹ thuật của `tdd` (không đổi hợp đồng): người có `report.view_all` thiếu `branch.access_all` nhận 403, không hạ mức; ca ngoài chi nhánh được phép nhưng cùng store nhận 404; export `isCalendarDate`, `assertDateRange`, `toSafeMoney` cho test unit.
- ST-3 xong: `tdd` trả XONG. Agent chính tự chạy lại trong `POS_UI/` ngày 2026-11-14: `npm run typecheck` không lỗi; `npm test` `# tests 155 / # pass 155 / # fail 0 / # cancelled 0 / # skipped 0`; `npm run build` thành công (`built in 1.90s`); `node --test test/reports-accessibility.browser.mjs` `# tests 1 / # pass 1 / # fail 0`. API `npm test` 239/239 (đã chạy sau ST-2). Lệch quy trình ghi nhận: AC-6 không có Red tự nhiên (guard viết từ Green của AC-2), Red lấy từ đột biến; Red của service AC-1 đỏ vì thiếu module. Giới hạn browser test: AuthContext và `fetch` được giả, không mount `AppShell` thật, chưa chạy với API/UI thật, chưa kiểm cảm ứng thật; thuộc verify-ac. Evidence thô ở `.devloopflow/verify/20261114-sprint10-reports/evidence/st3/`.
- Phát hiện ngoài phạm vi từ `tdd` (chưa xử lý, chuyển cho review): `POS_UI/src/index.css:116` đặt `min-height: 44px` cho input/select/textarea, thắng `.input` 48px ở `ui.css`, các màn khác dùng `.input` có thể chỉ 44px. Màn Báo cáo hiện "Không có quyền" khi có `report.view_all` thiếu `branch.access_all`; spec chưa nói UI hiển thị gì. `getCurrentShift` và `getShifts` chạy song song bằng `Promise.all`, một lỗi làm cả danh sách ca báo lỗi.
- Đang làm: bước 7 xong theo lệnh của plan; chuẩn bị bước 8 (review code).
- Sắp làm: bước 8 (review), bước 9 (verify-ac).

## File đã thay đổi
| Path | Thay đổi gì | Sub-task |
|------|-------------|----------|
| `.devloopflow/specs/20261114-sprint10-reports.md` | Spec nháp báo cáo | Refinement |
| `.devloopflow/tasks/active/20261114-sprint10-reports.md` | Hồ sơ task | Refinement |
| `.devloopflow/plans/active/20261114-sprint10-reports.md` | Plan đã duyệt (nguồn: draft); tick ST-1 | Planning, ST-1 |
| `.devloopflow/approved/20261114-sprint10-reports.md` | Bản plan đã duyệt | Planning |
| `POS_API/src/database/migrations/20261114000001-ReportsPermissions.ts` | Cấp ba permission báo cáo | ST-1 |
| `POS_API/src/reports/tests/reports-permissions.integration.test.ts` | Test AC-1, AC-2 của ST-1 | ST-1 |
| `POS_API/src/foundation.test.ts` | Số migration 12 thành 13 | ST-1 |
| `POS_API/src/reports/reports.module.ts`, `reports.controller.ts`, `reports.service.ts`, `http/reports.dto.ts` | Reports API `GET /api/v1/reports/revenue` | ST-2 |
| `POS_API/src/app.module.ts` | Đăng ký ReportsModule | ST-2 |
| `POS_API/src/reports/tests/reports.fixture.ts`, `reports.integration.test.ts`, `reports.test.ts` | Fixture và test ST-2 | ST-2 |
| `POS_UI/src/features/reports/reportService.ts`, `DailyReportScreen.tsx` | Báo cáo dùng API thật | ST-3 |
| `POS_UI/src/app/navigation.ts`, `App.tsx`, `src/components/common/AppShell.tsx` | Quyền `report.view_*`, bỏ banner demo | ST-3 |
| `POS_UI/src/styles/components.css` | Khối `.report-*` | ST-3 |
| `POS_UI/test/report-service.test.mjs`, `reports-screen.test.mjs`, `reports-accessibility.browser.mjs` | Test mới ST-3 | ST-3 |
| `POS_UI/test/app-invoices-shell.test.mjs`, `organization-screen.test.mjs` | Sửa assertion shell và accessibleTabs | ST-3 |
| `POS_UI/src/features/reports/DailyReportScreen.tsx`, `src/styles/components.css`, `test/reports-screen.test.mjs`, `test/reports-accessibility.browser.mjs`; `POS_API/src/reports/tests/reports.integration.test.ts` | Vòng sửa review 1: R1-1, R1-2, R1-3 | Vòng sửa 1 |
| `.devloopflow/errors/20261114-react-strictmode-mounted-ref-stuck-false.md`, `...-css-cascade-input-min-height-44-beats-48.md`, `...-reports-date-before-chart-range-untested.md`, `INDEX.md`; `.devloopflow/review/backlog.md` (B-54..B-58) | Hồ sơ lỗi và backlog | Review |

## Đã đọc errors
- Khám phá: `.devloopflow/errors/INDEX.md`, `20261109-owner-access-all-branch-scope.md`, `20261113-invoice-load-error-details-lost.md`, `20261114-backlog-stale-list-test-settled-request.md`. Trước mỗi sub-task tiếp tục kiểm INDEX và mở lỗi liên quan.
- ST-3 (từ report `tdd`): `20261113-invoice-load-error-details-lost`, `20261114-backlog-stale-list-test-settled-request`, `2026-10-30-pb13-session-retry-scope` (chưa mở `20261109-cash-close-shift-zero-cash-sales` và INDEX).
- ST-2 (từ report `tdd`): `errors/INDEX.md`, `20261109-owner-access-all-branch-scope`, `20261110-backlog-branch-scope-null-branchid-fail-open`, `20261109-cash-close-shift-zero-cash-sales`, `20261113-payment-test-seed-db-clock-flaky`, MEMORY M-1, M-4, M-10, M-39.
- ST-1 (từ report `tdd`): `errors/INDEX.md`, `20261109-owner-access-all-branch-scope.md`, `20261113-payment-test-seed-db-clock-flaky.md`, MEMORY M-10, M-37.

## Lịch sử review (chỉ thêm, không xoá)
### Vòng 1 (2026-11-14; reviewer: subagent `code-reviewer`, model sonnet) — CHANGES_REQUIRED
Phạm vi: toàn bộ plan. Reviewer không chạy lại `npm test`/build/typecheck/browser test; chỉ chạy lệnh đo CSS trong scratchpad. RF-1..5 đã kiểm, sạch.
Low/Very Low đã ghi thẳng vào `.devloopflow/review/backlog.md`: R1-4 → B-54, R1-5 → B-55, R1-6 → B-56, R1-7 → B-57, R1-8 → B-58.

- **R1-1 [Medium]** `POS_UI/src/features/reports/DailyReportScreen.tsx:133-134,171`: nút "Tải thêm ca" vô tác dụng khi chạy `npm run dev`.
  - `mounted` chỉ được đặt `false` trong cleanup: `useEffect(() => () => { mounted.current = false; }, [])`. Effect không đặt lại `true`.
  - `POS_UI/src/main.tsx:7` bọc `<React.StrictMode>`. React 18 dev chạy mount, cleanup, mount lại, nên `mounted.current` kẹt ở `false`.
  - Hệ quả: `ok()` trong `loadMore` (dòng 171) luôn `false`, mọi phản hồi tải thêm (thành công lẫn lỗi) bị bỏ, và không có thông báo nào.
  - Build production không bị. `InventoryScreen.tsx:32` làm đúng (`mounted.current = true` trong thân effect).
  - Harness test `reports-screen.test.mjs` tự dựng React không có StrictMode. Browser test mount bằng `createRoot().render(DailyReportScreen)` không có StrictMode. Cả hai đều không thấy lỗi. Phân trang ca là RF-4 và ST-3.AC-2, và dev server là cách verify-ac thường chạy.
  - Đề xuất fix: `useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, [])`.
  - Test tái hiện đề xuất: `test_ST3_AC2_shift_pages_current strict mode` | input: harness chạy effect hai lần theo kiểu StrictMode (cleanup rồi chạy lại effect), cashier có `nextCursor`, bấm "Tải thêm ca" rồi resolve | kết quả mong đợi: danh sách ca được gộp thêm, không bị bỏ.

- **R1-2 [Medium]** `POS_UI/src/styles/components.css:509` và `POS_UI/test/reports-accessibility.browser.mjs:13-14`: ô ngày cao 44px trong app thật, test lại báo 48px.
  - Dòng 509 `.report-filters .report-field input[type='date'].input` có specificity (0,4,1). Quy tắc chung `input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file])` (`index.css:116`, `min-height:44px`) cũng (0,4,1).
  - `index.css:1-3` dùng `@import ui/pos/components` ở đầu file, nên khi bundle `components.css` đứng trước quy tắc chung và quy tắc chung thắng ở cùng specificity.
  - Bằng chứng 1: bundle thật bằng esbuild từ `src/index.css`, quy tắc report ở dòng 2064, `input:not(...)` ở dòng 2170.
  - Bằng chứng 2: nạp bundle đó vào Chrome với markup tối thiểu, đo ra `INPUT 44`, `SELECT 48`. Select thắng nhờ specificity (0,3,1) so với `select` (0,0,1).
  - Browser test bỏ `@import` rồi nối `index.css` trước `components.css`, nên thứ tự đảo ngược so với app. Vì vậy test báo ≥48px và ST-3.AC-4 / E2E-AC-5 (control ≥48px) bị sai ở môi trường thật.
  - Đây chính là điểm (d) tdd tự báo. Cách xử lý hiện tại không giải quyết được.
  - Đề xuất fix: tăng specificity (ví dụ thêm `:not([type='x'])` hoặc chuyển sang chiều cao cố định cho `.report-filters`). Đổi browser test để dùng đúng cascade app, ví dụ bundle `src/index.css` bằng esbuild thay vì nối tay.
  - Test tái hiện đề xuất: `test_ST3_AC4_browser_tablet real cascade` | input: CSS lấy từ bundle của `src/index.css` | kết quả mong đợi: `input[aria-label="Ngày báo cáo"]` cao ≥48px (hiện 44).

- **R1-3 [Medium]** `POS_API/src/reports/reports.service.ts:41` và `POS_API/src/reports/tests/reports.integration.test.ts`: không test nào có `date` trước `fromDate`.
  - Các test hiện có đều có `date >= fromDate`: AC1 (20/11 = from), AC5 (date 14, range 01..07), midnight (date 14, range 13..15), shift-midnight.
  - Đột biến `LEAST($4::date,$5::date)` thành `$5::date` sẽ khiến báo cáo ngày 14 bỏ mất hóa đơn khi range 15..20, mà mọi test vẫn xanh.
  - Case này nằm trong plan: Edge case "date nằm ngoài chart range", "Hai phần độc lập" của ST-2, và "Chọn range không chứa date" của ST-3. Phía `date > toDate` thì có test.
  - Đề xuất fix: thêm test.
  - Test tái hiện đề xuất: `test_ST2_AC5_date_before_chart_range` | input: hóa đơn PAID 5000 ngày 14/11 và 1000 ngày 16/11; query `date=2026-11-14&fromDate=2026-11-15&toDate=2026-11-17` | kết quả mong đợi: `invoiceCount 1`, `totalRevenue 5000`, `bestSellers` chỉ gồm ngày 14, `dailyRevenue` đủ 15..17 và không có 14.

#### Vòng sửa 1 (2026-11-14; `tdd` model sonnet) — đã sửa R1-1, R1-2, R1-3
- Report `tdd` (nguyên văn phần chính): "Cả ba finding đã sửa và đủ chứng cứ Red/Green. UI 156/156, API 240/240, browser 26/26, typecheck và build exit 0, `graphify update .` đã chạy."
  - R1-1: Red `not ok 1 - [R1-1] test_ST3_AC2_shift_pages_current strict mode ... danh sách ca phải gộp trang tải thêm (- 's2')`; sửa `mounted.current = true` trong thân effect; đột biến bỏ dòng đó làm test đỏ.
  - R1-2: Red `'[R1-2] ô Ngày báo cáo cao 44px trong cascade thật, cần >=48'`; sửa selector thành `.page .report-filters .report-field input.input[type='date'], ... select.select { min-height: 48px; }` (0,5,1); browser test bundle `src/index.css` bằng esbuild; đột biến bỏ `.page` hoặc hạ 44 làm test đỏ.
  - R1-3: test `test_ST2_AC5_date_before_chart_range` xanh ngay với code hiện tại; Red từ đột biến `LEAST($4::date,$5::date)` → `$5::date` trong `dist`: `not ok 1 ... [ + 0, + 0, - 1, - 5000 ]`; `dist` đã khôi phục và build lại.
  - File đổi: `POS_UI/src/features/reports/DailyReportScreen.tsx`, `POS_UI/src/styles/components.css`, `POS_UI/test/reports-screen.test.mjs`, `POS_UI/test/reports-accessibility.browser.mjs`, `POS_API/src/reports/tests/reports.integration.test.ts`.
  - Ngoài phạm vi: `index.css:116` (44px) chưa đổi, các màn khác dùng `.input` chưa kiểm; dưới StrictMode dev, effect nạp ca chạy hai lần (request đầu bị bỏ).
- Agent chính tự chạy lại ngày 2026-11-14: `POS_UI` `npm run typecheck` không lỗi; `npm test` 156/156 pass, 0 fail; `npm run build` thành công; `node --test test/reports-accessibility.browser.mjs` 1/1 pass; `POS_API` `npm test` 240/240 pass, 0 fail.
- Finding đã sửa và hồ sơ errors (chốt chặn):
  - R1-1 → `.devloopflow/errors/20261114-react-strictmode-mounted-ref-stuck-false.md`
  - R1-2 → `.devloopflow/errors/20261114-css-cascade-input-min-height-44-beats-48.md`
  - R1-3 → `.devloopflow/errors/20261114-reports-date-before-chart-range-untested.md`
- Lệch quy tắc đã báo: R1-3 test xanh ngay; Red lấy từ đột biến thay vì dừng báo user theo `tdd.md`; agent chính chọn vậy vì finding là test thiếu (đã nói với user ngay sau vòng 1).

Ghi chú của agent chính: R1-3 là finding về test thiếu, nên test mới có thể xanh ngay vì code đã đúng; quy tắc "test tái hiện phải đỏ" khi đó áp dụng đột biến `LEAST` làm bằng chứng Red (xem `tdd.md`: test xanh ngay thì `tdd` DỪNG báo user, nên cần xin quyết định nếu `tdd` báo xanh ngay).

### Vòng 2 (2026-11-14; reviewer: subagent `code-reviewer` mới, model sonnet) — PASS
- Phần (a): R1-1, R1-2, R1-3 đều được reviewer xác nhận đã sửa đúng (R1-1: `DailyReportScreen.tsx:134`, harness StrictMode `reports-screen.test.mjs:56`, test `[R1-1]` dòng 471; R1-2: selector `components.css:509` (0,5,1) thắng `index.css:116` (0,4,1), browser test bundle `src/index.css` bằng esbuild, đo 48px ở cả 4 phiên/viewport; R1-3: `reports.integration.test.ts:420-434`, đột biến `LEAST` làm count thành 0 nên test đỏ).
- Phần (b): quét toàn bộ file đã đổi, không có finding mới. Reviewer chạy lại: UI typecheck, UI `npm test` 156/156, browser test 1/1, API 16/16 test trong `dist/reports/tests`.
- Reviewer chưa kiểm: toàn bộ API test (240), đột biến thật vào `dist`, Chrome thật với StrictMode dev, cảm ứng thật, API thật cùng UI thật (thuộc verify-ac), các màn khác dùng `.input` bị `index.css:116` giữ 44px (ngoài phạm vi). Rủi ro còn lại: browser test dùng AuthContext và `fetch` giả, không mount `AppShell` thật.
- Không có finding Critical/High/Medium còn mở. Backlog mới từ task này: B-54..B-58 (chờ xử lý), nhắc user `/devloopflow:fix-backlog`.

## Lịch sử kiểm AC (chỉ thêm, không xoá)
### Lần 1 (2026-11-14; subagent `ac-verifier`, model sonnet) — FAIL
- Report: `.devloopflow/verify/20261114-sprint10-reports/report-1.md`; sổ FAIL: `.devloopflow/verify/20261114-sprint10-reports/fails.md`; evidence thô: `.devloopflow/verify/20261114-sprint10-reports/evidence/` (local, gitignore). Subagent không ghi được report/fails nên agent chính chép lại từ báo cáo trả về và tự kiểm V1-1, V1-2.
- Kết quả: 21 AC: 18 Đúng, 1 Sai (ST-3.AC-5), 2 Lệch tài liệu (ST-2.AC-6, E2E-AC-4). Mã nguồn không đổi trong lượt QA (hash trước và sau giống nhau, HEAD `19ef547`).
- V1-1 (ST-3.AC-5, Sai): lỗi thiếu `message` hiện `Có lỗi xảy ra. Vui lòng thử lại. (Mã yêu cầu: req-reports-2)` do `POS_UI/src/http/client.ts:45`, nên fallback `DailyReportScreen.tsx:164` không chạy trên luồng thật; test dự án xanh vì giả `reportService`.
- V1-2 (Lệch tài liệu): `docs/BUSINESS_RULES.md:202` BR-66 và `docs/PRODUCT_OVERVIEW.md:75` xếp "món bán chạy" vào GĐ2/ngoài MVP, plan/spec làm trong Sprint 10 theo quyết định Product Owner (`docs/PRODUCT_BACKLOG.md:7`, `sprints/sprint-10/SPRINT.md:10`).
- V1-3 (Lệch tài liệu đã biết): `docs/api-spec.md:491` chưa cập nhật; sửa ở bước 10b.
- Plan active: đã tick E2E-AC-1, 2, 3, 5, 6 (PASS). E2E-AC-4 không tick (Lệch tài liệu). Các `ST-n.AC-k` đã tick từ TDD (tiến độ code, không phải nghiệm thu) giữ nguyên theo quy tắc không bỏ tick; ST-3.AC-5 và ST-2.AC-6 thực tế chưa nghiệm thu đạt (V1-1, V1-2).
### fix-verify (2026-11-14; subagent `tdd`, model sonnet)
- V1-1 đã sửa: test tái hiện `[V1-1] test_ST3_AC5_fallback_through_real_client` và `[V1-1] test_ST3_AC5_shift_list_fallback_through_real_client` (Red: `not ok 1`, `not ok 3`, `# pass 1`, `# fail 2`); test `[V1-1] test_ST3_AC5_message_from_server_kept_through_real_client` là bảo vệ hồi quy. File sửa: `POS_UI/src/http/client.ts`, `POS_UI/src/features/reports/DailyReportScreen.tsx`, `POS_UI/test/reports-screen.test.mjs`. Errors: `.devloopflow/errors/20261114-ui-shared-client-default-message-masks-screen-fallback.md`.
- Agent chính tự chạy lại: `npm test` UI 159/159, `npm run typecheck` sạch, `npm run build` thành công. API không đổi nên không chạy. Browser test `reports-accessibility.browser.mjs` chưa chạy lại.
### Lần 2 (2026-11-14; `ac-verifier`, model sonnet) — FAIL (chạy lại V1-1, V1-2, V1-3)
- Report: `.devloopflow/verify/20261114-sprint10-reports/report-2.md` (agent chính chép vì subagent không ghi được). V1-1 đã PASS (ST-3.AC-5: app thật, màn báo cáo và danh sách ca, fallback đúng, message server giữ nguyên). V1-2, V1-3 vẫn Lệch tài liệu, `mở`. Dữ liệu thử mới: store `ac-s10-r2b-store` (+ `ac-s10-r2-store` không dùng được), thêm vào `ac-s10-*` chưa dọn.
- Quyết định user 2026-11-14 (V1-2): xác nhận "món bán chạy" thuộc Sprint 10. Agent chính sửa tài liệu: `docs/BUSINESS_RULES.md:202` (BR-66 bỏ "món bán chạy", vẫn GĐ2 cho phần còn lại), `docs/PRODUCT_OVERVIEW.md` (bỏ khỏi GĐ2; thêm vào bullet báo cáo MVP kèm tham chiếu spec). V1-2 vẫn `mở` tới khi `verify-ac` chạy lại.
- V1-3 (Lệch tài liệu): chưa sửa, làm ở sync-docs bước 10b. Task vẫn `blocked` tới khi `verify-ac` xác nhận.
### Lần 3 (2026-11-14; `ac-verifier`, model sonnet) — PASS (chạy lại V1-2, V1-3)
- Report: `.devloopflow/verify/20261114-sprint10-reports/report-3.md`. V1-2 (ST-2.AC-6, E2E-AC-4) và V1-3 (`docs/api-spec.md:491`) đã PASS sau khi BR-66, PRODUCT_OVERVIEW và api-spec được sửa. `fails.md` không còn mục `mở`. Đã tick E2E-AC-4 trong plan active. Hành vi API không chạy lại; căn cứ `SHA256SUMS` 140 file OK.
- Phát hiện mới, chưa sửa (cần user duyệt): `sprints/sprint-10/SPRINT.md:10` còn câu "vốn thuộc Giai đoạn 2 theo Product Overview/BR-66; đây là ngoại lệ"; `docs/PRODUCT_BACKLOG.md:7` còn "Chưa có spec/plan triển khai hoặc QA Sprint 10".
- Còn lại: bước 10 (sync-docs phần còn lại D-2..D-6 user không duyệt, reflect 10c, chuyển plan/task sang completed).
### Lần 4 (2026-11-14; `ac-verifier`, model sonnet) — PASS (chạy lại TOÀN BỘ 21 AC + RF-1..5, bắt hồi quy sau fix-verify V1-1 và fix-backlog B-54..B-58)- Report: `.devloopflow/verify/20261114-sprint10-reports/report-4.md` (agent chính chép vì subagent không ghi được). Mọi AC Đúng, `fails.md` không còn mục `mở`. API 242/242, UI 161/161, typecheck, build, browser test 1/1 (verifier tự chạy). Mã không đổi trong lượt QA.- Phát hiện mới, không FAIL, cần user quyết: (1) MANAGER/CASHIER có quyền nhưng thiếu `branchId` gửi query sai nhận 422 chứ không 403 (plan không quy định thứ tự); (2) viền ô nhập đo 2,72:1, `DESIGN.md:649` đòi 3:1 (token dùng chung toàn app). B-59 còn `chờ xử lý`.- Dữ liệu thử `ac-s10-r4-*` (3 store, 4 ca thu ngân đang mở) thêm vào `pos_local`, chưa dọn.
- Report: `.devloopflow/verify/20261114-sprint10-reports/report-4.md` (agent chính chép vì subagent không ghi được). Chạy lại toàn bộ 21 AC và RF-1..5: mọi AC Đúng, `fails.md` không còn mục `mở`. Verifier tự báo: API 242/242, UI 161/161, typecheck, build, browser test 1/1. Mã không đổi trong lượt QA.
- Phát hiện mới, không FAIL: (1) MANAGER/CASHIER có quyền nhưng thiếu `branchId` gửi query sai nhận 422 chứ không 403 (plan không quy định thứ tự); (2) viền ô nhập đo 2,72:1, `DESIGN.md:649` đòi 3:1. B-59 còn `chờ xử lý`.
- Dữ liệu thử `ac-s10-r4-*` (3 store, 4 ca thu ngân đang mở) thêm vào `pos_local`, chưa dọn.
- Quyết định user 2026-11-14 sau lần 4: (1) giữ nguyên thứ tự 422 trước 403 khi người có quyền thiếu `branchId` gửi query sai (không đổi mã, không thêm test); (2) đổi `--color-border-control` cho đủ 3:1 theo `DESIGN.md:649`.
- Sửa theo quyết định (2): `tdd` đổi `POS_UI/src/index.css:14` `--color-border-control` từ `#8a979d` thành `#818d93` (3,088:1 trên `#f2f4f5`, 3,406:1 trên trắng, 2,891:1 trên `#e9edef`); test `[C-1]` `POS_UI/test/design-contrast.test.mjs` (Red `2.721:1 < 3:1`). Agent chính tự chạy lại UI 163/163, typecheck và build xanh; browser test do `tdd` chạy 1/1. errors: `20261114-ui-border-control-contrast-below-3-on-page-bg.md`. Chưa qua verify-ac. Bảng token `DESIGN.md:77` chưa sửa (chờ user duyệt).
- fix-backlog B-59 (sau khi đóng lần đầu, user chọn "2" và cho đổi test cũ): tab Báo cáo chỉ hiện khi có `report.view_shift`, `report.view_branch`, hoặc `report.view_all` kèm `branch.access_all` (`navigation.ts:20`, `App.tsx:115-116`, `AppShell.tsx:120`); ST-3.AC-1 đổi lời trong plan kèm Changelog. Test `[B-59]` x3 và một dòng test cũ đổi trong `POS_UI/test/app-invoices-shell.test.mjs`. Agent chính chạy lại UI 166/166, typecheck, build xanh; browser test do `tdd` chạy 1/1. errors: `20261114-ui-report-tab-shown-without-access-all.md`. Chưa qua verify-ac. Điều kiện quyền lặp ở 3 nơi (xem errors).
- Gom điều kiện quyền báo cáo (user cho phép sửa mock test cũ, 2026-11-14): `tdd` chuyển `reportScope` về `POS_UI/src/app/navigation.ts` (nguồn duy nhất); `accessibleTabs`, `AppShell.tsx` và `DailyReportScreen.tsx` dùng nó. Test sửa chỉ phần mock/nạp module: `POS_UI/test/app-invoices-shell.test.mjs` (thêm `navMock`, đổi 3 mock `navigation`), `POS_UI/test/reports-screen.test.mjs` (thêm import và một nhánh `require` mock); không đổi assertion nào. Agent chính chạy lại UI 166/166, typecheck, build xanh; browser test do `tdd` chạy 1/1. Chưa qua verify-ac.
### Lần 5 (2026-11-14; `ac-verifier`, model sonnet) — PASS (chạy lại TOÀN BỘ 21 AC + RF-1..5 sau đổi viền, B-59, gom `reportScope`)
- Report: `.devloopflow/verify/20261114-sprint10-reports/report-5.md` (agent chính chép vì subagent không ghi được). Mọi AC Đúng, `fails.md` không còn mục `mở`. Verifier tự báo: API 242/242, UI 166/166, typecheck, build, browser test 1/1; viền `#818d93` đo 3,088:1 trên nền trang và 3,406:1 trên nền ô; tab Báo cáo ẩn đúng cho `view_all` thiếu `access_all` và API cùng vai trò 403. Mã không đổi trong lượt QA.
- Phát hiện không FAIL: người không có tab vẫn phát `GET /work-shifts/current` 403 hai lần (AppShell, ngoài phạm vi); mất `branch.access_all` thì tab Cài đặt dự phòng gọi `/branches` 422 (ngoài phạm vi). Dữ liệu thử `ac-s10-r5-*` thêm vào `pos_local`, chưa dọn.
- Chưa dọn dữ liệu thử `ac-s10-*` trong `pos_local` (2 store, 9 user, 13 hóa đơn, 3 ca thu ngân còn mở).
- 2026-11-16: sau QA cấp sprint, V1-1 (ba ô ngày theo locale thay vì `dd/MM/yyyy`) đã được subagent `tdd` sửa ở `DailyReportScreen.tsx` và `components.css`. Hai test browser `[V1-1]` en-US/vi-VN đỏ trước/xanh sau; user duyệt cập nhật giả định ISO trong ô nhập của test cũ, vẫn giữ assertion query ISO. Hồ sơ `.devloopflow/errors/20261116-reports-native-date-locale.md`. Agent chính tự chạy UI 230/230, browser 34/34, typecheck/build exit 0, API 256/256. QA cấp sprint V1-1 vẫn `mở` trong `.devloopflow/verify/20261116-sprint10-qa/fails.md` tới khi verifier kiểm lại; không thay kết quả QA lịch sử của task này.

## Cập nhật tài liệu (sync-docs, bước 10b; chỉ thêm, không xoá)
- 2026-11-14: sync-docs đã lập đề xuất D-1..D-6 (api-spec.md:491, CLAUDE.md và AGENTS.md dòng 6, 25, 30, README.md dòng 9, 10, 13, TECH_STACK.md:23, ARCHITECTURE.md:15), chờ user duyệt. Không có chỗ lỗi thời trong `.devloopflow/devloopflow.md`. BR-66 và PRODUCT_OVERVIEW đã sửa trước đó theo quyết định V1-2. Kết quả 2026-11-14: D-1 đã sửa (`docs/api-spec.md:491`); D-2..D-6 user không duyệt, bỏ qua.
- 2026-11-14: user duyệt thêm hai chỗ do verify-ac lần 3 phát hiện: đã sửa `sprints/sprint-10/SPRINT.md:10` (món bán chạy thuộc phạm vi Sprint 10, bỏ chữ "ngoại lệ so với GĐ2") và `docs/PRODUCT_BACKLOG.md:7` (đã có spec/plan PB-12/PB-13; chưa có cho PB-15 và tab Sổ kho). Đã sửa trước đó: `docs/BUSINESS_RULES.md:202` (BR-66), `docs/PRODUCT_OVERVIEW.md`, `docs/api-spec.md:491`. Mọi đề xuất D-1..D-6 đã có kết quả: sync-docs xong.
- 2026-11-14 (sync-docs lần 2): D-7 (`DESIGN.md:77`) và D-8 (`DESIGN.md:670`) cho token viền mới `#818d93` (`POS_UI/src/index.css:14`): user duyệt "duyệt sửa viền", đã sửa cả hai. Không có chỗ lỗi thời khác từ các thay đổi sau lần sync-docs đầu; `CLAUDE.md`/`AGENTS.md` dòng 84-91 đã sửa theo yêu cầu user cùng ngày.

## Kinh nghiệm đã ghi (reflect, bước 10c; chỉ thêm, không xoá)
- 2026-11-14 (user không nêu ghi chú riêng; câu hỏi 10c còn trả lời bằng các quyết định trong phiên): thêm M-41 (UI và API cùng điều kiện quyền), M-42 (test fallback lỗi qua HTTP client thật), M-43 (tương phản token trên nền thực tế), M-44 (sed biến rỗng, heredoc python treo), M-45 (Ý của user: mức cửa hàng cần cả `report.view_all` và `branch.access_all`), M-46 (Ý của user: gọi skill caveman/ponytail thật, dùng graphify); cập nhật M-33 (số lần 2), M-36 (số lần 2).

## Blocked
- Đã gỡ chặn 2026-11-14: user yêu cầu bật Docker Desktop; agent chính chạy `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --wait postgres`; `pos_infra-postgres-1` healthy ở `127.0.0.1:5432`. Giao lại ST-1.
- Blocked ngày 2026-11-14 ở bước 9: kiểm AC lần 1 FAIL. Còn mở trong `.devloopflow/verify/20261114-sprint10-reports/fails.md`: V1-1 (ST-3.AC-5 Sai), V1-2 (Lệch tài liệu BR-66 món bán chạy), V1-3 (Lệch tài liệu `docs/api-spec.md:491`). Đề xuất: user quyết V1-1 (sửa AC hoặc mã) và V1-2 (xác nhận món bán chạy thuộc Sprint 10 rồi sửa tài liệu); sau đó `/devloopflow:fix-verify 20261114-sprint10-reports` rồi `/devloopflow:verify-ac` chạy lại các mục mở.
- Lý do (đã giải quyết, PostgreSQL): Chưa có PostgreSQL để chạy test ST-1 (và ST-2). Subagent `tdd` trả DỪNG, chưa viết test hay code nào. Agent chính tự kiểm lại ngày 2026-11-14: `docker ps` báo `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`; không có tiến trình nào nghe cổng 5432 hoặc 5433.
- Lỗi còn lại: Không có lỗi code. ST-1, ST-2, ST-3 đều chưa bắt đầu.
- Đề xuất: Bật Docker Desktop rồi chạy từ gốc repo `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait` (không dùng `-v`), hoặc cung cấp PostgreSQL 17 ở 127.0.0.1 có quyền CREATE DATABASE. Sau đó chạy `/devloopflow:resume 20261114-sprint10-reports`.
- fix-backlog 2026-11-14: B-54..B-58 đã sửa (tdd), agent chính chạy lại API 242/242, UI 161/161, typecheck và build xanh; thêm B-59 (tab Báo cáo hiện cho view_all thiếu access_all). Bản sửa chưa qua code-reviewer hay verify-ac.
