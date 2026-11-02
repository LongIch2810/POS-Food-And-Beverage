# Thiết kế cơ sở dữ liệu: POS và kho cho quán cà phê

Hệ thống nhiều cửa hàng (`stores`), mỗi cửa hàng có nhiều chi nhánh (`branches`). Tổng cộng **28 bảng**, chia **6 nhóm**. Dữ liệu của mỗi cửa hàng được cô lập bằng `store_id`.

---

## Phần 1: Các bảng trong hệ thống

Phạm vi dữ liệu của từng bảng:

| Phạm vi             | Ý nghĩa                                                               |
| ------------------- | --------------------------------------------------------------------- |
| Thuộc cửa hàng      | Có cột `store_id` riêng. Mỗi cửa hàng có bộ dữ liệu riêng             |
| Theo chi nhánh      | Có cột `branch_id`. Mỗi chi nhánh có dữ liệu vận hành riêng           |
| Kế thừa             | Không có cột riêng, biết cửa hàng hoặc chi nhánh qua bảng cha         |
| Dùng chung nền tảng | Không thuộc cửa hàng nào (`roles`, `permissions`, `role_permissions`) |

### 1. Tổ chức (3 bảng)

| Bảng            | Mô tả                                                                                                                                                                                                                                                                  | Quan hệ chính                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `stores`        | Cửa hàng hoặc thương hiệu, là khách hàng của nền tảng, ví dụ "Cafe Ông Long". Mỗi cửa hàng là một vùng dữ liệu riêng. Lưu tên, thông tin liên hệ, trạng thái `ACTIVE` hoặc `SUSPENDED`. Do quản trị nền tảng tạo và quản lý.                                           | Một store có nhiều `branches`, `users`, `categories`, `sizes`, `toppings`, `ingredients`, `promotion_codes`                    |
| `branches`      | Chi nhánh của cửa hàng, ví dụ Nam Lý, Đồng Hới. Có mã ngắn (như `NL`, `DH`) để quản lý chi nhánh, kèm địa chỉ, quỹ tiền ban đầu của két (`initial_cash`) và trạng thái. Chi nhánh ngưng hoạt động thì không mở ca hay tạo đơn mới, nhưng dữ liệu cũ giữ nguyên. | Thuộc một `store`. Có nhiều `dining_tables`, `users`, `work_shifts`, `invoices`, `branch_ingredient_stocks`, `stock_movements` |
| `dining_tables` | Bàn của từng chi nhánh, ví dụ Bàn 1, Bàn 18, kèm khu vực (tầng, sân vườn) và số chỗ. Tên bàn không trùng trong cùng chi nhánh. Trạng thái "có khách / trống" **không lưu thành cột**, mà tính từ việc bàn đó có đơn `OPEN` hay không.                                  | Thuộc một `branch`. `invoices.table_id` trỏ tới đây                                                                            |

### 2. Danh mục sản phẩm (6 bảng)

Menu **dùng chung toàn cửa hàng**: mọi chi nhánh của cùng một store bán cùng một menu và cùng giá. Menu của cửa hàng này tách biệt hoàn toàn với cửa hàng khác. Ba bảng gốc (`categories`, `sizes`, `toppings`) có `store_id`. Các bảng còn lại biết cửa hàng qua bảng cha.

| Bảng                | Mô tả                                                                                                                                                                                                                                               | Quan hệ chính                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `categories`        | Danh mục món: cà phê, trà sữa, bánh... Có thứ tự hiển thị trên màn hình POS, ẩn danh mục bằng cờ hoạt động thay vì xóa. Thuộc một cửa hàng.                                                                                                         | Thuộc một `store`. Một danh mục có nhiều `products`. Nối nhiều-nhiều với `toppings` qua `category_toppings`                           |
| `products`          | Món bán: cà phê đen, cà phê sữa, nước ép cam, bánh ngọt... Thuộc một danh mục. Món **không giữ giá**, giá nằm ở `product_sizes`. Ngưng bán bằng cờ hoạt động.                                                                                       | Thuộc một `category`. Có nhiều `product_sizes`                                                                                        |
| `sizes`             | Danh sách size của cửa hàng: M, L, XL, XXL... kèm thứ tự sắp xếp.                                                                                                                                                                                   | Thuộc một `store`. Dùng bởi `product_sizes`                                                                                           |
| `product_sizes`     | Món × size, **mang giá bán hiện tại**. Ví dụ cà phê sữa size M 29.000đ, size L 35.000đ. Hóa đơn lấy giá từ đây rồi lưu snapshot nên đổi giá không làm sai hóa đơn cũ. Đây cũng là điểm gắn công thức nguyên liệu, vì mỗi size dùng lượng khác nhau. | Thuộc một `product` và một `size`. Được tham chiếu bởi `invoice_items` và `product_size_ingredients`                                  |
| `toppings`          | Topping bán kèm: trân châu đen, trân châu trắng, thạch cà phê, bánh flan... kèm giá. Thuộc một cửa hàng.                                                                                                                                            | Thuộc một `store`. Nối với `categories` qua `category_toppings`. Được tham chiếu bởi `invoice_item_toppings` và `topping_ingredients` |
| `category_toppings` | Bảng nối quy định danh mục nào được thêm topping nào. Ví dụ trà sữa thêm được trân châu, bánh thì không. Danh mục và topping phải cùng cửa hàng.                                                                                                    | Nối `categories` và `toppings`                                                                                                        |

### 3. Xác thực và phân quyền (5 bảng)

| Bảng               | Mô tả                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Quan hệ chính                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `roles`            | Vai trò dùng chung toàn nền tảng: `PLATFORM_ADMIN` (quản trị nền tảng), `OWNER` (chủ cửa hàng), `MANAGER` (quản lý), `CASHIER` (thu ngân). Dùng mã ổn định để code tham chiếu.                                                                                                                                                                                                                                                                                                                        | Một role có nhiều `users` và nhiều `permissions`                                                                                 |
| `permissions`      | Quyền truy cập từng chức năng API, đặt tên dạng `module.action`, ví dụ `invoice.cancel`, `product.update`, `shift.force_close`, `branch.access_all`, `store.create`, `store.suspend`.                                                                                                                                                                                                                                                                                                                 | Nối với `roles` qua `role_permissions`                                                                                           |
| `role_permissions` | Bảng nối cho biết vai trò nào có quyền nào. Code kiểm tra quyền theo bảng này, không kiểm tra theo tên vai trò cứng.                                                                                                                                                                                                                                                                                                                                                                                  | Nối `roles` và `permissions`                                                                                                     |
| `users`            | Tài khoản đăng nhập, do cấp trên tạo (không có đăng ký công khai). Mật khẩu chỉ lưu dạng băm. Mỗi người có một vai trò. Có `store_id`: mọi người thuộc một cửa hàng, riêng `PLATFORM_ADMIN` để NULL. Có `branch_id`: thu ngân và quản lý bắt buộc gắn một chi nhánh, còn `OWNER` để NULL nghĩa là xem được toàn cửa hàng. Tài khoản mới cấp bị buộc đổi mật khẩu ở lần đăng nhập đầu (`must_change_password`). Nhân viên nghỉ việc thì khóa tài khoản chứ không xóa, vì còn ca và hóa đơn tham chiếu. | Thuộc một `role`, một `store` (NULL với quản trị nền tảng), một `branch` (có thể NULL). Có nhiều `work_shifts`, `refresh_tokens` |
| `refresh_tokens`   | Lưu **hash** của refresh token, thời hạn, thời điểm thu hồi. Đăng xuất, đổi mật khẩu hoặc khóa cửa hàng thì đánh dấu đã thu hồi.                                                                                                                                                                                                                                                                                                                                                                      | Thuộc một `user`                                                                                                                 |

Bốn cấp vai trò:

| Vai trò          | Thuộc                 | Làm gì                                                                                                                 |
| ---------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `PLATFORM_ADMIN` | Không thuộc store nào | Tạo và quản lý cửa hàng, cấp tài khoản `OWNER`, khóa hoặc mở lại cửa hàng. **Không xem dữ liệu vận hành** của cửa hàng |
| `OWNER`          | Một store             | Quản lý chi nhánh, menu, tài khoản nhân viên, xem mọi chi nhánh (có quyền `branch.access_all`)                         |
| `MANAGER`        | Một chi nhánh         | Quản lý vận hành chi nhánh: kho, báo cáo, duyệt hủy đơn, đóng cưỡng chế ca                                             |
| `CASHIER`        | Một chi nhánh         | Bán hàng, thanh toán, mở và đóng ca của mình                                                                           |

### 4. Bán hàng (6 bảng)

| Bảng                      | Mô tả                                                                                                                                                                                                                                                       | Quan hệ chính                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `invoices`                | Hóa đơn. Thuộc một chi nhánh, một ca, một bàn (nếu ăn tại chỗ) và người lập. Có mã `HD` cộng 8 ký tự ngẫu nhiên để đối chiếu chuyển khoản. Trạng thái `OPEN` → `PAID` hoặc `CANCELLED`. Lưu tổng tiền hàng, tiền giảm giá, tổng phải trả, lý do và người hủy. | Thuộc `branch`, `work_shift`, `dining_table` (có thể NULL), `user`. Có nhiều `invoice_items`, `payments`, `invoice_promotion_codes` |
| `invoice_items`           | Từng dòng món trong hóa đơn (ví dụ 2 ly cà phê sữa size L). **Lưu snapshot** tên món, tên size, đơn giá lúc bán, số lượng, thành tiền, ghi chú. Giá do hệ thống tính, thu ngân không gõ tay.                                                                | Thuộc một `invoice`, tham chiếu `product_size`. Có nhiều `invoice_item_toppings`                                                    |
| `invoice_item_toppings`   | Topping kèm theo từng dòng món. Snapshot tên và giá topping, số phần topping trên mỗi ly, thành tiền cả dòng. Dùng để tính tiền và trừ kho topping.                                                                                                         | Thuộc một `invoice_item`, tham chiếu `topping`                                                                                      |
| `payments`                | Thanh toán của hóa đơn: tiền mặt hoặc chuyển khoản. Lưu số tiền tính cho hóa đơn (con số dùng để đối soát), tiền khách đưa, tiền thối, mã giao dịch ngân hàng, khóa chống thanh toán trùng.                                                                 | Thuộc một `invoice` và người thu                                                                                                    |
| `promotion_codes`         | Mã giảm giá dùng chung toàn cửa hàng: loại giảm (phần trăm hoặc số tiền cố định), mức giảm, trần giảm, đơn tối thiểu, thời hạn, giới hạn lượt dùng, số lượt đã dùng.                                                                                        | Thuộc một `store`. Được dùng qua `invoice_promotion_codes`                                                                          |
| `invoice_promotion_codes` | Hóa đơn đã áp mã nào, kèm số tiền thực giảm và snapshot mã.                                                                                                                                                                                                 | Nối `invoices` và `promotion_codes`                                                                                                 |

### 5. Ca làm và đối soát (3 bảng)

| Bảng                   | Mô tả                                                                                                                                                                                                                                                                                                                         | Quan hệ chính                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `work_shifts`          | Ca làm của mọi nhân viên: ai làm, ở chi nhánh nào, loại ca (`CASHIER` giữ két, `STAFF` chỉ ghi giờ), giờ vào, giờ ra, trạng thái `OPEN` hoặc `CLOSED`. Số giờ làm được tính từ giờ vào và giờ ra. Mỗi người chỉ có một ca đang mở, và mỗi chi nhánh chỉ có một ca thu ngân đang mở. Quản lý có thể đóng cưỡng chế ca bị quên. | Thuộc một `user` và một `branch`. Có một `cash_reconciliation` (nếu là ca thu ngân), nhiều `shift_expenses`, nhiều `invoices` |
| `cash_reconciliations` | Đối soát tiền mặt của ca thu ngân, tối đa một bản mỗi ca. Lưu tiền đầu ca, tiền mặt bán được, chi phí trong ca, tiền hệ thống tính phải có trong két, tiền thu ngân đếm thực tế, chênh lệch và trạng thái khớp, thiếu hoặc thừa. Chỉ tính tiền mặt, chuyển khoản không vào đây.                                               | Quan hệ 1-1 với `work_shift`                                                                                                  |
| `shift_expenses`       | Các khoản chi giữa ca: mua đá, mua cà phê, sửa quạt... Mỗi khoản có số tiền, lý do bắt buộc, và cờ cho biết có lấy từ két hay không (chỉ khoản lấy từ két mới trừ vào tiền kỳ vọng).                                                                                                                                          | Thuộc một `work_shift`                                                                                                        |

### 6. Kho và công thức (5 bảng)

| Bảng                       | Mô tả                                                                                                                                                                                                                        | Quan hệ chính                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `ingredients`              | Danh mục nguyên liệu của cửa hàng: hạt cà phê, đường, đá, bột, trứng... kèm đơn vị gốc (g, ml, cái). Mọi công thức và sổ kho dùng đúng đơn vị này. **Không giữ tồn kho**, vì tồn kho khác nhau theo chi nhánh.               | Thuộc một `store`. Được dùng bởi các bảng công thức, tồn kho, sổ kho |
| `product_size_ingredients` | Công thức theo món và size: một ly món X size Y dùng bao nhiêu của mỗi nguyên liệu. Dùng chung mọi chi nhánh của cửa hàng vì cùng một ly cà phê sữa ở đâu cũng pha như nhau.                                                 | Nối `product_sizes` và `ingredients`                                 |
| `topping_ingredients`      | Công thức của topping: một phần topping dùng bao nhiêu nguyên liệu.                                                                                                                                                          | Nối `toppings` và `ingredients`                                      |
| `branch_ingredient_stocks` | Tồn kho từng nguyên liệu **tại từng chi nhánh**, kèm ngưỡng tồn tối thiểu riêng. Giá trị luôn bằng tổng các dòng sổ kho của chi nhánh đó, cập nhật bằng phép cộng trừ nguyên tử để hai thu ngân bán cùng lúc không làm lệch. | Nối `branches` và `ingredients`                                      |
| `stock_movements`          | Sổ kho: mỗi lần nhập, bán, hoàn kho khi hủy đơn, hao hụt, kiểm kê là một dòng, có dấu cộng hoặc trừ và tồn sau giao dịch. Chỉ thêm dòng mới, không sửa, không xóa. Dòng do bán thì gắn hóa đơn.                              | Thuộc một `branch` và một `ingredient`, có thể tham chiếu `invoice`  |

---

## Phần 2: Các bảng với đầy đủ field

Nhãn **[MỚI]** là bảng mới, **[SỬA]** là bảng đã đổi so với bản 24 bảng một thương hiệu, không nhãn là giữ nguyên.

### Quy ước chung

- `id`: `uuid`, PK, mặc định `gen_random_uuid()`.
- `created_at`, `updated_at`: `timestamptz` (UTC), NOT NULL, mặc định `now()`. Bảng nối thuần không có.
- **Tiền**: `bigint`, đơn vị đồng, `CHECK (cột BETWEEN 0 AND 1000000000000)` (BR-103). Riêng `cash_reconciliations.difference` được âm, `CHECK` theo trị tuyệt đối. Tính và kiểm tra giới hạn cả kết quả trước khi ghi DB; thao tác vượt trần bị từ chối. **Lượng nguyên liệu**: `numeric(14,3)`.
- **Snapshot**: lưu giá trị lúc bán để đổi giá, đổi tên sau này không làm sai hóa đơn cũ.
- Khóa ngoại mặc định `ON DELETE RESTRICT`. Dữ liệu đã được tham chiếu thì ngưng dùng bằng `is_active`, không xóa cứng.
- **Cô lập theo cửa hàng**: `store_id` luôn lấy từ token đăng nhập, không tin tham số client. Mọi bản ghi được tham chiếu trong request phải thuộc cùng cửa hàng với người gọi.

---

### 1. Tổ chức

**`stores`** [MỚI]: cửa hàng

| Field                  | Kiểu         | Ràng buộc                                                       | Ghi chú                                                               |
| ---------------------- | ------------ | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| id                     | uuid         | PK                                                              |                                                                       |
| name                   | varchar(150) | NOT NULL                                                        | "Cafe Ông Long"                                                       |
| phone                  | varchar(20)  | NULL                                                            |                                                                       |
| email                  | varchar(150) | NULL                                                            |                                                                       |
| address                | varchar(255) | NULL                                                            | Trụ sở chính                                                          |
| status                 | varchar(20)  | NOT NULL, DEFAULT `ACTIVE`, CHECK trong (`ACTIVE`, `SUSPENDED`) | `SUSPENDED` = không đăng nhập, không gọi API được, dữ liệu giữ nguyên |
| suspended_at           | timestamptz  | NULL                                                            | Lúc bị tạm khóa                                                       |
| suspended_reason       | varchar(255) | NULL                                                            | Bắt buộc khi tạm khóa                                                 |
| created_at, updated_at | timestamptz  |                                                                 |                                                                       |

Cột `status` thay cho `is_active` ở bảng này, để tránh hai cột cùng nói một ý.

**`branches`** [MỚI]: chi nhánh

| Field                  | Kiểu         | Ràng buộc                      | Ghi chú                                                                                                                                               |
| ---------------------- | ------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                     | uuid         | PK                             |                                                                                                                                                       |
| store_id               | uuid         | FK → stores, NOT NULL          |                                                                                                                                                       |
| code                   | varchar(10)  | NOT NULL                       | Mã ngắn: `NL`, `DH`. **UNIQUE (store_id, code)**; không dùng làm tiền tố `invoice_code`                                                              |
| name                   | varchar(150) | NOT NULL                       | "Chi nhánh Nam Lý". UNIQUE (store_id, name)                                                                                                           |
| address                | varchar(255) | NULL                           |                                                                                                                                                       |
| phone                  | varchar(20)  | NULL                           |                                                                                                                                                       |
| initial_cash           | bigint       | NOT NULL, DEFAULT 0, CHECK ≥ 0 | Quỹ tiền lẻ để sẵn trong két khi chi nhánh bắt đầu dùng hệ thống. Là tiền đầu ca của **ca thu ngân đầu tiên**. Do `OWNER` cài đặt, thu ngân không sửa |
| is_active              | boolean      | NOT NULL, DEFAULT true         | `false` = không mở ca, không tạo đơn mới, dữ liệu cũ giữ nguyên                                                                                       |
| created_at, updated_at | timestamptz  |                                |                                                                                                                                                       |

**`dining_tables`** [MỚI]: bàn

| Field                  | Kiểu        | Ràng buộc               | Ghi chú                                         |
| ---------------------- | ----------- | ----------------------- | ----------------------------------------------- |
| id                     | uuid        | PK                      |                                                 |
| branch_id              | uuid        | FK → branches, NOT NULL |                                                 |
| name                   | varchar(50) | NOT NULL                | "Bàn 1", "Bàn 18". **UNIQUE (branch_id, name)** |
| area                   | varchar(50) | NULL                    | Tầng 1, sân vườn...                             |
| capacity               | int         | NULL, CHECK > 0         | Số chỗ ngồi                                     |
| is_active              | boolean     | NOT NULL, DEFAULT true  |                                                 |
| created_at, updated_at | timestamptz |                         |                                                 |

Trạng thái bàn (có khách / trống) **không lưu cột**: bàn đang có khách khi tồn tại hóa đơn `OPEN` của bàn đó.

PB-04 đã triển khai bảng `dining_tables` và API tổ chức; `branches.initial_cash` chỉ được sửa trước ca CASHIER đầu tiên theo quyết định Product Owner ngày 30/10/2026. PB-06 phải bổ sung kiểm tra đã từng có ca trong cùng khóa dòng Branch với mở ca đầu tiên, trước khi bật API mở ca; hiện chưa có bảng/API ca nên vế sau ca chưa được kiểm chứng. Không thêm cờ khóa hoặc bảng ca giả trong PB-04.

---

### 2. Danh mục sản phẩm (menu dùng chung toàn cửa hàng)

**`categories`** [SỬA]

| Field                  | Kiểu         | Ràng buộc                    | Ghi chú                                              |
| ---------------------- | ------------ | ---------------------------- | ---------------------------------------------------- |
| id                     | uuid         | PK                           |                                                      |
| store_id               | uuid         | FK → stores, NOT NULL, INDEX | **Mới.** Danh mục thuộc cửa hàng nào                 |
| name                   | varchar(100) | NOT NULL                     | Cà phê, Trà sữa, Bánh... **UNIQUE (store_id, name)** |
| description            | text         | NULL                         |                                                      |
| sort_order             | int          | NOT NULL, DEFAULT 0          | Thứ tự trên màn hình POS                             |
| is_active              | boolean      | NOT NULL, DEFAULT true       |                                                      |
| created_at, updated_at | timestamptz  |                              |                                                      |

**`products`**

| Field                  | Kiểu         | Ràng buộc                        | Ghi chú                        |
| ---------------------- | ------------ | -------------------------------- | ------------------------------ |
| id                     | uuid         | PK                               |                                |
| category_id            | uuid         | FK → categories, NOT NULL, INDEX | Biết cửa hàng qua danh mục     |
| name                   | varchar(150) | NOT NULL                         | **UNIQUE (category_id, name)** |
| description            | text         | NULL                             |                                |
| image_base64           | text         | NULL                             | Nội dung ảnh mã hóa Base64 thuần, không kèm tiền tố `data:`; ảnh gốc tối đa 2.000.000 byte, không chọn trong truy vấn danh sách |
| image_mime             | varchar(50)  | NULL                             | MIME ảnh đã kiểm tra; NULL khi không có ảnh |
| is_active              | boolean      | NOT NULL, DEFAULT true           | `false` = ngưng bán            |
| created_at, updated_at | timestamptz  |                                  |                                |

Mỗi món có tối đa một ảnh vì chuỗi Base64 nằm trong chính dòng `products`. Ràng buộc `image_base64` và `image_mime` cùng NULL hoặc cùng có giá trị, `octet_length(decode(image_base64, 'base64')) <= 2000000` (2 MB ảnh gốc). Server kiểm tra file upload trước khi mã hóa và lưu; không nhận Base64 tùy ý từ client. API tạo `imageUrl` từ ID món để trỏ tới endpoint đọc ảnh có xác thực và kiểm tra store; không lưu URL hay đường dẫn file trong DB. Endpoint đọc giải mã Base64 rồi trả bytes ảnh với MIME tương ứng.

**`sizes`** [SỬA]

| Field                  | Kiểu        | Ràng buộc                    | Ghi chú                                    |
| ---------------------- | ----------- | ---------------------------- | ------------------------------------------ |
| id                     | uuid        | PK                           |                                            |
| store_id               | uuid        | FK → stores, NOT NULL, INDEX | **Mới.**                                   |
| name                   | varchar(20) | NOT NULL                     | M, L, XL, XXL. **UNIQUE (store_id, name)** |
| sort_order             | int         | NOT NULL, DEFAULT 0          |                                            |
| created_at, updated_at | timestamptz |                              |                                            |

**`product_sizes`**

| Field                  | Kiểu        | Ràng buộc               | Ghi chú                                                           |
| ---------------------- | ----------- | ----------------------- | ----------------------------------------------------------------- |
| id                     | uuid        | PK                      |                                                                   |
| product_id             | uuid        | FK → products, NOT NULL |                                                                   |
| size_id                | uuid        | FK → sizes, NOT NULL    | **UNIQUE (product_id, size_id)**. Món và size phải cùng cửa hàng  |
| price                  | bigint      | NOT NULL, CHECK ≥ 0     | Giá hiện tại. Hóa đơn cũ dùng giá snapshot, không đọc lại cột này |
| is_active              | boolean     | NOT NULL, DEFAULT true  |                                                                   |
| created_at, updated_at | timestamptz |                         |                                                                   |

**`toppings`** [SỬA]

| Field                  | Kiểu         | Ràng buộc                    | Ghi chú                     |
| ---------------------- | ------------ | ---------------------------- | --------------------------- |
| id                     | uuid         | PK                           |                             |
| store_id               | uuid         | FK → stores, NOT NULL, INDEX | **Mới.**                    |
| name                   | varchar(100) | NOT NULL                     | **UNIQUE (store_id, name)** |
| price                  | bigint       | NOT NULL, CHECK ≥ 0          |                             |
| is_active              | boolean      | NOT NULL, DEFAULT true       |                             |
| created_at, updated_at | timestamptz  |                              |                             |

**`category_toppings`**

| Field       | Kiểu | Ràng buộc           | Ghi chú                                                                  |
| ----------- | ---- | ------------------- | ------------------------------------------------------------------------ |
| category_id | uuid | PK, FK → categories | PK gộp (category_id, topping_id). Danh mục và topping phải cùng cửa hàng |
| topping_id  | uuid | PK, FK → toppings   |                                                                          |

---

### 3. Xác thực và phân quyền

**`roles`** [SỬA]

| Field                  | Kiểu         | Ràng buộc        | Ghi chú                                                     |
| ---------------------- | ------------ | ---------------- | ----------------------------------------------------------- |
| id                     | uuid         | PK               |                                                             |
| name                   | varchar(50)  | NOT NULL, UNIQUE | Mã ổn định: `PLATFORM_ADMIN`, `OWNER`, `MANAGER`, `CASHIER` |
| description            | varchar(255) | NULL             |                                                             |
| created_at, updated_at | timestamptz  |                  |                                                             |

**`permissions`**

| Field                  | Kiểu         | Ràng buộc        | Ghi chú                                                                                                                                                      |
| ---------------------- | ------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id                     | uuid         | PK               |                                                                                                                                                              |
| code                   | varchar(100) | NOT NULL, UNIQUE | Dạng `module.action`: `invoice.cancel`, `product.update`, `shift.force_close`, **`branch.access_all`**, `store.create`, `store.suspend`, `user.create_owner` |
| description            | varchar(255) | NULL             |                                                                                                                                                              |
| created_at, updated_at | timestamptz  |                  |                                                                                                                                                              |

**`role_permissions`**

| Field         | Kiểu | Ràng buộc            | Ghi chú                         |
| ------------- | ---- | -------------------- | ------------------------------- |
| role_id       | uuid | PK, FK → roles       | PK gộp (role_id, permission_id) |
| permission_id | uuid | PK, FK → permissions |                                 |

**`users`** [SỬA]

| Field                  | Kiểu         | Ràng buộc                      | Ghi chú                                                                                                                                                |
| ---------------------- | ------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id                     | uuid         | PK                             |                                                                                                                                                        |
| store_id               | uuid         | FK → stores, **NULL**, INDEX   | **Mới.** Thuộc cửa hàng nào. Chỉ `PLATFORM_ADMIN` để trống, mọi người khác bắt buộc có (kiểm tra ở tầng ứng dụng)                                      |
| branch_id              | uuid         | FK → branches, **NULL**, INDEX | **Mới.** Chi nhánh làm việc. Thu ngân và Quản lý **bắt buộc có**. Chỉ vai trò có `branch.access_all` (`OWNER`) hoặc `PLATFORM_ADMIN` mới được để trống |
| role_id                | uuid         | FK → roles, NOT NULL           |                                                                                                                                                        |
| full_name              | varchar(150) | NOT NULL                       |                                                                                                                                                        |
| username               | varchar(50)  | NOT NULL, UNIQUE               | Lưu dạng chuẩn `lower(btrim(username))`; duy nhất không phân biệt hoa thường trên toàn hệ thống                                                        |
| password_hash          | varchar(255) | NOT NULL                       | bcrypt hoặc argon2, không bao giờ trả ra API                                                                                                           |
| must_change_password   | boolean      | NOT NULL, DEFAULT false        | **Mới.** `true` khi tài khoản vừa được cấp hoặc vừa đặt lại mật khẩu, buộc đổi mật khẩu ở lần đăng nhập đầu                                            |
| phone                  | varchar(20)  | NULL                           |                                                                                                                                                        |
| is_active              | boolean      | NOT NULL, DEFAULT true         | Nghỉ việc thì khóa, không xóa                                                                                                                          |
| last_login_at          | timestamptz  | NULL                           |                                                                                                                                                        |
| created_at, updated_at | timestamptz  |                                |                                                                                                                                                        |

Kiểm tra ở tầng ứng dụng (database không so được với `roles`):

- `PLATFORM_ADMIN` có `store_id` và `branch_id` trống. Mọi vai trò khác bắt buộc có `store_id`.
- `CASHIER` và `MANAGER` bắt buộc có `branch_id`, và chi nhánh đó phải thuộc `store_id` của user.
- Người cấp tài khoản chỉ được cấp vai trò thấp hơn mình: `PLATFORM_ADMIN` cấp `OWNER`, `OWNER` cấp `MANAGER` và `CASHIER` trong cửa hàng của mình.
- Mỗi cửa hàng luôn có ít nhất một `OWNER` đang hoạt động.

**`refresh_tokens`**

| Field       | Kiểu         | Ràng buộc                   | Ghi chú                                       |
| ----------- | ------------ | --------------------------- | --------------------------------------------- |
| id          | uuid         | PK                          |                                               |
| user_id     | uuid         | FK → users, NOT NULL, INDEX |                                               |
| session_id  | uuid         | NOT NULL                    | Cùng giá trị qua các lần xoay token một thiết bị |
| token_hash  | varchar(255) | NOT NULL, UNIQUE            | Lưu hash, không lưu token thô                 |
| expires_at  | timestamptz  | NOT NULL                    |                                               |
| revoked_at  | timestamptz  | NULL                        | Có giá trị = đã thu hồi                       |
| replaced_at | timestamptz  | NULL                        | Có giá trị khi token bị thay bởi lần refresh  |
| user_agent  | varchar(255) | NULL                        |                                               |
| created_at  | timestamptz  | NOT NULL                    |                                               |

Token hợp lệ khi `revoked_at IS NULL AND expires_at > now()`. Mỗi `session_id` chỉ có tối đa một token chưa thu hồi. Giữ dòng đã xoay vòng để phát hiện dùng lại (`replaced_at IS NOT NULL`), thu hồi cả phiên đó và chặn access token có claim `sid` tương ứng. Chi tiết xem [auth.md](architecture/auth.md).

**`auth_rate_events`** (PB-02): `id bigserial` PK, `scope varchar(30)`, `key_hash char(64)` và `occurred_at timestamptz`. Chỉ lưu HMAC của username chuẩn hóa hoặc IP, không lưu giá trị thô. Index `(scope, key_hash, occurred_at)` phục vụ cửa sổ trượt; index `occurred_at` phục vụ dọn sự kiện cũ.

---

### 4. Bán hàng (POS)

**`invoices`** [SỬA]

| Field                  | Kiểu         | Ràng buộc                         | Ghi chú                                                                                                                     |
| ---------------------- | ------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| id                     | uuid         | PK                                |                                                                                                                             |
| branch_id              | uuid         | FK → branches, NOT NULL, INDEX    | **Mới.** Phải bằng chi nhánh của ca và của bàn                                                                              |
| work_shift_id          | uuid         | FK → work_shifts, NOT NULL, INDEX | Đơn thuộc ca nào                                                                                                            |
| table_id               | uuid         | FK → dining_tables, **NULL**      | **Mới.** Có khi `DINE_IN`, trống khi `TAKEAWAY`                                                                             |
| invoice_code           | varchar(10)  | NOT NULL, UNIQUE, CHECK định dạng | `HD` + 8 ký tự ngẫu nhiên `A-Z`/`0-9`, ví dụ `HDA1B2C3D4`; duy nhất toàn hệ thống, không đổi sau khi tạo; dùng để đối chiếu giao dịch SePay |
| created_by             | uuid         | FK → users, NOT NULL              | Người lập đơn                                                                                                               |
| order_type             | varchar(20)  | NOT NULL                          | `DINE_IN`, `TAKEAWAY`                                                                                                       |
| status                 | varchar(20)  | NOT NULL                          | `OPEN` → `PAID` hoặc `CANCELLED`. `PAID` → `CANCELLED` chỉ qua hủy đơn (BR-29). Không quay lại `OPEN`                       |
| subtotal               | bigint       | NOT NULL, ≥ 0                     | Tổng tiền hàng                                                                                                              |
| discount_amount        | bigint       | NOT NULL, DEFAULT 0, ≥ 0          | Tổng tiền giảm                                                                                                              |
| total_amount           | bigint       | NOT NULL, ≥ 0                     | Số tiền phải trả                                                                                                            |
| zero_completion_key    | uuid         | NULL, UNIQUE                      | Chỉ có khi hoàn tất đơn 0đ; chống lặp `POST /invoices/{id}/complete-zero` (BR-104)                                         |
| note                   | text         | NULL                              |                                                                                                                             |
| paid_at                | timestamptz  | NULL                              |                                                                                                                             |
| cancelled_at           | timestamptz  | NULL                              |                                                                                                                             |
| cancelled_by           | uuid         | FK → users, NULL                  |                                                                                                                             |
| cancel_reason          | varchar(255) | NULL                              | Bắt buộc khi hủy                                                                                                            |
| created_at, updated_at | timestamptz  |                                   |                                                                                                                             |

**`invoice_items`**

| Field                  | Kiểu         | Ràng buộc                      | Ghi chú                                                  |
| ---------------------- | ------------ | ------------------------------ | -------------------------------------------------------- |
| id                     | uuid         | PK                             |                                                          |
| invoice_id             | uuid         | FK → invoices, NOT NULL, INDEX |                                                          |
| product_size_id        | uuid         | FK → product_sizes, NOT NULL   | Để tra công thức trừ kho                                 |
| product_name           | varchar(150) | NOT NULL                       | Snapshot                                                 |
| size_name              | varchar(20)  | NOT NULL                       | Snapshot                                                 |
| unit_price             | bigint       | NOT NULL, ≥ 0                  | Snapshot giá 1 ly, hệ thống lấy từ `product_sizes.price` |
| quantity               | int          | NOT NULL, CHECK > 0            | Số ly                                                    |
| line_total             | bigint       | NOT NULL, ≥ 0                  | Thành tiền cả dòng                                       |
| note                   | varchar(255) | NULL                           | Ít đá, ít đường...                                       |
| created_at, updated_at | timestamptz  |                                |                                                          |

**`invoice_item_toppings`**

| Field           | Kiểu         | Ràng buộc                    | Ghi chú                                  |
| --------------- | ------------ | ---------------------------- | ---------------------------------------- |
| id              | uuid         | PK                           |                                          |
| invoice_item_id | uuid         | FK → invoice_items, NOT NULL | **UNIQUE (invoice_item_id, topping_id)** |
| topping_id      | uuid         | FK → toppings, NOT NULL      | Để tra công thức trừ kho                 |
| topping_name    | varchar(100) | NOT NULL                     | Snapshot                                 |
| unit_price      | bigint       | NOT NULL, ≥ 0                | Snapshot giá 1 phần                      |
| quantity        | int          | NOT NULL, CHECK > 0          | Số phần topping **trên mỗi ly**          |
| line_total      | bigint       | NOT NULL, ≥ 0                | Thành tiền cả dòng                       |
| created_at      | timestamptz  | NOT NULL                     |                                          |

**`payments`**

| Field                    | Kiểu         | Ràng buộc                      | Ghi chú                                                                                                                                                                         |
| ------------------------ | ------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                       | uuid         | PK                             |                                                                                                                                                                                 |
| invoice_id               | uuid         | FK → invoices, NOT NULL, UNIQUE | Mỗi hóa đơn tối đa một khoản thanh toán (BR-31)                                                                                                                             |
| method                   | varchar(20)  | NOT NULL                       | `CASH`, `TRANSFER`                                                                                                                                                              |
| amount                   | bigint       | NOT NULL, CHECK > 0            | Số tiền tính cho hóa đơn. Con số dùng để đối soát                                                                                                                               |
| tendered_amount          | bigint       | NULL                           | Khách đưa, chỉ có khi `CASH`                                                                                                                                                    |
| change_amount            | bigint       | NULL                           | Tiền thối, chỉ có khi `CASH`                                                                                                                                                    |
| transaction_ref          | varchar(100) | NULL                           | Mã giao dịch ngân hàng khi `TRANSFER`                                                                                                                                           |
| idempotency_key          | varchar(100) | NOT NULL, UNIQUE               | Chống bấm thanh toán 2 lần. Client dùng lại đúng key khi gửi lại vì lỗi mạng                                                                                                    |
| idempotency_request_hash | varchar(64)  | NOT NULL                       | Hash SHA-256 của dạng chuẩn hóa nội dung yêu cầu (`invoiceId`, `method`, `amount`, `tendered_amount`, `transaction_ref`). Phân biệt gửi lại hợp lệ với dùng lại key sai (BR-34) |
| created_by               | uuid         | FK → users, NOT NULL           |                                                                                                                                                                                 |
| paid_at                  | timestamptz  | NOT NULL                       |                                                                                                                                                                                 |
| created_at               | timestamptz  | NOT NULL                       |                                                                                                                                                                                 |

**`promotion_codes`** [SỬA] (dùng chung toàn cửa hàng)

| Field                  | Kiểu         | Ràng buộc                    | Ghi chú                     |
| ---------------------- | ------------ | ---------------------------- | --------------------------- |
| id                     | uuid         | PK                           |                             |
| store_id               | uuid         | FK → stores, NOT NULL, INDEX | **Mới.**                    |
| code                   | varchar(50)  | NOT NULL                     | **UNIQUE (store_id, code)** |
| name                   | varchar(150) | NULL                         |                             |
| discount_type          | varchar(20)  | NOT NULL                     | `PERCENT`, `FIXED`          |
| discount_value         | bigint       | NOT NULL, CHECK > 0          | % hoặc số tiền              |
| max_discount_amount    | bigint       | NULL                         | Trần giảm cho `PERCENT`     |
| min_order_amount       | bigint       | NULL                         | Đơn tối thiểu               |
| start_at               | timestamptz  | NOT NULL                     |                             |
| end_at                 | timestamptz  | NOT NULL                     | CHECK end_at > start_at     |
| usage_limit            | int          | NULL                         | NULL = không giới hạn       |
| used_count             | int          | NOT NULL, DEFAULT 0          |                             |
| is_active              | boolean      | NOT NULL, DEFAULT true       |                             |
| created_at, updated_at | timestamptz  |                              |                             |

**`invoice_promotion_codes`**

| Field             | Kiểu        | Ràng buộc                      | Ghi chú                                    |
| ----------------- | ----------- | ------------------------------ | ------------------------------------------ |
| id                | uuid        | PK                             |                                            |
| invoice_id        | uuid        | FK → invoices, NOT NULL, UNIQUE | Mỗi hóa đơn tối đa một mã (BR-40) |
| promotion_code_id | uuid        | FK → promotion_codes, NOT NULL |                                            |
| code              | varchar(50) | NOT NULL                       | Snapshot mã                                |
| discount_amount   | bigint      | NOT NULL, ≥ 0                  | Số tiền thực giảm                          |
| created_at        | timestamptz | NOT NULL                       |                                            |

---

### 5. Ca làm và đối soát

**`work_shifts`** [SỬA]

| Field                  | Kiểu         | Ràng buộc                      | Ghi chú                                                 |
| ---------------------- | ------------ | ------------------------------ | ------------------------------------------------------- |
| id                     | uuid         | PK                             |                                                         |
| branch_id              | uuid         | FK → branches, NOT NULL, INDEX | **Mới.** Chi nhánh của ca                               |
| user_id                | uuid         | FK → users, NOT NULL, INDEX    | Người làm ca                                            |
| shift_type             | varchar(20)  | NOT NULL                       | `CASHIER` (giữ két, có đối soát), `STAFF` (chỉ ghi giờ) |
| started_at             | timestamptz  | NOT NULL                       | Giờ vào ca                                              |
| ended_at               | timestamptz  | NULL                           | NULL khi đang mở. CHECK ended_at > started_at           |
| status                 | varchar(20)  | NOT NULL                       | `OPEN`, `CLOSED`                                        |
| closed_by              | uuid         | FK → users, NULL               | Khác `user_id` nếu quản lý đóng cưỡng chế               |
| note                   | varchar(255) | NULL                           |                                                         |
| created_at, updated_at | timestamptz  |                                |                                                         |

**`cash_reconciliations`**

| Field                  | Kiểu         | Ràng buộc                              | Ghi chú                                                                                                                                                                  |
| ---------------------- | ------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id                     | uuid         | PK                                     |                                                                                                                                                                          |
| work_shift_id          | uuid         | FK → work_shifts, NOT NULL, **UNIQUE** | Quan hệ 1-1, chỉ ca `CASHIER`                                                                                                                                            |
| opening_cash           | bigint       | NOT NULL, ≥ 0                          | Tự lấy từ `counted_cash` của ca thu ngân đã đóng gần nhất **cùng chi nhánh**. Ca đầu tiên của chi nhánh lấy từ `branches.initial_cash`. Thu ngân chỉ xác nhận, không sửa |
| cash_sales_amount      | bigint       | NULL                                   | Snapshot lúc đóng ca                                                                                                                                                     |
| expense_amount         | bigint       | NULL                                   | Snapshot lúc đóng ca                                                                                                                                                     |
| expected_cash          | bigint       | NULL                                   | Tiền hệ thống tính phải có trong két                                                                                                                                     |
| counted_cash           | bigint       | NULL, ≥ 0                              | Tiền thu ngân đếm thực tế (gồm cả tiền đầu ca). Ca đóng cưỡng chế vẫn phải có số này, do quản lý đếm và nhập                                                             |
| difference             | bigint       | NULL                                   | Chênh lệch                                                                                                                                                               |
| status                 | varchar(20)  | NOT NULL                               | `PENDING`, `MATCHED`, `SHORTAGE`, `OVERAGE`                                                                                                                              |
| note                   | varchar(255) | NULL                                   | Bắt buộc khi lệch                                                                                                                                                        |
| reconciled_at          | timestamptz  | NULL                                   |                                                                                                                                                                          |
| created_at, updated_at | timestamptz  |                                        |                                                                                                                                                                          |

**`shift_expenses`**

| Field                  | Kiểu         | Ràng buộc                         | Ghi chú                                             |
| ---------------------- | ------------ | --------------------------------- | --------------------------------------------------- |
| id                     | uuid         | PK                                |                                                     |
| work_shift_id          | uuid         | FK → work_shifts, NOT NULL, INDEX |                                                     |
| amount                 | bigint       | NOT NULL, CHECK > 0               |                                                     |
| reason                 | varchar(255) | NOT NULL                          | Mua đá, mua cà phê, sửa quạt...                     |
| paid_from_drawer       | boolean      | NOT NULL, DEFAULT true            | `true` = lấy từ két, được trừ khi tính tiền kỳ vọng |
| created_by             | uuid         | FK → users, NOT NULL              |                                                     |
| created_at, updated_at | timestamptz  |                                   |                                                     |

---

### 6. Kho và công thức

**`ingredients`** [SỬA]

| Field                  | Kiểu         | Ràng buộc                    | Ghi chú                                                                      |
| ---------------------- | ------------ | ---------------------------- | ---------------------------------------------------------------------------- |
| id                     | uuid         | PK                           |                                                                              |
| store_id               | uuid         | FK → stores, NOT NULL, INDEX | **Mới.**                                                                     |
| name                   | varchar(100) | NOT NULL                     | Hạt cà phê, đường, đá, bột... **UNIQUE (store_id, name)**                    |
| unit                   | varchar(20)  | NOT NULL                     | Đơn vị gốc: `g`, `ml`, `piece`. Mọi công thức và sổ kho dùng đúng đơn vị này |
| is_active              | boolean      | NOT NULL, DEFAULT true       |                                                                              |
| created_at, updated_at | timestamptz  |                              |                                                                              |

Đã **bỏ** `current_stock` và `min_stock` (chuyển sang `branch_ingredient_stocks`).

**`product_size_ingredients`**

| Field           | Kiểu          | Ràng buộc              | Ghi chú                                                                        |
| --------------- | ------------- | ---------------------- | ------------------------------------------------------------------------------ |
| product_size_id | uuid          | PK, FK → product_sizes | PK gộp (product_size_id, ingredient_id). Món và nguyên liệu phải cùng cửa hàng |
| ingredient_id   | uuid          | PK, FK → ingredients   |                                                                                |
| quantity        | numeric(14,3) | NOT NULL, CHECK > 0    | Lượng dùng cho **1 ly**, theo `ingredients.unit`                               |

**`topping_ingredients`**

| Field         | Kiểu          | Ràng buộc            | Ghi chú                                                                       |
| ------------- | ------------- | -------------------- | ----------------------------------------------------------------------------- |
| topping_id    | uuid          | PK, FK → toppings    | PK gộp (topping_id, ingredient_id). Topping và nguyên liệu phải cùng cửa hàng |
| ingredient_id | uuid          | PK, FK → ingredients |                                                                               |
| quantity      | numeric(14,3) | NOT NULL, CHECK > 0  | Lượng dùng cho **1 phần topping**                                             |

**`branch_ingredient_stocks`** [MỚI]: tồn kho theo chi nhánh

| Field         | Kiểu          | Ràng buộc                | Ghi chú                                                                                                       |
| ------------- | ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| branch_id     | uuid          | PK, FK → branches        | PK gộp (branch_id, ingredient_id)                                                                             |
| ingredient_id | uuid          | PK, FK → ingredients     |                                                                                                               |
| current_stock | numeric(14,3) | NOT NULL, DEFAULT 0      | Luôn bằng `SUM(stock_movements.quantity)` của cặp này. Không đặt CHECK ≥ 0, cho bán khi kho âm nhưng cảnh báo |
| min_stock     | numeric(14,3) | NOT NULL, DEFAULT 0, ≥ 0 | Ngưỡng cảnh báo riêng từng chi nhánh                                                                          |
| updated_at    | timestamptz   | NOT NULL                 |                                                                                                               |

**`stock_movements`** [SỬA]

| Field         | Kiểu          | Ràng buộc                  | Ghi chú                                              |
| ------------- | ------------- | -------------------------- | ---------------------------------------------------- |
| id            | uuid          | PK                         |                                                      |
| branch_id     | uuid          | FK → branches, NOT NULL    | **Mới.** Chi nhánh phát sinh                         |
| ingredient_id | uuid          | FK → ingredients, NOT NULL |                                                      |
| type          | varchar(20)   | NOT NULL                   | `IMPORT`, `SALE`, `SALE_REVERSAL`, `WASTE`, `ADJUST` |
| quantity      | numeric(14,3) | NOT NULL, CHECK ≠ 0        | **Có dấu**: dương khi tăng kho, âm khi giảm          |
| balance_after | numeric(14,3) | NOT NULL                   | Tồn sau giao dịch                                    |
| invoice_id    | uuid          | FK → invoices, NULL        | Có khi `SALE`, `SALE_REVERSAL`                       |
| note          | varchar(255)  | NULL                       |                                                      |
| created_by    | uuid          | FK → users, NOT NULL       |                                                      |
| created_at    | timestamptz   | NOT NULL                   |                                                      |

Chỉ thêm dòng mới, không sửa, không xóa. Dấu theo loại: `IMPORT` và `SALE_REVERSAL` dương, `SALE` và `WASTE` âm, `ADJUST` dương hoặc âm.

---

### Công thức

**Hóa đơn**

```
invoice_items.line_total          = unit_price × quantity + Σ invoice_item_toppings.line_total
invoice_item_toppings.line_total  = unit_price × quantity × invoice_items.quantity
invoices.subtotal                 = Σ invoice_items.line_total
invoices.discount_amount          = Σ invoice_promotion_codes.discount_amount
invoices.total_amount             = MAX(subtotal − discount_amount, 0)
```

**Thanh toán**

```
CASH:  change_amount = tendered_amount − amount     (yêu cầu tendered_amount ≥ amount)
Hóa đơn có total_amount > 0 thành PAID khi một payment.amount = invoices.total_amount
Hóa đơn có total_amount = 0 thành PAID qua hành động complete-zero, không tạo payment (BR-104)
```

**Giảm giá**

```
PERCENT: giảm = MIN(subtotal × discount_value / 100, max_discount_amount)
FIXED:   giảm = MIN(discount_value, subtotal)
Điều kiện: is_active, now() trong [start_at, end_at], subtotal ≥ min_order_amount, used_count < usage_limit
```

**Đối soát tiền mặt (chỉ trong cùng chi nhánh và ca)**

```
cash_sales_amount = Σ payments.amount  WHERE method = 'CASH' AND invoices.status = 'PAID' AND invoices.work_shift_id = <ca>
expense_amount    = Σ shift_expenses.amount  WHERE work_shift_id = <ca> AND paid_from_drawer = true
expected_cash     = opening_cash + cash_sales_amount − expense_amount
difference        = counted_cash − expected_cash
status            = MATCHED nếu = 0, SHORTAGE nếu < 0, OVERAGE nếu > 0
```

**Tiền đầu ca khi mở ca thu ngân tại chi nhánh B**

```
Nếu B đã có ca thu ngân CLOSED trước đó:  opening_cash = counted_cash của ca gần nhất (theo ended_at)
Ngược lại (ca đầu tiên):                  opening_cash = branches.initial_cash
```

**Số giờ làm**

```
giờ làm = work_shifts.ended_at − work_shifts.started_at
```

**Trừ kho khi hóa đơn thành PAID (theo `invoices.branch_id`)**

```
dùng_từ_món     = product_size_ingredients.quantity × invoice_items.quantity
dùng_từ_topping = topping_ingredients.quantity × invoice_item_toppings.quantity × invoice_items.quantity
tổng_trừ        = Σ dùng_từ_món + Σ dùng_từ_topping   (gộp theo ingredient_id)
```

Mỗi nguyên liệu ghi một dòng `SALE` với `quantity = −tổng_trừ`, và cập nhật nguyên tử:

```sql
UPDATE branch_ingredient_stocks
SET current_stock = current_stock + :delta, updated_at = now()
WHERE branch_id = :branch AND ingredient_id = :ing
RETURNING current_stock;   -- ghi vào stock_movements.balance_after
```

Ghi `payments` (nếu có), đổi `invoices.status`, trừ kho nằm trong **một transaction**. Với đơn 0đ, ghi `zero_completion_key` cùng transaction.

**Hủy đơn đã PAID**: với mỗi dòng `SALE` của hóa đơn, thêm dòng `SALE_REVERSAL` có `quantity` đối dấu. Các dòng `payments` của đơn giữ nguyên làm lịch sử. Hóa đơn `CANCELLED` không còn tính vào doanh thu và đối soát (BR-29).

**Sắp hết hàng**: `branch_ingredient_stocks.current_stock <= min_stock`.

---

### Ràng buộc đặc biệt (composite unique và partial unique index)

| Bảng                      | Ràng buộc                                                               | Mục đích                                                      |
| ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| `users`                   | UNIQUE (username), CHECK (username = lower(btrim(username)))           | Tên đăng nhập lưu dạng chuẩn, duy nhất không phân biệt hoa thường |
| `refresh_tokens`          | UNIQUE (session_id) WHERE revoked_at IS NULL                            | Tối đa một refresh token hiện hành cho mỗi phiên              |
| `branches`                | UNIQUE (store_id, code)                                                 | Mã chi nhánh không trùng trong cửa hàng                       |
| `branches`                | UNIQUE (store_id, name)                                                 | Tên chi nhánh không trùng trong cửa hàng                      |
| `categories`              | UNIQUE (store_id, name)                                                 | Tên danh mục không trùng trong cửa hàng                       |
| `sizes`                   | UNIQUE (store_id, name)                                                 | Tên size không trùng trong cửa hàng                           |
| `toppings`                | UNIQUE (store_id, name)                                                 | Tên topping không trùng trong cửa hàng                        |
| `ingredients`             | UNIQUE (store_id, name)                                                 | Tên nguyên liệu không trùng trong cửa hàng                    |
| `promotion_codes`         | UNIQUE (store_id, code)                                                 | Mã giảm giá không trùng trong cửa hàng                        |
| `dining_tables`           | UNIQUE (branch_id, name)                                                | Tên bàn không trùng trong chi nhánh                           |
| `products`                | UNIQUE (category_id, name)                                              | Tên món không trùng trong danh mục                            |
| `product_sizes`           | UNIQUE (product_id, size_id)                                            | Mỗi món một dòng cho mỗi size                                 |
| `invoices`                | UNIQUE (invoice_code), CHECK (`invoice_code ~ '^HD[A-Z0-9]{8}$'`)        | Mã hóa đơn đúng định dạng và không trùng toàn hệ thống        |
| `invoices`                | UNIQUE (zero_completion_key)                                           | Chống hoàn tất đơn 0đ lặp bằng cùng key (BR-104)              |
| `payments`                | UNIQUE (invoice_id)                                                    | Mỗi hóa đơn tối đa một khoản thanh toán (BR-31)              |
| `invoice_item_toppings`   | UNIQUE (invoice_item_id, topping_id)                                    | Mỗi dòng món một dòng cho mỗi topping                         |
| `invoice_promotion_codes` | UNIQUE (invoice_id)                                                     | Mỗi hóa đơn tối đa một mã giảm giá (BR-40)                   |
| `cash_reconciliations`    | UNIQUE (work_shift_id)                                                  | Quan hệ 1-1                                                   |
| `work_shifts`             | UNIQUE (user_id) **WHERE status = 'OPEN'**                              | Mỗi người một ca mở                                           |
| `work_shifts`             | UNIQUE (branch_id) **WHERE status = 'OPEN' AND shift_type = 'CASHIER'** | **Một chi nhánh** (một két) không có hai ca thu ngân cùng lúc |
| `invoices`                | UNIQUE (table_id) **WHERE status = 'OPEN' AND table_id IS NOT NULL**    | Mỗi bàn một đơn mở                                            |

### Index nên tạo

- `invoices (branch_id, created_at)`, `invoices (work_shift_id)`, `invoices (status)`
- `invoice_items (invoice_id)`, `payments (invoice_id)`
- `work_shifts (branch_id, started_at)`, `shift_expenses (work_shift_id)`
- `stock_movements (branch_id, ingredient_id, created_at)`, `stock_movements (invoice_id)`
- `products (category_id)`, `refresh_tokens (user_id, session_id)`
- `users (store_id)`, `users (branch_id)`

### Kiểm tra ở tầng ứng dụng

**Chi nhánh và hóa đơn**

- `invoices.branch_id` = `work_shifts.branch_id` = `dining_tables.branch_id` (nếu có bàn).
- Khi tạo hóa đơn, server sinh `invoice_code` bằng bộ sinh ngẫu nhiên mật mã; nếu đụng ràng buộc UNIQUE thì sinh lại, không trả mã trùng. Webhook chỉ dùng mã đã khớp duy nhất cùng kiểm tra tài khoản nhận và số tiền để đối chiếu, không suy ra store/branch từ mã.
- Hóa đơn `DINE_IN` phải có `table_id`, `TAKEAWAY` thì để trống.
- Người không có `branch.access_all` bị ép lọc theo chi nhánh của mình, không tin `branch_id` từ client.

**Cô lập cửa hàng**

- `store_id` lấy từ token. Mọi truy vấn vào dữ liệu của cửa hàng đều lọc theo `store_id` (trực tiếp hoặc qua `branch_id`, `category_id`).
- Mọi `id` gửi lên trong request (món, size, topping, nguyên liệu, mã giảm giá, chi nhánh, bàn) phải thuộc cùng cửa hàng với người gọi.
- Các bảng nối (`category_toppings`, `product_size_ingredients`, `topping_ingredients`) phải có hai đầu cùng cửa hàng.
- `PLATFORM_ADMIN` chỉ quản lý cửa hàng và tài khoản `OWNER`, không đọc dữ liệu vận hành (hóa đơn, ca, kho, doanh thu).

**Tài khoản và cửa hàng**

- Không có đăng ký công khai. Tài khoản mới có `must_change_password = true`, ngoại trừ `PLATFORM_ADMIN` bootstrap có `false`; mật khẩu tạm chỉ hiển thị một lần, người dùng có cờ `true` phải đổi mật khẩu trước khi dùng chức năng khác.
- Cửa hàng `SUSPENDED`: từ chối đăng nhập và mọi API của người dùng thuộc cửa hàng đó, thu hồi refresh token. Dữ liệu giữ nguyên.
- Người cấp tài khoản chỉ được cấp vai trò thấp hơn mình, trong phạm vi cửa hàng và chi nhánh của mình. Không khóa, xóa hay hạ quyền `OWNER` cuối cùng của cửa hàng.

**Ca thu ngân**

- Ca thu ngân đóng cưỡng chế vẫn phải có `counted_cash` do quản lý đếm và nhập.
- Thu ngân không được sửa `opening_cash`.
