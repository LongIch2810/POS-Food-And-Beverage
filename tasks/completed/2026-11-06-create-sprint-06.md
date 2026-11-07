# Task: Lập hồ sơ Sprint 6

**Trạng thái:** Hoàn tất lập và chốt phạm vi/lịch Sprint 6 tại mốc task này; refinement/spec PB-07, triển khai và QA sau đó đã hoàn tất, Sprint 6 nghiệm thu/đóng local ngày 07/11/2026. **Nhánh tại mốc lập sprint:** `feat/pb06-shifts`. **HEAD nền:** `2ca4294`. **Plan liên quan:** Không có; người dùng yêu cầu trực tiếp lập Sprint 6 từ Product Backlog.

## Bối cảnh và mục tiêu

Sprint 5 đã kết thúc; `docs/PRODUCT_BACKLOG.md` đề xuất PB-07 (bán hàng, đơn hàng) và lát cắt PB-13 tương ứng cho Sprint 6. Chưa có spec PB-07 trong `specs/`. Lập `sprints/sprint-06/SPRINT.md` ở trạng thái đề xuất, đủ mục tiêu, phạm vi, dependency, tiêu chí sprint, bằng chứng dự kiến và quyết định còn mở. Không mô tả hạng mục chưa triển khai là đã hoàn thành.

## Baseline và phạm vi

- `git status -sb`: nhánh `feat/pb06-shifts`, working tree sạch, nhánh local ahead 3 so với `origin/feat/pb06-shifts` do các commit đã cherry-pick lên `master`.
- Nguồn: `docs/PRODUCT_OVERVIEW.md` mục 5–6, `docs/PRODUCT_BACKLOG.md`, `docs/BUSINESS_RULES.md` mục bàn/ca/đơn, `docs/DESIGN_DB_POS_SYSTEM.md`, `docs/api-spec.md`, `sprints/sprint-05/SPRINT.md`.
- Chỉ sửa hồ sơ Sprint 6 và liên kết trong backlog; không sửa spec, code hay Sprint 5.

## Bước thực hiện và kiểm chứng

1. [x] Đọc backlog và kết luận Sprint 5; xác nhận PB-07 + PB-13 là phạm vi đề xuất.
2. [x] Đối chiếu BR-16, BR-21–26, BR-69, BR-74–75, BR-90–95, BR-99 và schema/API tổng quát; xác nhận chưa có `specs/` cho PB-07.
3. [x] Tạo `sprints/sprint-06/SPRINT.md` với mục tiêu, backlog theo dependency, tám tiêu chí S6-01..S6-08, ranh giới PB-09/PB-10/PB-11. Ban đầu BR-92/BR-28 là quyết định mở; Product Owner sau đó chốt gồm cả hai và lịch 06–12/11/2026, đã cập nhật vào Sprint và tiêu chí S6-07/S6-08.
4. [x] Liên kết hồ sơ Sprint 6 từ `docs/PRODUCT_BACKLOG.md`; kiểm tra `git diff --check`, 7 link tương đối đều tồn tại, sáu mã S6 duy nhất. Không chạy test ứng dụng vì chỉ lập tài liệu.

## Quyết định và điểm chờ

- Đây là đề xuất planning, không phải cam kết đã duyệt hay nghiệm thu. Ngày bắt đầu/kết thúc và hợp đồng endpoint cụ thể chưa chốt; để mở cho Product Owner.
- Không triển khai PB-07 trước khi spec được chốt. Không tự suy từ UI demo rằng API bán hàng đã hoạt động.
- QA Sprint 6 chỉ kết luận khi có lần kiểm thử thực tế và artifact theo `AGENTS.md`.

## File đã đổi và bước tiếp theo

- Tạo `sprints/sprint-06/SPRINT.md`; sửa `docs/PRODUCT_BACKLOG.md`; tạo hồ sơ task này.
- Product Owner đã chốt lịch 06–12/11/2026, gồm BR-28 và BR-92 trong Sprint 6. Bước tiếp theo **tại mốc lập sprint** là refinement endpoint/quyền, chốt spec PB-07 rồi lập plan; các bước này đã hoàn tất trong [task PB-07](2026-11-06-pb07-open-orders.md). Kết quả và quyết định đóng ở [Sprint 6](../../sprints/sprint-06/SPRINT.md).
- Graphify semantic update đã xử lý có giới hạn cho ba Markdown của task bằng `graphify.build.build_merge`, `graphify.cluster.cluster` và `graphify.export.to_json`; `graphify cluster-only .` làm mới report. Sau cập nhật backlog cuối, graph có 4.204 nodes, 11.444 edges, 172 communities. `graphify explain` xác nhận node S6-08, lịch 06–12/11/2026 và cam kết PB-07/PB-13 trỏ về đúng nguồn. Marker `graphify-out/needs_update` được xóa sau query xác nhận; dòng hồ sơ này được đồng bộ lại trong graph trước khi kết thúc.
