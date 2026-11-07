# Tóm tắt QA Sprint 07 — kho và khuyến mãi

**Kết luận local ngày 07/11/2026:** task AC-1..7 **PASS**; sprint S7-01..07 **PASS** trên PostgreSQL sandbox và UI cuối. Nguồn tiêu chí là [plan triển khai](../plans/completed/2026-11-07-sprint-07-inventory-promotions.md), [spec kho](../specs/inventory.md), [spec khuyến mãi](../specs/promotions.md) và [Sprint 07](../sprints/sprint-07/SPRINT.md). QA đánh giá hai tầng riêng; mã S7 trong bảng task chỉ dùng để đối chiếu.

| Task / sprint | Nguồn BR hoặc backlog | Nội dung đã kiểm và kết quả |
| --- | --- | --- |
| AC-1 / S7-01 | BR-13, BR-48, BR-80 | Nguyên liệu CRUD mềm, tên duy nhất, khóa unit sau tham chiếu, quyền và cô lập store: **PASS**. |
| AC-2 / S7-02 | BR-48, BR-80 | Công thức product-size/topping, lượng hợp lệ, rollback, nguyên liệu ngưng dùng và cô lập store: **PASS**. |
| AC-3 / S7-03 | BR-45, BR-72, BR-80..81 | Tồn/ngưỡng theo branch, quyền, từ chối client ghi tồn, đối chiếu tồn với tổng movement: **PASS**. |
| AC-4 / S7-04 | BR-42, BR-44, BR-50 | Sổ chỉ thêm dòng, route ghi bị từ chối; tạo/sửa đơn `OPEN` không đổi tồn hoặc tạo `SALE`: **PASS**. |
| AC-5 / S7-05 | BR-36, BR-80..81 | Mã PERCENT/FIXED, điều kiện, unique trong store, khóa điều kiện mã đã dùng, quyền: **PASS**. |
| AC-6 / S7-06 | BR-36..41 | Eligibility, làm tròn/trần/FIXED, không vượt subtotal và API từ chối giảm tay: **PASS**. |
| AC-7 / S7-07 | PB-13 | UI Kho/Recipe/Khuyến mãi gọi API thật; tạo/sửa/ngưng nguyên liệu, ngưỡng, reload, quyền/branch/đổi phiên, loading và lỗi tiếng Việt: **PASS**. |

QA tự chạy trong `POS_API`: `npm test` với PostgreSQL local/test được xác nhận, exit 0, **74/74 test**. Trong `POS_UI`: `npm test` exit 0, **40/40 test**; `npm run build` exit 0. QA còn kiểm API/browser/DB trước-sau trên hai store, nhiều branch và vai trò. [Báo cáo QA](20261107-204250-5ada010f-s7-sprint-qa/run.md) ghi từng tình huống expected/actual, lệnh, thời gian, SHA và danh sách artifact; [bổ sung UI](20261107-204250-5ada010f-s7-sprint-qa/supplement/run.md) hoàn tất các vế AC-7/S7-07. Lỗi TypeORM phát hiện trước QA cuối đã sửa và có [hồ sơ lỗi](../errors/2026-11-07-sprint07-update-returning.md); không có FAIL sản phẩm còn mở trong phạm vi Sprint 07.

**Giới hạn bằng chứng:** QA chạy trên HEAD nền `5ada010f61d76ae5a0bf55a2224081513ad762bb` với working tree dirty; thay đổi được commit sau đó ở `8bc11be770f68b3ff5944e5f8a9c65f4feaf03dd`. Artifact gốc như log, script, ảnh, network và DB snapshot chỉ lưu local, **không được push**; Markdown này là bản tóm tắt, không thay thế artifact gốc hoặc CI độc lập. Chưa kết luận production, thanh toán PB-09, áp mã lên hóa đơn, trừ/hoàn kho hay movement Giai đoạn 2. [Sprint Review và retrospective](../sprints/sprint-07/SPRINT.md) ghi quyết định nghiệm thu local và đóng sớm.
