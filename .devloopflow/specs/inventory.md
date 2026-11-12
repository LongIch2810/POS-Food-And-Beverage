# PB-08 — nguyên liệu, công thức và tồn kho

**Trạng thái:** Đã chốt theo xác nhận Product Owner ngày 07/11/2026 trước TDD. **Sprint:** [S7-01..S7-04, S7-07](../sprints/sprint-07/SPRINT.md). **Nguồn:** [BR](../docs/BUSINESS_RULES.md) BR-13, BR-42..50, BR-72, BR-80..81; [DB](../docs/DESIGN_DB_POS_SYSTEM.md); [API](../docs/api-spec.md); [plan](../plans/completed/2026-11-07-sprint-07-inventory-promotions.md).

## Mục tiêu và phạm vi

OWNER/MANAGER quản lý nguyên liệu và công thức dùng chung store; xem tồn, đặt ngưỡng tối thiểu và đọc sổ theo branch được phép. UI Kho và công thức dùng API thật. Không có nhập kho, hao hụt, kiểm kê, SALE/SALE_REVERSAL hoặc tác động lên hóa đơn trong Sprint 07. Tồn ban đầu 0; không đặt dữ liệu seed giả làm tồn thật.

## Quyết định và điểm cần chốt

- Product Owner đã chọn khóa `unit` khi nguyên liệu đã có công thức, bản ghi tồn hoặc movement; giữ công thức cũ khi nguyên liệu ngưng dùng nhưng cấm thêm nguyên liệu ngưng dùng mới. BR-49 cho phép công thức rỗng. BR-50 đặt IMPORT/WASTE/ADJUST ở GĐ2.
- Product Owner đã chốt hợp đồng từ plan: `unit` thuộc `g|ml|piece`; tên nguyên liệu trim, duy nhất không phân biệt hoa thường trong store; decimal là chuỗi thập phân `numeric(14,3)` dương cho công thức, `minStock` không âm. `PUT recipe` thay toàn bộ danh sách trong một transaction; phần tử cũ chứa nguyên liệu inactive được giữ nguyên nếu không sửa lượng. `currentStock` chỉ đọc; khi chưa có movement là 0. Tên/field/route/lỗi ở các mục dưới đã chốt.

## Luồng, quyền và dữ liệu

1. Backend lấy `storeId` từ phiên. `OWNER` dùng `branchId` trong query để lọc tồn/sổ hoặc body khi đặt ngưỡng; `MANAGER` chỉ dùng branch trong phiên. ID không thuộc phạm vi trả `404 NOT_FOUND`; `PLATFORM_ADMIN` bị từ chối.
2. Thêm nguyên liệu tạo catalog record, chưa tự tăng tồn hay ghi movement. Đặt ngưỡng lần đầu tạo hàng tồn cặp branch–ingredient với `current_stock=0`; chỉnh ngưỡng sau đó không đổi tồn. Nguyên liệu đã có bản ghi tồn không đổi `unit`.
3. Công thức lưu lượng cho một phần món-size hoặc một topping, theo unit của nguyên liệu. Một nguyên liệu chỉ có một dòng trong mỗi công thức; request lặp ID bị từ chối. Công thức trống hợp lệ; nguyên liệu inactive đã có trong công thức vẫn hiển thị, nhưng không được thêm mới.
4. Sổ kho chỉ đọc trong Sprint 07. Migration chặn UPDATE/DELETE movement; không có API tạo movement. Tạo hoặc sửa đơn `OPEN` không tạo SALE, không đổi currentStock.
5. UI dùng HTTP client hiện tại: màn Kho có danh sách nguyên liệu, tồn theo branch, sổ và ngưỡng; RecipeModal ở Thực đơn đọc/ghi API. Loại nguồn mock khỏi các luồng này; hiện loading/lỗi, dữ liệu đúng sau reload/đổi phiên, không lẫn branch/store.

## DTO và lỗi chung

- Response dùng `{data}` hoặc `{data,meta}`; field camelCase, thời gian ISO UTC, ID UUID. Danh sách dùng `limit/cursor` theo `api-spec.md`; `limit` mặc định 20, tối đa 100. Mọi request ghi có CSRF như API chung.
- `IngredientDto`: `{id,name,unit,isActive,createdAt,updatedAt}`. `RecipeLineDto`: `{ingredientId,ingredientName,unit,quantity}` (quantity là chuỗi tối đa ba số lẻ). `StockDto`: `{branchId,ingredientId,ingredientName,unit,currentStock,minStock}`. `MovementDto`: `{id,branchId,ingredientId,ingredientName,unit,type,quantity,balanceAfter,invoiceId,note,createdAt}`; decimal là chuỗi.
- Lỗi chung: `401 UNAUTHENTICATED`, `403 PERMISSION_DENIED`, `404 NOT_FOUND`, `422 VALIDATION_ERROR`. `409 RESOURCE_IN_USE` khi đổi unit sau tham chiếu; `409 DUPLICATE_INGREDIENT_NAME` cho tên trùng; `409 INGREDIENT_INACTIVE` khi thêm inactive vào công thức. Không trả nội dung tài nguyên store khác.

## Endpoint

### GET /api/v1/ingredients

1. **Mô tả:** Liệt kê catalog nguyên liệu. 2. **Quyền:** `inventory.view` (OWNER/MANAGER). 3. **Phạm vi:** store phiên. 4. **BR:** BR-13, BR-80..81. 5. **Request:** `limit`, `cursor`, `isActive?`, `q?`, sort mặc định `name,id`; không body. 6. **Thành công:** `200 {data:IngredientDto[],meta}`. 7. **Lỗi:** 403 thiếu quyền, 422 query sai. 8. **Xử lý:** lọc store trước phân trang. 9. **Ví dụ:** `GET /ingredients?isActive=true&limit=20` → danh sách store hiện hành. 10. **Test:** lọc, cursor, store khác không lộ.

### POST /api/v1/ingredients

1. **Mô tả:** Tạo nguyên liệu. 2. **Quyền:** `inventory.manage` (OWNER/MANAGER). 3. **Phạm vi:** store phiên, không nhận storeId. 4. **BR:** BR-13, BR-48, BR-80. 5. **Request:** `{name:string 1..100 sau trim,unit:'g'|'ml'|'piece'}`. 6. **Thành công:** `201 {data:IngredientDto}`. 7. **Lỗi:** 409 `DUPLICATE_INGREDIENT_NAME`, 422 validation. 8. **Xử lý:** unique theo store + tên chuẩn không phân biệt hoa thường; không ghi tồn/movement. 9. **Ví dụ:** `{ "name":"Đường", "unit":"g" }` → 201. 10. **Test:** tên trùng hoa/thường, store khác cùng tên, unit sai.

### PATCH /api/v1/ingredients/{id}

1. **Mô tả:** Đổi tên, đơn vị trước tham chiếu hoặc `isActive`. 2. **Quyền:** `inventory.manage`. 3. **Phạm vi:** ID cùng store. 4. **BR:** BR-13, BR-48, BR-80. 5. **Request:** ít nhất một trong `{name?,unit?,isActive?}`; không nhận stock/branch. 6. **Thành công:** `200 {data:IngredientDto}`. 7. **Lỗi:** 404 ngoài store, 409 `RESOURCE_IN_USE` khi đổi unit đã tham chiếu, 409 tên trùng, 422 validation. 8. **Xử lý:** khóa ingredient, kiểm recipe/stock/movement trong transaction; không xóa cứng. 9. **Ví dụ:** `{ "isActive":false }` → 200, công thức cũ vẫn đọc được. 10. **Test:** unit lock, inactive recipe cũ, không lộ store khác.

### GET/PUT /api/v1/product-sizes/{id}/recipe

1. **Mô tả:** Đọc hoặc thay toàn bộ công thức cho một món-size. 2. **Quyền:** GET `inventory.view`, PUT `menu.manage`. 3. **Phạm vi:** product-size và mọi ingredient cùng store phiên. 4. **BR:** BR-48..49, BR-80. 5. **Request:** GET không body; PUT `{ingredients:[{ingredientId:uuid,quantity:decimal-string>0}]}`, có thể `[]`, không lặp ID, tối đa 3 số lẻ. 6. **Thành công:** GET/PUT `200 {data:RecipeLineDto[]}`. 7. **Lỗi:** 404 ID ngoài store, 409 `INGREDIENT_INACTIVE` khi thêm inactive, 422 trùng/quantity sai. 8. **Xử lý:** PUT khóa parent, thay danh sách trong transaction; dòng inactive cũ chỉ được giữ nguyên. 9. **Ví dụ:** `PUT ... {"ingredients":[{"ingredientId":"<uuid>","quantity":"20.000"}]}` → 200. 10. **Test:** rollback khi một ID sai, rỗng, trùng, inactive cũ/mới, hai store.

### GET/PUT /api/v1/toppings/{id}/recipe

1. **Mô tả:** Đọc hoặc thay công thức cho một topping. 2. **Quyền:** GET `inventory.view`, PUT `menu.manage`. 3. **Phạm vi:** topping và mọi ingredient cùng store. 4. **BR:** BR-48..49, BR-80. 5. **Request:** cùng DTO recipe product-size. 6. **Thành công:** `200 {data:RecipeLineDto[]}`. 7. **Lỗi:** cùng quy tắc recipe product-size. 8. **Xử lý:** transaction/khóa topping trước thay danh sách. 9. **Ví dụ:** `PUT ... {"ingredients":[]}` → 200, topping không công thức. 10. **Test:** lượng, rollback, scope và inactive.

### GET /api/v1/ingredient-stocks

1. **Mô tả:** Liệt kê tồn/ngưỡng theo chi nhánh. 2. **Quyền:** `inventory.view`. 3. **Phạm vi:** OWNER `branchId?` (bỏ trống = mọi branch trong store); MANAGER chỉ branch phiên, không nhận branchId. 4. **BR:** BR-45, BR-72, BR-80..81. 5. **Request:** `limit,cursor,branchId?,ingredientId?`; không body. 6. **Thành công:** `200 {data:StockDto[],meta}`; ingredient chưa có row stock có tồn/ngưỡng 0. 7. **Lỗi:** 404 branch/ingredient ngoài store, 422 query sai. 8. **Xử lý:** không tạo movement khi đọc, đối chiếu tổng movement trên DB test. 9. **Ví dụ:** `GET /ingredient-stocks?branchId=<uuid>` → 200. 10. **Test:** hai branch/hai store, chưa movement, phân trang.

### PATCH /api/v1/ingredient-stocks/{ingredientId}/min-stock

1. **Mô tả:** Đặt ngưỡng tối thiểu. 2. **Quyền:** `inventory.manage`. 3. **Phạm vi:** OWNER body `branchId` bắt buộc; MANAGER không gửi branchId, dùng branch phiên; ingredient/branch cùng store. 4. **BR:** BR-45, BR-72, BR-80. 5. **Request:** `{minStock:decimal-string>=0,branchId?:uuid}`; không nhận `currentStock`. 6. **Thành công:** `200 {data:StockDto}`. 7. **Lỗi:** 404 ngoài phạm vi, 422 giá trị/branchId sai. 8. **Xử lý:** upsert cặp branch–ingredient, currentStock mặc định 0, không ghi movement. 9. **Ví dụ:** `{ "branchId":"<uuid>", "minStock":"100.000" }` (OWNER) → 200. 10. **Test:** branch của manager, concurrent upsert, stock không đổi.

### GET /api/v1/stock-movements

1. **Mô tả:** Đọc sổ kho. 2. **Quyền:** `inventory.view`. 3. **Phạm vi:** như GET stocks. 4. **BR:** BR-42, BR-44, BR-72, BR-80..81. 5. **Request:** `limit,cursor,branchId?,ingredientId?,type?`, sort `-createdAt,id`; không body. 6. **Thành công:** `200 {data:MovementDto[],meta}`. 7. **Lỗi:** 404 ID ngoài store, 422 filter sai. 8. **Xử lý:** không có POST/PATCH/DELETE movement trong Sprint 07; DB chặn UPDATE/DELETE. 9. **Ví dụ:** `GET /stock-movements?branchId=<uuid>` → mảng rỗng trước PB-09. 10. **Test:** phạm vi; thử sửa/xóa route không được; đơn OPEN không tạo SALE.

## Nghiệm thu và bằng chứng

- **AC-1/S7-01:** API và DB cho tạo/sửa/ngưng nguyên liệu, tên trùng, unit lock, quyền/tenant.
- **AC-2/S7-02:** product-size/topping recipe, quantity/đơn vị, store isolation, transaction rollback, inactive ingredient cũ/mới.
- **AC-3/S7-03:** tồn/ngưỡng theo branch, stock=0 chưa movement, không cho ghi currentStock, hai store/branch.
- **AC-4/S7-04:** chỉ đọc sổ, DB append-only, đơn OPEN không tạo movement; không route nhập/hao hụt/kiểm kê.
- **AC-7/S7-07 phần Kho:** browser UI cuối + network + DB trước/sau mutation, reload và đổi phiên. Bằng chứng ở `qa-evidence/`, không lấy từ mock.
