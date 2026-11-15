---
id: 20261114-sprint10-reports
status: approved
approved_at: 2026-11-14
---

# Spec: Báo cáo doanh thu Sprint 10

## Mục đích và lý do
- Người có quyền cần xem doanh thu thật theo ngày Việt Nam và phạm vi được phép; UI báo cáo hiện lấy dữ liệu mô phỏng (`sprints/sprint-10/SPRINT.md`, mục Sprint Goal và backlog; `POS_UI/src/features/reports/reportService.ts:1`).

## Thành công trông như thế nào
- Người dùng xem tổng doanh thu ngày, số hóa đơn, tiền mặt và chuyển khoản; biểu đồ ngày và danh sách món bán chạy từ dữ liệu thật. UI tiếng Việt, VND, phù hợp tablet ngang; có tải, rỗng, lỗi và không lộ dữ liệu phiên cũ (`sprints/sprint-10/SPRINT.md`, S10-01..06).

## Mục tiêu
- Chỉ tính hóa đơn hiện `PAID`, theo `invoices.paid_at` ở `Asia/Ho_Chi_Minh`; hóa đơn `OPEN` và `CANCELLED` không tính, kể cả đã thanh toán rồi hủy (`docs/BUSINESS_RULES.md:150,198-200`).
- Tổng doanh thu bằng tổng tiền mặt và chuyển khoản, tính bằng số nguyên; số hóa đơn bao gồm hóa đơn hoàn tất 0đ (quyết định user trong hội thoại). `payments.amount` chỉ nhận số dương (`POS_API/src/database/migrations/20261109000000-Payments.ts:42`).
- Giới hạn theo permission và danh tính: CASHIER xem ca của chính mình; MANAGER chi nhánh của mình; OWNER toàn cửa hàng hoặc một chi nhánh; tổng hợp toàn cửa hàng cần `branch.access_all`; chặn PLATFORM_ADMIN và truy cập ngoài store (`docs/BUSINESS_RULES.md:201,203`; `docs/api-spec.md`, mục ngữ cảnh chi nhánh và phạm vi cửa hàng).
- CASHIER chọn ca của chính mình, gồm ca mở và ca đã đóng; không xem ca người khác (user đồng ý trong hội thoại).
- Biểu đồ doanh thu theo từng ngày Việt Nam có khoảng riêng: mặc định 7 ngày kết thúc ở ngày báo cáo; người dùng chọn ngày đầu và ngày cuối, tối đa 31 ngày. Tổng ngày và món bán chạy vẫn theo ngày báo cáo, độc lập khoảng biểu đồ (user đồng ý trong hội thoại).
- Hiển thị tối đa 10 dòng món/size theo số lượng bán trong ngày báo cáo; mỗi size là một dòng riêng, xếp hạng và tính số lượng, doanh thu riêng; đồng hạng theo tên. Gộp các lượt của cùng size khi đổi tên món (user nói trong hội thoại); doanh thu cộng theo giá thực tế từng lượt bán. Hiển thị số lượng và doanh thu món kèm topping trước giảm giá toàn hóa đơn; không cộng topping hai lần. Ví dụ một món 30.000đ và topping 5.000đ có doanh thu 35.000đ trước giảm giá; nhãn “Doanh thu món và topping trước giảm giá” (user đồng ý trong hội thoại). `invoice_items.line_total` đã gồm topping (`POS_API/src/sales/sales.service.ts:435-444`).
- UI dùng API thật, mở cho `report.view_shift`, `report.view_branch`, `report.view_all` theo phạm vi tương ứng; khi đổi phiên hoặc bộ lọc không hiện dữ liệu cũ (`sprints/sprint-10/SPRINT.md`, S10-03, S10-05, S10-06; `.devloopflow/MEMORY.md`, M-10, M-11, M-12, M-39).

## Phi mục tiêu (cố ý không làm)
- PB-15 nhập dữ liệu, tab Sổ kho và nghiệm thu cấp sprint là các item riêng sau báo cáo; PB-14, SePay Live, lợi nhuận gộp, giờ cao điểm, báo cáo tuần/tháng ngoài phạm vi (`sprints/sprint-10/SPRINT.md`, mục cơ sở và thứ tự thực hiện).

## Phản mục tiêu (làm ra mà vẫn bị coi là thất bại)
- Dữ liệu mock được trình bày như dữ liệu thật; tổng tiền sai hoặc tràn; dữ liệu ca, chi nhánh, store hoặc phiên khác bị lộ; đơn đã hủy vẫn tính (`sprints/sprint-10/SPRINT.md`, S10-01..06).

## Hiện trạng
- Chưa có Reports module trong `POS_API/src/app.module.ts`; UI gọi `MockEngine` (`POS_UI/src/features/reports/reportService.ts:1-8`), điều hướng chưa xét `report.view_shift` (`POS_UI/src/app/navigation.ts:20`).
- `docs/api-spec.md:491` trỏ tới spec báo cáo không tồn tại theo `sprints/sprint-10/SPRINT.md`, mục cơ sở; cần cập nhật tham chiếu khi có spec được duyệt và triển khai.

## Ràng buộc
- API NestJS/TypeScript/PostgreSQL; UI React/TypeScript; tiền số nguyên, giờ lưu UTC và hiển thị Việt Nam; quyền theo permission, tenant từ phiên (`AGENTS.md`, Tổng quan kỹ thuật và Quy tắc sản phẩm cần giữ).
- Chỉ truy vấn trong store và phạm vi được phép; không dùng `branchId` từ client để mở rộng quyền; lỗi và response theo `docs/api-spec.md`. Mọi ID tham chiếu khác store không tiết lộ tồn tại.
- Giữ message và requestId khi có, fallback khi thiếu; test phản hồi cũ phải có request cũ thực sự pending (`.devloopflow/errors/20261113-invoice-load-error-details-lost.md`; `.devloopflow/errors/20261114-backlog-stale-list-test-settled-request.md`).

## Các phần cách làm user đã quyết
- Theo các mục tiêu trên: khoảng riêng tối đa 31 ngày; top 10 dòng, tách từng size, gộp cùng size khi đổi tên món, đồng hạng theo tên, có doanh thu gồm topping trước giảm giá; CASHIER xem ca mở/đã đóng của chính mình; hóa đơn 0đ tính vào số đơn.

## Quyết định của agent (user kiểm khi đọc)
- Hiển thị tên món và size snapshot của lần bán gần nhất trong ngày chọn; nếu đồng thời thì chọn ổn định theo ID dòng. Lý do: thể hiện tên đã dùng khi bán, không đổi dữ liệu hóa đơn cũ.
- Khoảng biểu đồ tính cả hai đầu, tối đa 31 ngày; mặc định ngày báo cáo trừ 6 ngày đến ngày báo cáo. Ngày đầu sau ngày cuối là dữ liệu không hợp lệ.
- Ngày không có đơn: tổng và số lượng bằng 0, danh sách món rỗng; biểu đồ có đủ ngày với giá trị 0. Màn hiện trạng thái rỗng rõ ràng.
- CASHIER mặc định ca đang mở của chính mình, nếu không có thì ca thu ngân gần nhất; không có ca thì hiện trạng thái rỗng. Danh sách ca và ca hiện tại có endpoint hiện hành (`.devloopflow/specs/shifts.md:133-138,159-166`).
- Hợp đồng đọc báo cáo: `GET /api/v1/reports/revenue`, không body. Query bắt buộc `date`, `fromDate`, `toDate` theo `YYYY-MM-DD`; `shiftId` UUID bắt buộc với phạm vi ca, `branchId` UUID tùy chọn với phạm vi toàn cửa hàng. Các ngày hợp lệ theo lịch, `fromDate <= toDate`, tối đa 31 ngày tính cả hai đầu. Khi không có ca, UI không gửi truy vấn báo cáo và hiển thị rỗng. Phạm vi là giao của ngày và ca đã chọn; biểu đồ áp cùng ca và chi nhánh.
- Response `200 { data: { date, invoiceCount, totalRevenue, cashRevenue, transferRevenue, dailyRevenue, bestSellers } }`: ngày là chuỗi; số hóa đơn và các số lượng là số nguyên; tiền là số nguyên đồng; `dailyRevenue` là mảng `{ date, revenue }` tăng dần theo ngày và `bestSellers` là mảng `{ productSizeId, productName, sizeName, quantity, revenue }`. `productSizeId` là UUID của size; doanh thu mỗi dòng đã bao gồm topping trước giảm giá. Không có phân trang vì biểu đồ tối đa 31 ngày, món tối đa 10 dòng. Cùng số lượng, sắp tên món rồi tên size tăng dần, cùng tên dùng UUID để thứ tự ổn định.
- Tuân thủ `docs/api-spec.md:135-165,234-253,273-281`: bỏ qua `branchId` client gửi đối với người bị giới hạn chi nhánh; ID chi nhánh hoặc ca ngoài store trả 404, không cho phép xem ca người khác; dữ liệu query sai trả `422 VALIDATION_ERROR`, chưa xác thực `401`, thiếu quyền hoặc PLATFORM_ADMIN `403`, tổng tiền không an toàn trả `500 INTERNAL_ERROR` và ghi log. Tiền tổng hợp chỉ chuyển sang số sau khi kiểm vùng an toàn. Áp envelope lỗi chung của dự án.

## Để người viết plan tự chọn
- Cấu trúc kỹ thuật và các chi tiết kiểm thử tuân thủ hợp đồng và quy ước dự án.

## Câu hỏi mở
- Không có.

## Changelog spec
- 2026-11-14: tạo nháp từ Sprint 10 và quyết định user trong hội thoại.
- 2026-11-14: user chọn tách từng size thành một dòng riêng để xem số lượng và doanh thu từng size.
- 2026-11-14: user chọn gộp cùng size khi đổi tên món; bổ sung các quyết định hiển thị và mặc định để user kiểm.
- 2026-11-14: bổ sung hợp đồng báo cáo, trạng thái rỗng và quy tắc phạm vi để trình duyệt.
- 2026-11-14: user nói “duyệt spec”.

## Kiểm tra sẵn sàng
- [x] Người chưa thấy cuộc trò chuyện đọc spec + docs dự án hiểu cần làm gì và vì sao, sau bổ sung theo nhận xét kiểm độc lập.
- [x] Mỗi fact có nguồn hoặc ghi rõ user nói.
- [x] Không có chi tiết cài đặt thuộc plan.
- [x] Câu hỏi mở rỗng.
- [x] Mỗi quyết định của agent đã được liệt kê.
