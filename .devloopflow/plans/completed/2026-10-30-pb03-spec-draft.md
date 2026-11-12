# PB-03 — Quản trị nền tảng (bản nháp làm lại)

**Trạng thái:** bản nháp lịch sử đã được Product Owner chốt ngày 2026-10-30. Hợp đồng hiện hành đã cập nhật tại specs/platform.md; file này chỉ lưu bản đã trình, không dùng thay spec hiện hành.

## Mục tiêu và phạm vi

API/DB PB-03 và UI PB-13 quản trị nền tảng trong Sprint 2: tạo store cùng OWNER đầu tiên, cấp thêm OWNER, khóa/mở store, reset mật khẩu. UI dùng màn demo hiện có Cửa hàng/Chủ quán. Nhật ký UI, thông tin chi nhánh và kiểm tra HTTP trên API vận hành chuyển sang lát cắt tương ứng; MVP vẫn ghi log backend BR-86.

Căn cứ: docs/PRODUCT_OVERVIEW.md; docs/BUSINESS_RULES.md BR-05/78–86/96/97; docs/api-spec.md; docs/DESIGN_DB_POS_SYSTEM.md; docs/architecture/auth.md; specs/auth.md; DESIGN.md. Mẫu từ .agents/skills/create-pos-spec/assets/spec-template.md.

## Quyết định và điểm cần chốt

Product Owner ngày 2026-10-30 đã chọn cursor/limit/meta, permission theo BR-05 với ranh giới platform/store, storeId chỉ là đối tượng admin quản trị, và phạm vi UI nêu trên. Giữ quyết định trước: temporaryPassword, bootstrap admin must_change_password=false, cookie cũ sau khóa trả 401. Bản nháp dưới cụ thể hóa hợp đồng để Product Owner xem trước triển khai.

## Luồng và hành vi

- Platform có danh tính hiện hành storeId=null; endpoint platform từ chối danh tính thuộc store, kể cả gán nhầm permission platform. Route cần permission hiện hành từ DB. Không dùng tên role để quyết định quyền gọi; role OWNER của tài khoản được tạo/reset là đối tượng nghiệp vụ cần kiểm tra.
- Route vận hành yêu cầu tenant context storeId hiện hành; danh tính platform không có context nên bị từ chối. Test ranh giới dùng route kiểm thử/guard không được mô tả thành kiểm chứng HTTP API vận hành thật chưa có.
- POST users nhận storeId làm target quản trị, không thay tenant context. Client không được gửi role, branchId hay scope tùy ý.
- Trình tự: xác minh phiên/danh tính; mutation kiểm tra Origin/CSRF theo auth; cờ đổi mật khẩu; kiểm tra ranh giới và permission; validation đầu vào rồi thao tác dữ liệu.
- Create store atomic với OWNER; cấp/reset password chỉ trả raw đúng response lần đó, không đọc lại, log hoặc lưu storage. Nếu mất response, không tự gửi lại mutation vì lỗi mạng: reload danh sách rồi reset password khi cần.
- Khóa store giữ dữ liệu, thu hồi mọi phiên; mở lại không phục hồi phiên. Login/refresh và khóa phải có thứ tự lock nhất quán.

## Schema dùng chung

- Store: id UUID, name string, phone/email/address string|null, status ACTIVE|SUSPENDED, suspendedAt datetime UTC|null, suspendedReason string|null, createdAt/updatedAt datetime UTC.
- Owner: id/storeId UUID, username/fullName string, isActive/mustChangePassword boolean, createdAt datetime UTC. OwnerListItem thêm storeName string. Không trả hash/token.
- OwnerInputDto: username 1–50 và fullName 1–150 ký tự sau trim, bắt buộc, không null; username lưu lower(btrim) unique toàn hệ thống. Tạo OWNER isActive=true, branchId=null, mustChangePassword=true.
- CreateStoreDto: name 1–150 sau trim bắt buộc; phone ≤20, email ≤150, address ≤255 là string tùy chọn, không nhận null; chuỗi rỗng sau trim lưu null. owner là object OwnerInputDto bắt buộc. Giới hạn email chỉ độ dài trong hợp đồng hiện có.
- Mật khẩu tạm sinh ngẫu nhiên mật mã ≥12 ký tự, ≤72 byte UTF-8, chỉ lưu bcrypt hash theo auth.
- Query/path/body thừa hoặc sai kiểu/định dạng/ràng buộc trả 422 VALIDATION_ERROR; JSON hỏng hoặc sai Content-Type cho body JSON theo API chung (400 BAD_REQUEST). Không body nghĩa không nhận dữ liệu body.
- Lỗi chung: 401 UNAUTHENTICATED/TOKEN_EXPIRED theo auth; 403 PASSWORD_CHANGE_REQUIRED/PERMISSION_DENIED; mutation 403 CSRF_INVALID; details/requestId theo API chung. Không lặp lại các quy ước auth/cookie ở từng endpoint.

## Phân trang

- Hai GET danh sách trả data là array, meta ở cấp ngoài data: {limit:number,nextCursor:string|null,total:number}.
- limit tùy chọn, mặc định 20, nguyên dương; trên 100 ép về 100. cursor tùy chọn là chuỗi opaque server cấp; sai/rỗng hoặc dùng khác loại danh sách trả 422. Không nhận page/hasMore.
- Thứ tự mặc định và sort duy nhất được hỗ trợ là -createdAt (tie-break id DESC). Field sort khác trả 422 theo API chung. Cursor gắn loại danh sách và cặp createdAt/id; giới hạn kích thước, kiểm tra payload trước truy vấn, không dùng làm quyền hoặc filter tenant.
- total là tổng số bản ghi hiện hành của danh sách, không chỉ phần sau cursor; nextCursor null khi hết. Không cam kết snapshot bất biến giữa hai request có thay đổi DB.

## Endpoint

### GET /api/v1/platform/stores

1. **Mô tả:** Liệt kê cửa hàng để quản trị nền tảng.
2. **Quyền:** store.read; cấp mặc định cho PLATFORM_ADMIN. Phiên phải có ngữ cảnh platform (storeId=null).
3. **Phạm vi:** quản trị store/OWNER toàn nền tảng, không truy vấn dữ liệu vận hành; kiểm tra ID đối tượng tồn tại và đúng loại.
4. **Business rule:** BR-79, BR-81.
5. **Request:** PlatformListQuery: limit/cursor/sort theo phần phân trang; không body. Header/cookie và validation chung theo các mục trên.
6. **Response thành công:** 200 StoreListResponse: {data: Store[], meta: PageMeta}.
7. **Lỗi:** ngoài lỗi chung:

   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 422 | VALIDATION_ERROR | Query hoặc cursor sai |

8. **Ghi chú xử lý:** Đọc danh sách và total; không ghi DB hoặc phát log mutation.
9. **Ví dụ:** GET /api/v1/platform/stores?limit=20 → 200 {"data":[],"meta":{"limit":20,"nextCursor":null,"total":0}}. Các ký hiệu <Store>/<Owner> trong ví dụ đại diện schema ở trên, không phải chuỗi thực tế của response.
10. **Kiểm thử cần có:** Danh sách rỗng; đủ/nhiều trang; hai bản ghi trùng createdAt; chèn bản ghi mới giữa hai trang; cursor lỗi; không lộ secret hoặc dữ liệu vận hành.

### POST /api/v1/platform/stores

1. **Mô tả:** Tạo store ACTIVE và OWNER đầu tiên trong cùng transaction.
2. **Quyền:** store.create; cấp mặc định cho PLATFORM_ADMIN. Phiên phải có ngữ cảnh platform (storeId=null).
3. **Phạm vi:** quản trị store/OWNER toàn nền tảng, không truy vấn dữ liệu vận hành; kiểm tra ID đối tượng tồn tại và đúng loại.
4. **Business rule:** BR-78, BR-79, BR-83, BR-84, BR-85, BR-86, BR-97.
5. **Request:** CreateStoreDto: name bắt buộc; phone/email/address tùy chọn; owner bắt buộc kiểu OwnerInputDto. Không query. Header/cookie và validation chung theo các mục trên.
6. **Response thành công:** 201 CreateStoreResponse: {data:{store:Store,owner:Owner,temporaryPassword:string}}.
7. **Lỗi:** ngoài lỗi chung:

   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 409 | USERNAME_EXISTS | Username đã tồn tại sau chuẩn hóa |
   | 503 | SERVICE_UNAVAILABLE | Vai trò OWNER chưa sẵn sàng |

8. **Ghi chú xử lý:** Tạo store rồi OWNER có role OWNER, branch_id=null, is_active=true; bcrypt hash mật khẩu tạm. Rollback cả hai nếu lỗi. Log store.create và owner.create sau commit.
9. **Ví dụ:** POST {"name":"Quán thử","owner":{"username":"chu_thu","fullName":"Chủ thử"}} → 201 {"data":{"store":"<Store>","owner":"<Owner>","temporaryPassword":"<chỉ trả tại đây>"}}. Các ký hiệu <Store>/<Owner> trong ví dụ đại diện schema ở trên, không phải chuỗi thực tế của response.
10. **Kiểm thử cần có:** DB store/user/hash đúng; rollback nếu tạo OWNER lỗi; trùng username hoa/thường và request đồng thời; field owner.role/storeId thừa bị từ chối.

### POST /api/v1/platform/stores/{id}/suspend

1. **Mô tả:** Tạm khóa store và thu hồi phiên của mọi user thuộc store.
2. **Quyền:** store.suspend; cấp mặc định cho PLATFORM_ADMIN. Phiên phải có ngữ cảnh platform (storeId=null).
3. **Phạm vi:** quản trị store/OWNER toàn nền tảng, không truy vấn dữ liệu vận hành; kiểm tra ID đối tượng tồn tại và đúng loại.
4. **Business rule:** BR-82, BR-86, BR-96.
5. **Request:** id: UUID bắt buộc; SuspendStoreDto {reason:string} bắt buộc 1–255 ký tự sau trim. Không query. Header/cookie và validation chung theo các mục trên.
6. **Response thành công:** 200 StoreResponse: {data:{store:Store}}.
7. **Lỗi:** ngoài lỗi chung:

   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 404 | NOT_FOUND | Store không tồn tại |
   | 409 | STORE_ALREADY_SUSPENDED | Store đã khóa |

8. **Ghi chú xử lý:** Khóa dòng store trong transaction; đặt SUSPENDED, suspended_at, suspended_reason; thu hồi refresh token còn hiệu lực của user thuộc store. Giữ dữ liệu và phiên của store khác. Log store.suspend sau commit. Phiên cũ trả 401 UNAUTHENTICATED; login trả lỗi chung.
9. **Ví dụ:** POST /platform/stores/<uuid>/suspend {"reason":"Tạm ngưng dịch vụ"} → 200 {"data":{"store":"<Store SUSPENDED>"}}. Các ký hiệu <Store>/<Owner> trong ví dụ đại diện schema ở trên, không phải chuỗi thực tế của response.
10. **Kiểm thử cần có:** Reason thiếu/rỗng/quá dài; ID sai/thiếu; request lặp; hai phiên sống; login/refresh cạnh tranh với khóa; store khác không bị ảnh hưởng.

### POST /api/v1/platform/stores/{id}/reactivate

1. **Mô tả:** Mở lại store; người dùng phải đăng nhập mới.
2. **Quyền:** store.suspend; cấp mặc định cho PLATFORM_ADMIN. Phiên phải có ngữ cảnh platform (storeId=null).
3. **Phạm vi:** quản trị store/OWNER toàn nền tảng, không truy vấn dữ liệu vận hành; kiểm tra ID đối tượng tồn tại và đúng loại.
4. **Business rule:** BR-82, BR-86, BR-96.
5. **Request:** id: UUID bắt buộc. Không body/query. Header/cookie và validation chung theo các mục trên.
6. **Response thành công:** 200 StoreResponse: {data:{store:Store}}.
7. **Lỗi:** ngoài lỗi chung:

   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 404 | NOT_FOUND | Store không tồn tại |
   | 409 | STORE_ALREADY_ACTIVE | Store đã hoạt động |

8. **Ghi chú xử lý:** Khóa dòng store trong transaction; đặt ACTIVE, xóa suspended_at/suspended_reason; không phục hồi token. Log store.reactivate sau commit.
9. **Ví dụ:** POST /platform/stores/<uuid>/reactivate → 200 {"data":{"store":"<Store ACTIVE>"}}. Các ký hiệu <Store>/<Owner> trong ví dụ đại diện schema ở trên, không phải chuỗi thực tế của response.
10. **Kiểm thử cần có:** ID sai/thiếu; request lặp; phiên cũ vẫn vô hiệu; login mới thành công; dữ liệu giữ nguyên.

### GET /api/v1/users?role=OWNER

1. **Mô tả:** Liệt kê các OWNER cùng tên store phục vụ quản trị.
2. **Quyền:** user.read_owner; cấp mặc định cho PLATFORM_ADMIN. Phiên phải có ngữ cảnh platform (storeId=null).
3. **Phạm vi:** quản trị store/OWNER toàn nền tảng, không truy vấn dữ liệu vận hành; kiểm tra ID đối tượng tồn tại và đúng loại.
4. **Business rule:** BR-79, BR-81, BR-83.
5. **Request:** OwnerListQuery: role bắt buộc chính xác OWNER; limit/cursor/sort như phân trang. Không body. Header/cookie và validation chung theo các mục trên.
6. **Response thành công:** 200 OwnerListResponse: {data: OwnerListItem[], meta: PageMeta}. OwnerListItem thêm storeName.
7. **Lỗi:** ngoài lỗi chung:

   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 422 | VALIDATION_ERROR | role thiếu/sai, query hoặc cursor sai |

8. **Ghi chú xử lý:** Join role/store và chỉ chọn trường response; total chỉ đếm OWNER. Không đọc hash hoặc dữ liệu vận hành.
9. **Ví dụ:** GET /api/v1/users?role=OWNER&limit=20 → 200 {"data":[],"meta":{"limit":20,"nextCursor":null,"total":0}}. Các ký hiệu <Store>/<Owner> trong ví dụ đại diện schema ở trên, không phải chuỗi thực tế của response.
10. **Kiểm thử cần có:** Không trả user vai trò khác; rỗng/nhiều trang; sort ổn định; không N+1; không lộ mật khẩu.

### POST /api/v1/users

1. **Mô tả:** Cấp thêm OWNER cho store đích do admin quản trị.
2. **Quyền:** user.create_owner; cấp mặc định cho PLATFORM_ADMIN. Phiên phải có ngữ cảnh platform (storeId=null).
3. **Phạm vi:** quản trị store/OWNER toàn nền tảng, không truy vấn dữ liệu vận hành; kiểm tra ID đối tượng tồn tại và đúng loại.
4. **Business rule:** BR-78, BR-79, BR-83, BR-84, BR-86, BR-97.
5. **Request:** CreateOwnerDto {storeId:UUID,username:string,fullName:string}, tất cả bắt buộc. Không query; không nhận role/branchId. Header/cookie và validation chung theo các mục trên.
6. **Response thành công:** 201 CreateOwnerResponse: {data:{owner:Owner,temporaryPassword:string}}.
7. **Lỗi:** ngoài lỗi chung:

   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 404 | NOT_FOUND | Store không tồn tại |
   | 409 | USERNAME_EXISTS | Username đã tồn tại |
   | 503 | SERVICE_UNAVAILABLE | Vai trò OWNER chưa sẵn sàng |

8. **Ghi chú xử lý:** Kiểm tra store đích tồn tại; tạo OWNER, hash mật khẩu, must_change_password=true trong transaction; được cấp khi store SUSPENDED nhưng không cho login. Log owner.create sau commit.
9. **Ví dụ:** POST {"storeId":"<uuid>","username":"chu_bo_sung","fullName":"Chủ bổ sung"} → 201 {"data":{"owner":"<Owner>","temporaryPassword":"<chỉ trả tại đây>"}}. Các ký hiệu <Store>/<Owner> trong ví dụ đại diện schema ở trên, không phải chuỗi thực tế của response.
10. **Kiểm thử cần có:** Hai store gán đúng ID; store thiếu; role/tenant giả; store khóa; user thuộc store gọi route bị cấm dù được gán nhầm permission.

### POST /api/v1/users/{id}/reset-password

1. **Mô tả:** Đặt mật khẩu tạm mới cho OWNER và thu hồi mọi phiên.
2. **Quyền:** user.reset_owner_password; cấp mặc định cho PLATFORM_ADMIN. Phiên phải có ngữ cảnh platform (storeId=null).
3. **Phạm vi:** quản trị store/OWNER toàn nền tảng, không truy vấn dữ liệu vận hành; kiểm tra ID đối tượng tồn tại và đúng loại.
4. **Business rule:** BR-83, BR-84, BR-86.
5. **Request:** id: UUID user bắt buộc; không body/query. Header/cookie và validation chung theo các mục trên.
6. **Response thành công:** 200 ResetOwnerResponse: {data:{owner:Owner,temporaryPassword:string}}.
7. **Lỗi:** ngoài lỗi chung:

   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 404 | NOT_FOUND | User thiếu hoặc không phải OWNER |

8. **Ghi chú xử lý:** Khóa user OWNER; sinh/hash mật khẩu mới, đặt must_change_password=true và thu hồi mọi refresh token cùng transaction. Cho phép khi store khóa; không đổi trạng thái store hoặc user. Log owner.reset_password sau commit. Mỗi request reset hợp lệ sinh mật khẩu mới; không tự retry sau lỗi mạng không rõ kết quả.
9. **Ví dụ:** POST /users/<uuid>/reset-password → 200 {"data":{"owner":"<Owner>","temporaryPassword":"<mật khẩu mới một lần>"}}. Các ký hiệu <Store>/<Owner> trong ví dụ đại diện schema ở trên, không phải chuỗi thực tế của response.
10. **Kiểm thử cần có:** Non-OWNER/UUID sai/thiếu; hash đổi; mật khẩu cũ vô hiệu; nhiều phiên bị thu hồi; store khóa; reset lặp không khôi phục mật khẩu trước.

## UI

- Hai tab Cửa hàng/Chủ quán dùng API thật, phân trang cursor độc lập theo danh sách; chuyển tab hoặc mutation reset cursor về đầu để hiển thị dữ liệu cuối. Chọn store khi cấp OWNER không bị giới hạn âm thầm ở trang đầu: có điều hướng danh sách store để chọn đúng store.
- Loading/empty/error/retry tiếng Việt; thao tác mutation khóa nút khi đang gửi; lỗi reload sau mutation không được báo rằng mutation đã thất bại hoặc làm mất dialog mật khẩu.
- Dialog mật khẩu có checkbox “Tôi đã lưu mật khẩu”; chỉ đóng khi đã xác nhận, kể cả nút X, Escape và backdrop. Đóng xóa password khỏi state. Logout/phiên bị thu hồi xóa UI chứa password. Không lưu vào storage, URL hay console.
- Dialog khóa nêu rõ thu hồi phiên, không login được và giữ dữ liệu; nhập lý do. Reset có xác nhận tác động lên phiên.
- PLATFORM_ADMIN không có branch selector hoặc dữ liệu vận hành. Màn chưa kết nối API có nhãn demo. Tablet ngang 1024×768, thao tác touch theo DESIGN.

## Nghiệm thu và bằng chứng

- Tạo/cấp đúng store, password một lần và bắt buộc đổi; quyền hiện hành/ràng buộc context; khóa/mở với hai phiên sống, login mới, giữ dữ liệu; validation/ID/duplicate/concurrency/rollback/log. Phân trang nhiều trang, tie timestamp, thêm dữ liệu giữa trang và UI chọn đúng store ngoài trang đầu.
- Lập matrix case → expected → artifact trước khi chạy. Runner API PostgreSQL thật, UI test/build; browser trước/sau, method/path/status/response che secret, console, storage, DB before/after và log action.
- Run mới ghi version/dirty/lệnh/giờ bắt đầu-kết thúc/exit và output thực. QA độc lập mở lại từng artifact rồi Product Owner quyết định nghiệm thu. Không dùng bằng chứng lượt cũ cho hành vi thay đổi.
- BR-81: trong phạm vi hiện có chứng minh platform không có tenant/quyền vận hành bằng test guard/route thử; kiểm tra HTTP trên endpoint hóa đơn/ca/kho/doanh thu thật là dependency khi các module đó triển khai. Ghi rõ giới hạn trong sprint, không tuyên bố đã kiểm tra API chưa tồn tại.
