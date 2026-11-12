# PB-04 API/DB — local do agent chạy

- Base/full HEAD SHA: `9ce75dd12fa06b0d2afd9b1a04d1773d81cbcd18`; branch `feat/pb04-organization-api`; working tree dirty (source/spec/test của task chưa commit, tài liệu Sprint 3 có sẵn). Không mô tả HEAD này là đã chứa code PB-04; source/runtime cuối được nhận diện bằng manifest SHA256.
- Môi trường: Windows PowerShell, Node v22.22.2, PostgreSQL17 Docker local; không ghi giá trị .env/secret.
- Đây là log thực thi local, không phải CI độc lập. Chưa nghiệm thu Product Owner.

## Đối chiếu trước khi chạy

| Tiêu chí | Tình huống | Artifact dự kiến |
| --- | --- | --- |
| Migration/schema và seed | MIG-01, ORG-02/04; CLI DB trống/lặp | final-approved.log; migration-cli.log; migration-check.cjs |
| Chi nhánh và tiền | ORG-01 | red.log (404→201 trước triển khai), final-approved.log (HTTP và DB before/after đo thực tế) |
| Bàn và phạm vi | ORG-02/ORG-03 | final-approved.log: HTTP metadata/requestId, schema columns, tenant/branch asserts |
| Cấp và đổi mật khẩu | USR-01 | final-approved.log: HTTP201/403/204/401, hash-match boolean; không password/hash/token |
| Thu hồi phiên, role/status/reset | USR-02 | final-approved.log: count phiên DB trước/sau, hai thiết bị, reset giữ khóa, mở lại không hồi phiên |
| Atomic rollback | USR-03 | final-approved.log: DB before/after, kiểm tra hash equality boolean, HTTP500 khi trigger test gây lỗi |
| Cursor và validation | ORG-04, ORG-PAGE | final-approved.log; source test có kiểm tra microsecond, context/filter và nhiều trang |
| Thứ bậc và tự khóa/hạ quyền | USR-HIER | review-red.log, uuid-red.log (trước sửa); final-approved.log (UUID thường/hoa) |
| Race với phiên | USR-04 | final-approved.log: refresh/role-change, login/disable, DB không còn phiên sống |
| Content-Type | ORG-05 | content-type-red.log/review-red.log trước sửa; final-approved.log có6 HTTP400 BAD_REQUEST |
| OpenAPI | DOC-01 | openapi-red-4.log trước sửa; openapi-green.log; final-approved.log chứa JSON OpenAPI gốc do test sinh |
| Auth/platform hồi quy | PB-01/02/03 suite hiện có | final-approved.log |

## Lượt chạy

Các lệnh và thời điểm thực ghi trong commands.log; stdout/stderr nguyên bản do runner tạo trong các file .log cùng thư mục. Chỉ test dùng dữ liệu QA giả; runner không xuất token/mật khẩu/hash. Mỗi assertion HTTP/DB nằm trong case có ID ở source test; đây là automated test, không mô tả thành manual API/browser QA.

Chưa chạy browser vì scope chỉ API/DB; không xác nhận UI/production. Quy tắc quỹ sau ca đầu phụ thuộc PB-06, chưa xác minh.

## Kết quả bản cuối

- `npm test` tại POS_API: bắt đầu `2026-10-30T19:54:23.5898064+07:00`, kết thúc `2026-10-30T19:54:42.5971111+07:00`, exit0; runner ghi21 test,21 pass,0 fail/skip/cancel. Có TypeScript build trong npm test. Output gốc: [final-approved.log](evidence/final-approved.log), lệnh/thời điểm: [commands.log](evidence/commands.log).
- CLI migration chạy trên DB thử riêng: `node --env-file-if-exists=.env ../qa-evidence/20261030-193116-9ce75dd-pb04/migration-check.cjs` tại POS_API. Script gọi đúng TypeORM CLI trong manifest sau build, giữ nguyên stdout/stderr. Lượt1/2 exit0, lượt1 áp4 migration gồm Organization, lượt2 không pending; thời điểm từng lượt trong [migration-cli.log](evidence/migration-cli.log). Không áp migration lên DB local đang dùng của người dùng.
- Nâng cấp dữ liệu cũ được MIG-01 xác minh trong final-approved.log: giữ branch/quỹ/custom permission; constraint FK/capacity; chạy lại không thay đổi bảng đã ghi.
- [source-manifest.json](evidence/source-manifest.json) nhận diện toàn bộ source API, manifest/lock/tsconfig cuối; [runtime-manifest.json](evidence/runtime-manifest.json) nhận diện JS đã build dùng cho runner. Đã đọc lại và so SHA256 với file hiện có sau lượt chạy; metadata môi trường/Git tại [environment.log](evidence/environment.log).
- Các file red/green/suite cũ giữ lịch sử thất bại và sửa; chúng không thay bằng chứng bản cuối. green-build fail do barrel Branch chưa đổi đường dẫn, suite-1 fail vì test nền đếm3 migration thay4; các log OpenAPI red-build ghi lỗi type/import của test trước khi test schema chạy thật ở openapi-red-4.log. Manifest lần tạo đầu dùng API .NET không có trên PowerShell5; đã tạo lại/đối chiếu bằng đường dẫn tương đối từ workspace.
- Dữ liệu test giả; log HTTP chỉ giữ method/path/status/requestId và field an toàn, không cookie/header token hoặc temporaryPassword. Log CLI chỉ schema/seed permissions, không secret thật.

## Review và giới hạn

Code reviewer đọc độc lập qua subagent trong cùng phiên, không phải CI/runner độc lập. [Review cuối](review.md) xác nhận không còn finding và không thiếu artifact trong scope; reviewer không tự chạy lại suite. Không ghi Product Owner đã nghiệm thu hoặc tick toàn Sprint3. UI và quy tắc sau ca nằm ngoài scope đã chốt.

Swagger được kiểm tra bằng JSON do DOC-01 sinh trong final-approved.log: schema response, query cursor, nullable string/integer của request và anyOf cho danh sách users rỗng ở hai context. empty-list-red.log và nullable-red.log lưu failure trước sửa; final-approved.log là bản sau sửa, không dùng JSON OpenAPI trước đó thay thế.

## Giới hạn bổ sung từ đối chứng QA — 30/10/2026

Kết quả tiếp theo: sau yêu cầu sửa, [run bản cuối](../20261030-202325-9ce75dd-pb04-gap-fix/run.md) có48/48 TAP nodes đạt và CLI migration first/repeat qua; [QA đối chiếu](../20261030-202325-9ce75dd-pb04-gap-fix/audit.md) đã đóng AUD-01..05 trong scope API/DB. Dữ liệu21/21 và raw log của run này giữ nguyên làm lịch sử, không thay bản cuối.

Kết luận review trước về “không thiếu artifact trong scope” không chứng minh đủ mọi vế nghiệm thu. [Audit mới](../20261030-200921-9ce75dd-pb04-evidence-audit/audit.md) đã chỉ rõ các phần chỉ có code hoặc chưa có tình huống/assertion/DB/log tương ứng: cùng-store khác branch, auth bị khóa trên API tổ chức, reset nhiều phiên/race, pagination SQL đầy đủ, log mutation và DB effects. Bộ log gốc là thật, hashes khớp, nhưng chưa đủ để nghiệm thu toàn PB-04. Audit không chạy suite mới và không sửa raw log; không diễn giải21 TAP nodes thành21 tình huống nghiệp vụ độc lập.
