# Kế hoạch triển khai Sprint 6 — PB-07 và UI PB-13

**Trạng thái:** Hoàn tất triển khai PB-07 và QA task ngày 07/11/2026; QA cấp sprint sau đó S6-01..09 PASS và Sprint 6 đã nghiệm thu/đóng local theo yêu cầu Product Owner ngày 07/11/2026. **Nhánh:** `feat/pb07-open-orders`. **Sprint:** [Sprint 6](../../sprints/sprint-06/SPRINT.md). **Task:** [PB-07](../../tasks/completed/2026-11-06-pb07-open-orders.md). **HEAD nền:** `91cf4a1`, working tree chưa commit.

## Bối cảnh, mục tiêu và phạm vi

Sprint 5 đã có ca CASHIER thật; POS hiện còn mock, chưa có spec hay bảng/API hóa đơn. Mục tiêu: tạo và quản lý đơn `OPEN` tại bàn/mang đi qua PostgreSQL/API/UI thật, thêm/sửa/xóa món với snapshot giá, chuyển bàn, hủy đơn `OPEN`, và chặn đóng ca khi còn đơn mở. Thanh toán, giảm giá, trừ kho, hủy đơn `PAID` ngoài Sprint 6. Lịch 06–12/11/2026.

Quyết định Product Owner: thu ngân/OWNER có ca CASHIER của chính mình đang mở thao tác đơn; quản lý không giữ ca chỉ xem. POS thật ẩn thanh toán/khuyến mãi mock; thêm danh sách đơn OPEN để tìm lại mang đi sau reload. Sprint gồm BR-92 và BR-28. Nguồn: Sprint 6, Product Backlog, Business Rules, thiết kế DB, api-spec và plan người dùng vừa duyệt.

## Thứ tự triển khai và kết quả cần đạt

1. Chốt `specs/sales.md` theo `create-pos-spec`: request/response, quyền, lỗi, transaction, UI và AC; nếu xuất hiện mâu thuẫn với tài liệu nguồn thì dừng phần phụ thuộc và hỏi Product Owner.
2. TDD migration/entities cho invoices, items, toppings và permissions; kiểm ràng buộc một đơn OPEN/bàn, mã hóa đơn, branch/shift/table cùng chi nhánh, tiền bigint.
3. TDD API tạo/đọc/liệt kê đơn; thêm/sửa/xóa dòng; chuyển bàn, hủy đơn OPEN; kiểm transaction, khóa hóa đơn, tenant/branch và lỗi cạnh tranh.
4. TDD chặn đóng ca thường/cưỡng chế khi còn đơn OPEN; kiểm danh sách mã đơn trong lỗi theo api-spec.
5. Nối POS UI thật: menu, bàn, đơn OPEN, danh sách để tìm lại mang đi, thêm/sửa/xóa món, chuyển bàn/hủy đơn; ngăn mock payment/promotion trên đơn thật và chống trộn phiên/chi nhánh.
6. Chạy test/build cấu hình trong repo; review code tối đa 3 vòng rồi QA task trên sandbox theo `implement`; QA cấp sprint riêng sau khi task AC PASS. Cập nhật Graphify sau code/Markdown, lưu bằng chứng, giữ task/plan active cho đến PASS.

## Tiêu chí hoàn thành

S6-01..S6-09 có AC task tương ứng và bằng chứng API/DB/UI trên bản cuối; test liên quan xanh, review không còn finding trong phạm vi, QA task tự chạy và kết luận từng AC PASS. S6-09 được Product Owner chốt bổ sung ngày 06/11/2026 cho quy tắc chặn đóng ca còn đơn OPEN. QA cấp sprint mới được kết luận Sprint PASS. Không tự đóng sprint hoặc push.

## Rủi ro và quyết định kỹ thuật

- Test integration tạo DB thử rồi DROP; xác nhận `DATABASE_URL` local/test trước khi chạy, không in giá trị. Nếu không xác nhận được thì BLOCKED, không chạy.
- UI demo đang dùng kiểu dữ liệu và mã đơn cũ; service thật phải dùng DTO API và không ghi vào mockStorage. Các màn ngoài lát cắt PB-07 tiếp tục được nhận diện là demo.
- Repo đang có tài liệu Sprint 6 và task tạo sprint chưa commit; không khôi phục hoặc đè chúng. Chỉ thay file thuộc phạm vi plan.

## Kết quả và đối chiếu hoàn thành

1. Spec `specs/sales.md` được chốt theo quyết định Product Owner, có quyền, endpoint, lỗi và nghiệm thu. Migration/API cho hóa đơn OPEN, dòng món, chuyển bàn, hủy đơn và chặn đóng ca đã triển khai. POS UI dùng API thật cho lát cắt này.
2. TDD trên PostgreSQL sandbox: backend `npm test` 68/68, UI `npm test` 39/39, UI `npm run build` exit 0. Log độc lập của QA và lệnh/môi trường ở [run.md](../../qa-evidence/20261106-175111-91cf4a1-pb07-qa/run.md). Lượt đầu test đỏ, sửa và review được ghi chi tiết trong task và `qa-evidence/`.
3. Code-reviewer chạy 3 vòng; 5 finding trong phạm vi đã sửa và có hồ sơ ở `errors/2026-11-06-pb07-*.md`; vòng 3 không còn finding. QA task tự chạy API/browser/DB, đối chiếu từng vế AC-1..9 và kết luận PASS cấp task trong [report.md](../../qa-evidence/20261106-175111-91cf4a1-pb07-qa/report.md). Agent chính đã mở lại file, kiểm tra liên kết, log test và artifact tình huống.
4. Tại thời điểm hoàn tất task PB-07, Sprint 6 còn QA cấp sprint và Sprint Review; kết quả task riêng không thay nghiệm thu sprint. Sau đó QA cấp sprint độc lập đã kết luận S6-01..09 PASS local theo [report](../../qa-evidence/20261107-001400-91cf4a1-sprint06-qa/report.md) và [run](../../qa-evidence/20261107-001400-91cf4a1-sprint06-qa/run.md). Product Owner yêu cầu hoàn tất sprint ngày 07/11/2026; kết luận đóng và giới hạn ở [Sprint 6](../../sprints/sprint-06/SPRINT.md). Working tree vẫn dirty, chưa commit/push, CI/merge/production chưa xác minh.
