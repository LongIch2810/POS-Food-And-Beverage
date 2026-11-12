# Ma trận trước khi chạy
- B09 / errors/2026-11-05-toast-leak-between-sessions.md: ảnh browser-other-store.png phải không còn toast CASHIER store A.
- Hồi quy B05-B08: gate/read-only, response trước đếm, DB trước/sau, loading, network error, browser-network.json.
- Mọi kết luận phải mở artifact gốc sau lượt chạy; exit code một mình không đủ.

## Kết quả tự chạy và đối chiếu

- Lệnh: `node --env-file=POS_API/.env qa-evidence/20261105-213954-1132f12-sprint05-qa-b09-retest/browser-shift.cjs` từ gốc repo, thời gian/exit/SHA/dirty tại [meta](evidence/browser-shift-meta.txt). Exit 0, [stdout/stderr gốc](evidence/browser-shift.log). Windows PowerShell, Node 22, Chrome headless 1280×800, API local PID 25228 và DB sandbox `pos_sprint05_browser_20261105`. Trước chạy đã đối chiếu store ID lượt cũ: count 1 ở DB thử, 0 ở `pos_local`; script đã đọc, pg chỉ SELECT và API local.
- So lỗi B09 trước fix: [ảnh cũ](../20261105-213606-1132f12-sprint05-qa-browser-extended/evidence/browser-other-store.png) có toast phiên A dưới OWNER store B. Sau fix [ảnh mới](evidence/browser-other-store.png) có OWNER store B, danh sách ca trống, không còn toast. Script đọc `.app-toast-container` và assert chuỗi rỗng.

| ID / nguồn | Điều kiện → thao tác | Expected → actual | Trạng thái / artifact |
| --- | --- | --- | --- |
| B09 / `errors/2026-11-05-toast-leak-between-sessions.md`, Sprint:64, BR-80 | CASHIER store A đã mở/đóng ca và thấy lỗi mạng → logout, login OWNER store B | Không còn toast/dữ liệu ca A → ảnh mới không toast, list trống; assert DOM rỗng | PASS — [ảnh](evidence/browser-other-store.png), [network](evidence/browser-network.json), [script](evidence/browser-shift.cjs) |
| B05 / spec SHIFT-02, Sprint:43-46 | Branch mới → CASHIER mở ca | OpeningCash 100000, PENDING và read-only → [gate](evidence/browser-gate-before.png), [response](evidence/browser-before-count-response.json) khớp | PASS |
| B06 / BR-58, Sprint:51 | Ca OPEN → GET current trước đếm, mở modal | expectedCash chưa lộ → response có `expectedCash: null`, modal chưa có tiền kỳ vọng | PASS — [response](evidence/browser-before-count-response.json), [modal](evidence/browser-blind-before.png) |
| B07 / Sprint:64 | Ca đã đóng → làm mới, trì hoãn GET current 1,2 giây | Có trạng thái tải → ảnh spinner và nút disabled | PASS — [ảnh](evidence/browser-loading.png) |
| B08 / Sprint:64 | Ca đã đóng → làm mới, abort GET current | Lỗi mạng tiếng Việt, không báo thành công giả → ảnh và text hiện thông báo phù hợp, network `NETWORK_FAILED` | PASS — [ảnh](evidence/browser-network-error.png), [text](evidence/browser-network-error-text.txt), [network](evidence/browser-network.json) |
| B04 / Sprint:51 | Ca OPEN → nhập countedCash 100000, đóng | MATCHED, DB expected=counted=100000 → POST close 200, ảnh đối soát và DB sau khớp | PASS — [ảnh](evidence/browser-reconciliation.png), [network](evidence/browser-network.json), [DB trước](evidence/browser-db-before.json), [DB sau](evidence/browser-db-after.json) |

Chỉ kết luận các vế đã có artifact. Riêng điều hướng cổng POS trước/sau mở ca và cô lập dữ liệu khi chuyển tab UI chưa nằm trong script này.

## Hồi quy test runner trên working tree sau fix

- Backend: `npm test` trong `POS_API/`, 21:40:34–21:42:48 +07, exit 0, 67/67, SHIFT-01..09 và BR-14 concurrency `ok`. [Output gốc nén nguyên văn](evidence/backend-test-final.log.gz), [meta](evidence/backend-test-final-meta.txt). Các assertion mới về wrong branch, openingCash gài, GET current và PATCH ca CLOSED nằm trong `POS_API/src/shifts/tests/shifts.integration.test.ts` đã đối chiếu trước khi kết luận.
- Frontend: `npm test` trong `POS_UI/`, 21:40:34–21:40:37 +07, exit 0, 37/37. [Output gốc](evidence/frontend-test-final.log), [meta](evidence/frontend-test-final-meta.txt). Các test tab/session UI cũ cũng được chạy lại; riêng tab của luồng Ca làm chưa có artifact browser.
- Xác minh sau chạy: [db-safety-after.txt](evidence/db-safety-after.txt) ghi store ID QA có count 1 trong DB thử và 0 trong `pos_local`. Không có CI/runner độc lập cho working tree này.
- Bảng kết luận từng tiêu chí Sprint hiện tại: [sprint05-criteria.md](../20261105-212738-1132f12-sprint05-qa-independent/sprint05-criteria.md). Tổng thể **NOT VERIFIED** vì S05-18 và vế chuyển tab của S05-19 còn thiếu bằng chứng browser.
