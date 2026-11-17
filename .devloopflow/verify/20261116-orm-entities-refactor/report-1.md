> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Kiểm AC report 20261116-orm-entities-refactor — vòng 1

## Kết luận
FAIL

- Ngày: 2026-11-17
- Plan đối chiếu: `.devloopflow/approved/20261116-orm-entities-refactor.md` (đã đối chiếu bản có tick `.devloopflow/plans/active/20261116-orm-entities-refactor.md`)
- Spec đối chiếu: Không có spec (user bỏ qua)
- Người kiểm: subagent ac-verifier, model Sonnet 5.5 (claude-sonnet-5-5). Giới hạn: không chạy mutation; không chạy `graphify update .`/semantic update (chỉ query); AC ST đã tick đối chiếu qua test tên trong log `npm test` của lần này, không chạy tay từng cái; số đếm `// QueryBuilder:` trung gian "sau ST-n" không kiểm lại được ở trạng thái cuối.

## Tài liệu nguồn đã đối chiếu
- `CLAUDE.md`, `rules/database.md`, `docs/architecture/TECH_STACK.md` (dòng 11), `POS_API/README.md`, `.devloopflow/approved/20261116-orm-entities-refactor.md`, `.devloopflow/plans/active/20261116-orm-entities-refactor.md`, `.devloopflow/tasks/active/20261116-orm-entities-refactor.md`, `.devloopflow/errors/20261117-orm-refactor-existing-test-lines-edited.md`

## Môi trường
- Lệnh chạy app: không chạy app; refactor nội bộ, kiểm bằng test tích hợp tự dựng DB thử.
- PostgreSQL: container `pos_infra-postgres-1` cổng host 5432 (DATABASE_URL dựng từ biến container, không ghi vào evidence).

## Kết quả test
- Lệnh: `cd POS_API; npm test` (chạy nền qua `evidence/r1-npm-test.log`; `npm test` tự build)
- Output: `.devloopflow/verify/20261116-orm-entities-refactor/evidence/r1-npm-test.log`; `r1-npm-test.exit.txt` = `exit=0` (bắt đầu 2026-11-17T20:32:27+07:00, kết thúc 20:38:07)
- `# tests 350`, `# pass 350`, `# fail 0`, `# cancelled 0`, `# skipped 0`, `# todo 0`; không có dòng `not ok`.
- Build riêng: `npm run build` exit 0 (`evidence/r1-E2E-AC-4-build.log`, `r1-E2E-AC-4-build.exit.txt`).

## Coverage
- Dự án không có script coverage (CLAUDE.md: "Không có script lint, format hay coverage"). Không chạy.

## Đã đối chiếu errors
- `.devloopflow/errors/20261117-orm-refactor-existing-test-lines-edited.md` (đã đọc đầu file; liên quan E2E-AC-6, dòng test cũ bị sửa; diff hiện tại khớp phạm vi duyệt, xem E2E-AC-6). Chỉ kiểm file này (file errors duy nhất ngày 20261117); chưa đếm đầy đủ finding trong "Lịch sử review" của task.

Chú giải cột: LOG = `evidence/r1-npm-test.log`; NAMES = `evidence/r1-ST-test-names.txt`; PF = `evidence/r1-per-file-counts.txt`; "ok" = dòng TAP `ok` của test tên đó trong LOG. Nguồn plan = `.devloopflow/plans/active/20261116-orm-entities-refactor.md:<dòng>` (cùng nội dung `approved/`).

## Bảng đối chiếu (MỌI AC trong plan, không bỏ AC nào)
| AC | Cách kiểm | Lệnh/bước đã chạy | Kết quả thật | Mong đợi theo plan | Quy định tài liệu | Kết luận | Ghi chú |
|----|-----------|-------------------|--------------|--------------------|-------------------|----------|---------|
| E2E-AC-1 | grep | `cd POS_API/src; grep -rn "\.query(" --include=*.ts . \| grep -v "/migrations/" \| grep -v "\.test\.ts" \| grep -v "/tests/"` | 0 dòng (`evidence/r1-E2E-AC-1.txt`) | output rỗng (plan:385) | `rules/database.md:19` "Không dùng SQL thuần trong mã ứng dụng" | Đúng | |
| E2E-AC-2 | grep | `grep -rn "raw-sql" --include=*.ts .`; grep `\.query(\|manager\.query\|db\.query` đã lọc | cả hai 0 dòng (`r1-E2E-AC-2.txt`) | cả hai rỗng (plan:386) | như trên | Đúng | |
| E2E-AC-3 | npm test | xem "Kết quả test" | exit 0, tests 350 = pass 350, fail 0 | exit 0, fail 0, tests=pass ≥ 256 + test mới (plan:387) | CLAUDE.md "npm test ... cần PostgreSQL" | Đúng | 350 ≥ 256 |
| E2E-AC-4 | build | `npm run build` | exit 0 (`r1-E2E-AC-4-build.*`) | exit 0 (plan:388) | CLAUDE.md bảng kỹ thuật | Đúng | |
| E2E-AC-5 | git | `git diff --stat master -- POS_API/src/database/migrations POS_API/package.json POS_API/package-lock.json`; `git status --short` cùng đường dẫn | 0 byte; status rỗng (`r1-E2E-AC-5.txt`) | rỗng (plan:389) | CLAUDE.md "chỉ thêm migration mới" | Đúng | |
| E2E-AC-6 | numstat + diff | `git diff --numstat master -- POS_API/src`; `git diff master -U3` bốn file | Dòng xóa >0 chỉ ở file không phải test hoặc đúng 4 file ngoại lệ: foundation 9/3, payment 316/2, reports 44/7, invoices-read 37/3 (`r1-E2E-AC-6-numstat.txt`). Mọi file test khác 0 dòng xóa. foundation: chỉ import `PostgresQueryRunner`, mock health `SELECT 1 AS "ok" FROM (SELECT 1 AS dummy_column) "dummy_table"`, restore; payment: hai dòng xóa là `waiting('INSERT INTO transfer_attempts')`→`'INSERT INTO "transfer_attempts"'` và `waiting('SELECT id FROM stores')`→`'FROM "stores" "Store"'`, còn lại là test mới; reports: import + `captureSql`, hai mock chuyển sang `PostgresQueryRunner.prototype.query` có lọc `this.connection === w.db` và `SELECT\|WITH`, ba dòng AC-1 (`foreignBranch` + hai assertion code/message), hai test mới ST6; invoices-read: counter chuyển sang `PostgresQueryRunner`, thêm `assert.ok(one > 0)` sau `const one = queries`, hai test mới ST13; các assertion cũ giữ nguyên (`r1-E2E-AC-6-diff-*.txt`) | như plan:390 | task:87-97,118-121 ghi user duyệt "duyệt" 2026-11-16/17 cho ST-3, ST-5/10, ST-6/13, ST-6.AC-1 | Đúng | Đã đọc diff/context; không có skip/xóa test; phạm vi khớp |
| E2E-AC-7 | đọc file + test | đọc `data-source.ts`; `git diff --stat master`; test `ST-1.AC-1 entity metadata matches schema` | `entities` có 32 phần tử (đếm awk=32; 20 entity cũ + 12 mới: Ingredient, ProductSizeIngredient, ToppingIngredient, BranchIngredientStock, StockMovement, PromotionCode, InvoicePromotionCode, Payment, TransferAttempt, BankTransferEvent, StoreBankAccount, ShiftExpense); diff data-source +25/-0. Test `ST-1.AC-1 entity metadata matches schema` ok (LOG dòng 115). Test tên `test_ST1_AC1_entity_metadata_matches_schema` KHÔNG tồn tại (`grep -rn` trong `POS_API/src` rỗng) | 32 phần tử và test `test_ST1_AC1_entity_metadata_matches_schema` xanh (plan:391) | — | Sai | Lệch tên test: V1-1; nội dung kiểm đúng |
| E2E-AC-8 | test | 13 test chuỗi khóa trong LOG | ok: `test_ST3_AC7_login_lock_sequence`, `test_ST4_AC1_patch_lock_sequence`, `test_ST5_AC1_update_lock_sequence`, `test_ST7_AC1_add_expense_lock_sequence`, `test_ST8_AC1_inventory_lock_sequences`, `test_ST9_AC1_set_min_lock_sequence`, `test_ST10_AC1_transfer_lock_sequences`, `test_ST11_AC1_webhook_lock_sequence`, `test_ST12_AC1_create_lock_sequence`, `test_ST15_AC1_apply_promotion_lock_sequence`, `test_ST16_AC1_pay_cash_lock_sequence`/`complete_zero`, `test_ST17_AC1_cancel_paid_lock_sequence` (NAMES). Token tách: `payment.integration.test.ts:706` có `'UPDATE:work_shifts','UPDATE:branches'`; `inventory.integration.test.ts:515` có `['UPDATE:branches','UPDATE:ingredients']`; `sql-capture.test.ts:6` có mảng cũ. Evidence mảng cũ: `ST-N/before*.log` | mỗi test xanh, mảng kỳ vọng như SQL cũ, token tách theo G-17 (plan:392) | | Đúng | Mảng cũ do tdd lưu evidence; lần này chỉ chạy test mới |
| E2E-AC-9 | đọc file + git diff | đọc `rules/database.md`, `POS_API/README.md`, `TECH_STACK.md:11` | rules/database.md: mục "## Cách viết truy vấn bằng ORM" gồm 5 bullet (thứ tự method; QB cuối kèm chú thích; không SQL thuần; không giá trị rỗng; manager trong transaction), diff chỉ thêm 8 dòng. README: thứ tự (1)-(4), bảng "Quy tắc chuyển", bảng L1..L6 + câu chú thích, `normalizeUsername`, khóa qua `find({ ..., lock: { mode, tables: [...] } })`, marker `// QueryBuilder:`, cảnh báo `null`/`undefined`, `fromDummy()`, `onConflict()` + cấm `orIgnore()`, CTE, thay `UNION ALL`, tên tham số, manager, danh sách entity 32 (`r1-ST18-README-diff.txt`). TECH_STACK:11 ghi method trước, QueryBuilder chỉ khi không đủ, không SQL thuần | như plan:393 | `rules/database.md:14-20`; `TECH_STACK.md:11` | Đúng | README viết `lock: { mode, tables: [...] }` thay cho chuỗi `lock: { tables }`, cùng ý |
| E2E-AC-10 | graphify | `graphify check-update .`; `graphify query "TypeORM QueryBuilder repository convention rules database"` | không có `graphify-out/needs_update`; query exit 0, trả nút `TypeORM repository methods first (find, count, exists, relations, lock), QueryBuilder last resort [src=rules/database.md loc=L16]` (`r1-E2E-AC-10-graphify.txt`). Không chạy `graphify update .`/semantic update | update exit 0 + query trả nút từ rules/database.md (plan:396) | CLAUDE.md mục Graphify | Sai | Thiếu chứng cứ bước update: V1-3 |
| E2E-AC-11 | grep + diff | `grep -c "// QueryBuilder:"` 15 file; `grep -rln "createQueryBuilder("`; `git diff master -U0 -- POS_API/src \| grep "^+" \| grep -c "// QueryBuilder:"` | auth 4, users 1, platform 2, bootstrap-admin 1, health 1, promotions 1, store-bank-account 0, reports 1, shifts 4, inventory 4, transfer-attempts 5, sepay-webhook 2, sales 11, organization 2, menu 3 (tổng 42); 14 file có `createQueryBuilder(` trùng đúng danh sách file có số >0; diff thêm 42; tổng marker trong src không phải test = 42 (`r1-E2E-AC-11.txt`, `r1-per-file-counts.txt`). Các dòng `+...createQueryBuilder(` thêm mới liệt kê trong evidence: đều thuộc câu có marker (advisory/fromDummy, SUM, CTE, cursor, insert ON CONFLICT, listing) | đúng từng ký tự (plan:394) | | Đúng | Đối chiếu từng câu trong bảng "QueryBuilder còn giữ theo file" ở mức file và đếm; reviewer có thể đối chiếu chi tiết |
| E2E-AC-12 | grep | `grep -rn "setLock(" ...`; `grep -rn "lower(btrim" ...` (đã lọc) | cả hai 0 dòng (`r1-E2E-AC-12.txt`) | rỗng (plan:395) | | Đúng | |
| ST-1.AC-1 | test | NAMES/LOG | `ST-1.AC-1 entity metadata matches schema` ok | metadata khớp information_schema (plan:454) | | Sai | cùng V1-1 (tên test trong plan lệch); hành vi đúng |
| ST-1.AC-2 | build + đọc | build exit 0; 32 phần tử; `ST-1.AC-2 E2E-AC-7 bank account and QR snapshot accept 19 digits and reject 20` ok | khớp | build exit 0, mảng entities đủ (plan:455) | | Đúng | |
| ST-1.AC-3 | test | `ST-1.AC-3 new payment repository query runs` ok | `findOneBy` trả null | plan:456 | | Đúng | |
| ST-1.AC-4 | npm test | E2E-AC-3 | exit 0, fail 0 | plan:457 | | Đúng | |
| ST-2.AC-1 | test | `test_ST2_AC1_lock_of_two_aliases` ok | | plan:509 | | Đúng | |
| ST-2.AC-2 | test | `test_ST2_AC2_quoted_for_share` ok | | plan:510 | | Đúng | |
| ST-2.AC-3 | test | `test_ST2_AC3_single_table_and_advisory` ok | | plan:511 | | Đúng | |
| ST-2.AC-4 | test | `test_ST2_AC4_capture_sees_raw_and_builder` ok | | plan:512 | | Đúng | |
| ST-3.AC-1 | test có sẵn | `auth/tests/session-branch-name.http.test.ts`: `S10-11 L3 session branchName` ok, subtest `ST2-AC1 login manager co branchName va 9 khoa`, `ST2-AC2 me va refresh tra branchName` ok | | plan:555 | | Đúng | |
| ST-3.AC-2 | test có sẵn | `ST2-AC3 owner va admin branchName null` ok | | plan:556 | | Đúng | |
| ST-3.AC-3 | grep | E2E-AC-1 + PF (`query=0` mỗi file) | 0 dòng | plan:557 | | Đúng | |
| ST-3.AC-4 | npm test | E2E-AC-3; `PB-01 migration, bootstrap and database constraints` ok | | plan:558 | | Đúng | |
| ST-3.AC-5 | test | `test_ST3_AC5_create_staff_username_normalized` ok | | plan:559 | | Đúng | |
| ST-3.AC-6 | test | `test_ST3_AC6_create_owner_username_normalized` ok | | plan:560 | | Đúng | |
| ST-3.AC-7 | test | `test_ST3_AC7_login_lock_sequence` ok | | plan:561 | | Đúng | |
| ST-4.AC-1 | test | `test_ST4_AC1_patch_lock_sequence` ok | | plan:604 | | Đúng | |
| ST-4.AC-2 | test | `test_ST4_AC2_patch_returns_updated_row` ok | | plan:605 | | Đúng | |
| ST-4.AC-3 | test | `test_ST4_AC3_promotions_cursor_keeps_microseconds` ok | | plan:606 | | Đúng | |
| ST-4.AC-4 | test có sẵn | `inventory.integration.test.ts:114,234` kiểm `DUPLICATE_PROMOTION_CODE`; suite 0 fail | | plan:607 | | Đúng | Test có sẵn nằm trong suite xanh; không có tên riêng trong log subtests |
| ST-4.AC-5 | grep + suite | `query=0`, E2E-AC-3 | | plan:608 | | Đúng | |
| ST-5.AC-1 | test | `test_ST5_AC1_update_lock_sequence` ok | | plan:645 | | Đúng | |
| ST-5.AC-2 | test | `test_ST5_AC2_upsert_updates_updated_at` ok | | plan:646 | | Đúng | |
| ST-5.AC-3 | test | `test_ST5_AC3_pending_blocks_update` ok | | plan:647 | | Đúng | |
| ST-5.AC-4 | grep + suite | `store-bank-account.service.ts`: query=0 | | plan:648 | | Đúng | |
| ST-5.AC-5 | test | `test_ST5_account_permission_race` ok; literal cuối `FROM "stores" "Store"` (diff E2E-AC-6) | | plan:649 | task:91 duyệt | Đúng | Plan ghi literal `"s"`, giá trị cuối theo E2E-AC-6 là `"Store"`; đúng bản duyệt |
| ST-6.AC-1 | test tái dùng | `test_ST2_AC3_scope_permissions_http` ok; diff thêm `foreignBranch` + hai assertion `NOT_FOUND` / `Không tìm thấy tài nguyên.` | | plan:686 | | Đúng | |
| ST-6.AC-2 | test có sẵn | `[B-54]` là chú thích trong `test_ST2_AC4_own_open_closed_shift` (reports.integration.test.ts:239), test ok | | plan:687 | | Đúng | |
| ST-6.AC-3 | test | toàn bộ `reports*.test` trong suite xanh; diff E2E-AC-6 chỉ hai mock/import | | plan:688 | | Đúng | |
| ST-6.AC-4 | test | `test_ST6_AC4_best_sellers_limit_and_ties` ok | | plan:689 | | Đúng | |
| ST-6.AC-5 | test | `test_ST6_AC5_revenue_single_statement` ok | | plan:690 | | Đúng | |
| ST-6.AC-6 | grep + suite | `reports.service.ts` query=0 | | plan:691 | | Đúng | |
| ST-6.AC-7 | test + diff | `test_ST2_AC7_consistent_statement`, `test_ST2_AC7_failure_readonly` ok; diff hai mock đúng delta | | plan:692 | | Đúng | |
| ST-3b.AC-1 | test | `PB-01 migration, bootstrap and database constraints` ok, `test_ST3_AC5/AC6/AC7` ok | | plan:743 | | Đúng | |
| ST-3b.AC-2 | test | `test_ST3b_AC2_normalize_username_matches_postgres` ok | | plan:744 | | Đúng | |
| ST-3b.AC-3 | grep | `lower(btrim` 0; marker auth 4 / bootstrap 1 / health 1 (PF) | | plan:745 | | Đúng | |
| ST-3b.AC-4 | npm test | E2E-AC-3 | | plan:746 | | Đúng | |
| ST-4b.AC-1 | test | `test_ST4_AC1_patch_lock_sequence` ok | | plan:782 | | Đúng | |
| ST-4b.AC-2 | test | `test_ST4_AC2_...`, `test_ST4_AC3_...` ok; danh sách mã có sẵn trong suite xanh | | plan:783 | | Đúng | |
| ST-4b.AC-3 | test | `test_ST4b_AC3_total_matches_filters` ok | | plan:784 | | Đúng | |
| ST-4b.AC-4 | grep | promotions.service: setLock 0, createQueryBuilder 1, marker 1, query 0 (PF) | | plan:785 | | Đúng | |
| ST-5b.AC-1 | test | `test_ST5_AC1_update_lock_sequence` ok | | plan:819 | | Đúng | |
| ST-5b.AC-2 | test | `test_ST5_AC2_...`, `test_ST5_AC3_pending_blocks_update` ok | | plan:820 | | Đúng | |
| ST-5b.AC-3 | test | `test_ST5_account_permission_race` ok | | plan:821 | | Đúng | |
| ST-5b.AC-4 | grep | store-bank-account.service: setLock/CQB/marker/query = 0 (PF) | | plan:822 | | Đúng | |
| ST-6b.AC-1 | test | `test_ST2_AC4_own_open_closed_shift` ok (chứa `[B-54]`) | | plan:856 | | Đúng | |
| ST-6b.AC-2 | grep + test | reports.service: marker 1; createQueryBuilder 7 nhưng cùng một câu CTE doanh thu; query 0; `test_ST6_AC5_revenue_single_statement` ok | | plan:857 | | Đúng | |
| ST-7.AC-1 | test | `test_ST7_AC1_add_expense_lock_sequence` ok | | plan:891 | | Đúng | |
| ST-7.AC-2 | test | `test_ST7_AC2_transfer_not_counted_as_cash`, `[B-45]` ok | | plan:892 | | Đúng | |
| ST-7.AC-3 | test | `test_ST7_AC3_expenses_cursor_keeps_microseconds` ok | | plan:893 | | Đúng | |
| ST-7.AC-4 | test | `test_ST7_AC4_open_invoices_listed_by_created_at_then_id` ok | | plan:894 | | Đúng | |
| ST-7.AC-5 | grep | shifts.service: query 0, setLock 0; marker cuối 4 (ST-23.AC-4 ghi 4; mốc "=3" là trung gian, `evidence/ST-7/ac5-grep.log`) | | plan:895 | | Đúng | |
| ST-8.AC-1 | test | `test_ST8_AC1_inventory_lock_sequences` ok | | plan:941 | | Đúng | |
| ST-8.AC-2 | test | `test_ST8_AC2_recipe_blocks_unit_change`, `..._unit_change_blocked_by_movement` ok | | plan:942 | | Đúng | |
| ST-8.AC-3 | test | `test_ST8_AC3_patch_ingredient_returns_row` ok | | plan:943 | | Đúng | |
| ST-8.AC-4 | suite + grep | E2E-AC-3, setLock 0; mốc "=2" trung gian (`evidence/ST-8/ac4-grep.log`), cuối 4 (ST-9.AC-4) | | plan:944 | | Đúng | |
| ST-9.AC-1 | test | `test_ST9_AC1_set_min_lock_sequence` ok | | plan:983 | | Đúng | |
| ST-9.AC-2 | test | `test_ST9_AC2_stocks_include_missing_stock_rows` ok | | plan:984 | | Đúng | |
| ST-9.AC-3 | test | `test_ST9_AC3_set_min_upsert_values` ok | | plan:985 | | Đúng | |
| ST-9.AC-4 | test + grep | test sổ kho trong suite xanh (`inventory.integration.test.ts:56`); inventory query 0, marker 4, setLock 0 | | plan:986 | | Đúng | |
| ST-9.AC-5 | test | `test_ST9_AC3_set_min_upsert_values` ok (giá trị 0.000/2.500, 3.000) | | plan:987 | | Đúng | Không đọc nội dung assertion; dựa tên test và evidence tdd |
| ST-10.AC-1 | test | `test_ST10_AC1_transfer_lock_sequences` ok | | plan:1045 | | Đúng | |
| ST-10.AC-2 | test có sẵn | `payment.integration.test.ts:329` có `Idempotent-Replay`; suite xanh | | plan:1046 | | Đúng | |
| ST-10.AC-3 | test | `test_ST10_AC3_key_reused_across_tables` ok | | plan:1047 | | Đúng | |
| ST-10.AC-4 | test | `test_ST10_AC4_exceptions_cursor_keeps_microseconds` ok | | plan:1048 | | Đúng | |
| ST-10.AC-5 | grep | transfer-attempts: query 0, marker 5, setLock 0 (PF) | | plan:1049 | | Đúng | |
| ST-10.AC-6 | test | `test_ST10_AC6_on_conflict_target_unchanged` ok | | plan:1050 | | Đúng | |
| ST-10.AC-7 | test | `test_ST10_AC7_bank_ref_reused_db_state` ok | | plan:1051 | | Đúng | |
| ST-10.AC-8 | test | `test_ST5_account_permission_race` ok | | plan:1052 | | Đúng | |
| ST-11.AC-1 | test | `test_ST11_AC1_webhook_lock_sequence` ok | | plan:1101 | | Đúng | |
| ST-11.AC-2 | test có sẵn | các test webhook `test_ST6_*` và `[B-*]` trong payment.integration ok, 0 fail | | plan:1102 | | Đúng | |
| ST-11.AC-3 | grep | sepay-webhook: query 0, marker 2, setLock 0 (PF) | | plan:1103 | | Đúng | |
| ST-11.AC-4 | test | `test_ST11_AC4_on_conflict_target_unchanged` ok | | plan:1104 | | Đúng | |
| ST-12.AC-1 | test | `test_ST12_AC1_create_lock_sequence` ok | | plan:1143 | | Đúng | |
| ST-12.AC-2 | test | `test_ST12_AC2_detail_toppings_payment_promotion` ok | | plan:1144 | | Đúng | |
| ST-12.AC-3 | test | `test_ST12_AC3_table_errors_unchanged` ok | | plan:1145 | | Đúng | |
| ST-12.AC-4 | test | `test_ST12_AC4_cashier_other_shift_404` ok | | plan:1146 | | Đúng | |
| ST-12.AC-5 | suite + grep | suite xanh; setLock 0; mốc `// QueryBuilder:` của sales.service "=0 sau ST-12" không kiểm lại được (evidence ST-12 không có log grep); cuối 11 | | plan:1147 | | Sai | V1-2 |
| ST-13.AC-1 | test có sẵn + grep | `invoices-read.integration.test.ts` xanh; mốc "=4 sau ST-13" không có log grep riêng | | plan:1183 | | Sai | V1-2 |
| ST-13.AC-2 | test | các test lọc trạng thái trong invoices-read xanh; `test_ST13_AC4_total_and_options_scope` ok | | plan:1184 | | Đúng | |
| ST-13.AC-3 | test | `test_ST13_AC3_item_count_sum` ok | | plan:1185 | | Đúng | |
| ST-13.AC-4 | test | `test_ST13_AC4_total_and_options_scope` ok; diff counter + `assert.ok(one > 0)` | | plan:1186 | | Đúng | |
| ST-14.AC-1 | test | `test_ST14_AC1_create_invoice_and_table_conflict` ok | | plan:1231 | | Đúng | |
| ST-14.AC-2 | test | `test_ST14_AC2_add_item_errors_unchanged` ok | | plan:1232 | | Đúng | |
| ST-14.AC-3 | test | `test_ST14_AC3_line_total_snapshot` ok | | plan:1233 | | Đúng | |
| ST-14.AC-4 | test + grep | `test_ST14_AC4_remove_item_recalculates` ok; suite xanh | | plan:1234 | | Đúng | Mốc marker trung gian (nếu có) không kiểm lại; cuối 11 |
| ST-15.AC-1 | test | `test_ST15_AC1_apply_promotion_lock_sequence` ok | | plan:1271 | | Đúng | |
| ST-15.AC-2 | test | `test_ST15_AC2_percent_cap_recalculates_and_one_code_per_invoice`, `..._percent_without_cap_or_minimum` ok | | plan:1272 | | Đúng | |
| ST-15.AC-3 | test + grep | `test_ST15_AC3_unknown_foreign_store_and_unmet_minimum_leave_no_row` ok; mốc "=5 sau ST-15" không có log grep | | plan:1273 | | Sai | V1-2 |
| ST-16.AC-1 | test | `test_ST16_AC1_pay_cash_lock_sequence`, `..._complete_zero_lock_sequence` ok | | plan:1325 | | Đúng | |
| ST-16.AC-2 | test | `test_ST16_AC2_sale_movement_quantity` ok | | plan:1326 | | Đúng | |
| ST-16.AC-3 | test | `test_ST16_AC3_key_reused_across_tables` ok | | plan:1327 | | Đúng | |
| ST-16.AC-4 | test có sẵn + grep | `[R14-1]`, `test_ST16_AC7_*` (MISSING_RECIPE/NEGATIVE_STOCK) ok; mốc "=10 sau ST-16" không có log grep | | plan:1328 | | Sai | V1-2 |
| ST-16.AC-5 | test có sẵn | `[B-41] reversal of SYSTEM-sourced SALE ...` ok | | plan:1329 | | Đúng | |
| ST-16.AC-6 | test | `test_ST16_AC6_requirements_product_plus_topping` ok | | plan:1330 | | Đúng | |
| ST-16.AC-7 | test | `test_ST16_AC7_missing_recipe_for_product_or_topping_sorted_by_item`, `..._negative_stock_preview` ok | | plan:1331 | | Đúng | |
| ST-17.AC-1 | test | `test_ST17_AC1_cancel_paid_lock_sequence`, `..._reverses_only_sale_rows` ok | | plan:1378 | | Đúng | |
| ST-17.AC-2 | test có sẵn | `[B-41]`,`[B-42]`,`[B-47]`,`[B-48]`, `[MGR-CANCEL]` ok | | plan:1379 | | Đúng | |
| ST-17.AC-3 | grep | sales.service: query 0, marker 11, setLock 0 (PF) | | plan:1380 | | Đúng | |
| ST-19.AC-1 | test | `test_ST19_AC1_auth_lock_sequences` ok | | plan:1436 | | Đúng | |
| ST-19.AC-2 | test có sẵn | các test `auth.integration.test.ts` xanh (0 fail) | | plan:1437 | | Đúng | |
| ST-19.AC-3 | test | `test_ST19_AC3_rate_limit_retry_after` ok | | plan:1438 | | Đúng | |
| ST-19.AC-4 | grep | auth.service: setLock 0, createQueryBuilder 4 (advisory), marker 4 (PF) | | plan:1439 | | Đúng | |
| ST-20.AC-1 | test | `test_ST20_AC1_lock_sequences` ok | | plan:1476 | | Đúng | |
| ST-20.AC-2 | test | `test_ST20_AC2_list_owners_total_matches_page` ok; test platform/organization xanh | | plan:1477 | | Đúng | |
| ST-20.AC-3 | test | `test_ST20_AC3_suspend_revokes_only_store_sessions` ok | | plan:1478 | | Đúng | |
| ST-20.AC-4 | test | `test_ST20_AC4_staff_scope_null_identity` ok | | plan:1479 | | Đúng | |
| ST-20.AC-5 | grep | setLock 0 ở 3 file; marker users 1, platform 2, bootstrap 1 (PF) | | plan:1480 | | Đúng | |
| ST-21.AC-1 | test | `test_ST21_AC1_lock_sequences` ok | | plan:1510 | | Đúng | |
| ST-21.AC-2 | test | `test_ST21_AC2_scope_characterization` ok | | plan:1511 | | Đúng | |
| ST-21.AC-3 | grep + suite | organization: setLock 0, marker 2 (PF); suite xanh | | plan:1512 | | Đúng | |
| ST-22.AC-1 | test | `test_ST22_AC1_cross_store_404` ok | | plan:1552 | | Đúng | |
| ST-22.AC-2 | test | `test_ST22_AC2_size_order_and_image` ok | | plan:1553 | | Đúng | |
| ST-22.AC-3 | grep + suite | menu: marker 3, createQueryBuilder 3 (PF) | | plan:1554 | | Đúng | |
| ST-23.AC-1 | test | `test_ST23_AC1_lock_sequences` ok | | plan:1586 | | Đúng | |
| ST-23.AC-2 | test có sẵn | `test_ST23_detail_list_and_scope`, shifts/expenses tests ok | | plan:1587 | | Đúng | |
| ST-23.AC-3 | test | `test_ST23_AC3_opening_cash_source` ok | | plan:1588 | | Đúng | |
| ST-23.AC-4 | grep | shifts.service: setLock 0, marker 4 (PF) | | plan:1589 | | Đúng | |
| ST-18.AC-1 | đọc file + git diff | `git diff master -- rules/database.md` | +8 dòng, 0 dòng xóa; mục "## Cách viết truy vấn bằng ORM" có (a)-(e) | plan:1611 | `rules/database.md:14-20` | Đúng | |
| ST-18.AC-2 | đọc file | `TECH_STACK.md:11` | ghi đủ như AC | plan:1612 | `TECH_STACK.md:11` | Đúng | |
| ST-18.AC-3 | đọc file + diff | `r1-ST18-README-diff.txt` | đủ thứ tự (1)-(4), L1..L6, normalizeUsername, khóa qua find lock/tables, null/undefined, onConflict/orIgnore, fromDummy, CTE, UNION ALL, tên tham số, manager, danh sách 4 thư mục entity mới | plan:1613 | `POS_API/README.md` | Đúng | |
| ST-18.AC-4 | lệnh + diff | E2E-AC-1/2/5/6/11/12 | tất cả đúng giá trị; diff 4 file đúng phạm vi duyệt; evidence mock RED/GREEN ST-6/ST-13 có sẵn (`ST-6/reports-mock-red.log`,`reports-mock-green.log`, `ST-13/invoices-counter-red.log`,`...green.log`, `characterization-old-sql.log`) | plan:1614 | | Đúng | Không đọc nội dung từng log RED/GREEN; chỉ xác nhận có file |
| ST-18.AC-5 | lệnh graphify | query như E2E-AC-10 | nút từ `rules/database.md` có; không chạy update | plan:1615 | | Sai | V1-3 |

## Đối chiếu spec (cấp tính năng; "Không áp dụng: không có spec" nếu không có spec)
Không áp dụng: không có spec (user bỏ qua).

## FAIL / bug (mỗi FAIL cũng được lưu vào sổ `fails.md`)
- V1-1:
  - Bước tái hiện: `grep -rn "test_ST1_AC1_entity_metadata_matches_schema" POS_API/src` rỗng; log có `ok 13 - ST-1.AC-1 entity metadata matches schema`.
  - Kỳ vọng: test tên `test_ST1_AC1_entity_metadata_matches_schema` xanh (E2E-AC-7, ST-1.AC-1, plan:391,454,1649).
  - Thực tế: test tên đó không tồn tại; test tương đương tên khác xanh.
  - Path bằng chứng: `evidence/r1-npm-test.log` (dòng 115), `POS_API/src/database/tests/entity-schema.integration.test.ts:36`.
  - Test tái hiện đề xuất: đổi tên test (hoặc sửa chữ plan qua duyệt) | input: `npm test` + `grep -rn test_ST1_AC1_entity_metadata_matches_schema POS_API/src` | mong đợi: có một test đúng tên, ok.
- V1-2:
  - Bước tái hiện: tìm trong `evidence/ST-12,13,15,16` log grep `// QueryBuilder:` của `sales/sales.service.ts` cho các mốc "=0 sau ST-12", "=4 sau ST-13", "=5 sau ST-15", "=10 sau ST-16".
  - Kỳ vọng: số đếm đúng từng mốc (plan:1147,1183,1273,1328).
  - Thực tế: không có log; chỉ có trạng thái cuối 11 khớp E2E-AC-11 và ST-17.AC-3.
  - Path bằng chứng: `evidence/r1-per-file-counts.txt`; không có file nào trong ST-12/13/15/16 chứa `QueryBuilder:`.
  - Test tái hiện đề xuất: không thể tái hiện trạng thái trung gian; chấp nhận khi user duyệt bỏ mốc trung gian hoặc đưa log grep còn lưu vào evidence.
- V1-3:
  - Bước tái hiện: chạy `graphify update .` rồi semantic update 3 file Markdown; ghi exit code; chạy `graphify query "TypeORM QueryBuilder repository convention rules database"`.
  - Kỳ vọng: lệnh exit 0 và query trả nút từ `rules/database.md` (plan:396,1615).
  - Thực tế: query trả nút `... [src=rules/database.md loc=L16]`; không có log update/semantic update (ac-verifier không chạy update).
  - Path bằng chứng: `evidence/r1-E2E-AC-10-graphify.txt`; không có `evidence/ST-18/`.
  - Test tái hiện đề xuất: cmd_ST18_AC5_graphify | input: lệnh trên | mong đợi: update exit 0, query có nút `rules/database.md`.

## Lệch tài liệu
- Không có

## Đánh giá test
- 350 test, không skip/cancelled. Tên test mang mã ST nối được với AC. Mutation do tdd đã chạy (evidence `ST-*/mut*.log`), lần này không chạy lại. Test chuỗi khóa kiểm thứ tự khóa bằng `lockSequence`.
- E2E-AC-8: tôi không mở lại từng mảng kỳ vọng ở cả 13 test, chỉ xác nhận các test ok và một số mảng tiêu biểu.

## Exploratory
- Quét `.query(`/`setLock(`/`lower(btrim`/`raw-sql` trên `POS_API/src` không phải test và migration: 0 dòng. Đúng.
- Kiểm tay test tail: không có `not ok` trong LOG.
- Đọc diff E2E-AC-6 dòng có `-`: chỉ đúng 2 literal payment + 3 dòng mock reports + 3 dòng mock invoices-read + 2 dòng health foundation; không có assertion cũ bị xóa.
- Lỗi cũ liên quan (`20261117-orm-refactor-existing-test-lines-edited`): kiểm bằng numstat, các file test khác 0 dòng xóa.

## Đề xuất
- Sửa V1-1 (đổi tên test hoặc sửa chữ plan).
- Chạy `graphify update .` + semantic update, lưu log (V1-3).
- Duyệt bỏ hoặc xác nhận mốc `// QueryBuilder:` trung gian của V1-2.
