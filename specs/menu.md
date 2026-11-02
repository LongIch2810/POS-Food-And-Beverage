# PB-05 — Quản lý Thực đơn (Menu & Catalog)

**Trạng thái:** đã chốt ngày 02/11/2026; căn cứ theo kế hoạch Sprint 4 và các quyết định Product Owner đã duyệt trong artifact kế hoạch triển khai PB-05. Đây là hợp đồng đặc tả chính thức, không phải tuyên bố đã nghiệm thu.

## Mục tiêu và phạm vi

- **Mục tiêu:** Cung cấp API và giao diện quản lý toàn bộ thực đơn dùng chung cho cửa hàng: danh mục, món, size, giá bán theo size, topping, liên kết topping với danh mục, và upload/phục vụ ảnh món.
- **Trong phạm vi:**
  - Quản lý danh mục (`categories`): tạo, sửa, ngưng dùng, xóa khi chưa có món, liên kết topping.
  - Quản lý size (`sizes`): tạo, sửa, xóa khi chưa gán cho món.
  - Quản lý món (`products`): tạo, sửa, ngưng dùng, xóa khi chưa có size/đơn hàng, xem chi tiết món kèm size và giá.
  - Quản lý ảnh món (`products.image_base64`, `products.image_mime`): upload ảnh multipart, đọc ảnh nhị phân, xóa ảnh.
  - Quản lý giá theo size (`product_sizes`): gán size cho món, đổi giá, bật/tắt bán theo size, xóa khi chưa có trong đơn hàng.
  - Quản lý topping (`toppings`): tạo, sửa giá, ngưng dùng, xóa khi chưa dùng.
  - Giao diện Quản lý Thực đơn PB-13 (`ProductsScreen.tsx`) kết nối API thật.
- **Ngoài phạm vi:**
  - Công thức định lượng nguyên liệu cho món và topping (thuộc PB-08 Kho).
  - Nối API cho màn hình chọn món bán hàng POS (`POSScreen`) (chờ PB-07 Bán hàng).
  - Mã giảm giá / khuyến mãi (thuộc module Khuyến mãi).
- **Tài liệu và quy tắc liên quan:**
  - `docs/PRODUCT_OVERVIEW.md` mục 4, 5, 8.
  - `docs/BUSINESS_RULES.md`: BR-08, BR-09, BR-10, BR-11, BR-12, BR-13, BR-80, BR-81, BR-100, BR-103, BR-105.
  - `docs/DESIGN_DB_POS_SYSTEM.md`: 6 bảng danh mục sản phẩm.
  - `docs/api-spec.md`: quy ước chung HTTP, authentication, errors, pagination.

## Quyết định và điểm cần chốt

- **Đã chốt:**
  - Quyền hạn: `menu.manage` cấp cho `OWNER` và `MANAGER`. `menu.read` cấp cho `OWNER`, `MANAGER` và `CASHIER`. `PLATFORM_ADMIN` không có quyền truy cập dữ liệu thực đơn vận hành của store (BR-81).
  - Menu dùng chung toàn store: Mọi chi nhánh của một store đều bán cùng menu và cùng giá (BR-100).
  - Quy tắc ngưng dùng vs xóa cứng (BR-10): Dữ liệu đã có tham chiếu không xóa cứng, chỉ `PATCH isActive = false`. Thao tác `DELETE` chỉ thành công (204) khi bản ghi chưa có bất kỳ liên kết/tham chiếu nào trong DB; nếu đã có tham chiếu, trả về `409 RESOURCE_IN_USE`.
  - Quy chuẩn ảnh món (BR-105): Dung lượng file tối đa 2.000.000 bytes (2 MB); chỉ chấp nhận định dạng ảnh an toàn `image/jpeg`, `image/png`, `image/webp`. Lưu Base64 thuần trong cột `image_base64` và MIME trong `image_mime`. Endpoint đọc `GET /api/v1/products/{id}/image` trả bytes nhị phân kèm Content-Type tương ứng. Danh sách món chỉ trả field `imageUrl` (chuỗi URL endpoint đọc ảnh hoặc `null`), tuyệt đối không trả chuỗi Base64.
  - Giá bán: Số nguyên VND `bigint` (từ 0 đến 1.000.000.000.000 đồng) theo BR-13 và BR-103.
  - Tên không trùng: `UNIQUE(store_id, name)` đối với `categories`, `sizes`, `toppings`; `UNIQUE(category_id, name)` đối với `products`. Tên được trim khoảng trắng đầu/cuối trước khi lưu.
- **Còn mở:** Không còn quyết định nghiệp vụ mở trong phạm vi.

## Luồng và hành vi

### 1. Quyền và ranh giới dữ liệu
- Mọi request đều được xác thực danh tính qua HttpOnly Access Cookie (`AccessGuard`).
- `storeId` luôn được trích xuất từ token/phiên của người dùng hiện hành; không chấp nhận `storeId` từ body, query hay header (BR-80).
- Mọi `id` tài nguyên gửi lên trong path/body (như `categoryId`, `sizeId`, `toppingId`, `productId`) phải thuộc cùng cửa hàng với người gọi. Nếu không thuộc hoặc không tồn tại, trả `404 NOT_FOUND` (không tiết lộ sự tồn tại ở cửa hàng khác).

### 2. Trạng thái ngưng hoạt động (`isActive = false`)
- Món hoặc size hoặc topping có `isActive = false` vẫn lưu trữ đầy đủ trong DB để bảo toàn lịch sử hóa đơn cũ.
- Khi truy vấn phục vụ bán hàng (màn POS trong tương lai), chỉ lấy các mục có `isActive = true` (BR-09). Màn hình quản lý thực đơn của chủ quán (`OWNER`) cho phép xem cả danh sách active lẫn inactive thông qua query `isActive`.

### 3. Quy trình tải và xóa ảnh món
- Upload ảnh qua `POST /api/v1/products/{id}/image` với `multipart/form-data` chứa field file `image`. Máy chủ kiểm tra MIME type thực tế và dung lượng. Sau đó mã hóa Base64 thuần và ghi đè vào dòng sản phẩm.
- Xóa ảnh qua `DELETE /api/v1/products/{id}/image`: gán `image_base64 = null, image_mime = null`.

## Quy ước chung

- Chuẩn REST API: Base path `/api/v1`, JSON UTF-8 camelCase, UUID v4 dạng chuỗi, thời gian ISO-8601 UTC.
- Các route mutation (`POST`, `PATCH`, `DELETE`) yêu cầu header `Origin` khớp cấu hình và `X-CSRF-Token` hợp lệ (`JsonBodyGuard`).
- Bắt buộc kiểm tra validation với `ValidationPipe` (whitelist, forbidNonWhitelisted, transform). Body gửi sai schema hoặc field lạ trả `422 VALIDATION_ERROR`.
- Phân trang: Áp dụng cho các danh sách có thể dài (`categories`, `products`, `toppings`). Sử dụng cursor base-64 opaque do server cấp, query params `limit` (mặc định 20, tối đa 100) và `cursor`. Sort mặc định `-createdAt` kết hợp tie-break `id DESC`. Meta trả về `{ limit, nextCursor, total }`.
- Danh mục `sizes` và liên kết `category_toppings` có số lượng giới hạn theo từng món/store nên trả về danh sách đầy đủ.

---

## Endpoint chi tiết

### 1. Categories (Danh mục)

#### GET /api/v1/categories
1. **Mô tả:** Liệt kê danh mục món của cửa hàng.
2. **Quyền:** `menu.read`; mặc định `OWNER`, `MANAGER`, `CASHIER`.
3. **Phạm vi:** Cửa hàng hiện hành (`storeId`).
4. **Business rule:** BR-80, BR-100.
5. **Request:** Không body. Query tùy chọn: `limit`, `cursor`, `isActive` (`true` | `false`).
6. **Response thành công:** `200 OK`
```json
{
  "data": [
    {
      "id": "30000000-0000-4000-8000-000000000001",
      "storeId": "20000000-0000-4000-8000-000000000001",
      "name": "Cà phê",
      "description": "Các món cà phê pha phin và máy",
      "sortOrder": 1,
      "isActive": true,
      "createdAt": "2026-11-02T00:00:00.000Z",
      "updatedAt": "2026-11-02T00:00:00.000Z"
    }
  ],
  "meta": {
    "limit": 20,
    "nextCursor": null,
    "total": 1
  }
}
```
7. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 401 | UNAUTHENTICATED / TOKEN_EXPIRED | Chưa đăng nhập hoặc token hết hạn |
   | 403 | PERMISSION_DENIED | Không có quyền `menu.read` hoặc `PLATFORM_ADMIN` |
   | 422 | VALIDATION_ERROR | Query param không hợp lệ |

#### POST /api/v1/categories
1. **Mô tả:** Tạo danh mục mới trong cửa hàng.
2. **Quyền:** `menu.manage`; mặc định `OWNER`, `MANAGER`.
3. **Phạm vi:** Cửa hàng hiện hành (`storeId`).
4. **Business rule:** BR-13, BR-80.
5. **Request:** Body JSON:
   - `name`: string, 1–100 ký tự sau khi trim, bắt buộc.
   - `description`: string, tối đa 500 ký tự hoặc null, tùy chọn.
   - `sortOrder`: integer >= 0, tùy chọn (mặc định 0).
6. **Response thành công:** `201 Created` kèm `{ "data": CategoryDto }`.
7. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 409 | DUPLICATE_RESOURCE | Tên danh mục đã tồn tại trong cửa hàng (BR-13) |
   | 422 | VALIDATION_ERROR | Thiếu trường bắt buộc hoặc dữ liệu không hợp lệ |

#### PATCH /api/v1/categories/:id
1. **Mô tả:** Cập nhật thông tin hoặc ngưng dùng danh mục.
2. **Quyền:** `menu.manage`.
3. **Phạm vi:** Cửa hàng hiện hành.
4. **Business rule:** BR-10, BR-13, BR-80.
5. **Request:** Path `id` (UUID). Body JSON (ít nhất 1 field):
   - `name`: string, 1–100 ký tự sau khi trim, tùy chọn.
   - `description`: string hoặc null, tùy chọn.
   - `sortOrder`: integer >= 0, tùy chọn.
   - `isActive`: boolean, tùy chọn.
6. **Response thành công:** `200 OK` kèm `{ "data": CategoryDto }`.
7. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 404 | NOT_FOUND | Danh mục không tồn tại hoặc khác cửa hàng |
   | 409 | DUPLICATE_RESOURCE | Tên mới bị trùng với danh mục khác trong cửa hàng |

#### DELETE /api/v1/categories/:id
1. **Mô tả:** Xóa cứng danh mục rỗng (chưa có món nào).
2. **Quyền:** `menu.manage`.
3. **Phạm vi:** Cửa hàng hiện hành.
4. **Business rule:** BR-10, BR-80.
5. **Request:** Path `id` (UUID). Không body.
6. **Response thành công:** `204 No Content`.
7. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 404 | NOT_FOUND | Danh mục không tồn tại hoặc khác cửa hàng |
   | 409 | RESOURCE_IN_USE | Danh mục đã có sản phẩm tham chiếu, không được xóa cứng (BR-10) |

#### GET /api/v1/categories/:id/toppings
1. **Mô tả:** Lấy danh sách topping được phép chọn cho danh mục này.
2. **Quyền:** `menu.read`.
3. **Phạm vi:** Cửa hàng hiện hành.
4. **Business rule:** BR-11, BR-80.
5. **Response thành công:** `200 OK` kèm `{ "data": ToppingDto[] }`.

#### POST /api/v1/categories/:id/toppings
1. **Mô tả:** Liên kết một topping vào danh mục món.
2. **Quyền:** `menu.manage`.
3. **Phạm vi:** Cửa hàng hiện hành (danh mục và topping phải cùng store).
4. **Business rule:** BR-11, BR-80.
5. **Request:** Path `id` (UUID danh mục). Body: `{ "toppingId": "uuid" }`.
6. **Response thành công:** `201 Created` kèm `{ "data": { "categoryId": "uuid", "toppingId": "uuid" } }`.
7. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 404 | NOT_FOUND | Danh mục hoặc topping không tồn tại / khác store |
   | 409 | DUPLICATE_RESOURCE | Topping đã được liên kết với danh mục từ trước |

#### DELETE /api/v1/categories/:id/toppings/:toppingId
1. **Mô tả:** Gỡ liên kết topping khỏi danh mục.
2. **Quyền:** `menu.manage`.
3. **Response thành công:** `204 No Content`.

---

### 2. Sizes (Kích cỡ)

#### GET /api/v1/sizes
1. **Mô tả:** Liệt kê các kích cỡ (M, L, XL...) của cửa hàng.
2. **Quyền:** `menu.read`.
3. **Response thành công:** `200 OK` kèm `{ "data": SizeDto[] }`.

#### POST /api/v1/sizes
1. **Mô tả:** Tạo kích cỡ mới trong cửa hàng.
2. **Quyền:** `menu.manage`.
3. **Request:** Body JSON:
   - `name`: string, 1–20 ký tự, bắt buộc.
   - `sortOrder`: integer >= 0, tùy chọn (mặc định 0).
4. **Response thành công:** `201 Created` kèm `{ "data": SizeDto }`.
5. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 409 | DUPLICATE_RESOURCE | Tên size đã tồn tại trong cửa hàng (BR-13) |

#### PATCH /api/v1/sizes/:id
1. **Mô tả:** Cập nhật thông tin size.
2. **Quyền:** `menu.manage`.
3. **Request:** Body: `name` (string), `sortOrder` (integer).
4. **Response thành công:** `200 OK` kèm `{ "data": SizeDto }`.

#### DELETE /api/v1/sizes/:id
1. **Mô tả:** Xóa size khi chưa gán cho món nào.
2. **Quyền:** `menu.manage`.
3. **Response thành công:** `204 No Content`.
4. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 409 | RESOURCE_IN_USE | Size đã có món sử dụng (tồn tại `product_sizes`) (BR-10) |

---

### 3. Products (Món ăn / Đồ uống)

#### GET /api/v1/products
1. **Mô tả:** Liệt kê món ăn, đồ uống trong cửa hàng kèm thông tin danh mục, size/giá và đường dẫn ảnh.
2. **Quyền:** `menu.read`.
3. **Phạm vi:** Cửa hàng hiện hành.
4. **Request:** Query tùy chọn:
   - `categoryId`: UUID danh mục cần lọc.
   - `isActive`: boolean (`true` | `false`).
   - `limit`: integer (1..100, mặc định 20).
   - `cursor`: string opaque.
5. **Response thành công:** `200 OK`
```json
{
  "data": [
    {
      "id": "40000000-0000-4000-8000-000000000001",
      "categoryId": "30000000-0000-4000-8000-000000000001",
      "categoryName": "Cà phê",
      "name": "Cà phê sữa đá",
      "description": "Cà phê Robusta pha phin đậm đà",
      "imageUrl": "/api/v1/products/40000000-0000-4000-8000-000000000001/image",
      "isActive": true,
      "sizes": [
        {
          "id": "50000000-0000-4000-8000-000000000001",
          "sizeId": "60000000-0000-4000-8000-000000000001",
          "sizeName": "M",
          "price": 29000,
          "isActive": true
        }
      ],
      "createdAt": "2026-11-02T00:00:00.000Z",
      "updatedAt": "2026-11-02T00:00:00.000Z"
    }
  ],
  "meta": {
    "limit": 20,
    "nextCursor": null,
    "total": 1
  }
}
```
*Ghi chú:* Tuyệt đối không chọn cột `image_base64` trong truy vấn SQL danh sách để tối ưu hiệu năng và băng thông.

#### GET /api/v1/products/:id
1. **Mô tả:** Lấy chi tiết 1 món kèm danh sách các size và giá.
2. **Quyền:** `menu.read`.
3. **Response thành công:** `200 OK` kèm `{ "data": ProductDetailDto }`.

#### POST /api/v1/products
1. **Mô tả:** Tạo món mới trong danh mục.
2. **Quyền:** `menu.manage`.
3. **Request:** Body JSON:
   - `categoryId`: UUID danh mục, bắt buộc.
   - `name`: string, 1–150 ký tự sau khi trim, bắt buộc.
   - `description`: string hoặc null, tùy chọn.
4. **Response thành công:** `201 Created` kèm `{ "data": ProductDto }`.
5. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 404 | NOT_FOUND | `categoryId` không tồn tại hoặc khác cửa hàng |
   | 409 | DUPLICATE_RESOURCE | Tên món đã tồn tại trong cùng danh mục (BR-13) |

#### PATCH /api/v1/products/:id
1. **Mô tả:** Cập nhật thông tin món (tên, mô tả, danh mục, trạng thái).
2. **Quyền:** `menu.manage`.
3. **Request:** Body JSON (ít nhất 1 trường):
   - `categoryId`: UUID danh mục mới (nếu chuyển nhóm).
   - `name`: string, 1–150 ký tự.
   - `description`: string hoặc null.
   - `isActive`: boolean.
4. **Response thành công:** `200 OK` kèm `{ "data": ProductDto }`.
5. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 404 | NOT_FOUND | Món hoặc danh mục mới không tồn tại / khác store |
   | 409 | DUPLICATE_RESOURCE | Tên món bị trùng trong danh mục đích (BR-13) |

#### DELETE /api/v1/products/:id
1. **Mô tả:** Xóa món ăn chưa từng được cấu hình size hoặc bán.
2. **Quyền:** `menu.manage`.
3. **Response thành công:** `204 No Content`.
4. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 409 | RESOURCE_IN_USE | Món đã có cấu hình size (`product_sizes`) hoặc đơn hàng cũ tham chiếu (BR-10) |

#### POST /api/v1/products/:id/image
1. **Mô tả:** Upload ảnh đại diện cho món ăn.
2. **Quyền:** `menu.manage`.
3. **Request:** Header `Content-Type: multipart/form-data`. Field: `image` (binary file).
   - Giới hạn: Kích thước <= 2.000.000 bytes.
   - Định dạng: `image/jpeg`, `image/png`, `image/webp`.
4. **Response thành công:** `200 OK` kèm `{ "data": { "imageUrl": "/api/v1/products/{id}/image" } }`.
5. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 400 | BAD_REQUEST / INVALID_IMAGE | Định dạng không cho phép hoặc file không phải ảnh hợp lệ |
   | 413 | FILE_TOO_LARGE | Dung lượng vượt quá 2.000.000 bytes (BR-105) |
   | 404 | NOT_FOUND | Món không tồn tại hoặc khác cửa hàng |

#### GET /api/v1/products/:id/image
1. **Mô tả:** Tải dữ liệu nhị phân của ảnh món ăn.
2. **Quyền:** `menu.read`. Yêu cầu access cookie hợp lệ; kiểm tra món thuộc đúng `store_id` của phiên.
3. **Request:** Không body, không query.
4. **Response thành công:** `200 OK`, `Content-Type: image/jpeg` (hoặc mime tương ứng), body là raw binary bytes.
5. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 404 | NOT_FOUND | Món không tồn tại, khác cửa hàng hoặc món chưa có ảnh |

#### DELETE /api/v1/products/:id/image
1. **Mô tả:** Xóa ảnh đại diện của món ăn.
2. **Quyền:** `menu.manage`.
3. **Response thành công:** `204 No Content`.

---

### 4. Product Sizes & Pricing (Size và Giá bán của món)

#### POST /api/v1/products/:id/sizes
1. **Mô tả:** Thiết lập một kích cỡ kèm giá bán cho món ăn.
2. **Quyền:** `menu.manage`.
3. **Business rule:** BR-08, BR-13, BR-103.
4. **Request:** Body JSON:
   - `sizeId`: UUID của size trong cùng cửa hàng, bắt buộc.
   - `price`: integer, giá tiền VND >= 0 và <= 1.000.000.000.000, bắt buộc.
5. **Response thành công:** `201 Created` kèm `{ "data": ProductSizeDto }`.
6. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 404 | NOT_FOUND | Món hoặc Size không tồn tại / khác cửa hàng |
   | 409 | DUPLICATE_RESOURCE | Món đã được thiết lập size này từ trước |
   | 422 | VALIDATION_ERROR | Giá âm hoặc vượt trần 1.000 tỷ VND (BR-103) |

#### PATCH /api/v1/product-sizes/:id
1. **Mô tả:** Cập nhật giá bán hoặc bật/tắt bán kích cỡ của món.
2. **Quyền:** `menu.manage`.
3. **Business rule:** BR-09, BR-12, BR-103.
4. **Request:** Path `id` (UUID của `product_sizes`). Body JSON (ít nhất 1 trường):
   - `price`: integer >= 0 và <= 1.000.000.000.000, tùy chọn.
   - `isActive`: boolean, tùy chọn.
5. **Response thành công:** `200 OK` kèm `{ "data": ProductSizeDto }`.
6. **Ghi chú xử lý:** Việc đổi giá chỉ áp dụng cho các lần thêm món vào hóa đơn sau thời điểm đổi. Không sửa giá các dòng hóa đơn cũ (BR-12).

#### DELETE /api/v1/product-sizes/:id
1. **Mô tả:** Xóa cấu hình size của món nếu chưa từng có trong đơn hàng nào.
2. **Quyền:** `menu.manage`.
3. **Response thành công:** `204 No Content`.
4. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 409 | RESOURCE_IN_USE | Size này của món đã phát sinh hóa đơn bán hàng cũ (BR-10) |

---

### 5. Toppings (Món thêm)

#### GET /api/v1/toppings
1. **Mô tả:** Liệt kê danh sách topping của cửa hàng.
2. **Quyền:** `menu.read`.
3. **Response thành công:** `200 OK` kèm `{ "data": ToppingDto[], "meta": PageMeta }`.

#### POST /api/v1/toppings
1. **Mô tả:** Tạo topping mới.
2. **Quyền:** `menu.manage`.
3. **Request:** Body JSON:
   - `name`: string, 1–100 ký tự sau khi trim, bắt buộc.
   - `price`: integer, giá tiền VND >= 0 và <= 1.000.000.000.000, bắt buộc.
4. **Response thành công:** `201 Created` kèm `{ "data": ToppingDto }`.
5. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 409 | DUPLICATE_RESOURCE | Tên topping đã tồn tại trong cửa hàng (BR-13) |
   | 422 | VALIDATION_ERROR | Giá âm hoặc vượt trần (BR-103) |

#### PATCH /api/v1/toppings/:id
1. **Mô tả:** Cập nhật tên, giá hoặc ngưng dùng topping.
2. **Quyền:** `menu.manage`.
3. **Request:** Body JSON: `name`, `price`, `isActive`.
4. **Response thành công:** `200 OK` kèm `{ "data": ToppingDto }`.

#### DELETE /api/v1/toppings/:id
1. **Mô tả:** Xóa topping chưa từng được liên kết hay phát sinh hóa đơn.
2. **Quyền:** `menu.manage`.
3. **Response thành công:** `204 No Content`.
4. **Lỗi:**
   | HTTP | Mã lỗi | Điều kiện |
   | --- | --- | --- |
   | 409 | RESOURCE_IN_USE | Topping đã nằm trong `category_toppings` hoặc đơn hàng cũ (BR-10) |

---

## Nghiệm thu và bằng chứng

- [ ] **DB & Ràng buộc:**
  - Migration tạo đúng 6 bảng, đầy đủ chỉ mục UNIQUE theo `store_id` (hoặc `category_id`) và CHECK giá tiền.
  - Gán quyền `menu.read` cho `OWNER`, `MANAGER`, `CASHIER` và `menu.manage` cho `OWNER`, `MANAGER`.
- [ ] **Bảo mật & Cô lập Tenant:**
  - `store_id` lấy hoàn toàn từ token phiên.
  - Không đọc hoặc sửa chéo tài nguyên của store khác (trả 404).
  - `PLATFORM_ADMIN` bị chặn `403 PERMISSION_DENIED` trên mọi route menu.
- [ ] **Logic Nghiệp vụ:**
  - Món phải có size và giá mới đủ điều kiện bán (BR-08).
  - Tên không trùng lặp trong cùng phạm vi (BR-13).
  - Không xóa cứng dữ liệu đã có tham chiếu; trả về `409 RESOURCE_IN_USE` (BR-10).
  - Upload ảnh kiểm tra MIME và kích thước <= 2 MB; response danh sách chỉ trả URL ảnh (BR-105).
- [ ] **Giao diện PB-13:**
  - Màn hình Quản lý Thực đơn hiển thị dữ liệu thật từ PostgreSQL.
  - Thao tác tạo, sửa, đổi giá, gán topping và upload ảnh phản ánh ngay lên UI và giữ nguyên sau khi reload F5.
- [ ] **Bằng chứng QA:**
  - Lưu kết quả chạy test tự động (`node:test`, TypeORM integration test).
  - Lưu log curl/http request-response đã che dữ liệu nhạy cảm.
  - Ghi nhận đầy đủ vào thư mục `qa-evidence/` kèm commit hash và exit code.

