**Trạng thái:** completed

# Tổ chức lại backend và frontend theo kiến trúc mục 5

Mục tiêu: chuyển mã đang có về `POS_API/src/database/`, `POS_UI/src/app/` và đặt service chỉ thuộc một feature cạnh feature đó; không đổi hành vi.

Phạm vi: source, import, script migration, README và mô tả hiện trạng cấu trúc. Giữ nguyên các thay đổi PB-02 chưa commit và các file không thuộc task.

Các bước: lập bản đồ import/đường dẫn; chạy kiểm tra trước; di chuyển file riêng lẻ; sửa import/script/docs; chạy build, typecheck và test API; xem diff.

Tiêu chí hoàn thành: không còn import đường dẫn cũ, build UI và test API đạt, migration được tìm thấy từ DataSource mới, không sửa logic nghiệp vụ.

Quyết định: chỉ chuyển file hiện có; không tạo module hoặc thư mục con rỗng, không tách `mockEngine`, không thêm dependency.

Rủi ro: đường dẫn migration tương đối, import xuyên thư mục, working tree có thay đổi chưa commit từ các task trước.

Kết quả: đã chuyển 19 file riêng lẻ, cập nhật 45 import, đường dẫn CLI migration, README và mô tả kiến trúc. Build API/UI đạt; migration CLI và test API đạt 5/5 trên PostgreSQL tạm. Bằng chứng: `qa-evidence/2026-10-29-093310-fc2b07d/run.md` và `qa-evidence/2026-10-29-093400-fc2b07d/run.md`. Chưa merge/push; các thay đổi cũ vẫn được giữ.
