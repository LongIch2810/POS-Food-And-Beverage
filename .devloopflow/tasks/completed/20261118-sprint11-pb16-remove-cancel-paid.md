---
id: 20261118-sprint11-pb16-remove-cancel-paid
spec: .devloopflow/specs/20261118-sprint11-pb16-remove-cancel-paid.md
plan: .devloopflow/approved/20261118-sprint11-pb16-remove-cancel-paid.md
status: completed
mode: đầy đủ
owner:
started_at: 2026-11-18
completed_at: 2026-11-19
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Task 20261118-sprint11-pb16-remove-cancel-paid

Yêu cầu nguyên văn của user: `/devloopflow:run @sprints/sprint-11/SPRINT.md`. Sprint 11 gồm 3 việc độc lập, tách thành 3 task chạy lần lượt: (1) task này, PB-16 (S11-01, S11-02); (2) PB-17 phiếu nhập + giá vốn (S11-03..07); (3) chọn ngân hàng ở Cài đặt (S11-08, S11-09). Task này là PB-16: "Bãi bỏ hủy đơn PAID: chỉ đơn OPEN hủy được; gỡ API, UI, mã lỗi và test liên quan; dữ liệu CANCELLED cũ giữ nguyên. Thay đổi hành vi PB-11 đã triển khai (BR-110)."

## Trạng thái
- Bước hiện tại (số bước trong flow): xong (đã đóng 2026-11-19; chưa commit)
- Đã xong: bước 1 khám phá (explorer + agent chính kiểm lại `sales.service.ts:554-599`, migration `20261113000000-ShiftExpenses.ts:21,26`, `foundation.test.ts:38` = 14 migration).
- Đang làm: không có
- Đã xong: ST-1, ST-2, ST-3, ST-4 (2026-11-19; API 347/347, UI 230/230)
- Sắp làm: task tiếp theo của Sprint 11: PB-17 (phiếu nhập, giá vốn), rồi chọn ngân hàng ở Cài đặt.

## Kết quả khám phá (nguồn: explorer + kiểm lại)
- API: `POS_API/src/sales/sales.service.ts:554-564` `cancel()` gọi `cancelPaid()` khi `PAID`; `:567-599` `cancelPaid()` (quyền `invoice.cancel_paid`, `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER`, trả lượt mã, `SALE_REVERSAL`). Controller `sales/sales.controller.ts:53-56` dùng `invoice.cancel_open`.
- Quyền `invoice.cancel_paid`: seed ở migration `20261113000000-ShiftExpenses.ts:21` và gán OWNER/MANAGER `:26`.
- Test: `sales/tests/cancel-paid.integration.test.ts` (toàn file), `shifts/tests/shift-expenses.integration.test.ts:211`, `foundation.test.ts:38`.
- UI: `features/invoices/CancelInvoiceModal.tsx`, `InvoiceDetailDrawer.tsx:32-58,194`, `app/App.tsx:109`, `app/navigation.ts:32`, `types/auth.ts:32`, `mock/mockEngine.ts:786-797,953`, `mock/seedData.ts:567,580`; test `test/invoice-cancel.test.mjs`, `app-routes.test.mjs:7-8`, `app-shell-products.test.mjs:40`, `stock-ledger-router.browser.mjs:47-48`.
- Dữ liệu cũ: báo cáo và ca chỉ tính `PAID` (`reports.service.ts:92`, `shifts.service.ts:88`); `SALE_REVERSAL` giữ trong enum vì dữ liệu cũ.
- Tài liệu cần đồng bộ: `docs/BUSINESS_RULES.md` BR-21/29/39/47/110 + sơ đồ vòng đời; `docs/api-spec.md:353,362,379,460,524`; `docs/DESIGN_DB_POS_SYSTEM.md:744`; `docs/PRODUCT_OVERVIEW.md`; `docs/PRODUCT_BACKLOG.md`; `README.md:15`; `DESIGN.md:874`; spec lịch sử (giữ nguyên).
- CHƯA TÌM THẤY / chưa kiểm: hàm gọi API hủy ở `POS_UI/src/services/salesService.ts`, `features/invoices/invoiceService.ts`.

## Câu hỏi làm rõ (chờ user)
1. Hủy đơn `PAID` sau PB-16 trả lỗi gì: `409 INVOICE_NOT_OPEN` (mã hiện có, như đơn `CANCELLED`) hay mã mới?
2. Quyền `invoice.cancel_paid`: gỡ khỏi DB bằng migration mới (khi đó `foundation.test.ts` 14 → 15 và `shift-expenses.integration.test.ts:211` đổi), hay chỉ bỏ dùng và giữ dòng trong DB?

## File đã thay đổi
| Path | Thay đổi gì | Sub-task |
|------|-------------|----------|
| POS_API/src/sales/sales.service.ts | `cancel()` trả 409 INVOICE_PAID_IMMUTABLE cho PAID; xóa `cancelPaid()` | ST-1 |
| POS_API/src/sales/tests/paid-immutable.integration.test.ts | tạo (14 test con) | ST-1 |
| POS_API/src/sales/tests/cancel-paid.integration.test.ts | xóa (+ dist .js tương ứng) | ST-1 |
| POS_API/src/reports/tests/reports.integration.test.ts | dòng 30-34: hủy PAID nay mong 409 | ST-1 |
| POS_API/src/database/migrations/20261118000001-RemoveCancelPaidPermission.ts | tạo: gỡ quyền invoice.cancel_paid, down() khôi phục | ST-2 |
| POS_API/src/database/tests/remove-cancel-paid-permission.migration.test.ts | tạo (2 test) | ST-2 |
| POS_API/src/foundation.test.ts | :38 14 → 15 | ST-2 |
| POS_API/src/database/tests/entity-schema.integration.test.ts | :27 14 → 15 (plan bỏ sót, tdd sửa theo M-29) | ST-2 |
| POS_API/src/shifts/tests/shift-expenses.integration.test.ts | xóa dòng 211 | ST-2 |
| POS_API/src/sales/tests/paid-immutable.integration.test.ts | thêm [PB16-ST2] | ST-2 |
| POS_UI/src/{app/App.tsx,app/navigation.ts,types/auth.ts,features/invoices/CancelInvoiceModal.tsx,features/invoices/InvoiceDetailDrawer.tsx,mock/mockEngine.ts,mock/seedData.ts} | bỏ hủy PAID và quyền invoice.cancel_paid | ST-3 |
| POS_UI/test/{invoice-cancel,app-shell-products,app-router,app-routes}.test.mjs, stock-ledger-router.browser.mjs | sửa theo plan | ST-3 |

## Đã đọc errors
- ST-1, ST-2, ST-3: INDEX.md, 20261111-manager-cancel-open-behavior-untested.md, 20261113-cancel-open-scope-order-untested.md

## Lịch sử review (chỉ thêm, không xoá)
- Vòng 1 — ngày: 2026-11-19 — kết luận: PASS (không có Critical/High/Medium). Report: code-reviewer trả trong phiên; AC chưa phủ: không.
  - Finding Low/Very Low đã ghi thẳng vào `.devloopflow/review/backlog.md`: B-73 (R1-1), B-74 (R1-2), B-75 (R1-3), đều Very Low, chờ xử lý.
  - Lưu ý: plan bỏ sót `POS_API/src/database/tests/entity-schema.integration.test.ts:27` (số migration cứng); `tdd` sửa theo M-29 (1 dòng).

## Lịch sử kiểm AC (chỉ thêm, không xoá)
- Sổ FAIL (để làm việc sau): `.devloopflow/verify/20261118-sprint11-pb16-remove-cancel-paid/fails.md`
- Lần 1 (toàn bộ AC trừ E2E-AC-9, ST-5.AC-1, ST-5.AC-2 chờ bước 10b) — ngày: 2026-11-19 — kết luận: PASS — report: `.devloopflow/verify/20261118-sprint11-pb16-remove-cancel-paid/report-1.md`
  - Kết quả mới nhất của từng AC: E2E-AC-1..8, 10 PASS; ST-1.AC-1..14 PASS; ST-2.AC-1..5 PASS; ST-3.AC-1..8 PASS; ST-4.AC-1..3 PASS; E2E-AC-9, ST-5.AC-1, ST-5.AC-2 chưa chạy.

## Cập nhật tài liệu (sync-docs, bước 10b; chỉ thêm, không xoá)
- D-1 docs/BUSINESS_RULES.md:143 (BR-21), :151 (BR-29), :176 (BR-39), :189 (BR-47), :230 (bảng quyền), :251 (sơ đồ vòng đời), :308 (BR-110) — đã sửa (user duyệt tất cả) — 2026-11-19
- D-2 docs/api-spec.md:353 (INVOICE_NOT_OPEN), thêm dòng INVOICE_PAID_IMMUTABLE :354, gỡ CANCEL_NOT_ALLOWED và CANCEL_EXCEEDS_DRAWER, :459 (nội dung đã khóa), :523 (quy tắc hủy) — đã sửa — 2026-11-19
- D-3 docs/DESIGN_DB_POS_SYSTEM.md:639, :746 — đã sửa — 2026-11-19
- D-4 docs/PRODUCT_OVERVIEW.md:75,132,182 — đã sửa — 2026-11-19
- D-5 DESIGN.md (xóa dòng thông báo thiếu quyền hủy đơn đã thanh toán; câu 873 ghi đã triển khai) — đã sửa — 2026-11-19
- D-6 README.md:9 — đã sửa (README.md:15 giữ nguyên) — 2026-11-19
- D-7 docs/PRODUCT_BACKLOG.md (PB-16), sprints/sprint-11/SPRINT.md (item 1-2, S11-01, S11-02) — đã sửa — 2026-11-19
- D-8 .devloopflow/devloopflow.md mục 2 (số test API 347, UI 230; cổng PostgreSQL 5432 trên máy này) — plugin tự cập nhật, báo lại — 2026-11-19
- D-9 DESIGN.md:359 (ô Hóa đơn: hủy chỉ đơn OPEN, không có nút hủy đơn đã thanh toán) — đã sửa (user duyệt tất cả, lượt sync-docs lần 2) — 2026-11-19
- D-10 DESIGN.md:552 (BR-29 → BR-28, BR-110) — đã sửa — 2026-11-19
- D-11 DESIGN.md:873 (câu 'Thay đổi giao diện đã có', bỏ ngoặc liền nhau) — đã sửa — 2026-11-19
- D-12 docs/PRODUCT_OVERVIEW.md:113 — đã sửa — 2026-11-19
- D-13 docs/PRODUCT_OVERVIEW.md:199 — đã sửa — 2026-11-19
- D-14 docs/architecture/ARCHITECTURE.md:170 (mục 8.3) — đã sửa — 2026-11-19
- D-15 docs/api-spec.md:362 (nguồn CANCEL_REASON_REQUIRED: BR-28) — đã sửa — 2026-11-19
- Bỏ qua có chủ đích: README.md:15, docs/PRODUCT_BACKLOG.md dòng 5, 32, 131 (hồ sơ lịch sử) — 2026-11-19

## Kinh nghiệm đã ghi (reflect, bước 10c; chỉ thêm, không xoá)
- M-53 (thêm) [api] xóa file test nguồn thì xóa file dist tương ứng — 2026-11-19
- M-54 (thêm) [qa] AC tài liệu chờ 10b: verify-ac lượt 1 loại, chạy lại sau — 2026-11-19
- M-29 (cập nhật, số lần 2) [db] mọi số migration gắn cứng, gồm entity-schema.integration.test.ts:27 — 2026-11-19
- M-34 (cập nhật, số lần 2) [qa] cổng/DB test thực tế thay đổi, kiểm kết nối trước — 2026-11-19
- Ghi chú của user: chưa có nội dung (user chọn 'sẽ nêu'); có thể gọi `/devloopflow:remember` sau.

## Blocked
- Lý do: Không có
- Lỗi còn lại: Không có
- Đề xuất: Không có
