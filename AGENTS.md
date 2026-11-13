# Hướng dẫn cho agent

## Trạng thái dự án

- Đây là dự án POS và quản lý kho SaaS cho quán cà phê, trà sữa và quán ăn nhỏ: một `store` có nhiều `branch`, mỗi chi nhánh có bàn, ca thu ngân và tồn kho riêng.
- `POS_API/` đã triển khai nền tảng, xác thực, quản trị, tổ chức, thực đơn, ca, kho, khuyến mãi, bán hàng và thanh toán (chuyển khoản QR/SePay, xác nhận thủ công); Sprint 08 đã merge vào `master` (PR #18), đã kiểm trên local và SePay Test mode. Đây là dự án cá nhân học tập; theo quyết định chủ dự án, chỉ dùng SePay Test mode, Live ngoài phạm vi. `POS_UI/` có các màn đã nối API và các phần còn mô phỏng; `POS_INFRA/` có Docker Compose local. Xem `README.md` để phân biệt phạm vi đã triển khai và UI demo.

## Tổng quan kỹ thuật

| Phần | Công nghệ đang dùng | Lệnh chính (chạy trong thư mục của phần đó) |
| --- | --- | --- |
| Backend `POS_API/` | Node.js 22, TypeScript 5, NestJS 11 (Express), PostgreSQL 17, TypeORM 0.3 + `pg`, JWT + cookie (Passport local), `bcryptjs`, `class-validator`, Swagger chỉ ở development | `npm run build`; `npm test` (tự build, `node:test`, **cần PostgreSQL** qua `DATABASE_URL`; test tự tạo và xóa DB thử riêng); `npm run migration:run` |
| Frontend `POS_UI/` | React 18, TypeScript 5, Vite 6, `lucide-react` | `npm run dev`; `npm run build` (typecheck rồi build); `npm run typecheck`; `npm test` (`node:test`) |
| Hạ tầng `POS_INFRA/` | Docker Compose local: PostgreSQL 17, API, UI | Từ gốc repo: `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait`; dừng bằng `down`, **không** thêm `-v` |
| CI | GitHub Actions `.github/workflows/ci.yml`: build, migration, test API trên PostgreSQL 17, build + test UI, `npm audit` | Xem kết quả CI sau mỗi lần push; không coi test chưa chạy là đã đạt |

- Tích hợp ngoài: SePay (webhook chuyển khoản) và VietQR (mã QR), xem `THIRD_PARTY_INTEGRATIONS.md`. Redis/BullMQ, reverse proxy, TLS và backup chưa có trong repository.
- Không có script lint, format hay coverage. Muốn chạy một file hoặc một case test thì dùng `node --test` với file hoặc `--test-name-pattern` (API phải build trước, đường dẫn là `dist/...`).
- Test API cần PostgreSQL; nếu máy không có DB thì không chạy được, ghi rõ "chưa chạy" thay vì suy ra kết quả. Trước khi push nhớ rằng CI chạy toàn bộ test API.
- Đường dẫn dự án có ký tự `&` (`POS-F&B`) từng làm hỏng script cài đặt native (xem `.devloopflow/errors/2026-10-28-argon2-install-path.md`); dùng dấu nháy cho đường dẫn và tránh phụ thuộc cần biên dịch native.
- Nguồn chi tiết: `docs/architecture/TECH_STACK.md` (phiên bản, vai trò từng thư viện) và `.devloopflow/devloopflow.md` mục 2 (lệnh đầy đủ). Đổi công nghệ hoặc lệnh thì cập nhật bảng này cùng các file đó.

### Cấu trúc mã

- `POS_API/src/<module>/`: mỗi module nghiệp vụ một thư mục (`auth`, `platform`, `organization`, `users`, `menu`, `inventory`, `promotions`, `shifts`, `sales`). Bên trong: `*.module.ts`, `*.service.ts`, `*.controller.ts` (hoặc `http/` chứa controller và DTO), `entities/`, `*.pagination.ts` khi có danh sách, và `tests/`. Mã dùng chung: `src/http/` (envelope `api-response.ts`, lỗi `http-error.ts` và `api-error.filter.ts`, validation, health), `src/database/` (`data-source.ts`, `database.module.ts`, `entities/`, `migrations/`), `src/main.ts`, `src/app.module.ts`, `src/swagger-docs.ts`, `src/bootstrap-admin.ts`.
- Controller đặt route đầy đủ ngay trong decorator, ví dụ `@Controller('api/v1/ingredients')`; không có global prefix. Thêm module mới thì đăng ký vào `src/app.module.ts`.
- Migration: file `YYYYMMDDHHMMSS-Ten.ts` trong `POS_API/src/database/migrations/` (ví dụ `20261111000000-ManagerCancelOpen.ts`); chỉ thêm migration mới, không sửa migration đã chạy; không dùng `schema:sync`.
- Test cùng module trong `tests/` (`*.test.ts`, `*.integration.test.ts`); `npm test` chạy `dist/**/*.test.js` tuần tự (`--test-concurrency=1`). Tên test mang mã tình huống (`ST-4.AC-1`, `PB-04`, `BR-xx`...) để nối với tiêu chí nghiệm thu.
- `POS_UI/src/`: `app/` (`App.tsx`, `navigation.ts`, không dùng router riêng), `features/<màn>/` (auth, platform, settings, products, shifts, pos, invoices, inventory, reports), `services/*Service.ts` (gọi API), `http/client.ts` (fetch cùng origin; tự lấy cookie `__Host-pos_csrf` và gửi `X-CSRF-Token`; service truyền thêm header như `Idempotency-Key`), `auth/` (phiên), `context/`, `components/`, `types/`, `utils/`, `mock/` (dữ liệu mô phỏng cho phần chưa nối API). Test UI: `POS_UI/test/*.test.mjs`.
- UI đã nối API thật: đăng nhập, quản trị nền tảng, cài đặt tổ chức, thực đơn, ca, bán hàng, thanh toán và Hóa đơn. Còn mô phỏng (`src/mock/`): màn Báo cáo và tab lịch sử biến động của Kho. Phần nào dùng mock hay API thật thì kiểm `README.md` và mã, không đoán.

### Chạy local và cấu hình

- Cổng: API `3000` (`GET /api/v1/health` trả `{ data: { status: 'ok' } }`), UI `5173`, PostgreSQL `5432`. Compose chỉ bind `127.0.0.1`.
- Biến môi trường API (`POS_API/.env.example`): `NODE_ENV`, `PORT`, `DATABASE_URL`, `PUBLIC_ORIGIN`, `JWT_SECRET`, `CSRF_SECRET`, `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_FULL_NAME`, `BOOTSTRAP_ADMIN_PASSWORD`, `SEPAY_ENV`, `SEPAY_WEBHOOK_SECRET`. `POS_INFRA/.env.example` thêm `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. UI cần `VITE_API_TARGET` (`POS_UI/.env`) để Vite proxy `/api`; thiếu biến này `npm run dev` báo lỗi. Chỉ dùng giá trị mẫu cho môi trường local; không đưa secret thật vào file hay commit.
- Swagger/OpenAPI chỉ bật khi `NODE_ENV=development`.
- Tài khoản local đầu tiên là `PLATFORM_ADMIN` lấy từ `BOOTSTRAP_ADMIN_*`; tài khoản này không đọc dữ liệu vận hành của store. Muốn thử bán hàng phải tạo store và `OWNER` qua nền tảng, rồi chi nhánh, nhân viên.

### Quy ước API (tóm tắt, nguồn là `docs/api-spec.md`)

- Base path `/api/v1`; route danh từ số nhiều `kebab-case`; field JSON và tham số `camelCase`; enum `UPPER_SNAKE_CASE`; ID là `uuid`.
- Thành công bọc trong `{ data }`, danh sách có `meta: { limit, nextCursor, total }` (cursor, mặc định 20, tối đa 100, `sort=-createdAt`). Lỗi là `{ error: { code, message, details, requestId } }`; `code` ổn định (client dựa vào), `message` tiếng Việt. `204` cho xóa/hành động không trả dữ liệu.
- Xác thực bằng cookie HttpOnly (`__Host-pos_access`, không dùng Bearer); mọi request đổi trạng thái cần `Origin` đúng và `X-CSRF-Token`. Thanh toán và hoàn tất đơn 0đ cần `Idempotency-Key`; trùng key trả lại kết quả cũ với header `Idempotent-Replay: true`. Access token 30 phút, refresh 7 ngày.
- Vai trò: `PLATFORM_ADMIN` (không thuộc store), `OWNER` (một store), `MANAGER` và `CASHIER` (một chi nhánh). Quyền kiểm theo mã permission (ví dụ `pos.sell`, `shift.open`, `invoice.cancel_open`, `branch.access_all`), không kiểm theo tên vai trò cứng.
- Thêm hoặc đổi endpoint: đọc `docs/api-spec.md`, cập nhật spec trong `.devloopflow/specs/`, thêm mã lỗi mới vào danh mục lỗi và test tương ứng.

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
| `.devloopflow/specs/`, `.devloopflow/approved/` | Spec hiện hành và plan đã duyệt; kiểm tra trạng thái trước khi triển khai. |
| `.devloopflow/plans/`, `.devloopflow/tasks/` | Plan và task theo trạng thái của plugin; đọc phần active khi tiếp tục việc. |
| `.devloopflow/errors/INDEX.md`, `.devloopflow/MEMORY.md` | Lỗi đã gặp và bài học; chỉ mở mục liên quan. |
| `.devloopflow/verify/` | Báo cáo AC, sổ FAIL, raw evidence local; chỉ mục ở `EVIDENCE-INDEX.md`. |
| `docs/architecture/ARCHITECTURE.md` | Thành phần, ranh giới module, triển khai và luồng dữ liệu **mục tiêu**. |
| `docs/architecture/auth.md` | Phiên, JWT, cookie, mật khẩu và giới hạn thử. |
| `docs/architecture/TECH_STACK.md` | Công nghệ/framework/thư viện **đang dùng** theo backend, frontend và hạ tầng; đọc trước khi chọn hoặc thêm dependency. |
| `THIRD_PARTY_INTEGRATIONS.md` | Tích hợp SePay (webhook) và VietQR (QR) đã triển khai trong Sprint 08 trên local, đã kiểm trên SePay Test mode (verify-ac vòng 10, 10/11/2026, chưa có CI độc lập); dự án chỉ dùng Test mode, Live ngoài phạm vi. Đọc khi làm luồng chuyển khoản hoặc mã QR. |
| `DESIGN.md` | Giao diện POS, component, tương tác, ngôn ngữ và thiết bị. |
| `rules/` | Quy tắc làm việc chung; chọn file phù hợp theo bảng bên dưới. |
| Vai trò khám phá / review / QA | Dùng skill devloopflow cho cả hai agent: khám phá `devloopflow:explore`, review `devloopflow:review-code`, kiểm thử/nghiệm thu `devloopflow:verify-ac`; các vai trò này không sửa source theo chỉ dẫn. Cấu hình `.codex/agents/` (`explorer`, `code-reviewer`, `qa`) hiện đã bị xóa khỏi working tree (chưa commit), không còn là nguồn. |
| `.claude/`, `.codex/`, `.agents/skills/` | Cấu hình theo từng agent, phạm vi project (không cài global): Claude Code dùng `.claude/settings.json` (hook, plugin) và `.claude/skills/`; Codex dùng `.codex/hooks.json`, `.codex/skills/` và `.agents/skills/`. Hai bên giữ cùng bộ skill và cùng quy tắc; xem mục "Đồng bộ Claude Code và Codex". |
| `POS_UI/`, `POS_API/`, `POS_INFRA/` | Mã UI, backend và hạ tầng; kiểm tra mã thực tế trước khi nói tính năng đã chạy. |
| `.devloopflow/devloopflow.md` | Lệnh thật, nguồn tài liệu và cấu hình quy trình riêng của dự án. |
| `sprints/` | Kế hoạch và kết quả từng sprint: mục tiêu, backlog được đề xuất hoặc đã chốt, tiêu chí nghiệm thu, review và retrospective. Đọc sprint hiện hành để biết cam kết và trạng thái thực tế; mục đề xuất chưa phải việc đã được duyệt hay hoàn thành. |

Trong `rules/`: đọc `clean-code.md`, `coding-style.md`, `naming.md` khi viết/sửa code; `database.md` khi làm DB/ORM; `security.md` khi xử lý dữ liệu, secret hoặc quyền; `testing.md` khi kiểm thử; `git.md` trước khi tạo nhánh, commit, push hoặc merge. Các rule này không phụ thuộc ngôn ngữ/công nghệ. Spec mới ghi theo devloopflow sau khi chốt quyết định; hợp đồng lịch sử nằm nguyên byte trong `.devloopflow/specs/` (tên theo module, ví dụ `invoices.md`).

## Công cụ phát triển của dự án

- **Devloopflow:** quy trình chính cho spec, plan, TDD, review, kiểm AC và hồ sơ task/lỗi/memory ở `.devloopflow/`. Chọn skill đúng bước đang làm; việc nhỏ không cần chạy cả flow. Đọc `.devloopflow/devloopflow.md` để lấy lệnh và nguồn thực tế.
- **Graphify:** tra symbol và quan hệ để khoanh vùng trước khi mở source; AST cho code chạy cục bộ. Chỉ semantic extract tài liệu thay đổi cần thiết, tránh quét lại hồ sơ lịch sử trùng lặp; graph giúp định vị, source/test mới là bằng chứng. Quy tắc cập nhật ở mục Graphify bên dưới.
- **Caveman (cách trả lời, cả hai agent):** trả lời ngắn, rút lời thừa, giữ nguyên số liệu, lệnh, tên file và điều kiện. Đây là cách viết câu trả lời, không thay quy trình và không được làm mất cảnh báo, giới hạn hay phần chưa kiểm chứng. Claude Code bật plugin `caveman` ở cấp project để áp dụng mỗi phiên; Codex áp dụng quy tắc này trực tiếp khi trả lời. User yêu cầu giải thích chi tiết thì viết đủ.
- **Ponytail (cách viết code, cả hai agent):** khi viết/sửa/review code, chọn thay đổi nhỏ nhất giải quyết đủ yêu cầu, tái dùng mã và dependency sẵn có, kiểm phần có rủi ro. Không cắt kiểm tra bảo mật, dữ liệu hay nghiệm thu. Claude Code bật plugin `ponytail` ở cấp project; Codex áp dụng quy tắc này trực tiếp.
- **Skill giao diện:** `impeccable`, `ui-ux-pro-max`, `frontend-design`, `design-taste-frontend` có cho cả hai agent (Codex: `.agents/skills/`; Claude Code: `.claude/skills/`). Dùng khi thiết kế, sửa hoặc review UI; `DESIGN.md` và quy tắc sản phẩm của dự án thắng khi skill gợi ý khác. Hook `impeccable` kiểm lỗi giao diện sau khi sửa file UI (Codex: `.codex/hooks.json`; Claude Code: `.claude/settings.json`).
- Tiết kiệm chi phí bằng cách đọc đúng mục từ graph/memory, dùng skill đúng việc và tránh trích xuất lại bản sao; không gán mức tiết kiệm tiền/token khi chưa đo.

## Đồng bộ Claude Code và Codex

- `AGENTS.md` là nguồn chung duy nhất cho quy tắc dự án; `CLAUDE.md` nhập nó bằng `@AGENTS.md` và chỉ thêm phần riêng của Claude Code. Không chép nội dung chung sang `CLAUDE.md`; sửa quy tắc chung thì sửa ở đây.
- Hồ sơ làm việc chung cho cả hai: `.devloopflow/` (spec, plan, task, lỗi, memory, verify). Plugin devloopflow hỗ trợ cả Claude Code và Codex; không giữ hồ sơ riêng theo agent.
- Mỗi tool/skill/hook thêm cho một agent phải có phần tương đương cho agent kia hoặc ghi rõ vì sao không áp dụng được. Khi sửa một bản sao của skill (`.agents/skills/`, `.claude/skills/`, `.codex/skills/`), cập nhật các bản còn lại cùng thay đổi.
- Hai agent làm việc cùng nhánh và cùng working tree: không ghi đè thay đổi chưa commit của nhau, đọc `git status` trước khi sửa, và ghi tiến độ vào task active để agent kia tiếp tục được.

## Tìm hiểu code

- Dùng Graphify để khoanh vùng mã và quan hệ trước khi đọc sâu, giúp giảm lượng nội dung và token cần xử lý; sau thay đổi, cập nhật graph theo quy tắc bên dưới.
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
- Mỗi agent có lớp chặn riêng: Codex dùng `.codex/rules/source-protection.rules`; Claude Code dùng kiểm tra an toàn và permission của công cụ khi xóa đệ quy. Các lớp này chỉ là lớp thêm; vẫn phải tuân thủ các quy tắc trên với PowerShell, script, tool khác và mọi cách viết lệnh mà rule không nhận diện được. Nếu môi trường không cho hỏi phê duyệt hoặc lệnh bị chặn, không thực hiện xóa nguy hiểm, không chia nhỏ lệnh hay lách qua công cụ hoặc cú pháp khác; báo user và để user duyệt hoặc tự chạy.

## Hồ sơ công việc

- Với việc mới, dùng quy trình và mẫu của devloopflow trong `.devloopflow/`; đọc `.devloopflow/devloopflow.md`, `.devloopflow/MEMORY.md`, task/plan đang active và `.devloopflow/errors/INDEX.md` theo đúng skill liên quan. Ghi đầy đủ tiến độ, nguồn và bằng chứng vào file plugin, không chỉ giữ trong hội thoại.
- Hồ sơ lịch sử đã chuyển nguyên byte vào các thư mục cùng tên trong plugin (`.devloopflow/specs|plans|tasks|errors/`), tên giữ nguyên. Không tạo plan được duyệt hoặc kết quả kiểm AC mới từ hồ sơ cũ.
- Khi dùng bài học hoặc lỗi lịch sử, đối chiếu mã, tài liệu và test hiện tại. Ghi hồ sơ mới đúng thư mục plugin; không ghi vào archive.

## Bằng chứng QA

- Khi kiểm AC, dùng `devloopflow:verify-ac` để áp dụng quy tắc chứng cứ; không suy PASS từ số test hoặc báo cáo thiếu artifact.
- Báo cáo và sổ FAIL ở `.devloopflow/verify/<id>/`; raw evidence ở `evidence/` chỉ lưu local và bị Git bỏ qua. Chỉ commit Markdown đã che dữ liệu nhạy cảm.
- Chứng cứ QA lịch sử và báo cáo đã được chuyển vào `.devloopflow/verify/<tên lần chạy gốc>/` (báo cáo Markdown) và `.devloopflow/verify/<tên lần chạy gốc>/evidence/` (raw và `SHA256SUMS`, chỉ có local); tra `.devloopflow/verify/EVIDENCE-INDEX.md`. Bản sao lịch sử không tạo lượt nghiệm thu mới.

## Graphify

Graphify được tích hợp theo phạm vi project cho cả hai agent, không cài global: Codex dùng skill `.codex/skills/graphify/SKILL.md`; Claude Code dùng skill `.claude/skills/graphify/SKILL.md` và hook trong `.claude/settings.json` (PreToolUse nhắc chạy `graphify query` trước khi grep/đọc source; SessionStart `compact` đặt lại ngân sách nhắc; lệnh hook gọi `graphify` qua PATH). Graph nằm trong `graphify-out/` (bị gitignore). Không chạy lại `graphify codex install` (lệnh đó ghi vào `AGENTS.md`); `graphify claude install` đã chạy một lần và không cần lặp lại.

- Trước mọi query hoặc dùng nội dung graph, kiểm tra `graphify-out/needs_update` (có thể chạy `graphify check-update .`). Nếu marker tồn tại, không đọc graph cũ. Thực hiện semantic update trước, xác minh nội dung mới đã vào graph, rồi mới xóa đúng marker `graphify-out/needs_update`. Không xóa marker nếu update thất bại hoặc chưa kiểm chứng.
- Sau khi tạo, sửa hoặc xóa code, chạy `graphify update .` để cập nhật AST graph. Đây là lệnh đồng bộ do agent chạy; nó không tự chạy chỉ vì agent sửa file.
- Sau khi tạo hoặc sửa Markdown, chạy quy trình semantic update của skill Graphify (`.claude/skills/graphify/SKILL.md` hoặc `.codex/skills/graphify/SKILL.md`, và `references/update.md` tương ứng) cho các Markdown thay đổi. `graphify update .` chỉ cập nhật code và không thay thế semantic extraction. Chỉ xóa marker sau khi merge graph thành công và query đã xác nhận nội dung mới.
- Các hồ sơ lịch sử trong `.devloopflow/specs|plans|tasks|errors/` (tên có ngày hoặc id cũ) và các báo cáo QA lịch sử trong `.devloopflow/verify/<tên lần chạy gốc>/` là bản lưu lịch sử; semantic extraction dùng tài liệu hiện hành và `.devloopflow/verify/EVIDENCE-INDEX.md`, không trích xuất lại bản lưu lịch sử. Khi hồ sơ hiện hành đổi, cập nhật nguồn nếu cần.
- Graph ban đầu được tạo bằng `--code-only`; nhiều tài liệu khác trong repository chưa được lập chỉ mục. Giới hạn semantic update vào tài liệu thay đổi trong task. Nếu công cụ sẽ kéo thêm hàng trăm tài liệu chưa được index và không thể giới hạn an toàn, báo phạm vi đó trước khi chạy semantic extraction rộng.
- `graphify watch .` là watcher tùy chọn chạy như một process riêng (cần package `watchdog`). Khi đang chạy, Graphify tự rebuild graph cho code; với Markdown/tài liệu, nó chỉ ghi `graphify-out/needs_update` và yêu cầu agent thực hiện semantic update. Watcher không được tự khởi chạy bởi config hay hook hiện tại.
- Graphify watcher bỏ qua các event nằm trong thư mục output `graphify-out/`, nên cập nhật graph/report/cache không tự kích hoạt vòng rebuild lặp. Giữ nguyên quy tắc loại trừ này.
- Graphify query/path/explain, cập nhật code và semantic update sau Markdown chỉ chạy khi agent thực hiện các bước nêu trên; hook của Claude Code chỉ nhắc, không tự rebuild graph, nên không mô tả chúng là tự động. Dùng `rg`/đọc file trực tiếp cho literal, config, business rule, loại file chưa hỗ trợ và xác nhận source.
- Khi giao việc khám phá code cho subagent, đưa kèm quy tắc: chạy `graphify query "<câu hỏi>"` trước khi grep hoặc đọc source; chỉ đọc raw file ở đúng dòng graph đã chỉ ra. Nếu `graphify-out/wiki/index.md` tồn tại, dùng nó để điều hướng rộng; chỉ đọc `graphify-out/GRAPH_REPORT.md` khi cần rà kiến trúc tổng thể.
