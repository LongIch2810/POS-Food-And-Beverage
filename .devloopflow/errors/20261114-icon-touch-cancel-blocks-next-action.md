---
id: 20261114-icon-touch-cancel-blocks-next-action
tags: [ui, tooltip, touch, keyboard]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261114-icon-tooltip-ui]
---

# Hủy chạm làm mất thao tác hợp lệ kế tiếp

## Triệu chứng
- Reviewer tái hiện qua Chrome CDP: `touchStart → touchCancel → Enter`, Space hoặc click chuột lần đầu có `count=0`, lần thứ hai `count=1`.
- Test `[R1-1]` RED: `Enter: first action — 0 !== 1`.

## Nguyên nhân gốc
- `pointercancel` giữ cờ `held` khiến click kế tiếp bị coi là click tổng hợp của cử chỉ đã hủy; thao tác mới bằng chuột hoặc bàn phím bị nuốt.

## Cách fix
- File và thay đổi: `POS_UI/src/components/ui/IconButton.tsx` — xóa cờ giữ khi `pointercancel` để thao tác mới không bị chặn.
- Test tái hiện: `POS_UI/test/icon-actions.browser.mjs::[R1-1] canceled touch preserves the next keyboard or mouse action` — CDP hủy chạm rồi kiểm Enter, Space, click chuột lần đầu.
- Agent chính chạy lại browser 22/22, UI 143/143 và build exit 0 ngày 2026-11-14.

## Quy tắc phòng tránh
- Sau pointercancel, kiểm thao tác chuột và bàn phím đầu tiên, không chỉ kiểm cử chỉ bị hủy không gọi action.

## Dấu hiệu nhận biết khi review
- Cờ chặn click tồn tại qua kết thúc cử chỉ và không phân biệt click tổng hợp với thao tác mới.
