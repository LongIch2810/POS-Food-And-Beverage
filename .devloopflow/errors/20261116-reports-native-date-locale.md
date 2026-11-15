---
id: 20261116-reports-native-date-locale
tags: [ui, reports, date, locale]
found_by: ac-verifier
severity: Low
occurrences: 1
tasks: [20261116-sprint10-qa]
---

# V1-1 Ngày trên màn Báo cáo hiển thị theo locale trình duyệt

## Triệu chứng
- Chrome QA hiển thị ba ô ngày là `11/14/2026`, `11/01/2026`, `11/07/2026`, trái quy định `dd/MM/yyyy` trong `docs/PRODUCT_OVERVIEW.md:214` và `DESIGN.md:635`. Query API vẫn là ISO. Nguồn: `.devloopflow/verify/20261116-sprint10-qa/fails.md`, V1-1.
- Hai test browser `[V1-1] ba ô ngày hiển thị dd/MM/yyyy` với `en-US` và `vi-VN` đỏ trước sửa: `'' !== '14/11/2026'` khi nhập chuỗi Việt Nam vào native date. Log: `C:/Users/Admin/AppData/Local/Temp/sprint10-dates-red.log`.

## Nguyên nhân gốc
- Ba ô `type="date"` ở `DailyReportScreen.tsx` để Chrome chọn cách trình bày theo locale, nên người dùng trên Chrome QA nhìn thấy thứ tự tháng/ngày. Đổi sang text còn làm selector CSS cũ `[type='date']` không áp dụng, khiến ô cao 44px; test tablet bắt được trước khi sửa selector.

## Cách fix
- `POS_UI/src/features/reports/DailyReportScreen.tsx`: giữ text người dùng nhập theo `dd/MM/yyyy`, đổi sang ISO trước validation và request. Chuỗi đang gõ dở hoặc ngày sai không phát request.
- `POS_UI/src/styles/components.css`: áp dụng chiều cao 48px cho ô text của bộ lọc báo cáo.
- Theo duyệt riêng của user, cập nhật giả định ISO trong ô nhập ở `POS_UI/test/reports-screen.test.mjs` và `POS_UI/test/reports-accessibility.browser.mjs`; giữ các assertion query ISO, khoảng ngày và quyền.
- Test tái hiện: `POS_UI/test/reports-accessibility.browser.mjs::[V1-1] ba ô ngày hiển thị dd/MM/yyyy với locale en-US` và `::vi-VN`. Agent chính chạy lại 2026-11-16: UI 230/230, browser 34/34, typecheck và build exit 0, API 256/256.

## Quy tắc phòng tránh
- Nếu sản phẩm yêu cầu ngày hiển thị cố định, kiểm text người dùng nhìn thấy trên nhiều locale trình duyệt; vẫn giữ ISO ở biên API và kiểm ngày sai/ngày gõ dở.
- Khi đổi loại input, kiểm lại CSS và kích thước chạm trên browser thật.

## Dấu hiệu nhận biết khi review
- Ô native `type="date"` được coi là bảo đảm định dạng `dd/MM/yyyy`, hoặc CSS chọn theo loại input cũ nhưng component đã đổi loại.
