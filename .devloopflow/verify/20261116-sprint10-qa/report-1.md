# Kiểm AC cấp Sprint 10 — vòng 1

## Kết luận

**FAIL.** Sáu AC cấp sprint có chứng cứ mới khớp yêu cầu: S10-01, S10-02, S10-03, S10-04, S10-06, S10-11. S10-05 còn sai định dạng ngày nhìn thấy trên browser QA. Exploratory còn tái hiện B-66: dialog Danh mục vẫn phủ tab Kích cỡ sau Back. Hai finding được giữ `mở` trong `fails.md`; verifier không sửa sản phẩm hoặc chạy lại finding sản phẩm sau khi phát hiện.

- Ngày: 16/11/2026, Asia/Ho_Chi_Minh. Raw timestamp UTC: bắt đầu chốt mã `2026-11-15T19:38:33.671Z`, kết thúc chốt mã `2026-11-15T19:51:03.532Z`.
- Chế độ: dùng rời, AC nguồn `sprints/sprint-10/SPRINT.md:36–42`; không có task/plan QA cấp sprint riêng. Hai plan tính năng chỉ dùng để làm rõ hợp đồng và Review Focus, không thay bộ bảy AC cấp sprint.
- Plan đối chiếu: `.devloopflow/approved/20261114-sprint10-reports.md`, `.devloopflow/approved/20261115-sprint10-stock-ledger.md`.
- Spec đối chiếu: `.devloopflow/specs/20261114-sprint10-reports.md`, `.devloopflow/specs/20261115-sprint10-stock-ledger.md`.
- Branch: `feat/sprint10-reports`; HEAD đầu/cuối `19ef547292ecf0ef0586f9c466d34ceb7478dd46`. Đây là working tree có thay đổi chưa commit, không phải nội dung nguyên commit HEAD.
- SHA256 288 file source/test/manifest/tài liệu liên quan đầu/cuối: `evidence/r1-source-pre.json`, `evidence/r1-source-post.json`. So sánh `evidence/r1-source-comparison.json`: `changed: []`, `added: []`. Verifier không sửa code/test/config/tài liệu nguồn hoặc Git.
- Không dùng kết quả QA cũ để suy PASS cấp sprint. Bối cảnh tám report cũ và SHA256 nằm trong `evidence/r1-historical-context.json`; raw chứng cứ dùng kết luận dưới đây đều sinh mới trong thư mục evidence của lượt này.

## Tài liệu nguồn đã đối chiếu

- `sprints/sprint-10/SPRINT.md`: bảy AC S10-01..06 và S10-11; PB-14 và SePay Live ngoài phạm vi, S10-07..10 đã bỏ.
- Hai spec và hai approved plan nêu trên: hợp đồng ngày/range/tiền/top10/phạm vi, router, sổ kho, Review Focus RF-1..5 của mỗi plan.
- `docs/PRODUCT_OVERVIEW.md`: vai trò, MVP, bất biến, mục 6.4/6.5, định dạng ngày mục 10 tại dòng 214.
- `docs/BUSINESS_RULES.md:150,165,185–203`: BR-29, BR-103, BR-44, BR-47, BR-72, BR-62..65, BR-77.
- `docs/DESIGN_DB_POS_SYSTEM.md`: invoices/payments, bigint, stock_movements, công thức tổng hợp và SALE_REVERSAL, đặc biệt dòng 600, 637–639.
- `docs/api-spec.md:135–165,242–247,273–281,460,490–491`: phạm vi, tiền aggregate, lỗi, hủy PAID và endpoint/spec.
- `DESIGN.md:33,57,141,355–366,635,649`: tablet, mục tiêu chạm, chỉ số/chart/bestsellers, ngày `dd/MM/yyyy`, tương phản.
- `README.md:10–17,47–64`; `AGENTS.md` và `.devloopflow/devloopflow.md`: app/stack/lệnh thật, trạng thái local khác CI, bảo vệ thay đổi chưa commit.
- `.devloopflow/MEMORY.md`: các mục liên quan M-1, M-4, M-10..13, M-19, M-20, M-28..32, M-39, M-41..43, M-45, M-47.
- `.devloopflow/errors/INDEX.md`, các hồ sơ chi tiết ở mục errors bên dưới, `.devloopflow/review/backlog.md:582–606` B-66/B-67.
- Hai sổ FAIL tính năng và report lịch sử Báo cáo vòng 1..5/Sổ kho vòng 1..3: chỉ dùng để chọn hồi quy và nhận diện giới hạn chứng cứ cũ. Không chuyển trạng thái sổ lịch sử trong lượt QA này.
- Source xác nhận: `POS_API/src/reports/reports.service.ts`, controller/DTO, reports fixture/integration tests; `POS_API/src/inventory/inventory.service.ts:234–260`; `POS_UI/src/features/reports/DailyReportScreen.tsx`, reportService, InventoryScreen/inventoryService, App/navigation/routes và ProductsScreen.

## Môi trường

- Node.js `v22.22.2`; PostgreSQL `17.9 (Debian 17.9-1.pgdg13+1)` local. Probe thực: `evidence/r1-db-probe.json`. Chỉ đọc cấu hình kết nối từ `.env` vào process; không in URL/mật khẩu/cookie/token.
- App local có sẵn `pos_api:3000`, `pos_ui:5173`, PostgreSQL `pos_infra-postgres-1:5432`. Không rebuild, dừng hoặc đổi dữ liệu/credential của những app/fixture này.
- App được verifier tự chạy cho QA: Nest AppModule thật từ build mới, DB riêng `ac_s10_sbx_3ace400f`, API `http://localhost:3100`; Vite dev source hiện tại tại `http://localhost:5174`, proxy `/api` tới API sandbox, `PUBLIC_ORIGIN=http://localhost:5174`. DB được migration bằng danh sách hiện hành; dữ liệu mẫu mới có nhiều store/branch/user, hóa đơn, payments, item/topping, sổ kho.
- Lệnh: `node evidence/scripts/r1-launch.cjs`; launcher dựng source sandbox từ script đã đọc trong hồ sơ Báo cáo cũ, thêm fixture Sổ kho trong DB mới. Hai process con chạy `node evidence/scripts/r1-sandbox-server.mjs` ở POS_API và `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort` ở POS_UI. Chi tiết PID/URL trong `evidence/r1-processes.json`; log `r1-sandbox-server.log`, `r1-sandbox-vite.log`.
- DB/API sandbox dùng code thật. SQL fixture được seed trực tiếp để tạo rõ biên ngày, tiền lớn và dòng kho; không dùng mock làm nguồn doanh thu hoặc sổ kho trong app/browser. Việc sinh SALE/SALE_REVERSAL qua nghiệp vụ được kiểm thêm bởi suite API hiện hành; không mô tả SQL fixture là thao tác bán/hủy qua UI.
- Browser: Chrome thật với `puppeteer-core` đã có trong POS_UI, viewport 1024×768. Playwright MCP `browser_navigate`, `browser_resize`, `browser_evaluate` đều báo profile đang được sử dụng; không đóng browser của người khác. Lỗi nguyên văn và fallback trong `evidence/scripts/r1-browser-tool-error.txt`. Lượt này không có chứng cứ Playwright MCP thành công.
- Fault injection chỉ áp ở biên mạng: trì hoãn request thật, abort hoặc trả 500 để kiểm loading/error/retry. Browser regression của repository dùng fetch giả theo boundary được plan định; tách rõ khỏi browser app/API thật.
- Browser mặc định của môi trường QA hiển thị native date theo `MM/DD/YYYY`, quan sát ảnh `r1-completion-report-tablet-summary.png`. Không giả định ngoại lệ locale cho yêu cầu `dd/MM/yyyy` của sản phẩm.
- SePay/provider không được gọi; không Live, không production. Không có CI tương ứng working tree chưa commit; CI cũ trong README không được dùng chứng minh mã này.
- Dọn dẹp: `node evidence/scripts/r1-cleanup.cjs` dừng đúng hai process sandbox và DROP đúng DB tự tạo theo regex kiểm tên; `evidence/r1-cleanup-1794772263173.json`: `remaining: 0`, `credentialChangesToExistingUsers: 0`. DB/app của `withWorld` cho before/after tự dọn trong finally. Một lần chuẩn bị sandbox ban đầu dừng vì seed trùng khóa stock có sẵn do DB trigger; DB đó đã dọn riêng tại `r1-cleanup-1794771707353.json`. Đây là lỗi setup QA, không phải FAIL sản phẩm.

## Kết quả test

Các lệnh test/build được chạy mới từ script `evidence/scripts/r1-run.cjs`; env được nạp vào process trước lệnh, không ghi bí mật. Các lệnh Node dưới đây tương đương nội dung script npm của repository; không tuyên bố đã gọi tên lệnh `npm test` nếu thực tế gọi trực tiếp Node.

| CWD / lệnh thật | Output / exit | Chứng cứ |
|---|---|---|
| POS_API: `node node_modules/typescript/bin/tsc -p tsconfig.json` | EXIT 0 | `evidence/r1-api-build.log` |
| POS_API: `node --test --test-concurrency=1 dist/**/*.test.js` | `# tests 256`, `# pass 256`, `# fail 0`, `# cancelled 0`, `# skipped 0`, EXIT 0 | `evidence/r1-api-test.log` |
| POS_UI: `node --experimental-strip-types --test test/*.test.mjs` | `# tests 221`, `# pass 221`, `# fail 0`, `# skipped 0`, EXIT 0 | `evidence/r1-ui-test.log` |
| POS_UI: `node node_modules/typescript/bin/tsc --noEmit` | EXIT 0 | `evidence/r1-ui-typecheck.log` |
| POS_UI: `node node_modules/vite/bin/vite.js build` | EXIT 0, bundle tạo thành công | `evidence/r1-ui-build.log` |
| POS_UI: `node --test test/reports-accessibility.browser.mjs test/stock-ledger-router.browser.mjs` | `# tests 9`, `# pass 9`, `# fail 0`, `# skipped 0` | `evidence/r1-browser-regression.log`; ảnh tại `evidence/reports-browser/`, `evidence/ledger-browser/` |
| POS_UI: `npm audit --audit-level=high` | `found 0 vulnerabilities` | `evidence/r1-ui-audit.log` |
| Root: `node evidence/scripts/r1-http.cjs` | `S10-01/02 before-after cancel PASS`, exit 0 | `evidence/r1-before-after.json` |
| Root: `QA_ORIGIN=http://localhost:5174 node evidence/scripts/r1-sandbox-check.mjs` | 21 case `ok:true`, `FAIL count 0`, exit 0 | `evidence/r1-sandbox-http-results.json`, `evidence/r1-http-raw.jsonl` |
| Root: browser app/API thật | Kết quả theo từng case, có một assertion sản phẩm B-66 thất bại | `evidence/r1-browser-results.json`, `r1-completion-browser-results.json`, `r1-final-browser-results.json` |
| `curl.exe -s -i http://localhost:5174/api/v1/health` | HTTP 200, `{"data":{"status":"ok"}}` | `evidence/r1-curl-health.txt` |
| `curl.exe -s -i` reports/revenue không cookie, query hợp lệ | HTTP 401 `UNAUTHENTICATED` | `evidence/r1-curl-anonymous-report.txt` |

Raw browser lần đầu giữ nguyên các lỗi harness: SQL alias thiếu AS, chọn nút Tải lại không tồn tại trong Báo cáo, selector header sai và nhãn tab có số đếm. Lượt completion chỉ hoàn tất case chưa tới assertion; một case loading giữ cả hai request StrictMode làm các chờ network-idle sau đó timeout. Lượt final dùng browser sạch để hoàn tất ba case chưa kiểm được. Không đổi source/test sản phẩm, không xóa artifact đầu; không coi các lỗi harness là bug sản phẩm. B-66 chỉ kết luận sau assertion thực trên browser sạch và ảnh được mở xem; sau finding đó không sửa hoặc chạy lại nó.

## Coverage

- Lệnh: không có script coverage trong hai package.json hoặc `.devloopflow/devloopflow.md`.
- Output: không chạy coverage, không báo tỷ lệ. Test xanh không thay chứng cứ từng AC hoặc ảnh UI.

## Đã đối chiếu errors

Không áp dụng kiểm đếm finding đã sửa theo task: **không có task file QA cấp sprint riêng**. Các lỗi cũ liên quan dưới đây đã mở hồ sơ chi tiết, chọn case hồi quy mới; kết quả và giới hạn ở Exploratory.

- `20261110-backlog-branch-scope-null-branchid-fail-open.md`.
- `2026-10-29-auth-proxy-response-empty.md`, `2026-10-29-auth-revoked-session-ui.md`.
- `20261113-invoice-load-error-details-lost.md`, `20261114-backlog-stale-list-test-settled-request.md`.
- `20261114-react-strictmode-mounted-ref-stuck-false.md`.
- `20261114-css-cascade-input-min-height-44-beats-48.md`.
- `20261114-reports-date-before-chart-range-untested.md`.
- `20261114-reports-cross-branch-shift-and-payment-paid-at-untested.md`.
- `20261114-api-validation-before-permission-check.md`.
- `20261114-ui-report-scope-downgrades-when-access-all-missing.md`.
- `20261114-ui-report-tab-shown-without-access-all.md`.
- `20261114-ui-load-more-button-not-disabled-while-pending.md`.
- `20261114-ui-shared-client-default-message-masks-screen-fallback.md`.
- `20261114-ui-border-control-contrast-below-3-on-page-bg.md`.
- `20261115-browser-router-fixed-wait.md`.
- `20261115-inventory-catalog-reloads-on-branch-change.md`.
- `20261115-rail-and-routes-disagree-on-permissions.md`.
- `20261115-settings-back-leaves-editor-open.md`.
- `20261115-pos-open-table-stale-navigation-callback.md`.
- `20261115-products-tabs-missing-aria-current.md`.
- `20261116-inventory-dialog-persists-after-tab-change.md`.

## Bảng đối chiếu (MỌI AC cấp Sprint 10, tách từng vế)

Các hậu tố a/b/c dưới đây là vế kiểm của chính bảy AC nguồn, không tạo AC nghiệp vụ mới. `r1-*` đều ở `evidence/` của lượt này.

| AC | Cách kiểm | Lệnh/bước đã chạy | Kết quả thật / chứng cứ | Mong đợi theo sprint/plan | Quy định tài liệu (nguyên văn + path:dòng) | Kết luận | Ghi chú chỗ lệch |
|---|---|---|---|---|---|---|---|
| S10-01a PAID/OPEN/CANCELLED | PostgreSQL, HTTP, SQL | `r1-http.cjs` seed và đọc trước hủy | `r1-before-after.json`: 3 hóa đơn, CASH 35000, TRANSFER 50000, tổng 85000; OPEN/CANCELLED 99000 không vào tổng | Chỉ PAID được tính | “Doanh thu chỉ tính hóa đơn `PAID`, không tính `OPEN` hoặc `CANCELLED`.” `docs/BUSINESS_RULES.md:198`; sprint:36 | Đúng | Có 0đ trong count; không tạo payment 0 |
| S10-01b hủy sau thanh toán | HTTP hành động thật và SQL | POST hủy CASH35, đọc lại | `r1-before-after.json`: cancel200, count2, cash0, total50000; SQL giữ payment35000 và invoiceCANCELLED | Đã hủy không tính kể cả payment còn | “Hóa đơn thành `CANCELLED` nên không còn tính vào doanh thu” `docs/BUSINESS_RULES.md:150` | Đúng | Không xóa payment lịch sử |
| S10-01c biên UTC+7 | HTTP và SQL độc lập | Bốn mốc .999Z/17:00Z hai đầu ngày | `r1-sandbox-http-results.json`: 13/11=10000, 14/11=50000/count2, 15/11=40000; SQL cùng ngày | Gom đúng hai mốc sát nửa đêm | “Doanh thu theo ngày gom theo `paid_at` ở **múi giờ Việt Nam (UTC+7)**, không gom theo UTC.” `docs/BUSINESS_RULES.md:199` | Đúng | Dùng invoices.paid_at; B-57 test mới cũng đạt |
| S10-02a CASH/TRANSFER/tổng | HTTP/SQL | Before/after và ca qua ngày | `r1-before-after.json`; `r1-sandbox-http-results.json` caA2 ngày15 transfer30000, cash0; 0đ/rỗng được test | Tách đúng phương thức, tổng bằng hai phần | “Tổng doanh thu = tiền mặt + chuyển khoản.” `docs/BUSINESS_RULES.md:200`; sprint:37 | Đúng | Không dùng tendered/received excess; RF-1 test mới đạt |
| S10-02b số nguyên/không tràn | HTTP, DB và server log | c1 exact MAX_SAFE; c2/c3 vượt an toàn | `r1-http-raw.jsonl`, `r1-sandbox-http-results.json`: 9007199254740991 chính xác; +1 trả500 INTERNAL_ERROR không có data; `r1-sandbox-server.log` có safe-integer error | Giữ nguyên số nguyên; vượt safe phải từ chối | “Không an toàn thì trả `500` `INTERNAL_ERROR` và ghi log, **không bao giờ** trả số đã bị làm tròn.” `docs/api-spec.md:246`; reports spec:49 | Đúng | 500 ở đây là hợp đồng từ chối số không an toàn, không phải báo cáo doanh thu thành công |
| S10-03a CASHIER | HTTP vai trò thật | Own OPEN/CLOSED; ca đồng nghiệp/crossbranch/crossstore | `r1-browser-results.json`, `r1-extra-http.jsonl`: own200, đồng nghiệp403, khácbranch/store404 | Chỉ ca mình | “`CASHIER` chỉ xem báo cáo ca của chính mình.” `docs/BUSINESS_RULES.md:201`; reports spec:19 | Đúng | Không dựa tên role client |
| S10-03b MANAGER | HTTP sửa query | mgrA1 gửi branchA2; gửi shiftA2 | `r1-extra-http.jsonl`: branch giả bị bỏ qua, vẫn total1770000 A1; shiftA2 trả404 | Khóa theo identity branch | “bỏ qua `branchId` client gửi đối với người bị giới hạn chi nhánh” reports spec:49; sprint:38 | Đúng | Browser manager không có bộ chọn branch |
| S10-03c OWNER | HTTP và SQL | ownerA all, chọnA1, branchstoreB | `r1-extra-http.jsonl` và `r1-http-raw.jsonl`: all/chọn200, crossstore404; SQL từngbranch trong `r1-completion-sql.json` | All store hoặc một branch của store | “tổng hợp toàn cửa hàng cần `branch.access_all`” reports spec:18; `docs/BUSINESS_RULES.md:203` | Đúng | view_all thiếu access_all403 |
| S10-03d ADMIN/anonymous/ID sai | HTTP trực tiếp | Admin được gắn report perms vẫn bị chặn; thiếu branch identity; no cookie | `r1-sandbox-http-results.json`: admin403, manager/cashier branchnull403; curl anonymous401 | Chặn PLATFORM_ADMIN và vượt quyền | “chặn PLATFORM_ADMIN và truy cập ngoài store” reports spec:18; sprint:38 | Đúng | Không coi UI redirect là bằng chứng quyền API |
| S10-04a ngày/range biểu đồ | API/SQL/browser | reportdate14, chart01..07 | `r1-sandbox-http-results.json`, `r1-completion-browser-results.json`, `r1-completion-report-chart.png`: 1000,0,3000,4000,5000,6000,7000; nhãn01/11..07/11, axis7000/0 | Bảy ngày tăng dần, có ngày0, độc lập reportdate | “Tổng ngày và món bán chạy vẫn theo ngày báo cáo, độc lập khoảng biểu đồ” reports spec:20; sprint:39 | Đúng | Range sai/31 ngày kiểm thêm suite API/browser |
| S10-04b top10/snapshot/topping | API, SQL độc lập, browser | 12 size, tie UUID, rename, topping | `r1-sandbox-http-results.json`: top10 đúng SQL; Mon01-doi-ten q14/rev290000; tie UUID00000000 đứng trước; TopMon35000; `r1-completion-report-bestsellers.png` | Theo số lượng, tie name/size/UUID; không nhân đôi topping | “Hiển thị tối đa 10 dòng món/size” và “không cộng topping hai lần” reports spec:21 | Đúng | Source rule chốt ở spec/plan có ngày approved trước QA |
| S10-04c phạm vi/hủy | API/DB | A1 có OPEN/CANCELLED món12 qty50, A2 có qty30 | `r1-sandbox-http-results.json`: A1 top không cộng qty50; A2 TopMon riêng; storeB không xuất hiện A | Chỉ PAID trong phạm vi; hủy không tính | “danh sách món bán chạy lấy từ đơn `PAID`, phản ánh đúng phạm vi và không tính đơn đã hủy” sprint:39 | Đúng | API/SQL so cùng dữ liệu mới |
| S10-05a nguồn API và bộ chọn | Browser app/API thật | Owner/manager/cashier login, ngày/range/branch/shift | `r1-browser-results.json` role controls; `r1-completion-browser-network.json`, `r1-final-browser-network.json`; GET reports/revenue, branches/work-shifts thật | UI gọi API, bộ chọn đúng quyền | “UI dùng API thật” reports spec:22; sprint:40 | Đúng | reportService/source không gọi MockEngine |
| S10-05b tablet/VND/nhãn/chart | Browser và mở ảnh | 1024×768, đo controls/page width | `r1-completion-browser-results.json`: controls≥48, width1024 không tràn; summary1770000/chart/top10; ảnh summary/chart/bestsellers | Tiếng Việt/VND, thao tác tablet rõ | “Nút, ô chọn thông thường” 48px `DESIGN.md:141`; màn Báo cáo `DESIGN.md:363` | Đúng cho các phần nêu | Không đo thiết bị cảm ứng vật lý |
| S10-05c ngày hiển thị theo thiết kế | Browser/ảnh đối chiếu nguồn | Nhìn ô Ngày báo cáo và range | `r1-completion-report-tablet-summary.png`: 11/14/2026, 11/01/2026, 11/07/2026 | Ngày `dd/MM/yyyy`, cùng thiết kế tiếng Việt | “Số tiền định dạng `29.000đ`, ngày `dd/MM/yyyy`, giờ 24 giờ.” `docs/PRODUCT_OVERVIEW.md:214`; `DESIGN.md:635` “Ngày” / `dd/MM/yyyy` | **Sai** | V1-1; native date lệ thuộc locale Chrome QA; nguồn không cho ngoại lệ |
| S10-05d tải/rỗng/lỗi/thử lại | Browser fault injection có app/client thật | Ngày2030 rỗng; giữ request pending; 500 thiếu message kèm requestId; bỏ chặn retry | `r1-completion-browser-results.json`, ảnh `r1-completion-report-empty.png`, `-loading.png`, `-error.png`: fallback đúng, giữ mãqa-s10-request, retry tải lại | Các trạng thái rõ | “có trạng thái tải/rỗng/lỗi rõ ràng” sprint:40; reports spec:36 giữ message/requestId/fallback | Đúng | Payload500 là fault injection, không mô tả là server tự lỗi |
| S10-06a reload/branch | Browser request thật pending | Đang chờ A1, đổi A2, cho requestA1 về; F5 | `r1-final-browser-results.json`, `r1-final-report-filter-race.png`: TopMon A2, không Mon01 A1; F5 giữ/khôi phục báo cáo hiện hành từ API | Không giữ báo cáo cũ | “khi đổi phiên hoặc bộ lọc không hiện dữ liệu cũ” reports spec:22; sprint:41 | Đúng | Pending thực; unit kiểm cả render trước effect/resolve/reject |
| S10-06b đổi user/store | Browser một tab và HTTP | OwnerA logout, ownerB login, /bao-cao và Back | `r1-final-browser-results.json`, `r1-final-report-session-b.png`: B50000, không Mon01/TopMon; network auth/reports mới | Không giữ dữ liệu A | “Sau reload hoặc đổi người dùng/chi nhánh, UI không giữ báo cáo của phiên trước” sprint:41 | Đúng | Credential chỉ của DB thử mới |
| S10-06c link không quyền | Browser và HTTP độc lập | Admin gõ /bao-cao | `r1-final-browser-results.json`, `r1-final-report-admin-direct-denied.png`: về/cua-hang, không GET reports mới; APIadmin403 | URL không mở rộng quyền | “người không có quyền không thấy dữ liệu dù dùng URL màn Báo cáo trực tiếp” sprint:41 | Đúng | view_all không access_all cũng bị chặn API và unit UI |
| S10-11a dữ liệu/quyền/branch | HTTP/SQL/browser | Ownerall, A1, manager, crossstore, cashier, admin, cursorlimit2 | `r1-browser-results.json`, `r1-sql.json`, `r1-extra-http.jsonl`: all4/A1=3/manager3, crossstore404, cashier/admin403, managerbranchparam422, IDs paging đúng DB | Biến động thật theo quyền/chi nhánh | “Tab Sổ kho hiển thị biến động thực từ API theo quyền và chi nhánh” sprint:42; BR-72 `docs/BUSINESS_RULES.md:192` | Đúng | Tên fixture sandbox sbxA1/A2 khớp SQL; không thay fixture ZA local |
| S10-11b SALE/REVERSAL | SQL/API/browser | Đọc hai dòng cùng invoice | `r1-browser-results.json`, `r1-ledger-all.png`: -100.000ml Xuất bán, +100.000ml Hoàn trả kho, cùng mãHD; DB cùng số lượng/reference | Hiện xuất bán và hoàn kho khi có | “Hủy đơn đã thanh toán thì ghi dòng hoàn kho đối dấu” `docs/PRODUCT_OVERVIEW.md:128`; sprint:42 | Đúng | SQL seed không thay bằng chứng test transaction của suite API |
| S10-11c reload/đổi phiên/link | Browser một tab | OwnerA F5; logout/cashier/Back/direct; ownerB login | `r1-browser-results.json`, `r1-final-browser-results.json`, `r1-ledger-reload.png`, `r1-final-ledger-cashier-denied.png`, `r1-final-ledger-owner-b.png`: giữ đườngSổ kho, cashierredirect không request, B chỉQA SữaB | Không lộ dữ liệu phiên trước | “reload hoặc đổi phiên không lộ dữ liệu cũ” sprint:42; stock spec:30 | Đúng | Thêm case pendingbranchA1 đạt |
| S10-11d rỗng/lỗi | Browser/network | A3 trống; abort; 500; retry | `r1-ledger-empty.png`, `r1-ledger-network-error.png`, `r1-ledger-500.png`, `r1-browser-results.json`: câu đọc đúng, retry≥48, khôi phục dữ liệu sau bỏ chặn | Rỗng/lỗi rõ | “trạng thái rỗng/lỗi rõ ràng” sprint:42; stock spec:19,27 | Đúng | 500 lỗi có chủ ý chỉ ở browser |

Kết luận theo AC gốc: S10-01 Đúng; S10-02 Đúng; S10-03 Đúng; S10-04 Đúng; **S10-05 Sai**; S10-06 Đúng; S10-11 Đúng. B-66 còn là FAIL cấp spec ngoài bảy dòng dữ liệu nói trên, không gán nhầm thành lỗi quyền hoặc sổ kho.

## Đối chiếu spec (cấp tính năng)

| Mục của spec (nguyên văn) | Loại | AC hoặc bước đã chạy | Kết quả thật | Kết luận |
|---|---|---|---|---|
| “Chỉ tính hóa đơn hiện `PAID`, theo `invoices.paid_at` ở `Asia/Ho_Chi_Minh`” reports:16 | mục tiêu | S10-01; B-57 integration | Before/after và biên VN đúng, payment_paid_at lệch vẫn theo invoice | Đúng |
| “Tổng doanh thu bằng tổng tiền mặt và chuyển khoản, tính bằng số nguyên” reports:17 | mục tiêu | S10-02 và MAX_SAFE | Không có số đã làm tròn; +1 bị chặn theo API:246 | Đúng |
| “Giới hạn theo permission và danh tính” reports:18 | mục tiêu/ràng buộc | S10-03,06 | Role thật/crossstore/query sửa/direct URL đúng | Đúng |
| “mặc định 7 ngày kết thúc ở ngày báo cáo” và “tối đa 31 ngày” reports:20 | mục tiêu | test defaults/range mới, browser regression thật component | Test đều đạt; app thật chọn01..07 cho date14 vẫn giữ độc lập | Đúng trong hành vi đã kiểm |
| “Hiển thị tối đa 10 dòng món/size” reports:21 | mục tiêu | S10-04 | SQL độc lập = API; chart và bảng browser phản ánh dữ liệu | Đúng |
| “UI tiếng Việt, VND, phù hợp tablet ngang” reports:12; “giờ lưu UTC và hiển thị Việt Nam” reports:35 | mục tiêu/ràng buộc | S10-05 | Nhãn/VND/viewport đúng; native ngày mm/dd/yyyy trái định dạng chung DESIGN | Sai, V1-1 |
| “Dữ liệu mock được trình bày như dữ liệu thật; tổng tiền sai hoặc tràn; dữ liệu ca, chi nhánh, store hoặc phiên khác bị lộ; đơn đã hủy vẫn tính” reports:28 | phản mục tiêu | S10-01..06 | Không gặp các phản mục tiêu dữ liệu trong fixture và thao tác đã chạy | Đúng trong phạm vi chạy |
| “PB-14, SePay Live, lợi nhuận gộp, giờ cao điểm, báo cáo tuần/tháng ngoài phạm vi” reports:25 | phi mục tiêu | Các request và script QA | Không gọi các phần này | Đúng |
| “API sổ kho trả thêm tên chi nhánh và mã hóa đơn” stock:25 | mục tiêu | S10-11a/b, APIST1 mới | 13field, names/invoiceCode đúng scope; invoice lệch branch code null trong integration | Đúng |
| “Màn Sổ kho hiện cột Chi nhánh trong đúng trường hợp bảng Tồn kho đã hiện cột Chi nhánh” stock:26 | mục tiêu | Ownerall/chọn/manager | Chỉ all có cột; các trường hợp khác không thừa cột | Đúng |
| “Nút ‘Thử lại’ của màn Kho đạt chiều cao tối thiểu 48px” stock:27 | mục tiêu | Abort/500 browser | Đo height≥48, không trangcuộnngang | Đúng |
| “F5, nút Quay lại/Tiến của trình duyệt và mở link đều về đúng màn” stock:30 | mục tiêu | Reload/Back/direct ở Báo cáo/Kho và exploratory Products | Kho/Báo cáo đúng; Back sang Kích cỡ vẫn phủ dialog Danh mục | **Sai, V1-2 / B-66** |
| “Màn Kho chỉ tải dữ liệu của tab đang mở” stock:31 | mục tiêu | Unit và browser regression BR-1, B-62 | Unit/BROWSER suite mới xanh, mạng app thật đườngSổ kho đọc movements | Đúng trong các case đã kiểm |
| “Số dương trong cột Thay đổi của Sổ kho có dấu ‘+’” stock:32 | mục tiêu | S10-11b | +100.000 ml nhìn thấy trong ảnh | Đúng |
| “Ô chọn chi nhánh trên màn Kho xếp theo tên” stock:33 | mục tiêu | Unit ST6 AC8, suite UI mới | Test mới đọc localeCompare vi với tên cósố/códấu đạt | Đúng ở tầng unit; không nghiệm thu lại fixture ZA10/ZĐ1 trên app local |
| “không đổi quyền, phạm vi, sắp xếp, phân trang, mã lỗi” stock:65 | ràng buộc | API ST1 và HTTP paging | Giữ IDs/order/total/cursor theo expected; 401/403/404/422 đúng | Đúng |
| “Thêm API nhập tồn, sửa, xóa hay ghi sổ kho; đổi quy tắc ghi sổ kho” stock:38 | phi mục tiêu | Mạng QA và source liên quan | Không thêm API; seed chỉ ở DB thử riêng | Đúng |

Không kiểm lại toàn bộ 80 AC task Sổ kho hoặc toàn bộ địa chỉ trên app Docker 5173 bằng fixture cũ. Dòng trên chỉ kết luận cho bảy AC cấp sprint và những mục spec đã có hành vi mới tương ứng; không tái tuyên bố các AC task lịch sử còn lại PASS. B-66 đủ để kết luận mục tiêu router hiện chưa hoàn toàn đạt.

## FAIL / bug (mỗi FAIL cũng được lưu vào sổ `fails.md`)

### V1-1 — S10-05: ngày trong ô chọn hiển thị MM/DD/YYYY

- Bước tái hiện: chạy UI hiện hành; Chrome QA mặc định, 1024×768; ownerA mở `/bao-cao`; chọn date `2026-11-14`, chart `2026-11-01..2026-11-07`; nhìn ba ô date.
- Kỳ vọng: “Số tiền định dạng `29.000đ`, ngày `dd/MM/yyyy`, giờ 24 giờ.” (`docs/PRODUCT_OVERVIEW.md:214`); `DESIGN.md:635` quy định `Ngày` = `dd/MM/yyyy`. Không có ngoại lệ cho native date được tìm thấy trong nguồn đã đối chiếu.
- Thực tế: ảnh hiển thị `11/14/2026`, `11/01/2026`, `11/07/2026`; phần label và số tiền tiếng Việt/VND vẫn đúng. Nguồn API giữ ISO đúng, lỗi ở hiển thị của input native trên môi trường browser đã chạy.
- Path bằng chứng: `evidence/r1-completion-report-tablet-summary.png`, script `r1-browser-completion.cjs`/kết quả `r1-completion-browser-results.json`.
- Test tái hiện đề xuất: `S10-05 displayed report dates follow dd/MM/yyyy across browser locales` | input: browser locale en-US và vi-VN, chọn ngày 14/11/2026 và khoảng01..07/11 | kết quả mong đợi: người dùng nhìn thấy định dạng ngày theo DESIGN; query vẫn ISO và không đổi cách tính UTC+7. Nếu Product Owner chọn để native date theo locale, phải duyệt ngoại lệ tài liệu trước; verifier không tự chọn thay.

### V1-2 — cấp spec router / B-66: Back giữ dialog của tab cũ

- Bước tái hiện: ownerA mở `/thuc-don/kich-co`; click `Danh mục món`; mở `Thêm danh mục`; không submit; browser Back về `/thuc-don/kich-co`.
- Kỳ vọng: “F5, nút Quay lại/Tiến của trình duyệt và mở link đều về đúng màn” (stock spec:30); tab Kích cỡ không còn dialog Danh mục của tab trước. Backlog B-66 đã mô tả đúng tình huống và yêu cầu đóng state dialog khi tab đổi.
- Thực tế: pathname đã là `/thuc-don/kich-co`, tab Kích cỡ active, nhưng vẫn còn một dialog “Thêm danh mục mới” phủ bảng size. Assertion nguyên văn: `B-66 dialog danh mục phải đóng khi Back về Kích cỡ`, `1 !== 0`.
- Path bằng chứng: `evidence/r1-final-B66-dialog-before-back.png`, `evidence/r1-final-B66-dialog-after-back.png`, `evidence/r1-final-B66.json`, `evidence/r1-final-browser-results.json`. Ảnh sau Back đã được mở xem.
- Test tái hiện đề xuất: `[B-66] Products Back closes previous tab dialog` | input: `categories`, mở dialog tạo danh mục, Back sang `sizes`, Forward về `categories` | kết quả mong đợi: dialog đóng sau đổi tab và không tự mở lại. Không submit dữ liệu trong QA.
- Không có chứng cứ ghi nhầm entity hoặc lộ store. Đây là cùng finding Low đang chờ xử lý trong backlog; verifier không sửa trạng thái backlog, không nâng thành lỗi tiền/quyền.

## Lệch tài liệu

- Không phát hiện mâu thuẫn plan với spec/API về tiền, phạm vi hoặc top10 trong lượt này. V1-1 là **hành vi không khớp quy định định dạng ngày**; V1-2 là **hành vi không khớp mục tiêu router**, nên ghi `Sai` thay vì tự gọi hai nguồn tài liệu mâu thuẫn nhau.
- Report cũ từng PASS không tạo ngoại lệ cho hai quan sát mới. Không sửa source tài liệu hoặc lịch sử QA.
- Spec reports phần Hiện trạng ghi tình trạng trước triển khai; không dùng các câu baseline này để cho rằng code hiện chưa có module API.

## Đánh giá test

- API dùng PostgreSQL riêng và AppModule/controller/guards thật; suite mới có trước/sau hủy PAID, 0đ, mốc ngày, safe integer, quyền, crossstore, range/date độc lập, invoice_paid_at khác payment_paid_at, snapshot một statement và failure readonly. Có assertions trên response và dữ liệu DB; không có skip trong output.
- UI 221 test có harness node:vm và một số service giả. Vì vậy 221/221 không tự chứng minh app nối API; browser sandbox riêng và network/SQL mới được dùng cho S10-05/06/11.
- Browser regression9case dùng source/CSS/router thật với boundary fetch giả. Chúng chứng minh các hành vi trong test, không chứng minh HTTP role/crossstore thật. B-66 không có test trong suite và thực tế vẫn lỗi dù suite xanh.
- Browser app thật đo filter controls≥48, đọc labels/chart/rows và mở ảnh summary/ledger/B-66. Native date sai nhìn thấy dù kiểm `.value` ISO và test range đều xanh; đây là chỗ test hiện tại chưa bảo vệ yêu cầu trình bày.
- Hàm check của helper thu kết quả từng case; process exit0 của helper không đồng nghĩa mọi case PASS. Báo cáo đọc `status` từng case và giữ assertion B-66 FAIL.
- M-39: có ma trận từng vế, source hash trước/sau, artifact mới và đối chiếu ảnh. M-47: fixture sandbox mới có tên/ID riêng, đối chiếu SQL; không dùng tên ZA của AC task cũ để giả vờ đã kiểm fixture cũ.
- Không đo cảm ứng vật lý, không chạy coverage, không có CI cùng working tree. Không suy browser locale vi-VN từ nhãn UI hoặc thuộc tính lang; lỗi định dạng đánh theo ảnh đã quan sát.

## Exploratory

| Case / nguồn bắt buộc | Input/bước đã chạy mới | Kết quả / chứng cứ |
|---|---|---|
| Reports RF-1: tiền khách đưa/nhận thừa | `test_ST2_AC2_payment_amount_not_received`; sandbox ca A2 có TRANSFER amount 30000, actual received 35000 | Suite API đạt; báo cáo ngày 15 tính 30000; `r1-api-test.log`, `r1-sandbox-http-results.json` |
| Reports RF-2: ca qua nửa đêm | Ca A2 có đơn 20000 trước và 30000 sau 17:00Z | Ngày 14 tổng 111500, ngày 15 chuyển khoản 30000; SQL/HTTP mới đúng |
| Reports RF-3: snapshot khi hủy đồng thời | `test_ST2_AC7_consistent_statement`: barrier hủy trước aggregate, 30 lượt đọc trong lúc hủy 19 đơn | Test mới đạt, mỗi kết quả total = count × 1000 và khớp chart, một aggregate statement; `r1-api-test.log` |
| Reports RF-4 / StrictMode / tải thêm | Unit có current ngoài trang đầu, hơn 100 ca lịch sử, loadMore pending/disabled, mount-cleanup-mount | Các test ST3 AC2 và [R1-1]/[B-58] mới đạt trong `r1-ui-test.log`; không tuyên bố đã dựng hơn 100 ca trên app sandbox |
| Reports RF-5 / fallback lỗi | Unit `auxiliary_identity_errors` và browser 500 thiếu message, có requestId | Unit mới đạt; browser giữ qa-s10-request và fallback đúng; `r1-completion-report-error.png` |
| Stock RF-1 / Back sau đổi phiên | Owner A đăng xuất, CASHIER đăng nhập, Back và mở link trực tiếp; tiếp theo OWNER B cùng tab | App thật đạt; B chỉ thấy QA Sữa B, CASHIER không GET sổ kho; `r1-final-browser-results.json` |
| Stock RF-2 / bộ lọc khi pending | Giữ request tất cả chi nhánh; đổi sang A1; cho request cũ về sau | A1 vẫn có 3 dòng; `r1-ledger-filter-race.png`, `r1-browser-results.json` |
| Stock RF-3 / địa chỉ lạ | Unit chuẩn hóa dấu / cuối, chữ hoa, đường lạ; browser BR-7 | Suite UI/browser mới đạt; `r1-ui-test.log`, `r1-browser-regression.log` |
| Stock RF-4 / invoice lệch branch | Integration ST1-AC6 gắn invoice khác branch vào movement | `invoiceCode: null`, test mới đạt; `r1-api-test.log:127–128` |
| Stock RF-5 / đổi tên branch | Integration ST2-AC4 đổi tên branch sau login, gọi GET me lại | Trả đúng tên mới; `r1-api-test.log:60–61`; không đổi branch local |
| Branch null và scope, M-1/M-10/M-41/M-45 | HTTP viewall_noaccess, mgr_nobranch, cashier_nobranch, admin có report permission; sửa branch/shift trên URL | 403/404 đúng; bộ chọn UI theo vai trò và link admin đúng; `r1-sandbox-http-results.json`, `r1-extra-http.jsonl` |
| Auth proxy body rỗng / revoked, M-12 | UI BR-03, session restore và identity guard trong test hiện hành chạy mới | Proxy error tiếng Việt, revoked không restore tiếp; `r1-ui-test.log:161–180`; không khóa store local |
| M-11/M-39 và lỗi dùng response đã xong | Unit pending_filter_identity/render key; browser giữ request thật rồi đổi branch | Test mới đạt; browser xác nhận request đang giữ trước continue; không dùng promise đã hoàn tất |
| M-13 toast đổi phiên | Luồng đọc báo cáo/sổ kho hiện inline error; không tạo sticky toast từ mutation trong app thật | Chưa có kết luận mới riêng về sticky toast cross-store; không sửa ToastProvider, không suy PASS |
| M-29/M-31/M-32 | Toàn suite API, migration count và seed clock hiện hành; không lọc tên subtest | 256 test, không skip hoặc lỗi clock; full run không bỏ test cha |
| CSS 44px, tương phản, M-42/M-43 | Browser dùng CSS từ entry thật, đo controls báo cáo; unit [C-1] token và fallback qua client thật | Controls ≥48 và unit contrast đạt; browser regression 9/9; `r1-completion-browser-results.json`, `r1-ui-test.log` |
| Ngày trước chart, B-54/B-57/B-56 | API kiểm date < fromDate, shift khác branch, paid_at lệch payment, quyền trước validation | Các test mới đều đạt; `r1-api-test.log:2431–2444` |
| B-61/B-62/B-63/B-64/editor Cài đặt | Suite UI mới kiểm aria-current, catalog không reload theo branch, quyền rail/route, callback mới, Back đóng editor | Test mới đạt; `r1-ui-test.log`; không sửa harness/test sản phẩm |
| B-65 dialog Kho | Mở Thêm nguyên liệu rồi Back về Sổ kho; unit cả editing và minEditor | App thật còn 0 dialog; hai unit case đạt; `r1-final-browser-results.json`, case exploratory trước Products; không submit |
| B-66 dialog Thực đơn | Mở dialog Danh mục, Back sang Kích cỡ | **FAIL**, còn 1 dialog; V1-2, ảnh sau Back và JSON mới |
| B-67 race trong test điều hướng | Chạy mới toàn bộ browser Sổ kho cùng browser Báo cáo | 9/9 đạt trong lượt này. Không tái hiện race; không chứng minh test hết flaky hoặc finding đã sửa; giữ nguyên backlog |

## Đề xuất

- Giữ S10-05 chưa nghiệm thu; xử lý hoặc chốt rõ định dạng ngày theo V1-1 qua quy trình được user chọn. Verifier không tự đổi locale để che sai khác đã quan sát.
- Giữ V1-2 mở và dẫn B-66 hiện có; không tạo bản sửa production trong QA. Nếu user chọn xử lý, dùng test tái hiện có input/expected ở trên rồi gọi verify-ac riêng.
- B-67 vẫn là hạn chế độ tin cậy của test hiện có; 9/9 lần này không phải bằng chứng đã sửa helper.
- Sau quyết định/sửa, chạy lại đúng các mục mở theo verify-ac; nếu cần tick toàn Sprint10 trên một bản cuối mới thì thu lại chứng cứ phù hợp với mã đó. Không tick sprint, không đóng sprint, không viết Sprint Review/Retrospective từ report FAIL này.
- Graphify có marker needs_update từ trước; verifier không query graph cũ hoặc xóa marker. Semantic update cho report/fails thuộc agent chính sau khi nhận report, vì verifier chỉ được ghi ba nơi QA.
- Chưa kiểm CI, production, SePay Live, sticky toast từ mutation qua hai store, thiết bị cảm ứng vật lý hoặc toàn bộ 17 địa chỉ Docker bằng fixture cũ. Hai process và DB sandbox do QA tạo đã dọn; không đổi credential hay dữ liệu local hiện có.
