---
id: 20261110-branch-scope-http-test-missing
tags: [test, sales, scope, branch, permission]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Thiếu test HTTP phạm vi chi nhánh cho `paymentPreview` và `createTransferAttempt` (B-16)

## Triệu chứng
- Nguồn: review vòng 5 của task `20261109-sprint08-payment`, mục "Case test thiếu" (liên quan B-2); ghi backlog `B-16` (Low), trạng thái `đã sửa` (10/11/2026).
- Đã có test cho helper `invoice()` (`[B-2]`) nhưng chưa có test HTTP đi qua `paymentPreview` và `createTransferAttempt`: người không `access_all` với `branchId` rỗng hoặc chi nhánh khác phải nhận 404.
- Không có output lỗi: khoảng trống phủ test.

## Nguyên nhân gốc
- Hai hàm dùng chung helper đã được test ở B-2 nên không có test HTTP riêng; đường gọi thật (controller → service) chưa được chứng minh. Đã xác minh theo review vòng 5.

## Cách fix
- File và thay đổi: `POS_API/src/sales/tests/payment.integration.test.ts` — thêm hai subtest `[B-16] ...` (người không `access_all`, `branchId` rỗng hoặc chi nhánh khác → 404), không đổi code. Test `[B-16]` tạo user `b16_nobranch`; việc test khác phụ thuộc user này được xử lý ở `20261110-test-order-dependency-b16-user.md` (B-26).
- Test tái hiện: các subtest `[B-16]`.

## Quy tắc phòng tránh
- Phạm vi store/branch phải được kiểm qua HTTP ở từng endpoint, không chỉ qua helper dùng chung.

## Dấu hiệu nhận biết khi review
- Endpoint mới dùng helper kiểm phạm vi nhưng test chỉ gọi helper trực tiếp.
