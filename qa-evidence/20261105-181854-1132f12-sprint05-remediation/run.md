# Sprint 05 — đối soát sau review, local agent run

**Trạng thái:** Kiểm thử tự động local; chưa nghiệm thu sprint. **Commit nền:** `1132f12a447058e6ace8cb8fb87dc6877763ee5d`, working tree dirty (mã Sprint 05 chưa commit và các thay đổi khác đã có trước lượt này). **Môi trường:** Windows PowerShell, Node 22, PostgreSQL 17 Docker healthy ở host local; đã xác nhận `DATABASE_URL` có host `localhost`/`127.0.0.1` mà không in giá trị. Test API tự tạo và xóa DB thử riêng. Không chạy production.

| Lượt | Lệnh, thư mục | Bắt đầu → kết thúc (+07) | Exit | Output gốc |
| --- | --- | --- | --- | --- |
| Backend full | `npm test`, `POS_API/` | 18:19:05 → 18:23:13 | 0; 66/66 | [backend-test.log.gz](backend-test.log.gz) (nén nguyên văn output gốc), [meta](backend-test-meta.txt) |
| UI full | `npm test`, `POS_UI/` | 18:19:05 → 18:19:13 | 0; 37/37 | [frontend-test.log](frontend-test.log), [meta](frontend-test-meta.txt) |
| Backend build sau test mới | `npm run build`, `POS_API/` | 18:23:27 → 18:23:31 | 0 | [backend-build-final.log](backend-build-final.log), [meta](backend-build-final-meta.txt) |
| UI build | `npm run build`, `POS_UI/` | 18:23:27 → 18:23:48 | 0 | [frontend-build-final.log](frontend-build-final.log), [meta](frontend-build-final-meta.txt) |
| SHIFT-08 lần đầu | `node --env-file-if-exists=.env --test dist/shifts/tests/shifts.integration.test.js`, `POS_API/` | 18:23:44 → 18:23:54 | 1; fixture tạo trùng branch A2 | [backend-shifts-final.log](backend-shifts-final.log), [meta](backend-shifts-final-meta.txt) |
| Backend rebuild sau sửa fixture | `npm run build`, `POS_API/` | 18:24:32 → 18:24:35 | 0 | [backend-rebuild.log](backend-rebuild.log), [meta](backend-rebuild-meta.txt) |
| SHIFT-08 chạy lại | `node --env-file-if-exists=.env --test dist/shifts/tests/shifts.integration.test.js`, `POS_API/` | 18:24:41 → 18:24:50 | 0; 10/10 | [backend-shifts-retest.log](backend-shifts-retest.log), [meta](backend-shifts-retest-meta.txt) |

Lưu ý: `backend-test.log` ~24 MB được giữ local và bỏ qua bởi `.gitignore` trong run; bản nén nguyên văn `backend-test.log.gz` ~0,97 MB dùng để chia sẻ. Muốn chứng cứ CI cần chạy trên commit đã chốt và giữ URL/artifact của runner. Full suite chạy trước khi thêm assertion SHIFT-08; lượt SHIFT-08 cuối kiểm tra code/test sau cùng.

Sau khi browser phát hiện CASHIER không có đường mở ca, đã thêm nút mở ca trên `ShiftsScreen` và chạy lại `POS_UI npm test` 37/37 (18:33:56–18:33:59, exit 0; [log](frontend-test-after-ui-fix.log), [meta](frontend-test-after-ui-fix-meta.txt)) cùng `POS_UI npm run build` exit 0 (18:33:56–18:34:03; [log](frontend-build-after-ui-fix.log), [meta](frontend-build-after-ui-fix-meta.txt)).

Browser chạy trên Chrome headless, API/Vite local và database thử **riêng** `pos_sprint05_browser_20261105` (không dùng DB local đang có dữ liệu). Migration của DB thử: [log](browser-db-migration.log), [meta](browser-db-migration-meta.txt). Script test [browser-shift.cjs](browser-shift.cjs) chạy lại cuối lúc 18:34:54–18:35:01, exit 0 ([log](browser-shift-complete.log), [meta](browser-shift-complete-meta.txt)). Hai lượt browser trước thất bại do script chờ nhầm màn mặc định, được lưu ở `browser-shift.log` và `browser-shift-final.log`; sau khi thêm nút mở ca, lượt `browser-shift-after-ui-fix.log` đạt, lượt cuối bổ sung bước đóng kết quả cũng đạt. Không dùng các lượt thất bại làm bằng chứng đạt.

Chuỗi chứng cứ browser cuối: [đăng nhập](browser-login.png) → [trang Ca làm sau đăng nhập](browser-after-login.png) → [gate tiền đầu ca chỉ đọc](browser-gate-before.png) → [ca OPEN](browser-shift-open.png) → [modal đếm mù trước nhập](browser-blind-before.png) → [kết quả đối soát](browser-reconciliation.png) → [đóng modal](browser-after-finish.png). [Network đã che](browser-network.json) lưu method/path/status, gồm `POST /work-shifts` 201 và `POST /work-shifts/:id/close` 200; [DB trước](browser-db-before.json) và [DB sau](browser-db-after.json) cho thấy không có ca trước, sau đó một ca `CLOSED`, `counted_cash=expected_cash=100000`, `MATCHED`. Đây vẫn là **local do agent chính chạy**; QA độc lập đang chạy lại ở thư mục evidence riêng.

| Tiêu chí | Tình huống | Artifact | Trạng thái hiện tại |
| --- | --- | --- | --- |
| BR-14 và BR-87, mã lỗi đã chốt | SHIFT-01, SHIFT-03, BR-14 concurrency | `backend-shifts-retest.log`; `specs/shifts.md`; `sprints/sprint-05/SPRINT.md` | PASS local test, chờ QA độc lập |
| BR-18 giờ tan ca sau giờ vào | SHIFT-01, assertion `endedAt > startedAt` | `backend-shifts-retest.log` | PASS local test, chờ QA độc lập |
| Phân quyền branch/user/store | SHIFT-08 với MANAGER/CASHIER, ACCOUNT_DISABLED, STORE_SUSPENDED | `backend-shifts-retest.log` | PASS local test, chờ QA độc lập |
| UI ca và đối soát trên browser thật | Browser local Chrome: mở ca → đóng đếm mù → xem kết quả → hoàn tất; DB trước/sau | ảnh, network, DB và log nêu trên | PASS local run; chờ QA độc lập |
| Full regression/build | 66 backend, 37 UI, build hai package | log/meta trên | PASS local run; chưa có CI cho working tree cuối |

## Lượt kiểm sau B09 và bổ sung vế nghiệm thu

Working tree vẫn dirty trên HEAD nền `1132f12a447058e6ace8cb8fb87dc6877763ee5d`. Chỉ dùng API/UI local và DB thử riêng `pos_sprint05_browser_20261105`; script kiểm hostname local trước khi kết nối. Fixture `pos.sell` được thêm **chỉ trong DB thử** để kiểm `OpenShiftGate` trên màn POS; khu vực bán hàng phía sau gate là demo/mock, không chứng minh backend bán hàng.

| Tình huống | Lệnh và thời gian (+07) | Exit | Output/artifact gốc |
| --- | --- | --- | --- |
| Backend assertion bổ sung SHIFT-02/04/08 | `POS_API: npm run build` rồi `node --env-file-if-exists=.env --test dist/shifts/tests/shifts.integration.test.js`, 21:38:44–21:38:55 | 0; 11/11 | [test](backend-shifts-extra-final.log), [build](backend-build-extra.log), [meta](backend-shifts-extra-final-meta.txt) |
| UI sau fix toast | `POS_UI: npm test`, 21:38:05–21:38:07 | 0; 37/37 | [test](frontend-test-toast.log), [meta](frontend-test-toast-meta.txt) |
| UI build sau fix | `POS_UI: npm run build`, 21:39:35–21:39:42 | 0 | [build](frontend-build-toast.log), [meta](frontend-build-toast-meta.txt) |
| Browser gate, đổi tab, lỗi mạng, đổi phiên | `node --env-file=POS_API/.env qa-evidence/20261105-181854-1132f12-sprint05-remediation/browser-shift.cjs`, 21:45:48–21:45:58 | 0 | [stdout/stderr](browser-tabs-final.log), [meta](browser-tabs-final-meta.txt), [script](browser-shift.cjs) |

Browser cuối: [POS bị gate chặn trước ca](browser-pos-gate-before.png) → [POS sau mở ca](browser-pos-after-open.png) → [ca OPEN](browser-shift-open.png) → [GET current trước khi đếm](browser-before-count-response.json) có `expectedCash=null` → [modal đếm mù](browser-blind-before.png) → [đối soát](browser-reconciliation.png) và [DB sau](browser-db-after.json). Chuyển màn [Thực đơn](browser-menu-tab.png) → [Ca làm](browser-shifts-tab-return.png), sau đó lưu [loading](browser-loading.png), [lỗi mạng](browser-network-error.png) và [network method/path/status](browser-network.json) có `GET /work-shifts/current` `NETWORK_FAILED`. Sau logout/login store khác, [màn cửa hàng B](browser-other-store.png) trống dữ liệu A và không còn toast A; script assert DOM thông báo rỗng. Đối chiếu cả [DB trước](browser-db-before.json). Đây là bằng chứng **local do agent chính chạy**; QA phải tự chạy trên phiên bản cuối để kết luận Sprint.

Lượt browser thử hai cửa sổ `browser-cross-tab.log` và `browser-cross-tab-retry.log` không hoàn tất (cửa sổ phụ gây race phiên khi refresh). Không dùng chúng để chứng minh nghiệm thu; test cuối kiểm chuyển tab UI trong cùng cửa sổ như tiêu chí màn hình. Các lượt `backend-shifts-extra.log`, `backend-shifts-extra-retest.log` trước khi sửa fixture/assertion cũng không dùng làm bằng chứng PASS.
