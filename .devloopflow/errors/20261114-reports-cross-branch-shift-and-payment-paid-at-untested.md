---
id: 20261114-reports-cross-branch-shift-and-payment-paid-at-untested
tags: [api, reports, test, scope, sql]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261114-sprint10-reports]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Hai điều kiện của báo cáo không có test bắt được khi bị đột biến: ca khác chi nhánh và paid_at của hóa đơn

## Triệu chứng
- B-54 (R1-4): `POS_API/src/reports/reports.service.ts` có điều kiện `w.branch_id = $3` cho ca; không test nào dùng ca cùng store khác chi nhánh, nên bỏ điều kiện thì test vẫn xanh. Đột biến `OR w.branch_id = $3::uuid` thành `OR true` làm test mới đỏ: `not ok 1 - test_ST2_AC4_own_open_closed_shift ... cashier a1 must not see a2 shift ... 403 !== 404`.
- B-57 (R1-7): fixture đặt `invoices.paid_at` bằng `payments.paid_at`, nên đổi `i.paid_at` thành `p.paid_at` trong service không làm test nào đỏ. Sau khi thêm test, đột biến đó làm 4 test đỏ (`# pass 10 # fail 4`), trong đó `[B-57]` có `actual [0,0,0,0]`.

## Nguyên nhân gốc
- Fixture và dữ liệu test chỉ có quan hệ thuận (cùng chi nhánh, hai cột thời gian bằng nhau), nên điều kiện lọc không bị kiểm.

## Cách fix
- File và thay đổi: không đổi code production. `POS_API/src/reports/tests/reports.integration.test.ts` thêm assert vào `test_ST2_AC4_own_open_closed_shift` và test `[B-57] test_ST2_AC1_invoice_paid_at_not_payment_paid_at`; `POS_API/src/reports/tests/reports.fixture.ts` thêm tham số tùy chọn `paymentPaidAt`.
- Test tái hiện: hai test trên.

## Quy tắc phòng tránh
- Mỗi điều kiện lọc phạm vi hoặc cột thời gian phải có test mà dữ liệu cố ý lệch (khác chi nhánh, hai cột thời gian khác ngày) và kiểm đột biến bỏ điều kiện hoặc đổi cột.

## Dấu hiệu nhận biết khi review
- Fixture cho hai trường cùng nghĩa cùng một giá trị; điều kiện `WHERE` không có test ca âm.
