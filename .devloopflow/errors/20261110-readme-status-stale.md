---
id: 20261110-readme-status-stale
tags: [docs, readme, status]
found_by: code-reviewer
severity: Low
occurrences: 3
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# `README.md` mô tả trạng thái màn hình lỗi thời hoặc thiếu module (B-28, B-32, B-33)

## Triệu chứng
- Nguồn: `B-28` (review vòng 10, R10-3, Low): `README.md:10,13,41` còn câu "mô phỏng/demo" so với các màn đã gọi API thật (`LivePosScreen.tsx`, `LivePaymentDialog.tsx`). `B-32` (review vòng 12, R12-1, Low): `README.md:10` nói màn Hóa đơn đã nối API thật nhưng màn Hóa đơn vẫn dùng `mockStorage`/`MockEngine` (`POS_UI/src/features/invoices/InvoicesScreen.tsx:3-4,33`, `invoiceService.ts:16`, `InvoiceDetailDrawer.tsx:37`) và Báo cáo mô phỏng (`reportService.ts:1`, `DailyReportScreen.tsx:6-7`). `B-33` (review vòng 12, R12-2, Low): `README.md:9` bảng "Đã có trong mã" chưa liệt kê bán hàng/thanh toán (Sprint 08) và kho/khuyến mãi (Sprint 07), mâu thuẫn với dòng 13. Cả ba `đã sửa` (10/11/2026).

## Nguyên nhân gốc
- B-28 được sửa lần đầu theo từng màn đã nối API nhưng bỏ sót màn Hóa đơn và Báo cáo (backlog ghi R12-1 là lỗi của chính lần sửa B-28), nên sinh B-32; bảng module không được cập nhật khi thêm Sprint 07/08 nên sinh B-33. Đã xác minh theo `review/backlog.md` và review vòng 12.

## Cách fix
- File và thay đổi: `README.md` dòng 9, 10, 13, 41 (B-28 sửa 10/11/2026 có user duyệt "duyệt sửa b28"; B-32, B-33 sửa ở fix-backlog B-32..B-35, kiểm bằng `ls POS_API/src` và `rg "mockStorage|MockEngine" POS_UI/src/features`).
- Test tái hiện: không áp dụng (tài liệu).

## Quy tắc phòng tránh
- Trước khi viết câu trạng thái "đã nối API thật/mô phỏng", chạy `rg "mockStorage|MockEngine" POS_UI/src/features` và `ls POS_API/src` để đối chiếu từng màn/module.

## Dấu hiệu nhận biết khi review
- README nêu trạng thái của một màn mà `rg` vẫn thấy `mockStorage`/`MockEngine`, hoặc bảng module không khớp thư mục `POS_API/src`.
