---
id: 20261110-webhook-negative-cases-test-missing
tags: [test, sepay, webhook, hmac, timestamp]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Thiếu test webhook: timestamp lệch +301 giây, body đổi giữ chữ ký cũ, chữ ký sai định dạng (B-13)

## Triệu chứng
- Nguồn: task `20261109-sprint08-payment`, review vòng 4, mục "Case test thiếu"; ghi backlog `B-13` (Low), trạng thái `đã sửa` (10/11/2026).
- `POS_API/src/sales/tests/payment.integration.test.ts` (nhóm webhook ST-6) chưa có test cho: (a) timestamp lệch +301 giây phải trả 400; (b) body bị đổi nhưng giữ chữ ký cũ phải trả 401; (c) chữ ký sai định dạng phải trả 401.
- Không có output lỗi: đây là khoảng trống phủ test, không phải test đã đỏ.

## Nguyên nhân gốc
- Khi viết test ST-6 chỉ phủ chữ ký đúng/sai và timestamp cũ chung chung; ba ca biên của xác thực HMAC chưa được liệt kê. Đã xác minh theo review vòng 4 (không có lần chạy tái hiện).

## Cách fix
- File và thay đổi: `POS_API/src/sales/tests/payment.integration.test.ts` — thêm ba subtest `[B-13] ...` dùng cùng helper ký HMAC, kiểm DB không đổi (theo ghi chú fix-backlog B-13..B-20, 10/11/2026: không đổi code; chỉ B-13 có đột biến tạm làm test đỏ rõ ràng, đã khôi phục).
- Test tái hiện: các subtest `[B-13]` trong file trên. Biên +301 sau đó được đổi sang +302 vì chập chờn, xem `20261110-webhook-timestamp-boundary-flaky.md` (B-22).

## Quy tắc phòng tránh
- Khi thêm xác thực chữ ký/hạn dùng, liệt kê đủ ca: giá trị sát biên, body bị đổi, chữ ký sai định dạng; mỗi ca kiểm DB không đổi.

## Dấu hiệu nhận biết khi review
- Test xác thực webhook chỉ có ca "chữ ký đúng" và "chữ ký sai" chung chung, thiếu ca biên của timestamp và định dạng chữ ký.
