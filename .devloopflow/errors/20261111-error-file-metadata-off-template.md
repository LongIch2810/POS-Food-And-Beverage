---
id: 20261111-error-file-metadata-off-template
tags: [docs, errors, template]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# File lỗi mới ghi sai `found_by` và thiếu dòng "Test tái hiện" (B-37, R17-1)

## Triệu chứng
- Nguồn: review vòng 17 (11/11/2026), finding R17-1 (Very Low), backlog B-37. Ba file `.devloopflow/errors/20261111-pay-then-next-order-path-untested.md`, `20261111-manager-cancel-open-behavior-untested.md`, `20261111-plan-spec-missing-manager-cancel-decision.md` có `found_by: review` (template cho phép `code-reviewer | ac-verifier | user`) và mục "Cách fix" không có dòng `Test tái hiện: <path>::<tên test>`. Còn lại: `20261111-paid-order-stays-selected-and-editable.md` đã dùng `found_by: user` đúng.

## Nguyên nhân gốc
- (Đã xác minh) Agent chính viết file bằng script mà không đối chiếu giá trị `found_by` với `record-error/templates/error.md`; tên test chỉ nằm trong văn xuôi.

## Cách fix
- Test tái hiện: không áp dụng (lỗi hồ sơ); kiểm bằng `grep -h "^found_by" .devloopflow/errors/*.md | sort | uniq -c`.
- Đổi `found_by: code-reviewer` trong 3 file, thêm dòng `Test tái hiện` đầu mục "Cách fix". Kết quả kiểm: code-reviewer 38, ac-verifier 3, user 1 (trước khi ghi file này).

## Quy tắc phòng tránh
- Khi tạo file lỗi bằng script, dùng đúng khung `templates/error.md` (giá trị `found_by` và dòng `Test tái hiện`), rồi grep metadata sau khi ghi.

## Dấu hiệu nhận biết khi review
- `found_by` ngoài ba giá trị của template; mục "Cách fix" không có dòng `Test tái hiện`.
