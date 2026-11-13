# MEMORY: kinh nghiệm của dự án này
<!-- Bộ nhớ của dự án cho AGENT đọc. Do skill reflect và remember ghi. Cấu trúc cố định: bảng "Chỉ mục" (agent quét trước) + khối "Chi tiết" cho từng mục (mở khi cần). Mỗi mục có MỘT dòng ở Chỉ mục và MỘT khối ở Chi tiết, hai chỗ phải khớp nhau. Chỉ ghi điều có bằng chứng (task id, path:dòng, id finding, hoặc lời user nguyên văn). Không secret, token, mật khẩu, PII. Chỉ thêm hoặc cập nhật, không xoá; mục sai đổi sang `hết hiệu lực` kèm lý do và ngày. Lỗi đã sửa có nguyên nhân gốc thì ghi ở .devloopflow/errors/, ở đây chỉ dẫn link. File này được commit. -->

- Cập nhật lần cuối: 2026-11-13
- Id `M-<n>` tăng dần trong toàn dự án, không dùng lại.

## Cách đọc (dành cho agent)
1. Đọc bảng "Chỉ mục". Bỏ dòng có trạng thái khác `có hiệu lực`.
2. Chọn dòng có `tag` khớp module, loại việc hoặc từ khóa của việc đang làm, hoặc có "Khi nào áp dụng" đúng với việc đang làm. Không chắc khớp thì chọn (đọc nhầm một mục rẻ hơn bỏ sót).
3. Với dòng đã chọn: mở khối `### M-<n>` ở "Chi tiết" khi cần bằng chứng hoặc lý do. Áp dụng "Quy tắc"; khi áp dụng thì dẫn id `M-<n>` trong plan, test, finding hoặc report.
4. Theo `loại`: `Hay quên` là danh sách kiểm bắt buộc (reviewer và ac-verifier kiểm, planner và tdd phủ); `Ý của user` coi như yêu cầu của user, trái nó thì hỏi user; `Đã học được` là sự thật về dự án (nguồn "user nói" thì kiểm lại bằng code khi dùng cho quyết định lớn); `Quy trình` điều chỉnh cách làm.
5. Mâu thuẫn với tài liệu dự án hoặc code: tài liệu và code thắng (mục có thể đã cũ), báo user. Mâu thuẫn với lời user trong phiên hiện tại: lời user thắng.

## Chỉ mục
| Id | Loại | Tag | Khi nào áp dụng | Quy tắc (một câu mệnh lệnh) | Số lần | Trạng thái |
|---|---|---|---|---|---|---|
| M-1 | Hay quên | sales, branch-scope, permission | Sửa hoặc thêm kiểm tra phạm vi chi nhánh/store ở API | Sửa kiểm phạm vi ở MỌI điểm vào cùng bảng (grep `branchId`), không chỉ điểm finding nêu | 3 | có hiệu lực |
| M-2 | Hay quên | payment, webhook, sepay, schema | Chốt schema hoặc validate cho dữ liệu từ provider bên thứ ba | Đối chiếu tài liệu chính thức của provider về trường rỗng, trùng và số lần retry trước khi chốt ràng buộc | 1 | có hiệu lực |
| M-3 | Hay quên | ui, dialog, state | Thêm hoặc sửa trạng thái chờ (pending, uncertain, busy) trong component có polling | Khi trạng thái chờ biến mất, reset đồng bộ mọi cờ liên quan trong cùng một bước, và thêm test cho nhánh đó | 2 | có hiệu lực |
| M-4 | Hay quên | docs, api-spec, errors, spec | Thêm mã lỗi hoặc đổi điều kiện lỗi của endpoint trong code | Cập nhật danh sách lỗi của spec (`specs/`) và `docs/api-spec.md` cùng lúc với code, rồi grep mã lỗi mới trong tài liệu | 1 | có hiệu lực |
| M-5 | Hay quên | docs, status, third-party | Sau khi verify-ac chuyển AC từ mở sang PASS, hoặc sau khi tích hợp đổi trạng thái | Rà tài liệu có câu trạng thái "chưa kiểm", "chưa triển khai", "dự kiến" và cập nhật trong cùng task | 2 | có hiệu lực |
| M-6 | Quy trình | tdd, qa-evidence, subagent | Giao `tdd` cho việc nhiều bước có nguy cơ bị giới hạn phiên | Yêu cầu worker ghi log RED/GREEN và output test ngay từng bước vào `qa-evidence/`, không chỉ báo cáo cuối | 3 | có hiệu lực |
| M-7 | Quy trình | verify-ac, sandbox, environment | Chuẩn bị chạy verify-ac cần app, container hoặc DB đang chạy | Xác nhận quyền khởi động môi trường trước vòng kiểm; khi bị chặn, dừng và báo user thay vì lặp lại lệnh bị chặn | 1 | có hiệu lực |
| M-8 | Đã học được | config, secret, auth, test-fixture | Siết ngưỡng độ dài secret hoặc đổi cấu hình bắt buộc | Kiểm mọi fixture test đang dùng giá trị cũ trước khi siết; không đổi fixture nếu user chưa đồng ý | 1 | có hiệu lực |
| M-9 | Quy trình | qa, acceptance, evidence, provenance | Chuẩn bị nghiệm thu có nhiều vế và thay đổi UI/API | Lập ma trận từng vế AC với artifact trước khi chạy và lưu hash mã được kiểm cùng bằng chứng | 1 | có hiệu lực |
| M-10 | Hay quên | permission, roles, integration-test | Thêm hoặc thay đổi quyền theo vai trò | Kiểm hành vi qua HTTP bằng vai trò thật, gồm ca được phép và các trường hợp thiếu điều kiện hoặc sai phạm vi | 1 | có hiệu lực |

| M-11 | Hay quên | ui, state, query-key | UI đổi tab/filter/cursor và tái sử dụng state danh sách với các kiểu row khác nhau. | Generation guard ở promise callback chưa đủ; render đầu tiên sau đổi tab vẫn có thể nhận rows cũ trước useEffect. Gắn rows với query key và chỉ render bảng khi key khớp, hiện loading trong khoảng chuyển tiếp. Test phải thực thi callback cột, không chỉ stub bảng rồi kiểm props. | chưa ghi | có hiệu lực |
| M-12 | Hay quên | auth, http-client, identity | HTTP client khôi phục cookie/refresh và thử lại request khi nhiều tab có thể đổi tài khoản/store/branch. | Capture identity và session epoch trước request; sau async CSRF/restore phải đối chiếu trước phát mutation hoặc retry. Broadcast/unmount chỉ chặn setState, không ngăn fetch cũ ghi dữ liệu dưới danh tính mới. Chỉ nhớ identity từ kết quả auth đã qua generation guard. | chưa ghi | có hiệu lực |
| M-13 | Hay quên | ui, toast, session | Provider hiển thị toast hoặc trạng thái tạm sống xuyên logout/login hay đổi user/store. | Xóa thông báo cũ khi danh tính hoặc trạng thái xác thực đổi; kiểm bằng browser sau logout/login cửa hàng khác, kể cả toast lỗi không tự biến mất. | chưa ghi | có hiệu lực |
| M-14 | Đã học được | db, transaction, locking | PostgreSQL READ COMMITTED, truy vấn JOIN quan hệ mutable cùng FOR UPDATE và phải chờ transaction khác sửa khóa ngoại. | Lấy khóa dòng gốc trong scope bằng statement riêng, rồi đọc lại quan hệ trong statement sau của cùng transaction; kiểm thử thứ tự chờ khóa thật bằng pg_locks/pg_blocking_pids. JOIN trước khi chờ có thể trả thiếu dòng sau khi khóa ngoại đổi, gây401/404 sai. | chưa ghi | có hiệu lực |
| M-15 | Hay quên | auth, permission, uuid | Khi so actor với ID tài nguyên, đặc biệt chặn tự khóa/tự hạ quyền. | So với ID chuẩn đọc từ DB hoặc chuẩn hóa đồng nhất; không so UUID path thô bằng chuỗi JavaScript. PostgreSQL coi UUID viết hoa/thường là một ID, JavaScript so chuỗi thì khác. Thêm tình huống UUID viết hoa cho guard tự thao tác. | chưa ghi | có hiệu lực |
| M-16 | Quy trình | qa, acceptance, evidence | Khi kiểm tra hoặc báo hoàn thành tiêu chí nghiệm thu. | Đối chiếu từng vế của spec/docs đã chốt với mã/UI cuối, tình huống kiểm tra và artifact gốc; mở lại ảnh, log, request/response và trạng thái DB khi cần để xác nhận đúng commit và kết quả. Không suy diễn từ test pass, ảnh đơn lẻ hay chứng cứ phiên bản cũ; không dựng chứng cứ từ trí nhớ. Thiếu hoặc mâu thuẫn thì ghi **chưa xác minh**, để trống tiêu chí và chạy lại để thu chứng cứ thật. | chưa ghi | có hiệu lực |
| M-17 | Quy trình | spec, pos, product-owner | Khi phỏng vấn, tạo, sửa hoặc rà soát đặc tả chức năng hay endpoint POS, kể cả khi việc viết spec là một bước trong task triển khai. | Chủ động đọc và áp dụng `.agents/skills/create-pos-spec/SKILL.md` trước khi làm spec; đối chiếu tài liệu, trình bản nháp, hỏi các quyết định còn mở và chỉ ghi vào `specs/` sau khi đã chốt. Thông tin có sẵn không thay thế bước rà và chốt. | chưa ghi | có hiệu lực |
| M-18 | Hay quên | http, delete, no-content | API Guard validate Content-Type application/json và Frontend fetch client xử lý response status. | Request `DELETE` thông thường không có body; `JsonBodyGuard` phải bỏ qua kiểm tra Content-Type cho `DELETE` để không trả 400 sai. Phía client UI `request()` phải kiểm tra `response.status === 204` để trả về `undefined` thay vì parse JSON `response.json()` gây crash `UNKNOWN` error. | chưa ghi | có hiệu lực |
| M-19 | Đã học được | auth, qa, uuid, seed | Tạo fixture / seed dữ liệu PostgreSQL cho user, store, session liên quan xác thực JWT. | `AccessGuard` và `AuthService.authenticateAccess` dùng regex kiểm tra claims UUID chuẩn RFC 4122 Variant 1 (`[89ab][0-9a-f]{3}` ở nhóm 4). Nếu tự viết UUID bằng tay có nhóm 4 bắt đầu bằng ký tự khác (như `0`, `4`), token JWT sẽ bị từ chối và văng 401 UNAUTHENTICATED ngay sau khi login 200. Khi seed, luôn dùng `gen_random_uuid()` của PostgreSQL hoặc hàm sinh UUID v4 chuẩn. | chưa ghi | có hiệu lực |
| M-20 | Đã học được | db, postgres, test | Lấy khóa bi quan (pessimistic write) trong PostgreSQL và chạy bộ test tích hợp backend. | (1) PostgreSQL cấm `FOR UPDATE` trên nullable side của `LEFT JOIN`. Luôn tách thành câu lệnh khóa base entity (`innerJoin`) với `.setLock('pessimistic_write', undefined, ['alias'])`, rồi đọc quan hệ nullable ở câu lệnh tiếp theo trong cùng transaction. (2) Runner `node --test` mặc định chạy song song các file test; khi nhiều integration test cùng chạy trên một DB PostgreSQL có khóa dòng dài sẽ gây nghẽn `statement_timeout (57014)`. Cần chỉ định `--test-concurrency=1` để chạy tuần tự các suite kiểm thử cơ sở dữ liệu. | chưa ghi | có hiệu lực |
| M-21 | Đã học được | db, typeorm, returning | Dùng `manager.query()` hoặc QueryRunner với SQL `UPDATE ... RETURNING *` trong backend. | Kết quả là `[rows, rowCount]`; lấy `rows[0]` để đọc bản ghi, không destructure phần tử đầu trực tiếp thành row. Thêm test PATCH qua PostgreSQL khi thay đổi mẫu truy vấn này. | chưa ghi | có hiệu lực |
| M-22 | Hay quên | records, migration, backup | Đổi tên, di chuyển, thay thế hoặc xóa hàng loạt hồ sơ trong `.devloopflow/` (hiện chưa được Git theo dõi) hoặc sửa hàng loạt tham chiếu giữa tài liệu. | Trước khi làm, hỏi user trạng thái đích một lần (yêu cầu như "đổi tên theo quy ước" hay "chuyển vào thư mục cùng tên" có nhiều cách hiểu) và nén bản sao lưu các file `.md`/`.json` sẽ bị sửa vào scratchpad; không xóa bản duy nhất của một dạng (vd bản nhập có link đã sửa) khi chưa có cách sinh lại và kiểm chứng. Sau khi làm, kiểm bằng SHA-256 theo manifest và quét số link tương đối hỏng trước/sau. | 1 | có hiệu lực |
| M-23 | Ý của user | records, legacy, layout | Sắp xếp hồ sơ lịch sử nhập từ các thư mục gốc cũ (`specs`, `plans`, `tasks`, `errors`, `qa-evidence`) trong `.devloopflow/`. | Mỗi hồ sơ lịch sử chỉ có MỘT file, đúng byte, giữ tên gốc `YYYY-MM-DD-ten.md`, nằm trong `.devloopflow/specs|plans|tasks|errors/`. Không tạo `legacy-originals/`, không dùng tiền tố `legacy-`, không đổi tên sang `YYYYMMDD-` trừ khi user yêu cầu lại. QA lịch sử: mỗi lần chạy là `.devloopflow/verify/<tên lần chạy gốc>/` (báo cáo) + `evidence/` (raw), không tạo thư mục kiểu `legacy-qa-evidence/`. Tuân cấu trúc và tên của plugin, giữ tên gốc của hồ sơ, KHÔNG tự đặt tên mới; chưa rõ chỗ đặt thì hỏi. Đổi bố cục thì hỏi user trước, không thử lần lượt từng kiểu. | 3 | có hiệu lực |
| M-24 | Đã học được | tooling, windows, python | Chạy script Python có ký tự gạch chéo ngược (`\`) qua heredoc của công cụ Bash trong Claude Code trên Windows. | Heredoc làm mất hoặc đổi `\`, gây `SyntaxError: unterminated string literal`. Ghi script bằng công cụ Write vào scratchpad rồi chạy `python <file>`, hoặc dùng `chr(92)`; không nhúng `\` vào heredoc. | 2 | có hiệu lực |
| M-25 | Đã học được | graphify, claude, hooks | Cài hoặc cấu hình Graphify cho Claude Code theo phạm vi dự án thay vì global. | Graphify không có cờ cài theo project: sao chép `~/.claude/skills/graphify` vào `.claude/skills/graphify`, chạy `graphify claude install`, rồi sửa lệnh hook trong `.claude/settings.json` từ đường dẫn tuyệt đối (`C:/Users/.../graphify.EXE`) thành `graphify hook-guard <search\|read\|compact>` để không gãy trên máy khác; kiểm bằng `graphify hook-guard <chế độ>` (exit 0) và `graphify query`. | 1 | có hiệu lực |
| M-26 | Hay quên | records, tests, ci, paths | Di chuyển, đổi tên hoặc xóa thư mục tài liệu (`specs`, `plans`, `tasks`, `errors`, `qa-evidence`...) trong repo. | Trước khi commit, tìm cả tên thư mục trần (`specs`, `qa-evidence`...) trong `POS_API/src`, `POS_UI/src`, `POS_UI/test`, `.github`, vì test có thể đọc file bằng `resolve(__dirname, '../..', 'specs', file)` mà grep chuỗi `specs/` không thấy; rồi chạy toàn bộ `npm test` của POS_API (cần PostgreSQL) hoặc ít nhất các test không cần DB, và xem CI sau khi push. | 1 | có hiệu lực |
| M-27 | Đã học được | ci, github, logs | Debug CI GitHub Actions khi `gh run view --log` hoặc `--log-failed` không hiện dòng `not ok`. | `gh` cắt log lớn (log step test của POS_API ~12 MB, `gh` chỉ trả ~2.200 dòng). Tải log gốc bằng `gh api repos/<owner>/<repo>/actions/runs/<run_id>/logs > logs.zip`, đọc file `Backend API (POS_API)/8_Run unit & integration tests.txt` trong zip (giải nén vào thư mục riêng, đọc bằng `python -I`), tìm `not ok`, `# fail`, `failureType` và `##[error]`. Tên repo trong URL là tên mới `POS-Food-And-Beverage`. | 1 | có hiệu lực |
| M-28 | Hay quên | ui, tests, node-vm | Sửa giao diện của `LivePosScreen.tsx`, `LivePaymentDialog.tsx`, `SettingsScreen.tsx` hoặc màn nào có test nạp mã nguồn bằng `node:vm`. | Trước khi thêm import mới (kể cả `lucide-react`, `Dialog`) hoặc đổi cấu trúc nút, mở test của màn đó: `require` giả ném lỗi với module lạ, React giả không render component hàm tự định nghĩa, và nhiều câu kiểm so chuỗi chính xác nội dung nút (`'Đóng'`, `'Thanh toán'`, `'+'`, `'−'`). Thêm mock vào harness thay vì bỏ import; giữ chữ trên nút và đặt biểu tượng ngoài thẻ `<p role="alert">` khi test so cả nội dung thẻ. | 1 | có hiệu lực |
| M-29 | Hay quên | migration, test, foundation, plan | Plan hoặc task thêm một migration mới trong `POS_API/src/database/migrations/`. | Kiểm và đưa vào plan việc cập nhật số migration gắn cứng ở `POS_API/src/foundation.test.ts:37` (`runMigrations().length`), cùng chạy toàn bộ `npm test` ngay sau khi thêm migration. | 1 | có hiệu lực |
| M-30 | Hay quên | plan, sales, error-order, test | Plan ghi một thay đổi hợp đồng lỗi hoặc thứ tự các kiểm tra (scope/quyền/trạng thái) của hàm có sẵn, ví dụ mục 'Ảnh hưởng tới code hiện có'. | Thêm AC và test HTTP riêng cho chính thay đổi đó với người gọi thiếu điều kiện (không có ca, `branch_id` NULL, ngoài phạm vi), rồi kiểm bằng đột biến 'đảo thứ tự' để có test đỏ; không chỉ ghi chú trong plan. | 1 | có hiệu lực |
| M-31 | Hay quên | test, flaky, clock, shifts | Viết test seed mốc thời gian (`started_at`, `created_at`) bằng đồng hồ DB `now()` rồi gọi API ghi mốc sau bằng đồng hồ Node (`new Date()`), đặc biệt khi PostgreSQL chạy trong Docker. | Seed mốc lùi (`now() - interval '1 minute'`) hoặc dùng cùng một đồng hồ; không dựa vào hai đồng hồ khớp nhau. Đồng hồ container Postgres lệch host tới ±1 s và có thể đổi sau khi Docker Desktop khởi động lại. | 1 | có hiệu lực |
| M-32 | Đã học được | test, node-test, command | Chạy một case của `node --test` bằng `--test-name-pattern` khi test nằm lồng trong subtest (ví dụ `[R14-1]` trong `payment.integration.test.js`). | Dùng pattern theo tên test CHA; pattern khớp subtest không chạy được test cha nên lệnh báo `pass 1` mà thực tế không chạy gì. Xác nhận số test đã chạy trong output trước khi coi là xanh. | 1 | có hiệu lực |
| M-33 | Quy trình | verify-ac, subagent, report | Giao `ac-verifier` (hoặc subagent khác) ghi `report-<n>.md`, `fails.md` dưới `.devloopflow/verify/<id>/`. | Dặn subagent trả toàn bộ nội dung report ở cuối câu trả lời (Write bị từ chối trong ngữ cảnh subagent: 'Subagents should return findings as text'); agent chính tự mở bằng chứng thô (đếm `# pass`, `pass:false`, `cleanup.txt`) rồi mới chép vào file, và ghi rõ điều đó trong report. | 1 | có hiệu lực |
| M-34 | Đã học được | env, docker, database, test | Chạy `npm test` hoặc migration cho `POS_API` trên máy Windows của dự án. | `DATABASE_URL` trong `POS_API/.env` có thể không dùng được (cổng 5432 là relay WSL, sai mật khẩu); dùng PostgreSQL Docker `pos_infra-postgres-1` ở `127.0.0.1:15432` với `POSTGRES_USER/PASSWORD/DB` từ `POS_INFRA/.env.local`, dựng URL trong lệnh, không in hay ghi bí mật. Sau khi Docker Desktop khởi động lại, container thoát mã 255: `docker start pos_infra-postgres-1`. | 1 | có hiệu lực |
| M-35 | Quy trình | tdd, mutation, subagent | Giao `tdd` kiểm đột biến bằng script tự động trên file production. | Yêu cầu `timeout` cho mỗi lần chạy, khôi phục file bằng `cmp` với bản sao sau MỖI đột biến và xác nhận lại bằng `grep`; không dùng đột biến gây treo (ví dụ đưa `INSERT` ra ngoài transaction) và agent chính kiểm `git diff` file production sau khi `tdd` báo xong. | 1 | có hiệu lực |
| M-36 | Ý của user | workflow, communication, approval | Trình user các câu hỏi làm rõ, đề xuất hoặc thuật ngữ kỹ thuật cần user duyệt. | Giải thích từng điểm bằng lời thường (đề xuất là gì, vì sao, hậu quả nếu chọn khác) trước khi xin duyệt; gọi tên thuật ngữ (flaky, 'chưa chắc', bước 10c) kèm nghĩa; không coi 'đồng ý hết' khi user nói chưa hiểu. | 1 | có hiệu lực |

Ghi chú M-11..M-21: “chưa ghi” ở cột **Số lần** nghĩa là `MEMORY.md` gốc không có bộ đếm số lần cùng bài học tái diễn. Đây không phải 0 lần và không phải số test/chứng cứ. Khi có lần tái diễn mới, ghi căn cứ và ngày rồi bắt đầu đếm các lần **sau chuyển đổi**; không suy ngược số lần lịch sử.

<!-- Loại: Hay quên | Đã học được | Ý của user | Quy trình. Tag: module hoặc loại việc, cách nhau dấu phẩy. Trạng thái: có hiệu lực | hết hiệu lực. -->

## Chi tiết

### M-1
- loại: Hay quên
- tag: sales, branch-scope, permission
- khi nào áp dụng: sửa hoặc thêm kiểm tra phạm vi chi nhánh/store ở API (hàm `invoice()`, truy vấn lọc theo `branchId`)
- quy tắc: sửa kiểm phạm vi ở MỌI điểm vào cùng bảng (grep `branchId` trong module), không chỉ điểm finding nêu; kiểm cả trường hợp thiếu `branchId` mà không có `branch.access_all`.
- vì sao: cùng một lỗi lặp lại qua ba đợt review vì mỗi lần chỉ sửa một điểm.
- bằng chứng: task `20261109-sprint08-payment` — R1-1 (vòng 1, `POS_API/src/sales/transfer-attempts.service.ts:24`, `sales.service.ts:46`); R3-1 (vòng 3, `transfer-attempts.service.ts:104-106` còn sót ở `cancelTransferAttempt`); backlog B-2 (fail-open khi `branchId` rỗng, `transfer-attempts.service.ts:24`, `sales.service.ts:46`, sửa 10/11/2026). Errors: `.devloopflow/errors/20261109-owner-access-all-branch-scope.md`, `.devloopflow/errors/20261110-backlog-branch-scope-null-branchid-fail-open.md`.
- số lần: 3
- ghi lần đầu: 2026-11-09 (task 20261109-sprint08-payment)
- cập nhật gần nhất: 2026-11-10
- trạng thái: có hiệu lực

### M-2
- loại: Hay quên
- tag: payment, webhook, sepay, schema
- khi nào áp dụng: chốt schema hoặc validate dữ liệu đến từ provider bên thứ ba (webhook, mã tham chiếu, sự kiện trùng)
- quy tắc: đối chiếu tài liệu chính thức của provider về trường có thể rỗng, khóa trùng và số lần retry trước khi viết ràng buộc DB; ghi nguồn vào plan.
- vì sao: plan yêu cầu `transaction_ref` khác rỗng nhưng SePay cho phép `referenceCode` rỗng; cần đổi plan giữa chừng.
- bằng chứng: task `20261109-sprint08-payment`, dòng 38 (ST-6: "SePay chính thức cho phép `referenceCode` rỗng", nguồn `https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook`); dòng 37 (hai `provider_event_id` cùng ref, SePay retry tối đa 8 lần trong khoảng 33 phút). Plan đã đổi qua delta duyệt ngày 09/11/2026.
- số lần: 1
- ghi lần đầu: 2026-11-09 (task 20261109-sprint08-payment)
- cập nhật gần nhất: 2026-11-09
- trạng thái: có hiệu lực

### M-3
- loại: Hay quên
- tag: ui, dialog, state
- khi nào áp dụng: thêm hoặc sửa trạng thái chờ (pending, uncertain, busy) trong component có polling hoặc retry (`POS_UI/src/features/pos/LivePaymentDialog.tsx`)
- quy tắc: khi trạng thái chờ biến mất do poll, reset đồng bộ mọi cờ liên quan (`uncertain`, `pending`) trong cùng một bước, và có test cho nhánh đó.
- vì sao: một cờ không được reset làm dialog kẹt, và yêu cầu cũ chặn mọi thao tác sau đó.
- bằng chứng: task `20261109-sprint08-payment`, finding R3-3 (vòng 3, `LivePaymentDialog.tsx:34-42,60-62,72-73,120`); backlog B-1 đã sửa 10/11/2026 (test `POS_UI/test/live-payment.test.mjs::[B-1]`, errors `.devloopflow/errors/20261110-backlog-payment-dialog-stuck-uncertain.md`).
- số lần: 2
- ghi lần đầu: 2026-11-09 (task 20261109-sprint08-payment)
- cập nhật gần nhất: 2026-11-10
- trạng thái: có hiệu lực

### M-4
- loại: Hay quên
- tag: docs, api-spec, errors, spec
- khi nào áp dụng: thêm mã lỗi mới hoặc đổi điều kiện trả lỗi của endpoint
- quy tắc: cập nhật danh sách lỗi của spec (`specs/`) và `docs/api-spec.md` cùng lúc với code; sau đó grep mã lỗi mới trong toàn bộ tài liệu.
- vì sao: đổi hành vi `payment-preview` (409 `INVOICE_NOT_OPEN`) không cập nhật spec.
- bằng chứng: backlog B-3 (đã sửa 10/11/2026, `POS_API/src/sales/sales.service.ts` hàm `paymentPreview`); `specs/invoices.md:65` chưa liệt kê `409 INVOICE_NOT_OPEN`; `docs/api-spec.md:353` mô tả `INVOICE_NOT_OPEN` chưa có xem trước thanh toán. Đề xuất D-6, D-7 đang chờ duyệt trong task `20261109-sprint08-payment`, mục "Cập nhật tài liệu".
- số lần: 1
- ghi lần đầu: 2026-11-10 (task 20261109-sprint08-payment)
- cập nhật gần nhất: 2026-11-10
- trạng thái: có hiệu lực

### M-5
- loại: Hay quên
- tag: docs, status, third-party
- khi nào áp dụng: sau khi verify-ac chuyển một AC từ `mở` sang `PASS`, hoặc sau khi một tích hợp đổi trạng thái (môi trường thử, go-live)
- quy tắc: rà tài liệu có câu trạng thái ("chưa kiểm", "chưa triển khai", "dự kiến", "khi triển khai") và cập nhật trong cùng task, không để sang task sau.
- vì sao: sau V1-4 PASS, `THIRD_PARTY_INTEGRATIONS.md` và `AGENTS.md`/`CLAUDE.md` vẫn ghi "chưa kiểm SePay Test mode".
- bằng chứng: task `20261109-sprint08-payment`, finding R4-3 (vòng 4, `AGENTS.md:29`); `THIRD_PARTY_INTEGRATIONS.md:3,10,12` (còn "chưa kiểm", "chưa chạy Mô phỏng giao dịch"); verify-ac vòng 10, `.devloopflow/verify/20261109-sprint08-payment/report-10.md`. AGENTS/CLAUDE đã sửa theo B-5 (10/11/2026); phần `THIRD_PARTY` đang chờ duyệt D-1..D-4.
- số lần: 2
- ghi lần đầu: 2026-11-09 (task 20261109-sprint08-payment)
- cập nhật gần nhất: 2026-11-10
- trạng thái: có hiệu lực

### M-6
- loại: Quy trình
- tag: tdd, qa-evidence, subagent
- khi nào áp dụng: giao `tdd` cho một việc nhiều bước hoặc chạy lâu, có khả năng bị giới hạn phiên
- quy tắc: yêu cầu worker ghi log RED và GREEN, và output test, vào `qa-evidence/<run>/` ngay từng bước; agent chính kiểm các log đó trước khi tick hoặc báo đạt.
- vì sao: ba task ST-6, ST-7, ST-8 bị ngắt giữa chừng, lịch sử TDD không khôi phục được, nên không tick được và phải kiểm lại từ đầu.
- bằng chứng: task `20261109-sprint08-payment`, dòng 28 (ST-8), 31 (ST-6 "không thể tái tạo trung thực thứ tự TDD lịch sử"), 36 (ST-6 tiếp quản sau khi agent trước bị giới hạn phiên), 39, 45.
- số lần: 3
- ghi lần đầu: 2026-11-09 (task 20261109-sprint08-payment)
- cập nhật gần nhất: 2026-11-10
- trạng thái: có hiệu lực

### M-7
- loại: Quy trình
- tag: verify-ac, sandbox, environment
- khi nào áp dụng: trước vòng verify-ac cần app, container hoặc DB đang chạy
- quy tắc: xác nhận trước với user quyền khởi động môi trường (container, `Start-Process`, port); khi lệnh bị chặn `blocked by policy`, dừng và báo user, không lặp lại lệnh bị chặn trong cùng vòng.
- vì sao: ba vòng verify-ac (vòng 4, 5, 6) không thu được bằng chứng HTTP/DB vì khởi động app bị chặn, làm AC mở thêm nhiều vòng.
- bằng chứng: `.devloopflow/verify/20261109-sprint08-payment/fails.md` dòng 105-114 (lịch sử lần 4-6, "blocked by policy"); `report-4.md`, `report-5.md`, `report-6.md`; task `20261109-sprint08-payment` dòng 25. Vòng 7 chạy được sau khi user cấu hình lại môi trường.
- số lần: 1
- ghi lần đầu: 2026-11-09 (task 20261109-sprint08-payment)
- cập nhật gần nhất: 2026-11-10
- trạng thái: có hiệu lực

### M-8
- loại: Đã học được
- tag: config, secret, auth, test-fixture
- khi nào áp dụng: siết ngưỡng độ dài hoặc thêm yêu cầu cấu hình bắt buộc cho một secret
- quy tắc: kiểm mọi fixture test đang dùng giá trị cũ (grep tên biến môi trường trong `POS_API/src/**/tests/`) trước khi siết; nếu fixture phải đổi thì hỏi user, không tự đổi.
- vì sao: siết `SEPAY_WEBHOOK_SECRET` lên 32 byte làm 5 subtest ST-7 đỏ vì fixture 31 byte; user đã đồng ý đổi fixture trước khi sửa.
- bằng chứng: backlog B-4 (`POS_API/src/auth/auth-config.ts`, test `[B-4]` trong `POS_API/src/auth/tests/auth-config.test.ts`, fixture `POS_API/src/sales/tests/payment.integration.test.ts:95` đổi sang 33 byte sau đồng ý của user, 10/11/2026); errors `.devloopflow/errors/20261110-backlog-sepay-secret-minimum-length.md`.
- số lần: 1
- ghi lần đầu: 2026-11-10 (task 20261109-sprint08-payment)
- cập nhật gần nhất: 2026-11-10
- trạng thái: có hiệu lực

### M-9
- loại: Quy trình
- tag: qa, acceptance, evidence, provenance
- khi nào áp dụng: chuẩn bị kiểm AC có nhiều vế hoặc có UI/API thay đổi giữa các lần kiểm.
- quy tắc: lập ma trận từng vế AC với artifact trước khi chạy và lưu hash mã được kiểm cùng bằng chứng.
- vì sao: bằng chứng thiếu cho từng chuyển trạng thái và thiếu hash nguồn làm phải kiểm lại dù không phát hiện lỗi sản phẩm.
- bằng chứng: task `20261109-sprint08-payment`, verify-ac vòng 14 V14-1/V14-2 tại `.devloopflow/verify/20261109-sprint08-payment/report-14.md`, vòng 15 tại `report-15.md`, vòng 17 và manifest tại `qa-evidence/20261111-194533-48ed476-s8-verify-ac-r17/run.md`.
- số lần: 1
- ghi lần đầu: 2026-11-12 (task 20261109-sprint08-payment)
- cập nhật gần nhất: 2026-11-12
- trạng thái: có hiệu lực

### M-10
- loại: Hay quên
- tag: permission, roles, integration-test
- khi nào áp dụng: thêm hoặc thay đổi quyền theo vai trò trong API.
- quy tắc: kiểm hành vi qua HTTP bằng vai trò thật, gồm ca được phép và các trường hợp thiếu điều kiện hoặc sai phạm vi.
- vì sao: kiểm bảng cấp quyền không chứng minh thao tác thực hiện được hoặc bị từ chối đúng điều kiện.
- bằng chứng: task `20261109-sprint08-payment`, finding R16-2 và review vòng 17; `POS_API/src/sales/tests/manager-cancel.integration.test.ts` các ca `[MGR-CANCEL-1..4]`; `.devloopflow/errors/20261111-manager-cancel-open-behavior-untested.md`.
- số lần: 1
- ghi lần đầu: 2026-11-12 (task 20261109-sprint08-payment)
- cập nhật gần nhất: 2026-11-12
- trạng thái: có hiệu lực

## Lịch sử (chỉ thêm, không xoá)
- 2026-11-13 — task 20261112-sprint09-drawer-cancel-invoices — thêm M-29 (số migration gắn cứng), M-30 (đổi thứ tự kiểm tra cần AC), M-31 (seed thời gian bằng đồng hồ DB), M-32 (`--test-name-pattern` subtest), M-33 (subagent không ghi report), M-34 (DATABASE_URL/Docker), M-35 (đột biến treo), M-36 (ý user: giải thích trước khi duyệt); ghi chú vào M-17 (skill create-pos-spec không tồn tại).
- 2026-11-12 — task 20261109-sprint08-payment — thêm M-9 (ma trận chứng cứ và hash), M-10 (test hành vi quyền qua HTTP).
- 2026-11-09 — task 20261109-sprint08-payment — thêm M-2 (đối chiếu tài liệu provider), M-1 (phạm vi chi nhánh, lần đầu), M-3 (trạng thái chờ), M-5 (rà tài liệu sau PASS), M-6 (tdd bị ngắt), M-7 (verify-ac bị chặn).
- 2026-11-10 — task 20261109-sprint08-payment — thêm M-4 (mã lỗi và spec), M-8 (secret và fixture); cập nhật M-1 (số lần 3), M-3 (số lần 2), M-5 (số lần 2), M-6 (số lần 3) theo backlog B-1..B-4 và sync-docs.

## Bài học nhập từ MEMORY.md gốc (2026-11-12)

### M-11
- loại: Hay quên
- tag: ui, state, query-key
- khi nào áp dụng: UI đổi tab/filter/cursor và tái sử dụng state danh sách với các kiểu row khác nhau.
- quy tắc: Generation guard ở promise callback chưa đủ; render đầu tiên sau đổi tab vẫn có thể nhận rows cũ trước useEffect. Gắn rows với query key và chỉ render bảng khi key khớp, hiện loading trong khoảng chuyển tiếp. Test phải thực thi callback cột, không chỉ stub bảng rồi kiểm props.
- vì sao: Bài học lịch sử nhập từ MEMORY.md gốc; không xác minh lại trong đợt chuyển hồ sơ.
- bằng chứng: `errors/2026-10-30-pb13-tab-row-shape.md`; browser thực crash BigInt(undefined), ui-tests-7 red và ui-tests-8/final28test green; artifact ở hai run PB-13 ngày30/10 và01/11/2026.. Nguồn gốc: MEMORY.md mục Gắn dữ liệu render với khóa truy vấn hiện hành.
- số lần: chưa ghi trong nguồn lịch sử
- ghi lần đầu: không ghi trong nguồn lịch sử
- cập nhật gần nhất: 2026-11-12 (chuyển hồ sơ, không tái xác minh)
- trạng thái: có hiệu lực

### M-12
- loại: Hay quên
- tag: auth, http-client, identity
- khi nào áp dụng: HTTP client khôi phục cookie/refresh và thử lại request khi nhiều tab có thể đổi tài khoản/store/branch.
- quy tắc: Capture identity và session epoch trước request; sau async CSRF/restore phải đối chiếu trước phát mutation hoặc retry. Broadcast/unmount chỉ chặn setState, không ngăn fetch cũ ghi dữ liệu dưới danh tính mới. Chỉ nhớ identity từ kết quả auth đã qua generation guard.
- vì sao: Bài học lịch sử nhập từ MEMORY.md gốc; không xác minh lại trong đợt chuyển hồ sơ.
- bằng chứng: `errors/2026-10-30-pb13-session-retry-scope.md`; ui-tests-4 red, regression final green và browser B32 old-cookie401/noXS trong `qa-evidence/20261030-214100-9ce75dd-pb13-organization-ui/`.. Nguồn gốc: MEMORY.md mục Không replay request qua thay đổi danh tính.
- số lần: chưa ghi trong nguồn lịch sử
- ghi lần đầu: không ghi trong nguồn lịch sử
- cập nhật gần nhất: 2026-11-12 (chuyển hồ sơ, không tái xác minh)
- trạng thái: có hiệu lực

### M-13
- loại: Hay quên
- tag: ui, toast, session
- khi nào áp dụng: Provider hiển thị toast hoặc trạng thái tạm sống xuyên logout/login hay đổi user/store.
- quy tắc: Xóa thông báo cũ khi danh tính hoặc trạng thái xác thực đổi; kiểm bằng browser sau logout/login cửa hàng khác, kể cả toast lỗi không tự biến mất.
- vì sao: Bài học lịch sử nhập từ MEMORY.md gốc; không xác minh lại trong đợt chuyển hồ sơ.
- bằng chứng: `errors/2026-11-05-toast-leak-between-sessions.md`; ảnh lỗi trước và QA tự chạy lại B09 PASS tại `qa-evidence/20261105-213954-1132f12-sprint05-qa-b09-retest/run.md`.. Nguồn gốc: MEMORY.md mục Xóa thông báo UI khi đổi phiên.
- số lần: chưa ghi trong nguồn lịch sử
- ghi lần đầu: không ghi trong nguồn lịch sử
- cập nhật gần nhất: 2026-11-12 (chuyển hồ sơ, không tái xác minh)
- trạng thái: có hiệu lực

### M-14
- loại: Đã học được
- tag: db, transaction, locking
- khi nào áp dụng: PostgreSQL READ COMMITTED, truy vấn JOIN quan hệ mutable cùng FOR UPDATE và phải chờ transaction khác sửa khóa ngoại.
- quy tắc: Lấy khóa dòng gốc trong scope bằng statement riêng, rồi đọc lại quan hệ trong statement sau của cùng transaction; kiểm thử thứ tự chờ khóa thật bằng pg_locks/pg_blocking_pids. JOIN trước khi chờ có thể trả thiếu dòng sau khi khóa ngoại đổi, gây401/404 sai.
- vì sao: Bài học lịch sử nhập từ MEMORY.md gốc; không xác minh lại trong đợt chuyển hồ sơ.
- bằng chứng: `errors/2026-10-30-pb04-login-role-lock-race.md`; acceptance-3.log.gz tái hiện login401 và acceptance-6.log.gz tái hiện reset/disable404; full-2.log.gz xác minh14 lịch khóa sau sửa tại `qa-evidence/20261030-202325-9ce75dd-pb04-gap-fix/`.. Nguồn gốc: MEMORY.md mục Khóa dòng trước khi đọc quan hệ có thể thay đổi.
- số lần: chưa ghi trong nguồn lịch sử
- ghi lần đầu: không ghi trong nguồn lịch sử
- cập nhật gần nhất: 2026-11-12 (chuyển hồ sơ, không tái xác minh)
- trạng thái: có hiệu lực

### M-15
- loại: Hay quên
- tag: auth, permission, uuid
- khi nào áp dụng: Khi so actor với ID tài nguyên, đặc biệt chặn tự khóa/tự hạ quyền.
- quy tắc: So với ID chuẩn đọc từ DB hoặc chuẩn hóa đồng nhất; không so UUID path thô bằng chuỗi JavaScript. PostgreSQL coi UUID viết hoa/thường là một ID, JavaScript so chuỗi thì khác. Thêm tình huống UUID viết hoa cho guard tự thao tác.
- vì sao: Bài học lịch sử nhập từ MEMORY.md gốc; không xác minh lại trong đợt chuyển hồ sơ.
- bằng chứng: `errors/2026-10-30-pb04-staff-authorization.md`, USR-HIER trong `qa-evidence/20261030-193116-9ce75dd-pb04/uuid-red.log` tái hiện200 thay403; `final-approved.log` xác minh UUID thường/hoa đều bị từ chối sau sửa.. Nguồn gốc: MEMORY.md mục So sánh UUID chuẩn trong kiểm tra quyền.
- số lần: chưa ghi trong nguồn lịch sử
- ghi lần đầu: không ghi trong nguồn lịch sử
- cập nhật gần nhất: 2026-11-12 (chuyển hồ sơ, không tái xác minh)
- trạng thái: có hiệu lực

### M-16
- loại: Quy trình
- tag: qa, acceptance, evidence
- khi nào áp dụng: Khi kiểm tra hoặc báo hoàn thành tiêu chí nghiệm thu.
- quy tắc: Đối chiếu từng vế của spec/docs đã chốt với mã/UI cuối, tình huống kiểm tra và artifact gốc; mở lại ảnh, log, request/response và trạng thái DB khi cần để xác nhận đúng commit và kết quả. Không suy diễn từ test pass, ảnh đơn lẻ hay chứng cứ phiên bản cũ; không dựng chứng cứ từ trí nhớ. Thiếu hoặc mâu thuẫn thì ghi **chưa xác minh**, để trống tiêu chí và chạy lại để thu chứng cứ thật.
- vì sao: Bài học lịch sử nhập từ MEMORY.md gốc; không xác minh lại trong đợt chuyển hồ sơ.
- bằng chứng: Yêu cầu người dùng trong phiên 2026-10-29; quy tắc “Bằng chứng thực thi QA” trong `AGENTS.md`.. Nguồn gốc: MEMORY.md mục Nghiệm thu cần chứng cứ gốc đầy đủ.
- số lần: chưa ghi trong nguồn lịch sử
- ghi lần đầu: không ghi trong nguồn lịch sử
- cập nhật gần nhất: 2026-11-12 (chuyển hồ sơ, không tái xác minh)
- trạng thái: có hiệu lực

### M-17
- loại: Quy trình
- tag: spec, pos, product-owner
- khi nào áp dụng: Khi phỏng vấn, tạo, sửa hoặc rà soát đặc tả chức năng hay endpoint POS, kể cả khi việc viết spec là một bước trong task triển khai.
- quy tắc: Chủ động đọc và áp dụng `.agents/skills/create-pos-spec/SKILL.md` trước khi làm spec; đối chiếu tài liệu, trình bản nháp, hỏi các quyết định còn mở và chỉ ghi vào `specs/` sau khi đã chốt. Thông tin có sẵn không thay thế bước rà và chốt.
- vì sao: Bài học lịch sử nhập từ MEMORY.md gốc; không xác minh lại trong đợt chuyển hồ sơ.
- bằng chứng: Người dùng nhắc kiểm tra việc dùng skill khi lập `specs/platform.md` ngày 2026-10-30; phần mô tả và quy trình của `.agents/skills/create-pos-spec/SKILL.md`.. Nguồn gốc: MEMORY.md mục Dùng skill khi làm đặc tả POS.
- số lần: chưa ghi trong nguồn lịch sử
- ghi lần đầu: không ghi trong nguồn lịch sử
- cập nhật gần nhất: 2026-11-13 — ghi chú: khi chạy task 20261112-sprint09-drawer-cancel-invoices, `.agents/skills/create-pos-spec/SKILL.md` KHÔNG tồn tại trên đĩa (Glob `**/create-pos-spec/**` không có kết quả), nên không áp dụng được; viết spec theo skill `devloopflow:write-spec`. Cần user xác nhận skill này còn dùng hay đã bị xóa.
- trạng thái: có hiệu lực

### M-18
- loại: Hay quên
- tag: http, delete, no-content
- khi nào áp dụng: API Guard validate Content-Type application/json và Frontend fetch client xử lý response status.
- quy tắc: Request `DELETE` thông thường không có body; `JsonBodyGuard` phải bỏ qua kiểm tra Content-Type cho `DELETE` để không trả 400 sai. Phía client UI `request()` phải kiểm tra `response.status === 204` để trả về `undefined` thay vì parse JSON `response.json()` gây crash `UNKNOWN` error.
- vì sao: Bài học lịch sử nhập từ MEMORY.md gốc; không xác minh lại trong đợt chuyển hồ sơ.
- bằng chứng: Sửa `JsonBodyGuard` trong `POS_API/src/http/request-validation.ts` và `request()` trong `POS_UI/src/http/client.ts`; xác minh qua `menu.integration.test.ts` (MENU-01, MENU-02) và `menu-service.test.mjs` (PB13-MENU-HTTP).. Nguồn gốc: MEMORY.md mục JsonBodyGuard và HTTP Client cho các request DELETE / 204 No Content.
- số lần: chưa ghi trong nguồn lịch sử
- ghi lần đầu: không ghi trong nguồn lịch sử
- cập nhật gần nhất: 2026-11-12 (chuyển hồ sơ, không tái xác minh)
- trạng thái: có hiệu lực

### M-19
- loại: Đã học được
- tag: auth, qa, uuid, seed
- khi nào áp dụng: Tạo fixture / seed dữ liệu PostgreSQL cho user, store, session liên quan xác thực JWT.
- quy tắc: `AccessGuard` và `AuthService.authenticateAccess` dùng regex kiểm tra claims UUID chuẩn RFC 4122 Variant 1 (`[89ab][0-9a-f]{3}` ở nhóm 4). Nếu tự viết UUID bằng tay có nhóm 4 bắt đầu bằng ký tự khác (như `0`, `4`), token JWT sẽ bị từ chối và văng 401 UNAUTHENTICATED ngay sau khi login 200. Khi seed, luôn dùng `gen_random_uuid()` của PostgreSQL hoặc hàm sinh UUID v4 chuẩn.
- vì sao: Bài học lịch sử nhập từ MEMORY.md gốc; không xác minh lại trong đợt chuyển hồ sơ.
- bằng chứng: Debug và fix lỗi `GET /api/v1/auth/me 401` trong `run-e2e.mjs` tại `qa-evidence/20261102-e2e-chrome-docker-sprints-1-4/run.md`.. Nguồn gốc: MEMORY.md mục Luôn dùng UUID v4 chuẩn RFC 4122 khi seed dữ liệu.
- số lần: chưa ghi trong nguồn lịch sử
- ghi lần đầu: không ghi trong nguồn lịch sử
- cập nhật gần nhất: 2026-11-12 (chuyển hồ sơ, không tái xác minh)
- trạng thái: có hiệu lực

### M-20
- loại: Đã học được
- tag: db, postgres, test
- khi nào áp dụng: Lấy khóa bi quan (pessimistic write) trong PostgreSQL và chạy bộ test tích hợp backend.
- quy tắc: (1) PostgreSQL cấm `FOR UPDATE` trên nullable side của `LEFT JOIN`. Luôn tách thành câu lệnh khóa base entity (`innerJoin`) với `.setLock('pessimistic_write', undefined, ['alias'])`, rồi đọc quan hệ nullable ở câu lệnh tiếp theo trong cùng transaction. (2) Runner `node --test` mặc định chạy song song các file test; khi nhiều integration test cùng chạy trên một DB PostgreSQL có khóa dòng dài sẽ gây nghẽn `statement_timeout (57014)`. Cần chỉ định `--test-concurrency=1` để chạy tuần tự các suite kiểm thử cơ sở dữ liệu.
- vì sao: Bài học lịch sử nhập từ MEMORY.md gốc; không xác minh lại trong đợt chuyển hồ sơ.
- bằng chứng: Sửa lỗi 500 đóng ca trong `shifts.service.ts` (SHIFT-01) và cấu hình `--test-concurrency=1` trong `POS_API/package.json` tại Sprint 5. Xác minh qua 65/65 pass toàn bộ 15 test suites `npm --prefix POS_API test`.. Nguồn gốc: MEMORY.md mục Tránh FOR UPDATE trên outer join và chạy test integration tuần tự.
- số lần: chưa ghi trong nguồn lịch sử
- ghi lần đầu: không ghi trong nguồn lịch sử
- cập nhật gần nhất: 2026-11-12 (chuyển hồ sơ, không tái xác minh)
- trạng thái: có hiệu lực

### M-21
- loại: Đã học được
- tag: db, typeorm, returning
- khi nào áp dụng: Dùng `manager.query()` hoặc QueryRunner với SQL `UPDATE ... RETURNING *` trong backend.
- quy tắc: Kết quả là `[rows, rowCount]`; lấy `rows[0]` để đọc bản ghi, không destructure phần tử đầu trực tiếp thành row. Thêm test PATCH qua PostgreSQL khi thay đổi mẫu truy vấn này.
- vì sao: Bài học lịch sử nhập từ MEMORY.md gốc; không xác minh lại trong đợt chuyển hồ sơ.
- bằng chứng: `errors/2026-11-07-sprint07-update-returning.md`; test đỏ `qa-evidence/20261107-sprint07-backend-check/review-green.log` và suite xanh 74/74 ở `qa-evidence/20261107-204250-5ada010f-s7-sprint-qa/api-test-log.zip`.. Nguồn gốc: MEMORY.md mục Đọc đúng kết quả UPDATE RETURNING của TypeORM PostgreSQL.
- số lần: chưa ghi trong nguồn lịch sử
- ghi lần đầu: không ghi trong nguồn lịch sử
- cập nhật gần nhất: 2026-11-12 (chuyển hồ sơ, không tái xác minh)
- trạng thái: có hiệu lực

### M-22
- loại: Hay quên
- tag: records, migration, backup
- khi nào áp dụng: Đổi tên, di chuyển, thay thế hoặc xóa hàng loạt hồ sơ trong `.devloopflow/` (hiện chưa được Git theo dõi) hoặc sửa hàng loạt tham chiếu giữa tài liệu.
- quy tắc: Trước khi làm, hỏi user trạng thái đích một lần và nén bản sao lưu các file `.md`/`.json` sẽ bị sửa vào scratchpad; không xóa bản duy nhất của một dạng (vd bản nhập có link đã sửa) khi chưa có cách sinh lại và kiểm chứng. Sau khi làm, kiểm bằng SHA-256 theo manifest và quét số link tương đối hỏng trước/sau.
- vì sao: Ngày 2026-11-12 user lần lượt yêu cầu bỏ `legacy-originals`, rồi đổi tên sang `YYYYMMDD-`, rồi hoàn tác cả hai, rồi bỏ kiểu đặt `legacy`. Bản nhập `legacy-*` đã bị xóa khi chuyển bản gốc vào thư mục cùng tên và không có sao lưu nên phải sinh lại bằng script; chỉ kiểm chứng được nhờ bảng ánh xạ cũ (nay đã xóa theo yêu cầu user) còn ghi số link đã sửa của từng file.
- bằng chứng: Sinh lại 134 bản nhập, số link đã sửa khớp 134/134 dòng của bảng ánh xạ cũ, 0 link không tìm được đích; SHA-256 của 135 file gốc khớp manifest cũ (nay đã xóa), 0 lệch; còn 3 link hỏng sẵn có ở `.devloopflow/verify/20261109-sprint08-payment/sync-docs-proposals-1.md`. Tự chạy local, chưa có CI độc lập. Ghi chép: `.devloopflow/tasks/completed/20261112-retire-legacy-root-records.md`.
- số lần: 1
- ghi lần đầu: 2026-11-12
- cập nhật gần nhất: 2026-11-12
- trạng thái: có hiệu lực

### M-23
- loại: Ý của user
- tag: records, legacy, layout
- khi nào áp dụng: Sắp xếp hồ sơ lịch sử nhập từ các thư mục gốc cũ (`specs`, `plans`, `tasks`, `errors`, `qa-evidence`) trong `.devloopflow/`.
- quy tắc: Mỗi hồ sơ lịch sử chỉ có MỘT file, đúng byte, giữ tên gốc `YYYY-MM-DD-ten.md`, nằm trong `.devloopflow/specs|plans|tasks|errors/`. Không tạo `legacy-originals/`, không dùng tiền tố `legacy-`, không đổi tên sang `YYYYMMDD-` trừ khi user yêu cầu lại. QA lịch sử: mỗi lần chạy là `.devloopflow/verify/<tên lần chạy gốc>/` (báo cáo) + `evidence/` (raw), không tạo thư mục kiểu `legacy-qa-evidence/`. Tuân cấu trúc và tên của plugin, giữ tên gốc của hồ sơ, KHÔNG tự đặt tên mới; chưa rõ chỗ đặt thì hỏi. Đổi bố cục thì hỏi user trước, không thử lần lượt từng kiểu.
- vì sao: User nhắc lại: "đã nói là tuân theo plugin ko tự đặt tên giữ tên gốc legacy-qa-evidence bỏ folder này tuân theo" (2026-11-12) sau khi mình để nguyên `verify/legacy-qa-evidence/` và các tên `LEGACY-*`. Trước đó cùng ngày user đổi ý ba lần về bố cục: yêu cầu chuyển bản gốc vào thư mục cùng tên, rồi đổi tên theo quy ước plugin, rồi nói "đổi hết lại t thấy ko hợp lí rồi đó" và chọn hoàn tác, rồi nói "xóa bỏ kiểu đặt legacy" và chọn "Bản đúng byte, tên gốc, không tiền tố". Mục này thay mục cũ ghi giữ `legacy-originals/` và `legacy-*` (đã bị user thay thế cùng ngày).
- bằng chứng: Lời user trong phiên 2026-11-12 (trích nguyên văn ở trên); trạng thái hiện tại: 134 file đúng byte (12 spec, 20 plan, 68 task, 34 error) trong thư mục cùng tên, SHA-256 đã đối chiếu 135/135 trước khi xóa manifest, không còn `legacy-originals/` hay file `legacy-*` của hồ sơ; QA cũ ở `.devloopflow/verify/<tên lần chạy gốc>/` (133 thư mục) với `SHA256SUMS` khớp 3.466/3.466 file.
- số lần: 3
- ghi lần đầu: 2026-11-12
- cập nhật gần nhất: 2026-11-12
- trạng thái: có hiệu lực

### M-24
- loại: Đã học được
- tag: tooling, windows, python
- khi nào áp dụng: Chạy script Python có ký tự gạch chéo ngược (`\`) qua heredoc của công cụ Bash trong Claude Code trên Windows.
- quy tắc: Heredoc làm mất hoặc đổi `\`, gây `SyntaxError: unterminated string literal`. Ghi script bằng công cụ Write vào scratchpad rồi chạy `python <file>`, hoặc dùng `chr(92)`; không nhúng `\` vào heredoc.
- vì sao: Lỗi lặp lại hai lần trong cùng phiên khi viết `replace('\','/')`, mỗi lần mất một lượt chạy.
- bằng chứng: Hai lần `SyntaxError: unterminated string literal` ở dòng `replace('\','/')` ngày 2026-11-12; sau khi chuyển sang `chr(92)` hoặc file script, script chạy bình thường.
- số lần: 2
- ghi lần đầu: 2026-11-12
- cập nhật gần nhất: 2026-11-12
- trạng thái: có hiệu lực

### M-25
- loại: Đã học được
- tag: graphify, claude, hooks
- khi nào áp dụng: Cài hoặc cấu hình Graphify cho Claude Code theo phạm vi dự án thay vì global.
- quy tắc: Graphify không có cờ cài theo project: sao chép `~/.claude/skills/graphify` vào `.claude/skills/graphify`, chạy `graphify claude install`, rồi sửa lệnh hook trong `.claude/settings.json` từ đường dẫn tuyệt đối (`C:/Users/.../graphify.EXE`) thành `graphify hook-guard <search|read|compact>` để không gãy trên máy khác; kiểm bằng `graphify hook-guard <chế độ>` (exit 0) và `graphify query`. `graphify claude install` còn ghi thêm mục vào `CLAUDE.md`; gộp mục đó với mục Graphify sẵn có của dự án.
- vì sao: `graphify claude install` mặc định ghi đường dẫn tuyệt đối của máy hiện tại; `.claude/` chưa nằm trong `.gitignore` nên nếu commit sẽ lỗi trên máy khác.
- bằng chứng: `.claude/settings.json` (3 hook: PreToolUse `Bash|Grep` và `Read|Glob`, SessionStart `compact`) sau khi sửa; `graphify hook-guard search|read|compact` đều exit 0 ngày 2026-11-12; `graphify --help` mục `claude install`. Tự chạy local.
- số lần: 1
- ghi lần đầu: 2026-11-12
- cập nhật gần nhất: 2026-11-12
- trạng thái: có hiệu lực

### M-26
- loại: Hay quên
- tag: records, tests, ci, paths
- khi nào áp dụng: Di chuyển, đổi tên hoặc xóa thư mục tài liệu (`specs`, `plans`, `tasks`, `errors`, `qa-evidence`...) trong repo.
- quy tắc: Trước khi commit, tìm cả tên thư mục trần (`specs`, `qa-evidence`...) trong `POS_API/src`, `POS_UI/src`, `POS_UI/test`, `.github`, vì test có thể đọc file bằng `resolve(__dirname, '../..', 'specs', file)` mà grep chuỗi `specs/` không thấy; rồi chạy toàn bộ `npm test` của POS_API (cần PostgreSQL) hoặc ít nhất các test không cần DB, và xem CI sau khi push.
- vì sao: Ngày 2026-11-12 mình chuyển `specs/` vào `.devloopflow/specs/` và push mà chỉ grep `specs/` trong mã; test `DOC-02 AUD-05` ở `POS_API/src/organization/tests/organization.spec-examples.test.ts:12` đọc `specs/organization.md` qua `resolve(...,'specs', file)` nên CI fail ENOENT. Test API cần PostgreSQL nên không chạy lại trước khi push.
- bằng chứng: CI run 43197181739 (push, commit `29bd219`): 155 test, 154 pass, 1 fail, lỗi `ENOENT ... /specs/organization.md`; tái hiện cục bộ bằng `node --test dist/organization/tests/organization.spec-examples.test.js` (fail rồi pass sau sửa); sau commit `405ffb8` cả push run 43199441989 và pull_request run 43199455249 đều `success`.
- số lần: 1
- ghi lần đầu: 2026-11-12
- cập nhật gần nhất: 2026-11-12
- trạng thái: có hiệu lực

### M-27
- loại: Đã học được
- tag: ci, github, logs
- khi nào áp dụng: Debug CI GitHub Actions khi `gh run view --log` hoặc `--log-failed` không hiện dòng `not ok`.
- quy tắc: `gh` cắt log lớn (log step test của POS_API ~12 MB, `gh` chỉ trả khoảng 2.200 dòng). Tải log gốc bằng `gh api repos/<owner>/<repo>/actions/runs/<run_id>/logs > logs.zip`, đọc file `Backend API (POS_API)/8_Run unit & integration tests.txt` trong zip (đọc bằng `python -I`, không giải nén vào thư mục có script), tìm `not ok`, `# fail`, `failureType` và `##[error]`. Tên repo trong URL là tên mới `POS-Food-And-Beverage`.
- vì sao: Lần đầu `gh run view --log-failed` chỉ cho thấy test 1 đến 14 đều `ok` và không thấy lỗi, nên suýt kết luận nhầm là process bị kill; annotation lỗi ở dòng 2863 trong khi log `gh` trả ngắn hơn đã gợi ý log bị cắt.
- bằng chứng: Zip 843 KB từ run 43197181739 có file test 11,9 MB, 2.864 dòng với `# tests 155`, `# fail 1`, `not ok 16 - DOC-02 AUD-05 ...`; log `gh run view` chỉ có 14 dòng `ok`.
- số lần: 1
- ghi lần đầu: 2026-11-12
- cập nhật gần nhất: 2026-11-12
- trạng thái: có hiệu lực

### M-28
- loại: Hay quên
- tag: ui, tests, node-vm
- khi nào áp dụng: Sửa giao diện của màn có test nạp mã nguồn TSX bằng `node:vm` với React giả (`POS_UI/test/live-payment.test.mjs`, `organization-screen.test.mjs`, `platform-screen-race.test.mjs`, `shift-screen.test.mjs`, `dialog-focus.test.mjs`).
- quy tắc: Trước khi thêm import mới hoặc đổi cấu trúc nút, đọc harness của test. (1) `require` giả ném `Unexpected dependency` với module lạ: thêm mock (`lucide-react`, `Dialog`) vào harness. (2) `React.createElement` giả chỉ ghi lại `{type, props, children}`, không chạy component hàm, nên chữ cần kiểm phải nằm trong phần tử gốc. (3) Nhiều câu kiểm so chuỗi chính xác nội dung nút (`'Đóng'`, `'Thanh toán'`, `'Tiền mặt'`) hoặc `[children].flat().join('')`: biểu tượng làm chuỗi thành `[object Object]...`, nên không đặt biểu tượng vào nút/thẻ mà test so cả nội dung. (4) Test tìm nút theo `includes`: đừng để ký tự `+`, `−` hay chữ `Xóa` ở nút khác nằm trước trong cây; dùng biểu tượng cho nút tăng giảm trong hộp thoại chọn món.
- vì sao: Ngày 2026-11-12 viết lại `LivePosScreen.tsx` và `LivePaymentDialog.tsx` làm 37 test đỏ ngay lần chạy đầu (thiếu mock `lucide-react`/`Dialog`), sau đó còn 8 test đỏ do chữ `OPEN`/`PAID` đổi thành nhãn tiếng Việt, nút `+` trong hộp thoại chọn món bị test `PAID-DONE-4` coi là nút sửa đơn, và biểu tượng trong nút `Tiền mặt` làm hỏng `R5-1`; `B-29` đỏ vì biểu tượng nằm trong `<p role="alert">`.
- bằng chứng: `npm test` trong `POS_UI`: lần đầu 48 pass, 37 fail; sau khi vá harness và đổi cấu trúc: 85 pass, 0 fail (commit `29bd158`, `ef926ea`).
- số lần: 1
- ghi lần đầu: 2026-11-12
- cập nhật gần nhất: 2026-11-12
- trạng thái: có hiệu lực

### M-29
- loại: Hay quên
- tag: migration, test, foundation, plan
- khi nào áp dụng: Plan hoặc task thêm một migration mới trong `POS_API/src/database/migrations/`.
- quy tắc: Kiểm và đưa vào plan việc cập nhật số migration gắn cứng ở `POS_API/src/foundation.test.ts:37` (`runMigrations().length`), cùng chạy toàn bộ `npm test` ngay sau khi thêm migration.
- vì sao: Migration `20261113000000-ShiftExpenses.ts` làm số migration từ 10 thành 11; plan không nhắc nên `tdd` DỪNG ở ST-1 (`11 !== 10`) và phải sửa plan, xin user duyệt (delta ST-1).
- bằng chứng: Task 20261112-sprint09-drawer-cancel-invoices: report `tdd` ST-1 (trạng thái DỪNG), Changelog plan ngày 2026-11-13 ('delta ST-1, user duyệt "có sửa luôn"'), `POS_API/src/foundation.test.ts:37`.
- số lần: 1
- ghi lần đầu: 2026-11-13 (task 20261112-sprint09-drawer-cancel-invoices)
- cập nhật gần nhất: 2026-11-13
- trạng thái: có hiệu lực

### M-30
- loại: Hay quên
- tag: plan, sales, error-order, test
- khi nào áp dụng: Plan ghi một thay đổi hợp đồng lỗi hoặc thứ tự các kiểm tra (scope/quyền/trạng thái) của hàm có sẵn, ví dụ mục 'Ảnh hưởng tới code hiện có'.
- quy tắc: Thêm AC và test HTTP riêng cho chính thay đổi đó với người gọi thiếu điều kiện (không có ca, `branch_id` NULL, ngoài phạm vi), rồi kiểm bằng đột biến 'đảo thứ tự' để có test đỏ; không chỉ ghi chú trong plan.
- vì sao: Sprint 09 đổi `cancel()` đọc đơn theo phạm vi trước `writable()` (404 `NOT_FOUND` thay vì 409 `SHIFT_NOT_OPEN`) nhưng plan ghi 'không test hiện có nào kiểm' và không đặt AC; reviewer vòng 1 bắt thành R1-1 [Medium].
- bằng chứng: Task 20261112-sprint09-drawer-cancel-invoices: Lịch sử review R1-1; `.devloopflow/errors/20261113-cancel-open-scope-order-untested.md`.
- số lần: 1
- ghi lần đầu: 2026-11-13 (task 20261112-sprint09-drawer-cancel-invoices)
- cập nhật gần nhất: 2026-11-13
- trạng thái: có hiệu lực

### M-31
- loại: Hay quên
- tag: test, flaky, clock, shifts
- khi nào áp dụng: Viết test seed mốc thời gian (`started_at`, `created_at`) bằng đồng hồ DB `now()` rồi gọi API ghi mốc sau bằng đồng hồ Node (`new Date()`), đặc biệt khi PostgreSQL chạy trong Docker.
- quy tắc: Seed mốc lùi (`now() - interval '1 minute'`) hoặc dùng cùng một đồng hồ; không dựa vào hai đồng hồ khớp nhau. Đồng hồ container Postgres lệch host tới ±1 s và có thể đổi sau khi Docker Desktop khởi động lại.
- vì sao: `[R14-1]` và 4 test sau đỏ 2/3 lần `npm test` với `chk_work_shifts_ended_at` (`23514`); sau khi đổi 9 chỗ seed thì xanh 3/3 dù độ lệch vẫn ±1 s.
- bằng chứng: Task 20261112-sprint09-drawer-cancel-invoices: verify-ac lần 2 (`evidence/v2/clock-skew.txt`, `npm-test.raw.log`), lần 3 (xanh 3/3), backlog B-50; `.devloopflow/errors/20261113-payment-test-seed-db-clock-flaky.md`.
- số lần: 1
- ghi lần đầu: 2026-11-13 (task 20261112-sprint09-drawer-cancel-invoices)
- cập nhật gần nhất: 2026-11-13
- trạng thái: có hiệu lực

### M-32
- loại: Đã học được
- tag: test, node-test, command
- khi nào áp dụng: Chạy một case của `node --test` bằng `--test-name-pattern` khi test nằm lồng trong subtest (ví dụ `[R14-1]` trong `payment.integration.test.js`).
- quy tắc: Dùng pattern theo tên test CHA; pattern khớp subtest không chạy được test cha nên lệnh báo `pass 1` mà thực tế không chạy gì. Xác nhận số test đã chạy trong output trước khi coi là xanh.
- vì sao: Lần Red của B-50 dùng pattern `R14-1` báo xanh giả; phải dùng `--test-name-pattern="ST-4.AC-1 BR-31/32/34/35 CASH"` mới chạy được 7 test và thấy 6 đỏ.
- bằng chứng: Task 20261112-sprint09-drawer-cancel-invoices: report `tdd` fix-backlog B-50 (`evidence/fix-backlog-b50/red.log`).
- số lần: 1
- ghi lần đầu: 2026-11-13 (task 20261112-sprint09-drawer-cancel-invoices)
- cập nhật gần nhất: 2026-11-13
- trạng thái: có hiệu lực

### M-33
- loại: Quy trình
- tag: verify-ac, subagent, report
- khi nào áp dụng: Giao `ac-verifier` (hoặc subagent khác) ghi `report-<n>.md`, `fails.md` dưới `.devloopflow/verify/<id>/`.
- quy tắc: Dặn subagent trả toàn bộ nội dung report ở cuối câu trả lời (Write bị từ chối trong ngữ cảnh subagent: 'Subagents should return findings as text'); agent chính tự mở bằng chứng thô (đếm `# pass`, `pass:false`, `cleanup.txt`) rồi mới chép vào file, và ghi rõ điều đó trong report.
- vì sao: Cả 3 lần verify-ac của task, subagent không ghi được `report-*.md`/`fails.md`; không lách bằng Bash.
- bằng chứng: Task 20261112-sprint09-drawer-cancel-invoices: report-1.md, report-2.md, report-3.md (mục 'Kiểm lại của agent chính').
- số lần: 1
- ghi lần đầu: 2026-11-13 (task 20261112-sprint09-drawer-cancel-invoices)
- cập nhật gần nhất: 2026-11-13
- trạng thái: có hiệu lực

### M-34
- loại: Đã học được
- tag: env, docker, database, test
- khi nào áp dụng: Chạy `npm test` hoặc migration cho `POS_API` trên máy Windows của dự án.
- quy tắc: `DATABASE_URL` trong `POS_API/.env` có thể không dùng được (cổng 5432 là relay WSL, sai mật khẩu); dùng PostgreSQL Docker `pos_infra-postgres-1` ở `127.0.0.1:15432` với `POSTGRES_USER/PASSWORD/DB` từ `POS_INFRA/.env.local`, dựng URL trong lệnh, không in hay ghi bí mật. Sau khi Docker Desktop khởi động lại, container thoát mã 255: `docker start pos_infra-postgres-1`.
- vì sao: Kiểm thử 2026-11-13: 'password authentication failed for user' với `.env`; container exited (255) sau restart Docker; tài khoản có quyền `CREATEDB` nên test tạo DB riêng.
- bằng chứng: Task 20261112-sprint09-drawer-cancel-invoices: phiên 2026-11-13 (kết nối thử bằng `pg`, `docker ps -a`); ST-1..ST-5 và verify-ac chạy trên cổng 15432.
- số lần: 1
- ghi lần đầu: 2026-11-13 (task 20261112-sprint09-drawer-cancel-invoices)
- cập nhật gần nhất: 2026-11-13
- trạng thái: có hiệu lực

### M-35
- loại: Quy trình
- tag: tdd, mutation, subagent
- khi nào áp dụng: Giao `tdd` kiểm đột biến bằng script tự động trên file production.
- quy tắc: Yêu cầu `timeout` cho mỗi lần chạy, khôi phục file bằng `cmp` với bản sao sau MỖI đột biến và xác nhận lại bằng `grep`; không dùng đột biến gây treo (ví dụ đưa `INSERT` ra ngoài transaction) và agent chính kiểm `git diff` file production sau khi `tdd` báo xong.
- vì sao: Ở ST-4, đột biến 'ngoài transaction' làm script treo, chết giữa chừng khi `sales.service.ts` đang bị đột biến; phải khôi phục tay và kiểm lại.
- bằng chứng: Task 20261112-sprint09-drawer-cancel-invoices: report `tdd` ST-4; agent chính đọc `git diff POS_API/src/sales/sales.service.ts` sạch.
- số lần: 1
- ghi lần đầu: 2026-11-13 (task 20261112-sprint09-drawer-cancel-invoices)
- cập nhật gần nhất: 2026-11-13
- trạng thái: có hiệu lực

### M-36
- loại: Ý của user
- tag: workflow, communication, approval
- khi nào áp dụng: Trình user các câu hỏi làm rõ, đề xuất hoặc thuật ngữ kỹ thuật cần user duyệt.
- quy tắc: Giải thích từng điểm bằng lời thường (đề xuất là gì, vì sao, hậu quả nếu chọn khác) trước khi xin duyệt; gọi tên thuật ngữ (flaky, 'chưa chắc', bước 10c) kèm nghĩa; không coi 'đồng ý hết' khi user nói chưa hiểu.
- vì sao: User nhiều lần dừng để hỏi nghĩa trước khi quyết.
- bằng chứng: Lời user nguyên văn, task 20261112-sprint09-drawer-cancel-invoices: "cần chốt lại 9 điều trước khi viết spec đã t cần mày giải thích" (2026-11-13); "còn 4 điều đó cần giải thích"; "chưa chắc là sao"; "bị flaky là sao"; "bước 10c là gì thế".
- số lần: 1
- ghi lần đầu: 2026-11-13 (task 20261112-sprint09-drawer-cancel-invoices)
- cập nhật gần nhất: 2026-11-13
- trạng thái: có hiệu lực
