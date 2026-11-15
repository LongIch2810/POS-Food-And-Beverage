---
id: 20261115-browser-router-fixed-wait
tags: [test, ui, router, timing]
found_by: code-reviewer
severity: Low
occurrences: 2
tasks: [20261115-sprint10-stock-ledger]
---

# B-60 Browser test đợi cố định 300ms

## Lần xuất hiện B-67 (2026-11-16)
- Reviewer ghi nhận `backAfterSwitch` chờ pathname `/kho/ton-kho` rồi click “Sổ kho” trước khi tab Tồn kho render. Một lượt toàn bộ browser fail BR-5 tại `/kho/ton-kho`; chạy riêng BR-5 pass. Nguồn: `.devloopflow/review/backlog.md`, B-67.
- Nguyên nhân đã xác minh trong helper: `waitPath` chỉ kiểm URL, không kiểm nút tab mới có `aria-current="true"`. Đây là cùng lớp lỗi đồng bộ URL/DOM của B-60 nhưng ở đoạn chờ khác.
- Fix: `POS_UI/test/stock-ledger-router.browser.mjs` chờ đồng thời pathname và tab Tồn kho active trước khi click Sổ kho; giữ assertion đổi phiên. BR-5/BR-5b xanh 2/2 trước và sau sửa; agent chính chạy lại toàn browser 34/34 ngày 2026-11-16. Race không tái hiện ổn định trong lượt TDD nên các lần xanh không chứng minh hết mọi flake.
- Quy tắc review bổ sung: `waitPath` trước một click phụ thuộc màn mới phải kèm trạng thái DOM/aria của màn đó.

## Triệu chứng
- Test BR-5/BR-5b/BR-7 từng dùng setTimeout 300ms; lượt kiểm song song BR-5b thất bại tại `stock-ledger-router.browser.mjs:253`: pathname mong `/kho/so-kho`, thực tế `/kho/ton-kho`.

## Nguyên nhân gốc
- Hai chỗ chờ cố định không xác nhận router và nội dung đã render. Lượt thất bại khi chạy song song không chứng minh lỗi sản phẩm.

## Cách fix
- File và thay đổi: `POS_UI/test/stock-ledger-router.browser.mjs`: chờ pathname, rail hiện hành và nội dung màn; bỏ hai chờ 300ms.
- Test tái hiện: `BR-5`, `BR-5b`, `BR-7`: browser tuần tự 8/8; riêng BR-5b 1/1.

## Quy tắc phòng tránh
- Test browser phải chờ trạng thái DOM và URL cần kiểm.

## Dấu hiệu nhận biết khi review
- Có `setTimeout` cố định thay cho điều kiện kết thúc điều hướng.
