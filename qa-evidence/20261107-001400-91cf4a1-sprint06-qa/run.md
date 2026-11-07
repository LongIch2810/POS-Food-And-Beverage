# Sprint 6 — lượt QA độc lập trên sandbox

- Nguồn tiêu chí: `sprints/sprint-06/SPRINT.md`, S6-01..S6-09; ma trận lập trước khi chạy: [matrix.md](matrix.md).
- Mã kiểm thử: `91cf4a11d41a0d7e53bd6759e6e08260219376d5`, nhánh `feat/pb07-open-orders`. Working tree **dirty** ở đầu và cuối; xem [git-status-before.txt](git-status-before.txt), [git-status-final.txt](git-status-final.txt). Nguồn chưa commit, nên SHA chỉ định danh commit nền; trạng thái dirty là một phần bản đang kiểm thử.
- Môi trường: Windows local, Node, Chromium 1024×768, API và UI chạy local. PostgreSQL **sandbox riêng** trong container `pos_pb07_test_pg`, chỉ bind `127.0.0.1:5433`; fixture DB ngẫu nhiên `pos_pb07_browser_*` do lượt này tạo. Đã xác nhận container, cổng và truy vấn fixture trước khi gọi API. Thông tin đăng nhập/chuỗi kết nối nằm trong `fixture.local.json` đã được ignore; không xuất giá trị. Không chạm production.
- Bản script QA lưu trong Git đã bỏ chuỗi kết nối literal; muốn chạy lại cần đặt `PB07_TEST_DB_BASE_URL` trỏ tới PostgreSQL sandbox đã xác nhận và cung cấp fixture cục bộ. Log và ảnh gốc của lượt chạy không thay đổi.
- Bắt đầu [start.txt](start.txt), kết thúc [end.txt](end.txt). Toàn bộ bằng chứng là **local do QA agent chạy**, không phải CI/runner độc lập. Chưa có URL/ID CI cho working tree dirty này.

## Lệnh runner và output gốc

| Lệnh | Thời gian, exit | Output |
| --- | --- | --- |
| `cd POS_API; npm test` với `NODE_ENV=test`, `DATABASE_URL` chỉ truyền trong process tới sandbox đã xác nhận | [start](backend-start.txt), [end](backend-end.txt), [exit 0](backend-exit.txt) | [backend-test.log.gz](backend-test.log.gz) là gzip lossless của stdout/stderr gốc 23 MB, kiểm byte và SHA tại [backend-log.sha256](backend-log.sha256); [danh sách 68 test](backend-test-list.txt), TAP 68 pass, 0 fail |
| `cd POS_UI; npm test` | [start](ui-start.txt), [end](ui-end.txt), [exit 0](ui-exit.txt) | [ui-test.log](ui-test.log), [danh sách 39 test](ui-test-list.txt), 39 pass, 0 fail |
| `cd POS_UI; npm run build` | [start](ui-build-start.txt), [end](ui-build-end.txt), [exit 0](ui-build-exit.txt) | [ui-build.log](ui-build.log) |

Backend test suite tự tạo/hủy DB thử riêng theo cấu hình test; fixture manual/browser là DB sandbox khác và vẫn giữ để đối chiếu. Các lệnh trên là lệnh đã cấu hình trong repo.

## API, DB và browser thủ công

Script dưới đây là **harness QA trong thư mục evidence**, không phải test mới được thêm vào source. Mỗi script ghi request/response đã che, request ID, và SELECT trước/sau khi có mutation. Lệnh chạy là `node <script.cjs>`, tại repo root; riêng server API khởi qua [launch-api.cjs](launch-api.cjs) có assert DB fixture/host/container trước spawn, UI qua `cd POS_UI; npm run dev`. [api-server.log](api-server.log), [vite-server.log](vite-server.log), [api-start.txt](api-start.txt), [vite-start.txt](vite-start.txt). API và UI đã dừng sau QA, cổng 3001/5173 không còn lắng nghe.

| Script | Exit | Artifact gốc |
| --- | --- | --- |
| `node fixture.cjs` | [0](fixture-exit.txt) | [fixture.log](fixture.log), [start](fixture-start.txt), [end](fixture-end.txt) |
| `node manual-api.cjs` retry | [0](manual-api-retry-exit.txt) | [manual-api-retry.log](manual-api-retry.log), [start](manual-api-retry-start.txt), [end](manual-api-retry-end.txt) |
| `node manual-reopen.cjs` | [0](manual-reopen-exit.txt) | [manual-reopen.log](manual-reopen.log), [start](manual-reopen-start.txt), [end](manual-reopen-end.txt) |
| `node manual-edge.cjs` retry | [0](manual-edge-retry-exit.txt) | [manual-edge-retry.log](manual-edge-retry.log), [start](manual-edge-retry-start.txt), [end](manual-edge-retry-end.txt) |
| `node manual-transfer.cjs` | [0](manual-transfer-exit.txt) | [manual-transfer.log](manual-transfer.log), [start](manual-transfer-start.txt), [end](manual-transfer-end.txt) |
| `node manual-scope.cjs` | [0](manual-scope-exit.txt) | [manual-scope.log](manual-scope.log), [start](manual-scope-start.txt), [end](manual-scope-end.txt) |
| `node manual-postcancel.cjs` | [0](manual-postcancel-exit.txt) | [manual-postcancel.log](manual-postcancel.log), [start](manual-postcancel-start.txt), [end](manual-postcancel-end.txt) |
| `node manual-extra.cjs` | [0](manual-extra-exit.txt) | [manual-extra.log](manual-extra.log), [start](manual-extra-start.txt), [end](manual-extra-end.txt) |
| `node manual-collision-rights.cjs` | [0](manual-collision-rights-exit.txt) | [manual-collision-rights.log](manual-collision-rights.log), [start](manual-collision-rights-start.txt), [end](manual-collision-rights-end.txt) |
| `node browser-flow-part1.cjs` | [0](browser-flow-part1-exit.txt) | [browser-flow-part1.log](browser-flow-part1.log), [network](browser-s6-network.json) |
| `node browser-flow-part2.cjs` retry | [0](browser-flow-part2-retry-exit.txt) | [browser-flow-part2-retry.log](browser-flow-part2-retry.log), [network](browser-s6-network-part2.json) |
| `node browser-table-probe.cjs` | [0](browser-table-probe-exit.txt) | [browser-table-probe.log](browser-table-probe.log), [screenshot](browser-s6-table-probe.png) |
| `node browser-flow-part3.cjs` | [0](browser-flow-part3-exit.txt) | [browser-flow-part3.log](browser-flow-part3.log), [network](browser-s6-network-part3.json) |
| `node browser-flow-part4.cjs` retry | [0](browser-flow-part4-retry-exit.txt) | [browser-flow-part4-retry.log](browser-flow-part4-retry.log), [network](browser-s6-network-part4.json) |
| `node browser-flow-part5.cjs` | [0](browser-flow-part5-exit.txt) | [browser-flow-part5.log](browser-flow-part5.log), [network](browser-s6-network-part5.json) |
| `node browser-loading-only.cjs` | [0](browser-loading-only-exit.txt) | [browser-loading-only.log](browser-loading-only.log), [loading snapshot](browser-s6-initial-loading.json), [network](browser-s6-initial-loading-network.json) |

Browser script có tệp `*-start/end/exit.txt` tương ứng. Ảnh/snapshot, network và SELECT DB trước/sau nằm cùng thư mục, được nối chi tiết theo từng S6 trong [report.md](report.md). Cookie artifact chỉ chứa metadata, không chứa token.

Các lần harness không dùng làm bằng chứng hành vi: [manual-api.log](manual-api.log) exit 1 vì script đầu yêu cầu scheme URL khác dù DB đúng; [manual-edge.log](manual-edge.log) exit 1 vì ca đã đóng trong kịch bản trước, sau đó mở lại ca bằng API. [browser-flow-part2.log](browser-flow-part2.log) exit 1 vì selector nhầm tab; [browser-flow-part4.log](browser-flow-part4.log) exit 1 vì harness chưa accept confirm; [browser-error-loading.log](browser-error-loading.log) và [browser-error-loading-retry.log](browser-error-loading-retry.log) exit 1 do timeout harness sau khi đã ghi snapshot. Giữ toàn bộ log, không diễn giải các lỗi harness thành lỗi sản phẩm; chỉ bản retry exit 0 được dùng cho kết luận liên quan.

SELECT cuối: [mã hóa đơn](db-final-codes.txt) (15 mã, 15 distinct, đúng pattern), [bàn còn OPEN](db-final-open-tables.txt) (không có), [unique index](db-final-code-index.txt). Các file là output truy vấn chỉ đọc trên fixture DB.

## Tái chạy

Xác nhận Docker container sandbox loopback trước; tạo fixture DB **mới** bằng `node fixture.cjs`, cấu hình process-only theo `launch-api.cjs`, rồi chạy các script trên. File `fixture.local.json` không đưa vào Git; phải dùng dữ liệu giả của sandbox riêng. Không dùng các lệnh này với DB khác.
