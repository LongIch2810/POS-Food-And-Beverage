# PB-04 API/DB — kế hoạch đã chốt

**Trạng thái:** hoàn tất triển khai và sửa gap API/DB ngày30/10/2026. QA đã đối chiếu và đóng AUD-01..05 trong scope; code review không còn finding, full test cuối48/48 TAP nodes đạt local. PB-04 được Product Owner nghiệm thu local trong Sprint 3 ngày01/11/2026; chưa commit/merge/push. UI không thuộc plan API/DB này, đã hoàn tất ở plan PB-13 riêng; quỹ sau ca PB-06 vẫn deferred.

**Đối soát kết thúc 01/11/2026:** các bước tiếp theo và câu chờ UI/nghiệm thu bên dưới ghi lịch sử triển khai. Kết quả sau cùng tại [kết luận Sprint 3](../../sprints/sprint-03/SPRINT.md#kết-luận-sprint-3--2026-11-01); không còn việc API/DB mở trong plan này.

## Mục tiêu và phạm vi

Chi nhánh, tiền ban đầu, bàn và tài khoản MANAGER/CASHIER qua API thật. Chỉ API/DB, không triển khai UI PB-13, ca, hóa đơn, menu hay production. Spec: `specs/organization.md`, `specs/users.md`; hợp đồng OWNER hiện có giữ trong `specs/platform.md`.

## Quyết định đã chốt

- Nhân viên: tạo/xem, khóa/mở, đổi MANAGER↔CASHIER, reset mật khẩu; không chuyển chi nhánh, đổi username hoặc hồ sơ.
- Đổi vai trò, khóa tài khoản và reset thu hồi mọi phiên trong transaction; mở khóa không khôi phục phiên; reset người bị khóa giữ trạng thái khóa.
- Chi nhánh ngưng vẫn được cấu hình bàn/cấp nhân viên. Mã chi nhánh cố định; mã/tên trim và unique phân biệt hoa/thường theo DB.
- Quỹ ban đầu chỉ sửa trước ca CASHIER đầu tiên. PB-04 chưa có ca; PB-06 phải thêm kiểm tra lịch sử ca và khóa dòng Branch chung với mở ca trước khi bật API mở ca. Không tạo bảng ca giả hoặc cờ khóa trong PB-04.
- `/users` chọn hợp đồng và permission theo context hiện hành, không theo role/body. Giữ nguyên hợp đồng platform.

## Các bước

- [x] A: lưu spec từ hợp đồng kế hoạch đã trình/chốt, migration DiningTable và quyền; chuyển Branch về organization; test HTTP scoped guard đã chạy.
- [x] B: GET/POST/PATCH branches và dining-tables; validation, tenant/branch, phân trang cursor chính xác microsecond, conflict/rollback; test ORG-01..04 local đã chạy qua.
- [x] C: module users điều phối platform/staff, cấp/reset password, PATCH role/status và thu hồi phiên atomic; test USR-01..03 và auth/platform regression local đã chạy qua.
- [x] D: bổ sung ma trận/acceptance SQL thật/DB before-after/logger và sửa spec AUD-01..05; sửa hai lỗi JOIN khi chờ khóa user có red/green. Full-2 npm test exit0,48/48 TAP nodes; CLI migration first/repeat exit0. QA đối chiếu từng AC/E/P/M/D và manifests, đóng gap trong scope API/DB; code review không còn finding. Kết quả/giới hạn tại `qa-evidence/20261030-202325-9ce75dd-pb04-gap-fix/run.md`, `audit.md`, `review.md` cùng thư mục.

## Nghiệm thu và rủi ro

Chạy build, migration và npm test theo manifest; bằng chứng gốc trong qa-evidence. Kiểm tra tiền 0/trần/sai kiểu, unique cùng scope và concurrency, quyền/context hiện hành, mọi ID cùng store/branch, hai phiên, rollback, login/refresh cạnh tranh. Không tick nghiệm thu sprint thay Product Owner. Quỹ sau ca phụ thuộc PB-06, UI nằm ngoài scope.

## Rulings / tiến độ

- Dùng nhánh riêng tại workspace hiện tại theo kế hoạch được duyệt, không tạo thêm worktree để tránh chuyển các tài liệu Sprint 3 chưa commit. Không commit/push/merge tự động.
- Spec organization/users được ghi dựa trên bản hợp đồng API trong kế hoạch đã trình và được user chốt; không mở lại các quyết định đã trả lời. Chi tiết kỹ thuật theo quy ước API/DB hiện có.
- Ruling: JSON scalar/null trả 400 từ Express strict parser trước DTO, giữ cơ chế chung hiện tại; array/field sai/PATCH rỗng trả 422. Test/spec phân biệt parser và validation, không đổi parser toàn app để phục vụ PB-04.
- Ruling: test nền cập nhật số migration 3→4 vì migration PB-04 mới; không bỏ assert migration. Barrel database/entities/index.ts còn export Branch được cập nhật đường dẫn khi chuyển entity, không tạo bản sao entity.
- Ruling: BR-83 vẫn là kiểm tra thứ bậc nghiệp vụ sau permission, không dùng branch.access_all thay hierarchy; BR-06 so actor với UUID chuẩn từ DB. USR-HIER lưu red/green thực tế.
- Kết quả kỹ thuật: `qa-evidence/20261030-193116-9ce75dd-pb04/run.md`; source/runtime nhận diện bằng manifest trên working tree dirty, chưa có commit PB-04 hoặc CI riêng.
- Lịch sử: audit đầu phát hiện gap tại `errors/2026-10-30-pb04-acceptance-evidence-gaps.md`; sau yêu cầu “fix/tiếp tục”, đã sửa và QA đối chiếu lại bản cuối. Không suy code review/test local thành nghiệm thu sản phẩm hoặc UI. Plan này hoàn tất phần API/DB; bước sản phẩm tiếp theo là PB-13 tổ chức trong Sprint3.
