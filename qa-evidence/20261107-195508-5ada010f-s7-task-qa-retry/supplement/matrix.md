# Ma trận bổ sung trước chạy

Nguồn task: `tasks/active/2026-11-07-sprint-07-implementation.md` AC-1..7 và plan/spec đã chốt; S7 từ `sprints/sprint-07/SPRINT.md` chỉ đối chiếu, không nghiệm thu sprint.

| ID | Thiếu cần chứng minh | Artifact cần lưu |
|---|---|---|
| QA-S7-01 | role OWNER/MANAGER/CASHIER/PLATFORM_ADMIN, cross-store, FK/hard-delete | session API request/response che token; SELECT trước/sau; DB FK error gốc |
| QA-S7-02 | topping HTTP, quantity biên, cross-store, recipe PUT thành công | GET/PUT/GET HTTP + SELECT trước/sau |
| QA-S7-03 | cross-store/MANAGER, stock=sum movements khi có movement | HTTP role, SELECT stock/SUM movement |
| QA-S7-04 | OPEN order create/update, tồn/sổ trước/sau, role đọc sổ | HTTP shift/order + SELECT trước/sau; permission results |
| QA-S7-05 | FIXED/cap/limit/read-only usedCount/used lock/role/store | HTTP/SELECT trước/sau, error codes |
| QA-S7-06 | giảm tay bị từ chối, FIXED biên | HTTP request/response; runner output test có sẵn |
| QA-S7-07 | browser recipe save/reload, identity/store switch, role, loading | browser snapshot/screenshot/network trước/sau, SELECT DB |

Không suy PASS nếu thiếu một vế. Chỉ DB `pos_s7_ui_sandbox` trên container test; fixture giả. Bằng chứng local, không phải CI.
