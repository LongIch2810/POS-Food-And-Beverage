# Sprint 6 — Bán hàng và đơn mở (PB-07 + PB-13)

**Trạng thái:** Sprint 6 đã được Product Owner yêu cầu hoàn tất và đóng ngày 07/11/2026; nghiệm thu **local** PB-07 và lát cắt PB-13 bán hàng, S6-01..S6-09 PASS. Lịch dự kiến 06–12/11/2026; kết thúc sớm theo yêu cầu ngày 07/11/2026. **Nguồn ưu tiên:** [Product Backlog](../../docs/PRODUCT_BACKLOG.md), mục “Việc theo dõi sau Sprint 5”.

## Cơ sở lập kế hoạch

- [Sprint 5](../sprint-05/SPRINT.md) đã kết thúc và nghiệm thu local PB-06 cùng lát cắt PB-13 ca làm; API ca cung cấp `work_shift_id` cho hóa đơn. Nghiệm thu Sprint 5 không chứng minh backend bán hàng đã chạy.
- [PB-07](../../docs/PRODUCT_BACKLOG.md) phụ thuộc PB-05 (thực đơn) và PB-06 (ca), hướng đến tạo đơn tại bàn hoặc mang đi và thêm món vào đơn `OPEN`. PB-13 nối UI theo từng lát cắt API thật.
- [Product Overview](../../docs/PRODUCT_OVERVIEW.md) mục 5–6, [Business Rules](../../docs/BUSINESS_RULES.md), [thiết kế DB](../../docs/DESIGN_DB_POS_SYSTEM.md) và [quy ước API](../../docs/api-spec.md) là nguồn bất biến. Spec PB-07 đã chốt tại [sales.md](../../.devloopflow/specs/sales.md) trước khi code.

## Sprint Goal đã chốt

Thu ngân có ca `CASHIER` đang mở tạo và quản lý được đơn `OPEN` cho bàn hoặc mang đi qua API và UI thật; món, size, topping và giá được lấy từ menu cùng store, server tính tiền và lưu snapshot để thay đổi menu về sau không làm đổi dòng đã gọi. Trạng thái bàn phản ánh đơn mở thực tế. Sprint này tạo nền cho thanh toán PB-09, chưa coi đơn `OPEN` là doanh thu hoặc đã trừ kho.

## Sprint Backlog đã chốt

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Refinement PB-07 và lát cắt PB-13 bán hàng | Chốt quyền, hợp đồng API, thao tác với đơn/bàn/món, quy tắc đồng thời, lỗi, UI và ma trận tiêu chí → tình huống → artifact; viết spec PB-07 bằng quy trình `create-pos-spec`. | Phạm vi và lịch đã được Product Owner chốt; đối chiếu BR và schema. | Hoàn tất; [spec](../../.devloopflow/specs/sales.md) |
| 2 | PB-07 — DB/API đơn `OPEN` | Migration/entity và API tạo, xem, liệt kê, cập nhật đơn mở và dòng món theo spec; gắn ca thu ngân và chi nhánh, sinh mã hóa đơn; partial unique index cho một đơn mở mỗi bàn; snapshot và tính lại tổng trong transaction. | Spec PB-07 đã chốt, plan task được duyệt. | Hoàn tất ở cấp task; QA AC-1..5/7..9 PASS local |
| 3 | PB-13 — UI bán hàng | Nối sơ đồ bàn, đơn tại bàn/mang đi, chọn món và đơn đang mở với API thật; phản ánh tải/lỗi và dữ liệu mới sau reload. Không dùng mock làm nguồn dữ liệu cho luồng đã nối. | API tương ứng đã chạy và có bằng chứng trên DB test. | Hoàn tất lát cắt task; QA AC-6 PASS local |
| 4 | Review và QA Sprint 6 | Review code, QA task rồi QA cấp sprint theo từng mã S6; lưu test/API/browser/DB artifact trên sandbox và đối chiếu bản mã/UI cuối. | Các task hoàn tất và tiêu chí đủ dấu vết theo `AGENTS.md`. | Hoàn tất: review 3 vòng, QA task và QA sprint PASS local, Sprint Review ghi bên dưới |

## Tiêu chí nghiệm thu Sprint 6 đã chốt

Mỗi mã dưới đây là tiêu chí **cấp sprint**; QA task chỉ đối chiếu AC của task và ghi mã S6 liên quan, không kết luận PASS cho Sprint 6. Mọi vế cần artifact riêng theo `AGENTS.md`. QA cấp sprint riêng đã đối chiếu S6-01..09 trên sandbox local; kết luận từng mã và artifact ở bảng dưới.

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu |
| --- | --- | --- | --- |
| S6-01 | Chỉ người có ca `CASHIER` của chính mình đang `OPEN` tạo được đơn; hóa đơn gắn đúng `work_shift_id` và chi nhánh của ca; chi nhánh ngưng dùng bị chặn tạo đơn. | PB-07; BR-16, BR-69, BR-76 | API thành công/từ chối, DB trước/sau, test integration trên PostgreSQL. |
| S6-02 | Đơn `DINE_IN` có bàn hoạt động cùng chi nhánh; `TAKEAWAY` không có bàn. Mỗi bàn tối đa một đơn `OPEN`, kể cả hai yêu cầu đồng thời; trạng thái bàn tính từ đơn `OPEN`. | BR-69, BR-74, BR-95, BR-99 | Test concurrency và constraint DB, API/DB bàn trống/có khách. |
| S6-03 | Mã hóa đơn do server sinh theo `HD` + 8 ký tự `A-Z/0-9`, duy nhất và cố định sau khi tạo; dữ liệu đơn chỉ lộ trong phạm vi store/branch được phép, `PLATFORM_ADMIN` bị chặn. | BR-75, BR-80, BR-81; api-spec mục 3 | Test uniqueness/collision và API phân quyền chéo store/branch. |
| S6-04 | Khách gọi thêm vào đơn `OPEN` của bàn; thêm món luôn tạo dòng mới; chỉ sửa/xóa dòng khi đơn còn `OPEN`. Menu ngưng dùng hoặc tham chiếu sai store không được thêm. | BR-09, BR-22, BR-91, BR-90, BR-80 | API/DB trước/sau, test thay đổi trạng thái và tham chiếu. |
| S6-05 | `quantity` món/topping dương; server lấy giá từ menu, không nhận giá/tổng client; lưu snapshot tên và giá. Thay đổi menu sau đó không đổi dòng cũ; `subtotal` tính lại từ các dòng trong transaction có khóa hóa đơn. | BR-12, BR-23–26, BR-90 | Test integration, DB snapshot và tổng trước/sau đổi giá/thêm món đồng thời. |
| S6-06 | UI POS cho chọn bàn hoặc mang đi, mở/đọc đơn và gọi thêm món bằng API thật; reload vẫn thấy đúng đơn/trạng thái bàn, lỗi và tải được thể hiện bằng tiếng Việt. | PB-07, PB-13; Product Overview mục 5–6 | Browser trên UI cuối, network request/response, DB trước/sau, ảnh/snapshot trạng thái. |
| S6-07 | Chuyển đơn `OPEN` sang bàn trống cùng chi nhánh; từ chối bàn bận, bàn ngưng dùng hoặc khác chi nhánh/store. Đơn cũ giữ nguyên món và tổng. | BR-92, BR-95, BR-69, BR-80 | API/DB trước/sau, test concurrency và browser trên UI cuối. |
| S6-08 | Thu ngân hủy được đơn `OPEN` khi có lý do bắt buộc; trạng thái thành `CANCELLED`, bàn được giải phóng và đơn không nhận thêm món. | BR-21, BR-22, BR-28, BR-99 | API/DB trước/sau, test quyền/trạng thái và browser trên UI cuối. |
| S6-09 | Không đóng ca CASHIER thường hoặc cưỡng chế khi còn hóa đơn `OPEN` gắn ca; lỗi `SHIFT_HAS_OPEN_INVOICES` nêu mã hóa đơn, ca và đối soát giữ nguyên. Sau khi xử lý hết đơn OPEN, đóng ca theo quy tắc hiện có. | BR-19; `specs/sales.md` mục Tích hợp đóng ca; quyết định Product Owner 06/11/2026 | API đóng/force-close trước/sau, DB ca/đối soát trước/sau, test integration trên PostgreSQL. |

## Kết luận QA cấp Sprint 6 trên sandbox

Nguồn từng mã là bảng tiêu chí Sprint 6 ngay phía trên; BR và expected/actual theo [báo cáo QA cấp sprint](../../.devloopflow/verify/20261107-001400-91cf4a1-sprint06-qa/report.md). QA đã chạy lại độc lập trên fixture PostgreSQL mới, UI cuối ở tablet 1024×768, lưu [lệnh, SHA/dirty, thời gian, exit code và output gốc](../../.devloopflow/verify/20261107-001400-91cf4a1-sprint06-qa/run.md). Agent chính đã mở lại report/run, kiểm tra mọi link local tồn tại, giải nén log test, xem log collision/quyền và ảnh/DB/network chính. Đây là bằng chứng **local**, chưa có CI độc lập hoặc commit chứa working tree được kiểm.

| Mã tiêu chí sprint | Trạng thái | Bằng chứng chính |
| --- | --- | --- |
| S6-01 | PASS | `manual-api-retry.log`, `manual-extra.log`, backend runner trong thư mục QA sprint |
| S6-02 | PASS | `manual-edge-retry.log`, UI/DB bàn trong thư mục QA sprint |
| S6-03 | PASS | `manual-collision-rights.log`, `db-final-codes.txt`, `db-final-code-index.txt` |
| S6-04 | PASS | `manual-api-retry.log`, `manual-edge-retry.log`, `manual-scope.log`, `manual-postcancel.log` |
| S6-05 | PASS | `manual-api-retry.log`, `manual-scope.log`, `manual-edge-retry.log` |
| S6-06 | PASS | `browser-s6-network*.json`, ảnh reload/loading/error/session và DB trong thư mục QA sprint |
| S6-07 | PASS | `manual-transfer.log`, browser trước/sau và DB sau chuyển trong thư mục QA sprint |
| S6-08 | PASS | `manual-collision-rights.log` (quyền), browser hủy/DB và `manual-postcancel.log` |
| S6-09 | PASS | `manual-api-retry.log` (close/force-close và DB trước/sau) |

Các tên artifact ngắn trong bảng nằm tại `qa-evidence/20261107-001400-91cf4a1-sprint06-qa/`; bảng `report.md` dẫn từng file cụ thể theo expected/actual. QA không thấy FAIL sản phẩm. Một số lượt harness exit 1 trước hoặc trong setup rồi chạy lại exit 0; xem `run.md`, không dùng lượt lỗi để kết luận. Kết luận đóng Sprint 6 nằm bên dưới; không suy production ready từ QA local.

## Ranh giới và dependency

- PB-09 xử lý thanh toán, `Idempotency-Key`, chuyển `PAID` và trừ kho; PB-08/PB-08a là dependency của PB-09. Không kết luận doanh thu hoặc tồn kho từ đơn `OPEN` của Sprint 6.
- PB-10 xử lý chi phí két và đối soát có doanh thu. Sprint 6 gồm hủy đơn `OPEN` (BR-28); PB-11 còn hủy đơn đã thanh toán theo quyền/lý do (BR-29). Sprint 6 cũng gồm chuyển bàn của đơn `OPEN` (BR-92).
- Tách/gộp bill thuộc Giai đoạn 2 (BR-101). Các màn POS ngoài lát cắt PB-07 còn có thể dùng demo/mock; phải ghi rõ phần nào là API thật.

## Lịch sử quyết định và refinement

1. Product Owner chốt lịch 06–12/11/2026 và phạm vi gồm cả chuyển bàn BR-92, hủy đơn `OPEN` BR-28 ngày 06/11/2026. Sức chứa lấy theo bốn item Sprint Backlog ở trên; điều chỉnh phạm vi phải ghi quyết định mới.
2. Hợp đồng endpoint, permission và lỗi cụ thể cho đơn, dòng món, bàn, topping; định dạng payload, cập nhật/xóa dòng và quy tắc UI đã được chốt trong [spec PB-07](../../.devloopflow/specs/sales.md) trước khi code. Không tự suy các chi tiết này từ code demo.
3. Ma trận AC task ↔ mã S6 và artifact DB test/browser đã lập trước QA trong [task PB-07](../../.devloopflow/tasks/completed/2026-11-06-pb07-open-orders.md) và [ma trận QA sprint](../../.devloopflow/verify/20261107-001400-91cf4a1-sprint06-qa/matrix.md). Product Owner đã bổ sung S6-09 riêng khi phát hiện thiếu mã sprint cho quy tắc chặn đóng ca còn đơn OPEN.

## Tiến độ, review và retrospective

Đã chốt phạm vi/lịch và bổ sung S6-09 theo quyết định Product Owner ngày 06/11/2026. [Plan triển khai](../../.devloopflow/plans/completed/2026-11-06-sprint-06-open-orders.md), [task PB-07](../../.devloopflow/tasks/completed/2026-11-06-pb07-open-orders.md) và [spec](../../.devloopflow/specs/sales.md) hoàn tất. Code-reviewer chạy 3 vòng, finding đã sửa; QA task độc lập kết luận AC-1..9 PASS local, có [report](../../.devloopflow/verify/20261106-175111-91cf4a1-pb07-qa/report.md) và [run](../../.devloopflow/verify/20261106-175111-91cf4a1-pb07-qa/run.md). QA cấp sprint riêng đã kiểm S6-01..09 và kết luận PASS local theo bảng trên. Backend test 68/68, UI test 39/39 và UI build đạt ở cả hai lượt QA. Quyết định đóng và retrospective ghi bên dưới.

## Kết luận nghiệm thu và đóng Sprint 6 — 07/11/2026

**Sprint Goal đạt trong phạm vi local.** Product Owner yêu cầu trong phiên ngày 07/11/2026 “đọc errors,plans,tasks đi để hoàn tất sprint để qua sprint khác”; theo quyết định đó, Sprint 6 kết thúc sớm ngày 07/11/2026. Phạm vi nghiệm thu là PB-07 API/DB đơn `OPEN`, chuyển bàn, hủy đơn và lát cắt PB-13 POS UI dùng API thật; chín tiêu chí S6-01..S6-09 đều PASS trong lượt QA cấp sprint độc lập. [Báo cáo QA](../../.devloopflow/verify/20261107-001400-91cf4a1-sprint06-qa/report.md) nối từng mã với expected/actual, request/response, DB và ảnh/network; [run](../../.devloopflow/verify/20261107-001400-91cf4a1-sprint06-qa/run.md) ghi lệnh, môi trường và exit code. QA task AC-1..9 PASS là tầng riêng, không thay kết luận QA sprint.

**Phiên bản nghiệm thu:** nhánh `feat/pb07-open-orders`, HEAD nền `91cf4a11d41a0d7e53bd6759e6e08260219376d5`, working tree dirty chứa mã Sprint 6 chưa commit. HEAD một mình không định danh toàn bộ snapshot đã kiểm; đối chiếu [trạng thái Git đầu/cuối QA sprint](../../.devloopflow/verify/20261107-001400-91cf4a1-sprint06-qa/run.md) với source hiện tại khi tích hợp. Đây là nghiệm thu local trên PostgreSQL sandbox và Chromium tablet; chưa có CI cho snapshot đã commit, chưa merge, chưa xác nhận production. Không commit/push trong lượt đóng sprint.

### Sprint Review và retrospective dựa trên hồ sơ thực thi

- **Đạt:** thu ngân có ca CASHIER OPEN tạo, tìm lại và thao tác đơn bàn/mang đi qua API/UI thật; server giữ giá/snapshot, một đơn OPEN mỗi bàn, cô lập store/branch, chuyển bàn/hủy đơn và chặn đóng ca còn đơn OPEN. QA sprint kiểm race, quyền, DB trước/sau, browser reload/lỗi/tải/đổi phiên; backend `npm test` 68/68, UI `npm test` 39/39, UI build exit 0. Chi tiết từng vế ở báo cáo QA, không dùng số test riêng lẻ làm nghiệm thu.
- **Lỗi và xử lý:** ba vòng code review phát hiện năm finding trong phạm vi: branch inactive làm kẹt hủy, thiếu khóa branch/table khi tạo/chuyển, UUID topping viết hoa, FK topping đã bán khi xóa, và UI mất phản hồi sau mutation. Cả năm có [hồ sơ lỗi](../../.devloopflow/errors/INDEX.md), test/log và cách sửa; vòng review cuối không còn finding, QA task và QA sprint kiểm lại luồng liên quan. Không có lỗi sản phẩm còn mở trong phạm vi S6-01..09.
- **Bài học quy trình:** thiếu mã sprint cho hành vi chặn đóng ca đã được Product Owner chốt thành S6-09 trước QA; phải giữ liên kết AC task ↔ S6 khi phạm vi đổi. Các lỗi harness/DB sandbox dừng giữa chừng được lưu cả lượt thất bại và lượt chạy lại; chỉ lượt có artifact/exit hợp lệ được dùng kết luận. Giữ ma trận tiêu chí → tình huống → artifact trước khi chạy và đọc lại file gốc trước khi tick.
- **Theo dõi sau Sprint:** PB-08 nguyên liệu/kho và PB-08a khuyến mãi vẫn là dependency trước PB-09 thanh toán; PB-10 đối soát chi tiết phụ thuộc PB-09. Thanh toán, giảm giá, trừ kho và các màn POS ngoài lát cắt bán hàng này chưa được nghiệm thu trong Sprint 6. Việc chọn Sprint 7 là quyết định planning mới từ Product Backlog, chưa tự chốt ở đây. CI trên commit, merge và production là bước tích hợp riêng.

Không ghi nhận phát biểu hoặc phản hồi chi tiết nào khác của Product Owner tại Sprint Review; retrospective trên là tổng hợp từ plan, task, error và QA đã lưu, không giả định có cuộc họp hay số liệu ngoài hồ sơ.
