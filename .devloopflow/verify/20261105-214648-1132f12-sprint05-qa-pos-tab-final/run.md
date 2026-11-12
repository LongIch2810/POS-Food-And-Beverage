# Ma trận trước khi chạy
- S05-18/BR-16: browser-pos-gate-before.png + browser-pos-after-open.png + browser-before-count-response.json + browser-network.json + DB trước/sau. Fixture pos.sell chỉ trong DB sandbox; POS content là mock.
- S05-19/BR-80: browser-menu-tab.png + browser-shifts-tab-return.png + browser-other-store.png + browser-network.json. Kiểm không lẫn ca/toast; loading/error hồi quy.
- B09 lỗi cũ errors/2026-11-05-toast-leak-between-sessions.md: browser-other-store.png không toast cũ.
- Hồi quy ca: gate tiền đầu ca, mở/đóng, đếm mù, DB trước/sau.

## Kết quả QA độc lập

- Lệnh: `node --env-file=POS_API/.env qa-evidence/20261105-214648-1132f12-sprint05-qa-pos-tab-final/browser-shift.cjs`, chạy từ gốc repo lúc 21:46:48–21:46:58 +07, exit 0. [Meta](evidence/browser-shift-meta.txt), [stdout/stderr gốc](evidence/browser-shift.log), SHA `1132f12a447058e6ace8cb8fb87dc6877763ee5d`, working tree dirty.
- Môi trường: Windows PowerShell, Node 22, Chrome headless 1280×800, API local PID 25228, DB thử `pos_sprint05_browser_20261105`. Trước chạy đã đọc toàn script, xác nhận API chỉ tới `127.0.0.1:3000`, pg trực tiếp ép DB thử; riêng fixture `pos.sell` ghi trong DB thử. Sau chạy, store ID QA có count [1 trong DB thử](evidence/db-store-test-count.txt), [0 trong `pos_local`](evidence/db-store-base-count.txt); quyền CASHIER `pos.sell` có count [1 trong DB thử](evidence/db-pos-permission-test-count.txt), [0 trong `pos_local`](evidence/db-pos-permission-base-count.txt). Đây là output truy vấn `psql` chỉ đọc được lưu ngay khi chạy. Không chạm production.
- Nội dung màn POS có banner dữ liệu mẫu, **không dùng để kết luận backend bán hàng**. Chỉ gate ca, `GET /work-shifts/current`, `POST /work-shifts` và trạng thái DB được dùng cho Sprint 05.

| ID / nguồn | Ban đầu → thao tác | Expected → actual | Trạng thái / artifact |
| --- | --- | --- | --- |
| S05-18 / Sprint 05:63, BR-16 | CASHIER sandbox được cấp `pos.sell`, chưa có ca → vào Bán hàng, xác nhận mở ca | Trước ca bị gate chặn; sau POST mở 201/current OPEN được vào khu POS → [gate trước](evidence/browser-pos-gate-before.png), [POS sau](evidence/browser-pos-after-open.png), [network](evidence/browser-network.json), [current OPEN](evidence/browser-before-count-response.json), [DB trước](evidence/browser-db-before.json) | PASS |
| S05-19a / Sprint 05:64 | CASHIER đã đóng ca → chuyển Ca làm → Thực đơn → Ca làm | Không đưa bảng ca vào tab Thực đơn và trở lại đúng ca CLOSED → [Thực đơn](evidence/browser-menu-tab.png) hiện từ chối quyền menu, không có ca; [Ca làm trở lại](evidence/browser-shifts-tab-return.png) hiện một ca CLOSED khớp DB | PASS |
| S05-19b / Sprint 05:64, BR-80, lỗi B09 | Sau ca A và lỗi mạng → logout, login OWNER store B | Không lẫn ca/toast phiên A → [store B](evidence/browser-other-store.png) trống và không toast; script assert DOM toast rỗng, network login mới | PASS |
| S05-19c / Sprint 05:64 | Ca đã đóng → trì hoãn rồi abort `GET current` khi Làm mới | Có spinner và lỗi mạng tiếng Việt, không báo thành công giả → [loading](evidence/browser-loading.png), [lỗi](evidence/browser-network-error.png), [network](evidence/browser-network.json) có NETWORK_FAILED | PASS |
| Hồi quy SHIFT-02/04, BR-55/58 | Branch mới → mở ca 100000, lấy current trước đếm, đóng đếm khớp | Tiền đầu ca chỉ đọc, expectedCash=null trước đếm, sau đóng MATCHED/100000 → [gate](evidence/browser-gate-before.png), [response](evidence/browser-before-count-response.json), [đối soát](evidence/browser-reconciliation.png), [DB trước](evidence/browser-db-before.json), [DB sau](evidence/browser-db-after.json) | PASS |

S05-19 tổng hợp **PASS** cho các vế tải, lỗi, tiếng Việt, chuyển tab và đổi phiên đã chạy. Bằng chứng local do QA tự thu; không có CI/runner độc lập cho working tree dirty. Lệnh tái chạy: lệnh browser trên sau khi xác nhận DB sandbox và `POS_API/npm test`, `POS_UI/npm test` ở các lượt QA trước.
