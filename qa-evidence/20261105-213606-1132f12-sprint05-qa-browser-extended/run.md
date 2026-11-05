# Trước khi chạy: tiêu chí -> artifact
- BR-58 đếm mù: browser-before-count-response.json, browser-blind-before.png, browser-reconciliation.png.
- UI tải và lỗi mạng: browser-loading.png, browser-network-error.png, browser-network-error-text.txt, browser-network.json.
- Cô lập phiên/store: browser-other-store.png và network login/current.
- Ca mở/đóng: DB trước/sau, network, screenshot.

## Lần chạy

- Lệnh: `node --env-file=POS_API/.env qa-evidence/20261105-213606-1132f12-sprint05-qa-browser-extended/browser-shift.cjs` từ gốc repo; 21:36:06–21:36:16 +07, exit 0. Xem [meta](browser-shift-meta.txt) và [stdout/stderr gốc](browser-shift.log).
- SHA: `1132f12a447058e6ace8cb8fb87dc6877763ee5d`; working tree dirty. Windows PowerShell, Node 22, Chrome headless 1280×800, PostgreSQL Docker local, DB riêng `pos_sprint05_browser_20261105`. Trước/sau chạy, store ID QA chỉ có trong DB riêng (count 1), `pos_local` count 0. Dữ liệu đều giả.
- Browser API mở ca 201, đóng ca 200, sau đó [DB trước](browser-db-before.json) không có ca và [DB sau](browser-db-after.json) một ca CASHIER CLOSED/MATCHED với countedCash = expectedCash = 100000. [Network](browser-network.json) ghi method/path/status, không ghi cookie/token.

## Tình huống và kết luận

| ID / nguồn | Điều kiện, thao tác | Expected → actual | Trạng thái / artifact |
| --- | --- | --- | --- |
| B05 / `specs/shifts.md` SHIFT-02, Sprint:43-46 | Branch mới, CASHIER chưa có ca; mở ca | OpeningCash hệ thống 100000, reconciliation PENDING → [response trước đếm](browser-before-count-response.json) có đúng các trường, [gate](browser-gate-before.png) chỉ đọc | PASS |
| B06 / `docs/BUSINESS_RULES.md` BR-58, Sprint:51 | Ca CASHIER OPEN; lấy current trước nhập tiền, mở modal đếm mù | expectedCash không gửi trước đếm → JSON `expectedCash: null`, [ảnh modal](browser-blind-before.png) không hiển thị số kỳ vọng | PASS |
| B07 / Sprint:64 | Ca đã đóng; làm mới khi GET current bị giữ 1,2 giây | Trạng thái tải rõ → [ảnh loading](browser-loading.png) có spinner và nút disabled | PASS |
| B08 / Sprint:64 | Ca đã đóng; làm mới khi GET current bị abort | Lỗi mạng hiển thị tiếng Việt, không nhận thành công giả → [ảnh lỗi](browser-network-error.png), [text gốc](browser-network-error-text.txt), [network](browser-network.json) có NETWORK_FAILED | PASS |
| B09 / Sprint:64, BR-80 | Sau B08, logout CASHIER store A, login OWNER store B và mở màn Ca làm | Không có dữ liệu ca hoặc thông báo cũ của store A → [ảnh store B](browser-other-store.png) có danh sách ca trống nhưng vẫn hiển thị ba toast từ store A | FAIL |

## Lỗi cần retest

**B09 — mức độ cao (trộn trạng thái giữa phiên/store).** Bước tái hiện: chạy `browser-shift.cjs` trên sandbox; sau mở/đóng ca và lỗi mạng, logout CASHIER rồi login OWNER của store khác; vào Ca làm trước khi toast tự hết. Expected: thông báo của phiên A được xóa khi logout/đổi phiên. Actual: toast “Mở ca thu ngân thành công”, “Đóng ca thu ngân và đối soát thành công”, và thông báo lỗi mạng cũ vẫn hiện trong phiên store B. [Ảnh gốc](browser-other-store.png) cho thấy tên QA Other Owner đồng thời với toast cũ; [script](browser-shift.cjs) lưu chuỗi thao tác. Mã liên quan: BR-80, Sprint:64. Script exit 0 vì chưa assert việc xóa toast, do đó exit 0 không phải bằng chứng PASS cho B09. Cần agent chính tạo mã lỗi trong `errors/`, tái hiện độc lập, sửa, rồi QA chạy lại B09 cùng hồi quy B05-B08.
