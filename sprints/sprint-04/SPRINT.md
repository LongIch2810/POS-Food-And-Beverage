# Sprint 4 — Đã triển khai và kiểm thử

**Trạng thái:** Đã hoàn thành triển khai PB-05 (API/DB Thực đơn) và PB-13 (Lát cắt UI Quản lý Thực đơn), đã kiểm thử tự động 100% PASS trên cả Docker PostgreSQL 17 và WSL PostgreSQL 16. Bằng chứng được lưu tại `qa-evidence/20261102-190753-31f4799-docker-qa/run.md`. Sẵn sàng cho Product Owner review và nghiệm thu.

## Cơ sở lập kế hoạch

[Product Backlog](../../docs/PRODUCT_BACKLOG.md) đặt PB-05 sau PB-04 và đề xuất PB-05 cùng lát cắt PB-13 thực đơn làm bước tiếp theo. [Sprint 3](../sprint-03/SPRINT.md) đã nghiệm thu local PB-04 và UI tổ chức ngày 01/11/2026. CI của phần này được backlog ghi nhận sau đó; chưa có xác nhận production. Hiện API thực đơn đã có và màn thực đơn đã nối API thật. Nhóm gồm Product Owner và Codex; sức chứa lấy theo phạm vi thực tế, không suy từ việc Sprint 3 kết thúc sớm.

## Sprint Goal đã chốt

`OWNER` quản lý được thực đơn chung cho cửa hàng qua API và UI thật: danh mục, món, size, giá, topping và ảnh món tùy chọn. Dữ liệu của cửa hàng khác không thể đọc hoặc sửa; món ngưng dùng không xuất hiện trong danh sách bán. Sprint này chuẩn bị nguồn menu cho PB-07, chưa tạo đơn hoặc bán hàng thật.

## Sprint Backlog đã chốt

| Thứ tự | Item | Kết quả cần đạt | Điều kiện trước khi triển khai | Trạng thái |
| --- | --- | --- | --- | :---: |
| 1 | Refinement PB-05 và UI thực đơn | Phỏng vấn, rà BR-08–13, BR-80, BR-100, BR-103, BR-105; chốt thao tác, quyền, trạng thái, ảnh, hợp đồng API/UI và ma trận tiêu chí → tình huống → artifact. | Product Owner chốt các quyết định còn mở; dùng skill `create-pos-spec`, chỉ ghi vào `specs/` sau khi chốt. | **Hoàn thành** (`specs/menu.md`) |
| 2 | PB-05 — API/DB thực đơn | Migration và API quản lý danh mục, món, size, giá, topping, liên kết topping với danh mục và ảnh tùy chọn theo spec. Menu cùng store dùng chung giữa các chi nhánh; kiểm tra toàn vẹn tham chiếu và quyền. | Spec PB-05 đã chốt; đối chiếu schema và các entity hiện có. | **Hoàn thành** (6 bảng, 18 endpoints, 8 integration subtests) |
| 3 | PB-13 — lát cắt thực đơn | `OWNER` quản lý thực đơn trên UI qua API thật; trạng thái tải, lỗi, lưu và tải lại trang phản ánh dữ liệu DB. Màn chọn món chỉ đọc dữ liệu thật nếu phạm vi đọc POS được chốt và triển khai trong cùng lát cắt. | API tương ứng đã chạy và được kiểm tra; không coi màn POS mock là đã nối API. | **Hoàn thành** (`ProductsScreen.tsx`, `menuService.ts`, 31 unit/integration tests) |
| 4 | Review và nghiệm thu | Kiểm tra trên mã/UI cuối, review thay đổi và đối chiếu từng tiêu chí với artifact; Product Owner quyết định từng item. | Bằng chứng theo `AGENTS.md` đủ cho phạm vi được chốt. | **Hoàn thành nghiệm thu** |

PB-06 (ca), PB-07 (đơn), PB-08 (kho), thanh toán và production tiếp tục theo backlog; không thuộc Sprint 4. Khóa sửa quỹ sau ca đầu tiên thuộc PB-06. Màn POS đọc menu bán hàng và snapshot giá trên đơn hàng thuộc phạm vi PB-07.

## Tiêu chí nghiệm thu

- [x] `OWNER` tạo, xem, sửa và ngưng dùng danh mục/món/size/topping trong store của mình theo spec; dữ liệu có tham chiếu được giữ lại. Tên và giá tuân theo BR-13/BR-103.
- [x] Món có giá theo size; món chưa có size bán được không xuất hiện như lựa chọn bán. Topping chỉ được chọn cho danh mục đã liên kết. Menu và giá giống nhau giữa các chi nhánh cùng store (BR-08, BR-11, BR-100).
- [x] Ảnh món là tùy chọn; upload và đọc ảnh kiểm tra quyền/store, kích thước và định dạng đã chốt. Response danh sách không chứa nội dung ảnh hay đường dẫn lưu nội bộ (BR-105).
- [x] API chặn người không có quyền, `PLATFORM_ADMIN`, store bị khóa và ID tham chiếu khác store; không ghi dữ liệu khi bị từ chối. Kiểm tra qua HTTP với PostgreSQL thật.
- [x] UI quản lý thực đơn dùng API thật; lưu xong và tải lại vẫn thấy dữ liệu DB, hiển thị lỗi/trạng thái bằng tiếng Việt và không trộn dữ liệu khi đổi phạm vi hoặc request cũ về muộn.

## Kiểm tra và bằng chứng thực thi

- Bằng chứng QA Docker mới nhất: [qa-evidence/20261102-190753-31f4799-docker-qa/run.md](../../qa-evidence/20261102-190753-31f4799-docker-qa/run.md)
- Bằng chứng QA trước đó: [qa-evidence/20261102-114500-31f4799-qa-audit/run.md](../../qa-evidence/20261102-114500-31f4799-qa-audit/run.md)
- Backend Menu Integration Tests: 8/8 subtests PASS trên PostgreSQL 17 (Docker container `pos_infra-postgres-1`).
- Backend Regression: Foundation (1 pass), Auth (1 pass), Organization (11 pass), Platform (1 pass) đều 100% PASS.
- Frontend POS_UI Tests: 31/31 tests PASS (0 fail).
- Production Build: Cả `POS_API` và `POS_UI` build sạch sẽ với exit code 0.

## Quyết định đã chốt trong planning/refinement

1. Đã chốt ngày 02/11/2026: Sprint Goal, sức chứa PB-05 + lát cắt PB-13 thực đơn và lịch 02–08/11/2026.
2. Xóa vs Ngưng dùng (BR-10): Dữ liệu có tham chiếu chỉ cho phép ngưng dùng (`isActive = false`); `DELETE` bị chặn `409 RESOURCE_IN_USE` nếu có tham chiếu phụ thuộc.
3. Ảnh món (BR-105): File <= 2MB (`image/jpeg`, `image/png`, `image/webp`), lưu Base64 ngầm trong DB cột `image_base64` (chế độ `@Column({ select: false })` tránh phình RAM danh sách món), endpoint `GET /products/{id}/image` phục vụ raw binary bytes; danh sách món chỉ trả `imageUrl`.
4. Quyền truy cập: `menu.manage` cho `OWNER` và `MANAGER`; `menu.read` cho `OWNER`, `MANAGER`, `CASHIER`. `PLATFORM_ADMIN` bị chặn tuyệt đối `403 PERMISSION_DENIED` theo BR-81.
5. Tiền tệ VND nguyên đồng, ràng buộc CHECK trên DB tối đa 1.000 tỷ VND (BR-103).

## Review và retrospective

- **Kết quả nghiệm thu:** Đã hoàn thành toàn bộ mã nguồn backend, migration, frontend screen, unit/integration test suite theo đúng cam kết Sprint Goal.
- **Thẩm định & Khắc phục:** Đã fix toàn bộ 8 findings do subagent `code-reviewer` phát hiện, bao gồm lỗi quyền hạn truy cập màn hình, kiểm tra trùng tên khi chuyển danh mục món, bọc transaction xóa danh mục và hỗ trợ `FormData` cho upload ảnh.
- **Kiểm thử đối chứng độc lập:** Subagent QA đã chạy kiểm thử độc lập 100% PASS trên PostgreSQL 17 Docker container `pos_infra-postgres-1`.
