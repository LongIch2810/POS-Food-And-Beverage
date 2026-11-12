---
id: 20261110-cancel-qr-forbidden-cases-missing
tags: [test, sales, transfer-attempt, permission, cancel]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Thiếu ca 403 khi hủy lượt QR; lý do ghi trước đó sai về `pos.sell` (B-23, B-27, R9-3, R10-2)

## Triệu chứng
- Nguồn: review vòng 9 (finding R9-3, Low, backlog `B-23`) và review vòng 10 (finding R10-2, Low, backlog `B-27`) của task `20261109-sprint08-payment`. Đã sửa (10/11/2026).
- Backlog B-14 yêu cầu ca "hủy lượt QR bị 403". `payment.integration.test.ts:166` chưa có ca: người không có chi nhánh (`b16_nobranch`) hủy QR → 403; và người thiếu quyền `pos.sell` → 403 `PERMISSION_DENIED`. Code liên quan: `transfer-attempts.service.ts:105`, `transfer-attempts.controller.ts:50` (`@RequirePermission('pos.sell')`).
- Ghi chú sai: lượt fix-backlog đầu ghi "các role seed đều có `pos.sell`" nên không dựng được ca thiếu quyền. Review vòng 10 (R10-2) xác định điều này sai vì `pos.sell` được đọc động từ `role_permissions` (`auth.integration.test.ts:380-382`) và có thể gỡ trong test.

## Nguyên nhân gốc
- Ca test thiếu; lý do bỏ ca đã dựa trên giả định về dữ liệu seed chưa kiểm với cách service đọc quyền. Đã xác minh theo review vòng 10 và ghi chú đính chính trong task file ("Đã đính chính: backlog B-23 ghi 'các role seed đều có pos.sell' là sai").

## Cách fix
- File và thay đổi: `POS_API/src/sales/tests/payment.integration.test.ts` — thêm test `[B-23] cancel QR without branch assignment returns 403` (user `b16_nobranch`, 403, attempt/invoice không đổi) và test `[B-27] cancel QR without pos.sell returns 403` (tạm xóa dòng `role_permissions` của CASHIER/`pos.sell`, khôi phục trong `finally`).
- Test tái hiện: `[B-23]` chứng minh bằng đột biến tạm ở `transfer-attempts.service.ts:105` (đỏ, khôi phục, xanh); `[B-27]` đột biến tạm bỏ `@RequirePermission('pos.sell')` ở `transfer-attempts.controller.ts:50` làm test đỏ (`actual 204`), đã khôi phục và kiểm `SAME`. API `npm test` 149/149 pass, exit 0 (local, sandbox PostgreSQL).

## Quy tắc phòng tránh
- Trước khi ghi "không dựng được ca test vì dữ liệu seed", kiểm quyền được đọc tĩnh hay động; quyền động thì gỡ/khôi phục trong test (`try/finally`).

## Dấu hiệu nhận biết khi review
- Endpoint có `@RequirePermission` nhưng test chỉ có ca thành công, không có ca thiếu quyền.
