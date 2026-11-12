# PB-04 — Tài khoản nhân viên

**Trạng thái:** đã chốt theo kế hoạch API/DB Product Owner duyệt ngày30/10/2026; đính chính AUD-05 theo yêu cầu fix cùng ngày, không đổi nghiệp vụ. Không gồm UI, chuyển chi nhánh hoặc sửa hồ sơ sau tạo.

## Mục tiêu và phạm vi

OWNER cấp/xem/khóa/mở/đổi MANAGER↔CASHIER/reset tài khoản trong store. Nguồn: BUSINESS_RULES BR-01–07/70/78–85/97, docs/api-spec.md, schema users/roles/refresh_tokens, specs/auth.md và specs/platform.md.

## Quyết định và điểm cần chốt

Role change, khóa và reset thu hồi mọi phiên cùng transaction. Mở khóa không khôi phục phiên; reset được làm khi bị khóa và giữ khóa. Không sửa username/fullName/phone/branch sau tạo. Không còn quyết định nghiệp vụ mở. Không thêm giới hạn hierarchy reset ngoài hợp đồng quyền/target; giới hạn thứ bậc BR-83 áp dụng cấp/đổi role.

## Luồng và hành vi

- user.manage mặc định OWNER. Permission quyết định quyền vào route; target staff chỉ MANAGER/CASHIER cùng store và branch theo actor. Target OWNER/platform/ngoài scope trả404. Cấp staff được ở branch ngưng. Role gán phải thấp hơn actor (OWNER>MANAGER>CASHIER), vi phạm403. Cấm tự khóa/tự hạ quyền BR-06, so ID canonical từ DB kể cả path UUID hoa.
- Staff DTO: id/storeId/branchId UUID; username/fullName/role; isActive/mustChangePassword; createdAt/updatedAt UTC. Không passwordHash/tokenHash/token hoặc cột nội bộ.
- CreateStaff: username string1–50 và fullName string1–150 sau trim, role MANAGER|CASHIER và branchId UUID đều bắt buộc. username chuẩn hóa lower(btrim) bằng PostgreSQL, unique toàn hệ thống. Không nhận storeId/phone/role khác. Tạo isActive=true, mustChangePassword=true.
- PatchStaff: role MANAGER|CASHIER và/hoặc isActive boolean, ít nhất một field, không null. Thay role thật hoặc true→false thu hồi mọi phiên. Cùng giá trị là no-op, giữ phiên. Không tự bỏ cờ đổi password khi đổi role/mở khóa.
- Password tạm sinh randomBytes(18).base64url (24 ký tự, trong12–72byte), bcrypt cost12; chỉ trả trong response thành công của create/reset sau commit. Không đọc lại/log/lưu raw. Reset lặp sinh password mới, password cũ không hợp lệ; không tự replay mutation sau lỗi mạng không rõ kết quả.
- Action staff.create/staff.update/staff.reset_password log actorId/targetId/requestId sau commit, không log password/hash/token. Failure rollback không phát success action. UI/password dialog/storage thuộc PB-13, chưa được coi là hoàn tất từ bằng chứng API.

## Quy ước chung

API chung theo docs/api-spec.md và specs/auth.md: JSON camelCase, UUID, thời điểm ISO8601 UTC, tiền JSON number nguyên an toàn. Access/refresh token không trong JSON/Bearer. Lỗi có error.code/message/details/requestId và X-Request-Id. Guard kiểm danh tính/quyền/tenant hiện hành trước xử lý dữ liệu. ID ngoài store/branch trả404 không tiết lộ tồn tại. Không ép chuỗi sang số/boolean. Body phải là object: malformed/scalar/null400 từ parser; array/field lạ422. Mutation JSON cần Content-Type application/json; PATCH ít nhất một field. Route không body/query mà client gửi thêm trả422; không có DELETE.

Danh sách dùng limit mặc định20, nguyên dương, tối đa100 (lớn hơn ép100); cursor opaque server cấp, sai/rỗng/quá dài trả422. Chỉ hỗ trợ sort=-createdAt (mặc định), tie-break id DESC, giữ microsecond trong cursor. Cursor gắn resource/store/branch/filter; không dùng cursor làm quyền. Meta {limit:number,nextCursor:string|null,total:number}; total là tổng sau filter trước cursor, không hứa snapshot giữa các request có mutation. isActive query là chuỗi 'true'/'false'. Không có page/q/sort khác. Query không khai báo bị từ chối.

GET context store thêm branchId/role MANAGER|CASHIER; bỏ role là cả hai, không trả OWNER. OWNER branchId optional, ngoài store404; actor bị giới hạn branch bỏ qua branchId client. PATCH/reset lấy branch từ target, không nhận branchId.

## Hợp đồng dùng chung với platform

Chỉ GET/POST /users và POST /users/{id}/reset-password chọn schema/permission theo storeId hiện hành sau xác thực. Platform giữ user.read_owner/user.create_owner/user.reset_owner_password và request/response trong specs/platform.md; không lấy context từ payload. Context store dùng user.manage, không nhận storeId hoặc role OWNER. Không đăng ký hai handler cùng method/path. **PATCH /users/{id} chỉ có hợp đồng context store; PLATFORM_ADMIN bị guard từ chối, không có platform PATCH.** GET platform bắt buộc role=OWNER và không nhận filter staff isActive/branchId. Các endpoint dưới mô tả nhánh context store; nhánh platform tham chiếu spec platform.

## Endpoint

### GET /api/v1/users

1. **Mô tả:** Liệt kê nhân viên cùng scope.
2. **Quyền:** user.manage cho context store; nhánh platform GET theo specs/platform.md.
3. **Phạm vi:** store hiện hành; kiểm mọi ID và branch theo quyền hiện hành; target list chỉ MANAGER/CASHIER.
4. **Business rule:** BR-01/05/70/71/80.
5. **Request:** Không body; query limit/cursor/sort/isActive/role/branchId.
6. **Response thành công:** 200 {data:Staff[],meta:PageMeta}.
7. **Lỗi:** ngoài hợp đồng auth chung, các điều kiện liên quan endpoint:

| HTTP | Mã lỗi | Điều kiện |
| --- | --- | --- |
| 401 | UNAUTHENTICATED / TOKEN_EXPIRED | Thiếu/sai/hết hạn access cookie hoặc phiên đã thu hồi. |
| 403 | Theo auth / PERMISSION_DENIED | Cờ đổi mật khẩu, user/store khóa hoặc sai permission/context; mutation thêm kiểm tra Origin/CSRF. |
| 400 | BAD_REQUEST | JSON không đọc được nếu client gửi body không hợp lệ tới HTTP parser. |
| 404 | NOT_FOUND | branchId filter không thuộc scope/tồn tại. |
| 422 | VALIDATION_ERROR | Query/cursor/filter/role hoặc body thừa không hợp lệ |

8. **Ghi chú xử lý:** Join Role, chỉ chọn cột Staff DTO, không N+1; count sau filter trước cursor.
9. **Ví dụ:** dữ liệu minh họa giả, không phải log thực thi; giả định các ID tham chiếu thuộc đúng context và đã tồn tại. Cookie/Origin/CSRF theo hợp đồng chung.

Request:

```http
GET /api/v1/users
```

Response (200):

```json
{
  "data": [
    {
      "id": "40000000-0000-4000-8000-000000000001",
      "storeId": "20000000-0000-4000-8000-000000000001",
      "branchId": "10000000-0000-4000-8000-000000000001",
      "username": "cashier_example",
      "fullName": "Thu ngân mẫu",
      "role": "CASHIER",
      "isActive": true,
      "mustChangePassword": true,
      "createdAt": "2026-10-30T00:00:00.000Z",
      "updatedAt": "2026-10-30T00:00:00.000Z"
    }
  ],
  "meta": {
    "limit": 20,
    "nextCursor": null,
    "total": 1
  }
}
```

10. **Kiểm thử cần có:** exact IDs/safe DTO cho own/crossbranch/crossstore, role/filter/empty, all pages/microsecond/endcursor/query counts, auth blocked.

### POST /api/v1/users

1. **Mô tả:** Cấp tài khoản nhân viên.
2. **Quyền:** user.manage cho context store; nhánh platform POST theo specs/platform.md.
3. **Phạm vi:** store hiện hành; kiểm mọi ID và branch theo quyền hiện hành.
4. **Business rule:** BR-01/05/70/83/84/97.
5. **Request:** CreateStaff; không query.
6. **Response thành công:** 201 {data:{user:Staff,temporaryPassword:string}}.
7. **Lỗi:** ngoài hợp đồng auth chung, các điều kiện liên quan endpoint:

| HTTP | Mã lỗi | Điều kiện |
| --- | --- | --- |
| 401 | UNAUTHENTICATED / TOKEN_EXPIRED | Thiếu/sai/hết hạn access cookie hoặc phiên đã thu hồi. |
| 403 | Theo auth / PERMISSION_DENIED | Cờ đổi mật khẩu, user/store khóa hoặc sai permission/context; mutation thêm kiểm tra Origin/CSRF. |
| 400 | BAD_REQUEST | JSON hỏng/scalar/null hoặc Content-Type không phải application/json. |
| 404 | NOT_FOUND | Branch không tồn tại hoặc ngoài scope. |
| 409 | USERNAME_EXISTS | Username đã tồn tại sau chuẩn hóa trên toàn hệ thống. |
| 503 | SERVICE_UNAVAILABLE | Role cần cấp chưa được seed. |
| 422 | VALIDATION_ERROR | Query/field/kiểu/ràng buộc không hợp lệ. |

8. **Ghi chú xử lý:** Kiểm hierarchy sau guard; khóa đọc Branch; tạo hash/user trong transaction; commit rồi log/return password đúng một lần.
9. **Ví dụ:** dữ liệu minh họa giả, không phải log thực thi; giả định các ID tham chiếu thuộc đúng context và đã tồn tại. Cookie/Origin/CSRF theo hợp đồng chung.

Request:

```http
POST /api/v1/users
Content-Type: application/json

{"branchId":"10000000-0000-4000-8000-000000000001","username":"cashier_example","fullName":"Thu ngân mẫu","role":"CASHIER"}
```

Response (201):

```json
{
  "data": {
    "user": {
      "id": "40000000-0000-4000-8000-000000000001",
      "storeId": "20000000-0000-4000-8000-000000000001",
      "branchId": "10000000-0000-4000-8000-000000000001",
      "username": "cashier_example",
      "fullName": "Thu ngân mẫu",
      "role": "CASHIER",
      "isActive": true,
      "mustChangePassword": true,
      "createdAt": "2026-10-30T00:00:00.000Z",
      "updatedAt": "2026-10-30T00:00:00.000Z"
    },
    "temporaryPassword": "<mat-khau-tam-server-sinh>"
  }
}
```

10. **Kiểm thử cần có:** required/trim/type/bounds, roles/scope, concurrent/global duplicate, cost/hash/no raw, first-password gate, rollback/no success log, log only after commit.

### PATCH /api/v1/users/{id}

1. **Mô tả:** Đổi role hoặc trạng thái nhân viên.
2. **Quyền:** user.manage, chỉ context store; mặc định OWNER; PLATFORM_ADMIN bị từ chối.
3. **Phạm vi:** store hiện hành; kiểm mọi ID và branch theo quyền hiện hành; target staff.
4. **Business rule:** BR-02/03/05/06/07/70/83.
5. **Request:** id UUID; PatchStaff; không query; không sửa hồ sơ/branch/username.
6. **Response thành công:** 200 {data:Staff}.
7. **Lỗi:** ngoài hợp đồng auth chung, các điều kiện liên quan endpoint:

| HTTP | Mã lỗi | Điều kiện |
| --- | --- | --- |
| 401 | UNAUTHENTICATED / TOKEN_EXPIRED | Thiếu/sai/hết hạn access cookie hoặc phiên đã thu hồi. |
| 403 | Theo auth / PERMISSION_DENIED | Cờ đổi mật khẩu, user/store khóa hoặc sai permission/context; mutation thêm kiểm tra Origin/CSRF. |
| 400 | BAD_REQUEST | JSON hỏng/scalar/null hoặc Content-Type không phải application/json. |
| 404 | NOT_FOUND | Target không phải staff hoặc ngoài scope/không tồn tại. |
| 503 | SERVICE_UNAVAILABLE | Role mới cần gán chưa được seed. |
| 422 | VALIDATION_ERROR | Query/field/kiểu/ràng buộc không hợp lệ; PATCH rỗng nếu là PATCH |

8. **Ghi chú xử lý:** Khóa user cùng thứ tự với auth, áp field gửi; thu hồi phiên cùng transaction khi role đổi hoặc khóa; no-op giữ phiên; commit rồi log.
9. **Ví dụ:** dữ liệu minh họa giả, không phải log thực thi; giả định các ID tham chiếu thuộc đúng context và đã tồn tại. Cookie/Origin/CSRF theo hợp đồng chung.

Request:

```http
PATCH /api/v1/users/40000000-0000-4000-8000-000000000001
Content-Type: application/json

{"isActive":false}
```

Response (200):

```json
{
  "data": {
    "id": "40000000-0000-4000-8000-000000000001",
    "storeId": "20000000-0000-4000-8000-000000000001",
    "branchId": "10000000-0000-4000-8000-000000000001",
    "username": "cashier_example",
    "fullName": "Thu ngân mẫu",
    "role": "CASHIER",
    "isActive": false,
    "mustChangePassword": true,
    "createdAt": "2026-10-30T00:00:00.000Z",
    "updatedAt": "2026-10-30T00:01:00.000Z"
  }
}
```

10. **Kiểm thử cần có:** self/uppercase/hierarchy, DTO field restrictions, same-store crossbranch, two devices/noop/lock/unlock, rollback, both lock orders với login/refresh và log commit boundary.

### POST /api/v1/users/{id}/reset-password

1. **Mô tả:** Cấp password tạm mới cho nhân viên.
2. **Quyền:** user.manage cho context store; platform reset OWNER theo specs/platform.md.
3. **Phạm vi:** store hiện hành; kiểm mọi ID và branch theo quyền hiện hành; target staff.
4. **Business rule:** BR-01/03/05/70/84.
5. **Request:** id UUID; không body/query, không gửi Content-Type/body cho hành động rỗng.
6. **Response thành công:** 200 {data:{user:Staff,temporaryPassword:string}}.
7. **Lỗi:** ngoài hợp đồng auth chung, các điều kiện liên quan endpoint:

| HTTP | Mã lỗi | Điều kiện |
| --- | --- | --- |
| 401 | UNAUTHENTICATED / TOKEN_EXPIRED | Thiếu/sai/hết hạn access cookie hoặc phiên đã thu hồi. |
| 403 | Theo auth / PERMISSION_DENIED | Cờ đổi mật khẩu, user/store khóa hoặc sai permission/context; mutation thêm kiểm tra Origin/CSRF. |
| 400 | BAD_REQUEST | JSON không đọc được nếu client gửi body không hợp lệ tới HTTP parser. |
| 404 | NOT_FOUND | Target thiếu/không phải staff/ngoài scope. |
| 422 | VALIDATION_ERROR | ID sai định dạng, body hoặc query thừa |

8. **Ghi chú xử lý:** Khóa user; lưu hash/flag và revoke mọi phiên trong transaction; giữ isActive. Reset hợp lệ mỗi lần sinh password mới. Commit rồi log; không replay tự động.
9. **Ví dụ:** dữ liệu minh họa giả, không phải log thực thi; giả định các ID tham chiếu thuộc đúng context và đã tồn tại. Cookie/Origin/CSRF theo hợp đồng chung.

Request:

```http
POST /api/v1/users/40000000-0000-4000-8000-000000000001/reset-password
```

Response (200):

```json
{
  "data": {
    "user": {
      "id": "40000000-0000-4000-8000-000000000001",
      "storeId": "20000000-0000-4000-8000-000000000001",
      "branchId": "10000000-0000-4000-8000-000000000001",
      "username": "cashier_example",
      "fullName": "Thu ngân mẫu",
      "role": "CASHIER",
      "isActive": true,
      "mustChangePassword": true,
      "createdAt": "2026-10-30T00:00:00.000Z",
      "updatedAt": "2026-10-30T00:00:00.000Z"
    },
    "temporaryPassword": "<mat-khau-tam-server-sinh>"
  }
}
```

10. **Kiểm thử cần có:** active>=2 devices: old access/refresh/login invalid, new login forced-change, locked target remains locked, repeats, rollback hash/flags/sessions, reset↔login/refresh both lock schedules, safe log after commit.

## Nghiệm thu và bằng chứng

Đối chiếu từng vế spec với fixture/assertion và raw artifact của bản source/runtime cuối, không dùng21/21 TAP nodes hoặc kết luận code review thay toàn bộ bằng chứng. Ma trận gap-fix phải có HTTP request/response đã che, DB before/after, log app an toàn/sau commit, deterministic locks và manifests theo AGENTS. Chỉ ghi hoàn tất phần kiểm chứng sau khi QA mở lại artifact; Product Owner quyết định nghiệm thu riêng. UI PB-13 và production ngoài scope.
