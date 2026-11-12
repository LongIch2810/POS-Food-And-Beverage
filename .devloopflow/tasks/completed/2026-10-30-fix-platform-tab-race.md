# Sửa race reload PB-03 khi chuyển tab

**Trạng thái:** hoàn tất ngày 2026-10-30, regression test/build đạt và code-reviewer xác nhận đóng finding.

- Mục tiêu: đóng finding P2 code-reviewer về reload mutation cũ ghi đè cursor tab mới.
- Nhánh: feat/pb03-platform, working tree có thay đổi PB-03 chưa commit; giữ nguyên ngoài phạm vi fix.
- Phạm vi: PlatformAdminScreen.tsx, test race UI, artifact kiểm chứng và error record.
- Nguyên nhân đã reviewer tái hiện: reload đóng trên activeTab/cursor cũ nhưng cập nhật nextCursor dùng chung sau khi tab mới tải xong.
- Bước tiếp: thêm regression test tái hiện trước sửa; gom tải danh sách về effect có cleanup, chạy lại UI test/build; ghi kết quả rồi chuyển task completed.
- Kiểm chứng dự kiến: điều khiển thứ tự mutation/list promises khi chuyển tab, xác nhận Trang sau OWNER chỉ gửi OWNER cursor; trường hợp reload cũ hoàn tất muộn không thay danh sách/cursor/loading/error tab mới. Lưu runner output gốc và phiên bản dirty.

- Đã làm: regression test thực thi TSX hiện tại với hooks/service boundaries; trước sửa fail đúng STORE_RELOAD_CURSOR; bỏ reload async riêng, dùng effect cleanup và reloadVersion. UI10/10, build exit0, diff check exit0. Artifact qa-evidence/20261030-platform-tab-race/run.md; error errors/2026-10-30-platform-tab-reload-race.md.
- Kết luận reviewer: đã đọc source/test/log và xác nhận P2 được sửa, không thấy lỗi mới trong phần sửa; không chạy lại runner/browser. Task chuyển completed; không còn bước triển khai trong phạm vi fix này. Chưa commit/push.
