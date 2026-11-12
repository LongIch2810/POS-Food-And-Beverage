# Bổ sung QA AC-7 và S7-07 trên sandbox

**Nguồn:** task `tasks/active/2026-11-07-sprint-07-implementation.md` AC-7, plan active, `specs/inventory.md`, `specs/promotions.md`, PB-13; sprint `sprints/sprint-07/SPRINT.md` S7-07. Đã đọc `AGENTS.md`, `docs/PRODUCT_OVERVIEW.md`, `docs/BUSINESS_RULES.md`, `rules/testing.md`, `.codex/agents/qa.toml` ở lần QA chính; đối chiếu lại AC-7/S7-07 và source UI trước bổ sung. Ma trận trước chạy: `matrix.md`.

**Phiên bản và môi trường:** `commit.txt` = `5ada010f61d76ae5a0bf55a2224081513ad762bb`; dirty tree trong `git-status-before.txt` và `git-status-after.txt`; `ui-source-hashes.txt` lưu SHA256 UI cuối. Chỉ localhost:5173 qua API test localhost:3007 và PostgreSQL sandbox `pos_s7_ui_sandbox` trên 127.0.0.1:5433. Browser Chrome headless viewport 1180×820, touch, OWNER A giả. Không dùng production. Cookie, mật khẩu, token và request body auth không lưu. Network JSON có method/path/status/x-request-id; request ID mock 503 không tồn tại vì browser tự trả response.

**Lệnh và output gốc:**

| ID | Lệnh chính xác (trong gốc repo; env test đã xác nhận) | Thời gian | Exit / output |
|---|---|---|---|
| HARNESS-DEPENDENCY | `$env:NODE_PATH=(Resolve-Path 'POS_UI/node_modules').Path; node qa-evidence/20261107-204250-5ada010f-s7-sprint-qa/supplement/browser-ac7.cjs` | `start-time.txt` | 1, `browser-ac7.log`, thiếu module `pg`; không tác động DB/UI |
| UI-ING-CREATE/EDIT/INACTIVE/MIN | `$env:NODE_PATH=(Resolve-Path 'POS_UI/node_modules').Path+';'+(Resolve-Path 'POS_API/node_modules').Path; $env:DATABASE_URL='<PostgreSQL local/test đã che>'; $env:QA_PASSWORD=<fake sandbox password>; node qa-evidence/20261107-204250-5ada010f-s7-sprint-qa/supplement/browser-ac7.cjs` | `start-time.txt`→`end-time.txt` | 1, `browser-ac7-run.log`, `state.json`; bốn ca kho hoàn tất, ca Khuyến mãi bị lỗi điều hướng harness vì chưa bấm tab Khuyến mãi |
| UI-PROMO-ERROR | `$env:NODE_PATH=(Resolve-Path 'POS_UI/node_modules').Path; $env:QA_PASSWORD=<fake sandbox password>; node qa-evidence/20261107-204250-5ada010f-s7-sprint-qa/supplement/browser-promo-error.cjs` | `promo-supp-start.txt`→`promo-supp-end.txt` | 0, `browser-promo-error.log`, `promo-supp-result.json` |

`browser-ac7.cjs` và `browser-promo-error.cjs` là harness local lưu trong thư mục này. Đây là bằng chứng **local do QA chạy**, không phải CI/runner độc lập. Tên dữ liệu và tài khoản đều giả. Lệnh tái chạy chuẩn toàn bộ suite ở `../run.md`; harness riêng cần fixture sandbox cùng dữ liệu giả.

| Tình huống | Điều kiện ban đầu và thao tác browser | Expected theo nguồn | Actual và artifact gốc | Trạng thái |
|---|---|---|---|---|
| UI-ING-CREATE · AC-7/S7-07 · PB-13, `specs/inventory.md` | OWNER A, chưa có `S7 QA Browser 2148` (`db-before.json`); mở Kho → Nguyên liệu → Thêm, nhập tên, lưu, tải lại. | UI gọi API thật, dòng mới bền sau reload. | `ingredient-before`, `ingredient-create-modal`, `ingredient-create-filled`, `ingredient-created`, `ingredient-created-reload` mỗi cặp `.json/.png`; POST `/api/v1/ingredients` 201 request ID `ee3da85a-d356-49f6-b59a-bba7f645c34b`; `db-after-create.json` có UUID mới, `is_active=true`. | **PASS** |
| UI-ING-EDIT · AC-7/S7-07 · PB-13, `specs/inventory.md` | Dòng vừa tạo; mở Sửa, đổi tên thành `S7 QA Browser 2148 edited`, lưu. | Tên mới hiện và bền DB. | `ingredient-edit-modal`, `ingredient-edit-filled`, `ingredient-edited` `.json/.png`; PATCH ingredient 200 request ID `addae6ab-4d87-452a-8400-793c330c2192`; `db-after-edit.json` giữ UUID và tên mới. | **PASS** |
| UI-ING-INACTIVE · AC-7/S7-07 · PB-13, `specs/inventory.md` | Dòng vừa sửa; bấm Ngưng dùng, tải lại. | Badge ngưng dùng; dữ liệu không bị xóa. | `ingredient-inactive`, `ingredient-inactive-reload` `.json/.png`; PATCH 200 request ID `d14013a0-304c-45cf-8483-8933ae23e2eb`; `db-after-inactive.json` giữ row, `is_active=false`. | **PASS** |
| UI-MIN · AC-7/S7-07 · BR-45/72/80, `specs/inventory.md` | OWNER A, Kho → Tồn kho; chọn dòng nguyên liệu vừa tạo tại branch `9275d558-6c2d-40f3-9f93-7693f92411de`; mở modal Đặt ngưỡng, nhập 8.125 g, lưu, tải lại. | Ngưỡng chỉ ở branch tương ứng, bền sau reload; tồn hiện tại không đổi. | `stock-before`, `stock-modal`, `stock-filled`, `stock-after`, `stock-reload` `.json/.png`; PATCH `/api/v1/ingredient-stocks/{ingredientId}/min-stock` 200 request ID `b4b3e399-97f1-4f3c-9e29-f2956054cd32`; `db-after-min.json` min 8.125, stock 0.000 tại branch trên, ảnh reload hiện 8.125 g/dưới ngưỡng. | **PASS** |
| UI-PROMO-ERROR · AC-7/S7-07 · PB-13, `specs/promotions.md` | OWNER A, Cài đặt → Khuyến mãi, tải danh sách thật; browser tự trả 503 cho một GET `/api/v1/promotion-codes?limit=100`, sau đó bỏ interception và bấm Thử lại. | Loading/error tiếng Việt; retry đưa danh sách trở lại. Mô phỏng chỉ chứng minh nhánh UI. | `promo-supp-before`, `promo-supp-error-simulated`, `promo-supp-retry` `.json/.png`, `promo-supp-result.json`: GET thật 200/304; mock GET 503 (không có request ID server); retry GET 304 request ID `715c8647-6f1d-400c-8ea7-5c588176f30a`, mã `S7UIPRO25046D` hiện trở lại. | **PASS** |

**Đối chiếu hai tầng:**

| Tầng | Tiêu chí | Bằng chứng | Trạng thái |
|---|---|---|---|
| Task | AC-7, nguồn task/plan + hai spec, PB-13 | Năm tình huống trên bổ sung đúng các vế thiếu. Các vế recipe, quyền/branch, đổi identity/store, loading/error kho và reload đã có bằng chứng gốc trong `../run.md` và các file `../recipe-*`, `../ownerB-*`, `../manager-*`, `../cashier-*`, `../ui-error-simulated*`; đã mở đối chiếu lại, không lấy báo cáo agent khác. | **PASS** |
| Sprint | S7-07, nguồn `sprints/sprint-07/SPRINT.md`, PB-13 | UI cuối qua API test thật; browser/network/DB trước-sau cho mutation, ảnh UI modal/trạng thái/reload; quyền và identity ở run chính, error Khuyến mãi trong supplement. | **PASS** |

Không thấy FAIL sản phẩm. Lỗi điều hướng của harness và thiếu `pg` đã ghi nguyên log, không coi là lỗi ứng dụng. Không có CI xác minh trên working tree dirty; quyết định đóng sprint và review vẫn thuộc người phụ trách.
