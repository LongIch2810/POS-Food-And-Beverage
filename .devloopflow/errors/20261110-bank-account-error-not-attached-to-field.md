---
id: 20261110-bank-account-error-not-attached-to-field
tags: [ui, settings, bank-account, validation, accessibility]
found_by: code-reviewer
severity: Very Low
occurrences: 1
tasks: [20261109-sprint08-payment]
---

> Ghi đầy đủ, không tóm tắt, không cắt bớt, không bịa. Thiếu nguồn thì ghi CHƯA CÓ NGUỒN và hỏi user.

# Lỗi số tài khoản không gắn vào ô nhập (B-29, R10-4)

## Triệu chứng
- Nguồn: review vòng 10 của task `20261109-sprint08-payment`, finding R10-4 (Very Low), ghi backlog `B-29`. Đã sửa (10/11/2026).
- Khi server trả 422 cho số tài khoản, thông báo chung hiện bên dưới cả ba ô, và ô "Số tài khoản" không có `aria-invalid` hay liên kết tới thông báo. Người dùng không thấy lỗi nằm ở đúng ô nào.
- Output RED lúc tái hiện (`tdd`, test `[B-29] account number error is attached to its field`): `not ok 1 - [B-29] ...`, `+ undefined - 'true'` (ô chưa có `aria-invalid`).

## Nguyên nhân gốc
- `POS_UI/src/features/settings/SettingsScreen.tsx` chỉ có một state lỗi chung `bankError`, không ánh xạ `details[].field === 'accountNumber'` từ lỗi 422 về ô nhập. Đã xác minh bằng RED ở trên.

## Cách fix
- File và thay đổi: `POS_UI/src/features/settings/SettingsScreen.tsx`:
  - thêm state `bankAccountError`;
  - trong `saveBank`, lỗi 422 có detail `location==='body' && field==='accountNumber'` đi vào `bankAccountError`, các lỗi khác vẫn vào `bankError`;
  - ô "Số tài khoản" có `aria-invalid` và `aria-describedby="bank-account-error"` khi có lỗi;
  - thêm `<p id="bank-account-error" role="alert">` ngay sau ô.
- Test tái hiện: `POS_UI/test/organization-screen.test.mjs::[B-29] account number error is attached to its field` (dùng 19 chữ số vì 20 chữ số bị regex phía client chặn trước khi gọi server).
- Kiểm chứng: UI `npm run typecheck` exit 0; `npm run build` exit 0; `npm test` 63/63 pass, exit 0 (lượt sau sửa). Chưa có CI độc lập.

## Cập nhật (B-30, B-31 — review vòng 11)
- Lỗi regex 6..19 chữ số phía client (`SettingsScreen.tsx:105`) nay vào `bankAccountError` và gắn vào ô (`aria-invalid`, `aria-describedby`); reset `bankError` và `bankAccountError` ở đầu `saveBank` (dòng 104) để không còn lỗi server cũ. Test `[B-30]` đỏ trước (`expected 'true'`), xanh sau.
- Test `[B-29]` đổi thông điệp chi tiết sang chuỗi khác fallback và assert trên `#bank-account-error`; test `[B-31]` xanh ngay (hành vi đã có), không có đỏ tái hiện. Lưu ý (B-36): sau đó test `[B-31]` đã được gộp vào `[B-29]`; tên hiện tại là `[B-29][B-31] account number error is attached to its field and shown once` (`POS_UI/test/organization-screen.test.mjs:117`).
- Kiểm lại agent chính: UI typecheck exit 0, build exit 0, `npm test` 65/65 pass, exit 0 (local, chưa CI độc lập).

## Cập nhật (B-34, B-35 — review vòng 12/13)
- B-34: lỗi ngân hàng cũ (cả `bankError` lẫn `bankAccountError`) phải bị xóa khi validation phía client chạy. Test `[B-34] stale bank errors cleared on client-side validation` (`POS_UI/test/organization-screen.test.mjs:169`). `SettingsScreen.tsx:104` reset cả `bankError` và `bankAccountError`; đột biến đã kiểm: bỏ một trong hai vế đều làm `[B-34]` đỏ.
- B-35: dòng 107 `POS_UI/src/features/settings/SettingsScreen.tsx` nay chỉ còn `setBankBusy(true);`.
- B-36: cập nhật tài liệu này cho khớp tên test hiện tại (xem dòng ghi chú ở mục B-30, B-31). Không có test tái hiện vì là sửa tài liệu.

## Quy tắc phòng tránh
- Lỗi validation trả về theo field phải được gắn vào đúng field trong UI (`aria-invalid`, liên kết mô tả), không chỉ hiện thông báo chung.
- Khi thêm ràng buộc phía client, kiểm lỗi server vẫn có đường đi tới UI để test.

## Dấu hiệu nhận biết khi review
- Form có nhiều ô nhưng một state lỗi chung cho tất cả ô.
- Lỗi 422 có `details.field` không được ánh xạ về ô nhập.
