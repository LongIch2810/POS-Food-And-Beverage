# Reload mutation cũ ghi đè cursor tab mới

Trạng thái: đã sửa, UI regression test/build local đạt.

- Triệu chứng: Trang sau tab Chủ quán gửi cursor Cửa hàng, API trả422.
- Tái hiện: ở Stores trang1, mở lại store khi request chờ; chuyển Owners và tải xong OWNER cursor; mutation cũ resolve rồi reload Store ghi đè nextCursor dùng chung.
- Nguyên nhân đã xác minh: closure reload giữ activeTab/cursor cũ và cập nhật state chung ngoài effect có cleanup. Regression test trên TSX hiện tại thất bại đúng STORE_RELOAD_CURSOR thay OWNER_NEXT_CURSOR trước sửa.
- Sửa: gom reload/retry/mutation refresh về effect tải danh sách có cleanup, trigger bằng reloadVersion; bỏ cập nhật async riêng.
- Kiểm chứng: qa-evidence/20261030-platform-tab-race/run.md, red-reproduced.log → ui-tests.log10/10; UI build đạt.
- Task: tasks/completed/2026-10-30-fix-platform-tab-race.md; commit nền53d794b, working tree dirty. Chưa browser thật/CI.

## Đối chiếu khi đóng Sprint 2 — 30/10/2026

Dòng chưa browser/CI ở trên là trạng thái lúc fix. Sau đó đã bổ sung browser API thật trên UI sau fix, hash source/container khớp, Owners page2 dùng đúng cursor và cấp OWNER đúng store trang sau; QA đóng findings tại `qa-evidence/20261030-platform-tab-race/qa-acceptance-audit.md`. Screen hiện tại vẫn có SHA256 `75ef00dd3fd5e6c0704c7290a88c0e237665e9f43ead44f97a6a629edbbb9117`.

CI run https://github.com/LongIch2810/POS-Food-And-Beverage/actions/runs/40999585144 tại master `9cc3299` đã thành công: UI 10/10 gồm regression race, API 7/7. Log CI gốc lưu tại `sprints/sprint-02/closure-evidence/`. CI không chạy browser E2E; browser vẫn là chứng cứ local đã đối chiếu. Không có việc sửa lỗi còn mở trong phạm vi race này.
