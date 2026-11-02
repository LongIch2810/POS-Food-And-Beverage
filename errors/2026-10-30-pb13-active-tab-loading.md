**Trạng thái:** đã sửa và kiểm chứng local; UI cuối28/28, có browser artifact và code review bên dưới.

# Bấm tab hiện hành làm kẹt loading

- Task: `tasks/completed/2026-10-30-pb13-organization-ui.md`.
- Reviewer pb13_code_review phát hiện navigate luôn tăng generation dù JSON view không đổi. Effect phụ thuộc viewKey không chạy lại, response pending bị loại bỏ và loading không tắt.
- Tái hiện: PB13-RACE clicking the active tab while loading, giữ promise GET branches, bấm Chi nhánh khi default page1, resolve. ui-tests-2.log có23pass1fail; expected row branch, actual undefined. Run: `qa-evidence/20261030-214100-9ce75dd-pb13-organization-ui/`.
- Sửa: chỉ invalidate generation khi query key thật sự đổi; cập nhật currentView trước khi setState để mutation response cùng lượt không nhầm phạm vi.
- Kiểm chứng tiếp: test trên và toàn UI suite, browser bản cuối; không đổi expected để chấp nhận spinner kẹt.

Final verification: `qa-evidence/20261101-203100-9ce75dd-pb13-final/run.md`; final28/28 controlled UI tests, typecheck/build exit0, real browser identity/query/layout/auth scenarios. Earlier red logs remain unchanged. No CI/production claim.
