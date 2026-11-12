# Gom cấu trúc response/error cho `/api/v1`

Trạng thái: hoàn thành, chờ review/merge

Mục tiêu: tách envelope thành công/lỗi và DTO dùng chung khỏi controller auth, để health và auth tái sử dụng mà không đổi status, JSON, cookie, header hoặc OpenAPI.

Nhánh: `refactor/api-response-envelope`; worktree `D:/saved/Project/POS-FB-master`; nền `edbe318`.

Phạm vi: `POS_API/src/auth/http/auth.controller.ts`, `auth.dto.ts`, `health.controller.ts`, `api-error.filter.ts`, module response chung mới, test liên quan. Không đổi endpoint hay quy tắc auth.

Các bước: (1) gom DTO/envelope chung; (2) cho health 503 đi qua filter; (3) kiểm tra build và test API với PostgreSQL QA; (4) rà diff/contract và đưa ra review. Tiêu chí xong: response 200/204/503 và lỗi auth giữ nguyên hình dạng, test đạt, không có dependency mới.

Đã làm: rà spec API, controller, filter, caller `authError` và test hiện có; chuyển DTO/envelope chung sang `POS_API/src/http/api-response.ts`; cho health 503 đi qua filter; thêm assertion 503 giữ status, message và request ID.

Bằng chứng: `npm run build --prefix POS_API` exit 0; `npm test --prefix POS_API` exit 0, 5/5 test trên PostgreSQL QA; `qa-evidence/2026-10-29-1641-edbe318-api-response/run.md`. `git diff --check` exit 0; không có dependency mới.

File đã đổi: `POS_API/src/http/api-response.ts`, `POS_API/src/api-error.filter.ts`, `POS_API/src/health.controller.ts`, `POS_API/src/auth/http/auth.controller.ts`, `POS_API/src/auth/http/auth.dto.ts`, `POS_API/src/foundation.test.ts`, hồ sơ QA và task này. Blocker: không có. Bước tiếp theo ngoài phạm vi task: review commit trước khi merge; chưa push.
