# Sprint 05 — đối soát sau review, local agent run

**Trạng thái:** Kiểm thử tự động local; chưa nghiệm thu sprint. **Commit nền:** `1132f12a447058e6ace8cb8fb87dc6877763ee5d`, working tree dirty (mã Sprint 05 chưa commit và các thay đổi khác đã có trước lượt này). **Môi trường:** Windows PowerShell, Node 22, PostgreSQL 17 Docker healthy ở host local; đã xác nhận `DATABASE_URL` có host `localhost`/`127.0.0.1` mà không in giá trị. Test API tự tạo và xóa DB thử riêng. Không chạy production.

| Lượt | Lệnh, thư mục | Bắt đầu → kết thúc (+07) | Exit | Output gốc |
| --- | --- | --- | --- | --- |
| Backend full | `npm test`, `POS_API/` | 18:19:05 → 18:23:13 | 0; 66/66 | [backend-test.log.gz](evidence/backend-test.log.gz) (nén nguyên văn output gốc), [meta](evidence/backend-test-meta.txt) |
| UI full | `npm test`, `POS_UI/` | 18:19:05 → 18:19:13 | 0; 37/37 | [frontend-test.log](evidence/frontend-test.log), [meta](evidence/frontend-test-meta.txt) |
| Backend build sau test mới | `npm run build`, `POS_API/` | 18:23:27 → 18:23:31 | 0 | [backend-build-final.log](evidence/backend-build-final.log), [meta](evidence/backend-build-final-meta.txt) |
| UI build | `npm run build`, `POS_UI/` | 18:23:27 → 18:23:48 | 0 | [frontend-build-final.log](evidence/frontend-build-final.log), [meta](evidence/frontend-build-final-meta.txt) |
| SHIFT-08 lần đầu | `node --env-file-if-exists=.env --test dist/shifts/tests/shifts.integration.test.js`, `POS_API/` | 18:23:44 → 18:23:54 | 1; fixture tạo trùng branch A2 | [backend-shifts-final.log](evidence/backend-shifts-final.log), [meta](evidence/backend-shifts-final-meta.txt) |
| Backend rebuild sau sửa fixture | `npm run build`, `POS_API/` | 18:24:32 → 18:24:35 | 0 | [backend-rebuild.log](evidence/backend-rebuild.log), [meta](evidence/backend-rebuild-meta.txt) |
| SHIFT-08 chạy lại | `node --env-file-if-exists=.env --test dist/shifts/tests/shifts.integration.test.js`, `POS_API/` | 18:24:41 → 18:24:50 | 0; 10/10 | [backend-shifts-retest.log](evidence/backend-shifts-retest.log), [meta](evidence/backend-shifts-retest-meta.txt) |

Lưu ý: `backend-test.log` ~24 MB được giữ local và bỏ qua bởi `.gitignore` trong run; bản nén nguyên văn `backend-test.log.gz` ~0,97 MB dùng để chia sẻ. Muốn chứng cứ CI cần chạy trên commit đã chốt và giữ URL/artifact của runner. Full suite chạy trước khi thêm assertion SHIFT-08; lượt SHIFT-08 cuối kiểm tra code/test sau cùng.

Sau khi browser phát hiện CASHIER không có đường mở ca, đã thêm nút mở ca trên `ShiftsScreen` và chạy lại `POS_UI npm test` 37/37 (18:33:56–18:33:59, exit 0; [log](evidence/frontend-test-after-ui-fix.log), [meta](evidence/frontend-test-after-ui-fix-meta.txt)) cùng `POS_UI npm run build` exit 0 (18:33:56–18:34:03; [log](evidence/frontend-build-after-ui-fix.log), [meta](evidence/frontend-build-after-ui-fix-meta.txt)).

Browser chạy trên Chrome headless, API/Vite local và database thử **riêng** `pos_sprint05_browser_20261105` (không dùng DB local đang có dữ liệu). Migration của DB thử: [log](evidence/browser-db-migration.log), [meta](evidence/browser-db-migration-meta.txt). Script test [browser-shift.cjs](evidence/browser-shift.cjs) chạy lại cuối lúc 18:34:54–18:35:01, exit 0 ([log](evidence/browser-shift-complete.log), [meta](evidence/browser-shift-complete-meta.txt)). Hai lượt browser trước thất bại do script chờ nhầm màn mặc định, được lưu ở `browser-shift.log` và `browser-shift-final.log`; sau khi thêm nút mở ca, lượt `browser-shift-after-ui-fix.log` đạt, lượt cuối bổ sung bước đóng kết quả cũng đạt. Không dùng các lượt thất bại làm bằng chứng đạt.

Chuỗi chứng cứ browser cuối: [đăng nhập](evidence/browser-login.png) → [trang Ca làm sau đăng nhập](evidence/browser-after-login.png) → [gate tiền đầu ca chỉ đọc](evidence/browser-gate-before.png) → [ca OPEN](evidence/browser-shift-open.png) → [modal đếm mù trước nhập](evidence/browser-blind-before.png) → [kết quả đối soát](evidence/browser-reconciliation.png) → [đóng modal](evidence/browser-after-finish.png). [Network đã che](evidence/browser-network.json) lưu method/path/status, gồm `POST /work-shifts` 201 và `POST /work-shifts/:id/close` 200; [DB trước](evidence/browser-db-before.json) và [DB sau](evidence/browser-db-after.json) cho thấy không có ca trước, sau đó một ca `CLOSED`, `counted_cash=expected_cash=100000`, `MATCHED`. Đây vẫn là **local do agent chính chạy**; QA độc lập đang chạy lại ở thư mục evidence riêng.

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
| Backend assertion bổ sung SHIFT-02/04/08 | `POS_API: npm run build` rồi `node --env-file-if-exists=.env --test dist/shifts/tests/shifts.integration.test.js`, 21:38:44–21:38:55 | 0; 11/11 | [test](evidence/backend-shifts-extra-final.log), [build](evidence/backend-build-extra.log), [meta](evidence/backend-shifts-extra-final-meta.txt) |
| UI sau fix toast | `POS_UI: npm test`, 21:38:05–21:38:07 | 0; 37/37 | [test](evidence/frontend-test-toast.log), [meta](evidence/frontend-test-toast-meta.txt) |
| UI build sau fix | `POS_UI: npm run build`, 21:39:35–21:39:42 | 0 | [build](evidence/frontend-build-toast.log), [meta](evidence/frontend-build-toast-meta.txt) |
| Browser gate, đổi tab, lỗi mạng, đổi phiên | `node --env-file=POS_API/.env qa-evidence/20261105-181854-1132f12-sprint05-remediation/browser-shift.cjs`, 21:45:48–21:45:58 | 0 | [stdout/stderr](evidence/browser-tabs-final.log), [meta](evidence/browser-tabs-final-meta.txt), [script](evidence/browser-shift.cjs) |

Browser cuối: [POS bị gate chặn trước ca](evidence/browser-pos-gate-before.png) → [POS sau mở ca](evidence/browser-pos-after-open.png) → [ca OPEN](evidence/browser-shift-open.png) → [GET current trước khi đếm](evidence/browser-before-count-response.json) có `expectedCash=null` → [modal đếm mù](evidence/browser-blind-before.png) → [đối soát](evidence/browser-reconciliation.png) và [DB sau](evidence/browser-db-after.json). Chuyển màn [Thực đơn](evidence/browser-menu-tab.png) → [Ca làm](evidence/browser-shifts-tab-return.png), sau đó lưu [loading](evidence/browser-loading.png), [lỗi mạng](evidence/browser-network-error.png) và [network method/path/status](evidence/browser-network.json) có `GET /work-shifts/current` `NETWORK_FAILED`. Sau logout/login store khác, [màn cửa hàng B](evidence/browser-other-store.png) trống dữ liệu A và không còn toast A; script assert DOM thông báo rỗng. Đối chiếu cả [DB trước](evidence/browser-db-before.json). Đây là bằng chứng **local do agent chính chạy**; QA phải tự chạy trên phiên bản cuối để kết luận Sprint.

Lượt browser thử hai cửa sổ `browser-cross-tab.log` và `browser-cross-tab-retry.log` không hoàn tất (cửa sổ phụ gây race phiên khi refresh). Không dùng chúng để chứng minh nghiệm thu; test cuối kiểm chuyển tab UI trong cùng cửa sổ như tiêu chí màn hình. Các lượt `backend-shifts-extra.log`, `backend-shifts-extra-retest.log` trước khi sửa fixture/assertion cũng không dùng làm bằng chứng PASS.
