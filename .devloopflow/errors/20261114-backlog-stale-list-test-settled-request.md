---
id: 20261114-backlog-stale-list-test-settled-request
tags: [ui, invoices, test, race]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261113-sprint09-ui]
---

# B-52 — Test lỗi danh sách cũ dùng request đã hoàn tất

## Triệu chứng
- Test chọn lại `OPEN` khi bộ lọc đã là `OPEN`; không có request mới, lệnh reject áp vào promise đã resolve nên assertion không kiểm phản hồi cũ.
- Đột biến trong bundle chỉ chạy thử: đưa lỗi cũ vào kết quả hiện tại; test cũ 4/4 vẫn xanh, test sửa đỏ với alert `Lỗi danh sách cũ. (Mã yêu cầu: req-old-list)`.

## Nguyên nhân gốc
- Test không xác nhận số lượng request và trạng thái request đang chờ trước khi reject.

## Cách fix
- File và thay đổi: `POS_UI/test/invoices-screen.test.mjs` — chọn `PAID`, xác nhận request mới, đổi `CANCELLED`, reject request cũ và xác nhận trang mới.
- Test tái hiện: `POS_UI/test/invoices-screen.test.mjs::[B-51] T4-list/T4-race: lỗi tải giữ message/requestId và cho phép tải lại`.
- Test riêng trước/sau 4/4; UI 143/143, typecheck và build exit 0 do agent chính chạy lại ngày 2026-11-14.

## Quy tắc phòng tránh
- Test phản hồi đến muộn phải chứng minh request cũ thực sự đang pending và có request mới trước khi resolve/reject.

## Dấu hiệu nhận biết khi review
- Test đổi bộ lọc sang chính giá trị hiện tại hoặc reject promise đã hoàn tất.
