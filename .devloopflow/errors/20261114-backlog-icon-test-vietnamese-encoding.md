---
id: 20261114-backlog-icon-test-vietnamese-encoding
tags: [ui, test, fixture, encoding]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261114-icon-tooltip-ui]
---

# B-53 — Chữ tiếng Việt trong fixture test bị hỏng

## Triệu chứng
- Fixture và expected dùng `Tr??c`, `Kh?ng kh? d?ng`, `L?u`, `X?a`, `Kh?ng c? quy?n`; test cùng chuỗi vẫn xanh nhưng thông tin khó đọc.

## Nguyên nhân gốc
- Các chuỗi trong file test bị thay bằng dấu hỏi; chưa xác minh được bước công cụ nào gây hỏng.

## Cách fix
- File và thay đổi: `POS_UI/test/icon-actions.browser.mjs` — khôi phục tiếng Việt trong fixture và expected, giữ nguyên assertion về hành vi.
- Test tái hiện: `[R1-2] Tab traverses enabled and disabled icon controls once in display order` và `[R1-3] default Button and disabledReason retain their behavior`; đây là sửa dữ liệu test, test xanh trước/sau 22/22, không có RED production.
- Agent chính chạy lại browser 22/22, UI 143/143, typecheck và build exit 0 ngày 2026-11-14.

## Quy tắc phòng tránh
- Kiểm lại byte UTF-8 và chuỗi tiếng Việt trong fixture lẫn expected sau khi sửa file qua shell.

## Dấu hiệu nhận biết khi review
- Fixture và assertion cùng chứa dấu `?` thay cho chữ có dấu nên test xanh nhưng dữ liệu bị hỏng.
