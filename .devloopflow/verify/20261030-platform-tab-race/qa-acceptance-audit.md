# QA nghiệm thu PB-03/PB-13 sau sửa race cursor

**Trạng thái:** đã đối chiếu bổ sung cuối; đủ bằng chứng để Product Owner xem xét nghiệm thu PB-03/PB-13 trong phạm vi local đã chốt30/10. Không còn khoảng trống đã báo trong lượt QA này.

- Nhánh feat/pb03-platform, HEAD nền 53d794b7bfc405f8d77b0f19e7571d3698c7ea98; working tree dirty.
- Hình thức: QA đọc source/artifact local; runner UI riêng được ghi output dưới đây. Không phải CI độc lập.
- Phạm vi: spec platform chốt30/10, Sprint2 và thay đổi screen sau fix race. Không sửa source/test/config, không ghi DB.

## Matrix trước runner QA

| ID | Điều kiện/thao tác | Expected | Artifact cần đối chiếu |
| --- | --- | --- | --- |
| A1 | Source API không đổi sau API verified; đối chiếu test PostgreSQL | transaction/ID/context/khóa/reset/cursor đúng hợp đồng | api-verified.log + assertions + DB/log rework |
| A2 | Mutation chờ, chuyển Owners, mutation cũ xong rồi Trang sau | gửi OWNER cursor, không cursor Store | red-reproduced.log, UI regression test và runner QA mới |
| A3 | Browser sau screen thay đổi reload/effect | mutation reload đúng dữ liệu, tab/sidebar/cursor đúng | browser cuối, network/status và snapshot trước/sau |
| A4 | Bộ chọn store tải trang sau, chọn đúng store và cấp OWNER | POST storeId đúng ID chọn ngoài trang đầu, DB đúng store | browser select/POST response + DB trước/sau |
| A5 | Password modal, lỗi reload, retry sau mutation | password không mất/lộ, reload lỗi không báo mutation thất bại | browser/test cuối tương ứng |
| A6 | UI suite trên source hiện tại | các test gồm race đạt | qa-ui-tests.log + START/END/exit, source fingerprint |

## Runner QA

Sẽ chạy lệnh cấu hình sẵn `npm test --prefix POS_UI`, ghi stdout/stderr nguyên gốc UTF-8 cùng START/END/exit vào qa-ui-tests.log. Chỉ kiểm thử trong bộ nhớ, không backend/DB/browser. Fingerprint source/test ghi qa-source-hashes.txt.

Đã chạy: `npm test --prefix POS_UI`, START 2026-10-30T02:59:05.6954703Z, END 2026-10-30T02:59:06.6061366Z, exit0, 10/10. Output runner `qa-ui-tests.log` đọc UTF-8 không NUL, có danh sách test và regression race. Đây là QA tự chạy local bằng runner sẵn có; không phải CI, không gọi backend/DB. `qa-source-hashes.txt` ghi SHA256 của source screen, race test và hai file backend đã đối chiếu.

## Đối chiếu source và artifact hiện có

- Source screen sửa cuối 02:51:34 UTC; effect dòng53–65 dùng active cleanup, phụ thuộc activeTab/cursor/reloadVersion; reload dòng51 chỉ trigger version; mutation dòng95–97 không còn tự ghi state danh sách. Không thấy lỗi rõ trong fix đã rà.
- `red-reproduced.log` tái hiện đúng STORE_RELOAD_CURSOR thay OWNER_NEXT_CURSOR; `ui-tests.log` và QA runner mới cùng đạt10/10. Test thực thi TSX nhưng React hooks/service được kiểm soát; không chứng minh lifecycle browser hay API thật.
- Backend không đổi trong fix race. `../20261030-0158-53d794b-pb03-rework/api-verified.log` START02:10:53.6529156Z→END02:11:11.2097516Z EXIT0, 7/7; source assertions có transaction rollback/duplicate đồng thời, ID/role validation, gán nhầm quyền cho OWNER/MANAGER/CASHIER và admin, hai phiên thu hồi, reset/password hash, keyset timestamp trùng microsecond và chèn store giữa trang. Bằng chứng backend tiếp tục dùng được trong phạm vi local, chưa CI.
- Đã mở các output browser create/cấp/reset/khóa/mở, page2, picker, modal/storage, console; file tồn tại, UTF-8 đọc được, không NUL. Đã mở hai ảnh tablet/password; viewport1024×768 đọc được, mask paragraph che kín password.
- DB before create0→store ACTIVE, username đúng/flagtrue; ACTIVE|2|0→SUSPENDED|2|0→ACTIVE|2|0 khớp run. Thu hồi nhiều phiên được chứng minh trong integration trên DB thử, không suy từ các file DB browser0 session.
- Log backend có store.create/owner.create/owner.reset_password/store.suspend/store.reactivate với actor/target/requestId; không thấy raw secret trong action lines.

## Khoảng trống sơ bộ cần đối chiếu sau bổ sung

| ID | Mức/loại | Expected | Artifact hiện có và khoảng trống | Bước bổ sung |
| --- | --- | --- | --- | --- |
| QA-AF-01 | P2 chứng cứ UI cuối | Theo AGENTS, hành vi UI thay đổi phải có browser/network/ảnh/snapshot đúng phiên bản cuối | Tất cả browser rework thu02:04–02:15, trước screen đổi02:51:34. Chỉ regression harness/build sau fix; chưa chứng minh trên browser thật mutation→reload/tab/sidebar/cursor và reload lỗi/retry/modal | B1–B5 agent chính đang chạy trên UI dựng mới; lưu network và trước/sau |
| QA-AF-02 | Chứng cứ theo spec chọn store | UI chọn đúng store ngoài trang đầu, POST target và DB cùng store | browser-paging-final chỉ GET cursor, options20→22; script không selectOption, browser-add-reset POST target mặc định store mới ở trang đầu. Tải thêm options chưa chứng minh chọn/gửi đúng store trang sau | Chọn option ở ngoài20 mục đầu, cấp OWNER, đối chiếu POST storeId/response và DB trước/sau |

Hai mục trên là thiếu bằng chứng; chưa kết luận có bug sản phẩm mới. Agent chính đang bổ sung, QA sẽ mở artifact mới và cập nhật kết luận.

## Tiêu chí Sprint2 → bằng chứng → đánh giá sơ bộ

| Tiêu chí | Case/artifact | Đánh giá hiện tại |
| --- | --- | --- |
| PB03 tạo/cấp OWNER, password một lần, buộc đổi | API verified/assertions + browser-password/add-reset + DB create | Backend đủ local; cần bổ sung UI cuối và chọn store trang sau |
| PB03 quyền/context, không tenant vận hành | API verified/auth assertions + source AuthService/guard | Đủ local theo phạm vi PO chốt; API vận hành thật hoãn rõ |
| PB03 khóa/mở, thu hồi phiên, giữ dữ liệu/login mới | API verified + browser suspend/reactivate + DB trạng thái | Backend đủ local; refresh hiển thị sau mutation cần UI cuối |
| PB03 ID/lỗi/lặp/BR86 | API verified + API action log | Đủ local theo các endpoint PB03 |
| PB13 đọc/ghi thật, trạng thái cuối/reload | Browser rework cũ + race red/green | Chờ B1–B5 trên screen sau fix |
| PB13 password/storage/lỗi/quyền tiếng Việt | Browser password/storage cũ + UI service tests | Chờ UI cuối và lỗi reload/retry |
| PB13 các màn còn mock ghi demo | Ảnh tablet cũ + AppShell/source không đổi | Đã thấy nhãn demo, cần ảnh UI cuối để liên kết phiên bản mới |

Không sửa source/test/config và không tick. Chưa chạy browser hoặc API/DB trong lượt QA này. Chưa kết luận đủ nghiệm thu toàn bộ trước khi đối chiếu B1–B5.

## Đối chiếu bổ sung B1–B5 và A5 — kết luận cuối

Đã mở lại từng artifact bổ sung, ảnh và log sau khi agent chính chạy browser trên mã sau fix:

- B1: compose-ui-retest.log START02:59:20.8489314Z→END02:59:32.5139924Z EXIT0. ui-source-hash.txt và ui-container-hash.txt cùng SHA256 `75ef00dd3fd5e6c0704c7290a88c0e237665e9f43ead44f97a6a629edbbb9117`; QA đọc lại hash file screen hiện hành và khớp. UI/container được kiểm tra đúng source sau fix.
- B2: browser-real-api-race.txt ghi browser trước/sau ở1024×768, khóa/mở qua API thật. Script dùng route.fetch thực hiện POST reactivate trên backend; chỉ trì hoãn delivery nguyên response đến khi Owners đã render, không mock body/status. Sau thả, Owners reload200, GET users cursor trang2 trả200; `correctCursor=true`, `renderMatches=true`. Ảnh browser-race-after.png đúng tab Owners và dữ liệu response. DB trước/sau cùng target store ACTIVE|2, network ở giữa ghi SUSPENDED→ACTIVE; không suy ra session revoke từ DB này.
- B3: browser-owner-page2.txt có firstOptions20; target669d5244-2278-46aa-aeca-5357b42d9717 không nằm trong20 ID đầu. GET cursor200 tải target, script selectOption target, POST users201 có request.storeId và response.owner.storeId trùng target. db-before-owner-page2.txt=0; db-after-owner-page2.txt có username qa_postfix_owner_0302 đúng target store, must_change_password=true. Danh sách Owner sau mutation chứa user mới.
- B4: cùng browser-owner-page2.txt chứng minh X/Đóng disabled, Escape giữ modal; checkbox cho đóng; storage inUrl/inLocal/inSession đều false; secretAfterReload=false. Đã mở browser-owner-page2-masked.png: mask toàn paragraph che kín password. Ảnh/runtime đúng source sau fix, có nhãn demo và UI tiếng Việt.
- A5: browser-reload-error-retry.txt ghi POST reset thật200, chỉ **một GET list503 được mô phỏng có nhãn rõ**. passwordRetained=true, modal còn trong khi lỗi danh sách hiện riêng; after checkbox/close, Thử lại GET thật200 và render đúng dữ liệu. Đã mở ảnh browser-retry-password-masked.png, password che kín và thấy lỗi danh sách phía sau. DB trước/sau đúng user ID, flagtrue và updated_at đổi sau reset. Không gọi503 mô phỏng là lỗi backend đã tái hiện; browser-retry-console.txt chỉ có503 dự kiến.
- Đã đọc api-browser-retest.log có action/requestId của lượt API thật và browser-retest-console.txt=0error trước case503; không thấy secret trong dòng action. Các file bổ sung đều tồn tại, đọc được và khớp run.md.

### Trạng thái findings sau bổ sung

| ID | Kết quả |
| --- | --- |
| QA-AF-01 UI cuối sau fix | Đóng: B1/B2/B4 và A5 có artifact đúng hash source/runtime, network/UI/ảnh và giới hạn mô phỏng rõ ràng |
| QA-AF-02 chọn đúng store trang sau | Đóng: B3 có selectOption, request/response201 và DB trước/sau đúng target ngoài20 đầu |
| A5 reload lỗi/retry/password | Đóng: mutation200 thật, GET503 mô phỏng minh bạch, password giữ, retry200 thật; không có dấu hiệu báo mutation thất bại |

### Tiêu chí → artifact → kết luận cuối

| Tiêu chí nghiệm thu | Bằng chứng đối chiếu | Kết luận trong phạm vi đã chốt |
| --- | --- | --- |
| PB03 tạo/cấp OWNER, password một lần, buộc đổi | Backend api-verified/assertions; browser create và DB rework; B3/B4 POST201/DB target/storage/modal cuối; auth tests mustChangePassword/PASSWORD_CHANGE_REQUIRED/change-password; bổ trợ browser-final-owner-forced-change.yml và browser-final-owner-after-change.yml trong ../20261029-202132-53d794b đã mở lại, thuộc auth UI không đổi bởi fix race | Đủ dấu vết local |
| PB03 permission/context và không tenant vận hành | Backend api-verified và auth/context assertions, gán nhầm quyền all roles; source hiện hành không đổi backend sau fix | Đủ local; HTTP API vận hành thật hoãn theo PO, không tuyên bố đã kiểm tra |
| PB03 khóa/mở/thu hồi phiên/giữ dữ liệu/login mới | Integration PostgreSQL có hai session/login/revoke/reset; browser B2 API thật và DB trạng thái; DB/log rework | Đủ local; browser B2 không chứng minh live OWNER session, phần đó dùng integration |
| PB03 ID/lỗi/lặp/BR86 | Backend assertions ID/role/field validation, concurrent duplicate/rollback, action logs cũ và mới | Đủ dấu vết local |
| PB13 API thật/trạng thái cuối/reload | Rework browser create/cấp/reset/khóa/mở; B2/A5 kiểm tra luồng refresh sau mutation trên UI sau fix, B3 Owner mới render | Đủ dấu vết local |
| PB13 password/storage/lỗi/quyền tiếng Việt | B4 và A5 modal/storage/network/ảnh; UI runner10/10 và API permissions/auth; browser text tiếng Việt | Đủ dấu vết local |
| PB13 màn còn mock ghi demo | Source AppShell không đổi, ảnh browser-race-after và browser-owner-page2-masked có nhãn demo trên UI cuối | Đủ dấu vết local |

**Kết luận:** có đủ chứng cứ local để Product Owner xem xét nghiệm thu theo phạm vi mới đã chốt; QA không phát hiện lỗi hành vi mới qua source/artifact và runner UI đã kiểm tra. Không tick thay Product Owner.

QA tự chạy `npm test --prefix POS_UI` local10/10 và giữ output gốc; phần browser/API/DB bổ sung do agent chính chạy, QA mở lại source/output/ảnh để đối chiếu, không tự nhận đã chạy các bước đó. Chưa có CI/runner độc lập trên commit PB-03, working tree còn dirty. Các API vận hành hoãn theo PO vẫn là giới hạn có chủ ý của phạm vi, không phải bằng chứng đã kiểm tra.
