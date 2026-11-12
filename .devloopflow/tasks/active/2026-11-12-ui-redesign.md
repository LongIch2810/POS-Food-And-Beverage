---
id: 2026-11-12-ui-redesign
spec:   # Bỏ qua spec: user yêu cầu trực tiếp cải thiện giao diện theo DESIGN.md, không đổi chức năng
plan:   # Bỏ qua plan: việc chỉnh giao diện theo từng màn, user duyệt qua kết quả trực quan
status: in_progress
owner: Claude Code
started_at: 2026-11-12
completed_at:
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Task 2026-11-12-ui-redesign

Yêu cầu của user (nguyên văn): "tận dụng các skill làm giao diện hiện có hãy tập trung cải thiện toàn diện UI app kể cả từng component"; "giao diện đang rất xấu cải thiện và ko ảnh hưởng chức năng"; "bật docker lên vừa bật giao diện vừa sửa vửa cải thiện UI".

Nhánh: `feat/ui-redesign`. Nguồn thiết kế: `DESIGN.md` (thắng khi skill giao diện gợi ý khác).

Ràng buộc đã chốt khi làm:
- Không đổi hành vi, không đổi chữ trên nút mà test dựa vào (`Thanh toán`, `Đóng`, `Tiền mặt`, `+`, `−`, `Xóa`, `Hủy đơn`...).
- Test UI đọc mã nguồn qua `node:vm` với React giả: không thêm import mới vào `LivePosScreen.tsx` / `LivePaymentDialog.tsx` nếu chưa bổ sung mock tương ứng trong `POS_UI/test/live-payment.test.mjs`; component hàm tự định nghĩa không được "render" trong test nên mọi chữ cần kiểm phải nằm trong phần tử gốc (`div`, `span`, `button`...).

## Trạng thái
- Bước hiện tại (số bước trong flow): Không chạy đủ flow devloopflow (việc giao diện, không có spec/plan); làm theo từng màn rồi kiểm trực quan, `npm run typecheck`, `npm test`.
- Đã xong: Nền tảng lớp dùng chung (`POS_UI/src/styles/ui.css`, token `--color-on-brand`, `--color-overlay`, `::selection`, `caret-color`, `accent-color` trong `POS_UI/src/index.css`); màn Bán hàng thật (`LivePosScreen.tsx`) gồm thanh tab, tab danh mục gạch chân 3px, ô món, thẻ bàn, danh sách đơn, panel đơn 400px, hộp chọn size/topping dùng `Dialog`; hộp thoại thanh toán (`LivePaymentDialog.tsx`) hai cột, tiền thối `text-4xl`.
- Đã xong thêm: Kho (`InventoryScreen.tsx`: tab gạch chân, ô chọn chi nhánh, nhãn loại bút toán tiếng Việt, skeleton); Cài đặt (`SettingsScreen.tsx`: tab gạch chân, form tài khoản nhận chuyển khoản dạng lưới, thông báo lỗi có biểu tượng); Quản trị nền tảng (`PlatformAdminScreen.tsx`); bố cục máy tính bảng 1024px (nút tải lại chỉ biểu tượng) và 768px (panel đơn nằm dưới vùng món); sửa tên chi nhánh trên thanh trên (`AppShell.tsx`).
- Đã rà bằng trình duyệt thật và thấy đã ổn, không sửa: Hóa đơn, Ca làm, Thực đơn (`ProductsScreen.tsx`), Đăng nhập.
- Đang làm: Không có.
- Sắp làm: Chờ user xem kết quả; chưa rà bằng trình duyệt: Báo cáo (dữ liệu mẫu), Khuyến mãi (`PromotionsPanel.tsx`), các hộp thoại mở/đóng ca, màn Ca làm của quản lý. Chưa push, chưa mở PR.

## File đã thay đổi
| Path | Thay đổi gì | Sub-task |
|------|-------------|----------|
| POS_UI/src/index.css | Import `styles/ui.css`, `styles/pos.css`; thêm token `--color-on-brand`, `--color-overlay`; theme `::selection`, `caret-color`, `accent-color` | Nền tảng |
| POS_UI/src/styles/ui.css | Mới: `.btn*`, `.field/.input/.select`, `.notice*`, `.badge*`, `.segmented`, `.chip`, `.skeleton`, `.sr-only` | Nền tảng |
| POS_UI/src/styles/pos.css | Mới: bố cục màn Bán hàng, ô món, thẻ bàn, panel đơn, hộp chọn món, hộp thoại thanh toán | Màn Bán hàng |
| POS_UI/src/features/pos/LivePosScreen.tsx | Viết lại phần hiển thị bằng class; trạng thái hóa đơn hiện nhãn `Đang mở`/`Đã thanh toán`/`Đã hủy` thay cho `OPEN`/`PAID`; hộp chọn món dùng `Dialog`; giữ nguyên toàn bộ logic | Màn Bán hàng |
| POS_UI/src/features/pos/LivePaymentDialog.tsx | Viết lại phần hiển thị; thêm dòng `Còn thiếu ...` khi tiền khách đưa chưa đủ; giữ nguyên toàn bộ logic | Thanh toán |
| POS_UI/src/features/inventory/InventoryScreen.tsx | Tab gạch chân, ô chọn chi nhánh có kiểu, nhãn loại bút toán (`Nhập kho`, `Xuất bán`, `Hoàn trả kho`, `Hao hụt`, `Kiểm kê`), skeleton, thông báo lỗi | Kho |
| POS_UI/src/features/settings/SettingsScreen.tsx | Tab gạch chân bằng `Button` + `style`, form tài khoản nhận chuyển khoản dạng lưới, thông báo lỗi có biểu tượng | Cài đặt |
| POS_UI/src/features/platform/PlatformAdminScreen.tsx | Tab gạch chân, nhóm nút thao tác của dòng cửa hàng bên phải, thông báo lỗi | Quản trị nền tảng |
| POS_UI/src/components/common/AppShell.tsx | Tên chi nhánh trên thanh trên ưu tiên `currentShift.branchName` | Sửa nhãn |
| POS_UI/test/organization-screen.test.mjs | Thêm mock `lucide-react` cho harness | Test |
| POS_UI/test/live-payment.test.mjs | Thêm mock `lucide-react` và `Dialog` cho các harness; đổi các câu kiểm chữ `OPEN`/`PAID` thành nhãn tiếng Việt tương ứng | Test |

## Đã đọc errors
- ST-1: Chưa đọc `.devloopflow/errors/INDEX.md` cho task này (việc giao diện); sẽ đọc trước khi sửa màn tiếp theo.

## Lịch sử review (chỉ thêm, không xoá)
- Chưa review.

## Lịch sử kiểm AC (chỉ thêm, không xoá)
- Không áp dụng: task không có AC.

## Finding hoãn (Low, Very Low) — quyết ở bước 10 (chỉ thêm, không xoá)
- Quan sát ngoài phạm vi giao diện, chưa sửa, cần user quyết:
  - Thanh trên hiện "Chi nhánh Nam Lý" ở tab Bán hàng/Sơ đồ bàn/Hóa đơn dù chi nhánh thật là "Chi nhánh Quận 1": `AppShell.tsx` dùng `MockEngine.getAccessibleBranches()` cho các tab không thuộc danh sách `['settings','products','shifts','inventory']` (biến `isDemo`), trong khi màn Bán hàng đã dùng API thật. Đã sửa một phần ở commit `55b606c`: khi có ca mở thì dùng tên chi nhánh của ca. Còn lại: người dùng chưa có ca mở vẫn có thể thấy tên chi nhánh từ dữ liệu mẫu ở các tab đó.
  - Menu Thực đơn hiện với thu ngân (có `menu.read`) nhưng màn báo "Không có quyền truy cập ... menu.manage".
  - Hủy đơn dùng `window.prompt`, chuyển bàn dùng `window.confirm`; DESIGN.md §6.6 yêu cầu hộp thoại có lý do bắt buộc.

## Cập nhật tài liệu (sync-docs, bước 10b; chỉ thêm, không xoá)
- Chưa có.

## Kinh nghiệm đã ghi (reflect, bước 10c; chỉ thêm, không xoá)
- M-28 (thêm) [ui, tests, node-vm] Trước khi đổi cấu trúc hoặc thêm import cho màn có test nạp mã nguồn bằng `node:vm`, đọc harness: mock `require`, React giả không render component hàm, và so chuỗi chính xác nội dung nút — 2026-11-12

## Blocked
- Lý do: Không có
- Lỗi còn lại: Không có
- Đề xuất: Không có

## Cập nhật tiến độ (2026-11-12, lượt cuối)
- Hộp thoại hủy đơn (lý do) và chuyển bàn trong `LivePosScreen` dùng `Dialog`; alias token cũ trong `index.css`; bộ component dùng chung dựng lại bằng class.
- Đã xem bằng trình duyệt: modal công thức (manager_dev), Cài đặt và màn mở ca (owner_dev), hộp thoại tạo cửa hàng (admin).
- Chưa xem: mục Báo cáo (rail của manager_dev và owner_dev không có mục này), hộp thoại hủy hóa đơn mock, modal đổi mật khẩu bắt buộc, thêm chi phí, toast.
- `npm run typecheck` sạch; `npm test` 85/85 pass.
