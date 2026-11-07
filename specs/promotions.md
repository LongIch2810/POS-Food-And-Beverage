# PB-08a — cấu hình khuyến mãi MVP

**Trạng thái:** Đã chốt theo xác nhận Product Owner ngày 07/11/2026 trước TDD. **Sprint:** [S7-05..S7-07](../sprints/sprint-07/SPRINT.md). **Nguồn:** [BR](../docs/BUSINESS_RULES.md) BR-36..41, BR-80..81; [DB](../docs/DESIGN_DB_POS_SYSTEM.md) `promotion_codes`; [API](../docs/api-spec.md); [plan](../plans/completed/2026-11-07-sprint-07-inventory-promotions.md).

## Mục tiêu và phạm vi

OWNER/MANAGER cấu hình và xem mã giảm giá trong store; backend kiểm điều kiện và tính số tiền giảm làm nền cho PB-09. UI quản lý mã ở Cài đặt dùng API thật. Sprint 07 không áp mã lên hóa đơn, không tạo `invoice_promotion_codes`, không tăng/giảm `used_count`, không nhận giảm tay, không thanh toán.

## Quyết định và điểm cần chốt

- Product Owner đã chọn: code trim + uppercase, duy nhất không phân biệt hoa thường trong store; PERCENT là số nguyên 1..100; phép chia phần trăm làm tròn xuống đồng; sau khi `used_count>0`, chỉ sửa `name`/`isActive`, không sửa code hay điều kiện giảm.
- Product Owner đã chốt: PERCENT `maxDiscountAmount` có thể null (không trần) hoặc số nguyên dương; FIXED không dùng trần. `minOrderAmount` null = 0; `usageLimit` null = không giới hạn, nếu có phải là số nguyên dương. `discountValue` FIXED là VND nguyên dương, không vượt trần tiền BR-103. `startAt/endAt` ISO UTC, `endAt>startAt`; khoảng áp dụng gồm cả đầu/cuối theo BR-36. Payload, quyền/route/lỗi dưới đây đã chốt.

## Luồng, quyền và dữ liệu

1. Store ID lấy từ phiên. OWNER/MANAGER có `promotion.manage` được list/tạo/sửa mã của store mình; PLATFORM_ADMIN/CASHIER bị chặn. Không nhận storeId từ client. ID store khác trả 404.
2. Tạo mã chưa dùng đặt `usedCount=0` bởi server. Đọc mã đã hết hạn/ngưng dùng vẫn cho người quản lý xem để quản trị. `isActive=false` ngăn áp mã theo BR-36; chức năng áp thuộc PB-09.
3. Hàm backend nội bộ `evaluatePromotion(promotion, subtotal, now)` kiểm active, thời gian, subtotal tối thiểu và usage limit; trả lý do không hợp lệ hoặc tiền giảm. PERCENT tính `floor(subtotal*discountValue/100)`, áp trần nếu có, cuối cùng chặn `<=subtotal`; FIXED lấy `min(discountValue,subtotal)`. Không có endpoint kiểm mã cho hóa đơn trong Sprint 07.
4. UI Cài đặt có danh sách mã, form tạo/sửa, bật/tắt, loading/lỗi tiếng Việt. Không hiển thị luồng nhập mã trên POS thật khi PB-09 chưa có; sau reload/đổi phiên dữ liệu được tải lại theo store/identity.

## DTO và lỗi chung

- `PromotionDto`: `{id,code,name,discountType,discountValue,maxDiscountAmount,minOrderAmount,startAt,endAt,usageLimit,usedCount,isActive,createdAt,updatedAt}`. Tiền JSON number an toàn; nullable trả null, thời gian ISO UTC. `usedCount` chỉ đọc.
- Response `{data}` hoặc `{data,meta}`; danh sách cursor theo api-spec. Lỗi chung `401 UNAUTHENTICATED`, `403 PERMISSION_DENIED`, `404 NOT_FOUND`, `422 VALIDATION_ERROR`. `409 DUPLICATE_PROMOTION_CODE` khi code trùng; `409 PROMOTION_ALREADY_USED` khi sửa field đã khóa.

## Endpoint

### GET /api/v1/promotion-codes

1. **Mô tả:** Liệt kê mã trong store, kể cả inactive/hết hạn để quản lý. 2. **Quyền:** `promotion.manage` OWNER/MANAGER. 3. **Phạm vi:** store phiên. 4. **BR:** BR-36, BR-80..81. 5. **Request:** `limit,cursor,isActive?,q?`, sort mặc định `-createdAt,id`; không body. 6. **Thành công:** `200 {data:PromotionDto[],meta}`. 7. **Lỗi:** 403 thiếu quyền, 422 query sai. 8. **Xử lý:** tenant filter trước phân trang, không thay usedCount. 9. **Ví dụ:** `GET /promotion-codes?isActive=true&limit=20` → mã store hiện hành. 10. **Test:** OWNER/MANAGER, CASHIER/PLATFORM_ADMIN, hai store, cursor.

### POST /api/v1/promotion-codes

1. **Mô tả:** Tạo mã. 2. **Quyền:** `promotion.manage`. 3. **Phạm vi:** store phiên, không nhận storeId. 4. **BR:** BR-36..38, BR-80. 5. **Request:** `{code:string 1..50 sau trim,name?:string|null,discountType:'PERCENT'|'FIXED',discountValue:integer>0,maxDiscountAmount?:integer>0|null,minOrderAmount?:integer>=0|null,startAt:ISO-UTC,endAt:ISO-UTC,usageLimit?:integer>0|null,isActive?:boolean}`; PERCENT 1..100; FIXED không nhận maxDiscountAmount khác null; không nhận usedCount. 6. **Thành công:** `201 {data:PromotionDto}`, usedCount=0. 7. **Lỗi:** 409 `DUPLICATE_PROMOTION_CODE`, 422 validation/thời hạn sai. 8. **Xử lý:** code chuẩn uppercase, unique theo store; không tác động hóa đơn. 9. **Ví dụ:** `{ "code":"SAVE10", "discountType":"PERCENT", "discountValue":10, "maxDiscountAmount":50000, "startAt":"2026-11-13T00:00:00Z", "endAt":"2026-11-20T00:00:00Z" }` → 201. 10. **Test:** trùng hoa/thường, thời gian, type/giá trị/cap, hai store.

### PATCH /api/v1/promotion-codes/{id}

1. **Mô tả:** Sửa cấu hình hoặc bật/tắt. 2. **Quyền:** `promotion.manage`. 3. **Phạm vi:** ID cùng store. 4. **BR:** BR-36..39, BR-80. 5. **Request:** subset field của POST, ít nhất một field; không nhận usedCount. Nếu usedCount>0 chỉ nhận `name`, `isActive`. 6. **Thành công:** `200 {data:PromotionDto}`. 7. **Lỗi:** 404 ngoài store, 409 `DUPLICATE_PROMOTION_CODE/PROMOTION_ALREADY_USED`, 422 validation. 8. **Xử lý:** khóa mã trong transaction, dùng usedCount hiện hành để kiểm quyền sửa; không thay lịch sử. 9. **Ví dụ:** `{ "isActive":false }` → 200; áp mã sau này bị chặn. 10. **Test:** sửa trước/sau usedCount, race, store khác, bật/tắt.

## Hàm tính và nghiệm thu

- Kiểm BR-36 ở mốc `startAt` và `endAt` (bao gồm), trước/sau mốc, subtotal vừa bằng ngưỡng, usedCount vừa chạm usageLimit, inactive; đầu ra không hợp lệ không tạo side effect.
- Kiểm BR-37/38: PERCENT có/không trần, phần lẻ đồng làm tròn xuống, FIXED lớn hơn subtotal, tiền giảm không âm/không vượt subtotal. Dùng integer/bigint an toàn, kiểm BR-103 trước JSON output.
- **AC-5/S7-05:** API/DB quản lý mã, unique trong store, quyền/tenant, input biên và khóa sửa sau dùng.
- **AC-6/S7-06:** test hàm eligibility/discount, không giảm tay; không kết luận thanh toán hoặc usedCount tăng là PASS ở Sprint 07.
- **AC-7/S7-07 phần Khuyến mãi:** browser UI cuối + network + DB trước/sau tạo/sửa/bật tắt, reload/đổi phiên; không dùng mock.
