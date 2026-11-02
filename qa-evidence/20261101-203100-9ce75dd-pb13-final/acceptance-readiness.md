# Sprint 3 — đánh giá sẵn sàng nghiệm thu local

**Kết luận: READY FOR PO LOCAL ACCEPTANCE.** Có đủ chứng cứ kỹ thuật cho sáu tiêu chí PB-04 + PB-13 tổ chức trên working tree đã nhận diện. Không phát hiện blocker mới trong lượt rà này. Kết luận này cho phép trình Product Owner nghiệm thu local, không tự chuyển các ô Sprint thành đã chấp nhận.

**Người rà:** subagent QA `/root/sprint3_acceptance_qa`, chỉ đọc mã/hợp đồng và bằng chứng; không chạy lại suite/API/browser, không sửa Sprint/source/test/config. Đây là rà soát độc lập của bằng chứng **local do agent chạy**, không phải thực thi độc lập trên CI. Thời điểm rà 01/11/2026, +07:00; kiểm checksum trực tiếp kết thúc 21:51:51.8618632, exit0. Đối tượng: nhánh `feat/pb13-organization-ui`, HEAD/base `9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18`, working tree dirty; HEAD chưa chứa các thay đổi PB-04/PB-13.

## Căn cứ và phương pháp

Đọc tiêu chí thực tế trong [Sprint 3](../../sprints/sprint-03/SPRINT.md), Definition of Ready/Done tại [Sprint 1](../../sprints/sprint-01/SPRINT.md), AGENTS.md, PRODUCT_OVERVIEW, BUSINESS_RULES, rules/testing.md, specs/organization.md, specs/users.md, specs/organization-ui.md và plan/task PB-13 đã completed. Các audit/review trước chỉ là chỉ dẫn tìm bằng chứng, không dùng riêng kết luận của chúng làm chứng minh.

Đã mở raw TAP cuối, commands/environment, dữ liệu DB/credential/pagination/race trong log API, case timestamps và snapshot browser, ảnh UI 768 và modal mật khẩu đã che, storage assertions, mã hiện tại SettingsContent/organizationService/shared HTTP và backend organization/users liên quan. Graph trả symbol SettingsScreen nhưng nội dung chỉ mục còn mô tả adminService cũ; vì vậy đọc source thực tại đường dẫn manifest để đối chiếu bản cuối. Không diễn giải chỉ mục cũ thành hành vi đã triển khai.

Tự kiểm SHA256 bằng `Get-FileHash -Algorithm SHA256` đối với từng `path` trong sáu manifest: UI source73/runtime3, API source66/runtime64, contract12, tooling3, tổng221 mục; **0 thiếu/0 lệch**. Tự kiểm tương tự 500 mục trong artifact-manifest: **0 thiếu/0 lệch**. Hai API gzip được giải nén bằng Python `gzip.decompress`, đối chiếu SHA256 raw và gzip với compressed-logs.json: đều khớp. Đây là kiểm toàn vẹn, không phải chạy lại chức năng. `git diff --check` không có output lỗi. Không mở toàn bộ 500 ảnh/log theo từng file; đọc toàn bộ checksum và bằng chứng đại diện cho từng vế bên dưới.

Các manifest và raw artifact nằm ngay trong [run hiện tại](run.md); kết quả SHA hiện tại không thay thế lịch sử trước/sau thao tác hoặc kết quả runner.

## Lần thực thi được sử dụng

| Thực thi local | Lệnh, môi trường và thời gian | Kết quả gốc |
| --- | --- | --- |
| UI cuối | POS_UI: `npm test`, `npm run typecheck`, `npm run build`; Windows, Node22.22.2/npm10.9.7; 01/11 20:37:24.2092302–20:37:44.1077641+07 | Cả ba exit0; [UI TAP](ui-tests-final.log)28 top-level tests; [typecheck](typecheck-final.log), [build](build-final.log). Test names có trong TAP, gồm NAV, FORM, RACE, SCOPE, SECRET, MUTATION, HTTP, ERROR và auth/platform. Không dùng ui-tests.log27 làm bản cuối. |
| API đầu | POS_API: `npm test`; PostgreSQL17.9 Docker; 20:35:41.1455271–20:38:41.9720874+07 | Exit1, [api-tests.log.gz](api-tests.log.gz)47/48 TAP nodes; failure foundation DROP DATABASE cleanup57014, xem [context](db-timeout-context.log). |
| API chạy lại | POS_API: `npm test`; cùng source, sau browser kết thúc; 20:40:44.7453429–20:43:07.4939125+07 | Exit0; [api-tests-2.log.gz](api-tests-2.log.gz)48 nodes =13 top-level+35 nested,0 fail/skip/cancel. Danh sách suite có trong TAP: PB02 auth/config, PB01 foundation, PB04 acceptance/integration/migration/OpenAPI/pagination/examples và PB03 platform. |
| Browser bản cuối | POS_API: `node --env-file-if-exists=.env ../qa-evidence/20261101-203100-9ce75dd-pb13-final/browser-final.cjs`; Chrome156.0.8078.74/Playwright cache, DB QA riêng; 20:35:30.0885204–20:36:09.4601697+07 | Exit0; [stdout/stderr](browser-1.log), [result](browser-1/browser-result.json), [case timestamps](browser-1/browser-cases.jsonl), [network129 records](browser-1/browser-network.jsonl). Result sourceHash khớp SettingsScreen hiện tại. |

[commands.log](commands.log) và [environment.log](environment.log) giữ lệnh/start/end/exit/HEAD/dirty/môi trường. Run PB04 ngày30/10 giữ [commands và raw full-2](../20261030-202325-9ce75dd-pb04-gap-fix/run.md); API cuối ngày01/11 chạy lại toàn bộ các acceptance assertions này. Không chuyển lỗi cleanup đầu thành pass; chạy lại qua không xác minh được nguyên nhân sâu timeout. Không có thay assertion/timeout để làm xanh được thể hiện trong bằng chứng hiện tại.

## Ma trận từng vế nghiệm thu

Ký hiệu: **Đạt local** = expected/actual có dấu vết khớp; **Deferred** = ngoài phạm vi đã chốt; **Chưa xác minh** = không được suy rộng từ bằng chứng local.

| Tiêu chí/vế | Điều kiện, thao tác và expected | Actual / bằng chứng cụ thể | Đánh giá |
| --- | --- | --- | --- |
| AC1: OWNER quản lý chi nhánh cùng store | OWNER A tạo/sửa/ngưng chi nhánh; ID storeB không thể sửa; code bất biến | API cuối ACC-CRUD/VALIDATION/SCOPE có HTTP+DB; browser run30/10 B40/B41/B42/B42b before/after DB và network. Mã service ràng buộc store hiện hành; PATCH không nhận code/storeId. | Đạt local |
| AC1: tiền nguyên VND, BR-103 | Giá trị0/trần hợp lệ; âm/phân số/quá trần bị chặn API+DB; nullable không biến0 thành rỗng | API integration/acceptance/foundation trong gzip cuối; UI PB13-FORM và B40/B41/B50; branch.initial_cash bigint, money() kiểm safeinteger và0..1e12. | Đạt local |
| AC1: chính sách sửa quỹ đã chốt | Không tự dựng ca trong PB04; yêu cầu khóa lịch sử trước ca CASHIER đầu được giao PB06 | Spec organization phần quyết định chốt; service có khóa Branch và chú thích nghĩa vụ PB06. Sprint loại mở ca; chưa có bảng/API ca nên không tuyên bố đã thử sửa sau ca. | Chính sách đạt; thực thi sau ca Deferred PB06 |
| AC2: bàn đúng store/branch, ID ngoài phạm vi | OWNER chọn branch cùng store; MANAGER chỉ current branch; ID A2/B sai phạm vi bị từ chối và DB không đổi | API ACC-SCOPE/AUTH, DENIAL_DB đủ endpoint; browser B43/B44/B44b/B44c before/after DB; N03/N04 current branch; PB13-SCOPE omits branchId của restricted actor. | Đạt local |
| AC2: BR-99 | Cấu hình bàn không có nguồn occupied/status riêng thay đơn OPEN | Entity/DTO/service/view hiện tại không có occupied/status; response bàn ở raw API chỉ field cấu hình. Không dùng demo sơ đồ bàn để chứng minh đơn hàng. | Đạt local; luồng OPEN tương lai Deferred |
| AC3: cấp MANAGER/CASHIER, branch cùng store, username | OWNER cấp hai vai trò hợp lệ; username trim/lower và global unique; branchB bị từ chối | API integration+ACC-CRUD/VALIDATION/SCOPE; browser B45 create before/after DB, B46 role; UsersService dùng transaction và bcrypt12, branch scope. | Đạt local |
| AC3: force-change và hash | User mới/reset phải đổi password; old/new login đúng; không lưu rawpassword | API ACC-RESET-01 CREDENTIAL_DB: hashMatchesNew=true, hashMatchesOld=false, bcryptCost12, rawCredentialPresent=false; HTTP force-change và session assertions; browser B45/B47, N02/N03. | Đạt local |
| AC3: mật khẩu tạm một lần, không storage/log | Handoff có ack trước đóng; không URL/storage/log; logout/identity clear | B45-final-secret-protected.png đã mở: secret che, nút đóng disabled trước ack; B45-storage.json leaked=false/urlLeaked=false; B45-secret-cleared/reload snapshots; API APPLICATION_LOG chỉ metadata, ACC-LOG commit/rollback; UI SECRET/self-reset tests. N02 lặp handoff bản cuối. | Đạt local |
| AC4: permission/danh tính hiện hành | Đổi quyền/branch trong cùng session phải áp dụng hiện tại; không dùng JWT cũ làm nguồn quyền | API ACC-AUTH/SCOPE và DENIAL_DB; N04-current-branch-db.json + snapshots A1→A2; N05-permissions-db.json + snapshot sau khi bỏ quyền chỉ còn tab Bàn và không còn form cũ. DB reassign/grant là fixture QA, không phải tính năng UI chuyển branch. | Đạt local |
| AC4: cross-store/branch/platform | Tenants A1/A2/B và platform kể cả misgrant không vượt operational context | Raw HTTP ACC-SCOPE/AUTH và DB trước/sau denial; N10-platform snapshot/network, test NAV và PB03 regression. | Đạt local |
| AC4: disabled/suspended/force-change | Mọi thao tác tổ chức theo hợp đồng bị chặn, DB không đổi; unlock/reactivate không hồi sinh cookie | API ACC-AUTH 10 operations + DENIAL_DB; B48 lock/resetlocked/unlock; N10 suspend/reactivate network + DB; final-db.json xác nhận store đã activate lại, business data giữ. | Đạt local |
| AC5: UI đọc/ghi API, reloadDB | Thực hiện đủ10 operations, có request/response và DB trước/sau, reload còn dữ liệu | B40..B49 final replay network/browser-cases và các *before-db.json/*db.json, B45-final-reload; N02/N03 và API cuối xác nhận runtime. Không dùng B00..B31 trước sửa rowsKey làm chứng cứ UI cuối. | Đạt local |
| AC5: loading/error/Vietnamese | Pending không gửi lặp; offline/error có retry, lỗi field/conflict giữ form | UI28 PB13-MUTATION/ERROR/HTTP; N07 held skeleton, N08 offline/list-error/retry snapshots+network. Ảnh final768 tiếng Việt, documentWidth=viewport768, controls48/primary56; N12 keyboard. | Đạt local |
| AC5: auth/platform không regression | Cookie/CSRF/refresh/revoked và platform cũ vẫn đúng | UI auth+PB03 tests, API PB02/PB03; N09 cookie metadata/network cho riêng ca expiredaccess có1refresh thành công+GETretry; N10 oldcookie sau reactivate vẫn bị từ chối. Không nói toàn bộ129network chỉ có1refresh. | Đạt local |
| AC6: late tab/branch/page và mutation | Giữ response cũ, đổi scope/page/tab, nhả response; không ghi đè rows/meta/error/loading/cursor hoặc gửi form cũ sang tenant mới | UI TAP PB13-RACE tab success/failure, active-tab, branch/status/role/page, rows/columns, unmountedmutation; HTTP no replay under another store; current code generation+rowsKey+identity/epoch. Browser N07 actualSQL A1 held→A2 completed→releaseA1, snapshots/network A2 giữ; B32 real oldPOST401 sau logoutA/loginB không retry sang B. | Đạt local |

Artifact B* nằm tại [run30/10 PB13](../20261030-214100-9ce75dd-pb13-organization-ui/run.md), đặc biệt các file `B40-final-branch-create-before-db.json`/`B40-final-branch-create-db.json` đến B48c và B49-self-reset-db.json; network gốc ở `browser-network.jsonl`. API marker nêu trên nằm trong gzip cuối, kèm case ID/method/path/status/requestId đã che. Chúng không phải response tự viết lại trong báo cáo này.

Các ảnh/mutation B40..51 thuộc replay sau sửa rowsKey. Sau đó chỉ chỉnh kích thước nút dùng chung; N11/N12 kiểm UI cuối về kích thước/focus, N02/N03 lặp handoff. Mã runtime hiện khớp manifest cuối. Không gọi ảnh UI cũ là ảnh bản cuối hoặc dùng audit trước để bỏ qua thay đổi bản cuối.

## Blocker, giới hạn và quyết định

**Blocker nghiệm thu local phát hiện mới: không có.** Sáu tiêu chí có proof theo từng vế trong phạm vi đã chốt; DoR có spec approved, DoD có nhánh riêng, kiểm thử đúng scope/quyền/tenant, artifact, review trước merge và tài liệu cập nhật. [Review cuối](review.md) không còn finding, task/plan completed chỉ phản ánh triển khai kỹ thuật. Sprint vẫn để trống các ô chờ PO, đúng quy trình.

Các điểm không phải blocker cho lần PO nghiệm thu local này:

- Mã dirty/chưa commit riêng và chưa CI mới. DoD thực không yêu cầu commit/CI trước PO local acceptance; phải tiếp tục nhận diện bằng manifest. Khi source thay đổi, không tự áp kết quả này sang phiên bản mới; review/test tương ứng trước tích hợp.
- Lần API cleanup DROP DATABASE57014 đã được giữ trong raw log và [error record](../../errors/2026-11-01-pb13-api-qa-cleanup-timeout.md). Rerun toàn bộ qua nhưng nguyên nhân sâu còn chưa xác minh; đây là rủi ro độ ổn định môi trường QA cần theo dõi, không bằng chứng lỗi nghiệp vụ đang tái hiện.
- Khóa sửa quỹ sau ca đầu deferred PB06 theo quyết định rõ trong spec; phải hoàn tất dưới cùng khóa Branch trước khi bật mở ca. Không coi deferred này là đã kiểm thử.
- Đơn hàng/thanh toán/trừ kho/đối soát và các màn demo ngoài tổ chức, production/HTTPS triển khai thực, tải thực tế và browser CI: **chưa xác minh trong lượt nghiệm thu này**, ngoài Sprint3. Không suy từ config tổ chức thành POS vận hành đã sẵn sàng.

Đề nghị Product Owner review/accept PB04 và PB13 tổ chức tại local theo matrix trên. Chưa tick Sprint, commit, merge hoặc push. Tái chạy tại môi trường PostgreSQL QA theo README: POS_API `npm test`; POS_UI `npm test`, `npm run typecheck`, `npm run build`; browser wrapper dùng lệnh ở bảng, cần khôi phục helper API/Vite và dữ liệu QA theo run thay vì chạy trên DB ứng dụng. Bằng chứng hiện tại là local, chưa có URL/ID CI độc lập cho working tree này.
