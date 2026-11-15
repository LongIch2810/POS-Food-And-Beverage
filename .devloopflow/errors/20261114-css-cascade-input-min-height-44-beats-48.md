---
id: 20261114-css-cascade-input-min-height-44-beats-48
tags: [ui, css, reports, accessibility, test]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261114-sprint10-reports]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Ô ngày báo cáo cao 44px trong app thật vì quy tắc chung thắng ở cùng specificity; browser test nối CSS sai thứ tự báo nhầm 48px

## Triệu chứng
- Finding R1-2 (review vòng 1): `POS_UI/src/styles/components.css:509` `.report-filters .report-field input[type='date'].input` có specificity (0,4,1), bằng quy tắc chung `input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file])` (`POS_UI/src/index.css:116`, `min-height:44px`). `index.css:1-3` dùng `@import` ở đầu nên khi bundle `components.css` đứng trước quy tắc chung và quy tắc chung thắng. Reviewer bundle `src/index.css` bằng esbuild và đo trong Chrome: `INPUT 44`, `SELECT 48`.
- Browser test cũ bỏ `@import` rồi nối `index.css` trước `components.css`, thứ tự đảo ngược so với app, nên báo ≥48px (sai so với môi trường thật).
- Red nguyên văn của `tdd` sau khi bundle đúng cascade: `'[R1-2] ô Ngày báo cáo cao 44px trong cascade thật, cần >=48'`.

## Nguyên nhân gốc
- Specificity bằng nhau và thứ tự bundle đặt quy tắc chung sau quy tắc màn; test dựng cascade khác app nên không phát hiện.

## Cách fix
- File và thay đổi: `POS_UI/src/styles/components.css` — selector đổi thành `.page .report-filters .report-field input.input[type='date'], .page .report-filters .report-field select.select { min-height: 48px; }` (specificity (0,5,1), thắng `input:not(...)` (0,4,1) bất kể thứ tự bundle). `POS_UI/test/reports-accessibility.browser.mjs` — bundle thật `src/index.css` bằng esbuild (đã có trong `node_modules`), thêm assert đo riêng ô `Ngày báo cáo` ≥48px.
- Test tái hiện: `POS_UI/test/reports-accessibility.browser.mjs` (assert `[R1-2]`). Đột biến bỏ tiền tố `.page` hoặc hạ `min-height` xuống 44 đều làm test đỏ.

## Quy tắc phòng tránh
- Test đo CSS/kích thước phải dùng cascade và thứ tự bundle đúng như app (bundle `src/index.css`), không nối tay file. Khi đặt chiều cao tối thiểu cho input, kiểm các quy tắc chung `input:not(...)` ở `index.css`.

## Dấu hiệu nhận biết khi review
- Browser test tự ghép CSS thay vì bundle từ entry thật; control cạnh tranh specificity với `input:not(...)` ở `index.css:116`. Ghi chú: quy tắc `index.css:116` vẫn ảnh hưởng các màn khác dùng `.input`; chưa kiểm các màn đó.
