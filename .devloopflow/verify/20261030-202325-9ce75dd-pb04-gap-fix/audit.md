# QA đối chứng bản sửa PB-04

**Trạng thái:** hoàn tất đối chứng bản cuối; đóng AUD-01..05 trong phạm vi sửa API/DB đã thống nhất. Đây là rà soát bằng chứng local do agent chính chạy; không phải CI hoặc một lần chạy test độc lập của QA.

QA chỉ đọc source, test, spec và artifact, không sửa implementation/test/config. Đã đọc AGENTS.md, PRODUCT_OVERVIEW, BUSINESS_RULES liên quan và rules/testing.md; graph không trả test acceptance mới nên đọc file trực tiếp. Báo cáo này tiếp nối từng ID của [audit trước](../20261030-200921-9ce75dd-pb04-evidence-audit/audit.md), không thay đổi raw log cũ hoặc nghiệm thu thay Product Owner.

## Phiên bản và phương pháp

- HEAD/base thực đọc: `9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18`, nhánh `feat/pb04-organization-api`, working tree dirty; PB-04 chưa có commit riêng.
- Lệnh đã chạy bởi agent chính: `npm test` tại POS_API, gồm build và Node test runner. commands.log ghi bắt đầu `2026-10-30T21:23:58.0263934+07:00`, kết thúc `21:25:11.8251211+07:00`, exit0. QA đã mở raw full-2.log UTF-16LE và đối chiếu assertion nguồn, không suy ra thực thi từ run.md.
- Full runner ghi 48 pass,0 fail,0 skipped: **13 top-level +35 nested nodes**. Parent chứa nhiều tình huống dùng chung fixture có thứ tự, không phải48 kịch bản độc lập. Chỉ các assertion thực có mới hỗ trợ các kết luận dưới đây.
- `F:L` dưới đây là dòng L trong stdout gốc `full-2.log` (hoặc giải nén `full-2.log.gz`, giữ nguyên bytes/dòng). `A` = POS_API/src/organization/tests/organization.acceptance.test.ts; `I` = organization.integration.test.ts; `M` = organization.migration.test.ts; `O` = organization.openapi.test.ts; `P` = organization.pagination.test.ts; `D` = organization.spec-examples.test.ts cùng thư mục.
- Case đủ tên/HTTP method,path,requestId,status,response và snapshot DB safe có trong F. Mutation tự thu DB trước/sau bằng truy vấn readonly; GET denial có DENIAL_DB. Không lưu password/token/hash thực; metadata cookie không có giá trị. QA đã parse lại raw JSON:20 SQL_PAGE_RESULT exact ID order/set/endcursor;14 PG_LOCK_ORDER có waiter2 bị waiter1 chặn;3 rollback và3 commit barriers khớp before/after. Đã kiểm không có bcrypt/JWT values và password fields trong HTTP là REDACTED_SECRET.
- Raw có238 failed mutation responses của acceptance:231 before=after,7 khác nhau thuộc5 auth races và2 duplicate-create races đang có transaction khác chạy cùng lúc. Không dùng snapshot toàn DB quanh request cạnh tranh để tuyên bố riêng request bị từ chối đã ghi dữ liệu; race assertions kiểm final user/session/count. Các denial tuần tự dùng `denied()` kiểm toàn business rows/sessions không đổi.

## Kết luận theo finding gốc

| Finding | Đối chứng bản sửa | Kết luận nội dung |
| --- | --- | --- |
| AUD-01 | ACC-SCOPE-01, AUTH-01..03, F (xem case trong chỉ mục); cùng store A1/A2 và B, exact IDs, deny/misgrant, current branch/permission và10 operations user/store blocked | Có bằng chứng runtime cho phần API/DB đã yêu cầu bổ sung. |
| AUD-02 | ACC-RESET-01..02 F (xem case trong chỉ mục); LOG-02 F (xem case trong chỉ mục);12 ACC-RACE F (xem case trong chỉ mục) PG lock metadata; cả2 lịch reset/role/disable với login/refresh | Có bằng chứng multisession, credential replacement/rollback và những lịch đã ép. Không khẳng định mọi lịch đồng thời có thể xảy ra. |
| AUD-03 | ACC-PAGE F (xem case trong chỉ mục); PG fixture cùng millisecond `.123001/.123002/.123003`, nhiều ties;20 full traversals; query counts5→5 cho1→18/19/36 rows | Đã thay bằng SQL integration thật, không chỉ decoder unit hoặc2 trang. |
| AUD-04 | Public DTO/no-secret assertions mọi response acceptance; HTTP+DB; LOG-01 barriers F (xem case trong chỉ mục) và app logs F (xem case trong chỉ mục); rollback F (xem case trong chỉ mục)/app logs F (xem case trong chỉ mục) | Có app logger thật và boundary commit/rollback, không dùng logger:false làm bằng chứng log. |
| AUD-05 | Spec endpoint-specific errors, PATCH store-only,10 ví dụ request/response; DOC-02 F (xem case trong chỉ mục); DOC-01/OpenAPI F (xem case trong chỉ mục); đính chính lịch sử run/review cũ | Đã sửa; QA mở lại spec cuối, POST không còn câu copy PATCH. |

Lượt acceptance-3 thực sự tái hiện một bug: `ACC-RACE ... role versus login, mutation obtains user lock first`, expected200/actual401 (raw dòng76–90). Bản sửa khóa identity trước rồi đọc role/store trong statement sau. acceptance-4 và full-2 đã qua chính assertion200/MANAGER, phiên cũ bị thu hồi và chỉ phiên login mới sống. QA không coi lỗi envelope/query-truncation của harness acceptance-2 là bug sản phẩm. Không thấy runtime finding mới cần sửa từ đối chứng này.

## Tiêu chí Sprint3, từng vế

| ID | Expected → actual/assertion/artifact | Phán định |
| --- | --- | --- |
| AC1a | OWNER tạo branch store mình/trim → I ORG-01 pass F (xem case trong chỉ mục) A scope exact IDs F (xem case trong chỉ mục) | Đủ local cho API. |
| AC1b | Quỹ nguyên0..1e12/no coercion/default → A makeBranch/CRUD/VALIDATION F (xem case trong chỉ mục); I ORG-01 DB cap string F (xem case trong chỉ mục) | Đủ các biên; DB bigint theo migration/entity và PG output, không claim UI. |
| AC1c | Chỉ trước ca đầu → plan/spec hoãn lịch sử ca và cùng Branch lock sang PB-06 | Deferred đã duyệt, chưa xác minh sau ca. |
| AC2a | Bàn đúng store/branch, DB ghi thật → SCOPE/CRUD/VALIDATION HTTP+snapshots F (xem case trong chỉ mục) | Đủ local. |
| AC2b | Không status/occupied → I schema diagnostic F (xem case trong chỉ mục); exact keys A publicEntity mọi table response | Đủ schema + DTO đã chạy. |
| AC2c | Không suy đơn thật từ mock → không UI/ca/đơn trong scope | Không claim luồng đơn tương lai. |
| AC3a | Cấp MANAGER/CASHIER branch đúng scope → SETUP/SCOPE F (xem case trong chỉ mục); wrong scope404/role403/422 và DB unchanged | Đủ local. |
| AC3b | Username trim/lower/global unique → I USR-01 + A CRUD cross-store/platform409 F (xem case trong chỉ mục) count1 assertion | Đủ local. |
| AC3c | Bắt đổi password → OWNER10 operations F (xem case trong chỉ mục); reset staff10 F (xem case trong chỉ mục); change-first-password204/oldcookie401 | Đủ API; UI dialog deferred. |
| AC3d | Chỉ hash → I USR-01 hash boolean; A CREDENTIAL_DB F (xem case trong chỉ mục) bcrypt12/new true/old false/no raw | Đủ fixture credential, không chứng minh bằng plaintext/hash dump. |
| AC3e | Password chỉ response cấp/reset/log safe → A list exact keys + CREDENTIAL_DB +792 APPLICATION_LOG secret assertions | Đủ API/log; browser storage/UI chưa làm. |
| AC4a | Quyền/context hiện hành → AUTH-02 all10 denial routes/misgranted platform F (xem case trong chỉ mục) | Đủ local. |
| AC4b | Store/branch isolation → SCOPE A1/A2/B exact list/denied PATCH/reset/create F (xem case trong chỉ mục) | Đủ fixtures phân biệt ranh giới. |
| AC4c | User/store blocked on real org routes → AUTH-03 F (xem case trong chỉ mục) actual suspend/revoke/reactivate + retained rows | Đủ local. |
| AC4d | Must-change gate → AUTH-01/RESET-01 10operations, exact403 code + unchanged DB | Đủ local. |
| AC5a | UI API/reload/loading/error/Vietnamese → không browser run | Deferred PB-13, chưa xác minh. |
| AC5b | Auth/platform regressions → F (xem case trong chỉ mục) và1998/2004; read connected assertions | Các regression hiện có pass; không suy toàn app không thể regression. |
| AC6 | UI stale response khi tab/branch/page → chưa có UI tổ chức | Deferred PB-13, chưa xác minh. |

## Endpoint/clause theo ID audit trước

Các hàng “đủ” dưới đây chỉ áp dụng phần API/DB và fixture/assertion được chỉ ra. HTTP diagnostics chứa snapshots đầy đủ an toàn; bảng dùng case/dòng để tìm, không viết lại response làm bằng chứng mới.

| ID | Điều kiện/thao tác → expected đã kiểm | Assertion/case → raw artifact / kết quả |
| --- | --- | --- |
| E01 | OWNER all-store/MANAGER own branch | SCOPE exact IDs F (xem case trong chỉ mục); AUTH current branch F (xem case trong chỉ mục); đủ. |
| E02 | CASHIER/removed branch.read denied | AUTH-02 exact403 PERMISSION_DENIED, F (xem case trong chỉ mục); đủ. |
| E03 | Branch omitted cash0/active true | A makeBranch assert0/true; SETUP F (xem case trong chỉ mục) DB rows; đủ. |
| E04 | Branch bounds/trim/null | I ORG-01 trim; A CRUD max/min/null F (xem case trong chỉ mục) + VALIDATION F (xem case trong chỉ mục); đủ các biên đã liệt kê. |
| E05 | Unique code/name, case/store scopes, PATCH rollback/race count1 | CRUD F (xem case trong chỉ mục) + BRANCH_RACE_DB; đủ. |
| E06 | Immutable code/storeId/nonempty/null/types | I ORG-01 + VALIDATION F (xem case trong chỉ mục) rejected DB unchanged; đủ. |
| E07 | Concurrent disjoint phone/address giữ cả2 | I ORG-01 assert DB exact {phone,address}, runner pass F (xem case trong chỉ mục); A CRUD omission/null snapshots bổ sung. Không có raw snapshot riêng đúng race phone/address cũ; assertion integration đã chạy chứng minh kết quả. |
| E08 | Disable/re-enable branch giữ child/cho cấu hình | CRUD F (xem case trong chỉ mục) + before/after and counts; đủ. |
| E09 | OWNER tables all/filter; other store404 | SCOPE F (xem case trong chỉ mục) và PAGE exact filtered sets F (xem case trong chỉ mục); đủ. |
| E10 | MANAGER ignores client branch | SCOPE F (xem case trong chỉ mục) + own/A2/B fixtures; đủ. |
| E11 | OWNER requiresbranch/MANAGER omit | SCOPE missing/override422 F (xem case trong chỉ mục); AUTH current-branch create201 F (xem case trong chỉ mục); đủ. |
| E12 | Defaultactive, area/capacity nullable, trim | A makeTable defaults + I ORG-02 trim/null F (xem case trong chỉ mục); DB SETUP snapshots; đủ. |
| E13 | capacity1/max/null valid; wrong boundaries/types rejected | CRUD F (xem case trong chỉ mục) DB assert; VALIDATION F (xem case trong chỉ mục); MIG constraint23514; đủ. |
| E14 | Table same name acrossbranch allowed, concurrent unique count1 | CRUD F (xem case trong chỉ mục) + final DB count assertion; đủ. |
| E15 | Table crossbranch/store404, branchmove422 | SCOPE F (xem case trong chỉ mục); VALIDATION branch field422; đủ. |
| E16 | Table omission/null/active/conflict rollback | CRUD F (xem case trong chỉ mục); DB snapshots và specific fields; đủ. |
| E17 | Staff-only safe tenant list | SCOPE exact IDs F (xem case trong chỉ mục); publicEntity keys every staff response + PAGE full list; đủ. |
| E18 | Staff branchfilter và scoped ignored client | SCOPE F (xem case trong chỉ mục); PAGE F (xem case trong chỉ mục); đủ. |
| E19 | Shared users dispatch current context | AUTH-02 platform misgrant target checks F (xem case trong chỉ mục); PB03 F (xem case trong chỉ mục); DOC-01 one path operation. Không claim đã introspect route registry uniqueness riêng. |
| E20 | OWNER cấp role thấp, invalid role422 | SETUP both roles; VALIDATION F (xem case trong chỉ mục); đủ. |
| E21 | Misgrant MANAGER không cấp peer/self lock/demotion | SCOPE F (xem case trong chỉ mục); UUID uppercase + unchanged DB; I USR-HIER regression; đủ. |
| E22 | Branch same scope cả inactive | SCOPE branchA2 denied F (xem case trong chỉ mục); CRUD inactive creates F (xem case trong chỉ mục); old crossstore raw404 + unchanged DB for new denied; đủ. |
| E23 | Normalized global username/409/count | I duplicate-create race F (xem case trong chỉ mục); CRUD crossstore/platform F (xem case trong chỉ mục) + count1 assertion; đủ. |
| E24 | Temporary credential bounded/hash/random/aftercommit | RESET01 F (xem case trong chỉ mục) + repeat inequality; LOG01 barriers F (xem case trong chỉ mục); source randomBytes18/base64url establishes generator, không suy độ entropy từ vài mẫu. |
| E25 | Missing assigned role503 | VALIDATION F (xem case trong chỉ mục) actual503 SERVICE_UNAVAILABLE, unchanged business rows; đủ. |
| E26 | PATCH staff only role/active; empty/null/types/immutablefields | VALIDATION F (xem case trong chỉ mục) exact422 and snapshots; đủ. |
| E27 | Role change revokes all/live rights | I USR02 F (xem case trong chỉ mục) user/sessions;12 races F (xem case trong chỉ mục) new MANAGER response when appropriate; đủ. |
| E28 | Role/active no-op keeps sessions | CRUD F (xem case trong chỉ mục) + deepEqual state/session and me200; đủ no-op active=true. Active=false no-op chỉ source; không có live session hợp lệ để giữ ở user bị khóa. |
| E29 | Lock revokes/unlock no resurrection | AUTH03 F (xem case trong chỉ mục); RESET02 F (xem case trong chỉ mục); đủ DB+old HTTP access/refresh/login cases. |
| E30 | OWNER/platform/outside scope target404 | SCOPE F (xem case trong chỉ mục); PLATFORM guard403 separate AUTH02; đủ. |
| E31 | Active reset revokes all devices, other user unaffected | RESET01 F (xem case trong chỉ mục) sessions2→0, oldaccess/refresh401; I USR02 otherstore me200 afterreset; đủ. |
| E32 | Repeated reset fresh password/old HTTP invalid | RESET02 F (xem case trong chỉ mục); private inequality assertion, both old passwords401/new200; đủ. |
| E33 | Failed role/disable/reset restores user/hash/session | LOG02 F (xem case trong chỉ mục) actual500+before/after/hashUnchanged/two active devices; đủ. |
| E34 | Reset vs login/refresh both lockorders | RACE F (xem case trong chỉ mục);4 PG_LOCK_ORDER + final credential/session checks; đủ observed schedules. |
| E35 | Role/disable vs login/refresh both lockorders | RACE F (xem case trong chỉ mục);8 actual waiter queues and final session checks; đủ observed schedules. |
| E36 | Current permissions/branch overriding staleJWT | AUTH02 permission fixtures F (xem case trong chỉ mục); branch switched A2 samecookie F (xem case trong chỉ mục); đủ. |
| E37 | Store suspend blocks every org route/data retained | AUTH03 F (xem case trong chỉ mục) actual admin suspend/revoke/reactivate; đủ. |
| E38 | Public exact keys/UTC/integer/requestId/no tokenhash | A publicEntity/noSecretKeys/call; all successful acceptance branch/table/staff; UUID consumed as PG IDs; đủ actual public DTOs. Không claim exhaustive Swagger JSON schema equivalence. |
| E39 | No GETbody/writequery/resetbody/query | VALIDATION F (xem case trong chỉ mục) RAW_GET_BODY3 +6 mutation querydenials/reset422; đủ. |
| E40 | Malformed/scalar/null400 vs array422 | VALIDATION F (xem case trong chỉ mục) all3POST resource bodies; đủ shared parser boundary. |
| E41 | WrongContent-Type all6 body endpoints400 | VALIDATION F (xem case trong chỉ mục) + I ORG05; đủ. |
| E42 | InvalidUUID422/missingUUID404 | VALIDATION F (xem case trong chỉ mục) branch/table/staff PATCH/reset; đủ. |
| E43 | Conflict PATCH rollback/disjoint success | CRUD denied patches include another field + full DB equality F (xem case trong chỉ mục); E07 assertion concurrency; đủ tested rollback. |
| E44 | App action actor/target/requestId aftercommit/no secrets | LOG01 barriers/action match F (xem case trong chỉ mục); raw logger F (xem case trong chỉ mục); LOG02 failed emits noaction F (xem case trong chỉ mục); all792events scanned; đủ local fixture. |
| E45 | UI no auto-replay reset | Deferred PB-13; không browser artifact, chưa xác minh. |

## Pagination, migration, documentation

| ID | Đối chứng mới và giới hạn | Kết quả |
| --- | --- | --- |
| P01 | PAGE defaults20/cap100/malformed query all3resources; F (xem case trong chỉ mục); P duplicate arrays/cursor1025 unit | Đủ các parser/default/boundaries đã định. |
| P02 | HTTP tenant/resource/branch/role cursor binding F (xem case trong chỉ mục); active binding P unit và filter integration | Đủ theo cấp kiểm tra phù hợp; không nói mọi negative active permutation đã chạy HTTP. |
| P03 | PG12 fixtures mỗi resource nhiều timestamp/ties; expected lấy6digits và sort độc lập bằng JS;20exact full traversals | Đủ SQL integration, không decoder-only. |
| P04 | Everypage stable total/limit, cuối cursor null, no duplicates; emptyStore3resources F (xem case trong chỉ mục) meta0/null | Đủ. |
| P05 | Filters exact sets và query counts F (xem case trong chỉ mục);1→18/19/36 rows đều5queries | Đủ fixture hiện tại; không benchmark tải lớn. |
| M01 | migration-cli-2.log apply4 migrations COMMIT exit0, repeat No migrations are pending exit0; commands21:23:24–21:23:27 | Đủ local CLI; giữ lượt Docker chưa chạy exit1 như lịch sử. |
| M02 | M oldbranch/cash/customOwner grant preserved + raw branch F (xem case trong chỉ mục) | Đủ narrow upgrade fixture. |
| M03 | M expected OWNER5/MANAGER2/CASHIER0 và preexisting custom MANAGER/OWNER grants retained | Đủ assertions đã chạy; riêng platform seed exclusion đọc migration, không báo có explicit new assert. Platform isolation HTTP đã chạy. |
| M04 | M FK23503/positive capacity23514, runner F (xem case trong chỉ mục) | Đủ DB constraints đã thử. |
| M05 | M pending0, saved table1 after repeat F (xem case trong chỉ mục) | Đủ TypeORM tracked repeat; không claim gọi up() trực tiếp hai lần. |
| M06 | M seeded old MANAGER id/customperm/user/session; raw readonly before=after F (xem case trong chỉ mục) hash booleans true | Đủ populated-upgrade fixture, không secret hashes. |
| D01 | O request/response/cursor presence/type assertions + full generated OpenAPI F (xem case trong chỉ mục) | Đủ các schema claims đã assert, không exhaustive Swagger validator audit. |
| D02 | Users anyOf structural + actual emptyHTTP3resources F (xem case trong chỉ mục) | Đủ ambiguity/empty result vế đã nêu. |
| D03 | O nullable primitive type + raw OpenAPI, A runtime valid null/clear and invalidtypes | Đủ API null/type + documented primitive types, không claim every Swagger bounds flag individually asserted. |
| D04 | DOC0210 concrete request/JSON examples, DTO pipe validation; errors scoped to routes và PATCH context đúng | Đủ; spec cuối không còn câu copy PATCH ở POST; ví dụ giả không gọi là HTTP execution. |
| D05 | Các mã BR/case và ma trận từng clause trong báo cáo này, artifact specific | Đủ đối chứng AUD findings API/DB; các deferred/unverified bên trên giữ nguyên, không lấy48 thay coverage. |

## Giới hạn còn lại

Chưa chạy UI/tablet/browser/storage, production hay khóa quỹ sau ca CASHIER đầu (PB-06); đây là scope deferred đã chốt. Không có CI URL/runner độc lập. QA đang rà evidence local có sẵn, không tự nhận đã chạy lại npm test; lệnh tái chạy là `npm test` tại POS_API với DATABASE_URL QA cho phép tạo DB cô lập, không dùng credential thật trong báo cáo. Không tick nghiệm thu/đóng Sprint3 thay Product Owner.

## Bổ sung cuối: hai mutation chờ role

acceptance-6.log.gz tái hiện hai case role→reset/disable nhận [200,404] thay vì [200,200]. UsersService.staff đã đổi sang khóa identity theo store/branch trước rồi đọc role trong statement sau. Full-2 kiểm hai ACC-RACE-MUTATION: cùng [200,200], role MANAGER giữ nguyên; reset active/mustChange=true; disable active=false/mustChange=false; sessions0 và oldcookie401. Reset còn kiểm old password401/new password login MANAGER. Không làm yếu assertion để chấp nhận404.

QA đã tính lại SHA256 từng file trong source/runtime/contract manifests: **66/64/9 entries, không mismatch**. Đã mở cả7 gzip trong artifact-manifest.json, giải nén và tính lại SHA256/kích thước raw và compressed, tất cả khớp, gồm full-2.log.gz raw SHA256 `257a9863a9063421493791c67acb5d1b8af3c81c608a1b692cfdf8b30b5f84fd`. Environment.log có lệnh thực và versions Node22.22.2/npm10.9.7/PostgreSQL17.9. Commands.log và run.md ghi đúng full-suite và migration CLI đầu/cuối/exit; không coi lỗi Docker hoặc harness là lượt pass.

Đã kiểm lại bằng cách parse raw full-2:14 blocker chains,20 exact page traversals,3 rollback hash/state,3 commit barriers,2 mutation race results đều khớp. Không có giá trị bcrypt/JWT thực trong raw; mật khẩu request được che. Đây là kiểm tra độc lập về nội dung artifact bởi QA, **vẫn là bằng chứng thực thi local của agent chính**, không CI độc lập.

### Chỉ mục artifact cuối

F là dòng sau giải nén full-2.log.gz. Các hàng matrix dùng case tương ứng và chỉ mục này.

| Case | Dòng HTTP trong F |
| --- | --- |
| SETUP | 197–239 |
| ACC-AUTH-01 | 201–213 |
| ACC-SCOPE-01 | 240–277 |
| ACC-AUTH-02 | 279–342 |
| ACC-AUTH-03 | 347–411 |
| ACC-RESET-01 | 412–442 |
| ACC-RESET-02 | 443–459 |
| ACC-LOG-01 | 462–468 |
| ACC-LOG-02 | 470–484 |
| RACE reset/login mutation trước | 485–497 |
| RACE reset/login auth trước | 499–514 |
| RACE reset/refresh mutation trước | 516–528 |
| RACE reset/refresh auth trước | 530–545 |
| RACE role/login mutation trước | 547–557 |
| RACE role/login auth trước | 559–571 |
| RACE role/refresh mutation trước | 573–581 |
| RACE role/refresh auth trước | 584–596 |
| RACE disable/login mutation trước | 598–606 |
| RACE disable/login auth trước | 609–621 |
| RACE disable/refresh mutation trước | 623–631 |
| RACE disable/refresh auth trước | 634–646 |
| MUTATION role→reset | 648–660, kết quả661 |
| MUTATION role→disable | 662–670, kết quả672 |
| ACC-CRUD | 673–722 |
| ACC-VALIDATION | 723–832 |
| ACC-PAGE | 834–1065 |
| ORG/USR regression cũ | 1925–2029 |

MIG-01 snapshots F:2042–2043; generated OpenAPI F:2050; DOC-02 examples F:2063–2072; PB03 regression F:2074/2080. Query counts F:875/919/980. APPLICATION_LOG F:1066–1857,792 events. Chỉ mục giúp tìm stdout; assertion nguồn xác định expected nào thực sự được runner kiểm.

Kết luận: không còn finding runtime hoặc thiếu bằng chứng trọng yếu đang mở trong AUD-01..05 thuộc API/DB đã sửa. Những vế deferred và giới hạn nêu rõ trong matrix không trở thành “đã nghiệm thu toàn PB-04/Sprint3”.
