# Lập Sprint 10 từ Product Backlog

**Trạng thái:** Hoàn tất hồ sơ planning ngày 14/11/2026; Sprint 10 chưa triển khai hoặc nghiệm thu.

## Yêu cầu và quyết định

- User yêu cầu đọc `docs/PRODUCT_BACKLOG.md` và tạo Sprint 10; chọn PB-12 + UI Báo cáo (PB-13), bắt đầu 14/11/2026. User chọn thêm biểu đồ doanh thu theo ngày và món bán chạy dù Product Overview/BR-66 đặt món bán chạy ở Giai đoạn 2. Ngày kết thúc chưa được cung cấp.
- Nguồn: `docs/PRODUCT_BACKLOG.md` PB-12/PB-13; `sprints/sprint-09/SPRINT.md` phần ranh giới; `docs/PRODUCT_OVERVIEW.md` mục 5; `docs/BUSINESS_RULES.md` BR-62..66, BR-77; `DESIGN.md` mục 5.6; `docs/api-spec.md`; mã UI hiện tại ở `POS_UI/src/features/reports/`, `POS_UI/src/app/navigation.ts`, `POS_UI/src/app/App.tsx`, `POS_API/src/app.module.ts`.
- Baseline: `master` tại `46692c9`, working tree sạch và đồng bộ `origin/master`; lập hồ sơ trên nhánh `docs/sprint-10-plan`. Graphify không có marker `needs_update` trước khi đọc, đã query để định vị báo cáo/mã liên quan rồi xác nhận bằng source.

## Kết quả

1. Tạo `sprints/sprint-10/SPRINT.md`: Goal, backlog theo dependency, S10-01..06 với bằng chứng cần thu, ranh giới PB-14 và các điểm refinement trước code.
2. Cập nhật `docs/PRODUCT_BACKLOG.md`: trạng thái Sprint 09 hiện tại và liên kết/phạm vi Sprint 10.
3. Không viết spec endpoint, plan triển khai hay code trong task planning. Khoảng ngày biểu đồ, xếp hạng món, số hóa đơn/đơn 0đ và quyền xem ca lịch sử cần chốt trong spec trước code.

## Kiểm tra và bước tiếp

- Kiểm diff Markdown, liên kết nội bộ và trạng thái Git; không chạy test ứng dụng vì chỉ đổi tài liệu.
- Đồng bộ semantic Graphify cho Markdown thay đổi và query kiểm lại nội dung mới.
- Bắt đầu refinement/spec và plan/task devloopflow riêng khi triển khai. Ngày kết thúc sprint chưa chốt; QA và Sprint Review/Retrospective chưa diễn ra.
