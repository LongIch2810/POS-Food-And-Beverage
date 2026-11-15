# Hiện trạng tab Sổ kho (S10-11) - kiểm trên app chạy local

Ngày 15/11/2026. Kiểm hiện trạng, chưa sửa code/test/tài liệu. API http://localhost:3000, UI http://localhost:5173 (Vite dev, StrictMode), PostgreSQL local. Trình duyệt Playwright, viewport 1024x768. Bằng chứng thô: `evidence/` (api-matrix.txt, api-owner-full.json, db-check-B.txt, ảnh ui-*.png). Mật khẩu/token/cookie không ghi vào báo cáo hay evidence.

Tiêu chí (`sprints/sprint-10/SPRINT.md:42`): tab Sổ kho hiển thị biến động thực từ API theo quyền và chi nhánh, gồm xuất bán và hoàn trả kho khi có dữ liệu; reload hoặc đổi phiên không lộ dữ liệu cũ; trạng thái rỗng/lỗi rõ ràng.

## Dữ liệu thử đã tạo (không kèm mật khẩu)

- Store A `ZZ-TEST-SOKHO-20261115` id `29f61b69-b425-4b34-a0fe-fa3a4678540b`; store B `ZZ-TEST-SOKHO-20261115-B` id `72bbe566-c504-429a-9280-a27ca1771607`.
- User: `zzsokho_owner_a` (OWNER A, `a331e58b-d85f-4130-bf0f-4fe1717089df`), `zzsokho_owner_b` (OWNER B, `efce433e-f1ff-4f4c-8fd7-9b7e5616197e`), `zzsokho_manager_b1` (MANAGER B1, `da96d36e-8d58-4fff-80cd-8c6eb0ea4061`), `zzsokho_cashier_b1` (`6e75296f-3ac0-4ab6-96d3-ec931c9f67ce`), `zzsokho_cashier_b2` (`8cf04c02-9370-43c4-bbb5-e44b4ae0c6e0`). Mật khẩu tạm đã đổi sang mật khẩu thử ngẫu nhiên.
- Chi nhánh store A: B1 `ZA1` `fb639e97-a646-4973-9672-7ab102d0edca`; B2 `ZA2` `1d8d8cf5-9b9d-417a-92f8-ab909e9b51e5`; B3 `ZA3` (rỗng, thêm sau) `1aa36076-9d82-460f-ae84-a793cd81486f`. Store B: `ZB1` `802e891d-093d-4fd9-bfa4-98e3236135b4`.
- Bàn `ad484ca0-...` (B1), `3d3dd836-...` (B2). Nguyên liệu A: ZZ Sua ml `f8e6d677-e92a-4885-a331-8df9e666ffcf`, ZZ Duong g `eb23df4d-1b1d-43f3-9804-7c2e078b45ac`, ZZ Ly piece `9f642a56-5a0d-4d59-a530-adda6ef387a5`; nguyên liệu B `5dd54215-5756-4a8a-b6b6-a5913c1affb4`.
- Món "ZZ Tra sua" size M giá 25.000, product-size `b500451e-7000-4cc6-86a3-669bfff3a865`, công thức Sua 100 ml + Duong 20 g + Ly 1 piece.
- Ca CASHIER B1 `021aba2d-3323-4002-bb27-1bc6ded4fb13`, B2 `d1a7308a-ef54-45a3-93bd-3bf02cd04c29` (đang mở, chưa đóng).
- Hóa đơn: PAID B1 `4a3e4cfa-b12b-4c06-8eda-96f5f0f81a0e` (2 ly, 50.000); B1 PAID rồi CANCELLED bởi MANAGER B1 `1e4f82d6-438d-4ec5-b782-cc2e61e17874` (1 ly); PAID B2 `4a578fbd-5381-4ac5-92d3-9b7fc1624cb1` (3 ly); OPEN B1 `23210e01-0e7e-44e2-abf2-35d33f6c9862` (1 ly, bàn B1, không thanh toán); thêm 45 hóa đơn PAID B2 (1 ly) để có 153 dòng sổ kho.
- Seed của tester: KHÔNG có API nhập tồn (spec inventory: không route nhập/hao hụt/kiểm kê). Tồn đầu tạo bằng SQL INSERT `stock_movements` loại IMPORT (7 dòng: 3 nguyên liệu x B1, B2 và 1 dòng store B), `note` = "ZZ seed tester", `created_by` = OWNER; trigger `stock_movements_apply` tự tính `balance_after` và cập nhật tồn (tester truyền balance_after=0 nhưng DB lưu đúng số dư). Thanh toán dùng tiền mặt (CASH) cho mọi hóa đơn; luồng chuyển khoản xác nhận thủ công CHƯA KIỂM (không liên quan trực tiếp tới sổ kho).

## A. Bảng từng vế S10-11

| # | Vế | Bước chạy | Kết quả thật | Đối chiếu | Kết luận | Evidence |
|---|---|---|---|---|---|---|
| 1 | Dữ liệu thực từ API (không mock) | OWNER A mở Kho hàng > Sổ kho | Gọi `GET /api/v1/stock-movements?limit=100` -> 200; 18 dòng, khớp DB 18 dòng store A (ZZ seed + SALE + SALE_REVERSAL). `InventoryScreen.tsx:17-18,133-140` dùng `inventoryService.movements` (`inventoryService.ts:26`) | `.devloopflow/specs/inventory.md:58-60` | ĐÚNG | ui-owner-all.png, db-check-B.txt |
| 2 | Có "Xuất bán" và "Hoàn trả kho" đúng dấu/giá trị/tồn sau | So UI với DB | SALE B1 hóa đơn `4a3e4cfa`: Sua -200 (tồn sau 4800), Duong -40 (1960), Ly -2 (298); SALE `1e4f82d6`: -100/-20/-1 (4700/1940/297); SALE_REVERSAL `1e4f82d6`: +100/+20/+1 (4800/1960/298); SALE B2 `4a578fbd`: -300/-60/-3 (4700/1940/297). UI hiển thị y hệt kèm đơn vị. `branch_ingredient_stocks` = tổng quantity cho cả 6 cặp. Dấu cộng không hiển thị ("100.000 ml", không "+") | BR-42, BR-44, BR-72 (`docs/BUSINESS_RULES.md:183,185,192`) | ĐÚNG | db-check-B.txt, ui-owner-all.png |
| 3 | Đơn OPEN không sinh dòng | Đếm dòng theo hóa đơn OPEN `23210e01` | 0 dòng | BR-42 | ĐÚNG | db-check-B.txt |
| 4 | Append-only | SELECT trigger (không thử UPDATE/DELETE) | Có `stock_movements_append_only BEFORE DELETE OR UPDATE ... reject_stock_movement_change()`; `POST/PATCH/PUT/DELETE /stock-movements` -> 404 NOT_FOUND "Không tìm thấy tài nguyên." | BR-44; spec inventory.md:60 | ĐÚNG | db-check-B.txt, api-matrix.txt |
| 5 | Thứ tự mới nhất trước | So thứ tự API/UI | Sắp `created_at DESC, id DESC`; thứ tự theo thời gian đúng (REVERSAL > SALE B2 > SALE B1 > IMPORT). Các dòng cùng giao dịch có cùng `created_at` (now() trong transaction) nên thứ tự giữa chúng theo UUID, vd REVERSAL hiện Sua, Duong, Ly (ngẫu nhiên, không theo thứ tự công thức) | `inventory.service.ts` listMovements | ĐÚNG (thứ tự trong cùng giao dịch không xác định) | api-owner-full.json |
| 6 | Cột Ghi chú | Xem UI | Hiển thị UUID hóa đơn đầy đủ 36 ký tự (xuống 2 dòng) cho SALE/REVERSAL; "ZZ seed tester" cho IMPORT. API không trả mã hóa đơn (`invoiceCode`) | `InventoryScreen.tsx:134` `row.note \|\| row.invoiceId` | ĐÚNG theo code, kém dùng (xem Medium M2) | ui-owner-all.png |
| 7 | Lọc chi nhánh API | OWNER `?branchId=B1`/B2, tổng và `total` | B1: 12 dòng total=12; B2: 6 dòng total=6; không lọc 18. Lọc type: SALE 9, SALE_REVERSAL 3, IMPORT 6; ingredientId sữa: 6; ghép B1+SALE_REVERSAL+sữa: 1 | spec inventory.md:58-60 | ĐÚNG | api-matrix.txt |
| 8 | Lọc chi nhánh UI | Chọn Tất cả/B1/B2/B3 | B1 -> `GET ...stock-movements?branchId=fb639e97...&limit=100` 12 dòng; B2 6 dòng; Tất cả 18 dòng; B3 (không có dòng) -> "Chưa có bút toán kho". Dropdown thứ tự: Tất cả, B2, B1 (không theo tên/mã) | - | ĐÚNG (lọc); thứ tự dropdown lạ (Low) | ui-owner-*.png, ui-empty-branch.png |
| 9 | Quyền MANAGER | API + UI | Không branchId -> 200, 12 dòng chỉ B1. Có `branchId` (B1 của mình, B2, store B) -> 422 VALIDATION_ERROR "Dữ liệu kho không hợp lệ." (kể cả branchId của chính mình). ingredientId store B -> 404 NOT_FOUND "Không tìm thấy nguyên liệu." UI: không có ô chọn chi nhánh, 12 dòng B1, request không kèm branchId | spec inventory.md:57 "MANAGER không nhận branchId"; BR-72 | ĐÚNG | api-matrix.txt, ui-manager.png |
| 10 | Quyền CASHIER / không phiên / PLATFORM_ADMIN | API + UI | CASHIER 403 PERMISSION_DENIED "Bạn không có quyền thực hiện thao tác này."; không cookie 401 UNAUTHENTICATED "Vui lòng đăng nhập để tiếp tục."; PLATFORM_ADMIN 403 PERMISSION_DENIED. UI CASHIER: menu Bán hàng/Sơ đồ bàn/Hóa đơn/Ca làm/Báo cáo, không có Kho hàng | BR-81 | ĐÚNG | api-matrix.txt, ui-cashier.png |
| 11 | Cross-store | OWNER A đọc id store B | `?branchId=<BB>` -> 404 "Không tìm thấy chi nhánh."; `?ingredientId=<ingB>` -> 404 "Không tìm thấy nguyên liệu."; UUID ngẫu nhiên cũng 404; OWNER B chỉ thấy 1 dòng của store B; OWNER A không thấy dòng store B | spec inventory.md:58 "404 ID ngoài store" | ĐÚNG | api-matrix.txt |
| 12 | Validation | Query sai | `branchId=abc`, `ingredientId=abc`, `type=FOO`, `type=sale`, `foo=1`, `limit=0/101/abc`, `cursor=abc`, cursor của truy vấn khác filter -> đều 422 VALIDATION_ERROR "Dữ liệu kho không hợp lệ." `details: []` (không chỉ ra field) | spec "422 filter sai" | ĐÚNG (thông báo chung chung) | api-matrix.txt |
| 13 | Phân trang | limit=5 x4 trang | 18 id duy nhất, tập id = kết quả không phân trang; `meta.total`=18 ở mọi trang, nextCursor null ở trang cuối. UI `all()` lặp limit=100: với 153 dòng gọi 2 request (`limit=100` rồi `limit=100&cursor=...`), 153 dòng hiển thị, tải 181 ms (local) | CLAUDE.md quy ước cursor | ĐÚNG | api-matrix.txt |
| 14 | Trạng thái tải | Trì hoãn response 2,5 s | role=status "Đang tải dữ liệu kho…" + 3 skeleton | - | ĐÚNG | ui-loading.png |
| 15 | Trạng thái rỗng | Chi nhánh B3 không có dòng | Bảng "Chưa có bút toán kho" (API 200 `data:[]`, total 0) | - | ĐÚNG (không phân biệt "chưa có dữ liệu" và "bộ lọc không khớp") | ui-empty-branch.png |
| 16 | Trạng thái lỗi | Chặn `stock-movements` bằng page.route | 500 -> alert "Lỗi máy chủ test" (message API) + nút Thử lại, bảng ẩn (0 dòng); abort mạng -> alert "Chưa xác nhận được kết quả. Kiểm tra kết nối và tải lại danh sách trước khi thử lại."; 403 -> "Bạn không có quyền thực hiện thao tác này.". Bỏ chặn rồi bấm Thử lại -> alert mất, 18 dòng. Nút "Tải lại" gọi lại cả 3 request (ingredients, ingredient-stocks, stock-movements) | - | ĐÚNG (thông báo mạng sai ngữ cảnh, xem L2) | ui-error-500.png, ui-error-network.png |
| 17 | Reload | F5 khi đang ở Sổ kho | Phiên giữ (auth/me 200) nhưng app về màn "Cài đặt cửa hàng", không còn ở Kho/Sổ kho; không có dữ liệu kho cũ nào hiện ra | - | ĐÚNG về không lộ dữ liệu; điều hướng không giữ (Low) | - |
| 18 | Đổi phiên không lộ dữ liệu cũ | Đăng xuất OWNER A > đăng nhập MANAGER B1 > đăng xuất > CASHIER B1; ngoài ra OWNER A (response chậm 6 s) đăng xuất ngay > OWNER B | Sau mỗi lần đăng xuất/đăng nhập body không chứa "ZZ Sua"; MANAGER chỉ B1, CASHIER không có Kho; OWNER B chỉ thấy dòng store B kể cả khi response của OWNER A đến muộn (đã chặn đến sau 6 s). Race đổi chi nhánh: chọn B1 trong khi response "Tất cả" chậm 5 s -> sau 8 s vẫn 12 dòng B1 | - | ĐÚNG | ui-race-after-switch.png, ui-branch-race.png |
| 19 | Vùng chạm >= 48 px | Đo bounding box 1024x768 | Tab Tồn kho/Sổ kho/Nguyên liệu 56 px cao; ô chọn Chi nhánh 200x48; Tải lại 113x48; menu bên 68x64. Nút "Thử lại" trong alert lỗi 91x36 (cố ý `minHeight: 36` ở `InventoryScreen.tsx:129`) | DESIGN.md (vùng chạm 48) | SAI một phần (Thử lại 36 px) | - |
| 20 | Bảng cuộn trên 1024x768 | 153 dòng | Không cuộn ngang trang (scrollWidth 1024 = innerWidth); `div.table-wrap` cuộn dọc nội bộ (scrollHeight 8717, clientHeight 512); toàn bộ 153 hàng render vào DOM (không ảo hóa); cột Ghi chú UUID xuống 2 dòng; đơn vị ml/g/piece | - | ĐÚNG (không ảo hóa; ổn ở 153 dòng) | ui-153rows.png |

Chưa kiểm: thanh toán chuyển khoản xác nhận thủ công và SALE do webhook (`source=SYSTEM`, spec cancel-paid test có seed); số dòng rất lớn (>1000) và hiệu năng `all()`; thiết bị cảm ứng thật; kiểm UI cross-store (UI không có cách nhập id ngoài store).

## B. Phân loại phát hiện

### 1. Hành vi đúng (tái dùng được)
- Quyền và phạm vi API: OWNER mọi chi nhánh trong store, MANAGER chỉ chi nhánh phiên, CASHIER 403, PLATFORM_ADMIN 403, không cookie 401, id ngoài store 404.
- SALE/SALE_REVERSAL ghi đúng dấu, balance_after đúng, tổng khớp `branch_ingredient_stocks`; đơn OPEN không sinh dòng; append-only bằng trigger; không có route ghi.
- UI dữ liệu thật, lọc chi nhánh, trạng thái tải/rỗng/lỗi, Thử lại, đổi phiên và race (phiên, chi nhánh) không rò dữ liệu; phân trang `all()` đúng.

### 2. Lỗi/thiếu thật
- Medium M1: OWNER xem "Tất cả chi nhánh" không thấy dòng thuộc chi nhánh nào. Bảng không có cột chi nhánh, API `MovementDto` có `branchId` nhưng không có tên chi nhánh; 6 dòng "Nhập kho" của B1 và B2 giống hệt nhau trong chế độ Tất cả. Tái hiện: OWNER A > Kho > Sổ kho > Tất cả chi nhánh (ui-owner-all.png).
- Medium M2: Cột Ghi chú hiện UUID hóa đơn 36 ký tự thay vì mã hóa đơn (`invoice_code`); khó đọc/đối chiếu. API không trả `invoiceCode`. Tái hiện: xem dòng Xuất bán (`InventoryScreen.tsx:134`).
- Low L1: Nút "Thử lại" trong alert lỗi cao 36 px (<48). Tái hiện: chặn `stock-movements` bằng 500 > đo nút (ui-error-500.png).
- Low L2: Lỗi mạng khi đọc sổ kho hiện "Chưa xác nhận được kết quả. Kiểm tra kết nối và tải lại danh sách trước khi thử lại." (thông điệp dành cho thao tác ghi, từ `http/client.ts`). Tái hiện: abort request `stock-movements`.
- Low L3: Header của MANAGER (và có thể CASHIER) hiển thị "Tất cả chi nhánh" dù chỉ thuộc B1. Tái hiện: đăng nhập `zzsokho_manager_b1` (ui-manager.png).
- Low L4: Reload khi đang ở Kho > Sổ kho quay về "Cài đặt cửa hàng" (không router, không giữ tab). Tái hiện: F5 ở tab Sổ kho.
- Low L5: Tab Sổ kho tải đồng thời ingredients, ingredient-stocks, stock-movements khi mở màn Kho (và trong dev gọi hai lần do StrictMode: mỗi API xuất hiện 2 lần); "Tải lại" gọi cả ba. Không sai dữ liệu.
- Very Low V1: Thứ tự giữa các dòng cùng giao dịch (cùng `created_at`) theo UUID, không ổn định/không theo công thức. Dropdown chi nhánh thứ tự B2 trước B1 (nguồn sắp xếp của `/branches` chưa kiểm sâu).
- Very Low V2: Số dương không có dấu "+" và không có màu theo dấu trong `InventoryScreen` (chỉ chữ số); 422 trả `details: []` và thông báo chung "Dữ liệu kho không hợp lệ.".
- Very Low V3: `POS_UI/src/features/inventory/StockMovementsTab.tsx` là mã mock cũ (dùng `mockStorage`, nhãn "Chứng từ / Ghi chú"), không được import ở đâu (grep không có tham chiếu ngoài chính file) - mã chết.
- Không có lỗi Critical/High.

### 3. Spec/tài liệu lệch hoặc lỗi thời
- `.devloopflow/specs/inventory.md:59`: ví dụ "mảng rỗng trước PB-09" và dòng 60 "không có POST/PATCH/DELETE movement trong Sprint 07" đã lỗi thời so với trạng thái thật (SALE/SALE_REVERSAL đã có từ sprint bán hàng/hủy đơn).
- Spec inventory cho 422 filter sai nhưng không nêu rõ MANAGER gửi branchId (kể cả chi nhánh của mình) trả 422; thực tế đúng như vậy (dòng 57 chỉ nói "không nhận branchId").
- Spec/AC không nói rõ nguồn nhập tồn: chưa có API nhập kho, tồn đầu chỉ có qua SQL (phải seed); `sprints/sprint-10/SPRINT.md:42` chỉ yêu cầu "khi có dữ liệu".
- Chưa có tiêu chí cho cột chi nhánh khi xem "Tất cả chi nhánh" và cách hiển thị chứng từ (mã hóa đơn) trong S10-11.

## C. Kết luận
Cả 5 vế S10-11 (dữ liệu thật theo quyền/chi nhánh, xuất bán + hoàn trả, reload/đổi phiên không lộ dữ liệu, trạng thái rỗng, trạng thái lỗi) đạt về hành vi ở mức đã kiểm; còn lệch về khả dụng (M1, M2) và vùng chạm (L1).
