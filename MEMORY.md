# Điều cần nhớ qua các phiên

## Gắn dữ liệu render với khóa truy vấn hiện hành

- Áp dụng: UI đổi tab/filter/cursor và tái sử dụng state danh sách với các kiểu row khác nhau.
- Bài học: Generation guard ở promise callback chưa đủ; render đầu tiên sau đổi tab vẫn có thể nhận rows cũ trước useEffect. Gắn rows với query key và chỉ render bảng khi key khớp, hiện loading trong khoảng chuyển tiếp. Test phải thực thi callback cột, không chỉ stub bảng rồi kiểm props.
- Căn cứ: `errors/2026-10-30-pb13-tab-row-shape.md`; browser thực crash BigInt(undefined), ui-tests-7 red và ui-tests-8/final28test green; artifact ở hai run PB-13 ngày30/10 và01/11/2026.

## Không replay request qua thay đổi danh tính

- Áp dụng: HTTP client khôi phục cookie/refresh và thử lại request khi nhiều tab có thể đổi tài khoản/store/branch.
- Bài học: Capture identity và session epoch trước request; sau async CSRF/restore phải đối chiếu trước phát mutation hoặc retry. Broadcast/unmount chỉ chặn setState, không ngăn fetch cũ ghi dữ liệu dưới danh tính mới. Chỉ nhớ identity từ kết quả auth đã qua generation guard.
- Căn cứ: `errors/2026-10-30-pb13-session-retry-scope.md`; ui-tests-4 red, regression final green và browser B32 old-cookie401/noXS trong `qa-evidence/20261030-214100-9ce75dd-pb13-organization-ui/`.

## Khóa dòng trước khi đọc quan hệ có thể thay đổi

- Áp dụng: PostgreSQL READ COMMITTED, truy vấn JOIN quan hệ mutable cùng FOR UPDATE và phải chờ transaction khác sửa khóa ngoại.
- Bài học: Lấy khóa dòng gốc trong scope bằng statement riêng, rồi đọc lại quan hệ trong statement sau của cùng transaction; kiểm thử thứ tự chờ khóa thật bằng pg_locks/pg_blocking_pids. JOIN trước khi chờ có thể trả thiếu dòng sau khi khóa ngoại đổi, gây401/404 sai.
- Căn cứ: `errors/2026-10-30-pb04-login-role-lock-race.md`; acceptance-3.log.gz tái hiện login401 và acceptance-6.log.gz tái hiện reset/disable404; full-2.log.gz xác minh14 lịch khóa sau sửa tại `qa-evidence/20261030-202325-9ce75dd-pb04-gap-fix/`.

## So sánh UUID chuẩn trong kiểm tra quyền

- Áp dụng: Khi so actor với ID tài nguyên, đặc biệt chặn tự khóa/tự hạ quyền.
- Bài học: So với ID chuẩn đọc từ DB hoặc chuẩn hóa đồng nhất; không so UUID path thô bằng chuỗi JavaScript. PostgreSQL coi UUID viết hoa/thường là một ID, JavaScript so chuỗi thì khác. Thêm tình huống UUID viết hoa cho guard tự thao tác.
- Căn cứ: `errors/2026-10-30-pb04-staff-authorization.md`, USR-HIER trong `qa-evidence/20261030-193116-9ce75dd-pb04/uuid-red.log` tái hiện200 thay403; `final-approved.log` xác minh UUID thường/hoa đều bị từ chối sau sửa.

## Nghiệm thu cần chứng cứ gốc đầy đủ

- Áp dụng: Khi kiểm tra hoặc báo hoàn thành tiêu chí nghiệm thu.
- Bài học: Đối chiếu từng vế của spec/docs đã chốt với mã/UI cuối, tình huống kiểm tra và artifact gốc; mở lại ảnh, log, request/response và trạng thái DB khi cần để xác nhận đúng commit và kết quả. Không suy diễn từ test pass, ảnh đơn lẻ hay chứng cứ phiên bản cũ; không dựng chứng cứ từ trí nhớ. Thiếu hoặc mâu thuẫn thì ghi **chưa xác minh**, để trống tiêu chí và chạy lại để thu chứng cứ thật.
- Căn cứ: Yêu cầu người dùng trong phiên 2026-10-29; quy tắc “Bằng chứng thực thi QA” trong `AGENTS.md`.

## Dùng skill khi làm đặc tả POS

- Áp dụng: Khi phỏng vấn, tạo, sửa hoặc rà soát đặc tả chức năng hay endpoint POS, kể cả khi việc viết spec là một bước trong task triển khai.
- Bài học: Chủ động đọc và áp dụng `.agents/skills/create-pos-spec/SKILL.md` trước khi làm spec; đối chiếu tài liệu, trình bản nháp, hỏi các quyết định còn mở và chỉ ghi vào `specs/` sau khi đã chốt. Thông tin có sẵn không thay thế bước rà và chốt.
- Căn cứ: Người dùng nhắc kiểm tra việc dùng skill khi lập `specs/platform.md` ngày 2026-10-30; phần mô tả và quy trình của `.agents/skills/create-pos-spec/SKILL.md`.

## JsonBodyGuard và HTTP Client cho các request DELETE / 204 No Content

- Áp dụng: API Guard validate Content-Type application/json và Frontend fetch client xử lý response status.
- Bài học: Request `DELETE` thông thường không có body; `JsonBodyGuard` phải bỏ qua kiểm tra Content-Type cho `DELETE` để không trả 400 sai. Phía client UI `request()` phải kiểm tra `response.status === 204` để trả về `undefined` thay vì parse JSON `response.json()` gây crash `UNKNOWN` error.
- Căn cứ: Sửa `JsonBodyGuard` trong `POS_API/src/http/request-validation.ts` và `request()` trong `POS_UI/src/http/client.ts`; xác minh qua `menu.integration.test.ts` (MENU-01, MENU-02) và `menu-service.test.mjs` (PB13-MENU-HTTP).
