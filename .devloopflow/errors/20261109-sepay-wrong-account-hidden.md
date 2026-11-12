---
id: 20261109-sepay-wrong-account-hidden
tags: [sales, api, sepay, webhook, exceptions, ui]
found_by: ac-verifier
severity: Medium
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Giao dịch sai tài khoản nhận bị cách ly, quản lý không thấy; message 5 mã lỗi lệch spec (V3-1, V3-2)

## Triệu chứng
- V3-2: webhook ký đúng, đúng mã lượt QR PENDING nhưng `accountNumber` khác snapshot → 200, đơn OPEN, event `QUARANTINED` với store_id/branch_id/invoice_id/attempt_id NULL và không có trong `GET /bank-transfer-exceptions`, trong khi `docs/BUSINESS_RULES.md:162` và `THIRD_PARTY_INTEGRATIONS.md` nói "sai tài khoản … báo quản lý". RED: `qa-evidence/20261109-fix-v3/red-v3-2.log`.
- V3-1: message của TRANSFER_NOT_PENDING, BANK_ACCOUNT_REQUIRED, BANK_TRANSACTION_REUSED, TRANSFER_AMOUNT_INSUFFICIENT và một biến thể TRANSFER_PENDING khác chuỗi trong plan :136 và `specs/invoices.md:122`. RED: `qa-evidence/20261109-fix-v3/red-v3-1.log`.

## Nguyên nhân gốc
- V3-2: webhook coi mọi sự kiện sai tài khoản là quarantine nội bộ (không gắn tenant) và truy vấn ngoại lệ không lấy `QUARANTINED`; spec cũ (`specs/invoices.md:101`) cũng quy định như vậy, nên văn bản BR-33/THIRD (viết theo quyết định "báo quản lý") và spec mâu thuẫn nhau. Product Owner quyết 09/11/2026 theo hướng BR-33: hiện cho quản lý.
- V3-1: message được viết lúc cài đặt khác chuỗi chốt trong plan; test chỉ kiểm mã lỗi và HTTP.

## Cách fix
- `POS_API/src/sales/sepay-webhook.service.ts` — tiền vào + đúng một mã lượt + sai tài khoản: ghi `QUARANTINED` gắn store/branch/invoice/attempt của lượt, vẫn không thanh toán, vẫn 200; tiền ra hoặc không khớp đúng một lượt vẫn quarantine nội bộ.
- `POS_API/src/sales/transfer-attempts.service.ts` — truy vấn ngoại lệ thêm `QUARANTINED` có `attempt_id`, lý do `WRONG_ACCOUNT`; 5 message theo chuỗi spec. Message riêng của đổi tài khoản nhận khi còn QR chờ giữ nguyên (`store-bank-account.service.ts`).
- `POS_UI/src/features/pos/LivePaymentDialog.tsx` — nhãn "Sai tài khoản nhận".
- Test tái hiện: `payment.integration.test.ts::test_ST5_payment_error_messages_match_spec [V3-1]`, `::test_ST7_wrong_account_reaches_managers [V3-2]`, `::test_ST7_outgoing_wrong_account_stays_internal [V3-2-out]` (đột biến bỏ `transferType==='in'` làm test đỏ, đã khôi phục), `POS_UI/test/live-payment.test.mjs` `[V3-2]`. Product Owner duyệt sửa 2 assertion cũ (`test_ST6_missing_reference_paid_replay`, `test_ST6_signature_and_account_scope`). Full API 129/129, UI 54/54 (agent chính chạy lại: `qa-evidence/20261109-fix-v3/main-api-full.log`, `main-ui-full.log`).

## Quy tắc phòng tránh
- Khi một dòng tài liệu nói "báo quản lý" thì phải có test API cho đúng tình huống đó và cho người xem được; kiểm spec và BR nhất quán trước khi viết.
- Message lỗi có trong spec thì test so literal, không chỉ mã.
- Rủi ro đã biết: webhook dùng một secret chung nên nguồn hợp lệ có thể tạo một dòng ngoại lệ cho cửa hàng khác (không thanh toán, không lộ dữ liệu).

## Dấu hiệu nhận biết khi review
- Tài liệu và spec cùng nói về một trạng thái ngoại lệ nhưng khác nhau; kiểm bằng cách gọi route ngoại lệ sau khi gửi webhook.
