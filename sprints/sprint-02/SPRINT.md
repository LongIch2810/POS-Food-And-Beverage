# Sprint 2 — đã kết thúc; Sprint Goal đạt trong phạm vi local

**Kết thúc ngày 30/10/2026** theo yêu cầu Product Owner, sớm hơn mốc kế hoạch 04/11/2026. Phạm vi đã nghiệm thu là PB-03 và lát cắt quản trị nền tảng của PB-13; kết luận, retrospective và việc chuyển tiếp ở cuối file.

## Cơ sở lập kế hoạch

Sprint được lập kế hoạch trong một tuần, từ **29/10/2026 đến hết 04/11/2026**; nhóm gồm Product Owner và Codex theo [cách vận hành Sprint 1](../sprint-01/SPRINT.md). [Product Backlog](../../docs/PRODUCT_BACKLOG.md) đặt PB-03 sau PB-02 và PB-13 đi cùng các lát cắt API đã hoàn thành. Trong [Review Sprint 1](../sprint-01/SPRINT.md#review-và-retrospective), Product Owner đã chấp nhận PB-01, PB-02 và PB-13 trong phạm vi xác thực; các màn vận hành còn dùng dữ liệu mô phỏng.

Sprint 1 đã được [chốt bằng Review và retrospective từ hồ sơ](../sprint-01/SPRINT.md#kết-luận-sprint-1--2026-10-29). Product Owner đã chốt Sprint Goal và Sprint Backlog bên dưới ngày 29/10/2026. Đây là **cam kết phạm vi**, chưa phải bằng chứng chức năng đã hoàn thành; đặc tả PB-03 phải được chốt trong bước refinement trước khi triển khai phần phụ thuộc.

## Sprint Goal

`PLATFORM_ADMIN` tạo được cửa hàng và tài khoản `OWNER`, tạm khóa/mở lại cửa hàng trên API và giao diện thật, với phạm vi quyền được kiểm tra bằng PostgreSQL. Đây là lát cắt **PB-03 + PB-13 (quản trị nền tảng)**.

## Sprint Backlog đã chốt

| Thứ tự | Item | Kết quả cần đạt | Điều kiện trước khi triển khai |
| --- | --- | --- | --- |
| 1 | Refinement PB-03 | Phỏng vấn, rà quy tắc [BR-79–BR-86](../../docs/BUSINESS_RULES.md), làm rõ request/response, quyền, lỗi và tình huống biên; lập bảng tiêu chí → tình huống → artifact; chốt `specs/platform.md` và phần cấp `OWNER` liên quan. | Product Owner quyết định các điểm còn mở; chỉ lưu spec đã chốt. |
| 2 | PB-03 API/DB | Quản trị viên nền tảng quản lý store và cấp `OWNER` theo spec; khóa/mở store áp dụng đúng quy tắc phiên và cô lập dữ liệu. | PB-02 đã nghiệm thu; spec ở mục 1 đã chốt. |
| 3 | PB-13 lát cắt PB-03 | Màn quản trị nền tảng gọi API thật cho các thao tác PB-03, hiển thị kết quả/lỗi và không dùng mock làm nguồn dữ liệu của lát cắt này. | API PB-03 đã có và được kiểm tra. |
| 4 | Review | Demo luồng trên bản mã cuối, đối chiếu từng tiêu chí với artifact API, DB và browser; Product Owner chấp nhận hoặc trả lại từng item. | Các kiểm tra và bằng chứng theo `AGENTS.md` đã hoàn tất. |

Product Owner chốt sức chứa Sprint 2 là PB-03 và lát cắt UI PB-13 trong bảng trên. PB-04 phụ thuộc PB-03; nếu đổi phạm vi trong sprint, ghi quyết định và lý do tại đây trước khi bổ sung. SePay/VietQR là hướng tích hợp tùy chọn, không thuộc Sprint 2.

## Tiêu chí nghiệm thu

Đây là tiêu chí ở cấp sprint; hợp đồng endpoint và tình huống biên sẽ được chốt trong spec PB-03. Các ô để trống cho đến khi chạy kiểm tra trên mã cuối, QA đối chiếu artifact và Product Owner quyết định nghiệm thu. Khi refinement thay đổi tiêu chí, cập nhật bảng này trước khi triển khai phần bị ảnh hưởng.

### PB-03 — quản trị nền tảng

- [x] `PLATFORM_ADMIN` tạo store và cấp `OWNER` trong đúng store; mật khẩu tạm chỉ trả một lần, không xuất hiện lại trong API/log, tài khoản mới phải đổi mật khẩu trước khi dùng chức năng nghiệp vụ (BR-83, BR-84).
- [x] Người không có permission hoặc context phù hợp bị từ chối thao tác quản trị nền tảng; danh tính platform không có tenant context và bị chặn quyền vận hành theo BR-81. Kiểm tra HTTP từng API hóa đơn/ca/kho/doanh thu thật được theo dõi khi module tương ứng triển khai.
- [x] Tạm khóa store chặn đăng nhập và API của người dùng trong store, thu hồi refresh token, giữ dữ liệu; mở lại yêu cầu đăng nhập mới (BR-82).
- [x] Kiểm tra ranh giới store, các ID tham chiếu, lỗi đầu vào và trường hợp request lặp theo spec đã chốt; log sự kiện quản trị theo BR-86 mà không ghi mật khẩu/token.

### PB-13 — UI cho PB-03

- [x] Màn quản trị nền tảng đọc/ghi qua API PB-03 thật; tạo store/`OWNER`, khóa/mở store và hiển thị trạng thái cuối sau tải lại trang.
- [x] UI chỉ hiển thị mật khẩu tạm ở thời điểm được cấp và không lưu vào browser storage; lỗi/quyền được trình bày bằng tiếng Việt.
- [x] Các màn POS/kho còn mô phỏng được ghi rõ là demo, không được tính là PB-03 hoặc PB-13 đã hoàn thành.

## Kiểm tra và bằng chứng dự kiến

Trước khi chạy QA, lập bảng tiêu chí → tình huống → artifact theo `AGENTS.md`. Cần test API/DB với PostgreSQL cho tạo store, cấp `OWNER`, khóa/mở và cô lập quyền; giữ output runner và trạng thái DB trước/sau. Cần kiểm tra browser trên UI cuối cho mật khẩu tạm, tải lại trang, phiên bị khóa/mở lại; giữ snapshot, request/response đã che dữ liệu nhạy cảm. Chỉ tick tiêu chí sau khi QA mở lại artifact và đối chiếu được; phân biệt CI độc lập, local do agent chạy và chưa xác minh.

## Quyết định planning và câu hỏi refinement

- Đã chốt ngày 29/10/2026: Sprint Goal và sức chứa gồm PB-03 API/DB + lát cắt UI PB-13; thời lượng một tuần từ 29/10 đến hết 04/11/2026.
- Chốt luồng tạo store/cấp `OWNER`, dữ liệu bắt buộc, cách xử lý thất bại và các endpoint trong `specs/platform.md`; phần tài khoản liên quan phải thống nhất với spec auth.
- Chốt hành vi UI khi store bị tạm khóa giữa phiên, khi mở lại và khi mật khẩu tạm chỉ hiển thị một lần.
- Áp dụng cải tiến từ retrospective Sprint 1: lập bảng bằng chứng khi refinement PB-03, kiểm tra trên mã/UI cuối và cho QA đối chiếu trước khi trình nghiệm thu.

## Review và retrospective

Ngày 30/10/2026 Product Owner chốt làm lại theo spec mới: cursor/limit/meta, permission và context platform/store, target store của admin, UI Cửa hàng/Chủ quán với xác nhận lưu mật khẩu. Nhật ký/chi nhánh UI và kiểm tra HTTP trên API vận hành hoãn đến lát cắt tương ứng. Các quyết định ngày29/10 trong bảng dưới là lịch sử; các ô nghiệm thu ở trên hiện phản ánh phiên bản sau fix race cursor được chấp nhận ngày30/10 theo bằng chứng QA cuối.

| Item | Kết quả kiểm tra/demo | Bằng chứng | Quyết định Product Owner |
| --- | --- | --- | --- |
| PB-03 | API/DB và browser đã kiểm tra local; QA đối chiếu artifact | [Bằng chứng QA local](../../.devloopflow/verify/20261029-202132-53d794b/run.md) | Product Owner chấp nhận các tiêu chí đủ bằng chứng ngày 29/10/2026; ô quyền còn chờ API vận hành |
| PB-13 (quản trị nền tảng) | UI cuối đã kiểm tra local; QA đối chiếu artifact | [Bằng chứng QA local](../../.devloopflow/verify/20261029-202132-53d794b/run.md) | Product Owner chấp nhận ba tiêu chí lát cắt quản trị nền tảng ngày 29/10/2026 |
| PB-03 làm lại 30/10 | API PostgreSQL7/7, context/permission/cursor và browser API thật; QA đối chiếu đủ phạm vi mới | [Run API/DB](../../.devloopflow/verify/20261030-0158-53d794b-pb03-rework/run.md), [QA nghiệm thu cuối](../../.devloopflow/verify/20261030-platform-tab-race/qa-acceptance-audit.md) | Product Owner chấp nhận ngày30/10/2026 trong phạm vi local đã chốt |
| PB-13 làm lại 30/10 | UI10/10/build, browser sau fix race, chọn store trang sau, modal mật khẩu và refresh lỗi/retry | [Run sau fix](../../.devloopflow/verify/20261030-platform-tab-race/run.md), [QA nghiệm thu cuối](../../.devloopflow/verify/20261030-platform-tab-race/qa-acceptance-audit.md) | Product Owner chấp nhận ngày30/10/2026, chỉ lát cắt quản trị nền tảng |

Retrospective và kết luận đóng sprint được tổng kết từ hồ sơ ở các mục dưới; không ghi nhận một buổi họp riêng.

QA sau fix race cursor ngày30/10 đã đối chiếu UI/container source hash, browser với API thật, cấp OWNER cho store chọn ở trang sau và refresh lỗi/retry. [Báo cáo QA nghiệm thu cuối](../../.devloopflow/verify/20261030-platform-tab-race/qa-acceptance-audit.md) kết luận đủ chứng cứ local theo phạm vi mới; QA tự chạy UI10/10, phần browser/API/DB do agent chính chạy và QA đối chiếu.

Product Owner yêu cầu nghiệm thu các tiêu chí đủ chứng cứ sau kết luận QA ngày30/10/2026. Đã chấp nhận **4/4 tiêu chí PB-03 và 3/3 tiêu chí PB-13 quản trị nền tảng** trên phiên bản sau fix race cursor. Bằng chứng local trên working tree dirty, chưa có CI độc lập; không phải xác nhận production hoặc hoàn thành toàn bộ PB-13. Kiểm tra HTTP từng API vận hành, UI nhật ký và chi nhánh tiếp tục theo dõi ở lát cắt tương ứng theo phạm vi đã chốt.

## Kiểm chứng khi kết thúc — 30/10/2026

Các nhận định chưa có CI/working tree dirty ở trên ghi đúng thời điểm nghiệm thu local. Sau đó PB-03 được commit tại `4db3149`, merge vào master tại `64c7783`; refactor cấu trúc backend được review, kiểm chứng và đưa lên master tại `9cc329977949482966115ef9506434151bb88068` theo yêu cầu Product Owner. Lượt đóng sprint chỉ sửa hồ sơ, không sửa source hoặc chạy lại browser/test ứng dụng.

| Phiên bản/phạm vi | Kết quả đã đối chiếu | Bằng chứng và giới hạn |
| --- | --- | --- |
| UI sau fix race cursor, PB-03/PB-13 đã nghiệm thu | Browser gọi API thật; chọn store ngoài trang đầu và cấp OWNER đúng store; modal/storage/reload; UI test 10/10 | [Run sau fix](../../.devloopflow/verify/20261030-platform-tab-race/run.md), [QA matrix cuối](../../.devloopflow/verify/20261030-platform-tab-race/qa-acceptance-audit.md). Hash screen hiện tại vẫn là `75ef00dd3fd5e6c0704c7290a88c0e237665e9f43ead44f97a6a629edbbb9117`; POS_UI không đổi từ commit PB-03 đến `9cc3299`. Browser là local, case GET danh sách 503 được mô phỏng có ghi nhãn rõ. |
| Backend sau refactor auth/platform | Build và 7/7 test PostgreSQL; metadata 8 entity và hash 3 migration không đổi; reviewer xác nhận đủ artifact | [Run refactor](../../.devloopflow/verify/2026-10-30-103643-4db3149-module-structure/run.md). Test local trên diff trước commit, có manifest source; không thay đổi schema/hợp đồng API. Cấu trúc chính ở [ARCHITECTURE.md](../../docs/architecture/ARCHITECTURE.md#51-backend-một-modular-monolith). |
| CI/runner độc lập trên master `9cc3299` | Backend build/migration/test **7 pass, 0 fail, 0 skipped**; frontend typecheck/build/test **10 pass, 0 fail, 0 skipped**; audit dependency cả hai job thành công | [CI run 40999585144](https://github.com/LongIch2810/POS-Food-And-Beverage/actions/runs/40999585144), [metadata CI](closure-evidence/ci-run-40999585144.json), [log backend](closure-evidence/ci-backend-123880597589.log), [log frontend](closure-evidence/ci-frontend-123880597865.log). Không chạy browser E2E hoặc xác minh production trong CI. |

Các output CI được tải trực tiếp từ GitHub và giữ tại [closure-evidence/](closure-evidence/README.md); không viết lại log local để gắn cho commit mới. Đã mở lại artifact browser/network/DB quan trọng và log runner; [task đóng sprint](../../.devloopflow/tasks/completed/2026-10-30-chot-sprint-2.md) ghi phạm vi đối chiếu và lệnh kiểm tra.

## Retrospective từ hồ sơ

Nguồn đối chiếu: [plan PB-03](../../.devloopflow/plans/completed/2026-10-29-pb03-platform.md), [bản nháp đã chốt](../../.devloopflow/plans/completed/2026-10-30-pb03-spec-draft.md), [task triển khai](../../.devloopflow/tasks/completed/2026-10-29-trien-khai-pb03.md), [fix race](../../.devloopflow/tasks/completed/2026-10-30-fix-platform-tab-race.md), [QA sau fix](../../.devloopflow/tasks/completed/2026-10-30-qa-pb03-after-race.md), [plan refactor](../../.devloopflow/plans/completed/2026-10-30-backend-module-structure.md), [lỗi race](../../.devloopflow/errors/2026-10-30-platform-tab-reload-race.md) và [lỗi thu bằng chứng](../../.devloopflow/errors/2026-10-30-module-refactor-evidence-runner.md).

- **Làm tốt:** chốt lại D1–D5 trước khi sửa hợp đồng; API/UI thống nhất cursor/limit/meta, permission/context và target store; transaction và thu hồi phiên được kiểm tra với PostgreSQL thật. Review tìm được race cursor, regression test tái hiện trước sửa và browser sau fix xác minh lại đúng UI cuối. Backend có cấu trúc module thống nhất để tiếp tục phát triển.
- **Vướng mắc:** spec cũ thiếu chi tiết khiến phải refinement/làm lại; QA ban đầu thiếu browser đúng phiên bản sau fix và thao tác chọn store ngoài trang đầu. Reload mutation cũ có thể ghi đè cursor của tab mới. Script thu bằng chứng sau refactor còn vướng thứ tự build và khác encoding/newline, đã sửa và giữ dấu vết gốc.
- **Một cải tiến cho sprint tiếp theo:** khi refinement màn nhiều tab/phân trang, thêm ngay tình huống request cũ hoàn tất sau đổi tab hoặc cursor vào ma trận tiêu chí → test → browser artifact. Người triển khai viết regression điều khiển thứ tự response; QA đối chiếu lại hash source/runtime và network trên UI cuối trước khi trình nghiệm thu. Không chỉ kiểm tra luồng tuần tự hoặc dùng ảnh UI trước bản fix.

## Việc chuyển tiếp và giới hạn

| Việc | Nơi theo dõi | Trạng thái khi đóng Sprint 2 |
| --- | --- | --- |
| Kiểm tra HTTP chặn PLATFORM_ADMIN trên từng API hóa đơn/ca/kho/doanh thu thật | PB-06 đến PB-12 và lát cắt PB-13 tương ứng trong [Product Backlog](../../docs/PRODUCT_BACKLOG.md#việc-theo-dõi-sau-sprint-2) | Chưa có các API đó; kiểm tra permission/context đã đạt trong phạm vi hiện có, không thay thế test endpoint tương lai. |
| Chi nhánh/bàn/nhân viên và UI tương ứng | PB-04 + lát cắt PB-13 | Chưa triển khai; không tính là việc đã hoàn tất của Sprint 2. |
| UI nhật ký quản trị | Giai đoạn 2 theo phạm vi đã chốt trong spec platform | Backend log BR-86 đã có; UI nhật ký chưa triển khai, không tự đưa vào sprint kế tiếp. |
| Các màn vận hành còn mock và production/backup/TLS | Các lát cắt PB-13 còn lại và PB-14 | Ngoài phần nghiệm thu của Sprint 2; chưa có xác nhận production. |
| Material/chứng chỉ QA tạm từ Sprint 1 | [Error môi trường còn mở](../../.devloopflow/errors/2026-10-29-qa-temp-cleanup-blocked.md) | Kiểm tra chỉ đọc ngày 30/10 vẫn thấy thư mục và chứng chỉ còn trên máy; chưa dọn, không sửa/xóa trong task này. Không phải blocker của kết quả local Sprint 2. |

## Kết luận Sprint 2 — 2026-10-30

**Sprint Goal đạt trong phạm vi local; Sprint 2 đã kết thúc theo yêu cầu Product Owner.** PB-03 và PB-13 quản trị nền tảng đã được chấp nhận 4/4 và 3/3 tiêu chí; không có item trong phạm vi đã chốt phải trả lại vì không đạt. Những việc hoãn từ D5 và các lát cắt vận hành tiếp tục ở Product Backlog, không được tính thành PB-13 hoàn thành toàn bộ.

Master `9cc3299` đã chứa mã được review và có CI backend/frontend thành công. Bằng chứng browser vẫn là local đã đối chiếu với UI không đổi; CI không xác nhận browser E2E hay production. Sprint kế tiếp chưa được lập hoặc cam kết trong lượt đóng này; PB-04 vẫn là ưu tiên đề xuất tiếp theo theo dependency, cần refinement/chốt riêng trước triển khai.
