# Ma trận artifact trước QA cấp Sprint 07

Nguồn task: `tasks/active/2026-11-07-sprint-07-implementation.md` AC-1..7 và `plans/active/2026-11-07-sprint-07-inventory-promotions.md`. Nguồn sprint: `sprints/sprint-07/SPRINT.md` S7-01..07. Spec: `specs/inventory.md`, `specs/promotions.md`. BR: `docs/BUSINESS_RULES.md`.

| Task / Sprint | Vế cần kiểm | Artifact cần thu trong lượt mới |
|---|---|---|
| AC-1 / S7-01 | CRUD mềm, unique, unit lock, FK, role/store | API request/response, SELECT trước/sau, DB FK constraint, TAP |
| AC-2 / S7-02 | size/topping, lượng biên, store, inactive, rollback | API, SELECT trước/sau, TAP |
| AC-3 / S7-03 | branch/store/role, stock zero và Σmovement, cấm ghi client | API, SELECT aggregation, TAP |
| AC-4 / S7-04 | append-only, route cấm, OPEN không trừ hay SALE | API, SELECT trước/sau, TAP |
| AC-5 / S7-05 | promotion CRUD, schema/unique/lock/role/store | API, SELECT trước/sau, TAP |
| AC-6 / S7-06 | eligibility/time/rounding/FIXED/cap, no manual discount | TAP unit và HTTP request/response |
| AC-7 / S7-07 | UI cuối inventory/recipe/promotion, branch/role/identity/reload/loading/error/tablet | browser snapshot/screenshot/network, SELECT trước/sau |

Chỉ sandbox. Không dùng UI mock làm backend proof. PASS cần bằng chứng mọi vế; thiếu bằng chứng → NOT VERIFIED.
