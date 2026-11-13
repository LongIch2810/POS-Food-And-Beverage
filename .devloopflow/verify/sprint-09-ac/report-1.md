# Kiểm AC report sprint-09-ac — vòng 1

## Kết luận
PASS — S9-01..S9-06 Đúng trên sandbox local do agent chạy. Kết luận giới hạn ở sáu tiêu chí cấp sprint, không phải quyết định đóng sprint, review code, CI hay SePay Live.

- Ngày: 13/11/2026, Asia/Ho_Chi_Minh; artifact dùng UTC. Lượt chạy bắt đầu 2026-11-13T16:23:51Z, hoàn tất kiểm DB 16:47:35Z, dừng server 16:47:59Z.
- Plan đối chiếu: không có plan riêng cho sprint-09-ac; dùng rời theo sáu AC tại `sprints/sprint-09/SPRINT.md:33-38`, được agent chính giao kiểm. Tham chiếu chi tiết: `.devloopflow/approved/20261112-sprint09-drawer-cancel-invoices.md`, `.devloopflow/approved/20261113-sprint09-ui.md`.
- Spec đối chiếu: `.devloopflow/specs/20261112-sprint09-drawer-cancel-invoices.md` và `.devloopflow/specs/20261113-sprint09-ui.md`.
- Mã kiểm: branch `feat/sprint-09-ui-invoices`, HEAD `b810c41dbaa377ab5fd65346862d62edc45e9530` cùng working tree chưa commit. Không gán kết quả cho riêng HEAD.
- Đây là tiếp tục cùng vòng 1 bị gián đoạn. Verifier tiếp nối tự mở log, JSON HTTP/DB và ảnh đã có; tiếp tục phần browser còn thiếu. Không suy kết quả từ báo cáo task trước. Không sửa source/test/config.
- Provenance: không tìm thấy manifest hash chụp trước lượt. `evidence/r1-source-final.json` là SHA-256 **cuối lượt** của 219 file source/test/manifest, không phải bằng chứng hash đầu/cuối bằng nhau. Mtime mới nhất quan sát là 2026-11-13T15:47:38.570Z, trước thời điểm build 16:23:51Z. Giới hạn: không có đối chiếu SHA-256 hai đầu để chứng minh độc lập tính bất biến cả lượt; kết quả gắn với working tree và artifact đang có.

## Tài liệu nguồn đã đối chiếu
- `AGENTS.md`: sản phẩm, scope, cách chạy, QA, bảo vệ source/dữ liệu và Graphify.
- `docs/PRODUCT_OVERVIEW.md`: phạm vi MVP, luồng ca, hóa đơn và sản phẩm.
- `sprints/sprint-09/SPRINT.md:27-38`: điều kiện tick và nguyên văn S9-01..06; ma trận task ở dòng 41 trở đi chỉ dùng định vị.
- Hai spec và hai approved plan ở trên: quyết định quyền, chủ ca, tiền, scope, hoàn tiền ngoài hệ thống, RF và tương thích POS.
- `docs/BUSINESS_RULES.md:45-46,117-135,142-150,175,188,274-278`: BR-80/81, chi phí, đếm mù, hủy PAID, hoàn kho/lượt mã và công thức.
- `docs/DESIGN_DB_POS_SYSTEM.md:494-504,565,599-603,639`: shift_expenses, sổ kho thêm dòng, công thức, reversal giữ payments.
- `docs/api-spec.md:352,362,378`: mã lỗi đối soát/hủy/chi vượt két; convention response/auth và lỗi tiếng Việt.
- `DESIGN.md`, `.devloopflow/devloopflow.md`, `.devloopflow/MEMORY.md`: tablet, cách kiểm, M-1/M-10/M-11/M-12/M-13/M-39 và kiểm không suy PASS từ test đếm.
- Source/test được Graphify định vị trước đọc; test thật là bằng chứng, graph không thay source. Không đổi hoặc rebuild graph của source trong vai trò chỉ đọc; đồng bộ semantic report do agent chính xử lý theo quyền ghi.

## Môi trường
- Node `v22.22.2`, npm `10.9.7`, Windows; PostgreSQL Docker tại 127.0.0.1:15432.
- Database kiểm HTTP/browser riêng: `pos_s9_ac_r1_20261113`. Suite API tự tạo và dọn database thử riêng. Không dùng DB production.
- Lệnh khởi tạo đã ghi tại `evidence/scripts/r1-runtime.cjs`; build/migration trước khi chạy `node dist/main.js`, Vite `node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 15179 --strictPort`.
- Khi tiếp nối, `node evidence/scripts/r1-resume.cjs` chỉ khởi động lại server trên DB sẵn có, không tạo lại DB, không chạy lại seed hoặc HTTP đã mutate.
- API `http://127.0.0.1:13049/api/v1`; UI `http://127.0.0.1:15179/`; browser MCP Playwright, viewport 1024×768, tablet ngang.
- Fixture UI `evidence/r1-ui-fixtures.json`: ba branch NORMAL/FORCE/CANCEL, CASHIER và MANAGER thật; store B cho đổi phiên. Giữ dữ liệu test, không xóa DB/volume.
- Dừng đúng hai process QA tiếp nối; API/UI không còn listener. `evidence/r1-cleanup.txt`. Browser đã đóng.

## Kết quả test
- API build: `node ./node_modules/typescript/bin/tsc -p tsconfig.json`, `evidence/r1-api-build.log`: `EXIT 0`.
- Migration sandbox: TypeORM `migration:run -d dist/database/data-source.js`, `evidence/r1-migrations.log`: `Migration InvoiceReadScope20261114000000 has been executed successfully.`, `COMMIT`, `EXIT 0`.
- API suite theo script dự án: `node --env-file-if-exists=.env --test --test-concurrency=1 dist/**/*.test.js` sau build, DATABASE_URL được cấp runtime không in secret. `evidence/r1-api-tests.log`: `# tests 224`, `# pass 224`, `# fail 0`, `# skipped 0`, `EXIT 0`. Verifier tiếp nối đã mở và kiểm phần tổng kết đầy đủ; suite hoàn tất trong lượt dở, không chạy lại sau tiếp nối.
- UI `npm run build`: `evidence/r1-ui-build.log`, `✓ built in 2.15s`, `EXIT 0`. Script gồm typecheck và Vite production build.
- UI `npm test`: `evidence/r1-ui-tests.log`, `# tests 143`, `# pass 143`, `# fail 0`, `# skipped 0`, `EXIT 0`.
- HTTP/DB độc lập với suite: `evidence/scripts/r1-e2e.mjs`, chạy qua `r1-runtime.cjs`; `evidence/r1-http-run.log`: `total=48 fail=0`, `EXIT 0`. Input, method/path/status, response đã che và SQL trước/sau tại `evidence/r1-http.log`; từng assertion tại `r1-http.results.json`.
- Đối chiếu cuối: `node evidence/scripts/r1-db.cjs final`, `node evidence/scripts/r1-finalize.cjs`; `r1-final-checks.json`: `paymentsUnchanged=true`, `stockMatchesMovements=true`, `normalAndForce175000=true`, `cashAndTransferCancelledWithReasons=true`, `httpFailed=[]`.
- Tất cả là **local do agent chạy**. Chưa kiểm CI/runner độc lập cho working tree này.

## Coverage
- Không có script hoặc ngưỡng coverage trong manifest/cấu hình dự án; không chạy và không suy tỷ lệ coverage từ 224/143 test. Không có script lint trong dự án.

## Đã đối chiếu errors
- `20261109-cash-close-shift-zero-cash-sales.md`: kiểm đóng thường/cưỡng chế có CASH thật qua HTTP và browser; cashSalesAmount 50000 ở HTTP, 95000 ở UI, không còn 0 cứng.
- `20261109-owner-access-all-branch-scope.md`: HTTP OWNER được hủy trong scope, khác store/branch bị từ chối; suite đọc hóa đơn kiểm permission/scope thật.
- `20261109-payment-dialog-focus-trap.md`, `20261113-drawer-escape-closes-busy-expense.md`, `20261113-expense-http-500-allows-repost.md`: suite UI hiện tại có regression focus/keyboard/uncertain với asserts, không bỏ qua. Lượt sprint không lặp browser fault-injection cho toàn bộ lỗi bàn phím; kết luận tương ứng dựa trên test harness đang chạy, không ghi thành browser PASS riêng.
- `20261113-shift-close-touch-targets.md`, `20261113-shift-close-field-labels.md`, `20261113-force-close-field-contrast.md`: mở lại ảnh/geometry của lượt sprint. Modal thường controls 48px, action chính 56px; modal cưỡng chế input 48px, action chính 56px, label.control=true, border rgb(138,151,157) trên trắng. Mẫu geometry ngay sau mở có scale animation 0,96; chỉ dùng mẫu ổn định sau nhập làm bằng chứng kích thước.
- `20261113-invoice-load-error-details-lost.md` (B-51): browser inject 503 ở biên network danh sách, thấy nguyên `Máy chủ chưa tải được danh sách. (Mã yêu cầu: s9-r1-b51-list)`, bấm Tải lại sau gỡ injection nhận GET 200. `r1-S9-06-B51-browser.txt`, `r1-S9-06-B51-error.png`.
- `20261113-sprint09-test-gaps-money-and-concurrency.md`: suite có B-41/42/45/47/48; HTTP có pay/cancel hai thứ tự và cash-only. `r1-api-tests.log`, `r1-http.results.json`.
- Task B completed ghi hồ sơ lỗi cho R1-1/2/3 và V1-1/2/3; R1-4/5/R2-1 chỉ bổ sung test cho hành vi có sẵn, R1-6 sửa hợp đồng plan được duyệt, có lý do không ghi error production. B-51 có hồ sơ riêng. Không phát hiện hồ sơ lỗi bắt buộc còn thiếu trong các mục đã đối chiếu.

## Bảng đối chiếu (MỌI AC cấp sprint)
Các path `evidence/...` bên dưới tính từ thư mục report; raw chỉ có local.

| AC | Cách kiểm | Lệnh/bước đã chạy | Kết quả thật (nguyên văn hoặc path bằng chứng) | Mong đợi theo plan | Quy định trong tài liệu (nguyên văn + path:dòng) | Kết luận | Ghi chú chỗ lệch |
|---|---|---|---|---|---|---|---|
| S9-01 | HTTP vai trò thật + PostgreSQL | POST/GET expenses; suite kiểm amount/reason/trần, owner/manager/cashier, scope, ca STAFF/CLOSED, không quyền/admin; SELECT trước/sau | `r1-http.log` E2E-AC-1; `r1-api-tests.log` ST-1.AC-1..3/ST-2.AC-1..12: tất cả ok; `r1-db-before-close.json` và `r1-db-final.json` giữ hai khoản 20000 true, 5000 false của NORMAL | Ghi được khoản hợp lệ, từ chối invalid/scope/trạng thái và không ghi dở | “Người có quyền ghi khoản chi cho ca `CASHIER` đang `OPEN` cùng store/branch; `amount > 0`, trong trần tiền, `reason` bắt buộc; ca đã đóng, khác branch/store và `PLATFORM_ADMIN` bị chặn.” — `sprints/sprint-09/SPRINT.md:33`; “Mỗi khoản chi có `amount > 0` và `reason` bắt buộc.” — `docs/BUSINESS_RULES.md:118` | Đúng | Không có sai lệch quan sát |
| S9-02 | HTTP/SQL + browser đóng thường và cưỡng chế | Đóng với/không chi; thiếu note; kiểm null trước submit; SELECT snapshot; browser NORMAL/FORCE rồi reload | HTTP normal/force `expectedCash=120000` từ 100000+50000−30000, bỏ khoản ngoài két 20000; force difference5000 có note. UI normal/force 100000+95000−20000=175000, outside5000 không trừ. `r1-S9-02-normal-browser.txt`, `r1-S9-02-force-browser.txt`, `r1-S9-02-force-reload.txt`, ảnh before/after/reload; suite ST-3.AC-1..6 xác nhận no-expense, note và snapshot | Đếm mù; công thức đúng hai đường đóng; snapshot giữ nguyên | “Đóng ca và đóng cưỡng chế tính `expected_cash = opening_cash + cash_sales_amount − expense_amount`, trong đó `expense_amount` chỉ gồm khoản `paid_from_drawer = true`; vẫn đếm mù; lệch bắt buộc ghi chú; snapshot không đổi sau đóng.” — `sprints/sprint-09/SPRINT.md:34`; “Các cột snapshot (`cash_sales_amount`, `expense_amount`, `expected_cash`) lưu lúc đóng ca và không đổi nữa.” — `docs/BUSINESS_RULES.md:135` | Đúng | Không có sai lệch quan sát |
| S9-03 | HTTP vai trò thật/SQL + UI MANAGER không ca riêng | CASHIER/admin 403, manager khác branch và owner khác store 404; thiếu reason422; manager hợp lệ200; hủy lại và ca closed bị chặn, snapshot không đổi sau từ chối | `r1-http.results.json` E2E-AC-3.*, `r1-http.log` request và SQL đầy đủ. Browser manager CANCEL xác nhận hủy CASH/TRANSFER POST200; `r1-S9-06-cash-final-browser.txt`, `r1-S9-06-transfer-browser.txt` | Chỉ permission quản lý trong scope/ca OPEN, có reason | “Chỉ người có quyền quản lý hủy được đơn `PAID` khi ca của đơn còn `OPEN`, cùng phạm vi store/branch, có lý do; đơn của ca đã đóng, đơn `CANCELLED`, người không đủ quyền và `PLATFORM_ADMIN` bị từ chối.” — `sprints/sprint-09/SPRINT.md:35`; “Hủy đơn `PAID`: cần quyền quản lý, bắt buộc có lý do, và chỉ khi **ca của đơn đó còn mở**.” — `docs/BUSINESS_RULES.md:150` | Đúng | Không có sai lệch quan sát |
| S9-04 | HTTP/DB transaction, rollback và đồng thời | So invoice/payments/SALE/reversal/stock/promo trước-sau; gây lỗi giữa chừng; giữ khóa rồi phát hai cancel | `r1-http.results.json`: `payments_unchanged`, `two_reversals`, `stock_back_1000`, `used_count_0` true; reversal milk200/sugar40; lỗi500 snapshot unchanged; race `waiting=2 statuses=200,409`. SQL chi tiết trong `r1-http.log`. `r1-db-final.json` mọi stockInvariant.matches=true; suite ST-4.AC-10/ST-5.AC-1 có assert snapshot thật | CANCELLED, giữ lịch sử, reversal đúng branch/định lượng, hoàn một lượt, rollback và write-once | “Hủy đơn `PAID` trong một transaction: hóa đơn thành `CANCELLED`, `payments` giữ nguyên, mỗi nguyên liệu đã trừ có một `SALE_REVERSAL` ở branch hóa đơn, tồn bằng tổng movement, lượt mã giảm đúng một. Lỗi giữa chừng rollback toàn bộ; hai yêu cầu hủy đồng thời chỉ một lần ghi dữ liệu.” — `sprints/sprint-09/SPRINT.md:36`; “Hủy đơn `PAID` thì thêm dòng `SALE_REVERSAL` cộng trả kho, không xóa dòng `SALE` cũ.” — `docs/BUSINESS_RULES.md:188` | Đúng | Không có sai lệch quan sát |
| S9-05 | HTTP/SQL reconciliation + browser hai phương thức | Hủy CASH rồi close; hủy TRANSFER cùng ca còn CASH rồi close; browser lưu reason chuyển khoản ngoài hệ thống, reload | HTTP E2E-AC-5.cash `cashSalesAmount:0,expectedCash:100000`; transfer `cashSalesAmount:50000,expectedCash:150000`. Browser CASH/TRANSFER95k thành CANCELLED, `r1-db-transfer-after.json` giữ payments; reason `S9 R1 Đã hoàn tiền chuyển khoản ngoài hệ thống` hiện sau reload. `r1-final-checks.json` tất cả true | CASH bỏ doanh thu ca, TRANSFER không vào két, hoàn ngoài hệ thống ghi reason | “Đơn `CASH` đã hủy không còn tính vào `cash_sales_amount` của ca nên tiền kỳ vọng giảm tương ứng; đơn chuyển khoản đã hủy không ảnh hưởng két và việc hoàn tiền ghi trong `cancel_reason`.” — `sprints/sprint-09/SPRINT.md:37`; “Chỉ **tiền mặt** được đối soát. Chuyển khoản tính vào doanh thu nhưng không nằm trong két.” — `docs/BUSINESS_RULES.md:127` | Đúng | Không xác nhận việc chuyển tiền ngân hàng thật; scenario chỉ xác nhận lưu lý do đã khai báo |
| S9-06 | Browser1024×768 + network và DB | Ghi20k từ két/5k ngoài két, đọc lại/reload; close normal/force; manager list/detail/cancel reason/confirm; inject lỗi tiếng Việt; đổi store trong response A pending, trả muộn rồi reload B | `r1-S9-06-expenses-browser.txt` POST201×2/GET200; `r1-S9-02-*.txt/png`; `r1-S9-06-invoices-before.png`, `r1-S9-06-cash-final-browser.txt`, `r1-S9-06-transfer-browser.txt` POST cancel200; `r1-S9-06-B51-browser.txt` GET503→200; `r1-S9-06-session-final-browser.txt` `noOldSessionText:true`, B `0 hóa đơn` trước/sau response A/reload. DB before-close/resume-before/cash-after/transfer-after/final; HTTP suite kiểm scope own/branch/store phía server | Dữ liệu thật, tiếng Việt/VND/tablet; quyền, xác nhận và an toàn phiên | “UI dùng API thật trên tablet ngang, tiếng Việt, VND: ghi/xem chi phí trong ca; kết quả đóng ca phản ánh chi phí; màn Hóa đơn hiển thị danh sách/chi tiết theo phạm vi quyền và cho hủy đơn `PAID` khi được phép, có lý do và xác nhận; lỗi hiện tiếng Việt; reload hoặc đổi phiên không lộ dữ liệu phiên cũ.” — `sprints/sprint-09/SPRINT.md:38`; “Reload, đổi tài khoản/store/chi nhánh và các request đến muộn không làm lộ hoặc ghi dữ liệu của phiên trước” — `.devloopflow/specs/20261113-sprint09-ui.md:16` | Đúng | Các flow thành công gọi backend/DB thật; lỗi503 và độ trễ được inject có ghi rõ tại biên browser, không dùng để chứng minh backend trả lỗi503 |

## Đối chiếu spec (cấp tính năng)
| Mục của spec (nguyên văn) | Loại | AC hoặc bước đã chạy | Kết quả thật | Kết luận |
|---|---|---|---|---|
| “G1. Bảng và API ghi/xem chi từ két của ca (PB-10; S9-01).” — spec Task A:19 | mục tiêu | S9-01 | POST201/GET200, scope/validation bị chặn, SQL trước/sau | Đúng |
| “G2. Đóng ca và đóng cưỡng chế dùng tổng chi từ két thay `0`, vẫn đếm mù và lệch bắt buộc ghi chú (S9-02).” — Task A:20 | mục tiêu | S9-02 | null trước submit, 120000 HTTP/175000 UI, note422 | Đúng |
| “G3. Hủy đơn `PAID` theo BR-29 với quyền, lý do, ca còn mở, phạm vi store/branch (S9-03).” — Task A:21 | mục tiêu | S9-03 | manager200, sai scope/quyền/state từ chối | Đúng |
| “G4. Hủy đơn `PAID` trong một transaction: hoàn kho bằng dòng mới, trả lượt mã, rollback toàn bộ khi lỗi, an toàn khi gọi đồng thời (S9-04).” — Task A:22 | mục tiêu | S9-04 | 2 reversals, used0,500 unchanged,200/409 | Đúng |
| “G5. Đơn `CASH` đã hủy rời khỏi `cash_sales_amount`; đơn chuyển khoản hủy không ảnh hưởng két (S9-05).” — Task A:23 | mục tiêu | S9-05 | reconciliation100000/150000 đúng, reason lưu | Đúng |
| “G1. UI Hóa đơn dùng API thật cho danh sách và chi tiết, bộ lọc ngày, trạng thái, bàn, thu ngân; phân trang và phạm vi quyền” — Task B:19 | mục tiêu | S9-06, suite API đọc hóa đơn/UI | list/detail thật, lọc PAID ra1, scope B ra0; suite filter/cursor/permissions ok | Đúng |
| “G2. UI hủy OPEN/PAID theo quyền và điều kiện server, có lý do, xác nhận và lỗi tiếng Việt” — Task B:20 | mục tiêu | S9-03/06 | CASH/TRANSFER PAID browser200; OPEN regression HTTP và suite, reason validation | Đúng |
| “G3. UI ghi và xem chi phí ca thật, phân biệt khoản lấy từ két; khoản ngoài két vẫn hiển thị nhưng không trừ đối soát.” — Task B:21 | mục tiêu | S9-01/02/06 | 20k true/5k false, expense20k | Đúng |
| “G4. Hiện kết quả đóng ca phản ánh chi phí, giữ đếm mù; hỗ trợ trạng thái tải/rỗng/lỗi, tablet ngang, đổi phiên an toàn” — Task B:22 | mục tiêu | S9-02/06 | ảnh và snapshot loading/empty/error/success, A→B late response không lộ | Đúng |
| “G5. Mở rộng API đọc hóa đơn tối thiểu để hỗ trợ G1/G2, với phân quyền, lọc và phân trang phía server.” — Task B:23 | mục tiêu | suite API224/UI143, S9-06 | HTTP scope/filter/cursor tests có assert, không skipped | Đúng |
| “Không làm báo cáo PB-12, hủy đơn của ca đã đóng hoặc hoàn tiền một phần” — Task B:27 | phi mục tiêu | Scope và HTTP closed rejection | Không thao tác PB-12/phần hạ tầng; closed cancel bị từ chối | Đúng trong phạm vi kiểm |
| “Sửa/xóa dòng `payments` hoặc dòng `SALE`/`stock_movements` cũ; hủy `PAID` ghi dở” — Task A:34 | phản mục tiêu | S9-04 | payments unchanged, SALE còn,500 rollback | Đúng — không xảy ra |
| “Dữ liệu mock được trình bày như dữ liệu thật; dữ liệu của phiên cũ xuất hiện hoặc mutation cũ chạy dưới phiên mới; lộ dữ liệu ngoài store/branch.” — Task B:30 | phản mục tiêu | S9-06, suite race/session, HTTP scope | DB/network khớp; B0 sau lateA; test mutation guards ok | Đúng — không xảy ra trong case đã chạy |
| “Lộ tiền kỳ vọng/chênh lệch trước đếm mù” — Task B:31 | phản mục tiêu | S9-02 | null HTTP và modal chỉ nhận counted trước submit | Đúng — không xảy ra |
| “Tiền là số nguyên `bigint` VND, trần `1.000.000.000.000`” — Task A:47 | ràng buộc | S9-01, suite validation/money | amount invalid/boundary có kiểm HTTP và DB, UI tiền nguyên | Đúng |
| “CASHIER chỉ được đọc danh sách và chi tiết hóa đơn thuộc các ca của chính mình, gồm ca đã đóng; MANAGER xem trong chi nhánh, OWNER xem trong store.” — Task B:41 | ràng buộc | suite invoices-read/HTTP + browser managerA/ownerB | server own/branch/store/permission tests ok; browser scope B0 | Đúng |

## FAIL / bug
- Không có FAIL sản phẩm trong sáu AC cấp sprint đã kiểm; `fails.md` không có mục mở.
- Hai lần timeout thao tác QA: dùng nhầm tên nút “Hủy đơn” thay cho “Hủy hóa đơn này”; dùng sai câu rỗng “Không có hóa đơn phù hợp.” thay vì “Không có hóa đơn nào phù hợp với bộ lọc”. Đây là lỗi selector của verifier; không có mutation trong bước chờ lỗi. Đã đọc snapshot và thu chứng cứ hoàn chỉnh ở file có `final-browser`; file `r1-S9-06-cash-browser.txt` và `r1-S9-06-session-browser.txt` chỉ lưu timeout, không dùng làm PASS.
- File force-browser chụp reload khi còn loading; kết quả reload hoàn chỉnh nằm ở `r1-S9-02-force-reload.txt/png`, không suy từ frame loading.

## Lệch tài liệu
- Không thấy mâu thuẫn nghiệp vụ giữa sáu AC và hai spec approved.
- `sprints/sprint-09/SPRINT.md` vẫn có phần trạng thái “Dự thảo planning” và các item “Chưa bắt đầu”, trong khi spec/code/task hiện có; đây là trạng thái tài liệu cần agent chính đồng bộ sau QA. Lượt này không sửa phạm vi hay tuyên bố sprint đã đóng.

## Đánh giá test
- API dùng PostgreSQL và HTTP thật, kiểm status/code rồi SQL và assert deepEqual snapshot, có chặn khóa qua pg_locks, rollback trigger, race hai thứ tự; không chỉ đếm test.
- UI test harness kiểm request body/meta/errors, deferred promises/epoch, uncertain không retry, callbacks/state. Browser bổ sung đường thành công API thật, close/cancel, reload và late response qua đổi store. Không xem UI harness là browser evidence.
- Mọi suite tổng kết 0 skipped; không có coverage được cấu hình. Không kiểm mọi kiểu thiết bị/mọi lỗi provider.
- Không chạy lại toàn bộ 30 AC Task B như một lượt nghiệm thu task; đối tượng lượt này là S9-01..06. Các case RF của task được đối chiếu bằng test hiện tại và HTTP/browser liên quan, không ghi là mỗi RF đều được browser riêng.

## Exploratory
- Task A RF-1 UUID viết hoa, RF-2 lỗi không lộ expected, RF-3 đổi recipe sau SALE, RF-4 promo inactive, RF-5 manager branch NULL: `r1-http.results.json` RF-1..5 true, SQL trong `r1-http.log`.
- Đồng thời expense/close; cancel/close hai chiều; cancel/expense hai chiều; payment/cancel hai chiều: HTTP giữ khóa, kiểm số waiter và snapshot; mọi assertion true.
- Task B RF-1 render/filter cũ, RF-2 cancelled còn payment và zero không payment, RF-3 grant/revoke permission, RF-4 double-submit/uncertain, RF-5 options/cursor: suite API/UI hiện tại xanh, không skip. Browser thêm scope A/B, lỗi503→retry và held response qua đổi store.
- M-1/M-10: HTTP vai trò thật và sai phạm vi; M-11/M-12/M-13: deferred suite + browser đổi store; M-39: tablet1024×768, mở ảnh và geometry stable. Không có manifest pre-run như đã nêu; không suy bù bằng chứng.
- Ảnh đã mở lại bằng view_image: expense-before, normal close-after, force-after, cash-confirm, transfer-after và session-B-after; thông tin tiền/lý do/status khớp snapshot/network/DB.

## Đề xuất
- Agent chính cập nhật ma trận S9 theo report này nếu chấp nhận giới hạn provenance đã ghi; lưu report/fails, semantic update đúng hai Markdown theo quy tắc Graphify.
- Lượt QA tiếp theo chụp manifest hash trước khi chạy và sau khi kết thúc; không đổi tên hash cuối lượt này thành baseline trước chạy.
- Giữ rõ chưa CI/runner độc lập cho working tree, chưa SePay Live/production; không dùng PASS local để thay các kiểm tra đó.
