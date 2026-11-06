# Hướng dẫn cho agent

## Trạng thái dự án

- Đây là dự án POS và quản lý kho SaaS cho quán cà phê, trà sữa và quán ăn nhỏ: một `store` có nhiều `branch`, mỗi chi nhánh có bàn, ca thu ngân và tồn kho riêng.
- Repository có UI demo trong `POS_UI/`; `POS_API/` đã có nền tảng PB-01 và API xác thực PB-02, `POS_INFRA/` có Docker Compose PostgreSQL local. Phân biệt quy tắc đã đặc tả, mã đã triển khai và UI demo khi mô tả dự án.

## Conversation Onboarding

- Khi bắt đầu conversation mới, khám phá tổng quan dự án trước khi thực hiện nhiệm vụ: tìm hiểu cấu trúc repository, tech stack, kiến trúc và các quy ước hiện có theo bản đồ bên dưới.
- Chỉ đọc sâu module, tài liệu và source code liên quan đến nhiệm vụ; không mặc định đọc toàn bộ codebase hoặc tài liệu không liên quan.
- Không khám phá lại khi conversation hiện tại đã có đủ context đáng tin cậy. Nếu không xác định chắc chắn conversation có mới hay không, không khẳng định đã xác định được.
- Nếu chưa có nhiệm vụ cụ thể, chỉ khám phá tổng quan và chờ yêu cầu.

## Bản đồ repository và thứ tự đọc

Mọi đường dẫn dưới đây tính từ **gốc repository** (thư mục chứa `AGENTS.md`), không tính từ thư mục của file đang sửa.

| Đường dẫn | Đọc khi nào / vai trò |
| --- | --- |
| `docs/PRODUCT_OVERVIEW.md` | **Đọc đầu tiên**: phạm vi MVP, vai trò, luồng nghiệp vụ, bất biến. |
| `docs/BUSINESS_RULES.md` | Tra quy tắc nghiệp vụ theo mã BR trước khi đổi hành vi. |
| `docs/DESIGN_DB_POS_SYSTEM.md` | Schema, công thức, index, constraint và transaction liên quan dữ liệu. |
| `docs/api-spec.md` | Quy ước chung HTTP, auth, lỗi, phân quyền, idempotency; đọc trước khi sửa API. |
| `specs/` | Đặc tả chi tiết từng chức năng và endpoint **đã chốt**; kiểm tra trước khi triển khai phần liên quan. |
| `docs/architecture/ARCHITECTURE.md` | Thành phần, ranh giới module, triển khai và luồng dữ liệu **mục tiêu**. |
| `docs/architecture/auth.md` | Phiên, JWT, cookie, mật khẩu và giới hạn thử. |
| `docs/architecture/TECH_STACK.md` | Công nghệ/framework/thư viện **đang dùng** theo backend, frontend và hạ tầng; đọc trước khi chọn hoặc thêm dependency. |
| `DESIGN.md` | Giao diện POS, component, tương tác, ngôn ngữ và thiết bị. |
| `rules/` | Quy tắc làm việc chung; chọn file phù hợp theo bảng bên dưới. |
| `.codex/agents/` | Cấu hình `explorer` để khám phá cấu trúc dự án và định vị code khi có task, `code-reviewer` để review và `qa` để kiểm thử/báo lỗi; các agent không sửa source theo chỉ dẫn. |
| `qa-evidence/` | Dấu vết các lần chạy QA và kiểm tra thủ công; chỉ tạo khi có lần chạy thật. |
| `POS_UI/`, `POS_API/`, `POS_INFRA/` | Mã UI, backend và hạ tầng; kiểm tra mã thực tế trước khi nói tính năng đã chạy. |
| `MEMORY.md` | Bài học có thể tái sử dụng qua các phiên; đầu task lướt tiêu đề và chỉ đọc mục liên quan. |
| `plans/`, `tasks/`, `errors/` | Kế hoạch, tiến độ và lỗi đã gặp được lưu trên đĩa; quy trình ở mục dưới. |
| `sprints/` | Kế hoạch và kết quả từng sprint: mục tiêu, backlog được đề xuất hoặc đã chốt, tiêu chí nghiệm thu, review và retrospective. Đọc sprint hiện hành để biết cam kết và trạng thái thực tế; mục đề xuất chưa phải việc đã được duyệt hay hoàn thành. |

Trong `rules/`: đọc `clean-code.md`, `coding-style.md`, `naming.md` khi viết/sửa code; `database.md` khi làm DB/ORM; `security.md` khi xử lý dữ liệu, secret hoặc quyền; `testing.md` khi kiểm thử; `git.md` trước khi tạo nhánh, commit, push hoặc merge. Các rule này không phụ thuộc ngôn ngữ/công nghệ. Lưu spec chức năng/endpoint vào `specs/` ở gốc chỉ sau khi đã phỏng vấn, rà soát mâu thuẫn và mơ hồ, và chốt các quyết định còn mở. Kiểm tra trạng thái từng spec trước khi viện dẫn.

## Tìm hiểu code

- Trước khi dùng graph, kiểm tra `graphify-out/needs_update`; nếu marker tồn tại, làm semantic update theo mục Graphify bên dưới và xác minh thành công trước khi query.
- Khi `graphify-out/graph.json` tồn tại và không có marker cần xử lý, ưu tiên `graphify query "<câu hỏi về code>"` để định vị symbol và quan hệ; dùng `graphify path "<A>" "<B>"` để truy vết quan hệ, `graphify explain "<symbol>"` để xem khái niệm. Sau đó đọc source liên quan để xác nhận chi tiết.
- Sau khi tạo, sửa hoặc xóa code, cập nhật graph bằng `graphify update .` trước khi hoàn tất task. Nếu graph chưa có, tạo bằng `graphify . --code-only --no-viz`. Chế độ code-only phân tích AST cục bộ, không gửi tài liệu/ảnh tới dịch vụ LLM.
- Dùng `rg`/tìm file cho chuỗi literal, thông báo lỗi, config, tài liệu không phải code, loại file Graphify không hỗ trợ hoặc khi graph thiếu thông tin. Không coi graph là bằng chứng thay cho source/test.
- Trước khi sửa logic dùng chung, kiểm tra caller, dữ liệu liên quan và phạm vi ảnh hưởng. Khi có code và test, chạy đúng lệnh kiểm tra của phần đã sửa; không tự đặt ra lệnh chạy khi project chưa có cấu hình.

## Quy tắc sản phẩm cần giữ

- Giao diện tiếng Việt, tiền VND (đơn vị đồng), hiển thị giờ `Asia/Ho_Chi_Minh`, lưu thời gian UTC. Màn hình POS ưu tiên máy tính bảng ngang và thao tác cảm ứng.
- Tiền dùng số nguyên/`bigint`; server tính giá và tổng, không nhận giá từ client. Hóa đơn giữ snapshot tên và giá lúc bán. Thanh toán phải chống lặp bằng `idempotency_key`.
- Luôn lấy `store_id` và phạm vi `branch_id` từ danh tính/permission, kiểm tra mọi ID tham chiếu cùng cửa hàng. Người không có `branch.access_all` chỉ được xem chi nhánh mình. `PLATFORM_ADMIN` không đọc dữ liệu vận hành của store.
- Thanh toán, đổi trạng thái hóa đơn và trừ kho thuộc một transaction. Tồn kho cập nhật nguyên tử; `stock_movements` chỉ thêm dòng. Không sửa trực tiếp hóa đơn `PAID`/`CANCELLED` hoặc ca đã đóng. Dữ liệu có tham chiếu được ngưng dùng thay vì xóa cứng.
- Mỗi người chỉ có một ca mở, mỗi chi nhánh chỉ có một ca thu ngân mở, mỗi bàn chỉ có một đơn `OPEN`. Không bán hoặc thanh toán khi chưa có ca thu ngân; không đóng ca khi còn đơn `OPEN` của ca đó. Đối soát đếm mù: nhận `counted_cash` trước khi hiện tiền kỳ vọng.
- Không có đăng ký công khai. Mật khẩu và refresh token chỉ lưu hash; tài khoản mới phải đổi mật khẩu lần đầu. Store `SUSPENDED` bị chặn truy cập nhưng giữ nguyên dữ liệu.

## Cách làm việc

- MVP và các phần để sau được phân định ở mục 5 của `docs/PRODUCT_OVERVIEW.md`; chỉ làm phần ngoài MVP khi người dùng yêu cầu.
- Khi yêu cầu, đặc tả hoặc tài liệu có điểm mơ hồ, chưa rõ hoặc mâu thuẫn ảnh hưởng đến quyết định thực hiện, **luôn hỏi người dùng và chờ câu trả lời** trước khi quyết định hay làm phần phụ thuộc. Không tự giả định, chọn một cách hiểu hoặc tự đặt business rule.
- Khi triển khai, theo công nghệ đã định: NestJS/TypeScript/PostgreSQL cho backend, React/TypeScript cho frontend. Redis/BullMQ chỉ khi thực sự cần cache hoặc job nền. Đối chiếu `docs/architecture/TECH_STACK.md` với manifest/mã hiện tại; khi thêm, bỏ hoặc thay framework, thư viện trực tiếp hay công nghệ hạ tầng, cập nhật file tech stack **cùng thay đổi** và ghi đúng trạng thái đã triển khai, không liệt kê thành phần mới chỉ mới dự kiến.
- Với thay đổi code trong tương lai, làm trên nhánh riêng, đưa ra review trước khi merge và không tự push nếu chưa được yêu cầu, theo mục 11 của product overview.

## Bảo vệ source code và thay đổi chưa commit

- Được tạo, sửa hoặc xóa **file riêng lẻ** nằm trong phạm vi task khi đã xác định đúng đường dẫn và ảnh hưởng. Không cần xin duyệt cho thao tác thường lệ, có thể đảo ngược; build, test và dọn file sinh ra bởi chính tác vụ vẫn làm bình thường.
- Trước khi xóa hoặc ghi đè, kiểm tra `git status` và nội dung/đường dẫn đích. Giữ nguyên thay đổi chưa commit và file chưa được Git theo dõi của người khác; không dùng thao tác khôi phục/xóa khiến chúng mất đi. Nếu file đích đã có thay đổi không thuộc task, dừng thao tác đó và trao đổi với người dùng.
- Không tự ý xóa hàng loạt source code, dùng wildcard rộng hoặc xóa đệ quy toàn bộ thư mục dự án. Với xóa đệ quy, xóa nhiều file source, xóa thư mục hoặc thao tác có thể làm mất dữ liệu chưa commit: liệt kê đường dẫn tuyệt đối, xác minh nằm trong phạm vi cần xử lý, nêu tác động và **chỉ thực hiện sau khi người dùng phê duyệt cụ thể**. Sự đồng ý cho task chung không thay cho phê duyệt xóa nguy hiểm.
- **Không chạy** `git reset --hard`, `git clean -fdx` hoặc biến thể đổi thứ tự cờ/cú pháp để đạt cùng kết quả. Nếu cần bỏ thay đổi, chọn thao tác theo từng file sau khi kiểm tra và xin duyệt khi có nguy cơ mất dữ liệu; không tự stash, checkout/restore đè file đang sửa hoặc ép ghi lịch sử.
- Command rules ở `.codex/rules/source-protection.rules` là lớp chặn thêm cho các lệnh phổ biến; vẫn phải tuân thủ các quy tắc trên với PowerShell, script, tool khác và mọi cách viết lệnh mà prefix rule không nhận diện được. Nếu môi trường không cho hỏi phê duyệt, không thực hiện xóa nguy hiểm và không lách qua công cụ hoặc cú pháp khác.

## Ghi plan, task và lỗi ra file

**Plan và task là hồ sơ thực thi đầy đủ, không phải bản tóm tắt ngắn.** Nội dung phải đủ chi tiết để người khác tiếp tục công việc chỉ dựa vào file, không cần đọc lại hội thoại hoặc tự suy đoán. Ghi rõ bối cảnh và mục tiêu, phạm vi, quyết định kèm căn cứ, từng bước cụ thể theo thứ tự, tiêu chí/kết quả cần đạt, trạng thái và bằng chứng, file liên quan, lệnh đã chạy cùng kết quả, blocker/câu hỏi và bước tiếp theo. Không gộp nhiều bước thành mô tả chung, không bỏ thông tin đã biết; điều chưa rõ ghi rõ `chưa xác minh` hoặc blocker. Mỗi lần cập nhật phải phản ánh đầy đủ tiến độ hiện tại, không chỉ thêm một câu như “đã làm xong”.

**Không dùng trí nhớ phiên chat làm nơi duy nhất giữ plan hoặc tiến độ.** Trước khi bắt đầu hay tiếp tục việc nhiều bước, lướt tiêu đề `MEMORY.md` và chỉ đọc mục khớp với task hoặc vùng code sắp sửa; đọc `tasks/active/` và `plans/active/`. Chỉ tra `errors/` khi ngữ cảnh task có dấu hiệu liên quan như cùng triệu chứng, thông báo lỗi, module, dependency hoặc môi trường đã từng gặp lỗi. Khi tiếp tục sau compact hoặc phiên mới, đọc file đang active, đối chiếu với Git/mã/test hiện tại rồi mới làm bước tiếp theo; ghi chép có thể cũ hơn trạng thái repository.

- `plans/active/`: khi người dùng yêu cầu triển khai plan đã lập trong Plan mode, đọc lại plan trong hội thoại, đối chiếu với repository rồi ghi plan vào đây trước khi triển khai. Mỗi plan ghi mục tiêu, phạm vi, các bước, tiêu chí hoàn thành, quyết định và rủi ro; nếu phạm vi đổi, ghi thay đổi và lý do vào plan. Khi mọi task và kiểm tra xong, chuyển cùng file sang `plans/completed/` kèm kết quả. Mỗi plan chỉ nằm ở **một** trạng thái.
- `tasks/active/`: tạo file task trước khi triển khai một plan hoặc bắt đầu việc nhiều bước. Task ghi plan liên quan (nếu có), mục tiêu, nhánh, việc đã hoàn tất kèm bằng chứng, trạng thái hiện tại, **bước tiếp theo cụ thể**, file đã đổi, lệnh kiểm tra và blocker/câu hỏi. Cập nhật sau mỗi mốc quan trọng và **trước khi dừng, đổi phiên hoặc ngữ cảnh bị rút gọn**. Xong và đã kiểm tra thì chuyển sang `tasks/completed/` cùng tên file; không để task active đã hoàn tất.
- `MEMORY.md`: trước khi kết thúc mỗi task, tự hỏi: (1) người dùng có phải sửa hoặc nhắc lại yêu cầu không; (2) có lỗi nào mất công mới tìm ra nguyên nhân không; (3) có quyết định nào đổi giữa chừng không? Chỉ ghi bài học giúp tránh lỗi có thể gặp lại ở task khác, yêu cầu người dùng đã phải nhắc từ hai lần, hoặc quyết định đã chốt có ảnh hưởng về sau. Sửa sai trực tiếp của người dùng là căn cứ cho yêu cầu; với kết luận kỹ thuật, phải tái hiện lỗi và chạy lại test/lệnh thấy kết quả đúng, không chỉ suy đoán. Không có bài học đủ căn cứ và giá trị tái sử dụng thì không ghi.
- Mỗi mục `MEMORY.md` dùng đúng mẫu: `## Tên bài học`, `- Áp dụng: <khi nào>`, `- Bài học: <hành động cụ thể>`, `- Căn cứ: <sửa sai của người dùng hoặc đường dẫn test/log/tài liệu đã kiểm tra>`. Gộp mục trùng; khi mã hoặc quy tắc hiện tại bác bỏ bài học cũ, sửa hoặc xóa mục đó sau khi đối chiếu. Giữ file dưới 200 dòng bằng cách gộp và bỏ mục hết hiệu lực, không cắt mất bài học còn đúng. Không ghi secret, token, dữ liệu cá nhân thật, thông tin hay chứng cứ tự dựng. Không dùng file này thay cho tiến độ task hoặc bản ghi lỗi chi tiết trong `errors/`.
- `errors/`: lưu một file cho mỗi lỗi đáng kể gặp khi làm hoặc review. Ghi triệu chứng, điều kiện tái hiện, nguyên nhân đã xác minh, cách sửa, cách kiểm chứng, task/commit liên quan; lỗi chưa giải quyết đánh dấu rõ. Khi có dấu hiệu liên quan, tìm theo chủ đề rồi đọc file lỗi phù hợp trước khi chẩn đoán, sửa hoặc review; không mặc định đọc toàn bộ thư mục mỗi task. Đối chiếu ghi nhận với mã/test hiện tại và mức kiểm chứng trước khi áp dụng cách sửa. Không ghi secret, token hoặc dữ liệu cá nhân thật.

Tên file dùng `YYYY-MM-DD-ten-ngan.md`; task thuộc plan ghi đường dẫn plan trong nội dung. Mỗi file ghi trạng thái ở đầu và giữ nguyên tên khi chuyển thư mục; không tạo bản sao ở nhiều trạng thái. Không tạo plan cho việc một bước đơn giản, nhưng mọi việc kéo dài qua phiên phải có task active để tiếp tục được. Nội dung user yêu cầu và mã/test hiện tại luôn được đối chiếu trước khi áp dụng ghi chép cũ.

## Bằng chứng thực thi QA

- Không coi câu “67 pass, 0 fail” là bằng chứng. Với mỗi lần chạy, tạo `qa-evidence/<ngày-giờ>-<short-commit>/run.md` ghi lệnh chính xác, commit SHA, working tree có dirty hay không, môi trường, thời điểm bắt đầu/kết thúc, exit code, số test và đường dẫn đến **output/test report do công cụ tạo**. Giữ stdout/stderr hoặc artifact phù hợp trong cùng thư mục; không tự viết lại log để khớp kết luận. Liên kết run từ task/error và báo cáo QA.
- Với kiểm tra API/UI thủ công, mỗi tình huống có ID và dấu vết đối chiếu được: bước thao tác, expected/actual, request/response hoặc request ID đã che dữ liệu nhạy cảm, ảnh/video khi cần, trạng thái DB trước/sau bằng truy vấn chỉ đọc nếu có tác dụng phụ. Không dùng ảnh màn hình đơn lẻ để chứng minh tác dụng phụ trong DB.
- **Trước khi chạy**, lập bảng đối chiếu từng tiêu chí nghiệm thu và trạng thái quan trọng với artifact cần lưu: output test, request/response, ảnh/snapshot UI, DB trước/sau. Kiểm tra trên đúng phiên bản giao diện và mã cuối; artifact của UI cũ không thay thế kiểm tra UI cuối. Một tiêu chí gồm nhiều vế chỉ đạt khi mỗi vế có dấu vết kiểm tra riêng.
- **Ngay khi chạy browser**, lưu ảnh hoặc snapshot của trạng thái trước/sau mỗi chuyển trạng thái cần chứng minh (ví dụ modal bắt buộc, reload, đổi mật khẩu, logout, phiên hết hiệu lực) và output browser gốc đã che dữ liệu nhạy cảm: URL, viewport, trạng thái UI, request/response kèm method/path/status hoặc request ID. Với cookie/storage, lưu metadata cookie và kết quả kiểm tra storage/URL/JSON/header; không lưu giá trị token. Chỉ mô tả trong `run.md` hoặc ảnh chụp đơn lẻ là chưa đủ cho kết luận về network, cookie hay DB.
- **Ngay khi chạy API/test/DB**, lưu stdout/stderr, report do runner tạo và truy vấn DB chỉ đọc trước/sau nếu hành vi đổi dữ liệu; ghi lệnh, exit code và ID tình huống để nối với output browser. Giữ artifact gốc đã che, không dựng lại log, response hay snapshot từ trí nhớ sau lượt chạy. Nếu công cụ không xuất được artifact cần thiết, ghi `chưa xác minh` và chạy lại bằng cách lưu được bằng chứng.
- **Trước khi báo đạt hoặc tick nghiệm thu**, mở lại từng file/ảnh/log đã dẫn, kiểm tra file tồn tại, đọc được, đúng commit/working tree, đúng UI cuối và khớp expected/actual; lập bảng tiêu chí → tình huống → artifact cụ thể. QA độc lập phải rà độ đầy đủ này và ghi rõ phần thiếu. Chỉ tick sau khi phần thiếu đã được chạy lại, lưu đủ chứng cứ và QA đối chiếu lại; nếu chưa đủ, để ô trống và nêu bước kiểm tra tiếp theo.
- Gắn nhãn **CI/runner độc lập**, **local do agent chạy** hoặc **chưa xác minh**. File agent tự tạo không chứng minh độc lập rằng nó đã chạy; để xác thực mạnh hơn, cung cấp URL/ID của lần chạy CI với commit, log và artifact để người dùng tự đối chiếu. Khi chưa có CI, đưa lệnh tái chạy và không gọi bằng chứng local là xác nhận độc lập.
- Không đưa token, secret, dữ liệu cá nhân thật hoặc log/binary lớn vào Git. Giữ bản đã che dữ liệu cần thiết để tái hiện và ghi rõ phần nào đã che; đặt artifact lớn ở nơi lưu phù hợp và liên kết từ `run.md`. Không tạo thư mục run hay số liệu giả khi chưa thực thi.

## Graphify

Codex đã được tích hợp Graphify bằng skill project-scoped tại `.codex/skills/graphify/SKILL.md`; graph nằm trong `graphify-out/`. Cài đặt Codex hiện có nên không chạy lại `graphify codex install`, vì lệnh đó ghi vào `AGENTS.md`.

- Trước mọi query hoặc dùng nội dung graph, kiểm tra `graphify-out/needs_update` (có thể chạy `graphify check-update .`). Nếu marker tồn tại, không đọc graph cũ. Thực hiện semantic update trước, xác minh nội dung mới đã vào graph, rồi mới xóa đúng marker `graphify-out/needs_update`. Không xóa marker nếu update thất bại hoặc chưa kiểm chứng.
- Sau khi tạo, sửa hoặc xóa code, chạy `graphify update .` để cập nhật AST graph. Đây là lệnh đồng bộ do Codex chạy; nó không tự chạy chỉ vì agent sửa file.
- Sau khi tạo hoặc sửa Markdown, chạy quy trình semantic update của skill Graphify (`.codex/skills/graphify/SKILL.md` và `references/update.md`) cho các Markdown thay đổi. `graphify update .` chỉ cập nhật code và không thay thế semantic extraction. Chỉ xóa marker sau khi merge graph thành công và query đã xác nhận nội dung mới.
- Graph ban đầu được tạo bằng `--code-only`; nhiều tài liệu khác trong repository chưa được lập chỉ mục. Giới hạn semantic update vào tài liệu thay đổi trong task. Nếu công cụ sẽ kéo thêm hàng trăm tài liệu chưa được index và không thể giới hạn an toàn, báo phạm vi đó trước khi chạy semantic extraction rộng.
- `graphify watch .` là watcher tùy chọn chạy như một process riêng (cần package `watchdog`). Khi đang chạy, Graphify tự rebuild graph cho code; với Markdown/tài liệu, nó chỉ ghi `graphify-out/needs_update` và yêu cầu Codex thực hiện semantic update. Watcher không được tự khởi chạy bởi Codex config hay hook hiện tại.
- Graphify watcher bỏ qua các event nằm trong thư mục output `graphify-out/`, nên cập nhật graph/report/cache không tự kích hoạt vòng rebuild lặp. Giữ nguyên quy tắc loại trừ này.
- Graphify query/path/explain, cập nhật code và semantic update sau Markdown chỉ chạy khi Codex thực hiện các bước nêu trên; không mô tả chúng là hook tự động. Dùng `rg`/đọc file trực tiếp cho literal, config, business rule, loại file chưa hỗ trợ và xác nhận source.
