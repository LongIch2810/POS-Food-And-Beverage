# Triển khai PB-03

**Trạng thái:** hoàn tất triển khai, test và QA ngày 2026-10-30 theo spec đã chốt; chuyển completed.

- Plan: `plans/completed/2026-10-29-pb03-platform.md`.
- Mục tiêu: API/DB PB-03 và UI PB-13 lát cắt quản trị nền tảng.
- Nhánh: `feat/pb03-platform` từ `master` sau `git fetch` và `git pull --ff-only` (không lệch origin).
- Đã làm: đọc Sprint 2, backlog, BR, DB, API, auth, UI; Product Owner chốt luồng và phạm vi. Viết `specs/platform.md`, migration quyền, API/DB và UI thật. Đồng bộ field `temporaryPassword` theo quyết định Product Owner. Build/test API/UI đạt; Chrome DevTools đã kiểm tra luồng PB-03, DB trước/sau khóa/mở, reload và lỗi; bằng chứng ở `qa-evidence/20261029-202132-53d794b/run.md`.
- Bước tiếp ngoài task triển khai đã xong: Product Owner review phiên bản làm lại theo run.md và qa-audit.md trong qa-evidence/20261030-0158-53d794b-pb03-rework/; quyết định nghiệm thu được theo dõi trong Sprint 2.
- File đã đổi trong task: `POS_API/src/{app.module.ts,auth/auth.service.ts,auth/security/access.guard.ts,auth/tests/auth.integration.test.ts,foundation.test.ts,database/migrations/20261029000000-PlatformPermissions.ts,platform/*}`, `POS_UI/src/{app/App.tsx,components/common/AppShell.tsx,features/platform/PlatformAdminScreen.tsx,services/platformService.ts,types/auth.ts}`, `specs/platform.md`, `docs/architecture/TECH_STACK.md`, plan/task và `qa-evidence/20261029-202132-53d794b/`. Ba file Sprint 2 cũ giữ nguyên nội dung.
- Kiểm tra cuối: API PostgreSQL7/7 (build trong npm test), UI9/9, UI build exit0; log và ma trận tại `qa-evidence/20261030-0158-53d794b-pb03-rework/run.md`, QA tại `qa-audit.md` cùng thư mục. Local trên working tree dirty, chưa CI; kết quả cũ bên dưới là lịch sử.
- Quyết định hiện tại: D1–D5 và bản nháp đã được Product Owner chốt trong hội thoại 2026-10-30; specs/platform.md là hợp đồng mới. Kết quả QA và nghiệm thu ngày 29/10 là lịch sử phiên bản cũ.

## Cập nhật 2026-10-29 14:37 UTC

Đã sửa finding QA: test 403 OWNER xác nhận `PERMISSION_DENIED` sau khi bỏ cờ đổi mật khẩu, UI platform refresh/retry khi access hết hạn và báo phiên bị thu hồi khi 401 cuối. Chạy lại API 6/6, UI 9/9, build UI và dựng API/UI cuối. Browser cuối đã lưu snapshot/ảnh tablet, HTTP response che mật khẩu, DB trước/sau trong `qa-evidence/20261029-202132-53d794b/`; `run.md` đã đối chiếu lại theo artifact cuối. Bước tiếp theo: QA độc lập mở từng artifact và rà code; xử lý finding nếu có, sau đó trình Product Owner. Chưa tick Sprint 2 hoặc push.

## Cập nhật 2026-10-29 14:51 UTC

QA tìm thấy thiếu network status 201/409 của lượt browser cuối, console log, log API và trường hợp khóa khi OWNER có phiên sống. Đã bổ sung lượt 14:43–14:48 UTC vào `qa-evidence/20261029-202132-53d794b/run.md`: network 201/409, console, log API, DB `ACTIVE|1|1 → SUSPENDED|1|0`, UI OWNER về đăng nhập sau reload và network 401. Lượt QA đối chiếu lại bị dừng vì giới hạn sử dụng; cần chạy lại QA độc lập và xử lý finding còn lại trước khi kết luận hoặc tick.

## Cập nhật sau QA độc lập

QA đã đọc artifact bổ sung và xác nhận bốn finding đã có dấu vết; không thấy lỗi hành vi mới. QA yêu cầu dẫn thêm log reset/mở lại từ lượt trước: đã bổ sung `api-container.log` dòng 111 và 136 vào `run.md`, nêu rõ thời điểm và giới hạn. Bước tiếp: QA đối chiếu dòng bổ sung; trình Product Owner review. Bằng chứng local trên working tree dirty, chưa có CI và chưa có quyết định nghiệm thu.

## Cập nhật 15:42 UTC

QA xác nhận log BR-86, các luồng và ba tiêu chí UI có dấu vết local; chỉ ra thiếu kiểm tra ID và các API vận hành. Đã bổ sung test ID sai/thiếu, reset non-OWNER, hai store và OWNER gọi chéo store bị từ chối; dựng lại API và chạy test PostgreSQL 6/6, output `qa-evidence/20261029-202132-53d794b/api-test-boundaries.log`. Các API hóa đơn/ca/kho/doanh thu chưa triển khai, vế quyền đối với từng API chưa xác minh và ô PB-03 liên quan chưa đủ để tick. Bước tiếp: QA độc lập rà phần test/bằng chứng mới; trình Product Owner kết quả và giới hạn, giữ task active khi tiêu chí còn chưa xác minh.

QA độc lập đã đối chiếu test và output mới: tiêu chí ranh giới/ID trong phạm vi endpoint PB-03 có dấu vết local; test gọi chéo store là RBAC của endpoint platform, không thay thế test phạm vi store của API vận hành. Các ô PB-03 khác và ba ô UI có dấu vết local; riêng vế PLATFORM_ADMIN đọc API hóa đơn/ca/kho/doanh thu chưa thể xác minh vì endpoint chưa tồn tại. Tiếp theo trình Product Owner review và quyết định xử lý vế phụ thuộc API sau, không tick thay quyết định đó.

## Product Owner nghiệm thu một phần

Ngày 29/10/2026 Product Owner yêu cầu tick các tiêu chí đã đủ chứng cứ. Đã tick ba ô PB-03 và ba ô PB-13 tương ứng trong `sprints/sprint-02/SPRINT.md`; ô quyền PB-03 giữ trống vì API vận hành chưa có để kiểm tra. Task và plan vẫn active; bước tiếp theo kiểm tra vế quyền khi các endpoint liên quan được triển khai.

## Lập lại kế hoạch ngày 2026-10-30

Đã đọc PB-03/PB-13 Sprint 2, spec, plan/task, MEMORY và skill create-pos-spec cùng template mới. Thay nội dung plan active bằng kế hoạch chi tiết từ refinement đến API/DB/UI, kiểm thử, review và QA. Kế hoạch giữ các quyết định đã chốt, liệt kê D1–D5 cần quyết định; ghi phạm vi sửa/caller, ma trận kiểm thử và điều kiện hoàn thành. Chỉ sửa plan/task trong lượt lập kế hoạch; chưa sửa source, spec hoặc tick sprint. Kiểm tra: đọc lại file và git diff --check; không chạy test ứng dụng.

## Bắt đầu thực hiện plan làm lại

- Product Owner đã chốt D1 cursor/limit/meta; D2 permission theo BR-05 và context platform/store; D3 storeId là target quản trị; D4 UI Cửa hàng/Chủ quán với checkbox lưu mật khẩu; D5 hoãn nhật ký/chi nhánh và kiểm tra API vận hành sang lát cắt tương ứng.
- Bản nháp chi tiết (nay lưu lịch sử): `plans/completed/2026-10-30-pb03-spec-draft.md`, đã trình Product Owner chốt trước cập nhật `specs/platform.md`.
- Kiểm kê ảnh hưởng: hai GET controller và listStores/listOwners, service UI và screen phân trang, test API/UI dùng page/hasMore; AuthService.authorizeAccess và AccessGuard; screen dùng sẵn Dialog.disableClose để giữ modal đến khi xác nhận. Graph không tìm thấy inbound caller nên đã kiểm tra text caller trực tiếp.
- Sai lệch phát hiện: UI dùng chung page cho hai danh sách, chọn store bị giới hạn trang hiện tại; mutation thành công nhưng reload lỗi có thể báo thất bại; Dialog password hiện đóng được bằng X/Escape; guard hiện kiểm tra tên role. Phải xử lý theo spec mới.
- Môi trường: Docker daemon hiện không chạy (docker compose ps exit 1); khởi động lại trước khi chạy integration/browser. Không có lần QA mới trong bước chuẩn bị.
- Bước tiếp cụ thể: nhận chốt bản nháp, cập nhật spec/docs/sprint theo quyết định, thêm test phân trang/context rồi sửa API/UI đồng bộ; thu chứng cứ mới và QA đối chiếu.

## Triển khai và kiểm tra spec mới

Đã cập nhật specs/platform.md theo template sau khi Product Owner chốt bản nháp. Đồng bộ ngoại lệ target store trong API chung, phạm vi UI trong DESIGN và dependency BR-81 trong Sprint2. Đã sửa pagination helper/controller/service, AuthService context, screen/service UI, validation owner object, test phân trang/quyền/concurrency. Không đổi migration/schema/dependency. Caller đã đối chiếu và service UI tests cập nhật hợp đồng data/meta.

API PostgreSQL7/7, UI9/9 và build đạt. Browser đã lưu cursor/trang/tab/bộ chọn store, create/cấp/reset/khóa/mở, DB trước/sau, password dialog checkbox, ảnh tablet và output che secret trong run mới. Lỗi SQL fixture test đã sửa cast text và test lại; log encoding lỗi được thay bằng UTF-8 cuối. Chi tiết lệnh/exit/giờ và giới hạn nằm trong run.md mới. Bước tiếp: QA độc lập mở artifact cuối, không dùng kết quả cũ để tick mới. Chưa commit/push.

QA cuối đã hoàn tất, đóng finding về reset tab, quyền nhầm/context, chứng cứ phân trang render và ảnh mask password. Báo cáo qa-audit.md xác nhận R1–R6 đủ dấu vết local trong phạm vi mới; không phát hiện lỗi mới qua source/artifact đã rà. Phiên bản mới sẵn sàng cho Product Owner review; chưa có CI độc lập. Kiểm tra cuối git diff --check exit0.
