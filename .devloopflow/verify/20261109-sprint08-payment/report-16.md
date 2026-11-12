# Kiểm AC 20261109-sprint08-payment — vòng 16

## Kết luận

**PASS trong phạm vi UI cuối được giao**: ST-8.AC-1 (preview/cảnh báo, CASH/zero, QR/fallback/reload, retry và đổi phiên), ST-8.AC-2, E2E-AC-5, E2E-AC-7 và RF-5. Không phát hiện FAIL sản phẩm mới. Không dùng kết quả này để kết luận toàn bộ Sprint 08 hoặc mọi AC của task.

- Ngày: 11/11/2026. Một lượt verify-ac bổ sung, không sửa source/test/plan/task.
- Plan: `.devloopflow/approved/20261109-sprint08-payment.md`; spec: `.devloopflow/specs/20261109-sprint08-payment.md`, `specs/invoices.md`.
- **Local do agent chạy**, không phải CI/runner độc lập. Artifact gốc chỉ local; không đối chiếu được từ remote.
- Ký hiệu **Q** trong báo cáo = `qa-evidence/20261111-122641-48ed476-s8-verify-ac-r16/`. `Q/run.md` có ma trận được ghi trước chạy. Audit đối chiếu ở `Q/audit.json` và `evidence/r16-audit.json`.
- HEAD `48ed476`, working tree dirty; `Q/provenance.json` ghi SHA đầy đủ/status. SHA256 của **187 file** API/UI source và test trong `Q/source-manifest-before.json`/`after.json` giống nhau. Không dựa vào hash R11 để thay kiểm browser phiên bản cuối.

## Tài liệu nguồn đã đối chiếu

`AGENTS.md`, `.devloopflow/devloopflow.md`, `.devloopflow/MEMORY.md`, plan/spec trên, `docs/PRODUCT_OVERVIEW.md`, `DESIGN.md`, `coverage-audit-20261111.md`, `report-11.md`, `report-12.md`, `report-13.md`, `report-15.md`, `fails.md`; quy trình/template verify-ac được agent chính chỉ định. Đối chiếu phạm vi UI và các giới hạn đã chấp nhận; không tái nghiệm thu provider của báo cáo cũ. Các câu tiến độ “chờ duyệt/chưa triển khai” trong thân plan được đọc cùng header/Changelog lịch sử, không tự đổi quyết định đã duyệt.

## Môi trường và lệnh

- Windows, Node `v22.22.2`; PostgreSQL sandbox container `pos_s8_r12_pg`, ban đầu exited. Start container này, tạo **một database mới duy nhất** `pos_s8_qa_r11_mwc3fj1s` (prefix kế thừa helper R11; đây là DB mới vòng 16, không dùng lại DB R11).
- API `http://127.0.0.1:13196`, UI `http://localhost:15326`; bridge fixture/DB `127.0.0.1:13197`, browser control `127.0.0.1:13198`. Chỉ local, không ngrok/provider/production/SePay Live.
- `node .devloopflow/verify/20261109-sprint08-payment/evidence/scripts/r16-prepare.cjs` ghi ma trận/provenance, tạo bản sao helper R11 vào `r16-live.cjs`; `node .../r16-live.cjs` tạo DB, chạy `npm run migration:run` rồi `npm start` trong POS_API và `npm run dev -- --host 127.0.0.1 --port 15326` trong POS_UI. Migration exit 0 tại `Q/migration.exit.json`; stdout/stderr/command thật ở Q.
- MCP Playwright trả lỗi profile “Browser is already in use”. Không dừng profile/process sẵn có. Fallback CLI Playwright đã cài trong npm cache, chạy `node .../r16-browser.cjs`, tạo headless Chromium/context riêng 1180×820. Không thay dependency/config dự án.
- Các script `evidence/scripts/r16-qr1.js`..`r16-qr5.js`, `r16-cash.js`, `r16-zero-session.js`, `r16-settings-other.js`, `r16-settings-api-finish.js`, `r16-owner-qr.js`, `r16-settings19-complete.js` được nạp nguyên văn qua local browser control. `Q/browser-actions.jsonl` lưu code/kết quả thật; `browser-errors.jsonl` giữ lỗi helper; `browser-network.jsonl` giữ method/path/status/request ID, request/response đã che và idempotency key nghiệp vụ. Không lưu auth payload/header/cookie/token.
- `evidence/scripts/r16-live.cjs::snapshot` chạy `BEGIN READ ONLY`, từng SQL SELECT rồi COMMIT; `Q/db.jsonl` giữ ID tình huống, SQL và kết quả trước/sau. Các fixture tạo qua SQL/API chỉ thuộc DB mới; không dùng ảnh để suy tác dụng phụ.

## Kết quả test, build và coverage

`node .devloopflow/verify/20261109-sprint08-payment/evidence/scripts/r16-checks.cjs` exit 0:

| Lệnh (cwd POS_UI) | Kết quả | Output gốc |
|---|---|---|
| `node --experimental-strip-types --test test/live-payment.test.mjs` | 37 test, 37 pass, 0 fail/skip; exit 0 | Q/ui-payment-tests.stdout.txt, stderr.txt |
| `npm run build` | TypeScript + Vite thành công, exit 0 | Q/ui-build.stdout.txt, stderr.txt |

`Q/checks-results.json` ghi command/cwd/thời điểm bắt đầu-kết thúc/exit code. API build chạy trong migration; không chạy lại toàn bộ API/UI suite trong vòng browser bổ sung này. Không có script/ngưỡng coverage được cấu hình; không tạo số coverage. `node .../r16-audit.cjs` exit 0, 12 nhóm kiểm PASS tại `Q/audit.json`.

## Bảng đối chiếu trong phạm vi

Mỗi tên ảnh dưới đây có snapshot JSON **cùng stem** lưu body/ARIA/URL/viewport/thời gian thật. Đã mở ảnh trọng yếu, đọc lại JSON/network/DB được dẫn và chạy audit đối chiếu giá trị; không chỉ dựa vào kết luận của helper.

| AC / tình huống | Bước và kết quả thực | Artifact Q | Mong đợi plan / nguồn nguyên văn | Kết luận |
|---|---|---|---|---|
| ST-8.AC-1 preview/cảnh báo | CASH invoice HDI64KRCZY: server preview subtotal 60.000, discount 10.000, total 50.000, NEGATIVE_STOCK; modal tiếng Việt hiện 50.000đ và cảnh báo trước xác nhận | r16-cash-preview.png + JSON; browser-network GET `/payment-preview`; db id `cash-before` | Plan:247 “hiển thị preview 50.000đ + cảnh báo”; spec task:25 “lấy tổng từ server”; specs/invoices.md:18 “cảnh báo kho do server tính” | Đúng |
| ST-8.AC-1 CASH; RF-5 | Server POST cash thực sự commit 201, payment amount50k/tender100k/change50k; helper abort response tới browser. UI báo “Kết quả chưa rõ”, chưa thành công và khóa form/đóng. Bấm Xác nhận lại dùng **đúng key/body**, server201 replay true, data bằng response đã commit; UI mới hiện thành công/bỏ chọn. DB trước retry và sau retry deep-equal: một payment, một SALE, promo dùng một lần | rf5-committed-response.json; r16-cash-uncertain.png, r16-cash-after-retry.png + JSON; browser-network.jsonl; browser-failed.jsonl; db `cash-before`, `cash-committed-before-retry`, `cash-after-retry` | Plan:171 “UI lỗi mạng sau server đã commit → retry cùng key”; plan:247 “CASH/zero báo thành công chỉ sau 201/204”; specs/invoices.md:34 “trả 201 hoặc replay 201”; PRODUCT_OVERVIEW:175 “một transaction” | Đúng |
| ST-8.AC-1 zero | HD6GNRMN2M preview 60k−60k=0; UI Hoàn tất đơn 0đ; POST204; sau response mới hiện thành công/bỏ chọn; DB PAID, không payment, một SALE | r16-zero-before.png, r16-zero-after.png + JSON; browser-network POST `/complete-zero` 204; db `zero-before`/`zero-after` | Plan:247 “CASH/zero báo thành công chỉ sau 201/204”; specs/invoices.md:34 “204, không tạo payment”; DESIGN.md:286 “không tạo khoản thanh toán” | Đúng |
| ST-8.AC-1 QR A / fallback / reload | HDKQIJJJKS tạo A `HDKQIJJJKS1HTE369H`. Abort riêng tải ảnh VietQR, API thật: UI “Đang chờ chuyển khoản”, fallback nguyên bank970422/account19/amount50k/referenceA. Reload bỏ chọn theo màn POS, mở lại cùng invoice/Thanh toán đọc đúng A, không POST tạo lượt mới | r16-qr-A-pending-fallback.png, r16-qr-A-after-reload.png + JSON; browser-failed/network; db `qr-before`, `qr-A-pending`, `qr-A-after-reload` | Plan:247 “QR đang chờ chỉ báo đang chờ, reload giữ mã”; specs/invoices.md:35 “Tải lại đọc đúng lượt đó”; :38 “UI luôn còn bank/account/amount/reference” | Đúng |
| E2E-AC-5 A→B, khóa, reload | UI hủy A (POST cancel204), tạo B `HDKQIJJJKS77OWADKK` khác A (201). Reload/reselect/open payment giữ B; panel không có sửa/xóa/hủy đơn, modal không cho sửa mã. Invoice vẫn OPEN; B PENDING | r16-qr-A-cancelled.png, r16-qr-B-created.png, r16-qr-B-locked.json, r16-qr-B-after-reload.png + JSON; browser-network; db `qr-A-cancelled`, `qr-B-created`, `qr-B-after-reload` | Plan:161 “tải lại UI giữ mã B và khóa sửa món/mã”; spec task:27 “Khi tạo lượt mới sau hủy chờ, mã mới phải khác”; specs/invoices.md:39 nút Thanh toán chỉ mở lại QR/hủy chờ/manual | Đúng |
| E2E-AC-5 A đến muộn | Gửi webhook HMAC sandbox đúng reference A/50k/account19, ACK200 success. DB giữ invoice OPEN/B PENDING, không payment/SALE; event A disposition ATTEMPT_CANCELLED. OWNER mở QR B thấy “Chuyển sau khi hủy chờ · 50.000đ” | http.jsonl id R16-LATE-A; db `late-before`/`late-after`, `qr-B-after-late-A`; r16-owner-qr-exception19.png + JSON; browser-network GET exceptions200 | Plan:161 “webhook tiền theo A không hoàn tất B, có ngoại lệ quản lý”; specs/invoices.md:35..36 lượt đã hủy không tự PAID; spec task:27 “báo quản lý xử lý” | Đúng; HMAC local, không phải provider |
| ST-8.AC-2 / E2E-AC-7 UI19 | Sau khi hủy B hết pending, OWNER settings nhập nguyên19/tên QA R16 BANK19, PATCH200, DB lưu nguyên19/tên mới. Reload settings giữ19. CASHIER tạo lượt C sau save19; API snapshot/Quick Link chứa19, fallback khi ảnh lỗi hiện nguyên19/bank/50k/referenceC | r16-settings19-success-before.json, r16-settings19-success-after.png + JSON, r16-settings19-success-reload.json, r16-settings19-C-fallback.png + JSON; browser-network; db `settings19-success-before`/`after`, `settings19-C-before`/`after` | Plan:248 “OWNER nhập 19 chữ số lưu được”; :163 “QR attempt snapshot cùng số”; specs/invoices.md:12 “snapshot QR phải gồm 6–19 chữ số” | Đúng |
| ST-8.AC-2 / E2E-AC-7 UI20/API20 | OWNER nhập20: lỗi tại field “Số tài khoản phải có từ 6 đến 19 chữ số.” Không PATCH trong khoảng before/after UI20; toàn bộ DB snapshot trước/sau deep-equal. Reload giữ19. Gọi PATCH20 trực tiếp riêng:422 VALIDATION_ERROR field accountNumber, DB và attempt không đổi | r16-settings20-success-before.json, r16-settings20-success-after.png + JSON; api20-response.json; browser-network; db `settings20-success-before`/`after`, `api20-before`/`after` | Plan:248 “không gửi PATCH và không ghi đè tài khoản 19”; :163 API20 “PATCH 422 VALIDATION_ERROR”; specs/invoices.md:122 “accountNumber 6..19 chữ số” | Đúng |
| ST-8.AC-1 session | Từ CASHIER có QR B đang mở→đóng modal/logout→OWNER cùng store: settings không có dialog/form cũ. Logout→OWNER store khác: settings GET bank null, chi nhánh B3; POS/orders rỗng, không món/reference/account store trước; reload vẫn không dữ liệu cũ. Cuối logout | r16-session-before-logout-qr.json, r16-session-logged-out.json, r16-session-owner.json, r16-session-other-store.json, r16-session-other-reload.json, r16-session-other-orders.png + JSON; session-metadata.json; browser-network auth bodies omitted/GET scope | Plan:286 “Đổi user/store ... Không lộ state session cũ”; spec task:25 “không lẫn dữ liệu phiên cũ” | Đúng cho các chuyển phiên đã chạy |

Không chạy lại/không đổi kết luận AC khác: ST-1.AC-1/2, ST-2.AC-1, ST-3.AC-1, ST-4.AC-1, ST-5.AC-1/2, ST-6.AC-1, ST-7.AC-1, ST-8.AC-3, AC-M1, E2E-AC-1/2/3/4/6/8, R2-1.AC-1/2/3, RF-1/2/3/4 (có dữ liệu giao nhau nhưng không nghiệm thu lại toàn bộ các AC này). Vế terminal-attempt PAID replay, manual confirmation/provider, race và scope đầy đủ không được nghiệm thu browser lại trong R16; component test có phủ một số vế nhưng không được gọi là browser bằng chứng. Giữ nguyên V1-4/V11-1 đã được user chấp nhận có điều kiện, không yêu cầu chấp nhận lại.

## Đối chiếu spec cấp tính năng

| Mục spec nguyên văn | Loại | Bằng chứng | Kết luận |
|---|---|---|---|
| “UI hiển thị kết quả thật và không tạo giao dịch thứ hai khi thử lại vì lỗi mạng” (task:16) | Mục tiêu | RF-5, replay201, DB deep-equal | Đúng trong phạm vi CASH |
| “tải lại UI trong cùng lượt giữ đúng mã cũ” (task:27) | Mục tiêu | A và B reload/reselect, API GET giữ reference | Đúng |
| “tiền đến theo mã lượt đã hủy ... không tự PAID, báo quản lý xử lý” (task:27) | Mục tiêu | HMAC A muộn, DB/event và OWNER exception | Đúng trong sandbox local |
| “không lẫn dữ liệu phiên cũ” (task:25) | Ràng buộc | CASHIER→OWNER→store khác/reload | Đúng cho các chuyển phiên đã chạy |
| “không bật giao dịch ngân hàng Live” (task:33) | Phi mục tiêu | Chỉ fixture synthetic, localhost/HMAC | Đúng |

Không kết luận mục tiêu/ràng buộc khác ngoài phạm vi này; không có mâu thuẫn tài liệu nghiệp vụ mới được phát hiện trong các tình huống đã chạy.

## Đã đối chiếu errors / MEMORY / exploratory

- Đọc INDEX và các lỗi liên quan `20261110-backlog-payment-dialog-stuck-uncertain.md`, `20261110-payment-dialog-poll-paid-race.md`, `20261110-payment-uncertain-manual-replayed-to-other-attempt.md`, `20261110-payment-preview-stale-after-attempt-switch.md`, `20261110-payment-preview-reload-error-swallowed.md`, `20261111-spec-qr-pending-locks-payment-wrong.md`. Bộ 37 payment tests chạy lại có các case B-1/R5-1/R7-2/B-17/B-21 đúng nhánh lỗi cũ; không tuyên bố đã ép mọi race đó qua browser. Browser A cancel→B/modal reset/khóa và RF5 là exploratory trực tiếp trong phạm vi.
- M-3 kiểm pending/uncertain qua tests trên và browser RF5/cancel. M-7 môi trường sandbox được phép từ phân công root; không chạm browser profile người khác. M-1 kiểm scope đầy đủ và M-2 provider schema ngoài phạm vi; không thay schema/security. M-4 không đổi mã lỗi; M-5 đồng bộ task/docs do root xử lý.
- Lần thử UI19 đầu tiên khi B còn PENDING trả đúng **409 TRANSFER_PENDING**, giữ tại `r16-settings19-after.json`/network; không dùng lần đó chứng minh save19. Sau audit phát hiện điều kiện chuẩn bị chưa phù hợp, chạy phần bổ sung **trong cùng vòng16**, hủy B qua UI đúng ca, save19 thành công, tạo C. Các artifact có chữ `success`/`C` ở bảng là lần đủ điều kiện. Không sửa/xóa artifact409.
- Helper bước đầu dùng sai tên nút “Đăng nhập” nên timeout; nút thật “Đăng nhập hệ thống”, sửa thao tác trong helper. Giữ browser-errors. Không có lỗi sản phẩm từ thao tác này.
- ARIA snapshot login ban đầu chứa **mật khẩu sandbox ngẫu nhiên** (ảnh input vẫn masked). Đã scrub exact-value trong mọi text artifact mới ngay khi phát hiện; tool output ban đầu không thể thu hồi. `Q/audit.json` xác nhận 83 text files không còn exact password/JWT/DB URL; đã mở ảnh login xác nhận masked. Đã thay hash mật khẩu toàn bộ fixture users sang random mới không giữ tại `Q/credential-invalidation.json`, logout browser và dừng API. Không có credentials production. Không dùng snapshot login bị scrub làm bằng chứng security của ứng dụng; đây là lỗi helper QA, không phải finding sản phẩm.

## FAIL / bug, lệch tài liệu và đánh giá test

Không có FAIL sản phẩm mới hoặc FAIL đang mở được chạy lại để đổi trạng thái; **giữ `fails.md` nguyên trạng**. Không sửa production/test. Không phát hiện lệch tài liệu mới trong phạm vi thực thi. Test component 37/37 hỗ trợ hồi quy trạng thái, không thay browser/network/SQL; không có CI độc lập. Artifact của QR dùng abort tại biên ảnh để ép fallback, RF5 dùng `route.fetch()` tới API thật rồi abort đúng response đã commit; không mock giá trị nghiệp vụ, không sửa state app.

## Cleanup và giới hạn

- Browser Chromium/context riêng đã đóng exit0. Gọi bridge `/finish` lưu DB `final`; việc stop PostgreSQL quá sớm làm helper nhận `57P01` và exit1 trước timer dừng child. Đây là lỗi cleanup của harness sau audit, không phải lỗi payment. Không dựng lại log để che lỗi.
- Xác minh PID listener/command và dừng đúng API child29396 (`dist/main.js`, port13196), Vite child14268 (`--port15326`) do lượt16 tạo. Parent shell27864/18504 đã exited nên taskkill hai shell báo not found; sau đó taskkill child đúng scope thành công. `Q/cleanup.json` ghi chi tiết; kiểm cuối không còn listener13196/13197/13198/15326/15432, container `pos_s8_r12_pg` trở về exited như ban đầu. Không xóa DB/volume hoặc dừng process khác.
- HMAC webhook local không phải bằng chứng SePay Test mode/Live. Không kiểm Live. Không chạy lại mọi AC toàn task; giữ các giới hạn user chấp nhận trước đó. Root chịu trách nhiệm tích hợp kết quả với báo cáo còn lại, task/graph/docs và quyết định đóng sprint.
