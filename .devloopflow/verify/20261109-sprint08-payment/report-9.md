# Kiểm AC 20261109-sprint08-payment — vòng 9

## Kết luận

**FAIL — V1-4 vẫn mở / Không có chứng cứ đầy đủ.** Bằng chứng mới xác nhận được một webhook đúng tiền đã đi tới API và trạng thái sau giao dịch nhất quán. Chưa đủ xác nhận toàn bộ SePay Webhooks Test mode end-to-end theo plan :286. Không có finding code mới; không hủy hoặc giảm yêu cầu nghiệm thu.

- Ngày: 10/11/2026. Nhãn: **local do agent chạy**; giao dịch/dashboard do user cung cấp, verifier đọc lại độc lập trong phiên agent nhưng **không phải CI/runner độc lập**.
- Plan đối chiếu: `.devloopflow/approved/20261109-sprint08-payment.md:275,281-286`; câu :286 bản active khớp nguyên văn bản approved, kiểm bằng assertion.
- Spec đối chiếu: `.devloopflow/specs/20261109-sprint08-payment.md` (approved); contract hiện hành `specs/invoices.md:101,105,109`.
- Phạm vi retry: **chỉ V1-4**. Giữ kết quả các AC đã đóng. User tự test SePay; verifier không thao tác dashboard, tạo giao dịch, gửi/replay webhook hoặc gọi ngân hàng/provider.
- Run mới: `qa-evidence/20261110-110834-48ed476-s8-verify-ac-r9/run.md`. Artifact thô chỉ local, không thể đối chiếu từ remote; chỉ Markdown đã che được phép đưa lên Git.

## Tài liệu nguồn đã đối chiếu

- `AGENTS.md`: bảo vệ thay đổi, không suy chứng cứ từ ảnh đơn lẻ, ma trận trước chạy, đọc lại artifact và không dựng DB trước/UI/provider.
- `.devloopflow/devloopflow.md`: lệnh/môi trường, không coverage script, quy tắc QA và không xóa dữ liệu.
- `.devloopflow/approved/20261109-sprint08-payment.md`, bản active và task active: yêu cầu provider thật, retry chỉ finding mở, lịch sử R8 và evidence user mới.
- `.devloopflow/specs/20261109-sprint08-payment.md`: Mục tiêu QR, tiền thiếu/thừa, tiền muộn, promo mất hiệu lực; Phi mục tiêu, Phản mục tiêu và Ràng buộc Test mode.
- `.devloopflow/specs/20261109-sprint08-payment-api.md`: status **draft**; không dùng thay contract đã chốt tại `specs/invoices.md`.
- `docs/PRODUCT_OVERVIEW.md:12-22,159-187`; `docs/BUSINESS_RULES.md:160-174`; `docs/DESIGN_DB_POS_SYSTEM.md:350-428`; `docs/api-spec.md:198-226,368-402`; `specs/invoices.md:79-122`; `THIRD_PARTY_INTEGRATIONS.md:3,10-16,23,28`.
- `.devloopflow/MEMORY.md`, root `MEMORY.md:33-37`, `.devloopflow/errors/INDEX.md` và ba hồ sơ webhook được nêu tại mục errors; `report-8.md`, `fails.md`.
- Evidence user: `qa-evidence/20261110-175849-48ed476-v1-4-user-test/run.md`, `matrix.md`, ảnh `sepay-dashboard-user.png`, `ngrok-redacted.json`, SQL và stdout/stderr/result tương ứng. Đã tự mở ảnh bằng image viewer, đọc ngrok đã che và SQL output.
- Trích nguồn có số dòng/SHA256: `evidence/r9-source-compare.txt`, `r9-source-hashes.json`. Manifest input gồm tên/độ dài/hash: `evidence/r9-final-user-artifact-manifest.json`.

## Môi trường

- HEAD `48ed476528a2db4f46fa379c64476c95b54d4caf`, working tree **dirty**; `r9-final-commit.stdout.txt`, `r9-final-status-before.stdout.txt`. Không commit/push/merge.
- API có sẵn `pos_s8_api_manual_20261110`, `http://127.0.0.1:13040/api/v1`; UI có sẵn `pos_s8_ui_manual_20261110`, `http://127.0.0.1:15174/`; PostgreSQL `pos_sprint08_test_pg`, DB `pos_s8_manual_20261110`.
- Không khởi động/dừng app hoặc container của user, không tạo fixture, không sửa source/test/config/plan/task, không xóa DB/container/data.
- Metadata Docker chỉ chọn trường an toàn: `r9-final-environment.json`. API `SEPAY_ENV=test`, có secret; **đây không phải bằng chứng provider/dashboard đang Test mode**.
- `r9-provenance.json`: checksum hai service API dist và hai component UI trong container khớp local. Không fresh build; checksum chỉ chứng minh bốn file đã chọn, không chứng minh mọi source/build của toàn sprint.
- Health GET 200 `{"data":{"status":"ok"}}`; UI root GET 200. Không browser interaction hoặc authenticated `GET invoice` trong R9: không có credential/session fixture được truyền; không lấy token từ browser user. HTTP root 200 không được tính là UI nghiệm thu.
- Chữ ký, secret, password, cookie, token, số tài khoản thật và raw headers không ghi ra artifact. Ngrok raw response chỉ giải mã trong RAM; file lưu là trường được chọn/che, **không phải toàn bộ raw HTTP**. Đã scan các giá trị nhạy cảm đọc trong RAM trên artifact text/JSON/SQL mới.

## Ma trận trước chạy và đối chiếu artifact

`evidence/r9-final-matrix.md` được ghi lúc 11:08:34.046 UTC trước GET/SQL/ngrok mới. Giao dịch của user đã xảy ra 10:54:33 UTC trước ma trận; không mô tả đây là ma trận lập trước giao dịch. Các artifact bên dưới đã được mở lại/parse/đối chiếu bằng verifier và script audit.

| Vế V1-4 | Tình huống | Artifact cụ thể | Kết quả thật và giới hạn |
|---|---|---|---|
| Dashboard/provider và reference | R9-P1 / MANUAL-V1-4-EXACT | Ảnh gốc user `qa-evidence/20261110-175849-48ed476-v1-4-user-test/sepay-dashboard-user.png`; manifest hash | Nhận diện `HD[A-Za-z0-9]{16}`, mã `HD0DWAKVIL1Z7FA1SJ`, một webhook thành công, “Hệ thống của bạn đã xác nhận giao dịch”. SHA256 `1d051aa6a6673e44cd6f415a7f3fa273be444893b7bdb11b55f44e7dbe8e263a`. **Không thấy nhãn Test mode, số tiền, account đăng ký hoặc event ID trong ảnh**. Không kết luận mode/số tiền từ ảnh. |
| Webhook đến API/ACK | R9-P2 | `r9-final-ngrok-redacted.json`, `r9-final-ngrok.result.json`; input ngrok user | Đọc mới inspection `airt_3Ludq2WVsCBf4OHItcGcrLn2dv2`: POST `/api/v1/payments/sepay/webhook`, status 200, `{success:true}`, event `47447`, IN 25.000đ, code 18 ký tự khớp; có header signature/timestamp. Trường được chọn khớp artifact user. Sự hiện diện header không phải kiểm độc lập giá trị chữ ký; không replay. |
| DB sau đúng tiền | R9-P3 | `r9-final-db-readonly.sql`, `.stdout.txt`, `.stderr.txt`, `.result.json` | `BEGIN ... READ ONLY`, `transaction_read_only=on`, exit 0. `HD0DWAKVIL` PAID tổng 25.000, một TRANSFER/WEBHOOK amount=actual 25.000, excess 0, attempt/event PAID. Cả 8 cờ account/ref/scope/amount/actor/timestamp bằng `t`. Hiện 1 payment/1 event/2 movements. |
| Kho và promo sau đúng tiền | R9-P3 | Cùng SQL output | SALE SYSTEM cà phê -20g và sữa -100ml; balance_after/current_stock tương ứng -20/-100. Invoice không có promo link. **Không có snapshot DB trước giao dịch được lưu** nên không chứng minh delta từ trước, rollback hoặc promo usage của giao dịch này. |
| GET invoice và UI trước/sau | R9-P4 | Không có artifact tương ứng trong input; `r9-final-ui-root.json` chỉ HTTP root | **Chưa xác minh** authenticated GET invoice/UI PENDING→PAID/reload của ca user. Không dựng ảnh/snapshot/network hoặc DB-before hồi tố. |
| Test mode/account/config provider | R9-P5 | Ảnh user, `r9-final-environment.json`, source :275,:286 | Container test và account event=attempt=payment trong DB không chứng minh dashboard Test mode, account đăng ký ở provider hoặc settings HMAC/prefix/filter đúng. **Chưa xác minh** phần mode/account/settings provider. |
| Underpay | R9-P6 | Manifest input; SQL summary | Không có provider trace cho giao dịch thiếu, OPEN/PENDING, không payment/stock/promo và ngoại lệ MANAGER/OWNER. **FAIL thiếu chứng cứ**. |
| Overpay | R9-P7 | Manifest input; SQL summary | Không có provider trace amount>total, actual/excess/doanh thu và side effects. **FAIL thiếu chứng cứ**. |
| Late sau hủy QR/đơn | R9-P8 | Manifest input; SQL summary | Không có provider trace mã cũ sau hủy, trạng thái lượt mới/đơn và ngoại lệ quản lý. **FAIL thiếu chứng cứ**. |
| Promo hết hiệu lực khi chờ | R9-P9 | Manifest input; SQL summary | Không có provider trace đủ tiền khi promo hết hạn/hết lượt và trạng thái OPEN/no payment/usage/stock/ngoại lệ. **FAIL thiếu chứng cứ**. |

SQL summary hiện tại toàn DB manual chỉ có một `bank_transfer_events.disposition=PAID` và một `transfer_attempts.status=PAID`; không có evidence bốn nhánh khác trong tập được cung cấp. Điều này không khẳng định user chưa từng test ở nơi khác; chỉ ghi tập chứng cứ R9 không chứa các ca đó.

## Kết quả test

- `node .devloopflow/verify/20261109-sprint08-payment/evidence/scripts/r9-readonly.cjs`: lần đầu exit 1 vì SQL harness dùng `i.store_id` không tồn tại. PostgreSQL báo nguyên văn `ERROR: column i.store_id does not exist`; không phải finding product. Query ở transaction READ ONLY, không mutation. Giữ `evidence/r9-db-readonly.*`, `r9-capture-failed.json` và run gốc `qa-evidence/20261110-110814-48ed476-s8-verify-ac-r9/`; không ghi đè log lỗi.
- Sửa **chỉ harness evidence** sang `t.store_id`; chạy lại cùng lệnh exit 0, bắt đầu 11:08:34.046 UTC, kết thúc 11:08:34.567 UTC (host). SQL server timestamp 11:08:35.083658 UTC. Giữ thời gian gốc từng công cụ, không sửa đồng hồ/log. `r9-final-capture-finished.json`, `r9-final-db-readonly.result.json`, `r9-final-ngrok.result.json`.
- `node .devloopflow/verify/20261109-sprint08-payment/evidence/scripts/r9-audit.cjs`: exit 0; đối chiếu hash ảnh gốc, ngrok cũ/mới, SQL read-only và tám cờ, counts, 18 bản sao artifact, bốn checksum deployed/local và scan secret/account. `r9-artifact-audit.json`, `r9-provenance.json`. Đây là assertion của harness audit, **không phải test suite dự án**; không tạo số lượng test giả.
- Số test runner dự án chạy: **0**. Không chạy `npm test`, coverage, build/typecheck hoặc CI trong retry provider-only. Các test/build R8 không được dùng thay kiểm R9. Không chạy API integration suite tạo/xóa database. Không có request mutation hoặc giao dịch provider do verifier tạo.

## Coverage

Không có script/threshold coverage trong manifest/CI theo cấu hình dự án; không chạy hoặc báo số liệu coverage. Retry không bao gồm regression toàn sprint.

## Đã đối chiếu errors

- Đọc INDEX và toàn bộ `.devloopflow/errors/20261109-sepay-malformed-json-code.md`, `20261109-sepay-unsigned-webhook-status.md`, `20261109-sepay-wrong-account-hidden.md`. Các lỗi cũ đã đóng ngoài V1-4 không được gửi lại request để kiểm trong R9; không suy lại PASS từ hồ sơ.
- Đối chiếu lịch sử task với INDEX: R1-1/R3-1, R1-2, R2-1, V1-1, V2-2, V3-1/V3-2 có file errors tương ứng. V2-1/V1-2/V1-3 là đồng bộ tài liệu theo quyết định user, không có bug source mới trong retry này. Không có finding đã sửa mới thiếu hồ sơ errors trong phạm vi R9.
- `.devloopflow/MEMORY.md` không có mục Hay quên có hiệu lực; không tạo M-n giả. Áp dụng root MEMORY :33-37: mở lại chứng cứ gốc, không dựng DB-before/ảnh UI hay dùng kết quả cũ thay lần chạy mới.

## Bảng đối chiếu FAIL được yêu cầu kiểm lại

| AC / FAIL | Cách kiểm / bước đã chạy | Kết quả thật | Mong đợi theo plan nguyên văn | Quy định nguồn nguyên văn + path:dòng | Kết luận | Chỗ lệch |
|---|---|---|---|---|---|---|
| V1-4 — provider Test mode | R9-P1..P9, view ảnh gốc; fresh GET ngrok/health/root và SQL read-only; audit | Một ca đúng tiền: dashboard reference/webhook success, ngrok IN 25.000/event47447 ACK200, DB PAID/one payment/two SALE. Thiếu mode/account/settings provider, DB trước, authenticated GET invoice, UI trước/sau và bốn ca bổ sung | “(6) lưu artifact dashboard SePay, request webhook đến API, response, GET invoice và DB trước/sau; (7) chạy thêm underpay/overpay/late/promo invalid. Nếu không có tài khoản hoặc dashboard Test mode, đánh dấu tự xác nhận **chưa xác minh end-to-end** dù test HTTP ký local xanh.” (`approved:286`) | “trong Dashboard SePay bật Test mode, tạo tài khoản và webhook Test mode, sau đó dùng **Mô phỏng giao dịch** với số tiền và nội dung chuyển khoản thử; kiểm tra webhook đến URL đã cấu hình và kết quả đối chiếu.” (`THIRD_PARTY_INTEGRATIONS.md:12`); “mismatch/late/underpaid đã map attempt thì ghi ngoại lệ có store/branch và ack” (`specs/invoices.md:105`); “giữ đơn chưa `PAID` và ghi ngoại lệ cho MANAGER/OWNER” (`docs/BUSINESS_RULES.md:162`) | **Sai / FAIL — Không có chứng cứ đầy đủ** | Một vế đúng tiền sau giao dịch không đáp ứng toàn bộ :286; giữ V1-4 `mở` |

AC không chạy lại: V1-1/2/3, V2-1/2, V3-1/2; E2E-AC-1..7; R2-1.AC-1..3; ST-1.AC-1/2, ST-2.AC-1, ST-3.AC-1, ST-4.AC-1, ST-5.AC-1/2, ST-6.AC-1, ST-7.AC-1, ST-8.AC-1/2; RF-1..5. Vế provider của E2E-AC-4/5/ST-6 được đối chiếu trong V1-4; không kết luận lại toàn bộ các AC đó. Không thay trạng thái lịch sử của AC ngoài retry.

## Đối chiếu spec (cấp tính năng)

| Mục spec nguyên văn | Loại | AC/bước đã chạy | Kết quả thật | Kết luận |
|---|---|---|---|---|
| “Chuyển thiếu giữ chưa thanh toán; chuyển bằng hoặc nhiều hơn tự hoàn tất, lưu số thực nhận và phần dư riêng” (`spec`, Mục tiêu S8-03) | Mục tiêu | R9-P2/P3/P6/P7 | Bằng tiền có ngrok/DB sau khớp 25.000, dư 0; thiếu/thừa chưa có provider artifact | Đúng cho dữ liệu sau ca exact; **Sai do thiếu chứng cứ** toàn vế provider |
| “UI chỉ báo thành công khi server đã xác nhận” (`spec`, Mục tiêu QR) | Mục tiêu | R9-P4 | Không có UI/network trước/sau ca user | Sai / không có chứng cứ |
| “tiền đến theo mã lượt đã hủy hoặc sau khi đơn bị hủy không tự mở lại/tự `PAID`, báo quản lý xử lý” (`spec`, Mục tiêu QR) | Mục tiêu | R9-P8 | Chưa có provider late trace | Sai / không có chứng cứ |
| “Nếu mã giảm giá hết hạn/hết lượt trong lúc QR đang chờ rồi tiền chuyển vào” và “Đơn chưa `PAID`” (`spec`, quyết định Product Owner) | Mục tiêu | R9-P9 | Ca exact không có promo link; chưa có ca promo provider | Sai / không có chứng cứ |
| “Ghi payment hai lần, tăng lượt mã/trừ kho hai lần khi retry/webhook lặp” (`spec`, Phản mục tiêu) | Phản mục tiêu | R9-P3 | Hiện một payment, hai SALE; không replay và không DB-before | Chưa xác minh chống lặp/transaction ở provider bằng R9 |
| “dùng Test mode để kiểm thử, không dùng tiền thật” (`spec`, Ràng buộc) | Ràng buộc | R9-P1/P5 | Không tạo tiền/giao dịch mới; screenshot không thấy mode; container flag chỉ local | Chưa xác minh mode của ca user; không suy đây là Live hoặc tiền thật |
| “không bật giao dịch ngân hàng Live trong Sprint 08” (`spec`, Phi mục tiêu) | Phi mục tiêu | Toàn R9 | Không đổi mode, không gọi provider/Live | Đúng cho hành động verifier; không xác nhận mode giao dịch user |

Các mục ngoài V1-4 không được nghiệm thu lại trong lần 9.

## FAIL / bug

- **V1-4 — Không có chứng cứ đầy đủ; giữ mở.**
  - Bước tái hiện: mở approved :275,:286; audit tập user theo R9-P1..P9; đối chiếu dashboard/ngrok/GET invoice/SQL trước-sau/UI từng ca.
  - Kỳ vọng: Test mode và account/settings provider có thể đối chiếu, reference đúng, một giao dịch exact và underpay/overpay/late/promo invalid có trace và kết quả đúng contract; không dùng HMAC tự ký thay provider.
  - Thực tế: một dashboard webhook success khớp ngrok event/DB sau exact. Thiếu các vế được nêu trong ma trận; không có sản phẩm sai đã tái hiện trong R9.
  - Path bằng chứng: `evidence/r9-final-*`, `r9-artifact-audit.json`, ảnh/user run theo bảng; run mới `qa-evidence/20261110-110834-48ed476-s8-verify-ac-r9/run.md`.
  - Test tái hiện đề xuất: `test_SePay_provider_test_mode_e2e` | input: provider **Test mode** exact/underpay/overpay/late/promo invalid, account/reference riêng đúng ca | expected: dashboard event/webhook ACK/authenticated GET invoice/SQL trước-sau/UI nhất quán từng vế approved :286 và contract; không dùng tiền thật. User tự thao tác provider, verifier chỉ audit chứng cứ/chạy lại khi user gọi.

## Lệch tài liệu

Không phát hiện lệch tài liệu mới ảnh hưởng V1-4 trong các nguồn đã duyệt. TPI :3/:12 vẫn ghi “chưa kiểm SePay Test mode thật”; R9 chưa đủ chứng cứ để đổi trạng thái đó. Bản API draft không thay nguồn approved. Không tự sửa nguồn hoặc chọn bỏ AC.

## Đánh giá test

R9 kiểm dữ liệu thực qua SQL READ ONLY/ngrok inspection mới; không mock DB hoặc dựng response. Audit nối event/reference/amount/account/scope/timestamps và checksum artifact. Ảnh provider không hiển thị mode/amount nên không gán các thuộc tính đó từ ảnh. SQL sau và count hiện tại không chứng minh trạng thái trước, rollback, replay/concurrency, UI hoặc nhánh provider chưa có; mọi vế thiếu giữ FAIL. Không dùng test suite cũ để đóng V1-4.

## Exploratory

- R9-P3 so event account/payment account với attempt **bằng boolean trong SQL**, không xuất account: cả hai `t`; ref/scope/amount/system actor/timestamp cũng `t`.
- Current invoice không promo link; current event/attempt summary chỉ PAID một dòng. Không suy từ đó rằng nhánh promo/underpay/late/overpay đã được chạy.
- Checksum file deployed/local khớp, input screenshot hash không đổi; 18 bản sao raw artifact khớp; scan giá trị secret/account không phát hiện trong artifact text đã chọn.
- Không thực thi lại lỗi cũ/RF ngoài retry, không gửi webhook exploratory, không truy cập dashboard provider hoặc browser user. Không tạo dữ liệu cần dọn; giữ nguyên app/container/DB.

## Đề xuất

- User tiếp tục tự thu chứng cứ provider **Test mode** cho các vế còn thiếu theo ma trận; cần ghi DB trước/ảnh UI trước **trước thao tác ca mới**, không dựng lại cho ca đã xong. Với exact có thể chạy ca mới có đầy đủ before/after thay vì suy ngược trạng thái cũ.
- Giữ V1-4 `mở`, task chưa nghiệm thu toàn sprint. Không tự fix hoặc lặp verify-ac; chờ user bổ sung rồi gọi retry riêng.
- Agent chính ghi lịch sử task và Graphify semantic cho Markdown thay đổi theo AGENTS. Verifier chỉ ghi report/sổ FAIL/evidence/run, không sửa plan/task/graph.
