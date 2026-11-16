# Sprint 10 — Báo cáo doanh thu và Sổ kho

**Trạng thái:** Đã chốt phạm vi ngày 14/11/2026; bắt đầu 14/11/2026, Product Owner chốt ngày kết thúc 16/11/2026. Task Báo cáo và Sổ kho đã đóng; QA cấp sprint vòng 1 ngày 16/11/2026 FAIL (6/7 AC); vòng 3 cùng ngày PASS 7/7 AC (xem [report-3](../../.devloopflow/verify/20261116-sprint10-qa/report-3.md)). Sprint Review và Retrospective đã ghi. Mã đã merge vào `master` (PR #24, merge commit `ebf4e5e`) và CI GitHub Actions trên commit đó thành công. **Sprint 10 đã đóng ngày 16/11/2026** (QA local; không phải xác nhận production).

**Nguồn:** [Product Backlog](../../docs/PRODUCT_BACKLOG.md) PB-12/PB-13; [Sprint 09](../sprint-09/SPRINT.md) mục ranh giới và quyết định đóng; [Product Overview](../../docs/PRODUCT_OVERVIEW.md) mục 5; [Business Rules](../../docs/BUSINESS_RULES.md) BR-62..66 và BR-77; [thiết kế UI](../../DESIGN.md) mục 5.6; [quy ước API](../../docs/api-spec.md).

## Cơ sở và quyết định phạm vi

- Sprint 09 đã đóng với 6/6 AC đạt trong QA local; mã Sprint 09 đã tích hợp vào `master` và CI backend/frontend đã xanh theo [README](../../README.md). PB-12 phụ thuộc PB-09 và PB-11, đã hoàn thành trong Sprint 08/09. QA local và CI không phải xác nhận production.
- Product Owner chọn **PB-12 báo cáo doanh thu**, **lát cắt PB-13 UI Báo cáo dùng API thật**, bắt đầu **14/11/2026**. Product Owner cũng chọn thêm **biểu đồ cột doanh thu theo ngày và danh sách món bán chạy** theo `DESIGN.md`. Phần món bán chạy thuộc phạm vi Sprint 10 do Product Owner yêu cầu (Product Overview và BR-66 đã cập nhật theo), không kéo theo toàn bộ báo cáo tuần/tháng, giờ cao điểm hoặc lợi nhuận gộp.
- Product Owner bổ sung kiểm tra và hoàn thiện tab **Sổ kho** trong Sprint 10. Kiểm tra source: màn đang dùng `InventoryScreen.tsx`, gọi `inventoryService.movements()` và API `GET /api/v1/stock-movements`; component `StockMovementsTab.tsx` dùng mock không được màn này import. Cần kiểm browser/API/DB và sửa phần thực sự thiếu nếu có; chưa kết luận QA mới chỉ từ đọc mã.
- PB-14 vận hành VPS, backup và khôi phục **không thuộc Sprint 10**.
- Theo quyết định chủ dự án, đây là project cá nhân phục vụ học tập; SePay chỉ dùng Test mode, không triển khai hoặc yêu cầu kiểm Live.
- Baseline lập sprint: `master` tại `46692c9`, working tree sạch. `POS_API/src/app.module.ts` chưa đăng ký module báo cáo; `POS_UI/src/features/reports/reportService.ts` gọi `MockEngine`, `DailyReportScreen.tsx` còn dùng dữ liệu/chi nhánh từ mock. Điều hướng và màn hiện chỉ xét `report.view_branch`/`report.view_all`, chưa phục vụ `report.view_shift` của CASHIER. `docs/api-spec.md` nêu `GET /reports/revenue` nhưng trỏ tới `.devloopflow/specs/legacy-reports.md` không tồn tại; cần lập spec thật trước khi triển khai.

## Sprint Goal

Người có quyền xem doanh thu theo ngày Việt Nam trong đúng phạm vi ca, chi nhánh hoặc cửa hàng; thấy tổng tiền tách tiền mặt/chuyển khoản, biểu đồ doanh thu theo ngày và món bán chạy. Màn Báo cáo lấy dữ liệu API thật, hiển thị tiếng Việt và VND trên tablet ngang.

## Sprint Backlog và thứ tự thực hiện

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Refinement và spec PB-12 + PB-13 | Chốt hợp đồng API, định nghĩa doanh thu/số đơn, ngày Việt Nam, phạm vi `report.view_shift`/`report.view_branch`/`report.view_all`, khoảng ngày biểu đồ, cách xếp hạng món, phân trang/giới hạn và trạng thái UI; lập plan AC ↔ test/evidence. Sửa tham chiếu spec báo cáo không tồn tại trong `docs/api-spec.md` khi đã có spec mới. | Đối chiếu BR, DB, API convention, hóa đơn/ca và UI hiện tại; giải quyết các điểm mở bên dưới. | Đã có spec/plan; QA cấp sprint vòng 1 ghi trong report |
| 2 | PB-12 — API báo cáo | API tổng hợp từ dữ liệu thật của hóa đơn/thanh toán, chỉ tính đơn `PAID`, ngày theo `paid_at` ở `Asia/Ho_Chi_Minh`, tách CASH/TRANSFER và áp đúng quyền/phạm vi; cung cấp chuỗi ngày và món bán chạy theo spec đã chốt. | Spec và plan đã chốt; PostgreSQL sandbox. | Đã triển khai; S10-01..04 đạt QA vòng 1 |
| 3 | PB-13 — UI Báo cáo | Thay nguồn mock bằng API, hỗ trợ CASHIER xem ca của mình, MANAGER chi nhánh mình, OWNER toàn cửa hàng/chọn chi nhánh; ngày, tổng tiền, cơ cấu thanh toán, biểu đồ và món bán chạy; trạng thái tải/rỗng/lỗi, đổi phiên không lộ dữ liệu cũ. | API item 2 đã kiểm theo spec. | Đã triển khai; S10-06 đạt, S10-05 còn FAIL QA vòng 1 |
| 4 | PB-13 — Sổ kho | Kiểm tra tab Sổ kho hiện có với API thật, dữ liệu, quyền và phạm vi chi nhánh; tái sử dụng phần đã hoạt động và sửa phần thiếu nếu kiểm chứng phát hiện. | Đối chiếu spec kho, API và màn hiện tại; lập plan/QA tương ứng. | Task Sổ kho đã đóng; S10-11 đạt trong QA cấp sprint vòng 1 |
| 5 | Review và nghiệm thu cấp sprint | Review code, kiểm từng AC S10 trên API/DB/browser cuối cùng; lưu artifact gốc và hash mã đầu/cuối lượt QA, đối chiếu CI trên đúng commit khi tích hợp. Sprint Review và Retrospective là bước riêng sau QA. | Item 1–4 hoàn tất, ma trận AC ↔ artifact đã lập. | QA vòng 3 PASS 7/7 AC (16/11/2026); CI trên working tree chưa có |

## Tiêu chí nghiệm thu cấp Sprint 10

Ô ☑ chỉ được điền sau lượt QA cấp sprint trên mã/UI cuối với artifact gốc đủ từng vế. Vòng 3 ngày 16/11/2026 đạt 7/7 AC trên mã cuối. Chứng cứ: [report cấp sprint](../../.devloopflow/verify/20261116-sprint10-qa/report-3.md), raw artifact local trong `evidence/`. Chi tiết endpoint, giới hạn và công thức đã chốt trong spec Báo cáo và Sổ kho.

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu | Nghiệm thu |
| --- | --- | --- | --- | --- |
| S10-01 | Doanh thu ngày chỉ tính hóa đơn `PAID` có `paid_at` thuộc ngày `Asia/Ho_Chi_Minh` đã chọn; `OPEN`/`CANCELLED` không tính, kể cả hóa đơn hủy sau khi đã thanh toán. Hai mốc sát nửa đêm UTC+7 được gom đúng ngày. | PB-12; BR-62..63 | Test PostgreSQL và HTTP với hóa đơn tại biên ngày, trước/sau hủy; SQL đối chiếu tổng. | ☑ |
| S10-02 | Tiền mặt và chuyển khoản được tổng hợp riêng; tổng doanh thu bằng tổng hai phần, không làm tròn hoặc tràn số tiền. | PB-12; BR-64; API convention | Test/API/DB với CASH, TRANSFER và ngày rỗng; đối chiếu số nguyên. | ☑ |
| S10-03 | CASHIER chỉ xem ca của mình, MANAGER chỉ xem chi nhánh mình, OWNER xem toàn store hoặc từng chi nhánh; truy vấn vượt quyền/cross-store và PLATFORM_ADMIN bị chặn, kể cả khi tự sửa tham số URL. | PB-12; BR-65, BR-77 | HTTP theo vai trò và ID thật, gồm ca/chi nhánh/store khác; so với DB. | ☑ |
| S10-04 | Biểu đồ cột trả doanh thu theo từng ngày Việt Nam trong khoảng đã chốt; danh sách món bán chạy lấy từ đơn `PAID`, phản ánh đúng phạm vi và không tính đơn đã hủy. Quy tắc khoảng ngày, xếp hạng và giới hạn được chốt ở spec trước code. | Quyết định Product Owner 14/11; DESIGN mục 5.6; BR-62..65 | API/DB với nhiều ngày, món và đơn hủy; browser kiểm nhãn/trục/giá trị. | ☑ |
| S10-05 | UI Báo cáo dùng API thật, không lấy mock làm nguồn dữ liệu; ngày/chi nhánh/ca phù hợp quyền, hiển thị tiền VND và tiếng Việt, có trạng thái tải/rỗng/lỗi rõ ràng trên tablet ngang. | PB-13; DESIGN mục 5.6 | Browser 1024×768, network method/path/status đã che, ảnh/snapshot và DB đối chiếu. | ☑ |
| S10-06 | Sau reload hoặc đổi người dùng/chi nhánh, UI không giữ báo cáo của phiên trước; người không có quyền không thấy dữ liệu dù dùng URL màn Báo cáo trực tiếp. | PB-13; BR-65, BR-77 | Browser hai phiên và HTTP/network, kiểm dữ liệu trước/sau. | ☑ |
| S10-11 | Tab Sổ kho hiển thị biến động thực từ API theo quyền và chi nhánh, gồm xuất bán và hoàn trả kho khi có dữ liệu; reload hoặc đổi phiên không lộ dữ liệu cũ, trạng thái rỗng/lỗi rõ ràng. | PB-08, PB-13; BR-44, BR-72; yêu cầu Product Owner | Browser/network và DB đối chiếu SALE/SALE_REVERSAL, lọc chi nhánh, quyền/cross-store, reload/đổi phiên. | ☑ |

## QA cấp sprint — vòng 1 (16/11/2026)

- Kết luận: FAIL, 6/7 tiêu chí đạt. Báo cáo và từng vế AC: [report-1.md](../../.devloopflow/verify/20261116-sprint10-qa/report-1.md); sổ FAIL: [fails.md](../../.devloopflow/verify/20261116-sprint10-qa/fails.md). Raw evidence nằm local trong `.devloopflow/verify/20261116-sprint10-qa/evidence/`.
- Bản kiểm: nhánh `feat/sprint10-reports`, HEAD `19ef547292ecf0ef0586f9c466d34ceb7478dd46` cùng working tree chưa commit; hash 288 file đầu/cuối không đổi (`evidence/r1-source-comparison.json`). API 256/256, UI 221/221, browser regression 9/9; sandbox API/DB/UI riêng đã dọn (`remaining: 0`). Không có CI trên đúng working tree chưa commit.
- V1-1 / S10-05: Chrome QA 1024×768 hiện ô ngày `11/14/2026` và khoảng ngày `11/01/2026`–`11/07/2026`, khác `dd/MM/yyyy` của `docs/PRODUCT_OVERVIEW.md:214` và `DESIGN.md:635`. S10-05 giữ ☐.
- V1-2 / mục tiêu router của spec Sổ kho: Back từ tab Danh mục sang Kích cỡ vẫn giữ dialog “Thêm danh mục mới” phủ tab mới. Đây là B-66 đã có trong backlog; QA tái hiện trên app/API sandbox thật. B-67 không tái hiện trong browser regression 9/9, vẫn chờ xử lý trong backlog.
- Chưa nghiệm thu Sprint 10 hoặc đánh dấu kết thúc. Sau khi xử lý hai FAIL, kiểm AC lại bằng lượt QA mới; Sprint Review, Retrospective và CI trên commit tích hợp là các bước riêng.

## Ranh giới và điểm cần chốt trước code

1. Khoảng ngày của biểu đồ, ngày được chọn đóng vai trò gì, có cho chọn khoảng hay không; số lượng món, tiêu chí xếp hạng và cách xử lý đồng hạng. Không tự đặt công thức từ mock UI.
2. Định nghĩa số hóa đơn, đơn 0đ và thời điểm ghi nhận chuyển khoản; đối chiếu `payments`, `invoices.paid_at`, hủy `PAID` và SePay trước khi chốt truy vấn.
3. Báo cáo ca của CASHIER: ca mở/đã đóng nào có thể xem, có cần tham số `shiftId` và quyền xem lịch sử ca; giữ nguyên giới hạn theo identity/permission ở server.
4. Hợp đồng lỗi, ngày không hợp lệ, khoảng ngày và giới hạn khối lượng dữ liệu; xác nhận các field, route và mã lỗi trong spec báo cáo mới.
5. PB-14 và lịch kết thúc Sprint 10 chưa được chốt trong sprint này; SePay Live ngoài phạm vi dự án theo quyết định chủ dự án.

## Theo dõi planning

- Quyết định Product Owner ngày 14/11/2026: PB-12 + UI Báo cáo; thêm biểu đồ doanh thu theo ngày và món bán chạy; bắt đầu 14/11. Ngày 16/11/2026 Product Owner chốt ngày kết thúc và đóng sprint.
- Product Owner bổ sung tab Sổ kho vào Sprint 10; source hiện gọi API thật, cần kiểm lại trên ứng dụng và xử lý thiếu sót nếu phát hiện.
- Quyết định Product Owner ngày 15/11/2026: hủy **PB-15 nhập dữ liệu hàng loạt** khỏi Sprint 10 và khỏi spec/plan/task; mã và hồ sơ PB-15 không được tích hợp. Mã tiêu chí S10-07..S10-10 đã bỏ, giữ nguyên S10-11 để không đổi tham chiếu.
- Khi bắt đầu triển khai, lập spec và plan/task devloopflow riêng; ghi nhánh, HEAD, trạng thái working tree, AC ↔ S10 và ma trận AC ↔ artifact. Chỉ tick S10 sau QA cấp sprint trên bản cuối. Sprint Review, Retrospective và đóng sprint cần ghi riêng.

## QA cấp sprint — vòng 2 và 3 (16/11/2026)

- Vòng 2: PASS V1-1, V1-2 và 7/7 AC ([report-2.md](../../.devloopflow/verify/20261116-sprint10-qa/report-2.md)). Ghi nhận O-1: tiêu đề và nhãn trục biểu đồ dùng `dd/MM` không năm; sau đó sửa theo `DESIGN.md:635` thành `dd/MM/yyyy`.
- Vòng 3: PASS 7/7 AC, V1-1, V1-2; O-1 hết, nhãn một dòng, không cuộn ngang ở 1024×768 ([report-3.md](../../.devloopflow/verify/20261116-sprint10-qa/report-3.md)). API 256/256, UI 230/230, browser 37/37, typecheck/build/audit high đạt; hash 288 file không đổi.
- Chưa kiểm: CI trên commit tích hợp, thiết bị cảm ứng thật, Safari/Firefox, SePay Live; B-67 (flake test helper, đã sửa, chưa đo lại riêng). Sprint Review và Retrospective đã ghi 16/11/2026.

## Sprint Review — 16/11/2026

Đối chiếu do agent thực hiện từ hồ sơ và chứng cứ hiện có; đây không phải biên bản cuộc họp hoặc xác nhận đã demo cho stakeholder.

| Nội dung | Kết quả và bằng chứng |
| --- | --- |
| Sprint Goal | Đạt theo bảy AC trên sandbox local: báo cáo doanh thu theo ngày Việt Nam, tách tiền mặt/chuyển khoản, biểu đồ cột, món bán chạy, theo phạm vi ca/chi nhánh/cửa hàng, UI dùng API thật trên tablet ngang. [report-3](../../.devloopflow/verify/20261116-sprint10-qa/report-3.md). |
| PB-12 (API báo cáo) | S10-01..04 đạt: biên ngày UTC+7, hủy sau thanh toán, bigint đến 9007199254740991 (vượt 1 trả 500, không làm tròn), top 10 khớp SQL. Quyền và cross-store đúng (S10-03). |
| Lát cắt PB-13 (UI Báo cáo, Sổ kho) | S10-05, S10-06 và S10-11 đạt: ngày `dd/MM/yyyy`, trạng thái tải/rỗng/lỗi/Thử lại, đổi phiên không lộ dữ liệu cũ, Sổ kho SALE/SALE_REVERSAL khớp SQL. Thêm router theo địa chỉ cho các tab (Back/Forward/F5). |
| Chất lượng | API 256/256, UI 230/230, browser 37/37, typecheck/build exit 0, `npm audit --audit-level=high` exit 0 (POS_API còn 3 moderate từ typeorm). QA cấp sprint 3 vòng: vòng 1 FAIL (V1-1 ngày theo locale, V1-2 dialog B-66), vòng 2 và 3 PASS; [sổ FAIL](../../.devloopflow/verify/20261116-sprint10-qa/fails.md) không còn mục mở. |
| Tích hợp | Tại thời điểm QA, mã ở working tree chưa commit trên `feat/sprint10-reports` (HEAD `19ef547`). Sau đó đã merge vào `master` qua PR #24 (`ebf4e5e`); CI của commit này thành công (kiểm bằng `gh run list` ngày 16/11/2026). Hash 288 file đầu/cuối không đổi trong từng vòng QA. |
| Ngoài phạm vi | PB-14 hạ tầng; SePay Live (dự án chỉ dùng Test mode). |

**Giới hạn kết luận:** QA chạy local trên Chrome (giả lập locale en-US/vi-VN), không trên thiết bị cảm ứng thật, Safari/Firefox hay CI. Browser test của dự án dùng `window.fetch` giả; API thật chỉ kiểm trong sandbox của QA. B-67 (flake helper test, đã sửa) chưa được đo lại riêng. Còn mục Low chờ xử lý trong [backlog](../../.devloopflow/review/backlog.md).

## Retrospective — 16/11/2026

Nhận xét từ hồ sơ do agent tổng hợp; các hành động sau là đề xuất cải tiến, không ghi nhận quyết định của nhóm hoặc user khi chưa có xác nhận.

| Quan sát | Bằng chứng | Đề xuất lần sau |
| --- | --- | --- |
| Test đơn vị xanh nhưng lỗi hiển thị chỉ lộ trên browser thật | Ba ô `type="date"` hiện `MM/DD/YYYY` trên Chrome QA dù test xanh; nhãn trục chỉ `dd/MM` không năm. [V1-1](../../.devloopflow/errors/20261116-reports-native-date-locale.md), [O-1](../../.devloopflow/errors/20261116-reports-short-date-label.md). | Với yêu cầu định dạng cố định (ngày, tiền), thêm kiểm chữ người dùng nhìn thấy trên nhiều locale ngay trong test của tính năng; không coi native input bảo đảm định dạng. |
| Cùng một loại lỗi lặp ở nhiều màn | Dialog tab cũ còn mở sau đổi tab ở Kho (B-65) và Thực đơn (B-66). [errors Kho](../../.devloopflow/errors/20261116-inventory-dialog-persists-after-tab-change.md), [errors Thực đơn](../../.devloopflow/errors/20261116-products-dialog-persists-after-tab-change.md). | Khi thêm router/đổi tab, rà mọi màn có tab và state dialog cục bộ trong một lượt, không sửa từng màn khi review báo. |
| Test browser dễ flake khi chờ cố định hoặc chỉ chờ URL | B-67 và [lỗi chờ cố định](../../.devloopflow/errors/20261115-browser-router-fixed-wait.md) (occurrences 2). Fix chờ cả URL và `aria-current`, race không tái hiện ổn định nên chưa chứng minh hết flake. | Helper điều hướng chờ DOM và URL cùng lúc từ đầu; chạy lặp test browser nhiều lần (có throttle CPU) trước khi coi là ổn định. |
| QA cấp sprint nhiều vòng có chi phí nhưng bắt được lỗi thật | Vòng 1 FAIL với V1-1/V1-2; vòng 2 và 3 PASS sau fix-verify; mỗi vòng lưu hash 288 file đầu/cuối (cải tiến từ Retrospective Sprint 09). | Giữ manifest hash đầu/cuối và sandbox riêng; ghi quyết định trước về mục "Tài liệu không quy định" (như O-1) để tránh mở vòng chỉ vì mơ hồ. |
| Công cụ giao subagent hạn chế ghi hồ sơ | Subagent `ac-verifier` bị từ chối Write `report-2.md`, `report-3.md`; agent chính ghi lại từ kết quả trả về. | Khi giao verify-ac, dặn trước subagent trả toàn văn report trong câu trả lời để agent chính ghi, tránh mất một lượt. |
| Trạng thái sprint và báo cáo lệch nhau giữa các vòng | `report-2.md` ghi O-1 "Tài liệu không quy định", `report-3.md` ghi đã hết sau khi sửa; SPRINT.md phải đồng bộ tay. | Sau mỗi vòng QA, cập nhật trạng thái hiện tại trong SPRINT.md và errors ngay, không dồn cuối sprint. |

Sprint Review và Retrospective đã ghi. Chưa quyết định đóng sprint: còn tích hợp Git (commit, push, PR) và CI trên commit tích hợp; sprint chỉ đóng khi user quyết định.
