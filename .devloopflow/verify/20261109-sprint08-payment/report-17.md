# Kiểm AC 20261109-sprint08-payment — vòng 17

## Kết luận

**PASS cho 29 AC của plan trong phạm vi nghiệm thu local, giữ hai chấp nhận có điều kiện V1-4/V11-1 của user.** Không phát hiện FAIL sản phẩm mới. Bảng bên dưới tách từng vế và loại chứng cứ; không suy đầy đủ AC từ số test. Không tick plan, không đóng task hoặc sprint trong vai trò verifier.

- Ngày thực chạy: 11/11/2026; checks 12:46:29–12:50:35 UTC, bổ sung migration 12:52:08 UTC, browser 12:52:17–12:52:29 UTC. Cleanup cuối 12:53:13 UTC.
- Plan: `.devloopflow/approved/20261109-sprint08-payment.md`, header approved và các delta đã duyệt 09/11, 11/11. Spec hành vi `.devloopflow/specs/20261109-sprint08-payment.md` approved; contract hiện hành `specs/invoices.md`. API draft `.devloopflow/specs/20261109-sprint08-payment-api.md` tự ghi là bản nháp lịch sử, không dùng thay contract đã chốt.
- Nhãn: **local do agent chạy, không CI/runner độc lập**. Raw chỉ có local, không đối chiếu được từ remote. HEAD `48ed476528a2db4f46fa379c64476c95b54d4caf`, working tree dirty.
- Không có AC bỏ qua. Một số vế được chứng minh bằng component/integration test và lịch sử có hash phù hợp, không tuyên bố tất cả đã đi qua browser. SePay Live chưa kiểm.

## Tài liệu nguồn đã đối chiếu

`AGENTS.md`; `.devloopflow/devloopflow.md`; `.devloopflow/MEMORY.md`; approved plan và task active; hai spec task; `specs/invoices.md`, `specs/sales.md`, `specs/shifts.md`; phần tiền, scope, transaction, ca của `docs/PRODUCT_OVERVIEW.md`; BR-16/21–27/30–49/56/69–72/81/103–104 trong `docs/BUSINESS_RULES.md`; schema payment/attempt/event/stock và đối soát trong `docs/DESIGN_DB_POS_SYSTEM.md`; envelope/auth/idempotency/errors trong `docs/api-spec.md`; phần POS/thanh toán/đơn đã đóng trong `DESIGN.md`; `THIRD_PARTY_INTEGRATIONS.md`; coverage-audit-20261111.md; report-11..16 và fails.md; errors INDEX và các hồ sơ được dẫn ở mục errors bên dưới. Đọc quy trình `verify-ac/role.md`, `references/ac-verifier.md`, templates report/fails của devloopflow 0.3.6.

Các câu “chờ duyệt”, “chưa QA” trong thân plan/spec cũ được đọc cùng header và Changelog delta. `specs/shifts.md:21` kéo doanh thu CASH vào Sprint08, thay giới hạn Sprint5 ở phần lịch sử bên dưới. Không phát hiện mâu thuẫn nghiệp vụ hiện hành mới cần chọn thay user.

## Môi trường, lệnh và provenance

Quy ước đường dẫn:

- **Q17** = `qa-evidence/20261111-194533-48ed476-s8-verify-ac-r17/`.
- **Q11** = `qa-evidence/20261111-002226-48ed476-s8-verify-ac-r11/`.
- **Q15** = `qa-evidence/20261111-185503-48ed476-s8-verify-ac-r15/`.
- **Q16** = `qa-evidence/20261111-122641-48ed476-s8-verify-ac-r16/`.
- **R12** = `.devloopflow/verify/20261109-sprint08-payment/evidence/r12-live/`.
- **R14** = `.devloopflow/verify/20261109-sprint08-payment/evidence/r14-verify/`.

Q17/run.md có ma trận trước checks và bổ sung trước migration/browser. Windows, Node v22.22.2, PostgreSQL17 container `pos_s8_r12_pg`, đã inspect exited, image postgres:17 và bind riêng 127.0.0.1:15432 trước start. Checks tạo DB base mới `pos_s8_r17_base_*`; suite tự tạo/dọn DB thử của nó theo cấu hình dự án. Migration supplement dùng DB mới `pos_s8_r17_roles_1f7039ea8f`; browser dùng DB mới có tên trong `Q17/r17b-environment.json`. Không xóa DB/volume thủ công.

Checks: `node .devloopflow/verify/20261109-sprint08-payment/evidence/scripts/r17-checks.cjs`. Migration supplement: `node .../r17-roles.cjs`. Browser setup: `node .../r17b-up.cjs` (tái dùng pattern R15), chạy `npm run migration:run`, API `npm start` ở 13217, UI `npm run dev -- --host 127.0.0.1 --port 15327 --strictPort`. Playwright CLI đã có trong npm cache, Chromium/context riêng 1180×820, không đụng profile đang dùng. Không provider/ngrok/Live. Password/secrets chỉ RAM; auth body bị bỏ, không capture login có password; fixture password được đổi sang hash random không giữ sau browser.

Q17/source-manifest-before.json, after.json và after-browser.json: mọi file API/UI source/test trong tập manifest và package/lock/config đã hash giống nhau trước/sau checks và browser. Q17/evidence-audit.json đọc/hash 441 file lịch sử, parse JSON/JSONL và PNG header, không lỗi. So hash hiện tại:

- Q11 manifest có 50 file: API source trong tập này giống, ngoại trừ `foundation.test.ts`; UI `LivePosScreen.tsx` và `live-payment.test.mjs` đã đổi. Không lấy UI Q11 thay UI cuối. Thay đổi foundation là test nền/migration, đã chạy lại full API R17.
- Q15 cả 4 hash (LivePosScreen, live-payment test, sales.service backend, salesService frontend) giống hiện tại; dùng đúng ba ca CANCELLED refresh/table/cancel→B của R15.
- Q16 toàn bộ 187 source/test hash giống hiện tại; dùng browser/network/SQL cuối về preview/CASH/zero/QR/fallback/19–20/session/RF5.
- R14 thiếu hash tại thời điểm gốc. Không suy byte lịch sử từ HEAD dirty/mtime/hash mới. Đã chạy browser mới ba ca R17 thay chứng cứ R14 duy nhất: PAID stale-table, PAID stale-list và pay→B. M1 được chạy lại bằng API integration thật R17; (a),(g) được xác minh component test đúng đường `initialInvoiceId`, không tuyên bố màn Hóa đơn demo đã nối API.

## Kết quả test và chất lượng test

| Lệnh thật / cwd | Start–end UTC | Exit / kết quả | Artifact Q17 |
|---|---|---|---|
| `npm test` / POS_API | 12:46:29–12:50:04 | 0; 155 tests,155 pass,0 fail/skip | api-test.stdout.txt, api-test.stderr.txt |
| `npm run build` / POS_API | 12:50:04–12:50:12 | 0 | api-build.stdout.txt, stderr.txt |
| `npm test` / POS_UI | 12:50:12–12:50:17 | 0;85 tests,85 pass,0 fail/skip | ui-test.stdout.txt, ui-test.stderr.txt |
| `npm run typecheck` / POS_UI | 12:50:17–12:50:22 | 0 | ui-typecheck.stdout.txt, stderr.txt |
| `npm run build` / POS_UI | 12:50:22–12:50:35 | 0 | ui-build.stdout.txt, stderr.txt |
| migration/role supplement | result 12:52:08 | assertions PASS | roles-before.json, roles-after.json, roles-result.json |
| browser supplement | 12:52:17–12:52:29 | 3 tình huống assertions PASS | r17b-browser-results.json, r17b-browser-network.jsonl, r17b-browser-cleanup.json |

`process-results.json` ghi command/cwd/start/end/exit chính xác cho năm package checks; không thay bằng log tự viết. Migration/browser có timestamp/result từ helper, migration stdout/stderr và app command/PID; không tuyên bố có process exit log riêng cho shell khởi chạy supplement vì lượt gọi đó không lưu exit metadata riêng. Assertions và trạng thái cleanup tồn tại độc lập trong artifact helper.

Q17/test-map.md và test-map.json nối **95 tên test thực** với source:dòng và đúng dòng `ok` của stdout R17. Alias quan trọng:

- `test_ST1_migration_roles_constraints`, `test_ST1_existing_data_safe` → test thực `ST-1.AC-1 BR-31/34/44 payment migration preserves data and enforces payment constraints` (`payment.integration.test.ts:13`). Source assert invoice50k, stock10, movement USER giữ actor, unique payment/pending/event và quyền mới. Vế OWNER/CASHIER giữ mọi grant cũ, PLATFORM_ADMIN không pos.sell và promotion row cũ đã bổ sung runtime roles-before/after/result R17; không gán chúng cho assertion vốn không có trong test.
- `test_ST4_promo_race` → `test_ST4_promo_race_and_rollback`; `test_ST6_signature_and_account_scope` → signature/payload + quarantine và ST7 wrong-account/scope; `test_ST6_reference_namespace` → delta schema + missing-reference + manual/webhook race; exception duplicate → ST7 exception visibility.
- `test_ST8_transfer_ui` → `ST8 transfer shows server total, warnings, pending QR, fallback and cancellation` và reload/permissions; network replay → `ST8 network retry keeps key and cash body`; account boundary → `ST8 owner bank settings accept 19 digits and reject 20 before PATCH`; session/terminal và warning/manual nối các test livePOS/reload/manual có assertion tương ứng. Không coi mỗi alias bao phủ toàn AC chỉ vì tên gần giống.
- R2-1 race thực tại `shifts.integration.test.ts:228` lặp `payFirst=true,false`, quan sát hai request chặn lock qua pg_stat_activity, rồi release gate; không dùng sleep để suy thứ tự. Nhánh payment trước:201/200, cashSales50k. Nhánh close trước:409 SHIFT_HAS_OPEN_INVOICES rồi payment201 và close200. Cả hai query DB cuối CLOSED/cashSales50k/1payment. Test này có dòng `ok` trong API stdout R17.
- PAID-DONE1..9b, B39/B40 và MGR-CANCEL1..4 có `ok` thật R17. Component tests mock service boundary; API integration PostgreSQL/HMAC/trigger/race là thật. Không gọi component test thay browser/DB.

## Coverage

Không chạy coverage/lint: manifest/cấu hình không có script hoặc threshold. Không lấy số test làm tỷ lệ coverage. Không thay source/test, không cài dependency.

## Bảng đối chiếu mọi AC và từng vế

Mỗi PASS bên dưới là **Đúng** theo plan/spec hiện hành trong loại chứng cứ nêu rõ. `P` là approved plan; source endpoint lấy `specs/invoices.md` hiện hành (I). `T` là `POS_API/src/sales/tests/payment.integration.test.ts`; `S` là shifts.integration.test.ts; `U` là POS_UI/test/live-payment.test.mjs. Dòng output cụ thể và source nằm trong Q17/test-map.md; HTTP/SQL lịch sử được kiểm lại file, không coi report cũ tự nó là raw proof.

| AC / vế | Mong đợi plan và nguồn nguyên văn | Kiểm/assertion thực, actual và artifact | Kết luận |
|---|---|---|---|
| ST-1.AC-1 quyền | P ST1: MANAGER pos.sell; OWNER/CASHIER giữ cũ; PLATFORM_ADMIN không. `specs/sales.md:17`: “cấp `pos.sell` cho OWNER/CASHIER”; bổ sung MANAGER ở banner:3 | Test T:13 và supplement role snapshot trước/sau migration thật: mọi grant cũ OWNER/CASHIER còn, MANAGER pos.sell có, PLATFORM_ADMIN không; quyền bank chỉ OWNER/manual+exception OWNER/MANAGER đúng. Q17 roles-*.json | PASS |
| ST-1.AC-1 unique và giữ dữ liệu | P ST1/ma trận: payment/lượt QR/giao dịch không lặp, dữ liệu cũ giữ. I:45–48: “một pending mỗi đơn”, “Chống lặp webhook”; PRODUCT_OVERVIEW:175 “một transaction” | T:13 insert/check23514/unique23505 payment/pending/event, invoice/stock/movement trước migration giữ; roles supplement promo row exact deep-equal. API stdout; roles-before/after/result | PASS |
| ST-1.AC-2 | P ST1:19 được,20 CHECK23514, varchar34, không xóa cũ. I:12: “snapshot QR phải gồm 6–19 chữ số” | test_ST1_bank_account_19_limit + bank_snapshot_19_limit T:469/475 assert INSERT/UPDATE19, rejected20 SQLSTATE23514, width34; rerun migration old-preservation. Q17 API stdout | PASS |
| ST-2.AC-1 tổng | P ST2:60k−10k=50k. I:66: “Lấy tổng, hiệu lực mã và cảnh báo kho trước xác nhận” | T:774 assert60000/10000/50000, normalized code; Q11 supplement HTTP SUP-false/true-PREVIEW có đúng2dòng40k+20k và SQL trước/sau | PASS |
| ST-2.AC-1 invalid và warning readonly | P ST2: mã hết hạn/lượt vẫn thấy, không thu; I:66 “không cộng lượt mã/trừ kho” | T:784 giữ invoice_promotion_codes khi dưới min/hết lượt, promotion.applicable=false; T:799 exact MISSING_RECIPE/NEGATIVE_STOCK, movement count không đổi, stock không phát sinh; ST4/6 reject invalid. Q17 output + Q11 HTTP/DB | PASS |
| ST-3.AC-1 zero/replay | P ST3:204 PAID,0payment,1SALE/ingredient. I:74: “PAID/promo usage/stock/movement cùng transaction, không payment” | T:670 concurrent same key, PAID0,key,0payment, exact one SALE−7, stock−7, used_count1; HTTP204/replay header/empty body T:709. Q11 http/db ZERO trước/sau/replay; Q17 stdout | PASS |
| ST-3.AC-1 rollback/scope | P ST3: lỗi giữa chừng rollback. I:74 “key trên invoice”; PRODUCT_OVERVIEW:175 “một transaction” | T:689 injected trigger: OPEN,keyNULL,used_count giữ,0movement rồi same key retry được; T709 pending/shift/empty/nonzero/scope. Q17 stdout và test source | PASS |
| ST-4.AC-1 cash | P ST4:50k,tender100k→201/change50k. I:70 “replay cùng key/nội dung giữ status 201/data” | T545/600 asserts totals/payment1/SALE1/promo1; HTTP201 payload exact; Q11 CASH/REPLAY HTTP+DB; Q16 committed cash201/replay network+DB deep-equal | PASS |
| ST-4.AC-1 replay/collision/parallel/failure | P ST4 cùng key/body replay true DB không đổi; I:70 “unique key/invoice ngăn lặp” | T545 parallel same key samepayment + replay closed shift; T587 cash/zero collision1winner; T560 wrong amount/tender/shift/scope rejected no payment; T572 trigger rollback. Q17 stdout; Q16 RF5 | PASS |
| ST-5.AC-1 lifecycle/locks | P ST5 reloadA,cancelA→B≠A, item/promo409. I:34–35 “Tải lại đọc đúng lượt đó” | T976 HTTPA201/GETdeepEqual,OPEN/no payment/stock,cancel204/Bdifferent; T814 promo/edit409. Q16 browser A pending/reload/cancel/B/lock/reload PNG+JSON/network/db | PASS |
| ST-5.AC-1 terminal replay | P ST5 replay CANCELLED/PAID không tạo mới/không hiện pending. I:86: “qrImageUrl=null nếu đã CANCELLED/PAID” | T1039 replay same id/ref current statusCANCELLED thenPAID,qrnull,attemptcount1,pendingGETnull; UI poll tests R5-1 và reload/state clear. Q17 stdout; không tuyên bố browser forcing terminal replay mới | PASS |
| ST-5.AC-2 | P ST5 OWNER PATCH19/GET/QR snapshot/QuickLink;20→422 field giữ cũ. I:122 “accountNumber 6..19 chữ số” | T920 HTTP19 exact,QR account19/URL19,20field422/DB giữ; Q16 settings19-success*,settings19-C-fallback*, api20-response, browser-network/db exact snapshots | PASS |
| ST-6.AC-1 amount/atomic | P ST6 50k/60k paid;49999 không. I:35 “payment.amount bằng total” | T1385 under49999+1 không cộng dồn,OPEN0payment; exact50k SYSTEM−2 actorNULL,key/hashattempt;over60k payment50k/excess10k. Q11 EXACT/UNDER/OVER HTTP+DB; Q17 stdout | PASS; provider điều kiện riêng |
| ST-6.AC-1 late/promo | P ST6 QRcancel/promoinvalid giữOPEN+exception. I:35 “PROMOTION_INVALID” và “đơn chưa PAID” | T1416 canceledA/Bpending,0payment,eventscope; T1445 promo exhausted OPEN/no payment/SALE/used_count giữ; B15 last-use2QR chỉ1được; Q11 RF2/RF4 HTTP+DB,Q16 lateA exceptionUI+DB | PASS |
| ST-6.AC-1 dedupe/HMAC/rollback | P ST6 sameid DB không đổi; I:35 “mỗi sự kiện id chỉ được xử lý một lần” | T1437 parallel id2responses200,1event/payment/movement; T1272/1322 and B13 malformed/body/signature/timestamp no mutation; T1460 trigger500 rolls event/payment/SALE/invoice then retry200. Q17 stdout,Q11 RF1 HTTP/DB | PASS |
| ST-6 delta missing-reference | P delta: fallback SEPAY:id kindSEPAY_EVENT,provider_referenceNULL; rejected conditions giữ. I:8 “referenceCode rỗng dùng SEPAY:<id>” | T1188 ''/whitespace50k/60k,kind/ref/actual/excess/eventnull/replay,promo used once; BANK literalSEPAY:id coexist;wrong/canceled/under/invalid0payment. Q17 stdout,T1171 schema namespace CHECK | PASS |
| ST-6 delta duplicate/race/visibility | P delta đúng1BANK payment,duplicate event scope sau,ACKcommit,2race onePAID/oneOPEN | T1226/1253 asserts exact200 ACK,OPEN/PENDING/noPAY/SALE, scoped DUPLICATE, duplicate-trigger rollback500, retry; two branch concurrentonePAY/events2 and replay; T332 OWNER/MANAGER scope/CASHIER403/otherstoreempty. Manual/webhook both sequential orders T355. Q17 stdout | PASS |
| ST-7.AC-1 actor/ca gốc | P ST7 MANAGER không ca/OWNER đủref/reason/amount→paid giữ ca. I:36 “Giữ ca gốc trên hóa đơn; ghi actor xác nhận” | T265 manager201,snapshot work_shift_id gốc,confirmed_by/reason/created_by/BANK exact;T289 OWNER201/crossbranch access_all;Q11 RF3 HTTP/DB. Q17 stdout | PASS |
| ST-7.AC-1 scope/replay/invalid | P ST7 otherbranch blocked; I:110 “không đòi ca riêng nhưng kiểm store/branch” | T289 cashier403/otherbranch+tenant404/no payment; T298 invalid422/refreused409/keycollision/shiftclosed/promo; T265 replay201true/same data + latewebhook200 payment1/SALE1;T383 rollback;T332 exceptionvisibility. Q11 HTTP/DB,Q17 stdout | PASS |
| ST-8.AC-1 preview/tablet | P ST8 preview50k+warning; I:18 “cảnh báo kho do server tính” | Q16 r16-cash-preview PNG/JSON 1180×820, GETpreview60000−10000=50000/NEGATIVE_STOCK beforeconfirm; U44 warning/assertserver totals. Source187hash exact | PASS |
| ST-8.AC-1 cash/zero response | P ST8 chỉ success sau201/204. I:33 “trả 201 hoặc replay 201”; “204, không tạo payment” | U52/66 delayed promises no earlysuccess; Q16 uncertain cash then replay201success; zero before/afterPOST204+DBPAID0payment; Q17 fresh S1 cash201 deselect. Network+DB, không chỉ ảnh | PASS |
| ST-8.AC-1 QR/reload/fallback | P ST8 pending≠paid/reload same. I:34 “đơn vẫn OPEN”; I:38 “UI luôn còn bank/account/amount/reference” | Q16 A/B/C pending/reload/fallback full19digit, serverGETsame ref,0payment and no extraPOST; U44/60 current pass | PASS |
| ST-8.AC-1 retry/session/manual | P ST8 lỗi mạng samekey/body; mục tiêu identity. I:24 “không nhận ... tài khoản nhận từ browser” | Q16 cash route.fetch commit then abort; samekey/body retry201 true,DBdeepEqual; cashier→OWNER→otherstore/reload no oldstate. U77/117 permissions/manual details. Auto/manual browser giữ V11-1 accepted scope | PASS; có điều kiện lịch sử |
| ST-8.AC-2 | P ST8 UI19save/fallback nguyên;20fielderror,noPATCH,nooverwrite. I:12 “6–19 chữ số” | Q16 settings19-success/reload/C fallback +20 before/after error,network noPATCH20,DBdeepEqual; direct API20 riêng422. UI organization-screen:104/117/139 R17pass | PASS |
| ST-8.AC-3(a) | P delta(a):nonOPEN menu locked/noaddItem/hide+,−,delete,cancel,transfer,pay. I:39 “chỉ đơn OPEN ... mới thêm/sửa/xóa món” | U332/355 attempts onClickassertaddItem0/disabled/hidecontrols; B40 DINE_IN transfer hidden; Q17 UI stdout. Đây là component trên initialInvoiceId vì app không còn đường công khai chọn terminal | PASS ở mức component |
| ST-8.AC-3(b) | P delta(b):refreshPAID/CANCELLED deselect+instruction. I:39 “UI bỏ chọn đơn” | U344/418 PAIDread/removefollowup; Q16 cash/zero refreshselection; Q15 R1 CANCELLED external API→reloadmenu disabled + DBunchanged. Hash Q15 relevantfiles exact | PASS |
| ST-8.AC-3(c) | P delta(c):performterminal clear+notice+refresh;OPENkeepselected. I:39 “Sau khi thanh toán hoặc hủy thành công UI bỏ chọn” | U366/377 CANCELLED andOPEN;B40performPAIDnoticeĐơnđãđóng;Q15 R3 cancelnotice/desel/refreshedlist;Q17 freshS1 paid result. R17 test output | PASS |
| ST-8.AC-3(d) | P delta(d):staletablePAID/CANCELLED→freshDINE_IN;realOPENopens. I:39 “bàn coi là trống” | Fresh Q17 S3: savedmapA thenexternalPAY201;clickGETAPAID→POSTDINE_IN201 B correcttable;DB Aexactsame. Q15 R2 CANCELLED same flow;U386/397 realOPEN noPOST. Q17 S3 PNG/JSON/network/audit +Q15 | PASS |
| ST-8.AC-3(e) | P delta(e):listedterminal notselected,refresh+exactnotice;OPENstillopens. I:39 “không chọn đơn mà server báo đã PAID/CANCELLED” | Fresh Q17 S4 serverApaid whilelisted;GETAPAID,GETlist,exactnotice;Aabsent,previousOPENselectionkept,DBunchanged. U403/412 both terminal/OPEN. Q17 S4 before/after PNG/JSON/network/DB | PASS |
| ST-8.AC-3(f) | P delta(f):OPENnoQRadd;pendingQRstilllocked. I:39 nútThanh toán chỉ mởlạiQR | U319/326 current addcall1/noQR,disabledpending;Q17 S1 Badd201;Q16 QR-blocked body/UI/network/DB | PASS |
| ST-8.AC-3(g) | P delta(g):initialInvoiceIdPAIDviewonly. I:39 “Đơn đã đóng mở từ màn Hóa đơn chỉ để xem” | U355 initialInvoiceIdPAIDnoadd/hidecontrols +B40DINE_IN;R17UIpass. Chưa qua mànHóa đơn demo thật, nằm ngoài delta; chỉ xác nhận contract component nhận initialInvoiceId | PASS ở mức component |
| AC-M1 cóca | P deltaM1: MANAGER ownOPENcashiershift→cancel200 actor. `specs/sales.md:17`: “vẫn cần ca CASHIER OPEN của chính người gọi” | MGR-CANCEL1 HTTP200+CANCELLED/cancelled_by exact; source test không manual grant,permissions từ migration; Q17APIstdout | PASS |
| AC-M1 kh?ng ca / kh?c branch | P deltaM1:noownshift409;otherbranch404;DBunchanged | MGR-CANCEL2/3 SQLbeforeafterexact,SHIFT_NOT_OPEN/NOT_FOUND;4 revokedpermission403. Source manager-cancel integration, Q17 APIstdout; không dùng R14hashthiếu | PASS |
| E2E-AC-1 tổng/scope | P E2E1:2rows40k+20k−10k=50k;no permission/shift/crosstenant cannotmutate. I:58 “đơn cùng branch ca” | Q11 supplementSUPpreview +HTTP/DB2rows; T774/824/936/B16 scopes, salesHTTP and authpermissions full suite;Q11 SCOPEother/manager2404/admin403. Same API source hash;Q17 actual pass | PASS |
| E2E-AC-2 | P E2E2:cash50k100k/change50k/replaypayment/promo/stockonce. BR32: “không phải số khách đưa” | T545/600+Q11 CASH/REPLAY;Q16 RF5snapshot before/committed/retrydeepEqual1payment/SALE/promoonce. Q17 runnerpass | PASS |
| E2E-AC-3 | P E2E3:FREEpromo204/PAID0payment1SALE,replay,rollback. BR104 “không tạo payment” | T670/689/709 sourceassertions as ST3;Q11 ZERO HTTP/DB;Q16 zerobrowser response204+DB. Q17 runnerpass | PASS |
| E2E-AC-4 | P E2E4:QR50kOPEN,exact/under/over/promoexception. I:35 “Chỉ một giao dịch ... amount ≥ total” | T1385/1445+B15+Q11 HTTP/DB exact50/under49999/over60 andusedcount/movement;Q16 createOPEN0payment. Provider5cases r12-provider preserved under V1-4 usercondition, not rerun/Live | PASS; V1-4 condition giữ |
| E2E-AC-5 | P E2E5:cancelA/newB,AlatecannotpayB,exception,reloadB/editlock. I:35–38 canceledref noPAID | Q16 browser cancel204,B201different,reloadsameB;lateAACK200/ATTEMPT_CANCELLED/BPENDING/OPEN/noPAY/SALE;OWNER exceptionvisible;T1416/APIpass. All Q16source hash187exact | PASS |
| E2E-AC-6 | P E2E6:manager/ownerconfirmactor/ref/reason,shiftgốc,lateonce. I:36 “Webhook đến sau ... không tạo payment/trừ kho lần nữa” | T265/289/355 assertsactor/originalshift/manualreplay/latewebhook1PAY1SALE and bankrace bothorders;Q11 RF-3HTTP/DB;manualbrowser acceptedV11-1 preserved. No provider lateaftermanual claimed | PASS; V11-1 condition giữ |
| E2E-AC-7 | P E2E7:19PATCH200DB/snapshot/fallback;20PATCH422field/accountandattemptunchanged | T469/475/920;Q16UI19+QR C19/fallback screenshot,API20response422,DBdeepEqualbank+attempt. NoPATCH20appliesUIvalidation;API20separatecall | PASS |
| E2E-AC-8 thanh toán→B | P E2E8:payA→deselect/menu locked→createB/addonlyB/Aimmutable. DESIGN:228 “Khách mới thì tạo đơn mới” | FreshQ17 S1:PAY201,notice+menu disabled,POSTB201empty,POSTBitems201,DBAPAIDrowdeepEqualsau B;B0→1item25k. r17bS1 PNG/JSON/network/SQL | PASS |
| E2E-AC-8 hủy→B/bàncũ | P E2E8 cancelA→newB/Aunchanged;stalePAIDtable→new. DESIGN:228 “tải lại danh sách và coi bàn là trống” | Q15 R3 cancel200→deselect→POSTB201→POSTBitems201,Aexactunchanged;freshQ17 S3 PAIDtable→newDINE_IN/Bcorrecttable/Aunchanged. U451/455 paynewcustomer branchhi?n t?i PASS | PASS |
| R2-1.AC-1 exact snapshot | P R2AC1:opening100k,cashamount50k,tender100k,count150k→MATCHED,repeatnotdouble. `specs/shifts.md:21`: “cộng payments.amount phương thức CASH” | Q11 supplementfalseCLOSE HTTP200andSQL exact50/150/0MATCHED,no note;CASHreplay separate proofsinglepayment. Q17 S154 normal/force includesCASH50k,tender100k andconcurrent2k52k;not falselycalling52kexact50k | PASS |
| R2-1.AC-1 exclusions/nosale | P R2AC1 excludeTRANSFER/zero/CANCELLED/otherca/branch;nosaleexpectedopening. BR56 formula `ca=<ca>` | S154 fixturesTRANSFER10k,zero0,CANCELLEDcash9k notincluded;twoforceshifts/scope DBseparation;SHIFT04/05 nosaleopening;Q11 supplement2branchesexactcase+R12AC1trans/zero/cancel. Q17APIpass | PASS |
| R2-1.AC-2 snapshot/actor/reason | P R2AC2 force150kMATCHED,closed_by/reason. specs/shifts:21 “đóng thường hoặc cưỡng chế” | Q11 supplementtrueCLOSE opening100k cash50 count150 snapshotMATCHED,closed_byOWNER/reason;S154+SHIFT07forceactor/reason255 persisted. Q17pass | PASS |
| R2-1.AC-2 quyền/required/closed/STAFF | P R2AC2 scope, counted thi?u, ca CLOSED theo contract c?;STAFFnoreconciliation | SHIFT01STAFFnullrecon/SHIFT07/08 requiredfields/scope;R12FORCE-SCOPE/CASHIER403/CLOSED409;Q17APIallassertionspass. Scope/APIsourceidenticalQ11;no assumptionmanagerneedsownshiftforforce | PASS |
| R2-1.AC-3 rollback | P R2AC3 reconciliation/shift saveerror→OPEN/snapshotunclosed. PRODUCT_OVERVIEW:175 “một transaction” | CurrentS154 BEFORE UPDATE work_shifts trigger raises500afterreconciliationwrite,SQLshowsOPEN/PENDING/expectedNULL fornormal/force. R12ROLLBACK additionally used BEFORE UPDATE cash_reconciliations trigger,actual500OPEN/PENDING/NULL. Source/codeassertionscurrent+historicalHTTP/SQL read | PASS |
| R2-1.AC-3 both lockorders | P R2AC3 payment/close serialize,snapshotonce;closecannotpassOPEN | CurrentS228 loops true/false,observedwaits1then2lockqueries,firstpay201/close200;firstclose409OPEN/payment201/reclose200;finalSQLCLOSED/cashSales50000/payment1both. Q17stdoutok exact name. Not based on test count orsleep | PASS |
| R2-1.AC-3 đếmmù | P R2AC3 khônglộexpectedtrướccounted; PRODUCT_OVERVIEW:188 “không gửi tiền kỳ vọng” | S154 GETexpectedCashnullbeforecount;SHIFT04 +UIshift tests;Q11 r2-blind-before-counted.json/network/PNGcurrentrelevantfileshashsame. No derivedexpectedUIbeforeinput | PASS |
| RF-1 | P RF1 sameSePayidnosideeffect2nd | Q11 RF-1 HTTP/SQL replay;T1437parallelidexact1event/PAY/SALE;missing-refdiscountpromoonceT1188;Q17pass. Providerrepeatidnotclaimed,acceptedV1-4 | PASS |
| RF-2 | P RF2 oldAaftercancelBOPEN+exception | FreshappQ16lateA200eventATTEMPT_CANCELLED,invoiceOPEN/BPENDING/0PAY/SALE+OWNERexception;T1416hi?n t?i PASS | PASS |
| RF-3 | P RF3 MANAGERwithoutshiftstillstore/branchbound | T265manager201noca,289cashier403/branch+store404;Q11 RF-3 HTTP/DB;Q17pass | PASS |
| RF-4 | P RF4 exhaustedpromocannotremove/chargefullprice | T572 invalidpromo422noPAY/SALE;T1445OPEN/noeffects/promoattached;B15one-useQRwinner/loser;Q11 RF-4HTTP/DB;Q17pass | PASS |
| RF-5 | P RF5 lostresponseaftercommit→samekey/loadstate/noPAY2 | Q16 rf5-committed-response.json201;uncertainPNG/JSON;networksamekey/body/replaytrue;DBbefore-retry/afterdeepEqualonePAY/SALE/promo;U52currentR17pass | PASS |

## Đã đối chiếu errors / MEMORY / exploratory

Đọc INDEX và các hồ sơ payment/scope/dialog/secret/errors/test-gap/account/state liên quan. Q17 full suites chạy lại các tình huống lỗi cũ qua tên thực trong test-map: R1-1/R3-1 access_all và B2/B16/B23/B27 nullbranch/permission; R1-2 Dialog focus/escape/uncertain; R2-1 CASH reconciliation; V1-1 malformed JSON; V2-2 unsigned; V3-1 messages/V3-2 wrong-account scope; B1/R5-1/R7-2 pending/poll/uncertain; B3 nonOPENpreview; B4/R6-1 secret failclosed/placeholder; B7 UUIDuppercase; R7-3/B19 webhookpath variants; B10 authrefresh fixture; B11/B24 eventcollision; B12 promotionmessage; B13 timestamp/body/signature negatives; B15last-usepromo; B17/B21preview reload; B29/B30/B31/B34fieldvalidation; R14-1 cashcap/concurrency; PAID-DONE/B39/B40/MGR-CANCEL current branches. Browser exploratory mới đúng stale-table/stale-list/pay-nextcustomer; Q15 CANCELLED và Q16 pending/retry/session/accountđã có hash phù hợp. Không nói mọi test-only/docs-only issue có browser riêng.

V12-1: chín ID user yêu cầu ghi bù B13/B15/B16/B18/B20/B25/B28/B32/B33 hiện có hồ sơ liên quan trong INDEX; các hồ sơ B22/B23/B24/B26/B27 cũng có. Giữ quyết định ghi bù và lịch sử PASS. R4-2/R4-4 là sửa metadata tại chỗ, task/sổ đã ghi lý do; V1-2/V1-3/V2-1 có lịch sử chi tiết ngay fails.md theo xử lý trước. Không tạo lại lỗi đã có. Những câu “chưa có file” trong report13 là trạng thái lịch sử, không gọi đó là thiếu hiện tại.

M1 scope kiểm nhiều entrypoint bằng tests; M2 missing/trùng ref/namespace và giới hạnprovider giữ đúng; M3 pending/uncertainreset/poll kiểm suites+Q16; M4 error contract so I/current API spec; M5 trạng thái plan/docs do root cập nhật sau report, verifier không tự sửa; M7 sandbox đã được root cho phép và inspect trước start. Không đọc graph cũ làm bằng chứng source/test; chỉ đọc paths đã biết và dùng rg cho literal/test labels/docs.

## Đối chiếu spec cấp tính năng

| Mục nguyên văn / nguồn | Loại | Chứng cứ và kết quả |
|---|---|---|
| “server tính lại tổng từ snapshot dòng món” (spec task:21) | Mục tiêu | ST2/E2E1 preview60−10=50; invalidclientmoney/APIvalidation; PASS |
| “replay cùng yêu cầu trả kết quả cũ” (task:23) | Mục tiêu | CASH/zero/QR/manual/HMACdedupe tests+Q11/Q16 RF-5; PASS |
| “gộp từng nguyên liệu, ghi SALE ... một lần” (task:24) | Mục tiêu | zero−7/cash/webhook/manual movement/stock tests+DB; rollback/race; PASS |
| “UI tablet ngang ... lấy tổng từ server” (task:25) | Mục tiêu/ràng buộc | Q16 1180×820preview/CASH/zero/QR/fallback/session +freshQ17; PASS |
| “Sau khi thanh toán hoặc hủy thành công đơn bị bỏ chọn” (task:26) | Mục tiêu | Q17 S1+Q15 R3 andPAID-DONE; PASS |
| “tiền đến theo mã lượt đã hủy ... báo quản lý xử lý” (task:27) | Mục tiêu | Q16lateAevent+OWNERUI; manual/exception tests; PASS |
| “một giao dịch ... bằng hoặc lớn hơn tổng đơn” (task:28) | Ràng buộc | ST6underpartialnotcombined/exact/over/promo; PASS |
| “không lẫn dữ liệu phiên cũ” (task:25) | Ràng buộc | Q16logout→same-storeOWNER→otherstore/reload nooldstate,UItests; PASS trong chuyển phiên đã chạy |
| “payment hai lần ... trừ kho hai lần” và “UI báo thành công khi mới hiện QR” (task Phản mục tiêu) | Phản mục tiêu | Không gặp trong HTTP/SQL/browser/suite trường hợp đã chạy; acceptedproviderlimitsgiữ |
| “đơn mới ... bị gộp vào đơn đã thanh toán” (task:37) | Phản mục tiêu | Q17 S1requestitemsBonly/APAIDunchanged,Q15cancelB; PASS |
| “không bật giao dịch ngân hàng Live” (task:33) | Phi mục tiêu | Chỉ sandboxlocal/RAMcredentials; PASS trong lượt này |
| Store/branch từ danh tính;bigint/transaction;HMAC (task Ràng buộc) | Ràng buộc | APIpermissions/tenant/moneyCHECK/atomictrigger/concurrency/HMACrealtests; không có bằng chứng thay đổi ngoài phạm vi |

## FAIL / bug và lệch tài liệu

Không có FAIL mới hoặc AC chưa xác minh trong phạm vi 29 AC, với mức chứng cứ và hai điều kiện được nêu công khai. Giữ V1-4/V11-1 là **PASS theo user chấp nhận**, không biến chúng thành xác nhận độc lập hay chạy provider mới. Không yêu cầu user chấp nhận lại. Giới hạn gồm dashboard văn bản, chưa replay cùng event id từ provider, promo hết hạn bằng SQL, thiếu network browser auto-PAID lịch sử, viewport1407px của r12 và chưa webhook muộn sau manual qua provider. HMAC local không thay bằng chứng provider; Live chưa kiểm.

Không phát hiện lệch tài liệu nghiệp vụ mới. Tiến độ trong plan/task/sprint còn câu “chưa QA/chưa triển khai” là hồ sơ cần root cập nhật; không sửa trong vai trò verifier. Ghi thêm lịch sử R17 vào fails.md, không xóa hoặc đổi điều kiện các mục đã PASS.

## Audit artifact, cleanup và bước tiếp theo

Đã đọc JSON/JSONL/network/SQL được dẫn, kiểm file tồn tại/parse/hash bằng Q17/evidence-audit.json; đã mở trực tiếp ảnh mới S1 saupay/sauBadd, S3stale/saucreate, S4afterrefresh. Các ảnh mới khớp snapshotURL/viewport/UI/network/DB; không dùng ảnh đơn lẻ chứng minh tác dụng phụ. Q15/Q16 audit gốc và source hash được kiểm lại; raw lịch sử vẫn chỉ local. Parser helper test-map ban đầu không xử lý apostrophe escape trong tên PAID-DONE9, đã sửa parser artifact và chạy lại assertions95mapped; không sửa test/source và không coi lỗihelper là lỗisản phẩm.

Q17/cleanup-final.json: container trở về exited, không listener13217/15327/15432; Chromium/context đóng; đúng process API/UI helper đã dừng, m?t kh?u fixture ?? v? hi?u h?a, không xóa DB/volume hoặc processngườikhác. Sourcehash sau browser giống trước. Chỉ Markdown summary/report có thể commit; raw/scripts/PNG/JSON/log giữ local theo AGENTS.md.

Root có thể dùng bảng này cập nhật tick từng AC plan và hồ sơ tiến độ sau semantic Graphify update. Chưa nghiệm thu cấp sprint/S8 tổng thể, chưa sync-docs/toàn bộquytrìnhđóngtask, chưa commit/push, chưa có CIđộc lập. Các lệnh tái chạy package đã ghi đầy đủ ở Q17/run.md/process-results.json; cần DATABASE_URLsandboxlocal có quyền tạo DB cho API.

Audit cu?i: `Q17/final-artifact-audit.json` ??c/hash 77 artifact m?i v? 45 h? s? errors; JSON/JSONL/PNG ??c ???c, kh?ng ph?t hi?n JWT ho?c URL DB ch?a credentials theo m?u scan. ?? m? th?m ?nh Q16 preview, fallback C 19 ch? s?, l?i field20 v? Q15 h?y ??n/menu kh?a trong l??t R17.
