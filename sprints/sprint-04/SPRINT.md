# Sprint 4 — đã chốt kế hoạch

**Trạng thái:** Product Owner chốt Sprint Goal, sức chứa PB-05 + lát cắt PB-13 thực đơn và lịch 02–08/11/2026 ngày 02/11/2026. Chưa triển khai và chưa nghiệm thu item nào. Các quyết định nghiệp vụ chi tiết được chốt trong refinement trước khi code.

## Cơ sở lập kế hoạch

[Product Backlog](../../docs/PRODUCT_BACKLOG.md) đặt PB-05 sau PB-04 và đề xuất PB-05 cùng lát cắt PB-13 thực đơn làm bước tiếp theo. [Sprint 3](../sprint-03/SPRINT.md) đã nghiệm thu local PB-04 và UI tổ chức ngày 01/11/2026. CI của phần này được backlog ghi nhận sau đó; chưa có xác nhận production. Hiện API thực đơn chưa có và màn thực đơn vẫn dùng dữ liệu mô phỏng. Nhóm gồm Product Owner và Codex; sức chứa lấy theo phạm vi thực tế, không suy từ việc Sprint 3 kết thúc sớm.

## Sprint Goal đã chốt

`OWNER` quản lý được thực đơn chung cho cửa hàng qua API và UI thật: danh mục, món, size, giá, topping và ảnh món tùy chọn. Dữ liệu của cửa hàng khác không thể đọc hoặc sửa; món ngưng dùng không xuất hiện trong danh sách bán. Sprint này chuẩn bị nguồn menu cho PB-07, chưa tạo đơn hoặc bán hàng thật.

## Sprint Backlog đã chốt

| Thứ tự | Item | Kết quả cần đạt | Điều kiện trước khi triển khai |
| --- | --- | --- | --- |
| 1 | Refinement PB-05 và UI thực đơn | Phỏng vấn, rà BR-08–13, BR-80, BR-100, BR-103, BR-105; chốt thao tác, quyền, trạng thái, ảnh, hợp đồng API/UI và ma trận tiêu chí → tình huống → artifact. | Product Owner chốt các quyết định còn mở; dùng skill `create-pos-spec`, chỉ ghi vào `specs/` sau khi chốt. |
| 2 | PB-05 — API/DB thực đơn | Migration và API quản lý danh mục, món, size, giá, topping, liên kết topping với danh mục và ảnh tùy chọn theo spec. Menu cùng store dùng chung giữa các chi nhánh; kiểm tra toàn vẹn tham chiếu và quyền. | Spec PB-05 đã chốt; đối chiếu schema và các entity hiện có. |
| 3 | PB-13 — lát cắt thực đơn | `OWNER` quản lý thực đơn trên UI qua API thật; trạng thái tải, lỗi, lưu và tải lại trang phản ánh dữ liệu DB. Màn chọn món chỉ đọc dữ liệu thật nếu phạm vi đọc POS được chốt và triển khai trong cùng lát cắt. | API tương ứng đã chạy và được kiểm tra; không coi màn POS mock là đã nối API. |
| 4 | Review và nghiệm thu | Kiểm tra trên mã/UI cuối, review thay đổi và đối chiếu từng tiêu chí với artifact; Product Owner quyết định từng item. | Bằng chứng theo `AGENTS.md` đủ cho phạm vi được chốt. |

PB-06 (ca), PB-07 (đơn), PB-08 (kho), thanh toán và production tiếp tục theo backlog; không thuộc Sprint 4. Khóa sửa quỹ sau ca đầu tiên thuộc PB-06. Nếu Product Owner đổi sức chứa hoặc ưu tiên, cập nhật mục tiêu và backlog trước khi triển khai phần phụ thuộc.

## Tiêu chí nghiệm thu

Các ô để trống đến khi spec đã chốt, kiểm tra trên phiên bản cuối, QA đối chiếu artifact và Product Owner quyết định. Refinement có thể điều chỉnh tiêu chí trước khi code.

- [ ] `OWNER` tạo, xem, sửa và ngưng dùng danh mục/món/size/topping trong store của mình theo spec; dữ liệu có tham chiếu được giữ lại. Tên và giá tuân theo BR-13/BR-103.
- [ ] Món có giá theo size; món chưa có size bán được không xuất hiện như lựa chọn bán. Topping chỉ được chọn cho danh mục đã liên kết. Menu và giá giống nhau giữa các chi nhánh cùng store (BR-08, BR-11, BR-100).
- [ ] Ảnh món là tùy chọn; upload và đọc ảnh kiểm tra quyền/store, kích thước và định dạng đã chốt. Response danh sách không chứa nội dung ảnh hay đường dẫn lưu nội bộ (BR-105).
- [ ] API chặn người không có quyền, `PLATFORM_ADMIN`, store bị khóa và ID tham chiếu khác store; không ghi dữ liệu khi bị từ chối. Kiểm tra qua HTTP với PostgreSQL thật.
- [ ] UI quản lý thực đơn dùng API thật; lưu xong và tải lại vẫn thấy dữ liệu DB, hiển thị lỗi/trạng thái bằng tiếng Việt và không trộn dữ liệu khi đổi phạm vi hoặc request cũ về muộn.
- [ ] Nếu phạm vi đọc menu POS được chốt: chỉ hiển thị món/size/topping đang bán theo BR-09, và thay đổi giá không làm đổi dữ liệu đơn đã có theo BR-12 khi PB-07 được triển khai. Không tick phần đơn/snapshot trong sprint này khi chưa có API đơn thật.

## Kiểm tra và bằng chứng dự kiến

Trước khi chạy, lập ma trận cho từng vế tiêu chí và artifact cần lưu. API/DB cần test quyền, tenant, ràng buộc tên/giá, trạng thái ngưng dùng, liên kết topping, upload/đọc ảnh và DB trước/sau các thao tác ghi. UI cần snapshot trước/sau, request/response đã che dữ liệu nhạy cảm, reload và tình huống response cũ. Lưu output runner và artifact gốc trong `qa-evidence/`; ghi SHA, trạng thái working tree, môi trường, lệnh, thời điểm và exit code trong `run.md`. Chỉ tick sau khi QA mở lại artifact; phân biệt local, CI độc lập và chưa xác minh. Definition of Ready/Done theo [Sprint 1](../sprint-01/SPRINT.md#cách-vận-hành-mỗi-tuần).

## Quyết định cần chốt trong planning/refinement

1. Đã chốt ngày 02/11/2026: Sprint Goal, sức chứa PB-05 + lát cắt PB-13 thực đơn và lịch 02–08/11/2026.
2. Chốt chi tiết CRUD/ngưng dùng và quan hệ giữa danh mục, món, size, topping; quyền đọc menu của nhân viên và màn POS; xử lý món/size/topping ngưng dùng trong UI.
3. Chốt định dạng ảnh được phép và hành vi thay/xóa ảnh theo thiết kế DB/kiến trúc trước khi viết endpoint ảnh.
4. Chốt hợp đồng endpoint, tình huống lỗi/đồng thời, ma trận nghiệm thu và phạm vi UI. Spec hiện chưa có trong `specs/`.

## Review và retrospective

Chưa thực hiện. Ghi kết quả từng item, liên kết bằng chứng, quyết định Product Owner và một cải tiến quy trình sau khi sprint diễn ra.
