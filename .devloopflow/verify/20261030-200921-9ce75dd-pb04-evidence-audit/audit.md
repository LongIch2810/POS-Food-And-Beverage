# Đối chiếu PB-04 API/DB với chứng cứ gốc

Trạng thái: audit chỉ đọc ngày 30/10/2026. Không chạy lại test, không kiểm tra browser, không sửa source/test/config/spec. Đây là báo cáo do agent tạo từ việc đọc artifact và source, không phải output runner, CI độc lập hay nghiệm thu Product Owner. Thư mục này không phải một test run mới.

Kết luận: API/DB có triển khai và có bằng chứng runner local thật cho nhiều đường quan trọng. Chưa đủ chứng cứ để kết luận mọi vế API/DB trong spec đã được xác minh. Không phát hiện lỗi hành vi mới qua việc đọc; các mục dưới là lỗ hổng chứng cứ và phát biểu tài liệu quá mức, cần giữ riêng với lỗi đã tái hiện.

## Phiên bản và phương pháp

- HEAD đọc trực tiếp: `9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18`, branch `feat/pb04-organization-api`; working tree dirty, nhiều source PB-04 chưa tracked. SHA này là base, không chứa implementation PB-04.
- Đã dùng graph `search_graph` với project `D-saved-Project-POS-F-B`; index không có module organization/users mới, vì vậy đọc trực tiếp file. Không coi graph cũ là bản triển khai hiện tại.
- Đã đọc AGENTS.md, cấu hình QA, PRODUCT_OVERVIEW, MEMORY (bài học chứng cứ/UUID), rules/testing, BUSINESS_RULES, API common, phần schema tổ chức/users, specs organization/users/auth/platform, sprint-03, completed plan/task, original run/review/commands/environment, source/runtime manifest, final-approved.log và migration-cli.log, cùng assertion source liên quan.
- Đã rehash từng file trong hai manifest bằng `Get-FileHash -LiteralPath <path> -Algorithm SHA256`: 64 mục source/config và 62 runtime đều khớp; không thiếu file trong những mục được kê. Đây là kiểm tra file hiện tại so manifest, không chứng minh độc lập code thực sự được runner nạp trong quá khứ. Không có hash spec/docs trong source-manifest.
- `environment.log` ghi Node22.22.2/npm10.9.7/PostgreSQL17.9/PowerShell local và trạng thái Git lúc 19:52:34+07. `final-approved.log` kết thúc 19:54:42; manifest mtime19:55:36. Metadata có trước/sau lần final, không phải CI attestation. Hiện tại docs/task đã dịch chuyển/cập nhật; không yêu cầu toàn working tree bây giờ bằng ảnh status cũ.
- Original final `npm test`, CWD POS_API, commands.log: bắt đầu `2026-10-30T19:54:23.5898064+07:00`, kết thúc `2026-10-30T19:54:42.5971111+07:00`, exit0. Raw log UTF16LE chứa build và TAP. Đọc bằng `Get-Content -Encoding unicode`; JSON OpenAPI trong TAP còn có escape, cần decode khi phân tích. Không ghi đè/chuyển mã file gốc.
- CLI migration original: bắt đầu19:45:00.500+07, kết thúc19:45:02.789+07, wrapper `node --env-file-if-exists=.env ../qa-evidence/20261030-193116-9ce75dd-pb04/migration-check.cjs`; script tạo DB QA riêng và gọi `node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js` hai lượt. Raw migration-cli.log có thời điểm/exit0 từng lượt, lượt đầu4 migration, lượt sau không pending. Không suy ra CLI đã chạy lại sau final19:54.
- Không có CI URL/ID PB-04 trong bộ chứng cứ này. Tất cả kết luận runner bên dưới chỉ là đọc lại bằng chứng **local do agent chạy**, không phải tôi đã chạy lại độc lập.

## Khóa tra cứu

Các đường dẫn dưới tính từ gốc repo. `F:n` nghĩa dòng n của raw `qa-evidence/20261030-193116-9ce75dd-pb04/final-approved.log` sau khi đọc đúng UTF16LE. `I:n` là `POS_API/src/organization/tests/organization.integration.test.ts:n`. `M:n` là migration test cùng thư mục. `P:n` là pagination test cùng thư mục. `D:n` là OpenAPI test cùng thư mục.

`Đủ chứng cứ` dưới đây chỉ áp dụng đúng vế nhỏ được ghi và assertion local đã đọc, không mở rộng sang tất cả endpoint hoặc dữ liệu chưa kiểm tra. `Chỉ code` có nhánh triển khai nhưng thiếu assertion tương ứng. `Chưa xác minh` thiếu tình huống/artifact cần thiết. `Mâu thuẫn` là phát biểu báo cáo/spec không khớp phạm vi chứng cứ; không mặc định là implementation bug.

## Findings cần agent chính ghi errors/ hoặc theo dõi kiểm tra lại

### AUD-01 — P1 về mức bảo đảm: thiếu cô lập giữa hai branch cùng store và trạng thái auth trên endpoint thật

Điều kiện cần: cùng store A có branch A1/A2, MANAGER ở A1, table/staff ở A2; thêm store B riêng. Thao tác cần: list/create/patch/reset theo từng quyền, có và không gán nhầm permission; đổi branch/permission hiện hành sau login; khóa user/store rồi gọi endpoint tổ chức thật. Expected theo BR-05/70/71/71b/79–84: không thấy/không sửa A2 hoặc B, body/query không đổi scope, trạng thái hiện hành từ DB có hiệu lực, DB không đổi khi từ chối.

Actual evidence: I:184–208 (ORG-03) chỉ tạo `otherTable` bằng owner của **store B**, rồi MANAGER store A PATCH nhận404. Hai branch khác của store A có tồn tại từ ORG-01 nhưng không có table/staff ở đó để thử cùng tenant. GET MANAGER chỉ thấy branch mình đã được assert, nhưng truy vấn table chưa có tài nguyên đối chứng cùng tenant/khác branch. USR-HIER thử tự thao tác và role ngang; không thử staff A2. F:156–167 có200/404/403 tương ứng, không có chứng cứ cùng-store branch denial. User/store lock được suite auth/platform thử qua login hoặc `/auth/me`, không phải `/branches`, `/dining-tables`, `/users` bị chặn. Source có scope predicates/guard, nên đây là **thiếu chứng cứ**, chưa phải bypass đã tái hiện.

### AUD-02 — P1 về mức bảo đảm: reset password và concurrent revoke chưa được bao phủ như lời kết luận

Spec users mục reset đòi `login/refresh cạnh tranh`, mật khẩu cũ vô hiệu, khóa, rollback. I:302–323 USR-04 chỉ race refresh với role change và login với disable, không gọi reset. Promise.all không cố định thứ tự lock; log final F:210 chỉ chứng minh một lịch refresh trả401/role patch200. Không có chạy ép hai thứ tự cho reset↔login/refresh, không kiểm cookie mới phát bởi refresh trong race. PB-02 có test login chờ một user-row update hash và change-password chờ revoke, giúp hồi quy shared lock nhưng không thay kiểm tra endpoint reset staff.

USR-02 reset thực hiện trên user đã khóa, các phiên bị revoke từ bước role/disable trước đó. Có assert bcrypt mật khẩu cũ không khớp hash và login mới thành công sau mở; không có HTTP login bằng mật khẩu cũ sau reset, reset active user có nhiều phiên sống, refresh mỗi thiết bị sau reset hoặc reset lặp tạo mật khẩu thứ hai. USR-03 có assertion reset rollback hash equality và snapshot equality, nhưng raw diagnostic before/after F:189 được ghi trước reset500 F:190, vì vậy không có riêng output DB/hash-equality sau reset. Không được gọi F:189 là snapshot sau reset rollback.

### AUD-03 — P2: microseconds có evidence sinh cursor, chưa có integration chứng minh không mất/trùng bản ghi

P:10–29 ORG-PAGE tự dựng JSON cursor timestamp `.123456Z` rồi kiểm decoder giữ nguyên. I:281–300 ORG-04 chỉ lấy hai trang branch, so ID khác và total bằng nhau; fixture createdAt do thời gian tạo tự nhiên, không cùng millisecond/identical timestamp; không đi đến hết tập. F:191–192 có cursor do DB sinh giữ6 chữ số, chứng minh serialization có microsecond. Chưa chứng minh tuple SQL/tie-break trên dữ liệu có thể bị mất do truncate, cả ba resource branch/table/staff, cursor khác branch/resource/role ở HTTP, hoặc N+1 khi dữ liệu đủ lớn. PB-03 có fixture trùng microsecond cho platform store nhưng dùng helper khác, không thay cho organizationPageResponse.

### AUD-04 — P2: chưa chứng minh log an toàn/đúng thời điểm và toàn bộ DB effects

I:34 tắt logger (`logger:false`); request helper I:36–51 chỉ xuất method/path/status/requestId và vài field an toàn, không xuất raw JSON body/response đầy đủ. Không có log app chứng minh action/actor/target/requestId sau commit, không có assertion log vắng password/hash/token hoặc không log khi rollback. UsersService:34–35,89,114,128 đọc thấy code log sau transaction và không truyền secret: **chỉ code**, không phải evidence runtime. `passwordHash` vắng riêng trong user create response được assert ở I:163; không có exact-key assertion cho list/patch/reset hoặc kiểm không lưu raw trong DB ngoài password_hash. Không thấy secret thực trong artifact đã đọc, nhưng đó không chứng minh ứng dụng không log secret.

DB raw diagnostics có branch count/quỹ, schema table columns, role-change user/sessions, patch rollback. Nhiều mutation table create/patch/null-clear/duplicate, staff create/lock/reset/unlock và rejected cross-scope chưa có DB row trước/sau riêng. Assertion test có giá trị cho vế được assert, không tự thay các artifact DB before/after còn thiếu theo AGENTS. Không dùng số HTTP200/404 để xác minh toàn bộ tác dụng phụ.

### AUD-05 — P2: kết luận reviewer quá mức; lỗi/bản ví dụ spec chưa chính xác

Original review.md:25 ghi: “Các artifact dẫn trong run.md tồn tại; DB diagnostics đo thực tế, **không thấy thiếu chứng cứ trong phạm vi API/DB đã thống nhất**.” run.md:41 dẫn reviewer “không còn finding và không thiếu artifact trong scope”. Các gap AUD-01..04 thuộc API/DB/spec đã chốt, nên nhận định đủ chứng cứ này quá rộng. Việc file tồn tại không đồng nghĩa mỗi clause đã được kiểm. Task completed:9 và plan bướcD dẫn review như kiểm tra/review hoàn tất nên cần chú thích giới hạn, không sửa/xóa raw log cũ.

Spec users ở PATCH `/users/{id}` mục quyền ghi “platform theo specs/platform.md với route đã có”; platform spec chỉ chia sẻ GET/POST users và POST reset, không có platform PATCH; controller PATCH dùng user.manage và platform bị guard chặn. Đây là câu mô tả hợp đồng gây hiểu nhầm, không phải thiếu implementation platform PATCH. Các bảng lỗi organization/users copy cùng409 cho GET,503 cho list/reset, nhắc PATCH rỗng/cursor trên endpoint không nhận chúng; ngược lại thiếu hàng400 dù phần chung nói parser/Content-Type400. Các “Ví dụ” chỉ có path→status (POST/PATCH không body), chưa là ví dụ request hợp lệ tự tái hiện. DOC-01 chỉ kiểm schema tồn tại, vài response/schema type; không assert mọi required field/nullable/bounds/status/error table hay payload sample tương thích runtime. Đây là tài liệu/test gap.

## Ma trận: tiêu chí Sprint3 → từng vế → implementation/assertion/artifact

| ID | Yêu cầu đã chốt và điều kiện/thao tác cần | Implementation hiện tại | Assertion và artifact thật | Trạng thái / phần còn thiếu |
|---|---|---|---|---|
| AC1a | OWNER tạo branch trong store mình, trim code/name | OrganizationService.createBranch; DTO | I:84–98 assert201/storeId/code/name; DB count; F:109–110 | Đủ chứng cứ cho giá trị fixture |
| AC1b | Quỹ nguyên VND0..1e12, DB bigint, no coercion | DTO Min/Max/IsInt; money safe integer; Branch entity/schema | I:99–109 thử -1,.1,>cap,string,null422; cap DB string; F:112–118 | Đủ chứng cứ biên PATCH; create0; chưa CREATE sai tiền, schema type và default0 direct assert |
| AC1c | Policy trước ca đầu | patchBranch shortcut + khóa Branch | Không có bảng ca; spec/plan hoãn PB06 rõ | Chưa xác minh, deferred được duyệt; không tính bug PB04 |
| AC2a | OWNER quản lý bàn đúng branch/store | createTable/patchTable join Branch/lock | I:123–147 create/null-clear, cross-store POST/PATCH404; F:131–145 | HTTP/assert đủ phần đã thử; DB row before/after còn thiếu |
| AC2b | Không lưu trạng thái occupied/status | DiningTable entity/migration, response projection | I:130–134 schema query, no occupied; F:132 | Đủ chứng cứ schema và occupied JSON; chưa exact no status JSON |
| AC2c | Không suy ra đơn thật từ UI mock | API không có trạng thái occupancy | Không chạy luồng đơn hoặc UI | Đúng giới hạn; chưa xác minh đơn tương lai |
| AC3a | Cấp MANAGER/CASHIER branch cùng store | UsersService.createStaff + branchInScope | I:150–181 create MANAGER, duplicate CASHIER, cross-store rejected; F:146–155 | Đủ vế create và cross-store status; lỗi expected404/422 được assert lỏng, chưa DB before/after |
| AC3b | Username trim/lower duy nhất global | SQL lower(btrim), unique DB | I:151–156 uppercase spaces→staff; I:178–181 dupe race201/409 | Đủ same-store concurrent normalization; chưa duplicate khác tenant/platform |
| AC3c | Bắt đổi mật khẩu đầu | mustChangePassword + authorizeAccess | I:164–172 table GET403/PASSWORD_CHANGE_REQUIRED→change204→oldsession401→newlogin | Đủ đường table của MANAGER; chưa từng endpoint/role |
| AC3d | Mật khẩu chỉ hash | bcrypt cost12; password_hash | I:159–163 bcrypt match true; F:147 | Đủ hash field cho user create; cost12/entropy/no raw khác chỉ code |
| AC3e | Chỉ hiện password lúc cấp; không browser storage/log | API trả một response; UsersService logging | Logger off, không browser | Chỉ code API log; storage/UI chưa làm (PB13), không nghiệm thu toàn vế |
| AC4a | Permission/context hiện hành | AccessGuard + AuthService.authorizeAccess | ORG03/USR-HIER F:156–174; manager denied users; platform denied real branches/table | Một số permission đủ chứng cứ; toàn endpoint matrix chưa xác minh |
| AC4b | Chéo store và branch | scoped predicates Branch/user/table | Cross-store404; manager list forced; không fixture same-store branch peer | Chưa xác minh đầy đủ AUD01 |
| AC4c | User/store khóa chặn tổ chức thật | AuthService session/active/store checks | USR02 /auth/me401; platform suspend login/me401; không endpoint tổ chức bị khóa | Chỉ code + shared auth regression; HTTP requirement chưa xác minh |
| AC4d | Chưa đổi password bị chặn tổ chức | AuthService guard | USR01/02 GET dining-tables403 đúng code | Đủ endpoint đại diện; chưa mọi endpoint hoặc OWNER chưa đổi |
| AC5a | UI đọc/ghi API, reload dữ liệu DB, loading/error/Vietnamese | Chưa có PB13 tổ chức | Không có browser artifact | Chưa xác minh, UI ngoài implementation API/DB; Sprint3 còn mở |
| AC5b | Auth/platform không hồi quy | Shared UsersController dispatch | F:10–39 PB01/02 và F:237 PB03 pass; exact test source assertions | Đủ các regression hiện có local, không suy ra toàn app không regression |
| AC6 | UI response cũ sau tab/branch/page | Chưa có UI tổ chức | Không có test/browser | Chưa xác minh; PB13 cần thực hiện, không bug API PB04 |

## Ma trận: từng endpoint, clause spec và quy tắc liên quan

| ID / BR | Endpoint/clause, điều kiện ban đầu → thao tác → expected | Actual implementation | Assertion cụ thể → raw artifact | Trạng thái |
|---|---|---|---|---|
| E01 /05,70,71 | GET branches OWNER toàn store; MANAGER branch mình | listBranches store predicate + page.branchId | I:186–188 list ids=[branchId]; I:282 first OWNER list; F:156/191 | Đủ MANAGER; OWNER list chưa assert toàn bộ IDs/không lộ tenant |
| E02 /05 | GET branch CASHIER denied, thiếu branch.read denied | guard branch.read | Chỉ CASHIER GET tables I:241, manager GET users I:195; không branch | Chỉ code |
| E03 /76,103 | POST branch omitted money→0, active=true, optional nullable | createBranch defaults/DTO | ORG01 otherResult omitted tiền nhưng chỉ assert201; F:111 active=true | Chỉ code default tiền; active có metadata chưa assert |
| E04 | POST branch code2..10/name1..150/address255/phone20; trim/empty/null | DTO/normalization | I:85 trim code/name, missing fields I:298; không min/max string hoặc phone clear | Chưa xác minh boundaries |
| E05 | POST/PATCH duplicate code/name within store→409, case-sensitive; different store allowed | unique catches23505; schema uniques | I:97 other tenant same code/name201; I:119–120 simultaneous same code+name201/409; case lowercase201 | Đủ combined conflict; chưa separate duplicate code vs name/PATCH collision và DB count sau race |
| E06 | PATCH branch code/storeId immutable, non-empty patch | DTO + JsonBodyGuard | I:110–113 {} code storeId/name null/isActive string422; F:119–124 | Đủ tested fields; chưa isActive:null/other nullable combos |
| E07 | PATCH branch không ghi đè field không gửi, concurrent phone/address | row write lock selective assignments | I:114–118 concurrent200+200 and DB phone/address exact | Assertion đủ; raw diagnostic không in phone/address row |
| E08 /10,76 | Branch disable/re-enable giữ dữ liệu; vẫn cấu hình | patchBranch active field | I:125 false200, sau đó table/staff create201 | Đủ inactive cho create config; chưa re-enable/retention before-after |
| E09 /70,71b | GET tables OWNER branchId lọc hợp lệ/ngoài store404 | branchInScope + listTables | I:293 otherBranchId404; F:200 | Đủ denial; chưa success filter OWNER/không filter allstore set |
| E10 /71 | GET tables MANAGER query branch ignored, chỉ own branch | organizationPage uses current branch | I:189–191 invalid branch query200 + every own branch | Assertion đủ query ignored; cùng-store khác branch fixture thiếu |
| E11 /71b | POST table OWNER branchId bắt buộc; MANAGER không gửi | createTable allBranches check | I:126 OWNER branch valid201; I:192 manager omit201; I:193 manager sends422 | Đủ 3 vế; OWNER omit branch chưa thử |
| E12 | POST table nullable capacity/area, name trim; new active | DTO/service | I:126–130 capacity null/name trim; F:131 active=true | Đủ fixture null/name; area absent/active response không assert |
| E13 | capacity int1..2147483647, wrong type/0/negative rejected | IsInt Min Max + DB positive constraint | I:135–136 five invalid422; M:43–44 capacity0 constraint23514 | Đủ invalids; chưa valid1/max, null DB row |
| E14 | Table unique(branch,name), concurrency | unique DB + catch409 | I:144–147 dup409 + race201/409 | Đủ statuses; chưa final DB count/name, same name khác branch success |
| E15 /71,80 | PATCH table ID scope returns404; branch move field422 | join/store/branch predicates | I:141–143 branchId422, cross-store create/patch404; I:194 other-store manager404 | Đủ store boundary status; same-store branch thiếu |
| E16 | PATCH table null clearing vs omission; isActive/ngưng dùng | selective assignments/DTO | I:138–140 capacity4+area then null/empty→response null | Assertion response đủ; không DB before/after; omission/name/active patch/rollback chưa thử |
| E17 /01,70 | GET users store context returns only staff safe projection | listStaff selects permitted fields role join | I:299 every role in staff set; F:206 count2 | Chỉ role asserted; không tenant IDs, secret exact keys, branch/filter/pagination count/query |
| E18 /71 | GET users branch filter thuộc store; scoped actor ignore client branch | helper/scoped query | Không HTTP assertion users branch filter | Chỉ code |
| E19 /05,79–81 | GET/POST users/reset dispatch theo storeId hiện hành, không payload | UsersController/RequirePermission context | ORG03 platform reset staff404 F:165; PB03 admin owner create/list/reset pass F:237; PB03 owner payload platform422 | Đủ route context tested; không exact route uniqueness runtime assertion |
| E20 /83 | POST staff OWNER chỉ role thấp MANAGER/CASHIER | assertLowerRole | I:151 MANAGER201, duplicate CASHIER1success; I:175 invalid OWNER+extra field caught loose404/422 | Đủ success; validation lỗi code chính xác chưa assert |
| E21 /06,83 | Misassigned user.manage MANAGER không cấp ngang/nâng cashier ngang | roleLevels and canonical user self check | I:210–228 USR-HIER403 peer/create/self/demotion/uppercase and DB peer count0; F:65–70,168–173 | Đủ fixture denial; không prove all DB roles/sessions unchanged |
| E22 /70 | Staff branch same tenant even inactive | branchInScope read lock; no active condition | Branch made inactive I:125, staff created I:151; cross-tenant request I:176 | Đủ config inactive and denial status; same-tenant branch-limited actor thiếu |
| E23 /97 | Global unique normalized staff username +409 USERNAME_EXISTS | lower/btrim SQL; catch23505 | I:178–181201/409; F:154–155 code USERNAME_EXISTS | Đủ race status/code; chưa DB count1 or global cross-store conflict |
| E24 /84 | Password generation random18bytes base64url bcrypt12, only after commit | create/reset transaction→log→return | I:158 password length>=12 and bcrypt compare I:160 | Đủ >=12/match; max72/entropy/cost/exclusive storage/commit-boundary only code |
| E25 | Missing target role→503 | findRole error | Không delete/unseed role scenario | Chỉ code |
| E26 | PATCH user role/status only; no username/fullName/phone/branch mutation; nonempty | PatchStaffDto/JsonBodyGuard | ORG05 only wrong Content-Type PATCH; USR02 valid field | Chỉ code cho empty/unknown/null/type/max; chưa DTO matrix staff |
| E27 /03 | Role change revokes all live sessions atomic, old access blocked, current rights changed | user row lock+revoke | I:232–241 2new devices plus earlier sessions, snapshot4→0 + both /me401 + new cashier table403; F:175–178 | Đủ success and DB diagnostic |
| E28 | No-op role/status không revoke | roleChanged/disabled booleans | I:242–243 role same + oldsession /me200 | Đủ role no-op; active true/false no-op chưa assert |
| E29 /02,03,07 | Disable revoke, unlock không hồi phiên/không xóa | isActive save/revoke | I:244–254 lock200 old /me401 reset locked/unlock200 old /me401 | Đủ sequence old access; no DB before/after lock/unlock/count or locked login/refresh on staff |
| E30 /80,85 | OWNER/platform target not staff404 incl own-owner, peer-owner, other-store staff | staff target role list+scope | I:202 targets other-store OWNER404; platform reset staff404 | Chỉ code own-store OWNER/platform target và cross-store staff PATCH/reset |
| E31 /03,84 | Reset active user→new hash/flag + revoke EVERY live device; other users unaffected | resetStaffPassword transaction+revoke | I:246–258 tests locked target only; other store /me200 | Chưa xác minh active/reset multisession; locked state và newlogin đủ |
| E32 | Reset repeated nonreplayed password, old/new login | randomBytes each call | I:250 old hash false, I:255 new login succeeds after unlock; no repeat/old HTTPlogin | Chỉ code for repeats; bcrypt assertion đủ old hash |
| E33 | PATCH/reset rollback when revoke fails keeps all state | db.transaction + trigger test | I:261–274500 both, deepEqual snapshot and hashSame boolean assert; F:188–190 | Assertion runner đủ rollback; raw reset after-state diagnostic thiếu AUD02/04 |
| E34 | Reset concurrent login/refresh không giữ phiên/password cũ | shared row locking source | USR04 does not call reset; PB02 shared lock test is different boundary | Chưa xác minh endpoint reset race |
| E35 | Concurrent role↔refresh and disable↔login | user/store locking auth/users | I:305–323 Promise.all statuses allowed, sessions0; F:207–211; only refresh race DB diagnostic | Đủ observed schedule; chưa deterministic both lock orders/new-cookie denial |
| E36 /05 | Current permission/role/branch context on real endpoint after DB changes | authorizeAccess reloads identity | USR-HIER adds manager permission then same session calls real endpoint403 role-rule; rolechange old session invalid | Đủ permission-add fixture; branch reassignment or permission removal organization route chưa thử |
| E37 /82 | Store suspension blocks every organization API & preserves rows | shared auth/store checks | PB03 only login/me401 and zero sessions assertion | Chỉ code on organization HTTP; chưa store data retention snapshots |
| E38 | Request/response UTC, UUID, fields exact incl no secret | projections/Date/string UUID | IDs consumed as fixture, limited selected field assertions | Chỉ code exact schemas/UTC all responses; DOC01 schema existence only |
| E39 | No GET body, no mutation query, reset no body/query | noInput/jsonInput | ORG04 branch unknownquery422; other no-input permutations not tested | Chỉ code |
| E40 | Malformed JSON/scalar/null400 vs array/field422 | Express strict parser+JsonBodyGuard/validation | I:294 null400, I:295 array/empty/missing422; no malformed JSON/scalar1 or all endpoints | Đủ representative branch input; chưa full shared-route matrix |
| E41 | Wrong Content-Type400 on six writes | JsonBodyGuard | I:326–343 loop exact BAD_REQUEST; F:212–217 | Đủ all6 routes with text/plain; reset no-body is separate contract |
| E42 | idUUID invalid/unknown IDs404 | validId and scoped lookup | I:297 branch/bad422; cross-store404; no missingUUID org GETbyID absent | Đủ malformed branch example; other routes invalid/missing UUID chỉ code |
| E43 | POST/PATCH table/branch rollback on conflict and disjoint field updates | transaction and unique | ORG01 disjoint success, ORG02 duplicate create; no failed patch snapshot | Chưa xác minh all rollback semantics |
| E44 /01,03,84,86 | Action/actor/target/requestId logged after commit, secrets excluded | UsersService log calls after await transaction | logger:false I:34; raw request diagnostics not application log | Chỉ code AUD04 |
| E45 | UI không auto-replay khi mất response/reset | No UI PB13 yet | No artifacts | Chưa xác minh; deferred UI |

## Ma trận: phân trang, migration và docs

| ID | Clause / expected | Implementation | Actual assertion và raw artifact | Trạng thái |
|---|---|---|---|---|
| P01 | default20, limit positive/max100, sole sort-createdAt, query strict | organizationPage parser | I:290 invalid queries422; P:25 duplicate query arrays throw, P:29 101→100; F:195–199,231 | Đủ selected parser units/status; default meta20 visible F:156, not asserted all resource |
| P02 | Cursor binds tenant/resource/branch/active/role | scope JSON validation | P:11–24 changedrole/active/resource throw; I:287–289 other tenant/filter422 F:193–194 | Đủ unit+2HTTP; branch change and crossresource HTTP missing |
| P03 | timestamp microseconds, tuple createdAt/id DESC stable pages | to_char US + SQL tuple/order | P:13–16 synthetic decode; I:282–286 first/second IDs differ, total stable; F:191–192 generated6decimalcursor | Serialization đủ; no robust SQL integration fixture AUD03 |
| P04 | total independent cursor, nextCursor=null when done; emptylists | count before after-filter/limit+1 | I:286 equal totals pages, no final page, no empty organization list | Chỉ code lastpage/empty; DOC01 anyOf syntax not HTTPempty |
| P05 | Filter role/isActive/branch actually changes records/total, no N+1 | SQL join/static query count | I:299 only role.every; no filter fixture/exact result/querycount | Chỉ code |
| M01 | Empty DB apply4 migration CLI and no pending repeat | registered migrations+wrapper | migration-cli.log first COMMIT/success; second No migrations are pending; wrapper assertstatus0 | Đủ local CLI raw, not final19:54rerun |
| M02 | Upgrade prePB04 preserves old branch/cash/custompermissions | Organization migration additive/ONCONFLICT | M:25–41 seeds branch100 and owner customperm→assertdeepEqual/count1; F:218–223 pass | Đủ narrow upgrade fixture; raw DB pre/post rows not printed |
| M03 | Seed OWNER5/MANAGER2/CASHIER0, don't destroy custom grant | insert role_permissions ONCONFLICT | M:35–42 count + customperm preserved | Đủ test assertions; PLATFORM ADMIN exclusion not explicit migrationtest assertion |
| M04 | FK table→branch, positive capacity constraint | migration FK/CHECK | M:43–46 errorcodes23514/23503 | Đủ integration constraints |
| M05 | Repeated migrations preserve saved table | TypeORM migration tracking | M:47–51 insert then migrationlen0/tablecount1; I:300 rerunlen0 | Đủ no pending/tracked replay; no direct up twice claimed |
| M06 | Upgrade populated users/sessions or preexisting nondefault standard permissions | migration only additive | M fixture does not seed old staff/session; only custom OWNER permission | Chưa xác minh more populated upgrade; narrow claim preserved branch/quỹ/custompermission accurate |
| D01 | OpenAPI request/response/query/envelopes exist on final | response DTO/decorators | D:19–34 existence/params/status200403201/reset200; F:224–230 original OPENAPI JSON | Đủ presence claims, not all contract correctness |
| D02 | Users empty list schema allowed both contexts | anyOf list envelopes | D:35–36 assertanyOf; no actual HTTP empty lists | Đủ structural schema; runtime emptylist chưa xác minh |
| D03 | Nullable string/integer requests correct | explicit types/nullable decorators | D:44–53 propertyType exact; no nullable flag/bounds assertions, JSON original inspectable | Đủ declared fieldtype only; don't infer complete validation |
| D04 | Accurate endpoint errors/examples | organization/users spec reused table |400 omitted tables, generic irrelevant409/503; examplePOST no body; platformPATCH wording false | Mâu thuẫn docs; AUD05 |
| D05 | Every BR identifiable in test and each acceptance clause evidenced | test names map some BR | IDs clear but boundaries/clauses above unasserted; 21 aggregate not coverage metric | Chưa đầy đủ theo rules/testing |

## Số test thực sự nói gì

F:10–39 có5 top-level PB01/PB02; F:40 parent PB04 chứa10 subtest I:84/123/150/184/210/232/261/281/302/326; F:218 MIG01; F:224 DOC01; F:231 ORG-PAGE; F:237 PB03 integration; F:243 PB03 pagination. Tổng runner F:250 là21 test nodes =11 top-level +10 nested. Parent PB04 không phải tình huống nghiệp vụ độc lập thứ21; một số leaf chứa nhiều HTTP/assertion khác nhau, còn các leaf PB04 dùng chung fixture và phụ thuộc thứ tự (`branchId`, `staffId`, `manager`). Không đổi số runner, không quy đổi thành số tiêu chí đạt hoặc “21 kịch bản độc lập”.

## Kiểm tra tối thiểu còn lại

Ưu tiên1: ma trận HTTP trên API cuối với cùng-store A1/A2 và B, staff crossbranch/crossstore PATCH/reset/list, misassigned permission, current branch/permission change; khóa user/store gọi endpoint tổ chức thật và DB read-only before/after bị từ chối.

Ưu tiên2: reset active user có≥2phiên sống, old/new HTTPlogin, refresh từng thiết bị, reset lặp, rollback mỗi mutation có safe DB diagnostic trước/sau; ép lock cả hai lịch reset↔login/refresh và role/disable races. Capture safe application log thật cho successful/failed transaction để xác nhận sau commit và không secret.

Ưu tiên3: fixture PostgreSQL cùng millisecond khác microsecond và timestamps bằng nhau, duyệt toàn bộ branch/table/staff pages exact ID set/order/count/endcursor; filters/emptysets/boundary DTO/string/nullable, missing-role503; DB before/after và querycount theo spec. Bổ sung chứng cứ bằng test được người triển khai sửa theo review; QA không sửa test.

Lệnh tái chạy có sẵn sau khi người triển khai bổ sung checks: `npm test` trong POS_API (có TypeScript build, các integration test tự tạo DB QA ngẫu nhiên theo code hiện tại). Cần DATABASE_URL vào môi trường QA riêng cho phép tạo DB, không in giá trị môi trường/secret. CLI wrapper có sẵn như phần phương pháp; giữ cùng cơ chế DB cô lập. Lượt tương lai phải có run mới, raw stdout/stderr/timestamps/exit/status/manifest và ma trận artifact trước khi chạy theo AGENTS. Không dùng báo cáo audit này thay runner output.

UI PB13 và khóa quỹ sau ca PB06 vẫn deferred đúng thỏa thuận. Sprint3 chưa được Product Owner nghiệm thu/đóng. Tôi không kiểm production, tablet UI hay tác dụng phụ DB mới trong audit này; rủi ro còn lại là độ bảo đảm tenant/session/pagination/log chưa đầy đủ, chưa có bằng chứng một lỗi runtime mới đã xảy ra.

## Cập nhật hồ sơ sau khi agent chính nhận audit

Agent chính đã đối chiếu finding chính, thêm đính chính vào cuối original run/review và ghi gap tại `errors/2026-10-30-pb04-acceptance-evidence-gaps.md`. Plan/task implementation chuyển từ completed trở lại active để theo dõi phần kiểm chứng chưa đủ; các dẫn chiếu completed trong phần phương pháp là vị trí tại lúc QA đọc, không phải khẳng định task vẫn completed. Task lập Sprint3 vẫn completed; không thay lịch/phạm vi hoặc nghiệm thu sprint. Không có sửa source/test/spec hoặc raw log trong bước cập nhật này.
