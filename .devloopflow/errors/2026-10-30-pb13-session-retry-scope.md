**Trạng thái:** đã sửa và kiểm chứng local; UI cuối28/28, có browser artifact và code review bên dưới.

# Request cũ không được replay dưới danh tính mới

- Task: `tasks/completed/2026-10-30-pb13-organization-ui.md`.
- Reviewer mock-trace: createBranch form A→401, restoreSession đọc ownerB/storeB, helper cũ POST cùng body lần2 dưới storeB. Server hợp lệ vì store được lấy từ cookie; broadcast/unmount chỉ chặn setState, không chặn replay fetch.
- Regression PB13-HTTP never retries an old mutation under another authenticated store trong ui-tests-4.log:24pass1fail, thiếu expected SESSION_CHANGED.
- Sửa: lưu identity/epoch trong RAM qua auth login/me/logout và broadcast revoke; capture khi request bắt đầu, so user/store/branch/role/permissions và epoch sau restore trước retry. Không biết danh tính ban đầu thì không retry mutation. Kiểm lại epoch sau bước CSRF async trước phát mutation. Không đưa context vào storage hoặc tin body storeId.
- Kiểm chứng: toàn UI/auth/platform suite và regression trên, sau đó browser version cuối. Bằng chứng `qa-evidence/20261030-214100-9ce75dd-pb13-organization-ui/`.

Final verification: `qa-evidence/20261101-203100-9ce75dd-pb13-final/run.md`; final28/28 controlled UI tests, typecheck/build exit0, real browser identity/query/layout/auth scenarios. Earlier red logs remain unchanged. No CI/production claim.
