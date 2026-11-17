---
id: 20261116-orm-entities-refactor
spec: Bỏ qua spec: user chọn "Bỏ qua spec, ghi quy ước vào rules/database.md" (việc kỹ thuật, không đổi nghiệp vụ), ngày 2026-11-16
plan: .devloopflow/approved/20261116-orm-entities-refactor.md
status: completed
mode: đầy đủ
owner:
started_at: 2026-11-16
completed_at: 2026-11-17
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Task 20261116-orm-entities-refactor

## Yêu cầu (nguyên văn của user)
- "t cần nhất quán làm orm jsts chỉ builder cho những cái phức tạp" (hiện dùng orm nhưng toàn dùng mã sql thuần, không dùng entity hay các method mã js/ts; cần triển khai sử dụng lại)
- Xác nhận phạm vi: "làm đi" (sau đề xuất 4 bước: quy ước, thêm entity thiếu, chuyển từng module, giữ SQL thuần có chú thích chỉ khi QueryBuilder không diễn đạt được).

## Trạng thái
- Bước hiện tại (số bước trong flow): hoàn tất (task đóng 2026-11-17; kiểm AC lần 2 PASS; code review PASS vòng 3; npm test 350/350, build 0). Chưa commit, chưa push theo yêu cầu.
- Đã xong: Bước 1 khám phá (agent chính tự khảo sát, không giao subagent explorer). Commit tài liệu Giai đoạn 2 và push `master` (`026dbfc`) rồi tạo nhánh `refactor/orm-entities` theo yêu cầu user.
- Đang làm: code review đã PASS (vòng 3); tiếp bước 9 kiểm AC.
- Sắp làm: bước 9 verify-ac, bước 10 đóng task. Còn nợ: Graphify semantic update 3 file Markdown (ST-18.AC-5, E2E-AC-10) chờ user quyết định phạm vi.

## Kết quả khám phá (bước 1)
- Số lời gọi SQL thuần `.query(` trong mã không phải test và migration (đếm bằng grep ngày 2026-11-16): sales.service.ts 67; transfer-attempts.service.ts 26; inventory.service.ts 21; sepay-webhook.service.ts 11; shifts.service.ts 8; auth.service.ts 6; promotions.service.ts 5; store-bank-account.service.ts 4; reports.service.ts 3; bootstrap-admin.ts 2; users.service.ts 1; platform.service.ts 1; http/health.controller.ts 1. Tổng 156 trong 13 file.
- Tính năng SQL cần quyết (grep): `FOR UPDATE` ~30 chỗ (sales 9, transfer-attempts 8, inventory 5, sepay-webhook 4, promotions 1, shifts 1, store-bank-account 1); `ON CONFLICT` 8 chỗ; CTE (`WITH`) 3 chỗ (reports 1, sales 2); nhiều JOIN (sales 27, inventory 9, transfer-attempts 8).
- Entity đã có (`POS_API/src/database/data-source.ts`, mảng `entities`): stores, branches, dining_tables, roles, permissions, role_permissions, users, refresh_tokens, auth_rate_events, categories, sizes, products, product_sizes, toppings, category_toppings, work_shifts, cash_reconciliations, invoices, invoice_items, invoice_item_toppings.
- Bảng có trong migration nhưng CHƯA có entity: bank_transfer_events, branch_ingredient_stocks, ingredients, invoice_promotion_codes, payments, product_size_ingredients, promotion_codes, shift_expenses, stock_movements, store_bank_accounts, topping_ingredients, transfer_attempts.
- Quy ước entity hiện có (`POS_API/src/sales/entities/invoice.entity.ts`): thuộc tính snake_case khớp tên cột, `bigint` khai báo kiểu `string`, import trực tiếp (xem `POS_API/README.md` mục entity).
- Quy tắc bắt buộc liên quan: M-14 (khóa dòng gốc bằng statement riêng rồi mới đọc quan hệ), M-20 (không `FOR UPDATE` trên nullable side của `LEFT JOIN`; dùng `innerJoin` + `.setLock('pessimistic_write', undefined, ['alias'])`; `--test-concurrency=1`), M-21 (`manager.query` với `UPDATE ... RETURNING` trả `[rows, rowCount]`), M-34 (chạy test trên Docker `pos_infra-postgres-1`), M-36 (giải thích bằng lời thường khi hỏi user), M-37 (tái sử dụng phần có sẵn), M-46 (gọi skill caveman, ponytail, dùng graphify).
- CLAUDE.md: đổi công nghệ hoặc lệnh thì cập nhật `docs/architecture/TECH_STACK.md`; migration chỉ thêm mới, không dùng `schema:sync`; test API cần PostgreSQL.

## Câu hỏi và trả lời của user (bước 2, nguyên văn, ngày 2026-11-16)
- Chia PR: "1 PR cho toàn bộ" (agent chính đề xuất 3 PR theo nhóm module; user chọn khác đề xuất).
- Spec: "Bỏ qua spec, ghi quy ước vào rules/database.md (Recommended)".
- Ai viết code: "Giao subagent tdd theo devloopflow (Recommended)".
- Ngoại lệ SQL: "Cho giữ SQL thuần, có chú thích lý do (Recommended)".

## Môi trường test
- Baseline lần 1 (`DATABASE_URL` dựng từ `POS_INFRA/.env.local`): 56 test chạy, 15 pass, 41 fail, lỗi `password authentication failed for user "pos_local"`. Nguyên nhân: mật khẩu trong `.env.local` (48 ký tự) không khớp mật khẩu container `pos_infra-postgres-1` (16 ký tự). Mâu thuẫn với M-34 (ghi dùng `.env.local`).
- Baseline lần 2: dựng `DATABASE_URL` từ `docker exec pos_infra-postgres-1 printenv POSTGRES_*` (không in, không ghi file). Kết quả thật (`npm test` trong `POS_API/`, exit 0, ngày 2026-11-16, nhánh `refactor/orm-entities` chưa có thay đổi mã): `# tests 256`, `# pass 256`, `# fail 0`, `# duration_ms 199872.1446` (khoảng 200 giây). Log: scratchpad `baseline2.log` (local, không commit).

## File đã thay đổi
| Path | Thay đổi gì | Sub-task |
|------|-------------|----------|
| `POS_API/src/database/data-source.ts` | Đăng ký 12 entity mới, tổng 32 | ST-1 |
| `POS_API/src/inventory/entities/ingredient.entity.ts` | Entity ingredients | ST-1 |
| `POS_API/src/inventory/entities/product-size-ingredient.entity.ts` | Entity product_size_ingredients | ST-1 |
| `POS_API/src/inventory/entities/topping-ingredient.entity.ts` | Entity topping_ingredients | ST-1 |
| `POS_API/src/inventory/entities/branch-ingredient-stock.entity.ts` | Entity branch_ingredient_stocks | ST-1 |
| `POS_API/src/inventory/entities/stock-movement.entity.ts` | Entity stock_movements | ST-1 |
| `POS_API/src/promotions/entities/promotion-code.entity.ts` | Entity promotion_codes | ST-1 |
| `POS_API/src/sales/entities/invoice-promotion-code.entity.ts` | Entity invoice_promotion_codes | ST-1 |
| `POS_API/src/sales/entities/payment.entity.ts` | Entity payments | ST-1 |
| `POS_API/src/sales/entities/transfer-attempt.entity.ts` | Entity transfer_attempts | ST-1 |
| `POS_API/src/sales/entities/bank-transfer-event.entity.ts` | Entity bank_transfer_events | ST-1 |
| `POS_API/src/sales/entities/store-bank-account.entity.ts` | Entity store_bank_accounts | ST-1 |
| `POS_API/src/shifts/entities/shift-expense.entity.ts` | Entity shift_expenses | ST-1 |
| `POS_API/src/database/tests/entity-schema.integration.test.ts` | Test schema metadata và repository Payment | ST-1 |
| `POS_API/src/database/tests/sql-capture.ts` | Helper ghi SQL và rút chuỗi khóa | ST-2 |
| `POS_API/src/database/tests/sql-capture.test.ts` | Test unit chuỗi khóa | ST-2 |
| `POS_API/src/database/tests/sql-capture.integration.test.ts` | Test capture SQL raw/QueryBuilder trên PostgreSQL | ST-2 |
| `POS_API/src/auth/auth.service.ts` | Chuyển SQL raw sang repository/QueryBuilder, đang chờ test cũ | ST-3 |
| `POS_API/src/auth/tests/auth.integration.test.ts` | Test đặc tả thứ tự khóa login | ST-3 |
| `POS_API/src/bootstrap-admin.ts` | Chuyển SQL raw sang QueryBuilder, đang chờ test cũ | ST-3 |
| `POS_API/src/http/health.controller.ts` | Chuyển health sang QueryBuilder; test cũ mock sai tầng | ST-3 |
| `POS_API/src/foundation.test.ts` | Theo plan delta đã duyệt: mock đúng SELECT health ở QueryRunner, giữ nguyên assertions | ST-3 |
| `POS_API/src/organization/tests/organization.integration.test.ts` | Test đặc tả username nhân viên | ST-3 |
| `POS_API/src/platform/platform.service.ts` | Chuyển SQL raw sang QueryBuilder, đang chờ test cũ | ST-3 |
| `POS_API/src/platform/tests/platform.integration.test.ts` | Test đặc tả username chủ cửa hàng | ST-3 |
| `POS_API/src/users/users.service.ts` | Chuyển SQL raw sang QueryBuilder, đang chờ test cũ | ST-3 |
| `POS_API/src/promotions/promotions.service.ts` | Chuyển 5 truy vấn sang repository/QueryBuilder | ST-4 |
| `POS_API/src/inventory/tests/inventory.integration.test.ts` | Test khóa, response, cursor, HTTP và lọc theo store/q/isActive | ST-4 |
| `POS_API/src/sales/store-bank-account.service.ts` | Đã chuyển 4 truy vấn; đang chờ delta test race | ST-5 |
| `POS_API/src/sales/tests/payment.integration.test.ts` | Thêm 3 test đặc tả ST-5; test race cũ còn cần đổi mẫu dò SQL | ST-5 |
| `POS_API/src/reports/reports.service.ts` | Chuyển 3 truy vấn sang repository/QueryBuilder, giữ một statement doanh thu | ST-6 |
| `POS_API/src/reports/tests/reports.integration.test.ts` | Đặc tả best sellers/statement, đổi 2 mock đã duyệt, thêm 3 dòng AC-1 đã duyệt | ST-6 |
| `POS_API/src/shifts/shifts.service.ts` | Chuyển truy vấn shifts sang repository/QueryBuilder (còn 4 QueryBuilder: L1, L1, L2 cộng trang `listShifts`) | ST-7, ST-23 || `POS_API/src/shifts/entities/shift-expense.entity.ts` | Entity shift_expenses | ST-1, ST-7 || `POS_API/src/shifts/tests/shifts.integration.test.ts`, `shift-expenses.integration.test.ts` | Test đặc tả khóa, nguồn tiền đầu ca, chi phí, cursor | ST-7, ST-23 || `POS_API/src/inventory/inventory.service.ts` | Chuyển 21 truy vấn; còn 4 QueryBuilder | ST-8, ST-9 || `POS_API/src/sales/transfer-attempts.service.ts` | Chuyển truy vấn lượt chuyển khoản; còn 5 QueryBuilder | ST-10 || `POS_API/src/sales/sepay-webhook.service.ts` | Chuyển truy vấn webhook; còn 2 QueryBuilder (L4) | ST-11 || `POS_API/src/sales/sales.service.ts` | Chuyển toàn bộ 67 truy vấn; còn 11 QueryBuilder | ST-12..ST-17 || `POS_API/src/sales/tests/sales.integration.test.ts`, `cancel-paid.integration.test.ts`, `invoices-read.integration.test.ts` | Test đặc tả khóa, lỗi, thứ tự, hủy đơn; invoices-read đổi counter theo delta ST-13 | ST-12..ST-17 || `POS_API/src/auth/auth.service.ts`, `organization/organization.service.ts`, `platform/platform.service.ts`, `users/users.service.ts`, `menu/menu.service.ts`, `bootstrap-admin.ts` | Chuyển QueryBuilder có sẵn trên master sang method repository; giữ QueryBuilder cursor L2 và advisory L5 | ST-19..ST-22 || `POS_API/src/menu/tests/menu.integration.test.ts`, `organization/tests/*`, `platform/tests/*`, `auth/tests/*` | Test đặc tả khóa, phạm vi cửa hàng, thứ tự | ST-19..ST-22 || `rules/database.md`, `docs/architecture/TECH_STACK.md`, `POS_API/README.md` | Quy ước truy vấn ORM (method trước, QueryBuilder cuối), bảng L1..L6, danh sách entity | ST-18 |

## Đã đọc errors
- ST-1: Đã đọc `.devloopflow/errors/INDEX.md` và `.devloopflow/errors/2026-10-30-module-refactor-evidence-runner.md` trước test. Test so tập cột và khóa đã chuẩn hóa; RED nguyên văn từ transcript subagent ở `verify/20261116-orm-entities-refactor/evidence/ST-1/red.log`.
- ST-1: Agent chính chạy `npm run build` và test riêng 2/2 (`evidence/ST-1/root-build.log`, `root-focused.log`); `npm test` 258/258, fail 0 (`root-suite.log`), exit 0. AC-1..AC-4 và test viết trước đã tick trong plan active. Chưa commit, chưa push.
- ST-2: Đã đọc `.devloopflow/errors/INDEX.md` và `.devloopflow/errors/2026-10-30-module-refactor-evidence-runner.md`. RED 4 AC trong `evidence/ST-2/red.log`; GREEN 5/5, gồm case JOIN không alias (`root-focused.log`); agent chính chạy `npm run build` (`root-build.log`) và `npm test` 263/263, fail 0 (`root-suite.log`), exit 0. AC-1..AC-4 đã tick. Subagent chạy RED/GREEN cho 4 AC theo nhóm, rồi suite một lần sau khi tất cả AC xanh; đây là lệch khỏi vòng suite riêng từng AC của `tdd.md`. Kiểm đột biến: test chưa bắt riêng việc chuyển tiếp parameters hoặc tự khôi phục mock; phần này sẽ được review khi helper được dùng ở ST-3..ST-17.
- ST-3: Subagent đọc lỗi chuẩn hóa username và race lock theo plan. Test đặc tả trên mã cũ ghi `nv.an`, `\tnv2`, `chu.quan`, khóa login `advisory, advisory, UPDATE:users`. Đã chuyển 11 lời gọi `.query(` ở 5 file, test mới và build xanh. `npm test` sau chuyển: 266 test, 265 pass, 1 fail (`PB-01 migration, bootstrap and database constraints`, `foundation.test.ts:112-117`), thực tế 200 thay vì 503; log `evidence/ST-3/suite.log`. Không tick AC ST-3.
- ST-3 plan delta: user đồng ý hướng sửa mock health bằng "đồng ý", planner tạo draft delta, user duyệt rõ bằng "duyệt" ngày 2026-11-16. Bản mới ở `plans/active/` và `approved/`; bản cũ được thay bằng bản mới có changelog, các tick ST-1/ST-2 giữ nguyên. Cho phép sửa đúng mock health và import cần cho mock trong `foundation.test.ts`, giữ mọi assertion.
- ST-3 sau delta: PB-01 RED `200 !== 503` (`evidence/ST-3/health-mock-red.log`), GREEN 1/1 (`health-mock-green.log`). Agent chính chạy lại `npm run build` (`root-build.log`), PB-01 (`root-foundation.log`), ba test ST-3 mới 3/3 (`root-new-tests.log`), toàn bộ `npm test` 266/266, fail 0 (`root-suite.log`), exit 0. `rg` xác nhận 0 lời gọi `.query(` ở năm file ST-3; diff `foundation.test.ts` chỉ đổi import/mock/restore, mọi assertion giữ nguyên. AC-1..AC-7 đã tick. Subagent chưa kiểm đột biến thực tế hoặc chạy suite riêng sau từng AC, đã ghi giới hạn.
- ST-4: Subagent đọc `.devloopflow/errors/2026-11-07-sprint07-update-returning.md` và INDEX, dùng `result.raw[0]`. Test AC-1..AC-3 trên SQL cũ và ORM, HTTP AC-2..AC-4 trên SQL HEAD và ORM, filter theo store/q/isActive trên SQL cũ và ORM; raw evidence `evidence/ST-4/baseline.txt`, `http-old-sql.txt`, `http-orm.txt`, `filters-old-sql.txt`, `filters-orm.txt`. Agent chính chạy `npm run build` (`root-build.log`), test module 7/7 (`root-module.log`), `npm test` 272/272, fail 0 (`root-suite.log`), exit 0. `promotions.service.ts` giảm `.query(` từ 5 còn 0. AC-1..AC-5 đã tick. Giới hạn: AC-5 RED bằng grep cấu trúc, chưa có test riêng tìm theo `name` hay `isActive=false`; test mới bắt bỏ điều kiện q/isActive/store.
- ST-5: Subagent đọc `.devloopflow/errors/INDEX.md` và M-14. Ba test đặc tả khóa, `updated_at` và QR chờ xanh trên SQL cũ và ORM; build xanh. Test module sau chuyển: 76 test, 74 pass, 2 fail tính cả test cha, lỗi gốc `test_ST5_account_permission_race` nhận `false !== true` ở assertion `bank change must wait for QR store lock` (`evidence/ST-5/module.log`). Chưa chạy suite đầy đủ. Bốn lời gọi `.query(` đã chuyển trong `store-bank-account.service.ts`; AC ST-5 chưa tick.
- ST-5/ST-10 plan delta: user duyệt rõ bằng "duyệt" ngày 2026-11-17. Plan active và approved đã được thay bằng bản delta giữ tick ST-1..ST-4; cho phép đổi literal dò store ở ST-5, literal INSERT chỉ khi cần ở ST-10. Lịch sử lỗi ST-5 trước delta ở mục Blocked.
- ST-5 sau delta: SQL runtime có `FROM "stores" "s"`; test race RED cũ `false !== true`, GREEN 7/7 focused (`evidence/ST-5/race-pattern-green.log`). Agent chính chạy lại build (`root-build.log`), module payment 76/76 (`root-module.log`), `npm test` 276/276, fail 0 (`root-suite.log`), exit 0. Diff test cũ chỉ đổi literal store; `INSERT INTO transfer_attempts` giữ nguyên. ST-5.AC-1..AC-5 đã tick. Mutation test chưa chạy, chưa chứng minh test bắt mọi biến thể mất khóa.
- ST-6 trước code: Subagent TDD phát hiện `reports/tests/reports.integration.test.ts:360,401` mock `w.db.query` để đếm/barrier statement và gây lỗi 500. `SelectQueryBuilder.getRawOne()` dùng `QueryRunner.query`, nên hai mock không còn tác dụng sau chuyển. Agent chính rà literal mock trong test API còn thấy `sales/tests/invoices-read.integration.test.ts:250-258` đếm `db.query` và dự kiến chịu ảnh hưởng ST-13. Chưa sửa ST-6, chưa chạy test; không có RED thực tế cho ST-6.
- ST-6/ST-13 plan delta: user duyệt rõ bằng "duyệt" ngày 2026-11-17. Plan active và approved cập nhật từ draft; chỉ cho phép chuyển hai mock reports và một counter invoices-read sang `PostgresQueryRunner` đúng DataSource, giữ assertion cũ, thêm `assert.ok(one > 0)` ở ST-13. ST-6 chưa triển khai và chưa có RED thực tế.
- ST-6 TDD sau delta: chuyển ba truy vấn reports sang QueryBuilder, đổi đúng hai mock đã duyệt. RED runtime `0 !== 1` và `200 !== 500`; GREEN focused hai mock; thêm hai test đặc tả AC-4/AC-5 xanh trên SQL cũ và mới. Subagent chạy build, module reports 20/20, suite API 278/278, mutation LIMIT 10→9 làm AC-4 fail; raw evidence ở `verify/20261116-orm-entities-refactor/evidence/ST-6/`. Agent chính chạy lại build và focused bốn test 4/4, `npm test` độc lập 278/278, fail 0, exit 0 (`evidence/ST-6/root-suite.log`). AC-1 chưa đủ chứng cứ code/message; chưa tick ST-6.
- ST-6.AC-1 plan delta: user duyệt rõ bằng "duyệt" ngày 2026-11-17, gồm ba dòng sau assertion status 404 hiện hữu và ngoại lệ characterization AC-1 không có RED riêng. Plan active/approved đồng bộ từ draft, giữ mọi tick ST-1..ST-5 và lịch sử. Chưa sửa test AC-1 trong lượt duyệt.
- ST-6 hoàn tất phần triển khai: agent TDD thêm đúng một `ownerGet` và hai assertion code/message, giữ assertion 404 cũ. Agent chính kiểm diff/context và chạy lại `npm run build` exit 0, focused AC-1 1/1, module reports 20/20, `npm test` 278/278 fail 0 exit 0 (`evidence/ST-6/root-ac1-suite.log`); `rg` xác nhận 0 `.query(` trong `reports.service.ts`. RED/GREEN hai mock ở `reports-mock-red.log`/`reports-mock-green.log`; AC-4/5 là characterization xanh trên SQL cũ và ORM, không có RED độc lập; AC-1 theo ngoại lệ user duyệt không có RED riêng/runtime hai assertion mới trên SQL cũ. ST-6.AC-1..AC-7, test và tiến độ đã tick trong plan active. Chưa review-code/verify-ac cuối task; ST-7 chưa bắt đầu theo yêu cầu user.
- Sau câu hỏi của user về hai plan, agent chính đối chiếu `devloopflow:run` bước 5: kích hoạt là chuyển draft sang active và copy approved. Đã xóa đúng file draft của task sau khi xác minh active/approved cùng SHA-256; không động tới draft Sprint 09 đang bị xóa sẵn trong working tree.
- ST-7..ST-23: subagent `tdd` đọc MEMORY (M-14, M-20, M-21, M-24, M-32, M-35, M-36, M-37, M-46), `rules/database.md` và các file errors dẫn trong "Lỗi cũ liên quan" của từng sub-task (ST-19: pb02-login-password-race, pb04-login-role-lock-race, pb02-session-revocation-races; ST-20: pb04-login-role-lock-race; ST-21: 20261110-backlog-branch-scope-null-branchid-fail-open; ST-22: pb07-sold-topping-delete, pb07-uppercase-topping; ST-23: 20261109-cash-close-shift-zero-cash-sales). Mỗi sub-task agent chính tự chạy lại `npm test` đầy đủ trước khi tick: ST-16 331, ST-17 333, ST-19 336, ST-20 341, ST-21 343, ST-22 345, ST-23 350; sau review vòng 1 sửa: 350/350, `npm run build` exit 0.

## Lịch sử review (chỉ thêm, không xoá)
- Vòng 1 (2026-11-17, code-reviewer sonnet): CHANGES_REQUIRED, 5 finding. R1-1 [Medium] `POS_API/src/auth/tests/auth.integration.test.ts:11` xóa dòng import cũ `import { AuthService } from '../auth.service';` (numstat `147 1`, trái E2E-AC-6). R1-2 [Low] `.devloopflow/.claude-st7-orig.ts` file dư untracked → B-68. R1-3 [Low] file draft `20261113-sprint09-ui-r1-6.md` bị xóa từ trước task → B-71 (bỏ). R1-4 [Low] README `fromDummy()` thiếu L3 → B-69. R1-5 [Very Low] hai test trùng tên `test_ST20_AC1_lock_sequences` → B-70.
- Vòng sửa 1 (tdd sonnet): R1-1 khôi phục dòng import cũ, thêm dòng riêng `import { normalizeUsername } ...`; numstat `147 1` → `147 0`; build exit 0; `npm test` 350/350. Ghi lỗi: `.devloopflow/errors/20261117-orm-refactor-existing-test-lines-edited.md` (R1-1; có thêm lần hai ở `cancel-paid.integration.test.ts`, đã khôi phục). Test tái hiện không áp dụng (lỗi cấu trúc test), lệnh thay thế `git diff HEAD --numstat -- POS_API/src | awk '$2>0'`.
- Vòng 2 (2026-11-17, code-reviewer sonnet): CHANGES_REQUIRED, 1 finding. R1-1 mã đã sửa đúng. R2-1 [Medium] `.devloopflow/tasks/active/20261116-orm-entities-refactor.md:101`: R1-1 đã sửa nhưng không có file `.devloopflow/errors/`, lý do "lỗi cấu trúc test" không hợp lệ. Không có lỗi hành vi trong mã production, không finding Low/Very Low mới.
- Vòng sửa 2 (agent chính, chỉ hồ sơ): R2-1 → tạo `.devloopflow/errors/20261117-orm-refactor-existing-test-lines-edited.md`, thêm dòng `errors/INDEX.md`, sửa dòng "Vòng sửa 1" dẫn file đó.
- Vòng 3 (2026-11-17, code-reviewer sonnet): PASS. R2-1 đã sửa đúng; R1-1 mã đúng. Finding mới R3-1 [Low] hồ sơ task thiếu bảng file ST-7..ST-23 và khối Trạng thái mâu thuẫn → agent chính đã bổ sung bảng "File đã thay đổi", "Đã đọc errors" và khối Trạng thái; ghi B-72. Rủi ro chưa kiểm do reviewer nêu: `normalizeUsername` (JS `toLowerCase()`) có thể khác `lower(btrim())` của PostgreSQL với ký tự Unicode đặc biệt; username chỉ giới hạn `MaxLength(50)`.
- Sau vòng 3 và sau khi mở PR #25 (2026-11-17): rủi ro `normalizeUsername` JS khác PostgreSQL xử lý bằng cách chuẩn hóa qua SQL `lower(btrim(CAST(:value AS text)))` (câu không đọc bảng, không khóa) theo lựa chọn của user "Chuẩn hóa bằng SQL"; thay đổi này chưa qua code-reviewer vòng riêng (phạm vi nhỏ: `auth.service.ts`, `bootstrap-admin.ts`, `platform.service.ts`, `users.service.ts` và test username).
- Quyết định sau vòng 3 (2026-11-17): rủi ro `normalizeUsername` (JS `toLowerCase()` khác PostgreSQL `lower()`; đo 34 giá trị, 5 khác: `İSTANBUL`, `iİ`, `ΑΣ`, `ΟΔΥΣΣΕΥΣ`, ` ΑΣ `; log `.devloopflow/verify/20261116-orm-entities-refactor/evidence/r3-username-unicode.log`). User chọn "gộp và a + e": (a) giữ chuẩn hóa JS, (e) test ghi nhận `test_ST3b_AC2b_normalize_username_unicode_edge_cases`; thêm một dòng comment `shortcut:` trên `normalizeUsername` trong `POS_API/src/auth/auth.service.ts`, không đổi logic.

## Lịch sử kiểm AC (chỉ thêm, không xoá)
- Lần 1 (2026-11-17, ac-verifier sonnet): FAIL, 3 mục mở V1-1..V1-3; báo cáo `.devloopflow/verify/20261116-orm-entities-refactor/report-1.md`. Sau đó: V1-1 đổi tên test, V1-3 chạy `graphify update .` (log ở evidence/ST-18); V1-2 chờ user; chờ chạy verify-ac lần 2 để đổi trạng thái trong fails.md.
- Lần 2 (2026-11-17, ac-verifier sonnet, chạy lại V1-1..V1-3): PASS cả ba. Báo cáo `.devloopflow/verify/20261116-orm-entities-refactor/report-2.md`; sổ FAIL `fails.md` không còn mục `mở`. V1-1 đổi tên test; V1-2 user duyệt bỏ bốn mốc đếm trung gian (changelog plan); V1-3 chạy `graphify update .`. Lưu ý ma trận plan dòng ~1744, ~1755 còn chữ mốc cũ (tùy chọn đồng bộ).
- Sổ FAIL (để làm việc sau): `.devloopflow/verify/20261116-orm-entities-refactor/fails.md`

## Cập nhật tài liệu (sync-docs, bước 10b; chỉ thêm, không xoá)
- 2026-11-17: `rules/database.md`, `docs/architecture/TECH_STACK.md`, `POS_API/README.md` đã cập nhật trong ST-18 và khớp mã; AGENTS.md/CLAUDE.md không đổi (không đổi công nghệ hay lệnh); `.devloopflow/devloopflow.md` không đổi.
- 2026-11-17 (sync-docs đầy đủ): D-A1 `.devloopflow/devloopflow.md` mục 2 dòng 23 (API 256/256 → 350/350, build exit 0) và D-A2 mục 4 dòng 48 (thêm helper `sql-capture.ts`) đã sửa, ghi vào "Lịch sử cập nhật". D-1 `docs/architecture/ARCHITECTURE.md:115` (danh sách entity thiếu menu, inventory, promotions, sales, shifts): user duyệt "duyệt" 2026-11-17, đã sửa (một câu, `numstat` 1/1).

## Kinh nghiệm đã ghi (reflect, bước 10c; chỉ thêm, không xoá)
- 2026-11-17 (sau PR #25): user đổi quyết định `normalizeUsername` từ JS sang SQL (`lower(btrim())`, trả lời "Chuẩn hóa bằng SQL"); M-52 cập nhật; test `test_ST3c_AC1/AC2` thêm; evidence `verify/20261116-orm-entities-refactor/evidence/r4-username-sql/`.
- 2026-11-17: ghi M-48 (quy tắc truy vấn ORM của user), M-49 (không sửa dòng test cũ, kiểm numstat), M-50 (kiểm Docker trước khi kết luận fail) vào `.devloopflow/MEMORY.md`.
- 2026-11-17: ghi M-51 (mốc đếm giữa chừng cần log) và chuyển MEMORY.md sang cấu trúc `memory/` (49 mục cũ, 50 mục kể cả M-51).
- 2026-11-17 (user duyệt "gộp và a + e"): gộp 3 cặp trùng ý trong `.devloopflow/memory/`: M-44 vào M-24, M-20 vào M-14, M-46 vào M-36 (ba mục phụ chuyển `memory/archive/`, `hết hiệu lực`); ghi M-52 (chuẩn hóa chuỗi JS khác PostgreSQL, vùng api); quyết định giữ chuẩn hóa JS (a) kèm test ghi nhận (e). Bản đồ 48 → 46 dòng mục.

## Blocked
- Lý do: Plan cấm sửa test cũ ngoài delta ST-3/ST-5/ST-10. Test reports cũ mock `DataSource.query` ở dòng 360/401; QueryBuilder dùng `QueryRunner.query`, nên ST-6.AC-3 không thể bảo đảm nếu không chuyển đúng điểm mock. `invoices-read.integration.test.ts:250-258` có mock đếm truy vấn cùng loại, ảnh hưởng dự kiến ST-13.
- Lỗi còn lại: ST-6 chưa triển khai; suite gần nhất sau ST-5 276/276. Chưa có RED ST-6, chỉ có bằng chứng source và TypeORM.
- Đề xuất: Delta chỉ cho phép đổi tầng mock ở hai test reports và test đếm truy vấn invoices-read, giữ mọi assertion, barrier, SQL lỗi giả và restore; TDD phải chạy RED thực tế sau chuyển nếu mock cũ lệch, rồi GREEN và suite. User duyệt bản delta cụ thể trước khi sửa test.
- Giải quyết: user duyệt bản delta ST-6/ST-13 ngày 2026-11-17; task trở lại `in_progress` ở bước 6. Giữ ba dòng trên làm lịch sử.
- Chặn mới: ST-6.AC-1 đòi 404 `NOT_FOUND` và message `Không tìm thấy tài nguyên.`. Test có sẵn `reports.integration.test.ts:160` chỉ kiểm status thông qua helper `total`; plan chi tiết chỉ cho thêm test mới khi chưa có ca foreign branch, và cấm sửa assertion test cũ ngoài hai mock. TDD dừng sau suite xanh, không tự thêm assertion. Đề xuất delta hẹp cho phép giữ assertion 404 cũ và thêm ownerGet + code/message assertions ngay tại ca này; characterization xanh trên SQL cũ và mới, không bịa RED. Chờ user duyệt plan delta.
- Giải quyết chặn mới: user duyệt delta ST-6.AC-1 ngày 2026-11-17; task trở lại `in_progress`. Giữ dòng trên làm lịch sử.
