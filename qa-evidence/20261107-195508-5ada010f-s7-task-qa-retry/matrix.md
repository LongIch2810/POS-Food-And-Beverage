# Ma trận bằng chứng trước kiểm thử lại — QA cấp task Sprint 07

Nguồn: `tasks/active/2026-11-07-sprint-07-implementation.md` AC-1..7; `plans/active/2026-11-07-sprint-07-inventory-promotions.md`; `specs/inventory.md`; `specs/promotions.md`; đối chiếu `sprints/sprint-07/SPRINT.md` S7-01..07. Không nghiệm thu cấp sprint.

| ID | Task → Sprint tham chiếu | Vế cần kiểm | Artifact dự kiến |
|---|---|---|---|
| QA-S7-01 | AC-1 → S7-01 | CRUD mềm, unique, unit lock, quyền/store | TAP test DB/API, request/response, SELECT trước/sau |
| QA-S7-02 | AC-2 → S7-02 | size/topping recipe, quantity, store, inactive, rollback | TAP DB/API, request/response, SELECT trước/sau |
| QA-S7-03 | AC-3 → S7-03 | branch/store, zero, sum movements, cấm client stock | TAP DB/API, request/response, SELECT |
| QA-S7-04 | AC-4 → S7-04 | append-only, route cấm, OPEN không SALE | TAP DB/API, SELECT trước/sau |
| QA-S7-05 | AC-5 → S7-05 | promotion CRUD, normalize/unique, used lock, quyền/store | TAP DB/API, request/response, SELECT |
| QA-S7-06 | AC-6 → S7-06 | time/min/limit, percent/fixed/round/cap, giảm tay | TAP unit/integration, route kiểm tra |
| QA-S7-07 | AC-7 → S7-07 | UI cuối API thật, branch/identity/reload/loading/error/tablet | browser screenshot/snapshot/network, SELECT trước/sau mutation |

Thiếu artifact của vế nào thì không PASS toàn AC. Artifact local tự thu, không phải CI độc lập.
