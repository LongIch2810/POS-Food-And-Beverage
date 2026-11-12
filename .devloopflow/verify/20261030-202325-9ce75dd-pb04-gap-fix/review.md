# Code review bản sửa PB-04

Reviewer subagent `/root/fix_review`, vai trò code-reviewer, chỉ đọc code và bằng chứng, không sửa source hoặc chạy một bộ test độc lập. Tiếp nối review/audit trước theo yêu cầu người dùng.

- Đã đọc AuthService.login cùng LocalStrategy/caller: khóa ID trước JOIN giữ rate limit, password/store check và session transaction. Không thấy regression trong phần đã rà.
- Reviewer tìm mẫu JOIN-lock còn lại tại UsersService.staff; root thêm hai regression và tái hiện thật trong acceptance-6.log.gz: role PATCH200, reset/disable kế tiếp404 sai.
- Bản sửa staff giữ store/branch scope ở SELECT lấy khóa, đọc role sau trong cùng transaction; PATCH/reset dùng chung helper. Test giữ expected[200,200], kiểm role hiện hành, flags, password và thu hồi phiên.
- Đã rà logger capture/commit gate/rollback trigger, PG orderedRace, pagination traversal, migration legacy và DOC-02. Không thấy assertion bị làm yếu để chấp nhận lỗi.
- Lần xác nhận cuối reviewer đã mở full-2 output: exit0,48 TAP nodes pass,0 fail/skip/cancel; gồm cả hai regression mới. Đã rehash source66/runtime64/contract9,0 sai lệch.

**Kết luận:** không còn finding trong phạm vi code đã review. Đối chiếu đầy đủ từng gap chứng cứ xem audit.md. Đây là review bằng chứng local do agent chính chạy, chưa có CI độc lập, chưa nghiệm thu Product Owner. Không kiểm UI/PB-06 hoặc production; không merge/push/commit.
