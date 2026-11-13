# Kiểm AC report 20261113-sprint09-ui — vòng 2

## Kết luận
PASS trong phạm vi kiểm lại V1-1, V1-2, V1-3 của E2E-AC-5 và E2E-AC-6. Cả ba FAIL chuyển `đã PASS`; không có FAIL mới trong phạm vi này.

- Ngày: 2026-11-13; quan sát browser chính: 15:26:55–15:28:13 UTC, tương ứng 22:26:55–22:28:13 giờ Việt Nam.
- Plan đối chiếu: `.devloopflow/approved/20261113-sprint09-ui.md`.
- Spec đối chiếu: `.devloopflow/specs/20261113-sprint09-ui.md`.
- Mọi phép kiểm vòng này là **local do agent chạy**, không phải CI/runner độc lập.
- Đây là lượt kiểm lại các FAIL mở theo yêu cầu. Không nghiệm thu lại toàn bộ 30 AC; không chạy lại các tình huống tiền/đóng ca, mạng, race, đổi phiên hoặc permission đã Đúng ở vòng 1. Không đổi kết quả hay artifact vòng 1. E2E-AC-5/6 được đối chiếu phần UI từng làm hai AC này Sai; phần đã đạt giữ chứng cứ trong `report-1.md`.

## Tài liệu nguồn đã đối chiếu
- `AGENTS.md`: giới hạn vai trò kiểm AC, bảo vệ working tree và sandbox.
- `docs/PRODUCT_OVERVIEW.md`: mục 1, 6.3, 8, 10; tablet, tiếng Việt, VND và đếm mù.
- `DESIGN.md`: 33, 137–144, 506–517, 646–656; kích thước chạm, nhãn, dialog và tương phản.
- `docs/BUSINESS_RULES.md`: BR-17/20/88/58/59/61 và công thức ca; vòng này không đổi hoặc kiểm lại nghiệp vụ.
- `docs/DESIGN_DB_POS_SYSTEM.md`: ca, đối soát, chi phí và snapshot; dùng để nhận diện fixture.
- `docs/api-spec.md`: mục đếm mù dòng 455 và quy ước API.
- `.devloopflow/specs/sales.md`, `.devloopflow/specs/shifts.md`: hợp đồng lịch sử liên quan; không thay thế quyết định Task A/B hiện hành.
- `.devloopflow/specs/20261112-sprint09-drawer-cancel-invoices.md`: phần quyết định chi phí/đếm mù và quyền.
- `.devloopflow/specs/20261113-sprint09-ui.md`: G4, phản mục tiêu và ràng buộc UI.
- `.devloopflow/approved/20261113-sprint09-ui.md`: UI-6/7, E2E-AC-5/6, B05/B06, RF-1..5 và lệnh kiểm.
- `sprints/sprint-09/SPRINT.md:38`: S9-06.
- `.devloopflow/devloopflow.md`, `.devloopflow/MEMORY.md`, `.devloopflow/errors/INDEX.md` và các hồ sơ lỗi liệt kê bên dưới.
- `.devloopflow/tasks/active/20261113-sprint09-ui.md`: lịch sử sửa ba finding; chỉ đọc, không cập nhật task.
- `.devloopflow/verify/20261113-sprint09-ui/report-1.md`, `fails.md`: cách tái hiện gốc và phạm vi phần cần kiểm lại.
- Skill `verify-ac/SKILL.md`, `role.md`, `references/ac-verifier.md`, `templates/verify-report.md`, `templates/fails.md`; `conventions/SKILL.md`, `references/nen-tang.md`. Áp dụng ngoại lệ lượt chạy lại: chỉ kiểm các FAIL/AC được truyền; không suy PASS từ test count.

## Môi trường
- Khi bắt đầu, API/UI vòng 1 đã dừng; PostgreSQL Docker `pos_infra-postgres-1` vẫn bind `127.0.0.1:15432`.
- API: trong `POS_API/`, `npm run build`, rồi `node dist/main.js`; `NODE_ENV=development`, `PORT=3001`, `PUBLIC_ORIGIN=http://localhost:5174`, `SEPAY_ENV=test`, `DATABASE_URL` trỏ đúng PostgreSQL local 15432/DB `pos_s9_ui_codex_20261113`. Credentials lấy trực tiếp từ `POS_INFRA/.env.local`; JWT/CSRF secret sinh ngẫu nhiên riêng trong bộ nhớ process, không ghi file hay output.
- UI: trong `POS_UI/`, `VITE_API_TARGET=http://localhost:3001`, `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`.
- URL thật `http://localhost:5174/`; màn Ca làm. Playwright MCP thật, context riêng CASHIER và OWNER, viewport 1024×768 và 768×1024.
- Lần bật API đầu thiếu auth secrets nên dừng trước phục vụ (`evidence/r2-api-app.log`). Sau cấp secrets trong process, API lên và health trả `{"data":{"status":"ok"}}`; log đúng là `evidence/r2-api-app-active.log`. Thao tác tạo secret đầu dùng static API không có trên PowerShell hiện tại, được đổi sang instance RNG; không coi các lần khởi động chưa thành công là kết quả kiểm AC.
- Fixture mới duy nhất về vận hành: mở một ca CASHIER qua UI thật (`POST /api/v1/work-shifts` → 201) vì cashier không còn ca OPEN. Ca `0783494e-cd39-4800-bb75-aa821c2710d4`, tiền đầu ca 80.000đ kế thừa server; cùng ca dùng để mở hộp thoại thường và cưỡng chế, không submit đóng ca. Không tạo hóa đơn, khoản chi, branch hoặc user mới.
- `evidence/r2-current-fixture.json` và `r2-db-readonly.json`: GET current 200, truy vấn `BEGIN READ ONLY` xác nhận đúng DB, ca mới còn OPEN; ba ca cũ CLOSED được giữ; dữ liệu hiện có vẫn 26 hóa đơn, 2 khoản chi, 1 branch, 3 user. Giữ fixture mới, không cleanup xóa, không xóa DB/volume.
- Đã đóng hai tab/context do lượt này tạo và dừng đúng hai process API/UI do verifier bật sau khi kiểm PID/command line. PostgreSQL vẫn chạy; `evidence/r2-environment-and-stop.json` ghi health, command, PID và trạng thái cổng sau dừng. Không dừng tab mặc định có sẵn.
- Chỉ ghi file trong thư mục verify của task. Không sửa source, test, task, plan, config hoặc Git. Graph/semantic update thuộc agent chính; vai trò này không có quyền ghi graph.

## Kết quả test
| Lệnh thực chạy | Kết quả mới | Evidence |
|---|---|---|
| Trong `POS_UI/`: `node --test test/shift-close-accessibility.browser.mjs` | Exit 0; `# tests 3`, `# pass 3`, `# fail 0`, `# skipped 0`. Ba case V1-1/2/3 chạy thật. | `evidence/r2-close-browser-test.log` |
| Trong `POS_UI/`: `npm run build` | Exit 0; gồm TypeScript noEmit và Vite production build. | `evidence/r2-ui-build.log` |
| Trong `POS_API/`: `npm run build` | Exit 0 để khởi động ứng dụng cuối; không chạy test API. | `evidence/r2-api-build.log` |
| Từ gốc: `node .devloopflow/verify/20261113-sprint09-ui/evidence/scripts/r2-assert-measurements.cjs` | Exit 0; `observations: 6`, `controls: 92`, `accessibleFieldLookups: 30`, `failures: 0`. Assertions đọc số đo từ app thật. | `evidence/r2-measurement-assertions.log` |
| Từ gốc: `node .devloopflow/verify/20261113-sprint09-ui/evidence/scripts/r2-db-readonly.cjs` | Exit 0; đúng sandbox và ca mới còn OPEN; transaction chỉ đọc. | `evidence/r2-db-readonly.json` |

Không chạy lại full API/UI test, lint/skill inspector hoặc audit dependency trong vòng này: giới hạn là ba FAIL UI đã được yêu cầu. Không lấy log full suite vòng 1 hay fix-verify làm kết quả test mới.

## Coverage
Không chạy coverage; manifest/CI không có script hoặc ngưỡng (`.devloopflow/devloopflow.md:29`, approved plan:473). Không công bố phần trăm coverage.

## Đã đối chiếu errors
| Hồ sơ | Phép kiểm mới trong vòng 2 | Kết quả / evidence |
|---|---|---|
| `.devloopflow/errors/20261113-shift-close-touch-targets.md` | Mọi button/input/textarea trong hai modal; cả hai chế độ thường và cả hai viewport. | 92 control observations đạt chiều rộng ≥48, cao ≥48; hai nút xác nhận cao 56. `r2-blind-measurements.json`, `r2-force-measurements.json`. |
| `.devloopflow/errors/20261113-shift-close-field-labels.md` | Kiểm `label.control`/id, `getByLabel` và click label chuyển focus; thêm tên truy cập của 9 ô số tờ. | Mỗi lookup đúng 1; mọi label click đưa focus đúng field. Cùng hai JSON trên. |
| `.devloopflow/errors/20261113-force-close-field-contrast.md` | Computed border/background của ba field cưỡng chế tại cả hai viewport; tính relative luminance. | Viền `rgb(138, 151, 157)` trên trắng: `3.0025039007227687:1`; đúng token `#8a979d`. `r2-force-measurements.json`. |
| `.devloopflow/errors/20261109-payment-dialog-focus-trap.md` | Tab từ nút cuối về đóng; Shift+Tab từ đóng về nút cuối; Escape đóng modal và trả focus. | Đạt trong 6 trạng thái đã đo, Escape thường về `Đóng ca (Đếm mù)`, cưỡng chế về `Đóng cưỡng chế`. Hai JSON số đo. Không chạy lại ca polling/uncertain hoặc Drawer vì ngoài ba FAIL mở. |

Ba finding sửa production của lần fix-verify đều có hồ sơ đủ triệu chứng/nguyên nhân/fix/test/phòng tránh. Không thiếu hồ sơ cho V1-1..3. Các finding review khác đã đối chiếu ở vòng 1, không đánh giá lại toàn task.

Memory: M-28 được đối chiếu bằng cách đọc test mới: đây là browser render React/CSS thật, không phải VM giả; lượt này không thêm import/harness sản phẩm. M-32: log có đúng ba test thực chạy, không dùng name-pattern dẫn tới 0 case. M-31: không SQL-seed thời gian; fixture mở qua API thật, không đóng ca nên không đánh giá lại lỗi lệch đồng hồ. M-3/11/12/13/29/30 và RF-1..5 không chạy lại vì các nhánh pending/race/permission/migration nằm ngoài phạm vi ba FAIL mở; giữ kết quả vòng 1, không tuyên bố đã kiểm mới.

## Bảng đối chiếu các AC được yêu cầu kiểm lại
| AC | Cách kiểm | Lệnh/bước đã chạy | Kết quả thật / evidence | Mong đợi theo plan (nguyên văn) | Quy định nguồn (nguyên văn + path:dòng) | Kết luận | Giới hạn |
|---|---|---|---|---|---|---|---|
| E2E-AC-5 | Tái hiện phần V1-1/2/3 tại modal trước đóng, cả hai viewport; ghép phần đã Đúng vòng 1. | CASHIER mở Đóng ca, đo bills/direct; OWNER không ca riêng mở Đóng cưỡng chế; đo kích thước, nhãn, contrast, xem ảnh; không submit mutation đóng. | `r2-blind-measurements.json`, `r2-force-measurements.json`, 8 ảnh `r2-blind-*`/`r2-force-*`; fields 48/88px, nút chính56px, label hợp lệ, border3.0025039:1. | “Given openingCash=100000, CASH PAID=95000, chi két=20000, chi ngoài=5000, When đóng thường và một fixture riêng đóng cưỡng chế với countedCash=175000, Then trước submit không hiện expected/difference; sau CLOSED thấy expenseAmount=20000, expectedCash=175000, difference=0 và trạng thái Khớp từ server (kiểm: B05; G4).” (`.devloopflow/approved/20261113-sprint09-ui.md:173`). Tiêu chí UI-7: “Mục tiêu chạm48px, nút chính56px, gap tối thiểu8px; ô nhập48px.” (`:96`). | `DESIGN.md:33`: “2. **Thiết kế cho ngón tay.** Mục tiêu chạm tối thiểu 48px, nút hành động chính 56px, khoảng cách giữa các nút chạm tối thiểu 8px. Không có thao tác nào chỉ làm được bằng hover.” `DESIGN.md:649`: “Viền ô nhập và nút phụ tối thiểu 3:1 so với nền (`--color-border-control`).” | Đúng phần kiểm lại; V1-1..3 đã PASS. | Các con số sau CLOSED đã Đúng trong `report-1.md`, `r1-B05-normal.txt`, `r1-B05-force.txt`; không chạy lại tình huống 175000 ở vòng2. |
| E2E-AC-6 | Tái hiện V1-1/2/3 và kiểm liền kề focus/layout ở app thật. | Hai viewport; getBoundingClientRect/computed styles; getByLabel/click label; Tab/Shift+Tab/Escape; ảnh modal/footers. | 6 trạng thái,92 control observations,30 field lookups; min target48/primary56; root scrollWidth=clientWidth1024/768; focus trap và restore đạt. `r2-measurement-assertions.log`, hai JSON và ảnh. | “Given UI 1024×768, request list/detail/mutation đang chờ, When đổi filter/ca/account/store/branch, reload hoặc mất mạng sau POST, Then không có row/ngăn/toast phiên cũ, không POST dưới phiên mới, không tự gửi lại mutation chưa xác nhận; có loading/rỗng/lỗi/tải lại; Tab/Escape/focus và nút chạm đạt DESIGN (kiểm: B06; G4).” (`.devloopflow/approved/20261113-sprint09-ui.md:174`). UI-6: “Label hiện rõ phía trên field, không dùng placeholder thay nhãn.” (`:95`). | `DESIGN.md:508`: “Cao 48px, viền `border-control`, bo `radius-control`, nhãn nằm **phía trên** ô, không dùng placeholder thay nhãn.” `DESIGN.md:652`: “Toàn bộ thao tác làm được bằng bàn phím trên máy tính. Thứ tự Tab theo thứ tự hiển thị. Hộp thoại giữ focus bên trong và trả focus về nút đã mở nó khi đóng.” | Đúng phần kiểm lại; V1-1..3 đã PASS. | Race, mạng, đổi phiên, uncertain, zoom200% và reduced-motion đã có bằng chứng vòng1, không chạy lại vòng2. |

Các AC **không chạy lại** (28 AC, giữ nguyên kết quả vòng 1): E2E-AC-1, E2E-AC-2, E2E-AC-3, E2E-AC-4; ST-1.AC-1, ST-1.AC-2, ST-1.AC-3, ST-1.AC-4; ST-2.AC-1, ST-2.AC-2, ST-2.AC-3, ST-2.AC-4; ST-3.AC-1, ST-3.AC-2; ST-4.AC-1, ST-4.AC-2, ST-4.AC-3; ST-5.AC-1, ST-5.AC-2, ST-5.AC-3; ST-6.AC-1; ST-7.AC-1, ST-7.AC-2, ST-7.AC-3, ST-7.AC-4; ST-8.AC-1, ST-8.AC-2, ST-8.AC-3.

## Đối chiếu spec
| Mục của spec (nguyên văn) | Loại | AC / bước | Kết quả thật | Kết luận |
|---|---|---|---|---|
| `.devloopflow/specs/20261113-sprint09-ui.md:22`: “G4. Hiện kết quả đóng ca phản ánh chi phí, giữ đếm mù; hỗ trợ trạng thái tải/rỗng/lỗi, tablet ngang, đổi phiên an toàn (S9-06; `DESIGN.md:314-316`).” | Mục tiêu | Phần UI của E2E-AC-5/6 | Target/nhãn/contrast đạt tại hai viewport; hộp thoại trước submit không hiện số kỳ vọng/chênh lệch. | Đúng phần kiểm lại; phần kết quả tiền/state giữ report1. |
| `.devloopflow/specs/20261113-sprint09-ui.md:45`: “Dùng React/TypeScript và thiết kế hiện có; kiểm UI 1024px ngang, bàn phím/focus, nhãn và thao tác cảm ứng (`DESIGN.md:47,57,359`, `rules/testing.md`).” | Ràng buộc | Build + số đo/focus/ảnh | UI build exit0;92 controls,30 lookup; Tab/Escape và restore đạt. | Đúng phần kiểm lại. |
| `.devloopflow/specs/20261113-sprint09-ui.md:31`: “Lộ tiền kỳ vọng/chênh lệch trước đếm mù; cho rằng ẩn nút thay thế kiểm quyền server; hiển thị hoàn tiền thành công khi chưa có xác nhận tương ứng.” | Phản mục tiêu | Hai modal trước submit | Cờ `blindCount:true` trong cả6 trạng thái, ảnh không có số kỳ vọng/chênh lệch trong modal. | Đúng phần quan sát trước submit; không kiểm lại quyền/hoàn tiền. |
| `.devloopflow/specs/20261113-sprint09-ui.md:26`: “Không thay đổi nghiệp vụ ghi chi phí, hủy hóa đơn, hoàn kho, thanh toán hay công thức đối soát đã chốt trong Task A; không sửa/xóa khoản chi (`.devloopflow/specs/20261112-sprint09-drawer-cancel-invoices.md:59-62`).” | Phi mục tiêu | Giới hạn lượt kiểm | Không sửa source hoặc gửi close/expense/cancel/payment; DB READ ONLY xác nhận26 hóa đơn/2chi phí. | Không có hành vi làm thừa được thực hiện trong lượt kiểm; không nghiệm thu lại API. |

G1/G2/G3/G5 và các ràng buộc khác không chạy lại theo yêu cầu; kết luận vòng 1 được giữ, không suy chứng cứ mới từ build/test3case.

## FAIL / bug
Không có FAIL mới trong phạm vi kiểm lại.

| FAIL cũ | Kết quả mới | Bằng chứng |
|---|---|---|
| V1-1 | đã PASS: mode48px, ±48×48px, số tờ72×48px, nhập nhanh/note48px; Force counted/note48px, reason88px, xác nhận56px, ở cả hai viewport. | `r2-blind-measurements.json`, `r2-force-measurements.json`, `r2-measurement-assertions.log`. |
| V1-2 | đã PASS: hai trường thường id/for `blind-close-counted`, `blind-close-note`; ba trường force id/for tương ứng; mỗi getByLabel đúng1, click label focus đúng; tên9ô số tờ tìm được. | Hai JSON trên và ảnh. |
| V1-3 | đã PASS: cả ba force fields dùng computed border `rgb(138,151,157)`/token `#8a979d`; trên trắng3.0025039007227687:1; chữ16.144885530704265:1, tại hai viewport. | `r2-force-measurements.json`, `r2-force-1024.png`, `r2-force-768.png`. |

Sổ `fails.md` giữ nguyên mô tả phát hiện vòng1 và người sửa; chỉ đổi trạng thái và thêm lịch sử/bằng chứng vòng2.

## Lệch tài liệu
Không phát hiện mâu thuẫn ảnh hưởng ba FAIL trong phạm vi này. Không tự chọn quy tắc mới hoặc sửa business rule.

## Đánh giá test
- Test mới render hai component với React thật, CSS dự án và Chromium qua puppeteer-core; stub toast tại biên, không gọi API. V1-1 kiểm geometry hai hướng; V1-2 kiểm label.control; V1-3 tính contrast. Cả ba có assertions và chạy không skip.
- Test này không tự chứng minh app đã đăng nhập hoặc dữ liệu server. Vì vậy verifier còn dùng Playwright MCP mở hai modal từ màn thật, đo6trạng thái, thao tác label/focus, chụp/xem8ảnh, lưu network và truy vấn DB READ ONLY. `r2-assert-measurements.cjs` kiểm lại artifact app thật, không thay bằng markup giả.
- Không lấy test count hoặc bản sửa đã có làm lý do PASS. Không đánh giá lại chất lượng toàn bộ test suite ở vòng2.

## Exploratory
| Case liên quan phần sửa | Thực chạy → kết quả | Evidence |
|---|---|---|
| V1-1 horizontal/portrait, bills/direct và Force | Mọi control ≥48; primary56; mode gap10px, ±/input gap8px từ x/right trong JSON; footer vẫn trong dialog ở hai hướng. | Hai JSON,8ảnh, assertions log. |
| V1-2 label click và accessible names | Label có đúng target, click chuyển focus; getByLabel mỗi field đúng1. | Hai JSON. |
| V1-3 computed contrast | Đo từng field,không đo màu token đơn thuần; border3.0025039:1 trên actual white. | Force JSON,2ảnh. |
| Dialog focus (lỗi cũ liên quan) | Tab/Shift+Tab vòng trong modal; Escape thoát và trả về opener; không submit. | Hai JSON. |
| Browser console/network | Mỗi context có6log401 từ auth/me và auth/csrf trước đăng nhập; sau login200 và GET màn ca200. Không ghi nhận JS exception trong console lưu. CASHIER có đúng1POST tạo ca mới201; không có close/force-close POST; OWNER chỉ mở modal. | `r2-cashier-console.txt`, `r2-owner-console.txt`, `r2-cashier-network.txt`, `r2-owner-network.txt`; API app log. |

Đã xem đủ8ảnh ở cả hai viewport; không dùng screenshot làm bằng chứng duy nhất cho tên truy cập hoặc contrast. Instrumentation đầu chờ tất cả animation bị giữ bởi `pulseDot` lặp vô hạn; dừng chờ và đổi helper chỉ đợi animation hữu hạn. Đây là sửa script đo trong evidence, không sửa ứng dụng và không tạo một lượt verify-ac mới.

## Đề xuất
- Không còn FAIL mở của vòng1 sau lượt kiểm lại này. Agent chính tổng hợp kết quả mới với 28 AC Đúng vòng1, cập nhật task/plan và thực hiện graph/semantic sync theo quyền của agent chính.
- Nếu cần chứng minh hồi quy toàn bộ sau sửa, phải có yêu cầu kiểm lại toàn bộ; vòng2 không cung cấp kết quả hồi quy toàn bộ.
- Giữ ca fixture mới OPEN theo yêu cầu không cleanup xóa; ca này đang chiếm ca thu ngân của chi nhánh sandbox. API/UI riêng đã dừng; PostgreSQL và dữ liệu giữ nguyên.
- Hash bằng chứng mới: `evidence/r2-SHA256SUMS`; đã kiểm 29 artifact, 0 sai hash; kết quả từng file: `evidence/r2-hash-check.json`. Không đưa raw evidence lên Git.
