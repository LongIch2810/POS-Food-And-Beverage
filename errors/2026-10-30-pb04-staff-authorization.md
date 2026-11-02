**Trạng thái:** đã sửa; regression local trên bản source/runtime lưu cùng run PB-04.

# PB-04 — phân cấp vai trò và tự khóa tài khoản

- Task: `tasks/completed/2026-10-30-pb04-organization-api.md` (mở lại phần kiểm chứng sau audit, không tái mở các bug đã sửa trong file này); base 9ce75dd, working tree dirty trên feat/pb04-organization-api.
- Triệu chứng: MANAGER được gán nhầm user.manage có thể cấp MANAGER ngang cấp và tự khóa/hạ quyền. Bản sửa đầu so actor.id với ID path nên UUID viết hoa vẫn né được cấm tự khóa.
- Tái hiện: case USR-HIER trong organization.integration.test.ts; review-red.log ghi 201 thay403 ở cấp peer; uuid-red.log ghi200 thay403 ở UUID tự khóa viết hoa (các case phụ sau đó fail do fixture bị khóa, không là lỗi độc lập).
- Nguyên nhân xác minh: permission chỉ kiểm tra quyền vào route, chưa thực thi BR-06/83 trong service; ID path chưa canonical dù PostgreSQL uuid là cùng ID.
- Sửa: so sánh thứ bậc role gán ở create/update; cấm tự khóa/hạ quyền bằng actor.id và user.id chuẩn từ DB. Không dùng branch.access_all thay cho thứ bậc.
- Kiểm chứng: USR-HIER lowercase/uppercase trong final-approved.log qua; toàn suite21/21 local. Artifacts: `qa-evidence/20261030-193116-9ce75dd-pb04/`.
- Review cũng phát hiện Content-Type kiểm tra sau DTO; ORG-05 tái hiện422 thay400. JsonBodyGuard giờ kiểm tra sau AccessGuard, trước parameter pipes. final.log ghi6 request400 BAD_REQUEST.
