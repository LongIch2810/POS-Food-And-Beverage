# Sổ FAIL của task 20261112-sprint09-drawer-cancel-invoices
<!-- Do ac-verifier tạo và cập nhật sau MỖI lần chạy verify-ac, nằm ở .devloopflow/verify/<id>/fails.md. Chỉ thêm, không xoá mục cũ. File này được commit nên chỉ ghi tóm tắt, không secret. -->

- Task: 20261112-sprint09-drawer-cancel-invoices
- Cập nhật lần cuối: 2026-11-13 (sau lần verify-ac thứ 3)
- Điều kiện đóng task: không còn mục trạng thái `mở` (mục `huỷ do đổi plan/spec` không tính) và kết quả mới nhất của mọi AC còn trong plan đã duyệt là PASS.

## Tổng hợp
| Id | AC | Loại | Trạng thái | Phát hiện ở lần | PASS ở lần | Report | Bằng chứng |
|---|---|---|---|---|---|---|---|
| (Không có FAIL ở lần 1: toàn bộ AC PASS; nhãn nguồn: local do agent chạy) | | | | | | report-1.md | evidence/v1/ |

## Chi tiết từng FAIL
(Không có.)

## Lịch sử các lần chạy (chỉ thêm)
- Lần 1 — 2026-11-13 — PASS toàn bộ AC, không FAIL — report-1.md — evidence/v1/
- Lần 2 — 2026-11-13 — chạy lại TOÀN BỘ AC sau vòng sửa review và fix-backlog: PASS toàn bộ AC, không FAIL (test cũ `[R14-1]` flaky do lệch đồng hồ môi trường, không phải AC) — report-2.md — evidence/v2/
- Lần 3 — 2026-11-13 — chạy lại TOÀN BỘ AC sau lần 2 và B-50: PASS toàn bộ AC, không FAIL; npm test 3 lần liên tiếp 204/204 (`[R14-1]` ổn định); HTTP 48/48 — report-3.md — evidence/v3/
