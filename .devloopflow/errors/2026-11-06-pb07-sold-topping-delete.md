# Trạng thái: Đã sửa; test local, QA task và QA sprint liên quan PASS

- Task: `tasks/completed/2026-11-06-pb07-open-orders.md`; plan: `plans/completed/2026-11-06-sprint-06-open-orders.md`; regression menu liên quan AC-4.
- Triệu chứng: Sau khi topping đã được thêm vào đơn và gỡ liên kết danh mục, API xóa topping có thể trả 500 do FK mới.
- Bước tái hiện: Trên DB thử, tạo món/topping, thêm topping vào invoice, xóa dòng `category_toppings`, gọi `MenuService.deleteTopping`. Test nằm trong `POS_API/src/sales/tests/sales.integration.test.ts`.
- Nguyên nhân: Đã xác minh bằng schema migration và test: `invoice_item_toppings.topping_id` tham chiếu `toppings`; `MenuService.deleteTopping` trước fix chỉ kiểm `category_toppings` và không đổi lỗi FK `23503` thành `RESOURCE_IN_USE`.
- Cách sửa: Dùng `withConstraintHandling` sẵn có quanh thao tác xóa topping trong `POS_API/src/menu/menu.service.ts`.
- Kiểm chứng: Test integration trả `RESOURCE_IN_USE`, toàn bộ backend 68/68 trên sandbox, `qa-evidence/20261106-174110-91cf4a1-pb07-review1-green/backend-test.log.gz`.
- QA task: đối chiếu tình huống và artifact gốc tại qa-evidence/20261106-175111-91cf4a1-pb07-qa/report.md; đây là PASS cấp task trên sandbox local. QA cấp sprint riêng sau đó kết luận các tiêu chí S6 liên quan PASS local tại qa-evidence/20261107-001400-91cf4a1-sprint06-qa/report.md.
