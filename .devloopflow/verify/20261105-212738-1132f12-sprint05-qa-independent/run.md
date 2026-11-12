# Ma trận bằng chứng trước khi chạy
- SHIFT-02 / Sprint ca CASHIER đầu tiên: browser-db-before.json, browser-gate-before.png, browser-shift-open.png, browser-network.json, browser-db-after.json.
- Sprint UI màn Ca làm và cổng bảo vệ: browser-after-login.png, browser-gate-before.png, browser-shift-open.png, browser-network.json.
- Sprint form tiền đầu ca chỉ đọc: browser-gate-before.png; cần đối chiếu ảnh và DOM/test nếu ảnh chưa chứng minh readonly.
- Sprint đóng ca đếm mù: browser-blind-before.png, browser-reconciliation.png, browser-network.json, browser-db-after.json.
- Sprint các tiêu chí khác: đối chiếu artifact raw backend/frontend riêng; chưa mặc định PASS.

Lượt browser độc lập 21:27:38–21:27:45 +07, exit 0; lệnh và SHA/dirty tại `browser-shift-meta.txt`, output gốc `browser-shift.log`. `npm test` backend trong `POS_API/` 21:28:16–21:30:14 +07, exit 0, 66/66; sau test SHIFT-09 chạy lại 21:31:18–21:33:24 +07, exit 0, 67/67. Output gốc nén nguyên văn `backend-test.log.gz` và `backend-test-after-overage.log.gz`, meta tương ứng. `npm test` frontend trong `POS_UI/` 21:28:16–21:28:18 +07, exit 0, 37/37; output `frontend-test.log`, meta tương ứng. Môi trường Windows PowerShell, Node 22, Chrome headless và PostgreSQL Docker local, DB browser riêng `pos_sprint05_browser_20261105`. Bằng chứng local do QA tự chạy; chưa có CI cho working tree dirty.

Đối soát từng tiêu chí và tình huống nằm tại [sprint05-criteria.md](sprint05-criteria.md). Lượt browser mở rộng độc lập sau đó tại `qa-evidence/20261105-213606-1132f12-sprint05-qa-browser-extended/` phát hiện FAIL S05-19/B09 (toast phiên A hiện trong phiên B); không nghiệm thu Sprint.
