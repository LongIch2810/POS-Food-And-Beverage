# Sprint 08 — Thanh toán và UI thanh toán

> Phạm vi thay đổi đã duyệt ngày 09/11/2026: S8-03 và S8-07 bao gồm QR/SePay tự xác nhận, mã riêng mỗi lượt, ghi số thực nhận và phần dư, thông báo quản lý khi tiền đến muộn hoặc mã hết hiệu lực; MANAGER/OWNER được xác nhận thủ công khi SePay chậm. QR không tự hết hạn, đơn khóa khi chờ. Các câu loại webhook và xác nhận tay duy nhất bên dưới là lịch sử. Nguồn: [spec](../../.devloopflow/specs/invoices.md) và plan đã duyệt `.devloopflow/approved/20261109-sprint08-payment.md`. Đã triển khai; xem mục "Kết quả QA cấp sprint" bên dưới.


**Trạng thái:** **Đã đóng Sprint 08 ngày 12/11/2026 theo yêu cầu user; nghiệm thu trong phạm vi QA local ngày 11/11/2026.** Đã ghi Sprint Review và Retrospective ngày 11/11/2026. Kế hoạch chốt ngày 09/11/2026: Sprint Goal, Sprint Backlog và S8-01..07. Lịch 09–15/11/2026. Nguồn: [Product Backlog](../../docs/PRODUCT_BACKLOG.md) PB-09/PB-13 và mục theo dõi sau Sprint 7; [Product Overview](../../docs/PRODUCT_OVERVIEW.md) mục 5; [Business Rules](../../docs/BUSINESS_RULES.md) mục 9–12, 17; [API convention](../../docs/api-spec.md) mục 7, 9.

## Cơ sở và quyết định phạm vi

- [Sprint 07](../sprint-07/SPRINT.md) đã nghiệm thu local PB-08, PB-08a và UI Kho/Khuyến mãi; cấu hình kho/mã đã có nhưng chưa thanh toán, gắn mã lên hóa đơn, tăng lượt dùng hay ghi `SALE`. PB-07 từ Sprint 06 cung cấp đơn `OPEN` và ca thu ngân.
- Người dùng chốt Sprint 08 gồm **PB-09 thanh toán** và **lát cắt PB-13 UI thanh toán dùng API thật**, lịch **09–15/11/2026** sau khi sửa ngày bắt đầu thành 09/11 và xác nhận kết thúc 15/11. Đây là quyết định planning; không suy ra code hoặc QA đã hoàn tất.
- `specs/invoices.md` được `docs/api-spec.md` nhắc đến nhưng chưa tồn tại lúc lập sprint. Quy tắc BR và API chung là nguồn cho tiêu chí cấp sprint; quyền/route/payload/lỗi, cách áp mã và xử lý cạnh tranh cần refinement thành spec đã chốt và plan được duyệt trước code. Đối chiếu mã thực tế của PB-07/PB-08/PB-08a trên nhánh triển khai trước khi lập task.

## Sprint Goal

Thu ngân có ca hợp lệ hoàn tất đơn `OPEN` một lần bằng tiền mặt, chuyển khoản hoặc hành động riêng cho đơn 0đ; server tính tiền và mã giảm giá, đổi đơn sang `PAID` và trừ tồn kho đúng chi nhánh trong một transaction. Gửi lại cùng `Idempotency-Key` không thu/trừ kho lần nữa. UI thanh toán dùng API thật, thể hiện kết quả và lỗi bằng tiếng Việt trên tablet ngang.

## Sprint Backlog và thứ tự thực hiện

| Thứ tự | Item | Kết quả cần đạt | Điều kiện bắt đầu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Refinement PB-09 + PB-13 | Chốt spec thanh toán: quyền và ca, gắn/đánh giá tối đa một mã, tính tổng/tiền lẻ, phương thức, idempotency/replay, đơn 0đ, khóa và cạnh tranh dữ liệu, công thức trừ kho, lỗi và hợp đồng UI. Lập AC task ↔ S8 và ma trận bằng chứng trước QA. | Đối chiếu BR, DB, API convention và code PB-07/PB-08/PB-08a; giải quyết điểm mở ở cuối hồ sơ. | Đã chốt spec và plan |
| 2 | PB-09 — DB/API thanh toán | Migration/entity/API theo spec; server tính giá, giảm giá và tổng; tạo tối đa một payment hoặc hoàn tất đơn 0đ; lưu khóa idempotency; chuyển `PAID`, tăng lượt mã và ghi `SALE`/cập nhật tồn nguyên tử đúng branch trong cùng transaction. | Spec và plan đã chốt; PostgreSQL sandbox; dependency Sprint 07 có trong baseline code. | Đã triển khai, QA local |
| 3 | PB-13 — UI thanh toán | Nối UI đơn `OPEN` với API gắn/kiểm mã và thanh toán; hiển thị tổng server trả, tiền khách đưa/thối hoặc xác nhận chuyển khoản, hành động 0đ, tải/lỗi/replay và kết quả sau reload. Giữ cùng key khi retry do lỗi mạng. | API chạy đúng spec; kiểm trên UI cuối và đúng phiên. | Đã triển khai, QA local |
| 4 | Review, QA task và QA cấp sprint | Review code; kiểm từng AC task và S8 bằng test/API/DB/browser, gồm rollback, retry đồng thời, quyền/store/branch, tồn và lượt mã trước/sau; lưu artifact gốc theo `AGENTS.md`, rồi Sprint Review riêng. | Các item đã triển khai; ma trận tiêu chí → tình huống → artifact có trước lượt chạy. | Đã review và QA local; đã ghi Sprint Review |

## Tiêu chí nghiệm thu cấp Sprint 08

Ô ☑ nghĩa là đã kiểm **từng vế** trên mã/UI cuối và mở lại artifact (xem "Kết quả QA cấp sprint 11/11/2026"); ☐ là chưa. QA task không tự động thay thế QA cấp sprint.

| Mã | Tiêu chí | Nguồn | Bằng chứng cần thu | Nghiệm thu |
| --- | --- | --- | --- | --- |
| S8-01 | Chỉ người có quyền và ca `CASHIER` của chính mình đang `OPEN` thanh toán được hóa đơn `OPEN` có ít nhất một món, cùng store/branch; `PLATFORM_ADMIN` và người khác branch/store bị chặn. Đơn `PAID`/`CANCELLED` không sửa nội dung. | PB-09; BR-16, BR-17, BR-21, BR-27, BR-80..81 | API quyền/trạng thái; SELECT hóa đơn, ca, dòng món trước/sau; test PostgreSQL. | ☑ |
| S8-02 | Server tính `subtotal`, tối đa một mã hợp lệ và `discount`/`total_amount` theo công thức BR-25/37; không nhận giá, tổng hoặc giảm tay từ client; tiền không âm và không vượt trần BR-103. Mã khác store, hết hạn, hết lượt hoặc không đủ điều kiện bị từ chối; lượt dùng tăng đúng một khi `PAID`. | PB-09; BR-24..25, BR-36..41, BR-103 | Test biên tiền/mã, API invalid input, DB hóa đơn–mã–used_count trước/sau và thử cạnh tranh usage limit. | ☑ |
| S8-03 | Đơn có tiền chỉ tạo một `payment` đúng `total_amount`: `CASH` nhận tiền khách đưa đủ và tính tiền thối, đối soát dùng số phải thu; `TRANSFER` do thu ngân xác nhận, mã giao dịch là tùy chọn. Không có thanh toán thiếu, vượt hoặc chia nhiều lần. | PB-09; BR-30..33, BR-56 | API hai phương thức và input sai; DB payment/hóa đơn; test unique payment và số tiền két. | ☑ |
| S8-04 | `Idempotency-Key` bắt buộc; cùng key và nội dung trả kết quả cũ, không thêm payment, tăng lượt mã hoặc trừ kho lần hai; cùng key khác nội dung, hóa đơn hoặc store bị từ chối. Retry đồng thời chỉ có một kết quả ghi dữ liệu. | PB-09; BR-34; api-spec mục 7 | API response/status/header replay, test đồng thời; DB payment, used_count, stock/movement trước/sau từng lần. | ☑ |
| S8-05 | Đơn có ít nhất một món và tổng 0đ dùng hành động `complete-zero` với key riêng, thành `PAID` mà không tạo payment; replay cùng key không đổi dữ liệu, key dùng cho đơn khác bị từ chối. | PB-09; BR-104; api-spec mục 7 | API 204/replay/conflict; DB invoice, payment, stock/movement và key trước/sau. | ☑ |
| S8-06 | Thanh toán/hoàn tất 0đ, đổi hóa đơn sang `PAID`, tăng lượt mã nếu dùng và trừ kho theo công thức nằm trong một transaction; mỗi nguyên liệu có một `SALE` ở branch hóa đơn, tồn bằng tổng movement. Bán kho âm được nhưng có cảnh báo; món thiếu công thức vẫn bán được và được cảnh báo. Lỗi giữa chừng rollback toàn bộ. | PB-09; BR-35, BR-42..46, BR-49, BR-72, BR-104 | Test rollback/concurrency; DB trước/sau invoice, payment, mã, stock/movement theo hai branch; API cảnh báo. | ☑ |
| S8-07 | UI thanh toán dùng API thật trên tablet ngang, hiển thị VND/tiếng Việt, tổng từ server, mã và tiền thối/kết quả đúng; lỗi mạng giữ key và nội dung để retry, reload không thanh toán lặp hoặc lộ dữ liệu phiên cũ. | PB-13; Product Overview mục 5; api-spec mục 7 | Browser trên UI cuối: ảnh/snapshot trước/sau, network method/path/status/header đã che, DB trước/sau mutation, reload/đổi phiên/lỗi mạng. | ☑ |

## Kết quả QA cấp sprint (11/11/2026)

- **Nhãn: local do agent chạy, không có CI/runner độc lập.** HEAD `48ed476`, working tree dirty (thay đổi Sprint 08 chưa commit). Artifact gốc (log, PNG, JSON, script) chỉ có trên máy chạy QA, không đối chiếu được từ remote; chỉ Markdown tóm tắt được commit.
- Nguồn tick: `.devloopflow/verify/20261109-sprint08-payment/report-17.md` (29 AC plan, từng vế, kèm report 11–16 và `fails.md`) và `.devloopflow/verify/20261111-194533-48ed476-s8-verify-ac-r17/evidence/run.md`. Ma trận S8 ↔ AC: `coverage-audit-20261111.md`.
- Kiểm lại ngày 11/11/2026 trước khi tick (agent chính, local): POS_UI `npm test` 85/85, `npm run typecheck` exit 0, `npm run build` exit 0; POS_API `npm test` 155/155 (PostgreSQL sandbox `pos_s8_r12_pg`).
- Ánh xạ: S8-01 ← ST-1/2/7, E2E-1/6, RF-3, AC-M1; S8-02 ← ST-1/2/5, E2E-1/7, RF-4; S8-03 ← ST-4/6/7, E2E-2/4/6, R2-1; S8-04 ← ST-4/5/6, E2E-2/5, RF-1/5; S8-05 ← ST-3, E2E-3; S8-06 ← ST-2/3/4/6/7, E2E-3/4, R2-1.AC-3; S8-07 ← ST-5/8, E2E-5/7/8, RF-5.
- **Giới hạn, user đã chấp nhận ngày 10–11/11/2026 (V1-4, V11-1), không biến thành xác nhận độc lập:** SePay chỉ kiểm ở Test mode (dashboard dạng văn bản, chưa replay cùng event id từ provider, promo hết hạn dựng bằng SQL); **chưa kiểm SePay Live**. S8-03 (tự xác nhận chuyển khoản) và S8-07 (QR/fallback) được tick trong giới hạn này.
- Điểm (g) của ST-8.AC-3 (đơn đã đóng mở từ màn Hóa đơn chỉ để xem) chỉ có chứng cứ component test vì màn Hóa đơn vẫn dùng dữ liệu mô phỏng (ngoài phạm vi Sprint 08).
- Ghi chú phạm vi: S8-01 mở rộng cho MANAGER hủy đơn `OPEN` (AC-M1, user quyết 11/11/2026); S8-03 theo phạm vi QR/SePay đã duyệt ở đầu tài liệu (câu "TRANSFER do thu ngân xác nhận" là lịch sử).
- **Cập nhật 12/11/2026:** sync-docs và reflect đã ghi; [task](../../.devloopflow/tasks/completed/20261109-sprint08-payment.md) và [plan](../../.devloopflow/plans/completed/20261109-sprint08-payment.md) đã completed. User đã yêu cầu đóng sprint; commit/push/PR và CI vẫn là bước riêng chưa thực hiện.

## Ranh giới và dependency

- PB-10 (chi từ két, đóng ca/đếm mù), PB-11 (hủy `PAID`, hoàn kho/lượt mã), PB-12 (báo cáo), PB-14 (production/backup) và các lát cắt PB-13 khác để sprint sau theo dependency. Sprint 08 không kết luận những phần này đã hoàn tất.
- `IMPORT`/`WASTE`/`ADJUST` và danh sách sắp hết thuộc Giai đoạn 2 theo BR-46/50. Không tự thêm nghiệp vụ nhập tồn ban đầu. Kho có thể âm khi bán; cách cảnh báo cần chốt ở spec/UI trước triển khai.
- Thanh toán nhiều đợt, giảm giá thủ công, hoàn tiền một phần và tách/gộp bill không thuộc Sprint 08. Tự xác nhận chuyển khoản qua webhook đã được bổ sung theo quyết định ngày 09/11/2026 ở đầu tài liệu.

## Điểm cần giải quyết trong refinement trước code

1. Hợp đồng gắn/kiểm mã trên đơn `OPEN`, thời điểm tính lại tiền, xử lý khi món/giá/hiệu lực mã đổi trước thanh toán và mapping payload/lỗi. Không tự suy từ UI demo.
2. Quyền thao tác thanh toán và phạm vi OWNER/MANAGER ngoài điều kiện ca của BR-16; thứ tự khóa và xử lý yêu cầu đồng thời giữa sửa đơn, dùng mã, thanh toán và trừ kho.
3. Cách trả cảnh báo kho âm/thiếu công thức cho API/UI mà vẫn cho thanh toán thành công; ma trận artifact cho rollback và replay.
4. Baseline tích hợp: `master` tại lúc planning chưa được xác nhận chứa code Sprint 07; chọn nhánh có PB-07/PB-08/PB-08a và kiểm CI/review trước triển khai.

## Theo dõi planning, QA và Review

- Quyết định planning: người dùng xác nhận PB-09 + PB-13 UI thanh toán; lịch ban đầu 20–26/11/2026 được sửa thành 09–15/11/2026 trong phiên 09/11/2026. Hồ sơ planning: [task lập Sprint 08](../../.devloopflow/tasks/completed/2026-11-09-create-sprint-08.md).
- Người dùng yêu cầu **“chốt sprint”** trong phiên 09/11/2026: chốt Sprint Goal, bốn item Sprint Backlog và S8-01..07 ở trên làm phạm vi/tiêu chí cấp sprint. Quyết định này không thay thế refinement spec và plan trước code; nếu spec phát hiện mâu thuẫn với S8, phải đưa ra quyết định phạm vi mới thay vì sửa ngầm.
- (Lịch sử 09/11/2026) Lúc chốt chưa có spec, plan, code, QA hay Sprint Review; nay đã có spec/plan/code/QA task và QA cấp sprint local, Sprint Review/Retrospective đã ghi ngày 11/11/2026. Khi bắt đầu triển khai, lập plan/task riêng, ghi branch/HEAD/dirty baseline và AC ↔ S8; dùng `create-pos-spec` để chốt spec trước code.
- Chỉ tick S8 sau QA cấp sprint trên sandbox với artifact gốc đủ từng vế; ghi rõ local hay CI và phiên bản đã kiểm. Review/retrospective và quyết định đóng sprint là bước riêng sau QA.

## Sprint Review — 11/11/2026

**Sprint Goal đạt trong phạm vi local đã chốt, kèm giới hạn SePay ghi bên dưới.** Đây là tổng hợp từ hồ sơ thực thi và QA local do agent chạy, theo yêu cầu của người dùng "làm bước Sprint Review và Retrospective" trong phiên 11/11/2026; không ghi nhận một cuộc họp Review hay phản hồi Product Owner nào khác ngoài các quyết định đã trích trong task. Căn cứ: [plan đã duyệt](../../.devloopflow/approved/20261109-sprint08-payment.md), [task](../../.devloopflow/tasks/completed/20261109-sprint08-payment.md), [report-17](../../.devloopflow/verify/20261109-sprint08-payment/report-17.md), [coverage-audit](../../.devloopflow/verify/20261109-sprint08-payment/coverage-audit-20261111.md), [sổ FAIL](../../.devloopflow/verify/20261109-sprint08-payment/fails.md), [backlog lỗi nhẹ](../../.devloopflow/review/backlog.md) và [thư mục lỗi](../../.devloopflow/errors/INDEX.md).

| Phạm vi cam kết | Kết quả và chứng cứ | Quyết định Review |
| --- | --- | --- |
| PB-09: thanh toán CASH, đơn 0đ, mã giảm giá, idempotency, trừ kho cùng transaction | S8-01..06 ☑; 29 AC của plan PASS từng vế ở report-17 (ST-1..7, E2E-1..4, R2-1.AC-1..3, RF-1/4); kiểm quyền/store/branch, replay/đồng thời, rollback, stock = tổng movement, DB trước/sau. | Chấp nhận trong phạm vi local. |
| Mở rộng đã duyệt 09/11: QR VietQR + webhook SePay tự xác nhận, mã riêng mỗi lượt, tiền đến muộn/mã hết hiệu lực thành ngoại lệ, MANAGER/OWNER xác nhận thủ công | ST-5..7, E2E-4..6, RF-1..3 PASS; HMAC, chống lặp event id, tài khoản nhận cố định theo store (6–19 chữ số), ngoại lệ hiển thị cho đúng phạm vi. SePay **Test mode** có 5 giao dịch mô phỏng qua ngrok, ngrok trả 200 và DB khớp (V1-4). | Chấp nhận trong phạm vi Test mode với giới hạn do user chấp nhận (V1-4, V11-1). **SePay Live chưa kiểm.** |
| PB-13: UI thanh toán nối API thật, tablet ngang | S8-07 ☑; ST-8.AC-1..3, E2E-5/7/8, RF-5: preview + cảnh báo kho, CASH/0đ, QR/reload/fallback, retry cùng key sau mất phản hồi, đổi phiên, cài đặt tài khoản 19/20 chữ số; browser 1180×820 có ảnh, network và DB trước/sau. | Chấp nhận lát cắt UI đã cam kết. |
| Phát sinh trong sprint (user quyết) | R2-1: đối soát tiền mặt khi đóng ca / đóng cưỡng chế cộng CASH PAID; AC-M1: MANAGER hủy đơn `OPEN` theo ca của mình và cùng chi nhánh (migration `20261111000000`); ST-8.AC-3: đơn đã thanh toán/hủy là đơn xong trên màn POS. | Chấp nhận; đã vào plan/spec với Changelog. |

- **Chất lượng và phiên bản nghiệm thu:** review code 17 vòng (finding High/Medium đã sửa bằng TDD; vòng 17 PASS), verify-ac 17 lượt (lượt 17 chạy lại toàn bộ 29 AC). Kiểm lại ngày 11/11/2026: POS_UI `npm test` 85/85, typecheck và build exit 0; POS_API `npm test` 155/155 trên PostgreSQL sandbox. Nhánh `feat/sprint-08-payment`, HEAD `48ed476`, **working tree dirty** (thay đổi Sprint 08 chưa commit), nên HEAD một mình không định danh snapshot; dấu vết phiên bản ở `.devloopflow/verify/20261111-194533-48ed476-s8-verify-ac-r17/` (hash source trước/sau). Bằng chứng gốc chỉ có local; **chưa có CI độc lập, chưa SePay Live, chưa production**.
- **Lỗi và phần chưa đạt:** lỗi đáng kể đã sửa và ghi hồ sơ (45 file trong `.devloopflow/errors/`), trong đó nặng nhất là R2-1 (High: đối soát két tính doanh thu CASH bằng 0). Backlog lỗi nhẹ B-1..B-40 đã xử lý hết (B-23 sửa một phần: thiếu ca `pos.sell`). Không còn FAIL sản phẩm mở trong sổ FAIL. Giới hạn đã nêu: dashboard SePay chỉ có bằng chứng dạng văn bản và chưa replay cùng event id từ provider; mã hết hạn dựng bằng SQL; điểm (g) của ST-8.AC-3 chỉ có test thành phần vì màn Hóa đơn còn dùng dữ liệu mô phỏng; `canModify` thiếu test bảo vệ điều kiện `status==='OPEN'` (lớp phòng thủ).
- **Ngoài phạm vi, không nghiệm thu:** hủy đơn `PAID` và hoàn kho (PB-11), chi từ két, báo cáo (PB-12), thanh toán nhiều đợt, hoàn tiền, CI/production.

## Retrospective — tổng hợp từ hồ sơ thực thi

- **Điều làm tốt:** viết test đỏ trước rồi mới sửa giúp bắt đúng nguyên nhân và có đột biến chứng minh test hữu ích; reviewer context sạch phát hiện R2-1 (High), phạm vi chi nhánh `branch.access_all` và focus bẫy trong dialog trước QA cuối; mọi finding Low/Very Low được ghi backlog và xử lý hết (40/40), mỗi lỗi đã sửa có hồ sơ `errors/`; quyết định phạm vi của user (QR/SePay, MANAGER hủy đơn, đơn xong) được ghi vào plan/spec cùng ngày; QA tách rõ chứng cứ lịch sử với UI/mã cuối và giữ giới hạn "local do agent chạy" thay vì tuyên bố độc lập. Căn cứ: `task`, `.devloopflow/errors/INDEX.md`, `backlog.md`, report-11..17.
- **Trở ngại đã gặp:** phạm vi đổi giữa sprint (09/11 thêm QR/SePay, sau đó thêm ngân hàng 19 chữ số, R2-1, đơn xong, MANAGER hủy đơn) làm plan/spec/task phải đồng bộ nhiều lần và để lại câu cũ lỗi thời (ví dụ README, THIRD_PARTY, `SPRINT.md`); nhiều vòng verify-ac phải chạy lại chỉ vì thiếu chứng cứ từng vế (ví dụ vòng 14 FAIL do thiếu bằng chứng, sửa ở vòng 15) chứ không vì lỗi sản phẩm; V1-4 cần kiểm trên SePay Test mode thật nên phụ thuộc dashboard và ngrok của người dùng, cuối cùng chỉ đạt mức do user chấp nhận; test chập chờn hoặc phụ thuộc thứ tự (timestamp +301 giây, event id trùng, `b16_nobranch`) tốn công tìm nguyên nhân; nhiều phiên/công cụ cùng ghi hồ sơ nên có lúc báo cáo ghi chồng hoặc đến muộn; môi trường không có agent type `code-reviewer`/`ac-verifier`/`tdd` đã đăng ký nên phải dùng agent tổng quát đóng vai.
- **Cải tiến cho sprint sau:** (1) lập ma trận AC ↔ artifact cần lưu trước khi chạy QA để không phải chạy lại vì thiếu vế; (2) ghi quyết định phạm vi vào plan, spec và task cùng lượt với code và dọn các câu "chưa triển khai/chưa QA" ngay khi trạng thái đổi; (3) mỗi thay đổi quyền theo vai trò đi kèm test hành vi qua HTTP với vai trò thật; (4) test dùng id/dữ liệu riêng từng test, không phụ thuộc thứ tự chạy; (5) chốt sớm phương án kiểm provider (Test mode hay mô phỏng) và ai cung cấp tài khoản; (6) tạo commit snapshot để CI chạy trên đúng mã đã QA trước khi gọi bằng chứng là độc lập; (7) giao một phiên chịu trách nhiệm ghi `report-N`/`fails.md` để tránh ghi chồng. Đây là hành động đề xuất từ khó khăn đã gặp, không phải bằng chứng Sprint 08 đã có CI.

## Quyết định đóng Sprint 08 — 12/11/2026

Theo yêu cầu user “rồi đóng Sprint08”, đóng Sprint 08 ngày 12/11/2026, trước ngày kết thúc kế hoạch 15/11/2026. Phạm vi PB-09 và lát cắt PB-13 thanh toán được nghiệm thu theo bảy tiêu chí S8-01..07 đã tick và 29 AC plan trong report-17, với các giới hạn V1-4/V11-1 đã được user chấp nhận. Task và plan đã chuyển completed; Sprint Review và Retrospective đã ghi ngày 11/11/2026.

QA là local do agent chạy trên working tree dirty, không phải CI độc lập; artifact gốc chỉ có local. SePay đã kiểm Test mode trong giới hạn nêu ở trên, chưa kiểm Live. Bốn ô Red/Refactor ST-6/ST-8 trong plan không xác minh được toàn bộ lịch sử TDD và vẫn để trống; không suy ra lỗi sản phẩm hay bằng chứng TDD đầy đủ. Chưa commit/push/PR/merge, chưa xác nhận production. Các phần ngoài phạm vi tiếp tục theo Product Backlog.
