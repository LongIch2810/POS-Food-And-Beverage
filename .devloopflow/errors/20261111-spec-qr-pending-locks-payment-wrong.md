---
id: 20261111-spec-qr-pending-locks-payment-wrong
tags: [docs, spec, ui, pos, payment]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Spec invoices nói đơn có QR chờ bị khóa cả "thanh toán", code vẫn hiện nút (B-38, R17-2)

## Triệu chứng
- Nguồn: review vòng 17 (11/11/2026), finding R17-2 (Low), backlog B-38. `specs/invoices.md:39` (mục 8, thêm 11/11/2026) ghi: "chỉ đơn `OPEN` chưa có QR chờ mới thêm/sửa/xóa món, chuyển bàn, hủy hoặc thanh toán". `POS_UI/src/features/pos/LivePosScreen.tsx:248` vẫn hiện nút "Thanh toán" khi `selected.status==='OPEN'&&(canWrite||canManual)`, không xét `pendingState`.

## Nguyên nhân gốc
- (Đã xác minh bằng đọc cả hai nơi.) Câu spec viết gộp "thanh toán" vào danh sách bị khóa, trong khi với đơn có QR chờ, nút Thanh toán là đường mở lại QR, hủy chờ và xác nhận thủ công (plan ST-8.AC-3(f) và `specs/invoices.md:25` chỉ khóa sửa đơn/mã).

## Cách fix
- Test tái hiện: không áp dụng (lỗi tài liệu); kiểm bằng đối chiếu `specs/invoices.md:39` với `LivePosScreen.tsx:248`.
- `specs/invoices.md:39`: bỏ "hoặc thanh toán" khỏi danh sách bị khóa và ghi "Với đơn `OPEN` có QR chờ, nút "Thanh toán" vẫn hiện nhưng chỉ để mở lại QR, hủy chờ hoặc xác nhận thủ công (không sửa đơn)". Hướng này do agent chính chọn (user gọi fix-backlog B-38, không nêu hướng khác). Code giữ nguyên.

## Quy tắc phòng tránh
- Khi viết spec về trạng thái khóa của đơn, tách rõ "khóa sửa đơn" với "mở được màn thanh toán/QR", và đối chiếu với điều kiện hiển thị nút trong UI.

## Dấu hiệu nhận biết khi review
- Spec liệt kê hành động bị khóa theo trạng thái nhưng không đối chiếu điều kiện hiển thị tương ứng trong component.
