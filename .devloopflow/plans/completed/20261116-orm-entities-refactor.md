---
id: 20261116-orm-entities-refactor
title: Chuyển truy vấn SQL thuần trong POS_API sang entity, repository và QueryBuilder của TypeORM
status: completed   # draft | approved | blocked | completed
created_at: 2026-11-16
approved_at: 2026-11-17
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Chuyển truy vấn SQL thuần trong POS_API sang entity, repository và QueryBuilder của TypeORM

## Mục tiêu và bối cảnh
- Vì sao làm: user yêu cầu nguyên văn "t cần nhất quán làm orm jsts chỉ builder cho những cái phức tạp" (hiện dùng ORM nhưng toàn dùng mã SQL thuần, không dùng entity hay các method mã js/ts; cần triển khai sử dụng lại). User duyệt hướng bằng "làm đi" sau đề xuất 4 bước: (1) ghi quy ước vào `rules/database.md` và `docs/architecture/TECH_STACK.md`; (2) thêm entity còn thiếu; (3) chuyển từng module sang entity + repository, chỉ dùng QueryBuilder cho truy vấn phức tạp; (4) chỗ QueryBuilder không diễn đạt được thì giữ SQL thuần có chú thích lý do. Nguồn: `.devloopflow/tasks/active/20261116-orm-entities-refactor.md` mục "Yêu cầu".
- Ai dùng: người phát triển và các agent sửa `POS_API/`. Người dùng cuối (thu ngân, quản lý, chủ cửa hàng) không thấy thay đổi: hợp đồng API giữ nguyên.
- Kết quả đích: KHÔNG còn lời gọi `.query(` SQL thuần nào trong `POS_API/src` ngoài `database/migrations/`, `*.test.ts`, thư mục `tests/` (= 0), kể cả `http/health.controller.ts` và 6 truy vấn khó (user 2026-11-16: "Bọc hết vào QueryBuilder"; "6 truy vấn khó cũng cập nhật thành querybuilder luôn"). Không có danh sách ngoại lệ.
- Yêu cầu mới 2026-11-17 (nguyên văn user): "chỉ các câu phức tập ko dùng được các hàm truy vấn findOne find create update delete thì mới dùng qua querybuilder. sửa lại plan và các tài liệu liên quan". Kết quả đích bổ sung:
  - Lời bổ sung cùng ngày (nguyên văn user): "khi nào mà các mã ngắn gọn như find findOne relations where phức tạp mà ko làm được nữa thì mới nghĩ đến query builder bởi vì querybuilder cực kì phức tạp rối rắm lỡ sai 1 char thôi cũng gây 500 cho server còn find hoặc findOne hoặc các hàm ngắn hơn đỡ sai sót". QueryBuilder là phương án CUỐI; chuẩn hóa username làm bằng JavaScript nếu hành vi tương đương.
  - Trong 156 chỗ chuyển (bản 2): 119 lời gọi dùng method của repository/manager (`find*`, `exists*`, `count*`, `insert`, `update`, `upsert`, `delete`, `findOne({ lock })`, `find({ where lồng, lock: { tables } })`, nhiều `find` tuần tự); 4 lời gọi chuẩn hóa username bỏ truy vấn, dùng hàm JavaScript `normalizeUsername`; 33 lời gọi (33 câu lệnh) dùng QueryBuilder vì (1)-(3) không đủ (bảng "QueryBuilder còn giữ theo file" ở "Thiết kế tổng thể").
  - Mỗi câu lệnh QueryBuilder do task này thêm có đúng một dòng chú thích ngay trước câu lệnh, bắt đầu bằng `// QueryBuilder: ` (33 dòng; số theo từng file ở E2E-AC-11).
  - (User trả lời Q1 "làm luôn" 2026-11-17) 61 câu QueryBuilder có sẵn trên `master` (auth 21, menu 16, shifts 8, platform 6, organization 5, users 4, bootstrap-admin 1) cũng chuyển theo cùng quy tắc ở ST-19..ST-23: 52 sang method, 9 giữ QueryBuilder (trang danh sách có cursor, L2) có chú thích. Sau task: toàn `POS_API/src` (ngoài migration/test) còn 42 câu lệnh QueryBuilder, mỗi câu có đúng một dòng `// QueryBuilder:`; không còn `setLock(`.
  - Trong `db.transaction(async manager => ...)` chỉ dùng `manager.getRepository(Entity)` / `manager.createQueryBuilder()`.
  - Các sub-task đã xong theo quy tắc cũ (ST-3..ST-6) được làm lại theo quy tắc mới ở ST-3b, ST-4b, ST-5b, ST-6b; hành vi không đổi.

## Khám phá
- Số lời gọi `.query(` trong mã không phải test và migration (planner đếm lại 2026-11-16 bằng `grep -rn "\.query(" --include=*.ts . | grep -v "/migrations/" | grep -v "\.test\.ts" | grep -v "/tests/"` trong `POS_API/src`): `auth/auth.service.ts` 6, `bootstrap-admin.ts` 2, `http/health.controller.ts` 1, `inventory/inventory.service.ts` 21, `platform/platform.service.ts` 1, `promotions/promotions.service.ts` 5, `reports/reports.service.ts` 3, `sales/sales.service.ts` 67, `sales/sepay-webhook.service.ts` 11, `sales/store-bank-account.service.ts` 4, `sales/transfer-attempts.service.ts` 26, `shifts/shifts.service.ts` 8, `users/users.service.ts` 1. Tổng 156, khớp task file.
- Số dòng `.query(` từng file (planner chạy `grep -n "\.query("`):
  - `auth/auth.service.ts`: 47 103 110 119 262 351
  - `shifts/shifts.service.ts`: 81 88 94 446 460 467 495 500
  - `reports/reports.service.ts`: 99 106 112
  - `inventory/inventory.service.ts`: 41 45 88 91 101 114 121 129 141 143 153 180 182 188 189 205 208 222 226 249 252
  - `sales/transfer-attempts.service.ts`: 22 30 47 60 61 67 70 76 78 80 82 91 106 112 117 130 133 134 140 142 144 148 152 159 190 194
  - `sales/sepay-webhook.service.ts`: 50 51 54 57 58 59 64 72 83 88 97
  - `sales/sales.service.ts`: 43 51 61 66 67 68 95 158 164 171 174 201 209 220 234 241 243 247 249 265 267 269 280 293 294 299 303 305 310 327 328 334 338 340 346 352 366 368 370 374 381 382 385 389 397 398 402 418 428 438 442 453 463 467 470 472 483 494 511 521 526 528 539 542 544 547 551
  - `users/users.service.ts`: 74; `platform/platform.service.ts`: 36; `bootstrap-admin.ts`: 8 25; `http/health.controller.ts`: 12; `promotions/promotions.service.ts`: 92 95 107 122 126; `sales/store-bank-account.service.ts`: 13 20 21 23
- Mẫu ORM đã có trong dự án (tái dùng, M-37): `auth.service.ts:75-83` (`createQueryBuilder('e').select('count(*)::int', 'count')...getRawOne()`), `auth.service.ts:264-270` (`innerJoinAndSelect` + `.setLock('pessimistic_write', undefined, ['rt'])`), `auth.service.ts:276-280` (`.update(RefreshToken).set({ revoked_at: () => 'COALESCE(revoked_at, now())' })`), `auth.service.ts:252-256` (khóa dòng gốc bằng statement riêng), `bootstrap-admin.ts:13-17` (`innerJoin('u.role', 'r')`). Đếm grep: `createQueryBuilder` có ở auth 21, menu 16, shifts 8, platform 6, organization 5, users 4, bootstrap-admin 1; `setLock` ở auth 8, shifts 4, organization 3, platform 2, users 1.
- TypeORM đã cài: `0.3.31` (`POS_API/node_modules/typeorm/package.json`), khai báo `"typeorm": "^0.3.31"` và `"pg": "^8.16.3"` (`POS_API/package.json:25,28`).
- Hành vi TypeORM 0.3.31 đã kiểm trong `node_modules`:
  - `setLock(mode, version, lockTables)` sinh `" FOR UPDATE" + " OF " + lockTables.join(", ")` và `" FOR SHARE"` cho `pessimistic_read` trên PostgreSQL — nguồn: `POS_API/node_modules/typeorm/query-builder/SelectQueryBuilder.js:1460-1519`.
  - `orIgnore()` sinh `" ON CONFLICT DO NOTHING "` KHÔNG có cột đích — nguồn: `InsertQueryBuilder.js:326-327`. `onConflict(statement)` sinh `" ON CONFLICT ${statement} "` (`InsertQueryBuilder.js:329-330`) nhưng bị đánh dấu `@deprecated Use orIgnore or orUpdate` (`InsertQueryBuilder.d.ts:66-68`). `orUpdate(overwrite, conflictTarget, { indexPredicate })` sinh `ON CONFLICT ( cols ) [WHERE ( pred )] DO UPDATE SET col = EXCLUDED.col` và chỉ tự thêm `= DEFAULT` cho cột khai báo `isUpdateDate` (`InsertQueryBuilder.js:332-372`).
  - `PostgresQueryRunner.query(query, parameters, useStructuredResult)`: với `UPDATE`/`DELETE` trả `result.raw = [raw.rows, raw.rowCount]` khi gọi qua `manager.query` (`PostgresQueryRunner.js:199-208`, đúng M-21); còn QueryBuilder `.update()...execute()` trả `UpdateResult.raw = queryResult.records` (mảng dòng) và `affected = rowCount` (`query-builder/result/UpdateResult.js:22-23`).
  - `PostgresQueryRunner.query` gọi `this.driver.connection.logger.logQuery(query, parameters, this)` cho mọi câu lệnh (`PostgresQueryRunner.js:176`); import sâu `require('typeorm/driver/postgres/PostgresQueryRunner').PostgresQueryRunner` dùng được (planner chạy `node -e` trả `function`; `exports` của typeorm có `"./*"`).
  - `Repository.existsBy(where)` có trong 0.3.31 (`repository/Repository.d.ts:228`); `addCommonTableExpression(queryBuilder | string, alias, options)` có (`QueryBuilder.d.ts:215`).
  - SELECT không có bảng (planner đọc mã 2026-11-16, theo yêu cầu agent chính):
    - QueryBuilder BẮT BUỘC có main alias: `createSelectExpression()` ném `"Cannot build query because main alias is not set (call qb#from method)"` khi chưa gọi `from` (`SelectQueryBuilder.js:1035-1036`) và luôn nối `" FROM " + froms.join(", ")` (`SelectQueryBuilder.js:1097-1102`). Vậy `createQueryBuilder().select(...)` không `from` KHÔNG chạy được.
    - Có sẵn `fromDummy()` (`SelectQueryBuilder.d.ts:95`, `SelectQueryBuilder.js:156-159`): `this.from(this.connection.driver.dummyTableName ?? "(SELECT 1 AS dummy_column)", "dummy_table")`. `PostgresDriver.js` không khai báo `dummyTableName` (grep không thấy), nên trên PostgreSQL sinh `FROM (SELECT 1 AS dummy_column) "dummy_table"` — một dòng, biểu thức trong `select` chạy đúng một lần.
    - Chuỗi bắt đầu `(` và kết thúc `)` được coi là sub-query, không phải tên bảng (`QueryBuilder.js:405-415`).
    - Chính TypeORM dùng `fromDummy()` cho `getExists()` (`SelectQueryBuilder.js:1754-1761`), và dự án đã gọi `getExists()` trên PostgreSQL ở `auth.service.ts:359-361`.
    - Kết luận: 15 lời gọi `SELECT 1`, `pg_advisory_xact_lock(...)`, `SELECT lower(btrim($1::text))` diễn đạt được bằng `manager.createQueryBuilder().select('<biểu thức>', '<alias>').fromDummy()...getRawOne()`.
  - 6 truy vấn khó (planner đọc mã 2026-11-16):
    - `InsertQueryBuilder.onConflict(statement)` gán `expressionMap.onConflict` (`InsertQueryBuilder.js:202-209`, có `@deprecated Use orIgnore or orUpdate`), sinh `" ON CONFLICT ${statement} "` (`:329-330`), rồi nối `" RETURNING ..."` (`:420-427`). `updateEntity(false)` (`:197-199`) bỏ bước `ReturningResultsEntityUpdator.insert` (`:110-115`; bước này đọc `insertResult.raw[entityIndex]` cho từng `valueSet`, `ReturningResultsEntityUpdator.js:90-113`). `InsertResult.from` lấy `raw = queryResult.raw` (`query-builder/result/InsertResult.js:20-22`).
    - CTE: `addCommonTableExpression(queryBuilder | string, alias, options)` (`QueryBuilder.js:352-359`); khi là QueryBuilder thì lấy `getQuery()` và gộp tham số (`QueryBuilder.js:785-797`); CTE lồng CTE bị chặn (`:788-790`).
    - Sub-query: trong `from` (`QueryBuilder.js:417-424`), trong `join` (`SelectQueryBuilder.js:1008-1028`), trong `select`/`addSelect` (`SelectQueryBuilder.js:95,119`). Không có API `union`/`crossJoin`/`fullJoin` (không thấy trong `SelectQueryBuilder.d.ts`; `join` chỉ nhận hướng INNER/LEFT).
    - Tham số đặt tên: `PostgresDriver.escapeQueryWithParameters` thay `/:(\.\.\.)?([A-Za-z0-9_.]+)/g` trên toàn câu, tên không có trong `parameters` giữ nguyên, cùng tên dùng lại cùng `$n` (`PostgresDriver.js:643-653`).
    - Kết luận: cả 6 truy vấn diễn đạt được bằng QueryBuilder mà không đổi hành vi (bảng "Bảng chuyển 6 truy vấn khó" ở "Thiết kế tổng thể"); không có chỗ phải hỏi lại user.
  - Test có sẵn của báo cáo (`reports/tests/reports.integration.test.ts`): `test_ST2_AC1_paid_zero_cancelled` (:12), `test_ST2_AC1_vietnam_midnight` (:40, mốc `16:59:59.999Z`/`17:00:00.000Z`), `test_ST2_AC2_payment_amount_not_received` (:62), `test_ST2_AC2_safe_money` (:93), `test_ST2_AC3_scope_permissions_http` (:140), `test_ST2_AC4_own_open_closed_shift` (:190), `test_ST2_AC4_shift_crosses_midnight` (:240), `test_ST2_AC5_days_range_validation` (:255), `test_ST2_AC6_sizes_snapshots_toppings` (:304), `test_ST2_AC7_consistent_statement` (:352), `test_ST2_AC7_failure_readonly` (:389), `test_ST2_AC5_date_before_chart_range` (:424), `[B-57] test_ST2_AC1_invoice_paid_at_not_payment_paid_at` (:441), `[B-56] test_ST2_AC3_permission_before_validation` (:455). CHƯA thấy test có hơn 10 món bán chạy (giới hạn `LIMIT 10`) và tie-break thứ tự `quantity DESC, product_name, size_name, product_size_id` (đọc tên test; tdd kiểm lại nội dung).
  - Test có sẵn phủ chuẩn hóa username: đăng nhập username có TAB (`auth/tests/auth.integration.test.ts:100-114`), bootstrap `'  \tADMIN  '` → `'\tadmin'` (`foundation.test.ts:53-65`); health 200 và 503 khi DB hỏng (`foundation.test.ts:110,117`). CHƯA có test chuẩn hóa username khi tạo nhân viên (`users.service.ts:74`, hàm `createStaff`) và khi tạo chủ cửa hàng (`platform.service.ts:36`, hàm `createOwner`, được `createStore`/`addOwner` gọi ở `platform.service.ts:71,123`).
- Entity hiện có (20, `POS_API/src/database/data-source.ts:27-48`): Store, Branch, DiningTable, Role, Permission, RolePermission, User, RefreshToken, AuthRateEvent, Category, Size, Product, ProductSize, Topping, CategoryTopping, WorkShift, CashReconciliation, Invoice, InvoiceItem, InvoiceItemTopping. Quy ước (ví dụ `POS_API/src/sales/entities/invoice.entity.ts`): `@Entity('<bảng>')`, `@PrimaryColumn('uuid')`, thuộc tính snake_case trùng tên cột, `bigint` khai báo kiểu TS `string`, `timestamptz` kiểu `Date`, `created_at`/`updated_at` là `@Column('timestamptz')` thường (không `CreateDateColumn`), không khai báo relation, cột nullable `{ nullable: true }` kiểu `T | null`.
- `POS_API/README.md:29`: "Import entity trực tiếp, giữ callback TypeORM cho relation và đăng ký đầy đủ trong `database/data-source.ts`; không gom entity liên module qua barrel."
- 12 bảng chưa có entity và nguồn cột:
  - `ingredients` — `migrations/20261107000000-InventoryPromotions.ts:8-17`
  - `product_size_ingredients` — `20261107000000-InventoryPromotions.ts:19-25`
  - `topping_ingredients` — `20261107000000-InventoryPromotions.ts:27-33`
  - `branch_ingredient_stocks` — `20261107000000-InventoryPromotions.ts:35-43`
  - `stock_movements` — `20261107000000-InventoryPromotions.ts:45-56`, sửa ở `20261109000000-Payments.ts:96-100` (`created_by` bỏ NOT NULL, thêm `source varchar(10) NOT NULL DEFAULT 'USER'`)
  - `promotion_codes` — `20261107000000-InventoryPromotions.ts:78-97`
  - `store_bank_accounts` — `20261109000000-Payments.ts:8-14`
  - `invoice_promotion_codes` — `20261109000000-Payments.ts:15-20`
  - `transfer_attempts` — `20261109000000-Payments.ts:21-35`
  - `payments` — `20261109000000-Payments.ts:38-77`
  - `bank_transfer_events` — `20261109000000-Payments.ts:80-94`
  - `shift_expenses` — `20261113000000-ShiftExpenses.ts:8-17`
- Trigger tồn kho nằm trong DB, không ở mã ứng dụng: `apply_stock_movement()` BEFORE INSERT trên `stock_movements` chạy `UPDATE branch_ingredient_stocks SET current_stock=current_stock+NEW.quantity ... RETURNING current_stock INTO NEW.balance_after`; `stock_movements_append_only` chặn UPDATE/DELETE (`20261107000000-InventoryPromotions.ts` khối `CREATE FUNCTION apply_stock_movement`). Vì vậy mã ứng dụng chỉ INSERT dòng sổ kho với `balance_after` = 0 (`sales.service.ts:385-387`, `547-549`); không có câu `current_stock = current_stock + delta` trong service để chuyển.
- Số migration hiện tại 13: `POS_API/src/foundation.test.ts:37` `assert.equal((await db.runMigrations()).length, 13);`. Task này không thêm migration nên không đổi số này (M-29).
- Lệnh: `"build": "node ./node_modules/typescript/bin/tsc -p tsconfig.json"`, `"test": "npm run build && node --env-file-if-exists=.env --test --test-concurrency=1 \"dist/**/*.test.js\""` (`POS_API/package.json:6,9`).
- Test hiện có của các file sẽ đổi (`find POS_API/src -name "*.test.ts"`): `auth/tests/auth.integration.test.ts`, `auth/tests/auth.test.ts`, `auth/tests/auth-config.test.ts`, `auth/tests/session-branch-name.http.test.ts`, `foundation.test.ts`, `inventory/tests/inventory.http.test.ts`, `inventory/tests/inventory.integration.test.ts`, `inventory/tests/stock-movements.http.test.ts`, `promotions/tests/promotion.test.ts`, `reports/tests/reports.integration.test.ts`, `reports/tests/reports.test.ts`, `reports/tests/reports-permissions.integration.test.ts`, `sales/tests/cancel-paid.integration.test.ts`, `sales/tests/invoices-read.integration.test.ts`, `sales/tests/manager-cancel.integration.test.ts`, `sales/tests/payment.integration.test.ts`, `sales/tests/sales.integration.test.ts`, `shifts/tests/shift-expenses.integration.test.ts`, `shifts/tests/shifts.integration.test.ts`, cùng `menu`, `organization`, `platform` tests.
- Mã lỗi KHÔNG có test nào (grep `--include=*.test.ts` ngày 2026-11-16): `INVOICE_BRANCH_MISMATCH` (`sales.service.ts:224`), `TOPPING_NOT_ALLOWED` (`sales.service.ts:434`), `ITEM_NOT_AVAILABLE` (`sales.service.ts:424,433`), `TABLE_INACTIVE` (`sales.service.ts:225`). Các truy vấn sinh ra các lỗi này (`sales.service.ts:220`, `418`, `428`) nằm trong phạm vi chuyển.
- Kiểm khóa dòng hiện có trong test: chỉ `sales/tests/sales.integration.test.ts:87-89` (`SET LOCAL lock_timeout='200ms'`, kỳ vọng `55P03` cho branch/table khi tạo đơn) và các test đồng thời bằng `Promise.all` (`payment.integration.test.ts:361,548,673,1261,1380,1439`, `auth.integration.test.ts:228,263`, `shifts.integration.test.ts:442`). Các chỗ `FOR UPDATE` của promotions, store-bank-account, shifts addExpense, inventory, transfer-attempts, sepay, sales cancelPaid chưa có test khẳng định khóa.
- Cursor giữ micro giây đã có test cho sổ kho (`inventory/tests/inventory.integration.test.ts:52`, `inventory/tests/stock-movements.http.test.ts:84-120`) và hóa đơn (`sales/tests/invoices-read.integration.test.ts:144,166`); CHƯA có cho danh sách mã giảm giá (`promotions.service.ts:95`), chi phí ca (`shifts.service.ts:495`), giao dịch chuyển khoản cần xử lý (`transfer-attempts.service.ts:190`).
- Kết quả khám phá của agent chính: entity quy ước, M-14/M-20/M-21/M-34/M-36/M-37/M-46, môi trường test (`.devloopflow/tasks/active/20261116-orm-entities-refactor.md` mục "Kết quả khám phá", "Môi trường test").

- Delta ST-5/ST-10, kiểm 2026-11-17: `test_ST5_account_permission_race` dùng helper `waiting(pattern)` đọc `pg_stat_activity`, điều kiện `wait_event_type='Lock'`, timeout `10000` ms và poll `20` ms; dòng 1126 dò `INSERT INTO transfer_attempts`, dòng 1129 dò `SELECT id FROM stores` (nguồn: `POS_API/src/sales/tests/payment.integration.test.ts:1105-1143`). Module sau ST-5 đỏ `bank change must wait for QR store lock`, `false !== true` (nguồn: `.devloopflow/verify/20261116-orm-entities-refactor/evidence/ST-5/module.log`, task active mục "Blocked").
- SQL đích kiểm bằng TypeORM 0.3.31 `getQueryAndParameters()` sau `dataSource.buildMetadatas()` ngày 2026-11-17, không kết nối DB: builder từ `store-bank-account.service.ts:23` sinh `SELECT "s"."id" AS "s_id" FROM "stores" "s" WHERE "s"."id" = $1 FOR UPDATE`; INSERT theo ST-10 dòng 91 sinh đầu câu `INSERT INTO "transfer_attempts"(`. Pattern đề xuất: `FROM "stores" "s"` và `INSERT INTO "transfer_attempts"`. Đây là kiểm SQL dựng từ source/đích plan, chưa phải chạy lại race trên PostgreSQL.

- Delta ST-6/ST-13, kiểm source 2026-11-17: hai mock `w.db.query` ở `POS_API/src/reports/tests/reports.integration.test.ts:358-363,400-404` chỉ bắt DataSource.query; `isReportSql` tại dòng 10 nhận mọi SQL có từ invoices. `original = w.db.query.bind(w.db)` được dùng cho UPDATE barrier/canceller (`:366,375`), bỏ qua mock DataSource hiện hữu nhưng sẽ đi qua prototype QueryRunner.
- Counter `POS_API/src/sales/tests/invoices-read.integration.test.ts:248-258` đếm mọi db.query trong hai request limit 1/100; assertion hiện hữu `assert.equal(queries, one)` có thể xanh giả 0/0. Đề xuất thêm duy nhất `assert.ok(one > 0)` sau `const one = queries` để chứng minh counter quan sát SQL; giữ mọi assertion đã có.
- TypeORM 0.3.31: `PostgresQueryRunner` gán `this.connection = driver.connection` (`POS_API/node_modules/typeorm/driver/postgres/PostgresQueryRunner.js:32-35`); `query(query, parameters, useStructuredResult = false)` trả raw/structured khác nhau (`:172-211`). `getRawOne()` dùng `getRawMany()` (`SelectQueryBuilder.js:605-606`), gọi `queryRunner.query(sql, parameters, true)` (`:2220`), trả `results.records` (`:2241`). Phải giữ nguyên this và đủ ba args.
- Scope DataSource: reports override DataSource bằng đúng db trong world (`POS_API/src/reports/tests/reports.fixture.ts:38,62,66-67`); invoices-read override bằng đúng db (`POS_API/src/sales/tests/invoices-read.integration.test.ts:15,53`). Guard `this.connection === w.db`/`this.connection === db` khoanh đúng DataSource.
- Task active ghi ST-6 chưa triển khai/chưa chạy test/chưa có RED; suite gần nhất sau ST-5 là 276/276 (nguồn: `.devloopflow/tasks/active/20261116-orm-entities-refactor.md`, “Đã đọc errors”, “Blocked”). Chưa có RED runtime cho ST-6/ST-13; source không phải RED/GREEN.

- Delta ST-6.AC-1, kiểm source 2026-11-17: `test_ST2_AC3_scope_permissions_http` tại `POS_API/src/reports/tests/reports.integration.test.ts:141-188` có assertion foreign branch status 404 ở dòng 162; helper total tại dòng 150-153 chỉ giữ status khi HTTP khác 200, không kiểm code/message. `ownerGet` dòng 10 trả đủ response; `notFound()` tại `POS_API/src/reports/reports.service.ts:41` quy định `404`, `NOT_FOUND`, `Không tìm thấy tài nguyên.`. Khoảng trống bằng chứng của AC đã có; chưa xác nhận bug production, chưa chạy assertion mới. Hai assertion body cần ngoại lệ test cũ/characterization sau duyệt riêng.

- Delta quy tắc mới (planner kiểm 2026-11-17; đọc source working tree nhánh `refactor/orm-entities` và `node_modules/typeorm` 0.3.31 — `POS_API/node_modules/typeorm/package.json:3` `"version": "0.3.31"`):
  - Hiện trạng truy vấn do ST-3..ST-6 chuyển (source hiện tại):
    - `POS_API/src/auth/auth.service.ts`: `:48` `getRepository(Branch).findOne({ where, select })`; `:104`, `:120` (trong vòng `for`), `:263`, `:352` `createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))', 'locked').fromDummy()`; `:111` `select('lower(btrim(CAST(:username AS text)))', 'username').fromDummy()` (số dòng theo `git diff master -U1`).
    - `POS_API/src/users/users.service.ts:74`, `POS_API/src/platform/platform.service.ts:36`, `POS_API/src/bootstrap-admin.ts:25`: `lower(btrim(...))` qua `fromDummy()`; `POS_API/src/bootstrap-admin.ts:8`: `pg_advisory_xact_lock(6152, 1)` qua `fromDummy()`; `POS_API/src/http/health.controller.ts:12`: `select('1', 'ok').fromDummy()`.
    - `POS_API/src/promotions/promotions.service.ts`: `:89-96` builder `createQueryBuilder('p')` dùng cho `getCount()` rồi `getRawAndEntities()` (cursor `to_char ... .US`, so sánh bộ `(p.created_at, p.id) <`); `:107-112` `createQueryBuilder().insert().into(PromotionCode)...returning('*')`; `:123-124` `createQueryBuilder('p').where(...).setLock('pessimistic_write').getOne()` (một bảng, không JOIN); `:128-133` `createQueryBuilder().update(PromotionCode)...returning('*')`.
    - `POS_API/src/sales/store-bank-account.service.ts`: `:16` `findOne` (repo); `:23` `getRepository(Store).createQueryBuilder('s').select('s.id')...setLock('pessimistic_write').getOne()` (một bảng); `:24` `existsBy` (repo); `:26` `createQueryBuilder().insert().into(StoreBankAccount)...orUpdate([...], ['store_id'])`.
    - `POS_API/src/reports/reports.service.ts`: `:68` `existsBy` (repo); `:75-79` `getRepository(WorkShift).createQueryBuilder('w').innerJoin(Branch, 'b', ...)`; `:84-120` CTE QueryBuilder một statement (7 lời gọi `createQueryBuilder`, chú thích sẵn có `:84` "One statement = one snapshot").
  - QueryBuilder có sẵn trên `master`, KHÔNG sinh từ `.query(` của task này (đếm ở mục "Mẫu ORM đã có" phía trên: auth 21, menu 16, shifts 8, platform 6, organization 5, users 4, bootstrap-admin 1), ví dụ `users.service.ts:39-45` (`staff`), `:51` (`revoke`), `:57` (`listStaff`), `platform.service.ts:54`, `:83`, `:92`, `:104`, `:131`, `:139`, `bootstrap-admin.ts:12-16`. Phạm vi xử lý nhóm này: user trả lời Q1 "làm luôn" → ST-19..ST-23.
  - Hành vi TypeORM 0.3.31 đã đọc trong `POS_API/node_modules/typeorm`:
    - `FindOneOptions.lock` có `{ mode: "pessimistic_read" | "pessimistic_write" | ...; tables?: string[]; onLocked?: ... }` (`find-options/FindOneOptions.d.ts:58-65`); chú thích dòng 56: "For lock tables, you must specify the table names and not the relation names". `applyFindOptions` đổi tên bảng trong `tables` thành alias đã escape rồi gọi `setLock(mode, undefined, tableNames)` (`query-builder/SelectQueryBuilder.js:1897-1925`); `createLockExpression` sinh `" FOR UPDATE" + " OF " + lockTables.join(", ")` (`SelectQueryBuilder.js:1458-1520`).
    - Có lock mà không ở trong transaction thì ném `PessimisticLockTransactionRequiredError` (`SelectQueryBuilder.js:1971`).
    - `EntityManager.findOne` gán `take: 1` (`entity-manager/EntityManager.js:625`); khi có `take` và có join thì chạy hai câu (câu `DISTINCT` lấy id rồi câu chính) (`SelectQueryBuilder.js:1988-1989`). Điều kiện `where` trên thuộc tính relation tạo `LEFT JOIN` (nhánh relation của `buildWhere` từ `SelectQueryBuilder.js:2553`, `joins.push({ type: "left", ... })` tại `:2674-2675`).
    - `buildWhere` của find BỎ QUA điều kiện có giá trị `undefined` (`SelectQueryBuilder.js:2496-2504`) và `null` (`:2505-2510`, mặc định `"ignore"`); `POS_API/src/database/data-source.ts` không khai báo `invalidWhereValuesBehavior` (grep `invalidWhereValuesBehavior` trong `POS_API/src` không có kết quả). Với `update`/`delete`, `normalizeWhereCriteria` trả nguyên criteria khi không có tùy chọn (`util/OrmUtils.js:460-463`), nên giá trị `null` thành `= $n` với tham số NULL (không khớp dòng nào), không phải `IS NULL`.
    - `Repository.update(criteria, partialEntity, options?: UpdateOptions)` (`repository/Repository.d.ts:169`); `UpdateOptions.returning?: ReturningOption` (`repository/UpdateOptions.d.ts:5-11`); `EntityManager.update` gọi `qb.returning(options.returning)` (`entity-manager/EntityManager.js:394-407`); `UpdateResult.raw = queryResult.records` (`query-builder/result/UpdateResult.js:22`).
    - `Repository.insert(entity)` KHÔNG có tham số tùy chọn, không có RETURNING tùy chọn (`repository/Repository.d.ts:162`; `EntityManager.insert` chỉ `insert().into().values().execute()`, `EntityManager.js:297-303`).
    - `Repository.upsert(entityOrEntities, conflictPathsOrOptions: string[] | UpsertOptions)` (`Repository.d.ts:183`); `UpsertOptions` có `conflictPaths`, `skipUpdateIfNoValuesChanged`, `upsertType`, `returning` (`repository/UpsertOptions.d.ts:7-26`); `EntityManager.upsert` ghi đè `[...conflictColumns, ...overwriteColumns]` với `overwriteColumns` = cột có giá trị khác `undefined` (`EntityManager.js:304-341`). Không có lựa chọn `DO NOTHING`.
    - `increment`/`decrement` chỉ đặt một cột (`EntityManager.js:707-736`), không cập nhật được `updated_at` cùng câu.
    - `Repository.sum()` trả `parseFloat(...)` (`EntityManager.js:544`): mất chính xác với `bigint` tiền.
    - Kiểm SQL sinh ra (planner chạy 2026-11-17, KHÔNG kết nối DB): script scratchpad `orm-sql.js` nạp `dist/database/data-source.js` (biến `DATABASE_URL` giả chỉ để nạp module), `new DataSource({ type: 'postgres', entities })`, `buildMetadatas()`, `getQueryAndParameters()`. Output (rút khoảng trắng):
      - `findOne` lock Store: `SELECT "Store"."id" AS "Store_id" FROM "stores" "Store" WHERE (("Store"."id" = $1)) LIMIT 1 FOR UPDATE`
      - `findOne` lock PromotionCode: `... FROM "promotion_codes" "PromotionCode" WHERE (("PromotionCode"."id" = $1) AND ("PromotionCode"."store_id" = $2)) LIMIT 1 FOR UPDATE`
      - `find` lock `tables: ['work_shifts']`: `SELECT "WorkShift"."id" AS "WorkShift_id", "WorkShift"."status" AS "WorkShift_status" FROM "work_shifts" "WorkShift" WHERE (("WorkShift"."id" = $1)) LIMIT 1 FOR UPDATE OF "WorkShift"`
      - where `{ id: 'x', store_id: null }` trên Branch: `... FROM "branches" "Branch" WHERE (("Branch"."id" = $1))` (điều kiện `store_id` bị bỏ)
      - where trên relation `WorkShift.branch`: `... FROM "work_shifts" "WorkShift" LEFT JOIN "branches" "WorkShift__WorkShift_branch" ON ... WHERE (("WorkShift"."id" = $1) AND ((("WorkShift__WorkShift_branch"."store_id" = $2))))`
      - upsert StoreBankAccount: `INSERT INTO "store_bank_accounts"("store_id", "bank_bin", "account_number", "account_name", "updated_at") VALUES ($1, $2, $3, $4, now()) ON CONFLICT ( "store_id" ) DO UPDATE SET "store_id" = EXCLUDED."store_id", "bank_bin" = EXCLUDED."bank_bin", "account_number" = EXCLUDED."account_number", "account_name" = EXCLUDED."account_name", "updated_at" = EXCLUDED."updated_at"`
      - update có returning (dựng như `EntityManager.update`): `UPDATE "promotion_codes" SET "name" = $1, "updated_at" = now() WHERE ("id" = $2 AND "store_id" = $3) RETURNING *`
      - update giá trị hàm: `UPDATE "promotion_codes" SET "used_count" = "used_count" + 1, "updated_at" = now() WHERE "id" = $1` (TypeORM tự đặt nháy tên cột trong biểu thức)
      - insert có giá trị hàm: `INSERT INTO "stock_movements"(...) VALUES ($1, $2, $3, $4, -CAST('1.000' AS numeric), $5, $6, DEFAULT, $7, DEFAULT, $8)` — biểu thức được chèn nguyên văn, KHÔNG có cách bind tham số qua `Repository.insert`.
      - `supportedUpsertTypes` của PostgresDriver: `[ 'on-conflict-do-update' ]`.
    - CHƯA xác minh (không chạy DB): dạng `InsertResult.raw` của `upsert(..., { returning: [...] })` khi chạy thật; khóa thật của `findOne({ lock })` trong transaction; hành vi PostgreSQL của `SET "store_id" = EXCLUDED."store_id"` (cùng giá trị) với khóa dòng. tdd phải kiểm bằng test ở ST-5b, ST-9 (ghi ở từng sub-task).
  - Test dò câu SQL theo chuỗi (grep `query LIKE` trong `*.test.ts`): `payment.integration.test.ts:1126` (`INSERT INTO transfer_attempts`), `:1129` (`FROM "stores" "s"`); các test khác dò `'%FOR UPDATE%'` (`cancel-paid.integration.test.ts:468`, `shift-expenses.integration.test.ts:495`, `shifts.integration.test.ts:209,248`) hoặc `'%users%'` (`auth.integration.test.ts:62,368`) — vẫn khớp khi đổi sang `findOne({ lock })` vì câu sinh ra còn `FOR UPDATE` và tên bảng. Chỉ `:1129` lệch khi `store-bank-account.service.ts:23` đổi sang `findOne` (alias `"Store"`, LIKE phân biệt hoa thường).
  - `lockSequence` (`POS_API/src/database/tests/sql-capture.ts`) chuẩn hóa bỏ `"` và lấy bảng của `FROM` đầu tiên khi không có `OF`; với `OF "WorkShift"` ánh xạ alias qua cặp `FROM work_shifts WorkShift`. Câu `... LIMIT 1 FOR UPDATE` của `findOne` cho cùng token với SQL cũ `FOR UPDATE` không `OF`.
  - Tài liệu đã có thay đổi chưa commit trong working tree trước lượt planner này (`git diff` 2026-11-17, không do planner ghi): `rules/database.md` thêm mục "## Cách viết truy vấn bằng ORM" (3 bullet, sau mục "## Truy vấn"); `docs/architecture/TECH_STACK.md:11` sửa ô vai trò TypeORM; `POS_API/README.md` thêm đoạn quy ước truy vấn trước đoạn entity. `rules/database.md:3` ghi "Áp dụng cho mọi công nghệ lưu trữ quan hệ và mọi ORM".
- Delta bản 2 (planner kiểm 2026-11-17 sau lời bổ sung của user về `find`/`relations` trước QueryBuilder):
  - SQL dựng thêm (script scratchpad `orm-sql2.js`, cùng cách như trên, không kết nối DB):
    - `find` WorkShift `where: { id, branch: { store_id } }`, `lock: { mode: 'pessimistic_write', tables: ['work_shifts'] }`: `SELECT "WorkShift"."id" ..., "WorkShift"."branch_id" ..., "WorkShift"."status" ... FROM "work_shifts" "WorkShift" LEFT JOIN "branches" "WorkShift__WorkShift_branch" ON "WorkShift__WorkShift_branch"."id"="WorkShift"."branch_id" WHERE (("WorkShift"."id" = $1) AND ((("WorkShift__WorkShift_branch"."store_id" = $2)))) FOR UPDATE OF "WorkShift"` (một câu, không `LIMIT`).
    - `find` DiningTable `relations: { branch: true }`, `select` lồng, `lock: { mode: 'pessimistic_read', tables: ['dining_tables'] }`: `... FROM "dining_tables" "DiningTable" LEFT JOIN "branches" "DiningTable__DiningTable_branch" ON ... WHERE (("DiningTable"."id" = $1)) FOR SHARE OF "DiningTable"`.
    - `find` ProductSize `where: { id, product: { category: { store_id } } }`, `lock` `tables: ['product_sizes']`: hai `LEFT JOIN` (`products`, `categories` với alias băm 40 ký tự hex) rồi `FOR UPDATE OF "ProductSize"`.
    - `where: { branch_id: In([]) }`: `WHERE ((0=1))` (`query-builder/QueryBuilder.js:755-757`).
    - `lockSequence` nhận được các câu trên: alias sau `OF` (`WorkShift`, `DiningTable`, `ProductSize`) ánh xạ qua cặp `FROM <bảng> <alias>`; alias băm chỉ gồm `[0-9a-f]` khớp `\w+`.
  - Relation đã khai báo: liệt kê ở "Thiết kế tổng thể" (đọc `work-shift.entity.ts:42-56`, `dining-table.entity.ts:31-33`, `branch.entity.ts:38-40`, `product-size.entity.ts:29-35`, `product.entity.ts:35-37`, `category-topping.entity.ts:13-19`, `topping.entity.ts:29-30`); grep `eager` trong `*.entity.ts`: không có.
  - CHECK số lượng: `product_size_ingredients.quantity`, `topping_ingredients.quantity` `CHECK (quantity > 0)` (`20261107000000-InventoryPromotions.ts:22,30`); `stock_movements.quantity` `CHECK (quantity <> 0)` (`:50`); `invoice_items.quantity`, `invoice_item_toppings.quantity` `CHECK (quantity > 0)` (`20261106000000-Sales.ts:42,56`). Vì vậy lượng cần trừ ở `finalizeInvoice` luôn dương, dòng `SALE` luôn âm.
  - Username: DTO chỉ `@IsString() @IsNotEmpty() @MaxLength(50)` (+ `@Transform` trim JavaScript ở `users/http/users.dto.ts:7-9`, `platform/http/platform.dto.ts:10-12`), đăng nhập `auth/http/auth.dto.ts:11-12` không giới hạn bộ ký tự → username có thể chứa Unicode bất kỳ.
  - Đoạn mã hiện tại cần cho thiết kế bản 2 (đọc trực tiếp): `inventory.service.ts:196-262` (`listStocks`, `setMin`, `listMovements`), `:138-150` (`parent`, `recipeTable`), `:176-192` (`putRecipe`); `transfer-attempts.service.ts:68-72`, `:110-118`, `:140-146`; `sepay-webhook.service.ts:55-60`; `sales.service.ts:360-372` (`cashPaymentView`, `finalizeInvoice`), `:418-445` (`addItem`).

## Lỗi cũ cần tránh
- `.devloopflow/errors/2026-11-07-sprint07-update-returning.md` — nguyên nhân (nguyên văn): "TypeORM PostgreSQL QueryRunner trả `result.raw = [raw.rows, raw.rowCount]` cho `UPDATE`/`DELETE` ... source service đã destructure phần tử đầu thành `row`, thực ra là mảng rows." Áp dụng: khi đổi `manager.query('UPDATE ... RETURNING *')` sang QueryBuilder, đọc `result.raw[0]` (mảng dòng), KHÔNG giữ cách đọc `rows[0]` của `[rows, rowCount]`.
- `.devloopflow/errors/2026-10-30-pb04-login-role-lock-race.md` — nguyên văn: "SELECT user JOIN role trong cùng statement FOR UPDATE giữ snapshot của JOIN trước lúc đợi." và "SELECT khóa user theo ID + store/branch scope trước, đọc role ở statement sau". Áp dụng: không gộp câu khóa với câu đọc quan hệ khi đổi sang QueryBuilder; giữ đúng số statement khóa và thứ tự (M-14).
- `.devloopflow/errors/2026-11-06-pb07-active-resource-race.md` — nguyên văn: "Giữ `FOR UPDATE OF s,b` khi nạp shift/branch và `FOR SHARE OF t` khi kiểm bàn cho đến commit." Áp dụng (bản 2026-11-17, G-17): `sales.service.ts:43-44` thành hai `findOne({ lock: { mode: 'pessimistic_write' } })` tuần tự (ca rồi chi nhánh), cả hai khóa giữ tới commit; `sales.service.ts:220-221` thành `find({ ..., relations: { branch: true }, lock: { mode: 'pessimistic_read', tables: ['dining_tables'] } })` (`FOR SHARE OF "DiningTable"`); test `sales.integration.test.ts:87-89` phải giữ xanh.
- `.devloopflow/errors/2026-10-28-pb02-login-password-race.md` — nguyên văn: "nạp user hiện hành bằng `FOR UPDATE OF u` trước khi so mật khẩu và tạo phiên." Áp dụng: không đổi thứ tự khóa trong `auth.service.ts`.
- `.devloopflow/errors/2026-10-28-pb02-session-revocation-races.md` — nguyên văn: "refresh/logout khóa user rồi session theo cùng thứ tự". Áp dụng: advisory lock theo session ở `auth.service.ts:262,351` giữ nguyên vị trí.
- `.devloopflow/errors/2026-10-29-pb02-username-normalization.md` — nguyên văn: "DTO và service dùng JavaScript trim ... PB-01 dùng PostgreSQL `lower(btrim(...))`." và "bootstrap và login chuẩn hóa bằng cùng biểu thức PostgreSQL." Áp dụng: KHÔNG thay `SELECT lower(btrim($1::text))` bằng `trim().toLowerCase()` của JavaScript; khi bọc vào QueryBuilder giữ NGUYÊN biểu thức PostgreSQL (`lower(btrim(CAST(:username AS text)))`) và viết test đặc tả xanh trên SQL cũ trước khi đổi (ST-3).
- `.devloopflow/errors/20261113-payment-test-seed-db-clock-flaky.md` — quy tắc phòng tránh (nguyên văn): "Khi test seed mốc thời gian bằng đồng hồ DB (`now()`) rồi gọi API ghi mốc sau bằng đồng hồ Node, seed lùi (`now() - interval '1 minute'`) hoặc dùng cùng một đồng hồ; không dựa vào hai đồng hồ khớp nhau." và "Dùng `--test-name-pattern` theo tên test cha khi chạy subtest lồng nhau (pattern của subtest không chạy được)."
- `.devloopflow/errors/20261113-sprint09-test-gaps-money-and-concurrency.md` — quy tắc phòng tránh (nguyên văn): "Với mỗi query tính tiền có điều kiện lọc (`method`, `status`), thêm test có dữ liệu "gần đúng" bị loại (TRANSFER còn `PAID`) để điều kiện lọc có đột biến đỏ." Áp dụng cho `shifts.service.ts:81` (`cashSales`) và `sales.service.ts:346,528`.
- `.devloopflow/errors/20261114-reports-cross-branch-shift-and-payment-paid-at-untested.md` — quy tắc phòng tránh (nguyên văn): "Mỗi điều kiện lọc phạm vi hoặc cột thời gian phải có test mà dữ liệu cố ý lệch (khác chi nhánh, hai cột thời gian khác ngày) và kiểm đột biến bỏ điều kiện hoặc đổi cột." Áp dụng cho `reports.service.ts:106` (điều kiện `branch_id` tùy chọn).
- `.devloopflow/errors/20261114-reports-date-before-chart-range-untested.md` — quy tắc phòng tránh (nguyên văn): "Khi một giá trị phụ thuộc hai đầu vào độc lập (ngày báo cáo, khoảng biểu đồ), test cả hai chiều lệch (date trước, sau, trong khoảng) và đột biến `LEAST`/`GREATEST`." Áp dụng: khi chuyển `REVENUE_SQL` sang CTE QueryBuilder (ST-6), giữ nguyên biểu thức `LEAST($4::date, $5::date)` / `GREATEST($4::date, $6::date)` (chỉ đổi tham số đặt tên); test có sẵn `test_ST2_AC5_date_before_chart_range` và `test_ST2_AC5_days_range_validation` phải xanh trước và sau.
- `.devloopflow/errors/20261111-cash-reconciliation-exceeds-money-limit.md` — quy tắc phòng tránh (nguyên văn): "Khi thêm nguồn doanh thu dùng cho đối soát, kiểm tra cả giới hạn của tổng tiền cần ghi khi đóng ca dưới cùng khóa đồng thời." Áp dụng: giữ truy vấn `sales.service.ts:346-348` chạy sau `writable()` (dưới khóa ca) như hiện tại.
- `.devloopflow/errors/2026-10-30-module-refactor-evidence-runner.md` — bài học: so sánh kết quả bằng dữ liệu đã chuẩn hóa, không so chuỗi thô phụ thuộc định dạng. Áp dụng: hàm `lockSequence` chuẩn hóa dấu nháy kép và khoảng trắng trước khi so.

## Quyết định
- Quyết định mới (2026-11-17) → user nói nguyên văn: "chỉ các câu phức tập ko dùng được các hàm truy vấn findOne find create update delete thì mới dùng qua querybuilder. sửa lại plan và các tài liệu liên quan". Hệ quả (thay các quyết định cũ nói ngược lại):
  - Thứ tự ưu tiên bắt buộc (cập nhật theo lời bổ sung bên dưới): (1) đọc bằng `find*`/`count*`/`exists*` với `where` (kể cả lồng trên relation), `select`, `order`, `relations`, `lock: { mode, tables }`, `FindOperator`; (2) ghi bằng `create`/`save`/`insert`/`update`/`upsert`/`increment`/`delete`; (3) nhiều lời gọi (1)/(2) tuần tự thay JOIN khi bảng không có relation (hoặc khai báo relation không đổi schema); (4) QueryBuilder CHỈ khi (1)-(3) không đủ, theo 6 mã lý do L1..L6 ở "Thiết kế tổng thể".
  - Mỗi câu lệnh QueryBuilder do task này thêm có đúng một dòng chú thích `// QueryBuilder: <lý do tiếng Anh>` ngay trước câu lệnh.
  - Trong `db.transaction(async manager => ...)` chỉ dùng `manager.getRepository(Entity)` / `manager.createQueryBuilder()`; không dùng repository inject (user đã hỏi điều này; đưa vào quy định chung).
  - Giữ nguyên bất biến: hành vi API, transaction, thứ tự khóa dòng, `bigint` là chuỗi, idempotency, không `.query(` thô ngoài migration/test; test khóa bằng `src/database/tests/sql-capture.ts`.
  - Các quyết định cũ "Bọc hết vào QueryBuilder" (2026-11-16) và cách dùng `fromDummy()` chỉ còn đúng cho advisory lock và health (không có method nào chạy được, mã L5); các chỗ QueryBuilder làm được bằng method (khóa một bảng, khóa bảng gốc lọc qua relation, `INSERT/UPDATE ... RETURNING`, upsert, JOIN thay bằng relation hoặc nhiều `find`, đếm có lọc) đổi sang method ở ST-3b..ST-6b và trong thiết kế ST-7..ST-17.
- Lời bổ sung của user (2026-11-17, do agent chính chuyển nguyên văn): "khi nào mà các mã ngắn gọn như find findOne relations where phức tạp mà ko làm được nữa thì mới nghĩ đến query builder bởi vì querybuilder cực kì phức tạp rối rắm lỡ sai 1 char thôi cũng gây 500 cho server còn find hoặc findOne hoặc các hàm ngắn hơn đỡ sai sót". Hướng áp dụng do agent chính truyền: QueryBuilder là phương án CUỐI; mỗi truy vấn thử (1)-(4) như trên; bảng quyết định ghi rõ đã thử và vì sao (1)-(3) không đủ; tránh chuỗi SQL viết tay trong QueryBuilder (`select('lower(btrim(...))')`, `fromDummy()`); chuẩn hóa username làm bằng JavaScript nếu hành vi tương đương (kiểm với test hiện có). Hệ quả: thiết kế bản 2 (33 câu QueryBuilder thay 69 của bản 1); G-12, G-14 bản 1 bị thay; thêm G-17, G-18.
- Trả lời của user 2026-11-17 (agent chính chuyển nguyên văn): "1>làm luôn / 2 sang JS / 4.đồng ý / 5 đồng ý / tách 2 findone" và "đồng ý" cho G-10. Hệ quả:
  - Q1 → LÀM LUÔN: thêm ST-19 (auth), ST-20 (users, platform, bootstrap-admin), ST-21 (organization), ST-22 (menu), ST-23 (shifts) chuyển QueryBuilder có sẵn trên `master`; `menu`, `organization` vào phạm vi; module chưa có test khóa/đặc tả thì viết test characterization trước.
  - Q2 → CHẤP NHẬN `normalizeUsername` bằng JavaScript (ST-3b), kể cả khác biệt với vài ký tự Unicode hiếm.
  - Câu 3 (G-17) → TÁCH hai `findOne({ lock })` đúng thứ tự khóa cũ (`sales.service.ts:43` `OF s,b`; `inventory.service.ts:222` `OF b,i`).
  - Câu 4 → ĐỒNG Ý đổi literal race `payment.integration.test.ts:1129` thành `FROM "stores" "Store"` ở ST-5b (sau RED đúng).
  - Câu 5 → ĐỒNG Ý ST-4b..ST-6b là refactor dưới test xanh, không RED riêng.
  - G-10 → ĐỒNG Ý làm lại ST-3..ST-6 bằng ST-3b..ST-6b.
- (Đã duyệt bởi câu 4 ở trên) Đề xuất ngoại lệ test cũ mới cho ST-5b — đổi literal `waiting('FROM "stores" "s"')` thành `waiting('FROM "stores" "Store"')` ở `POS_API/src/sales/tests/payment.integration.test.ts:1129` vì `findOne({ lock })` sinh alias `"Store"` (SQL đã dựng ở "Khám phá"); chỉ thực hiện sau RED đúng `bank change must wait for QR store lock`; giữ helper `waiting`, Lock, timeout/poll, mọi assertion, thứ tự request, trạng thái cuối.
- (Đã duyệt bởi câu 5 ở trên) ST-4b..ST-6b là bước Refactor dưới test xanh (hành vi không đổi), không có RED riêng; bằng chứng là test cũ và test khóa xanh trước/sau, test characterization mới (ST-4b.AC-3), grep đếm chú thích/`setLock`, diff. RED có ở ST-3b (test `normalizeUsername` chưa có export) và race ST-5b (literal).
- Delta ST-6/ST-13 cũ đã được user duyệt bằng "duyệt" ngày 2026-11-17; xem task active và dòng changelog bổ sung bên dưới. Cổng mới AC-1 chưa được duyệt; không mở lại quyết định mock/counter đã duyệt.
- Delta ST-6.AC-1 ĐÃ được user duyệt ngày 2026-11-17: thêm đúng một request `ownerGet` và hai assertion code/message vào ca foreign branch hiện hữu, giữ assertion status 404. Chọn ba dòng vì helper/fixture đã đủ; không tạo test/fixture mới. Cổng duyệt phải nêu rõ ngoại lệ characterization trên mã hiện tại đã chuyển ORM, không có RED riêng và chưa có runtime hai assertion mới trên SQL cũ. Skill `tdd-task/SKILL.md` mục 3 bước 2 yêu cầu test pass ngay thì sửa test; mục 5 chỉ cho tick AC có Red/Green. Vì vậy không tự coi plan là ngoại lệ đã có: chỉ sau user duyệt rõ ngoại lệ riêng này, agent chính mới được giao tdd bổ sung assertion và tick ST-6.AC-1 bằng characterization xanh, focused/module/suite và diff. Chưa duyệt hoặc thiếu chứng cứ thì giữ AC trống. Không thay RED/GREEN của AC khác; không sửa production/expected để tạo RED, không dùng RED mock AC-7 thay RED AC-1.
- Câu hỏi: Chia PR → Trả lời của user: "1 PR cho toàn bộ". Hệ quả: một nhánh `refactor/orm-entities`, mỗi sub-task một commit do agent chính tạo sau khi sub-task xanh; không push khi chưa được yêu cầu.
- Câu hỏi: Spec → Trả lời của user: "Bỏ qua spec, ghi quy ước vào rules/database.md (Recommended)".
- Câu hỏi: Ai viết code → Trả lời của user: "Giao subagent tdd theo devloopflow (Recommended)".
- Câu hỏi: Ngoại lệ SQL → Trả lời của user: "Cho giữ SQL thuần, có chú thích lý do (Recommended)". Chỉ khi QueryBuilder/repository thật sự không diễn đạt được; các ngoại lệ phải liệt kê trong `rules/database.md`. (Đã được thay bằng hai quyết định 2026-11-16 bên dưới: "Bọc hết vào QueryBuilder" và "6 truy vấn khó cũng cập nhật thành querybuilder luôn"; kết quả không còn ngoại lệ.)
- Câu hỏi: Phạm vi → Trả lời của user: "làm đi" (4 bước đề xuất ở "Mục tiêu và bối cảnh").
- Câu hỏi (2026-11-16): 15 lời gọi SQL không đọc/ghi bảng (`SELECT 1`, `pg_advisory_xact_lock`, `lower(btrim(...))`) giữ SQL thuần hay bọc QueryBuilder → Trả lời của user: "Bọc hết vào QueryBuilder". Hệ quả: dùng `createQueryBuilder().select(...).fromDummy()` (bằng chứng ở "Khám phá"), giữ nguyên biểu thức PostgreSQL; không còn là ngoại lệ. (2026-11-17: còn áp dụng cho advisory lock và health — mã L5, thêm chú thích ở ST-3b; chuẩn hóa username đổi sang JavaScript `normalizeUsername` theo G-18.)
- Câu hỏi (2026-11-16): 3 câu `ON CONFLICT ... DO NOTHING` có cột đích và 3 truy vấn gộp (báo cáo doanh thu, nguyên liệu cần trừ, cảnh báo âm kho) → Trả lời của user: "Giữ SQL thuần, có chú thích lý do (Recommended)".
- Câu hỏi (2026-11-16): cách kiểm khóa dòng → Trả lời của user: "Test ghi lại SQL đã chạy rồi so thứ tự khóa (Recommended)".
- Câu hỏi (2026-11-16): 6 giả định G-1, G-4, G-5, G-6, G-7, G-8 → Trả lời của user: "Đồng ý cả 6 (Recommended)".
- Quyết định mới (2026-11-16, thay quyết định "Giữ SQL thuần, có chú thích lý do" cho 3 câu `ON CONFLICT` và 3 truy vấn gộp) → user: "6 truy vấn khó cũng cập nhật thành querybuilder luôn". Hệ quả: không còn ngoại lệ SQL thuần; `.query(` ngoài migrations/tests = 0; `rules/database.md` ghi quy ước "không có ngoại lệ".
- Câu hỏi: Chia PR (nhắc lại 2026-11-16) → user chọn "1 PR cho toàn bộ": một nhánh `refactor/orm-entities`, nhiều commit nhỏ, mỗi sub-task một commit; không push khi chưa được yêu cầu.

- Quyết định delta ST-3 (2026-11-16): đề xuất nguyên văn "Cho phép sửa duy nhất mock health trong `POS_API/src/foundation.test.ts` để gây lỗi ở `PostgresQueryRunner.prototype.query` cho câu SELECT health, khôi phục sau test; giữ nguyên mọi assertion 200/503, mã lỗi, message, requestId." → user trả lời nguyên văn "đồng ý", sau đó duyệt bản plan delta bằng "duyệt". Nguồn: hội thoại user ngày 2026-11-16; `.devloopflow/tasks/active/20261116-orm-entities-refactor.md` mục "Blocked".

- Quyết định delta ST-5/ST-10 đã duyệt (2026-11-17): cho phép thay đúng hai literal truyền vào `waiting(...)` của race cũ ở `payment.integration.test.ts:1126,1129`. ST-5 đổi literal store; ST-10 chỉ đổi literal INSERT sau khi SQL thực tế không còn khớp mẫu cũ. User nói nguyên văn "tiếp" sau thông báo đang lập draft delta ST-5; đây là cho tiếp tục lập draft, không phải duyệt plan hoặc cho sửa test trước cổng duyệt. Mọi quyết định đã duyệt trước giữ nguyên.

- Delta ST-6/ST-13 đã được user duyệt ngày 2026-11-17: đúng ba mock/import/original/restore và duy nhất assertion MỚI `assert.ok(one > 0)`. Mọi assertion hiện hữu giữ nguyên. Chỉ thực hiện đúng phạm vi đã duyệt và RED đúng nguyên nhân tại sub-task sở hữu; không coi là duyệt AC-1.
- Chọn một dòng kiểm count dương trong counter hiện hữu thay test/fixture mới vì hai request/setup đã có; đề xuất kỹ thuật này đã duyệt ngày 2026-11-17.

## Giả định
G-1..G-9: user đã xác nhận 2026-11-16 (G-2, G-4, G-5 được thay một phần bởi quyết định 2026-11-17, ghi chú tại chỗ). Đã xác nhận 2026-11-17: G-10, G-17, nội dung G-16 (câu 4, câu 5). CHƯA xác nhận, user chốt ở cổng duyệt: G-11, G-12, G-13, G-14, G-15, G-16 (phần còn lại nếu có), G-18 (Q2 đã chấp nhận dùng JavaScript; giữ trong danh sách theo yêu cầu agent chính), G-19, G-20.
- G-10: Các sub-task đã xong theo quy tắc cũ (ST-3, ST-4, ST-5, ST-6) được làm lại theo quy tắc mới ở sub-task riêng ST-3b, ST-4b, ST-5b, ST-6b (không mở lại tick của ST-3..ST-6; tick cũ là bằng chứng hành vi). — xác nhận bởi: user "đồng ý" 2026-11-17.
- G-11 (bản 2): Advisory lock (10 chỗ: `auth.service.ts` 4, `bootstrap-admin.ts` 1, ST-10 2, ST-11 1, ST-16 2) và health `SELECT 1` GIỮ `fromDummy()` QueryBuilder kèm chú thích L5, vì: không method repository nào lấy advisory lock hay chạy câu không bảng; `.query(` thô bị cấm; thay advisory lock bằng khóa dòng đổi hành vi; health đọc bảng thật sẽ trả 503 khi DB chạy nhưng chưa migrate và phải sửa lại mock health đã duyệt (`foundation.test.ts`, khớp nguyên SQL). — chờ user xác nhận.
- G-12 (bản 2, thay bản 1): Danh sách có cursor đếm bằng method (`count({ where })`, `countBy`, hai `count` nhân nhau cho `listStocks`, `In(branchIds)` cho `listMovements`); chỉ câu trang dùng QueryBuilder (L2/L6). Ngoại lệ: `sales.list` đếm vẫn QueryBuilder (L6). Rủi ro bộ lọc đếm và trang lệch nhau giảm bằng test `total` có lọc (ST-4b.AC-3, ST-9.AC-2, ST-10.AC-4). — chờ user xác nhận.
- G-13 (bản 2): `UPDATE ... RETURNING` dùng `update(criteria, values, { returning: '*' })`; `INSERT ... RETURNING *` dùng `insert` rồi `findOneBy({ id })` (thêm một câu SELECT; trong transaction dùng cùng `manager`). — chờ user xác nhận.
- G-14 (bản 2, thay bản 1): Được dùng `relations` và `where` lồng trên relation ĐÃ khai báo. Câu đọc không khóa dùng `findOne` (chấp nhận hai câu lệnh khi có join). Câu có khóa và lọc qua relation dùng `find({ ..., lock: { mode, tables: ['<bảng gốc>'] } })[0]` để giữ một câu lệnh và chỉ khóa bảng gốc (M-20). Không khai báo relation mới (không cần: các bảng không có relation dùng nhiều `find`). — chờ user xác nhận.
- G-15: Chi tiết TypeORM (bảng "Quy tắc chuyển", mã lý do L1..L6, marker `// QueryBuilder:`, cảnh báo `null`/`undefined` trong `where`, `onConflict()`, `fromDummy()`, `normalizeUsername`) ghi vào `POS_API/README.md`; `rules/database.md` chỉ giữ quy tắc không phụ thuộc công nghệ vì `rules/database.md:3` "Áp dụng cho mọi công nghệ lưu trữ quan hệ và mọi ORM" và `CLAUDE.md` "Các rule này không phụ thuộc ngôn ngữ/công nghệ". Thay E2E-AC-9/ST-18.AC-1 cũ (bảng nằm trong `rules/database.md`). — chờ user xác nhận.
- G-16: Đề xuất ngoại lệ test cũ ST-5b (literal `FROM "stores" "Store"`) và cách làm Refactor không RED cho ST-4b..ST-6b ở "Quyết định". — nội dung đã được user duyệt bằng câu 4 "đồng ý" và câu 5 "đồng ý" 2026-11-17; giữ nhãn chờ cổng duyệt theo yêu cầu agent chính.
- G-17 (mới): Khóa nhiều bảng trong một câu cũ (`sales.service.ts:43` `FOR UPDATE OF s,b`; `inventory.service.ts:222` `FOR UPDATE OF b,i`) đổi thành hai `findOne({ lock })` tuần tự theo đúng thứ tự alias cũ, vì `find` + relation không khóa được bảng phía LEFT JOIN (M-20). Hai khóa vẫn giữ tới commit (yêu cầu của lỗi `2026-11-06-pb07-active-resource-race.md`); test khóa ghi trên mã cũ được so với mảng đã tách token (`UPDATE:a,b` → `UPDATE:a`, `UPDATE:b` cùng vị trí); test `sales.integration.test.ts:87-89` (`55P03`) giữ xanh. Phương án đã loại: giữ QueryBuilder `setLock(..., ['s', 'b'])` (an toàn hơn về số câu lệnh nhưng trái "QueryBuilder là phương án cuối"). — xác nhận bởi: user "tách 2 findone" 2026-11-17.
- G-18 (mới, thay một phần G-5): Chuẩn hóa username bằng một hàm JavaScript dùng chung `normalizeUsername` (export ở `auth/auth.service.ts`) thay 4 câu `lower(btrim(...))`; KHÔNG dùng `trim()` (bỏ cả TAB, làm đỏ test `'  \tADMIN  '` → `'\tadmin'`). Tương đương với PostgreSQL cho ASCII, TAB và chữ Việt (kiểm ở ST-3b.AC-2); có thể khác với một số ký tự Unicode — user chấp nhận ở Q2 ("2 sang JS") 2026-11-17. — chờ xác nhận ở cổng duyệt theo yêu cầu agent chính.
- G-19 (mới): So sánh với đồng hồ DB trong `where` (`expires_at > now()`, `occurred_at > now() - (:seconds * interval '1 second')`, `occurred_at < now() - interval '15 minutes'`) dùng `Raw((alias) => ...)` — một `FindOperator` của bước (1) — thay vì `MoreThan(new Date())`, để giữ đồng hồ DB (lỗi `20261113-payment-test-seed-db-clock-flaky.md`). SQL đã dựng ở "Khám phá". — chờ user xác nhận.
- G-20 (mới): Khi SQL cũ so cột với giá trị danh tính có thể `null` (kết quả: không dòng nào → 404), code mới kiểm trước và ném đúng lỗi cũ, vì `find*` bỏ điều kiện `null`. Áp dụng ST-20 (`staff`), ST-21 (`branchInScope`, `patchBranch`, `patchTable`). — chờ user xác nhận.

Giả định G-1..G-9 (user đã xác nhận 2026-11-16):
- G-1: Sub-task tài liệu (`rules/database.md`, `TECH_STACK.md`, `README.md`) làm CUỐI (ST-18) vì quy ước (gồm cách dùng `onConflict()`, CTE, sub-query thay `UNION ALL`) chỉ chốt sau khi chuyển xong và kiểm grep = 0. — xác nhận bởi: user "Đồng ý cả 6 (Recommended)" 2026-11-16.
- G-2: Không có ngoại lệ SQL thuần. 15 lời gọi không đọc/ghi bảng (E1/E2/E3) bọc bằng `fromDummy()`; 6 truy vấn khó (E4/E5/E6) chuyển theo "Bảng chuyển 6 truy vấn khó": E6 dùng `onConflict()` (deprecated nhưng sinh đúng SQL), E5 dùng hai sub-query gom nhóm + `LEFT JOIN`, E4 dùng CTE QueryBuilder trong một statement. — xác nhận bởi: user "Bọc hết vào QueryBuilder" và "6 truy vấn khó cũng cập nhật thành querybuilder luôn" 2026-11-16; cách diễn đạt từng chỗ do planner chọn theo bằng chứng ở "Khám phá". (2026-11-17: phần "không ngoại lệ SQL thuần" giữ nguyên; phần chọn QueryBuilder cho chỗ method làm được bị thay bởi quyết định 2026-11-17 và G-10..G-14.)
- G-3: Kiểm khóa dòng không đổi bằng test đặc tả "chuỗi khóa" (ghi lại câu SQL qua mock `PostgresQueryRunner.prototype.query`, rút ra thứ tự `FOR UPDATE/FOR SHARE/advisory`) thay vì test chờ khóa thật cho từng chỗ. — xác nhận bởi: user "Test ghi lại SQL đã chạy rồi so thứ tự khóa (Recommended)" 2026-11-16.
- G-4: Không còn chú thích `// raw-sql:` vì không còn ngoại lệ (quyết định mới 2026-11-16 thay phần chú thích ngoại lệ đã đồng ý trước đó). Chú thích mới nếu cần (ví dụ lý do dùng `onConflict()` deprecated, lý do thay `UNION ALL`) viết tiếng Anh, một dòng, theo ngôn ngữ chú thích sẵn có (`sales.service.ts:292`, `:518`, `:541`, `reports.service.ts:38`, `:95`, `sepay-webhook.service.ts:95`); giữ nguyên chú thích sẵn có `reports.service.ts:38` "One statement = one snapshot". — xác nhận bởi: user "Đồng ý cả 6 (Recommended)" 2026-11-16 (ngôn ngữ chú thích) và quyết định mới 2026-11-16 (không ngoại lệ). (2026-11-17: thêm chú thích bắt buộc `// QueryBuilder: <lý do>` một dòng tiếng Anh cho mỗi câu lệnh QueryBuilder theo quyết định 2026-11-17; câu chữ theo mã L1..L6 bản 2.)
- G-5: Sáu chỗ khóa mã giảm giá giống nhau (`SELECT p.id FROM promotion_codes p JOIN invoice_promotion_codes ip ... FOR UPDATE OF p` ở `sales.service.ts:305,340,370,539`, `transfer-attempts.service.ts:82,148`, `sepay-webhook.service.ts:64`) được chuyển tại chỗ, KHÔNG gộp thành hàm mới, để giữ cấu trúc layer và đồ thị gọi hiện có (Ponytail: không thêm abstraction ngoài yêu cầu). Cùng nguyên tắc: các lời gọi advisory lock và chuẩn hóa username bọc QueryBuilder tại chỗ, không tạo hàm dùng chung. — xác nhận bởi: user "Đồng ý cả 6 (Recommended)" 2026-11-16. (2026-11-17: phần chuẩn hóa username thay bởi G-18 — một hàm JavaScript dùng chung; sáu chỗ khóa mã giảm giá vẫn chuyển tại chỗ, không gộp hàm, nay theo cách "hai `find`" ở bảng quy tắc.)
- G-6: Entity mới theo đúng quy ước `invoice.entity.ts`: không relation, `created_at`/`updated_at` là `@Column('timestamptz')` thường, không khai báo `default`. Join trong QueryBuilder dùng entity đích + điều kiện (`innerJoin(Branch, 'b', 'b.id = i.branch_id')`). — xác nhận bởi: user "Đồng ý cả 6 (Recommended)" 2026-11-16; nguồn `POS_API/src/sales/entities/invoice.entity.ts`, `POS_API/README.md:29`.
- G-7: Thay `FROM branches b CROSS JOIN ingredients i ... WHERE b.store_id=$1 AND i.store_id=$1` (`inventory.service.ts:205,208-211`) bằng `innerJoin(Ingredient, 'i', 'i.store_id = b.store_id')` + `b.store_id = :store`. Tương đương vì hai điều kiện `= $1` kéo theo `i.store_id = b.store_id`; lý do đổi: PostgreSQL báo lỗi tham chiếu khi trộn danh sách FROM dấu phẩy với `LEFT JOIN ... ON s.branch_id=b.id` (JOIN gắn chặt hơn dấu phẩy). Có test đặc tả trước khi đổi (ST-9). — xác nhận bởi: user "Đồng ý cả 6 (Recommended)" 2026-11-16; tdd chứng minh bằng test RF-3.
- G-8: Câu `SELECT EXISTS(...) OR EXISTS(...)` (`inventory.service.ts:121-125`) và `UNION ALL` kiểm khóa idempotency (`transfer-attempts.service.ts:67-68,140`, `sales.service.ts:299-300,334-335`) đổi thành nhiều lời gọi `existsBy` tuần tự trong cùng transaction. Không có khóa nào phụ thuộc vào việc gộp một statement: ở `inventory` dòng `ingredients` đã bị `FOR UPDATE` (`:114`) nên mọi INSERT tham chiếu nó (FK lấy `FOR KEY SHARE`) phải chờ; ở các chỗ idempotency đã có `pg_advisory_xact_lock` theo key ngay trước. — xác nhận bởi: user "Đồng ý cả 6 (Recommended)" 2026-11-16; nguồn `inventory.service.ts:114`, `transfer-attempts.service.ts:60,133`, `sales.service.ts:293,327`.
- G-9: Baseline `npm test` = 256 test: `# tests 256`, `# pass 256`, `# fail 0`, `duration_ms` 199872, exit 0, chạy 2026-11-16 trên nhánh `refactor/orm-entities` khi chưa đổi mã. Môi trường: PostgreSQL Docker `pos_infra-postgres-1`, cổng host `5432` (container map `127.0.0.1:5432->5432`). M-34 ghi cổng `15432` là thông tin cũ. Mật khẩu trong `POS_INFRA/.env.local` KHÔNG khớp container; agent chính dựng `DATABASE_URL` từ `docker exec pos_infra-postgres-1 printenv POSTGRES_*` và truyền trong lệnh (không in, không ghi file, không ghi mật khẩu vào plan/task/evidence). — xác nhận bởi: agent chính chạy baseline 2026-11-16 (truyền cho planner).

## Phạm vi
- Trong:
  - Thêm 12 entity (danh sách ở ST-1) và đăng ký trong `POS_API/src/database/data-source.ts`.
  - Thêm helper test `POS_API/src/database/tests/sql-capture.ts` và test của nó.
  - Chuyển toàn bộ 156 lời gọi `.query(` sang repository/QueryBuilder trong 13 file; không có ngoại lệ.
  - Test đặc tả (characterization) cho hành vi có thể đổi khi chuyển ORM mà chưa có test: chuỗi khóa, cursor micro giây, mã lỗi chưa test, `CROSS JOIN` → `INNER JOIN`, kiểu dữ liệu trả về.
  - Delta ST-3 đã duyệt: cập nhật riêng mock health của test cũ `POS_API/src/foundation.test.ts:112-123` và import cần cho mock, giữ nguyên mọi assertion 200/503, mã lỗi, message, requestId (user đồng ý hướng và duyệt plan delta ngày 2026-11-16).
  - Delta ST-5/ST-10 đã duyệt: đổi literal store `SELECT id FROM stores` thành `FROM "stores" "s"` trong `test_ST5_account_permission_race` (`payment.integration.test.ts:1129`); ST-10 chỉ đổi literal INSERT `INSERT INTO transfer_attempts` thành `INSERT INTO "transfer_attempts"` (`:1126`) khi SQL INSERT thực tế không còn khớp mẫu cũ. Giữ helper `waiting`, Lock, timeout/poll, mọi assertion, thứ tự request và trạng thái cuối.
  - Delta ST-6/ST-13 đã duyệt: chỉ hai mock reports trong test_ST2_AC7_consistent_statement/test_ST2_AC7_failure_readonly và counter invoices-read :248-258; import/original/restore cho QueryRunner, thêm duy nhất assert.ok(one > 0) sau const one = queries ở counter. Phạm vi kỹ thuật bắt buộc ở “Delta ST-6/ST-13: ba mock cũ”. Mọi assertion hiện hữu/helper/barrier/cancel/lỗi giả/digest/request/dữ liệu cuối giữ nguyên.
  - Delta ST-6.AC-1 ĐÃ duyệt ngày 2026-11-17: chỉ bổ sung ba dòng trong `test_ST2_AC3_scope_permissions_http` của `POS_API/src/reports/tests/reports.integration.test.ts`, ngay sau assertion foreign branch 404: một request `ownerGet` với `owner_a`/`branchId: w.id.b1`, hai assertion `body.error.code`/`body.error.message`. Giữ nguyên assertion cũ/helper/fixture/service; characterization theo cổng duyệt riêng ở “Quyết định”. Đây là ngoại lệ bổ sung ngoài các delta cũ, thay giới hạn “duy nhất assertion MỚI” toàn plan bằng giới hạn cục bộ cho counter ST-13. Mọi phần cấm sửa/xóa/skip assertion cũ vẫn giữ nguyên.
  - Làm lại ST-3..ST-6 theo quy tắc 2026-11-17 ở ST-3b (chỉ chú thích), ST-4b (`promotions.service.ts`), ST-5b (`store-bank-account.service.ts` và literal race `payment.integration.test.ts:1129` sau duyệt), ST-6b (chỉ chú thích); thiết kế ST-7..ST-17 theo quy tắc mới.
  - 42 dòng chú thích `// QueryBuilder: <lý do>` (33 cho câu chuyển từ `.query(`, 9 cho câu có sẵn trên `master` còn giữ).
  - ST-19..ST-23: chuyển 61 câu QueryBuilder có sẵn trên `master` (Q1 "làm luôn"), kèm test characterization cho `organization`, `menu` và test khóa cho auth, users/platform, shifts.
  - Hàm `normalizeUsername` (export ở `POS_API/src/auth/auth.service.ts`) thay 4 câu `lower(btrim(...))` (G-18).
  - Cập nhật `rules/database.md`, `docs/architecture/TECH_STACK.md`, `POS_API/README.md` (mục entity, quy ước truy vấn TypeORM theo G-15).
  - Chạy `graphify update .` sau khi sửa code và semantic update Graphify cho 3 file Markdown đã sửa (theo `CLAUDE.md` mục Graphify).
- Ngoài:
  - Đổi hành vi API, mã lỗi, thông điệp lỗi, thứ tự kiểm tra (M-30), transaction, khóa dòng và thứ tự khóa, kiểu `bigint`, idempotency, snapshot giá.
  - Đổi nghiệp vụ, thêm tính năng Giai đoạn 2, PB-16 (bãi bỏ hủy đơn PAID).
  - Migration mới, sửa migration cũ, `schema:sync`; đổi `foundation.test.ts:37`.
  - Sửa, xóa hay skip test hiện có; đổi assertion cũ. Các ngoại lệ: delta ST-3 đã duyệt (mock health/import/restore foundation); delta ST-5/ST-10 đã duyệt (tối đa hai literal waiting theo phần “Trong”, INSERT chỉ khi SQL runtime lệch mẫu); đề xuất ST-5b chờ duyệt (literal store dòng 1129 đổi tiếp thành `FROM "stores" "Store"`, vẫn tối đa hai literal so với `master`); delta ST-6/ST-13 đã duyệt (đúng ba mock/import/original/restore cùng assertion MỚI assert.ok(one > 0) riêng counter); delta AC-1 chỉ sau duyệt rõ một request/hai assertion body và ngoại lệ characterization theo phần “Trong”. Không đổi assertion hiện hữu/helper waiting/isReportSql/Lock/timeout/poll/barrier/cancel/lỗi giả/digest/thứ tự request/trạng thái cuối hoặc test cũ khác.
  - Thêm dependency; thêm repository tự chế, wrapper, base class, barrel export entity.
  - Khai báo relation cho entity cũ hoặc mới; đổi entity hiện có.
  - `POS_UI/`, `POS_INFRA/`. (2026-11-17: `menu`, `organization` vào phạm vi theo Q1 "làm luôn", ST-21, ST-22.)
  - Đổi helper phân trang dùng chung (`menuPageResponse`, `organizationPageResponse`, `platformPageResponse`) sang method: không thuộc yêu cầu; câu trang giữ QueryBuilder L2.
  - Đặt `invalidWhereValuesBehavior` trong DataSource (đổi hành vi mọi `find` hiện có; không thuộc yêu cầu); thay vào đó quy định chung cấm truyền `null`/`undefined` vào `where`/criteria.
  - Tạo hàm dùng chung cho advisory lock (G-5). (Chuẩn hóa username: một hàm `normalizeUsername` theo G-18, trong phạm vi.)
  - Khai báo relation mới (2026-11-17: đã cân nhắc theo lời bổ sung của user; không cần vì các bảng không có relation dùng nhiều `find`, G-14).
  - Push nhánh, mở PR.

## Thiết kế tổng thể
- Luồng chính:
  1. ST-1 thêm 12 entity + test đối chiếu metadata với `information_schema.columns`.
  2. ST-2 thêm helper test `captureSql`/`lockSequence` + unit test chuẩn hóa.
  3. Từng module (ST-3 → ST-17): (a) viết test đặc tả còn thiếu, chạy XANH trên SQL cũ; (b) chuyển truy vấn; (c) chạy lại test đặc tả và test module, rồi `npm test` toàn bộ; (d) agent chính commit sub-task.
  4. ST-18 ghi quy ước (không có ngoại lệ SQL thuần) vào tài liệu, chạy AC grep tổng (= 0), `graphify update .`, semantic update Markdown.
  5. (Bổ sung 2026-11-17) Trước ST-7: ST-3b → ST-4b → ST-5b → ST-6b làm lại phần đã xong theo quy tắc mới, mỗi sub-task chạy test module + `npm test` xanh, agent chính commit riêng. ST-7..ST-17 viết thẳng theo quy tắc mới (bảng "Truy vấn" của từng sub-task ghi `repo` hoặc `QB` + mã lý do).
- Thành phần tham gia: `POS_API/src/**/entities/*.entity.ts`, `POS_API/src/database/data-source.ts`, 13 file service/controller có `.query(`, `POS_API/src/database/tests/`, test module trong `POS_API/src/<module>/tests/`, `rules/database.md`, `docs/architecture/TECH_STACK.md`, `POS_API/README.md`.
- Quy tắc chuyển bản 2026-11-17 (bản 2; thay mọi bản trước). Nguồn: user 2026-11-17 "chỉ các câu phức tập ko dùng được các hàm truy vấn findOne find create update delete thì mới dùng qua querybuilder" và lời bổ sung cùng ngày "khi nào mà các mã ngắn gọn như find findOne relations where phức tạp mà ko làm được nữa thì mới nghĩ đến query builder bởi vì querybuilder cực kì phức tạp rối rắm lỡ sai 1 char thôi cũng gây 500 cho server còn find hoặc findOne hoặc các hàm ngắn hơn đỡ sai sót". Chi tiết TypeORM ghi vào `POS_API/README.md` ở ST-18 (G-15).
- Thứ tự thử bắt buộc cho MỖI truy vấn (bảng "Truy vấn" của từng sub-task ghi bước dùng được và, với câu QueryBuilder, vì sao (1)-(3) không đủ):
  1. Đọc bằng method: `find`, `findOne`, `findBy`, `findOneBy`, `count`, `countBy`, `exists`, `existsBy` với `where` (kể cả `where` lồng trên relation), `select` (kể cả lồng), `order`, `relations`, `lock: { mode, tables }`, `FindOperator` (`In`, `ILike`, `IsNull`, `Not`, `LessThan`...), mảng `where` cho OR.
  2. Ghi bằng method: `create`, `save`, `insert`, `update` (có `{ returning }`), `upsert` (có `{ conflictPaths, returning }`), `increment`, `delete`; giá trị hàm `() => 'now()'`, `() => 'used_count + 1'`.
  3. Nhiều lời gọi (1)/(2) tuần tự thay cho JOIN khi bảng không có relation (hoặc khai báo `@ManyToOne` không đổi schema). Trong task này KHÔNG cần khai báo relation mới: các relation cần dùng đã có, các bảng còn lại dùng nhiều `find`.
  4. QueryBuilder chỉ khi (1)-(3) không đủ, với đúng một mã lý do L1..L6 và một dòng chú thích nguyên văn ngay trước câu lệnh.
- Relation đã khai báo (đọc entity 2026-11-17): `WorkShift.branch` (`shifts/entities/work-shift.entity.ts:42-44`), `WorkShift.user` (`:46-48`), `DiningTable.branch` (`organization/entities/dining-table.entity.ts:31-33`), `Branch.store` (`organization/entities/branch.entity.ts:38-40`), `ProductSize.product`, `ProductSize.size` (`menu/entities/product-size.entity.ts:29-35`), `Product.category` (`menu/entities/product.entity.ts:35-37`), `CategoryTopping.category`, `CategoryTopping.topping` (`menu/entities/category-topping.entity.ts:13-19`). Không entity nào khai báo `eager` (grep `eager` trong `*.entity.ts` không có kết quả). 12 entity mới và `Invoice`, `InvoiceItem`, `InvoiceItemTopping` không có relation (G-6).
- Cách viết theo loại truy vấn:
  | Loại truy vấn | Cách viết (bước) | Ghi chú / bằng chứng |
  |---|---|---|
  | Đọc một bảng, không khóa | (1) `findOne`, `findOneBy`, `find`, `findBy`, `exists`, `existsBy`, `count`, `countBy` qua `manager.getRepository(E)` (trong transaction) hoặc `this.db.getRepository(E)` | Có `select` thì luôn chọn khóa chính |
  | Đọc có lọc/đọc cột qua relation đã khai báo, không khóa | (1) `findOne({ where: { ..., branch: { store_id } }, select: {...}, relations: {...} })` | `where` trên relation sinh `LEFT JOIN` (`SelectQueryBuilder.js:2553`, `:2674-2675`); `findOne` có join chạy hai câu (`EntityManager.js:625`, `SelectQueryBuilder.js:1988-1989`) — chấp nhận cho câu đọc không khóa |
  | Đọc qua bảng không có relation | (3) các `findOne`/`findOneBy`/`find` tuần tự; danh sách dùng `In([...])` | `In([])` sinh `0=1` (`QueryBuilder.js:755-757`, SQL đã dựng) |
  | Khóa một bảng | (1) `findOne({ where, select, lock: { mode: 'pessimistic_write' } })` (`pessimistic_read` cho `FOR SHARE`) | SQL `... LIMIT 1 FOR UPDATE` (đã dựng); chỉ trong transaction (`SelectQueryBuilder.js:1971`); cùng token `lockSequence` |
  | Khóa bảng gốc, lọc/đọc qua relation | (1) `find({ where: <lồng>, select, relations?, lock: { mode, tables: ['<bảng gốc>'] } })` rồi lấy `[0] ?? null` | Dùng `find` (không `findOne`) để giữ MỘT câu lệnh; SQL đã dựng: `... LEFT JOIN "branches" ... FOR UPDATE OF "WorkShift"`, `... FOR SHARE OF "DiningTable"`, `... FOR UPDATE OF "ProductSize"`. Chỉ khóa bảng gốc (phía LEFT JOIN không được khóa, M-20). Ghép `findOne` + join + lock (đường DISTINCT hai câu) CHƯA xác minh nên không dùng |
  | Khóa nhiều bảng trong một câu cũ (`FOR UPDATE OF s,b`, `OF b,i`) | (3) hai `findOne({ lock })` tuần tự theo đúng thứ tự alias trong `OF` cũ | `find` + relation không khóa được bảng phía LEFT JOIN (M-20). Token `lockSequence` đổi từ `UPDATE:a,b` thành `UPDATE:a`, `UPDATE:b` cùng vị trí (G-17) |
  | Khóa dòng đích qua bảng nối không relation (mã giảm giá qua `invoice_promotion_codes`) | (3) `findOneBy(InvoicePromotionCode, { invoice_id })`; có dòng thì `findOne(PromotionCode, { where: { id: ip.promotion_code_id }, lock })` | Hóa đơn đã bị khóa trước đó nên dòng nối không đổi giữa hai câu; khi không có mã giảm giá thì không còn câu `FOR UPDATE` rỗng (test khóa dùng hóa đơn có mã) |
  | Ghi một bảng không cần dòng trả về | (2) `insert(values)`, `update(criteria, values)`, `delete(criteria)`; `{ updated_at: () => 'now()' }`, `{ used_count: () => 'used_count + 1' }` | Không dùng `increment`/`decrement` khi cùng câu phải đặt `updated_at` (`EntityManager.js:707-736`) |
  | `INSERT ... RETURNING *` (cần `created_at`/`updated_at`/giá trị DEFAULT) | (2)+(1) `insert(values)` rồi `findOneBy({ id })` (cùng `manager` nếu trong transaction) | `Repository.insert` không có RETURNING (`Repository.d.ts:162`); thêm một câu SELECT; không dùng `save()` (thêm SELECT kiểm tồn tại vì khóa chính gán sẵn) |
  | `UPDATE ... RETURNING` | (2) `update(criteria, values, { returning: '*' })`, đọc `result.raw[0]` (G-13) | `UpdateResult.raw = records` (`UpdateResult.js:22`); KHÔNG đọc `rows[0]` kiểu `[rows, rowCount]` (M-21) |
  | `INSERT ... ON CONFLICT (...) DO UPDATE` | (2) `upsert(values, { conflictPaths: [...], returning?: [...] })`; `values` chỉ gồm cột cần ghi | SQL thêm `SET "<cột xung đột>" = EXCLUDED."<cột xung đột>"` (cùng giá trị) |
  | Giá trị âm của `numeric` (`-$4::numeric`) | (2) `insert` với chuỗi đảo dấu tính trong JavaScript: `q.startsWith('-') ? q.slice(1) : \`-${q}\`` | Thay `() => '-CAST(:quantity AS numeric)'` (Repository.insert không bind được tham số trong biểu thức, SQL đã dựng). Chuỗi `numeric` đảo dấu bằng ký tự giữ đúng giá trị; nguồn số lượng: CHECK `quantity > 0` (`20261107000000-InventoryPromotions.ts:22,30`, `20261106000000-Sales.ts:42,56`), `stock_movements.quantity <> 0` (`20261107000000-InventoryPromotions.ts:50`) |
  | Đếm có bộ lọc | (1) `count({ where })`/`countBy`; OR dùng mảng `where`; `ILIKE` dùng `ILike('%q%')` | Thay G-12 cũ (một builder cho đếm và trang): đếm bằng method, trang mới dùng QueryBuilder khi có L2 |
  | Chuẩn hóa username `lower(btrim($1::text))` | Hàm JavaScript dùng chung `normalizeUsername(value: string): string` = `value.replace(/^ +\| +$/g, '').toLowerCase()` đặt và export ở `POS_API/src/auth/auth.service.ts` (G-18; "Câu hỏi mở" Q2) | `btrim` một tham số chỉ bỏ dấu cách (lỗi `2026-10-29-pb02-username-normalization.md`: KHÔNG dùng `trim()`, vì `trim()` bỏ cả TAB và test `'  \tADMIN  '` → `'\tadmin'` đỏ). `toLowerCase()` và `lower()` của PostgreSQL có thể khác với một số ký tự Unicode (ví dụ `İ`, sigma cuối từ) — test ST-3b.AC-2 so trực tiếp với PostgreSQL |
  | Tham số tùy chọn `($n::uuid IS NULL OR col=$n)` | Method: spread có điều kiện `...(branchId !== null ? { branch_id: branchId } : {})`; QueryBuilder: `.andWhere(...)` khi khác `null` | Kết quả tương đương |
  | Giá trị `null`/`undefined` trong `where`/criteria | KHÔNG truyền. Kiểm giá trị trước (ném lỗi như code cũ) hoặc dùng `IsNull()` khi cần `IS NULL` | `find*`/`exists*`/`count*` BỎ điều kiện có giá trị `null`/`undefined` (`SelectQueryBuilder.js:2496-2510`) → có thể đọc dữ liệu cửa hàng khác; `update`/`delete` sinh `= NULL` (không khớp dòng nào) |
  | Lỗi DB (`23505`, `error.constraint`) | Giữ nguyên `catch` hiện có, bọc quanh đúng lời gọi `insert`/`update` gây lỗi | `QueryFailedError` giữ `code`, `constraint` |
  | Transaction | Trong `db.transaction(async manager => ...)` chỉ dùng `manager.getRepository(E)`, `manager.createQueryBuilder()`; không dùng `this.db.getRepository(E)` hay repository inject bên trong callback | Repository ngoài `manager` chạy trên kết nối khác, ngoài transaction và không thấy khóa của transaction |
  | QueryBuilder còn giữ (chỉ các mã L1..L6) | Viết như các dòng kỹ thuật bên dưới; đúng một dòng `// QueryBuilder: <câu của mã>` ngay trước câu lệnh; câu lệnh có nhiều builder con (CTE, sub-query) chỉ một dòng | — |
  | L4 — `ON CONFLICT (...) [WHERE ...] DO NOTHING` | `manager.createQueryBuilder().insert().into(Entity).values({...}).onConflict('<đích và WHERE chép nguyên văn SQL cũ> DO NOTHING').returning(<như cũ>).updateEntity(false).execute()`; dòng thêm được ở `result.raw` (mảng; rỗng khi trùng) | `upsert` chỉ sinh `DO UPDATE` (`EntityManager.js:304-341`); kiểm tồn tại rồi `insert` tạo khe đua (test `payment.integration.test.ts:361`). `onConflict()` sinh `ON CONFLICT ${statement}` (`InsertQueryBuilder.js:329-330`) trước `RETURNING` (`InsertQueryBuilder.js:420-427`); có `@deprecated` (`InsertQueryBuilder.js:202-209`). KHÔNG dùng `orIgnore()` (sinh `ON CONFLICT DO NOTHING` không cột đích, `:326-327`, nuốt cả lỗi trùng `idempotency_key`, `invoice_id`, `transfer_attempt_id`). `updateEntity(false)` (`:197-199`) để TypeORM không ghép kết quả vào `valueSets` (`:110-115`) |
  | L3 — Nhiều CTE trong một statement (báo cáo) | `addCommonTableExpression(<SelectQueryBuilder>, '<alias>')` cho từng CTE (`QueryBuilder.js:352-359`, `780-819`); CTE tham chiếu CTE khác bằng `from('<alias>', '<alias>')` hoặc `innerJoin('<alias>', '<alias>', 'true')` (= CROSS JOIN); câu cuối `fromDummy()` + `select(qb => <sub-query>, '<alias>')` | Không lồng CTE trong CTE (`QueryBuilder.js:788-790` ném lỗi); alias cột viết thường để tham chiếu không cần nháy |
  | L3 — `generate_series` | Sub-query `qb.select('generate_series(0, CAST(:toDate AS date) - CAST(:fromDate AS date))', 'g').fromDummy()` dùng làm `from(qb => ..., 'gs')` | Hàm trả nhiều dòng trong danh sách select của PostgreSQL |
  | L3 — `UNION ALL` gộp hai nguồn rồi `SUM` | Hai sub-query gom nhóm (mỗi nguồn một `SelectQueryBuilder` có `groupBy`) gắn bằng `leftJoin(qb => <sub-query>, '<alias>', '<alias>.ingredient_id = g.id')` vào `from(Ingredient, 'g')`, lọc `pr.ingredient_id IS NOT NULL OR tr.ingredient_id IS NOT NULL`, cộng `COALESCE(pr.quantity,0) + COALESCE(tr.quantity,0)` trong DB | QueryBuilder không có `UNION`; join sub-query có sẵn (`SelectQueryBuilder.js:1008-1028`). Tổng tính trong PostgreSQL nên giữ chính xác `numeric(14,3)`, một statement |
  | L1 — Tổng tiền `SUM` | QueryBuilder; tổng đọc bằng `getRawOne` với cast `::text` hoặc `::bigint` như SQL cũ | `Repository.sum()` trả float (`EntityManager.js:544`); tải dòng lên ứng dụng để cộng trái `rules/database.md` "Đưa lọc, gom nhóm và tính toán phù hợp xuống cơ sở dữ liệu" |
  | L2 — Cursor phân trang có micro giây hoặc ORDER BY biểu thức | Giữ biểu thức `to_char(<col> AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` qua `addSelect(..., '<alias cũ>')`, đọc bằng `getRawMany` hoặc `getRawAndEntities`; so sánh bộ `(a, b) < (x, y)`; `orderBy('lower(i.name)')` | JavaScript `Date` chỉ giữ mili giây; `find` không chọn được cột biểu thức; `order` của `find` không nhận `lower()` |
  | Tên tham số đặt tên (mọi câu QueryBuilder) | Không đặt tên trùng chữ đứng sau dấu `:` trong chuỗi SQL (`text`, `date`, `json`, `uuid`, `int`, `bigint`, `numeric`, `timestamptz`, `timestamp`, `MI`, `SS`, `US`) | `PostgresDriver.js:648-651` thay mọi `:tên` có trong `parameters` trên TOÀN câu, kể cả `::date`, `'HH24:MI:SS'`; tên không có trong `parameters` giữ nguyên |
  | L5 — Câu lệnh không đọc/ghi bảng (`pg_advisory_xact_lock`, `SELECT 1`) | `manager.createQueryBuilder().select('<biểu thức cũ, $n đổi thành :tên>', '<alias>').fromDummy().setParameter(...).getRawOne()` | Không method nào lấy advisory lock hay chạy câu không bảng; `.query(` bị cấm; đổi sang khóa dòng hay đọc bảng thật làm đổi hành vi (G-11). `fromDummy()` sinh `FROM (SELECT 1 AS dummy_column) "dummy_table"` (`SelectQueryBuilder.js:156-159`) |
- Mã lý do dùng QueryBuilder (bản 2; thay L1..L9 của bản 1) và câu chú thích bắt buộc (tdd chép nguyên văn; một dòng ngay trước câu lệnh):
  | Mã | Khi nào (vì sao (1)-(3) không đủ) | Chú thích nguyên văn |
  |---|---|---|
  | L1 | Tổng tiền `SUM`: `Repository.sum()` trả float; nhiều `find` rồi cộng trong JavaScript là tải dòng lên ứng dụng | `// QueryBuilder: SUM of money read as text; Repository.sum() returns a float` |
  | L2 | Cursor cần `to_char ... .US`, so sánh bộ `(a, b) < (x, y)` hoặc `ORDER BY lower(...)`: `find` không chọn cột biểu thức, `Date` mất micro giây, `order` không nhận biểu thức | `// QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()` |
  | L3 | CTE/sub-query/`generate_series` phải nằm trong MỘT statement (snapshot hoặc tổng trong DB) | `// QueryBuilder: CTE or sub-query in one statement; find() cannot express it` |
  | L4 | `INSERT ... ON CONFLICT (<đích>) [WHERE ...] DO NOTHING RETURNING`: `upsert` chỉ `DO UPDATE`, `insert` không có tùy chọn xung đột, kiểm trước rồi chèn tạo khe đua | `// QueryBuilder: ON CONFLICT (target) DO NOTHING; upsert() only does DO UPDATE and orIgnore() drops the target` |
  | L5 | Câu không đọc bảng (advisory lock, health): không method nào chạy được | `// QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it` |
  | L6 | Danh sách/đếm/DISTINCT trên nhiều bảng không relation với số dòng không giới hạn: thay bằng nhiều `find` phải tải mọi dòng trung gian lên ứng dụng | `// QueryBuilder: joins and DISTINCT over many rows; separate find() calls would load every row` |
- Bảng QueryBuilder còn giữ theo file (bản 2; 33 câu sau ST-17, cộng 9 câu có sẵn còn giữ sau ST-19..ST-23 = 42 dòng `// QueryBuilder:`; dùng cho E2E-AC-11):
  | File | Số dòng chú thích | Câu lệnh (dòng SQL cũ hoặc dòng hiện tại) và mã |
  |---|---|---|
  | `auth/auth.service.ts` | 4 | `:104`, `:120`, `:263`, `:352` advisory L5 |
  | `users/users.service.ts` | 1 | `:57` `listStaff` trang L2 (ST-20); username sang `normalizeUsername` |
  | `platform/platform.service.ts` | 2 | `:56-61` trang `listStores` L2, `:108-115` trang `listOwners` L2 (ST-20) |
  | `bootstrap-admin.ts` | 1 | `:8` advisory L5 |
  | `http/health.controller.ts` | 1 | `:12` `SELECT 1` L5 |
  | `promotions/promotions.service.ts` | 1 | `:89-96` trang (cursor) L2 |
  | `sales/store-bank-account.service.ts` | 0 | — |
  | `reports/reports.service.ts` | 1 | `:84-120` CTE L3 |
  | `shifts/shifts.service.ts` | 4 | cũ `:81` L1; `:88` L1; `:495` L2 (ST-7); trang `listShifts` L2 (ST-23) |
  | `organization/organization.service.ts` | 2 | `:56` `listBranches` L2, `:100` `listTables` L2 (ST-21) |
  | `menu/menu.service.ts` | 3 | `:108` `listCategories` L2, `:276` `listProducts` L2, `:653` `listToppings` L2 (ST-22) |
  | `inventory/inventory.service.ts` | 4 | cũ `:91` L2; `:153` L2; `:208` L6; `:252` L2 |
  | `sales/transfer-attempts.service.ts` | 5 | cũ `:60` L5; `:91` L4; `:133` L5; `:152` L4; `:190` L2 |
  | `sales/sepay-webhook.service.ts` | 2 | cũ `:50` L5; `:72` L4 |
  | `sales/sales.service.ts` | 11 | cũ ST-13: `:158` L2, `:164` L6, `:171` L6, `:174` L6; ST-15: `:247` L1; ST-16: `:293` L5, `:327` L5, `:346` L1, `:374` L3, `:402` L3; ST-17: `:528` L1 |
- Số lời gọi `.query(` chuyển theo đích (bản 2; tổng 156): QueryBuilder 33 lời gọi = 33 câu lệnh (ST-3 6, ST-4 1, ST-5 0, ST-6 1, ST-7 3, ST-8 2, ST-9 2, ST-10 5, ST-11 2, ST-12 0, ST-13 4, ST-14 0, ST-15 1, ST-16 5, ST-17 1); method repository/manager hoặc bỏ truy vấn (4 chỗ chuẩn hóa username ở ST-3 sang `normalizeUsername`) 123 lời gọi (ST-3 5, ST-4 4, ST-5 4, ST-6 2, ST-7 5, ST-8 13, ST-9 4, ST-10 21, ST-11 9, ST-12 10, ST-13 0, ST-14 12, ST-15 7, ST-16 19, ST-17 8).
- QueryBuilder có sẵn trên `master` (61 câu): bảng "Đã thử" từng câu ở ST-19..ST-23; 52 sang method, 9 giữ L2.
- Bảng quyết định rà lại ST-3..ST-6 (source hiện tại → đích bản 2):
  | File:dòng hiện tại | Truy vấn | Hiện tại | Đã thử | Đích | Sub-task |
  |---|---|---|---|---|---|
  | `auth/auth.service.ts:48` | tên chi nhánh | repo `findOne` | (1) đủ | Giữ | — |
  | `auth/auth.service.ts:104,120,263,352` | advisory lock | QB `fromDummy()` | (1)-(3): không method nào lấy advisory lock | Giữ QB + chú thích L5 | ST-3b |
  | `auth/auth.service.ts:111`, `users/users.service.ts:74`, `platform/platform.service.ts:36`, `bootstrap-admin.ts:25` | chuẩn hóa username | QB `fromDummy()` + `lower(btrim(...))` | Không phải truy vấn dữ liệu; theo lời user tránh chuỗi SQL viết tay | ĐỔI → `normalizeUsername(...)` JavaScript (G-18, Q2) | ST-3b |
  | `bootstrap-admin.ts:8` | advisory lock | QB `fromDummy()` | như trên | Giữ QB + chú thích L5 | ST-3b |
  | `http/health.controller.ts:12` | `SELECT 1` | QB `fromDummy()` | (1): mọi method đọc bảng → health trả 503 khi DB chạy nhưng chưa migrate (đổi hành vi) và phải sửa lại mock health đã duyệt | Giữ QB + chú thích L5 (G-11) | ST-3b |
  | `promotions/promotions.service.ts:89-92` | đếm | QB `getCount()` trên builder chung | (1) `count({ where })` với `ILike`, mảng OR đủ | ĐỔI → `count` | ST-4b |
  | `promotions/promotions.service.ts:93-96` | trang có cursor | QB | (1)-(3): cần `to_char .US` + so sánh bộ | Giữ QB + chú thích L2 | ST-4b |
  | `promotions/promotions.service.ts:107-112` | tạo mã, `RETURNING *` | QB insert | (2)+(1) đủ | ĐỔI → `insert` rồi `findOneBy({ id })` | ST-4b |
  | `promotions/promotions.service.ts:123-124` | khóa mã (một bảng) | QB `setLock` | (1) đủ | ĐỔI → `findOne({ where: { id, store_id: store }, lock: { mode: 'pessimistic_write' } })` | ST-4b |
  | `promotions/promotions.service.ts:128-133` | cập nhật `RETURNING *` | QB update | (2) đủ | ĐỔI → `update({ id, store_id: store }, {...}, { returning: '*' })` | ST-4b |
  | `sales/store-bank-account.service.ts:16`, `:24` | đọc tài khoản, kiểm QR chờ | repo | (1) đủ | Giữ | — |
  | `sales/store-bank-account.service.ts:23` | khóa cửa hàng (một bảng) | QB `setLock` | (1) đủ | ĐỔI → `findOne({ where: { id }, select: { id: true }, lock: { mode: 'pessimistic_write' } })`; literal race theo G-16 | ST-5b |
  | `sales/store-bank-account.service.ts:26` | upsert | QB `orUpdate` | (2) đủ | ĐỔI → `upsert({...}, ['store_id'])` | ST-5b |
  | `reports/reports.service.ts:68` | chi nhánh thuộc cửa hàng | repo `existsBy` | (1) đủ | Giữ | — |
  | `reports/reports.service.ts:75-79` | ca + chi nhánh | QB `innerJoin` | (1) đủ: `WorkShift.branch` đã khai báo | ĐỔI → `findOne({ where: { id: query.shiftId, branch: { store_id: storeId }, ...(branchId !== null ? { branch_id: branchId } : {}) }, select: { id: true, user_id: true } })` | ST-6b |
  | `reports/reports.service.ts:84-120` | doanh thu một statement | QB CTE | (1)-(3): tách nhiều `find` phá "One statement = one snapshot" | Giữ QB + chú thích L3 | ST-6b |
- Bảng chuyển 15 lời gọi không đọc/ghi bảng (user: "Bọc hết vào QueryBuilder"; số dòng hiện tại). Bản 2026-11-17: dòng E1/E2 còn hiệu lực (mã L5, thêm chú thích); dòng E3 (username) bị thay bởi `normalizeUsername` (G-18, ST-3b):
  | Nhóm | File:dòng | SQL cũ | QueryBuilder đích |
  |---|---|---|---|
  | E1 | `http/health.controller.ts:12` | `SELECT 1` | `this.db.createQueryBuilder().select('1', 'ok').fromDummy().getRawOne()`; giữ `try/catch` → `ServiceUnavailableException` |
  | E2 | `bootstrap-admin.ts:8` | `SELECT pg_advisory_xact_lock(6152, 1)` | `manager.createQueryBuilder().select('pg_advisory_xact_lock(6152, 1)', 'locked').fromDummy().getRawOne()` |
  | E2 | `auth/auth.service.ts:103,119,262,351`; `sales/transfer-attempts.service.ts:60,133`; `sales/sepay-webhook.service.ts:50`; `sales/sales.service.ts:293,327` | `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))` (hoặc `($1,0)`) | `manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))', 'locked').fromDummy().setParameter('lockKey', <giá trị $1 cũ>).getRawOne()` tại chỗ, cùng vị trí, cùng thứ tự (vòng `for` ở `auth.service.ts:119` giữ nguyên) |
  | E3 | `auth/auth.service.ts:110`, `bootstrap-admin.ts:25`, `platform/platform.service.ts:36`, `users/users.service.ts:74` | `SELECT lower(btrim($1::text)) AS username` | `(this.db \| manager).createQueryBuilder().select('lower(btrim(CAST(:username AS text)))', 'username').fromDummy().setParameter('username', <giá trị $1 cũ>).getRawOne()`; đọc `.username` như cũ; giữ NGUYÊN biểu thức PostgreSQL |
- Bảng chuyển 6 truy vấn khó (user 2026-11-16: "6 truy vấn khó cũng cập nhật thành querybuilder luôn"; số dòng hiện tại):
  | Nhóm | File:dòng | SQL cũ | QueryBuilder đích | Bằng chứng TypeORM |
  |---|---|---|---|---|
  | E4 | `reports/reports.service.ts:112` (SQL ở `:39-72`) | `REVENUE_SQL`: CTE `bounds`, `scoped`, `totals`, `daily` (`generate_series`), `sizes` (`ARRAY_AGG(... ORDER BY ...)[1]`), `top` (`LIMIT 10`), câu cuối scalar sub-query + `json_agg` | Một QueryBuilder `this.db.createQueryBuilder()` có 6 `addCommonTableExpression(<SelectQueryBuilder>, 'bounds'\|'scoped'\|'totals'\|'daily'\|'sizes'\|'top')`, mỗi CTE dựng bằng `this.db.createQueryBuilder()` với biểu thức chép nguyên văn từ SQL cũ (chỉ đổi `$1..$6` thành `:storeId`, `:branchId`, `:shiftId`, `:reportDate`, `:fromDate`, `:toDate` và `$n::kiểu` thành `CAST(:tên AS kiểu)`); `scoped` dùng `from(Invoice, 'i').innerJoin(Branch, 'b', 'b.id = i.branch_id').innerJoin('bounds', 'bounds', 'true').leftJoin(Payment, 'p', 'p.invoice_id = i.id')`, điều kiện `branchId`/`shiftId` giữ dạng `(CAST(:branchId AS uuid) IS NULL OR i.branch_id = CAST(:branchId AS uuid))` như cũ; `daily` dùng `from(qb => qb.select('(CAST(:fromDate AS date) + g)::date', 'day').from(qb2 => qb2.select('generate_series(0, CAST(:toDate AS date) - CAST(:fromDate AS date))', 'g').fromDummy(), 'gs'), 'd').leftJoin('scoped', 's', 's.day = d.day').groupBy('d.day')`; câu cuối `.fromDummy()` + 5 `addSelect(qb => <sub-query trên CTE>, 'cnt'\|'cash'\|'transfer'\|'daily'\|'best')`; `getRawOne()`; MỘT statement | `addCommonTableExpression` nhận QueryBuilder (`QueryBuilder.js:352-359,785-797`); sub-query trong `from` (`QueryBuilder.js:417-424`), `join` (`SelectQueryBuilder.js:1008-1028`), `select` (`SelectQueryBuilder.js:95,119`); `fromDummy()` (`SelectQueryBuilder.js:156-159`) |
  | E5 | `sales/sales.service.ts:374` (`finalizeInvoice`) | CTE `requirements` = (công thức món) `UNION ALL` (công thức topping), `SUM ... GROUP BY ingredient_id ORDER BY ingredient_id` | `manager.createQueryBuilder().select('g.id', 'ingredient_id').addSelect('COALESCE(pr.quantity, 0) + COALESCE(tr.quantity, 0)', 'quantity').from(Ingredient, 'g').leftJoin(qb => qb.select('r.ingredient_id', 'ingredient_id').addSelect('SUM(r.quantity * i.quantity)', 'quantity').from(InvoiceItem, 'i').innerJoin(ProductSizeIngredient, 'r', 'r.product_size_id = i.product_size_id').where('i.invoice_id = :invoiceId').groupBy('r.ingredient_id'), 'pr', 'pr.ingredient_id = g.id').leftJoin(qb => qb.select('r.ingredient_id', 'ingredient_id').addSelect('SUM(r.quantity * t.quantity * i.quantity)', 'quantity').from(InvoiceItem, 'i').innerJoin(InvoiceItemTopping, 't', 't.invoice_item_id = i.id').innerJoin(ToppingIngredient, 'r', 'r.topping_id = t.topping_id').where('i.invoice_id = :invoiceId').groupBy('r.ingredient_id'), 'tr', 'tr.ingredient_id = g.id').where('pr.ingredient_id IS NOT NULL OR tr.ingredient_id IS NOT NULL').orderBy('g.id').setParameter('invoiceId', invoiceId).getRawMany()` | Join sub-query (`SelectQueryBuilder.js:1008-1028`). Tương đương: `SUM(A ∪ B) = SUM(A) + SUM(B)` theo từng `ingredient_id`; mọi `ingredient_id` của hai bảng công thức có FK tới `ingredients` (`20261107000000-InventoryPromotions.ts:19-33`) nên `from(Ingredient)` + lọc không mất dòng; phép cộng trong PostgreSQL giữ `numeric(14,3)` |
  | E5 | `sales/sales.service.ts:402` (`paymentPreview`) | CTE `requirements` như trên + `LEFT JOIN branch_ingredient_stocks s ... GROUP BY r.ingredient_id, s.current_stock HAVING COALESCE(s.current_stock,0)-SUM(r.quantity)<0 ORDER BY r.ingredient_id` | Cùng khung với dòng 374, `select('g.id', 'ingredient_id')`, thêm `leftJoin(BranchIngredientStock, 's', 's.ingredient_id = g.id AND s.branch_id = :branchId')` và `andWhere('COALESCE(s.current_stock, 0) - (COALESCE(pr.quantity, 0) + COALESCE(tr.quantity, 0)) < 0')`; `orderBy('g.id')`; `getRawMany()` | Khóa chính `(branch_id, ingredient_id)` (`20261107000000-InventoryPromotions.ts:35-43`) nên mỗi nguyên liệu có tối đa một dòng `s`; `HAVING` theo nhóm tương đương `WHERE` sau khi đã cộng |
  | E6 | `sales/transfer-attempts.service.ts:91` (`createTransferAttempt`) | `INSERT ... ON CONFLICT (transfer_reference) DO NOTHING RETURNING *` | `insert().into(TransferAttempt).values({...}).onConflict('(transfer_reference) DO NOTHING').returning('*').updateEntity(false).execute()`; `const row = result.raw[0]`; `if (row) return this.view(row)` như cũ, không có thì thử lại vòng `for` | `InsertQueryBuilder.js:197-209,329-330,420-427`; INSERT trả `raw = raw.rows` (nhánh mặc định sau `case "UPDATE"`, `PostgresQueryRunner.js:199-205`) |
  | E6 | `sales/transfer-attempts.service.ts:152` (`confirmTransferManually`) | `INSERT INTO payments ... ON CONFLICT (receiving_account_number,transaction_ref_kind,transaction_ref) WHERE method='TRANSFER' AND transaction_ref IS NOT NULL DO NOTHING RETURNING *` | `insert().into(Payment).values({..., method: 'TRANSFER', transaction_ref_kind: 'BANK', confirmation_source: 'MANUAL', ...}).onConflict("(receiving_account_number,transaction_ref_kind,transaction_ref) WHERE method='TRANSFER' AND transaction_ref IS NOT NULL DO NOTHING").returning('*').updateEntity(false).execute()`; `const payment = result.raw[0]`; không có → 409 `BANK_TRANSACTION_REUSED` như cũ | như trên |
  | E6 | `sales/sepay-webhook.service.ts:72` (`processSePayWebhook`) | như dòng 152 với `RETURNING id` | như dòng 152 với `.returning(['id'])`; `if (result.raw.length === 0) disposition = 'DUPLICATE'` như cũ | như trên |
- Phân bố `.query(` còn lại sau refactor: 0 ở mọi file (13 file đều 0). Kiểm số: 156 chuyển (ST-3 11, ST-4 5, ST-5 4, ST-6 3, ST-7 8, ST-8 15, ST-9 6, ST-10 26, ST-11 11, ST-12 10, ST-13 4, ST-14 12, ST-15 8, ST-16 24, ST-17 9) = 156; còn lại 0. Không có chú thích `// raw-sql:` nào.
- Quyết định thiết kế | lý do | phương án đã loại:
  - Giữ `DataSource`/`EntityManager` trong service, gọi `manager.getRepository(Entity)` / `manager.createQueryBuilder(...)` tại chỗ | Ponytail, giữ layer (`ShiftsService` đã làm vậy, `shifts.service.ts:78`) | Loại: `@InjectRepository` + `TypeOrmModule.forFeature` (đổi module wiring, transaction phải truyền manager khác), repository tự chế.
  - Hàm view (`ingredientView`, `expenseView`, `view`, `detail`...) giữ nguyên chữ ký; dữ liệu đưa vào giữ đúng khóa snake_case cũ | entity có thuộc tính trùng tên cột; raw QueryBuilder dùng alias trùng tên cột cũ | Loại: đổi view sang camelCase entity (đụng nhiều chỗ, rủi ro đổi output).
  - `invoice()` (`sales.service.ts:50`, `transfer-attempts.service.ts:21`) trả `{ ...entity, store_id }` từ `getRawAndEntities()` với `addSelect('b.store_id', 'store_id')` | giữ khóa `store_id` mà caller đọc và giữ thứ tự kiểm `!row \|\| row.store_id !== scope(user)` (404 trước 403) | Loại: đưa `b.store_id` vào `WHERE` (đổi thứ tự lỗi cho PLATFORM_ADMIN: hiện nay có hóa đơn thì 403, không có thì 404).
  - Test đặc tả chuỗi khóa bằng mock `PostgresQueryRunner.prototype.query` | bắt được mọi câu do cả `manager.query` cũ và QueryBuilder mới phát ra, không sửa setup test cũ, tự khôi phục qua `t.mock` | Loại: test chờ khóa thật `55P03` cho từng chỗ (~30 test nặng), logger tùy biến của DataSource (phải sửa setup test cũ).
  - Không còn ngoại lệ SQL thuần | user 2026-11-16 "6 truy vấn khó cũng cập nhật thành querybuilder luôn" | Loại: danh sách ngoại lệ có chú thích `// raw-sql:` (bản trước).
  - Câu không đọc bảng dùng `fromDummy()` | user chọn "Bọc hết vào QueryBuilder"; là API công khai TypeORM dùng nội bộ cho `getExists()` | Loại: `select` không `from` (ném lỗi, `SelectQueryBuilder.js:1035-1036`); `from(<bảng thật>)` + `limit(1)` (advisory lock không chạy khi bảng rỗng, đổi hành vi).
  - `ON CONFLICT ... DO NOTHING` dùng `onConflict()` (deprecated) | là API duy nhất của InsertQueryBuilder 0.3.31 sinh được `DO NOTHING` có cột đích và điều kiện chỉ mục một phần; ưu: SQL sinh ra trùng nguyên văn SQL cũ, giữ `RETURNING`; nhược: bị đánh dấu sắp bỏ, có thể mất khi lên TypeORM 0.4 (khi đó test ST-10/ST-11 bắt) | Loại: `orIgnore()` (không cột đích, nuốt lỗi trùng `idempotency_key`/`invoice_id`/`transfer_attempt_id`, đổi hành vi); `orUpdate(..., { indexPredicate })` (sinh `DO UPDATE SET`, ghi đè dòng của giao dịch khác, đổi hành vi; `skipUpdateIfNoValuesChanged` vẫn cập nhật khi giá trị khác); kiểm tồn tại bằng SELECT rồi INSERT (thêm khe đua giữa hai câu, khác hành vi khi đồng thời — test `payment.integration.test.ts:361`).
  - `UNION ALL` thay bằng hai sub-query gom nhóm + `LEFT JOIN` từ `ingredients` | giữ một statement, cộng `numeric` trong PostgreSQL | Loại: chuỗi CTE thô qua `addCommonTableExpression(string)` (vẫn là SQL thuần trong chuỗi); tách hai truy vấn rồi cộng bằng BigInt thang 10^3 trong JavaScript (đúng số nhưng thêm statement và phải tự định dạng lại chuỗi `numeric`).
  - Báo cáo giữ MỘT statement bằng CTE QueryBuilder | chú thích `reports.service.ts:38` "One statement = one snapshot"; test `test_ST2_AC7_consistent_statement` (`reports.integration.test.ts:352`) | Loại: tách nhiều truy vấn (lệch snapshot giữa tổng, biểu đồ, món bán chạy).
  - (2026-11-17) Thử (1) → (2) → (3), QueryBuilder chỉ với mã L1..L6 | quyết định và lời bổ sung của user 2026-11-17 | Loại: giữ QueryBuilder cho mọi câu (quy tắc cũ); bản 1 của draft này (QueryBuilder cho mọi JOIN, 69 câu).
  - (2026-11-17) Khóa một bảng bằng `findOne({ lock })` | SQL sinh ra cùng token khóa, một statement (đã dựng ở "Khám phá") | Loại: `createQueryBuilder().setLock()` (diễn đạt được bằng method).
  - (2026-11-17) Khóa bảng gốc lọc qua relation bằng `find({ where lồng, lock: { mode, tables: ['<bảng gốc>'] } })[0]` (G-14) | một câu lệnh, chỉ khóa bảng gốc (SQL đã dựng) | Loại: `findOne` cùng lock + join (đường DISTINCT hai câu, chưa xác minh với lock); QueryBuilder `setLock(..., ['alias'])` (trái "QueryBuilder là phương án cuối").
  - (2026-11-17) Khóa nhiều bảng một câu đổi thành hai `findOne({ lock })` (G-17) | `find` không khóa được bảng phía LEFT JOIN | Loại: QueryBuilder `setLock(..., ['s', 'b'])`.
  - (2026-11-17) JOIN tới bảng không có relation đổi thành nhiều `find` tuần tự | user: "find hoặc findOne hoặc các hàm ngắn hơn đỡ sai sót" | Loại: khai báo relation mới trên entity (đổi entity đã chốt ở ST-1 trong khi nhiều `find` đủ); QueryBuilder `innerJoin`. Ngoại lệ còn QueryBuilder: danh sách/đếm/DISTINCT trên số dòng không giới hạn (L6).
  - (2026-11-17) `UPDATE ... RETURNING` bằng `update(..., { returning: '*' })`; `INSERT ... RETURNING` bằng `insert` + `findOneBy` (G-13) | method có sẵn 0.3.31 | Loại: QueryBuilder `update().returning()`, `insert().returning()`.
  - (2026-11-17) Chuẩn hóa username bằng `normalizeUsername` JavaScript (G-18) | user yêu cầu tránh chuỗi SQL viết tay; một hàm chung giữ "cùng một biểu thức" ở mọi nơi (lỗi `2026-10-29-pb02-username-normalization.md`) | Loại: giữ `fromDummy()` + `lower(btrim())`; `trim().toLowerCase()` (bỏ cả TAB, đổi hành vi).
  - (2026-11-17) Số âm `numeric` cho sổ kho bằng chuỗi đảo dấu trong JavaScript | `Repository.insert` không bind được tham số trong biểu thức | Loại: QueryBuilder `insert().values({ quantity: () => '-CAST(:quantity AS numeric)' })`.
  - (2026-11-17) Upsert `DO UPDATE` bằng `upsert()` | method có sẵn; SQL tương đương (thêm `SET` cột xung đột cùng giá trị) | Loại: QueryBuilder `orUpdate()`.
  - (2026-11-17) Marker chú thích cố định `// QueryBuilder:` | đếm được bằng `grep -c` (E2E-AC-11) | Loại: chú thích tự do (không kiểm máy được).
  - (2026-11-17) Không đặt `invalidWhereValuesBehavior` | đổi hành vi mọi `find` có sẵn ngoài phạm vi | Loại: bật `throw` toàn cục; thay bằng quy định chung không truyền `null`/`undefined`.

## Thay đổi dữ liệu
- Không có. Không thêm, sửa migration; không đổi bảng, cột, index, constraint, trigger. Entity mới chỉ mô tả bảng đã có (nguồn cột ở "Khám phá"). Rollback: revert commit; không có dữ liệu cần khôi phục. `foundation.test.ts:37` giữ `13`.

## API contract tổng
- Không có thay đổi. Mọi endpoint giữ method, path, quyền, request, response, mã lỗi và message như hiện tại (nguồn hợp đồng: `docs/api-spec.md`, `.devloopflow/specs/`). Bằng chứng: toàn bộ test HTTP/integration hiện có giữ xanh, không sửa assertion.

## AC tổng end-to-end
(mỗi AC một dòng riêng, có checkbox; chỉ tick `[x]` khi AC đã được kiểm PASS)
- [x] E2E-AC-1: Given nhánh `refactor/orm-entities` sau ST-18, When chạy trong `POS_API/src` lệnh `grep -rn "\.query(" --include=*.ts . | grep -v "/migrations/" | grep -v "\.test\.ts" | grep -v "/tests/"`, Then output rỗng (0 dòng) (kiểm: lệnh grep, lưu output vào evidence).
- [x] E2E-AC-2: Given cùng trạng thái, When chạy `grep -rn "raw-sql" --include=*.ts .` và `grep -rn "\.query(\|manager\.query\|db\.query" --include=*.ts . | grep -v "/migrations/" | grep -v "\.test\.ts" | grep -v "/tests/"` trong `POS_API/src`, Then cả hai output rỗng (không chú thích ngoại lệ, không lời gọi SQL thuần qua biến khác tên) (kiểm: lệnh grep).
- [x] E2E-AC-3: Given `DATABASE_URL` trỏ PostgreSQL Docker `pos_infra-postgres-1` cổng host 5432, When chạy `npm test` trong `POS_API/`, Then exit 0, `# fail 0`, `# tests` = `# pass` ≥ 256 + số test mới của task (baseline 2026-11-16: `# tests 256`, `# pass 256`, `# fail 0`) (kiểm: output `npm test` lưu evidence).
- [x] E2E-AC-4: Given cùng trạng thái, When chạy `npm run build` trong `POS_API/`, Then exit 0 (kiểm: output lệnh).
- [x] E2E-AC-5: Given cùng trạng thái, When chạy `git diff --stat master -- POS_API/src/database/migrations POS_API/package.json POS_API/package-lock.json`, Then output rỗng (không migration mới, không dependency mới) (kiểm: lệnh git).
- [x] E2E-AC-6: Given cùng trạng thái, When chạy `git diff --numstat master -- POS_API/src` và lọc test đã tồn tại trên master, Then dòng xóa bằng 0 ngoài foundation.test.ts, sales/tests/payment.integration.test.ts, reports/tests/reports.integration.test.ts, sales/tests/invoices-read.integration.test.ts; When đọc diff/context bốn file với master, Then foundation chỉ health/import/restore ST-3, payment chỉ tối đa hai literal waiting ST-5/ST-10 theo “Phạm vi” (literal store có giá trị cuối `FROM "stores" "Store"` nếu user duyệt ST-5b), reports chỉ hai mock/import/original/restore đúng DataSource và SELECT/WITH đọc invoices cùng ba dòng AC-1 sau duyệt riêng, invoices-read chỉ counter/import/original/mock/restore cùng assertion MỚI `assert.ok(one > 0)` sau `const one = queries`; mọi assertion hiện hữu/helper/Lock/timeout/poll/barrier/cancel/lỗi giả/digest/thứ tự request cũ/trạng thái cuối giữ nguyên; AC-1 chỉ thêm một request ở vị trí đã chốt; không xóa/skip test; mock chỉ thay sau duyệt và RED đúng nguyên nhân ST-6/ST-13; riêng AC-1 phải có duyệt ngoại lệ characterization và log focused/module/suite/diff, không dùng RED mock để tick AC-1 (kiểm: numstat + diff/context + evidence, numstat riêng không đủ).
- [x] E2E-AC-7: Given cùng trạng thái, When đọc mảng `entities` trong `POS_API/src/database/data-source.ts`, Then có 32 phần tử gồm 20 entity cũ và 12 entity mới ở ST-1; test `test_ST1_AC1_entity_metadata_matches_schema` xanh (kiểm: đọc file + test).
- [x] E2E-AC-8: Given cùng trạng thái, When chạy mọi test đặc tả chuỗi khóa của ST-3, ST-4, ST-5, ST-7, ST-8, ST-9, ST-10, ST-11, ST-12, ST-15, ST-16, ST-17, Then mỗi test xanh với cùng mảng kỳ vọng đã ghi khi chạy trên SQL cũ; riêng token khóa nhiều bảng một câu (`UPDATE:work_shifts,branches` của `sales.service.ts:43`, `UPDATE:branches,ingredients` của `inventory.service.ts:222`) được so ở dạng đã tách thành hai token liên tiếp cùng vị trí theo G-17; mảng cũ (chưa tách) và mảng mới đều lưu evidence (kiểm: integration, output test).
- [x] E2E-AC-9 (sửa 2026-11-17 theo G-15): Given cùng trạng thái, When mở `rules/database.md`, Then có mục "## Cách viết truy vấn bằng ORM" (không phụ thuộc công nghệ) gồm: thứ tự ưu tiên method chuẩn trước, query builder chỉ khi method không diễn đạt được kèm một dòng chú thích lý do; không SQL thuần ngoài migration và test; trong transaction mọi truy vấn đi qua manager của transaction; không truyền giá trị rỗng vào điều kiện của method chuẩn khi ORM có thể bỏ qua điều kiện đó. When mở `POS_API/README.md`, Then có đoạn quy ước TypeORM gồm thứ tự thử (1)-(4), bảng "Quy tắc chuyển" bản 2 (2026-11-17), bảng mã lý do L1..L6 với câu chú thích nguyên văn, `normalizeUsername`, cách khóa bảng gốc qua relation bằng `find({ lock: { tables } })`, marker `// QueryBuilder:`, cảnh báo `null`/`undefined` trong `where`, dòng `fromDummy()`, `onConflict()` (lý do dùng API deprecated, cấm `orIgnore()`), CTE, sub-query thay `UNION ALL`, quy tắc tên tham số, quy tắc `manager` trong transaction, và danh sách thư mục entity mới. When mở `docs/architecture/TECH_STACK.md:11`, Then ô vai trò TypeORM ghi method repository trước, QueryBuilder chỉ cho truy vấn phức tạp, không SQL thuần ngoài migration và test (kiểm: đọc file + `git diff`).
- [x] E2E-AC-11 (bản 2, 2026-11-17): Given cùng trạng thái, When chạy trong `POS_API/src` lệnh `grep -c "// QueryBuilder:" <file>` cho từng file ở "Bảng QueryBuilder còn giữ theo file", Then số đếm đúng từng ký tự: `auth/auth.service.ts` 4, `users/users.service.ts` 1, `platform/platform.service.ts` 2, `bootstrap-admin.ts` 1, `http/health.controller.ts` 1, `promotions/promotions.service.ts` 1, `sales/store-bank-account.service.ts` 0, `reports/reports.service.ts` 1, `shifts/shifts.service.ts` 4, `inventory/inventory.service.ts` 4, `sales/transfer-attempts.service.ts` 5, `sales/sepay-webhook.service.ts` 2, `sales/sales.service.ts` 11, `organization/organization.service.ts` 2, `menu/menu.service.ts` 3 (tổng 42); `grep -rln "createQueryBuilder(" --include=*.ts POS_API/src | grep -v "/migrations/" | grep -v "\.test\.ts" | grep -v "/tests/"` chỉ ra đúng các file có số > 0 trong danh sách này; và `git diff master -U0 -- POS_API/src | grep "^+" | grep -c "// QueryBuilder:"` = 42; và mỗi dòng có `createQueryBuilder(` được thêm so với `master` (`git diff master -U0 -- POS_API/src ':!*.test.ts' ':!**/tests/**' | grep "^+.*createQueryBuilder("`) thuộc một câu lệnh trong bảng (reviewer đối chiếu danh sách) (kiểm: lệnh grep + đọc diff).
- [x] E2E-AC-12 (bản 2, 2026-11-17): Given cùng trạng thái, When chạy `grep -rn "setLock(" --include=*.ts POS_API/src | grep -v "/migrations/" | grep -v "\.test\.ts" | grep -v "/tests/"`, Then output rỗng (mọi khóa dòng dùng `lock` của `findOne`/`find`, kể cả chỗ có sẵn trên `master` sau ST-19..ST-23); When chạy `grep -rn "lower(btrim" --include=*.ts POS_API/src | grep -v "/migrations/" | grep -v "\.test\.ts" | grep -v "/tests/"`, Then output rỗng (kiểm: lệnh git/grep).
- [x] E2E-AC-10: Given cùng trạng thái, When chạy `graphify update .` ở gốc repo và semantic update cho 3 file Markdown, Then lệnh exit 0 và `graphify query "TypeORM QueryBuilder repository convention rules database"` trả về nút từ `rules/database.md` (kiểm: output lệnh).

## Review Focus
- RF-1: Cursor trang kế của danh sách có hai bản ghi cách nhau 1 micro giây cùng mili giây (mã giảm giá, chi phí ca, giao dịch chuyển khoản cần xử lý) → trang 2 vẫn trả bản ghi còn lại, không bỏ sót, không lặp — test: `test_ST4_AC3_promotions_cursor_keeps_microseconds` (ST-4), `test_ST7_AC3_expenses_cursor_keeps_microseconds` (ST-7), `test_ST10_AC4_exceptions_cursor_keeps_microseconds` (ST-10).
- RF-2: Thêm món/topping hoặc chọn bàn với dữ liệu ngừng bán, khác chi nhánh, topping ngoài danh mục → mã lỗi như hiện tại (`ITEM_NOT_AVAILABLE` 409, `TABLE_INACTIVE` 409, `INVOICE_BRANCH_MISMATCH` 422, `TOPPING_NOT_ALLOWED` 422) — test: `test_ST12_AC3_table_errors_unchanged` (ST-12), `test_ST14_AC2_add_item_errors_unchanged` (ST-14).
- RF-3: Chi nhánh có nguyên liệu chưa từng có dòng `branch_ingredient_stocks` → danh sách tồn vẫn trả cặp chi nhánh × nguyên liệu với `currentStock` và `minStock` đúng chuỗi như SQL cũ; tổng `total` không đổi — test: `test_ST9_AC2_stocks_include_missing_stock_rows` (ST-9).
- RF-4: Cập nhật mã giảm giá/nguyên liệu trả về bản ghi sau UPDATE (không phải mảng lồng) và các trường tiền giữ kiểu như cũ (`bigint` là chuỗi trong DB, số trong response) — test: `test_ST4_AC2_patch_returns_updated_row` (ST-4), `test_ST8_AC3_patch_ingredient_returns_row` (ST-8).
- RF-5: Tạo nhân viên/chủ cửa hàng với username có dấu cách hai đầu, chữ hoa hoặc TAB đầu (sau khi bọc `lower(btrim(...))` vào QueryBuilder) → giá trị lưu đúng như biểu thức PostgreSQL cũ (ví dụ `'  NV.An  '` → `nv.an`, `'\tNV'` → `'\tnv'`; giá trị chính xác ghi khi chạy trên mã cũ) — test: `test_ST3_AC5_create_staff_username_normalized`, `test_ST3_AC6_create_owner_username_normalized` (ST-3).
- Ghi chú: mục RF-5 của bản trước (gửi lại `Idempotency-Key` đã dùng ở bảng khác) chuyển khỏi Review Focus để giữ tối đa 5 dòng; vẫn được phủ bởi ST-10.AC-3 (`test_ST10_AC3_key_reused_across_tables`) và ST-16.AC-3 (`test_ST16_AC3_key_reused_across_tables`).

## Sub-tasks

### Quy định chung cho mọi sub-task (đưa nguyên văn vào prompt `tdd`)
- Bổ sung riêng ST-6.AC-1 sau duyệt rõ ngoại lệ ở “Quyết định”: cho phép đúng một request và hai assertion body mới trong ca foreign branch cũ. Ngoại lệ “duy nhất assertion MỚI assert.ok(one > 0)” trong quy định nền bên dưới chỉ giới hạn counter ST-13. Quy tắc viết test trước/chạy SQL cũ và RED/GREEN giữ nguyên cho phần đã có; AC-1 bổ sung sau refactor chỉ chứng minh characterization trên mã hiện tại, chưa có RED riêng/runtime hai assertion SQL cũ. Không sửa production, helper, fixture hoặc assertion cũ để tạo RED; chưa duyệt thì DỪNG phần AC-1. Agent chính chỉ được tick riêng AC-1 sau duyệt rõ ngoại lệ và đủ log focused/module/suite/diff; AC khác không được miễn RED.
- Ponytail (M-46): thay đổi nhỏ nhất đủ yêu cầu; tái dùng mã có sẵn; không tạo abstraction/wrapper/repository tự chế, không gộp hàm; giữ cấu trúc layer (service dùng `DataSource`/`EntityManager`); không thêm dependency; chú thích chỉ ghi lý do mã không tự nói, một dòng.
- Graphify (M-46): trước khi grep/đọc source để khoanh vùng, chạy `graphify query "<câu hỏi>"`; chỉ đọc raw file ở đúng dòng graph chỉ ra; kiểm `graphify-out/needs_update` trước khi query.
- Không đổi: hành vi API, mã lỗi, message, thứ tự kiểm tra (M-30), transaction, khóa dòng và thứ tự khóa (M-14, M-20), kiểu `bigint`, idempotency, snapshot giá.
- Không sửa, xóa, skip test hiện có ngoài delta ST-3/ST-5/ST-10/ST-6/ST-13 đã duyệt và delta AC-1 CHỈ SAU KHI user duyệt rõ ngoại lệ characterization theo mục kỹ thuật bên dưới. Mọi assertion hiện hữu/helper/Lock/timeout 10000 ms/poll 20 ms/barrier/cancel/lỗi giả/digest/request/trạng thái cuối giữ nguyên; assertion MỚI chỉ assert.ok(one > 0) trong counter ST-13, hai assertion body AC-1 cùng một request sau duyệt rõ. Test mới viết trước/chạy xanh SQL cũ và ORM trừ bổ sung muộn AC-1 theo ngoại lệ characterization đã nêu. Health dùng RED 200 !== 503; race dùng false !== true đúng gate. Không sửa production để ép RED. Ghi log RED/GREEN/output từng bước vào .devloopflow/verify/20261116-orm-entities-refactor/evidence/<ST>/ (M-6).
- Chạy test trên PostgreSQL Docker `pos_infra-postgres-1` cổng host 5432 với `DATABASE_URL` do agent chính cấp trong lệnh (dựng từ `docker exec pos_infra-postgres-1 printenv POSTGRES_*`; mật khẩu trong `POS_INFRA/.env.local` không khớp container; M-34 ghi cổng 15432 là cũ); không in, không ghi mật khẩu.
- Quy tắc ORM 2026-11-17 bản 2 (user: "chỉ các câu phức tập ko dùng được các hàm truy vấn findOne find create update delete thì mới dùng qua querybuilder"; bổ sung: "khi nào mà các mã ngắn gọn như find findOne relations where phức tạp mà ko làm được nữa thì mới nghĩ đến query builder bởi vì querybuilder cực kì phức tạp rối rắm lỡ sai 1 char thôi cũng gây 500 cho server còn find hoặc findOne hoặc các hàm ngắn hơn đỡ sai sót"):
  - Thứ tự thử bắt buộc cho mỗi truy vấn: (1) `find`/`findOne`/`findBy`/`findOneBy`/`count`/`countBy`/`exists`/`existsBy` với `where` (kể cả lồng trên relation đã khai báo), `select`, `order`, `relations`, `lock: { mode, tables }`, `FindOperator`; (2) `create`/`save`/`insert`/`update` (có `{ returning }`)/`upsert`/`increment`/`delete`; (3) nhiều lời gọi (1)/(2) tuần tự thay JOIN khi bảng không có relation; (4) QueryBuilder CHỈ cho chỗ bảng "Truy vấn" của sub-task ghi "QB" kèm mã L1..L6. Làm đúng cột "Đích"; không tự đổi method thành QueryBuilder hay ngược lại; method không chạy đúng thì DỪNG, báo agent chính kèm output.
  - Mỗi câu lệnh QueryBuilder có đúng một dòng chú thích ngay trước câu lệnh, chép nguyên văn câu của mã trong bảng "Mã lý do dùng QueryBuilder" (bắt đầu `// QueryBuilder: `). Câu lệnh có nhiều builder con (CTE, sub-query) chỉ một dòng.
  - Trong `db.transaction(async manager => ...)` chỉ dùng `manager.getRepository(E)` / `manager.createQueryBuilder()`; không dùng `this.db...` hay repository inject trong callback.
  - KHÔNG truyền `null`/`undefined` vào `where`/criteria của method (TypeORM 0.3.31 bỏ điều kiện đó ở `find*`; `SelectQueryBuilder.js:2496-2510`). Giá trị lấy từ danh tính phải đã được kiểm như code cũ; điều kiện tùy chọn dùng spread có điều kiện; cần `IS NULL` thì dùng `IsNull()`.
  - Khóa bảng gốc lọc qua relation: dùng `find({ ..., lock: { mode, tables: ['<bảng gốc>'] } })` rồi `[0] ?? null`, không dùng `findOne` cho câu có cả khóa và join. Khóa nhiều bảng: nhiều `findOne({ lock })` theo đúng thứ tự cũ (G-17).
  - Không dùng `Repository.sum()` cho tiền (float); không dùng `increment`/`decrement` khi cùng câu phải đặt `updated_at`; không dùng `trim()` để chuẩn hóa username (dùng `normalizeUsername`, G-18).
  - Câu lệnh không đọc/ghi bảng (advisory lock, health): dùng `createQueryBuilder().select(...).fromDummy()` kèm chú thích L5; không gọi `select` thiếu `from`.
- Một test lồng: dùng `--test-name-pattern` theo tên test CHA (M-32).
- Không commit, không push; agent chính commit mỗi sub-task.

### Delta ST-6/ST-13: ba mock cũ (đã duyệt ngày 2026-11-17)
- Đây là quy định chung bắt buộc đưa nguyên văn vào prompt tdd của ST-6/ST-13, cùng sub-task sở hữu; không sửa test trước khi user duyệt bản draft cụ thể.
- Chỉ ba điểm mock được phép đổi: `POS_API/src/reports/tests/reports.integration.test.ts` tại hai test `test_ST2_AC7_consistent_statement`, `test_ST2_AC7_failure_readonly`; `POS_API/src/sales/tests/invoices-read.integration.test.ts:248-258` trong subtest `[ST-2.AC-4] options include inactive historical tables and cashiers outside the filtered page`. Không sửa fixture/helper/test khác.
- Import trực tiếp `PostgresQueryRunner` từ `typeorm/driver/postgres/PostgresQueryRunner`. Lưu `const originalRunnerQuery = PostgresQueryRunner.prototype.query`; callback `async function (this: PostgresQueryRunner, ...args: Parameters<PostgresQueryRunner['query']>)`; câu không bị gây lỗi phải `return originalRunnerQuery.apply(this, args)` đủ cả parameters và useStructuredResult. Restore hàm prototype trong finally dù fetch/assertion ném.
- Reports: đổi đích `mock.method` từ w.db sang PostgresQueryRunner.prototype, giữ spy.mock.restore() trong finally. Nhánh can thiệp chỉ khi `this.connection === w.db && /^\s*(SELECT|WITH)\b/i.test(args[0]) && isReportSql(args[0])`; consistent giữ nguyên `reportStatements++; await beforeStatement?.();`, failure giữ nguyên `throw new Error('relation "secret_ledger" does not exist; SELECT password_hash FROM users')`. Consistent giữ riêng `const original = w.db.query.bind(w.db)` cho cả hai UPDATE barrier/canceller; failure thay biến original chỉ dùng forward bằng originalRunnerQuery. Không sửa isReportSql, beforeStatement = undefined, hai UPDATE, request, digest hoặc assertion. Guard SELECT/WITH bắt buộc vì UPDATE qua original nay cũng đi qua prototype; UPDATE phải forward không đếm/không gọi barrier/không gây lỗi giả.
- Invoices-read: sau chuyển ST-13 thêm duy nhất `assert.ok(one > 0)` ngay sau `const one = queries`. Chạy với mock db.query cũ để RED thực tế count 0; equality cũ 0/0 không chứng minh counter hoạt động. Chỉ sau RED đúng nguyên nhân, thay originalQuery=db.query.bind(db) bằng originalRunnerQuery nêu trên; thay phép gán db.query bằng `PostgresQueryRunner.prototype.query = async function (this: PostgresQueryRunner, ...args: Parameters<PostgresQueryRunner['query']>) { if (this.connection === db) queries++; return originalRunnerQuery.apply(this, args); }`; finally gán lại `PostgresQueryRunner.prototype.query = originalRunnerQuery`. Giữ let queries=0, const one=queries, reset queries=0, hai fetch limit 1/100 và `assert.equal(queries, one)`. Đếm mọi statement trên DataSource này trong đúng hai request như counter cũ; không lọc riêng bốn SELECT list hoặc bỏ auth/quan hệ, tránh che N+1 mới. Không cố định tổng query.
- Điều kiện thay từng mock: phải có RED runtime sau chuyển code, đúng do mock cũ không quan sát QueryBuilder; không nhận build/môi trường hỏng hoặc 0 test làm RED. Reports cần test consistent/failure chạy thật và đỏ tại counter/barrier hoặc HTTP 200 thay 500. Invoices-read cần RED tại assertion MỚI one > 0. Mock còn quan sát đúng SQL/test không đỏ vì mock thì giữ mock đó; chưa chứng minh được counter còn quan sát SQL thì DỪNG báo agent chính, không nới assertion.
- GREEN: chạy lại đúng focused command, module rồi npm test tuần tự; agent chính chạy lại build/focused/module/suite và E2E-AC-6 trước tick. Restore trước GET hồi phục/digest/fixture cleanup. Không suy GREEN từ suite 276/276 trước ST-6.

### ST-1: Thêm 12 entity còn thiếu và đăng ký trong DataSource
- depends_on: -
- Interfaces:
  - Consumes: Không có
  - Produces (đường dẫn tuyệt đối dưới `POS_API/src/`, tên class xuất khẩu chính xác):
    - `inventory/entities/ingredient.entity.ts` → `export class Ingredient`
    - `inventory/entities/product-size-ingredient.entity.ts` → `export class ProductSizeIngredient`
    - `inventory/entities/topping-ingredient.entity.ts` → `export class ToppingIngredient`
    - `inventory/entities/branch-ingredient-stock.entity.ts` → `export class BranchIngredientStock`
    - `inventory/entities/stock-movement.entity.ts` → `export class StockMovement`
    - `promotions/entities/promotion-code.entity.ts` → `export class PromotionCode`
    - `sales/entities/invoice-promotion-code.entity.ts` → `export class InvoicePromotionCode`
    - `sales/entities/payment.entity.ts` → `export class Payment`
    - `sales/entities/transfer-attempt.entity.ts` → `export class TransferAttempt`
    - `sales/entities/bank-transfer-event.entity.ts` → `export class BankTransferEvent`
    - `sales/entities/store-bank-account.entity.ts` → `export class StoreBankAccount`
    - `shifts/entities/shift-expense.entity.ts` → `export class ShiftExpense`
- Mục tiêu: mỗi bảng có entity mô tả đúng cột hiện có; DataSource biết 32 entity.
- AC riêng:
  - [x] ST-1.AC-1: Given DB thử mới đã chạy 13 migration, When so `dataSource.getMetadata(E).columns` của 12 entity mới với `information_schema.columns` của bảng tương ứng, Then với mỗi bảng: tập tên cột bằng nhau, `isNullable` khớp `is_nullable`, kiểu khớp theo ánh xạ (`uuid`→`uuid`, `varchar`→`character varying`, `char`→`character`, `bigint`→`bigint`, `numeric`→`numeric`, `int`→`integer`, `boolean`→`boolean`, `timestamptz`→`timestamp with time zone`, `text`→`text`), khóa chính khớp (kiểm: integration).
  - [x] ST-1.AC-2: Given `data-source.ts` sau sửa, When build, Then `npm run build` exit 0 và mảng `entities` có 32 phần tử (kiểm: build + đọc file).
  - [x] ST-1.AC-3: Given DB thử, When `getRepository(Payment).findOneBy({ id: '<uuid không tồn tại>' })`, Then trả `null`, không lỗi metadata (kiểm: integration, cùng file test AC-1).
  - [x] ST-1.AC-4: Given toàn bộ suite, When `npm test`, Then exit 0, `# fail 0` (kiểm: lệnh).
- Plan chi tiết:
  - File tạo/sửa:
    - Tạo 12 file entity ở "Produces". Cột (nguồn: migration ở "Khám phá"; mỗi cột `@Column('<kiểu>', {...})`, khóa chính `@PrimaryColumn('<kiểu>')`):
      - `Ingredient` (`ingredients`): `id` uuid PK; `store_id` uuid; `name` varchar(100); `unit` varchar(20) kiểu TS `'g' | 'ml' | 'piece'`; `is_active` boolean; `created_at` timestamptz `Date`; `updated_at` timestamptz `Date`.
      - `ProductSizeIngredient` (`product_size_ingredients`): `product_size_id` uuid PK; `ingredient_id` uuid PK; `quantity` numeric `{ precision: 14, scale: 3 }` kiểu TS `string`.
      - `ToppingIngredient` (`topping_ingredients`): `topping_id` uuid PK; `ingredient_id` uuid PK; `quantity` numeric(14,3) `string`.
      - `BranchIngredientStock` (`branch_ingredient_stocks`): `branch_id` uuid PK; `ingredient_id` uuid PK; `current_stock` numeric(14,3) `string`; `min_stock` numeric(14,3) `string`; `updated_at` timestamptz.
      - `StockMovement` (`stock_movements`): `id` uuid PK; `branch_id` uuid; `ingredient_id` uuid; `type` varchar(20) `'IMPORT' | 'SALE' | 'SALE_REVERSAL' | 'WASTE' | 'ADJUST'`; `quantity` numeric(14,3) `string`; `balance_after` numeric(14,3) `string`; `invoice_id` uuid nullable; `note` varchar(255) nullable; `created_by` uuid nullable; `created_at` timestamptz; `source` varchar(10) `'USER' | 'SYSTEM'`.
      - `PromotionCode` (`promotion_codes`): `id` uuid PK; `store_id` uuid; `code` varchar(50); `name` varchar(150) nullable; `discount_type` varchar(20) `'PERCENT' | 'FIXED'`; `discount_value` bigint `string`; `max_discount_amount` bigint nullable `string | null`; `min_order_amount` bigint nullable `string | null`; `start_at` timestamptz; `end_at` timestamptz; `usage_limit` int nullable `number | null`; `used_count` int `number`; `is_active` boolean; `created_at`; `updated_at`.
      - `InvoicePromotionCode` (`invoice_promotion_codes`): `invoice_id` uuid PK; `promotion_code_id` uuid; `code` varchar(50); `discount_amount` bigint `string`.
      - `StoreBankAccount` (`store_bank_accounts`): `store_id` uuid PK; `bank_bin` char(6) `{ length: 6 }`; `account_number` varchar(34); `account_name` varchar(150); `updated_at` timestamptz.
      - `TransferAttempt` (`transfer_attempts`): `id` uuid PK; `invoice_id` uuid; `store_id` uuid; `bank_bin` char(6); `account_number` varchar(34); `account_name` varchar(150); `amount` bigint `string`; `transfer_reference` char(18); `idempotency_key` uuid; `idempotency_request_hash` char(64); `status` varchar(10) `'PENDING' | 'CANCELLED' | 'PAID'`; `created_at`; `updated_at`.
      - `Payment` (`payments`): `id` uuid PK; `invoice_id` uuid; `method` varchar(10) `'CASH' | 'TRANSFER'`; `amount` bigint `string`; `idempotency_key` uuid; `idempotency_request_hash` char(64); `tendered_amount`, `change_amount`, `actual_received_amount`, `excess_amount` bigint nullable `string | null`; `transfer_attempt_id` uuid nullable; `receiving_account_number` varchar(34) nullable; `transaction_ref` varchar(100) nullable; `transaction_ref_kind` varchar(12) nullable `'BANK' | 'SEPAY_EVENT' | null`; `confirmation_source` varchar(10) nullable `'WEBHOOK' | 'MANUAL' | null`; `confirmed_by` uuid nullable; `confirmation_reason` varchar(255) nullable; `created_by` uuid nullable; `paid_at` timestamptz.
      - `BankTransferEvent` (`bank_transfer_events`): `id` uuid PK; `provider_event_id` varchar(100); `provider_reference` varchar(100) nullable; `account_number` varchar(34); `transfer_reference` char(18) nullable; `transfer_amount` bigint `string`; `content` varchar(500) nullable; `received_at` timestamptz; `disposition` varchar(30) `'PAID' | 'UNDERPAID' | 'ATTEMPT_CANCELLED' | 'INVOICE_NOT_OPEN' | 'PROMOTION_INVALID' | 'QUARANTINED' | 'DUPLICATE'`; `store_id`, `branch_id`, `invoice_id`, `attempt_id` uuid nullable.
      - `ShiftExpense` (`shift_expenses`): `id` uuid PK; `work_shift_id` uuid; `amount` bigint `string`; `reason` varchar(255); `paid_from_drawer` boolean; `created_by` uuid; `created_at`; `updated_at`.
    - Sửa `POS_API/src/database/data-source.ts`: thêm 12 import trực tiếp (không barrel) và thêm 12 class vào cuối mảng `entities` theo thứ tự trên.
    - Tạo test `POS_API/src/database/tests/entity-schema.integration.test.ts`: tạo DB thử tên ngẫu nhiên prefix `pos_orm_entity_test_` theo cách `foundation.test.ts:22-38` (DataSource gốc tạo DB, DataSource thử chạy `runMigrations()`), đọc `information_schema.columns` và `pg_index` khóa chính, so với metadata; `finally` drop DB.
  - Chữ ký hàm/class: 12 class entity như trên, không phương thức.
  - DTO/schema: Không có (không đổi DTO).
  - DB/migration: Không có.
  - API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1/AC-3 (đỏ vì entity chưa có: `getMetadata` ném `EntityMetadataNotFoundError`).
    2. Tạo 12 entity, đăng ký DataSource.
    3. Chạy test file, rồi `npm test`.
  - Quy tắc nghiệp vụ: Không có (mô tả schema). Nguồn kiểu: `rules/database.md` "Giá trị cần chính xác tuyệt đối không được âm thầm đổi qua biểu diễn có thể làm tròn" → `bigint`, `numeric` khai báo `string`.
  - Bảng edge case:
    - Cột `stock_movements.created_by` sau migration Payments là nullable → entity `nullable: true` (test AC-1 bắt lệch).
    - `char(n)` (`bank_bin`, `transfer_reference`, `idempotency_request_hash`) → kiểu `char` có `length`, không dùng `varchar`.
    - Bảng khóa chính ghép (`product_size_ingredients`, `topping_ingredients`, `branch_ingredient_stocks`) → hai `@PrimaryColumn`.
  - Ảnh hưởng tới code hiện có: test khác dùng `dataSource.options.entities` (`auth.integration.test.ts:22`, `foundation.test.ts:22` ...) sẽ nạp thêm 12 entity; `synchronize: false` nên không đổi schema.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `.devloopflow/errors/2026-10-30-module-refactor-evidence-runner.md` → so sánh bằng dữ liệu đã chuẩn hóa (tập tên cột), không so chuỗi thô.
- Test viết trước:
  - [x] `test_ST1_AC1_entity_metadata_matches_schema` — input: DB thử sau 13 migration; expected: 12 bảng khớp tên cột, nullable, kiểu, khóa chính.
  - [x] `test_ST1_AC3_new_repository_query_runs` — input: `findOneBy({ id: '00000000-0000-4000-8000-000000000000' })` trên `Payment`; expected: `null`.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-2: Helper test ghi câu SQL và rút chuỗi khóa
- depends_on: -
- Interfaces:
  - Consumes: Không có
  - Produces (file `POS_API/src/database/tests/sql-capture.ts`):
    - `captureSql(t: import('node:test').TestContext): string[]` — mock `PostgresQueryRunner.prototype.query` (import `typeorm/driver/postgres/PostgresQueryRunner`) bằng `t.mock.method`, mỗi lần gọi push tham số `query` vào mảng trả về rồi gọi hàm gốc với nguyên `this` và tham số; mock tự hủy khi test kết thúc.
    - `lockSequence(sql: readonly string[]): string[]` — trả mảng token theo thứ tự xuất hiện, chỉ cho câu có khóa:
      - câu chứa `pg_advisory_xact_lock` → `'advisory'`;
      - câu chứa `FOR UPDATE` hoặc `FOR SHARE` → `'<UPDATE|SHARE>:<bảng>[,<bảng>]'`, trong đó danh sách bảng là các alias sau `OF` được ánh xạ sang tên bảng (theo các cặp `FROM <bảng> <alias>` / `JOIN <bảng> <alias>`, có thể có `AS`), giữ thứ tự sau `OF`; nếu không có `OF` thì là bảng của `FROM` đầu tiên.
      - chuẩn hóa trước khi phân tích: bỏ mọi `"`, gộp khoảng trắng liên tiếp thành một dấu cách; alias không được là từ khóa `WHERE`, `JOIN`, `INNER`, `LEFT`, `ON`, `FOR`, `ORDER`, `LIMIT`, `GROUP`.
- Mục tiêu: công cụ cho test đặc tả khóa ở ST-4 → ST-17.
- AC riêng:
  - [x] ST-2.AC-1: Given mảng SQL `['SELECT s.id FROM work_shifts s JOIN branches b ON b.id=s.branch_id WHERE s.user_id=$1 FOR UPDATE OF s,b']`, When `lockSequence`, Then `['UPDATE:work_shifts,branches']` (kiểm: unit).
  - [x] ST-2.AC-2: Given `['SELECT "t"."id" FROM "dining_tables" "t" INNER JOIN "branches" "b" ON b.id = t.branch_id WHERE t.id = $1 FOR SHARE OF t']`, When `lockSequence`, Then `['SHARE:dining_tables']` (kiểm: unit).
  - [x] ST-2.AC-3: Given `['SELECT * FROM invoices WHERE id=$1 FOR UPDATE', 'SELECT "Invoice"."id" FROM "invoices" "Invoice" WHERE "Invoice"."id" = $1 FOR UPDATE', 'SELECT pg_advisory_xact_lock(hashtextextended($1,0))', 'SELECT 1']`, When `lockSequence`, Then `['UPDATE:invoices', 'UPDATE:invoices', 'advisory']` (kiểm: unit).
  - [x] ST-2.AC-4: Given một test dùng `captureSql(t)` rồi gọi `dataSource.query('SELECT 1')` và `dataSource.getRepository(Store).createQueryBuilder('s').where('1=0').getMany()` trên DB thử, When đọc mảng, Then mảng có 2 phần tử, phần tử thứ hai chứa `FROM "stores" "s"` (kiểm: integration).
- Plan chi tiết:
  - File tạo/sửa: tạo `POS_API/src/database/tests/sql-capture.ts` (không phải `*.test.ts`, `npm test` không chạy trực tiếp); tạo `POS_API/src/database/tests/sql-capture.test.ts` (AC-1..AC-3, không cần DB) và `POS_API/src/database/tests/sql-capture.integration.test.ts` (AC-4, DB thử prefix `pos_orm_capture_test_`).
  - Chữ ký hàm/class: như "Produces".
  - DTO/schema: Không có. DB/migration: Không có. API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1..AC-4 (đỏ vì file chưa có).
    2. Viết `sql-capture.ts`.
    3. Chạy hai file test, rồi `npm test`.
  - Quy tắc nghiệp vụ: Không có.
  - Bảng edge case:
    - `FOR UPDATE OF s, b` (QueryBuilder có dấu cách sau dấu phẩy, `SelectQueryBuilder.js:1468`) và `OF s,b` (SQL cũ) → cùng token.
    - Câu không có khóa (`SELECT 1`, `INSERT ...`, `UPDATE ...`) → bỏ qua.
    - `UPDATE ... RETURNING` không phải khóa tường minh → bỏ qua.
  - Ảnh hưởng tới code hiện có: Không có (file test mới).
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `.devloopflow/errors/2026-10-30-module-refactor-evidence-runner.md` → chuẩn hóa trước khi so.
- Test viết trước:
  - [x] `test_ST2_AC1_lock_of_two_aliases` — input/expected: như ST-2.AC-1.
  - [x] `test_ST2_AC2_quoted_for_share` — input/expected: như ST-2.AC-2.
  - [x] `test_ST2_AC3_single_table_and_advisory` — input/expected: như ST-2.AC-3.
  - [x] `test_ST2_AC4_capture_sees_raw_and_builder` — input/expected: như ST-2.AC-4.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-3: Câu không đọc bảng (users, platform, bootstrap-admin, health) và auth
- depends_on: ST-2
- Interfaces:
  - Consumes: `captureSql(t: TestContext): string[]`, `lockSequence(sql: readonly string[]): string[]` từ ST-2.
  - Produces: Không có
- Mục tiêu: chuyển 11 lời gọi sang repository/QueryBuilder: `auth.service.ts:47` sang repository; 10 lời gọi không đọc bảng (E1/E2/E3) sang `createQueryBuilder().select(...).fromDummy()` (user: "Bọc hết vào QueryBuilder"), giữ nguyên biểu thức PostgreSQL và vị trí trong luồng.
- Truy vấn:
  | File:dòng | Hàm | Hiện tại | Đích |
  |---|---|---|---|
  | `auth/auth.service.ts:47` | `sessionUser` | `SELECT name FROM branches WHERE id=$1` | `this.db.getRepository(Branch).findOne({ where: { id: user.branch_id }, select: { id: true, name: true } })`, dùng `row?.name ?? null` |
  | `auth/auth.service.ts:103,119,262,351` | `recordRefreshAttempt`, `login`, `refresh`, `logout` | `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))` | `manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))', 'locked').fromDummy().setParameter('lockKey', <key cũ>).getRawOne()`; vòng `for (const key of [...keys].sort())` ở dòng 119 giữ nguyên |
  | `auth/auth.service.ts:110` | `login` | `SELECT lower(btrim($1::text)) AS username` | `this.db.createQueryBuilder().select('lower(btrim(CAST(:username AS text)))', 'username').fromDummy().setParameter('username', username).getRawOne()`; đọc `.username` |
  | `users/users.service.ts:74` | `createStaff` | như trên | như trên với `manager` và `input.username` |
  | `platform/platform.service.ts:36` | `createOwner` | như trên | như trên với `manager` và `input.username` |
  | `bootstrap-admin.ts:8` | `bootstrapAdmin` | `SELECT pg_advisory_xact_lock(6152, 1)` | `manager.createQueryBuilder().select('pg_advisory_xact_lock(6152, 1)', 'locked').fromDummy().getRawOne()` |
  | `bootstrap-admin.ts:25` | `bootstrapAdmin` | `lower(btrim($1::text))` | như dòng 110 với `manager` và `rawUsername` |
  | `http/health.controller.ts:12` | `health` | `SELECT 1` | `this.db.createQueryBuilder().select('1', 'ok').fromDummy().getRawOne()`; giữ `try/catch` → `ServiceUnavailableException` |
- AC riêng:
  - [x] ST-3.AC-1: Given user có `branch_id` của chi nhánh tên "Chi nhánh A", When `GET /api/v1/auth/me` sau đăng nhập, Then `data.user.branchName` = tên chi nhánh như hiện tại (test có sẵn `auth/tests/session-branch-name.http.test.ts` xanh) (kiểm: integration).
  - [x] ST-3.AC-2: Given user không có `branch_id` (OWNER), When đăng nhập, Then `branchName` = `null` (test có sẵn cùng file xanh) (kiểm: integration).
  - [x] ST-3.AC-3: Given sau sửa, When grep `.query(` trong `auth/auth.service.ts`, `users/users.service.ts`, `platform/platform.service.ts`, `bootstrap-admin.ts`, `http/health.controller.ts`, Then 0 dòng ở cả 5 file (kiểm: grep).
  - [x] ST-3.AC-4: Given toàn bộ suite, When `npm test`, Then exit 0, `# fail 0` (gồm `auth.integration.test.ts:100-114` đăng nhập username TAB, `foundation.test.ts:53-65` bootstrap `'  \tADMIN  '` → `'\tadmin'`, `foundation.test.ts:110,117` health 200/503, `organization.acceptance.test.ts` `USERNAME_EXISTS`). Mock health chỉ ném cho SELECT health qua QueryRunner, chuyển tiếp câu khác với nguyên `this`/tham số, luôn restore trong `finally`; giữ nguyên mọi assertion status 200/503, body, mã lỗi, message, requestId (kiểm: lệnh + đọc diff).
  - [x] ST-3.AC-5: Given OWNER tạo nhân viên qua `UsersService.createStaff` với username `'  NV.An  '` và một nhân viên khác `'\tNV2'`, When đọc `users.username` trong DB, Then đúng giá trị mà mã cũ (`SELECT lower(btrim($1::text))`) lưu — kỳ vọng suy từ biểu thức: `nv.an` và `'\tnv2'` (btrim mặc định chỉ bỏ dấu cách); tdd ghi giá trị thật khi chạy trên mã cũ (kiểm: integration).
  - [x] ST-3.AC-6: Given PLATFORM_ADMIN tạo chủ cửa hàng qua `PlatformService.addOwner` (gọi `createOwner`, `platform.service.ts:119-123`) với username `'  CHU.Quan  '`, When đọc DB, Then đúng giá trị mã cũ lưu (kỳ vọng `chu.quan`) (kiểm: integration).
  - [x] ST-3.AC-7: Given user hợp lệ, When `login` khi `captureSql` bật, Then `lockSequence` bằng mảng ghi trên mã cũ (gồm hai token `'advisory'` của dòng 119 trước các khóa `users`), và mỗi câu advisory sau khi chuyển chứa `FROM (SELECT 1 AS dummy_column)` (kiểm: integration).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/auth/auth.service.ts` (6 lời gọi; thêm import `Branch` từ `../organization/entities/branch.entity` nếu chưa có), `POS_API/src/users/users.service.ts` (1), `POS_API/src/platform/platform.service.ts` (1), `POS_API/src/bootstrap-admin.ts` (2), `POS_API/src/http/health.controller.ts` (1). Test mới: AC-5 trong `POS_API/src/organization/tests/organization.integration.test.ts` (file test có `createStaff`/`USERNAME_EXISTS` của module users-organization; nếu grep không thấy setup gọi được `UsersService` thì đặt ở `organization.acceptance.test.ts`), AC-6 trong `POS_API/src/platform/tests/platform.integration.test.ts`, AC-7 trong `POS_API/src/auth/tests/auth.integration.test.ts` — đều là `test()` mới, không sửa test cũ. Ngoại lệ delta: sửa duy nhất mock health và thêm import `PostgresQueryRunner` từ `typeorm/driver/postgres/PostgresQueryRunner` trong `POS_API/src/foundation.test.ts`; không sửa assertion hoặc phần khác của test `PB-01 migration, bootstrap and database constraints`.
  - Chữ ký hàm/class: không đổi.
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-5, AC-6, AC-7; chạy trên mã cũ (xanh), ghi giá trị username và mảng khóa thật vào evidence.
    2. Chuyển 11 lời gọi.
    3. Delta ST-3, chỉ sau duyệt plan: chạy `npm run build` rồi `node --test --test-concurrency=1 --test-name-pattern "PB-01 migration, bootstrap and database constraints" dist/foundation.test.js` trong `POS_API/` với `DATABASE_URL` do agent chính cấp; lưu RED vào `evidence/ST-3/health-mock-red.log`. RED đúng lý do: test hiện hữu nhận 200 thay vì kỳ vọng 503 vì mock `dataSource.query` không chặn QueryBuilder; lỗi môi trường/build hoặc chạy 0 test không phải RED. Log trước đó `evidence/ST-3/suite.log` có `# tests 266`, `# pass 265`, `# fail 1`, `200 !== 503` (nguồn: task mục "Blocked" và log); không sửa production để tái tạo lỗi.
    4. Thêm import trực tiếp `PostgresQueryRunner` như trên. Tại đúng khối health đang lưu `const query = dataSource.query`, đổi thành `const query = PostgresQueryRunner.prototype.query`; gán prototype bằng `async function (this: PostgresQueryRunner, ...args: Parameters<PostgresQueryRunner['query']>)`. Chỉ khi `args[0].replace(/\s+/g, ' ').trim()` bằng chuỗi `SELECT 1 AS "ok" FROM (SELECT 1 AS dummy_column) "dummy_table"` thì ném `new Error('database unavailable')`; câu khác gọi `query.apply(this, args)`, bảo toàn cả `parameters` và `useStructuredResult`. Chuỗi SQL đã kiểm bằng `new DataSource({ type: 'postgres' }).createQueryBuilder().select('1', 'ok').fromDummy().getSql()` trên TypeORM 0.3.31, không kết nối DB; nguồn luồng health: `POS_API/src/http/health.controller.ts:12`. Đặt phép gán mock và fetch/assert trong cùng `try`; `finally` gán lại `PostgresQueryRunner.prototype.query = query` dù fetch/assert ném lỗi. Giữ nguyên toàn bộ assertion tại `foundation.test.ts:109-121`, không thay status/message/requestId, không ném cho mọi SELECT và không dùng arrow làm mất `this`.
    5. Chạy lại đúng lệnh focused của bước 3, lưu GREEN vào `evidence/ST-3/health-mock-green.log`; expected 1 test chạy, pass 1, fail 0, không skip. Sau đó chạy lại test mới, `session-branch-name.http.test.ts`, `foundation.test.ts`, `auth.integration.test.ts`, rồi `npm test`; giữ tổng test 266 nếu không có test mới khác. Agent chính chạy lại build/focused/suite tuần tự, kiểm diff E2E-AC-6 trước khi tick ST-3.AC-4; không suy PASS từ log 265/266 cũ.
  - Quy tắc nghiệp vụ: username chuẩn hóa bằng `lower(btrim(...))` của PostgreSQL (lỗi `2026-10-29-pb02-username-normalization`); không đăng ký công khai, tài khoản mới phải đổi mật khẩu (`CLAUDE.md`) — không đổi.
  - Bảng edge case:
    - `branch_id` trỏ chi nhánh không còn (không xảy ra do FK `RESTRICT`) → `findOne` trả `null` → `branchName: null` như cũ.
    - DB không kết nối được → `getRawOne()` ném lỗi → health trả 503 như cũ (`foundation.test.ts:117`); mock chỉ chặn chính SQL health, không chặn migration/bootstrap/câu dọn DB; `finally` khôi phục prototype cả khi assertion thất bại.
    - Username chỉ có TAB `'\t'` → giữ `'\t'` (đăng nhập `auth.integration.test.ts:108-114`).
    - Tham số đặt tên trong `select` của `fromDummy()` không được thay → test AC-4/AC-5 đỏ; tdd báo agent chính, không tự quay lại SQL thuần.
  - Ảnh hưởng tới code hiện có: Không có (chữ ký giữ nguyên).
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `2026-10-29-pb02-username-normalization.md` → giữ nguyên biểu thức PostgreSQL, test đặc tả trước khi đổi; `2026-10-28-pb02-session-revocation-races.md`, `2026-10-28-pb02-login-password-race.md` → không dời advisory lock hay khóa user.
- Test viết trước:
  - [x] `PB-01 migration, bootstrap and database constraints` (có sẵn, delta chỉ sửa mock health) — input: GET health khi DB bình thường rồi giả lập lỗi đúng SELECT health; expected: giữ toàn bộ assertion 200/503, envelope, message, requestId như `foundation.test.ts:109-121`; RED trước sửa mock là `200 !== 503`, GREEN sau sửa mock; prototype được khôi phục bằng `finally`.
  - [x] `session-branch-name.http.test.ts` (có sẵn) — input: đăng nhập user có/không chi nhánh; expected: `branchName` như hiện tại.
  - [x] `test_ST3_AC5_create_staff_username_normalized` — input: `'  NV.An  '`, `'\tNV2'`; expected: giá trị mã cũ lưu (`nv.an`, `'\tnv2'`).
  - [x] `test_ST3_AC6_create_owner_username_normalized` — input: `'  CHU.Quan  '`; expected: giá trị mã cũ lưu (`chu.quan`).
  - [x] `test_ST3_AC7_login_lock_sequence` — input: đăng nhập hợp lệ; expected: mảng khóa ghi trên mã cũ.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-4: promotions
- depends_on: ST-1, ST-2
- Interfaces:
  - Consumes: `PromotionCode` từ ST-1 (`promotions/entities/promotion-code.entity.ts`); `captureSql(t: TestContext): string[]`, `lockSequence(sql: readonly string[]): string[]` từ ST-2.
  - Produces: Không có
- Truy vấn (`POS_API/src/promotions/promotions.service.ts`, 5):
  | Dòng | Hàm | Đích |
  |---|---|---|
  | 92 | `list` (đếm) | QueryBuilder `this.db.getRepository(PromotionCode).createQueryBuilder('p')` với `p.store_id = :store`, `andWhere('p.is_active = :active')` khi có `isActive`, `andWhere('(p.code ILIKE :q OR p.name ILIKE :q)', { q: \`%${query.q}%\` })` khi có `q`; `getCount()` trước khi thêm điều kiện cursor |
  | 95 | `list` (trang) | Cùng QueryBuilder + `andWhere('(p.created_at, p.id) < (CAST(:createdAt AS timestamptz), CAST(:id AS uuid))')` khi có cursor, `addSelect(\`to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')\`, 'cursor_time')`, `orderBy('p.created_at', 'DESC').addOrderBy('p.id', 'DESC').limit(limit + 1)`, `getRawAndEntities()`; `view(entity)`; cursor lấy `raw[i].cursor_time` |
  | 107 | `create` | `insert().into(PromotionCode).values({...}).returning('*').execute()`, `this.view(result.raw[0])`; giữ `catch` `23505` → `DUPLICATE_PROMOTION_CODE` |
  | 122 | `patch` (khóa) | `manager.getRepository(PromotionCode).createQueryBuilder('p').where('p.id = :id AND p.store_id = :store').setLock('pessimistic_write').getOne()`; `null` → 404 `NOT_FOUND` |
  | 126 | `patch` (cập nhật) | `manager.createQueryBuilder().update(PromotionCode).set({..., updated_at: () => 'now()'}).where('id = :id AND store_id = :store').returning('*').execute()`, `this.view(result.raw[0])` |
- AC riêng:
  - [x] ST-4.AC-1: Given mã giảm giá thuộc cửa hàng, When `patch` trong khi `captureSql` bật, Then `lockSequence` = `['UPDATE:promotion_codes']` trước và sau khi chuyển (kỳ vọng suy từ `promotions.service.ts:122`; tdd xác nhận bằng chạy trên mã cũ) (kiểm: integration).
  - [x] ST-4.AC-2: Given mã `SALE10` (PERCENT 10), When `PATCH` đổi `name`, Then response `data` là object bản ghi (có `id`, `code` = `SALE10`, `discountValue` cùng kiểu với trước khi chuyển), không phải mảng (kiểm: integration).
  - [x] ST-4.AC-3: Given hai mã cùng cửa hàng có `created_at` `2026-11-16T01:00:00.000001Z` và `2026-11-16T01:00:00.000002Z`, When `GET` danh sách `limit=1` rồi trang 2 theo `nextCursor`, Then trang 1 trả mã có `.000002Z`, trang 2 trả mã có `.000001Z`, `total` = 2 (kiểm: integration).
  - [x] ST-4.AC-4: Given mã trùng `code` trong cửa hàng, When `create`, Then 409 `DUPLICATE_PROMOTION_CODE` message `Mã giảm giá đã tồn tại.` (test có sẵn `inventory.integration.test.ts`) (kiểm: integration).
  - [x] ST-4.AC-5: Given sau sửa, When grep `.query(` trong `promotions.service.ts`, Then 0 dòng; `npm test` exit 0, `# fail 0` (kiểm: grep + lệnh).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/promotions/promotions.service.ts` (5 truy vấn), test mới trong file test có sẵn của module mã giảm giá (`POS_API/src/inventory/tests/inventory.integration.test.ts` đang chứa test `/promotions`) dưới dạng `test()` mới, không sửa test cũ.
  - Chữ ký hàm/class: không đổi (`list`, `create`, `patch`, `view`, `validate`, `calculate`).
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1, AC-2, AC-3; chạy trên mã cũ (xanh), ghi mảng khóa thực tế vào evidence.
    2. Chuyển 5 truy vấn.
    3. Chạy lại test mới và test module, rồi `npm test`.
  - Quy tắc nghiệp vụ: cursor phân trang `(created_at,id)` giảm dần (`docs/api-spec.md` quy ước `sort=-createdAt`).
  - Bảng edge case:
    - `q` chứa `%` → giữ nguyên hành vi cũ (không escape) vì SQL cũ cũng không escape.
    - `isActive` không truyền → không lọc.
    - `validate(input, previous)` đọc `previous.<cột snake_case>` → entity có cùng khóa.
  - Ảnh hưởng tới code hiện có: `calculate(row)` không đổi.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `2026-11-07-sprint07-update-returning.md` → đọc `result.raw[0]`.
- Test viết trước:
  - [x] `test_ST4_AC1_patch_lock_sequence` — input: patch mã hợp lệ; expected: `['UPDATE:promotion_codes']`.
  - [x] `test_ST4_AC2_patch_returns_updated_row` — input: PATCH đổi `name`; expected: object, `code` = `SALE10`.
  - [x] `test_ST4_AC3_promotions_cursor_keeps_microseconds` — input: hai mã cách 1 micro giây, `limit=1`; expected: như AC-3.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-5: store-bank-account
- depends_on: ST-1, ST-2
- Interfaces:
  - Consumes: `StoreBankAccount`, `TransferAttempt` từ ST-1; `captureSql`, `lockSequence` từ ST-2.
  - Produces: Không có
- Truy vấn (`POS_API/src/sales/store-bank-account.service.ts`, 4):
  | Dòng | Hàm | Đích |
  |---|---|---|
  | 13 | `get` | `this.db.getRepository(StoreBankAccount).findOne({ where: { store_id }, select: { store_id: true, bank_bin: true, account_number: true, account_name: true } })` |
  | 20 | `update` (khóa cửa hàng) | `manager.getRepository(Store).createQueryBuilder('s').select('s.id').where('s.id = :id').setLock('pessimistic_write').getOne()` |
  | 21 | `update` (QR chờ) | `manager.getRepository(TransferAttempt).existsBy({ store_id, status: 'PENDING' })` → `true` thì 409 `TRANSFER_PENDING` |
  | 23 | `update` (upsert) | `manager.createQueryBuilder().insert().into(StoreBankAccount).values({ store_id, bank_bin, account_number, account_name, updated_at: () => 'now()' }).orUpdate(['bank_bin', 'account_number', 'account_name', 'updated_at'], ['store_id']).execute()` |
- AC riêng:
  - [x] ST-5.AC-1: Given OWNER cửa hàng, When `update` khi `captureSql` bật, Then `lockSequence` = `['UPDATE:stores']` trước và sau khi chuyển (kiểm: integration).
  - [x] ST-5.AC-2: Given cửa hàng đã có tài khoản, When `update` lần 2 với `accountName` khác, Then `get` trả giá trị mới và cột `updated_at` trong DB lớn hơn giá trị trước lần 2 (kiểm: integration).
  - [x] ST-5.AC-3: Given cửa hàng có `transfer_attempts` `PENDING`, When `update`, Then 409 `TRANSFER_PENDING` message `Cửa hàng còn mã QR đang chờ thanh toán.` (test có sẵn trong `payment.integration.test.ts` hoặc thêm nếu grep không thấy) (kiểm: integration).
  - [x] ST-5.AC-4: Given sau sửa, When grep `.query(` trong file, Then 0; `npm test` exit 0, `# fail 0` (kiểm: grep + lệnh).
  - [x] ST-5.AC-5: Given ST-5 đã chuyển ORM và race cũ đỏ `false !== true` tại `bank change must wait for QR store lock`, When chỉ đổi `waiting('SELECT id FROM stores')` thành `waiting('FROM "stores" "s"')` sau phê duyệt delta, Then `test_ST5_account_permission_race` xanh, cả hai assertion chờ Lock vẫn `true`; QR trả 201, PATCH trả 409 `TRANSFER_PENDING`, QR và tài khoản DB giữ tên tài khoản cũ, hủy QR trả 204; helper/timeout/poll/assertion/thứ tự request giữ nguyên (kiểm: focused test cha, diff, test module và `npm test`; nguồn: `payment.integration.test.ts:1105-1143`).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/sales/store-bank-account.service.ts`; test mới thêm vào `POS_API/src/sales/tests/payment.integration.test.ts` (file đang chứa test `store-bank-account`) dưới dạng `test()` mới. Ngoại lệ delta ST-5 chỉ sửa literal store dòng 1129 của race cũ sau phê duyệt draft; chưa sửa literal INSERT dòng 1126 ở ST-5.
  - Chữ ký hàm/class: không đổi.
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. grep `TRANSFER_PENDING` + `bank-account` trong test; nếu chưa có test cho `update` khi còn QR chờ thì viết `test_ST5_AC3_pending_blocks_update`.
    2. Viết test AC-1, AC-2; chạy trên mã cũ.
    3. Chuyển 4 truy vấn; chạy lại. Hiện đã chuyển, build xanh, module đỏ race cũ (`evidence/ST-5/module.log`), ST-5 chưa tick; không sửa production hoặc dựng lại RED bằng thay mã.
    4. Sau khi user duyệt delta, chạy `npm run build`, rồi `node --env-file-if-exists=.env --test --test-concurrency=1 --test-name-pattern="ST-5.AC-1/2 bank account and QR attempts use live HTTP and isolated PostgreSQL" dist/sales/tests/payment.integration.test.js` trong `POS_API/` với `DATABASE_URL` theo quy định chung; lưu RED vào `evidence/ST-5/race-pattern-red.log`. Xác nhận subtest `test_ST5_account_permission_race` thật sự chạy và đỏ đúng `bank change must wait for QR store lock`; dùng tên test CHA theo M-32, không coi chỉ chạy test cha là bằng chứng race đã chạy.
    5. Đối chiếu SQL khóa từ source `store-bank-account.service.ts:23`: `SELECT "s"."id" AS "s_id" FROM "stores" "s" WHERE "s"."id" = $1 FOR UPDATE` (đã dựng kiểm ở "Khám phá"). Chỉ đổi literal store thành `FROM "stores" "s"`; giữ helper, Lock, timeout/poll, mọi assertion và production. Literal INSERT giữ `INSERT INTO transfer_attempts` vì ST-10 chưa chuyển.
    6. Chạy lại đúng focused command bước 4, lưu `evidence/ST-5/race-pattern-green.log`; xác nhận race xanh và trạng thái cuối AC-5. Chạy test module `node --env-file-if-exists=.env --test --test-concurrency=1 dist/sales/tests/payment.integration.test.js`, rồi `npm test`; lưu `module-after-delta.log`, `suite-after-delta.log`. Agent chính kiểm lại build/focused/module/suite tuần tự và diff E2E-AC-6 trước khi tick ST-5.
  - Quy tắc nghiệp vụ: không đổi tài khoản khi còn QR chờ (`store-bank-account.service.ts:21-22`).
  - Bảng edge case: chưa có tài khoản → `get` trả `null`; `bank_bin` `char(6)` trả nguyên chuỗi 6 ký tự.
  - Ảnh hưởng tới code hiện có: chỉ literal dò store của race cũ đổi theo delta sau phê duyệt; controller/caller service và mọi assertion giữ nguyên.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: Không có lỗi riêng; áp dụng quy tắc chung M-14.
- Test viết trước:
  - [x] `test_ST5_AC1_update_lock_sequence` — input: OWNER cập nhật; expected: `['UPDATE:stores']`.
  - [x] `test_ST5_AC2_upsert_updates_updated_at` — input: hai lần cập nhật; expected: giá trị mới, `updated_at` tăng.
  - [x] `test_ST5_AC3_pending_blocks_update` (chỉ khi chưa có) — input: QR `PENDING`; expected: 409 `TRANSFER_PENDING`.
  - [x] `test_ST5_account_permission_race` (test cũ, không tạo mới) — input: tạo QR bị giữ tại advisory gate `97531`, rồi PATCH tên tài khoản; expected: RED/GREEN và trạng thái cuối ST-5.AC-5, chỉ đổi literal store.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-6: reports
- depends_on: ST-1, ST-2
- Interfaces:
  - Consumes: `Payment` từ ST-1 (`sales/entities/payment.entity.ts`); `captureSql(t: TestContext): string[]` từ ST-2; `Branch`, `WorkShift`, `Invoice`, `InvoiceItem` có sẵn.
  - Produces: Không có
- Truy vấn (`POS_API/src/reports/reports.service.ts`, 3):
  | Dòng | Hàm | Đích |
  |---|---|---|
  | 99 | `getRevenue` | `this.db.getRepository(Branch).existsBy({ id: branchId, store_id: storeId })`; `false` → 404 `NOT_FOUND` |
  | 106 | `getRevenue` | `this.db.getRepository(WorkShift).createQueryBuilder('w').innerJoin(Branch, 'b', 'b.id = w.branch_id').select('w.user_id', 'user_id').where('w.id = :shiftId AND b.store_id = :storeId')` + `andWhere('w.branch_id = :branchId')` chỉ khi `branchId !== null`; `getRawOne()` |
  | 112 | `getRevenue` | CTE QueryBuilder MỘT statement theo dòng E4 của "Bảng chuyển 6 truy vấn khó"; hằng `REVENUE_SQL` (`:39-72`) bị xóa; chú thích `:38` giữ và đặt trên QueryBuilder mới. Chi tiết từng CTE (biểu thức chép nguyên văn từ `:40-72`, chỉ đổi tham số): `bounds` = `select('LEAST(CAST(:reportDate AS date), CAST(:fromDate AS date))::timestamp AT TIME ZONE \'Asia/Ho_Chi_Minh\'', 'lo').addSelect('(GREATEST(CAST(:reportDate AS date), CAST(:toDate AS date)) + 1)::timestamp AT TIME ZONE \'Asia/Ho_Chi_Minh\'', 'hi').fromDummy()`; `scoped` = select `i.id`→`id`, `i.paid_at`→`paid_at`, `(i.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`→`day`, `p.method`→`method`, `p.amount`→`amount`, nguồn như bảng, `where("b.store_id = :storeId AND i.status = 'PAID' AND i.paid_at >= bounds.lo AND i.paid_at < bounds.hi")` + điều kiện `branchId`/`shiftId` dạng cũ; `totals` = `from('scoped', 'scoped')` select `count(*)`→`cnt`, `COALESCE(SUM(amount) FILTER (WHERE method = 'CASH'), 0)`→`cash`, như vậy cho `transfer`, `where('day = CAST(:reportDate AS date)')`; `daily` như bảng; `sizes` = `from('scoped', 's').innerJoin(InvoiceItem, 'ii', 'ii.invoice_id = s.id')`, 4 select nguyên văn `:61-63`, `where('s.day = CAST(:reportDate AS date)').groupBy('ii.product_size_id')`; `top` = `from('sizes', 'sizes').select('*')`, `orderBy` `quantity DESC, product_name ASC, size_name ASC, product_size_id ASC`, `limit(10)`; câu cuối `fromDummy()` + 5 `addSelect` sub-query chép nguyên văn `:69-72` (`cnt::text`, `cash::text`, `transfer::text`, `json_agg` daily, `json_agg` best); `.setParameters({ storeId, branchId, shiftId: query.shiftId ?? null, reportDate: query.date, fromDate: query.fromDate, toDate: query.toDate }).getRawOne()` |
- AC riêng:
  - [x] ST-6.AC-1: Given OWNER có `report.view_all` + `branch.access_all`, `branchId` thuộc cửa hàng khác, When `GET /api/v1/reports/revenue`, Then 404, `body.error.code` = `NOT_FOUND`, `body.error.message` = `Không tìm thấy tài nguyên.`; tái dùng `test_ST2_AC3_scope_permissions_http`, giữ assertion 404 cũ, bổ sung đúng một request và hai assertion body theo delta sau duyệt. Chỉ tick theo ngoại lệ characterization đã được user duyệt rõ và log focused/module/suite/diff; không ghi có RED riêng hoặc runtime hai assertion SQL cũ khi chưa chạy (nguồn: reports.service.ts:41, reports.integration.test.ts:150-162; kiểm: HTTP/integration).
  - [x] ST-6.AC-2: Given MANAGER chi nhánh A, `shiftId` của ca chi nhánh B cùng cửa hàng, When gọi báo cáo, Then 404 (test có sẵn `[B-54]` trong `reports.integration.test.ts`) (kiểm: integration).
  - [x] ST-6.AC-3: Given 14 test reports.integration.test.ts đã liệt kê ở “Khám phá”, reports.test.ts và reports-permissions.integration.test.ts, When npm test, Then xanh trước/sau chuyển; chỉ hai mock/import/original/restore theo delta ST-6 đã duyệt và RED runtime, cùng ba dòng AC-1 sau duyệt riêng; mọi assertion/test logic hiện hữu giữ nguyên. Hai assertion AC-1 chưa có runtime SQL cũ, không suy từ baseline cũ (kiểm: integration + diff).
  - [x] ST-6.AC-4: Given 12 cặp món/size PAID cùng ngày, hai cặp bằng số lượng ở vị trí 10-11, When gọi báo cáo, Then `bestSellers` có đúng 10 phần tử, thứ tự theo `quantity DESC, productName ASC, sizeName ASC, productSizeId ASC`, giá trị y như mã cũ trả (ghi khi chạy trên mã cũ) (kiểm: integration).
  - [x] ST-6.AC-5: Given báo cáo có `branchId` và `shiftId`, When gọi `getRevenue` khi `captureSql` bật, Then số câu SQL chứa `FROM "invoices"` hoặc `scoped` trong lần gọi đó = 1 (tổng, biểu đồ, món bán chạy cùng một statement) và câu đó bắt đầu bằng `WITH` (kiểm: integration).
  - [x] ST-6.AC-6: Given sau sửa, When grep `.query(` trong `reports.service.ts`, Then 0; `npm test` exit 0, `# fail 0` (kiểm: grep + lệnh).
  - [x] ST-6.AC-7: Given user duyệt delta và sau chuyển QueryBuilder hai test reports cũ đỏ vì mock DataSource bị bỏ qua, When chỉ đổi hai mock theo “Delta ST-6/ST-13”, Then consistent đếm 1 aggregate lượt đầu, barrier UPDATE hoàn tất trước statement, count 23/revenue 23000/daily 23000, 30 request sau đếm 30 và giữ mọi assertion snapshot; failure trả 500 INTERNAL_ERROR, message `Hệ thống gặp lỗi. Vui lòng thử lại sau.`, requestId req-reports-500, không lộ SQL, restore rồi GET 200/revenue 20000/digest bằng trước; guard đúng DataSource/SELECT-WITH, giữ mọi assertion/barrier/cancel/lỗi giả/digest, restore finally (kiểm: RED/GREEN focused + module + suite + diff; nguồn: reports.integration.test.ts:352-420).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/reports/reports.service.ts` (3 truy vấn; xóa hằng `REVENUE_SQL`; import `Branch`, `WorkShift`, `Invoice`, `InvoiceItem`, `Payment`). Test mới trong `reports.integration.test.ts`: `test_ST6_AC4_best_sellers_limit_and_ties`, `test_ST6_AC5_revenue_single_statement`. AC-1 dùng test hiện hữu; không tạo `test_ST6_AC1_branch_other_store_404`, không thêm file/helper/fixture/config/export/dependency.
  - Ngoại lệ test cũ ST-6/ST-13 đã duyệt ngày 2026-11-17: đúng hai mock/import/original/restore trong test_ST2_AC7_consistent_statement/test_ST2_AC7_failure_readonly theo mục delta chung. Ngoại lệ AC-1 ĐÃ duyệt ngày 2026-11-17: đúng ba dòng trong `test_ST2_AC3_scope_permissions_http` theo bước 7; không sửa reports.fixture.ts/isReportSql/assertion hiện hữu.
  - Chữ ký hàm/class: không đổi. DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Kiểm test có sẵn cho AC-1/AC-2. AC-1 đã có assertion status nhưng helper total bỏ body, chưa chứng minh code/message. Viết AC-4, AC-5. Chạy toàn bộ test báo cáo trên mã cũ (xanh), ghi output theo quy trình cũ. AC-1 bổ sung muộn chỉ thực hiện bước 7 sau duyệt riêng; không ghi hai assertion mới đã chạy trên SQL cũ.
    2. Chuyển dòng 99, 106; chạy lại.
    3. Chuyển REVENUE_SQL sang CTE QueryBuilder, ghi getQueryAndParameters() một lần vào evidence để so SQL cũ; không giữ output trong mã. Giữ hai mock cũ.
    4. Sau duyệt delta, npm run build rồi `node --env-file-if-exists=.env --test --test-concurrency=1 --test-name-pattern="test_ST2_AC7_(consistent_statement|failure_readonly)" dist/reports/tests/reports.integration.test.js` trong POS_API/ với DATABASE_URL theo quy định chung. Lưu evidence/ST-6/reports-mock-red.log, xác nhận cả hai test chạy và RED đúng nguyên nhân theo mục delta chung. Không ghi trước số FAIL; chỉ thay từng mock đã có RED hợp lệ.
    5. Thực hiện đúng hai mock/import/original/restore và guard reports tại “Delta ST-6/ST-13”; giữ nguyên mọi assertion/barrier/cancel/lỗi giả/digest/helper.
    6. Chạy lại focused command bước 4, lưu evidence/ST-6/reports-mock-green.log. Chạy `node --env-file-if-exists=.env --test --test-concurrency=1 dist/reports/tests/reports.integration.test.js dist/reports/tests/reports.test.js dist/reports/tests/reports-permissions.integration.test.js`, lưu module-after-delta.log, rồi npm test, lưu suite-after-delta.log trong evidence/ST-6/. Agent chính chạy lại build/focused/module/suite tuần tự và kiểm diff E2E-AC-6.
    7. Sau khi user duyệt rõ delta AC-1 và ngoại lệ characterization, ngay sau `assert.equal(await total('owner_a', { branchId: w.id.b1 }), 404);` trong `test_ST2_AC3_scope_permissions_http`, chỉ thêm ba dòng: `const foreignBranch = await ownerGet(w, defaultQuery({ branchId: w.id.b1 }));`, `assert.equal(foreignBranch.body.error.code, 'NOT_FOUND');`, `assert.equal(foreignBranch.body.error.message, 'Không tìm thấy tài nguyên.');`. Không sửa total/ownerGet/defaultQuery/fixture/assertion status cũ. Chạy `npm run build`, rồi `node --env-file-if-exists=.env --test --test-concurrency=1 --test-name-pattern="test_ST2_AC3_scope_permissions_http" dist/reports/tests/reports.integration.test.js` trong POS_API/ với DATABASE_URL theo quy định chung; lưu đầy đủ output vào `evidence/ST-6/ac1-characterization-current.log`. Đây là characterization hành vi hiện hữu trên ORM hiện tại, không là RED/GREEN; test phải chạy thật, không skip, fail 0. Nếu đỏ: DỪNG báo agent chính, không tự sửa production hoặc expected ngoài plan. Sau focused xanh, chạy lại đúng module command bước 6 và npm test tuần tự, lưu `ac1-module.log`, `ac1-suite.log`; agent chính chạy lại build/focused/module/suite, kiểm diff E2E-AC-6 trước tick. Không restore SQL cũ hoặc ghi đè working tree để lấy baseline. `git show master:POS_API/src/reports/reports.service.ts` chỉ là đối chiếu source đọc, không thay runtime hoặc tạo RED. Giữ AC-1 trống tới khi đủ chứng cứ và duyệt ngoại lệ; không dùng RED AC-7 để tick AC-1.
  - Quy tắc nghiệp vụ: phạm vi lấy từ danh tính (`reports.service.ts:95`), M-45; ngày theo `Asia/Ho_Chi_Minh` (`CLAUDE.md`); một statement = một snapshot (`reports.service.ts:38`).
  - Bảng edge case:
    - `level` khác `all` → `branchId` = `user.branchId` luôn khác `null`.
    - Tham số: tên `reportDate` (KHÔNG `date`, vì `PostgresDriver.js:648-651` sẽ thay cả `::date`).
    - `json_agg` trả JSON đã parse như cũ (pg driver); `'[]'::json` giữ nguyên (không có tham số tên `json`).
    - Tổng/biểu đồ là `bigint`/`numeric` đọc qua `::text` rồi `toSafeMoney` như cũ.
  - Ảnh hưởng tới code hiện có: Không có.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `20261114-reports-cross-branch-shift-and-payment-paid-at-untested.md` → điều kiện chi nhánh/ca và `i.paid_at` (không phải `p.paid_at`) giữ nguyên, test B-54/B-57 xanh; `20261114-reports-date-before-chart-range-untested.md` → giữ `LEAST`/`GREATEST`, test `test_ST2_AC5_date_before_chart_range` xanh.
- Test viết trước:
  - [x] `test_ST2_AC3_scope_permissions_http` (có sẵn; bổ sung AC-1 sau duyệt ngoại lệ characterization) — input: owner_a, branchId w.id.b1; expected: giữ assertion 404 cũ; thêm body.error.code = NOT_FOUND, body.error.message = Không tìm thấy tài nguyên.; chạy xanh mã hiện tại, chưa RED riêng/runtime hai assertion SQL cũ. Giữ trong mục “Test viết trước” để giữ cấu trúc; ba dòng bổ sung sau refactor, chưa viết trước production.
  - [x] `test_ST6_AC4_best_sellers_limit_and_ties` — input: 12 cặp món/size, tie ở vị trí 10-11; expected: 10 phần tử, thứ tự như mã cũ.
  - [x] `test_ST6_AC5_revenue_single_statement` — input: báo cáo có `branchId`, `shiftId`; expected: 1 câu SQL tính báo cáo, bắt đầu `WITH`.
  - [x] `test_ST2_AC7_consistent_statement` và `test_ST2_AC7_failure_readonly` (cũ, chỉ mock/import/original/restore) — input: 24 hóa đơn 1000đ/barrier cancel/30 reads và lỗi giả nguyên văn mục delta; expected: RED mock cũ sau chuyển, GREEN counter 1/30/count 23/revenue 23000, failure đủ 500/error/digest/hồi phục ST-6.AC-7; giữ mọi assertion.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-3b: Chuẩn hóa username bằng JavaScript và chú thích QueryBuilder còn lại (auth, users, platform, bootstrap-admin, health) — làm lại ST-3 theo quy tắc 2026-11-17
- depends_on: ST-3
- Interfaces:
  - Consumes: Không có.
  - Produces: `export function normalizeUsername(value: string): string` trong `POS_API/src/auth/auth.service.ts` (thân hàm đúng: `return value.replace(/^ +| +$/g, '').toLowerCase();`). Dùng ở `auth.service.ts` (`login`), `users/users.service.ts` (`createStaff`), `platform/platform.service.ts` (`createOwner`), `bootstrap-admin.ts` (`bootstrapAdmin`).
- Mục tiêu: bỏ 4 câu SQL viết tay `lower(btrim(...))` qua `fromDummy()` (user: tránh chuỗi SQL viết tay trong QueryBuilder), dùng một hàm JavaScript chung cho cả đăng nhập, bootstrap, tạo nhân viên, tạo chủ cửa hàng (lỗi `2026-10-29-pb02-username-normalization.md` yêu cầu cùng một biểu thức ở mọi nơi); 6 câu không bảng (5 advisory, 1 health) giữ QueryBuilder L5 và có chú thích. Thay một phần G-5 (G-18).
- Truy vấn (bảng quyết định):
  | File:dòng hiện tại | Hàm | Hiện tại | Đã thử | Đích |
  |---|---|---|---|---|
  | `auth/auth.service.ts:48` | `sessionUser` | repo `findOne` | (1) đủ | Giữ |
  | `auth/auth.service.ts:104` | `recordRefreshAttempt` | QB advisory | (1)-(3) không có method lấy advisory lock | Giữ QB + chú thích L5 |
  | `auth/auth.service.ts:111` | `login` | QB `lower(btrim(CAST(:username AS text)))` | không cần truy vấn | `const normalized = normalizeUsername(username);` |
  | `auth/auth.service.ts:120` | `login` (vòng `for`) | QB advisory | như `:104` | Giữ QB + chú thích L5 đặt trên dòng `for` |
  | `auth/auth.service.ts:263` | `refresh` | QB advisory | như `:104` | Giữ QB + chú thích L5 |
  | `auth/auth.service.ts:352` | `logout` | QB advisory | như `:104` | Giữ QB + chú thích L5 |
  | `users/users.service.ts:74` | `createStaff` | QB username | không cần truy vấn | `const username = normalizeUsername(input.username);` (import từ `../auth/auth.service`, file đã import `UserSummary` từ đó) |
  | `platform/platform.service.ts:36` | `createOwner` | QB username | không cần truy vấn | `const username = normalizeUsername(input.username);` (thêm import từ `../auth/auth.service`) |
  | `bootstrap-admin.ts:8` | `bootstrapAdmin` | QB advisory `(6152, 1)` | như `:104` | Giữ QB + chú thích L5 |
  | `bootstrap-admin.ts:25` | `bootstrapAdmin` | QB username | không cần truy vấn | `const username = normalizeUsername(rawUsername);` (thêm import từ `./auth/auth.service`) |
  | `http/health.controller.ts:12` | `health` | QB `select('1', 'ok').fromDummy()` | (1) mọi method đọc bảng: đổi hành vi khi DB chưa migrate và phải sửa lại mock health đã duyệt (G-11) | Giữ QB + chú thích L5 |
- AC riêng:
  - [x] ST-3b.AC-1: Given sau sửa, When chạy `npm run build` rồi focused `PB-01 migration, bootstrap and database constraints` (`dist/foundation.test.js`: bootstrap `'  \tADMIN  '` → `'\tadmin'`, health 200/503), test đăng nhập username TAB (`auth.integration.test.ts:100-114`), `test_ST3_AC5_create_staff_username_normalized` (`'  NV.An  '` → `nv.an`, `'\tNV2'` → `'\tnv2'`), `test_ST3_AC6_create_owner_username_normalized` (`'  CHU.Quan  '` → `chu.quan`), `test_ST3_AC7_login_lock_sequence`, Then tất cả xanh; `test_ST3_AC7` có mảng khóa như ST-3 nhưng KHÔNG còn câu `lower(btrim` trong SQL đã ghi (kiểm: integration).
  - [x] ST-3b.AC-2: Given DB thử, When test mới `test_ST3b_AC2_normalize_username_matches_postgres` so `normalizeUsername(x)` với kết quả `SELECT lower(btrim($1::text)) AS u` (chạy bằng `db.query` trong test) cho từng giá trị: `'  NV.An  '`, `'\tNV2'`, `'  \tADMIN  '`, `'ADMIN\t'`, `' '`, `'Nguyễn.VĂN'`, `'ĐỨC'`, `'Ánh Dương'`, Then từng cặp bằng nhau (kiểm: integration). Có cặp khác nhau → DỪNG, báo agent chính kèm giá trị; không tự đổi hàm.
  - [x] ST-3b.AC-3: Given sau sửa, When chạy trong `POS_API/src`: `grep -rn "lower(btrim" --include=*.ts . | grep -v "/migrations/" | grep -v "\.test\.ts" | grep -v "/tests/"` → rỗng; `grep -c "// QueryBuilder:"` cho `auth/auth.service.ts`, `bootstrap-admin.ts`, `http/health.controller.ts`, `users/users.service.ts`, `platform/platform.service.ts` → `4`, `1`, `1`, `0`, `0`; mỗi dòng chú thích là nguyên văn câu L5 (kiểm: grep + diff).
  - [x] ST-3b.AC-4: Given sau sửa, When `npm test`, Then exit 0, `# fail 0` (kiểm: lệnh).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/auth/auth.service.ts` (thêm `normalizeUsername`, dùng ở `login`, 4 dòng chú thích), `POS_API/src/users/users.service.ts`, `POS_API/src/platform/platform.service.ts`, `POS_API/src/bootstrap-admin.ts` (1 dòng chú thích), `POS_API/src/http/health.controller.ts` (1 dòng chú thích). Test mới `test_ST3b_AC2_normalize_username_matches_postgres` trong `POS_API/src/auth/tests/auth.integration.test.ts` (dạng `test()` mới, dùng DB thử theo setup có sẵn của file).
  - Chữ ký hàm/class: thêm `normalizeUsername(value: string): string`; hàm khác không đổi. DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết `test_ST3b_AC2_...` gọi `normalizeUsername` (đỏ vì chưa có export: build lỗi / `TypeError`), lưu `evidence/ST-3b/red.log`.
    2. Thêm `normalizeUsername`, thay 4 chỗ `fromDummy()` username; thêm 6 dòng chú thích L5.
    3. Chạy AC-2, AC-1, rồi `npm test`; lưu `green.log`, `suite.log`; grep AC-3 vào `grep.log`.
  - Quy tắc nghiệp vụ: không đăng ký công khai; username duy nhất theo giá trị đã chuẩn hóa (`USERNAME_EXISTS`); đăng nhập, bootstrap, tạo tài khoản dùng cùng một chuẩn hóa (lỗi `2026-10-29-pb02-username-normalization.md`).
  - Bảng edge case:
    - `'\t'` hoặc TAB đầu/cuối → giữ TAB (chỉ bỏ dấu cách), như `btrim`.
    - Chuỗi toàn dấu cách `' '` → `''` (như `btrim`); các kiểm tra rỗng/độ dài phía sau giữ nguyên.
    - Ký tự Unicode mà `toLowerCase()` khác `lower()` của PostgreSQL (ví dụ `İ`, sigma cuối từ) → tên đã lưu bằng `lower()` có thể không khớp khi đăng nhập; user đã chấp nhận ở Q2 (2026-11-17); AC-2 chỉ phủ chữ Việt và ASCII.
  - Ảnh hưởng tới code hiện có: `users.service.ts`, `platform.service.ts`, `bootstrap-admin.ts` import thêm `normalizeUsername` từ `auth.service.ts`. Tác dụng phụ: bớt một câu SQL mỗi lần đăng nhập/tạo tài khoản.
- Lỗi cũ liên quan: `2026-10-29-pb02-username-normalization.md` → một hàm chung, không dùng `trim()`; `2026-10-28-pb02-session-revocation-races.md` → không dời advisory lock.
- Test viết trước:
  - [x] `test_ST3b_AC2_normalize_username_matches_postgres` — input: 8 giá trị ở AC-2; expected: bằng kết quả `lower(btrim(...))` của PostgreSQL.
  - [x] Test có sẵn ở AC-1 — expected: như AC-1.
  - [x] `cmd_ST3b_AC3_grep` — expected: như AC-3.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-4b: promotions — làm lại ST-4 theo quy tắc 2026-11-17
- depends_on: ST-4, ST-3b
- Interfaces:
  - Consumes: `PromotionCode` từ ST-1; `captureSql(t: TestContext): string[]`, `lockSequence(sql: readonly string[]): string[]` từ ST-2.
  - Produces: Không có
- Truy vấn (`POS_API/src/promotions/promotions.service.ts`, bảng quyết định):
  | Dòng hiện tại | Hàm | Hiện tại | Đã thử | Đích |
  |---|---|---|---|---|
  | `:89-92` | `list` (đếm) | QB `getCount()` trên builder chung | (1) đủ | `const base = { store_id: store, ...(query.isActive !== undefined ? { is_active: query.isActive === 'true' } : {}) }`; `const where = query.q !== undefined ? [{ ...base, code: ILike(\`%${query.q}%\`) }, { ...base, name: ILike(\`%${query.q}%\`) }] : base`; `const count = await this.db.getRepository(PromotionCode).count({ where })` |
  | `:93-96` | `list` (trang) | QB | (1)-(3) không đủ: cần `to_char(p.created_at ... .US)` và `(p.created_at, p.id) < (...)` | Giữ QB (builder chỉ dùng cho trang, cùng bộ lọc `p.store_id`, `p.is_active`, `(p.code ILIKE :q OR p.name ILIKE :q)`) + chú thích L2 |
  | `:107-112` | `create` | QB `insert().returning('*')` | (2)+(1) đủ | `const repo = this.db.getRepository(PromotionCode); const id = randomUUID(); await repo.insert({ id, store_id: store, ...các cột như cũ })` trong `try` giữ `catch` `23505` → `DUPLICATE_PROMOTION_CODE`; rồi `return this.view(await repo.findOneByOrFail({ id }))` |
  | `:123-124` | `patch` (khóa) | QB `setLock` một bảng | (1) đủ | `manager.getRepository(PromotionCode).findOne({ where: { id, store_id: store }, lock: { mode: 'pessimistic_write' } })` |
  | `:128-133` | `patch` (cập nhật) | QB update returning | (2) đủ | `manager.getRepository(PromotionCode).update({ id, store_id: store }, { code: x.code, name: x.name as string \| null, discount_type: x.kind, discount_value: x.discount.toString(), max_discount_amount: x.cap?.toString() ?? null, min_order_amount: x.minimum?.toString() ?? null, start_at: x.start, end_at: x.end, usage_limit: x.usage as number \| null, is_active: x.active, updated_at: () => 'now()' }, { returning: '*' })`; `this.view(result.raw[0])`; giữ `catch` `23505` |
- AC riêng:
  - [x] ST-4b.AC-1: Given mã giảm giá thuộc cửa hàng, When `patch` khi `captureSql` bật (test có sẵn `test_ST4_AC1_patch_lock_sequence`), Then `lockSequence` = `['UPDATE:promotion_codes']` (kiểm: integration).
  - [x] ST-4b.AC-2: Given test có sẵn `test_ST4_AC2_patch_returns_updated_row`, `test_ST4_AC3_promotions_cursor_keeps_microseconds`, `DUPLICATE_PROMOTION_CODE` (`inventory.integration.test.ts`) và test danh sách mã có lọc `q`/`isActive` có sẵn, When chạy sau sửa, Then xanh: PATCH trả object `code` = `SALE10`; cursor trang 1 `.000002Z`/trang 2 `.000001Z`/`total` 2; mã trùng 409 `Mã giảm giá đã tồn tại.`; tạo mã trả `createdAt`/`updatedAt` ISO và `usedCount` 0 (kiểm: integration).
  - [x] ST-4b.AC-3: Given test mới `test_ST4b_AC3_total_matches_filters`: cửa hàng có 3 mã (`SALE10` active, tên `Giảm 10`; `VIP20` inactive, tên `Khách VIP`; `TET` active, tên `null`), When `GET /api/v1/promotion-codes?q=vip` và `?isActive=true` và `?q=sale&isActive=false`, Then `meta.total` lần lượt `1`, `2`, `0` và bằng số phần tử khi `limit=100` (kiểm: integration; endpoint `@Controller('api/v1/promotion-codes')`, `promotions/promotions.controller.ts:7`).
  - [x] ST-4b.AC-4: Given sau sửa, When grep trong file: `setLock(` 0; `createQueryBuilder(` 1; `// QueryBuilder:` 1 (câu L2); `.query(` 0; rồi chạy `dist/inventory/tests/inventory.integration.test.js`, `dist/promotions/tests/promotion.test.js` và `npm test`, Then exit 0, `# fail 0` (kiểm: grep + lệnh).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/promotions/promotions.service.ts` (import thêm `ILike` từ `typeorm`); test mới `test_ST4b_AC3_total_matches_filters` trong `POS_API/src/inventory/tests/inventory.integration.test.ts` (file đang chứa test `/promotions`).
  - Chữ ký hàm/class: không đổi. DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết AC-3, chạy trên mã hiện tại (xanh — characterization), lưu `evidence/ST-4b/before.log`.
    2. Đổi 4 lời gọi theo bảng; thêm 1 chú thích.
    3. Chạy AC-1..AC-3, module, `npm test`; lưu `after.log`, `suite.log`; grep AC-4.
  - Quy tắc nghiệp vụ: cursor `(created_at,id)` giảm dần; mã đã dùng chỉ đổi tên/trạng thái (`promotions.service.ts:47-49`).
  - Bảng edge case:
    - `q` chứa `%` → `ILike('%' + q + '%')` không escape, như SQL cũ.
    - `name` `null` với `ILike` → không khớp, như `NULL ILIKE` cũ.
    - `findOneByOrFail` sau `insert` cùng kết nối `this.db` (ngoài transaction như code cũ) → đọc được dòng vừa chèn (autocommit).
  - Ảnh hưởng tới code hiện có: Không có. Tác dụng phụ: tạo mã thêm một câu SELECT.
- Lỗi cũ liên quan: `2026-11-07-sprint07-update-returning.md` (M-21) → `result.raw[0]`.
- Test viết trước:
  - [x] `test_ST4b_AC3_total_matches_filters` — input/expected: như AC-3.
  - [x] `test_ST4_AC1_patch_lock_sequence`, `test_ST4_AC2_patch_returns_updated_row`, `test_ST4_AC3_promotions_cursor_keeps_microseconds` (có sẵn) — expected: như AC-1, AC-2.
- Tiến độ:
  - [x] Red (không áp dụng, G-16; AC-3 là characterization)  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-5b: store-bank-account — làm lại ST-5 theo quy tắc 2026-11-17
- depends_on: ST-5, ST-4b
- Interfaces:
  - Consumes: `StoreBankAccount`, `TransferAttempt` từ ST-1; `Store` có sẵn (`platform/entities/store.entity.ts`); `captureSql`, `lockSequence` từ ST-2.
  - Produces: Không có
- Truy vấn (`POS_API/src/sales/store-bank-account.service.ts`, bảng quyết định):
  | Dòng hiện tại | Hàm | Hiện tại | Đã thử | Đích |
  |---|---|---|---|---|
  | `:16` | `get` | repo `findOne` | (1) đủ | Giữ |
  | `:23` | `update` (khóa cửa hàng) | QB `setLock` một bảng | (1) đủ | `manager.getRepository(Store).findOne({ where: { id: user.storeId! }, select: { id: true }, lock: { mode: 'pessimistic_write' } })` — SQL `SELECT "Store"."id" AS "Store_id" FROM "stores" "Store" WHERE (("Store"."id" = $1)) LIMIT 1 FOR UPDATE` |
  | `:24` | `update` (QR chờ) | repo `existsBy` | (1) đủ | Giữ |
  | `:26` | `update` (upsert) | QB `orUpdate` | (2) đủ | `manager.getRepository(StoreBankAccount).upsert({ store_id: user.storeId!, bank_bin: input.bankBin, account_number: input.accountNumber, account_name: input.accountName, updated_at: () => 'now()' }, ['store_id'])` |
- AC riêng:
  - [x] ST-5b.AC-1: Given OWNER cửa hàng, When `update` khi `captureSql` bật (test có sẵn `test_ST5_AC1_update_lock_sequence`), Then `lockSequence` = `['UPDATE:stores']` (kiểm: integration).
  - [x] ST-5b.AC-2: Given test có sẵn `test_ST5_AC2_upsert_updates_updated_at` và ca `TRANSFER_PENDING` (test đã dùng ở ST-5.AC-3), When chạy sau sửa, Then xanh: lần 2 `get` trả tên mới, `updated_at` tăng; QR chờ → 409 `TRANSFER_PENDING` `Cửa hàng còn mã QR đang chờ thanh toán.` (kiểm: integration).
  - [x] ST-5b.AC-3: Given user duyệt G-16 và `:23` đã đổi sang `findOne({ lock })`, When chạy focused test cha `ST-5.AC-1/2 bank account and QR attempts use live HTTP and isolated PostgreSQL` với literal cũ `waiting('FROM "stores" "s"')`, Then subtest `test_ST5_account_permission_race` RED đúng assertion `bank change must wait for QR store lock` (`false !== true`); When chỉ đổi literal thành `waiting('FROM "stores" "Store"')`, Then race xanh, hai assertion chờ `true`, QR 201, PATCH 409 `TRANSFER_PENDING`, QR và DB giữ tên tài khoản cũ, hủy QR 204; helper/Lock/timeout 10000 ms/poll 20 ms/assertion/thứ tự request giữ nguyên (kiểm: focused RED/GREEN + diff; nguồn `payment.integration.test.ts:1105-1143`).
  - [x] ST-5b.AC-4: Given sau sửa, When grep trong file service: `setLock(` 0, `createQueryBuilder(` 0, `// QueryBuilder:` 0, `.query(` 0; chạy `dist/sales/tests/payment.integration.test.js` rồi `npm test`, Then exit 0, `# fail 0` (kiểm: grep + lệnh).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/sales/store-bank-account.service.ts`. Ngoại lệ test cũ (chờ duyệt G-16): chỉ literal dòng 1129 của `POS_API/src/sales/tests/payment.integration.test.ts`.
  - Chữ ký hàm/class: không đổi. DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Chạy focused test cha ở AC-3 và AC-1/AC-2 trên mã hiện tại (xanh), lưu `evidence/ST-5b/before.log`.
    2. Đổi `:23`, `:26` theo bảng.
    3. `npm run build`, chạy `node --env-file-if-exists=.env --test --test-concurrency=1 --test-name-pattern="ST-5.AC-1/2 bank account and QR attempts use live HTTP and isolated PostgreSQL" dist/sales/tests/payment.integration.test.js` trong `POS_API/`, lưu `evidence/ST-5b/race-red.log`; xác nhận subtest race thật sự chạy và đỏ đúng `bank change must wait for QR store lock`. Đỏ vì lý do khác → DỪNG, báo agent chính.
    4. Chỉ sau RED đúng và user đã duyệt G-16: đổi literal dòng 1129; chạy lại đúng lệnh bước 3, lưu `race-green.log`.
    5. Chạy file test module rồi `npm test`, lưu `module.log`, `suite.log`; grep AC-4. Agent chính kiểm diff E2E-AC-6.
  - Quy tắc nghiệp vụ: không đổi tài khoản khi còn QR chờ; khóa cửa hàng trước khi kiểm QR (thứ tự cũ).
  - Bảng edge case:
    - SQL upsert thêm `"store_id" = EXCLUDED."store_id"` (cùng giá trị) — CHƯA xác minh ảnh hưởng khóa trên PostgreSQL; tdd kiểm bằng race AC-3 và AC-2.
  - Ảnh hưởng tới code hiện có: literal race (sau duyệt). Tác dụng phụ: Không có.
- Lỗi cũ liên quan: M-14; M-32 (`--test-name-pattern` theo test cha).
- Test viết trước: Không có test mới (G-16); dùng test có sẵn:
  - [x] `test_ST5_AC1_update_lock_sequence` (có sẵn) — expected: `['UPDATE:stores']`.
  - [x] `test_ST5_AC2_upsert_updates_updated_at` (có sẵn) — expected: giá trị mới, `updated_at` tăng.
  - [x] `test_ST5_account_permission_race` (có sẵn, chỉ literal sau duyệt) — expected: RED/GREEN như AC-3.
- Tiến độ:
  - [x] Red (race literal)  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-6b: reports — làm lại ST-6 theo quy tắc 2026-11-17
- depends_on: ST-6, ST-5b
- Interfaces:
  - Consumes: `WorkShift` có sẵn (relation `branch` ở `work-shift.entity.ts:42-44`).
  - Produces: Không có
- Truy vấn (`POS_API/src/reports/reports.service.ts`, bảng quyết định):
  | Dòng hiện tại | Hàm | Hiện tại | Đã thử | Đích |
  |---|---|---|---|---|
  | `:68` | `getRevenue` | repo `existsBy` | (1) đủ | Giữ |
  | `:75-79` | `getRevenue` (ca) | QB `innerJoin(Branch)` | (1) đủ qua relation `WorkShift.branch` | `const shift = await this.db.getRepository(WorkShift).findOne({ where: { id: query.shiftId, branch: { store_id: storeId }, ...(branchId !== null ? { branch_id: branchId } : {}) }, select: { id: true, user_id: true } })`; `if (!shift) throw notFound()`; `shift.user_id` như cũ |
  | `:84-120` | `getRevenue` (doanh thu) | QB CTE | (1)-(3) không đủ: tách nhiều `find` phá "One statement = one snapshot" và phải tải dòng hóa đơn lên ứng dụng | Giữ QB + chú thích L3 ngay dưới chú thích sẵn có `:84` |
- AC riêng:
  - [x] ST-6b.AC-1: Given MANAGER chi nhánh A và `shiftId` của ca chi nhánh B cùng cửa hàng (test có sẵn `[B-54]`), ca của cửa hàng khác, ca không tồn tại, When gọi báo cáo, Then 404 `NOT_FOUND` như trước; ca hợp lệ → 200; `level === 'shift'` với ca của người khác → 403 (test có sẵn `test_ST2_AC4_own_open_closed_shift`) (kiểm: integration).
  - [x] ST-6b.AC-2: Given sau sửa, When grep trong `reports.service.ts`: `createQueryBuilder(` chỉ còn trong câu lệnh doanh thu; `// QueryBuilder:` 1 (câu L3); `.query(` 0; chạy `node --env-file-if-exists=.env --test --test-concurrency=1 dist/reports/tests/reports.integration.test.js dist/reports/tests/reports.test.js dist/reports/tests/reports-permissions.integration.test.js` rồi `npm test`, Then exit 0, `# fail 0` (gồm `test_ST6_AC5_revenue_single_statement`, hai test AC-7) (kiểm: grep + lệnh).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/reports/reports.service.ts`. Không sửa test.
  - Chữ ký hàm/class, DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Chạy module reports trên mã hiện tại, lưu `evidence/ST-6b/before.log`.
    2. Đổi `:75-79`; thêm chú thích L3.
    3. Chạy lại module rồi `npm test`, lưu `after.log`, `suite.log`; grep AC-2.
  - Quy tắc nghiệp vụ: phạm vi lấy từ danh tính; `branchId` khác `null` thì ca phải thuộc chi nhánh đó (`reports.service.ts:74-79` cũ); một statement = một snapshot cho phần doanh thu.
  - Bảng edge case:
    - `branchId === null` (OWNER không lọc chi nhánh) → không thêm `branch_id` vào `where` (không truyền `null`, quy định chung).
    - `findOne` có `where` trên relation chạy hai câu (DISTINCT rồi câu chính) → không ảnh hưởng `test_ST6_AC5_revenue_single_statement` (đếm câu có `FROM "invoices"`/`scoped`).
  - Ảnh hưởng tới code hiện có: Không có. Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `20261114-reports-cross-branch-shift-and-payment-paid-at-untested.md` → giữ điều kiện chi nhánh của ca; test B-54 xanh.
- Test viết trước: Không có test mới (G-16); dùng test có sẵn ở AC-1/AC-2.
- Tiến độ:
  - [x] Red (không áp dụng, G-16)  - [x] Green  - [x] Refactor  - [x] Test module xanh
### ST-7: shifts
- depends_on: ST-1, ST-2, ST-6b (thứ tự: hoàn tất làm lại ST-3b..ST-6b trước khi viết mã mới)
- Interfaces:
  - Consumes: `ShiftExpense`, `Payment` từ ST-1; `captureSql`, `lockSequence` từ ST-2.
  - Produces: Không có
- Truy vấn (`POS_API/src/shifts/shifts.service.ts`, 8; bản 2 theo quy tắc 2026-11-17: cột "Đã thử" ghi bước (1)/(2)/(3) dùng được, hoặc vì sao (1)-(3) không đủ với câu QB):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 81 | `cashSales` | (1)-(3) không đủ: tổng tiền `SUM` (L1) | QB + chú thích L1: `manager.getRepository(Payment).createQueryBuilder('p').innerJoin(Invoice, 'i', 'i.id = p.invoice_id').select('COALESCE(SUM(p.amount), 0)::text', 'total').where("i.work_shift_id = :shiftId AND i.status = 'PAID' AND p.method = 'CASH'", { shiftId }).getRawOne()`; `BigInt(row.total)` |
  | 88 | `drawerExpenses` | (1)-(3) không đủ: `SUM` (L1) | QB + chú thích L1: `manager.getRepository(ShiftExpense).createQueryBuilder('e').select('COALESCE(SUM(e.amount), 0)::text', 'total').where('e.work_shift_id = :shiftId AND e.paid_from_drawer = true', { shiftId }).getRawOne()` |
  | 94 | `assertNoOpenInvoices` | (1) | `manager.getRepository(Invoice).find({ where: { work_shift_id: shiftId, status: 'OPEN' }, select: { id: true, invoice_code: true }, order: { created_at: 'ASC', id: 'ASC' } })` |
  | 446 | `addExpense` (khóa ca, lọc cửa hàng qua chi nhánh) | (1) qua relation `WorkShift.branch` | `(await manager.getRepository(WorkShift).find({ where: { id: shiftId, branch: { store_id: storeId } }, select: { id: true, branch_id: true, user_id: true, shift_type: true, status: true }, lock: { mode: 'pessimistic_write', tables: ['work_shifts'] } }))[0] ?? null` — SQL `... LEFT JOIN "branches" ... FOR UPDATE OF "WorkShift"` (đã dựng), token `UPDATE:work_shifts` |
  | 460 | `addExpense` | (1) | `manager.getRepository(CashReconciliation).findOne({ where: { work_shift_id: shift.id }, select: { id: true, opening_cash: true } })`; `BigInt(rec.opening_cash)` |
  | 467 | `addExpense` (insert, cần `created_at`) | (2)+(1) | `await manager.getRepository(ShiftExpense).insert({ id, work_shift_id, amount, reason, paid_from_drawer, created_by })` rồi `expenseView(await manager.getRepository(ShiftExpense).findOneByOrFail({ id }))` |
  | 495 | `listExpenses` (trang) | (1)-(3) không đủ: cursor micro giây (L2) | QB + chú thích L2: `ShiftExpense` alias `e`, `addSelect(to_char(... e.created_at ...), 'cursor_created_at')`, cursor `andWhere('(e.created_at, e.id) < (CAST(:createdAt AS timestamptz), CAST(:id AS uuid))')` khi có `after`, `orderBy e.created_at DESC, e.id DESC`, `limit(limit + 1)`, `getRawAndEntities()`; `expenseView(entity)`, cursor từ `raw[i].cursor_created_at` |
  | 500 | `listExpenses` (đếm) | (1) | `this.db.getRepository(ShiftExpense).countBy({ work_shift_id: shift.id })` |
- AC riêng:
  - [x] ST-7.AC-1: Given ca thu ngân mở của user, When `addExpense` khi `captureSql` bật, Then `lockSequence` = `['UPDATE:work_shifts']` trước và sau khi chuyển (kiểm: integration).
  - [x] ST-7.AC-2: Given ca có một payment `CASH` 50000 của hóa đơn `PAID` và một payment `TRANSFER` 70000 của hóa đơn `PAID`, `opening_cash` 100000, When `addExpense` `amount` 150001 `paidFromDrawer` true, Then 422 `EXPENSE_EXCEEDS_DRAWER` message `Số tiền chi vượt quá tiền mặt hiện có trong két.`; với `amount` 150000 thì 201 (test có sẵn `shift-expenses.integration.test.ts`/`cancel-paid.integration.test.ts` `[B-45]`; nếu chưa có ca TRANSFER bị loại thì thêm) (kiểm: integration).
  - [x] ST-7.AC-3: Given hai chi phí cùng ca có `created_at` `...01:00:00.000001Z` và `...01:00:00.000002Z`, When `listExpenses` `limit=1` rồi trang 2, Then trang 1 là bản `.000002Z`, trang 2 là bản `.000001Z`, `total` = 2 (kiểm: integration).
  - [x] ST-7.AC-4: Given ca còn hóa đơn `OPEN`, When đóng ca, Then 409 `SHIFT_HAS_OPEN_INVOICES` với `details` theo thứ tự `created_at,id` (test có sẵn `shifts.integration.test.ts`) (kiểm: integration).
  - [x] ST-7.AC-5: Given sau sửa, When grep `.query(` trong file, Then 0; `grep -c "// QueryBuilder:" shifts/shifts.service.ts` = 3 (L1 `cashSales`, L1 `drawerExpenses`, L2 `listExpenses`); không có dòng `setLock(` mới so với `master`; `npm test` exit 0, `# fail 0` (kiểm: grep + lệnh).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/shifts/shifts.service.ts` (8 truy vấn: 3 QB kèm 3 dòng chú thích, 5 method theo cột "Đích"; import `ShiftExpense`, `Payment`, `Invoice`, `Branch`); test mới thêm vào `POS_API/src/shifts/tests/shift-expenses.integration.test.ts`.
  - Chữ ký hàm/class: không đổi (`cashSales(manager, shiftId): Promise<bigint>`, `drawerExpenses(manager, shiftId): Promise<bigint>`, `assertNoOpenInvoices(manager, shiftId): Promise<void>`).
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1, AC-3 (và AC-2 nếu thiếu ca TRANSFER); chạy trên mã cũ.
    2. Chuyển 8 truy vấn; `expenseView` nhận entity (khóa snake_case giống raw).
    3. Chạy lại test module, rồi `npm test`.
  - Quy tắc nghiệp vụ: `EXPENSE_EXCEEDS_DRAWER` khi `opening_cash + cashSales − drawerExpenses − amount < 0` (`shifts.service.ts:462-464`).
  - Bảng edge case: ca không phải `CASHIER` → 409 `CONFLICT` `Ca này không có két` trước khi đọc đối soát (giữ thứ tự `shifts.service.ts:449-456`); ca không thuộc chi nhánh user không có `branch.access_all` → 404 `SHIFT_NOT_FOUND`.
  - Ảnh hưởng tới code hiện có: `cashSales`, `drawerExpenses` còn được dùng ở đóng ca trong cùng file — chữ ký giữ nguyên.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `20261113-sprint09-test-gaps-money-and-concurrency.md` → test có dữ liệu "gần đúng" (TRANSFER `PAID`) bị loại; `20261113-payment-test-seed-db-clock-flaky.md` → seed `started_at` lùi `now() - interval '1 minute'`.
- Test viết trước:
  - [x] `test_ST7_AC1_add_expense_lock_sequence` — input: ghi chi; expected: `['UPDATE:work_shifts']`.
  - [x] `test_ST7_AC2_transfer_not_counted_as_cash` (chỉ khi chưa có) — input: như AC-2; expected: 422 với 150001, 201 với 150000.
  - [x] `test_ST7_AC3_expenses_cursor_keeps_microseconds` — input/expected: như AC-3.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-8: inventory phần A (phạm vi, nguyên liệu, công thức)
- depends_on: ST-1, ST-2
- Interfaces:
  - Consumes: `Ingredient`, `ProductSizeIngredient`, `ToppingIngredient`, `BranchIngredientStock`, `StockMovement` từ ST-1; `captureSql`, `lockSequence` từ ST-2.
  - Produces: Không có
- Truy vấn (`POS_API/src/inventory/inventory.service.ts`, 15; bản 2 theo quy tắc 2026-11-17):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 41 | `checkScope` | (1) | `this.db.getRepository(Branch).existsBy({ id: branch, store_id: store })` |
  | 45 | `checkScope` | (1) | `this.db.getRepository(Ingredient).existsBy({ id: ingredient as string, store_id: store })` |
  | 88 | `listIngredients` (đếm) | (1) | `this.db.getRepository(Ingredient).count({ where: { store_id: store, ...(isActive !== undefined ? { is_active: isActive } : {}), ...(q !== undefined ? { name: ILike(\`%${q}%\`) } : {}) } })` (giá trị lọc như SQL cũ dòng 84-88) |
  | 91 | `listIngredients` (trang) | (1)-(3) không đủ: `ORDER BY lower(i.name)` và cursor `(lower(i.name), i.id) > (...)` (L2) | QB + chú thích L2: `Ingredient` alias `i`, cùng lọc như đếm, `andWhere('(lower(i.name), i.id) > (:key, CAST(:id AS uuid))')` khi có cursor, `orderBy('lower(i.name)').addOrderBy('i.id')`, `limit(page.limit + 1)`, `getMany()` |
  | 101 | `createIngredient` (cần `created_at`) | (2)+(1) | `insert({ id, store_id, name, unit })` trong `try` giữ `catch 23505` → `DUPLICATE_INGREDIENT_NAME`; rồi `ingredientView(await repo.findOneByOrFail({ id }))` |
  | 114 | `patchIngredient` (khóa) | (1) | `manager.getRepository(Ingredient).findOne({ where: { id, store_id: store }, lock: { mode: 'pessimistic_write' } })`; `null` → 404 `Không tìm thấy nguyên liệu.` |
  | 121 | `patchIngredient` (đang dùng) | (1) | 4 lời gọi `existsBy` tuần tự trên `ProductSizeIngredient`, `ToppingIngredient`, `BranchIngredientStock`, `StockMovement` với `{ ingredient_id: id }`, dừng ở lời gọi đầu trả `true` (G-8) |
  | 129 | `patchIngredient` (cập nhật) | (2) | `manager.getRepository(Ingredient).update({ id, store_id: store }, { name, unit, is_active: active, updated_at: () => 'now()' }, { returning: '*' })`, `ingredientView(result.raw[0])`; giữ `catch 23505` |
  | 141 | `parent` (product, khóa, lọc cửa hàng qua 2 bảng) | (1) qua relation `ProductSize.product.category` | `(await manager.getRepository(ProductSize).find({ where: { id, product: { category: { store_id: store } } }, select: { id: true }, lock: { mode: 'pessimistic_write', tables: ['product_sizes'] } }))[0]` — SQL `... LEFT JOIN "products" ... LEFT JOIN "categories" ... FOR UPDATE OF "ProductSize"` (đã dựng); không có → 404 `Không tìm thấy món hoặc topping.` |
  | 143 | `parent` (topping, khóa) | (1) | `manager.getRepository(Topping).findOne({ where: { id, store_id: store }, select: { id: true }, lock: { mode: 'pessimistic_write' } })` |
  | 153 | `recipeRows` | (1) không đủ: `order` của find không nhận `lower(i.name)`; (3) hai `find` rồi sắp trong JavaScript đổi thứ tự (collation PostgreSQL khác so sánh JavaScript) (L2) | QB + chú thích L2: entity theo `kind` alias `r`, `innerJoin(Ingredient, 'i', 'i.id = r.ingredient_id')`, select `ingredient_id`, `quantity`, `name`, `unit`, `is_active`, `where('r.<khóa> = :id')`, `orderBy('lower(i.name)').addOrderBy('i.id')`, `getRawMany()` |
  | 180 | `putRecipe` (cũ) | (1) | `manager.getRepository(<entity theo kind>).find({ where: { <khóa>: id }, select: { <khóa>: true, ingredient_id: true, quantity: true } })` |
  | 182 | `putRecipe` (khóa nguyên liệu) | (1) | `manager.getRepository(Ingredient).findOne({ where: { id: item.id, store_id: store }, select: { id: true, is_active: true }, lock: { mode: 'pessimistic_write' } })` trong vòng lặp đã sắp `localeCompare` như cũ |
  | 188 | `putRecipe` (xóa) | (2) | `manager.getRepository(<entity theo kind>).delete({ <khóa>: id })` |
  | 189 | `putRecipe` (thêm) | (2) | `manager.getRepository(<entity theo kind>).insert({ <khóa>: id, ingredient_id: item.id, quantity: item.quantity })` trong vòng lặp theo thứ tự `ingredients` như cũ |
  - Hàm `recipeTable(kind)` (`inventory.service.ts:147-149`) đổi giá trị trả về thành `{ entity: ProductSizeIngredient, key: 'product_size_id' }` / `{ entity: ToppingIngredient, key: 'topping_id' }`; không thêm hàm mới.
- AC riêng:
  - [x] ST-8.AC-1: Given nguyên liệu thuộc cửa hàng, When `patchIngredient`, Then `lockSequence` = `['UPDATE:ingredients']`; When `putRecipe('product', ...)` với 2 nguyên liệu, Then `['UPDATE:product_sizes', 'UPDATE:ingredients', 'UPDATE:ingredients']`; When `getRecipe('topping', ...)`, Then `['UPDATE:toppings']` — trước và sau khi chuyển (kỳ vọng suy từ dòng 114, 141-143, 182; tdd xác nhận trên mã cũ) (kiểm: integration).
  - [x] ST-8.AC-2: Given nguyên liệu đã có trong công thức, When `PATCH` đổi `unit`, Then 409 `RESOURCE_IN_USE` message `Đơn vị gốc đã được dùng, không thể thay đổi.` (test có sẵn `inventory.integration.test.ts`); Given nguyên liệu chỉ có dòng `stock_movements`, When đổi `unit`, Then cũng 409 (thêm test nếu chưa có) (kiểm: integration).
  - [x] ST-8.AC-3: Given nguyên liệu `Sữa` `ml`, When `PATCH` `{ "isActive": false }`, Then response là object có `isActive` = `false`, `createdAt`/`updatedAt` là chuỗi ISO hợp lệ (test có sẵn theo lỗi `2026-11-07`) (kiểm: integration).
  - [x] ST-8.AC-4: Given sau sửa, When chạy test module inventory và `npm test`, Then exit 0, `# fail 0`; `grep -c "// QueryBuilder:" inventory/inventory.service.ts` = 2 (L2 trang `listIngredients`, L2 `recipeRows`); không có dòng `setLock(` mới (kiểm: lệnh + grep).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/inventory/inventory.service.ts` (15 truy vấn: 2 QB có chú thích, 13 method theo cột "Đích"; import `ILike`; import entity), test mới thêm vào `POS_API/src/inventory/tests/inventory.integration.test.ts`.
  - Chữ ký hàm/class: không đổi chữ ký public; `recipeTable(kind)` đổi kiểu trả về nội bộ như trên.
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1 và ca `stock_movements` của AC-2 nếu thiếu; chạy trên mã cũ, ghi mảng khóa thực tế.
    2. Chuyển 15 truy vấn.
    3. Chạy lại; `npm test`.
  - Quy tắc nghiệp vụ: `RESOURCE_IN_USE` khi nguyên liệu có trong công thức món, công thức topping, tồn chi nhánh hoặc sổ kho (`inventory.service.ts:121-126`); `INGREDIENT_INACTIVE` khi thêm/sửa lượng nguyên liệu đã ngưng (`:185-186`).
  - Bảng edge case:
    - `quantity` numeric so bằng `Number(prior.quantity) !== Number(item.quantity)` như cũ (entity trả chuỗi như raw).
    - Công thức rỗng `ingredients: []` → xóa hết, trả mảng rỗng.
    - `kind` topping không thuộc cửa hàng → 404 `Không tìm thấy món hoặc topping.`
  - Ảnh hưởng tới code hiện có: `recipeRows` được `getRecipe`/`putRecipe` gọi; trả cùng mảng `{ ingredientId, ingredientName, unit, quantity }`.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `2026-11-07-sprint07-update-returning.md` → `result.raw[0]`; M-14 → khóa `parent` trước, khóa từng nguyên liệu sau, đọc lại công thức ở statement sau.
- Test viết trước:
  - [x] `test_ST8_AC1_inventory_lock_sequences` — input: ba thao tác như AC-1; expected: ba mảng như AC-1.
  - [x] `test_ST8_AC2_unit_change_blocked_by_movement` (chỉ khi chưa có) — input: nguyên liệu chỉ có `stock_movements`; expected: 409 `RESOURCE_IN_USE`.
  - [x] `test_ST8_AC3_patch_ingredient_returns_row` (chỉ khi test có sẵn không khẳng định object + ISO) — input/expected: như AC-3.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-9: inventory phần B (tồn kho, ngưỡng tồn, sổ kho)
- depends_on: ST-8
- Interfaces:
  - Consumes: `Ingredient`, `BranchIngredientStock`, `StockMovement` từ ST-1; `captureSql`, `lockSequence` từ ST-2.
  - Produces: Không có
- Truy vấn (`POS_API/src/inventory/inventory.service.ts`, 6; bản 2 theo quy tắc 2026-11-17):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 205 | `listStocks` (đếm) | (3) hai `count` | `count = (await this.db.getRepository(Branch).count({ where: { store_id: store, ...(branch ? { id: branch } : {}) } })) * (await this.db.getRepository(Ingredient).count({ where: { store_id: store, ...(query.ingredientId ? { id: query.ingredientId } : {}) } }))` — tương đương `count(*)` của `branches CROSS JOIN ingredients` với hai điều kiện `store_id` (tích hai tập đã lọc) |
  | 208 | `listStocks` (trang) | (1)-(3) không đủ: tích chi nhánh × nguyên liệu kèm `LEFT JOIN` tồn và cursor `(b.id::text, i.id) >` theo trang; nhiều `find` phải tải mọi cặp lên ứng dụng (L6) | QB + chú thích L6: `this.db.getRepository(Branch).createQueryBuilder('b').innerJoin(Ingredient, 'i', 'i.store_id = b.store_id')` (G-7), `leftJoin(BranchIngredientStock, 's', 's.branch_id = b.id AND s.ingredient_id = i.id')`, `where('b.store_id = :store')`, `andWhere('b.id = :branch')`/`andWhere('i.id = :ingredientId')` khi có, select alias `id` (`i.id`), `branch_id`, `ingredient_id`, `ingredient_name`, `unit`, `COALESCE(s.current_stock,0)` → `current_stock`, `COALESCE(s.min_stock,0)` → `min_stock`; cursor `andWhere('(b.id::text, i.id) > (:key, CAST(:id AS uuid))')`; `orderBy('b.id').addOrderBy('i.id').limit(page.limit + 1)`; `getRawMany()` |
  | 222 | `setMin` (khóa `OF b,i`) | (1) không khóa được bảng thứ hai (phía LEFT JOIN, M-20); (3) hai `findOne({ lock })` | `const b = await manager.getRepository(Branch).findOne({ where: { id: branch, store_id: store }, select: { id: true }, lock: { mode: 'pessimistic_write' } })`; rồi `const i = await manager.getRepository(Ingredient).findOne({ where: { id: ingredientId, store_id: store }, select: { id: true, name: true, unit: true }, lock: { mode: 'pessimistic_write' } })`; một trong hai `null` → 404 `Không tìm thấy chi nhánh hoặc nguyên liệu.`; token đổi `UPDATE:branches,ingredients` → `UPDATE:branches`, `UPDATE:ingredients` (G-17) |
  | 226 | `setMin` (upsert) | (2) | `manager.getRepository(BranchIngredientStock).upsert({ branch_id: branch, ingredient_id: ingredientId, min_stock: min, updated_at: () => 'now()' }, { conflictPaths: ['branch_id', 'ingredient_id'], returning: ['current_stock', 'min_stock'] })`, đọc `result.raw[0]`; không truyền `current_stock` (dòng mới lấy DEFAULT 0 như SQL cũ). Dạng `result.raw` khi chạy thật CHƯA xác minh — ST-9.AC-5 khẳng định |
  | 249 | `listMovements` (đếm) | (3) | `branchIds = branch ? [branch] : (await this.db.getRepository(Branch).find({ where: { store_id: store }, select: { id: true } })).map(b => b.id)`; `count = await this.db.getRepository(StockMovement).count({ where: { branch_id: In(branchIds), ...(query.ingredientId ? { ingredient_id: query.ingredientId } : {}), ...(query.type ? { type: query.type } : {}) } })` — `In([])` sinh `0=1` (`QueryBuilder.js:755-757`) |
  | 252 | `listMovements` (trang) | (1)-(3) không đủ: cursor micro giây `to_char ... .US` (L2) | QB + chú thích L2: `StockMovement` `m` `innerJoin(Branch, 'b', 'b.id = m.branch_id').innerJoin(Ingredient, 'i', 'i.id = m.ingredient_id').leftJoin(Invoice, 'inv', 'inv.id = m.invoice_id AND inv.branch_id = m.branch_id')`, điều kiện như SQL cũ dòng 243-249; select alias `id`, `branch_id`, `ingredient_id`, `type`, `quantity`, `balance_after`, `invoice_id`, `note`, `created_at`, `cursor_time`, `branch_name`, `invoice_code`, `ingredient_name`, `unit`; cursor `(m.created_at, m.id) < (CAST(:key AS timestamptz), CAST(:id AS uuid))`; `orderBy m.created_at DESC, m.id DESC`, `limit`; `getRawMany()` |
- AC riêng:
  - [x] ST-9.AC-1: Given MANAGER chi nhánh A, When `setMin` khi `captureSql` bật, Then `lockSequence` trên mã cũ = `['UPDATE:branches,ingredients']`; sau chuyển = `['UPDATE:branches', 'UPDATE:ingredients']` (G-17) (kiểm: integration).
  - [x] ST-9.AC-2: Given cửa hàng có 2 chi nhánh, 2 nguyên liệu, chỉ 1 dòng `branch_ingredient_stocks` (chi nhánh A × nguyên liệu X, `current_stock` `5.000`, `min_stock` `1.000`), When `GET /stocks` không lọc `limit=100`, Then `total` = 4, `data` có 4 dòng theo thứ tự `branch_id, ingredient_id`, dòng có stock trả `currentStock` `5.000`, `minStock` `1.000`, ba dòng còn lại trả `currentStock`/`minStock` đúng chuỗi mà SQL cũ trả (ghi nhận khi chạy trên mã cũ) (kiểm: integration).
  - [x] ST-9.AC-3: Given `setMin` lần đầu cho cặp chưa có dòng stock, When `minStock` `2.500`, Then response `currentStock` `0.000`, `minStock` `2.500`; lần 2 `minStock` `3.000` → `minStock` `3.000`, `currentStock` không đổi (kiểm: integration; test có sẵn nếu khẳng định cùng giá trị, thiếu thì thêm).
  - [x] ST-9.AC-4: Given test sổ kho có sẵn (`inventory.integration.test.ts:52` "BR-44 microsecond cursor cannot skip neighboring movement", `stock-movements.http.test.ts`), When `npm test`, Then xanh; grep `.query(` trong `inventory.service.ts` = 0; `grep -c "// QueryBuilder:" inventory/inventory.service.ts` = 4; không có dòng `setLock(` mới (kiểm: lệnh + grep).
  - [x] ST-9.AC-5 (mới 2026-11-17): Given `setMin` dùng `upsert(..., { returning })`, When chạy test AC-3 (bắt buộc có khẳng định giá trị trả về, viết mới nếu test có sẵn không khẳng định), Then response lần 1 `currentStock` `0.000`, `minStock` `2.500`; lần 2 `minStock` `3.000`, `currentStock` không đổi — chứng minh `result.raw[0]` là dòng RETURNING như SQL cũ (kiểm: integration).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/inventory/inventory.service.ts` (6 truy vấn: 2 QB có chú thích (trang `listStocks` L6, trang `listMovements` L2), 4 method; import `In`); test mới thêm vào `POS_API/src/inventory/tests/inventory.integration.test.ts`.
  - Chữ ký hàm/class: không đổi.
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1, AC-2 (và AC-3 nếu thiếu); chạy trên mã cũ, ghi giá trị chuỗi thực tế của các dòng không có stock.
    2. Chuyển 6 truy vấn.
    3. Chạy lại; `npm test`.
  - Quy tắc nghiệp vụ: người có `branchId` chỉ xem chi nhánh mình (`inventory.service.ts:29-37`), cursor sổ kho micro giây (BR-44 theo tên test có sẵn).
  - Bảng edge case:
    - Lọc `ingredientId` của cửa hàng khác → 404 từ `checkScope` trước khi truy vấn (giữ thứ tự `:198`, `:239`).
    - Hóa đơn của chi nhánh khác gắn `invoice_id` trong sổ kho → `invoiceCode` `null` (điều kiện `inv.branch_id = m.branch_id`).
  - Ảnh hưởng tới code hiện có: Không có.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: M-20 → không khóa nullable side; `setMin` chỉ dùng `innerJoin`.
- Test viết trước:
  - [x] `test_ST9_AC1_set_min_lock_sequence` — input: `setMin`; expected: mã cũ `['UPDATE:branches,ingredients']`, sau chuyển `['UPDATE:branches', 'UPDATE:ingredients']`.
  - [x] `test_ST9_AC2_stocks_include_missing_stock_rows` — input: như AC-2; expected: như AC-2.
  - [x] `test_ST9_AC3_set_min_upsert_values` (bắt buộc khi test có sẵn không khẳng định `currentStock`/`minStock` trả về; dùng cho cả AC-5) — input/expected: như AC-3/AC-5.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-10: transfer-attempts
- depends_on: ST-1, ST-2, ST-5 (race cũ phải hoàn thành ST-5.AC-5 trước phần kiểm ST-10.AC-8)
- Interfaces:
  - Consumes: `TransferAttempt`, `Payment`, `StoreBankAccount`, `PromotionCode`, `InvoicePromotionCode`, `BankTransferEvent` từ ST-1; `captureSql`, `lockSequence` từ ST-2. Dùng `SalesService.evaluateInvoicePricing(manager: EntityManager, invoiceId: string): Promise<InvoicePricing>` và `SalesService.finalizeInvoice(manager: EntityManager, invoiceId: string, actorId: string | null): Promise<void>` có sẵn (`sales.service.ts:246,365`), chữ ký không đổi.
  - Produces: Không có
- Truy vấn (`POS_API/src/sales/transfer-attempts.service.ts`, 26; bản 2 theo quy tắc 2026-11-17):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 22 | `invoice` (đọc/khóa hóa đơn + `store_id` chi nhánh) | (3): `Invoice` không có relation | `const row = await manager.getRepository(Invoice).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' } } : {}) })`; `const branch = row ? await manager.getRepository(Branch).findOne({ where: { id: row.branch_id }, select: { id: true, store_id: true } }) : null`; trả `row && { ...row, store_id: branch!.store_id }`; giữ nguyên dòng kiểm 24-25 (`!row \|\| row.store_id !== this.store(user)`) |
  | 30 | `shift` (khóa ca, lọc cửa hàng) | (1) qua relation `WorkShift.branch` | `(await manager.getRepository(WorkShift).find({ where: { user_id: user.id, status: 'OPEN', shift_type: 'CASHIER', branch: { store_id: this.store(user) } }, select: { id: true, branch_id: true }, lock: { mode: 'pessimistic_write', tables: ['work_shifts'] } }))[0]` |
  | 47 | `getPendingTransferAttempt` | (1) | `this.db.getRepository(TransferAttempt).findOneBy({ invoice_id: invoiceId, status: 'PENDING' })` |
  | 60 | `createTransferAttempt` | (1)-(3) không đủ: advisory lock (L5) | QB + chú thích L5: `manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))', 'locked').fromDummy().setParameter('lockKey', normalized).getRawOne()` |
  | 61 | `createTransferAttempt` | (1) | `manager.getRepository(TransferAttempt).findOneBy({ idempotency_key: normalized })` |
  | 67 | `createTransferAttempt` | (1) | `existsBy(Payment, { idempotency_key })` rồi `existsBy(Invoice, { zero_completion_key })` (G-8) |
  | 70 | `createTransferAttempt` (khóa cửa hàng) | (1) | `manager.getRepository(Store).findOne({ where: { id: this.store(user) }, select: { id: true }, lock: { mode: 'pessimistic_write' } })` |
  | 76 | `createTransferAttempt` | (1) | `existsBy(TransferAttempt, { invoice_id, status: 'PENDING' })` |
  | 78 | `createTransferAttempt` | (1) | `findOneBy(StoreBankAccount, { store_id })` |
  | 80 | `createTransferAttempt` | (1) | `existsBy(InvoiceItem, { invoice_id })` |
  | 82 | `createTransferAttempt` (khóa mã giảm giá qua `invoice_promotion_codes`) | (3) | `const ip = await manager.getRepository(InvoicePromotionCode).findOneBy({ invoice_id: invoiceId })`; `if (ip) await manager.getRepository(PromotionCode).findOne({ where: { id: ip.promotion_code_id }, select: { id: true }, lock: { mode: 'pessimistic_write' } })` (hóa đơn đã khóa ở dòng 72 nên dòng nối không đổi giữa hai câu) |
  | 91 | `createTransferAttempt` (insert QR) | (2) không đủ: cần `ON CONFLICT (transfer_reference) DO NOTHING RETURNING` (L4) | QB + chú thích L4: `manager.createQueryBuilder().insert().into(TransferAttempt).values({ id, invoice_id, store_id, bank_bin, account_number, account_name, amount, transfer_reference: reference, idempotency_key: normalized, idempotency_request_hash: hash, status: 'PENDING' }).onConflict('(transfer_reference) DO NOTHING').returning('*').updateEntity(false).execute()`; `const row = result.raw[0]`; `if (row) return this.view(row)`; giữ vòng thử 5 lần và lỗi 409 `CONFLICT` (dòng E6 của "Bảng chuyển 6 truy vấn khó") |
  | 106 | `cancelTransferAttempt` (tìm hóa đơn của QR trong phạm vi) | (3) | `const a = await this.db.getRepository(TransferAttempt).findOne({ where: { id: attemptId }, select: { id: true, invoice_id: true } })`; `const inv = a ? await this.db.getRepository(Invoice).findOne({ where: { id: a.invoice_id, ...(branchId !== null ? { branch_id: branchId } : {}) }, select: { id: true, branch_id: true } }) : null`; `const ok = inv ? await this.db.getRepository(Branch).existsBy({ id: inv.branch_id, store_id: storeId }) : false`; không đạt → 404 như cũ; kết quả `{ invoice_id: a.invoice_id }` |
  | 112 | `cancelTransferAttempt` (khóa QR) | (1) | `manager.getRepository(TransferAttempt).findOne({ where: { id: attemptId }, lock: { mode: 'pessimistic_write' } })` |
  | 117 | `cancelTransferAttempt` | (2) | `manager.getRepository(TransferAttempt).update({ id: attemptId }, { status: 'CANCELLED', updated_at: () => 'now()' })` |
  | 130 | `confirmTransferManually` | (3) | như 106, `Invoice.findOne` chọn thêm `work_shift_id`; kết quả `{ invoice_id, work_shift_id }` |
  | 133 | `confirmTransferManually` | (1)-(3) không đủ: advisory lock (L5) | QB + chú thích L5, như 60 |
  | 134 | `confirmTransferManually` | (1) | `findOneBy(Payment, { idempotency_key })` |
  | 140 | `confirmTransferManually` | (1) | `existsBy(Invoice, { zero_completion_key })` rồi `existsBy(TransferAttempt, { idempotency_key })` |
  | 142 | `confirmTransferManually` (khóa ca) | (1) | `manager.getRepository(WorkShift).findOne({ where: { id: visible.work_shift_id }, select: { id: true, status: true }, lock: { mode: 'pessimistic_write' } })`; kiểm `!shift \|\| shift.status !== 'OPEN'` như cũ (`transfer-attempts.service.ts:145`) |
  | 144 | `confirmTransferManually` (khóa QR) | (1) | như 112 |
  | 148 | `confirmTransferManually` (khóa mã giảm giá) | (3) | như 82 |
  | 152 | `confirmTransferManually` (insert payment) | (2) không đủ: `ON CONFLICT (...) WHERE ... DO NOTHING RETURNING` (L4) | QB + chú thích L4: `manager.createQueryBuilder().insert().into(Payment).values({ id, invoice_id, method: 'TRANSFER', amount, actual_received_amount, excess_amount, transfer_attempt_id, receiving_account_number, transaction_ref, transaction_ref_kind: 'BANK', confirmation_source: 'MANUAL', confirmed_by: user.id, confirmation_reason: input.reason, created_by: user.id, idempotency_key: normalized, idempotency_request_hash: hash }).onConflict("(receiving_account_number,transaction_ref_kind,transaction_ref) WHERE method='TRANSFER' AND transaction_ref IS NOT NULL DO NOTHING").returning('*').updateEntity(false).execute()`; `const payment = result.raw[0]`; không có → 409 `BANK_TRANSACTION_REUSED` như cũ |
  | 159 | `confirmTransferManually` | (2) | như 117 với `status: 'PAID'` |
  | 190 | `listBankTransferExceptions` (trang) | (1)-(3) không đủ: cursor micro giây (L2) | QB + chú thích L2: `BankTransferEvent` `e`, `where('e.store_id = :storeId')`, `andWhere('e.branch_id = :branchId')` khi khác `null`, `andWhere("(e.disposition IN ('UNDERPAID','ATTEMPT_CANCELLED','INVOICE_NOT_OPEN','PROMOTION_INVALID','DUPLICATE') OR (e.disposition = 'QUARANTINED' AND e.attempt_id IS NOT NULL))")`, cursor `(e.received_at, e.id) < (CAST(:receivedAt AS timestamptz), CAST(:id AS uuid))`, select alias `id`, `disposition`, `transfer_amount`, `received_at`, `invoice_id`, `cursor_received_at`, `orderBy e.received_at DESC, e.id DESC`, `limit(limit + 1)`, `getRawMany()` |
  | 194 | `listBankTransferExceptions` (đếm) | (1) mảng `where` cho OR | `const base = { store_id: storeId, ...(branchId !== null ? { branch_id: branchId } : {}) }`; `count({ where: [{ ...base, disposition: In(['UNDERPAID', 'ATTEMPT_CANCELLED', 'INVOICE_NOT_OPEN', 'PROMOTION_INVALID', 'DUPLICATE']) }, { ...base, disposition: 'QUARANTINED', attempt_id: Not(IsNull()) }] })` |
- AC riêng:
  - [x] ST-10.AC-1: Given hóa đơn OPEN có mã giảm giá trong ca thu ngân của user và tài khoản ngân hàng đã cài, When `createTransferAttempt` khi `captureSql` bật, Then `lockSequence` bằng mảng ghi được trên mã cũ (kỳ vọng suy từ dòng 60, 70, 30, 22 lock, 82: `['advisory', 'UPDATE:stores', 'UPDATE:work_shifts', 'UPDATE:invoices', 'UPDATE:promotion_codes']`); tương tự cho `cancelTransferAttempt` (`['UPDATE:work_shifts', 'UPDATE:invoices', 'UPDATE:transfer_attempts']`) và `confirmTransferManually` (bắt đầu `['advisory', 'UPDATE:work_shifts', 'UPDATE:invoices', 'UPDATE:transfer_attempts', 'UPDATE:promotion_codes', ...]` rồi phần của `finalizeInvoice`) (kiểm: integration).
  - [x] ST-10.AC-2: Given QR đã tạo, When gửi lại cùng `Idempotency-Key` và cùng nội dung, Then trả bản cũ `replayed` true (test có sẵn `payment.integration.test.ts` có `Idempotent-Replay`) (kiểm: integration).
  - [x] ST-10.AC-3: Given key đã dùng để trả tiền mặt cho hóa đơn khác, When tạo QR với key đó, Then 409 `IDEMPOTENCY_KEY_REUSED` message `Mã yêu cầu đã được dùng cho nội dung khác.`; Given key đã dùng cho hoàn tất 0đ, When xác nhận tay với key đó, Then 409 cùng mã (kiểm: integration; thêm test nếu grep `IDEMPOTENCY_KEY_REUSED` trong `payment.integration.test.ts` không có hai ca này).
  - [x] ST-10.AC-4: Given hai sự kiện ngoại lệ cùng cửa hàng có `received_at` `...01:00:00.000001Z` và `...01:00:00.000002Z`, When `GET /api/v1/bank-transfer-exceptions?limit=1` rồi trang 2, Then trang 1 là `.000002Z`, trang 2 là `.000001Z`, `total` = 2 (kiểm: integration).
  - [x] ST-10.AC-5: Given sau sửa, When grep `.query(` trong file, Then 0; `grep -c "// QueryBuilder:" sales/transfer-attempts.service.ts` = 5; không có `setLock(` trong file; `npm test` exit 0, `# fail 0` (kiểm: grep + lệnh).
  - [x] ST-10.AC-6: Given tạo QR và xác nhận tay khi `captureSql` bật, When chuẩn hóa câu INSERT (bỏ `"`, gộp khoảng trắng), Then câu INSERT `transfer_attempts` chứa `ON CONFLICT (transfer_reference) DO NOTHING` và câu INSERT `payments` chứa `ON CONFLICT (receiving_account_number,transaction_ref_kind,transaction_ref) WHERE method='TRANSFER' AND transaction_ref IS NOT NULL DO NOTHING`, cả hai có `RETURNING` — đúng trên mã cũ và mã mới (kiểm: integration).
  - [x] ST-10.AC-7: Given giao dịch ngân hàng `transactionRef` đã dùng xác nhận đơn A, When xác nhận tay đơn B cùng tài khoản nhận và cùng `transactionRef`, Then 409 `BANK_TRANSACTION_REUSED` message `Giao dịch ngân hàng đã được dùng để xác nhận đơn khác.`, đơn B vẫn `OPEN`, không có dòng `payments` mới (test có sẵn `BANK_TRANSACTION_REUSED` trong `payment.integration.test.ts`; thiếu khẳng định trạng thái DB thì thêm) (kiểm: integration).
  - [x] ST-10.AC-8: Given delta được duyệt và ST-10 đã chuyển INSERT tạo QR sang QueryBuilder, When chạy lại `test_ST5_account_permission_race`, Then race xanh với trạng thái cuối như ST-5.AC-5; chỉ khi SQL INSERT thực tế không còn khớp `INSERT INTO transfer_attempts` mới đổi literal dòng 1126 thành `INSERT INTO "transfer_attempts"` sau khi ghi RED tại `QR insert reached held advisory gate`; literal store đã sửa ở ST-5, helper/Lock/timeout/poll/assertion/thứ tự request giữ nguyên (kiểm: focused test cha, SQL thực tế, diff, test module rồi `npm test`).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/sales/transfer-attempts.service.ts` (26 truy vấn: 5 QB, mỗi câu một dòng `// QueryBuilder:`; 21 method theo cột "Đích"; import entity, `In`, `Not`, `IsNull`); test mới thêm vào `POS_API/src/sales/tests/payment.integration.test.ts`. Ngoại lệ delta ST-10 chỉ đổi literal INSERT dòng 1126 của race cũ sau phê duyệt và khi thỏa AC-8; không đổi lại literal store hoặc test cũ khác.
  - Chữ ký hàm/class: không đổi (`invoice(manager, user, id, lock=false): Promise<Row>`, `shift(manager, user): Promise<Row>`, public methods).
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1, AC-4, AC-6 (và AC-3, AC-7 nếu thiếu); chạy trên mã cũ, ghi mảng khóa và câu INSERT thực tế.
    2. Chuyển 26 truy vấn theo cột "Đích", thêm 5 dòng `// QueryBuilder:`.
    3. Lấy câu INSERT thực tế bằng helper `captureSql` sẵn có trong test ST-10.AC-6, lưu evidence ST-10; builder đích đã dựng kiểm có đầu câu `INSERT INTO "transfer_attempts"(`. Không sửa helper `waiting` để chuẩn hóa SQL hoặc mở rộng mẫu. Chạy focused test CHA bằng đúng command ST-5 bước 4, lưu `evidence/ST-10/race-pattern-before.log`; xác nhận subtest race thật sự chạy. Chưa hoàn thành ST-5.AC-5 thì chưa chạy phần test race của ST-10.
    4. Nếu SQL thực tế vẫn khớp `INSERT INTO transfer_attempts` và race xanh, giữ nguyên literal INSERT, ghi không áp dụng sửa dòng 1126. Nếu SQL thực tế không khớp literal cũ và race đỏ đúng `QR insert reached held advisory gate`, lưu RED vào `evidence/ST-10/race-pattern-red.log`, chỉ thay literal thành `INSERT INTO "transfer_attempts"`, chạy lại focused test cha và lưu `race-pattern-green.log`; cả hai assertion chờ phải `true`, trạng thái cuối giữ nguyên. Lỗi khác hoặc SQL không khớp pattern đề xuất: DỪNG, báo agent chính; không tự mở rộng ngoại lệ.
    5. Chạy lại test ST-10, test module `node --env-file-if-exists=.env --test --test-concurrency=1 dist/sales/tests/payment.integration.test.js`, rồi `npm test`; lưu output ST-10, agent chính kiểm lại và đọc diff E2E-AC-6.
  - Quy tắc nghiệp vụ: thứ tự kiểm giữ nguyên (`transfer-attempts.service.ts:58-87`, `:104-116`, `:128-157`), M-1 (phạm vi chi nhánh ở mọi điểm vào), M-30.
  - Bảng edge case:
    - User không có `branch.access_all` và `branchId` rỗng → 403 `PERMISSION_DENIED` `Tài khoản chưa được gán chi nhánh.` trước truy vấn (giữ `:105`, `:129`, `:175`).
    - `invoice()` cho PLATFORM_ADMIN (`storeId` rỗng): hóa đơn không tồn tại → 404; tồn tại → 403 từ `this.store(user)` (giữ thứ tự `!row || row.store_id !== this.store(user)`).
    - `bank_bin.trim()`, `transfer_reference.trim()` ở `view()` vẫn áp dụng (entity `char` trả chuỗi có đệm như raw).
  - Ảnh hưởng tới code hiện có: `TransferAttemptsService` không bị service khác gọi helper nội bộ; controller không đổi.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `20261109-owner-access-all-branch-scope.md`, `20261110-backlog-branch-scope-null-branchid-fail-open.md` (M-1) → giữ điều kiện chi nhánh ở 106/130/190; `2026-10-28-pb02-session-revocation-races.md` → giữ advisory lock trước đọc idempotency.
- Test viết trước:
  - [x] `test_ST10_AC1_transfer_lock_sequences` — input: ba thao tác; expected: ba mảng ghi trên mã cũ.
  - [x] `test_ST10_AC3_key_reused_across_tables` (chỉ khi chưa có) — input: như AC-3; expected: 409 `IDEMPOTENCY_KEY_REUSED`.
  - [x] `test_ST10_AC4_exceptions_cursor_keeps_microseconds` — input/expected: như AC-4.
  - [x] `test_ST10_AC6_on_conflict_target_unchanged` — input: tạo QR, xác nhận tay; expected: hai câu INSERT chứa đúng mệnh đề `ON CONFLICT` như AC-6.
  - [x] `test_ST10_AC7_bank_ref_reused_db_state` (chỉ khi test có sẵn chưa khẳng định DB) — input/expected: như AC-7.
  - [x] `test_ST5_account_permission_race` (test cũ, không tạo mới) — input: cùng race sau chuyển INSERT QueryBuilder; expected: ST-10.AC-8; chỉ sửa literal INSERT khi SQL thực tế lệch mẫu cũ và RED đúng assertion gate.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-11: sepay-webhook
- depends_on: ST-1, ST-2
- Interfaces:
  - Consumes: `BankTransferEvent`, `TransferAttempt`, `PromotionCode`, `InvoicePromotionCode`, `Payment` từ ST-1; `captureSql`, `lockSequence` từ ST-2; `SalesService.evaluateInvoicePricing`, `SalesService.finalizeInvoice` (chữ ký như ST-10).
  - Produces: Không có
- Truy vấn (`POS_API/src/sales/sepay-webhook.service.ts`, 11; bản 2 theo quy tắc 2026-11-17):
  | Dòng | Đã thử | Đích |
  |---|---|---|
  | 50 | (1)-(3) không đủ: advisory lock (L5) | QB + chú thích L5: `manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))', 'locked').fromDummy().setParameter('lockKey', 'sepay:' + eventId).getRawOne()` |
  | 51 | (1) | `manager.getRepository(BankTransferEvent).existsBy({ provider_event_id: eventId })` |
  | 54 | (3): `TransferAttempt` không có relation | `const a = await manager.getRepository(TransferAttempt).findOne({ where: { transfer_reference: reference }, select: { id: true, invoice_id: true, store_id: true, account_number: true, idempotency_key: true, idempotency_request_hash: true } })`; `const inv = a ? await manager.getRepository(Invoice).findOne({ where: { id: a.invoice_id }, select: { id: true, work_shift_id: true, branch_id: true } }) : null`; `attempt = a && { ...a, work_shift_id: inv!.work_shift_id, branch_id: inv!.branch_id }` (khóa như SQL cũ; giữ điều kiện `reference ? ... : []` ở dòng 53-55) |
  | 57 | (1) | `manager.getRepository(WorkShift).findOne({ where: { id: attempt.work_shift_id }, select: { id: true, status: true }, lock: { mode: 'pessimistic_write' } })` |
  | 58 | (1) | `manager.getRepository(Invoice).findOne({ where: { id: attempt.invoice_id }, select: { id: true, status: true }, lock: { mode: 'pessimistic_write' } })` |
  | 59 | (1) | `manager.getRepository(TransferAttempt).findOne({ where: { id: attempt.id }, select: { id: true, status: true }, lock: { mode: 'pessimistic_write' } })` |
  | 64 | (3) | như `transfer-attempts.service.ts:82` (ST-10) |
  | 72 | (2) không đủ: `ON CONFLICT ... DO NOTHING RETURNING` (L4) | QB + chú thích L4: như `transfer-attempts.service.ts:152` (ST-10) với `confirmation_source: 'WEBHOOK'`, `transaction_ref_kind: bankReference ? 'BANK' : 'SEPAY_EVENT'`, không `confirmed_by`/`confirmation_reason`/`created_by`, `.returning(['id'])`; `if (result.raw.length === 0) disposition = 'DUPLICATE'` như cũ |
  | 83 | (2) | `manager.getRepository(TransferAttempt).update({ id: attempt.id }, { status: 'PAID', updated_at: () => 'now()' })` |
  | 88 | (2) | `manager.getRepository(BankTransferEvent).insert({ id, provider_event_id, provider_reference, account_number, transfer_reference, transfer_amount, content, disposition, store_id, branch_id, invoice_id, attempt_id })` |
  | 97 | (2) | như 88 với `disposition: 'QUARANTINED'` và các id theo `wrongAccount` |
- AC riêng:
  - [x] ST-11.AC-1: Given QR `PENDING` đủ tiền, When webhook hợp lệ khi `captureSql` bật, Then `lockSequence` bằng mảng ghi trên mã cũ (kỳ vọng suy từ dòng 50, 57, 58, 59, 64 và `finalizeInvoice`: `['advisory', 'UPDATE:work_shifts', 'UPDATE:invoices', 'UPDATE:transfer_attempts', 'UPDATE:promotion_codes', 'UPDATE:invoices', 'UPDATE:promotion_codes']`) (kiểm: integration).
  - [x] ST-11.AC-2: Given các test webhook có sẵn (`PAID`, `UNDERPAID`, `ATTEMPT_CANCELLED`, `INVOICE_NOT_OPEN`, `PROMOTION_INVALID`, `DUPLICATE`, `WRONG_ACCOUNT`, gửi trùng `Promise.all` ở `payment.integration.test.ts:1261,1380,1439`), When `npm test`, Then xanh (kiểm: integration).
  - [x] ST-11.AC-3: Given sau sửa, When grep `.query(` trong file, Then 0; `grep -c "// QueryBuilder:" sales/sepay-webhook.service.ts` = 2; không có `setLock(` trong file (kiểm: grep).
  - [x] ST-11.AC-4: Given webhook đủ tiền khi `captureSql` bật, When chuẩn hóa câu INSERT `payments`, Then chứa `ON CONFLICT (receiving_account_number,transaction_ref_kind,transaction_ref) WHERE method='TRANSFER' AND transaction_ref IS NOT NULL DO NOTHING` và `RETURNING` — đúng trên mã cũ và mã mới; Given webhook thứ hai cùng `referenceCode` cùng tài khoản cho QR khác, Then sự kiện thứ hai `disposition` = `DUPLICATE` (test có sẵn `'DUPLICATE'` trong `payment.integration.test.ts`) (kiểm: integration).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/sales/sepay-webhook.service.ts`; test mới thêm vào `POS_API/src/sales/tests/payment.integration.test.ts`.
  - Chữ ký hàm/class: không đổi.
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1, AC-4; chạy trên mã cũ.
    2. Chuyển 11 truy vấn theo cột "Đích", thêm 2 dòng `// QueryBuilder:`.
    3. Chạy lại; `npm test`.
  - Quy tắc nghiệp vụ: phân loại `disposition` giữ nguyên (`sepay-webhook.service.ts:60-87`); chú thích tiếng Anh dòng 95 giữ nguyên.
  - Bảng edge case: `referenceCode` rỗng → `provider_reference` `null`, `transaction_ref` `SEPAY:<id>` (giữ `:70-71`, `:91`); token QR không khớp hoặc nhiều token → `QUARANTINED` không gắn cửa hàng.
  - Ảnh hưởng tới code hiện có: Không có.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `20261109-sepay-wrong-account-hidden.md` (tag sales/webhook) → giữ gắn `store_id/branch_id/invoice_id/attempt_id` khi `wrongAccount`.
- Test viết trước:
  - [x] `test_ST11_AC1_webhook_lock_sequence` — input: webhook đủ tiền; expected: mảng ghi trên mã cũ.
  - [x] `test_ST11_AC4_on_conflict_target_unchanged` — input: webhook đủ tiền; expected: câu INSERT `payments` chứa đúng mệnh đề `ON CONFLICT ... DO NOTHING` và `RETURNING`.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-12: sales phần A (helper khóa/đọc dùng chung, chi tiết hóa đơn)
- depends_on: ST-1, ST-2
- Interfaces:
  - Consumes: `Payment`, `InvoicePromotionCode`, `TransferAttempt` từ ST-1; `captureSql`, `lockSequence` từ ST-2.
  - Produces (chữ ký giữ nguyên để ST-13 → ST-17 dùng): `private shift(manager: EntityManager, user: UserSummary): Promise<Row>` trả object có `id`, `branch_id`, `store_id`, `is_active`; `private invoice(manager: EntityManager, user: UserSummary, id: string, lock = false): Promise<Row>` trả mọi cột `invoices` + `store_id`; `private detail(manager: EntityManager, row: Row)`; `private table(manager: EntityManager, user: UserSummary, tableId: string, branchId: string)`; `private writable(manager: EntityManager, user: UserSummary, id: string)`; `private itemInvoice(manager: EntityManager, itemId: string): Promise<string>`.
- Truy vấn (`POS_API/src/sales/sales.service.ts`, 10; bản 2 theo quy tắc 2026-11-17):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 43 | `shift` (khóa `OF s,b`) | (1) không khóa được `branches` (phía LEFT JOIN, M-20); (3) hai `findOne({ lock })` theo thứ tự `s` rồi `b` | `const s = await manager.getRepository(WorkShift).findOne({ where: { user_id: user.id, status: 'OPEN', shift_type: 'CASHIER' }, select: { id: true, branch_id: true }, lock: { mode: 'pessimistic_write' } })`; `const b = s ? await manager.getRepository(Branch).findOne({ where: { id: s.branch_id }, select: { id: true, store_id: true, is_active: true }, lock: { mode: 'pessimistic_write' } }) : null`; trả `s && b && { id: s.id, branch_id: s.branch_id, store_id: b.store_id, is_active: b.is_active }` (kiểm `:46` như cũ); token `UPDATE:work_shifts`, `UPDATE:branches` (G-17) |
  | 51 | `invoice` | (3) | như `transfer-attempts.service.ts:22` ở ST-10 (hai `findOne`, khóa hóa đơn khi `lock`) |
  | 61 | `detail` (ca, thu ngân, bàn, phương thức) | (1) relation `WorkShift.user` + (3) | `const s = await manager.getRepository(WorkShift).findOne({ where: { id: row.work_shift_id }, relations: { user: true }, select: { id: true, status: true, user_id: true, user: { id: true, full_name: true } } })`; `const t = row.table_id ? await manager.getRepository(DiningTable).findOne({ where: { id: row.table_id }, select: { id: true, name: true } }) : null`; `const p = await manager.getRepository(Payment).findOne({ where: { invoice_id: row.id }, select: { id: true, method: true } })`; ghép `shift_status`, `cashier_id`, `cashier_name`, `table_name` (`t?.name ?? null`), `payment_method` (`p?.method ?? null`) như cũ |
  | 66 | `detail` | (1) | `manager.getRepository(InvoicePromotionCode).find({ where: { invoice_id: row.id }, select: { invoice_id: true, code: true, discount_amount: true } })` |
  | 67 | `detail` | (1) | `manager.getRepository(InvoiceItem).find({ where: { invoice_id: row.id }, order: { created_at: 'ASC', id: 'ASC' } })` |
  | 68 | `detail` (topping) | (3) dùng `items` của dòng 67 | `items.length ? await manager.getRepository(InvoiceItemTopping).find({ where: { invoice_item_id: In(items.map(i => i.id)) }, order: { created_at: 'ASC', id: 'ASC' } }) : []` |
  | 95 | `get` | (1) | `this.db.getRepository(WorkShift).findOne({ where: { id: row.work_shift_id }, select: { id: true, user_id: true } })` |
  | 220 | `table` (khóa `FOR SHARE OF t`, đọc chi nhánh) | (1) relation `DiningTable.branch` | `(await manager.getRepository(DiningTable).find({ where: { id: tableId }, relations: { branch: true }, select: { id: true, branch_id: true, is_active: true, branch: { id: true, store_id: true } }, lock: { mode: 'pessimistic_read', tables: ['dining_tables'] } }))[0]`; `store_id` = `t.branch!.store_id` — SQL `... LEFT JOIN "branches" ... FOR SHARE OF "DiningTable"` (đã dựng), token `SHARE:dining_tables` |
  | 234 | `writable` | (1) | `manager.getRepository(TransferAttempt).existsBy({ invoice_id: id, status: 'PENDING' })` |
  | 453 | `itemInvoice` | (1) | `manager.getRepository(InvoiceItem).findOne({ where: { id: itemId }, select: { id: true, invoice_id: true } })` |
- AC riêng:
  - [x] ST-12.AC-1: Given ca thu ngân mở, bàn active cùng chi nhánh, When `create` đơn `DINE_IN` khi `captureSql` bật, Then `lockSequence` trên mã cũ = `['UPDATE:work_shifts,branches', 'SHARE:dining_tables']`, sau chuyển = `['UPDATE:work_shifts', 'UPDATE:branches', 'SHARE:dining_tables']` (G-17); test có sẵn `sales.integration.test.ts:87-89` (`55P03` cho branch/table) giữ xanh (kiểm: integration).
  - [x] ST-12.AC-2: Given hóa đơn có 1 món 2 topping, mã giảm giá, đã trả tiền mặt, When `GET /api/v1/invoices/:id`, Then `items[0].toppings` theo thứ tự `created_at,id`, `paymentMethod` `CASH`, `promotionCode.code` đúng (test có sẵn `invoices-read.integration.test.ts`, `payment.integration.test.ts`) (kiểm: integration).
  - [x] ST-12.AC-3: Given bàn của chi nhánh khác cùng cửa hàng, When tạo đơn `DINE_IN`, Then 422 `INVOICE_BRANCH_MISMATCH` message `Bàn không thuộc chi nhánh của ca.`; Given bàn ngưng dùng, Then 409 `TABLE_INACTIVE` message `Bàn đã ngưng dùng.`; Given bàn cửa hàng khác, Then 404 `NOT_FOUND` message `Không tìm thấy bàn.` (kiểm: integration).
  - [x] ST-12.AC-4: Given CASHIER không có `invoice.read_branch`, When `GET` hóa đơn của ca người khác, Then 404 `NOT_FOUND` `Không tìm thấy hóa đơn.` (test có sẵn `invoices-read.integration.test.ts`; thiếu thì thêm) (kiểm: integration).
  - [x] ST-12.AC-5: Given sau sửa, When `npm test`, Then exit 0, `# fail 0` (mốc đếm `// QueryBuilder:` giữa chừng đã bỏ theo duyệt 2026-11-17; số cuối kiểm ở E2E-AC-11 và ST-17.AC-3); không có `setLock(` mới (kiểm: lệnh + grep).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/sales/sales.service.ts` (10 truy vấn; import `Branch`, `DiningTable`, `User`, `WorkShift`, `Invoice`, `InvoiceItem`, `InvoiceItemTopping`, `Payment`, `InvoicePromotionCode`, `TransferAttempt`); test mới thêm vào `POS_API/src/sales/tests/sales.integration.test.ts`.
  - Chữ ký hàm/class: như "Produces".
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1, AC-3 (và AC-4 nếu thiếu); chạy trên mã cũ.
    2. Chuyển 10 truy vấn.
    3. Chạy lại; `npm test`.
  - Quy tắc nghiệp vụ: không bán khi chưa có ca thu ngân (`SHIFT_NOT_OPEN`); `BRANCH_INACTIVE` khi chi nhánh ngưng (`sales.service.ts:198`); một bàn một đơn OPEN (`uq_invoices_table_open`).
  - Bảng edge case:
    - Shift của cửa hàng khác (không xảy ra với dữ liệu hợp lệ) → 409 `SHIFT_NOT_OPEN` (giữ `:46`).
    - `detail` khi `table_id` `null` → `table_name` `null` (LEFT JOIN `t.id = NULL`).
  - Ảnh hưởng tới code hiện có: mọi method sales gọi các helper này; giữ khóa của object trả về.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `2026-11-06-pb07-active-resource-race.md` → `FOR UPDATE OF s,b`, `FOR SHARE OF t`; M-20; `20261109-owner-access-all-branch-scope.md` (M-1).
- Test viết trước:
  - [x] `test_ST12_AC1_create_lock_sequence` — input: tạo đơn tại bàn; expected: mã cũ `['UPDATE:work_shifts,branches', 'SHARE:dining_tables']`, sau chuyển `['UPDATE:work_shifts', 'UPDATE:branches', 'SHARE:dining_tables']`.
  - [x] `test_ST12_AC3_table_errors_unchanged` — input: ba ca bàn; expected: 422/409/404 như AC-3.
  - [x] `test_ST12_AC4_cashier_other_shift_404` (chỉ khi chưa có) — input/expected: như AC-4.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-13: sales phần B (danh sách hóa đơn)
- depends_on: ST-12
- Interfaces:
  - Consumes: `Payment` từ ST-1; helper ST-12 không dùng.
  - Produces: Không có
- Truy vấn (`sales.service.ts` hàm `list`, 4; bản 2 theo quy tắc 2026-11-17 — cả 4 giữ QB):
  | Dòng | Đã thử | Đích |
  |---|---|---|
  | 158 | (1)-(3) không đủ: trang cần JOIN 5 bảng không relation, sub-select `item_count`, cursor micro giây (L2); nhiều `find` phải tải mọi hóa đơn của cửa hàng | QB + chú thích L2: `Invoice` `i` `innerJoin(Branch, 'b', 'b.id = i.branch_id').innerJoin(WorkShift, 's', 's.id = i.work_shift_id').innerJoin(User, 'u', 'u.id = s.user_id').leftJoin(DiningTable, 't', 't.id = i.table_id').leftJoin(Payment, 'p', 'p.invoice_id = i.id')`; select alias các cột `invoices` mà `data` đọc (`id`, `invoice_code`, `branch_id`, `table_id`, `order_type`, `status`, `total_amount`, `created_at`, `work_shift_id`) + `shift_status`, `cashier_id`, `cashier_name`, `table_name`, `payment_method`, `item_count` (`(SELECT COALESCE(SUM(quantity),0)::int FROM invoice_items WHERE invoice_id = i.id)`), `cursor_created_at` (to_char micro giây); `where('b.store_id = :storeId')`; `andWhere` có điều kiện trong JavaScript cho: `status !== 'ALL'` → `i.status = :status`; `tableId` → `i.table_id = :tableId`; `from` → `i.created_at >= CAST(:from AS timestamptz)`; `to` → `i.created_at < CAST(:to AS timestamptz)`; `cashierFilter` → `EXISTS (SELECT 1 FROM work_shifts s2 WHERE s2.id = i.work_shift_id AND s2.user_id = :cashierFilter)`; `branchId` → `i.branch_id = :branchId`; `after` → `(i.created_at, i.id) < (CAST(:afterCreatedAt AS timestamptz), CAST(:afterId AS uuid))`; `cashierId` → `EXISTS (... s3.user_id = :cashierId)`; `orderBy i.created_at DESC, i.id DESC`, `limit(limit + 1)`, `getRawMany()` |
  | 164 | (1)-(3) không đủ: đếm lọc qua chi nhánh và `EXISTS` ca của thu ngân trên số hóa đơn không giới hạn (L6) | QB + chú thích L6: `Invoice` `i` `innerJoin(Branch, ...)` với cùng điều kiện trừ cursor; `getCount()` |
  | 171 | (1)-(3) không đủ: `DISTINCT` bàn qua hóa đơn/chi nhánh/ca (L6) | QB + chú thích L6: `DiningTable` `t` `innerJoin(Invoice, 'i', 'i.table_id = t.id').innerJoin(Branch, 'b', 'b.id = i.branch_id').innerJoin(WorkShift, 's', 's.id = i.work_shift_id')`, `select('t.id', 'id').addSelect('t.name', 'name').distinct(true)`, `where('b.store_id = :storeId')`, `andWhere` `branchId`, `cashierId` (`s.user_id`) khi khác `null`, `orderBy t.name, t.id`, `getRawMany()` |
  | 174 | (1)-(3) không đủ: `DISTINCT` thu ngân qua ca/hóa đơn/chi nhánh (L6) | QB + chú thích L6: `User` `u` `innerJoin(WorkShift, 's', 's.user_id = u.id').innerJoin(Invoice, 'i', 'i.work_shift_id = s.id').innerJoin(Branch, 'b', 'b.id = i.branch_id')`, `select('u.id', 'id').addSelect('u.full_name', 'name').distinct(true)`, điều kiện như 171, `orderBy u.full_name, u.id`, `getRawMany()` |
- AC riêng:
  - [x] ST-13.AC-1: Given các test có sẵn `invoices-read.integration.test.ts` (lọc `status`, `branchId`, `cashierId`, `tableId`, `from`/`to` có micro giây dòng 144/166, cursor, `filterOptions`), When `npm test`, Then xanh (mốc đếm `// QueryBuilder:` giữa chừng đã bỏ theo duyệt 2026-11-17; số cuối kiểm ở E2E-AC-11 và ST-17.AC-3) (kiểm: integration + grep).
  - [x] ST-13.AC-2: Given 3 hóa đơn (OPEN, PAID, CANCELLED) cùng chi nhánh, When `GET /invoices?status=ALL`, Then `meta.total` = 3 và `data.length` = 3; `status` không truyền → chỉ OPEN, `total` = 1 (kiểm: integration; thêm nếu chưa có).
  - [x] ST-13.AC-3: Given hóa đơn có 2 món số lượng 2 và 3, When danh sách, Then `itemCount` = 5 kiểu number (kiểm: integration; thêm nếu chưa có).
  - [x] ST-13.AC-4: Given user duyệt delta và ST-13 chuyển bốn query list, When thêm duy nhất `assert.ok(one > 0)` sau const one=queries trong subtest AC-4 options rồi chạy mock DataSource cũ, Then RED count 0 đúng nguyên nhân; When chỉ đổi counter QueryRunner đúng this.connection===db/restore finally theo mục delta chung, Then one>0 và queries===one sau limit 100, mọi assertion hiện hữu dữ liệu/filterOptions/scope giữ nguyên, focused/module/suite exit 0 # fail 0; không cố định tổng SQL/không nhận 0/0 (kiểm: RED/GREEN + diff; nguồn: invoices-read.integration.test.ts:248-258).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/sales/sales.service.ts` (hàm `list`); test mới (nếu thiếu) vào `POS_API/src/sales/tests/invoices-read.integration.test.ts`.
  - Ngoại lệ test cũ đã duyệt: chỉ counter/import/original/mock/restore :248-258 trong subtest `[ST-2.AC-4] options include inactive historical tables and cashiers outside the filtered page` cùng duy nhất assertion MỚI assert.ok(one > 0), mọi assertion cũ/hai URL/request giữ nguyên; theo mục delta chung.
  - Chữ ký hàm/class: `list(user: UserSummary, query: Record<string, unknown>)` không đổi.
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Kiểm test có sẵn phủ AC-2, AC-3; thiếu thì viết, chạy trên mã cũ.
    2. Chuyển 4 truy vấn; giữ nguyên toàn bộ validate/cursor phía trên dòng 151.
    3. Sau duyệt delta và chuyển bốn query, thêm duy nhất assert.ok(one > 0) sau const one=queries, giữ mock db.query/mọi assertion cũ. npm run build rồi `node --env-file-if-exists=.env --test --test-concurrency=1 --test-name-pattern="Invoice read scope over HTTP" dist/sales/tests/invoices-read.integration.test.js` trong POS_API/; dùng test cha vì subtest phụ thuộc setup/subtest trước (M-32). Lưu evidence/ST-13/invoices-counter-red.log; subtest AC-4 thật sự chạy và RED tại count dương do one===0; equality 0/0 không là chứng cứ.
    4. Chỉ sau RED đúng nguyên nhân, thực hiện đúng counter/import/original/restore theo “Delta ST-6/ST-13”; mọi assertion cũ/hai fetch/reset giữ nguyên.
    5. Chạy lại focused command bước 3, lưu evidence/ST-13/invoices-counter-green.log, đủ count dương/equality cũ. Chạy `node --env-file-if-exists=.env --test --test-concurrency=1 dist/sales/tests/invoices-read.integration.test.js`, lưu module-after-delta.log, rồi npm test, lưu suite-after-delta.log trong evidence/ST-13/. Agent chính chạy lại build/focused/module/suite tuần tự và kiểm E2E-AC-6.
  - Quy tắc nghiệp vụ: CASHIER không có `invoice.read_branch` chỉ thấy ca mình (`readScope`, `sales.service.ts:35-40`).
  - Bảng edge case: `from`/`to` đã làm tròn micro giây bởi `sqlDate` (giữ nguyên `:129-135`); `branchId` viết hoa đã `toLowerCase` (`:113`).
  - Ảnh hưởng tới code hiện có: Không có.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `20261110-backlog-branch-scope-null-branchid-fail-open.md` (M-1) → giữ 403 khi thiếu `branchId` trước truy vấn.
- Test viết trước:
  - [x] `test_ST13_AC2_status_filter_and_total` (chỉ khi chưa có) — input/expected: như AC-2.
  - [x] `test_ST13_AC3_item_count_sum` (chỉ khi chưa có) — input/expected: như AC-3.
  - [x] `[ST-2.AC-4] options include inactive historical tables and cashiers outside the filtered page` (cũ, test cha `Invoice read scope over HTTP`) — input: limit 1/100/dữ liệu/scope cũ; expected: mock cũ sau chuyển RED count 0 tại assertion MỚI assert.ok(one > 0), QueryRunner GREEN count dương/equality cũ, restore finally; không tạo test/fixture mới.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-14: sales phần C (tạo đơn, thêm/sửa/xóa món, chuyển bàn)
- depends_on: ST-13
- Interfaces:
  - Consumes: helper ST-12 (`shift`, `invoice`, `detail`, `table`, `writable`, `itemInvoice`, chữ ký ở ST-12 "Produces"); `recalculate(manager: EntityManager, id: string)` có sẵn (`sales.service.ts:239`, ST-15 chuyển bên trong, chữ ký không đổi).
  - Produces: Không có
- Truy vấn (`sales.service.ts`, 12; bản 2 theo quy tắc 2026-11-17 — không còn QB):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 201 | `create` (insert, cần dòng đầy đủ) | (2)+(1) | `await manager.getRepository(Invoice).insert({ id, branch_id, work_shift_id, table_id, invoice_code, created_by, order_type, status: 'OPEN', subtotal: '0', discount_amount: '0', total_amount: '0', note })` trong `try` giữ `catch` `23505` + `error.constraint`; rồi `this.detail(manager, await manager.getRepository(Invoice).findOneByOrFail({ id }))` — `detail` nhận entity (khóa snake_case như raw) |
  | 209 | `create` (catch) | (1) | `this.db.getRepository(Invoice).findOne({ where: { table_id: input.tableId, status: 'OPEN' }, select: { id: true } })` → `details` `[{ field: 'invoiceId', value: existing.id }]` hoặc `[]` |
  | 418 | `addItem` (món + size + danh mục) | (1) relation `ProductSize.product.category`, `ProductSize.size` | `const ps = await manager.getRepository(ProductSize).findOne({ where: { id: input.productSizeId }, relations: { product: { category: true }, size: true } })`; ghép `p = ps && { id: ps.id, price: ps.price, size_active: ps.is_active, product_name: ps.product!.name, product_active: ps.product!.is_active, category_id: ps.product!.category_id, store_id: ps.product!.category!.store_id, category_active: ps.product!.category!.is_active, size_name: ps.size!.name }`; kiểm `:421-422` như cũ |
  | 428 | `addItem` (topping + `allowed`) | (3) hai `find` | `const toppings = await manager.getRepository(Topping).find({ where: { id: In(requested.map(t => t.toppingId)) }, select: { id: true, name: true, price: true, is_active: true, store_id: true } })`; `const allowed = new Set((await manager.getRepository(CategoryTopping).find({ where: { category_id: p.category_id, topping_id: In(toppings.map(t => t.id)) }, select: { category_id: true, topping_id: true } })).map(ct => ct.topping_id))`; `toppingRows = toppings.map(t => ({ ...t, allowed: allowed.has(t.id) }))`; chỉ chạy khi `requested.length` > 0 như cũ |
  | 438 | `addItem` | (2) | `manager.getRepository(InvoiceItem).insert({...})` |
  | 442 | `addItem` | (2) | `manager.getRepository(InvoiceItemTopping).insert({...})` trong vòng lặp theo thứ tự `toppingRows` |
  | 463 | `patchItem` | (1) | `manager.getRepository(InvoiceItem).findOneBy({ id: itemId })` |
  | 467 | `patchItem` | (1) | `manager.getRepository(InvoiceItemTopping).findBy({ invoice_item_id: itemId })` |
  | 470 | `patchItem` | (2) | `manager.getRepository(InvoiceItem).update({ id: itemId }, { quantity, note, line_total: String(lineTotal), updated_at: () => 'now()' })` |
  | 472 | `patchItem` | (2) | `manager.getRepository(InvoiceItemTopping).update({ id: topping.id }, { line_total: String(...) })` |
  | 483 | `removeItem` | (2) | `manager.getRepository(InvoiceItem).delete({ id: itemId })` |
  | 494 | `transfer` | (2) | `manager.getRepository(Invoice).update({ id }, { table_id: tableId, updated_at: () => 'now()' })`; giữ `catch` `uq_invoices_table_open` |
- AC riêng:
  - [x] ST-14.AC-1: Given test có sẵn `sales.integration.test.ts` (tạo đơn, `TABLE_HAS_OPEN_INVOICE`, thêm/sửa/xóa món, chuyển bàn, `RESOURCE_IN_USE`), When `npm test`, Then xanh (kiểm: integration).
  - [x] ST-14.AC-2: Given món có size ngưng bán, When thêm món, Then 409 `ITEM_NOT_AVAILABLE` message `Món hoặc size đã ngưng bán.`; Given topping ngưng bán, Then 409 `ITEM_NOT_AVAILABLE` `Topping đã ngưng bán.`; Given topping không thuộc danh mục món, Then 422 `TOPPING_NOT_ALLOWED` `Topping không thuộc danh mục món.`; Given topping cửa hàng khác, Then 404 `NOT_FOUND` `Không tìm thấy topping trong cửa hàng.` (kiểm: integration).
  - [x] ST-14.AC-3: Given món giá 30000, topping 5000 × 2, số lượng 3, When thêm món, Then `lineTotal` = 120000, `totalAmount` hóa đơn = 120000; When `PATCH` số lượng 1, Then `lineTotal` = 40000 (kiểm: integration; test có sẵn nếu khẳng định cùng giá trị, thiếu thì thêm).
  - [x] ST-14.AC-4: Given sau sửa, When `npm test`, Then exit 0, `# fail 0`; `grep -c "// QueryBuilder:" sales/sales.service.ts` vẫn = 4 sau ST-14 (kiểm: lệnh + grep).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/sales/sales.service.ts` (12 truy vấn; import `ProductSize`, `Product`, `Category`, `Size`, `Topping`); test mới vào `POS_API/src/sales/tests/sales.integration.test.ts`.
  - Chữ ký hàm/class: không đổi.
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-2 (và AC-3 nếu thiếu); chạy trên mã cũ.
    2. Chuyển 12 truy vấn.
    3. Chạy lại; `npm test`.
  - Quy tắc nghiệp vụ: server tính giá, snapshot tên/giá lúc bán (`CLAUDE.md` "Quy tắc sản phẩm cần giữ"); tiền qua `money()` (`sales.service.ts:15-19`).
  - Bảng edge case: `tableId` không truyền cho `TAKEAWAY` → `table_id` `null`; `note` `undefined` khi PATCH → giữ `item.note`; topping trùng → 422 trước truy vấn (giữ `:426-427`).
  - Ảnh hưởng tới code hiện có: Không có.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `2026-11-06-pb07-sold-topping-delete.md`, `2026-11-06-pb07-uppercase-topping.md` (tag pb07, sales) → giữ `toLowerCase` topping id (`:425`).
- Test viết trước:
  - [x] `test_ST14_AC2_add_item_errors_unchanged` — input: bốn ca; expected: như AC-2.
  - [x] `test_ST14_AC3_line_total_snapshot` (chỉ khi chưa có) — input/expected: như AC-3.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-15: sales phần D (tính giá, áp/bỏ mã giảm giá)
- depends_on: ST-14
- Interfaces:
  - Consumes: `PromotionCode`, `InvoicePromotionCode` từ ST-1; helper ST-12.
  - Produces (chữ ký giữ nguyên, ST-10/ST-11/ST-16 gọi): `async evaluateInvoicePricing(manager: EntityManager, invoiceId: string): Promise<InvoicePricing>`; `private async recalculate(manager: EntityManager, id: string)`.
- Truy vấn (`sales.service.ts`, 8; bản 2 theo quy tắc 2026-11-17):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 241 | `recalculate` | (2) | `manager.getRepository(Invoice).update({ id }, { subtotal: String(...), discount_amount: String(...), total_amount: String(...), updated_at: () => 'now()' })` (giá trị `money(...)` như cũ) |
  | 243 | `recalculate` | (2) | `manager.getRepository(InvoicePromotionCode).update({ invoice_id: id }, { discount_amount: String(money(pricing.discountAmount)) })` |
  | 247 | `evaluateInvoicePricing` | (1)-(3) không đủ: tổng tiền `SUM` (L1) | QB + chú thích L1: `manager.getRepository(InvoiceItem).createQueryBuilder('i').select('COALESCE(SUM(i.line_total),0)::bigint', 'subtotal').where('i.invoice_id = :invoiceId', { invoiceId }).getRawOne()`; `BigInt(sum.subtotal)` |
  | 249 | `evaluateInvoicePricing` | (3) | `const ip = await manager.getRepository(InvoicePromotionCode).findOneBy({ invoice_id: invoiceId })`; `const promo = ip ? await manager.getRepository(PromotionCode).findOneBy({ id: ip.promotion_code_id }) : undefined` |
  | 265 | `applyPromotion` | (1) | `manager.getRepository(InvoicePromotionCode).existsBy({ invoice_id: invoiceId })` |
  | 267 | `applyPromotion` (khóa mã) | (1) | `manager.getRepository(PromotionCode).findOne({ where: { store_id: storeId, code }, lock: { mode: 'pessimistic_write' } })` |
  | 269 | `applyPromotion` | (2) | `manager.getRepository(InvoicePromotionCode).insert({ invoice_id, promotion_code_id, code })` |
  | 280 | `removePromotion` | (2) | `manager.getRepository(InvoicePromotionCode).delete({ invoice_id: invoiceId })` |
- AC riêng:
  - [x] ST-15.AC-1: Given hóa đơn OPEN của ca mình, When `applyPromotion` khi `captureSql` bật, Then `lockSequence` trên mã cũ = `['UPDATE:work_shifts,branches', 'UPDATE:invoices', 'UPDATE:promotion_codes']`, sau chuyển = `['UPDATE:work_shifts', 'UPDATE:branches', 'UPDATE:invoices', 'UPDATE:promotion_codes']` (G-17) (kỳ vọng suy từ `writable` + dòng 267) (kiểm: integration).
  - [x] ST-15.AC-2: Given mã PERCENT 10 tối đa 5000, hóa đơn 100000, When áp mã, Then `discountAmount` 5000, `totalAmount` 95000; Given đơn đã có mã, When áp mã khác, Then 409 `PROMOTION_ALREADY_APPLIED` (test có sẵn `payment.integration.test.ts`) (kiểm: integration).
  - [x] ST-15.AC-3: Given test có sẵn về `PROMOTION_NOT_APPLICABLE` và bỏ mã, When `npm test`, Then exit 0, `# fail 0` (mốc đếm `// QueryBuilder:` giữa chừng đã bỏ theo duyệt 2026-11-17; số cuối kiểm ở E2E-AC-11 và ST-17.AC-3) (kiểm: lệnh + grep).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/sales/sales.service.ts` (8 truy vấn); test mới vào `POS_API/src/sales/tests/payment.integration.test.ts`.
  - Chữ ký hàm/class: như "Produces".
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1; chạy trên mã cũ.
    2. Chuyển 8 truy vấn; `evaluatePromotion({... startAt: promo.start_at, endAt: promo.end_at ...})` nhận `Date` từ entity như raw.
    3. Chạy lại; `npm test`.
  - Quy tắc nghiệp vụ: mã giảm giá viết hoa sau `trim` (`:267`), một đơn một mã (`PROMOTION_ALREADY_APPLIED`).
  - Bảng edge case: `max_discount_amount` `null` → `null` (giữ `:254`); `min_order_amount` `null` → `BigInt(0)` (giữ `:255`).
  - Ảnh hưởng tới code hiện có: `TransferAttemptsService` (`transfer-attempts.service.ts:84,149`) và `SePayWebhookService` (`sepay-webhook.service.ts:66`) gọi `evaluateInvoicePricing` — chữ ký và kiểu trả giữ nguyên.
  - Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `20261110-backlog-payment-preview-non-open-invoice.md` (tag payment-preview) → không đổi điều kiện OPEN của `paymentPreview` (ST-16).
- Test viết trước:
  - [x] `test_ST15_AC1_apply_promotion_lock_sequence` — input: áp mã; expected: như AC-1.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-16: sales phần E (thanh toán: 0đ, tiền mặt, hoàn tất, xem trước)
- depends_on: ST-15
- Interfaces:
  - Consumes: `Payment`, `TransferAttempt`, `PromotionCode`, `InvoicePromotionCode`, `StockMovement`, `ProductSizeIngredient`, `ToppingIngredient`, `Ingredient`, `BranchIngredientStock` từ ST-1; `InvoiceItem`, `InvoiceItemTopping` có sẵn; helper ST-12; `evaluateInvoicePricing` ST-15.
  - Produces (chữ ký giữ nguyên, ST-10/ST-11 gọi): `async finalizeInvoice(manager: EntityManager, invoiceId: string, actorId: string | null): Promise<void>`.
- Truy vấn (`sales.service.ts`, 24; bản 2 theo quy tắc 2026-11-17):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 293 | `completeZero` | (1)-(3) không đủ: advisory lock (L5) | QB + chú thích L5: `manager.createQueryBuilder().select('pg_advisory_xact_lock(hashtextextended(:lockKey, 0))', 'locked').fromDummy().setParameter('lockKey', normalized).getRawOne()`; giữ chú thích sẵn có dòng 292 |
  | 294 | `completeZero` | (1) | `manager.getRepository(Invoice).find({ where: { zero_completion_key: normalized }, select: { id: true } })` |
  | 299 | `completeZero` | (1) | `existsBy(Payment, { idempotency_key })` rồi `existsBy(TransferAttempt, { idempotency_key })` |
  | 303 | `completeZero` | (1) | `existsBy(InvoiceItem, { invoice_id })` |
  | 305 | `completeZero` (khóa mã giảm giá) | (3) | như `transfer-attempts.service.ts:82` (ST-10) |
  | 310 | `completeZero` | (2) | `manager.getRepository(Invoice).update({ id: invoiceId }, { zero_completion_key: normalized })` |
  | 327 | `payCash` | (1)-(3) không đủ: advisory lock (L5) | QB + chú thích L5, như 293 |
  | 328 | `payCash` | (1) | `findOneBy(Payment, { idempotency_key })` |
  | 334 | `payCash` | (1) | `existsBy(Invoice, { zero_completion_key })` rồi `existsBy(TransferAttempt, { idempotency_key })` |
  | 338 | `payCash` | (1) | `existsBy(InvoiceItem, { invoice_id })` |
  | 340 | `payCash` (khóa mã giảm giá) | (3) | như 305 |
  | 346 | `payCash` (quỹ mở + tiền mặt đã thu) | (1)-(3) không đủ: tổng tiền `SUM` (L1) | QB + chú thích L1: `CashReconciliation` `r`, `select('r.opening_cash', 'opening_cash').addSelect("COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE i.work_shift_id=r.work_shift_id AND i.status='PAID' AND p.method='CASH'),0)", 'cash_sales')`, `where('r.work_shift_id = :shiftId')`, `getRawOne()` |
  | 352 | `payCash` (insert, cần `paid_at`) | (2)+(1) | `await manager.getRepository(Payment).insert({ id, invoice_id, method: 'CASH', amount, tendered_amount, change_amount, idempotency_key, idempotency_request_hash, created_by })`; `cashPaymentView(await manager.getRepository(Payment).findOneByOrFail({ id }), false)` |
  | 366 | `finalizeInvoice` (khóa hóa đơn) | (1) | `manager.getRepository(Invoice).findOne({ where: { id: invoiceId }, lock: { mode: 'pessimistic_write' } })` |
  | 368 | `finalizeInvoice` | (1) | `existsBy(InvoiceItem, { invoice_id })` |
  | 370 | `finalizeInvoice` (khóa mã giảm giá) | (3) | như 305 |
  | 374 | `finalizeInvoice` (nguyên liệu cần trừ) | (1)-(3) không đủ: hai nguồn công thức cộng `numeric` trong một statement (L3) | QB + chú thích L3 theo dòng E5 (`:374`) của "Bảng chuyển 6 truy vấn khó"; giữ thêm chú thích `// Two grouped sub-queries replace UNION ALL; the sum stays in PostgreSQL numeric` ngay dưới chú thích L3 |
  | 381 | `finalizeInvoice` | (2) | `manager.getRepository(PromotionCode).update({ id: pricing.promotionCodeId }, { used_count: () => 'used_count + 1', updated_at: () => 'now()' })` |
  | 382 | `finalizeInvoice` | (2) | `manager.getRepository(InvoicePromotionCode).update({ invoice_id: invoiceId }, { discount_amount })` |
  | 385 | `finalizeInvoice` (ghi sổ kho) | (2) | `manager.getRepository(StockMovement).insert({ id: randomUUID(), branch_id, ingredient_id: requirement.ingredient_id, type: 'SALE', quantity: requirement.quantity.startsWith('-') ? requirement.quantity.slice(1) : \`-${requirement.quantity}\`, balance_after: '0', invoice_id: invoiceId, created_by: actorId, source: actorId === null ? 'SYSTEM' : 'USER' })` trong vòng lặp theo thứ tự `ingredient_id` như cũ |
  | 389 | `finalizeInvoice` | (2) | `manager.getRepository(Invoice).update({ id: invoiceId }, { status: 'PAID', subtotal, discount_amount, total_amount, paid_at: () => 'now()', updated_at: () => 'now()' })` |
  | 397 | `paymentPreview` | (1) | `this.db.getRepository(InvoicePromotionCode).findOne({ where: { invoice_id }, select: { invoice_id: true, code: true } })` |
  | 398 | `paymentPreview` (món thiếu công thức) | (3) bốn `find` trên một hóa đơn (số dòng nhỏ, giới hạn bởi hóa đơn) | `const items = await this.db.getRepository(InvoiceItem).find({ where: { invoice_id: invoiceId }, select: { id: true, product_size_id: true }, order: { id: 'ASC' } })`; `const sized = new Set((items.length ? await this.db.getRepository(ProductSizeIngredient).find({ where: { product_size_id: In(items.map(i => i.product_size_id)) }, select: { product_size_id: true, ingredient_id: true } }) : []).map(r => r.product_size_id))`; `const tops = items.length ? await this.db.getRepository(InvoiceItemTopping).find({ where: { invoice_item_id: In(items.map(i => i.id)) }, select: { id: true, invoice_item_id: true, topping_id: true } }) : []`; `const topped = new Set((tops.length ? await this.db.getRepository(ToppingIngredient).find({ where: { topping_id: In(tops.map(t => t.topping_id)) }, select: { topping_id: true, ingredient_id: true } }) : []).map(r => r.topping_id))`; `missing = items.filter(i => !sized.has(i.product_size_id) \|\| tops.some(t => t.invoice_item_id === i.id && !topped.has(t.topping_id)))` giữ thứ tự `id` tăng dần như `ORDER BY i.id` cũ; kết quả mảng `{ id }` như cũ |
  | 402 | `paymentPreview` (cảnh báo âm kho) | (1)-(3) không đủ: như 374 (L3) | QB + chú thích L3 theo dòng E5 (`:402`): cùng khung với 374, `select('g.id', 'ingredient_id')`, `leftJoin(BranchIngredientStock, 's', 's.ingredient_id = g.id AND s.branch_id = :branchId')`, `andWhere('COALESCE(s.current_stock, 0) - (COALESCE(pr.quantity, 0) + COALESCE(tr.quantity, 0)) < 0')`, `orderBy('g.id')`, `.setParameters({ invoiceId, branchId: invoice.branch_id })`, `getRawMany()`; giữ thêm chú thích `UNION ALL` như 374 |
- AC riêng:
  - [x] ST-16.AC-1: Given hóa đơn OPEN có mã giảm giá, When `payCash` khi `captureSql` bật, Then `lockSequence` bằng mảng ghi trên mã cũ (kỳ vọng suy từ dòng 327, `writable`, 340, 366, 370: `['advisory', 'UPDATE:work_shifts,branches', 'UPDATE:invoices', 'UPDATE:promotion_codes', 'UPDATE:invoices', 'UPDATE:promotion_codes']`; sau chuyển token `UPDATE:work_shifts,branches` tách thành `UPDATE:work_shifts`, `UPDATE:branches` theo G-17); tương tự `completeZero` (kiểm: integration).
  - [x] ST-16.AC-2: Given công thức món 0.500 nguyên liệu X, số lượng 2, tồn X 10.000, When trả tiền mặt, Then có 1 dòng `stock_movements` `type` `SALE`, `quantity` `-1.000`, `source` `USER`; tồn X = `9.000` (test có sẵn `payment.integration.test.ts`/`cancel-paid.integration.test.ts`; thiếu khẳng định `quantity` thì thêm) (kiểm: integration).
  - [x] ST-16.AC-3: Given key đã dùng cho QR, When `payCash` với key đó, Then 409 `IDEMPOTENCY_KEY_REUSED`; Given key đã dùng cho tiền mặt, When `completeZero` với key đó, Then 409 cùng mã (kiểm: integration; thêm nếu chưa có).
  - [x] ST-16.AC-4: Given test có sẵn (`Promise.all` payCash `:548`, completeZero `:673`, `MISSING_RECIPE`, `NEGATIVE_STOCK`, `[R14-1]` vượt trần), When `npm test`, Then exit 0, `# fail 0` (mốc đếm `// QueryBuilder:` giữa chừng đã bỏ theo duyệt 2026-11-17; số cuối kiểm ở E2E-AC-11 và ST-17.AC-3) (kiểm: lệnh + grep).
  - [x] ST-16.AC-5: Given webhook thanh toán (`created_by` `null`), When `finalizeInvoice`, Then dòng sổ kho `source` `SYSTEM`, `created_by` `null` (test có sẵn `[B-41]`.. trong `cancel-paid.integration.test.ts`) (kiểm: integration).
  - [x] ST-16.AC-6: Given hóa đơn 2 dòng: dòng 1 size S (công thức X 0.500, Y 0.125) số lượng 3 kèm topping T số lượng 2 (công thức X 0.250, Z 1.000); dòng 2 size M (công thức Y 0.200) số lượng 1, không topping; tồn X, Y, Z đủ, When trả tiền mặt, Then `stock_movements` `SALE` đúng 3 dòng theo thứ tự `ingredient_id` tăng dần với `quantity` X `-3.000` (0.500×3 + 0.250×2×3), Y `-0.575` (0.125×3 + 0.200×1), Z `-6.000` (1.000×2×3); giá trị và thứ tự y như mã cũ (ghi khi chạy trên mã cũ) (kiểm: integration).
  - [x] ST-16.AC-7: Given cùng hóa đơn AC-6 và tồn chi nhánh X = `3.000`, Y = `0.574`, Z không có dòng `branch_ingredient_stocks`, When `GET` xem trước thanh toán, Then `warnings` `NEGATIVE_STOCK` đúng cho Y và Z (theo thứ tự `ingredient_id`), KHÔNG có X (tồn bằng đúng lượng cần); kết quả y như mã cũ (kiểm: integration).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/sales/sales.service.ts` (24 truy vấn: 5 QB có chú thích `// QueryBuilder:` cộng 2 chú thích một dòng về thay `UNION ALL`; 19 method theo cột "Đích"; import `In`); test mới vào `POS_API/src/sales/tests/payment.integration.test.ts`.
  - Chữ ký hàm/class: không đổi (`completeZero`, `payCash`, `cashPaymentView`, `finalizeInvoice`, `paymentPreview`).
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1, AC-6, AC-7 (và AC-2, AC-3 nếu thiếu); chạy trên mã cũ, ghi giá trị thật.
    2. Chuyển 24 truy vấn theo cột "Đích"; thêm 5 dòng `// QueryBuilder:` và 2 chú thích `UNION ALL` (dòng cũ 374, 402); giữ chú thích sẵn có `sales.service.ts:292`.
    3. Chạy lại; `npm test`.
  - Quy tắc nghiệp vụ: thanh toán, đổi trạng thái hóa đơn và trừ kho trong một transaction (`CLAUDE.md`); `stock_movements` chỉ thêm dòng (trigger `stock_movements_append_only`); idempotency bằng `Idempotency-Key` (`docs/api-spec.md`).
  - Bảng edge case:
    - Không có công thức → không có dòng sổ kho, vẫn `PAID`.
    - `quantity` `numeric` dạng `1.000` → `-CAST('1.000' AS numeric)` = `-1.000` (giống `-$4::numeric`).
    - Tổng tiền mặt vượt `MAX_MONEY` → 422 `VALIDATION_ERROR` `Số tiền vượt giới hạn cho phép.` (giữ `:350-351`).
    - Nguyên liệu chỉ có ở công thức topping (Z) → `pr` NULL, `quantity` = `0 + tr.quantity` (AC-6).
    - Cùng nguyên liệu ở cả món và topping (X) → một dòng sổ kho, tổng hai nguồn (AC-6).
    - Tồn bằng đúng lượng cần → không cảnh báo (`< 0`, không `<= 0`) (AC-7).
  - Ảnh hưởng tới code hiện có: `finalizeInvoice` được `transfer-attempts.service.ts:158`, `sepay-webhook.service.ts:82` gọi — chữ ký giữ nguyên.
  - Tác dụng phụ: trigger `apply_stock_movement` cập nhật tồn như cũ.
- Lỗi cũ liên quan: `20261111-cash-reconciliation-exceeds-money-limit.md` → giữ kiểm trần sau `writable`; `20261109-cash-close-shift-zero-cash-sales.md` (tag shifts, cash) → tổng tiền mặt chỉ tính `PAID` + `CASH`; `20261113-sprint09-test-gaps-money-and-concurrency.md`.
- Test viết trước:
  - [x] `test_ST16_AC1_pay_cash_lock_sequence` — input: trả tiền mặt và hoàn tất 0đ; expected: mảng ghi trên mã cũ.
  - [x] `test_ST16_AC2_sale_movement_quantity` (chỉ khi chưa có) — input/expected: như AC-2.
  - [x] `test_ST16_AC3_key_reused_across_tables` (chỉ khi chưa có) — input/expected: như AC-3.
  - [x] `test_ST16_AC6_requirements_product_plus_topping` — input/expected: như AC-6.
  - [x] `test_ST16_AC7_negative_stock_preview` — input/expected: như AC-7.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-17: sales phần F (hủy đơn OPEN và PAID)
- depends_on: ST-16
- Interfaces:
  - Consumes: `Payment`, `PromotionCode`, `InvoicePromotionCode`, `StockMovement` từ ST-1; helper ST-12.
  - Produces: Không có
- Truy vấn (`sales.service.ts`, 9; bản 2 theo quy tắc 2026-11-17):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 511 | `cancel` | (2) | `manager.getRepository(Invoice).update({ id }, { status: 'CANCELLED', cancel_reason: reason.trim(), cancelled_by: user.id, cancelled_at: () => 'now()', updated_at: () => 'now()' })` |
  | 521 | `cancelPaid` (khóa ca) | (1) | `manager.getRepository(WorkShift).findOne({ where: { id: row.work_shift_id }, select: { id: true, status: true }, lock: { mode: 'pessimistic_write' } })` |
  | 526 | `cancelPaid` | (1) | `manager.getRepository(Payment).findOne({ where: { invoice_id: row.id }, select: { id: true, method: true, amount: true } })` |
  | 528 | `cancelPaid` (két: quỹ mở, tiền mặt, chi phí) | (1)-(3) không đủ: tổng tiền `SUM` (L1) | QB + chú thích L1: `CashReconciliation` `r`, select `r.opening_cash::text` → `opening_cash`, sub-select tiền mặt `::text` → `cash_sales`, sub-select chi phí từ két `::text` → `expenses` (nguyên biểu thức dòng 528-533), `where('r.work_shift_id = :shiftId')`, `getRawOne()` |
  | 539 | `cancelPaid` (khóa mã giảm giá) | (3) | như `transfer-attempts.service.ts:82` (ST-10); khi có dòng nối thì trả `[promo]` cho vòng `for` dòng 540-543 |
  | 542 | `cancelPaid` | (2) | `manager.getRepository(PromotionCode).update({ id: promo.id }, { used_count: () => 'used_count - 1', updated_at: () => 'now()' })`; giữ chú thích `:541` |
  | 544 | `cancelPaid` | (1) | `manager.getRepository(StockMovement).find({ where: { invoice_id: row.id, type: 'SALE' }, select: { id: true, branch_id: true, ingredient_id: true, quantity: true }, order: { ingredient_id: 'ASC', id: 'ASC' } })` |
  | 547 | `cancelPaid` (đảo sổ kho) | (2) | `manager.getRepository(StockMovement).insert({ id: randomUUID(), branch_id: m.branch_id, ingredient_id: m.ingredient_id, type: 'SALE_REVERSAL', quantity: m.quantity.startsWith('-') ? m.quantity.slice(1) : \`-${m.quantity}\`, balance_after: '0', invoice_id: row.id, created_by: user.id, source: 'USER' })` (dòng `SALE` có `quantity` âm, ví dụ `-1.000` → `1.000`) |
  | 551 | `cancelPaid` | (2) | như 511 với `reason` |
- AC riêng:
  - [x] ST-17.AC-1: Given hóa đơn PAID tiền mặt có mã giảm giá, ca còn mở, user có `invoice.cancel_paid`, When hủy khi `captureSql` bật, Then `lockSequence` = `['UPDATE:work_shifts', 'UPDATE:invoices', 'UPDATE:promotion_codes']` trước và sau khi chuyển (kỳ vọng suy từ chú thích `sales.service.ts:518` "Lock order: shift -> invoice -> promotion codes -> stock") (kiểm: integration).
  - [x] ST-17.AC-2: Given test có sẵn `cancel-paid.integration.test.ts` (`CANCEL_EXCEEDS_DRAWER`, `SALE_REVERSAL`, `used_count` giảm, `[B-41]`, `[B-42]`, `[B-47]`, `[B-48]`) và `manager-cancel.integration.test.ts`, When `npm test`, Then xanh (kiểm: integration).
  - [x] ST-17.AC-3: Given sau sửa, When grep `.query(` trong `sales.service.ts`, Then 0; `grep -c "// QueryBuilder:" sales/sales.service.ts` = 11; không có `setLock(` mới; `npm test` exit 0, `# fail 0` (kiểm: grep + lệnh).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/sales/sales.service.ts` (9 truy vấn); test mới vào `POS_API/src/sales/tests/cancel-paid.integration.test.ts`.
  - Chữ ký hàm/class: không đổi.
  - DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Viết test AC-1; chạy trên mã cũ.
    2. Chuyển 9 truy vấn.
    3. Chạy lại; `npm test`.
  - Quy tắc nghiệp vụ: hủy PAID chỉ khi ca của đơn còn mở (`CANCEL_NOT_ALLOWED`, `:522`); quyền `invoice.cancel_paid` kiểm trước khóa (`:520`); CHECK `used_count >= 0` (chú thích `:541`). Không đụng PB-16.
  - Bảng edge case: payment `TRANSFER` → bỏ kiểm két; không có dòng `SALE` → không đảo kho.
  - Ảnh hưởng tới code hiện có: Không có.
  - Tác dụng phụ: trigger `apply_stock_movement` cộng lại tồn.
- Lỗi cũ liên quan: `20261113-sprint09-test-gaps-money-and-concurrency.md` → "Mỗi cặp thao tác cùng khóa dòng gốc (ca) cần một test đồng thời" — test có sẵn `[B-48]` giữ xanh.
- Test viết trước:
  - [x] `test_ST17_AC1_cancel_paid_lock_sequence` — input: hủy PAID tiền mặt có mã; expected: như AC-1.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

### Quy định chung cho ST-19..ST-23 (QueryBuilder có sẵn trên `master`, user trả lời Q1 "làm luôn" ngày 2026-11-17)
- Nguồn danh sách: `git grep -n "createQueryBuilder\|setLock(" master -- POS_API/src ':!*.test.ts' ':!**/tests/**' ':!**/migrations/**'` (planner chạy 2026-11-17): auth 21, menu 16, shifts 8, platform 6, organization 5, users 4, bootstrap-admin 1 = 61 câu lệnh; inventory, sales, promotions, reports trên `master` không có. Số dòng trong bảng là dòng trên `master`; working tree đã lệch +1 ở `auth.service.ts` (ST-3 thêm import) — tdd tìm theo nội dung.
- Mỗi sub-task: (1) chạy test có sẵn của module (xanh) và viết test đặc tả còn thiếu trên mã hiện tại (characterization, ghi giá trị thật vào evidence); (2) chuyển theo bảng; (3) chạy lại test module rồi `npm test`. Không đổi hành vi, mã lỗi, message, thứ tự khóa.
- Điều kiện giá trị rỗng (bổ sung quy định chung, G-20): khi SQL cũ so cột với giá trị danh tính có thể `null` (ví dụ `u.store_id = :storeId` với `storeId` `null` → không khớp dòng nào → 404), code mới phải kiểm trước và ném đúng lỗi cũ, vì `find*` bỏ điều kiện `null` (`SelectQueryBuilder.js:2505-2510`).
- So với đồng hồ DB (`now()`): dùng `Raw((alias) => \`${alias} > now()\`)` (G-19); không thay bằng `new Date()` của Node (lỗi `20261113-payment-test-seed-db-clock-flaky.md`: không trộn hai đồng hồ).
- Danh sách có phân trang qua helper nhận QueryBuilder (`menuPageResponse`, `organizationPageResponse`, `platformPageResponse` dùng cho trang, cursor `to_char ... .US` hoặc so sánh bộ): giữ QueryBuilder L2 (đổi helper dùng chung là thay đổi lớn hơn, ngoài yêu cầu); đếm riêng bằng `count` khi code hiện tại gọi `getCount()` trực tiếp trong service.

### ST-19: auth — QueryBuilder có sẵn
- depends_on: ST-17, ST-3b
- Interfaces:
  - Consumes: `captureSql(t: TestContext): string[]`, `lockSequence(sql: readonly string[]): string[]` từ ST-2; entity `User`, `Role`, `Store`, `RefreshToken`, `RolePermission`, `AuthRateEvent` có sẵn (relation `RefreshToken.user`, `User.role`, `User.store`, `RolePermission.permission` đã khai báo, `auth/entities/`).
  - Produces: Không có
- Truy vấn (`POS_API/src/auth/auth.service.ts`, 21; dòng trên `master`):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 37 | `userById` | (1) relation | `this.db.getRepository(User).findOne({ where: { id }, relations: { role: true, store: true } })` |
  | 52 | `summary` | (1) relation + `order` lồng (SQL đã dựng) | `this.db.getRepository(RolePermission).find({ where: { role_id: user.role_id }, relations: { permission: true }, order: { permission: { code: 'ASC' } } })` |
  | 75 | `checkRate` (đếm + mốc cũ nhất) | (3) `count` + `findOne` | `const where = { scope, key_hash: key, occurred_at: Raw((a) => \`${a} > now() - (:seconds * interval '1 second')\`, { seconds }) }`; `const count = await repo.count({ where })`; `const oldest = count ? await repo.findOne({ where, select: { id: true, occurred_at: true }, order: { occurred_at: 'ASC' } }) : null`; giữ công thức `retryAfter` (dùng `oldest!.occurred_at.getTime()`) — SQL đã dựng: `... ("AuthRateEvent"."occurred_at" > now() - ($3 * interval '1 second'))` |
  | 99 | `recordRefreshAttempt` (dọn) | (2) `delete` + `Raw` | `manager.getRepository(AuthRateEvent).delete({ occurred_at: Raw((a) => \`${a} < now() - interval '15 minutes'\`) })` — SQL `DELETE FROM "auth_rate_events" WHERE "occurred_at" < now() - interval '15 minutes'` (đã dựng) |
  | 115 | `login` (dọn) | (2) | như 99 |
  | 123 | `login` (khóa user) | (1) | `manager.getRepository(User).findOne({ where: { username: normalized }, select: { id: true }, lock: { mode: 'pessimistic_write' } })` |
  | 129 | `login` (đọc role/store sau khóa) | (1) relation | `manager.getRepository(User).findOne({ where: { id: identity.id }, relations: { role: true, store: true } })` (role từ INNER thành LEFT JOIN: `users.role_id` NOT NULL có FK nên cùng kết quả) |
  | 139 | `login` (khóa share store) | (1) | `manager.getRepository(Store).findOne({ where: { id: user.store_id }, lock: { mode: 'pessimistic_read' } })` |
  | 186 | `authenticateAccess` (phiên còn hiệu lực) | (1) `IsNull` + `Raw` | `this.db.getRepository(RefreshToken).findOne({ where: { user_id: claims.sub, session_id: claims.sid, revoked_at: IsNull(), expires_at: Raw((a) => \`${a} > now()\`) }, select: { id: true } })` |
  | 252 | `refresh` (khóa user) | (1) | `userRepo.findOne({ where: { id: metadata.user_id }, select: { id: true }, lock: { mode: 'pessimistic_write' } })` |
  | 259 | `refresh` (khóa share store) | (1) | như 139 với `userForStore.store_id` |
  | 264 | `refresh` (khóa token, đọc user/role/store) | (1) relation + `lock.tables` | `(await rtRepo.find({ where: { token_hash: hash }, relations: { user: { role: true, store: true } }, lock: { mode: 'pessimistic_write', tables: ['refresh_tokens'] } }))[0] ?? null` — chỉ khóa `refresh_tokens` như `OF rt` cũ (SQL đã dựng) |
  | 276 | `refresh` (thu hồi phiên bị replay) | (2) `update` + hàm | `rtRepo.update({ session_id: row.session_id }, { revoked_at: () => 'COALESCE(revoked_at, now())' })` |
  | 320 | `getCsrf` | (1) relation + `IsNull` + `Raw` | `this.db.getRepository(RefreshToken).findOne({ where: { token_hash: hash, revoked_at: IsNull(), expires_at: Raw((a) => \`${a} > now()\`) }, relations: { user: { store: true } } })` |
  | 345 | `logout` (khóa user) | (1) | như 252 |
  | 353 | `logout` (khóa token) | (1) | `rtRepo.findOne({ where: { token_hash: hash }, lock: { mode: 'pessimistic_write' } })` |
  | 359 | `logout` (còn phiên mới) | (1) | `rtRepo.exists({ where: { session_id: row.session_id, revoked_at: IsNull(), expires_at: Raw((a) => \`${a} > now()\`) } })` |
  | 364 | `logout` (thu hồi) | (2) `IsNull` trong criteria (SQL đã dựng) | `rtRepo.update({ session_id: row.session_id, revoked_at: IsNull() }, { revoked_at: new Date() })` (giữ `new Date()` như code cũ) |
  | 384 | `changePassword` (khóa user, đọc store) | (1) relation + `lock.tables` + `comment` | `(await userRepo.find({ where: { id: user.id }, relations: { store: true }, comment: 'SELECT u.password_hash', lock: { mode: 'pessimistic_write', tables: ['users'] } }))[0] ?? null` — giữ `comment` vì `auth.integration.test.ts:368` dò `query LIKE '%SELECT u.password_hash%'` (SQL đã dựng bắt đầu `/* SELECT u.password_hash */`) |
  | 393 | `changePassword` (phiên) | (1) | như 186 với `user.id`, `claims.sid` |
  | 416 | `changePassword` (thu hồi) | (2) | `rtRepo.update({ user_id: user.id, revoked_at: IsNull() }, { revoked_at: new Date() })` |
- AC riêng:
  - [x] ST-19.AC-1: Given user hợp lệ, When `login`, `refresh`, `logout`, `changePassword` khi `captureSql` bật (test `test_ST3_AC7_login_lock_sequence` có sẵn + test mới `test_ST19_AC1_auth_lock_sequences` cho ba thao tác còn lại, ghi mảng trên mã hiện tại trước khi đổi), Then `lockSequence` sau chuyển bằng mảng đã ghi (kiểm: integration).
  - [x] ST-19.AC-2: Given test có sẵn `auth/tests/auth.integration.test.ts` (giới hạn thử 5 lần/900 giây trả 429 có `retryAfter`, refresh replay thu hồi phiên, race đăng nhập/đổi mật khẩu dò `pg_stat_activity` ở dòng 61-62, 367-368), `auth.test.ts`, `session-branch-name.http.test.ts`, When chạy sau chuyển, Then xanh (kiểm: integration).
  - [x] ST-19.AC-3: Given 5 lần đăng nhập sai cùng username, When lần 6, Then 429 `TOO_MANY_REQUESTS` và `retryAfter` là số nguyên 1..900 (test mới `test_ST19_AC3_rate_limit_retry_after` nếu grep `retryAfter` trong test auth không có khẳng định giá trị) (kiểm: integration).
  - [x] ST-19.AC-4: Given sau sửa, When grep trong `auth/auth.service.ts`: `setLock(` 0; `createQueryBuilder(` chỉ còn 4 câu advisory; `// QueryBuilder:` 4; rồi `npm test`, Then exit 0, `# fail 0` (kiểm: grep + lệnh).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/auth/auth.service.ts` (import `IsNull`, `Raw` từ `typeorm`); test mới trong `POS_API/src/auth/tests/auth.integration.test.ts`.
  - Chữ ký hàm/class: không đổi. DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý: 1. viết AC-1 (ba mảng khóa), AC-3 nếu thiếu, chạy trên mã hiện tại, lưu `evidence/ST-19/before.log`; 2. chuyển 21 câu; 3. chạy AC-1..AC-3, module auth, `npm test`, lưu `after.log`, `suite.log`, grep AC-4.
  - Quy tắc nghiệp vụ: khóa user rồi mới đọc role (lỗi `2026-10-30-pb04-login-role-lock-race.md`, M-14); refresh/logout khóa user rồi session (lỗi `2026-10-28-pb02-session-revocation-races.md`); đếm giới hạn bằng đồng hồ DB.
  - Bảng edge case: `user.store_id` `null` (PLATFORM_ADMIN) → không gọi khóa store (giữ toán tử `?:` cũ); `oldest` khi `count` = 0 → không tính `retryAfter`; token không tồn tại → `null` → `invalid`.
  - Ảnh hưởng tới code hiện có: Không có. Tác dụng phụ: `checkRate` thêm một câu SELECT khi đã chạm giới hạn.
- Lỗi cũ liên quan: `2026-10-28-pb02-login-password-race.md` → khóa `FOR UPDATE` user trước khi so mật khẩu; `2026-10-30-pb04-login-role-lock-race.md`.
- Test viết trước:
  - [x] `test_ST19_AC1_auth_lock_sequences` — input: refresh, logout, changePassword; expected: mảng ghi trên mã hiện tại.
  - [x] `test_ST19_AC3_rate_limit_retry_after` (chỉ khi chưa có) — input: 6 lần sai; expected: 429, `retryAfter` 1..900.
- Tiến độ:
  - [x] Red (characterization)  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-20: users, platform, bootstrap-admin — QueryBuilder có sẵn
- depends_on: ST-19
- Interfaces:
  - Consumes: `captureSql`, `lockSequence` từ ST-2; `normalizeUsername` không dùng.
  - Produces: Không có
- Truy vấn (dòng trên `master`):
  | File:dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | `users/users.service.ts:39-42` | `staff` (khóa nhân viên trong phạm vi) | (1) + kiểm rỗng (G-20) | `if (!actor.storeId \|\| (!actor.permissions.includes('branch.access_all') && !actor.branchId)) throw httpError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản nhân viên.')`; `manager.getRepository(User).findOne({ where: { id, store_id: actor.storeId, ...(!actor.permissions.includes('branch.access_all') ? { branch_id: actor.branchId } : {}) }, select: { id: true }, lock: { mode: 'pessimistic_write' } })` |
  | `users/users.service.ts:44-45` | `staff` (đọc role sau khóa) | (1) relation + `In` | `manager.getRepository(User).findOne({ where: { id: identity.id, role: { name: In(['MANAGER', 'CASHIER']) } }, relations: { role: true } })` |
  | `users/users.service.ts:51-52` | `revoke` | (2) `IsNull` | `manager.getRepository(RefreshToken).update({ user_id: id, revoked_at: IsNull() }, { revoked_at: () => 'now()' })` |
  | `users/users.service.ts:57` | `listStaff` | (1)-(3) không đủ: helper `organizationPageResponse` nhận QueryBuilder cho cursor (L2) | Giữ QB + chú thích L2 |
  | `platform/platform.service.ts:54-55` | `listStores` (đếm) | (1) | `const total = await this.db.getRepository(Store).count()` |
  | `platform/platform.service.ts:56-61` | `listStores` (trang) | (1)-(3) không đủ: cursor `to_char ... .US` (L2) | Giữ QB (chỉ trang) + chú thích L2 |
  | `platform/platform.service.ts:83` | `setStoreStatus` (khóa) | (1) | `repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })` |
  | `platform/platform.service.ts:92-95` | `setStoreStatus` (thu hồi phiên của cửa hàng) | (3) `find` + `update` với `In` | `const ids = (await manager.getRepository(User).find({ where: { store_id: id }, select: { id: true } })).map(u => u.id)`; `await manager.getRepository(RefreshToken).update({ user_id: In(ids), revoked_at: IsNull() }, { revoked_at: () => 'now()' })` (`In([])` → `0=1`, SQL đã dựng) |
  | `platform/platform.service.ts:104-107` | `listOwners` (đếm) | (1) relation | `this.db.getRepository(User).count({ where: { role: { name: 'OWNER' }, store_id: Not(IsNull()) } })` (`INNER JOIN stores` cũ tương đương `store_id IS NOT NULL` vì FK) |
  | `platform/platform.service.ts:108-115` | `listOwners` (trang) | (1)-(3) không đủ: cursor (L2) | Giữ QB (chỉ trang) + chú thích L2 |
  | `platform/platform.service.ts:131-133` | `resetOwnerPassword` (khóa OF u, lọc role) | (1) relation + `lock.tables` | `(await manager.getRepository(User).find({ where: { id, role: { name: 'OWNER' } }, relations: { role: true }, lock: { mode: 'pessimistic_write', tables: ['users'] } }))[0] ?? null` |
  | `platform/platform.service.ts:139-140` | `resetOwnerPassword` (thu hồi) | (2) | `update({ user_id: id, revoked_at: IsNull() }, { revoked_at: () => 'now()' })` |
  | `bootstrap-admin.ts:12-16` | `bootstrapAdmin` (đã có PLATFORM_ADMIN?) | (1) relation | `userRepo.findOne({ where: { role: { name: 'PLATFORM_ADMIN' } }, select: { id: true } })` |
- AC riêng:
  - [x] ST-20.AC-1: Given OWNER/MANAGER, When `patchStaff`, `resetStaffPassword`, `setStoreStatus` (SUSPENDED), `resetOwnerPassword` khi `captureSql` bật (test mới `test_ST20_AC1_lock_sequences`, ghi mảng trên mã hiện tại), Then mảng sau chuyển bằng mảng đã ghi (kiểm: integration).
  - [x] ST-20.AC-2: Given test có sẵn `platform/tests/*.test.ts`, `organization/tests/organization.acceptance.test.ts` (nhân viên, `USERNAME_EXISTS`, phạm vi chi nhánh), `foundation.test.ts` (bootstrap), When chạy sau chuyển, Then xanh (kiểm: integration).
  - [x] ST-20.AC-3: Given cửa hàng có 2 user có phiên còn hạn và cửa hàng khác có 1 user có phiên, When tạm khóa cửa hàng thứ nhất, Then 2 phiên của cửa hàng đó có `revoked_at` khác `null`, phiên của cửa hàng khác vẫn `null` (test mới `test_ST20_AC3_suspend_revokes_only_store_sessions` nếu test có sẵn không khẳng định cửa hàng khác) (kiểm: integration).
  - [x] ST-20.AC-4: Given MANAGER không có `branch_id` hoặc nhân viên cửa hàng khác, When `patchStaff`, Then 404 `NOT_FOUND` `Không tìm thấy tài khoản nhân viên.` như mã hiện tại (test mới `test_ST20_AC4_staff_scope_null_identity`, ghi trên mã hiện tại) (kiểm: integration).
  - [x] ST-20.AC-5: Given sau sửa, When grep: `setLock(` 0 ở 3 file; `// QueryBuilder:` `users.service.ts` 1, `platform.service.ts` 2, `bootstrap-admin.ts` 1 (advisory ST-3b); `npm test` exit 0, `# fail 0` (kiểm: grep + lệnh).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/users/users.service.ts`, `POS_API/src/platform/platform.service.ts`, `POS_API/src/bootstrap-admin.ts` (import `In`, `IsNull`, `Not`); test mới trong `POS_API/src/platform/tests/platform.integration.test.ts` (AC-1 phần platform, AC-3) và `POS_API/src/organization/tests/organization.integration.test.ts` (AC-1 phần nhân viên, AC-4).
  - Chữ ký hàm/class: không đổi. DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý: 1. viết AC-1, AC-3, AC-4 trên mã hiện tại, lưu `evidence/ST-20/before.log`; 2. đổi 10 lời gọi sang method (users 3, platform 4 + 2 đếm tách khỏi builder, bootstrap 1), giữ 3 QB có chú thích; 3. chạy lại, module, `npm test`, grep.
  - Quy tắc nghiệp vụ: BR-83 thứ bậc vai trò (`users.service.ts:16-21`); `PLATFORM_ADMIN` không đọc dữ liệu vận hành; store `SUSPENDED` thu hồi phiên.
  - Bảng edge case: `actor.storeId` `null` → 404 như cũ (G-20); cửa hàng không có user → `In([])` → không cập nhật.
  - Ảnh hưởng tới code hiện có: Không có. Tác dụng phụ: `setStoreStatus` thêm một câu SELECT.
- Lỗi cũ liên quan: `2026-10-30-pb04-login-role-lock-race.md` (M-14) → khóa user trước, đọc role ở câu sau.
- Test viết trước:
  - [x] `test_ST20_AC1_lock_sequences` — input: 4 thao tác; expected: mảng ghi trên mã hiện tại.
  - [x] `test_ST20_AC3_suspend_revokes_only_store_sessions` (chỉ khi chưa có) — input/expected: như AC-3.
  - [x] `test_ST20_AC4_staff_scope_null_identity` — input/expected: như AC-4.
- Tiến độ:
  - [x] Red (characterization)  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-21: organization — QueryBuilder có sẵn (module chưa có test khóa)
- depends_on: ST-20
- Interfaces:
  - Consumes: `captureSql`, `lockSequence` từ ST-2.
  - Produces: `branchInScope(manager: EntityManager, id: string, user: UserSummary, lock = false): Promise<Branch>` giữ nguyên chữ ký (được `users.service.ts:56,71` và `organization.service.ts:99,114` gọi).
- Truy vấn (`POS_API/src/organization/organization.service.ts`, 5; dòng trên `master`):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 46-50 | `branchInScope` (khóa share tùy chọn) | (1) + kiểm rỗng (G-20) | `if (!user.storeId \|\| (!user.permissions.includes('branch.access_all') && !user.branchId)) throw missing()`; `manager.getRepository(Branch).findOne({ where: { id, store_id: user.storeId, ...(!user.permissions.includes('branch.access_all') ? { id: user.branchId } : {}) }, ...(lock ? { lock: { mode: 'pessimistic_read' } } : {}) })` — lưu ý: điều kiện cũ là `b.id = :id AND b.id = :branchId`; khi `id !== user.branchId` thì code mới phải ném `missing()` trước (không ghi đè khóa `id` trong object) |
  | 56 | `listBranches` | (1)-(3) không đủ: helper cursor (L2) | Giữ QB + chú thích L2 |
  | 76-78 | `patchBranch` (khóa) | (1) + kiểm rỗng | như 46-50 với `lock: { mode: 'pessimistic_write' }` (cùng điều kiện phạm vi) |
  | 100 | `listTables` | (1)-(3) không đủ: helper cursor (L2) | Giữ QB + chú thích L2 |
  | 124-127 | `patchTable` (khóa OF t, lọc cửa hàng qua chi nhánh) | (1) relation + `lock.tables` | `if (!user.storeId \|\| (!all && !user.branchId)) throw missing()`; `(await repo.find({ where: { id, branch: { store_id: user.storeId }, ...(!all ? { branch_id: user.branchId } : {}) }, lock: { mode: 'pessimistic_write', tables: ['dining_tables'] } }))[0] ?? null` |
- AC riêng:
  - [x] ST-21.AC-1: Given OWNER và MANAGER, When `createTable` (gọi `branchInScope` có khóa share), `patchBranch`, `patchTable` khi `captureSql` bật (test mới `test_ST21_AC1_lock_sequences`, viết và chạy trên mã hiện tại trước — module chưa có test khóa), Then mảng sau chuyển bằng mảng đã ghi (kỳ vọng suy từ mã: `['SHARE:branches']`, `['UPDATE:branches']`, `['UPDATE:dining_tables']`) (kiểm: integration).
  - [x] ST-21.AC-2: Given MANAGER chi nhánh A, When `PATCH` chi nhánh B, `PATCH` bàn của chi nhánh B, tạo bàn ở chi nhánh B, và user không có `branch_id`, Then 404 với mã/message như mã hiện tại (test mới `test_ST21_AC2_scope_characterization`, ghi giá trị trên mã hiện tại) (kiểm: integration).
  - [x] ST-21.AC-3: Given test có sẵn `organization/tests/*.test.ts` (gồm `organization.acceptance.test.ts:513` dò `pg_blocking_pids`), When chạy sau chuyển và `npm test`, Then exit 0, `# fail 0`; grep `setLock(` 0, `// QueryBuilder:` 2 (kiểm: lệnh + grep).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/organization/organization.service.ts`; test mới trong `POS_API/src/organization/tests/organization.integration.test.ts`.
  - Chữ ký hàm/class: không đổi. DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý: 1. viết AC-1, AC-2 trên mã hiện tại (characterization, chạy xanh), lưu `evidence/ST-21/before.log`; 2. chuyển 3 câu, thêm 2 chú thích; 3. chạy lại, module, `npm test`, grep.
  - Quy tắc nghiệp vụ: người không có `branch.access_all` chỉ thao tác chi nhánh mình (`CLAUDE.md`); `INITIAL_CASH_LOCKED` kiểm dưới khóa Branch (`organization.service.ts:83-90`).
  - Bảng edge case: `id` khác `user.branchId` với MANAGER → `missing()` trước truy vấn (cùng 404 như SQL cũ).
  - Ảnh hưởng tới code hiện có: caller `branchInScope` không đổi. Tác dụng phụ: Không có.
- Lỗi cũ liên quan: M-1 (`20261110-backlog-branch-scope-null-branchid-fail-open.md`) → kiểm `branchId` rỗng trước truy vấn.
- Test viết trước:
  - [x] `test_ST21_AC1_lock_sequences` — input: 3 thao tác; expected: mảng ghi trên mã hiện tại.
  - [x] `test_ST21_AC2_scope_characterization` — input/expected: như AC-2.
- Tiến độ:
  - [x] Red (characterization)  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-22: menu — QueryBuilder có sẵn (module chưa có test khóa; không có khóa dòng)
- depends_on: ST-21
- Interfaces:
  - Consumes: Không có.
  - Produces: Không có
- Truy vấn (`POS_API/src/menu/menu.service.ts`, 16; dòng trên `master`; relation `Product.category`, `ProductSize.product`, `ProductSize.size`, `CategoryTopping.topping` đã khai báo):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 108 | `listCategories` | (1)-(3) không đủ: helper `menuPageResponse` cursor (L2) | Giữ QB + chú thích L2 |
  | 276 | `listProducts` | (1)-(3) không đủ: helper cursor (L2) | Giữ QB + chú thích L2 |
  | 301 | `listProducts` (size của trang) | (1) relation + `In` + `order` lồng | `this.productSizeRepo.find({ where: { product_id: In(productIds) }, relations: { size: true }, order: { size: { sort_order: 'ASC', name: 'ASC' } } })` (chỉ khi `productIds.length > 0` như cũ) |
  | 342 | `getProduct` | (1) relation | `this.productRepo.findOne({ where: { id, category: { store_id: storeId } }, relations: { category: true } })` |
  | 350 | `getProduct` (size) | (1) | `this.productSizeRepo.find({ where: { product_id: id }, relations: { size: true }, order: { size: { sort_order: 'ASC' } } })` |
  | 409 | `patchProduct` | (1) | như 342 |
  | 448 | `patchProduct` (size) | (1) | `this.productSizeRepo.find({ where: { product_id: saved.id }, relations: { size: true } })` |
  | 476 | `deleteProduct` | (1) | `this.productRepo.findOne({ where: { id, category: { store_id: storeId } } })` |
  | 504 | `uploadProductImage` | (1) | như 476 với `productId` |
  | 533 | `getProductImage` | (1) `select` cột ẩn | `this.productRepo.findOne({ where: { id: productId, category: { store_id: storeId } }, select: { id: true, image_base64: true, image_mime: true } })` (SQL đã dựng có `"Product"."image_base64"`) |
  | 550 | `deleteProductImage` | (1) | như 476 — trả entity đầy đủ cột thường để `save` như cũ |
  | 571 | `createProductSize` | (1) | như 476 |
  | 607 | `patchProductSize` | (1) relation lồng | `this.productSizeRepo.findOne({ where: { id, product: { category: { store_id: storeId } } } })` |
  | 633 | `deleteProductSize` | (1) | như 607 |
  | 653 | `listToppings` | (1)-(3) không đủ: helper cursor (L2) | Giữ QB + chú thích L2 |
  | 747 | `listCategoryToppings` | (1) relation + `order` lồng | `this.categoryToppingRepo.find({ where: { category_id: categoryId, topping: { store_id: storeId } }, relations: { topping: true }, order: { topping: { name: 'ASC' } } })` |
- AC riêng:
  - [x] ST-22.AC-1: Given hai cửa hàng A, B, When OWNER A gọi `GET`/`PATCH`/`DELETE` món, ảnh món, size món, topping của danh mục của cửa hàng B, Then 404 với mã/message như mã hiện tại (`Món ăn không tồn tại.`, `Ảnh món không tồn tại.`, `Cấu hình giá theo kích cỡ không tồn tại.`, `Cấu hình kích cỡ không tồn tại.`, `Danh mục không tồn tại.`) (test mới `test_ST22_AC1_cross_store_404`, chạy trên mã hiện tại trước; module chưa có test này theo yêu cầu "module chưa có test khóa ... thêm test đặc tả hành vi trước") (kiểm: integration).
  - [x] ST-22.AC-2: Given món có 3 size `sort_order` 2, 1, 1 (tên `M`, `S`, `L`), When `GET` danh sách món và chi tiết món, Then thứ tự size như mã hiện tại (ghi giá trị thật); `GET` ảnh món trả đúng byte và mime đã upload (test mới `test_ST22_AC2_size_order_and_image`) (kiểm: integration).
  - [x] ST-22.AC-3: Given test có sẵn `menu/tests/*.test.ts`, When chạy sau chuyển và `npm test`, Then exit 0, `# fail 0`; grep `// QueryBuilder:` 3, `createQueryBuilder(` 3 (kiểm: lệnh + grep).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/menu/menu.service.ts` (import `In`); test mới trong `POS_API/src/menu/tests/menu.integration.test.ts` (file test duy nhất của module).
  - Chữ ký hàm/class: không đổi. DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý: 1. viết AC-1, AC-2 trên mã hiện tại (xanh), lưu `evidence/ST-22/before.log`; 2. chuyển 13 câu, thêm 3 chú thích; 3. chạy lại, module, `npm test`, grep.
  - Quy tắc nghiệp vụ: mọi ID tham chiếu phải cùng cửa hàng (`CLAUDE.md`).
  - Bảng edge case: `findOne` có `where` lồng chạy hai câu (DISTINCT + chính) — chấp nhận (không khóa); `sort_order` trùng → thứ tự phụ `name` chỉ có ở 301 như cũ.
  - Ảnh hưởng tới code hiện có: Không có. Tác dụng phụ: Không có.
- Lỗi cũ liên quan: `2026-11-06-pb07-sold-topping-delete.md`, `2026-11-06-pb07-uppercase-topping.md` (tag menu) → không đổi xử lý topping.
- Test viết trước:
  - [x] `test_ST22_AC1_cross_store_404` — input/expected: như AC-1.
  - [x] `test_ST22_AC2_size_order_and_image` — input/expected: như AC-2.
- Tiến độ:
  - [x] Red (characterization)  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-23: shifts — QueryBuilder có sẵn
- depends_on: ST-22, ST-7
- Interfaces:
  - Consumes: `captureSql`, `lockSequence` từ ST-2; relation `WorkShift.branch`, `WorkShift.user`, `WorkShift.closed_by_user`, `WorkShift.reconciliation` (`work-shift.entity.ts:42-56`).
  - Produces: Không có
- Truy vấn (`POS_API/src/shifts/shifts.service.ts`, 8; dòng trên `master`):
  | Dòng | Hàm | Đã thử | Đích |
  |---|---|---|---|
  | 144 | `getExpectedOpeningCash` (ca đóng gần nhất) | (1) relation + `order` | `this.db.getRepository(WorkShift).findOne({ where: { branch_id: branch.id, shift_type: 'CASHIER', status: 'CLOSED' }, relations: { reconciliation: true }, order: { ended_at: 'DESC', created_at: 'DESC' } })` |
  | 187-189 | `openShift` (khóa user) | (1) | `manager.getRepository(User).findOneOrFail({ where: { id: user.id, store_id: user.storeId! }, lock: { mode: 'pessimistic_write' } })` (`checkTenant` đã chặn `storeId` rỗng) |
  | 193-196 | `openShift` (khóa chi nhánh) | (1) | `manager.getRepository(Branch).findOne({ where: { id: branchId!, store_id: user.storeId! }, lock: { mode: 'pessimistic_write' } })` |
  | 226-235 | `openShift` (ca đóng có đối soát) | (1) relation + `Not(IsNull())` thay INNER JOIN | `manager.getRepository(WorkShift).findOne({ where: { branch_id: branch.id, shift_type: 'CASHIER', status: 'CLOSED', reconciliation: { id: Not(IsNull()) } }, relations: { reconciliation: true }, order: { ended_at: 'DESC', created_at: 'DESC' } })` |
  | 279-283 | `closeShift` (khóa OF s) | (1) relation + `lock.tables` | `(await manager.getRepository(WorkShift).find({ where: { id: shiftId, branch: { store_id: user.storeId! } }, lock: { mode: 'pessimistic_write', tables: ['work_shifts'] } }))[0] ?? null` |
  | 367-371 | `forceCloseShift` (khóa OF s) | (1) | như 279 |
  | 520-526 | `getShiftDetail` | (1) relation | `this.db.getRepository(WorkShift).findOne({ where: { id: shiftId, branch: { store_id: user.storeId! } }, relations: { branch: true, user: true, closed_by_user: true, reconciliation: true } })` |
  | 550-580 | `listShifts` | đếm (1); trang (1)-(3) không đủ: cursor `to_char ... .US` (L2) | Đếm: `count({ where: { branch: { store_id: user.storeId! }, ...(page.branchId ? { branch_id: page.branchId } : {}), ...(page.userId ? { user_id: page.userId } : {}), ...(page.status ? { status: page.status } : {}), ...(page.shiftType ? { shift_type: page.shiftType } : {}) } })`; trang giữ QB + chú thích L2 |
- AC riêng:
  - [x] ST-23.AC-1: Given ca thu ngân, When `openShift`, `closeShift`, `forceCloseShift` khi `captureSql` bật (test mới `test_ST23_AC1_lock_sequences`, ghi trên mã hiện tại), Then mảng sau chuyển bằng mảng đã ghi (kiểm: integration).
  - [x] ST-23.AC-2: Given test có sẵn `shifts/tests/shifts.integration.test.ts` (dò `'%FOR UPDATE%'` ở dòng 209, 248; đồng thời ở 442), `shift-expenses.integration.test.ts`, When chạy sau chuyển, Then xanh (kiểm: integration).
  - [x] ST-23.AC-3: Given chi nhánh có hai ca đóng, ca mới hơn không có đối soát, When xem trước tiền đầu ca và mở ca, Then giá trị như mã hiện tại (xem trước dùng ca mới nhất kể cả không đối soát; mở ca dùng ca có đối soát) (test mới `test_ST23_AC3_opening_cash_source`, ghi trên mã hiện tại) (kiểm: integration).
  - [x] ST-23.AC-4: Given sau sửa, When grep `setLock(` trong `shifts/shifts.service.ts` 0, `// QueryBuilder:` 4 (3 của ST-7 + 1 trang `listShifts`), `npm test` exit 0, `# fail 0` (kiểm: grep + lệnh).
- Plan chi tiết:
  - File tạo/sửa: `POS_API/src/shifts/shifts.service.ts` (import `IsNull`, `Not`); test mới trong `POS_API/src/shifts/tests/shifts.integration.test.ts`.
  - Chữ ký hàm/class: không đổi. DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý: 1. viết AC-1, AC-3 trên mã hiện tại, lưu `evidence/ST-23/before.log`; 2. chuyển 8 câu (giữ 1 QB); 3. chạy lại, module, `npm test`, grep.
  - Quy tắc nghiệp vụ: mỗi người một ca mở, mỗi chi nhánh một ca thu ngân mở; BR-55, BR-89 tiền đầu ca (`shifts.service.ts:155-167`, `237-240`); M-20 không khóa phía LEFT JOIN.
  - Bảng edge case: `ended_at` `NULL` với `ORDER BY ... DESC` → NULL đứng đầu như SQL cũ (cùng mệnh đề `ORDER BY`); `findOne` có relation chạy hai câu (không khóa).
  - Ảnh hưởng tới code hiện có: Không có. Tác dụng phụ: Không có.
- Lỗi cũ liên quan: M-20; `20261109-cash-close-shift-zero-cash-sales.md`.
- Test viết trước:
  - [x] `test_ST23_AC1_lock_sequences` — input: 3 thao tác; expected: mảng ghi trên mã hiện tại.
  - [x] `test_ST23_AC3_opening_cash_source` — input/expected: như AC-3.
- Tiến độ:
  - [x] Red (characterization)  - [x] Green  - [x] Refactor  - [x] Test module xanh

### ST-18: Tài liệu, kiểm tổng và Graphify
- depends_on: ST-3, ST-4, ST-5, ST-6, ST-3b, ST-4b, ST-5b, ST-6b, ST-7, ST-9, ST-10, ST-11, ST-17, ST-19, ST-20, ST-21, ST-22, ST-23
- Interfaces:
  - Consumes: Không có (không còn danh sách ngoại lệ; dùng bảng "Quy tắc chuyển" của plan).
  - Produces: Không có
- Mục tiêu: ghi quy ước (không có ngoại lệ SQL thuần; method trước, QueryBuilder là phương án cuối); kiểm E2E-AC-1 → E2E-AC-12. Ba tài liệu đã có thay đổi chưa commit trong working tree trước draft này (xem "Khám phá"): ST-18 đối chiếu và bổ sung cho đủ AC, không viết lại phần đã đúng.
- AC riêng:
  - [x] ST-18.AC-1 (bản 2, G-15): Given `rules/database.md` có mục "## Cách viết truy vấn bằng ORM" (working tree, 3 bullet), When đối chiếu và bổ sung, Then mục (giữ văn phong không phụ thuộc công nghệ) có đủ: (a) thử method chuẩn trước (tìm, tìm một, đếm, kiểm tồn tại, tạo, lưu, chèn, cập nhật, chèn-hoặc-cập-nhật, xóa; kể cả điều kiện lồng qua quan hệ đã khai báo và khóa dòng qua tùy chọn của method), rồi nhiều lời gọi method tuần tự thay phép nối khi chưa có quan hệ, query builder là phương án cuối kèm một dòng chú thích lý do; (b) không SQL thuần ngoài migration và test; (c) trong transaction mọi truy vấn đi qua manager của transaction; (d) không truyền giá trị rỗng vào điều kiện của method chuẩn khi ORM có thể bỏ qua điều kiện đó; (e) không viết chuỗi SQL tay cho việc làm được trong mã ứng dụng (ví dụ chuẩn hóa chuỗi) khi kết quả tương đương. Các phần khác của file giữ nguyên (kiểm: đọc file + `git diff`).
  - [x] ST-18.AC-2: Given `docs/architecture/TECH_STACK.md:11` (working tree đã sửa), When đối chiếu, Then ô vai trò TypeORM ghi: method của repository/manager trước (kể cả `relations`, `where` lồng, `lock`), nhiều `find` thay JOIN khi chưa có relation, QueryBuilder chỉ khi các cách đó không đủ (tổng tiền, cursor micro giây, CTE một statement, `ON CONFLICT ... DO NOTHING`, advisory lock, danh sách nhiều bảng không giới hạn dòng), không SQL thuần ngoài migration và test (quy ước ở `rules/database.md`, chi tiết ở `POS_API/README.md`) (kiểm: đọc file).
  - [x] ST-18.AC-3: Given `POS_API/README.md` (working tree đã có đoạn quy ước), When cập nhật, Then có đủ nội dung E2E-AC-9 phần README (thứ tự (1)-(4), bảng quy tắc bản 2, mã L1..L6 với câu chú thích nguyên văn, `normalizeUsername`, khóa qua `find({ lock: { tables } })`, cảnh báo `null`/`undefined`, `onConflict()`/cấm `orIgnore()`, `fromDummy()` chỉ cho advisory lock/health, CTE, quy tắc tên tham số, quy tắc `manager`), và đoạn entity liệt kê thêm `inventory/entities/` (Ingredient, ProductSizeIngredient, ToppingIngredient, BranchIngredientStock, StockMovement), `promotions/entities/` (PromotionCode), `sales/entities/` (Invoice, InvoiceItem, InvoiceItemTopping, InvoicePromotionCode, Payment, TransferAttempt, BankTransferEvent, StoreBankAccount), `shifts/entities/` (WorkShift, CashReconciliation, ShiftExpense) (kiểm: đọc file).
  - [x] ST-18.AC-4: Given toàn bộ thay đổi, When chạy E2E-AC-1/2/5/6/11/12, Then đúng giá trị các AC đó; diff/context bốn file ngoại lệ chỉ đúng phạm vi duyệt, gồm ba mock ST-6/ST-13 và assertion MỚI assert.ok(one > 0) riêng ST-13 và ba dòng AC-1 sau duyệt characterization, mọi assertion cũ giữ nguyên; RED/GREEN đúng từng mock đã thay (kiểm: lệnh + diff + evidence). AC-1 chỉ tick sau duyệt rõ ngoại lệ và log characterization/focused/module/suite/diff; không nhận RED mock làm RED AC-1.
  - [x] ST-18.AC-5: Given gốc repo, When `graphify update .` và semantic update theo `.claude/skills/graphify/SKILL.md` + `references/update.md` cho `rules/database.md`, `docs/architecture/TECH_STACK.md`, `POS_API/README.md`, Then exit 0 và `graphify query "TypeORM QueryBuilder repository convention rules database"` trả nút từ `rules/database.md` (kiểm: lệnh).
- Plan chi tiết:
  - File tạo/sửa: `rules/database.md`, `docs/architecture/TECH_STACK.md`, `POS_API/README.md`. `AGENTS.md`/`CLAUDE.md`: Không sửa (bảng "Tổng quan kỹ thuật" không đổi công nghệ hay lệnh).
  - Chữ ký hàm/class, DTO/schema, DB/migration, API: Không có.
  - Các bước xử lý:
    1. Chạy grep E2E-AC-1, E2E-AC-2, E2E-AC-11, E2E-AC-12; xác nhận đúng giá trị.
    2. Đọc `git diff` 3 tài liệu (thay đổi có sẵn trong working tree), bổ sung phần còn thiếu theo AC-1..AC-3; không xóa câu đúng đã có.
    3. Chạy E2E-AC-1 → E2E-AC-6, npm test, npm run build. Đọc diff/context foundation/payment/reports/invoices-read với master: foundation health/import/restore; payment tối đa hai literal waiting; reports đúng hai mock/import/original/restore/DataSource/SELECT-WITH giữ helper/barrier/cancel/lỗi giả/digest; invoices-read đúng counter/import/original/restore và một assertion MỚI assert.ok(one > 0). Mọi assertion cũ/helper/Lock/timeout/poll/request/trạng thái cuối giữ nguyên. Đọc RED/GREEN ST-6/ST-13 đúng từng mock, kiểm finally restore/forward this/ba args; numstat riêng không đủ.
    4. `graphify update .`; semantic update 3 file Markdown; query xác nhận.
  - Quy tắc nghiệp vụ: `CLAUDE.md` "Đổi công nghệ hoặc lệnh thì cập nhật bảng này cùng các file đó"; `rules/database.md` "Giữ mô hình ORM, migration và tài liệu schema nhất quán".
  - Bảng edge case: grep thật ra khác rỗng → DỪNG, không ghi tài liệu; báo agent chính kèm output grep (một sub-task trước chưa chuyển hết), agent chính giao lại sub-task đó.
  - Ảnh hưởng tới code hiện có: Không có.
  - Tác dụng phụ: Graphify ghi `graphify-out/` (gitignore).
- Lỗi cũ liên quan: M-5 → rà câu trạng thái lỗi thời trong tài liệu đã sửa.
- Test viết trước: Không có test code (tài liệu); kiểm bằng lệnh ở AC.
  - [x] `cmd_ST18_AC4_grep_and_git_checks` — input: E2E-AC-1/2/5/6; expected: output rỗng theo AC, 0 dòng xóa test cũ ngoài foundation/payment/reports/invoices-read; đúng ba mock, assertion MỚI assert.ok(one > 0) riêng ST-13 và ba dòng AC-1 sau duyệt characterization, mọi assertion cũ giữ nguyên, không xóa/skip test; RED/GREEN đúng nguyên nhân, finally restore/forward this/args. AC-1 chỉ tick sau duyệt rõ ngoại lệ và log characterization/focused/module/suite/diff; không nhận RED mock làm RED AC-1.
- Tiến độ:
  - [x] Red  - [x] Green  - [x] Refactor  - [x] Test module xanh

## Ma trận AC ↔ test
| AC | Test | Input | Expected |
|----|------|-------|----------|
| E2E-AC-1 | `cmd_ST18_AC4_grep_and_git_checks` | grep `.query(` trong `POS_API/src` | rỗng (0 dòng) |
| E2E-AC-2 | `cmd_ST18_AC4_grep_and_git_checks` | grep `raw-sql` và `manager.query`/`db.query` | rỗng |
| E2E-AC-3 | `npm test` toàn bộ | `DATABASE_URL` Docker `pos_infra-postgres-1` cổng 5432 | exit 0, `# fail 0`, pass ≥ 256 + test mới |
| E2E-AC-4 | `npm run build` | - | exit 0 |
| E2E-AC-5 | `cmd_ST18_AC4_grep_and_git_checks` | `git diff --stat master -- migrations package*.json` | rỗng |
| E2E-AC-6 | `cmd_ST18_AC4_grep_and_git_checks` | numstat + diff/context bốn file/master + evidence ST-6/ST-13 | 0 dòng xóa ngoài foundation/payment/reports/invoices-read; đúng ngoại lệ ST-3/ST-5/ST-10 và ba mock ST-6/ST-13, assertion MỚI assert.ok(one > 0) riêng ST-13 và ba dòng AC-1 sau duyệt characterization, mọi assertion cũ giữ nguyên |
| E2E-AC-7 | `test_ST1_AC1_entity_metadata_matches_schema` | DB thử 13 migration | 12 bảng khớp |
| E2E-AC-8 | `test_ST3_AC7_login_lock_sequence`, `test_ST4_AC1_patch_lock_sequence`, `test_ST5_AC1_update_lock_sequence`, `test_ST7_AC1_add_expense_lock_sequence`, `test_ST8_AC1_inventory_lock_sequences`, `test_ST9_AC1_set_min_lock_sequence`, `test_ST10_AC1_transfer_lock_sequences`, `test_ST11_AC1_webhook_lock_sequence`, `test_ST12_AC1_create_lock_sequence`, `test_ST15_AC1_apply_promotion_lock_sequence`, `test_ST16_AC1_pay_cash_lock_sequence`, `test_ST17_AC1_cancel_paid_lock_sequence` | thao tác tương ứng | mảng khóa bằng mảng ghi trên mã cũ |
| E2E-AC-9 | ST-18.AC-1..AC-3 (đọc file) | 3 tài liệu | `rules/database.md` mục không phụ thuộc công nghệ (a)-(e); README đủ quy ước TypeORM bản 2 + entity; TECH_STACK dòng TypeORM |
| E2E-AC-10 | ST-18.AC-5 (lệnh graphify) | `graphify update .`, query | exit 0, có nút `rules/database.md` |
| E2E-AC-11 | `cmd_ST18_AC4_grep_and_git_checks` | `grep -c "// QueryBuilder:"` từng file + diff | 4/1/2/1/1/1/0/1/4/4/5/2/11/2/3, tổng 42; diff thêm 42 |
| E2E-AC-12 | `cmd_ST18_AC4_grep_and_git_checks` | grep `setLock(` toàn `POS_API/src`; grep `lower(btrim` | cả hai rỗng |
| ST-1.AC-1 | `test_ST1_AC1_entity_metadata_matches_schema` | DB thử | khớp tên/nullable/kiểu/PK |
| ST-1.AC-2 | `npm run build` + đọc `data-source.ts` | - | exit 0, 32 entity |
| ST-1.AC-3 | `test_ST1_AC3_new_repository_query_runs` | uuid không tồn tại | `null` |
| ST-1.AC-4 | `npm test` | - | exit 0 |
| ST-2.AC-1 | `test_ST2_AC1_lock_of_two_aliases` | `FOR UPDATE OF s,b` | `['UPDATE:work_shifts,branches']` |
| ST-2.AC-2 | `test_ST2_AC2_quoted_for_share` | SQL QueryBuilder `FOR SHARE OF t` | `['SHARE:dining_tables']` |
| ST-2.AC-3 | `test_ST2_AC3_single_table_and_advisory` | 4 câu | `['UPDATE:invoices','UPDATE:invoices','advisory']` |
| ST-2.AC-4 | `test_ST2_AC4_capture_sees_raw_and_builder` | `SELECT 1` + QueryBuilder | 2 câu, câu 2 có `FROM "stores" "s"` |
| ST-3.AC-1 | `session-branch-name.http.test.ts` (có sẵn) | user có chi nhánh | `branchName` đúng |
| ST-3.AC-2 | `session-branch-name.http.test.ts` (có sẵn) | OWNER | `branchName` `null` |
| ST-3.AC-3 | grep ST-3 | 5 file | 0 dòng `.query(` |
| ST-3.AC-4 | `PB-01 migration, bootstrap and database constraints` (focused, rồi `npm test`; các test auth/username như cũ) | health bình thường rồi lỗi đúng SELECT health ở QueryRunner | focused pass 1/fail 0; suite exit 0/fail 0; giữ assertion 200/503, envelope/message/requestId; chuyển tiếp câu khác, restore bằng finally |
| ST-3.AC-5 | `test_ST3_AC5_create_staff_username_normalized` | `'  NV.An  '`, `'\tNV2'` | giá trị mã cũ lưu (`nv.an`, `'\tnv2'`) |
| ST-3.AC-6 | `test_ST3_AC6_create_owner_username_normalized` | `'  CHU.Quan  '` | giá trị mã cũ lưu (`chu.quan`) |
| ST-3.AC-7 | `test_ST3_AC7_login_lock_sequence` | đăng nhập hợp lệ | mảng khóa ghi trên mã cũ; câu advisory có `FROM (SELECT 1 AS dummy_column)` sau khi chuyển |
| ST-4.AC-1 | `test_ST4_AC1_patch_lock_sequence` | patch | `['UPDATE:promotion_codes']` |
| ST-4.AC-2 | `test_ST4_AC2_patch_returns_updated_row` | PATCH `name` | object, `code` `SALE10` |
| ST-4.AC-3 | `test_ST4_AC3_promotions_cursor_keeps_microseconds` | 2 mã cách 1 µs, `limit=1` | trang 1 `.000002Z`, trang 2 `.000001Z`, total 2 |
| ST-4.AC-4 | test có sẵn `DUPLICATE_PROMOTION_CODE` (`inventory.integration.test.ts`) | mã trùng | 409 |
| ST-4.AC-5 | grep + `npm test` | - | 0 dòng, exit 0 |
| ST-5.AC-1 | `test_ST5_AC1_update_lock_sequence` | cập nhật | `['UPDATE:stores']` |
| ST-5.AC-2 | `test_ST5_AC2_upsert_updates_updated_at` | 2 lần cập nhật | giá trị mới, `updated_at` tăng |
| ST-5.AC-3 | `test_ST5_AC3_pending_blocks_update` hoặc test có sẵn | QR `PENDING` | 409 `TRANSFER_PENDING` |
| ST-5.AC-4 | grep + `npm test` | - | 0, exit 0 |
| ST-5.AC-5 | `test_ST5_account_permission_race` (focused test cha, rồi module/suite) + diff | QR bị giữ tại gate 97531, PATCH tên; chỉ đổi literal store sau phê duyệt | RED đúng store wait; GREEN hai wait true, QR 201/PATCH 409 TRANSFER_PENDING, QR/DB giữ tên cũ/cancel 204; helper và assertion giữ nguyên |
| ST-6.AC-1 | `test_ST2_AC3_scope_permissions_http` bổ sung ba dòng sau duyệt ngoại lệ characterization | owner_a, branchId w.id.b1, ownerGet trả đủ body | giữ assertion 404; body.error.code NOT_FOUND; body.error.message Không tìm thấy tài nguyên.; focused/module/suite xanh trên mã hiện tại, chưa có RED riêng/runtime hai assertion SQL cũ |
| ST-6.AC-2 | `[B-54]` có sẵn trong `reports.integration.test.ts` | ca chi nhánh khác | 404 |
| ST-6.AC-3 | 14 test có sẵn `reports.integration.test.ts` + `reports.test.ts` + `reports-permissions.integration.test.ts` | - | xanh trước và sau |
| ST-6.AC-4 | `test_ST6_AC4_best_sellers_limit_and_ties` | 12 cặp, tie vị trí 10-11 | 10 phần tử, thứ tự như mã cũ |
| ST-6.AC-5 | `test_ST6_AC5_revenue_single_statement` | báo cáo có `branchId`, `shiftId` | 1 câu SQL, bắt đầu `WITH` |
| ST-6.AC-6 | grep + `npm test` | - | 0, exit 0 |
| ST-6.AC-7 | `test_ST2_AC7_consistent_statement`, `test_ST2_AC7_failure_readonly` | QueryBuilder sau chuyển; barrier/24 hóa đơn/30 reads; lỗi giả | RED đúng nguyên nhân; GREEN counter 1/30, count 23/revenue 23000; 500 INTERNAL_ERROR/message/requestId/không lộ SQL; restore rồi GET 200/20000/digest bằng trước |
| ST-3b.AC-1 | `PB-01 migration, bootstrap and database constraints`, test đăng nhập TAB, `test_ST3_AC5..AC7` (có sẵn) | `'  	ADMIN  '`, `'  NV.An  '`, `'	NV2'`, `'  CHU.Quan  '` | `'	admin'`, `nv.an`, `'	nv2'`, `chu.quan`; không còn câu `lower(btrim` |
| ST-3b.AC-2 | `test_ST3b_AC2_normalize_username_matches_postgres` | 8 giá trị (ASCII, TAB, chữ Việt) | bằng `lower(btrim(...))` của PostgreSQL |
| ST-3b.AC-3 | `cmd_ST3b_AC3_grep` | grep | `lower(btrim` rỗng; chú thích 4/1/1/0/0 |
| ST-3b.AC-4 | `npm test` | - | exit 0 |
| ST-4b.AC-1 | `test_ST4_AC1_patch_lock_sequence` (có sẵn) | patch | `['UPDATE:promotion_codes']` |
| ST-4b.AC-2 | `test_ST4_AC2_...`, `test_ST4_AC3_...`, `DUPLICATE_PROMOTION_CODE` (có sẵn) | PATCH/cursor/mã trùng | object `SALE10`; `.000002Z`/`.000001Z`, total 2; 409 |
| ST-4b.AC-3 | `test_ST4b_AC3_total_matches_filters` | 3 mã, lọc `q=vip`, `isActive=true`, `q=sale&isActive=false` | total 1/2/0 = số phần tử |
| ST-4b.AC-4 | grep + module + `npm test` | - | `setLock` 0, `createQueryBuilder` 1, chú thích 1, exit 0 |
| ST-5b.AC-1 | `test_ST5_AC1_update_lock_sequence` (có sẵn) | cập nhật | `['UPDATE:stores']` |
| ST-5b.AC-2 | `test_ST5_AC2_upsert_updates_updated_at`, ca `TRANSFER_PENDING` (có sẵn) | 2 lần cập nhật; QR chờ | giá trị mới, `updated_at` tăng; 409 |
| ST-5b.AC-3 | `test_ST5_account_permission_race` (focused test cha) + diff | QR giữ ở gate 97531, PATCH | RED `bank change must wait for QR store lock` với literal cũ; GREEN với `FROM "stores" "Store"`, trạng thái cuối như ST-5.AC-5 |
| ST-5b.AC-4 | grep + module + `npm test` | - | 0/0/0/0, exit 0 |
| ST-6b.AC-1 | `[B-54]`, `test_ST2_AC4_own_open_closed_shift` (có sẵn) | ca chi nhánh khác/cửa hàng khác/không tồn tại/người khác | 404/404/404/403 như cũ |
| ST-6b.AC-2 | grep + module reports + `npm test` | - | chú thích 1, exit 0 |
| ST-19.AC-1 | `test_ST3_AC7_login_lock_sequence` + `test_ST19_AC1_auth_lock_sequences` | login, refresh, logout, changePassword | mảng ghi trên mã hiện tại |
| ST-19.AC-2 | test auth có sẵn (`auth.integration.test.ts`, `auth.test.ts`, `session-branch-name.http.test.ts`) | - | xanh |
| ST-19.AC-3 | `test_ST19_AC3_rate_limit_retry_after` hoặc test có sẵn | 6 lần sai | 429, `retryAfter` 1..900 |
| ST-19.AC-4 | grep + `npm test` | - | `setLock` 0, chú thích 4, exit 0 |
| ST-20.AC-1 | `test_ST20_AC1_lock_sequences` | patchStaff, resetStaffPassword, setStoreStatus, resetOwnerPassword | mảng ghi trên mã hiện tại |
| ST-20.AC-2 | test platform/organization/foundation có sẵn | - | xanh |
| ST-20.AC-3 | `test_ST20_AC3_suspend_revokes_only_store_sessions` hoặc test có sẵn | 2 cửa hàng | chỉ phiên cửa hàng bị khóa bị thu hồi |
| ST-20.AC-4 | `test_ST20_AC4_staff_scope_null_identity` | MANAGER không chi nhánh; nhân viên cửa hàng khác | 404 như mã hiện tại |
| ST-20.AC-5 | grep + `npm test` | - | `setLock` 0; chú thích 1/2/1; exit 0 |
| ST-21.AC-1 | `test_ST21_AC1_lock_sequences` | createTable, patchBranch, patchTable | mảng ghi trên mã hiện tại |
| ST-21.AC-2 | `test_ST21_AC2_scope_characterization` | ngoài chi nhánh/không chi nhánh | 404 như mã hiện tại |
| ST-21.AC-3 | test organization có sẵn + grep + `npm test` | - | xanh; `setLock` 0; chú thích 2 |
| ST-22.AC-1 | `test_ST22_AC1_cross_store_404` | tài nguyên menu cửa hàng khác | 404 + message như mã hiện tại |
| ST-22.AC-2 | `test_ST22_AC2_size_order_and_image` | 3 size, ảnh | thứ tự và byte/mime như mã hiện tại |
| ST-22.AC-3 | `menu.integration.test.ts` + grep + `npm test` | - | xanh; chú thích 3 |
| ST-23.AC-1 | `test_ST23_AC1_lock_sequences` | openShift, closeShift, forceCloseShift | mảng ghi trên mã hiện tại |
| ST-23.AC-2 | test shifts có sẵn | - | xanh |
| ST-23.AC-3 | `test_ST23_AC3_opening_cash_source` | hai ca đóng, ca mới không đối soát | giá trị như mã hiện tại |
| ST-23.AC-4 | grep + `npm test` | - | `setLock` 0; chú thích 4; exit 0 |
| ST-7.AC-1 | `test_ST7_AC1_add_expense_lock_sequence` | ghi chi | `['UPDATE:work_shifts']` |
| ST-7.AC-2 | `test_ST7_AC2_transfer_not_counted_as_cash` hoặc `[B-45]` có sẵn | CASH 50000 + TRANSFER 70000, mở két 100000 | 422 với 150001, 201 với 150000 |
| ST-7.AC-3 | `test_ST7_AC3_expenses_cursor_keeps_microseconds` | 2 chi phí cách 1 µs | thứ tự đúng, total 2 |
| ST-7.AC-4 | test có sẵn `SHIFT_HAS_OPEN_INVOICES` (`shifts.integration.test.ts`) | ca còn đơn OPEN | 409 + details |
| ST-7.AC-5 | grep + `npm test` | - | 0, exit 0 |
| ST-8.AC-1 | `test_ST8_AC1_inventory_lock_sequences` | 3 thao tác | 3 mảng |
| ST-8.AC-2 | test có sẵn `RESOURCE_IN_USE` + `test_ST8_AC2_unit_change_blocked_by_movement` | đổi `unit` | 409 |
| ST-8.AC-3 | `test_ST8_AC3_patch_ingredient_returns_row` hoặc test có sẵn (lỗi 2026-11-07) | PATCH `isActive` false | object + ISO |
| ST-8.AC-4 | `npm test` | - | exit 0 |
| ST-9.AC-1 | `test_ST9_AC1_set_min_lock_sequence` | `setMin` | mã cũ `['UPDATE:branches,ingredients']`; sau chuyển `['UPDATE:branches','UPDATE:ingredients']` |
| ST-9.AC-2 | `test_ST9_AC2_stocks_include_missing_stock_rows` | 2×2, 1 dòng stock | total 4, giá trị như mã cũ |
| ST-9.AC-3 | `test_ST9_AC3_set_min_upsert_values` hoặc test có sẵn | `minStock` 2.500 rồi 3.000 | như AC |
| ST-9.AC-5 | `test_ST9_AC3_set_min_upsert_values` | `minStock` 2.500 rồi 3.000 | `currentStock` `0.000`, `minStock` `2.500` → `3.000` |
| ST-9.AC-4 | test có sẵn BR-44 + `stock-movements.http.test.ts` + grep | - | xanh, 0 dòng |
| ST-10.AC-1 | `test_ST10_AC1_transfer_lock_sequences` | tạo/hủy/xác nhận tay | 3 mảng ghi trên mã cũ |
| ST-10.AC-2 | test có sẵn `Idempotent-Replay` (`payment.integration.test.ts`) | gửi lại cùng key | bản cũ, `replayed` |
| ST-10.AC-3 | `test_ST10_AC3_key_reused_across_tables` hoặc test có sẵn | key đã dùng bảng khác | 409 `IDEMPOTENCY_KEY_REUSED` |
| ST-10.AC-4 | `test_ST10_AC4_exceptions_cursor_keeps_microseconds` | 2 sự kiện cách 1 µs | thứ tự đúng, total 2 |
| ST-10.AC-5 | grep + `npm test` | - | 0, exit 0 |
| ST-10.AC-6 | `test_ST10_AC6_on_conflict_target_unchanged` | tạo QR, xác nhận tay | hai INSERT chứa đúng mệnh đề `ON CONFLICT ... DO NOTHING` + `RETURNING` |
| ST-10.AC-7 | test có sẵn `BANK_TRANSACTION_REUSED` + `test_ST10_AC7_bank_ref_reused_db_state` (nếu thiếu) | `transactionRef` đã dùng | 409, đơn B `OPEN`, không thêm `payments` |
| ST-10.AC-8 | `test_ST5_account_permission_race` (focused test cha, rồi module/suite) + SQL ST-10.AC-6 + diff | cùng race sau chuyển INSERT QueryBuilder | SQL còn khớp mẫu cũ: giữ literal; SQL lệch và RED đúng gate: chỉ đổi literal INSERT, GREEN hai wait true và trạng thái cuối như ST-5.AC-5 |
| ST-11.AC-1 | `test_ST11_AC1_webhook_lock_sequence` | webhook đủ tiền | mảng ghi trên mã cũ |
| ST-11.AC-2 | test webhook có sẵn (`payment.integration.test.ts:1261,1380,1439` và các disposition) | - | xanh |
| ST-11.AC-3 | grep | - | `.query(` 0; chú thích 2 |
| ST-11.AC-4 | `test_ST11_AC4_on_conflict_target_unchanged` + test có sẵn `'DUPLICATE'` | webhook đủ tiền; webhook trùng ref | INSERT chứa đúng mệnh đề; `DUPLICATE` |
| ST-12.AC-1 | `test_ST12_AC1_create_lock_sequence` + `sales.integration.test.ts:87-89` | tạo đơn tại bàn | mảng như AC, `55P03` |
| ST-12.AC-2 | test có sẵn `invoices-read.integration.test.ts`, `payment.integration.test.ts` | GET chi tiết | toppings, paymentMethod, promotionCode đúng |
| ST-12.AC-3 | `test_ST12_AC3_table_errors_unchanged` | 3 ca bàn | 422/409/404 |
| ST-12.AC-4 | `test_ST12_AC4_cashier_other_shift_404` hoặc test có sẵn | CASHIER xem ca khác | 404 |
| ST-12.AC-5 | `npm test` + grep | - | exit 0 (mốc đếm giữa chừng đã bỏ theo duyệt 2026-11-17) |
| ST-13.AC-1 | test có sẵn `invoices-read.integration.test.ts` | các bộ lọc | xanh |
| ST-13.AC-2 | `test_ST13_AC2_status_filter_and_total` hoặc test có sẵn | 3 trạng thái | total 3 / 1 |
| ST-13.AC-3 | `test_ST13_AC3_item_count_sum` hoặc test có sẵn | 2 món số lượng 2, 3 | `itemCount` 5 |
| ST-13.AC-4 | subtest `[ST-2.AC-4] options include inactive historical tables and cashiers outside the filtered page` trong test cha `Invoice read scope over HTTP` | QueryBuilder sau chuyển/limit 1,100 | mock cũ RED count 0 tại assertion MỚI assert.ok(one > 0), QueryRunner GREEN count dương/equality cũ/restore finally |
| ST-14.AC-1 | test có sẵn `sales.integration.test.ts` | - | xanh |
| ST-14.AC-2 | `test_ST14_AC2_add_item_errors_unchanged` | 4 ca | 409/409/422/404 |
| ST-14.AC-3 | `test_ST14_AC3_line_total_snapshot` hoặc test có sẵn | 30000 + 5000×2, ×3 | 120000; PATCH 1 → 40000 |
| ST-14.AC-4 | `npm test` + grep | - | exit 0; chú thích 4 |
| ST-15.AC-1 | `test_ST15_AC1_apply_promotion_lock_sequence` | áp mã | mảng như AC |
| ST-15.AC-2 | test có sẵn `PROMOTION_ALREADY_APPLIED` (`payment.integration.test.ts`) | áp mã | 5000/95000; 409 |
| ST-15.AC-3 | `npm test` + grep | - | exit 0 (mốc đếm giữa chừng đã bỏ theo duyệt 2026-11-17) |
| ST-16.AC-1 | `test_ST16_AC1_pay_cash_lock_sequence` | trả tiền mặt, 0đ | mảng ghi trên mã cũ |
| ST-16.AC-2 | `test_ST16_AC2_sale_movement_quantity` hoặc test có sẵn | công thức 0.500 × 2 | `-1.000`, tồn `9.000` |
| ST-16.AC-3 | `test_ST16_AC3_key_reused_across_tables` hoặc test có sẵn | key đã dùng | 409 |
| ST-16.AC-4 | test có sẵn (`:548`, `:673`, `MISSING_RECIPE`, `NEGATIVE_STOCK`, `[R14-1]`) | - | xanh |
| ST-16.AC-5 | test có sẵn `[B-41]` (`cancel-paid.integration.test.ts`) | webhook | `source` `SYSTEM` |
| ST-16.AC-6 | `test_ST16_AC6_requirements_product_plus_topping` | 2 dòng món, topping chung nguyên liệu X | X `-3.000`, Y `-0.575`, Z `-6.000`, thứ tự `ingredient_id` |
| ST-16.AC-7 | `test_ST16_AC7_negative_stock_preview` | tồn X `3.000`, Y `0.574`, Z không có | cảnh báo Y, Z; không X |
| ST-17.AC-1 | `test_ST17_AC1_cancel_paid_lock_sequence` | hủy PAID | `['UPDATE:work_shifts','UPDATE:invoices','UPDATE:promotion_codes']` |
| ST-17.AC-2 | test có sẵn `cancel-paid.integration.test.ts`, `manager-cancel.integration.test.ts` | - | xanh |
| ST-17.AC-3 | grep + `npm test` | - | `.query(` 0, chú thích 11, exit 0 |
| ST-18.AC-1 | đọc `rules/database.md` + `git diff` | - | mục mới, phần cũ giữ nguyên |
| ST-18.AC-2 | đọc `TECH_STACK.md:11` | - | câu như AC |
| ST-18.AC-3 | đọc `POS_API/README.md:29` | - | danh sách entity |
| ST-18.AC-4 | `cmd_ST18_AC4_grep_and_git_checks` | lệnh/diff/context bốn file/evidence ST-6,13 | đúng E2E-AC-6, đúng ba mock, assertion MỚI assert.ok(one > 0) riêng ST-13 và ba dòng AC-1 sau duyệt characterization, mọi assertion cũ giữ nguyên |
| ST-18.AC-5 | lệnh graphify | - | exit 0, có nút |
| RF-1 | `test_ST4_AC3_...`, `test_ST7_AC3_...`, `test_ST10_AC4_...` | cách 1 µs | không bỏ sót/lặp |
| RF-2 | `test_ST12_AC3_table_errors_unchanged`, `test_ST14_AC2_add_item_errors_unchanged` | dữ liệu ngừng bán/khác chi nhánh | mã lỗi như cũ |
| RF-3 | `test_ST9_AC2_stocks_include_missing_stock_rows` | thiếu dòng stock | như mã cũ |
| RF-4 | `test_ST4_AC2_patch_returns_updated_row`, `test_ST8_AC3_patch_ingredient_returns_row` | PATCH | object |
| RF-5 | `test_ST3_AC5_create_staff_username_normalized`, `test_ST3_AC6_create_owner_username_normalized` | username có dấu cách/chữ hoa/TAB | giá trị như mã cũ |

## Rủi ro
- (2026-11-17, ST-19..ST-23) Chuyển 61 câu có sẵn ở module chưa có test khóa (`menu`, `organization`) có thể đổi phạm vi cửa hàng/chi nhánh hoặc thứ tự khóa mà test hiện có không bắt. Giảm: viết test characterization (404 khác cửa hàng, chuỗi khóa) và chạy xanh trên mã hiện tại TRƯỚC khi đổi; G-20 kiểm giá trị danh tính rỗng.
- (2026-11-17) `Raw((a) => ...)` (G-19) vẫn là chuỗi SQL nhỏ viết tay; sai một ký tự gây 500. Giảm: chép nguyên văn biểu thức cũ; SQL đã dựng ở "Khám phá"; test giới hạn đăng nhập/phiên có sẵn.
- (2026-11-17) `INNER JOIN` cũ đổi thành `relations` (LEFT JOIN) ở auth/menu/shifts: khác kết quả nếu khóa ngoại cho phép NULL. Giảm: chỉ đổi khi cột NOT NULL có FK hoặc thêm `Not(IsNull())` (ST-23 dòng 226, ST-20 `listOwners`); test có sẵn của module.
- (2026-11-17) `find*` bỏ điều kiện `null`/`undefined` (`SelectQueryBuilder.js:2496-2510`) → đọc/khóa dòng của cửa hàng khác nếu giá trị danh tính rỗng lọt vào `where`. Giảm: quy định chung cấm truyền; giữ các lệnh kiểm/ném lỗi cũ trước truy vấn (`this.store(user)`, `reportLevel`); code-reviewer kiểm từng `where` mới; spread có điều kiện cho bộ lọc tùy chọn.
- (2026-11-17) `normalizeUsername` (JavaScript) khác `lower(btrim())` với một số ký tự Unicode → tài khoản tên có ký tự đó tạo bằng mã cũ không đăng nhập được. Giảm: test ST-3b.AC-2 so trực tiếp với PostgreSQL cho ASCII, TAB, chữ Việt; user đã chấp nhận dùng JavaScript (Q2, 2026-11-17).
- (2026-11-17) Tách khóa một câu `OF s,b`/`OF b,i` thành hai câu (G-17) đổi thời điểm lấy khóa thứ hai và có thể đổi thứ tự chờ khi đồng thời. Giảm: giữ đúng thứ tự `s` rồi `b`, `b` rồi `i`; test `sales.integration.test.ts:87-89` (`55P03`), test đồng thời có sẵn (`payment.integration.test.ts:361,548,673`, `shifts.integration.test.ts:442`) và test khóa ST-9/ST-12/ST-15/ST-16 phải xanh; đỏ thì DỪNG, báo agent chính (phương án dự phòng: QueryBuilder `setLock(..., ['s', 'b'])`, cần user duyệt).
- (2026-11-17) Nhiều `find` thay JOIN tăng số câu lệnh và có thể đọc dữ liệu ở thời điểm khác nhau trong cùng request. Giảm: chỉ dùng khi dòng gốc đã bị khóa trước đó hoặc dữ liệu liên quan không đổi (chi nhánh, mã giảm giá nối với hóa đơn đã khóa); báo cáo doanh thu giữ một statement (L3); danh sách không giới hạn dòng giữ QueryBuilder (L6).
- (2026-11-17) `insert` + `findOneBy` thay `INSERT ... RETURNING` thêm một câu; ngoài transaction (`promotions.create`, `inventory.createIngredient`) dòng có thể bị sửa giữa hai câu bởi request khác. Giảm: hai câu liên tiếp trên cùng request; test tạo mã/nguyên liệu khẳng định giá trị trả về.
- (2026-11-17) Chuỗi đảo dấu `numeric` (`-${q}`, `q.slice(1)`) sai nếu chuỗi có dạng khác `[-]digits.digits`. Giảm: giá trị lấy từ PostgreSQL (`numeric` → chuỗi chuẩn); CHECK dấu ở migration ("Khám phá"); test ST-16.AC-2/AC-6 (`-1.000`, `-0.575`) và `cancel-paid.integration.test.ts` (`SALE_REVERSAL`).
- (2026-11-17) Đếm bằng method và trang bằng QueryBuilder có thể lệch bộ lọc. Giảm: test `total` có lọc (ST-4b.AC-3, ST-9.AC-2, ST-10.AC-4, test sổ kho có sẵn).
- (2026-11-17) `upsert` thêm `SET "<cột xung đột>" = EXCLUDED."<cột xung đột>"` — ảnh hưởng khóa/trigger trên PostgreSQL CHƯA xác minh. Giảm: race ST-5b.AC-3, ST-5b.AC-2, ST-9.AC-5.
- (2026-11-17) Literal race ST-5b có thể khớp nhầm câu khác chứa `FROM "stores" "Store"` (ví dụ `createTransferAttempt` sau ST-10 cũng khóa `stores` bằng `findOne`). Giảm: race chỉ đo PATCH sau khi QR đã giữ khóa store và đang chờ ở gate INSERT, nên câu đang chờ khóa store duy nhất là của PATCH; ST-10.AC-8 chạy lại race sau ST-10.
- ST-6.AC-1 có status 404 nhưng thiếu body; suite xanh hoặc RED hai mock không chứng minh code/message. Giảm: tái dùng ownerGet/fixture, giữ assertion status, thêm đúng hai assertion body sau duyệt riêng, một request bổ sung; log characterization hiện tại, focused/module/suite/diff. Chưa có RED riêng/runtime hai assertion SQL cũ; không sửa production để tạo RED, không tick bằng quy tắc TDD mặc định. Nguồn: reports.integration.test.ts:150-162; reports.service.ts:41; tdd-task/SKILL.md mục 3 bước 2, mục 5.
- Reports prototype sẽ thấy UPDATE từ original db.query; chỉ isReportSql sẽ đếm thêm/có thể gọi lại barrier/gây lỗi UPDATE. Giảm: đúng w.db và SELECT/WITH trước helper, giữ UPDATE/barrier/canceller/assertion counter 1/30 và 23/23000 (nguồn: reports.integration.test.ts:10,358-385,400-415).
- Invoices-read có thể xanh giả 0/0: đề xuất duy nhất assertion MỚI assert.ok(one > 0) sau const one=queries, RED thật sau chuyển trước đổi mock, GREEN QueryRunner đúng db; không lọc riêng bốn SELECT/không cố định tổng SQL để tránh che N+1 (nguồn: invoices-read.integration.test.ts:248-258, sales.service.ts:158-176).
- Prototype quá rộng/không restore/bỏ useStructuredResult ảnh hưởng DB khác/cleanup/kiểu kết quả. Giảm: DataSource identity/function giữ this/apply đủ ba args/finally restore trước hồi phục và cleanup/module-suite tuần tự. Chưa có RED/SQL runtime ST-6/ST-13; phải thu thật sau chuyển, không nhận build/môi trường/0 test là RED (nguồn TypeORM/fixture ở “Khám phá”).
- Pattern SQL cũ không nhận alias/dấu nháy QueryBuilder, làm race đỏ dù vẫn giữ khóa; đổi mẫu quá rộng có thể nhận nhầm câu đang chờ — cách giảm delta ST-5/ST-10: chỉ fragment đã dựng kiểm `FROM "stores" "s"`/`INSERT INTO "transfer_attempts"`, xác nhận SQL thực tế trước sửa; giữ helper, database/PID filter, `wait_event_type='Lock'`, gate `97531`, timeout/poll, assertion, thứ tự request và trạng thái cuối; dùng race hiện hữu làm RED/GREEN, chạy module/suite. ST-10 không sửa INSERT trước khi thực tế lệch mẫu cũ. Nguồn: `payment.integration.test.ts:1105-1143`, `store-bank-account.service.ts:23`, `transfer-attempts.service.ts:91-95`, SQL đã kiểm trong "Khám phá", `evidence/ST-5/module.log`.
- Mock `dataSource.query` cũ không chặn QueryBuilder; mock prototype quá rộng hoặc không restore làm sai test/dọn DB — cách giảm delta ST-3: chỉ match nguyên SELECT health sau chuẩn hóa khoảng trắng, chuyển tiếp câu khác với nguyên `this`/tham số, restore trong `finally`; dùng đúng test PB-01 hiện hữu làm RED/GREEN và kiểm diff giữ nguyên mọi assertion. Nguồn: `foundation.test.ts:112-123`, `health.controller.ts:12`, `evidence/ST-3/suite.log` (265/266).
- QueryBuilder có JOIN mà thiếu `lockTables` sẽ sinh `FOR UPDATE` khóa mọi bảng join (kể cả nullable side, PostgreSQL lỗi theo M-20) — cách giảm: quy tắc bắt buộc `lockTables` khi có JOIN; test chuỗi khóa ở 12 test của E2E-AC-8 bắt sai lệch.
- `getOne()`/`find` với `select` thiếu khóa chính có thể không dựng được entity — cách giảm: quy tắc "luôn có khóa chính trong `select`"; dùng `getRawOne` khi chỉ cần vài cột của bảng join.
- Mất micro giây ở cursor nếu đọc `created_at` qua `Date` — cách giảm: giữ `to_char ... US` qua `addSelect`; test RF-1.
- Đọc sai kết quả `UPDATE ... RETURNING` (lỗi 2026-11-07, M-21) — cách giảm: quy tắc `result.raw[0]`; test RF-4.
- `orIgnore()` nuốt lỗi trùng ở cột UNIQUE khác — cách giảm: cấm `orIgnore()` trong "Quy tắc chuyển"; dùng `onConflict()` với đích chép nguyên văn; test ST-10.AC-6, ST-11.AC-4 kiểm mệnh đề `ON CONFLICT` trong câu SQL thật.
- `onConflict()` bị `@deprecated` (`InsertQueryBuilder.js:202-209`): có thể bị bỏ khi nâng TypeORM lên 0.4 — cách giảm: `package.json` khai báo `^0.3.31` (chỉ nhận 0.3.x), `package-lock.json` khóa bản; khi nâng bản, test ST-10.AC-6/ST-11.AC-4 đỏ báo ngay; ghi lý do trong chú thích tại chỗ và trong `rules/database.md`.
- Nhánh "đã tồn tại" của `ON CONFLICT DO NOTHING` đọc sai kết quả (`result.raw` là mảng dòng, rỗng khi trùng) hoặc TypeORM ghép kết quả vào entity rồi lỗi khi mảng rỗng — cách giảm: luôn `.updateEntity(false)` (`InsertQueryBuilder.js:110-115,197-199`); đọc `result.raw[0]` / `result.raw.length`; test có sẵn `BANK_TRANSACTION_REUSED`, `'DUPLICATE'`, `Promise.all` manual + webhook (`payment.integration.test.ts:361`) và ST-10.AC-7.
- Báo cáo chuyển sang CTE QueryBuilder sai một biểu thức (lệch ranh giới nửa đêm UTC+7, nhầm `p.paid_at` với `i.paid_at`, lệch `LEAST/GREATEST`, sai thứ tự món bán chạy) — cách giảm: chép nguyên văn biểu thức từ `reports.service.ts:40-72`, chỉ đổi tham số; 14 test có sẵn + ST-6.AC-4/AC-5 viết xanh trên SQL cũ trước khi đổi; tdd lưu `getQueryAndParameters()` mới vào evidence để reviewer so với SQL cũ.
- Báo cáo bị tách thành nhiều statement (lệch snapshot giữa tổng, biểu đồ, món bán chạy) — cách giảm: một `getRawOne()` duy nhất; ST-6.AC-5 đếm câu SQL; test có sẵn `test_ST2_AC7_consistent_statement`.
- Tên tham số trùng chữ trong SQL (`:date` thay cả `::date`, `:MI` trong `'HH24:MI:SS'`) — cách giảm: quy tắc tên tham số (`PostgresDriver.js:648-651`), dùng `reportDate`, `fromDate`, `toDate`, `lockKey`...; test báo cáo và cursor micro giây bắt sai.
- Thay `UNION ALL` bằng hai sub-query + `LEFT JOIN` từ `ingredients`: mất dòng nếu một `ingredient_id` không có trong `ingredients` (không thể do FK) hoặc chậm do quét `ingredients` toàn hệ thống — cách giảm: FK `REFERENCES ingredients(id)` (`20261107000000-InventoryPromotions.ts:19-33`); test ST-16.AC-6/AC-7; nếu chậm thấy được trong test thì tdd báo agent chính (không tự thêm điều kiện lọc mới).
- Bọc advisory lock/chuẩn hóa username bằng `fromDummy()`: nếu sub-query giả không trả đúng một dòng thì khóa không được lấy hoặc lấy nhiều lần — cách giảm: `fromDummy()` trên PostgreSQL là `(SELECT 1 AS dummy_column)` đúng một dòng (`SelectQueryBuilder.js:156-159`); test chuỗi khóa có token `advisory` (ST-3.AC-7, ST-10, ST-11, ST-16) và test idempotency đồng thời có sẵn (`payment.integration.test.ts:548,673`).
- Đổi biểu thức chuẩn hóa username vô ý khi bọc (ví dụ dùng `trim()` JS hoặc đổi `btrim`) — cách giảm: test ST-3.AC-5, AC-6 ghi giá trị trên mã cũ; test có sẵn `auth.integration.test.ts:100-114`, `foundation.test.ts:53-65`.
- Thay `CROSS JOIN` bằng `INNER JOIN` theo `store_id` (G-7) đổi tập dòng nếu lập luận sai — cách giảm: test RF-3 viết và xanh trên SQL cũ trước khi đổi.
- Tách một statement thành nhiều `existsBy` (G-8) đổi số câu SQL — cách giảm: lập luận khóa ở G-8; test ST-10.AC-3, ST-16.AC-3 và test đồng thời có sẵn.
- Tham số đặt tên trong giá trị hàm (`-CAST(:quantity AS numeric)`) không được thay nếu TypeORM không quét — cách giảm: test ST-16.AC-2 khẳng định `quantity` `-1.000`; nếu đỏ, tdd báo agent chính trước khi đổi cách (không tự chọn cách khác).
- `sales.service.ts` sửa qua 6 sub-task nối tiếp; xung đột nếu chạy song song — cách giảm: `depends_on` tuần tự ST-12 → ST-17, giao `tdd` lần lượt.
- Môi trường DB: mật khẩu `POS_INFRA/.env.local` không khớp container; cổng thật là host 5432 (M-34 ghi 15432 là cũ) (G-9) — cách giảm: agent chính dựng `DATABASE_URL` từ `docker exec pos_infra-postgres-1 printenv POSTGRES_*` và truyền trong lệnh cho `tdd`, không ghi mật khẩu.

## Lệnh kiểm tra
- Delta ST-6.AC-1: focused command và chuỗi build/module/suite chính xác ở bước 7 ST-6, chỉ sau user duyệt rõ ngoại lệ. Lưu ac1-characterization-current.log/ac1-module.log/ac1-suite.log; chưa chạy assertion mới trong lượt draft. Không yêu cầu đổi lại SQL cũ hoặc tạo sandbox.
- Command focused/module delta chính xác ở bước 4/6 ST-6 và bước 3/5 ST-13, chạy sau npm run build với DATABASE_URL theo quy định chung. CHƯA chạy trong lượt draft.
- Lint: Không có lệnh lint — `POS_API/package.json` không có script lint (`.devloopflow/devloopflow.md` mục 2).
- Typecheck: qua `npm run build` trong `POS_API/` (`tsc -p tsconfig.json`, `POS_API/package.json:6`).
- Test: trong `POS_API/`, `npm test` (`npm run build && node --env-file-if-exists=.env --test --test-concurrency=1 "dist/**/*.test.js"`, `POS_API/package.json:9`), với `DATABASE_URL` trỏ `pos_infra-postgres-1` do agent chính dựng. Một file: `npm run build` rồi `node --test --test-concurrency=1 dist/<module>/tests/<file>.test.js`; một case: thêm `--test-name-pattern "<tên test cha>"` (M-32).
- Build: trong `POS_API/`, `npm run build`.
- Coverage: Không có lệnh coverage (`.devloopflow/devloopflow.md` mục 2).
- Chạy app: Không cần cho task này (không đổi API; kiểm bằng test HTTP/integration). Nếu `ac-verifier` cần: từ gốc repo `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait` — URL/port: API `http://localhost:3000/api/v1/health`.
- Kiểm không còn SQL thuần: trong `POS_API/src`, `grep -rn "\.query(" --include=*.ts . | grep -v "/migrations/" | grep -v "\.test\.ts" | grep -v "/tests/"` (kỳ vọng rỗng) và `grep -rn "raw-sql" --include=*.ts .` (kỳ vọng rỗng).
- Graphify: ở gốc repo `graphify update .`; `graphify check-update .`; `graphify query "<câu hỏi>"`.
- (2026-11-17) Đếm chú thích QueryBuilder: trong `POS_API/src`, `grep -c "// QueryBuilder:" <file>` cho 13 file ở E2E-AC-11; tổng thêm so với `master`: `git diff master -U0 -- POS_API/src | grep "^+" | grep -c "// QueryBuilder:"` (kỳ vọng 33). Dòng `createQueryBuilder(` mới: `git diff master -U0 -- POS_API/src ':!*.test.ts' ':!**/tests/**' | grep "^+.*createQueryBuilder("`. Khóa mới không qua method: `git diff master -U0 -- POS_API/src ':!*.test.ts' ':!**/tests/**' | grep "^+.*setLock("` (kỳ vọng rỗng). Chuỗi SQL chuẩn hóa username còn sót: `grep -rn "lower(btrim" --include=*.ts POS_API/src | grep -v "/migrations/" | grep -v "\.test\.ts" | grep -v "/tests/"` (kỳ vọng rỗng).

## Câu hỏi mở
- Không có câu hỏi mở. Q1 ("làm luôn"), Q2 ("2 sang JS") đã được user trả lời 2026-11-17, chuyển sang "Quyết định". Các giả định G-11..G-16, G-18, G-19, G-20 chờ user xác nhận ở cổng duyệt. Cổng duyệt mới: user duyệt đúng ba dòng bổ sung trong ca foreign branch hiện hữu và ngoại lệ characterization riêng ST-6.AC-1 (không RED riêng, chưa runtime assertion mới trên SQL cũ; chỉ tick sau focused/module/suite/diff xanh). Agent chính trình rõ cổng này; chưa duyệt thì DỪNG phần AC-1, không mở rộng thành bug fix. Delta ST-6/ST-13 cũ đã duyệt ngày 2026-11-17, không coi đó là duyệt AC-1.


## Changelog plan
- 2026-11-16: tạo plan nháp (chỉ thêm, không xoá)
- 2026-11-16: cập nhật theo trả lời user: (1) "Bọc hết vào QueryBuilder" cho 15 lời gọi không đọc bảng → dùng `fromDummy()` (bằng chứng `SelectQueryBuilder.js:156-159,1035-1036,1097-1102,1754-1761`, `QueryBuilder.js:405-415`), ngoại lệ SQL thuần giảm 21 → 6, số chuyển 135 → 150; ST-3 viết lại (11 chuyển, depends ST-2, thêm AC-5/AC-6/AC-7 và test username/chuỗi khóa login); ST-10 (24 chuyển, 2 ngoại lệ), ST-11 (10 chuyển, 1 ngoại lệ), ST-16 (22 chuyển, 2 ngoại lệ), ST-17.AC-3, ST-18, E2E-AC-1/2/8/9, ma trận cập nhật số; (2) giữ SQL thuần E4/E5/E6; (3) test ghi SQL so thứ tự khóa; (4) G-1, G-4..G-8 đã xác nhận; G-9 baseline 256/256 và cổng 5432; RF-5 đổi sang chuẩn hóa username (idempotency vẫn phủ bởi ST-10.AC-3, ST-16.AC-3); "Câu hỏi mở" rỗng.
- 2026-11-16: cập nhật theo quyết định mới của user "6 truy vấn khó cũng cập nhật thành querybuilder luôn": bỏ toàn bộ ngoại lệ SQL thuần (6 → 0), số chuyển 150 → 156; thêm bằng chứng TypeORM (`InsertQueryBuilder.js:110-115,197-209,329-330,420-427`, `ReturningResultsEntityUpdator.js:90-113`, `QueryBuilder.js:352-359,780-819`, `SelectQueryBuilder.js:95,119,1008-1028`, `PostgresDriver.js:643-653`); "Quy tắc chuyển" thêm `onConflict()` (+ `updateEntity(false)`), CTE QueryBuilder, `generate_series`, sub-query thay `UNION ALL`, quy tắc tên tham số; bảng ngoại lệ thay bằng "Bảng chuyển 6 truy vấn khó"; sửa "Mục tiêu", "Quyết định", G-2, G-4, "Phạm vi", "Lỗi cũ" (reports), ST-6 (3 chuyển, depends ST-1/ST-2, AC-3..AC-6 mới), ST-10 (26 chuyển, AC-6/AC-7 mới), ST-11 (11 chuyển, AC-4 mới), ST-16 (24 chuyển, AC-6/AC-7 mới), ST-17.AC-3, ST-18 (không bảng ngoại lệ), E2E-AC-1/2/9/10, ma trận, "Rủi ro", "Lệnh kiểm tra".

- 2026-11-16: tạo draft delta ST-3 từ plan active, giữ nguyên tiến độ đã tick ST-1/ST-2 và toàn bộ lịch sử; user trả lời nguyên văn "đồng ý" cho hướng sửa duy nhất mock health trong `POS_API/src/foundation.test.ts`, chưa duyệt draft delta này. Điều chỉnh ngoại lệ test cũ trong "Phạm vi", quy định chung, E2E-AC-6 và kiểm ST-18; ST-3.AC-4/plan/test/mapping nêu RED lỗi hiện hữu `200 !== 503` → mock `PostgresQueryRunner.prototype.query` chỉ cho SELECT health → GREEN, restore `finally`, giữ nguyên mọi assertion; thêm rủi ro mock. Không đổi source/test/active/approved trong lượt lập draft.
- 2026-11-16: user duyệt rõ draft delta ST-3 bằng "duyệt"; kích hoạt bản plan này để tiếp tục ST-3.

- 2026-11-17: tạo draft delta ST-5/ST-10 từ active, `status: draft`, `approved_at` trống; giữ tiến độ đã tick ST-1..ST-4 và toàn bộ lịch sử. User nói "tiếp" sau thông báo đang lập draft delta ST-5; không coi là duyệt plan. Chỉ đề xuất hai ngoại lệ literal trong `test_ST5_account_permission_race`: store ở ST-5, INSERT ở ST-10 chỉ khi SQL thực tế lệch mẫu cũ và RED đúng gate. Đã dựng kiểm fragment bằng TypeORM 0.3.31 `getQueryAndParameters()` với metadata thật, không kết nối DB. Cập nhật Khám phá, Quyết định, Phạm vi, quy định chung, E2E-AC-6, ST-5.AC-5/ST-10.AC-8, ST-18, ma trận, rủi ro/checklist. Giữ helper/Lock/timeout/poll/assertion/thứ tự request/trạng thái cuối; chưa sửa code/test/active/approved/task, chưa chạy lại race/suite, chưa commit/push.
- 2026-11-17: user duyệt rõ draft delta ST-5/ST-10 bằng "duyệt"; kích hoạt plan này để tiếp tục ST-5.

- 2026-11-17: tạo DRAFT delta ST-6/ST-13 từ active sau ST-5, status draft/approved_at trống, giữ mọi tick ST-1..ST-5/toàn bộ lịch sử. Đề xuất đúng hai mock reports/một counter invoices-read lên QueryRunner đúng DataSource, SELECT/WITH guard tránh UPDATE barrier/canceller; duy nhất assertion MỚI assert.ok(one > 0) tránh 0/0. Mọi assertion hiện hữu giữ nguyên. Cập nhật Khám phá/Quyết định/Phạm vi/quy định chung/E2E-AC-6/ST-6.AC-3,7/ST-13.AC-4/ST-18/ma trận/rủi ro/lệnh/checklist. Chỉ thay mock sau duyệt và RED thật tại sub-task sở hữu; chưa có RED ST-6/ST-13, chưa sửa source/test/active/approved/task, chưa build/test/commit/push; user CHƯA duyệt delta này.

- 2026-11-17: user duyệt bản delta ST-6/ST-13 bằng lời nhắn nguyên văn "duyệt"; kích hoạt plan để tiếp tục TDD ST-6. Chưa sửa source/test trong lượt duyệt.

- 2026-11-17: tạo DRAFT delta ST-6.AC-1 từ active, status draft/approved_at trống; giữ mọi checkbox/toàn bộ lịch sử, gồm lần user duyệt ST-6/ST-13. Ca foreign branch hiện hữu chỉ assert 404 vì total bỏ body. Đề xuất ba dòng: một ownerGet và hai assertion NOT_FOUND/Không tìm thấy tài nguyên. ngay sau status assertion cũ; không tạo test/fixture mới, không đổi assertion cũ hoặc production. Skill TDD yêu cầu RED và chỉ tick AC có RED/GREEN, nên đề xuất cổng user duyệt rõ ngoại lệ characterization riêng AC-1; chưa duyệt/chưa chạy assertion mới, không giả RED/runtime SQL cũ, không dùng RED AC-7 thay AC-1. Chỉ planner ghi draft; không sửa active/approved/task/source/test, không build/test/commit/push.

- 2026-11-17: user duyệt delta ST-6.AC-1 bằng lời nhắn nguyên văn "duyệt", gồm ba dòng assertion và ngoại lệ characterization riêng AC-1 không có RED độc lập; kích hoạt để kiểm chứng ST-6. Chưa sửa test trong lượt duyệt.
- 2026-11-17: tạo DRAFT "quy tắc ORM mới" từ active (status draft, approved_at trống; giữ mọi tick ST-1..ST-6 và toàn bộ lịch sử). Nguồn: user nguyên văn "chỉ các câu phức tập ko dùng được các hàm truy vấn findOne find create update delete thì mới dùng qua querybuilder. sửa lại plan và các tài liệu liên quan" và lời bổ sung cùng ngày "khi nào mà các mã ngắn gọn như find findOne relations where phức tạp mà ko làm được nữa thì mới nghĩ đến query builder ... còn find hoặc findOne hoặc các hàm ngắn hơn đỡ sai sót". Thay đổi: thêm Khám phá (hiện trạng ST-3..ST-6, hành vi TypeORM 0.3.31 có path:dòng, SQL dựng offline cho `findOne/find` có `lock`/`tables`/relation, `upsert`, `update` có `returning`, `In([])`, cảnh báo `null`/`undefined`, CHECK số lượng, tài liệu đã sửa sẵn trong working tree); Quyết định (quyết định mới, lời bổ sung, đề xuất literal ST-5b và refactor không RED chờ duyệt); Giả định G-10..G-18 chờ xác nhận, ghi chú G-2/G-4/G-5; Phạm vi; Thiết kế tổng thể (thứ tự thử (1)-(4), bảng quy tắc bản 2, mã lý do L1..L6, bảng QueryBuilder còn giữ 33 câu theo file, bảng quyết định ST-3..ST-6, quyết định thiết kế); E2E-AC-8/9 sửa, E2E-AC-11/12 mới; quy định chung bản 2; sub-task mới ST-3b (`normalizeUsername` + chú thích), ST-4b, ST-5b (literal race chờ duyệt), ST-6b; viết lại bảng "Truy vấn" ST-7..ST-17 với cột "Đã thử"; cập nhật AC grep/khóa (tách token theo G-17) ST-7..ST-17, ST-9.AC-5 mới; ST-18 (đối chiếu 3 tài liệu đã sửa sẵn, G-15); ma trận, rủi ro, lệnh kiểm tra; Câu hỏi mở Q1 (QueryBuilder có sẵn trên master), Q2 (Unicode của `normalizeUsername`). Bản 1 nội bộ của draft này (69 câu QueryBuilder, giữ `fromDummy()` cho username) đã được thay ngay trong lượt bởi bản 2 sau lời bổ sung; không phải bản đã trình user. Chưa sửa source/test/active/approved/task, chưa build/test/commit/push.

- 2026-11-17: cập nhật draft theo trả lời user "1>làm luôn / 2 sang JS / 4.đồng ý / 5 đồng ý / tách 2 findone" và "đồng ý" cho G-10: thêm ST-19 (auth 21), ST-20 (users 4, platform 6, bootstrap-admin 1), ST-21 (organization 5), ST-22 (menu 16), ST-23 (shifts 8) cho QueryBuilder có sẵn trên `master` (danh sách bằng `git grep` thật), mỗi câu có cột "Đã thử"; module chưa có test thì test characterization trước; 52 câu sang method, 9 giữ L2. Thêm G-19 (`Raw` đồng hồ DB), G-20 (kiểm danh tính rỗng); G-10, G-17 và nội dung G-16 sang đã xác nhận; Q1, Q2 sang Quyết định; "Câu hỏi mở" rỗng. Sửa Mục tiêu, Phạm vi (menu/organization vào phạm vi), bảng QueryBuilder theo file (tổng 42), E2E-AC-11 (42 chú thích), E2E-AC-12 (không còn `setLock(` toàn `POS_API/src`), ST-18 `depends_on`, ma trận, rủi ro. Dựng SQL offline (`orm-sql3.js`) cho `Raw` trong `delete`/`count`, `IsNull`/`In([])` trong `update`, `comment` + `lock.tables` + `relations`, `order` lồng, `select` cột ẩn. Chưa sửa source/test/active/approved/task, chưa build/test.

- 2026-11-17: user duyệt plan (nguyên văn: "duyệt plan nhưng chưa làm chỉ đưa vào active rồi khi nào t kêu làm thì bắt đầu làm"); kích hoạt plan, chưa bắt đầu code.
- 2026-11-17: user chọn bỏ bốn mốc đếm `// QueryBuilder:` giữa chừng của `sales/sales.service.ts` (ST-12.AC-5 = 0, ST-13.AC-1 = 4, ST-15.AC-3 = 5, ST-16.AC-4 = 10) bằng lời nhắn nguyên văn "chọn 1, bỏ bốn mốc", sau khi kiểm AC lần 1 (V1-2) báo không còn log các mốc này. Chỉ sửa bốn dòng AC; số cuối vẫn kiểm ở E2E-AC-11 (11) và ST-17.AC-3. Không đổi AC khác, không đổi mã.

## Kiểm tra sẵn sàng
- Cập nhật 2026-11-17 (lượt trả lời Q1/Q2/G-10/G-17): Câu hỏi mở — ĐẠT (rỗng); Giả định — KHÔNG ĐẠT tới cổng duyệt: G-11..G-16, G-18, G-19, G-20 chờ user xác nhận; `depends_on` — ĐẠT (ST-19←ST-17, ST-3b; ST-20←ST-19; ST-21←ST-20; ST-22←ST-21; ST-23←ST-22, ST-7; ST-18 thêm ST-19..ST-23); ma trận — ĐẠT (thêm ST-19..ST-23).
- Cập nhật 2026-11-17 cho draft quy tắc ORM mới (các dòng ĐẠT bên dưới ghi theo lượt trước; kết quả lượt này):
  - Không còn TBD/TODO/"v.v."/"CHƯA CÓ NGUỒN" — ĐẠT: điều chưa xác minh ghi rõ "CHƯA xác minh" kèm test phải kiểm (upsert `returning`, `SET` cột xung đột).
  - Mọi fact có nguồn — ĐẠT: TypeORM path:dòng; SQL dựng offline bằng script; mã nguồn có số dòng.
  - Interfaces khớp — ĐẠT: ST-3b Produces `normalizeUsername(value: string): string`, chưa sub-task sau nào Consumes ngoài file đã liệt kê; ST-7..ST-17 Consumes giữ nguyên chữ ký.
  - `depends_on` nhất quán — ĐẠT: ST-3b←ST-3; ST-4b←ST-4, ST-3b; ST-5b←ST-5, ST-4b; ST-6b←ST-6, ST-5b; ST-7←ST-6b; ST-18 thêm ST-3b..ST-6b.
  - Câu hỏi mở rỗng, giả định đã xác nhận — (lượt trước: KHÔNG ĐẠT vì Q1, Q2; lượt sau đã trả lời, xem dòng cập nhật bên trên).
  - Mỗi sub-task mới có AC đo được và test input/expected — ĐẠT (ST-3b..ST-6b, ST-9.AC-5).
  - Mọi AC có test trong ma trận — ĐẠT: thêm dòng ST-3b..ST-6b, ST-9.AC-5, E2E-AC-11/12.
- [x] Không còn từ mơ hồ, TBD, TODO, "v.v.", "CHƯA CÓ NGUỒN" — ĐẠT (cập nhật 2026-11-16): G-2, G-3 đã có trả lời user; baseline 256 đã điền; chuỗi "CHƯA CÓ NGUỒN" chỉ còn trong câu hướng dẫn của template ở đầu file.
- [x] Mọi fact/quy tắc/field/endpoint có path nguồn hoặc nằm trong "Quyết định" của user; không có thông tin tự suy đoán — ĐẠT: cột lấy từ migration có dòng; hành vi TypeORM dẫn file:dòng trong `node_modules`; mảng khóa kỳ vọng ghi rõ "suy từ source, tdd xác nhận trên mã cũ".
- [x] Không có mục nào bị bỏ, rút gọn hoặc tóm tắt so với template — ĐẠT: đủ mọi mục; mục không áp dụng ghi "Không có" kèm lý do.
- [x] Interfaces: mọi Consumes của một sub-task khớp đúng tên, tham số, kiểu trả về với Produces của sub-task nó phụ thuộc — ĐẠT: tên entity (ST-1), `captureSql`/`lockSequence` (ST-2), helper sales (ST-12), `evaluateInvoicePricing`/`finalizeInvoice` (ST-15/ST-16, chữ ký có sẵn) khớp từng ký tự.
- [x] Review Focus: mỗi dòng có test trong ma trận AC ↔ test — ĐẠT: RF-1..RF-5 có dòng trong ma trận.
- [x] Mục Câu hỏi mở không còn câu hỏi nghiệp vụ/kỹ thuật, Giả định giữ nguồn/xác nhận cũ — ĐẠT cho draft: nghiệp vụ giữ nguyên, ST-6/ST-13 đã duyệt; cổng mới chỉ AC-1/ba dòng/ngoại lệ characterization chưa duyệt. Không tự miễn RED hoặc tick trước chứng cứ.
- [x] Mỗi sub-task có AC đo được/plan/test input-expected — ĐẠT: giữ delta ba mock/RED-GREEN; AC-1 nêu input owner_a/b1, ba dòng cụ thể, status/code/message, characterization hiện tại, giới hạn chưa RED riêng/runtime SQL cũ, cổng duyệt và focused/module/suite/diff.
- [x] Mọi AC có ít nhất 1 test trong ma trận AC ↔ test; mọi test thuộc 1 AC — ĐẠT.
- [x] Đủ AC cho happy path, input sai/thiếu, quyền, biên, lỗi hệ thống — ĐẠT: happy path (chuỗi khóa, upsert, tính giá), input sai (mã lỗi ST-12/ST-14), quyền (ST-6.AC-1, ST-12.AC-4, M-1 ở ST-10/ST-13), biên (micro giây, thiếu dòng stock, trần tiền), lỗi hệ thống (`23505` → 409 ở ST-4/ST-8/ST-14).
- [x] Mọi AC (E2E-AC-n và ST-n.AC-k) nằm trên một dòng riêng, bắt đầu bằng `- [ ]` — ĐẠT.
- [x] File tạo/sửa liệt kê đủ — ĐẠT: giữ scope cũ/ngoại lệ đã duyệt; delta AC-1 chỉ ba dòng trong reports.integration.test.ts, không file/fixture/helper/config/dependency/export mới; mọi assertion hiện hữu giữ nguyên.
- [x] Đã đối chiếu .devloopflow/errors/ và ghi "Lỗi cũ cần tránh" — ĐẠT: 12 file lỗi liên quan db/locking/sales/shifts/reports/inventory.
- [x] Lệnh lint/typecheck/test/build/coverage/chạy app là lệnh thật của dự án — ĐẠT: dẫn `POS_API/package.json:6,9`, `.devloopflow/devloopflow.md` mục 2.
- [x] Một agent khác đọc plan này có làm được mà không cần hỏi lại — ĐẠT (cập nhật 2026-11-16): mỗi lời gọi có đích cụ thể; giá trị kỳ vọng chưa biết trước (mảng khóa, chuỗi username, chuỗi tồn kho) có cách lấy tường minh: chạy test trên mã cũ và ghi evidence.
