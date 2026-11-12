# Trạng thái: completed — đã triển khai và kiểm tra; PB-02 vẫn chờ Product Owner nghiệm thu trong Sprint

## Mục tiêu

Bổ sung DTO/schema request và response cho PB-02, dùng NestJS ValidationPipe, Passport local, cookie-parser và Swagger; ghi tech stack hiện dùng và quy tắc cập nhật.

## Phạm vi và quyết định

- Schema chung ở `docs/api-spec.md`, schema auth cụ thể ở `specs/auth.md`.
- Passport chỉ cho login; AccessGuard hiện tại tiếp tục xác minh phiên/quyền.
- Swagger UI `/api/docs` và JSON `/api/docs-json` chỉ khi `NODE_ENV=development`.
- Giữ nguyên hợp đồng PB-02: Origin trước xác minh credential, `400` cho JSON/Content-Type không đọc được, `422` cho dữ liệu sai, cookie/CSRF và lỗi xác thực như cũ.

## Các bước

1. Bổ sung schema và quy ước DTO vào hai tài liệu, rà mâu thuẫn với hợp đồng hiện có.
2. Thêm thư viện và DTO/Passport/cookie-parser/Swagger, cập nhật test bị ảnh hưởng.
3. Ghi `TECH_STACK.md`, cập nhật `AGENTS.md` và tài liệu liên quan.
4. Chạy build/test/audit, ghi QA evidence, review diff và đóng task/plan.

## Hoàn thành khi

Test HTTP/DB đạt; OpenAPI có schema đầy đủ, docs route chỉ ở development; tech stack phản ánh manifest; không đổi hành vi phiên; QA evidence lưu kết quả thực.

## Rủi ro

Guard chạy trước pipe trong NestJS; phải kiểm tra DTO và Origin trước Passport để giữ đúng mã lỗi login.

## Kết quả

- `specs/auth.md` có schema request/response cho sáu route; `docs/api-spec.md` có DTO envelope chung và quy ước; `AGENTS.md` liên kết tech stack và yêu cầu cập nhật cùng dependency.
- Login chạy qua Passport local; cookie request qua `cookie-parser`; DTO class-validator/ValidationPipe và OpenAPI schema qua `@nestjs/swagger`. Docs route chỉ ở development.
- QA local `qa-evidence/20261028-153844-cdcc096/run.md`: `npm test` 5/5 đạt trên PostgreSQL thật, `npm audit --audit-level=moderate` 0 lỗ hổng. `git diff --check` đạt.
- Chưa có CI độc lập, browser HTTPS hay UI PB-13; Product Owner chưa nghiệm thu PB-02.
