---
id: 20261114-sprint10-reports
title: Sprint 10 — Báo cáo doanh thu dùng API thật
status: completed
created_at: 2026-11-14
approved_at: 2026-11-14
completed_at: 2026-11-14
evidence: .devloopflow/verify/20261114-sprint10-reports/report-5.md
spec: .devloopflow/specs/20261114-sprint10-reports.md
---

> Plan thực thi spec đã duyệt ngày 14/11/2026. Các checkbox AC chưa được kiểm, không phải kết quả nghiệm thu.

# Sprint 10 — Báo cáo doanh thu dùng API thật

## Mục tiêu và bối cảnh
- Task nguyên văn: `$devloopflow:run sprints\sprint-10\SPRINT.md`.
- Vì sao làm: triển khai PB-12 và lát cắt PB-13 Báo cáo theo item 1–3, S10-01..06 trong `sprints/sprint-10/SPRINT.md:23-34,40-49`; thay nguồn mô phỏng bằng hóa đơn/thanh toán thật.
- Ai dùng: người có `report.view_shift`, `report.view_branch`, `report.view_all`, trong phạm vi permission và danh tính được mô tả tại `.devloopflow/specs/20261114-sprint10-reports.md`, mục Mục tiêu, Ràng buộc và Quyết định của agent.
- Điều kiện dừng: API và UI báo cáo đạt các AC dưới đây, review-code và verify-ac của task có bằng chứng; không coi task này là hoàn tất Sprint 10, PB-15 hoặc Sổ kho.

## Khám phá
- `Doanh thu chỉ tính hóa đơn PAID, không tính OPEN hoặc CANCELLED.` Quy tắc trạng thái nguyên văn gồm backtick ở `docs/BUSINESS_RULES.md:198` (BR-62). BR-63: `Doanh thu theo ngày gom theo paid_at` ở múi giờ Việt Nam, nguồn `docs/BUSINESS_RULES.md:199`; bản định nghĩa đầy đủ giữ tại nguồn. Plan dùng `invoices.paid_at`, không dùng `created_at` hay `payments.paid_at`.
- `Tổng doanh thu = tiền mặt + chuyển khoản.` — `docs/BUSINESS_RULES.md:200`; ca/chi nhánh/store theo BR-65/77 — `docs/BUSINESS_RULES.md:201-203`.
- Hủy `PAID` giữ các khoản `payments`, đổi hóa đơn thành `CANCELLED`, không còn tính doanh thu — `docs/BUSINESS_RULES.md:150`. Vì vậy mọi tổng và món bán chạy đều lọc trạng thái hóa đơn hiện hành.
- `payments.invoice_id` là `UNIQUE`, `method` là `CASH` hoặc `TRANSFER`, `amount` là bigint dương — `POS_API/src/database/migrations/20261109000000-Payments.ts:38-80`. Hóa đơn hoàn tất 0đ không có payment, phải đếm từ hóa đơn với LEFT JOIN payment, không INNER JOIN.
- `invoices` có `branch_id`, `work_shift_id`, `status`, `total_amount`, `paid_at`; `invoice_items` có `product_size_id`, `product_name`, `size_name`, `quantity`, `line_total` — `POS_API/src/database/migrations/20261106000000-Sales.ts:8-48`.
- `line_total` đã gồm topping nhân số lượng món; `invoice_item_toppings.line_total` là phần tách, không được cộng lại — `POS_API/src/sales/sales.service.ts:435-444`. Hoàn tất hóa đơn ghi `paid_at=now()` — cùng file `:365-389`.
- Không có Reports module và không có `report.view_*` trong backend hiện tại; đã kiểm bằng `rg -n 'report.view|report' POS_API` ngày 14/11/2026. `POS_API/src/app.module.ts:1-25` có các module hiện hành; migration quyền mới là cần thiết, không chỉ sửa UI.
- `POS_API/src/foundation.test.ts:37` kiểm migration đầu tiên trả `12`, lần chạy lại trả `0`; phải cập nhật thành `13` khi thêm một migration, giữ assertion không chạy lặp.
- User backend có `UserSummary` gồm `id`, `storeId`, `branchId`, `permissions`, `role` — `POS_API/src/auth/auth.service.ts:13-23`. `AccessGuard` không có metadata permission gọi `auth.me` để xác thực — `POS_API/src/auth/security/access.guard.ts:13-37`; kiểm OR ba quyền báo cáo tại ReportsService, không sửa guard chung.
- `GET /api/v1/work-shifts/current` và danh sách ca đã có, yêu cầu `shift.read` — `POS_API/src/shifts/shifts.controller.ts:12-39`; `shiftsPage` giới hạn CASHIER về user hiện tại — `POS_API/src/shifts/shifts.pagination.ts:33-66`. Quyền `shift.read` hiện được cấp cho các vai trò vận hành trong migration ca; không tạo API danh sách ca mới.
- UI đã có `shiftService.getCurrentShift()`, `shiftService.getShifts(query)` trả data + meta cursor — `POS_UI/src/services/shiftService.ts:39-79,130-140`; `organizationService.getBranchChoices()` đọc đủ các trang chi nhánh thật — `POS_UI/src/services/organizationService.ts:43-52`.
- `reportService.getDailyReport` hiện chỉ bọc `MockEngine`; chỉ caller trong DailyReportScreen theo `rg -n 'getDailyReport' POS_UI/src` — `POS_UI/src/features/reports/reportService.ts:1-8`, `DailyReportScreen.tsx:1-39`.
- `DailyReportScreen` dùng ngày UTC `toISOString().slice(0,10)`, chưa có ca, khoảng biểu đồ, danh sách món — `POS_UI/src/features/reports/DailyReportScreen.tsx:11-130`.
- Ba điểm chặn/điều hướng phải sửa cùng nhau: `POS_UI/src/app/navigation.ts:20`, `POS_UI/src/app/App.tsx:114-118`, `POS_UI/src/components/common/AppShell.tsx:120`. `AppShell.tsx:51` coi reports là demo và `App.tsx` cuối file vẫn hiện banner demo; `POS_UI/test/app-invoices-shell.test.mjs:10` đang kiểm reports có banner nên phải đổi assertion tương ứng.
- Pattern identity key, query key và giữ `message/requestId` đã có ở `POS_UI/src/features/invoices/InvoicesScreen.tsx:19-75`; tái sử dụng cách làm, không tạo cache/session layer mới. `formatVND` đã nhận `bigint | number` — `POS_UI/src/utils/formatters.ts:13`.
- `DESIGN.md:33,141,355-363,508,839`: mục tiêu chạm tối thiểu 48px, nhãn ở trên ô, Báo cáo gồm chỉ số, cột doanh thu ngày, món bán chạy. UI giữ token/component hiện có.
- Graph: đã kiểm `graphify-out/needs_update` không tồn tại; không query graph vì spec mới chưa được semantic update. Các fact trên đã xác nhận bằng source. Agent chính xử lý semantic update giới hạn vào tài liệu task, không quét lại hồ sơ lịch sử.

## Lỗi cũ cần tránh
- `.devloopflow/errors/20261109-owner-access-all-branch-scope.md` — quy tắc phòng tránh nguyên văn: “Mọi truy vấn scope theo chi nhánh phải qua một quy tắc: `access_all` → không lọc; ngược lại bắt buộc `branchId` hoặc 403. Khi sửa một điểm vào, grep mọi truy vấn cùng mẫu `branch_id=$` trong module.”
- `.devloopflow/errors/20261110-backlog-branch-scope-null-branchid-fail-open.md` — nguyên văn: “Mọi kiểm tra phạm vi chi nhánh phải chặn khi thiếu `branchId` và không có `branch.access_all`; không dùng điều kiện "chỉ kiểm khi có giá trị" cho thông tin phạm vi.”
- `.devloopflow/errors/20261113-invoice-load-error-details-lost.md` — nguyên văn: “Khi xử lý lỗi đọc API, giữ message và requestId khi có, có fallback và không hiển thị response cũ qua phiên hoặc lựa chọn mới.”
- `.devloopflow/errors/20261114-backlog-stale-list-test-settled-request.md` — nguyên văn: “Test phản hồi đến muộn phải chứng minh request cũ thực sự đang pending và có request mới trước khi resolve/reject.”
- `.devloopflow/errors/20261109-cash-close-shift-zero-cash-sales.md` — nguyên văn: “Khi bật một nguồn tiền mới, rà mọi chỗ đang hardcode 0/placeholder chờ nguồn đó (đối soát, báo cáo).”
- `.devloopflow/errors/20261113-payment-test-seed-db-clock-flaky.md` — nguyên văn: “Khi test seed mốc thời gian bằng đồng hồ DB (`now()`) rồi gọi API ghi mốc sau bằng đồng hồ Node, seed lùi (`now() - interval '1 minute'`) hoặc dùng cùng một đồng hồ; không dựa vào hai đồng hồ khớp nhau.” Và: “Dùng `--test-name-pattern` theo tên test cha khi chạy subtest lồng nhau (pattern của subtest không chạy được).”
- `.devloopflow/errors/2026-10-30-pb13-session-retry-scope.md`: dùng client hiện hành có identity/epoch, không tự thêm retry qua phiên khác. Đã đọc toàn bộ các file trên sau INDEX; MEMORY M-1, M-4, M-10, M-11, M-12, M-36, M-37, M-39 áp dụng vào scope, hợp đồng, HTTP thật, render query key, tái sử dụng và ma trận chứng cứ.

## Quyết định
- User yêu cầu bộ chọn khoảng riêng; trả lời nguyên văn: “1 Thêm bộ chọn khoảng riêng nữa / 2 đồng ý , có / 3 đồng ý / 4 đồng ý”. Nghĩa đã chốt được ghi tại spec mục Mục tiêu/Các phần cách làm user đã quyết: CASHIER chọn ca của mình gồm mở/đã đóng; số hóa đơn tính cả hoàn tất 0đ.
- Chốt khoảng biểu đồ mặc định 7 ngày, tối đa 31 ngày, độc lập ngày báo cáo; user trả lời nguyên văn: “đồng ý”.
- User hỏi nguyên văn: “không tính 5000 của topping à”. Sau làm rõ cộng topping trước giảm giá, user trả lời: “đồng ý”. Nhãn đã duyệt: “Doanh thu món và topping trước giảm giá”.
- User yêu cầu nguyên văn: “tách mỗi size thành một dòng để xem rõ số lượng và doanh thu từng size”.
- User yêu cầu nguyên văn: “gộp cùng size khi đổi tên món”.
- User duyệt toàn bộ spec, gồm các quyết định của agent, bằng câu nguyên văn: “duyệt spec”. Nguồn hợp đồng cuối: `.devloopflow/specs/20261114-sprint10-reports.md`.
- Các chữ ký nội bộ, tách file và cách dùng CTE trong plan là thiết kế triển khai theo mục “Để người viết plan tự chọn” của spec, không phải API hoặc business rule lịch sử.

## Giả định
- Không có giả định chờ xác nhận. Các mặc định ngày, ca, tên snapshot, thứ tự, phạm vi và lỗi lấy nguyên từ spec đã duyệt.
- Không suy quyền từ role ở truy vấn báo cáo; ba role trong fixture chỉ để kiểm các permission đã seed qua migration. Chặn PLATFORM_ADMIN là ràng buộc tenant đã có tại `docs/api-spec.md:135-137`.

## Phạm vi
- Trong: migration cấp quyền; Reports module; `GET /api/v1/reports/revenue`; tổng ngày, số đơn, hai hình thức tiền; chuỗi ngày 1–31 ngày và top 10 size; UI bộ lọc đúng quyền, biểu đồ, bảng, tải/rỗng/lỗi, identity/query guard; kiểm PostgreSQL/HTTP/UI/browser theo S10-01..06 của lát cắt này.
- Ngoài: PB-15 nhập dữ liệu, tab Sổ kho, QA cấp sprint, Sprint Review/Retrospective, PB-14, SePay Live, lợi nhuận, giờ cao điểm, báo cáo tuần/tháng, thay đổi cách ghi payment/hoàn tất/hủy hóa đơn, đổi client auth, xóa mock dùng ở màn khác, thêm dependency.
- Tài liệu dự án: đề xuất đúng các vị trí cần đổi ở phần cuối ST-3; ghi qua sync-docs theo quyền của skill sau task, không cho subagent TDD tự sửa các tài liệu đó trong ST-1..3.

## Thiết kế tổng thể
- Luồng chính:
  1. Migration mới cấp ba permission báo cáo cho role tương ứng; phiên lấy quyền từ auth backend hiện hành.
  2. UI xác định quyền; phạm vi ca nạp ca CASHIER của mình; phạm vi all nạp chi nhánh bằng service thật; chặn request khi không đủ quyền/chưa có ca.
  3. UI gửi ngày báo cáo, hai đầu khoảng và ID thuộc bộ lọc qua HTTP client hiện hành.
  4. AccessGuard xác thực; ReportsService kiểm tenant/quyền, validate query, xác định scope từ identity và kiểm các ID tham chiếu.
  5. Một SQL statement có các CTE scoped invoices, totals, daily series và best sellers; tất cả đọc cùng snapshot statement để không lệch tổng khi có thanh toán/hủy đồng thời. Không khóa ghi hay gọi service thanh toán.
  6. Backend kiểm giới hạn an toàn của tiền trước `Number`, trả envelope data; lỗi dùng filter chung và log khi tổng không an toàn.
  7. UI chỉ render kết quả có identity/query key hiện tại; format VND, tên size, trục ngày, trạng thái tải/rỗng/lỗi.
- Thành phần: DatabaseModule/AuthModule hiện có, ReportsModule mới, reportService, DailyReportScreen, App/navigation/AppShell, shiftService/organizationService/client/formatters hiện có.

| Quyết định thiết kế | Lý do | Phương án đã loại |
| --- | --- | --- |
| SQL tổng hợp ở ReportsService, một statement | Tenant/status/ngày giống nhau cho mọi phần; DB cộng bigint/numeric trước trả JSON | Tải toàn bộ hóa đơn về JS; mỗi phần tự truy vấn trên snapshot khác nhau |
| LEFT JOIN payments, count hóa đơn riêng | Giữ đơn 0đ; payment có một dòng tối đa mỗi hóa đơn | INNER JOIN làm mất đơn 0đ; join item vào totals làm nhân doanh thu |
| Best sellers group `product_size_id`, SUM `quantity`, SUM `line_total` | Tách size, gộp khi đổi tên, không cộng topping lần hai | Group tên hoặc chỉ product; SUM topping cộng thêm |
| Snapshot tên từ dòng có `invoices.paid_at` mới nhất, tie `invoice_items.id` giảm dần | Triển khai quyết định tên lần bán gần nhất/ID ổn định của spec | Join tên menu hiện tại; nhóm mỗi tên thành một dòng |
| CSS/SVG cột kèm nhãn/giá trị đọc được, bảng món dùng DataTable hiện có | Không cần thư viện chart; truy cập được bằng cảm ứng và bàn phím | Tooltip chỉ hover; thêm chart dependency |
| Keyed screen + query key + generation/epoch guard như InvoicesScreen | Không hiện dữ liệu cũ ngay render đầu; chặn callback muộn | Chỉ clear ở useEffect; tự tạo client/session layer mới |

## Thay đổi dữ liệu
- Thêm `POS_API/src/database/migrations/20261114000001-ReportsPermissions.ts`, class `ReportsPermissions20261114000001`; timestamp liền sau `20261114000000-InvoiceReadScope.ts` đã có, không trùng timestamp migration.
- Không thêm/sửa bảng, cột hay index: dùng các bảng đã có tại Sales/Payments/Organization/Shifts migrations. Không sửa migration đã chạy.
- `up`: INSERT permissions bằng `gen_random_uuid()` + ON CONFLICT code DO NOTHING, rồi INSERT role_permissions ON CONFLICT DO NOTHING: CASHIER `report.view_shift`, MANAGER `report.view_branch`, OWNER `report.view_all`. Không cấp báo cáo cho PLATFORM_ADMIN; không thay `branch.access_all`, `shift.read`, `branch.read` đã có.
- `down`: throw `Error('Reports permissions migration cannot be reversed automatically without removing permission assignments')` trước mọi ghi DB. Lý do: `ON CONFLICT DO NOTHING` có thể gặp permission/link đã có trước migration; không có provenance để xóa an toàn khi rollback. Pattern từ chối rollback đã có ở `POS_API/src/database/migrations/20261106000000-Sales.ts`, `20261113000000-ShiftExpenses.ts`. Test gọi down chỉ trong sandbox, xác nhận dữ liệu/quyền không đổi; không thêm bảng ledger cho rollback.
- Foundation test cập nhật migration count 12 thành 13, giữ kiểm chạy lần hai 0. Không thêm index theo suy đoán về tải.

## API contract tổng
- Nguồn duy nhất cho endpoint mới: spec đã duyệt, mục Quyết định của agent. HTTP convention: `docs/api-spec.md:135-165,196,234-253,273-281`.
- `GET /api/v1/reports/revenue`, cookie `__Host-pos_access`; không body, không cần Origin/CSRF cho GET; không có phân trang.

| Query field | Kiểu | Bắt buộc | Ràng buộc | Mặc định API |
| --- | --- | --- | --- | --- |
| `date` | string | Có | `YYYY-MM-DD`, ngày hợp lệ theo lịch | Không có |
| `fromDate` | string | Có | `YYYY-MM-DD`, ngày hợp lệ; không sau `toDate` | Không có |
| `toDate` | string | Có | `YYYY-MM-DD`, ngày hợp lệ; khoảng cả hai đầu 1–31 ngày | Không có |
| `shiftId` | UUID string | Khi phạm vi ca | Ca CASHIER của chính user, trong store và chi nhánh được phép; mở hoặc đóng | Không có |
| `branchId` | UUID string | Không | Người có `branch.access_all` được chọn chi nhánh cùng store; người bị giới hạn chi nhánh bỏ qua giá trị client | Không có; all là toàn store, còn lại dùng identity |

- Không chấp nhận field lạ, lặp query tạo array/object, ngày thiếu/rỗng/sai lịch, ID áp dụng sai định dạng, range đảo hoặc hơn 31 ngày: `422 VALIDATION_ERROR`.
- Xử lý phạm vi: ưu tiên permission cho mức rộng nhất được cấp; `report.view_all` cần `branch.access_all` để tổng hợp toàn store, `report.view_branch` cần identity.branchId, `report.view_shift` cần identity.branchId và ca chính user. Người có nhiều permission vẫn bị chặn khi thiếu điều kiện để dùng mức rộng; không dùng `branchId` client thay identity bị thiếu. Các query tổng, chuỗi ngày và món cùng dùng scope đã xác định một lần. UI chỉ gửi shiftId ở phạm vi ca; nếu request có shiftId, server luôn kiểm tenant/branch, và với mức ca kiểm chủ ca, rồi giao phạm vi với ca đó; không được bỏ kiểm vì có quyền báo cáo khác.
- ID ngoài store: `404 NOT_FOUND`; ca cùng store của người khác khi chỉ có quyền ca: `403 PERMISSION_DENIED`. Người bị giới hạn chi nhánh gửi branchId khác: bỏ qua, chỉ trả branch identity; thiếu identity.branchId và không access_all: `403 PERMISSION_DENIED`.
- Response TypeScript (cùng shape trên API/UI, tên type là quyết định triển khai):

```ts
interface RevenueQuery {
  date: string;
  fromDate: string;
  toDate: string;
  branchId?: string;
  shiftId?: string;
}
interface RevenueReport {
  date: string;
  invoiceCount: number;
  totalRevenue: number;
  cashRevenue: number;
  transferRevenue: number;
  dailyRevenue: { date: string; revenue: number }[];
  bestSellers: {
    productSizeId: string;
    productName: string;
    sizeName: string;
    quantity: number;
    revenue: number;
  }[];
}
```

- `200 { data: RevenueReport }`. Tiền là số nguyên đồng an toàn, các số lượng là số nguyên, dailyRevenue tăng dần gồm đủ ngày và zero-fill, bestSellers tối đa 10, quantity giảm dần, productName/sizeName tăng dần rồi UUID tăng dần khi bằng nhau. Truy vấn tiền ngày và món không bị giới hạn bởi khoảng biểu đồ; biểu đồ không bị giới hạn bởi `date`.
- Tổng tiền mặt/chuyển khoản: SUM `payments.amount` theo method, chỉ join invoices hiện PAID, ghi nhận theo invoice.paid_at; totalRevenue = cashRevenue + transferRevenue. Không dùng tendered/change/actual_received/excess thay amount. invoiceCount đếm hóa đơn hiện PAID kể cả 0đ. Best sellers dùng line_total trước discount toàn hóa đơn, có thể khác tổng tiền thanh toán.

| HTTP | code | message nguyên văn | Trường hợp |
| --- | --- | --- | --- |
| 401 | `UNAUTHENTICATED` | `Vui lòng đăng nhập để tiếp tục.` | Chưa xác thực; nguồn ApiErrorFilter/Auth hiện hành |
| 403 | `PERMISSION_DENIED` | `Bạn không có quyền thực hiện thao tác này.` | Không có quyền, thiếu tenant/scope, PLATFORM_ADMIN, ca người khác trong phạm vi ca |
| 404 | `NOT_FOUND` | `Không tìm thấy tài nguyên.` | ID chi nhánh/ca không tồn tại hoặc ngoài store/scope branch khi ID có áp dụng |
| 422 | `VALIDATION_ERROR` | `Dữ liệu gửi lên không hợp lệ.` | Query/body không hợp lệ |
| 500 | `INTERNAL_ERROR` | `Hệ thống gặp lỗi. Vui lòng thử lại sau.` | Tổng tiền không an toàn hoặc lỗi nội bộ; không lộ SQL |

- Các message dùng nguyên văn `POS_API/src/http/api-error.filter.ts:9-19,34`; envelope `{ error: { code, message, details, requestId } }`. Không thêm mã lỗi mới. Lỗi query có `details` với `location: 'query'`, `field`, `message: 'Giá trị không hợp lệ.'` theo `docs/api-spec.md:250-253`; lỗi body dùng envelope chung.

## AC tổng end-to-end
- [x] E2E-AC-1: Given hóa đơn CASH PAID 35.000đ, TRANSFER PAID 50.000đ, PAID 0đ và OPEN/CANCELLED mỗi đơn 99.000đ của ngày 14/11/2026 VN, When đọc báo cáo, Then invoiceCount 3, cashRevenue 35000, transferRevenue 50000, totalRevenue 85000; sau hủy CASH còn count 2, cash 0, transfer/total 50000 (S10-01, S10-02; PostgreSQL/HTTP/SQL).
- [x] E2E-AC-2: Given các khoản 10000 tại `2026-11-13T16:59:59.999Z`, 20000 tại `2026-11-13T17:00:00.000Z`, 30000 tại `2026-11-14T16:59:59.999Z`, 40000 tại `2026-11-14T17:00:00.000Z`, When date 2026-11-14, Then chỉ tính 20000+30000=50000, count 2; biểu đồ gán bốn khoản đúng ngày VN (S10-01, S10-04; PostgreSQL/HTTP).
- [x] E2E-AC-3: Given hai store, hai branch store A và hai cashier cùng branch, When gọi HTTP bằng CASHIER/MANAGER/OWNER/PLATFORM_ADMIN và sửa query ID, Then ca mình mở/đóng hợp lệ, ca người khác 403, cross-store 404, manager chỉ branch mình dù gửi branch khác, owner all/chọn branch đúng, admin 403, chưa login 401 (S10-03; HTTP + DB).
- [x] E2E-AC-4: Given date 2026-11-14, chart 2026-11-01..2026-11-07, 12 size bán PAID gồm đổi tên, topping và đơn hủy, When đọc API/UI, Then chỉ số/món vẫn ngày 14, chart đúng bảy ngày 01..07, không tính hủy, top 10 theo số lượng và tie name/size/UUID, cùng size gộp và tên snapshot mới nhất, 30000+5000 hiển thị 35000 trước giảm giá (S10-04; PostgreSQL/HTTP/browser).
- [x] E2E-AC-5: Given UI thật tại 1024×768, When chọn ngày/ca/branch/khoảng, tải/rỗng/lỗi/thử lại, Then network là GET reports/revenue và các bộ chọn API thật, VND/tiếng Việt, nhãn liên kết, mục tiêu chạm ≥48px, chart/bảng đọc được không chỉ hover, không banner/dữ liệu demo (S10-05; browser/network/DB).
- [x] E2E-AC-6: Given request A pending khi đổi bộ lọc hoặc phiên A sang B, When render trước useEffect rồi resolve/reject A sau B, reload hoặc truy cập trực tiếp reports không quyền, Then dữ liệu/lỗi/ca/branch A không xuất hiện, B chỉ thấy scope B, người không quyền không gửi báo cáo (S10-06; UI regression + browser hai phiên/HTTP).

## Review Focus
- RF-1: Payment chuyển khoản nhận thừa hoặc tiền mặt khách đưa lớn hơn amount → doanh thu dùng amount, không phần nhận thừa/tiền khách đưa — test `test_ST2_AC2_payment_amount_not_received` (ST-2).
- RF-2: Ca CASHIER kéo qua nửa đêm → mỗi ngày chỉ giao hóa đơn trong ca và ngày VN, không gom toàn ca vào một ngày — test `test_ST2_AC4_shift_crosses_midnight` (ST-2).
- RF-3: Một khoản hủy xảy ra giữa lúc đọc các phần báo cáo → tổng ngày và điểm daily của cùng ngày không lệch vì các phần cùng statement snapshot — test `test_ST2_AC7_consistent_statement` (ST-2).
- RF-4: Ca đang mở không nằm trong trang danh sách đầu, có hơn 100 ca lịch sử → lấy current trước, phân trang thêm lịch sử, không chọn nhầm ca gần nhất khi còn ca mở — test `test_ST3_AC2_shift_pages_current` (ST-3).
- RF-5: Ca/chi nhánh phụ trợ lỗi hoặc phản hồi muộn sau đổi phiên → thông báo giữ message/requestId, không dùng danh sách/mặc định phiên cũ — test `test_ST3_AC5_auxiliary_identity_errors` (ST-3).

## Sub-tasks

### ST-1: Cấp permission báo cáo qua migration
- depends_on: -
- Interfaces:
  - Consumes: Không có; dùng schema permission/role hiện hành.
  - Produces: `report.view_shift: string` (CASHIER), `report.view_branch: string` (MANAGER), `report.view_all: string` (OWNER), cấp qua `role_permissions`; migration `ReportsPermissions20261114000001.up(queryRunner: QueryRunner): Promise<void>` và `ReportsPermissions20261114000001.down(queryRunner: QueryRunner): Promise<void>`.
- Mục tiêu: tài khoản thật nhận đúng permission từ migration; không cấp qua fixture giả.
- AC riêng:
- [x] ST-1.AC-1: Given DB chạy đủ migration hiện hành, When chạy migration mới rồi query role_permissions, Then CASHIER có view_shift, MANAGER có view_branch, OWNER có view_all, PLATFORM_ADMIN không có cả ba, các quyền cũ giữ nguyên (integration).
- [x] ST-1.AC-2: Given DB thử có sẵn một permission/link báo cáo trước up và có lịch sử hóa đơn/payment, When up rồi gọi down, Then up giữ nguyên UUID/link có sẵn, down từ chối trước ghi với Error đã nêu, mọi quyền/hóa đơn/payment nguyên vẹn; chạy up lần nữa không thêm dòng (integration).
- Plan chi tiết:
  - File tạo/sửa:
    - Tạo `POS_API/src/database/migrations/20261114000001-ReportsPermissions.ts`: up/down như mục Thay đổi dữ liệu.
    - Tạo `POS_API/src/reports/tests/reports-permissions.integration.test.ts`: DB thử riêng, chạy migration, SQL kiểm role/link, trường hợp quyền có sẵn và down từ chối mà không ghi.
    - Sửa `POS_API/src/foundation.test.ts:37`: count 12 thành 13, giữ assertion lần hai bằng 0.
  - Chữ ký hàm/class: `class ReportsPermissions20261114000001 implements MigrationInterface`, `name = 'ReportsPermissions20261114000001'`, up/down như Produces.
  - DTO/schema: Không có HTTP DTO; `permissions.code`, `role_permissions.role_id/permission_id` dùng bảng Foundation/Organization migrations đã có.
  - DB/migration: không schema mới; down từ chối trước ghi; chỉ gọi thử trên sandbox fixture; không xóa quyền hoặc lịch sử.
  - API: chưa thêm route ở subtask này; không có request/response/mã lỗi mới.
  - Các bước xử lý:
    1. Đọc INDEX, M-10/M-37; test đỏ chứng minh thiếu quyền thật trên DB migration hiện tại.
    2. Viết migration cấp đúng ba role/permission; thêm fixture quyền đã có sẵn, kiểm up idempotent và down từ chối giữ nguyên dữ liệu.
    3. Chạy test riêng và foundation, rồi build/test API theo lệnh mục kiểm tra.
  - Quy tắc nghiệp vụ: permission và role theo spec mục Mục tiêu; không kiểm runtime bằng role cứng (`docs/PRODUCT_OVERVIEW.md:37`).

| Edge case | Hành vi mong đợi |
| --- | --- |
| Migration chạy lại | Không thêm permission/link trùng |
| PLATFORM_ADMIN đã có quyền nền tảng | Giữ nguyên; không cấp báo cáo |
| Rollback DB thử có payment/quyền có sẵn | Từ chối trước ghi; mọi quyền và lịch sử không đổi |

  - Ảnh hưởng code hiện có: loader migrations dùng glob ở `POS_API/src/database/data-source.ts:70`, không thêm đăng ký thủ công; foundation count phải đổi.
  - Tác dụng phụ: chỉ insert permission/link qua up; down không ghi; không event/cache/mail/log nghiệp vụ.
- Lỗi cũ liên quan: M-10 yêu cầu test hành vi HTTP tiếp ở ST-2, không dùng kiểm bảng để kết luận scope; M-37 tái sử dụng pattern migration đã có.
- Test viết trước:
  - [x] `test_ST1_AC1_permissions_seeded` — input: DB đủ migration — expected: đúng ba link, không cấp admin, quyền cũ không đổi.
  - [x] `test_ST1_AC2_permissions_rollback` — input: permission/link có trước up, gọi up/down/up — expected: UUID cũ giữ nguyên, down ném Error trước ghi, mọi dữ liệu nguyên vẹn, count không tăng khi up lại.
- Tiến độ:
  - [x] Red
  - [x] Green
  - [x] Refactor
  - [x] Test module xanh

### ST-2: Reports API thật, phạm vi và tổng hợp PostgreSQL
- depends_on: ST-1
- Interfaces:
  - Consumes: `report.view_shift: string` (CASHIER), `report.view_branch: string` (MANAGER), `report.view_all: string` (OWNER), cấp qua `role_permissions` từ ST-1; không gọi up/down ở runtime.
  - Produces: `ReportsService.getRevenue(user: UserSummary, query: RevenueQueryDto): Promise<RevenueReportDto>`; HTTP `GET /api/v1/reports/revenue` query/response/error đúng mục API contract tổng; `RevenueQueryDto` và `RevenueReportDto` có shape `RevenueQuery`/`RevenueReport` ở trên.
- Mục tiêu: một endpoint chỉ đọc đáp ứng toàn bộ hợp đồng đã duyệt, không để placeholder/mock cho bất kỳ phần response nào.
- AC riêng:
- [x] ST-2.AC-1: Given fixture E2E-AC-1 và bốn mốc E2E-AC-2, When GET ngày 14 và hủy CASH qua API hủy hiện hành, Then tổng/count/date như hai E2E, ngày rỗng count/totals bằng 0, CANCELLED có payment không tính, PAID 0đ vẫn đếm (integration/HTTP).
- [x] ST-2.AC-2: Given CASH amount 35000 tendered 50000/change 15000 và TRANSFER amount 50000 actualReceived 60000/excess 10000, When GET, Then cash 35000, transfer 50000, total 85000; aggregate 9007199254740991 được trả chính xác, 9007199254740992 trả 500 INTERNAL_ERROR, không có data và có log (integration/unit ở biên chuyển số).
- [x] ST-2.AC-3: Given hai store, hai branch và hai cashier, When HTTP các vai trò/permission thật, Then đúng phạm vi E2E-AC-3; report.view_branch không branchId và không access_all trả 403; view_all thiếu access_all không được tổng hợp toàn store; thêm permission báo cáo vào PLATFORM_ADMIN trong fixture vẫn 403; không có quyền trả 403 (HTTP/integration).
- [x] ST-2.AC-4: Given cashier có ca OPEN và CLOSED của mình, ca người khác, ca qua nửa đêm, When chọn shiftId và ngày, Then chỉ count/sum/daily/bestsellers của ca giao ngày; ca CLOSED được xem; thiếu shiftId ở mức ca trả 422, ca ngoài store 404, ca người khác 403 (HTTP/integration).
- [x] ST-2.AC-5: Given ngày 2026-11-14 và range 2026-11-01..07 có ngày 02 không bán, When GET, Then dailyRevenue có đúng 7 phần tử tăng dần, ngày 02 revenue 0, totals/món chỉ ngày 14; range một ngày và đúng 31 ngày được nhận; 32 ngày/đảo thứ tự/ngày 2026-02-30/thiếu/array/object/field lạ/body bị 422 cùng envelope/details query (HTTP/validation).
- [x] ST-2.AC-6: Given 12 size có số lượng 12..1, same-size đổi tên ở hai hóa đơn, hai size cùng product, giá thay đổi, topping 5000 trên món 30000 và giảm giá toàn đơn, When GET, Then chỉ top 10 size, sum quantity/line_total trước discount, không cộng topping hai lần, tên snapshot từ lượt PAID mới nhất rồi tie ID ổn định, tie quantity theo tên/size/UUID; OPEN/CANCELLED và store/branch/ca khác không ảnh hưởng (PostgreSQL/HTTP).
- [x] ST-2.AC-7: Given giao dịch hủy/thanh toán đồng thời với đọc báo cáo và lỗi DB được ép trong test riêng, When GET, Then không có response chứa totalRevenue khác dailyRevenue của cùng ngày do đọc hai snapshot, lỗi nội bộ trả 500 envelope/requestId không lộ SQL, và endpoint không làm đổi dữ liệu (integration/unit).
- Plan chi tiết:
  - File tạo/sửa:
    - Tạo `POS_API/src/reports/reports.module.ts`: imports AuthModule, DatabaseModule; controller ReportsController, provider ReportsService.
    - Tạo `POS_API/src/reports/reports.controller.ts`: `@Controller('api/v1/reports')`, AccessGuard, GET revenue, noInput allow query, validation query, dataResponse; Swagger query/response/errors.
    - Tạo `POS_API/src/reports/http/reports.dto.ts`: RevenueQueryDto, RevenueReportDto và nested daily/bestseller DTO có ApiProperty, class-validator cho query; giữ response tách entity.
    - Tạo `POS_API/src/reports/reports.service.ts`: auth scope, lịch/range validation liên field, SQL parameterized và chuyển số an toàn.
    - Sửa `POS_API/src/app.module.ts`: import/đăng ký ReportsModule.
    - Tạo `POS_API/src/reports/tests/reports.integration.test.ts`: fixture PostgreSQL + Nest app auth HTTP; tái sử dụng cách tạo DB thử, override DataSource, login cookie và cleanup ở `POS_API/src/sales/tests/manager-cancel.integration.test.ts:10-49`.
    - Tạo `POS_API/src/reports/tests/reports.test.ts`: calendar/range và chuyển số unsafe/failure log, assert SQL một statement khi kiểm snapshot; không mock DB để kết luận nghiệp vụ.
  - Chữ ký hàm/class:
    - `class ReportsController`, `getRevenue(request: AuthenticatedRequest, query: RevenueQueryDto): Promise<{ data: RevenueReportDto }>`; thực tế decorator dùng @Req/@Query.
    - `class ReportsService`, constructor `constructor(db: DataSource)` bằng @Inject, `getRevenue(user: UserSummary, query: RevenueQueryDto): Promise<RevenueReportDto>`.
    - DTO như API contract tổng; calendar/range và chuyển bigint là hàm nội bộ, không tạo public helper dùng chung nếu không có caller khác.
  - DTO/schema: đầy đủ bảng query/shape response ở API contract tổng; `date/fromDate/toDate` class-validator IsString + Matches + kiểm ngày lịch; không ép array/object thành string. Custom query ValidationPipe giữ whitelist/forbidNonWhitelisted/transform và error.details location query. Với branch identity bị giới hạn, bỏ `branchId` client trước validation giá trị scope này theo spec; vẫn không chấp nhận query field lạ. UUID áp dụng dùng pattern/validator có sẵn.
  - DB/migration: chỉ đọc schema hiện có, không migration mới trong ST-2. Scope branch join `branches.store_id`; scope shift join work_shifts/branches, kiểm store trước kiểm chủ ca; không lấy storeId từ query.
  - API: method/path/quyền/request/response/bảng lỗi đầy đủ như API contract tổng; không tạo route khác.
  - Các bước xử lý:
    1. Test đỏ từ HTTP route chưa tồn tại, rồi từng case auth/scope/validation/money/chart/bestseller; không kết luận quyền từ role_permissions đơn lẻ.
    2. Xác thực user qua AccessGuard, kiểm tenant + report permission tại service; chọn phạm vi bằng permissions; chuẩn hóa UUID áp dụng để viết hoa vẫn cùng ID; với restricted branch bỏ tham số branch client.
    3. Validate no-body, query field/type/calendar/range tối đa 31 inclusive; shift required ở mức ca. Nạp branch/shift bằng store đã xác thực; 404 ID cross-store trước kiểm chủ ca; 403 ca cùng store người khác ở mức ca.
    4. SQL một statement: CTE PAID invoices join branches lọc store/branch/shift, giữ ngày báo cáo hoặc khoảng chart; ngày VN bằng `paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'`, biên từ local midnight inclusive tới local midnight hôm sau exclusive. Phần count và tiền dùng LEFT JOIN payment; không join invoice_items vào totals.
    5. Tổng ngày count invoices; cash/transfer SUM payment.amount theo method; total = cash + transfer. Chart generate_series theo date from..to inclusive LEFT JOIN tổng ngày, COALESCE 0.
    6. Món ngày báo cáo group product_size_id; quantity SUM invoice_items.quantity; revenue SUM line_total; chọn snapshot bằng ROW_NUMBER theo invoice paid_at DESC, item id DESC; ORDER quantity DESC, product_name ASC, size_name ASC, product_size_id ASC LIMIT 10. Không join topping để cộng tiền.
    7. Giữ SUM/count dưới dạng chuỗi/BigInt tới kiểm giới hạn; kiểm không âm/nguyên và Number.isSafeInteger trước response; unsafe tiền log Logger.error và throw INTERNAL_ERROR chuẩn. Kiểm cả từng dailyRevenue và từng bestSellers.revenue, không chỉ total. Không trả bigint hoặc số làm tròn trong JSON.
    8. Thêm Swagger schema, đăng ký module, chạy focused/full suite API; xác nhận GET không ghi bảng nghiệp vụ.
  - Quy tắc nghiệp vụ: BR-29/62..65/77 (`docs/BUSINESS_RULES.md:150,198-203`); ngày, món, 0đ, quyền và range theo spec đã duyệt; safe integer `docs/api-spec.md:242-247`.

| Edge case | Hành vi mong đợi |
| --- | --- |
| Không đơn PAID | Count/totals 0, đủ daily zero, bestSellers [] |
| Payment còn sau hủy | Không tính hóa đơn/payment đó |
| PAID 0đ có item | Đếm hóa đơn, tiền 0, món vẫn cộng quantity và line_total trước discount |
| date nằm ngoài chart range | Hai phần độc lập |
| Ca qua ngày/đã đóng | Lọc theo paid_at ngày và shiftId, không yêu cầu ca đang mở |
| Hai dòng cùng size đổi tên/giá | Gộp UUID size; tổng tiền snapshot thực, nhãn lượt gần nhất |
| UUID viết hoa của ca/branch | PostgreSQL so UUID đúng, không từ chối do so chuỗi khác casing |
| Tổng vượt an toàn ở chart hoặc bestseller | 500 như tổng ngày; log không chứa secret |

  - Ảnh hưởng code hiện có: AppModule thêm ReportsModule; không sửa SalesService/ShiftsService/AccessGuard/client; caller mới là ST-3. Kiểm toàn bộ `branchId` và `branch_id` trong Reports module trước kết thúc theo M-1.
  - Tác dụng phụ: HTTP access log sẵn có; log nội bộ khi overflow/error; không mutation/event/cache/mail.
- Lỗi cũ liên quan: owner-access-all, null-branch fail-open, cash placeholder, clock fixture; áp nguyên quy tắc ở mục Lỗi cũ cần tránh. M-4 không thêm code lỗi; ghi endpoint vào đề xuất sync-docs.
- Test viết trước:
  - [x] `test_ST2_AC1_paid_zero_cancelled` — input fixture E2E-1 — expected 3/35000/50000/85000 rồi 2/0/50000/50000.
  - [x] `test_ST2_AC1_vietnam_midnight` — input bốn timestamp E2E-2 — expected ngày 14 count 2/tổng 50000.
  - [x] `test_ST2_AC2_payment_amount_not_received` — input CASH/TRANSFER nhận thừa — expected 35000 + 50000, không 50000 + 60000.
  - [x] `test_ST2_AC2_safe_money` — input 9007199254740991 và 9007199254740992 cho total/daily/bestseller — expected nguyên số đầu; số sau 500/no-data/log.
  - [x] `test_ST2_AC3_scope_permissions_http` — input login thật, ID/permission và null branch — expected 401/403/404/200 cùng phạm vi đúng như AC-3.
  - [x] `test_ST2_AC4_own_open_closed_shift` — input ca mở/đóng/missing/other/cross-store — expected 200/200/422/403/404 và cùng scope ở mọi phần.
  - [x] `test_ST2_AC4_shift_crosses_midnight` — input ca riêng có 20000 trước và 30000 sau midnight — expected mỗi ngày một khoản, không 50000 cho cả hai.
  - [x] `test_ST2_AC5_days_range_validation` — input 1/7/31/32 ngày, 2026-02-30, 2028-02-29, missing/field lạ/body/arrays — expected valid có đủ điểm, invalid 422; năm nhuận hợp lệ.
  - [x] `test_ST2_AC6_sizes_snapshots_toppings` — input 12 size, rename/giá/topping/discount/tie — expected top 10, cùng size một dòng tên mới, 35000 gồm topping một lần.
  - [x] `test_ST2_AC7_consistent_statement` — input request date cùng chart, thao tác hủy song song có barrier test và spy chỉ đếm query tổng hợp — expected các phần cùng snapshot (trước hoặc sau hủy), không response lai và chỉ một statement tổng hợp.
  - [x] `test_ST2_AC7_failure_readonly` — input DB lỗi có thông tin SQL nhạy cảm giả, request có X-Request-Id hợp lệ — expected 500 message chung/requestId, không SQL; đối chiếu snapshot DB trước/sau GET thành công không đổi.
- Tiến độ:
  - [x] Red
  - [x] Green
  - [x] Refactor
  - [x] Test module xanh

### ST-3: UI Báo cáo thật và chứng cứ tablet/phiên
- depends_on: ST-2
- Interfaces:
  - Consumes: HTTP `GET /api/v1/reports/revenue` query/response/error đúng mục API contract tổng; `RevenueQueryDto` và `RevenueReportDto` có shape `RevenueQuery`/`RevenueReport` từ ST-2. UI khai báo type độc lập khớp JSON, không import backend.
  - Produces: `reportService.getRevenue(query: RevenueQuery): Promise<RevenueReport>`; `DailyReportScreen: React.FC`; `RevenueQuery`/`RevenueReport` đúng shape ở API contract tổng. Không có subtask sau dùng thêm interface.
- Mục tiêu: một màn báo cáo hoàn chỉnh lấy API thật, đúng permission/identity, đúng chart/món và trải nghiệm tablet.
- AC riêng:
- [x] ST-3.AC-1: Given phiên có một trong ba permission báo cáo, When mở reports, Then ba điểm navigation/App/AppShell cho phép theo quyền (`report.view_all` chỉ tính khi có cả `branch.access_all`) và không có banner/chọn branch demo; phiên không quyền/admin bị chặn trước gọi report; service gửi đúng GET query và unwrap data qua client hiện hành (unit/UI).
- [x] ST-3.AC-2: Given thời điểm `2026-11-13T18:00:00.000Z`, cashier có current CASHIER OPEN và hơn 100 ca lịch sử, When mở màn, Then date mặc định 2026-11-14, chart 2026-11-08..14, chọn current; không current thì chọn ca CASHIER gần nhất, lịch sử có tải thêm cursor; không ca thì rỗng và không GET report (UI/browser).
- [x] ST-3.AC-3: Given owner all, manager branch B, cashier own shift, When đổi branch/ca/date/range, Then gửi đúng scope, manager không bộ chọn branch, cashier không chọn ca người khác, owner all không branchId hoặc branch đã chọn; đổi chart không đổi date/món; range 1/31 hợp lệ, đảo/32/ngày trống hiện lỗi gắn field và không fetch sai (UI/browser).
- [x] ST-3.AC-4: Given response total 85000/cash 35000/transfer 50000/count 3, daily đủ ngày có 0, top size có món+topping 35000, When render ở 1024×768 và 1280×800, Then VND/tiếng Việt, summary/count/payment/chart/bảng khớp API; nhãn “Doanh thu món và topping trước giảm giá”, đủ label field, control ≥48px, chart có trục/giá trị đọc được bằng keyboard/touch, không tràn ngang viewport (UI/browser đo thật).
- [x] ST-3.AC-5: Given report hoặc list ca/branch đang tải rồi lỗi có message `Máy chủ chưa tải được báo cáo.` và requestId `req-reports-1`, When reject/thử lại hoặc lỗi không message, Then hiển thị loading, giữ message/requestId khi có, fallback `Không tải được báo cáo. Vui lòng thử lại.` khi thiếu, cho thử lại đúng query; không dùng kết quả cũ; ngày rỗng tổng 0/bảng rỗng/chart zero vẫn hiện rõ (UI/browser).
- [x] ST-3.AC-6: Given report/ca/branch request A chưa settle, When chọn filter mới tạo request B hoặc đổi identity/epoch/permission, render ngay trước effect rồi resolve/reject A sau B, Then không hiện report/lỗi/list A ở bất kỳ render nào; reload phiên B chỉ đọc API scope B, unmount không cập nhật state (UI/browser hai phiên).
- Plan chi tiết:
  - File tạo/sửa:
    - Sửa `POS_UI/src/features/reports/reportService.ts`: bỏ MockEngine/User; khai báo RevenueQuery/RevenueReport; getRevenue dùng request và URLSearchParams.
    - Sửa `POS_UI/src/features/reports/DailyReportScreen.tsx`: nhận data number; local state/filter/query key; permission; ca/branch thật; loading/error/retry/empty; chart cột và bảng size; nhãn trước giảm giá; bỏ mockStorage/MockEngine hoàn toàn khỏi màn này.
    - Sửa `POS_UI/src/app/navigation.ts`, `POS_UI/src/app/App.tsx`, `POS_UI/src/components/common/AppShell.tsx`: thêm view_shift đúng ba điểm; key identity cho DailyReportScreen như các màn API; bỏ demo/banner riêng reports, không đổi phạm vi màn khác.
    - Sửa `POS_UI/src/styles/components.css`: selector report giới hạn trong màn, height ≥48px cho input/select/nút, chart cột đủ ngày và khả năng cuộn bên trong khi 31 ngày, không đẩy toàn viewport; dùng token sẵn có.
    - Tạo `POS_UI/test/report-service.test.mjs`: HTTP contract/URL/shape bằng mock biên request, không fake business totals.
    - Tạo `POS_UI/test/reports-screen.test.mjs`: harness React theo pattern invoices-screen, callback renderer DataTable thực, pending promises cho report/ca/branch.
    - Tạo `POS_UI/test/reports-accessibility.browser.mjs`: Chromium puppeteer-core theo pattern browser suite có sẵn; đo label/target/overflow/keyboard/chart tại 1024×768 và 1280×800.
    - Sửa `POS_UI/test/app-invoices-shell.test.mjs`: assertion reports hết demo banner/header data mock; giữ các assertion invoices hiện có.
    - Sửa `POS_UI/test/organization-screen.test.mjs:208-213`: mở rộng test accessibleTabs hiện có cho CASHIER có report.view_shift, giữ mọi assertion settings/shifts/platform hiện hành; không tạo test navigation mới trùng chức năng.
  - Chữ ký hàm/class: getRevenue/query/report như Produces; `DailyReportScreen: React.FC`; wrapper key identity và component con state như pattern InvoicesScreen. Không đổi signatures shiftService/organizationService/client/formatVND.
  - DTO/schema: UI type query/response ở API contract tổng; số tiền number luôn đi qua formatVND, không chuyển JSON tiền thành string. State kết quả `{ key: string; report?: RevenueReport; error?: string }`, chỉ render khi key khớp identity/filter/reload; state ca/branch cũng gắn identity.
  - DB/migration: Không có; UI chỉ GET backend. API: duy nhất report mới từ ST-2 và các GET ca/branch hiện hành; error như API contract tổng. Bộ chọn không tự tạo endpoint.
  - Các bước xử lý:
    1. Viết test đỏ cho service, shell và render quyền view_shift; xác minh assertion demo cũ cần đổi vì hành vi được yêu cầu thay đổi.
    2. Cài reportService.getRevenue gửi đầy đủ date/fromDate/toDate, ID khi có; không truyền storeId/customUser, không tính tổng nghiệp vụ ở client.
    3. Tạo identity key gồm epoch/user/store/branch/permission; remount khi đổi phiên. Query key gồm identity/date/fromDate/toDate/branch/shift/reload. Guard cả callback success/error và render trước effect.
    4. Mặc định ngày bằng Intl.DateTimeFormat với Asia/Ho_Chi_Minh, range date-6..date; default chỉ khởi tạo theo ngày báo cáo khi mở phiên. Các input range sau đó là state riêng, không tự ghi đè khi đổi date, để giữ tính độc lập theo spec. Ngày/range không hợp lệ không gửi report.
    5. All scope + access_all đọc getBranchChoices, không lọc bỏ chi nhánh inactive có lịch sử. Branch scope dùng identity. Shift scope lấy current và getShifts({limit:100,shiftType:'CASHIER',userId:session.user.id}), chọn current CASHIER trước, nếu không có chọn ca mới nhất danh sách; chỉ đưa ca user hiện tại vào selector. Nút tải thêm giữ cursor và identity, không nạp toàn lịch sử vô hạn; không ca hiện rỗng, không gọi reports.
    6. Render tổng/count, cơ cấu tiền; chart độc lập tối đa 31 ngày, zero bar vẫn có ngày/giá trị; bảng DataTable tên món + size, quantity, revenue. Dùng formatVND, tiền và số lượng không tính lại từ mock. Nhãn doanh thu món như spec; giải thích số này trước giảm giá toàn hóa đơn.
    7. Catch giữ err.message và err.requestId; không có message dùng fallback AC-5; list ca/branch có lỗi riêng và nút tải lại, không coi lỗi là dữ liệu rỗng. Loading và error không hiển thị report cũ. Không dùng hover làm đường duy nhất đọc chart.
    8. Chạy unit/UI, typecheck/build; browser kiểm thật viewport/keyboard/touch/labels/contrast/token và response/network. Thu artifact cho AC theo bảng evidence, không tự tick S10 cấp sprint.
  - Quy tắc nghiệp vụ: toàn bộ spec đã duyệt; UI thiết kế theo DESIGN.md:33,141,355-363,508,839; M-11 query key; M-12 dùng client đã có; M-37 tái sử dụng; M-39 đo/browser thật.

| Edge case | Hành vi mong đợi |
| --- | --- |
| Không ca hoặc ngày không doanh thu | Trạng thái rỗng đúng nghĩa, không báo lỗi giả, không mock |
| Nhiều ca hơn một page | Có tải thêm; current không bị loại vì ngoài trang đầu |
| Current STAFF | Không chọn làm ca doanh thu CASHIER; dùng ca CASHIER gần nhất hoặc rỗng |
| Chọn range không chứa date | Chỉ chart đổi, chỉ số/món giữ date |
| Response số 0 và nhiều ngày | Không chia 0 khi phần trăm, đủ nhãn và chart zero |
| Error requestId nhưng không message | Fallback + mã yêu cầu, retry giữ filters |
| Response A tới sau B | Không render A hoặc lỗi A; assert pending thật trước resolve/reject |
| Thu hồi quyền khi đang mở reports | Render AccessDenied/chặn dữ liệu trước effect, không gọi tiếp |

  - Ảnh hưởng code hiện có: reportService chỉ caller DailyReportScreen; shell/navigation/App tests phải đổi theo báo cáo API thật; không xóa MockEngine.getDailyReport vì mock có thể còn phục vụ demo ngoài lát cắt. Giữ HTTP client và danh sách ca/branch hiện có.
  - Tác dụng phụ: chỉ network GET; không event/cache/localStorage cho report; không ghi dữ liệu hay gửi thông báo bên ngoài.
  - Tài liệu cần cập nhật sau triển khai qua sync-docs (không thuộc quyền sửa source của TDD):
    - `docs/api-spec.md:491`: dòng Báo cáo đổi `/reports` thành `/reports/revenue`, thay tham chiếu legacy-reports.md không tồn tại bằng `.devloopflow/specs/20261114-sprint10-reports.md`; ghi query và lỗi theo spec đã duyệt, không tạo error code mới.
    - `README.md`: trạng thái màn Báo cáo từ mock sang API, chỉ ghi đạt theo evidence thật.
    - `AGENTS.md` và `CLAUDE.md`: cùng đổi danh sách UI mock/API để không còn khẳng định Báo cáo dùng mock; giữ phần cấu hình riêng agent.
    - `.devloopflow/devloopflow.md`: chỉ cập nhật lệnh/kết quả xác minh thật nếu đổi; không sửa số test dự đoán.
    - `sprints/sprint-10/SPRINT.md`: đề xuất cập nhật trạng thái item 1–3 dựa hồ sơ task, không tick S10 khi chưa có QA cấp sprint; `docs/PRODUCT_BACKLOG.md`: đề xuất bỏ câu “chưa có spec/plan” khi không còn đúng.
    - `.devloopflow/tasks/active/20261114-sprint10-reports.md`, active/approved plan và verify report do agent chính theo devloopflow; approved chỉ sau user duyệt, không sửa lịch sử spec.
- Lỗi cũ liên quan: invoice-load-error-details-lost, backlog-stale-list-test-settled-request và session-retry-scope; áp nguyên quy tắc mục Lỗi cũ cần tránh.
- Test viết trước:
  - [x] `test_ST3_AC1_service_shell_permissions` — input ba permission/admin/none — expected GET đúng URL, không mock/banner, shell/route đồng nhất, deny không fetch.
  - [x] `test_ST3_AC2_defaults_no_shift` — input thời điểm 13/11 18:00Z và no-shift — expected ngày VN 14/11, range 08..14, empty/no report request.
  - [x] `test_ST3_AC2_shift_pages_current` — input current OPEN ngoài trang đầu, lịch sử >100, current STAFF/no current — expected ưu tiên CASHIER OPEN, fallback gần nhất, tải thêm cursor giữ user.
  - [x] `test_ST3_AC3_filters_independent_range` — input date 14/range 01..07, all/branch/shift và 32/ngược/trống — expected query đúng scope, range không đổi date/món, invalid không fetch.
  - [x] `test_ST3_AC4_render_numbers_chart_sizes` — input 85000/35000/50000/count3 + daily zero + size revenue35000 — expected render VND, tên/size/quantity, đúng nhãn/trục/giá trị; thực thi column.render.
  - [x] `test_ST3_AC4_browser_tablet` — input 1024×768 và 1280×800 — expected mục tiêu ≥48px, label liên kết, keyboard/chart đọc được, không tràn viewport; lưu measured JSON/screenshot.
  - [x] `test_ST3_AC5_report_errors_empty_retry` — input loading/server err req-reports-1/no-message/empty — expected đúng trạng thái/error/fallback và retry đúng query, không số liệu cũ.
  - [x] `test_ST3_AC5_auxiliary_identity_errors` — input ca/branch pending, đổi identity rồi resolve/reject cũ — expected không list cũ, lỗi hiện tại giữ message/requestId, retry đúng phiên.
  - [x] `test_ST3_AC6_pending_filter_identity` — input A pending, B đã tạo rồi resolve/reject A, đổi epoch/perms và render trước effect — expected không bất kỳ report/error/list A, không fetch khi không quyền.
- Tiến độ:
  - [x] Red
  - [x] Green
  - [x] Refactor
  - [x] Test module xanh

## Ma trận AC ↔ test

| AC | Test | Input | Expected |
| --- | --- | --- | --- |
| ST-1.AC-1 | test_ST1_AC1_permissions_seeded | DB migrations thật | Ba role/permission đúng, admin không quyền, cũ giữ nguyên |
| ST-1.AC-2 | test_ST1_AC2_permissions_rollback | Up/down/up có quyền/link có sẵn và lịch sử | UUID/link giữ nguyên; down từ chối trước ghi; up lại không tăng count |
| ST-2.AC-1, E2E-AC-1 | test_ST2_AC1_paid_zero_cancelled | 35k CASH + 50k TRANSFER + 0đ + OPEN/CANCELLED | 3/85k rồi 2/50k sau hủy |
| ST-2.AC-1, E2E-AC-2 | test_ST2_AC1_vietnam_midnight | Bốn timestamp E2E-2 | Ngày 14 count2/revenue50k |
| ST-2.AC-2, RF-1, E2E-AC-1 | test_ST2_AC2_payment_amount_not_received | Tendered50k và received60k, amount35k/50k | 85k, không tính nhận thừa |
| ST-2.AC-2 | test_ST2_AC2_safe_money | MAX_SAFE và MAX_SAFE+1 từng trường tiền | Số chính xác hoặc 500/no-data/log |
| ST-2.AC-3, E2E-AC-3 | test_ST2_AC3_scope_permissions_http | Login role thật; branch/cross-store/null scope/no permission/admin | Scope đúng; 401/403/404 đúng contract |
| ST-2.AC-4, E2E-AC-3 | test_ST2_AC4_own_open_closed_shift | Own OPEN/CLOSED/other/missing/cross-store | 200/200/403/422/404 |
| ST-2.AC-4, RF-2, E2E-AC-2 | test_ST2_AC4_shift_crosses_midnight | Ca kéo qua ngày có 20k/30k | Đúng ngày, mỗi ngày một khoản |
| ST-2.AC-5, E2E-AC-4 | test_ST2_AC5_days_range_validation | Range 1/7/31/32, invalid date, leap date, query/body xấu | Zero-fill đủ ngày hợp lệ; 422 query/body sai |
| ST-2.AC-6, E2E-AC-4 | test_ST2_AC6_sizes_snapshots_toppings | 12 size/rename/giá/topping/discount/tie/cancel | Top10, group size, snapshot mới, 35k topping một lần |
| ST-2.AC-7, RF-3 | test_ST2_AC7_consistent_statement | Hủy/thanh toán song song đọc date=chart | Trước hoặc sau, không snapshot lai |
| ST-2.AC-7 | test_ST2_AC7_failure_readonly | DB failure + X-Request-Id; GET có dữ liệu | 500 chuẩn/no SQL; thành công không ghi DB |
| ST-3.AC-1, E2E-AC-5, E2E-AC-6 | test_ST3_AC1_service_shell_permissions | Ba quyền/none/admin/service query | API thật, no demo, deny không fetch |
| ST-3.AC-2, E2E-AC-5 | test_ST3_AC2_defaults_no_shift | 13/11 18:00Z, không ca | Ngày14/range08..14, empty/no report GET |
| ST-3.AC-2, RF-4 | test_ST3_AC2_shift_pages_current | Current ngoài page1, >100 ca | Current ưu tiên, load more đúng cursor |
| ST-3.AC-3, E2E-AC-4, E2E-AC-5 | test_ST3_AC3_filters_independent_range | Date14/range01..07, thay filter, range sai | Scope/range độc lập, không gửi query sai |
| ST-3.AC-4, E2E-AC-4, E2E-AC-5 | test_ST3_AC4_render_numbers_chart_sizes | API fixture tổng/chart/size | VND, size/topping label, đủ điểm |
| ST-3.AC-4, E2E-AC-5 | test_ST3_AC4_browser_tablet | Hai viewport, keyboard/touch | Kích thước/nhãn/chart/overflow đạt DESIGN |
| ST-3.AC-5, E2E-AC-5 | test_ST3_AC5_report_errors_empty_retry | Error/no-message/zero response | Message/requestId/fallback/retry/empty đúng |
| ST-3.AC-5, RF-5, E2E-AC-6 | test_ST3_AC5_auxiliary_identity_errors | Ca/branch pending qua identity | Không list cũ, error/retry đúng phiên |
| ST-3.AC-6, E2E-AC-6 | test_ST3_AC6_pending_filter_identity | A pending, B mới, epoch/perms đổi | Không dữ liệu/lỗi cũ, render trước effect an toàn |

### Ma trận AC ↔ evidence cho verify-ac của task

- Raw chỉ lưu `.devloopflow/verify/20261114-sprint10-reports/evidence/`; report/fails Markdown đã che dữ liệu. Mỗi artifact ghi lệnh, giờ, exit/status, viewport khi có, hash HEAD/diff/source trước-sau lượt QA; giữ ảnh/log gốc, không chỉ mô tả bằng lời. Đây là tên artifact dự kiến, chưa phải file đã tồn tại hoặc kết quả PASS.

| AC/phạm vi | Tình huống phải thực hiện | Artifact gốc dự kiến |
| --- | --- | --- |
| ST-1.AC-1..2 | Seed/quyền có sẵn/up idempotent/down từ chối, count migration | reports-permissions.log, migration-before-after.json |
| E2E-AC-1, ST-2.AC-1..2 | CASH/TRANSFER/0đ, hủy PAID, safe money | reports-api.log, totals-before-after.json, totals-sql.json, overflow-log.txt |
| E2E-AC-2, ST-2.AC-4..5 | Bốn mốc midnight, ca qua ngày, 1/31/32 ngày | midnight-http.json, midnight-db.json, ranges-http.json |
| E2E-AC-3, ST-2.AC-3..4 | Login role thật, ID cùng/khác store/ca/branch, URL sửa | scope-http.json, scope-db.json; che Cookie/token/username thật |
| E2E-AC-4, ST-2.AC-6, ST-3.AC-3..4 | Top10/size/rename/topping/tie, range không chứa date | bestseller-http.json, bestseller-db.json, chart-bestsellers.png, chart-values.json |
| E2E-AC-5, ST-3.AC-1..5 | UI API thật, selector/loading/empty/error/retry, tablet | network-redacted.json, ui-states-before-after.png, tablet-1024.png, tablet-1280.png, accessibility-measurements.json |
| E2E-AC-6, ST-3.AC-5..6 | Reload/hai phiên/pending cũ/deny trực tiếp | session-transition-before-after.png, identity-network.json, pending-race.log |
| RF-1..5, ST-2.AC-7 | Nhận thừa, qua ngày, snapshot đồng thời, nhiều ca, auxiliary error | reports-api.log, reports-ui.log, consistency-trace.json, auxiliary-before-after.png |
| Toàn task | API/UI full test, build/typecheck; hash mã cuối | api-full.log, ui-full.log, api-build.log, ui-typecheck.log, ui-build.log, run-manifest.json, SHA256SUMS |

- Nhãn bằng chứng: `local do agent chạy`; CI chỉ ghi khi thực sự kiểm đúng commit sau push được user yêu cầu. Không dùng test tổng thay browser hay đánh dấu S10 cấp sprint trong task này.

## Rủi ro
- SQL join item/payment làm nhân tổng hoặc bỏ 0đ — giảm bằng count invoices/LEFT JOIN payment và CTE món riêng, fixture có nhiều item/topping + 0đ.
- Bỏ scope ở một nhánh tổng/chart/món — xác định scope một lần, cùng scoped CTE và HTTP matrix cho từng phần, grep caller/branch theo M-1.
- Timestamp lấy payment/UTC làm lệch ngày — fixture bốn biên VN, SQL `invoices.paid_at`, chart range inclusive riêng.
- Kết quả SUM vượt number safe — giữ số nguyên chuỗi/BigInt tới guard, test riêng total/daily/bestseller, log và 500.
- Dữ liệu cũ lọt vào render trước effect hoặc ca/branch cũ — wrapper identity key, result query key, test promises pending thực và browser hai phiên.
- Schema không có index paid_at chuyên biệt; không có bằng chứng tải lớn trong task — SQL aggregate giới hạn ngày/scope, statement timeout hiện tại 5000ms ở data-source; ghi nhận truy vấn thật, không thêm index suy đoán. Nếu timeout do dữ liệu sandbox đủ đại diện, báo evidence và đề xuất migration riêng trước đổi plan.
- PostgreSQL không sẵn hoặc tài khoản không có CREATE DATABASE — ghi “chưa chạy”, không suy PASS; chuẩn bị sandbox trước ST-1/2 và verify-ac.
- Thay đổi chưa commit của agent khác — git status và đọc đích trước từng edit; dừng tại file xung đột, không overwrite/stash/restore; planner hiện chỉ tạo draft này.

## Lệnh kiểm tra
- Nguồn: `POS_API/package.json`, `POS_UI/package.json`, `.devloopflow/devloopflow.md` mục 2–4. Dưới đây là lệnh sẽ chạy lúc triển khai, chưa được planner chạy và không có tuyên bố PASS.
- Lint: Không có script lint ở hai manifest; không tự đặt lệnh.
- Typecheck: trong `POS_UI/`, `npm run typecheck`; backend qua build.
- Test API: trong `POS_API/`, `npm test`; cần `DATABASE_URL` PostgreSQL sandbox localhost/127.0.0.1, có quyền CREATE DATABASE; test tạo/dọn database thử riêng, không DB production. Focused sau build: `node --env-file-if-exists=.env --test --test-concurrency=1 dist/reports/tests/reports-permissions.integration.test.js dist/reports/tests/reports.test.js dist/reports/tests/reports.integration.test.js`.
- Test UI: trong `POS_UI/`, `npm test`; focused `node --experimental-strip-types --test test/report-service.test.mjs test/reports-screen.test.mjs test/app-invoices-shell.test.mjs`.
- Browser UI riêng: trong `POS_UI/`, `node --test test/reports-accessibility.browser.mjs`; Chrome/Chromium có sẵn, `CHROME_BIN` theo pattern browser suite hiện hành; không thêm thư viện.
- Build API: trong `POS_API/`, `npm run build`; build UI: trong `POS_UI/`, `npm run build`.
- Coverage: Không có script hoặc ngưỡng coverage trong manifest/CI; không tuyên bố số coverage.
- Chạy migration mới: trong `POS_API/`, `npm run migration:run`, chỉ DB local/test đã xác nhận; không schema:sync.
- Chạy app: từ gốc `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait`; UI `http://localhost:5173`, API `http://localhost:3000/api/v1/health`. Giữ volume; dừng bằng cùng compose `down` không `-v`.
- Sau edit code: agent chính chạy `graphify update .`; sau Markdown mới/sửa, semantic update đúng tài liệu thay đổi theo `.codex/skills/graphify/references/update.md`, query xác nhận rồi mới xóa marker nếu có; không trích xuất lại hàng trăm hồ sơ lịch sử.

## Câu hỏi mở
- Không có câu hỏi nghiệp vụ/giả định cần user xác nhận ngoài việc duyệt plan này. Những lựa chọn kỹ thuật đã nêu thuộc quyền planner trong spec đã duyệt.

## Changelog plan
- 2026-11-14: tạo plan nháp từ spec đã duyệt, kiểm source/INDEX/MEMORY; phát hiện cần migration quyền báo cáo, cập nhật count migration và ba điểm shell/route/navigation cùng assertion demo hiện hành.
- 2026-11-14: theo kiểm của agent chính, chọn timestamp migration 20261114000001 không trùng; down từ chối trước ghi để giữ permission/link có sẵn; định vị test navigation thật tại organization-screen.test.mjs.
- 2026-11-14: user nói "duyệt plan"; plan chuyển sang active và approved.
- 2026-11-14 (sau khi đóng task): user chọn "2" cho B-59: tab Báo cáo ở navigation/App/AppShell chỉ hiện khi có `report.view_shift`, `report.view_branch`, hoặc `report.view_all` kèm `branch.access_all` (quy tắc M-45). Đổi câu ST-3.AC-1 và cho phép đổi assertion test cũ `test_ST3_AC1_service_shell_permissions shell` tương ứng.

## Kiểm tra sẵn sàng
- [x] Không có chỗ mơ hồ hoặc placeholder chờ quyết định: query/response/scope/defaults/error đều có contract, file và test cụ thể.
- [x] Mọi fact/quy tắc/field/endpoint có path nguồn hoặc quyết định user: spec là nguồn endpoint mới; SQL/chữ ký nội bộ ghi rõ thiết kế được planner chọn.
- [x] Giữ đủ mục template: mục không có ghi lý do, từng ST có DTO/DB/API/edge/caller/side effect/test/progress.
- [x] Interfaces: ST-2 Consumes ba permission đúng Produces ST-1; ST-3 Consumes HTTP/query/response đúng Produces ST-2; không interface code nội bộ chéo backend/UI.
- [x] Review Focus: RF-1..5 có test sở hữu và dòng ma trận tương ứng.
- [x] Câu hỏi mở không còn điểm cần làm rõ; không có giả định chưa xác nhận, defaults/tên/range/ca lấy spec đã duyệt.
- [x] Mỗi sub-task có AC đo được, plan riêng và test input/expected, kết thúc build/test xanh trước ST sau.
- [x] Mọi AC có ít nhất một test trong ma trận; mọi test đã liệt kê thuộc AC; E2E có artifact thực cần thu.
- [x] Có happy path, sai/thiếu/field lạ, quyền, ngày/range/money boundary, DB/UI error và pending race.
- [x] Mỗi AC E2E/ST nằm một dòng riêng bắt đầu `- [ ]`, chưa tick trước triển khai.
- [x] File sửa/tạo gồm migration, foundation, module/controller/DTO/service, API tests, UI caller/shell/styles/tests; tài liệu dự án tách đề xuất sync-docs cụ thể.
- [x] Đã đọc INDEX và file lỗi liên quan; quy tắc nguyên văn giữ ở Lỗi cũ cần tránh và áp cho ST.
- [x] Lệnh lint/typecheck/test/build/coverage/app từ manifest/cấu hình thật; focused đường dẫn khớp file test được plan tạo; không có lệnh lint tự đặt.
- [x] Agent triển khai có thể đọc plan + nguồn để thực hiện: scope, shape, dữ liệu mẫu, thiết kế SQL/UI, thứ tự phụ thuộc, lỗi và evidence đã ghi; không cần tự quyết business rule mới.
