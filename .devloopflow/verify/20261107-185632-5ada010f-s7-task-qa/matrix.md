# Ma trận bằng chứng trước kiểm thử — QA task Sprint 07

Nguồn task: `tasks/active/2026-11-07-sprint-07-implementation.md` bảng AC, `plans/active/2026-11-07-sprint-07-inventory-promotions.md`, hai spec đã chốt. Nguồn sprint: `sprints/sprint-07/SPRINT.md` S7-01..07. Chỉ kết luận task.

| ID | AC task → Sprint tham chiếu | Trạng thái/biên cần chứng minh | Artifact dự kiến |
|---|---|---|---|
| QA-S7-01 | AC-1 → S7-01 | CRUD mềm, duplicate, unit lock, quyền/store | API test output + HTTP request/response + DB read-only trước/sau |
| QA-S7-02 | AC-2 → S7-02 | product-size/topping recipe, unit/positive/inactive, rollback, store | integration test output + HTTP + DB read-only trước/sau |
| QA-S7-03 | AC-3 → S7-03 | hai branch/store, 0 và tổng movement, cấm ghi stock, quyền | integration test output + HTTP + DB read-only |
| QA-S7-04 | AC-4 → S7-04 | movement append-only, route cấm, đơn OPEN không trừ | integration test output + HTTP + DB read-only trước/sau |
| QA-S7-05 | AC-5 → S7-05 | promotion CRUD, unique/normalize, used lock, quyền/store | API test output + HTTP + DB read-only trước/sau |
| QA-S7-06 | AC-6 → S7-06 | time/min/limit, percent/fixed/round/cap, không giảm tay | unit/integration test output + kiểm route |
| QA-S7-07 | AC-7 → S7-07 | UI cuối API thật, branch/identity/reload/loading/error/tablet | browser snapshot/screenshot trước/sau + network + DB trước/sau mutation |

Nếu thiếu artifact cho một vế, AC ở mức NOT VERIFIED. Output local do agent thu, không phải CI độc lập.
