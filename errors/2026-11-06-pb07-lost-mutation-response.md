# Trạng thái: Đã sửa; test local, QA task và QA sprint liên quan PASS

- Task: `tasks/completed/2026-11-06-pb07-open-orders.md`; plan: `plans/completed/2026-11-06-sprint-06-open-orders.md`; AC-6, S6-06.
- Triệu chứng: Server lưu món nhưng client mất phản hồi; POS chỉ tải lại summary, chi tiết đơn vẫn cũ và có thể cho thu ngân thêm lại dòng trùng.
- Bước tái hiện: Mock `addItem` lưu rồi ném lỗi mạng trong test UI `POS_UI/test/shift-screen.test.mjs`; trước fix test `PB-07 lost add response reloads invoice detail before another write` FAIL do tổng chi tiết còn 0.
- Nguyên nhân: Đã xác minh bằng test đỏ và source: nhánh `catch` của `perform()` chỉ gọi `refreshOrders()` không truyền invoice ID, nên không GET lại detail.
- Cách sửa: Tải lại detail của đơn hiện tại sau lỗi mutation; nếu recovery thất bại thì khóa ghi cho đến khi người dùng tải lại thành công. `remove()` dùng cùng xử lý, tại `POS_UI/src/features/pos/LivePosScreen.tsx`.
- Kiểm chứng: UI `npm test` 39/39 và build đạt, `qa-evidence/20261106-174949-91cf4a1-pb07-ui-review2/`; reviewer vòng 3 không còn finding trong diff. QA task đã đối chiếu browser/network/DB.
- QA task: đối chiếu tình huống và artifact gốc tại qa-evidence/20261106-175111-91cf4a1-pb07-qa/report.md; đây là PASS cấp task trên sandbox local. QA cấp sprint riêng sau đó kết luận các tiêu chí S6 liên quan PASS local tại qa-evidence/20261107-001400-91cf4a1-sprint06-qa/report.md.
