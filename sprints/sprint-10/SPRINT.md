# Sprint 10 — Báo cáo doanh thu và nhập dữ liệu quán

**Trạng thái:** Đã chốt phạm vi ngày 14/11/2026; bắt đầu 14/11/2026, ngày kết thúc chưa được Product Owner chốt. Chưa có spec/plan triển khai, code hoặc QA cho Sprint 10.

**Nguồn:** [Product Backlog](../../docs/PRODUCT_BACKLOG.md) PB-12/PB-13; [Sprint 09](../sprint-09/SPRINT.md) mục ranh giới và quyết định đóng; [Product Overview](../../docs/PRODUCT_OVERVIEW.md) mục 5; [Business Rules](../../docs/BUSINESS_RULES.md) BR-62..66 và BR-77; [thiết kế UI](../../DESIGN.md) mục 5.6; [quy ước API](../../docs/api-spec.md).

## Cơ sở và quyết định phạm vi

- Sprint 09 đã đóng với 6/6 AC đạt trong QA local; mã Sprint 09 đã tích hợp vào `master` và CI backend/frontend đã xanh theo [README](../../README.md). PB-12 phụ thuộc PB-09 và PB-11, đã hoàn thành trong Sprint 08/09. QA local và CI không phải xác nhận production.
- Product Owner chọn **PB-12 báo cáo doanh thu**, **lát cắt PB-13 UI Báo cáo dùng API thật**, bắt đầu **14/11/2026**. Product Owner cũng chọn thêm **biểu đồ cột doanh thu theo ngày và danh sách món bán chạy** theo `DESIGN.md`. Phần món bán chạy vốn thuộc Giai đoạn 2 theo Product Overview/BR-66; đây là ngoại lệ phạm vi Sprint 10 do Product Owner yêu cầu, không kéo theo toàn bộ báo cáo tuần/tháng, giờ cao điểm hoặc lợi nhuận gộp.
- Product Owner bổ sung **PB-15 nhập dữ liệu hàng loạt** để chủ quán không phải tạo từng bản ghi: chi nhánh, danh mục món, món ăn, size/giá, bàn, nguyên liệu kèm đơn vị tính, topping và công thức của món/size và topping. Hỗ trợ file Excel `.xlsx` và CSV `.csv`; dòng trùng dữ liệu đã có được báo và bỏ qua. Nguyên liệu mới có tồn ban đầu bằng 0, không ghi tăng tồn hay tạo biến động kho; dữ liệu tồn đã có không thay đổi. Tài khoản nhân viên tạo thủ công. Nhập hàng và phiếu nhập thuộc Giai đoạn 2 theo quyết định Product Owner; chi tiết file, quan hệ và cách xử lý lỗi chốt trong spec.
- Trang import phục vụ **thiết lập dữ liệu ban đầu của quán**. Trang này không nhập hàng, không nhận số lượng tồn để cập nhật kho và không tạo phiếu nhập; định lượng nguyên liệu trong công thức vẫn là dữ liệu công thức, không phải số lượng tồn kho.
- Product Owner bổ sung kiểm tra và hoàn thiện tab **Sổ kho** trong Sprint 10. Kiểm tra source: màn đang dùng `InventoryScreen.tsx`, gọi `inventoryService.movements()` và API `GET /api/v1/stock-movements`; component `StockMovementsTab.tsx` dùng mock không được màn này import. Cần kiểm browser/API/DB và sửa phần thực sự thiếu nếu có; chưa kết luận QA mới chỉ từ đọc mã.
- PB-14 vận hành VPS, backup và khôi phục **không thuộc Sprint 10**.
- Theo quyết định chủ dự án, đây là project cá nhân phục vụ học tập; SePay chỉ dùng Test mode, không triển khai hoặc yêu cầu kiểm Live.
- Baseline lập sprint: `master` tại `46692c9`, working tree sạch. `POS_API/src/app.module.ts` chưa đăng ký module báo cáo; `POS_UI/src/features/reports/reportService.ts` gọi `MockEngine`, `DailyReportScreen.tsx` còn dùng dữ liệu/chi nhánh từ mock. Điều hướng và màn hiện chỉ xét `report.view_branch`/`report.view_all`, chưa phục vụ `report.view_shift` của CASHIER. `docs/api-spec.md` nêu `GET /reports/revenue` nhưng trỏ tới `.devloopflow/specs/legacy-reports.md` không tồn tại; cần lập spec thật trước khi triển khai.

## Sprint Goal

Người có quyền xem doanh thu theo ngày Việt Nam trong đúng phạm vi ca, chi nhánh hoặc cửa hàng; thấy tổng tiền tách tiền mặt/chuyển khoản, biểu đồ doanh thu theo ngày và món bán chạy. Màn Báo cáo lấy dữ liệu API thật, hiển thị tiếng Việt và VND trên tablet ngang. Chủ quán nhập dữ liệu thiết lập hàng loạt từ Excel hoặc CSV, giảm thao tác tạo từng bản ghi.

## Sprint Backlog và thứ tự thực hiện

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Refinement và spec PB-12 + PB-13 | Chốt hợp đồng API, định nghĩa doanh thu/số đơn, ngày Việt Nam, phạm vi `report.view_shift`/`report.view_branch`/`report.view_all`, khoảng ngày biểu đồ, cách xếp hạng món, phân trang/giới hạn và trạng thái UI; lập plan AC ↔ test/evidence. Sửa tham chiếu spec báo cáo không tồn tại trong `docs/api-spec.md` khi đã có spec mới. | Đối chiếu BR, DB, API convention, hóa đơn/ca và UI hiện tại; giải quyết các điểm mở bên dưới. | Chưa bắt đầu |
| 2 | PB-12 — API báo cáo | API tổng hợp từ dữ liệu thật của hóa đơn/thanh toán, chỉ tính đơn `PAID`, ngày theo `paid_at` ở `Asia/Ho_Chi_Minh`, tách CASH/TRANSFER và áp đúng quyền/phạm vi; cung cấp chuỗi ngày và món bán chạy theo spec đã chốt. | Spec và plan đã chốt; PostgreSQL sandbox. | Chưa bắt đầu |
| 3 | PB-13 — UI Báo cáo | Thay nguồn mock bằng API, hỗ trợ CASHIER xem ca của mình, MANAGER chi nhánh mình, OWNER toàn cửa hàng/chọn chi nhánh; ngày, tổng tiền, cơ cấu thanh toán, biểu đồ và món bán chạy; trạng thái tải/rỗng/lỗi, đổi phiên không lộ dữ liệu cũ. | API item 2 đã kiểm theo spec. | Chưa bắt đầu |
| 4 | PB-15 — Refinement nhập dữ liệu | Chốt danh sách loại dữ liệu và thứ tự phụ thuộc, mẫu/cột Excel và CSV, quy tắc nhận diện trùng, xử lý dòng lỗi/phụ thuộc; lập spec, plan và ma trận bằng chứng. | Khảo sát chức năng tạo hiện tại, quyền, DB và xác nhận các điểm mở với Product Owner. | Chưa bắt đầu |
| 5 | PB-15 — API và UI nhập dữ liệu | Chủ quán tải file, kiểm tra kết quả và nhập hàng loạt chi nhánh, danh mục, món/size/giá, bàn, nguyên liệu/đơn vị tính, topping và công thức món/size và topping; báo và bỏ qua dòng trùng; dữ liệu lưu vào đúng store/branch; không tăng tồn kho. | Spec và plan nhập dữ liệu đã chốt. | Chưa bắt đầu |
| 6 | PB-13 — Sổ kho | Kiểm tra tab Sổ kho hiện có với API thật, dữ liệu, quyền và phạm vi chi nhánh; tái sử dụng phần đã hoạt động và sửa phần thiếu nếu kiểm chứng phát hiện. | Đối chiếu spec kho, API và màn hiện tại; lập plan/QA tương ứng. | Chưa bắt đầu |
| 7 | Review và nghiệm thu cấp sprint | Review code, kiểm từng AC S10 trên API/DB/browser cuối cùng; lưu artifact gốc và hash mã đầu/cuối lượt QA, đối chiếu CI trên đúng commit khi tích hợp. Sprint Review và Retrospective là bước riêng sau QA. | Item 1–6 hoàn tất, ma trận AC ↔ artifact đã lập. | Chưa bắt đầu |

## Tiêu chí nghiệm thu cấp Sprint 10

Ô ☑ chỉ được điền sau lượt QA cấp sprint trên mã/UI cuối với artifact gốc đủ từng vế; hiện tất cả đều ☐. Chi tiết endpoint, giới hạn và công thức còn phải chốt trong spec.

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu | Nghiệm thu |
| --- | --- | --- | --- | --- |
| S10-01 | Doanh thu ngày chỉ tính hóa đơn `PAID` có `paid_at` thuộc ngày `Asia/Ho_Chi_Minh` đã chọn; `OPEN`/`CANCELLED` không tính, kể cả hóa đơn hủy sau khi đã thanh toán. Hai mốc sát nửa đêm UTC+7 được gom đúng ngày. | PB-12; BR-62..63 | Test PostgreSQL và HTTP với hóa đơn tại biên ngày, trước/sau hủy; SQL đối chiếu tổng. | ☐ |
| S10-02 | Tiền mặt và chuyển khoản được tổng hợp riêng; tổng doanh thu bằng tổng hai phần, không làm tròn hoặc tràn số tiền. | PB-12; BR-64; API convention | Test/API/DB với CASH, TRANSFER và ngày rỗng; đối chiếu số nguyên. | ☐ |
| S10-03 | CASHIER chỉ xem ca của mình, MANAGER chỉ xem chi nhánh mình, OWNER xem toàn store hoặc từng chi nhánh; truy vấn vượt quyền/cross-store và PLATFORM_ADMIN bị chặn, kể cả khi tự sửa tham số URL. | PB-12; BR-65, BR-77 | HTTP theo vai trò và ID thật, gồm ca/chi nhánh/store khác; so với DB. | ☐ |
| S10-04 | Biểu đồ cột trả doanh thu theo từng ngày Việt Nam trong khoảng đã chốt; danh sách món bán chạy lấy từ đơn `PAID`, phản ánh đúng phạm vi và không tính đơn đã hủy. Quy tắc khoảng ngày, xếp hạng và giới hạn được chốt ở spec trước code. | Quyết định Product Owner 14/11; DESIGN mục 5.6; BR-62..65 | API/DB với nhiều ngày, món và đơn hủy; browser kiểm nhãn/trục/giá trị. | ☐ |
| S10-05 | UI Báo cáo dùng API thật, không lấy mock làm nguồn dữ liệu; ngày/chi nhánh/ca phù hợp quyền, hiển thị tiền VND và tiếng Việt, có trạng thái tải/rỗng/lỗi rõ ràng trên tablet ngang. | PB-13; DESIGN mục 5.6 | Browser 1024×768, network method/path/status đã che, ảnh/snapshot và DB đối chiếu. | ☐ |
| S10-06 | Sau reload hoặc đổi người dùng/chi nhánh, UI không giữ báo cáo của phiên trước; người không có quyền không thấy dữ liệu dù dùng URL màn Báo cáo trực tiếp. | PB-13; BR-65, BR-77 | Browser hai phiên và HTTP/network, kiểm dữ liệu trước/sau. | ☐ |
| S10-07 | Chủ quán nhập được chi nhánh, danh mục món, món/size/giá, bàn, nguyên liệu kèm đơn vị tính, topping và công thức món/size và topping bằng Excel `.xlsx` và CSV `.csv` theo mẫu/spec đã chốt; dữ liệu hợp lệ được lưu, bàn liên kết đúng chi nhánh, công thức liên kết đúng nguyên liệu và các dữ liệu hiển thị trong màn tương ứng sau reload. | Yêu cầu Product Owner; PB-15 | File mẫu và dữ liệu thử, browser/network, API/DB trước/sau và reload. | ☐ |
| S10-08 | Dòng trùng dữ liệu đã có được báo và bỏ qua; dữ liệu không hợp lệ, thiếu tham chiếu và lỗi file được thông báo theo spec, không làm sai lệch dữ liệu đã có. | Quyết định Product Owner; PB-15 | Test file trùng/sai/thiếu tham chiếu, báo lỗi theo dòng và DB trước/sau. | ☐ |
| S10-09 | Chỉ người có quyền tương ứng nhập dữ liệu trong phạm vi cửa hàng/chi nhánh được phép; không tạo hoặc thay đổi tài khoản nhân viên qua chức năng nhập file. | PB-15; BR-81; quyết định Product Owner | Test HTTP theo quyền, cross-store/branch, thử file chứa dữ liệu tài khoản và kiểm DB. | ☐ |
| S10-10 | Trang import chỉ thiết lập dữ liệu ban đầu, không nhận số lượng tồn để cập nhật kho, không tạo phiếu nhập hay biến động kho. Nhập nguyên liệu mới chỉ tạo danh mục và đơn vị tính; tồn ban đầu hiển thị 0 tại các chi nhánh. Nguyên liệu trùng được bỏ qua và tồn hiện có không đổi; định lượng công thức được lưu đúng mà không đổi tồn. | PB-15; spec kho; BR-44..45; quyết định Product Owner | Browser/API/DB trước/sau import, kiểm danh mục, công thức, tồn theo chi nhánh và sổ kho; thử dữ liệu có số lượng tồn và nguyên liệu trùng có tồn khác 0. | ☐ |
| S10-11 | Tab Sổ kho hiển thị biến động thực từ API theo quyền và chi nhánh, gồm xuất bán và hoàn trả kho khi có dữ liệu; reload hoặc đổi phiên không lộ dữ liệu cũ, trạng thái rỗng/lỗi rõ ràng. | PB-08, PB-13; BR-44, BR-72; yêu cầu Product Owner | Browser/network và DB đối chiếu SALE/SALE_REVERSAL, lọc chi nhánh, quyền/cross-store, reload/đổi phiên. | ☐ |

## Ranh giới và điểm cần chốt trước code

1. Khoảng ngày của biểu đồ, ngày được chọn đóng vai trò gì, có cho chọn khoảng hay không; số lượng món, tiêu chí xếp hạng và cách xử lý đồng hạng. Không tự đặt công thức từ mock UI.
2. Định nghĩa số hóa đơn, đơn 0đ và thời điểm ghi nhận chuyển khoản; đối chiếu `payments`, `invoices.paid_at`, hủy `PAID` và SePay trước khi chốt truy vấn.
3. Báo cáo ca của CASHIER: ca mở/đã đóng nào có thể xem, có cần tham số `shiftId` và quyền xem lịch sử ca; giữ nguyên giới hạn theo identity/permission ở server.
4. Hợp đồng lỗi, ngày không hợp lệ, khoảng ngày và giới hạn khối lượng dữ liệu; xác nhận các field, route và mã lỗi trong spec báo cáo mới.
5. PB-14 và lịch kết thúc Sprint 10 chưa được chốt trong sprint này; SePay Live ngoài phạm vi dự án theo quyết định chủ dự án.
6. Nhập dữ liệu: chốt chính xác loại dữ liệu và phần phụ thuộc, mỗi file một loại hay nhiều sheet/file, mẫu cột, giới hạn kích thước/số dòng, cách liên kết giữa các dòng và phạm vi chi nhánh.
7. Xác định khóa nhận diện trùng cho từng loại; cách xử lý dòng sai hoặc phụ thuộc dòng trùng/sai, trường hợp một phần đã nhập, tải lại và gửi lại. Excel/CSV phải báo rõ từng dòng theo spec.
8. Tài khoản nhân viên nằm ngoài phạm vi nhập file theo quyết định Product Owner; tiếp tục tạo thủ công theo quy trình hiện tại.
9. Nhập hàng và phiếu nhập kho để Giai đoạn 2; PB-15 không ghi tồn đầu kỳ hoặc số lượng hàng thực tế.

## Theo dõi planning

- Quyết định Product Owner ngày 14/11/2026: PB-12 + UI Báo cáo; thêm biểu đồ doanh thu theo ngày và món bán chạy; bắt đầu 14/11. Ngày kết thúc chưa chốt.
- Product Owner bổ sung nhập dữ liệu hàng loạt PB-15 cho chủ quán bằng Excel và CSV, gồm chi nhánh, nguyên liệu/đơn vị, topping và công thức topping; nguyên liệu mới có tồn ban đầu 0. Dòng trùng được báo và bỏ qua; tài khoản nhân viên tạo thủ công; nhập hàng/phiếu nhập để Giai đoạn 2. Các lựa chọn còn mở phải được chốt khi viết spec.
- Product Owner làm rõ trang import chỉ thiết lập dữ liệu ban đầu của quán, không nhập hàng hay cập nhật số lượng tồn kho.
- Product Owner bổ sung tab Sổ kho vào Sprint 10; source hiện gọi API thật, cần kiểm lại trên ứng dụng và xử lý thiếu sót nếu phát hiện.
- Khi bắt đầu triển khai, lập spec và plan/task devloopflow riêng; ghi nhánh, HEAD, trạng thái working tree, AC ↔ S10 và ma trận AC ↔ artifact. Chỉ tick S10 sau QA cấp sprint trên bản cuối. Sprint Review, Retrospective và đóng sprint cần ghi riêng.
