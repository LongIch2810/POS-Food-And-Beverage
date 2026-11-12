# Kiểm AC 20261109-sprint08-payment — vòng 10

## Kết luận

**PASS cho retry V1-4 — SePay Webhooks Test mode end-to-end.** Đã xác nhận trực quan dashboard Test mode, đối chiếu tài khoản với POS trong RAM và chạy 5 giao dịch mô phỏng mới: đúng tiền, thiếu tiền, dư tiền, tiền đến QR đã hủy và promo hết hạn. Mỗi ca có dashboard/accessibility, webhook đến API/ACK, authenticated GET invoice, SQL READ ONLY trước/sau và UI tương ứng. Không có finding code mới.

- Ngày: 10/11/2026. Nhãn **local do agent chạy**, không phải CI/runner độc lập. Verifier kiểm lại artifact do root chụp UI và tự chạy dashboard/SQL/ngrok; không tuyên đây là xác nhận CI độc lập.
- Plan: `.devloopflow/approved/20261109-sprint08-payment.md:275,281-286`; bản active :286 khớp nguyên văn bằng assertion.
- Spec: `.devloopflow/specs/20261109-sprint08-payment.md` trạng thái approved; contract đã chốt `specs/invoices.md:83-105,109,118-122`.
- Chỉ kiểm lại **V1-4**. Giữ kết quả các AC đã đóng, không chạy lại toàn sprint. Không sửa source/test/config/plan/task; không commit/push/merge.
- Run: `qa-evidence/20261110-121158-48ed476-s8-verify-ac-r10/run.md`. Bằng chứng thô chỉ local, không thể đối chiếu từ remote; chỉ Markdown đã che được đưa lên Git.

## Tài liệu nguồn đã đối chiếu

Đã đọc AGENTS.md, PRODUCT_OVERVIEW (đọc đầu), BUSINESS_RULES BR-31/33/34/35, DESIGN_DB phần payments/attempts/events/promo/stock, api-spec phần mã lỗi và idempotency; `specs/invoices.md`, `THIRD_PARTY_INTEGRATIONS.md`; approved/active plan, task active, spec approved; `.devloopflow/devloopflow.md`, root MEMORY mục “Nghiệm thu cần chứng cứ gốc đầy đủ”, `.devloopflow/MEMORY.md`, errors INDEX và ba hồ sơ webhook. Đọc report-9/fails và hai run user/UI bổ sung trước R10. Role, reference và hai template verify-ac đã được đọc theo path agent chính giao.

Trích nguyên văn có số dòng và SHA256 tài liệu tại `evidence/r10-final-source-compare.txt`, `r10-final-source-hashes.json`. Graph không được dùng làm bằng chứng thay source/test; lần này không cần khám phá symbol hay sửa code sản phẩm.

## Môi trường

- HEAD `48ed476528a2db4f46fa379c64476c95b54d4caf`, working tree dirty; `r10-final-commit.txt`, `r10-final-status.txt` và bản sao trong QA run. Không fresh build trong retry.
- API `http://127.0.0.1:13040/api/v1`, UI `http://localhost:15174/`; container `pos_s8_api_manual_20261110`, `pos_s8_ui_manual_20261110`; PostgreSQL `pos_sprint08_test_pg`, DB `pos_s8_manual_20261110`.
- App có sẵn, root khởi động lại giữa lượt khi môi trường dừng. Verifier không dừng/xóa container/database/user data. Sau restart query `restart-before` lúc 12:52:56.868 UTC xác nhận 5 invoice thử OPEN, 0 payment/event/movement, LATE CANCELLED, promo đã hết hạn. Chỉ dữ liệu giả mới và QR test do root tạo qua phiên OWNER được dùng.
- `r10-final-provenance.json`: checksum 4 file API dist/UI source trong container khớp local; metadata an toàn gồm image/start/port, `SEPAY_ENV=test`, secret configured boolean. Đây là đối chiếu file đã chọn, không attestation toàn source/build. Flag local không thay xác nhận provider Test mode.
- Dashboard Chrome user: `https://my.sepay.vn/testmode/transaction/simulate`, sidebar Test mode ON và banner “dữ liệu không ảnh hưởng tài khoản thật”. `r10-provider-gate.png`, selected snapshot/result; account trên combo khớp đúng account POS DB bằng so sánh trong RAM, giá trị account/name không lưu text. URL webhook khớp API sandbox qua ngrok; pipeline hiện HD[A-Za-z0-9]{16}, filters mở. Gate mode/account được kiểm lại trước từng thao tác submit sau restart.
- Không gọi Live, không chuyển tiền thật, không đổi account/webhook/settings, không truy xuất cookie/token của user. POST provider duy nhất là 5 lần “Gửi giao dịch thử” qua GUI Test mode; không tự ký/replay webhook local.

## Ma trận và artifact đã kiểm lại

`evidence/r10-matrix.md` lập trước dashboard/provider; bổ sung restart trước các lần submit thật. Fixture IDs/ref/response status/requestId tại `r10-qa-r10-pos-fixtures.json`. Tất cả đường dẫn ngắn bên dưới nằm trong QA run, bản sao có tiền tố `r10-qa-` trong evidence; SQL/provider riêng cũng có tên `r10-...` trong evidence.

| Ca / invoice / event | Kỳ vọng và kết quả thật | SQL trước → sau | Dashboard/webhook | GET và UI |
|---|---|---|---|---|
| EXACT `HDTSV1PVGM`, event47546 | 25.000đ → PAID/attempt PAID; một payment WEBHOOK amount=actual25.000/excess0; 2 SALE | `restart-before.json` → `exact-after-restart-submit.json`, raw `.sql/.stdout.txt/.stderr.txt/.result.json` | `exact-provider-submitted-redacted.png`; `exact-v4-provider-after.selected.snapshot.txt` success1; `final-ngrok.json` ref HDTSV1PVGM8AFW0ERK, IN25k, HTTP200 success | `r10-exact-get-after.txt` GET200 requestId3bb6c83d-9b8e-4ee1-a541-e1570d168089 PAID25k; `r10-exact-ui-before.png` OPEN/PENDING; `r10-exact-ui-after.png` reload danh sách OPEN không còn exact |
| UNDER `HDJEKI5SS5`, event47549 | 24.000đ cho tổng25.000 → OPEN/PENDING, UNDERPAID, 0 payment/SALE, OWNER thấy ngoại lệ | `under-before.json` → `under-after-submit.json` | `under-provider-after-redacted.png`, `under-provider-after.selected.snapshot.txt`; `final-ngrok.json` IN24k/ACK200 | `r10-under-get-after.txt` invoice/attempt/exceptions GET200, OPEN/PENDING/UNDERPAID24k; `r10-under-ui-before.png`, **`r10-under-ui-after-v2.png`** cho mã/25k và “Chuyển thiếu tiền · 24.000đ” |
| OVER `HDIDA3ZYF7`, event47552 | Nhận30.000 → PAID/attempt PAID, payment25.000, actual30.000, excess5.000; 2 SALE; doanh thu theo25k | `over-before.json` → `over-after-submit.json` | `over-provider-after.png`, selected snapshot; `final-ngrok.json` ref HDIDA3ZYF7OTCQVPFU IN30k/ACK200 | `r10-over-get-after.txt` GET200 PAID25k; `r10-over-ui-before.png`, `r10-over-ui-after.png` reload không còn over trong OPEN |
| LATE `HDZVCLCV4F`, event47555 | Cancel QR → nhận25.000 mã cũ → OPEN/CANCELLED, ATTEMPT_CANCELLED, 0 payment/SALE; OWNER thấy ngoại lệ | `exact-before.json` còn PENDING; UI cancel POST204; `late-before.json` đã CANCELLED → `late-after-submit.json` | `late-provider-after.png` đã che account/name, selected snapshot; `final-ngrok.json` mã HDZVCLCV4FIN2BO9DA IN25k/ACK200 | `r10-late-cancel-ui.txt`, ảnh before/after, network204/requestIde7c29250-ffd0-4542-ae66-785a84a82104; `r10-late-get-after.txt` OPEN/GET pending=null/exceptions; **`r10-late-ui-after-v2.png`** “Chuyển sau khi hủy chờ · 25.000đ” |
| PROMO `HDXUF5I4QL`, event47557 | Promo hợp lệ khi tạo QR24k, tự hết hạn rồi IN24k → OPEN/PENDING, PROMOTION_INVALID; không payment/SALE/usage; không bỏ liên kết promo | `exact-before.json` expired=false/used0/link1000 → `promo-before.json` expired=true → `promo-after-submit.json`, `final.json` used0/link giữ | `promo-provider-after-redacted.png`, selected snapshot; `final-ngrok.json` mã HDXUF5I4QLBAEVBS31 IN24k/ACK200 | `r10-promo-get-after.txt` invoice OPEN, attempt PENDING24k, exception PROMOTION_INVALID24k; `r10-promo-ui-before.png` tổng24k, **`r10-promo-ui-after-v2.png`** pending24k/ngoại lệ |

Các network UI tương ứng nằm tại `r10-<case>-network-after.txt`; UI trước có `r10-ui-before.txt`, snapshot/network exact và response tạo fixture. GET invoice/exceptions là request có xác thực chủ động của root trong phiên OWNER; không mô tả chúng là request tự động của màn danh sách hóa đơn demo.

**Giới hạn mô tả UI:** exact/over không có ảnh toast/màn PAID trực tiếp sau callback vì phiên browser đã restart; ảnh sau chứng minh reload loại đúng hai đơn khỏi OPEN, authenticated GET và DB chứng minh PAID. Không suy màn danh sách hóa đơn thực đã triển khai. Promo sau hết hạn: GET invoice và panel hiển thị tổng tính lại25k, QR snapshot/DB invoice vẫn24k; link promo1000 giữ nguyên và event bị chặn, không payment/usage. Ghi đúng sự khác nhau này, không suy là đã tự thu giá gốc hoặc tự gỡ mã; retry này kiểm vế chặn auto-PAID.

## Kết quả test và lệnh

- `node .devloopflow/verify/20261109-sprint08-payment/evidence/scripts/r10-capture.cjs --final`: exit0, 12:11:58.678–12:12:04.047 UTC. Health/UI200, SQL READ ONLY. Lần chuẩn bị trước đó dùng `orca.cmd` từ spawnSync không chạy được (exit null/ENOENT), không coi desktop đó thành công; giữ run `qa-evidence/20261110-121132-48ed476-s8-verify-ac-r10/` và result lỗi.
- `node .../r10-desktop-gate.cjs`: exit0 mode/account/URL; các `r10-simulate.cjs prepare|submit|after <case> <amount> <reference>` có command/start/end/exit/control readback tại mỗi `provider-*.result.json`. Những click trước restart không sinh event được SQL chứng minh; không tính thành giao dịch thành công. Reset “Xóa kết quả” chỉ bỏ pipeline hiển thị: sau đó mở Giao dịch Test mode vẫn thấy event47447/ref user cũ (`r10-provider-old-history.*`). Không xóa lịch sử provider.
- `node .../r10-db-snapshot.cjs <stage>`: SQL qua stdin tới `docker exec -i pos_sprint08_test_pg psql -U pos_sprint08_test -d pos_s8_manual_20261110 -v ON_ERROR_STOP=1 -At -P pager=off`; mỗi stage có raw stdout/stderr/result. `BEGIN ... REPEATABLE READ READ ONLY`, readOnly=on. Lần harness `all-before` SQL exit0 nhưng parser JSON chỉ lấy dòng đầu bị SyntaxError; raw giữ nguyên, đã sửa chỉ harness để parse đủ JSON và chạy stage mới, không sửa source.
- `node .../r10-ngrok.cjs final`: exit0, GET inspection chọn/che dữ liệu, đủ5 request. Đây không phải full raw HTTP; không lưu header/chữ ký/account/content/bankref/cookie/token. Event/ref/amount/ACK đối chiếu DB.
- `node .../r10-provenance.cjs`: exit0, 4 checksum khớp, HEAD/status/metadata an toàn.
- `node .../r10-final-audit.cjs`: exit0, 5 case assertions PASS; 5 event duy nhất/ACK200, 2 payment và4 SALE, stock delta cà phê−40g/sữa−200ml; doanh thu payment50.000, thực nhận55.000, dư5.000; promo used0/link giữ. `r10-final-assertions.json` và manifest SHA256. Đây là kiểm assert harness, **không phải5 test runner**.
- Test runner dự án chạy: **0**. Không chạy lại npm test/build/typecheck/coverage hoặc API integration suite tạo/xóa database. Retry provider-only không thay regression toàn sprint hay chống lặp đã kiểm trước.

## Coverage

Không có script/threshold coverage trong cấu hình dự án; không chạy hoặc báo số liệu coverage. AC ngoài V1-4 không chạy lại.

## Đã đối chiếu errors

Đã đọc INDEX và `20261109-sepay-malformed-json-code.md`, `20261109-sepay-unsigned-webhook-status.md`, `20261109-sepay-wrong-account-hidden.md`. Các lỗi parser/unsigned/wrong account đã đóng không gửi lại request trong retry V1-4. Lịch sử review/fix trong task có hồ sơ errors tương ứng (R1-1/R3-1, R1-2, R2-1, V1-1, V2-2, V3-1/V3-2); các lệch tài liệu không phải bug source mới. R10 không sửa code và không có finding đã sửa mới thiếu hồ sơ. `.devloopflow/MEMORY.md` không có mục Hay quên đang hiệu lực; áp dụng root MEMORY: tự mở lại ảnh/log thật và yêu cầu chụp lại ảnh thiếu.

## Bảng đối chiếu AC được yêu cầu kiểm lại

| AC | Cách kiểm / bước | Kết quả thật | Plan nguyên văn | Nguồn nguyên văn + path:dòng | Kết luận | Chỗ lệch |
|---|---|---|---|---|---|---|
| V1-4 — provider thật | R10-GATE + EXACT/UNDER/OVER/LATE/PROMO; GUI Test mode, fresh ngrok, authenticated GET, SQL/UI trước/sau; audit | Đủ5provider event/ACK và các nhánh như ma trận, ảnh đã mở lại và ảnh thiếu chụp lạiv2 | “(6) lưu artifact dashboard SePay, request webhook đến API, response, GET invoice và DB trước/sau; (7) chạy thêm underpay/overpay/late/promo invalid.” (approved:286) | “trong Dashboard SePay bật Test mode, tạo tài khoản và webhook Test mode, sau đó dùng **Mô phỏng giao dịch** với số tiền và nội dung chuyển khoản thử” (`THIRD_PARTY_INTEGRATIONS.md:12`); “mismatch/late/underpaid đã map attempt thì ghi ngoại lệ có store/branch và ack” (`specs/invoices.md:105`); “giữ đơn chưa `PAID` và ghi ngoại lệ cho MANAGER/OWNER” (`BUSINESS_RULES.md:162`) | **Đúng / PASS** | Không có lệch bắt buộc trong phạm vi V1-4; giới hạn UI/GET promo đã nêu rõ |

Không chạy lại V1-1/2/3, V2-1/2, V3-1/2; E2E-AC-1..7; R2-1.AC-1..3; ST-1.AC-1/2, ST-2.AC-1, ST-3.AC-1, ST-4.AC-1, ST-5.AC-1/2, ST-6.AC-1, ST-7.AC-1, ST-8.AC-1/2; RF-1..5. Không đổi kết luận lịch sử các AC đó. R10 kiểm phần provider gắn E2E-AC-4/5/ST-6 qua V1-4, không nhận là kiểm lại đầy đủ chúng.

## Đối chiếu spec cấp tính năng

| Mục spec nguyên văn | Loại | AC / kết quả thật | Kết luận |
|---|---|---|---|
| “Chuyển thiếu giữ chưa thanh toán; chuyển bằng hoặc nhiều hơn tự hoàn tất, lưu số thực nhận và phần dư riêng” (spec:23) | Mục tiêu | EXACT/UNDER/OVER đúng event/payment/status/actual/excess; invoice revenue không gồm dư | Đúng trong provider retry |
| “tiền đến theo mã lượt đã hủy ... không tự mở lại/tự `PAID`, báo quản lý xử lý” (spec:26) | Mục tiêu | LATE OPEN/CANCELLED/ATTEMPT_CANCELLED, OWNER UI/GET thấy ngoại lệ | Đúng |
| “Đơn chưa `PAID`, sự kiện tiền vào được ghi ngoại lệ gắn đúng store/branch và báo MANAGER/OWNER; không tự gỡ mã” (spec:64) | Mục tiêu | PROMO expired, OPEN/PENDING/no payment/SALE/usage, link giữ, OWNER UI/GET PROMOTION_INVALID | Đúng; GET/panel total tính lại25k không được gọi là PAID/thu tiền |
| “UI chỉ báo thành công khi server đã xác nhận” (spec:26) | Ràng buộc | Trước các ca chỉ OPEN/PENDING; under/late/promo không báo PAID; exact/over sau reload không còn OPEN, GET/DB đã PAID | Đúng cho hành vi quan sát; không có ảnh toast callback trực tiếp |
| “dùng Test mode để kiểm thử, không dùng tiền thật” (spec:46) | Ràng buộc | Dashboard/banner/URL, account match,5simulation; không Live/settings | Đúng |
| “không bật giao dịch ngân hàng Live trong Sprint08” (spec:31) | Phi mục tiêu | Không thao tác Live/production | Đúng |
| “Ghi payment hai lần, tăng lượt mã/trừ kho hai lần khi retry/webhook lặp” (spec:35) | Phản mục tiêu | Mỗi event mới1lần, mỗi ca PAID1payment2SALE, các ca từ chối0 | Không thấy tác dụng phụ dư trong5ca; không replay/concurrency trongR10 |

Các mục còn lại của spec không nghiệm thu lại trong provider retry.

## FAIL / bug

Không có FAIL mới. **V1-4 chuyển `đã PASS` vòng10**, không hủy hoặc giảm AC. `fails.md` giữ đầy đủ lịch sử FAIL trước và thêm lịch sử PASS. Việc đóng task/tick plan/doanh nghiệp là agent chính, không thuộc quyền verifier.

## Lệch tài liệu

Không phát hiện lệch quyết định bắt buộc mới trong retry. Banner trạng thái “chưa kiểm Test mode” trong TPI vẫn là ghi nhận lịch sử trước lần10, cần agent chính sync-docs theo quyền sau task, không tự sửa nguồn trong verification.

## Đánh giá test và chất lượng bằng chứng

Provider thật Test mode đã thay phần còn thiếu của webhook tự ký; ACK200 không được dùng một mình để suy payment (under/late/promo ACK200 nhưng OPEN). So sánh SQL trước/sau chứng minh payment/kho/usage; ảnh UI chỉ chứng minh UI. Đã tự mở các PNG được dẫn, đọc GET/network, parse SQL/ngrok, kiểm manifest/hash và scan account/name trongtext; ảnh v2 đã che khi chụp, ảnh provider cần thiết che account/name bằng hình chữ nhật đen, ghi rõ là bản che.

Ảnh v1 `r10-under-ui-after.png` và `r10-promo-ui-after.png` bị sai locator/dải QR: root đã xóa đúng2original do chính root tạo; verifier xóa đúng2bản sao evidence tự tạo sau kiểm path/status. Không dùng hoặc viện dẫn chúng làm bằng chứng. Ảnh occluded `exact-v4` desktop after không dùng; selected tree còn được giữ với giới hạn ảnh che khuất. Ảnh exact submitted có ref/amount/Test mode và ngrok/SQL/GET sau khớp. Không dựng lại ảnh/log trước giao dịch.

## Exploratory

- R10 bảo vệ dữ liệu: chỉ5fixture mới, LATE QR của fixture được hủy quaUI, promo tự hết hạn không sửa promo cũ; không xóa invoice/payment/stock/provider history. Dữ liệu test giữ local để đối chiếu.
- Kiểm root MEMORY: verifier phát hiện ảnh UI under chỉ dải QR, yêu cầu root chụp lạiv2 và tự mở cả3v2 trước PASS. Không bỏ qua vế ảnh chỉ vì text/API xanh.
- Malformed JSON/unsigned/wrong-account cũ, full RF và replay không chạy lại, giữ lịch sử; không giả case exploratory đã chạy.

## Đề xuất

Agent chính đối chiếu report/fails/run, cập nhật task theo kết quả mới nhất và làm semantic Graphify cho Markdown đã đổi; xem xét sync-docs trạng thái Test mode. Không dọn dữ liệu test/provider hoặc dừng app của user tự động. Không dùng PASSlocal này làm kiểm Live/production hay CI.
