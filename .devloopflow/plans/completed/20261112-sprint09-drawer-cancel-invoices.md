---
id: 20261112-sprint09-drawer-cancel-invoices
title: Chi từ két và hủy đơn đã thanh toán (API, Sprint 09 — task A)
status: completed   # draft | approved | blocked | completed
created_at: 2026-11-13
approved_at: 2026-11-13
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Chi từ két và hủy đơn đã thanh toán (API, Sprint 09 — task A)

## Mục tiêu và bối cảnh
- Vì sao làm:
  - Đóng ca luôn ghi `expense_amount = 0`, nên thu ngân chi tiền mặt từ két làm tiền kỳ vọng lệch và ca báo thiếu/thừa sai — nguồn: `POS_API/src/shifts/shifts.service.ts:298` (`const expenseAmount = 0n;`), `:308` (`reconciliation.expense_amount = '0';`), `:387`, `:393`.
  - Đơn `PAID` không hủy được; `cancel()` gọi `writable()` và `writable()` chỉ nhận đơn `OPEN` — nguồn: `POS_API/src/sales/sales.service.ts:438-446`, `:162-170` (dòng 165: `if (row.status !== 'OPEN') throw httpError(409, 'INVOICE_NOT_OPEN', 'Đơn không còn mở.');`).
  - Sprint 09 chọn PB-10 + PB-11; task này là task A = phần API, ánh xạ S9-01..S9-05 — nguồn: `sprints/sprint-09/SPRINT.md:33-37`; spec đã duyệt `.devloopflow/specs/20261112-sprint09-drawer-cancel-invoices.md`.
- Ai dùng:
  - `CASHIER`, `MANAGER`, `OWNER` ghi/xem khoản chi trong ca `CASHIER` `OPEN` của chính mình (spec, mục "Các phần cách làm user đã quyết").
  - `OWNER`, `MANAGER` hủy đơn `PAID` của ca còn `OPEN` trong phạm vi của mình (spec, cùng mục; `docs/BUSINESS_RULES.md:229`).
  - Client UI (task B, ngoài phạm vi) dùng hợp đồng API của plan này.

## Khám phá
- `closeShift` khóa dòng ca bằng câu riêng `innerJoin('s.branch','b')` + `.setLock('pessimistic_write', undefined, ['s'])`, rồi `findOne` với `relations: ['branch','reconciliation']` — nguồn: `POS_API/src/shifts/shifts.service.ts:251-268`.
- `closeShift` kiểm theo thứ tự: không thấy → `404 SHIFT_NOT_FOUND` "Ca làm việc không tồn tại"; `CLOSED` → `409 SHIFT_CLOSED` "Ca làm việc đã được đóng từ trước"; khác chủ ca → `403 FORBIDDEN_NOT_SHIFT_OWNER` "Chỉ người trực tiếp làm ca mới có quyền đóng ca của mình" — nguồn: `shifts.service.ts:259-280`.
- Công thức đóng ca hiện tại: `expectedCash = openingCash + cashSalesAmount - expenseAmount` với `expenseAmount = 0n` ở đóng thường (`:296-301`) và đóng cưỡng chế (`:385-390`); đóng thường lệch mà thiếu note → `422 RECONCILIATION_NOTE_REQUIRED` (`:303-305`); đóng cưỡng chế ghi `note = input.note?.trim() || input.reason.trim()` (`:398`).
- `cashSales(manager, shiftId)` = `SUM(p.amount)` của `payments` join `invoices` với `i.work_shift_id=$1 AND i.status='PAID' AND p.method='CASH'` — nguồn: `shifts.service.ts:60-65`. Đơn `CANCELLED` tự rơi khỏi tổng.
- `getShiftDetail`: 404 `SHIFT_NOT_FOUND` nếu ngoài store; `CASHIER` xem ca người khác → `403 PERMISSION_DENIED` "Thu ngân chỉ được xem ca làm của chính mình"; `MANAGER` không `branch.access_all` xem ca chi nhánh khác → `403 PERMISSION_DENIED` "Quản lý chỉ được xem ca trong chi nhánh của mình" — nguồn: `shifts.service.ts:414-440`.
- `checkTenant(user)`: `storeId` rỗng → `403 PERMISSION_DENIED` "PLATFORM_ADMIN không có quyền thao tác ca làm việc của cửa hàng" — nguồn: `shifts.service.ts:77-81`.
- Controller ca: `@Controller('api/v1/work-shifts')`, `@UseGuards(AccessGuard, JsonBodyGuard)`, route `:id/close` dùng `@RequirePermission('shift.close')`, `@HttpCode(200)`, `validId(id)` — nguồn: `POS_API/src/shifts/shifts.controller.ts:8-75`.
- DTO ca dùng `const trim = ({ value }) => typeof value === 'string' ? value.trim() : value;` và `@IsInt() @Min(0) @Max(1000000000000)` — nguồn: `POS_API/src/shifts/http/shifts.dto.ts:5,28-33`.
- `ShiftsListResponse` có `meta: { limit: number; nextCursor: string | null; total: number }` — nguồn: `POS_API/src/shifts/http/shifts.response.ts:35-40`.
- Lỗi tham số danh sách ca: `httpError(422, 'VALIDATION_ERROR', 'Tham số danh sách không hợp lệ.')` — nguồn: `POS_API/src/shifts/shifts.pagination.ts:16`.
- `requestValidationPipe`: `whitelist: true, forbidNonWhitelisted: true, transform: true`, lỗi → `422 VALIDATION_ERROR` "Dữ liệu gửi lên không hợp lệ." — nguồn: `POS_API/src/http/request-validation.ts:39-45`.
- `validId(id)`: không khớp `uuidPattern` (không phân biệt hoa/thường) → `422 VALIDATION_ERROR` "Mã tài nguyên không hợp lệ."; trả nguyên chuỗi, không hạ chữ thường — nguồn: `request-validation.ts:5-10`.
- `AccessGuard`: mutation kiểm `Origin` rồi gọi `authorizeAccess(token, permission, csrfHeader, csrfCookie)`; route không có `@RequirePermission` thì gọi `auth.me(token)` và **không** kiểm CSRF — nguồn: `POS_API/src/auth/security/access.guard.ts:16-30`.
- `authorizeAccess`: người không có store (`PLATFORM_ADMIN`) gọi permission store → `403 PERMISSION_DENIED` "Bạn không có quyền thực hiện thao tác này."; permission đọc lại từ DB mỗi request (`summary(user)`) — nguồn: `POS_API/src/auth/auth.service.ts:198-212`.
- `RequirePermission` nhận một `AccessPermission = string | { platform: string; store: string }` — nguồn: `access.guard.ts:10`, `auth.service.ts:24`.
- Route hủy: `@Post(':id/cancel') @UseGuards(JsonBodyGuard) @RequirePermission('invoice.cancel_open') @HttpCode(200)` gọi `this.sales.cancel(request.authUser!, validId(id), input.reason)` — nguồn: `POS_API/src/sales/sales.controller.ts:51-57`. `CancelInvoiceDto`: `@IsOptional() @Transform(trim) @IsString() @MaxLength(255) reason!: string;` — nguồn: `POS_API/src/sales/http/sales.dto.ts:53-56`.
- `cancel()` hiện tại: thiếu lý do → `422 CANCEL_REASON_REQUIRED` "Cần nhập lý do hủy đơn."; trong transaction gọi `writable()` rồi `UPDATE invoices SET status='CANCELLED',cancel_reason=$2,cancelled_by=$3,cancelled_at=now(),updated_at=now()` và trả `this.detail(...)` — nguồn: `sales.service.ts:438-446`.
- `writable()`: `shift()` (ca `CASHIER` `OPEN` của người gọi, `FOR UPDATE OF s,b`, thiếu → `409 SHIFT_NOT_OPEN`) → `invoice(..., lock=true)` → đơn không `OPEN` → `409 INVOICE_NOT_OPEN` → khác ca → `409 SHIFT_NOT_OPEN` → còn QR `PENDING` → `409 TRANSFER_PENDING` — nguồn: `sales.service.ts:34-40,162-171`.
- `invoice()` scope: không thấy, khác store, hoặc không `branch.access_all` và `row.branch_id !== user.branchId` → `404 NOT_FOUND` "Không tìm thấy hóa đơn." (đã fail-closed khi `branchId` rỗng) — nguồn: `sales.service.ts:42-49`.
- `finalizeInvoice`: khóa hóa đơn, khóa `promotion_codes` qua `invoice_promotion_codes` (`FOR UPDATE OF p`), tăng `used_count=used_count+1`, mỗi nguyên liệu một dòng `stock_movements` `type='SALE'`, `quantity=-$4::numeric`, `balance_after=0`, `invoice_id`, `created_by=actorId`, `source = actorId===null?'SYSTEM':'USER'`, theo `ORDER BY ingredient_id` — nguồn: `sales.service.ts:299-325`.
- `payCash` kiểm trần tiền đối soát dưới khóa ca: `opening_cash + cash_sales + amount > MAX_MONEY` → `422 VALIDATION_ERROR` — nguồn: `sales.service.ts:280-285`; `MAX_MONEY = 1_000_000_000_000n` (`:11`).
- `detail(manager,row)` trả `id, invoiceCode, branchId, workShiftId, tableId, orderType, status, subtotal, discountAmount, totalAmount, promotionCode, note, cancelReason, cancelledAt, createdAt, updatedAt, items` — nguồn: `sales.service.ts:51-74`.
- Lỗi không phải `HttpException` → `500 INTERNAL_ERROR` "Hệ thống gặp lỗi. Vui lòng thử lại sau." — nguồn: `POS_API/src/http/api-error.filter.ts:26-30`.
- `cash_reconciliations`: `expense_amount bigint CHECK (expense_amount IS NULL OR (expense_amount >= 0 AND expense_amount <= 1000000000000))`, `expected_cash ... >= 0 AND <= 1000000000000` — nguồn: `POS_API/src/database/migrations/20261103000000-Shifts.ts:36-37`.
- Seed permission mẫu: `INSERT INTO permissions (id, code, description) VALUES (gen_random_uuid(), ...) ON CONFLICT (code) DO NOTHING;` và `INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE ... ON CONFLICT DO NOTHING;` — nguồn: `20261103000000-Shifts.ts:50-61`; migration chỉ cấp quyền: `20261111000000-ManagerCancelOpen.ts:1-22`.
- `invoice.cancel_open` cấp `OWNER`, `CASHIER` (`20261106000000-Sales.ts:64-72`) và `MANAGER` (`20261111000000-ManagerCancelOpen.ts:8-11`).
- `stock_movements.type` CHECK gồm `'SALE_REVERSAL'`; `quantity <> 0`; trigger `stock_movements_apply` (BEFORE INSERT) cập nhật `branch_ingredient_stocks.current_stock` và gán `NEW.balance_after`; trigger `stock_movements_append_only` cấm UPDATE/DELETE — nguồn: `20261107000000-InventoryPromotions.ts:45-76`.
- `stock_movements.source varchar(10) NOT NULL DEFAULT 'USER' CHECK (source IN ('USER','SYSTEM'))`, ràng buộc `ck_stock_movements_actor` (`SYSTEM` ↔ `created_by IS NULL`, `USER` ↔ `created_by IS NOT NULL`) — nguồn: `POS_API/src/database/migrations/20261109000000-Payments.ts:96-100`.
- `promotion_codes.used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0)` — nguồn: `20261107000000-InventoryPromotions.ts:90`.
- `invoices.cancel_reason varchar(255)`, `cancelled_by`, `cancelled_at`; index `idx_invoices_shift_status ON invoices (work_shift_id, status)` — nguồn: `20261106000000-Sales.ts:23-25,33`.
- Thiết kế bảng `shift_expenses`: `id uuid PK`, `work_shift_id uuid FK → work_shifts NOT NULL INDEX`, `amount bigint NOT NULL CHECK > 0`, `reason varchar(255) NOT NULL`, `paid_from_drawer boolean NOT NULL DEFAULT true`, `created_by uuid FK → users NOT NULL`, `created_at, updated_at timestamptz` — nguồn: `docs/DESIGN_DB_POS_SYSTEM.md:494-504`; index `shift_expenses (work_shift_id)` — `:679`.
- "Hủy đơn đã PAID: với mỗi dòng `SALE` của hóa đơn, thêm dòng `SALE_REVERSAL` có `quantity` đối dấu. Các dòng `payments` của đơn giữ nguyên làm lịch sử." — nguồn: `docs/DESIGN_DB_POS_SYSTEM.md:639`.
- Công thức đối soát: `expense_amount = Σ shift_expenses.amount WHERE ca = <ca> AND paid_from_drawer = true`; `expected_cash = opening_cash + cash_sales_amount − expense_amount` — nguồn: `docs/BUSINESS_RULES.md:273-277`.
- BR-17 "Ca `CLOSED` không tạo đơn, không thanh toán, không thêm chi phí, không sửa số liệu." (`docs/BUSINESS_RULES.md:107`); BR-51 "Chỉ ghi chi phí khi ca còn `OPEN`." (`:117`); BR-52 "Mỗi khoản chi có `amount > 0` và `reason` bắt buộc." (`:118`); BR-53 "Chỉ khoản có `paid_from_drawer = true` mới trừ vào tiền kỳ vọng của két." (`:119`); BR-58 đếm mù (`:132`); BR-60 lệch bắt buộc `note` (`:134`); BR-61 snapshot không đổi (`:135`); BR-29 (`:150`); BR-39 "Đơn `PAID` bị hủy thì trả lại một lượt." (`:175`); BR-47 "Hủy đơn `PAID` thì thêm dòng `SALE_REVERSAL` cộng trả kho, không xóa dòng `SALE` cũ." (`:188`); BR-80, BR-81 (`:45-46`); BR-103 trần tiền (`:165`).
- Ma trận quyền "Hủy đơn đã thanh toán": PLATFORM_ADMIN Không, OWNER Có, MANAGER Có, CASHIER Không — nguồn: `docs/BUSINESS_RULES.md:229`.
- `docs/api-spec.md`: route lồng `/work-shifts/{id}/expenses` (`:47`, `:159`, `:485`); mã lỗi `SHIFT_CLOSED` 409 (`:349`), `INVOICE_NOT_OPEN` 409 (`:353`), `CANCEL_REASON_REQUIRED` 422 (`:361`), `CANCEL_NOT_ALLOWED` 409 "Hủy đơn `PAID` khi ca đã đóng" (`:362`), `EXPENSE_REASON_REQUIRED` 422 (`:375`); hủy `PAID` qua `POST /invoices/{id}/cancel` (`:456`); danh sách cursor `meta: { limit, nextCursor, total }`, mặc định 20, tối đa 100, `sort=-createdAt` (`AGENTS.md`, mục "Quy ước API"). `SHIFT_NOT_FOUND`, `FORBIDDEN_NOT_SHIFT_OWNER`, `EXPENSE_EXCEEDS_DRAWER`, `CANCEL_EXCEEDS_DRAWER` chưa có trong `docs/api-spec.md` (đã grep); `SHIFT_NOT_FOUND`/`FORBIDDEN_NOT_SHIFT_OWNER` có ở `.devloopflow/specs/shifts.md:199-200`.
- Test hiện có dùng lại mẫu: `POS_API/src/shifts/tests/shifts.integration.test.ts:10-153` (DB tạm, `bootstrapAdmin`, `request()`, `login()`), `:154-226` (seed PAID CASH/TRANSFER bằng SQL, trigger rollback), `:228-258` (cổng khóa `gate` + `waitLock` theo `pg_stat_activity ... wait_event_type='Lock' AND query LIKE '%FOR UPDATE%'`); `POS_API/src/sales/tests/manager-cancel.integration.test.ts:10-97` (seed user bằng SQL với `randomUUID()`, `login()`, `post()`, thu hồi quyền tạm trong `try/finally`).
- Test gọi thẳng `sales.cancel(user, ...)` với `permissions:['pos.sell','invoice.read']` (không có `invoice.cancel_open`) cho đơn `OPEN`: `POS_API/src/sales/tests/payment.integration.test.ts:510,534,770,821,858`; `sales.integration.test.ts:46,67,97` — nên service **không** được thêm kiểm `invoice.cancel_open` cho nhánh `OPEN`.
- Test đếm permission dùng `WHERE code IN (...)` nên thêm permission mới không làm hỏng: `sales.integration.test.ts:23-24`, `inventory.integration.test.ts:23-24`.
- Lệnh: `POS_API/package.json:6-9` — `"build": "node ./node_modules/typescript/bin/tsc -p tsconfig.json"`, `"test": "npm run build && node --env-file-if-exists=.env --test --test-concurrency=1 \"dist/**/*.test.js\""`, `"migration:run": "npm run build && node --env-file-if-exists=.env ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js"`, `"start": "node --env-file-if-exists=.env dist/main.js"`; không có lint/format/coverage — nguồn: `.devloopflow/devloopflow.md:21-30`.
- UI còn mock cho Hóa đơn và `addExpense` (`POS_UI/src/services/shiftService.ts:138-140`) — thuộc task B, không sửa ở plan này.

## Lỗi cũ cần tránh
- `.devloopflow/errors/20261109-cash-close-shift-zero-cash-sales.md` — quy tắc phòng tránh (nguyên văn): "Khi bật một nguồn tiền mới, rà mọi chỗ đang hardcode 0/placeholder chờ nguồn đó (đối soát, báo cáo)." → áp dụng ở ST-3: thay cả hai chỗ `0n`/`'0'` (đóng thường và cưỡng chế); grep `expense_amount` và `expenseAmount` toàn `POS_API/src` sau khi sửa.
- `.devloopflow/errors/20261111-cash-reconciliation-exceeds-money-limit.md` — quy tắc phòng tránh (nguyên văn): "Khi thêm nguồn doanh thu dùng cho đối soát, kiểm tra cả giới hạn của tổng tiền cần ghi khi đóng ca dưới cùng khóa đồng thời." → áp dụng ở ST-2 (kiểm `EXPENSE_EXCEEDS_DRAWER` dưới khóa ca), ST-4 (kiểm `CANCEL_EXCEEDS_DRAWER` dưới khóa ca), ST-3/ST-5 (test đồng thời với đóng ca).
- `.devloopflow/errors/20261111-manager-cancel-open-behavior-untested.md` — quy tắc phòng tránh (nguyên văn): "Mỗi lần đổi quyền theo vai trò phải có test hành vi qua HTTP với vai trò thật (đường chính, thiếu điều kiện, khác phạm vi, thiếu quyền), không chỉ kiểm bảng cấp quyền." → ST-2.AC-3/6/8, ST-4.AC-1/2/3 đi qua HTTP với vai trò thật, có thu hồi quyền tạm.
- `.devloopflow/errors/20261109-owner-access-all-branch-scope.md` — quy tắc phòng tránh (nguyên văn): "Mọi truy vấn scope theo chi nhánh phải qua một quy tắc: `access_all` → không lọc; ngược lại bắt buộc `branchId` hoặc 403. Khi sửa một điểm vào, grep mọi truy vấn cùng mẫu `branch_id=$` trong module." → điểm vào mới `addExpense`, `listExpenses`, nhánh hủy `PAID` đều theo quy tắc `access_all`; OWNER `access_all` có test ở ST-2.AC-6 và ST-4.AC-2.
- `.devloopflow/errors/20261110-backlog-branch-scope-null-branchid-fail-open.md` — quy tắc phòng tránh (nguyên văn): "Mọi kiểm tra phạm vi chi nhánh phải chặn khi thiếu `branchId` và không có `branch.access_all`; không dùng điều kiện "chỉ kiểm khi có giá trị" cho thông tin phạm vi." và "Các helper `invoice()` lặp lại ở nhiều service: khi sửa một chỗ, kiểm các chỗ còn lại (...)" → điều kiện scope của `addExpense` viết đúng `!user.permissions.includes('branch.access_all') && shift.branch_id !== user.branchId` (không có vế `user.branchId &&`); test MANAGER `branch_id = NULL` ở ST-2.AC-6.
- `.devloopflow/errors/20261111-plan-spec-missing-manager-cancel-decision.md` — quy tắc phòng tránh (nguyên văn): "Mọi quyết định của user làm đổi phạm vi/quyền phải ghi vào plan, spec và task cùng lượt với thay đổi code." → mục "Quyết định" dưới đây ghi nguyên văn; quyết định mới phát sinh khi làm phải thêm Changelog plan + task trước khi sửa code.
- MEMORY áp dụng: M-1 (kiểm phạm vi ở MỌI điểm vào: `addExpense`, `listExpenses`, nhánh `PAID` của `cancel`), M-4 (mã lỗi mới vào `docs/api-spec.md` — làm ở bước sync-docs cuối, ghi trong "Phạm vi"), M-5 (rà câu trạng thái lỗi thời ở sync-docs), M-9/M-16 (ma trận AC ↔ artifact ở cuối plan), M-10 (quyền qua HTTP với vai trò thật), M-14 & M-20 (khóa dòng gốc bằng câu riêng, không `FOR UPDATE` trên nullable side của `LEFT JOIN`, `--test-concurrency=1`), M-15 (test UUID viết hoa ở path), M-19 (seed bằng `randomUUID()`/`gen_random_uuid()`), M-21 (không dùng mẫu `UPDATE ... RETURNING` qua `manager.query` ở plan này; trả lượt mã dùng `UPDATE` thường và để CHECK DB chặn âm — xem ST-4).

## Quyết định
- Câu hỏi: 9 đề xuất (1) tách task A API / B UI; (2) permission mới `invoice.cancel_paid` cho OWNER+MANAGER; (3) permission mới `shift.expense` cho CASHIER/MANAGER/OWNER, chỉ ghi ca CASHIER OPEN của chính người gọi; (4) khoản chi chỉ thêm và xem, không sửa/xóa, `paid_from_drawer=false` lưu nhưng không trừ két; (5) cho hủy đơn TRANSFER đã PAID, hoàn tiền ngoài hệ thống ghi trong `cancel_reason`; (6) không thêm cột cho tiền kỳ vọng; (7) thứ tự khóa ca→hóa đơn→mã→tồn; (8) màn Hóa đơn dùng `GET /invoices` có sẵn (task B); (9) mã lỗi `SHIFT_CLOSED`/`CANCEL_NOT_ALLOWED`/`EXPENSE_REASON_REQUIRED`/`CANCEL_REASON_REQUIRED` → Trả lời của user: "đồng ý hết"
- Câu hỏi: MANAGER hủy `PAID` có cần ca riêng không → Trả lời của user: "Manager ko cần bật ca riêng"
- Câu hỏi: `expected_cash` không âm (`EXPENSE_EXCEEDS_DRAWER` 422, `CANCEL_EXCEEDS_DRAWER` 409); mã lỗi ghi chi vào ca sai (404 `SHIFT_NOT_FOUND` / 403 `FORBIDDEN_NOT_SHIFT_OWNER` / 409 `CONFLICT` cho ca STAFF "Ca này không có két"); hủy lại đơn đã `CANCELLED` giữ 409 `INVOICE_NOT_OPEN` → Trả lời của user: "ok duyệt"
- Câu hỏi: duyệt spec → Trả lời của user: "duyệt spec"
- Câu hỏi: message tiếng Việt cho 5 lỗi mới (`EXPENSE_REASON_REQUIRED` "Cần nhập lý do chi."; `FORBIDDEN_NOT_SHIFT_OWNER` "Chỉ người trực tiếp làm ca mới được ghi chi phí của ca."; `EXPENSE_EXCEEDS_DRAWER` "Số tiền chi vượt quá tiền mặt hiện có trong két."; `CANCEL_EXCEEDS_DRAWER` "Tiền mặt trong két không đủ để hoàn cho khách."; `CANCEL_NOT_ALLOWED` "Chỉ hủy được đơn đã thanh toán khi ca của đơn còn mở.") và các giả định của plan (quyền hủy `PAID` cần cả `invoice.cancel_open` ở route và `invoice.cancel_paid` ở service; không sửa spec lịch sử; không entity TypeORM) → Trả lời của user: "404 NOT_FOUND  vậy cái này phải sửa lại trong spec còn lại tất cả duyệt" (đổi ưu tiên lỗi của `cancel()` sang 404 `NOT_FOUND` được chấp nhận và phải ghi vào spec; spec đã cập nhật cùng lượt, mục Changelog spec 2026-11-13)
- Quyết định của agent trong spec đã duyệt (user kiểm khi đọc spec, nguồn: `.devloopflow/specs/20261112-sprint09-drawer-cancel-invoices.md`, mục "Quyết định của agent"): hợp đồng `POST/GET /api/v1/work-shifts/{id}/expenses`; xem danh sách bằng `shift.read` cùng phạm vi `getShiftDetail`; `amount` sai → `422 VALIDATION_ERROR`; hủy `PAID` dùng lại `POST /api/v1/invoices/{id}/cancel`; đơn `PAID` 0đ hủy được; hủy lại → `409 INVOICE_NOT_OPEN`; không `Idempotency-Key` cho chi phí; `SALE_REVERSAL` theo từng dòng `SALE`, `source='USER'`, `created_by` là người hủy; `used_count` đã 0 → `500 INTERNAL_ERROR` + rollback; đọc đơn theo phạm vi trước rồi mới kiểm quyền theo trạng thái; thân thành công của hủy `PAID` giống hủy `OPEN`; seed permission bằng migration mới; tài liệu `docs/` cập nhật ở `sync-docs`.

## Giả định
- Cách kiểm quyền theo trạng thái trên một route (spec giao plan chọn): giữ `@RequirePermission('invoice.cancel_open')` ở route; trong service nhánh `PAID` kiểm thêm `user.permissions.includes('invoice.cancel_paid')`. Hệ quả: hủy `PAID` cần cả hai mã. Tương đương hành vi với seed hiện tại vì mọi vai trò có `invoice.cancel_paid` (OWNER, MANAGER) đều có `invoice.cancel_open` — xác nhận bởi: nguồn `20261106000000-Sales.ts:69-70`, `20261111000000-ManagerCancelOpen.ts:8-11`, và quyền vai trò chỉ đến từ migration (`manager-cancel.integration.test.ts:10` "Permissions come only from role_permissions seeded by migrations"). Phương án đã loại ở "Thiết kế tổng thể".
- Thứ tự kiểm khi ghi chi theo mẫu `closeShift`: phạm vi (404) → `CLOSED` (409 `SHIFT_CLOSED`) → khác chủ ca (403 `FORBIDDEN_NOT_SHIFT_OWNER`) → ca `STAFF` (409 `CONFLICT`) → két (422 `EXPENSE_EXCEEDS_DRAWER`) — xác nhận bởi: nguồn `shifts.service.ts:259-280` (thứ tự hiện có); spec không quy định thứ tự.
- Kiểm lý do (`EXPENSE_REASON_REQUIRED`, `CANCEL_REASON_REQUIRED`) chạy trước khi đọc DB, giống `cancel()` hiện có — xác nhận bởi: nguồn `sales.service.ts:439`.
- `.devloopflow/specs/shifts.md` và `.devloopflow/specs/invoices.md` không sửa vì là hợp đồng lịch sử giữ nguyên byte; hợp đồng mới là spec `20261112-...` — xác nhận bởi: nguồn `AGENTS.md:80` ("hợp đồng lịch sử nằm nguyên byte trong `.devloopflow/specs/`") và chỉ dẫn của agent chính.
- Không cần entity TypeORM cho `shift_expenses`: truy vấn bằng SQL `manager.query` như module sales (`sales.service.ts` không dùng entity cho `payments`/`stock_movements`) — xác nhận bởi: spec mục "Để người viết plan tự chọn" ("Tên migration, entity, DTO").
- Message tiếng Việt cho 5 lỗi mới: user duyệt đề xuất nguyên văn (mục Quyết định, 2026-11-13).

## Phạm vi
- Trong:
  - Migration mới `POS_API/src/database/migrations/20261113000000-ShiftExpenses.ts`: bảng `shift_expenses`, index, 2 permission `shift.expense`, `invoice.cancel_paid` và cấp vai trò.
  - `POST /api/v1/work-shifts/{id}/expenses`, `GET /api/v1/work-shifts/{id}/expenses` (S9-01).
  - Đóng ca và đóng cưỡng chế dùng tổng chi `paid_from_drawer = true` (S9-02).
  - Hủy đơn `PAID` qua `POST /api/v1/invoices/{id}/cancel` (S9-03, S9-04, S9-05).
  - Test tích hợp PostgreSQL qua HTTP: `POS_API/src/shifts/tests/shift-expenses.integration.test.ts` (mới), `POS_API/src/sales/tests/cancel-paid.integration.test.ts` (mới).
  - Cập nhật graph: `graphify update .` sau khi sửa code.
  - Việc cuối (bước `sync-docs`, sau verify-ac, cần user duyệt từng chỗ; không phải sub-task TDD): `docs/api-spec.md` thêm `EXPENSE_EXCEEDS_DRAWER`, `CANCEL_EXCEEDS_DRAWER`, `SHIFT_NOT_FOUND`, `FORBIDDEN_NOT_SHIFT_OWNER` vào bảng mã lỗi nghiệp vụ và mở rộng cột "Khi nào" của `INVOICE_NOT_OPEN` (hủy đơn đã `CANCELLED`); `docs/BUSINESS_RULES.md` thêm dòng ma trận quyền "Ghi chi phí từ két trong ca của mình" (PLATFORM_ADMIN Không, OWNER Có, MANAGER Có, CASHIER Có); rà `README.md`, `AGENTS.md`, `CLAUDE.md`, `.devloopflow/devloopflow.md` (số test, trạng thái) theo M-5; item 1 của sprint (câu trạng thái lỗi thời).
- Ngoài:
  - UI màn Hóa đơn và UI chi phí trong ca (task B, S9-06); `POS_UI/` không sửa.
  - Sửa/xóa khoản chi; hủy đơn của ca đã đóng; hoàn tiền một phần; `IMPORT`/`WASTE`/`ADJUST`; `audit_logs`; báo cáo doanh thu PB-12; VPS/backup PB-14; SePay Live (spec, "Phi mục tiêu").
  - Thay đổi `GET /api/v1/invoices` (bộ lọc/phân trang thuộc spec task B).
  - Sửa `.devloopflow/specs/shifts.md`, `.devloopflow/specs/invoices.md` (hợp đồng lịch sử).
  - Trigger chỉ-thêm cho `shift_expenses` (không có route sửa/xóa; không được yêu cầu).
  - `Idempotency-Key` cho chi phí (spec, "Quyết định của agent").

## Thiết kế tổng thể
- Luồng chính — ghi chi (`POST /api/v1/work-shifts/{id}/expenses`):
  1. `AccessGuard` kiểm `Origin`, CSRF, permission `shift.expense` (PLATFORM_ADMIN và vai trò thiếu quyền → 403 `PERMISSION_DENIED`).
  2. `requestValidationPipe` kiểm `CreateShiftExpenseDto` (sai → 422 `VALIDATION_ERROR`).
  3. Service: `checkTenant`; `reason` rỗng sau trim → 422 `EXPENSE_REASON_REQUIRED`.
  4. Transaction: khóa dòng `work_shifts` (inner join `branches` theo `store_id`, `FOR UPDATE OF s`) → không thấy/khác store → 404 `SHIFT_NOT_FOUND`; khác chi nhánh khi không `branch.access_all` → 404 `SHIFT_NOT_FOUND`; `CLOSED` → 409 `SHIFT_CLOSED`; `user_id` khác → 403 `FORBIDDEN_NOT_SHIFT_OWNER`; `STAFF` → 409 `CONFLICT`.
  5. Nếu `paidFromDrawer`: `opening_cash + cashSales − drawerExpenses − amount < 0` → 422 `EXPENSE_EXCEEDS_DRAWER`.
  6. `INSERT INTO shift_expenses ... RETURNING *` → 201.
- Luồng chính — đóng ca/đóng cưỡng chế: giữ nguyên; thay `0n` bằng `await this.drawerExpenses(manager, shift.id)` sau khi đã khóa ca; `expense_amount = String(expenseAmount)`.
- Luồng chính — hủy (`POST /api/v1/invoices/{id}/cancel`):
  1. Guard `invoice.cancel_open` (giữ nguyên).
  2. `reason` rỗng → 422 `CANCEL_REASON_REQUIRED`.
  3. Transaction: `row = invoice(manager, user, id)` (không khóa; scope → 404 `NOT_FOUND`).
  4. `row.status === 'OPEN'` → luồng cũ (`writable()` + `UPDATE`), không đổi.
  5. `row.status === 'PAID'` → thiếu `invoice.cancel_paid` → 403 `PERMISSION_DENIED`; khóa ca của đơn (`SELECT ... FROM work_shifts WHERE id=$1 FOR UPDATE`); ca `CLOSED` → 409 `CANCEL_NOT_ALLOWED`; khóa đơn (`invoice(..., true)`), không còn `PAID` → 409 `INVOICE_NOT_OPEN`; đọc `payments`; nếu `CASH` và `opening + cashSales − drawerExpenses − payment.amount < 0` → 409 `CANCEL_EXCEEDS_DRAWER`; khóa mã (`FOR UPDATE OF p`) và `UPDATE promotion_codes SET used_count=used_count-1`; với mỗi dòng `SALE` của đơn (`ORDER BY ingredient_id, id`) INSERT `SALE_REVERSAL` đối dấu; `UPDATE invoices SET status='CANCELLED', ...`; trả `detail`.
  6. Trạng thái khác (`CANCELLED`) → 409 `INVOICE_NOT_OPEN` "Đơn không còn mở.".
- Thành phần tham gia: `ShiftsController`, `ShiftsService`, `shifts.dto.ts`, `shifts.response.ts`, `InvoicesController` (không đổi), `SalesService`, migration mới, PostgreSQL trigger `stock_movements_apply`, CHECK `used_count >= 0`, CHECK `expected_cash >= 0`.
- Quyết định thiết kế | lý do | phương án đã loại:
  - Quyền hủy `PAID` = guard `invoice.cancel_open` + kiểm `invoice.cancel_paid` trong service | thay đổi nhỏ nhất, không đụng `AccessGuard`/`AuthService` dùng chung, không phá test gọi thẳng `sales.cancel` | (a) mở rộng `AccessPermission` thành mảng "một trong các mã" — sửa module auth dùng chung cho một route; (b) bỏ `@RequirePermission` — mất kiểm CSRF (`access.guard.ts:24-28`); (c) route riêng `/cancel-paid` — trái `docs/api-spec.md:456` và spec.
  - Đọc đơn không khóa trước rồi khóa ca → khóa đơn → kiểm lại trạng thái | spec cho phép; giữ thứ tự khóa ca → hóa đơn → mã → tồn giống `payCash` (`writable()` khóa ca trước đơn) để không deadlock | khóa đơn trước ca — đảo thứ tự với `payCash`/đóng ca.
  - Trả lượt mã bằng `UPDATE promotion_codes SET used_count=used_count-1,updated_at=now() WHERE id=$1` và để CHECK `used_count >= 0` ném lỗi khi đã 0 | lỗi DB (không phải `HttpException`) → filter trả 500 `INTERNAL_ERROR` và transaction rollback, đúng spec, không cần `RETURNING` (tránh bẫy M-21) | `WHERE used_count>0 RETURNING` + kiểm rowCount; `GREATEST(...)` (spec cấm che).
  - `SALE_REVERSAL` đọc từ dòng `SALE` đã ghi | spec: không tính lại theo công thức hiện tại | tính lại từ `product_size_ingredients` (sai khi công thức đổi sau bán).
  - Tổng chi từ két tính bằng `SUM` mỗi lần dưới khóa ca | không thêm cột (user quyết (6)) | cột tích lũy trên `cash_reconciliations`.
  - Kiểm két trong `SalesService` bằng một câu SQL riêng (opening + CASH PAID − chi từ két) | `SalesModule` không phụ thuộc `ShiftsService`; theo mẫu `payCash` (`sales.service.ts:280-282`) | inject `ShiftsService` vào `SalesService`.
  - Danh sách chi phí gọi `getShiftDetail(user, shiftId)` để kiểm phạm vi | tái dùng đúng phạm vi đã có (spec) | viết lại điều kiện phạm vi.
  - Không tạo entity TypeORM | SQL thuần đủ, giống module sales | thêm entity + đăng ký `data-source.ts`.

## Thay đổi dữ liệu
- Bảng mới `shift_expenses` (migration `20261113000000-ShiftExpenses.ts`, class `ShiftExpenses20261113000000`, `name = 'ShiftExpenses20261113000000'`):
  - `id uuid PRIMARY KEY`
  - `work_shift_id uuid NOT NULL REFERENCES work_shifts(id) ON DELETE RESTRICT`
  - `amount bigint NOT NULL CHECK (amount > 0 AND amount <= 1000000000000)` (BR-52, BR-103)
  - `reason varchar(255) NOT NULL CHECK (reason = btrim(reason) AND reason <> '')` (BR-52; mẫu `ingredients.name` ở `20261107000000-InventoryPromotions.ts:11`)
  - `paid_from_drawer boolean NOT NULL DEFAULT true`
  - `created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT`
  - `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()`
  - Index `idx_shift_expenses_shift_created ON shift_expenses (work_shift_id, created_at DESC, id DESC)` (phủ `shift_expenses (work_shift_id)` của `DESIGN_DB:679` và danh sách cursor).
- Permission mới: `('shift.expense', 'Ghi chi phí từ két trong ca thu ngân của mình')`, `('invoice.cancel_paid', 'Hủy đơn đã thanh toán khi ca của đơn còn mở')`; `role_permissions`: `shift.expense` → `OWNER`, `MANAGER`, `CASHIER`; `invoice.cancel_paid` → `OWNER`, `MANAGER`.
- Không thêm/sửa cột ở bảng khác (user quyết (6)).
- Rollback: `down()` ném `new Error('ShiftExpenses migration cannot be reversed without deleting shift expense history')` theo mẫu `20261103000000-Shifts.ts:65-67` (không xóa dữ liệu lịch sử). Gỡ trên DB thử: tạo DB mới.

## API contract tổng
- `POST /api/v1/work-shifts/{id}/expenses`
  - Quyền: `shift.expense`; CSRF + `Origin`; `Content-Type: application/json`.
  - Request: `{ "amount": 30000, "reason": "Mua đá", "paidFromDrawer": true }` (`paidFromDrawer` bỏ trống = `true`).
  - 201: `{ "data": { "id": "<uuid>", "workShiftId": "<uuid>", "amount": 30000, "reason": "Mua đá", "paidFromDrawer": true, "createdBy": "<uuid>", "createdAt": "2026-11-13T03:00:00.000Z" } }`.
  - Lỗi:

    | HTTP | code | Khi nào | message |
    |---|---|---|---|
    | 403 | `CSRF_INVALID` | Thiếu/sai `Origin`/CSRF | "Phiên yêu cầu không hợp lệ. Vui lòng tải lại trang." (`access.guard.ts:22`) |
    | 403 | `PERMISSION_DENIED` | Thiếu `shift.expense`, `PLATFORM_ADMIN` | "Bạn không có quyền thực hiện thao tác này." (`auth.service.ts:210`) |
    | 422 | `VALIDATION_ERROR` | `id` không phải UUID | "Mã tài nguyên không hợp lệ." (`request-validation.ts:8`) |
    | 422 | `VALIDATION_ERROR` | `amount` thiếu, ≤ 0, không nguyên, > 1000000000000, không phải number; `reason` > 255 ký tự hoặc không phải chuỗi; `paidFromDrawer` không phải boolean; field lạ | "Dữ liệu gửi lên không hợp lệ." (`request-validation.ts:42`) |
    | 422 | `EXPENSE_REASON_REQUIRED` | `reason` thiếu, `null` hoặc rỗng sau trim | "Cần nhập lý do chi." (user duyệt 2026-11-13) |
    | 404 | `SHIFT_NOT_FOUND` | Ca không tồn tại, khác store, hoặc khác chi nhánh khi không `branch.access_all` | "Ca làm việc không tồn tại" (`shifts.service.ts:260`) |
    | 409 | `SHIFT_CLOSED` | Ca `CLOSED` | "Ca làm việc đã được đóng từ trước" (`shifts.service.ts:275`) |
    | 403 | `FORBIDDEN_NOT_SHIFT_OWNER` | Ca của người khác | "Chỉ người trực tiếp làm ca mới được ghi chi phí của ca." (user duyệt 2026-11-13) |
    | 409 | `CONFLICT` | Ca `STAFF` | "Ca này không có két" (spec, mục "Các phần cách làm user đã quyết") |
    | 422 | `EXPENSE_EXCEEDS_DRAWER` | `paidFromDrawer=true` và tiền kỳ vọng sau chi < 0; `details: []` | "Số tiền chi vượt quá tiền mặt hiện có trong két." (user duyệt 2026-11-13) |
    | 500 | `INTERNAL_ERROR` | Lỗi DB | "Hệ thống gặp lỗi. Vui lòng thử lại sau." (`api-error.filter.ts:30`) |
- `GET /api/v1/work-shifts/{id}/expenses?limit=20&cursor=<base64url>&sort=-createdAt`
  - Quyền: `shift.read`; phạm vi như `GET /api/v1/work-shifts/{id}`.
  - 200: `{ "data": [ <phần tử như data của POST> ], "meta": { "limit": 20, "nextCursor": null, "total": 1 } }`, sắp `created_at DESC, id DESC`.
  - Lỗi: 403 `PERMISSION_DENIED` (thiếu `shift.read`/`PLATFORM_ADMIN`: "Bạn không có quyền thực hiện thao tác này."; CASHIER xem ca người khác: "Thu ngân chỉ được xem ca làm của chính mình"; MANAGER khác chi nhánh: "Quản lý chỉ được xem ca trong chi nhánh của mình"); 404 `SHIFT_NOT_FOUND` "Ca làm việc không tồn tại"; 422 `VALIDATION_ERROR` "Tham số danh sách không hợp lệ." (query lạ, `limit` sai, `sort` khác `-createdAt`, cursor sai/cursor của ca khác); 422 `VALIDATION_ERROR` "Mã tài nguyên không hợp lệ." (`id` sai).
- `POST /api/v1/invoices/{id}/cancel` (mở rộng cho `PAID`)
  - Quyền route: `invoice.cancel_open` (giữ nguyên); nhánh `PAID` cần thêm `invoice.cancel_paid`.
  - Request: `{ "reason": "Khách trả hàng, đã hoàn 45.000đ tiền mặt" }`.
  - 200: `{ "data": <chi tiết đơn như hủy OPEN, status "CANCELLED", cancelReason, cancelledAt> }`.
  - Lỗi (nhánh `PAID`):

    | HTTP | code | Khi nào | message |
    |---|---|---|---|
    | 422 | `CANCEL_REASON_REQUIRED` | `reason` thiếu/rỗng sau trim | "Cần nhập lý do hủy đơn." (`sales.service.ts:439`) |
    | 422 | `VALIDATION_ERROR` | `reason` > 255 ký tự, field lạ | "Dữ liệu gửi lên không hợp lệ." |
    | 404 | `NOT_FOUND` | Đơn không tồn tại/khác store/khác chi nhánh khi không `access_all` | "Không tìm thấy hóa đơn." (`sales.service.ts:47`) |
    | 403 | `PERMISSION_DENIED` | Thiếu `invoice.cancel_open` (guard) hoặc đơn `PAID` mà thiếu `invoice.cancel_paid` (service); `PLATFORM_ADMIN` | "Bạn không có quyền thực hiện thao tác này." (`auth.service.ts:210`; service dùng cùng chuỗi) |
    | 409 | `CANCEL_NOT_ALLOWED` | Đơn `PAID` mà ca của đơn `CLOSED` | "Chỉ hủy được đơn đã thanh toán khi ca của đơn còn mở." (user duyệt 2026-11-13) |
    | 409 | `INVOICE_NOT_OPEN` | Đơn `CANCELLED`, hoặc đơn đổi trạng thái trong lúc chờ khóa | "Đơn không còn mở." (`sales.service.ts:165`) |
    | 409 | `CANCEL_EXCEEDS_DRAWER` | Đơn `CASH`, tiền kỳ vọng sau hủy < 0; `details: []` | "Tiền mặt trong két không đủ để hoàn cho khách." (user duyệt 2026-11-13) |
    | 500 | `INTERNAL_ERROR` | `used_count` đã 0 (CHECK DB), lỗi DB khác; rollback toàn bộ | "Hệ thống gặp lỗi. Vui lòng thử lại sau." |
  - Nhánh `OPEN`: hành vi và mã lỗi giữ nguyên (`SHIFT_NOT_OPEN`, `INVOICE_NOT_OPEN`, `TRANSFER_PENDING`...).
- `POST /api/v1/work-shifts/{id}/close`, `/force-close`: request/response không đổi; `reconciliation.expenseAmount` nay bằng tổng chi `paid_from_drawer=true` thay vì 0.

## AC tổng end-to-end
| E2E-AC | Spec | Sprint |
|---|---|---|
| E2E-AC-1 | G1 | S9-01 |
| E2E-AC-2 | G2 | S9-02 |
| E2E-AC-3 | G3 | S9-03 |
| E2E-AC-4 | G4 | S9-04 |
| E2E-AC-5 | G5 | S9-05 |

- [x] E2E-AC-1: Given CASHIER mở ca `CASHIER` ở chi nhánh `initial_cash = 100000` When `POST /api/v1/work-shifts/{shiftId}/expenses` `{"amount":30000,"reason":"Mua đá"}` rồi `GET /api/v1/work-shifts/{shiftId}/expenses` Then POST 201 với `amount 30000`, `reason "Mua đá"`, `paidFromDrawer true`, `createdBy = cashierId`; GET 200 với 1 phần tử, `meta {limit:20, nextCursor:null, total:1}`; `PLATFORM_ADMIN` POST → 403 `PERMISSION_DENIED`; ca đã đóng → 409 `SHIFT_CLOSED` (kiểm: integration HTTP + SELECT `shift_expenses`)
- [x] E2E-AC-2: Given opening 100000, đơn CASH `PAID` 50000, chi 30000 `paidFromDrawer:true` và 20000 `paidFromDrawer:false` When đóng ca `countedCash 120000` Then 200, `cashSalesAmount 50000`, `expenseAmount 30000`, `expectedCash 120000`, `difference 0`, `MATCHED`; trước đóng `GET /work-shifts/{id}` có `reconciliation.expectedCash null`; đóng cưỡng chế cùng dữ liệu `countedCash 125000` → `expenseAmount 30000`, `difference 5000`, `OVERAGE` (kiểm: integration HTTP + SELECT `cash_reconciliations`)
- [x] E2E-AC-3: Given đơn CASH `PAID` 45000 của ca CASHIER `OPEN` chi nhánh A When MANAGER chi nhánh A (không có ca riêng) `POST /invoices/{id}/cancel` `{"reason":"Khách trả hàng"}` Then 200 `status "CANCELLED"`; CASHIER của ca → 403 `PERMISSION_DENIED`; MANAGER chi nhánh B → 404 `NOT_FOUND`; `PLATFORM_ADMIN` → 403; đơn của ca đã đóng → 409 `CANCEL_NOT_ALLOWED` (kiểm: integration HTTP + SELECT `invoices`, `work_shifts`)
- [x] E2E-AC-4: Given đơn ở E2E-AC-3 có mã giảm `used_count 1` và 2 dòng `SALE` (-200 ml, -40 g) When hủy thành công Then `payments` không đổi, có đúng 2 dòng `SALE_REVERSAL` (+200, +40), tồn về 1000.000/1000.000, `used_count 0`; lỗi giữa chừng → 500 và không dòng nào đổi; hai yêu cầu hủy đồng thời → một 200, một 409 `INVOICE_NOT_OPEN`, vẫn đúng 2 dòng `SALE_REVERSAL` và `used_count` giảm đúng 1 (kiểm: integration HTTP + SELECT trước/sau)
- [x] E2E-AC-5: Given opening 100000, đơn CASH 50000 đã hủy When đóng ca `countedCash 100000` Then `cashSalesAmount 0`, `expectedCash 100000`, `MATCHED`; Given opening 100000, CASH 50000 giữ nguyên, TRANSFER 30000 đã hủy When đóng ca `countedCash 150000` Then `cashSalesAmount 50000`, `expectedCash 150000`, `MATCHED`, `cancel_reason` lưu nguyên văn lý do hoàn chuyển khoản (kiểm: integration HTTP + SELECT `cash_reconciliations`, `invoices`)

## Review Focus
- RF-1: Path `id` viết HOA (`POST /work-shifts/{ID-HOA}/expenses`, `POST /invoices/{ID-HOA}/cancel` với MANAGER) → hoạt động như chữ thường: 201/200, `workShiftId` trả về chữ thường, không bị 403 `FORBIDDEN_NOT_SHIFT_OWNER` sai (M-15) — test: `[S9-01][ST-2.AC-12] uppercase shift id in path records expense` (ST-2), `[S9-03][ST-4.AC-13] uppercase invoice id cancels PAID invoice` (ST-4)
- RF-2: Lỗi `EXPENSE_EXCEEDS_DRAWER`/`CANCEL_EXCEEDS_DRAWER` không được lộ tiền kỳ vọng (BR-58): `details` = `[]`, message cố định không chứa số → test: `[S9-01][ST-2.AC-5] drawer boundary rejects expense that makes expected cash negative` (ST-2), `[S9-05][ST-4.AC-7] CASH cancel rejected when drawer cannot refund` (ST-4)
- RF-3: Công thức món đổi sau khi bán (sửa `product_size_ingredients.quantity` 100 → 150) rồi hủy `PAID` → `SALE_REVERSAL` = +200 (theo dòng `SALE`), không phải +300 — test: `[S9-04][ST-4.AC-14] reversal follows recorded SALE rows after recipe change` (ST-4)
- RF-4: Mã giảm đã ngưng dùng (`is_active=false`) hoặc hết hạn sau khi bán → hủy `PAID` vẫn 200 và `used_count` giảm 1 (BR-39 không điều kiện) — test: `[S9-04][ST-4.AC-15] inactive promotion still gets its use returned` (ST-4)
- RF-5: MANAGER `branch_id = NULL` không `branch.access_all` ghi chi vào ca chi nhánh A → 404 `SHIFT_NOT_FOUND`, không ghi (fail-closed, lỗi B-2) — test: `[S9-01][ST-2.AC-6] expense scope and ownership checks over HTTP` (ST-2)

## Sub-tasks

### ST-1: Migration `shift_expenses` + 2 permission
- depends_on: -
- Interfaces:
  - Consumes: Không có
  - Produces:
    - Bảng `shift_expenses(id uuid, work_shift_id uuid, amount bigint, reason varchar(255), paid_from_drawer boolean DEFAULT true, created_by uuid, created_at timestamptz, updated_at timestamptz)`; index `idx_shift_expenses_shift_created`.
    - Permission `shift.expense` (OWNER, MANAGER, CASHIER), `invoice.cancel_paid` (OWNER, MANAGER).
    - File test `POS_API/src/shifts/tests/shift-expenses.integration.test.ts` với một `test('[S9-01/S9-02] shift expenses and reconciliation over HTTP with PostgreSQL', { timeout: 180_000 }, async t => { ... })` và các helper bên trong: `request(session: Session, path: string, method?: string, body?: unknown): Promise<{ status: number; json: any }>`, `login(username: string, pass: string): Promise<Session>` (`type Session = { cookie: string; csrf: string }`), `freshCashierShift(role?: 'CASHIER' | 'MANAGER'): Promise<{ branchId: string; userId: string; session: Session; shiftId: string }>` (tạo chi nhánh mới `initial_cash 100000` qua `POST /branches` bằng OWNER store A, tạo user vai trò `role` (mặc định `CASHIER`) qua `POST /users`, đặt `must_change_password=false`, đăng nhập, `POST /work-shifts {shiftType:'CASHIER'}` → 201).
- Mục tiêu: có bảng và quyền để ST-2..ST-5 dùng.
- AC riêng:
  - [x] ST-1.AC-1: Given DB tạm đã `runMigrations()` When đọc `information_schema.columns` và `pg_indexes` của `shift_expenses` Then có đủ 8 cột với kiểu `uuid, uuid, bigint, character varying(255), boolean, uuid, timestamp with time zone, timestamp with time zone`, `paid_from_drawer` default `true`, index `idx_shift_expenses_shift_created` (kiểm: integration)
  - [x] ST-1.AC-2: Given ca có thật When INSERT `amount 0` / `amount 1000000000001` / `reason ''` / `reason ' Mua đá'` Then mỗi câu lỗi `code '23514'`; INSERT `amount 1, reason 'Mua đá'` không ghi `paid_from_drawer` thì thành công và đọc lại `paid_from_drawer = true` (kiểm: integration)
  - [x] ST-1.AC-3: Given migration đã chạy When SELECT tên vai trò cấp từng permission Then `shift.expense` → `['CASHIER','MANAGER','OWNER']`, `invoice.cancel_paid` → `['MANAGER','OWNER']`; `PLATFORM_ADMIN` không có cả hai (kiểm: integration)
- Plan chi tiết:
  - File tạo/sửa:
    - Tạo `POS_API/src/database/migrations/20261113000000-ShiftExpenses.ts` (nội dung ở mục DB).
    - Sửa `POS_API/src/foundation.test.ts:37`: `assert.equal((await db.runMigrations()).length, 10);` → `assert.equal((await db.runMigrations()).length, 11);` (thêm migration thứ 11; user duyệt 2026-11-13, xem Changelog plan). Chỉ đổi hằng số, không đổi hành vi nên không cần test đỏ trước; test bảo vệ là chính `foundation.test.ts` (`PB-01 migration, bootstrap and database constraints`): chạy trước khi sửa (đỏ `11 !== 10` do migration mới) và sau khi sửa (xanh).
    - Tạo `POS_API/src/shifts/tests/shift-expenses.integration.test.ts`: fixture theo mẫu `shifts.integration.test.ts:10-153` — DB tên `pos_s9_exp_${randomBytes(6).toString('hex')}`; assert `['localhost','127.0.0.1'].includes(url.hostname)` (mẫu `manager-cancel.integration.test.ts:13`); `bootstrapAdmin(db)` với `BOOTSTRAP_ADMIN_*`; OWNER store A, OWNER store B qua `POST /platform/stores`; `finally` đóng app, `db.destroy()`, `DROP DATABASE IF EXISTS ... WITH (FORCE)`.
  - Chữ ký hàm/class: `export class ShiftExpenses20261113000000 implements MigrationInterface { name = 'ShiftExpenses20261113000000'; async up(queryRunner: QueryRunner): Promise<void>; async down(): Promise<void>; }`
  - DTO/schema: Không có (chỉ DB).
  - DB/migration (`up`, một `queryRunner.query`):
    ```sql
    CREATE TABLE shift_expenses (
      id uuid PRIMARY KEY,
      work_shift_id uuid NOT NULL REFERENCES work_shifts(id) ON DELETE RESTRICT,
      amount bigint NOT NULL CHECK (amount > 0 AND amount <= 1000000000000),
      reason varchar(255) NOT NULL CHECK (reason = btrim(reason) AND reason <> ''),
      paid_from_drawer boolean NOT NULL DEFAULT true,
      created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_shift_expenses_shift_created ON shift_expenses (work_shift_id, created_at DESC, id DESC);
    INSERT INTO permissions (id, code, description) VALUES
      (gen_random_uuid(), 'shift.expense', 'Ghi chi phí từ két trong ca thu ngân của mình'),
      (gen_random_uuid(), 'invoice.cancel_paid', 'Hủy đơn đã thanh toán khi ca của đơn còn mở')
    ON CONFLICT (code) DO NOTHING;
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p WHERE
      (r.name IN ('OWNER', 'MANAGER', 'CASHIER') AND p.code = 'shift.expense')
      OR (r.name IN ('OWNER', 'MANAGER') AND p.code = 'invoice.cancel_paid')
    ON CONFLICT DO NOTHING;
    ```
    `down()`: `throw new Error('ShiftExpenses migration cannot be reversed without deleting shift expense history');`
  - API: Không có.
  - Các bước xử lý:
    1. Viết test ST-1.AC-1..3 (đỏ vì bảng chưa có).
    2. Tạo migration; `npm run build` để `dist/database/migrations/*.js` có file mới (`data-source.ts` nạp `__dirname + '/migrations/*.js'`).
    3. Chạy test file, xanh.
  - Quy tắc nghiệp vụ: BR-52 (`amount > 0`, `reason` bắt buộc), BR-103 (trần), `DESIGN_DB:494-504`; spec: permission mới, OWNER+MANAGER cho `invoice.cancel_paid`, CASHIER/MANAGER/OWNER cho `shift.expense`.
  - Bảng edge case:
    | Tình huống | Hành vi |
    |---|---|
    | Chạy lại INSERT permission khi đã có | `ON CONFLICT DO NOTHING`, không lỗi |
    | `reason` có khoảng trắng đầu/cuối ghi thẳng DB | CHECK chặn (API đã trim trước) |
    | `created_by` không tồn tại | FK lỗi `23503` |
  - Ảnh hưởng tới code hiện có: không sửa code production; `foundation.test.ts:37` gắn cứng số migration (10) nên phải đổi thành 11 (đã thêm vào "File tạo/sửa"); test đếm permission dùng `WHERE code IN (...)` nên không vỡ (`sales.integration.test.ts:23-24`).
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `20261111-manager-cancel-open-behavior-untested.md` → ST-1 chỉ kiểm bảng quyền; hành vi quyền bắt buộc kiểm qua HTTP ở ST-2 và ST-4.
- Test viết trước:
  - [x] `[S9-01][ST-1.AC-1] migration creates shift_expenses columns and index` — input: `SELECT column_name,data_type,character_maximum_length,column_default,is_nullable FROM information_schema.columns WHERE table_name='shift_expenses'`, `SELECT indexname FROM pg_indexes WHERE tablename='shift_expenses'` — expected: 8 cột như AC-1, `column_default` của `paid_from_drawer` = `'true'`, tất cả `is_nullable='NO'`, có `idx_shift_expenses_shift_created`
  - [x] `[S9-01][ST-1.AC-2] shift_expenses constraints reject invalid rows` — input: 4 INSERT sai + 1 INSERT đúng trên ca `freshCashierShift()` — expected: 4 lần `code '23514'`, dòng đúng có `paid_from_drawer=true`
  - [x] `[S9-01][ST-1.AC-3] new permissions granted to the decided roles` — input: `SELECT r.name FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id WHERE p.code=$1 ORDER BY r.name` — expected: như AC-3
- Tiến độ:
  - [x] Red (evidence/st1/red.log, pb01-before.log)  - [x] Green (green.log)  - [x] Refactor (không đổi)  - [x] Test module xanh (agent chính chạy lại 2026-11-13: npm test 159/159, exit 0)

### ST-2: `POST`/`GET /api/v1/work-shifts/{id}/expenses`
- depends_on: ST-1
- Interfaces:
  - Consumes: bảng `shift_expenses`, permission `shift.expense` từ ST-1; helper test `request`, `login`, `freshCashierShift(role?: 'CASHIER' | 'MANAGER')` từ ST-1.
  - Produces:
    - `ShiftsService.addExpense(user: UserSummary, shiftId: string, input: CreateShiftExpenseDto): Promise<ShiftExpenseResponse>`
    - `ShiftsService.listExpenses(user: UserSummary, shiftId: string, rawQuery: Record<string, unknown>): Promise<ShiftExpensesListResponse>`
    - `private ShiftsService.drawerExpenses(manager: EntityManager, shiftId: string): Promise<bigint>` — `SELECT COALESCE(SUM(amount), 0)::text AS total FROM shift_expenses WHERE work_shift_id=$1 AND paid_from_drawer=true`, trả `BigInt(row.total)`.
    - `export class CreateShiftExpenseDto` (`shifts.dto.ts`), `export interface ShiftExpenseResponse`, `export interface ShiftExpensesListResponse` (`shifts.response.ts`).
    - Route `POST /api/v1/work-shifts/:id/expenses`, `GET /api/v1/work-shifts/:id/expenses`.
    - Helper test `addExpense(session: Session, shiftId: string, body: object): Promise<{ status: number; json: any }>` = `request(session, \`/work-shifts/${shiftId}/expenses\`, 'POST', body)`.
- Mục tiêu: ghi/xem khoản chi của ca theo quyền, phạm vi, lỗi và kiểm két (G1, S9-01).
- AC riêng:
  - [x] ST-2.AC-1: Given CASHIER có ca `CASHIER` `OPEN` (opening 100000) When POST `{"amount":30000,"reason":"  Mua đá  "}` Then 201, `data.workShiftId = shiftId`, `amount 30000`, `reason "Mua đá"`, `paidFromDrawer true`, `createdBy = cashierId`, `id` là UUID, `createdAt` ISO; DB có 1 dòng (kiểm: integration HTTP)
  - [x] ST-2.AC-2: Given ca opening 100000 không có bán When POST `{"amount":200000,"reason":"Sửa quạt (chủ trả)","paidFromDrawer":false}` Then 201, `paidFromDrawer false` (không kiểm két) (kiểm: integration HTTP)
  - [x] ST-2.AC-3: Given MANAGER có ca `CASHIER` của mình và OWNER có ca `CASHIER` của mình (mở với `branchId`) When mỗi người POST `{"amount":10000,"reason":"Mua đá"}` vào ca của mình Then cả hai 201 (kiểm: integration HTTP)
  - [x] ST-2.AC-4: Given ca của CASHIER When POST lần lượt các body sai Then: `{}` → 422 `VALIDATION_ERROR`; `{"amount":0,"reason":"x"}` → 422 `VALIDATION_ERROR`; `{"amount":-1,"reason":"x"}` → 422 `VALIDATION_ERROR`; `{"amount":1.5,"reason":"x"}` → 422 `VALIDATION_ERROR`; `{"amount":"1000","reason":"x"}` → 422 `VALIDATION_ERROR`; `{"amount":1000000000001,"reason":"x"}` → 422 `VALIDATION_ERROR`; `{"amount":1000,"reason":"a".repeat(256)}` → 422 `VALIDATION_ERROR`; `{"amount":1000,"reason":123}` → 422 `VALIDATION_ERROR`; `{"amount":1000,"reason":"x","paidFromDrawer":"yes"}` → 422 `VALIDATION_ERROR`; `{"amount":1000,"reason":"x","branchId":"<uuid>"}` → 422 `VALIDATION_ERROR`; `{"amount":1000}` → 422 `EXPENSE_REASON_REQUIRED`; `{"amount":1000,"reason":"   "}` → 422 `EXPENSE_REASON_REQUIRED`; `{"amount":1000,"reason":null}` → 422 `EXPENSE_REASON_REQUIRED`; `POST /work-shifts/abc/expenses` → 422 `VALIDATION_ERROR` "Mã tài nguyên không hợp lệ."; số dòng `shift_expenses` không đổi; `{"amount":1000,"reason":"a".repeat(255)}` → 201 (kiểm: integration HTTP)
  - [x] ST-2.AC-5: Given ca mới opening 100000, chưa bán When POST `{"amount":100001,"reason":"Mua đá"}` Then 422 `EXPENSE_EXCEEDS_DRAWER`, `error.details` = `[]`, message không chứa chữ số; POST `{"amount":100000,"reason":"Mua đá"}` → 201; tiếp POST `{"amount":1,"reason":"Mua đá"}` → 422 `EXPENSE_EXCEEDS_DRAWER`; tiếp POST `{"amount":1,"reason":"Mua đá","paidFromDrawer":false}` → 201; sau khi có đơn CASH `PAID` 50000 (seed SQL như `shifts.integration.test.ts:171-174`) POST `{"amount":50000,"reason":"Mua đá"}` → 201 (kiểm: integration HTTP)
  - [x] ST-2.AC-6: Given ca `CASHIER` `OPEN` của cashier chi nhánh A1 (`shiftA`) When: OWNER store B POST vào `shiftA` → 404 `SHIFT_NOT_FOUND`; CASHIER chi nhánh A2 (có ca riêng ở A2) POST vào `shiftA` → 404 `SHIFT_NOT_FOUND`; MANAGER `branch_id NULL` (seed SQL `UPDATE users SET branch_id=NULL`) POST vào `shiftA` → 404 `SHIFT_NOT_FOUND`; POST vào `randomUUID()` → 404 `SHIFT_NOT_FOUND`; MANAGER chi nhánh A1 POST vào `shiftA` → 403 `FORBIDDEN_NOT_SHIFT_OWNER`; OWNER store A (`branch.access_all`) POST vào `shiftA` → 403 `FORBIDDEN_NOT_SHIFT_OWNER` Then số dòng `shift_expenses` của `shiftA` không đổi (kiểm: integration HTTP)
  - [x] ST-2.AC-7: Given CASHIER có ca `STAFF` `OPEN` When POST `{"amount":1000,"reason":"Mua đá"}` Then 409 `CONFLICT`, message "Ca này không có két"; Given ca `CASHIER` đã đóng (`POST /close {countedCash:100000}`) When chủ ca POST Then 409 `SHIFT_CLOSED` "Ca làm việc đã được đóng từ trước"; không thêm dòng (kiểm: integration HTTP)
  - [x] ST-2.AC-8: Given `PLATFORM_ADMIN` When POST vào `shiftA` Then 403 `PERMISSION_DENIED`; Given xóa tạm `role_permissions` CASHIER–`shift.expense` When CASHIER chủ ca POST Then 403 `PERMISSION_DENIED`, khôi phục quyền trong `finally`; không thêm dòng (kiểm: integration HTTP)
  - [x] ST-2.AC-9: Given ca có 3 khoản chi tạo lần lượt E1, E2, E3 When `GET ...?limit=2` Then 200, `data` = [E3, E2], `meta.limit 2`, `meta.total 3`, `meta.nextCursor` khác null; `GET ...?limit=2&cursor=<nextCursor>` → `data` = [E1], `nextCursor null`; `GET` không tham số → `meta.limit 20`; `?sort=createdAt` → 422 `VALIDATION_ERROR` "Tham số danh sách không hợp lệ."; `?foo=1` → 422; `?limit=0` → 422; `?limit=101` → 200 `meta.limit 100`; cursor lấy từ ca khác → 422 (kiểm: integration HTTP)
  - [x] ST-2.AC-10: Given `shiftA` có 1 khoản chi When GET bởi: CASHIER chủ ca → 200; MANAGER chi nhánh A1 → 200; OWNER store A → 200; CASHIER khác cùng chi nhánh → 403 `PERMISSION_DENIED`; MANAGER chi nhánh A2 → 403 `PERMISSION_DENIED`; OWNER store B → 404 `SHIFT_NOT_FOUND`; `PLATFORM_ADMIN` → 403 `PERMISSION_DENIED` (kiểm: integration HTTP)
  - [x] ST-2.AC-11: Given trigger tạm `BEFORE INSERT ON shift_expenses` ném lỗi When POST hợp lệ Then 500 `INTERNAL_ERROR`, số dòng không đổi; drop trigger trong `finally` (kiểm: integration HTTP)
  - [x] ST-2.AC-12: Given `shiftA` When chủ ca POST vào `/work-shifts/${shiftA.toUpperCase()}/expenses` `{"amount":1000,"reason":"Mua đá"}` Then 201, `data.workShiftId === shiftA` (chữ thường) (kiểm: integration HTTP)
- Plan chi tiết:
  - File tạo/sửa:
    - `POS_API/src/shifts/http/shifts.dto.ts`: thêm `IsBoolean` vào import `class-validator`; thêm class `CreateShiftExpenseDto`.
    - `POS_API/src/shifts/http/shifts.response.ts`: thêm `ShiftExpenseResponse`, `ShiftExpensesListResponse`.
    - `POS_API/src/shifts/shifts.service.ts`: thêm `drawerExpenses`, `addExpense`, `listExpenses`, hàm thuần `expenseView(row: Record<string, any>): ShiftExpenseResponse`; import `randomUUID` từ `node:crypto`, `uuidPattern` từ `../http/request-validation`.
    - `POS_API/src/shifts/shifts.controller.ts`: thêm 2 route; import `CreateShiftExpenseDto`.
    - `POS_API/src/shifts/tests/shift-expenses.integration.test.ts`: thêm subtest ST-2.AC-1..12 và helper `addExpense`.
  - Chữ ký hàm/class:
    - `async addExpense(user: UserSummary, shiftId: string, input: CreateShiftExpenseDto): Promise<ShiftExpenseResponse>`
    - `async listExpenses(user: UserSummary, shiftId: string, rawQuery: Record<string, unknown>): Promise<ShiftExpensesListResponse>`
    - `private async drawerExpenses(manager: EntityManager, shiftId: string): Promise<bigint>`
    - `function expenseView(row: Record<string, any>): ShiftExpenseResponse` → `{ id: row.id, workShiftId: row.work_shift_id, amount: Number(row.amount), reason: row.reason, paidFromDrawer: row.paid_from_drawer, createdBy: row.created_by, createdAt: row.created_at.toISOString() }`
    - Controller:
      ```ts
      @Post(':id/expenses')
      @RequirePermission('shift.expense')
      @HttpCode(201)
      async addExpense(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body(requestValidationPipe) input: CreateShiftExpenseDto) {
        return dataResponse(await this.shiftsService.addExpense(request.authUser!, validId(id), input));
      }

      @Get(':id/expenses')
      @RequirePermission('shift.read')
      async listExpenses(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
        return this.shiftsService.listExpenses(request.authUser!, validId(id), request.query);
      }
      ```
  - DTO/schema `CreateShiftExpenseDto`:
    | field | kiểu | bắt buộc? | ràng buộc | mặc định |
    |---|---|---|---|---|
    | `amount` | `number` | có | `@IsInt() @Min(1) @Max(1000000000000)` | - |
    | `reason` | `string` | kiểm ở service | `@IsOptional() @Transform(trim) @IsString() @MaxLength(255)` (mẫu `CancelInvoiceDto`) | - |
    | `paidFromDrawer` | `boolean` | không | `@IsOptional() @IsBoolean()` | `true` (service: `input.paidFromDrawer ?? true`) |
    Thêm `@ApiProperty`/`@ApiPropertyOptional` mô tả tiếng Việt như các DTO cùng file.
    `ShiftExpenseResponse { id: string; workShiftId: string; amount: number; reason: string; paidFromDrawer: boolean; createdBy: string; createdAt: string; }`; `ShiftExpensesListResponse { data: ShiftExpenseResponse[]; meta: { limit: number; nextCursor: string | null; total: number }; }`.
  - DB/migration: Không có (dùng bảng ST-1).
  - API: như "API contract tổng" (`POST`/`GET /api/v1/work-shifts/{id}/expenses`).
  - Các bước xử lý `addExpense`:
    1. `this.checkTenant(user)`.
    2. `const reason = input.reason?.trim(); if (!reason) throw httpError(422, 'EXPENSE_REASON_REQUIRED', 'Cần nhập lý do chi.');`
    3. `return this.db.transaction(async manager => { ... })`:
       1. `const [shift] = await manager.query(\`SELECT s.id, s.branch_id, s.user_id, s.shift_type, s.status FROM work_shifts s JOIN branches b ON b.id=s.branch_id WHERE s.id=$1 AND b.store_id=$2 FOR UPDATE OF s\`, [shiftId, user.storeId]);` (khóa dòng gốc, inner join, M-14/M-20).
       2. `if (!shift || (!user.permissions.includes('branch.access_all') && shift.branch_id !== user.branchId)) throw httpError(404, 'SHIFT_NOT_FOUND', 'Ca làm việc không tồn tại');`
       3. `if (shift.status === 'CLOSED') throw httpError(409, 'SHIFT_CLOSED', 'Ca làm việc đã được đóng từ trước');`
       4. `if (shift.user_id !== user.id) throw httpError(403, 'FORBIDDEN_NOT_SHIFT_OWNER', 'Chỉ người trực tiếp làm ca mới được ghi chi phí của ca.');` (cả hai giá trị đọc từ DB, M-15).
       5. `if (shift.shift_type !== 'CASHIER') throw httpError(409, 'CONFLICT', 'Ca này không có két');`
       6. `const paidFromDrawer = input.paidFromDrawer ?? true;` nếu `paidFromDrawer`: `const [r] = await manager.query('SELECT opening_cash::text AS opening_cash FROM cash_reconciliations WHERE work_shift_id=$1', [shift.id]);` thiếu → `httpError(500, 'INTERNAL_ERROR', 'Không tìm thấy bản ghi đối soát của ca thu ngân')` (chuỗi có ở `shifts.service.ts:293`); `if (BigInt(r.opening_cash) + await this.cashSales(manager, shift.id) - await this.drawerExpenses(manager, shift.id) - BigInt(input.amount) < 0n) throw httpError(422, 'EXPENSE_EXCEEDS_DRAWER', 'Số tiền chi vượt quá tiền mặt hiện có trong két.');`
       7. `const [row] = await manager.query(\`INSERT INTO shift_expenses (id, work_shift_id, amount, reason, paid_from_drawer, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *\`, [randomUUID(), shift.id, input.amount, reason, paidFromDrawer, user.id]);` (INSERT ... RETURNING trả mảng dòng; khác UPDATE ... RETURNING của M-21).
       8. `return expenseView(row);`
  - Các bước xử lý `listExpenses`:
    1. Kiểm query: khóa cho phép `['limit','cursor','sort']`; `sort` khác `undefined`/`'-createdAt'` → 422; `limit` mặc định `'20'`, phải khớp `/^[1-9]\d{0,2}$/`, lấy `Math.min(Number(limit), 100)`; `cursor` nếu có phải khớp `/^[A-Za-z0-9_-]{1,1024}$/`. Mọi lỗi → `httpError(422, 'VALIDATION_ERROR', 'Tham số danh sách không hợp lệ.')`.
    2. `const shift = await this.getShiftDetail(user, shiftId);` (phạm vi + `checkTenant`, giữ nguyên 403/404 hiện có).
    3. Giải cursor: `JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'))`, yêu cầu `parsed.scope === shift.id`, `Date.parse(parsed.createdAt)` hữu hạn, `uuidPattern.test(parsed.id)`; sai → 422 (mẫu `sales.service.ts:96-105`).
    4. `rows = await this.db.query(\`SELECT e.*, to_char(e.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at FROM shift_expenses e WHERE e.work_shift_id=$1 AND ($2::timestamptz IS NULL OR (e.created_at,e.id) < ($2::timestamptz,$3::uuid)) ORDER BY e.created_at DESC, e.id DESC LIMIT $4\`, [shift.id, after?.createdAt ?? null, after?.id ?? null, limit + 1]);`
    5. `[count] = await this.db.query('SELECT COUNT(*)::int AS total FROM shift_expenses WHERE work_shift_id=$1', [shift.id]);`
    6. Trả `{ data: rows.slice(0, limit).map(expenseView), meta: { limit, nextCursor: rows.length > limit ? Buffer.from(JSON.stringify({ scope: shift.id, createdAt: last.cursor_created_at, id: last.id })).toString('base64url') : null, total: count.total } }`.
  - Quy tắc nghiệp vụ: BR-17, BR-51, BR-52, BR-53 (`docs/BUSINESS_RULES.md:107,117-119`); BR-80, BR-81 (`:45-46`); spec: chỉ ca `CASHIER` `OPEN` của chính người gọi, mã lỗi 404/403/409, `EXPENSE_EXCEEDS_DRAWER` 422 kiểm dưới khóa ca, `paid_from_drawer=false` lưu nhưng không trừ két; `GET` dùng `shift.read` và phạm vi `getShiftDetail`.
  - Bảng edge case:
    | Tình huống | Hành vi |
    |---|---|
    | Bấm đúp gửi 2 POST giống nhau | 2 khoản chi (không `Idempotency-Key`, spec) |
    | `paidFromDrawer:false`, `amount` 1000000000000 | 201, không kiểm két |
    | Khoản chi làm tiền kỳ vọng đúng bằng 0 | 201 |
    | Ca của người khác đã đóng | 409 `SHIFT_CLOSED` (kiểm `CLOSED` trước chủ ca) |
    | Ca `STAFF` của người khác | 403 `FORBIDDEN_NOT_SHIFT_OWNER` |
    | OWNER `branchId NULL` có `access_all`, ca của chính mình ở chi nhánh bất kỳ | 201 |
    | `reason` chỉ khoảng trắng | 422 `EXPENSE_REASON_REQUIRED` |
    | Danh sách ca không có khoản chi | 200 `data []`, `total 0`, `nextCursor null` |
  - Ảnh hưởng tới code hiện có: `ShiftsController` thêm route; `ShiftsService` thêm hàm, không đổi hàm cũ. `@Get(':id')` và `@Get(':id/expenses')` khác đường dẫn nên không xung đột.
  - Tác dụng phụ: log HTTP hiện có của filter; không event/cache/mail.
- Lỗi cũ liên quan: `20261109-owner-access-all-branch-scope.md`, `20261110-backlog-branch-scope-null-branchid-fail-open.md` → điều kiện scope ở bước 3.2; `20261111-cash-reconciliation-exceeds-money-limit.md` → kiểm két dưới khóa ca (bước 3.6); `20261111-manager-cancel-open-behavior-untested.md` → AC-3/6/8 qua HTTP vai trò thật.
- Test viết trước:
  - [x] `[S9-01][ST-2.AC-1] cashier records drawer expense on own open shift` — input: như AC-1 — expected: như AC-1
  - [x] `[S9-01][ST-2.AC-2] non-drawer expense is stored without drawer check` — input: như AC-2 — expected: 201, `paidFromDrawer false`, DB `paid_from_drawer=false`
  - [x] `[S9-01][ST-2.AC-3] manager and owner record expense on own cashier shift` — input: `freshCashierShift('MANAGER')`; OWNER store A `POST /work-shifts {shiftType:'CASHIER',branchId:<chi nhánh mới>}` — expected: hai 201
  - [x] `[S9-01][ST-2.AC-4] invalid expense bodies are rejected and nothing is stored` — input: 14 body/path ở AC-4 + body 255 ký tự — expected: như AC-4
  - [x] `[S9-01][ST-2.AC-5] drawer boundary rejects expense that makes expected cash negative` — input: như AC-5 — expected: như AC-5, `json.error.details` deepEqual `[]`, `!/\d/.test(json.error.message)`
  - [x] `[S9-01][ST-2.AC-6] expense scope and ownership checks over HTTP` — input: như AC-6 — expected: như AC-6
  - [x] `[S9-01][ST-2.AC-7] staff shift and closed shift reject expenses` — input: như AC-7 — expected: như AC-7
  - [x] `[S9-01][ST-2.AC-8] platform admin and role without shift.expense get 403` — input: như AC-8 — expected: như AC-8
  - [x] `[S9-01][ST-2.AC-9] expense list paginates newest first with cursor` — input: như AC-9 — expected: như AC-9
  - [x] `[S9-01][ST-2.AC-10] expense list follows shift detail scope` — input: như AC-10 — expected: như AC-10
  - [x] `[S9-01][ST-2.AC-11] database failure rolls back expense insert` — input: `CREATE FUNCTION s9_fail_expense() RETURNS trigger ... RAISE EXCEPTION 'S9 expense rollback'`, `CREATE TRIGGER s9_fail_expense BEFORE INSERT ON shift_expenses` — expected: 500 `INTERNAL_ERROR`, count không đổi
  - [x] `[S9-01][ST-2.AC-12] uppercase shift id in path records expense` — input: như AC-12 — expected: như AC-12
- Tiến độ:
  - [x] Red (evidence/st2/red.log)  - [x] Green (green.log)  - [x] Refactor  - [x] Test module xanh (agent chính chạy lại 2026-11-13: npm test 171/171, exit 0)

### ST-3: Đóng ca và đóng cưỡng chế trừ chi từ két
- depends_on: ST-2
- Interfaces:
  - Consumes: `private ShiftsService.drawerExpenses(manager: EntityManager, shiftId: string): Promise<bigint>` từ ST-2; helper test `addExpense(session: Session, shiftId: string, body: object): Promise<{ status: number; json: any }>` từ ST-2; `freshCashierShift(role?: 'CASHIER' | 'MANAGER')` từ ST-1.
  - Produces: Không có (hành vi `closeShift`/`forceCloseShift` đổi, chữ ký giữ nguyên).
- Mục tiêu: `expected_cash = opening_cash + cash_sales_amount − expense_amount` với `expense_amount` = tổng chi `paid_from_drawer = true`, vẫn đếm mù, lệch cần note, snapshot không đổi sau đóng (G2, S9-02).
- AC riêng:
  - [x] ST-3.AC-1: Given ca opening 100000, đơn CASH `PAID` 50000 (seed SQL), chi 30000 `paidFromDrawer:true`, chi 20000 `paidFromDrawer:false` When `GET /work-shifts/{id}` Then `reconciliation.expectedCash null`, `expenseAmount null`; When chủ ca `POST /close {countedCash:120000}` Then 200, `cashSalesAmount 50000`, `expenseAmount 30000`, `expectedCash 120000`, `countedCash 120000`, `difference 0`, `status MATCHED`; DB `cash_reconciliations` cùng giá trị (kiểm: integration HTTP)
  - [x] ST-3.AC-2: Given dữ liệu như AC-1 trên ca mới When `POST /close {countedCash:110000}` không note Then 422 `RECONCILIATION_NOTE_REQUIRED`, ca vẫn `OPEN`, `expected_cash` NULL; When `{countedCash:110000,note:"Thiếu 10.000"}` Then 200 `expenseAmount 30000`, `difference -10000`, `SHORTAGE` (kiểm: integration HTTP)
  - [x] ST-3.AC-3: Given dữ liệu như AC-1 trên ca mới (cashier chi nhánh mới) When MANAGER cùng chi nhánh `POST /force-close {countedCash:125000,reason:"Thu ngân về sớm"}` Then 200, `expenseAmount 30000`, `expectedCash 120000`, `difference 5000`, `OVERAGE`, `note "Thu ngân về sớm"` (kiểm: integration HTTP)
  - [x] ST-3.AC-4: Given ca opening 100000 không chi, không bán When đóng `{countedCash:100000}` Then `expenseAmount 0`, `expectedCash 100000`, `MATCHED` (kiểm: integration HTTP)
  - [x] ST-3.AC-5: Given ca đã đóng ở AC-1 When chủ ca POST chi `{"amount":1000,"reason":"Mua đá"}` Then 409 `SHIFT_CLOSED`; `SELECT cash_sales_amount, expense_amount, expected_cash, counted_cash, difference, status, note, reconciled_at, updated_at FROM cash_reconciliations` trước và sau deepEqual (kiểm: integration HTTP)
  - [x] ST-3.AC-6: Given ca opening 100000 và giao dịch `gate` giữ `SELECT id FROM work_shifts WHERE id=$1 FOR UPDATE` When (a) gửi chi 30000 trước, chờ 1 phiên chờ khóa, gửi đóng `{countedCash:70000}`, chờ 2 phiên, commit `gate` Then chi 201, đóng 200 `expenseAmount 30000`, `MATCHED`; When (b) gửi đóng `{countedCash:100000}` trước rồi chi 30000 Then đóng 200 `expenseAmount 0`, chi 409 `SHIFT_CLOSED`, không dòng chi mới (kiểm: integration HTTP + `pg_stat_activity`)
- Plan chi tiết:
  - File tạo/sửa:
    - `POS_API/src/shifts/shifts.service.ts`: dòng 298 `const expenseAmount = 0n;` → `const expenseAmount = await this.drawerExpenses(manager, shift.id);`; dòng 308 `reconciliation.expense_amount = '0';` → `reconciliation.expense_amount = String(expenseAmount);`; tương tự dòng 387 và 393 trong `forceCloseShift`.
    - `POS_API/src/shifts/tests/shift-expenses.integration.test.ts`: thêm subtest ST-3.AC-1..6; helper `waitLock(expected: number): Promise<void>` theo mẫu `shifts.integration.test.ts:248`.
  - Chữ ký hàm/class: không đổi (`closeShift(user, shiftId, input)`, `forceCloseShift(user, shiftId, input)`).
  - DTO/schema: Không đổi.
  - DB/migration: Không có.
  - API: không đổi hợp đồng; `reconciliation.expenseAmount` mang giá trị thật.
  - Các bước xử lý (mỗi hàm): giữ thứ tự hiện có — khóa ca (`:251-257`/`:339-345`) → đọc ca → kiểm trạng thái/chủ/phạm vi → `assertNoOpenInvoices` → `cashSales` → **`drawerExpenses`** → tính `expectedCash`/`difference` → kiểm note (đóng thường) → lưu.
  - Quy tắc nghiệp vụ: BR-53, BR-56..61, mục 17 (`docs/BUSINESS_RULES.md:119,130-135,273-277`); `CHECK expected_cash >= 0` (`20261103000000-Shifts.ts:37`) được giữ nhờ kiểm két ở ST-2/ST-4.
  - Bảng edge case:
    | Tình huống | Hành vi |
    |---|---|
    | Chỉ có chi `paidFromDrawer:false` | `expenseAmount 0` |
    | Ca `STAFF` | Không có đối soát, không gọi `drawerExpenses` (trong nhánh `shift_type === 'CASHIER'` của `closeShift`) |
    | Đóng cưỡng chế ca `STAFF` | Giữ nguyên hành vi hiện có |
    | Chi ghi đồng thời với đóng | Tuần tự theo khóa ca (AC-6) |
  - Ảnh hưởng tới code hiện có: test R2-1 (`shifts.integration.test.ts:154-258`) không có khoản chi nên vẫn `expenseAmount 0`; chạy lại toàn bộ file đó.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `20261109-cash-close-shift-zero-cash-sales.md` → sau khi sửa, grep `expense_amount\s*=\s*'0'` và `expenseAmount = 0n` trong `POS_API/src` phải rỗng; `20261111-cash-reconciliation-exceeds-money-limit.md` → AC-6 kiểm đồng thời dưới khóa ca.
- Test viết trước:
  - [x] `[S9-02][ST-3.AC-1] close subtracts only drawer expenses and keeps blind count` — input: như AC-1 — expected: như AC-1
  - [x] `[S9-02][ST-3.AC-2] close with difference still requires a note` — input: như AC-2 — expected: như AC-2
  - [x] `[S9-02][ST-3.AC-3] force close subtracts drawer expenses` — input: như AC-3 — expected: như AC-3
  - [x] `[S9-02][ST-3.AC-4] close without expenses records zero expense` — input: như AC-4 — expected: như AC-4
  - [x] `[S9-02][ST-3.AC-5] reconciliation snapshot does not change after close` — input: như AC-5 — expected: như AC-5
  - [x] `[S9-02][ST-3.AC-6] expense and close serialize on the shift lock in both orders` — input: như AC-6 — expected: như AC-6
- Tiến độ:
  - [x] Red (evidence/st3/red.log; AC-4 xanh ngay vì là ca hồi quy hành vi không chi)  - [x] Green  - [x] Refactor (không có)  - [x] Test module xanh (agent chính chạy lại 2026-11-13)

### ST-4: Hủy đơn `PAID` (quyền, phạm vi, ca còn mở, hoàn kho, trả lượt mã, két, rollback)
- depends_on: ST-2
- Interfaces:
  - Consumes: bảng `shift_expenses`, permission `invoice.cancel_paid` từ ST-1; route `POST /api/v1/work-shifts/:id/expenses` từ ST-2 (dùng trong test để tạo khoản chi).
  - Produces:
    - `SalesService.cancel(user: UserSummary, id: string, reason: string)` (chữ ký giữ nguyên; trả `Promise` của kết quả `this.detail(...)`) xử lý thêm nhánh `PAID`.
    - `private SalesService.cancelPaid(manager: EntityManager, user: UserSummary, row: Row, reason: string): Promise<void>`
    - File test `POS_API/src/sales/tests/cancel-paid.integration.test.ts` với `test('[S9-03/S9-04/S9-05] cancel PAID invoices over HTTP with PostgreSQL', { timeout: 180_000 }, async t => { ... })` và helper: `login(username: string): Promise<Record<string, string>>`, `post(path: string, headers: Record<string, string>, body: object, key?: string): Promise<Response>` (mẫu `manager-cancel.integration.test.ts:30-37`), `freshShift(): Promise<{ branchId: string; cashierId: string; cashier: Record<string, string>; shiftId: string; managerId: string; manager: Record<string, string> }>` (seed SQL chi nhánh `initial_cash 100000` + CASHIER + MANAGER cùng chi nhánh bằng `randomUUID()`, CASHIER mở ca qua HTTP), `paidCashInvoice(cashier: Record<string, string>, opts: { quantity: number; promoCode?: string; tendered?: number }): Promise<{ id: string; total: number }>` (POST `/invoices` TAKEAWAY → `/items` → `/apply-promotion` nếu có → `/payments` CASH `Idempotency-Key: randomUUID()` → 201), `snapshot(invoiceId: string): Promise<{ invoice: any; payments: any[]; movements: any[]; stocks: any[]; usedCount: number | null }>`.
- Mục tiêu: hủy đơn `PAID` theo BR-29 trong một transaction (G3, G4; S9-03, S9-04; một phần S9-05 về két).
- AC riêng:
  - [x] ST-4.AC-1: Given chi nhánh A, sản phẩm giá 25000 có công thức sữa 100.000 ml + đường 20.000 g, tồn ban đầu 1000.000 mỗi loại (dòng `IMPORT` seed SQL), mã `S9PROMO` FIXED 5000 `usage_limit 10`, CASHIER bán `quantity 2` áp mã, trả CASH `amount 45000 tenderedAmount 50000` (`used_count 1`, tồn 800.000/960.000) When MANAGER chi nhánh A (không có ca) `POST /invoices/{id}/cancel {"reason":"Khách trả hàng"}` Then 200, `data.status "CANCELLED"`, `data.cancelReason "Khách trả hàng"`, `data.cancelledAt` khác null; DB `invoices.status 'CANCELLED'`, `cancelled_by = managerId`; `payments` deepEqual trước/sau; 2 dòng `SALE` giữ nguyên; 2 dòng `SALE_REVERSAL` với `quantity` `'200.000'`, `'40.000'`, `branch_id = A`, `invoice_id = id`, `created_by = managerId`, `source 'USER'`; tồn 1000.000/1000.000; `used_count 0` (kiểm: integration HTTP)
  - [x] ST-4.AC-2: Given đơn CASH `PAID` 25000 ở chi nhánh A When OWNER store (`branch.access_all`, không có ca) hủy `{"reason":"Bán nhầm"}` Then 200 `CANCELLED`, `cancelled_by = ownerId` (kiểm: integration HTTP)
  - [x] ST-4.AC-3: Given đơn CASH `PAID` 25000 ở chi nhánh A When: CASHIER chủ ca hủy → 403 `PERMISSION_DENIED`; `PLATFORM_ADMIN` hủy → 403 `PERMISSION_DENIED`; MANAGER chi nhánh B → 404 `NOT_FOUND`; OWNER store khác → 404 `NOT_FOUND`; MANAGER chi nhánh A sau khi xóa tạm `role_permissions` MANAGER–`invoice.cancel_paid` → 403 `PERMISSION_DENIED` (khôi phục trong `finally`) Then `snapshot(id)` deepEqual trước/sau mọi lần (kiểm: integration HTTP)
  - [x] ST-4.AC-4: Given đơn CASH `PAID` When MANAGER hủy với `{}`, `{"reason":"   "}` Then 422 `CANCEL_REASON_REQUIRED` "Cần nhập lý do hủy đơn."; `{"reason":"a".repeat(256)}` → 422 `VALIDATION_ERROR`; snapshot không đổi (kiểm: integration HTTP)
  - [x] ST-4.AC-5: Given đơn CASH `PAID` của ca đã đóng (CASHIER `POST /close {countedCash:125000}` sau khi bán 25000) When MANAGER hủy `{"reason":"Khách trả hàng"}` Then 409 `CANCEL_NOT_ALLOWED`; snapshot và `cash_reconciliations` không đổi (kiểm: integration HTTP)
  - [x] ST-4.AC-6: Given đơn đã hủy ở AC-1 When MANAGER hủy lại Then 409 `INVOICE_NOT_OPEN` "Đơn không còn mở."; số dòng `SALE_REVERSAL` vẫn 2; `used_count` vẫn 0 (kiểm: integration HTTP)
  - [x] ST-4.AC-7: Given ca mới opening 100000, đơn CASH `PAID` 50000 (`quantity 2`, không mã), chi `{"amount":120000,"reason":"Mua đá"}` (két còn 30000) When MANAGER hủy đơn Then 409 `CANCEL_EXCEEDS_DRAWER`, `error.details` = `[]`, message không chứa chữ số, snapshot không đổi; Given ca mới khác cùng dữ liệu nhưng chi 100000 (két còn 50000) When hủy Then 200 (tiền kỳ vọng còn 0) (kiểm: integration HTTP)
  - [x] ST-4.AC-8: Given ca mới opening 100000, chi `{"amount":100000,"reason":"Mua đá"}` (két 0), đơn TRANSFER `PAID` 30000 seed SQL (invoice + `transfer_attempts` `PAID` + `payments` `TRANSFER` theo `shifts.integration.test.ts:182-185`, kèm 1 dòng `stock_movements` `SALE` -100.000 ml `created_by = cashierId`) When MANAGER hủy `{"reason":"Khách trả hàng, đã hoàn 30.000đ chuyển khoản"}` Then 200, `cancel_reason` lưu nguyên văn, `payments` và `transfer_attempts` không đổi, 1 dòng `SALE_REVERSAL` +100.000 (kiểm: integration HTTP)
  - [x] ST-4.AC-9: Given đơn 0đ: `quantity 1` (25000), mã `S9ZERO` FIXED 1000000, CASHIER `POST /invoices/{id}/complete-zero` với `Idempotency-Key` → 204 (`used_count` 1, 2 dòng `SALE`) When MANAGER hủy `{"reason":"Tặng nhầm"}` Then 200, không có `payments`, 2 dòng `SALE_REVERSAL`, `used_count 0` (kiểm: integration HTTP)
  - [x] ST-4.AC-10: Given đơn CASH `PAID` có mã và công thức như AC-1 (mã `S9ROLL`, `used_count 1`) và trigger tạm `BEFORE UPDATE ON invoices` ném lỗi khi `NEW.status='CANCELLED'` When MANAGER hủy Then 500 `INTERNAL_ERROR`; snapshot deepEqual trước/sau (đơn `PAID`, 0 dòng `SALE_REVERSAL`, tồn và `used_count` không đổi); drop trigger trong `finally` (kiểm: integration HTTP)
  - [x] ST-4.AC-11: Given đơn CASH `PAID` có mã `S9BROKEN` và `UPDATE promotion_codes SET used_count=0` (dữ liệu hỏng) When MANAGER hủy Then 500 `INTERNAL_ERROR`; đơn vẫn `PAID`, 0 dòng `SALE_REVERSAL`, tồn không đổi, `used_count 0` (kiểm: integration HTTP)
  - [x] ST-4.AC-12: Given đơn `OPEN` của ca CASHIER When CASHIER chủ ca hủy `{"reason":"Khách đổi ý"}` Then 200 `CANCELLED` (hành vi cũ); và toàn bộ `manager-cancel.integration.test.ts`, `sales.integration.test.ts`, `payment.integration.test.ts` xanh (kiểm: integration HTTP + chạy lại file)
  - [x] ST-4.AC-13: Given đơn CASH `PAID` 25000 When MANAGER hủy với path `/invoices/${id.toUpperCase()}/cancel` Then 200 `CANCELLED`, `data.id === id` (kiểm: integration HTTP)
  - [x] ST-4.AC-14: Given đơn CASH `PAID` `quantity 2` với công thức sữa 100.000 (dòng `SALE` -200.000) rồi `UPDATE product_size_ingredients SET quantity=150` When MANAGER hủy Then `SALE_REVERSAL` sữa = `'200.000'` (không phải 300.000) (kiểm: integration HTTP)
  - [x] ST-4.AC-15: Given đơn CASH `PAID` dùng mã `S9OFF` (`used_count 1`) rồi `UPDATE promotion_codes SET is_active=false, end_at=now()` When MANAGER hủy Then 200 và `used_count 0` (kiểm: integration HTTP)
- Plan chi tiết:
  - File tạo/sửa:
    - `POS_API/src/sales/sales.service.ts`: sửa `cancel()`; thêm `cancelPaid()`.
    - `POS_API/src/sales/sales.controller.ts`: không sửa (giữ `@RequirePermission('invoice.cancel_open')`).
    - Tạo `POS_API/src/sales/tests/cancel-paid.integration.test.ts`: fixture theo `manager-cancel.integration.test.ts:10-46` (DB `pos_s9_cancel_${randomBytes(6).toString('hex')}`, kiểm host local, seed store S và store X, chi nhánh A, B, OWNER S, OWNER X, MANAGER B, user bằng `randomUUID()` — M-19; `bootstrapAdmin(db)` cho `PLATFORM_ADMIN`; seed category/size/product/product_size giá 25000, 2 ingredient, `product_size_ingredients`, dòng `IMPORT` 1000 mỗi nguyên liệu mỗi chi nhánh dùng, mã `S9PROMO`/`S9ZERO`/`S9ROLL`/`S9BROKEN`/`S9OFF` với `start_at now()-interval '1 day'`, `end_at now()+interval '1 day'`).
  - Chữ ký hàm/class:
    - `async cancel(user: UserSummary, id: string, reason: string)` (giữ nguyên)
    - `private async cancelPaid(manager: EntityManager, user: UserSummary, row: Row, reason: string): Promise<void>`
  - DTO/schema: không đổi (`CancelInvoiceDto`).
  - DB/migration: Không có.
  - API: như "API contract tổng" (`POST /api/v1/invoices/{id}/cancel`).
  - Các bước xử lý `cancel()`:
    1. `if (!reason?.trim()) throw httpError(422, 'CANCEL_REASON_REQUIRED', 'Cần nhập lý do hủy đơn.');` (giữ nguyên).
    2. `return this.db.transaction(async manager => {`
       1. `const row = await this.invoice(manager, user, id);` (không khóa; phạm vi → 404 `NOT_FOUND`).
       2. `if (row.status === 'PAID') await this.cancelPaid(manager, user, row, reason.trim());`
       3. `else if (row.status === 'OPEN') { await this.writable(manager, user, id); await manager.query(<UPDATE hiện có dòng 442-443>, [id, reason.trim(), user.id]); }`
       4. `else throw httpError(409, 'INVOICE_NOT_OPEN', 'Đơn không còn mở.');`
       5. `return this.detail(manager, await this.invoice(manager, user, id));`
  - Các bước xử lý `cancelPaid()` (thứ tự khóa ca → hóa đơn → mã → tồn):
    1. `if (!user.permissions.includes('invoice.cancel_paid')) throw httpError(403, 'PERMISSION_DENIED', 'Bạn không có quyền thực hiện thao tác này.');`
    2. `const [shift] = await manager.query('SELECT id, status FROM work_shifts WHERE id=$1 FOR UPDATE', [row.work_shift_id]);`
    3. `if (shift.status !== 'OPEN') throw httpError(409, 'CANCEL_NOT_ALLOWED', 'Chỉ hủy được đơn đã thanh toán khi ca của đơn còn mở.');`
    4. `const locked = await this.invoice(manager, user, row.id, true); if (locked.status !== 'PAID') throw httpError(409, 'INVOICE_NOT_OPEN', 'Đơn không còn mở.');`
    5. `const [payment] = await manager.query('SELECT method, amount::text AS amount FROM payments WHERE invoice_id=$1', [row.id]);`
    6. Nếu `payment?.method === 'CASH'`: `const [cash] = await manager.query(\`SELECT r.opening_cash::text AS opening_cash, COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE i.work_shift_id=r.work_shift_id AND i.status='PAID' AND p.method='CASH'),0)::text AS cash_sales, COALESCE((SELECT SUM(e.amount) FROM shift_expenses e WHERE e.work_shift_id=r.work_shift_id AND e.paid_from_drawer=true),0)::text AS expenses FROM cash_reconciliations r WHERE r.work_shift_id=$1\`, [row.work_shift_id]);` thiếu → `httpError(500, 'INTERNAL_ERROR', 'Không tìm thấy bản ghi đối soát của ca thu ngân.')` (chuỗi có ở `sales.service.ts:283`); `if (BigInt(cash.opening_cash) + BigInt(cash.cash_sales) - BigInt(cash.expenses) - BigInt(payment.amount) < 0n) throw httpError(409, 'CANCEL_EXCEEDS_DRAWER', 'Tiền mặt trong két không đủ để hoàn cho khách.');`
    7. `const promos = await manager.query(\`SELECT p.id FROM promotion_codes p JOIN invoice_promotion_codes ip ON ip.promotion_code_id=p.id WHERE ip.invoice_id=$1 FOR UPDATE OF p\`, [row.id]);` (mẫu `sales.service.ts:304-305`); mỗi `promo`: `await manager.query('UPDATE promotion_codes SET used_count=used_count-1,updated_at=now() WHERE id=$1', [promo.id]);` (CHECK `used_count >= 0` ném lỗi khi đã 0 → 500, rollback).
    8. `const sales = await manager.query(\`SELECT branch_id, ingredient_id, quantity FROM stock_movements WHERE invoice_id=$1 AND type='SALE' ORDER BY ingredient_id, id\`, [row.id]);` mỗi dòng: `await manager.query(\`INSERT INTO stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,invoice_id,created_by,source) VALUES($1,$2,$3,'SALE_REVERSAL',-$4::numeric,0,$5,$6,'USER')\`, [randomUUID(), sale.branch_id, sale.ingredient_id, sale.quantity, row.id, user.id]);` (`sale.quantity` âm → `-$4` dương; trigger tính `balance_after`).
    9. `await manager.query(\`UPDATE invoices SET status='CANCELLED',cancel_reason=$2,cancelled_by=$3,cancelled_at=now(),updated_at=now() WHERE id=$1\`, [row.id, reason, user.id]);`
  - Quy tắc nghiệp vụ: BR-21, BR-29 (`docs/BUSINESS_RULES.md:142,150`), BR-39 (`:175`), BR-47 (`:188`), BR-54, BR-56 (`:127,130`), BR-80, BR-81 (`:45-46`), BR-104 (`:166`); `DESIGN_DB:639`; spec: OWNER/MANAGER không cần ca riêng, `CANCEL_EXCEEDS_DRAWER` 409 dưới khóa ca, TRANSFER cho phép, 0đ cho phép, `used_count` 0 → 500 rollback, `SALE_REVERSAL` theo dòng `SALE` `source 'USER'`.
  - Bảng edge case:
    | Tình huống | Hành vi |
    |---|---|
    | Đơn `PAID` đọc không khóa, đổi trạng thái trong lúc chờ khóa ca | Bước 4 kiểm lại → 409 `INVOICE_NOT_OPEN` |
    | Đơn `PAID` không có dòng `SALE` (món thiếu công thức) | 200, 0 dòng `SALE_REVERSAL` |
    | Đơn `PAID` không có mã | Không cập nhật `promotion_codes` |
    | Đơn 0đ không có `payments` | Bỏ bước 6 |
    | Đơn `TRANSFER` | Bỏ bước 6; `payments`/`transfer_attempts` giữ nguyên |
    | Webhook SePay đến sau khi đơn `CANCELLED` | Giữ nguyên luồng hiện có (`INVOICE_NOT_OPEN`, spec) |
    | CASHIER có `invoice.cancel_open`, đơn `PAID` | 403 `PERMISSION_DENIED` từ service |
    | Người không có `branchId`, không `access_all` | 404 `NOT_FOUND` từ `invoice()` |
    | Ca của đơn đã đóng và người gọi thiếu `invoice.cancel_paid` | 403 (kiểm quyền trước ca) |
  - Ảnh hưởng tới code hiện có: `cancel()` nay đọc đơn theo phạm vi trước `writable()`; nhánh `OPEN` giữ nguyên chuỗi gọi. Thay đổi ưu tiên lỗi: người không có ca hủy đơn chi nhánh khác nay nhận 404 `NOT_FOUND` thay vì 409 `SHIFT_NOT_OPEN` (không test hiện có nào kiểm trường hợp này — đã đọc `manager-cancel.integration.test.ts:51-90`, `payment.integration.test.ts:534,821,858`, `sales.integration.test.ts:67,97`). Caller của `cancel`: chỉ `sales.controller.ts:56` (đã grep).
  - Tác dụng phụ: trigger `stock_movements_apply` cập nhật `branch_ingredient_stocks`; không event/cache/mail.
- Lỗi cũ liên quan: `20261111-manager-cancel-open-behavior-untested.md` → AC-1..3 qua HTTP vai trò thật, có thu hồi quyền tạm; `20261109-owner-access-all-branch-scope.md` → AC-2 OWNER `access_all`; `20261111-cash-reconciliation-exceeds-money-limit.md` → kiểm két dưới khóa ca (bước 6); `20261110-backlog-branch-scope-null-branchid-fail-open.md` → dùng `invoice()` đã fail-closed, không viết lại điều kiện.
- Test viết trước:
  - [x] `[S9-03][ST-4.AC-1] manager without own shift cancels PAID cash invoice and everything is reversed` — input: như AC-1 — expected: như AC-1
  - [x] `[S9-03][ST-4.AC-2] owner with branch.access_all cancels PAID invoice without a shift` — input: như AC-2 — expected: như AC-2
  - [x] `[S9-03][ST-4.AC-3] cashier, platform admin, other branch, other store and revoked manager cannot cancel PAID` — input: như AC-3 — expected: như AC-3
  - [x] `[S9-03][ST-4.AC-4] PAID cancel requires a reason` — input: như AC-4 — expected: như AC-4
  - [x] `[S9-03][ST-4.AC-5] PAID invoice of a closed shift returns CANCEL_NOT_ALLOWED` — input: như AC-5 — expected: như AC-5
  - [x] `[S9-03][ST-4.AC-6] cancelling a CANCELLED invoice returns INVOICE_NOT_OPEN` — input: như AC-6 — expected: như AC-6
  - [x] `[S9-05][ST-4.AC-7] CASH cancel rejected when drawer cannot refund` — input: như AC-7 — expected: như AC-7
  - [x] `[S9-05][ST-4.AC-8] TRANSFER PAID invoice cancels without drawer check` — input: như AC-8 — expected: như AC-8
  - [x] `[S9-04][ST-4.AC-9] zero-total PAID invoice cancels and returns promotion use` — input: như AC-9 — expected: như AC-9
  - [x] `[S9-04][ST-4.AC-10] failure during PAID cancel rolls back everything` — input: như AC-10 — expected: như AC-10
  - [x] `[S9-04][ST-4.AC-11] used_count already zero aborts PAID cancel with 500` — input: như AC-11 — expected: như AC-11
  - [x] `[S9-03][ST-4.AC-12] OPEN cancel keeps its behaviour` — input: như AC-12 — expected: như AC-12
  - [x] `[S9-03][ST-4.AC-13] uppercase invoice id cancels PAID invoice` — input: như AC-13 — expected: như AC-13
  - [x] `[S9-04][ST-4.AC-14] reversal follows recorded SALE rows after recipe change` — input: như AC-14 — expected: như AC-14
  - [x] `[S9-04][ST-4.AC-15] inactive promotion still gets its use returned` — input: như AC-15 — expected: như AC-15
- Tiến độ:
  - [x] Red (evidence/st4/red.log; AC-4 và AC-12 xanh ngay vì là ca hồi quy)  - [x] Green  - [x] Refactor (không có)  - [x] Test module xanh (agent chính chạy lại 2026-11-13: npm test 193/193, exit 0)

### ST-5: Đồng thời và tiền kỳ vọng sau hủy (S9-04 đồng thời, S9-05)
- depends_on: ST-3, ST-4
- Interfaces:
  - Consumes: route `POST /api/v1/invoices/:id/cancel` nhánh `PAID` từ ST-4; `POST /api/v1/work-shifts/:id/close` có `expenseAmount` từ ST-3; `POST /api/v1/work-shifts/:id/expenses` từ ST-2; helper test `login`, `post`, `freshShift(): Promise<{ branchId: string; cashierId: string; cashier: Record<string, string>; shiftId: string; managerId: string; manager: Record<string, string> }>`, `paidCashInvoice(cashier: Record<string, string>, opts: { quantity: number; promoCode?: string; tendered?: number }): Promise<{ id: string; total: number }>`, `snapshot(invoiceId: string)` từ ST-4.
  - Produces: Không có.
- Mục tiêu: chứng minh khóa ca tuần tự hóa hủy `PAID` với hủy khác, ghi chi và đóng ca; đơn hủy rời `cash_sales_amount` (G4, G5; S9-04, S9-05).
- AC riêng:
  - [x] ST-5.AC-1: Given đơn CASH `PAID` 45000 có mã `S9RACE` (`used_count 1`) và 2 dòng `SALE`, `gate` giữ khóa dòng ca When gửi 2 `POST /cancel` của MANAGER, chờ 2 phiên chờ khóa, commit `gate` Then status sắp xếp `[200, 409]`, 409 có `INVOICE_NOT_OPEN`; đúng 2 dòng `SALE_REVERSAL`; `used_count 0`; tồn về giá trị trước bán (kiểm: integration HTTP + `pg_stat_activity`)
  - [x] ST-5.AC-2: Given ca mới opening 100000, đơn CASH `PAID` 50000 đã được MANAGER hủy When CASHIER `POST /close {countedCash:100000}` Then 200, `cashSalesAmount 0`, `expenseAmount 0`, `expectedCash 100000`, `MATCHED` (kiểm: integration HTTP)
  - [x] ST-5.AC-3: Given ca mới opening 100000, đơn CASH `PAID` 50000 giữ nguyên, đơn TRANSFER `PAID` 30000 (seed SQL như ST-4.AC-8) đã được MANAGER hủy `{"reason":"Hoàn 30.000đ chuyển khoản cho khách"}` When CASHIER `POST /close {countedCash:150000}` Then 200, `cashSalesAmount 50000`, `expectedCash 150000`, `MATCHED`; `invoices.cancel_reason = 'Hoàn 30.000đ chuyển khoản cho khách'` (kiểm: integration HTTP)
  - [x] ST-5.AC-4: Given ca mới opening 100000, đơn CASH `PAID` 50000, `gate` giữ khóa ca When (a) gửi hủy trước, chờ 1 phiên, gửi đóng `{countedCash:100000}`, chờ 2 phiên, commit Then hủy 200, đóng 200 `cashSalesAmount 0`, `MATCHED`; When (b) trên ca mới gửi đóng `{countedCash:150000}` trước rồi hủy Then đóng 200 `cashSalesAmount 50000`, hủy 409 `CANCEL_NOT_ALLOWED`, đơn vẫn `PAID` (kiểm: integration HTTP + `pg_stat_activity`)
  - [x] ST-5.AC-5: Given ca mới opening 100000, đơn CASH `PAID` 50000 (két 150000), `gate` giữ khóa ca When (a) hủy trước rồi chi `{"amount":120000,"reason":"Mua đá"}` Then hủy 200, chi 422 `EXPENSE_EXCEEDS_DRAWER`; When (b) trên ca mới chi trước rồi hủy Then chi 201, hủy 409 `CANCEL_EXCEEDS_DRAWER`; cả hai trường hợp đóng ca sau đó với `countedCash` = 100000 (a) / 30000 (b) → 200 `MATCHED`, `expected_cash >= 0` (kiểm: integration HTTP + `pg_stat_activity`)
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/sales/tests/cancel-paid.integration.test.ts` — thêm subtest ST-5.AC-1..5, helper `waitLock(expected: number): Promise<void>` theo mẫu `shifts.integration.test.ts:248` (deadline 10000 ms, poll 20 ms, `wait_event_type='Lock' AND query LIKE '%FOR UPDATE%'`). Không sửa source (nếu test đỏ do lỗi khóa thì sửa ở `sales.service.ts`/`shifts.service.ts` trong phạm vi bước khóa đã định ở ST-2/ST-4 và ghi Changelog).
  - Chữ ký hàm/class: Không có hàm production mới.
  - DTO/schema: Không có.
  - DB/migration: Không có.
  - API: Không đổi.
  - Các bước xử lý (mỗi test đồng thời):
    1. `const gate = db.createQueryRunner(); await gate.connect(); await gate.startTransaction(); await gate.query('SELECT id FROM work_shifts WHERE id=$1 FOR UPDATE', [shiftId]);`
    2. Gửi yêu cầu thứ nhất (không `await`), `await waitLock(1)`; gửi yêu cầu thứ hai, `await waitLock(2)`.
    3. `finally { await gate.commitTransaction(); await gate.release(); }`
    4. `await` cả hai, assert status và DB.
  - Quy tắc nghiệp vụ: spec "Thứ tự khóa: ca → hóa đơn → mã khuyến mãi → tồn kho; ghi chi phí, hủy `PAID`, đóng ca/đóng cưỡng chế đều khóa dòng ca trước"; BR-29, BR-54, BR-56, BR-61; anti-goal "hai yêu cầu hủy đồng thời cùng ghi dữ liệu", "đóng ca đọc tổng chi lệch".
  - Bảng edge case:
    | Tình huống | Hành vi |
    |---|---|
    | Hai hủy cùng lúc | Một 200, một 409 `INVOICE_NOT_OPEN` |
    | Hủy và đóng cùng lúc | Thứ tự khóa quyết định; không có trạng thái ghi dở |
    | Hủy và chi cùng lúc làm két âm | Yêu cầu sau bị từ chối (422/409) |
  - Ảnh hưởng tới code hiện có: Không có.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `20261111-cash-reconciliation-exceeds-money-limit.md` → "kiểm tra cả giới hạn ... dưới cùng khóa đồng thời" (AC-4, AC-5); MEMORY M-14 (kiểm thứ tự chờ khóa thật bằng `pg_stat_activity`), M-20 (`--test-concurrency=1`).
- Test viết trước:
  - [x] `[S9-04][ST-5.AC-1] two concurrent PAID cancels write once` — input: như AC-1 — expected: như AC-1
  - [x] `[S9-05][ST-5.AC-2] cancelled CASH invoice leaves cash sales` — input: như AC-2 — expected: như AC-2
  - [x] `[S9-05][ST-5.AC-3] cancelled TRANSFER invoice does not touch the drawer` — input: như AC-3 — expected: như AC-3
  - [x] `[S9-05][ST-5.AC-4] PAID cancel and close serialize in both orders` — input: như AC-4 — expected: như AC-4
  - [x] `[S9-05][ST-5.AC-5] PAID cancel and drawer expense serialize and keep expected cash non-negative` — input: như AC-5 — expected: như AC-5
- Tiến độ:
  - [x] Red (không có Red thật: hành vi có sẵn từ ST-2/3/4, ST-5 chỉ thêm test; thay bằng đột biến đỏ ở evidence/st5/mutants.log)  - [x] Green  - [x] Refactor (chỉ file test)  - [x] Test module xanh (agent chính chạy lại 2 lần liên tiếp 2026-11-13: npm test 198/198 exit 0)

## Ma trận AC ↔ test
| AC | Test | Input | Expected |
|----|------|-------|----------|
| E2E-AC-1 | `[S9-01][ST-2.AC-1]`, `[S9-01][ST-2.AC-9]`, `[S9-01][ST-2.AC-8]`, `[S9-01][ST-2.AC-7]` | POST `{amount:30000,reason:"Mua đá"}`; GET; PLATFORM_ADMIN; ca đóng | 201; 200 total 1; 403; 409 `SHIFT_CLOSED` |
| E2E-AC-2 | `[S9-02][ST-3.AC-1]`, `[S9-02][ST-3.AC-3]` | opening 100000, CASH 50000, chi 30000/20000(false), counted 120000 / force 125000 | expected 120000 MATCHED / OVERAGE 5000, expense 30000 |
| E2E-AC-3 | `[S9-03][ST-4.AC-1]`, `[S9-03][ST-4.AC-3]`, `[S9-03][ST-4.AC-5]` | MANAGER/CASHIER/MANAGER B/PLATFORM_ADMIN/ca đóng | 200 / 403 / 404 / 403 / 409 `CANCEL_NOT_ALLOWED` |
| E2E-AC-4 | `[S9-03][ST-4.AC-1]`, `[S9-04][ST-4.AC-10]`, `[S9-04][ST-5.AC-1]` | hủy đơn có mã + 2 SALE; trigger lỗi; 2 hủy đồng thời | 2 SALE_REVERSAL, used_count 0; 500 không đổi; [200,409] |
| E2E-AC-5 | `[S9-05][ST-5.AC-2]`, `[S9-05][ST-5.AC-3]` | hủy CASH 50000 → close 100000; hủy TRANSFER 30000 → close 150000 | cashSales 0 MATCHED; cashSales 50000 MATCHED |
| ST-1.AC-1 | `[S9-01][ST-1.AC-1] migration creates shift_expenses columns and index` | information_schema, pg_indexes | 8 cột, default true, index |
| ST-1.AC-2 | `[S9-01][ST-1.AC-2] shift_expenses constraints reject invalid rows` | 4 INSERT sai, 1 đúng | 4 × `23514`; default true |
| ST-1.AC-3 | `[S9-01][ST-1.AC-3] new permissions granted to the decided roles` | SELECT role theo permission | `['CASHIER','MANAGER','OWNER']`, `['MANAGER','OWNER']` |
| ST-2.AC-1 | `[S9-01][ST-2.AC-1] cashier records drawer expense on own open shift` | `{amount:30000,reason:"  Mua đá  "}` | 201, reason trim, paidFromDrawer true |
| ST-2.AC-2 | `[S9-01][ST-2.AC-2] non-drawer expense is stored without drawer check` | `{amount:200000,...,paidFromDrawer:false}` | 201 |
| ST-2.AC-3 | `[S9-01][ST-2.AC-3] manager and owner record expense on own cashier shift` | MANAGER, OWNER | 201, 201 |
| ST-2.AC-4 | `[S9-01][ST-2.AC-4] invalid expense bodies are rejected and nothing is stored` | 14 input sai, 1 input 255 ký tự | 422 đúng mã; 201 |
| ST-2.AC-5 | `[S9-01][ST-2.AC-5] drawer boundary rejects expense that makes expected cash negative` | 100001 / 100000 / 1 / 1 false / 50000 sau bán | 422 / 201 / 422 / 201 / 201; details [] |
| ST-2.AC-6 | `[S9-01][ST-2.AC-6] expense scope and ownership checks over HTTP` | owner B, cashier A2, manager NULL branch, id lạ, manager A1, owner A | 404×4, 403×2 |
| ST-2.AC-7 | `[S9-01][ST-2.AC-7] staff shift and closed shift reject expenses` | ca STAFF, ca CLOSED | 409 `CONFLICT`, 409 `SHIFT_CLOSED` |
| ST-2.AC-8 | `[S9-01][ST-2.AC-8] platform admin and role without shift.expense get 403` | PLATFORM_ADMIN, CASHIER bị thu quyền | 403, 403 |
| ST-2.AC-9 | `[S9-01][ST-2.AC-9] expense list paginates newest first with cursor` | 3 khoản, limit 2, cursor, query sai | [E3,E2] → [E1]; 422 |
| ST-2.AC-10 | `[S9-01][ST-2.AC-10] expense list follows shift detail scope` | 7 vai trò/phạm vi | 200×3, 403×3, 404 |
| ST-2.AC-11 | `[S9-01][ST-2.AC-11] database failure rolls back expense insert` | trigger lỗi INSERT | 500, count không đổi |
| ST-2.AC-12 | `[S9-01][ST-2.AC-12] uppercase shift id in path records expense` | path HOA | 201, workShiftId thường |
| ST-3.AC-1 | `[S9-02][ST-3.AC-1] close subtracts only drawer expenses and keeps blind count` | như AC | expected 120000 MATCHED; trước đóng null |
| ST-3.AC-2 | `[S9-02][ST-3.AC-2] close with difference still requires a note` | counted 110000 ± note | 422; 200 SHORTAGE -10000 |
| ST-3.AC-3 | `[S9-02][ST-3.AC-3] force close subtracts drawer expenses` | force 125000 | OVERAGE 5000 |
| ST-3.AC-4 | `[S9-02][ST-3.AC-4] close without expenses records zero expense` | counted 100000 | expense 0 MATCHED |
| ST-3.AC-5 | `[S9-02][ST-3.AC-5] reconciliation snapshot does not change after close` | chi sau đóng | 409; snapshot bằng nhau |
| ST-3.AC-6 | `[S9-02][ST-3.AC-6] expense and close serialize on the shift lock in both orders` | gate, 2 thứ tự | 201+200 expense 30000; 200 expense 0 + 409 |
| ST-4.AC-1 | `[S9-03][ST-4.AC-1] manager without own shift cancels PAID cash invoice and everything is reversed` | như AC | 200; DB như AC |
| ST-4.AC-2 | `[S9-03][ST-4.AC-2] owner with branch.access_all cancels PAID invoice without a shift` | OWNER | 200 |
| ST-4.AC-3 | `[S9-03][ST-4.AC-3] cashier, platform admin, other branch, other store and revoked manager cannot cancel PAID` | 5 người gọi | 403, 403, 404, 404, 403; snapshot bằng nhau |
| ST-4.AC-4 | `[S9-03][ST-4.AC-4] PAID cancel requires a reason` | `{}`, `"   "`, 256 ký tự | 422 `CANCEL_REASON_REQUIRED` ×2, 422 `VALIDATION_ERROR` |
| ST-4.AC-5 | `[S9-03][ST-4.AC-5] PAID invoice of a closed shift returns CANCEL_NOT_ALLOWED` | ca đóng | 409 `CANCEL_NOT_ALLOWED` |
| ST-4.AC-6 | `[S9-03][ST-4.AC-6] cancelling a CANCELLED invoice returns INVOICE_NOT_OPEN` | hủy lại | 409 `INVOICE_NOT_OPEN`, 2 reversal, used 0 |
| ST-4.AC-7 | `[S9-05][ST-4.AC-7] CASH cancel rejected when drawer cannot refund` | chi 120000 / chi 100000 | 409 `CANCEL_EXCEEDS_DRAWER` details [] / 200 |
| ST-4.AC-8 | `[S9-05][ST-4.AC-8] TRANSFER PAID invoice cancels without drawer check` | két 0, TRANSFER 30000 | 200, payments/attempts không đổi, 1 reversal |
| ST-4.AC-9 | `[S9-04][ST-4.AC-9] zero-total PAID invoice cancels and returns promotion use` | đơn 0đ `S9ZERO` | 200, 2 reversal, used 0 |
| ST-4.AC-10 | `[S9-04][ST-4.AC-10] failure during PAID cancel rolls back everything` | trigger lỗi UPDATE invoices | 500, snapshot bằng nhau |
| ST-4.AC-11 | `[S9-04][ST-4.AC-11] used_count already zero aborts PAID cancel with 500` | used_count 0 | 500, đơn PAID, 0 reversal |
| ST-4.AC-12 | `[S9-03][ST-4.AC-12] OPEN cancel keeps its behaviour` | CASHIER hủy OPEN + chạy lại 3 file test sales | 200; các file xanh |
| ST-4.AC-13 | `[S9-03][ST-4.AC-13] uppercase invoice id cancels PAID invoice` | path HOA | 200, id thường |
| ST-4.AC-14 | `[S9-04][ST-4.AC-14] reversal follows recorded SALE rows after recipe change` | công thức 100 → 150 sau bán | reversal sữa `'200.000'` |
| ST-4.AC-15 | `[S9-04][ST-4.AC-15] inactive promotion still gets its use returned` | mã ngưng/hết hạn | 200, used 0 |
| ST-5.AC-1 | `[S9-04][ST-5.AC-1] two concurrent PAID cancels write once` | 2 hủy, gate | [200,409], 2 reversal, used 0 |
| ST-5.AC-2 | `[S9-05][ST-5.AC-2] cancelled CASH invoice leaves cash sales` | hủy CASH 50000, close 100000 | cashSales 0 MATCHED |
| ST-5.AC-3 | `[S9-05][ST-5.AC-3] cancelled TRANSFER invoice does not touch the drawer` | hủy TRANSFER 30000, close 150000 | cashSales 50000 MATCHED |
| ST-5.AC-4 | `[S9-05][ST-5.AC-4] PAID cancel and close serialize in both orders` | gate, 2 thứ tự | 200+200 cash 0; 200 cash 50000 + 409 `CANCEL_NOT_ALLOWED` |
| ST-5.AC-5 | `[S9-05][ST-5.AC-5] PAID cancel and drawer expense serialize and keep expected cash non-negative` | gate, 2 thứ tự | 200+422; 201+409; close MATCHED |
| RF-1 | `[S9-01][ST-2.AC-12]`, `[S9-03][ST-4.AC-13]` | path HOA | 201 / 200 |
| RF-2 | `[S9-01][ST-2.AC-5]`, `[S9-05][ST-4.AC-7]` | vượt két | details [], message không có số |
| RF-3 | `[S9-04][ST-4.AC-14]` | công thức đổi | reversal theo SALE |
| RF-4 | `[S9-04][ST-4.AC-15]` | mã ngưng | used giảm 1 |
| RF-5 | `[S9-01][ST-2.AC-6]` | MANAGER branch NULL | 404 |

Ma trận bằng chứng cho verify-ac (M-9, M-16; raw lưu ở `.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/evidence/`, kèm `git rev-parse HEAD` và SHA256 của `dist/` đã chạy):

| AC | Artifact bắt buộc |
|---|---|
| ST-1.AC-1..3 | stdout `node --test` có dòng `ok` của từng test; output `SELECT` cột/index/role |
| ST-2.AC-1..12, ST-3.AC-1..6 | stdout `node --test dist/shifts/tests/shift-expenses.integration.test.js`; với AC-1, AC-5, AC-6: request/response HTTP đã che cookie/CSRF + `SELECT * FROM shift_expenses WHERE work_shift_id=...` trước/sau |
| ST-3.AC-1, AC-3, AC-5 | `SELECT` `cash_reconciliations` trước/sau đóng; response đóng ca |
| ST-4.AC-1..15 | stdout `node --test dist/sales/tests/cancel-paid.integration.test.js`; với AC-1, AC-10: `SELECT` `invoices`, `payments`, `stock_movements`, `branch_ingredient_stocks`, `promotion_codes.used_count` trước/sau |
| ST-5.AC-1..5 | stdout test; log số phiên chờ khóa quan sát được; `SELECT` cuối |
| E2E-AC-1..5 | tổng hợp từ các dòng trên + `npm test` toàn bộ API exit 0 với tổng số pass |

## Rủi ro
- `EXPENSE_EXCEEDS_DRAWER`/`CANCEL_EXCEEDS_DRAWER` cho phép thu ngân dò ngưỡng tiền kỳ vọng bằng thử nhiều số (mâu thuẫn mềm với BR-58; user đã duyệt mã lỗi) — cách giảm: message cố định không chứa số, `details: []` (RF-2); ghi vào phần cần user biết.
- Deadlock giữa hủy `PAID`, `payCash` và đóng ca — cách giảm: mọi luồng khóa dòng ca trước (`writable()` khóa ca rồi đơn; hủy `PAID` khóa ca rồi đơn; đóng ca chỉ khóa ca; ghi chi chỉ khóa ca); `SALE_REVERSAL` theo `ORDER BY ingredient_id` giống `finalizeInvoice`; test ST-3.AC-6, ST-5.AC-1/4/5.
- Hủy `PAID` cần cả `invoice.cancel_open` (guard) và `invoice.cancel_paid` (service) — cách giảm: tương đương với seed hiện tại; ghi ở "Giả định"; nếu sau này có vai trò chỉ có `invoice.cancel_paid` thì phải đổi guard.
- Đổi ưu tiên lỗi của `cancel()` (đọc đơn theo phạm vi trước `writable()`) có thể làm test cũ đổi mã — cách giảm: ST-4.AC-12 chạy lại 3 file test sales và toàn bộ `npm test`.
- Test đồng thời phụ thuộc thời gian (`pg_stat_activity`) có thể chập chờn — cách giảm: dùng đúng mẫu `waitLock` đã ổn định ở `shifts.integration.test.ts:248` (deadline 10 s), `--test-concurrency=1` (M-20).
- `npm test` cần PostgreSQL local; máy không có DB thì ghi "chưa chạy", không suy kết quả (`AGENTS.md`).
- Message lỗi mới: đã được user chốt 2026-11-13.

## Lệnh kiểm tra
- Lint: Không có lệnh lint (không có script trong `POS_API/package.json`; nguồn `.devloopflow/devloopflow.md:26`).
- Typecheck: API kiểm kiểu qua build — trong `POS_API/`: `npm run build`.
- Test:
  - Toàn bộ API (cần `DATABASE_URL` trỏ PostgreSQL local/test): trong `POS_API/`: `npm test`.
  - Một file sau khi build: trong `POS_API/`: `node --env-file-if-exists=.env --test --test-concurrency=1 dist/shifts/tests/shift-expenses.integration.test.js` và `node --env-file-if-exists=.env --test --test-concurrency=1 dist/sales/tests/cancel-paid.integration.test.js`.
  - Một case: thêm `--test-name-pattern="ST-4.AC-1\]"` vào lệnh một file.
  - Hồi quy liên quan: `node --env-file-if-exists=.env --test --test-concurrency=1 dist/shifts/tests/shifts.integration.test.js dist/sales/tests/manager-cancel.integration.test.js dist/sales/tests/sales.integration.test.js dist/sales/tests/payment.integration.test.js`.
- Build: trong `POS_API/`: `npm run build`.
- Coverage: Không có lệnh coverage (nguồn `.devloopflow/devloopflow.md:29`).
- Chạy app: trong `POS_API/`: `npm run migration:run` (DB local/test) rồi `npm run start` — URL/port: `http://localhost:3000`, kiểm `GET /api/v1/health`.
- Cập nhật graph sau khi sửa code: tại gốc repo `graphify update .`.

## Câu hỏi mở
- Không còn (câu hỏi 1 về message lỗi đã được user duyệt 2026-11-13).

## Changelog plan
- 2026-11-13: tạo plan nháp (chỉ thêm, không xoá)
- 2026-11-13 (delta ST-1, user duyệt "có sửa luôn"): `tdd` báo DỪNG vì `POS_API/src/foundation.test.ts:37` gắn cứng `runMigrations().length` = 10 mà migration `20261113000000-ShiftExpenses.ts` làm thành 11 (`11 !== 10`). Thêm vào ST-1: sửa dòng 37 thành `11`, bảo vệ bằng test `PB-01 migration, bootstrap and database constraints`. Không thêm AC mới (không đổi hành vi). Nhắc cho các sprint sau: test này phải tăng số mỗi khi thêm migration.
- 2026-11-13: user duyệt 5 message lỗi và giả định; chấp nhận 404 `NOT_FOUND` thay 409 `SHIFT_NOT_OPEN` khi hủy đơn ngoài phạm vi (đã ghi vào spec); điền message vào API contract và các bước xử lý; đóng Câu hỏi mở 1; `status: approved`.

## Kiểm tra sẵn sàng
- [x] Không còn từ mơ hồ, TBD, TODO, "v.v.", "CHƯA CÓ NGUỒN" — đạt sau khi user duyệt 5 message (2026-11-13).
- [x] Mọi fact/quy tắc/field/endpoint có path nguồn hoặc nằm trong "Quyết định" của user; không có thông tin tự suy đoán — đạt; message lỗi mới do user duyệt 2026-11-13.
- [x] Không có mục nào bị bỏ, rút gọn hoặc tóm tắt so với template — đạt.
- [x] Interfaces: mọi Consumes của một sub-task khớp đúng tên, tham số, kiểu trả về với Produces của sub-task nó phụ thuộc — đạt (đã đối chiếu `drawerExpenses`, `addExpense`, `freshCashierShift`, `freshShift`, `paidCashInvoice`, `snapshot`).
- [x] Review Focus: mỗi dòng có test trong ma trận AC ↔ test (hoặc ghi "Đã kiểm, không có") — đạt (RF-1..5 có dòng ma trận).
- [x] Mục "Câu hỏi mở" rỗng, mục "Giả định" đã được xác nhận — đạt (user duyệt 2026-11-13).
- [x] Mỗi sub-task có: AC riêng đo được, plan chi tiết riêng, danh sách test có input/expected — đạt.
- [x] Mọi AC có ít nhất 1 test trong ma trận AC ↔ test; mọi test thuộc 1 AC — đạt.
- [x] Đủ AC cho happy path, input sai/thiếu, quyền, biên, lỗi hệ thống — đạt (ví dụ ST-2.AC-1/4/6/5/11, ST-4.AC-1/4/3/7/10).
- [x] File tạo/sửa liệt kê đủ (gồm test, migration, config, docs cần cập nhật) — đạt (docs ở bước sync-docs, mục "Phạm vi").
- [x] Đã đối chiếu .devloopflow/errors/ và ghi "Lỗi cũ cần tránh" (hoặc ghi rõ không có) — đạt (6 file + MEMORY).
- [x] Lệnh lint/typecheck/test/build/coverage/chạy app là lệnh thật của dự án — đạt (`POS_API/package.json:6-9`, `.devloopflow/devloopflow.md:21-30`).
- [x] Một agent khác đọc plan này có làm được mà không cần hỏi lại — đạt sau khi chốt message.
