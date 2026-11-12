# Đề xuất sync-docs lần 1 — V1-2 và V1-3 (task 20261109-sprint08-payment)

Trạng thái: **chờ user duyệt từng mục D-n**; chưa sửa tài liệu nào của dự án trong danh sách này. Nhóm A (`.devloopflow/devloopflow.md`) đã tự sửa: mục 1 bỏ câu "không có `CLAUDE.md`" (xác nhận `ls CLAUDE.md`), thêm dòng lịch sử mục 9.

Căn cứ code (đã đọc): `POS_API/src/database/migrations/20261109000000-Payments.ts` (schema, CHECK, index, quyền), `POS_API/src/sales/sepay-webhook.service.ts`, `transfer-attempts.service.ts`, `store-bank-account.service.ts`, `POS_API/src/auth/auth-config.ts:16-19`, các `@Controller`/`@Get|@Post|@Patch` trong `POS_API/src/sales/`. Mọi message lỗi dưới đây chỉ nêu mã và HTTP (message tiếng Việt do V2-1 đã chốt theo code).

## V1-2 — chuyển khoản: BR-33 và THIRD_PARTY_INTEGRATIONS

**D-1: `docs/BUSINESS_RULES.md:162` (BR-33)**
- Hiện tại: `| BR-33  | `TRANSFER`: thu ngân xác nhận đã nhận tiền, ghi `transaction_ref` nếu có. Tự xác nhận qua webhook ngân hàng là phần mở rộng. | MVP (webhook: tùy chọn) |`
- Đề xuất: `| BR-33  | `TRANSFER`: tạo lượt QR chờ thanh toán (đơn bị khóa sửa món, mã, thanh toán khác cho tới khi lượt được thanh toán hoặc hủy chờ). SePay tự xác nhận khi **một** giao dịch đủ tiền khớp mã lượt QR và tài khoản nhận của cửa hàng; tiền thừa ghi riêng (`actual_received_amount`, `excess_amount`), doanh thu hóa đơn vẫn bằng tổng đơn. Thiếu tiền, sai tài khoản, QR đã hủy, đơn không còn mở hoặc mã giảm hết hiệu lực: giữ đơn chưa `PAID` và ghi ngoại lệ cho MANAGER/OWNER. MANAGER/OWNER được xác nhận thủ công (bắt buộc mã giao dịch ngân hàng, lý do, số tiền thực nhận ≥ tổng đơn). Chi tiết: `specs/invoices.md`. | MVP |`
- Bằng chứng: migration `payments` CHECK TRANSFER/`confirmation_source`; `transfer-attempts.service.ts` (`confirmTransferManually`, `cancelTransferAttempt`); `sepay-webhook.service.ts` (disposition PAID/UNDERPAID/ATTEMPT_CANCELLED/INVOICE_NOT_OPEN/PROMOTION_INVALID/QUARANTINED/DUPLICATE); `sales.service.ts:162-171` (`writable()` khóa khi có lượt PENDING); báo cáo kiểm AC `report-1.md` E2E-AC-4/6.
- Vì sao: dòng này đi ngược quyết định Sprint 08 (banner dòng 3 của chính file đã ghi BR-33 được cập nhật).

**D-2: `docs/BUSINESS_RULES.md:163` (BR-34)** — thêm một câu cuối trước cột `MVP`
- Hiện tại (đoạn cuối): `... Chi tiết xem `api-spec.md` mục 7. | MVP |`
- Đề xuất (đoạn cuối): `... Chi tiết xem `api-spec.md` mục 7. Tạo lượt QR và xác nhận thủ công cũng bắt buộc `Idempotency-Key` theo cùng nguyên tắc (khóa lượt QR lưu ở `transfer_attempts`, khóa xác nhận thủ công ở `payments`). | MVP |`
- Bằng chứng: `transfer-attempts.service.ts:53,123` (kiểm header, 422); migration `transfer_attempts.idempotency_key uuid NOT NULL UNIQUE`.

**D-3: `docs/BUSINESS_RULES.md:152` (BR-75)**
- Hiện tại (đoạn cuối): `... Mã dùng để đối chiếu giao dịch chuyển khoản khi tích hợp SePay. | MVP (đối chiếu SePay: tùy chọn) |`
- Đề xuất: `... Khi chuyển khoản QR, mỗi lượt có mã riêng 18 ký tự = `invoice_code` cộng 8 ký tự ngẫu nhiên `A-Z`/`0-9`, dùng để đối chiếu giao dịch SePay; `invoice_code` không đổi. | MVP |`
- Bằng chứng: migration `transfer_attempts.transfer_reference char(18) UNIQUE CHECK ^HD[A-Z0-9]{16}$`.

**D-4: `THIRD_PARTY_INTEGRATIONS.md:3` (banner trạng thái)**
- Hiện tại: `> **Trạng thái:** Định hướng tích hợp, chưa triển khai. MVP hiện cho thu ngân xác nhận chuyển khoản thủ công (BR-33); tự xác nhận qua webhook là phần mở rộng tùy chọn. Tài liệu này chưa thay thế đặc tả thanh toán trong `specs/` hay thay đổi quy tắc MVP.`
- Đề xuất: `> **Trạng thái (09/11/2026):** Webhook SePay (HMAC trên raw body, kiểm timestamp, chống trùng) và QR VietQR Quick Link đã được triển khai trong Sprint 08, kiểm trên local bằng webhook tự ký; **chưa kiểm SePay Test mode thật, chưa Live, Sprint 08 chưa nghiệm thu**. Hợp đồng thanh toán ở `specs/invoices.md` và BR-33; phần dưới là nguồn tham khảo và cấu hình.`
- Bằng chứng: `sepay-webhook.service.ts`; `transfer-attempts.service.ts:38` (`img.vietqr.io/image/...`); `report-1.md`, `report-2.md` (HMAC local, V1-4 chưa có Test mode thật).

**D-5: `THIRD_PARTY_INTEGRATIONS.md` (mục SePay, dòng Môi trường)**
- Hiện tại: `Cấu hình dự kiến qua `SEPAY_ENV`; giá trị hợp lệ và cách ánh xạ sang Test/Live cần chốt trước khi triển khai.`
- Đề xuất: `Cấu hình qua `SEPAY_ENV`: code chỉ nhận webhook khi `SEPAY_ENV=test` và có `SEPAY_WEBHOOK_SECRET`; thiếu một trong hai thì webhook trả 503. Chưa có giá trị Live.`
- Bằng chứng: `POS_API/src/auth/auth-config.ts:16-19`; `report-2.md` ca R2-S1..S3 (503).

**D-6: `THIRD_PARTY_INTEGRATIONS.md` (mục SePay, dòng Kiểm thử)**
- Hiện tại: `Chưa có script giả lập webhook trong repository.`
- Đề xuất: `Test tích hợp `POS_API/src/sales/tests/payment.integration.test.ts` tự ký HMAC và gọi webhook; chưa có script mô phỏng riêng và chưa chạy Mô phỏng giao dịch của SePay Test mode.`
- Bằng chứng: test ST-6 trong file trên (helper `webhook`/`post`).

**D-7: `THIRD_PARTY_INTEGRATIONS.md:23` (VietQR, Ràng buộc mã đối chiếu)**
- Hiện tại (đoạn đầu): `**Ràng buộc mã đối chiếu:** nội dung chuyển khoản dùng `invoices.invoice_code` đúng dạng `HD` + 8 ký tự `A-Z`/`0-9` (BR-75), không dùng UUID. Mã duy nhất toàn hệ thống, do server sinh và được định nghĩa trong [thiết kế DB](docs/DESIGN_DB_POS_SYSTEM.md).` … cuối dòng: `... nên mã 10 ký tự này nằm trong giới hạn đó.`
- Đề xuất: đoạn đầu: `**Ràng buộc mã đối chiếu:** nội dung chuyển khoản dùng mã lượt QR `transfer_attempts.transfer_reference` (18 ký tự: `invoice_code` cộng 8 ký tự ngẫu nhiên `A-Z`/`0-9`, mỗi lượt riêng, không dùng UUID); `invoice_code` không đổi (BR-75). Mã duy nhất toàn hệ thống, do server sinh, định nghĩa trong [thiết kế DB](docs/DESIGN_DB_POS_SYSTEM.md).` Cuối dòng: `... nên mã 18 ký tự này nằm trong giới hạn đó.` Phần giữa giữ nguyên.
- Bằng chứng: migration `transfer_attempts`; 18 ≤ 25 ký tự của `addInfo`.

**D-8: `THIRD_PARTY_INTEGRATIONS.md` (VietQR, dòng Khi lỗi tạo/hiển thị QR)**
- Hiện tại: `**Khi lỗi tạo/hiển thị QR:** chưa chốt có hiển thị thông tin chuyển khoản thủ công hay báo lỗi. Quyết định này phải nằm trong đặc tả luồng thanh toán trước khi nối UI thật.`
- Đề xuất: `**Khi lỗi tạo/hiển thị QR:** màn thanh toán vẫn hiện thông tin chuyển khoản (ngân hàng, số tài khoản, số tiền, nội dung) để khách chuyển tay (quyết định Product Owner 09/11/2026, `specs/invoices.md`).`
- Bằng chứng: `.devloopflow/tasks/active/20261109-sprint08-payment.md` (quyết định "Có, hiện thông tin chuyển khoản"); `report-1.md` ST-8 (ảnh `r1-UI3-qr-image-error-fallback.png`, QR lỗi giả lập bằng `dispatchEvent(error)`).

**D-9: `THIRD_PARTY_INTEGRATIONS.md` (mục "Quyết định cần chốt trước khi triển khai", 4 mục)**
- Hiện tại: tiêu đề `## Quyết định cần chốt trước khi triển khai`, 4 mục đánh số 1–4 và câu cuối `Các quyết định nghiệp vụ trên cần được người dùng chốt, cập nhật [quy tắc nghiệp vụ](docs/BUSINESS_RULES.md) và đặc tả thanh toán trong `specs/` trước khi viết mã.`
- Đề xuất: thay bằng `## Quyết định đã chốt (Sprint 08, 09/11/2026)` và một đoạn: `Các điểm trên đã được Product Owner chốt tại `specs/invoices.md` và BR-33: SePay tự xác nhận khi một giao dịch đủ tiền; đơn bị khóa trong lúc chờ QR, không tự hết hạn; thiếu/trùng/sai tài khoản hoặc đến muộn thì giữ đơn chưa thanh toán và báo quản lý; một tài khoản nhận chung cho cửa hàng, chỉ OWNER cài và không đổi khi còn QR chờ; MANAGER/OWNER xác nhận thủ công khi webhook không đến; QR lỗi vẫn hiện thông tin chuyển khoản.`
- Bằng chứng: ghi chép quyết định trong task; `specs/invoices.md` mục Quyết định.

**D-10: `AGENTS.md:29` và `CLAUDE.md:29` (hai file giống hệt nhau)**
- Hiện tại: `| `THIRD_PARTY_INTEGRATIONS.md` | Định hướng tích hợp SePay và VietQR **chưa triển khai**; đọc khi làm luồng chuyển khoản hoặc mã QR. |`
- Đề xuất: `| `THIRD_PARTY_INTEGRATIONS.md` | Tích hợp SePay (webhook) và VietQR (QR) đã triển khai trong Sprint 08 trên local, **chưa kiểm SePay Test mode thật**; đọc khi làm luồng chuyển khoản hoặc mã QR. |`
- Lưu ý: `AGENTS.md` có thay đổi chưa commit của bạn; `CLAUDE.md` là bản sao nên sửa cả hai để giữ giống nhau. (Dòng 6 "POS_API đã có nền tảng PB-01 và API xác thực PB-02" cũng đã lạc hậu so với code hiện có, nhưng ngoài phạm vi V1-2/V1-3; tôi không đề xuất sửa ở đây.)
- Bằng chứng: như D-4.

## V1-3 — api-spec, DESIGN_DB, specs/invoices

**D-11: `docs/api-spec.md` bảng "Mã lỗi nghiệp vụ" (sau dòng `PROMOTION_ALREADY_APPLIED`, trước `EXPENSE_REASON_REQUIRED`)** — thêm 7 dòng (cột Mã lỗi | HTTP | Rule | Khi nào):
- `` `TRANSFER_PENDING` | 409 | BR-33 | Đơn còn lượt QR chờ (sửa món, mã giảm, thanh toán bị chặn) hoặc đổi tài khoản nhận khi cửa hàng còn QR chờ ``
- `` `TRANSFER_NOT_PENDING` | 409 | BR-33 | Hủy hoặc xác nhận một lượt QR không còn `PENDING` ``
- `` `BANK_ACCOUNT_REQUIRED` | 409 | BR-33 | Tạo QR khi cửa hàng chưa cài tài khoản nhận ``
- `` `BANK_TRANSACTION_REUSED` | 409 | BR-33 | Mã giao dịch ngân hàng đã dùng cho đơn khác ``
- `` `TRANSFER_AMOUNT_INSUFFICIENT` | 422 | BR-33 | Xác nhận thủ công với số tiền thực nhận nhỏ hơn tổng đơn ``
- `` `INVALID_WEBHOOK_SIGNATURE` | 401 | BR-33 | Webhook SePay thiếu hoặc sai chữ ký (không dùng cookie/CSRF) ``
- `` `INVALID_WEBHOOK_PAYLOAD` | 400 | BR-33 | Webhook có chữ ký đúng nhưng nội dung hoặc timestamp không hợp lệ ``
- Hiện tại: bảng không có 7 mã này (`grep` cho 0 kết quả).
- Bằng chứng: `httpError(...)` trong `transfer-attempts.service.ts`, `store-bank-account.service.ts`, `sepay-webhook.service.ts` (mã + HTTP khớp bảng). Lưu ý: hành vi 401 cho "thiếu cả hai header" đang được sửa ở V2-2 (chờ kết quả), dòng `INVALID_WEBHOOK_SIGNATURE` viết theo hợp đồng spec nên đúng sau V2-2.

**D-12: `docs/api-spec.md` mục 11 "Danh mục nhóm route"**
- Hiện tại (dòng Hóa đơn): `| Hóa đơn | `/invoices`, `/invoices/{id}/items`, `/invoices/{id}/payments`, `/invoices/{id}/complete-zero` | `CASHIER`, `MANAGER`, `OWNER` | `specs/invoices.md` |`
- Đề xuất: dòng Hóa đơn thêm `/invoices/{id}/payment-preview`, `/invoices/{id}/apply-promotion`, `/invoices/{id}/remove-promotion`; thêm dòng mới ngay sau: `| Chuyển khoản QR | `/store-bank-account`, `/invoices/{id}/transfer-attempts`, `/transfer-attempts/{id}/confirm-manual`, `/transfer-attempts/{id}/cancel`, `/bank-transfer-exceptions`, `/payments/sepay/webhook` (webhook không dùng cookie/CSRF, xác thực bằng HMAC) | `OWNER` (tài khoản nhận), `CASHIER`/`MANAGER`/`OWNER` (QR), `MANAGER`/`OWNER` (xác nhận thủ công, ngoại lệ), SePay (webhook) | `specs/invoices.md` |`
- Bằng chứng: `@Controller`/`@Get|@Post|@Patch` trong `sales.controller.ts`, `store-bank-account.controller.ts`, `transfer-attempts.controller.ts`, `sepay-webhook.controller.ts`; quyền trong migration (`store_bank_account.manage`, `transfer.confirm_manual`, `transfer.exception_read`).

**D-13: `docs/api-spec.md` mục 7, thêm một gạch đầu dòng sau dòng `POST /invoices/{id}/payments chỉ nhận ...`**
- Đề xuất: `- `POST /invoices/{id}/transfer-attempts` và `POST /transfer-attempts/{id}/confirm-manual` cũng bắt buộc `Idempotency-Key` (`uuid`); trùng key với cùng nội dung trả kết quả cũ kèm `Idempotent-Replay: true`, khác nội dung trả `409 IDEMPOTENCY_KEY_REUSED`.`
- Bằng chứng: `transfer-attempts.service.ts:53,123`; test `test_ST7_manual_confirm_replay` (201 + `Idempotent-Replay: true`, 409 `IDEMPOTENCY_KEY_REUSED`).

**D-14: `docs/DESIGN_DB_POS_SYSTEM.md` §4 (đếm và bảng mô tả)**
- Hiện tại: tiêu đề `### 4. Bán hàng (6 bảng)`; bảng mô tả 6 bảng (`invoices`, `invoice_items`, `invoice_item_toppings`, `payments`, `promotion_codes`, `invoice_promotion_codes`).
- Đề xuất: tiêu đề `(9 bảng)` và thêm 3 dòng mô tả: `store_bank_accounts` (tài khoản nhận chuyển khoản chung của cửa hàng, mỗi cửa hàng tối đa một dòng), `transfer_attempts` (mỗi lượt QR chờ/hủy/đã thanh toán: snapshot tài khoản + số tiền + mã lượt 18 ký tự, tối đa một lượt `PENDING` mỗi hóa đơn), `bank_transfer_events` (nhật ký giao dịch ngân hàng từ SePay: `PAID`/`UNDERPAID`/`ATTEMPT_CANCELLED`/`INVOICE_NOT_OPEN`/`PROMOTION_INVALID`/`QUARANTINED`/`DUPLICATE`).
- Bằng chứng: migration `20261109000000-Payments.ts`.

**D-15: `docs/DESIGN_DB_POS_SYSTEM.md` mục `payments` (dòng ~351-366)**
- Hiện tại (các dòng cần đổi): `method varchar(20) NOT NULL`; `amount bigint NOT NULL, CHECK > 0`; `idempotency_key varchar(100) NOT NULL, UNIQUE`; `idempotency_request_hash varchar(64) NOT NULL` (ghi chú liệt kê `invoiceId, method, amount, tendered_amount, transaction_ref`); `created_by uuid FK → users, NOT NULL`; có dòng `created_at timestamptz NOT NULL`.
- Đề xuất: `method varchar(10)` + CHECK `CASH`/`TRANSFER`; `amount` CHECK `BETWEEN 1 AND 1000000000000`; `idempotency_key uuid NOT NULL UNIQUE`; `idempotency_request_hash char(64) NOT NULL`; `created_by uuid FK → users, NULL` (NULL khi xác nhận bằng webhook, bắt buộc khi `CASH` và `MANUAL`); bỏ dòng `created_at` (bảng thật không có cột này, có `paid_at`); thêm 8 dòng: `actual_received_amount bigint NULL` (thực nhận khi TRANSFER), `excess_amount bigint NULL` (= thực nhận − amount), `transfer_attempt_id uuid NULL UNIQUE FK → transfer_attempts` , `receiving_account_number varchar(34) NULL`, `transaction_ref_kind varchar(12) NULL` (`BANK`/`SEPAY_EVENT`), `confirmation_source varchar(10) NULL` (`WEBHOOK`/`MANUAL`), `confirmed_by uuid NULL FK → users`, `confirmation_reason varchar(255) NULL`; ghi chú: CHECK theo phương thức (CASH có tendered/change và không có field TRANSFER; TRANSFER có attempt, tài khoản, mã giao dịch, thực nhận ≥ amount).
- Bằng chứng: migration `CREATE TABLE payments` (cột và CHECK); `report-1.md` ST-1.AC-1 (SQLSTATE 23514 khi vi phạm).

**D-16: `docs/DESIGN_DB_POS_SYSTEM.md` — thêm mục field cho 3 bảng mới (sau `payments`/`invoice_promotion_codes`) và sửa `invoice_promotion_codes`**
- Đề xuất thêm `**store_bank_accounts**`, `**transfer_attempts**`, `**bank_transfer_events**` với bảng Field/Kiểu/Ràng buộc đúng như migration (cột, kiểu, CHECK, FK `ON DELETE RESTRICT`, index `uq_transfer_attempts_pending_invoice`, `idx_transfer_attempts_store_status`, `idx_bank_transfer_events_scope`); `account_number varchar(34)` kèm CHECK `^[0-9]{6,19}$` (6–19 chữ số).
- Đề xuất sửa `invoice_promotion_codes`: bỏ dòng `created_at` (bảng thật không có cột này; có `invoice_id` là PK).
- Bằng chứng: migration; `report-1.md` ST-1.

**D-17: `docs/DESIGN_DB_POS_SYSTEM.md` mục `stock_movements` (dòng ~501) và bảng ràng buộc (~596-610)**
- Hiện tại: `created_by uuid FK → users, NOT NULL`; bảng ràng buộc chỉ có `payments UNIQUE (invoice_id)` cho thanh toán.
- Đề xuất: `created_by uuid FK → users, NULL` (NULL khi `source='SYSTEM'`); thêm `source varchar(10) NOT NULL DEFAULT 'USER' CHECK USER/SYSTEM` và CHECK `ck_stock_movements_actor`; thêm vào bảng ràng buộc: `payments UNIQUE (receiving_account_number, transaction_ref_kind, transaction_ref) WHERE method='TRANSFER' AND transaction_ref IS NOT NULL`; `transfer_attempts UNIQUE (invoice_id) WHERE status='PENDING'` và `UNIQUE (transfer_reference)`; `bank_transfer_events UNIQUE (provider_event_id)`.
- Bằng chứng: migration (`ALTER TABLE stock_movements ...`, `CREATE UNIQUE INDEX uq_payments_bank_transaction`, `uq_transfer_attempts_pending_invoice`); `report-1.md` E2E-AC-3 (SALE do hệ thống).

**D-18: `specs/invoices.md:118` và `:121`** (spec đã chốt; banner dòng 12 đã ghi thay 6–34 bằng 6–19, nhưng phụ lục còn nguyên)
- Hiện tại: dòng 118 `account_number varchar(34) NOT NULL CHECK 6..34 digits`; dòng 121 `accountNumber 6..34 chữ số`.
- Đề xuất: dòng 118 `account_number varchar(34) NOT NULL CHECK 6..19 digits`; dòng 121 `accountNumber 6..19 chữ số`. Giữ `varchar(34)`.
- Bằng chứng: migration CHECK `^[0-9]{6,19}$`; banner `specs/invoices.md:12`; `report-1.md` E2E-AC-7 (19 hợp lệ, 20 bị từ chối).

## Không đề xuất (không đủ căn cứ hoặc ngoài phạm vi)
- Ba quyền mới (`store_bank_account.manage`, `transfer.confirm_manual`, `transfer.exception_read`) và `pos.sell` cho MANAGER có trong migration; chưa kiểm xem danh mục quyền trong `docs/` có liệt kê chúng chưa. Nếu bạn muốn đồng bộ thì báo để tôi lập D-19.
- Câu của banner `docs/BUSINESS_RULES.md:3` ("code chưa được nghiệm thu"): giữ nguyên vì Sprint 08 chưa nghiệm thu.
