---
id: 20261117-orm-refactor-existing-test-lines-edited
tags: [testing, refactor, tdd]
found_by: code-reviewer
severity: Medium
occurrences: 2
tasks: [20261116-orm-entities-refactor]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Subagent `tdd` sửa hoặc xóa dòng của test đã có khi thêm test mới, trái quy tắc "không sửa test cũ"

## Triệu chứng
- Review vòng 1, finding R1-1: `POS_API/src/auth/tests/auth.integration.test.ts:11` mất dòng `import { AuthService } from '../auth.service';`, thay bằng `import { AuthService, normalizeUsername } from '../auth.service';`. `git diff HEAD --numstat` cho file ra `147 1` (một dòng cũ bị xóa), trong khi plan E2E-AC-6 chỉ cho phép dòng xóa khác 0 ở bốn file `foundation.test.ts`, `payment.integration.test.ts`, `reports.integration.test.ts`, `invoices-read.integration.test.ts`.
- Cùng nguyên nhân, agent chính phát hiện lần hai khi chạy E2E-AC-6 sau ST-23: `POS_API/src/sales/tests/cancel-paid.integration.test.ts` (test `[S9-03][ST-4.AC-12] OPEN cancel keeps its behaviour`) bị `tdd` (ST-17) đổi `reason: 'Khách đổi ý'` thành `'  Khách đổi ý  '` và thay dòng `assert.equal((await json(response)).data.status, 'CANCELLED');` bằng bốn dòng; `git diff HEAD --numstat` ra `29 2` cho file đó.

## Nguyên nhân gốc
- Prompt giao cho `tdd` yêu cầu viết test mới và giữ hành vi, nhưng không nêu rõ ràng buộc "không sửa dòng test đã có trên `master`" (E2E-AC-6). `tdd` nhập import và assertion mới vào dòng cũ thay vì thêm dòng riêng. Chỉ phát hiện khi chạy `git diff HEAD --numstat` (cột xóa), không phát hiện qua `npm test` vì cả hai sửa đều xanh.

## Cách fix
- File và thay đổi: `POS_API/src/auth/tests/auth.integration.test.ts` — khôi phục dòng `import { AuthService } from '../auth.service';` nguyên văn, thêm dòng riêng `import { normalizeUsername } from '../auth.service';`; `numstat` về `147 0`.
- File và thay đổi: `POS_API/src/sales/tests/cancel-paid.integration.test.ts` — khôi phục ba dòng gốc của test OPEN-cancel; `numstat` về `25 0`. Assertion `cancelReason` bị bỏ vì `CancelInvoiceDto` đã `@Transform(trim)`, nên mutant bỏ `.trim()` ở service tương đương qua HTTP.
- Test tái hiện: không áp dụng (lỗi cấu trúc test, không có hành vi runtime). Lệnh kiểm thay thế: `git diff HEAD --numstat -- POS_API/src | awk '$2>0'` chỉ liệt kê bốn file ngoại lệ đã duyệt.

## Quy tắc phòng tránh
- Khi giao `tdd` refactor có điều kiện "không sửa test cũ", ghi vào prompt: test mới đặt ở dòng/khối RIÊNG; không sửa, không xóa dòng test đã có; import mới thêm dòng riêng; chạy `git diff HEAD --numstat -- <file test>` và báo cột xóa bằng 0 trước khi báo xong.
- Agent chính kiểm cột xóa của `git diff --numstat` ở mỗi sub-task, không chỉ khi kiểm tổng.

## Dấu hiệu nhận biết khi review
- `git diff HEAD --numstat` của file `*.test.ts` đã tồn tại trên `master` có cột xóa lớn hơn 0 mà file không nằm trong danh sách ngoại lệ của plan.
- Một dòng `import` cũ đổi nội dung, hoặc một `assert` cũ bị thay bằng nhiều dòng.
