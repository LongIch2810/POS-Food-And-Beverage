---
id: 20261118-sprint11-pb16-remove-cancel-paid
title: PB-16 Bãi bỏ hủy đơn PAID (chỉ đơn OPEN hủy được)
status: completed
created_at: 2026-11-18
approved_at: 2026-11-18
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# PB-16 Bãi bỏ hủy đơn PAID (chỉ đơn OPEN hủy được)

## Mục tiêu và bối cảnh
- Vì sao làm: Product Owner quyết BR-110 (nguyên văn `docs/BUSINESS_RULES.md:308`): "**Bãi bỏ hủy đơn `PAID`.** Chỉ đơn `OPEN` hủy được. Thay đổi hành vi MVP đã triển khai ở PB-11 (BR-21, BR-29, BR-39, BR-47, mã lỗi `CANCEL_NOT_ALLOWED`/`CANCEL_EXCEEDS_DRAWER`, UI hủy đơn đã thanh toán). ... Không có hoàn tiền một phần. Đơn đã thanh toán là bất biến: thu nhầm hoặc nhập sai thì xử lý ngoài hệ thống, hệ thống không có điều chỉnh hay sửa hóa đơn `PAID`. Làm đầu tiên ở Sprint 11 (PB-16)."
- Task nguyên văn của user: "PB-16 — Bãi bỏ hủy đơn PAID: chỉ đơn OPEN hủy được; gỡ API, UI, mã lỗi và test liên quan; dữ liệu CANCELLED cũ giữ nguyên. Thay đổi hành vi PB-11 đã triển khai (BR-110). Đơn PAID bất biến, thu nhầm xử lý ngoài hệ thống."
- Sprint: `sprints/sprint-11/SPRINT.md:36` S11-01 "Hủy đơn `PAID` bị từ chối ở API; UI không còn thao tác này; hủy đơn `OPEN` vẫn hoạt động; hóa đơn `CANCELLED` cũ không đổi và vẫn xem được." và `:37` S11-02 "Endpoint, mã lỗi, permission và test của hủy đơn `PAID` đã gỡ; `docs/api-spec.md`, BR và README khớp mã."
- Spec đã duyệt: `.devloopflow/specs/20261118-sprint11-pb16-remove-cancel-paid.md` (status approved 2026-11-18).
- Ai dùng: `OWNER`, `MANAGER`, `CASHIER` ở màn Hóa đơn (`POS_UI/src/features/invoices/`) và client gọi `POST /api/v1/invoices/{id}/cancel`.

## Khám phá
(đã đọc lại mã ngày 2026-11-18; graph Graphify dùng để định vị `.cancelPaid()` `POS_API/src/sales/sales.service.ts` L568, `CancelInvoiceModal()`, `InvoiceDetailDrawer()`)

API
- `cancel()`: `if (!reason?.trim()) throw httpError(422, 'CANCEL_REASON_REQUIRED', 'Cần nhập lý do hủy đơn.');` rồi trong transaction `const row = await this.invoice(manager, user, id); if (row.status === 'PAID') await this.cancelPaid(...); else if (row.status === 'OPEN') { await this.writable(manager, user, id); await manager.getRepository(Invoice).update({ id }, { status: 'CANCELLED', cancel_reason: reason.trim(), cancelled_by: user.id, cancelled_at: () => 'now()', updated_at: () => 'now()' }); } else throw httpError(409, 'INVOICE_NOT_OPEN', 'Đơn không còn mở.'); return this.detail(...)` — nguồn: `POS_API/src/sales/sales.service.ts:554-565`.
- `cancelPaid()` (private, chỉ được gọi ở `:558`): kiểm `invoice.cancel_paid` (403 `PERMISSION_DENIED`), khóa ca, `409 CANCEL_NOT_ALLOWED` "Chỉ hủy được đơn đã thanh toán khi ca của đơn còn mở.", khóa đơn, kiểm két `409 CANCEL_EXCEEDS_DRAWER` "Tiền mặt trong két không đủ để hoàn cho khách.", trả lượt mã, ghi `SALE_REVERSAL`, đổi `CANCELLED` — nguồn: `POS_API/src/sales/sales.service.ts:567-599`.
- `invoice(manager, user, id, lock = false)` đọc đơn, trả `404 NOT_FOUND` "Không tìm thấy hóa đơn." khi khác store hoặc (không có `branch.access_all` và khác chi nhánh) — nguồn: `sales.service.ts:72-79`.
- `writable()`: khóa ca thu ngân của người gọi (`shift()`, `409 SHIFT_NOT_OPEN` "Bạn cần mở ca thu ngân để bán hàng."), khóa đơn, `409 INVOICE_NOT_OPEN` nếu không còn `OPEN`, `409 SHIFT_NOT_OPEN` "Đơn không thuộc ca thu ngân hiện tại.", `409 TRANSFER_PENDING` — nguồn: `sales.service.ts:62-70,264-272`.
- `httpError(status, code, message)` tạo `HttpException({ code, message }, status)` — nguồn: `POS_API/src/http/http-error.ts:3-5`. Body lỗi có `details: []` (test cũ khẳng định `error.error.details` = `[]`, `POS_API/src/sales/tests/cancel-paid.integration.test.ts:343`).
- Route: `@Post(':id/cancel') @UseGuards(JsonBodyGuard) @RequirePermission('invoice.cancel_open') @HttpCode(200)` gọi `this.sales.cancel(request.authUser!, validId(id), input.reason)` — nguồn: `POS_API/src/sales/sales.controller.ts:51-57`. Guard trả `403 PERMISSION_DENIED` "Bạn không có quyền thực hiện thao tác này." — nguồn: `POS_API/src/auth/auth.service.ts:163-166`.
- `CancelInvoiceDto.reason`: `@IsOptional() @Transform(trim) @IsString() @MaxLength(255)` — nguồn: `POS_API/src/sales/http/sales.dto.ts:53-56`.
- `GET /api/v1/auth/me` trả `{ data: { user } }` với `user.permissions: string[]` — nguồn: `POS_API/src/auth/http/auth.controller.ts:19-28`, `auth/http/auth.dto.ts:41`; quyền nạp từ `role_permissions` (`auth/auth.service.ts:68`).

DB / migration
- Quyền `invoice.cancel_paid` seed ở `POS_API/src/database/migrations/20261113000000-ShiftExpenses.ts:19-27`: `INSERT INTO permissions (id, code, description) VALUES ... (gen_random_uuid(), 'invoice.cancel_paid', 'Hủy đơn đã thanh toán khi ca của đơn còn mở') ON CONFLICT (code) DO NOTHING;` và `INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE ... OR (r.name IN ('OWNER', 'MANAGER') AND p.code = 'invoice.cancel_paid') ON CONFLICT DO NOTHING;`. `down()` của file đó ném lỗi (`:31-33`).
- Bảng duy nhất tham chiếu `permissions`: `role_permissions.permission_id ... REFERENCES permissions(id) ON DELETE RESTRICT` — nguồn: `POS_API/src/database/migrations/20261028000000-Foundation.ts:50` (grep `REFERENCES permissions` chỉ có dòng này).
- Migration mới nhất: `20261118000000-DropAuthRateEvents.ts` (class `DropAuthRateEvents20261118000000`, có `down()` dựng lại bảng). Hiện có 14 file migration (liệt kê `POS_API/src/database/migrations/`).
- Migration nạp theo glob `migrations: [__dirname + '/migrations/*.js']` — nguồn: `POS_API/src/database/data-source.ts:81`.
- `POS_API/src/foundation.test.ts:38` `assert.equal((await db.runMigrations()).length, 14);`.
- `POS_API/src/shifts/tests/shift-expenses.integration.test.ts:211` `assert.deepEqual(await roles('invoice.cancel_paid'), ['MANAGER', 'OWNER']);` trong test `[S9-01][ST-1.AC-3] new permissions granted to the decided roles` (`:201-212`).
- Mẫu test migration quyền: `POS_API/src/reports/tests/reports-permissions.integration.test.ts:10-26` (`withSandbox`), `:91-103` (lấy `db.migrations.find(m => m.name === MIGRATION)`, gọi `migration.down(runner)` / `migration.up(runner)`).
- `invoices.status` CHECK `('OPEN','PAID','CANCELLED')` — nguồn: `20261106000000-Sales.ts:16`; `stock_movements.type` CHECK gồm `SALE_REVERSAL` — `20261107000000-InventoryPromotions.ts:49`. Spec giữ nguyên cả hai.
- `invoice.cancel_open` cấp cho `OWNER`, `CASHIER` (`20261106000000-Sales.ts:71`) và `MANAGER` (`20261111000000-ManagerCancelOpen.ts:7-12`).

Test API đang chạm hủy `PAID`
- `POS_API/src/sales/tests/cancel-paid.integration.test.ts` (702 dòng): fixture `freshShift`, `sellOrder`, `paidCashInvoice`, `seedPaidTransfer`, `snapshot`, `cancel`, `expectError`, `serialized`, `waitLock` (`:126-232,464-496`); các test hủy `PAID` mong 200/403/`CANCEL_NOT_ALLOWED`/`CANCEL_EXCEEDS_DRAWER` (`:234-421,432-593,613-635,648-695`); test còn áp dụng cho `OPEN`: `[S9-03][ST-4.AC-12] OPEN cancel keeps its behaviour` (`:423-430`), `[R1-1] out-of-scope caller without a shift gets 404 when cancelling an OPEN invoice` (`:595-611`); test không gọi hủy: `[B-47] close shift counts only CASH payments in cash_sales_amount` (`:637-646`).
- `POS_API/src/reports/tests/reports.integration.test.ts:29-34` (trong `test_ST2_AC1_paid_zero_cancelled`): MANAGER `POST /invoices/${cash}/cancel` mong `200`, rồi báo cáo `[2, 0, 50000, 50000]`. Trước đó báo cáo `{ invoiceCount: 3, totalRevenue: 85000, cashRevenue: 35000, transferRevenue: 50000 }` (`:24-27`).
- Đã kiểm (spec ghi "chưa kiểm"): `shifts/tests/shifts.integration.test.ts` chỉ `UPDATE invoices SET status='CANCELLED'` bằng SQL (`:170,176-182`), không gọi `/cancel`; `sales/tests/sales.integration.test.ts` gọi `sales.cancel(...)` trên đơn `OPEN` (`:68,98,246-247,274,298,313,327-329`) và kiểm `invoice.cancel_open` cấp cho `['CASHIER','MANAGER','OWNER']` (`:27-28`); `sales/tests/invoices-read.integration.test.ts` chỉ seed `CANCELLED` bằng SQL và đọc `GET /invoices/:id` (`:310-345`), `[T1-permission]` gọi `InvoiceReadScope20261114000000.down/up` (`:420-466`), không gọi `/cancel`; `sales/tests/manager-cancel.integration.test.ts` hủy `OPEN` bằng MANAGER (`:51-95`); `sales/tests/payment.integration.test.ts` chỉ gọi `/transfer-attempts/{id}/cancel`.
- `POS_API/src/database/tests/sql-capture.ts`: `captureSql(t: TestContext): string[]`, `lockSequence(sql: readonly string[]): string[]`.
- `npm test` của API chạy `"dist/**/*.test.js"` sau `tsc` với `outDir: dist`, `rootDir: src` — nguồn: `POS_API/package.json:6,9`, `POS_API/tsconfig.json:6-7`; `dist/` bị gitignore (`POS_API/.gitignore:2`). `tsc` không xóa file `.js` cũ khi xóa file nguồn.

UI
- `POS_UI/src/features/invoices/CancelInvoiceModal.tsx:10` import `formatVND`; `:32` `const isPaid = invoice.status === 'PAID';`; `:33` `canConfirm = invoice.workShiftStatus === 'OPEN' && (isPaid ? session.permissions.includes('invoice.cancel_paid') : invoice.status === 'OPEN' && session.permissions.includes('invoice.cancel_open') && session.permissions.includes('shift.read'))`; `:58-62` đọc lại đơn trước POST, đổi trạng thái thì `onUpdate(latest)` + "Hóa đơn hoặc ca đã thay đổi. Vui lòng kiểm tra lại trước khi xác nhận."; `:77-85` lỗi server 4xx: hiện message (+ "(Mã yêu cầu: ...)") và tải lại đơn; `:96` câu hướng dẫn hoàn tiền nhánh `isPaid` ("Hoàn lại ... cho khách từ két", "Hoàn tiền chuyển khoản ngoài hệ thống", "Không có khoản thanh toán") hoặc "Đơn hàng sẽ chuyển sang trạng thái đã hủy.".
- `POS_UI/src/features/invoices/InvoiceDetailDrawer.tsx:32-34` `isPaid`, `isOpenStatus`, `isCancelled`; `:37` `canCancelPaid`; `:50-58` nhánh `else if (isPaid)` (message "Cần quyền hủy hóa đơn đã thanh toán (invoice.cancel_paid)", "Ca của hóa đơn này đã đóng, không thể hủy đơn (BR-29)"); `:81,84` badge dùng `isPaid`; `:95` dùng `isCancelled`; `:194` `{!isCancelled && (isPaid ? canCancelPaid : canCancelOpen) && (` nút "Hủy hóa đơn này".
- `POS_UI/src/app/App.tsx:109` `if (!has('invoice.read') && !has('invoice.cancel_open') && !has('invoice.cancel_paid')) {`; `POS_UI/src/app/navigation.ts:32` `if (has('invoice.read') || has('invoice.cancel_open') || has('invoice.cancel_paid')) tabs.push('invoices');`; `POS_UI/src/types/auth.ts:32` `| 'invoice.cancel_paid' // Hủy đơn PAID (cần quyền quản lý & ca còn mở)`.
- Mock: `POS_UI/src/mock/mockEngine.ts:760-858` `cancelInvoice()` có nhánh `PAID` `:785-855` (hoàn kho `SALE_REVERSAL`, trả lượt mã); `:948-958` danh sách `operationalPerms` có `'invoice.cancel_paid'` ở `:953`; `POS_UI/src/mock/seedData.ts:567,580` trong `DEFAULT_ROLE_PERMISSIONS` (OWNER, MANAGER). `MockEngine.cancelInvoice` không có nơi gọi (grep `\.cancelInvoice\(` chỉ thấy `invoiceService.cancelInvoice`). `StockMovement` vẫn dùng ở `mockEngine.ts:697`.
- Service gọi API hủy: `POS_UI/src/services/salesService.ts:55-56` `cancel: (invoiceId, reason) => request<InvoiceDetail>(\`invoices/${id(invoiceId)}/cancel\`, 'POST', { reason })`; `POS_UI/src/features/invoices/invoiceService.ts:20` `cancelInvoice: (invoiceId, reason) => salesService.cancel(invoiceId, reason)`. Không cần sửa.
- `POS_UI/tsconfig.json:16-17` `noUnusedLocals: true`, `noUnusedParameters: true`.
- Test UI chứa `invoice.cancel_paid`/mã cũ: `POS_UI/test/invoice-cancel.test.mjs:8` (quyền mặc định của `setup`), `:19` `base` là `PAID`, `:21` (hướng dẫn hoàn tiền), `:30` (`CANCEL_EXCEEDS_DRAWER`), `:36` (danh sách mã gồm `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER`), `:37` (ngăn chi tiết: `PAID` có nút khi có `invoice.cancel_paid`); `POS_UI/test/app-shell-products.test.mjs:40`; `POS_UI/test/app-router.test.mjs:27`; `POS_UI/test/app-routes.test.mjs:7-8`; `POS_UI/test/stock-ledger-router.browser.mjs:47-48` (browser, ngoài `npm test`).
- Harness `invoice-cancel.test.mjs:11`: `shiftService.getCurrentShift` trả Promise đẩy vào `shifts`, `formatters` được mock; `:33-34` mẫu đi qua bước đọc ca cho đơn `OPEN`.

Báo cáo / đối soát chỉ tính `PAID`: `POS_API/src/reports/reports.service.ts:92`, `POS_API/src/shifts/shifts.service.ts:88` (nguồn: spec mục Hiện trạng).

Tài liệu có câu lỗi thời (chỉ đề xuất ở ST-5, không giao `tdd`): `docs/BUSINESS_RULES.md:143,151,176,189,230,251,308`; `docs/api-spec.md:353,362,379,460,524` (thiếu `INVOICE_PAID_IMMUTABLE`); `docs/DESIGN_DB_POS_SYSTEM.md:639,746`; `docs/PRODUCT_OVERVIEW.md:75,132,182`; `DESIGN.md:611,874`; `README.md:9`; `docs/PRODUCT_BACKLOG.md` (PB-16; `:131`); `sprints/sprint-11/SPRINT.md:22,36,37` — nguồn: spec mục Hiện trạng và `rg` ngày 2026-11-18.

## Lỗi cũ cần tránh
- `.devloopflow/errors/20261111-manager-cancel-open-behavior-untested.md` — quy tắc phòng tránh (nguyên văn): "Mỗi lần đổi quyền theo vai trò phải có test hành vi qua HTTP với vai trò thật (đường chính, thiếu điều kiện, khác phạm vi, thiếu quyền), không chỉ kiểm bảng cấp quyền."
- `.devloopflow/errors/20261113-cancel-open-scope-order-untested.md` — quy tắc phòng tránh (nguyên văn): "Khi plan ghi một thay đổi hợp đồng lỗi/thứ tự kiểm tra đã được user duyệt ("ảnh hưởng tới code hiện có"), thêm AC và test cho chính thay đổi đó, kèm trường hợp mà test cũ không phủ (người gọi không có ca, `branch_id` NULL), không chỉ ghi chú." và "Với mỗi thay đổi thứ tự kiểm tra, dùng đột biến "đảo thứ tự" để xác nhận có test đỏ."
- MEMORY áp dụng (`.devloopflow/MEMORY.md`): M-1 (sửa kiểm phạm vi ở mọi điểm vào cùng bảng), M-4 (đổi mã lỗi thì cập nhật spec và `docs/api-spec.md` cùng lúc, grep mã lỗi mới trong tài liệu), M-10 (đổi quyền kiểm qua HTTP bằng vai trò thật), M-28 (test UI nạp mã bằng `node:vm`: đọc harness trước khi đổi import/cấu trúc nút), M-29 (thêm migration thì cập nhật `foundation.test.ts` số migration và chạy toàn bộ `npm test`), M-30 (đổi hợp đồng lỗi/thứ tự kiểm thì có AC + test HTTP riêng với người gọi thiếu điều kiện, kiểm bằng đột biến đảo thứ tự), M-37 (tái dùng phần đã có), M-42 (lỗi thiếu `message`: không đổi message mặc định của client dùng chung), M-48 (truy vấn ORM; migration dùng SQL thô như các migration hiện có), M-49 (sửa test có sẵn: báo `git diff HEAD --numstat`), M-51 (AC theo trạng thái cuối, không đặt mốc đếm giữa chừng).

## Quyết định
- Câu hỏi: "Hủy đơn `PAID` sau PB-16 trả lỗi gì: `409 INVOICE_NOT_OPEN` (mã hiện có, như đơn `CANCELLED`) hay mã mới?" → Trả lời của user: "Mã mới riêng cho PAID". Spec đặt `INVOICE_PAID_IMMUTABLE`, HTTP `409`, message "Đơn đã thanh toán không thể hủy." và user đã duyệt spec (spec `:62`, status approved).
- Câu hỏi: "Quyền `invoice.cancel_paid`: gỡ khỏi DB bằng migration mới (...), hay chỉ bỏ dùng và giữ dòng trong DB?" → Trả lời của user: "Gỡ khỏi DB bằng migration mới".
- Nhánh git → user: đã tạo `feat/sprint-11-pb16-remove-cancel-paid` (spec `:59`: user "tạo đi đúng rule").
- Thứ tự kiểm (spec `:63`, user đã duyệt spec): giữ `422 CANCEL_REASON_REQUIRED` trước, rồi tìm đơn trong phạm vi (ngoài phạm vi `404`), rồi `PAID` trả `409 INVOICE_PAID_IMMUTABLE`; trạng thái khác giữ `409 INVOICE_NOT_OPEN`; không còn kiểm quyền riêng cho `PAID`; không có `invoice.cancel_open` vẫn `403`.
- Giữ CHECK trạng thái `invoices` và enum `SALE_REVERSAL` (spec `:29,64`).
- Câu hỏi 1: "Khi thanh toán và hủy cùng một đơn `OPEN` xảy ra gần như đồng thời và thanh toán thắng, yêu cầu hủy nhận `409 INVOICE_NOT_OPEN` ... hay phải là `409 INVOICE_PAID_IMMUTABLE`?" → Trả lời của user: "INVOICE_NOT_OPEN (Recommended)" (giữ 409 `INVOICE_NOT_OPEN`, không sửa `writable()`).
- Câu hỏi 2: "Đồng ý cho tiêu chí 'tìm không còn kết quả' ... loại trừ cả migration mới `20261118000001-RemoveCancelPaidPermission.ts` (tức toàn thư mục `POS_API/src/database/migrations/`)?" → Trả lời của user: "Đồng ý (Recommended)".
- Yêu cầu của agent chính (nguyên văn): migration mới "phải có tên theo mẫu YYYYMMDDHHMMSS-Ten.ts, có down() khôi phục quyền như migration 20261113000000-ShiftExpenses.ts"; "Tài liệu ... chỉ đề xuất ở sub-task cuối cho agent chính/sync-docs, KHÔNG giao tdd sửa tài liệu dự án".

## Giả định
- G-1: File migration mới bắt buộc chứa chuỗi `invoice.cancel_paid` (câu `DELETE ... WHERE code = 'invoice.cancel_paid'` trong `up()` và câu `INSERT` khôi phục trong `down()`), vì user chọn "Gỡ khỏi DB bằng migration mới". Do đó AC tìm kiếm loại trừ toàn thư mục `POS_API/src/database/migrations/` (migration cũ + migration mới), không chỉ "migration cũ" như spec `:17` ghi. Test không dùng chuỗi này (test migration so sánh khác biệt bảng quyền thay vì gõ mã quyền). — xác nhận bởi: user ngày 2026-11-18 (Câu hỏi 2), trả lời nguyên văn: "Đồng ý (Recommended)" = loại trừ cả thư mục `POS_API/src/database/migrations/` (cũ và mới).
- G-2: Khi đơn `OPEN` bị thanh toán xong đúng lúc yêu cầu hủy đang chờ khóa ca (đua thời gian), `cancel()` đọc đơn lần đầu thấy `OPEN`, rồi `writable()` khóa đơn thấy `PAID` và trả `409 INVOICE_NOT_OPEN` "Đơn không còn mở." (hành vi `writable()` hiện có, `sales.service.ts:267`), không phải `INVOICE_PAID_IMMUTABLE`. Không sửa `writable()`. — xác nhận bởi: user ngày 2026-11-18 (Câu hỏi 1), trả lời nguyên văn: "INVOICE_NOT_OPEN (Recommended)" = giữ 409 INVOICE_NOT_OPEN, không sửa writable().
- G-3: Quyền nạp từ DB qua `role_permissions` (`auth/auth.service.ts:68`); phiên đang mở có thể còn chuỗi quyền cũ trong cache, nhưng mã không còn kiểm quyền này nên không có tác dụng. — nguồn: `auth/auth.service.ts:68`, thay đổi ở ST-1.

## Phạm vi
- Trong:
  - API: `cancel()` từ chối `PAID` bằng `409 INVOICE_PAID_IMMUTABLE`; xóa `cancelPaid()` và import chỉ nó dùng.
  - Migration mới gỡ `invoice.cancel_paid` (quyền + dòng cấp cho `OWNER`/`MANAGER`), `down()` khôi phục.
  - Test API: thay `sales/tests/cancel-paid.integration.test.ts` bằng `sales/tests/paid-immutable.integration.test.ts`; sửa `reports/tests/reports.integration.test.ts:29-34`; `foundation.test.ts:38` 14 → 15; bỏ `shift-expenses.integration.test.ts:211`; test migration mới.
  - UI: bỏ nút/nhánh hủy `PAID`, hướng dẫn hoàn tiền, quyền `invoice.cancel_paid` trong kiểu, route, nav, mock, seed; sửa test UI liên quan.
  - Đề xuất đồng bộ tài liệu (ST-5) cho agent chính/`sync-docs`.
- Ngoài:
  - Hoàn tiền một phần, hủy đơn ca đã đóng, sửa/điều chỉnh hóa đơn `PAID` (spec Phi mục tiêu `:28`).
  - Xóa/sửa dữ liệu `CANCELLED`, `SALE_REVERSAL`, `cancel_reason`/`cancelled_*` cũ; đổi enum `SALE_REVERSAL` hay trạng thái `CANCELLED`; đổi CHECK `invoices.status` (spec `:29,64`).
  - Đổi hành vi hủy `OPEN` hay quyền `invoice.cancel_open` (spec `:30`).
  - Sửa migration đã chạy; sửa spec lịch sử trong `.devloopflow/specs/` (spec `:31`).
  - `tdd` sửa tài liệu dự án (`docs/`, `README.md`, `DESIGN.md`, `sprints/`): chỉ đề xuất ở ST-5.
  - Đổi `POS_UI/src/types/entities.ts:110` `StockMovementType` và `InventoryScreen.tsx:19` nhãn `SALE_REVERSAL` (dữ liệu cũ vẫn hiển thị trong Sổ kho).

## Thiết kế tổng thể
- Luồng chính `POST /api/v1/invoices/{id}/cancel` sau PB-16:
  1. Guard `AccessGuard` + `@RequirePermission('invoice.cancel_open')`: thiếu quyền → `403 PERMISSION_DENIED` (không đổi).
  2. `CancelInvoiceDto` validate `reason` (`MaxLength(255)` → `422 VALIDATION_ERROR`, không đổi).
  3. `cancel()`: `reason` rỗng/toàn khoảng trắng → `422 CANCEL_REASON_REQUIRED` "Cần nhập lý do hủy đơn." (không đổi).
  4. Trong transaction: `this.invoice(manager, user, id)` (không khóa) → ngoài phạm vi `404 NOT_FOUND` (không đổi).
  5. `row.status === 'PAID'` → `409 INVOICE_PAID_IMMUTABLE` "Đơn đã thanh toán không thể hủy." (MỚI). Transaction rollback, không có câu ghi nào đã chạy, không khóa dòng nào.
  6. `row.status !== 'OPEN'` (tức `CANCELLED`) → `409 INVOICE_NOT_OPEN` "Đơn không còn mở." (không đổi).
  7. `OPEN`: `writable()` rồi `update` thành `CANCELLED` như cũ, trả `detail` (không đổi).
- UI: ngăn chi tiết chỉ hiện nút "Hủy hóa đơn này" khi `invoice.status === 'OPEN'` và có `invoice.cancel_open`; hộp thoại hủy chỉ xác nhận được đơn `OPEN`; khi server trả `409 INVOICE_PAID_IMMUTABLE` (đơn vừa được thanh toán ở máy khác), hộp thoại hiện message server, tải lại đơn, không báo thành công (luồng lỗi sẵn có `CancelInvoiceModal.tsx:77-85`, tái dùng theo M-37).
- Thành phần tham gia: `POS_API/src/sales/sales.service.ts`, migration mới, test API; `POS_UI/src/features/invoices/*`, `app/App.tsx`, `app/navigation.ts`, `types/auth.ts`, `mock/*`, test UI.
- Quyết định thiết kế | lý do | phương án đã loại:
  - Kiểm `PAID` trong `cancel()` ngay sau `this.invoice()` | giữ thứ tự spec `:63` (422 → 404 → 409), không khóa gì khi đơn đã `PAID` | Loại: thêm điều kiện trong `writable()` (dùng chung cho thêm món, sửa món, thanh toán, chuyển bàn; đổi hợp đồng lỗi các endpoint đó).
  - Xóa hẳn `cancelPaid()` | spec Mục tiêu `:22` "Gỡ ... toàn bộ logic hủy `PAID`" | Loại: giữ hàm không gọi (mã chết).
  - Thay file `cancel-paid.integration.test.ts` bằng `paid-immutable.integration.test.ts` dùng lại fixture | spec `:68` cho planner chọn; tên mới phản ánh hành vi; tái dùng fixture (M-37) | Loại: giữ tên cũ (gây hiểu nhầm), viết fixture mới (trùng lặp).
  - Migration mới `20261118000001-RemoveCancelPaidPermission.ts` với `up()` DELETE và `down()` INSERT y như `ShiftExpenses` | user chọn (b); yêu cầu down() khôi phục | Loại: `down()` ném lỗi (không khôi phục được).
  - Test migration không gõ chuỗi mã quyền (so khác biệt tập `role_permissions` trước/sau `down()`) | để AC tìm kiếm không có kết quả trong test | Loại: assert theo chuỗi mã quyền.
  - Mock `cancelInvoice` nhánh `PAID` ném `Error('Đơn đã thanh toán không thể hủy.')` | mock khớp API (spec `:23`), xóa nhánh hoàn kho | Loại: xóa cả hàm (spec yêu cầu mock khớp, không yêu cầu xóa).

## Thay đổi dữ liệu
- Migration mới `POS_API/src/database/migrations/20261118000001-RemoveCancelPaidPermission.ts`, class `RemoveCancelPaidPermission20261118000001`, `name = 'RemoveCancelPaidPermission20261118000001'`.
  - `up()`: xóa dòng `role_permissions` của quyền `invoice.cancel_paid`, rồi xóa dòng `permissions` đó. Thứ tự này bắt buộc vì FK `ON DELETE RESTRICT` (`Foundation.ts:50`).
  - `down()`: chèn lại quyền với description `'Hủy đơn đã thanh toán khi ca của đơn còn mở'` và cấp cho `OWNER`, `MANAGER`, câu SQL y như `20261113000000-ShiftExpenses.ts:19-27` (phần của `invoice.cancel_paid`), có `ON CONFLICT ... DO NOTHING`.
  - Không đổi bảng, cột, index, CHECK. Không chạm `invoices`, `stock_movements`, `payments`, `promotion_codes`.
  - Rollback: `migration.down(queryRunner)` hoặc `npm run migration:revert` (TypeORM). Sau rollback, mã ST-1 vẫn không dùng quyền này.
- Số migration: 14 → 15 (`foundation.test.ts:38`, M-29).

## API contract tổng
- `POST /api/v1/invoices/{id}/cancel` — quyền `invoice.cancel_open` (không đổi); header `Origin` + `X-CSRF-Token` (không đổi); body `{ "reason": string }` (bắt buộc sau trim, tối đa 255).
- Thành công `200` `{ data: InvoiceDetail }` với `status: "CANCELLED"`, `cancelReason`, `cancelledAt` — chỉ với đơn `OPEN` (không đổi).
- Bảng mã lỗi sau PB-16:

| HTTP | code | message | Khi nào | Thay đổi |
|---|---|---|---|---|
| 403 | `PERMISSION_DENIED` | "Bạn không có quyền thực hiện thao tác này." | thiếu `invoice.cancel_open`, `PLATFORM_ADMIN` | không đổi |
| 422 | `VALIDATION_ERROR` | (của validation pipe) | `reason` > 255 ký tự, `id` không phải uuid | không đổi |
| 422 | `CANCEL_REASON_REQUIRED` | "Cần nhập lý do hủy đơn." | `reason` thiếu/rỗng/toàn khoảng trắng | không đổi |
| 404 | `NOT_FOUND` | "Không tìm thấy hóa đơn." | đơn khác store, hoặc khác chi nhánh khi không có `branch.access_all`, hoặc không tồn tại | không đổi |
| 409 | `INVOICE_PAID_IMMUTABLE` | "Đơn đã thanh toán không thể hủy." | đơn `PAID` (mọi vai trò có `invoice.cancel_open`, mọi phương thức, ca mở hay đóng) | MỚI |
| 409 | `INVOICE_NOT_OPEN` | "Đơn không còn mở." | đơn `CANCELLED`; đơn đổi trạng thái giữa lần đọc và lần khóa (G-2) | không đổi |
| 409 | `SHIFT_NOT_OPEN` | "Bạn cần mở ca thu ngân để bán hàng." / "Đơn không thuộc ca thu ngân hiện tại." | hủy `OPEN` khi người gọi không có ca thu ngân mở / đơn thuộc ca khác | không đổi |
| 409 | `TRANSFER_PENDING` | "Đơn đang chờ chuyển khoản. Hủy chờ trước khi sửa hoặc thanh toán." | hủy `OPEN` đang chờ chuyển khoản | không đổi |
| — | `CANCEL_NOT_ALLOWED` | — | — | GỠ |
| — | `CANCEL_EXCEEDS_DRAWER` | — | — | GỠ |

## AC tổng end-to-end
- [ ] E2E-AC-1: Given đơn `PAID` tiền mặt 45000đ (mã `S9PROMO`, `used_count` 1, tồn sữa `800.000`, đường `960.000`) trong ca còn mở, When MANAGER cùng chi nhánh `POST /api/v1/invoices/{id}/cancel` body `{"reason":"Khách trả hàng"}`, Then status `409`, `error.code` = `"INVOICE_PAID_IMMUTABLE"`, `error.message` = `"Đơn đã thanh toán không thể hủy."`, `error.details` = `[]`, và DB không đổi: `invoices.status` = `PAID`, `cancel_reason`/`cancelled_by`/`cancelled_at` = `null`, không có dòng `SALE_REVERSAL`, tồn `800.000`/`960.000`, `used_count` = 1, `payments` giữ nguyên (kiểm: integration HTTP, ST-1).
- [ ] E2E-AC-2: Given cùng loại đơn `PAID`, When OWNER (không ca) và CASHIER chủ ca gọi hủy, Then cả hai `409 INVOICE_PAID_IMMUTABLE`, DB không đổi (kiểm: integration HTTP, ST-1).
- [ ] E2E-AC-3: Given đơn `OPEN` TAKEAWAY không món, When CASHIER chủ ca hủy với `{"reason":"Khách đổi ý"}`, Then `200`, `data.status` = `"CANCELLED"`; MANAGER chủ ca hủy `OPEN` của mình → `200` (`manager-cancel.integration.test.ts` `[MGR-CANCEL-1]` không sửa); OWNER mở ca thu ngân ở chi nhánh rồi hủy `OPEN` của ca đó → `200` (kiểm: integration HTTP, ST-1).
- [ ] E2E-AC-4: Given hóa đơn `CANCELLED` cũ (đơn `PAID` 50000đ được đưa về `CANCELLED` bằng SQL như dữ liệu PB-11, có `cancel_reason` = `"Khách trả hàng (cũ)"` và 2 dòng `SALE_REVERSAL`), When `GET /api/v1/invoices/{id}`, Then `200`, `data.status` = `"CANCELLED"`, `data.cancelReason` = `"Khách trả hàng (cũ)"`, `data.cancelledAt` khác `null`; When gọi hủy lần nữa, Then `409 INVOICE_NOT_OPEN` "Đơn không còn mở." và DB không đổi; When đóng ca với `countedCash` 100000, Then đối soát `[cashSalesAmount, expenseAmount, expectedCash, status]` = `[0, 0, 100000, "MATCHED"]` (kiểm: integration HTTP, ST-1).
- [ ] E2E-AC-5: Given báo cáo ngày 2026-11-14 có `invoiceCount` 3, `totalRevenue` 85000, `cashRevenue` 35000, `transferRevenue` 50000, When MANAGER gọi hủy đơn `PAID` tiền mặt 35000đ, Then `409 INVOICE_PAID_IMMUTABLE` và báo cáo vẫn `[3, 35000, 50000, 85000]` (kiểm: integration HTTP, ST-1, `reports.integration.test.ts`).
- [ ] E2E-AC-6: Given DB mới chạy hết migration, Then `SELECT code FROM permissions WHERE code LIKE 'invoice.cancel%'` chỉ còn `invoice.cancel_open`; `GET /api/v1/auth/me` của OWNER và MANAGER có `permissions.filter(p => p.startsWith('invoice.cancel'))` = `["invoice.cancel_open"]`; `runMigrations()` lần đầu trả 15 migration, lần hai 0 (kiểm: integration, ST-2).
- [ ] E2E-AC-7: Given ngăn chi tiết hóa đơn `PAID` với người có `invoice.cancel_open`, Then không có nút "Hủy hóa đơn này"; Given hộp thoại hủy đơn `OPEN`, When server trả `{status:409, code:"INVOICE_PAID_IMMUTABLE", message:"Đơn đã thanh toán không thể hủy.", requestId:"req"}`, Then hộp thoại hiện "Đơn đã thanh toán không thể hủy. (Mã yêu cầu: req)", gọi đọc lại đơn lần 2, không gọi `onSuccess` (kiểm: `POS_UI` `npm test`, ST-3).
- [ ] E2E-AC-8: Given sau ST-1..ST-3, When chạy từ gốc repo `rg -n "invoice\.cancel_paid|CANCEL_NOT_ALLOWED|CANCEL_EXCEEDS_DRAWER" POS_API/src POS_UI/src POS_UI/test -g "!**/database/migrations/**"` (loại trừ cả migration cũ và mới, user duyệt Câu hỏi 2 ngày 2026-11-18), Then không in dòng nào, exit code `1` (kiểm: lệnh `rg`, ST-3).
- [ ] E2E-AC-9: Given sau ST-5 (agent chính/`sync-docs` đã sửa tài liệu được user duyệt), When chạy `rg -n "invoice\.cancel_paid|CANCEL_NOT_ALLOWED|CANCEL_EXCEEDS_DRAWER" docs DESIGN.md README.md AGENTS.md CLAUDE.md THIRD_PARTY_INTEGRATIONS.md sprints/sprint-11 .devloopflow/devloopflow.md`, Then không in dòng nào (exit `1`), và `rg -n "INVOICE_PAID_IMMUTABLE" docs/api-spec.md` in ít nhất 1 dòng trong bảng mã lỗi (kiểm: lệnh `rg`, ST-5).
- [ ] E2E-AC-10: Given toàn bộ thay đổi, When chạy `npm run build` và `npm test` trong `POS_API/` và `npm run typecheck`, `npm run build`, `npm test` trong `POS_UI/`, Then mọi lệnh exit `0`, số test fail = 0 (kiểm: output lệnh, ST-4).

## Review Focus
- RF-1: Đơn `OPEN` vừa được thanh toán ở máy khác khi hộp thoại hủy đang mở (UI đọc lại trước POST thấy `PAID`) → không gửi POST, `onUpdate(latest)`, hiện "Hóa đơn hoặc ca đã thay đổi. Vui lòng kiểm tra lại trước khi xác nhận.", không báo thành công — test: `T5-stale: thay OPEN thành PAID cần xác nhận mới` (giữ, ST-3).
- RF-2: Thanh toán và hủy cùng một đơn `OPEN` chạy đồng thời (thanh toán giữ khóa ca trước) → thanh toán `201`, hủy `409` với `error.code` `INVOICE_NOT_OPEN` "Đơn không còn mở." (G-2, user đã xác nhận), đơn cuối cùng `PAID`, không có dòng `SALE_REVERSAL`, `cancel_reason` `null` — test: `[PB16-RF2] pay wins a concurrent cancel of the same OPEN invoice` (ST-1).
- RF-3: Gọi hủy đơn `PAID` bằng id viết HOA → vẫn `409 INVOICE_PAID_IMMUTABLE` (không `404`, không ghi) — test: `[PB16-8] uppercase id of a PAID invoice returns INVOICE_PAID_IMMUTABLE` (ST-1).
- RF-4: File test cũ đã biên dịch `POS_API/dist/sales/tests/cancel-paid.integration.test.js` còn sót trong `dist/` sau khi xóa nguồn → `npm test` (glob `dist/**/*.test.js`) chạy lại test cũ và đỏ — hành vi mong đợi: `tdd` xóa file `.js`/`.js.map`/`.d.ts` sinh ra tương ứng trong `dist/` (file build, gitignore) rồi chạy `npm test` — test: kiểm bằng `npm test` toàn bộ exit 0 (E2E-AC-10, ST-4) và `ls POS_API/dist/sales/tests/` không còn `cancel-paid.integration.test.js` (ST-1.AC-8).
- RF-5: Gọi hủy đơn `PAID` không được để lại khóa hay câu ghi nào (ví dụ đã khóa ca rồi mới từ chối) → trong lúc gọi không có câu `INSERT`/`UPDATE`/`DELETE` và `lockSequence` = `[]` — test: `[PB16-RF5] PAID cancel takes no row lock and writes nothing` (ST-1).

## Sub-tasks

### ST-1: API từ chối hủy đơn PAID và gỡ logic hủy PAID
- depends_on: -
- Interfaces (sub-task chỉ thấy phần của mình nên ghi đủ để không phải đoán tên/kiểu):
  - Consumes (dùng của sub-task trước): Không có.
  - Produces (sub-task sau sẽ dùng): Hợp đồng HTTP `POST /api/v1/invoices/{id}/cancel` → với đơn `PAID`: status `409`, body `{ "error": { "code": "INVOICE_PAID_IMMUTABLE", "message": "Đơn đã thanh toán không thể hủy.", "details": [], "requestId": string } }`. Chữ ký không đổi: `SalesService.cancel(user: UserSummary, id: string, reason: string): Promise<ReturnType<SalesService['detail']>>` (giữ nguyên kiểu trả về hiện tại). File test `POS_API/src/sales/tests/paid-immutable.integration.test.ts` với fixture nội bộ `freshShift()`, `paidCashInvoice()`, `snapshot()`, `cancel()`, `expectError()`, `login()`, `json()` (ST-2 thêm một test vào file này).
- Mục tiêu: `cancel()` trả `409 INVOICE_PAID_IMMUTABLE` cho đơn `PAID`, xóa `cancelPaid()`; thay test hủy `PAID` bằng test bất biến; giữ hủy `OPEN`.
- AC riêng (mỗi AC một dòng riêng, có checkbox; tick `[x]` khi AC PASS):
  - [ ] ST-1.AC-1: Given đơn `PAID` tiền mặt `quantity` 2 + `S9PROMO` (tổng 45000, `used_count` 1, tồn sữa `800.000`, đường `960.000`), When MANAGER cùng chi nhánh không có ca gọi hủy `{"reason":"Khách trả hàng"}`, Then `409`, `error.code` `INVOICE_PAID_IMMUTABLE`, `error.message` "Đơn đã thanh toán không thể hủy.", `error.details` `[]`, `snapshot(id)` sau = trước (kiểm: integration HTTP).
  - [ ] ST-1.AC-2: Given đơn `PAID` tiền mặt `quantity` 1, When OWNER store (không ca) và CASHIER chủ ca gọi hủy, Then mỗi lần `409 INVOICE_PAID_IMMUTABLE`, `snapshot` không đổi (kiểm: integration HTTP).
  - [ ] ST-1.AC-3: Given đơn `PAID` chuyển khoản 30000 (`seedPaidTransfer`) và đơn `PAID` 0đ (mã `S9ZERO`, `complete-zero`), When MANAGER gọi hủy, Then `409 INVOICE_PAID_IMMUTABLE`; `payments`, `transfer_attempts` không đổi; `used_count` của `S9ZERO` vẫn 1; không có `SALE_REVERSAL` (kiểm: integration HTTP).
  - [ ] ST-1.AC-4: Given đơn `PAID` tiền mặt của ca đã đóng (`countedCash` 125000), When MANAGER gọi hủy, Then `409 INVOICE_PAID_IMMUTABLE` (không còn `CANCEL_NOT_ALLOWED`), `snapshot` và dòng `cash_reconciliations` của ca không đổi (kiểm: integration HTTP).
  - [ ] ST-1.AC-5: Given đơn `PAID`, When MANAGER gửi `{}` và `{"reason":"   "}`, Then `422 CANCEL_REASON_REQUIRED` message "Cần nhập lý do hủy đơn."; gửi `reason` 256 ký tự `a` → `422 VALIDATION_ERROR`; `snapshot` không đổi (thứ tự 422 trước 409, kiểm: integration HTTP).
  - [ ] ST-1.AC-6: Given đơn `PAID` chi nhánh C, When MANAGER chi nhánh B (không `branch.access_all`), OWNER store khác, MANAGER `branch_id` NULL gọi hủy, Then `404 NOT_FOUND` "Không tìm thấy hóa đơn."; `PLATFORM_ADMIN` → `403 PERMISSION_DENIED`; MANAGER bị thu hồi `invoice.cancel_open` (DELETE dòng `role_permissions` rồi khôi phục trong `finally`) → `403 PERMISSION_DENIED`; `snapshot` không đổi (thứ tự 404/403 trước 409, kiểm: integration HTTP).
  - [ ] ST-1.AC-7: Given đơn `OPEN` TAKEAWAY của CASHIER chủ ca, When CASHIER hủy `{"reason":"Khách đổi ý"}`, Then `200`, `data.status` `CANCELLED`; Given chi nhánh mới chưa có ca, OWNER mở ca `POST /work-shifts {"shiftType":"CASHIER","branchId":<chi nhánh>}` (201) và tạo đơn TAKEAWAY, When OWNER hủy, Then `200`, `data.status` `CANCELLED`, `invoices.cancelled_by` = id OWNER; Given đơn `OPEN` của CASHIER, When OWNER không có ca hủy, Then `409 SHIFT_NOT_OPEN` và đơn vẫn `OPEN` (kiểm: integration HTTP).
  - [ ] ST-1.AC-8: Given đơn `OPEN`, When MANAGER chi nhánh B không ca và MANAGER `branch_id` NULL không ca gọi hủy, Then `404 NOT_FOUND` "Không tìm thấy hóa đơn.", đơn `{status:'OPEN', cancelled_by:null}` (giữ nguyên test `[R1-1]`); và sau `npm run build` thư mục `POS_API/dist/sales/tests/` không còn `cancel-paid.integration.test.js` (kiểm: integration HTTP + `ls`).
  - [ ] ST-1.AC-9: Given hóa đơn `CANCELLED` cũ như E2E-AC-4, Then `GET` `200` với `status` `CANCELLED`, `cancelReason` "Khách trả hàng (cũ)", `cancelledAt` khác `null`; gọi hủy → `409 INVOICE_NOT_OPEN` "Đơn không còn mở.", `snapshot` không đổi (vẫn 2 dòng `SALE_REVERSAL`); đóng ca `countedCash` 100000 → `[0, 0, 100000, "MATCHED"]` (kiểm: integration HTTP).
  - [ ] ST-1.AC-10: Given `test_ST2_AC1_paid_zero_cancelled` (`reports.integration.test.ts`), When MANAGER `mgr_a1` gọi hủy đơn `PAID` tiền mặt 35000, Then `409`, `error.code` `INVOICE_PAID_IMMUTABLE`, báo cáo `[invoiceCount, cashRevenue, transferRevenue, totalRevenue]` = `[3, 35000, 50000, 85000]` (kiểm: integration HTTP).
  - [ ] ST-1.AC-11: Given hai yêu cầu chạy nối tiếp nhờ khóa ca (`serialized`): thanh toán tiền mặt đơn `OPEN` trước, hủy cùng đơn sau, Then thanh toán `201`, hủy `409` với `error.code` = `INVOICE_NOT_OPEN`, `error.message` = "Đơn không còn mở." (G-2, user đã xác nhận; không sửa `writable()`), DB: `status` `PAID`, `cancel_reason` `null`, 0 dòng `SALE_REVERSAL` (kiểm: integration HTTP).
  - [ ] ST-1.AC-12: Given đơn `PAID` tiền mặt, When MANAGER gọi hủy trong lúc `captureSql(t)` ghi lại SQL, Then `lockSequence(sql)` = `[]` và không câu nào khớp `/^\s*(INSERT|UPDATE|DELETE)\b/i` (kiểm: integration HTTP).
  - [ ] ST-1.AC-13: Given đơn `PAID` tiền mặt, When MANAGER gọi hủy với id viết HOA (`id.toUpperCase()`), Then `409 INVOICE_PAID_IMMUTABLE`, `snapshot` không đổi (kiểm: integration HTTP).
  - [ ] ST-1.AC-14: Đột biến đảo thứ tự (M-30): khi tạm đặt kiểm `PAID` trước `this.invoice()` (bằng cách đọc đơn không qua kiểm phạm vi) hoặc trước kiểm `reason`, ít nhất một test của ST-1.AC-5 hoặc ST-1.AC-6 đỏ; `tdd` hoàn tác đột biến và ghi lệnh + output đỏ vào `.devloopflow/verify/20261118-sprint11-pb16-remove-cancel-paid/evidence/ST-1/mutation.log` (kiểm: chạy test với đột biến).
- Plan chi tiết:
  - File tạo/sửa (path + thay đổi cụ thể):
    - `POS_API/src/sales/sales.service.ts`: sửa `cancel()` `:554-565` thành:
      ```ts
      async cancel(user: UserSummary, id: string, reason: string) {
        if (!reason?.trim()) throw httpError(422, 'CANCEL_REASON_REQUIRED', 'Cần nhập lý do hủy đơn.');
        return this.db.transaction(async manager => {
          const row = await this.invoice(manager, user, id);
          // BR-110: PAID invoices are immutable; mistakes are handled outside the system.
          if (row.status === 'PAID') throw httpError(409, 'INVOICE_PAID_IMMUTABLE', 'Đơn đã thanh toán không thể hủy.');
          if (row.status !== 'OPEN') throw httpError(409, 'INVOICE_NOT_OPEN', 'Đơn không còn mở.');
          await this.writable(manager, user, id);
          await manager.getRepository(Invoice).update({ id }, { status: 'CANCELLED', cancel_reason: reason.trim(), cancelled_by: user.id, cancelled_at: () => 'now()', updated_at: () => 'now()' });
          return this.detail(manager, await this.invoice(manager, user, id));
        });
      }
      ```
      Xóa dòng chú thích `:567` và toàn bộ `cancelPaid()` `:568-599`. Với từng import `randomUUID`, `CashReconciliation`, `PromotionCode`, `StockMovement`, `Payment`, `InvoicePromotionCode`, `WorkShift`: chạy `rg -n "\b<Tên>\b" POS_API/src/sales/sales.service.ts`; chỉ xóa import nào sau khi xóa `cancelPaid()` không còn dòng dùng nào ngoài dòng import.
    - `POS_API/src/sales/tests/paid-immutable.integration.test.ts` (TẠO): chép nguyên phần khởi tạo và fixture của `cancel-paid.integration.test.ts:1-232` (sandbox DB, `insertUser`, catalog, `promoIds`, app, `login`, `post`, `json`, `sessions`, `freshShift`, `sellOrder`, `paidCashInvoice`, `seedPaidTransfer`, `snapshot`, `stockOf`, `reversals`, `cancel`, `expectError`) và `waitLock`/`serialized` (`:464-494`), đổi tên test cha thành `'[PB-16] PAID invoices are immutable over HTTP with PostgreSQL'` và prefix DB `pos_pb16_cancel_`; giữ nguyên khối `finally` (`:696-701`). Không mang theo dòng nào chứa `invoice.cancel_paid`, `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER`. Các test con (tên chính xác):
      - `[PB16-1] manager cancelling a PAID cash invoice gets INVOICE_PAID_IMMUTABLE and nothing changes` (ST-1.AC-1)
      - `[PB16-2] owner without a shift and cashier owning the shift get INVOICE_PAID_IMMUTABLE` (ST-1.AC-2)
      - `[PB16-3] PAID transfer and zero-total invoices stay unchanged` (ST-1.AC-3)
      - `[PB16-4] PAID invoice of a closed shift returns INVOICE_PAID_IMMUTABLE` (ST-1.AC-4)
      - `[PB16-5] reason is validated before the PAID check` (ST-1.AC-5)
      - `[PB16-6] scope and permission are checked before the PAID check` (ST-1.AC-6; dùng `insertUser(randomUUID(), storeS, null, 'MANAGER', 's9c_manager_null_paid')` như `:631`)
      - `[PB16-7] OPEN cancel keeps its behaviour for CASHIER and OWNER` (ST-1.AC-7; chi nhánh mới chèn bằng `db.query('INSERT INTO branches(id,store_id,code,name,initial_cash) VALUES($1,$2,$3,$4,100000)', ...)` code `OW1`)
      - `[R1-1] out-of-scope caller without a shift gets 404 when cancelling an OPEN invoice` (chép nguyên `:595-611`, ST-1.AC-8)
      - `[PB16-8] uppercase id of a PAID invoice returns INVOICE_PAID_IMMUTABLE` (ST-1.AC-13)
      - `[PB16-9] legacy CANCELLED invoice stays readable and unchanged` (ST-1.AC-9): tạo `paidCashInvoice(cashier, { quantity: 2 })` (tổng 50000), rồi bằng SQL: `UPDATE invoices SET status='CANCELLED', cancel_reason='Khách trả hàng (cũ)', cancelled_by=$2, cancelled_at=now(), updated_at=now() WHERE id=$1` (`$2` = `managerId`) và chèn 2 dòng `stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,invoice_id,created_by,source)` loại `'SALE_REVERSAL'` quantity `200` (sữa) và `40` (đường), `balance_after` 0, `created_by` `managerId`, `source` `'USER'`; `GET ${base}/invoices/${id}` với `manager` → `200`; hủy → `409 INVOICE_NOT_OPEN`; đóng ca `post('/work-shifts/${shiftId}/close', cashier, { countedCash: 100000 })` → `data.reconciliation`.
      - `[B-47] close shift counts only CASH payments in cash_sales_amount` (chép nguyên `:637-646`)
      - `[PB16-RF2] pay wins a concurrent cancel of the same OPEN invoice` (ST-1.AC-11): `const open = await sellOrder(cashier, { quantity: 1 })`; `serialized(shiftId, () => post(\`/invoices/${open.id}/payments\`, cashier, { method: 'CASH', amount: open.total, tenderedAmount: open.total }, randomUUID()), () => cancel(cashier, open.id))`.
      - `[PB16-RF5] PAID cancel takes no row lock and writes nothing` (ST-1.AC-12): `async (t) => { const sql = captureSql(t); ... }` như mẫu `:673-682`; import `captureSql, lockSequence` từ `'../../database/tests/sql-capture'`.
    - `POS_API/src/sales/tests/cancel-paid.integration.test.ts` (XÓA file nguồn, sau khi file mới đã chép fixture) và các file sinh ra `POS_API/dist/sales/tests/cancel-paid.integration.test.js`, `.js.map`, `.d.ts` nếu tồn tại (file build trong `dist/`, gitignore). Không xóa file nào khác.
    - `POS_API/src/reports/tests/reports.integration.test.ts:30-34`: đổi thành gọi hủy mong `409` và `INVOICE_PAID_IMMUTABLE`, rồi assert báo cáo `[r.body.data.invoiceCount, r.body.data.cashRevenue, r.body.data.transferRevenue, r.body.data.totalRevenue]` = `[3, 35000, 50000, 85000]`. Chỉ sửa các dòng `:30-34`; tên biến `cancelled` đổi thành `rejected`.
  - Chữ ký hàm/class: `async cancel(user: UserSummary, id: string, reason: string)` (giữ nguyên). Xóa `private async cancelPaid(manager: EntityManager, user: UserSummary, row: Row, reason: string): Promise<void>`.
  - DTO/schema (field | kiểu | bắt buộc? | ràng buộc | mặc định): Không có thay đổi (`CancelInvoiceDto.reason` giữ nguyên, `sales.dto.ts:53-56`).
  - DB/migration (bảng, cột, index, rollback): Không có ở ST-1 (migration ở ST-2).
  - API (method, path, quyền, request, response thành công, bảng mã lỗi + message): xem "API contract tổng"; chỉ thêm dòng `409 INVOICE_PAID_IMMUTABLE` và gỡ `CANCEL_NOT_ALLOWED`, `CANCEL_EXCEEDS_DRAWER`, `403` riêng cho `PAID`.
  - Các bước xử lý:
    1. Đọc `.devloopflow/errors/INDEX.md`, hai file lỗi ở "Lỗi cũ liên quan", `.devloopflow/MEMORY.md` mục M-1, M-10, M-29, M-30, M-37, M-48, M-49.
    2. Tạo `paid-immutable.integration.test.ts` với các test ở trên (Red: PB16-1..6, PB16-8, PB16-RF5, PB16-4 đỏ vì mã cũ trả 200/403/`CANCEL_NOT_ALLOWED`; PB16-7, R1-1, B-47, PB16-9, PB16-RF2 có thể xanh ngay — ghi rõ test nào xanh ngay và vì sao trong report).
    3. Sửa `reports.integration.test.ts:30-34` (Red: nhận 200).
    4. Sửa `cancel()` và xóa `cancelPaid()` + import thừa (Green).
    5. Xóa `cancel-paid.integration.test.ts` và file sinh ra tương ứng trong `dist/`.
    6. Chạy đột biến ST-1.AC-14, lưu log, hoàn tác.
    7. `npm run build`, chạy từng file test ở "Test viết trước", rồi `npm test` toàn bộ.
  - Quy tắc nghiệp vụ (kèm nguồn): BR-110 (`docs/BUSINESS_RULES.md:308`); thứ tự kiểm và mã lỗi (spec `:62-63`); hủy `OPEN` giữ nguyên (spec `:30`); dữ liệu `CANCELLED` cũ giữ nguyên (spec `:29,65`).
  - Bảng edge case (tình huống → hành vi mong đợi):
    - `PAID` + `reason` thiếu → `422 CANCEL_REASON_REQUIRED`.
    - `PAID` + người ngoài chi nhánh → `404 NOT_FOUND`.
    - `PAID` + `PLATFORM_ADMIN` → `403 PERMISSION_DENIED` (guard).
    - `PAID` + ca đã đóng → `409 INVOICE_PAID_IMMUTABLE`.
    - `PAID` 0đ (không có `payments`) → `409 INVOICE_PAID_IMMUTABLE`.
    - `CANCELLED` → `409 INVOICE_NOT_OPEN`.
    - `OPEN` + đua với thanh toán → `409 INVOICE_NOT_OPEN` (G-2).
    - `OPEN` + đang chờ chuyển khoản → `409 TRANSFER_PENDING` (không đổi, `writable()`).
  - Ảnh hưởng tới code hiện có (ai gọi, sửa gì theo): `SalesService.cancel` được gọi bởi `InvoicesController.cancel` (`sales.controller.ts:56`) và test `sales/tests/sales.integration.test.ts` (đơn `OPEN`, không sửa). `cancelPaid` chỉ được gọi ở `sales.service.ts:558`. Không đổi `writable()`, `invoice()`, `detail()`. UI client đọc `error.code`/`message` chung (`CancelInvoiceModal.tsx:79`), không cần sửa ở ST-1.
  - Tác dụng phụ (log, event, cache, mail...): Không có. Đơn `PAID` không còn ghi `SALE_REVERSAL`, không đổi `promotion_codes.used_count`.
- Lỗi cũ liên quan: `.devloopflow/errors/20261111-manager-cancel-open-behavior-untested.md` → "Mỗi lần đổi quyền theo vai trò phải có test hành vi qua HTTP với vai trò thật (đường chính, thiếu điều kiện, khác phạm vi, thiếu quyền), không chỉ kiểm bảng cấp quyền."; `.devloopflow/errors/20261113-cancel-open-scope-order-untested.md` → "Khi plan ghi một thay đổi hợp đồng lỗi/thứ tự kiểm tra đã được user duyệt ("ảnh hưởng tới code hiện có"), thêm AC và test cho chính thay đổi đó, kèm trường hợp mà test cũ không phủ (người gọi không có ca, `branch_id` NULL), không chỉ ghi chú." và "Với mỗi thay đổi thứ tự kiểm tra, dùng đột biến "đảo thứ tự" để xác nhận có test đỏ."
- Quy tắc code cho `tdd` (Ponytail, nguyên văn yêu cầu của agent chính): "thay đổi nhỏ nhất đủ yêu cầu, tái dùng mã có sẵn, không cắt bảo mật/toàn vẹn dữ liệu/nghiệm thu". Không sửa `writable()`, không thêm helper mới; test mới tái dùng fixture chép từ file cũ. Sửa test có sẵn (`reports.integration.test.ts`) chỉ ở `:30-34`; báo `git diff HEAD --numstat -- POS_API/src/reports/tests/reports.integration.test.ts` và liệt kê từng dòng đã xóa (M-49).
- Test viết trước:
  - [ ] `[PB16-1] manager cancelling a PAID cash invoice gets INVOICE_PAID_IMMUTABLE and nothing changes` — input: MANAGER, đơn `PAID` 45000 `S9PROMO`, `{"reason":"Khách trả hàng"}` — expected: `409`, code/message như ST-1.AC-1, `details` `[]`, `snapshot` bằng trước, `stockOf` sữa `800.000` đường `960.000`, `usedCount` 1, `reversals` 0.
  - [ ] `[PB16-2] owner without a shift and cashier owning the shift get INVOICE_PAID_IMMUTABLE` — input: `sessions.ownerS`, `cashier`, đơn `PAID` 25000 — expected: 2 lần `409 INVOICE_PAID_IMMUTABLE`, `snapshot` bằng trước.
  - [ ] `[PB16-3] PAID transfer and zero-total invoices stay unchanged` — input: `seedPaidTransfer(...,30000)`; đơn `S9ZERO` `complete-zero` (204) — expected: `409 INVOICE_PAID_IMMUTABLE` cả hai; `transfer_attempts` bằng trước; `usedCount` 1; `reversals` 0.
  - [ ] `[PB16-4] PAID invoice of a closed shift returns INVOICE_PAID_IMMUTABLE` — input: đóng ca `countedCash` 125000 (200) rồi MANAGER hủy — expected: `409 INVOICE_PAID_IMMUTABLE`; `snapshot` và `SELECT * FROM cash_reconciliations WHERE work_shift_id=$1` bằng trước.
  - [ ] `[PB16-5] reason is validated before the PAID check` — input: `{}`, `{"reason":"   "}`, `{"reason":"a"×256}` — expected: `422 CANCEL_REASON_REQUIRED` "Cần nhập lý do hủy đơn." ×2, `422 VALIDATION_ERROR` ×1, `snapshot` bằng trước.
  - [ ] `[PB16-6] scope and permission are checked before the PAID check` — input: `sessions.managerB`, `sessions.ownerX`, MANAGER `branch_id` NULL, `sessions.admin`, MANAGER bị thu hồi `invoice.cancel_open` — expected: `404 NOT_FOUND` ×3 với message "Không tìm thấy hóa đơn.", `403 PERMISSION_DENIED` ×2, `snapshot` bằng trước; quyền được khôi phục trong `finally`.
  - [ ] `[PB16-7] OPEN cancel keeps its behaviour for CASHIER and OWNER` — input: như ST-1.AC-7 — expected: `200` `CANCELLED` (CASHIER), `200` `CANCELLED` + `cancelled_by` = `ownerS` (OWNER có ca), `409 SHIFT_NOT_OPEN` + đơn `OPEN` (OWNER không ca, đơn của CASHIER).
  - [ ] `[R1-1] out-of-scope caller without a shift gets 404 when cancelling an OPEN invoice` — input/expected: như `cancel-paid.integration.test.ts:595-611`.
  - [ ] `[PB16-8] uppercase id of a PAID invoice returns INVOICE_PAID_IMMUTABLE` — input: `sold.id.toUpperCase()` — expected: `409 INVOICE_PAID_IMMUTABLE`, `snapshot` bằng trước.
  - [ ] `[PB16-9] legacy CANCELLED invoice stays readable and unchanged` — input: như ST-1.AC-9 — expected: `GET` 200 `status` `CANCELLED` `cancelReason` "Khách trả hàng (cũ)" `cancelledAt` khác null; hủy `409 INVOICE_NOT_OPEN` "Đơn không còn mở."; `snapshot` bằng trước, `reversals` 2; đóng ca `[0, 0, 100000, 'MATCHED']`.
  - [ ] `[B-47] close shift counts only CASH payments in cash_sales_amount` — input/expected: như `cancel-paid.integration.test.ts:637-646` (`[50000, 0, 150000, 'MATCHED']`).
  - [ ] `[PB16-RF2] pay wins a concurrent cancel of the same OPEN invoice` — input: `serialized(pay, cancel)` — expected: pay `201`, cancel `409` code `INVOICE_NOT_OPEN` message "Đơn không còn mở.", `snapshot.invoice.status` `PAID`, `cancel_reason` null, `reversals` 0.
  - [ ] `[PB16-RF5] PAID cancel takes no row lock and writes nothing` — input: đơn `PAID`, MANAGER hủy với `captureSql(t)` — expected: `409`; `lockSequence(sql)` `[]`; `sql.filter(q => /^\s*(INSERT|UPDATE|DELETE)\b/i.test(q))` `[]`.
  - [ ] `test_ST2_AC1_paid_zero_cancelled` (sửa `:30-34`) — input: MANAGER `mgr_a1` hủy đơn `cash` 35000 — expected: `409` `INVOICE_PAID_IMMUTABLE`; báo cáo `[3, 35000, 50000, 85000]`.
  - [ ] Đột biến M-30 (ST-1.AC-14) — input: đột biến đảo thứ tự — expected: ≥1 test `[PB16-5]`/`[PB16-6]` đỏ, log ở `evidence/ST-1/mutation.log`.
- Tiến độ:
  - [ ] Red  - [ ] Green  - [ ] Refactor  - [ ] Test module xanh

### ST-2: Migration gỡ quyền invoice.cancel_paid
- depends_on: ST-1
- Interfaces:
  - Consumes (dùng của sub-task trước): file `POS_API/src/sales/tests/paid-immutable.integration.test.ts` và fixture nội bộ `login(username: string): Promise<Record<string, string>>`, `json(response: Response): Promise<any>`, biến `base: string`, `sessions.ownerS`, `freshShift(): Promise<{ branchId, cashierId, cashier, shiftId, managerId, manager }>` từ ST-1.
  - Produces (sub-task sau sẽ dùng): class `RemoveCancelPaidPermission20261118000001 implements MigrationInterface` với `up(queryRunner: QueryRunner): Promise<void>` và `down(queryRunner: QueryRunner): Promise<void>`; DB sau migration không còn quyền `invoice.cancel_paid` (ST-3 chỉ dựa vào việc API không còn trả quyền này trong `permissions`).
- Mục tiêu: gỡ quyền và dòng cấp quyền khỏi DB bằng migration mới có `down()` khôi phục; cập nhật số migration và test cấp quyền cũ.
- AC riêng:
  - [ ] ST-2.AC-1: Given DB sandbox mới, When `db.runMigrations()`, Then trả 15 migration, lần hai 0 (`foundation.test.ts:38` sửa 14 → 15) (kiểm: integration).
  - [ ] ST-2.AC-2: Given DB đã chạy hết migration, Then `SELECT code FROM permissions WHERE code LIKE 'invoice.cancel%' ORDER BY code` = `[{ code: 'invoice.cancel_open' }]`; vai trò có `invoice.cancel_open` vẫn `['CASHIER','MANAGER','OWNER']`; không vai trò `PLATFORM_ADMIN` nào có quyền `invoice.cancel%` (kiểm: integration).
  - [ ] ST-2.AC-3: Given DB đã chạy hết migration với tập liên kết `A` = `SELECT r.name AS role, p.code FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id ORDER BY r.name, p.code`, When `migration.down(runner)`, Then tập `B` = `A` cộng đúng 2 dòng `{role:'MANAGER', code:X}`, `{role:'OWNER', code:X}` với cùng `X` thỏa `X.startsWith('invoice.cancel_') && X !== 'invoice.cancel_open'`, và `permissions.description` của `X` = `'Hủy đơn đã thanh toán khi ca của đơn còn mở'`; When `migration.up(runner)`, Then tập = `A`; When `migration.up(runner)` lần nữa, Then tập vẫn = `A` (kiểm: integration).
  - [ ] ST-2.AC-4: Given app chạy trên DB đã migrate, When OWNER và MANAGER gọi `GET /api/v1/auth/me`, Then `data.user.permissions.filter(p => p.startsWith('invoice.cancel'))` = `['invoice.cancel_open']`; và MANAGER gọi hủy đơn `PAID` → `409 INVOICE_PAID_IMMUTABLE` (kiểm: integration HTTP, M-10).
  - [ ] ST-2.AC-5: Given `shift-expenses.integration.test.ts` test `[S9-01][ST-1.AC-3] new permissions granted to the decided roles`, Then chỉ còn assert `shift.expense` → `['CASHIER','MANAGER','OWNER']` (dòng `:211` bị bỏ) và test xanh (kiểm: integration).
- Plan chi tiết:
  - File tạo/sửa (path + thay đổi cụ thể):
    - `POS_API/src/database/migrations/20261118000001-RemoveCancelPaidPermission.ts` (TẠO):
      ```ts
      import { MigrationInterface, QueryRunner } from 'typeorm';

      // BR-110 (PB-16): PAID invoices can no longer be cancelled.
      export class RemoveCancelPaidPermission20261118000001 implements MigrationInterface {
        name = 'RemoveCancelPaidPermission20261118000001';

        async up(queryRunner: QueryRunner): Promise<void> {
          await queryRunner.query(`
            DELETE FROM role_permissions
            WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'invoice.cancel_paid');
            DELETE FROM permissions WHERE code = 'invoice.cancel_paid';
          `);
        }

        async down(queryRunner: QueryRunner): Promise<void> {
          await queryRunner.query(`
            INSERT INTO permissions (id, code, description) VALUES
              (gen_random_uuid(), 'invoice.cancel_paid', 'Hủy đơn đã thanh toán khi ca của đơn còn mở')
            ON CONFLICT (code) DO NOTHING;
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id FROM roles r, permissions p
            WHERE r.name IN ('OWNER', 'MANAGER') AND p.code = 'invoice.cancel_paid'
            ON CONFLICT DO NOTHING;
          `);
        }
      }
      ```
    - `POS_API/src/database/tests/remove-cancel-paid-permission.migration.test.ts` (TẠO): theo mẫu `reports-permissions.integration.test.ts:10-26` (`withSandbox`, prefix DB `pos_pb16_migration_`, chỉ cho `localhost`/`127.0.0.1`), hằng `const MIGRATION = 'RemoveCancelPaidPermission20261118000001';`, helper `links(db)` = câu SQL ở ST-2.AC-3, helper `cancelCodes(db)` = `SELECT code FROM permissions WHERE code LIKE 'invoice.cancel%' ORDER BY code`. Hai test:
      - `test_PB16_ST2_AC2_only_cancel_open_remains`
      - `test_PB16_ST2_AC3_down_restores_grants_and_up_removes_them`
      Không gõ chuỗi mã quyền đã gỡ trong file test.
    - `POS_API/src/foundation.test.ts:38`: `14` → `15`.
    - `POS_API/src/shifts/tests/shift-expenses.integration.test.ts:211`: xóa đúng dòng này.
    - `POS_API/src/sales/tests/paid-immutable.integration.test.ts`: THÊM một test con ở cuối khối (trước `} finally {`), tên `[PB16-ST2] OWNER and MANAGER sessions only carry the OPEN cancel permission` (ST-2.AC-4): `GET ${base}/auth/me` với `sessions.ownerS` và `freshShift().manager`, rồi MANAGER hủy một `paidCashInvoice` → `409 INVOICE_PAID_IMMUTABLE`. Không sửa dòng nào khác của file.
  - Chữ ký hàm/class: `export class RemoveCancelPaidPermission20261118000001 implements MigrationInterface { name: string; up(queryRunner: QueryRunner): Promise<void>; down(queryRunner: QueryRunner): Promise<void>; }`.
  - DTO/schema: Không có.
  - DB/migration (bảng, cột, index, rollback): bảng `role_permissions`, `permissions` (chỉ xóa/chèn dòng); không cột/index mới; rollback = `down()` chèn lại như `ShiftExpenses.ts:19-27`.
  - API: Không đổi endpoint; `GET /api/v1/auth/me` không còn trả `invoice.cancel_paid` cho OWNER/MANAGER.
  - Các bước xử lý:
    1. Đọc M-29, M-10, `.devloopflow/errors/20261111-manager-cancel-open-behavior-untested.md`.
    2. Viết `remove-cancel-paid-permission.migration.test.ts`, sửa `foundation.test.ts:38`, thêm `[PB16-ST2]` (Red: migration chưa có → `runMigrations` 14, `cancelCodes` có 2 dòng, `/auth/me` còn quyền, không tìm thấy migration).
    3. Tạo file migration (Green).
    4. Xóa `shift-expenses.integration.test.ts:211`.
    5. `npm run build`, chạy từng file test, rồi `npm test` toàn bộ (M-29).
  - Quy tắc nghiệp vụ (kèm nguồn): user quyết (b) "Gỡ khỏi DB bằng migration mới"; chỉ thêm migration mới, không sửa migration đã chạy (`AGENTS.md`/`CLAUDE.md` mục Cấu trúc mã; spec `:31,51`).
  - Bảng edge case:
    - DB không có quyền (đã gỡ tay) → `up()` xóa 0 dòng, không lỗi.
    - `down()` chạy khi quyền đã tồn tại → `ON CONFLICT DO NOTHING`, không trùng.
    - `up()` chạy hai lần → tập liên kết không đổi.
    - Dòng `role_permissions` của quyền khác → không bị chạm (so `A`).
  - Ảnh hưởng tới code hiện có: `foundation.test.ts:38`; `shift-expenses.integration.test.ts:211`; `reports-permissions.integration.test.ts` và `invoices-read.integration.test.ts` `[T1-permission]` gọi `down/up` của migration khác theo tên/class nên không bị ảnh hưởng (đã kiểm `:91-103`, `:431-449`).
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `.devloopflow/errors/20261111-manager-cancel-open-behavior-untested.md` → "Mỗi lần đổi quyền theo vai trò phải có test hành vi qua HTTP với vai trò thật (đường chính, thiếu điều kiện, khác phạm vi, thiếu quyền), không chỉ kiểm bảng cấp quyền." (đường chính và thiếu điều kiện/khác phạm vi/thiếu quyền của endpoint hủy đã phủ ở ST-1 `[PB16-1]`, `[PB16-2]`, `[PB16-6]` chạy trên DB đã có migration này; ST-2 thêm `[PB16-ST2]`).
- Quy tắc code cho `tdd` (Ponytail): thay đổi nhỏ nhất đủ yêu cầu, tái dùng mã có sẵn (mẫu `withSandbox`, câu SQL của `ShiftExpenses`), không cắt bảo mật/toàn vẹn dữ liệu/nghiệm thu. Test mới ở khối riêng; báo `git diff HEAD --numstat` cho `foundation.test.ts` (1 thêm, 1 xóa) và `shift-expenses.integration.test.ts` (0 thêm, 1 xóa) (M-49).
- Test viết trước:
  - [ ] `test_PB16_ST2_AC2_only_cancel_open_remains` — input: sandbox đã `runMigrations()` — expected: `cancelCodes` = `[{code:'invoice.cancel_open'}]`; vai trò có `invoice.cancel_open` = `['CASHIER','MANAGER','OWNER']`; 0 dòng `PLATFORM_ADMIN` có `invoice.cancel%`.
  - [ ] `test_PB16_ST2_AC3_down_restores_grants_and_up_removes_them` — input: `A = links(db)`; `down`; `up`; `up` — expected: như ST-2.AC-3.
  - [ ] `foundation.test.ts` test hiện có (dòng `:38`) — input: sandbox mới — expected: `runMigrations().length` 15 rồi 0.
  - [ ] `[PB16-ST2] OWNER and MANAGER sessions only carry the OPEN cancel permission` — input: `/auth/me` OWNER, MANAGER; MANAGER hủy đơn `PAID` — expected: `['invoice.cancel_open']` ×2; `409 INVOICE_PAID_IMMUTABLE`.
  - [ ] `[S9-01][ST-1.AC-3] new permissions granted to the decided roles` (đã bỏ `:211`) — input: DB đã migrate — expected: `roles('shift.expense')` = `['CASHIER','MANAGER','OWNER']`.
- Tiến độ:
  - [ ] Red  - [ ] Green  - [ ] Refactor  - [ ] Test module xanh

### ST-3: UI bỏ thao tác hủy đơn đã thanh toán
- depends_on: ST-1
- Interfaces:
  - Consumes (dùng của sub-task trước): hợp đồng lỗi HTTP của ST-1: `409` `{ error: { code: 'INVOICE_PAID_IMMUTABLE', message: 'Đơn đã thanh toán không thể hủy.', details: [], requestId: string } }`; client `request()` chuyển thành lỗi có `status`, `code`, `message`, `requestId` (dùng sẵn ở `CancelInvoiceModal.tsx:79-80`). `invoiceService.cancelInvoice(invoiceId: string, reason: string): Promise<InvoiceDetail>` (không đổi, `invoiceService.ts:20`).
  - Produces (sub-task sau sẽ dùng): Không có.
- Mục tiêu: UI không còn đường nào hủy đơn `PAID`; mock và kiểu quyền khớp; test UI phản ánh hành vi mới.
- AC riêng:
  - [ ] ST-3.AC-1: Given `InvoiceDetailDrawer` với hóa đơn `status: 'PAID'`, `workShiftStatus: 'OPEN'`, quyền `['invoice.cancel_open','shift.read']`, `currentShift` khớp ca, Then cây render không có `Button` nào (không có nút "Hủy hóa đơn này"); với hóa đơn `OPEN` và ca thu ngân của chính mình, Then có `Button` với `disabled` = `false`; với `OPEN` và `currentShift` `null`, Then `disabled` = `true` (kiểm: unit `node:test`).
  - [ ] ST-3.AC-2: Given `CancelInvoiceModal` với hóa đơn `PAID`, Then `Button` variant `danger` có `disabled` = `true` và submit form không gọi `getInvoiceById` (`gets.length` 0) và không POST; câu hướng dẫn không chứa "Hoàn lại", "Hoàn tiền chuyển khoản ngoài hệ thống", "Không có khoản thanh toán" (kiểm: unit).
  - [ ] ST-3.AC-3: Given hộp thoại hủy đơn `OPEN` của ca mình, When POST bị từ chối lần lượt với `[code,status]` ∈ `[['INVOICE_PAID_IMMUTABLE',409],['INVOICE_NOT_OPEN',409],['TRANSFER_PENDING',409],['PERMISSION_DENIED',403],['NOT_FOUND',404]]` (`message` = code, `requestId` `'req'`), Then chữ hiển thị chứa code và `req`, `gets.length` = 2, `success.length` = 0 (kiểm: unit).
  - [ ] ST-3.AC-4: Given hộp thoại đơn `OPEN`, When server trả `{status:409, code:'INVOICE_PAID_IMMUTABLE', message:'Đơn đã thanh toán không thể hủy.', requestId:'req'}`, Then chữ hiển thị chứa "Đơn đã thanh toán không thể hủy. (Mã yêu cầu: req)", `gets.length` 2, `success.length` 0 (kiểm: unit).
  - [ ] ST-3.AC-5: Given phiên chỉ có `invoice.read` hoặc `invoice.cancel_open`, Then rail có "Hóa đơn" (`app-shell-products.test.mjs` `[B-63]` giữ các dòng đó); route `invoices` của OWNER/MANAGER (danh sách quyền không còn `invoice.cancel_paid`) vẫn render `InvoicesScreen` (`app-routes.test.mjs`, `app-router.test.mjs` xanh) (kiểm: unit).
  - [ ] ST-3.AC-6: Given mã nguồn UI sau sửa, When `npm run typecheck` trong `POS_UI/`, Then exit 0 (union `PermissionCode` không còn `'invoice.cancel_paid'`, mọi chỗ dùng đã gỡ) (kiểm: typecheck).
  - [ ] ST-3.AC-7: Given sau ST-1..ST-3, When chạy từ gốc repo `rg -n "invoice\.cancel_paid|CANCEL_NOT_ALLOWED|CANCEL_EXCEEDS_DRAWER" POS_API/src POS_UI/src POS_UI/test -g "!**/database/migrations/**"` (loại trừ cả migration cũ và mới, user duyệt), Then không in dòng nào, exit 1 (kiểm: lệnh `rg`; lưu output vào `evidence/ST-3/rg.log`).
  - [ ] ST-3.AC-8: Given `node --test test/stock-ledger-router.browser.mjs` trong `POS_UI/` (Chrome/Chromium), Then 0 fail (kiểm: browser test; nếu máy không có Chrome thì ghi "chưa chạy: <lý do>", không suy PASS).
- Plan chi tiết:
  - File tạo/sửa (path + thay đổi cụ thể):
    - `POS_UI/src/features/invoices/InvoiceDetailDrawer.tsx`: xóa `:37` (`canCancelPaid`); xóa khối `} else if (isPaid) { ... }` `:50-57` (giữ `}` đóng của `if (isOpenStatus)`); `:194` đổi thành `{isOpenStatus && canCancelOpen && (`. Giữ `isPaid` (badge `:81,84`), `isCancelled` (`:95`), `isShiftOpen` (`:45`).
    - `POS_UI/src/features/invoices/CancelInvoiceModal.tsx`: xóa import `formatVND` `:10`; xóa `:32` `isPaid`; `:33` thành `const canConfirm = invoice.workShiftStatus === 'OPEN' && invoice.status === 'OPEN' && session.permissions.includes('invoice.cancel_open') && session.permissions.includes('shift.read');`; `:96` thành `<p>Đơn hàng sẽ chuyển sang trạng thái đã hủy.</p>`. Giữ nguyên `:58-86` (đọc lại, lỗi server, tải lại).
    - `POS_UI/src/app/App.tsx:109`: `if (!has('invoice.read') && !has('invoice.cancel_open')) {`.
    - `POS_UI/src/app/navigation.ts:32`: `if (has('invoice.read') || has('invoice.cancel_open')) tabs.push('invoices');`.
    - `POS_UI/src/types/auth.ts:32`: xóa dòng `| 'invoice.cancel_paid' ...`.
    - `POS_UI/src/mock/mockEngine.ts`: thay khối `if (invoice.status === 'PAID') { ... }` `:785-855` bằng `if (invoice.status === 'PAID') throw new Error('Đơn đã thanh toán không thể hủy.');` (BR-110); xóa `'invoice.cancel_paid',` `:953`. Sau sửa, chạy `rg -n "\bStockMovement\b" POS_UI/src/mock/mockEngine.ts`: còn dùng ở `:697` thì giữ import.
    - `POS_UI/src/mock/seedData.ts`: xóa `'invoice.cancel_paid',` ở `:567` và `:580`.
    - `POS_UI/test/invoice-cancel.test.mjs`:
      - `:8` quyền mặc định `['invoice.cancel_open','shift.read']`.
      - `:19` `base` đổi thành `{id:'i',invoiceCode:'HD1',status:'OPEN',paymentMethod:null,totalAmount:95000,workShiftStatus:'OPEN',workShiftId:'s'}`; thêm hằng `const mine={id:'s',userId:'u',status:'OPEN',shiftType:'CASHIER'};` và helper `const toPost=async(h,inv=base)=>{h.gets[0].resolve(inv);await h.flush();h.shifts[0].resolve(mine);await h.flush()};` ngay dưới `base`.
      - `:21` (`T5-method and T5-zero`): thay bằng test `PB16: PAID invoice cannot be confirmed and shows no refund guide` (ST-3.AC-2).
      - `:22`, `:23`, `:26`, `:27`, `:31`: giữ ý nghĩa; chỗ nào đang `h.gets[0].resolve(base);await h.flush();` rồi chờ POST thì đổi thành `await toPost(h);` vì đơn `OPEN` phải qua bước đọc ca (mẫu `:34`).
      - `:28` (`T5-stale: thay OPEN thành PAID cần xác nhận mới`): đổi `h.gets[0].resolve(base)` thành `h.gets[0].resolve({...open,status:'PAID',paymentMethod:'CASH'})`; giữ assert `posts.length` 0, `success.length` 0 (RF-1).
      - `:30`: đổi mã lỗi thành `{status:409,code:'INVOICE_PAID_IMMUTABLE',message:'Đơn đã thanh toán không thể hủy.',requestId:'req'}`, dùng `toPost`, assert chữ chứa "Đơn đã thanh toán không thể hủy. (Mã yêu cầu: req)" (ST-3.AC-4).
      - `:33`, `:34`, `:39`: giữ (đã dùng `{...base,status:'OPEN',...}`).
      - `:36`: danh sách mã đổi thành `[['INVOICE_PAID_IMMUTABLE',409],['INVOICE_NOT_OPEN',409],['TRANSFER_PENDING',409],['PERMISSION_DENIED',403],['NOT_FOUND',404]]`, dùng `toPost` (ST-3.AC-3).
      - `:37`: đổi tên thành `T5-open-shift: drawer enables OPEN only for own current cashier shift; PAID has no cancel button`; `permissions` ban đầu `['invoice.cancel_open','shift.read']`; phần `PAID` assert `find(...)` trả `undefined` (ST-3.AC-1).
    - `POS_UI/test/app-shell-products.test.mjs:40`: xóa dòng `['invoice.cancel_paid', 'Hóa đơn', true],`.
    - `POS_UI/test/app-router.test.mjs:27`, `POS_UI/test/app-routes.test.mjs:7-8`, `POS_UI/test/stock-ledger-router.browser.mjs:47-48`: xóa phần tử `'invoice.cancel_paid', ` khỏi mảng quyền (giữ nguyên các phần tử khác và thứ tự).
  - Chữ ký hàm/class: không đổi (`CancelInvoiceModal: React.FC<CancelInvoiceModalProps>`, `InvoiceDetailDrawer: React.FC<InvoiceDetailDrawerProps>`, `MockEngine.cancelInvoice(invoiceId: string, reason: string): Invoice`).
  - DTO/schema: union `PermissionCode` (`types/auth.ts`) bỏ `'invoice.cancel_paid'`.
  - DB/migration: Không có.
  - API: không đổi service; dùng hợp đồng lỗi ST-1.
  - Các bước xử lý:
    1. Đọc M-28 và harness `invoice-cancel.test.mjs:9-17` trước khi sửa (không thêm import mới vào hai component; nếu thêm thì cập nhật `require` giả).
    2. Sửa test UI như trên (Red: `:21` mới, `:30`, `:36`, `:37` đỏ với mã cũ).
    3. Sửa `InvoiceDetailDrawer.tsx`, `CancelInvoiceModal.tsx`, `App.tsx`, `navigation.ts`, `types/auth.ts`, `mockEngine.ts`, `seedData.ts` (Green).
    4. `npm run typecheck`, `npm test`, `npm run build` trong `POS_UI/`; `node --test test/stock-ledger-router.browser.mjs`.
    5. Chạy lệnh `rg` của ST-3.AC-7 từ gốc repo, lưu output.
  - Quy tắc nghiệp vụ (kèm nguồn): BR-110; `DESIGN.md:874` "bỏ nút hủy đơn đã thanh toán ở ngăn chi tiết Hóa đơn (mục 5, mục 8, mục 9) khi BR-110 được triển khai. Đơn `OPEN` vẫn hủy được."; spec `:16` "Khi người dùng bấm hủy một đơn vừa được thanh toán (ví dụ ở máy khác), UI hiện thông báo từ server, tải lại đơn và không báo thành công."
  - Bảng edge case:
    - Hóa đơn `PAID`, người có `invoice.cancel_open` → không nút.
    - Hóa đơn `CANCELLED` → không nút (như cũ).
    - Hóa đơn `OPEN`, không có ca của mình → nút `disabled`, `disabledReason` "Cần ca thu ngân đang mở của bạn để hủy đơn này." (như cũ).
    - Hộp thoại mở trên đơn `OPEN`, đọc lại thấy `PAID` → không POST, hiện "Hóa đơn hoặc ca đã thay đổi..." (như cũ, RF-1).
    - POST bị `409 INVOICE_PAID_IMMUTABLE` → hiện message server + mã yêu cầu, tải lại, không báo thành công.
  - Ảnh hưởng tới code hiện có: `InvoicesScreen.tsx:169-170` dùng hai component, không đổi props. `LivePosScreen.tsx` dùng `invoice.cancel_open` (không đổi). `adminService.ts:51-52` gọi `MockEngine.updateRolePermissions` (danh sách `operationalPerms` bớt một phần tử).
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: Không có lỗi `.devloopflow/errors/` riêng cho UI hủy đơn; áp dụng M-28 ("Trước khi thêm import mới hoặc đổi cấu trúc nút, đọc harness của test. ...") và M-42 (không đổi message mặc định của client dùng chung).
- Quy tắc code cho `tdd` (Ponytail): thay đổi nhỏ nhất đủ yêu cầu, tái dùng luồng lỗi/tải lại sẵn có của `CancelInvoiceModal`, không thêm component/helper mới ngoài `toPost` trong test, không cắt bảo mật/toàn vẹn dữ liệu/nghiệm thu. Báo `git diff HEAD --numstat` cho từng file test UI và liệt kê lý do từng dòng xóa (M-49).
- Test viết trước:
  - [ ] `PB16: PAID invoice cannot be confirmed and shows no refund guide` — input: `setup({...base,status:'PAID',paymentMethod:'CASH'})`, nhập lý do, submit — expected: nút `danger` `disabled` true; `gets.length` 0; `posts.length` 0; `text()` không chứa "Hoàn lại", "Hoàn tiền chuyển khoản ngoài hệ thống", "Không có khoản thanh toán".
  - [ ] `T5-stale: server error triggers reload` (sửa) — input: OPEN, POST reject `INVOICE_PAID_IMMUTABLE` — expected: chữ chứa "Đơn đã thanh toán không thể hủy. (Mã yêu cầu: req)", `gets.length` 2, `success.length` 0.
  - [ ] `T5-stale: server rejection codes show server message and reload without success` (sửa) — input: 5 mã ở ST-3.AC-3 — expected: như ST-3.AC-3.
  - [ ] `T5-stale: thay OPEN thành PAID cần xác nhận mới` (sửa) — input: OPEN, GET trả PAID — expected: `posts.length` 0, `success.length` 0.
  - [ ] `T5-open-shift: drawer enables OPEN only for own current cashier shift; PAID has no cancel button` (sửa) — input: như ST-3.AC-1 — expected: OPEN không ca `disabled` true; OPEN ca mình `disabled` false; PAID không `Button`.
  - [ ] `T5-layout`, `T5-stale: đọc lại trước POST và dừng khi ca đóng`, `T5-uncertain: chặn gửi đôi...`, `T5-method: lý do rỗng hoặc quá dài...`, `T5-uncertain: mất phản hồi...`, `T5-uncertain: late POST...`, `T5-open-shift: only current cashier shift...`, `T5-open-shift: matching shift posts...`, `T5-open-shift: missing shift read permission cannot submit` — input: `base` OPEN mới (+ `toPost` khi cần POST) — expected: assert hiện có giữ nguyên ý nghĩa, xanh.
  - [ ] `[B-63] rail dùng cùng quyền với route cho người chỉ được đọc đơn hoặc đọc bàn` (bỏ dòng `:40`) — input/expected: các dòng còn lại như cũ.
  - [ ] `app-routes.test.mjs`, `app-router.test.mjs` (mảng quyền bớt phần tử) — expected: xanh như trước.
  - [ ] `stock-ledger-router.browser.mjs` (mảng quyền bớt phần tử) — expected: 0 fail.
  - [ ] Lệnh `rg` ST-3.AC-7 — expected: không có dòng, exit 1.
- Tiến độ:
  - [ ] Red  - [ ] Green  - [ ] Refactor  - [ ] Test module xanh

### ST-4: Kiểm toàn bộ build và test
- depends_on: ST-2, ST-3
- Interfaces:
  - Consumes (dùng của sub-task trước): mã và test sau ST-1, ST-2, ST-3.
  - Produces (sub-task sau sẽ dùng): Không có.
- Mục tiêu: chứng minh không hỏng phần khác (thanh toán, ca, báo cáo, Sổ kho) bằng chạy toàn bộ.
- AC riêng:
  - [ ] ST-4.AC-1: Given PostgreSQL Docker `pos_infra-postgres-1` ở `127.0.0.1:15432` và Redis thật (`REDIS_URL`, ví dụ `redis://127.0.0.1:6379/15`) theo M-34 và `.devloopflow/devloopflow.md` mục 2, When `cd POS_API && npm test`, Then exit 0, dòng tổng kết `# fail 0` (kiểm: output lưu `evidence/ST-4/api-test.log`).
  - [ ] ST-4.AC-2: When `cd POS_UI && npm run typecheck && npm run build && npm test`, Then cả ba exit 0, `# fail 0` (kiểm: output lưu `evidence/ST-4/ui.log`).
  - [ ] ST-4.AC-3: When chạy lại lệnh `rg` của ST-3.AC-7 (loại trừ toàn thư mục `POS_API/src/database/migrations/`, cả migration cũ và mới, theo Câu hỏi 2 user đã duyệt), Then không in dòng nào, exit 1 (kiểm: `evidence/ST-4/rg.log`).
- Plan chi tiết:
  - File tạo/sửa: không sửa mã; chỉ ghi log vào `.devloopflow/verify/20261118-sprint11-pb16-remove-cancel-paid/evidence/ST-4/`.
  - Chữ ký hàm/class: Không có.
  - DTO/schema: Không có.
  - DB/migration: Không có.
  - API: Không có.
  - Các bước xử lý:
    1. Kiểm `POS_API/dist/sales/tests/` không còn `cancel-paid.integration.test.js`.
    2. Chạy `npm test` API (dựng `DATABASE_URL` từ `POS_INFRA/.env.local` trong lệnh, không in bí mật, M-34).
    3. Chạy lệnh UI.
    4. Chạy `rg`.
  - Quy tắc nghiệp vụ: Không có.
  - Bảng edge case: Docker/Chrome không chạy → ghi "chưa chạy: <lý do>", không suy PASS (`CLAUDE.md` mục Tổng quan kỹ thuật).
  - Ảnh hưởng tới code hiện có: Không có.
  - Tác dụng phụ: test tạo và xóa DB thử ngẫu nhiên.
- Lỗi cũ liên quan: Không có.
- Quy tắc code cho `tdd` (Ponytail): không sửa mã ở sub-task này; test đỏ thì quay lại sub-task sở hữu, sửa nguyên nhân gốc, không sửa/skip test để xanh.
- Test viết trước:
  - [ ] `npm test` (POS_API) — input: toàn bộ `dist/**/*.test.js` — expected: `# fail 0`, exit 0.
  - [ ] `npm run typecheck`, `npm run build`, `npm test` (POS_UI) — expected: exit 0, `# fail 0`.
  - [ ] Lệnh `rg` ST-3.AC-7 — expected: exit 1, không có dòng.
- Tiến độ:
  - [ ] Red  - [ ] Green  - [ ] Refactor  - [ ] Test module xanh

### ST-5: Đề xuất đồng bộ tài liệu (agent chính / sync-docs, KHÔNG giao tdd)
- depends_on: ST-4
- Interfaces:
  - Consumes (dùng của sub-task trước): hợp đồng lỗi `409 INVOICE_PAID_IMMUTABLE` "Đơn đã thanh toán không thể hủy." (ST-1); migration `20261118000001-RemoveCancelPaidPermission.ts` (ST-2).
  - Produces (sub-task sau sẽ dùng): Không có.
- Mục tiêu: tài liệu hiện hành khớp mã (spec Mục tiêu `:25`, M-4). Theo `CLAUDE.md`/`AGENTS.md` và `conventions` ("không tự ý ghi vào `docs/` của dự án ... ngoại lệ duy nhất: skill `sync-docs` sửa tài liệu liên quan sau khi task xong, chỉ từng chỗ user đã duyệt"), sub-task này chỉ liệt kê đề xuất; agent chính trình user duyệt từng chỗ rồi `sync-docs` sửa. `tdd` KHÔNG sửa các file dưới đây.
- AC riêng:
  - [ ] ST-5.AC-1: Given user đã duyệt từng chỗ, When chạy lệnh `rg` của E2E-AC-9, Then không in dòng nào (exit 1) và `rg -n "INVOICE_PAID_IMMUTABLE" docs/api-spec.md` có ≥1 dòng thuộc bảng mã lỗi với HTTP `409` và message "Đơn đã thanh toán không thể hủy." (kiểm: lệnh `rg`, `sync-docs`).
  - [ ] ST-5.AC-2: Given `README.md`, Then `README.md:9` không còn nói API hỗ trợ hủy hóa đơn đã thanh toán; `README.md:15` (kết quả QA lịch sử Sprint 09) giữ nguyên byte (kiểm: `git diff -- README.md` chỉ chạm dòng 9).
- Plan chi tiết:
  - File đề xuất sửa (agent chính trình user; nội dung câu mới do `sync-docs` soạn và user duyệt):
    - `docs/BUSINESS_RULES.md:143,151,176,189,230,251` (BR-21, BR-29, BR-39, BR-47 và sơ đồ/vòng đời liên quan hủy `PAID`) và `:308` BR-110 (bỏ câu "Mã và test chưa đổi", không còn nêu `CANCEL_NOT_ALLOWED`/`CANCEL_EXCEEDS_DRAWER`, ghi đã triển khai PB-16).
    - `docs/api-spec.md:353` (dòng `INVOICE_NOT_OPEN`: bỏ "/`PAID`"), `:362` (`CANCEL_NOT_ALLOWED`: gỡ), `:379` (`CANCEL_EXCEEDS_DRAWER`: gỡ), thêm dòng `INVOICE_PAID_IMMUTABLE | 409 | BR-110 | Hủy đơn đã thanh toán`, `:460`, `:524` (mô tả endpoint hủy).
    - `docs/DESIGN_DB_POS_SYSTEM.md:639` (đoạn "Hủy đơn đã PAID"), `:744-746` (mục BR-110: ghi đã gỡ quyền bằng migration `20261118000001-RemoveCancelPaidPermission`, CHECK giữ nguyên).
    - `docs/PRODUCT_OVERVIEW.md:75,132,182`.
    - `DESIGN.md:611` (message "Cần quyền quản lý để hủy đơn đã thanh toán."), `:874` (ghi đã triển khai).
    - `README.md:9`.
    - `docs/PRODUCT_BACKLOG.md` (trạng thái PB-16; `:131` dòng lịch sử PB-10/PB-11 do user quyết giữ hay ghi chú).
    - `sprints/sprint-11/SPRINT.md:22,36,37` (trạng thái S11-01, S11-02).
    - `.devloopflow/devloopflow.md` mục 2 (số test API/UI sau task) — file plugin, `sync-docs` tự cập nhật rồi báo.
    - Không sửa: `.devloopflow/specs/` lịch sử, `sprints/sprint-09/` và sprint cũ, `README.md:15`.
  - Chữ ký hàm/class: Không có.
  - DTO/schema: Không có.
  - DB/migration: Không có.
  - API: Không có.
  - Các bước xử lý:
    1. Agent chính chạy `rg` của E2E-AC-9 để lấy danh sách dòng hiện tại.
    2. Trình user từng chỗ kèm câu đề xuất.
    3. `sync-docs` sửa đúng chỗ đã duyệt.
    4. Chạy lại `rg` của E2E-AC-9; chạy Graphify semantic update cho Markdown đã sửa theo `CLAUDE.md` mục Graphify; chạy `graphify update .` sau khi code ST-1..ST-3 xong.
  - Quy tắc nghiệp vụ: M-4; `CLAUDE.md` mục "Cách làm việc" và "Hồ sơ công việc".
  - Bảng edge case: user không duyệt một chỗ → ghi lại trong task file, E2E-AC-9 báo dòng còn lại và trạng thái FAIL/chờ quyết của user, không tự sửa.
  - Ảnh hưởng tới code hiện có: Không có.
  - Tác dụng phụ: Graphify cập nhật graph.
- Lỗi cũ liên quan: `.devloopflow/errors/20261111-plan-spec-missing-manager-cancel-decision.md` (INDEX: "R16-3 quyết định MANAGER hủy đơn chưa ghi vào plan/spec/task") — áp dụng: ghi quyết định tài liệu vào task file.
- Quy tắc code cho `tdd` (Ponytail): không áp dụng — ST-5 không giao `tdd`.
- Test viết trước:
  - [ ] Lệnh `rg` E2E-AC-9 — input: tài liệu sau `sync-docs` — expected: exit 1, không dòng; `rg -n "INVOICE_PAID_IMMUTABLE" docs/api-spec.md` ≥1 dòng.
  - [ ] `git diff --stat -- README.md` — expected: chỉ dòng 9 đổi.
- Tiến độ:
  - [ ] Red  - [ ] Green  - [ ] Refactor  - [ ] Test module xanh

## Ma trận AC ↔ test
| AC | Test | Input | Expected |
|----|------|-------|----------|
| E2E-AC-1, ST-1.AC-1 | `[PB16-1] manager cancelling a PAID cash invoice gets INVOICE_PAID_IMMUTABLE and nothing changes` | MANAGER, `PAID` 45000 `S9PROMO`, `{"reason":"Khách trả hàng"}` | `409 INVOICE_PAID_IMMUTABLE` "Đơn đã thanh toán không thể hủy.", `details` `[]`, snapshot không đổi |
| E2E-AC-2, ST-1.AC-2 | `[PB16-2] owner without a shift and cashier owning the shift get INVOICE_PAID_IMMUTABLE` | OWNER không ca, CASHIER chủ ca | `409` ×2, snapshot không đổi |
| ST-1.AC-3 | `[PB16-3] PAID transfer and zero-total invoices stay unchanged` | `PAID` TRANSFER 30000, `PAID` 0đ `S9ZERO` | `409` ×2; `transfer_attempts`, `used_count` 1, 0 `SALE_REVERSAL` |
| ST-1.AC-4 | `[PB16-4] PAID invoice of a closed shift returns INVOICE_PAID_IMMUTABLE` | ca đóng `countedCash` 125000 | `409 INVOICE_PAID_IMMUTABLE`, `cash_reconciliations` không đổi |
| ST-1.AC-5, ST-1.AC-14 | `[PB16-5] reason is validated before the PAID check` + đột biến | `{}`, `"   "`, 256 ký tự | `422 CANCEL_REASON_REQUIRED` ×2, `422 VALIDATION_ERROR`; đột biến làm đỏ |
| ST-1.AC-6, ST-1.AC-14 | `[PB16-6] scope and permission are checked before the PAID check` + đột biến | managerB, ownerX, MANAGER NULL branch, admin, MANAGER thu hồi `invoice.cancel_open` | `404 NOT_FOUND` ×3, `403 PERMISSION_DENIED` ×2 |
| E2E-AC-3, ST-1.AC-7 | `[PB16-7] OPEN cancel keeps its behaviour for CASHIER and OWNER`; `[MGR-CANCEL-1]` (không sửa) | CASHIER/OWNER/MANAGER chủ ca hủy `OPEN`; OWNER không ca | `200 CANCELLED`; `409 SHIFT_NOT_OPEN` |
| ST-1.AC-8 | `[R1-1] out-of-scope caller without a shift gets 404 when cancelling an OPEN invoice`; `ls POS_API/dist/sales/tests/` | managerB, MANAGER NULL branch | `404 NOT_FOUND`; không còn `cancel-paid.integration.test.js` |
| E2E-AC-4, ST-1.AC-9 | `[PB16-9] legacy CANCELLED invoice stays readable and unchanged` | `CANCELLED` cũ + 2 `SALE_REVERSAL` | `GET` 200; hủy `409 INVOICE_NOT_OPEN`; đóng ca `[0,0,100000,'MATCHED']` |
| E2E-AC-5, ST-1.AC-10 | `test_ST2_AC1_paid_zero_cancelled` | MANAGER hủy `PAID` 35000 | `409 INVOICE_PAID_IMMUTABLE`; báo cáo `[3,35000,50000,85000]` |
| ST-1.AC-11, RF-2 | `[PB16-RF2] pay wins a concurrent cancel of the same OPEN invoice` | pay rồi cancel nối tiếp trên khóa ca | pay `201`; cancel `409 INVOICE_NOT_OPEN`; `PAID`, 0 `SALE_REVERSAL` |
| ST-1.AC-12, RF-5 | `[PB16-RF5] PAID cancel takes no row lock and writes nothing` | MANAGER hủy `PAID` + `captureSql` | `lockSequence` `[]`; 0 câu ghi |
| ST-1.AC-13, RF-3 | `[PB16-8] uppercase id of a PAID invoice returns INVOICE_PAID_IMMUTABLE` | `id.toUpperCase()` | `409 INVOICE_PAID_IMMUTABLE` |
| (hồi quy đối soát) ST-1.AC-9 | `[B-47] close shift counts only CASH payments in cash_sales_amount` | CASH 50000 + TRANSFER 30000, `countedCash` 150000 | `[50000,0,150000,'MATCHED']` |
| E2E-AC-6, ST-2.AC-1 | `foundation.test.ts` (dòng `:38`) | sandbox mới | 15 rồi 0 |
| E2E-AC-6, ST-2.AC-2 | `test_PB16_ST2_AC2_only_cancel_open_remains` | DB đã migrate | chỉ `invoice.cancel_open`; vai trò `['CASHIER','MANAGER','OWNER']` |
| ST-2.AC-3 | `test_PB16_ST2_AC3_down_restores_grants_and_up_removes_them` | `down`, `up`, `up` | `B = A + 2 dòng MANAGER/OWNER`; rồi `= A` ×2 |
| E2E-AC-6, ST-2.AC-4 | `[PB16-ST2] OWNER and MANAGER sessions only carry the OPEN cancel permission` | `/auth/me` OWNER, MANAGER; MANAGER hủy `PAID` | `['invoice.cancel_open']` ×2; `409` |
| ST-2.AC-5 | `[S9-01][ST-1.AC-3] new permissions granted to the decided roles` | DB đã migrate | `shift.expense` → 3 vai trò |
| E2E-AC-7, ST-3.AC-1 | `T5-open-shift: drawer enables OPEN only for own current cashier shift; PAID has no cancel button` | OPEN không ca / ca mình; PAID | `disabled` true / false; PAID không `Button` |
| ST-3.AC-2 | `PB16: PAID invoice cannot be confirmed and shows no refund guide` | modal `PAID` | nút `disabled`; 0 GET; 0 POST; không có câu hoàn tiền |
| ST-3.AC-3 | `T5-stale: server rejection codes show server message and reload without success` | 5 mã lỗi | chữ chứa code + `req`; `gets` 2; `success` 0 |
| E2E-AC-7, ST-3.AC-4 | `T5-stale: server error triggers reload` | POST reject `INVOICE_PAID_IMMUTABLE` | "Đơn đã thanh toán không thể hủy. (Mã yêu cầu: req)"; `gets` 2; `success` 0 |
| RF-1 | `T5-stale: thay OPEN thành PAID cần xác nhận mới` | OPEN, GET trả PAID | 0 POST, 0 success |
| ST-3.AC-5 | `[B-63] rail dùng cùng quyền ...`; `app-routes.test.mjs`; `app-router.test.mjs` | phiên quyền mới | "Hóa đơn" với `invoice.read`/`invoice.cancel_open`; route render `InvoicesScreen` |
| ST-3.AC-6 | `npm run typecheck` (POS_UI) | mã UI | exit 0 |
| E2E-AC-8, ST-3.AC-7, ST-4.AC-3 | lệnh `rg` mã/test | `POS_API/src POS_UI/src POS_UI/test` trừ migrations | exit 1, không dòng |
| ST-3.AC-8 | `node --test test/stock-ledger-router.browser.mjs` | Chrome | 0 fail |
| E2E-AC-10, ST-4.AC-1 | `npm test` (POS_API) | toàn bộ | `# fail 0`, exit 0 |
| E2E-AC-10, ST-4.AC-2 | `npm run typecheck && npm run build && npm test` (POS_UI) | toàn bộ | exit 0, `# fail 0` |
| E2E-AC-9, ST-5.AC-1 | lệnh `rg` tài liệu + `rg INVOICE_PAID_IMMUTABLE docs/api-spec.md` | tài liệu sau `sync-docs` | exit 1; ≥1 dòng |
| ST-5.AC-2 | `git diff -- README.md` | README sau `sync-docs` | chỉ dòng 9 đổi |
| RF-4 | `npm test` (POS_API) + `ls POS_API/dist/sales/tests/` | dist sau build | không còn file cũ, `# fail 0` |

## Rủi ro
- File `.js` cũ trong `POS_API/dist/` chạy lại test hủy `PAID` cũ và đỏ (RF-4) — cách giảm: ST-1 xóa đúng file sinh ra của `cancel-paid.integration.test.ts`; ST-4 kiểm `ls`. CI build sạch nên không bị.
- Viết lại `invoice-cancel.test.mjs` (file một dòng một test) làm mất ý nghĩa test cũ — cách giảm: plan liệt kê từng dòng, giữ assert, chỉ đổi dữ liệu `base`/bước đọc ca; báo `numstat` (M-49).
- Test đua thời gian `[PB16-RF2]` phụ thuộc `waitLock` (chờ tối đa 10 s) — cách giảm: tái dùng `serialized`/`waitLock` đã ổn định ở file cũ (`:464-494`).
- Client chỉ dựa vào `INVOICE_PAID_IMMUTABLE` để nhận ra đơn đã thanh toán sẽ bỏ sót trường hợp đua thời gian (trả `INVOICE_NOT_OPEN`, G-2) — cách giảm: UI xử lý mọi lỗi 4xx giống nhau (hiện message server, tải lại đơn, `CancelInvoiceModal.tsx:77-85`); ST-3.AC-3 phủ cả hai mã.
- Tài liệu (ST-5) cần user duyệt từng chỗ; E2E-AC-9 chỉ đạt sau khi duyệt — cách giảm: agent chính trình danh sách ở bước 10b.

## Lệnh kiểm tra
- Lint: Không có script lint (`POS_API/package.json`, `POS_UI/package.json`; `.devloopflow/devloopflow.md:26`).
- Typecheck: `cd POS_UI && npm run typecheck`; API typecheck nằm trong `cd POS_API && npm run build` (`tsc -p tsconfig.json`).
- Test:
  - API toàn bộ: `cd POS_API && npm test` (tự build; cần `DATABASE_URL` tới PostgreSQL Docker `pos_infra-postgres-1` `127.0.0.1:15432` dựng từ `POS_INFRA/.env.local` trong lệnh, không in bí mật, M-34; cần `REDIS_URL` Redis thật, ví dụ `redis://127.0.0.1:6379/15`, `.devloopflow/devloopflow.md:23`).
  - API một file: `cd POS_API && npm run build && node --env-file-if-exists=.env --import ./test-setup/flush-redis.mjs --test --test-concurrency=1 dist/sales/tests/paid-immutable.integration.test.js` (tương tự `dist/reports/tests/reports.integration.test.js`, `dist/database/tests/remove-cancel-paid-permission.migration.test.js`, `dist/foundation.test.js`, `dist/shifts/tests/shift-expenses.integration.test.js`, `dist/sales/tests/manager-cancel.integration.test.js`). Khi dùng `--test-name-pattern`, dùng tên test CHA (M-32), ví dụ `"\[PB-16\] PAID invoices are immutable"`.
  - UI: `cd POS_UI && npm test`; browser riêng: `cd POS_UI && node --test test/stock-ledger-router.browser.mjs` (cần Chrome/Chromium).
- Build: `cd POS_API && npm run build`; `cd POS_UI && npm run build`.
- Coverage: Không có script coverage (`CLAUDE.md` mục Tổng quan kỹ thuật: "Không có script lint, format hay coverage").
- Chạy app: từ gốc repo `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait` (dừng bằng `down`, không `-v`) — URL/port: API `http://127.0.0.1:3000/api/v1/health`, UI `http://127.0.0.1:5173`.
- Tìm kiếm còn sót (mã/test): `rg -n "invoice\.cancel_paid|CANCEL_NOT_ALLOWED|CANCEL_EXCEEDS_DRAWER" POS_API/src POS_UI/src POS_UI/test -g "!**/database/migrations/**"`.
- Graphify sau khi sửa mã (agent chính): `graphify update .`.

## Câu hỏi mở
- (rỗng: Câu hỏi 1 và 2 đã được user trả lời ngày 2026-11-18, ghi ở "Quyết định")

## Changelog plan
- 2026-11-18: tạo plan nháp từ spec đã duyệt `20261118-sprint11-pb16-remove-cancel-paid`, task file và kiểm lại mã (chỉ thêm, không xoá).
- 2026-11-18: cập nhật theo câu trả lời của user: Câu 1 "INVOICE_NOT_OPEN (Recommended)", Câu 2 "Đồng ý (Recommended)". Thêm 2 dòng vào "Quyết định"; G-1, G-2 chuyển sang đã xác nhận; ST-1.AC-11, RF-2 và test `[PB16-RF2]` chốt `409 INVOICE_NOT_OPEN` "Đơn không còn mở.", không sửa `writable()`; ST-3.AC-7/ST-4.AC-3/E2E-AC-8 ghi rõ loại trừ đã duyệt; thay rủi ro "chờ Câu hỏi 1" bằng rủi ro client dựa riêng vào mã mới; xóa 2 câu hỏi mở; chạy lại Kiểm tra sẵn sàng.

## Kiểm tra sẵn sàng
- [x] Không còn từ mơ hồ, TBD, TODO, "v.v.", "CHƯA CÓ NGUỒN" — đạt: không dùng các từ đó; hai điểm chưa chắc trước đây đã được user trả lời.
- [x] Mọi fact/quy tắc/field/endpoint có path nguồn hoặc nằm trong "Quyết định" của user; không có thông tin tự suy đoán — đạt: dẫn path:dòng; G-1, G-2 đã được user xác nhận (mục "Quyết định").
- [x] Không có mục nào bị bỏ, rút gọn hoặc tóm tắt so với template — đạt.
- [x] Interfaces: mọi Consumes của một sub-task khớp đúng tên, tham số, kiểu trả về với Produces của sub-task nó phụ thuộc — đạt: ST-2 dùng fixture `login`, `json`, `base`, `sessions.ownerS`, `freshShift` do ST-1 tạo; ST-3 dùng hợp đồng lỗi ST-1 từng ký tự.
- [x] Review Focus: mỗi dòng có test trong ma trận AC ↔ test — đạt: RF-1..RF-5 có dòng trong ma trận.
- [x] Mục "Câu hỏi mở" rỗng, mục "Giả định" đã được xác nhận — đạt: user trả lời Câu 1, 2 ngày 2026-11-18; G-1, G-2 xác nhận bởi user; G-3 có nguồn `auth/auth.service.ts:68`.
- [x] Mỗi sub-task có: AC riêng đo được, plan chi tiết riêng, danh sách test có input/expected — đạt.
- [x] Mọi AC có ít nhất 1 test trong ma trận AC ↔ test; mọi test thuộc 1 AC — đạt.
- [x] Đủ AC cho happy path, input sai/thiếu, quyền, biên, lỗi hệ thống — đạt: happy (hủy `OPEN`, ST-1.AC-7), input sai (ST-1.AC-5), quyền/phạm vi (ST-1.AC-6, ST-2.AC-4), biên (0đ, ca đóng, id HOA, đua thời gian: ST-1.AC-3/4/13/11), lỗi hệ thống (rollback không ghi/không khóa ST-1.AC-12; dist cũ RF-4).
- [x] Mọi AC (E2E-AC-n và ST-n.AC-k) nằm trên một dòng riêng, bắt đầu bằng `- [ ]` — đạt.
- [x] File tạo/sửa liệt kê đủ (gồm test, migration, config, docs cần cập nhật) — đạt: mã/test/migration ở ST-1..ST-3; docs ở ST-5 (đề xuất).
- [x] Đã đối chiếu .devloopflow/errors/ và ghi "Lỗi cũ cần tránh" — đạt.
- [x] Lệnh lint/typecheck/test/build/coverage/chạy app là lệnh thật của dự án — đạt: từ `package.json`, `.devloopflow/devloopflow.md`, `CLAUDE.md`.
- [x] Một agent khác đọc plan này có làm được mà không cần hỏi lại — đạt: ST-1.AC-11 đã chốt mã lỗi, `cancel()` cho sẵn mã, không còn điểm chờ quyết.
evidence: .devloopflow/verify/20261118-sprint11-pb16-remove-cancel-paid/report-1.md
