---
id: 20261118-sprint11-pb16-remove-cancel-paid
status: approved
approved_at: 2026-11-18
---

# Spec: PB-16 Bãi bỏ hủy đơn PAID

## Mục đích và lý do
- Product Owner đã quyết (BR-110, 16/11/2026): đơn `PAID` bất biến, chỉ đơn `OPEN` hủy được; thu nhầm hoặc nhập sai xử lý ngoài hệ thống. Hủy đơn `PAID` (PB-11, Sprint 09) kéo theo hoàn kho, trả lượt mã giảm giá, trừ tiền kỳ vọng của két, nên làm báo cáo, lợi nhuận và PDF của Giai đoạn 2 phải xử lý thêm nhánh này. Làm đầu tiên ở Sprint 11 để các sprint sau không phải tính nhánh đó.

## Thành công trông như thế nào
- Không còn cách nào, qua API hay UI, để hủy một đơn đã thanh toán; gọi API hủy đơn `PAID` trả lỗi rõ ràng.
- Hủy đơn `OPEN` hoạt động y như trước (kể cả `MANAGER`).
- Mọi hóa đơn `CANCELLED` đã có vẫn xem được và không thay đổi; báo cáo, đối soát, sổ kho cũ không đổi số.
- Khi người dùng bấm hủy một đơn vừa được thanh toán (ví dụ ở máy khác), UI hiện thông báo từ server, tải lại đơn và không báo thành công.
- Tìm `invoice.cancel_paid`, `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER` trong mã, test, UI và tài liệu hiện hành ngoài migration cũ, spec/hồ sơ lịch sử và hồ sơ sprint cũ không còn kết quả.

## Mục tiêu
- API từ chối hủy đơn `PAID` bằng mã lỗi riêng.
- Gỡ quyền `invoice.cancel_paid` khỏi DB (quyền và dòng cấp quyền cho `OWNER`/`MANAGER`) bằng migration mới.
- Gỡ mã lỗi `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER` và toàn bộ logic hủy `PAID` (hoàn kho `SALE_REVERSAL`, trả lượt mã, kiểm két) khỏi API.
- UI không còn thao tác hủy đơn đã thanh toán (nút, hộp thoại nhánh `PAID`, hướng dẫn hoàn tiền, quyền `invoice.cancel_paid`); mock UI khớp.
- Gỡ hoặc sửa các test liên quan; test mới bảo vệ hành vi bất biến.
- Đồng bộ tài liệu: BR, `docs/api-spec.md`, thiết kế DB, README, backlog, sprint.

## Phi mục tiêu (cố ý không làm)
- Không hoàn tiền một phần, không hủy đơn của ca đã đóng, không sửa hay điều chỉnh hóa đơn `PAID` (BR-110).
- Không xóa hay sửa dữ liệu `CANCELLED` cũ, dòng `SALE_REVERSAL` cũ hay `cancel_reason`/`cancelled_*` cũ; không đổi enum `SALE_REVERSAL` và trạng thái `CANCELLED`.
- Không đổi hành vi hủy đơn `OPEN` hay quyền `invoice.cancel_open`.
- Không sửa migration đã chạy; không sửa spec lịch sử trong `.devloopflow/specs/` (giữ nguyên byte).

## Phản mục tiêu (làm ra mà vẫn bị coi là thất bại)
- Còn đường nào hủy được đơn `PAID` (kể cả khi tự gọi API, thiếu hoặc đủ quyền).
- Làm mất, đổi số hoặc ẩn hóa đơn `CANCELLED` cũ trong danh sách, báo cáo, đối soát ca hay sổ kho.
- Hỏng hủy đơn `OPEN` hoặc thanh toán hiện có.

## Hiện trạng
- `POS_API/src/sales/sales.service.ts:554-564` `cancel()`: `PAID` gọi `cancelPaid()`, `OPEN` hủy trực tiếp, trạng thái khác trả `409 INVOICE_NOT_OPEN`; `:567-599` `cancelPaid()` kiểm quyền `invoice.cancel_paid`, ca còn mở (`CANCEL_NOT_ALLOWED`), két đủ tiền (`CANCEL_EXCEEDS_DRAWER`), trả lượt mã, ghi `SALE_REVERSAL` (nguồn: đọc code ngày 18/11/2026).
- Quyền `invoice.cancel_paid` được seed ở `POS_API/src/database/migrations/20261113000000-ShiftExpenses.ts:21` và cấp cho `OWNER`, `MANAGER` ở `:26`.
- `POS_API/src/foundation.test.ts:38` đếm cứng 14 migration; `POS_API/src/shifts/tests/shift-expenses.integration.test.ts:211` khẳng định hai vai trò có `invoice.cancel_paid`.
- UI: `POS_UI/src/features/invoices/CancelInvoiceModal.tsx` (nhánh `isPaid`, hướng dẫn hoàn tiền), `InvoiceDetailDrawer.tsx:32-58,194`, `POS_UI/src/app/App.tsx:109`, `navigation.ts:32`, `types/auth.ts:32`, mock `mock/mockEngine.ts:786-797,953`, `mock/seedData.ts:567,580`.
- Báo cáo và đối soát chỉ tính `PAID` (`POS_API/src/reports/reports.service.ts:92`, `POS_API/src/shifts/shifts.service.ts:88`), nên không đọc nhánh hủy `PAID`.
- Test API khác đang hủy đơn `PAID` qua HTTP: `POS_API/src/reports/tests/reports.integration.test.ts:30` tạo đơn `PAID` tiền mặt rồi `POST /invoices/{id}/cancel` mong 200 (`test_ST2_AC1_paid_zero_cancelled` khẳng định doanh thu giảm); sẽ đỏ sau PB-16. Cần kiểm thêm `shifts.integration.test.ts`, `sales.integration.test.ts`, `invoices-read.integration.test.ts` (có dữ liệu `CANCELLED`, chưa xác nhận có gọi `/cancel` trên `PAID`).
- Test UI chứa `invoice.cancel_paid`, `CANCEL_NOT_ALLOWED` hoặc mô phỏng hủy `PAID`: `POS_UI/test/invoice-cancel.test.mjs:8,36,37`, `app-shell-products.test.mjs:40`, `app-router.test.mjs:27`, `app-routes.test.mjs:7-8`, `stock-ledger-router.browser.mjs:47-48`.
- Tài liệu cần đồng bộ: `docs/BUSINESS_RULES.md:143,151,176,189,230,251,308`; `docs/api-spec.md:353,362,379,460,524` và bảng mã lỗi (thiếu `INVOICE_PAID_IMMUTABLE`); `docs/DESIGN_DB_POS_SYSTEM.md:639,746`; `docs/PRODUCT_OVERVIEW.md:75,132,182`; `DESIGN.md:611,874`; `README.md:9` (câu mô tả hủy hóa đơn đã thanh toán; `README.md:15` là kết quả QA lịch sử Sprint 09, không sửa); `docs/PRODUCT_BACKLOG.md`; `sprints/sprint-11/SPRINT.md`.
- `invoices.status` có CHECK cho phép `CANCELLED` (`POS_API/src/database/migrations/20261106000000-Sales.ts:16`); không có trigger bất biến `PAID` nào, chỉ trigger của `stock_movements`. `docs/DESIGN_DB_POS_SYSTEM.md:746` để mở việc sửa CHECK.
- `POST invoices/{id}/cancel` đòi quyền `invoice.cancel_open` (`POS_API/src/sales/sales.controller.ts:53`); quyền này có ở `OWNER`, `CASHIER` (`20261106000000-Sales.ts:71`) và `MANAGER` (`20261111000000-ManagerCancelOpen.ts:10`).

## Ràng buộc
- Chỉ thay schema bằng migration TypeORM mới; không sửa migration đã chạy; thêm migration thì cập nhật số migration gắn cứng ở `POS_API/src/foundation.test.ts` (nguồn: `AGENTS.md`, `.devloopflow/MEMORY.md` M-29).
- Khi đổi mã lỗi, cập nhật danh sách lỗi của spec và `docs/api-spec.md` cùng lúc với code (M-4).
- Thay đổi quyền kiểm bằng HTTP với vai trò thật (M-10).
- Tuân thủ `docs/PRODUCT_OVERVIEW.md` và `AGENTS.md`: `PAID`/`CANCELLED` không sửa trực tiếp; sổ kho chỉ thêm dòng.

## Các phần cách làm user đã quyết
- Gọi API hủy đơn `PAID`: trả **mã lỗi mới riêng cho PAID** (user chọn 18/11/2026).
- Quyền `invoice.cancel_paid`: **gỡ khỏi DB bằng migration mới** (user chọn 18/11/2026).
- Nhánh làm việc: tạo nhánh riêng theo `rules/git.md` (user: "tạo đi đúng rule"); nhánh `feat/sprint-11-pb16-remove-cancel-paid` đã tạo từ `master` cập nhật.

## Quyết định của agent (user kiểm khi đọc)
- Mã lỗi mới: `INVOICE_PAID_IMMUTABLE`, HTTP `409`, message tiếng Việt "Đơn đã thanh toán không thể hủy." (rõ nghĩa với client, không trùng `CANCEL_NOT_ALLOWED` đang bị gỡ).
- Thứ tự kiểm: giữ `422 CANCEL_REASON_REQUIRED` trước, rồi tìm đơn trong phạm vi (đơn ngoài phạm vi vẫn `404`), rồi `PAID` mới trả `409 INVOICE_PAID_IMMUTABLE`; các trạng thái khác giữ `409 INVOICE_NOT_OPEN`. Không còn kiểm quyền riêng cho `PAID` (người có `invoice.cancel_open` gọi đơn `PAID` nhận `409`; người không có `invoice.cancel_open` vẫn nhận `403` như cũ).
- Giữ nguyên CHECK trạng thái của `invoices` (vẫn cho `CANCELLED`, dữ liệu cũ cần giữ); chỉ quyền `invoice.cancel_paid` bị gỡ khỏi DB và rollback khôi phục được.
- Hóa đơn `CANCELLED` cũ giữ nguyên ở mọi màn đọc; chỉ gỡ thao tác ghi.

## Để người viết plan tự chọn
- Cách tách `test/invoice-cancel.test.mjs` (giữ test hủy `OPEN`, gỡ test nhánh `PAID`), cách gỡ test trong `cancel-paid.integration.test.ts` (giữ ca còn áp dụng cho `OPEN`, đổi tên file nếu cần).
- Thứ tự sub-task API, migration, UI, tài liệu.
- Cách xử lý mock UI và tên hằng, miễn không để lại quyền hay mã lỗi cũ.

## Câu hỏi mở
-

## Changelog spec
- 2026-11-18: tạo từ sprint 11, S11-01, S11-02, BR-110 và câu trả lời của user.
- 2026-11-18: sửa sau spec-reviewer: thêm test API/UI và dòng tài liệu bị ảnh hưởng, hành vi UI khi server từ chối, tiêu chí tìm không còn kết quả, giữ CHECK trạng thái; rút chi tiết migration.

## Kiểm tra sẵn sàng
- [x] Người chưa thấy cuộc trò chuyện đọc spec + docs dự án hiểu cần làm gì và vì sao
- [x] Mỗi fact có nguồn hoặc ghi rõ "user nói"
- [x] Không có chi tiết cài đặt (thuộc plan; đã rút phần migration sau review)
- [x] "Câu hỏi mở" rỗng
- [x] Mỗi quyết định của agent đã được liệt kê
