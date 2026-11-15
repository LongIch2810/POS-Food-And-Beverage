---
id: 20261115-sprint10-stock-ledger
status: approved
approved_at: 2026-11-15
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Spec: Tab Sổ kho — hoàn thiện sau kiểm app thật (Sprint 10, S10-11)

## Mục đích và lý do
- Kiểm trên app thật (2026-11-15) cho thấy tab Sổ kho chạy đúng về dữ liệu, quyền, lọc chi nhánh, đổi phiên và trạng thái rỗng/lỗi, nhưng có các chỗ khó dùng: chủ quán xem "Tất cả chi nhánh" không biết dòng nào của chi nhánh nào (M1); cột Ghi chú hiện UUID hóa đơn 36 ký tự (M2); nút "Thử lại" thấp hơn 48px (L1); lỗi mất mạng khi đọc hiện câu dành cho thao tác ghi (L2); tiêu đề của quản lý ghi "Tất cả chi nhánh" dù chỉ thuộc một chi nhánh (L3); F5 ở tab Sổ kho quay về Cài đặt (L4); mở màn Kho tải cả ba nguồn dữ liệu dù chỉ xem một tab (L5); số dương không có dấu "+" (V2); thứ tự chi nhánh trong ô chọn không theo tên (V1, phần ô chọn); file mock không dùng (V3). (nguồn: `.devloopflow/verify/20261115-sprint10-stock-ledger/current-state.md`, mục B)
- User yêu cầu sửa M1 và M2 ("sửa"), rồi yêu cầu làm luôn toàn bộ các mục còn lại trong Sprint 10 ("làm luôn", 2026-11-15) để tab đạt S10-11 theo cách chủ quán và nhân viên dùng được. (nguồn: `sprints/sprint-10/SPRINT.md:42`)

## Thành công trông như thế nào
- OWNER mở Kho → Sổ kho → "Tất cả chi nhánh" thấy mỗi dòng có tên chi nhánh; hai dòng giống nhau của hai chi nhánh phân biệt được.
- Dòng Xuất bán và Hoàn trả kho hiện mã hóa đơn ngắn dạng `HD` + 8 ký tự (ví dụ minh họa `HDRD17W1JQ`) thay vì UUID.
- Cùng dữ liệu, danh sách sổ kho trước và sau thay đổi có cùng thứ tự dòng, cùng `total` và cùng `nextCursor`; chỉ thêm hai field.
- Nút "Thử lại" trên màn Kho cao ít nhất 48px; lỗi mất mạng khi đọc hiện câu nói về việc không tải được dữ liệu, không nói về "kết quả thao tác".
- Tiêu đề của MANAGER hiện tên chi nhánh của họ; chỉ người có quyền xem mọi chi nhánh mới thấy "Tất cả chi nhánh".
- Bấm F5 ở bất kỳ màn nào (ví dụ Kho → Sổ kho) quay lại đúng màn đó, không về Cài đặt; mở link màn mà tài khoản không có quyền thì không vào được màn đó.
- Mở màn Kho không tải dữ liệu của các tab chưa mở; số dương trong cột Thay đổi có dấu "+"; ô chọn chi nhánh xếp theo tên.

## Mục tiêu
- API sổ kho trả thêm tên chi nhánh và mã hóa đơn cho mỗi dòng (M1, M2).
- Màn Sổ kho hiện cột Chi nhánh trong đúng trường hợp bảng Tồn kho đã hiện cột Chi nhánh (người xem có quyền xem mọi chi nhánh và chưa chọn một chi nhánh cụ thể), và hiện mã hóa đơn ở cột Ghi chú (M1, M2).
- Nút "Thử lại" của màn Kho đạt chiều cao tối thiểu 48px (L1).
- Lỗi mất mạng khi đọc dữ liệu hiện câu phù hợp với việc đọc; câu cho thao tác ghi giữ nguyên (L2).
- Tiêu đề hiện đúng tên chi nhánh của người bị gắn một chi nhánh; "Tất cả chi nhánh" chỉ cho người có quyền xem mọi chi nhánh (L3).
- App dùng router thật (thư viện `react-router-dom`, địa chỉ sạch dạng `/kho/so-kho`, không dấu `#`): mỗi tab chính và MỌI tab con hiện có có địa chỉ riêng; F5, nút Quay lại/Tiến của trình duyệt và mở link đều về đúng màn; địa chỉ không chứa dữ liệu nhạy cảm; đăng xuất hoặc đổi tài khoản không để lại màn của người trước; quyền vẫn được kiểm khi mở link (L4, user chọn "Tab chính và mọi tab con" và "Địa chỉ sạch /kho/so-kho", 2026-11-15).
- Màn Kho chỉ tải dữ liệu của tab đang mở; "Tải lại" và đổi chi nhánh tải lại tab đang mở (L5).
- Số dương trong cột Thay đổi của Sổ kho có dấu "+" (V2).
- Ô chọn chi nhánh trên màn Kho xếp theo tên (V1, phần ô chọn).
- Xóa file `POS_UI/src/features/inventory/StockMovementsTab.tsx` (mock cũ không được import ở đâu) (V3, user: "xóa file mock chết").

## Phi mục tiêu (cố ý không làm)
- Đổi thứ tự dòng sổ kho giữa các dòng cùng thời điểm (user chọn giữ cách xếp hiện tại vì liên quan phân trang, V1 phần dòng); đổi thông điệp/`details: []` của lỗi 422 (V2 phần lỗi).
- Thêm API nhập tồn, sửa, xóa hay ghi sổ kho; đổi quy tắc ghi sổ kho (BR-44..47).
- Đổi quyền, phạm vi chi nhánh hoặc phân trang của `GET /api/v1/stock-movements`.
- Thêm bộ lọc theo mã hóa đơn hoặc theo tên chi nhánh.
- Đưa trạng thái bộ lọc, trang hay ID bản ghi lên địa chỉ web (ví dụ chi nhánh đang chọn, hóa đơn đang mở); chỉ tab chính và tab con có địa chỉ. Việc mở thẳng một hóa đơn qua `targetInvoiceId` giữ cơ chế hiện có.
- Cấu hình máy chủ triển khai thật cho đường dẫn sạch (PB-14 ngoài Sprint 10); chỉ bảo đảm chạy được trên Vite dev server của Docker local.
- Xóa mock engine hay dữ liệu mock khác ngoài file `StockMovementsTab.tsx`.

## Phản mục tiêu (làm ra mà vẫn bị coi là thất bại)
- Lộ tên chi nhánh hoặc mã hóa đơn của cửa hàng khác, hoặc của chi nhánh ngoài phạm vi của người xem.
- Đổi thứ tự dòng, số dòng, `total` hoặc `nextCursor` của danh sách hiện có; làm hỏng test phân trang cursor hiện có.
- Làm UI của MANAGER (chỉ một chi nhánh) rối thêm một cột thừa.
- Mở được màn qua link/địa chỉ web mà tài khoản không có quyền, hoặc để lại màn/dữ liệu của người dùng trước sau khi đổi tài khoản.
- Tab trống hoặc hiện dữ liệu cũ vì tab chưa tải (hỏng do việc chỉ tải dữ liệu của tab đang mở); dòng lỗi của một tab làm trắng dữ liệu của tab khác.
- Đổi câu báo lỗi mất mạng của thao tác ghi, hoặc làm đổi câu ở các màn khác ngoài phần đọc dữ liệu.

## Hiện trạng
- `GET /api/v1/stock-movements` yêu cầu `inventory.view`, chỉ OWNER và MANAGER có quyền này; MANAGER bị khóa vào chi nhánh phiên và gửi `branchId` thì 422; OWNER có thể lọc `branchId` (nguồn: `POS_API/src/inventory/inventory.controller.ts:77-86`, `POS_API/src/inventory/inventory.service.ts:29-37,234-260`, `POS_API/src/database/migrations/20261107000000-InventoryPromotions.ts:99-107`).
- `MovementDto` hiện gồm `id, branchId, ingredientId, ingredientName, unit, type, quantity, balanceAfter, invoiceId, note, createdAt`; không có tên chi nhánh, không có mã hóa đơn (nguồn: `POS_API/src/inventory/inventory.service.ts:256-259`, `.devloopflow/specs/inventory.md` mục DTO).
- Mã hóa đơn nằm ở `invoices.invoice_code` (`varchar(10)`, duy nhất, dạng `^HD[A-Z0-9]{8}$`); dòng SALE và SALE_REVERSAL có `invoice_id` (nguồn: `POS_API/src/database/migrations/20261106000000-Sales.ts:13,28`, `POS_API/src/sales/sales.service.ts:384-388,547-549`).
- UI Sổ kho dựng bảng từ `inventoryService.movements()`; cột Ghi chú là `row.note || row.invoiceId || '—'`; bảng Tồn kho đã có cột Chi nhánh với điều kiện `allBranches && !branchId`; mở màn gọi cả `ingredients`, `stocks`, `movements` trong một `Promise.all` và một lỗi xóa cả ba (nguồn: `POS_UI/src/features/inventory/InventoryScreen.tsx:35-37,61-70,98,117-125,151`, `POS_UI/src/features/inventory/inventoryService.ts:5-6,26`).
- Lỗi mất mạng của HTTP client dùng một câu chung "Chưa xác nhận được kết quả. Kiểm tra kết nối và tải lại danh sách trước khi thử lại." cho mọi phương thức (nguồn: `POS_UI/src/http/client.ts:27`).
- Tiêu đề hiện `session.branch_name || 'Tất cả chi nhánh'`; `branch_name` là field tùy chọn của session (nguồn: `POS_UI/src/components/common/AppShell.tsx:128-130`, `POS_UI/src/types/auth.ts:64,72`).
- Tab chính hiện có (đều phải có địa chỉ riêng): Cửa hàng (`platform_stores`), Chủ quán (`platform_owners`), Bán hàng (`pos`), Sơ đồ bàn (`tables`), Hóa đơn (`invoices`), Ca làm (`shifts`), Kho hàng (`inventory`), Báo cáo (`reports`), Thực đơn (`products`), Cài đặt (`settings`) (nguồn: `POS_UI/src/components/common/AppShell.tsx:109-122`, `POS_UI/src/app/App.tsx:74-134`). Tab con rà thêm trong plan, gồm ít nhất Kho (Tồn kho/Sổ kho/Nguyên liệu), Cài đặt (Tổ chức/Khuyến mãi; Chi nhánh/Bàn/Tài khoản), Bán hàng (Thực đơn/Bàn) và mọi tab con khác plan tìm thấy.
- App không dùng router; màn hiện tại là state `useState<NavTab>(availableTabs[0] ?? 'settings')` (nguồn: `POS_UI/src/app/App.tsx:51-55`, `CLAUDE.md` mục "Cấu trúc mã").
- `StockMovementsTab.tsx` dùng mock và không được import ở đâu trong `POS_UI/src` và `POS_UI/test` (nguồn: `grep` của agent chính 2026-11-15: chỉ có chính file).

## Ràng buộc
- API chỉ thêm field vào phản hồi (tương thích ngược); không đổi quyền, phạm vi, sắp xếp, phân trang, mã lỗi của `GET /stock-movements`; không migration mới (dữ liệu cần hiện đã có sẵn trong DB).
- `store_id` và phạm vi chi nhánh vẫn lấy từ danh tính, không thêm cách truy cập mới (nguồn: `CLAUDE.md` mục "Quy tắc sản phẩm cần giữ"; `.devloopflow/errors/20261110-backlog-branch-scope-null-branchid-fail-open.md`).
- Tablet ngang 1024×768, tiếng Việt, vùng chạm theo `DESIGN.md` (nguồn: `CLAUDE.md` mục "Quy tắc sản phẩm cần giữ"). Điều kiện nghiệm thu, chưa phải fact đã đo: bảng có thêm cột Chi nhánh không làm trang cuộn ngang ở 1024×768 (lần đo trước chỉ có cột Ghi chú UUID, `.devloopflow/verify/20261115-sprint10-stock-ledger/current-state.md` dòng 41).
- Nếu tên chi nhánh của người dùng phải lấy từ API phiên (đăng nhập, khôi phục phiên), việc thêm field phải tương thích ngược, kèm test, và cập nhật spec/tài liệu auth liên quan cùng lúc với code (nguồn: `.devloopflow/MEMORY.md` M-4 theo tinh thần "cập nhật spec cùng code").
- Địa chỉ web chỉ chứa tên tab (chính và con), không chứa ID, token hay dữ liệu cửa hàng; mọi kiểm quyền màn vẫn do quyền của phiên đang đăng nhập quyết định, không do địa chỉ (nguồn: `CLAUDE.md` "Quy tắc sản phẩm" và `rules/security.md`; `.devloopflow/MEMORY.md` M-41).
- Địa chỉ bắt đầu bằng `/api` vẫn thuộc API qua proxy của Vite, không bị router bắt (nguồn: `POS_UI/vite.config.ts` proxy `/api`; `CLAUDE.md` "Quy ước API").
- Thêm thư viện `react-router-dom` là dependency trực tiếp mới: ghim phiên bản có sẵn từ ít nhất hai tuần, cập nhật `POS_UI/package.json`, `package-lock.json` và `docs/architecture/TECH_STACK.md` cùng thay đổi (nguồn: `CLAUDE.md` mục "Cách làm việc": thêm thư viện thì cập nhật file tech stack cùng thay đổi). Các test UI hiện nạp mã bằng `node:vm` và chặn import lạ nên phải cập nhật harness đúng cách, không sửa yếu test cũ (`.devloopflow/MEMORY.md` M-28).
- Thay đổi dùng chung (HTTP client câu lỗi đọc, điều hướng app, tiêu đề) phải giữ xanh toàn bộ test UI hiện có; test cũ của các màn khác không bị sửa yếu đi (nguồn: `.devloopflow/devloopflow.md` mục 4; `.devloopflow/MEMORY.md` M-28, M-42).
- Xóa `StockMovementsTab.tsx`: đúng một file, đường dẫn `D:\saved\Project\POS-F&B\POS_UI\src\features\inventory\StockMovementsTab.tsx`, user đã yêu cầu xóa ("xóa file mock chết"); thực hiện sau khi `grep` xác nhận vẫn không có nơi nào import (nguồn: `CLAUDE.md` mục "Bảo vệ source code").

## Các phần cách làm user đã quyết
- Sửa M1 và M2 ("sửa", 2026-11-15) và làm luôn các mục còn lại ("làm luôn", 2026-11-15).
- F5 về đúng màn: user yêu cầu dùng router cho từng tab ("Dùng router cho từng tab phải dùng router", 2026-11-15); phạm vi "Tab chính và mọi tab con" và kiểu "Địa chỉ sạch /kho/so-kho" (hai câu hỏi về phạm vi và kiểu địa chỉ, 2026-11-15). Lựa chọn trước đó "đặt tên màn lên địa chỉ web" được thay bởi quyết định này.
- Thứ tự dòng cùng thời điểm: chọn "Giữ cách xếp, chỉ sửa thứ tự chi nhánh trong ô chọn" (câu hỏi "Hai dòng sổ kho xảy ra cùng một lúc ...", 2026-11-15).

## Quyết định của agent (user kiểm khi đọc)
- Hai field mới của `MovementDto`: `branchName: string` (luôn có) và `invoiceCode: string | null` (null khi dòng không gắn hóa đơn, ví dụ IMPORT). Giữ nguyên `branchId` và `invoiceId`. Lý do: thêm field tương thích ngược.
- Cột "Chi nhánh" của Sổ kho theo cùng điều kiện với cột Chi nhánh của bảng Tồn kho (`InventoryScreen.tsx:98`). Lý do: nhất quán trong cùng màn, tránh cột thừa.
- Cột Ghi chú giữ thứ tự ưu tiên hiện có: `note`, nếu không có thì mã hóa đơn, nếu không thì "—". Hệ quả chủ ý: dòng có cả `note` và hóa đơn sẽ hiện `note`; hiện nay dòng SALE và SALE_REVERSAL không ghi `note` (`POS_API/src/sales/sales.service.ts:385,547`), nên cả hai luôn hiện mã.
- L2: câu lỗi mất mạng riêng cho thao tác đọc (GET) áp dụng trong HTTP client chung, để mọi màn đọc dữ liệu nhất quán; nội dung câu do plan chọn, phải nói rõ không tải được dữ liệu và gợi ý kiểm tra kết nối rồi thử lại. Lý do: một chỗ sửa, tránh câu sai ngữ cảnh ở mọi màn.
- L4: địa chỉ không khớp hoặc chỉ tới tab mà tài khoản không có quyền thì chuyển (thay thế lịch sử) tới tab đầu tiên tài khoản được phép; chưa đăng nhập thì mở màn đăng nhập rồi sau đăng nhập vào tab đầu tiên được phép (không quay lại địa chỉ cũ vì có thể thuộc người khác). Nút Quay lại không đưa người dùng vào màn của phiên trước. Lý do: tránh lộ màn và khớp quy tắc đổi phiên.
- Danh sách tab chính và tab con cụ thể, tên địa chỉ (slug tiếng Việt không dấu như `kho/so-kho`) do plan liệt kê bằng cách rà mã hiện có (Kho, Cài đặt, Bán hàng, Hóa đơn, Báo cáo, Quản trị nền tảng...).
- L5: dữ liệu tải theo tab đang mở; trạng thái đang tải/lỗi/rỗng của từng tab độc lập. Lý do: tránh một lỗi làm trắng cả ba nguồn.
- V2: chỉ thêm dấu "+" cho số dương, không phụ thuộc màu để phân biệt dấu. Lý do: tiếp cận được, không đổi bố cục.
- Bước đồng bộ tài liệu cuối task (không thuộc code) cập nhật `.devloopflow/specs/inventory.md`: dòng 7, 19, 60 (câu lỗi thời "Không có ... SALE/SALE_REVERSAL ...", "Sổ kho chỉ đọc trong Sprint 07 ... không có API tạo movement", ví dụ "mảng rỗng trước PB-09" và "không có POST/PATCH/DELETE movement trong Sprint 07"), thêm hai field vào `MovementDto` ở dòng 25, nêu rõ MANAGER gửi `branchId` (kể cả chi nhánh của mình) trả 422 (`POS_API/src/inventory/inventory.service.ts:30-31`); cập nhật tài liệu auth nếu phiên có thêm field; `docs/api-spec.md` không mô tả `MovementDto` (dòng 490 chỉ trỏ sang spec kho) nên không áp dụng cho DTO này.

## Để người viết plan tự chọn
- Cách nối bảng trong truy vấn, tên field trong kiểu TypeScript, kiểu hiển thị cột Chi nhánh, tên test, cách dựng dữ liệu test, nguồn tên chi nhánh cho tiêu đề, định dạng địa chỉ web của màn, nội dung câu lỗi đọc, cách chia tải theo tab.

## Câu hỏi mở
- (không có)

## Changelog spec
- 2026-11-15: tạo (draft) từ báo cáo hiện trạng và quyết định "sửa" của user.
- 2026-11-15: sửa theo `spec-reviewer` (chốt điều kiện hiện cột theo bảng Tồn kho `InventoryScreen.tsx:98`; nêu hệ quả `note` trước mã hóa đơn; thêm tiêu chí giữ nguyên thứ tự/total/nextCursor; sửa danh sách dòng cần cập nhật ở `inventory.md`: 7, 19, 60 và DTO dòng 25; nêu `api-spec.md` không áp dụng; ghi "ví dụ minh họa"; bỏ chi tiết cài đặt; ghi điều kiện cuộn ngang là điều kiện nghiệm thu).
- 2026-11-15: mở rộng phạm vi theo user ("làm luôn"): thêm L1 (nút 48px), L2 (câu lỗi đọc), L3 (tiêu đề chi nhánh), L4 (F5 qua địa chỉ web, user chọn), L5 (tải theo tab), V1 (chỉ thứ tự ô chọn chi nhánh, user chọn giữ thứ tự dòng), V2 (dấu "+"), V3 (xóa `StockMovementsTab.tsx`); phi mục tiêu còn lại: thứ tự dòng, thông điệp 422, router thư viện. Chưa qua `spec-reviewer` lần nữa (chỉ đọc thử một lần theo quy trình); user duyệt trực tiếp.

- 2026-11-15: user yêu cầu dùng router thật cho từng tab ("Dùng router cho từng tab phải dùng router"); chọn phạm vi "Tab chính và mọi tab con" và địa chỉ sạch `/kho/so-kho`. Thay mục L4 (không router) bằng router `react-router-dom` BrowserRouter cho tab chính và mọi tab con; phi mục tiêu: trạng thái bộ lọc/ID không lên địa chỉ, không cấu hình máy chủ triển khai; ràng buộc: dependency mới và cập nhật `TECH_STACK.md`, `/api` không bị router bắt, cập nhật harness test `node:vm`. Chưa qua `spec-reviewer` lần nữa.

- 2026-11-15: user duyệt spec ("duyệt spec"); status approved.

## Kiểm tra sẵn sàng
- [x] Người chưa thấy cuộc trò chuyện đọc spec + docs dự án hiểu cần làm gì và vì sao
- [x] Mỗi fact có nguồn hoặc ghi rõ "user nói"
- [x] Không có chi tiết cài đặt (thuộc plan)
- [x] "Câu hỏi mở" rỗng
- [x] Mỗi quyết định của agent đã được liệt kê
