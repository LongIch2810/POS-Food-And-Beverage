---
id: 20261110-webhook-timestamp-boundary-flaky
tags: [test, sepay, webhook, timestamp, flaky]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Test `[B-13]` dùng timestamp +301 giây có thể chập chờn ở ranh giới giây (B-22, R9-2)

## Triệu chứng
- Nguồn: review vòng 9 của task `20261109-sprint08-payment`, finding R9-2 (Low), ghi backlog `B-22`. Đã sửa (10/11/2026).
- `POS_API/src/sales/tests/payment.integration.test.ts:1433`: test gửi timestamp `now+301`; nếu request tới server khi đã sang giây kế tiếp, độ lệch đúng bằng 300 (cửa sổ cho phép của `sepay-webhook.service.ts:18` là 300 giây) và webhook có thể nhận 200 thay vì từ chối. Ca −301 không bị ảnh hưởng.
- Không có output lỗi thật: đây là rủi ro test chập chờn do reviewer nêu, không phải test đã đỏ.

## Nguyên nhân gốc
- Biên +301 chỉ cách giới hạn 300 giây một giây; thời gian từ lúc test tạo timestamp đến lúc server so sánh có thể làm độ lệch rơi vào biên. Điều này là suy luận của reviewer từ code; không có lần chạy tái hiện.

## Cách fix
- File và thay đổi: `POS_API/src/sales/tests/payment.integration.test.ts` — đổi `+301` thành `+302` (test `[B-13]`) kèm lý do trong comment (theo ghi chú fix-backlog 10/11/2026 trong `.devloopflow/review/backlog.md`).
- Test tái hiện: không áp dụng (đổi giá trị fixture). Kiểm: test xanh trước và sau; API `npm test` 148/148 pass, exit 0 sau fix-backlog B-21..B-25.

## Quy tắc phòng tránh
- Test ranh giới thời gian của webhook không đặt giá trị sát giới hạn đúng một giây; để dư ít nhất một giây so với biên.

## Dấu hiệu nhận biết khi review
- Test timestamp/hạn dùng giá trị `giới hạn ± 1` mà so sánh với thời gian thực.
