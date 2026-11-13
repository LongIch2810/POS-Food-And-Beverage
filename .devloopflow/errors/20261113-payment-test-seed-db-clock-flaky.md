---
id: 20261113-payment-test-seed-db-clock-flaky
tags: [test, sales, shifts, flaky, clock, fixture]
found_by: ac-verifier
severity: Low
occurrences: 1
tasks: [20261112-sprint09-drawer-cancel-invoices]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Test `[R14-1]` và 4 test sau flaky vì seed giờ vào ca bằng đồng hồ DB (B-50)

## Triệu chứng
- `npm test` hai lần liên tiếp ra `# tests 204 / # pass 198 / # fail 6`, lần ba `# pass 204`; chạy riêng `payment.integration.test.js` 72/72. Gốc: `not ok 1 - [R14-1] cash payment cannot make shift reconciliation exceed BR-103` với `new row for relation "work_shifts" violates check constraint "chk_work_shifts_ended_at"`, `code '23514'`; kéo theo `test_ST4_cash_idempotent`, `test_ST4_promo_race_and_rollback`, `test_ST4_key_collision_and_parallel`, `test_ST4_http_cash_boundary_and_replay` (log: `.devloopflow/verify/20261112-sprint09-drawer-cancel-invoices/evidence/v2/npm-test.raw.log`, `clock-skew.txt`).

## Nguyên nhân gốc
- CHECK `ended_at IS NULL OR ended_at > started_at` (`POS_API/src/database/migrations/20261103000000-Shifts.ts:22`). Test seed `started_at` bằng `now()` của PostgreSQL, còn `closeShift` đặt `ended_at = new Date()` của Node (`POS_API/src/shifts/shifts.service.ts:310,403`). Đồng hồ container Postgres lệch host (12 mẫu từ -962 ms đến +467 ms rồi -998 ms); khi DB đi trước host hơn khoảng thời gian từ lúc seed đến lúc đóng ca (~190 ms), `ended_at <= started_at`.

## Cách fix
- File và thay đổi: `POS_API/src/sales/tests/payment.integration.test.ts` — 9 chỗ seed ca đổi `started_at` từ `now()` thành `now() - interval '1 minute'` (dòng 113, 157, 359, 466, 501, 650, 762, 896, 1258). Không sửa production.
- Test tái hiện: `POS_API/src/sales/tests/payment.integration.test.ts::[R14-1] cash payment cannot make shift reconciliation exceed BR-103` (chạy qua test cha `ST-4.AC-1 BR-31/32/34/35 CASH payment is atomic and replay safe`). RED: seed dòng 501 tạm là `now() + interval '5 seconds'` → `tests 7, pass 1, fail 6`, `23514`; GREEN: `tests 7, pass 7, fail 0`; file 3 lần 72/72; `npm test` 204/204 (`evidence/fix-backlog-b50/`).

## Quy tắc phòng tránh
- Khi test seed mốc thời gian bằng đồng hồ DB (`now()`) rồi gọi API ghi mốc sau bằng đồng hồ Node, seed lùi (`now() - interval '1 minute'`) hoặc dùng cùng một đồng hồ; không dựa vào hai đồng hồ khớp nhau.
- Dùng `--test-name-pattern` theo tên test cha khi chạy subtest lồng nhau (pattern của subtest không chạy được).

## Dấu hiệu nhận biết khi review
- `started_at ... now()` trong seed ca của test mà sau đó đóng ca qua API; test đỏ ngẫu nhiên với `23514` `chk_work_shifts_ended_at`.
