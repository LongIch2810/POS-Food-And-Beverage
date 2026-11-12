# Kiểm AC 20261109-sprint08-payment — vòng 15

## Kết luận

**PASS trong phạm vi chạy lại V14-1 và V14-2.** Ba tình huống còn thiếu đã có browser thật, ảnh trước/sau, request/response và PostgreSQL read-only trước/sau. Không sửa source/test/config. Không nghiệm thu lại toàn bộ Sprint 08.

- Ngày: 11/11/2026; thực chạy 11:55–12:03 UTC (18:55–19:03 UTC+7).
- Plan: `.devloopflow/approved/20261109-sprint08-payment.md:46` (ST-8.AC-3(b),(d)), `:164` (E2E-AC-8).
- Spec: `.devloopflow/specs/20261109-sprint08-payment.md:26,37`, trạng thái approved; `specs/invoices.md:39`; `specs/sales.md:22-25`.
- Sổ `fails.md`: V14-1/V14-2 chuyển `đã PASS`, giữ nguyên lịch sử vòng 14. Không tạo FAIL mới hoặc thay trạng thái các mục khác.

## Tài liệu nguồn đã đối chiếu

`AGENTS.md`; `.devloopflow/devloopflow.md`; `.devloopflow/MEMORY.md`; plan/spec/task active của `20261109-sprint08-payment`; `specs/invoices.md`, `specs/sales.md`; `docs/PRODUCT_OVERVIEW.md`; `DESIGN.md`; `report-14.md`, `fails.md`; `.devloopflow/errors/INDEX.md` và các hồ sơ stale selection/notice/test nêu dưới. Hướng dẫn verifier: devloopflow 0.3.6 `verify-ac/role.md`, `references/ac-verifier.md`, templates `verify-report.md`, `fails.md`, `conventions/references/nen-tang.md`.

Đối chiếu phần liên quan trực tiếp đến ba tình huống; không suy tiến độ cũ trong plan/task thành kết quả mới. Chỉ đọc source theo path đã biết để xác nhận đường `refreshOrders`, `openTable`, `perform` và hủy qua prompt; không dùng graph cũ làm bằng chứng.

## Môi trường

**Q** trong báo cáo = `qa-evidence/20261111-185503-48ed476-s8-verify-ac-r15/`.

Nhãn: **local do agent chạy**, không phải CI/runner độc lập. Artifact gốc chỉ có local, không thể đối chiếu từ remote. HEAD `48ed476528a2db4f46fa379c64476c95b54d4caf`, working tree dirty; `Q/git-head.txt`, `git-status-before.txt`. SHA256 trước/sau của `LivePosScreen.tsx`, `live-payment.test.mjs`, `sales.service.ts`, `salesService.ts` giống nhau (`Q/source-hashes-before.json`, `source-hashes-after.json`). Đây là lượt browser mới trên source hiện tại, không dùng ảnh lịch sử để bổ sung nhánh còn thiếu.

- Windows, Node v22.22.2; PostgreSQL 17 container sandbox `pos_s8_r12_pg`, bind `127.0.0.1:15432`, ban đầu exited; xác minh metadata rồi start.
- Tạo DB mới `pos_s8_qa_r15v_mwc2bbis`, chạy migration riêng; không đổi/xóa DB cũ hoặc volume.
- API `http://127.0.0.1:13191`, UI `http://localhost:15325/`, viewport 1180×820.
- Lệnh dựng app: `node .devloopflow/verify/20261109-sprint08-payment/evidence/scripts/r15v-up.cjs`; helper mới dựa trên r14v, chạy `npm run migration:run`, `npm start` API và `npm run dev -- --host 127.0.0.1 --port 15325 --strictPort` UI. Command/PID và stdout/stderr nằm ở `Q/r15v-*-app.command.json`, `Q/r15v-migration.*`, `Q/r15v-api-app.*`, `Q/r15v-ui-app.*`, `Q/r15v-environment.json`.
- Fixture sandbox tái dùng tên người dùng `qa14v_*`; dữ liệu ID/DB mới hoàn toàn. Credentials lấy trong process từ container env, không in hoặc ghi DB URL/secret/token/cookie. Browser collector bỏ nội dung auth, không lưu headers.
- Không ngrok/SePay/production/tiền hoặc dữ liệu thật. Setup có tạo một QR pending sandbox bằng API cho fixture r14v, không gọi provider; QR đó không được dùng để kết luận các AC ngoài phạm vi.

Matrix tiêu chí → tình huống → artifact được tạo trước chạy trong `Q/run.md`. Các thao tác browser chạy bằng Playwright MCP `browser_run_code_unsafe`; code thao tác nguyên văn nằm trong các `*.tool.json`, ảnh lưu ngay khi thao tác, snapshot accessibility sau trạng thái quan trọng nằm trong `*.snapshot.json`.

## Kết quả test

| Lệnh / nơi chạy | Kết quả thật | Artifact Q |
|---|---|---|
| POS_UI: `node --experimental-strip-types --test --test-name-pattern=PAID-DONE\|B-39\|B-40 test/live-payment.test.mjs` | exit 0; 20 tests, 20 pass, 0 fail/skip | `ui-focused.stdout.txt`, `ui-focused.stderr.txt` |
| POS_UI: `npm test` | exit 0; 85 tests, 85 pass, 0 fail/skip | `ui-test.stdout.txt`, `ui-test.stderr.txt` |
| POS_UI: `npm run typecheck` | exit 0 | `ui-typecheck.stdout.txt`, `ui-typecheck.stderr.txt` |
| POS_UI: `npm run build` | exit 0 | `ui-build.stdout.txt`, `ui-build.stderr.txt` |
| root: `node .devloopflow/verify/20261109-sprint08-payment/evidence/scripts/r15v-verify-evidence.cjs` | exit 0; assertions PASS; 71 file đã đọc/parse/hash, 36 browser API records, 4 so sánh DB sau đóng giữ nguyên | `evidence-audit.stdout.txt`, `evidence-audit.stderr.txt`, `evidence-audit-command.json`, `audit.json` |

Mỗi test command có start/end/exit trong `Q/process-results.json`, chạy 12:00:26–12:00:40 UTC. API migration tự build và thành công để dựng DB/app mới; không chạy lại API integration suite vì vòng này chỉ bổ sung ba nhánh UI/browser với API/DB thật. Không dùng số pass cũ làm kết quả vòng 15.

## Coverage

Không chạy: manifest/CI không định nghĩa script hoặc ngưỡng coverage (`.devloopflow/devloopflow.md:2`). Không dùng số test thay coverage.

## Đã đối chiếu errors

- `20261111-paid-order-stays-selected-and-editable.md`: R1 tái hiện đúng đường refresh nhận terminal; R2 đúng stale-table terminal; R3 đúng đường hủy rồi khách mới. Tất cả khớp kỳ vọng sau sửa.
- `20261111-stale-notice-and-missing-closed-order-asserts.md`: R3 thấy “Đã hủy đơn.” ngay sau hủy; notice biến mất sau tạo B/thêm món B. Không lặp lại nhánh DINE_IN PAID/B-40 ngoài phạm vi.
- `20261111-pay-then-next-order-path-untested.md`: đọc để phân biệt nhánh thanh toán đã có với nhánh hủy còn thiếu. Vòng này không lấy pay→B thay cancel→B; test PAID-DONE-9/9b chạy lại trong focused nhưng browser payment không chạy lại.
- Các hồ sơ MANAGER/provider khác trong INDEX không được nghiệm thu lại. Không có finding được sửa trong vòng này cần ghi errors mới; kiểm đầy đủ errors toàn task/V12-1 ngoài phạm vi.
- MEMORY M-7: môi trường được phép theo phân công của agent chính và khởi chạy thành công; không lặp lệnh bị policy chặn. M-3 (poll dialog), M-1 (branch scope), M-2 (provider validation), M-4 (đổi mã lỗi) không được thay đổi và không chạy exploratory riêng. M-5: trạng thái tài liệu/plan/task cần agent chính đồng bộ sau báo cáo này; verifier không sửa các file đó.

## Bảng đối chiếu trong phạm vi chạy lại

| AC / FAIL | Bước đã chạy | Kết quả thật và artifact Q | Mong đợi theo plan | Quy định nguồn nguyên văn | Kết luận |
|---|---|---|---|---|---|
| V14-1, ST-8.AC-3(b), CANCELLED refresh | R1: chọn A OPEN HDB833IQ4T; API phiên khác hủy A; giữ UI cũ; bấm Tải lại đơn; mở tab thực đơn | Browser GET A 200 trả `CANCELLED` (request ID `95c6494e-240d-4a93-870e-436c4216ec9c`); panel “Chưa chọn đơn”; QA Trà disabled, có hướng dẫn chọn bàn/mở đơn. `r15-R1-01-selected-open.png`, `02-stale-before-refresh.png`, `03b-after-refresh-menu.png`, các tool JSON và `r15-R1-03b.snapshot.json`; `browser-network.json`; DB `r15v-audit-r1-before-cancel.json`, `r1-after-external-cancel.json`, `r1-after-refresh.json` | Plan:46 “làm mới đơn (`refreshOrders`) trả `PAID`/`CANCELLED` thì bỏ chọn” | Spec task:26 “Nếu danh sách ... còn lưu một đơn cũ mà server báo đã không còn `OPEN`, UI không chọn đơn đó”; PRODUCT_OVERVIEW mục 8 “Nội dung hóa đơn `PAID` hoặc `CANCELLED` ... không sửa trực tiếp.” | Đúng |
| V14-1, ST-8.AC-3(d), CANCELLED stale-table | R2: sơ đồ bàn giữ HDIT9411U3 OPEN tại Bàn 1; API khác hủy; ảnh sau API vẫn hiển thị đơn cũ; chạm chính ô đó | GET A 200 CANCELLED; POST invoices 201 với `orderType=DINE_IN`, đúng tableId Bàn 1, request ID `5a25b36c-7d78-487f-948f-417bce4edba7`; tạo HDMIISQZN1 OPEN rỗng. A vẫn CANCELLED, 1 dòng/qty1/25.000đ và updated_at không đổi sau chạm. `r15-R2-01-table-open-before-cancel.png`, `02-stale-table.png`, `03-new-table-order.png`, tool JSON, `r15-R2-03.snapshot.json`; DB `r15v-audit-r2-before-cancel.json`, `r2-after-external-cancel.json`, `r2-after-table-click.json` | Plan:46 “đơn lưu trong danh sách cũ đã `PAID`/`CANCELLED` ... tạo đơn tại bàn mới” | Spec task:26 “coi bàn là trống theo quy tắc chạm bàn trống”; specs/sales.md:23 “Chọn bàn trống → tạo đơn DINE_IN” | Đúng |
| V14-2, E2E-AC-8, hủy → khách mới | R3: chọn A HD7ZEUB3KI có 1 món; UI Hủy đơn, nhập lý do; lưu panel/menu/DB; tạo mang đi B mới; lưu DB rỗng; mở món và Thêm vào đơn; lưu DB cuối | POST A/cancel 200 CANCELLED (`1b1cdacf-6a3e-48c4-837b-62e5fd96f2cf`); bỏ chọn/menu disabled/notice hủy. POST invoices 201 (`d7ad29a2-5844-45c3-a91d-3a92f15f4625`) tạo HDGXF6H7HL id `dfdb9b9d-3f43-4e1f-8f07-d77d0cfb8c28`. Chỉ một POST items trong browser trace, nhắm B, 201 (`bb0469be-b393-4f37-b8cb-f58907c09fd1`). B OPEN từ 0→1 món/25.000đ; A CANCELLED giữ 1 dòng/qty1/25.000đ/updated_at sau hủy. `r15-R3-01-A-open.png`, `02-A-cancelled-menu-locked.png`, `03-B-created-empty.png`, `04-before-add.png`, `05-added-to-B.png`; tool/snapshot JSON; DB `r15v-audit-r3-before-ui-cancel.json`, `r3-after-ui-cancel.json`, `r3-after-create-b.json`, `r3-after-add-b.json`; `audit.json` | Plan:164 “thu ngân thanh toán hoặc hủy đơn A → panel bỏ chọn A ... tạo đơn B cho khách mới → món chỉ thêm vào B, A không đổi” | Spec task:26 “Sau khi thanh toán hoặc hủy thành công đơn bị bỏ chọn; nhân viên tạo/mở đơn mới cho khách mới”; specs/sales.md:25 “hủy đơn OPEN lưu lý do, người hủy và thời điểm. Hai hành vi không thay đổi item snapshot/tổng.” | Đúng |

DB snapshots chạy `BEGIN READ ONLY ... ROLLBACK`; SQL nguyên văn trong `evidence/scripts/r15v-common.cjs::audit`. So sánh toàn bộ row audit của từng A, gồm id/status/item_count/qty/total/updated_at/cancel metadata/ca/loại đơn; không chỉ đọc ảnh để suy dữ liệu. `Q/r15v-act.jsonl` lưu HTTP ngoại phiên của R1/R2 với method/path/status/body đã che; `Q/browser-network.json` lưu browser request/response của cả ba ca.

AC **không chạy lại/không đổi kết luận**: các vế PAID và phần khác của ST-8.AC-3(a),(c),(e),(f),(g); E2E-AC-8 nhánh thanh toán/bàn PAID; AC-M1, B-38/B-39 ngoài đối chứng notice ở R3; R2-1.AC-1..3; ST-1.AC-1..2, ST-2.AC-1, ST-3.AC-1, ST-4.AC-1, ST-5.AC-1..2, ST-6.AC-1, ST-7.AC-1, ST-8.AC-1..2; E2E-AC-1..7; RF-1..5; FAIL lịch sử V1-4/V11-1/V12-1. Test UI chạy lại rộng hơn nhưng không được dùng để tuyên bố browser/provider QA toàn sprint.

## Đối chiếu spec cấp tính năng

| Mục spec nguyên văn | Loại | Bước / artifact | Kết luận |
|---|---|---|---|
| “Sau khi thanh toán hoặc hủy thành công đơn bị bỏ chọn” (task:26) | Mục tiêu, nhánh hủy | R3 ảnh/snapshot/network; A CANCELLED | Đúng trong nhánh hủy được giao |
| “UI không chọn đơn đó, làm mới danh sách và coi bàn là trống” (task:26) | Mục tiêu | R1/R2 terminal CANCELLED + bảng trên | Đúng |
| “đơn mới cho khách mới bị gộp vào đơn đã thanh toán” và “sau khi thanh toán/hủy, panel đơn vẫn mở đơn cũ” (task:37) | Phản mục tiêu | R3 B khác id A, POST items chỉ B, A DB giữ nguyên | Không gặp trong nhánh hủy đã chạy |
| “không bật giao dịch ngân hàng Live” (task Phi mục tiêu) | Phi mục tiêu/ràng buộc | Sandbox mới/local, không provider | Đúng trong phạm vi chạy |

Không kết luận các mục tiêu khác của spec trong vòng chạy lại này.

## FAIL / bug

Không phát hiện FAIL sản phẩm mới. V14-1 và V14-2 đủ chứng cứ, chuyển `đã PASS` trong sổ; không xóa lịch sử thiếu evidence vòng 14. Không đề xuất sửa production/test.

## Lệch tài liệu

Không phát hiện mâu thuẫn nghiệp vụ trong ba tình huống. Các câu tiến độ “browser QA ... CHƯA chạy” trong delta plan là thông tin tiến độ cũ, agent chính cần đồng bộ theo report-14/15; không sửa spec/plan trong vai trò verifier.

## Đánh giá test

20 focused và 85 full UI không fail/skip. Component tests có assertion trạng thái/service calls nhưng không thay cho browser + DB. Bộ focused hiện không có tên test riêng cho cả hai nhánh CANCELLED R1/R2; vòng này chứng minh trực tiếp bằng browser, không tự thêm test khi chỉ bổ sung evidence. Không đánh giá lại API suite/race/provider.

## Exploratory và chất lượng bằng chứng

- R3 đối chứng B-39: notice “Đã hủy đơn.” hiện sau hủy, biến mất khi chọn B mới; ảnh/body và snapshot khớp.
- R1/R2 giữ UI/danh sách stale thật trong khi mutation đi qua API khác; không mock response hoặc sửa state app.
- Hai lỗi thao tác QA đã được xử lý: đăng nhập tên `qa15v_*` 401 vì fixture tái dùng `qa14v_*`; chọn tab Thực đơn bằng locator không phân biệt sidebar gây strict-mode error. Giữ file tool lỗi `r15-R1-03-after-refresh.tool.json`; dùng locator tab thứ hai để chụp trạng thái hợp lệ ở `03b`, không dựng lại trạng thái trước.
- Khi xử lý prompt R3, MCP trả block Modal thay vì Result dù ảnh đã lưu; ngay sau đó lấy accessibility snapshot thật `r15-R3-02.snapshot.json` chứng minh notice/panel/menu disabled. Script audit ban đầu giả định mọi tool có Result nên parser lỗi; đã đổi audit đọc snapshot gốc của đúng bước, chạy lại exit 0. Không dựng JSON trạng thái bị thiếu từ trí nhớ.
- `Q/audit.json` đọc/parse JSON và PNG headers 1180×820, lưu SHA256/bytes; đã mở trực tiếp ảnh R1 sau refresh, R2 stale/sau tạo đơn, R3 sau hủy/sau thêm B. Đã đọc network body và các DB snapshot được dẫn. `source-hashes-before/after` khớp.
- Console có 401 của auth chưa đăng nhập/refresh và lần tên fixture sai; không gọi console sạch. Console gốc đã che lưu `Q/browser-console.tool.json`; auth content/headers không được lưu.

## Đề xuất và cleanup

Hai mục được giao đã PASS; agent chính cập nhật task/plan và chạy semantic Graphify update cho Markdown mới theo AGENTS.md. Quyết định đóng toàn task phải dựa kết quả mới nhất của mọi AC, không suy từ PASS vòng chạy lại này.

Đã ghi STOP vào `Q/r15v-STOP`; helper dừng đúng API/UI process tree do lượt này start, `Q/r15v-STOPPED` ghi `2026-11-11T12:02:55.139Z`. `docker stop pos_s8_r12_pg` đưa container về trạng thái ban đầu exited. `Q/cleanup.json` lúc `12:02:57Z` xác nhận container exited, không listener 13191/15325/15432. Không xóa database/volume/artifact và không dừng process khác. Không commit/push raw artifact.
