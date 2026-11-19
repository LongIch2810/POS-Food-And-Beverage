# Sprint 11 — Bãi bỏ hủy đơn PAID, Nhập hàng có giá vốn và Chọn ngân hàng

**Trạng thái:** Product Owner **đã chốt phạm vi ngày 18/11/2026** (PB-16, PB-17, chọn ngân hàng ở Cài đặt). Chưa có spec, plan hay task; lịch **18/11–24/11/2026** (7 ngày, bắt đầu 18/11). Các điểm "cần chốt trước code" bên dưới vẫn phải có câu trả lời trước khi code phần phụ thuộc.

**Nguồn:** [Product Backlog](../../docs/PRODUCT_BACKLOG.md) PB-16, PB-17 và lát cắt PB-13 tương ứng; [Business Rules](../../docs/BUSINESS_RULES.md) BR-106..BR-108, BR-110, BR-50; [Sprint 10](../sprint-10/SPRINT.md) (sprint trước); [quy ước API](../../docs/api-spec.md).

## Cơ sở và quyết định phạm vi

- Giai đoạn 2 chạy và nghiệm thu local, không phụ thuộc PB-14. SePay chỉ Test mode.
- PB-16 đổi hành vi PB-11 đã triển khai nên làm **đầu tiên** (đã chốt ở Backlog) để các sprint sau không phải tính thêm nhánh "hủy đơn `PAID`" (hoàn kho, hoàn lượt mã, đối soát) vào báo cáo, lợi nhuận và PDF.
- PB-17 là nền của giá vốn (PB-22), kiểm kê/hao hụt (PB-18) và nhật ký (PB-20), nên đi sớm.
- Không có hoàn tiền một phần, không sửa hóa đơn `PAID` (BR-110).

## Sprint Goal

Đơn `PAID` bất biến: chỉ đơn `OPEN` hủy được. `OWNER`/`MANAGER` nhập hàng bằng phiếu có đơn giá, kho cộng đúng, giá vốn bình quân gia quyền cập nhật; phiếu ghi sai được hủy bằng dòng đảo dấu. UI Kho dùng API thật. Cài đặt tài khoản nhận tiền cho `OWNER` chọn ngân hàng từ danh sách thay vì gõ mã BIN.

## Sprint Backlog và thứ tự thực hiện

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Spec PB-16 | Danh sách chính xác endpoint, mã lỗi, UI, test và tài liệu cần gỡ; cách xử lý lỗi khi gọi endpoint đã gỡ. | Rà quyền và mã lỗi hủy đơn `PAID`, BR-21/29/39/47. | Đã xong 19/11/2026 (QA local, [report-1](../../.devloopflow/verify/20261118-sprint11-pb16-remove-cancel-paid/report-1.md)) |
| 2 | PB-16 — gỡ hủy đơn `PAID` | API, UI, test, mã lỗi, permission và tài liệu khớp BR-110; dữ liệu `CANCELLED` cũ giữ nguyên; hủy đơn `OPEN` không đổi. | Spec item 1. | Đã xong 19/11/2026 (QA local, [report-1](../../.devloopflow/verify/20261118-sprint11-pb16-remove-cancel-paid/report-1.md)) |
| 3 | Spec PB-17 + PB-13 Kho | Hợp đồng phiếu nhập, công thức giá vốn bình quân kể cả tồn 0/âm, hủy phiếu, mã permission nhập hàng, lỗi. | Chốt các điểm mở bên dưới. | Chưa bắt đầu |
| 4 | PB-17 — API phiếu nhập | Tạo/xem/hủy phiếu; ghi `IMPORT` và đảo dấu trong sổ kho; cập nhật tồn và giá vốn nguyên tử, cùng transaction. | Spec item 3; migration mới. | Chưa bắt đầu |
| 5 | PB-13 — UI nhập hàng | Màn nhập hàng và danh sách/hủy phiếu trong Kho dùng API thật, tiếng Việt, VND, tablet ngang. | API item 4. | Chưa bắt đầu |
| 6 | PB-13 — Chọn ngân hàng ở Cài đặt | Thay ô "Mã ngân hàng" (gõ 6 chữ số) bằng select box danh sách ngân hàng; tên chủ tài khoản và số tài khoản giữ nguyên ô nhập và kiểm tra hiện có. Giá trị lưu vẫn là `bank_bin`, không đổi schema. | Spec endpoint danh sách + cache (điểm mở 6). | Chưa bắt đầu |
| 7 | Review và QA cấp sprint | Kiểm từng AC trên API/DB/browser cuối. | Item 1–6. | Chưa bắt đầu |

## Tiêu chí nghiệm thu cấp Sprint 11

Ô ☑ chỉ điền sau QA cấp sprint trên mã/UI cuối với artifact đủ từng vế.

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu | Nghiệm thu |
| --- | --- | --- | --- | --- |
| S11-01 | Hủy đơn `PAID` bị từ chối ở API; UI không còn thao tác này; hủy đơn `OPEN` vẫn hoạt động; hóa đơn `CANCELLED` cũ không đổi và vẫn xem được. | PB-16; BR-110 | HTTP trên đơn `PAID`/`OPEN`; DB trước/sau; browser. | ☑ ([report-1](../../.devloopflow/verify/20261118-sprint11-pb16-remove-cancel-paid/report-1.md)) |
| S11-02 | Endpoint, mã lỗi, permission và test của hủy đơn `PAID` đã gỡ; `docs/api-spec.md`, BR và README khớp mã. | PB-16 | `rg` kết quả, build/test, diff tài liệu. | ☑ ([report-1](../../.devloopflow/verify/20261118-sprint11-pb16-remove-cancel-paid/report-1.md)) |
| S11-03 | Phiếu nhập nhiều dòng có đơn giá: tồn từng nguyên liệu cộng đúng, một dòng `IMPORT` mỗi nguyên liệu, tất cả trong một transaction (lỗi giữa chừng không ghi gì). | PB-17; BR-106 | Test PostgreSQL, SQL đối chiếu tồn và sổ kho, ca lỗi giữa chừng. | ☐ |
| S11-04 | Giá vốn bình quân gia quyền tính đúng theo cặp chi nhánh + nguyên liệu qua nhiều lần nhập, gồm ca tồn bằng 0 hoặc âm theo spec. | BR-107 | Test với số cụ thể, SQL đối chiếu, số nguyên không làm tròn sai. | ☐ |
| S11-05 | Phiếu không sửa được; hủy phiếu giữ phiếu gốc, đánh dấu đã hủy, sinh dòng đảo dấu, tính lại giá vốn; hủy lần hai bị chặn. | BR-108 | HTTP, DB, thử sửa/hủy lặp. | ☐ |
| S11-06 | `MANAGER` chỉ nhập cho chi nhánh mình, `OWNER` mọi chi nhánh, `CASHIER` và `PLATFORM_ADMIN` bị chặn; ID chi nhánh/nguyên liệu khác store bị từ chối. | BR-50; BR-77 | HTTP theo vai trò và ID thật. | ☐ |
| S11-07 | UI nhập hàng và hủy phiếu dùng API thật, không dùng mock; trạng thái tải/rỗng/lỗi; đổi phiên không lộ dữ liệu cũ. | PB-13 | Browser 1024×768, network đã che, DB đối chiếu. | ☐ |
| S11-08 | Cài đặt tài khoản nhận tiền hiển thị select box ngân hàng (tên ngân hàng, có tìm/gõ lọc được); chọn xong lưu đúng `bank_bin` của ngân hàng đó; khi không tải được danh sách thì có thông báo và ô nhập tay mã BIN; tài khoản đã lưu hiển thị đúng ngân hàng khi mở lại; số tài khoản và tên chủ tài khoản giữ nguyên hành vi và kiểm tra cũ. | PB-13; `store_bank_account.manage` | Browser 1024×768, network (`PUT` gửi `bankBin` hợp lệ), DB đối chiếu. | ☐ |
| S11-09 | Mã QR VietQR và luồng chuyển khoản sinh từ tài khoản mới chọn vẫn đúng (hồi quy Sprint 08); khi lấy được danh sách, API từ chối `bankBin` không có trong đó; khi VietQR lỗi thì UI chuyển sang nhập tay BIN 6 chữ số và API chỉ kiểm định dạng; tài khoản cũ có BIN ngoài danh sách không bị mất dữ liệu và UI báo rõ để chọn lại. | PB-09; BR thanh toán | HTTP với BIN hợp lệ/không hợp lệ, QR đối chiếu, dữ liệu cũ. | ☐ |

## Ranh giới và điểm cần chốt trước code

1. Cách tính giá vốn bình quân khi tồn bằng 0 hoặc âm (BR-107 để mở). Gợi ý để Product Owner cân nhắc: coi tồn âm là 0 khi tính, lô nhập mới đặt giá vốn bằng đơn giá nhập.
2. Hủy phiếu khi tồn hiện tại đã thấp hơn số lượng phiếu (đã bán/hao hụt): chặn hay cho tồn âm; cách tính lại giá vốn sau hủy.
3. Mã permission nhập hàng và có tách quyền hủy phiếu hay không.
4. Đơn giá nhập: đơn vị tiền (đồng/đơn vị tồn) và độ chính xác khi nguyên liệu có số lẻ.
6. **Nguồn danh sách ngân hàng — đã chọn (18/11/2026): gọi API công khai VietQR lúc chạy** (`GET https://api.vietqr.io/v2/banks`; đã kiểm: 76 ngân hàng, mỗi mục có `name`, `shortName`, `code`, `bin`, `logo`, `transferSupported`). Hệ quả cần chốt trong spec: UI không gọi thẳng VietQR mà gọi endpoint của API (cùng origin, cần quyền `store_bank_account.manage`); API cache kết quả (repo đã có Redis từ PR #26, kiểm cách dùng) với TTL do spec đặt; timeout; **khi VietQR lỗi hoặc không phản hồi** thì UI báo lỗi, cho thử lại và **chuyển sang ô nhập tay mã BIN 6 chữ số** (như hiện tại); API khi không lấy được danh sách chỉ kiểm định dạng 6 chữ số, không chặn lưu; tài khoản đã lưu vẫn hiển thị và QR đang dùng không bị ảnh hưởng. Rủi ro cần chấp nhận: BIN gõ tay sai sẽ lưu được và làm QR sai ngân hàng; spec nên cân nhắc hiện tên ngân hàng/cảnh báo xác nhận khi lưu ở chế độ nhập tay. Chỉ lấy các ngân hàng `transferSupported`. Cập nhật `THIRD_PARTY_INTEGRATIONS.md` (VietQR thêm API danh sách ngân hàng).
   - **Xử lý khi API ngoài lỗi hoặc sai (đã duyệt 18/11/2026):** timeout ngắn 3–5 giây, không retry dồn dập, cache ngắn trạng thái lỗi (vài chục giây). Kiểm dữ liệu trước khi dùng: HTTP 200, `code === "00"`, `data` là mảng, mỗi mục có `bin` khớp `/^\d{6}$/` và `name` là chuỗi không rỗng; bỏ riêng mục sai, coi cả danh sách là lỗi nếu mất hết hoặc còn quá ít so với bản cache tốt gần nhất. Giữ bản cache tốt cuối cùng, dữ liệu xấu không ghi đè cache. Không có danh sách mới lẫn cache thì UI báo lỗi và cho nhập tay BIN. Ghi log mọi lần lỗi kèm `requestId`. Dữ liệu sai nhưng đúng định dạng không phát hiện tự động được: luôn hiện tên ngân hàng cạnh BIN, chế độ nhập tay có cảnh báo "BIN chưa kiểm được", kiểm QR thật trước khi dùng. Luồng thanh toán và sinh QR chỉ đọc BIN đã lưu trong DB nên không phụ thuộc VietQR lúc bán.
7. Hiện UI kiểm `bankBin` đúng 6 chữ số và API chỉ kiểm định dạng; S11-09 giả định API sẽ kiểm theo danh sách VietQR. Test không được gọi mạng thật: cần giả lập VietQR (thành công, lỗi, timeout).
5. Dữ liệu `CANCELLED` cũ và hoàn kho cũ không đổi; báo cáo cũ không phải sửa.

## Theo dõi planning

- Đề xuất lập ngày 18/11/2026; Product Owner chốt phạm vi cùng ngày, gồm việc thêm select box ngân hàng (nguồn: API VietQR lúc chạy, lỗi thì nhập tay BIN). Lịch 18–24/11/2026 do Product Owner chốt cùng ngày.
- Khi bắt đầu: lập spec và plan/task devloopflow, ghi nhánh, HEAD, ma trận AC ↔ artifact. Sprint Review/Retrospective ghi riêng khi sprint chạy.
