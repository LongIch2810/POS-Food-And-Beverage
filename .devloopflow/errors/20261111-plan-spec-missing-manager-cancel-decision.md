---
id: 20261111-plan-spec-missing-manager-cancel-decision
tags: [docs, plan, spec, permission]
found_by: code-reviewer
severity: Medium
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Quyết định cấp invoice.cancel_open cho MANAGER chưa ghi vào plan/spec/task (R16-3)

## Triệu chứng
- Nguồn: review vòng 16 (11/11/2026), finding R16-3 (Medium). User quyết ngày 11/11/2026 (nguyên văn "1 có / 2 giữ cho MANAGER cùng branch"), code và `specs/sales.md:17` đã đổi nhưng plan, spec Sprint 08 và task chưa có Delta, AC hay dòng ma trận.

## Nguyên nhân gốc
- (Đã xác minh) Việc cấp quyền được làm ngay sau câu trả lời mà không cập nhật hồ sơ; `CLAUDE.md` yêu cầu ghi thay đổi phạm vi và quyết định vào plan.

## Cách fix
- Test tái hiện: không áp dụng (lỗi hồ sơ/tài liệu); kiểm bằng grep AC-M1 trong .devloopflow/plans/active và .devloopflow/approved và diff hai plan phải trống.
- Thêm mục "Delta quyền hủy đơn OPEN cho MANAGER", AC-M1, dòng ma trận và Changelog vào plan active và `approved` (hai bản giống nhau, đã `diff`), thêm dòng Changelog vào `.devloopflow/specs/20261109-sprint08-payment.md` và dòng trạng thái trong task. Kiểm: grep `AC-M1` trong hai plan, `diff` hai plan trống.

## Quy tắc phòng tránh
- Mọi quyết định của user làm đổi phạm vi/quyền phải ghi vào plan, spec và task cùng lượt với thay đổi code.

## Dấu hiệu nhận biết khi review
- Migration/spec chính đổi mà `.devloopflow/` không có Changelog tương ứng.
