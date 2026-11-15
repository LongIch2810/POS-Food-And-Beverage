---
id: 20261115-sprint10-stock-ledger
title: Tab Sổ kho — hoàn thiện sau kiểm app thật (S10-11) và router cho mọi tab
status: completed
created_at: 2026-11-15
approved_at: 2026-11-15
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Tab Sổ kho — hoàn thiện sau kiểm app thật (S10-11) và router cho mọi tab

## Mục tiêu và bối cảnh
- Vì sao làm:
  - Kiểm app thật ngày 2026-11-15 cho thấy 5 vế S10-11 đạt về hành vi nhưng còn M1 (không biết dòng thuộc chi nhánh nào khi xem "Tất cả chi nhánh"), M2 (Ghi chú hiện UUID hóa đơn), L1..L5, V1 (phần ô chọn), V2, V3 — nguồn: `.devloopflow/verify/20261115-sprint10-stock-ledger/current-state.md:53-62`, spec `.devloopflow/specs/20261115-sprint10-stock-ledger.md:12`.
  - User yêu cầu "sửa" M1, M2 và "làm luôn" các mục còn lại; F5 phải dùng router thật cho tab chính và mọi tab con, địa chỉ sạch dạng `/kho/so-kho` — nguồn: spec `:13`, `:30`, `:75-78`.
  - Tiêu chí sprint S10-11: "Tab Sổ kho hiển thị biến động thực từ API theo quyền và chi nhánh, gồm xuất bán và hoàn trả kho khi có dữ liệu; reload hoặc đổi phiên không lộ dữ liệu cũ, trạng thái rỗng/lỗi rõ ràng." — nguồn: `sprints/sprint-10/SPRINT.md:42`.
- Ai dùng:
  - OWNER (có `branch.access_all`, xem mọi chi nhánh), MANAGER (một chi nhánh) đọc Sổ kho; CASHIER và PLATFORM_ADMIN không có `inventory.view` — nguồn: `POS_API/src/database/migrations/20261107000000-InventoryPromotions.ts:104-107`, `POS_API/src/database/migrations/20261030000000-Organization.ts:27-28`.
  - Router ảnh hưởng mọi người dùng UI (OWNER, MANAGER, CASHIER, PLATFORM_ADMIN) trên tablet ngang 1024×768 — nguồn: `CLAUDE.md` mục "Quy tắc sản phẩm cần giữ".

## Khám phá
### API Sổ kho
- `@Controller('api/v1/stock-movements')`, `@Get() @RequirePermission('inventory.view')`, gọi `noInput(request,true)` rồi `this.inventory.listMovements(request.authUser!,query)` — nguồn: `POS_API/src/inventory/inventory.controller.ts:77-86`.
- `branch(user, branchId, required)`: user có `branchId` → query có `branchId` thì `throw invalid()` (422 `VALIDATION_ERROR` "Dữ liệu kho không hợp lệ."), không thì trả `user.branchId`; user không có `branchId` → nhận query `branchId` (UUID) hoặc `null` — nguồn: `POS_API/src/inventory/inventory.service.ts:9`, `:29-37`.
- `checkScope`: `branchId` ngoài store → `404 NOT_FOUND` "Không tìm thấy chi nhánh."; `ingredientId` ngoài store → `404 NOT_FOUND` "Không tìm thấy nguyên liệu." — nguồn: `POS_API/src/inventory/inventory.service.ts:39-48`.
- `listMovements`: count `SELECT count(*)::int ... FROM stock_movements m JOIN branches b ON b.id=m.branch_id WHERE ${where}` (`:249`); cursor key `created_at` dạng `YYYY-MM-DDTHH:MI:SS.USZ` (`:241-243`, `:252`); truy vấn `SELECT m.*, ... i.name AS ingredient_name,i.unit FROM stock_movements m JOIN branches b ON b.id=m.branch_id JOIN ingredients i ON i.id=m.ingredient_id WHERE ${where} ORDER BY m.created_at DESC,m.id DESC LIMIT ...` (`:252-255`); DTO `{ id, branchId, ingredientId, ingredientName, unit, type, quantity, balanceAfter, invoiceId, note, createdAt }` (`:256-259`) — nguồn: `POS_API/src/inventory/inventory.service.ts:234-260`.
- `finish()` tạo `nextCursor` = base64url của `{"scope":<scope>,"key":<cursor_time của dòng cuối>,"id":<id dòng cuối>}`; scope Sổ kho là `JSON.stringify(['movements',store,branch,query.ingredientId ?? null,query.type ?? null])` — nguồn: `POS_API/src/inventory/inventory.service.ts:71-77`, `:240`.
- Bảng `stock_movements` có `invoice_id uuid REFERENCES invoices(id)`, `note varchar(255)`, `quantity numeric(14,3) NOT NULL CHECK (quantity <> 0)`; trigger `apply_stock_movement` tự tính `balance_after` và chặn movement khác store giữa branch và ingredient (không kiểm invoice) — nguồn: `POS_API/src/database/migrations/20261107000000-InventoryPromotions.ts:45-70`. `created_by` cho phép NULL và có cột `source` mặc định `'USER'` — nguồn: `POS_API/src/database/migrations/20261109000000-Payments.ts:96-97`.
- `invoices.invoice_code varchar(10) NOT NULL UNIQUE`, `CHECK (invoice_code ~ '^HD[A-Z0-9]{8}$')`, `invoices.branch_id` NOT NULL — nguồn: `POS_API/src/database/migrations/20261106000000-Sales.ts:8-13`, `:28`.
- SALE ghi `invoice_id`, không ghi `note` — nguồn: `POS_API/src/sales/sales.service.ts:384-387`; SALE_REVERSAL ghi `invoice_id`, không ghi `note` — nguồn: `POS_API/src/sales/sales.service.ts:545-549`.
- Test hiện có: `POS_API/src/inventory/tests/inventory.integration.test.ts:47-52` (cursor micro-giây không bỏ sót dòng kề), `:98-99` (`ingredientId` lạ → `NOT_FOUND`); `POS_API/src/inventory/tests/inventory.http.test.ts:71` (chỉ `POST /stock-movements` → 404). Không có test HTTP cho `GET /stock-movements`.
- Mẫu seed hóa đơn bằng SQL trong test: `INSERT INTO work_shifts(id,branch_id,user_id,shift_type,started_at,status) VALUES(...,'CASHIER',now() - interval '1 hour','OPEN')` và `INSERT INTO invoices(id,branch_id,work_shift_id,invoice_code,created_by,order_type,status,subtotal,total_amount,paid_at) VALUES(...,'TAKEAWAY','PAID',35000,35000,now())` — nguồn: `POS_API/src/reports/tests/reports-permissions.integration.test.ts:72-73`.
- Mẫu tạo store/owner/branch/user qua HTTP trong test: `POS_API/src/inventory/tests/inventory.http.test.ts:10-58` (bootstrap admin, `/platform/stores`, `/branches`), `POS_API/src/menu/tests/menu.integration.test.ts:100-111` (`POST /users` body `{branchId,username,fullName,role}` → `json.data.temporaryPassword`, `json.data.user.id`).

### Quyền theo vai trò (từ migration)
- OWNER: `branch.read, branch.manage, branch.access_all, table.manage, user.manage` (`20261030000000-Organization.ts:27`), `menu.read, menu.manage` (`20261102000000-MenuCatalog.ts:92-93`), `shift.read, shift.open, shift.close, shift.force_close` (`20261103000000-Shifts.ts:59-60`), `pos.sell, invoice.cancel_open, invoice.read, table.read` (`20261106000000-Sales.ts:71-72`), `inventory.view, inventory.manage, promotion.manage` (`20261107000000-InventoryPromotions.ts:104-107`), `store_bank_account.manage, transfer.confirm_manual, transfer.exception_read` (`20261109000000-Payments.ts:109-110`), `shift.expense, invoice.cancel_paid` (`20261113000000-ShiftExpenses.ts:25-26`), `invoice.read_branch` (`20261114000000-InvoiceReadScope.ts:13`), `report.view_all` (`20261114000001-ReportsPermissions.ts:17`).
- MANAGER: `branch.read, table.manage` (`20261030000000-Organization.ts:28`), `menu.read, menu.manage`, `shift.read, shift.open, shift.close, shift.force_close`, `invoice.read, table.read`, `inventory.view, inventory.manage, promotion.manage`, `pos.sell, transfer.confirm_manual, transfer.exception_read` (`20261109000000-Payments.ts:108,110`), `invoice.cancel_open` (`20261111000000-ManagerCancelOpen.ts:10`), `shift.expense, invoice.cancel_paid`, `invoice.read_branch`, `report.view_branch` (`20261114000001-ReportsPermissions.ts:16`).
- CASHIER: `menu.read`, `shift.read, shift.open, shift.close`, `pos.sell, invoice.cancel_open, invoice.read, table.read`, `shift.expense`, `report.view_shift` (`20261114000001-ReportsPermissions.ts:15`).
- PLATFORM_ADMIN: `store.read, store.create, store.suspend, user.read_owner, user.create_owner, user.reset_owner_password` — nguồn: `POS_API/src/database/migrations/20261029000000-PlatformPermissions.ts:16-20`.

### API phiên (auth)
- `interface UserSummary { id; username; fullName; role; storeId; branchId; permissions; mustChangePassword }` — nguồn: `POS_API/src/auth/auth.service.ts:13-22`; `summary(user)` dựng object này — `:42-59`.
- `login()` trả `{ user: await this.summary(outcome), access, refresh, csrf }` (`:100`, `:158`); `me()` trả `this.summary(user)` (`:193-196`); `refresh()` trả `{ user: await this.summary(result.user), access, refresh: nextToken }` (`:228`, `:305`). `authorizeAccess` dùng `summary()` cho mọi request có permission (`:198-210`).
- `AccessGuard`: route không có permission → `request.authUser = await this.auth.me(token)`; `GET /api/v1/auth/me` trả `dataResponse({ user: request.authUser! })` — nguồn: `POS_API/src/auth/security/access.guard.ts:24-28`, `POS_API/src/auth/http/auth.controller.ts:17-26`. Login/refresh trả `dataResponse({ expiresIn: 1800, user: session.user })` — `auth.controller.ts:97`, `:129`.
- Swagger `UserSummaryDto` 8 field — nguồn: `POS_API/src/auth/http/auth.dto.ts:34-43`.
- Chưa có API nào trả tên chi nhánh của người dùng: `grep -rn "branch_name\|branchName" POS_API/src` không có kết quả trong module auth (agent chính và planner chạy 2026-11-15).
- CASHIER không có `branch.read` nên không gọi được `GET /api/v1/branches` để tự lấy tên chi nhánh — nguồn: `POS_API/src/organization/http/organization.controller.ts:20`, `20261030000000-Organization.ts:27-28`.
- Spec lịch sử: "`UserSummary` chỉ gồm `id`, `username`, `fullName`, `role` (mã vai trò), `storeId`, `branchId`, `permissions` (mảng mã quyền), `mustChangePassword`." — nguồn: `.devloopflow/specs/auth.md:92`; spec hiện hành cho phép thêm field tương thích ngược kèm test và cập nhật tài liệu auth — `.devloopflow/specs/20261115-sprint10-stock-ledger.md:68`.

### UI
- `AuthUser` 8 field, `AuthError(code,message,metadata)` — nguồn: `POS_UI/src/auth/client.ts:12-27`; `toUiSession(user)` không có `branch_name` — `POS_UI/src/auth/session.ts:4-9`; `AuthSession.branch_name?: string` — `POS_UI/src/types/auth.ts:68-73`.
- `AuthProvider.logout` thành công chỉ `setAuthenticated(false)` (không xóa session); BroadcastChannel `logout|revoked` → `setSession(null!)`, `setAuthenticated(false)`; `login` → `applyUser` → `setSession(toUiSession(user))` — nguồn: `POS_UI/src/context/AuthContext.tsx:29-34`, `:53-61`, `:66-73`.
- HTTP client: `catch { throw new AuthError('NETWORK_ERROR', 'Chưa xác nhận được kết quả. Kiểm tra kết nối và tải lại danh sách trước khi thử lại.'); }` cho mọi method — nguồn: `POS_UI/src/http/client.ts:27`; chữ ký `request<T>(path, method = 'GET', body?, retry = true, list = false, extraHeaders = {})` — `:7`.
- Test hiện có dùng câu lỗi mạng cũ chỉ cho POST: `POS_UI/test/shift-service.test.mjs:205` (`addExpense`, `error.message.includes('Chưa xác nhận')`); `POS_UI/test/organization-service.test.mjs:45-47` chỉ kiểm `code === 'NETWORK_ERROR'`. `POS_UI/test/shift-review-coverage.test.mjs:284` kiểm chuỗi do chính modal đặt (`BlindCountCloseShiftModal.tsx:82`), không qua client.
- `InventoryScreen.tsx`: `type Tab = 'stocks' | 'movements' | 'catalog'` (`:14`); `errorText` (`:21`); remount theo identity (`:23-28`); `const [tab, setTab] = useState<Tab>('stocks')` (`:39`); tải danh sách chi nhánh, lỗi gán `setError` chung (`:53-59`); một `Promise.all` ba nguồn, lỗi xóa cả ba (`:61-70`); cột Chi nhánh của bảng Tồn kho `allBranches && !branchId` (`:98-99`); `movementColumns` (`:117-125`), cột Thay đổi `` `${row.quantity} ${row.unit}` `` (`:122`), Ghi chú `row.note || row.invoiceId || '—'` (`:124`); thanh tab (`:134-137`); ô chọn chi nhánh `aria-label="Chi nhánh kho"` (`:139-142`); nút "Tải lại" (`:143`); alert lỗi + nút "Thử lại" `style={{ marginLeft: 'auto', minHeight: 36 }}` (`:146-147`); render loading/bảng (`:148-152`).
- `.btn { ... min-height: 48px; }` — nguồn: `POS_UI/src/styles/ui.css:15-20`.
- `inventoryService`: `Movement` (`:5-6`), `all()` lặp `limit=100` (`:10-21`), `movements(branchId?)` (`:26`) — nguồn: `POS_UI/src/features/inventory/inventoryService.ts`.
- `organizationService.getBranchChoices()` trả theo thứ tự API, không sắp xếp — nguồn: `POS_UI/src/services/organizationService.ts:41-49`.
- `AppShell`: `NavTab` 10 giá trị (`:28-38`); `canSwitchBranch = has('branch.access_all')` (`:53`); mục nav (`:109-123`); tiêu đề `currentShift?.branchName || (isDemo ? ... : session.branch_name || 'Tất cả chi nhánh')` (`:128-130`); nút rail `aria-current={isActive ? 'page' : undefined}` gọi `onSelectTab(item.id)` (`:161-169`) — nguồn: `POS_UI/src/components/common/AppShell.tsx`.
- `App.tsx`: `MainRouter` (`:34-46`); `AuthenticatedRouter` dùng `useState<NavTab>(availableTabs[0] ?? 'settings')` (`:53-55`), `targetInvoiceId` + `handleNavigateToInvoice` → `setCurrentTab('pos')` (`:56-61`), effect về tab đầu khi tab không còn quyền (`:63-65`), `identityKey` (`:68-69`), `renderContent()` (`:72-153`) với `LivePosScreen` cùng `key` cho `pos` và `tables` (`:77-94`), banner demo (`:157-161`), `AppShell currentTab onSelectTab` (`:164`); `App` (`:171-179`) — nguồn: `POS_UI/src/app/App.tsx`.
- `navigation.ts`: `canOpenSettings` (`:4-5`), `reportScope` (`:10-17`), `accessibleTabs` (`:19-35`); OWNER có `settings` đứng đầu (`:25`), người khác có quyền Cài đặt thì `unshift('settings')` (`:33`); tab `products` khi `has('menu.read') || has('menu.manage') || has('product.manage')` (`:30`).
- Ba nơi đang tự suy quyền tab Thực đơn, lệch nhau: `navigation.ts:30` (`menu.read` hoặc `menu.manage` hoặc `product.manage`), rail `AppShell.tsx:121` (`menu.manage` hoặc `product.manage`), App `App.tsx:107-108` (`menu.read` hoặc `menu.manage` hoặc `product.manage`, thông báo "Yêu cầu quyền xem hoặc quản lý thực đơn (menu.read hoặc menu.manage).").
- Caller của `accessibleTabs`/`canOpenSettings` trong `src`: `App.tsx:19,50,120`, `AppShell.tsx:9,122`. Test dùng `accessibleTabs`: `app-invoices-shell.test.mjs:18-19,33-35,48-50,59-63` (chỉ kiểm tab `reports`), `organization-screen.test.mjs:208-215` (kiểm `settings`, `platform_stores`, `shifts`, `reports` — không kiểm `products`); mock `navigation` của AppShell: `app-invoices-shell.test.mjs:9` `navMock = { canOpenSettings, reportScope }`; `reports-screen.test.mjs:44` mock `app/navigation` chỉ `reportScope` cho `DailyReportScreen` (không nạp AppShell). Không test nào kiểm CASHIER có tab `products` (grep `'products'`/`menu.read` trong `POS_UI/test/*.mjs`, planner chạy 2026-11-15). `icon-actions.browser.mjs:361` bundle `AppShell` thật (esbuild nạp `navigation.ts` thật) với `currentTab="products"`.
- Tab con hiện có (rà bằng `grep -rn "useState<'\|setTab\|activeTab\|tabStyle\|aria-current=" POS_UI/src/features`):
  - Kho: `stocks|movements|catalog` "Tồn kho/Sổ kho/Nguyên liệu" — `InventoryScreen.tsx:14,135`.
  - Bán hàng: `LivePosScreen` `type Tab = 'menu' | 'tables' | 'orders'` "Thực đơn/Sơ đồ bàn/Đơn đang mở", `useState<Tab>(activeMode === 'tables' ? 'tables' : 'menu')`, effect đặt lại theo `activeMode`, `openTable` gọi `setTab('menu'); onSwitchToPos?.()` — `POS_UI/src/features/pos/LivePosScreen.tsx:14`, `:30-33`, `:76`, `:155`, `:217-221`.
  - Thực đơn: `ProductsScreen` `useState<'products' | 'toppings' | 'categories' | 'sizes' | 'promotions'>('products')`; 4 nút "Món & Giá bán", "Món thêm và áp dụng", "Danh mục món", "Kích cỡ món" (không có nút `promotions`) — `POS_UI/src/features/products/ProductsScreen.tsx:43`, `:728-820`.
  - Cài đặt: `SettingsScreen` `section: 'organization'|'promotions'` "Tổ chức/Khuyến mãi" chỉ hiện khi có `promotion.manage` (`POS_UI/src/features/settings/SettingsScreen.tsx:36-48`); `SettingsContent` `type Tab = 'branches' | 'tables' | 'staff'` với `titles` "Chi nhánh/Bàn/Tài khoản", quyền `branch.manage/table.manage/user.manage`, `view.tab` mặc định `allowed[0] ?? 'tables'`, đổi tab qua `navigate({ tab, status: '', role: '', branch: '', cursors: [undefined] })` (`:22-29`, `:51-56`, `:147-155`, `:292-295`).
  - Quản trị nền tảng: `PlatformAdminScreen` nhận `activeTab?: 'stores' | 'owners'` và `onTabChange` (đã điều khiển từ App) — `POS_UI/src/features/platform/PlatformAdminScreen.tsx:12-13`, `:22`, `:109-111`, `:144-145`.
  - Hóa đơn, Ca làm, Báo cáo: không có tab con (chỉ bộ lọc/ngày) — `InvoicesScreen.tsx:31-43`, `ShiftsScreen.tsx:30-41`, `DailyReportScreen.tsx:91-101`.
  - `POS_UI/src/features/pos/PosScreen.tsx` (có `activeTab` `:37`) không được import ở đâu trong `POS_UI/src` (grep `PosScreen` chỉ thấy chính file và `LivePosScreen`) — mã mock không render, không thuộc router.
- `POS_UI/package.json`: dependencies chỉ `lucide-react`, `react`, `react-dom`; test `node --experimental-strip-types --test test/*.test.mjs`.
- `tsconfig.json` của UI có `"allowImportingTsExtensions": true` (`POS_UI/tsconfig.json:9`); `http/client.ts:1` import `'../auth/client.ts'` có đuôi.
- `vite.config.ts`: `server.proxy = { '/api': VITE_API_TARGET }`, không đặt `appType`; `main.tsx` render `<React.StrictMode><App /></React.StrictMode>` vào `#root`; Docker UI chạy `npm ci` lúc build rồi `npm run dev` — nguồn: `POS_UI/vite.config.ts:9-16`, `POS_UI/src/main.tsx:6-10`, `POS_UI/Dockerfile`.
- Harness test nạp mã bằng `node:vm`, `require` giả: `POS_UI/test/app-invoices-shell.test.mjs:8` (`load(path,mocks,append)`), các test `[S9-06 banner]` (`:10`), `test_ST3_AC1_service_shell_permissions` (`:14-37`), `[B-59] App` (`:59-67`) ép tab bằng `useState` giả; `organization-screen.test.mjs:21-73` (`mount`, `exports.SettingsContent({ session })`), `:101` gọi `exports.SettingsScreen()` KHÔNG truyền props; `live-payment.test.mjs:108,138,312` gọi `exports.LivePosScreen({})`/`({initialInvoiceId})` và bấm nút "Sơ đồ bàn"/"Đơn đang mở" (`:400,414`); `shift-screen.test.mjs:11-60` (`mount(file, exportName, props, dependencies)`, ném lỗi `Unexpected dependency` với module lạ).
- Browser test mẫu: bundle bằng `esbuild`, `puppeteer-core`, Chrome qua `CHROME_BIN`, mock `window.fetch` — nguồn: `POS_UI/test/reports-accessibility.browser.mjs:1-80`; `icon-actions.browser.mjs:361` bundle `AppShell` + `ProductsScreen` không có router.
- `react-router-dom`: `npm view react-router-dom time --json` (planner chạy 2026-11-15) cho `"7.18.5": "2026-10-27T21:14:19.826Z"`, `"6.30.6": "2026-08-18T14:56:52.880Z"`; `npm view react-router-dom@7.18.5 peerDependencies dependencies engines` → `peerDependencies = { react: '>=18', 'react-dom': '>=18' }`, `dependencies = { 'react-router': '7.18.5' }`, `engines = { node: '>=20.0.0' }`. Node dự án `v22.22.2` (`.devloopflow/devloopflow.md:31`).
- Lệnh: API `npm test` = `npm run build && node --env-file-if-exists=.env --test --test-concurrency=1 "dist/**/*.test.js"` (`POS_API/package.json:9`); UI `npm test`, `npm run typecheck`, `npm run build` (`POS_UI/package.json`); CI chạy `npm audit --audit-level=high` cho cả hai (`.github/workflows/ci.yml:73,105`).
- Tài liệu lỗi thời liên quan (sửa ở bước sync-docs): `CLAUDE.md:29` và `AGENTS.md:29` ghi "`app/` (`App.tsx`, `navigation.ts`, không dùng router riêng)"; `docs/architecture/TECH_STACK.md:22` ghi "Kho còn mô phỏng tab lịch sử biến động"; `.devloopflow/specs/inventory.md:7,19,25,60`; `.devloopflow/specs/auth.md:32-34,58,84,92`; `docs/architecture/auth.md:31,36`.

## Lỗi cũ cần tránh
- `.devloopflow/errors/20261110-backlog-branch-scope-null-branchid-fail-open.md` — quy tắc phòng tránh (nguyên văn): "Mọi kiểm tra phạm vi chi nhánh phải chặn khi thiếu `branchId` và không có `branch.access_all`; không dùng điều kiện "chỉ kiểm khi có giá trị" cho thông tin phạm vi."
- `.devloopflow/errors/20261110-branch-scope-http-test-missing.md` — "Phạm vi store/branch phải được kiểm qua HTTP ở từng endpoint, không chỉ qua helper dùng chung."
- `.devloopflow/errors/20261109-owner-access-all-branch-scope.md` — "Mọi truy vấn scope theo chi nhánh phải qua một quy tắc: `access_all` → không lọc; ngược lại bắt buộc `branchId` hoặc 403. Khi sửa một điểm vào, grep mọi truy vấn cùng mẫu `branch_id=$` trong module."
- `.devloopflow/errors/2026-10-30-pb13-tab-row-shape.md` (hồ sơ cũ, không có mục "Quy tắc phòng tránh"; trích phần Sửa nguyên văn): "Sửa: gắn rowsKey với viewKey; chỉ render bảng khi rows thuộc query hiện hành; skeleton khi chờ query mới. Không thay undefined thành0 để che dữ liệu sai loại."
- `.devloopflow/errors/2026-10-30-pb13-active-tab-loading.md` (hồ sơ cũ; phần Sửa nguyên văn): "Sửa: chỉ invalidate generation khi query key thật sự đổi; cập nhật currentView trước khi setState để mutation response cùng lượt không nhầm phạm vi."
- `.devloopflow/errors/2026-10-29-auth-revoked-session-ui.md` (hồ sơ cũ; phần Cách sửa nguyên văn): "Cách sửa: Xóa session trên hai mã lỗi, chuyển về login và phát sự kiện `revoked` để các tab khác cũng thoát; giữ thông báo lỗi trên tab phát hiện."
- `.devloopflow/errors/2026-11-05-toast-leak-between-sessions.md` (hồ sơ cũ; phần Cách sửa nguyên văn): "Cách sửa: `ToastProvider` theo dõi danh tính và trạng thái xác thực từ `AuthContext`, xóa thông báo khi đổi phiên."
- `.devloopflow/errors/20261114-react-strictmode-mounted-ref-stuck-false.md` — "Cờ "đang mounted" dựa trên ref phải đặt `true` trong thân effect, không chỉ đặt `false` trong cleanup. Test màn có callback bất đồng bộ phải có ca chạy theo kiểu StrictMode (mount, cleanup, mount lại)."
- `.devloopflow/errors/20261114-backlog-stale-list-test-settled-request.md` — "Test phản hồi đến muộn phải chứng minh request cũ thực sự đang pending và có request mới trước khi resolve/reject."
- `.devloopflow/errors/20261114-ui-report-tab-shown-without-access-all.md` — "Khi sửa quy tắc quyền ở một nơi UI, grep mọi nơi suy quyền cùng loại (`report.view_`) và sửa cùng lúc (M-41, M-45)."
- `.devloopflow/errors/20261114-ui-shared-client-default-message-masks-screen-fallback.md` — "AC về thông báo lỗi phải có test đi qua HTTP client thật với `fetch` giả, không chỉ giả service. Khi client dùng chung gán giá trị mặc định cho trường mà màn cần fallback, kiểm màn có phân biệt được "thiếu" không."
- `.devloopflow/errors/20261114-css-cascade-input-min-height-44-beats-48.md` — "Test đo CSS/kích thước phải dùng cascade và thứ tự bundle đúng như app (bundle `src/index.css`), không nối tay file. Khi đặt chiều cao tối thiểu cho input, kiểm các quy tắc chung `input:not(...)` ở `index.css`."
- `.devloopflow/errors/20261114-ui-load-more-button-not-disabled-while-pending.md` — "Nút kích hoạt request phải disabled hoặc có guard khi đang chờ; xóa code chết khi bỏ caller cuối cùng."
- MEMORY áp dụng (`.devloopflow/MEMORY.md`): M-1 (sửa kiểm phạm vi ở mọi điểm vào), M-4 (cập nhật spec/tài liệu cùng code), M-10 (kiểm quyền qua HTTP bằng vai trò thật), M-11 (gắn rows với query key; test chạy callback cột), M-12 (identity/epoch của client), M-13 (xóa trạng thái tạm khi đổi phiên), M-19 (seed UUID bằng `gen_random_uuid()`/`randomUUID()`), M-28 (harness `node:vm` chặn import lạ: thêm mock, không bỏ import), M-31 (seed mốc thời gian không trộn đồng hồ), M-32 (`--test-name-pattern` theo tên test CHA), M-34 (DB Docker `127.0.0.1:15432`), M-37 (tái dùng hành vi có sẵn), M-39 (ma trận AC–chứng cứ, đo chạm trên browser thật), M-41 (UI và API cùng điều kiện quyền; grep `navigation.ts`, `App.tsx`, `AppShell.tsx`), M-42 (test qua HTTP client thật với `fetch` giả), M-46 (gọi skill caveman/ponytail, graphify trước grep, đưa quy tắc vào prompt subagent).

## Quyết định
- Câu hỏi: "Có sửa 2 chỗ trên không? ... hay giữ nguyên và coi như Sổ kho đã xong?" → Trả lời của user: "sửa" — nguồn: task file `.devloopflow/tasks/active/20261115-sprint10-stock-ledger.md:74`.
- Về các mục Low còn lại (nút Thử lại 36px, câu báo lỗi mất mạng, tiêu đề của quản lý, F5 về Cài đặt, tải ba API khi mở Kho, thứ tự dòng cùng giao dịch, dấu "+", xóa file mock chết) → Trả lời của user: "làm luôn" — nguồn: task file `:79`.
- F5 về đúng màn → user: "Dùng router cho từng tab phải dùng router"; phạm vi → "Tab chính và mọi tab con (Recommended)"; kiểu địa chỉ → "Địa chỉ sạch /kho/so-kho (Recommended)" — nguồn: task file `:85`, spec `:77`.
- Thứ tự dòng cùng thời điểm → user: "Giữ cách xếp, chỉ sửa thứ tự chi nhánh trong ô chọn (Recommended)" — nguồn: spec `:78`.
- Phạm vi tab → user: "làm luôn bán hàng, ca làm luôn, không gì cài đặt đâu" (không bỏ sót tab nào) — nguồn: prompt giao planner của agent chính 2026-11-15.
- Duyệt spec → user: "duyệt spec" — nguồn: spec `:104`.
- Câu hỏi Q1 của plan (ô chọn chi nhánh có so số tự nhiên không, đề xuất "Hiểu số như số") → Trả lời của user: "Xếp theo chữ thuần" (2026-11-15, agent chính chuyển nguyên văn). Nghĩa: so sánh chữ thuần, không `numeric`; "Chi nhánh 10" đứng trước "Chi nhánh 2".
- Câu hỏi Q2 của plan (CASHIER mở `/thuc-don/*`, đề xuất "Giữ như hiện tại") → Trả lời của user: "Chặn, chuyển về Bán hàng" (2026-11-15, agent chính chuyển nguyên văn). Nghĩa: CASHIER mở bất kỳ địa chỉ nào trong 4 địa chỉ `/thuc-don/*` bị thay thế lịch sử tới `/ban-hang/thuc-don`; quyền route và rail dùng một nguồn (M-41). Đây là thay đổi hành vi do user quyết: `accessibleTabs` không còn cho tab `products` chỉ vì `menu.read`.
- Quyết định của agent trong spec (user kiểm khi duyệt): `branchName: string`, `invoiceCode: string | null`, giữ `branchId`, `invoiceId` (spec `:81`); cột Chi nhánh Sổ kho cùng điều kiện bảng Tồn kho (`:82`); Ghi chú ưu tiên `note` → mã hóa đơn → "—" (`:83`); câu lỗi đọc riêng cho GET trong client chung (`:84`); địa chỉ không khớp/không quyền → thay thế lịch sử tới tab đầu tiên được phép, chưa đăng nhập → đăng nhập rồi vào tab đầu tiên được phép, Back không đưa vào màn của phiên trước (`:85`); slug tiếng Việt không dấu do plan liệt kê (`:86`); tải theo tab, trạng thái độc lập (`:87`); chỉ thêm "+" cho số dương (`:88`).
- Mục "Để người viết plan tự chọn" (spec `:92`): cách nối bảng, tên field TS, kiểu hiển thị cột Chi nhánh, tên test, cách dựng dữ liệu test, nguồn tên chi nhánh cho tiêu đề, định dạng địa chỉ web, nội dung câu lỗi đọc, cách chia tải theo tab — plan chọn ở "Thiết kế tổng thể".

## Giả định
- G-1: Ghim `react-router-dom` bản `7.18.5` (phát hành `2026-10-27T21:14:19.826Z`, 19 ngày trước 2026-11-15, thỏa "ít nhất hai tuần") — xác nhận bởi: output `npm view` (mục Khám phá) và ràng buộc spec `:71`.
- G-2: Mọi vai trò cửa hàng thật (OWNER, MANAGER, CASHIER) đều có `invoice.read` và `table.read`, nên đều vào được cả `/ban-hang/*` và `/so-do-ban` — xác nhận bởi: `POS_API/src/database/migrations/20261106000000-Sales.ts:72`.
- G-3: Ô chọn chi nhánh sắp bằng `[...rows].sort((a, b) => a.name.localeCompare(b.name, 'vi'))` — so chữ theo thứ tự tiếng Việt, KHÔNG có `numeric: true`; "Chi nhánh 10" đứng trước "Chi nhánh 2", "Chi nhánh Dương" trước "Chi nhánh Đông" — xác nhận bởi: user Q1 "Xếp theo chữ thuần"; thứ tự kiểm bằng lệnh planner chạy 2026-11-15 `node -e "...sort((x,y)=>x.localeCompare(y,'vi'))"` → `["An Phú","Chi nhánh 10","Chi nhánh 2","Chi nhánh Bắc","Chi nhánh Dương","Chi nhánh Đông","Chi nhánh Nam"]`.
- G-4: Tab `products` (màn Thực đơn, 4 địa chỉ `/thuc-don/*`) chỉ mở cho người có `menu.manage` hoặc `product.manage`, đúng điều kiện rail đang dùng (`AppShell.tsx:121`); CASHIER (chỉ có `menu.read`) mở `/thuc-don/*` bị thay thế tới `/ban-hang/thuc-don`. Server KHÔNG đổi: CASHIER vẫn có `menu.read` (`20261102000000-MenuCatalog.ts:92`) và màn Bán hàng (`LivePosScreen`) vẫn đọc thực đơn qua `menuService` để bán — chỉ route UI tới màn quản lý Thực đơn bị chặn — xác nhận bởi: user Q2 "Chặn, chuyển về Bán hàng".
- G-5: Vite dev server trả `index.html` cho đường dẫn không phải `/api` (F5 ở `/kho/so-kho` không 404) — không có cấu hình riêng trong `POS_UI/vite.config.ts`; xác nhận bằng chạy thật ở E2E-AC-9; nếu E2E-AC-9 FAIL thì dừng và báo user (cấu hình máy chủ triển khai thật là Phi mục tiêu, spec `:42`).

## Phạm vi
- Trong:
  - API `GET /api/v1/stock-movements` thêm `branchName`, `invoiceCode` (M1, M2) + test HTTP đầy đủ quyền/phạm vi/lọc/phân trang.
  - API phiên (`POST /auth/login`, `GET /auth/me`, `POST /auth/refresh`) thêm `branchName` cho người bị gắn chi nhánh (nguồn tên chi nhánh cho tiêu đề L3).
  - UI: tiêu đề chi nhánh (L3); câu lỗi mất mạng cho GET (L2); màn Kho: cột Chi nhánh, mã hóa đơn, dấu "+", nút Thử lại 48px, ô chọn chi nhánh theo tên, tải theo tab (M1, M2, V2, L1, V1, L5).
  - Router `react-router-dom` `BrowserRouter`, địa chỉ cho 10 tab chính và mọi tab con hiện có (Kho 3, Bán hàng 3, Thực đơn 4, Cài đặt 4), redirect theo quyền, đổi phiên, Back (L4).
  - Xóa `POS_UI/src/features/inventory/StockMovementsTab.tsx` (V3).
  - Browser test 1024×768 cho Sổ kho + router.
- Ngoài (đúng "Phi mục tiêu" spec `:37-43`):
  - Đổi thứ tự dòng sổ kho cùng thời điểm; đổi thông điệp/`details: []` của lỗi 422.
  - API nhập tồn, sửa, xóa, ghi sổ kho; đổi BR-44..47.
  - Đổi quyền, phạm vi chi nhánh, phân trang của `GET /api/v1/stock-movements`.
  - Bộ lọc theo mã hóa đơn hoặc tên chi nhánh.
  - Đưa bộ lọc, trang, ID bản ghi (chi nhánh đang chọn, hóa đơn đang mở) lên địa chỉ web; `targetInvoiceId` giữ cơ chế state hiện có.
  - Cấu hình máy chủ triển khai thật cho đường dẫn sạch (PB-14); chỉ bảo đảm Vite dev server của Docker local.
  - Xóa mock engine hoặc mock khác ngoài `StockMovementsTab.tsx` (gồm `PosScreen.tsx`, `mockEngine.ts`, `authService.ts` demo).
  - Các điểm không thuộc spec phát hiện khi rà: nút tab Thực đơn cao 40px (`ProductsScreen.tsx:735`), lệch giữa nav `AppShell.tsx:115-120` và `accessibleTabs` ở các tab KHÁC `products` (ví dụ nav "Bán hàng" chỉ cần `pos.sell`; tab `products` thì sửa trong task theo Q2), tiêu đề màn Bán hàng/Sơ đồ bàn dùng chi nhánh mock (`AppShell.tsx:52`, `:128-129`), câu lỗi mạng của luồng auth (`POS_UI/src/auth/client.ts:40`), câu "Chưa đọc được kết quả..." khi body không phải JSON (`POS_UI/src/http/client.ts:46`). Không sửa trong task này.

## Thiết kế tổng thể
- Luồng chính:
  1. API: `listMovements` thêm `b.name AS branch_name` (đã JOIN `branches b`) và `LEFT JOIN invoices inv ON inv.id=m.invoice_id AND inv.branch_id=m.branch_id`, chọn `inv.invoice_code`; DTO thêm `branchName`, `invoiceCode`. Count, WHERE, ORDER BY, cursor giữ nguyên.
  2. API phiên: `AuthService.sessionUser(user)` = `summary(user)` + `branchName` (đọc `SELECT name FROM branches WHERE id=$1` khi `user.branch_id` khác null, ngược lại `null`); `login`, `me`, `refresh` trả `SessionUser`. `authorizeAccess` giữ `summary()` (không thêm truy vấn cho request nghiệp vụ).
  3. UI phiên: `AuthUser.branchName?: string | null` → `toUiSession` gán `branch_name`; AppShell: `session.branch_name || (canSwitchBranch ? 'Tất cả chi nhánh' : 'Chi nhánh')`.
  4. UI client: `NETWORK_ERROR` của `method === 'GET'` dùng "Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại."; method khác giữ câu cũ.
  5. UI routes: module thuần `POS_UI/src/app/routes.ts` (không import React/router) chứa bảng 19 địa chỉ, `pathFor`, `resolveRoute` dựa trên `accessibleTabs` (một nguồn quyền, M-41).
  6. UI Kho: tab con nhận `tab`/`onTabChange` từ App (không có props thì dùng state nội bộ, giữ test cũ); dữ liệu theo key `[tab, branch, revision]` → chỉ tải tab đang mở, trạng thái tải/lỗi/rỗng gắn key (M-11).
  7. UI tab con màn khác: `LivePosScreen`, `ProductsScreen`, `SettingsScreen`/`SettingsContent` nhận `tab`/`onTabChange` cùng kiểu điều khiển-hoặc-tự-quản.
  8. UI App: `App` bọc `BrowserRouter`; `MainRouter` chưa đăng nhập → `<Navigate to="/dang-nhap" replace />`; `AuthenticatedRouter` (key = `session.user.id`) đọc `useLocation()`, tính `route = resolveRoute(...)`, render theo `route.tab/route.sub`, effect `navigate(route.path, { replace: true, state: { owner: session.user.id } })` khi địa chỉ khác chuẩn hoặc `state.owner` khác người đang đăng nhập; thao tác người dùng gọi `navigate(path, { state: { owner } })` (push).
  9. Xóa file mock chết; browser test chứng minh F5, Back, đổi phiên, 48px, không cuộn ngang.
- Thành phần tham gia: `POS_API/src/inventory/inventory.service.ts`, `POS_API/src/auth/auth.service.ts`, `POS_API/src/auth/http/auth.dto.ts`, `POS_UI/src/auth/client.ts`, `POS_UI/src/auth/session.ts`, `POS_UI/src/components/common/AppShell.tsx`, `POS_UI/src/http/client.ts`, `POS_UI/src/app/routes.ts` (mới), `POS_UI/src/app/App.tsx`, `POS_UI/src/features/inventory/InventoryScreen.tsx`, `POS_UI/src/features/inventory/inventoryService.ts`, `POS_UI/src/features/pos/LivePosScreen.tsx`, `POS_UI/src/features/products/ProductsScreen.tsx`, `POS_UI/src/features/settings/SettingsScreen.tsx`, `POS_UI/package.json`, `POS_UI/package-lock.json`.
- Bảng địa chỉ (đúng 19 dòng; không có địa chỉ nào khác hợp lệ ngoài 4 địa chỉ gốc và `/dang-nhap`):

  | Địa chỉ | `tab` (NavTab) | `sub` | Nhãn trên UI (nguồn) |
  |---|---|---|---|
  | `/cua-hang` | `platform_stores` | `null` | "Cửa hàng" (`AppShell.tsx:111`) |
  | `/chu-quan` | `platform_owners` | `null` | "Chủ quán" (`AppShell.tsx:112`) |
  | `/ban-hang/thuc-don` | `pos` | `menu` | "Thực đơn" (`LivePosScreen.tsx:221`) |
  | `/ban-hang/don-dang-mo` | `pos` | `orders` | "Đơn đang mở" (`LivePosScreen.tsx:221`) |
  | `/so-do-ban` | `tables` | `tables` | "Sơ đồ bàn" (`AppShell.tsx:116`, `LivePosScreen.tsx:221`) |
  | `/hoa-don` | `invoices` | `null` | "Hóa đơn" (`AppShell.tsx:117`) |
  | `/ca-lam` | `shifts` | `null` | "Ca làm" (`AppShell.tsx:118`) |
  | `/kho/ton-kho` | `inventory` | `stocks` | "Tồn kho" (`InventoryScreen.tsx:135`) |
  | `/kho/so-kho` | `inventory` | `movements` | "Sổ kho" (`InventoryScreen.tsx:135`) |
  | `/kho/nguyen-lieu` | `inventory` | `catalog` | "Nguyên liệu" (`InventoryScreen.tsx:135`) |
  | `/bao-cao` | `reports` | `null` | "Báo cáo" (`AppShell.tsx:120`) |
  | `/thuc-don/mon` | `products` | `products` | "Món & Giá bán" (`ProductsScreen.tsx:749`) |
  | `/thuc-don/mon-them` | `products` | `toppings` | "Món thêm và áp dụng" (`ProductsScreen.tsx:770`) |
  | `/thuc-don/danh-muc` | `products` | `categories` | "Danh mục món" (`ProductsScreen.tsx:791`) |
  | `/thuc-don/kich-co` | `products` | `sizes` | "Kích cỡ món" (`ProductsScreen.tsx:812`) |
  | `/cai-dat/chi-nhanh` | `settings` | `branches` | "Chi nhánh" (`SettingsScreen.tsx:27`) |
  | `/cai-dat/ban` | `settings` | `tables` | "Bàn" (`SettingsScreen.tsx:27`) |
  | `/cai-dat/tai-khoan` | `settings` | `staff` | "Tài khoản" (`SettingsScreen.tsx:27`) |
  | `/cai-dat/khuyen-mai` | `settings` | `promotions` | "Khuyến mãi" (`SettingsScreen.tsx:44`) |

  - Địa chỉ gốc chuyển (thay thế) về tab con mặc định: `/ban-hang` → `/ban-hang/thuc-don`; `/kho` → `/kho/ton-kho`; `/thuc-don` → `/thuc-don/mon`; `/cai-dat` → tab con Cài đặt đầu tiên được phép theo thứ tự `branches` (`branch.manage`), `tables` (`table.manage`), `staff` (`user.manage`), `promotions` (`promotion.manage`) (quyền: `SettingsScreen.tsx:28`, `navigation.ts:4-5`); không có quyền nào → `branches`.
  - Địa chỉ màn đăng nhập: `/dang-nhap` (`LOGIN_PATH`).
  - Tab đầu tiên theo vai trò (từ `accessibleTabs` + quyền migration): OWNER → `/cai-dat/chi-nhanh`; MANAGER → `/cai-dat/ban`; CASHIER → `/ban-hang/thuc-don`; PLATFORM_ADMIN → `/cua-hang`; không có tab nào → `/cai-dat/chi-nhanh` (App render `AccessDenied` như hiện tại `App.tsx:119-122`).
  - Chuẩn hóa: bỏ đúng một dấu `/` cuối khi độ dài > 1 (`/kho/so-kho/` → `/kho/so-kho`); so khớp phân biệt hoa thường (`/Kho/So-Kho` không khớp → tab đầu tiên).
- Quyết định thiết kế | lý do | phương án đã loại:
  - `LEFT JOIN invoices inv ON inv.id=m.invoice_id AND inv.branch_id=m.branch_id` | khóa chính `invoices.id` duy nhất nên không nhân dòng (giữ count/thứ tự); điều kiện `inv.branch_id=m.branch_id` chặn lộ mã hóa đơn chi nhánh/cửa hàng khác khi dữ liệu lệch (phản mục tiêu spec `:46`), DB không có ràng buộc invoice–branch cho movement (`InventoryPromotions.ts:60-64` chỉ kiểm branch–ingredient) | subquery tương quan theo từng dòng (dài hơn, cùng kết quả); JOIN không điều kiện branch (lộ khi dữ liệu lệch).
  - Tên chi nhánh cho tiêu đề lấy từ API phiên (`branchName` trong `login/me/refresh`) | CASHIER không có `branch.read` nên UI không tự đọc được `/branches`; một chỗ đọc, cập nhật khi `me()` chạy lại (focus) | UI gọi `/branches` (CASHIER 403); thêm vào `UserSummary` cho mọi request (8 literal `UserSummary` trong test API phải sửa: `inventory.integration.test.ts:44-45`, `organization.pagination.test.ts:8`, `payment.integration.test.ts:231,510,662,770,903`, `sales.integration.test.ts:46`, và thêm truy vấn ở mỗi request nghiệp vụ).
  - Câu lỗi đọc: "Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại." | nói rõ không tải được dữ liệu và gợi ý kiểm tra kết nối rồi thử lại (spec `:84`) | đổi câu cho mọi method (trái phản mục tiêu spec `:51`).
  - Tải theo tab bằng một state `result: { key, rows?, error? }` gắn `key = JSON.stringify([tab, allBranches ? branchId : '', revision])` | mẫu đã dùng ở `InvoicesScreen.tsx:38`; rows/lỗi chỉ hiện khi key khớp (M-11, lỗi `2026-10-30-pb13-tab-row-shape`); response cũ tự bị bỏ qua | ba state riêng + ba effect (nhiều mã hơn, dễ trắng chéo); cache dữ liệu tab đã mở (không có yêu cầu).
  - Mở lại một tab đã xem thì tải lại tab đó | dữ liệu luôn mới, một đường mã | giữ cache theo tab (spec không yêu cầu, thêm trạng thái).
  - Lỗi tải danh sách chi nhánh hiện `branchError` riêng, không xóa bảng | phản mục tiêu spec `:50` (dòng lỗi một nguồn không làm trắng nguồn khác) | giữ `setError` chung như `InventoryScreen.tsx:57`.
  - Router dùng `BrowserRouter` + `useLocation`/`useNavigate`/`Navigate` chỉ trong `App.tsx`; màn con nhận `tab`/`onTabChange` qua props | không màn nào ngoài `App.tsx` import `react-router-dom`, nên harness `node:vm` của màn (M-28) và browser test `icon-actions.browser.mjs:361` không đổi; App giữ `switch` hiện có nên `LivePosScreen` giữ instance khi đi giữa `/ban-hang/*` và `/so-do-ban` (`App.tsx:77-94` cùng `key`) | `<Routes>/<Route>` lồng nhau cho từng màn (đổi cấu trúc cây, có nguy cơ remount `LivePosScreen` làm mất đơn đang chọn); `useParams` trong từng màn (mọi harness phải mock router).
  - Màn con "điều khiển hoặc tự quản": `const tab = props.tab ?? ownTab` | test cũ gọi màn không có props (`live-payment.test.mjs:108`, `organization-screen.test.mjs:101`) vẫn đúng hành vi cũ, không sửa yếu test | bắt buộc props (phải sửa nhiều test cũ).
  - LivePosScreen: "Thực đơn" ↔ `/ban-hang/thuc-don`, "Đơn đang mở" ↔ `/ban-hang/don-dang-mo`, "Sơ đồ bàn" ↔ `/so-do-ban` | mỗi tab con một địa chỉ, không trùng tab chính "Sơ đồ bàn" (`AppShell.tsx:116`); rail sẽ sáng "Sơ đồ bàn" khi xem sơ đồ bàn (hiện tại rail giữ "Bán hàng") | lồng `/ban-hang/so-do-ban` và `/so-do-ban/*` (hai địa chỉ cho cùng một màn).
  - Một hàm quyền tab Thực đơn `canOpenProducts(permissions)` = `menu.manage` hoặc `product.manage` trong `navigation.ts`, dùng ở `accessibleTabs` (route), rail `AppShell.tsx:121` và guard `App.tsx:107` | user Q2 "Chặn, chuyển về Bán hàng"; M-41 một nguồn quyền cho rail và route; theo mẫu `canOpenSettings` có sẵn (`navigation.ts:4-5`) | chỉ sửa `navigation.ts:30` (rail và App vẫn tự suy quyền, lệch lại khi một nơi đổi); chặn riêng trong `routes.ts` (hai nguồn quyền).
  - Ô chọn chi nhánh `localeCompare(b.name, 'vi')` không `numeric` | user Q1 "Xếp theo chữ thuần"; `'vi'` để chữ có dấu xếp theo bảng chữ tiếng Việt (D trước Đ) | `numeric: true` (user từ chối); so mã Unicode `<` (Đ U+0110 xếp sau mọi chữ Latin không dấu, sai thứ tự tiếng Việt).
  - Cài đặt phẳng `/cai-dat/<tab>` | ba nhóm tab (Tổ chức: 3 tab, Khuyến mãi) gộp một cấp, slug ngắn | `/cai-dat/to-chuc/chi-nhanh` (dài hơn, không thêm thông tin).
  - Chủ sở hữu mục lịch sử: `history.state` (qua `navigate(..., { state: { owner: session.user.id } })`) | Back sau khi đổi tài khoản tới mục của người trước (`state.owner` khác) → thay thế bằng tab đầu tiên của người hiện tại (spec `:85`); F5 giữ `history.state` nên vẫn đúng màn; link mở mới (`state` null) được đóng dấu bằng `replace`; địa chỉ không chứa ID (spec `:69`) | xóa lịch sử trình duyệt (không có API); bỏ qua Back (trái spec `:85`).
  - `AuthenticatedRouter` có `key={session.user.id}` | đổi tài khoản qua BroadcastChannel mà không unmount (`AuthContext.tsx:60`) thì `targetInvoiceId` của người trước bị xóa (phản mục tiêu spec `:49`) | giữ state qua đổi người dùng.
  - Không đăng nhập → `/dang-nhap` bằng `replace` | sau đăng nhập không quay lại địa chỉ cũ (spec `:85`) | giữ địa chỉ cũ rồi vào lại sau đăng nhập (spec loại).

## Thay đổi dữ liệu
- Không có. Không migration mới (ràng buộc spec `:65`); dữ liệu cần hiện đã có ở `branches.name`, `invoices.invoice_code`. Không đổi số migration ở `POS_API/src/foundation.test.ts` (M-29 không áp dụng).

## API contract tổng
- `GET /api/v1/stock-movements` — quyền `inventory.view`; request không đổi (`limit,cursor,branchId?,ingredientId?,type?`, không body); response `200 {data: MovementDto[], meta: {limit, nextCursor, total}}`.
  - `MovementDto` mới (field | kiểu | bắt buộc | ràng buộc | mặc định):
    - `id` | string uuid | có | — | —
    - `branchId` | string uuid | có | — | —
    - `branchName` (MỚI) | string | có | `branches.name` của `m.branch_id` | —
    - `ingredientId` | string uuid | có | — | —
    - `ingredientName` | string | có | — | —
    - `unit` | string | có | `g|ml|piece` | —
    - `type` | string | có | `IMPORT|SALE|SALE_REVERSAL|WASTE|ADJUST` | —
    - `quantity` | string decimal 3 số lẻ | có | khác 0 | —
    - `balanceAfter` | string decimal | có | — | —
    - `invoiceId` | string uuid \| null | có | — | null
    - `invoiceCode` (MỚI) | string \| null | có | `^HD[A-Z0-9]{8}$`; null khi `invoice_id` null hoặc hóa đơn không cùng `branch_id` với dòng | null
    - `note` | string \| null | có | — | null
    - `createdAt` | string ISO UTC | có | — | —
  - Bảng lỗi (không đổi, nguồn `inventory.service.ts:9,25,31,35,42,46`, `auth.service.ts` authorizeAccess): `401 UNAUTHENTICATED` "Vui lòng đăng nhập để tiếp tục." (không cookie); `403 PERMISSION_DENIED` "Bạn không có quyền thực hiện thao tác này." (CASHIER, PLATFORM_ADMIN); `404 NOT_FOUND` "Không tìm thấy chi nhánh." / "Không tìm thấy nguyên liệu." (ID ngoài store); `422 VALIDATION_ERROR` "Dữ liệu kho không hợp lệ." (filter sai, MANAGER gửi `branchId`).
- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/refresh` — quyền/request/lỗi không đổi; `data.user` thêm `branchName: string | null` (tên `branches.name` của `users.branch_id` hiện hành; `null` khi `branch_id` null: OWNER, PLATFORM_ADMIN). 8 field cũ giữ nguyên tên/kiểu.
- Không có endpoint mới.

## AC tổng end-to-end
(kiểm bởi `ac-verifier` trên app thật Docker local theo `.devloopflow/devloopflow.md:19`, dữ liệu thử store `ZZ-TEST-SOKHO-20261115` (A, id `29f61b69-b425-4b34-a0fe-fa3a4678540b`) và `ZZ-TEST-SOKHO-20261115-B` (B) theo `.devloopflow/verify/20261115-sprint10-stock-ledger/current-state.md:9-16`; mật khẩu lấy theo task file, không ghi vào bằng chứng. Trước khi kiểm phải rebuild image: `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait` để image UI cài `react-router-dom`.)
- [x] E2E-AC-1 (S10-11 vế "dữ liệu thật theo quyền và chi nhánh"; mục tiêu spec M1): Given `zzsokho_owner_a` đăng nhập, When mở `http://localhost:5173/kho/so-kho` với "Tất cả chi nhánh", Then network có `GET /api/v1/stock-movements?limit=100` (và trang tiếp nếu có) status 200, số dòng bảng = `SELECT count(*) FROM stock_movements m JOIN branches b ON b.id=m.branch_id WHERE b.store_id='29f61b69-b425-4b34-a0fe-fa3a4678540b'`, bảng có cột "Chi nhánh" mỗi dòng là `ZA1`/`ZA2` khớp `branches.name` của `m.branch_id`; chọn chi nhánh `ZA1` → request có `branchId=fb639e97-a646-4973-9672-7ab102d0edca`, không còn cột "Chi nhánh", số dòng = count DB của ZA1; `zzsokho_manager_b1` mở `/kho/so-kho` → không có ô chọn chi nhánh, không có cột "Chi nhánh", request không có `branchId`, chỉ dòng ZA1 (kiểm: browser + network + SQL).
- [x] E2E-AC-2 (S10-11 vế "xuất bán và hoàn trả kho"; mục tiêu spec M2, V2): Given OWNER A ở `/kho/so-kho`, When xem các dòng của hóa đơn `1e4f82d6-438d-4ec5-b782-cc2e61e17874`, Then dòng "Xuất bán" có Thay đổi bắt đầu "-" và dòng "Hoàn trả kho" có Thay đổi bắt đầu "+" (ví dụ `+100.000 ml` cho Sữa), cột Ghi chú của cả hai bằng `SELECT invoice_code FROM invoices WHERE id='1e4f82d6-438d-4ec5-b782-cc2e61e17874'` (dạng `^HD[A-Z0-9]{8}$`), không có chuỗi UUID 36 ký tự trong cột Ghi chú; dòng "Nhập kho" seed hiện "ZZ seed tester" (kiểm: browser + SQL).
- [x] E2E-AC-3 (S10-11 vế "reload hoặc đổi phiên không lộ dữ liệu cũ"; mục tiêu spec L4): Given OWNER A ở `/kho/so-kho`, When F5, Then địa chỉ vẫn `/kho/so-kho`, tab "Sổ kho" `aria-current="true"`, rail "Kho hàng" `aria-current="page"`; When Đăng xuất → địa chỉ `/dang-nhap`; đăng nhập `zzsokho_cashier_b1` → địa chỉ `/ban-hang/thuc-don`; bấm Back của trình duyệt → địa chỉ không phải `/kho/so-kho`/`/kho/ton-kho`/`/kho/nguyen-lieu`, nội dung trang không chứa "ZZ Sua"; CASHIER gõ `http://localhost:5173/kho/so-kho` → địa chỉ thay thế thành `/ban-hang/thuc-don`, không có request `GET /api/v1/stock-movements`; OWNER B đăng nhập sau OWNER A không thấy "ZZ Sua" (kiểm: browser + network).
- [x] E2E-AC-4 (S10-11 vế "trạng thái rỗng"): Given OWNER A, When chọn chi nhánh `ZA3` (`1aa36076-9d82-460f-ae84-a793cd81486f`) ở tab Sổ kho, Then API 200 `data: []`, `meta.total: 0`, bảng hiện "Chưa có bút toán kho" (kiểm: browser + network).
- [x] E2E-AC-5 (S10-11 vế "trạng thái lỗi"; mục tiêu spec L1, L2): Given OWNER A ở `/kho/so-kho`, When chặn `**/api/v1/stock-movements**` bằng abort mạng, Then alert hiện đúng "Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại."; When chặn bằng 500 body `{"error":{"code":"INTERNAL_ERROR","message":"Lỗi máy chủ test"}}`, Then alert "Lỗi máy chủ test" và nút "Thử lại" cao ≥ 48px (bounding box ở 1024×768); bỏ chặn rồi bấm "Thử lại" → alert mất, bảng có dữ liệu; một thao tác ghi mất mạng (bấm "Lưu nguyên liệu" khi chặn `POST /api/v1/ingredients`) vẫn hiện "Chưa xác nhận được kết quả. Kiểm tra kết nối và tải lại danh sách trước khi thử lại." (kiểm: browser).
- [x] E2E-AC-6 (mục tiêu spec L3): Given `zzsokho_manager_b1` đăng nhập (không có ca mở), When mở `/kho/so-kho`, Then tiêu đề trên cùng là `ZA1`, không có chữ "Tất cả chi nhánh" trong `header`; `GET /api/v1/auth/me` trả `data.user.branchName = "ZA1"`; OWNER A ở `/kho/so-kho` tiêu đề "Tất cả chi nhánh" và `branchName: null` (kiểm: browser + curl).
- [x] E2E-AC-7 (mục tiêu spec L5): Given OWNER A, When mở `/kho/ton-kho` (tải mới trang), Then trong network chỉ có path `/api/v1/ingredient-stocks` (có thể lặp do StrictMode) và không có `/api/v1/stock-movements`, `/api/v1/ingredients`; bấm "Sổ kho" → thêm `/api/v1/stock-movements`; bấm "Tải lại" ở Sổ kho → chỉ thêm `/api/v1/stock-movements` (kiểm: browser network).
- [x] E2E-AC-8 (mục tiêu spec L4 — mọi tab): Given OWNER A, When mở lần lượt 17 địa chỉ cửa hàng trong bảng địa chỉ rồi F5 mỗi địa chỉ, Then sau F5 `location.pathname` không đổi; Given PLATFORM_ADMIN, When mở `/kho/so-kho`, Then địa chỉ thay thế thành `/cua-hang`; `/chu-quan` F5 giữ nguyên; Given MANAGER, When mở `/cai-dat/chi-nhanh`, Then thay thế thành `/cai-dat/ban`; Given `zzsokho_cashier_b1`, When mở lần lượt `/thuc-don/mon`, `/thuc-don/mon-them`, `/thuc-don/danh-muc`, `/thuc-don/kich-co`, Then mỗi lần địa chỉ thay thế thành `/ban-hang/thuc-don` (Back không quay lại `/thuc-don/*`), rail không có mục "Thực đơn", và tab con "Thực đơn" trong Bán hàng vẫn hiện danh mục món từ `GET /api/v1/categories` status 200 (server vẫn cho `menu.read`) (kiểm: browser + network).
- [x] E2E-AC-9 (ràng buộc spec `/api` không bị router bắt): When `curl -s http://localhost:5173/api/v1/health`, Then body `{"data":{"status":"ok"}}`; When `curl -s -o /dev/null -w "%{http_code} %{content_type}" http://localhost:5173/kho/so-kho`, Then `200 text/html` (kiểm: curl).
- [x] E2E-AC-10 (ràng buộc spec 1024×768): Given OWNER A "Tất cả chi nhánh" ở `/kho/so-kho` (toàn bộ dòng store A), When viewport 1024×768, Then `document.documentElement.scrollWidth <= window.innerWidth`; tab "Tồn kho/Sổ kho/Nguyên liệu", ô chọn "Chi nhánh kho", nút "Tải lại" cao ≥ 48px (kiểm: browser).
- [x] E2E-AC-11 (mục tiêu spec V1): Given OWNER A tạo thêm (qua `POST /api/v1/branches` hoặc UI Cài đặt) hai chi nhánh thử `{code:'ZA10',name:'ZA10'}` và `{code:'ZDD1',name:'ZĐ1'}` ngoài `ZA1`, `ZA2`, `ZA3` sẵn có, When mở ô chọn "Chi nhánh kho", Then thứ tự option là "Tất cả chi nhánh", "ZA1", "ZA10", "ZA2", "ZA3", "ZĐ1" ("ZA10" trước "ZA2": so chữ thuần; "ZA3" trước "ZĐ1": A trước Đ theo tiếng Việt) (kiểm: browser).
- [x] E2E-AC-12 (API quyền/phạm vi qua app thật; ràng buộc spec `:65`): When curl `GET http://localhost:3000/api/v1/stock-movements` bằng cookie từng vai trò, Then OWNER A 200 mỗi phần tử có đúng 13 khóa `balanceAfter, branchId, branchName, createdAt, id, ingredientId, ingredientName, invoiceCode, invoiceId, note, quantity, type, unit`; MANAGER B1 `?branchId=fb639e97-...` → 422 "Dữ liệu kho không hợp lệ."; CASHIER → 403 PERMISSION_DENIED; PLATFORM_ADMIN → 403; không cookie → 401; OWNER A `?branchId=802e891d-093d-4fd9-bfa4-98e3236135b4` (store B) → 404 "Không tìm thấy chi nhánh."; `?limit=5` lặp theo `nextCursor` → tập id = kết quả không phân trang, `meta.total` không đổi (kiểm: curl).
- [x] E2E-AC-13 (mục tiêu spec V3): `POS_UI/src/features/inventory/StockMovementsTab.tsx` không tồn tại; `grep -rn "StockMovementsTab" POS_UI/src POS_UI/test` không có kết quả (kiểm: lệnh).
- [x] E2E-AC-14 (bộ test): API `npm test` exit 0, `# fail 0`; UI `npm run typecheck` exit 0, `npm test` exit 0 `# fail 0`, `npm run build` exit 0; `node --test test/stock-ledger-router.browser.mjs` exit 0 `# fail 0`; `npm audit --audit-level=high` trong `POS_UI/` exit 0 (kiểm: lệnh, output lưu evidence).

## Review Focus
- RF-1: Người B đăng nhập sau người A trên cùng tab trình duyệt rồi bấm Back tới mục lịch sử của A (`state.owner` = id A) → địa chỉ thay thế bằng tab đầu tiên của B, không render màn của A — test: `test_ST8_AC3_state_owner_khac_thay_the_ve_tab_dau` (ST-8), `BR-5 back sau doi phien` (ST-10).
- RF-2: Đang chờ response "Tất cả chi nhánh" của Sổ kho thì đổi sang chi nhánh A1; response cũ về sau → bảng chỉ hiện dữ liệu A1 — test: `test_ST6_AC10_response_cu_khong_ghi_de` (ST-6).
- RF-3: Địa chỉ có `/` cuối (`/kho/so-kho/`) → dùng như `/kho/so-kho`; địa chỉ viết hoa `/Kho/So-Kho` hoặc lạ `/kho/abc` → tab đầu tiên được phép — test: `test_ST5_AC4_chuan_hoa_va_dia_chi_la` (ST-5).
- RF-4: Dòng sổ kho có `invoice_id` của hóa đơn thuộc cửa hàng khác (dữ liệu lệch, DB không chặn) → `invoiceCode: null`, không lộ mã — test: subtest `ST1-AC6 invoice khac chi nhanh tra invoiceCode null` (ST-1).
- RF-5: Chi nhánh của MANAGER bị đổi tên sau khi đăng nhập → `GET /auth/me` lần sau trả tên mới (tiêu đề cập nhật khi `me()` chạy lại lúc focus, `AuthContext.tsx:62`) — test: subtest `ST2-AC4 doi ten chi nhanh me tra ten moi` (ST-2).

## Sub-tasks

### ST-1: API Sổ kho trả `branchName` và `invoiceCode` + test HTTP
- depends_on: -
- Interfaces:
  - Consumes: Không có.
  - Produces: JSON `GET /api/v1/stock-movements` mỗi phần tử có thêm `branchName: string`, `invoiceCode: string | null` (ST-6 dùng qua kiểu `Movement` ở UI).
- Mục tiêu: M1, M2 phía API; chứng minh qua HTTP quyền, phạm vi, lọc, phân trang không đổi.
- AC riêng:
  - [x] ST-1.AC-1: Given fixture (mục "Dữ liệu test" bên dưới), When OWNER A `GET /api/v1/stock-movements`, Then 200, `data` theo thứ tự `m5, m4, m3` rồi hai dòng `m1`/`m2` theo `id DESC`, `meta.total = 5`, `m1.branchName = "Chi nhánh Bắc"`, `m2.branchName = "Chi nhánh Nam"`, mỗi phần tử có đúng 13 khóa (kiểm: integration HTTP).
  - [x] ST-1.AC-2: Given fixture, When OWNER A GET, Then `m3.invoiceCode = "HDS10A0001"`, `m4.invoiceCode = "HDS10A0001"`, `m1.invoiceCode = null`, `m3.invoiceId` = id hóa đơn A, `m3.note = null` (kiểm: integration HTTP).
  - [x] ST-1.AC-3: Given fixture, When OWNER A `?limit=2`, Then trang 1 = 2 id đầu của oracle SQL `SELECT m.id FROM stock_movements m JOIN branches b ON b.id=m.branch_id WHERE b.store_id=$1 ORDER BY m.created_at DESC, m.id DESC`, `meta = {limit:2,total:5,nextCursor:<chuỗi>}`, `JSON.parse(Buffer.from(nextCursor,'base64url'))` deepEqual `{scope: JSON.stringify(['movements',storeA,null,null,null]), key: '2026-11-15T03:00:00.000001Z', id: m4}`; trang 2, 3 theo cursor = id thứ 3-4 và 5 của oracle; trang 3 `nextCursor: null` (kiểm: integration HTTP).
  - [x] ST-1.AC-4: Given fixture, When MANAGER A1 GET không `branchId`, Then 200 chỉ `m4, m3, m1` (`total 3`), mọi `branchName = "Chi nhánh Bắc"`; When MANAGER A1 `?branchId=<A1>`, Then 422 `{code:'VALIDATION_ERROR', message:'Dữ liệu kho không hợp lệ.'}` (kiểm: integration HTTP).
  - [x] ST-1.AC-5: Given fixture, When CASHIER A1 GET → 403 `PERMISSION_DENIED` "Bạn không có quyền thực hiện thao tác này."; PLATFORM_ADMIN → 403 `PERMISSION_DENIED`; không cookie → 401 `UNAUTHENTICATED` "Vui lòng đăng nhập để tiếp tục."; OWNER A `?branchId=<B1>` → 404 `NOT_FOUND` "Không tìm thấy chi nhánh."; OWNER B GET → chỉ `m6` với `branchName = "Chi nhánh B"`, body text không chứa "Chi nhánh Bắc", "Chi nhánh Nam", "HDS10A0001" (kiểm: integration HTTP).
  - [x] ST-1.AC-6: Given dòng `m5` (A2) có `invoice_id` = hóa đơn store B (`HDS10B0001`), When OWNER A GET, Then `m5.invoiceCode = null`, `m5.invoiceId` = id hóa đơn B (giữ nguyên field cũ), body không chứa "HDS10B0001" (kiểm: integration HTTP).
  - [x] ST-1.AC-7: Given fixture, When OWNER A `?branchId=<A1>`, Then `[m4,m3,m1]`, `total 3`; `?type=SALE_REVERSAL` → `[m4]`; `?type=IMPORT&branchId=<A2>` → `[m2]` (kiểm: integration HTTP).
- Plan chi tiết:
  - File tạo/sửa:
    - `POS_API/src/inventory/inventory.service.ts` dòng 252-259: SELECT thêm `b.name AS branch_name,inv.invoice_code`; thêm `LEFT JOIN invoices inv ON inv.id=m.invoice_id AND inv.branch_id=m.branch_id` sau `JOIN ingredients i ON i.id=m.ingredient_id`; view thêm `branchName:row.branch_name,invoiceCode:row.invoice_code ?? null`. Không đổi dòng 234-251 (scope, validation, count, cursor), không đổi `ORDER BY`.
    - `POS_API/src/inventory/tests/stock-movements.http.test.ts` (mới): một `test('S10-11 GET /stock-movements HTTP quyen pham vi branchName invoiceCode', { timeout: 180_000 }, async (t) => {...})` dựng DB riêng tên `pos_s10_ledger_<hex>` theo mẫu `inventory.http.test.ts:10-31,80-84`; các AC là `await t.test('ST1-AC<n> ...')`.
  - Chữ ký hàm/class: `async listMovements(user: UserSummary, query: Input)` không đổi; kiểu trả về thêm 2 field.
  - DTO/schema: như "API contract tổng".
  - DB/migration: không có.
  - API: như "API contract tổng".
  - Dữ liệu test (dựng trong test, M-19 dùng `randomUUID()`):
    1. Bootstrap admin (`bootstrapAdmin(db)`), login `admin`.
    2. `POST /platform/stores` A `{name:'S10 A',owner:{username:'s10_owner_a',fullName:'Owner A'}}`, B `{name:'S10 B',owner:{username:'s10_owner_b',fullName:'Owner B'}}`; `UPDATE users SET must_change_password=false` cho hai owner; login.
    3. OWNER A `POST /branches {code:'A1',name:'Chi nhánh Bắc'}`, `{code:'A2',name:'Chi nhánh Nam'}`; OWNER B `{code:'B1',name:'Chi nhánh B'}`.
    4. OWNER A `POST /users {branchId:A1,username:'s10_manager_a1',fullName:'Manager A1',role:'MANAGER'}` và `{branchId:A1,username:'s10_cashier_a1',fullName:'Cashier A1',role:'CASHIER'}`; `UPDATE users SET must_change_password=false`; login.
    5. OWNER A `POST /ingredients {name:'Sữa',unit:'ml'}`; OWNER B `{name:'Sữa B',unit:'ml'}`.
    6. `storeA` = `SELECT store_id FROM users WHERE username='s10_owner_a'`.
    7. SQL: `work_shifts` A1 (user cashier A1) và B1 (user owner B) với `started_at = now() - interval '1 hour'`, `status 'OPEN'` (M-31); `invoices` A `invoice_code 'HDS10A0001'` (branch A1), B `'HDS10B0001'` (branch B1), `TAKEAWAY`, `PAID`, `subtotal 35000`, `total_amount 35000`, `paid_at now()`.
    8. SQL `stock_movements(id,branch_id,ingredient_id,type,quantity,balance_after,invoice_id,created_by,created_at)` với `balance_after 0` (trigger tự tính): `m1` A1 IMPORT `100.000` không invoice `2026-11-15T01:00:00.000001Z`; `m2` A2 IMPORT `100.000` `2026-11-15T01:00:00.000001Z`; `m3` A1 SALE `-10.000` invoice A `2026-11-15T02:00:00.000001Z`; `m4` A1 SALE_REVERSAL `10.000` invoice A `2026-11-15T03:00:00.000001Z`; `m5` A2 SALE `-5.000` invoice B `2026-11-15T04:00:00.000001Z`; `m6` B1 IMPORT `50.000` ingredient B `2026-11-15T01:00:00.000001Z`; `created_by` = owner A (m1-m5), owner B (m6).
  - Các bước xử lý (code): 1. Giữ nguyên kiểm scope/validation. 2. Count như cũ. 3. SELECT có LEFT JOIN. 4. Map view thêm 2 field.
  - Quy tắc nghiệp vụ: phạm vi lấy từ danh tính (`CLAUDE.md` "Quy tắc sản phẩm"); không đổi quyền/phân trang (spec `:39`, `:65`); không lộ mã hóa đơn cửa hàng khác (spec `:46`).
  - Bảng edge case:
    - `invoice_id` null (IMPORT) → `invoiceCode: null`.
    - `invoice_id` hóa đơn khác chi nhánh/cửa hàng → `invoiceCode: null`.
    - Hai dòng cùng `created_at` khác chi nhánh → thứ tự `id DESC` như cũ, mỗi dòng có `branchName` riêng.
    - MANAGER gửi `branchId` của chính mình → 422 như cũ.
  - Ảnh hưởng tới code hiện có: chỉ `listMovements`; caller duy nhất `StockMovementsController.list` (`inventory.controller.ts:82-85`) và test `inventory.integration.test.ts:49-52,98` (giữ xanh, không sửa).
  - Tác dụng phụ: không có (không log, event, cache).
- Lỗi cũ liên quan: `20261110-branch-scope-http-test-missing.md` → kiểm phạm vi qua HTTP ở endpoint này; `20261110-backlog-branch-scope-null-branchid-fail-open.md`, `20261109-owner-access-all-branch-scope.md` → không đổi `branch()`; kiểm MANAGER không thấy chi nhánh khác (ST-1.AC-4).
- Test viết trước:
  - [x] `ST1-AC1 thu tu total va 13 khoa` — input: OWNER A GET — expected: thứ tự oracle, `total 5`, branchName từng dòng, 13 khóa.
  - [x] `ST1-AC2 invoiceCode cua SALE va SALE_REVERSAL` — input: OWNER A GET — expected: `HDS10A0001` cho m3, m4; null cho m1.
  - [x] `ST1-AC3 phan trang cursor khong doi` — input: `limit=2` × 3 trang — expected: id theo oracle, cursor decode như AC.
  - [x] `ST1-AC4 manager chi chi nhanh minh va 422 khi gui branchId` — input: MANAGER GET, GET `?branchId=A1` — expected: 3 dòng; 422.
  - [x] `ST1-AC5 quyen va cross-store` — input: CASHIER, admin, không cookie, OWNER A `?branchId=B1`, OWNER B — expected: 403, 403, 401, 404, chỉ m6.
  - [x] `ST1-AC6 invoice khac chi nhanh tra invoiceCode null` — input: OWNER A GET — expected: m5 `invoiceCode null`, body không có "HDS10B0001".
  - [x] `ST1-AC7 loc branchId type` — input: 3 truy vấn lọc — expected: như AC.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-2: API phiên trả `branchName`
- depends_on: -
- Interfaces:
  - Consumes: Không có.
  - Produces: `export interface SessionUser extends UserSummary { branchName: string | null }` trong `POS_API/src/auth/auth.service.ts`; JSON `data.user.branchName: string | null` của `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/refresh` (ST-3 dùng).
- Mục tiêu: nguồn tên chi nhánh cho tiêu đề (L3), tương thích ngược.
- AC riêng:
  - [x] ST-2.AC-1: Given MANAGER thuộc chi nhánh "Chi nhánh Bắc", When `POST /auth/login`, Then 200 `data.user.branchName = "Chi nhánh Bắc"` và `data.user` có đúng 9 khóa `branchId, branchName, fullName, id, mustChangePassword, permissions, role, storeId, username` (kiểm: integration HTTP).
  - [x] ST-2.AC-2: Given phiên MANAGER và CASHIER cùng chi nhánh, When `GET /auth/me`, Then `branchName = "Chi nhánh Bắc"` cho cả hai; When `POST /auth/refresh` (Origin + `X-CSRF-Token` từ cookie CSRF), Then 200 `data.user.branchName = "Chi nhánh Bắc"` (kiểm: integration HTTP).
  - [x] ST-2.AC-3: Given OWNER và PLATFORM_ADMIN, When login và `GET /auth/me`, Then `branchName: null` (kiểm: integration HTTP).
  - [x] ST-2.AC-4: Given MANAGER đã đăng nhập, When `UPDATE branches SET name='Chi nhánh Bắc mới'` rồi `GET /auth/me`, Then `branchName = "Chi nhánh Bắc mới"` (kiểm: integration HTTP).
  - [x] ST-2.AC-5: Given MANAGER, When gọi một API nghiệp vụ (`GET /api/v1/ingredient-stocks`), Then 200 như trước (không ảnh hưởng `authorizeAccess`); toàn bộ test auth hiện có xanh không sửa (kiểm: integration + `npm test`).
- Plan chi tiết:
  - File tạo/sửa:
    - `POS_API/src/auth/auth.service.ts`: thêm sau dòng 22 `export interface SessionUser extends UserSummary { branchName: string | null; }`; thêm method `private async sessionUser(user: User): Promise<SessionUser>`; `login()` kiểu trả về `Promise<{ user: SessionUser; access: string; refresh: string; csrf: string }>` và dòng 158 `user: await this.sessionUser(outcome)`; `me()` dòng 193-196 kiểu `Promise<SessionUser>`, `return this.sessionUser(user)`; `refresh()` dòng 228 kiểu `{ user: SessionUser; ... }`, dòng 305 `user: await this.sessionUser(result.user)`. Không đổi `summary()`, `authorizeAccess()`.
    - `POS_API/src/auth/http/auth.dto.ts` dòng 34-43: thêm `@ApiProperty({ type: String, nullable: true }) branchName!: string | null;` vào `UserSummaryDto`.
    - `POS_API/src/auth/tests/session-branch-name.http.test.ts` (mới): `test('S10-11 L3 session branchName', { timeout: 180_000 }, async (t) => {...})` dựng DB `pos_s10_session_<hex>` theo mẫu `inventory.http.test.ts:10-58`; tạo store, branch "Chi nhánh Bắc", MANAGER, CASHIER; subtest `ST2-AC1..AC5`.
  - Chữ ký: `private async sessionUser(user: User): Promise<SessionUser>`.
  - Các bước xử lý của `sessionUser`:
    1. `const summary = await this.summary(user);`
    2. Nếu `!user.branch_id` → `return { ...summary, branchName: null }`.
    3. `const [row] = await this.db.query('SELECT name FROM branches WHERE id=$1', [user.branch_id]);`
    4. `return { ...summary, branchName: row?.name ?? null };`
  - DTO: `branchName` | string \| null | có | tên chi nhánh hiện hành | null khi không gắn chi nhánh.
  - DB/migration: không có.
  - Quy tắc nghiệp vụ: tương thích ngược, có test, cập nhật tài liệu auth cùng lúc (spec `:68`; M-4) — tài liệu cập nhật ở bước sync-docs (mục "Tài liệu cần cập nhật").
  - Bảng edge case: OWNER/PLATFORM_ADMIN → null; chi nhánh đổi tên → tên mới ở lần `me()` sau; chi nhánh ngưng hoạt động → vẫn trả tên (không đổi quy tắc truy cập).
  - Ảnh hưởng tới code hiện có: `AccessGuard` gán `me()` cho route không permission (`access.guard.ts:28`) → `authUser` có thêm `branchName` lúc chạy (kiểu `UserSummary` vẫn gán được); `auth.integration.test.ts` chỉ kiểm từng field (`:103,115,121`), không deepEqual cả object, nên không phải sửa.
  - Tác dụng phụ: thêm 1 truy vấn `SELECT name FROM branches` cho `login/me/refresh` của người có chi nhánh.
- Lỗi cũ liên quan: `2026-10-29-auth-revoked-session-ui.md` → không đổi luồng lỗi `ACCOUNT_DISABLED/STORE_SUSPENDED` của `me()` (giữ `authenticateAccess` trước `sessionUser`). M-14/M-20: không thêm JOIN vào truy vấn có `FOR UPDATE` (`sessionUser` chạy sau transaction login/refresh).
- Test viết trước:
  - [x] `ST2-AC1 login manager co branchName va 9 khoa` — input: login MANAGER — expected: "Chi nhánh Bắc", 9 khóa.
  - [x] `ST2-AC2 me va refresh tra branchName` — input: me MANAGER, me CASHIER, refresh MANAGER — expected: "Chi nhánh Bắc" ×3.
  - [x] `ST2-AC3 owner va admin branchName null` — input: login + me OWNER, admin — expected: null.
  - [x] `ST2-AC4 doi ten chi nhanh me tra ten moi` — input: UPDATE tên rồi me — expected: "Chi nhánh Bắc mới".
  - [x] `ST2-AC5 api nghiep vu khong doi` — input: MANAGER `GET /ingredient-stocks` — expected: 200.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-3: UI phiên mang `branch_name` và tiêu đề theo chi nhánh
- depends_on: ST-2, ST-5
- Interfaces:
  - Consumes: JSON `data.user.branchName: string | null` từ ST-2; `canOpenProducts(permissions: readonly string[]): boolean` từ ST-5 (AppShell import, harness test cần mock).
  - Produces: `AuthUser.branchName?: string | null` (`POS_UI/src/auth/client.ts`); `toUiSession(user: AuthUser): AuthSession` gán `branch_name: user.branchName ?? undefined`.
- Mục tiêu: L3 — MANAGER/CASHIER thấy tên chi nhánh; "Tất cả chi nhánh" chỉ cho người có `branch.access_all`.
- AC riêng:
  - [x] ST-3.AC-1: Given `AuthUser` `{..., branchId:'b1', branchName:'Chi nhánh Bắc'}`, When `toUiSession`, Then `session.branch_name === 'Chi nhánh Bắc'`; Given `branchName: null` hoặc thiếu field, Then `branch_name === undefined` (kiểm: unit).
  - [x] ST-3.AC-2: Given session MANAGER (không `branch.access_all`, `branch_name:'Chi nhánh Bắc'`), When render `AppShell` `currentTab:'inventory'`, Then có `span` text "Chi nhánh Bắc", không có text "Tất cả chi nhánh" (kiểm: unit harness `node:vm`).
  - [x] ST-3.AC-3: Given session MANAGER không có `branch_name`, When render `AppShell` `currentTab:'inventory'`, Then `span` text đúng "Chi nhánh", không có "Tất cả chi nhánh" (kiểm: unit harness).
  - [x] ST-3.AC-4: Given session OWNER (`branch.access_all`, `branch_name` không có), When render `AppShell` `currentTab:'invoices'`, Then có "Tất cả chi nhánh" (kiểm: unit harness; test `[S9-06 branch]` hiện có vẫn xanh).
  - [x] ST-3.AC-5: Given session CASHIER `branch_name:'Chi nhánh Bắc'`, When `currentTab:'shifts'`, Then "Chi nhánh Bắc" (kiểm: unit harness).
- Plan chi tiết:
  - File tạo/sửa:
    - `POS_UI/src/auth/client.ts:12-15`: thêm `branchName?: string | null;` vào `AuthUser`.
    - `POS_UI/src/auth/session.ts:5-8`: object trả về thêm `branch_name: user.branchName ?? undefined`.
    - `POS_UI/src/components/common/AppShell.tsx:130`: `: session.branch_name || 'Tất cả chi nhánh');` → `: session.branch_name || (canSwitchBranch ? 'Tất cả chi nhánh' : 'Chi nhánh'));`.
    - `POS_UI/test/session-branch-title.test.mjs` (mới): import `toUiSession` từ `'../src/auth/session.ts'`; harness `load()` + `find()` chép từ `app-invoices-shell.test.mjs:8-9` để render `AppShell` với mock `react`, `AuthContext`, `mockEngine`, `navigation` (mock `navigation` = các hàm thật `canOpenSettings`, `canOpenProducts`, `reportScope` nạp từ `navigation.ts`; `canOpenProducts` do ST-5 tạo nên ST-3 chạy sau ST-5).
  - Chữ ký: không đổi chữ ký hàm.
  - Quy tắc: "Chi nhánh" là nhãn dự phòng đã dùng ở `AppShell.tsx:129`, `PosScreen.tsx:121`, `ShiftsScreen.tsx:240`.
  - Bảng edge case: có ca mở → `currentShift.branchName` vẫn ưu tiên (giữ `AppShell.tsx:128`); màn demo `pos/tables` giữ nhánh `isDemo` (ngoài phạm vi).
  - Ảnh hưởng: `rememberRequestIdentity` không dùng `branchName` (`session-events.ts:5-7`) — không đổi identity; test `test_ST3_AC1_service_shell_permissions` (`app-invoices-shell.test.mjs:14-37`) dùng `branch_name:'Chi nhánh B'` vẫn xanh.
  - Tác dụng phụ: không có.
- Lỗi cũ liên quan: `20261114-ui-report-tab-shown-without-access-all.md` và M-41 → điều kiện "Tất cả chi nhánh" dùng đúng `branch.access_all` (`canSwitchBranch`, `AppShell.tsx:53`), cùng quyền API dùng để cho xem mọi chi nhánh.
- Test viết trước:
  - [x] `test_ST3_AC1_toUiSession_branch_name` — input: 3 AuthUser (tên, null, thiếu) — expected: `'Chi nhánh Bắc'`, `undefined`, `undefined`.
  - [x] `test_ST3_AC2_manager_title_ten_chi_nhanh` — input: như AC — expected: như AC.
  - [x] `test_ST3_AC3_manager_thieu_ten_hien_Chi_nhanh` — input: như AC — expected: "Chi nhánh".
  - [x] `test_ST3_AC4_owner_tat_ca_chi_nhanh` — input: như AC — expected: "Tất cả chi nhánh".
  - [x] `test_ST3_AC5_cashier_title` — input: như AC — expected: "Chi nhánh Bắc".
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-4: Câu lỗi mất mạng riêng cho GET trong HTTP client
- depends_on: -
- Interfaces:
  - Consumes: Không có.
  - Produces: `request()` ném `AuthError('NETWORK_ERROR', 'Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.')` khi `fetch` reject và `method === 'GET'` (ST-6 hiển thị `error.message`).
- Mục tiêu: L2; thao tác ghi giữ câu cũ.
- AC riêng:
  - [x] ST-4.AC-1: Given `globalThis.fetch` ném `TypeError('Failed to fetch')`, When `request('stock-movements?limit=100','GET',undefined,true,true)`, Then reject `AuthError` `code === 'NETWORK_ERROR'`, `message === 'Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.'`, fetch gọi đúng 1 lần (kiểm: unit qua client thật).
  - [x] ST-4.AC-2: Given cookie `__Host-pos_csrf=t` và fetch ném lỗi, When `request('ingredients','POST',{name:'A',unit:'g'})`, `'PATCH'`, `'PUT'`, `'DELETE'`, Then mỗi lần `message === 'Chưa xác nhận được kết quả. Kiểm tra kết nối và tải lại danh sách trước khi thử lại.'`, fetch đúng 1 lần mỗi method (kiểm: unit).
  - [x] ST-4.AC-3: Toàn bộ `npm test` UI xanh, gồm `shift-service.test.mjs:205` và `organization-service.test.mjs:45-47` không sửa (kiểm: lệnh).
- Plan chi tiết:
  - File tạo/sửa:
    - `POS_UI/src/http/client.ts:27`: `} catch { throw new AuthError('NETWORK_ERROR', method === 'GET' ? 'Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.' : 'Chưa xác nhận được kết quả. Kiểm tra kết nối và tải lại danh sách trước khi thử lại.'); }`.
    - `POS_UI/test/http-client-network.test.mjs` (mới): import `{ request }` từ `'../src/http/client.ts'`, `rememberRequestIdentity` từ `'../src/auth/session-events.ts'`; `afterEach` xóa `globalThis.document`, `globalThis.fetch` (mẫu `shift-service.test.mjs:6-11`).
  - Bảng edge case: `request('auth/csrf')` nội bộ (GET) lỗi mạng → câu đọc; mutation gặp lỗi mạng khi lấy CSRF (`client.ts:12`) → lỗi ném từ GET `auth/csrf` mang câu đọc (giữ hành vi: chưa gửi mutation nên không có kết quả mơ hồ).
  - Ảnh hưởng: mọi màn hiện `error.message` của GET (Hóa đơn, Ca, Báo cáo, Cài đặt, Kho) đổi câu khi mất mạng — đúng mục tiêu spec `:84`; `LivePaymentDialog.tsx:62`, `AddExpenseModal.tsx:77`, `BlindCountCloseShiftModal.tsx:88`, `ForceCloseShiftModal.tsx:74` dựa vào `code` không đổi.
  - Tác dụng phụ: không có.
- Lỗi cũ liên quan: `20261114-ui-shared-client-default-message-masks-screen-fallback.md`, M-42 → test đi qua client thật với `fetch` giả; không đổi `GENERIC_ERROR_MESSAGE`.
- Test viết trước:
  - [x] `test_ST4_AC1_get_mat_mang_cau_doc` — input/expected: như AC-1.
  - [x] `test_ST4_AC2_ghi_mat_mang_giu_cau_cu` — input/expected: như AC-2.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-5: Module địa chỉ `POS_UI/src/app/routes.ts` và một nguồn quyền tab Thực đơn
- depends_on: -
- Interfaces:
  - Consumes: `accessibleTabs(session: AuthSession): NavTab[]` (có sẵn, `POS_UI/src/app/navigation.ts:19`; điều kiện tab `products` đổi trong chính ST-5).
  - Produces (file `POS_UI/src/app/navigation.ts`): `export const canOpenProducts = (permissions: readonly string[]) => boolean` (`true` khi có `menu.manage` hoặc `product.manage`).
  - Produces (file `POS_UI/src/app/routes.ts`):
    - `export type InventoryTab = 'stocks' | 'movements' | 'catalog';`
    - `export type PosTab = 'menu' | 'tables' | 'orders';`
    - `export type ProductsTab = 'products' | 'toppings' | 'categories' | 'sizes';`
    - `export type SettingsTab = 'branches' | 'tables' | 'staff' | 'promotions';`
    - `export type SubTab = InventoryTab | PosTab | ProductsTab | SettingsTab;`
    - `export interface AppRoute { path: string; tab: NavTab; sub: SubTab | null }`
    - `export const LOGIN_PATH = '/dang-nhap';`
    - `export const ROUTES: readonly AppRoute[]` (19 dòng đúng bảng địa chỉ)
    - `export function pathFor(tab: NavTab, sub: SubTab | null, session: AuthSession): string`
    - `export function resolveRoute(pathname: string, session: AuthSession): AppRoute`
- Mục tiêu: một nguồn ánh xạ địa chỉ ↔ tab và quyền (M-41), thuần TS để test trực tiếp; một hàm quyền tab Thực đơn cho route, rail và App (user Q2).
- AC riêng:
  - [x] ST-5.AC-1: Given `ROUTES`, Then có đúng 19 phần tử, `path` duy nhất, khớp từng dòng bảng địa chỉ (kiểm: unit).
  - [x] ST-5.AC-2: Given 4 phiên chuẩn (OWNER, MANAGER, CASHIER, PLATFORM_ADMIN với quyền theo mục Khám phá "Quyền theo vai trò"), When `resolveRoute(path, session)` cho mỗi `path` của `ROUTES` (76 tổ hợp), Then `.path` = bảng kỳ vọng ở "Ma trận route × vai trò" (kiểm: unit).
  - [x] ST-5.AC-3: Given OWNER, When `resolveRoute('/kho')`, `('/ban-hang')`, `('/thuc-don')`, `('/cai-dat')`, `('/')`, `('/dang-nhap')`, Then `/kho/ton-kho`, `/ban-hang/thuc-don`, `/thuc-don/mon`, `/cai-dat/chi-nhanh`, `/cai-dat/chi-nhanh`, `/cai-dat/chi-nhanh`; Given MANAGER `('/cai-dat')` → `/cai-dat/ban`; Given phiên chỉ có `promotion.manage` (role MANAGER) `('/cai-dat')` → `/cai-dat/khuyen-mai` (kiểm: unit).
  - [x] ST-5.AC-4: Given OWNER, When `resolveRoute('/kho/so-kho/')` → `{path:'/kho/so-kho',tab:'inventory',sub:'movements'}`; `('/Kho/So-Kho')` → `/cai-dat/chi-nhanh`; `('/kho/abc')` → `/cai-dat/chi-nhanh`; `('/api/v1/health')` → `/cai-dat/chi-nhanh` (kiểm: unit).
  - [x] ST-5.AC-5: Given OWNER/MANAGER/PLATFORM_ADMIN, When `pathFor('tables','tables',owner)` → `/so-do-ban`; `pathFor('pos','orders',owner)` → `/ban-hang/don-dang-mo`; `pathFor('inventory',null,owner)` → `/kho/ton-kho`; `pathFor('reports',null,owner)` → `/bao-cao`; `pathFor('settings',null,manager)` → `/cai-dat/ban`; `pathFor('platform_owners',null,admin)` → `/chu-quan` (kiểm: unit).
  - [x] ST-5.AC-6: Given phiên PLATFORM_ADMIN không có quyền nào (`permissions: []`), When `resolveRoute('/cua-hang')`, Then `/cai-dat/chi-nhanh` (`tab:'settings'`), gọi lại `resolveRoute('/cai-dat/chi-nhanh')` trả cùng path (không vòng lặp) (kiểm: unit).
  - [x] ST-5.AC-7: Given `canOpenProducts`, Then `(['menu.read'])` → `false`, `(['menu.manage'])` → `true`, `(['product.manage'])` → `true`, `([])` → `false`; `accessibleTabs(CASHIER chuẩn)` không chứa `'products'`, `accessibleTabs(MANAGER chuẩn)` và `accessibleTabs(OWNER chuẩn)` chứa `'products'`; `accessibleTabs(CASHIER chuẩn)` vẫn bắt đầu bằng `'pos'` và vẫn chứa `'pos','tables','invoices','shifts','reports'` (kiểm: unit).
  - [x] ST-5.AC-8: Given `AppShell` render với `navigation` THẬT (`canOpenSettings`, `canOpenProducts`, `reportScope` từ `navigation.ts`), When session CASHIER chuẩn, Then không có mục rail "Thực đơn"; MANAGER chuẩn có "Thực đơn"; Given `App.tsx` `AuthenticatedRouter` với CASHIER chuẩn ở tab `products` (ST-5 chưa có router: ép tab như cách test cũ `app-invoices-shell.test.mjs:61`), Then không render `ProductsScreen`, render `AccessDenied` thông báo "Yêu cầu quyền quản lý thực đơn (menu.manage hoặc product.manage)." (kiểm: unit harness).
- Plan chi tiết:
  - File tạo/sửa:
    - `POS_UI/src/app/routes.ts` (mới): `import type { NavTab } from '../components/common/AppShell'; import type { AuthSession } from '../types/auth'; import { accessibleTabs } from './navigation.ts';` (đuôi `.ts` để `node --experimental-strip-types` nạp được; `allowImportingTsExtensions` đã bật).
    - `POS_UI/test/app-routes.test.mjs` (mới): `import { ROUTES, LOGIN_PATH, pathFor, resolveRoute } from '../src/app/routes.ts';` và `import { accessibleTabs, canOpenProducts } from '../src/app/navigation.ts';`.
    - `POS_UI/src/app/navigation.ts`: thêm sau dòng 5 `export const canOpenProducts = (permissions: readonly string[]) => ['menu.manage', 'product.manage'].some(permission => permissions.includes(permission));`; dòng 30 `if (has('menu.read') || has('menu.manage') || has('product.manage')) tabs.push('products');` → `if (canOpenProducts(session.permissions)) tabs.push('products');`.
    - `POS_UI/src/components/common/AppShell.tsx:9` import thêm `canOpenProducts`; dòng 121 `visible: !isPlatformAdmin && (has('menu.manage') || has('product.manage'))` → `visible: !isPlatformAdmin && canOpenProducts(perms)` (cùng kết quả, đổi nguồn).
    - `POS_UI/src/app/App.tsx:19` import thêm `canOpenProducts`; dòng 107-108 → `if (!canOpenProducts(perms)) { return <AccessDenied message="Yêu cầu quyền quản lý thực đơn (menu.manage hoặc product.manage)." />; }` (ST-8 giữ nguyên guard này khi viết lại App).
    - `POS_UI/test/app-invoices-shell.test.mjs:9`: `navMock` thêm `canOpenProducts: load('../src/app/navigation.ts',()=>({})).canOpenProducts` (thêm mock cho import mới của AppShell theo M-28; không đổi assert). Các mock `navigation` dùng khi nạp `App.tsx` (`:11`, `:26`, `:63`) thêm `canOpenProducts:()=>false` (App import thêm hàm; các test này không vào tab `products`).
    - `POS_UI/test/app-shell-products.test.mjs` (mới) chứa test ST-5.AC-8, harness `load()`/`find()` chép từ `app-invoices-shell.test.mjs:8-9`.
  - Các bước xử lý:
    - `settingsSubs = [['branches','branch.manage'],['tables','table.manage'],['staff','user.manage'],['promotions','promotion.manage']]`; `defaultSub(tab, session)`: `pos` → `'menu'`, `tables` → `'tables'`, `inventory` → `'stocks'`, `products` → `'products'`, `settings` → phần tử đầu `settingsSubs` mà `session.permissions` có quyền, không có → `'branches'`; tab khác → `null`.
    - `pathFor(tab, sub, session)`: `const wanted = sub ?? defaultSub(tab, session); return (ROUTES.find(r => r.tab === tab && r.sub === wanted) ?? ROUTES.find(r => r.tab === tab && r.sub === defaultSub(tab, session)))!.path;`
    - `resolveRoute(pathname, session)`:
      1. `const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;`
      2. `const bare = { '/ban-hang': 'pos', '/kho': 'inventory', '/thuc-don': 'products', '/cai-dat': 'settings' }[path]`.
      3. `const found = ROUTES.find(r => r.path === path) ?? (bare ? ROUTES.find(r => r.path === pathFor(bare, null, session)) : undefined);`
      4. `allowed(r) = accessibleTabs(session).includes(r.tab) && (r.tab !== 'settings' || session.permissions.includes(<quyền của r.sub trong settingsSubs>))`.
      5. `found && allowed(found)` → trả `found`.
      6. Ngược lại `const first = accessibleTabs(session)[0] ?? 'settings'; return ROUTES.find(r => r.path === pathFor(first, null, session))!;`
  - Bảng edge case: như ST-5.AC-3..AC-6; `pathname` chứa query/hash không xảy ra (App truyền `location.pathname`); CASHIER mở `/thuc-don` (địa chỉ gốc) → tab `products` không được phép → `/ban-hang/thuc-don`.
  - Ảnh hưởng:
    - `routes.ts`: chưa có caller (ST-6, ST-7, ST-8 dùng).
    - Thay đổi hành vi do user quyết (Q2, không phải sửa yếu test): `accessibleTabs` của người chỉ có `menu.read` (CASHIER) không còn `products`; App không render `ProductsScreen` cho người đó và thông báo AccessDenied đổi từ "Yêu cầu quyền xem hoặc quản lý thực đơn (menu.read hoặc menu.manage)." thành "Yêu cầu quyền quản lý thực đơn (menu.manage hoặc product.manage)." (grep chuỗi cũ trong `POS_UI/test`, `docs`, `.devloopflow/specs` không có kết quả, planner chạy 2026-11-15).
    - Test hiện có KHÔNG đổi expected: `organization-screen.test.mjs:208-215` và các test `app-invoices-shell.test.mjs` chỉ kiểm `settings`, `platform_stores`, `shifts`, `reports`; `test_ST3_AC1_service_shell_permissions` (`app-invoices-shell.test.mjs:15-37`) dùng session CASHIER với quyền báo cáo, không kiểm `products`, chỉ cần `navMock` có thêm `canOpenProducts`; rail CASHIER vốn không hiện "Thực đơn" nên `icon-actions.browser.mjs:361` (session có quyền quản lý thực đơn theo mock của file) không đổi; `reports-screen.test.mjs:44` không nạp AppShell nên không đổi.
    - Server không đổi: CASHIER vẫn có `menu.read` (`20261102000000-MenuCatalog.ts:92`); `LivePosScreen` vẫn gọi `menuService.getAllCategories/getAllProducts/getAllToppings` để bán (`shift-screen.test.mjs:122` mock đúng các hàm này), nên tab con "Thực đơn" trong Bán hàng (`/ban-hang/thuc-don`) của CASHIER vẫn hoạt động.
  - Tác dụng phụ: không có.
- Ma trận route × vai trò (kỳ vọng `resolveRoute(path).path`; "=" nghĩa là giữ nguyên `path`):

  | path | OWNER | MANAGER | CASHIER | PLATFORM_ADMIN |
  |---|---|---|---|---|
  | `/cua-hang` | `/cai-dat/chi-nhanh` | `/cai-dat/ban` | `/ban-hang/thuc-don` | = |
  | `/chu-quan` | `/cai-dat/chi-nhanh` | `/cai-dat/ban` | `/ban-hang/thuc-don` | = |
  | `/ban-hang/thuc-don` | = | = | = | `/cua-hang` |
  | `/ban-hang/don-dang-mo` | = | = | = | `/cua-hang` |
  | `/so-do-ban` | = | = | = | `/cua-hang` |
  | `/hoa-don` | = | = | = | `/cua-hang` |
  | `/ca-lam` | = | = | = | `/cua-hang` |
  | `/kho/ton-kho` | = | = | `/ban-hang/thuc-don` | `/cua-hang` |
  | `/kho/so-kho` | = | = | `/ban-hang/thuc-don` | `/cua-hang` |
  | `/kho/nguyen-lieu` | = | = | `/ban-hang/thuc-don` | `/cua-hang` |
  | `/bao-cao` | = | = | = | `/cua-hang` |
  | `/thuc-don/mon` | = | = | `/ban-hang/thuc-don` (G-4) | `/cua-hang` |
  | `/thuc-don/mon-them` | = | = | `/ban-hang/thuc-don` (G-4) | `/cua-hang` |
  | `/thuc-don/danh-muc` | = | = | `/ban-hang/thuc-don` (G-4) | `/cua-hang` |
  | `/thuc-don/kich-co` | = | = | `/ban-hang/thuc-don` (G-4) | `/cua-hang` |
  | `/cai-dat/chi-nhanh` | = | `/cai-dat/ban` | `/ban-hang/thuc-don` | `/cua-hang` |
  | `/cai-dat/ban` | = | = | `/ban-hang/thuc-don` | `/cua-hang` |
  | `/cai-dat/tai-khoan` | = | `/cai-dat/ban` | `/ban-hang/thuc-don` | `/cua-hang` |
  | `/cai-dat/khuyen-mai` | = | = | `/ban-hang/thuc-don` | `/cua-hang` |
- Lỗi cũ liên quan: `20261114-ui-report-tab-shown-without-access-all.md`, M-41 → quyền tab chỉ lấy từ `accessibleTabs` (đã gồm `reportScope` với `branch.access_all`), không viết lại điều kiện quyền.
- Test viết trước:
  - [x] `test_ST5_AC1_bang_19_dia_chi` — input: `ROUTES` — expected: 19 dòng đúng bảng.
  - [x] `test_ST5_AC2_ma_tran_route_vai_tro` — input: 76 tổ hợp — expected: bảng ma trận.
  - [x] `test_ST5_AC3_dia_chi_goc_va_mac_dinh` — input/expected: như AC-3.
  - [x] `test_ST5_AC4_chuan_hoa_va_dia_chi_la` — input/expected: như AC-4.
  - [x] `test_ST5_AC5_pathFor` — input/expected: các cặp ở AC-5 (`pathFor('tables','tables',owner)` → `/so-do-ban`, `pathFor('pos','orders',owner)` → `/ban-hang/don-dang-mo`, `pathFor('inventory',null,owner)` → `/kho/ton-kho`, `pathFor('reports',null,owner)` → `/bao-cao`, `pathFor('settings',null,manager)` → `/cai-dat/ban`, `pathFor('platform_owners',null,admin)` → `/chu-quan`).
  - [x] `test_ST5_AC6_khong_tab_khong_vong_lap` — input/expected: như AC-6.
  - [x] `test_ST5_AC7_canOpenProducts_va_accessibleTabs` — input/expected: như AC-7.
  - [x] `test_ST5_AC8_rail_va_app_dung_canOpenProducts` — input/expected: như AC-8.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-6: Màn Kho — cột Chi nhánh, mã hóa đơn, dấu "+", Thử lại 48px, ô chọn theo tên, tải theo tab
- depends_on: ST-1, ST-5
- Interfaces:
  - Consumes: field `branchName: string`, `invoiceCode: string | null` của API (ST-1); `import type { InventoryTab } from '../../app/routes'` (ST-5).
  - Produces: `export const InventoryScreen: React.FC<{ tab?: InventoryTab; onTabChange?: (tab: InventoryTab) => void }>` (ST-8 dùng); `Movement` thêm `branchName: string; invoiceCode: string | null`.
- Mục tiêu: M1, M2, V2, L1, V1 (ô chọn), L5 trên màn Kho.
- AC riêng:
  - [x] ST-6.AC-1: Given OWNER (`branch.access_all`), When mount không props, Then chỉ gọi `inventoryService.stocks(undefined)` 1 lần; không gọi `ingredients`, `movements` (kiểm: unit harness).
  - [x] ST-6.AC-2: Given đang ở tab Tồn kho đã tải, When bấm nút tab "Sổ kho", Then gọi `movements(undefined)` 1 lần, không gọi lại `stocks` (kiểm: unit harness).
  - [x] ST-6.AC-3: Given OWNER "Tất cả chi nhánh", movements `[{branchName:'Chi nhánh Bắc',...},{branchName:'Chi nhánh Nam',...}]`, When render tab Sổ kho, Then `DataTable.columns` có `header: 'Chi nhánh'` đứng ngay sau "Nguyên liệu", `render(row)` trả "Chi nhánh Bắc"/"Chi nhánh Nam"; When đổi ô chọn sang `b1`, Then gọi `movements('b1')` và columns không còn "Chi nhánh" (kiểm: unit harness chạy callback cột, M-11).
  - [x] ST-6.AC-4: Given MANAGER (không `branch.access_all`, `branch_id:'b1'`), When mount với `tab='movements'`, Then không gọi `getBranchChoices`, không có `select` `aria-label="Chi nhánh kho"`, columns không có "Chi nhánh", gọi `movements(undefined)` (kiểm: unit harness).
  - [x] ST-6.AC-5: Given rows Sổ kho, When chạy `render` cột "Ghi chú", Then `{note:null,invoiceCode:'HDS10A0001',invoiceId:'<uuid>'}` → "HDS10A0001"; `{note:'Nhập đầu kỳ',invoiceCode:null}` → "Nhập đầu kỳ"; `{note:'Ghi tay',invoiceCode:'HDS10A0001'}` → "Ghi tay"; `{note:null,invoiceCode:null,invoiceId:null}` → "—"; không có giá trị nào bằng `invoiceId` (kiểm: unit).
  - [x] ST-6.AC-6: Given cột "Thay đổi", When render `{quantity:'100.000',unit:'ml'}` → "+100.000 ml"; `{quantity:'-10.000',unit:'ml'}` → "-10.000 ml"; `{quantity:'0.500',unit:'g'}` → "+0.500 g" (kiểm: unit).
  - [x] ST-6.AC-7: Given Tồn kho đã tải 2 dòng, When chuyển "Sổ kho" và `movements` reject `new Error('Lỗi máy chủ test')`, Then có `div[role=alert]` chứa "Lỗi máy chủ test" và nút "Thử lại" với `style` deepEqual `{ marginLeft: 'auto' }`, `className 'btn btn-text'`, không render `DataTable`; When bấm "Tồn kho", Then `stocks` gọi lại, không còn alert, `DataTable.data.length === 2` (kiểm: unit harness).
  - [x] ST-6.AC-8: Given `getBranchChoices` trả `[{id:'b7',name:'Chi nhánh Nam'},{id:'b6',name:'Chi nhánh Đông'},{id:'b2',name:'Chi nhánh 2'},{id:'b1',name:'Chi nhánh Bắc'},{id:'b3',name:'An Phú'},{id:'b10',name:'Chi nhánh 10'},{id:'b5',name:'Chi nhánh Dương'}]`, When render, Then option sau "Tất cả chi nhánh" theo thứ tự "An Phú", "Chi nhánh 10", "Chi nhánh 2", "Chi nhánh Bắc", "Chi nhánh Dương", "Chi nhánh Đông", "Chi nhánh Nam" ("10" trước "2": so chữ thuần; "Dương" trước "Đông": thứ tự tiếng Việt) (kiểm: unit; G-3).
  - [x] ST-6.AC-9: Given `getBranchChoices` reject `new Error('Không tải được chi nhánh')`, When render tab Tồn kho với stocks 1 dòng, Then có alert "Không tải được chi nhánh" và `DataTable` vẫn render 1 dòng (kiểm: unit).
  - [x] ST-6.AC-10: Given tab Sổ kho, request "Tất cả" còn pending (deferred), When đổi ô chọn sang `b1` (request thứ 2 phát ra), rồi resolve request 1 với dòng `branchName:'Chi nhánh Nam'`, Then màn vẫn loading (không render dòng cũ); resolve request 2 `[{branchName:'Chi nhánh Bắc'}]` → `DataTable.data` chỉ 1 dòng đó (kiểm: unit; lỗi `20261114-backlog-stale-list-test-settled-request`).
  - [x] ST-6.AC-11: Given mount với `tab='movements'` và `onTabChange` ghi lại, When bấm nút "Nguyên liệu", Then `onTabChange` nhận `'catalog'`; When render lại với `tab='catalog'`, Then gọi `ingredients()` (kiểm: unit).
  - [x] ST-6.AC-12: Given tab Sổ kho đã tải, When bấm "Tải lại", Then `movements` gọi thêm 1 lần, `stocks` và `ingredients` không gọi thêm (kiểm: unit).
  - [x] ST-6.AC-13: Given movements `[]`, When tab Sổ kho, Then `DataTable.data` rỗng, `emptyMessage === 'Chưa có bút toán kho'` (kiểm: unit).
- Plan chi tiết:
  - File tạo/sửa:
    - `POS_UI/src/features/inventory/inventoryService.ts:5-6`: `Movement` thêm `branchName: string; invoiceCode: string | null;`.
    - `POS_UI/src/features/inventory/InventoryScreen.tsx`:
      - Dòng 14: thay `type Tab = ...` bằng `import type { InventoryTab } from '../../app/routes';` (đặt cùng nhóm import) và dùng `InventoryTab` ở mọi chỗ `Tab`.
      - Dòng 23-28: `export const InventoryScreen: React.FC<{ tab?: InventoryTab; onTabChange?: (tab: InventoryTab) => void }> = ({ tab, onTabChange } = {}) => { ... return <InventoryContent key={identity} tab={tab} onTabChange={onTabChange} />; };`
      - `InventoryContent` nhận cùng props; thay dòng 39 bằng `const [ownTab, setOwnTab] = useState<InventoryTab>('stocks'); const tab = props.tab ?? ownTab; const selectTab = (next: InventoryTab) => { setOwnTab(next); props.onTabChange?.(next); };`.
      - Thay state `ingredients/stocks/movements/loading/error` (dòng 40-44) bằng `const [result, setResult] = useState<{ key: string; rows?: unknown[]; error?: string } | null>(null);` và `const [branchError, setBranchError] = useState('');`; `const viewKey = JSON.stringify([tab, allBranches ? branchId : '', revision]); const loading = result?.key !== viewKey; const error = !loading ? result?.error ?? '' : ''; const rows = !loading && !result?.error ? result?.rows ?? [] : [];`.
      - Dòng 53-59: `.then(rows => { if (live) setBranches([...rows].sort((a, b) => a.name.localeCompare(b.name, 'vi'))); })` (không `numeric`, G-3), `.catch(err => { if (live) setBranchError(errorText(err)); })`.
      - Dòng 61-70: effect deps `[viewKey]`: `const scope = allBranches ? branchId || undefined : undefined; const load = tab === 'stocks' ? inventoryService.stocks(scope) : tab === 'movements' ? inventoryService.movements(scope) : inventoryService.ingredients(); load.then(data => { if (live) setResult({ key: viewKey, rows: data }); }).catch(err => { if (live) setResult({ key: viewKey, error: errorText(err) }); }); return () => { live = false; };`.
      - Dòng 117-125: thêm `...(allBranches && !branchId ? [{ key: 'branch', header: 'Chi nhánh', render: (row: Movement) => row.branchName }] : [])` ngay sau cột `ingredient`; cột `quantity` render `` `${Number(row.quantity) > 0 ? '+' : ''}${row.quantity} ${row.unit}` ``; cột `note` render `row.note || row.invoiceCode || '—'`.
      - Dòng 136: `onClick={() => selectTab(key)}`.
      - Trước alert dữ liệu: `{branchError && <div role="alert" className="notice notice-danger"><XCircle size={18} /><span>{branchError}</span></div>}`.
      - Dòng 147: `style={{ marginLeft: 'auto' }}`.
      - Dòng 148-152: `DataTable` dùng `rows as Stock[]`, `rows as Movement[]`, `rows as Ingredient[]` theo `tab`.
    - `POS_UI/test/inventory-screen.test.mjs` (mới): harness `node:vm` theo mẫu `organization-screen.test.mjs:17-73` (fake `useState/useRef/useEffect`, vòng render tới khi hết `dirty`, `flush()`), `require` giả: `react`, `/AuthContext` (`useAuth`), `/ToastContext`, `/organizationService`, `./inventoryService`, `/Button`, `/Badge`, `/DataTable`, `/Dialog`, `/Field`, `/formatters` (`formatDateTimeVN: String`), `lucide-react` (Proxy trả tên), `../../app/routes` không cần (chỉ `import type`, bị `ts.transpileModule` xóa); module lạ → `throw new Error('Unexpected dependency: ' + path)` (M-28).
  - Bảng edge case:
    - Bấm tab đang mở → `selectTab` cùng giá trị, `viewKey` không đổi, không tải lại, không kẹt loading (lỗi `2026-10-30-pb13-active-tab-loading`).
    - Đổi chi nhánh khi ở tab Nguyên liệu → tải lại `ingredients()` (key có branch; spec `:31` "đổi chi nhánh tải lại tab đang mở").
    - Lưu nguyên liệu/ngưỡng thành công → `refresh()` tải lại tab đang mở.
    - Mutation dùng `mounted` ref giữ nguyên (`InventoryScreen.tsx:31-32` đã đặt `true` trong thân effect).
  - Ảnh hưởng: `App.tsx:111-113` render `<InventoryScreen key={identityKey} />` vẫn hợp lệ (hai props đều có `?`, không bắt buộc) đến khi ST-8 truyền props.
  - Tác dụng phụ: không có.
- Lỗi cũ liên quan: `2026-10-30-pb13-tab-row-shape.md` + M-11 → rows chỉ render khi key khớp, test chạy callback cột; `2026-10-30-pb13-active-tab-loading.md` → không đổi key khi bấm tab hiện hành; `20261114-backlog-stale-list-test-settled-request.md` → AC-10 chứng minh request cũ pending trước khi resolve; `20261114-react-strictmode-mounted-ref-stuck-false.md` → giữ `mounted.current = true` trong thân effect; M-28 → thêm mock thay vì bỏ import.
- Test viết trước:
  - [x] `test_ST6_AC1_mo_man_chi_tai_ton_kho` — input/expected: như AC-1.
  - [x] `test_ST6_AC2_chuyen_so_kho_tai_movements` — như AC-2.
  - [x] `test_ST6_AC3_cot_chi_nhanh_owner_tat_ca` — như AC-3.
  - [x] `test_ST6_AC4_manager_khong_cot_khong_o_chon` — như AC-4.
  - [x] `test_ST6_AC5_ghi_chu_ma_hoa_don` — như AC-5.
  - [x] `test_ST6_AC6_dau_cong_so_duong` — như AC-6.
  - [x] `test_ST6_AC7_loi_tab_doc_lap_va_thu_lai` — như AC-7.
  - [x] `test_ST6_AC8_o_chon_theo_ten` — như AC-8.
  - [x] `test_ST6_AC9_loi_chi_nhanh_khong_xoa_bang` — như AC-9.
  - [x] `test_ST6_AC10_response_cu_khong_ghi_de` — như AC-10.
  - [x] `test_ST6_AC11_tab_dieu_khien_tu_props` — như AC-11.
  - [x] `test_ST6_AC12_tai_lai_chi_tab_dang_mo` — như AC-12.
  - [x] `test_ST6_AC13_rong` — như AC-13.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-7: Tab con Bán hàng, Thực đơn, Cài đặt nhận `tab`/`onTabChange`
- depends_on: ST-5
- Interfaces:
  - Consumes: `import type { PosTab, ProductsTab, SettingsTab } from '../../app/routes'` (ST-5).
  - Produces:
    - `export const LivePosScreen: React.FC<{ activeTab?: PosTab; onTabChange?: (tab: PosTab) => void; initialInvoiceId?: string | null }>` (bỏ `activeMode`, `onSwitchToPos`, `onSwitchToTables`).
    - `export const ProductsScreen: React.FC<{ tab?: ProductsTab; onTabChange?: (tab: ProductsTab) => void }>`.
    - `export const SettingsScreen: React.FC<{ tab?: SettingsTab; onTabChange?: (tab: SettingsTab) => void }>`.
    - `export function SettingsContent({ session, tab, onTabChange }: { session: AuthSession; tab?: 'branches' | 'tables' | 'staff'; onTabChange?: (tab: 'branches' | 'tables' | 'staff') => void })`.
- Mục tiêu: mọi tab con có thể điều khiển bằng địa chỉ; không props thì giữ hành vi cũ (test cũ không đổi).
- AC riêng:
  - [x] ST-7.AC-1: Given `LivePosScreen({ activeTab: 'orders', onTabChange })` (harness `shift-screen.test.mjs`), When render, Then nút tab "Đơn đang mở" có `aria-current === 'true'`; When bấm "Sơ đồ bàn", Then `onTabChange` nhận `'tables'` (kiểm: unit harness).
  - [x] ST-7.AC-2: Given `LivePosScreen({ activeTab: 'tables', onTabChange })` có bàn "Bàn 1" đang có đơn OPEN, When bấm "Bàn 1", Then `onTabChange` nhận `'menu'` (thay `onSwitchToPos`) (kiểm: unit harness).
  - [x] ST-7.AC-3: Given `LivePosScreen({})`, When bấm "Sơ đồ bàn", Then nút "Sơ đồ bàn" `aria-current === 'true'` (tự quản; toàn bộ `live-payment.test.mjs` xanh không sửa) (kiểm: unit).
  - [x] ST-7.AC-4: Given `ProductsScreen({ tab: 'sizes', onTabChange })` (harness mới), When render, Then nút "Kích cỡ món" có `style.fontWeight === 700`, các nút khác 500; When bấm "Danh mục món", Then `onTabChange` nhận `'categories'`; Given `ProductsScreen({})`, When bấm "Món thêm và áp dụng", Then nút đó `fontWeight 700` (kiểm: unit harness).
  - [x] ST-7.AC-5: Given `SettingsScreen({ tab: 'promotions', onTabChange })` với OWNER, When render, Then render `PromotionsPanel`, không render `SettingsContent`; When bấm "Tổ chức", Then `onTabChange` nhận `'branches'`; Given MANAGER (`table.manage`, `promotion.manage`) bấm "Tổ chức" khi ở `promotions` → `'tables'` (kiểm: unit harness `organization-screen.test.mjs`).
  - [x] ST-7.AC-6: Given `SettingsContent({ session: owner, tab: 'staff', onTabChange })`, When mount, Then request đầu là `getStaff`; When bấm tab "Bàn", Then `onTabChange` nhận `'tables'` và gọi `getTables`; When render lại với `tab: 'branches'`, Then gọi `getBranches` với bộ lọc rỗng (`status/role/branch` reset) (kiểm: unit harness).
  - [x] ST-7.AC-7: Given `SettingsScreen()` gọi không đối số (như `organization-screen.test.mjs:101`), Then không ném lỗi và `props.key` như trước; toàn bộ `organization-screen.test.mjs`, `live-payment.test.mjs`, `shift-screen.test.mjs` xanh không sửa test cũ (kiểm: lệnh).
- Plan chi tiết:
  - File tạo/sửa:
    - `POS_UI/src/features/pos/LivePosScreen.tsx`: dòng 14 bỏ `type Tab`, dùng `import type { PosTab } from '../../app/routes'`; dòng 30-31 props mới với mặc định `= {}` không cần (React luôn truyền object; test gọi `({})`); dòng 33 → `const [ownTab, setOwnTab] = useState<PosTab>('menu'); const tab = activeTab ?? ownTab; const selectTab = (next: PosTab) => { setOwnTab(next); onTabChange?.(next); };`; xóa dòng 76 (effect theo `activeMode`); dòng 155 `setTab('menu'); onSwitchToPos?.();` → `selectTab('menu');`; dòng 219 `onClick={() => selectTab(value)}`.
    - `POS_UI/src/features/products/ProductsScreen.tsx`: thêm `import type { ProductsTab } from '../../app/routes'`; dòng 34 `export const ProductsScreen: React.FC<{ tab?: ProductsTab; onTabChange?: (tab: ProductsTab) => void }> = ({ tab, onTabChange } = {}) => {`; dòng 43 → `const [ownTab, setOwnTab] = useState<ProductsTab>('products'); const activeMainTab = tab ?? ownTab; const setActiveMainTab = (next: ProductsTab) => { setOwnTab(next); onTabChange?.(next); };` (giữ tên `setActiveMainTab` để các `onClick` dòng 733-796 không đổi).
    - `POS_UI/src/features/settings/SettingsScreen.tsx`: `import type { SettingsTab } from '../../app/routes'`; dòng 36 `export const SettingsScreen: React.FC<{ tab?: SettingsTab; onTabChange?: (tab: SettingsTab) => void }> = ({ tab, onTabChange } = {}) => {`; dòng 38 → `const [ownTab, setOwnTab] = useState<SettingsTab | undefined>(undefined); const current = tab ?? ownTab; const section = current === 'promotions' ? 'promotions' : 'organization'; const select = (next: SettingsTab) => { setOwnTab(next); onTabChange?.(next); }; const orgDefault = (Object.keys(permissions) as Tab[]).find(t => session.permissions.includes(permissions[t])) ?? 'tables';`; dòng 43 `onClick={() => { if (section !== 'organization') select(orgDefault); }}`; dòng 44 `onClick={() => select('promotions')}`; dòng 47 `<SettingsContent key={identity} session={session} tab={section === 'organization' ? current as Tab | undefined : undefined} onTabChange={select} />`.
    - `SettingsContent` (dòng 51-56): nhận `tab`, `onTabChange`; khởi tạo `view.tab = tab && allowed.includes(tab) ? tab : (allowed[0] ?? 'tables')`; thêm `useEffect(() => { if (tab && tab !== view.tab && allowed.includes(tab)) navigate({ tab, status: '', role: '', branch: '', cursors: [undefined] }); }, [tab]);` đặt SAU khai báo `navigate` (dòng 147-155); nút tab dòng 294 `onClick={() => { navigate({ tab, status: '', role: '', branch: '', cursors: [undefined] }); onTabChange?.(tab); }}`.
    - `POS_UI/test/shift-screen.test.mjs`: thêm test ST-7.AC-1, AC-2 dùng `mount('pos/LivePosScreen.tsx','LivePosScreen', { activeTab, onTabChange }, deps)` (helper có sẵn `:11`); không sửa test cũ.
    - `POS_UI/test/organization-screen.test.mjs`: thêm tham số tùy biến props cho `mount` (giá trị mặc định giữ đúng lời gọi cũ `exports.SettingsContent({ session })`) và test ST-7.AC-5, AC-6; không đổi assert cũ.
    - `POS_UI/test/products-tabs.test.mjs` (mới): harness `node:vm` theo mẫu `shift-screen.test.mjs:11-60`, mock `/AuthContext`, `/menuService` (mọi hàm `async () => []` hoặc `{ data: [], meta: { nextCursor: null } }` theo chữ ký `menuService` dùng trong `ProductsScreen.tsx`), `/ToastContext`, `/formatters`, `/Button`, `/IconButton`, `/Badge`, `/Dialog`, `/Field`, `/DataTable`, `./RecipeModal`, `lucide-react`.
  - Bảng edge case: `LivePosScreen` nhận `activeTab` đổi từ `'menu'` sang `'tables'` khi đang chọn đơn → không remount (cùng instance), đơn đang chọn giữ (`selected` không reset vì không có effect theo tab); `SettingsContent` đang `busy` mà `tab` prop đổi (Back) → `navigate` đổi view, `run` có kiểm `origin` (`SettingsScreen.tsx:169,182`) nên phản hồi cũ không ghi sai view.
  - Ảnh hưởng: `App.tsx:77-94,146-150` đang truyền `activeMode/onSwitchToPos/onSwitchToTables` → ST-7 sửa tối thiểu tại App để typecheck xanh: thay bằng `activeTab={currentTab === 'tables' ? 'tables' : 'menu'}` và `onTabChange={t => setCurrentTab(t === 'tables' ? 'tables' : 'pos')}` (ST-8 thay bằng router).
  - Tác dụng phụ: không có.
- Lỗi cũ liên quan: M-28 → mở test của màn trước khi đổi; giữ chữ nút ("Sơ đồ bàn", "Đơn đang mở", "Tổ chức", "Khuyến mãi"); `2026-10-30-pb13-active-tab-loading.md` → `navigate` của Settings chỉ đổi khi key đổi (giữ `SettingsScreen.tsx:148-150`).
- Test viết trước:
  - [x] `test_ST7_AC1_livepos_tab_dieu_khien` — như AC-1.
  - [x] `test_ST7_AC2_livepos_mo_ban_bao_menu` — như AC-2.
  - [x] `test_ST7_AC3_livepos_tu_quan` — như AC-3.
  - [x] `test_ST7_AC4_products_tab` — như AC-4.
  - [x] `test_ST7_AC5_settings_section` — như AC-5.
  - [x] `test_ST7_AC6_settings_content_tab_prop` — như AC-6.
  - [x] `test_ST7_AC7_test_cu_xanh` — lệnh `npm test` UI — expected: `# fail 0`.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-8: Router `react-router-dom` trong App
- depends_on: ST-5, ST-6, ST-7
- Interfaces:
  - Consumes: `ROUTES`, `LOGIN_PATH`, `pathFor(tab: NavTab, sub: SubTab | null, session: AuthSession): string`, `resolveRoute(pathname: string, session: AuthSession): AppRoute`, `canOpenProducts(permissions: readonly string[]): boolean`, các kiểu `InventoryTab`, `PosTab`, `ProductsTab`, `SettingsTab`, `SubTab` (ST-5); props `InventoryScreen({ tab, onTabChange })` (ST-6); `LivePosScreen({ activeTab, onTabChange, initialInvoiceId })`, `ProductsScreen({ tab, onTabChange })`, `SettingsScreen({ tab, onTabChange })` (ST-7); `PlatformAdminScreen({ activeTab, onTabChange })` có sẵn.
  - Produces: `export const App: React.FC` bọc `BrowserRouter`; `MainRouter`, `AuthenticatedRouter` dùng địa chỉ (ST-10 kiểm trên browser).
- Mục tiêu: L4 — F5, Back/Forward, mở link đúng màn; quyền kiểm theo phiên; đổi phiên không để lại màn người trước.
- AC riêng:
  - [x] ST-8.AC-1: Given OWNER, `useLocation` → `{ pathname: '/kho/so-kho', state: { owner: 'owner-1' } }`, When render `AuthenticatedRouter` và chạy effect, Then cây có `InventoryScreen` `props.tab === 'movements'`, `AppShell` `props.currentTab === 'inventory'`, `navigate` không được gọi (kiểm: unit harness).
  - [x] ST-8.AC-2: Given CASHIER (`id 'cashier-1'`), `{ pathname: '/kho/so-kho', state: null }`, When render, Then không có `InventoryScreen`, có `LivePosScreen` `activeTab 'menu'`, `navigate` gọi đúng 1 lần với `('/ban-hang/thuc-don', { replace: true, state: { owner: 'cashier-1' } })` (kiểm: unit).
  - [x] ST-8.AC-3: Given OWNER, `{ pathname: '/kho/so-kho', state: { owner: 'other-user' } }`, When render, Then render Cài đặt (`SettingsScreen` `tab 'branches'`), `navigate('/cai-dat/chi-nhanh', { replace: true, state: { owner: 'owner-1' } })` (kiểm: unit).
  - [x] ST-8.AC-4: Given OWNER `{ pathname: '/kho/so-kho', state: null }` → `navigate('/kho/so-kho', { replace: true, state: { owner: 'owner-1' } })` và render Inventory; `{ pathname: '/kho', state: { owner: 'owner-1' } }` → `navigate('/kho/ton-kho', { replace: true, ... })`, `InventoryScreen.tab === 'stocks'` (kiểm: unit).
  - [x] ST-8.AC-5: Given OWNER ở `/kho/so-kho`, When gọi `AppShell.props.onSelectTab('reports')` → `navigate('/bao-cao', { state: { owner: 'owner-1' } })`; `InventoryScreen.props.onTabChange('catalog')` → `('/kho/nguyen-lieu', {state})`; ở `/ban-hang/thuc-don` `LivePosScreen.props.onTabChange('tables')` → `('/so-do-ban', {state})`, `('orders')` → `('/ban-hang/don-dang-mo', {state})`; ở `/thuc-don/mon` `ProductsScreen.props.onTabChange('sizes')` → `('/thuc-don/kich-co', {state})`; ở `/cai-dat/chi-nhanh` `SettingsScreen.props.onTabChange('promotions')` → `('/cai-dat/khuyen-mai', {state})`; PLATFORM_ADMIN ở `/cua-hang` `PlatformAdminScreen.props.onTabChange('owners')` → `('/chu-quan', {state})`; `onSelectTab('inventory')` khi đang ở `/kho/so-kho`... → `('/kho/ton-kho', {state})`; `onSelectTab` tới đúng địa chỉ hiện tại (`'reports'` khi ở `/bao-cao`) → `navigate` không gọi (kiểm: unit).
  - [x] ST-8.AC-6: Given OWNER ở `/ca-lam`, When `ShiftsScreen.props.onNavigateToInvoice('inv-1')`, Then `navigate('/ban-hang/thuc-don', { state })`; render lại với pathname `/ban-hang/thuc-don` → `LivePosScreen.props.initialInvoiceId === 'inv-1'` (kiểm: unit).
  - [x] ST-8.AC-7: Given cùng phiên, When render ở `/ban-hang/thuc-don` rồi `/so-do-ban`, Then hai phần tử `LivePosScreen` có cùng `key` và cùng vị trí trong cây (không remount) (kiểm: unit).
  - [x] ST-8.AC-8: Given `useAuth` `{ loading: true }` → render `div[role=status]` "Đang kiểm tra phiên đăng nhập...", không có `Navigate`; `{ loading:false, isAuthenticated:false }` ở `/kho/so-kho` → phần tử `Navigate` `props.to === '/dang-nhap'`, `props.replace === true`; ở `/dang-nhap` → `LoginScreen`; `{ isAuthenticated:true }` → `AuthenticatedRouter` có `key === session.user.id` (kiểm: unit).
  - [x] ST-8.AC-9: `POS_UI/package.json` có `"react-router-dom": "7.18.5"` (không `^`/`~`), `package-lock.json` có `node_modules/react-router-dom` version `7.18.5`; `npm audit --audit-level=high` exit 0; chỉ `POS_UI/src/app/App.tsx` import `react-router-dom` (`grep -rln "react-router-dom" POS_UI/src` trả đúng 1 file) (kiểm: lệnh).
  - [x] ST-8.AC-10: Các test `[S9-06 banner]`, `test_ST3_AC1_service_shell_permissions`, `[B-59] App` trong `app-invoices-shell.test.mjs` chọn tab qua `useLocation` giả (`/hoa-don`, `/bao-cao`) thay cho `useState` giả và giữ nguyên mọi `assert`; xanh (kiểm: unit).
- Plan chi tiết:
  - File tạo/sửa:
    - `POS_UI/package.json`, `POS_UI/package-lock.json`: chạy `npm install react-router-dom@7.18.5 --save-exact` trong `POS_UI/` (dùng dấu nháy cho đường dẫn có `&`).
    - `POS_UI/src/app/App.tsx`:
      - Import: `import { BrowserRouter, Navigate, useLocation, useNavigate } from 'react-router-dom'; import { LOGIN_PATH, pathFor, resolveRoute } from './routes'; import type { SubTab, PosTab, InventoryTab, ProductsTab, SettingsTab } from './routes';` (bỏ `useState<NavTab>`, effect dòng 63-65).
      - `MainRouter` (dòng 34-46): thêm `const location = useLocation();`; sau nhánh `loading`: `if (!isAuthenticated) return location.pathname === LOGIN_PATH ? <LoginScreen /> : <Navigate to={LOGIN_PATH} replace />;`; cuối: `return <AuthenticatedRouter key={session.user.id} error={error} />;`.
      - `AuthenticatedRouter`: `const location = useLocation(); const navigate = useNavigate(); const owner = session.user.id; const stateOwner = (location.state as { owner?: string } | null)?.owner; const route = resolveRoute(stateOwner !== undefined && stateOwner !== owner ? '/' : location.pathname, session); useEffect(() => { if (route.path !== location.pathname || stateOwner !== owner) navigate(route.path, { replace: true, state: { owner } }); }, [route.path, location.pathname, stateOwner, owner]); const go = (tab: NavTab, sub: SubTab | null = null) => { const path = pathFor(tab, sub, session); if (path !== location.pathname) navigate(path, { state: { owner } }); }; const currentTab = route.tab;`.
      - `handleNavigateToInvoice`: `setTargetInvoiceId(invoiceId); go('pos', 'menu');`.
      - `renderContent`: `case 'pos'`/`case 'tables'`: `<LivePosScreen key={...như cũ} activeTab={route.sub as PosTab} initialInvoiceId={targetInvoiceId} onTabChange={t => go(t === 'tables' ? 'tables' : 'pos', t)} />`; `case 'inventory'`: `<InventoryScreen key={identityKey} tab={route.sub as InventoryTab} onTabChange={t => go('inventory', t)} />`; `case 'products'`: giữ guard `canOpenProducts(perms)` của ST-5 rồi `<ProductsScreen key={identityKey} tab={route.sub as ProductsTab} onTabChange={t => go('products', t)} />`; `case 'settings'`: `<SettingsScreen tab={route.sub as SettingsTab} onTabChange={t => go('settings', t)} />`; `platform_*`: `onTabChange={tab => go(tab === 'stores' ? 'platform_stores' : 'platform_owners')}`; `default` (dòng 144-151) bỏ (mọi `NavTab` đã có case).
      - Dòng 164: `<AppShell currentTab={currentTab} onSelectTab={tab => go(tab)}>`.
      - `App` (dòng 171-179): `<BrowserRouter><AuthProvider><ToastProvider><MainRouter /></ToastProvider></AuthProvider></BrowserRouter>`.
    - `POS_UI/test/app-invoices-shell.test.mjs`: trong 3 test dùng `AuthenticatedRouter`, `require` giả thêm `react-router-dom` → `{ useLocation: () => ({ pathname: '<path của tab>', state: { owner: session.user.id } }), useNavigate: () => () => {}, Navigate: 'Navigate', BrowserRouter: 'BrowserRouter' }` và `./routes` → `load('../src/app/routes.ts', n => n.endsWith('navigation.ts') ? <mock navigation của test> : {})`; xóa phần `useState` giả ép tab; giữ nguyên mọi `assert`.
    - `POS_UI/test/app-router.test.mjs` (mới): harness `load()` theo mẫu `app-invoices-shell.test.mjs:8`, React giả có `useState`, `useEffect` thu effect để chạy, `useRef`; `react-router-dom` giả ghi lại mọi lần `navigate(path, options)`; `navigation.ts` và `routes.ts` nạp thật; màn con là chuỗi tên (`'InventoryScreen'`, `'LivePosScreen'`...).
  - Bảng edge case:
    - Đăng xuất (`AuthContext.tsx:71` chỉ `setAuthenticated(false)`) → `MainRouter` render `Navigate` về `/dang-nhap` (thay thế mục hiện tại).
    - Đổi tài khoản qua BroadcastChannel `login` (`AuthContext.tsx:60`) → `session.user.id` đổi → `AuthenticatedRouter` remount (key), `state.owner` cũ khác → thay thế về tab đầu của người mới; `targetInvoiceId` mất.
    - `must_change_password` → `ForcePasswordModal` ở địa chỉ hiện tại (không đổi địa chỉ, không render màn nghiệp vụ).
    - Quyền đổi giữa phiên (`PERMISSION_DENIED` → `notifySessionChange('login')` → `me()`) → `resolveRoute` tính lại theo quyền mới, tab mất quyền → thay thế về tab đầu (thay effect cũ `App.tsx:63-65`).
    - Địa chỉ `/api/...` không bao giờ tới App vì Vite proxy (E2E-AC-9).
  - Ảnh hưởng: `AppShell` không đổi chữ ký; `PlatformAdminScreen`, `InvoicesScreen`, `ShiftsScreen`, `DailyReportScreen` không đổi; banner demo dòng 157 dùng `currentTab` mới.
  - Tác dụng phụ: lịch sử trình duyệt có mục cho mỗi lần đổi tab/tab con; `history.state` chứa `{ owner: <user id> }` (không nằm trong địa chỉ).
- Lỗi cũ liên quan: `2026-10-29-auth-revoked-session-ui.md`, `2026-11-05-toast-leak-between-sessions.md`, M-12, M-13 → khi đổi phiên không giữ màn/state người trước (key theo user, `state.owner`); `20261114-ui-report-tab-shown-without-access-all.md`, M-41 → quyền route chỉ từ `accessibleTabs`; M-28 → cập nhật harness bằng mock, không sửa yếu assert.
- Test viết trước:
  - [x] `test_ST8_AC1_owner_so_kho_khong_dieu_huong` — như AC-1.
  - [x] `test_ST8_AC2_cashier_link_kho_thay_the` — như AC-2.
  - [x] `test_ST8_AC3_state_owner_khac_thay_the_ve_tab_dau` — như AC-3.
  - [x] `test_ST8_AC4_dong_dau_va_dia_chi_goc` — như AC-4.
  - [x] `test_ST8_AC5_thao_tac_day_lich_su` — như AC-5.
  - [x] `test_ST8_AC6_mo_hoa_don_tu_ca` — như AC-6.
  - [x] `test_ST8_AC7_livepos_khong_remount` — như AC-7.
  - [x] `test_ST8_AC8_main_router_dang_nhap` — như AC-8.
  - [x] `test_ST8_AC9_dependency_ghim` — lệnh `node -e` đọc `package.json`/`package-lock.json` + `npm audit --audit-level=high` + grep — expected: như AC-9.
  - [x] `test_ST8_AC10_harness_cu_xanh` — 3 test cũ — expected: xanh, assert không đổi.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-9: Xóa file mock chết `StockMovementsTab.tsx`
- depends_on: -
- Interfaces:
  - Consumes: Không có.
  - Produces: Không có.
- Mục tiêu: V3.
- AC riêng:
  - [x] ST-9.AC-1: Given trước khi xóa, When `grep -rn "StockMovementsTab" "D:/saved/Project/POS-F&B/POS_UI/src" "D:/saved/Project/POS-F&B/POS_UI/test"`, Then chỉ có dòng trong chính `POS_UI/src/features/inventory/StockMovementsTab.tsx`; sau khi xóa: file không tồn tại, grep rỗng, `npm run typecheck` và `npm test` UI exit 0 (kiểm: lệnh).
- Plan chi tiết:
  - File tạo/sửa: xóa đúng một file `D:\saved\Project\POS-F&B\POS_UI\src\features\inventory\StockMovementsTab.tsx` (user yêu cầu "xóa file mock chết", spec `:34`, `:73`). Trước khi xóa chạy `git status --short -- "POS_UI/src/features/inventory/StockMovementsTab.tsx"`; nếu file có thay đổi chưa commit thì dừng và báo agent chính (quy tắc "Bảo vệ source code" trong `CLAUDE.md`).
  - Các bước xử lý: 1. grep xác nhận. 2. git status file. 3. xóa file. 4. grep lại. 5. typecheck + test.
  - Bảng edge case: grep thấy import ở nơi khác → không xóa, báo agent chính.
  - Ảnh hưởng: không có caller.
  - Tác dụng phụ: không có.
- Lỗi cũ liên quan: `20261114-ui-load-more-button-not-disabled-while-pending.md` → "xóa code chết khi bỏ caller cuối cùng".
- Test viết trước:
  - [x] `test_ST9_AC1_xoa_file_mock` — input: lệnh grep/test — expected: như AC.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-10: Browser test Sổ kho + router ở 1024×768
- depends_on: ST-1, ST-2, ST-3, ST-4, ST-5, ST-6, ST-7, ST-8, ST-9
- Interfaces:
  - Consumes: `App` (ST-8), JSON `branchName`/`invoiceCode` (ST-1, ST-2) qua `fetch` giả.
  - Produces: Không có.
- Mục tiêu: chứng minh trên Chrome thật F5, Back, đổi phiên, chạm ≥ 48px, không cuộn ngang, câu lỗi đọc.
- AC riêng:
  - [x] ST-10.AC-1: Given OWNER, When `page.goto('http://127.0.0.1:<port>/kho/so-kho')`, Then `.rail-btn[aria-current="page"]` text "Kho hàng", `button.tab[aria-current="true"]` text "Sổ kho", header bảng có "Chi nhánh", ô Ghi chú dòng SALE "HDS10A0001", Thay đổi dòng SALE_REVERSAL "+10.000 ml"; danh sách request có `/api/v1/stock-movements` và không có `/api/v1/ingredient-stocks`, `/api/v1/ingredients`; When `page.reload()`, Then `location.pathname === '/kho/so-kho'` và "Sổ kho" vẫn active (kiểm: browser).
  - [x] ST-10.AC-2: Given OWNER ở `/kho/so-kho`, When bấm "Tồn kho", Then pathname `/kho/ton-kho`; When `page.goBack()`, Then `/kho/so-kho` và "Sổ kho" active (kiểm: browser).
  - [x] ST-10.AC-3: Given viewport 1024×768, 40 dòng Sổ kho với tên chi nhánh "Chi nhánh Trung tâm Thành phố Đồng Hới" và tên nguyên liệu 60 ký tự, When đo, Then `document.documentElement.scrollWidth <= innerWidth`; chiều cao bounding box của 3 nút tab, `select[aria-label="Chi nhánh kho"]`, nút "Tải lại" ≥ 48; When `stock-movements` trả 500 `{"error":{"code":"INTERNAL_ERROR","message":"Lỗi máy chủ test"}}`, Then nút "Thử lại" ≥ 48 (CSS bundle thật `src/index.css`) (kiểm: browser).
  - [x] ST-10.AC-4: Given `stock-movements` ném `TypeError('Failed to fetch')`, When mở `/kho/so-kho`, Then alert text "Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại." (kiểm: browser).
  - [x] ST-10.AC-5: Given OWNER ở `/kho/so-kho`, When bấm "Đăng xuất", Then pathname `/dang-nhap`; đăng nhập `cashier` → pathname `/ban-hang/thuc-don`; `page.goBack()` → pathname `/ban-hang/thuc-don`, `document.body.innerText` không chứa "HDS10A0001" và "Chi nhánh Nam" (kiểm: browser).
  - [x] ST-10.AC-6: Given MANAGER (`me` trả `branchName:'Chi nhánh Bắc'`), When mở `/kho/so-kho`, Then `header` chứa "Chi nhánh Bắc", không chứa "Tất cả chi nhánh"; bảng không có header "Chi nhánh"; không có `select[aria-label="Chi nhánh kho"]` (kiểm: browser).
  - [x] ST-10.AC-7: Given OWNER, When mở `/kho/abc`, Then pathname `/cai-dat/chi-nhanh`; mở `/thuc-don/kich-co` rồi reload → pathname giữ `/thuc-don/kich-co`; mở `/cai-dat/khuyen-mai` rồi reload → giữ (kiểm: browser).
- Plan chi tiết:
  - File tạo/sửa: `POS_UI/test/stock-ledger-router.browser.mjs` (mới; chạy riêng, không thuộc `npm test` vì đuôi `.browser.mjs`).
  - Các bước xử lý:
    1. `before`: tìm Chrome như `reports-accessibility.browser.mjs:17-21`; bundle CSS thật `src/index.css` bằng `esbuild` (lỗi `20261114-css-cascade-input-min-height-44-beats-48`); bundle JS `stdin` `import App from './src/app/App'; createRoot(document.getElementById('root')).render(React.createElement(App));` (KHÔNG mock AuthContext, client, router).
    2. Mở `http.createServer` cổng 0 trên `127.0.0.1`: mọi GET trả HTML `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div id="root"></div><script>${bundle}</script></body></html>`.
    3. `page.evaluateOnNewDocument` cài `window.fetch` giả đọc `localStorage.__qaUser` (`owner|manager|cashier|''`) và `localStorage.__qaFail` (`''|'500'|'network'`): `GET /api/v1/auth/me` → 200 user tương ứng hoặc 401 `UNAUTHENTICATED`; `GET /api/v1/auth/csrf` → 200 `{data:{}}`; `POST /api/v1/auth/refresh` → 401; `POST /api/v1/auth/login` → đặt `__qaUser` theo `username` và trả 200 `{data:{expiresIn:1800,user}}`; `POST /api/v1/auth/logout` → xóa `__qaUser`, 204; `GET /api/v1/stock-movements` → theo `__qaFail` hoặc trang dữ liệu (ghi nhận path vào `localStorage.__qaCalls`); `GET /api/v1/branches` → `[{id:'b2',name:'Chi nhánh Nam'},{id:'b1',name:'Chi nhánh Bắc'}]`; `GET /api/v1/work-shifts/current` → `{data:null}`; path `/api/v1/*` khác → 200 `{data:[],meta:{limit:100,nextCursor:null,total:0}}`.
    4. User giả: owner `{id:'owner-1',username:'owner',fullName:'Chủ A',role:'OWNER',storeId:'s',branchId:null,branchName:null,permissions:<OWNER>,mustChangePassword:false}`; manager `branchId:'b1',branchName:'Chi nhánh Bắc'`, quyền MANAGER; cashier `branchId:'b1',branchName:'Chi nhánh Bắc'`, quyền CASHIER (danh sách quyền theo mục Khám phá).
    5. Ảnh chụp lưu `process.env.STOCK_LEDGER_EVIDENCE_DIR` hoặc `.devloopflow/verify/20261115-sprint10-stock-ledger/evidence/browser/`.
  - Bảng edge case: Chrome không có → test fail với "Set CHROME_BIN to run browser regression tests" (mẫu `reports-accessibility.browser.mjs:21`).
  - Ảnh hưởng: không đổi mã sản phẩm.
  - Tác dụng phụ: ghi ảnh vào thư mục evidence bị Git bỏ qua.
- Lỗi cũ liên quan: `20261114-css-cascade-input-min-height-44-beats-48.md` → bundle `src/index.css` thật; M-39 → đo chạm trên browser thật.
- Test viết trước:
  - [x] `BR-1 owner so kho reload giu man` — như AC-1.
  - [x] `BR-2 doi tab con va back` — như AC-2.
  - [x] `BR-3 cham 48 va khong cuon ngang` — như AC-3.
  - [x] `BR-4 mat mang cau doc` — như AC-4.
  - [x] `BR-5 back sau doi phien` — như AC-5.
  - [x] `BR-6 manager tieu de va khong cot chi nhanh` — như AC-6.
  - [x] `BR-7 dia chi la va reload tab con` — như AC-7.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

## Ma trận AC ↔ test
| AC | Test | Input | Expected |
|----|------|-------|----------|
| ST-1.AC-1 | `ST1-AC1 thu tu total va 13 khoa` (`stock-movements.http.test.ts`) | OWNER A GET | thứ tự oracle, total 5, branchName, 13 khóa |
| ST-1.AC-2 | `ST1-AC2 invoiceCode cua SALE va SALE_REVERSAL` | OWNER A GET | m3/m4 `HDS10A0001`, m1 null |
| ST-1.AC-3 | `ST1-AC3 phan trang cursor khong doi` | `limit=2` 3 trang | id theo oracle, cursor decode đúng |
| ST-1.AC-4 | `ST1-AC4 manager chi chi nhanh minh va 422 khi gui branchId` | MANAGER GET, `?branchId=A1` | 3 dòng; 422 |
| ST-1.AC-5 | `ST1-AC5 quyen va cross-store` | CASHIER/admin/không cookie/`branchId=B1`/OWNER B | 403/403/401/404/chỉ m6 |
| ST-1.AC-6 | `ST1-AC6 invoice khac chi nhanh tra invoiceCode null` | OWNER A GET | m5 null, không "HDS10B0001" |
| ST-1.AC-7 | `ST1-AC7 loc branchId type` | 3 truy vấn lọc | `[m4,m3,m1]`, `[m4]`, `[m2]` |
| ST-2.AC-1 | `ST2-AC1 login manager co branchName va 9 khoa` | login MANAGER | "Chi nhánh Bắc", 9 khóa |
| ST-2.AC-2 | `ST2-AC2 me va refresh tra branchName` | me/refresh | "Chi nhánh Bắc" |
| ST-2.AC-3 | `ST2-AC3 owner va admin branchName null` | OWNER, admin | null |
| ST-2.AC-4 | `ST2-AC4 doi ten chi nhanh me tra ten moi` | UPDATE tên + me | tên mới |
| ST-2.AC-5 | `ST2-AC5 api nghiep vu khong doi` | `GET /ingredient-stocks` | 200 |
| ST-3.AC-1 | `test_ST3_AC1_toUiSession_branch_name` | 3 AuthUser | tên / undefined / undefined |
| ST-3.AC-2 | `test_ST3_AC2_manager_title_ten_chi_nhanh` | MANAGER có tên | "Chi nhánh Bắc", không "Tất cả chi nhánh" |
| ST-3.AC-3 | `test_ST3_AC3_manager_thieu_ten_hien_Chi_nhanh` | MANAGER không tên | "Chi nhánh" |
| ST-3.AC-4 | `test_ST3_AC4_owner_tat_ca_chi_nhanh` | OWNER | "Tất cả chi nhánh" |
| ST-3.AC-5 | `test_ST3_AC5_cashier_title` | CASHIER ở shifts | "Chi nhánh Bắc" |
| ST-4.AC-1 | `test_ST4_AC1_get_mat_mang_cau_doc` | GET, fetch ném | câu đọc, 1 lần fetch |
| ST-4.AC-2 | `test_ST4_AC2_ghi_mat_mang_giu_cau_cu` | POST/PATCH/PUT/DELETE | câu cũ |
| ST-4.AC-3 | `npm test` UI | toàn bộ | `# fail 0` |
| ST-5.AC-1 | `test_ST5_AC1_bang_19_dia_chi` | `ROUTES` | 19 dòng |
| ST-5.AC-2 | `test_ST5_AC2_ma_tran_route_vai_tro` | 76 tổ hợp | bảng ma trận |
| ST-5.AC-3 | `test_ST5_AC3_dia_chi_goc_va_mac_dinh` | địa chỉ gốc | tab con mặc định |
| ST-5.AC-4 | `test_ST5_AC4_chuan_hoa_va_dia_chi_la` | `/kho/so-kho/`, `/Kho/So-Kho`, `/kho/abc`, `/api/v1/health` | chuẩn hóa / tab đầu |
| ST-5.AC-5 | `test_ST5_AC5_pathFor` | 6 cặp | path đúng |
| ST-5.AC-6 | `test_ST5_AC6_khong_tab_khong_vong_lap` | admin không quyền | `/cai-dat/chi-nhanh` ổn định |
| ST-5.AC-7 | `test_ST5_AC7_canOpenProducts_va_accessibleTabs` | 4 bộ quyền; CASHIER/MANAGER/OWNER chuẩn | false/true/true/false; CASHIER không `products`, vẫn `pos` đầu |
| ST-5.AC-8 | `test_ST5_AC8_rail_va_app_dung_canOpenProducts` | AppShell CASHIER/MANAGER; App CASHIER tab `products` | không/có "Thực đơn"; AccessDenied |
| ST-6.AC-1 | `test_ST6_AC1_mo_man_chi_tai_ton_kho` | mount OWNER | chỉ `stocks` |
| ST-6.AC-2 | `test_ST6_AC2_chuyen_so_kho_tai_movements` | bấm Sổ kho | `movements` 1 lần |
| ST-6.AC-3 | `test_ST6_AC3_cot_chi_nhanh_owner_tat_ca` | OWNER Tất cả rồi b1 | có/không cột |
| ST-6.AC-4 | `test_ST6_AC4_manager_khong_cot_khong_o_chon` | MANAGER | không cột, không select |
| ST-6.AC-5 | `test_ST6_AC5_ghi_chu_ma_hoa_don` | 4 dòng | mã / note / note / — |
| ST-6.AC-6 | `test_ST6_AC6_dau_cong_so_duong` | 3 số | `+100.000 ml`, `-10.000 ml`, `+0.500 g` |
| ST-6.AC-7 | `test_ST6_AC7_loi_tab_doc_lap_va_thu_lai` | movements reject | alert, Thử lại style, Tồn kho còn 2 dòng |
| ST-6.AC-8 | `test_ST6_AC8_o_chon_theo_ten` | 7 chi nhánh (có "Chi nhánh 2", "Chi nhánh 10", "Chi nhánh Dương", "Chi nhánh Đông") | An Phú, Chi nhánh 10, Chi nhánh 2, Chi nhánh Bắc, Chi nhánh Dương, Chi nhánh Đông, Chi nhánh Nam |
| ST-6.AC-9 | `test_ST6_AC9_loi_chi_nhanh_khong_xoa_bang` | branches reject | alert + bảng |
| ST-6.AC-10 | `test_ST6_AC10_response_cu_khong_ghi_de` | 2 request, resolve đảo | chỉ dữ liệu mới |
| ST-6.AC-11 | `test_ST6_AC11_tab_dieu_khien_tu_props` | `tab` prop | `onTabChange('catalog')`, `ingredients()` |
| ST-6.AC-12 | `test_ST6_AC12_tai_lai_chi_tab_dang_mo` | Tải lại | chỉ `movements` |
| ST-6.AC-13 | `test_ST6_AC13_rong` | `[]` | "Chưa có bút toán kho" |
| ST-7.AC-1 | `test_ST7_AC1_livepos_tab_dieu_khien` | `activeTab:'orders'` | aria-current, `onTabChange('tables')` |
| ST-7.AC-2 | `test_ST7_AC2_livepos_mo_ban_bao_menu` | bấm bàn có đơn | `onTabChange('menu')` |
| ST-7.AC-3 | `test_ST7_AC3_livepos_tu_quan` | `({})` | tự đổi tab |
| ST-7.AC-4 | `test_ST7_AC4_products_tab` | `tab:'sizes'` | fontWeight, `onTabChange('categories')` |
| ST-7.AC-5 | `test_ST7_AC5_settings_section` | `tab:'promotions'` | PromotionsPanel, `'branches'`/`'tables'` |
| ST-7.AC-6 | `test_ST7_AC6_settings_content_tab_prop` | `tab:'staff'` | `getStaff`, `onTabChange('tables')`, reset lọc |
| ST-7.AC-7 | `test_ST7_AC7_test_cu_xanh` | `npm test` | `# fail 0` |
| ST-8.AC-1 | `test_ST8_AC1_owner_so_kho_khong_dieu_huong` | OWNER `/kho/so-kho` | Inventory movements, không navigate |
| ST-8.AC-2 | `test_ST8_AC2_cashier_link_kho_thay_the` | CASHIER `/kho/so-kho` | `/ban-hang/thuc-don` replace |
| ST-8.AC-3 | `test_ST8_AC3_state_owner_khac_thay_the_ve_tab_dau` | owner khác | `/cai-dat/chi-nhanh` replace |
| ST-8.AC-4 | `test_ST8_AC4_dong_dau_va_dia_chi_goc` | state null, `/kho` | stamp, `/kho/ton-kho` |
| ST-8.AC-5 | `test_ST8_AC5_thao_tac_day_lich_su` | các callback | path push đúng; cùng path không gọi |
| ST-8.AC-6 | `test_ST8_AC6_mo_hoa_don_tu_ca` | `onNavigateToInvoice('inv-1')` | `/ban-hang/thuc-don`, `initialInvoiceId` |
| ST-8.AC-7 | `test_ST8_AC7_livepos_khong_remount` | `/ban-hang/thuc-don` → `/so-do-ban` | cùng key/vị trí |
| ST-8.AC-8 | `test_ST8_AC8_main_router_dang_nhap` | loading / chưa đăng nhập / đăng nhập | status / Navigate / Login / key |
| ST-8.AC-9 | `test_ST8_AC9_dependency_ghim` | package files, audit, grep | `7.18.5`, exit 0, 1 file |
| ST-8.AC-10 | `test_ST8_AC10_harness_cu_xanh` | 3 test cũ | xanh |
| ST-9.AC-1 | `test_ST9_AC1_xoa_file_mock` | grep, xóa, test | file mất, grep rỗng, exit 0 |
| ST-10.AC-1 | `BR-1 owner so kho reload giu man` | goto + reload | giữ màn, chỉ movements |
| ST-10.AC-2 | `BR-2 doi tab con va back` | Tồn kho rồi Back | `/kho/so-kho` |
| ST-10.AC-3 | `BR-3 cham 48 va khong cuon ngang` | 40 dòng, 500 | ≥48, không cuộn |
| ST-10.AC-4 | `BR-4 mat mang cau doc` | fetch ném | câu đọc |
| ST-10.AC-5 | `BR-5 back sau doi phien` | logout, cashier, Back | `/ban-hang/thuc-don`, không dữ liệu A |
| ST-10.AC-6 | `BR-6 manager tieu de va khong cot chi nhanh` | MANAGER | tên chi nhánh, không cột |
| ST-10.AC-7 | `BR-7 dia chi la va reload tab con` | `/kho/abc`, reload | chuyển/giữ |
| E2E-AC-1 | `ac-verifier` browser + SQL | OWNER A, ZA1, MANAGER | như E2E-AC-1 |
| E2E-AC-2 | `ac-verifier` browser + SQL | hóa đơn `1e4f82d6...` | mã HD, dấu +/- |
| E2E-AC-3 | `ac-verifier` browser | F5, logout, cashier, Back | như E2E-AC-3 |
| E2E-AC-4 | `ac-verifier` browser | ZA3 | "Chưa có bút toán kho" |
| E2E-AC-5 | `ac-verifier` browser | abort, 500, POST mất mạng | câu đọc, Thử lại ≥48, câu ghi cũ |
| E2E-AC-6 | `ac-verifier` browser + curl | MANAGER, OWNER | tiêu đề, `branchName` |
| E2E-AC-7 | `ac-verifier` network | mở Kho, đổi tab, Tải lại | request theo tab |
| E2E-AC-8 | `ac-verifier` browser | 17 địa chỉ, admin, manager, cashier `/thuc-don/*` | F5 giữ, redirect; cashier → `/ban-hang/thuc-don`, thực đơn bán hàng vẫn tải |
| E2E-AC-9 | `ac-verifier` curl | `/api/v1/health`, `/kho/so-kho` qua 5173 | JSON; 200 text/html |
| E2E-AC-10 | `ac-verifier` browser | 1024×768 toàn bộ dòng | không cuộn ngang, ≥48 |
| E2E-AC-11 | `ac-verifier` browser | ô chọn sau khi thêm ZA10, ZĐ1 | Tất cả, ZA1, ZA10, ZA2, ZA3, ZĐ1 |
| E2E-AC-12 | `ac-verifier` curl | 6 vai trò/tình huống + phân trang | như E2E-AC-12 |
| E2E-AC-13 | `ac-verifier` lệnh | ls + grep | không file, grep rỗng |
| E2E-AC-14 | `ac-verifier` lệnh | test/build/audit | exit 0, fail 0 |

- Ánh xạ mục tiêu spec ↔ AC (spec `.devloopflow/specs/20261115-sprint10-stock-ledger.md:25-34`):
  | Mục tiêu spec | AC |
  |---|---|
  | `:25` API thêm tên chi nhánh và mã hóa đơn | ST-1.AC-1..AC-7, E2E-AC-12 |
  | `:26` cột Chi nhánh đúng điều kiện + mã hóa đơn ở Ghi chú | ST-6.AC-3, AC-4, AC-5, ST-10.AC-1, AC-6, E2E-AC-1, E2E-AC-2 |
  | `:27` Thử lại ≥ 48px | ST-6.AC-7, ST-10.AC-3, E2E-AC-5 |
  | `:28` câu lỗi đọc, câu ghi giữ nguyên | ST-4.AC-1..AC-3, ST-10.AC-4, E2E-AC-5 |
  | `:29` tiêu đề tên chi nhánh | ST-2.AC-1..AC-5, ST-3.AC-1..AC-5, ST-10.AC-6, E2E-AC-6 |
  | `:30` router mọi tab, F5/Back/link, đổi phiên, quyền | ST-5.AC-1..AC-8, ST-7.AC-1..AC-7, ST-8.AC-1..AC-10, ST-10.AC-1, AC-2, AC-5, AC-7, E2E-AC-3, E2E-AC-8, E2E-AC-9 |
  | `:31` tải theo tab, Tải lại/đổi chi nhánh tải tab đang mở | ST-6.AC-1, AC-2, AC-3, AC-10, AC-12, ST-10.AC-1, E2E-AC-7 |
  | `:32` dấu "+" | ST-6.AC-6, ST-10.AC-1, E2E-AC-2 |
  | `:33` ô chọn theo tên | ST-6.AC-8, E2E-AC-11 |
  | `:34` xóa `StockMovementsTab.tsx` | ST-9.AC-1, E2E-AC-13 |
  | S10-11 vế 1..5 (`SPRINT.md:42`) | E2E-AC-1, E2E-AC-2, E2E-AC-3, E2E-AC-4, E2E-AC-5 |

## Rủi ro
- Router đổi `App.tsx` dùng chung mọi màn (điều hướng, đăng nhập, đổi phiên) → hồi quy diện rộng — cách giảm: chỉ `App.tsx` import router; giữ `switch` và `key` hiện có; ma trận 76 tổ hợp (ST-5.AC-2), test App (ST-8), browser (ST-10), E2E-AC-8 trên app thật; chạy toàn bộ `npm test` UI sau mỗi sub-task UI.
- Lệch điều kiện quyền giữa nav `AppShell.tsx:109-123` và `accessibleTabs` (M-41): rail có thể ẩn mục mà link vẫn vào được — cách giảm: tab Thực đơn dùng một hàm `canOpenProducts` cho route, rail và App (ST-5, user Q2), test ST-5.AC-7/AC-8 dùng `navigation.ts` thật; các tab khác: quyền route chỉ một nguồn `accessibleTabs`; server vẫn kiểm quyền từng API.
- Đổi `accessibleTabs` (thay đổi hành vi do user quyết, Q2) có thể ảnh hưởng caller khác — cách giảm: đã rà caller `App.tsx:19,50,120`, `AppShell.tsx:9,122` và test (`app-invoices-shell.test.mjs`, `organization-screen.test.mjs`, `reports-screen.test.mjs`, `icon-actions.browser.mjs`): không test nào đổi expected; chỉ thêm `canOpenProducts` vào mock `navigation`; người chỉ có `menu.read` mất quyền vào màn quản lý Thực đơn trên UI nhưng vẫn bán hàng (E2E-AC-8).
- `history.state.owner` không có khi người dùng mở link mới → đóng dấu bằng `replace` (ST-8.AC-4); mục lịch sử cũ trước khi có router (không có `state`) coi như link mới — cách giảm: tài liệu hóa trong plan; Back tới mục đó chỉ hiện màn được phép của người hiện tại.
- Thêm dependency mới (`react-router-dom` + `react-router`, `cookie`, `set-cookie-parser` của v7) → CI `npm audit --audit-level=high` có thể đỏ — cách giảm: ST-8.AC-9 chạy audit local; nếu đỏ thì dừng và báo user (không tự đổi phiên bản).
- Docker image UI cài dependency lúc build (`POS_UI/Dockerfile` `npm ci`) → app local cũ không có router — cách giảm: E2E chạy `up -d --build --wait`.
- Thêm truy vấn tên chi nhánh ở `login/me/refresh` → `me()` chạy mỗi lần focus (`AuthContext.tsx:62`) — cách giảm: một truy vấn theo khóa chính; không thêm vào `authorizeAccess`.
- Harness `node:vm` của `app-invoices-shell.test.mjs` phải đổi cách chọn tab → nguy cơ sửa yếu test — cách giảm: giữ nguyên mọi `assert`, chỉ đổi mock chọn tab (ST-8.AC-10), reviewer đối chiếu diff test.
- Working tree đang có thay đổi chưa commit của task Báo cáo (`git status` đầu phiên: `App.tsx`, `navigation.ts`, `AppShell.tsx`, `http/client.ts`, `app-invoices-shell.test.mjs`...) — cách giảm: không ghi đè, sửa chồng lên nội dung hiện tại, đọc file trước khi sửa (quy tắc "Bảo vệ source code").

## Lệnh kiểm tra
- Lint: Không có lệnh lint (không có script lint trong `POS_API/package.json`, `POS_UI/package.json`; `.devloopflow/devloopflow.md:26`).
- Typecheck: `cd "D:/saved/Project/POS-F&B/POS_UI"; npm run typecheck` (API kiểm kiểu qua `npm run build`).
- Test:
  - API toàn bộ: `cd "D:/saved/Project/POS-F&B/POS_API"; npm test` (cần PostgreSQL theo `DATABASE_URL` trong `POS_API/.env`; nếu không kết nối được dùng PostgreSQL Docker `127.0.0.1:15432` theo M-34, dựng URL trong lệnh, không in bí mật).
  - API một file: `cd "D:/saved/Project/POS-F&B/POS_API"; npm run build; node --env-file-if-exists=.env --test --test-concurrency=1 dist/inventory/tests/stock-movements.http.test.js` và `dist/auth/tests/session-branch-name.http.test.js` (M-32: pattern theo tên test cha).
  - UI toàn bộ: `cd "D:/saved/Project/POS-F&B/POS_UI"; npm test`.
  - UI một file: `cd "D:/saved/Project/POS-F&B/POS_UI"; node --experimental-strip-types --test test/inventory-screen.test.mjs` (đổi tên file theo test).
  - Browser: `cd "D:/saved/Project/POS-F&B/POS_UI"; node --test test/stock-ledger-router.browser.mjs` (cần Chrome; `CHROME_BIN` khi không ở đường dẫn mặc định).
  - Audit: `cd "D:/saved/Project/POS-F&B/POS_UI"; npm audit --audit-level=high`.
- Build: `cd "D:/saved/Project/POS-F&B/POS_API"; npm run build`; `cd "D:/saved/Project/POS-F&B/POS_UI"; npm run build`.
- Coverage: Không có lệnh coverage (`.devloopflow/devloopflow.md:29`).
- Chạy app: từ gốc repo `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait` (mật khẩu DB lệch `.env.local`: xem task file mục "Quyết định của user và môi trường"; không ghi bí mật) — URL: UI `http://localhost:5173`, API health `http://localhost:3000/api/v1/health`.
- Graph: sau khi sửa code chạy `graphify update .` từ gốc repo (`CLAUDE.md` mục Graphify).

## Tài liệu cần cập nhật (bước sync-docs, user duyệt từng chỗ; trước khi commit cùng thay đổi)
- `.devloopflow/specs/inventory.md:7` (câu "Không có ... SALE/SALE_REVERSAL ..."), `:19` ("Sổ kho chỉ đọc trong Sprint 07 ... không có API tạo movement"), `:25` (thêm `branchName`, `invoiceCode` vào `MovementDto`), `:60` ("không có POST/PATCH/DELETE movement trong Sprint 07", "mảng rỗng trước PB-09"), thêm câu MANAGER gửi `branchId` (kể cả chi nhánh của mình) → 422 (`inventory.service.ts:30-31`).
- `.devloopflow/specs/auth.md:32-34` (khai báo UserSummary), `:58` (`GET /me`), `:84` (ví dụ login), `:92` ("chỉ gồm" → thêm `branchName` cho phản hồi phiên); `docs/architecture/auth.md:31,36`.
- `docs/architecture/TECH_STACK.md` mục Frontend (`:20-25`): thêm dòng `react-router-dom` 7.18.5 (router địa chỉ sạch cho tab chính và tab con); sửa `:22` "Kho còn mô phỏng tab lịch sử biến động" (bắt buộc cùng thay đổi theo `CLAUDE.md` mục "Cách làm việc").
- `CLAUDE.md:29` và `AGENTS.md:29` ("không dùng router riêng" → router `react-router-dom` trong `App.tsx`, `app/routes.ts`); câu "Còn mô phỏng (`src/mock/`): màn Báo cáo và tab lịch sử biến động của Kho" ở mục "Cấu trúc mã" của cả hai file.
- `sprints/sprint-10/SPRINT.md:27` (item 4 trạng thái) và `:42` (S10-11) sau khi kiểm AC.
- `README.md`: rà mục điều hướng/màn mock (grep "router|điều hướng|F5" không thấy kết quả lúc lập plan; rà lại ở bước sync-docs).
- `docs/api-spec.md`: không áp dụng cho `MovementDto` (`docs/api-spec.md:490` trỏ sang spec kho, spec `:89`).
- `.devloopflow/devloopflow.md` mục 2: thêm lệnh browser `node --test test/stock-ledger-router.browser.mjs`.

## Câu hỏi mở
- Không có (Q1, Q2 đã được user trả lời 2026-11-15, xem mục "Quyết định").

## Changelog plan
- 2026-11-15: tạo plan nháp từ spec đã duyệt `.devloopflow/specs/20261115-sprint10-stock-ledger.md`, báo cáo hiện trạng và khám phá mã (planner).
- 2026-11-15: cập nhật theo câu trả lời user — Q1 "Xếp theo chữ thuần": G-3 xác nhận, sắp `localeCompare(b.name, 'vi')` không `numeric`, đổi input/expected ST-6.AC-8 và E2E-AC-11 (tên có số và có dấu); Q2 "Chặn, chuyển về Bán hàng": G-4 xác nhận, thêm `canOpenProducts` (một nguồn quyền cho `accessibleTabs`, rail, App) vào ST-5 cùng ST-5.AC-7, AC-8, cập nhật ma trận (CASHIER `/thuc-don/*` → `/ban-hang/thuc-don`), E2E-AC-8, Khám phá, Quyết định, Thiết kế, Phạm vi, Rủi ro, ST-3 (mock navigation), ST-8 (Consumes, guard); xóa Q1, Q2 khỏi Câu hỏi mở.

- 2026-11-15: user duyệt plan ("duyệt plan"); status approved.

## Kiểm tra sẵn sàng
- [x] Không còn từ mơ hồ, TBD, TODO, "v.v.", "CHƯA CÓ NGUỒN"
- [x] Mọi fact/quy tắc/field/endpoint có path nguồn hoặc nằm trong "Quyết định" của user; không có thông tin tự suy đoán
- [x] Không có mục nào bị bỏ, rút gọn hoặc tóm tắt so với template
- [x] Interfaces: mọi Consumes của một sub-task khớp đúng tên, tham số, kiểu trả về với Produces của sub-task nó phụ thuộc
- [x] Review Focus: mỗi dòng có test trong ma trận AC ↔ test (hoặc ghi "Đã kiểm, không có")
- [x] Mục "Câu hỏi mở" rỗng, mục "Giả định" đã được xác nhận
- [x] Mỗi sub-task có: AC riêng đo được, plan chi tiết riêng, danh sách test có input/expected
- [x] Mọi AC có ít nhất 1 test trong ma trận AC ↔ test; mọi test thuộc 1 AC
- [x] Đủ AC cho happy path, input sai/thiếu, quyền, biên, lỗi hệ thống
- [x] Mọi AC (E2E-AC-n và ST-n.AC-k) nằm trên một dòng riêng, bắt đầu bằng `- [ ]` (chưa làm thì để trống, không tick trước)
- [x] File tạo/sửa liệt kê đủ (gồm test, migration, config, docs cần cập nhật)
- [x] Đã đối chiếu .devloopflow/errors/ và ghi "Lỗi cũ cần tránh" (hoặc ghi rõ không có)
- [x] Lệnh lint/typecheck/test/build/coverage/chạy app là lệnh thật của dự án
- [x] Một agent khác đọc plan này có làm được mà không cần hỏi lại
