**Trạng thái:** completed

Plan: `plans/completed/2026-10-29-pb02-review-fixes.md`
Mục tiêu: sửa ba finding PB-02.
Nhánh: `fix/pb02-review-findings`.
Đã hoàn tất: review PB-02; test đỏ cho ba finding và ranh giới TAB-only; sửa DTO, bootstrap, auth service/controller; test xanh.
Hiện tại: thay đổi sẵn sàng review trên nhánh riêng, chưa merge/push.
Bước tiếp theo: reviewer xem diff; merge theo quyết định của người dùng.
File đã đổi: `POS_API/src/auth/auth.service.ts`, `POS_API/src/auth/http/auth.controller.ts`, `POS_API/src/auth/http/auth.dto.ts`, `POS_API/src/bootstrap-admin.ts`, hai test; plan/task, ba error note, QA evidence.
Kiểm tra: `npm test` tại `POS_API`, PostgreSQL 17 tạm, 5 pass/0 fail. Xem `qa-evidence/2026-10-29-091545-fc2b07d/run.md`. Local do agent chạy; chưa có CI độc lập.
Blocker: không có.
