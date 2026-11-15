---
id: 20261114-reports-date-before-chart-range-untested
tags: [api, reports, test, sql]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261114-sprint10-reports]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Không test nào có ngày báo cáo trước khoảng biểu đồ, đột biến `LEAST` không bị bắt

## Triệu chứng
- Finding R1-3 (review vòng 1): `POS_API/src/reports/reports.service.ts:41` dùng `LEAST($4::date, $5::date)` cho cận dưới. Mọi test hiện có đều có `date >= fromDate`. Đột biến `LEAST($4,$5)` thành `$5` làm báo cáo ngày 14 bỏ mất hóa đơn khi range 15..20 mà mọi test vẫn xanh.
- Đây là finding về test thiếu: code production đã đúng, test mới xanh ngay với code hiện tại. Red lấy từ đột biến tạm trong `dist/reports/reports.service.js`, output nguyên văn của `tdd`:
  ```
  not ok 1 - test_ST2_AC5_date_before_chart_range
  Expected values to be strictly deep-equal:
  + actual - expected
    [ + 0, + 0, - 1, - 5000 ]
  ```

## Nguyên nhân gốc
- Edge case "date nằm ngoài chart range" của plan ST-2 chỉ có test với `date > toDate`, không có `date < fromDate`.

## Cách fix
- File và thay đổi: không đổi code production. `POS_API/src/reports/tests/reports.integration.test.ts` — thêm test `test_ST2_AC5_date_before_chart_range` (hóa đơn PAID 5000 ngày 14/11 và 1000 ngày 16/11; query `date=2026-11-14&fromDate=2026-11-15&toDate=2026-11-17`).
- Test tái hiện: `POS_API/src/reports/tests/reports.integration.test.ts::test_ST2_AC5_date_before_chart_range`.

## Quy tắc phòng tránh
- Khi một giá trị phụ thuộc hai đầu vào độc lập (ngày báo cáo, khoảng biểu đồ), test cả hai chiều lệch (date trước, sau, trong khoảng) và đột biến `LEAST`/`GREATEST`.

## Dấu hiệu nhận biết khi review
- Test chỉ chọn dữ liệu có quan hệ thứ tự cố định giữa hai tham số; plan nêu edge case "hai phần độc lập" nhưng test chỉ phủ một chiều.
