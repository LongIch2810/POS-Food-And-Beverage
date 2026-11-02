# QA đối chiếu PB-13 tổ chức

**Trạng thái:** bản nháp đối chứng; chờ root báo READY cho browser bản cuối, log/build cuối và manifests. Chưa dùng báo cáo này để đóng task hoặc tick nghiệm thu.

QA chỉ đọc source/test/spec và bằng chứng do agent chính thực thi; không sửa implementation/test/config và không chạy thêm bộ test độc lập. Đây là **đối chiếu bằng chứng local**, không phải CI hoặc runner QA độc lập. Đã đọc AGENTS.md, PRODUCT_OVERVIEW, BUSINESS_RULES liên quan, rules/testing.md, plan và spec UI/API đã chốt. Graph không có Settings symbols nên tra source hiện hành trực tiếp.

## Căn cứ phiên bản

- Nhánh `feat/pb13-organization-ui`, HEAD/base `9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18`; working tree dirty, có PB-04 từ task trước; chưa có commit PB-13 riêng.
- `commands.log` và stdout gốc UTF-16LE đã mở: ui-tests-8.log 27 top-level TAP nodes pass; typecheck-4/build-2 exit0; api-tests-1.log 48 TAP nodes (13 top-level và35 nested), exit0. Số node không thay bằng số tiêu chí nghiệm thu.
- Browser B00..31 là lịch sử trước lỗi old-row/new-column được sửa. B32 và B40+ là lượt trên source có rowsKey guard. Các artifact cũ chỉ hỗ trợ chẩn đoán/hồi quy, không thay final-version evidence.
- DB QA riêng `pos_pb13_browser_31b5333d5cbf`, API3303, Vite5175, companion3304. Companion chỉ transport artifact/fixture và đọc DB bằng readonly connection; không phải endpoint production. Seed105 chi nhánh và custom MANAGER user.manage là fixture trực tiếp trong DB QA, không phải tính năng API hoặc thay đổi quyền mặc định.

## Ma trận dự kiến chốt

| ID | Điều kiện / expected | Assertion/artifact đã đọc | Trạng thái hiện tại |
| --- | --- | --- | --- |
| C01 | OWNER vào Cài đặt,3tab đúng quyền; header không trộn branch/shift demo | PB13-NAV; B32 screenshot OWNER B và3tab; B03 lịch sử empty/header | Chờ final flow/manifest |
| C02 | Branch create/edit giữ case/code,nullable phone/address,quỹ nguyên0..1e12 | PB13-FORM; B40/B41 DB before-after + network; B04/B05 lịch sử biên tiền | Chờ đối chiếu final đầy đủ |
| C03 | Branch ngưng/mở lại, dữ liệu giữ nguyên | B42/B42b snapshots/DB và PATCH thực | Chờ final manifest |
| C04 | Table create/edit đúng branch; area/capacity optional/null; không mock occupancy | PB13-SCOPE; B43/B44 DB/HTTP; B10/B11 lịch sử capacitymax | Chờ final manifest |
| C05 | Table ngưng/mở lại, không delete/move branch | B44b/B44c DB/snapshots, payload service | Chờ final manifest |
| C06 | Staff tạoMANAGER/CASHIER,branch bắt buộc; không profile edit/OWNER targets | PB13-HTTP/SCOPE, source forms; B45 create+DB; B13/B14 lịch sử vai trò | Chờ final staff lifecycle |
| C07 | Đổi vai trò/khóa/reset thu hồi phiên; unlock không phục hồi; reset locked giữ khóa | B18/B20..23 DB,80+401 raw auth; chưa dùng lịch sử này thay final | Chờ final replay |
| C08 | Password chỉ once,ack mới đóng,copy/manual,không storage/URL/toast/log,clear khi đóng | PB13-SECRET3cases; B45 snapshot protected/cleared +storage; B18 lịch sửmanualcopy | Chờ final verify |
| C09 | Self-reset customgrant không tựGET list làm mấtpassword;ack rồi login | PB13-SECRET self-reset; B29 DB active0,list reads không tăng; source specialreturn | Chờ final browser hoặc giới hạn rõ |
| C10 |401 restore một lần,CSRF/same-origin; không replay mutation mạngkhôngrõ/crossidentity | PB13-HTTP4cases; B32 actualheldoldcookie401, khôngbranch XS,DBbranches equal | Đã có final runtime; chờ hashes |
| C11 | Quyền hiện hành/branch/session thay đổi bỏdata/form/password cũ | PB13-IDENTITY +keysource; B32 siblinglogout/loginA→B clearform | Chờ currentpermission/branch final |
| C12 | MANAGER chỉ Bàn của branchmình; CASHIER/platform không cóorgdata | PB13-SCOPE/NAV; B15/B16/B17/B30 lịch sử | Chờ final role views |
| C13 | Pagination20/cursorprevnext/total, filterstatus/branch/role,choices>100 | B24 codes105 qua6pages exactset, B25 tables26, B25b staff25,choices105 | Chờ final replay/metadata |
| C14 | Response cũ không đổirows/error/loading/meta/cursor mới | PB13-RACE tab/branch/status/role/page; B26 realresponsehold lịch sử; B32final identityrace | Chờ final readrace |
| C15 | Active-tab click không kẹtloading; đổitab không renderrows sai loại | ui-tests-2/7 red; ui-tests-8 green chạyrealcolumncallbacks; B45-final-reload | Chờ final browser checks |
| C16 | Pending chặn submit/close; server422mapfield,409giữform,404reload,503lỗi đúng | PB13-MUTATION,HTTPdetails; B08 lịch sử409; source errorhandlers | Chờ final relevantcase/limits |
| C17 | Loading/empty/error/retry/offline không ghi dữ liệu | B26/B27/B28 lịch sử; source+deferredtest | Chờ final replay |
| C18 | Layout1024/768,targets48/main56,keyboard trap/returnfocus,khôngpageoverflow | Đã mở B32 PNG1024; chỉ có1024 snapshots tại lúc lậpdraft | Chờ768/keyboard/computedmeasurements |
| C19 | Auth/platform regression và backendPB04 không đổi hợp đồng | ui-tests8 auth/platform testnames +APItests1 actual48nodes; sourceextracthelper | Chờ final exactversion binding |
| C20 | Không tuyên bố khóaquỹsauca/PB06,POS/mock,production hoặc CI | Plan/spec/run giới hạn rõ; chưa tick Sprint3 | Giữ giới hạn |

## Kiểm tra đã đối chứng trực tiếp

- Đã parse raw browser-network JSONL, quan sát đủ10 method/path tổ chức. Trường string có tên password/token/cookie/csrf/secret đều REDACTED tại lần rà; không đưa credential/private fixture vào báo cáo.
- B32-session-race.json: oldStatus401, một POST cũ sau release, không codeXS; branches/tables/users trước=sau, sessions đổi theo logout/login. Không diễn giải session change là mutation cũ ghi dữ liệu.
- B18-reset-active-db.json lịch sử: manager active sessions2→0 và must_change_password=true. B22 resetlocked không đổi lockedstate; B29 selfreset active0 vàlistReadCountUnchanged=true.
- B24 actualCodes vàexpectedCodes cùng105,6pages,endcursor; B25 count26/branchChoices105; B25b25usernames exactset. Seed trực tiếp đã được ghi nhãn, không dùng seed làm bằng chứng thao tácUI.

Chưa có kết luận hoàn tất cho đến khi mở lại final artifacts, đối chiếu source/runtime/contract hashes và cập nhật từng hàng bên trên. Không chạy thêm test hoặc khẳng định độc lập rằng CI đã chạy.
