# Sprint 1 — đã kết thúc; Sprint Goal đạt trong phạm vi local

## Mục tiêu và phạm vi

Sprint dài một tuần, nhóm gồm Product Owner và Codex. Product Backlog nằm ở [docs/PRODUCT_BACKLOG.md](../../docs/PRODUCT_BACKLOG.md). UI hiện tại là demo mock; nền API và PostgreSQL local của PB-01 đã được Product Owner nghiệm thu.

## Cách vận hành mỗi tuần

1. **Planning (đầu tuần, 30–45 phút):** chọn Sprint Goal, làm rõ acceptance criteria và chọn số item vừa sức. Chỉ item đủ rõ, có phụ thuộc được xử lý mới đưa vào Sprint Backlog.
2. **Trong sprint:** Codex cập nhật `tasks/active/` và báo tiến độ/ngăn trở hằng ngày; Product Owner trả lời các câu hỏi nghiệp vụ trước khi phần phụ thuộc được triển khai. Thay đổi ưu tiên có thể điều chỉnh backlog, không âm thầm đổi Sprint Goal.
3. **Review (cuối tuần, 30 phút):** demo trên mã chạy thật; Product Owner chấp nhận hoặc trả lại từng item theo tiêu chí. Ghi rõ cái gì chỉ là UI mock.
4. **Retrospective (15 phút):** chọn một cải tiến quy trình cho tuần sau. Sức chứa tuần tiếp theo dựa trên số item thực sự hoàn tất, không áp số story point giả.

**Definition of Ready:** mục tiêu người dùng, quy tắc BR, điều kiện chấp nhận, phụ thuộc và câu hỏi mở được ghi rõ; đặc tả endpoint liên quan đã được phỏng vấn/chốt trước khi code và lưu vào `specs/`.

**Definition of Done:** mã chạy trên nhánh riêng, kiểm thử đúng phần thay đổi (gồm quyền/tenant và ranh giới dữ liệu khi liên quan), có bằng chứng chạy theo `AGENTS.md`, review trước merge, tài liệu/spec cập nhật; không coi màn hình demo mock là chức năng đã hoàn tất. Không tự push hoặc merge.

## Product Backlog MVP

Product Backlog được lưu riêng tại [docs/PRODUCT_BACKLOG.md](../../docs/PRODUCT_BACKLOG.md). File này chỉ giữ Sprint Goal, Sprint Backlog và kết quả Sprint 1.

## Sprint Backlog đề xuất

**Sprint Goal:** có nền API và một luồng đăng nhập thật để kiểm chứng danh tính/phiên từ PostgreSQL; chưa công bố là sản phẩm bán hàng.

Tại Sprint Planning ban đầu, PB-01 đã được nghiệm thu còn PB-02/PB-13 vẫn là đề xuất; trạng thái nghiệm thu hiện tại nằm ở bảng Review. Các ô chỉ được đánh dấu sau khi có bằng chứng chạy thật và Product Owner xác nhận.

Thứ tự thực hiện, **mỗi phần được làm rõ và chốt spec riêng trước khi code phần đó**:

1. Refinement PB-01: xác định điều kiện chạy local, migration, health check và cách bootstrap; ghi câu hỏi và quyết định cần thiết cho phần này.
2. PB-01: triển khai nền API/DB theo phần đã rõ, kiểm tra migration và health check trên PostgreSQL thật.
3. Refinement PB-02: phỏng vấn, rà mâu thuẫn và chốt từng endpoint xác thực vào `specs/auth.md`. Chưa viết mã auth phụ thuộc khi spec chưa chốt.
4. PB-02: triển khai và kiểm thử login, `me`, refresh, logout, đổi mật khẩu lần đầu và guard theo spec đã chốt.
5. PB-13 (lát cắt auth): nối màn đăng nhập/đổi mật khẩu trong React với API thật; access/refresh token ở cookie HttpOnly, CSRF theo spec đã chốt.
6. Review: demo đăng nhập → buộc đổi mật khẩu → đăng nhập lại → xem danh tính → tải lại trang/khôi phục phiên → đăng xuất. Ghi bằng chứng và kết quả nghiệm thu thực tế.

## Tiêu chí nghiệm thu Sprint 1

### PB-01 — nền API và PostgreSQL

- [x] Từ PostgreSQL local trống, migration chạy bằng lệnh riêng và chạy lại không nhân đôi; API không tự chạy migration và không phục vụ khi schema thiếu.
- [x] Schema auth và constraint được kiểm tra trên PostgreSQL thật: username chuẩn hóa/duy nhất, `token_hash` duy nhất, mỗi phiên tối đa một refresh token chưa thu hồi; mật khẩu và refresh token chỉ lưu hash.
- [x] Bootstrap từ biến môi trường tạo đúng một `PLATFORM_ADMIN` với `store_id`/`branch_id` là `NULL`, bắt buộc đổi mật khẩu; thiếu/sai biến lần đầu làm startup thất bại, khởi động lại không cần biến và không sửa user cũ. Không có tài khoản hay secret mặc định trong source/log.

  Cập nhật theo quyết định Product Owner: tài khoản bootstrap được tạo với `must_change_password = false`; kết quả nghiệm thu cũ ở trên ghi lại tiêu chí tại thời điểm kiểm thử.
- [x] `GET /api/v1/health` trả `200` khi DB sẵn sàng, `503` với `SERVICE_UNAVAILABLE` khi DB mất kết nối; truy vấn timeout 5 giây. Lỗi HTTP có envelope và `X-Request-Id`, không lộ thông tin kết nối. Build/test trên DB thật và artifact QA đạt theo [spec PB-01](../../.devloopflow/specs/foundation.md).

Các ô trên dành cho **quyết định nghiệm thu của Product Owner**; kết quả kiểm tra kỹ thuật và giới hạn bằng chứng nằm trong bảng Review bên dưới.

### PB-02 — xác thực và phiên

- [x] Người dùng được cấp tài khoản đăng nhập đúng mật khẩu; server đặt access token 30 phút và refresh token 7 ngày trong hai cookie HttpOnly riêng, không trả token trong JSON. Refresh token chỉ lưu hash trong DB. Sai tài khoản/mật khẩu, tài khoản bị khóa hoặc store tạm khóa không để lộ tài khoản tồn tại qua thông báo đăng nhập; áp giới hạn thử theo tài liệu auth.
- [x] `GET /auth/me` trả danh tính, vai trò, quyền và phạm vi store/branch hiện hành từ DB. Token sai, hết hạn hoặc phiên đã thu hồi bị từ chối; `PLATFORM_ADMIN` không có quyền đọc dữ liệu vận hành store.
- [x] Tài khoản mới bị chặn chức năng nghiệp vụ cho đến khi đổi mật khẩu, trừ `PLATFORM_ADMIN` bootstrap theo quyết định Product Owner. Đổi mật khẩu thành công bỏ cờ bắt buộc, thu hồi mọi phiên và yêu cầu đăng nhập lại; mật khẩu mới tối thiểu 12 ký tự.
- [x] Tải lại trang khi phiên còn hiệu lực đọc danh tính bằng access cookie; khi access cookie hết hạn, refresh đặt cookie mới. Mỗi lần refresh xoay token; dùng lại token đã xoay thu hồi đúng phiên đó. Mọi request ghi sau đăng nhập thiếu/sai Origin hoặc CSRF bị từ chối theo tài liệu auth.
- [x] Đăng xuất thu hồi phiên hiện tại ngay; access/refresh token của phiên đó không dùng lại được, phiên thiết bị khác vẫn hoạt động. Không có route đăng ký công khai.

**Các tình huống PB-02 đã kiểm thử đạt:** Các ô dưới đây ghi nhận kết quả kỹ thuật. Bằng chứng là [lần chạy test](../../.devloopflow/verify/2026-10-29-105135-1083cd9-pb02-tests/run.md), [QA kiểm chứng lại](../../.devloopflow/verify/2026-10-29-105348-1083cd9-qa-recheck/cases.md) và [bổ sung nghiệm thu](../../.devloopflow/verify/2026-10-29-1327-66c92cb-pb02-acceptance/run.md), đều chạy local.

- [x] Đăng nhập hợp lệ trả `200`, đặt ba cookie, không trả access token trong JSON và chỉ lưu hash refresh token.
- [x] User bị khóa hoặc store tạm khóa bị từ chối theo trạng thái hiện hành; quyền thay đổi trong DB được kiểm tra lại khi access token còn hạn.
- [x] Refresh xoay token; replay bị từ chối và thu hồi phiên; hai refresh đồng thời cho một kết quả thành công và một kết quả bị từ chối.
- [x] Logout thiết bị A thu hồi access và refresh của A, trong khi access và refresh của thiết bị B vẫn sử dụng được.
- [x] Đổi mật khẩu bắt buộc thành công, bỏ cờ và thu hồi phiên; sai mật khẩu hiện tại bị từ chối và giữ phiên. Đổi mật khẩu tự nguyện thành công và thu hồi phiên đang dùng cùng phiên khác.
- [x] Khi phát sinh lỗi ghi, transaction xoay refresh hoặc đổi mật khẩu được rollback và phiên cũ vẫn sử dụng được.
- [x] Các trường hợp vượt ngưỡng login và refresh đã kiểm tra trả `429`; login có `Retry-After`. Các trường hợp CSRF thiếu hoặc sai đã kiểm tra bị từ chối.

Luồng UI và HTTPS local đã được kiểm tra trong [E2E PB-13](../../.devloopflow/verify/2026-10-29-1356-66c92cb-e2e/run.md), dùng chứng chỉ self-signed. Các tình huống API trên được gộp trong một test runner; [CI tại SHA mã `51c0673`](https://github.com/LongIch2810/POS-F-B/actions/runs/40835697546) chạy runner đó thành công, nhưng không chạy browser E2E.

### PB-13 — giao diện cho lát cắt auth

- [x] Màn đăng nhập/đổi mật khẩu gọi API thật; sau đăng nhập lần đầu, người dùng chỉ có thể đổi mật khẩu hoặc đăng xuất. Đổi xong quay về đăng nhập.
- [x] Tải lại trang khôi phục phiên hợp lệ; đăng xuất hoặc phiên hết hiệu lực quay về màn đăng nhập. Access token chỉ trong cookie HttpOnly, không xuất hiện trong JSON, JavaScript, localStorage/sessionStorage/URL hay header Bearer.
- [x] Không cho tài khoản thật dùng nút đổi tài khoản demo hoặc màn vận hành còn dựa vào mock như chức năng đã triển khai. UI hiển thị lỗi bằng tiếng Việt và thao tác được trên tablet ngang.

**Bằng chứng nghiệm thu:** chạy build/test và kiểm tra luồng với API + PostgreSQL thật; ghi lệnh, kết quả và artifact vào `qa-evidence/` theo `AGENTS.md`, rồi điền kết quả Product Owner chấp nhận/trả lại vào mục Review bên dưới. UI mock hoặc ảnh màn hình đơn lẻ không chứng minh dữ liệu DB đã đổi.

**Điều kiện hoàn thành Sprint Goal:** luồng trên chạy với DB thật và UI thật; test tự động cho quy tắc auth/phiên then chốt; không có secret trong Git; build/typecheck của phần đã sửa đạt; có bằng chứng QA. Nếu khối lượng vượt sức chứa, ưu tiên chất lượng PB-01/PB-02 và chuyển PB-13 chưa xong về backlog; khi đó Sprint Goal chưa đạt và phải ghi rõ trong Review, không gọi là hoàn tất.

**Rủi ro/sức chứa:** auth gồm nhiều quy tắc bảo mật và là phần lớn nhất của tuần đầu. Không cam kết ngày hoàn thành cho từng item trước khi refinement; sau 1–2 sprint dùng số item Done thực tế để điều chỉnh. Nếu spec auth phát sinh quyết định nghiệp vụ mở, Product Owner chốt trước khi triển khai phần phụ thuộc.

## Quyết định cần theo dõi

- Đã chốt: nhóm một người dùng + Codex; sprint một tuần. Product Owner muốn lưu sprint trong `sprints/`, sau đó làm rõ spec từng phần theo thứ tự.
- Ngày 2026-10-28: Product Owner yêu cầu hoàn tác lần bắt đầu triển khai trước và lập lại cấu trúc sprint. Bản nháp auth spec cũ chưa được chốt; mã thử đã được gỡ khỏi `POS_API/`. Tại thời điểm đó chưa có PB nào được nghiệm thu.
- Ngày 2026-10-28: Product Owner xác nhận nghiệm thu PB-01 sau khi xem kết quả triển khai và QA local được ghi trong Review; PB-02 và PB-13 chưa được nghiệm thu.
- Quyết định PB-01 đã chốt trong [spec nền API](../../.devloopflow/specs/foundation.md): bootstrap lần đầu từ biến môi trường, startup thất bại khi thiếu/sai biến, bỏ qua biến khi đã có admin; health trả `503` khi DB mất kết nối.
- Các lựa chọn infra còn mở ở `docs/architecture/ARCHITECTURE.md` mục 13 chỉ cần chốt trước PB-14.

## Review và retrospective

| PB | Kết quả demo/kiểm tra | Bằng chứng | Quyết định của Product Owner |
| --- | --- | --- | --- |
| PB-01 | Đã triển khai; migration, bootstrap, constraint và test tích hợp trên PostgreSQL thật đạt. Health `200`/`503` đã kiểm tra thủ công; lần QA cuối kiểm tra lại test nhưng không ngắt DB. | [QA local ban đầu](../../.devloopflow/verify/20261028-125139-842ba1e/run.md), [QA local cuối](../../.devloopflow/verify/20261028-131159-842ba1e/run.md); chưa có CI độc lập. | Chấp nhận PB-01 — Product Owner xác nhận ngày 2026-10-28 trong cuộc trao đổi này. |
| PB-02 | API auth và phiên đã kiểm tra trên PostgreSQL QA riêng; cả 5 tiêu chí được QA đối chiếu lại và CI backend/frontend thành công tại SHA mã `51c0673`. | [Bổ sung nghiệm thu](../../.devloopflow/verify/2026-10-29-1327-66c92cb-pb02-acceptance/run.md), [QA cuối](../../.devloopflow/verify/2026-10-29-1523-e317d73-qa-final-audit/run.md), [CI run 40835697546](https://github.com/LongIch2810/POS-F-B/actions/runs/40835697546). | Chấp nhận PB-02 trong phạm vi auth theo yêu cầu Product Owner ngày 2026-10-29. |
| PB-13 (auth) | UI demo cuối đã nối API auth thật; modal bắt buộc, đổi mật khẩu, khôi phục phiên, logout, phiên bị thu hồi, HTTPS cookie/CSRF, refresh hai tab và tablet ngang đã có artifact browser/API/DB. POS/kho vẫn là demo. | [Browser/API/DB cuối](../../.devloopflow/verify/2026-10-29-1513-e317d73-pb13-final-e2e/run.md), [HTTPS/refresh hai tab](../../.devloopflow/verify/2026-10-29-1430-66c92cb-browser-artifacts/run.md), [QA đối chiếu 3/3](../../.devloopflow/verify/2026-10-29-1523-e317d73-qa-final-audit/run.md). | Chấp nhận PB-13 trong phạm vi local: Product Owner yêu cầu chỉ tick sau khi đủ chứng cứ; QA xác nhận 3/3 ngày 2026-10-29. Chưa nghiệm thu production hoặc CA thực. |

## Kết luận Sprint 1 — 2026-10-29

**Sprint Goal đạt trong phạm vi local.** Product Owner đã chấp nhận PB-01, PB-02 và lát cắt xác thực của PB-13 như bảng Review; không có item thuộc phạm vi này phải trả lại Product Backlog. API auth và UI auth đã được kiểm tra với PostgreSQL thật, UI cuối và artifact browser/API/DB; POS, kho và các màn vận hành khác vẫn là demo. [QA cuối PB-02/PB-13](../../.devloopflow/verify/2026-10-29-1523-e317d73-qa-final-audit/run.md) đối chiếu đủ 5/5 và 3/3 tiêu chí; [CI backend/frontend](https://github.com/LongIch2810/POS-Food-And-Beverage/actions/runs/40835697546) thành công tại SHA `51c0673`. Sau CI, thay đổi dùng chung response API đã được [kiểm tra local](../../.devloopflow/verify/2026-10-29-1641-edbe318-api-response/run.md) với 5 test đạt. Không suy rộng kết quả này thành kiểm chứng browser CI hay production.

**Retrospective từ hồ sơ task/plan/error và QA:** không có biên bản một buổi họp riêng. Việc chốt spec trước code và kiểm tra PostgreSQL thật giúp phát hiện lỗi phiên/quyền trước nghiệm thu. Vướng mắc lớn là chứng cứ browser ban đầu thiếu trạng thái bắt buộc đổi mật khẩu, logout và phiên hết hiệu lực trên **UI demo cuối**; QA đã phải bỏ tick PB-13 rồi chạy, đối chiếu lại. **Cải tiến cho Sprint 2:** lập bảng tiêu chí → tình huống → artifact ngay khi refinement PB-03 và chỉ trình Product Owner nghiệm thu sau khi QA đối chiếu trên mã/UI cuối. Cách làm này được ghi vào [Sprint 2](../sprint-02/SPRINT.md).

**Việc theo dõi riêng:** [material QA tạm và chứng chỉ self-signed](../../.devloopflow/errors/2026-10-29-qa-temp-cleanup-blocked.md) vẫn còn trên máy vì automatic approval review chặn thao tác dọn. Đây là tồn đọng môi trường, không phải bằng chứng PB-01/PB-02/PB-13 chưa đạt; không xóa bằng lệnh rộng hoặc ghi rằng đã dọn. Lượt browser dùng chứng chỉ self-signed và bỏ qua xác thực CA, nên chưa xác minh production.
