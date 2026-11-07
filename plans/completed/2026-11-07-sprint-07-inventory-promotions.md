# Sprint 07 — kế hoạch triển khai kho và khuyến mãi

**Trạng thái:** Hoàn tất triển khai plan ngày 07/11/2026: hai spec đã chốt, DB/API và UI đã triển khai theo TDD, 3 vòng review xong; QA task AC-1..7 PASS và QA sprint S7-01..07 PASS trên sandbox. Sprint Review/retrospective đã được tổng hợp và sprint đóng sớm cùng ngày theo yêu cầu người dùng. **Sprint:** [Sprint 07](../../sprints/sprint-07/SPRINT.md), S7-01..S7-07. **Nhánh triển khai:** `feat/sprint-07-inventory-promotions`, QA trên nền `5ada010f61d76ae5a0bf55a2224081513ad762bb` với working tree dirty; mã Sprint 07 đã commit/push ở `8bc11be770f68b3ff5944e5f8a9c65f4feaf03dd`, chưa xác minh CI, merge hoặc production.

## Mục tiêu, phạm vi và nguồn

- PB-08: nguyên liệu, công thức theo product-size/topping, tồn và sổ kho theo chi nhánh. PB-08a: cấu hình mã giảm giá và hàm đánh giá/tính giảm. PB-13: UI Kho/Khuyến mãi dùng API thật. Tiêu chí sprint S7-01..07 ở `sprints/sprint-07/SPRINT.md` là nguồn đối chiếu.
- Ngoài phạm vi: thanh toán PB-09, áp mã lên hóa đơn, tăng `used_count`, trừ/hoàn kho, `IMPORT`/`WASTE`/`ADJUST` (BR-50 GĐ2), production, commit/push. Không biến UI mock thành chứng cứ backend.
- Nguồn: `AGENTS.md`, `rules/testing.md`, `rules/git.md`, `docs/PRODUCT_OVERVIEW.md`, `docs/PRODUCT_BACKLOG.md`, `docs/BUSINESS_RULES.md` BR-13, BR-36..50, BR-72, BR-80..81; `docs/DESIGN_DB_POS_SYSTEM.md`, `docs/api-spec.md`, `DESIGN.md`, spec đã chốt của menu/sales và mã hiện tại.

## Quyết định đã chốt và điểm kiểm soát

1. Product Owner chốt: khóa đơn vị nguyên liệu khi đã có công thức/tồn/sổ; giữ công thức cũ của nguyên liệu ngưng dùng nhưng cấm thêm nguyên liệu ngưng dùng mới; PERCENT làm tròn xuống đồng nguyên; mã trim + uppercase, không phân biệt hoa thường; PERCENT 1–100; mã đã có `used_count > 0` chỉ đổi tên/trạng thái, không đổi code/điều kiện.
2. Theo schema hiện có: `maxDiscountAmount` PERCENT nullable (null = không trần), `minOrderAmount` nullable (null = 0), `usageLimit` nullable (null = không giới hạn); thời gian UTC. Lượng công thức/tồn là decimal tối đa ba chữ số thập phân, tiền VND nguyên.
3. Trước code: hoàn tất hai spec theo `create-pos-spec`, đối chiếu với S7 và nhận Product Owner chốt. Nếu spec thiếu hoặc mâu thuẫn, dừng phần phụ thuộc, không tự suy từ UI mock. Trước integration test xác nhận PostgreSQL local/test; không in DATABASE_URL.
4. Trước code tạo nhánh tính năng riêng sau `git fetch origin`, kiểm upstream/chênh lệch, branch/HEAD/status. Không khôi phục, stash hoặc ghi đè tài liệu chưa commit. Sau Markdown semantic update Graphify; sau code `graphify update .`.

## Thứ tự triển khai và kết quả từng mốc

1. **Refinement:** soạn `docs/drafts/s7-inventory.md` và `docs/drafts/s7-promotions.md`, gồm endpoint theo mẫu `docs/api-spec.md` mục 12, payload/lỗi/quyền/branch, ví dụ và AC. Product Owner chốt → chuyển sang `specs/inventory.md`, `specs/promotions.md`, cập nhật tài liệu chung nếu quyết định mới thay đổi chúng. Chưa tạo file spec chính thức khi còn mở.
2. **DB/API kho (S7-01..04):** test đỏ BR trước; migration cho `ingredients`, `product_size_ingredients`, `topping_ingredients`, `branch_ingredient_stocks`, `stock_movements` cùng constraint/permission; entity, service và controller theo spec. GET danh sách phân trang; PUT công thức thay toàn bộ trong transaction, cho phép rỗng; stock mặc định 0, ngưỡng tách branch; không route ghi currentStock hay sửa/xóa movement. Chứng minh store/branch isolation, unit lock, ngưng dùng, rollback và không trừ kho khi đơn OPEN.
3. **DB/API khuyến mãi (S7-05..06):** test đỏ BR-36..41; migration `promotion_codes` và permission, unique mã chuẩn trong store; service/controller cấu hình và pure function eligibility/discount; kiểm time/subtotal/limit/cap/rounding. Không tạo `invoice_promotion_codes` cho đến PB-09 nếu Sprint 07 không cần; không áp mã, tăng lượt hay sửa tiền hóa đơn.
4. **UI (S7-07):** thay mock trong `InventoryScreen`, `StockMovementsTab`, `RecipeModal` và nguồn nguyên liệu/công thức của màn Thực đơn; thêm quản lý Khuyến mãi trong Cài đặt theo DESIGN.md. Dùng HTTP client/session hiện tại, query gắn identity+branch, loading/error/reload/đổi phiên; không để mock hiển thị như dữ liệu thật.
5. **Review/QA:** với từng task, khóa bảng `AC | Nội dung | Nguồn | BR | Tiêu chí sprint | Cách chứng minh` trước code, TDD rồi `npm test` đúng package và `npm run build` UI. Gọi `code-reviewer` với spec/plan/AC/diff task; sửa finding và chạy lại. Gọi `qa` kiểm AC task, bằng chứng tự thu, một trạng thái/tình huống. Khi mọi task PASS, QA cấp sprint riêng kiểm S7-01..07 trên sandbox, lưu API/DB/browser artifact gốc. Chỉ đóng sprint khi QA cấp sprint đủ PASS.

## AC cấp task và bằng chứng tối thiểu

| AC | Kết quả cần đạt | Nguồn | BR | Sprint | Bằng chứng |
| --- | --- | --- | --- | --- | --- |
| AC-1 | CRUD mềm nguyên liệu, tên duy nhất, đơn vị gốc khóa sau tham chiếu, quyền/tenant đúng | plan; spec kho sau chốt | BR-13, BR-48, BR-80 | S7-01 | API + DB uniqueness/FK/đổi unit/ngưng dùng |
| AC-2 | Công thức product-size/topping đúng store, lượng dương theo unit, thay danh sách nguyên tử | plan; spec kho sau chốt | BR-48, BR-80 | S7-02 | integration API/DB và rollback |
| AC-3 | Tồn/ngưỡng tách branch, currentStock không ghi từ client và bằng tổng movement | plan; spec kho sau chốt | BR-45, BR-72, BR-80..81 | S7-03 | API/SELECT hai store/branch và quyền |
| AC-4 | Sổ chỉ thêm, không route sửa/xóa, đơn OPEN không tạo SALE hay đổi tồn | plan; spec kho sau chốt | BR-42, BR-44, BR-50 | S7-04 | DB trước/sau và API bị từ chối |
| AC-5 | Quản lý mã giảm giá đúng schema, mã chuẩn duy nhất và cô lập store | plan; spec khuyến mãi sau chốt | BR-36, BR-80..81 | S7-05 | API/DB biên và quyền |
| AC-6 | Eligibility và PERCENT/FIXED tính đúng, không vượt subtotal, không giảm tay | plan; spec khuyến mãi sau chốt | BR-36..41 | S7-06 | unit/integration biên |
| AC-7 | UI Kho/Khuyến mãi dùng API thật, đúng quyền/branch, reload/đổi phiên/tải/lỗi | plan; UI contract sau chốt | PB-13 | S7-07 | browser/network/DB trước sau trên UI cuối |

## Lệnh, rủi ro và trạng thái

- Lệnh chuẩn: `cd POS_API; npm test`, `cd POS_UI; npm test`, `cd POS_UI; npm run build`; trước integration test xác nhận DB sandbox. Test có setup/action/expected và BR trong tên; test DB cho constraint/transaction, browser cho UI; output gốc vào `qa-evidence/`.
- Rủi ro hiện hữu: Sprint 06 mới push ở nhánh tính năng, chưa merge master; tài liệu Sprint 07 dirty từ baseline; Docker Desktop đã dừng một lần khiến suite backend `ECONNREFUSED`, sau đó đã chạy lại container test riêng. Không đánh dấu PASS nếu review/QA và artifact chưa đủ.
- Kết quả cuối: bước 1–4 xong về code; reviewer vòng 1–2 có finding về branch query, identity UI, thời gian khuyến mãi, validation, lock order, lifecycle và nhãn mock; đã sửa, reviewer vòng 3 không còn finding. Backend `npm test` exit 0, 74/74; UI `npm test` exit 0, 40/40; UI `npm run build` exit 0. Lượt QA độc lập cuối xác nhận lại bằng suite mới, API/browser/DB SELECT hai store/ba branch/role, UI cuối và artifact từng AC: `qa-evidence/20261107-204250-5ada010f-s7-sprint-qa/run.md`; vế UI nguyên liệu/ngưỡng/lỗi Khuyến mãi có `supplement/run.md`. Kết luận **AC-1..7 PASS** cấp task và **S7-01..07 PASS** cấp sprint; không có FAIL sản phẩm còn mở. Agent chính đã mở lại artifact, exit code và hash UI được dẫn. Test local trên working tree dirty, chưa có CI cho code chưa commit; không suy kết quả production. Chi tiết tiến độ, file thay đổi, lệnh và cả các lượt QA chưa đủ trước đó ở [task](../../tasks/completed/2026-11-07-sprint-07-implementation.md). Plan đạt tiêu chí hoàn thành và chuyển sang `completed/`. Sprint Review/retrospective và quyết định đóng sớm đã ghi trong sprints/sprint-07/SPRINT.md; bước tiếp theo ngoài plan là review tích hợp, commit/CI và push/merge khi được yêu cầu, chưa xác nhận production.

**Cập nhật sau đóng sprint:** Mã Sprint 07 đã commit/push ở `8bc11be770f68b3ff5944e5f8a9c65f4feaf03dd`. QA nêu trên chạy trước commit trên working tree dirty; chưa xác minh CI của commit, merge hoặc production. Báo cáo QA Markdown được đưa lên Git, còn log/script/ảnh/JSON gốc chỉ giữ local. Các phát biểu “chưa commit/push” trong mốc thực thi bên trên mô tả thời điểm QA trước commit.
