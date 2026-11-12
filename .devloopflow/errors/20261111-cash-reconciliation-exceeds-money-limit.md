---
id: 20261111-cash-reconciliation-exceeds-money-limit
tags: [sales, shifts, cash, reconciliation]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261109-sprint08-payment]
---

# Thanh toán CASH làm tiền kỳ vọng của ca vượt trần (R14-1)

## Triệu chứng
- Với tổng tiền kỳ vọng của ca đã chạm trần, thanh toán CASH tiếp theo không bị từ chối. Test tái hiện báo `error: 'Missing expected rejection.'` trong `qa-evidence/20261110-review-r14-1/red.log`.

## Nguyên nhân gốc
- `payCash` trước đây không kiểm tổng tiền mở ca và doanh thu CASH đã thanh toán cùng ca trước khi ghi payment, dù đối soát có giới hạn tiền theo BR-103.

## Cách fix
- `POS_API/src/sales/sales.service.ts`: kiểm tổng dưới khóa ca trước khi ghi CASH, từ chối vượt trần.
- Test tái hiện: `POS_API/src/sales/tests/payment.integration.test.ts` — `[R14-1] cash payment cannot make shift reconciliation exceed BR-103`. RED và GREEN local: `qa-evidence/20261110-review-r14-1/red.log`, `qa-evidence/20261110-review-r14-1/green.log`. Test còn kiểm chạm trần, thanh toán đồng thời và đóng ca.

## Quy tắc phòng tránh
- Khi thêm nguồn doanh thu dùng cho đối soát, kiểm tra cả giới hạn của tổng tiền cần ghi khi đóng ca dưới cùng khóa đồng thời.

## Dấu hiệu nhận biết khi review
- Payment CASH được ghi mà không kiểm tổng tiền kỳ vọng của ca; test chỉ kiểm giới hạn từng giá trị riêng lẻ.
