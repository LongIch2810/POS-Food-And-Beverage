---
id: 20261110-graphify-out-untracked
tags: [repo, config, gitignore, graphify]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# `POS_API/graphify-out/` chưa được theo dõi và chưa được ignore (B-6, R4-5)

## Triệu chứng
- Nguồn: review vòng 4 của task `20261109-sprint08-payment`, finding R4-5 (Very Low), ghi backlog `B-6`. User chọn thêm vào `.gitignore` (10/11/2026).
- `git status --short` trước sửa: `?? POS_API/graphify-out/`.

## Nguyên nhân gốc
- Thư mục do Graphify sinh trong `POS_API/` không có quy tắc ignore; `.gitignore` gốc chỉ có `/graphify-out/` (neo ở gốc repo, không khớp `POS_API/graphify-out/`). Đã xác minh bằng `git status` và `.gitignore`.

## Cách fix
- File và thay đổi: `POS_API/.gitignore` — thêm dòng `graphify-out/`.
- Test tái hiện: không áp dụng (cấu hình). Kiểm thay thế: `git check-ignore -v POS_API/graphify-out/` cho kết quả từ `POS_API/.gitignore:5`.

## Quy tắc phòng tránh
- Khi một công cụ sinh thư mục trong một package con, thêm quy tắc ignore ở package đó, không chỉ ở gốc repo.

## Dấu hiệu nhận biết khi review
- `git status` có thư mục sinh tự động dạng `??` trong một package con.
