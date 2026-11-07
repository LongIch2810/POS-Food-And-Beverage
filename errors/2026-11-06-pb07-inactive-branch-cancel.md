# Trạng thái: Đã sửa; test local, QA task và QA sprint liên quan PASS

- Task: `tasks/completed/2026-11-06-pb07-open-orders.md`; plan: `plans/completed/2026-11-06-sprint-06-open-orders.md`; AC-8, S6-08, BR-28/BR-76.
- Triệu chứng: OWNER ngưng chi nhánh khi còn đơn OPEN làm `cancel` trả `BRANCH_INACTIVE`; đóng ca lại bị `SHIFT_HAS_OPEN_INVOICES`, khiến đơn/ca mắc kẹt.
- Bước tái hiện: Tạo đơn OPEN ở chi nhánh active trên DB thử, cập nhật branch inactive, hủy đơn rồi thử tạo đơn mới. Test tại `POS_API/src/sales/tests/sales.integration.test.ts`.
- Nguyên nhân: Đã xác minh qua source và BR-76: kiểm `is_active` nằm trong `shift()`, được gọi cả khi hủy đơn hiện có, trong khi BR-76 chỉ cấm tạo đơn mới.
- Cách sửa: Dời kiểm active branch sang `create()`; giữ hủy đơn cũ hoạt động tại `POS_API/src/sales/sales.service.ts`.
- Kiểm chứng: Test integration hủy đơn cũ thành công và tạo mới bị `BRANCH_INACTIVE`; backend 68/68, `qa-evidence/20261106-174110-91cf4a1-pb07-review1-green/backend-test.log.gz`.
- QA task: đối chiếu tình huống và artifact gốc tại qa-evidence/20261106-175111-91cf4a1-pb07-qa/report.md; đây là PASS cấp task trên sandbox local. QA cấp sprint riêng sau đó kết luận các tiêu chí S6 liên quan PASS local tại qa-evidence/20261107-001400-91cf4a1-sprint06-qa/report.md.
