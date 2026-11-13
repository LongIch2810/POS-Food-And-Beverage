# .devloopflow/devloopflow.md
<!-- Sinh bởi /devloopflow:init. Cấu hình RIÊNG cho quy trình devloopflow của dự án này. Mọi fact có path nguồn; không ghi secret. -->

- Cập nhật lần cuối: 2026-11-14

## 1. Liên kết với tài liệu chung
- Giới thiệu chung: `AGENTS.md`, `CLAUDE.md` (bản sao nội dung của `AGENTS.md`, tạo 2026-11-09), `README.md`.
- Loại dự án: monorepo gồm backend API, frontend UI và hạ tầng chạy local; không phải monorepo npm workspace.
- Monorepo:
  | Path | Ngôn ngữ / công nghệ | Vai trò | Lệnh riêng |
  |---|---|---|---|
  | `POS_API/` | TypeScript, Node.js, NestJS, TypeORM | API và migration PostgreSQL | `npm run build`, `npm test`, `npm run start`, `npm run migration:run` |
  | `POS_UI/` | TypeScript, React, Vite | UI | `npm run dev`, `npm run build`, `npm run typecheck`, `npm test` |
  | `POS_INFRA/` | Docker Compose, PostgreSQL | Môi trường phát triển local | Lệnh Compose ở `README.md` |
- Nguồn: `POS_API/package.json`, `POS_UI/package.json`, `POS_INFRA/compose.local.yml`, `README.md`, `docs/architecture/TECH_STACK.md`.

## 2. Lệnh cho quy trình (nguyên văn, kèm nguồn; chưa chạy thử nếu chưa chạy)
- Cài đặt: `npm ci` trong `POS_API/` và `POS_UI/`; nguồn: `README.md`, `.github/workflows/ci.yml`. Chưa chạy thử.
- Chạy app: từ gốc repo, `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait`; UI `http://localhost:5173`, API health `http://localhost:3000/api/v1/health`, Swagger development `http://localhost:3000/api/docs`. Cấu hình `POS_INFRA/.env.local` theo `POS_INFRA/.env.example`; không ghi hoặc dùng secret mẫu. Chưa chạy thử.
- Dừng app local: `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml down`; không thêm `-v` vì sẽ xóa volume dữ liệu local. Nguồn: `README.md`. Chưa chạy thử.
- Build API: trong `POS_API/`, `npm run build`. Nguồn: `POS_API/package.json`, `.github/workflows/ci.yml`. Đã chạy thử 2026-11-10 (local): exit 0.
- Build UI: trong `POS_UI/`, `npm run build`. Lệnh này typecheck rồi build Vite. Nguồn: `POS_UI/package.json`, `.github/workflows/ci.yml`. Đã chạy thử 2026-11-10 (local): exit 0.
- Test toàn bộ API: trong `POS_API/`, `npm test`; lệnh tự build rồi chạy `node:test`. Cần `DATABASE_URL` trỏ tới PostgreSQL local/test; test tạo và xóa database thử ngẫu nhiên với prefix `pos_pb01_test_`, `pos_pb02_test_`, `pos_pb03_test_`, `pos_pb04_test_`, `pos_pb04_migration_` hoặc prefix theo module trong test. Tài khoản DB cần quyền `CREATE DATABASE`. Tuyệt đối không dùng DB production. Nguồn: `POS_API/package.json`, `POS_API/README.md`, `POS_API/src/**/tests/`. Đã chạy thử 2026-11-13 (local, `DATABASE_URL` trỏ PostgreSQL sandbox Docker cổng 15432, không phải DB production): exit 0, 224/224 pass (task 20261113-sprint09-ui, evidence/b51/primary-api.log).
- Test toàn bộ UI: trong `POS_UI/`, `npm test` (Node `node:test`). Nguồn: `POS_UI/package.json`, `.github/workflows/ci.yml`. Đã chạy thử 2026-11-13 (local): exit 0, 143/143 pass (task 20261113-sprint09-ui, evidence/b51/ui-test-final.log).
- Test một file / một case: manifest không định nghĩa script riêng. API test TypeScript phải build trước; test UI là `test/*.test.mjs`. Dùng `node --test` với file hoặc `--test-name-pattern` khi cần tập trung; xác nhận đúng đường dẫn output `dist/` và lệnh cụ thể theo test liên quan trước khi chạy. Chưa chạy thử.
- Test giao diện đóng ca trên Chrome (chạy riêng, không thuộc `npm test`): từ `POS_UI/`, `node --test test/shift-close-accessibility.browser.mjs`; cần Chrome hoặc Chromium, có thể chỉ đường dẫn qua `CHROME_BIN`. Đã chạy thử local: 3/3 pass (task 20261113-sprint09-ui, evidence/fix-verify/green.log).\n- Lint: không có script lint trong `POS_API/package.json` hoặc `POS_UI/package.json`; CI hiện chạy build, test và audit dependency.
- Format: không có script format trong manifest hai package.
- Typecheck: trong `POS_UI/`, `npm run typecheck`. API kiểm kiểu qua `npm run build`. Nguồn: hai `package.json`. Đã chạy thử 2026-11-10 (local): `npm run typecheck` của `POS_UI/` exit 0.
- Coverage: không có script hoặc ngưỡng coverage trong manifest/CI.
- Migration / seed: trong `POS_API/`, `npm run migration:run` chạy TypeScript build rồi TypeORM migration theo `DATABASE_URL`; chỉ chạy với DB local/test đã xác nhận. Không dùng `schema:sync`; migration không tự chạy khi API khởi động. Nguồn: `POS_API/package.json`, `POS_API/README.md`, `docs/architecture/ARCHITECTURE.md`. Đã chạy trên sandbox local ngày 2026-11-11: output ghi migration `ManagerCancelOpen20261111000000` thành công và `COMMIT`; không có metadata exit code riêng. Bằng chứng local: `.devloopflow/verify/20261111-194533-48ed476-s8-verify-ac-r17/evidence/r17b-migration.command.json`, `r17b-migration.stdout.txt`.
- Lệnh an toàn đã chạy trong lần init: `node --version` → `v22.22.2`; `npm --version` → `10.9.7`; `npm run` trong từng package để liệt kê script (exit 0). Không chạy build, test, migration hoặc khởi động dịch vụ.

- Test browser icon/tooltip chạy riêng ngoài `npm test`: từ `POS_UI/`, `node --test test/icon-actions.browser.mjs`; cần Chrome hoặc Chromium. Đã kiểm local 2026-11-14: 22/22 pass (task 20261114-icon-tooltip-ui, evidence/verify-r1/icon-tests.log).

## 3. Cách kiểm AC thật (cho `ac-verifier`)
- Chạy app local bằng Docker Compose theo lệnh ở mục 2; kiểm tra health tại `http://localhost:3000/api/v1/health`; mở UI tại `http://localhost:5173`. Chỉ dùng sandbox/local.
- Kiểm API: dùng endpoint trong `docs/api-spec.md`, spec thiết kế đã duyệt ở `.devloopflow/specs/` và hợp đồng lịch sử cùng nhóm khi liên quan (cũng nằm trong `.devloopflow/specs/`); ghi method/path/status, request/response đã che dữ liệu nhạy cảm hoặc request ID.
- Kiểm UI: browser trên phiên bản UI cuối; lưu trạng thái trước/sau mỗi chuyển trạng thái cần chứng minh cùng URL, viewport và dấu vết request/network theo `AGENTS.md`.
- Dữ liệu/tài khoản test: API integration test tạo dữ liệu trong database thử riêng ngẫu nhiên; local bootstrap dùng tên biến `BOOTSTRAP_ADMIN_USERNAME` và `BOOTSTRAP_ADMIN_PASSWORD` trong `POS_INFRA/.env.local` hoặc `POS_API/.env`. Không ghi giá trị, password, token hoặc cookie vào file/bằng chứng. Nguồn: `POS_API/README.md`, `POS_INFRA/.env.example`, `POS_API/.env.example`.
- Dọn dữ liệu test: suite API tự tạo và xóa database thử có tên ngẫu nhiên; không tự xóa database/volume thủ công. Khi dừng Compose dùng `down` không có `-v` để giữ volume local. Nguồn: `POS_API/README.md`, `README.md`.
- Lệnh tuyệt đối không chạy trong AC: deploy/production; migration trên production; kết nối DB thật; xóa database hoặc volume dữ liệu không được xác nhận là sandbox; gọi dịch vụ ngoài có phí; in token, secret, cookie hoặc dữ liệu cá nhân thật.
- Báo cáo AC và sổ FAIL theo cấu trúc plugin ở `.devloopflow/verify/<id>/` (được commit nếu đã che dữ liệu); raw evidence mới ở `.devloopflow/verify/<id>/evidence/`, chỉ có local và bị Git bỏ qua. QA cũ nằm trong `.devloopflow/verify/<tên lần chạy gốc>/` (báo cáo Markdown đã theo dõi Git) và `.devloopflow/verify/<tên lần chạy gốc>/evidence/` (raw và `SHA256SUMS`, chỉ local); tra `.devloopflow/verify/EVIDENCE-INDEX.md`.
- Khi chạy browser/API/test/DB, áp dụng quy tắc chứng cứ của skill `devloopflow:verify-ac`; bảng trong `report-<n>.md` phải nối tiêu chí → tình huống → artifact thật. Gắn nhãn `CI/runner độc lập`, `local do agent chạy` hoặc `chưa xác minh`.

## 4. Cách viết test của dự án (cho `tdd`)
- Framework: Node `node:test`; API dùng `@nestjs/testing`, HTTP `fetch` và PostgreSQL integration; UI dùng `node:test` với `.test.mjs`. API tests ở `POS_API/src/**/tests/` và `POS_API/src/*.test.ts`; UI tests ở `POS_UI/test/`. Nguồn: `docs/architecture/TECH_STACK.md`, package manifests, `POS_API/README.md`.
- Fixture/helper: đọc và tái dùng fixture ngay trong test module tương ứng; API test dùng database thử ngẫu nhiên và phải tự dọn database. Chưa xác minh có factory dùng chung toàn repo.
- Mock ở biên HTTP/browser khi test UI; regression auth phải kiểm tra request và thứ tự promise thực tế theo test hiện có. API integration dùng PostgreSQL test thật; không mock transaction/constraint trong test dùng để xác nhận tính toàn vẹn DB. Nguồn: `docs/architecture/TECH_STACK.md`, `POS_API/README.md`, `rules/testing.md`.
- Unit test cho logic thuần; integration/API test cho DB, transaction, auth và permission; browser QA bổ sung cho hành vi UI thực. CI workflow: `.github/workflows/ci.yml` chạy backend install/build/migration/test/audit và frontend install/build/test/audit trên PostgreSQL 17.
- Root `AGENTS.md` yêu cầu kiểm tra caller/scope trước khi sửa logic dùng chung; giữ nguyên test; không tuyên bố pass nếu chưa chạy lại lệnh kiểm chứng tương ứng.

## 5. Chỗ rủi ro và quy tắc review riêng (cho `code-reviewer`)
- Auth/session/permission/tenant: `POS_API/src/auth/`, `POS_API/src/platform/`, `POS_API/src/organization/`, `POS_UI/src/auth/`; dữ liệu tenant/branch và session phải lấy từ identity đã xác minh. Kiểm tra bất kỳ ID tham chiếu nào cùng store và quyền branch. Nguồn: `docs/PRODUCT_OVERVIEW.md`, `docs/architecture/auth.md`, `docs/api-spec.md`.
- Tiền, hóa đơn, ca, tồn kho: `POS_API/src/sales/`, `POS_API/src/shifts/`, `POS_API/src/inventory/`; thay đổi thanh toán/trạng thái/trừ kho phải cùng transaction, idempotent và giữ sổ kho append-only. Giá/tổng do server tính; tiền nguyên `bigint`. Nguồn: `docs/PRODUCT_OVERVIEW.md`, `docs/BUSINESS_RULES.md`, `docs/DESIGN_DB_POS_SYSTEM.md`.
- Hợp đồng API: controller/DTO theo module dưới `POS_API/src/`; envelope/lỗi/health ở `POS_API/src/http/`; quy ước chung tại `docs/api-spec.md`; spec mới ở `.devloopflow/specs/` và hợp đồng endpoint lịch sử cũng ở đó (ví dụ `invoices.md`, `organization.md`). Bản lịch sử không thay thế phê duyệt hiện hành.
- Migration/dữ liệu: chỉ thay schema qua TypeORM migration; không dùng `schema:sync`, không sửa migration lịch sử; local test cần DB riêng. Deploy mục tiêu phải chạy migration riêng trước khi đưa API mới phục vụ. Nguồn: `POS_API/README.md`, `rules/database.md`, `docs/architecture/ARCHITECTURE.md`.
- Mặc định Medium trở lên: rò dữ liệu cross-store/branch, bypass permission/auth/CSRF, sai tiền hoặc trạng thái thanh toán, mất/sai stock movement, mất dữ liệu migration, lộ secret/token/PII, hoặc hồi quy giao dịch đồng thời. Nguồn: `AGENTS.md`, `docs/PRODUCT_OVERVIEW.md`, `rules/security.md`.
- Known gaps: trạng thái UI/API phải kiểm tra theo code và Product Backlog trước mỗi task; `README.md` phân biệt phần đã nối API với màn còn mô phỏng. `docs/architecture/ARCHITECTURE.md` là kiến trúc mục tiêu, không phải bằng chứng chức năng đã triển khai. Không báo tính năng ngoài MVP như đã có.

## 6. Bản đồ tài liệu nguồn (cho `explorer`, `ac-verifier`)
| Path | Là tài liệu chuẩn cho loại quy tắc nào | Ưu tiên (1 = cao nhất) |
|---|---|---:|
| `AGENTS.md` | Chỉ dẫn làm việc, bảo vệ source, kiểm thử, QA evidence và phân biệt trạng thái thực tế | 1 |
| Mã nguồn và test hiện tại | Hành vi đã triển khai; đối chiếu thay đổi và test | 1 (thực tế triển khai) |
| `docs/PRODUCT_OVERVIEW.md` | Phạm vi sản phẩm, vai trò, bất biến và luồng nghiệp vụ | 1 (sản phẩm) |
| `.devloopflow/specs/` | Spec thiết kế mới theo plugin; phải kiểm tra trạng thái và bản plan đã duyệt | 1 (chi tiết tính năng mới) |
| `.devloopflow/specs/` (tên module: `auth.md`, `sales.md`, `invoices.md`...) | Hợp đồng chức năng/endpoint đã chốt trước khi chuyển đổi; tra khi sửa chức năng cũ | 1 (chi tiết tính năng cũ) |
| `docs/BUSINESS_RULES.md` | Quy tắc nghiệp vụ mã BR | 2 |
| `docs/DESIGN_DB_POS_SYSTEM.md`, `rules/database.md` | Schema, constraint, index, transaction và migration | 2 |
| `docs/api-spec.md` | Quy ước HTTP, auth, lỗi, phân quyền, idempotency và pagination | 2 |
| `docs/architecture/auth.md` | Phiên, JWT/cookie, mật khẩu, refresh và CSRF | 2 |
| `DESIGN.md` | Giao diện, component, tương tác, ngôn ngữ và thiết bị | 2 |
| `docs/architecture/TECH_STACK.md` | Công nghệ hiện dùng; xác minh với manifests | 2 |
| `docs/architecture/ARCHITECTURE.md` | Ranh giới kiến trúc mục tiêu, không thay cho mã thực tế | 3 |
| `sprints/`, `docs/PRODUCT_BACKLOG.md`, `README.md` | Trạng thái sprint/backlog và tình trạng tích hợp gần nhất | 3 |
| `.devloopflow/verify/EVIDENCE-INDEX.md` | Bằng chứng nghiệm thu; raw artifact chỉ có local | 2 (evidence) |
| `rules/clean-code.md`, `rules/coding-style.md`, `rules/naming.md`, `rules/testing.md`, `rules/security.md` | Quy tắc code, đặt tên, test và bảo mật | 2 |

- Khi tài liệu mâu thuẫn hoặc chưa rõ ảnh hưởng business/security: dừng và hỏi user theo `AGENTS.md` và `docs/PRODUCT_OVERVIEW.md`; kiến trúc mục tiêu không lấn át code hiện tại khi mô tả trạng thái triển khai.

## 7. Thư mục làm việc devloopflow (mặc định đều nằm trong `.devloopflow/`; chỉ ghi đè khi dự án cần)
- specs: `.devloopflow/specs/`
- plans: `.devloopflow/plans/`
- plan đã duyệt: `.devloopflow/approved/`
- tasks: `.devloopflow/tasks/`
- báo cáo verify và fails: `.devloopflow/verify/`
- artifact QA mới: `.devloopflow/verify/<id>/evidence/` theo skill `devloopflow:verify-ac`; bản lưu lịch sử local và `SHA256SUMS` ở `.devloopflow/verify/<tên lần chạy gốc>/evidence/`, tra `.devloopflow/verify/EVIDENCE-INDEX.md`.
- errors: `.devloopflow/errors/`
- review (backlog lỗi nhẹ): `.devloopflow/review/`
- memory: `.devloopflow/MEMORY.md`; 11 bài học từ hồ sơ gốc đã nhập dưới id M-11..M-21 ngày 2026-11-12.
- hồ sơ lịch sử: 12 spec, 20 plan, 68 task, 34 error cũ nằm nguyên byte trong `.devloopflow/specs|plans|tasks|errors/` với tên gốc. Chúng không phải lượt duyệt/nghiệm thu mới.

## 8. CHƯA CÓ NGUỒN (đã hỏi user?)
- Không có mục chặn init. Lệnh chuyên biệt cho chạy riêng một test file/case không được định nghĩa trong manifest; dùng đường dẫn test hiện có và xác nhận lệnh trước khi chạy.
- Lệnh lint, format và coverage: không có trong package manifests/CI tại thời điểm khảo sát.
- Chưa có staging/production hoặc tài khoản test cố định được chỉ định trong tài liệu; chỉ kiểm AC trên sandbox/local, không tự chọn môi trường production.

## 9. Lịch sử cập nhật (chỉ thêm, không xoá)
- 2026-11-12 — Sao chép và đối chiếu SHA-256 cho 3.468 file QA cũ vào kho evidence lịch sử của plugin; lập manifest cho 1.000 file verify evidence Sprint 08 đã có, giữ nguồn và kết luận cũ.
- 2026-11-12 — Nhập hồ sơ cũ vào cấu trúc plugin theo lựa chọn phương án 3 của người dùng; giữ bản gốc và chứng cứ QA tại chỗ, lập bảng đối chiếu SHA-256, đổi hướng ghi hồ sơ mới sang `.devloopflow/`.
- 2026-11-12 — Mục 2: cập nhật trạng thái lệnh `npm run migration:run` từ “Chưa chạy thử” theo command metadata và stdout của sandbox R17; không suy exit code khi artifact không ghi — task 20261109-sprint08-payment (sync-docs).
- 2026-11-09 — Tạo cấu hình quy trình DevLoopFlow và bản đồ nguồn theo khảo sát POS-F&B — khởi tạo plugin cho repository; giữ `AGENTS.md` và dữ liệu hồ sơ cũ nguyên trạng.
- 2026-11-09 — Mục 1: bỏ câu "không có `CLAUDE.md`" vì `CLAUDE.md` đã tồn tại ở gốc repo (xác nhận bằng `ls`) — task 20261109-sprint08-payment (sync-docs).
- 2026-11-10 — Mục 2 (sync-docs lần 3): cập nhật số test đã chạy thử: API 137/137 (từ 132/132), UI 59/59 (từ 57/57); lệnh không đổi — task 20261109-sprint08-payment.
- 2026-11-10 — Mục 2 (sync-docs lần 4): cập nhật số test đã chạy thử: API 138/138 (từ 137/137), UI 60/60 (từ 59/59); lệnh không đổi — task 20261109-sprint08-payment.
- 2026-11-10 — Mục 2 (sync-docs lần 5, sau review vòng 10): cập nhật số test đã chạy thử: API 148/148 (từ 138/138), UI 62/62 (từ 60/60); lệnh không đổi — task 20261109-sprint08-payment.
- 2026-11-10 — Mục 2: đổi "Chưa chạy thử" thành "Đã chạy thử 2026-11-10 (local)" cho build API, build UI, test API (132/132), test UI (57/57), typecheck UI, đều exit 0 — task 20261109-sprint08-payment (sync-docs, sau fix-backlog). Không đổi lệnh, không đổi mục khác.
- 2026-11-11 — Mục 2 (sync-docs lần 6, sau verify-ac vòng 17 và fix-backlog B-39/B-40): cập nhật số test đã chạy thử: API 155/155 (từ 148/148), UI 85/85 (từ 62/62); lệnh không đổi (agent chính chạy lại local, UI typecheck/build exit 0) — task 20261109-sprint08-payment.
- 2026-11-13 — Mục 2 (sync-docs lần 7, sau verify-ac lần 1 task 20261112-sprint09-drawer-cancel-invoices): cập nhật số test API đã chạy thử: 199/199 (từ 155/155); lệnh không đổi (agent chính chạy lại local, exit 0). Số migration hiện tại 11 (test `foundation.test.ts:37`).
- 2026-11-13 — Mục 2 (sync-docs lần 8, task 20261112-sprint09-drawer-cancel-invoices): số test API 199/199 → 204/204 sau vòng review và fix-backlog (bằng chứng: `.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/report-3.md`, `npm test` xanh 3 lần).

- 2026-11-13 — Mục 2: cập nhật kết quả test API 224/224, UI 143/143 và thêm lệnh kiểm Chrome chạy riêng — task 20261113-sprint09-ui (sync-docs).\n
- 2026-11-14 — Mục 2: bổ sung lệnh kiểm browser icon/tooltip và kết quả local — task 20261114-icon-tooltip-ui (sync-docs).
