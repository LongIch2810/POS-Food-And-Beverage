# PB-02 — Xác thực và phiên

**Trạng thái:** đã chốt cho PB-02 ngày 2026-10-28 theo xác nhận của Product Owner. Chỉ API; UI thật thuộc PB-13. Áp dụng BR-01–05, BR-78–84, `docs/api-spec.md`, `docs/architecture/auth.md` và schema PB-01.

## Hợp đồng chung

Các route nằm dưới `/api/v1/auth`. Thành công trả `{ "data": ... }`, trừ `204` không có body. Lỗi theo envelope chung và `X-Request-Id`. Không nhận Bearer token; không trả token hoặc hash trong JSON/log. Cookie access và refresh có `HttpOnly; Secure; SameSite=Strict; Path=/`, không Domain; CSRF cùng thuộc tính trừ `HttpOnly`. Cookie có tên `__Host-pos_access`, `__Host-pos_refresh`, `__Host-pos_csrf`.

Mọi request ghi cần Origin khớp chính xác `PUBLIC_ORIGIN`; trừ login, còn cần `X-CSRF-Token` bằng CSRF cookie và HMAC hợp lệ cho session. Thiếu/sai trả `403 CSRF_INVALID`. Login chỉ kiểm tra Origin. Access JWT HS256 với `sub`, `sid`, `role`, `storeId`, `branchId`, `iat`, `exp`; 30 phút. Refresh ngẫu nhiên 256 bit, lưu SHA-256, hạn 7 ngày kể từ lần cấp. CSRF token là nonce và HMAC theo session bằng secret riêng. JWT/CSRF secret tối thiểu 32 byte, lấy từ môi trường; thiếu/sai khiến startup thất bại.

## DTO và schema JSON

Các schema dưới đây là hợp đồng JSON; cookie và header được mô tả riêng ở từng endpoint. Chỉ chấp nhận các field đã liệt kê; không ép kiểu từ chuỗi sang số/boolean. Request không khai báo body phải không có body và query. Mọi UUID là chuỗi UUID; `permissions` là mảng mã quyền, có thể rỗng. Không có field secret/hash trong response.

```ts
type LoginRequest = {
  username: string; // Bắt buộc; trim trước khi tra; 1–50 ký tự sau trim.
  password: string; // Bắt buộc, không rỗng.
};

type ChangePasswordRequest = {
  newPassword: string; // Bắt buộc; ít nhất 12 ký tự, tối đa 72 byte UTF-8.
  currentPassword?: string; // Bắt buộc khi mustChangePassword=false; nếu có phải là chuỗi.
};

type UserSummary = {
  id: string;
  username: string;
  fullName: string;
  role: string;
  storeId: string | null;
  branchId: string | null;
  permissions: string[];
  mustChangePassword: boolean;
};

type SessionResponse = { data: { expiresIn: 1800; user: UserSummary } }; // login, refresh
type MeResponse = { data: { user: UserSummary } };
type CsrfResponse = { data: Record<string, never> }; // data = {}
type NoContentResponse = undefined; // logout, change-password: HTTP 204, không có body
type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details: Array<{ location: 'path' | 'query' | 'header' | 'body'; field: string; message: string }>;
    requestId: string;
  };
};
```

`POST /login` nhận `LoginRequest`, trả `SessionResponse`; `POST /change-password` nhận `ChangePasswordRequest`, trả `204`. `GET /me` trả `MeResponse`, `GET /csrf` trả `CsrfResponse`, `POST /refresh` trả `SessionResponse`, `POST /logout` trả `204`; bốn route sau không có JSON body. Lỗi dùng `ErrorResponse` với HTTP/code cụ thể ghi tại từng endpoint. NestJS dùng DTO class, `class-validator`/`ValidationPipe` để xác thực body và `@nestjs/swagger` để sinh OpenAPI; Passport local chỉ xác minh login, còn access guard kiểm tra phiên và quyền từ DB.

## Endpoint

| Route | Đầu vào | Thành công | Lỗi chính |
| --- | --- | --- | --- |
| `POST /login` | JSON `username`, `password` (chuỗi bắt buộc) | `200`, đặt ba cookie; `data.expiresIn=1800`, `data.user` là danh tính hiện hành và `mustChangePassword` | `401 UNAUTHENTICATED` chung cho tài khoản không tồn tại, sai mật khẩu, khóa user/store; `429 TOO_MANY_REQUESTS` |
| `GET /me` | Access cookie | `200`, `data.user` gồm `id`, `username`, `fullName`, `role`, `storeId`, `branchId`, `permissions`, `mustChangePassword` | `401 UNAUTHENTICATED` nếu phiên đã bị thu hồi (kể cả sau khóa store), hoặc `TOKEN_EXPIRED`; `403 ACCOUNT_DISABLED`/`STORE_SUSPENDED` nếu phiên còn hiệu lực |
| `GET /csrf` | Refresh cookie hợp lệ | `200`, phát lại CSRF cookie, `data` rỗng; không xoay refresh | `401 UNAUTHENTICATED` |
| `POST /refresh` | Refresh cookie, Origin, CSRF | `200`, xoay refresh và đặt lại access/refresh cookie; `data.expiresIn=1800`, `data.user` | `401 UNAUTHENTICATED`; `429 TOO_MANY_REQUESTS` |
| `POST /logout` | Origin; refresh cookie và CSRF nếu còn phiên hợp lệ | `204`, thu hồi phiên hiện tại và xóa ba cookie; thiếu/hết hạn refresh vẫn `204` và xóa cookie | `403 CSRF_INVALID` khi phiên còn hiệu lực mà CSRF sai |
| `POST /change-password` | Access cookie, Origin, CSRF; `newPassword`, và `currentPassword` khi không ở lần đổi bắt buộc | `204`, đổi hash và thu hồi mọi phiên, xóa ba cookie | `401 CURRENT_PASSWORD_INVALID` nếu mật khẩu hiện tại sai, không thu hồi phiên; `422 VALIDATION_ERROR` nếu đầu vào sai |

`newPassword` dài tối thiểu 12 ký tự và tối đa 72 byte UTF-8 do bcrypt. Username tra bằng `lower(btrim(username))`. Mọi field lạ hoặc sai kiểu trả `422 VALIDATION_ERROR`. Sai `currentPassword` trả `401 CURRENT_PASSWORD_INVALID`; client không thử refresh cho mã này.

## Phiên, quyền và giới hạn thử

Mỗi login tạo `session_id` riêng. Guard xác minh JWT, kiểm tra refresh token hiện hành chưa thu hồi/hết hạn của đúng user/session, rồi đọc user, store, role và permissions từ DB ở mỗi request. Chỉ dùng dữ liệu hiện hành cho quyền và phạm vi. User cần đổi mật khẩu chỉ được truy cập năm route auth cho phép; route nghiệp vụ trả `403 PASSWORD_CHANGE_REQUIRED`. `PLATFORM_ADMIN` không có store và không được cấp quyền vận hành store.

Refresh khóa token hiện hành trong transaction, đánh dấu `revoked_at` và `replaced_at`, thêm token mới cùng session. Nếu token đã xoay bị dùng lại, thu hồi mọi token của session đó và xóa cookie; phiên khác còn hiệu lực. Logout thu hồi đúng session; đổi mật khẩu cập nhật hash, xóa cờ và thu hồi mọi phiên trong một transaction. Khóa user/store ở PB sau phải thu hồi phiên trong transaction của chính thao tác đó; guard PB-02 vẫn từ chối ngay khi trạng thái DB đã khóa.

Login giới hạn 5 lần **thất bại** trong 15 phút trượt theo username chuẩn hóa và theo IP; lần thứ sáu bị từ chối trước khi kiểm tra mật khẩu. User không tồn tại vẫn được tính. Refresh giới hạn 30 lần gọi/phút trượt theo IP. Bộ đếm lưu PostgreSQL, kiểm tra/ghi nguyên tử dưới cạnh tranh. `429` kèm `Retry-After` giây đến lúc sự kiện cũ nhất rời cửa sổ. Chỉ tin IP của kết nối hoặc proxy đã cấu hình. Sự kiện hết hạn được dọn định kỳ; không lưu username/IP thô trong bảng giới hạn.

## Chi tiết endpoint để rà soát

### POST /api/v1/auth/login

- **Mô tả:** Xác minh tài khoản đã được cấp và tạo phiên trình duyệt mới.
- **Quyền, phạm vi, BR:** công khai, không lấy store/branch từ request; BR-01–04, BR-78, BR-82, BR-97.
- **Request:** JSON object chỉ có `username` và `password`, đều là chuỗi không rỗng; username trim/lower bằng PostgreSQL trước khi tra. `Origin` bắt buộc. Không nhận giá trị token từ body/header.
- **Response:** `200 {"data":{"expiresIn":1800,"user":<UserSummary>}}` và ba `Set-Cookie`. `UserSummary` là object trong `/me` bên dưới.
- **Lỗi:** `400 BAD_REQUEST` cho JSON hỏng/sai Content-Type; `422 VALIDATION_ERROR` cho field thiếu/sai kiểu/lạ; `403 CSRF_INVALID` cho Origin; `401 UNAUTHENTICATED` cùng thông báo cho user không tồn tại, sai mật khẩu, user khóa, store tạm khóa; `429 TOO_MANY_REQUESTS` khi giới hạn thất bại đã đạt.
- **Xử lý:** kiểm tra giới hạn thất bại theo username/IP trước khi xác minh; dùng phép so hash mật khẩu ngay cả khi user không tồn tại để tránh khác biệt thời gian lớn. Tạo session và refresh hash, cập nhật `last_login_at` trong transaction; chỉ đặt cookie sau commit. Không tăng bộ đếm khi đăng nhập thành công.
- **Ví dụ:** `POST {"username":" admin ","password":"<secret>"}` → `200 {"data":{"expiresIn":1800,"user":{"id":"<uuid>","username":"admin","fullName":"Quản trị","role":"PLATFORM_ADMIN","storeId":null,"branchId":null,"permissions":[],"mustChangePassword":true}}}`.
- **Kiểm thử:** BR-01/02/03/04/78/82/97, lỗi chung, 5 lần thất bại theo từng khóa, request đồng thời, không lộ token/hash.

### GET /api/v1/auth/me

- **Mô tả:** Trả danh tính, vai trò, quyền và phạm vi hiện hành.
- **Quyền, phạm vi, BR:** access cookie hợp lệ; phạm vi từ DB, không từ claim snapshot; BR-02/03/05/79/80/81/84.
- **Request:** không có body/query; cookie access.
- **Response:** `200 {"data":{"user":<UserSummary>}}`, trong đó `UserSummary` chỉ gồm `id`, `username`, `fullName`, `role` (mã vai trò), `storeId`, `branchId`, `permissions` (mảng mã quyền), `mustChangePassword`.
- **Lỗi:** `401 UNAUTHENTICATED` nếu thiếu/sai token hoặc phiên mất (bao gồm cookie cũ sau khóa store); `401 TOKEN_EXPIRED` nếu JWT hết hạn; `403 ACCOUNT_DISABLED`/`STORE_SUSPENDED` theo trạng thái hiện hành nếu phiên còn hiệu lực.
- **Xử lý:** đối chiếu session còn refresh hiện hành, nạp user/store/role/permissions cùng request; không ghi DB.
- **Ví dụ:** `GET` với access cookie → `200 {"data":{"user":{"id":"<uuid>","username":"admin","fullName":"Quản trị","role":"PLATFORM_ADMIN","storeId":null,"branchId":null,"permissions":[],"mustChangePassword":true}}}`.
- **Kiểm thử:** BR-02/03/05/79/80/81/84, đổi role/quyền giữa hai request, phiên thu hồi và token hết hạn.

### GET /api/v1/auth/csrf

- **Mô tả:** Phát lại CSRF cookie sau khi tải lại trang hoặc cookie CSRF bị mất; không xoay refresh.
- **Quyền, phạm vi, BR:** refresh cookie hợp lệ của user/store còn hoạt động; BR-02/03/04/82.
- **Request:** refresh cookie; không có body/query.
- **Response:** `200 {"data":{}}` cùng `Set-Cookie` CSRF.
- **Lỗi:** `401 UNAUTHENTICATED` khi refresh cookie thiếu/sai/hết hạn/thu hồi; `403 ACCOUNT_DISABLED`/`STORE_SUSPENDED` cho phiên còn nhận diện được nhưng user/store đã khóa.
- **Xử lý:** xác minh refresh hash, session và trạng thái hiện hành; không thay đổi DB hoặc hạn refresh.
- **Ví dụ:** `GET` với refresh cookie → `200 {"data":{}}` cùng CSRF cookie.
- **Kiểm thử:** BR-02/03/04/82; thiếu CSRF cookie, token cũ đã xoay, không tạo thêm refresh token.

### POST /api/v1/auth/refresh

- **Mô tả:** Xoay refresh token và cấp access token mới cho cùng phiên.
- **Quyền, phạm vi, BR:** refresh cookie hợp lệ, Origin và CSRF; BR-02/03/04/82.
- **Request:** không có body/query; refresh và CSRF cookie, `Origin`, `X-CSRF-Token`.
- **Response:** `200 {"data":{"expiresIn":1800,"user":<UserSummary>}}`, đặt lại access/refresh cookie.
- **Lỗi:** `401 UNAUTHENTICATED` khi thiếu/sai/hết hạn hoặc replay; `403 CSRF_INVALID`, `ACCOUNT_DISABLED` hoặc `STORE_SUSPENDED`; `429 TOO_MANY_REQUESTS` với `Retry-After`.
- **Xử lý:** khóa token hiện hành trong transaction, kiểm tra user/store, đặt `revoked_at` và `replaced_at` trên token cũ, chèn hash token mới cùng `session_id`; khi replay token đã xoay, thu hồi mọi token session đó trong transaction riêng và xóa ba cookie. Phiên khác không bị ảnh hưởng.
- **Ví dụ:** `POST` với cookie và CSRF hợp lệ → `200 {"data":{"expiresIn":1800,"user":<UserSummary>}}`.
- **Kiểm thử:** BR-02/03/04/82; hạn mới 7 ngày, hai refresh đồng thời, replay chỉ thu hồi một session, rollback nếu insert token mới lỗi.

### POST /api/v1/auth/logout

- **Mô tả:** Thu hồi phiên hiện tại; gọi lại an toàn khi browser đã mất phiên.
- **Quyền, phạm vi, BR:** Origin bắt buộc; với refresh cookie còn hợp lệ cần CSRF; BR-03/04.
- **Request:** không có body/query; refresh/CSRF cookie nếu có, `Origin`, `X-CSRF-Token` nếu phiên hợp lệ.
- **Response:** `204` không body, luôn xóa ba cookie. Thiếu/hết hạn refresh vẫn `204` sau kiểm tra Origin.
- **Lỗi:** `403 CSRF_INVALID` nếu Origin sai hoặc phiên hợp lệ nhưng CSRF thiếu/sai.
- **Xử lý:** thu hồi mọi dòng còn hiệu lực của đúng `session_id`; không tác động phiên khác. Cookie chỉ xóa sau khi commit.
- **Ví dụ:** `POST` với cookie hợp lệ và CSRF → `204` cùng ba `Set-Cookie` xóa.
- **Kiểm thử:** BR-03/04; hai thiết bị, logout lặp, không refresh cookie, CSRF sai khi phiên còn hiệu lực.

### POST /api/v1/auth/change-password

- **Mô tả:** Đổi mật khẩu bắt buộc lần đầu hoặc tự nguyện, rồi yêu cầu đăng nhập lại.
- **Quyền, phạm vi, BR:** access cookie, Origin, CSRF; chỉ sửa chính user đã xác thực; BR-01/03/84.
- **Request:** JSON `newPassword` (chuỗi 12 ký tự trở lên, tối đa 72 byte UTF-8), `currentPassword` bắt buộc khi `must_change_password=false`; field khác bị từ chối.
- **Response:** `204` không body, xóa ba cookie.
- **Lỗi:** `401 UNAUTHENTICATED`/`TOKEN_EXPIRED` cho access; `401 CURRENT_PASSWORD_INVALID` cho mật khẩu hiện tại sai, phiên vẫn còn; `403 CSRF_INVALID`; `422 VALIDATION_ERROR` cho body sai.
- **Xử lý:** khóa user, xác minh mật khẩu hiện tại khi cần; ghi hash bcrypt cost 12, bỏ cờ và thu hồi tất cả refresh token của user trong cùng transaction. Không ghi mật khẩu vào log.
- **Ví dụ:** `POST {"newPassword":"<new-secret>","currentPassword":"<old-secret>"}` → `204`.
- **Kiểm thử:** BR-01/03/84; lần đầu không cần current, lần tự nguyện cần và kiểm tra current, giới hạn độ dài/byte, rollback, mọi phiên mất hiệu lực ngay.

## Kiểm thử chấp nhận

Test HTTP trên PostgreSQL thật: cookie/JSON, login chung lỗi, `me` và quyền cập nhật, user/store khóa, refresh/replay và hai thiết bị, logout lặp, hai kiểu đổi mật khẩu, Origin/CSRF, rate limit theo username/IP với thời gian kiểm soát, transaction rollback và không lộ secret. Build/test và QA evidence theo `AGENTS.md`.
