# Sprint 3 — đã kết thúc, nghiệm thu local

**Trạng thái:** Product Owner chấp nhận nghiệm thu **PB-04 + PB-13 tổ chức trong phạm vi local** và Sprint3 kết thúc ngày **01/11/2026**. Căn cứ: sau khi QA xác nhận READY FOR PO LOCAL ACCEPTANCE cho sáu tiêu chí, Product Owner yêu cầu “thu hoạch nghiệm thu đi” trong hội thoại. Kế hoạch ban đầu đã chốt ngày30/10 là **30/10–05/11/2026**; ngày kết thúc thực tế sớm hơn kế hoạch. Chưa nghiệm thu CI/production hoặc toàn bộ sản phẩm PB-13.

## Cơ sở lập kế hoạch

[Product Backlog](../../docs/PRODUCT_BACKLOG.md) đề xuất PB-04 sau PB-03, đi cùng lát cắt PB-13 tương ứng. [Sprint 2](../sprint-02/SPRINT.md#kết-luận-sprint-2--2026-10-30) đã kết thúc ngày 30/10/2026: PB-03 và UI quản trị nền tảng được nghiệm thu trong phạm vi local; các màn vận hành còn dùng mock.

Nhóm gồm Product Owner và Codex. Kế hoạch ban đầu giữ nhịp một tuần,30/10–05/11/2026; sprint kết thúc thực tế01/11 sau khi hoàn thành phạm vi và Product Owner chấp nhận. Không dùng việc đóng sớm để tự tăng sức chứa hoặc cam kết sprint kế tiếp.

## Sprint Goal đã chốt

`OWNER` thiết lập được chi nhánh, tiền đầu ca, bàn và tài khoản `MANAGER`/`CASHIER` qua API và UI thật, với dữ liệu và quyền được giới hạn đúng cửa hàng/chi nhánh. Sprint này chuẩn bị tổ chức để các sprint sau triển khai menu và ca thu ngân; chưa cung cấp luồng bán hàng thật.

## Sprint Backlog đã chốt

| Thứ tự | Item | Kết quả cần đạt | Điều kiện trước khi triển khai |
| --- | --- | --- | --- |
| 1 | Refinement PB-04 | Phỏng vấn, rà BR-05–07, BR-70/71/71b/76, BR-83–85/97, BR-55/103 và các quy tắc bàn liên quan; chốt phạm vi thao tác, hợp đồng endpoint, quyền, lỗi và ma trận tiêu chí → tình huống → artifact. | Product Owner chốt quyết định còn mở; chỉ lưu spec tổ chức vào `specs/` sau khi chốt theo skill `create-pos-spec`. |
| 2 | PB-04 — chi nhánh và bàn | API/DB cho OWNER thiết lập chi nhánh, tiền đầu ca và quản lý bàn theo spec tổ chức. | Spec phần tương ứng đã chốt; đối chiếu schema/migration hiện có, không coi entity Branch hiện tại là API hoàn chỉnh. |
| 3 | PB-04 — tài khoản nhân viên | OWNER cấp MANAGER/CASHIER trong store và chi nhánh hợp lệ, theo cơ chế mật khẩu tạm/đổi mật khẩu và quyền hiện hành. | Spec tài khoản đã chốt, thống nhất với auth; kiểm tra truy cập chéo store/branch bằng PostgreSQL thật. |
| 4 | PB-13 — lát cắt tổ chức | Nối màn quản lý chi nhánh, bàn và nhân viên với API thật trong phạm vi PB-04 đã chốt; trình bày lỗi bằng tiếng Việt. | API tương ứng đã có và được kiểm tra; các luồng vận hành còn mock tiếp tục được ghi rõ. |
| 5 | Review và nghiệm thu | Demo trên mã/UI cuối; đối chiếu tiêu chí với test, API, DB và browser; Product Owner quyết định từng item. | Đủ artifact gốc và review theo AGENTS.md; không tự tick từ kết quả demo hoặc số test pass. |

Product Owner chốt sức chứa PB-04 và PB-13 tổ chức theo bảng trên. PB-05/PB-06, nhật ký UI, thanh toán, production và sao lưu không thuộc sprint. Nếu cần đổi phạm vi, trình Product Owner điều chỉnh Sprint Goal/backlog; không âm thầm bỏ phần tài khoản hoặc UI. Việc yêu cầu triển khai riêng kế hoạch API/DB trước đó chỉ quyết định thứ tự thực hiện, không tính UI đã hoàn tất.

## Tiêu chí nghiệm thu

Sáu tiêu chí dưới đây đã được QA đối chiếu theo từng vế tại [báo cáo sẵn sàng nghiệm thu](../../.devloopflow/verify/20261101-203100-9ce75dd-pb13-final/acceptance-readiness.md), rồi Product Owner chấp nhận ngày01/11/2026. Dấu tick chỉ áp dụng phạm vi local đã chốt; các phần deferred/ngoài scope vẫn giữ nguyên.

- [x] OWNER tạo và quản lý chi nhánh trong store của mình theo spec đã chốt; tiền đầu ca là số nguyên VND trong giới hạn BR-103. Chính sách sửa tiền đầu ca đã chốt; không tính việc mở ca hoặc kiểm tra sửa quỹ sau ca PB-06 vào tiêu chí này.
- [x] OWNER quản lý bàn thuộc đúng chi nhánh/store theo spec; thao tác với ID ngoài phạm vi bị từ chối. Trạng thái trống/có khách không được lưu thành nguồn sự thật riêng thay cho đơn OPEN (BR-99); không coi đây là kiểm chứng luồng đơn chưa triển khai.
- [x] OWNER cấp được MANAGER/CASHIER gắn chi nhánh thuộc cùng store; username chuẩn hóa/duy nhất và tài khoản mới buộc đổi mật khẩu. Mật khẩu chỉ lưu hash; mật khẩu tạm chỉ hiện lúc cấp, không được lưu trong browser storage hoặc log.
- [x] API tổ chức kiểm tra permission và danh tính hiện hành; chặn truy cập chéo store/branch, tài khoản/store bị khóa, danh tính platform và tài khoản chưa đổi mật khẩu theo hợp đồng đã chốt. Kiểm tra HTTP trên endpoint tổ chức thật; không thay thế test các API vận hành tương lai.
- [x] UI của lát cắt PB-04 đọc/ghi qua API thật; tải lại trang vẫn hiển thị dữ liệu DB đã lưu, có trạng thái đang xử lý/lỗi và thông báo tiếng Việt. Luồng auth và quản trị nền tảng đã có không bị regression.
- [x] Các request cũ hoàn tất sau đổi tab/chi nhánh/trang không ghi đè dữ liệu hoặc phạm vi đang chọn, có regression điều khiển thứ tự response và bằng chứng browser phù hợp trên các lịch đã kiểm.

## Kiểm tra và bằng chứng

Trước khi chạy, chi tiết hóa từng vế tiêu chí thành tình huống và artifact theo AGENTS.md; bảng dưới là kế hoạch thu bằng chứng, chưa phải kết quả thực thi.

| Phạm vi | Artifact cần lưu |
| --- | --- |
| Chi nhánh, tiền đầu ca, bàn | Output test/HTTP đã che dữ liệu nhạy cảm; truy vấn DB chỉ đọc trước/sau các thao tác ghi; dữ liệu/giới hạn và ID ngoài phạm vi theo spec. |
| Cấp tài khoản và đổi mật khẩu | Request/response đã che mật khẩu/token, DB trước/sau không chứa hash/token thô trong artifact; kết quả kiểm tra cờ đổi mật khẩu, quyền và phạm vi. |
| Quyền và tenant | Test HTTP trên endpoint tổ chức thật cho từng permission/context và ID tham chiếu theo spec; kiểm tra không đổi DB khi bị từ chối. |
| UI thật | Snapshot/ảnh trước/sau chuyển trạng thái, method/path/status hoặc request ID; reload, lỗi/retry, cấp tài khoản và kiểm tra storage không lưu mật khẩu tạm. |
| Đồng thời và regression | Output test thứ tự response, browser trên UI cuối cho tình huống liên quan; build/test auth/platform và phần thay đổi theo manifest hiện tại. |

Mỗi lần chạy lưu `qa-evidence/<ngày-giờ>-<short-commit>/run.md` với lệnh, SHA, trạng thái dirty, môi trường, thời điểm và exit code cùng artifact gốc. Trước khi nghiệm thu phải mở lại artifact, ghi bảng tiêu chí → tình huống → file cụ thể; phân biệt local do agent chạy, CI/runner độc lập và chưa xác minh. Browser local không xác nhận production.

## Quyết định đã chốt và việc tiếp theo

1. Ngày 30/10/2026 Product Owner chốt Sprint Goal và sức chứa PB-04 + PB-13 tổ chức.
2. Lịch sprint đã chốt: 30/10–05/11/2026.
3. Spec API/DB tổ chức và nhân viên đã chốt, mã đã triển khai theo [plan PB-04](../../.devloopflow/plans/completed/2026-10-30-pb04-organization-api.md). Sau audit phát hiện AUD-01..05, đã bổ sung test/artifact, sửa tài liệu và hai lỗi cạnh tranh JOIN/khóa user. Full test cuối48/48 TAP nodes đạt local; [run sửa gap](../../.devloopflow/verify/20261030-202325-9ce75dd-pb04-gap-fix/run.md) và [QA đối chiếu](../../.devloopflow/verify/20261030-202325-9ce75dd-pb04-gap-fix/audit.md) ghi phạm vi/giới hạn. Các quyết định nghiệp vụ không đổi.
4. PB-13 tổ chức đã nối ba tab Cài đặt với API thật theo [spec UI](../../.devloopflow/specs/organization-ui.md). [Run cuối01/11](../../.devloopflow/verify/20261101-203100-9ce75dd-pb13-final/run.md) tiếp nối [run30/10](../../.devloopflow/verify/20261030-214100-9ce75dd-pb13-organization-ui/run.md), ghi rõ test/browser/DB và giới hạn. Code review không còn finding; QA C01..C20 và sáu tiêu chí sprint đã được đối chiếu độc lập. Product Owner chấp nhận nghiệm thu local ngày01/11/2026 sau báo cáo QA, không chỉ dựa trên số test pass.

## Review và retrospective

Lượt lập/chốt sprint chỉ cập nhật hồ sơ; API/DB PB-04 và UI PB-13 tổ chức được triển khai/kiểm tra trong task riêng. Áp dụng Definition of Ready/Done và cách vận hành từ [Sprint 1](../sprint-01/SPRINT.md#cách-vận-hành-mỗi-tuần).

| Item | Kết quả | Bằng chứng | Quyết định Product Owner |
| --- | --- | --- | --- |
| PB-04 | API/DB đã triển khai; sửa gap chứng cứ và hai lỗi cạnh tranh, full test48/48 TAP nodes đạt local, code review không còn finding; chưa merge/push | [Run bản sửa cuối](../../.devloopflow/verify/20261030-202325-9ce75dd-pb04-gap-fix/run.md), [QA đối chiếu](../../.devloopflow/verify/20261030-202325-9ce75dd-pb04-gap-fix/audit.md), [code review](../../.devloopflow/verify/20261030-202325-9ce75dd-pb04-gap-fix/review.md) | Chấp nhận local —01/11/2026, theo quyết định Product Owner sau QA readiness |
| PB-13 tổ chức | Đã nối API thật; UI28/28 vàAPI48/48, typecheck/build/browser qua local; code review không còn finding, QA C01..C20 đã đối chiếu | [Run PB-13](../../.devloopflow/verify/20261101-203100-9ce75dd-pb13-final/run.md), [QA đối chiếu](../../.devloopflow/verify/20261101-203100-9ce75dd-pb13-final/audit.md), [code review](../../.devloopflow/verify/20261101-203100-9ce75dd-pb13-final/review.md) | Chấp nhận local —01/11/2026; chỉ lát cắt tổ chức, chưa nghiệm thu toàn PB-13 hoặc production |

Cải tiến kế thừa Sprint 2: đưa tình huống response cũ sau đổi tab/phạm vi/phân trang vào refinement và kiểm tra UI cuối ngay từ đầu. Retrospective và kết luận từ kết quả thực tế được ghi bên dưới.

## Tiến độ PB-04 API/DB — 30/10/2026

Trước khi chốt kế hoạch sprint, Product Owner đã yêu cầu triển khai **chỉ API/DB** PB-04 trong kế hoạch thực hiện riêng. Sau đó Product Owner chốt lịch/phạm vi Sprint 3 như ghi ở đầu file; tại thời điểm30/10 chưa nghiệm thu UI PB-13. Nhánh `feat/pb04-organization-api` đã có API chi nhánh/bàn và quản lý MANAGER/CASHIER; spec [tổ chức](../../.devloopflow/specs/organization.md), [nhân viên](../../.devloopflow/specs/users.md). Bằng chứng local bản sửa cuối và giới hạn tại [run PB-04](../../.devloopflow/verify/20261030-202325-9ce75dd-pb04-gap-fix/run.md); run21/21 cũ giữ làm lịch sử, không thay bản cuối.

Kiểm tra khóa sửa quỹ sau ca đầu được tích hợp với PB-06 theo quyết định đã chốt; chưa có bảng/API ca ở PB-04. UI tổ chức đã nối API; sáu tiêu chí local được Product Owner nghiệm thu01/11. Không dùng kết quả này xác nhận quỹ sau ca hoặc production.

## Kết quả kỹ thuật PB-13 tổ chức — 01/11/2026

[Plan](../../.devloopflow/plans/completed/2026-10-30-pb13-organization-ui.md) và [task](../../.devloopflow/tasks/completed/2026-10-30-pb13-organization-ui.md) đã hoàn tất phần triển khai/kiểm chứng. UI28/28, APIrerun48/48, typecheck/build0; browser có bằng chứng API/DB/mật khẩu/phiên/quyền/phân trang và768/1024px/bàn phím. Code review không còn finding; QA C01..C20 không còn gap trọng yếu trong scope. Lượt API đầu timeout cleanup và các giới hạn local/CI/production được giữ trong run. Chưa commit/push/merge; quyết định nghiệm thu local của Product Owner được ghi tại kết luận bên dưới.

## Retrospective từ hồ sơ

- **Làm tốt:** chốt hợp đồng API/UI và phạm vi trước khi triển khai; dùng PostgreSQL thật kiểm quyền/tenant/transaction, có regression ép thứ tự khóa và phản hồi. UI cuối có network/DB/ảnh/snapshot, kiểm768/1024px và bàn phím; reviewer/QA đọc và rehash lại bằng chứng.
- **Vướng mắc đã xử lý:** audit PB-04 đầu thiếu chứng cứ AUD-01..05; JOIN trước khi chờ khóa gây login401/reset404 sai; UI từng có active-tab kẹt tải, replay401 qua danh tính mới và render rows tab cũ với columns mới. Các lỗi có red/green và hồ sơ errors, không che bằng cách nới assertion.
- **Cải tiến tiếp tục áp dụng:** lập ma trận từng vế nghiệm thu trước khi chạy; test cả callback render và request hoàn tất sau đổi context; khóa identity/query scope và kiểm đúng phiên bản artifact trước khi trình PO.
- **Điểm cần theo dõi:** lượt regression API đầu timeout ở cleanup DROP DATABASE, lượt chạy lại qua48/48. Giữ log và [error record](../../.devloopflow/errors/2026-11-01-pb13-api-qa-cleanup-timeout.md); nguyên nhân sâu chưa xác minh, không ghi thành lỗi production đã sửa.

## Việc chuyển tiếp và giới hạn

| Việc | Nơi theo dõi | Trạng thái khi kết thúc |
| --- | --- | --- |
| Khóa sửa quỹ sau ca CASHIER đầu dưới cùng khóa Branch với mở ca | PB-06 | Deferred đã chốt; phải hoàn tất trước khi bật API mở ca, chưa kiểm chứng sau ca trong Sprint3 |
| Thực đơn và UI tương ứng | PB-05 + PB-13 | Ưu tiên đề xuất tiếp theo theo dependency; cần refinement/chốt riêng, chưa tự lập Sprint4 |
| API ca/bán hàng/thanh toán/kho/báo cáo và chặn platform trên từng endpoint thật | PB-06..PB-12 + PB-13 | Chưa triển khai/nghiệm thu trong Sprint3; các màn liên quan vẫn demo |
| Độ ổn định cleanup DB QA | Error record nêu trên | Theo dõi riêng; không là blocker nghiệp vụ của lần nghiệm thu local này |
| Commit/tích hợp/CI độc lập và production/backup/TLS | Quy trình Git/PB-14 | Tại nghiệm thu01/11 chưa thực hiện; ngày02/11 PO yêu cầu commit/push riêng theo từng phần, ghi cập nhật bên dưới. Chưa merge hoặc xác nhận production |

## Đối soát errors, plans và tasks — 2026-11-01

Đọc lại toàn bộ bảy error record và hai plan liên quan PB-04/PB-13 tổ chức, cùng các task lập sprint, review, audit, triển khai và nghiệm thu. Các ghi nhận “chờ UI/chưa nghiệm thu/mở lại active” trong hồ sơ cũ đã được chú thích theo thời điểm; chúng không còn là trạng thái hiện hành. Không sửa raw log hoặc kết luận của reviewer tại thời điểm chạy.

| Hồ sơ lỗi | Kết quả khi chốt sprint | Theo dõi còn lại |
| --- | --- | --- |
| [Gap AUD-01..05](../../.devloopflow/errors/2026-10-30-pb04-acceptance-evidence-gaps.md) | Đã bổ sung assertion/artifact, sửa sai lệch tài liệu và QA đóng trong scope API/DB | Không còn gap mở trong AUD-01..05 |
| [Thứ bậc vai trò, UUID tự thao tác và Content-Type](../../.devloopflow/errors/2026-10-30-pb04-staff-authorization.md) | Đã sửa, có regression red/green; được chạy lại trong suite API cuối | Không còn finding mở trong phạm vi sửa |
| [JOIN khi chờ khóa user](../../.devloopflow/errors/2026-10-30-pb04-login-role-lock-race.md) | Đã sửa login và helper staff; kiểm14 lịch khóa, full API cuối48/48 | Không còn finding mở trong phạm vi sửa |
| [Bấm tab hiện hành kẹt loading](../../.devloopflow/errors/2026-10-30-pb13-active-tab-loading.md) | Đã sửa, regression UI cuối28/28 và browser được QA đối chiếu | Không còn finding mở trong phạm vi sửa |
| [Replay request qua danh tính mới](../../.devloopflow/errors/2026-10-30-pb13-session-retry-scope.md) | Đã sửa identity/epoch guard; unit regression và browser B32 có chứng cứ | Không còn finding mở trong phạm vi sửa |
| [Render rows cũ với columns mới](../../.devloopflow/errors/2026-10-30-pb13-tab-row-shape.md) | Đã sửa rowsKey; regression chạy callback cột thật và browser bản cuối | Không còn finding mở trong phạm vi sửa |
| [Timeout cleanup DB QA](../../.devloopflow/errors/2026-11-01-pb13-api-qa-cleanup-timeout.md) | Giữ lượt đầu47/48 và lượt chạy lại48/48; không coi rerun là sửa nguyên nhân | Còn theo dõi độ ổn định QA; nguyên nhân sâu chưa xác minh, không là blocker nghiệm thu local theo QA |

Hai plan [PB-04 API/DB](../../.devloopflow/plans/completed/2026-10-30-pb04-organization-api.md) và [PB-13 tổ chức](../../.devloopflow/plans/completed/2026-10-30-pb13-organization-ui.md) đều completed, không còn bước triển khai trong scope đang chờ. UI tách khỏi plan API/DB đã hoàn thành bằng plan riêng; khóa quỹ sau ca vẫn chuyển PB-06 theo quyết định đã chốt, không ghi là lỗi đã sửa.

Chuỗi task completed: [lập sprint](../../.devloopflow/tasks/completed/2026-10-30-lap-sprint-3.md) → [review PB-04](../../.devloopflow/tasks/completed/2026-10-30-review-lai-pb04.md) → [audit đối chứng](../../.devloopflow/tasks/completed/2026-10-30-doi-chung-pb04.md) → [triển khai/sửa gap API](../../.devloopflow/tasks/completed/2026-10-30-pb04-organization-api.md) → [UI tổ chức](../../.devloopflow/tasks/completed/2026-10-30-pb13-organization-ui.md) → [QA readiness](../../.devloopflow/tasks/completed/2026-11-01-ra-soat-nghiem-thu-sprint3.md) → [ghi quyết định nghiệm thu](../../.devloopflow/tasks/completed/2026-11-01-nghiem-thu-sprint3.md). Chuỗi này mô tả các mốc và kết quả thay thế kết luận cũ; không có task trong phạm vi Sprint 3 phải mở lại từ lượt đối soát hồ sơ này.

## Kết luận Sprint 3 — 2026-11-01

**Sprint Goal đạt trong phạm vi local; Sprint3 đã kết thúc theo quyết định nghiệm thu của Product Owner.** PB-04 và PB-13 tổ chức được chấp nhận đủ sáu tiêu chí; không có item trong phạm vi đã chốt phải trả lại vì không đạt. Cơ sở là [ma trận nghiệm thu QA](../../.devloopflow/verify/20261101-203100-9ce75dd-pb13-final/acceptance-readiness.md), raw artifact API/UI/DB đúng phiên bản và quyết định PO trong hội thoại, không chỉ số test pass.

Phiên bản tại nghiệm thu01/11 trên nhánh `feat/pb13-organization-ui`, HEAD/base `9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18`, working tree dirty nhận diện bằng manifest; lúc đó chưa có commit PB04/PB13 riêng, CI mới hoặc xác nhận production. Lượt nghiệm thu chỉ cập nhật hồ sơ, không chạy lại hoặc viết lại bằng chứng thực thi. Các deferred/giới hạn nêu trên giữ nguyên; chưa cam kết nội dung/lịch/sức chứa Sprint4.

## Cập nhật commit/push — 2026-11-02

Theo yêu cầu Product Owner “commit push theo từng phần”, đã tách mã đã nghiệm thu thành `77462ed` (API PB-04), `8de87c1` (UI PB-13 tổ chức), `834ec09` (bằng chứng QA) và `dafd0b5` (hồ sơ Sprint/plan/task/errors). Đã push chính nhánh `feat/pb13-organization-ui`, remote khớp local; không merge hoặc force-push. [CI41379713471](https://github.com/LongIch2810/POS-Food-And-Beverage/actions/runs/41379713471) tại `dafd0b5` thành công cả backend/frontend, gồm build/migration/test/audit. Kết quả chi tiết tại [task commit/push](../../.devloopflow/tasks/completed/2026-11-02-commit-push-sprint3.md); commit tiếp theo chỉ lưu kết quả này, không thay source đã qua CI.

Đối chiếu trước commit:221 mục source/runtime/contract/tooling và500 mục artifact đều khớp SHA-256. Không đổi source đã review hoặc chạy lại suite trong lượt đóng gói; dùng bộ kiểm chứng local cuối và theo dõi CI sau push. Nguyên nhân sâu cleanup timeout và deferred PB-06 vẫn giữ nguyên.
