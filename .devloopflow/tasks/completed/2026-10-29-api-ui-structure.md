**Trạng thái:** completed

Plan: `plans/completed/2026-10-29-api-ui-structure.md`.
Mục tiêu: sắp xếp lại source backend/frontend theo cấu trúc đã ghi ở `docs/architecture/ARCHITECTURE.md`.
Nhánh: `refactor/backend-frontend-structure` (tạo từ `fix/pb02-review-findings`, giữ nguyên working tree dirty).
Đã hoàn tất: đọc quy tắc và hiện trạng; build baseline; chuyển 13 file backend và 6 file frontend, cập nhật 45 import, CLI migration và tài liệu; build và test sau đổi; index lại code graph.
Hiện tại: thay đổi sẵn sàng review trên nhánh `refactor/backend-frontend-structure`, chưa merge/push.
Bước tiếp theo: reviewer xem diff; tích hợp theo quyết định của người dùng.
File đã đổi: `POS_API/src/database/`, import backend, `POS_API/package.json`, `POS_API/README.md`, `POS_UI/src/app/`, 5 service theo feature, import frontend, `docs/architecture/ARCHITECTURE.md`, plan/task và QA evidence.
Lệnh kiểm tra: `npm run build` ở API/UI; `npm run migration:run` và `npm test` ở API. Bằng chứng local: `qa-evidence/2026-10-29-093310-fc2b07d/run.md`, `qa-evidence/2026-10-29-093400-fc2b07d/run.md` (5 pass, 0 fail). Không có xác nhận CI độc lập.
Blocker: không có. Hai thư mục source cũ rỗng còn ở máy local, không được Git theo dõi.
