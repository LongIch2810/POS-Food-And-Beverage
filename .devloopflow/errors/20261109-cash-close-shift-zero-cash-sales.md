---
id: 20261109-cash-close-shift-zero-cash-sales
tags: [shifts, api, reconciliation, cash]
found_by: code-reviewer
severity: High
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Đóng ca hardcode doanh thu tiền mặt bằng 0 (R2-1)

## Triệu chứng
- Sau khi bật thanh toán CASH, đóng thường nhận 422 thay vì 200 khi opening 100.000 + CASH 50.000 và counted 150.000 (thành OVERAGE 50.000); đóng cưỡng chế trả `cashSalesAmount` 0 thay vì 50.000. Nguồn: `qa-evidence/20261109-review-r2-1/red.log`, `red-force.log`.

## Nguyên nhân gốc
- `POS_API/src/shifts/shifts.service.ts` hardcode cash sales = 0 ở đóng thường và đóng cưỡng chế (BR-56 yêu cầu cộng CASH PAID). Đã xác minh bằng RED.

## Cách fix
- `shifts.service.ts` — tính `SUM(p.amount)` join `invoices` với `i.work_shift_id=$1 AND i.status='PAID' AND p.method='CASH'`, gọi sau khi khóa ca ở cả hai thao tác; expense giữ 0 (PB-10).
- Test: `POS_API/src/shifts/tests/shifts.integration.test.ts` (đóng/đóng cưỡng chế, CANCELLED/TRANSFER/0đ không cộng, rollback, blind count, race). GREEN: `qa-evidence/20261109-review-r2-1/green.log`, `actual-race.log`, API 123/123 `api-last.log`. Local do agent chạy.

## Quy tắc phòng tránh
- Khi bật một nguồn tiền mới, rà mọi chỗ đang hardcode 0/placeholder chờ nguồn đó (đối soát, báo cáo).

## Dấu hiệu nhận biết khi review
- Hằng số 0 cho cash sales trong đóng ca; test đối soát không có payment CASH thật.
