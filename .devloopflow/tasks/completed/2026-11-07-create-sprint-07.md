# Lập Sprint 07 từ Product Backlog

**Trạng thái:** Hoàn tất hồ sơ planning ngày 07/11/2026; Sprint 07 chưa triển khai code hoặc nghiệm thu.

## Bối cảnh và mục tiêu

- Yêu cầu: sau khi commit và push Sprint 06, đọc `docs/PRODUCT_BACKLOG.md` để tạo Sprint 07.
- Nguồn: `docs/PRODUCT_BACKLOG.md` (PB-08, PB-08a, PB-09, PB-13), `docs/PRODUCT_OVERVIEW.md` mục 5–6, `docs/BUSINESS_RULES.md` mục 11–12 và 17, `docs/DESIGN_DB_POS_SYSTEM.md` phần nguyên liệu/kho/khuyến mãi, `docs/api-spec.md`.
- Mục tiêu: hồ sơ `sprints/sprint-07/SPRINT.md` ghi phạm vi, dependency, lịch, backlog thứ tự, tiêu chí nghiệm thu có mã và bằng chứng cần thu, ranh giới với PB-09; cập nhật Product Backlog để phản ánh planning.
- Nhánh planning: `docs/sprint-07-planning`, tách từ `feat/pb07-open-orders` tại `5ada010f61d76ae5a0bf55a2224081513ad762bb` sau khi nhánh Sprint 06 đã push. Baseline `git status --short`: sạch. Sprint 06 chưa merge vào `master`.

## Quyết định đã nhận trong phiên 07/11/2026

1. Sprint 07 gồm **PB-08 và PB-08a**; PB-09 thanh toán để sprint sau theo dependency của Product Backlog.
2. Lịch **13–19/11/2026**. Sprint 06 đã kết thúc local sớm ngày 07/11 nhưng lịch công bố của Sprint 06 là 06–12/11.
3. Theo BR-50, **chưa nhập kho (`IMPORT`), hao hụt (`WASTE`) hoặc kiểm kê (`ADJUST`) trong MVP/Sprint 07**. Tồn theo chi nhánh được cấu trúc và đọc; biến động bán/hoàn kho chờ PB-09/PB-11. Không tự đặt cách tạo tồn dương ban đầu.
4. Product Owner chốt **có PB-13 UI Kho/Khuyến mãi** trong Sprint 07. Vì vậy S7-07 là tiêu chí sprint bắt buộc; không dùng UI demo làm bằng chứng backend.

## Các bước và trạng thái

1. **Hoàn tất:** kiểm tra nhánh và working tree; commit `5ada010` chứa Sprint 06, push `origin/feat/pb07-open-orders` thành công. [CI GitHub Actions run `42344732910`](https://github.com/LongIch2810/POS-Food-And-Beverage/actions/runs/42344732910) có kết luận `success` cho cả API và UI trên đúng SHA `5ada010f61d76ae5a0bf55a2224081513ad762bb` (kiểm bằng `gh run view 42344732910 --json status,conclusion,headSha,jobs`).
2. **Hoàn tất:** đọc Product Backlog, Product Overview, BR-36..50/72/80/81 và thiết kế DB liên quan. `specs/inventory.md` và `specs/promotions.md` chưa tồn tại; đây là điều kiện phải hoàn thành ở refinement, không coi contract endpoint đã chốt.
3. **Hoàn tất:** `sprints/sprint-07/SPRINT.md` có Sprint Goal, Sprint Backlog PB-08/PB-08a/PB-13 UI, bảng tiêu chí cấp sprint S7-01..07 với nguồn và artifact cần thu, dependency PB-09 và ranh giới BR-50. Chi tiết endpoint còn phải chốt ở spec riêng.
4. **Hoàn tất:** `docs/PRODUCT_BACKLOG.md` đã dẫn Sprint 07, quyết định phạm vi/lịch và CI Sprint 06. Kiểm toàn bộ liên kết tương đối của ba file Markdown bằng `Test-Path` không có link gãy ở lượt nháp; kiểm cuối sau cập nhật phạm vi UI ghi dưới đây.
5. **Hoàn tất:** targeted semantic update Graphify cho ba Markdown bằng Python của `graphifyy` và `graphify-out/.sprint07_semantic_update.py`; lệnh exit 0, `graphify query 'Sprint 07 PB-08 PB-08a tồn kho khuyến mãi' --budget 550` trả node từ `sprints/sprint-07/SPRINT.md`, marker `needs_update` không tồn tại. Sau khi chuyển task sang completed, chạy cập nhật cuối và xác minh lại.

## Kiểm tra, blocker và bước tiếp

- Chưa chạy test vì task chỉ sửa tài liệu. Kiểm cuối: đối chiếu S7-01..07 với PB/BR nguồn; chạy `git diff --check` và kiểm link tương đối sau khi chốt UI; kết quả ghi ở cuối task.
- File thay đổi: `sprints/sprint-07/SPRINT.md`, `docs/PRODUCT_BACKLOG.md`, file task này. Script targeted semantic nằm trong `graphify-out/` bị Git ignore; không đưa graph output vào commit.
- Không có blocker để **lập** Sprint 07. Trước triển khai còn phải refinement/chốt `specs/inventory.md`, `specs/promotions.md`, UI contract và plan task; Sprint 06 chưa merge `master`.
- Bước tiếp sau task planning: phỏng vấn/chốt spec PB-08, PB-08a và UI, lập plan triển khai theo AC↔S7. Không commit/push nhánh planning khi chưa được yêu cầu.

## Kiểm tra cuối và bàn giao

- `git diff --check`: exit 0; chỉ có cảnh báo quy đổi LF/CRLF của `docs/PRODUCT_BACKLOG.md`, không có lỗi whitespace.
- Kiểm tra link tương đối trong `sprints/sprint-07/SPRINT.md`, `docs/PRODUCT_BACKLOG.md` và task này: mọi target tồn tại.
- Mã tiêu chí trong bảng Sprint: S7-01..S7-07 xuất hiện đủ một lần theo thứ tự; chưa đánh dấu nghiệm thu.
- `git status --short` sau planning: chỉ `docs/PRODUCT_BACKLOG.md`, `sprints/sprint-07/SPRINT.md` và task completed này thay đổi/chưa theo dõi. Không có source code Sprint 07 được sửa.
- Bước bàn giao cụ thể: chạy `create-pos-spec` cho PB-08 và PB-08a để chốt mọi quyết định mục “Điểm cần giải quyết” trong `sprints/sprint-07/SPRINT.md`; sau đó lập plan implementation và AC↔S7, mới triển khai TDD/review/QA trên sandbox.

## Quyết định tiếp theo — chốt Sprint 07

- Product Owner yêu cầu “chốt sprint” trong phiên ngày 07/11/2026. Đã cập nhật `sprints/sprint-07/SPRINT.md` và `docs/PRODUCT_BACKLOG.md`: Sprint Goal, Sprint Backlog và S7-01..S7-07 là kế hoạch đã chốt; ô nghiệm thu vẫn trống vì chưa triển khai/QA.
- Các chi tiết endpoint, quyền, dữ liệu biên và UI contract vẫn phải refinement trong spec. Nếu spec mâu thuẫn S7, dừng phần phụ thuộc và hỏi Product Owner trước khi thay đổi tiêu chí; không tự sửa ngầm.
