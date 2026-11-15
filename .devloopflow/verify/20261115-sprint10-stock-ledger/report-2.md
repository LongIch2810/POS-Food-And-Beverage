# Kiểm AC report 20261115-sprint10-stock-ledger — vòng 2

## Kết luận
PASS trong phạm vi kiểm lại V1-1 và V1-2.

- Ngày: 2026-11-15; local do ac-verifier chạy, không phải CI/runner độc lập.
- Plan đối chiếu: `.devloopflow/approved/20261115-sprint10-stock-ledger.md`.
- Spec đối chiếu: `.devloopflow/specs/20261115-sprint10-stock-ledger.md`.
- V1-1: E2E-AC-1, E2E-AC-6, E2E-AC-11 đều Đúng bằng chứng mới từ DB/API/browser.
- V1-2: ràng buộc spec dòng 68 và 71 đều Đúng sau khi cập nhật ba tài liệu đã được user chỉ định; test auth tập trung 6 pass, 0 fail.
- Không kiểm lại 66 AC sub-task và 11 E2E còn lại. Những AC này giữ kết quả report-1; bảng dưới liệt kê đủ 80 AC và đánh rõ không chạy lại. Test auth chạy để chứng minh ràng buộc “kèm test”; không coi đây là chạy lại toàn bộ nhóm ST-2 hoặc toàn bộ task.
- Sổ FAIL giữ lịch sử vòng 1, đổi V1-1/V1-2 sang `đã PASS`; không còn mục `mở`.

## Tài liệu nguồn đã đối chiếu
- `AGENTS.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `.devloopflow/devloopflow.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `.devloopflow/MEMORY.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `.devloopflow/errors/INDEX.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `.devloopflow/approved/20261115-sprint10-stock-ledger.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `.devloopflow/plans/active/20261115-sprint10-stock-ledger.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `.devloopflow/specs/20261115-sprint10-stock-ledger.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `.devloopflow/tasks/active/20261115-sprint10-stock-ledger.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `.devloopflow/verify/20261115-sprint10-stock-ledger/report-1.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `.devloopflow/verify/20261115-sprint10-stock-ledger/fails.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `docs/PRODUCT_OVERVIEW.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `docs/BUSINESS_RULES.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `docs/DESIGN_DB_POS_SYSTEM.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `docs/api-spec.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `.devloopflow/specs/inventory.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `.devloopflow/specs/auth.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `docs/architecture/auth.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `docs/architecture/TECH_STACK.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `DESIGN.md` — đọc phần liên quan đến phạm vi kiểm lại.
- `rules/testing.md` — đọc phần liên quan đến phạm vi kiểm lại.
- Source: `POS_API/src/auth/auth.service.ts` (SessionUser, sessionUser, login/me/refresh), `auth/http/auth.dto.ts`, `auth/tests/session-branch-name.http.test.ts`; `POS_UI/src/auth/client.ts`, `auth/session.ts`, `components/common/AppShell.tsx`, `features/inventory/InventoryScreen.tsx`, package và lockfile. Snapshot trích đúng dòng/hash: `evidence/r2-documents.json`.
- Không query graph cũ vì `graphify-out/needs_update` tồn tại; dùng nguồn/literal trực tiếp theo chỉ dẫn agent chính.

## Môi trường
- App đã chạy sẵn: Docker Compose local, UI http://localhost:5173, API http://localhost:3000, PostgreSQL local 127.0.0.1:5432. `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml ps` cho API/postgres healthy, UI Up; `curl.exe -s http://localhost:3000/api/v1/health` trả `{"data":{"status":"ok"}}`.
- Lệnh chạy app theo plan: `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait`; vòng 2 không khởi chạy/rebuild lại image vì các source/package nằm trong snapshot vòng 1 không đổi (so SHA-256 trong r2-documents.json), hai sửa đổi cần kiểm là tên fixture và tài liệu. App/API thực đã được dùng lại cho từng AC.
- Playwright MCP `browser_run_code_unsafe` trả `Browser is already in use ... use --isolated`. Không đóng browser người khác. Fallback dùng Chrome thật headless qua `puppeteer-core` đã cài trong dự án, viewport 1024×768, app Vite/StrictMode thật; không mock fetch/API.
- Script: `node .devloopflow/verify/20261115-sprint10-stock-ledger/evidence/scripts/r2-verify.cjs`.
- Trước khi đổi password thử: kiểm chính xác store ID/name, hai username, store_id, role và branch_id trong DB. Password ngẫu nhiên và hash gốc chỉ ở RAM; chỉ cập nhật hai fixture OWNER A/MANAGER B1. `finally` đăng xuất phiên thử, đóng Chrome do runner tạo, khôi phục password_hash và must_change_password rồi SELECT xác minh; `r2-results.json.cleanup.accountsRestored=true`. Không sửa tên/branch/stock/invoice, không xóa dữ liệu hoặc volume, giữ Compose chạy vì có trước lượt kiểm.
- ZA10/ZDD1 được tạo qua POST /branches ở vòng 1 và được giữ lại. Vòng 2 tái dùng đúng fixture, không tạo trùng; snapshot DB xác nhận ZA1, ZA2, ZA3, ZA10, ZĐ1.
- Trong lần chuẩn bị runner, truy vấn nhầm cột stores.code/roles.code; chưa chạm dữ liệu, lưu r2-harness-initial.json/r2-harness-role.json. Lần đầu runner đọc cache HTTP304 làm assertion “mọi request 200” không đạt, lưu r2-harness-cache.json, cleanup true. Runner cuối tắt cache và thu lại đủ hành vi/nguyên status200; không đổi source/expectation. Đây là sửa harness trước khi chốt lượt kiểm, không phải sửa production.
- Một lần gọi helper `npm exec -- node ...` bị chờ cài executable; dừng đúng ba process do helper tạo và đổi helper sang Node hiện có. Không kết luận AC từ lần đó; lượt cuối dùng node.exe trực tiếp, test log có exit0.

## Kết quả test
| Lệnh | Kết quả mới | Bằng chứng |
|---|---|---|
| node evidence/scripts/r2-verify.cjs | exit0; E2E-AC-1 PASS, E2E-AC-6 PASS, E2E-AC-11 PASS | evidence/r2-results.json; script ghi assertion và đầu vào; ảnh r2-E2E-AC-*.png |
| POS_API: npm run build | exit0 | evidence/r2-api-build.log |
| POS_API: node --env-file-if-exists=.env --test --test-concurrency=1 dist/auth/tests/session-branch-name.http.test.js | exit0; # tests 6, # pass 6, # fail 0, # skipped 0 | evidence/r2-auth-test.log |
| node evidence/scripts/r2-docs.cjs | exit0; V1-2-spec-68 PASS; V1-2-spec-71 PASS; hash source/package đối chiếu thành công | evidence/r2-documents.json |
| npm view react-router-dom time --json | exit0; 7.18.5 phát hành 2026-10-27T21:14:19.826Z, hơn 14 ngày trước ngày duyệt 2026-11-15 | evidence/r2-documents.json.routerRelease |

- Không chạy lại full API/UI test, UI build/typecheck, browser suite hoặc audit: E2E-AC-14 không thuộc lần kiểm lại. Không báo kết quả cũ thành kết quả mới.
- Test auth tạo/xóa DB thử riêng theo test hiện có; kiểm `pg_stat_activity` sau test không còn kết nối DB `pos_s10_%`.
- Log test mới được đọc đến cuối, mã thoát 0; không có token/password/hash thô trong log 1.246 byte.

## Coverage
- Không có lệnh/ngưỡng coverage trong manifest hoặc plan; không đo và không báo tỷ lệ coverage. Lint/format cũng không có script; không tự đặt.

## Đã đối chiếu errors
- Hai sửa đổi V1-1/V1-2 là dữ liệu fixture/tài liệu, không có sửa source; task và trường “Ai sửa” của sổ FAIL ghi rõ lý do không tạo hồ sơ errors/ mới. Không coi đây là thiếu hồ sơ bug production.
- Đã đọc `.devloopflow/errors/2026-10-29-compose-env-local.md`; dùng app local đang healthy, không đụng env/volume, không in mật khẩu DB.
- Đã đọc `.devloopflow/errors/20261110-backlog-branch-scope-null-branchid-fail-open.md`; nguyên nhân lịch sử là null branch ở sales. Case đó không thuộc hai mục kiểm lại, không tái chạy; không suy PASS lỗi lịch sử từ E2E-AC-1. Phạm vi manager của AC hiện tại được kiểm bằng network, UI và SQL.
- Đã đọc `.devloopflow/errors/20261115-settings-back-leaves-editor-open.md`; task có finding review R1-1 đã sửa và hồ sơ này có nguyên nhân, Red, fix và test tái hiện. Không chạy lại finding Settings trong lượt giới hạn này; các RF ngoài phạm vi giữ kết quả cũ.
- MEMORY M-4: kiểm bổ sung API phiên/source/DTO/test với ba tài liệu auth/tech stack; đạt qua V1-2. M-28: source/package và harness không bị QA sửa; không chạy hồi quy UI ngoài phạm vi. M-39: lưu đủ ma trận, hash, DOM/network/SQL và ảnh 1024×768; không đánh lại AC kích thước chạm/tương phản ngoài phạm vi.

## Bảng đối chiếu (MỌI AC trong plan, không bỏ AC nào)
- Ba dòng có kết luận Đúng là AC được chạy lại. Dấu “— (không chạy lại)” không phải kết luận mới; giữ kết quả tương ứng trong report-1.md.

| AC | Cách kiểm | Lệnh/bước đã chạy | Kết quả thật (nguyên văn hoặc path bằng chứng) | Mong đợi theo plan | Quy định trong tài liệu (nguyên văn + path:dòng) | Kết luận (Đúng / Sai / Lệch tài liệu / Tài liệu không quy định) | Ghi chú chỗ lệch |
|---|---|---|---|---|---|---|---|
| E2E-AC-1 | Browser + network + SQL | node evidence/scripts/r2-verify.cjs | 153 dòng toàn store khớp SQL theo từng dòng/branches.name; ZA1 lọc 12 dòng; MANAGER 12 dòng giống bảng đã lọc, không selector/cột Chi nhánh. Mọi request ledger status 200; OWNER dùng limit=100 và cursor; lọc gửi branchId đúng; MANAGER không gửi branchId. evidence/r2-results.json checks.E2E-AC-1; ảnh r2-E2E-AC-1-*.png | E2E-AC-1 (S10-11 vế "dữ liệu thật theo quyền và chi nhánh"; mục tiêu spec M1): Given `zzsokho_owner_a` đăng nhập, When mở `http://localhost:5173/kho/so-kho` với "Tất cả chi nhánh", Then network có `GET /api/v1/stock-movements?limit=100` (và trang tiếp nếu có) status 200, số dòng bảng = `SELECT count(*) FROM stock_movements m JOIN branches b ON b.id=m.branch_id WHERE b.store_id='29f61b69-b425-4b34-a0fe-fa3a4678540b'`, bảng có cột "Chi nhánh" mỗi dòng là `ZA1`/`ZA2` khớp `branches.name` của `m.branch_id`; chọn chi nhánh `ZA1` → request có `branchId=fb639e97-a646-4973-9672-7ab102d0edca`, không còn cột "Chi nhánh", số dòng = count DB của ZA1; `zzsokho_manager_b1` mở `/kho/so-kho` → không có ô chọn chi nhánh, không có cột "Chi nhánh", request không có `branchId`, chỉ dòng ZA1 (kiểm: browser + network + SQL). (approved/:217) | “Màn Sổ kho hiện cột Chi nhánh trong đúng trường hợp bảng Tồn kho đã hiện cột Chi nhánh (người xem có quyền xem mọi chi nhánh và chưa chọn một chi nhánh cụ thể), và hiện mã hóa đơn ở cột Ghi chú (M1, M2).” (.devloopflow/specs/20261115-sprint10-stock-ledger.md:26) | Đúng | Không còn lệch fixture |
| E2E-AC-2 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:218 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| E2E-AC-3 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:219 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| E2E-AC-4 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:220 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| E2E-AC-5 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:221 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| E2E-AC-6 | Browser + SQL + curl | node evidence/scripts/r2-verify.cjs | MANAGER không có ca OPEN; header bắt đầu ZA1, không có “Tất cả chi nhánh”; curl /auth/me status200 branchName="ZA1". OWNER header “Tất cả chi nhánh”; curl /auth/me branchName=null. evidence/r2-results.json checks.E2E-AC-6; ảnh r2-E2E-AC-6-*.png | E2E-AC-6 (mục tiêu spec L3): Given `zzsokho_manager_b1` đăng nhập (không có ca mở), When mở `/kho/so-kho`, Then tiêu đề trên cùng là `ZA1`, không có chữ "Tất cả chi nhánh" trong `header`; `GET /api/v1/auth/me` trả `data.user.branchName = "ZA1"`; OWNER A ở `/kho/so-kho` tiêu đề "Tất cả chi nhánh" và `branchName: null` (kiểm: browser + curl). (approved/:222) | “Tiêu đề hiện đúng tên chi nhánh của người bị gắn một chi nhánh; \"Tất cả chi nhánh\" chỉ cho người có quyền xem mọi chi nhánh (L3).” (.devloopflow/specs/20261115-sprint10-stock-ledger.md:29) | Đúng | Không còn lệch fixture |
| E2E-AC-7 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:223 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| E2E-AC-8 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:224 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| E2E-AC-9 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:225 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| E2E-AC-10 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:226 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| E2E-AC-11 | Browser + DOM options + SQL | node evidence/scripts/r2-verify.cjs | Option thực: ["Tất cả chi nhánh","ZA1","ZA10","ZA2","ZA3","ZĐ1"]. Tái dùng hai chi nhánh ZA10/ZDD1 đã được tạo qua API ở vòng1; không tạo trùng hoặc đổi tên dữ liệu khi kiểm vòng2. evidence/r2-results.json checks.E2E-AC-11; ảnh r2-E2E-AC-11-*.png | E2E-AC-11 (mục tiêu spec V1): Given OWNER A tạo thêm (qua `POST /api/v1/branches` hoặc UI Cài đặt) hai chi nhánh thử `{code:'ZA10',name:'ZA10'}` và `{code:'ZDD1',name:'ZĐ1'}` ngoài `ZA1`, `ZA2`, `ZA3` sẵn có, When mở ô chọn "Chi nhánh kho", Then thứ tự option là "Tất cả chi nhánh", "ZA1", "ZA10", "ZA2", "ZA3", "ZĐ1" ("ZA10" trước "ZA2": so chữ thuần; "ZA3" trước "ZĐ1": A trước Đ theo tiếng Việt) (kiểm: browser). (approved/:227) | “Ô chọn chi nhánh trên màn Kho xếp theo tên (V1, phần ô chọn).” (.devloopflow/specs/20261115-sprint10-stock-ledger.md:33) | Đúng | Không còn lệch fixture |
| E2E-AC-12 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:228 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| E2E-AC-13 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:229 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| E2E-AC-14 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:230 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-1.AC-1 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:248 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-1.AC-2 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:249 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-1.AC-3 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:250 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-1.AC-4 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:251 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-1.AC-5 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:252 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-1.AC-6 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:253 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-1.AC-7 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:254 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-2.AC-1 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:300 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-2.AC-2 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:301 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-2.AC-3 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:302 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-2.AC-4 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:303 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-2.AC-5 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:304 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-3.AC-1 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:339 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-3.AC-2 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:340 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-3.AC-3 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:341 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-3.AC-4 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:342 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-3.AC-5 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:343 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-4.AC-1 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:372 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-4.AC-2 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:373 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-4.AC-3 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:374 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-5.AC-1 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:407 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-5.AC-2 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:408 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-5.AC-3 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:409 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-5.AC-4 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:410 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-5.AC-5 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:411 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-5.AC-6 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:412 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-5.AC-7 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:413 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-5.AC-8 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:414 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-1 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:484 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-2 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:485 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-3 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:486 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-4 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:487 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-5 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:488 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-6 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:489 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-7 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:490 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-8 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:491 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-9 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:492 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-10 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:493 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-11 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:494 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-12 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:495 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-6.AC-13 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:496 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-7.AC-1 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:549 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-7.AC-2 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:550 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-7.AC-3 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:551 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-7.AC-4 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:552 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-7.AC-5 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:553 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-7.AC-6 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:554 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-7.AC-7 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:555 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-8.AC-1 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:587 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-8.AC-2 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:588 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-8.AC-3 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:589 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-8.AC-4 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:590 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-8.AC-5 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:591 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-8.AC-6 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:592 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-8.AC-7 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:593 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-8.AC-8 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:594 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-8.AC-9 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:595 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-8.AC-10 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:596 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-9.AC-1 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:640 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-10.AC-1 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:660 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-10.AC-2 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:661 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-10.AC-3 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:662 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-10.AC-4 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:663 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-10.AC-5 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:664 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-10.AC-6 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:665 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |
| ST-10.AC-7 | Không chạy lại | Không chạy lại vòng 2 | Không có chứng cứ mới cho AC này; xem report-1.md | Giữ AC đã duyệt tại approved/:666 | Không đối chiếu lại; giữ kết quả vòng 1 | — (không chạy lại) | Ngoài phạm vi V1-1/V1-2 |

## Đối chiếu spec (cấp tính năng)
- Chỉ đối chiếu lại mục của V1-1/V1-2; mục tiêu, phi mục tiêu, phản mục tiêu và ràng buộc khác không chạy lại. Không suy PASS toàn spec từ ba E2E.

| Mục của spec (nguyên văn) | Loại | AC hoặc bước đã chạy | Kết quả thật (nguyên văn hoặc path bằng chứng) | Kết luận |
|---|---|---|---|---|
| Màn Sổ kho hiện cột Chi nhánh trong đúng trường hợp bảng Tồn kho đã hiện cột Chi nhánh (người xem có quyền xem mọi chi nhánh và chưa chọn một chi nhánh cụ thể), và hiện mã hóa đơn ở cột Ghi chú (M1, M2). (:26; chỉ vế Chi nhánh thuộc lần này) | mục tiêu | E2E-AC-1 | 153 dòng/12 dòng đúng DB; cột và filter theo phạm vi; r2-results.json | Đúng cho vế kiểm lại; mã hóa đơn không chạy lại |
| Tiêu đề hiện đúng tên chi nhánh của người bị gắn một chi nhánh; "Tất cả chi nhánh" chỉ cho người có quyền xem mọi chi nhánh (L3). (:29) | mục tiêu | E2E-AC-6 | manager ZA1, owner Tất cả chi nhánh; curl me ZA1/null | Đúng |
| Ô chọn chi nhánh trên màn Kho xếp theo tên (V1, phần ô chọn). (:33) | mục tiêu | E2E-AC-11 | Tất cả chi nhánh, ZA1, ZA10, ZA2, ZA3, ZĐ1 | Đúng |
| Nếu tên chi nhánh của người dùng phải lấy từ API phiên (đăng nhập, khôi phục phiên), việc thêm field phải tương thích ngược, kèm test, và cập nhật spec/tài liệu auth liên quan cùng lúc với code (nguồn: `.devloopflow/MEMORY.md` M-4 theo tinh thần "cập nhật spec cùng code"). (:68) | ràng buộc | r2-docs.cjs; build và test auth tập trung; E2E-AC-6 | auth.md:37-40,61,86,95-98 có SessionUser/branchName nullable; architecture/auth.md:38 có login/refresh/me. Source branchName bổ sung, test 6 pass/0 fail. r2-documents.json, r2-auth-test.log | Đúng |
| Thêm thư viện `react-router-dom` là dependency trực tiếp mới: ghim phiên bản có sẵn từ ít nhất hai tuần, cập nhật `POS_UI/package.json`, `package-lock.json` và `docs/architecture/TECH_STACK.md` cùng thay đổi (nguồn: `CLAUDE.md` mục "Cách làm việc": thêm thư viện thì cập nhật file tech stack cùng thay đổi). Các test UI hiện nạp mã bằng `node:vm` và chặn import lạ nên phải cập nhật harness đúng cách, không sửa yếu test cũ (`.devloopflow/MEMORY.md` M-28). (:71) | ràng buộc | r2-docs.cjs: package/lock/docs, SHA và npm registry time | package/lock7.18.5 ghim; TECH_STACK.md:25 ghi router; :23 ghi Báo cáo và Sổ kho API thật. Release 2026-10-27; source/package không đổi sau vòng1. r2-documents.json | Đúng |
| Các mục còn lại của spec | mục tiêu / phi mục tiêu / phản mục tiêu / ràng buộc | Không chạy lại | Giữ report-1; ngoài phạm vi kiểm lại | Không có kết luận mới |

## FAIL / bug (mỗi FAIL cũng được lưu vào sổ fails.md)
- Không có FAIL mới trong phạm vi lần 2.
- V1-1 đã PASS bằng ba E2E; V1-2 đã PASS bằng đối chiếu tài liệu/source, package/release và test auth. Không xóa nội dung phát hiện vòng 1.

## Lệch tài liệu
- Không còn lệch fixture/tài liệu được ghi ở V1-1/V1-2: tên branch DB đúng AC; hợp đồng SessionUser và tech stack khớp source/package hiện tại.
- Phần “Khám phá” của plan mô tả baseline trước sửa là lịch sử, không coi đó là hợp đồng mới mâu thuẫn với spec đã duyệt.
- AGENTS.md/CLAUDE.md và spec inventory còn các câu trạng thái/DTO được plan liệt kê chờ sync-docs; không nằm trong V1-2 (ba tài liệu do user yêu cầu) và không được QA sửa hay nghiệm thu lại. Agent chính tiếp tục bước sync-docs; không coi report này đã hoàn tất mọi cập nhật tài liệu của task.

## Đánh giá test
- Runner dùng DB/API/app thật, kiểm từng dòng tên chi nhánh theo SQL có cùng thứ tự, kiểm đủ hai vai trò, request phân trang/lọc và exact options; không mock service/fetch.
- Test auth đi qua Nest HTTP và PostgreSQL DB riêng; đủ login9field, me/refresh, null khi không có branch, tên đổi và API nghiệp vụ. Không sửa test hoặc assert để PASS.
- Cache304 ở lượt helper đầu là điều kiện runner, giữ artifact thất bại; lượt cuối cache tắt thu đúng request200 mà plan yêu cầu.
- Console có 401 của auth trước đăng nhập và một 404 tài nguyên trên trang login; network auth tương ứng lưu trong r2-results.json. Không có pageerror; request sổ kho của ba AC đều200. Không gọi đây là console hoàn toàn sạch.

## Exploratory
| Case | Bước và đầu vào thật | Kết quả / chứng cứ |
|---|---|---|
| M-4 tài liệu cùng API | Đọc schema UserSummary/SessionUser và login/me/refresh; đối chiếu nullable field với source/test | r2-documents.json, r2-auth-test.log; đúng; không đổi 8field nội bộ của UserSummary |
| Tên branch và phạm vi | SQL theo store A + owner toàn bộ, ownerZA1, manager không branchId | 153/12/12; tên từng dòng đúng DB; r2-results.json |
| M-39 bằng chứng và hash | Screenshot 1024×768 + snapshot DOM/network/SQL; hash code/package so vòng1 | 7 source/package hash có trong baseline không đổi; ba tài liệu đổi; r2-documents.json |
| RF-1..RF-5 và các lỗi cũ ngoài hai mục mở | Không chạy lại | Không có kết luận mới; xem report-1.md. Test auth chạy theo V1-2 có hành vi rename trong DB riêng, nhưng không coi là chạy lại toàn bộ RF-5 trên fixture live. |

## Đề xuất
- Agent chính cập nhật lịch sử kiểm AC/task và tick ba E2E trong plan active theo report; verifier không sửa các file đó.
- Tiếp tục sync-docs trong phạm vi plan đã duyệt; các tài liệu ngoài ba file V1-2 chưa được xác nhận cập nhật xong ở vòng này.
- Không sửa production theo hai lỗi fixture/tài liệu đã đóng. Không chạy lại toàn bộ AC nếu chưa có yêu cầu hồi quy.
- Chỉ local/Chrome headless; chưa CI độc lập, production, thiết bị chạm thật hoặc nghiệm thu lại toàn bộ task. Graph semantic cho report/fails do agent chính làm sau khi nhận hồ sơ; verifier không ghi ngoài vùng được giao.

