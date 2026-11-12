# Kiểm AC 20261109-sprint08-payment — vòng 14

## Kết luận

**FAIL — thiếu chứng cứ ở một số nhánh; không phát hiện lỗi sản phẩm mới trong các ca có bằng chứng.**

- Ngày: 11/11/2026. Phạm vi được giao: **chỉ ST-8.AC-3, E2E-AC-8, AC-M1 và B-38/B-39**.
- AC-M1, B-38 và B-39: **Đúng**, trong phạm vi bằng chứng local và giới hạn nguồn gốc bên dưới.
- ST-8.AC-3 và E2E-AC-8: **Sai do không đủ chứng cứ**, các phần thiếu ghi cụ thể ở V14-1/V14-2. Không suy rằng các nhánh này đang hỏng.
- Plan: `.devloopflow/approved/20261109-sprint08-payment.md`, delta ST-8 dòng 41–51, AC-M1 dòng 53–59, E2E-AC-8 dòng 164, ma trận dòng 288–294.
- Spec: `.devloopflow/specs/20261109-sprint08-payment.md` (approved, mục tiêu bổ sung dòng 26 và Changelog); `specs/invoices.md:39`; `specs/sales.md:17`.
- Không sửa code, test, config, fails.md, task hoặc plan. Không nối lại phiên Orca cũ. Không tạo/xóa DB hoặc gọi provider trong lượt audit này.

## Tài liệu nguồn đã đối chiếu

`AGENTS.md`; `.devloopflow/devloopflow.md`; task active `20261109-sprint08-payment.md`; plan/spec nêu trên; `docs/PRODUCT_OVERVIEW.md`; `rules/testing.md`; `qa-evidence/README.md`; MEMORY liên quan nghiệm thu; `.devloopflow/MEMORY.md`; `.devloopflow/errors/INDEX.md`; report-13 và phụ lục 13b; hướng dẫn `verify-ac/references/ac-verifier.md`, templates `verify-report.md` và `fails.md` của devloopflow 0.3.6.

Nguồn code/test đọc trực tiếp theo đường dẫn đã có trong plan: `POS_UI/src/features/pos/LivePosScreen.tsx`, `POS_UI/test/live-payment.test.mjs`; script artifact `evidence/scripts/r14v-*.cjs`, `r14v-tests.sh`. Không dùng graph cũ hoặc thực hiện tìm symbol bằng graph trong lượt rà artifact này.

## Môi trường và nguồn gốc bằng chứng

Quy ước đường dẫn trong báo cáo:

- **R** = `.devloopflow/verify/20261109-sprint08-payment/evidence/r14-verify/`.
- **Q** = `.devloopflow/verify/20261109-sprint08-payment/evidence/r14-qa/`.
- **A** = `qa-evidence/20261111-184300-48ed476-s8-verify-ac-r14-audit/`.

Tất cả artifact gốc chỉ có ở **local**, không thể đối chiếu từ remote. Nhãn: **local do agent chạy**, không phải CI/runner độc lập. Đọc artifact do agent trước tạo không biến chúng thành kiểm tra browser/API mới hay xác nhận độc lập.

R có `r14v-git-state.txt`: HEAD `48ed476528a2db4f46fa379c64476c95b54d4caf`, working tree dirty, ghi 93 đường dẫn. `r14v-tests-index.jsonl` ghi từng lệnh/start/end/exit. `r14v-environment.json` ghi DB sandbox `pos_s8_qa_r14v_mwc1e5dl`, PostgreSQL `127.0.0.1:15432`, API `http://127.0.0.1:13181`, UI `http://localhost:15315`; không ngrok/SePay. Ảnh PNG 1180×820; URL UI khớp network browser. Lệnh app gốc: API `npm start`; UI `npm run dev -- --host 127.0.0.1 --port 15315 --strictPort`, theo các file `r14v-*-app.command.json`.

R ghi chạy test 11:27:39–11:28:08 UTC, app khởi tạo từ 11:29:38 UTC, HTTP/DB/browser sau đó, STOPPED 11:37:00.870 UTC. Q có STOPPED 10:37:25.063 UTC và được report-13 phụ lục 13b mô tả là QA local; chỉ dùng làm tham khảo bổ trợ, không làm căn cứ chính cho kết luận vòng này.

Lượt audit mới thực chạy 11:43:26–11:43:39 UTC: đọc 94 file R, kiểm parse JSON/JSONL và header/kích thước PNG, lưu SHA256/mtime vào `A/audit.json`; tính lại so sánh 4 đơn đã đóng từ các snapshot DB gốc, không chỉ tin file compare có sẵn. Kết quả cả 4 đơn giữ nguyên status/item_count/qty/total/updated_at sau đóng. Đã mở ảnh S1 khóa thực đơn, B38 dialog QR, B39 mở bàn; đọc snapshot/network/log được dẫn trong bảng dưới. SHA256 source hiện tại được ghi trong audit.json; mtime UI source/test cuối trước lượt chạy R. **R không có hash source tại thời điểm chạy gốc**, vì vậy HEAD/dirty/mtime hỗ trợ liên hệ phiên bản nhưng không chứng minh đồng nhất từng byte lịch sử. Hash hiện tại không thay thế hash lịch sử.

`docker ps --format '{{.Names}} {{.Status}}'` trong lượt audit chỉ thấy `redis-insight`; sandbox API/UI/PG không chạy. Không khởi động lại để tránh kéo dài hoặc thay đổi dữ liệu cũ. Không đưa mật khẩu fixture, cookie, token hoặc DB URL có credentials vào báo cáo này.

## Kết quả test

| Lượt | Lệnh thật | Kết quả | Artifact |
|---|---|---|---|
| Audit mới, POS_UI | `npm test` | exit 0; 85 tests, 85 pass, 0 fail, 0 skip | A/ui-test.stdout.txt, stderr.txt, process-results.jsonl |
| Audit mới, POS_UI | `npm run typecheck` | exit 0 | A/ui-typecheck.stdout.txt, stderr.txt, process-results.jsonl |
| Audit mới, POS_UI | `npm run build` | exit 0 | A/ui-build.stdout.txt, stderr.txt, process-results.jsonl |
| Audit mới, root | `python qa-evidence/20261111-184300-48ed476-s8-verify-ac-r14-audit/audit.py` | exit 0; 94 artifact, 4 đơn đóng không đổi, 6 source hash hiện tại | A/audit.stdout.txt, audit.stderr.txt, audit.json |
| R, đọc log gốc | `node --experimental-strip-types --test --test-name-pattern=PAID-DONE\|B-39\|B-40 test/live-payment.test.mjs` | exit 0; 20/20 | R/r14v-ui-focused-paid-done.stdout.txt, r14v-tests-index.jsonl |
| R, đọc log gốc, POS_API | `node --test --test-concurrency=1 dist/sales/tests/manager-cancel.integration.test.js dist/foundation.test.js` | exit 0; 6/6 gồm 4 subcase MGR-CANCEL | R/r14v-api-focused.stdout.txt, r14v-tests-index.jsonl |
| R, đọc log gốc | API build; UI test/typecheck/build | exit 0; UI 85/85 | R/r14v-api-build.stdout.txt, r14v-ui-test.stdout.txt, r14v-ui-typecheck.stdout.txt, r14v-ui-build.stdout.txt, r14v-tests-index.jsonl |

Không chạy lại API suite trong lượt audit này. Không diễn giải số test lịch sử là kết quả mới.

## Coverage

Không chạy: manifests/cấu hình dự án không có lệnh hoặc ngưỡng coverage. Không dùng số pass thay coverage.

## Đã đối chiếu errors

INDEX có hồ sơ cho các finding thuộc phạm vi: `20261111-paid-order-stays-selected-and-editable.md`, `20261111-pay-then-next-order-path-untested.md` (R16-1), `20261111-manager-cancel-open-behavior-untested.md` (R16-2), `20261111-plan-spec-missing-manager-cancel-decision.md` (R16-3), `20261111-spec-qr-pending-locks-payment-wrong.md` (B-38/R17-2), `20261111-stale-notice-and-missing-closed-order-asserts.md` (B-39/B-40). Đã đọc chi tiết R16-2, B-38 và B-39/B-40, đối chiếu test/log hiện tại; các hồ sơ còn lại xác nhận có trong INDEX. Không nghiệm thu lại tính đầy đủ toàn bộ sổ errors hoặc V12-1 vì ngoài phạm vi vòng 14.

## Bảng đối chiếu AC và từng vế trong phạm vi

| AC | Cách kiểm / bước đã chạy | Kết quả thật và artifact | Mong đợi / nguồn nguyên văn | Kết luận | Giới hạn |
|---|---|---|---|---|---|
| ST-8.AC-3(a),(g) | Test hiện tại PAID-DONE-1/4 và B-40; đọc assertions | A/ui-test.stdout.txt: pass; test kiểm disabled menu, không gọi addItem, ẩn control, initialInvoiceId PAID chỉ xem | Plan:46: “đơn đang chọn không `OPEN`: thực đơn khóa”; “đơn đã `PAID` mở bằng `initialInvoiceId` ... chỉ để xem, đã khóa” | Đúng ở mức component test | Không có browser qua màn Hóa đơn thật; màn đó được delta plan loại khỏi thay đổi. Không tuyên bố màn Hóa đơn đã nối API |
| ST-8.AC-3(b) | PAID-DONE-2/8; R browser reload | R/r14v-ST8AC3b-01-selected-before-reload.png, 02-after-reload-paid-deselected.png/.yml, r14v-act.jsonl Sb-external-pay; A test pass | Plan:46: “làm mới đơn (`refreshOrders`) trả `PAID`/`CANCELLED` thì bỏ chọn” | Sai do thiếu chứng cứ | PAID có test/browser; chưa thấy ca refreshOrders trả CANCELLED. Hủy thành công qua perform là đường khác |
| ST-8.AC-3(c) | PAID-DONE-5, B-40; browser hủy và sửa số lượng | A test pass; R/r14v-E2E8-S2-02-after-cancel.png/.yml, r14v-ST8AC3c-01-open-perform-keeps-selection.png/.yml; DB s2-after-cancel, c-after-plus-transfer | Plan:46: “bỏ chọn ngay, hiện ‘Đã hủy đơn.’ ... hoặc ‘Đơn đã đóng.’ ... trả đơn `OPEN` ... vẫn giữ chọn” | Đúng | perform trả PAID được component test B-40; không coi đó là browser thật |
| ST-8.AC-3(d) | PAID-DONE-6 ×2, browser bàn có danh sách cũ PAID | R/r14v-E2E8-S3-01-map-stale-before.png/.yml, 02-table-new-order.png/.yml; audit-s3-before/after-table-click; A test pass | Plan:46: “đơn lưu trong danh sách cũ đã `PAID`/`CANCELLED` ... tạo đơn tại bàn mới” | Sai do thiếu chứng cứ | PAID và bàn OPEN thật đã có; thiếu ca danh sách bàn cũ trỏ đến CANCELLED |
| ST-8.AC-3(e) | PAID-DONE-7 ×2, browser danh sách cũ | R/r14v-E2E8-S4-01-stale-list-before-click.png, 02-stale-click-result.png/.yml; r14v-act.jsonl S4-external-pay; A test pass | Plan:46: “server báo không còn `OPEN`: không chọn, làm mới danh sách, hiện ‘Đơn đã thanh toán hoặc đã đóng. Danh sách đã được làm mới.’” | Đúng cho tình huống PAID đã chạy | Ảnh/snapshot sau vẫn có đơn OPEN được chọn từ trước; không phải chọn lại đơn PAID. Không suy panel phải trống khi trước đó đang chọn một đơn OPEN khác |
| ST-8.AC-3(f) | PAID-DONE-3 ×2; browser thêm món B và QR chờ | A test pass; R/r14v-E2E8-S1-05-item-added-to-B.png/.yml; r14v-ST8AC3f-01-qr-pending-locked.png/.yml; DB c-after-plus-transfer | Plan:46: “đơn `OPEN` chưa có QR chờ vẫn thêm món; đơn `OPEN` có QR chờ vẫn khóa như cũ” | Đúng | Không thử lại provider |
| E2E-AC-8, thanh toán → B | R browser thanh toán A, tạo B, thêm món; audit DB tính lại mới | S1 network: POST payments 201, POST invoices 201, POST B/items 201; A=HDVYU7ZPU9 PAID 1 món, B=HDHLCORZIL OPEN 1 món 25.000đ. R/r14v-E2E8-S1-01..05*, audit-s1-after-pay, audit-s1-after-add-b; A/audit.json | Plan:164: “panel bỏ chọn A, thực đơn khóa ... tạo đơn B cho khách mới → món chỉ thêm vào B, A không đổi” | Đúng | Khẳng định DB dựa snapshot, không dựa ảnh đơn lẻ |
| E2E-AC-8, hủy → B | R browser hủy A và chọn đơn khác; B-39 unit tạo mới sau hủy | R S2 ảnh/snapshot và audit: HDTDH3GGNT CANCELLED, item_count=1; A/audit.json tính lại 8 snapshot sau đóng không đổi; A test B-39 pass | Plan:164: “thu ngân thanh toán hoặc hủy đơn A ... tạo đơn B ... món chỉ thêm vào B” | Sai do thiếu chứng cứ | Chưa có browser + network + DB riêng chứng minh hủy A rồi tạo B và thêm món vào B. Không lấy luồng thanh toán hoặc chọn đơn đã có thay thế |
| E2E-AC-8, bàn cũ PAID | R S3 browser/DB | HD41XJILFS giữ PAID; chạm bàn tạo HD4SCHC8XA OPEN. A/audit.json tính lại 6 snapshot sau đóng không đổi | Plan:164: “chạm bàn tạo đơn mới, không mở đơn cũ” | Đúng | Không mở rộng kết luận sang nhánh CANCELLED còn thiếu của ST-8.AC-3(d) |
| AC-M1, có ca | HTTP M1a + DB trước/sau | R/r14v-mgr-http.jsonl, r14v-mgr-assert.jsonl, audit-m1a-before/after.json: HTTP 200, CANCELLED, cancelled_by=qa14v_mgr2 | Plan:58: “MANAGER có ca CASHIER OPEN của mình ... → 200, `CANCELLED`, `cancelled_by` = MANAGER”; specs/sales.md:17 cấp quyền và giữ điều kiện ca/branch | Đúng | Artifact gốc của lượt R, không tái chạy HTTP trong audit |
| AC-M1, không ca | HTTP M1b + DB | Cùng log; audit-m1b-before/after.json: 409 SHIFT_NOT_OPEN, invoice/payments không đổi | Plan:58: “không có ca CASHIER OPEN → 409 `SHIFT_NOT_OPEN`, DB không đổi” | Đúng | Không suy từ assert quyền đơn thuần |
| AC-M1, branch khác | HTTP M1c + DB | Cùng log; audit-m1c-before/after.json: 404 NOT_FOUND, DB không đổi; mgr có ca riêng B2 | Plan:58: “chi nhánh khác (không `branch.access_all`) → 404 `NOT_FOUND`, DB không đổi” | Đúng | Đã phân biệt tình huống không ca (409) với khác branch có ca (404) |
| B-38 | So spec + browser QR | R/r14v-B38-01-qr-pending-payment-dialog.png/.yml: dialog “Đang chờ chuyển khoản”, có Hủy chờ/Đóng; menu khóa | specs/invoices.md:39: “Với đơn `OPEN` có QR chờ, nút ‘Thanh toán’ vẫn hiện nhưng chỉ để mở lại QR, hủy chờ hoặc xác nhận thủ công (không sửa đơn)” | Đúng | CASHIER trong ảnh không có xác nhận thủ công; không phải thiếu quyền quản lý |
| B-39 | 4 test hiện tại + browser tạo/chọn/mở bàn | A/ui-test.stdout.txt B-39 ×4 pass; R/r14v-E2E8-S1-04-new-order-B.yml không notice cũ; r14v-B39-01-cancel-notice-gone-on-choose.png/.yml; B39-02 có notice trước mở bàn, B39-03 mất notice và chọn OPEN | Error B-39 mục Cách fix: “chỉ khi đơn trả về là `OPEN` ... nhánh không OPEN giữ nguyên nên ‘Đã hủy đơn.’ vẫn hiện ngay sau hủy” | Đúng | Nhánh hủy rồi tạo mới có component test; không dùng kết quả này tự tick toàn bộ E2E-AC-8 |

AC ngoài phạm vi **không chạy lại/không đổi kết luận**: R2-1.AC-1..3; ST-1.AC-1..2, ST-2.AC-1, ST-3.AC-1, ST-4.AC-1, ST-5.AC-1..2, ST-6.AC-1, ST-7.AC-1, ST-8.AC-1..2; E2E-AC-1..7; RF-1..5; FAIL lịch sử V1-4/V11-1/V12-1. Báo cáo này không đóng Sprint 08 hay nghiệm thu lại provider.

## Đối chiếu spec cấp tính năng

| Mục spec | Loại | Bước / bằng chứng | Kết luận |
|---|---|---|---|
| Spec task:26: “Sau khi thanh toán hoặc hủy thành công đơn bị bỏ chọn” | Mục tiêu | S1/S2 browser, DB, PAID-DONE test mới | Đúng |
| Spec task:26: “Nếu danh sách ... còn lưu một đơn cũ mà server báo đã không còn `OPEN`, UI không chọn đơn đó” | Mục tiêu | Bàn/list PAID có chứng cứ; nhánh bàn CANCELLED chưa có | Sai do thiếu chứng cứ theo ST-8.AC-3(d) |
| Spec task mục Phản mục tiêu: “đơn mới cho khách mới bị gộp vào đơn đã thanh toán” | Phản mục tiêu | B mới có món, 4 đơn đóng giữ nguyên qua snapshot; A/audit.json | Đúng trong các ca đã chạy |
| Spec task Phi mục tiêu: “không bật giao dịch ngân hàng Live” | Phi mục tiêu/ràng buộc | Lượt audit chỉ đọc file/test UI; R sandbox không ngrok/SePay | Đúng trong phạm vi kiểm |
| Spec task Changelog: quyết định MANAGER vẫn cần ca riêng/cùng branch | Ràng buộc | M1a–c HTTP + DB | Đúng |

## FAIL / bug và đề xuất cập nhật sổ

**Không sửa fails.md theo phân công của agent chính.** Hai mục dưới đây là nội dung đề xuất để agent chính thêm vào sổ; không tuyên bố đã được ghi vào fails.md.

- **V14-1 — ST-8.AC-3(b),(d), loại Không có chứng cứ, trạng thái đề xuất mở.**
  - Kỳ vọng nguyên văn plan:46: “làm mới đơn (`refreshOrders`) trả `PAID`/`CANCELLED` thì bỏ chọn”; “đơn lưu trong danh sách cũ đã `PAID`/`CANCELLED` ... tạo đơn tại bàn mới”.
  - Thực tế: các test/bằng chứng liên quan PAID-DONE-2/6/8 và browser Sb/S3 chỉ có PAID. Ca CANCELLED hiện có chứng minh perform hủy, không chứng minh refresh trả CANCELLED hoặc stale-table CANCELLED.
  - Bước kiểm còn thiếu: giữ đơn đang chọn và danh sách bàn cũ; ở phiên/API khác hủy A; lần lượt tải lại đơn hoặc chạm bàn cũ; quan sát bỏ chọn/khóa menu hoặc tạo DINE_IN mới, DB A không đổi.
  - Path bằng chứng về phạm vi đã có: A/audit.json; R/r14v-ui-focused-paid-done.stdout.txt; R/r14v-ST8AC3b-02-after-reload-paid-deselected.yml; R/r14v-E2E8-S3-02-table-new-order.yml.
  - Test tái hiện đề xuất: `[PAID-DONE-CANCELLED-refresh-table]` | input: server trả CANCELLED sau khi danh sách/selection lưu OPEN | expected: bỏ chọn đúng đường refresh, không chọn đơn cũ khi chạm bàn, tạo DINE_IN mới; không thêm món A. Không cần sửa production trước khi có lỗi thật.

- **V14-2 — E2E-AC-8 nhánh hủy → khách mới, loại Không có chứng cứ, trạng thái đề xuất mở.**
  - Kỳ vọng nguyên văn plan:164: “thu ngân thanh toán hoặc hủy đơn A → panel bỏ chọn A ... tạo đơn B cho khách mới → món chỉ thêm vào B, A không đổi”.
  - Thực tế: S2 đã hủy/bỏ chọn, DB CANCELLED không đổi; chưa có chuỗi browser sau hủy tạo B và thêm món B kèm request/response và DB trước/sau. S1 là nhánh thanh toán; B39 chọn đơn có sẵn là hành động khác.
  - Bước kiểm còn thiếu: browser hủy A; lưu UI/HTTP/DB; tạo mới B và thêm món; lưu UI/HTTP/DB đối chiếu ID, status/item A và món B. Không dựng hồi tố snapshot trước.
  - Path bằng chứng đã có: R/r14v-E2E8-S2-01-cancel-order-selected.png, 02-after-cancel.png/.yml; R/r14v-audit-s2-after-cancel.json; A/audit.json.
  - Test tái hiện đề xuất: `[E2E8-cancel-then-next-customer]` | input: A OPEN được hủy qua UI, B mới tạo, thêm một món | expected: A CANCELLED giữ món/tổng cũ, POST items chỉ nhắm B, B OPEN có món mới; notice cũ không theo B.

## Lệch tài liệu

Không phát hiện mâu thuẫn nghiệp vụ mới trong phần đối chiếu. Plan còn các câu tiến độ “browser QA ... CHƯA chạy” ở delta dòng 44/50, trong khi R/Q đã có artifact; đây là tiến độ cần agent chính đồng bộ, không phải lý do hủy AC. B-38 hiện đã mô tả đúng đường mở lại QR.

## Đánh giá test

20 test PAID-DONE/B39/B40 có assertion hành vi và service calls; 85 test UI hiện tại không skip. Chúng dùng harness/component với service giả lập, không thay DB/browser thật. MGR-CANCEL đi HTTP/PostgreSQL thật trong sandbox theo log và test; raw HTTP/DB có cả thành công và lỗi. Không dùng file GREEN của người sửa như chứng minh độc lập. Chưa thấy test riêng CANCELLED cho các nhánh V14-1. Không yêu cầu sửa source chỉ để hoàn thiện số test khi chưa quan sát lỗi.

## Exploratory

R có M1d tạm thu quyền MANAGER: 403 PERMISSION_DENIED, DB không đổi, quyền được cấp lại trong log; X1 hủy lại CANCELLED: 409 INVOICE_NOT_OPEN; X2 hủy PAID: 409 và snapshot không đổi; X3 khác branch nhưng không ca: 409 SHIFT_NOT_OPEN; X4 stale selected rồi bấm `+`: browser 409 và panel bỏ chọn (`r14v-X4-stale-selected-plus-409.*`). Console R có các 401 khi chưa đăng nhập/refresh, favicon 404, và 409 của X4; không báo console sạch. Không coi các lỗi HTTP dự kiến này là lỗi sản phẩm mới.

Các case cũ liên quan stale selection, pay→B, permission đã có test/R như bảng. Không chạy lại RF về provider/idempotency/promo ngoài phạm vi được giao.

## Đề xuất và bước tiếp theo

1. Giữ ST-8.AC-3/E2E-AC-8 chưa tick cho tới khi có V14-1/V14-2 đủ evidence; ghi hai mục vào fails.md theo thẩm quyền agent chính. Giữ các FAIL lịch sử ngoài phạm vi.
2. Thu một lượt sandbox mới nhỏ cho các ca thiếu; tạo matrix trước, lưu ảnh/snapshot/browser request/response và DB trước/sau ngay khi chạy. Không cần lặp toàn bộ sprint hoặc provider thật.
3. Agent chính đồng bộ task/plan/S8-07 theo trạng thái có chứng cứ và thực hiện semantic Graphify update cho Markdown mới; verifier không chỉnh graph dùng chung trong phân công này.
4. Không gọi báo cáo này là QA độc lập/CI hoặc nghiệm thu toàn bộ. Không commit/push raw artifact. Audit mới không tạo process dịch vụ cần dọn và giữ nguyên dữ liệu cũ.
