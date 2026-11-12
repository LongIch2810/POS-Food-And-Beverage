# PB-13 — UI tổ chức Sprint3

**Trạng thái:** hoàn tất triển khai/kiểm chứng local ngày01/11/2026 theo proposed_plan user duyệt. Code review không còn finding, QA đối chiếu C01..C20 không còn gap trọng yếu trong scope. Product Owner đã nghiệm thu local lát cắt tổ chức và kết thúc Sprint 3 ngày01/11/2026. Chưa commit/push/merge hoặc xác nhận CI/production.

**Đối soát kết thúc 01/11/2026:** bước trình PO/nghiệm thu bên dưới đã hoàn tất sau khi đóng phần kỹ thuật; xem [kết luận Sprint 3](../../sprints/sprint-03/SPRINT.md#kết-luận-sprint-3--2026-11-01). Không còn bước triển khai mở trong plan này; PB-06 và các màn demo vẫn ngoài scope.

## Mục tiêu/phạm vi

Nối Cài đặt ba tab Chi nhánh/Bàn/Tài khoản với10 thao tác API PB-04 đã có. OWNER vào Cài đặt sau login; danh mục chi nhánh thật nằm trong Cài đặt; không hiện chi nhánh/ca demo tại đây. Các màn chưa nối API tiếp tục ghi dữ liệu mẫu. Không checklist, mã giảm giá, ca, POS hoặc production.

## Hợp đồng đã chốt

- Giữ API/schema PB-04; DTO frontend camelCase riêng, number nguyên an toàn cho tiền. Dùng lại React/Vite/component/token hiện có, không thêm dependency.
- branch.manage/table.manage/user.manage quyết định tab; branch.read tải danh mục lựa chọn; branch.access_all quyết định bộ chọn. Platform tách riêng. Khi auth identity/store/branch/permission đổi phải bỏ dữ liệu/form cũ và chặn response muộn.
- Danh sách20/trang, cursor prev/next/total; lọc trạng thái, branch ở bàn/staff, role ở staff; reset cursor khi đổi tab/filter. Danh mục branch độc lập tải100/lượt đến hết, gồm inactive.
- Branch: code2..10 bất biến sau tạo, name1..150, address/phone nullable; quỹ mặc định0, nguyên0..1e12, không xóa dấu âm/thập phân để ép số; ngưng/mở lại. Khóa quỹ sau ca PB-06 deferred, không giả dữ liệu ca.
- Table: name1..50, area≤50 nullable, capacity1..2147483647 nullable; OWNER chọn branch cụ thể khi tạo; actor giới hạn branch không gửi branchId. Không occupancy từ mock, không xóa/chuyển branch.
- Staff: cấp MANAGER/CASHIER thấp hơn actor; username≤50/fullName≤150/branch bắt buộc. Chỉ đổi role/status/reset; không sửa hồ sơ/chuyển branch/xóa. Confirm role/lock/reset, ghi rõ thu hồi phiên; reset locked giữ khóa.
- Mật khẩu tạm chỉ state hộp thoại sau success, hiện ngay trước list refresh; copy/manual select; checkbox đã lưu mới đóng; clear khi close/logout/identity change; không storage/URL/toast/log. Không tự replay mutation khi network outcome unknown.
- Shared HTTP dựa platform hiện có: same-origin cookies/CSRF,401 restore một lần, lỗi status/code/details/requestId,403 cập nhật context, revoked về login. Không thay hợp đồng platform.
- Gắn tải với tab/filter/cursor/session generation; response cũ không ghi đè rows/meta/loading/error; mutation invalidate đúng resource, không reset cursor tab khác. Khoá submit/form close trong lúc pending. Có skeleton/empty/error/retry/offline, lỗi field422, giữ form409, reload404.
- Giữ giao diện Operate theo DESIGN, touch48px, primary56px, keyboard/focus, chỉ1modal,1024/768px.

## Thứ tự thực hiện

1. Lưu hồ sơ, spec UI đã chốt, nhánh riêng giữ nguyên dirty PB-04; không commit/push/merge tự động.
2. HTTP/service/types + test hợp đồng và hồi quy auth/platform.
3. Cài đặt thật, routing/header tách demo, modal/form/mật khẩu và kiểm race.
4. UI npm test/typecheck/build; API npm test; browser UI cuối cùng network/storage/DB before-after đã che secret. Ma trận bằng chứng trước chạy, review/QA so artifact.
5. Cập nhật Sprint/docs đúng mức chứng cứ, task/plan completed khi xong; không tick nghiệm thu Product Owner.

## Tiêu chí và rủi ro

CRUD/config đủ10 endpoints, reloadDB, OWNER/MANAGER/CASHIER/platform, auth changes/expiry; money/capacity/null/duplicates; >20rows/>100branch choices; late responses tab/branch/filter/page/mutation; temp password lifecycle/storage/oldsession reset; browser1024/768 keyboard. Raw logs + metadata/fullHEAD/dirty/manifests + ảnh/snapshot/network/DB trong qa-evidence; local khác CI. Mất response cấp/reset không được tự lặp; PB-04 chưa commit nên giữ baseline dirty rõ bằng manifest.

## Kết quả thực hiện

- Đã nối3tab và10routes PB04, dùng DTO/sharedHTTP thật, tách branch/shift demo khỏi Cài đặt, OWNER vào Cài đặt, giữ các màn chưa nối API ghi nhãn demo. Không thêm dependency hoặc thay API/schema PB04.
- UI28/28, typecheck/build0; API default npmtest rerun48/48exit0. FirstAPI47/48 cleanupDROPtimeout được giữ raw và nêu giới hạn, không nới/bỏassert hoặc gọi rerun là đã xác minh nguyênnhânsâu.
- Browser realSQL/identity/login/password/session/suspend/currentpermission/currentbranch/cursor105choices6pages/race/offline/keyboard768/1024 có network/ảnh/snapshot/DB.3bugs trong quá trình triển khai có red/green và error records.
- Run cuối `qa-evidence/20261101-203100-9ce75dd-pb13-final/run.md`, `audit.md`, `review.md`,6manifests và gzip lossless; run30/10 giữ lịch sử và phân biệt UI phases. QA đã rehash221 source/runtime/contract/tooling entries,0mismatch.
- QA API/Vite process do task tạo đã dừng theo PID/command xác minh; sharedPostgreSQL và DBQA riêng giữ để tái hiện. Không triển khai production/CI hoặc quỹsaucaPB06; trình Product Owner review/nghiệmthu Sprint3 là bước tiếp theo.
