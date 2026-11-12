# Trạng thái: Đã sửa; test local, QA task và QA sprint liên quan PASS

- Task: `tasks/completed/2026-11-06-pb07-open-orders.md`; plan: `plans/completed/2026-11-06-sprint-06-open-orders.md`; AC-1/AC-2/AC-7, S6-01/S6-02/S6-07.
- Triệu chứng: Có cửa sổ cạnh tranh giữa kiểm branch/table còn active và INSERT/UPDATE invoice: người quản lý có thể ngưng tài nguyên trước khi transaction tạo/chuyển đơn commit.
- Bước tái hiện: Review vòng 1 xác định lịch giao thoa từ source; test integration dùng trigger tạm dừng INSERT và thử UPDATE `is_active` từ transaction khác tại `POS_API/src/sales/tests/sales.integration.test.ts`.
- Nguyên nhân: Đã xác minh từ source: truy vấn cũ chỉ khóa shift, không giữ khóa trên branch/table trong transaction. Lịch cạnh tranh cũ được phân tích tĩnh, chưa có log chạy trên code cũ.
- Cách sửa: Giữ `FOR UPDATE OF s,b` khi nạp shift/branch và `FOR SHARE OF t` khi kiểm bàn cho đến commit.
- Kiểm chứng: Transaction UPDATE branch/table khác bị lock timeout `55P03` trong test integration mới, backend 68/68, `qa-evidence/20261106-174110-91cf4a1-pb07-review1-green/backend-test.log.gz`.
- QA task: đối chiếu tình huống và artifact gốc tại qa-evidence/20261106-175111-91cf4a1-pb07-qa/report.md; đây là PASS cấp task trên sandbox local. QA cấp sprint riêng sau đó kết luận các tiêu chí S6 liên quan PASS local tại qa-evidence/20261107-001400-91cf4a1-sprint06-qa/report.md.
