# Sprint 13 — Báo cáo tuần/tháng/giờ cao điểm và Gói dịch vụ

**Trạng thái:** Đề xuất ngày 18/11/2026, **chưa được Product Owner chốt**; chưa có spec, plan hay task.

**Nguồn:** [Product Backlog](../../docs/PRODUCT_BACKLOG.md) PB-21, PB-25 và lát cắt PB-13; [Business Rules](../../docs/BUSINESS_RULES.md) BR-115, BR-119, BR-120, BR-82, BR-66; [Sprint 10](../sprint-10/SPRINT.md) (nền báo cáo ngày); [Sprint 12](../sprint-12/SPRINT.md).

## Cơ sở và quyết định phạm vi

- PB-21 mở rộng báo cáo ngày của Sprint 10 (tái dùng truy vấn theo `paid_at` giờ Việt Nam, quyền `report.view_*`).
- PB-25 phải xong **trước** PB-22 (lợi nhuận, Sprint 14) và PB-19 (PDF, Sprint 15) vì hai tính năng này chỉ có ở `PRO`. Sprint này dựng cơ chế "tính năng theo gói" để hai sprint sau dùng lại.
- PB-25 chạm xác thực (BR-82 `SUSPENDED`), tạo chi nhánh/tài khoản/bàn nên cần hồi quy các luồng này.

## Sprint Goal

`MANAGER`/`OWNER` xem báo cáo tuần, tháng và giờ cao điểm. `PLATFORM_ADMIN` gán gói `BASIC` hoặc `PRO`; giới hạn chi nhánh/tài khoản/bàn được áp thật, cửa hàng `EXPIRED` bị chặn ngay khi có request, và cơ chế bật/tắt tính năng theo gói sẵn sàng cho các sprint sau.

## Sprint Backlog và thứ tự thực hiện

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Spec PB-21 + PB-25 | Hợp đồng báo cáo tuần/tháng/giờ; mô hình gói, hạn dùng, trạng thái `EXPIRED`, cách gán và gia hạn, danh sách tính năng bật theo gói. | Chốt điểm mở bên dưới. | Chưa bắt đầu |
| 2 | PB-21 — API báo cáo | Tuần (bắt đầu thứ Hai), tháng lịch, giờ cao điểm 0–23 (số đơn + doanh thu), chỉ đơn `PAID`, theo `paid_at`. | Spec. | Chưa bắt đầu |
| 3 | PB-25 — Mô hình gói và giới hạn | Gói `BASIC`/`PRO` cố định, áp giới hạn khi tạo chi nhánh, tài khoản nhân viên, bàn. | Spec; migration. | Chưa bắt đầu |
| 4 | PB-25 — `EXPIRED` và gia hạn | Kiểm hạn khi có request, chặn ngay, giữ dữ liệu; `PLATFORM_ADMIN` gia hạn mở lại. | Item 3. | Chưa bắt đầu |
| 5 | PB-25 — Cổng tính năng theo gói | Cơ chế dùng chung để chặn tính năng `PRO` (lợi nhuận, PDF) với mã lỗi ổn định. | Item 3. | Chưa bắt đầu |
| 6 | PB-13 — UI Báo cáo tuần/tháng/giờ, UI Gói | Màn báo cáo mở rộng; màn quản trị nền tảng gán/gia hạn gói; thông báo giới hạn/hết hạn cho cửa hàng. | API item 2–5. | Chưa bắt đầu |
| 7 | Review và QA cấp sprint | Kiểm từng AC, hồi quy xác thực và tạo chi nhánh/nhân viên/bàn. | Item 1–6. | Chưa bắt đầu |

## Tiêu chí nghiệm thu cấp Sprint 13

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu | Nghiệm thu |
| --- | --- | --- | --- | --- |
| S13-01 | Báo cáo tuần bắt đầu thứ Hai và tháng theo lịch, giờ `Asia/Ho_Chi_Minh`, chỉ đơn `PAID` theo `paid_at`; đơn tại biên tuần/tháng/nửa đêm UTC+7 vào đúng kỳ. | BR-115; BR-62..63 | Test PostgreSQL biên kỳ, SQL đối chiếu. | ☐ |
| S13-02 | Giờ cao điểm trả đủ 24 mốc 0–23 với số đơn và doanh thu; giờ trống trả 0. | BR-115 | API/DB, browser. | ☐ |
| S13-03 | `CASHIER` không xem được báo cáo tuần/tháng/giờ; `MANAGER` chỉ chi nhánh mình; `OWNER` toàn cửa hàng hoặc chọn chi nhánh; `PLATFORM_ADMIN` và cross-store bị chặn. | BR-115; BR-77 | HTTP theo vai trò. | ☐ |
| S13-04 | `PLATFORM_ADMIN` gán đúng một trong `BASIC`/`PRO`, không nhập giới hạn tay; cửa hàng mới và cửa hàng hiện có có gói xác định theo quyết định migration. | BR-119 | HTTP, DB. | ☐ |
| S13-05 | Giới hạn gói được áp thật: `BASIC` 1 chi nhánh / 5 tài khoản nhân viên / 15 bàn mỗi chi nhánh, `PRO` 5 / 30 / không giới hạn bàn; vượt thì từ chối với mã lỗi ổn định, kể cả khi tạo song song. | BR-119 | Test ở biên N và N+1, đồng thời. | ☐ |
| S13-06 | Cửa hàng `EXPIRED` bị chặn mọi API của người dùng ngay ở request đầu tiên sau hạn, không ân hạn, thu hồi phiên theo cách cùng loại `SUSPENDED`; dữ liệu giữ nguyên; `PLATFORM_ADMIN` gia hạn thì đăng nhập lại dùng được. | BR-120; BR-82 | HTTP trước/sau hạn, DB đối chiếu dữ liệu nguyên. | ☐ |
| S13-07 | Tính năng chỉ `PRO` trả lỗi ổn định cho `BASIC` và hoạt động cho `PRO`; đổi gói có hiệu lực ngay. | BR-119 | HTTP mẫu endpoint thử cổng. | ☐ |
| S13-08 | UI báo cáo mở rộng và UI gói dùng API thật, tiếng Việt, ngày `dd/MM/yyyy`, VND, tablet ngang; đổi phiên không lộ dữ liệu cũ. | PB-13; DESIGN mục 5.6 | Browser 1024×768, network đã che. | ☐ |

## Ranh giới và điểm cần chốt trước code

1. Mô hình hạn gói: có trường ngày hết hạn không, ai đặt (`PLATFORM_ADMIN` khi gán/gia hạn), `BASIC` có hạn không. BR-120 chỉ nói "hết hạn gói" mà chưa nêu cách nhập hạn.
2. **Cửa hàng hiện có** nhận gói nào khi migration (đề xuất `PRO` để không chặn dữ liệu đang có; Product Owner quyết) và xử lý ra sao nếu hạ gói mà dữ liệu hiện có đã vượt giới hạn mới (đề xuất: không xóa, chỉ chặn tạo thêm).
3. Giới hạn tính tài khoản nhân viên: có đếm tài khoản đã khóa/ngưng không; có đếm `OWNER`, bàn đã ngưng không.
4. `EXPIRED` có áp cho `OWNER` đăng nhập để xem thông báo hay chặn hẳn; nội dung thông báo cho người dùng.
5. Tuần/tháng: khoảng được chọn, giới hạn kỳ trả về cho biểu đồ, chi nhánh mặc định cho `OWNER`.

## Theo dõi planning

- Đề xuất lập ngày 18/11/2026; chưa được chốt. Nếu Product Owner muốn lợi nhuận hoặc PDF sớm hơn, PB-25 cần đứng đầu sprint.
