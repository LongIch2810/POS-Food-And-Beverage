---
id: 20261110-backlog-payment-preview-non-open-invoice
tags: [sales, api, payment-preview, invoice-status]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Xem trước thanh toán tính lại giá cho đơn không còn OPEN (B-3, R3-5)

## Triệu chứng
- Nguồn: review vòng 3 của task `20261109-sprint08-payment`, finding R3-5 (Low), ghi trong backlog `B-3` ngày 2026-11-10.
- `GET /invoices/{id}/payment-preview` trên đơn đã PAID hoặc CANCELLED vẫn trả 200 và tính lại giá, thay vì từ chối.
- Output RED lúc tái hiện (`tdd`): `error: 'Missing expected rejection.'`, `# pass 5 # fail 2` trong `ST-2.AC-1`.

## Nguyên nhân gốc
- Hàm `paymentPreview` trong `POS_API/src/sales/sales.service.ts` không kiểm `invoice.status` sau khi tải hóa đơn. Đã xác minh bằng RED ở trên.
- Quyết định của user: trả 409 `INVOICE_NOT_OPEN` khi đơn không còn OPEN (phương án a, ghi ngày 2026-11-10). Căn cứ hợp đồng: `specs/invoices.md` mục `GET /api/v1/invoices/{id}/payment-preview` (lỗi `404`, `422`, `403`) không nêu 409, nên quyết định này là bổ sung theo lựa chọn của user; mã `INVOICE_NOT_OPEN` đã có trong code và `docs/api-spec.md`.

## Cách fix
- File và thay đổi: `POS_API/src/sales/sales.service.ts` (hàm `paymentPreview`) — thêm `if(invoice.status!=='OPEN')throw httpError(409,'INVOICE_NOT_OPEN','Đơn không còn mở.');` sau `this.invoice(...)` và trước `evaluateInvoicePricing`.
- Test tái hiện: `POS_API/src/sales/tests/payment.integration.test.ts::[B-3] payment preview rejects non-OPEN invoices with 409 INVOICE_NOT_OPEN and stays readonly` (đơn PAID và CANCELLED bị 409; đơn OPEN vẫn 200; sai store vẫn 404; DB trước/sau không đổi).
- Kiểm chứng: API `npm test` 132/132 pass sau khi đổi fixture của B-4. Output lưu tại scratchpad của phiên `tdd`, chưa có CI độc lập.
- Caller đã kiểm: controller `sales.controller.ts` chỉ chuyển tiếp; UI chỉ gọi preview khi mở dialog trên đơn OPEN (`LivePaymentDialog.tsx`, hàm `load`).

## Quy tắc phòng tránh
- Mọi thao tác đọc tính toán trên hóa đơn phải kiểm trạng thái hóa đơn trước khi tính, không tính lại giá cho đơn đã chốt.
- Đặc tả phải ghi rõ mã lỗi cho trạng thái không hợp lệ của từng endpoint đọc.

## Dấu hiệu nhận biết khi review
- Hàm đọc gọi `evaluateInvoicePricing` hoặc tương tự mà không có kiểm `status`.
