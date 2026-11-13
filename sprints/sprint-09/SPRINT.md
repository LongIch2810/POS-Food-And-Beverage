# Sprint 09 — Chi từ két, hủy đơn đã thanh toán và màn Hóa đơn

**Trạng thái:** Đã đóng Sprint 09 ngày 14/11/2026 theo yêu cầu user, trong phạm vi QA local đạt 6/6 AC; chưa kiểm CI cho mã Sprint 09. Lập ngày 12/11/2026; lịch dự kiến 12–18/11/2026. Nguồn: [Product Backlog](../../docs/PRODUCT_BACKLOG.md) PB-10/PB-11/PB-13 và mục theo dõi sau Sprint 7; [Product Overview](../../docs/PRODUCT_OVERVIEW.md) mục 5, 6.2, 6.3; [Business Rules](../../docs/BUSINESS_RULES.md) mục 9, 11, 12, 17; [API convention](../../docs/api-spec.md).

## Cơ sở và quyết định phạm vi

- [Sprint 08](../sprint-08/SPRINT.md) đã đóng ngày 12/11/2026 với QA local S8-01..07 cho PB-09 thanh toán và UI thanh toán; đã có `PAID`, `payments`, ghi `SALE`, tăng lượt mã, đóng ca đếm mù cộng CASH `PAID` (R2-1) và MANAGER hủy đơn `OPEN` (AC-M1). Chưa có chi từ két, hủy đơn `PAID`, `SALE_REVERSAL` hay trả lượt mã.
- Người dùng chọn Sprint 09 gồm **PB-10 chi từ két và hoàn thiện đối soát**, **PB-11 hủy đơn `PAID`** và **lát cắt PB-13 UI Ca (chi phí) và màn Hóa đơn dùng API thật**, bắt đầu **12/11/2026**, và đặt việc tích hợp Git/CI mã Sprint 08 làm item đầu. PB-12 báo cáo phụ thuộc PB-11 nên thuộc sprint sau. Đây là quyết định planning; không suy ra code hoặc QA đã hoàn tất.
- Baseline lúc lập sprint: `master` tại `c710cf4`, working tree sạch. Mã Sprint 08 đã merge vào `master` qua PR #18; [CI trên `master`](https://github.com/LongIch2810/POS-Food-And-Beverage/actions/runs/43217314020) thành công ngày 12/11/2026. Câu "chưa commit/push/PR và CI" trong Sprint 08 đã lỗi thời; SePay Live và production vẫn chưa kiểm.
- `specs/shifts.md` và `specs/invoices.md` đã có nhưng chưa đặc tả chi từ két hay hủy đơn `PAID`. Đọc mã ngày 12/11/2026: `expense_amount` gán cứng `0` khi đóng ca và đóng cưỡng chế trong `POS_API/src/shifts/shifts.service.ts`; `POST /api/v1/invoices/:id/cancel` chỉ hủy đơn `OPEN`; `GET /api/v1/invoices` đã có nhưng màn Hóa đơn và `AddExpenseModal` của UI vẫn chạy trên `src/mock/`. Quyền/route/payload/lỗi và cạnh tranh dữ liệu phải chốt trong spec trước code.

## Sprint Goal

Thu ngân ghi chi từ két trong ca đang mở và đóng ca bằng đếm mù với tiền kỳ vọng đã trừ chi từ két. Quản lý hủy được đơn `PAID` của ca còn mở theo quyền và lý do: giữ nguyên lịch sử thanh toán, hoàn kho bằng dòng mới, trả lượt mã và giảm tiền kỳ vọng nếu là tiền mặt, trong một transaction. Màn Hóa đơn và phần chi phí của màn Ca dùng API thật, tiếng Việt, VND, tablet ngang.

## Sprint Backlog và thứ tự thực hiện

Trạng thái trong bảng là ảnh chụp lúc lập kế hoạch ngày 12/11, không phản ánh tiến độ hiện tại; kết quả QA cấp sprint được ghi tại mục nghiệm thu bên dưới.

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Tích hợp Git/CI mã Sprint 08 | Xác nhận mã Sprint 08 nằm trên `master` và CI xanh trên commit đó; ghi HEAD/run CI làm baseline; sửa câu trạng thái lỗi thời ở Sprint 08, README và Product Backlog khi đồng bộ tài liệu. | Không | Đã đo baseline lúc lập sprint; chưa sửa tài liệu lỗi thời |
| 2 | Refinement PB-10 + PB-11 + PB-13 | Cập nhật `specs/shifts.md` và `specs/invoices.md`: bảng/API chi từ két, quyền, sửa/xóa khoản chi, công thức đối soát; hủy `PAID`: permission, route, thứ tự khóa và transaction, hoàn kho, trả lượt mã, tương tác với chuyển khoản QR/SePay; hợp đồng UI Hóa đơn. Lập AC task ↔ S9 và ma trận bằng chứng trước QA. | Đối chiếu BR, DB, API convention và code Sprint 08; giải quyết điểm mở ở cuối hồ sơ. | Chưa bắt đầu |
| 3 | PB-10 — DB/API chi từ két | Migration/entity/API `shift_expenses`; chỉ ghi khi ca `OPEN`; đóng ca và đóng cưỡng chế dùng tổng chi từ két thay vì `0`; snapshot không đổi sau đóng. | Spec và plan đã chốt; PostgreSQL sandbox. | Chưa bắt đầu |
| 4 | PB-11 — Hủy đơn `PAID` | API hủy đơn `PAID` theo BR-29: quyền quản lý, lý do bắt buộc, chỉ khi ca của đơn còn mở; giữ `payments`; ghi `SALE_REVERSAL`; trả lượt mã; tất cả trong một transaction, an toàn khi gọi đồng thời. | Spec và plan đã chốt. | Chưa bắt đầu |
| 5 | PB-13 — UI Ca (chi phí) và màn Hóa đơn | Bỏ mock cho chi từ két và màn Hóa đơn: danh sách/chi tiết hóa đơn theo phạm vi quyền, hủy đơn `PAID` có lý do và xác nhận, ghi/xem chi phí trong ca, kết quả đóng ca phản ánh chi phí. | API item 3–4 chạy đúng spec; kiểm trên UI cuối và đúng phiên. | Chưa bắt đầu |
| 6 | Review, QA task và QA cấp sprint | Review code; kiểm từng AC task và S9 bằng test/API/DB/browser, gồm rollback, đồng thời, quyền/store/branch, tồn/lượt mã/tiền kỳ vọng trước/sau; tạo commit để CI chạy đúng mã đã QA; lưu artifact gốc theo `AGENTS.md`, rồi Sprint Review riêng. | Các item đã triển khai; ma trận tiêu chí → tình huống → artifact có trước lượt chạy. | Chưa bắt đầu |

## Tiêu chí nghiệm thu cấp Sprint 09

Ô ☑ nghĩa là đã kiểm **từng vế** trên mã/UI cuối và mở lại artifact; ☐ là chưa. QA task không tự động thay thế QA cấp sprint. [Báo cáo QA cấp sprint vòng 1](../../.devloopflow/verify/sprint-09-ac/report-1.md) ghi kết quả local trên nhánh `feat/sprint-09-ui-invoices`, HEAD `b810c41` cùng working tree chưa commit; không có hash mã đầu lượt để đối chiếu với hash cuối.

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu | Nghiệm thu |
| --- | --- | --- | --- | --- |
| S9-01 | Người có quyền ghi khoản chi cho ca `CASHIER` đang `OPEN` cùng store/branch; `amount > 0`, trong trần tiền, `reason` bắt buộc; ca đã đóng, khác branch/store và `PLATFORM_ADMIN` bị chặn. | PB-10; BR-51..53, BR-80..81 | API quyền/validation; SELECT `shift_expenses` và ca trước/sau; test PostgreSQL. | ☑ |
| S9-02 | Đóng ca và đóng cưỡng chế tính `expected_cash = opening_cash + cash_sales_amount − expense_amount`, trong đó `expense_amount` chỉ gồm khoản `paid_from_drawer = true`; vẫn đếm mù; lệch bắt buộc ghi chú; snapshot không đổi sau đóng. | PB-10; BR-53..61; BR mục 17 | Test công thức có/không chi từ két; API đóng ca không trả tiền kỳ vọng trước khi nhập; DB reconciliation trước/sau. | ☑ |
| S9-03 | Chỉ người có quyền quản lý hủy được đơn `PAID` khi ca của đơn còn `OPEN`, cùng phạm vi store/branch, có lý do; đơn của ca đã đóng, đơn `CANCELLED`, người không đủ quyền và `PLATFORM_ADMIN` bị từ chối. | PB-11; BR-21, BR-29, BR-80..81 | API quyền/trạng thái theo vai trò thật qua HTTP; DB hóa đơn, ca trước/sau. | ☑ |
| S9-04 | Hủy đơn `PAID` trong một transaction: hóa đơn thành `CANCELLED`, `payments` giữ nguyên, mỗi nguyên liệu đã trừ có một `SALE_REVERSAL` ở branch hóa đơn, tồn bằng tổng movement, lượt mã giảm đúng một. Lỗi giữa chừng rollback toàn bộ; hai yêu cầu hủy đồng thời chỉ một lần ghi dữ liệu. | PB-11; BR-29, BR-39, BR-47 | Test rollback/đồng thời; DB invoice, payment, stock/movement, `used_count` trước/sau. | ☑ |
| S9-05 | Đơn `CASH` đã hủy không còn tính vào `cash_sales_amount` của ca nên tiền kỳ vọng giảm tương ứng; đơn chuyển khoản đã hủy không ảnh hưởng két và việc hoàn tiền ghi trong `cancel_reason`. | PB-10, PB-11; BR-29, BR-54, BR-56 | Test đóng ca sau khi hủy CASH/TRANSFER; DB reconciliation. | ☑ |
| S9-06 | UI dùng API thật trên tablet ngang, tiếng Việt, VND: ghi/xem chi phí trong ca; kết quả đóng ca phản ánh chi phí; màn Hóa đơn hiển thị danh sách/chi tiết theo phạm vi quyền và cho hủy đơn `PAID` khi được phép, có lý do và xác nhận; lỗi hiện tiếng Việt; reload hoặc đổi phiên không lộ dữ liệu phiên cũ. | PB-13; Product Overview mục 5 | Browser trên UI cuối: ảnh/snapshot trước/sau, network method/path/status đã che, DB trước/sau mutation, reload/đổi phiên. | ☑ |


## Đối chiếu AC sprint với bằng chứng task — 2026-11-13

Đây là **ma trận thu hoạch chứng cứ**, chưa phải lượt QA cấp sprint và không tự tick các ô S9. Báo cáo Task A dùng mã tại HEAD `abc6bee5` cùng working tree task A chưa commit; Task B kiểm trên working tree local, không phải CI. Nhánh đang đối chiếu `feat/sprint-09-ui-invoices`, HEAD `b810c41`, còn thay đổi chưa commit; sau nghiệm thu Task B có sửa B-51 nên cần kiểm đúng mã cuối. Không suy kết quả QA cấp sprint từ PASS task.

| AC sprint | Bằng chứng task đã thu | Phần cần xác nhận trong QA sprint |
| --- | --- | --- |
| S9-01 | Task A [report-3, E2E-AC-1 và ST-2](../../.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/report-3.md): ghi/đọc chi qua HTTP, PLATFORM_ADMIN 403, ca đóng 409; validation và scope qua test PostgreSQL. Raw local: `evidence/v3/e2e-http.log`, `npm-test.log`. | Đối chiếu đủ permission, amount/reason, store/branch và DB trước/sau trên phiên bản sprint cuối. |
| S9-02 | Task A report-3 E2E-AC-2: đếm mù, đóng thường/cưỡng chế và chi từ két; Task B [report-1, ST-8.AC-1/2](../../.devloopflow/verify/20261113-sprint09-ui/report-1.md): browser/DB đầu ca 100.000, CASH 95.000, chi két 20.000, ngoài két 5.000, kỳ vọng 175.000; [report-2](../../.devloopflow/verify/20261113-sprint09-ui/report-2.md) kiểm lại ba lỗi UI. | Kiểm đủ từng vế, gồm lệch bắt buộc ghi chú và snapshot không đổi sau đóng, trên phiên bản sprint cuối. |
| S9-03 | Task A report-3 E2E-AC-3: MANAGER thành công, CASHIER/PLATFORM_ADMIN bị từ chối, ngoài branch/store, thiếu lý do, ca đóng và hủy lại bị chặn; HTTP/DB. Task B report-1 E2E-AC-2/3 bổ sung phạm vi và thao tác UI. | Đối chiếu quyền, trạng thái và DB trước/sau trên phiên bản sprint cuối. |
| S9-04 | Task A report-3 E2E-AC-4: payment giữ nguyên, hai reversal, tồn trở lại, lượt mã về 0; lỗi giữa chừng không đổi DB và hai request cho 200/409. Raw local: `evidence/v3/e2e-http.log`. | Kiểm transaction, rollback, đồng thời và mọi vế DB trên phiên bản sprint cuối. |
| S9-05 | Task A report-3 E2E-AC-5: CASH đã hủy không tính doanh thu tiền mặt; TRANSFER đã hủy không làm thay đổi phần CASH còn lại. Task B report-1 E2E-AC-3 ghi xác nhận hủy CASH/TRANSFER trên UI. | Đối chiếu reconciliation và `cancel_reason` của hai phương thức trên phiên bản sprint cuối. |
| S9-06 | Task B report-1 E2E-AC-1..4: danh sách/lọc/phạm vi, hủy PAID, ghi/xem chi phí; E2E-AC-5/6 đúng về tiền và race nhưng có V1-1..3. Report-2 xác nhận V1-1..3 PASS bằng browser 1024×768/768×1024; các vế còn lại giữ chứng cứ lượt 1. | QA sprint trên UI cuối: ảnh, network đã che, DB trước/sau, reload/đổi phiên; kiểm phần B-51 thay đổi sau lượt QA task. |

Raw evidence nằm trong `.devloopflow/verify/<id>/evidence/` và chỉ có local; report Markdown là chỉ dẫn, không tự thay thế artifact gốc. Ma trận này ghi nhu cầu trước lượt QA; kết quả sau QA nằm trong báo cáo cấp sprint ở trên. Chưa kiểm CI cho mã Sprint 09.

## Ranh giới và dependency

- PB-12 (báo cáo doanh thu) và lát cắt UI Báo cáo để sprint sau theo dependency PB-11. PB-14 (VPS, backup, khôi phục) chưa vào sprint. Sprint 09 không kết luận những phần này đã hoàn tất.
- Hủy đơn của ca đã đóng và hoàn tiền một phần thuộc Giai đoạn 2 (BR-29). `IMPORT`/`WASTE`/`ADJUST` (BR-50) và nhật ký thao tác `audit_logs` (BR-67) thuộc Giai đoạn 2. Hoàn tiền chuyển khoản thực hiện ngoài hệ thống.
- SePay Live vẫn chưa kiểm; sprint này không thay đổi giới hạn đó.

## Điểm cần giải quyết trong refinement trước code

1. Quyền hủy đơn `PAID`: permission nào ứng với "quyền quản lý" trong BR-29; MANAGER có cần ca của mình đang mở như BR-28 không; OWNER không gắn branch có được hủy không.
2. Chi từ két: ai được ghi (chỉ thu ngân của ca hay cả MANAGER/OWNER); có cho sửa/xóa khoản chi khi ca còn mở không; khoản `paid_from_drawer = false` dùng vào việc gì ở MVP.
3. Hủy đơn chuyển khoản QR/SePay: xử lý khi đơn đã `PAID` qua SePay, khi tiền đến muộn sau khi hủy và cách ghi ngoại lệ.
4. Thứ tự khóa và xử lý đồng thời giữa hủy đơn `PAID`, ghi chi phí và đóng ca/đóng cưỡng chế để snapshot đối soát đúng.
5. Màn Hóa đơn: bộ lọc, phân trang và phạm vi hiển thị cho CASHIER/MANAGER/OWNER; `GET /api/v1/invoices` hiện có đủ chưa. Không tự suy từ UI demo.

## Theo dõi planning, QA và Review

- Quyết định planning: ngày 12/11/2026 người dùng chọn PB-10 + PB-11 + lát cắt PB-13 tương ứng, bắt đầu ngay và đặt tích hợp Git/CI Sprint 08 làm item đầu. Hồ sơ planning: [task lập Sprint 09](../../.devloopflow/tasks/completed/2026-11-12-create-sprint-09.md).
- User yêu cầu đóng sprint ngày 14/11/2026; QA cấp sprint, Sprint Review và Retrospective được ghi dưới đây.
- Khi bắt đầu triển khai, lập plan/task riêng, ghi branch/HEAD/dirty baseline và AC ↔ S9; lập ma trận AC ↔ artifact trước QA (cải tiến (1) và (6) của Retrospective Sprint 08).
- Chỉ tick S9 sau QA cấp sprint trên sandbox với artifact gốc đủ từng vế; ghi rõ local hay CI và phiên bản đã kiểm. Review/retrospective và quyết định đóng sprint là bước riêng sau QA.

## Sprint Review — 14/11/2026

Đối chiếu do agent thực hiện từ hồ sơ và chứng cứ hiện có; đây không phải biên bản cuộc họp hoặc xác nhận đã demo cho stakeholder.

| Nội dung | Kết quả và bằng chứng |
| --- | --- |
| Sprint Goal | Đạt theo sáu AC trên sandbox local: ghi/xem chi phí, đối soát đếm mù, hủy `PAID` và giao diện Ca/Hóa đơn dùng API thật. [Báo cáo QA sprint](../../.devloopflow/verify/sprint-09-ac/report-1.md) đối chiếu từng vế với HTTP, DB, test và browser. |
| PB-10 và PB-11 | Đã kiểm quyền/phạm vi, tiền, snapshot, hoàn kho, giữ thanh toán, rollback và đồng thời; S9-01..05 đạt local. Hủy chuyển khoản chỉ ghi nhận lý do hoàn tiền ngoài hệ thống, không xác nhận chuyển tiền ngân hàng thật. |
| Lát cắt PB-13 | S9-06 đạt local trên browser tablet ngang, gồm chi phí, hóa đơn, hủy và đổi phiên. Task B [completed](../../.devloopflow/tasks/completed/20261113-sprint09-ui.md); ba lỗi trợ năng V1-1..3 được sửa và kiểm lại trong [report-2](../../.devloopflow/verify/20261113-sprint09-ui/report-2.md). |
| Chất lượng | API 224/224, UI 143/143, HTTP/DB 48/48; build và migration thành công trên local. [Sổ FAIL sprint](../../.devloopflow/verify/sprint-09-ac/fails.md) không có mục mở. B-51 đã sửa và được kiểm lại trong QA sprint; review riêng ngày 14/11 PASS, có khoảng trống test Low ghi B-52 trong [backlog](../../.devloopflow/review/backlog.md). |
| Tích hợp | Sprint 08 đã merge và có CI trên `master`; mã Sprint 09 vẫn ở working tree chưa commit, chưa có CI cho mã này. Review thay đổi cuối và tích hợp Git/CI còn phải thực hiện theo quy tắc dự án. |
| Ngoài phạm vi | PB-12 báo cáo và PB-14 hạ tầng để sau; hủy đơn của ca đã đóng và hoàn tiền một phần thuộc giai đoạn 2. SePay Live và production chưa kiểm. |

**Giới hạn kết luận:** QA gắn với nhánh `feat/sprint-09-ui-invoices`, HEAD `b810c41` cùng thay đổi chưa commit. Có hash mã cuối lượt, nhưng không có manifest đầu lượt để độc lập chứng minh mã không đổi suốt lượt QA.

## Retrospective — 14/11/2026

Nhận xét từ hồ sơ do agent tổng hợp; các hành động sau là đề xuất cải tiến, không ghi nhận quyết định của nhóm hoặc user khi chưa có xác nhận.

| Quan sát | Bằng chứng | Đề xuất lần sau |
| --- | --- | --- |
| Kiểm nhiều lớp giúp phát hiện lỗi thực tế | Review Task B tìm lỗi gửi lại khoản chi khi kết quả không chắc chắn và Escape đóng drawer khi đang xử lý; QA browser phát hiện ba lỗi kích thước chạm, nhãn và tương phản. [Task B](../../.devloopflow/tasks/completed/20261113-sprint09-ui.md), [sổ FAIL](../../.devloopflow/verify/20261113-sprint09-ui/fails.md). | Giữ kiểm HTTP/DB và browser thật; kiểm kích thước chạm, nhãn, tương phản ngay khi hoàn thành từng form, trước review tổng. |
| Bằng chứng đầu/cuối chưa đủ để xác nhận bất biến mã trong QA sprint | [Report sprint](../../.devloopflow/verify/sprint-09-ac/report-1.md) chỉ có manifest hash cuối, dù đã có ma trận AC và artifact. | Trước khi khởi chạy QA, lưu branch, HEAD, working tree và manifest hash; so lại cuối lượt, ghi rõ mọi thay đổi. |
| Plan bỏ sót ảnh hưởng làm gián đoạn triển khai | Migration làm thay đổi số migration trong foundation test; hợp đồng props UI cần bổ sung plan giữa review. Task A được đúc kết ở [M-29](../../.devloopflow/MEMORY.md), Task B ghi R1-6 trong task. | Khi lập plan, rà caller, test có số lượng cố định và interface thực tế; ghi rõ các thay đổi cần duyệt trước khi triển khai. |
| Trạng thái và cách báo khiến việc theo dõi khó | Sprint backlog còn ảnh chụp “Chưa bắt đầu”; B-51 từng cần làm rõ trạng thái; task ghi các vòng review và nghiệm thu riêng. | Khi hoàn thành mỗi bước, cập nhật trạng thái hiện tại và liên kết hồ sơ; phân biệt backlog nhẹ, FAIL nghiệm thu và việc chờ quyết định, chỉ dừng khi quy trình hoặc thông tin thực sự yêu cầu. |
| Reuse giúp giới hạn phạm vi | Người dùng yêu cầu tái sử dụng; Task B bổ sung API đọc tối thiểu và dùng lại thành phần sẵn có. Xem [spec Task B](../../.devloopflow/specs/20261113-sprint09-ui.md) và [M-37](../../.devloopflow/MEMORY.md). | Khảo sát API/component hiện có trước khi lên plan, ghi phần tái sử dụng và khoảng trống cần bổ sung. |

## Quyết định đóng Sprint 09 — 14/11/2026

Theo yêu cầu user “làm tiếp để đóng sprint”, đóng sprint trong phạm vi S9-01..06 đã nghiệm thu local. Sprint Review và Retrospective đã ghi; task và plan Task B đã completed. Review riêng thay đổi B-51 vòng 1 PASS, với B-52 [Low] là khoảng trống test còn chờ trong backlog, không phải FAIL nghiệm thu.

Tại thời điểm đóng sprint, mã Sprint 09 chưa commit/push/merge và chưa có CI độc lập; việc tích hợp và CI thực hiện theo quy tắc dự án. Raw evidence chỉ ở local; không có hash mã đầu lượt QA để so với hash cuối. SePay Live và production chưa kiểm. Cập nhật Graphify để sau theo yêu cầu user.
