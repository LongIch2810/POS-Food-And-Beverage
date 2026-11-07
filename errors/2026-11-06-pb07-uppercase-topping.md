# Trạng thái: Đã sửa; test local, QA task và QA sprint liên quan PASS

- Task: `tasks/completed/2026-11-06-pb07-open-orders.md`; plan: `plans/completed/2026-11-06-sprint-06-open-orders.md`; AC-4/AC-5, S6-04/S6-05.
- Triệu chứng: `POST /invoices/{id}/items` với UUID topping hợp lệ viết hoa có thể trả 500 thay vì thêm món.
- Bước tái hiện: Trên DB thử, tạo menu/topping và đơn OPEN, gọi `SalesService.addItem` với `toppingId` ở dạng UUID viết hoa. Test thêm trong `POS_API/src/sales/tests/sales.integration.test.ts`; log đỏ `qa-evidence/20261106-170041-91cf4a1-pb07-backend-regression/review1-red.log.gz` có `Cannot read properties of undefined (reading 'quantity')`.
- Nguyên nhân: Đã xác minh bằng log đỏ và source: PostgreSQL trả UUID dạng chữ thường, trong khi `requested.find` so sánh chuỗi đúng chữ hoa/chữ thường nên không tìm được quantity.
- Cách sửa: Chuẩn hóa `toppingId` thành chữ thường trước khi kiểm trùng và ghép với hàng DB tại `POS_API/src/sales/sales.service.ts`.
- Kiểm chứng: Test integration cùng tình huống và toàn bộ backend 68/68, `qa-evidence/20261106-174110-91cf4a1-pb07-review1-green/backend-test.log.gz`.
- QA task: đối chiếu tình huống và artifact gốc tại qa-evidence/20261106-175111-91cf4a1-pb07-qa/report.md; đây là PASS cấp task trên sandbox local. QA cấp sprint riêng sau đó kết luận các tiêu chí S6 liên quan PASS local tại qa-evidence/20261107-001400-91cf4a1-sprint06-qa/report.md.
