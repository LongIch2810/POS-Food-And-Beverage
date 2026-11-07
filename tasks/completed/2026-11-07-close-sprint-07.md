# Đóng Sprint 07 — Review, retrospective và bàn giao

**Trạng thái:** Hoàn tất ngày 07/11/2026; Sprint 07 đã đóng sớm theo yêu cầu người dùng, nghiệm thu local S7-01..07 PASS. **Plan:** không tạo plan riêng vì đây là công việc đóng hồ sơ sau plan triển khai đã hoàn tất ở `plans/completed/2026-11-07-sprint-07-inventory-promotions.md`. **Sprint:** `sprints/sprint-07/SPRINT.md`.

## Bối cảnh, quyết định và phạm vi

- Người dùng yêu cầu trong phiên: “Sprint Review/retrospective và quyết định đóng sprint vẫn là bước riêng làm luôn đi”. Đây là quyết định cho phép tổng hợp Review/retrospective và đóng Sprint 07 sớm ngày 07/11/2026, trước lịch kế hoạch 13–19/11/2026. Không giả định đã diễn ra cuộc họp hay có phản hồi khác của Product Owner.
- Sprint Goal: cấu hình nguyên liệu, công thức product-size/topping, tồn và sổ kho theo chi nhánh, mã giảm giá MVP qua API/UI thật làm nền cho PB-09; không gồm thanh toán, áp mã lên hóa đơn, trừ/hoàn kho hay các movement Giai đoạn 2.
- QA task AC-1..7 và QA cấp sprint S7-01..07 đều PASS trên sandbox theo `qa-evidence/20261107-204250-5ada010f-s7-sprint-qa/run.md` và `supplement/run.md`; backend 74/74, UI 40/40, UI build exit 0. Agent chính đã kiểm file artifact tồn tại, exit code và hash UI ở lượt trước; phải tiếp tục đối chiếu nội dung trước khi ghi kết luận đóng.
- Trong phạm vi: cập nhật kết luận Sprint Review, retrospective, quyết định đóng và backlog theo kết quả thật; không sửa source, không chạy production/test mới, không commit/push/merge khi chưa được yêu cầu.

## Baseline Git trước khi đóng

- Branch: `feat/sprint-07-inventory-promotions`.
- HEAD: `5ada010f61d76ae5a0bf55a2224081513ad762bb`.
- Working tree dirty; `git status --short` trước tác vụ:

```text
 M MEMORY.md
 M POS_API/src/app.module.ts
 M POS_API/src/foundation.test.ts
 M POS_API/src/sales/tests/sales.integration.test.ts
 M POS_UI/src/app/App.tsx
 M POS_UI/src/app/navigation.ts
 M POS_UI/src/components/common/AppShell.tsx
 M POS_UI/src/features/inventory/InventoryScreen.tsx
 M POS_UI/src/features/inventory/inventoryService.ts
 M POS_UI/src/features/products/ProductsScreen.tsx
 M POS_UI/src/features/products/RecipeModal.tsx
 M POS_UI/src/features/settings/SettingsScreen.tsx
 M POS_UI/src/types/auth.ts
 M POS_UI/src/utils/formatters.ts
 M POS_UI/test/organization-screen.test.mjs
 M docs/PRODUCT_BACKLOG.md
?? POS_API/src/database/migrations/20261107000000-InventoryPromotions.ts
?? POS_API/src/inventory/
?? POS_API/src/promotions/
?? POS_UI/src/features/settings/PromotionsPanel.tsx
?? POS_UI/src/features/settings/promotionTime.ts
?? POS_UI/src/services/promotionService.ts
?? POS_UI/test/promotion-time.test.mjs
?? errors/2026-11-07-sprint07-update-returning.md
?? plans/completed/2026-11-07-sprint-07-inventory-promotions.md
?? qa-evidence/.s7-sprint-qa-path
?? qa-evidence/20261107-185300-5ada010f-s7-main-smoke/
?? qa-evidence/20261107-185632-5ada010f-s7-task-qa/
?? qa-evidence/20261107-190000-5ada010f-s7-main-regression/
?? qa-evidence/20261107-195508-5ada010f-s7-task-qa-retry/
?? qa-evidence/20261107-204250-5ada010f-s7-sprint-qa/
?? qa-evidence/20261107-sprint07-backend-check/
?? qa-evidence/20261107-sprint07-inventory-red/
?? qa-evidence/20261107-sprint07-schema-green/
?? specs/inventory.md
?? specs/promotions.md
?? sprints/sprint-07/
?? tasks/completed/2026-11-07-create-sprint-07.md
?? tasks/completed/2026-11-07-sprint-07-implementation.md
?? tasks/completed/2026-11-07-sprint-07-refinement.md
```

## Các bước và bằng chứng cần hoàn tất

1. Đối chiếu `sprints/sprint-07/SPRINT.md` S7-01..07 với báo cáo QA cấp sprint, `specs/`, plan/task completed và error Sprint 07. Kết quả cần: mọi tiêu chí PASS có artifact gốc phù hợp; không còn lỗi sản phẩm mở. Lệnh: đọc tài liệu/QA và kiểm file, không dựa vào số test một mình.
2. Viết Sprint Review dựa trên Goal/backlog/QA: phần đạt, phạm vi chưa đạt hoặc ngoài sprint, phiên bản/môi trường, độ tin cậy local, quyết định chấp nhận. Không ghi giả cuộc họp hoặc production ready.
3. Viết retrospective từ tiến độ/review/error/harness thực tế: điều làm tốt, trở ngại và cải tiến cụ thể cho Sprint sau; tham chiếu file đã đọc.
4. Ghi quyết định đóng sớm ngày 07/11/2026 theo yêu cầu người dùng, phân biệt QA local PASS với CI/commit/merge/production chưa thực hiện. Cập nhật trạng thái sprint và các liên kết Product Backlog PB-08/PB-08a/PB-13; PB-09 vẫn chưa triển khai.
5. Kiểm diff tài liệu, liên kết và Graphify semantic update cho Markdown đã sửa; cập nhật task với file/lệnh/kết quả rồi chuyển cùng file sang `tasks/completed/`.

## Tiến độ hiện tại và bước tiếp

- Đã đọc mẫu đóng Sprint 6, `rules/git.md`, Git baseline, Product Backlog và hồ sơ Sprint 7. `tasks/active/`/`plans/active/` không có task/plan khác ngoài `.gitkeep` tại thời điểm bắt đầu. `graphify-out/needs_update` không tồn tại.
- Bước tiếp: kiểm lại từng tiêu chí/QA artifact liên quan, sau đó cập nhật Sprint Review/retrospective và backlog. Giữ nguyên các thay đổi chưa commit ngoài hai tài liệu này và task đóng sprint.

## Kết quả hoàn tất và kiểm chứng

1. Đã đối chiếu lại 7/7 dòng QA task AC-1..7 PASS và 7/7 dòng QA sprint S7-01..07 PASS trong `qa-evidence/20261107-204250-5ada010f-s7-sprint-qa/run.md`; bổ sung UI AC-7/S7-07 ở `supplement/run.md`. Đã kiểm file TAP/ảnh/snapshot/DB được dẫn tồn tại, exit code `POS_API npm test`, `POS_UI npm test`, `POS_UI npm run build` đều 0; số test từ runner là 74/74 và 40/40. Đã kiểm 7 ô S7 được tick trong `sprints/sprint-07/SPRINT.md`. Chỉ QA local trên working tree dirty; không có CI của snapshot này.
2. Đã đọc `errors/2026-11-07-sprint07-update-returning.md`: lỗi TypeORM UPDATE RETURNING đã sửa và kiểm chứng; không có lỗi sản phẩm Sprint 07 khác đang mở trong `errors/`. Đã đọc task/plan triển khai completed, review 3 vòng và QA cuối. Review xác nhận phạm vi PB-08, PB-08a và lát cắt PB-13 API/UI; phần PB-09/thanh toán/trừ kho và Giai đoạn 2 không được suy PASS.
3. Đã ghi trong `sprints/sprint-07/SPRINT.md`: bảng Sprint Review theo ba item, retrospective với điều làm tốt/trở ngại/hành động, phiên bản và giới hạn bằng chứng, quyết định nghiệm thu local và đóng sớm ngày 07/11/2026 theo yêu cầu người dùng. Kế hoạch 13–19/11/2026 được giữ làm lịch dự kiến; không ghi giả cuộc họp hay phản hồi Product Owner khác.
4. Đã cập nhật `docs/PRODUCT_BACKLOG.md`: Sprint 7 đóng local, PB-08/PB-08a và UI Kho/Khuyến mãi hoàn tất trong phạm vi Sprint 7; thêm việc theo dõi sau Sprint 7 cho PB-09, PB-10/11/12, PB-13 còn lại, PB-14 và Git/CI. Cập nhật trạng thái tham chiếu trong `plans/completed/2026-11-07-sprint-07-inventory-promotions.md` và `tasks/completed/2026-11-07-sprint-07-implementation.md` để không còn ghi Sprint Review đang chờ.
5. Kiểm liên kết Markdown local của bốn tài liệu Sprint/Backlog/task/plan: không có đích thiếu. `git diff --check` exit 0 sau thay đổi tài liệu. Không chạy test mới ở bước đóng vì không sửa code; dùng QA sandbox mới nhất nêu ở mục 1. Không commit/push/merge, không chạm production.
6. Graphify semantic update cho Markdown vừa sửa và xác minh `graphify-out/needs_update` không còn tồn tại trước khi kết thúc. Sau mốc này chuyển chính file task sang `tasks/completed/` cùng tên; không tạo bản sao active. Không có blocker còn lại cho việc đóng hồ sơ.

**Bàn giao:** Sprint 07 đã đóng trong phạm vi local. Việc tiếp theo ngoài task là review tích hợp, commit/CI/push/merge khi người dùng yêu cầu và lập kế hoạch PB-09 riêng; chưa xác nhận production.

**Cập nhật sau bàn giao:** Người dùng đã yêu cầu commit/push; mã Sprint 07 có ở `8bc11be770f68b3ff5944e5f8a9c65f4feaf03dd` trên `feat/sprint-07-inventory-promotions`. Báo cáo QA Markdown được đưa lên Git, artifact gốc không phải Markdown chỉ giữ local. CI của commit, merge và production chưa xác minh.
