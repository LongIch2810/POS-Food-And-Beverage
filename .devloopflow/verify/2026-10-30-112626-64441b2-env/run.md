# Trạng thái: Hoàn tất kiểm chứng — local do agent chạy

- Commit nền: 64441b25256e586a9f8dd20937380ea4be6f7ae5; nhánh fix/local-env-configuration; dirty.
- Môi trường: Windows, Node22.22.2, npm10.9.7, Vite6, PostgreSQL17 local.
- Matrix trước chạy: tasks/completed/2026-10-30-local-env-configuration.md (lúc chạy ở active); proxy đọc file env/ưu tiên shell/thiếu config/build không cần target, backend tự nạp env, hồi quy auth/platform và gitignore/image.
- Giữ output runner gốc trong thư mục này. Không ghi .env, secret hoặc giá trị token vào artifact.
- Cách tái chạy: `node qa-evidence/2026-10-30-112626-64441b2-env/verify.cjs` ở gốc repository khi đã có POS_API/.env hợp lệ và PostgreSQL local. Script xóa các biến DB/auth khỏi môi trường shell của child, chạy đúng lệnh npm từng app, ghi nguyên stdout/stderr vào file và assert kết quả.

## Kết quả trên mã cuối

| Tiêu chí | Lệnh/tình huống | Artifact đã mở lại | Kết quả |
| --- | --- | --- | --- |
| Vite đọc .env, ưu tiên shell, dev thiếu target báo lỗi, build không cần target | Test `Vite proxy reads .env, respects shell overrides and requires a dev target` trong `npm test` tại POS_UI | [ui-test.log](evidence/ui-test.log), [ui-test.stderr.log](evidence/ui-test.stderr.log) | Đạt; config thật nạp bằng Vite trong child process/fixture env riêng |
| Backend tự nạp .env trước DB/auth, giữ hành vi API | `npm test` tại POS_API, đã xóa các biến app khỏi shell | [api-test.log](evidence/api-test.log), [api-test.stderr.log](evidence/api-test.stderr.log), [results.json](evidence/results.json) | Exit0; build và 7 pass/0 fail/0 skipped trên PostgreSQL thử riêng |
| Frontend auth/platform không hồi quy | `npm test` và `npm run build` tại POS_UI | [ui-test.log](evidence/ui-test.log), [ui-build.log](evidence/ui-build.log), stderr tương ứng | Exit0; 11 pass/0 fail/0 skipped; typecheck/Vite build đạt |
| Khởi động backend bằng script start với .env và DB thật | `node qa-evidence/2026-10-30-112626-64441b2-env/startup-smoke.cjs` | [startup-result.json](evidence/startup-result.json), [startup.stdout.log](evidence/startup.stdout.log), [startup.stderr.log](evidence/startup.stderr.log) | Exit0, GET health200 và đúng body; child chạy args từ npm scripts.start, không truyền DB/auth qua shell. PORT được override sang cổng probe tạm; dừng đúng child sau kiểm tra. |
| File env tồn tại và không vào Git; source không còn URL proxy fallback | git check-ignore, kiểm tra tồn tại và hash file cấu hình cuối | [final-checks.json](evidence/final-checks.json) | POS_API/.env và POS_UI/.env tồn tại/ignored; chỉ lưu tên file, không lưu giá trị; source Vite không chứa http:// |
| Env frontend không được COPY vào image | Rà POS_UI/.dockerignore có `.env*` và ngoại lệ mẫu | POS_UI/.dockerignore, review code | Đã rà cấu hình; không build image Docker trong lượt này |

Thời gian/exit code gốc trong results.json: API04:29:17.241→04:29:41.653 UTC; UI test04:29:41.653→04:29:44.073; UI build04:29:44.073→04:29:52.888 ngày30/10/2026. Startup có timestamp riêng trong startup-result.json.

## Tái hiện và review

- `node --test POS_UI/test/env-config.test.mjs` trước sửa exit1: [red-test.log](evidence/red-test.log) ghi expected43210, actual3000; stderr kèm theo. Sau sửa exit0: [green-config-test.log](evidence/green-config-test.log). Hai lượt riêng này chỉ là artifact tái hiện bổ trợ (không ghi thời điểm bắt đầu riêng); kết luận cuối dùng full suite có thời gian/exit code ở results.json.
- Reviewer riêng review_module_structure không phát hiện lỗi cấu hình/code trong diff; đã rà Node env flags, Vite file/shell precedence, Compose/CI caller, Git/Docker ignore, docs và artifact API7/UI11/build. Reviewer không đọc giá trị `.env` thật và không tự chạy lại test/browser.
- Reviewer đã rà lại hồ sơ cuối: các link đọc được, 7 hash cấu hình/test khớp mã hiện tại, startup health200 và env ignored có artifact; không thiếu chứng cứ quan trọng. Startup dùng cổng tạm nên không xác minh cổng mặc định đang rảnh.
- POS_INFRA/.env.local chỉ có phần DB, không đủ DB/auth để tạo backend env. Đã dùng cấu hình hiệu lực của container API local kết hợp phần DB đó, không đổi secret hoặc in giá trị; không ghi các file `.env` thật vào artifact/Git. Không ghi đè file env có sẵn.

## Giới hạn

Kiểm chứng local trên diff chưa commit, chưa có CI cho thay đổi này. Không chạy browser/image Docker mới; không đổi UI, API/schema hoặc dependency. Docker Compose tiếp tục cấp VITE_API_TARGET bằng DNS dịch vụ nội bộ; ngoài Docker dùng POS_UI/.env. Secret chỉ ở backend env, không đưa vào VITE_*.
