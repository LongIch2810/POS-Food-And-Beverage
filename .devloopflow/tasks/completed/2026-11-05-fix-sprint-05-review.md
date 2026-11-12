# Fix findings review Sprint 05

**Trạng thái:** Hoàn tất, đã kiểm tra; chuyển sang `tasks/completed/`. **Nhánh:** `feat/pb06-shifts`. **Plan liên quan:** Không có; yêu cầu sửa tám finding của review Sprint 05.

## Mục tiêu và phạm vi

Sửa các lỗi đã được code-reviewer xác định trên commit `1132f12`: quyền điều hướng Ca làm của CASHIER; ID chi nhánh thật và trạng thái ca thật ở POS/AppShell; form sửa chi nhánh sau khi khóa `initialCash`; check-in STAFF của OWNER; giữ kết quả đối soát; lưu reason/note force-close trong giới hạn DB; xung đột mở ca đồng thời của cùng user ở hai branch. Giữ nguyên thay đổi `AGENTS.md` chưa commit của người dùng. Không mở rộng sang PB-07/PB-10.

## Quyết định và căn cứ

- Theo `specs/shifts.md`, OWNER chọn branch thật khi mở ca; CASHIER/MANAGER dùng branch từ phiên. Quyền mới là `shift.read/open/close/force_close`.
- `reason` và `note` của force-close mỗi trường được DTO cho phép tối đa 255 ký tự. Lưu reason trong `work_shifts.note`, ghi chú đối soát trong `cash_reconciliations.note` để không ghép vượt cột; giữ nguyên dữ liệu người dùng.
- Với mở ca đồng thời, trả lỗi nghiệp vụ `409 SHIFT_ALREADY_OPEN`, giữ unique index DB làm lớp bảo vệ cuối.

## Các bước và trạng thái

1. [Hoàn tất] Đối chiếu `specs/shifts.md`, caller `PosScreen`/`AppShell`/`SettingsScreen`, DTO, cột note và unique index; xác nhận tám tình huống review.
2. [Hoàn tất] Quyền UI đổi sang `shift.read/open/close`; gate và OWNER check-in lấy branch thật từ API; POS/AppShell lấy current shift từ API; form branch bỏ `initialCash` khi không đổi và khóa field sau ca đầu; modal giữ kết quả đến khi đóng.
3. [Hoàn tất] Force-close lưu reason trong `work_shifts.note`, note trong `cash_reconciliations.note`; openShift khóa User trước Branch để tuần tự hóa hai branch của cùng user.
4. [Hoàn tất] Test điều hướng CASHIER, branch và ca hiện hành ở POS, OWNER STAFF, payload sửa chi nhánh, kết quả đối soát, force-close độ dài biên và mở ca đồng thời. `POS_UI npm test`: 37/37; `POS_API` integration ca: 10/10; build cả hai phần exit 0.
5. [Hoàn tất] Đã đọc lại diff và log, kiểm tra `git diff --check` exit 0; bằng chứng local trong `qa-evidence/20261105-1745-1132f12-sprint05-fixes-final/run.md`. Lần API đầu thất bại vì PostgreSQL chưa chạy, sau khi bật DB đã chạy lại đạt.

## Ma trận kiểm tra và artifact dự kiến

| Finding | Dấu vết cần lưu |
| --- | --- |
| Quyền CASHIER và điều hướng | UI test/navigation, output runner |
| Branch thật ở gate và OWNER STAFF | UI test service/caller, output runner |
| Ca hiện hành ở POS/AppShell | UI test trạng thái/reload, output runner |
| PATCH branch sau ca đầu | API integration và UI test payload, output runner |
| Kết quả đối soát | UI test render sau API close, output runner |
| Lý do/ghi chú force-close | API integration với độ dài biên, output runner |
| Mở ca đồng thời hai branch | API integration và DB constraint, output runner |

## File, lệnh và blocker

- File đã đổi: `POS_API/src/shifts/shifts.service.ts`, `POS_API/src/shifts/tests/shifts.integration.test.ts`, `POS_UI/src/app/{App.tsx,navigation.ts}`, `POS_UI/src/components/common/AppShell.tsx`, `POS_UI/src/features/{pos/PosScreen.tsx,settings/{OrganizationEditor.tsx,SettingsScreen.tsx},shifts/{BlindCountCloseShiftModal.tsx,OpenShiftGate.tsx,ShiftsScreen.tsx}}`, `POS_UI/src/services/shiftService.ts`, `POS_UI/src/types/auth.ts`, `POS_UI/test/{organization-screen.test.mjs,shift-screen.test.mjs}`, file task và QA evidence. `AGENTS.md` đã dirty trước task và được giữ nguyên.
- Lệnh và bằng chứng: `git diff --check` exit 0; `POS_API npm run build` exit 0 (`qa-evidence/20261105-1728-1132f12-sprint05-fixes/backend-rebuild.log`); `POS_UI npm test` exit 0, 37/37 (`qa-evidence/20261105-1745-1132f12-sprint05-fixes-final/frontend-test-final.log`); `POS_UI npm run build` exit 0 (`frontend-build-final.log`); `POS_API node --env-file-if-exists=.env --test dist/shifts/tests/shifts.integration.test.js` exit 0, 10/10 (`backend-shifts-test.log`). Chi tiết thời gian/môi trường/tình huống trong `qa-evidence/20261105-1745-1132f12-sprint05-fixes-final/run.md`.
- Bước tiếp theo: người dùng review diff và có thể chạy lại bộ test với PostgreSQL local; không còn blocker của task. Giới hạn kiểm chứng: local tự động, chưa chạy browser hoặc CI độc lập.
