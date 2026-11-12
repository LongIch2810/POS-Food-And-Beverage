---
id: 20261110-third-party-doc-stale-status-wording
tags: [docs, third-party, vietqr, status-label]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# `THIRD_PARTY_INTEGRATIONS.md` ghi "dự kiến" cho VietQR đã triển khai và nhãn ngày sai (B-18, B-25)

## Triệu chứng
- Nguồn: review vòng 8 (finding R8-2, Very Low, backlog `B-18`) và review vòng 9 (finding R9-5, Very Low, backlog `B-25`) của task `20261109-sprint08-payment`. Cả hai `đã sửa` (10/11/2026).
- B-18: `THIRD_PARTY_INTEGRATIONS.md:21` ghi "Cách dùng dự kiến" cho VietQR Quick Link trong khi đã triển khai (`POS_API/src/sales/transfer-attempts.service.ts:38`).
- B-25: `THIRD_PARTY_INTEGRATIONS.md:3` nhãn "Trạng thái (09/11/2026)" nhưng nội dung đã cập nhật 10/11/2026.

## Nguyên nhân gốc
- Nội dung tài liệu được cập nhật sau khi triển khai nhưng nhãn trạng thái/ngày không được cập nhật theo. Đã xác minh theo review vòng 8 và 9. Cùng họ với `20261110-third-party-env-vars-marked-planned.md` (R7-4) và `20261110-agents-claude-third-party-status-stale.md`.

## Cách fix
- File và thay đổi: `THIRD_PARTY_INTEGRATIONS.md:21` đổi thành "đã triển khai" và dẫn tới file service (B-18); `THIRD_PARTY_INTEGRATIONS.md:3` đổi nhãn thành 10/11/2026 (B-25) — theo ghi chú fix-backlog 10/11/2026.
- Test tái hiện: không áp dụng (tài liệu). Kiểm: `grep -n "dự kiến" THIRD_PARTY_INTEGRATIONS.md`; đọc dòng 3.

## Quy tắc phòng tránh
- Khi một tích hợp chuyển từ dự kiến sang đã triển khai, quét `grep "dự kiến"` và nhãn ngày/trạng thái của cùng tài liệu trong cùng thay đổi.

## Dấu hiệu nhận biết khi review
- Tài liệu tích hợp có từ "dự kiến"/"chưa triển khai" cạnh đường dẫn code đã tồn tại, hoặc nhãn ngày cũ hơn nội dung.
