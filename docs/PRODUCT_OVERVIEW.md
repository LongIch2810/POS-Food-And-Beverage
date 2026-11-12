# PRODUCT_OVERVIEW

> Quyết định Sprint 08 ngày 09/11/2026: chuyển khoản dùng QR và SePay tự xác nhận, kèm xác nhận thủ công của MANAGER/OWNER khi cần. Quy tắc chi tiết tại [spec thanh toán](../.devloopflow/specs/invoices.md); phần mô tả cũ trái quyết định này là lịch sử.


Tài liệu tổng quan sản phẩm dành cho agent. Đọc file này **trước tiên** để hiểu sản phẩm là gì, ai dùng, làm gì, và những điều không được vi phạm. File này không mô tả chi tiết bảng, API hay giao diện, các phần đó nằm ở tài liệu riêng (xem mục 12).

---

## 1. Sản phẩm là gì

- Hệ thống **POS (bán hàng tại quầy) và quản lý kho** cho quán cà phê và trà sữa.
- Dạng **SaaS nhiều cửa hàng** (multi-tenant): mỗi khách hàng là một cửa hàng (`store`), mỗi cửa hàng có nhiều chi nhánh (`branch`), mỗi chi nhánh có nhiều bàn.
- Giải quyết ba việc chính của quán: **ghi đơn nhanh và đúng**, **kiểm soát tiền mặt theo ca**, **theo dõi nguyên liệu trong kho tự động theo món bán ra**.
- Giao diện tiếng Việt. Tiền tệ VND. Múi giờ hiển thị `Asia/Ho_Chi_Minh` (UTC+7), dữ liệu lưu UTC.

## 2. Mục tiêu và nguyên tắc sản phẩm

- **Nhanh**: thu ngân thêm món và thanh toán trong vài chạm, dùng được khi quán đông.
- **Đúng tiền**: giá do hệ thống tính, thu ngân không gõ tay giá hay tổng tiền.
- **Truy vết được**: mọi thay đổi tiền và kho đều để lại dấu vết (hóa đơn, ca, sổ kho).
- **Cô lập dữ liệu**: cửa hàng này không bao giờ thấy dữ liệu cửa hàng khác.
- **Làm sâu một ngành**: chỉ phục vụ F&B (cà phê, trà sữa, quán ăn nhỏ). Không mở rộng sang bán lẻ, spa, siêu thị.

## 3. Người dùng và vai trò

| Vai trò           | Mã               | Thuộc                 | Việc chính                                                          |
| ----------------- | ---------------- | --------------------- | ------------------------------------------------------------------- |
| Quản trị nền tảng | `PLATFORM_ADMIN` | Không thuộc store nào | Tạo cửa hàng, cấp tài khoản chủ cửa hàng, khóa hoặc mở lại cửa hàng |
| Chủ cửa hàng      | `OWNER`          | Một store             | Quản lý chi nhánh, menu, tài khoản nhân viên, xem mọi chi nhánh     |
| Quản lý           | `MANAGER`        | Một chi nhánh         | Vận hành chi nhánh: kho, báo cáo, duyệt hủy đơn, đóng cưỡng chế ca  |
| Thu ngân          | `CASHIER`        | Một chi nhánh         | Bán hàng, thanh toán, mở và đóng ca của mình                        |

- Không có đăng ký công khai. **Tài khoản luôn do cấp trên tạo**: `PLATFORM_ADMIN` cấp `OWNER`, `OWNER` cấp `MANAGER` và `CASHIER`.
- Người cấp tài khoản chỉ cấp được vai trò **thấp hơn** mình, trong phạm vi store (và chi nhánh) của mình.
- `PLATFORM_ADMIN` **không xem dữ liệu vận hành** (hóa đơn, ca, kho, doanh thu) của cửa hàng.
- Quyền kiểm tra theo `permissions`, không kiểm tra theo tên vai trò cứng trong code. Quyền xem toàn cửa hàng là `branch.access_all`.

## 4. Mô hình tổ chức

```
store (cửa hàng) ── branch (chi nhánh) ── dining_table (bàn)
                          │
                          ├── users (thu ngân, quản lý)
                          ├── work_shifts (ca) ── cash_reconciliation (đối soát)
                          ├── invoices (hóa đơn)
                          └── tồn kho nguyên liệu (từng chi nhánh)
```

- **Menu dùng chung trong một store**: mọi chi nhánh bán cùng menu, cùng giá. Menu giữa các store tách biệt.
- **Công thức nguyên liệu dùng chung trong một store**: một ly cà phê sữa pha như nhau ở mọi chi nhánh.
- **Tồn kho tách theo chi nhánh**: mỗi chi nhánh có số tồn và ngưỡng cảnh báo riêng.
- **Người dùng** thuộc một store. `CASHIER` và `MANAGER` bắt buộc gắn một chi nhánh. `OWNER` không gắn chi nhánh nên xem được toàn store.

## 5. Phạm vi sản phẩm

### MVP (làm trước)

- Quản trị nền tảng: tạo cửa hàng, cấp tài khoản chủ, khóa và mở cửa hàng.
- Xác thực, phân quyền theo vai trò, buộc đổi mật khẩu lần đầu.
- Quản lý chi nhánh, bàn, tài khoản nhân viên.
- Danh mục sản phẩm: danh mục, món, size, giá, topping, tải ảnh món lên hệ thống (ảnh không bắt buộc).
- Bán hàng: sơ đồ bàn, tạo đơn, thêm món vào đơn đang mở, tại chỗ và mang đi.
- Thanh toán một lần, đủ tiền, bằng tiền mặt hoặc chuyển khoản (thu ngân xác nhận tay); tối đa một mã giảm giá mỗi hóa đơn. Đơn 0đ được hoàn tất riêng, không tạo khoản thanh toán (BR-104).
- Ca làm: vào ca, tan ca, mở và đóng ca thu ngân, chi phí trong ca.
- Đối soát tiền mặt khi đóng ca, đếm mù.
- Kho: nguyên liệu, công thức theo size và topping, tồn kho theo chi nhánh, tự trừ kho khi thanh toán, sổ kho.
- Báo cáo doanh thu theo ngày, tách tiền mặt và chuyển khoản.

### Giai đoạn 2

- Nhập hàng, kiểm kê, ghi hao hụt, cảnh báo sắp hết hàng.
- Hoàn tiền một phần, hủy đơn của ca đã đóng.
- Nhật ký thao tác (`audit_logs`), báo cáo bất thường.
- Báo cáo tuần và tháng, món bán chạy, giờ cao điểm, lợi nhuận gộp.
- Giá và trạng thái bán riêng từng chi nhánh.
- Tách bill, gộp bill, chuyển bàn nâng cao.
- Gói dịch vụ và thời hạn sử dụng của cửa hàng, lời mời qua email.
- Truy cập hỗ trợ có thời hạn cho quản trị nền tảng, có ghi nhật ký.

### Tùy chọn

- Màn hình bếp và pha chế theo thời gian thực.
- Tự xác nhận chuyển khoản qua webhook ngân hàng.
- Xuất báo cáo Excel và PDF.

### Ngoài phạm vi (không làm)

- Chấm công và tính lương đầy đủ (chỉ ghi giờ vào ca và tan ca).
- Bán hàng ngoại tuyến.
- Nhiều quầy thu ngân (nhiều két) trong một chi nhánh.
- Ngành khác ngoài F&B.
- Kế toán, hóa đơn điện tử, tích hợp máy in nhiệt ở MVP.

## 6. Luồng nghiệp vụ chính

### 6.1 Cấp tài khoản

1. `PLATFORM_ADMIN` tạo store và tài khoản `OWNER` (mật khẩu tạm hiển thị một lần).
2. `OWNER` đăng nhập, bị buộc đổi mật khẩu.
3. `OWNER` tạo chi nhánh, bàn, menu, rồi cấp tài khoản `MANAGER` và `CASHIER`.

### 6.2 Bán hàng

1. Thu ngân phải có **ca thu ngân đang mở** mới bán được.
2. Chọn bàn. Bàn trống thì tạo đơn mới. Bàn đang có đơn mở thì mở đơn đó để gọi thêm món.
3. Thêm món: mỗi lần thêm là một dòng `invoice_items` mới. Giá lấy từ hệ thống và lưu snapshot.
4. Thanh toán một lần bằng tiền mặt (tính tiền thối) hoặc chuyển khoản. Đơn 0đ được hoàn tất không tạo `payment`. Đơn chuyển sang `PAID` và kho tự trừ trong cùng transaction.
5. Hủy đơn: đơn chưa thanh toán thì thu ngân hủy được. Đơn đã thanh toán cần quyền quản lý và lý do.

### 6.3 Ca làm và đối soát tiền mặt

1. **Mở ca thu ngân**: tiền đầu ca do hệ thống điền, thu ngân chỉ xác nhận.
   - Ca đầu tiên của chi nhánh: lấy từ `branches.initial_cash` do `OWNER` cài.
   - Các ca sau: lấy từ **tiền thực đếm** của ca thu ngân đóng trước đó, cùng chi nhánh.
2. Trong ca: tiền mặt từ hóa đơn được cộng dồn. Khoản chi từ két ghi vào `shift_expenses`.
3. **Đóng ca (đếm mù)**: thu ngân nhập số tiền đã đếm **trước**, hệ thống mới hiện tiền kỳ vọng và chênh lệch.
4. Kết quả: `MATCHED` (khớp), `SHORTAGE` (thiếu), `OVERAGE` (thừa). Lệch thì bắt buộc ghi chú.
5. Chỉ **tiền mặt** được đối soát. Chuyển khoản tính vào doanh thu nhưng không nằm trong két.

Công thức: `tiền kỳ vọng = tiền đầu ca + tiền mặt từ hóa đơn đã thanh toán − chi từ két`.

### 6.4 Kho

1. Mỗi món theo size (và mỗi topping) có công thức: dùng bao nhiêu của mỗi nguyên liệu.
2. Khi đơn thành `PAID`, hệ thống trừ nguyên liệu theo công thức và theo chi nhánh của đơn.
3. Mọi thay đổi tồn kho ghi vào sổ kho (`stock_movements`), chỉ thêm dòng mới, không sửa, không xóa.
4. Hủy đơn đã thanh toán thì ghi dòng hoàn kho đối dấu, không xóa dòng cũ.
5. Cho phép bán khi tồn âm nhưng cảnh báo.

### 6.5 Báo cáo

- Doanh thu chỉ tính hóa đơn `PAID`, gom theo ngày ở múi giờ Việt Nam.
- Luôn tách tiền mặt và chuyển khoản.
- Thu ngân chỉ xem báo cáo ca của mình. `MANAGER` xem chi nhánh mình. `OWNER` xem từng chi nhánh hoặc tổng hợp cả store.

## 7. Khái niệm cốt lõi

| Thuật ngữ (Việt)  | Tên trong code                                    | Ý nghĩa                                                              |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| Cửa hàng          | `store`                                           | Khách hàng của nền tảng, vùng dữ liệu riêng                          |
| Chi nhánh         | `branch`                                          | Địa điểm bán hàng của cửa hàng, có két và kho riêng                  |
| Bàn               | `dining_table`                                    | Bàn của chi nhánh. Trạng thái trống hoặc có khách tính từ đơn `OPEN` |
| Hóa đơn (đơn)     | `invoice`                                         | Một lần phục vụ. `OPEN` → `PAID` hoặc `CANCELLED`                    |
| Dòng món          | `invoice_item`                                    | Một món, một size, một số lượng trong hóa đơn                        |
| Ca làm            | `work_shift`                                      | Khoảng thời gian một nhân viên làm việc. Loại `CASHIER` hoặc `STAFF` |
| Đối soát tiền mặt | `cash_reconciliation`                             | So tiền thực đếm với tiền hệ thống tính, chỉ ca thu ngân             |
| Tiền đầu ca       | `opening_cash`                                    | Tiền trong két lúc bắt đầu ca                                        |
| Tiền đã đếm       | `counted_cash`                                    | Tiền thu ngân đếm thực tế lúc đóng ca                                |
| Chênh lệch        | `difference`                                      | Tiền đã đếm trừ tiền kỳ vọng                                         |
| Chi trong ca      | `shift_expense`                                   | Khoản chi giữa ca, có thể lấy từ két                                 |
| Nguyên liệu       | `ingredient`                                      | Hạt cà phê, đường, đá... có đơn vị gốc                               |
| Công thức         | `product_size_ingredients`, `topping_ingredients` | Lượng nguyên liệu cho một ly hoặc một phần topping                   |
| Sổ kho            | `stock_movement`                                  | Mỗi lần tăng giảm tồn kho là một dòng                                |
| Snapshot          | (cột trong hóa đơn)                               | Giá trị lưu lúc bán, không đổi khi giá hoặc tên đổi sau này          |

## 8. Quy tắc bất biến (agent không được vi phạm)

**Tiền**

- Tiền lưu `bigint`, đơn vị đồng. Không dùng số thực cho tiền. Mỗi số tiền, kể cả kết quả tính để ghi DB, có trị tuyệt đối tối đa 1.000 tỷ đồng (BR-103).
- Giá và tổng tiền **do máy chủ tính**. Không có API nào nhận đơn giá hay tổng tiền từ client.
- Hóa đơn lưu snapshot tên món, size, giá. Không đọc lại giá hiện tại cho hóa đơn cũ.
- Thanh toán có `Idempotency-Key`: cùng key và cùng nội dung thì trả kết quả cũ, không tạo khoản thứ hai.

**Cô lập dữ liệu**

- `store_id` và phạm vi `branch_id` lấy từ danh tính/quyền hiện hành sau khi xác minh token và phiên; không tin claim cũ nếu user đã đổi vai trò hoặc chi nhánh. Người không có quyền xem toàn cửa hàng bị ép theo chi nhánh hiện hành; `OWNER` xác định chi nhánh theo loại route (BR-71b), máy chủ luôn kiểm tra phạm vi.
- Mọi `id` trong request phải thuộc cùng cửa hàng với người gọi.
- Người không có `branch.access_all` bị ép lọc theo chi nhánh của mình.
- `PLATFORM_ADMIN` không đọc dữ liệu vận hành của cửa hàng.

**Giao dịch và toàn vẹn**

- Ghi thanh toán (nếu tổng tiền lớn hơn 0), đổi trạng thái hóa đơn và trừ kho nằm trong **một transaction**. Hoàn tất đơn 0đ phải chống lặp.
- Cập nhật tồn kho bằng phép cộng trừ nguyên tử, không đọc rồi ghi.
- Sổ kho chỉ thêm dòng, không sửa hay xóa. Sai thì thêm dòng điều chỉnh.
- Nội dung hóa đơn `PAID` hoặc `CANCELLED` và ca đã đóng không sửa trực tiếp. Hóa đơn `PAID` chỉ hủy được theo BR-29 (cần quyền, lý do, ca còn mở), các khoản thanh toán đã nhận giữ nguyên làm lịch sử.
- Dữ liệu đã có tham chiếu thì ngưng dùng bằng `is_active`, không xóa cứng.

**Ca và đối soát**

- Mỗi người chỉ có **một ca mở**. Mỗi chi nhánh chỉ có **một ca thu ngân mở**.
- Chưa mở ca thu ngân thì không tạo đơn, không thanh toán.
- Không đóng ca khi còn đơn `OPEN` thuộc ca đó.
- Tiền đầu ca do hệ thống điền, thu ngân không sửa.
- Đóng ca đếm mù: không gửi tiền kỳ vọng xuống giao diện trước khi nhận `counted_cash`.
- Ca đóng cưỡng chế vẫn phải có `counted_cash` do quản lý nhập.

**Bàn và đơn**

- Mỗi bàn chỉ có một đơn `OPEN` tại một thời điểm.
- Đơn `DINE_IN` phải có bàn, đơn `TAKEAWAY` thì không.
- `invoices.branch_id` phải bằng chi nhánh của ca và của bàn.
- Hủy đơn đã `PAID` cần quyền quản lý và lý do bắt buộc.

**Tài khoản**

- Không có đăng ký công khai. Tài khoản mới buộc đổi mật khẩu ở lần đăng nhập đầu, trừ `PLATFORM_ADMIN` được tạo bằng bootstrap.
- Mật khẩu chỉ lưu dạng băm. Refresh token chỉ lưu hash.
- Mỗi cửa hàng luôn có ít nhất một `OWNER` đang hoạt động.
- Cửa hàng `SUSPENDED`: chặn đăng nhập và mọi API của người dùng thuộc cửa hàng, thu hồi refresh token, giữ nguyên dữ liệu.

## 9. Công nghệ

- Backend: **NestJS**, TypeScript, **PostgreSQL**. Redis và BullMQ khi cần cache hoặc job nền.
- Frontend: **React**, TypeScript.
- Chi tiết công nghệ, cấu trúc thư mục, các lớp xem tài liệu kiến trúc (mục 12).

## 10. Giao diện và ngôn ngữ

- Giao diện chính là **máy tính bảng ngang, cảm ứng** tại quầy. Trang quản lý dùng máy tính.
- Mọi chữ trên giao diện là **tiếng Việt**. Dùng đúng từ vựng ở mục 7.
- Số tiền định dạng `29.000đ`, ngày `dd/MM/yyyy`, giờ 24 giờ.
- Chi tiết thiết kế giao diện xem `DESIGN.md`.

## 11. Cách agent làm việc với tài liệu này

- Đọc `PRODUCT_OVERVIEW.md` trước, sau đó đọc tài liệu chuyên biệt cho đúng phần việc đang làm.
- Khi tài liệu **mâu thuẫn nhau hoặc chưa nói rõ**, dừng lại và hỏi user. Không tự đoán business rule.
- Không thêm tính năng ngoài phạm vi ở mục 5. Tính năng thuộc giai đoạn 2 hoặc tùy chọn chỉ làm khi user yêu cầu.
- Không đổi quy tắc ở mục 8 mà chưa có xác nhận của user.
- Chức năng mới hoặc sửa lỗi thì làm trên nhánh mới, chờ được review rồi mới merge. Không tự push khi chưa được yêu cầu.

## 12. Tài liệu liên quan

| Tài liệu                       | Nội dung                                                     | Trạng thái |
| ------------------------------ | ------------------------------------------------------------ | ---------- |
| `docs/DESIGN_DB_POS_SYSTEM.md` | Thiết kế cơ sở dữ liệu: 28 bảng, field, công thức, ràng buộc | Có sẵn     |
| `DESIGN.md`                    | Thiết kế giao diện: token, bố cục, component, nội dung chữ   | Có sẵn     |
| `docs/BUSINESS_RULES.md`       | Danh sách business rule (BR-xx) theo module                  | Có sẵn     |
| `docs/api-spec.md`             | Quy ước chung của API (định dạng, lỗi, phân trang, xác thực) | Có sẵn     |
| `.devloopflow/specs/` | Đặc tả chi tiết từng chức năng và endpoint (hiện hành và bản lịch sử `legacy-*`) | Có sẵn |
| `docs/architecture/`           | Tài liệu kiến trúc                                            | Đang soạn  |
| `docs/architecture/auth.md`    | Quy tắc xác thực, mật khẩu và giới hạn tần suất               | Có sẵn     |
