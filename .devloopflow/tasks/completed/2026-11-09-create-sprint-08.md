# Lập Sprint 08 từ Product Backlog

**Trạng thái:** Hoàn tất hồ sơ planning ngày 09/11/2026; Sprint 08 chưa triển khai hoặc nghiệm thu.

## Bối cảnh và mục tiêu

- Yêu cầu: đọc `docs/PRODUCT_BACKLOG.md` và tạo Sprint 08. Người dùng chốt phạm vi PB-09 + lát cắt PB-13 UI thanh toán dùng API thật. Lịch ban đầu 20–26/11/2026; sau đó người dùng sửa ngày bắt đầu thành 09/11/2026 và xác nhận kết thúc 15/11/2026. Lịch hiện hành: **09–15/11/2026**.
- Nguồn: `docs/PRODUCT_BACKLOG.md` mục PB-09/PB-13 và theo dõi sau Sprint 7; `docs/PRODUCT_OVERVIEW.md` mục 5; `docs/BUSINESS_RULES.md` mục 9–12, 17; `docs/api-spec.md` mục 7 và 9; `docs/DESIGN_DB_POS_SYSTEM.md`; `sprints/sprint-07/SPRINT.md`.
- Mục tiêu: tạo `sprints/sprint-08/SPRINT.md` với Goal, backlog theo dependency, tiêu chí S8 và chứng cứ cần thu, ranh giới với PB-10..14; cập nhật backlog để dẫn hồ sơ mới.
- Nhánh hiện tại: `master`; HEAD `48ed476` khi bắt đầu; `git status --short` chỉ có `.devloopflow/` chưa theo dõi, không thuộc task. Không sửa source hoặc file chưa theo dõi đó.

## Các bước và trạng thái

1. **Hoàn tất:** đọc Product Overview, Product Backlog, Sprint 07, business rules và API convention liên quan; kiểm `specs/` chưa có spec thanh toán riêng.
2. **Hoàn tất:** ghi Sprint 08 theo phạm vi/lịch đã chốt; tách 7 tiêu chí cấp sprint S8-01..07 khỏi AC sẽ chốt trong spec/plan.
3. **Hoàn tất:** cập nhật `docs/PRODUCT_BACKLOG.md` để dẫn Sprint 08 và nêu trạng thái kế hoạch, chưa coi là đã triển khai.
4. **Hoàn tất:** `git diff --check` exit 0; S8-01..07 xuất hiện mỗi mã một lần; các liên kết local của Sprint/Backlog được kiểm sau khi chuyển task vào completed. Link `https:` trong Backlog không thuộc kiểm tra file local.
5. **Hoàn tất:** chuyển task sang `tasks/completed/`, cập nhật semantic graph cho ba Markdown thay đổi và query xác minh; kết quả lệnh xem phần dưới.

## Ranh giới và blocker

- Không viết code, spec endpoint hoặc xác nhận QA trong task planning này. `specs/invoices.md` được `docs/api-spec.md` dẫn nhưng hiện chưa tồn tại; hợp đồng chi tiết phải chốt trước triển khai.
- PB-10 đối soát, PB-11 hủy `PAID`, PB-12 báo cáo và PB-14 production không nằm trong Sprint 08.
- Chưa có blocker cho việc lập sprint. Khi triển khai phải đối chiếu nhánh code Sprint 07 vì `master` chưa chắc chứa phần kho/khuyến mãi đã QA local.

## File và kiểm tra

- File dự kiến đổi: `sprints/sprint-08/SPRINT.md`, `docs/PRODUCT_BACKLOG.md`, file task này.
- Chưa chạy test ứng dụng vì chỉ sửa tài liệu. Chưa có bằng chứng QA Sprint 08.
- Bước tiếp theo: refinement spec thanh toán bằng `create-pos-spec`, chốt các điểm mở trong Sprint 08, lập plan/AC và xác nhận nhánh code chứa PB-07/PB-08/PB-08a trước triển khai.
- Targeted semantic update: chạy `C:\Users\Admin\AppData\Roaming\uv\tools\graphifyy\Scripts\python.exe graphify-out/.sprint08_semantic_update.py`, exit 0, merge 3 Markdown, 113 node/110 edge; `graphify query 'Sprint 08 PB-09 thanh toán idempotency UI' --budget 500` exit 0 và trả node `sprints/sprint-08/SPRINT.md` (dòng 1). Script/output Graphify ở `graphify-out/` local bị ignore, không phải artifact QA; marker `needs_update` không tồn tại sau kiểm.

## Quyết định chốt kế hoạch Sprint 08

- Ngày 09/11/2026, người dùng yêu cầu “chốt sprint” sau khi sửa lịch 09–15/11/2026. Đã chốt Sprint Goal, bốn item Sprint Backlog và S8-01..07 tại `sprints/sprint-08/SPRINT.md`; không thay đổi phạm vi PB-09 + lát cắt PB-13 UI thanh toán.
- Đây là cổng planning. Tiêu chí chưa được tick; chưa có spec thanh toán, code hoặc QA. Bước kế tiếp vẫn là refinement/chốt spec và plan triển khai, rồi thực hiện trên baseline chứa dependency.
