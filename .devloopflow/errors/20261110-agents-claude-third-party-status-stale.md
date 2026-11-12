---
id: 20261110-agents-claude-third-party-status-stale
tags: [docs, agents, claude, sepay, status]
found_by: code-reviewer
severity: Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Mô tả `THIRD_PARTY_INTEGRATIONS.md` trong AGENTS.md/CLAUDE.md lỗi thời sau khi V1-4 PASS (B-5, R4-3)

## Triệu chứng
- Nguồn: review vòng 4 của task `20261109-sprint08-payment`, finding R4-3 (Low), ghi backlog `B-5`. User duyệt sửa (10/11/2026).
- `AGENTS.md:29` và `CLAUDE.md:29` ghi "**chưa kiểm SePay Test mode thật**" trong khi verify-ac vòng 10 đã PASS V1-4 (`.devloopflow/verify/20261109-sprint08-payment/report-10.md`). Cụm "chưa triển khai" trước đó đã được sửa.
- Không có output lỗi; lỗi là tài liệu lệch trạng thái thực tế.

## Nguyên nhân gốc
- Mô tả trạng thái trong `AGENTS.md` và `CLAUDE.md` không được cập nhật khi verify-ac chuyển V1-4 sang PASS. Đã xác minh bằng `AGENTS.md:29` và `report-10.md`.

## Cách fix
- File và thay đổi: `AGENTS.md:29` và `CLAUDE.md:29` — ghi đã kiểm trên SePay Test mode (verify-ac vòng 10, 10/11/2026, chưa có CI độc lập), chưa kiểm Live. Hai file vẫn giống hệt nhau (`cmp` xác nhận).
- Test tái hiện: không áp dụng (tài liệu). Kiểm thay thế: `cmp AGENTS.md CLAUDE.md` (không có khác biệt) và `grep -n "chưa kiểm SePay Test mode" AGENTS.md CLAUDE.md` (không có kết quả).

## Quy tắc phòng tránh
- Khi verify-ac chuyển một AC sang PASS, rà các tài liệu hướng dẫn agent có câu trạng thái tương ứng và cập nhật trong cùng task.

## Dấu hiệu nhận biết khi review
- Câu trạng thái "chưa kiểm"/"chưa triển khai" trong tài liệu không khớp `report-*.md` mới nhất.
