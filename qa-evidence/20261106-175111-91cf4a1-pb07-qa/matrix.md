# PB-07 QA evidence matrix (prepared before execution)

Sources: `tasks/completed/2026-11-06-pb07-open-orders.md` AC-1..9; `specs/sales.md`; `plans/completed/2026-11-06-sprint-06-open-orders.md`; `sprints/sprint-06/SPRINT.md` S6-01..09. Sprint codes are mapping only, no sprint verdict.

| Task criterion | Scenario IDs | Required artifacts |
| --- | --- | --- |
| AC-1 / S6-01 | PB07-01 shift ownership, active branch, matching branch/table | backend runner; API request/response; DB before/after |
| AC-2 / S6-02 | PB07-02 dine-in/takeaway, unique OPEN/table race, occupied calculation | backend runner; DB index/state; API responses |
| AC-3 / S6-03 | PB07-03 code/immutability, store/branch/admin permissions | backend runner; API responses; DB before/after |
| AC-4 / S6-04 | PB07-04 item lifecycle and invalid menu scope/status | backend runner; API responses; DB rows |
| AC-5 / S6-05 | PB07-05 quantity, server amount, snapshots, SUM and concurrent writes | backend runner; DB snapshots before/after; API responses |
| AC-6 / S6-06 | PB07-06 tablet POS, reload, loading/error/session | UI runner; browser snapshots and network; DB before/after |
| AC-7 / S6-07 | PB07-07 transfer valid/invalid/race | backend runner; browser network/screens; DB before/after |
| AC-8 / S6-08 | PB07-08 cancellation reason, release, no later add | backend runner; browser network/screens; DB before/after |
| AC-9 / S6-09 | PB07-09 close/force-close with OPEN invoice, invoiceCode error, then close after cancelling | API request/response and DB shift/reconciliation before/after; backend runner |

Classification: independent CI evidence absent; all run output here is local agent collected. A scenario receives PASS only if every clause has matching actual artifact. Missing manual/browser/DB evidence leaves NOT VERIFIED. Sandbox gate: Docker container `pos_pb07_test_pg`, loopback port 5433; validate again immediately before backend run.
