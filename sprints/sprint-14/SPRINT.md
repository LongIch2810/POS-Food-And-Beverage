# Sprint 14 — Lợi nhuận gộp và Theme cửa hàng

**Trạng thái:** Đề xuất ngày 18/11/2026, **chưa được Product Owner chốt**; chưa có spec, plan hay task.

**Nguồn:** [Product Backlog](../../docs/PRODUCT_BACKLOG.md) PB-22, PB-26 và lát cắt PB-13; [Business Rules](../../docs/BUSINESS_RULES.md) BR-116, BR-107, BR-119, BR-121, BR-42..43; [DESIGN.md](../../DESIGN.md); [Sprint 11](../sprint-11/SPRINT.md), [Sprint 13](../sprint-13/SPRINT.md).

## Cơ sở và quyết định phạm vi

- PB-22 cần giá vốn bình quân (PB-17, Sprint 11), báo cáo kỳ (PB-21, Sprint 13) và cổng `PRO` (PB-25, Sprint 13).
- PB-26 đứng cạnh vì **logo** do PB-26 cung cấp được PDF (PB-19, Sprint 15) dùng; ghép sprint này để PDF có nguồn logo sẵn.
- Chụp giá vốn đi cùng transaction thanh toán đang chạy (BR-42, BR-43): rủi ro hồi quy lớn nhất của Giai đoạn 2; cần test thanh toán toàn diện.

## Sprint Goal

Khi hóa đơn thành `PAID`, giá vốn từng dòng được chụp cố định cùng transaction trừ kho; `OWNER` gói `PRO` xem lợi nhuận gộp trên báo cáo, số liệu quá khứ không đổi khi giá nhập hay công thức đổi. `OWNER` đặt màu thương hiệu và logo riêng cho cửa hàng mà không phá bố cục `DESIGN.md`.

## Sprint Backlog và thứ tự thực hiện

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Spec PB-22 + PB-26 | Cột/bảng lưu giá vốn dòng, công thức tính từ công thức món và giá vốn bình quân, permission lợi nhuận, hiển thị "chưa có giá vốn"; cách lưu logo, ràng buộc màu. | Chốt điểm mở. | Chưa bắt đầu |
| 2 | PB-22 — Chụp giá vốn khi `PAID` | Ghi giá vốn dòng trong transaction thanh toán hiện có; migration thêm cột, hóa đơn cũ để trống. | Spec; migration. | Chưa bắt đầu |
| 3 | PB-22 — Báo cáo lợi nhuận | Lợi nhuận gộp theo ngày/tuần/tháng trong báo cáo; loại hóa đơn chưa có giá vốn; chỉ `OWNER` + `PRO`. | Item 2; PB-21. | Chưa bắt đầu |
| 4 | PB-26 — Theme | Lưu màu brand và logo theo cửa hàng; API đọc cho mọi người dùng cửa hàng, ghi cho `OWNER`. | Spec. | Chưa bắt đầu |
| 5 | PB-13 — UI lợi nhuận và Theme | Cột lợi nhuận, nhãn "chưa có giá vốn"; màn Cài đặt chọn màu/logo; UI áp `--color-brand-*` và logo theo store. | API item 3–4. | Chưa bắt đầu |
| 6 | Review và QA cấp sprint | Gồm hồi quy thanh toán, kho, khuyến mãi, đối soát. | Item 1–5. | Chưa bắt đầu |

## Tiêu chí nghiệm thu cấp Sprint 14

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu | Nghiệm thu |
| --- | --- | --- | --- | --- |
| S14-01 | Khi hóa đơn thành `PAID`, mỗi dòng ghi giá vốn tính từ công thức (kể cả size/topping) và giá vốn bình quân tại thời điểm đó, trong cùng transaction trừ kho; lỗi thì không đổi gì (rollback). | BR-116; BR-42..43 | Test PostgreSQL, SQL đối chiếu giá vốn tính tay. | ☐ |
| S14-02 | Sau khi đổi giá nhập, công thức hoặc hủy phiếu, giá vốn đã chụp của hóa đơn cũ **không đổi**; báo cáo quá khứ không đổi số. | BR-116 | So sánh báo cáo/DB trước và sau thay đổi. | ☐ |
| S14-03 | Hóa đơn `PAID` trước khi bật tính năng hiển thị "chưa có giá vốn" và bị loại khỏi lợi nhuận, không tính giá vốn 0. | BR-116 | Dữ liệu trộn cũ/mới, API và browser. | ☐ |
| S14-04 | Lợi nhuận gộp = doanh thu − giá vốn đã chụp, đúng theo ngày/tuần/tháng; chỉ `OWNER` thuộc gói `PRO`; `MANAGER`, `CASHIER`, `BASIC` và `PLATFORM_ADMIN` bị chặn bằng mã lỗi ổn định. | BR-116; BR-119 | HTTP theo vai trò/gói, SQL đối chiếu. | ☐ |
| S14-05 | Thanh toán, idempotency, trừ kho, áp mã giảm giá và đối soát ca vẫn đúng (hồi quy Sprint 08–10). | PB-09; PB-10 | Chạy lại bộ test thanh toán/đối soát, kiểm replay `Idempotency-Key`. | ☐ |
| S14-06 | `OWNER` đặt được màu thương hiệu và logo; chỉ nhóm `--color-brand-*` và logo đổi, bề mặt/chữ/màu trạng thái giữ nguyên; giá trị màu không hợp lệ bị từ chối. | BR-121; DESIGN | HTTP, browser, đối chiếu CSS token. | ☐ |
| S14-07 | Theme và logo chỉ áp cho người dùng đúng cửa hàng, cửa hàng khác không thấy; logo chỉ nhận định dạng/kích thước cho phép; người không phải `OWNER` không sửa được. | BR-121; BR-77 | HTTP theo vai trò và cross-store, thử upload sai loại/quá lớn. | ☐ |
| S14-08 | UI lợi nhuận và Theme dùng API thật, tiếng Việt, VND; màu brand do người dùng chọn vẫn đạt độ tương phản chữ/nút tối thiểu theo `DESIGN.md` hoặc bị cảnh báo. | PB-13; DESIGN | Browser 1024×768, kiểm tương phản. | ☐ |

## Ranh giới và điểm cần chốt trước code

1. Giá vốn dòng: chụp theo từng dòng tổng hay từng nguyên liệu; món chưa có công thức hoặc nguyên liệu chưa có giá vốn bình quân tính thế nào (đề xuất: coi dòng đó "chưa có giá vốn" thay vì 0).
2. Giá vốn topping và size, và khi hóa đơn có mã giảm giá/giảm tay: lợi nhuận tính trên doanh thu sau giảm.
3. Mã permission lợi nhuận gộp, và `OWNER` nhiều chi nhánh xem tổng hợp thế nào.
4. Lưu logo ở đâu (tái sử dụng cách lưu ảnh món của PB-05 nếu có), định dạng/kích thước tối đa, chống file độc hại.
5. Ràng buộc màu brand (một màu chính hay cả bộ `--color-brand-*`; tự suy sắc độ hay nhập từng sắc).
6. Hóa đơn `PAID` đang trong quá trình triển khai (hóa đơn trước migration) nằm ở trạng thái "chưa có giá vốn" vĩnh viễn; xác nhận chấp nhận.

## Theo dõi planning

- Đề xuất lập ngày 18/11/2026; chưa được chốt. Nếu quá tải, PB-26 (độc lập) có thể dời sang Sprint 15 nhưng PDF cần logo nên không nên dời quá Sprint 15.
