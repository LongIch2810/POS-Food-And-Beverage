# Sprint 07 — refinement spec trước triển khai

**Trạng thái:** Hoàn tất refinement ngày 07/11/2026; Product Owner chốt cả hai bản nháp trước code. **Plan:** [kế hoạch Sprint 07](../../plans/completed/2026-11-07-sprint-07-inventory-promotions.md). **Sprint:** [Sprint 07](../../sprints/sprint-07/SPRINT.md).

## Baseline và phạm vi

- Nhánh `docs/sprint-07-planning`; HEAD `5ada010f61d76ae5a0bf55a2224081513ad762bb`.
- `git status --short` trước task: ` M docs/PRODUCT_BACKLOG.md`; `?? sprints/sprint-07/`; `?? tasks/completed/2026-11-07-create-sprint-07.md`. Đây là tài liệu planning chưa commit, giữ nguyên nội dung.
- Nhiệm vụ hiện tại: soạn hai draft spec từ plan đã duyệt; chưa sửa source, chạy test hoặc DB. Specs chính thức trong `specs/` chỉ tạo sau khi Product Owner chốt nội dung.

## Tiến độ và bước tiếp

1. Đã đọc Sprint 07, BR-36..50/72/80..81, DB schema, api-spec, mock UI Kho/Recipe và mẫu spec. Đã xác nhận `specs/inventory.md`, `specs/promotions.md` chưa có.
2. Đã soạn draft kho/khuyến mãi với route, quyền, request/response, lỗi, ví dụ và AC-1..7 ↔ S7-01..07; `git diff --check` exit 0, mọi link tương đối tồn tại. Targeted semantic update Graphify exit 0.
3. Product Owner trả lời “Chốt cả hai bản nháp” trong phiên; đã chuyển thành [spec kho](../../specs/inventory.md) và [spec khuyến mãi](../../specs/promotions.md), ghi trạng thái đã chốt. Chưa sửa source code, chạy test hoặc DB.

## Kiểm chứng và blocker

- Chưa chạy test/migration/DB. Chỉ dùng lệnh đọc tài liệu và Git; không in secret.
- Blocker chốt spec đã giải quyết. Bước tiếp theo cụ thể: tạo task implementation với bảng AC↔S7 khóa trước code, xác nhận DB test an toàn rồi bắt đầu TDD kho.
