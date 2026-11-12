---
id: 20261110-third-party-env-vars-marked-planned
tags: [docs, sepay, env, third-party]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# `THIRD_PARTY_INTEGRATIONS.md` ghi biến SePay đã dùng là "dự kiến" (R7-4)

## Triệu chứng
- Nguồn: review vòng 7 của task `20261109-sprint08-payment`, finding R7-4 (Very Low). User duyệt sửa ngay (10/11/2026).
- `THIRD_PARTY_INTEGRATIONS.md:11` ghi "Biến môi trường dự kiến" cho `SEPAY_ENV` và `SEPAY_WEBHOOK_SECRET`, trong khi hai biến này đã được code đọc (`POS_API/src/auth/auth-config.ts`).
- Không có output lỗi; lỗi là tài liệu lệch trạng thái code.

## Nguyên nhân gốc
- Mô tả chưa được cập nhật sau khi biến được triển khai. Đã xác minh bằng đọc `auth-config.ts` và `grep` `SEPAY_API_KEY` trong `POS_API/src` (không có).

## Cách fix
- File và thay đổi: `THIRD_PARTY_INTEGRATIONS.md:11` — ghi `SEPAY_ENV` và `SEPAY_WEBHOOK_SECRET` đang dùng cho HMAC-SHA256 (xem `auth-config.ts`); `SEPAY_API_KEY` chưa có trong code, chỉ dự kiến nếu sau này gọi SePay API.
- Test tái hiện: không áp dụng (tài liệu). Kiểm thay thế: `grep -n "dự kiến" THIRD_PARTY_INTEGRATIONS.md` không còn kết quả cho hai biến này; `grep -rn SEPAY_API_KEY POS_API/src` không có kết quả.

## Quy tắc phòng tránh
- Khi một biến cấu hình được code đọc, cập nhật mục "biến môi trường" trong tài liệu tích hợp cùng lúc, không để ở trạng thái dự kiến.

## Dấu hiệu nhận biết khi review
- Tài liệu gọi "dự kiến" một biến mà `grep` trong mã nguồn đã thấy.
