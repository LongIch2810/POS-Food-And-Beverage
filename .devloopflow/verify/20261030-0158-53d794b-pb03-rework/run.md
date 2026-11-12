# PB-03 làm lại — local

Trạng thái: kiểm tra local đã chạy; QA đối chiếu cuối tại `../20261030-platform-tab-race/qa-acceptance-audit.md`; Product Owner đã nghiệm thu phạm vi local trong `sprints/sprint-02/SPRINT.md` ngày 30/10/2026.

- Nhánh feat/pb03-platform, commit nền 53d794b; working tree dirty. Mã thay đổi chưa commit, SHA nền không phải phiên bản PB-03 mới.
- Windows, Node 22, Docker PostgreSQL 17; compose với POS_INFRA/.env.local. Chỉ dùng dữ liệu QA.
- Nguồn: local do agent chạy; QA đối chiếu riêng, chưa phải CI độc lập.
- Thời điểm chuẩn bị 2026-10-30 01:58 UTC. Lệnh bắt đầu/kết thúc và exit lưu cùng output khi chạy.

## Matrix trước chạy

| Case | Expected | Artifact cần lưu |
| --- | --- | --- |
| R1 | cursor/meta, nhiều trang không lặp, microseconds, invalid/scope mismatch 422 | API/unit output + assertions |
| R2 | context platform/store + permission hiện hành; auth regression | API integration output |
| R3 | create/cấp/reset/khóa/mở đúng spec, rollback và session revoke | API integration output + browser/network/DB |
| R4 | UI cursor trước/sau/tab, chọn store trang sau | browser snapshot/network |
| R5 | checkbox mới cho đóng password dialog; X/Escape bị chặn trước xác nhận; secret không storage | browser output che secret, ảnh/metadata |
| R6 | UI build/test, API build | runner logs |

Các artifact lượt trước không thay cho hành vi mới. Kết quả cập nhật sau khi chạy.

## Kết quả và lệnh cuối

- API: `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml exec -T api npm test` exit 0, 7/7; `api-verified.log` UTF-8 có START/END (kết thúc 02:11:11 UTC), build API trong lệnh test. Trước đó copy duy nhất test mới vào container bằng `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml cp POS_API/src/platform/platform.integration.test.ts api:/app/src/platform/platform.integration.test.ts`; runtime code đã dựng từ `compose-latest.log`.
- UI test: `npm test --prefix POS_UI` exit 0, 9/9; `ui-final.log` UTF-8 có START/END. Sau lượt đó chỉ thay screen và DTO/API test, không sửa service UI được test.
- UI build: `npm run build --prefix POS_UI` exit 0; `ui-build-latest.log` UTF-8 có START/END, kết thúc 02:09:30 UTC.
- Dựng container: `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build api ui`, exit 0; `compose-latest.log`.
- `git diff --check` exit 0, chỉ cảnh báo LF/CRLF.
- Browser Playwright MCP http://localhost:5173, viewport 1024×768 CSS px; tool output gốc được lưu trong các file browser*.txt, response password che ngay khi thu, không lưu cookie/token.

| Case | Actual | Artifact cụ thể |
| --- | --- | --- |
| R1 | 7/7 gồm keyset PostgreSQL trùng .123456, chèn store giữa trang, cursor khác scope/invalid 422, limit cap100 | `api-verified.log`, assertions `POS_API/src/platform/platform.integration.test.ts`, `platform.pagination.test.ts` |
| R2 | OWNER được cấp nhầm user.create_owner và MANAGER/CASHIER được cấp nhầm store.read vẫn 403 PERMISSION_DENIED; admin thiếu quyền hoặc có nhầm pos.sell bị chặn | `api-verified.log`, integration platform/auth |
| R3 | create 201; cấp OWNER201; reset200; suspend/reactivate200, reload trạng thái đúng; test tích hợp kiểm tra rollback/concurrent duplicate/hash/password cũ/thu hồi nhiều phiên | `browser-password-final.txt`, `browser-add-reset.txt`, `browser-suspend.txt`, `browser-reactivate.txt`, `api-verified.log` |
| R4 | Trang2 chờ GET cursor và kiểm tra danh sách thẻ trùng response; quay trang1; tab về trang1; bộ chọn store 20→22 options qua cursor; nav sidebar cũng reset | `browser-page2-verified.txt` chứng minh data trang2; `browser-paging-final.txt` chỉ dùng cho picker20→22; `browser-latest.txt` cho nav reset; `browser-fixtures.txt` (17 store QA qua API thật) |
| R5 | X và Đóng disabled trước checkbox; Escape giữ dialog; sau check đóng được; password không URL/storage và không hiện sau reload | `browser-password-final.txt`, `browser-password-masked.png`; xác nhận lại code UI cuối `browser-latest.txt`, `browser-password-latest.png` |
| R6 | API7/7, UI9/9, UI/API build đạt | `api-verified.log`, `ui-final.log`, `ui-build-latest.log` |

DB chỉ đọc, mỗi lệnh exit0, prefix `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml exec -T postgres psql -U pos_local -d pos_local -At -c "<SQL>"`:

- `SELECT count(*) FROM stores WHERE name='QA rework browser 0205'`: `db-before-create.txt` = 0.
- `SELECT s.name,s.status,u.username,u.must_change_password FROM stores s JOIN users u ON u.store_id=s.id WHERE s.name='QA rework browser 0205'`: `db-after-create.txt` có store ACTIVE, username đúng, flag true.
- `SELECT s.status,count(DISTINCT u.id),count(rt.id) FILTER (WHERE rt.revoked_at IS NULL) FROM stores s LEFT JOIN users u ON u.store_id=s.id LEFT JOIN refresh_tokens rt ON rt.user_id=u.id WHERE s.name='QA rework browser 0205' GROUP BY s.id`: `db-before-suspend.txt` ACTIVE|2|0 → `db-after-suspend.txt` SUSPENDED|2|0 → `db-after-reactivate.txt` ACTIVE|2|0. Lượt browser không có session OWNER sống; hiệu ứng thu hồi nhiều phiên được xác minh ở integration test trên DB thử, không suy diễn từ ba file DB này.
- Log API gốc: `docker logs --timestamps --tail 350 pos_api` exit0, `api-container-final.log`; có action/actor/target/requestId không raw password/token. Reset được chạy lại ở browser-latest sau lần thu log, các lần reset trước vẫn có trong log.
- Console final `browser-console-final.txt`: 0 error ở lượt thu, không exception UI.

## Lượt thất bại và giới hạn

`api-tests.log`/`ui-tests.log` bị trộn encoding do PowerShell; thay bằng log UTF-8 cuối nêu trên. `api-latest.log` exit1 vì SQL fixture test dùng một tham số cho hai varchar khác độ dài; đã cast text, chạy lại `api-verified.log` đạt. `browser-flow.txt` là lần script dừng do selector Cửa hàng khớp hai nút; chạy lại với scope main trong `browser-paging-final.txt` và các output sau. Không dùng các artifact thất bại để báo đạt.

UI trước sửa effect nav/DTO đã có các output create/cấp/khóa/mở; code cuối kiểm tra lại sidebar paging và reset/modal trong `browser-latest.txt`, ảnh `browser-tablet-latest.png`. Sau browser cuối chỉ sửa fixture test và ví dụ spec, không đổi runtime code.

Bổ sung QA: `browser-page2-verified.txt` chờ response cursor và thẻ đầu của trang2, đối chiếu toàn bộ tên thẻ với response (`page2Matches=true`), ghi method/URL/status/body và nội dung trước/sau/quay lại. Output pageTwo trong các script trước lấy ngay khi nhãn trang đổi, nên không dùng nó để chứng minh nội dung trang2.

Hai ảnh password được chụp lại trên UI cuối, mask **toàn paragraph** chứa mật khẩu vì mask strong trước có thể hở mép chữ. `browser-redaction-confirmed.txt` ghi thao tác chụp lại; `browser-password-latest.png` và `browser-password-masked.png` hiện đều là ảnh đã che toàn dòng, không dùng ảnh cũ để suy ra secret. Lượt này thực hiện reset thêm trên tài khoản QA, không đổi runtime code.

Kiểm tra HTTP trên API hóa đơn/ca/kho/doanh thu chưa có được hoãn theo quyết định Product Owner ngày 30/10; test context không được gọi là kiểm chứng API vận hành thật. Bằng chứng local trên working tree dirty, chưa có CI độc lập.

QA cuối: xem qa-audit.md, mọi finding đã báo được đóng và R1–R6 có dấu vết local theo phạm vi mới. QA rà source/artifact, không chạy lại runner/browser và không thay Product Owner quyết định nghiệm thu.
