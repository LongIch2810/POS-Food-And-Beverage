---
id: 20261112-sprint09-drawer-cancel-invoices
status: approved
approved_at: 2026-11-13
---

# Spec: Chi từ két và hủy đơn đã thanh toán (API, Sprint 09 — task A)

## Mục đích và lý do
- Hiện đóng ca luôn ghi `expense_amount = 0`, nên thu ngân chi tiền mặt từ két (mua đá, sửa quạt) làm tiền kỳ vọng lệch và ca báo thiếu/thừa sai (nguồn: `POS_API/src/shifts/shifts.service.ts:298,308,387,393`).
- Đơn đã `PAID` không hủy được; bán nhầm hoặc khách trả hàng phải xử lý ngoài hệ thống, kho và lượt mã không được hoàn (nguồn: `POS_API/src/sales/sales.service.ts:438-446`, `writable()` chỉ nhận `OPEN`).
- Làm ngay vì Sprint 09 đã chọn PB-10 + PB-11 (nguồn: `sprints/sprint-09/SPRINT.md`, mục "Cơ sở và quyết định phạm vi").

## Thành công trông như thế nào
- Thu ngân ghi khoản chi trong ca đang mở; đóng ca (thường và cưỡng chế) cho `expected_cash = opening_cash + cash_sales_amount − expense_amount`, trong đó `expense_amount` chỉ gồm khoản `paid_from_drawer = true`.
- OWNER/MANAGER hủy được đơn `PAID` của ca còn mở với lý do; `payments` giữ nguyên, kho có dòng `SALE_REVERSAL`, lượt mã giảm một, tiền kỳ vọng của đơn `CASH` giảm theo; tất cả hoặc không gì cả.

## Mục tiêu
- G1. Bảng và API ghi/xem chi từ két của ca (PB-10; S9-01).
- G2. Đóng ca và đóng cưỡng chế dùng tổng chi từ két thay `0`, vẫn đếm mù và lệch bắt buộc ghi chú (S9-02).
- G3. Hủy đơn `PAID` theo BR-29 với quyền, lý do, ca còn mở, phạm vi store/branch (S9-03).
- G4. Hủy đơn `PAID` trong một transaction: hoàn kho bằng dòng mới, trả lượt mã, rollback toàn bộ khi lỗi, an toàn khi gọi đồng thời (S9-04).
- G5. Đơn `CASH` đã hủy rời khỏi `cash_sales_amount`; đơn chuyển khoản hủy không ảnh hưởng két (S9-05).

## Phi mục tiêu (cố ý không làm)
- UI màn Hóa đơn và UI chi phí trong ca (task B, spec riêng; S9-06).
- Sửa/xóa khoản chi; hủy đơn của ca đã đóng; hoàn tiền một phần; `IMPORT`/`WASTE`/`ADJUST`; `audit_logs` (nguồn: `docs/BUSINESS_RULES.md` BR-29 dòng 150 cho hủy đơn ca đã đóng và hoàn tiền một phần; BR-50 dòng 191 cho `IMPORT`/`WASTE`/`ADJUST`; sửa/xóa khoản chi: user chọn MVP chỉ thêm và xem; `sprints/sprint-09/SPRINT.md` mục "Ranh giới").
- Báo cáo doanh thu (PB-12), VPS/backup (PB-14), SePay Live.
- Item 1 của sprint (sửa câu trạng thái lỗi thời): làm ở bước `sync-docs` cuối task, không phải chức năng.

## Phản mục tiêu (làm ra mà vẫn bị coi là thất bại)
- Trả `expected_cash` hoặc `difference` cho thu ngân trước khi nhập `counted_cash` (BR-58).
- Snapshot đối soát đổi sau khi ca đóng (BR-61), hoặc đóng ca đọc tổng chi lệch với khoản chi vừa ghi do chạy đồng thời.
- Sửa/xóa dòng `payments` hoặc dòng `SALE`/`stock_movements` cũ; hủy `PAID` ghi dở (hóa đơn `CANCELLED` mà kho chưa hoàn, hoặc ngược lại).
- Hủy trừ hai lần lượt mã, hoặc hai yêu cầu hủy đồng thời cùng ghi dữ liệu.
- `PLATFORM_ADMIN` hoặc người khác store/branch chạm được dữ liệu (BR-80, BR-81).

## Hiện trạng
- `shift_expenses` chỉ có trong thiết kế: `id`, `work_shift_id`, `amount bigint CHECK > 0`, `reason varchar(255) NOT NULL`, `paid_from_drawer boolean NOT NULL DEFAULT true`, `created_by`, `created_at`, `updated_at`; index `shift_expenses (work_shift_id)` (nguồn: `docs/DESIGN_DB_POS_SYSTEM.md:494-504,679`). Chưa có migration/entity/route trong `POS_API/src`.
- `cash_reconciliations.expense_amount` đã có cột, hằng số `0` (nguồn: `POS_API/src/database/migrations/20261103000000-Shifts.ts:36`, `shifts.service.ts`).
- Hủy `OPEN`: `POST /api/v1/invoices/:id/cancel`, quyền `invoice.cancel_open`, thân `{ reason }`; `writable()` yêu cầu người gọi có ca thu ngân `OPEN` và đơn thuộc đúng ca đó (nguồn: `sales.controller.ts:51-56`, `sales.service.ts:162-170`).
- Thanh toán xong (`finalizeInvoice`) tăng `promotion_codes.used_count` và ghi `SALE` âm; trigger `stock_movements_apply` tự tính tồn và `balance_after`, trigger `stock_movements_append_only` cấm sửa/xóa (nguồn: `sales.service.ts:299-324`, `20261107000000-InventoryPromotions.ts:68-75`).
- Mã lỗi đã có: `CANCEL_REASON_REQUIRED` 422, `CANCEL_NOT_ALLOWED` 409 ("Hủy đơn `PAID` khi ca đã đóng"), `EXPENSE_REASON_REQUIRED` 422, `SHIFT_CLOSED` 409, `INVOICE_NOT_OPEN` 409, `PERMISSION_DENIED` 403, `VALIDATION_ERROR` 422 (nguồn: `docs/api-spec.md:321-375`; `sales.service.ts:16`).
- Ma trận quyền: hủy đơn đã thanh toán — OWNER Có, MANAGER Có, CASHIER Không (nguồn: `docs/BUSINESS_RULES.md:229`).

## Ràng buộc
- Tiền là số nguyên `bigint` VND, trần `1.000.000.000.000` như `MAX_MONEY` hiện có (nguồn: `sales.service.ts:11`).
- Quy ước API: base `/api/v1`, envelope `{ data }`/`{ error }`, `message` tiếng Việt, mutation cần CSRF + `Origin` (nguồn: `docs/api-spec.md`, `AGENTS.md`).
- `store_id` lấy từ token; mọi ID tham chiếu cùng store; không có `branch.access_all` chỉ chi nhánh mình (BR-80; M-1 phải kiểm ở mọi điểm vào).
- Migration chỉ thêm mới, không dùng `schema:sync` (nguồn: `AGENTS.md`, `rules/database.md`).
- Khóa dòng: chỉ khóa dòng gốc bằng câu riêng rồi đọc quan hệ ở câu sau, không `FOR UPDATE` trên nullable side của `LEFT JOIN` (M-14, M-20). `UPDATE … RETURNING` qua `manager.query` trả `[rows, rowCount]` (M-21). Tài khoản test dùng UUID chuẩn v4 (M-19). Kiểm UUID viết hoa/thường khi so ID (M-15).
- Quyền kiểm bằng HTTP với vai trò thật, gồm ca thiếu điều kiện và sai phạm vi (M-10). `DELETE` không có thân nên không áp dụng; route mới chỉ `POST`/`GET`.

## Các phần cách làm user đã quyết
- Tách hai task: A (task này) = PB-10 + PB-11 phần API; B = UI (màn Hóa đơn + chi phí trong ca) làm sau, spec riêng. Item 1 làm bằng `sync-docs` cuối task. (user: "đồng ý hết")
- Quyền hủy `PAID`: permission mới `invoice.cancel_paid` cấp OWNER và MANAGER. OWNER và MANAGER đều không cần ca riêng của mình, chỉ cần ca của đơn còn `OPEN` và đơn thuộc phạm vi của người gọi (MANAGER: chi nhánh mình; OWNER: theo `branch.access_all`). (user xác nhận 2026-11-13: "Manager ko cần bật ca riêng")
- Tiền kỳ vọng không được âm (giữ `CHECK expected_cash >= 0` của `20261103000000-Shifts.ts:36`): ghi chi bị từ chối nếu sau khoản chi tiền kỳ vọng hiện tại < 0 → `422 EXPENSE_EXCEEDS_DRAWER` (mã mới); hủy đơn `CASH` bị từ chối nếu sau hủy tiền kỳ vọng < 0 → `409 CANCEL_EXCEEDS_DRAWER` (mã mới); cả hai kiểm dưới khóa ca. (user: "ok duyệt")
- Ghi chi vào ca không hợp lệ: ca không tồn tại hoặc khác store/branch → `404 SHIFT_NOT_FOUND`; ca của người khác → `403 FORBIDDEN_NOT_SHIFT_OWNER`; ca `STAFF` → `409 CONFLICT` ("Ca này không có két"). (user: "ok duyệt")
- Chi từ két: permission mới `shift.expense` cấp CASHIER, MANAGER, OWNER; chỉ ghi vào ca `CASHIER` `OPEN` của chính người gọi. (user: "đồng ý hết")
- Khoản chi chỉ thêm và xem, không sửa/xóa; ghi nhầm thì thêm khoản bù. Khoản `paid_from_drawer = false` vẫn lưu và hiển thị, không trừ két. (user: "đồng ý hết")
- Hủy đơn `TRANSFER` đã `PAID` cho phép; hoàn tiền ngoài hệ thống, ghi trong `cancel_reason`; luồng tiền SePay đến muộn (`INVOICE_NOT_OPEN`) giữ nguyên. (user: "đồng ý hết")
- Không thêm cột mới cho tiền kỳ vọng: đơn `CANCELLED` tự rơi khỏi `cash_sales_amount` vì công thức chỉ tính hóa đơn `PAID`. (user: "đồng ý hết")
- Thứ tự khóa: ca → hóa đơn → mã khuyến mãi → tồn kho; ghi chi phí, hủy `PAID`, đóng ca/đóng cưỡng chế đều khóa dòng ca trước. (user: "đồng ý hết")
- Màn Hóa đơn dùng `GET /api/v1/invoices` hiện có; bộ lọc/phân trang thiếu thì chốt ở spec task B. (user: "đồng ý hết")
- Ưu tiên lỗi của `POST /invoices/{id}/cancel` đổi: đơn được đọc theo phạm vi store/branch trước mọi kiểm tra ca. Người gọi ngoài phạm vi (khác chi nhánh khi không có `branch.access_all`, hoặc khác store) nhận `404 NOT_FOUND` "Không tìm thấy hóa đơn." thay vì `409 SHIFT_NOT_OPEN` như hiện nay (áp cho cả nhánh `OPEN`). (user: "404 NOT_FOUND vậy cái này phải sửa lại trong spec còn lại tất cả duyệt", 2026-11-13)
- Mã lỗi: chi vào ca đã đóng → `SHIFT_CLOSED` 409; hủy `PAID` khi ca đã đóng → `CANCEL_NOT_ALLOWED` 409; thiếu lý do chi → `EXPENSE_REASON_REQUIRED` 422; thiếu lý do hủy → `CANCEL_REASON_REQUIRED` 422. (user: "đồng ý hết")

## Quyết định của agent (user kiểm khi đọc)
- Hợp đồng chi phí: `POST /api/v1/work-shifts/{id}/expenses` thân `{ amount, reason, paidFromDrawer }` (`paidFromDrawer` mặc định `true`, `reason` ≤ 255 ký tự sau trim) trả `201` với `{ data: { id, workShiftId, amount, reason, paidFromDrawer, createdBy, createdAt } }`; `GET /api/v1/work-shifts/{id}/expenses` trả danh sách theo `docs/api-spec.md` (cursor, `sort=-createdAt`). Lý do: route lồng đã ghi ở `docs/api-spec.md:47,159,485`.
- Quyền xem danh sách chi phí: `shift.read`, cùng phạm vi xem chi tiết ca. Lý do: không cần permission thứ ba.
- `amount ≤ 0`, không phải số nguyên hoặc vượt trần → `422 VALIDATION_ERROR` (mã đã có). Lý do: không thêm mã mới khi mã chung đủ nghĩa.
- Hủy `PAID` dùng lại `POST /api/v1/invoices/{id}/cancel` thân `{ reason }`: permission theo trạng thái đơn (`OPEN` → `invoice.cancel_open`, `PAID` → `invoice.cancel_paid`). Lý do: `docs/api-spec.md:456` đã ghi hủy `PAID` qua route này. Cách thực thi dưới quy tắc "một mã quyền mỗi route" để plan chọn.
- Đơn `PAID` tổng 0đ (BR-104, không có `payments`) cũng hủy được cùng quy tắc; không ảnh hưởng két. Lý do: BR-29 không loại trừ.
- Đơn đã `CANCELLED` (hoặc không còn `PAID`/`OPEN`) bị hủy lại → `409 INVOICE_NOT_OPEN` như hủy `OPEN` hiện nay (`sales.service.ts:165`); `CANCEL_NOT_ALLOWED` chỉ cho đơn `PAID` của ca đã đóng. Lý do: giữ mã cũ cho test hiện có; hai yêu cầu đồng thời thì chỉ một lần ghi dữ liệu, lần sau nhận lỗi.
- `POST` chi phí không dùng `Idempotency-Key` (`AGENTS.md` chỉ bắt thanh toán và đơn 0đ). Bấm đúp tạo hai khoản chi; khoản dư xử lý bằng khoản bù. Lý do: khớp quy ước dự án, tránh thêm cơ chế.
- `SALE_REVERSAL` tạo theo từng dòng `SALE` của đơn (không tính lại từ công thức món), chép `source = 'USER'` (nguồn: `sales.service.ts:318-322`; `SPRINT.md` S9-04).
- Nếu `used_count` đã là 0 khi cần trả lượt → `500 INTERNAL_ERROR` và rollback toàn bộ (dữ liệu hỏng, không che bằng `GREATEST`).
- Danh sách chi phí dùng đúng phạm vi branch của `getShiftDetail`.
- Hủy `PAID`: đọc đơn theo phạm vi store/branch trước, rồi mới kiểm quyền theo trạng thái (tránh lộ tồn tại đơn). Vì API nhận `id` đơn, chấp nhận đọc `work_shift_id` không khóa trước rồi khóa ca, khóa đơn và kiểm lại trạng thái; thứ tự khóa (ca → đơn → mã → tồn) giữ nguyên sau bước đọc đó.
- Thân thành công của hủy `PAID` giống hủy `OPEN` (chi tiết đơn, status `CANCELLED`). Lý do: client dùng lại một dạng.
- Dòng `SALE_REVERSAL`: cùng `branch_id`, `ingredient_id`, `invoice_id` với dòng `SALE`, số lượng đối dấu, `created_by` là người hủy. Lý do: `docs/DESIGN_DB_POS_SYSTEM.md:639`.
- Trả lượt mã chỉ khi đơn có mã đã gắn khi `PAID`; `used_count` không xuống dưới 0. Lý do: CHECK `used_count >= 0` (`20261107000000-InventoryPromotions.ts:90`).
- Seed hai permission mới bằng migration mới (mẫu `20261111000000-ManagerCancelOpen.ts`); cập nhật ma trận quyền ở `docs/BUSINESS_RULES.md` (thêm dòng chi từ két) và danh mục lỗi/endpoint ở `docs/api-spec.md` trong `sync-docs`.

## Để người viết plan tự chọn
- Tên migration, entity, DTO; cách kiểm quyền theo trạng thái trên một route; cách đọc tổng chi khi đóng ca; chỉ mục phụ.
- Thứ tự sub-task và tên test (mã `S9-xx`/`ST-n.AC-k`).

## Câu hỏi mở
- (Rỗng.)

## Changelog spec
- 2026-11-12: tạo bản nháp.
- 2026-11-13: sau spec-reviewer và "ok duyệt" của user: MANAGER hủy `PAID` không cần ca riêng; thêm `EXPENSE_EXCEEDS_DRAWER`/`CANCEL_EXCEEDS_DRAWER` (tiền kỳ vọng không âm); mã lỗi ghi chi vào ca không hợp lệ; hủy lại đơn giữ `INVOICE_NOT_OPEN`; thêm quyết định nhỏ của agent; sửa nguồn BR-50; đóng Q1.
- 2026-11-13: user duyệt spec ("duyệt spec"); `status: approved`.
- 2026-11-13: user yêu cầu ghi vào spec việc đổi ưu tiên lỗi của hủy đơn sang `404 NOT_FOUND` khi ngoài phạm vi (thay `409 SHIFT_NOT_OPEN`); thêm vào "Các phần cách làm user đã quyết". Cùng lượt user duyệt 5 message lỗi mới của plan (message nằm trong plan, không đổi hợp đồng spec).

## Kiểm tra sẵn sàng
- [x] Người chưa thấy cuộc trò chuyện đọc spec + docs dự án hiểu cần làm gì và vì sao (spec-reviewer đã đọc thử một lần)
- [x] Mỗi fact có nguồn hoặc ghi rõ "user nói"
- [x] Không có chi tiết cài đặt (thuộc plan)
- [x] "Câu hỏi mở" rỗng
- [x] Mỗi quyết định của agent đã được liệt kê
