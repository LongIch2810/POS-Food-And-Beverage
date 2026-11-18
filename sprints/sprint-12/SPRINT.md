# Sprint 12 — Hao hụt, Kiểm kê, Nhật ký kiểm toán

**Trạng thái:** Đề xuất ngày 18/11/2026, **chưa được Product Owner chốt**; chưa có spec, plan hay task.

**Nguồn:** [Product Backlog](../../docs/PRODUCT_BACKLOG.md) PB-18, PB-20 và lát cắt PB-13; [Business Rules](../../docs/BUSINESS_RULES.md) BR-109, BR-111..BR-114, BR-67, BR-68, BR-50; [Sprint 11](../sprint-11/SPRINT.md).

## Cơ sở và quyết định phạm vi

- PB-18 phụ thuộc PB-17 (Sprint 11). PB-20 phụ thuộc PB-17 và PB-18 vì nhật ký phải ghi nhập, hao hụt, kiểm kê.
- Nhật ký làm **trước** giảm giá tay (PB-24, Sprint 15) để thao tác nhạy cảm mới ghi được ngay từ đầu.
- Trang cài đặt ngưỡng bất thường của `OWNER` (BR-114) cũng là nơi cài giới hạn giảm tay của PB-24; sprint này dựng nơi cài đặt cửa hàng dùng chung.
- **Rủi ro tải:** PB-20 rộng (nhiều module cùng ghi log). Nếu quá tải, cắt báo cáo bất thường (S12-07) sang Sprint 13 và ghi vào Backlog.

## Sprint Goal

Quản lý ghi hao hụt có lý do và kiểm kê theo đợt đếm mù; màn Kho có danh sách và huy hiệu "Sắp hết". Mọi thao tác nhạy cảm của BR-113 được ghi vào `audit_logs` chỉ thêm, trong cùng transaction; `OWNER`/`MANAGER` xem theo phạm vi, `OWNER` cấu hình ngưỡng báo cáo bất thường.

## Sprint Backlog và thứ tự thực hiện

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Spec PB-18 + PB-20 | Hợp đồng API hao hụt, đợt kiểm kê, danh sách sắp hết, `audit_logs`, cách dọn log 12 tháng, ngưỡng bất thường; danh sách thao tác phải ghi log. | Sprint 11 đã xong. | Chưa bắt đầu |
| 2 | PB-18 — Hao hụt | `WASTE` với lý do cố định + ghi chú, chặn vượt tồn. | Spec. | Chưa bắt đầu |
| 3 | PB-18 — Kiểm kê theo đợt | Mở đợt, nhập số đếm mù, chốt đợt ghi `ADJUST` cho nguyên liệu lệch. | Spec. | Chưa bắt đầu |
| 4 | PB-18 — Sắp hết | Danh sách và huy hiệu số trên menu Kho. | Item 2–3 hoặc độc lập. | Chưa bắt đầu |
| 5 | PB-20 — `audit_logs` | Bảng chỉ thêm, hạ tầng ghi log gọi từ các service nhạy cảm; xem log theo phạm vi; dọn log quá 12 tháng. | Spec; migration. | Chưa bắt đầu |
| 6 | PB-20 — Ngưỡng và báo cáo bất thường | `OWNER` cấu hình ngưỡng; báo cáo thu ngân hủy đơn nhiều, ca lệch nhiều lần liên tiếp. | Item 5. | Chưa bắt đầu |
| 7 | PB-13 — UI Hao hụt/Kiểm kê/Sắp hết/Nhật ký/Cài đặt ngưỡng | Dùng API thật. | API item 2–6. | Chưa bắt đầu |
| 8 | Review và QA cấp sprint | Kiểm từng AC. | Item 1–7. | Chưa bắt đầu |

## Tiêu chí nghiệm thu cấp Sprint 12

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu | Nghiệm thu |
| --- | --- | --- | --- | --- |
| S12-01 | Hao hụt bắt buộc lý do từ danh sách cố định; số lượng vượt tồn hiện tại bị chặn không ghi gì; thành công ghi dòng `WASTE` và trừ tồn nguyên tử (hai request đồng thời không làm tồn âm). | BR-109 | Test PostgreSQL gồm đồng thời, SQL đối chiếu. | ☐ |
| S12-02 | Kiểm kê theo đợt: khi đợt mở, API/UI không trả tồn hệ thống; chốt đợt ghi đúng một dòng `ADJUST` cho mỗi nguyên liệu lệch, không ghi cho nguyên liệu khớp; đợt đã chốt không sửa. | BR-111 | HTTP, DB, kiểm payload không chứa tồn. | ☐ |
| S12-03 | Danh sách "Sắp hết" gồm đúng nguyên liệu có `current_stock ≤ min_stock` trong phạm vi chi nhánh; huy hiệu menu Kho khớp số lượng. | BR-112 | API/DB, browser. | ☐ |
| S12-04 | Mọi thao tác trong BR-113 ghi một dòng `audit_logs` trong cùng transaction (lỗi nghiệp vụ không để lại log mồ côi, rollback thì không có log); dòng có ai/lúc nào/hành động/đối tượng/trước-sau/lý do/`requestId`; không chứa mật khẩu hay token. | BR-113 | Test từng thao tác, quét nội dung log tìm bí mật. | ☐ |
| S12-05 | Bảng `audit_logs` chỉ thêm: không có API/đường nào sửa hoặc xóa dòng còn hạn; `OWNER` xem toàn cửa hàng, `MANAGER` chỉ chi nhánh mình, `CASHIER` và `PLATFORM_ADMIN` bị chặn; cross-store bị chặn. | BR-113; BR-77 | HTTP theo vai trò; thử UPDATE/DELETE qua API. | ☐ |
| S12-06 | Dòng log quá 12 tháng bị xóa theo cơ chế đã chốt; dòng chưa quá hạn còn nguyên. | BR-113 | Test với dữ liệu giả lập ngày quá hạn. | ☐ |
| S12-07 | `OWNER` đặt và đổi được ngưỡng; báo cáo bất thường hiển thị đúng thu ngân/ca vượt ngưỡng; `MANAGER` không đổi ngưỡng. | BR-68; BR-114 | HTTP, DB, browser. | ☐ |
| S12-08 | UI Hao hụt, Kiểm kê, Sắp hết, Nhật ký dùng API thật, tiếng Việt, tablet ngang; đổi phiên không lộ dữ liệu; màn đếm kiểm kê không hiện tồn trong DOM/network. | PB-13 | Browser 1024×768, network đã che. | ☐ |

## Ranh giới và điểm cần chốt trước code

1. **Cách dọn log quá 12 tháng** (BR-113 còn mở): job nền hay khi có request. Theo `TECH_STACK`, Redis/BullMQ chỉ dùng khi thực sự cần; gợi ý chọn dọn khi có request (ví dụ lúc xem log) để khỏi thêm hạ tầng. Product Owner quyết.
2. Danh sách lý do hao hụt cố định (hết hạn, đổ vỡ, hỏng, khác...).
3. Đợt kiểm kê: ai mở/chốt, một chi nhánh có tối đa bao nhiêu đợt mở cùng lúc, nguyên liệu bán trong lúc đang đếm xử lý thế nào.
4. Ngưỡng bất thường: số đơn hủy trong khoảng nào, "ca lệch liên tiếp" là bao nhiêu ca và lệch bao nhiêu.
5. Danh sách chính xác "hành động" ghi log và `đăng nhập thất bại nhiều lần` nghĩa là bao nhiêu lần; tránh ghi log mỗi request đăng nhập sai gây phình bảng.
6. Dung lượng log: đầy đủ nội dung giá trị trước/sau theo quyết định, cần giới hạn kích thước JSON.

## Theo dõi planning

- Đề xuất lập ngày 18/11/2026; chưa được chốt. Mỗi mục "điểm cần chốt" phải có câu trả lời trước khi viết code phần phụ thuộc.
