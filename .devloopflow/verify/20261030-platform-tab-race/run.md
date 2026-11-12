# Sửa P2 reload mutation ghi đè cursor tab mới

Nguồn: local do agent chạy trên Windows/Node22, nhánh feat/pb03-platform, commit nền 53d794b, working tree dirty. Chưa CI độc lập, không thay đổi API/DB.

Matrix dự kiến đã ghi trước khi sửa/chạy trong tasks/active/2026-10-30-fix-platform-tab-race.md (sau hoàn thành chuyển completed): mutation chờ → chuyển Owners → OWNER list xong → mutation/Store reload cũ xong → Trang sau phải dùng OWNER cursor.

## Tái hiện và kiểm chứng

- `node --experimental-strip-types --test POS_UI/test/platform-screen-race.test.mjs` trước fix: exit1, output `red-reproduced.log`, actual STORE_RELOAD_CURSOR, expected OWNER_NEXT_CURSOR. `red.log` là lần harness đầu còn lỗi traversal, không dùng làm bằng chứng bug sản phẩm.
- Sau fix `npm test --prefix POS_UI`: exit0, 10/10; `ui-tests.log` có START/END UTC và TAP nguyên gốc, bao gồm regression test.
- `npm run build --prefix POS_UI`: exit0; `ui-build.log` có START/END UTC và output compiler/Vite.
- `git diff --check`: exit0, cảnh báo LF/CRLF ở file đã sửa từ trước.

Test transpile TSX screen hiện tại bằng TypeScript đã cài, điều khiển hooks/effect cleanup và service promises trong bộ nhớ, gọi các handler UI thật. Mô phỏng đúng thứ tự completion gây race; không gọi API thật hoặc ghi DB, không thêm dependency. Không phải browser E2E.

Sửa source: bỏ reload async riêng; một effect có cleanup sở hữu cập nhật data/cursor/loading/error, refresh chỉ tăng reloadVersion. Mutation cũ hoàn tất sau đổi tab kích hoạt tải context hiện hành thay vì áp response Store vào Owners.

Giới hạn: chưa chạy browser thật hoặc suite API trong lượt fix UI này. Output local dirty; review độc lập được ghi sau khi reviewer đối chiếu.

Code-reviewer /root/review_pb03_rework đã đọc source/test/log và xác nhận đóng finding P2, không thấy lỗi mới trong phần sửa. Reviewer không chạy lại runner/browser; không coi là CI độc lập.

## Matrix bổ sung trước browser retest (2026-10-30 02:59 UTC)

| Case | Expected | Artifact cần lưu |
| --- | --- | --- |
| B1 | Dựng UI source sau fix, hash source khớp container | compose log/hash |
| B2 | Mutation API thật bị giữ response; Owners load trước; thả response rồi Trang sau vẫn GET users cursor hợp lệ200, thẻ khớp response | browser output trước/sau/network |
| B3 | Chọn store ngoài20 option đầu, POST users storeId đúng; DB user tạo đúng target | browser output/network che password + DB trước/sau |
| B4 | Modal password trên UI cuối, X/Escape/Đóng trước/sau checkbox, reload không lưu secret; dữ liệu mới render sau mutation | browser output, ảnh mask toàn dòng |
| B5 | QA đối chiếu lại gap, kết luận từng tiêu chí | qa-acceptance-audit.md |

## Browser retest sau fix (03:00–03:02 UTC)

- B1: `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build ui` exit0; `compose-ui-retest.log` có START/END. `Get-FileHash -Algorithm SHA256 POS_UI/src/features/platform/PlatformAdminScreen.tsx` và `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml exec -T ui sha256sum /app/src/features/platform/PlatformAdminScreen.tsx` đều exit0; output `ui-source-hash.txt`/`ui-container-hash.txt` khớp SHA256 75ef00dd3fd5e6c0704c7290a88c0e237665e9f43ead44f97a6a629edbbb9117.
- B2: Playwright MCP `browser-real-api-race.txt` có UI trước/sau, viewport1024×768 và method/URL/status/body. UI khóa store QA thật rồi mở lại; route.fetch gửi POST reactivate thật, chỉ giữ việc giao response cho UI đến khi Owners load/render xong, sau đó fulfill nguyên response thật. GET Owners Trang sau trả200, cursor đúng metadata OWNER, toàn bộ thẻ khớp response (`correctCursor=true`, `renderMatches=true`). Không mock body/status API. Ảnh `browser-race-after.png`.
- B3/B4: `browser-owner-page2.txt` lưu20 option đầu, response GET cursor thêm store, target ngoài20 option đầu, thao tác selectOption, POST users201 với storeId target và response khớp. OWNER mới render sau mutation refresh. Modal X/Đóng disabled, Escape giữ, checkbox cho đóng; password không URL/storage và không hiển thị sau reload. Ảnh `browser-owner-page2-masked.png` mask toàn paragraph chứa password; tool output che secret trước ghi file.
- DB trước/sau chỉ đọc, mọi lệnh exit0, prefix `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml exec -T postgres psql -U pos_local -d pos_local -At -c "<SQL>"`:
  - `SELECT s.id,s.status,count(DISTINCT u.id) FROM stores s LEFT JOIN users u ON u.store_id=s.id WHERE s.name='QA rework browser 0205' GROUP BY s.id`: `db-before-race.txt` và `db-after-race.txt` cùng ACTIVE|2, target c50e057a-9d72-4711-a482-f702f646e5ca; response browser ghi SUSPENDED rồi ACTIVE ở giữa.
  - `SELECT count(*) FROM users WHERE username='qa_postfix_owner_0302'`: `db-before-owner-page2.txt`=0.
  - `SELECT u.username,u.store_id,s.name,u.must_change_password FROM users u JOIN stores s ON s.id=u.store_id WHERE u.username='qa_postfix_owner_0302'`: `db-after-owner-page2.txt` gán đúng store669d5244-2278-46aa-aeca-5357b42d9717, flag true, khớp target trong output browser.
- `docker logs --timestamps --tail 100 pos_api` exit0: `api-browser-retest.log` có log action và requestId của lượt mới. Console gốc Playwright `browser-retest-console.txt` thu sau reload cuối.
- QA tự chạy UI suite10/10 trong `qa-ui-tests.log`; đây là lần local do QA chạy, không phải CI/runner độc lập. Backend không thay đổi từ lượt7/7 trước.

### Bổ sung lỗi refresh sau mutation và Thử lại

Theo yêu cầu rà tiếp của QA: `browser-reload-error-retry.txt` thực hiện POST reset password thật200 rồi **mô phỏng rõ ràng một GET danh sách lỗi503**. UI vẫn giữ dialog mật khẩu một lần (`passwordRetained=true`), hiển thị lỗi danh sách riêng; sau checkbox đóng dialog, bấm Thử lại gọi GET API thật200 và render danh sách đúng. Không coi503 mô phỏng là lỗi backend thực. Ảnh mask toàn dòng: `browser-retry-password-masked.png`.

DB readonly trước/sau, prefix psql như trên, SQL `SELECT id,must_change_password,updated_at FROM users WHERE username='qa_postfix_owner_0302'`, exit0: `db-before-retry-reset.txt`/`db-after-retry-reset.txt` ghi đúng user, flag true và updated_at đổi sau reset. Không thu hash/mật khẩu. Console bổ sung nếu có503 là kết quả mô phỏng dự kiến; console0error trước đó ở `browser-retest-console.txt` thuộc lượt trước tình huống này.

## Kết luận QA nghiệm thu

Xem `qa-acceptance-audit.md`: QA đã đóng gap UI cuối/chọn store trang sau/refresh lỗi-retry và kết luận đủ chứng cứ local cho các tiêu chí PB03/PB13 trong phạm vi mới chốt. QA tự chạy UI10/10 và đối chiếu source/artifact browser/API/DB của agent chính. Chưa phải CI độc lập; Product Owner quyết định nghiệm thu riêng.

Ngày30/10/2026, sau kết luận QA cuối, Product Owner yêu cầu nghiệm thu các tiêu chí đủ chứng cứ. Sprint2 đã ghi chấp nhận4/4 tiêu chí PB03 và3/3 tiêu chí UI platform trong phạm vi local đã chốt, giữ nguyên giới hạn và các phần hoãn.
