# Kiểm AC 20261109-sprint08-payment — vòng 8

## Kết luận

**FAIL do V1-4 còn mở. V3-2 đã PASS ở lần 8.** Không có finding code mới. Hai câu schema đã khớp quyết định được duyệt và hành vi API/DB/UI chạy mới; không còn lệch tài liệu hiện hành của V3-2.

- Ngày: 09/11/2026. **Local do agent chạy**, verifier context sạch; không phải CI/runner độc lập.
- Plan đối chiếu: `.devloopflow/approved/20261109-sprint08-payment.md:286,323` và bản active.
- Spec đối chiếu: `.devloopflow/specs/20261109-sprint08-payment.md`; contract đã chốt `specs/invoices.md:36,101,120`.
- Phạm vi retry: **chỉ V1-4 và V3-2**. Không dùng kết quả cũ thay chạy mới, không sửa source/test/config/plan/task và không xóa DB/container/data.
- Run: `qa-evidence/20261109-211627-48ed476-s8-verify-ac-r8/run.md`. Artifact thô chỉ có ở local, không thể đối chiếu từ remote.

## Tài liệu nguồn đã đối chiếu

- `AGENTS.md`, `.devloopflow/devloopflow.md`, `docs/PRODUCT_OVERVIEW.md`, `rules/testing.md`, `rules/security.md`: bảo vệ dữ liệu, tenant/branch, tiền, quy tắc chứng cứ và lệnh kiểm.
- `.devloopflow/approved/20261109-sprint08-payment.md`, `.devloopflow/plans/active/20261109-sprint08-payment.md`, `.devloopflow/tasks/active/20261109-sprint08-payment.md`: quyết định V3-2, Test mode thật và lịch sử fix.
- `.devloopflow/specs/20261109-sprint08-payment.md`: mục tiêu, phản mục tiêu, phi mục tiêu và ràng buộc liên quan hai FAIL.
- `.devloopflow/specs/20261109-sprint08-payment-api.md`: **status draft**, còn mô tả sai account chỉ quarantine nội bộ. Đây là bản nháp trước quyết định V3-2, không được dùng thay hợp đồng đã chốt tại `specs/invoices.md` và approved Changelog :323. Ghi nhận việc bản nháp còn cũ; không tự sửa.
- `specs/invoices.md:3,14,36,97,101,120`, `docs/DESIGN_DB_POS_SYSTEM.md:410-428`, `docs/BUSINESS_RULES.md:162`, `docs/api-spec.md:198-217,368-377`, `THIRD_PARTY_INTEGRATIONS.md:3,12,28`.
- `.devloopflow/MEMORY.md`, root `MEMORY.md`, `.devloopflow/errors/INDEX.md`, hồ sơ lỗi sai account và branch scope; `report-7.md` và `fails.md`.
- Trích đoạn có số dòng được đọc và SHA256 tại `evidence/r8-source-compare.txt`, `evidence/r8-source-hashes.json`. Không tuyên bố kiểm lại tất cả tài liệu/AC của sprint.

## Môi trường

- HEAD `48ed476528a2db4f46fa379c64476c95b54d4caf`, working tree dirty; status trước/sau trong QA run. Node `v22.22.2`.
- API có sẵn `pos_s8_api_verify_r6`, `http://127.0.0.1:13040/api/v1`; UI `pos_s8_ui_verify_r6`, `http://localhost:15174/`; PostgreSQL `pos_sprint08_test_pg`, port 55432, DB `pos_s8_verify4_ac`.
- Đọc Docker inspect vào RAM và chỉ lưu metadata đã chọn. `evidence/r8-provenance.json` có container/image ID, start time và checksum: hai API service dist, `LivePaymentDialog.tsx`, `LivePosScreen.tsx` trùng local. Sau build mới, `r8-postbuild-checksums.json` tiếp tục xác nhận API dist trùng container.
- Môi trường có `SEPAY_ENV=test` và có webhook secret, **không chứng minh dashboard/provider Test mode thật**. Không gọi provider hoặc ngân hàng Live.
- Fixture R8 mới gồm store A, hai branch, CASHIER có ca, hai MANAGER ở hai branch, OWNER store khác, một món 40.000đ/công thức 10g và promo 1.000đ; QR 39.000đ. Dùng API để tạo fixture; không sửa hoặc xóa fixtures R7.
- Credential, cookie, HMAC secret giữ trong RAM. HTTP artifact che password/token/username/signature. Không ghi cookie values hoặc auth headers. Bridge loopback 15377 đã đóng sau harness; browser context riêng đã đóng; các container và DB được giữ nguyên.
- Playwright MCP bị lỗi `Browser is already in use ... use --isolated`; không đóng/kill browser của người khác. Dùng package Playwright local hiện có trong npm cache với Chromium 1254 hiện có, browser/context riêng, headless 1366×900. Không cài dependency hoặc browser mới.

## Ma trận trước chạy và đối chiếu artifact

Lập trước fixture/chạy hành vi tại `evidence/r8-matrix.md` (14:16:18 UTC); harness bắt đầu 14:16:27 UTC. Bằng chứng API/SQL mới ở `evidence/r8-run-live/`, script `evidence/scripts/r8-verify.mjs` được giới hạn từ harness R7 xuống các case V3-2; không chạy lại V3-1.

| Tiêu chí | Tình huống | Artifact đã mở lại | Kết quả |
|---|---|---|---|
| Schema theo quyết định mới | R8-DOC | `r8-source-compare.txt`, `r8-source-hashes.json` | `specs/invoices.md:120` và DB :423 đã có ngoại lệ IN sai account, OUT/mã không rõ không gắn tenant |
| IN sai account | R8-W1 | `r8-run-live/http.jsonl`, `db.jsonl` entries `R8-W1-before/after`, `assertions.jsonl` | ACK 200 success; thêm đúng một QUARANTINED có đủ 4 scope ID; đơn OPEN, lượt PENDING; payment/stock/movement/promo không đổi |
| Quyền, branch/store và DTO | R8-W2-owner/manager/other-manager/other-store-owner/cashier, R8-W2-readonly | HTTP từng actor và SQL trước/sau trong cùng 3 JSONL | OWNER/MANAGER đúng branch 200 thấy WRONG_ACCOUNT; branch khác/store khác 200 danh sách rỗng; CASHIER 403; DTO đúng `id,reason,amount,receivedAt,invoiceId`; list không mutation |
| Replay | R8-W3 | HTTP và SQL trước/sau | ACK 200; toàn bộ business state và events trước=sau |
| Tiền ra sai account | R8-W4, R8-W4-hidden | HTTP và SQL trước/sau, GET exceptions OWNER | Thêm đúng một QUARANTINED nội bộ, store/branch/invoice/attempt NULL; không payment/stock/promo; store vẫn chỉ có một exception IN |
| UI trước IN | R8-U1 | `r8-ui-before.png`, `.snapshot.txt`, `.network.json` | Modal PENDING, “Chưa có giao dịch cần xử lý.”; GET exceptions 200 data rỗng, invoice OPEN, attempt PENDING |
| UI sau mở lại modal | R8-U2 | `r8-ui-reopened.png`, `.snapshot.txt`, `.network.json` | “Sai tài khoản nhận · 39.000đ”, vẫn chờ chuyển khoản; network WRONG_ACCOUNT, OPEN/PENDING |
| UI sau reload | R8-U3 | `r8-ui-reload.png`, `.snapshot.txt`, `.network.json`; thêm `r8-ui-reload-settled.*` | Reload thật vẫn WRONG_ACCOUNT, OPEN/PENDING. Ảnh reload đầu đang trong animation; ảnh bổ sung từ context nạp trang mới đã đợi animation kết thúc rõ nhãn và trạng thái |
| SePay provider thật | R8-P1 | `r8-run-live/environment.json`, nguồn TPI :3,12 và approved :286 | Không có dashboard/tài khoản/webhook Test mode được xác nhận hoặc artifact mô phỏng provider mới; giữ V1-4 mở |

Đã mở và xem bốn ảnh, đọc snapshot/network, parse HTTP/DB/assertion JSONL và kiểm từng trạng thái liên quan. SQL chứng minh tác dụng phụ, ảnh không thay SQL. `evidence/r8-artifact-audit.json` ghi checksum/copy-equal và kết quả đối chiếu. Artifact không chứa các secret đọc từ container; request/response cũng được che ở lúc ghi.

## Kết quả test

- `node .devloopflow/verify/20261109-sprint08-payment/evidence/scripts/r8-verify.mjs` (stdout/stderr qua PowerShell `Tee-Object`): **10/10 assertion HTTP/SQL**, process exit 0. `evidence/r8-run-console.log`, `r8-run-live/assertions.jsonl`, `finished.json`. Đây là assertion harness, không phải số test suite dự án.
- `npm --prefix POS_UI test`: **54 tests, 54 pass, 0 fail, 0 skipped**, exit 0. `evidence/r8-ui-test.log`, `r8-ui-test.result.json`; test 19 `[V3-2] exception list shows a Vietnamese label for transfers to the wrong receiving account` chạy thật.
- `npm --prefix POS_API run build`: exit 0; `r8-api-build.log`, `.result.json`.
- `npm --prefix POS_UI run build`: typecheck và Vite build exit 0; `r8-ui-build.log`, `.result.json`.
- `node .../evidence/scripts/r8-audit.mjs`: exit 0 sau khi sửa **script audit** đọc DTO attempt dạng object thay vì array; 10/10 assertion, SQL trước/sau và bốn bộ UI/network hợp lệ. Không sửa test hoặc code để làm xanh.
- Không chạy API integration suite vì suite tự tạo/xóa DB, trái giới hạn không xóa DB/data trong lượt này. Không viện dẫn log suite API cũ làm kết quả R8. Browser dùng Playwright thật/HTTP thật, không mock API.

## Coverage

Không có script/threshold coverage trong manifest/CI theo `.devloopflow/devloopflow.md`. Không chạy coverage hoặc tạo số liệu. Lượt này không phải kiểm hồi quy toàn sprint.

## Đã đối chiếu errors

- `.devloopflow/errors/20261109-sepay-wrong-account-hidden.md`: đọc toàn bộ; tình huống cũ V3-2 được chạy lại qua IN, quyền/scope, replay, OUT, nhãn UI và schema mới. Hồ sơ có triệu chứng, nguyên nhân đã xác minh, fix, RED/GREEN và quy tắc phòng tránh.
- `.devloopflow/errors/20261109-owner-access-all-branch-scope.md`: đọc toàn bộ; không chạy lại cancel QR hoặc AC đã đóng. Scope của route exception đã kiểm bằng 5 actor mới, không suy từ hồ sơ cũ.
- Task history và INDEX có hồ sơ R1-1/R3-1, R1-2, R2-1, V1-1, V2-2, V3-1/V3-2; không có fix mới trong phạm vi retry thiếu hồ sơ errors. Đồng bộ hai câu schema là sửa tài liệu theo quyết định user, không phải bug source mới cần hồ sơ lỗi riêng.
- `.devloopflow/MEMORY.md` chưa có mục Hay quên đang có hiệu lực, nên không tạo M-n giả. Root MEMORY về QA nguyên bản, UUID chuẩn và SQL read-only được áp dụng. Không thực thi lại các lỗi khác đã đóng.

## Bảng đối chiếu các FAIL được yêu cầu kiểm lại

| AC / FAIL | Cách kiểm, bước chạy | Kết quả thật | Mong đợi theo plan | Quy định nguồn nguyên văn + dòng | Kết luận | Chỗ lệch |
|---|---|---|---|---|---|---|
| V3-2 — BR-33 / approved :323 | R8-DOC, W1..4, U1..3; HTTP/SQL/browser mới | IN scoped QUARANTINED, OWNER/MANAGER đúng scope thấy WRONG_ACCOUNT; OPEN/PENDING và không payment/stock/promo mutation; replay không nhân đôi; OUT nội bộ; UI nhãn đúng sau mở lại/reload | “giao dịch tiền vào có đúng một mã lượt nhưng sai tài khoản nhận được gắn store/branch theo lượt và hiện cho MANAGER/OWNER với lý do `WRONG_ACCOUNT`” (approved :323) | “riêng giao dịch tiền vào có ref duy nhất nhưng sai account cũng gắn theo lượt để báo `WRONG_ACCOUNT`; tiền ra hoặc ref không xác định/đa nghĩa không gắn tenant/branch” (`specs/invoices.md:120`); “tiền vào sai tài khoản với mã lượt duy nhất cũng gắn theo lượt để báo `WRONG_ACCOUNT`; tiền ra hoặc mã không xác định/đa nghĩa không gắn” (`docs/DESIGN_DB_POS_SYSTEM.md:423`); “MANAGER chỉ branch mình, OWNER toàn store” (`specs/invoices.md:101`) | **Đúng / PASS** | Hai câu schema còn lệch ở R7 nay đã thống nhất với hợp đồng hiện hành và hành vi mới |
| V1-4 — provider Test mode | R8-P1, đọc nguồn và metadata môi trường | Chỉ local HMAC; chưa có chứng cứ provider mới | “Nếu không có tài khoản hoặc dashboard Test mode, đánh dấu tự xác nhận **chưa xác minh end-to-end** dù test HTTP ký local xanh.” (approved :286) | “chưa chạy Mô phỏng giao dịch của SePay Test mode” (`THIRD_PARTY_INTEGRATIONS.md:12`) | **Sai / Không có chứng cứ** | Giữ mở, không coi env test/secret hoặc local HMAC là đầu cuối provider |

AC không chạy lại: V1-1/2/3, V2-1/2, V3-1; E2E-AC-1..7; R2-1.AC-1..3; ST-1.AC-1/2, ST-2.AC-1, ST-3.AC-1, ST-4.AC-1, ST-5.AC-1/2, ST-6.AC-1, ST-7.AC-1, ST-8.AC-1/2; RF-1..5. Các vế ST-6/7/8 liên quan V3-2 được kiểm riêng trong bảng, không kết luận lại toàn bộ AC. Không thay kết quả lịch sử của AC ngoài retry.

## Đối chiếu spec (cấp tính năng)

| Mục spec nguyên văn | Loại | AC/bước chạy | Kết quả thật | Kết luận |
|---|---|---|---|---|
| “UI chỉ báo thành công khi server đã xác nhận” (`.devloopflow/specs/20261109-sprint08-payment.md`, Mục tiêu QR) | Mục tiêu | R8-U1..3, W1 | Sai account hiển thị ngoại lệ, vẫn chờ; server OPEN/PENDING, không báo thành công | Đúng cho nhánh đã chạy |
| “Ghi payment hai lần, tăng lượt mã/trừ kho hai lần khi retry/webhook lặp” (cùng spec, Phản mục tiêu) | Phản mục tiêu | R8-W1/W3/W4 | Payment/movement/stock/promo không đổi; replay không thêm event | Đúng cho nhánh đã chạy |
| “lộ hóa đơn của store/branch khác” (cùng spec, Phản mục tiêu) | Phản mục tiêu | R8-W2 | Branch/store khác không thấy dòng, CASHIER 403; DTO 5 field | Đúng cho route đã chạy |
| “không bật giao dịch ngân hàng Live trong Sprint 08” (cùng spec, Phi mục tiêu) | Phi mục tiêu | Toàn lượt R8 | Không gọi Live; dùng local HMAC | Đúng cho hành động R8 |
| “dùng Test mode để kiểm thử, không dùng tiền thật” (cùng spec, Ràng buộc) | Ràng buộc | R8-P1 | Không dùng tiền thật; không có dashboard provider Test mode được xác nhận | Chưa xác minh đầu cuối; V1-4 mở |

Các mục tiêu/ràng buộc ngoài hai FAIL không được nghiệm thu lại. Contract API hiện hành có trạng thái approved; draft API cũ không được coi là quyết định mới.

## FAIL / bug

- **V1-4 — Không có chứng cứ, giữ mở**. Chưa có artifact dashboard/provider mô phỏng thật để chứng minh tự xác nhận đầu cuối.
  - Bước tái hiện cần làm khi có provider: theo approved :286, đăng ký đúng account POS trên Test mode, cấu hình webhook HMAC/prefix, tạo QR và mô phỏng đúng/thiếu/thừa/muộn/promo invalid; lưu dashboard, webhook đến API, ACK, GET invoice và SQL trước/sau.
  - Kỳ vọng: trace provider thật và kết quả mỗi nhánh đúng contract.
  - Thực tế R8: `SEPAY_ENV=test`, có secret, HTTP local HMAC mới; không có dashboard/provider transaction mới.
  - Bằng chứng: `evidence/r8-run-live/environment.json`, `r8-source-compare.txt`; HTTP của W1/W3/W4 ghi actor “local HMAC, NOT provider”.
  - Test tái hiện đề xuất: `test_SePay_provider_test_mode_e2e` | input đúng/thiếu/thừa/muộn/promo invalid qua provider Test mode | expected dashboard event và webhook/GET/SQL nhất quán từng nhánh. Không chạy bằng tiền thật.
- **V3-2 — đã PASS**, không hủy finding do đổi plan/spec; hành vi yêu cầu vẫn còn và đã kiểm mới. Sổ FAIL giữ toàn bộ lịch sử.

## Lệch tài liệu

Không còn lệch trong **nguồn hiện hành đã duyệt** của V3-2: approved :323, BR-33, TPI :28, contract :36/101/120 và DB :423 cùng yêu cầu IN sai account gắn scope báo quản lý. Draft API trong `.devloopflow/specs/` còn đoạn lịch sử chưa đồng bộ, status draft; ghi nhận trong Đề xuất, không tự đổi hoặc dùng để phủ quyết quyết định đã duyệt sau đó.

## Đánh giá test

Harness R8 gọi API thật với cookie/CSRF, webhook HMAC thật và PostgreSQL thật. Không mock transaction/scope; so sánh nguyên business state trước/sau cho payment, invoice, attempt, movement, stock, promo và events. Fixture có recipe/promo để quan sát nguy cơ trừ kho/tăng lượt sai. Browser có network response và screenshot/snapshot từng trạng thái, bổ sung UI suite test nhãn. Đã mở artifact và kiểm schema response thật; không suy API từ source test. Không có chứng cứ provider thật hoặc race/load mới.

## Exploratory

- Tái hiện lỗi V3-2 cũ bằng IN đúng một ref/sai account; nay quản lý thấy ngoại lệ và không PAID.
- Branch khác/store khác/CASHIER không lấy được dòng; GET không đổi dữ liệu.
- Replay cùng event id giữ một event; OUT sai account có cả bốn scope ID NULL và không tạo dòng thứ hai cho store.
- MANAGER chưa có ca riêng mở được đơn ca CASHIER để xem nhãn sau mở lại/reload; không bấm xác nhận thủ công và không gây payment mới.
- Browser console lưu `r8-browser-console.json`: Vite connect và React DevTools hint, không có error được listener thu trong khoảng kiểm. Listener gắn sau navigation đầu, không tuyên bố bao phủ console cả boot.
- Không kiểm tự poll ngoại lệ, RF ngoài retry hoặc race toàn hệ thống; không thêm business rule.

## Đề xuất

- V1-4 cần cấu hình/provider Test mode thật được xác nhận và artifact theo approved :286 trước khi đóng task.
- Có thể đồng bộ bản draft API lịch sử khi được đưa vào phạm vi tài liệu; verifier không sửa tài liệu nguồn ngoài report/sổ FAIL.
- Agent chính cập nhật lịch sử task và Graphify semantic cho Markdown thay đổi theo AGENTS. Verifier không sửa plan/task/graph. Artifact thô chỉ local; báo cáo không thay cho CI độc lập.
