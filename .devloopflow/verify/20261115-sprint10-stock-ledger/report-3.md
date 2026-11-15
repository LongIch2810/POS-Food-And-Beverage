# Kiểm AC report 20261115-sprint10-stock-ledger — vòng 3

## Kết luận
PASS trong phạm vi kiểm lại.

- Ngày: 2026-11-16 (Asia/Ho_Chi_Minh); raw evidence ghi UTC từ 2026-11-15T19:21Z tới 19:27Z.
- Plan đối chiếu: `.devloopflow/approved/20261115-sprint10-stock-ledger.md`; bản tiến độ `.devloopflow/plans/active/20261115-sprint10-stock-ledger.md`.
- Spec đối chiếu: `.devloopflow/specs/20261115-sprint10-stock-ledger.md`.
- Kiểm lại CHỈ ST-6.AC-11, ST-10.AC-2, ST-10.AC-5 và exploratory B-65 sau sửa. Cả ba AC Đúng; hai tình huống dialog Kho Đúng.
- 77 AC còn lại không chạy lại, giữ kết quả mới nhất trong report-1/report-2. Không có FAIL mới, không mở lại V1-1/V1-2. Đây không phải QA toàn sprint hay toàn bộ hồi quy.
- Đổi phiên trên API/DB thật chưa kiểm trong vòng này do không có mật khẩu fixture. Không thay, đoán hoặc ghi mật khẩu. ST-10.AC-5 có browser thật và fetch giả đúng tầng kiểm được duyệt; E2E-AC-9 không chạy lại.

## Tài liệu nguồn đã đối chiếu
- `docs/PRODUCT_OVERVIEW.md`: mục 1–4, 6.4, 8, 10–11; phạm vi kho, cô lập dữ liệu, tiếng Việt và tablet.
- `docs/BUSINESS_RULES.md:70–72,185–188`: BR-71/71b và sổ kho chỉ thêm.
- `docs/DESIGN_DB_POS_SYSTEM.md:90–91`: tồn theo chi nhánh, sổ kho gắn chi nhánh/nguyên liệu/hóa đơn. Không ghi dữ liệu kinh doanh trong vòng này.
- `docs/api-spec.md:16–42`: GET chỉ đọc, base path và quy ước API; không thay endpoint.
- `DESIGN.md:33,141,362,515`: viewport tablet, ngôn ngữ Kho, hộp thoại.
- `sprints/sprint-10/SPRINT.md:42`: S10-11 reload/đổi phiên không lộ dữ liệu cũ. Cổng QA sprint này không được đánh dấu từ kết quả ba ST AC.
- Approved plan, active plan, spec và task `20261115-sprint10-stock-ledger`: ST-6/ST-10, lịch sử sửa B-65, sai khác harness đã ghi ở ST-10.
- `.devloopflow/MEMORY.md`: M-11, M-13, M-28, M-32, M-38, M-39, M-47 theo phạm vi; không nghiệm thu lại các bài học ngoài ba AC.
- `.devloopflow/errors/INDEX.md` và bảy hồ sơ sửa của task liệt kê bên dưới.
- `report-1.md`, `report-2.md`, `fails.md` tại cùng thư mục verify: đọc kết quả trước và giữ lịch sử.
- `rules/testing.md`; source/test hiện tại được ghi hash ở `evidence/r3-source-audit.json`.
- Đã đọc hướng dẫn role, quy trình và hai template verify-ac qua đường dẫn tuyệt đối được giao. Áp dụng Caveman cho hội thoại; hồ sơ giữ văn bản đầy đủ. Ponytail dùng cho phạm vi nhỏ, không sửa source.

## Môi trường
- Trước lượt kiểm, Compose đang chạy: UI 5173, API 3000 healthy, PostgreSQL 5432 healthy. Không tạo app/DB mới cho lượt live.
- Image UI ban đầu chứa InventoryScreen hash `dca5effbbb22adebe603f4decf7522909c16d1b87124329bbd9d5702a6e1c7ca`, khác working tree sau B-65. Không dùng trạng thái đó để nghiệm thu B-65.
- Đã chạy `docker compose --env-file POS_INFRA/.env.local -f POS_INFRA/compose.local.yml up -d --build --wait --no-deps ui`, exit 0; UI recreated/healthy. Chỉ rebuild UI; API/DB không bị tái tạo. Compose cảnh báo volume label đang có khác tên mặc định và đã để nguyên volume.
- Sau rebuild, container `/app/src/features/inventory/InventoryScreen.tsx` và working tree cùng SHA256 `ebaa6cbcf25bb5d3a1982311742d1f0dd6b5bb2d7068fb610aad34c8d510574f`; `evidence/r3-deployed-hash.log`.
- MCP Playwright hoạt động; live UI/API tại `http://localhost:5173`, viewport 1024×768, dùng phiên OWNER thử đã có sẵn. Chỉ mở/đóng dialog, không submit.
- ST-10 CLI dùng Chrome headless, App/router/AuthContext/client và CSS thật; fetch giả theo plan. MCP bổ sung ST-10.AC-5 dùng context riêng, cùng nguyên fixture `installFakeApi`/users/permissions từ file test hiện hành, phục vụ mã UI đã rebuild.
- Đã đóng context giả lập sau kiểm; CLI tự đóng browser/server. Không đăng xuất phiên OWNER có sẵn; không đổi tài khoản, mật khẩu, branch, nguyên liệu hoặc ngưỡng tồn trong DB thật. Compose vốn có sẵn nên giữ chạy.
- Có marker `graphify-out/needs_update`; không dùng graph cũ, không xóa marker, không ghi ngoài vùng QA được giao. Agent chính làm semantic update sau khi nhận report/fails.

## Kết quả test
| Lệnh/bước đã chạy | Kết quả | Chứng cứ |
|---|---|---|
| POS_UI: `node --test --experimental-strip-types --test-name-pattern='ST6_AC11\|B-65' test/inventory-screen.test.mjs` | exit 0; 3 pass, 0 fail, 0 skip | evidence/r3-unit-test.log |
| POS_UI: `node --test --test-name-pattern='ST-10.AC-2\|ST-10.AC-5' test/stock-ledger-router.browser.mjs` | exit 0; 2 pass, 0 fail, 0 skip | evidence/r3-browser-test.log |
| POS_UI: `npm run build` | exit 0; typecheck và Vite build thành công; 2015 modules | evidence/r3-build.log |
| MCP app/API thật: Tồn kho rồi Back Sổ kho | Đúng URL và tab active | evidence/r3-live-dialog.json, r3-ST10AC2-back.png |
| MCP app/API thật: Thêm nguyên liệu rồi Back/Forward; Đặt ngưỡng tồn rồi Back/Forward | Dialog 1 trước, 0 sau đổi tab và 0 khi quay lại; không submit | evidence/r3-live-dialog.json, r3-B65-*.png |
| MCP App/router/client thật + fetch giả theo ST-10: owner logout, cashier login, Back | pathname /ban-hang/thuc-don; không mã hóa đơn hay tên chi nhánh của owner; không pageerror | evidence/r3-ST10AC5-mcp.json, r3-ST10AC5-*.png |

- Không chạy lại toàn bộ `npm test` UI/API, toàn bộ browser, audit hoặc API build: ngoài phạm vi kiểm lại ba AC; không nhận số pass lịch sử làm kết quả chạy mới.
- Console live có favicon 404 và hai lỗi websocket HMR khi UI container được rebuild. Không gọi console hoàn toàn sạch; sau rebuild các GET Kho liên quan có status 200. `evidence/r3-console.log`, `r3-network.log` chứa cả lịch sử phiên MCP; các request Kho của lượt cuối ở mục 278–292, không coi request cũ là lượt kiểm mới.

## Coverage
- Không có script/ngưỡng coverage trong package dự án; không chạy lệnh tự đặt và không báo tỷ lệ.
- Chỉ chọn test bằng tên rõ ràng, không tăng phạm vi kiểm lại từ số test của build hay lịch sử.

## Đã đối chiếu errors
- Đọc task lịch sử review và INDEX: bảy finding đã sửa tương ứng bảy file, đều có Triệu chứng, Nguyên nhân gốc, Cách fix (file/test/kết quả), Quy tắc phòng tránh, Dấu hiệu nhận biết. Nội dung đầy đủ và hash source trong `evidence/r3-source-audit.json`.
  1. R1-1: `.devloopflow/errors/20261115-settings-back-leaves-editor-open.md`.
  2. B-60: `.devloopflow/errors/20261115-browser-router-fixed-wait.md`.
  3. B-61: `.devloopflow/errors/20261115-products-tabs-missing-aria-current.md`.
  4. B-62: `.devloopflow/errors/20261115-inventory-catalog-reloads-on-branch-change.md`.
  5. B-63: `.devloopflow/errors/20261115-rail-and-routes-disagree-on-permissions.md`.
  6. B-64: `.devloopflow/errors/20261115-pos-open-table-stale-navigation-callback.md`.
  7. B-65: `.devloopflow/errors/20261116-inventory-dialog-persists-after-tab-change.md`.
- Không phát hiện finding đã sửa trong task thiếu hồ sơ errors/. V1-1 sửa tên fixture và V1-2 cập nhật tài liệu có lý do không ghi lỗi source trong task/sổ FAIL; giữ lý do đó.
- B-66/B-67 là Low còn ở backlog, chưa được ghi đã sửa; không yêu cầu errors/ cho sửa chưa thực hiện. Không sửa hoặc đóng hai mục này.
- Chạy lại đúng tình huống B-65 bằng unit và MCP; B-60 liên quan cách chờ URL/DOM được áp dụng vào lượt MCP cuối. Những kịch bản lỗi cũ khác ngoài phạm vi ba AC không chạy lại.

## Bảng đối chiếu (MỌI AC trong plan, không bỏ AC nào)
| AC | Cách kiểm | Lệnh/bước đã chạy | Kết quả thật (nguyên văn hoặc path bằng chứng) | Mong đợi theo plan | Quy định trong tài liệu (nguyên văn + path:dòng) | Kết luận (Đúng / Sai / Lệch tài liệu / Tài liệu không quy định) | Ghi chú chỗ lệch |
|----|-----------|-------------------|-----------------------------------------------|--------------------|--------------------------------------------------|----------------------------------------------------------------|------------------|
| ST-1.AC-1 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-1.AC-2 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-1.AC-3 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-1.AC-4 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-1.AC-5 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-1.AC-6 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-1.AC-7 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-2.AC-1 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-2.AC-2 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-2.AC-3 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-2.AC-4 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-2.AC-5 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-3.AC-1 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-3.AC-2 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-3.AC-3 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-3.AC-4 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-3.AC-5 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-4.AC-1 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-4.AC-2 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-4.AC-3 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-5.AC-1 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-5.AC-2 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-5.AC-3 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-5.AC-4 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-5.AC-5 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-5.AC-6 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-5.AC-7 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-5.AC-8 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-1 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-2 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-3 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-4 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-5 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-6 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-7 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-8 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-9 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-10 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-11 | Unit harness theo plan | `node --test --experimental-strip-types --test-name-pattern='ST6_AC11\|B-65' test/inventory-screen.test.mjs` | `ok 1 - test_ST6_AC11_tab_dieu_khien_tu_props`; evidence/r3-unit-test.log | Click Nguyên liệu gọi `onTabChange('catalog')`; đổi prop gọi `ingredients()` một lần (approved/:494). | “Màn Kho chỉ tải dữ liệu của tab đang mở” (spec:31). | Đúng | Test chạy callback và số lần gọi, không chỉ đọc source. |
| ST-6.AC-12 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-6.AC-13 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-7.AC-1 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-7.AC-2 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-7.AC-3 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-7.AC-4 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-7.AC-5 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-7.AC-6 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-7.AC-7 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-8.AC-1 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-8.AC-2 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-8.AC-3 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-8.AC-4 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-8.AC-5 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-8.AC-6 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-8.AC-7 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-8.AC-8 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-8.AC-9 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-8.AC-10 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-9.AC-1 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-10.AC-1 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-10.AC-2 | Chrome CLI + MCP app/API thật | BR-2 được chọn; MCP click Tồn kho rồi Back, chờ cả URL và tab active | BR-2 PASS; `/kho/ton-kho` Tồn kho, Back `/kho/so-kho` Sổ kho; evidence/r3-browser-test.log, r3-live-dialog.json, r3-ST10AC2-back.png | OWNER Sổ kho, click Tồn kho đổi pathname; Back về Sổ kho active (approved/:661). | “nút Quay lại/Tiến của trình duyệt và mở link đều về đúng màn” (spec:30). | Đúng | Bằng chứng cuối chờ DOM cùng URL; không dùng quan sát ban đầu chưa đồng bộ. |
| ST-10.AC-3 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-10.AC-4 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-10.AC-5 | Chrome CLI + MCP với fixture HTTP theo plan | BR-5 được chọn; MCP context riêng lấy nguyên `installFakeApi`, users/permissions từ test; owner, logout, cashier, Back | BR-5 PASS; MCP `/ban-hang/thuc-don`, rail Bán hàng, Mở ca thu ngân, leakedInvoice=false, leakedBranch=false, errors=[]; evidence/r3-browser-test.log, r3-ST10AC5-mcp.json, r3-ST10AC5-owner-before.png, r3-ST10AC5-cashier-back.png | Đăng xuất về `/dang-nhap`; cashier về `/ban-hang/thuc-don`, Back không lộ hóa đơn/chi nhánh phiên trước (approved/:664). | “đăng xuất hoặc đổi tài khoản không để lại màn của người trước” (spec:30); ST-10 Interfaces dùng JSON qua fetch giả (approved/:653–654), bước 3–4 quy định fake auth/API (:670–674). | Đúng | Đúng ở mức ST-10 được duyệt; không coi là kiểm lại E2E-AC-9 hay đăng nhập API thật. Chi nhánh Nam Lý có sẵn từ mock POS, xem Đánh giá test. |
| ST-10.AC-6 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| ST-10.AC-7 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-1 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-2.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-2.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-2 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-3 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-4 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-5 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-6 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-2.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-2.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-7 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-8 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-9 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-10 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-11 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-2.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-2.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-12 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-13 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |
| E2E-AC-14 | Không chạy lại | Ngoài ba AC được giao | Không có chứng cứ mới; giữ report-1.md | Giữ AC đã duyệt | Không đối chiếu lại; xem report-1.md | — (không chạy lại; kết quả trước Đúng) | Không suy nghiệm thu lại từ build hoặc test chọn. |

## Đối chiếu spec (cấp tính năng)
| Mục của spec (nguyên văn) | Loại | AC hoặc bước đã chạy | Kết quả thật | Kết luận |
|---|---|---|---|---|
| “Màn Kho chỉ tải dữ liệu của tab đang mở” (:31) | mục tiêu | ST-6.AC-11 | Callback catalog và ingredients một lần; unit PASS | Đúng trong phạm vi kiểm lại |
| “nút Quay lại/Tiến của trình duyệt và mở link đều về đúng màn” (:30) | mục tiêu | ST-10.AC-2 và exploratory B-65 | URL/tab active đúng; dialog đóng sau Back và không mở lại khi Forward | Đúng cho Back/Forward đã thử; F5/link không chạy lại |
| “đăng xuất hoặc đổi tài khoản không để lại màn của người trước” (:30) | mục tiêu | ST-10.AC-5 | Chrome CLI và MCP context fixture: cashier Back vẫn ở Bán hàng, không owner ledger data | Đúng ở tầng fetch giả được ST-10 quy định; API thật chưa chạy lại |
| “Mở được màn qua link/địa chỉ web mà tài khoản không có quyền, hoặc để lại màn/dữ liệu của người dùng trước sau khi đổi tài khoản.” (:49) | phản mục tiêu | ST-10.AC-5 | Không gặp phản mục tiêu trong test chọn; chưa kiểm toàn bộ quyền/link | Đúng trong hành vi đã thử |
| “Thêm API nhập tồn, sửa, xóa hay ghi sổ kho; đổi quy tắc ghi sổ kho (BR-44..47).” (:38) | phi mục tiêu | Live mở dialog và Back/Forward | Không submit, không ghi dữ liệu kinh doanh; không sửa production | Đúng cho lượt kiểm này |
| “Tablet ngang 1024×768, tiếng Việt, vùng chạm theo DESIGN.md” (:67) | ràng buộc | MCP 1024×768, screenshot dialog/tab | Ảnh tiếng Việt đúng viewport; không đo lại toàn bộ kích thước/tương phản | Không có kết luận mới cho phần đo đã có ở vòng 1 |
| Những mục còn lại của spec | mục tiêu / phi mục tiêu / phản mục tiêu / ràng buộc | Không chạy lại | Giữ report-1/report-2; không suy PASS toàn spec từ ba AC | Không có kết luận mới |

## FAIL / bug (mỗi FAIL cũng được lưu vào sổ fails.md)
- Không có FAIL mới trong phạm vi ba AC và B-65.
- V1-1/V1-2 giữ `đã PASS`, không xóa nội dung cũ hoặc thay người sửa trong sổ.
- Không coi việc thiếu credential cho kiểm đổi phiên API thật là PASS mới của E2E-AC-9; E2E đó không nằm trong phạm vi chạy lại. Không mở lỗi môi trường mới cho một bước ngoài phạm vi.

## Lệch tài liệu
- Không phát hiện lệch plan/spec mới trong ba AC đã chọn.
- ST-10.AC-5 chỉ là browser ở biên HTTP giả theo Interfaces/bước 3–4 của plan; S10-11/E2E-AC-9 đòi app/API thật được tách riêng và không được kết luận lại.
- AC-5 gọi tên “Chi nhánh Nam” để phát hiện dữ liệu chủ A. Màn POS có sẵn “Chi nhánh Nam Lý” từ mock khác; test hiện hành dùng `/Chi nhánh Nam(?! Lý)/`, đúng sai khác đã ghi ở task mục ST-10 (:164) và report-1. MCP dùng cùng fixture/kiểm tra, không thay test để đạt. Văn bản thật có “Chi nhánh Nam Lý”; không khẳng định phép `body.includes('Chi nhánh Nam')` là false.

## Đánh giá test
- Unit ST-6.AC-11 gọi onClick của nút, kiểm callback rồi thay prop và kiểm số lần tải ingredients.
- Hai unit B-65 kiểm dialog đang mở, đổi prop tab, dialog đóng, tab mới active và quay về tab cũ không tự mở lại.
- Browser BR-2/BR-5 dùng App/router/AuthContext/client/CSS thật, chỉ fetch giả theo hợp đồng; không skip, không assert rỗng, không sửa source/harness.
- MCP bổ sung dùng UI container đã có hash sau B-65; phần dialog và Back dùng API thật. Riêng đổi phiên dùng nguyên fixture từ repository trong context riêng, có screenshot trước/sau và kiểm pageerror. Không dùng mock này làm bằng chứng quyền API hoặc dữ liệu DB thật.
- Quan sát đầu MCP khi chỉ chờ URL có thời điểm active tab cũ; lưu nguyên ở `evidence/r3-live-initial-observation.json`. Đây là đo chưa đồng bộ, không kết luận lỗi sản phẩm từ trạng thái trung gian. Lượt cuối chờ cả URL, active tab và bảng; kết quả ổn định trong `r3-live-dialog.json`. Không thêm delay cố định hoặc sửa production.
- M-39: có ma trận đủ 80 AC, hash mã, screenshot thật và giới hạn chứng cứ. Chưa đo lại touch/contrast vì ngoài ba AC. M-38: cập nhật cả tổng hợp và ghi chú lịch sử sổ FAIL, không xóa mục.
- M-13: thay phiên kiểm qua boundary fixture đúng plan; không suy qua credential thật. M-47: live tái dùng owner fixture hiện có, tên branch hiển thị ZA1/ZA2; không tạo/đổi tên fixture.

## Exploratory
| Case | Bước/đầu vào thật | Kết quả / chứng cứ |
|---|---|---|
| B-65 catalog | Ở Sổ kho, bấm Nguyên liệu, mở Thêm nguyên liệu, browser Back sang Sổ kho, Forward trở lại Nguyên liệu | Dialog 1 trước, 0 sau Back, 0 sau Forward; r3-live-dialog.json; r3-B65-catalog-open.png, r3-B65-catalog-back-closed.png |
| B-65 stocks | Ở Nguyên liệu, bấm Tồn kho, mở Đặt ngưỡng tồn, browser Back về Nguyên liệu, Forward về Tồn kho | Dialog 1 trước, 0 sau Back, 0 sau Forward; r3-live-dialog.json; r3-B65-stocks-open.png, r3-B65-stocks-back-closed.png |
| B-60 timing | Tồn kho/Back và hai dialog chờ URL + tab active + bảng, không chờ cố định | Kết quả cuối đúng; quan sát đầu chưa đồng bộ giữ riêng |
| RF-1 vế cashier / M-13 | Fixture owner Sổ kho, logout, cashier login, Back | /ban-hang/thuc-don, rail Bán hàng, Mở ca thu ngân; không HDS10A0001/Chi nhánh Nam của owner; r3-ST10AC5-mcp.json |
| RF-1 vế manager, RF-2..RF-5, errors cũ khác | Không chạy lại vì ngoài phạm vi ba AC | Không có kết luận mới; giữ report-1/report-2 |

## Đề xuất
- Agent chính ghi lịch sử kiểm AC và B-65 vào task/plan active theo kết quả này; verifier không sửa các file đó.
- Nếu cần QA toàn sprint hoặc nghiệm thu lại E2E-AC-9 sau B-65, cần lượt riêng có credential fixture được cung cấp hoặc phiên thử hợp lệ; không thay mật khẩu để lấp thiếu chứng cứ.
- Graph semantic của report/fails do agent chính xử lý; marker hiện có được giữ nguyên.
- Chưa kiểm CI, production, thiết bị cảm ứng thật, toàn bộ API/UI hoặc đổi phiên API thật trong vòng 3. Không dùng report này để đánh dấu QA toàn sprint hay bỏ qua các Low đang ở backlog.
