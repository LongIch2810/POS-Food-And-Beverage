# Review PB-04 API/DB

**Trạng thái:** đã rà bản cuối; không còn finding cần sửa trong phạm vi đã chốt.

Reviewer: subagent `/root/pb04_review` (vai trò code-reviewer), context riêng, chỉ đọc source/log; agent chính lưu lại kết luận này từ báo cáo reviewer trong hội thoại. Không gọi đây là CI độc lập hoặc reviewer tự chạy lại suite.

## Finding và kiểm tra lại

| Finding | Sửa | Bằng chứng |
| --- | --- | --- |
| BR-83 gán role ngang/cao khi nhân viên bị gán nhầm permission | Kiểm tra thứ bậc sau permission, ở create/role update | review-red.log → USR-HIER trong final-approved.log |
| BR-06 tự khóa/tự hạ quyền, bypass UUID hoa | So actor.id với user.id canonical từ DB | uuid-red.log → USR-HIER thường/hoa trong final-approved.log |
| Content-Type sai trả422 thay400 | JsonBodyGuard sau AccessGuard, trước DTO pipes | content-type-red.log/review-red.log → ORG-05 trong final-approved.log |
| Thiếu schema response/query OpenAPI | DTO/schema response và query decorators | openapi-red-4.log → DOC-01 trong final-approved.log |
| oneOf không chấp nhận danh sách users rỗng hợp lệ | anyOf cho hai envelope danh sách | empty-list-red.log → DOC-01 trong final-approved.log |
| Nullable union phản chiếu Object | Khai báo type String/integer tường minh | nullable-red.log → DOC-01 trong final-approved.log |

## Đối chiếu cuối của reviewer

- Đọc logic tenant/branch, quyền/thứ bậc, tự khóa/hạ quyền, transaction thu hồi phiên, DTO, pagination, migration và Swagger.
- `final-approved.log`:21/21 pass,0 fail/skip/cancel; exit0 và thời gian19:54:23..19:54:42 khớp commands.log.
- `migration-cli.log`: lượt đầu và chạy lại đều exit0.
- Rehash64 source/config và62 runtime:0 sai lệch; manifest bao phủ61 TypeScript source và3 config. HEAD đầy đủ/dirty state khớp run.md và environment.log.
- Đọc JSON OpenAPI gốc trong TAP (giải mã UTF16LE/TAP escape): users list anyOf, nullable string/integer đúng.
- Các artifact dẫn trong run.md tồn tại; DB diagnostics đo thực tế, không thấy thiếu chứng cứ trong phạm vi API/DB đã thống nhất.

Kết luận reviewer: không còn finding cần sửa; sẵn sàng trình tích hợp trong phạm vi đã review. Chưa có quyết định nghiệm thu Product Owner, CI PB-04 hoặc xác nhận UI/production/quỹ sau ca PB-06. Không tự merge/push.

## Đính chính sau đối chứng QA — 30/10/2026

Kết quả tiếp theo: [review bản sửa cuối](../20261030-202325-9ce75dd-pb04-gap-fix/review.md) không còn finding và [QA đối chiếu](../20261030-202325-9ce75dd-pb04-gap-fix/audit.md) đóng AUD-01..05 trong scope API/DB. Hai lỗi cạnh tranh JOIN/khóa user phát hiện trong lượt sửa có red/green tại run mới; giữ nguyên kết luận/log lịch sử bên dưới để truy vết.

[Audit đối chứng yêu cầu/mã/chứng cứ](../20261030-200921-9ce75dd-pb04-evidence-audit/audit.md) phát hiện AUD-01..05. Câu “không thấy thiếu chứng cứ trong phạm vi API/DB” ở kết luận trước quá rộng: file/hash/log hiện có đúng và code review chưa tìm bug mới, nhưng chưa bao phủ mọi vế spec. Không dùng kết luận cũ để nghiệm thu toàn PB-04. Plan/task đã mở lại phần kiểm chứng; các raw log cũ và kết quả21/21 local giữ nguyên, không có lượt test mới trong audit.
