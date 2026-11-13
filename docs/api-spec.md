# api-spec

> Sprint 08 đã chốt chuyển khoản qua QR/SePay và xác nhận thủ công dự phòng của MANAGER/OWNER. Các route, quyền, lỗi và idempotency hiện hành cho thanh toán được chốt tại [spec thanh toán](../.devloopflow/specs/invoices.md), thay cho mô tả chuyển khoản cũ bên dưới; code Sprint 08 đã triển khai và kiểm trên local (verify-ac vòng 10, 10/11/2026).


Quy ước chung của REST API cho hệ thống POS và kho. File này **chỉ chứa phần chung**: định dạng, xác thực, phân quyền, lỗi, phân trang, idempotency, danh mục nhóm route. **Chi tiết từng endpoint đã chốt trước khi chuyển sang devloopflow** (request, response, lỗi, ví dụ) được lưu tại `.devloopflow/specs/legacy-<module>.md`; spec thiết kế mới ghi trong `.devloopflow/specs/`. Khi sửa endpoint cũ, đối chiếu cả hợp đồng lịch sử và spec hiện hành.

## Cách dùng

- Agent đọc file này **trước khi** viết hoặc sửa bất kỳ endpoint nào. Mọi endpoint phải theo các quy ước ở đây.
- Gặp tình huống file này chưa nói rõ hoặc mâu thuẫn với tài liệu khác thì **dừng lại và hỏi user**. Không tự đoán.
- Business rule xem [BUSINESS_RULES.md](BUSINESS_RULES.md) (mã `BR-xx`). Bảng và field xem [DESIGN_DB_POS_SYSTEM.md](DESIGN_DB_POS_SYSTEM.md). Tổng quan sản phẩm xem [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md).

---

## 1. Quy ước chung


| Mục                      | Quy ước                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Base path                | `/api/v1`                                                                                     |
| Giao thức                | HTTPS. Dữ liệu JSON, UTF-8, `Content-Type: application/json`; tải ảnh dùng `multipart/form-data` |
| Đặt tên route            | Danh từ số nhiều, `kebab-case`: `/dining-tables`, `/work-shifts`, `/invoice-items`            |
| Đặt tên field JSON       | `camelCase`: `storeId`, `workShiftId`, `countedCash`                                          |
| Đặt tên tham số truy vấn | `camelCase`: `branchId`, `sort`, `limit`, `cursor`                                            |
| Mã định danh             | `uuid` dạng chuỗi                                                                             |
| Giá trị liệt kê (enum)   | Chuỗi `UPPER_SNAKE_CASE` đúng như trong DB: `OPEN`, `PAID`, `SHORTAGE`                        |
| Phiên bản                | Đổi không tương thích ngược thì tăng lên `/api/v2`. Thêm field mới không phải thay đổi phá vỡ |
| Tài liệu API             | Sinh tự động bằng `@nestjs/swagger` (OpenAPI), có sẵn ở môi trường phát triển                 |


### Phương thức HTTP


| Phương thức | Dùng cho                                                        | Idempotent                           |
| ----------- | --------------------------------------------------------------- | ------------------------------------ |
| `GET`       | Đọc dữ liệu, không thay đổi gì                                  | Có                                   |
| `POST`      | Tạo bản ghi mới, hoặc thực hiện một hành động chuyển trạng thái | Không (trừ khi có `Idempotency-Key`) |
| `PATCH`     | Sửa một phần bản ghi                                            | Có                                   |
| `PUT`       | Không dùng ở MVP                                                |                                      |
| `DELETE`    | Xóa cứng, **chỉ** với bản ghi chưa có tham chiếu (BR-10)        | Có                                   |


- **Ngưng dùng** (món, bàn, chi nhánh, tài khoản...) làm bằng `PATCH` đặt `isActive: false`, **không** dùng `DELETE`.
- `DELETE` bản ghi đã có tham chiếu trả `409` với mã lỗi `RESOURCE_IN_USE`.
- **Hành động chuyển trạng thái** dùng `POST /<tài nguyên>/{id}/<hành động>`, tên hành động là động từ `kebab-case`: `POST /invoices/{id}/cancel`, `POST /work-shifts/{id}/close`, `POST /work-shifts/{id}/force-close`.
- **Tài nguyên con** dùng đường dẫn lồng nhau tối đa một cấp: `/invoices/{id}/items`, `/invoices/{id}/payments`, `/work-shifts/{id}/expenses`.

### Header


| Header                                | Chiều             | Ghi chú                                                                                     |
| ------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `Cookie: __Host-pos_access=...`       | Request           | Browser tự gửi với route cần xác thực; API đọc access token từ cookie, không nhận Bearer    |
| `X-CSRF-Token`                        | Request           | Bắt buộc với mọi request thay đổi trạng thái sau đăng nhập (mục 2)                         |
| `Origin`                              | Request           | Phải khớp origin cấu hình với mọi request thay đổi trạng thái, kể cả đăng nhập              |
| `Idempotency-Key`                     | Request           | Bắt buộc với thanh toán và hoàn tất đơn 0đ (mục 7)                                           |
| `X-Request-Id`                        | Request, Response | Mã truy vết. Máy chủ tự sinh nếu client không gửi, luôn trả lại trong response và trong log |
| `Idempotent-Replay: true`             | Response          | Có khi trả lại kết quả cũ của một yêu cầu trùng `Idempotency-Key`                           |
| `Retry-After`                         | Response          | Kèm `429`                                                                                   |


---

## 2. Xác thực

### Cơ chế

- Đăng nhập bằng `username` và mật khẩu. Access token (JWT) và refresh token chỉ đặt trong hai cookie riêng `HttpOnly; Secure; SameSite=Strict` cùng origin; không trả token trong JSON hay cho JavaScript đọc. API lấy access token từ cookie, không dùng `Authorization: Bearer`. Web và API đi qua cùng reverse proxy.
- Vì cookie được gửi tự động, mọi request thay đổi trạng thái sau đăng nhập phải kiểm tra Origin và CSRF token; login kiểm tra Origin. Chi tiết cookie và CSRF xem [auth.md](architecture/auth.md).
- Refresh token chỉ lưu **hash** trong DB (BR-04). Hợp lệ khi chưa thu hồi và chưa hết hạn.
- Đăng xuất, đổi mật khẩu, khóa tài khoản, tạm khóa cửa hàng đều **thu hồi** refresh token (BR-03, BR-82).
- Không có đăng ký công khai (BR-78). Tài khoản do cấp trên tạo.
- Access token hết hạn sau 30 phút, refresh token sau 7 ngày tính từ lần cấp gần nhất. Mỗi lần làm mới, cấp refresh token mới và thu hồi token cũ. Mỗi thiết bị có phiên riêng; chi tiết xem [auth.md](architecture/auth.md).

### Nội dung access token (claims)


| Claim        | Ý nghĩa                                                          |
| ------------ | ---------------------------------------------------------------- |
| `sub`        | `userId`                                                         |
| `sid`        | ID phiên đăng nhập của thiết bị                                   |
| `role`       | Mã vai trò: `PLATFORM_ADMIN`, `OWNER`, `MANAGER`, `CASHIER`      |
| `storeId`    | Cửa hàng của người dùng. `null` với `PLATFORM_ADMIN`             |
| `branchId`   | Chi nhánh của người dùng. `null` với `OWNER` và `PLATFORM_ADMIN` |
| `iat`, `exp` | Thời điểm cấp, hết hạn                                           |


- Danh sách quyền (`permissions`) **không nhét vào token**; máy chủ tra quyền, vai trò và phạm vi hiện hành ở mỗi request để thay đổi có hiệu lực ngay.
- `storeId` và `branchId` trong token là ảnh chụp tại lúc cấp; ngữ cảnh truy vấn phải lấy từ user hiện hành sau khi kiểm tra phiên. Xem mục 3.

### Route xác thực


| Route                        | Mục đích                                                |
| ---------------------------- | ------------------------------------------------------- |
| `POST /auth/login`           | Đăng nhập                                               |
| `GET /auth/csrf`             | Phát lại CSRF cookie khi browser tải lại trang           |
| `POST /auth/refresh`         | Đổi refresh token lấy access token mới                  |
| `POST /auth/logout`          | Thu hồi phiên hiện tại                                   |
| `POST /auth/change-password` | Đổi mật khẩu (BR-84)                                    |
| `GET /auth/me`               | Thông tin người dùng hiện tại, vai trò, danh sách quyền |


### Trạng thái đặc biệt của tài khoản


| Tình huống                    | Hành vi                                                                                 | Mã lỗi                     |
| ----------------------------- | --------------------------------------------------------------------------------------- | -------------------------- |
| `must_change_password = true` | Route nghiệp vụ trả `403`; chỉ cho `/auth/change-password`, `/auth/logout`, `/auth/me`, `/auth/refresh`, `/auth/csrf` | `PASSWORD_CHANGE_REQUIRED` |
| Tài khoản `isActive = false`  | Từ chối đăng nhập và mọi route (BR-02); login báo lỗi chung                              | `ACCOUNT_DISABLED` trên route đã xác thực |
| Cửa hàng `SUSPENDED`          | Từ chối đăng nhập và mọi route của người dùng thuộc cửa hàng (BR-82); login báo lỗi chung; khóa store thu hồi phiên nên cookie cũ trả `401 UNAUTHENTICATED` | `STORE_SUSPENDED` nếu phiên còn hiệu lực khi kiểm tra trạng thái |
| Access cookie còn được gửi nhưng JWT hết hạn | `401`; client thử `/auth/refresh` một lần                                        | `TOKEN_EXPIRED`            |
| Thiếu hoặc sai access cookie | `401`; client có thể thử `/auth/refresh` một lần vì browser tự bỏ cookie hết hạn           | `UNAUTHENTICATED`          |


- `PLATFORM_ADMIN` không thuộc cửa hàng nào nên không bị chặn bởi `STORE_SUSPENDED`.
- Đăng nhập sai báo lỗi **chung**, không tiết lộ tên đăng nhập có tồn tại hay không.

---

## 3. Phân quyền và ngữ cảnh cửa hàng, chi nhánh

### Phân quyền

- Mỗi route khai báo **một mã quyền** dạng `module.action` (ví dụ `invoice.cancel`). Guard kiểm tra theo `permissions.code` của vai trò, **không** kiểm tra theo tên vai trò cứng trong code (BR-05).
- Thiếu quyền trả `403` mã `PERMISSION_DENIED`.
- Ma trận quyền mặc định xem [BUSINESS_RULES.md](BUSINESS_RULES.md) mục 15.

### Ngữ cảnh cửa hàng (tenant)

- `storeId` **luôn lấy từ danh tính hiện hành sau khi xác minh access cookie và phiên**. Không route nào nhận `storeId` từ body, query hay header để quyết định phạm vi dữ liệu (BR-80).
- Ngoại lệ về đối tượng quản trị: `POST /users` cấp OWNER theo spec platform nhận `storeId` làm store đích do admin quản trị; chỉ danh tính platform không có tenant và có permission tương ứng được dùng. Giá trị này không thay thế tenant context hay cấp quyền đọc dữ liệu vận hành.
- Mọi truy vấn dữ liệu thuộc cửa hàng đều lọc theo `storeId` (trực tiếp hoặc qua `branch_id`, `category_id`).
- Mọi `id` trong request (món, size, topping, nguyên liệu, mã giảm giá, chi nhánh, bàn...) phải thuộc cùng cửa hàng với người gọi. Không thuộc thì trả `404` (không tiết lộ là tồn tại ở cửa hàng khác).
- Bảng nối (`category_toppings`, công thức) phải có hai đầu cùng cửa hàng.
- `PLATFORM_ADMIN` **không** gọi được route dữ liệu vận hành (hóa đơn, ca, kho, doanh thu). Gọi thì `403` `PERMISSION_DENIED` (BR-81).

### Ngữ cảnh chi nhánh


| Người gọi                                        | Cách xác định chi nhánh                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Có `branchId` trong token (`CASHIER`, `MANAGER`) | Luôn dùng `branchId` của token. `branchId` do client gửi ở route danh sách bị bỏ qua; route khác xử lý theo bảng bên dưới (BR-71) |
| Có quyền `branch.access_all` (`OWNER`)           | Tùy loại route, xem bảng bên dưới (BR-71b)                                         |


- Dữ liệu vận hành gồm: hóa đơn, ca làm, đối soát, chi phí, tồn kho, sổ kho, bàn.
- Chi nhánh `isActive = false` không mở ca, không tạo đơn mới (BR-76).

#### Cách xác định chi nhánh theo loại route


| Loại route                                                                    | Ví dụ                                                                                         | `branchId` do client gửi                                                       | Chi nhánh lấy từ                                                            |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Đọc danh sách** dữ liệu vận hành                                            | `GET /invoices`, `GET /reports/revenue`                                                       | Tham số truy vấn **tùy chọn**, chỉ `OWNER` dùng. Bỏ trống là toàn cửa hàng     | `branchId` của token, hoặc tham số của `OWNER`                              |
| **Tạo bản ghi gốc** của chi nhánh (không có bản ghi cha quyết định chi nhánh) | `POST /work-shifts` (mở ca), `POST /dining-tables`, nhập kho, đặt tồn kho tối thiểu           | **Bắt buộc** trong body với `OWNER`. Người có `branchId` trong token không gửi | Token hoặc body                                                             |
| **Thao tác trên bản ghi có sẵn** theo `id`                                    | `GET` và `PATCH /invoices/{id}`, `POST /work-shifts/{id}/close`, `POST /invoices/{id}/cancel` | **Không nhận**                                                                 | Chính bản ghi (`branch_id` của bản ghi)                                     |
| **Tạo bản ghi con** dưới một bản ghi cha                                      | `POST /invoices/{id}/items`, `/invoices/{id}/payments`, `/work-shifts/{id}/expenses`          | **Không nhận**                                                                 | Bản ghi cha                                                                 |
| **Tạo hóa đơn**                                                               | `POST /invoices`                                                                              | **Không nhận**                                                                 | Ca thu ngân đang mở của người gọi. Bàn (nếu có) phải cùng chi nhánh (BR-69) |


- Với route theo `id` (loại 3 và 4), máy chủ nạp bản ghi, kiểm tra thuộc cửa hàng của người gọi, và nếu token có `branchId` thì phải **bằng** `branch_id` của bản ghi. Không thỏa thì `404`. `OWNER` (token không có `branchId`) thao tác được trên bản ghi của mọi chi nhánh trong cửa hàng mình.
- Route **không nhận** `branchId` mà client vẫn gửi thì `422` (field lạ, do `whitelist`).
- Với người có `branchId` trong token, tham số `branchId` ở route đọc danh sách bị **bỏ qua** (BR-71).
- `OWNER` muốn bán hàng phải mở ca thu ngân cho một chi nhánh (`POST /work-shifts` kèm `branchId`). Hóa đơn sau đó lấy chi nhánh từ ca đó.

---

## 4. Định dạng request và response

### Response thành công

Một bản ghi:

```json
{
  "data": {
    "id": "5f1c...",
    "status": "OPEN"
  }
}

```

Danh sách:

```json
{
  "data": [ { "id": "..." } ],
  "meta": { "limit": 20, "nextCursor": "eyJpZCI6...", "total": 137 }
}

```

- Mọi response thành công đều bọc trong `data`. `meta` chỉ có ở danh sách và báo cáo cần phụ trợ.
- `204 No Content` (không có body) cho `DELETE` và hành động không trả dữ liệu.
- Không trả `passwordHash`, `tokenHash` ở bất kỳ response nào (BR-01).

### Schema DTO chung

```ts
type SuccessResponse<T> = { data: T };
type ListResponse<T> = {
  data: T[];
  meta: { limit: number; nextCursor: string | null; total: number };
};
type NoContentResponse = undefined; // HTTP 204: không có JSON body
type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details: Array<{
      location: 'path' | 'query' | 'header' | 'body';
      field: string;
      message: string;
    }>;
    requestId: string;
  };
};
```

`T` là DTO response của endpoint, không phải entity DB. Spec module khai báo schema request và `T` cụ thể, kể cả các field `null` hoặc tùy chọn; không dùng một DTO chung mơ hồ cho mọi endpoint. `ErrorResponse` áp dụng cho mọi lỗi theo mục 6. Các schema PB-02 xem [.devloopflow/specs/auth.md](../.devloopflow/specs/auth.md).

### Kiểu dữ liệu


| Loại                      | Quy ước JSON                                                                             | Ví dụ                    |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------ |
| Tiền                      | **Số nguyên**, đơn vị đồng, không thập phân. Giới hạn an toàn xem mục "Giới hạn số tiền" | `29000`                  |
| Lượng nguyên liệu         | **Chuỗi** số thập phân, tối đa 3 số lẻ, tránh sai số số thực                             | `"56"`, `"1.5"`          |
| Số lượng ly, phần topping | Số nguyên dương                                                                          | `2`                      |
| Thời điểm                 | ISO 8601, **UTC**, hậu tố `Z`                                                            | `"2026-10-27T07:05:00Z"` |
| Ngày (tham số báo cáo)    | `YYYY-MM-DD`, hiểu theo múi giờ `Asia/Ho_Chi_Minh` (BR-63)                               | `"2026-10-27"`           |
| Boolean                   | `true` hoặc `false`                                                                      |                          |
| Giá trị rỗng              | `null`, không dùng chuỗi rỗng                                                            |                          |


- Client tự đổi giờ UTC sang giờ Việt Nam để hiển thị.
- Tên field trả về luôn đầy đủ, không rút gọn.

### Giới hạn số tiền

- Tiền lưu `bigint` trong DB nhưng JSON trả **số** (number). `Number.MAX_SAFE_INTEGER` là 9.007.199.254.740.991 (khoảng 9 triệu tỷ đồng). Mọi số tiền phải nằm trong vùng an toàn để client JavaScript không mất độ chính xác (BR-103).
- **Mỗi số tiền đơn lẻ và kết quả tính để ghi DB** có trị tuyệt đối tối đa **1.000.000.000.000 đồng** (1.000 tỷ). Máy chủ chặn thao tác làm kết quả vượt trần trước khi ghi; vượt thì `422` `VALIDATION_ERROR`. DB có `CHECK` tương ứng (xem [thiết kế DB](DESIGN_DB_POS_SYSTEM.md)). Giá trị âm như `difference` cũng giới hạn theo trị tuyệt đối.
- **Giá trị tổng hợp** (báo cáo, tổng nhiều hóa đơn) là phép cộng nhiều số tiền. Driver PostgreSQL trả `bigint` dạng chuỗi, backend chỉ đổi sang số **sau khi kiểm tra** `Number.isSafeInteger`. Không an toàn thì trả `500` `INTERNAL_ERROR` và ghi log, **không bao giờ** trả số đã bị làm tròn.
- Tiền luôn là số nguyên trong JSON, không đổi sang chuỗi. Nếu sau này cần vượt giới hạn thì đổi sang chuỗi là thay đổi phá vỡ, phải qua `/api/v2`.

### Request

- Request body bị **whitelist** trong NestJS (`ValidationPipe` với `whitelist` và `forbidNonWhitelisted`). Field lạ trả `422`.
- Mỗi spec endpoint ghi tên DTO/schema request và response cụ thể, gồm path/query/header/body khi có; kiểu JSON, bắt buộc/tùy chọn, `null`, mặc định, giới hạn và quan hệ điều kiện giữa các field. Ghi rõ route không nhận body/query và response `204` không có body. Schema lỗi dùng envelope ở mục 6 và liệt kê mã HTTP/code của endpoint.
- DTO request trong NestJS dùng class và `class-validator`; `ValidationPipe` không âm thầm ép kiểu sai hoặc bỏ field lạ. `exceptionFactory` chuyển lỗi dữ liệu thành `422 VALIDATION_ERROR` và `details` với `location`, `field`, `message`. `400 BAD_REQUEST` dành cho JSON/Content-Type không đọc được. Response DTO và decorator `@nestjs/swagger` mô tả schema OpenAPI; không dùng entity DB làm DTO trả ra.
- Swagger UI `/api/docs` và OpenAPI JSON `/api/docs-json` chỉ đăng ký khi `NODE_ENV=development`; không mở các route này ở môi trường khác. Schema auth cụ thể xem [.devloopflow/specs/auth.md](../.devloopflow/specs/auth.md).
- **Giá và tổng tiền do máy chủ tính** (BR-24). Không route nào nhận `unitPrice`, `lineTotal`, `subtotal`, `discountAmount`, `totalAmount`, `expectedCash`, `difference` từ client. Gửi lên thì trả `422`.
- Chuỗi được cắt khoảng trắng đầu cuối. Độ dài tối đa theo cột DB.

---

## 5. Mã trạng thái HTTP


| Mã                          | Dùng khi                                                                                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200 OK`                    | Đọc, sửa, hoặc hành động thành công có trả dữ liệu                                                                                                                                                                                                            |
| `201 Created`               | Tạo bản ghi mới thành công. Kèm `Location` nếu có route chi tiết                                                                                                                                                                                              |
| `204 No Content`            | Thành công, không có body                                                                                                                                                                                                                                     |
| `400 Bad Request`           | Request **không đọc được**: JSON hỏng, sai `Content-Type`. Chưa tới bước kiểm tra giá trị                                                                                                                                                                     |
| `401 Unauthorized`          | Chưa đăng nhập, token sai hoặc hết hạn                                                                                                                                                                                                                        |
| `403 Forbidden`             | Không được phép: thiếu quyền, đổi mật khẩu bắt buộc, cửa hàng bị khóa hoặc kiểm tra Origin/CSRF thất bại                                                                                                                                                    |
| `404 Not Found`             | Không tìm thấy, hoặc bản ghi thuộc cửa hàng khác                                                                                                                                                                                                              |
| `409 Conflict`              | Xung đột với **trạng thái hiện tại** của dữ liệu: đã có ca mở, bàn đang có đơn, đơn không còn `OPEN`, bản ghi đang được tham chiếu                                                                                                                            |
| `422 Unprocessable Entity`  | Request đọc được nhưng **giá trị không hợp lệ**: sai kiểu, sai định dạng, thiếu, field lạ, vượt giới hạn, ở **path, query, header hoặc body**. Gồm cả vi phạm quy tắc nghiệp vụ không phụ thuộc trạng thái (thanh toán thiếu tiền, mã giảm giá không áp được) |
| `429 Too Many Requests`     | Vượt giới hạn tần suất. Kèm `Retry-After`                                                                                                                                                                                                                     |
| `500 Internal Server Error` | Lỗi không lường trước. Không lộ chi tiết nội bộ                                                                                                                                                                                                               |
| `503 Service Unavailable`   | Dịch vụ chưa sẵn sàng do phụ thuộc bắt buộc (ví dụ PostgreSQL) không truy cập được; health check trả mã này khi DB mất kết nối |


Phân biệt `409` và `422`: `409` **là "không làm được lúc này vì trạng thái dữ liệu"** (thử lại sau khi trạng thái đổi thì có thể được). `422` **là "dữ liệu gửi lên chưa đúng"** (phải sửa request).

Phân biệt `400` và `422`: `400` **là máy chủ không đọc nổi request**, chưa kiểm tra được giá trị. Mọi sai kiểu hoặc sai định dạng (ví dụ `id` không phải `uuid`, `limit` không phải số, `quantity` là chuỗi) ở path, query, header hay body đều là `422` `VALIDATION_ERROR`, không phải `400`. Với NestJS, `ValidationPipe` cần `exceptionFactory` tùy chỉnh để ra đúng mã và đúng định dạng này.

---

## 6. Định dạng lỗi

```json
{
  "error": {
    "code": "SHIFT_NOT_OPEN",
    "message": "Chưa mở ca. Mở ca thu ngân để bắt đầu bán hàng.",
    "details": [],
    "requestId": "b7e2c9a0-..."
  }
}

```


| Field       | Ý nghĩa                                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`      | Mã lỗi **ổn định**, tiếng Anh, `UPPER_SNAKE_CASE`. Client dùng để xử lý logic, không dùng `message`                                                                                                                   |
| `message`   | Câu **tiếng Việt** hiển thị được cho người dùng, nói rõ việc xảy ra và cách sửa. Theo mẫu thông báo trong [DESIGN.md](../DESIGN.md) mục 9.3 |
| `details`   | Mảng chi tiết. Với lỗi kiểm tra dữ liệu: `[{ "location": "body", "field": "quantity", "message": "Số lượng phải lớn hơn 0." }]`. `location` là `path`, `query`, `header` hoặc `body`. Không có chi tiết thì mảng rỗng |
| `requestId` | Trùng `X-Request-Id`, để truy vết log                                                                                                                                                                                 |


- Lỗi `500` chỉ trả `code: INTERNAL_ERROR` và câu chung chung, **không** trả stack trace hay thông tin SQL.
- Lỗi xác thực và đăng nhập không tiết lộ thông tin nhạy cảm.

### Mã lỗi chung


| Mã lỗi                   | HTTP | Ý nghĩa                                                                                               |
| ------------------------ | ---- | ----------------------------------------------------------------------------------------------------- |
| `BAD_REQUEST`            | 400  | Request không đọc được (JSON hỏng, sai `Content-Type`)                                                |
| `VALIDATION_ERROR`       | 422  | Sai kiểu, sai định dạng, thiếu, field lạ, vượt giới hạn ở path, query, header hoặc body. Có `details` |
| `UNAUTHENTICATED`        | 401  | Chưa đăng nhập hoặc token sai                                                                         |
| `CURRENT_PASSWORD_INVALID` | 401 | Mật khẩu hiện tại sai khi đổi mật khẩu tự nguyện; không thử refresh, phiên còn hiệu lực                 |
| `TOKEN_EXPIRED`          | 401  | Access token hết hạn                                                                                  |
| `PERMISSION_DENIED`      | 403  | Thiếu quyền                                                                                           |
| `CSRF_INVALID`           | 403  | Origin hoặc CSRF token thiếu/sai; tải lại trang rồi thử lại                                            |
| `NOT_FOUND`              | 404  | Không tìm thấy hoặc thuộc cửa hàng khác                                                               |
| `CONFLICT`               | 409  | Xung đột trạng thái chung, khi chưa có mã riêng                                                       |
| `RESOURCE_IN_USE`        | 409  | Xóa bản ghi đã có tham chiếu (BR-10)                                                                  |
| `SERVICE_UNAVAILABLE`    | 503  | Dịch vụ chưa sẵn sàng; không lộ cấu hình hoặc lỗi kết nối nội bộ                                      |
| `IDEMPOTENCY_KEY_REUSED` | 409  | Cùng `Idempotency-Key` nhưng nội dung khác                                                            |
| `TOO_MANY_REQUESTS`      | 429  | Vượt giới hạn tần suất                                                                                |
| `INTERNAL_ERROR`         | 500  | Lỗi không lường trước                                                                                 |


### Mã lỗi nghiệp vụ

Mỗi mã gắn với một business rule. Danh sách đầy đủ và `message` chuẩn nằm trong từng spec module, bảng dưới là danh mục để thống nhất tên.


| Mã lỗi                         | HTTP | Rule          | Khi nào                                                                |
| ------------------------------ | ---- | ------------- | ---------------------------------------------------------------------- |
| `PASSWORD_CHANGE_REQUIRED`     | 403  | BR-84         | Tài khoản phải đổi mật khẩu trước                                      |
| `ACCOUNT_DISABLED`             | 403  | BR-02         | Tài khoản bị khóa                                                      |
| `STORE_SUSPENDED`              | 403  | BR-82         | Cửa hàng bị tạm khóa                                                   |
| `ROLE_ESCALATION`              | 403  | BR-83         | Cấp vai trò không thấp hơn vai trò của mình                            |
| `LAST_OWNER`                   | 409  | BR-85         | Khóa hoặc hạ quyền chủ cửa hàng cuối cùng                              |
| `BRANCH_REQUIRED`              | 422  | BR-70, BR-71b | Thiếu `branchId` khi cần                                               |
| `BRANCH_INACTIVE`              | 409  | BR-76         | Chi nhánh ngưng hoạt động                                              |
| `SHIFT_NOT_OPEN`               | 409  | BR-16         | Chưa mở ca thu ngân mà bán hàng                                        |
| `SHIFT_ALREADY_OPEN`           | 409  | BR-14         | Người này đã có ca mở                                                  |
| `BRANCH_CASHIER_SHIFT_OPEN`    | 409  | BR-87         | Chi nhánh đang có ca thu ngân mở. Kèm tên người giữ ca trong `details` |
| `SHIFT_CLOSED`                 | 409  | BR-17         | Thao tác trên ca đã đóng                                               |
| `SHIFT_HAS_OPEN_INVOICES`      | 409  | BR-19         | Đóng ca khi còn đơn `OPEN`. Kèm danh sách mã đơn trong `details`       |
| `FORCE_CLOSE_COUNT_REQUIRED`   | 422  | BR-88         | Đóng cưỡng chế thiếu tiền đã đếm                                       |
| `RECONCILIATION_NOTE_REQUIRED` | 422  | BR-60         | Ca lệch mà thiếu ghi chú                                               |
| `INVOICE_NOT_OPEN`             | 409  | BR-22         | Sửa món, thêm món, xem trước thanh toán khi đơn không còn `OPEN`; hủy đơn không còn `OPEN`/`PAID` (ví dụ đã `CANCELLED`)       |
| `INVOICE_EMPTY`                | 422  | BR-27         | Thanh toán đơn chưa có món                                             |
| `INVOICE_BRANCH_MISMATCH`      | 422  | BR-69         | Chi nhánh của ca, bàn, đơn không khớp                                  |
| `TABLE_REQUIRED`               | 422  | BR-69         | Đơn tại chỗ thiếu bàn                                                  |
| `TABLE_HAS_OPEN_INVOICE`       | 409  | BR-74         | Bàn đã có đơn `OPEN`. Kèm `invoiceId` trong `details`                  |
| `TABLE_INACTIVE`               | 409  | BR-95         | Bàn ngưng dùng                                                         |
| `ITEM_NOT_AVAILABLE`           | 409  | BR-09         | Món, size, topping đã ngưng bán                                        |
| `TOPPING_NOT_ALLOWED`          | 422  | BR-11         | Topping không thuộc danh mục của món                                   |
| `CANCEL_REASON_REQUIRED`       | 422  | BR-28, BR-29  | Hủy đơn thiếu lý do                                                    |
| `CANCEL_NOT_ALLOWED`           | 409  | BR-29         | Hủy đơn `PAID` khi ca đã đóng                                          |
| `PAYMENT_AMOUNT_MISMATCH`      | 422  | BR-31         | Khoản thanh toán không bằng tổng hóa đơn                               |
| `ZERO_TOTAL_REQUIRED`         | 422  | BR-104        | Gọi `complete-zero` khi tổng hóa đơn khác 0đ                          |
| `TENDERED_INSUFFICIENT`        | 422  | BR-32         | Tiền khách đưa nhỏ hơn số tiền cần trả                                 |
| `PROMOTION_NOT_APPLICABLE`     | 422  | BR-36         | Mã hết hạn, chưa đủ đơn tối thiểu, hết lượt, ngưng dùng                |
| `PROMOTION_ALREADY_APPLIED`    | 409  | BR-40         | Hóa đơn đã có mã giảm giá                                               |
| `TRANSFER_PENDING` | 409  | BR-33         | Đơn còn lượt QR chờ (sửa món, mã giảm, thanh toán bị chặn) hoặc đổi tài khoản nhận khi cửa hàng còn QR chờ |
| `TRANSFER_NOT_PENDING` | 409  | BR-33         | Hủy hoặc xác nhận một lượt QR không còn `PENDING` |
| `BANK_ACCOUNT_REQUIRED` | 409  | BR-33         | Tạo QR khi cửa hàng chưa cài tài khoản nhận |
| `BANK_TRANSACTION_REUSED` | 409  | BR-33         | Mã giao dịch ngân hàng đã dùng cho đơn khác |
| `TRANSFER_AMOUNT_INSUFFICIENT` | 422  | BR-33         | Xác nhận thủ công với số tiền thực nhận nhỏ hơn tổng đơn |
| `INVALID_WEBHOOK_SIGNATURE` | 401  | BR-33         | Webhook SePay thiếu hoặc sai chữ ký (không dùng cookie/CSRF) |
| `INVALID_WEBHOOK_PAYLOAD` | 400  | BR-33         | Timestamp webhook thiếu, sai định dạng hoặc lệch quá ±300 giây (kiểm trước HMAC; chữ ký sai trả 401) hoặc nội dung không hợp lệ |
| `EXPENSE_REASON_REQUIRED`      | 422  | BR-52         | Chi phí thiếu lý do                                                    |
| `SHIFT_NOT_FOUND`              | 404  | BR-17         | Ca không tồn tại, khác cửa hàng hoặc khác chi nhánh khi không có `branch.access_all` |
| `FORBIDDEN_NOT_SHIFT_OWNER`    | 403  | BR-16         | Thao tác trên ca của người khác (đóng ca, ghi chi phí)                 |
| `EXPENSE_EXCEEDS_DRAWER`       | 422  | BR-53, BR-56  | Khoản chi từ két làm tiền kỳ vọng trong két nhỏ hơn 0                  |
| `CANCEL_EXCEEDS_DRAWER`        | 409  | BR-29, BR-56  | Hủy đơn tiền mặt làm tiền kỳ vọng trong két nhỏ hơn 0                  |


- Thêm mã lỗi mới thì cập nhật bảng này và tham chiếu mã `BR-xx` tương ứng.

---

## 7. Idempotency

Mục tiêu: một lần người dùng bấm thanh toán hoặc hoàn tất đơn 0đ chỉ đổi trạng thái hóa đơn và trừ kho **một lần**, kể cả khi client gửi lại vì lỗi mạng (BR-34, BR-104).

### Quy tắc phía client

- Sinh `Idempotency-Key` (`uuid`) **một lần cho mỗi lần thử thanh toán hoặc hoàn tất đơn 0đ**, lúc người dùng bấm Xác nhận lần đầu.
- Gửi lại vì **lỗi mạng, hết thời gian chờ hoặc không nhận được phản hồi**: dùng **lại đúng key đó** với đúng nội dung.
- Chỉ sinh key **mới** khi người dùng bắt đầu một lần thanh toán khác: sửa số liệu (ví dụ đổi tiền khách đưa), đổi phương thức, hoặc thao tác lại sau một phản hồi lỗi rõ ràng (`4xx`).
- Giữ key trong bộ nhớ cho đến khi nhận phản hồi cuối (thành công hoặc lỗi rõ ràng).

### "Cùng nội dung" là gì

Với thanh toán có tiền, hai request là **cùng nội dung** khi trùng cả năm giá trị: `invoiceId` (path) và các field body `method`, `amount`, `tenderedAmount`, `transactionRef`. Giá trị vắng mặt được chuẩn hóa thành `null`, chuỗi cắt khoảng trắng đầu cuối. Hash SHA-256 của dạng chuẩn hóa này lưu ở `payments.idempotency_request_hash` (xem [thiết kế DB](DESIGN_DB_POS_SYSTEM.md)).

### Quy tắc phía máy chủ

Khi nhận thanh toán với key `K`:

1. Tìm `payments` có `idempotency_key = K`.
2. **Không có**: xử lý bình thường. Ghi `idempotency_key` và `idempotency_request_hash` **cùng transaction** với khoản thanh toán (BR-35). Key chỉ được lưu khi thanh toán **thành công**. Request bị từ chối (`4xx`, rollback) không để lại key, nên gửi lại cùng key vẫn được.
3. **Có, cùng cửa hàng, cùng** `invoiceId`**, cùng hash**: trả lại kết quả của lần đầu (cùng mã `201` và `data`) kèm header `Idempotent-Replay: true`. Không tạo thanh toán mới, không trừ kho lần nữa. Đây không phải lỗi.
4. **Có nhưng khác hash, hoặc khác** `invoiceId`**, hoặc thuộc cửa hàng khác**: `409` `IDEMPOTENCY_KEY_REUSED`. Thông báo không tiết lộ khoản thanh toán của bên kia.

Các điểm cần xử lý khi cài đặt:

- **Hai request cùng key đến cùng lúc**: ràng buộc `UNIQUE (idempotency_key)` chặn bản ghi thứ hai. Request thua gặp lỗi vi phạm duy nhất, đọc lại bản ghi của request thắng rồi áp dụng bước 3 hoặc 4.
- Key nằm trong `payments` nên **tồn tại cùng khoản thanh toán**, không có hạn xóa. Hóa đơn bị hủy sau đó thì gửi lại key cũ vẫn trả kết quả gốc (khoản thanh toán vẫn là bản ghi lịch sử, xem BR-29).
- `POST /invoices/{id}/complete-zero`: chỉ nhận hóa đơn `OPEN`, có món, `totalAmount = 0`; không nhận body, bắt buộc `Idempotency-Key`. Ghi key vào `invoices.zero_completion_key`, đổi sang `PAID`, trừ kho trong một transaction. Thành công trả `204`; gửi lại cùng key trên cùng hóa đơn trả `204` và `Idempotent-Replay: true`, kể cả khi hóa đơn đã bị hủy sau đó. Key đã dùng cho hóa đơn 0đ khác trả `409` `IDEMPOTENCY_KEY_REUSED`; thiếu hoặc sai key trả `422`. Kiểm tra quyền và phạm vi cửa hàng trước khi trả replay.
- `POST /invoices/{id}/payments` chỉ nhận hóa đơn `OPEN` có `totalAmount > 0`, một lần thanh toán đủ tổng tiền bằng một phương thức. Đơn 0đ dùng `complete-zero`.
- `POST /invoices/{id}/transfer-attempts` và `POST /transfer-attempts/{id}/confirm-manual` cũng bắt buộc `Idempotency-Key` (`uuid`); trùng key với cùng nội dung trả kết quả cũ kèm `Idempotent-Replay: true`, khác nội dung trả `409` `IDEMPOTENCY_KEY_REUSED`.
- Thiếu header hoặc key không phải `uuid`: `422` `VALIDATION_ERROR` với `location` là `header`.
- Các `POST` khác chưa bắt buộc idempotency. Thêm vào route nào thì ghi trong spec của route đó.

---

## 8. Phân trang, lọc, sắp xếp

### Phân trang theo con trỏ


| Tham số  | Mặc định | Ghi chú                                                                          |
| -------- | -------- | -------------------------------------------------------------------------------- |
| `limit`  | 20       | Tối đa 100. Quá thì ép về 100                                                    |
| `cursor` | không    | Lấy từ `meta.nextCursor` của trang trước. Chuỗi mờ (opaque), client không tự tạo |


- Response danh sách có `meta.limit`, `meta.nextCursor` (`null` khi hết) và `meta.total`.
- Thứ tự cố định theo `sort` kèm khóa phụ là `id` để con trỏ ổn định.

### Sắp xếp

- Tham số `sort`, tên field `camelCase`, thêm dấu `-` phía trước cho giảm dần: `sort=-createdAt`. Có thể nhiều field cách nhau dấu phẩy.
- Mỗi route liệt kê field được phép sắp xếp. Field khác trả `422`.

### Lọc

- Lọc bằng tham số truy vấn cùng tên field: `status=OPEN`, `tableId=...`, `isActive=true`.
- Khoảng thời gian: `from` và `to` (ISO 8601 UTC, hoặc `YYYY-MM-DD` ở route báo cáo). `from` tính từ đầu, `to` **không gồm** mốc cuối.
- Nhiều giá trị: lặp tham số hoặc cách nhau dấu phẩy. Mỗi route ghi rõ cách dùng.
- Tìm kiếm văn bản: tham số `q`, chỉ có ở route nào ghi rõ.

---

## 9. Quy ước đặc biệt cho nghiệp vụ

- **Giá và tiền do máy chủ tính** (BR-24, BR-25). Response luôn trả giá trị đã tính, client không tự cộng.
- **Snapshot**: dòng món và topping trong hóa đơn trả kèm tên và giá lúc bán (BR-26). Không tra lại giá hiện tại cho hóa đơn cũ.
- **Thêm món** luôn tạo dòng mới, không gộp (BR-90). Sau mỗi thay đổi, response trả **toàn bộ đơn** đã tính lại tổng tiền.
- **Đếm mù** (BR-58): `expectedCash` và `difference` của ca đang mở **không** xuất hiện ở bất kỳ response nào. Chỉ có trong response của hành động đóng ca và trong chi tiết ca đã `CLOSED`.
- **Mật khẩu tạm** (BR-84): trả trong field `temporaryPassword` **đúng một lần** ở response tạo tài khoản, tạo cửa hàng (kèm chủ cửa hàng) và đặt lại mật khẩu. Không route nào đọc lại được. Không ghi vào log.
- **Transaction**: ghi thanh toán (nếu có), đổi `status` hóa đơn sang `PAID` và trừ kho nằm trong **một transaction** (BR-35, BR-104). Hành động thêm hoặc sửa món khóa dòng hóa đơn trong transaction (BR-90).
- **Ảnh món**: `POST /products/{id}/image` nhận `multipart/form-data` với một file ảnh tối đa 2 MB (2.000.000 byte); mỗi món có tối đa một ảnh đại diện. Người gọi phải có quyền sửa món và món phải thuộc cửa hàng của họ. Server kiểm tra file rồi mã hóa Base64 thuần (không kèm tiền tố `data:`) vào `products.image_base64` (`text`), lưu MIME ở `image_mime`; không nhận chuỗi Base64 từ client. Response trả `imageUrl` trỏ tới `GET /products/{id}/image` cùng origin, không trả đường dẫn lưu nội bộ. Route GET yêu cầu access cookie và kiểm tra cùng store, giải mã Base64 rồi trả bytes với MIME phù hợp thay vì JSON; web có thể hiển thị ảnh cùng origin bằng `<img src>` vì browser tự gửi cookie. Định dạng file cụ thể ghi trong `.devloopflow/specs/legacy-catalog.md` khi viết endpoint.
- **Sổ kho** chỉ thêm dòng, **không có** route sửa hoặc xóa `stock_movements` (BR-44).
- **Nội dung đã khóa**: hóa đơn `PAID` hoặc `CANCELLED` không sửa món, giá, tổng tiền. Ca `CLOSED` không sửa. Chuyển trạng thái chỉ qua hành động đã định nghĩa. Hóa đơn `PAID` chỉ chuyển được sang `CANCELLED` bằng `POST /invoices/{id}/cancel` theo BR-29 (cần quyền, lý do, ca còn mở). Các khoản `payments` đã nhận **giữ nguyên**, không sửa, không xóa (BR-17, BR-21, BR-29).
- **Trừ kho** theo `invoices.branch_id` (BR-72), không theo chi nhánh của người gọi.

---

## 10. Giới hạn tần suất

- Áp dụng giới hạn cho các route nhạy cảm, đặc biệt `POST /auth/login` và `POST /auth/refresh`. Vượt giới hạn trả `429` kèm `Retry-After`.
- Mức giới hạn cụ thể và cơ chế theo IP, tên đăng nhập xem [auth.md](architecture/auth.md).

---

## 11. Danh mục nhóm route

Chỉ liệt kê **nhóm route** và người dùng chính. Danh sách endpoint, request và response chi tiết nằm trong `.devloopflow/specs/<module>.md`.


| Nhóm               | Đường dẫn gốc                                                                | Người dùng chính                               | Spec chi tiết                                          |
| ------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| Xác thực           | `/auth`                                                                      | Mọi người dùng                                 | `.devloopflow/specs/auth.md`                 |
| Quản trị nền tảng  | `/platform/stores`                                                           | `PLATFORM_ADMIN`                               | `.devloopflow/specs/platform.md`         |
| Chi nhánh          | `/branches`                                                                  | `OWNER`                                        | `.devloopflow/specs/organization.md` |
| Bàn                | `/dining-tables`                                                             | `OWNER`, `MANAGER`                             | `.devloopflow/specs/organization.md` |
| Tài khoản          | `/users`                                                                     | `OWNER` (và `PLATFORM_ADMIN` cho chủ cửa hàng) | `.devloopflow/specs/users.md`               |
| Vai trò và quyền   | `/roles`, `/permissions`                                                     | Đọc: người có quyền                            | `.devloopflow/specs/users.md`               |
| Danh mục sản phẩm  | `/categories`, `/products`, `/sizes`, `/toppings`, `/products/{id}/image`   | `OWNER`, `MANAGER`                             | `.devloopflow/specs/legacy-catalog.md`           |
| Mã giảm giá        | `/promotion-codes`                                                           | `OWNER`, `MANAGER`                             | `.devloopflow/specs/promotions.md`     |
| Hóa đơn            | `/invoices`, `/invoices/{id}/items`, `/invoices/{id}/payments`, `/invoices/{id}/complete-zero`, `/invoices/{id}/payment-preview`, `/invoices/{id}/apply-promotion`, `/invoices/{id}/remove-promotion`, `/invoices/{id}/cancel` | `CASHIER`, `MANAGER`, `OWNER` | `.devloopflow/specs/invoices.md`; `.devloopflow/specs/20261113-sprint09-ui.md` (phạm vi đọc, lọc, phân trang) |
| Chuyển khoản QR | `/store-bank-account`, `/invoices/{id}/transfer-attempts`, `/transfer-attempts/{id}/confirm-manual`, `/transfer-attempts/{id}/cancel`, `/bank-transfer-exceptions`, `/payments/sepay/webhook` (webhook không dùng cookie/CSRF, xác thực bằng HMAC) | `OWNER` (tài khoản nhận), `CASHIER`/`MANAGER`/`OWNER` (QR), `MANAGER`/`OWNER` (xác nhận thủ công, ngoại lệ), SePay (webhook) | `.devloopflow/specs/invoices.md` |
| Ca làm và đối soát | `/work-shifts`, `/work-shifts/{id}/expenses`                                 | Mọi vai trò theo phạm vi                       | `.devloopflow/specs/shifts.md`             |
| Kho và công thức   | `/ingredients`, `/ingredient-stocks`, `/stock-movements`, công thức theo món | `OWNER`, `MANAGER`                             | `.devloopflow/specs/inventory.md`       |
| Báo cáo            | `/reports`                                                                   | Theo vai trò (BR-65)                           | `.devloopflow/specs/legacy-reports.md`           |


- Kiểm tra trạng thái từng file spec ở cột cuối và spec thiết kế tương ứng trong `.devloopflow/specs/` nếu có; `.devloopflow/specs/auth.md` đã chốt cho PB-02 theo hồ sơ cũ.
- Nhóm route phải khớp với phạm vi MVP và giai đoạn 2 trong [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md). Không tạo route cho tính năng chưa được yêu cầu.

---

## 12. Mẫu cho một spec endpoint

Mỗi endpoint trong `.devloopflow/specs/<module>.md` phải có đủ các mục sau, theo thứ tự:

1. **Phương thức và đường dẫn**, ví dụ `POST /invoices/{id}/items`.
2. **Mô tả** một hai câu.
3. **Quyền** cần có (mã `permission`) và vai trò mặc định.
4. **Phạm vi**: dùng ngữ cảnh cửa hàng, chi nhánh theo mục 3 nào.
5. **Business rule** liên quan (mã `BR-xx`).
6. **Request**: tên DTO/schema; tham số đường dẫn, truy vấn, header, body, kèm kiểu, bắt buộc hay không, nullable, ràng buộc.
7. **Response thành công**: tên DTO/schema, mã HTTP và cấu trúc `data`; nêu rõ `204` không body.
8. **Lỗi**: bảng mã lỗi, HTTP, điều kiện (dùng mã ở mục 6).
9. **Ghi chú xử lý**: transaction, khóa, thứ tự thao tác, tác dụng phụ (trừ kho, ghi sổ kho...).
10. **Ví dụ** request và response.
11. **Kiểm thử cần có**: danh sách tình huống tương ứng mã `BR-xx`.

---

## 13. Quyết định MVP đã chốt

- Tiền là JSON number, trần trị tuyệt đối 1.000 tỷ đồng cho mỗi giá trị ghi DB, kể cả kết quả tính (BR-103).
- `400` dành cho request không đọc được; request đọc được nhưng sai kiểu, thiếu hoặc sai giá trị trả `422`.
- Phạm vi chi nhánh xác định theo loại route ở mục 3.
- Thanh toán một lần, một phương thức, đủ toàn bộ; tối đa một mã giảm giá mỗi hóa đơn. Đơn 0đ hoàn tất bằng hành động riêng, không tạo `payment` (BR-31, BR-40, BR-104).
- Thanh toán gửi lại cùng key và nội dung trả kết quả cũ; `payments.idempotency_request_hash` dùng để so nội dung (BR-34).
- Hủy hóa đơn `PAID` theo BR-29 giữ nguyên `payments`; tiền mặt hoàn từ két, chuyển khoản hoàn ngoài hệ thống và ghi lý do.
- Access token 30 phút, refresh token 7 ngày và xoay vòng mỗi lần làm mới. Mật khẩu tối thiểu 12 ký tự; giới hạn tần suất xem [auth.md](architecture/auth.md).
- MVP chấp nhận lần lưu sau ghi đè thay đổi menu và giá, chưa dùng `ETag`/`If-Match`.
- Ảnh món không bắt buộc; người có quyền sửa món tải ảnh lên hệ thống theo BR-105.
