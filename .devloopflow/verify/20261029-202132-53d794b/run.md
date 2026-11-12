# PB-03 — bằng chứng QA local

**Trạng thái:** đã chạy trên mã/UI cuối ở working tree; chờ QA đối chiếu độc lập và Product Owner nghiệm thu.

- Commit nền `53d794b7bfc405f8d77b0f19e7571d3698c7ea98`, nhánh `feat/pb03-platform`; working tree dirty. Mã PB-03 chưa commit nên SHA này không đại diện cho mã được test.
- Windows/PowerShell, Node 22, PostgreSQL 17, Docker Compose với `POS_INFRA/.env.local`; UI `http://localhost:5173`, viewport 1024×768 CSS px.
- Nguồn **local do agent chạy**. Lượt browser cuối dùng Playwright MCP lúc 2026-10-29 14:15–14:24 UTC. Artifact Chrome DevTools trước đó thuộc UI cũ, chỉ dùng bổ trợ khi ghi rõ. Chưa có CI trên commit PB-03.
- Mật khẩu tạm, giá trị cookie/token và CSRF đã che, chỉ giữ tên cookie và kết quả kiểm tra storage.

## Ma trận lập trước khi chạy

| Tiêu chí | ID | Dấu vết cần có |
| --- | --- | --- |
| Tạo store + OWNER, atomic, password một lần | PB03-01 | test API, browser trước/sau, HTTP, DB trước/sau và duplicate |
| Quyền/cô lập | PB03-02 | test quyền/CSRF, OWNER UI, HTTP 403 |
| Khóa/mở | PB03-03 | test phiên/login, browser, HTTP, DB trước/sau |
| Cấp/reset OWNER | PB03-04 | test hash/phiên, browser, HTTP che secret |
| UI PB-13 | PB13-01 | ảnh tablet UI cuối, snapshot từng chuyển trạng thái, network/storage |
| Hồi quy | PB03-05 | output runner và build, exit code |

## Lệnh và output gốc

| Lệnh từ gốc repo | Exit | Output | Kết quả |
| --- | ---: | --- | --- |
| `npm run build --prefix POS_API` | 0 | `api-build.log` | lượt trước; API test cuối build lại mã cuối |
| `npm run build --prefix POS_UI` | 0 | `ui-build-final-local.log` | build UI cuối |
| `npm test --prefix POS_UI` | 0 | `ui-test-final-local.log` | 9/9 |
| `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build api ui` | 0 | `compose-final.log` | dựng API/UI cuối |
| `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml exec -T api npm test` | 0 | `api-test-final-local.log` | build và 6/6 với PostgreSQL |

DB chạy bằng `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml exec -T postgres psql -U pos_local -d pos_local -At -c "<SQL>"`; mỗi truy vấn exit 0, stdout giữ trong file. Không dùng truy vấn ghi.

| SQL/tình huống | Artifact → actual |
| --- | --- |
| `SELECT s.status, count(DISTINCT u.id) AS owners, count(rt.id) FILTER (WHERE rt.revoked_at IS NULL) AS sessions FROM stores s LEFT JOIN users u ON u.store_id=s.id LEFT JOIN refresh_tokens rt ON rt.user_id=u.id WHERE s.name='QA PB03 browser 20261029-2201' GROUP BY s.id` trước khóa/sau khóa/sau mở | `db-final-before-suspend.log` → `ACTIVE|2|0`; `db-final-after-suspend.log` → `SUSPENDED|2|0`; `db-final-after-reactivate.log` → `ACTIVE|2|0` |
| `SELECT (SELECT count(*) FROM stores WHERE name='QA PB03 final create 20261029-1421'), (SELECT count(*) FROM users WHERE username='qa_pb03_final_create_1421')` trước tạo | `db-final-before-create.log` → `0|0` |
| `SELECT (SELECT count(*) FROM stores WHERE name='QA PB03 final create 20261029-1421'), (SELECT count(*) FROM users WHERE username='qa_pb03_final_create_1421'), (SELECT count(*) FROM users u JOIN stores s ON s.id=u.store_id WHERE s.name='QA PB03 final create 20261029-1421' AND u.username='qa_pb03_final_create_1421' AND u.must_change_password=true)` sau tạo | `db-final-after-create.log` → `1|1|1` |
| `SELECT count(*) FROM stores WHERE name='QA PB03 duplicate final'` sau 409 | `db-final-after-duplicate.log` → `0` |

## Tiêu chí → tình huống → artifact

| ID | Expected → actual | Artifact |
| --- | --- | --- |
| PB03-01 | Tạo store/OWNER HTTP 201, DB `0|0→1|1|1`, response `temporaryPassword` đã che; đóng modal/reload không hiện mật khẩu. Username trùng HTTP 409 `USERNAME_EXISTS`, DB không tạo store. API test kiểm tra transaction/hash/field thừa. | `browser-final-create-before.yml`, `browser-final-create-after-redacted.yml`, `browser-final-create-response-redacted.txt`, `db-final-before-create.log`, `db-final-after-create.log`, `browser-final-after-close-secret.yml`, `browser-final-create-reload.yml`, `browser-final-duplicate-after.yml`, `browser-final-duplicate-response.txt`, `db-final-after-duplicate.log`, `api-test-final-local.log`, `POS_API/src/platform/platform.integration.test.ts` |
| PB03-02 | OWNER phải đổi password đầu tiên, sau đổi quay về login, đăng nhập lại không có nav nền tảng; GET `/api/v1/platform/stores` trả 403 `PERMISSION_DENIED`. Test API kiểm tra quyền và CSRF. | `browser-final-owner-forced-change.yml`, `browser-final-owner-after-change.yml`, `browser-final-owner-no-platform-nav.yml`, `browser-final-owner-denied.txt`, `browser-final-owner-denied.png`, `api-test-final-local.log` |
| PB03-03 | Khóa/mở HTTP 200, DB `ACTIVE|2|0 → SUSPENDED|2|0 → ACTIVE|2|0`, giữ nguyên hai OWNER. Test API xác minh thu hồi phiên và login mới sau mở; lượt browser/DB trước có phiên sống `1→0`. | `browser-final-suspend-before.yml`, `browser-final-suspend-after.yml`, `browser-final-suspend-request.txt`, `browser-final-suspend-response.txt`, `db-final-before-suspend.log`, `db-final-after-suspend.log`, `browser-final-reactivate-response.txt`, `browser-final-reactivate-after.yml`, `db-final-after-reactivate.log`, `api-test-final-local.log`; bổ trợ lượt cũ: `db-before-suspend.txt`, `db-after-suspend.txt`, `browser-owner-after-suspend.txt` |
| PB03-04 | Cấp OWNER HTTP 201, reset HTTP 200; password chỉ trong dialog/response lần đó, artifact đã che. Test API xác minh hash mới, mật khẩu cũ vô hiệu, thu hồi phiên. | `browser-final-add-owner-before.yml`, `browser-final-add-owner-after-redacted.yml`, `browser-final-add-owner-response-redacted.txt`, `browser-final-owners-list.yml`, `browser-final-reset-before.yml`, `browser-final-reset-after-redacted.yml`, `browser-final-reset-response-redacted.txt`, `api-test-final-local.log` |
| PB13-01 | UI cuối tại 1024×768: các thao tác trên, reload giữ dữ liệu, lỗi tiếng Việt. Password không ở URL/localStorage/sessionStorage; cookie JS chỉ thấy tên CSRF. Network method/path/status và response từng tình huống. UI test kiểm tra refresh 401/retry và clear phiên bị thu hồi. | `browser-final-tablet.png`, các snapshot `browser-final-*` nêu trên, `browser-final-storage-check.txt`, `browser-final-network-list.txt`, `ui-test-final-local.log` |
| PB03-05 | API 6/6, UI 9/9, build đạt. | `api-test-final-local.log`, `ui-test-final-local.log`, `ui-build-final-local.log`, `compose-final.log` |

**Giới hạn:** DB lượt cuối khi khóa có 0 refresh session đang hoạt động; hiệu ứng thu hồi phiên dựa vào test tích hợp và lượt browser/DB trước. Chưa có CI hoặc xác nhận Product Owner, nên ô nghiệm thu Sprint 2 giữ trống. Lượt Docker đầu thiếu `--env-file` thất bại; xem `errors/2026-10-29-compose-env-local.md`.

## Bổ sung theo finding QA (14:43–14:48 UTC, cùng mã/UI cuối)

- PB03-01/PB13-01: Playwright MCP lưu `browser-audit-create-before.yml`, `browser-audit-create-after-redacted.yml` và network gốc `browser-audit-network-after-create.txt` có `POST /api/v1/platform/stores → 201`. Lần trùng có `browser-audit-duplicate-before.yml`, `browser-audit-duplicate-after.yml`, `browser-audit-network-after-duplicate.txt` ghi `POST /api/v1/platform/stores → 409`. Response body của cùng hành vi đã lưu trong `browser-final-create-response-redacted.txt` và `browser-final-duplicate-response.txt`; hai lượt dùng dữ liệu QA khác nhau.
- PB03-03/PB13-01: tạo OWNER QA mới, đổi mật khẩu bắt buộc qua UI rồi đăng nhập lại. `browser-audit-owner-forced-change.yml`, `browser-audit-owner-after-change.yml`, `browser-audit-owner-session-before-suspend.yml` chứng minh phiên đang ở UI. Truy vấn SQL trạng thái/OWNER/refresh session ở bảng trên với tên store `QA PB03 audit 1444`, exit 0: `db-audit-before-suspend.log` = `ACTIVE|1|1`. Chạy `node qa-evidence/20261029-202132-53d794b/suspend-live-session.mjs` exit 0; stdout `api-audit-suspend-live.log` ghi POST suspend 200, API admin login/CSRF lấy trong bộ nhớ và không in cookie/token. Cùng SQL exit 0: `db-audit-after-suspend.log` = `SUSPENDED|1|0`. Reload tab OWNER: `browser-audit-owner-after-suspend.yml` trở về đăng nhập, `browser-audit-owner-network-after-suspend.txt` ghi `/auth/me` và `/auth/refresh` trả 401.
- BR-86/log: `docker logs --timestamps --tail 100 pos_api` exit 0, output gốc `api-audit-container.log` ghi action `store.create`/`owner.create`/`store.suspend`, actorId, targetId, requestId, method/path/status; không thấy body hay password trong các dòng hành động. `docker logs --since` của Docker Desktop trả output rỗng nên dùng `--tail 100`; đây là giới hạn thu log.
- Log bổ trợ lượt trước 13:55–13:57 UTC: `api-container.log` dòng 111 ghi `owner.reset_password`, dòng 136 ghi `store.reactivate` cùng actorId, targetId và requestId; artifact này được thu trước khi sửa UI retry phiên và không đại diện cho UI cuối. Không ghi password/token trong các dòng này.
- Console gốc Playwright: `browser-audit-console-initial.log`, `browser-audit-console-after-create.log`, `browser-audit-console-after-duplicate.log`, `browser-audit-console-all.log`. Một lỗi favicon.ico 404 không liên quan luồng; request trùng 409 và các request auth 401 sau thu hồi phiên là kết quả dự kiến. Không có exception JavaScript khác trong log này.

Giới hạn về phiên sống của lượt 14:15–14:24 ở trên đã được giải quyết bằng lượt 14:43–14:48. Cả hai lượt là local agent trên working tree dirty; chưa có CI/PO nghiệm thu.

## Bổ sung kiểm tra ranh giới ID (15:42 UTC)

Sau finding QA, bổ sung assertion vào `POS_API/src/platform/platform.integration.test.ts`: store ID sai định dạng trả 422, UUID store không tồn tại trả 404, reset UUID không tồn tại hoặc user không phải OWNER trả 404; tạo hai store, cấp OWNER đúng store thứ hai và đối chiếu DB; OWNER của store thứ nhất gọi cấp OWNER cho store thứ hai bị `403 PERMISSION_DENIED` và DB không tạo user. Test dùng DB thử riêng.

- Dựng lại API: `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build api`, exit 0.
- `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml exec -T api npm test`, exit 0, 6/6; output runner `api-test-boundaries.log`. Khoảng 15:42:19–15:42:37 UTC theo thời điểm ghi file được QA quan sát; không có timestamp bắt đầu độc lập trong output runner. Thay đổi sau browser cuối chỉ ở test, không đổi mã API/UI.
- QA độc lập đã đối chiếu assertion và output; đây là kiểm tra RBAC qua endpoint platform, chưa kiểm tra guard phạm vi store của các API vận hành chưa có.
- **Chưa xác minh:** các endpoint hóa đơn, ca, kho và doanh thu chưa được triển khai nên chưa thể gửi request thực tế để chứng minh `PLATFORM_ADMIN` bị từ chối đọc từng endpoint. Guard và test hiện tại chưa thay thế bằng chứng đó. Ô quyền PB-03 chưa đạt đầy đủ; chưa tick toàn bộ PB-03.

Ngày 29/10/2026 Product Owner yêu cầu tick các tiêu chí đủ chứng cứ; Sprint 2 ghi nghiệm thu một phần, ô quyền PB-03 vẫn để trống. Bằng chứng là local trên working tree dirty, không phải CI.
