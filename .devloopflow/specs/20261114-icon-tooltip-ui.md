---
id: 20261114-icon-tooltip-ui
status: approved
approved_at: 2026-11-14
---

# Spec: Nút biểu tượng và tooltip gọn trong POS

## Mục đích và lý do
- User phản ánh nút icon kèm tooltip trong bảng, sidebar và các nút thao tác hiển thị xấu, phình to; muốn sửa trực quan. User chọn “Giữ icon, làm tooltip và nút gọn đẹp hơn”.

## Thành công trông như thế nào
- Các nút biểu tượng và tooltip thuộc phạm vi được xác định sau khi rà có bố cục gọn, rõ nghĩa, nhất quán; không làm cột, hàng hoặc sidebar phình bất thường.
- Thao tác vẫn có tên dễ hiểu bằng tiếng Việt, dùng được bằng bàn phím và trên thiết bị cảm ứng; trạng thái và phản hồi hành động giữ nguyên.
- Ảnh trước/sau trên giao diện thật và các phép đo vùng chạm, kích thước, trạng thái focus, tooltip được lưu để đối chiếu; đánh dấu chưa kiểm nếu thiếu môi trường hoặc bằng chứng.

## Mục tiêu
- G1. Rà các nút hành động đang dùng biểu tượng, tooltip hoặc nhãn hiển thị theo breakpoint trong bảng/danh sách, sidebar và các khu vực thao tác của UI; xác định nơi bị phình và nơi dùng chung bị ảnh hưởng trước khi sửa.
- G2. Sửa cách trình bày nút và tooltip ở các vị trí bị ảnh hưởng, ưu tiên tái sử dụng thành phần/token có sẵn; làm gọn phần nhìn thấy mà vẫn giữ vùng chạm theo `DESIGN.md:33`.
- G3. Nút biểu tượng có tên truy cập phù hợp, focus rõ, thao tác bằng bàn phím; chú thích có thể tiếp cận khi không có hover và không bị che/cắt ở vị trí cần dùng. Xác định cách mở/đóng bằng bàn phím và cảm ứng, cả chú thích cho nút disabled nếu có, không kích hoạt thao tác ngoài ý muốn. Không làm tooltip thành điều kiện duy nhất để thực hiện thao tác.
- G4. Kiểm giao diện thật trên desktop và tablet ngang/dọc, gồm bảng, sidebar và ít nhất một nhóm nút thao tác thực tế có liên quan; bảo vệ việc thực hiện đúng thao tác, trạng thái disabled và hành vi cũ.

## Phi mục tiêu (cố ý không làm)
- Không thay đổi nghiệp vụ, API, quyền, dữ liệu, thứ tự hay ý nghĩa thao tác; không thiết kế lại toàn bộ màn hình, màu sắc hoặc cấu trúc điều hướng.
- Không tự biến mọi nút chữ thành icon-only; tập trung vào hiện tượng và các vị trí liên quan đã rà.

## Phản mục tiêu (làm ra mà vẫn bị coi là thất bại)
- Nút chỉ nhìn đẹp bằng chuột nhưng không biết tên hoặc không thao tác được khi dùng bàn phím/cảm ứng; tooltip bị cắt hoặc làm hàng, bảng, sidebar phình; vùng chạm bị thu nhỏ trái chuẩn dự án.
- Chỉ sửa một màn khi có nguyên nhân dùng chung ảnh hưởng các vị trí khác trong phạm vi mà không kiểm caller liên quan.

## Hiện trạng
- `POS_UI/src/features/products/ProductsScreen.tsx:953-979,1021-1049` có các nút chỉ biểu tượng với `title` cho sửa, đổi trạng thái, xóa món, đổi giá và gỡ size.
- `POS_UI/src/components/ui/Button.tsx:39-50` render nội dung nút trong span; `POS_UI/src/styles/ui.css:15-34,258` có padding và kích thước chung; `POS_UI/src/styles/components.css:13-28` có `.icon-btn` riêng. Chưa xác định nguyên nhân trực quan của mọi chỗ user phản ánh.
- Sidebar `POS_UI/src/components/common/AppShell.tsx` hiện có nhãn và icon; chưa thấy cơ chế tooltip-only tại sidebar trong phạm vi khảo sát. Phải kiểm giao diện và breakpoint thực tế trước khi kết luận có lỗi ở đó.

## Ràng buộc
- UI tiếng Việt, tablet ngang và cảm ứng; mục tiêu chạm tối thiểu 48px, hành động chính 56px, khoảng cách chạm tối thiểu 8px; không chỉ dùng hover (`DESIGN.md:33`).
- Bàn phím và thứ tự Tab theo thứ tự hiển thị (`DESIGN.md:652`); giữ trạng thái dễ hiểu và quyền, không thay hành vi (`AGENTS.md`, `DESIGN.md:651`).
- Dùng React/TypeScript và hệ thống component/token hiện có; không tự thêm dependency khi có thể xử lý bằng công cụ sẵn có (`AGENTS.md`).
- Kiểm caller và test liên quan, nhất là harness `node:vm` theo M-28; kiểm tablet, tên truy cập, tương phản và bằng chứng theo M-39 (`.devloopflow/MEMORY.md`).
- Lỗi cũ `20261113-shift-close-touch-targets.md`: đo kích thước điều khiển thực ở hai hướng tablet.

## Các phần cách làm user đã quyết
- Giữ icon, làm tooltip và nút gọn đẹp hơn (câu trả lời của user ngày 14/11/2026).

## Quyết định của agent (user kiểm khi đọc)
- Rà các vị trí user nêu trước, sửa những nơi thực sự bị ảnh hưởng và thành phần dùng chung liên quan; không tự chuyển toàn bộ nút có chữ sang icon.
- Giữ diện tích chạm theo chuẩn, phần thị giác và khoảng trắng được tinh chỉnh trong vùng chạm; các hành động quan trọng vẫn giữ ý nghĩa rõ ràng.
- Ưu tiên phong cách app hiện có và thành phần có sẵn; áp dụng `design-taste-frontend` cho giao diện thao tác và kiểm browser, `DESIGN.md` thắng khi có khác biệt.

## Để người viết plan tự chọn
- Lập bảng các màn/vị trí bị ảnh hưởng từ ảnh hiện trạng và các caller liên quan, chốt danh sách trong plan trước triển khai; chọn phương án component và kiểm thử phù hợp với những bằng chứng trực quan thu được.

## Câu hỏi mở
- Không có sau khi user đã chọn giữ icon; cần ghi nhận ảnh hiện trạng và xác định cụ thể từng vị trí trong plan, không tự kết luận nguyên nhân khi chưa quan sát.

## Changelog spec
- 2026-11-14: tạo nháp từ yêu cầu user và khảo sát source.
- 2026-11-14: bổ sung yêu cầu kiểm chú thích trên bàn phím/cảm ứng và lập danh sách vị trí trong plan theo review spec; không đổi phạm vi user chọn.
- 2026-11-14: user nói “duyệt”; spec được duyệt.

## Kiểm tra sẵn sàng
- [x] Người chưa thấy cuộc trò chuyện đọc spec + docs dự án hiểu cần làm gì và vì sao.
- [x] Mỗi fact có nguồn hoặc ghi rõ user nói.
- [x] Không có chi tiết cài đặt (thuộc plan).
- [x] Câu hỏi mở rỗng.
- [x] Mỗi quyết định của agent đã được liệt kê.
