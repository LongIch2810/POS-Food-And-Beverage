---
id: 20261110-promotion-not-applicable-message-inconsistent
tags: [sales, promotion, messages, transfer]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Thông báo `PROMOTION_NOT_APPLICABLE` không thống nhất giữa các luồng (B-12, R6-8)

## Triệu chứng
- Nguồn: review vòng 6 (đọc bù) của task `20261109-sprint08-payment`, finding R6-8 (Very Low), ghi backlog `B-12`. Đã sửa (10/11/2026).
- Luồng xác nhận thủ công (`transfer-attempts.service.ts`, `confirmTransferManually`) trả `'Mã giảm giá không còn đủ điều kiện.'`, các chỗ khác trả `'Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.'`.
- Output RED lúc tái hiện (`tdd`, test `[B-12] manual confirm PROMOTION_NOT_APPLICABLE uses the standard message`): `expected 'Mã giảm giá không còn đủ điều kiện. Đổi hoặc bỏ mã để thanh toán.'`, `actual 'Mã giảm giá không còn đủ điều kiện.'`.

## Nguyên nhân gốc
- Chuỗi thông báo bị viết riêng ở một chỗ, không đồng bộ với các chỗ dùng cùng mã lỗi. Đã xác minh bằng `grep` mã `PROMOTION_NOT_APPLICABLE` trong `POS_API/src/sales/`.

## Cách fix
- File và thay đổi: `POS_API/src/sales/transfer-attempts.service.ts` (dòng ~150) — dùng đúng chuỗi chuẩn. Mã lỗi không đổi.
- Test tái hiện: `POS_API/src/sales/tests/payment.integration.test.ts::[B-12] manual confirm PROMOTION_NOT_APPLICABLE uses the standard message`.
- Kiểm chứng: API `npm test` 138/138 pass, exit 0 (lượt sau sửa). Chưa có CI độc lập.

## Quy tắc phòng tránh
- Mỗi mã lỗi có một chuỗi thông báo chuẩn; các chỗ ném cùng mã phải dùng chung chuỗi đó.

## Dấu hiệu nhận biết khi review
- Cùng mã lỗi nhưng khác chuỗi thông báo giữa các service.
