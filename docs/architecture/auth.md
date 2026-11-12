# Kiến trúc xác thực MVP

Đây là **thiết kế cần triển khai**, không phải mô tả UI demo hiện tại. Vai trò, phạm vi dữ liệu và mã lỗi dùng chung theo [PRODUCT_OVERVIEW.md](../PRODUCT_OVERVIEW.md), [BUSINESS_RULES.md](../BUSINESS_RULES.md) và [api-spec.md](../api-spec.md). Không có đăng ký công khai.

## 1. Token và phiên

- Web và API dùng **cùng origin** qua reverse proxy. Browser gọi API bằng đường dẫn cùng origin. Chỉ tin header chuyển tiếp từ proxy đã cấu hình, không tin `X-Forwarded-*` do client tự gửi.
- Access token là JWT sống **30 phút**, chỉ đặt trong cookie `__Host-pos_access` với `HttpOnly; Secure; SameSite=Strict; Path=/`, không đặt `Domain`; hạn cookie khớp hạn token. Browser tự gửi cookie khi gọi API cùng origin. JavaScript không đọc token; API không nhận access token từ `Authorization` hay JSON, không ghi vào `localStorage`, `sessionStorage` hoặc URL.
- Refresh token là chuỗi ngẫu nhiên tối thiểu **256 bit** do server sinh bằng bộ sinh số mật mã, sống **7 ngày từ lần cấp gần nhất**. Mỗi lần refresh thành công cấp token mới hạn 7 ngày. Chỉ lưu hash trong DB. Browser giữ token trong cookie `__Host-pos_refresh` với `HttpOnly; Secure; SameSite=Strict; Path=/`, không đặt `Domain`; hạn cookie khớp hạn token. Không trả refresh token trong JSON.
- Mỗi lần đăng nhập tạo `session_id` mới cho thiết bị/phiên trình duyệt. Một user có thể có nhiều phiên độc lập. MVP chưa có màn hình xem hoặc thu hồi từng thiết bị.
- Access JWT có `sub` (user ID), `sid` (session ID), `role`, `storeId`, `branchId`, `iat`, `exp`. Ký bằng `HS256` với khóa ngẫu nhiên tối thiểu 32 byte lấy từ cấu hình bí mật. Server cố định thuật toán khi xác minh, kiểm tra chữ ký và hạn; từ chối `alg=none` hoặc thuật toán khác. Không lưu khóa trong repository. Thay khóa khiến access token cũ mất hiệu lực.
- `role`, `storeId`, `branchId` là ảnh chụp tại lúc cấp token. Phân quyền và giới hạn truy vấn luôn dùng **user, role, store, branch hiện hành** được đọc lại ở server, không tin claim cũ. `PLATFORM_ADMIN` không thuộc store và không truy cập dữ liệu vận hành của store.

## 2. Dữ liệu phiên và guard

Thêm `session_id uuid NOT NULL`, `replaced_at timestamptz NULL` vào `refresh_tokens`, index `(user_id, session_id)` và ràng buộc **tối đa một dòng chưa thu hồi** (`revoked_at IS NULL`) cho mỗi `session_id`. Khi xoay token, đặt cả `revoked_at` và `replaced_at` trên dòng cũ; token logout/thu hồi chỉ đặt `revoked_at`. Giữ dòng cũ để phát hiện token đã xoay vòng bị dùng lại. `token_hash` vẫn duy nhất; không lưu token thô. Với token ngẫu nhiên đủ entropy, có thể lưu SHA-256 của token và tra cứu bằng index. Lịch sử token đã hết hạn được dọn theo chính sách lưu giữ riêng, sau khoảng thời gian cần để phát hiện dùng lại.

Với **mỗi request cần xác thực bằng access cookie**, server:

1. Đọc access JWT từ `__Host-pos_access`, xác minh `sub`, `sid`, `exp` và claim bắt buộc. Thiếu/sai cookie trả `401 UNAUTHENTICATED`; nếu cookie còn được gửi nhưng JWT đã hết hạn, trả `401 TOKEN_EXPIRED`.
2. Kiểm tra `sid` thuộc `sub`, có refresh token hiện hành chưa thu hồi và chưa hết hạn. Nếu không, trả `401 UNAUTHENTICATED`. Nhờ đó logout/thu hồi phiên chặn access token cũ **ngay**.
3. Đọc user hiện hành. `is_active = false` trả `403 ACCOUNT_DISABLED`; store `SUSPENDED` trả `403 STORE_SUSPENDED`. Lấy role, branch và quyền hiện hành từ DB/nguồn dữ liệu đủ mới, không lấy quyền từ JWT.
4. Nếu `must_change_password = true`, chỉ cho `GET /auth/me`, `GET /auth/csrf`, `POST /auth/refresh`, `POST /auth/change-password`, `POST /auth/logout`; route nghiệp vụ trả `403 PASSWORD_CHANGE_REQUIRED`.

Không dùng cache khiến thu hồi phiên, khóa user/store hoặc đổi role/branch có hiệu lực chậm. Mọi truy vấn nghiệp vụ lấy phạm vi store/branch từ danh tính đã xác minh; ID do client gửi phải được kiểm tra cùng store. Phân quyền chi tiết theo [api-spec.md](../api-spec.md).

## 3. Route và hành vi client

| Route | Yêu cầu | Kết quả |
| --- | --- | --- |
| `POST /auth/login` | JSON `username`, `password`; Origin đúng | Tạo phiên, đặt access, refresh và CSRF cookie; JSON `data.expiresIn` (giây), `data.user` gồm `mustChangePassword`; không trả token trong JSON |
| `GET /auth/csrf` | Refresh cookie hiện hành hợp lệ | Phát lại CSRF cookie nếu thiếu; không xoay refresh token |
| `POST /auth/refresh` | Refresh cookie, Origin đúng, `X-CSRF-Token` hợp lệ | Xoay refresh token, đặt lại access và refresh cookie; JSON `data.expiresIn`, `data.user`; không trả token trong JSON |
| `POST /auth/logout` | Refresh cookie, Origin đúng, `X-CSRF-Token` hợp lệ | Thu hồi **phiên hiện tại**, xóa ba cookie, trả `204` |
| `POST /auth/change-password` | Access cookie, Origin và CSRF hợp lệ; JSON `newPassword`, thêm `currentPassword` nếu không phải lần đổi bắt buộc | Đổi hash, bỏ cờ buộc đổi, thu hồi **mọi phiên**, xóa ba cookie, trả `204`; client về trang đăng nhập |
| `GET /auth/me` | Access cookie | User, role, branch, store, quyền, `mustChangePassword` hiện hành |

Tên đăng nhập được chuẩn hóa thành `lower(btrim(username))` bằng PostgreSQL khi tạo và tìm, lưu giá trị chuẩn và đặt `UNIQUE (username)` cùng `CHECK (username = lower(btrim(username)))`: **duy nhất không phân biệt hoa thường** trên toàn hệ thống. Đăng nhập sai trả lỗi chung cho username không tồn tại, sai mật khẩu, tài khoản bị khóa hoặc store tạm khóa để tránh dò tài khoản; sau khi xác thực thì API trả mã trạng thái tương ứng. Mật khẩu chỉ lưu hash an toàn (`argon2id` hoặc bcrypt với tham số phù hợp).

Khi mở hoặc tải lại trang, client gọi `GET /auth/me` với cookie tự động gửi. Nếu access cookie thiếu/hết hạn, client đọc CSRF cookie; nếu thiếu thì gọi `GET /auth/csrf`, rồi gọi `POST /auth/refresh` để server đặt access cookie mới và gọi lại `GET /auth/me`. Refresh thất bại thì xóa trạng thái đăng nhập trong bộ nhớ và hiện trang login. Khi request nghiệp vụ trả `401 UNAUTHENTICATED` hoặc `401 TOKEN_EXPIRED`, client chỉ chạy **một refresh tại một thời điểm** trên các request và các tab cùng dùng cookie; các request đồng thời chờ, rồi thử lại tối đa một lần. Có thể dùng cơ chế khóa giữa các tab của browser để tránh hai refresh song song. Không gửi lại refresh token cũ sau lỗi. `403 PASSWORD_CHANGE_REQUIRED` mở màn đổi mật khẩu; `ACCOUNT_DISABLED`/`STORE_SUSPENDED` xóa trạng thái đăng nhập.

## 4. Chống CSRF

Vì browser tự gửi access/refresh cookie, **mọi request thay đổi trạng thái** (`POST`, `PATCH`, `DELETE`) sau đăng nhập phải có cả Origin đúng origin đã cấu hình và `X-CSRF-Token` hợp lệ, kể cả `/auth/refresh`, `/auth/logout` và `/auth/change-password`. `POST /auth/login` chưa có phiên, kiểm tra Origin nhưng chưa yêu cầu CSRF token. `GET` không được thay đổi trạng thái. Thiếu/sai Origin hoặc CSRF trả `403 CSRF_INVALID`; không suy ra origin đáng tin từ header do client tự gửi.

Server phát CSRF token ngẫu nhiên **gắn với session_id** (nonce ngẫu nhiên + HMAC bằng secret riêng trên `session_id` và nonce) trong cookie `__Host-pos_csrf` (`Secure; SameSite=Strict; Path=/`, không `Domain`, **không** `HttpOnly` để web đọc). Web gửi giá trị cookie ở `X-CSRF-Token`; server đối chiếu header với cookie và kiểm tra HMAC theo phiên hiện hành bằng cách so sánh an toàn. Chỉ so hai giá trị client gửi với nhau là chưa đủ. `GET /auth/csrf` chỉ phát lại token sau khi xác minh refresh cookie còn hiệu lực, không tạo phiên mới. Logout/đổi mật khẩu xóa access, refresh và CSRF cookie. `SameSite` không thay thế kiểm tra Origin và CSRF token.

## 5. Xoay vòng và thu hồi

- Refresh khóa dòng token hiện hành trong transaction, kiểm tra hash/hạn/trạng thái user và store, đánh dấu token cũ đã thu hồi, thêm token mới cùng `session_id`, commit rồi mới gửi cookie mới. Hai refresh đồng thời với cùng token: một thành công, request còn lại bị coi là dùng lại token cũ. Client phải gom refresh đồng thời như mục 3.
- Khi **token đã xoay vòng** bị dùng lại, thu hồi toàn bộ dòng thuộc `session_id` đó trong một transaction, xóa cookie, trả `401 UNAUTHENTICATED`; thiết bị đó phải đăng nhập lại. Các thiết bị khác giữ nguyên. Lỗi mạng không làm server bỏ quy tắc dùng lại token cũ.
- Logout thu hồi phiên hiện tại. Gọi lại logout sau khi phiên đã mất hiệu lực vẫn xóa cookie và trả `204`. Đổi/đặt lại mật khẩu thu hồi **mọi phiên**, kể cả phiên đang thao tác, nên phải đăng nhập lại. Khóa tài khoản hoặc tạm khóa store cũng thu hồi mọi phiên liên quan; mở lại không khôi phục phiên cũ.
- Thay đổi mật khẩu, trạng thái user/store và thu hồi phiên liên quan phải commit cùng transaction để không có trạng thái đã khóa mà phiên vẫn hoạt động.

## 6. Cấp tài khoản, mật khẩu và giới hạn tần suất

- `PLATFORM_ADMIN` cấp `OWNER`; `OWNER` cấp `MANAGER`/`CASHIER` trong store của mình. Tạo tài khoản hoặc đặt lại mật khẩu sinh mật khẩu tạm bằng bộ sinh số ngẫu nhiên mật mã, chỉ trả **một lần** cho người cấp có quyền. MVP không có tự đặt lại qua email/SMS. Tài khoản mới hoặc vừa được đặt lại có `must_change_password = true`; riêng tài khoản `PLATFORM_ADMIN` bootstrap được tạo với `false`.
- Mật khẩu mới và tạm dài tối thiểu **12 ký tự**; không bắt buộc đủ các nhóm ký tự. Đổi mật khẩu thông thường cần `currentPassword`. Ở lần đổi bắt buộc ngay sau khi đăng nhập bằng mật khẩu tạm, không yêu cầu nhập lại mật khẩu tạm. Cả hai trường hợp cần access cookie từ phiên hiện hành và thu hồi mọi phiên sau khi thành công.
- `POST /auth/login`: tối đa **5 lần thất bại trong 15 phút trượt theo username đã chuẩn hóa** và **5 lần thất bại trong 15 phút trượt theo IP**. Username không tồn tại chịu cùng giới hạn và lỗi chung. `POST /auth/refresh`: tối đa **30 lần gọi/phút trượt theo IP**. Bộ đếm lưu PostgreSQL. Vượt giới hạn trả `429 TOO_MANY_REQUESTS` kèm `Retry-After`. Chỉ lấy IP client từ kết nối hoặc reverse proxy đáng tin cậy. Chi tiết đã chốt ở [spec auth](../../.devloopflow/specs/auth.md).
- Không ghi mật khẩu, access/refresh token, CSRF secret hoặc header `Cookie`/`Set-Cookie` vào log. Không trả `password_hash` hay `token_hash` qua API.

## 7. Tình huống cần kiểm thử khi triển khai

1. Hai thiết bị cùng đăng nhập; logout một thiết bị chặn access/refresh token của thiết bị đó, thiết bị kia vẫn dùng được.
2. Đổi/đặt lại mật khẩu, khóa user/store chặn access token cũ ngay; mở lại store không phục hồi phiên.
3. Refresh xoay token và gia hạn thêm 7 ngày; dùng lại token cũ thu hồi đúng một phiên.
4. Request hết hạn đồng thời chỉ tạo một refresh; không có hai token hiện hành cho một `session_id`.
5. Thiếu/sai Origin, CSRF header/cookie bị từ chối; tải lại trang khôi phục access token nếu phiên còn hợp lệ.
6. Username khác hoa/thường không tạo được bản ghi trùng; giới hạn login áp dụng cả username không tồn tại.
