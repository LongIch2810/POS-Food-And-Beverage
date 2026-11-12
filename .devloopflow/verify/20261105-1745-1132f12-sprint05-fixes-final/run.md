# Sprint 05 review fixes — local verification

- Nhãn: **local do agent chạy**; chưa có CI/runner độc lập.
- Commit nền: `1132f12` (`feat/pb06-shifts`); working tree **dirty** gồm mã sửa task này, test, `AGENTS.md` đã dirty trước task và các file evidence/task. Không có commit mới.
- Môi trường: Windows, PowerShell, Node `v22.22.2`; PostgreSQL 17 qua Docker Compose, container `pos_infra-postgres-1` healthy trên `127.0.0.1:5432`.
- Lệnh ở `POS_UI`: `npm test`; bắt đầu `2026-11-05T17:41:46.9693458+07:00`, kết thúc `17:41:50.4993179+07:00`, exit `0`, **37/37 test**. Output gốc trên UI cuối: [frontend-test-final.log](evidence/frontend-test-final.log); timestamp/exit: [frontend-test-final-meta.txt](evidence/frontend-test-final-meta.txt). Lượt trước khi chỉnh badge AppShell: [frontend-test.log](evidence/frontend-test.log).
- Lệnh ở `POS_UI`: `npm run build`; bắt đầu `2026-11-05T17:41:46.9726983+07:00`, kết thúc `17:42:00.5024400+07:00`, exit `0`. Output gốc trên UI cuối: [frontend-build-final.log](evidence/frontend-build-final.log); timestamp/exit: [frontend-build-final-meta.txt](evidence/frontend-build-final-meta.txt). Lượt trước khi chỉnh badge: [frontend-build.log](evidence/frontend-build.log).
- Lệnh ở `POS_API`: `node --env-file-if-exists=.env --test dist/shifts/tests/shifts.integration.test.js`; bắt đầu `2026-11-05T17:40:03.4012158+07:00`, kết thúc `17:40:19.7584774+07:00`, exit `0`, **10/10 test**. Output gốc: [backend-shifts-test.log](evidence/backend-shifts-test.log); timestamp/exit: [backend-shifts-test-meta.txt](evidence/backend-shifts-test-meta.txt). `dist` được tạo từ `npm run build` exit 0 trong [lượt đầu](../20261105-1728-1132f12-sprint05-fixes/evidence/backend-rebuild.log).

| Tiêu chí review | Tình huống | Artifact |
| --- | --- | --- |
| CASHIER thấy và vào trang Ca làm theo quyền mới | PB13-NAV | `frontend-test-final.log` |
| Gate lấy branch thật, mở ca OWNER đúng branch | BR-71 OWNER open | `frontend-test-final.log` |
| POS lấy ca hiện tại từ API và tải lại sau mở ca | BR-16 POS gate | `frontend-test-final.log` |
| OWNER check-in STAFF với branch chọn | BR-71 OWNER STAFF | `frontend-test-final.log` |
| PATCH branch bỏ `initialCash` không đổi, khóa field sau ca đầu | PB13-BR55 | `frontend-test-final.log` |
| Giữ kết quả đối soát tới khi người dùng đóng | BR-58 | `frontend-test-final.log` |
| Force-close reason/note mỗi trường dài 255 ký tự | SHIFT-07 | `backend-shifts-test.log` |
| Hai yêu cầu OWNER mở ca ở hai branch cùng lúc | BR-14 | `backend-shifts-test.log` |

Giới hạn: đây là test tự động local, không phải kiểm thử browser hoặc CI độc lập. Có thể tái chạy bằng ba lệnh trên với PostgreSQL local đang hoạt động.
