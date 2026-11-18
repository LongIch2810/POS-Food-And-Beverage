# Sprint 15 — Hóa đơn PDF và Giảm giá tay

**Trạng thái:** Đề xuất ngày 18/11/2026, **chưa được Product Owner chốt**; chưa có spec, plan hay task.

**Nguồn:** [Product Backlog](../../docs/PRODUCT_BACKLOG.md) PB-19, PB-24 và lát cắt PB-13; [Business Rules](../../docs/BUSINESS_RULES.md) BR-122, BR-118, BR-41, BR-113, BR-114, BR-119, BR-121; [THIRD_PARTY_INTEGRATIONS.md](../../THIRD_PARTY_INTEGRATIONS.md); [Sprint 12](../sprint-12/SPRINT.md), [Sprint 14](../sprint-14/SPRINT.md).

## Cơ sở và quyết định phạm vi

- PB-19 cần cổng `PRO` (Sprint 13), logo (Sprint 14) và mã QR chuyển khoản đã có từ Sprint 08. Thứ tự phụ thuộc `PB-09` chỉ là nền; gói/logo mới là điều kiện thật.
- PB-24 cần nhật ký (PB-20, Sprint 12) để ghi mỗi lần giảm tay, và nơi cài đặt giới hạn thu ngân của `OWNER` (dựng ở Sprint 12).
- Cả hai chạm hóa đơn nhưng khác nhau: PDF chỉ đọc, giảm tay đổi cách tính tiền. Giảm tay phải qua cùng đường tính tiền server như mã giảm giá để không có hai nguồn sự thật.

## Sprint Goal

Gói `PRO` xuất hóa đơn `PAID` ra PDF khổ 80mm tiếng Việt có logo và mã QR. Thu ngân, quản lý, chủ cửa hàng áp giảm giá tay theo VND hoặc phần trăm do server tính; thu ngân bị giới hạn theo cài đặt của `OWNER`, vượt giới hạn cần quản lý.

## Sprint Backlog và thứ tự thực hiện

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Spec PB-19 + PB-24 | Hợp đồng PDF (bố cục, font, nguồn địa chỉ/QR), cách sinh; hợp đồng giảm tay, đơn vị giới hạn, tương tác với mã giảm giá, cơ chế vượt giới hạn. | Chốt điểm mở. | Chưa bắt đầu |
| 2 | PB-19 — Sinh PDF | Endpoint trả PDF cho đơn `PAID`; chỉ `PRO`; quyền theo phạm vi xem hóa đơn. | Spec; chọn thư viện PDF. | Chưa bắt đầu |
| 3 | PB-24 — Giảm tay | Áp giảm VND/% trên đơn `OPEN`, server tính, snapshot vào hóa đơn; giới hạn thu ngân; ghi `audit_logs`. | Spec; migration. | Chưa bắt đầu |
| 4 | PB-13 — UI PDF và Giảm tay | Nút xuất PDF trong Hóa đơn; điều khiển giảm tay tại màn bán/thanh toán; cài đặt giới hạn cho `OWNER`. | API item 2–3. | Chưa bắt đầu |
| 5 | Review và QA cấp sprint | Kiểm từng AC, hồi quy thanh toán và mã giảm giá. | Item 1–4. | Chưa bắt đầu |

## Tiêu chí nghiệm thu cấp Sprint 15

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu | Nghiệm thu |
| --- | --- | --- | --- | --- |
| S15-01 | PDF chỉ cho đơn `PAID` (đơn `OPEN`/`CANCELLED` bị từ chối); khổ hẹp kiểu 80mm; tiếng Việt có dấu hiển thị đúng. | BR-122 | Mở PDF thật, kiểm kích thước trang và chữ có dấu. | ☐ |
| S15-02 | PDF có đủ: tên cửa hàng, chi nhánh, địa chỉ, logo, mã QR chuyển khoản, phương thức và giờ thanh toán giờ Việt Nam; tổng tiền khớp hóa đơn. | BR-122; BR-121 | Trích nội dung PDF, đối chiếu DB. | ☐ |
| S15-03 | Chỉ gói `PRO` xuất được; `BASIC` bị chặn bằng mã lỗi ổn định; quyền theo phạm vi xem hóa đơn (thu ngân ca mình, quản lý chi nhánh, chủ cửa hàng); cross-store và `PLATFORM_ADMIN` bị chặn. | BR-119; BR-122; BR-77 | HTTP theo vai trò và gói. | ☐ |
| S15-04 | Giảm tay VND hoặc phần trăm do server tính; client không gửi được số tiền sau giảm; không giảm quá tổng, không âm, số nguyên VND; kết quả lưu trong hóa đơn và đúng với tổng thanh toán. | BR-118; BR-41 | Test biên (0, 100%, vượt), SQL đối chiếu. | ☐ |
| S15-05 | `CASHIER` giảm tay trong giới hạn `OWNER` đặt; chưa đặt giới hạn thì không giảm được; vượt giới hạn bị từ chối, `MANAGER`/`OWNER` áp được. | BR-118 | HTTP theo vai trò và trạng thái giới hạn. | ☐ |
| S15-06 | Giảm tay và mã giảm giá cùng tồn tại theo quy tắc đã chốt; thanh toán, trừ kho, lượt mã và đối soát vẫn đúng; replay `Idempotency-Key` không đổi số. | PB-09; BR-118 | Test kết hợp mã + giảm tay, replay. | ☐ |
| S15-07 | Mỗi lần giảm tay ghi `audit_logs` (ai, đơn, giá trị, lý do nếu có) trong cùng transaction. | BR-113 | DB đối chiếu. | ☐ |
| S15-08 | UI PDF và giảm tay dùng API thật, tiếng Việt, VND, tablet ngang; `OWNER` đặt/đổi giới hạn; thu ngân thấy rõ vì sao bị chặn. | PB-13 | Browser 1024×768, network đã che. | ☐ |

## Ranh giới và điểm cần chốt trước code

1. **Đơn vị giới hạn giảm tay** (BR-118 còn mở): VND hay phần trăm, theo từng hóa đơn hay theo ca/ngày. Cần quyết trước khi dựng cài đặt và bảng.
2. Giảm tay và mã giảm giá: được cùng áp không (BR-39 nói tối đa một mã mỗi hóa đơn); nếu cùng áp thì thứ tự tính (mã trước hay giảm tay trước) và giới hạn tổng.
3. Cơ chế "vượt giới hạn cần quản lý": thu ngân gửi yêu cầu, quản lý nhập lại tài khoản tại quầy, hay chuyển đơn cho quản lý áp. Cần chọn cách ít thay đổi nhất so với phiên và vai trò hiện có.
4. Thư viện PDF: cần chạy không biên dịch native (xem cảnh báo đường dẫn `&` trong CLAUDE.md) và nhúng font tiếng Việt; cập nhật `docs/architecture/TECH_STACK.md` cùng thay đổi.
5. Nguồn địa chỉ chi nhánh và dữ liệu QR; nếu hóa đơn tiền mặt thì hiển thị QR hay bỏ. Hóa đơn 0đ.
6. Giảm tay có cần lý do bắt buộc không (không ghi trong BR-118).

## Theo dõi planning

- Đề xuất lập ngày 18/11/2026; chưa được chốt. Thư viện PDF là quyết định công nghệ mới, cần Product Owner xác nhận trước khi thêm dependency.
