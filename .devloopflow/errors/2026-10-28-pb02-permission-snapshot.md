# Trạng thái: đã sửa

- Triệu chứng: thay đổi role đồng thời có thể làm một response/guard ghép phạm vi cũ với quyền của role mới.
- Điều kiện tái hiện: role đổi giữa lần đọc user và lần đọc permissions.
- Nguyên nhân: query permissions đọc lại `users.role_id` thay vì dùng role ID của bản ghi user đã nạp.
- Sửa: query permissions theo `role_id` trong cùng bản ghi user dùng cho phạm vi.
- Kiểm chứng: review mã và test quyền hiện hành trong `POS_API/src/auth/tests/auth.integration.test.ts`; QA local `qa-evidence/20261028-152045-cdcc096/run.md`.
- Task: `tasks/completed/2026-10-28-pb-02-auth.md`; commit: chưa commit.
