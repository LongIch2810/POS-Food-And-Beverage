# Trạng thái: completed — cấu trúc auth đã chia theo trách nhiệm và kiểm tra đạt

## Mục tiêu

Làm rõ cấu trúc bên trong `POS_API/src/auth/` để mở rộng module sau này mà không dồn controller, bảo mật và test vào cùng một cấp.

## Quyết định và phạm vi

- Cấp `auth/` giữ `auth.module.ts`, `auth.service.ts`, `auth-config.ts`.
- `http/` chứa controller, DTO và cookie helper; `security/` chứa access/local guard và Passport strategy; `tests/` chứa ba test auth.
- Chỉ chuyển file và cập nhật import/test script/tài liệu liên quan; không đổi route, DTO, schema DB hay logic xác thực.

## Các bước

1. Xác minh source/target và chuyển từng file chính xác, không ghi đè.
2. Sửa import, script test và tài liệu đường dẫn.
3. Dọn JS build cũ do chính tác vụ sinh, chạy build/test PostgreSQL, ghi QA evidence và kiểm tra diff.
4. Hoàn tất plan/task và cập nhật Sprint.

## Tiêu chí hoàn thành

`auth/` root chỉ còn module, service, config và ba thư mục trách nhiệm; năm test vẫn được runner phát hiện, đạt trên PostgreSQL, không đổi HTTP behavior.

## Rủi ro

Import tương đối và test glob đổi; file JS build cũ ở `dist/auth/` có thể khiến test chạy trùng nếu không dọn.

## Kết quả

- `auth/` root giữ module/service/config; `http/` có 3 file, `security/` có 3 file, `tests/` có 3 file.
- Đã sửa import và test glob, cập nhật README/error ledger/Sprint, dọn chính xác 9 JS cũ do build trước sinh ra.
- QA local `qa-evidence/20261028-154810-cdcc096/run.md`: `npm test` 5/5 đạt trên PostgreSQL thật, 0 fail. `git diff --check` đạt; không đổi HTTP behavior.
