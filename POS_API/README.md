# POS API local — PB-01/PB-02/PB-03/PB-04

Yêu cầu: Node.js 22, Docker Desktop và Docker Compose. UI xác thực, quản trị nền tảng và Cài đặt tổ chức đã nối API; POS/ca/thực đơn/kho/báo cáo còn dùng dữ liệu mô phỏng.

1. Tạo `POS_INFRA/.env.local` từ `.env.example` và đặt username, mật khẩu ngẫu nhiên, tên DB. Không commit file này.
2. Ở gốc repo chạy `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --wait`.
3. Trong `POS_API/`, chạy `npm ci`, rồi `Copy-Item .env.example .env` nếu chưa có `.env`. Sửa `DATABASE_URL` trỏ đến DB local, cùng ba biến `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_FULL_NAME`, `BOOTSTRAP_ADMIN_PASSWORD` (mật khẩu tối thiểu 12 ký tự). Đặt thêm `PUBLIC_ORIGIN` là origin của web và hai secret riêng `JWT_SECRET`, `CSRF_SECRET` (mỗi secret tối thiểu 32 byte). Giá trị phải là secret riêng của môi trường, không dùng ví dụ cố định. Các lệnh start/migration/test tự nạp `.env` bằng Node22; biến môi trường do shell/Compose cấp được ưu tiên. `.env` đã được Git/Docker bỏ qua.
4. Chạy `npm run migration:run`, sau đó `npm run start`. Gọi `GET http://localhost:3000/api/v1/health` để kiểm tra. Sau khi admin đầu tiên được tạo, có thể bỏ ba biến bootstrap ở lần chạy sau.
5. Chạy `npm test` với `DATABASE_URL` của DB local. Test tạo và xóa **database thử riêng** có tên `pos_pb01_test_<ngẫu nhiên>`, `pos_pb02_test_<ngẫu nhiên>` hoặc `pos_pb03_test_<ngẫu nhiên>`; tài khoản DB local cần quyền `CREATE DATABASE`.

PB-02 cung cấp `/api/v1/auth/login`, `/me`, `/csrf`, `/refresh`, `/logout`, `/change-password`. Cookie `Secure` cần HTTPS khi thử trên browser; test HTTP tự động kiểm tra header và tác dụng phụ DB. Giới hạn thử dùng bảng `auth_rate_events` từ migration PB-02.

Đặt `NODE_ENV=development` để mở Swagger UI tại `/api/docs` và OpenAPI JSON tại `/api/docs-json`. Hai route này không được đăng ký ở môi trường khác. Login dùng Passport local, request Cookie được đọc qua `cookie-parser`; request DTO được xác thực bằng NestJS `ValidationPipe`.

Mã PB-02 nằm trong `src/auth/`, PB-03 trong `src/platform/`. Hai module là mẫu tổ chức cho nghiệp vụ tiếp theo:

```text
src/<module>/
  <module>.module.ts      # đăng ký controller/provider, export provider cần dùng
  <module>.service.ts     # nghiệp vụ và ranh giới transaction
  http/                   # controller, DTO, validation request
  entities/               # entity thuộc module sở hữu
  tests/                  # unit/integration test
  security/               # chỉ tạo khi có guard/strategy riêng
```

Controller gọi service; service không nhận Express Request/Response. Không tạo thư mục rỗng hoặc thêm lớp trung gian chỉ để khớp mẫu. Auth có thêm cấu hình/cookie/Passport; platform giữ pagination tại gốc module vì controller và service cùng dùng. Không bắt buộc tách mỗi DTO thành một file.

### Truy vấn TypeORM

Quy ước chung ở [`rules/database.md`](../rules/database.md). Với mỗi truy vấn, thử theo thứ tự:

1. Đọc bằng `find`, `findOne`, `findBy`, `findOneBy`, `count`, `countBy`, `exists`, `existsBy` với `where` (kể cả lồng trên relation đã khai báo), `select`, `order`, `relations`, `lock: { mode, tables }`, toán tử `In`, `ILike`, `IsNull`, `Not`...; mảng `where` cho OR.
2. Ghi bằng `create`, `save`, `insert`, `update` (có `{ returning }`), `upsert`, `delete`.
3. Nhiều lời gọi (1)/(2) tuần tự thay JOIN khi bảng không có relation.
4. QueryBuilder chỉ khi (1)-(3) không đủ, với đúng một mã L1..L6 và một dòng chú thích nguyên văn ngay trước câu lệnh; câu có nhiều builder con (CTE, sub-query) chỉ một dòng. Tìm bằng `grep -rn "// QueryBuilder:" src`.

Không SQL thuần (`.query(`) ngoài migration và test.

| Mã | Khi nào | Chú thích nguyên văn |
| --- | --- | --- |
| L1 | Tổng tiền `SUM`: `Repository.sum()` trả float | `// QueryBuilder: SUM of money read as text; Repository.sum() returns a float` |
| L2 | Cursor `to_char ... .US`, so sánh bộ `(a, b) < (x, y)` hoặc `ORDER BY lower(...)` | `// QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()` |
| L3 | CTE, sub-query, `generate_series` trong một statement | `// QueryBuilder: CTE or sub-query in one statement; find() cannot express it` |
| L4 | `INSERT ... ON CONFLICT (<đích>) DO NOTHING RETURNING` | `// QueryBuilder: ON CONFLICT (target) DO NOTHING; upsert() only does DO UPDATE and orIgnore() drops the target` |
| L5 | Câu không đọc bảng (advisory lock, health) | `// QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it` |
| L6 | Danh sách, đếm, `DISTINCT` trên nhiều bảng không relation, số dòng không giới hạn | `// QueryBuilder: joins and DISTINCT over many rows; separate find() calls would load every row` |

Quy tắc chuyển:

| Loại truy vấn | Cách viết |
| --- | --- |
| Đọc một bảng, không khóa | `findOne`/`find`/`exists`/`count` qua `manager.getRepository(E)` (trong transaction) hoặc `this.db.getRepository(E)`; có `select` thì chọn khóa chính |
| Đọc/lọc qua relation đã khai báo | `where` lồng + `relations` (sinh `LEFT JOIN`) |
| Đọc qua bảng không relation | `findOne`/`find` tuần tự; danh sách dùng `In([...])` |
| Khóa một bảng | `findOne({ where, select, lock: { mode: 'pessimistic_write' } })` (`pessimistic_read` cho `FOR SHARE`); chỉ trong transaction |
| Khóa bảng gốc, lọc qua relation | `find({ where, select, relations, lock: { mode, tables: ['<bảng gốc>'] } })` rồi lấy `[0] ?? null`; không dùng `findOne` cho câu có cả khóa và join; bảng phía `LEFT JOIN` không được khóa |
| Khóa nhiều bảng | Nhiều `findOne({ lock })` tuần tự theo đúng thứ tự khóa |
| Ghi không cần dòng trả về | `insert`/`update`/`delete`; `{ updated_at: () => 'now()' }`, `{ used_count: () => 'used_count + 1' }`; không dùng `increment`/`decrement` khi cùng câu phải đặt `updated_at` |
| `INSERT ... RETURNING` | `insert(values)` rồi `findOneBy({ id })` cùng `manager` (`Repository.insert` không có RETURNING) |
| `UPDATE ... RETURNING` | `update(criteria, values, { returning: '*' })`, đọc `result.raw[0]` |
| `ON CONFLICT ... DO UPDATE` | `upsert(values, { conflictPaths, returning? })` |
| Đếm có bộ lọc | `count({ where })`; OR dùng mảng `where`; `ILIKE` dùng `ILike('%q%')` |
| Điều kiện tùy chọn | Spread có điều kiện `...(branchId !== null ? { branch_id: branchId } : {})` |
| Chuẩn hóa username | `await normalizeUsername(manager, value)` (export ở `auth/auth.service.ts`): lấy `lower(btrim(value))` từ PostgreSQL bằng một câu không đọc bảng (L5) rồi dùng kết quả; không dùng `toLowerCase()` của JS vì khác `lower()` của PostgreSQL ở `İ` và sigma cuối từ, và không dùng `trim()` vì bỏ cả TAB |
| Lỗi DB (`23505`, `error.constraint`) | Giữ `catch` quanh đúng lời gọi `insert`/`update` gây lỗi |

Lưu ý:

- `null`/`undefined` trong `where` của `find*`/`exists*`/`count*` làm TypeORM bỏ qua điều kiện đó, có thể đọc dữ liệu cửa hàng khác; `update`/`delete` sinh `= NULL` (không khớp dòng nào). Kiểm giá trị trước khi truyền; cần `IS NULL` thì dùng `IsNull()`.
- Trong `db.transaction(async manager => ...)` chỉ dùng `manager.getRepository(E)` và `manager.createQueryBuilder()`; không dùng `this.db` hay repository inject, vì chạy ngoài transaction và không thấy khóa.
- `fromDummy()` chỉ cho câu không đọc bảng: advisory lock và health (L5), và nền của CTE/`generate_series` trong báo cáo (L3), vì không method nào chạy câu không đọc bảng; không gọi `select` thiếu `from`.
- `ON CONFLICT ... DO NOTHING` dùng `onConflict('<đích và WHERE> DO NOTHING').returning(...).updateEntity(false)`. API này bị TypeORM đánh dấu `@deprecated` nhưng là API duy nhất sinh được `DO NOTHING` có cột đích và điều kiện chỉ mục một phần; có thể phải đổi khi nâng TypeORM, khi đó test thanh toán và webhook báo. Không dùng `orIgnore()` (không có cột đích, nuốt cả lỗi trùng khóa idempotency).
- Nhiều CTE trong một statement: `addCommonTableExpression(<SelectQueryBuilder>, '<alias>')` cho từng CTE; CTE tham chiếu CTE khác bằng `from('<alias>', '<alias>')` hoặc `innerJoin(..., 'true')`; không lồng CTE trong CTE; alias cột viết thường.
- Thay `UNION ALL`: hai sub-query gom nhóm gắn bằng `leftJoin(qb => <sub-query>, '<alias>', '<điều kiện>')`, cộng bằng `COALESCE(a, 0) + COALESCE(b, 0)` trong DB (QueryBuilder không có `UNION`).
- Tên tham số đặt tên (`:tên`) không trùng chữ đứng sau dấu `:` trong chuỗi SQL (`text`, `date`, `json`, `uuid`, `int`, `bigint`, `numeric`, `timestamptz`, `timestamp`, `MI`, `SS`, `US`): driver thay mọi `:tên` có trong `parameters` trên toàn câu, kể cả `::date` và `'HH24:MI:SS'`.
- Không dùng `Repository.sum()` cho tiền (float).

### Entity

`auth/entities/` chứa User, Role, Permission, RolePermission, RefreshToken và AuthRateEvent; `platform/entities/` chứa Store; `organization/entities/` chứa Branch và DiningTable; `menu/entities/` chứa Category, Size, Product, ProductSize, Topping và CategoryTopping; `inventory/entities/` chứa Ingredient, ProductSizeIngredient, ToppingIngredient, BranchIngredientStock và StockMovement; `promotions/entities/` chứa PromotionCode; `sales/entities/` chứa Invoice, InvoiceItem, InvoiceItemTopping, InvoicePromotionCode, Payment, TransferAttempt, BankTransferEvent và StoreBankAccount; `shifts/entities/` chứa WorkShift, CashReconciliation và ShiftExpense (32 entity). Import entity trực tiếp, giữ callback TypeORM cho relation và đăng ký đầy đủ trong `database/data-source.ts`; không gom entity liên module qua barrel. `database/` giữ DataSource, DatabaseModule và migration; không sửa migration lịch sử khi chỉ di chuyển source.

PB-04 cung cấp GET/POST/PATCH `/api/v1/branches`, `/api/v1/dining-tables`, và luồng staff GET/POST/PATCH/reset trong `/api/v1/users`; luồng OWNER của platform giữ hợp đồng cũ. Xem [spec tổ chức](../.devloopflow/specs/organization.md), [spec nhân viên](../.devloopflow/specs/users.md), [UI tổ chức](../.devloopflow/specs/organization-ui.md). PB-13 đã nối Cài đặt với API; kiểm tra khóa sửa quỹ sau ca đầu tiên thuộc PB-06. Test bổ sung tạo/xóa DB thử riêng prefix `pos_pb04_test_` và `pos_pb04_migration_`.

`src/http/` giữ response envelope, helper/filter lỗi và health controller dùng chung. `src/main.ts`, `src/app.module.ts`, bootstrap admin và Swagger setup ở cấp ứng dụng. Chi tiết ranh giới xem [ARCHITECTURE.md](../docs/architecture/ARCHITECTURE.md#51-backend-một-modular-monolith).

API không tự chạy migration. Đừng dùng `schema:sync`; thay đổi schema phải có migration. Docker Compose này chỉ phục vụ phát triển local, chưa phải cấu hình production.
