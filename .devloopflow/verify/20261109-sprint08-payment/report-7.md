# Kiểm AC 20261109-sprint08-payment — vòng 7

## Kết luận

**FAIL**. V3-1 **đã PASS**. V3-2 đạt phần hành vi API/DB/UI đã sửa nhưng **giữ mở — Lệch tài liệu**: hai dòng schema còn yêu cầu tài khoản khớp trước khi gắn tenant, trái quyết định mới và dữ liệu chạy thật. V1-4 **giữ mở — Không có chứng cứ SePay Test mode provider thật**. Không sửa source/test/config/plan/task và không tự chọn hoặc sửa tài liệu mâu thuẫn.

- Ngày: 09/11/2026, local do agent chạy; đây là verifier context sạch, **không phải CI/runner độc lập**.
- Plan: `.devloopflow/approved/20261109-sprint08-payment.md` và bản active, đặc biệt :136,286,323.
- Spec: `.devloopflow/specs/20261109-sprint08-payment.md`, draft API cùng id; contract hiện hành `specs/invoices.md`.
- Chỉ kiểm lại V1-4, V3-1, V3-2. Các kết quả cũ không được dùng thay bằng chứng mới.
- Run: `qa-evidence/20261109-verify-ac-r7/run.md`. Artifact thô chỉ ở local; không thể đối chiếu từ remote.

## Tài liệu nguồn đã đối chiếu

- `AGENTS.md`, `.devloopflow/devloopflow.md`, `rules/testing.md`, `rules/security.md`: môi trường, credential, lệnh kiểm và artifact.
- `.devloopflow/approved/20261109-sprint08-payment.md`, `.devloopflow/plans/active/20261109-sprint08-payment.md`, task active cùng id: AC gốc, quyết định và lịch sử fix.
- `.devloopflow/specs/20261109-sprint08-payment.md`, `.devloopflow/specs/20261109-sprint08-payment-api.md`: mục tiêu, ràng buộc, draft API và nguồn plan.
- `docs/PRODUCT_OVERVIEW.md`: tenant, quyền, tiền, transaction và phân biệt local/provider.
- `docs/BUSINESS_RULES.md:162`, `THIRD_PARTY_INTEGRATIONS.md:3,10,12,28`: BR-33, ngoại lệ và Test mode chưa kiểm thật.
- `specs/invoices.md:36,97,101,120,122`: IN/OUT, scope, DTO, schema và message literal. Có mâu thuẫn nội bộ ở :120, ghi riêng bên dưới.
- `docs/api-spec.md:198-217,368-374`, `docs/DESIGN_DB_POS_SYSTEM.md:410-428`: error envelope, mã lỗi và event scope. Có mâu thuẫn :423.
- `.devloopflow/MEMORY.md`, tiêu đề và bài học liên quan trong root `MEMORY.md`, `.devloopflow/errors/INDEX.md`, hồ sơ lỗi liên quan; `fails.md`, `report-6.md`.

Đọc sâu giới hạn ở ba FAIL được giao; không tuyên bố audit lại toàn bộ tài liệu hoặc AC đã đóng.

## Môi trường

- HEAD `48ed476528a2db4f46fa379c64476c95b54d4caf`, working tree dirty giữ nguyên; status đầu ở `evidence/r7-run-live/environment.json` và QA `status-before.txt`.
- API hiện có `pos_s8_api_verify_r6`: `http://127.0.0.1:13040/api/v1`; UI `pos_s8_ui_verify_r6`: `http://localhost:15174`, proxy API; PostgreSQL `pos_sprint08_test_pg`, port 55432, DB `pos_s8_verify4_ac`.
- Không khởi động lại, đổi hoặc dừng các container. Môi trường SePay có `SEPAY_ENV=test` và có webhook secret; **điều này không chứng minh provider Test mode đã cấu hình**.
- Docker image IDs tại `evidence/r7-provenance.json`. SHA256 trong `evidence/r7-checksums.json`: hai API service dist và hai UI component trùng local. Sau build mới, `evidence/r7-postbuild-checksums.json` xác nhận dist API hiện tại vẫn trùng container, tránh dùng dist local cũ làm chứng cứ.
- Fixture giả ngẫu nhiên được tạo bằng API trong sandbox hiện có. Credential, cookie, HMAC secret chỉ trong RAM; request/response che password/token/signature và bootstrap identity. Bridge loopback 15377 phục vụ session cho MCP browser trong RAM, đã đóng sau chạy; process harness exit 0.
- Giữ nguyên DB và dữ liệu test theo giới hạn lượt này; không DELETE/DROP hoặc xóa container/data. API integration suite có thao tác tự tạo/xóa database nên không chạy trong lượt bị ràng buộc không xóa DB/data này.

## Ma trận trước chạy và bằng chứng

Ma trận được ghi **trước fixture/chạy hành vi** tại `evidence/r7-matrix.md`. Harness: `evidence/scripts/r7-verify.mjs`. Artifact chính API/DB ở `evidence/r7-run-live/`.

| Tiêu chí | Tình huống | Artifact đã mở lại | Kết quả |
|---|---|---|---|
| V3-1, TRANSFER_PENDING | R7-M1a..g: thêm món, áp mã, bỏ mã, CASH, complete-zero, QR thứ hai, PATCH bank | `r7-run-live/http.jsonl`, `db.jsonl`, `assertions.jsonl`; DB mỗi ID `-before`/`-after` | 7 lần 409, code/message/requestId đúng; DB business state trước=sau; PATCH bank dùng message riêng đã duyệt |
| V3-1, TRANSFER_NOT_PENDING | R7-M2a/b: cancel lại và manual lượt CANCELLED | Cùng ba file trên | 409 đúng literal, DB trước=sau |
| V3-1, BANK_ACCOUNT_REQUIRED | R7-M3: store thứ hai chưa cài account | Cùng ba file trên | 409 đúng literal, DB trước=sau |
| V3-1, TRANSFER_AMOUNT_INSUFFICIENT | R7-M4: 39.999đ cho đơn 40.000đ | Cùng ba file trên | 422 đúng literal, DB trước=sau |
| V3-1, BANK_TRANSACTION_REUSED | R7-M5: ref ngân hàng đã dùng cho invoice được manual PAID thật | Cùng ba file trên; `R7-manual-success-before/after` | 409 đúng literal, không tạo payment/movement thứ hai cho đơn bị từ chối |
| V3-2, IN sai account | R7-W1: một reference đúng, HMAC đúng, IN 39.000đ sai account cho invoice có promo | Cùng ba file; `fixture-ids.json` | 200 success; một QUARANTINED có store/branch/invoice/attempt; đơn OPEN/lượt PENDING; không đổi payment, stock, movement, promo used_count |
| V3-2, quyền/scope | R7-W2-owner/manager/other-manager/other-store-owner/cashier | HTTP từng actor, DB R7-W2-before/after | OWNER và MANAGER đúng branch thấy WRONG_ACCOUNT; branch khác/store khác không thấy; CASHIER 403; DTO đúng 5 field, không raw payload/secret |
| V3-2, replay | R7-W3 | HTTP + DB trước/sau | ACK 200; toàn bộ state gồm events trước=sau, đúng một event IN |
| V3-2, OUT | R7-W4, R7-W4-hidden | HTTP + DB trước/sau + list OWNER | 200; QUARANTINED nội bộ có cả 4 scope ID NULL; không payment/stock/promo; chỉ một exception IN hiển thị |
| V3-2, UI trước/sau | R7-U1/U2: MANAGER không có ca riêng, mở đơn ca CASHIER, modal trước IN → mở lại sau IN → reload và mở lại | `r7-ui-before.png`, `.snapshot.txt`, `.network.txt`; `r7-ui-reopened.png`, `.snapshot.txt`, `.network.txt`; `r7-ui-reload.png`, `.snapshot.txt`, `.network.txt` | Trước: “Chưa có giao dịch cần xử lý.”; sau/reload: “Sai tài khoản nhận · 39.000đ”; vẫn “Đang chờ chuyển khoản”, nền OPEN, không báo thành công; network GET exceptions 200 reason WRONG_ACCOUNT, GET invoice OPEN, GET attempt PENDING |
| V3-2, đối chiếu schema | R7-DOC | `r7-source-compare.txt` + event R7-W1-after | Mâu thuẫn với hai câu schema; Lệch tài liệu, chưa đóng |
| V1-4 | R7-P1 | `r7-run-live/environment.json`, nguồn `THIRD_PARTY_INTEGRATIONS.md:3,12` | Không có dashboard/provider mô phỏng mới; không PASS |

Viewport browser 1366×900, URL `http://localhost:15174/`. Đã mở và xem ảnh trước, reopened, reload; đọc network response, snapshot, HTTP JSONL, SQL JSONL và assertion output. Ảnh không được dùng thay SQL. `r7-ui-after.png/.snapshot.txt/.network.txt` ghi lần chờ tự cập nhật bị timeout, không được dùng chứng minh UI sau nạp lại. Ứng dụng poll invoice/attempt, chưa thấy danh sách ngoại lệ tự cập nhật trong 15 giây; đóng/mở modal và reload đều lấy đúng dữ liệu. Không có contract trong phạm vi này buộc ngoại lệ tự poll, nên không tự tạo business rule hoặc finding code mới.

## Kết quả test

- Harness HTTP/DB mới: **22/22 assertion đạt**, process exit 0. Log `evidence/r7-run-live-console.log`; kết quả máy ghi `r7-run-live/assertions.jsonl`, `finished.json`. Đây là 22 kiểm tra của harness, không gọi là 22 test của suite dự án.
- `npm --prefix POS_UI test`: **54/54 tests**, 0 fail/skip, exit 0; `evidence/r7-ui-test.log`, `r7-ui-test.exit`. Có test `[V3-2] exception list shows a Vietnamese label for transfers to the wrong receiving account` (test 19).
- `npm --prefix POS_API run build`: exit 0, `evidence/r7-api-build.log`, `.exit`.
- `npm --prefix POS_UI run build`: exit 0, `evidence/r7-ui-build.log`, `.exit`; typecheck và Vite build đã chạy.
- Không chạy API integration suite, không viện dẫn 129/129 hoặc log cũ làm kết quả R7. Hành vi API của hai fix được kiểm HTTP thật/SQL thật bằng harness mới.
- Hai lần chuẩn bị harness ban đầu exit 1: quantity recipe dùng number thay decimal-string (422); truy vấn invoice dùng cột store_id không tồn tại. Log tại `r7-run-console.log`, `r7-run-final-console.log` và thư mục cùng tên; không phải finding product. Đã sửa **harness kiểm tra**, giữ log và fixture cũ; lượt `r7-run-live` đầy đủ mới dùng kết luận.

## Coverage

Không có script/threshold coverage trong manifest/CI theo cấu hình dự án. Không chạy coverage, không tạo số liệu.

## Đã đối chiếu errors

- `.devloopflow/errors/20261109-sepay-wrong-account-hidden.md`: đã đọc toàn bộ; đúng tình huống cũ được thực thi lại bằng R7-M1..5 và R7-W1..4 cùng UI label. Fix hành vi được xác nhận; phần tài liệu schema tồn lưu được báo bên dưới.
- `.devloopflow/errors/20261109-owner-access-all-branch-scope.md`, `20261109-sepay-malformed-json-code.md`, `20261109-sepay-unsigned-webhook-status.md`: đã đối chiếu hồ sơ nguồn. Không chạy lại các AC đã đóng ngoài ba FAIL được giao; không coi đọc hồ sơ là test. Scope exception có case đúng/sai branch/store mới ở R7-W2.
- Task active và INDEX có hồ sơ cho R1-1/R3-1, R1-2, R2-1, V1-1, V2-2, V3-1/V3-2; file V3 đủ triệu chứng, nguyên nhân, cách sửa và kiểm chứng. Không thấy finding đã sửa thuộc phạm vi retry bị thiếu hồ sơ errors; không kiểm lại đầy đủ finding ngoài phạm vi.
- `.devloopflow/MEMORY.md` chưa có mục Hay quên có hiệu lực; không tạo M-n giả. Root MEMORY về QA nguyên bản, UUID và SQL read-only được áp dụng bằng UUID server, trace thật và mở lại artifact.

## Bảng đối chiếu các FAIL được yêu cầu kiểm lại

| AC / FAIL | Cách kiểm, bước đã chạy | Kết quả thật | Mong đợi theo plan | Quy định nguồn nguyên văn | Kết luận | Chỗ lệch |
|---|---|---|---|---|---|---|
| V3-1, plan :136 | R7-M1a..g, M2a/b, M3, M4, M5; từng HTTP và SQL before/after | 12 assertion PASS; 409/422 đúng message/code/requestId; không mutation | 5 mã lỗi đúng message; PATCH bank có ngoại lệ plan :323 | “Lượt chuyển khoản không còn chờ xác nhận.”; “Cửa hàng chưa cài tài khoản nhận chuyển khoản.”; “Giao dịch ngân hàng đã được dùng để xác nhận đơn khác.”; “Số tiền thực nhận chưa đủ để thanh toán đơn.” (`specs/invoices.md:122`); “Đơn đang chờ chuyển khoản. Hủy chờ trước khi sửa hoặc thanh toán.” (cùng dòng) | **Đúng / PASS** | Không còn lệch ở các ngữ cảnh đã gây ra thật |
| V3-2, BR-33 / plan :323 | R7-W1..4, R7-U1/U2, R7-DOC | IN scoped, list đúng quyền, replay/OUT đúng; browser label đúng sau nạp lại; SQL scope trái hai câu schema | “giao dịch tiền vào có đúng một mã lượt nhưng sai tài khoản nhận được gắn store/branch theo lượt và hiện cho MANAGER/OWNER với lý do `WRONG_ACCOUNT`” (approved plan :323) | “được gắn store/branch theo lượt và hiện cho MANAGER/OWNER với lý do `WRONG_ACCOUNT`” (`specs/invoices.md:36`), nhưng “chỉ set tenant/branch sau khi ref duy nhất **và** account snapshot khớp” (`specs/invoices.md:120`); “Chỉ gán khi mã lượt duy nhất và tài khoản khớp snapshot” (`docs/DESIGN_DB_POS_SYSTEM.md:423`) | **Lệch tài liệu / FAIL** | Không tự chọn giữa nguồn mâu thuẫn; giữ V3-2 mở dù fix hành vi đã đạt |
| V1-4, QA Test mode | Kiểm môi trường local; không gọi provider chưa xác nhận | Không có artifact dashboard/provider simulated transaction mới | Plan :286 đòi dashboard, webhook, GET invoice và DB cho đúng/thiếu/thừa/muộn/promo invalid | “chưa kiểm SePay Test mode thật” (`THIRD_PARTY_INTEGRATIONS.md:3`); “chưa chạy Mô phỏng giao dịch của SePay Test mode” (`:12`) | **Sai / Không có chứng cứ** | Giữ mở; HMAC local không chứng minh provider đầu cuối |

AC không chạy lại: E2E-AC-1..7; R2-1.AC-1..3; ST-1.AC-1/2, ST-2.AC-1, ST-3.AC-1, ST-4.AC-1, ST-5.AC-1/2, ST-6.AC-1, ST-7.AC-1, ST-8.AC-1/2; RF-1..5. Các phần ST-5/6/7/8 trùng ba FAIL được kiểm riêng như trên, không kết luận lại toàn bộ AC hoặc hồi quy toàn hệ thống.

## Đối chiếu spec (cấp tính năng)

| Mục spec nguyên văn | Loại | AC / bước chạy | Kết quả thật | Kết luận |
|---|---|---|---|---|
| “UI chỉ báo thành công khi server đã xác nhận” (`.devloopflow/specs/20261109-sprint08-payment.md`, Mục tiêu QR) | Mục tiêu liên quan | R7-U1/U2, W1 | Sau sai account và reload vẫn chờ, invoice OPEN, attempt PENDING | Đúng cho nhánh đã chạy |
| “Ghi payment hai lần, tăng lượt mã/trừ kho hai lần khi retry/webhook lặp” (cùng spec, Phản mục tiêu) | Phản mục tiêu | R7-W1/W3/W4 | Không có payment/movement/promo/stock delta khi sai account/replay/OUT; đúng một event IN | Đúng cho nhánh đã chạy |
| “lộ hóa đơn của store/branch khác” (cùng spec, Phản mục tiêu) | Phản mục tiêu | R7-W2 | Branch khác/store khác không thấy exception, CASHIER 403 | Đúng cho route đã chạy |
| “không bật giao dịch ngân hàng Live trong Sprint 08” (cùng spec, Phi mục tiêu) | Phi mục tiêu | Toàn bộ R7 | Không gọi Live; local HMAC ký test | Đúng cho hành động R7 |
| “dùng Test mode để kiểm thử, không dùng tiền thật” (cùng spec, Ràng buộc) | Ràng buộc | R7-P1 | Không có provider Test mode xác nhận; không dùng tiền thật | Chưa xác minh end-to-end; V1-4 mở |

Các mục tiêu/ràng buộc còn lại ngoài ba FAIL không được chạy lại. Tài liệu schema mâu thuẫn khiến V3-2 chưa thể đóng theo đối chiếu ba phía.

## FAIL / bug

- **V1-4 — Không có chứng cứ:** cần provider Test mode thật. Bước tái hiện đề xuất: cấu hình dashboard Test mode xác nhận cùng account, webhook HMAC, mô phỏng các tình huống plan :286 và lưu dashboard/HTTP/SQL. Test đề xuất `test_SePay_provider_test_mode_e2e` | input đúng/thiếu/thừa/muộn/promo invalid | expected theo từng contract, có trace provider. Hiện chỉ local HMAC, không đủ.
- **V3-2 — Lệch tài liệu:** R7-W1 tái hiện IN sai account có một reference; HTTP 200, DB event QUARANTINED gắn đủ scope và GET exceptions WRONG_ACCOUNT, khớp approved :323/spec :36,:101/BR-33, trái schema spec :120 và DB :423. Bằng chứng `r7-run-live/http.jsonl`, `db.jsonl`, `assertions.jsonl`, `r7-source-compare.txt`, ảnh/network UI đã dẫn. Test tái hiện đề xuất `test_BR33_wrong_account_contract_is_consistent` | input cùng R7-W1 và đối chiếu schema sau quyết định user | expected code/plan/spec/DB docs cùng quy tắc cho IN sai account; không đổi code chỉ để chấp nhận tài liệu cũ. Đây là phần mâu thuẫn còn lại của V3-2, không có finding code mới.

## Lệch tài liệu

V3-2: approved plan :323 nói nguyên văn “giao dịch tiền vào có đúng một mã lượt nhưng sai tài khoản nhận được gắn store/branch theo lượt và hiện cho MANAGER/OWNER với lý do `WRONG_ACCOUNT`”. `specs/invoices.md:36,101`, BR-33 và hành vi mới khớp quy tắc này. Nhưng `specs/invoices.md:120` vẫn nói “chỉ set tenant/branch sau khi ref duy nhất **và** account snapshot khớp”; `docs/DESIGN_DB_POS_SYSTEM.md:423` cột store_id vẫn nói “Chỉ gán khi mã lượt duy nhất và tài khoản khớp snapshot”. Hai câu không chứa ngoại lệ cho IN sai account. Đã lưu trích đoạn nguyên văn mới ở `evidence/r7-source-compare.txt`; không tự chọn phía đúng hoặc sửa file nguồn.

## Đánh giá test

Harness gọi API thật với auth cookie/CSRF và PostgreSQL thật; không mock webhook processor, scope query hoặc transaction. Assert so exact message và requestId, state trước/sau; wrong-account case có recipe/promo để quan sát stock/movement/used_count, một payment manual thật để gây duplicate bank ref. UI test 19 kiểm nhãn và browser bổ sung hiển thị thật, tránh chỉ suy từ source/assertion UI. Không có bằng chứng provider Test mode thật; không suy từ test local. Không kiểm lại race/load toàn hệ thống hoặc tất cả AC đã PASS trước.

## Exploratory

- Lỗi V3 cũ: đủ các ngữ cảnh message, IN wrong account, quyền/scope, replay và OUT, tất cả đã chạy bằng chứng mới.
- Pending khóa cả bỏ mã và complete-zero: cùng message, không mutation.
- MANAGER không có ca riêng vẫn mở hóa đơn ca thu ngân, xem và nạp lại ngoại lệ; không thực hiện manual thanh toán nhánh sai account trong UI.
- Chờ tự cập nhật nhãn 15 giây timeout; sau đóng/mở và reload hiển thị đúng. Ghi nhận giới hạn quan sát, không tự quy thành requirement.
- Console chỉ có favicon 404 và gợi ý React DevTools (`r7-browser-console.txt`), không có lỗi luồng thanh toán quan sát được.
- RF-1..5 và errors đã đóng không thuộc retry này; không báo đã thực thi lại.

## Đề xuất

Trình user hai câu schema còn mâu thuẫn để đồng bộ theo quyết định đã chốt hoặc chốt lại nguồn; verifier không sửa. V1-4 cần SePay Webhooks Test mode thật cùng artifact provider. Chưa đóng task; V3-1 được cập nhật đã PASS, V3-2 và V1-4 tiếp tục mở. Agent chính cập nhật task/plan và semantic Graphify cho Markdown theo AGENTS; verifier không sửa graph ngoài phạm vi.
