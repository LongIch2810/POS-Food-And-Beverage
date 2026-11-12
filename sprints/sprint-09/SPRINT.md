# Sprint 09 — Chi từ két, hủy đơn đã thanh toán và màn Hóa đơn

**Trạng thái:** **Dự thảo planning, chờ Product Owner chốt.** Lập ngày 12/11/2026; chưa có spec, plan, code hay QA cho phạm vi này. Lịch dự kiến 12–18/11/2026 (ngày bắt đầu do user chọn, ngày kết thúc chờ xác nhận). Nguồn: [Product Backlog](../../docs/PRODUCT_BACKLOG.md) PB-10/PB-11/PB-13 và mục theo dõi sau Sprint 7; [Product Overview](../../docs/PRODUCT_OVERVIEW.md) mục 5, 6.2, 6.3; [Business Rules](../../docs/BUSINESS_RULES.md) mục 9, 11, 12, 17; [API convention](../../docs/api-spec.md).

## Cơ sở và quyết định phạm vi

- [Sprint 08](../sprint-08/SPRINT.md) đã đóng ngày 12/11/2026 với QA local S8-01..07 cho PB-09 thanh toán và UI thanh toán; đã có `PAID`, `payments`, ghi `SALE`, tăng lượt mã, đóng ca đếm mù cộng CASH `PAID` (R2-1) và MANAGER hủy đơn `OPEN` (AC-M1). Chưa có chi từ két, hủy đơn `PAID`, `SALE_REVERSAL` hay trả lượt mã.
- Người dùng chọn Sprint 09 gồm **PB-10 chi từ két và hoàn thiện đối soát**, **PB-11 hủy đơn `PAID`** và **lát cắt PB-13 UI Ca (chi phí) và màn Hóa đơn dùng API thật**, bắt đầu **12/11/2026**, và đặt việc tích hợp Git/CI mã Sprint 08 làm item đầu. PB-12 báo cáo phụ thuộc PB-11 nên thuộc sprint sau. Đây là quyết định planning; không suy ra code hoặc QA đã hoàn tất.
- Baseline lúc lập sprint: `master` tại `c710cf4`, working tree sạch. Mã Sprint 08 đã merge vào `master` qua PR #18; [CI trên `master`](https://github.com/LongIch2810/POS-Food-And-Beverage/actions/runs/43217314020) thành công ngày 12/11/2026. Câu "chưa commit/push/PR và CI" trong Sprint 08 đã lỗi thời; SePay Live và production vẫn chưa kiểm.
- `specs/shifts.md` và `specs/invoices.md` đã có nhưng chưa đặc tả chi từ két hay hủy đơn `PAID`. Đọc mã ngày 12/11/2026: `expense_amount` gán cứng `0` khi đóng ca và đóng cưỡng chế trong `POS_API/src/shifts/shifts.service.ts`; `POST /api/v1/invoices/:id/cancel` chỉ hủy đơn `OPEN`; `GET /api/v1/invoices` đã có nhưng màn Hóa đơn và `AddExpenseModal` của UI vẫn chạy trên `src/mock/`. Quyền/route/payload/lỗi và cạnh tranh dữ liệu phải chốt trong spec trước code.

## Sprint Goal

Thu ngân ghi chi từ két trong ca đang mở và đóng ca bằng đếm mù với tiền kỳ vọng đã trừ chi từ két. Quản lý hủy được đơn `PAID` của ca còn mở theo quyền và lý do: giữ nguyên lịch sử thanh toán, hoàn kho bằng dòng mới, trả lượt mã và giảm tiền kỳ vọng nếu là tiền mặt, trong một transaction. Màn Hóa đơn và phần chi phí của màn Ca dùng API thật, tiếng Việt, VND, tablet ngang.

## Sprint Backlog và thứ tự thực hiện

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Tích hợp Git/CI mã Sprint 08 | Xác nhận mã Sprint 08 nằm trên `master` và CI xanh trên commit đó; ghi HEAD/run CI làm baseline; sửa câu trạng thái lỗi thời ở Sprint 08, README và Product Backlog khi đồng bộ tài liệu. | Không | Đã đo baseline lúc lập sprint; chưa sửa tài liệu lỗi thời |
| 2 | Refinement PB-10 + PB-11 + PB-13 | Cập nhật `specs/shifts.md` và `specs/invoices.md`: bảng/API chi từ két, quyền, sửa/xóa khoản chi, công thức đối soát; hủy `PAID`: permission, route, thứ tự khóa và transaction, hoàn kho, trả lượt mã, tương tác với chuyển khoản QR/SePay; hợp đồng UI Hóa đơn. Lập AC task ↔ S9 và ma trận bằng chứng trước QA. | Đối chiếu BR, DB, API convention và code Sprint 08; giải quyết điểm mở ở cuối hồ sơ. | Chưa bắt đầu |
| 3 | PB-10 — DB/API chi từ két | Migration/entity/API `shift_expenses`; chỉ ghi khi ca `OPEN`; đóng ca và đóng cưỡng chế dùng tổng chi từ két thay vì `0`; snapshot không đổi sau đóng. | Spec và plan đã chốt; PostgreSQL sandbox. | Chưa bắt đầu |
| 4 | PB-11 — Hủy đơn `PAID` | API hủy đơn `PAID` theo BR-29: quyền quản lý, lý do bắt buộc, chỉ khi ca của đơn còn mở; giữ `payments`; ghi `SALE_REVERSAL`; trả lượt mã; tất cả trong một transaction, an toàn khi gọi đồng thời. | Spec và plan đã chốt. | Chưa bắt đầu |
| 5 | PB-13 — UI Ca (chi phí) và màn Hóa đơn | Bỏ mock cho chi từ két và màn Hóa đơn: danh sách/chi tiết hóa đơn theo phạm vi quyền, hủy đơn `PAID` có lý do và xác nhận, ghi/xem chi phí trong ca, kết quả đóng ca phản ánh chi phí. | API item 3–4 chạy đúng spec; kiểm trên UI cuối và đúng phiên. | Chưa bắt đầu |
| 6 | Review, QA task và QA cấp sprint | Review code; kiểm từng AC task và S9 bằng test/API/DB/browser, gồm rollback, đồng thời, quyền/store/branch, tồn/lượt mã/tiền kỳ vọng trước/sau; tạo commit để CI chạy đúng mã đã QA; lưu artifact gốc theo `AGENTS.md`, rồi Sprint Review riêng. | Các item đã triển khai; ma trận tiêu chí → tình huống → artifact có trước lượt chạy. | Chưa bắt đầu |

## Tiêu chí nghiệm thu cấp Sprint 09

Ô ☑ nghĩa là đã kiểm **từng vế** trên mã/UI cuối và mở lại artifact; ☐ là chưa. QA task không tự động thay thế QA cấp sprint.

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu | Nghiệm thu |
| --- | --- | --- | --- | --- |
| S9-01 | Người có quyền ghi khoản chi cho ca `CASHIER` đang `OPEN` cùng store/branch; `amount > 0`, trong trần tiền, `reason` bắt buộc; ca đã đóng, khác branch/store và `PLATFORM_ADMIN` bị chặn. | PB-10; BR-51..53, BR-80..81 | API quyền/validation; SELECT `shift_expenses` và ca trước/sau; test PostgreSQL. | ☐ |
| S9-02 | Đóng ca và đóng cưỡng chế tính `expected_cash = opening_cash + cash_sales_amount − expense_amount`, trong đó `expense_amount` chỉ gồm khoản `paid_from_drawer = true`; vẫn đếm mù; lệch bắt buộc ghi chú; snapshot không đổi sau đóng. | PB-10; BR-53..61; BR mục 17 | Test công thức có/không chi từ két; API đóng ca không trả tiền kỳ vọng trước khi nhập; DB reconciliation trước/sau. | ☐ |
| S9-03 | Chỉ người có quyền quản lý hủy được đơn `PAID` khi ca của đơn còn `OPEN`, cùng phạm vi store/branch, có lý do; đơn của ca đã đóng, đơn `CANCELLED`, người không đủ quyền và `PLATFORM_ADMIN` bị từ chối. | PB-11; BR-21, BR-29, BR-80..81 | API quyền/trạng thái theo vai trò thật qua HTTP; DB hóa đơn, ca trước/sau. | ☐ |
| S9-04 | Hủy đơn `PAID` trong một transaction: hóa đơn thành `CANCELLED`, `payments` giữ nguyên, mỗi nguyên liệu đã trừ có một `SALE_REVERSAL` ở branch hóa đơn, tồn bằng tổng movement, lượt mã giảm đúng một. Lỗi giữa chừng rollback toàn bộ; hai yêu cầu hủy đồng thời chỉ một lần ghi dữ liệu. | PB-11; BR-29, BR-39, BR-47 | Test rollback/đồng thời; DB invoice, payment, stock/movement, `used_count` trước/sau. | ☐ |
| S9-05 | Đơn `CASH` đã hủy không còn tính vào `cash_sales_amount` của ca nên tiền kỳ vọng giảm tương ứng; đơn chuyển khoản đã hủy không ảnh hưởng két và việc hoàn tiền ghi trong `cancel_reason`. | PB-10, PB-11; BR-29, BR-54, BR-56 | Test đóng ca sau khi hủy CASH/TRANSFER; DB reconciliation. | ☐ |
| S9-06 | UI dùng API thật trên tablet ngang, tiếng Việt, VND: ghi/xem chi phí trong ca; kết quả đóng ca phản ánh chi phí; màn Hóa đơn hiển thị danh sách/chi tiết theo phạm vi quyền và cho hủy đơn `PAID` khi được phép, có lý do và xác nhận; lỗi hiện tiếng Việt; reload hoặc đổi phiên không lộ dữ liệu phiên cũ. | PB-13; Product Overview mục 5 | Browser trên UI cuối: ảnh/snapshot trước/sau, network method/path/status đã che, DB trước/sau mutation, reload/đổi phiên. | ☐ |

## Ranh giới và dependency

- PB-12 (báo cáo doanh thu) và lát cắt UI Báo cáo để sprint sau theo dependency PB-11. PB-14 (VPS, backup, khôi phục) chưa vào sprint. Sprint 09 không kết luận những phần này đã hoàn tất.
- Hủy đơn của ca đã đóng và hoàn tiền một phần thuộc Giai đoạn 2 (BR-29). `IMPORT`/`WASTE`/`ADJUST` (BR-50) và nhật ký thao tác `audit_logs` (BR-67) thuộc Giai đoạn 2. Hoàn tiền chuyển khoản thực hiện ngoài hệ thống.
- SePay Live vẫn chưa kiểm; sprint này không thay đổi giới hạn đó.

## Điểm cần giải quyết trong refinement trước code

1. Quyền hủy đơn `PAID`: permission nào ứng với "quyền quản lý" trong BR-29; MANAGER có cần ca của mình đang mở như BR-28 không; OWNER không gắn branch có được hủy không.
2. Chi từ két: ai được ghi (chỉ thu ngân của ca hay cả MANAGER/OWNER); có cho sửa/xóa khoản chi khi ca còn mở không; khoản `paid_from_drawer = false` dùng vào việc gì ở MVP.
3. Hủy đơn chuyển khoản QR/SePay: xử lý khi đơn đã `PAID` qua SePay, khi tiền đến muộn sau khi hủy và cách ghi ngoại lệ.
4. Thứ tự khóa và xử lý đồng thời giữa hủy đơn `PAID`, ghi chi phí và đóng ca/đóng cưỡng chế để snapshot đối soát đúng.
5. Màn Hóa đơn: bộ lọc, phân trang và phạm vi hiển thị cho CASHIER/MANAGER/OWNER; `GET /api/v1/invoices` hiện có đủ chưa. Không tự suy từ UI demo.

## Theo dõi planning, QA và Review

- Quyết định planning: ngày 12/11/2026 người dùng chọn PB-10 + PB-11 + lát cắt PB-13 tương ứng, bắt đầu ngay và đặt tích hợp Git/CI Sprint 08 làm item đầu. Hồ sơ planning: [task lập Sprint 09](../../.devloopflow/tasks/completed/2026-11-12-create-sprint-09.md).
- Chưa có lệnh "chốt sprint": Sprint Goal, sáu item Sprint Backlog và S9-01..06 ở trên là dự thảo. Khi chốt không thay thế refinement spec và plan trước code; nếu spec phát hiện mâu thuẫn với S9, phải đưa ra quyết định phạm vi mới thay vì sửa ngầm.
- Khi bắt đầu triển khai, lập plan/task riêng, ghi branch/HEAD/dirty baseline và AC ↔ S9; lập ma trận AC ↔ artifact trước QA (cải tiến (1) và (6) của Retrospective Sprint 08).
- Chỉ tick S9 sau QA cấp sprint trên sandbox với artifact gốc đủ từng vế; ghi rõ local hay CI và phiên bản đã kiểm. Review/retrospective và quyết định đóng sprint là bước riêng sau QA.
