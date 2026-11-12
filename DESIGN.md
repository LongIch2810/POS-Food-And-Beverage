# DESIGN.md: Giao diện hệ thống POS và kho cho quán cà phê

> Sprint 08 thay mô tả chuyển khoản cũ: hiện QR và thông tin chuyển khoản, khóa đơn khi chờ, chỉ báo thành công sau xác nhận của server. Chi tiết tại [spec thanh toán](.devloopflow/specs/invoices.md).


Tài liệu này là nguồn sự thật về giao diện của hệ thống POS (bán hàng, ca làm, đối soát tiền mặt, kho, báo cáo). Mọi màn hình, component, màu sắc và nội dung chữ phải theo tài liệu này. Khi cần quyết định mà tài liệu chưa nói, chọn phương án nhanh hơn và ít sai hơn cho thu ngân.

Tài liệu đi kèm: `docs/PRODUCT_OVERVIEW.md` (tổng quan sản phẩm), `docs/DESIGN_DB_POS_SYSTEM.md` (28 bảng và field), `docs/BUSINESS_RULES.md` (business rule theo mã BR-xx). Các rule giao diện bên dưới có ghi mã BR tương ứng.

---

## 1. Tổng quan

| Mục                           | Nội dung                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Sản phẩm                      | POS và quản lý kho cho quán cà phê dạng nhiều cửa hàng (SaaS). Mỗi cửa hàng có nhiều chi nhánh, mỗi chi nhánh có sơ đồ bàn |
| Người dùng                    | Thu ngân (dùng nhiều nhất), quản lý chi nhánh, chủ cửa hàng, quản trị nền tảng                                             |
| Công việc chính của giao diện | Ghi đơn nhanh và đúng. Thanh toán không nhầm tiền. Đóng ca khớp tiền                                                       |
| Thiết bị chính                | Máy tính bảng ngang (10 đến 13 inch) tại quầy, cảm ứng. Màn hình máy tính cho quản lý, chủ cửa hàng và quản trị nền tảng   |
| Ngôn ngữ                      | Tiếng Việt. Mọi chữ trên giao diện đều là tiếng Việt                                                                       |

### Hướng thị giác

**"Quầy pha chế sạch và sáng."** Nền xám lạnh như mặt đá, bề mặt làm việc màu trắng, một màu thương hiệu duy nhất là **nâu phin** dùng cho hành động chính và thanh điều hướng. Màu còn lại chỉ để báo trạng thái (đã trả, thiếu tiền, đang phục vụ). Giao diện yên tĩnh và rõ ràng, vì thu ngân nhìn nó hàng giờ liền với khách đang chờ.

**Một điểm nhấn duy nhất: số tiền.** Số tiền là nhân vật chính của POS. Tổng đơn, tiền khách đưa, tiền thối, chênh lệch đối soát đều được đặt chữ lớn, đậm, thẳng hàng. Mọi thứ xung quanh giữ yên lặng để số tiền nổi lên.

---

## 2. Nguyên tắc thiết kế

1. **Tốc độ trước hết.** Món bán chạy thêm vào đơn tối đa 2 chạm. Thanh toán tiền mặt đủ tiền tối đa 3 chạm (Thanh toán, Đủ tiền, Xác nhận).
2. **Thiết kế cho ngón tay.** Mục tiêu chạm tối thiểu 48px, nút hành động chính 56px, khoảng cách giữa các nút chạm tối thiểu 8px. Không có thao tác nào chỉ làm được bằng hover.
3. **Số tiền là nhân vật chính.** Dùng chữ số cùng độ rộng (tabular), canh phải, đơn vị `đ` luôn đi kèm.
4. **Không cho sai.** Giao diện không có ô nhập đơn giá hay tổng tiền (BR-24). Tiền đầu ca chỉ đọc (BR-55). Nút nguy hiểm tách khỏi nút thường và cần lý do.
5. **Màu để báo trạng thái, không để trang trí.** Màu thương hiệu chỉ dùng cho hành động chính và khung điều hướng. Không gradient, không ảnh nền.
6. **Cấu trúc thể hiện thông tin.** Viền, đường kẻ, nhóm chỉ xuất hiện khi chúng nói lên điều gì (ví dụ viền đậm quanh bàn đang được chọn). Không chia mọi thứ thành các thẻ giống hệt nhau.
7. **Yên tĩnh.** Không animation tự chạy. Chuyển động chỉ để trả lời thao tác của người dùng (thêm món, mở bảng, xác nhận).
8. **Tiếng Việt là chuẩn.** Chữ viết câu thường (sentence case), không viết hoa toàn bộ, không dùng nhãn phụ phía trên mỗi tiêu đề.

---

## 3. Người dùng và thiết bị

| Vai trò                              | Thiết bị                              | Việc chính                                                                      | Ưu tiên giao diện                                                   |
| ------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Thu ngân (`CASHIER`)                 | Máy tính bảng ngang, cảm ứng, một tay | Chọn món, thanh toán, mở và đóng ca                                             | Nhanh, mục tiêu chạm lớn, ít chữ                                    |
| Quản lý chi nhánh (`MANAGER`)        | Máy tính bảng hoặc máy tính           | Xem báo cáo, nhập kho, kiểm kê, duyệt hủy đơn                                   | Bảng dữ liệu rõ, lọc nhanh                                          |
| Chủ cửa hàng (`OWNER`)               | Máy tính, đôi khi điện thoại          | Xem nhiều chi nhánh, cấu hình chi nhánh, bàn, thực đơn, cấp tài khoản nhân viên | Chọn chi nhánh dễ, báo cáo tổng hợp, thiết lập ban đầu có hướng dẫn |
| Quản trị nền tảng (`PLATFORM_ADMIN`) | Máy tính                              | Tạo cửa hàng, cấp tài khoản chủ cửa hàng, khóa hoặc mở lại cửa hàng             | Ít màn hình, thao tác rõ và an toàn. Không thấy dữ liệu vận hành    |

### Điểm ngắt (breakpoint)

| Khoảng rộng     | Tên          | Hành vi                                                                             |
| --------------- | ------------ | ----------------------------------------------------------------------------------- |
| từ 1280px       | Máy tính     | Dùng cho trang quản lý. Bảng dữ liệu đầy đủ cột                                     |
| 1024 đến 1279px | Tablet ngang | **Màn hình POS chính.** Hai vùng: món (trái) và đơn (phải)                          |
| 768 đến 1023px  | Tablet dọc   | Panel đơn thành ngăn kéo bên phải, mở bằng nút giỏ hàng có số món                   |
| dưới 768px      | Điện thoại   | Chỉ hỗ trợ xem (báo cáo, danh sách hóa đơn). Luồng bán hàng không tối ưu cho cỡ này |

---

## 4. Design tokens

### 4.1 Màu sắc

Mọi màu dùng qua token. Không viết mã hex trực tiếp trong component.

**Bề mặt và chữ (nền "đá")**

| Token                    | Hex       | Dùng cho                                 | Tỷ lệ tương phản         |
| ------------------------ | --------- | ---------------------------------------- | ------------------------ |
| `--color-bg`             | `#F2F4F5` | Nền trang                                |                          |
| `--color-surface`        | `#FFFFFF` | Bề mặt làm việc, panel, ô nhập           |                          |
| `--color-surface-sunken` | `#E9EDEF` | Vùng lõm: thanh tìm kiếm, bàn không dùng |                          |
| `--color-border`         | `#D5DBDE` | Đường kẻ phân vùng (trang trí nhẹ)       |                          |
| `--color-border-control` | `#8A979D` | Viền ô nhập, nút phụ                     | 3,0:1 trên trắng         |
| `--color-text`           | `#1A2226` | Chữ chính                                | 16,1:1 trên trắng        |
| `--color-text-muted`     | `#55636A` | Chữ phụ, nhãn                            | 6,2:1 trên trắng         |
| `--color-text-disabled`  | `#98A3A9` | Chữ của mục bị vô hiệu                   | Chỉ dùng cho mục vô hiệu |

**Thương hiệu (nâu phin)**

| Token               | Hex       | Dùng cho                                    | Tỷ lệ tương phản          |
| ------------------- | --------- | ------------------------------------------- | ------------------------- |
| `--color-brand-800` | `#43291A` | Thanh điều hướng trái, thanh trên cùng      | 13,4:1 với chữ trắng      |
| `--color-brand-700` | `#5C3720` | Nút chính khi nhấn (pressed)                | 10,4:1 với chữ trắng      |
| `--color-brand-600` | `#7A4A2B` | Nút chính, liên kết, viền chọn              | 7,4:1 với chữ trắng       |
| `--color-brand-100` | `#F1E4D9` | Nền mục được chọn, bàn đang phục vụ         | 5,9:1 với chữ `brand-600` |
| `--color-brand-50`  | `#F8F0E9` | Nền khi di chuột, dòng được chọn trong bảng |                           |

**Trạng thái**

| Ý nghĩa                            | Chữ và viền                 | Nền nhạt                       | Tương phản (chữ trên nền nhạt) |
| ---------------------------------- | --------------------------- | ------------------------------ | ------------------------------ |
| Thành công (đã thanh toán, khớp)   | `--color-success` `#187A3D` | `--color-success-bg` `#DFF3E6` | 4,7:1                          |
| Nguy hiểm (thiếu tiền, hủy, lỗi)   | `--color-danger` `#B3261E`  | `--color-danger-bg` `#FBE4E2`  | 5,4:1                          |
| Cảnh báo (thừa tiền, sắp hết hàng) | `--color-warning` `#8A5200` | `--color-warning-bg` `#FCEBC8` | 5,4:1                          |
| Thông tin (đơn đang mở)            | `--color-info` `#1F5FB8`    | `--color-info-bg` `#DCE9FA`    | 5,0:1                          |

Quy tắc dùng màu:

- Màu trạng thái **luôn đi kèm biểu tượng và chữ**, không bao giờ là tín hiệu duy nhất (người mù màu vẫn phải hiểu).
- Nút nguy hiểm (hủy đơn, đóng cưỡng chế) dùng nền `danger` với chữ trắng (6,5:1).
- Khi cửa hàng muốn đổi nhận diện, chỉ đổi nhóm `--color-brand-*`. Giữ nguyên bề mặt, chữ và màu trạng thái. Cơ sở dữ liệu chưa có field lưu theme theo cửa hàng, nên MVP dùng một theme chung. Theme riêng từng cửa hàng là giai đoạn 2.

### 4.2 Chữ

| Vai trò           | Font                                        | Ghi chú                                                                                         |
| ----------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Toàn bộ giao diện | **Be Vietnam Pro** (400, 500, 600, 700)     | Thiết kế riêng cho tiếng Việt nên dấu thanh và dấu mũ không bị dính hay chồng chéo ở cỡ chữ nhỏ |
| Dự phòng          | `system-ui, "Segoe UI", Roboto, sans-serif` |                                                                                                 |

Số tiền và số bàn dùng `font-variant-numeric: tabular-nums` để các chữ số cùng độ rộng. Nếu bản font đang dùng không có tabular figures, đặt biến `--font-numeric` sang `"Inter"` và áp cho class `.money`.

| Token       | Cỡ / dòng | Đậm      | Dùng cho                                                          |
| ----------- | --------- | -------- | ----------------------------------------------------------------- |
| `text-xs`   | 12 / 16   | 500      | Chữ phụ thứ yếu. **Không** dùng cho thông tin cần đọc để thao tác |
| `text-sm`   | 14 / 20   | 400, 500 | Chữ phụ, nhãn cột, ghi chú                                        |
| `text-base` | 16 / 24   | 400, 600 | Chữ mặc định, tên món                                             |
| `text-lg`   | 18 / 26   | 600      | Tiêu đề nhóm, giá món                                             |
| `text-xl`   | 22 / 30   | 600      | Tiêu đề màn hình, tiêu đề hộp thoại                               |
| `text-2xl`  | 28 / 36   | 700      | Tổng tiền đơn trong panel đơn                                     |
| `text-3xl`  | 40 / 48   | 700      | Số tiền cần thanh toán, chênh lệch đối soát                       |
| `text-4xl`  | 56 / 64   | 700      | **Tiền thối** trên màn hình thanh toán (điểm nhấn của giao diện)  |

Quy tắc:

- Chữ viết câu thường. Không viết hoa toàn bộ để làm nhãn.
- Không nhấn một từ lẻ trong tiêu đề bằng màu hay chữ nghiêng.
- Độ dài dòng văn bản dưới 80 ký tự.

### 4.3 Khoảng cách, kích thước chạm, bo góc, đổ bóng

**Khoảng cách** theo lưới 4px: `4, 8, 12, 16, 20, 24, 32, 48`. Khoảng cách giữa các ô món là 12px. Lề trong của panel là 16px (tablet) hoặc 24px (máy tính).

**Kích thước chạm**

| Phần tử                                    | Tối thiểu |
| ------------------------------------------ | --------- |
| Nút, ô chọn thông thường                   | 48px      |
| Nút hành động chính (Thanh toán, Xác nhận) | 56px      |
| Phím số trên bàn phím nhập tiền            | 64px      |
| Nút tăng giảm số lượng                     | 44px      |

**Bo góc theo thứ bậc** (không dùng một giá trị cho mọi thứ):

| Token              | Giá trị | Dùng cho                          |
| ------------------ | ------- | --------------------------------- |
| `--radius-control` | 8px     | Nút, ô nhập, thẻ trạng thái nhỏ   |
| `--radius-tile`    | 12px    | Ô món, thẻ bàn                    |
| `--radius-sheet`   | 20px    | Hộp thoại, ngăn kéo, bảng nổi     |
| `--radius-pill`    | 999px   | Nhãn trạng thái (badge), chip lọc |

**Đổ bóng:** thẻ và panel nằm trong trang **không có bóng**, tách bằng viền `--color-border` hoặc khác màu nền. Chỉ lớp nổi lên trên trang (hộp thoại, menu thả xuống, thông báo) mới có bóng: `0 8px 24px rgba(26, 34, 38, 0.16)`.

### 4.4 Chuyển động

| Loại          | Thời lượng      | Dùng cho                  |
| ------------- | --------------- | ------------------------- |
| Phản hồi chạm | 100ms           | Nhấn nút, chọn ô          |
| Mở, đóng      | 180ms, ease-out | Hộp thoại, ngăn kéo, menu |

Chuyển động chỉ trả lời thao tác của người dùng. Khi thêm món, dòng mới trong panel đơn sáng nền `brand-100` rồi mờ dần trong 600ms để người dùng thấy cái gì vừa thay đổi. Tôn trọng `prefers-reduced-motion`: tắt mọi chuyển động trừ đổi trạng thái tức thì.

---

## 5. Cấu trúc và bố cục

### 5.1 Khung ứng dụng

```
┌────┬──────────────────────────────────────────────────────────┐
│    │ Thanh trên: chi nhánh, trạng thái ca, người dùng          │
│ R  ├──────────────────────────────────────────────────────────┤
│ a  │                                                          │
│ i  │                    Vùng nội dung                         │
│ l  │                                                          │
│    │                                                          │
└────┴──────────────────────────────────────────────────────────┘
```

- **Thanh điều hướng trái (rail):** rộng 80px, nền `brand-800`, biểu tượng kèm nhãn ngắn bên dưới, chữ trắng. Mục đang chọn có nền `brand-600`. Các mục: Bán hàng, Bàn, Hóa đơn, Ca làm, Thực đơn, Kho, Báo cáo, Cài đặt. **Chỉ hiện mục người dùng có quyền** (BR-05).
- **Thanh trên:** cao 56px, nền trắng, viền dưới `--color-border`. Bên trái là tên chi nhánh. Ở giữa là chip trạng thái ca ("Ca thu ngân đang mở, 3 giờ 12 phút"). Bên phải là tên người dùng và menu tài khoản.
- **Chủ cửa hàng:** tên chi nhánh là nút chọn chi nhánh, có mục "Tất cả chi nhánh" (BR-71b). Quản lý và thu ngân chỉ thấy tên chi nhánh của mình, không bấm đổi được (BR-70, BR-71).
- **Quản trị nền tảng** dùng khung riêng: không có thanh chọn chi nhánh, không có màn hình dữ liệu vận hành (BR-81). Xem mục 5.8.

Mục trên thanh điều hướng theo vai trò:

| Vai trò           | Các mục                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Thu ngân          | Bán hàng, Bàn, Hóa đơn (của ca mình), Ca làm                                                        |
| Quản lý           | Bán hàng, Bàn, Hóa đơn, Ca làm, Thực đơn, Kho, Báo cáo (chi nhánh mình), Cài đặt (bàn, mã giảm giá) |
| Chủ cửa hàng      | Như quản lý, thêm báo cáo toàn cửa hàng và Cài đặt đầy đủ (chi nhánh, tài khoản)                    |
| Quản trị nền tảng | Cửa hàng, Nhật ký                                                                                   |

### 5.2 Màn hình POS chính (tablet ngang, từ 1024px)

```
┌────┬──────────────────────────────────────────┬─────────────────────────┐
│    │ Chi nhánh Nam Lý      Ca đang mở 3g12p  An│ Bàn 5  |  Tại chỗ       │
│ R  ├──────────────────────────────────────────┤─────────────────────────┤
│ a  │ [Tìm món...                         ]    │ Cà phê sữa  L           │
│ i  │ Cà phê | Trà sữa | Nước ép | Bánh | ...   │   + Thạch cà phê        │
│ l  │──────────────────────────────────────────│   [-] 2 [+]   70.000đ   │
│    │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │ Trà sữa  M              │
│    │ │Cà phê│ │Cà phê│ │Bạc   │ │Nâu   │      │   [-] 1 [+]   35.000đ   │
│    │ │đen   │ │sữa   │ │xỉu   │ │đá    │      │                         │
│    │ │25.000│ │29.000│ │32.000│ │29.000│      │─────────────────────────│
│    │ └──────┘ └──────┘ └──────┘ └──────┘      │ Tạm tính       105.000đ │
│    │ ┌──────┐ ┌──────┐ ...                    │ Giảm giá        10.000đ │
│    │ │      │ │      │                        │ Tổng cộng                │
│    │ └──────┘ └──────┘                        │      95.000đ            │
│    │                                          │ [ Thanh toán 95.000đ ]  │
└────┴──────────────────────────────────────────┴─────────────────────────┘
```

- Vùng món chiếm phần còn lại, vùng đơn **cố định rộng 400px**, cuộn riêng.
- Danh mục là thanh tab ngang cuộn được, tab đang chọn có gạch chân dày 3px màu `brand-600`.
- **Ô món:** tên món (tối đa 2 dòng) và giá nhỏ nhất của món. Cao tối thiểu 96px. Món chỉ có một size thì chạm là thêm ngay. Món có nhiều size hoặc topping thì chạm mở bảng chọn size và topping.
- Không bắt buộc có ảnh món. Món không có ảnh chỉ hiện chữ, để quán nào cũng dùng được mà không phải chụp ảnh.
- **Panel đơn:** đầu panel ghi bàn và loại đơn (Tại chỗ, Mang đi). Giữa là danh sách món cuộn được. Cuối panel cố định: tạm tính, giảm giá, tổng cộng (`text-2xl`), nút Thanh toán (56px, toàn chiều rộng, ghi kèm số tiền).
- Món vừa thêm hiện sáng nền `brand-100` rồi mờ dần.
- Bỏ món có nút xóa rõ ràng trên dòng món. Sau khi bỏ, hiện thông báo "Đã bỏ Cà phê sữa. Hoàn tác" trong 5 giây.
- **Gọi thêm món vào đơn đang mở:** mỗi lần thêm là **một dòng món mới**, không gộp với dòng giống nhau (BR-90). Giao diện có thể nhóm hiển thị cho dễ đọc, nhưng sửa và xóa vẫn theo từng dòng. Sau mỗi thay đổi, tổng tiền lấy lại từ máy chủ, giao diện không tự cộng.
- Đơn của bàn đang phục vụ: đầu panel có thêm giờ mở đơn ("Mở lúc 19:00, 25 phút") và nút "Chuyển bàn" (BR-92).
- Đơn mang đi không có bàn, đầu panel ghi "Mang đi". Đơn tại chỗ phải chọn bàn trước khi thanh toán (BR-69).
- **Đơn đã thanh toán hoặc đã hủy là đơn xong:** sau khi thanh toán/hủy thành công panel đơn bỏ chọn đơn đó (kèm thông báo kết quả); không thêm, sửa, xóa món hay chuyển bàn trên đơn không còn `OPEN`. Khách mới thì tạo đơn mới (đơn mang đi hoặc chạm bàn trống). Nếu danh sách hoặc sơ đồ bàn còn lưu một đơn cũ mà máy chủ báo đã đóng, giao diện không mở đơn đó, tải lại danh sách và coi bàn là trống.
- Đổi giá món giữa chừng không làm đổi giá các dòng đã thêm vào đơn (BR-12).

### 5.3 Sơ đồ bàn

```
Tầng 1 | Sân vườn | Tất cả                                   Còn trống 6 / 12
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Bàn 1  │ │ Bàn 2  │ │ Bàn 3  │ │ Bàn 4  │
│ Trống  │ │ 95.000đ│ │ Trống  │ │ Trống  │
│        │ │ 25 phút│ │        │ │        │
└────────┘ └────────┘ └────────┘ └────────┘
```

| Trạng thái bàn                                | Nền                     | Viền                                   | Nội dung                                       |
| --------------------------------------------- | ----------------------- | -------------------------------------- | ---------------------------------------------- |
| Trống                                         | `surface`               | `border-control`                       | Tên bàn, chữ "Trống"                           |
| Đang phục vụ (có đơn mở)                      | `brand-100`             | `brand-600` 2px                        | Tên bàn, tổng tiền tạm tính, thời gian đã ngồi |
| Ngồi lâu (quá ngưỡng cấu hình, ví dụ 90 phút) | `warning-bg`            | `warning` 2px                          | Như trên, kèm biểu tượng đồng hồ               |
| Ngưng dùng                                    | `surface-sunken`        | không viền                             | Chữ `text-disabled`, không chạm được           |
| Đang chọn                                     | giữ nền theo trạng thái | viền `brand-600` 3px và vòng ngoài 2px |                                                |

- Trạng thái bàn **tính từ dữ liệu** (có đơn `OPEN` hay không), không có nút đổi tay (BR-99).
- Chạm bàn trống: tạo đơn mới. Chạm bàn đang phục vụ: mở đơn đó để gọi thêm món hoặc thanh toán. Khách ngồi chung, hoặc bạn của khách tới sau, thì gọi thêm vào **cùng một đơn**, không tạo đơn thứ hai (BR-74, BR-91).
- **Chuyển bàn:** từ đơn của bàn đang phục vụ, bấm "Chuyển bàn". Sơ đồ bàn hiện lên và chỉ các bàn **trống cùng chi nhánh** chọn được. Chọn bàn mới là đổi bàn của đơn (BR-92). Bàn ngưng dùng hoặc bàn của chi nhánh khác không xuất hiện (BR-95).
- Tách bill và gộp bill chưa có ở MVP (BR-101), giao diện không hiện các nút này.
- Chi nhánh chưa có bàn: hiện câu hướng dẫn "Chi nhánh chưa có bàn. Thêm bàn trong Cài đặt, hoặc bán đơn mang đi." Đơn mang đi vẫn tạo được.
- Chia khu vực bằng tab (Tầng 1, Sân vườn). Bàn xếp theo lưới, thẻ cao tối thiểu 96px.

### 5.4 Hộp thoại thanh toán (điểm nhấn của giao diện)

```
┌─────────────────────────────────────────────────────────────┐
│ Thanh toán  Bàn 5                                       [x]  │
│ ┌──────────────────┬──────────────────┐                      │
│ │ Tiền mặt         │ Chuyển khoản     │                      │
│ └──────────────────┴──────────────────┘                      │
│  Cần thanh toán                                              │
│  95.000đ                                      (text-3xl)     │
│                                                              │
│  [ Đủ tiền ] [ 100.000đ ] [ 200.000đ ] [ 500.000đ ]          │
│  Khách đưa                    ┌───┬───┬───┐                  │
│  100.000đ                     │ 7 │ 8 │ 9 │                  │
│                               │ 4 │ 5 │ 6 │                  │
│  Tiền thối                    │ 1 │ 2 │ 3 │                  │
│  5.000đ                       │ 0 │000│ ⌫ │                  │
│                               └───┴───┴───┘                  │
│                                                              │
│  [ Xác nhận thanh toán ]                                     │
└─────────────────────────────────────────────────────────────┘
```

- **Tiền thối là chữ lớn nhất trên màn hình** (`text-4xl`), nằm ngay dưới số tiền khách đưa, màu `success` khi đủ tiền.
- Chip tiền gợi ý: "Đủ tiền" (đúng số cần trả) và các mệnh giá tròn lớn hơn số cần trả. Chạm chip là điền luôn "Khách đưa".
- Bàn phím số 64px mỗi phím, có phím "000" để nhập nhanh.
- Nếu khách đưa thiếu: hiện "Còn thiếu 20.000đ" màu `danger`, nút Xác nhận bị vô hiệu.
- **Chuyển khoản:** hiện số tiền cần nhận, ô "Mã giao dịch" (không bắt buộc), ô tích "Đã nhận đủ tiền". Nút Xác nhận chỉ sáng khi đã tích.
- Mỗi đơn có tối đa một mã giảm giá và thanh toán một lần, đủ toàn bộ bằng một phương thức (BR-31, BR-40).
- **Đơn 0đ:** thay hai lựa chọn phương thức và ô nhập tiền bằng thông báo "Tổng đơn 0đ" và nút "Hoàn tất đơn". Gửi `POST /invoices/{id}/complete-zero` với `Idempotency-Key`; không tạo khoản thanh toán (BR-104).
- Sau khi bấm Xác nhận, nút chuyển sang trạng thái đang xử lý (có vòng quay) và **bị vô hiệu ngay** để chống thanh toán hai lần (BR-34).
- Mất mạng hoặc không nhận được phản hồi sau khi bấm Xác nhận: giữ nút khóa, hiện "Đang kiểm tra kết quả thanh toán..." và tự gửi lại với **cùng mã `Idempotency-Key`**. Chỉ sinh mã mới khi người dùng chủ động bắt đầu một lần thanh toán khác.
- Thanh toán xong: hiện thông báo "Đã thanh toán 95.000đ" và nút "Đơn mới". Không tự đóng hộp thoại khi chưa có phản hồi từ máy chủ.

### 5.5 Mở ca và đóng ca

**Cổng mở ca.** Thu ngân chưa mở ca thì mọi màn hình bán hàng bị thay bằng màn hình mở ca (BR-16).

```
┌──────────────────────────────────────────┐
│ Mở ca thu ngân                            │
│ Chi nhánh Nam Lý                          │
│                                           │
│ Tiền đầu ca                               │
│ 1.350.000đ            (chỉ đọc)           │
│ Lấy từ ca của An, đóng lúc 12:02 hôm nay  │
│                                           │
│ [ Mở ca ]        Báo lệch tiền giao ca    │
└──────────────────────────────────────────┘
```

- **Tiền đầu ca là chữ, không phải ô nhập** (BR-55). Dòng giải thích nói rõ số tiền lấy từ đâu. Ca đầu tiên của chi nhánh ghi "Quỹ ban đầu do chủ cửa hàng cài đặt".
- "Báo lệch tiền giao ca" là liên kết phụ, mở form báo cho quản lý khi két thực tế khác số hiển thị. Thu ngân không sửa được tiền đầu ca (BR-55, BR-102).
- **Mỗi chi nhánh một ca thu ngân đang mở** (BR-87). Nếu người khác đang giữ ca, nút Mở ca được thay bằng thông báo nói rõ ai và từ lúc nào: "Chi nhánh đang có ca thu ngân của An (từ 07:02). Đợi An đóng ca, hoặc nhờ quản lý đóng ca thay." Người có quyền thấy thêm nút "Đóng cưỡng chế ca".
- **Nhân viên ca `STAFF`** (pha chế, phục vụ) có màn hình đơn giản: một nút lớn "Vào ca" hoặc "Tan ca", hiện giờ vào và thời gian đã làm. Không có tiền đầu ca hay đối soát (BR-15).
- **Đóng cưỡng chế** (quản lý hoặc chủ cửa hàng): hộp thoại bắt buộc nhập lý do, sau đó đi qua đủ hai bước đếm tiền và đối soát như ca thường, vì ca sau cần `tiền đã đếm` (BR-20, BR-88). Nút xác nhận là nút nguy hiểm, ghi rõ tên: "Đóng ca thay An".

**Đóng ca (hai bước, đếm mù, BR-58).**

Bước 1: đếm tiền trong két. **Không hiển thị tiền kỳ vọng.**

```
┌──────────────────────────────────────────┐
│ Đếm tiền trong két                        │
│ Nhập số tờ từng mệnh giá                  │
│  500.000đ   [-]  0 [+]                    │
│  200.000đ   [-]  3 [+]       600.000đ     │
│  100.000đ   [-]  5 [+]       500.000đ     │
│   50.000đ   [-]  4 [+]       200.000đ     │
│   ...                                     │
│ Tổng tiền đã đếm                          │
│ 1.350.000đ                    (text-3xl)  │
│ [ Xác nhận số tiền đã đếm ]               │
└──────────────────────────────────────────┘
```

Bước 2: kết quả đối soát.

```
┌──────────────────────────────────────────┐
│ Kết quả đối soát ca                       │
│ Tiền đầu ca                    500.000đ   │
│ Tiền mặt bán được            1.000.000đ   │
│ Chi trong ca                  −100.000đ   │
│ Tiền kỳ vọng                 1.400.000đ   │
│ Tiền đã đếm                  1.350.000đ   │
│ ─────────────────────────────────────     │
│ Chênh lệch   −50.000đ   [Thiếu]           │
│ Ghi chú (bắt buộc khi lệch)               │
│ [                                  ]      │
│ [ Đóng ca ]                               │
└──────────────────────────────────────────┘
```

- Còn đơn chưa thanh toán thì hiện danh sách các đơn đó và chặn nút Đóng ca (BR-19), kèm lối tắt "Mở đơn".
- Chênh lệch dùng chữ `text-3xl`, dấu trừ thật (U+2212), nhãn trạng thái: Khớp (success), Thiếu (danger), Thừa (warning). Lệch thì ô ghi chú bắt buộc (BR-60).
- Tiền chuyển khoản hiện ở phần tóm tắt riêng bên dưới, không nằm trong phép tính đối soát (BR-54).

### 5.6 Các màn hình quản lý

| Màn hình | Bố cục                                                                                                               | Ghi chú                                                                                                                                                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hóa đơn  | Bảng + bộ lọc (ngày, trạng thái, bàn, thu ngân). Bấm dòng mở chi tiết ở ngăn bên phải                                | Hủy đơn đã thanh toán: nút ở ngăn chi tiết, cần quyền quản lý, lý do, và chỉ khi ca của đơn còn mở. Hộp thoại nhắc hoàn tiền: tiền mặt thì "Hoàn lại 95.000đ cho khách từ két", chuyển khoản thì "Hoàn tiền chuyển khoản ngoài hệ thống" (BR-29) |
| Ca làm   | Danh sách ca. Chi tiết ca có tiền đầu ca, kỳ vọng, đã đếm, chênh lệch, các khoản chi                                 | Ca lệch được đánh dấu bằng nhãn Thiếu hoặc Thừa ở đầu dòng                                                                                                                                                                                       |
| Thực đơn | Bảng món + form sửa ở ngăn bên phải. Tab "Size và giá", "Topping", "Công thức"                                       | Đổi giá chỉ áp cho đơn mới (BR-12). Có nút tải ảnh món lên hệ thống; ảnh không bắt buộc (BR-105)                                                                                                                                               |
| Kho      | Bảng tồn kho theo chi nhánh. Cột: nguyên liệu, tồn, tồn tối thiểu, đơn vị. Tab "Sổ kho"                              | Nguyên liệu sắp hết có nhãn Sắp hết (warning). Tồn âm dùng chữ `danger`                                                                                                                                                                          |
| Báo cáo  | Hàng chỉ số nhỏ (doanh thu, số đơn, tiền mặt, chuyển khoản), biểu đồ cột doanh thu theo ngày, danh sách món bán chạy | Tách tiền mặt và chuyển khoản (BR-64). Chủ cửa hàng có bộ chọn chi nhánh                                                                                                                                                                         |
| Cài đặt  | Tab: Chi nhánh, Bàn, Tài khoản, Mã giảm giá. Xem mục 5.10                                                            | Chủ cửa hàng thấy đủ. Quản lý chỉ thấy Bàn và Mã giảm giá                                                                                                                                                                                        |

Chỉ số báo cáo là một hàng gọn: nhãn nhỏ phía trên, số ở dưới, không nền gradient, không biểu tượng trang trí.

### 5.7 Đăng nhập, đổi mật khẩu, cửa hàng bị khóa

- **Đăng nhập:** tên đăng nhập và mật khẩu. **Không có nút Đăng ký** (BR-78). Sai thông tin: "Tên đăng nhập hoặc mật khẩu chưa đúng." Tài khoản bị khóa: "Tài khoản đã bị khóa. Liên hệ quản lý của bạn."
- **Đổi mật khẩu bắt buộc** (BR-84): tài khoản mới cấp hoặc vừa đặt lại mật khẩu chỉ thấy màn hình này sau khi đăng nhập, không đi tới màn hình khác được cho đến khi đổi xong.

```
┌──────────────────────────────────────────┐
│ Đổi mật khẩu để tiếp tục                  │
│ Mật khẩu hiện tại                         │
│ [                                  ]      │
│ Mật khẩu mới                              │
│ [                                  ]      │
│ Nhập lại mật khẩu mới                     │
│ [                                  ]      │
│ [ Đổi mật khẩu ]                          │
└──────────────────────────────────────────┘
```

- **Cửa hàng bị tạm khóa** (BR-82): người dùng của cửa hàng đăng nhập thấy một màn hình duy nhất: "Cửa hàng đang tạm khóa. Liên hệ nhà cung cấp dịch vụ để mở lại." Không có thao tác nào khác. Lý do nội bộ không hiển thị cho người dùng cửa hàng.

### 5.8 Khu quản trị nền tảng (`PLATFORM_ADMIN`)

Phạm vi triển khai PB-03 chốt ngày 30/10/2026: dùng hai tab Cửa hàng/Chủ quán trong UI hiện có; hoàn thiện xác nhận lưu mật khẩu tạm. Màn Nhật ký và thông tin chi nhánh bên dưới chuyển sang lát cắt tương ứng; MVP PB-03 vẫn ghi log backend theo BR-86.

Khung riêng, thanh trên ghi "Quản trị nền tảng", không có bộ chọn chi nhánh. Rail chỉ có **Cửa hàng** và **Nhật ký** (BR-86, MVP ghi log đơn giản). **Không có số liệu vận hành** (hóa đơn, ca, kho, doanh thu) ở bất kỳ màn hình nào (BR-81).

| Màn hình               | Nội dung                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Danh sách cửa hàng     | Bảng: tên, trạng thái (Hoạt động, Tạm khóa), số chi nhánh, chủ cửa hàng, ngày tạo. Nút chính "Tạo cửa hàng"                     |
| Tạo cửa hàng           | Hai phần trong một form: thông tin cửa hàng (tên, điện thoại, email, địa chỉ) và tài khoản chủ cửa hàng (họ tên, tên đăng nhập) |
| Chi nhánh của cửa hàng | Chỉ số lượng và trạng thái. Không có dữ liệu bán hàng                                                                           |
| Chi tiết cửa hàng      | Thông tin, danh sách chủ cửa hàng. Hành động: "Tạm khóa cửa hàng", "Mở lại cửa hàng", "Đặt lại mật khẩu chủ cửa hàng"           |

- "Tạm khóa cửa hàng" là nút nguy hiểm, bắt buộc nhập lý do (BR-96), hộp thoại nói rõ hậu quả: "Mọi người dùng của cửa hàng sẽ bị đăng xuất và không đăng nhập được. Dữ liệu được giữ nguyên."
- Sau khi tạo cửa hàng hoặc đặt lại mật khẩu, hiện hộp thoại **mật khẩu tạm một lần** (BR-84):

```
┌──────────────────────────────────────────┐
│ Đã tạo cửa hàng "Cafe Ông Long"           │
│ Tài khoản chủ cửa hàng                    │
│ Tên đăng nhập     ongchu                  │
│ Mật khẩu tạm      Kx7-9fQ2-mP  [Sao chép] │
│ Mật khẩu này chỉ hiển thị một lần.        │
│ Sao chép và gửi cho chủ cửa hàng.         │
│ [x] Tôi đã lưu mật khẩu                   │
│ [ Đóng ]                                  │
└──────────────────────────────────────────┘
```

- Nút Đóng chỉ sáng khi đã tích "Tôi đã lưu mật khẩu". Đóng rồi thì mật khẩu không xem lại được.

### 5.9 Thiết lập ban đầu cho chủ cửa hàng

Cửa hàng mới thì trang đầu của chủ cửa hàng hiện danh sách việc cần làm. Đây là một chuỗi thực sự theo thứ tự, nên đánh số:

1. Tạo chi nhánh: nhập mã chi nhánh và quỹ tiền ban đầu của két.
2. Tạo bàn cho từng chi nhánh.
3. Tạo thực đơn: danh mục, món, size, topping.
4. Nhập nguyên liệu và công thức cho món.
5. Cấp tài khoản quản lý và thu ngân.

- Mỗi bước hiện trạng thái Xong hoặc Chưa làm, **tính từ dữ liệu** (có chi nhánh chưa, có bàn chưa...), bấm vào dẫn tới đúng màn hình.
- Danh sách tự ẩn khi cả năm bước xong.
- Khi thu ngân đăng nhập vào chi nhánh chưa có thực đơn, màn hình bán hàng hiện trạng thái trống có hướng dẫn: "Chưa có món nào. Nhờ quản lý hoặc chủ cửa hàng tạo thực đơn."

### 5.10 Cài đặt cửa hàng

Lát cắt PB-13 tổ chức chốt ngày30/10/2026: giữ ba tab Chi nhánh/Bàn/Tài khoản theo permission; OWNER vào Cài đặt sau đăng nhập. Bộ lọc chi nhánh thật nằm trong Cài đặt; thanh trên tại đây không hiển thị chi nhánh/ca demo. Checklist thiết lập mục5.9 và Mã giảm giá chưa thuộc lát cắt này. Bàn chỉ hiển thị thông tin cấu hình, không lấy trạng thái phục vụ từ mock; tên vai trò/field/giới hạn theo spec organization/users đã chốt. Mật khẩu tạm chỉ state hộp thoại, xác nhận đã lưu mới đóng. Bảng dùng cursor và cuộn ngang trong vùng riêng trên tablet768/1024px.

**Tab Chi nhánh** (chủ cửa hàng):

| Ô nhập                             | Ghi chú giao diện                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Tên chi nhánh, địa chỉ, điện thoại |                                                                                                                                    |
| Mã chi nhánh                       | 2 đến 10 ký tự; dùng để quản lý chi nhánh, không làm tiền tố mã hóa đơn.                                                            |
| Quỹ tiền ban đầu của két           | Ô nhập tiền. Chú thích: "Là tiền đầu ca của ca thu ngân đầu tiên. Từ ca sau, hệ thống tự lấy từ tiền đã đếm của ca trước." (BR-55) |
| Trạng thái                         | Ngưng hoạt động thì không mở ca, không tạo đơn mới. Dữ liệu cũ giữ nguyên (BR-76)                                                  |

**Tab Bàn** (chủ cửa hàng, quản lý chi nhánh mình): danh sách bàn theo khu vực, thêm bàn, đổi tên, ngưng dùng. Không có nút xóa khi bàn đã có hóa đơn (BR-10).

**Tab Tài khoản** (chủ cửa hàng):

- Khi tạo tài khoản, ô Vai trò **chỉ liệt kê vai trò thấp hơn** vai trò của người tạo (BR-83). Chủ cửa hàng chọn được Quản lý hoặc Thu ngân.
- Quản lý và Thu ngân **bắt buộc chọn chi nhánh** (BR-70).
- Mật khẩu tạm hiển thị một lần như mục 5.8.
- Khóa tài khoản thay cho xóa (BR-07). Nút khóa của chủ cửa hàng cuối cùng bị vô hiệu kèm dòng giải thích: "Cửa hàng cần ít nhất một chủ cửa hàng đang hoạt động." (BR-85)
- Người dùng không tự khóa hay tự hạ quyền chính mình (BR-06).

**Tab Mã giảm giá** (chủ cửa hàng, quản lý): mã dùng chung toàn cửa hàng. Danh sách có cột đã dùng và giới hạn lượt dùng.

---

## 6. Components

### 6.1 Nút

| Loại      | Giao diện                                    | Dùng cho                                                       |
| --------- | -------------------------------------------- | -------------------------------------------------------------- |
| Chính     | Nền `brand-600`, chữ trắng, cao 48 hoặc 56px | Một hành động chính trên mỗi vùng: Thanh toán, Xác nhận, Mở ca |
| Phụ       | Nền trắng, viền `border-control`, chữ `text` | Hủy, Quay lại, Áp mã giảm giá                                  |
| Nguy hiểm | Nền `danger`, chữ trắng                      | Hủy đơn, đóng cưỡng chế ca                                     |
| Chữ       | Không nền, chữ `brand-600`                   | Hành động phụ ít quan trọng (Báo lệch tiền giao ca)            |

- Mỗi vùng chỉ có **một nút chính**.
- Nhãn nút là động từ cụ thể: "Thanh toán", "Mở ca", "Lưu thay đổi", không dùng "Gửi" hay "OK".
- Trạng thái: bình thường, hover (máy tính), nhấn (`brand-700`), vô hiệu (nền `surface-sunken`, chữ `text-disabled`), đang xử lý (vòng quay thay biểu tượng, nút bị khóa).
- Nút vô hiệu khi thiếu quyền thì có chú thích (tooltip hoặc dòng chữ nhỏ) nêu lý do: "Cần quyền quản lý".

### 6.2 Ô món (product tile)

Nền trắng, viền `border`, bo `radius-tile`, cao tối thiểu 96px. Tên món `text-base` đậm 600 (tối đa 2 dòng, cắt có dấu ba chấm). Giá `text-lg`, tabular. Khi nhấn: nền `brand-50`, phản hồi 100ms. Món ngưng bán (`is_active = false`) không hiện trong màn hình bán hàng (BR-09).

### 6.3 Dòng món trong đơn

Tên món và size ở dòng đầu (`text-base`, 600). Topping ở dòng thứ hai (`text-sm`, `text-muted`), ghi chú ở dòng thứ ba nếu có. Bên phải là bộ tăng giảm số lượng (nút 44px) và thành tiền canh phải. Thành tiền do máy chủ tính, **không có ô sửa giá** (BR-24).

### 6.4 Nhãn trạng thái (badge)

Dạng viên thuốc (`radius-pill`), nền nhạt, chữ đậm 600 cỡ `text-sm`, **luôn có biểu tượng nhỏ phía trước**.

| Đối tượng                 | Giá trị                             | Nhãn                    | Màu                           |
| ------------------------- | ----------------------------------- | ----------------------- | ----------------------------- |
| Hóa đơn                   | `OPEN`                              | Đang mở                 | Thông tin                     |
| Hóa đơn                   | `PAID`                              | Đã thanh toán           | Thành công                    |
| Hóa đơn                   | `CANCELLED`                         | Đã hủy                  | Nguy hiểm                     |
| Ca làm                    | `OPEN`                              | Đang mở                 | Thông tin                     |
| Ca làm                    | `CLOSED`                            | Đã đóng                 | Trung tính (`surface-sunken`) |
| Đối soát                  | `PENDING`                           | Chưa đối soát           | Trung tính                    |
| Đối soát                  | `MATCHED`                           | Khớp                    | Thành công                    |
| Đối soát                  | `SHORTAGE`                          | Thiếu                   | Nguy hiểm                     |
| Đối soát                  | `OVERAGE`                           | Thừa                    | Cảnh báo                      |
| Kho                       | tồn nhỏ hơn hoặc bằng mức tối thiểu | Sắp hết                 | Cảnh báo                      |
| Thanh toán                | `CASH` / `TRANSFER`                 | Tiền mặt / Chuyển khoản | Trung tính                    |
| Cửa hàng                  | `ACTIVE`                            | Hoạt động               | Thành công                    |
| Cửa hàng                  | `SUSPENDED`                         | Tạm khóa                | Nguy hiểm                     |
| Chi nhánh, bàn, tài khoản | `is_active = false`                 | Ngưng hoạt động         | Trung tính                    |
| Tài khoản                 | `must_change_password = true`       | Chờ đổi mật khẩu        | Cảnh báo                      |

### 6.5 Ô nhập, chọn

- Cao 48px, viền `border-control`, bo `radius-control`, nhãn nằm **phía trên** ô, không dùng placeholder thay nhãn.
- Ô nhập tiền và số lượng dùng `inputmode="numeric"`, canh phải, có đơn vị `đ` ở cuối.
- Lỗi: viền `danger`, dòng giải thích bên dưới (`text-sm`, `danger`) nói rõ cần sửa gì.
- Focus: vòng 2px `brand-600`, cách 2px.

### 6.6 Hộp thoại, ngăn kéo, thông báo

- Hộp thoại: bo `radius-sheet`, có bóng, nền mờ `rgba(26,34,38,0.48)` phía sau. Tối đa một hộp thoại tại một thời điểm.
- Hộp thoại xác nhận hành động nguy hiểm: nút nguy hiểm nằm bên phải, nút Hủy bên trái, hành động hủy luôn thoát được bằng phím Esc và nút đóng.
- Thông báo (toast): xuất hiện góc dưới trái, tự biến mất sau 5 giây, có nút Hoàn tác khi hành động hoàn tác được. Thông báo lỗi **không tự biến mất**.

### 6.7 Bảng dữ liệu

- Hàng cao 48px, tiêu đề cột cố định khi cuộn, dòng chọn nền `brand-50`.
- Cột tiền canh phải, tabular. Cột trạng thái dùng badge. Cột văn bản canh trái.
- Sắp xếp và lọc ở thanh phía trên bảng. Phân trang theo con trỏ, hiển thị tổng số dòng.
- Bảng rộng cuộn ngang trong khung riêng, không làm cả trang cuộn ngang.

---

## 7. Trạng thái và phản hồi

| Trạng thái              | Cách hiển thị                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Đang tải danh sách      | Khung xám nhấp nháy nhẹ (skeleton) đúng hình dạng nội dung, không dùng vòng quay toàn trang                                                |
| Đang xử lý một thao tác | Nút chuyển sang đang xử lý và bị khóa. Không chặn cả màn hình                                                                              |
| Trống                   | Câu nói rõ việc cần làm kèm một nút hành động                                                                                              |
| Lỗi tải                 | Khung lỗi tại chỗ có nút "Thử lại"                                                                                                         |
| Mất kết nối             | Dải thông báo cố định đầu màn hình: "Mất kết nối. Thao tác mới sẽ không được lưu cho đến khi có mạng." Nút thao tác ghi dữ liệu bị vô hiệu |
| Không đủ quyền          | Mục không hiện nếu không có quyền xem. Nút bị vô hiệu kèm lý do nếu quyền thiếu chỉ ở một hành động                                        |

MVP không hỗ trợ bán hàng ngoại tuyến. Khi mất mạng, không cho tạo đơn hay thanh toán, để tránh lệch kho và đối soát.

---

## 8. Quy tắc giao diện gắn với business rule

| Quy tắc giao diện                                                                             | Rule                 |
| --------------------------------------------------------------------------------------------- | -------------------- |
| Không có ô nhập đơn giá hay tổng tiền. Giá lấy từ máy chủ                                     | BR-24                |
| Tiền đầu ca hiển thị dạng chữ chỉ đọc, kèm nguồn gốc                                          | BR-55                |
| Đóng ca đếm mù: không hiện tiền kỳ vọng trước khi nhập số đã đếm                              | BR-58                |
| Chưa mở ca thì chặn toàn bộ màn hình bán hàng, thay bằng màn hình mở ca                       | BR-16                |
| Không đóng được ca khi còn đơn mở. Hiện danh sách đơn đó                                      | BR-19                |
| Hủy đơn đã thanh toán chỉ có ở người có quyền. Bắt buộc nhập lý do                            | BR-29                |
| Nút Thanh toán bị khóa ngay sau khi bấm                                                       | BR-34                |
| Bàn đang có đơn mở: chạm vào mở đơn đó, không tạo đơn thứ hai                                 | BR-74                |
| Chủ đơn mang đi không chọn bàn. Đơn tại chỗ bắt buộc chọn bàn                                 | BR-69                |
| Ca đóng rồi thì mọi ô nhập của ca đó chỉ đọc                                                  | BR-17                |
| Chỉ hiện dữ liệu của chi nhánh người dùng. Chủ cửa hàng có bộ chọn chi nhánh                  | BR-70, BR-71, BR-71b |
| Tách tiền mặt và chuyển khoản trong mọi báo cáo                                               | BR-64                |
| Ngày tính doanh thu theo múi giờ Việt Nam (UTC+7)                                             | BR-63                |
| Món chưa có công thức vẫn bán được, nhưng cảnh báo ở màn hình thực đơn                        | BR-49                |
| Một chi nhánh một ca thu ngân: chặn nút Mở ca khi người khác đang giữ ca, nói rõ ai           | BR-87                |
| Đóng cưỡng chế ca bắt buộc lý do và tiền đã đếm                                               | BR-20, BR-88         |
| Thêm món là thêm dòng mới, tổng tiền lấy lại từ máy chủ                                       | BR-90                |
| Bạn của khách tới sau thì gọi thêm vào cùng đơn. Chuyển bàn chỉ chọn bàn trống cùng chi nhánh | BR-91, BR-92, BR-95  |
| Trạng thái bàn tính từ dữ liệu, không có nút đổi tay                                          | BR-99                |
| Đổi giá chỉ áp cho món thêm sau đó, có chú thích dưới ô giá                                   | BR-12                |
| Không có đăng ký công khai. Mật khẩu tạm chỉ hiện một lần. Tài khoản mới bị buộc đổi mật khẩu | BR-78, BR-84         |
| Khu quản trị nền tảng không có màn hình dữ liệu vận hành                                      | BR-81                |
| Tạm khóa cửa hàng bắt buộc lý do. Người dùng cửa hàng bị khóa không đăng nhập được            | BR-96, BR-82         |
| Ô Vai trò chỉ liệt kê vai trò thấp hơn. Chủ cửa hàng cuối cùng không khóa được                | BR-83, BR-85         |
| Quỹ tiền ban đầu của két do chủ cửa hàng cài. Thu ngân không sửa tiền đầu ca                  | BR-55, BR-102        |

---

## 9. Nội dung và ngôn ngữ

### 9.1 Giọng văn

Ngắn, rõ, nói theo việc người dùng đang làm. Dùng động từ cụ thể. Gọi tên theo cách người dùng hiểu, không theo cách hệ thống xây dựng. Một hành động giữ nguyên tên suốt luồng: nút "Thanh toán" thì thông báo là "Đã thanh toán".

### 9.2 Từ vựng thống nhất

| Dùng                                                 | Không dùng                         |
| ---------------------------------------------------- | ---------------------------------- |
| Hóa đơn (hoặc đơn khi nói ngắn trong luồng bán hàng) | Bill, order, phiếu                 |
| Ca làm, ca thu ngân                                  | Shift, phiên                       |
| Đối soát tiền mặt                                    | Reconcile, kiểm tiền               |
| Tiền đầu ca, tiền đã đếm, tiền kỳ vọng               | Opening, counted, expected         |
| Chênh lệch, Thiếu, Thừa                              | Lệch tiền (khi là nhãn), Âm, Dương |
| Tại chỗ, Mang đi                                     | Dine-in, Takeaway                  |
| Tồn kho, Nhập kho, Kiểm kê, Hao hụt                  | Stock, Import (hiển thị)           |
| Chi nhánh                                            | Branch, cơ sở                      |
| Mã giảm giá                                          | Voucher, coupon                    |
| Cửa hàng                                             | Store, tenant, thương hiệu         |
| Chủ cửa hàng                                         | Owner, admin                       |
| Quản trị nền tảng                                    | Super admin, platform admin        |
| Mật khẩu tạm                                         | Mật khẩu mặc định                  |
| Tạm khóa (cửa hàng), Khóa (tài khoản)                | Vô hiệu hóa, ban                   |
| Quỹ tiền ban đầu                                     | Initial cash                       |
| Đóng cưỡng chế ca                                    | Force close                        |
| Thực đơn                                             | Menu (khi hiển thị tên mục)        |

### 9.3 Mẫu thông báo

| Tình huống                                   | Nội dung                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Chưa mở ca                                   | "Chưa mở ca. Mở ca thu ngân để bắt đầu bán hàng."                                                            |
| Bàn đã có đơn                                | "Bàn 5 đang có đơn. Mở đơn để gọi thêm món."                                                                 |
| Khách đưa thiếu tiền                         | "Khách đưa chưa đủ. Cần thêm 20.000đ."                                                                       |
| Còn đơn chưa trả khi đóng ca                 | "Còn 2 đơn chưa thanh toán. Thanh toán hoặc hủy các đơn này trước khi đóng ca."                              |
| Thiếu quyền                                  | "Cần quyền quản lý để hủy đơn đã thanh toán."                                                                |
| Thanh toán thành công                        | "Đã thanh toán 95.000đ."                                                                                     |
| Lỗi máy chủ                                  | "Chưa lưu được. Kiểm tra kết nối rồi thử lại."                                                               |
| Danh sách đơn trống                          | "Chưa có đơn nào trong ca này. Chọn món để tạo đơn đầu tiên."                                                |
| Kho trống                                    | "Chưa có nguyên liệu nào. Thêm nguyên liệu đầu tiên để theo dõi tồn kho."                                    |
| Chi nhánh đang có ca thu ngân của người khác | "Chi nhánh đang có ca thu ngân của An (từ 07:02). Đợi An đóng ca, hoặc nhờ quản lý đóng ca thay."            |
| Chưa có bàn                                  | "Chi nhánh chưa có bàn. Thêm bàn trong Cài đặt, hoặc bán đơn mang đi."                                       |
| Chưa có thực đơn                             | "Chưa có món nào. Nhờ quản lý hoặc chủ cửa hàng tạo thực đơn."                                               |
| Tài khoản bị khóa                            | "Tài khoản đã bị khóa. Liên hệ quản lý của bạn."                                                             |
| Cửa hàng bị tạm khóa                         | "Cửa hàng đang tạm khóa. Liên hệ nhà cung cấp dịch vụ để mở lại."                                            |
| Phải đổi mật khẩu                            | "Bạn cần đổi mật khẩu trước khi tiếp tục."                                                                   |
| Hiển thị mật khẩu tạm                        | "Mật khẩu này chỉ hiển thị một lần. Sao chép và gửi cho người dùng trước khi đóng."                          |
| Khóa chủ cửa hàng cuối cùng                  | "Cửa hàng cần ít nhất một chủ cửa hàng đang hoạt động. Thêm chủ cửa hàng khác trước khi khóa tài khoản này." |

Lỗi không xin lỗi dài dòng và không nói mơ hồ: nêu việc đã xảy ra và cách sửa.

---

## 10. Định dạng dữ liệu

| Loại                 | Quy tắc                                                                                   | Ví dụ                      |
| -------------------- | ----------------------------------------------------------------------------------------- | -------------------------- |
| Tiền                 | Dấu chấm ngăn nghìn, không phần thập phân, đơn vị `đ` dính liền, lưu `bigint` đơn vị đồng | `29.000đ`, `1.350.000đ`    |
| Số âm                | Dấu trừ thật (U+2212), không dùng gạch nối. Kèm nhãn Thiếu                                | `−50.000đ`                 |
| Ngày                 | `dd/MM/yyyy`                                                                              | `27/10/2026`               |
| Giờ                  | 24 giờ, `HH:mm`                                                                           | `14:05`                    |
| Thời lượng           | Giờ và phút bằng chữ                                                                      | `3 giờ 12 phút`, `25 phút` |
| Múi giờ              | Hiển thị theo `Asia/Ho_Chi_Minh`, lưu UTC                                                 |                            |
| Số lượng nguyên liệu | Theo đơn vị gốc, tối đa 3 số lẻ, bỏ số 0 thừa                                             | `56 g`, `1,5 l`            |
| Mã hóa đơn           | Chữ đậm, không ngắt dòng                                                                  | `HDA1B2C3D4`              |

Cột số canh phải và dùng chữ số tabular để các hàng thẳng cột.

---

## 11. Khả năng tiếp cận

- Tương phản chữ tối thiểu 4,5:1 (chữ lớn từ 3:1). Các cặp màu trong tài liệu này đã tính sẵn.
- Viền ô nhập và nút phụ tối thiểu 3:1 so với nền (`--color-border-control`).
- Focus nhìn thấy rõ: vòng 2px `brand-600`, cách 2px. Không bao giờ bỏ outline mà không thay thế.
- Trạng thái không chỉ dựa vào màu: luôn có biểu tượng và chữ.
- Toàn bộ thao tác làm được bằng bàn phím trên máy tính. Thứ tự Tab theo thứ tự hiển thị. Hộp thoại giữ focus bên trong và trả focus về nút đã mở nó khi đóng.
- Thông báo dùng `aria-live="polite"`, lỗi dùng `role="alert"`. Lỗi ô nhập gắn với ô qua `aria-describedby`.
- Tôn trọng `prefers-reduced-motion`.
- Cỡ chữ cơ bản 16px, cho phép người dùng phóng chữ đến 200% mà không vỡ bố cục.

---

## 12. Triển khai

### 12.1 Biến CSS

```css
:root {
  /* Bề mặt và chữ */
  --color-bg: #f2f4f5;
  --color-surface: #ffffff;
  --color-surface-sunken: #e9edef;
  --color-border: #d5dbde;
  --color-border-control: #8a979d;
  --color-text: #1a2226;
  --color-text-muted: #55636a;
  --color-text-disabled: #98a3a9;

  /* Thương hiệu (nâu phin). Đổi nhóm này để đổi nhận diện cửa hàng */
  --color-brand-800: #43291a;
  --color-brand-700: #5c3720;
  --color-brand-600: #7a4a2b;
  --color-brand-100: #f1e4d9;
  --color-brand-50: #f8f0e9;

  /* Trạng thái */
  --color-success: #187a3d;
  --color-success-bg: #dff3e6;
  --color-danger: #b3261e;
  --color-danger-bg: #fbe4e2;
  --color-warning: #8a5200;
  --color-warning-bg: #fcebc8;
  --color-info: #1f5fb8;
  --color-info-bg: #dce9fa;

  /* Bo góc */
  --radius-control: 8px;
  --radius-tile: 12px;
  --radius-sheet: 20px;
  --radius-pill: 999px;

  /* Lớp nổi */
  --shadow-overlay: 0 8px 24px rgba(26, 34, 38, 0.16);

  /* Chữ */
  --font-sans: "Be Vietnam Pro", system-ui, "Segoe UI", Roboto, sans-serif;
  --font-numeric: var(--font-sans);
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 24px;
}

.money,
.num {
  font-family: var(--font-numeric);
  font-variant-numeric: tabular-nums;
}

:focus-visible {
  outline: 2px solid var(--color-brand-600);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Nạp font: `https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap` (có bộ ký tự tiếng Việt).

### 12.2 Tailwind (nếu dùng)

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-sunken": "var(--color-surface-sunken)",
        border: "var(--color-border)",
        "border-control": "var(--color-border-control)",
        text: "var(--color-text)",
        muted: "var(--color-text-muted)",
        brand: {
          800: "var(--color-brand-800)",
          700: "var(--color-brand-700)",
          600: "var(--color-brand-600)",
          100: "var(--color-brand-100)",
          50: "var(--color-brand-50)",
        },
        success: "var(--color-success)",
        danger: "var(--color-danger)",
        warning: "var(--color-warning)",
        info: "var(--color-info)",
      },
      borderRadius: {
        control: "var(--radius-control)",
        tile: "var(--radius-tile)",
        sheet: "var(--radius-sheet)",
      },
      fontFamily: { sans: "var(--font-sans)" },
    },
  },
};
```

### 12.3 Hiển thị tiền

```ts
const vnd = new Intl.NumberFormat("vi-VN");

export function formatVND(amount: number): string {
  const abs = vnd.format(Math.abs(amount));
  return (amount < 0 ? "\u2212" : "") + abs + "đ";
}
```

Lưu và tính tiền bằng số nguyên (đồng). Không dùng số thực cho tiền.

### 12.4 Gợi ý thư viện (React)

| Nhu cầu                               | Gợi ý                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thành phần nền (hộp thoại, menu, tab) | Radix UI hoặc shadcn/ui, tùy biến theo token trong tài liệu này. Nếu dự án dùng MUI thì ánh xạ token vào `createTheme` (màu, bo góc, chữ), giữ nguyên giá trị |
| Biểu tượng                            | `lucide-react`, nét 1,75px, cỡ 20 đến 24px                                                                                                                    |
| Bảng dữ liệu                          | TanStack Table                                                                                                                                                |
| Gọi API và bộ nhớ đệm                 | TanStack Query                                                                                                                                                |
| Biểu đồ                               | Recharts. Màu cột dùng token, không dùng bảng màu mặc định                                                                                                    |
| Biểu mẫu                              | React Hook Form kèm Zod                                                                                                                                       |

### 12.5 Cấu trúc thư mục gợi ý

```
src/
  design/            tokens.css, tailwind preset, formatVND
  components/ui/     Button, Badge, Field, Dialog, Toast, DataTable
  features/
    pos/             ProductGrid, OrderPanel, PaymentDialog
    tables/          TableMap
    shifts/          OpenShiftGate, CashCount, ReconcileResult
    inventory/       StockTable, StockMovements
    reports/
    auth/            LoginPage, ForceChangePassword, SuspendedStore
    platform/        StoreList, CreateStoreForm, TempPasswordDialog, StoreDetail
    settings/        BranchForm, TableManager, UserManager, PromotionManager
    onboarding/      SetupChecklist
  app/               layout (Rail, Topbar, PlatformShell), routes, guards theo quyền và chi nhánh
```

---

## 13. Việc không làm

- Không dùng gradient, ảnh nền trang trí, hoặc đổ bóng cho thẻ trong trang.
- Không viết hoa toàn bộ để làm nhãn. Không đặt nhãn phụ phía trên mỗi tiêu đề.
- Không chia mọi nội dung thành các thẻ bo góc giống hệt nhau.
- Không dùng emoji thay biểu tượng.
- Không dùng màu làm tín hiệu duy nhất.
- Không có ô nhập giá bán hay tổng tiền trong màn hình bán hàng.
- Không hiện tiền kỳ vọng trước khi thu ngân nhập số tiền đã đếm.
- Không để nút nguy hiểm nằm sát nút chính.
- Không dùng animation tự chạy hoặc hiệu ứng hover là cách duy nhất để lộ chức năng.
- Không viết mã hex trực tiếp trong component. Luôn dùng token.
- Không có nút Đăng ký công khai.
- Không hiển thị dữ liệu vận hành (hóa đơn, ca, kho, doanh thu) trong khu quản trị nền tảng.
- Không hiển thị lại mật khẩu tạm sau khi hộp thoại đã đóng.
- Không hiện nút tách bill, gộp bill khi chưa hỗ trợ.

---

## 14. Danh sách kiểm tra trước khi hoàn thành một màn hình

- [ ] Mọi mục tiêu chạm cao tối thiểu 48px (nút chính 56px).
- [ ] Mọi màu lấy từ token, mọi cặp chữ và nền đạt 4,5:1.
- [ ] Mọi trạng thái có biểu tượng và chữ đi kèm màu.
- [ ] Số tiền dùng `formatVND`, chữ số tabular, canh phải.
- [ ] Mỗi vùng chỉ có một nút chính. Nhãn nút là động từ cụ thể.
- [ ] Có đủ trạng thái: đang tải, trống, lỗi, mất kết nối, không đủ quyền.
- [ ] Nội dung chữ theo từ vựng ở mục 9, không lẫn tiếng Anh.
- [ ] Thao tác nguy hiểm có xác nhận và lý do bắt buộc khi business rule yêu cầu.
- [ ] Dữ liệu được lọc theo cửa hàng và chi nhánh của người dùng, không tin tham số từ giao diện.
- [ ] Mục điều hướng và nút hành động chỉ hiện khi có quyền, đúng ma trận quyền trong `BUSINESS_RULES.md`.
- [ ] Màn hình mới có mã BR tương ứng được ghi ở mục 8.
- [ ] Làm được bằng bàn phím trên máy tính, có focus nhìn thấy.
- [ ] Kiểm tra ở 1024px (tablet ngang) và 768px (tablet dọc).
