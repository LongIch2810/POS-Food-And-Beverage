**Trạng thái:** đã sửa và kiểm chứng local; code review không còn finding trong phạm vi sửa.

# Login bị từ chối khi role thay đổi trong lúc chờ khóa user

- Task/plan: `tasks/completed/2026-10-30-pb04-organization-api.md`, `plans/completed/2026-10-30-pb04-organization-api.md`.
- Điều kiện: CASHIER active, mật khẩu đúng, ca chưa liên quan. Giữ khóa user bằng transaction QA; enqueue PATCH đổi role MANAGER trước, enqueue login sau, xác nhận cả hai đang chờ row lock bằng pg_locks/pg_stat_activity rồi nhả holder.
- Expected: đổi role commit và thu hồi phiên cũ; login sau đó dùng user/role hiện hành, mật khẩu không đổi nên nhận200 với MANAGER; phiên cũ401, chỉ phiên login mới còn hiệu lực.
- Actual trước sửa: PATCH200 nhưng login401 dù mật khẩu đúng. Case `ACC-RACE ... role versus login, mutation obtains user lock first` trong `qa-evidence/20261030-202325-9ce75dd-pb04-gap-fix/acceptance-3.log.gz`; những lịch reset/refresh/disable khác đã qua.
- Nguyên nhân: SELECT user JOIN role trong cùng statement FOR UPDATE giữ snapshot của JOIN trước lúc đợi. Khi user.role_id thay đổi lúc statement chờ lock, kết quả JOIN có thể không còn trả user cho login. Refresh đã có mô hình khóa user trước rồi truy vấn quan hệ trong statement sau.
- Sửa: AuthService.login khóa dòng user chỉ chọn ID trước; truy vấn lại user+role+store bằng ID trong transaction sau khi đã có khóa. Giữ kiểm tra password, store lock, rate limit và tạo session trong transaction; không thay signature/caller.
- Kiểm chứng: acceptance-4 đạt24/24 sau sửa login. Full-2 ngày30/10/2026 exit0,48/48 TAP nodes, gồm12 lịch reset/role/disable↔login/refresh và2 lịch role→reset/disable mới, cùng auth/platform suite. Không làm yếu assertion để biến401/404 thành pass. Run/log/hash và review ở `qa-evidence/20261030-202325-9ce75dd-pb04-gap-fix/`; log lớn nén lossless `.log.gz`, manifest lưu SHA256 raw/gzip.

## Lỗi công cụ test đã phân biệt

Reviewer tìm thấy cùng mẫu JOIN-lock trong UsersService.staff. `acceptance-6.log.gz` tái hiện hai lịch role→reset và role→disable: PATCH role200 nhưng thao tác kế tiếp404 giả thay vì200. Sửa helper dùng chung: SELECT khóa user theo ID + store/branch scope trước, đọc role ở statement sau; cả PATCH/reset đều dùng helper này. Không khóa ID ngoài tenant/branch scope. Test ACC-RACE-MUTATION giữ expected[200,200], kiểm role hiện hành, trạng thái DB và thu hồi phiên.

Lượt acceptance-2 còn có lỗi đọc envelope me (`data.user`, không phải `data`) và dò lock qua chữ cuối SQL. PostgreSQL local track_activity_query_size=1kB có thể cắt query JOIN dài trước FOR UPDATE; harness đã chuyển sang pg_locks RowShareLock + blocking PIDs, không giả định thứ tự bằng sleep. Những lỗi harness này đã được sửa trước lượt acceptance-3 nêu trên.
