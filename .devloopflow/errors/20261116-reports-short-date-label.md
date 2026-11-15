---
id: 20261116-reports-short-date-label
tags: [ui, reports, date]
found_by: ac-verifier
severity: Low
occurrences: 1
tasks: [20261116-sprint10-qa]
---

# O-1 Nhãn ngày Báo cáo thiếu năm

## Triệu chứng
- Tiêu đề "Doanh thu ngày 14/11" và nhãn trục biểu đồ dạng `dd/MM`, trong khi `DESIGN.md:635` và `docs/PRODUCT_OVERVIEW.md:214` quy định `dd/MM/yyyy`. Nguồn: `.devloopflow/verify/20261116-sprint10-qa/report-2.md` (O-1).

## Nguyên nhân gốc
- `dayLabel` trong `POS_UI/src/features/reports/DailyReportScreen.tsx` chỉ ghép ngày và tháng.

## Cách fix
- `dayLabel` thêm năm; `.report-bar` min-width 72px và `.report-bar time` `white-space: nowrap` trong `POS_UI/src/styles/components.css`. Test `POS_UI/test/reports-screen.test.mjs:253` đổi sang `dd/11/2026` (đỏ trước, xanh sau). Verify lần 3: nhãn một dòng, không cuộn ngang ở 1024×768 (`report-3.md`).

## Quy tắc phòng tránh
- Định dạng ngày ở mọi nơi hiển thị (tiêu đề, trục, nhãn ngắn) theo `DESIGN.md`; khi rút gọn nhãn phải có quyết định ghi lại.

## Dấu hiệu nhận biết khi review
- Hàm định dạng ngày tự viết bằng `slice`, không dùng `formatDateVN` hoặc không có năm.
