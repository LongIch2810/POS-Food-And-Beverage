# PRODUCT_BACKLOG

**Trạng thái:** Product Backlog còn được refinement. Thứ tự dưới đây là ưu tiên đề xuất cho MVP; [Sprint 2 đã kết thúc ngày 30/10/2026](../sprints/sprint-02/SPRINT.md#kết-luận-sprint-2--2026-10-30). [Sprint 3 đã kết thúc và được Product Owner nghiệm thu local ngày 01/11/2026](../sprints/sprint-03/SPRINT.md#kết-luận-sprint-3--2026-11-01): PB-04 + PB-13 tổ chức. Lịch ban đầu 30/10–05/11/2026 được giữ trong hồ sơ; sprint kết thúc sớm. [Sprint 4](../sprints/sprint-04/SPRINT.md) đã hoàn thành triển khai và kiểm thử PB-05 (Thực đơn) + lát cắt PB-13 thực đơn ngày 02/11/2026, sẵn sàng nghiệm thu. [Sprint 5](../sprints/sprint-05/SPRINT.md#kết-luận-đóng-sprint-05--05112026) đã kết thúc và được nghiệm thu local ngày 05/11/2026 cho PB-06 (Ca làm) + lát cắt PB-13 ca làm, 19/19 tiêu chí PASS. [Sprint 6](../sprints/sprint-06/SPRINT.md) đã kết thúc và được nghiệm thu local ngày 07/11/2026 cho PB-07 + lát cắt PB-13 bán hàng, S6-01..09 PASS. Bảng này không thay thế đặc tả endpoint.

Nguồn phạm vi: [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md) mục 5; quy tắc chi tiết ở [BUSINESS_RULES.md](BUSINESS_RULES.md). PB-01, PB-02 và lát cắt xác thực của PB-13 đã được Product Owner nghiệm thu. Ngày30/10/2026, PB-03 và PB-13 lát cắt quản trị nền tảng được nghiệm thu local theo phạm vi và bằng chứng trong [Sprint 2](../sprints/sprint-02/SPRINT.md). Ngày01/11/2026, PB-04 và PB-13 tổ chức được nghiệm thu local trong Sprint 3. UI đăng nhập/quản trị nền tảng/Cài đặt tổ chức, Thực đơn, Ca làm và lát cắt Bán hàng/Sơ đồ bàn của Sprint 6 dùng API thật; thanh toán, khuyến mãi, kho, báo cáo và các màn ngoài lát cắt đã nối API vẫn chưa được nghiệm thu. Mỗi item cần refinement và spec đã chốt trong `specs/` trước khi code phần tương ứng.

## Product Backlog MVP

| ID | Kết quả người dùng / điều kiện chấp nhận chính | Phụ thuộc |
| --- | --- | --- |
| PB-01 | API NestJS và PostgreSQL chạy local; migration riêng áp được từ DB trống và chạy lặp không nhân đôi; constraint auth được kiểm tra trên PostgreSQL thật; bootstrap tạo đúng một `PLATFORM_ADMIN` từ biến môi trường; health check trả `200`/`503` theo trạng thái DB. Chi tiết: [spec PB-01](../specs/foundation.md). | Không |
| PB-02 | Người dùng được cấp tài khoản có thể đăng nhập, đổi mật khẩu lần đầu, khôi phục/đăng xuất phiên; API lấy danh tính và quyền hiện hành, chặn tài khoản/store bị khóa. Không có đăng ký công khai. | PB-01; spec auth |
| PB-03 | `PLATFORM_ADMIN` tạo store và cấp `OWNER`, tạm khóa/mở lại store; không truy cập dữ liệu vận hành store. | PB-02; spec platform |
| PB-04 | `OWNER` tạo chi nhánh, đặt tiền đầu ca, quản lý bàn và cấp tài khoản `MANAGER`/`CASHIER` đúng phạm vi. | PB-03; spec tổ chức |
| PB-05 | `OWNER` quản lý danh mục, món, size, giá, topping và ảnh tùy chọn; POS đọc menu cùng store, không nhận giá từ client. | PB-04; spec menu |
| PB-06 | Thu ngân mở ca của mình; chỉ một ca thu ngân mở mỗi chi nhánh; tiền đầu ca do hệ thống điền. Nhân viên có thể ghi giờ vào/tan ca theo phạm vi MVP. | PB-04; spec ca |
| PB-07 | Thu ngân tạo đơn tại bàn hoặc mang đi và thêm món vào đơn mở; mỗi bàn tối đa một đơn mở, dòng món giữ snapshot tên/giá. | PB-05, PB-06; spec bán hàng |
| PB-08 | `OWNER`/`MANAGER` quản lý nguyên liệu, công thức theo size/topping, tồn từng chi nhánh và xem sổ kho chỉ thêm dòng. | PB-04, PB-05; spec kho |
| PB-08a | Người có quyền cấu hình mã giảm giá MVP để áp tối đa một mã cho một hóa đơn, theo điều kiện và giới hạn đã đặc tả. | PB-04; spec khuyến mãi |
| PB-09 | Thu ngân thanh toán đủ một lần bằng tiền mặt/chuyển khoản hoặc hoàn tất đơn 0đ; server tính tiền, áp tối đa một mã giảm; replay `Idempotency-Key` không thu thêm; thanh toán, trạng thái đơn và trừ kho trong một transaction. | PB-07, PB-08, PB-08a; spec thanh toán/khuyến mãi |
| PB-10 | Thu ngân ghi chi từ két và đóng ca bằng đếm mù; không đóng khi còn đơn mở; quản lý có thể đóng cưỡng chế theo quyền và lý do. | PB-06, PB-09; spec đối soát |
| PB-11 | Hủy đơn mở hoặc đơn đã trả tiền theo đúng quyền/lý do/ca; giữ lịch sử thanh toán và ghi hoàn kho bằng dòng mới. | PB-09; spec hủy đơn |
| PB-12 | Người có quyền xem doanh thu ngày theo giờ Việt Nam, tách tiền mặt/chuyển khoản và giới hạn dữ liệu theo ca/chi nhánh/store. | PB-09, PB-11; spec báo cáo |
| PB-13 | UI demo được nối API theo từng lát cắt đã hoàn thành; không dùng mock như nguồn thật cho luồng đó. POS phù hợp tablet ngang, tiếng Việt và VND. | Đi cùng PB-02 đến PB-12 |
| PB-14 | Web/API/DB vận hành cùng origin trên một VPS qua Docker Compose, migration riêng, sao lưu DB hằng ngày ra ngoài VPS và kiểm tra khôi phục. | Các lát cắt cần triển khai; chốt lựa chọn infra còn mở |

Mỗi PB được tách thành item nhỏ khi refinement. Các mục Giai đoạn 2 và Tùy chọn trong product overview nằm ngoài backlog MVP này.

## Việc theo dõi sau Sprint 2

PB-03 và PB-13 quản trị nền tảng đã nghiệm thu trong phạm vi đã chốt; không có item thuộc phạm vi đó bị trả lại vì không đạt. PB-04 và PB-13 tổ chức sau đó đã được nghiệm thu local trong Sprint 3; các việc khác dưới đây tiếp tục theo dependency hoặc phạm vi đã hoãn:

| Việc | Theo dõi tại | Điều kiện tiếp tục |
| --- | --- | --- |
| Chi nhánh, bàn, tài khoản MANAGER/CASHIER và UI thật | PB-04 + PB-13 tương ứng | Đã hoàn tất và được Product Owner nghiệm thu local ngày01/11/2026; [kết luận Sprint 3](../sprints/sprint-03/SPRINT.md#kết-luận-sprint-3--2026-11-01) dẫn bằng chứng và giới hạn. Chưa xác nhận production. |
| Chặn PLATFORM_ADMIN qua HTTP trên từng API vận hành thật | PB-06 đến PB-12 + PB-13 tương ứng | Kiểm tra khi endpoint ca/bán hàng/kho/thanh toán/báo cáo được triển khai; test context hiện tại không thay thế kiểm tra endpoint này. |
| UI nhật ký quản trị | Giai đoạn 2 | Chỉ triển khai khi có yêu cầu riêng; backend log BR-86 đã có trong PB-03. |
| Màn vận hành còn mock; vận hành production và sao lưu | Các lát cắt PB-13 còn lại; PB-14 | Không suy từ nghiệm thu local của auth/platform thành hoàn tất toàn bộ UI hoặc production. |

## Việc theo dõi sau Sprint 3

| Việc | Theo dõi tại | Điều kiện tiếp tục |
| --- | --- | --- |
| Thực đơn và UI tương ứng | PB-05 + PB-13 | Đã cam kết trong [Sprint 4](../sprints/sprint-04/SPRINT.md); cần refinement và chốt spec trước khi code. |
| Khóa sửa quỹ sau ca CASHIER đầu tiên | PB-06 | Tích hợp kiểm tra lịch sử ca dưới cùng khóa Branch với mở ca, trước khi bật API mở ca; chưa nghiệm thu hành vi sau ca. |
| API vận hành và UI còn dùng mock | PB-06..PB-12 + PB-13 | Triển khai và kiểm tra từng endpoint thật theo dependency; chưa nằm trong nghiệm thu Sprint 3. |
| Timeout cleanup DB QA lần đầu | [Error record](../errors/2026-11-01-pb13-api-qa-cleanup-timeout.md) | Lượt chạy lại qua48/48; nguyên nhân sâu chưa xác minh, giữ log để theo dõi. |
| Tích hợp Git, CI và production | Quy trình Git; PB-14 | Ngày02/11 đã tách commit và push theo yêu cầu PO; [CI tại dafd0b5 thành công](https://github.com/LongIch2810/POS-Food-And-Beverage/actions/runs/41379713471). Chưa merge; chưa xác minh triển khai, sao lưu hoặc khôi phục production. |

## Việc theo dõi sau Sprint 4

| Việc | Theo dõi tại | Điều kiện tiếp tục |
| --- | --- | --- |
| Ca làm và UI tương ứng | PB-06 + PB-13 | Triển khai ngày 03/11; đã nghiệm thu local 19/19 tiêu chí và đóng [Sprint 5](../sprints/sprint-05/SPRINT.md) ngày 05/11/2026. |
| Khóa sửa quỹ sau ca CASHIER đầu tiên | PB-06 | Đã hoàn thành và kiểm thử xác minh trong Sprint 5 (409 INITIAL_CASH_LOCKED). |
| Bán hàng và đơn hàng | PB-07 | Ghi nhận lịch sử dependency sau Sprint 4: PB-06 đã cung cấp `work_shift_id`; PB-07 sau đó hoàn tất và nghiệm thu local trong [Sprint 6](../sprints/sprint-06/SPRINT.md). |
| Màn vận hành còn mock; vận hành production và sao lưu | Các lát cắt PB-13 còn lại; PB-14 | Tiếp tục theo dependency sau PB-06/PB-07. |

## Việc theo dõi sau Sprint 5

| Việc | Theo dõi tại | Điều kiện tiếp tục |
| --- | --- | --- |
| Bán hàng và đơn hàng (Invoices, Bàn, Món) | PB-07 + PB-13 | Đã nghiệm thu local và đóng [Sprint 6](../sprints/sprint-06/SPRINT.md) ngày 07/11/2026 theo yêu cầu Product Owner; QA cấp sprint S6-01..09 PASS. Phạm vi gồm chuyển bàn BR-92, hủy đơn `OPEN` BR-28 và UI bán hàng/bàn dùng API thật. |
| Chi phí két & Đối soát tiền mặt chi tiết | PB-10 | Phụ thuộc vào PB-07 (bán hàng) và PB-09 (thanh toán). |
| Màn vận hành còn mock; vận hành production và sao lưu | Các lát cắt PB-13 còn lại; PB-14 | Tiếp tục theo dependency sau PB-07. |

## Việc theo dõi sau Sprint 6

| Việc | Theo dõi tại | Điều kiện tiếp tục |
| --- | --- | --- |
| Nguyên liệu, công thức và tồn kho theo chi nhánh | PB-08 | Phụ thuộc PB-04/PB-05 đã có; cần refinement/spec và quyết định phạm vi sprint kế tiếp. Chưa coi PB-08 đã triển khai. |
| Khuyến mãi MVP | PB-08a | Phụ thuộc PB-04 đã có; cần refinement/spec trước khi làm. PB-09 thanh toán phụ thuộc cả PB-08 và PB-08a. |
| Thanh toán, hóa đơn PAID và trừ kho | PB-09 | Chỉ lên kế hoạch sau PB-08/PB-08a theo dependency trong Product Backlog; Sprint 6 mới nghiệm thu đơn OPEN. |
| Đối soát chi tiết, màn vận hành còn demo và production | PB-10, các lát cắt PB-13 còn lại, PB-14 | Giữ ngoài nghiệm thu Sprint 6; tiếp tục theo dependency và quyết định Product Owner. |

Các dòng trên là việc còn lại để chọn khi lập sprint mới, **chưa phải Sprint 7 đã được chốt**. Nghiệm thu Sprint 6 chỉ là local trên working tree chưa commit; CI, merge và production còn là bước riêng.

Hồ sơ sprint: [Sprint 1 (đã kết thúc)](../sprints/sprint-01/SPRINT.md), [Sprint 2 (đã kết thúc)](../sprints/sprint-02/SPRINT.md), [Sprint 3 (đã kết thúc, nghiệm thu local)](../sprints/sprint-03/SPRINT.md), [Sprint 4 (hoàn thành triển khai, sẵn sàng nghiệm thu)](../sprints/sprint-04/SPRINT.md), [Sprint 5 (đã kết thúc, nghiệm thu local)](../sprints/sprint-05/SPRINT.md), [Sprint 6 (đã kết thúc, nghiệm thu local)](../sprints/sprint-06/SPRINT.md).
