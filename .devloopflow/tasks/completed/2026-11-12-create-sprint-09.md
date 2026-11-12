# Lập Sprint 09 từ Product Backlog

**Trạng thái:** Hoàn tất hồ sơ planning dự thảo ngày 12/11/2026; Sprint 09 chưa được chốt, chưa triển khai hoặc nghiệm thu.

## Bối cảnh và mục tiêu

- Yêu cầu: đọc `docs/PRODUCT_BACKLOG.md` và tạo Sprint 09; sau đó viết lại theo mẫu các Sprint trước. Người dùng chọn phạm vi PB-10 + PB-11 + lát cắt PB-13 tương ứng, lịch "hôm nay luôn" (bắt đầu 12/11/2026) và đặt tích hợp Git/CI mã Sprint 08 làm item đầu. Ngày kết thúc 18/11/2026 lấy theo độ dài 7 ngày của các sprint trước, **chưa được người dùng xác nhận**.
- Nguồn: `docs/PRODUCT_BACKLOG.md` mục PB-10/PB-11/PB-13 và theo dõi sau Sprint 7; `docs/PRODUCT_OVERVIEW.md` mục 5, 6.2, 6.3; `docs/BUSINESS_RULES.md` BR-21, BR-28..29, BR-39, BR-47, BR-51..61; `docs/api-spec.md`; `sprints/sprint-08/SPRINT.md`; mã `POS_API/src/shifts/` và `POS_API/src/sales/sales.controller.ts`.
- Mục tiêu: tạo `sprints/sprint-09/SPRINT.md` với Goal, backlog theo dependency, tiêu chí S9 và chứng cứ cần thu, ranh giới với PB-12/PB-14; cập nhật backlog để dẫn hồ sơ mới.
- Nhánh: tạo `docs/sprint-09-plan` từ `master` `c710cf4` (working tree sạch, đã `git fetch origin`). Commit đầu `31785d8` đã push.

## Các bước và trạng thái

1. **Hoàn tất:** đọc Product Backlog, Product Overview, Sprint 07/08, business rules liên quan; đọc route `shifts` và `invoices`, xác nhận `expense_amount` gán cứng `0` và hủy đơn chỉ áp dụng `OPEN`.
2. **Hoàn tất:** kiểm CI `master`: `gh run list --branch master` cho run `43217314020` thành công trên merge PR #20 (12/11/2026). Mã Sprint 08 đã merge qua PR #18.
3. **Hoàn tất:** ghi Sprint 09 theo cấu trúc Sprint 07/08 (Cơ sở và quyết định phạm vi, Sprint Goal, Sprint Backlog, tiêu chí S9-01..06, ranh giới, điểm refinement, theo dõi planning).
4. **Hoàn tất:** cập nhật `docs/PRODUCT_BACKLOG.md` (dòng trạng thái Sprint 09 và liên kết hồ sơ sprint).

## Ranh giới và blocker

- Không viết code, spec endpoint hoặc xác nhận QA trong task planning này. `specs/shifts.md` và `specs/invoices.md` chưa đặc tả chi từ két hay hủy đơn `PAID`; hợp đồng chi tiết phải chốt trước triển khai.
- PB-12 báo cáo và PB-14 production không nằm trong Sprint 09.
- Blocker trước khi chốt: ngày kết thúc sprint chưa xác nhận.

## File và kiểm tra

- File đổi: `sprints/sprint-09/SPRINT.md`, `docs/PRODUCT_BACKLOG.md`, file task này.
- Chưa chạy test ứng dụng vì chỉ sửa tài liệu. Chưa có bằng chứng QA Sprint 09.
- Chưa chạy semantic update Graphify cho các Markdown thay đổi.
- Bước tiếp theo: user xác nhận ngày kết thúc và "chốt sprint"; sau đó refinement spec, lập plan/AC trên nhánh triển khai.
