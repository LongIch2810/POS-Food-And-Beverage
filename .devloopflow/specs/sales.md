# PB-07 — Đơn bán hàng OPEN và UI POS

> Bổ sung Sprint 08: MANAGER có ca CASHIER đang mở của chính mình được bán như CASHIER; đơn bị khóa sửa khi có QR đang chờ. Chi tiết tại [spec thanh toán](invoices.md); mô tả Sprint 6 bên dưới là lịch sử.


**Trạng thái:** Đã chốt theo xác nhận của Product Owner ngày 06/11/2026. **Sprint:** [Sprint 6](../sprints/sprint-06/SPRINT.md). **Nguồn:** [Product Overview](../docs/PRODUCT_OVERVIEW.md), [Business Rules](../docs/BUSINESS_RULES.md), [DB](../docs/DESIGN_DB_POS_SYSTEM.md), [API](../docs/api-spec.md), plan Sprint 6 đã được người dùng duyệt.

## Mục tiêu và phạm vi

- Thu ngân hoặc OWNER có ca CASHIER của chính mình đang OPEN được tạo/đọc/quản lý đơn OPEN tại bàn hoặc mang đi; MANAGER chỉ đọc đơn cùng chi nhánh. UI POS thật đọc menu, bàn và đơn qua API; có danh sách đơn OPEN để tìm lại mang đi.
- Gồm thêm/sửa/xóa dòng món, chuyển bàn BR-92, hủy đơn OPEN BR-28 và chặn đóng ca có đơn OPEN BR-19. Không gồm thanh toán, khuyến mãi, trừ kho hoặc hủy đơn PAID. POS thật ẩn thanh toán/mã giảm giá mock.
- Tiền là số nguyên đồng, server tính và giới hạn 1.000.000.000.000đ theo api-spec. Mọi route dùng cookie/CSRF, `data` envelope và lỗi chuẩn như api-spec. Các thao tác ghi không dùng `Idempotency-Key` ở Sprint 6; UI khóa nút trong lúc gửi và tải lại danh sách sau phản hồi mạng không chắc chắn.

## Quyết định và điểm cần chốt

- **Đã chốt từ Product Owner:** Sprint 6 gồm chuyển bàn và hủy đơn OPEN; người thao tác cần ca CASHIER của chính mình đang OPEN; MANAGER không có ca chỉ xem; POS thật ẩn thanh toán/khuyến mãi mock; danh sách đơn OPEN trong POS để tìm lại mang đi.
- **Đã chốt:** cấp `pos.sell` cho OWNER/CASHIER, `invoice.read` cho OWNER/MANAGER/CASHIER, `invoice.cancel_open` cho OWNER/MANAGER/CASHIER (MANAGER được thêm 11/11/2026 theo quyết định của user; vẫn cần ca CASHIER OPEN của chính người gọi và đơn cùng chi nhánh/ca đó). Chuyển bàn dùng `pos.sell`. Route sửa/xóa dòng dùng tài nguyên `/invoice-items/{id}` để giữ quy tắc lồng tối đa một cấp. Tạo đơn bàn đã bận trả `409 TABLE_HAS_OPEN_INVOICE` và `invoiceId` để UI nạp đơn hiện có; không tự tạo đơn thứ hai. Không hỗ trợ chuyển đơn TAKEAWAY thành DINE_IN trong BR-92. Để CASHIER đọc sơ đồ bàn thật mà không có quyền quản lý bàn, thêm `table.read` cho OWNER/MANAGER/CASHIER và chuyển `GET /dining-tables` sang quyền này; các route ghi bàn vẫn dùng `table.manage`.

## Luồng và hành vi

1. POS kiểm tra ca hiện tại qua API. Không có ca CASHIER OPEN thì chỉ hiện cổng mở ca; server cũng từ chối thao tác ghi.
2. UI đọc menu từ API thực đơn và bàn từ API tổ chức, rồi đọc danh sách hóa đơn OPEN theo branch. Trạng thái bàn được join từ hóa đơn OPEN, không lưu cột trạng thái.
3. Chọn bàn trống → tạo đơn DINE_IN; chọn bàn có đơn → nạp đơn OPEN hiện có; tạo mang đi → đơn TAKEAWAY không bàn. Mọi hóa đơn gắn ca, chi nhánh và người tạo từ danh tính/ca, không nhận những ID này từ client.
4. Thêm món tạo dòng mới với snapshot tên/giá; topping quantity tính trên mỗi ly. Sửa số lượng/note hoặc xóa dòng chỉ khi OPEN; giữ đơn giá snapshot. Mỗi thay đổi tính lại subtotal từ dòng DB trong transaction và khóa hóa đơn; discount=0, total=subtotal ở Sprint 6.
5. Chuyển bàn khóa đơn, kiểm tra bàn đích cùng branch còn hoạt động/trống; hủy đơn OPEN lưu lý do, người hủy và thời điểm. Hai hành vi không thay đổi item snapshot/tổng. Ca không đóng được khi có hóa đơn OPEN của ca.

## Endpoint

Các response dùng `data` và tên field camelCase; danh sách có `meta.limit/nextCursor/total`. DTO chi tiết hóa đơn: `id`, `invoiceCode`, `branchId`, `workShiftId`, `tableId`, `orderType`, `status`, `subtotal`, `discountAmount`, `totalAmount`, `note`, `createdAt`, `updatedAt`, `cancelReason`, `cancelledAt`, `items[]`; item gồm ID, `productSizeId`, snapshot tên món/size, `unitPrice`, `quantity`, `lineTotal`, `note`, `toppings[]` với snapshot tên/giá/số lượng/thành tiền. Không trả entity DB nguyên dạng.

### POST /api/v1/invoices

1. **Mô tả:** Tạo đơn OPEN rỗng tại bàn hoặc mang đi.
2. **Quyền:** `pos.sell` (OWNER/CASHIER có ca CASHIER OPEN).
3. **Phạm vi:** branch từ ca hiện tại; `tableId` nếu có phải cùng store/branch.
4. **Business rule:** BR-16, BR-69, BR-74–76, BR-95.
5. **Request:** body `{orderType: 'DINE_IN'|'TAKEAWAY', tableId?: uuid, note?: string}`; DINE_IN bắt buộc tableId, TAKEAWAY không nhận tableId; không nhận giá, branchId, workShiftId.
6. **Response thành công:** `201 {data: InvoiceDetailDto}`, items rỗng, tiền 0, mã server sinh.
7. **Lỗi:** `409 SHIFT_NOT_OPEN/BRANCH_INACTIVE/TABLE_HAS_OPEN_INVOICE/TABLE_INACTIVE`; `422 TABLE_REQUIRED/VALIDATION_ERROR/INVOICE_BRANCH_MISMATCH`; `404 NOT_FOUND` cho ID ngoài phạm vi; `403 PERMISSION_DENIED`.
8. **Ghi chú xử lý:** transaction, kiểm ca/branch/table, unique index `(table_id) WHERE status='OPEN'`; trùng bàn đồng thời trả 409, không tạo đơn thứ hai.
9. **Ví dụ:** `{ "orderType": "TAKEAWAY" }` → `201` với `orderType=TAKEAWAY`, `tableId=null`, `status=OPEN`.
10. **Kiểm thử cần có:** S6-01..03, BR-16/69/74/75/76/95.

### GET /api/v1/invoices

1. **Mô tả:** Liệt kê đơn OPEN cho POS; các trạng thái khác dành cho PB-09/PB-11.
2. **Quyền:** `invoice.read` (OWNER/MANAGER/CASHIER).
3. **Phạm vi:** người có branch gắn token luôn bị ép branch; OWNER dùng `branchId` tùy chọn.
4. **Business rule:** BR-71, BR-71b, BR-80–81, BR-99.
5. **Request:** query `status=OPEN`, `limit`, `cursor`, `branchId` chỉ cho OWNER; không nhận trạng thái khác trong Sprint 6.
6. **Response thành công:** `200 {data: InvoiceSummaryDto[], meta}`; DTO gồm mã, bàn, loại, trạng thái, tổng, thời gian và số món; phân trang ổn định.
7. **Lỗi:** `422 VALIDATION_ERROR`, `403 PERMISSION_DENIED`.
8. **Ghi chú xử lý:** tenant/branch filter tại DB; dùng dữ liệu này để tính bàn bận và tìm đơn mang đi sau reload.
9. **Ví dụ:** `GET /invoices?status=OPEN&limit=20` → `200` với danh sách và `meta.nextCursor`.
10. **Kiểm thử cần có:** S6-02/03/06, lọc chéo branch/store và phân trang.

### GET /api/v1/invoices/{id}

1. **Mô tả:** Đọc đơn và mọi dòng/topping snapshot.
2. **Quyền:** `invoice.read`.
3. **Phạm vi:** store/branch của đơn, ID ngoài phạm vi trả 404.
4. **Business rule:** BR-71, BR-80–81.
5. **Request:** path `id: uuid`, không body/branchId.
6. **Response thành công:** `200 {data: InvoiceDetailDto}`.
7. **Lỗi:** `404 NOT_FOUND`, `422 VALIDATION_ERROR`, `403 PERMISSION_DENIED`.
8. **Ghi chú xử lý:** đọc snapshot, không tính lại từ menu hiện tại.
9. **Ví dụ:** `GET /invoices/{id}` → `200`, `items` gồm dòng đã gọi.
10. **Kiểm thử cần có:** S6-03/05/06; đổi giá menu không đổi response dòng cũ.

### POST /api/v1/invoices/{id}/items

1. **Mô tả:** Thêm một dòng món mới vào đơn OPEN.
2. **Quyền:** `pos.sell` và ca CASHIER của chính người gọi đang OPEN, cùng branch của đơn.
3. **Phạm vi:** đơn/productSize/topping cùng store; đơn cùng branch ca.
4. **Business rule:** BR-09, BR-11–12, BR-16, BR-22–26, BR-80, BR-90.
5. **Request:** body `{productSizeId: uuid, quantity: integer>0, toppings?: [{toppingId: uuid, quantity: integer>0}], note?: string}`; không nhận giá/tổng; không lặp toppingId.
6. **Response thành công:** `201 {data: InvoiceDetailDto}` sau cập nhật.
7. **Lỗi:** `409 INVOICE_NOT_OPEN/SHIFT_NOT_OPEN/ITEM_NOT_AVAILABLE`; `422 TOPPING_NOT_ALLOWED/VALIDATION_ERROR`; `404 NOT_FOUND`.
8. **Ghi chú xử lý:** khóa hóa đơn, nạp giá trong transaction, tạo snapshot và dòng mới, SUM subtotal từ DB, kiểm trần tiền, commit nguyên tử.
9. **Ví dụ:** `{ "productSizeId": "<uuid>", "quantity": 2, "toppings": [] }` → `201` với một item mới.
10. **Kiểm thử cần có:** S6-04/05, mỗi lần thêm là dòng mới, đổi giá, concurrent adds.

### PATCH /api/v1/invoice-items/{id}

1. **Mô tả:** Sửa số lượng hoặc ghi chú dòng của đơn OPEN.
2. **Quyền:** `pos.sell` và ca CASHIER OPEN cùng branch đơn.
3. **Phạm vi:** nạp item → invoice, kiểm store/branch; không nhận branchId.
4. **Business rule:** BR-22–25, BR-80, BR-90.
5. **Request:** path item `id`; body `{quantity?: integer>0, note?: string|null}` với ít nhất một field; không sửa topping/đơn giá trong Sprint 6.
6. **Response thành công:** `200 {data: InvoiceDetailDto}`.
7. **Lỗi:** `409 INVOICE_NOT_OPEN/SHIFT_NOT_OPEN`; `422 VALIDATION_ERROR`; `404 NOT_FOUND`.
8. **Ghi chú xử lý:** khóa hóa đơn, giữ đơn giá/topping snapshot, tính lại line/subtotal trong transaction.
9. **Ví dụ:** `{ "quantity": 3 }` → `200` với lineTotal tính lại từ snapshot.
10. **Kiểm thử cần có:** S6-04/05; quantity 0 bị từ chối, không tự xóa.

### DELETE /api/v1/invoice-items/{id}

1. **Mô tả:** Xóa một dòng khỏi đơn OPEN, không xóa hóa đơn.
2. **Quyền:** `pos.sell` và ca CASHIER OPEN cùng branch.
3. **Phạm vi:** nạp item → invoice, kiểm store/branch.
4. **Business rule:** BR-22, BR-80, BR-90.
5. **Request:** path item `id`; không body.
6. **Response thành công:** `204` không body; UI GET lại đơn sau khi thành công.
7. **Lỗi:** `409 INVOICE_NOT_OPEN/SHIFT_NOT_OPEN`; `404 NOT_FOUND`.
8. **Ghi chú xử lý:** khóa hóa đơn, xóa dòng/topping của đơn OPEN, SUM lại subtotal; hóa đơn rỗng vẫn OPEN.
9. **Ví dụ:** `DELETE /invoice-items/{id}` → `204`.
10. **Kiểm thử cần có:** S6-04/05; xóa dòng cuối, DB trước/sau.

### POST /api/v1/invoices/{id}/transfer-table

1. **Mô tả:** Chuyển đơn DINE_IN OPEN sang bàn trống cùng branch.
2. **Quyền:** `pos.sell` và ca CASHIER OPEN cùng branch.
3. **Phạm vi:** bàn đích cùng store/branch đơn và đang hoạt động.
4. **Business rule:** BR-69, BR-74, BR-92, BR-95.
5. **Request:** path invoice `id`; body `{tableId: uuid}`; không nhận branchId.
6. **Response thành công:** `200 {data: InvoiceDetailDto}`.
7. **Lỗi:** `409 INVOICE_NOT_OPEN/TABLE_HAS_OPEN_INVOICE/TABLE_INACTIVE/SHIFT_NOT_OPEN`; `422 INVOICE_BRANCH_MISMATCH/VALIDATION_ERROR`; `404 NOT_FOUND`.
8. **Ghi chú xử lý:** transaction khóa đơn; unique index quyết định race bàn đích; không đổi item/tổng/ca/mã đơn.
9. **Ví dụ:** `{ "tableId": "<uuid>" }` → `200`, tableId mới.
10. **Kiểm thử cần có:** S6-07, bàn bận/sai branch, hai lần chuyển đồng thời.

### POST /api/v1/invoices/{id}/cancel

1. **Mô tả:** Hủy đơn OPEN và giải phóng bàn; hủy PAID thuộc PB-11.
2. **Quyền:** `invoice.cancel_open` và ca CASHIER OPEN cùng branch.
3. **Phạm vi:** invoice cùng store/branch người gọi.
4. **Business rule:** BR-21–22, BR-28, BR-80, BR-99.
5. **Request:** path invoice `id`; body `{reason: string}` không rỗng, tối đa 255 ký tự.
6. **Response thành công:** `200 {data: InvoiceDetailDto}` với `status=CANCELLED`, `cancelReason`, `cancelledAt`.
7. **Lỗi:** `422 CANCEL_REASON_REQUIRED/VALIDATION_ERROR`; `409 INVOICE_NOT_OPEN/SHIFT_NOT_OPEN`; `404 NOT_FOUND`.
8. **Ghi chú xử lý:** transaction khóa đơn; giữ item snapshot, không tạo payment/stock movement; bàn trống do không còn đơn OPEN.
9. **Ví dụ:** `{ "reason": "Khách đổi ý" }` → `200`, `status=CANCELLED`.
10. **Kiểm thử cần có:** S6-08; hủy rồi thêm món/đóng ca/tạo đơn mới tại bàn.

## Tích hợp đóng ca

`POST /work-shifts/{id}/close` và `force-close` kiểm `invoices` còn OPEN trong cùng ca trước khi đóng. Nếu có, trả `409 SHIFT_HAS_OPEN_INVOICES` và danh sách `invoiceCode` trong `details` theo api-spec. Không thay đổi ca/đối soát nếu bị từ chối.

## Nghiệm thu và bằng chứng

AC-1..AC-8 trong task PB-07 đối chiếu lần lượt S6-01..S6-08. Product Owner ngày 06/11/2026 bổ sung S6-09 riêng cho chặn đóng ca khi còn đơn OPEN; task bổ sung AC-9 đối chiếu S6-09. Mỗi vế cần test API/DB và artifact browser nếu có UI; test runner output gốc, request/response đã che và DB trước/sau theo `AGENTS.md`. QA task chỉ kết luận AC, QA sprint kết luận S6 riêng. Test dùng Postgres local/test đã xác nhận; không chạm production.
