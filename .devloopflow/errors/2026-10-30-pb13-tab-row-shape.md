**Trạng thái:** đã sửa và kiểm chứng local; UI cuối28/28, có browser artifact và code review bên dưới.

# Đổi tab render rows cũ với columns mới làm trắng màn hình

- Task: `tasks/completed/2026-10-30-pb13-organization-ui.md`.
- Browser B32 trước khi gửi form: từ Tài khoản sang Chi nhánh, render mới chạy trước useEffect xóa rows; column quỹ gọi BigInt(undefined) trên row staff. Raw browser-errors.log/console và ui-tests-7.log (26pass1fail) tái hiện thực tế.
- Root cause: state tab đã đổi nhưng rows vẫn từ query trước; guard generation chỉ bảo vệ promise callback, không bảo vệ render chuyển tiếp.
- Sửa: gắn rowsKey với viewKey; chỉ render bảng khi rows thuộc query hiện hành; skeleton khi chờ query mới. Không thay undefined thành0 để che dữ liệu sai loại.
- Regression chạy chính callback columns của màn hình (harness trước chỉ stub DataTable nên bỏ sót render); thêm staff→branches. Kiểm chứng tiếp full UI tests/build và browser bản cuối. Evidence: `qa-evidence/20261030-214100-9ce75dd-pb13-organization-ui/`.

Final verification: `qa-evidence/20261101-203100-9ce75dd-pb13-final/run.md`; final28/28 controlled UI tests, typecheck/build exit0, real browser identity/query/layout/auth scenarios. Earlier red logs remain unchanged. No CI/production claim.
