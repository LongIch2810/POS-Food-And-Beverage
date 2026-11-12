# PB-13 — Cài đặt tổ chức

**Trạng thái:** đã chốt ngày30/10/2026 theo proposed_plan được user yêu cầu implement; lựa chọn bộ lọc riêng trong Cài đặt và OWNER vào Cài đặt đã được user trả lời.

## Mục tiêu/phạm vi

UI thật cho API PB-04 organization/users, ba tab Chi nhánh/Bàn/Tài khoản. BR-05/06/07/10/55/70/71/71b/76/83/84/97/99/103. Kế hoạch chi tiết `plans/completed/2026-10-30-pb13-organization-ui.md`; API contracts `specs/organization.md`, `specs/users.md`, auth theo spec hiện có. Không endpoint/schema mới.

## Luồng/quyền

OWNER vào Cài đặt; tab đầu Chi nhánh hoặc tab được cấp quyền đầu tiên. branch.manage/table.manage/user.manage quyết định tab, branch.access_all cho lọc chi nhánh khác; MANAGER mặc định chỉ Bàn, CASHIER không có Cài đặt, platform giữ khu riêng. Chưa đổi mật khẩu không vào nghiệp vụ. Bộ lọc branch thật riêng trong Cài đặt; header tại đây không dùng branch/shift demo. Các màn còn mock được ghi rõ.

## Hành vi

- Danh sách20/trang cursor prev/next/total; status filter, table/staff branch filter, staff role filter. Danh mục branch100/lượt đến hết độc lập bảng, gồm inactive. Khi đổi tab/filter reset cursor; danh tính/quyền/branch đổi clear dữ liệu/form/password. Response cũ không thay rows/meta/error/loading/cursor mới.
- Branch create/edit name/address/phone/initialCash theo API; code cố định sau tạo, không ép uppercase. Cash digits nguyên0..1e12 mặc định0, chú thích nguồn ca đầu; ngưng/mở lại, không xóa. PB06 mới khóa sau ca, không dùng lịch sử mock.
- Table name/area/capacity theo API, optional trống→null, không occupancy/status phục vụ. OWNER tạo phải chọn branch; actor giới hạn branch không gửi branchId. Không chuyển branch/xóa; inactive branch vẫn cấu hình được.
- Staff create username/fullName/role/branch, thấp hơn actor. PATCH chỉ role/isActive; reset giữ locked, không sửa profile/username/branch hoặc xóa. Confirm tác động thu hồi phiên cho role/lock/reset.
- Create/reset success hiển thị temp password ngay, không chờ list reload. Copy hoặc chọn thủ công; chỉ đóng khi xác nhận đã lưu. Chỉ state RAM, clear khi close/logout/identity change; không log/toast/storage/URL. Một modal một thời điểm, pending chặn submit/close; không replay mutation khi mất response.
- HTTP same-origin cookie/CSRF, refresh401 một lần, details422→field,409giữform,404reload,403cập nhật danh tính/quyền; revoked logout, force-change vào gate. Network error không tự gửi lại.
- Có skeleton/empty/error+retry/offline disable writes; touch48px/primary56px, focus/keyboard/accessibility theo DESIGN,1024/768px.

## Nghiệm thu/bằng chứng

Đối chiếu từng API/UI transition với stdout/requestId/response đã che, snapshot/ảnh và DB readonly before-after. Đủ3tab/10routes/reload/permissions/expiry/disabled/currentbranch; money/capacity/null/duplicates; nhiều trang và choices; late-response/mutation races; password không lưu/không xem lại/sessionrevoked. Browser bản cuối1024/768 keyboard. QA đọc artifact đúng manifest; phân biệt local/CI; không tick Sprint3 thay Product Owner.
