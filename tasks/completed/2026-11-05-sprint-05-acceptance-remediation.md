# Task: Đối soát và khắc phục thiếu bằng chứng nghiệm thu Sprint 05

**Trạng thái:** Hoàn thành, QA Sprint 05 PASS local 19/19 ngày 05/11/2026; chưa có CI cho working tree dirty. **Nhánh:** `feat/pb06-shifts`. **HEAD nền:** `1132f12a447058e6ace8cb8fb87dc6877763ee5d`. **Plan liên quan:** `plans/completed/2026-11-03-sprint-05-shifts.md`; đây là việc khắc phục sau review, không sửa plan cũ.

## Mục tiêu, quyết định và phạm vi

Đối chiếu từng vế nghiệm thu trong `sprints/sprint-05/SPRINT.md` với `specs/shifts.md`, mã cuối và artifact gốc; sửa sai lệch mã/tài liệu/test thuộc Sprint 05, chạy kiểm tra trên sandbox đã xác nhận, thu đủ chứng cứ, và yêu cầu QA độc lập rà lại trước khi kết luận. Không tự tick PASS khi còn vế chưa xác minh. Người dùng chốt ngày 05/11/2026: giữ mã lỗi `SHIFT_ALREADY_OPEN` và `BRANCH_CASHIER_SHIFT_OPEN` trong spec/API, sửa Sprint 5; cho phép integration test tạo/xóa DB thử riêng trên PostgreSQL local/test sau khi xác nhận môi trường. Không chạm production.

## Baseline và bảo vệ thay đổi

`git status --short` lúc bắt đầu có `.agents/subagents/{README,code-reviewer,explorer,qa}.md` bị xóa; `.codex/agents/qa.toml`, `AGENTS.md`, mã API/UI Sprint 05, test UI và các evidence/task mới dirty/untracked. Giữ nguyên mọi thay đổi đó, chỉ sửa file đã xác định trong task. Không dùng reset/clean/stash hoặc xóa rộng. Mọi log test mới phải lưu dưới `qa-evidence/` với metadata theo `AGENTS.md`.

## Tiêu chí và cách chứng minh

| AC | Nguồn | Việc cần kiểm chứng | Artifact cần có | Trạng thái |
| --- | --- | --- | --- | --- |
| AC-1 | `sprints/sprint-05/SPRINT.md` §1–2; `specs/shifts.md` SHIFT-01..03 | Mã lỗi và ràng buộc ca mở khớp spec, giờ tan ca sau giờ vào | Test assertion, log integration, đối chiếu văn bản | PASS local QA: S05-01..05 trong `qa-evidence/20261105-212738-1132f12-sprint05-qa-independent/sprint05-criteria.md` |
| AC-2 | Sprint 05 §2–3; spec SHIFT-04..07 | Tiền đầu ca, khóa quỹ, đối soát, force-close và tác dụng phụ DB | Test/integration, API response, DB trước/sau nếu test thủ công | PASS local QA: S05-06..12 trong bảng QA và browser cuối |
| AC-3 | Sprint 05 §4; spec SHIFT-08 | Cô lập store/branch, khóa user/store, phân quyền | Test/integration và log gốc cho từng vế | PASS local QA: S05-13..15 trong bảng QA |
| AC-4 | Sprint 05 §5; spec §Nghiệm thu | UI ca/POS và browser Chrome headless trên UI cuối | Screenshot/snapshot trước/sau, network và log browser gốc | PASS local QA: S05-16..19 tại `qa-evidence/20261105-214648-1132f12-sprint05-qa-pos-tab-final/run.md` |
| AC-5 | Sprint 05 §Review; AGENTS QA evidence | Full regression/build và ma trận criterion→scenario→artifact khớp mã/working tree cuối | Log runner gốc, run.md, QA độc lập | PASS local QA: backend 67/67, UI 37/37, browser cuối; local build API/UI exit 0 trong run của agent chính. CI chưa có, ghi rõ giới hạn. |

## Các bước

1. [Hoàn tất] Sửa Sprint 05 dùng `SHIFT_ALREADY_OPEN`/`BRANCH_CASHIER_SHIFT_OPEN` theo quyết định người dùng; bỏ `BR-242` không tồn tại. Chuyển trạng thái Sprint sang đối soát và bỏ 19 dấu tick cũ cho tới khi QA đối chiếu lại.
2. [Hoàn tất phần backend] SHIFT-01 kiểm tra `endedAt > startedAt`; SHIFT-08 thêm MANAGER/CASHIER scope, ACCOUNT_DISABLED và STORE_SUSPENDED. Lần đầu test mới FAIL do fixture tạo trùng branch A2; đã sửa fixture dùng branch có sẵn và chạy lại 10/10 PASS.
3. [Hoàn tất local] Xác nhận PostgreSQL Docker healthy và `DATABASE_URL` host local mà không in connection string. `POS_API npm test` 66/66, `POS_UI npm test` 37/37, build API/UI exit 0, SHIFT-08 sau sửa 10/10. Log/metadata/matrix: `qa-evidence/20261105-181854-1132f12-sprint05-remediation/run.md`. Full backend log ~24 MB chỉ giữ local, không thêm Git.
4. [Hoàn tất local, chờ QA] Browser Chrome headless trên UI cuối đã chạy trên DB thử riêng `pos_sprint05_browser_20261105`, không dùng DB base chứa 31 store. Lượt đầu phát hiện CASHIER không có đường mở ca; đã thêm nút `Mở ca thu ngân` trong `ShiftsScreen`, UI test/build sau fix exit 0. Browser cuối exit 0, lưu ảnh login/gate/OPEN/modal đếm mù/kết quả/hoàn tất, network method/path/status và DB trước/sau trong run.md. Query chỉ đọc xác nhận store test có ở DB riêng (count 1), không có ở DB base (count 0).
5. [Đang làm] Đã yêu cầu subagent QA độc lập tự chạy browser ở thư mục evidence riêng. QA đang kiểm tra an toàn DB trước khi chạy; chờ kết luận từng tiêu chí. Chỉ tick tiêu chí có bằng chứng đủ, sau đó hoàn tất task/sprint khi mọi vế PASS.

**File đã đổi:** `sprints/sprint-05/SPRINT.md`, `POS_API/src/shifts/tests/shifts.integration.test.ts`, `POS_UI/src/features/shifts/ShiftsScreen.tsx`, task này, `qa-evidence/20261105-181854-1132f12-sprint05-remediation/`. **Bước tiếp theo cụ thể:** nhận kết quả QA độc lập, sửa phần chưa đủ, chạy lại hồi quy liên quan, lập bảng đối chiếu 19 tiêu chí Sprint 05 trước khi tick. **Blocker còn lại:** chưa có kết luận QA độc lập trên UI cuối; chưa có CI cho working tree dirty.

## Cập nhật 05/11, lượt QA và fix tiếp theo

- QA độc lập đối chiếu 19 tiêu chí tại `qa-evidence/20261105-212738-1132f12-sprint05-qa-independent/sprint05-criteria.md`: trước fix S05-19 FAIL vì toast cửa hàng A còn trên phiên cửa hàng B; S05-04/06/12/18 NOT VERIFIED. Đã tự tái hiện B09 theo ảnh browser riêng và ghi `errors/2026-11-05-toast-leak-between-sessions.md`.
- Đã sửa `POS_UI/src/context/ToastContext.tsx` xóa toast khi danh tính/trạng thái xác thực đổi. QA tự chạy lại B09 và hồi quy B05-B08, kết luận PASS tại `qa-evidence/20261105-213954-1132f12-sprint05-qa-b09-retest/run.md`. Không coi đây là PASS toàn Sprint.
- Đã bổ sung SHIFT-02/04/08 assertion: client gửi openingCash giả bị 422, GET current trả type/time/openingCash và expectedCash null, PATCH ca CLOSED bị 404, CASHIER gửi branch khác vẫn mở ở branch gắn token, OWNER dùng branch store khác bị 404. Local build và shift suite cuối 11/11 tại `qa-evidence/20261105-181854-1132f12-sprint05-remediation/backend-shifts-extra-final.log`; QA tự chạy full backend 67/67, frontend 37/37 trên tree sau fix. Các lượt test FAIL do fixture/assertion mới trước khi sửa được giữ trong evidence, không dùng làm bằng chứng PASS.
- Lượt browser cuối local `browser-tabs-final.log` exit 0: fixture cấp `pos.sell` cho CASHIER **chỉ trong DB sandbox** để đi vào POS demo; ảnh `browser-pos-gate-before.png` và `browser-pos-after-open.png` chứng minh gate dùng API thật trước/sau mở ca; ảnh `browser-menu-tab.png` và `browser-shifts-tab-return.png` chứng minh chuyển tab UI. API current trước đếm có expectedCash null (`browser-before-count-response.json`); lỗi mạng gốc ở `browser-network.json` và ảnh `browser-network-error.png`; logout/login store B ở `browser-other-store.png`. Nội dung bán hàng trong POS vẫn mock, không dùng làm bằng chứng backend bán hàng.
- **Bước tiếp theo cụ thể:** QA độc lập tự chạy script browser mới và kết luận S05-18/S05-19 theo ảnh/network/DB, rồi chỉ tick các tiêu chí Sprint đủ bằng chứng; cập nhật run.md và task. Nếu QA bác fixture quyền sandbox hoặc còn thiếu vế, giữ NOT VERIFIED và nêu rõ kiểm chứng cần làm. Chưa commit/push, chưa đóng sprint.

## Kết quả hoàn tất 05/11/2026

- QA độc lập tự chạy script cuối trên Chrome/PostgreSQL sandbox, đối chiếu S05-18 và S05-19 PASS tại `qa-evidence/20261105-214648-1132f12-sprint05-qa-pos-tab-final/run.md`. Bảng `qa-evidence/20261105-212738-1132f12-sprint05-qa-independent/sprint05-criteria.md` kết luận cả 19/19 tiêu chí Sprint PASS local; `sprints/sprint-05/SPRINT.md` đã tick 19 tiêu chí và ghi rõ giới hạn CI/working tree dirty. Không gọi đây là xác nhận production.
- Lỗi B09 có hồ sơ `errors/2026-11-05-toast-leak-between-sessions.md`, QA chạy lại tình huống FAIL cũ cùng hồi quy tại `qa-evidence/20261105-213954-1132f12-sprint05-qa-b09-retest/run.md`, kết luận PASS.
- File source/tài liệu đã đổi trong task: `POS_API/src/shifts/tests/shifts.integration.test.ts`, `POS_UI/src/features/shifts/ShiftsScreen.tsx`, `POS_UI/src/context/ToastContext.tsx`, `sprints/sprint-05/SPRINT.md`, file task và error này; artifact nằm trong các thư mục `qa-evidence/20261105-181854-1132f12-sprint05-remediation/`, `qa-evidence/20261105-212738-1132f12-sprint05-qa-independent/`, `qa-evidence/20261105-213954-1132f12-sprint05-qa-b09-retest/`, `qa-evidence/20261105-214648-1132f12-sprint05-qa-pos-tab-final/`. Không thay đổi các file dirty khác của người dùng.
- Lệnh kiểm tra local đã chạy: `POS_API/npm test` (QA 67/67), `POS_UI/npm test` (QA 37/37), `POS_API/npm run build`, `POS_UI/npm run build`, `node --env-file-if-exists=.env --test dist/shifts/tests/shifts.integration.test.js` (11/11), `node --env-file=POS_API/.env qa-evidence/20261105-181854-1132f12-sprint05-remediation/browser-shift.cjs` (exit 0), `git diff --check` (exit 0). Log/metadata chi tiết ở `qa-evidence/20261105-181854-1132f12-sprint05-remediation/run.md` và run QA tương ứng.
- Bước tiếp theo sau task: nếu muốn bằng chứng CI cho snapshot đã commit, commit theo quy trình Git rồi chạy pipeline và liên kết URL/ID runner; task này không tự commit/push. Không còn blocker cho nghiệm thu **local**.
