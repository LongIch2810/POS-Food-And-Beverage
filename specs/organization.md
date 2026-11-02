# PB-04 — Chi nhánh và bàn

**Trạng thái:** đã chốt theo kế hoạch API/DB Product Owner duyệt ngày30/10/2026; đính chính AUD-05 theo yêu cầu fix cùng ngày, không đổi quyết định nghiệp vụ. Đây là hợp đồng, không phải tuyên bố đã nghiệm thu.

## Mục tiêu và phạm vi

OWNER cấu hình chi nhánh, quỹ ban đầu và bàn; MANAGER quản lý bàn trong chi nhánh mình. Không UI PB-13, không ca/hóa đơn hoặc trạng thái bàn từ mock. Nguồn: PRODUCT_OVERVIEW; BUSINESS_RULES BR-05/10/55/70/71/71b/76/95/99/103; DESIGN_DB_POS_SYSTEM; api-spec; specs/auth.

## Quyết định và điểm cần chốt

Mã chi nhánh cố định sau tạo. Mã/tên trim đầu/cuối, unique phân biệt hoa/thường. Chi nhánh ngưng vẫn cấu hình bàn/cấp nhân viên. Quỹ chỉ sửa trước ca CASHIER đầu; PB-06 phải kiểm lịch sử ca dưới cùng khóa Branch với mở ca, trước khi bật API mở ca. PB-04 chưa có bảng/API ca, không thêm cờ/bảng ca giả; vế sau ca chưa tính vào nghiệm thu PB-04. Không còn quyết định nghiệp vụ mở trong phạm vi.

## Luồng và hành vi

- branch.read: mặc định OWNER và MANAGER; branch.manage và branch.access_all: mặc định OWNER; table.manage: OWNER/MANAGER. Permission quyết định quyền vào route, tenant/context và branch hiện hành tiếp tục giới hạn tài nguyên. PLATFORM_ADMIN không có context vận hành, CASHIER không có quyền quản trị tổ chức mặc định.
- Branch DTO: id/storeId/code/name/address/phone/initialCash/isActive/createdAt/updatedAt. initialCash là số nguyên VND0..1000000000000 (DB bigint). Không trả entity hoặc cột nội bộ.
- BranchCreate: code string2–10 và name string1–150 sau trim bắt buộc; address string≤255|null, phone string≤20|null tùy chọn; chuỗi rỗng lưu null; initialCash optional mặc định0. isActive mặc địnhtrue, không nhận ở create.
- BranchPatch: name/address/phone/initialCash/isActive tùy chọn, ít nhất một field. Không nhận code/storeId. Field không gửi giữ nguyên; null chỉ xóa address/phone. isActive boolean không null.
- DiningTable DTO: id/branchId/name/area/capacity/isActive/createdAt/updatedAt; không có status/occupied. Trạng thái phục vụ sẽ suy từ invoice OPEN khi PB-07 triển khai.
- TableCreate: name string1–50 sau trim bắt buộc; area string≤50|null optional, rỗng lưu null; capacity integer1..2147483647|null optional (mặc địnhnull). OWNER có branch.access_all bắt buộc branchId body; người bị giới hạn branch không gửi branchId, dùng branch hiện hành. isActive mặc địnhtrue.
- TablePatch: name/area/capacity/isActive tùy chọn, ít nhất một field. Không branchId; không chuyển bàn. Omitted giữ nguyên, null chỉ xóa area/capacity.

## Quy ước chung

API chung theo docs/api-spec.md và specs/auth.md: JSON camelCase, UUID, thời điểm ISO8601 UTC, tiền JSON number nguyên an toàn. Access/refresh token không trong JSON/Bearer. Lỗi có error.code/message/details/requestId và X-Request-Id. Guard kiểm danh tính/quyền/tenant hiện hành trước xử lý dữ liệu. ID ngoài store/branch trả404 không tiết lộ tồn tại. Không ép chuỗi sang số/boolean. Body phải là object: malformed/scalar/null400 từ parser; array/field lạ422. Mutation JSON cần Content-Type application/json; PATCH ít nhất một field. Route không body/query mà client gửi thêm trả422; không có DELETE.

Danh sách dùng limit mặc định20, nguyên dương, tối đa100 (lớn hơn ép100); cursor opaque server cấp, sai/rỗng/quá dài trả422. Chỉ hỗ trợ sort=-createdAt (mặc định), tie-break id DESC, giữ microsecond trong cursor. Cursor gắn resource/store/branch/filter; không dùng cursor làm quyền. Meta {limit:number,nextCursor:string|null,total:number}; total là tổng sau filter trước cursor, không hứa snapshot giữa các request có mutation. isActive query là chuỗi 'true'/'false'. Không có page/q/sort khác. Query không khai báo bị từ chối.

GET branches chỉ có limit/cursor/sort/isActive. GET tables thêm branchId optional cho OWNER (không gửi là toàn store); actor không có branch.access_all bỏ qua branchId query và dùng branch hiện hành. Các route theo id lấy branch từ bản ghi, không nhận branchId để di chuyển.

## Endpoint

### GET /api/v1/branches

1. **Mô tả:** Liệt kê chi nhánh.
2. **Quyền:** branch.read; OWNER/MANAGER mặc định.
3. **Phạm vi:** OWNER toàn store, MANAGER chỉ branch hiện hành.
4. **Business rule:** BR-05/70/71/71b.
5. **Request:** Không body; query limit/cursor/sort/isActive theo phần chung.
6. **Response thành công:** 200 {data:Branch[],meta:PageMeta}.
7. **Lỗi:** ngoài hợp đồng auth chung, các điều kiện liên quan endpoint:

| HTTP | Mã lỗi | Điều kiện |
| --- | --- | --- |
| 401 | UNAUTHENTICATED / TOKEN_EXPIRED | Thiếu/sai/hết hạn access cookie hoặc phiên đã thu hồi. |
| 403 | Theo auth / PERMISSION_DENIED | Cờ đổi mật khẩu, user/store khóa hoặc sai permission/context; mutation thêm kiểm tra Origin/CSRF. |
| 400 | BAD_REQUEST | JSON không đọc được nếu client gửi body không hợp lệ tới HTTP parser. |
| 422 | VALIDATION_ERROR | Query, cursor, filter hoặc body thừa không hợp lệ |

8. **Ghi chú xử lý:** Chỉ đọc và chọn cột public; total theo tenant/filter.
9. **Ví dụ:** dữ liệu minh họa giả, không phải log thực thi; giả định các ID tham chiếu thuộc đúng context và đã tồn tại. Cookie/Origin/CSRF theo hợp đồng chung.

Request:

```http
GET /api/v1/branches
```

Response (200):

```json
{
  "data": [
    {
      "id": "10000000-0000-4000-8000-000000000001",
      "storeId": "20000000-0000-4000-8000-000000000001",
      "code": "A1",
      "name": "Chi nhánh A1",
      "address": null,
      "phone": null,
      "initialCash": 0,
      "isActive": true,
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

10. **Kiểm thử cần có:** đúng ID set cho OWNER/MANAGER; thiếu permission; user/store khóa; empty/filter; nhiều trang/tie/microsecond.

### POST /api/v1/branches

1. **Mô tả:** Tạo chi nhánh active.
2. **Quyền:** branch.manage; OWNER mặc định.
3. **Phạm vi:** store hiện hành; kiểm mọi ID và branch theo quyền hiện hành.
4. **Business rule:** BR-05/55/76/103.
5. **Request:** BranchCreate; không query.
6. **Response thành công:** 201 {data:Branch}.
7. **Lỗi:** ngoài hợp đồng auth chung, các điều kiện liên quan endpoint:

| HTTP | Mã lỗi | Điều kiện |
| --- | --- | --- |
| 401 | UNAUTHENTICATED / TOKEN_EXPIRED | Thiếu/sai/hết hạn access cookie hoặc phiên đã thu hồi. |
| 403 | Theo auth / PERMISSION_DENIED | Cờ đổi mật khẩu, user/store khóa hoặc sai permission/context; mutation thêm kiểm tra Origin/CSRF. |
| 400 | BAD_REQUEST | JSON hỏng/scalar/null hoặc Content-Type không phải application/json. |
| 409 | CONFLICT | Trùng code hoặc name trong cùng store. |
| 422 | VALIDATION_ERROR | Query/field/kiểu/ràng buộc không hợp lệ. |

8. **Ghi chú xử lý:** Lấy storeId từ actor; unique ở DB, không check-then-write; chỉ thành công mới có dữ liệu mới.
9. **Ví dụ:** dữ liệu minh họa giả, không phải log thực thi; giả định các ID tham chiếu thuộc đúng context và đã tồn tại. Cookie/Origin/CSRF theo hợp đồng chung.

Request:

```http
POST /api/v1/branches
Content-Type: application/json

{"code":"A1","name":"Chi nhánh A1","initialCash":0}
```

Response (201):

```json
{
  "data": {
    "id": "10000000-0000-4000-8000-000000000001",
    "storeId": "20000000-0000-4000-8000-000000000001",
    "code": "A1",
    "name": "Chi nhánh A1",
    "address": null,
    "phone": null,
    "initialCash": 0,
    "isActive": true,
    "createdAt": "2026-10-30T00:00:00.000Z",
    "updatedAt": "2026-10-30T00:00:00.000Z"
  }
}
```

10. **Kiểm thử cần có:** default0/active, trim, string bounds/null, tiền biên/no coercion, separate code/name collision, khác tenant/case-sensitive, concurrent create và DB count.

### PATCH /api/v1/branches/{id}

1. **Mô tả:** Sửa thông tin hoặc trạng thái chi nhánh.
2. **Quyền:** branch.manage; OWNER mặc định.
3. **Phạm vi:** store hiện hành; kiểm mọi ID và branch theo quyền hiện hành.
4. **Business rule:** BR-05/10/55/76/103.
5. **Request:** id UUID; BranchPatch; không query; code/storeId không nhận.
6. **Response thành công:** 200 {data:Branch}.
7. **Lỗi:** ngoài hợp đồng auth chung, các điều kiện liên quan endpoint:

| HTTP | Mã lỗi | Điều kiện |
| --- | --- | --- |
| 401 | UNAUTHENTICATED / TOKEN_EXPIRED | Thiếu/sai/hết hạn access cookie hoặc phiên đã thu hồi. |
| 403 | Theo auth / PERMISSION_DENIED | Cờ đổi mật khẩu, user/store khóa hoặc sai permission/context; mutation thêm kiểm tra Origin/CSRF. |
| 400 | BAD_REQUEST | JSON hỏng/scalar/null hoặc Content-Type không phải application/json. |
| 404 | NOT_FOUND | ID thiếu hoặc ngoài phạm vi. |
| 409 | CONFLICT | Tên mới trùng chi nhánh khác trong store. |
| 422 | VALIDATION_ERROR | Query/field/kiểu/ràng buộc không hợp lệ; PATCH rỗng nếu là PATCH |

8. **Ghi chú xử lý:** Khóa dòng Branch trong transaction, chỉ gán field được gửi; conflict rollback toàn patch. Ngưng dùng giữ dữ liệu/child. PB-06 thêm kiểm tra quỹ trước ca.
9. **Ví dụ:** dữ liệu minh họa giả, không phải log thực thi; giả định các ID tham chiếu thuộc đúng context và đã tồn tại. Cookie/Origin/CSRF theo hợp đồng chung.

Request:

```http
PATCH /api/v1/branches/10000000-0000-4000-8000-000000000001
Content-Type: application/json

{"phone":null,"address":"Địa chỉ mẫu"}
```

Response (200):

```json
{
  "data": {
    "id": "10000000-0000-4000-8000-000000000001",
    "storeId": "20000000-0000-4000-8000-000000000001",
    "code": "A1",
    "name": "Chi nhánh A1",
    "address": "Địa chỉ mẫu",
    "phone": null,
    "initialCash": 0,
    "isActive": true,
    "createdAt": "2026-10-30T00:00:00.000Z",
    "updatedAt": "2026-10-30T00:01:00.000Z"
  }
}
```

10. **Kiểm thử cần có:** immutable code, PATCH empty/type/null/bounds, conflict rollback, disjoint concurrent patch, ngưng/mở lại và retention.

### GET /api/v1/dining-tables

1. **Mô tả:** Liệt kê bàn trong phạm vi.
2. **Quyền:** table.manage; OWNER/MANAGER mặc định.
3. **Phạm vi:** store hiện hành; kiểm mọi ID và branch theo quyền hiện hành.
4. **Business rule:** BR-05/70/71/71b/99.
5. **Request:** Không body; query limit/cursor/sort/isActive/branchId.
6. **Response thành công:** 200 {data:DiningTable[],meta:PageMeta}.
7. **Lỗi:** ngoài hợp đồng auth chung, các điều kiện liên quan endpoint:

| HTTP | Mã lỗi | Điều kiện |
| --- | --- | --- |
| 401 | UNAUTHENTICATED / TOKEN_EXPIRED | Thiếu/sai/hết hạn access cookie hoặc phiên đã thu hồi. |
| 403 | Theo auth / PERMISSION_DENIED | Cờ đổi mật khẩu, user/store khóa hoặc sai permission/context; mutation thêm kiểm tra Origin/CSRF. |
| 400 | BAD_REQUEST | JSON không đọc được nếu client gửi body không hợp lệ tới HTTP parser. |
| 404 | NOT_FOUND | branchId dùng để lọc không tồn tại/ngoài store hoặc branch actor không hợp lệ. |
| 422 | VALIDATION_ERROR | Query, cursor, filter hoặc body thừa sai |

8. **Ghi chú xử lý:** Join Branch để lọc tenant; branchId client bị bỏ qua cho actor bị giới hạn branch; không query occupancy/mock.
9. **Ví dụ:** dữ liệu minh họa giả, không phải log thực thi; giả định các ID tham chiếu thuộc đúng context và đã tồn tại. Cookie/Origin/CSRF theo hợp đồng chung.

Request:

```http
GET /api/v1/dining-tables?branchId=10000000-0000-4000-8000-000000000001
```

Response (200):

```json
{
  "data": [
    {
      "id": "30000000-0000-4000-8000-000000000001",
      "branchId": "10000000-0000-4000-8000-000000000001",
      "name": "Bàn 1",
      "area": null,
      "capacity": null,
      "isActive": true,
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

10. **Kiểm thử cần có:** same-store khác branch và store khác; OWNER all/filter; MANAGER ignored branch query; microsecond/full page/empty/filter/query count.

### POST /api/v1/dining-tables

1. **Mô tả:** Tạo bàn.
2. **Quyền:** table.manage; OWNER/MANAGER mặc định.
3. **Phạm vi:** store hiện hành; kiểm mọi ID và branch theo quyền hiện hành.
4. **Business rule:** BR-05/70/71b/76/99.
5. **Request:** TableCreate; không query; branchId có điều kiện như phần hành vi.
6. **Response thành công:** 201 {data:DiningTable}.
7. **Lỗi:** ngoài hợp đồng auth chung, các điều kiện liên quan endpoint:

| HTTP | Mã lỗi | Điều kiện |
| --- | --- | --- |
| 401 | UNAUTHENTICATED / TOKEN_EXPIRED | Thiếu/sai/hết hạn access cookie hoặc phiên đã thu hồi. |
| 403 | Theo auth / PERMISSION_DENIED | Cờ đổi mật khẩu, user/store khóa hoặc sai permission/context; mutation thêm kiểm tra Origin/CSRF. |
| 400 | BAD_REQUEST | JSON hỏng/scalar/null hoặc Content-Type không phải application/json. |
| 404 | NOT_FOUND | Branch không tồn tại hoặc ngoài scope. |
| 409 | CONFLICT | Tên bàn trùng trong branch. |
| 422 | VALIDATION_ERROR | Query/field/kiểu/ràng buộc không hợp lệ; OWNER thiếu branchId hoặc MANAGER gửi branchId. |

8. **Ghi chú xử lý:** Khóa đọc Branch để kiểm scope rồi ghi bàn trong transaction; cho cấu hình branch ngưng; unique DB bảo vệ concurrent.
9. **Ví dụ:** dữ liệu minh họa giả, không phải log thực thi; giả định các ID tham chiếu thuộc đúng context và đã tồn tại. Cookie/Origin/CSRF theo hợp đồng chung.

Request:

```http
POST /api/v1/dining-tables
Content-Type: application/json

{"branchId":"10000000-0000-4000-8000-000000000001","name":"Bàn 1","capacity":null}
```

Response (201):

```json
{
  "data": {
    "id": "30000000-0000-4000-8000-000000000001",
    "branchId": "10000000-0000-4000-8000-000000000001",
    "name": "Bàn 1",
    "area": null,
    "capacity": null,
    "isActive": true,
    "createdAt": "2026-10-30T00:00:00.000Z",
    "updatedAt": "2026-10-30T00:00:00.000Z"
  }
}
```

10. **Kiểm thử cần có:** conditional branchId, cùng-store khác branch/cross-store, defaults/name trim/null/bounds, unique/count/transaction, branch inactive.

### PATCH /api/v1/dining-tables/{id}

1. **Mô tả:** Sửa thông tin hoặc ngưng/mở dùng lại bàn.
2. **Quyền:** table.manage; OWNER/MANAGER mặc định.
3. **Phạm vi:** tenant/branch của chính bản ghi, không chuyển branch.
4. **Business rule:** BR-05/10/70/71/95/99.
5. **Request:** id UUID; TablePatch; không query/branchId.
6. **Response thành công:** 200 {data:DiningTable}.
7. **Lỗi:** ngoài hợp đồng auth chung, các điều kiện liên quan endpoint:

| HTTP | Mã lỗi | Điều kiện |
| --- | --- | --- |
| 401 | UNAUTHENTICATED / TOKEN_EXPIRED | Thiếu/sai/hết hạn access cookie hoặc phiên đã thu hồi. |
| 403 | Theo auth / PERMISSION_DENIED | Cờ đổi mật khẩu, user/store khóa hoặc sai permission/context; mutation thêm kiểm tra Origin/CSRF. |
| 400 | BAD_REQUEST | JSON hỏng/scalar/null hoặc Content-Type không phải application/json. |
| 404 | NOT_FOUND | Bàn thiếu hoặc ngoài scope. |
| 409 | CONFLICT | Tên mới trùng bàn khác trong branch. |
| 422 | VALIDATION_ERROR | Query/field/kiểu/ràng buộc không hợp lệ; PATCH rỗng nếu là PATCH |

8. **Ghi chú xử lý:** Khóa bàn sau join scope; cập nhật field tường minh trong transaction; rollback khi conflict; không xóa lịch sử.
9. **Ví dụ:** dữ liệu minh họa giả, không phải log thực thi; giả định các ID tham chiếu thuộc đúng context và đã tồn tại. Cookie/Origin/CSRF theo hợp đồng chung.

Request:

```http
PATCH /api/v1/dining-tables/30000000-0000-4000-8000-000000000001
Content-Type: application/json

{"isActive":false}
```

Response (200):

```json
{
  "data": {
    "id": "30000000-0000-4000-8000-000000000001",
    "branchId": "10000000-0000-4000-8000-000000000001",
    "name": "Bàn 1",
    "area": null,
    "capacity": null,
    "isActive": false,
    "createdAt": "2026-10-30T00:00:00.000Z",
    "updatedAt": "2026-10-30T00:01:00.000Z"
  }
}
```

10. **Kiểm thử cần có:** own/same-store crossbranch/crossstore IDs; null clearing/omitted, no branch move, conflict rollback, active toggle/retention.

## Nghiệm thu và bằng chứng

Ma trận AUD-01..05 tại qa-evidence/20261030-200921-9ce75dd-pb04-evidence-audit/audit.md là danh sách đối chứng, không phải runner output. Bản kiểm tra bổ sung ở run gap-fix riêng; chỉ ghi đạt sau khi có artifact cuối và QA mở lại. Lưu HTTP/DB before-after/log an toàn, source/runtime manifests và lệnh/exit theo AGENTS. Không dùng UI mock hoặc số TAP node thay toàn bộ tiêu chí. UI/PB-06/production ngoài scope API/DB hiện tại.
